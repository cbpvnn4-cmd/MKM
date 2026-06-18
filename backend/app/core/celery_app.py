from celery import Celery
from app.core.config import settings
import os

def create_celery_app() -> Celery:
    celery_app = Celery("elevator_management")

    # Configure Celery
    celery_app.conf.update(
        broker_url=settings.REDIS_URL,
        result_backend=settings.REDIS_URL,
        task_serializer='json',
        accept_content=['json'],
        result_serializer='json',
        timezone='Asia/Riyadh',
        enable_utc=True,

        # Task routing
        task_routes={
            'app.tasks.notifications.*': {'queue': 'notifications'},
            'app.tasks.reports.*': {'queue': 'reports'},
            'app.tasks.backups.*': {'queue': 'backups'},
            'app.tasks.audit.*': {'queue': 'audit'},
            'app.tasks.files.*': {'queue': 'files'},
        },

        # Queue configuration
        task_default_queue='default',
        task_create_missing_queues=True,

        # Worker configuration
        worker_prefetch_multiplier=1,
        task_acks_late=True,
        worker_max_tasks_per_child=1000,

        # Task execution
        task_soft_time_limit=300,  # 5 minutes
        task_time_limit=600,       # 10 minutes
        task_reject_on_worker_lost=True,

        # Result backend settings
        result_expires=3600,  # 1 hour

        # Error handling
        task_reject_on_worker_lost=True,
        task_ignore_result=False,

        # Monitoring
        worker_send_task_events=True,
        task_send_sent_event=True,

        # Beat schedule for periodic tasks
        beat_schedule={
            'generate-daily-reports': {
                'task': 'app.tasks.reports.generate_daily_reports',
                'schedule': 60.0 * 60.0 * 24.0,  # Daily at midnight
                'options': {'queue': 'reports'}
            },
            'process-profit-distributions': {
                'task': 'app.tasks.notifications.process_profit_distributions',
                'schedule': 60.0 * 60.0,  # Every hour
                'options': {'queue': 'notifications'}
            },
            'cleanup-old-files': {
                'task': 'app.tasks.files.cleanup_old_files',
                'schedule': 60.0 * 60.0 * 24.0,  # Daily
                'options': {'queue': 'files'}
            },
            'audit-log-summary': {
                'task': 'app.tasks.audit.generate_audit_summary',
                'schedule': 60.0 * 60.0 * 6.0,  # Every 6 hours
                'options': {'queue': 'audit'}
            },
            'backup-database': {
                'task': 'app.tasks.backups.backup_database',
                'schedule': 60.0 * 60.0 * 24.0,  # Daily
                'options': {'queue': 'backups'}
            },
        },
    )

    # Import task modules
    celery_app.autodiscover_tasks([
        'app.tasks.notifications',
        'app.tasks.reports',
        'app.tasks.files',
        'app.tasks.audit',
        'app.tasks.backups'
    ])

    return celery_app

celery_app = create_celery_app()
