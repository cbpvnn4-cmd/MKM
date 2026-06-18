#!/usr/bin/env python3
"""
Script to initialize RBAC system with default roles and permissions
"""

from sqlalchemy.orm import Session
from app.database.database import SessionLocal, engine
from app.models.users import User, Role, Permission, UserRole, RolePermission, Base
from app.core.permissions import DEFAULT_PERMISSIONS, PERMISSIONS
from app.core.security import get_password_hash
import os

def init_database():
    """Create all tables"""
    Base.metadata.create_all(bind=engine)
    print("✅ Database tables created")

def init_permissions(db: Session):
    """Initialize default permissions"""
    print("🔐 Initializing permissions...")

    for perm_data in DEFAULT_PERMISSIONS:
        existing = db.query(Permission).filter(Permission.name == perm_data["name"]).first()
        if not existing:
            permission = Permission(**perm_data)
            db.add(permission)
            print(f"  ➕ Added permission: {perm_data['name']}")
        else:
            print(f"  ⏭️  Permission exists: {perm_data['name']}")

    db.commit()
    print("✅ Permissions initialized")

def init_roles(db: Session):
    """Initialize default roles with their permissions"""
    print("👥 Initializing roles...")

    # Define default roles and their permissions
    default_roles = {
        "super_admin": {
            "description": "Super Administrator with all permissions",
            "permissions": [getattr(PERMISSIONS, attr) for attr in dir(PERMISSIONS) if not attr.startswith('_')]
        },
        "admin": {
            "description": "Administrator",
            "permissions": [
                PERMISSIONS.MANAGE_USERS,
                PERMISSIONS.VIEW_USERS,
                PERMISSIONS.MANAGE_PARTNERS,
                PERMISSIONS.VIEW_PARTNERS,
                PERMISSIONS.MANAGE_CUSTOMERS,
                PERMISSIONS.VIEW_CUSTOMERS,
                PERMISSIONS.MANAGE_PROJECTS,
                PERMISSIONS.VIEW_PROJECTS,
                PERMISSIONS.MANAGE_SALES,
                PERMISSIONS.VIEW_SALES,
                PERMISSIONS.MANAGE_FINANCES,
                PERMISSIONS.VIEW_FINANCES,
                PERMISSIONS.MANAGE_PROFIT_DISTRIBUTION,
                PERMISSIONS.VIEW_PROFIT_DISTRIBUTION,
                PERMISSIONS.MANAGE_INVENTORY,
                PERMISSIONS.VIEW_INVENTORY,
                PERMISSIONS.MANAGE_MAINTENANCE,
                PERMISSIONS.VIEW_MAINTENANCE,
                PERMISSIONS.VIEW_REPORTS,
                PERMISSIONS.EXPORT_REPORTS
            ]
        },
        "finance_manager": {
            "description": "Finance Manager",
            "permissions": [
                PERMISSIONS.VIEW_PARTNERS,
                PERMISSIONS.VIEW_CUSTOMERS,
                PERMISSIONS.VIEW_PROJECTS,
                PERMISSIONS.MANAGE_SALES,
                PERMISSIONS.VIEW_SALES,
                PERMISSIONS.MANAGE_FINANCES,
                PERMISSIONS.VIEW_FINANCES,
                PERMISSIONS.MANAGE_PROFIT_DISTRIBUTION,
                PERMISSIONS.VIEW_PROFIT_DISTRIBUTION,
                PERMISSIONS.VIEW_REPORTS,
                PERMISSIONS.EXPORT_REPORTS
            ]
        },
        "sales_manager": {
            "description": "Sales Manager",
            "permissions": [
                PERMISSIONS.MANAGE_CUSTOMERS,
                PERMISSIONS.VIEW_CUSTOMERS,
                PERMISSIONS.MANAGE_PROJECTS,
                PERMISSIONS.VIEW_PROJECTS,
                PERMISSIONS.MANAGE_SALES,
                PERMISSIONS.VIEW_SALES,
                PERMISSIONS.VIEW_FINANCES,
                PERMISSIONS.VIEW_PROFIT_DISTRIBUTION,
                PERMISSIONS.VIEW_REPORTS
            ]
        },
        "warehouse_manager": {
            "description": "Warehouse Manager",
            "permissions": [
                PERMISSIONS.VIEW_CUSTOMERS,
                PERMISSIONS.VIEW_PROJECTS,
                PERMISSIONS.VIEW_SALES,
                PERMISSIONS.MANAGE_INVENTORY,
                PERMISSIONS.VIEW_INVENTORY,
                PERMISSIONS.MANAGE_MAINTENANCE,
                PERMISSIONS.VIEW_MAINTENANCE,
                PERMISSIONS.VIEW_REPORTS
            ]
        },
        "employee": {
            "description": "Employee",
            "permissions": [
                PERMISSIONS.VIEW_CUSTOMERS,
                PERMISSIONS.VIEW_PROJECTS,
                PERMISSIONS.VIEW_SALES,
                PERMISSIONS.VIEW_INVENTORY,
                PERMISSIONS.VIEW_MAINTENANCE
            ]
        },
        "viewer": {
            "description": "Read-only access",
            "permissions": [
                PERMISSIONS.VIEW_CUSTOMERS,
                PERMISSIONS.VIEW_PROJECTS,
                PERMISSIONS.VIEW_SALES,
                PERMISSIONS.VIEW_INVENTORY,
                PERMISSIONS.VIEW_MAINTENANCE,
                PERMISSIONS.VIEW_REPORTS
            ]
        }
    }

    for role_name, role_data in default_roles.items():
        # Create or get role
        role = db.query(Role).filter(Role.name == role_name).first()
        if not role:
            role = Role(
                name=role_name,
                description=role_data["description"]
            )
            db.add(role)
            db.commit()
            db.refresh(role)
            print(f"  ➕ Added role: {role_name}")
        else:
            print(f"  ⏭️  Role exists: {role_name}")

        # Clear existing permissions for this role
        db.query(RolePermission).filter(RolePermission.role_id == role.id).delete()

        # Add permissions to role
        for permission_name in role_data["permissions"]:
            permission = db.query(Permission).filter(Permission.name == permission_name).first()
            if permission:
                role_permission = RolePermission(
                    role_id=role.id,
                    permission_id=permission.id
                )
                db.add(role_permission)

        db.commit()
        print(f"  🔗 Assigned {len(role_data['permissions'])} permissions to {role_name}")

    print("✅ Roles initialized")

def create_admin_user(db: Session):
    """Create default admin user if not exists"""
    print("👤 Creating admin user...")

    admin_user = db.query(User).filter(User.username == "admin").first()
    if admin_user:
        print("  ⏭️  Admin user already exists")
        return

    # Create admin user
    admin_user = User(
        username="admin",
        email="admin@mamar-alsharq.com",
        full_name="System Administrator",
        hashed_password=get_password_hash("admin123"),
        is_superuser=True,
        is_active=True
    )

    db.add(admin_user)
    db.commit()
    db.refresh(admin_user)

    # Assign super_admin role
    super_admin_role = db.query(Role).filter(Role.name == "super_admin").first()
    if super_admin_role:
        user_role = UserRole(
            user_id=admin_user.id,
            role_id=super_admin_role.id
        )
        db.add(user_role)
        db.commit()

    print("  ➕ Admin user created (username: admin, password: admin123)")
    print("✅ Admin user initialized")

def create_demo_users(db: Session):
    """Create demo users for testing"""
    print("👥 Creating demo users...")

    demo_users = [
        {
            "username": "finance_mgr",
            "email": "finance@mamar-alsharq.com",
            "full_name": "Finance Manager",
            "password": "finance123",
            "role": "finance_manager"
        },
        {
            "username": "sales_mgr",
            "email": "sales@mamar-alsharq.com",
            "full_name": "Sales Manager",
            "password": "sales123",
            "role": "sales_manager"
        },
        {
            "username": "warehouse_mgr",
            "email": "warehouse@mamar-alsharq.com",
            "full_name": "Warehouse Manager",
            "password": "warehouse123",
            "role": "warehouse_manager"
        },
        {
            "username": "employee1",
            "email": "employee1@mamar-alsharq.com",
            "full_name": "Employee One",
            "password": "employee123",
            "role": "employee"
        }
    ]

    for user_data in demo_users:
        existing_user = db.query(User).filter(User.username == user_data["username"]).first()
        if existing_user:
            print(f"  ⏭️  User exists: {user_data['username']}")
            continue

        # Create user
        user = User(
            username=user_data["username"],
            email=user_data["email"],
            full_name=user_data["full_name"],
            hashed_password=get_password_hash(user_data["password"]),
            is_active=True
        )

        db.add(user)
        db.commit()
        db.refresh(user)

        # Assign role
        role = db.query(Role).filter(Role.name == user_data["role"]).first()
        if role:
            user_role = UserRole(
                user_id=user.id,
                role_id=role.id
            )
            db.add(user_role)
            db.commit()

        print(f"  ➕ Created user: {user_data['username']} ({user_data['role']})")

    print("✅ Demo users created")

def main():
    """Main initialization function"""
    print("🚀 Initializing RBAC system for Mamar Al-Sharq Management System")
    print("=" * 60)

    # Create database session
    db = SessionLocal()

    try:
        # Initialize database
        init_database()

        # Initialize permissions
        init_permissions(db)

        # Initialize roles
        init_roles(db)

        # Create admin user
        create_admin_user(db)

        # Create demo users
        create_demo_users(db)

        print("=" * 60)
        print("✅ RBAC system initialized successfully!")
        print("")
        print("Default login credentials:")
        print("  Admin: admin / admin123")
        print("  Finance Manager: finance_mgr / finance123")
        print("  Sales Manager: sales_mgr / sales123")
        print("  Warehouse Manager: warehouse_mgr / warehouse123")
        print("  Employee: employee1 / employee123")
        print("")
        print("🔐 Please change default passwords after first login!")

    except Exception as e:
        print(f"❌ Error initializing RBAC system: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    main()
