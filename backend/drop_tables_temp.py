import sqlite3

# Connect to database
conn = sqlite3.connect('app.db')
cursor = conn.cursor()

try:
    # Drop the partially created tables
    cursor.execute("DROP TABLE IF EXISTS beneficiary_distribution_decisions")
    cursor.execute("DROP TABLE IF EXISTS company_share_beneficiaries")
    conn.commit()
    print("Tables dropped successfully")
except Exception as e:
    print(f"Error: {e}")
    conn.rollback()
finally:
    conn.close()
