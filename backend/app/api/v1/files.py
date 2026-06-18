from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, Query
from fastapi.responses import FileResponse, StreamingResponse
from sqlalchemy.orm import Session
from typing import List, Optional
from app.database import get_db
from app.models.files import FileUpload, FileShare, FileCollection, FileDownloadLog
from app.models.users import User
from app.core.auth import get_current_user
from app.core.file_storage import FileStorageService
from app.tasks.files import process_file_upload
from datetime import datetime, timedelta
import os
import uuid
import logging

logger = logging.getLogger(__name__)
router = APIRouter()

@router.post("/upload")
async def upload_file(
    file: UploadFile = File(...),
    entity_type: Optional[str] = Form(None),
    entity_id: Optional[int] = Form(None),
    category: Optional[str] = Form(None),
    description: Optional[str] = Form(None),
    tags: Optional[str] = Form(None),
    is_public: bool = Form(False),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Upload a file"""
    try:
        storage_service = FileStorageService()

        # Upload file
        upload_result = storage_service.upload_file(
            file=file,
            entity_type=entity_type,
            entity_id=entity_id,
            category=category
        )

        # Parse tags
        tag_list = []
        if tags:
            tag_list = [tag.strip() for tag in tags.split(',') if tag.strip()]

        # Create database record
        file_record = FileUpload(
            filename=upload_result["filename"],
            original_filename=upload_result["original_filename"],
            file_path=upload_result["file_path"],
            file_size=upload_result["file_size"],
            mime_type=upload_result["mime_type"],
            file_type=upload_result["file_type"],
            checksum=upload_result["checksum"],
            storage_provider=upload_result["storage_provider"],
            entity_type=entity_type,
            entity_id=entity_id,
            uploaded_by=current_user.id,
            upload_session_id=str(uuid.uuid4()),
            is_public=is_public,
            tags=tag_list,
            category=category,
            description=description,
            processing_status="pending"
        )

        db.add(file_record)
        db.commit()
        db.refresh(file_record)

        # Start background processing
        process_file_upload.delay(file_record.id)

        return {
            "id": file_record.id,
            "filename": file_record.original_filename,
            "file_size": file_record.file_size,
            "mime_type": file_record.mime_type,
            "status": "uploaded",
            "processing_status": file_record.processing_status
        }

    except Exception as e:
        logger.error(f"File upload error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/upload-multiple")
async def upload_multiple_files(
    files: List[UploadFile] = File(...),
    entity_type: Optional[str] = Form(None),
    entity_id: Optional[int] = Form(None),
    category: Optional[str] = Form(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Upload multiple files"""
    try:
        session_id = str(uuid.uuid4())
        uploaded_files = []
        storage_service = FileStorageService()

        for file in files:
            try:
                # Upload file
                upload_result = storage_service.upload_file(
                    file=file,
                    entity_type=entity_type,
                    entity_id=entity_id,
                    category=category
                )

                # Create database record
                file_record = FileUpload(
                    filename=upload_result["filename"],
                    original_filename=upload_result["original_filename"],
                    file_path=upload_result["file_path"],
                    file_size=upload_result["file_size"],
                    mime_type=upload_result["mime_type"],
                    file_type=upload_result["file_type"],
                    checksum=upload_result["checksum"],
                    storage_provider=upload_result["storage_provider"],
                    entity_type=entity_type,
                    entity_id=entity_id,
                    uploaded_by=current_user.id,
                    upload_session_id=session_id,
                    category=category,
                    processing_status="pending"
                )

                db.add(file_record)
                db.flush()

                uploaded_files.append({
                    "id": file_record.id,
                    "filename": file_record.original_filename,
                    "status": "uploaded"
                })

                # Start background processing
                process_file_upload.delay(file_record.id)

            except Exception as e:
                logger.error(f"Error uploading file {file.filename}: {str(e)}")
                uploaded_files.append({
                    "filename": file.filename,
                    "status": "failed",
                    "error": str(e)
                })

        db.commit()

        return {
            "session_id": session_id,
            "uploaded_files": uploaded_files,
            "total_files": len(files),
            "successful_uploads": len([f for f in uploaded_files if f.get("status") == "uploaded"])
        }

    except Exception as e:
        logger.error(f"Multiple file upload error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/list")
async def list_files(
    entity_type: Optional[str] = Query(None),
    entity_id: Optional[int] = Query(None),
    category: Optional[str] = Query(None),
    file_type: Optional[str] = Query(None),
    limit: int = Query(50, le=100),
    offset: int = Query(0),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """List files with filtering"""
    try:
        query = db.query(FileUpload).filter(
            FileUpload.is_deleted == False
        )

        # Apply filters
        if entity_type:
            query = query.filter(FileUpload.entity_type == entity_type)
        if entity_id:
            query = query.filter(FileUpload.entity_id == entity_id)
        if category:
            query = query.filter(FileUpload.category == category)
        if file_type:
            query = query.filter(FileUpload.file_type == file_type)

        # Check permissions (non-admin users can only see their own files or public files)
        if current_user.role != 'admin':
            query = query.filter(
                (FileUpload.uploaded_by == current_user.id) |
                (FileUpload.is_public == True)
            )

        total_count = query.count()
        files = query.order_by(FileUpload.created_at.desc()).offset(offset).limit(limit).all()

        storage_service = FileStorageService()

        file_list = []
        for file_record in files:
            file_url = storage_service.get_file_url(file_record.file_path, file_record.s3_path)

            file_list.append({
                "id": file_record.id,
                "filename": file_record.original_filename,
                "file_size": file_record.file_size,
                "mime_type": file_record.mime_type,
                "file_type": file_record.file_type.value if file_record.file_type else None,
                "category": file_record.category,
                "description": file_record.description,
                "tags": file_record.tags,
                "is_public": file_record.is_public,
                "processing_status": file_record.processing_status.value if file_record.processing_status else None,
                "uploaded_at": file_record.created_at.isoformat(),
                "uploaded_by": file_record.uploader.username if file_record.uploader else None,
                "download_url": file_url,
                "thumbnail_url": storage_service.get_file_url(file_record.thumbnail_path) if file_record.thumbnail_path else None
            })

        return {
            "files": file_list,
            "total_count": total_count,
            "limit": limit,
            "offset": offset
        }

    except Exception as e:
        logger.error(f"Error listing files: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/{file_id}")
async def get_file_info(
    file_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get file information"""
    try:
        file_record = db.query(FileUpload).filter(
            FileUpload.id == file_id,
            FileUpload.is_deleted == False
        ).first()

        if not file_record:
            raise HTTPException(status_code=404, detail="File not found")

        # Check permissions
        if not file_record.is_public and file_record.uploaded_by != current_user.id and current_user.role != 'admin':
            raise HTTPException(status_code=403, detail="Access denied")

        storage_service = FileStorageService()
        file_url = storage_service.get_file_url(file_record.file_path, file_record.s3_path)

        return {
            "id": file_record.id,
            "filename": file_record.original_filename,
            "file_size": file_record.file_size,
            "mime_type": file_record.mime_type,
            "file_type": file_record.file_type.value if file_record.file_type else None,
            "category": file_record.category,
            "description": file_record.description,
            "tags": file_record.tags,
            "metadata": file_record.metadata_json,
            "is_public": file_record.is_public,
            "processing_status": file_record.processing_status.value if file_record.processing_status else None,
            "uploaded_at": file_record.created_at.isoformat(),
            "uploaded_by": file_record.uploader.username if file_record.uploader else None,
            "download_url": file_url,
            "thumbnail_url": storage_service.get_file_url(file_record.thumbnail_path) if file_record.thumbnail_path else None,
            "checksum": file_record.checksum
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting file info: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/{file_id}/download")
async def download_file(
    file_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Download file"""
    try:
        file_record = db.query(FileUpload).filter(
            FileUpload.id == file_id,
            FileUpload.is_deleted == False
        ).first()

        if not file_record:
            raise HTTPException(status_code=404, detail="File not found")

        # Check permissions
        if not file_record.is_public and file_record.uploaded_by != current_user.id and current_user.role != 'admin':
            raise HTTPException(status_code=403, detail="Access denied")

        # Log download
        download_log = FileDownloadLog(
            file_id=file_id,
            user_id=current_user.id,
            download_method="direct",
            started_at=datetime.utcnow()
        )
        db.add(download_log)
        db.commit()

        # Check if file exists locally
        if os.path.exists(file_record.file_path):
            return FileResponse(
                path=file_record.file_path,
                filename=file_record.original_filename,
                media_type=file_record.mime_type
            )

        # Try to download from S3 if not local
        elif file_record.s3_path:
            storage_service = FileStorageService()
            temp_path = f"/tmp/{file_record.filename}"

            if storage_service.download_from_s3(file_record.s3_path, temp_path):
                return FileResponse(
                    path=temp_path,
                    filename=file_record.original_filename,
                    media_type=file_record.mime_type
                )

        raise HTTPException(status_code=404, detail="File not available")

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error downloading file: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/{file_id}")
async def update_file(
    file_id: int,
    description: Optional[str] = Form(None),
    tags: Optional[str] = Form(None),
    category: Optional[str] = Form(None),
    is_public: Optional[bool] = Form(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update file metadata"""
    try:
        file_record = db.query(FileUpload).filter(
            FileUpload.id == file_id,
            FileUpload.is_deleted == False
        ).first()

        if not file_record:
            raise HTTPException(status_code=404, detail="File not found")

        # Check permissions
        if file_record.uploaded_by != current_user.id and current_user.role != 'admin':
            raise HTTPException(status_code=403, detail="Access denied")

        # Update fields
        if description is not None:
            file_record.description = description
        if category is not None:
            file_record.category = category
        if is_public is not None:
            file_record.is_public = is_public
        if tags is not None:
            tag_list = [tag.strip() for tag in tags.split(',') if tag.strip()]
            file_record.tags = tag_list

        file_record.updated_at = datetime.utcnow()

        db.commit()

        return {"message": "File updated successfully"}

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating file: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/{file_id}")
async def delete_file(
    file_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Delete file (soft delete)"""
    try:
        file_record = db.query(FileUpload).filter(
            FileUpload.id == file_id,
            FileUpload.is_deleted == False
        ).first()

        if not file_record:
            raise HTTPException(status_code=404, detail="File not found")

        # Check permissions
        if file_record.uploaded_by != current_user.id and current_user.role != 'admin':
            raise HTTPException(status_code=403, detail="Access denied")

        # Soft delete
        file_record.is_deleted = True
        file_record.deleted_at = datetime.utcnow()

        db.commit()

        return {"message": "File deleted successfully"}

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting file: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/{file_id}/share")
async def create_file_share(
    file_id: int,
    shared_with_email: Optional[str] = None,
    expires_hours: int = 24,
    max_downloads: Optional[int] = None,
    requires_login: bool = True,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create file share link"""
    try:
        file_record = db.query(FileUpload).filter(
            FileUpload.id == file_id,
            FileUpload.is_deleted == False
        ).first()

        if not file_record:
            raise HTTPException(status_code=404, detail="File not found")

        # Check permissions
        if file_record.uploaded_by != current_user.id and current_user.role != 'admin':
            raise HTTPException(status_code=403, detail="Access denied")

        # Create share record
        share_token = str(uuid.uuid4())
        expires_at = datetime.utcnow() + timedelta(hours=expires_hours)

        file_share = FileShare(
            file_id=file_id,
            shared_with_email=shared_with_email,
            share_token=share_token,
            expires_at=expires_at,
            max_downloads=max_downloads,
            requires_login=requires_login,
            created_by=current_user.id
        )

        db.add(file_share)
        db.commit()
        db.refresh(file_share)

        share_url = f"/api/v1/files/shared/{share_token}"

        return {
            "share_id": file_share.id,
            "share_token": share_token,
            "share_url": share_url,
            "expires_at": expires_at.isoformat(),
            "max_downloads": max_downloads
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating file share: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/shared/{share_token}")
async def download_shared_file(
    share_token: str,
    db: Session = Depends(get_db)
):
    """Download file via share link"""
    try:
        file_share = db.query(FileShare).filter(
            FileShare.share_token == share_token,
            FileShare.is_active == True
        ).first()

        if not file_share:
            raise HTTPException(status_code=404, detail="Share link not found")

        # Check if expired
        if file_share.expires_at and datetime.utcnow() > file_share.expires_at:
            raise HTTPException(status_code=410, detail="Share link has expired")

        # Check download limit
        if file_share.max_downloads and file_share.download_count >= file_share.max_downloads:
            raise HTTPException(status_code=410, detail="Download limit exceeded")

        file_record = file_share.file

        if not file_record or file_record.is_deleted:
            raise HTTPException(status_code=404, detail="File not found")

        # Increment download count
        file_share.download_count += 1
        file_share.last_accessed = datetime.utcnow()
        db.commit()

        # Return file
        if os.path.exists(file_record.file_path):
            return FileResponse(
                path=file_record.file_path,
                filename=file_record.original_filename,
                media_type=file_record.mime_type
            )

        raise HTTPException(status_code=404, detail="File not available")

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error downloading shared file: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
