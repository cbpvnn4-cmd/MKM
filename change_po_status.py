# -*- coding: utf-8 -*-
"""
Change Purchase Order Status
"""
import sqlite3

# Database path
db_path = r'backend\elevator_management.db'

print("="*70)
print("Change Purchase Order Status")
print("="*70)

conn = sqlite3.connect(db_path)
cursor = conn.cursor()

# Show all purchase orders
cursor.execute("SELECT id, po_no, status FROM purchase_orders ORDER BY id")
pos = cursor.fetchall()

print("\nCurrent Purchase Orders:")
print("-"*70)
print("ID | PO Number               | Status")
print("-"*70)
for po in pos:
    print(f"{po[0]:2} | {po[1]:23} | {po[2]}")

# Get PO ID to change
print("\n" + "="*70)
po_id = input("Enter PO ID to change status (or press Enter to cancel): ")

if not po_id or not po_id.strip():
    print("Cancelled.")
    conn.close()
    exit(0)

try:
    po_id = int(po_id.strip())
except:
    print("Invalid ID!")
    conn.close()
    exit(1)

# Check if PO exists
cursor.execute("SELECT id, po_no, status FROM purchase_orders WHERE id = ?", (po_id,))
current_po = cursor.fetchone()

if not current_po:
    print(f"Purchase Order ID {po_id} not found!")
    conn.close()
    exit(1)

print(f"\nCurrent PO: {current_po[1]}")
print(f"Current Status: {current_po[2]}")

# Show available statuses
print("\nAvailable Statuses:")
print("  1. DRAFT      - Draft")
print("  2. CONFIRMED  - Confirmed")
print("  3. RECEIVED   - Received")
print("  4. CANCELLED  - Cancelled")

new_status = input("\nEnter new status number (1-4): ")

status_map = {
    "1": "DRAFT",
    "2": "CONFIRMED",
    "3": "RECEIVED",
    "4": "CANCELLED"
}

if new_status not in status_map:
    print("Invalid choice!")
    conn.close()
    exit(1)

new_status_text = status_map[new_status]

# Update status
cursor.execute(
    "UPDATE purchase_orders SET status = ? WHERE id = ?",
    (new_status_text, po_id)
)

conn.commit()

print("\n" + "="*70)
print("SUCCESS!")
print("="*70)
print(f"PO ID: {po_id}")
print(f"PO Number: {current_po[1]}")
print(f"Old Status: {current_po[2]}")
print(f"New Status: {new_status_text}")
print("="*70)

# If changed from RECEIVED to something else, note about deletion
if current_po[2] == "RECEIVED" and new_status_text != "RECEIVED":
    print("\nNote: You can now delete this purchase order from the web interface.")

conn.close()
