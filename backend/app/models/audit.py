from sqlalchemy import Column, Integer, String, DateTime, Boolean, Text, JSON, ForeignKey, Index
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base
from datetime import datetime
import enum

class AuditAction(enum.Enum):
    CREATE = "create"
    READ = "read"
    UPDATE = "update"
    DELETE = "delete"
    LOGIN = "login"
    LOGOUT = "logout"
    EXPORT = "export"
    IMPORT = "import"
    APPROVE = "approve"
    REJECT = "reject"
    SEND = "send"
    RECEIVE = "receive"
    CALCULATE = "calculate"
    DISTRIBUTE = "distribute"

class AuditLevel(enum.Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"

class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(Integer, primary_key=True, index=True)

    # User and session information
    user_id = Column(Integer, ForeignKey("users.id"))
    username = Column(String(100))  # Denormalized for performance
    user_role = Column(String(50))  # Denormalized for performance
    session_id = Column(String(100))

    # Action details
    action = Column(String(50), nullable=False)  # CREATE, UPDATE, DELETE, etc.
    entity_type = Column(String(100), nullable=False)  # partners, invoices, etc.
    entity_id = Column(Integer)  # ID of the affected entity
    entity_name = Column(String(255))  # Human-readable name

    # Change tracking
    old_values = Column(JSON)  # Previous values (for updates)
    new_values = Column(JSON)  # New values (for creates/updates)
    changed_fields = Column(JSON)  # List of changed field names

    # Request context
    ip_address = Column(String(45))  # IPv4 or IPv6
    user_agent = Column(Text)
    request_method = Column(String(10))  # GET, POST, PUT, DELETE
    request_url = Column(String(500))
    request_parameters = Column(JSON)

    # Audit metadata
    audit_level = Column(String(20), default='medium')  # low, medium, high, critical
    category = Column(String(50))  # financial, operational, security, etc.
    subcategory = Column(String(50))

    # Success/failure tracking
    is_successful = Column(Boolean, default=True)
    error_message = Column(Text)
    error_code = Column(String(50))

    # Additional context
    description = Column(Text)  # Human-readable description
    # Use non-reserved attribute; keep DB column named 'metadata'
    metadata_json = Column('metadata', JSON)  # Additional context data
    tags = Column(JSON)  # Array of tags for categorization

    # Timing information
    timestamp = Column(DateTime, default=func.now(), nullable=False)
    duration_ms = Column(Integer)  # Request duration in milliseconds

    # Data sensitivity
    contains_pii = Column(Boolean, default=False)  # Contains personally identifiable information
    contains_financial = Column(Boolean, default=False)  # Contains financial data
    retention_period_days = Column(Integer, default=2555)  # 7 years default

    # Compliance tracking
    compliance_tags = Column(JSON)  # Array of compliance standards (SOX, GDPR, etc.)
    is_exported = Column(Boolean, default=False)  # Has been exported for compliance
    export_timestamp = Column(DateTime)

    # Relationships
    user = relationship("User")

    # Indexes for performance
    __table_args__ = (
        Index('idx_audit_timestamp', 'timestamp'),
        Index('idx_audit_user_id', 'user_id'),
        Index('idx_audit_entity', 'entity_type', 'entity_id'),
        Index('idx_audit_action', 'action'),
        Index('idx_audit_category', 'category'),
        Index('idx_audit_level', 'audit_level'),
        Index('idx_audit_ip', 'ip_address'),
        Index('idx_audit_session', 'session_id'),
    )

    def __repr__(self):
        return f"<AuditLog(id={self.id}, user='{self.username}', action='{self.action}', entity='{self.entity_type}')>"

class AuditRule(Base):
    __tablename__ = "audit_rules"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    description = Column(Text)

    # Rule conditions
    entity_types = Column(JSON)  # Which entity types to audit
    actions = Column(JSON)  # Which actions to audit
    user_roles = Column(JSON)  # Which user roles to audit
    conditions = Column(JSON)  # Additional conditions (field changes, value thresholds, etc.)

    # Rule configuration
    audit_level = Column(String(20), default='medium')
    category = Column(String(50))
    is_active = Column(Boolean, default=True)

    # What to capture
    capture_old_values = Column(Boolean, default=True)
    capture_new_values = Column(Boolean, default=True)
    capture_request_data = Column(Boolean, default=False)
    capture_response_data = Column(Boolean, default=False)

    # Retention and compliance
    retention_period_days = Column(Integer, default=2555)  # 7 years
    compliance_tags = Column(JSON)

    # Notifications
    send_notifications = Column(Boolean, default=False)
    notification_recipients = Column(JSON)  # User IDs to notify
    notification_threshold = Column(String(20))  # When to send notifications

    # Audit fields
    created_by = Column(Integer, ForeignKey("users.id"))
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())

    # Relationships
    creator = relationship("User")

    def __repr__(self):
        return f"<AuditRule(id={self.id}, name='{self.name}', active={self.is_active})>"

class AuditSummary(Base):
    __tablename__ = "audit_summaries"

    id = Column(Integer, primary_key=True, index=True)

    # Time period
    period_start = Column(DateTime, nullable=False)
    period_end = Column(DateTime, nullable=False)
    period_type = Column(String(20), nullable=False)  # hourly, daily, weekly, monthly

    # Aggregated statistics
    total_actions = Column(Integer, default=0)
    successful_actions = Column(Integer, default=0)
    failed_actions = Column(Integer, default=0)
    unique_users = Column(Integer, default=0)
    unique_entities = Column(Integer, default=0)

    # Action breakdown
    action_breakdown = Column(JSON)  # {"CREATE": 150, "UPDATE": 300, ...}
    entity_breakdown = Column(JSON)  # {"partners": 50, "invoices": 200, ...}
    user_breakdown = Column(JSON)   # {"admin": 100, "user": 250, ...}

    # Risk indicators
    high_risk_actions = Column(Integer, default=0)
    critical_actions = Column(Integer, default=0)
    security_events = Column(Integer, default=0)
    compliance_violations = Column(Integer, default=0)

    # Financial tracking
    financial_transactions = Column(Integer, default=0)
    total_amount_affected = Column(JSON)  # By currency
    large_transactions = Column(Integer, default=0)  # Above threshold

    # Performance metrics
    avg_response_time_ms = Column(Integer)
    slowest_operations = Column(JSON)  # Top 10 slowest operations

    # Anomaly detection
    anomalies_detected = Column(Integer, default=0)
    anomaly_details = Column(JSON)

    # Generated metadata
    generated_at = Column(DateTime, default=func.now())
    generated_by = Column(String(50), default='system')

    def __repr__(self):
        return f"<AuditSummary(id={self.id}, period='{self.period_type}', actions={self.total_actions})>"

class AuditAnomaly(Base):
    __tablename__ = "audit_anomalies"

    id = Column(Integer, primary_key=True, index=True)
    audit_log_id = Column(Integer, ForeignKey("audit_logs.id"))

    # Anomaly classification
    anomaly_type = Column(String(50), nullable=False)  # unusual_volume, off_hours, location, pattern
    severity = Column(String(20), default='medium')  # low, medium, high, critical
    confidence_score = Column(Integer)  # 0-100

    # Detection details
    detected_at = Column(DateTime, default=func.now())
    detection_method = Column(String(50))  # rule_based, ml_model, statistical
    baseline_period = Column(String(50))  # What period was used for baseline

    # Anomaly description
    description = Column(Text)
    expected_value = Column(String(255))
    actual_value = Column(String(255))
    deviation_percentage = Column(Integer)

    # Context information
    context_data = Column(JSON)  # Additional context for the anomaly
    related_events = Column(JSON)  # Related audit log IDs

    # Resolution tracking
    is_resolved = Column(Boolean, default=False)
    resolved_at = Column(DateTime)
    resolved_by = Column(Integer, ForeignKey("users.id"))
    resolution_notes = Column(Text)
    false_positive = Column(Boolean, default=False)

    # Notification tracking
    notifications_sent = Column(Boolean, default=False)
    notification_recipients = Column(JSON)

    # Relationships
    audit_log = relationship("AuditLog")
    resolver = relationship("User", foreign_keys=[resolved_by])

    def __repr__(self):
        return f"<AuditAnomaly(id={self.id}, type='{self.anomaly_type}', severity='{self.severity}')>"

class AuditExport(Base):
    __tablename__ = "audit_exports"

    id = Column(Integer, primary_key=True, index=True)

    # Export parameters
    export_type = Column(String(20), nullable=False)  # full, filtered, summary
    format = Column(String(10), nullable=False)  # csv, json, xlsx, pdf

    # Filter criteria
    start_date = Column(DateTime)
    end_date = Column(DateTime)
    user_ids = Column(JSON)
    entity_types = Column(JSON)
    actions = Column(JSON)
    audit_levels = Column(JSON)
    categories = Column(JSON)

    # Export results
    total_records = Column(Integer)
    file_path = Column(String(500))
    file_size_bytes = Column(Integer)
    checksum = Column(String(64))  # SHA-256

    # Export metadata
    requested_by = Column(Integer, ForeignKey("users.id"))
    requested_at = Column(DateTime, default=func.now())
    started_at = Column(DateTime)
    completed_at = Column(DateTime)

    # Status tracking
    status = Column(String(20), default='pending')  # pending, processing, completed, failed
    error_message = Column(Text)

    # Compliance and retention
    export_reason = Column(String(255))  # Compliance requirement, investigation, etc.
    retention_until = Column(DateTime)
    is_encrypted = Column(Boolean, default=True)
    access_log = Column(JSON)  # Who accessed the export file

    # Relationships
    requester = relationship("User")

    def __repr__(self):
        return f"<AuditExport(id={self.id}, type='{self.export_type}', status='{self.status}')>"
