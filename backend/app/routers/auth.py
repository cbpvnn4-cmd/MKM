from fastapi import APIRouter, Depends, HTTPException, status, Request
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from typing import List
from datetime import timedelta
from jose import JWTError, jwt

from app.database.database import get_db
from app.models.users import User as UserModel, Role as RoleModel, UserRole as UserRoleModel
from app.schemas.user import User as UserSchema, Role as RoleSchema, UserCreate, Token, TokenData
from app.core.security import (
    verify_password,
    get_password_hash,
    create_access_token,
    SECRET_KEY,
    ALGORITHM,
    ACCESS_TOKEN_EXPIRE_MINUTES as DEFAULT_TOKEN_EXPIRE_MINUTES,
)

router = APIRouter()
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="auth/login")

DEFAULT_MINUTES = DEFAULT_TOKEN_EXPIRE_MINUTES


def _assemble_user_schema(db: Session, user: UserModel) -> UserSchema:
    """Build a UserSchema with deterministic role objects (avoids UserRole objects)."""
    roles = (
        db.query(RoleModel)
        .join(UserRoleModel, RoleModel.id == UserRoleModel.role_id)
        .filter(UserRoleModel.user_id == user.id)
        .all()
    )

    return UserSchema(
        id=user.id,
        username=user.username,
        email=user.email,
        full_name=user.full_name,
        is_active=user.is_active,
        is_superuser=user.is_superuser,
        created_at=user.created_at,
        updated_at=user.updated_at,
        roles=[RoleSchema.model_validate(role, from_attributes=True) for role in roles],
    )


def authenticate_user(db: Session, username: str, password: str):
    user = db.query(UserModel).filter(UserModel.username == username).first()
    if not user or not verify_password(password, user.hashed_password):
        return False
    return user


async def get_current_user(db: Session = Depends(get_db), token: str = Depends(oauth2_scheme)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        if username is None:
            raise credentials_exception
        token_data = TokenData(username=username)
    except JWTError:
        raise credentials_exception
    user = db.query(UserModel).filter(UserModel.username == token_data.username).first()
    if user is None:
        raise credentials_exception

    return _assemble_user_schema(db, user)


async def get_current_active_user(current_user: UserSchema = Depends(get_current_user)):
    if not current_user.is_active:
        raise HTTPException(status_code=400, detail="Inactive user")
    return current_user


@router.post("/login", response_model=Token)
async def login_for_access_token(request: Request, db: Session = Depends(get_db)):
    """
    Accept both form-encoded and JSON login payloads to keep frontend flexible.
    Expected fields: username, password, optional remember_days.
    """
    username = password = None
    remember_days_raw = None

    content_type = request.headers.get("content-type", "")
    if "application/json" in content_type:
        body = await request.json()
        username = body.get("username")
        password = body.get("password")
        remember_days_raw = body.get("remember_days")
    else:
        form = await request.form()
        username = form.get("username")
        password = form.get("password")
        remember_days_raw = form.get("remember_days")

    if not username or not password:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="username and password are required",
        )

    user = authenticate_user(db, username, password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    # Allow frontend to optionally request longer expiry via remember_days form field.
    expires_minutes = DEFAULT_MINUTES
    try:
        if remember_days_raw is not None and str(remember_days_raw).strip() != "":
            rd = int(str(remember_days_raw))
            if rd > 0:
                # Cap max to 90 days for safety
                expires_minutes = min(rd * 1440, 90 * 1440)
    except Exception:
        # Fallback to default if parsing fails
        expires_minutes = DEFAULT_MINUTES

    access_token_expires = timedelta(minutes=expires_minutes)
    access_token = create_access_token(
        data={"sub": user.username}, expires_delta=access_token_expires
    )
    return {"access_token": access_token, "token_type": "bearer"}


@router.post("/register", response_model=UserSchema)
def register_user(user: UserCreate, db: Session = Depends(get_db)):
    # Check if user already exists
    db_user = db.query(UserModel).filter(UserModel.username == user.username).first()
    if db_user:
        raise HTTPException(status_code=400, detail="Username already registered")

    db_user = db.query(UserModel).filter(UserModel.email == user.email).first()
    if db_user:
        raise HTTPException(status_code=400, detail="Email already registered")

    # Create new user
    hashed_password = get_password_hash(user.password)
    db_user = UserModel(
        username=user.username,
        email=user.email,
        full_name=user.full_name,
        hashed_password=hashed_password,
        is_active=True
    )

    try:
        db.add(db_user)
        db.commit()
        db.refresh(db_user)

        # Assign default "User" role to new user
        default_role = db.query(RoleModel).filter(RoleModel.name == "User").first()
        if default_role:
            user_role = UserRoleModel(
                user_id=db_user.id,
                role_id=default_role.id
            )
            db.add(user_role)
            db.commit()
            db.refresh(db_user)

        return _assemble_user_schema(db, db_user)
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=400, detail="Username or email already registered")


@router.get("/me", response_model=UserSchema)
async def read_users_me(current_user: UserSchema = Depends(get_current_active_user)):
    return current_user


@router.post("/logout")
async def logout_user():
    # In a stateless JWT auth system, logout is typically handled on the client side
    # by removing the token from storage. This endpoint can be used for token invalidation
    # if a token blacklist is implemented.
    return {"message": "Successfully logged out"}
