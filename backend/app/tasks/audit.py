from celery import current_app as celery_app
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.audit import AuditLog, AuditSummary, AuditAnomaly, AuditExport
from app.models.users import User
from typing import Dict, Any, List
import logging
from datetime import datetime, timedelta
import json
import os
import csv
import pandas as pd
from collections import defaultdict

logger = logging.getLogger(__name__)

@celery_app.task(bind=True)
def generate_audit_summary(self, period_type: str = "daily", date: str = None):
    """Generate audit summary for specified period"""
    try:
        db = next(get_db())

        # Parse date or use current date
        if date:
            target_date = datetime.fromisoformat(date)
        else:
            target_date = datetime.utcnow()

        # Determine period boundaries
        if period_type == "hourly":
            period_start = target_date.replace(minute=0, second=0, microsecond=0)
            period_end = period_start + timedelta(hours=1)
        elif period_type == "daily":
            period_start = target_date.replace(hour=0, minute=0, second=0, microsecond=0)
            period_end = period_start + timedelta(days=1)
        elif period_type == "weekly":
            days_since_monday = target_date.weekday()
            period_start = (target_date - timedelta(days=days_since_monday)).replace(hour=0, minute=0, second=0, microsecond=0)
            period_end = period_start + timedelta(weeks=1)
        elif period_type == "monthly":
            period_start = target_date.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
            next_month = period_start.replace(month=period_start.month + 1) if period_start.month < 12 else period_start.replace(year=period_start.year + 1, month=1)
            period_end = next_month
        else:
            raise ValueError(f"Invalid period_type: {period_type}")

        # Check if summary already exists
        existing_summary = db.query(AuditSummary).filter(
            AuditSummary.period_start == period_start,
            AuditSummary.period_end == period_end,
            AuditSummary.period_type == period_type
        ).first()

        if existing_summary:
            logger.info(f"Audit summary already exists for {period_type} period starting {period_start}")
            return {"status": "exists", "summary_id": existing_summary.id}

        # Query audit logs for the period
        audit_logs = db.query(AuditLog).filter(
            AuditLog.timestamp >= period_start,
            AuditLog.timestamp < period_end
        ).all()

        # Calculate statistics
        total_actions = len(audit_logs)
        successful_actions = len([log for log in audit_logs if log.is_successful])
        failed_actions = total_actions - successful_actions
        unique_users = len(set(log.user_id for log in audit_logs if log.user_id))
        unique_entities = len(set(f"{log.entity_type}:{log.entity_id}" for log in audit_logs if log.entity_id))

        # Action breakdown
        action_breakdown = defaultdict(int)
        entity_breakdown = defaultdict(int)
        user_breakdown = defaultdict(int)

        high_risk_actions = 0
        critical_actions = 0
        security_events = 0
        financial_transactions = 0
        total_amount_affected = defaultdict(float)
        large_transactions = 0

        response_times = []

        for log in audit_logs:
            # Action breakdown
            action_breakdown[log.action] += 1

            # Entity breakdown
            entity_breakdown[log.entity_type] += 1

            # User role breakdown
            if log.user_role:
                user_breakdown[log.user_role] += 1

            # Risk level tracking
            if log.audit_level == "high":
                high_risk_actions += 1
            elif log.audit_level == "critical":
                critical_actions += 1

            # Security events
            if log.category == "security":
                security_events += 1

            # Financial tracking
            if log.contains_financial:
                financial_transactions += 1

                # Extract amount if available
                if log.metadata_json and isinstance(log.metadata_json, dict):
                    amount = log.metadata_json.get("amount")
                    currency = log.metadata_json.get("currency", "SAR")
                    if amount:
                        total_amount_affected[currency] += float(amount)
                        if float(amount) > 100000:  # Large transaction threshold
                            large_transactions += 1

            # Response time tracking
            if log.duration_ms:
                response_times.append(log.duration_ms)

        # Calculate average response time
        avg_response_time_ms = int(sum(response_times) / len(response_times)) if response_times else 0

        # Find slowest operations
        slowest_logs = sorted([log for log in audit_logs if log.duration_ms],
                            key=lambda x: x.duration_ms, reverse=True)[:10]
        slowest_operations = [
            {
                "action": log.action,
                "entity_type": log.entity_type,
                "duration_ms": log.duration_ms,
                "timestamp": log.timestamp.isoformat()
            }
            for log in slowest_logs
        ]

        # Check for anomalies in this period
        anomalies = db.query(AuditAnomaly).join(AuditLog).filter(
            AuditLog.timestamp >= period_start,
            AuditLog.timestamp < period_end
        ).all()

        anomalies_detected = len(anomalies)
        anomaly_details = defaultdict(int)
        for anomaly in anomalies:
            anomaly_details[anomaly.anomaly_type] += 1

        # Create summary record
        summary = AuditSummary(
            period_start=period_start,
            period_end=period_end,
            period_type=period_type,
            total_actions=total_actions,
            successful_actions=successful_actions,
            failed_actions=failed_actions,
            unique_users=unique_users,
            unique_entities=unique_entities,
            action_breakdown=dict(action_breakdown),
            entity_breakdown=dict(entity_breakdown),
            user_breakdown=dict(user_breakdown),
            high_risk_actions=high_risk_actions,
            critical_actions=critical_actions,
            security_events=security_events,
            financial_transactions=financial_transactions,
            total_amount_affected=dict(total_amount_affected),
            large_transactions=large_transactions,
            avg_response_time_ms=avg_response_time_ms,
            slowest_operations=slowest_operations,
            anomalies_detected=anomalies_detected,
            anomaly_details=dict(anomaly_details)
        )

        db.add(summary)
        db.commit()
        db.refresh(summary)

        logger.info(f"Generated {period_type} audit summary for {period_start} - {period_end}")
        return {
            "status": "success",
            "summary_id": summary.id,
            "period": f"{period_start} - {period_end}",
            "total_actions": total_actions
        }

    except Exception as exc:
        logger.error(f"Error generating audit summary: {str(exc)}")
        raise
    finally:
        db.close()

@celery_app.task(bind=True)
def detect_audit_anomalies(self, hours_back: int = 24):
    """Detect anomalies in audit logs"""
    try:
        db = next(get_db())

        # Define time window
        start_time = datetime.utcnow() - timedelta(hours=hours_back)

        # Get recent audit logs
        recent_logs = db.query(AuditLog).filter(
            AuditLog.timestamp >= start_time
        ).all()

        anomalies_found = []

        # Detect unusual volume of activities per user
        user_activity = defaultdict(int)
        for log in recent_logs:
            if log.user_id:
                user_activity[log.user_id] += 1

        # Check for users with unusually high activity
        avg_activity = sum(user_activity.values()) / len(user_activity) if user_activity else 0
        threshold = avg_activity * 3  # 3x average

        for user_id, activity_count in user_activity.items():
            if activity_count > threshold and activity_count > 50:  # At least 50 actions
                # Check if this anomaly already exists
                existing = db.query(AuditAnomaly).join(AuditLog).filter(
                    AuditLog.user_id == user_id,
                    AuditAnomaly.anomaly_type == "unusual_volume",
                    AuditAnomaly.detected_at >= start_time
                ).first()

                if not existing:
                    # Get a representative audit log for this user
                    user_log = next((log for log in recent_logs if log.user_id == user_id), None)
                    if user_log:
                        anomaly = AuditAnomaly(
                            audit_log_id=user_log.id,
                            anomaly_type="unusual_volume",
                            severity="high",
                            confidence_score=85,
                            description=f"User performed {activity_count} actions in {hours_back} hours (average: {avg_activity:.1f})",
                            expected_value=f"{avg_activity:.1f}",
                            actual_value=str(activity_count),
                            deviation_percentage=int((activity_count - avg_activity) / avg_activity * 100),
                            detection_method="statistical"
                        )
                        db.add(anomaly)
                        anomalies_found.append(f"unusual_volume_user_{user_id}")

        # Detect failed login patterns
        failed_logins = [log for log in recent_logs if log.action == "login" and not log.is_successful]
        ip_failures = defaultdict(int)

        for log in failed_logins:
            if log.ip_address:
                ip_failures[log.ip_address] += 1

        # Check for potential brute force attacks
        for ip_address, failure_count in ip_failures.items():
            if failure_count > 10:  # More than 10 failed attempts
                # Check if this anomaly already exists
                existing = db.query(AuditAnomaly).join(AuditLog).filter(
                    AuditLog.ip_address == ip_address,
                    AuditAnomaly.anomaly_type == "brute_force_attempt",
                    AuditAnomaly.detected_at >= start_time
                ).first()

                if not existing:
                    # Get the latest failed login for this IP
                    failed_log = next((log for log in failed_logins if log.ip_address == ip_address), None)
                    if failed_log:
                        anomaly = AuditAnomaly(
                            audit_log_id=failed_log.id,
                            anomaly_type="brute_force_attempt",
                            severity="critical",
                            confidence_score=95,
                            description=f"Multiple failed login attempts from IP {ip_address} ({failure_count} attempts)",
                            expected_value="< 3",
                            actual_value=str(failure_count),
                            detection_method="rule_based"
                        )
                        db.add(anomaly)
                        anomalies_found.append(f"brute_force_{ip_address}")

        # Detect off-hours activity
        off_hours_logs = [
            log for log in recent_logs
            if log.timestamp.hour < 6 or log.timestamp.hour > 22
        ]

        if len(off_hours_logs) > 20:  # Significant off-hours activity
            latest_off_hours = max(off_hours_logs, key=lambda x: x.timestamp)

            # Check if this anomaly already exists
            existing = db.query(AuditAnomaly).filter(
                AuditAnomaly.anomaly_type == "off_hours_activity",
                AuditAnomaly.detected_at >= start_time
            ).first()

            if not existing:
                anomaly = AuditAnomaly(
                    audit_log_id=latest_off_hours.id,
                    anomaly_type="off_hours_activity",
                    severity="medium",
                    confidence_score=75,
                    description=f"Significant activity detected outside business hours ({len(off_hours_logs)} actions)",
                    expected_value="< 5",
                    actual_value=str(len(off_hours_logs)),
                    detection_method="rule_based"
                )
                db.add(anomaly)
                anomalies_found.append("off_hours_activity")

        # Detect large financial transactions
        large_financial_logs = [
            log for log in recent_logs
            if log.contains_financial and log.metadata_json and
            isinstance(log.metadata_json, dict) and
            log.metadata_json.get("amount", 0) > 500000  # > 500k SAR
        ]

        for log in large_financial_logs:
            # Check if this specific transaction was already flagged
            existing = db.query(AuditAnomaly).filter(
                AuditAnomaly.audit_log_id == log.id,
                AuditAnomaly.anomaly_type == "large_transaction"
            ).first()

            if not existing:
                amount = log.metadata_json.get("amount", 0)
                anomaly = AuditAnomaly(
                    audit_log_id=log.id,
                    anomaly_type="large_transaction",
                    severity="high",
                    confidence_score=90,
                    description=f"Large financial transaction detected: {amount:,.0f} SAR",
                    expected_value="< 500,000",
                    actual_value=f"{amount:,.0f}",
                    detection_method="rule_based"
                )
                db.add(anomaly)
                anomalies_found.append(f"large_transaction_{log.id}")

        db.commit()

        # Send notifications for critical anomalies
        critical_anomalies = db.query(AuditAnomaly).filter(
            AuditAnomaly.severity == "critical",
            AuditAnomaly.detected_at >= start_time,
            AuditAnomaly.notifications_sent == False
        ).all()

        for anomaly in critical_anomalies:
            try:
                from app.tasks.notifications import send_system_alerts
                send_system_alerts.delay(
                    alert_type="security_anomaly",
                    message=f"تم اكتشاف نشاط مشبوه: {anomaly.description}",
                    severity="critical"
                )
                anomaly.notifications_sent = True
            except Exception as e:
                logger.error(f"Error sending anomaly notification: {str(e)}")

        db.commit()

        logger.info(f"Detected {len(anomalies_found)} audit anomalies")
        return {
            "status": "success",
            "anomalies_detected": len(anomalies_found),
            "anomaly_types": anomalies_found
        }

    except Exception as exc:
        logger.error(f"Error detecting audit anomalies: {str(exc)}")
        raise
    finally:
        db.close()

@celery_app.task(bind=True)
def export_audit_logs(self, start_date: str, end_date: str, format: str = "csv",
                     user_id: int = None, export_id: int = None):
    """Export audit logs to file"""
    try:
        db = next(get_db())

        # Parse dates
        start_dt = datetime.fromisoformat(start_date)
        end_dt = datetime.fromisoformat(end_date)

        # Update export status
        if export_id:
            export_record = db.query(AuditExport).filter(AuditExport.id == export_id).first()
            if export_record:
                export_record.status = "processing"
                export_record.started_at = datetime.utcnow()
                db.commit()

        # Query audit logs
        query = db.query(AuditLog).filter(
            AuditLog.timestamp >= start_dt,
            AuditLog.timestamp <= end_dt
        )

        if user_id:
            query = query.filter(AuditLog.user_id == user_id)

        audit_logs = query.order_by(AuditLog.timestamp.desc()).all()

        # Create export directory if it doesn't exist
        export_dir = "/app/exports/audit"
        os.makedirs(export_dir, exist_ok=True)

        # Generate filename
        timestamp = datetime.utcnow().strftime("%Y%m%d_%H%M%S")
        filename = f"audit_export_{timestamp}.{format}"
        file_path = os.path.join(export_dir, filename)

        if format == "csv":
            # Export to CSV
            with open(file_path, 'w', newline='', encoding='utf-8') as csvfile:
                fieldnames = [
                    'timestamp', 'username', 'user_role', 'action', 'entity_type',
                    'entity_id', 'entity_name', 'ip_address', 'is_successful',
                    'audit_level', 'category', 'description', 'changed_fields'
                ]
                writer = csv.DictWriter(csvfile, fieldnames=fieldnames)
                writer.writeheader()

                for log in audit_logs:
                    writer.writerow({
                        'timestamp': log.timestamp.isoformat(),
                        'username': log.username or '',
                        'user_role': log.user_role or '',
                        'action': log.action,
                        'entity_type': log.entity_type,
                        'entity_id': log.entity_id or '',
                        'entity_name': log.entity_name or '',
                        'ip_address': log.ip_address or '',
                        'is_successful': log.is_successful,
                        'audit_level': log.audit_level,
                        'category': log.category or '',
                        'description': log.description or '',
                        'changed_fields': ','.join(log.changed_fields) if log.changed_fields else ''
                    })

        elif format == "json":
            # Export to JSON
            export_data = []
            for log in audit_logs:
                export_data.append({
                    'id': log.id,
                    'timestamp': log.timestamp.isoformat(),
                    'user_id': log.user_id,
                    'username': log.username,
                    'user_role': log.user_role,
                    'action': log.action,
                    'entity_type': log.entity_type,
                    'entity_id': log.entity_id,
                    'entity_name': log.entity_name,
                    'old_values': log.old_values,
                    'new_values': log.new_values,
                    'changed_fields': log.changed_fields,
                    'ip_address': log.ip_address,
                    'user_agent': log.user_agent,
                    'is_successful': log.is_successful,
                    'audit_level': log.audit_level,
                    'category': log.category,
                    'description': log.description,
                    'metadata': log.metadata_json
                })

            with open(file_path, 'w', encoding='utf-8') as jsonfile:
                json.dump(export_data, jsonfile, ensure_ascii=False, indent=2)

        elif format == "xlsx":
            # Export to Excel
            data = []
            for log in audit_logs:
                data.append({
                    'التاريخ والوقت': log.timestamp.isoformat(),
                    'المستخدم': log.username or '',
                    'الدور': log.user_role or '',
                    'الإجراء': log.action,
                    'نوع الكيان': log.entity_type,
                    'معرف الكيان': log.entity_id or '',
                    'اسم الكيان': log.entity_name or '',
                    'عنوان IP': log.ip_address or '',
                    'نجح': 'نعم' if log.is_successful else 'لا',
                    'مستوى التدقيق': log.audit_level,
                    'الفئة': log.category or '',
                    'الوصف': log.description or ''
                })

            df = pd.DataFrame(data)
            df.to_excel(file_path, index=False, engine='openpyxl')

        # Calculate file size and checksum
        file_size = os.path.getsize(file_path)

        import hashlib
        with open(file_path, 'rb') as f:
            checksum = hashlib.sha256(f.read()).hexdigest()

        # Update export record
        if export_record:
            export_record.status = "completed"
            export_record.completed_at = datetime.utcnow()
            export_record.total_records = len(audit_logs)
            export_record.file_path = file_path
            export_record.file_size_bytes = file_size
            export_record.checksum = checksum
            db.commit()

        logger.info(f"Exported {len(audit_logs)} audit logs to {file_path}")
        return {
            "status": "success",
            "file_path": file_path,
            "total_records": len(audit_logs),
            "file_size_bytes": file_size,
            "checksum": checksum
        }

    except Exception as exc:
        logger.error(f"Error exporting audit logs: {str(exc)}")

        # Update export record with error
        if export_id:
            try:
                export_record = db.query(AuditExport).filter(AuditExport.id == export_id).first()
                if export_record:
                    export_record.status = "failed"
                    export_record.error_message = str(exc)
                    db.commit()
            except:
                pass

        raise
    finally:
        db.close()

@celery_app.task(bind=True)
def cleanup_old_audit_logs(self, retention_days: int = 2555):
    """Clean up old audit logs based on retention policy"""
    try:
        db = next(get_db())

        # Calculate cutoff date
        cutoff_date = datetime.utcnow() - timedelta(days=retention_days)

        # Find old logs
        old_logs = db.query(AuditLog).filter(
            AuditLog.timestamp < cutoff_date
        ).all()

        # Archive critical logs before deletion
        critical_logs = [log for log in old_logs if log.audit_level == "critical"]
        if critical_logs:
            # Archive critical logs (in a real implementation, this would archive to cold storage)
            logger.info(f"Would archive {len(critical_logs)} critical audit logs")

        # Delete old logs
        deleted_count = db.query(AuditLog).filter(
            AuditLog.timestamp < cutoff_date
        ).delete()

        # Clean up related anomalies
        deleted_anomalies = db.query(AuditAnomaly).filter(
            AuditAnomaly.detected_at < cutoff_date,
            AuditAnomaly.is_resolved == True
        ).delete()

        db.commit()

        logger.info(f"Cleaned up {deleted_count} old audit logs and {deleted_anomalies} resolved anomalies")
        return {
            "status": "success",
            "deleted_logs": deleted_count,
            "deleted_anomalies": deleted_anomalies,
            "cutoff_date": cutoff_date.isoformat()
        }

    except Exception as exc:
        logger.error(f"Error cleaning up audit logs: {str(exc)}")
        raise
    finally:
        db.close()

@celery_app.task(bind=True)
def generate_compliance_report(self, start_date: str, end_date: str, compliance_standard: str = "SOX"):
    """Generate compliance report for audit logs"""
    try:
        db = next(get_db())

        start_dt = datetime.fromisoformat(start_date)
        end_dt = datetime.fromisoformat(end_date)

        # Query relevant audit logs
        audit_logs = db.query(AuditLog).filter(
            AuditLog.timestamp >= start_dt,
            AuditLog.timestamp <= end_dt,
            AuditLog.contains_financial == True  # Focus on financial data for SOX
        ).all()

        # Generate compliance metrics
        total_financial_actions = len(audit_logs)
        unauthorized_attempts = len([log for log in audit_logs if not log.is_successful])

        # Check for segregation of duties violations
        user_financial_actions = defaultdict(set)
        for log in audit_logs:
            if log.user_id and log.action in ["create", "update", "delete"]:
                user_financial_actions[log.user_id].add(log.action)

        sod_violations = [
            user_id for user_id, actions in user_financial_actions.items()
            if len(actions) > 2  # User can create, update, AND delete
        ]

        # Check for proper authorization
        high_value_transactions = [
            log for log in audit_logs
            if log.metadata_json and isinstance(log.metadata_json, dict) and
            log.metadata_json.get("amount", 0) > 1000000  # > 1M SAR
        ]

        report = {
            "compliance_standard": compliance_standard,
            "period": {"start": start_date, "end": end_date},
            "total_financial_actions": total_financial_actions,
            "unauthorized_attempts": unauthorized_attempts,
            "segregation_of_duties_violations": len(sod_violations),
            "high_value_transactions": len(high_value_transactions),
            "users_with_sod_violations": sod_violations,
            "compliance_score": max(0, 100 - (unauthorized_attempts * 5) - (len(sod_violations) * 10)),
            "generated_at": datetime.utcnow().isoformat()
        }

        logger.info(f"Generated {compliance_standard} compliance report for {start_date} to {end_date}")
        return {"status": "success", "report": report}

    except Exception as exc:
        logger.error(f"Error generating compliance report: {str(exc)}")
        raise
    finally:
        db.close()
