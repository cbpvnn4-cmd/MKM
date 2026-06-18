#!/usr/bin/env python3
"""
Reset admin password and verify login works
"""
import os
import sys

# Add the backend directory to the Python path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.models.users import User, Role, UserRole
from app.core.security import verify_password, get_password_hash

# Use the same database as the application
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./elevator_management.db")

def reset_admin_password():
    """Reset admin password and verify"""
    
    engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False} if "sqlite" in DATABASE_URL else {})
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    db = SessionLocal()
    
    try:
        print("=" * 50)
        print("🔍 Checking Database...")
        print(f"📁 Database: {DATABASE_URL}")
        print("=" * 50)
        
        # Check all users
        users = db.query(User).all()
        print(f"\n👥 Users found: {len(users)}")
        
        for user in users:
            print(f"   - {user.username} | {user.email} | Active: {user.is_active}")
        
        # Find admin user
        admin_user = db.query(User).filter(User.username == "admin").first()
        
        if not admin_user:
            print("\n❌ Admin user not found! Creating new admin user...")
            
            # Create admin user
            admin_user = User(
                username="admin",
                email="admin@system.com",
                full_name="System Administrator",
                hashed_password=get_password_hash("admin123"),
                is_active=True,
                is_superuser=True
            )
            db.add(admin_user)
            db.commit()
            db.refresh(admin_user)
            print("✅ Admin user created!")
        else:
            print(f"\n✅ Admin user found: {admin_user.username}")
            print(f"   Email: {admin_user.email}")
            print(f"   Active: {admin_user.is_active}")
            print(f"   Superuser: {admin_user.is_superuser}")
            
            # Test current password
            print("\n🔑 Testing passwords...")
            test_passwords = ["admin123", "admin234", "admin", "password"]
            
            for pwd in test_passwords:
                if verify_password(pwd, admin_user.hashed_password):
                    print(f"   ✅ Password '{pwd}' is CORRECT!")
                    break
            else:
                print("   ❌ None of the common passwords work!")
            
            # Reset password to admin123
            print("\n🔄 Resetting password to 'admin123'...")
            admin_user.hashed_password = get_password_hash("admin123")
            admin_user.is_active = True  # Ensure user is active
            db.commit()
            print("✅ Password reset successfully!")
            
            # Verify new password works
            db.refresh(admin_user)
            if verify_password("admin123", admin_user.hashed_password):
                print("✅ Password verification: PASSED!")
            else:
                print("❌ Password verification: FAILED!")
        
        print("\n" + "=" * 50)
        print("🎉 Login Credentials:")
        print("   Username: admin")
        print("   Password: admin123")
        print("=" * 50)
        
    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()
    finally:
        db.close()

if __name__ == "__main__":
    reset_admin_password()
