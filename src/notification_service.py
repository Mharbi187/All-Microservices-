import os
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import requests
import logging

logger = logging.getLogger(__name__)

# Email Settings
SMTP_HOST = "smtp.gmail.com"
SMTP_PORT = 587
SMTP_USER = "c6287943@gmail.com"
SMTP_PASS = "Code123ala"

# WhatsApp Settings (OpenWA in monitoring stack)
# OpenWA runs on port 8282. Using host.docker.internal since it's on a different compose network.
OPENWA_URL = os.getenv("OPENWA_URL", "http://host.docker.internal:8282")
OPENWA_API_KEY = os.getenv("OPENWA_API_KEY", "nexusaid-wa-2026")

def send_email_notification(to_email: str, subject: str, body: str):
    try:
        msg = MIMEMultipart()
        msg['From'] = SMTP_USER
        msg['To'] = to_email
        msg['Subject'] = subject
        msg.attach(MIMEText(body, 'html'))

        server = smtplib.SMTP(SMTP_HOST, SMTP_PORT)
        server.starttls()
        server.login(SMTP_USER, SMTP_PASS)
        server.send_message(msg)
        server.quit()
        logger.info(f"Email sent successfully to {to_email}")
        return True
    except Exception as e:
        logger.error(f"Failed to send email to {to_email}: {e}")
        return False

def send_whatsapp_message(phone: str, text: str):
    """Sends a WhatsApp message via OpenWA"""
    try:
        # First, fetch the active session
        headers = {
            'x-api-key': OPENWA_API_KEY,
            'Authorization': f'Bearer {OPENWA_API_KEY}',
            'Content-Type': 'application/json'
        }
        
        sessions_resp = requests.get(f"{OPENWA_URL}/api/sessions", headers=headers, timeout=5)
        if sessions_resp.status_code != 200:
            logger.error(f"Failed to get OpenWA sessions: {sessions_resp.status_code}")
            return False
            
        sessions = sessions_resp.json()
        if not sessions:
            logger.error("No active OpenWA sessions found")
            return False
            
        session_id = sessions[0].get('id')
        if not session_id:
            logger.error("Session ID not found in OpenWA response")
            return False

        # Format phone number for WhatsApp (e.g. 216XXXXXXXX -> 216XXXXXXXX@c.us)
        # Assuming the phone is already in international format without '+'
        clean_phone = "".join(filter(str.isdigit, str(phone)))
        wa_id = f"{clean_phone}@c.us"

        url = f"{OPENWA_URL}/api/sessions/{session_id}/messages/send-text"
        payload = {
            "chatId": wa_id,
            "text": text
        }
        
        response = requests.post(url, json=payload, headers=headers, timeout=10)
        if response.status_code in (200, 201):
            logger.info(f"WhatsApp message sent successfully to {phone}")
            return True
        else:
            logger.error(f"OpenWA error {response.status_code}: {response.text}")
            return False
    except Exception as e:
        logger.error(f"Exception sending WhatsApp message to {phone}: {e}")
        return False

def notify_volunteer(name: str, role: str, room_id: str, disaster_name: str, phone: str = "21650000000", email: str = ""):
    """Helper to send both notifications"""
    room_url = f"http://localhost:3000/volunteer/room/{room_id}"
    
    # HTML Email body
    html_body = f"""
    <h2>Nexus-AID : Déploiement Urgent</h2>
    <p>Bonjour <strong>{name}</strong>,</p>
    <p>Vous avez été convoqué dans la salle de crise <strong>{disaster_name}</strong> en tant que <strong>{role}</strong>.</p>
    <p>Veuillez rejoindre la discussion tactique immédiatement :</p>
    <a href="{room_url}" style="padding: 10px 20px; background-color: #dc2626; color: white; text-decoration: none; border-radius: 5px; display: inline-block;">Rejoindre la Salle de Crise</a>
    """
    
    # Text WhatsApp body
    text_body = (
        f"🚨 *Nexus-AID ALERTE*\n\n"
        f"Bonjour {name}, vous êtes convoqué pour l'intervention: *{disaster_name}*.\n"
        f"Rôle: {role}\n\n"
        f"Rejoignez la salle de crise ici: {room_url}"
    )

    # Use the user's email as destination if none provided, to demonstrate it works
    dest_email = email if email else SMTP_USER
    
    send_email_notification(dest_email, f"URGENT: Déploiement Nexus-AID - {disaster_name}", html_body)
    send_whatsapp_message(phone, text_body)
