from typing import List, Optional
from fastapi import HTTPException, status, Depends
from sqlalchemy.orm import Session
from app.database.database import get_db
from app.models.users import User, Role, Permission, UserRole, RolePermission
from app.routers.auth import get_current_active_user


# Define all permissions as constants
class PERMISSIONS:
    # User management
    MANAGE_USERS = "manage_users"
    VIEW_USERS = "view_users"

    # Partner management
    MANAGE_PARTNERS = "manage_partners"
    VIEW_PARTNERS = "view_partners"

    # Customer management
    MANAGE_CUSTOMERS = "manage_customers"
    VIEW_CUSTOMERS = "view_customers"

    # Project management
    MANAGE_PROJECTS = "manage_projects"
    VIEW_PROJECTS = "view_projects"

    # Sales management
    MANAGE_SALES = "manage_sales"
    VIEW_SALES = "view_sales"

    # Financial management
    MANAGE_FINANCES = "manage_finances"
    VIEW_FINANCES = "view_finances"
    MANAGE_PROFIT_DISTRIBUTION = "manage_profit_distribution"
    VIEW_PROFIT_DISTRIBUTION = "view_profit_distribution"

    # Inventory management
    MANAGE_INVENTORY = "manage_inventory"
    VIEW_INVENTORY = "view_inventory"

    # Maintenance management
    MANAGE_MAINTENANCE = "manage_maintenance"
    VIEW_MAINTENANCE = "view_maintenance"

    # Reports
    VIEW_REPORTS = "view_reports"
    EXPORT_REPORTS = "export_reports"

    # System settings
    MANAGE_SETTINGS = "manage_settings"


def get_user_permissions(user: User, db: Session) -> List[str]:
    """Get all permissions for a user based on their roles"""
    if user.is_superuser:
        # Super users have all permissions
        return [getattr(PERMISSIONS, attr) for attr in dir(PERMISSIONS) if not attr.startswith('_')]

    permissions = set()

    # Get user roles
    user_roles = db.query(UserRole).filter(UserRole.user_id == user.id).all()

    for user_role in user_roles:
        # Get role permissions
        role_permissions = db.query(RolePermission).filter(
            RolePermission.role_id == user_role.role_id
        ).all()

        for role_permission in role_permissions:
            permission = db.query(Permission).filter(
                Permission.id == role_permission.permission_id
            ).first()
            if permission:
                permissions.add(permission.name)

    return list(permissions)


def has_permission(user: User, required_permission: str, db: Session) -> bool:
    """Check if user has a specific permission"""
    if user.is_superuser:
        return True

    user_permissions = get_user_permissions(user, db)
    return required_permission in user_permissions


def has_any_permission(user: User, required_permissions: List[str], db: Session) -> bool:
    """Check if user has any of the required permissions"""
    if user.is_superuser:
        return True

    user_permissions = get_user_permissions(user, db)
    return any(perm in user_permissions for perm in required_permissions)


def has_all_permissions(user: User, required_permissions: List[str], db: Session) -> bool:
    """Check if user has all of the required permissions"""
    if user.is_superuser:
        return True

    user_permissions = get_user_permissions(user, db)
    return all(perm in user_permissions for perm in required_permissions)


def require_permission(permission: str):
    """Decorator to require a specific permission for an endpoint"""
    def decorator(func):
        def wrapper(
            *args,
            current_user: User = Depends(get_current_active_user),
            db: Session = Depends(get_db),
            **kwargs
        ):
            if not has_permission(current_user, permission, db):
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail=f"Permission required: {permission}"
                )
            return func(*args, current_user=current_user, db=db, **kwargs)
        return wrapper
    return decorator


def require_any_permission(permissions: List[str]):
    """Decorator to require any of the specified permissions for an endpoint"""
    def decorator(func):
        def wrapper(
            *args,
            current_user: User = Depends(get_current_active_user),
            db: Session = Depends(get_db),
            **kwargs
        ):
            if not has_any_permission(current_user, permissions, db):
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail=f"One of these permissions required: {', '.join(permissions)}"
                )
            return func(*args, current_user=current_user, db=db, **kwargs)
        return wrapper
    return decorator


def require_all_permissions(permissions: List[str]):
    """Decorator to require all of the specified permissions for an endpoint"""
    def decorator(func):
        def wrapper(
            *args,
            current_user: User = Depends(get_current_active_user),
            db: Session = Depends(get_db),
            **kwargs
        ):
            if not has_all_permissions(current_user, permissions, db):
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail=f"All of these permissions required: {', '.join(permissions)}"
                )
            return func(*args, current_user=current_user, db=db, **kwargs)
        return wrapper
    return decorator


# Role-based access control helpers
def is_admin_or_superuser(user: User, db: Session) -> bool:
    """Check if user is admin or superuser"""
    if user.is_superuser:
        return True

    user_roles = db.query(UserRole).filter(UserRole.user_id == user.id).all()
    for user_role in user_roles:
        role = db.query(Role).filter(Role.id == user_role.role_id).first()
        if role and role.name.lower() in ['admin', 'administrator']:
            return True

    return False


def can_manage_user(current_user: User, target_user: User, db: Session) -> bool:
    """Check if current user can manage the target user"""
    # Superuser can manage anyone
    if current_user.is_superuser:
        return True

    # Users cannot manage themselves through this function
    if current_user.id == target_user.id:
        return False

    # Cannot manage other superusers
    if target_user.is_superuser:
        return False

    # Admin can manage non-superusers
    return is_admin_or_superuser(current_user, db)


def filter_data_by_permissions(user: User, data_type: str, db: Session) -> dict:
    """Return filters that should be applied to data queries based on user permissions"""
    filters = {}

    if user.is_superuser:
        return filters  # No filters for superuser

    user_permissions = get_user_permissions(user, db)

    # Example filters based on data type and permissions
    if data_type == "partners":
        if PERMISSIONS.VIEW_PARTNERS not in user_permissions:
            filters["accessible"] = False  # Block all access
        elif PERMISSIONS.MANAGE_PARTNERS not in user_permissions:
            filters["read_only"] = True

    elif data_type == "customers":
        if PERMISSIONS.VIEW_CUSTOMERS not in user_permissions:
            filters["accessible"] = False
        elif PERMISSIONS.MANAGE_CUSTOMERS not in user_permissions:
            filters["read_only"] = True

    elif data_type == "finances":
        if PERMISSIONS.VIEW_FINANCES not in user_permissions:
            filters["accessible"] = False
        elif PERMISSIONS.MANAGE_FINANCES not in user_permissions:
            filters["read_only"] = True

    elif data_type == "profit_distribution":
        if PERMISSIONS.VIEW_PROFIT_DISTRIBUTION not in user_permissions:
            filters["accessible"] = False
        elif PERMISSIONS.MANAGE_PROFIT_DISTRIBUTION not in user_permissions:
            filters["read_only"] = True

    return filters


# Initialize default permissions in database
DEFAULT_PERMISSIONS = [
    {"name": PERMISSIONS.MANAGE_USERS, "description": "Manage users and their roles", "category": "users"},
    {"name": PERMISSIONS.VIEW_USERS, "description": "View users list", "category": "users"},
    {"name": PERMISSIONS.MANAGE_PARTNERS, "description": "Manage partners", "category": "partners"},
    {"name": PERMISSIONS.VIEW_PARTNERS, "description": "View partners", "category": "partners"},
    {"name": PERMISSIONS.MANAGE_CUSTOMERS, "description": "Manage customers", "category": "customers"},
    {"name": PERMISSIONS.VIEW_CUSTOMERS, "description": "View customers", "category": "customers"},
    {"name": PERMISSIONS.MANAGE_PROJECTS, "description": "Manage projects", "category": "projects"},
    {"name": PERMISSIONS.VIEW_PROJECTS, "description": "View projects", "category": "projects"},
    {"name": PERMISSIONS.MANAGE_SALES, "description": "Manage sales", "category": "sales"},
    {"name": PERMISSIONS.VIEW_SALES, "description": "View sales", "category": "sales"},
    {"name": PERMISSIONS.MANAGE_FINANCES, "description": "Manage finances", "category": "finance"},
    {"name": PERMISSIONS.VIEW_FINANCES, "description": "View finances", "category": "finance"},
    {"name": PERMISSIONS.MANAGE_PROFIT_DISTRIBUTION, "description": "Manage profit distribution", "category": "finance"},
    {"name": PERMISSIONS.VIEW_PROFIT_DISTRIBUTION, "description": "View profit distribution", "category": "finance"},
    {"name": PERMISSIONS.MANAGE_INVENTORY, "description": "Manage inventory", "category": "inventory"},
    {"name": PERMISSIONS.VIEW_INVENTORY, "description": "View inventory", "category": "inventory"},
    {"name": PERMISSIONS.MANAGE_MAINTENANCE, "description": "Manage maintenance", "category": "maintenance"},
    {"name": PERMISSIONS.VIEW_MAINTENANCE, "description": "View maintenance", "category": "maintenance"},
    {"name": PERMISSIONS.VIEW_REPORTS, "description": "View reports", "category": "reports"},
    {"name": PERMISSIONS.EXPORT_REPORTS, "description": "Export reports", "category": "reports"},
    {"name": PERMISSIONS.MANAGE_SETTINGS, "description": "Manage system settings", "category": "settings"},
]


def init_permissions(db: Session):
    """Initialize default permissions in database"""
    for perm_data in DEFAULT_PERMISSIONS:
        existing = db.query(Permission).filter(Permission.name == perm_data["name"]).first()
        if not existing:
            permission = Permission(**perm_data)
            db.add(permission)

    db.commit()