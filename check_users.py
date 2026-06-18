import sqlite3

conn = sqlite3.connect('elevator_management.db')
cursor = conn.cursor()

# Get table schema
cursor.execute("PRAGMA table_info(users)")
columns = cursor.fetchall()
print("Users table columns:")
for col in columns:
    print(f"  {col[1]} ({col[2]})")

print("\n" + "="*50)

# Get all users
cursor.execute("SELECT * FROM users LIMIT 5")
users = cursor.fetchall()
print(f"\nUsers found: {len(users)}")

column_names = [col[1] for col in columns]
for user in users:
    print(f"\nUser ID: {user[0]}")
    for i, col_name in enumerate(column_names):
        if i < len(user):
            print(f"  {col_name}: {user[i]}")

conn.close()
