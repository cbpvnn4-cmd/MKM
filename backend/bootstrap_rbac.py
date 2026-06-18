#!/usr/bin/env python3
"""
Bootstrap RBAC: create tables, seed permissions/roles, and create users.
Safe for SQLite local dev.
"""

from sqlalchemy.orm import Session
from app.database.database import SessionLocal, engine, Base
from app.models.users import User, Role, Permission, UserRole, RolePermission
from app.core.permissions import PERMISSIONS
from app.core.security import get_password_hash


def init_database():
    Base.metadata.create_all(bind=engine)
    print("Tables created")


def init_permissions(db: Session):
    print("Seeding permissions...")
    names = [getattr(PERMISSIONS, a) for a in dir(PERMISSIONS) if not a.startswith('_')]
    for name in names:
        existing = db.query(Permission).filter(Permission.name == name).first()
        if not existing:
            parts = name.split('_', 1)
            action = parts[0] if parts else 'view'
            resource = parts[1] if len(parts) > 1 else name
            desc = f"{action.title()} {resource.replace('_', ' ').title()}"
            db.add(Permission(name=name, description=desc, resource=resource, action=action))
    db.commit()
    print("Permissions ready")


def init_roles(db: Session):
    print("Seeding roles...")
    perms = {p.name: p for p in db.query(Permission).all()}
    # Helper to build list by names
    def P(*names):
        return [perms[n] for n in names if n in perms]

    all_perm_names = [getattr(PERMISSIONS, a) for a in dir(PERMISSIONS) if not a.startswith('_')]

    roles_def = {
        'super_admin': all_perm_names,
        'admin': [
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
            PERMISSIONS.EXPORT_REPORTS,
        ],
        'finance_manager': [
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
            PERMISSIONS.EXPORT_REPORTS,
        ],
        'sales_manager': [
            PERMISSIONS.MANAGE_CUSTOMERS,
            PERMISSIONS.VIEW_CUSTOMERS,
            PERMISSIONS.MANAGE_PROJECTS,
            PERMISSIONS.VIEW_PROJECTS,
            PERMISSIONS.MANAGE_SALES,
            PERMISSIONS.VIEW_SALES,
            PERMISSIONS.VIEW_FINANCES,
            PERMISSIONS.VIEW_PROFIT_DISTRIBUTION,
            PERMISSIONS.VIEW_REPORTS,
        ],
        'warehouse_manager': [
            PERMISSIONS.VIEW_CUSTOMERS,
            PERMISSIONS.VIEW_PROJECTS,
            PERMISSIONS.VIEW_SALES,
            PERMISSIONS.MANAGE_INVENTORY,
            PERMISSIONS.VIEW_INVENTORY,
            PERMISSIONS.MANAGE_MAINTENANCE,
            PERMISSIONS.VIEW_MAINTENANCE,
            PERMISSIONS.VIEW_REPORTS,
        ],
        'employee': [
            PERMISSIONS.VIEW_CUSTOMERS,
            PERMISSIONS.VIEW_PROJECTS,
            PERMISSIONS.VIEW_SALES,
            PERMISSIONS.VIEW_INVENTORY,
            PERMISSIONS.VIEW_MAINTENANCE,
        ],
        'viewer': [
            PERMISSIONS.VIEW_CUSTOMERS,
            PERMISSIONS.VIEW_PROJECTS,
            PERMISSIONS.VIEW_SALES,
            PERMISSIONS.VIEW_INVENTORY,
            PERMISSIONS.VIEW_MAINTENANCE,
            PERMISSIONS.VIEW_REPORTS,
        ],
    }

    for role_name, perm_names in roles_def.items():
        role = db.query(Role).filter(Role.name == role_name).first()
        if not role:
            role = Role(name=role_name, description=role_name.replace('_', ' ').title())
            db.add(role)
            db.commit()
            db.refresh(role)

        # clear existing
        db.query(RolePermission).filter(RolePermission.role_id == role.id).delete()
        for p in P(*perm_names):
            db.add(RolePermission(role_id=role.id, permission_id=p.id))
        db.commit()
    print("Roles ready")


def create_users(db: Session):
    print("Creating users...")
    def ensure_user(username, email, full_name, password, is_super=False, role=None):
        u = db.query(User).filter(User.username == username).first()
        if not u:
            u = User(
                username=username,
                email=email,
                full_name=full_name,
                hashed_password=get_password_hash(password),
                is_superuser=is_super,
                is_active=True,
            )
            db.add(u)
            db.commit()
            db.refresh(u)
        if role:
            r = db.query(Role).filter(Role.name == role).first()
            if r:
                exists = db.query(UserRole).filter(UserRole.user_id == u.id, UserRole.role_id == r.id).first()
                if not exists:
                    db.add(UserRole(user_id=u.id, role_id=r.id))
                    db.commit()

    ensure_user('admin', 'admin@mamar-alsharq.com', 'System Administrator', 'admin123', True, 'super_admin')
    ensure_user('finance_mgr', 'finance@mamar-alsharq.com', 'Finance Manager', 'finance123', False, 'finance_manager')
    ensure_user('sales_mgr', 'sales@mamar-alsharq.com', 'Sales Manager', 'sales123', False, 'sales_manager')
    ensure_user('warehouse_mgr', 'warehouse@mamar-alsharq.com', 'Warehouse Manager', 'warehouse123', False, 'warehouse_manager')
    ensure_user('employee1', 'employee1@mamar-alsharq.com', 'Employee One', 'employee123', False, 'employee')
    print("Users ready")


def main():
    db = SessionLocal()
    try:
        init_database()
        init_permissions(db)
        init_roles(db)
        create_users(db)
        print("RBAC bootstrap complete")
    finally:
        db.close()


if __name__ == '__main__':
    main()

