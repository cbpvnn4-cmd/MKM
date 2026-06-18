#!/bin/bash

# Cleanup Script for Elevator Company Management System
# This script cleans up old logs, temporary files, and manages disk space

set -e

# Configuration from environment variables
RETENTION_DAYS=${RETENTION_DAYS:-30}
LOG_RETENTION_DAYS=${LOG_RETENTION_DAYS:-7}
BACKUP_DIR="/backups"
LOG_DIR="/app/logs"

# Logging function
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1"
}

# Clean up old backup files
cleanup_backups() {
    log "Cleaning up backup files older than $RETENTION_DAYS days..."

    local deleted_count=0
    local total_size=0

    # Find and process old backup files
    while IFS= read -r -d '' backup_file; do
        local file_size=$(stat -c%s "$backup_file" 2>/dev/null || echo 0)
        total_size=$((total_size + file_size))
        rm -f "$backup_file"
        deleted_count=$((deleted_count + 1))
        log "Deleted old backup: $(basename "$backup_file")"
    done < <(find "$BACKUP_DIR" -name "elevator_backup_*.sql.gz" -type f -mtime +$RETENTION_DAYS -print0)

    if [ $deleted_count -gt 0 ]; then
        log "Cleaned up $deleted_count backup files, freed $(numfmt --to=iec $total_size)"
    else
        log "No old backup files to clean up"
    fi

    # Clean up old metadata files
    find "$BACKUP_DIR" -name "backup_*.json" -type f -mtime +$RETENTION_DAYS -delete
}

# Clean up log files
cleanup_logs() {
    log "Cleaning up log files older than $LOG_RETENTION_DAYS days..."

    if [ -d "$LOG_DIR" ]; then
        # Compress old log files before deletion
        find "$LOG_DIR" -name "*.log" -type f -mtime +3 -not -name "*.gz" -exec gzip {} \;

        # Delete very old compressed logs
        local deleted_count=$(find "$LOG_DIR" -name "*.log.gz" -type f -mtime +$LOG_RETENTION_DAYS -delete -print | wc -l)

        if [ $deleted_count -gt 0 ]; then
            log "Cleaned up $deleted_count old log files"
        else
            log "No old log files to clean up"
        fi
    else
        log "Log directory not found: $LOG_DIR"
    fi
}

# Clean up temporary files
cleanup_temp_files() {
    log "Cleaning up temporary files..."

    # Clean up /tmp
    find /tmp -type f -atime +1 -delete 2>/dev/null || true

    # Clean up application temp files
    if [ -d "/app/temp" ]; then
        find /app/temp -type f -mtime +1 -delete 2>/dev/null || true
    fi

    log "Temporary files cleanup completed"
}

# Check disk space
check_disk_space() {
    log "Checking disk space..."

    # Get disk usage for backup directory
    local backup_usage=$(df -h "$BACKUP_DIR" | awk 'NR==2 {print $5}' | sed 's/%//')
    local backup_available=$(df -h "$BACKUP_DIR" | awk 'NR==2 {print $4}')

    log "Backup directory usage: ${backup_usage}% (${backup_available} available)"

    # Alert if usage is high
    if [ "$backup_usage" -gt 85 ]; then
        log "WARNING: Backup directory is ${backup_usage}% full"
        return 1
    fi

    return 0
}

# Optimize database (if accessible)
optimize_database() {
    if [ -n "$DB_HOST" ] && [ -n "$DB_USER" ] && [ -n "$DB_PASSWORD" ] && [ -n "$DB_NAME" ]; then
        log "Running database maintenance..."

        # Vacuum and analyze database
        PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -U $DB_USER -d $DB_NAME -c "VACUUM ANALYZE;" || \
            log "Warning: Failed to vacuum database"

        log "Database maintenance completed"
    else
        log "Database credentials not available, skipping database optimization"
    fi
}

# Clean up Docker resources
cleanup_docker() {
    log "Cleaning up Docker resources..."

    # Remove unused images
    docker image prune -f || log "Warning: Failed to prune Docker images"

    # Remove unused volumes
    docker volume prune -f || log "Warning: Failed to prune Docker volumes"

    # Remove unused networks
    docker network prune -f || log "Warning: Failed to prune Docker networks"

    log "Docker cleanup completed"
}

# Generate cleanup report
generate_report() {
    local backup_count=$(find "$BACKUP_DIR" -name "elevator_backup_*.sql.gz" -type f | wc -l)
    local backup_size=$(du -sh "$BACKUP_DIR" 2>/dev/null | cut -f1 || echo "Unknown")
    local log_size=$(du -sh "$LOG_DIR" 2>/dev/null | cut -f1 || echo "Unknown")

    echo "Cleanup Report:
    - Backup files remaining: $backup_count
    - Backup directory size: $backup_size
    - Log directory size: $log_size
    - Cleanup completed: $(date)
    - Retention policy: $RETENTION_DAYS days (backups), $LOG_RETENTION_DAYS days (logs)"
}

# Main cleanup process
main() {
    log "=== Starting system cleanup process ==="

    # Execute cleanup steps
    cleanup_backups
    cleanup_logs
    cleanup_temp_files

    # Check if we have Docker access
    if command -v docker >/dev/null 2>&1; then
        cleanup_docker
    else
        log "Docker not available, skipping Docker cleanup"
    fi

    optimize_database

    # Check disk space after cleanup
    if ! check_disk_space; then
        log "WARNING: Disk space is still high after cleanup"
    fi

    # Generate report
    local report=$(generate_report)
    log "$report"
    echo "$report"

    log "=== System cleanup completed ==="
}

# Run main function
main "$@"