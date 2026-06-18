# -*- coding: utf-8 -*-
"""
Quick Fix: Change RECEIVED purchase orders to CONFIRMED
So they can be deleted from the web interface
"""
import sqlite3

db_path = r'backend\elevator_management.db'

conn = sqlite3.connect(db_path)
cursor = conn.cursor()

# Find all RECEIVED purchase orders
cursor.execute("SELECT id, po_no, status FROM purchase_orders WHERE status = 'RECEIVED'")
received_pos = cursor.fetchall()

if not received_pos:
    print("No RECEIVED purchase orders found.")
    print("All purchase orders can be deleted normally.")
    conn.close()
    exit(0)

print("="*70)
print("Found RECEIVED Purchase Orders:")
print("="*70)
for po in received_pos:
    print(f"ID: {po[0]} | PO: {po[1]} | Status: {po[2]}")

print("\n" + "="*70)
confirm = input("Change all RECEIVED to CONFIRMED? (yes/no): ")

if confirm.lower() not in ['yes', 'y']:
    print("Cancelled.")
    conn.close()
    exit(0)

# Update all RECEIVED to CONFIRMED
cursor.execute("UPDATE purchase_orders SET status = 'CONFIRMED' WHERE status = 'RECEIVED'")
count = cursor.rowcount

conn.commit()

print("\n" + "="*70)
print("SUCCESS!")
print("="*70)
print(f"Changed {count} purchase order(s) from RECEIVED to CONFIRMED")
print("\nYou can now delete them from the web interface at:")
print("http://localhost:3001/purchase-orders")
print("="*70)

conn.close()
