from app.database.database import engine
from sqlalchemy import text

sql = """
CREATE TABLE IF NOT EXISTS contract_payments (
    id INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    contract_id INTEGER NOT NULL,
    payment_number INTEGER NOT NULL,
    description VARCHAR NOT NULL,
    percentage NUMERIC(5,2),
    amount NUMERIC(18,2) NOT NULL,
    due_date DATE,
    status VARCHAR NOT NULL DEFAULT 'PENDING',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(contract_id) REFERENCES contracts(id) ON DELETE CASCADE,
    CHECK(status IN ('PENDING','PAID','LATE','CANCELLED'))
)
"""

with engine.connect() as conn:
    conn.execute(text(sql))
    conn.commit()

print("Table contract_payments created successfully!")
