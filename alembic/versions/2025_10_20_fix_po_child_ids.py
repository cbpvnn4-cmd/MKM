"""Ensure purchase order child tables use integer autoincrement primary keys

Revision ID: 2025_10_20_fix_po_child_ids
Revises: 2025_10_06_installments
Create Date: 2025-10-20
"""

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = "2025_10_20_fix_po_child_ids"
down_revision = ("2025_10_06_installments", "add_po_payments")
branch_labels = None
depends_on = None


def _recreate_table_with_columns(table_name, columns, constraints, indexes, sqlite_autoincrement):
    temp_table = f"{table_name}_tmp"

    op.create_table(
        temp_table,
        *(columns + constraints),
        sqlite_autoincrement=sqlite_autoincrement,
    )

    column_names = [column.name for column in columns]
    column_list = ", ".join(column_names)

    op.execute(
        sa.text(
            f"INSERT INTO {temp_table} ({column_list}) "
            f"SELECT {column_list} FROM {table_name}"
        )
    )

    op.drop_table(table_name)
    op.rename_table(temp_table, table_name)

    for index_name, index_columns in indexes:
        op.create_index(index_name, table_name, index_columns)


def _reset_sqlite_sequence(table_name):
    bind = op.get_bind()

    if bind.dialect.name != "sqlite":
        return

    has_sequence = bind.execute(
        sa.text(
            "SELECT name FROM sqlite_master "
            "WHERE type='table' AND name='sqlite_sequence'"
        )
    ).fetchone()

    if not has_sequence:
        return

    bind.execute(
        sa.text("DELETE FROM sqlite_sequence WHERE name=:name"),
        {"name": table_name},
    )
    bind.execute(
        sa.text(
            f"INSERT INTO sqlite_sequence(name, seq) "
            f"SELECT :name, COALESCE(MAX(id), 0) FROM {table_name}"
        ),
        {"name": table_name},
    )


def upgrade():
    bind = op.get_bind()
    inspector = sa.inspect(bind)

    if "purchase_order_containers" in inspector.get_table_names():
        container_columns = [
            sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True, nullable=False),
            sa.Column("purchase_order_id", sa.BigInteger(), nullable=False),
            sa.Column("container_no", sa.String(length=50)),
            sa.Column("size", sa.String(length=20)),
            sa.Column("weight", sa.Float()),
            sa.Column("shipping_cost", sa.Numeric(18, 2)),
            sa.Column("total_cost", sa.Numeric(18, 2)),
            sa.Column("notes", sa.Text()),
            sa.Column("created_at", sa.DateTime()),
            sa.Column("updated_at", sa.DateTime()),
            sa.Column("created_by", sa.BigInteger()),
            sa.Column("updated_by", sa.BigInteger()),
        ]
        container_constraints = [
            sa.ForeignKeyConstraint(
                ["purchase_order_id"],
                ["purchase_orders.id"],
                ondelete="CASCADE",
            ),
        ]
        container_indexes = [
            (op.f("ix_purchase_order_containers_id"), ["id"]),
        ]

        _recreate_table_with_columns(
            "purchase_order_containers",
            container_columns,
            container_constraints,
            container_indexes,
            sqlite_autoincrement=True,
        )
        _reset_sqlite_sequence("purchase_order_containers")

    if "purchase_order_installments" in inspector.get_table_names():
        installment_columns = [
            sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True, nullable=False),
            sa.Column("purchase_order_id", sa.BigInteger(), nullable=False),
            sa.Column("name", sa.String(length=100), nullable=False),
            sa.Column("type", sa.String(length=20)),
            sa.Column("percentage", sa.Numeric(5, 2), nullable=False),
            sa.Column("amount_usd", sa.Numeric(18, 2), nullable=False),
            sa.Column("paid_amount_usd", sa.Numeric(18, 2), nullable=False),
            sa.Column("due_date", sa.Date(), nullable=False),
            sa.Column("status", sa.String(length=20)),
            sa.Column("notes", sa.Text()),
            sa.Column("created_at", sa.DateTime()),
            sa.Column("updated_at", sa.DateTime()),
            sa.Column("created_by", sa.BigInteger()),
            sa.Column("updated_by", sa.BigInteger()),
        ]
        installment_constraints = [
            sa.ForeignKeyConstraint(
                ["purchase_order_id"],
                ["purchase_orders.id"],
                ondelete="CASCADE",
            ),
            sa.CheckConstraint(
                "percentage >= 0 AND percentage <= 100",
                name="check_installment_percentage",
            ),
            sa.CheckConstraint(
                "amount_usd >= 0",
                name="check_installment_amount",
            ),
            sa.CheckConstraint(
                "paid_amount_usd >= 0",
                name="check_installment_paid_amount",
            ),
            sa.CheckConstraint(
                "type IN ('advance', 'regular')",
                name="check_installment_type",
            ),
            sa.CheckConstraint(
                "status IN ('pending', 'partial', 'paid', 'overdue')",
                name="check_installment_status",
            ),
        ]
        installment_indexes = [
            (op.f("ix_purchase_order_installments_id"), ["id"]),
        ]

        _recreate_table_with_columns(
            "purchase_order_installments",
            installment_columns,
            installment_constraints,
            installment_indexes,
            sqlite_autoincrement=True,
        )
        _reset_sqlite_sequence("purchase_order_installments")


def downgrade():
    bind = op.get_bind()
    inspector = sa.inspect(bind)

    if "purchase_order_containers" in inspector.get_table_names():
        container_columns = [
            sa.Column("id", sa.BigInteger(), primary_key=True, nullable=False),
            sa.Column("purchase_order_id", sa.BigInteger(), nullable=False),
            sa.Column("container_no", sa.String(length=50)),
            sa.Column("size", sa.String(length=20)),
            sa.Column("weight", sa.Float()),
            sa.Column("shipping_cost", sa.Numeric(18, 2)),
            sa.Column("total_cost", sa.Numeric(18, 2)),
            sa.Column("notes", sa.Text()),
            sa.Column("created_at", sa.DateTime()),
            sa.Column("updated_at", sa.DateTime()),
            sa.Column("created_by", sa.BigInteger()),
            sa.Column("updated_by", sa.BigInteger()),
        ]
        container_constraints = [
            sa.ForeignKeyConstraint(
                ["purchase_order_id"],
                ["purchase_orders.id"],
                ondelete="CASCADE",
            ),
        ]
        container_indexes = [
            (op.f("ix_purchase_order_containers_id"), ["id"]),
        ]

        _recreate_table_with_columns(
            "purchase_order_containers",
            container_columns,
            container_constraints,
            container_indexes,
            sqlite_autoincrement=False,
        )

    if "purchase_order_installments" in inspector.get_table_names():
        installment_columns = [
            sa.Column("id", sa.BigInteger(), primary_key=True, nullable=False),
            sa.Column("purchase_order_id", sa.BigInteger(), nullable=False),
            sa.Column("name", sa.String(length=100), nullable=False),
            sa.Column("type", sa.String(length=20)),
            sa.Column("percentage", sa.Numeric(5, 2), nullable=False),
            sa.Column("amount_usd", sa.Numeric(18, 2), nullable=False),
            sa.Column("paid_amount_usd", sa.Numeric(18, 2), nullable=False),
            sa.Column("due_date", sa.Date(), nullable=False),
            sa.Column("status", sa.String(length=20)),
            sa.Column("notes", sa.Text()),
            sa.Column("created_at", sa.DateTime()),
            sa.Column("updated_at", sa.DateTime()),
            sa.Column("created_by", sa.BigInteger()),
            sa.Column("updated_by", sa.BigInteger()),
        ]
        installment_constraints = [
            sa.ForeignKeyConstraint(
                ["purchase_order_id"],
                ["purchase_orders.id"],
                ondelete="CASCADE",
            ),
            sa.CheckConstraint(
                "percentage >= 0 AND percentage <= 100",
                name="check_installment_percentage",
            ),
            sa.CheckConstraint(
                "amount_usd >= 0",
                name="check_installment_amount",
            ),
            sa.CheckConstraint(
                "paid_amount_usd >= 0",
                name="check_installment_paid_amount",
            ),
            sa.CheckConstraint(
                "type IN ('advance', 'regular')",
                name="check_installment_type",
            ),
            sa.CheckConstraint(
                "status IN ('pending', 'partial', 'paid', 'overdue')",
                name="check_installment_status",
            ),
        ]
        installment_indexes = [
            (op.f("ix_purchase_order_installments_id"), ["id"]),
        ]

        _recreate_table_with_columns(
            "purchase_order_installments",
            installment_columns,
            installment_constraints,
            installment_indexes,
            sqlite_autoincrement=False,
        )
