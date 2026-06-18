#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Fix autoincrement issue for purchase_order_installments and purchase_order_containers tables
"""
import sqlite3
import os
import sys

# Fix encoding for Windows console
if sys.platform == 'win32':
    import codecs
    sys.stdout = codecs.getwriter('utf-8')(sys.stdout.buffer, 'strict')
    sys.stderr = codecs.getwriter('utf-8')(sys.stderr.buffer, 'strict')

# Database path
db_path = os.path.join(os.path.dirname(__file__), "elevator_management.db")

# Connect to database
conn = sqlite3.connect(db_path)
cursor = conn.cursor()

try:
    print("Fixing purchase_order_installments table...")

    # Drop temporary table if exists from previous failed attempt
    cursor.execute("DROP TABLE IF EXISTS purchase_order_installments_new")
    cursor.execute("DROP TABLE IF EXISTS purchase_order_containers_new")

    # Check if table exists and has data
    cursor.execute("SELECT COUNT(*) FROM purchase_order_installments")
    count = cursor.fetchone()[0]
    print(f"Found {count} rows in purchase_order_installments")

    # Create new table with proper INTEGER PRIMARY KEY AUTOINCREMENT
    cursor.execute("""
        CREATE TABLE purchase_order_installments_new (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            purchase_order_id BIGINT NOT NULL,
            name VARCHAR(100) NOT NULL,
            type VARCHAR(20) DEFAULT 'regular',
            percentage NUMERIC(5, 2) NOT NULL,
            amount_usd NUMERIC(18, 2) NOT NULL,
            paid_amount_usd NUMERIC(18, 2) DEFAULT 0 NOT NULL,
            due_date DATE NOT NULL,
            status VARCHAR(20) DEFAULT 'pending',
            notes TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
            created_by INTEGER,
            updated_by INTEGER,
            FOREIGN KEY (purchase_order_id) REFERENCES purchase_orders(id) ON DELETE CASCADE,
            CHECK (percentage >= 0 AND percentage <= 100),
            CHECK (amount_usd >= 0),
            CHECK (status IN ('pending', 'partial', 'paid', 'overdue'))
        )
    """)

    # Copy data if exists
    if count > 0:
        cursor.execute("""
            INSERT INTO purchase_order_installments_new
            (id, purchase_order_id, name, type, percentage, amount_usd, paid_amount_usd,
             due_date, status, notes, created_at, updated_at, created_by, updated_by)
            SELECT id, purchase_order_id, name, type, percentage, amount_usd, paid_amount_usd,
                   due_date, status, notes,
                   COALESCE(created_at, CURRENT_TIMESTAMP),
                   COALESCE(updated_at, CURRENT_TIMESTAMP),
                   created_by, updated_by
            FROM purchase_order_installments
        """)
        print(f"Copied {count} rows to new table")

    # Drop old table
    cursor.execute("DROP TABLE purchase_order_installments")

    # Rename new table
    cursor.execute("ALTER TABLE purchase_order_installments_new RENAME TO purchase_order_installments")

    print("✓ purchase_order_installments table fixed")

    print("\nFixing purchase_order_containers table...")

    # Check if table exists and has data
    cursor.execute("SELECT COUNT(*) FROM purchase_order_containers")
    count = cursor.fetchone()[0]
    print(f"Found {count} rows in purchase_order_containers")

    # Create new table with proper INTEGER PRIMARY KEY AUTOINCREMENT
    cursor.execute("""
        CREATE TABLE purchase_order_containers_new (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            purchase_order_id BIGINT NOT NULL,
            container_no VARCHAR(50),
            size VARCHAR(20),
            weight FLOAT,
            shipping_cost NUMERIC(18, 2),
            total_cost NUMERIC(18, 2),
            notes TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
            created_by INTEGER,
            updated_by INTEGER,
            FOREIGN KEY (purchase_order_id) REFERENCES purchase_orders(id) ON DELETE CASCADE
        )
    """)

    # Copy data if exists
    if count > 0:
        cursor.execute("""
            INSERT INTO purchase_order_containers_new
            (id, purchase_order_id, container_no, size, weight, shipping_cost, total_cost,
             notes, created_at, updated_at, created_by, updated_by)
            SELECT id, purchase_order_id, container_no, size, weight, shipping_cost, total_cost,
                   notes,
                   COALESCE(created_at, CURRENT_TIMESTAMP),
                   COALESCE(updated_at, CURRENT_TIMESTAMP),
                   created_by, updated_by
            FROM purchase_order_containers
        """)
        print(f"Copied {count} rows to new table")

    # Drop old table
    cursor.execute("DROP TABLE purchase_order_containers")

    # Rename new table
    cursor.execute("ALTER TABLE purchase_order_containers_new RENAME TO purchase_order_containers")

    print("✓ purchase_order_containers table fixed")

    # Commit changes
    conn.commit()
    print("\n✅ All tables fixed successfully!")

except Exception as e:
    print(f"\nError: {e}")
    conn.rollback()

finally:
    conn.close()
