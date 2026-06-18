"""add_auto_created_flag_to_products

Revision ID: e1f3d6a9c4a8
Revises: bd722dc4d2b3
Create Date: 2025-10-23 10:15:00.000000+00:00

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'e1f3d6a9c4a8'
down_revision = 'bd722dc4d2b3'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        'products',
        sa.Column(
            'auto_created_from_po',
            sa.Boolean(),
            nullable=False,
            server_default=sa.text('0')
        )
    )

    # تأكيد تعيين القيمة الافتراضية للسجلات الحالية
    op.execute("UPDATE products SET auto_created_from_po = 0 WHERE auto_created_from_po IS NULL")


def downgrade() -> None:
    op.drop_column('products', 'auto_created_from_po')
