#!/usr/bin/env python3
"""
Elevator Management System - SQLite to PostgreSQL Migration Script

This script migrates data from SQLite to PostgreSQL in Docker.
Run this AFTER starting the containers but BEFORE accessing the application.

Usage:
    1. Start Docker: docker-compose up -d
    2. Wait for database to be healthy: docker ps
    3. Run migration: python migrate_to_postgres.py
    4. Restart backend: docker-compose restart backend
"""

import os
import sys
from pathlib import Path

# Add backend to path
sys.path.insert(0, str(Path(__file__).parent))

from sqlalchemy import create_engine, text, inspect
from sqlalchemy.orm import sessionmaker

# Source: SQLite database
SQLITE_DB = Path(__file__).parent / "elevator_management.db"
SQLITE_URL = f"sqlite:///{SQLITE_DB}"

# Target: PostgreSQL in Docker
POSTGRES_URL = os.getenv(
    "DATABASE_URL",
    "postgresql://postgres:StrongP@ssw0rd!2025@localhost:5432/elevator_management"
)

def print_header(text: str):
    """Print a formatted header"""
    print("\n" + "=" * 60)
    print(f"  {text}")
    print("=" * 60)

def print_success(text: str):
    """Print success message"""
    print(f"✓ {text}")

def print_error(text: str):
    """Print error message"""
    print(f"✗ {text}")

def print_info(text: str):
    """Print info message"""
    print(f"  {text}")

def check_sqlite_exists() -> bool:
    """Check if SQLite database exists"""
    if not SQLITE_DB.exists():
        print_error(f"SQLite database not found: {SQLITE_DB}")
        return False
    print_success(f"Found SQLite database: {SQLITE_DB} ({SQLITE_DB.stat().st_size:,} bytes)")
    return True

def check_postgres_connection(engine) -> bool:
    """Check if PostgreSQL is accessible"""
    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        print_success("PostgreSQL connection successful")
        return True
    except Exception as e:
        print_error(f"Cannot connect to PostgreSQL: {e}")
        print_info("Make sure Docker is running: docker-compose up -d")
        return False

def get_table_data(source_engine, table_name: str) -> list:
    """Get all data from a table"""
    with source_engine.connect() as conn:
        result = conn.execute(text(f"SELECT * FROM {table_name}"))
        columns = list(result.keys())
        rows = result.fetchall()
        return columns, rows

def migrate_table(source_engine, target_engine, table_name: str) -> bool:
    """Migrate a single table"""
    try:
        # Get data from SQLite
        columns, rows = get_table_data(source_engine, table_name)

        if not rows:
            print_info(f"  Table '{table_name}': No data to migrate")
            return True

        # Prepare column names
        col_names = ", ".join(columns)
        placeholders = ", ".join([f":{i}" for i in range(len(columns))])

        # Insert into PostgreSQL
        with target_engine.begin() as conn:
            # Convert rows to dict format for SQLAlchemy
            for row in rows:
                row_dict = dict(zip(columns, row))
                conn.execute(
                    text(f"INSERT INTO {table_name} ({col_names}) VALUES ({placeholders})"),
                    row_dict
                )

        print_success(f"  Table '{table_name}': {len(rows)} rows migrated")
        return True

    except Exception as e:
        print_error(f"  Table '{table_name}': Failed - {e}")
        return False

def main():
    print_header("ELEVATOR MANAGEMENT SYSTEM - MIGRATION")

    # Step 1: Check SQLite
    print("\n[1/5] Checking SQLite database...")
    if not check_sqlite_exists():
        return 1

    # Step 2: Connect to databases
    print("\n[2/5] Connecting to databases...")
    try:
        sqlite_engine = create_engine(SQLITE_URL, connect_args={"check_same_thread": False})
        print_success("SQLite connection established")
    except Exception as e:
        print_error(f"SQLite connection failed: {e}")
        return 1

    try:
        postgres_engine = create_engine(POSTGRES_URL)
        if not check_postgres_connection(postgres_engine):
            return 1
    except Exception as e:
        print_error(f"PostgreSQL connection failed: {e}")
        return 1

    # Step 3: Get tables
    print("\n[3/5] Discovering tables...")
    try:
        inspector = inspect(sqlite_engine)
        tables = inspector.get_table_names()

        if not tables:
            print_error("No tables found in SQLite database")
            return 1

        print_success(f"Found {len(tables)} tables: {', '.join(tables)}")
    except Exception as e:
        print_error(f"Failed to get tables: {e}")
        return 1

    # Step 4: Migrate data
    print("\n[4/5] Migrating data...")
    print_info("Starting data transfer...")

    success_count = 0
    failed_tables = []

    for table in sorted(tables):
        if migrate_table(sqlite_engine, postgres_engine, table):
            success_count += 1
        else:
            failed_tables.append(table)

    # Step 5: Summary
    print("\n[5/5] Migration Summary")
    print_header("")

    print(f"Tables processed: {len(tables)}")
    print_success(f"Successful: {success_count}")

    if failed_tables:
        print_error(f"Failed: {len(failed_tables)}")
        for table in failed_tables:
            print_error(f"  - {table}")
        print("\n⚠️  Some tables failed to migrate. Please check the errors above.")
        return 1
    else:
        print("\n" + "🎉 " * 15)
        print("\n   MIGRATION COMPLETED SUCCESSFULLY!")
        print("\n   Next steps:")
        print("   1. Restart backend: docker-compose restart backend")
        print("   2. Access application at http://localhost:3001")
        print("\n" + "🎉 " * 15 + "\n")
        return 0

if __name__ == "__main__":
    sys.exit(main())
