"""Add installments and containers tables

Revision ID: 2025_10_06_installments
Revises: 2025_10_01_1139_b1fd9007a2d5
Create Date: 2025-10-06

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '2025_10_06_installments'
down_revision = 'b1fd9007a2d5'
branch_labels = None
depends_on = None


def upgrade():
    # Create purchase_order_installments table
    op.create_table(
        'purchase_order_installments',
        sa.Column('id', sa.BigInteger(), nullable=False),
        sa.Column('purchase_order_id', sa.BigInteger(), nullable=False),
        sa.Column('name', sa.String(length=100), nullable=False),
        sa.Column('type', sa.String(length=20), nullable=True),
        sa.Column('percentage', sa.Numeric(precision=5, scale=2), nullable=False),
        sa.Column('amount_usd', sa.Numeric(precision=18, scale=2), nullable=False),
        sa.Column('paid_amount_usd', sa.Numeric(precision=18, scale=2), nullable=False),
        sa.Column('due_date', sa.Date(), nullable=False),
        sa.Column('status', sa.String(length=20), nullable=True),
        sa.Column('notes', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.Column('created_by', sa.BigInteger(), nullable=True),
        sa.Column('updated_by', sa.BigInteger(), nullable=True),
        sa.CheckConstraint('percentage >= 0 AND percentage <= 100', name='check_installment_percentage'),
        sa.CheckConstraint('amount_usd >= 0', name='check_installment_amount'),
        sa.CheckConstraint('paid_amount_usd >= 0', name='check_installment_paid_amount'),
        sa.CheckConstraint("type IN ('advance', 'regular')", name='check_installment_type'),
        sa.CheckConstraint("status IN ('pending', 'partial', 'paid', 'overdue')", name='check_installment_status'),
        sa.ForeignKeyConstraint(['purchase_order_id'], ['purchase_orders.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_purchase_order_installments_id'), 'purchase_order_installments', ['id'], unique=False)

    # Create purchase_order_containers table
    op.create_table(
        'purchase_order_containers',
        sa.Column('id', sa.BigInteger(), nullable=False),
        sa.Column('purchase_order_id', sa.BigInteger(), nullable=False),
        sa.Column('container_no', sa.String(length=50), nullable=True),
        sa.Column('size', sa.String(length=20), nullable=True),
        sa.Column('weight', sa.Float(), nullable=True),
        sa.Column('shipping_cost', sa.Numeric(precision=18, scale=2), nullable=True),
        sa.Column('total_cost', sa.Numeric(precision=18, scale=2), nullable=True),
        sa.Column('notes', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.Column('created_by', sa.BigInteger(), nullable=True),
        sa.Column('updated_by', sa.BigInteger(), nullable=True),
        sa.ForeignKeyConstraint(['purchase_order_id'], ['purchase_orders.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_purchase_order_containers_id'), 'purchase_order_containers', ['id'], unique=False)


def downgrade():
    op.drop_index(op.f('ix_purchase_order_containers_id'), table_name='purchase_order_containers')
    op.drop_table('purchase_order_containers')
    op.drop_index(op.f('ix_purchase_order_installments_id'), table_name='purchase_order_installments')
    op.drop_table('purchase_order_installments')
