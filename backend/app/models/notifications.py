from sqlalchemy import Column, Integer, String, DateTime, Boolean, Text, JSON, ForeignKey
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base
from datetime import datetime

class Notification(Base):
    __tablename__ = "notifications"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(255), nullable=False)
    message = Column(Text, nullable=False)
    notification_type = Column(String(50), nullable=False)  # info, warning, error, success, etc.

    # Recipients and sender
    recipient_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    sender_id = Column(Integer, ForeignKey("users.id"))

    # Delivery channels
    channels = Column(JSON)  # ['email', 'sms', 'push', 'slack']

    # Status tracking
    is_sent = Column(Boolean, default=False)
    is_read = Column(Boolean, default=False)
    sent_at = Column(DateTime)
    read_at = Column(DateTime)

    # Scheduling
    scheduled_for = Column(DateTime)  # For scheduled notifications

    # Additional data (avoid reserved name)
    metadata_json = Column('metadata', JSON)  # Store additional notification data
    action_url = Column(String(500))  # URL for action button
    action_text = Column(String(100))  # Text for action button

    # Audit fields
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())

    # Relationships
    recipient = relationship("User", foreign_keys=[recipient_id])
    sender = relationship("User", foreign_keys=[sender_id])

    def __repr__(self):
        return f"<Notification(id={self.id}, title='{self.title}', type='{self.notification_type}')>"

class NotificationTemplate(Base):
    __tablename__ = "notification_templates"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False, unique=True)
    subject = Column(String(255), nullable=False)
    body_template = Column(Text, nullable=False)
    html_template = Column(Text)

    # Template configuration
    notification_type = Column(String(50), nullable=False)
    channels = Column(JSON)  # Supported channels for this template
    variables = Column(JSON)  # Expected template variables

    # Template metadata
    description = Column(Text)
    category = Column(String(50))
    language = Column(String(10), default='ar')

    # Status
    is_active = Column(Boolean, default=True)
    version = Column(Integer, default=1)

    # Audit fields
    created_by = Column(Integer, ForeignKey("users.id"))
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())

    # Relationships
    creator = relationship("User")

    def __repr__(self):
        return f"<NotificationTemplate(id={self.id}, name='{self.name}')>"

class NotificationSubscription(Base):
    __tablename__ = "notification_subscriptions"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    notification_type = Column(String(50), nullable=False)

    # Subscription preferences
    channels = Column(JSON)  # Preferred channels for this subscription
    is_active = Column(Boolean, default=True)

    # Frequency settings
    frequency = Column(String(20), default='immediate')  # immediate, hourly, daily, weekly
    quiet_hours_start = Column(String(5))  # HH:MM format
    quiet_hours_end = Column(String(5))   # HH:MM format

    # Filters
    keywords = Column(JSON)  # Keywords to filter notifications
    priority_threshold = Column(String(10))  # minimum priority to receive

    # Audit fields
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())

    # Relationships
    user = relationship("User")

    def __repr__(self):
        return f"<NotificationSubscription(id={self.id}, user_id={self.user_id}, type='{self.notification_type}')>"

class NotificationLog(Base):
    __tablename__ = "notification_logs"

    id = Column(Integer, primary_key=True, index=True)
    notification_id = Column(Integer, ForeignKey("notifications.id"), nullable=False)

    # Delivery details
    channel = Column(String(20), nullable=False)  # email, sms, push, slack
    delivery_status = Column(String(20), nullable=False)  # sent, failed, pending, delivered, bounced
    delivery_attempts = Column(Integer, default=1)

    # Provider details
    provider_name = Column(String(50))  # e.g., SendGrid, Twilio, Firebase
    provider_message_id = Column(String(255))  # External provider's message ID
    provider_response = Column(JSON)  # Full provider response

    # Error handling
    error_code = Column(String(50))
    error_message = Column(Text)

    # Timing
    sent_at = Column(DateTime, default=func.now())
    delivered_at = Column(DateTime)
    opened_at = Column(DateTime)  # For email tracking
    clicked_at = Column(DateTime)  # For link tracking

    # Metadata
    recipient_contact = Column(String(255))  # email address or phone number used
    metadata_json = Column('metadata', JSON)  # Additional tracking data

    # Relationships
    notification = relationship("Notification")

    def __repr__(self):
        return f"<NotificationLog(id={self.id}, channel='{self.channel}', status='{self.delivery_status}')>"

class NotificationQueue(Base):
    __tablename__ = "notification_queue"

    id = Column(Integer, primary_key=True, index=True)
    notification_id = Column(Integer, ForeignKey("notifications.id"), nullable=False)

    # Queue management
    priority = Column(Integer, default=5)  # 1-10, where 1 is highest priority
    queue_name = Column(String(50), default='default')

    # Processing status
    status = Column(String(20), default='pending')  # pending, processing, completed, failed, cancelled
    processing_attempts = Column(Integer, default=0)
    max_attempts = Column(Integer, default=3)

    # Scheduling
    scheduled_at = Column(DateTime, nullable=False)
    processed_at = Column(DateTime)

    # Error handling
    last_error = Column(Text)
    retry_after = Column(DateTime)

    # Audit
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())

    # Relationships
    notification = relationship("Notification")

    def __repr__(self):
        return f"<NotificationQueue(id={self.id}, status='{self.status}', priority={self.priority})>"

class NotificationSettings(Base):
    __tablename__ = "notification_settings"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)

    # Global preferences
    email_enabled = Column(Boolean, default=True)
    sms_enabled = Column(Boolean, default=True)
    push_enabled = Column(Boolean, default=True)
    slack_enabled = Column(Boolean, default=False)

    # Timing preferences
    quiet_hours_enabled = Column(Boolean, default=False)
    quiet_hours_start = Column(String(5), default='22:00')
    quiet_hours_end = Column(String(5), default='08:00')
    timezone = Column(String(50), default='Asia/Riyadh')

    # Frequency settings
    digest_frequency = Column(String(20), default='daily')  # none, daily, weekly
    digest_time = Column(String(5), default='09:00')  # HH:MM

    # Content preferences
    language = Column(String(10), default='ar')
    format_preference = Column(String(10), default='html')  # html, text

    # Contact information
    email_address = Column(String(255))
    phone_number = Column(String(20))
    slack_user_id = Column(String(50))
    push_token = Column(String(500))  # Device token for push notifications

    # Audit
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())

    # Relationships
    user = relationship("User")

    def __repr__(self):
        return f"<NotificationSettings(id={self.id}, user_id={self.user_id})>"
