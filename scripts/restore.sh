#!/bin/bash

# Database Restore Script for Elevator Company Management System
# This script restores database from backup files

set -e

# Configuration from environment variables
DB_HOST=${DB_HOST:-db}
DB_NAME=${DB_NAME:-elevator_production}
DB_USER=${DB_USER:-elevator_user}
DB_PASSWORD=${DB_PASSWORD}
BACKUP_DIR="/backups"

# Logging function
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1"
}

# Error handling
error_exit() {
    log "ERROR: $1"
    exit 1
}

# Show usage
usage() {
    echo "Usage: $0 [backup_file|latest]"
    echo ""
    echo "Examples:"
    echo "  $0 elevator_backup_20231201_120000.sql.gz"
    echo "  $0 latest"
    echo ""
    echo "Available backups:"
    ls -la $BACKUP_DIR/elevator_backup_*.sql.gz 2>/dev/null || echo "No backups found"
    exit 1
}

# Verify database connectivity
verify_database() {
    log "Verifying database connectivity..."
    PGPASSWORD=$DB_PASSWORD pg_isready -h $DB_HOST -U $DB_USER -d $DB_NAME || \
        error_exit "Cannot connect to database $DB_NAME at $DB_HOST"
}

# Find backup file
find_backup_file() {
    local backup_input="$1"

    if [ "$backup_input" = "latest" ]; then
        if [ -L "${BACKUP_DIR}/latest.backup" ]; then
            backup_file=$(readlink -f "${BACKUP_DIR}/latest.backup")
        else
            backup_file=$(ls -t ${BACKUP_DIR}/elevator_backup_*.sql.gz 2>/dev/null | head -1)
        fi
    else
        if [ -f "${BACKUP_DIR}/${backup_input}" ]; then
            backup_file="${BACKUP_DIR}/${backup_input}"
        elif [ -f "$backup_input" ]; then
            backup_file="$backup_input"
        else
            error_exit "Backup file not found: $backup_input"
        fi
    fi

    if [ -z "$backup_file" ] || [ ! -f "$backup_file" ]; then
        error_exit "No backup file found"
    fi

    log "Using backup file: $backup_file"
}

# Verify backup integrity
verify_backup() {
    log "Verifying backup integrity..."

    if gzip -t "$backup_file"; then
        log "Backup file integrity verified"
    else
        error_exit "Backup file is corrupted: $backup_file"
    fi
}

# Create database if not exists
ensure_database() {
    log "Ensuring database exists..."

    # Check if database exists
    PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -U $DB_USER -d postgres -c "SELECT 1 FROM pg_database WHERE datname='$DB_NAME'" | grep -q 1 || {
        log "Creating database $DB_NAME..."
        PGPASSWORD=$DB_PASSWORD createdb -h $DB_HOST -U $DB_USER $DB_NAME || \
            error_exit "Failed to create database $DB_NAME"
    }
}

# Backup current database before restore
backup_current() {
    local current_backup="${BACKUP_DIR}/pre_restore_$(date +%Y%m%d_%H%M%S).sql.gz"

    log "Creating backup of current database before restore..."

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
        --compress=9 | gzip > "$current_backup"

    if [ $? -eq 0 ]; then
        log "Current database backed up to: $current_backup"
    else
        log "Warning: Failed to backup current database"
    fi
}

# Restore database
restore_database() {
    log "Starting database restore..."

    # Drop existing connections
    PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -U $DB_USER -d postgres -c "
        SELECT pg_terminate_backend(pid)
        FROM pg_stat_activity
        WHERE datname = '$DB_NAME' AND pid <> pg_backend_pid();" || \
        log "Warning: Could not terminate existing connections"

    # Restore from backup
    log "Restoring database from backup..."

    gunzip -c "$backup_file" | PGPASSWORD=$DB_PASSWORD pg_restore \
        -h $DB_HOST \
        -U $DB_USER \
        -d $DB_NAME \
        --verbose \
        --clean \
        --if-exists \
        --no-owner \
        --no-privileges || \
        error_exit "Failed to restore database from backup"

    log "Database restore completed successfully"
}

# Verify restore
verify_restore() {
    log "Verifying database restore..."

    # Check if we can connect and query
    local table_count=$(PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -U $DB_USER -d $DB_NAME -t -c "
        SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';" | xargs)

    if [ "$table_count" -gt 0 ]; then
        log "Restore verification successful. Found $table_count tables."
    else
        error_exit "Restore verification failed. No tables found."
    fi
}

# Update database permissions and settings
post_restore_setup() {
    log "Running post-restore setup..."

    # Update sequences (in case of ID conflicts)
    PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -U $DB_USER -d $DB_NAME -c "
        DO \$\$
        DECLARE
            seq_record RECORD;
        BEGIN
            FOR seq_record IN
                SELECT schemaname, tablename, columnname, pg_get_serial_sequence(schemaname||'.'||tablename, columnname) as seqname
                FROM (
                    SELECT schemaname, tablename, columnname
                    FROM pg_catalog.pg_statio_all_tables st
                    JOIN information_schema.columns c ON (c.table_schema = st.schemaname AND c.table_name = st.relname)
                    WHERE c.column_default LIKE 'nextval%'
                ) AS t
                WHERE pg_get_serial_sequence(schemaname||'.'||tablename, columnname) IS NOT NULL
            LOOP
                EXECUTE 'SELECT setval(''' || seq_record.seqname || ''', COALESCE((SELECT MAX(' || seq_record.columnname || ') FROM ' || seq_record.schemaname || '.' || seq_record.tablename || '), 1))';
            END LOOP;
        END
        \$\$;" || log "Warning: Failed to update sequences"

    log "Post-restore setup completed"
}

# Generate restore report
generate_report() {
    local backup_date=$(stat -c %y "$backup_file" 2>/dev/null || stat -f %Sm "$backup_file")
    local backup_size=$(du -h "$backup_file" | cut -f1)

    echo "Restore Report:
    - Database: $DB_NAME
    - Backup File: $(basename $backup_file)
    - Backup Date: $backup_date
    - Backup Size: $backup_size
    - Restore Date: $(date)
    - Status: SUCCESS"
}

# Interactive confirmation
confirm_restore() {
    echo "⚠️  WARNING: This will replace the current database with backup data!"
    echo "Database: $DB_NAME"
    echo "Backup file: $(basename $backup_file)"
    echo ""
    read -p "Are you sure you want to continue? (yes/no): " confirm

    if [ "$confirm" != "yes" ]; then
        echo "Restore cancelled."
        exit 0
    fi
}

# Main restore process
main() {
    local backup_input="$1"

    if [ -z "$backup_input" ]; then
        usage
    fi

    log "=== Starting database restore process ==="

    # Check required environment variables
    if [ -z "$DB_PASSWORD" ]; then
        error_exit "DB_PASSWORD environment variable is required"
    fi

    # Execute restore steps
    find_backup_file "$backup_input"
    verify_backup
    confirm_restore
    verify_database
    ensure_database
    backup_current
    restore_database
    verify_restore
    post_restore_setup

    # Generate success report
    local report=$(generate_report)
    log "$report"
    echo "$report"

    log "=== Database restore completed successfully ==="
}

# Run main function
main "$@"