"""
Database Indexes for Performance Optimization
Run this script to add indexes to frequently queried columns
"""

from sqlalchemy import create_engine, Index, text
from sqlalchemy.orm import Session
from app.database.database import DATABASE_URL, engine, Base
from app.models.customers import Customer
from app.models.sales import SalesOrder, SalesOrderItem, Invoice, Payment
from app.models.products import Product
from app.models.partners import Partner, CapitalMovement, OwnershipSnapshot
from app.models.purchases import PurchaseOrder, PurchaseOrderItem
from app.models.inventory import StockMovement, Warehouse
from app.models.quotations import Quotation, QuotationItem
from app.models.quotations import Contract as ContractModel
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


def create_indexes():
    """
    Create database indexes for improved query performance.
    This script should be run after database migrations.
    """

    logger.info("Starting database index creation...")

    # Create indexes using raw SQL for better control
    indexes = [
        # Customer indexes
        "CREATE INDEX IF NOT EXISTS idx_customers_name ON customers(name);",
        "CREATE INDEX IF NOT EXISTS idx_customers_email ON customers(email);",
        "CREATE INDEX IF NOT EXISTS idx_customers_phone ON customers(phone);",
        "CREATE INDEX IF NOT EXISTS idx_customers_active ON customers(is_active) WHERE is_active = true;",

        # Product indexes
        "CREATE INDEX IF NOT EXISTS idx_products_sku ON products(sku);",
        "CREATE INDEX IF NOT EXISTS idx_products_name ON products(name);",
        "CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);",
        "CREATE INDEX IF NOT EXISTS idx_products_active ON products(is_active) WHERE is_active = true;",

        # Sales Order indexes
        "CREATE INDEX IF NOT EXISTS idx_sales_orders_so_no ON sales_orders(so_no);",
        "CREATE INDEX IF NOT EXISTS idx_sales_orders_customer ON sales_orders(customer_id);",
        "CREATE INDEX IF NOT EXISTS idx_sales_orders_status ON sales_orders(status);",
        "CREATE INDEX IF NOT EXISTS idx_sales_orders_date ON sales_orders(so_date);",
        "CREATE INDEX IF NOT EXISTS idx_sales_orders_created ON sales_orders(created_at);",
        "CREATE INDEX IF NOT EXISTS idx_sales_orders_type ON sales_orders(order_type);",

        # Sales Order Item indexes
        "CREATE INDEX IF NOT EXISTS idx_sales_order_items_order ON sales_order_items(sales_order_id);",
        "CREATE INDEX IF NOT EXISTS idx_sales_order_items_product ON sales_order_items(product_id);",

        # Invoice indexes
        "CREATE INDEX IF NOT EXISTS idx_invoices_invoice_no ON invoices(invoice_no);",
        "CREATE INDEX IF NOT EXISTS idx_invoices_customer ON invoices(customer_id);",
        "CREATE INDEX IF NOT EXISTS idx_invoices_sales_order ON invoices(sales_order_id);",
        "CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status);",
        "CREATE INDEX IF NOT EXISTS idx_invoices_issue_date ON invoices(issue_date);",
        "CREATE INDEX IF NOT EXISTS idx_invoices_due_date ON invoices(due_date);",
        "CREATE INDEX IF NOT EXISTS idx_invoices_currency ON invoices(currency);",

        # Payment indexes
        "CREATE INDEX IF NOT EXISTS idx_payments_invoice ON payments(invoice_id);",
        "CREATE INDEX IF NOT EXISTS idx_payments_date ON payments(paid_on);",
        "CREATE INDEX IF NOT EXISTS idx_payments_method ON payments(method);",

        # Partner indexes
        "CREATE INDEX IF NOT EXISTS idx_partners_name ON partners(name);",
        "CREATE INDEX IF NOT EXISTS idx_partners_email ON partners(email);",
        "CREATE INDEX IF NOT EXISTS idx_partners_active ON partners(is_active) WHERE is_active = true;",

        # Capital Movement indexes
        "CREATE INDEX IF NOT EXISTS idx_capital_movements_partner ON capital_movements(partner_id);",
        "CREATE INDEX IF NOT EXISTS idx_capital_movements_date ON capital_movements(movement_date);",
        "CREATE INDEX IF NOT EXISTS idx_capital_movements_type ON capital_movements(movement_type);",

        # Ownership Snapshot indexes
        "CREATE INDEX IF NOT EXISTS idx_ownership_snapshots_partner ON ownership_snapshots(partner_id);",
        "CREATE INDEX IF NOT EXISTS idx_ownership_snapshots_date ON ownership_snapshots(snapshot_date);",

        # Purchase Order indexes
        "CREATE INDEX IF NOT EXISTS idx_purchase_orders_po_no ON purchase_orders(po_no);",
        "CREATE INDEX IF NOT EXISTS idx_purchase_orders_supplier ON purchase_orders(supplier_id);",
        "CREATE INDEX IF NOT EXISTS idx_purchase_orders_status ON purchase_orders(status);",
        "CREATE INDEX IF NOT EXISTS idx_purchase_orders_date ON purchase_orders(order_date);",

        # Purchase Order Item indexes
        "CREATE INDEX IF NOT EXISTS idx_purchase_order_items_order ON purchase_order_items(purchase_order_id);",
        "CREATE INDEX IF NOT EXISTS idx_purchase_order_items_product ON purchase_order_items(product_id);",

        # Stock Movement indexes
        "CREATE INDEX IF NOT EXISTS idx_stock_movements_product ON stock_movements(product_id);",
        "CREATE INDEX IF NOT EXISTS idx_stock_movements_warehouse ON stock_movements(warehouse_id);",
        "CREATE INDEX IF NOT EXISTS idx_stock_movements_date ON stock_movements(movement_date);",
        "CREATE INDEX IF NOT EXISTS idx_stock_movements_type ON stock_movements(movement_type);",
        "CREATE INDEX IF NOT EXISTS idx_stock_movements_reference ON stock_movements(reference_no);",

        # Warehouse indexes
        "CREATE INDEX IF NOT EXISTS idx_warehouses_name ON warehouses(name);",
        "CREATE INDEX IF NOT EXISTS idx_warehouses_location ON warehouses(location);",

        # Quotation indexes
        "CREATE INDEX IF NOT EXISTS idx_quotations_quotation_no ON quotations(quotation_no);",
        "CREATE INDEX IF NOT EXISTS idx_quotations_customer ON quotations(customer_id);",
        "CREATE INDEX IF NOT EXISTS idx_quotations_status ON quotations(status);",
        "CREATE INDEX IF NOT EXISTS idx_quotations_date ON quotations(quotation_date);",

        # Quotation Item indexes
        "CREATE INDEX IF NOT EXISTS idx_quotation_items_quotation ON quotation_items(quotation_id);",
        "CREATE INDEX IF NOT EXISTS idx_quotation_items_product ON quotation_items(product_id);",

        # Contract indexes
        "CREATE INDEX IF NOT EXISTS idx_contracts_contract_no ON contracts(contract_no);",
        "CREATE INDEX IF NOT EXISTS idx_contracts_customer ON contracts(customer_id);",
        "CREATE INDEX IF NOT EXISTS idx_contracts_quotation ON contracts(quotation_id);",
        "CREATE INDEX IF NOT EXISTS idx_contracts_sales_order ON contracts(sales_order_id);",
        "CREATE INDEX IF NOT EXISTS idx_contracts_status ON contracts(status);",
        "CREATE INDEX IF NOT EXISTS idx_contracts_type ON contracts(contract_type);",
        "CREATE INDEX IF NOT EXISTS idx_contracts_date ON contracts(contract_date);",
    ]

    # Try to create indexes
    try:
        with engine.connect() as conn:
            for index_sql in indexes:
                try:
                    conn.execute(text(index_sql))
                    logger.info(f"Created index: {index_sql[:50]}...")
                except Exception as e:
                    # Index might already exist or table doesn't exist
                    logger.warning(f"Could not create index: {e}")

            conn.commit()

        logger.info("Database indexes created successfully!")

    except Exception as e:
        logger.error(f"Error creating indexes: {e}")
        raise


def create_composite_indexes():
    """
    Create composite indexes for complex queries.
    Composite indexes are useful for queries that filter on multiple columns.
    """

    logger.info("Creating composite indexes...")

    composite_indexes = [
        # Sales orders: customer + status + date
        "CREATE INDEX IF NOT EXISTS idx_sales_orders_customer_status_date ON sales_orders(customer_id, status, so_date);",

        # Invoices: customer + status + due_date
        "CREATE INDEX IF NOT EXISTS idx_invoices_customer_status_due ON invoices(customer_id, status, due_date);",

        # Stock movements: product + type + date
        "CREATE INDEX IF NOT EXISTS idx_stock_movements_product_type_date ON stock_movements(product_id, movement_type, movement_date);",

        # Capital movements: partner + type + date
        "CREATE INDEX IF NOT EXISTS idx_capital_partner_type_date ON capital_movements(partner_id, movement_type, movement_date);",

        # Payments: invoice + date
        "CREATE INDEX IF NOT EXISTS idx_payments_invoice_date ON payments(invoice_id, paid_on);",
    ]

    try:
        with engine.connect() as conn:
            for index_sql in composite_indexes:
                try:
                    conn.execute(text(index_sql))
                    logger.info(f"Created composite index: {index_sql[:60]}...")
                except Exception as e:
                    logger.warning(f"Could not create composite index: {e}")

            conn.commit()

        logger.info("Composite indexes created successfully!")

    except Exception as e:
        logger.error(f"Error creating composite indexes: {e}")
        raise


def analyze_query_performance():
    """
    Analyze query performance and suggest additional indexes.
    This is a diagnostic function.
    """

    logger.info("Analyzing query performance...")

    # For PostgreSQL
    if "postgresql" in DATABASE_URL:
        analyze_queries = [
            "ANALYZE customers;",
            "ANALYZE products;",
            "ANALYZE sales_orders;",
            "ANALYZE sales_order_items;",
            "ANALYZE invoices;",
            "ANALYZE payments;",
            "ANALYZE partners;",
            "ANALYZE capital_movements;",
            "ANALYZE stock_movements;",
            "ANALYZE purchase_orders;",
            "ANALYZE quotations;",
            "ANALYZE contracts;",
        ]

        try:
            with engine.connect() as conn:
                for query in analyze_queries:
                    try:
                        conn.execute(text(query))
                    except Exception as e:
                        logger.warning(f"Could not analyze table: {e}")

                conn.commit()

            logger.info("Query performance analysis completed!")

        except Exception as e:
            logger.error(f"Error analyzing queries: {e}")
    else:
        logger.info("ANALYZE command is PostgreSQL-specific. Skipping.")


def main():
    """Main function to run all index operations."""

    logger.info("=" * 50)
    logger.info("Database Index Optimization")
    logger.info("=" * 50)

    try:
        # Create basic indexes
        create_indexes()

        # Create composite indexes
        create_composite_indexes()

        # Analyze query performance (PostgreSQL only)
        analyze_query_performance()

        logger.info("=" * 50)
        logger.info("Database index optimization completed successfully!")
        logger.info("=" * 50)

    except Exception as e:
        logger.error(f"Database index optimization failed: {e}")
        raise


if __name__ == "__main__":
    main()
