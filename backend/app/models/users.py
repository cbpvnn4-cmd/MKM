from sqlalchemy import Column, String, Boolean, BigInteger, ForeignKey, DateTime, Text, func
from sqlalchemy.orm import relationship
from .base import BaseModel

class User(BaseModel):
    __tablename__ = "users"

    username = Column(String(50), unique=True, nullable=False, index=True)
    email = Column(String(100), unique=True, nullable=False, index=True)
    hashed_password = Column(String(255), nullable=False)
    full_name = Column(String(100), nullable=False)
    phone = Column(String(20))
    is_active = Column(Boolean, default=True, nullable=False)
    is_superuser = Column(Boolean, default=False, nullable=False)
    last_login = Column(DateTime(timezone=True))

    # Relationship with roles
    roles = relationship("UserRole", back_populates="user")

class Role(BaseModel):
    __tablename__ = "roles"

    name = Column(String(50), unique=True, nullable=False)
    description = Column(Text)
    is_active = Column(Boolean, default=True, nullable=False)

    # Relationship with users
    users = relationship("UserRole", back_populates="role")

class UserRole(BaseModel):
    __tablename__ = "user_roles"

    user_id = Column(BigInteger, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    role_id = Column(BigInteger, ForeignKey("roles.id", ondelete="CASCADE"), nullable=False)

    # Relationships
    user = relationship("User", back_populates="roles")
    role = relationship("Role", back_populates="users")

class Permission(BaseModel):
    __tablename__ = "permissions"

    name = Column(String(100), unique=True, nullable=False)
    description = Column(Text)
    resource = Column(String(50))  # e.g., 'users', 'profit_distribution'
    action = Column(String(50))    # e.g., 'create', 'read', 'update', 'delete'
    is_active = Column(Boolean, default=True, nullable=False)

    # Relationships
    roles = relationship("RolePermission", back_populates="permission")

class RolePermission(BaseModel):
    __tablename__ = "role_permissions"

    role_id = Column(BigInteger, ForeignKey("roles.id", ondelete="CASCADE"), nullable=False)
    permission_id = Column(BigInteger, ForeignKey("permissions.id", ondelete="CASCADE"), nullable=False)

    # Relationships
    role = relationship("Role")
    permission = relationship("Permission", back_populates="roles")
