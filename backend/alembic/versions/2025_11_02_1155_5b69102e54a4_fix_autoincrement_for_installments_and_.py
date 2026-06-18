"""fix_autoincrement_for_installments_and_containers

Revision ID: 5b69102e54a4
Revises: a66ccd355c06
Create Date: 2025-11-02 11:55:21.807713+00:00

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '5b69102e54a4'
down_revision = 'a66ccd355c06'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Fix for SQLite: Recreate tables with proper INTEGER PRIMARY KEY AUTOINCREMENT
    # This is necessary because SQLite doesn't support BIGINT with autoincrement properly

    # Store the connection
    conn = op.get_bind()

    # For purchase_order_installments table
    # 1. Create new table with correct schema
    op.execute("""
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

    # 2. Copy data from old table (if exists and has data)
    op.execute("""
        INSERT INTO purchase_order_installments_new
        (id, purchase_order_id, name, type, percentage, amount_usd, paid_amount_usd,
         due_date, status, notes, created_at, updated_at, created_by, updated_by)
        SELECT id, purchase_order_id, name, type, percentage, amount_usd, paid_amount_usd,
               due_date, status, notes,
               COALESCE(created_at, CURRENT_TIMESTAMP),
               COALESCE(updated_at, CURRENT_TIMESTAMP),
               created_by, updated_by
        FROM purchase_order_installments
        WHERE id IS NOT NULL
    """)

    # 3. Drop old table
    op.execute("DROP TABLE purchase_order_installments")

    # 4. Rename new table
    op.execute("ALTER TABLE purchase_order_installments_new RENAME TO purchase_order_installments")

    # For purchase_order_containers table
    # 1. Create new table with correct schema
    op.execute("""
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

    # 2. Copy data from old table (if exists and has data)
    op.execute("""
        INSERT INTO purchase_order_containers_new
        (id, purchase_order_id, container_no, size, weight, shipping_cost, total_cost,
         notes, created_at, updated_at, created_by, updated_by)
        SELECT id, purchase_order_id, container_no, size, weight, shipping_cost, total_cost,
               notes,
               COALESCE(created_at, CURRENT_TIMESTAMP),
               COALESCE(updated_at, CURRENT_TIMESTAMP),
               created_by, updated_by
        FROM purchase_order_containers
        WHERE id IS NOT NULL
    """)

    # 3. Drop old table
    op.execute("DROP TABLE purchase_order_containers")

    # 4. Rename new table
    op.execute("ALTER TABLE purchase_order_containers_new RENAME TO purchase_order_containers")


def downgrade() -> None:
    # Downgrade would recreate tables with BIGINT
    # This is complex for SQLite, so we'll skip it
    pass