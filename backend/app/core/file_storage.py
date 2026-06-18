import os
try:
    import boto3  # Optional; used only if S3 is configured
except Exception:
    boto3 = None
import hashlib
import mimetypes
import uuid
from typing import Optional, Dict, Any, List, BinaryIO
from fastapi import UploadFile, HTTPException
from app.core.config import settings
from datetime import datetime
import logging
from pathlib import Path

logger = logging.getLogger(__name__)

class FileStorageService:
    """Comprehensive file storage service supporting local and cloud storage"""

    def __init__(self):
        self.upload_dir = getattr(settings, 'UPLOAD_DIR', '/app/uploads')
        self.max_file_size = getattr(settings, 'MAX_FILE_SIZE', 100 * 1024 * 1024)  # 100MB
        self.allowed_extensions = getattr(settings, 'ALLOWED_EXTENSIONS', [
            '.jpg', '.jpeg', '.png', '.gif', '.pdf', '.doc', '.docx',
            '.xls', '.xlsx', '.ppt', '.pptx', '.txt', '.zip', '.rar'
        ])

        # AWS S3 configuration
        self.s3_bucket = getattr(settings, 'S3_BUCKET', None)
        self.s3_region = getattr(settings, 'S3_REGION', 'us-east-1')
        self.aws_access_key = getattr(settings, 'AWS_ACCESS_KEY_ID', None)
        self.aws_secret_key = getattr(settings, 'AWS_SECRET_ACCESS_KEY', None)

        # Initialize S3 client if configured
        self.s3_client = None
        if self.aws_access_key and self.aws_secret_key and boto3 is not None:
            self.s3_client = boto3.client(
                's3',
                aws_access_key_id=self.aws_access_key,
                aws_secret_access_key=self.aws_secret_key,
                region_name=self.s3_region
            )

    def upload_file(self, file: UploadFile, entity_type: str = None,
                   entity_id: int = None, category: str = None) -> Dict[str, Any]:
        """Upload and process a file"""
        try:
            # Validate file
            validation_result = self.validate_upload_file(file)
            if not validation_result["valid"]:
                raise HTTPException(status_code=400, detail=validation_result["error"])

            # Generate unique filename
            file_extension = Path(file.filename).suffix.lower()
            unique_filename = f"{uuid.uuid4()}{file_extension}"

            # Determine storage path
            storage_path = self.get_storage_path(entity_type, category)
            file_path = os.path.join(storage_path, unique_filename)

            # Ensure directory exists
            os.makedirs(os.path.dirname(file_path), exist_ok=True)

            # Save file to disk
            file_size = self.save_file_to_disk(file, file_path)

            # Calculate checksum
            checksum = self.calculate_checksum(file_path)

            # Get MIME type
            mime_type = self.get_mime_type(file.filename)

            # Determine file type
            file_type = self.determine_file_type(mime_type, file_extension)

            result = {
                "filename": unique_filename,
                "original_filename": file.filename,
                "file_path": file_path,
                "file_size": file_size,
                "mime_type": mime_type,
                "file_type": file_type,
                "checksum": checksum,
                "storage_provider": "local"
            }

            logger.info(f"File uploaded successfully: {unique_filename}")
            return result

        except Exception as e:
            logger.error(f"Error uploading file: {str(e)}")
            raise HTTPException(status_code=500, detail=f"File upload failed: {str(e)}")

    def validate_upload_file(self, file: UploadFile) -> Dict[str, Any]:
        """Validate uploaded file"""
        try:
            # Check file size
            if hasattr(file, 'size') and file.size > self.max_file_size:
                return {
                    "valid": False,
                    "error": f"File size exceeds maximum allowed size of {self.max_file_size / (1024*1024):.1f}MB"
                }

            # Check file extension
            file_extension = Path(file.filename).suffix.lower()
            if file_extension not in self.allowed_extensions:
                return {
                    "valid": False,
                    "error": f"File type '{file_extension}' is not allowed"
                }

            # Check filename
            if not file.filename or len(file.filename) > 255:
                return {
                    "valid": False,
                    "error": "Invalid filename"
                }

            # Check for potentially dangerous filenames
            dangerous_patterns = ['../', '..\\', '<script', 'javascript:', 'vbscript:']
            filename_lower = file.filename.lower()
            if any(pattern in filename_lower for pattern in dangerous_patterns):
                return {
                    "valid": False,
                    "error": "Filename contains potentially dangerous content"
                }

            return {"valid": True}

        except Exception as e:
            return {"valid": False, "error": f"Validation error: {str(e)}"}

    def validate_file(self, file_path: str) -> Dict[str, Any]:
        """Validate file after upload"""
        try:
            if not os.path.exists(file_path):
                return {"valid": False, "error": "File does not exist"}

            # Check file size
            file_size = os.path.getsize(file_path)
            if file_size > self.max_file_size:
                return {"valid": False, "error": "File size exceeds limit"}

            if file_size == 0:
                return {"valid": False, "error": "File is empty"}

            # Additional validation based on file type
            mime_type = self.get_mime_type(file_path)

            # Validate image files
            if mime_type and mime_type.startswith('image/'):
                validation_result = self.validate_image_file(file_path)
                if not validation_result["valid"]:
                    return validation_result

            # Validate PDF files
            elif mime_type == 'application/pdf':
                validation_result = self.validate_pdf_file(file_path)
                if not validation_result["valid"]:
                    return validation_result

            return {"valid": True}

        except Exception as e:
            return {"valid": False, "error": f"File validation error: {str(e)}"}

    def validate_image_file(self, file_path: str) -> Dict[str, Any]:
        """Validate image file"""
        try:
            from PIL import Image

            with Image.open(file_path) as img:
                # Check image dimensions
                max_dimension = 10000  # 10000px max
                if img.width > max_dimension or img.height > max_dimension:
                    return {"valid": False, "error": "Image dimensions too large"}

                # Check for valid image format
                if img.format not in ['JPEG', 'PNG', 'GIF', 'BMP', 'TIFF']:
                    return {"valid": False, "error": "Unsupported image format"}

            return {"valid": True}

        except Exception as e:
            return {"valid": False, "error": f"Invalid image file: {str(e)}"}

    def validate_pdf_file(self, file_path: str) -> Dict[str, Any]:
        """Validate PDF file"""
        try:
            # Check if file starts with PDF header
            with open(file_path, 'rb') as f:
                header = f.read(4)
                if header != b'%PDF':
                    return {"valid": False, "error": "Invalid PDF file"}

            return {"valid": True}

        except Exception as e:
            return {"valid": False, "error": f"Invalid PDF file: {str(e)}"}

    def save_file_to_disk(self, file: UploadFile, file_path: str) -> int:
        """Save uploaded file to disk"""
        try:
            total_size = 0

            with open(file_path, "wb") as f:
                while chunk := file.file.read(8192):  # Read in 8KB chunks
                    total_size += len(chunk)

                    # Check size limit during upload
                    if total_size > self.max_file_size:
                        f.close()
                        os.remove(file_path)
                        raise ValueError("File size exceeds maximum limit")

                    f.write(chunk)

            return total_size

        except Exception as e:
            # Clean up partial file on error
            if os.path.exists(file_path):
                os.remove(file_path)
            raise e

    def upload_to_s3(self, local_file_path: str, filename: str) -> Optional[str]:
        """Upload file to S3"""
        try:
            if not self.s3_client or not self.s3_bucket:
                logger.warning("S3 not configured")
                return None

            # Generate S3 key
            s3_key = f"uploads/{datetime.now().strftime('%Y/%m/%d')}/{filename}"

            # Upload file
            self.s3_client.upload_file(
                local_file_path,
                self.s3_bucket,
                s3_key,
                ExtraArgs={
                    'ServerSideEncryption': 'AES256',
                    'StorageClass': 'STANDARD_IA'
                }
            )

            logger.info(f"File uploaded to S3: {s3_key}")
            return s3_key

        except Exception as e:
            logger.error(f"Error uploading to S3: {str(e)}")
            return None

    def download_from_s3(self, s3_key: str, local_file_path: str) -> bool:
        """Download file from S3"""
        try:
            if not self.s3_client or not self.s3_bucket:
                return False

            self.s3_client.download_file(self.s3_bucket, s3_key, local_file_path)
            logger.info(f"File downloaded from S3: {s3_key}")
            return True

        except Exception as e:
            logger.error(f"Error downloading from S3: {str(e)}")
            return False

    def delete_from_s3(self, s3_key: str) -> bool:
        """Delete file from S3"""
        try:
            if not self.s3_client or not self.s3_bucket:
                return False

            self.s3_client.delete_object(Bucket=self.s3_bucket, Key=s3_key)
            logger.info(f"File deleted from S3: {s3_key}")
            return True

        except Exception as e:
            logger.error(f"Error deleting from S3: {str(e)}")
            return False

    def get_storage_path(self, entity_type: str = None, category: str = None) -> str:
        """Get storage path based on entity type and category"""
        base_path = self.upload_dir

        # Add date-based subdirectory
        date_path = datetime.now().strftime('%Y/%m/%d')

        if entity_type:
            return os.path.join(base_path, entity_type, date_path)
        elif category:
            return os.path.join(base_path, category, date_path)
        else:
            return os.path.join(base_path, 'general', date_path)

    def calculate_checksum(self, file_path: str) -> str:
        """Calculate SHA-256 checksum of file"""
        try:
            sha256_hash = hashlib.sha256()
            with open(file_path, "rb") as f:
                for chunk in iter(lambda: f.read(4096), b""):
                    sha256_hash.update(chunk)
            return sha256_hash.hexdigest()

        except Exception as e:
            logger.error(f"Error calculating checksum: {str(e)}")
            return ""

    def get_mime_type(self, filename: str) -> str:
        """Get MIME type of file"""
        mime_type, _ = mimetypes.guess_type(filename)
        return mime_type or 'application/octet-stream'

    def determine_file_type(self, mime_type: str, extension: str) -> str:
        """Determine file type category"""
        if mime_type:
            if mime_type.startswith('image/'):
                return 'image'
            elif mime_type.startswith('video/'):
                return 'video'
            elif mime_type.startswith('audio/'):
                return 'audio'
            elif mime_type == 'application/pdf':
                return 'pdf'
            elif mime_type in ['application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']:
                return 'document'
            elif mime_type in ['application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet']:
                return 'spreadsheet'
            elif mime_type in ['application/zip', 'application/x-rar-compressed', 'application/x-tar', 'application/gzip']:
                return 'archive'

        # Fallback to extension-based detection
        extension = extension.lower()
        if extension in ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.tiff']:
            return 'image'
        elif extension in ['.mp4', '.avi', '.mov', '.wmv', '.flv']:
            return 'video'
        elif extension in ['.mp3', '.wav', '.ogg', '.flac']:
            return 'audio'
        elif extension == '.pdf':
            return 'pdf'
        elif extension in ['.doc', '.docx', '.txt', '.rtf']:
            return 'document'
        elif extension in ['.xls', '.xlsx', '.csv']:
            return 'spreadsheet'
        elif extension in ['.zip', '.rar', '.tar', '.gz']:
            return 'archive'

        return 'other'

    def get_file_url(self, file_path: str, s3_path: str = None) -> str:
        """Get URL for accessing file"""
        if s3_path and self.s3_client:
            # Generate presigned URL for S3
            try:
                url = self.s3_client.generate_presigned_url(
                    'get_object',
                    Params={'Bucket': self.s3_bucket, 'Key': s3_path},
                    ExpiresIn=3600  # 1 hour
                )
                return url
            except Exception as e:
                logger.error(f"Error generating S3 URL: {str(e)}")

        # Return local file path (to be served by FastAPI)
        relative_path = os.path.relpath(file_path, self.upload_dir)
        return f"/files/{relative_path}"

    def delete_file(self, file_path: str, s3_path: str = None) -> bool:
        """Delete file from storage"""
        success = True

        # Delete from local storage
        try:
            if os.path.exists(file_path):
                os.remove(file_path)
                logger.info(f"Local file deleted: {file_path}")
        except Exception as e:
            logger.error(f"Error deleting local file: {str(e)}")
            success = False

        # Delete from S3 if exists
        if s3_path:
            s3_success = self.delete_from_s3(s3_path)
            success = success and s3_success

        return success

    def create_thumbnail(self, file_path: str, size: tuple = (150, 150)) -> Optional[str]:
        """Create thumbnail for image file"""
        try:
            from PIL import Image

            mime_type = self.get_mime_type(file_path)
            if not mime_type or not mime_type.startswith('image/'):
                return None

            base_name = os.path.splitext(file_path)[0]
            thumbnail_path = f"{base_name}_thumb.jpg"

            with Image.open(file_path) as image:
                # Convert to RGB if necessary
                if image.mode in ("RGBA", "P"):
                    image = image.convert("RGB")

                # Create thumbnail
                image.thumbnail(size, Image.Resampling.LANCZOS)
                image.save(thumbnail_path, "JPEG", quality=85, optimize=True)

            return thumbnail_path

        except Exception as e:
            logger.error(f"Error creating thumbnail: {str(e)}")
            return None
