import sqlite3

# Connect to database
conn = sqlite3.connect('elevator_management.db')
cursor = conn.cursor()

try:
    # Check tables exist
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name LIKE '%beneficiar%'")
    tables = cursor.fetchall()
    print("Tables found:")
    for table in tables:
        print(f"  - {table[0]}")

    # Check beneficiaries data
    cursor.execute("SELECT id, name, percentage, is_active FROM company_share_beneficiaries")
    beneficiaries = cursor.fetchall()
    print("\nBeneficiaries data:")
    for b in beneficiaries:
        print(f"  ID: {b[0]}, Name: {b[1]}, Percentage: {b[2]}%, Active: {b[3]}")

    # Check table structure
    cursor.execute("PRAGMA table_info(company_share_beneficiaries)")
    columns = cursor.fetchall()
    print("\ncompany_share_beneficiaries columns:")
    for col in columns:
        print(f"  {col[1]} - {col[2]}")

except Exception as e:
    print(f"Error: {e}")
finally:
    conn.close()
