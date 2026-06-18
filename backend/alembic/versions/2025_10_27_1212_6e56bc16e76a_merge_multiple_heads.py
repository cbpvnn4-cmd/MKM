"""merge_multiple_heads

Revision ID: 6e56bc16e76a
Revises: c4d6e8f9ab12, add_partner_ledger
Create Date: 2025-10-27 12:12:55.756200+00:00

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '6e56bc16e76a'
down_revision = ('c4d6e8f9ab12', 'add_partner_ledger')
branch_labels = None
depends_on = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass