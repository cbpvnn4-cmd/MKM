import os
import warnings
import secrets
from typing import Optional

class Settings:
    """إعدادات وتكوين التطبيق - Application settings and configuration"""

    # Database settings
    DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite:///./elevator_company.db")

    # Security settings
    _default_secret = "your-secret-key-here-change-in-production"
    SECRET_KEY: str = os.getenv("SECRET_KEY", _default_secret)

    # Warn if using default secret key
    if SECRET_KEY == _default_secret and os.getenv("DEBUG", "true").lower() != "true":
        warnings.warn(
            "⚠️ WARNING: Using default SECRET_KEY in production is insecure! "
            "Please set a unique SECRET_KEY environment variable. "
            "Generate one with: python -c 'import secrets; print(secrets.token_urlsafe(32))'",
            UserWarning
        )

    ALGORITHM: str = os.getenv("ALGORITHM", "HS256")

    # Token expiry - موحّد مع .env و security.py
    # الافتراضي: 7 أيام (10080 دقيقة)
    try:
        ACCESS_TOKEN_EXPIRE_MINUTES: int = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "10080"))
    except (ValueError, TypeError):
        ACCESS_TOKEN_EXPIRE_MINUTES: int = 10080

    # Password requirements
    MIN_PASSWORD_LENGTH: int = int(os.getenv("MIN_PASSWORD_LENGTH", "8"))
    REQUIRE_PASSWORD_UPPERCASE: bool = os.getenv("REQUIRE_PASSWORD_UPPERCASE", "true").lower() == "true"
    REQUIRE_PASSWORD_LOWERCASE: bool = os.getenv("REQUIRE_PASSWORD_LOWERCASE", "true").lower() == "true"
    REQUIRE_PASSWORD_DIGIT: bool = os.getenv("REQUIRE_PASSWORD_DIGIT", "true").lower() == "true"
    REQUIRE_PASSWORD_SPECIAL: bool = os.getenv("REQUIRE_PASSWORD_SPECIAL", "true").lower() == "true"

    # Rate limiting settings
    ENABLE_RATE_LIMITING: bool = os.getenv("ENABLE_RATE_LIMITING", "true").lower() == "true"
    DISABLE_RATE_LIMIT_IN_DEBUG: bool = os.getenv("DISABLE_RATE_LIMIT_IN_DEBUG", "false").lower() == "true"

    # Session settings
    SESSION_COOKIE_NAME: str = os.getenv("SESSION_COOKIE_NAME", "session")
    SESSION_COOKIE_SECURE: bool = os.getenv("SESSION_COOKIE_SECURE", "false").lower() == "true"
    SESSION_COOKIE_HTTPONLY: bool = os.getenv("SESSION_COOKIE_HTTPONLY", "true").lower() == "true"
    SESSION_COOKIE_SAMESITE: str = os.getenv("SESSION_COOKIE_SAMESITE", "lax")

    # CSRF protection
    ENABLE_CSRF_PROTECTION: bool = os.getenv("ENABLE_CSRF_PROTECTION", "true").lower() == "true"
    CSRF_COOKIE_NAME: str = os.getenv("CSRF_COOKIE_NAME", "csrf_token")

    # File upload settings
    UPLOAD_DIR: str = os.getenv("UPLOAD_DIR", "./uploads")
    MAX_FILE_SIZE: int = 100 * 1024 * 1024  # 100MB
    ALLOWED_EXTENSIONS: list = [
        '.jpg', '.jpeg', '.png', '.gif', '.pdf', '.doc', '.docx',
        '.xls', '.xlsx', '.ppt', '.pptx', '.txt', '.zip', '.rar'
    ]

    # AWS S3 settings (optional)
    S3_BUCKET: Optional[str] = os.getenv("S3_BUCKET", None)
    S3_REGION: str = os.getenv("S3_REGION", "us-east-1")
    AWS_ACCESS_KEY_ID: Optional[str] = os.getenv("AWS_ACCESS_KEY_ID", None)
    AWS_SECRET_ACCESS_KEY: Optional[str] = os.getenv("AWS_SECRET_ACCESS_KEY", None)

    # Redis / Celery settings (optional, but required if Celery is used)
    REDIS_URL: str = os.getenv("REDIS_URL", "redis://localhost:6379/0")

    # Email settings (optional)
    SMTP_HOST: Optional[str] = os.getenv("SMTP_HOST", None)
    SMTP_PORT: int = int(os.getenv("SMTP_PORT", "587"))
    SMTP_USER: Optional[str] = os.getenv("SMTP_USER", None)
    SMTP_PASSWORD: Optional[str] = os.getenv("SMTP_PASSWORD", None)
    SMTP_FROM_EMAIL: Optional[str] = os.getenv("SMTP_FROM_EMAIL", "noreply@example.com")

    # Application settings
    APP_NAME: str = os.getenv("APP_NAME", "Elevator Management System")
    APP_VERSION: str = os.getenv("APP_VERSION", "1.0.0")
    DEBUG: bool = os.getenv("DEBUG", "true").lower() == "true"
    ENVIRONMENT: str = os.getenv("ENVIRONMENT", "development")

    # CORS settings - موحّدة مع .env
    _allowed_origins = os.getenv("ALLOWED_ORIGINS", "")
    if _allowed_origins:
        CORS_ORIGINS: list = [origin.strip() for origin in _allowed_origins.split(",")]
    else:
        CORS_ORIGINS: list = [
            "http://localhost:3000",
            "http://localhost:3001",
            "http://127.0.0.1:3000",
            "http://localhost:5173",  # Vite default
            "http://localhost:8080",
        ]

settings = Settings()
