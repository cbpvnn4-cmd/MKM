"""add quotations and contracts tables

Revision ID: d5e7f9g0h2i3
Revises: c4d6e8f9ab12
Create Date: 2025-11-01 10:00:00.000000+00:00

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy import inspect


# revision identifiers, used by Alembic.
revision = 'd5e7f9g0h2i3'
down_revision = 'c4d6e8f9ab12'
branch_labels = None
depends_on = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = inspect(bind)
    existing_tables = inspector.get_table_names()

    # Create quotations table
    if 'quotations' not in existing_tables:
        op.create_table(
            'quotations',
            sa.Column('id', sa.Integer(), nullable=False),
            sa.Column('quotation_no', sa.String(), nullable=False),
            sa.Column('customer_id', sa.Integer(), nullable=False),
            sa.Column('quotation_date', sa.Date(), nullable=False),
            sa.Column('valid_until', sa.Date(), nullable=True),
            sa.Column('status', sa.String(), nullable=False, server_default='DRAFT'),
            sa.Column('order_type', sa.String(), nullable=False, server_default='items'),
            sa.Column('contact_person', sa.String(), nullable=True),
            sa.Column('contact_email', sa.String(), nullable=True),
            sa.Column('contact_phone', sa.String(), nullable=True),
            sa.Column('payment_terms', sa.Text(), nullable=True),
            sa.Column('delivery_terms', sa.Text(), nullable=True),
            sa.Column('warranty_terms', sa.Text(), nullable=True),
            sa.Column('discount_percent', sa.Numeric(precision=5, scale=2), server_default='0'),
            sa.Column('discount_amount', sa.Numeric(precision=18, scale=2), server_default='0'),
            sa.Column('notes', sa.Text(), nullable=True),
            sa.Column('terms_and_conditions', sa.Text(), nullable=True),
            sa.Column('currency', sa.String(), server_default='USD'),
            sa.Column('exchange_rate', sa.Numeric(precision=18, scale=4), nullable=False, server_default='1.0000'),
            sa.Column('subtotal', sa.Numeric(precision=18, scale=2), server_default='0'),
            sa.Column('tax_percent', sa.Numeric(precision=5, scale=2), server_default='0'),
            sa.Column('tax_amount', sa.Numeric(precision=18, scale=2), server_default='0'),
            sa.Column('total', sa.Numeric(precision=18, scale=2), server_default='0'),
            sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('CURRENT_TIMESTAMP')),
            sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('CURRENT_TIMESTAMP')),
            sa.Column('created_by', sa.Integer(), nullable=True),
            sa.Column('updated_by', sa.Integer(), nullable=True),
            sa.Column('approved_by', sa.Integer(), nullable=True),
            sa.Column('approved_at', sa.DateTime(timezone=True), nullable=True),
            sa.CheckConstraint("status IN ('DRAFT','SENT','ACCEPTED','REJECTED','EXPIRED')", name='quotations_status_check'),
            sa.CheckConstraint("order_type IN ('items','elevators')", name='quotations_order_type_check'),
            sa.ForeignKeyConstraint(['customer_id'], ['customers.id'], ),
            sa.ForeignKeyConstraint(['created_by'], ['users.id'], ),
            sa.ForeignKeyConstraint(['updated_by'], ['users.id'], ),
            sa.ForeignKeyConstraint(['approved_by'], ['users.id'], ),
            sa.PrimaryKeyConstraint('id'),
            sa.UniqueConstraint('quotation_no', name='unique_quotation_no')
        )
        op.create_index(op.f('ix_quotations_id'), 'quotations', ['id'], unique=False)

    # Create quotation_items table
    if 'quotation_items' not in existing_tables:
        op.create_table(
            'quotation_items',
            sa.Column('id', sa.Integer(), nullable=False),
            sa.Column('quotation_id', sa.Integer(), nullable=False),
            sa.Column('product_id', sa.Integer(), nullable=True),
            sa.Column('description', sa.Text(), nullable=False),
            sa.Column('specifications', sa.Text(), nullable=True),
            sa.Column('qty', sa.Numeric(precision=18, scale=3), nullable=False),
            sa.Column('uom', sa.String(), server_default='unit'),
            sa.Column('unit_price', sa.Numeric(precision=18, scale=2), nullable=False),
            sa.Column('discount_percent', sa.Numeric(precision=5, scale=2), server_default='0'),
            sa.Column('discount_amount', sa.Numeric(precision=18, scale=2), server_default='0'),
            sa.Column('line_total', sa.Numeric(precision=18, scale=2), nullable=False),
            # Elevator-specific fields
            sa.Column('sections', sa.Integer(), server_default='0'),
            sa.Column('ropes', sa.Integer(), server_default='0'),
            sa.Column('cable_meters', sa.Numeric(precision=18, scale=2), server_default='0'),
            sa.Column('cabins', sa.Integer(), server_default='1'),
            sa.Column('doors', sa.Integer(), server_default='0'),
            sa.Column('elevator_type', sa.String(), nullable=True),
            sa.Column('capacity_kg', sa.Integer(), nullable=True),
            sa.Column('capacity_persons', sa.Integer(), nullable=True),
            sa.Column('speed_mps', sa.Numeric(precision=5, scale=2), nullable=True),
            sa.Column('floors', sa.Integer(), nullable=True),
            sa.Column('stops', sa.Integer(), nullable=True),
            sa.Column('travel_distance', sa.Numeric(precision=10, scale=2), nullable=True),
            sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('CURRENT_TIMESTAMP')),
            sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('CURRENT_TIMESTAMP')),
            sa.Column('created_by', sa.Integer(), nullable=True),
            sa.Column('updated_by', sa.Integer(), nullable=True),
            sa.ForeignKeyConstraint(['quotation_id'], ['quotations.id'], ondelete='CASCADE'),
            sa.ForeignKeyConstraint(['product_id'], ['products.id'], ),
            sa.ForeignKeyConstraint(['created_by'], ['users.id'], ),
            sa.ForeignKeyConstraint(['updated_by'], ['users.id'], ),
            sa.PrimaryKeyConstraint('id')
        )
        op.create_index(op.f('ix_quotation_items_id'), 'quotation_items', ['id'], unique=False)

    # Create contracts table
    if 'contracts' not in existing_tables:
        op.create_table(
            'contracts',
            sa.Column('id', sa.Integer(), nullable=False),
            sa.Column('contract_no', sa.String(), nullable=False),
            sa.Column('customer_id', sa.Integer(), nullable=False),
            sa.Column('quotation_id', sa.Integer(), nullable=True),
            sa.Column('sales_order_id', sa.Integer(), nullable=True),
            sa.Column('contract_date', sa.Date(), nullable=False),
            sa.Column('start_date', sa.Date(), nullable=True),
            sa.Column('end_date', sa.Date(), nullable=True),
            sa.Column('signed_date', sa.Date(), nullable=True),
            sa.Column('status', sa.String(), nullable=False, server_default='DRAFT'),
            sa.Column('contract_type', sa.String(), server_default='SALES'),
            sa.Column('signed_by_customer', sa.String(), nullable=True),
            sa.Column('signed_by_company', sa.String(), nullable=True),
            sa.Column('payment_schedule', sa.Text(), nullable=True),
            sa.Column('payment_terms', sa.Text(), nullable=True),
            sa.Column('delivery_terms', sa.Text(), nullable=True),
            sa.Column('warranty_terms', sa.Text(), nullable=True),
            sa.Column('terms_and_conditions', sa.Text(), nullable=True),
            sa.Column('penalties_clause', sa.Text(), nullable=True),
            sa.Column('termination_clause', sa.Text(), nullable=True),
            sa.Column('currency', sa.String(), server_default='USD'),
            sa.Column('total_amount', sa.Numeric(precision=18, scale=2), nullable=False),
            sa.Column('notes', sa.Text(), nullable=True),
            sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('CURRENT_TIMESTAMP')),
            sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('CURRENT_TIMESTAMP')),
            sa.Column('created_by', sa.Integer(), nullable=True),
            sa.Column('updated_by', sa.Integer(), nullable=True),
            sa.Column('approved_by', sa.Integer(), nullable=True),
            sa.Column('approved_at', sa.DateTime(timezone=True), nullable=True),
            sa.CheckConstraint("status IN ('DRAFT','ACTIVE','COMPLETED','TERMINATED')", name='contracts_status_check'),
            sa.ForeignKeyConstraint(['customer_id'], ['customers.id'], ),
            sa.ForeignKeyConstraint(['quotation_id'], ['quotations.id'], ),
            sa.ForeignKeyConstraint(['sales_order_id'], ['sales_orders.id'], ),
            sa.ForeignKeyConstraint(['created_by'], ['users.id'], ),
            sa.ForeignKeyConstraint(['updated_by'], ['users.id'], ),
            sa.ForeignKeyConstraint(['approved_by'], ['users.id'], ),
            sa.PrimaryKeyConstraint('id'),
            sa.UniqueConstraint('contract_no', name='unique_contract_no')
        )
        op.create_index(op.f('ix_contracts_id'), 'contracts', ['id'], unique=False)

    # Create contract_milestones table
    if 'contract_milestones' not in existing_tables:
        op.create_table(
            'contract_milestones',
            sa.Column('id', sa.Integer(), nullable=False),
            sa.Column('contract_id', sa.Integer(), nullable=False),
            sa.Column('milestone_name', sa.String(), nullable=False),
            sa.Column('description', sa.Text(), nullable=True),
            sa.Column('sequence_order', sa.Integer(), server_default='1'),
            sa.Column('due_date', sa.Date(), nullable=True),
            sa.Column('actual_completion_date', sa.Date(), nullable=True),
            sa.Column('status', sa.String(), nullable=False, server_default='PENDING'),
            sa.Column('payment_percent', sa.Numeric(precision=5, scale=2), server_default='0'),
            sa.Column('payment_amount', sa.Numeric(precision=18, scale=2), server_default='0'),
            sa.Column('notes', sa.Text(), nullable=True),
            sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('CURRENT_TIMESTAMP')),
            sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('CURRENT_TIMESTAMP')),
            sa.Column('created_by', sa.Integer(), nullable=True),
            sa.Column('updated_by', sa.Integer(), nullable=True),
            sa.CheckConstraint("status IN ('PENDING','IN_PROGRESS','COMPLETED','OVERDUE')", name='contract_milestones_status_check'),
            sa.ForeignKeyConstraint(['contract_id'], ['contracts.id'], ondelete='CASCADE'),
            sa.ForeignKeyConstraint(['created_by'], ['users.id'], ),
            sa.ForeignKeyConstraint(['updated_by'], ['users.id'], ),
            sa.PrimaryKeyConstraint('id')
        )
        op.create_index(op.f('ix_contract_milestones_id'), 'contract_milestones', ['id'], unique=False)


def downgrade() -> None:
    bind = op.get_bind()
    inspector = inspect(bind)
    existing_tables = inspector.get_table_names()

    # Drop tables in reverse order to avoid foreign key constraints
    if 'contract_milestones' in existing_tables:
        op.drop_index(op.f('ix_contract_milestones_id'), table_name='contract_milestones')
        op.drop_table('contract_milestones')

    if 'contracts' in existing_tables:
        op.drop_index(op.f('ix_contracts_id'), table_name='contracts')
        op.drop_table('contracts')

    if 'quotation_items' in existing_tables:
        op.drop_index(op.f('ix_quotation_items_id'), table_name='quotation_items')
        op.drop_table('quotation_items')

    if 'quotations' in existing_tables:
        op.drop_index(op.f('ix_quotations_id'), table_name='quotations')
        op.drop_table('quotations')
