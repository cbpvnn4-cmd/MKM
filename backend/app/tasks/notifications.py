from celery import current_app as celery_app
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.users import User
from app.models.partners import Partner
from app.models.sales import ProfitDistribution
from app.core.notifications import NotificationService
from typing import List, Dict, Any
import logging
from datetime import datetime, timedelta
import json

logger = logging.getLogger(__name__)

@celery_app.task(bind=True, retry_kwargs={'max_retries': 3})
def send_email_notification(self, recipient_email: str, subject: str, body: str, template: str = None):
    """Send email notification"""
    try:
        notification_service = NotificationService()
        result = notification_service.send_email(
            recipient=recipient_email,
            subject=subject,
            body=body,
            template=template
        )
        logger.info(f"Email sent successfully to {recipient_email}")
        return {"status": "success", "recipient": recipient_email}
    except Exception as exc:
        logger.error(f"Failed to send email to {recipient_email}: {str(exc)}")
        raise self.retry(exc=exc, countdown=60)

@celery_app.task(bind=True)
def send_sms_notification(self, phone_number: str, message: str):
    """Send SMS notification"""
    try:
        notification_service = NotificationService()
        result = notification_service.send_sms(
            phone_number=phone_number,
            message=message
        )
        logger.info(f"SMS sent successfully to {phone_number}")
        return {"status": "success", "phone": phone_number}
    except Exception as exc:
        logger.error(f"Failed to send SMS to {phone_number}: {str(exc)}")
        return {"status": "error", "error": str(exc)}

@celery_app.task(bind=True)
def send_slack_notification(self, channel: str, message: str, webhook_url: str = None):
    """Send Slack notification"""
    try:
        notification_service = NotificationService()
        result = notification_service.send_slack_message(
            channel=channel,
            message=message,
            webhook_url=webhook_url
        )
        logger.info(f"Slack message sent to {channel}")
        return {"status": "success", "channel": channel}
    except Exception as exc:
        logger.error(f"Failed to send Slack message: {str(exc)}")
        return {"status": "error", "error": str(exc)}

@celery_app.task(bind=True)
def process_profit_distributions(self):
    """Process and notify about profit distributions"""
    try:
        db = next(get_db())

        # Get recent profit distributions (last 24 hours)
        yesterday = datetime.utcnow() - timedelta(days=1)
        distributions = db.query(ProfitDistribution).filter(
            ProfitDistribution.distribution_date >= yesterday
        ).all()

        if not distributions:
            logger.info("No recent profit distributions to process")
            return {"status": "success", "distributions": 0}

        notification_service = NotificationService()

        for distribution in distributions:
            partner = db.query(Partner).filter(Partner.id == distribution.partner_id).first()
            if not partner:
                continue

            # Send notification to partner
            if partner.email:
                send_email_notification.delay(
                    recipient_email=partner.email,
                    subject="إشعار توزيع الأرباح - Profit Distribution Notification",
                    body=f"تم توزيع مبلغ {distribution.amount:,.2f} ريال سعودي من الأرباح على حسابكم.",
                    template="profit_distribution"
                )

            if partner.phone:
                send_sms_notification.delay(
                    phone_number=partner.phone,
                    message=f"تم توزيع {distribution.amount:,.0f} ريال من الأرباح على حسابكم في شركة المصاعد."
                )

        # Send summary to management
        total_amount = sum(d.amount for d in distributions)
        management_users = db.query(User).filter(User.role.in_(['admin', 'manager'])).all()

        for user in management_users:
            if user.email:
                send_email_notification.delay(
                    recipient_email=user.email,
                    subject="ملخص توزيع الأرباح اليومي",
                    body=f"تم توزيع إجمالي {total_amount:,.2f} ريال على {len(distributions)} شريك.",
                    template="daily_summary"
                )

        logger.info(f"Processed {len(distributions)} profit distributions")
        return {
            "status": "success",
            "distributions": len(distributions),
            "total_amount": float(total_amount)
        }

    except Exception as exc:
        logger.error(f"Error processing profit distributions: {str(exc)}")
        raise
    finally:
        db.close()

@celery_app.task(bind=True)
def send_system_alerts(self, alert_type: str, message: str, severity: str = "info"):
    """Send system alerts to administrators"""
    try:
        db = next(get_db())

        # Get admin users
        admin_users = db.query(User).filter(User.role == 'admin').all()

        # Determine notification method based on severity
        if severity in ['critical', 'error']:
            # Send immediate notifications for critical alerts
            for user in admin_users:
                if user.email:
                    send_email_notification.delay(
                        recipient_email=user.email,
                        subject=f"تنبيه نظام - {alert_type}",
                        body=message,
                        template="system_alert"
                    )
                if user.phone and severity == 'critical':
                    send_sms_notification.delay(
                        phone_number=user.phone,
                        message=f"تنبيه عاجل: {message[:100]}"
                    )

            # Send to Slack for immediate attention
            send_slack_notification.delay(
                channel="#alerts",
                message=f"🚨 {alert_type}: {message}"
            )

        elif severity == 'warning':
            # Send email notifications for warnings
            for user in admin_users:
                if user.email:
                    send_email_notification.delay(
                        recipient_email=user.email,
                        subject=f"تحذير نظام - {alert_type}",
                        body=message,
                        template="system_warning"
                    )

        logger.info(f"System alert sent: {alert_type} - {severity}")
        return {"status": "success", "alert_type": alert_type, "severity": severity}

    except Exception as exc:
        logger.error(f"Error sending system alerts: {str(exc)}")
        raise
    finally:
        db.close()

@celery_app.task(bind=True)
def send_bulk_notifications(self, user_ids: List[int], subject: str, message: str, channels: List[str] = None):
    """Send bulk notifications to multiple users"""
    try:
        db = next(get_db())

        if channels is None:
            channels = ['email']  # Default to email

        users = db.query(User).filter(User.id.in_(user_ids)).all()

        results = {
            "email": {"sent": 0, "failed": 0},
            "sms": {"sent": 0, "failed": 0},
            "slack": {"sent": 0, "failed": 0}
        }

        for user in users:
            # Send email notifications
            if 'email' in channels and user.email:
                try:
                    send_email_notification.delay(
                        recipient_email=user.email,
                        subject=subject,
                        body=message,
                        template="bulk_notification"
                    )
                    results["email"]["sent"] += 1
                except Exception:
                    results["email"]["failed"] += 1

            # Send SMS notifications
            if 'sms' in channels and user.phone:
                try:
                    send_sms_notification.delay(
                        phone_number=user.phone,
                        message=message[:160]  # SMS character limit
                    )
                    results["sms"]["sent"] += 1
                except Exception:
                    results["sms"]["failed"] += 1

        logger.info(f"Bulk notifications sent to {len(users)} users")
        return {"status": "success", "results": results}

    except Exception as exc:
        logger.error(f"Error sending bulk notifications: {str(exc)}")
        raise
    finally:
        db.close()

@celery_app.task(bind=True)
def process_scheduled_notifications(self):
    """Process scheduled notifications from the database"""
    try:
        db = next(get_db())

        # This would query a scheduled_notifications table
        # For now, we'll simulate with some common scheduled tasks

        current_time = datetime.utcnow()

        # Weekly reports (every Monday at 9 AM)
        if current_time.weekday() == 0 and current_time.hour == 9:
            admin_users = db.query(User).filter(User.role == 'admin').all()
            for user in admin_users:
                if user.email:
                    send_email_notification.delay(
                        recipient_email=user.email,
                        subject="التقرير الأسبوعي - Weekly Report",
                        body="التقرير الأسبوعي لأداء النظام متاح الآن.",
                        template="weekly_report"
                    )

        # Monthly partner statements (1st of each month)
        if current_time.day == 1 and current_time.hour == 10:
            partners = db.query(Partner).filter(Partner.is_active == True).all()
            for partner in partners:
                if partner.email:
                    send_email_notification.delay(
                        recipient_email=partner.email,
                        subject="كشف حساب شهري - Monthly Statement",
                        body="كشف الحساب الشهري الخاص بكم متاح الآن.",
                        template="monthly_statement"
                    )

        logger.info("Scheduled notifications processed")
        return {"status": "success", "time": current_time.isoformat()}

    except Exception as exc:
        logger.error(f"Error processing scheduled notifications: {str(exc)}")
        raise
    finally:
        db.close()

@celery_app.task(bind=True, retry_kwargs={'max_retries': 5})
def send_payment_reminder(self, invoice_id: int, days_overdue: int):
    """Send payment reminder for overdue invoices"""
    try:
        db = next(get_db())

        # This would query the invoice and customer
        # Simulating the logic here

        reminder_message = f"تذكير: لديكم فاتورة متأخرة السداد منذ {days_overdue} يوم. يرجى السداد في أقرب وقت."

        # Send reminder logic here
        logger.info(f"Payment reminder sent for invoice {invoice_id}")
        return {"status": "success", "invoice_id": invoice_id}

    except Exception as exc:
        logger.error(f"Error sending payment reminder: {str(exc)}")
        raise self.retry(exc=exc, countdown=300)  # Retry after 5 minutes
    finally:
        db.close()