"""
Fix purchase_order_containers table to have AUTOINCREMENT on id column
"""
import sqlite3
import os

# Database path
db_path = os.path.join(os.path.dirname(__file__), 'elevator_management.db')

print(f"Connecting to database: {db_path}")
conn = sqlite3.connect(db_path)
cursor = conn.cursor()

try:
    # Check if table exists and has data
    cursor.execute("SELECT COUNT(*) FROM purchase_order_containers")
    count = cursor.fetchone()[0]
    print(f"Found {count} existing records in purchase_order_containers")

    # Backup existing data
    if count > 0:
        cursor.execute("SELECT * FROM purchase_order_containers")
        existing_data = cursor.fetchall()
        print(f"Backing up {len(existing_data)} records")
    else:
        existing_data = []

    # Drop the existing table
    print("Dropping existing table...")
    cursor.execute("DROP TABLE IF EXISTS purchase_order_containers")

    # Recreate table with AUTOINCREMENT
    print("Creating new table with AUTOINCREMENT...")
    cursor.execute("""
        CREATE TABLE purchase_order_containers (
            id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
            purchase_order_id BIGINT NOT NULL,
            container_no VARCHAR(50),
            size VARCHAR(20),
            weight FLOAT,
            shipping_cost NUMERIC(18, 2),
            total_cost NUMERIC(18, 2),
            notes TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP NOT NULL,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP NOT NULL,
            created_by INTEGER,
            updated_by INTEGER,
            FOREIGN KEY(purchase_order_id) REFERENCES purchase_orders (id) ON DELETE CASCADE
        )
    """)

    # Restore data if any
    if existing_data:
        print(f"Restoring {len(existing_data)} records...")
        cursor.executemany("""
            INSERT INTO purchase_order_containers
            (purchase_order_id, container_no, size, weight, shipping_cost, total_cost, notes,
             id, created_at, updated_at, created_by, updated_by)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, existing_data)

    conn.commit()
    print("✅ Table fixed successfully!")

    # Verify the fix
    cursor.execute("SELECT sql FROM sqlite_master WHERE name='purchase_order_containers'")
    schema = cursor.fetchone()[0]
    print("\nNew schema:")
    print(schema)

except Exception as e:
    print(f"❌ Error: {e}")
    conn.rollback()
finally:
    conn.close()
    print("\nDatabase connection closed.")
