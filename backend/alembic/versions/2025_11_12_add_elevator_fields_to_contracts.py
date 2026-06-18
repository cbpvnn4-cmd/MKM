"""add elevator fields to contracts

Revision ID: add_elevator_fields
Revises: 2025_10_30_1400_add_exchange_rate_to_sales_orders
Create Date: 2025-11-12 14:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'add_elevator_fields'
down_revision = '185679f12796'  # add_company_share_beneficiaries_tables
branch_labels = None
depends_on = None


def upgrade():
    """Add elevator-specific fields to contracts table"""
    # Add elevator fields for manual entry (when not linked to sales_order)
    op.add_column('contracts', sa.Column('elevator_type', sa.String(), nullable=True, comment='نوع المصعد (مثال: مصعد ركاب، مصعد بضائع)'))
    op.add_column('contracts', sa.Column('elevator_model', sa.String(), nullable=True, comment='موديل المصعد'))
    op.add_column('contracts', sa.Column('elevator_capacity', sa.String(), nullable=True, comment='الحمولة (مثال: 630 kg)'))
    op.add_column('contracts', sa.Column('elevator_height', sa.String(), nullable=True, comment='الارتفاع بالمتر'))
    op.add_column('contracts', sa.Column('elevator_sections', sa.String(), nullable=True, comment='عدد السكاشن (الأقسام)'))
    op.add_column('contracts', sa.Column('elevator_cost', sa.Numeric(precision=18, scale=2), nullable=True, comment='تكلفة المصعد'))
    op.add_column('contracts', sa.Column('elevator_notes', sa.Text(), nullable=True, comment='ملاحظات إضافية عن المصعد'))


def downgrade():
    """Remove elevator fields from contracts table"""
    op.drop_column('contracts', 'elevator_notes')
    op.drop_column('contracts', 'elevator_cost')
    op.drop_column('contracts', 'elevator_sections')
    op.drop_column('contracts', 'elevator_height')
    op.drop_column('contracts', 'elevator_capacity')
    op.drop_column('contracts', 'elevator_model')
    op.drop_column('contracts', 'elevator_type')
