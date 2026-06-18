#!/usr/bin/env python3
"""
Check if users exist in the database
"""
import os
import sys
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.models.users import User, Role, UserRole

# Database URL
DATABASE_URL = "sqlite:///./elevator_management.db"

def check_users():
    """Check existing users in database"""

    engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    db = SessionLocal()

    try:
        print("=== Checking Database ===")

        # Check users
        users = db.query(User).all()
        print(f"\nUsers found: {len(users)}")

        for user in users:
            print(f"- {user.username} | {user.email} | Active: {user.is_active}")

        # Check roles
        roles = db.query(Role).all()
        print(f"\nRoles found: {len(roles)}")

        for role in roles:
            print(f"- {role.name} | {role.description}")

        # Check user roles
        user_roles = db.query(UserRole).all()
        print(f"\nUser-Role assignments: {len(user_roles)}")

        for ur in user_roles:
            user = db.query(User).filter(User.id == ur.user_id).first()
            role = db.query(Role).filter(Role.id == ur.role_id).first()
            if user and role:
                print(f"- {user.username} -> {role.name}")

        print("\n=== Login Test ===")

        # Test admin password
        from app.core.security import verify_password
        admin_user = db.query(User).filter(User.username == "admin").first()

        if admin_user:
            is_correct = verify_password("admin123", admin_user.hashed_password)
            print(f"Admin password test: {'PASS' if is_correct else 'FAIL'}")
            print(f"Admin is active: {admin_user.is_active}")
        else:
            print("Admin user not found!")

    except Exception as e:
        print(f"Error: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    check_users()