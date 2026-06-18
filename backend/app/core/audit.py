from sqlalchemy.orm import Session
from app.models.audit import AuditLog, AuditRule, AuditAnomaly
from app.database import get_db
from typing import Dict, Any, Optional, List
import json
import logging
from datetime import datetime
from fastapi import Request
import hashlib
import uuid

logger = logging.getLogger(__name__)

class AuditLogger:
    """Comprehensive audit logging system"""

    def __init__(self, db: Session = None):
        self.db = db or next(get_db())

    def log_action(
        self,
        user_id: Optional[int],
        action: str,
        entity_type: str,
        entity_id: Optional[int] = None,
        entity_name: Optional[str] = None,
        old_values: Optional[Dict[str, Any]] = None,
        new_values: Optional[Dict[str, Any]] = None,
        request: Optional[Request] = None,
        session_id: Optional[str] = None,
        is_successful: bool = True,
        error_message: Optional[str] = None,
        description: Optional[str] = None,
        audit_level: str = "medium",
        category: Optional[str] = None,
        metadata: Optional[Dict[str, Any]] = None
    ) -> AuditLog:
        """Log an audit event"""
        try:
            # Get user information
            username = None
            user_role = None
            if user_id:
                from app.models.users import User
                user = self.db.query(User).filter(User.id == user_id).first()
                if user:
                    username = user.username
                    user_role = user.role

            # Extract request information
            ip_address = None
            user_agent = None
            request_method = None
            request_url = None
            request_parameters = None

            if request:
                ip_address = self._get_client_ip(request)
                user_agent = request.headers.get("user-agent", "")[:500]
                request_method = request.method
                request_url = str(request.url)[:500]

                # Extract query parameters
                if request.query_params:
                    request_parameters = dict(request.query_params)

            # Calculate changed fields
            changed_fields = []
            if old_values and new_values:
                changed_fields = [
                    field for field in new_values.keys()
                    if field in old_values and old_values[field] != new_values[field]
                ]

            # Determine data sensitivity
            contains_pii = self._contains_pii(old_values, new_values)
            contains_financial = self._contains_financial(entity_type, old_values, new_values)

            # Create audit log entry
            audit_log = AuditLog(
                user_id=user_id,
                username=username,
                user_role=user_role,
                session_id=session_id or str(uuid.uuid4()),
                action=action,
                entity_type=entity_type,
                entity_id=entity_id,
                entity_name=entity_name,
                old_values=old_values,
                new_values=new_values,
                changed_fields=changed_fields,
                ip_address=ip_address,
                user_agent=user_agent,
                request_method=request_method,
                request_url=request_url,
                request_parameters=request_parameters,
                audit_level=audit_level,
                category=category or self._categorize_entity(entity_type),
                is_successful=is_successful,
                error_message=error_message,
                description=description or self._generate_description(action, entity_type, entity_name),
                metadata_json=metadata,
                contains_pii=contains_pii,
                contains_financial=contains_financial,
                timestamp=datetime.utcnow()
            )

            self.db.add(audit_log)
            self.db.commit()
            self.db.refresh(audit_log)

            # Check for anomalies
            self._check_for_anomalies(audit_log)

            return audit_log

        except Exception as e:
            logger.error(f"Error logging audit event: {str(e)}")
            self.db.rollback()
            raise

    def log_login(self, user_id: int, username: str, is_successful: bool,
                  request: Optional[Request] = None, error_message: Optional[str] = None):
        """Log user login attempt"""
        return self.log_action(
            user_id=user_id if is_successful else None,
            action="login",
            entity_type="authentication",
            entity_name=username,
            request=request,
            is_successful=is_successful,
            error_message=error_message,
            audit_level="high" if not is_successful else "medium",
            category="security"
        )

    def log_logout(self, user_id: int, username: str, session_id: str,
                   request: Optional[Request] = None):
        """Log user logout"""
        return self.log_action(
            user_id=user_id,
            action="logout",
            entity_type="authentication",
            entity_name=username,
            session_id=session_id,
            request=request,
            audit_level="low",
            category="security"
        )

    def log_financial_transaction(self, user_id: int, action: str, entity_type: str,
                                entity_id: int, amount: float, currency: str = "SAR",
                                old_values: Optional[Dict] = None,
                                new_values: Optional[Dict] = None,
                                request: Optional[Request] = None):
        """Log financial transaction with special handling"""
        metadata = {
            "amount": amount,
            "currency": currency,
            "transaction_type": "financial"
        }

        return self.log_action(
            user_id=user_id,
            action=action,
            entity_type=entity_type,
            entity_id=entity_id,
            old_values=old_values,
            new_values=new_values,
            request=request,
            audit_level="high",
            category="financial",
            metadata_json=metadata
        )

    def log_data_export(self, user_id: int, export_type: str, entity_types: List[str],
                       record_count: int, request: Optional[Request] = None):
        """Log data export events"""
        metadata = {
            "export_type": export_type,
            "entity_types": entity_types,
            "record_count": record_count
        }

        return self.log_action(
            user_id=user_id,
            action="export",
            entity_type="data_export",
            request=request,
            audit_level="high",
            category="data_privacy",
            metadata_json=metadata
        )

    def log_bulk_operation(self, user_id: int, action: str, entity_type: str,
                          affected_count: int, success_count: int,
                          request: Optional[Request] = None):
        """Log bulk operations"""
        metadata = {
            "affected_count": affected_count,
            "success_count": success_count,
            "failure_count": affected_count - success_count
        }

        return self.log_action(
            user_id=user_id,
            action=f"bulk_{action}",
            entity_type=entity_type,
            request=request,
            audit_level="high",
            category="bulk_operation",
            metadata_json=metadata
        )

    def _get_client_ip(self, request: Request) -> str:
        """Extract client IP address from request"""
        # Check for forwarded IP (behind proxy)
        forwarded = request.headers.get("X-Forwarded-For")
        if forwarded:
            return forwarded.split(",")[0].strip()

        # Check for real IP (behind load balancer)
        real_ip = request.headers.get("X-Real-IP")
        if real_ip:
            return real_ip

        # Fallback to direct connection
        if hasattr(request, "client") and request.client:
            return request.client.host

        return "unknown"

    def _contains_pii(self, old_values: Optional[Dict], new_values: Optional[Dict]) -> bool:
        """Check if the data contains personally identifiable information"""
        pii_fields = [
            'email', 'phone', 'phone_number', 'mobile', 'address',
            'national_id', 'passport', 'ssn', 'tax_id', 'birth_date',
            'first_name', 'last_name', 'full_name'
        ]

        all_values = {}
        if old_values:
            all_values.update(old_values)
        if new_values:
            all_values.update(new_values)

        for field in all_values.keys():
            if any(pii_field in field.lower() for pii_field in pii_fields):
                return True

        return False

    def _contains_financial(self, entity_type: str, old_values: Optional[Dict],
                          new_values: Optional[Dict]) -> bool:
        """Check if the data contains financial information"""
        financial_entities = [
            'invoice', 'payment', 'transaction', 'profit_distribution',
            'expense', 'revenue', 'balance', 'account'
        ]

        financial_fields = [
            'amount', 'price', 'total', 'subtotal', 'tax', 'discount',
            'salary', 'commission', 'profit', 'loss', 'balance'
        ]

        # Check entity type
        if any(fe in entity_type.lower() for fe in financial_entities):
            return True

        # Check field names
        all_values = {}
        if old_values:
            all_values.update(old_values)
        if new_values:
            all_values.update(new_values)

        for field in all_values.keys():
            if any(ff in field.lower() for ff in financial_fields):
                return True

        return False

    def _categorize_entity(self, entity_type: str) -> str:
        """Automatically categorize entity type"""
        categories = {
            'financial': ['invoice', 'payment', 'transaction', 'profit_distribution', 'expense'],
            'operational': ['project', 'service_ticket', 'maintenance', 'inventory'],
            'customer': ['customer', 'partner', 'supplier', 'contact'],
            'security': ['user', 'authentication', 'permission', 'role'],
            'system': ['configuration', 'backup', 'export', 'import']
        }

        entity_lower = entity_type.lower()
        for category, keywords in categories.items():
            if any(keyword in entity_lower for keyword in keywords):
                return category

        return 'general'

    def _generate_description(self, action: str, entity_type: str,
                            entity_name: Optional[str] = None) -> str:
        """Generate human-readable description"""
        action_map = {
            'create': 'إنشاء',
            'read': 'عرض',
            'update': 'تحديث',
            'delete': 'حذف',
            'login': 'تسجيل دخول',
            'logout': 'تسجيل خروج',
            'export': 'تصدير',
            'import': 'استيراد'
        }

        entity_map = {
            'partner': 'شريك',
            'customer': 'عميل',
            'project': 'مشروع',
            'invoice': 'فاتورة',
            'payment': 'دفعة',
            'user': 'مستخدم'
        }

        action_ar = action_map.get(action, action)
        entity_ar = entity_map.get(entity_type, entity_type)

        if entity_name:
            return f"{action_ar} {entity_ar}: {entity_name}"
        else:
            return f"{action_ar} {entity_ar}"

    def _check_for_anomalies(self, audit_log: AuditLog):
        """Check for anomalous behavior"""
        try:
            # Check for unusual off-hours activity
            hour = audit_log.timestamp.hour
            if hour < 6 or hour > 22:  # Outside normal business hours
                self._create_anomaly(
                    audit_log,
                    "off_hours_activity",
                    "medium",
                    f"Activity detected at {audit_log.timestamp.strftime('%H:%M')}"
                )

            # Check for rapid successive actions
            recent_actions = self.db.query(AuditLog).filter(
                AuditLog.user_id == audit_log.user_id,
                AuditLog.timestamp > datetime.utcnow().replace(minute=datetime.utcnow().minute - 1),
                AuditLog.id != audit_log.id
            ).count()

            if recent_actions > 10:  # More than 10 actions in the last minute
                self._create_anomaly(
                    audit_log,
                    "rapid_activity",
                    "high",
                    f"{recent_actions} actions in the last minute"
                )

            # Check for failed login attempts
            if audit_log.action == "login" and not audit_log.is_successful:
                recent_failures = self.db.query(AuditLog).filter(
                    AuditLog.action == "login",
                    AuditLog.is_successful == False,
                    AuditLog.ip_address == audit_log.ip_address,
                    AuditLog.timestamp > datetime.utcnow().replace(hour=datetime.utcnow().hour - 1)
                ).count()

                if recent_failures > 5:  # More than 5 failed attempts in the last hour
                    self._create_anomaly(
                        audit_log,
                        "brute_force_attempt",
                        "critical",
                        f"{recent_failures} failed login attempts from {audit_log.ip_address}"
                    )

        except Exception as e:
            logger.error(f"Error checking for anomalies: {str(e)}")

    def _create_anomaly(self, audit_log: AuditLog, anomaly_type: str,
                       severity: str, description: str):
        """Create an anomaly record"""
        try:
            anomaly = AuditAnomaly(
                audit_log_id=audit_log.id,
                anomaly_type=anomaly_type,
                severity=severity,
                description=description,
                detection_method="rule_based",
                confidence_score=80
            )

            self.db.add(anomaly)
            self.db.commit()

            # Send notification for high/critical anomalies
            if severity in ["high", "critical"]:
                self._send_anomaly_notification(anomaly)

        except Exception as e:
            logger.error(f"Error creating anomaly: {str(e)}")

    def _send_anomaly_notification(self, anomaly: AuditAnomaly):
        """Send notification for detected anomaly"""
        try:
            from app.tasks.notifications import send_system_alerts

            message = f"تم اكتشاف نشاط مشبوه: {anomaly.description}"

            send_system_alerts.delay(
                alert_type="security_anomaly",
                message=message,
                severity=anomaly.severity
            )

        except Exception as e:
            logger.error(f"Error sending anomaly notification: {str(e)}")

    def get_audit_trail(self, entity_type: str, entity_id: int) -> List[AuditLog]:
        """Get complete audit trail for an entity"""
        return self.db.query(AuditLog).filter(
            AuditLog.entity_type == entity_type,
            AuditLog.entity_id == entity_id
        ).order_by(AuditLog.timestamp.desc()).all()

    def get_user_activity(self, user_id: int, hours: int = 24) -> List[AuditLog]:
        """Get user activity for specified time period"""
        start_time = datetime.utcnow().replace(hour=datetime.utcnow().hour - hours)

        return self.db.query(AuditLog).filter(
            AuditLog.user_id == user_id,
            AuditLog.timestamp >= start_time
        ).order_by(AuditLog.timestamp.desc()).all()

# Decorator for automatic audit logging
def audit_action(action: str, entity_type: str, audit_level: str = "medium"):
    """Decorator to automatically log function calls"""
    def decorator(func):
        def wrapper(*args, **kwargs):
            # Extract common parameters
            user_id = kwargs.get('current_user_id') or kwargs.get('user_id')
            request = kwargs.get('request')

            try:
                # Execute the function
                result = func(*args, **kwargs)

                # Log successful action
                auditor = AuditLogger()
                auditor.log_action(
                    user_id=user_id,
                    action=action,
                    entity_type=entity_type,
                    request=request,
                    audit_level=audit_level,
                    is_successful=True
                )

                return result

            except Exception as e:
                # Log failed action
                auditor = AuditLogger()
                auditor.log_action(
                    user_id=user_id,
                    action=action,
                    entity_type=entity_type,
                    request=request,
                    audit_level="high",
                    is_successful=False,
                    error_message=str(e)
                )
                raise

        return wrapper
    return decorator
