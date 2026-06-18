"""Add partner ledger and profit payouts tables

Revision ID: add_partner_ledger
Revises:
Create Date: 2025-10-27

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy import CheckConstraint


# revision identifiers, used by Alembic.
revision = 'add_partner_ledger'
down_revision = None
branch_labels = None
depends_on = None


def upgrade():
    # Create partner_account_ledger table
    op.create_table(
        'partner_account_ledger',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('partner_id', sa.BigInteger(), nullable=False),
        sa.Column('transaction_date', sa.Date(), nullable=False),
        sa.Column('transaction_type', sa.String(50), nullable=False),
        sa.Column('debit_amount', sa.Numeric(18, 2), nullable=False, default=0),
        sa.Column('credit_amount', sa.Numeric(18, 2), nullable=False, default=0),
        sa.Column('running_balance', sa.Numeric(18, 2), nullable=False, default=0),
        sa.Column('reference_id', sa.BigInteger(), nullable=True),
        sa.Column('reference_type', sa.String(50), nullable=True),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.Column('created_by', sa.Integer(), nullable=True),
        sa.Column('updated_by', sa.Integer(), nullable=True),
        sa.PrimaryKeyConstraint('id'),
        sa.ForeignKeyConstraint(['partner_id'], ['partners.id'], ondelete='CASCADE'),
        CheckConstraint(
            "transaction_type IN ('CAPITAL_DEPOSIT', 'CAPITAL_WITHDRAW', 'PROFIT_DISTRIBUTION', 'PROFIT_PAYOUT', 'ADJUSTMENT', 'TRANSFER_IN', 'TRANSFER_OUT')",
            name='check_transaction_type'
        )
    )
    op.create_index('idx_partner_ledger_partner', 'partner_account_ledger', ['partner_id'])
    op.create_index('idx_partner_ledger_date', 'partner_account_ledger', ['transaction_date'])

    # Create partner_profit_payouts table
    op.create_table(
        'partner_profit_payouts',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('partner_id', sa.BigInteger(), nullable=False),
        sa.Column('distribution_line_id', sa.BigInteger(), nullable=True),
        sa.Column('payout_amount', sa.Numeric(18, 2), nullable=False),
        sa.Column('payout_date', sa.Date(), nullable=False),
        sa.Column('payment_method', sa.String(50), nullable=False, default='BANK_TRANSFER'),
        sa.Column('reference_no', sa.String(100), nullable=True),
        sa.Column('notes', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.Column('created_by', sa.Integer(), nullable=True),
        sa.Column('updated_by', sa.Integer(), nullable=True),
        sa.PrimaryKeyConstraint('id'),
        sa.ForeignKeyConstraint(['partner_id'], ['partners.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['distribution_line_id'], ['profit_distribution_lines.id'], ondelete='SET NULL'),
        CheckConstraint(
            "payment_method IN ('BANK_TRANSFER', 'CASH', 'CHECK', 'WIRE_TRANSFER', 'OTHER')",
            name='check_payment_method'
        ),
        CheckConstraint("payout_amount > 0", name='check_positive_payout')
    )
    op.create_index('idx_partner_payouts_partner', 'partner_profit_payouts', ['partner_id'])
    op.create_index('idx_partner_payouts_date', 'partner_profit_payouts', ['payout_date'])


def downgrade():
    op.drop_index('idx_partner_payouts_date', 'partner_profit_payouts')
    op.drop_index('idx_partner_payouts_partner', 'partner_profit_payouts')
    op.drop_table('partner_profit_payouts')

    op.drop_index('idx_partner_ledger_date', 'partner_account_ledger')
    op.drop_index('idx_partner_ledger_partner', 'partner_account_ledger')
    op.drop_table('partner_account_ledger')
