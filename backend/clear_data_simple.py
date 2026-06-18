"""
Clear all data from database
"""

from sqlalchemy import create_engine, text
from app.database.database import DATABASE_URL

def clear_all_data():
    """Clear all data from all tables"""

    print("Clearing all data from database...")

    engine = create_engine(DATABASE_URL)

    with engine.connect() as conn:
        # Order matters due to foreign keys
        tables_to_clear = [
            'stock_movements',
            'warehouse_stock',
            'purchase_order_items',
            'sales_order_items',
            'sales_invoice_items',
            'ap_invoice_items',
            'maintenance_records',
            'expenses',
            'elevators',
            'elevator_calculation_config',
            'purchase_orders',
            'sales_orders',
            'sales_invoices',
            'ap_invoices',
            'products',
            'warehouses',
            'suppliers',
            'customers',
            'projects',
            'partners',
        ]

        deleted_counts = {}

        for table in tables_to_clear:
            try:
                # Count before delete
                count_result = conn.execute(text(f"SELECT COUNT(*) FROM {table}"))
                count = count_result.scalar()

                if count > 0:
                    # Delete data
                    conn.execute(text(f"DELETE FROM {table}"))
                    deleted_counts[table] = count
                    print(f"  {table}: Deleted {count} records")
                else:
                    print(f"  {table}: No data")

            except Exception as e:
                print(f"  {table}: Error - {str(e)}")

        # Commit changes
        conn.commit()

    print("\nDone!")
    print(f"Total tables cleared: {len(deleted_counts)}")
    print(f"Total records deleted: {sum(deleted_counts.values())}")

if __name__ == "__main__":
    clear_all_data()
