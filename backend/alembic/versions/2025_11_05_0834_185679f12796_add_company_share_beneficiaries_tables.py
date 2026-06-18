"""add_company_share_beneficiaries_tables

Revision ID: 185679f12796
Revises: 5b69102e54a4
Create Date: 2025-11-05 08:34:08.581684+00:00

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '185679f12796'
down_revision = '5b69102e54a4'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Create company_share_beneficiaries table
    op.create_table(
        'company_share_beneficiaries',
        sa.Column('id', sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.Column('created_by', sa.Integer(), nullable=True),
        sa.Column('updated_by', sa.Integer(), nullable=True),
        sa.Column('name', sa.String(length=100), nullable=False),
        sa.Column('percentage', sa.Numeric(precision=5, scale=2), nullable=False),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default='1'),
        sa.Column('notes', sa.Text(), nullable=True),
        sa.CheckConstraint('percentage > 0 AND percentage <= 100', name='check_beneficiary_percentage')
    )

    # Create beneficiary_distribution_decisions table
    op.create_table(
        'beneficiary_distribution_decisions',
        sa.Column('id', sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.Column('created_by', sa.Integer(), nullable=True),
        sa.Column('updated_by', sa.Integer(), nullable=True),
        sa.Column('profit_run_id', sa.BigInteger(), nullable=False),
        sa.Column('beneficiary_id', sa.BigInteger(), nullable=False),
        sa.Column('amount_usd', sa.Numeric(precision=18, scale=2), nullable=False),
        sa.Column('decision_type', sa.String(length=20), nullable=False),
        sa.Column('partner_id', sa.BigInteger(), nullable=True),
        sa.Column('notes', sa.Text(), nullable=True),
        sa.Column('decided_at', sa.Date(), nullable=True),
        sa.CheckConstraint("decision_type IN ('CASH', 'CAPITAL')", name='check_decision_type'),
        sa.CheckConstraint('amount_usd >= 0', name='check_positive_amount'),
        sa.ForeignKeyConstraint(['beneficiary_id'], ['company_share_beneficiaries.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['partner_id'], ['partners.id']),
        sa.ForeignKeyConstraint(['profit_run_id'], ['profit_runs.id'], ondelete='CASCADE'),
        sa.UniqueConstraint('profit_run_id', 'beneficiary_id', name='unique_beneficiary_decision_per_run')
    )

    # Create indexes
    op.create_index('ix_beneficiary_decisions_profit_run', 'beneficiary_distribution_decisions', ['profit_run_id'])
    op.create_index('ix_beneficiary_decisions_beneficiary', 'beneficiary_distribution_decisions', ['beneficiary_id'])

    # Insert default beneficiaries: سمير and علي
    from sqlalchemy import table, column, String, Numeric, Boolean, Text, DateTime, BigInteger
    from datetime import datetime

    beneficiaries_table = table('company_share_beneficiaries',
        column('name', String),
        column('percentage', Numeric),
        column('is_active', Boolean),
        column('notes', Text)
    )

    op.bulk_insert(beneficiaries_table, [
        {'name': 'سمير', 'percentage': 15.00, 'is_active': True, 'notes': 'مستفيد من نسبة الشركة'},
        {'name': 'علي', 'percentage': 15.00, 'is_active': True, 'notes': 'مستفيد من نسبة الشركة'}
    ])


def downgrade() -> None:
    op.drop_index('ix_beneficiary_decisions_beneficiary', 'beneficiary_distribution_decisions')
    op.drop_index('ix_beneficiary_decisions_profit_run', 'beneficiary_distribution_decisions')
    op.drop_table('beneficiary_distribution_decisions')
    op.drop_table('company_share_beneficiaries')