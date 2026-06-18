import sqlite3
import os

# Find the right database file
db_file = 'elevator_management.db'

if not os.path.exists(db_file):
    print(f"Database file {db_file} not found!")
    exit(1)

# Connect to database
conn = sqlite3.connect(db_file)
cursor = conn.cursor()

try:
    # Check if tables exist
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name IN ('company_share_beneficiaries', 'beneficiary_distribution_decisions')")
    existing_tables = [row[0] for row in cursor.fetchall()]

    if existing_tables:
        print(f"Found existing tables: {existing_tables}")

        # Drop them
        if 'beneficiary_distribution_decisions' in existing_tables:
            cursor.execute("DROP TABLE beneficiary_distribution_decisions")
            print("Dropped beneficiary_distribution_decisions")

        if 'company_share_beneficiaries' in existing_tables:
            cursor.execute("DROP TABLE company_share_beneficiaries")
            print("Dropped company_share_beneficiaries")

        conn.commit()
        print("Tables dropped successfully")
    else:
        print("No existing tables found - ready for migration")

except Exception as e:
    print(f"Error: {e}")
    conn.rollback()
finally:
    conn.close()
