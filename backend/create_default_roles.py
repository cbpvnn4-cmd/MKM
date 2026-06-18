"""
Script to create default roles and permissions in the database
Run this script to initialize the RBAC system with default roles
"""
import sys
import io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

from app.database.database import SessionLocal
from app.models.users import Role, Permission, RolePermission
from app.core.permissions import PERMISSIONS, DEFAULT_PERMISSIONS, init_permissions


def create_default_roles():
    """Create default roles in the database"""
    db = SessionLocal()

    try:
        # Initialize permissions first
        print("Initializing permissions...")
        init_permissions(db)
        print("✓ Permissions initialized")

        # Define default roles
        default_roles = [
            {
                "name": "Admin",
                "description": "مدير النظام - صلاحيات كاملة",
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
                    PERMISSIONS.EXPORT_REPORTS,
                    PERMISSIONS.MANAGE_SETTINGS
                ]
            },
            {
                "name": "Manager",
                "description": "مدير - صلاحيات إدارية محدودة",
                "permissions": [
                    PERMISSIONS.VIEW_USERS,
                    PERMISSIONS.MANAGE_PARTNERS,
                    PERMISSIONS.VIEW_PARTNERS,
                    PERMISSIONS.MANAGE_CUSTOMERS,
                    PERMISSIONS.VIEW_CUSTOMERS,
                    PERMISSIONS.MANAGE_PROJECTS,
                    PERMISSIONS.VIEW_PROJECTS,
                    PERMISSIONS.MANAGE_SALES,
                    PERMISSIONS.VIEW_SALES,
                    PERMISSIONS.VIEW_FINANCES,
                    PERMISSIONS.VIEW_PROFIT_DISTRIBUTION,
                    PERMISSIONS.VIEW_INVENTORY,
                    PERMISSIONS.VIEW_MAINTENANCE,
                    PERMISSIONS.VIEW_REPORTS,
                    PERMISSIONS.EXPORT_REPORTS
                ]
            },
            {
                "name": "Accountant",
                "description": "محاسب - صلاحيات مالية",
                "permissions": [
                    PERMISSIONS.VIEW_USERS,
                    PERMISSIONS.VIEW_PARTNERS,
                    PERMISSIONS.VIEW_CUSTOMERS,
                    PERMISSIONS.VIEW_PROJECTS,
                    PERMISSIONS.VIEW_SALES,
                    PERMISSIONS.MANAGE_FINANCES,
                    PERMISSIONS.VIEW_FINANCES,
                    PERMISSIONS.MANAGE_PROFIT_DISTRIBUTION,
                    PERMISSIONS.VIEW_PROFIT_DISTRIBUTION,
                    PERMISSIONS.VIEW_INVENTORY,
                    PERMISSIONS.VIEW_REPORTS,
                    PERMISSIONS.EXPORT_REPORTS
                ]
            },
            {
                "name": "User",
                "description": "مستخدم عادي - صلاحيات قراءة فقط",
                "permissions": [
                    PERMISSIONS.VIEW_USERS,
                    PERMISSIONS.VIEW_PARTNERS,
                    PERMISSIONS.VIEW_CUSTOMERS,
                    PERMISSIONS.VIEW_PROJECTS,
                    PERMISSIONS.VIEW_SALES,
                    PERMISSIONS.VIEW_FINANCES,
                    PERMISSIONS.VIEW_INVENTORY,
                    PERMISSIONS.VIEW_MAINTENANCE,
                    PERMISSIONS.VIEW_REPORTS
                ]
            }
        ]

        # Create roles
        print("\nCreating default roles...")
        for role_data in default_roles:
            # Check if role exists
            existing_role = db.query(Role).filter(Role.name == role_data["name"]).first()

            if existing_role:
                print(f"  ⊗ Role '{role_data['name']}' already exists")
                role = existing_role
            else:
                # Create new role
                role = Role(
                    name=role_data["name"],
                    description=role_data["description"]
                )
                db.add(role)
                db.commit()
                db.refresh(role)
                print(f"  ✓ Created role '{role_data['name']}'")

            # Assign permissions to role
            for perm_name in role_data["permissions"]:
                permission = db.query(Permission).filter(Permission.name == perm_name).first()
                if permission:
                    # Check if permission already assigned
                    existing_rp = db.query(RolePermission).filter(
                        RolePermission.role_id == role.id,
                        RolePermission.permission_id == permission.id
                    ).first()

                    if not existing_rp:
                        role_permission = RolePermission(
                            role_id=role.id,
                            permission_id=permission.id
                        )
                        db.add(role_permission)

        db.commit()
        print("\n✓ All default roles created successfully!")

        # Print summary
        print("\n" + "="*60)
        print("ROLES SUMMARY:")
        print("="*60)
        roles = db.query(Role).all()
        for role in roles:
            role_perms = db.query(RolePermission).filter(RolePermission.role_id == role.id).count()
            print(f"  • {role.name}: {role_perms} permissions")
        print("="*60)

    except Exception as e:
        print(f"\n✗ Error: {e}")
        db.rollback()
        raise
    finally:
        db.close()


if __name__ == "__main__":
    print("="*60)
    print("CREATING DEFAULT ROLES AND PERMISSIONS")
    print("="*60)
    create_default_roles()
    print("\nDone! You can now assign these roles to users.")
