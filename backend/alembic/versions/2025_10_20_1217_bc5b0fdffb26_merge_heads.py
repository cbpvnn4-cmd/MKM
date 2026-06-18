"""merge_heads

Revision ID: bc5b0fdffb26
Revises: add_po_payments, 2025_10_06_installments
Create Date: 2025-10-20 12:17:24.988453+00:00

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'bc5b0fdffb26'
down_revision = ('add_po_payments', '2025_10_06_installments')
branch_labels = None
depends_on = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass