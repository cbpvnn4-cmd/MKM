"""
سكريبت لمسح جميع البيانات من قاعدة البيانات
⚠️ تحذير: هذا سيحذف جميع البيانات بشكل دائم!
"""

from sqlalchemy import create_engine, text
from app.database.database import DATABASE_URL
import sys

def clear_all_data():
    """مسح جميع البيانات من جميع الجداول"""

    print("⚠️  تحذير: هذا السكريبت سيحذف جميع البيانات من قاعدة البيانات!")
    print("=" * 60)

    response = input("هل أنت متأكد من أنك تريد المتابعة؟ اكتب 'نعم' للتأكيد: ")

    if response.strip() != 'نعم':
        print("❌ تم إلغاء العملية")
        sys.exit(0)

    print("\n🔄 جاري مسح البيانات...")

    engine = create_engine(DATABASE_URL)

    with engine.connect() as conn:
        # ترتيب الحذف مهم بسبب العلاقات الخارجية (Foreign Keys)
        tables_to_clear = [
            # حذف البيانات التابعة أولاً
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

            # ثم الجداول الرئيسية
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

            # جداول النظام (اختياري - احذف التعليق إذا أردت مسحها)
            # 'audit_logs',
            # 'notifications',
            # 'files',
        ]

        deleted_counts = {}

        for table in tables_to_clear:
            try:
                # عد السجلات قبل الحذف
                count_result = conn.execute(text(f"SELECT COUNT(*) FROM {table}"))
                count = count_result.scalar()

                if count > 0:
                    # حذف البيانات
                    conn.execute(text(f"DELETE FROM {table}"))
                    deleted_counts[table] = count
                    print(f"  ✅ {table}: تم حذف {count} سجل")
                else:
                    print(f"  ⚪ {table}: لا توجد بيانات")

            except Exception as e:
                print(f"  ⚠️  {table}: خطأ - {str(e)}")

        # Commit التغييرات
        conn.commit()

    print("\n" + "=" * 60)
    print("✅ تم مسح جميع البيانات بنجاح!")
    print(f"📊 إجمالي الجداول المحذوفة: {len(deleted_counts)}")
    print(f"📊 إجمالي السجلات المحذوفة: {sum(deleted_counts.values())}")
    print("=" * 60)

if __name__ == "__main__":
    clear_all_data()
