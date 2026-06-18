"""add_warehouse_id_to_purchase_orders

Revision ID: bd722dc4d2b3
Revises: bc5b0fdffb26
Create Date: 2025-10-20 12:52:44.693808+00:00

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'bd722dc4d2b3'
down_revision = 'bc5b0fdffb26'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # إضافة حقل warehouse_id إلى جدول purchase_orders
    # استخدام batch mode لدعم SQLite
    with op.batch_alter_table('purchase_orders', schema=None) as batch_op:
        batch_op.add_column(sa.Column('warehouse_id', sa.BigInteger(), nullable=True))
        batch_op.create_foreign_key('fk_purchase_orders_warehouse_id', 'warehouses', ['warehouse_id'], ['id'])


def downgrade() -> None:
    # حذف حقل warehouse_id من جدول purchase_orders
    with op.batch_alter_table('purchase_orders', schema=None) as batch_op:
        batch_op.drop_constraint('fk_purchase_orders_warehouse_id', type_='foreignkey')
        batch_op.drop_column('warehouse_id')