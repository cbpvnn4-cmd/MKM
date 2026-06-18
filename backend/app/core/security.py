from passlib.context import CryptContext
from datetime import datetime, timedelta
from typing import Optional
from jose import JWTError, jwt
import os

# Password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# JWT configuration - موحّد مع .env و config.py
SECRET_KEY = os.getenv("SECRET_KEY", "your-secret-key-here")
ALGORITHM = os.getenv("ALGORITHM", "HS256")

# Token expiry - الافتراضي 7 أيام (10080 دقيقة) موحّد مع بقية الملفات
try:
    ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "10080"))
except (ValueError, TypeError):
    ACCESS_TOKEN_EXPIRE_MINUTES = 10080


def verify_password(plain_password, hashed_password):
    """التحقق من صحة كلمة المرور"""
    return pwd_context.verify(plain_password, hashed_password)


def get_password_hash(password):
    """تشفير كلمة المرور"""
    return pwd_context.hash(password)


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    """إنشاء رمز الوصول JWT"""
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        # استخدم القيمة الموحّدة من environment variable
        expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt
