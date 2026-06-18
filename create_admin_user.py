import sqlite3
from datetime import datetime
from passlib.context import CryptContext

# Password hashing setup (same as backend)
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# Database connection
conn = sqlite3.connect('elevator_management.db')
cursor = conn.cursor()

try:
    # Check if admin already exists
    cursor.execute("SELECT id, username FROM users WHERE username = ?", ('admin',))
    existing_admin = cursor.fetchone()

    if existing_admin:
        print(f"Admin user already exists with ID: {existing_admin[0]}")
    else:
        # Create admin user with password: admin123
        hashed_password = pwd_context.hash("admin123")
        now = datetime.now().isoformat()

        cursor.execute("""
            INSERT INTO users
            (username, email, hashed_password, full_name, phone, is_active, is_superuser,
             created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            'admin',
            'admin@elevators.com',
            hashed_password,
            'Administrator',
            '0500000000',
            True,  # is_active
            True,  # is_superuser
            now,
            now
        ))

        conn.commit()

        # Verify creation
        cursor.execute("SELECT id, username, full_name FROM users WHERE username = ?", ('admin',))
        new_admin = cursor.fetchone()

        print("=" * 60)
        print("Admin user created successfully!")
        print("=" * 60)
        print(f"User ID: {new_admin[0]}")
        print(f"Username: {new_admin[1]}")
        print(f"Full Name: {new_admin[2]}")
        print(f"Password: admin123")
        print("=" * 60)
        print("\nYou can now login with:")
        print("  Username: admin")
        print("  Password: admin123")
        print("=" * 60)

except Exception as e:
    print(f"Error creating admin user: {e}")
    conn.rollback()
finally:
    conn.close()
