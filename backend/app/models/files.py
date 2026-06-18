from sqlalchemy import Column, Integer, String, DateTime, Boolean, Text, Enum, ForeignKey, JSON
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base
import enum
from datetime import datetime

class FileType(enum.Enum):
    IMAGE = "image"
    DOCUMENT = "document"
    PDF = "pdf"
    SPREADSHEET = "spreadsheet"
    VIDEO = "video"
    AUDIO = "audio"
    ARCHIVE = "archive"
    OTHER = "other"

class StorageProvider(enum.Enum):
    LOCAL = "local"
    S3 = "s3"
    GOOGLE_CLOUD = "google_cloud"
    AZURE = "azure"

class ProcessingStatus(enum.Enum):
    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"

class FileUpload(Base):
    __tablename__ = "file_uploads"

    id = Column(Integer, primary_key=True, index=True)
    filename = Column(String(255), nullable=False)
    original_filename = Column(String(255), nullable=False)
    file_path = Column(String(500), nullable=False)
    file_size = Column(Integer)  # Size in bytes
    mime_type = Column(String(100))
    file_type = Column(Enum(FileType), default=FileType.OTHER)

    # Storage information
    storage_provider = Column(Enum(StorageProvider), default=StorageProvider.LOCAL)
    s3_path = Column(String(500))  # Path in S3 if uploaded to cloud
    storage_bucket = Column(String(100))

    # Processing information
    processing_status = Column(Enum(ProcessingStatus), default=ProcessingStatus.PENDING)
    processed_at = Column(DateTime)
    error_message = Column(Text)

    # Metadata (use a non-reserved attribute name; keep DB column as 'metadata')
    metadata_json = Column('metadata', JSON)
    thumbnail_path = Column(String(500))  # Path to generated thumbnail
    checksum = Column(String(64))  # SHA-256 checksum

    # Association with other entities
    entity_type = Column(String(50))  # partner, customer, project, invoice, etc.
    entity_id = Column(Integer)  # ID of the associated entity

    # Upload information
    uploaded_by = Column(Integer, ForeignKey("users.id"))
    upload_session_id = Column(String(36))  # For tracking multi-file uploads

    # Permissions and access
    is_public = Column(Boolean, default=False)
    access_permissions = Column(JSON)  # Store access permissions as JSON

    # Audit fields
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())
    deleted_at = Column(DateTime)  # Soft delete
    is_deleted = Column(Boolean, default=False)

    # Tags and categorization
    tags = Column(JSON)  # Store tags as JSON array
    category = Column(String(50))
    description = Column(Text)

    # Virus scan results
    virus_scan_status = Column(String(20), default="pending")  # pending, clean, infected, error
    virus_scan_result = Column(JSON)
    virus_scan_date = Column(DateTime)

    # Relationships
    uploader = relationship("User", foreign_keys=[uploaded_by])

    def __repr__(self):
        return f"<FileUpload(id={self.id}, filename='{self.filename}', type='{self.file_type}')>"

class FileShare(Base):
    __tablename__ = "file_shares"

    id = Column(Integer, primary_key=True, index=True)
    file_id = Column(Integer, ForeignKey("file_uploads.id"), nullable=False)
    shared_with_user_id = Column(Integer, ForeignKey("users.id"))
    shared_with_email = Column(String(255))  # For external sharing

    # Share settings
    share_token = Column(String(64), unique=True)  # Unique token for public sharing
    expires_at = Column(DateTime)
    max_downloads = Column(Integer)
    download_count = Column(Integer, default=0)

    # Permissions
    can_view = Column(Boolean, default=True)
    can_download = Column(Boolean, default=True)
    can_edit = Column(Boolean, default=False)
    requires_login = Column(Boolean, default=True)

    # Audit
    created_by = Column(Integer, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime, default=func.now())
    last_accessed = Column(DateTime)
    is_active = Column(Boolean, default=True)

    # Relationships
    file = relationship("FileUpload")
    shared_with_user = relationship("User", foreign_keys=[shared_with_user_id])
    creator = relationship("User", foreign_keys=[created_by])

class FileVersion(Base):
    __tablename__ = "file_versions"

    id = Column(Integer, primary_key=True, index=True)
    file_id = Column(Integer, ForeignKey("file_uploads.id"), nullable=False)
    version_number = Column(Integer, nullable=False)
    file_path = Column(String(500), nullable=False)
    file_size = Column(Integer)
    checksum = Column(String(64))

    # Version metadata
    version_comment = Column(Text)
    changes_summary = Column(Text)

    # Audit
    created_by = Column(Integer, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime, default=func.now())
    is_current = Column(Boolean, default=False)

    # Relationships
    file = relationship("FileUpload")
    creator = relationship("User")

class FileComment(Base):
    __tablename__ = "file_comments"

    id = Column(Integer, primary_key=True, index=True)
    file_id = Column(Integer, ForeignKey("file_uploads.id"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)

    comment_text = Column(Text, nullable=False)
    parent_comment_id = Column(Integer, ForeignKey("file_comments.id"))  # For replies

    # Audit
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())
    is_deleted = Column(Boolean, default=False)

    # Relationships
    file = relationship("FileUpload")
    user = relationship("User")
    parent_comment = relationship("FileComment", remote_side=[id])

class FileDownloadLog(Base):
    __tablename__ = "file_download_logs"

    id = Column(Integer, primary_key=True, index=True)
    file_id = Column(Integer, ForeignKey("file_uploads.id"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"))

    # Download details
    download_method = Column(String(20))  # direct, share_link, api
    ip_address = Column(String(45))  # IPv4 or IPv6
    user_agent = Column(String(500))
    download_size = Column(Integer)

    # Timing
    started_at = Column(DateTime, default=func.now())
    completed_at = Column(DateTime)
    is_successful = Column(Boolean, default=True)
    error_message = Column(Text)

    # Relationships
    file = relationship("FileUpload")
    user = relationship("User")

class FileCollection(Base):
    __tablename__ = "file_collections"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    description = Column(Text)

    # Collection settings
    is_public = Column(Boolean, default=False)
    allow_uploads = Column(Boolean, default=False)
    max_file_size = Column(Integer)  # in bytes
    allowed_file_types = Column(JSON)  # array of allowed MIME types

    # Organization
    parent_collection_id = Column(Integer, ForeignKey("file_collections.id"))
    sort_order = Column(Integer, default=0)

    # Audit
    created_by = Column(Integer, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())
    is_deleted = Column(Boolean, default=False)

    # Relationships
    creator = relationship("User")
    parent_collection = relationship("FileCollection", remote_side=[id])

class FileCollectionItem(Base):
    __tablename__ = "file_collection_items"

    id = Column(Integer, primary_key=True, index=True)
    collection_id = Column(Integer, ForeignKey("file_collections.id"), nullable=False)
    file_id = Column(Integer, ForeignKey("file_uploads.id"), nullable=False)

    # Item settings
    sort_order = Column(Integer, default=0)
    custom_name = Column(String(255))  # Custom name within collection

    # Audit
    added_by = Column(Integer, ForeignKey("users.id"), nullable=False)
    added_at = Column(DateTime, default=func.now())

    # Relationships
    collection = relationship("FileCollection")
    file = relationship("FileUpload")
    added_by_user = relationship("User")
