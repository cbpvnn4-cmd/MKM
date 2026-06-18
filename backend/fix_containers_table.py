"""
Fix purchase_order_containers table to have AUTOINCREMENT on id column
"""
import sqlite3
import os

# Database path - in the backend directory
db_path = os.path.join(os.path.dirname(__file__), 'elevator_management.db')

print(f"Connecting to database: {db_path}")
print(f"Database exists: {os.path.exists(db_path)}")

conn = sqlite3.connect(db_path)
cursor = conn.cursor()

try:
    # Check if table exists and has data
    cursor.execute("SELECT COUNT(*) FROM purchase_order_containers")
    count = cursor.fetchone()[0]
    print(f"\nFound {count} existing records in purchase_order_containers")

    # Backup existing data
    if count > 0:
        cursor.execute("SELECT * FROM purchase_order_containers")
        existing_data = cursor.fetchall()
        print(f"Backing up {len(existing_data)} records")
    else:
        existing_data = []

    # Drop the existing table
    print("\nDropping existing table...")
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

    # Restore data if any (with proper column order)
    if existing_data:
        print(f"Restoring {len(existing_data)} records...")
        # Existing data order: id, purchase_order_id, container_no, size, weight, shipping_cost, total_cost, notes, created_at, updated_at, created_by, updated_by
        cursor.executemany("""
            INSERT INTO purchase_order_containers
            (id, purchase_order_id, container_no, size, weight, shipping_cost, total_cost, notes,
             created_at, updated_at, created_by, updated_by)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, existing_data)

    conn.commit()
    print("\nSUCCESS! Table fixed successfully!")

    # Verify the fix
    cursor.execute("SELECT sql FROM sqlite_master WHERE name='purchase_order_containers'")
    schema = cursor.fetchone()[0]
    print("\nNew schema:")
    print(schema)

    # Verify AUTOINCREMENT is working
    print("\n" + "="*60)
    print("Verification Test:")
    print("="*60)

    # Get a PO to test with
    cursor.execute("SELECT id FROM purchase_orders LIMIT 1")
    po = cursor.fetchone()

    if po:
        from datetime import datetime
        now = datetime.now().isoformat()

        # Try inserting without specifying id
        cursor.execute("""
            INSERT INTO purchase_order_containers
            (purchase_order_id, container_no, size, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?)
        """, (po[0], "TEST-VERIFY", "20ft", now, now))

        conn.commit()

        # Check if it got an auto-generated ID
        cursor.execute("SELECT id, container_no FROM purchase_order_containers WHERE container_no = 'TEST-VERIFY'")
        test_row = cursor.fetchone()

        if test_row:
            print(f"Test insert successful!")
            print(f"  Auto-generated ID: {test_row[0]}")
            print(f"  Container No: {test_row[1]}")

            # Clean up test data
            cursor.execute("DELETE FROM purchase_order_containers WHERE container_no = 'TEST-VERIFY'")
            conn.commit()
            print(f"\nTest data cleaned up.")
        else:
            print("Warning: Test insert failed!")

    print("\n" + "="*60)
    print("AUTOINCREMENT FIX COMPLETE!")
    print("="*60)

except Exception as e:
    print(f"\nERROR: {e}")
    import traceback
    traceback.print_exc()
    conn.rollback()
finally:
    conn.close()
    print("\nDatabase connection closed.")
