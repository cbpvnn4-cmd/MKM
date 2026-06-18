"""add purchase order payments system

Revision ID: add_po_payments
Revises:
Create Date: 2025-01-05

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = 'add_po_payments'
down_revision = 'b1fd9007a2d5'  # Latest migration
branch_labels = None
depends_on = None


def upgrade():
    # إضافة عمود paid_amount_usd لجدول purchase_orders
    connection = op.get_bind()
    inspector = sa.inspect(connection)

    # التحقق من وجود الجدول
    if 'purchase_orders' in inspector.get_table_names():
        columns = [col['name'] for col in inspector.get_columns('purchase_orders')]
        if 'paid_amount_usd' not in columns:
            op.add_column('purchase_orders', sa.Column('paid_amount_usd', sa.Numeric(precision=18, scale=2), nullable=False, server_default='0'))

    # إنشاء جدول purchase_order_payments إذا لم يكن موجوداً
    if 'purchase_order_payments' not in inspector.get_table_names():
        op.create_table('purchase_order_payments',
            sa.Column('id', sa.BigInteger(), nullable=False),
            sa.Column('purchase_order_id', sa.BigInteger(), nullable=False),
            sa.Column('paid_on', sa.Date(), nullable=False),
            sa.Column('method', sa.String(length=50), nullable=True, server_default='BANK_TRANSFER'),
            sa.Column('amount_usd', sa.Numeric(precision=18, scale=2), nullable=False),
            sa.Column('reference_no', sa.String(length=100), nullable=True),
            sa.Column('notes', sa.Text(), nullable=True),
            sa.Column('created_at', sa.DateTime(), nullable=True),
            sa.Column('updated_at', sa.DateTime(), nullable=True),
            sa.Column('created_by', sa.BigInteger(), nullable=True),
            sa.Column('updated_by', sa.BigInteger(), nullable=True),
            sa.ForeignKeyConstraint(['purchase_order_id'], ['purchase_orders.id'], ondelete='CASCADE'),
            sa.CheckConstraint('amount_usd > 0', name='check_po_payment_amount_positive'),
            sa.PrimaryKeyConstraint('id')
        )

        # إنشاء index للأداء
        op.create_index('ix_po_payments_po_id', 'purchase_order_payments', ['purchase_order_id'])
        op.create_index('ix_po_payments_paid_on', 'purchase_order_payments', ['paid_on'])


def downgrade():
    # حذف indexes
    op.drop_index('ix_po_payments_paid_on', table_name='purchase_order_payments')
    op.drop_index('ix_po_payments_po_id', table_name='purchase_order_payments')

    # حذف الجدول
    op.drop_table('purchase_order_payments')

    # حذف العمود
    op.drop_column('purchase_orders', 'paid_amount_usd')
