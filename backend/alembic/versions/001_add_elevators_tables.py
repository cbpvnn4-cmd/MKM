"""add elevators tables

Revision ID: 001
Revises:
Create Date: 2025-01-19 10:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '001'
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    # إنشاء جدول إعدادات حساب المصاعد
    op.create_table('elevator_calculation_configs',
    sa.Column('id', sa.BigInteger(), nullable=False),
    sa.Column('section_length_meters', sa.Numeric(precision=4, scale=2), server_default='1.5', nullable=False),
    sa.Column('base_rope_per_section', sa.Integer(), server_default='2', nullable=False),
    sa.Column('base_cable_per_section', sa.Integer(), server_default='1', nullable=False),
    sa.Column('double_cabin_multiplier', sa.Numeric(precision=3, scale=2), server_default='1.8', nullable=False),
    sa.Column('is_active', sa.Boolean(), server_default='true', nullable=False),
    sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
    sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
    sa.Column('created_by', sa.BigInteger(), nullable=True),
    sa.Column('updated_by', sa.BigInteger(), nullable=True),
    sa.PrimaryKeyConstraint('id')
    )

    # إنشاء جدول الموردين
    op.create_table('suppliers',
    sa.Column('id', sa.BigInteger(), nullable=False),
    sa.Column('name', sa.String(length=100), nullable=False),
    sa.Column('contact_person', sa.String(length=100), nullable=True),
    sa.Column('phone', sa.String(length=20), nullable=True),
    sa.Column('email', sa.String(length=100), nullable=True),
    sa.Column('address', sa.Text(), nullable=True),
    sa.Column('tax_id', sa.String(length=50), nullable=True),
    sa.Column('payment_terms', sa.String(length=100), nullable=True),
    sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
    sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
    sa.Column('created_by', sa.BigInteger(), nullable=True),
    sa.Column('updated_by', sa.BigInteger(), nullable=True),
    sa.PrimaryKeyConstraint('id')
    )

    # إنشاء جدول أوامر الشراء
    op.create_table('purchase_orders',
    sa.Column('id', sa.BigInteger(), nullable=False),
    sa.Column('supplier_id', sa.BigInteger(), nullable=False),
    sa.Column('po_no', sa.String(length=50), nullable=False),
    sa.Column('po_date', sa.Date(), nullable=False),
    sa.Column('expected_delivery_date', sa.Date(), nullable=True),
    sa.Column('status', sa.String(length=20), nullable=False, server_default='DRAFT'),
    sa.Column('total_amount_usd', sa.Numeric(precision=18, scale=2), nullable=True),
    sa.Column('notes', sa.Text(), nullable=True),
    sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
    sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
    sa.Column('created_by', sa.BigInteger(), nullable=True),
    sa.Column('updated_by', sa.BigInteger(), nullable=True),
    sa.CheckConstraint("status IN ('DRAFT', 'CONFIRMED', 'RECEIVED', 'CANCELLED')", name='check_purchase_order_status'),
    sa.ForeignKeyConstraint(['supplier_id'], ['suppliers.id'], ),
    sa.PrimaryKeyConstraint('id'),
    sa.UniqueConstraint('po_no')
    )

    # إنشاء جدول عناصر أوامر الشراء
    op.create_table('purchase_order_items',
    sa.Column('id', sa.BigInteger(), nullable=False),
    sa.Column('purchase_order_id', sa.BigInteger(), nullable=False),
    sa.Column('product_id', sa.BigInteger(), nullable=False),
    sa.Column('qty', sa.Numeric(precision=18, scale=3), nullable=False),
    sa.Column('unit_cost_usd', sa.Numeric(precision=18, scale=2), nullable=False),
    sa.Column('line_total_usd', sa.Numeric(precision=18, scale=2), nullable=False),
    sa.Column('received_qty', sa.Numeric(precision=18, scale=3), server_default='0', nullable=True),
    sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
    sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
    sa.Column('created_by', sa.BigInteger(), nullable=True),
    sa.Column('updated_by', sa.BigInteger(), nullable=True),
    sa.ForeignKeyConstraint(['purchase_order_id'], ['purchase_orders.id'], ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('id')
    )

    # إنشاء جدول المصاعد
    op.create_table('elevators',
    sa.Column('id', sa.BigInteger(), nullable=False),
    sa.Column('elevator_code', sa.String(length=50), nullable=False),
    sa.Column('purchase_order_id', sa.BigInteger(), nullable=True),
    sa.Column('height_meters', sa.Numeric(precision=8, scale=2), nullable=False),
    sa.Column('model_type', sa.String(length=100), nullable=False),
    sa.Column('manufacture_year', sa.Integer(), nullable=True),
    sa.Column('cabin_count', sa.Integer(), server_default='1', nullable=False),
    sa.Column('section_count', sa.Integer(), nullable=True),
    sa.Column('rope_count', sa.Integer(), nullable=True),
    sa.Column('cable_count', sa.Integer(), nullable=True),
    sa.Column('status', sa.String(length=20), server_default='ORDERED', nullable=True),
    sa.Column('unit_price_usd', sa.Numeric(precision=18, scale=2), nullable=True),
    sa.Column('total_cost_usd', sa.Numeric(precision=18, scale=2), nullable=True),
    sa.Column('notes', sa.Text(), nullable=True),
    sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
    sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
    sa.Column('created_by', sa.BigInteger(), nullable=True),
    sa.Column('updated_by', sa.BigInteger(), nullable=True),
    sa.CheckConstraint("cabin_count IN (1, 2)", name='check_elevator_cabin_count'),
    sa.CheckConstraint("status IN ('ORDERED', 'IN_PRODUCTION', 'DELIVERED', 'INSTALLED', 'CANCELLED')", name='check_elevator_status'),
    sa.CheckConstraint('height_meters > 0', name='check_elevator_height_positive'),
    sa.ForeignKeyConstraint(['purchase_order_id'], ['purchase_orders.id'], ),
    sa.PrimaryKeyConstraint('id'),
    sa.UniqueConstraint('elevator_code')
    )

    # إنشاء جدول فواتير الموردين
    op.create_table('ap_invoices',
    sa.Column('id', sa.BigInteger(), nullable=False),
    sa.Column('supplier_id', sa.BigInteger(), nullable=False),
    sa.Column('purchase_order_id', sa.BigInteger(), nullable=True),
    sa.Column('invoice_no', sa.String(length=100), nullable=False),
    sa.Column('invoice_date', sa.Date(), nullable=False),
    sa.Column('due_date', sa.Date(), nullable=True),
    sa.Column('amount_usd', sa.Numeric(precision=18, scale=2), nullable=False),
    sa.Column('paid_amount_usd', sa.Numeric(precision=18, scale=2), server_default='0', nullable=True),
    sa.Column('status', sa.String(length=20), nullable=False, server_default='DRAFT'),
    sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
    sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
    sa.Column('created_by', sa.BigInteger(), nullable=True),
    sa.Column('updated_by', sa.BigInteger(), nullable=True),
    sa.CheckConstraint("status IN ('DRAFT', 'ISSUED', 'PARTIALLY_PAID', 'PAID', 'VOID')", name='check_ap_invoice_status'),
    sa.CheckConstraint('amount_usd >= 0', name='check_ap_invoice_amount_non_negative'),
    sa.CheckConstraint('paid_amount_usd >= 0', name='check_ap_paid_amount_non_negative'),
    sa.ForeignKeyConstraint(['purchase_order_id'], ['purchase_orders.id'], ),
    sa.ForeignKeyConstraint(['supplier_id'], ['suppliers.id'], ),
    sa.PrimaryKeyConstraint('id'),
    sa.UniqueConstraint('invoice_no')
    )

    # إنشاء جدول مدفوعات الموردين
    op.create_table('ap_payments',
    sa.Column('id', sa.BigInteger(), nullable=False),
    sa.Column('ap_invoice_id', sa.BigInteger(), nullable=False),
    sa.Column('paid_on', sa.Date(), nullable=False),
    sa.Column('method', sa.String(length=50), nullable=True),
    sa.Column('amount_usd', sa.Numeric(precision=18, scale=2), nullable=False),
    sa.Column('reference_no', sa.String(length=100), nullable=True),
    sa.Column('notes', sa.Text(), nullable=True),
    sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
    sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
    sa.Column('created_by', sa.BigInteger(), nullable=True),
    sa.Column('updated_by', sa.BigInteger(), nullable=True),
    sa.CheckConstraint('amount_usd > 0', name='check_ap_payment_amount_positive'),
    sa.ForeignKeyConstraint(['ap_invoice_id'], ['ap_invoices.id'], ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('id')
    )

    # إدراج إعدادات افتراضية لحساب المصاعد
    op.execute("""
        INSERT INTO elevator_calculation_configs
        (section_length_meters, base_rope_per_section, base_cable_per_section, double_cabin_multiplier, is_active)
        VALUES (1.5, 2, 1, 1.8, true)
    """)


def downgrade() -> None:
    # حذف الجداول بالترتيب العكسي
    op.drop_table('ap_payments')
    op.drop_table('ap_invoices')
    op.drop_table('elevators')
    op.drop_table('purchase_order_items')
    op.drop_table('purchase_orders')
    op.drop_table('suppliers')
    op.drop_table('elevator_calculation_configs')