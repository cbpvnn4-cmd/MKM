import sqlite3
from datetime import datetime

# Connect to database
conn = sqlite3.connect('elevator_management.db')
cursor = conn.cursor()

try:
    # Drop tables if they exist
    cursor.execute("DROP TABLE IF EXISTS beneficiary_distribution_decisions")
    cursor.execute("DROP TABLE IF EXISTS company_share_beneficiaries")

    # Create company_share_beneficiaries table
    cursor.execute("""
        CREATE TABLE company_share_beneficiaries (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            created_by INTEGER,
            updated_by INTEGER,
            name VARCHAR(100) NOT NULL,
            percentage NUMERIC(5, 2) NOT NULL,
            is_active BOOLEAN NOT NULL DEFAULT 1,
            notes TEXT,
            CHECK (percentage > 0 AND percentage <= 100)
        )
    """)

    # Create beneficiary_distribution_decisions table
    cursor.execute("""
        CREATE TABLE beneficiary_distribution_decisions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            created_by INTEGER,
            updated_by INTEGER,
            profit_run_id BIGINT NOT NULL,
            beneficiary_id BIGINT NOT NULL,
            amount_usd NUMERIC(18, 2) NOT NULL,
            decision_type VARCHAR(20) NOT NULL,
            partner_id BIGINT,
            notes TEXT,
            decided_at DATE,
            CHECK (decision_type IN ('CASH', 'CAPITAL')),
            CHECK (amount_usd >= 0),
            FOREIGN KEY (beneficiary_id) REFERENCES company_share_beneficiaries(id) ON DELETE CASCADE,
            FOREIGN KEY (partner_id) REFERENCES partners(id),
            FOREIGN KEY (profit_run_id) REFERENCES profit_runs(id) ON DELETE CASCADE,
            UNIQUE (profit_run_id, beneficiary_id)
        )
    """)

    # Create indexes
    cursor.execute("CREATE INDEX ix_beneficiary_decisions_profit_run ON beneficiary_distribution_decisions(profit_run_id)")
    cursor.execute("CREATE INDEX ix_beneficiary_decisions_beneficiary ON beneficiary_distribution_decisions(beneficiary_id)")

    # Insert default beneficiaries
    cursor.execute("""
        INSERT INTO company_share_beneficiaries (name, percentage, is_active, notes)
        VALUES (?, ?, ?, ?)
    """, ('سمير', 15.00, True, 'مستفيد من نسبة الشركة'))

    cursor.execute("""
        INSERT INTO company_share_beneficiaries (name, percentage, is_active, notes)
        VALUES (?, ?, ?, ?)
    """, ('علي', 15.00, True, 'مستفيد من نسبة الشركة'))

    conn.commit()

    # Verify
    cursor.execute("SELECT id, name, percentage, is_active FROM company_share_beneficiaries")
    beneficiaries = cursor.fetchall()

    print("Tables created successfully!")
    print("\nBeneficiaries:")
    for b in beneficiaries:
        print(f"  ID: {b[0]}, Name: {b[1]}, Percentage: {b[2]}%, Active: {b[3]}")

    # Update alembic version table to mark migration as complete
    cursor.execute("""
        UPDATE alembic_version SET version_num='185679f12796'
        WHERE version_num=(SELECT version_num FROM alembic_version LIMIT 1)
    """)
    conn.commit()
    print("\nMigration marked as complete")

except Exception as e:
    print(f"Error: {e}")
    conn.rollback()
finally:
    conn.close()
