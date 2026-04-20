"""
Alert System for Tunisia Disaster Detection
Sends SMS (Twilio) and Email (SendGrid) alerts for high-risk events
"""

import logging
from typing import List, Dict, Optional
from datetime import datetime
import os

from src.config import TWILIO_CONFIG, SENDGRID_CONFIG, ALERT_CONFIG, TRANSLATIONS

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Try to import Twilio
try:
    from twilio.rest import Client as TwilioClient
    TWILIO_AVAILABLE = True
except ImportError:
    logger.warning("Twilio not installed. SMS alerts will be disabled.")
    TWILIO_AVAILABLE = False

# Try to import SendGrid
try:
    from sendgrid import SendGridAPIClient
    from sendgrid.helpers.mail import Mail
    SENDGRID_AVAILABLE = True
except ImportError:
    logger.warning("SendGrid not installed. Email alerts will be disabled.")
    SENDGRID_AVAILABLE = False


class AlertSystem:
    """
    Handles SMS and email alerts for disaster events
    """
    
    def __init__(self):
        """Initialize alert system with Twilio and SendGrid"""
        self.twilio_client = None
        self.sendgrid_client = None
        self.alert_count_today = 0
        self.max_alerts_per_day = ALERT_CONFIG['max_alerts_per_day']
        
        # Initialize Twilio
        if TWILIO_AVAILABLE and TWILIO_CONFIG['account_sid'] and TWILIO_CONFIG['auth_token']:
            try:
                self.twilio_client = TwilioClient(
                    TWILIO_CONFIG['account_sid'],
                    TWILIO_CONFIG['auth_token']
                )
                logger.info("Twilio client initialized")
            except Exception as e:
                logger.error(f"Failed to initialize Twilio: {e}")
        
        # Initialize SendGrid
        if SENDGRID_AVAILABLE and SENDGRID_CONFIG['api_key']:
            try:
                self.sendgrid_client = SendGridAPIClient(SENDGRID_CONFIG['api_key'])
                logger.info("SendGrid client initialized")
            except Exception as e:
                logger.error(f"Failed to initialize SendGrid: {e}")
    
    def format_alert_message(self, hazard_type: str, location: Dict, 
                            risk_score: float, language: str = 'العربية') -> str:
        """
        Format alert message in specified language
        
        Args:
            hazard_type: Type of hazard ('wildfire', 'flood', 'storm', 'heatwave')
            location: Dictionary with 'lat', 'lon', 'name' (wilaya name)
            risk_score: Risk score (0-1)
            language: 'العربية' or 'English'
        
        Returns:
            Formatted alert message
        """
        trans = TRANSLATIONS[language]
        
        # Map hazard types
        hazard_map = {
            'wildfire': trans['wildfire'],
            'flood': trans['flood'],
            'storm': trans['storm'],
            'heatwave': trans['heatwave']
        }
        
        hazard_name = hazard_map.get(hazard_type, hazard_type)
        
        # Risk level
        if risk_score >= 0.8:
            risk_level = trans['high_risk']
        elif risk_score >= 0.5:
            risk_level = trans['medium_risk']
        else:
            risk_level = trans['low_risk']
        
        # Build message
        if language == 'العربية':
            message = f"{trans['alert']}: {hazard_name}\n"
            message += f"{risk_level} ({risk_score:.0%})\n"
            message += f"الموقع: {location.get('name', 'غير معروف')}\n"
            message += f"الإحداثيات: {location['lat']:.2f}N, {location['lon']:.2f}E\n"
            message += f"\n{trans['disclaimer']}"
        else:
            message = f"{trans['alert']}: {hazard_name}\n"
            message += f"{risk_level} ({risk_score:.0%})\n"
            message += f"Location: {location.get('name', 'Unknown')}\n"
            message += f"Coordinates: {location['lat']:.2f}N, {location['lon']:.2f}E\n"
            message += f"\n{trans['disclaimer']}"
        
        return message
    
    def send_sms(self, phone_number: str, message: str) -> bool:
        """
        Send SMS alert via Twilio
        
        Args:
            phone_number: Recipient phone number (with country code)
            message: Alert message
        
        Returns:
            True if successful, False otherwise
        """
        if not self.twilio_client:
            logger.warning("Twilio not configured. SMS not sent.")
            return False
        
        if self.alert_count_today >= self.max_alerts_per_day:
            logger.warning(f"Alert limit reached ({self.max_alerts_per_day}/day). SMS not sent.")
            return False
        
        try:
            message_obj = self.twilio_client.messages.create(
                to=phone_number,
                from_=TWILIO_CONFIG['phone_number'],
                body=message
            )
            
            self.alert_count_today += 1
            logger.info(f"SMS sent to {phone_number}. SID: {message_obj.sid}")
            return True
        
        except Exception as e:
            logger.error(f"Failed to send SMS to {phone_number}: {e}")
            return False
    
    def send_email(self, to_email: str, subject: str, message: str) -> bool:
        """
        Send email alert via SendGrid
        
        Args:
            to_email: Recipient email address
            subject: Email subject
            message: Alert message (plain text)
        
        Returns:
            True if successful, False otherwise
        """
        if not self.sendgrid_client:
            logger.warning("SendGrid not configured. Email not sent.")
            return False
        
        if self.alert_count_today >= self.max_alerts_per_day:
            logger.warning(f"Alert limit reached ({self.max_alerts_per_day}/day). Email not sent.")
            return False
        
        try:
            mail = Mail(
                from_email=SENDGRID_CONFIG['from_email'],
                to_emails=to_email,
                subject=subject,
                plain_text_content=message
            )
            
            response = self.sendgrid_client.send(mail)
            
            self.alert_count_today += 1
            logger.info(f"Email sent to {to_email}. Status: {response.status_code}")
            return True
        
        except Exception as e:
            logger.error(f"Failed to send email to {to_email}: {e}")
            return False
    
    def send_alert(self, hazard_type: str, location: Dict, risk_score: float,
                   language: str = 'العربية', recipients: Optional[Dict] = None) -> Dict:
        """
        Send alert via SMS and/or email based on risk score
        
        Args:
            hazard_type: Type of hazard
            location: Location dictionary
            risk_score: Risk score (0-1)
            language: Message language
            recipients: Optional dict with 'phones' and 'emails' lists
        
        Returns:
            Dictionary with success status for each channel
        """
        results = {
            'sms': [],
            'email': [],
            'timestamp': datetime.now().isoformat()
        }
        
        # Check if alert threshold is met
        if risk_score < ALERT_CONFIG['email_threshold']:
            logger.info(f"Risk score {risk_score:.2%} below email threshold. No alerts sent.")
            return results
        
        # Format message
        message = self.format_alert_message(hazard_type, location, risk_score, language)
        
        # Determine subject for email
        trans = TRANSLATIONS[language]
        subject = f"{trans['alert']}: {hazard_type.capitalize()} - {location.get('name', 'Tunisia')}"
        
        # Get recipients
        if recipients is None:
            recipients = {
                'phones': [p for p in TWILIO_CONFIG['recipients'] if p],
                'emails': [e for e in SENDGRID_CONFIG['recipients'] if e]
            }
        
        # Send SMS if risk is very high
        if risk_score >= ALERT_CONFIG['sms_threshold']:
            logger.info(f"High risk detected ({risk_score:.2%}). Sending SMS alerts...")
            for phone in recipients.get('phones', []):
                success = self.send_sms(phone, message)
                results['sms'].append({'phone': phone, 'success': success})
        
        # Send email
        logger.info(f"Risk detected ({risk_score:.2%}). Sending email alerts...")
        for email in recipients.get('emails', []):
            success = self.send_email(email, subject, message)
            results['email'].append({'email': email, 'success': success})
        
        return results
    
    def reset_daily_count(self):
        """Reset daily alert count (call this once per day)"""
        self.alert_count_today = 0
        logger.info("Daily alert count reset")
    
    def get_alert_status(self) -> Dict:
        """
        Get current alert system status
        
        Returns:
            Dictionary with system status
        """
        return {
            'twilio_enabled': self.twilio_client is not None,
            'sendgrid_enabled': self.sendgrid_client is not None,
            'alerts_sent_today': self.alert_count_today,
            'alerts_remaining': max(0, self.max_alerts_per_day - self.alert_count_today),
            'max_alerts_per_day': self.max_alerts_per_day
        }


def test_alert_system():
    """Test alert system configuration"""
    logger.info("Testing alert system...")
    
    alert_system = AlertSystem()
    
    # Check status
    status = alert_system.get_alert_status()
    logger.info(f"Alert system status: {status}")
    
    # Test message formatting
    test_location = {
        'name': 'Jendouba',
        'lat': 36.5,
        'lon': 8.7
    }
    
    # Arabic message
    arabic_msg = alert_system.format_alert_message(
        'wildfire', test_location, 0.85, 'العربية'
    )
    logger.info(f"Arabic message:\n{arabic_msg}")
    
    # English message
    english_msg = alert_system.format_alert_message(
        'wildfire', test_location, 0.85, 'English'
    )
    logger.info(f"English message:\n{english_msg}")
    
    logger.info("✓ Alert system test completed")
    
    return alert_system


if __name__ == "__main__":
    # Run tests
    test_alert_system()
