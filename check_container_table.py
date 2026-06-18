import sqlite3

conn = sqlite3.connect('elevator_management.db')
cursor = conn.cursor()

# Get purchase_order_containers table schema
cursor.execute("PRAGMA table_info(purchase_order_containers)")
columns = cursor.fetchall()

print("="*60)
print("purchase_order_containers Table Schema:")
print("="*60)

for col in columns:
    col_id, name, type_name, notnull, default, pk = col
    pk_info = " [PRIMARY KEY]" if pk else ""
    auto_info = ""

    # Check if this is an INTEGER PRIMARY KEY
    if pk and type_name.upper() == "INTEGER":
        # Get CREATE TABLE statement to check for AUTOINCREMENT
        cursor.execute("SELECT sql FROM sqlite_master WHERE type='table' AND name='purchase_order_containers'")
        create_stmt = cursor.fetchone()[0]
        if "AUTOINCREMENT" in create_stmt.upper():
            auto_info = " [AUTOINCREMENT]"

    print(f"{name:25} {type_name:15} {'NOT NULL' if notnull else '        '} {pk_info}{auto_info}")

print("\n" + "="*60)
print("Full CREATE TABLE Statement:")
print("="*60)

cursor.execute("SELECT sql FROM sqlite_master WHERE type='table' AND name='purchase_order_containers'")
create_stmt = cursor.fetchone()
if create_stmt:
    print(create_stmt[0])
else:
    print("Table not found!")

# Check existing data
print("\n" + "="*60)
print("Existing Data:")
print("="*60)

cursor.execute("SELECT COUNT(*) FROM purchase_order_containers")
count = cursor.fetchone()[0]
print(f"Total records: {count}")

if count > 0:
    cursor.execute("SELECT id, container_no, size FROM purchase_order_containers LIMIT 5")
    for row in cursor.fetchall():
        print(f"  ID: {row[0]}, Container: {row[1]}, Size: {row[2]}")

conn.close()
