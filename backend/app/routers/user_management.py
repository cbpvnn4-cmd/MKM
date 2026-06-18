from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime

from app.database.database import get_db
from app.routers.auth import get_current_active_user
from app.models.users import User, Role, Permission, UserRole, RolePermission
from app.core.permissions import (
    PERMISSIONS, has_permission, require_permission,
    can_manage_user, init_permissions
)
from pydantic import BaseModel, EmailStr

router = APIRouter()

# Pydantic models
class UserResponse(BaseModel):
    id: int
    username: str
    email: str
    full_name: str
    is_active: bool
    is_superuser: bool
    created_at: datetime
    roles: List[dict] = []

    class Config:
        from_attributes = True


class UserCreate(BaseModel):
    username: str
    email: EmailStr
    full_name: str
    password: str
    role_ids: List[int] = []


class UserUpdate(BaseModel):
    email: Optional[EmailStr] = None
    full_name: Optional[str] = None
    is_active: Optional[bool] = None
    role_ids: Optional[List[int]] = None


class RoleResponse(BaseModel):
    id: int
    name: str
    description: str
    created_at: datetime
    permissions: List[dict] = []

    class Config:
        from_attributes = True


class RoleCreate(BaseModel):
    name: str
    description: str
    permission_ids: List[int] = []


class RoleUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    permission_ids: Optional[List[int]] = None


class PermissionResponse(BaseModel):
    id: int
    name: str
    description: str
    category: str = "other"  # Default value
    created_at: datetime

    class Config:
        from_attributes = True


class UserRoleAssignment(BaseModel):
    user_id: int
    role_ids: List[int]


@router.get("/users", response_model=List[UserResponse])
async def get_users(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get all users with their roles"""
    if not has_permission(current_user, PERMISSIONS.VIEW_USERS, db):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="ليس لديك صلاحية لعرض المستخدمين"
        )

    users = db.query(User).offset(skip).limit(limit).all()

    # Format response with roles
    result = []
    for user in users:
        user_roles = db.query(UserRole).filter(UserRole.user_id == user.id).all()
        roles = []
        for user_role in user_roles:
            role = db.query(Role).filter(Role.id == user_role.role_id).first()
            if role:
                roles.append({
                    "id": role.id,
                    "name": role.name,
                    "description": role.description
                })

        result.append({
            "id": user.id,
            "username": user.username,
            "email": user.email,
            "full_name": user.full_name,
            "is_active": user.is_active,
            "is_superuser": user.is_superuser,
            "created_at": user.created_at,
            "roles": roles
        })

    return result


@router.post("/users", response_model=UserResponse)
async def create_user(
    user_data: UserCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Create a new user"""
    if not has_permission(current_user, PERMISSIONS.MANAGE_USERS, db):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="ليس لديك صلاحية لإنشاء مستخدمين جدد"
        )

    # Check if username or email already exists
    existing_user = db.query(User).filter(
        (User.username == user_data.username) | (User.email == user_data.email)
    ).first()

    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="اسم المستخدم أو البريد الإلكتروني موجود مسبقاً"
        )

    # Create user
    from app.core.security import get_password_hash
    hashed_password = get_password_hash(user_data.password)

    new_user = User(
        username=user_data.username,
        email=user_data.email,
        full_name=user_data.full_name,
        hashed_password=hashed_password,
        created_by=current_user.id
    )

    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    # Assign roles
    for role_id in user_data.role_ids:
        role = db.query(Role).filter(Role.id == role_id).first()
        if role:
            user_role = UserRole(
                user_id=new_user.id,
                role_id=role_id,
                created_by=current_user.id
            )
            db.add(user_role)

    db.commit()

    # Load roles for response
    user_roles = db.query(UserRole).filter(UserRole.user_id == new_user.id).all()
    roles = []
    for user_role in user_roles:
        role = db.query(Role).filter(Role.id == user_role.role_id).first()
        if role:
            roles.append({
                "id": role.id,
                "name": role.name,
                "description": role.description
            })

    return {
        "id": new_user.id,
        "username": new_user.username,
        "email": new_user.email,
        "full_name": new_user.full_name,
        "is_active": new_user.is_active,
        "is_superuser": new_user.is_superuser,
        "created_at": new_user.created_at,
        "roles": roles
    }


@router.put("/users/{user_id}", response_model=UserResponse)
async def update_user(
    user_id: int,
    user_data: UserUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Update a user"""
    if not has_permission(current_user, PERMISSIONS.MANAGE_USERS, db):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="ليس لديك صلاحية لتحديث المستخدمين"
        )

    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="المستخدم غير موجود"
        )

    # Check if current user can manage this user
    if not can_manage_user(current_user, user, db):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="ليس لديك صلاحية لتحديث هذا المستخدم"
        )

    # Update user fields
    if user_data.email is not None:
        # Check if email is already taken by another user
        existing = db.query(User).filter(
            User.email == user_data.email, User.id != user_id
        ).first()
        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="البريد الإلكتروني مستخدم من قبل مستخدم آخر"
            )
        user.email = user_data.email

    if user_data.full_name is not None:
        user.full_name = user_data.full_name

    if user_data.is_active is not None:
        user.is_active = user_data.is_active

    user.updated_by = current_user.id
    user.updated_at = datetime.utcnow()

    # Update roles if provided
    if user_data.role_ids is not None:
        # Remove existing roles
        db.query(UserRole).filter(UserRole.user_id == user_id).delete()

        # Add new roles
        for role_id in user_data.role_ids:
            role = db.query(Role).filter(Role.id == role_id).first()
            if role:
                user_role = UserRole(
                    user_id=user_id,
                    role_id=role_id,
                    created_by=current_user.id
                )
                db.add(user_role)

    db.commit()
    db.refresh(user)

    # Load roles for response
    user_roles = db.query(UserRole).filter(UserRole.user_id == user.id).all()
    roles = []
    for user_role in user_roles:
        role = db.query(Role).filter(Role.id == user_role.role_id).first()
        if role:
            roles.append({
                "id": role.id,
                "name": role.name,
                "description": role.description
            })

    return {
        "id": user.id,
        "username": user.username,
        "email": user.email,
        "full_name": user.full_name,
        "is_active": user.is_active,
        "is_superuser": user.is_superuser,
        "created_at": user.created_at,
        "roles": roles
    }


@router.delete("/users/{user_id}")
async def delete_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Delete a user (soft delete by deactivating)"""
    if not has_permission(current_user, PERMISSIONS.MANAGE_USERS, db):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="ليس لديك صلاحية لحذف المستخدمين"
        )

    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="المستخدم غير موجود"
        )

    if not can_manage_user(current_user, user, db):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="ليس لديك صلاحية لحذف هذا المستخدم"
        )

    # Soft delete by deactivating
    user.is_active = False
    user.updated_by = current_user.id
    user.updated_at = datetime.utcnow()

    db.commit()

    return {"message": "تم إلغاء تفعيل المستخدم بنجاح"}


@router.get("/roles", response_model=List[RoleResponse])
async def get_roles(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get all roles with their permissions"""
    if not has_permission(current_user, PERMISSIONS.VIEW_USERS, db):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="ليس لديك صلاحية لعرض الأدوار"
        )

    roles = db.query(Role).all()

    # Format response with permissions
    result = []
    for role in roles:
        role_permissions = db.query(RolePermission).filter(RolePermission.role_id == role.id).all()
        permissions = []
        for role_perm in role_permissions:
            permission = db.query(Permission).filter(Permission.id == role_perm.permission_id).first()
            if permission:
                permissions.append({
                    "id": permission.id,
                    "name": permission.name,
                    "description": permission.description,
                    "category": getattr(permission, 'category', permission.resource or 'other')
                })

        result.append({
            "id": role.id,
            "name": role.name,
            "description": role.description,
            "created_at": role.created_at,
            "permissions": permissions
        })

    return result


@router.post("/roles", response_model=RoleResponse)
async def create_role(
    role_data: RoleCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Create a new role"""
    if not has_permission(current_user, PERMISSIONS.MANAGE_USERS, db):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="ليس لديك صلاحية لإنشاء أدوار جديدة"
        )

    # Check if role name already exists
    existing_role = db.query(Role).filter(Role.name == role_data.name).first()
    if existing_role:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="اسم الدور موجود مسبقاً"
        )

    # Create role
    new_role = Role(
        name=role_data.name,
        description=role_data.description,
        created_by=current_user.id
    )

    db.add(new_role)
    db.commit()
    db.refresh(new_role)

    # Assign permissions
    for permission_id in role_data.permission_ids:
        permission = db.query(Permission).filter(Permission.id == permission_id).first()
        if permission:
            role_permission = RolePermission(
                role_id=new_role.id,
                permission_id=permission_id
            )
            db.add(role_permission)

    db.commit()

    # Load permissions for response
    role_permissions = db.query(RolePermission).filter(RolePermission.role_id == new_role.id).all()
    permissions = []
    for role_perm in role_permissions:
        permission = db.query(Permission).filter(Permission.id == role_perm.permission_id).first()
        if permission:
            permissions.append({
                "id": permission.id,
                "name": permission.name,
                "description": permission.description,
                "category": getattr(permission, 'category', permission.resource or 'other')
            })

    return {
        "id": new_role.id,
        "name": new_role.name,
        "description": new_role.description,
        "created_at": new_role.created_at,
        "permissions": permissions
    }


@router.get("/permissions", response_model=List[PermissionResponse])
async def get_permissions(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get all available permissions"""
    if not has_permission(current_user, PERMISSIONS.VIEW_USERS, db):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="ليس لديك صلاحية لعرض الصلاحيات"
        )

    permissions = db.query(Permission).all()

    # Format permissions with category
    result = []
    for perm in permissions:
        result.append({
            "id": perm.id,
            "name": perm.name,
            "description": perm.description,
            "category": getattr(perm, 'category', perm.resource or 'other'),
            "created_at": perm.created_at
        })

    return result


@router.post("/assign-roles")
async def assign_user_roles(
    assignment: UserRoleAssignment,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Assign roles to a user"""
    if not has_permission(current_user, PERMISSIONS.MANAGE_USERS, db):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="ليس لديك صلاحية لتعديل أدوار المستخدمين"
        )

    user = db.query(User).filter(User.id == assignment.user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="المستخدم غير موجود"
        )

    if not can_manage_user(current_user, user, db):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="ليس لديك صلاحية لتحديث أدوار هذا المستخدم"
        )

    # Remove existing roles
    db.query(UserRole).filter(UserRole.user_id == assignment.user_id).delete()

    # Add new roles
    for role_id in assignment.role_ids:
        role = db.query(Role).filter(Role.id == role_id).first()
        if role:
            user_role = UserRole(
                user_id=assignment.user_id,
                role_id=role_id,
                created_by=current_user.id
            )
            db.add(user_role)

    db.commit()

    return {"message": "تم تحديث أدوار المستخدم بنجاح"}


@router.post("/init-permissions")
async def initialize_permissions(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Initialize default permissions in the database"""
    if not current_user.is_superuser:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="هذه العملية مخصصة للمديرين فقط"
        )

    init_permissions(db)
    return {"message": "تم تهيئة الصلاحيات الافتراضية بنجاح"}


# ============================================
# 🆕 NEW ENDPOINTS - User Management Features
# ============================================

class PasswordResetRequest(BaseModel):
    new_password: str


class UserPermissionAssignment(BaseModel):
    user_id: int
    permission_ids: List[int]


class BulkUserIds(BaseModel):
    user_ids: List[int]


class BulkStatusUpdate(BaseModel):
    user_ids: List[int]
    is_active: bool


class UserLockRequest(BaseModel):
    locked: bool


class NotificationRequest(BaseModel):
    message: str


class ActivityLogEntry(BaseModel):
    action: str
    timestamp: datetime
    details: Optional[str] = None

    class Config:
        from_attributes = True


# 1. Reset Password Endpoint
@router.post("/users/{user_id}/reset-password")
async def reset_user_password(
    user_id: int,
    password_data: PasswordResetRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Reset a user's password"""
    if not has_permission(current_user, PERMISSIONS.MANAGE_USERS, db):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="ليس لديك صلاحية لإعادة تعيين كلمات المرور"
        )

    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="المستخدم غير موجود"
        )

    if not can_manage_user(current_user, user, db):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="ليس لديك صلاحية لتحديث هذا المستخدم"
        )

    # Hash and update password
    from app.core.security import get_password_hash
    user.hashed_password = get_password_hash(password_data.new_password)
    user.updated_by = current_user.id
    user.updated_at = datetime.utcnow()

    db.commit()

    # Log activity
    from app.models.audit import AuditLog
    audit_entry = AuditLog(
        user_id=current_user.id,
        action="PASSWORD_RESET",
        entity_type="User",
        entity_id=user_id,
        details=f"Password reset for user {user.username}"
    )
    db.add(audit_entry)
    db.commit()

    return {"message": "تم إعادة تعيين كلمة المرور بنجاح"}


# 2. Get User Permissions
@router.get("/users/{user_id}/permissions")
async def get_user_permissions(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get all permissions for a specific user"""
    if not has_permission(current_user, PERMISSIONS.VIEW_USERS, db):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="ليس لديك صلاحية لعرض الصلاحيات"
        )

    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="المستخدم غير موجود"
        )

    # Get all permissions through roles
    user_roles = db.query(UserRole).filter(UserRole.user_id == user_id).all()
    all_permissions = []

    for user_role in user_roles:
        role_permissions = db.query(RolePermission).filter(
            RolePermission.role_id == user_role.role_id
        ).all()

        for role_perm in role_permissions:
            permission = db.query(Permission).filter(
                Permission.id == role_perm.permission_id
            ).first()
            if permission and permission not in all_permissions:
                all_permissions.append({
                    "id": permission.id,
                    "name": permission.name,
                    "description": permission.description,
                    "category": getattr(permission, 'category', permission.resource or 'other')
                })

    return all_permissions


# 3. Assign Custom Permissions to User
@router.post("/assign-permissions")
async def assign_user_permissions(
    assignment: UserPermissionAssignment,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Assign custom permissions directly to a user (not implemented in current schema)"""
    if not has_permission(current_user, PERMISSIONS.MANAGE_USERS, db):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="ليس لديك صلاحية لتعديل صلاحيات المستخدمين"
        )

    # Note: This would require a UserPermission table in the schema
    # For now, we'll return a message indicating this feature needs schema update
    return {
        "message": "هذه الميزة تحتاج إلى جدول UserPermission في قاعدة البيانات",
        "note": "حالياً يتم إدارة الصلاحيات من خلال الأدوار فقط"
    }


# 4. Bulk Delete Users
@router.post("/users/bulk-delete")
async def bulk_delete_users(
    bulk_data: BulkUserIds,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Bulk delete (deactivate) multiple users"""
    if not has_permission(current_user, PERMISSIONS.MANAGE_USERS, db):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="ليس لديك صلاحية لحذف المستخدمين"
        )

    deleted_count = 0
    for user_id in bulk_data.user_ids:
        user = db.query(User).filter(User.id == user_id).first()
        if user and can_manage_user(current_user, user, db):
            user.is_active = False
            user.updated_by = current_user.id
            user.updated_at = datetime.utcnow()
            deleted_count += 1

    db.commit()

    # Log activity
    from app.models.audit import AuditLog
    audit_entry = AuditLog(
        user_id=current_user.id,
        action="BULK_DELETE_USERS",
        entity_type="User",
        details=f"Bulk deleted {deleted_count} users"
    )
    db.add(audit_entry)
    db.commit()

    return {
        "message": f"تم إلغاء تفعيل {deleted_count} مستخدم بنجاح",
        "deleted_count": deleted_count
    }


# 5. Bulk Update User Status
@router.post("/users/bulk-status")
async def bulk_update_user_status(
    bulk_data: BulkStatusUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Bulk update status of multiple users"""
    if not has_permission(current_user, PERMISSIONS.MANAGE_USERS, db):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="ليس لديك صلاحية لتحديث حالة المستخدمين"
        )

    updated_count = 0
    for user_id in bulk_data.user_ids:
        user = db.query(User).filter(User.id == user_id).first()
        if user and can_manage_user(current_user, user, db):
            user.is_active = bulk_data.is_active
            user.updated_by = current_user.id
            user.updated_at = datetime.utcnow()
            updated_count += 1

    db.commit()

    # Log activity
    from app.models.audit import AuditLog
    status_text = "تفعيل" if bulk_data.is_active else "تعطيل"
    audit_entry = AuditLog(
        user_id=current_user.id,
        action="BULK_STATUS_UPDATE",
        entity_type="User",
        details=f"Bulk {status_text} {updated_count} users"
    )
    db.add(audit_entry)
    db.commit()

    return {
        "message": f"تم تحديث حالة {updated_count} مستخدم بنجاح",
        "updated_count": updated_count
    }


# 6. Export Users to CSV
@router.get("/users/export")
async def export_users(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Export all users to CSV file"""
    if not has_permission(current_user, PERMISSIONS.VIEW_USERS, db):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="ليس لديك صلاحية لتصدير بيانات المستخدمين"
        )

    from fastapi.responses import StreamingResponse
    import csv
    import io

    users = db.query(User).all()

    # Create CSV in memory
    output = io.StringIO()
    writer = csv.writer(output)

    # Write header
    writer.writerow([
        'ID', 'Username', 'Email', 'Full Name',
        'Is Active', 'Is Superuser', 'Created At', 'Roles'
    ])

    # Write data
    for user in users:
        user_roles = db.query(UserRole).filter(UserRole.user_id == user.id).all()
        roles = []
        for user_role in user_roles:
            role = db.query(Role).filter(Role.id == user_role.role_id).first()
            if role:
                roles.append(role.name)

        writer.writerow([
            user.id,
            user.username,
            user.email,
            user.full_name,
            'Yes' if user.is_active else 'No',
            'Yes' if user.is_superuser else 'No',
            user.created_at.strftime('%Y-%m-%d %H:%M:%S') if user.created_at else '',
            ', '.join(roles)
        ])

    output.seek(0)

    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={
            "Content-Disposition": f"attachment; filename=users_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}.csv"
        }
    )


# 7. Lock/Unlock User Account
@router.post("/users/{user_id}/lock")
async def lock_user_account(
    user_id: int,
    lock_data: UserLockRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Lock or unlock a user account"""
    if not has_permission(current_user, PERMISSIONS.MANAGE_USERS, db):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="ليس لديك صلاحية لقفل/فتح الحسابات"
        )

    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="المستخدم غير موجود"
        )

    if not can_manage_user(current_user, user, db):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="ليس لديك صلاحية لتحديث هذا المستخدم"
        )

    # Update lock status (using is_active as lock indicator)
    user.is_active = not lock_data.locked
    user.updated_by = current_user.id
    user.updated_at = datetime.utcnow()

    db.commit()

    # Log activity
    from app.models.audit import AuditLog
    action_text = "قفل" if lock_data.locked else "فتح"
    audit_entry = AuditLog(
        user_id=current_user.id,
        action="LOCK_USER" if lock_data.locked else "UNLOCK_USER",
        entity_type="User",
        entity_id=user_id,
        details=f"{action_text} حساب المستخدم {user.username}"
    )
    db.add(audit_entry)
    db.commit()

    return {"message": f"تم {action_text} الحساب بنجاح"}


# 8. Send Notification to User
@router.post("/users/{user_id}/notify")
async def send_user_notification(
    user_id: int,
    notification: NotificationRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Send a notification to a specific user"""
    if not has_permission(current_user, PERMISSIONS.MANAGE_USERS, db):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="ليس لديك صلاحية لإرسال الإشعارات"
        )

    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="المستخدم غير موجود"
        )

    # Create notification
    from app.models.notifications import Notification
    new_notification = Notification(
        user_id=user_id,
        title="إشعار من الإدارة",
        message=notification.message,
        type="admin_message",
        created_by=current_user.id
    )
    db.add(new_notification)
    db.commit()

    # Log activity
    from app.models.audit import AuditLog
    audit_entry = AuditLog(
        user_id=current_user.id,
        action="SEND_NOTIFICATION",
        entity_type="User",
        entity_id=user_id,
        details=f"Sent notification to {user.username}"
    )
    db.add(audit_entry)
    db.commit()

    return {"message": "تم إرسال الإشعار بنجاح"}


# 9. Get User Activity Log
@router.get("/users/{user_id}/activity")
async def get_user_activity_log(
    user_id: int,
    limit: int = 50,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get activity log for a specific user"""
    if not has_permission(current_user, PERMISSIONS.VIEW_USERS, db):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="ليس لديك صلاحية لعرض سجل النشاطات"
        )

    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="المستخدم غير موجود"
        )

    # Get audit logs for this user
    from app.models.audit import AuditLog
    activities = (
        db.query(AuditLog)
        .filter(AuditLog.entity_type == "User", AuditLog.entity_id == user_id)
        .order_by(AuditLog.timestamp.desc())
        .limit(limit)
        .all()
    )

    result = []
    for activity in activities:
        result.append({
            "action": activity.action,
            "timestamp": activity.timestamp,
            "details": activity.details
        })

    return result