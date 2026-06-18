"""add_elevator_components_to_sales_order_items

Revision ID: 40911042241a
Revises: 001
Create Date: 2025-10-01 07:40:36.523153+00:00

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '40911042241a'
down_revision = '001'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add elevator component columns to sales_order_items table
    op.add_column('sales_order_items', sa.Column('sections', sa.Integer(), nullable=True, server_default='0'))
    op.add_column('sales_order_items', sa.Column('ropes', sa.Integer(), nullable=True, server_default='0'))
    op.add_column('sales_order_items', sa.Column('cable_meters', sa.Numeric(precision=18, scale=2), nullable=True, server_default='0'))
    op.add_column('sales_order_items', sa.Column('cabins', sa.Integer(), nullable=True, server_default='1'))
    op.add_column('sales_order_items', sa.Column('doors', sa.Integer(), nullable=True, server_default='0'))


def downgrade() -> None:
    # Remove elevator component columns from sales_order_items table
    op.drop_column('sales_order_items', 'doors')
    op.drop_column('sales_order_items', 'cabins')
    op.drop_column('sales_order_items', 'cable_meters')
    op.drop_column('sales_order_items', 'ropes')
    op.drop_column('sales_order_items', 'sections')