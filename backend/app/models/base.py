from sqlalchemy import Column, Integer, DateTime, func
from sqlalchemy.ext.declarative import declared_attr
from app.database.database import Base

class TimestampMixin:
    """Mixin to add timestamp fields to all tables"""

    @declared_attr
    def created_at(cls):
        return Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    @declared_attr
    def updated_at(cls):
        return Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    @declared_attr
    def created_by(cls):
        return Column(Integer, nullable=True)  # Will be foreign key to users table

    @declared_attr
    def updated_by(cls):
        return Column(Integer, nullable=True)  # Will be foreign key to users table

class BaseModel(Base, TimestampMixin):
    """Base model with common fields"""
    __abstract__ = True

    # Use Integer primary key to ensure SQLite autoincrement works reliably in tests/dev
    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
