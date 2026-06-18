"""
Reset admin password to admin123
"""
import sqlite3
from passlib.context import CryptContext

# Password hashing setup (same as backend)
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# Database connection
conn = sqlite3.connect('elevator_management.db')
cursor = conn.cursor()

try:
    # Check if admin exists
    cursor.execute("SELECT id, username, hashed_password FROM users WHERE username = ?", ('admin',))
    admin = cursor.fetchone()
    
    if admin:
        print(f"Found admin user with ID: {admin[0]}")
        print(f"Current password hash: {admin[2][:60]}...")
        
        # Generate new hash for admin123
        new_password = "admin123"
        new_hash = pwd_context.hash(new_password)
        
        # Update the password
        cursor.execute("UPDATE users SET hashed_password = ? WHERE username = ?", (new_hash, 'admin'))
        conn.commit()
        
        # Verify the update
        cursor.execute("SELECT hashed_password FROM users WHERE username = ?", ('admin',))
        updated = cursor.fetchone()
        
        # Test the new password
        if pwd_context.verify(new_password, updated[0]):
            print("\n" + "=" * 60)
            print("SUCCESS! Admin password has been reset!")
            print("=" * 60)
            print(f"Username: admin")
            print(f"Password: {new_password}")
            print("=" * 60)
        else:
            print("ERROR: Password verification failed!")
    else:
        print("No admin user found! Creating new admin user...")
        
        # Create admin user with password: admin123
        hashed_password = pwd_context.hash("admin123")
        from datetime import datetime
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
        print("\n" + "=" * 60)
        print("SUCCESS! Admin user created!")
        print("=" * 60)
        print("Username: admin")
        print("Password: admin123")
        print("=" * 60)

except Exception as e:
    print(f"Error: {e}")
    conn.rollback()
finally:
    conn.close()
