from celery import current_app as celery_app
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.files import FileUpload, FileType
from app.core.file_storage import FileStorageService
from typing import List, Dict, Any, Optional
import logging
import os
import shutil
from datetime import datetime, timedelta
from PIL import Image, ImageOps
import uuid
import mimetypes

logger = logging.getLogger(__name__)

@celery_app.task(bind=True)
def process_file_upload(self, file_id: int):
    """Process uploaded file (virus scan, validation, thumbnail generation)"""
    try:
        db = next(get_db())
        file_record = db.query(FileUpload).filter(FileUpload.id == file_id).first()

        if not file_record:
            logger.error(f"File record not found: {file_id}")
            return {"status": "error", "message": "File not found"}

        storage_service = FileStorageService()

        # Update status to processing
        file_record.processing_status = "processing"
        db.commit()

        # Validate file
        validation_result = storage_service.validate_file(file_record.file_path)
        if not validation_result["valid"]:
            file_record.processing_status = "failed"
            file_record.error_message = validation_result["error"]
            db.commit()
            return {"status": "error", "message": validation_result["error"]}

        # Generate thumbnails for images
        if file_record.file_type in [FileType.IMAGE]:
            thumbnail_path = generate_thumbnail(file_record.file_path)
            if thumbnail_path:
                file_record.thumbnail_path = thumbnail_path

        # Extract metadata
        metadata = extract_file_metadata(file_record.file_path, file_record.mime_type)
        file_record.metadata_json = metadata

        # Virus scan (simulated)
        scan_result = perform_virus_scan(file_record.file_path)
        if not scan_result["clean"]:
            file_record.processing_status = "failed"
            file_record.error_message = "File contains malware"
            db.commit()
            return {"status": "error", "message": "File contains malware"}

        # Move to permanent storage if needed
        if file_record.storage_provider == "s3":
            s3_path = storage_service.upload_to_s3(file_record.file_path, file_record.filename)
            if s3_path:
                file_record.s3_path = s3_path

        # Update status to completed
        file_record.processing_status = "completed"
        file_record.processed_at = datetime.utcnow()
        db.commit()

        logger.info(f"File processed successfully: {file_id}")
        return {"status": "success", "file_id": file_id}

    except Exception as exc:
        logger.error(f"Error processing file {file_id}: {str(exc)}")
        if 'file_record' in locals():
            file_record.processing_status = "failed"
            file_record.error_message = str(exc)
            db.commit()
        raise
    finally:
        db.close()

@celery_app.task(bind=True)
def generate_thumbnail(file_path: str, size: tuple = (150, 150)) -> Optional[str]:
    """Generate thumbnail for image files"""
    try:
        if not os.path.exists(file_path):
            return None

        # Check if it's an image
        mime_type, _ = mimetypes.guess_type(file_path)
        if not mime_type or not mime_type.startswith('image/'):
            return None

        # Generate thumbnail path
        base_name = os.path.splitext(file_path)[0]
        thumbnail_path = f"{base_name}_thumb.jpg"

        # Create thumbnail
        with Image.open(file_path) as image:
            # Convert to RGB if necessary
            if image.mode in ("RGBA", "P"):
                image = image.convert("RGB")

            # Create thumbnail
            image.thumbnail(size, Image.Resampling.LANCZOS)

            # Save thumbnail
            image.save(thumbnail_path, "JPEG", quality=85, optimize=True)

        logger.info(f"Thumbnail generated: {thumbnail_path}")
        return thumbnail_path

    except Exception as exc:
        logger.error(f"Error generating thumbnail for {file_path}: {str(exc)}")
        return None

@celery_app.task(bind=True)
def cleanup_old_files(self):
    """Clean up old temporary and orphaned files"""
    try:
        db = next(get_db())

        # Clean up temporary files older than 24 hours
        temp_dir = "/app/uploads/temp"
        if os.path.exists(temp_dir):
            cutoff_time = datetime.now() - timedelta(hours=24)
            cleaned_files = 0

            for filename in os.listdir(temp_dir):
                file_path = os.path.join(temp_dir, filename)
                if os.path.isfile(file_path):
                    file_time = datetime.fromtimestamp(os.path.getmtime(file_path))
                    if file_time < cutoff_time:
                        os.remove(file_path)
                        cleaned_files += 1

            logger.info(f"Cleaned up {cleaned_files} temporary files")

        # Clean up orphaned files (files not referenced in database)
        uploads_dir = "/app/uploads"
        if os.path.exists(uploads_dir):
            orphaned_files = 0
            for root, dirs, files in os.walk(uploads_dir):
                for filename in files:
                    file_path = os.path.join(root, filename)
                    relative_path = os.path.relpath(file_path, uploads_dir)

                    # Check if file exists in database
                    exists = db.query(FileUpload).filter(
                        FileUpload.file_path.like(f"%{relative_path}")
                    ).first()

                    if not exists and not relative_path.startswith("temp/"):
                        # File is orphaned, check if it's old enough to delete
                        file_time = datetime.fromtimestamp(os.path.getmtime(file_path))
                        if file_time < cutoff_time:
                            os.remove(file_path)
                            orphaned_files += 1

            logger.info(f"Cleaned up {orphaned_files} orphaned files")

        # Clean up failed uploads older than 7 days
        week_ago = datetime.utcnow() - timedelta(days=7)
        failed_uploads = db.query(FileUpload).filter(
            FileUpload.processing_status == "failed",
            FileUpload.created_at < week_ago
        ).all()

        for upload in failed_uploads:
            # Remove physical file
            if upload.file_path and os.path.exists(upload.file_path):
                os.remove(upload.file_path)
            # Remove thumbnail
            if upload.thumbnail_path and os.path.exists(upload.thumbnail_path):
                os.remove(upload.thumbnail_path)
            # Remove database record
            db.delete(upload)

        db.commit()

        logger.info(f"Cleaned up {len(failed_uploads)} failed upload records")
        return {
            "status": "success",
            "temp_files_cleaned": cleaned_files,
            "orphaned_files_cleaned": orphaned_files,
            "failed_uploads_cleaned": len(failed_uploads)
        }

    except Exception as exc:
        logger.error(f"Error cleaning up files: {str(exc)}")
        raise
    finally:
        db.close()

@celery_app.task(bind=True)
def compress_images(self, file_ids: List[int], quality: int = 85):
    """Compress images to reduce file size"""
    try:
        db = next(get_db())
        compressed_count = 0

        for file_id in file_ids:
            file_record = db.query(FileUpload).filter(FileUpload.id == file_id).first()
            if not file_record or file_record.file_type != FileType.IMAGE:
                continue

            if not os.path.exists(file_record.file_path):
                continue

            try:
                original_size = os.path.getsize(file_record.file_path)

                # Compress image
                with Image.open(file_record.file_path) as image:
                    # Convert to RGB if necessary
                    if image.mode in ("RGBA", "P"):
                        image = image.convert("RGB")

                    # Save with compression
                    image.save(file_record.file_path, "JPEG", quality=quality, optimize=True)

                new_size = os.path.getsize(file_record.file_path)
                file_record.file_size = new_size

                compression_ratio = (original_size - new_size) / original_size * 100
                logger.info(f"Compressed {file_record.filename}: {compression_ratio:.1f}% reduction")

                compressed_count += 1

            except Exception as e:
                logger.error(f"Error compressing file {file_id}: {str(e)}")

        db.commit()

        logger.info(f"Compressed {compressed_count} images")
        return {"status": "success", "compressed_count": compressed_count}

    except Exception as exc:
        logger.error(f"Error compressing images: {str(exc)}")
        raise
    finally:
        db.close()

@celery_app.task(bind=True)
def backup_files_to_s3(self, file_ids: List[int] = None):
    """Backup files to S3 storage"""
    try:
        db = next(get_db())
        storage_service = FileStorageService()

        query = db.query(FileUpload)
        if file_ids:
            query = query.filter(FileUpload.id.in_(file_ids))
        else:
            # Backup files not yet backed up to S3
            query = query.filter(FileUpload.s3_path.is_(None))

        files_to_backup = query.all()
        backup_count = 0

        for file_record in files_to_backup:
            if not os.path.exists(file_record.file_path):
                continue

            try:
                s3_path = storage_service.upload_to_s3(
                    file_record.file_path,
                    file_record.filename
                )

                if s3_path:
                    file_record.s3_path = s3_path
                    backup_count += 1

            except Exception as e:
                logger.error(f"Error backing up file {file_record.id}: {str(e)}")

        db.commit()

        logger.info(f"Backed up {backup_count} files to S3")
        return {"status": "success", "backup_count": backup_count}

    except Exception as exc:
        logger.error(f"Error backing up files to S3: {str(exc)}")
        raise
    finally:
        db.close()

def extract_file_metadata(file_path: str, mime_type: str) -> Dict[str, Any]:
    """Extract metadata from file"""
    metadata = {}

    try:
        # Basic file info
        stat = os.stat(file_path)
        metadata.update({
            "file_size": stat.st_size,
            "created_at": datetime.fromtimestamp(stat.st_ctime).isoformat(),
            "modified_at": datetime.fromtimestamp(stat.st_mtime).isoformat(),
            "mime_type": mime_type
        })

        # Image metadata
        if mime_type and mime_type.startswith('image/'):
            try:
                with Image.open(file_path) as image:
                    metadata.update({
                        "width": image.width,
                        "height": image.height,
                        "format": image.format,
                        "mode": image.mode
                    })

                    # EXIF data
                    if hasattr(image, '_getexif') and image._getexif():
                        metadata["has_exif"] = True
                    else:
                        metadata["has_exif"] = False

            except Exception as e:
                logger.warning(f"Could not extract image metadata: {str(e)}")

        # PDF metadata
        elif mime_type == 'application/pdf':
            try:
                # Would use PyPDF2 or similar library
                metadata["is_pdf"] = True
            except Exception as e:
                logger.warning(f"Could not extract PDF metadata: {str(e)}")

    except Exception as e:
        logger.error(f"Error extracting metadata for {file_path}: {str(e)}")

    return metadata

def perform_virus_scan(file_path: str) -> Dict[str, Any]:
    """Perform virus scan on file (simulated)"""
    # In production, this would integrate with ClamAV or similar
    # For now, we'll simulate a scan

    try:
        # Check file size (reject very large files)
        file_size = os.path.getsize(file_path)
        if file_size > 100 * 1024 * 1024:  # 100MB limit
            return {"clean": False, "reason": "File too large"}

        # Check for suspicious extensions
        suspicious_extensions = ['.exe', '.bat', '.cmd', '.scr', '.pif']
        file_ext = os.path.splitext(file_path)[1].lower()
        if file_ext in suspicious_extensions:
            return {"clean": False, "reason": "Suspicious file type"}

        # Simulate scan delay
        import time
        time.sleep(0.1)

        return {"clean": True, "scan_time": datetime.utcnow().isoformat()}

    except Exception as e:
        logger.error(f"Error scanning file {file_path}: {str(e)}")
        return {"clean": False, "reason": f"Scan error: {str(e)}"}

@celery_app.task(bind=True)
def generate_file_report(self, start_date: str, end_date: str):
    """Generate file usage report"""
    try:
        db = next(get_db())

        start_dt = datetime.fromisoformat(start_date)
        end_dt = datetime.fromisoformat(end_date)

        # Query files in date range
        files = db.query(FileUpload).filter(
            FileUpload.created_at >= start_dt,
            FileUpload.created_at <= end_dt
        ).all()

        # Calculate statistics
        total_files = len(files)
        total_size = sum(f.file_size for f in files if f.file_size)

        file_types = {}
        for file in files:
            file_type = file.file_type.value if file.file_type else "unknown"
            file_types[file_type] = file_types.get(file_type, 0) + 1

        upload_by_day = {}
        for file in files:
            day = file.created_at.date().isoformat()
            upload_by_day[day] = upload_by_day.get(day, 0) + 1

        report = {
            "period": {"start": start_date, "end": end_date},
            "total_files": total_files,
            "total_size_mb": round(total_size / (1024 * 1024), 2) if total_size else 0,
            "file_types": file_types,
            "uploads_by_day": upload_by_day,
            "generated_at": datetime.utcnow().isoformat()
        }

        logger.info(f"Generated file report for {start_date} to {end_date}")
        return {"status": "success", "report": report}

    except Exception as exc:
        logger.error(f"Error generating file report: {str(exc)}")
        raise
    finally:
        db.close()
