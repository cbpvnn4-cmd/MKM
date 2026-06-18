"""add order_type to sales orders

Revision ID: f2b4c6d8e9a1
Revises: a1b2c3d4e5f6
Create Date: 2025-10-23 13:15:00.000000+00:00

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy import inspect


# revision identifiers, used by Alembic.
revision = 'f2b4c6d8e9a1'
down_revision = 'a1b2c3d4e5f6'
branch_labels = None
depends_on = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = inspect(bind)
    existing_columns = {col["name"] for col in inspector.get_columns('sales_orders')}

    if 'order_type' not in existing_columns:
        op.add_column(
            'sales_orders',
            sa.Column('order_type', sa.String(length=20), nullable=True, server_default='items')
        )
    op.execute("UPDATE sales_orders SET order_type='items' WHERE order_type IS NULL")
    # SQLite doesn't support altering column nullability easily; rely on application defaults.
    # Preserve the server default for future inserts and enforce valid values at the application layer.


def downgrade() -> None:
    op.drop_column('sales_orders', 'order_type')
