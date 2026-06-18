#!/usr/bin/env python3
"""
Script to create an admin user for the elevator management system
"""
import os
import sys
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.models.users import User, Role, UserRole
from app.core.security import get_password_hash

# Database URL
DATABASE_URL = "sqlite:///./elevator_management.db"

def create_admin_user():
    """Create an admin user if it doesn't exist"""

    # Create database engine
    engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

    # Create session
    db = SessionLocal()

    try:
        # Check if admin user exists
        admin_user = db.query(User).filter(User.username == "admin").first()

        if admin_user:
            print("Admin user already exists!")
            return

        # Create admin role if it doesn't exist
        admin_role = db.query(Role).filter(Role.name == "ADMIN").first()
        if not admin_role:
            admin_role = Role(
                name="ADMIN",
                description="System Administrator",
                is_active=True
            )
            db.add(admin_role)
            db.flush()
            print("Created ADMIN role")

        # Create admin user
        hashed_password = get_password_hash("admin123")  # Default password
        admin_user = User(
            username="admin",
            email="admin@example.com",
            full_name="System Administrator",
            hashed_password=hashed_password,
            is_active=True,
            is_superuser=True
        )

        db.add(admin_user)
        db.flush()

        # Assign admin role to admin user
        user_role = UserRole(
            user_id=admin_user.id,
            role_id=admin_role.id
        )
        db.add(user_role)

        db.commit()

        print("Admin user created successfully!")
        print("Username: admin")
        print("Password: admin123")
        print("Please change the password after first login!")

    except Exception as e:
        print(f"Error creating admin user: {e}")
        db.rollback()
    finally:
        db.close()

def create_sample_users():
    """Create some sample users for testing"""

    engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    db = SessionLocal()

    try:
        # Sample users data
        sample_users = [
            {
                "username": "accountant",
                "email": "accountant@example.com",
                "full_name": "محاسب النظام",
                "password": "accountant123",
                "role": "ACCOUNTANT"
            },
            {
                "username": "sales",
                "email": "sales@example.com",
                "full_name": "مندوب المبيعات",
                "password": "sales123",
                "role": "SALES"
            },
            {
                "username": "warehouse",
                "email": "warehouse@example.com",
                "full_name": "أمين المخزون",
                "password": "warehouse123",
                "role": "WAREHOUSE"
            }
        ]

        # Create roles if they don't exist
        roles_data = [
            {"name": "ACCOUNTANT", "description": "المحاسب"},
            {"name": "SALES", "description": "المبيعات"},
            {"name": "WAREHOUSE", "description": "المخزون"},
            {"name": "TECH", "description": "الصيانة"},
            {"name": "PARTNER", "description": "الشريك"}
        ]

        created_roles = {}
        for role_data in roles_data:
            role = db.query(Role).filter(Role.name == role_data["name"]).first()
            if not role:
                role = Role(
                    name=role_data["name"],
                    description=role_data["description"],
                    is_active=True
                )
                db.add(role)
                db.flush()
                print(f"Created role: {role.name}")
            created_roles[role.name] = role

        # Create sample users
        for user_data in sample_users:
            existing_user = db.query(User).filter(User.username == user_data["username"]).first()
            if existing_user:
                print(f"User {user_data['username']} already exists")
                continue

            hashed_password = get_password_hash(user_data["password"])
            user = User(
                username=user_data["username"],
                email=user_data["email"],
                full_name=user_data["full_name"],
                hashed_password=hashed_password,
                is_active=True,
                is_superuser=False
            )

            db.add(user)
            db.flush()

            # Assign role
            role = created_roles.get(user_data["role"])
            if role:
                user_role = UserRole(user_id=user.id, role_id=role.id)
                db.add(user_role)

            print(f"Created user: {user.username}")

        db.commit()
        print("\nSample users created successfully!")

    except Exception as e:
        print(f"Error creating sample users: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    print("Creating admin user and sample data...")
    create_admin_user()
    create_sample_users()

    print("\nAvailable Users:")
    print("Username: admin       | Password: admin123      | Role: ADMIN")
    print("Username: accountant  | Password: accountant123 | Role: ACCOUNTANT")
    print("Username: sales       | Password: sales123      | Role: SALES")
    print("Username: warehouse   | Password: warehouse123  | Role: WAREHOUSE")
    print("\nPlease change passwords after first login!")