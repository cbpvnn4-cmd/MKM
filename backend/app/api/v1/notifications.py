from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional, Dict, Any
from app.database import get_db
from app.models.users import User
from app.models.notifications import Notification, NotificationTemplate, NotificationSubscription
from app.core.auth import get_current_user
from app.tasks.notifications import (
    send_email_notification, send_sms_notification, send_slack_notification,
    send_bulk_notifications, send_system_alerts
)
from pydantic import BaseModel
from datetime import datetime
import logging

logger = logging.getLogger(__name__)
router = APIRouter()

class NotificationCreate(BaseModel):
    title: str
    message: str
    notification_type: str = "info"
    recipients: List[int] = []
    channels: List[str] = ["email"]
    send_immediately: bool = True
    scheduled_for: Optional[datetime] = None

class BulkNotificationCreate(BaseModel):
    subject: str
    message: str
    user_ids: List[int]
    channels: List[str] = ["email"]
    template_name: Optional[str] = None

class SystemAlertCreate(BaseModel):
    alert_type: str
    message: str
    severity: str = "info"

@router.post("/send")
async def send_notification(
    notification: NotificationCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Send notification to specific users"""
    try:
        if current_user.role not in ['admin', 'manager']:
            raise HTTPException(status_code=403, detail="Permission denied")

        sent_notifications = []

        for recipient_id in notification.recipients:
            # Get recipient user
            recipient = db.query(User).filter(User.id == recipient_id).first()
            if not recipient:
                continue

            # Create notification record
            notification_record = Notification(
                title=notification.title,
                message=notification.message,
                notification_type=notification.notification_type,
                recipient_id=recipient_id,
                sender_id=current_user.id,
                channels=notification.channels,
                scheduled_for=notification.scheduled_for if not notification.send_immediately else None,
                is_sent=False if notification.scheduled_for else True
            )

            db.add(notification_record)
            db.flush()

            # Send immediately if requested
            if notification.send_immediately:
                # Send via email
                if 'email' in notification.channels and recipient.email:
                    send_email_notification.delay(
                        recipient_email=recipient.email,
                        subject=notification.title,
                        body=notification.message
                    )

                # Send via SMS
                if 'sms' in notification.channels and recipient.phone:
                    send_sms_notification.delay(
                        phone_number=recipient.phone,
                        message=f"{notification.title}: {notification.message[:100]}"
                    )

                notification_record.sent_at = datetime.utcnow()

            sent_notifications.append({
                "id": notification_record.id,
                "recipient_id": recipient_id,
                "recipient_name": recipient.username,
                "status": "sent" if notification.send_immediately else "scheduled"
            })

        db.commit()

        return {
            "message": "Notifications processed successfully",
            "sent_count": len(sent_notifications),
            "notifications": sent_notifications
        }

    except Exception as e:
        logger.error(f"Error sending notifications: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/bulk")
async def send_bulk_notification(
    bulk_notification: BulkNotificationCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Send bulk notification to multiple users"""
    try:
        if current_user.role not in ['admin', 'manager']:
            raise HTTPException(status_code=403, detail="Permission denied")

        # Validate users exist
        users = db.query(User).filter(User.id.in_(bulk_notification.user_ids)).all()
        if len(users) != len(bulk_notification.user_ids):
            raise HTTPException(status_code=400, detail="Some user IDs are invalid")

        # Create notification records
        notification_records = []
        for user in users:
            notification_record = Notification(
                title=bulk_notification.subject,
                message=bulk_notification.message,
                notification_type="bulk",
                recipient_id=user.id,
                sender_id=current_user.id,
                channels=bulk_notification.channels,
                is_sent=True,
                sent_at=datetime.utcnow()
            )
            db.add(notification_record)
            notification_records.append(notification_record)

        db.commit()

        # Send bulk notifications via Celery
        send_bulk_notifications.delay(
            user_ids=bulk_notification.user_ids,
            subject=bulk_notification.subject,
            message=bulk_notification.message,
            channels=bulk_notification.channels
        )

        return {
            "message": "Bulk notifications queued successfully",
            "recipient_count": len(users),
            "notification_ids": [n.id for n in notification_records]
        }

    except Exception as e:
        logger.error(f"Error sending bulk notifications: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/system-alert")
async def send_system_alert(
    alert: SystemAlertCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Send system alert to administrators"""
    try:
        if current_user.role != 'admin':
            raise HTTPException(status_code=403, detail="Permission denied")

        # Send system alert via Celery
        send_system_alerts.delay(
            alert_type=alert.alert_type,
            message=alert.message,
            severity=alert.severity
        )

        # Create notification records for admin users
        admin_users = db.query(User).filter(User.role == 'admin').all()
        notification_records = []

        for admin in admin_users:
            notification_record = Notification(
                title=f"تنبيه نظام - {alert.alert_type}",
                message=alert.message,
                notification_type="system_alert",
                recipient_id=admin.id,
                sender_id=current_user.id,
                channels=["email", "sms"] if alert.severity in ["critical", "error"] else ["email"],
                is_sent=True,
                sent_at=datetime.utcnow(),
                metadata_json={"severity": alert.severity, "alert_type": alert.alert_type}
            )
            db.add(notification_record)
            notification_records.append(notification_record)

        db.commit()

        return {
            "message": "System alert sent successfully",
            "alert_type": alert.alert_type,
            "severity": alert.severity,
            "admin_count": len(admin_users)
        }

    except Exception as e:
        logger.error(f"Error sending system alert: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/list")
async def list_notifications(
    limit: int = Query(50, le=100),
    offset: int = Query(0),
    notification_type: Optional[str] = Query(None),
    is_read: Optional[bool] = Query(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """List notifications for current user"""
    try:
        query = db.query(Notification).filter(
            Notification.recipient_id == current_user.id
        )

        # Apply filters
        if notification_type:
            query = query.filter(Notification.notification_type == notification_type)
        if is_read is not None:
            query = query.filter(Notification.is_read == is_read)

        total_count = query.count()
        notifications = query.order_by(Notification.created_at.desc()).offset(offset).limit(limit).all()

        notification_list = []
        for notification in notifications:
            notification_list.append({
                "id": notification.id,
                "title": notification.title,
                "message": notification.message,
                "notification_type": notification.notification_type,
                "is_read": notification.is_read,
                "is_sent": notification.is_sent,
                "sent_at": notification.sent_at.isoformat() if notification.sent_at else None,
                "created_at": notification.created_at.isoformat(),
                "sender": notification.sender.username if notification.sender else "System",
                "metadata": notification.metadata_json
            })

        # Mark unread notifications as read
        unread_notifications = [n for n in notifications if not n.is_read]
        if unread_notifications:
            for notification in unread_notifications:
                notification.is_read = True
                notification.read_at = datetime.utcnow()
            db.commit()

        return {
            "notifications": notification_list,
            "total_count": total_count,
            "unread_count": len(unread_notifications),
            "limit": limit,
            "offset": offset
        }

    except Exception as e:
        logger.error(f"Error listing notifications: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/{notification_id}/read")
async def mark_notification_read(
    notification_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Mark notification as read"""
    try:
        notification = db.query(Notification).filter(
            Notification.id == notification_id,
            Notification.recipient_id == current_user.id
        ).first()

        if not notification:
            raise HTTPException(status_code=404, detail="Notification not found")

        notification.is_read = True
        notification.read_at = datetime.utcnow()

        db.commit()

        return {"message": "Notification marked as read"}

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error marking notification as read: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/mark-all-read")
async def mark_all_notifications_read(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Mark all notifications as read for current user"""
    try:
        unread_notifications = db.query(Notification).filter(
            Notification.recipient_id == current_user.id,
            Notification.is_read == False
        ).all()

        for notification in unread_notifications:
            notification.is_read = True
            notification.read_at = datetime.utcnow()

        db.commit()

        return {
            "message": "All notifications marked as read",
            "marked_count": len(unread_notifications)
        }

    except Exception as e:
        logger.error(f"Error marking all notifications as read: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/unread-count")
async def get_unread_count(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get count of unread notifications"""
    try:
        unread_count = db.query(Notification).filter(
            Notification.recipient_id == current_user.id,
            Notification.is_read == False
        ).count()

        return {"unread_count": unread_count}

    except Exception as e:
        logger.error(f"Error getting unread count: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/subscribe")
async def subscribe_to_notifications(
    notification_types: List[str],
    channels: List[str],
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Subscribe to notification types"""
    try:
        # Remove existing subscriptions
        db.query(NotificationSubscription).filter(
            NotificationSubscription.user_id == current_user.id
        ).delete()

        # Create new subscriptions
        for notification_type in notification_types:
            subscription = NotificationSubscription(
                user_id=current_user.id,
                notification_type=notification_type,
                channels=channels,
                is_active=True
            )
            db.add(subscription)

        db.commit()

        return {
            "message": "Notification preferences updated",
            "subscriptions": len(notification_types)
        }

    except Exception as e:
        logger.error(f"Error updating notification subscriptions: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/subscriptions")
async def get_notification_subscriptions(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get user's notification subscriptions"""
    try:
        subscriptions = db.query(NotificationSubscription).filter(
            NotificationSubscription.user_id == current_user.id,
            NotificationSubscription.is_active == True
        ).all()

        subscription_list = []
        for subscription in subscriptions:
            subscription_list.append({
                "id": subscription.id,
                "notification_type": subscription.notification_type,
                "channels": subscription.channels,
                "created_at": subscription.created_at.isoformat()
            })

        return {"subscriptions": subscription_list}

    except Exception as e:
        logger.error(f"Error getting notification subscriptions: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/templates")
async def list_notification_templates(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """List available notification templates"""
    try:
        if current_user.role not in ['admin', 'manager']:
            raise HTTPException(status_code=403, detail="Permission denied")

        templates = db.query(NotificationTemplate).filter(
            NotificationTemplate.is_active == True
        ).all()

        template_list = []
        for template in templates:
            template_list.append({
                "id": template.id,
                "name": template.name,
                "subject": template.subject,
                "notification_type": template.notification_type,
                "channels": template.channels,
                "description": template.description,
                "created_at": template.created_at.isoformat()
            })

        return {"templates": template_list}

    except Exception as e:
        logger.error(f"Error listing notification templates: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/stats")
async def get_notification_stats(
    days: int = Query(30, le=365),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get notification statistics"""
    try:
        if current_user.role not in ['admin', 'manager']:
            raise HTTPException(status_code=403, detail="Permission denied")

        from datetime import timedelta
        start_date = datetime.utcnow() - timedelta(days=days)

        # Total notifications sent
        total_sent = db.query(Notification).filter(
            Notification.sent_at >= start_date,
            Notification.is_sent == True
        ).count()

        # Notifications by type
        type_stats = db.query(
            Notification.notification_type,
            db.func.count(Notification.id).label('count')
        ).filter(
            Notification.sent_at >= start_date,
            Notification.is_sent == True
        ).group_by(Notification.notification_type).all()

        # Read rate
        total_notifications = db.query(Notification).filter(
            Notification.sent_at >= start_date
        ).count()

        read_notifications = db.query(Notification).filter(
            Notification.sent_at >= start_date,
            Notification.is_read == True
        ).count()

        read_rate = (read_notifications / total_notifications * 100) if total_notifications > 0 else 0

        return {
            "period_days": days,
            "total_sent": total_sent,
            "total_notifications": total_notifications,
            "read_rate": round(read_rate, 2),
            "type_breakdown": [{"type": t[0], "count": t[1]} for t in type_stats]
        }

    except Exception as e:
        logger.error(f"Error getting notification stats: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
