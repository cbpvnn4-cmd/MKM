"""add exchange_rate to sales orders

Revision ID: c4d6e8f9ab12
Revises: f2b4c6d8e9a1
Create Date: 2025-10-30 14:00:00.000000+00:00

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy import inspect


# revision identifiers, used by Alembic.
revision = 'c4d6e8f9ab12'
down_revision = 'f2b4c6d8e9a1'
branch_labels = None
depends_on = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = inspect(bind)
    existing_columns = {col["name"] for col in inspector.get_columns('sales_orders')}

    if 'exchange_rate' not in existing_columns:
        op.add_column(
            'sales_orders',
            sa.Column('exchange_rate', sa.Numeric(precision=18, scale=4), nullable=True)
        )
        op.execute("UPDATE sales_orders SET exchange_rate = 1.0 WHERE exchange_rate IS NULL")


def downgrade() -> None:
    bind = op.get_bind()
    inspector = inspect(bind)
    existing_columns = {col["name"] for col in inspector.get_columns('sales_orders')}

    if 'exchange_rate' in existing_columns:
        op.drop_column('sales_orders', 'exchange_rate')
