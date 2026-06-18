import sqlite3
conn = sqlite3.connect('elevator_management.db')
cursor = conn.cursor()
cursor.execute('SELECT id, username, email, is_active, is_superuser FROM users')
users = cursor.fetchall()
print('\n=== المستخدمين في قاعدة البيانات ===\n')
for u in users:
    print(f'ID: {u[0]}')
    print(f'Username: {u[1]}')
    print(f'Email: {u[2]}')
    print(f'Active: {"نعم" if u[3] else "لا"}')
    print(f'Admin: {"نعم" if u[4] else "لا"}')
    print('-' * 40)
conn.close()
