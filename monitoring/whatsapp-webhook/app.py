"""
NexusAid Alert Webhook Bridge
Receives AlertManager webhooks → sends Email + WhatsApp via OpenWA
"""

import os
import json
import logging
import smtplib
import requests
from datetime import datetime
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from flask import Flask, request, jsonify

# ─── Configuration ─────────────────────────────────────────────
app = Flask(__name__)
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [%(levelname)s] %(message)s'
)
logger = logging.getLogger(__name__)

OPENWA_URL      = os.getenv('OPENWA_URL',      'http://openwa:8282')
OPENWA_API_KEY  = os.getenv('OPENWA_API_KEY',  'nexusaid-wa-2026')
WA_ALERT_NUMBER = os.getenv('WA_ALERT_NUMBER', '212600000000')

SMTP_HOST       = os.getenv('SMTP_HOST',       'smtp.gmail.com')
SMTP_PORT       = int(os.getenv('SMTP_PORT',   '587'))
SMTP_USER       = os.getenv('SMTP_USER',       'c6287943@gmail.com')
SMTP_PASSWORD   = os.getenv('SMTP_PASSWORD',   '')
ALERT_EMAIL_TO  = os.getenv('ALERT_EMAIL_TO',  'c6287943@gmail.com')

# Severity icons
SEVERITY_ICONS = {
    'critical': '🔴',
    'warning':  '⚠️',
    'info':     'ℹ️',
}

CATEGORY_ICONS = {
    'security':       '🛡️',
    'infrastructure': '🖥️',
    'application':    '📱',
}


def format_whatsapp_message(payload: dict) -> str:
    """Format AlertManager payload into a readable WhatsApp message."""
    status      = payload.get('status', 'unknown').upper()
    alerts      = payload.get('alerts', [])
    group_labels = payload.get('groupLabels', {})

    if status == 'RESOLVED':
        header = '✅ *ALERTE RÉSOLUE* — NexusAid'
    else:
        header = '🚨 *ALERTE ACTIVE* — NexusAid'

    lines = [header, '']

    for i, alert in enumerate(alerts, 1):
        labels      = alert.get('labels', {})
        annotations = alert.get('annotations', {})
        severity    = labels.get('severity', 'info')
        category    = labels.get('category', 'application')
        service     = labels.get('service', labels.get('job', 'unknown'))

        sev_icon = SEVERITY_ICONS.get(severity, '❓')
        cat_icon = CATEGORY_ICONS.get(category, '📊')

        starts_at = alert.get('startsAt', '')
        try:
            dt = datetime.fromisoformat(starts_at.replace('Z', '+00:00'))
            time_str = dt.strftime('%d/%m/%Y %H:%M:%S UTC')
        except Exception:
            time_str = starts_at

        lines.append(f"{sev_icon} *Alerte {i}:* {annotations.get('summary', 'N/A')}")
        lines.append(f"{cat_icon} Catégorie: *{category.upper()}*")
        lines.append(f"🔧 Service: *{service}*")
        lines.append(f"📋 {annotations.get('description', 'Pas de description')}")
        lines.append(f"🕐 Heure: {time_str}")
        lines.append('')

    lines.append('─────────────────')
    lines.append('📊 *Grafana:* http://localhost:3000')
    lines.append('🔔 *AlertManager:* http://localhost:9093')

    return '\n'.join(lines)


def send_whatsapp(message: str) -> bool:
    """Send message via OpenWA REST API."""
    try:
        # Format: number@c.us (individual) or number@g.us (group)
        chat_id = f"{WA_ALERT_NUMBER}@c.us"

        headers = {
            'x-api-key': OPENWA_API_KEY,
            'Authorization': f'Bearer {OPENWA_API_KEY}',
            'Content-Type': 'application/json'
        }

        # Dynamically fetch the session ID since OpenWA requires the UUID
        sessions_resp = requests.get(f"{OPENWA_URL}/api/sessions", headers=headers, timeout=5)
        sessions = sessions_resp.json()
        if not sessions:
            logger.error("❌ No WhatsApp sessions found. Cannot send message.")
            return False
            
        session_id = sessions[0]['id']
        url = f"{OPENWA_URL}/api/sessions/{session_id}/messages/send-text"

        payload = {
            "chatId": chat_id,
            "text": message
        }

        logger.info(f"📤 Sending WhatsApp to {WA_ALERT_NUMBER} via session {session_id}...")
        response = requests.post(url, headers=headers, json=payload, timeout=10)

        if response.status_code in (200, 201):
            logger.info(f"✅ WhatsApp message sent to {WA_ALERT_NUMBER}")
            return True
        else:
            logger.error(f"❌ OpenWA error: {response.status_code} — {response.text[:200]}")
            return False

    except requests.exceptions.ConnectionError:
        logger.warning("⚠️ OpenWA not reachable (container may still be initializing)")
        return False
    except Exception as e:
        logger.error(f"❌ WhatsApp send error: {e}")
        return False


def send_email(subject: str, html_body: str) -> bool:
    """Send email alert via SMTP."""
    try:
        msg = MIMEMultipart('alternative')
        msg['Subject'] = subject
        msg['From']    = SMTP_USER
        msg['To']      = ALERT_EMAIL_TO

        part = MIMEText(html_body, 'html', 'utf-8')
        msg.attach(part)

        with smtplib.SMTP(SMTP_HOST, SMTP_PORT) as server:
            server.ehlo()
            server.starttls()
            server.login(SMTP_USER, SMTP_PASSWORD)
            server.sendmail(SMTP_USER, ALERT_EMAIL_TO, msg.as_string())

        logger.info(f"✅ Email sent to {ALERT_EMAIL_TO}: {subject}")
        return True

    except Exception as e:
        logger.error(f"❌ Email send error: {e}")
        return False


# ─── ROUTES ────────────────────────────────────────────────────

@app.route('/health', methods=['GET'])
def health():
    return jsonify({'status': 'ok', 'service': 'nexusaid-wa-webhook'}), 200


@app.route('/alert', methods=['POST'])
def receive_alert():
    """Receive AlertManager webhook and dispatch Email + WhatsApp."""
    try:
        payload = request.get_json(force=True)
        if not payload:
            return jsonify({'error': 'Empty payload'}), 400

        status  = payload.get('status', 'unknown')
        alerts  = payload.get('alerts', [])
        logger.info(f"📨 Received alert: status={status}, count={len(alerts)}")

        # Build WhatsApp message
        wa_message = format_whatsapp_message(payload)
        wa_ok = send_whatsapp(wa_message)

        # Build Email message and send it
        email_subject = f"[{status.upper()}] NexusAid Monitoring Alert ({len(alerts)} alerts)"
        email_html = f"<h2>NexusAid Alerts</h2><p>{wa_message.replace(chr(10), '<br>')}</p>"
        email_ok = send_email(email_subject, email_html)

        results = {
            'whatsapp': 'sent' if wa_ok else 'failed',
            'email': 'sent' if email_ok else 'failed',
            'alerts_count': len(alerts),
            'status': status,
        }

        logger.info(f"📊 Alert dispatch results: {results}")
        return jsonify(results), 200

    except Exception as e:
        logger.error(f"❌ Alert processing error: {e}")
        return jsonify({'error': str(e)}), 500


@app.route('/send-test', methods=['POST'])
def send_test():
    """Send a test WhatsApp message to verify connectivity."""
    try:
        test_msg = (
            '🧪 *TEST — NexusAid Monitoring*\n\n'
            '✅ La connexion WhatsApp est fonctionnelle.\n'
            '📊 Grafana: http://localhost:3000\n'
            '🔔 AlertManager: http://localhost:9093\n'
            f'🕐 {datetime.utcnow().strftime("%d/%m/%Y %H:%M:%S UTC")}'
        )
        ok = send_whatsapp(test_msg)
        return jsonify({'whatsapp': 'sent' if ok else 'failed'}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/send-email-test', methods=['POST'])
def send_email_test():
    """Send a test email."""
    try:
        ok = send_email(
            subject='✅ [NexusAid] Test Email — Monitoring Opérationnel',
            html_body='<h2>✅ Test NexusAid Monitoring</h2><p>La configuration email est fonctionnelle.</p>'
        )
        return jsonify({'email': 'sent' if ok else 'failed'}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500


if __name__ == '__main__':
    logger.info("🚀 NexusAid WhatsApp Webhook Bridge démarré sur port 5001")
    logger.info(f"   OpenWA URL: {OPENWA_URL}")
    logger.info(f"   WA Number:  {WA_ALERT_NUMBER}")
    logger.info(f"   SMTP:       {SMTP_HOST}:{SMTP_PORT} / {SMTP_USER}")
    app.run(host='0.0.0.0', port=5001, debug=False)
