#!/bin/bash

# Database Backup Script for Elevator Company Management System
# This script creates automated backups with retention and cloud storage

set -e

# Configuration from environment variables
DB_HOST=${DB_HOST:-db}
DB_NAME=${DB_NAME:-elevator_production}
DB_USER=${DB_USER:-elevator_user}
DB_PASSWORD=${DB_PASSWORD}
BACKUP_RETENTION_DAYS=${BACKUP_RETENTION_DAYS:-30}
S3_BUCKET=${S3_BUCKET}
SLACK_WEBHOOK_URL=${SLACK_WEBHOOK_URL}

# Backup directory
BACKUP_DIR="/backups"
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="elevator_backup_${DATE}.sql.gz"
FULL_BACKUP_PATH="${BACKUP_DIR}/${BACKUP_FILE}"

# Logging function
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a ${BACKUP_DIR}/backup.log
}

# Error handling
error_exit() {
    log "ERROR: $1"
    send_notification "❌ Backup Failed" "$1" "danger"
    exit 1
}

# Success notification
success_notification() {
    log "SUCCESS: $1"
    send_notification "✅ Backup Successful" "$1" "good"
}

# Send notification to Slack
send_notification() {
    local title="$1"
    local message="$2"
    local color="$3"

    if [ -n "$SLACK_WEBHOOK_URL" ]; then
        curl -X POST -H 'Content-type: application/json' \
            --data "{
                \"attachments\": [{
                    \"color\": \"$color\",
                    \"title\": \"$title\",
                    \"text\": \"$message\",
                    \"footer\": \"Elevator Management System\",
                    \"ts\": $(date +%s)
                }]
            }" \
            $SLACK_WEBHOOK_URL || log "Warning: Failed to send Slack notification"
    fi
}

# Verify database connectivity
verify_database() {
    log "Verifying database connectivity..."
    PGPASSWORD=$DB_PASSWORD pg_isready -h $DB_HOST -U $DB_USER -d $DB_NAME || \
        error_exit "Cannot connect to database $DB_NAME at $DB_HOST"
}

# Create database backup
create_backup() {
    log "Starting database backup for $DB_NAME..."

    # Create backup with compression
    PGPASSWORD=$DB_PASSWORD pg_dump \
        -h $DB_HOST \
        -U $DB_USER \
        -d $DB_NAME \
        --verbose \
        --no-owner \
        --no-privileges \
        --clean \
        --if-exists \
        --format=custom \
        --compress=9 | gzip > $FULL_BACKUP_PATH

    if [ $? -eq 0 ]; then
        log "Database backup created successfully: $BACKUP_FILE"

        # Create a symlink to latest backup
        ln -sf $BACKUP_FILE ${BACKUP_DIR}/latest.backup

        # Get backup size
        BACKUP_SIZE=$(du -h $FULL_BACKUP_PATH | cut -f1)
        log "Backup size: $BACKUP_SIZE"

        return 0
    else
        error_exit "Failed to create database backup"
    fi
}

# Upload backup to S3
upload_to_s3() {
    if [ -n "$S3_BUCKET" ]; then
        log "Uploading backup to S3 bucket: $S3_BUCKET"

        aws s3 cp $FULL_BACKUP_PATH s3://$S3_BUCKET/database-backups/ \
            --storage-class STANDARD_IA \
            --metadata "system=elevator-management,date=$DATE" || \
            error_exit "Failed to upload backup to S3"

        log "Backup uploaded to S3 successfully"
    else
        log "S3_BUCKET not configured, skipping cloud upload"
    fi
}

# Clean up old backups
cleanup_old_backups() {
    log "Cleaning up backups older than $BACKUP_RETENTION_DAYS days..."

    # Local cleanup
    find $BACKUP_DIR -name "elevator_backup_*.sql.gz" -type f -mtime +$BACKUP_RETENTION_DAYS -delete || \
        log "Warning: Failed to clean up some local backup files"

    # S3 cleanup (if configured)
    if [ -n "$S3_BUCKET" ]; then
        local retention_date=$(date -d "$BACKUP_RETENTION_DAYS days ago" +%Y%m%d)
        aws s3api list-objects-v2 \
            --bucket $S3_BUCKET \
            --prefix "database-backups/elevator_backup_" \
            --query "Contents[?LastModified<='${retention_date}T00:00:00.000Z'].Key" \
            --output text | xargs -I {} aws s3 rm s3://$S3_BUCKET/{} || \
            log "Warning: Failed to clean up some S3 backup files"
    fi

    log "Backup cleanup completed"
}

# Verify backup integrity
verify_backup() {
    log "Verifying backup integrity..."

    # Test that the backup file can be read
    if gzip -t $FULL_BACKUP_PATH; then
        log "Backup file integrity verified"
    else
        error_exit "Backup file is corrupted"
    fi
}

# Create backup metadata
create_metadata() {
    local metadata_file="${BACKUP_DIR}/backup_${DATE}.json"

    cat > $metadata_file << EOF
{
    "backup_date": "$(date -Iseconds)",
    "database_name": "$DB_NAME",
    "database_host": "$DB_HOST",
    "backup_file": "$BACKUP_FILE",
    "backup_size": "$(stat -f%z $FULL_BACKUP_PATH 2>/dev/null || stat -c%s $FULL_BACKUP_PATH)",
    "backup_path": "$FULL_BACKUP_PATH",
    "retention_days": $BACKUP_RETENTION_DAYS,
    "s3_bucket": "${S3_BUCKET:-null}",
    "system": "elevator-management"
}
EOF

    log "Backup metadata created: $metadata_file"
}

# Generate backup report
generate_report() {
    local backup_count=$(find $BACKUP_DIR -name "elevator_backup_*.sql.gz" -type f | wc -l)
    local total_size=$(du -sh $BACKUP_DIR | cut -f1)

    local report="Backup Report:
    - Database: $DB_NAME
    - Backup File: $BACKUP_FILE
    - Backup Size: $(du -h $FULL_BACKUP_PATH | cut -f1)
    - Total Backups: $backup_count
    - Total Storage Used: $total_size
    - Retention Period: $BACKUP_RETENTION_DAYS days"

    log "$report"
    echo "$report"
}

# Main backup process
main() {
    log "=== Starting automated backup process ==="

    # Check required environment variables
    if [ -z "$DB_PASSWORD" ]; then
        error_exit "DB_PASSWORD environment variable is required"
    fi

    # Execute backup steps
    verify_database
    create_backup
    verify_backup
    create_metadata
    upload_to_s3
    cleanup_old_backups

    # Generate and send success report
    local report=$(generate_report)
    success_notification "$report"

    log "=== Backup process completed successfully ==="
}

# Run main function
main "$@"