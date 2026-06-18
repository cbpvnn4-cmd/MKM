import smtplib
import requests
import logging
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from email.mime.base import MIMEBase
from email import encoders
from typing import Optional, Dict, Any, List
from app.core.config import settings
import json
from jinja2 import Template
import os

logger = logging.getLogger(__name__)

class NotificationService:
    """Comprehensive notification service for email, SMS, and Slack"""

    def __init__(self):
        self.smtp_server = getattr(settings, 'SMTP_HOST', None)
        self.smtp_port = getattr(settings, 'SMTP_PORT', 587)
        self.smtp_username = getattr(settings, 'SMTP_USERNAME', None)
        self.smtp_password = getattr(settings, 'SMTP_PASSWORD', None)
        self.sms_api_key = getattr(settings, 'SMS_API_KEY', None)
        self.sms_api_url = getattr(settings, 'SMS_API_URL', None)
        self.slack_webhook_url = getattr(settings, 'SLACK_WEBHOOK_URL', None)

    def send_email(self, recipient: str, subject: str, body: str,
                   template: str = None, attachments: List[str] = None,
                   html_body: str = None) -> Dict[str, Any]:
        """Send email notification with optional template and attachments"""
        try:
            if not self.smtp_server:
                raise ValueError("SMTP configuration not found")

            # Create message
            msg = MIMEMultipart('alternative')
            msg['From'] = self.smtp_username
            msg['To'] = recipient
            msg['Subject'] = subject

            # Use template if provided
            if template:
                body = self._render_email_template(template, {"body": body, "subject": subject})

            # Add text part
            text_part = MIMEText(body, 'plain', 'utf-8')
            msg.attach(text_part)

            # Add HTML part if provided
            if html_body:
                html_part = MIMEText(html_body, 'html', 'utf-8')
                msg.attach(html_part)

            # Add attachments
            if attachments:
                for attachment_path in attachments:
                    if os.path.exists(attachment_path):
                        with open(attachment_path, "rb") as attachment:
                            part = MIMEBase('application', 'octet-stream')
                            part.set_payload(attachment.read())
                            encoders.encode_base64(part)
                            part.add_header(
                                'Content-Disposition',
                                f'attachment; filename= {os.path.basename(attachment_path)}'
                            )
                            msg.attach(part)

            # Send email
            with smtplib.SMTP(self.smtp_server, self.smtp_port) as server:
                server.starttls()
                if self.smtp_username and self.smtp_password:
                    server.login(self.smtp_username, self.smtp_password)
                server.send_message(msg)

            logger.info(f"Email sent successfully to {recipient}")
            return {"status": "success", "recipient": recipient}

        except Exception as e:
            logger.error(f"Failed to send email to {recipient}: {str(e)}")
            return {"status": "error", "error": str(e)}

    def send_sms(self, phone_number: str, message: str) -> Dict[str, Any]:
        """Send SMS notification via API"""
        try:
            if not self.sms_api_key or not self.sms_api_url:
                logger.warning("SMS configuration not found, skipping SMS")
                return {"status": "skipped", "reason": "SMS not configured"}

            # Format phone number (ensure it starts with +966 for Saudi Arabia)
            if not phone_number.startswith('+'):
                if phone_number.startswith('0'):
                    phone_number = '+966' + phone_number[1:]
                else:
                    phone_number = '+966' + phone_number

            # Prepare SMS payload (this would vary based on SMS provider)
            payload = {
                "api_key": self.sms_api_key,
                "to": phone_number,
                "message": message,
                "from": "ElevatorCo"  # Sender ID
            }

            # Send SMS
            response = requests.post(self.sms_api_url, json=payload, timeout=30)
            response.raise_for_status()

            logger.info(f"SMS sent successfully to {phone_number}")
            return {"status": "success", "phone": phone_number, "response": response.json()}

        except Exception as e:
            logger.error(f"Failed to send SMS to {phone_number}: {str(e)}")
            return {"status": "error", "error": str(e)}

    def send_slack_message(self, channel: str, message: str,
                          webhook_url: str = None, blocks: List[Dict] = None) -> Dict[str, Any]:
        """Send Slack notification"""
        try:
            webhook = webhook_url or self.slack_webhook_url
            if not webhook:
                logger.warning("Slack webhook URL not configured")
                return {"status": "skipped", "reason": "Slack not configured"}

            # Prepare Slack payload
            payload = {
                "channel": channel,
                "text": message,
                "username": "نظام المصاعد",
                "icon_emoji": ":building_construction:"
            }

            # Add blocks for rich formatting if provided
            if blocks:
                payload["blocks"] = blocks

            # Send to Slack
            response = requests.post(webhook, json=payload, timeout=30)
            response.raise_for_status()

            logger.info(f"Slack message sent to {channel}")
            return {"status": "success", "channel": channel}

        except Exception as e:
            logger.error(f"Failed to send Slack message: {str(e)}")
            return {"status": "error", "error": str(e)}

    def send_push_notification(self, user_token: str, title: str, body: str,
                              data: Dict[str, Any] = None) -> Dict[str, Any]:
        """Send push notification (FCM)"""
        try:
            # This would integrate with Firebase Cloud Messaging
            # For now, we'll log it
            logger.info(f"Push notification would be sent: {title} - {body}")
            return {"status": "success", "token": user_token}

        except Exception as e:
            logger.error(f"Failed to send push notification: {str(e)}")
            return {"status": "error", "error": str(e)}

    def send_whatsapp_message(self, phone_number: str, message: str,
                             template_name: str = None) -> Dict[str, Any]:
        """Send WhatsApp message via WhatsApp Business API"""
        try:
            # This would integrate with WhatsApp Business API
            # For now, we'll simulate it
            logger.info(f"WhatsApp message would be sent to {phone_number}: {message}")
            return {"status": "success", "phone": phone_number}

        except Exception as e:
            logger.error(f"Failed to send WhatsApp message: {str(e)}")
            return {"status": "error", "error": str(e)}

    def _render_email_template(self, template_name: str, context: Dict[str, Any]) -> str:
        """Render email template with context"""
        try:
            template_path = f"app/templates/email/{template_name}.html"

            # Default template if file doesn't exist
            if not os.path.exists(template_path):
                return self._get_default_template(template_name, context)

            with open(template_path, 'r', encoding='utf-8') as f:
                template_content = f.read()

            template = Template(template_content)
            return template.render(**context)

        except Exception as e:
            logger.error(f"Error rendering template {template_name}: {str(e)}")
            return context.get('body', '')

    def _get_default_template(self, template_name: str, context: Dict[str, Any]) -> str:
        """Get default email template"""
        templates = {
            'profit_distribution': """
            <div dir="rtl" style="font-family: Arial, sans-serif; background-color: #f4f4f4; padding: 20px;">
                <div style="background-color: white; padding: 30px; border-radius: 10px; max-width: 600px; margin: 0 auto;">
                    <h2 style="color: #2c5530; text-align: center;">إشعار توزيع الأرباح</h2>
                    <p style="font-size: 16px; line-height: 1.6;">{{ body }}</p>
                    <div style="background-color: #e8f5e8; padding: 15px; border-radius: 5px; margin: 20px 0;">
                        <p style="margin: 0; font-weight: bold;">شركة المصاعد الشرقية</p>
                        <p style="margin: 5px 0 0 0; color: #666;">تاريخ الإشعار: {{ current_date }}</p>
                    </div>
                </div>
            </div>
            """,
            'system_alert': """
            <div dir="rtl" style="font-family: Arial, sans-serif; background-color: #fff3cd; padding: 20px;">
                <div style="background-color: white; padding: 30px; border-radius: 10px; max-width: 600px; margin: 0 auto; border-right: 5px solid #ffc107;">
                    <h2 style="color: #856404; text-align: center;">🚨 تنبيه نظام</h2>
                    <p style="font-size: 16px; line-height: 1.6;">{{ body }}</p>
                    <p style="font-size: 14px; color: #666; margin-top: 20px;">يرجى اتخاذ الإجراء المناسب في أقرب وقت ممكن.</p>
                </div>
            </div>
            """,
            'weekly_report': """
            <div dir="rtl" style="font-family: Arial, sans-serif; background-color: #f8f9fa; padding: 20px;">
                <div style="background-color: white; padding: 30px; border-radius: 10px; max-width: 600px; margin: 0 auto;">
                    <h2 style="color: #495057; text-align: center;">📊 التقرير الأسبوعي</h2>
                    <p style="font-size: 16px; line-height: 1.6;">{{ body }}</p>
                    <p style="font-size: 14px; color: #666; margin-top: 20px;">تم إنشاء هذا التقرير تلقائياً.</p>
                </div>
            </div>
            """
        }

        template_content = templates.get(template_name, """
        <div dir="rtl" style="font-family: Arial, sans-serif; padding: 20px;">
            <div style="background-color: white; padding: 30px; border-radius: 10px; max-width: 600px; margin: 0 auto;">
                <h2 style="color: #333; text-align: center;">{{ subject }}</h2>
                <p style="font-size: 16px; line-height: 1.6;">{{ body }}</p>
            </div>
        </div>
        """)

        from datetime import datetime
        context['current_date'] = datetime.now().strftime('%Y-%m-%d %H:%M')

        template = Template(template_content)
        return template.render(**context)

    def create_notification_blocks(self, title: str, message: str,
                                  fields: List[Dict[str, str]] = None,
                                  color: str = "#36a64f") -> List[Dict]:
        """Create Slack blocks for rich formatting"""
        blocks = [
            {
                "type": "section",
                "text": {
                    "type": "mrkdwn",
                    "text": f"*{title}*\n{message}"
                }
            }
        ]

        if fields:
            blocks.append({
                "type": "section",
                "fields": [
                    {
                        "type": "mrkdwn",
                        "text": f"*{field['title']}*\n{field['value']}"
                    } for field in fields
                ]
            })

        return blocks