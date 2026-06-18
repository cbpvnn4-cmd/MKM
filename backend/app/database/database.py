from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from pathlib import Path
import os
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

PROJECT_ROOT = Path(__file__).resolve().parents[3]


def _normalize_sqlite_url(db_url: str) -> str:
    """Ensure SQLite URLs always point to an absolute path."""
    if not db_url.startswith("sqlite:///"):
        return db_url

    raw_path = db_url.replace("sqlite:///", "", 1)
    sqlite_path = Path(raw_path)

    if not sqlite_path.is_absolute():
        sqlite_path = (PROJECT_ROOT / sqlite_path).resolve()

    return f"sqlite:///{sqlite_path.as_posix()}"


# Get database URL from environment variable or use default
DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "postgresql://postgres:password@localhost:5432/elevator_management"
)

# Only normalize if it's a SQLite URL
if DATABASE_URL.startswith("sqlite:///"):
    DATABASE_URL = _normalize_sqlite_url(DATABASE_URL)

# Connection arguments for different database types
connect_args = {}
if "sqlite" in DATABASE_URL:
    connect_args = {"check_same_thread": False}
elif "postgresql" in DATABASE_URL:
    # PostgreSQL connection args if needed
    connect_args = {"sslmode": "prefer"}

engine = create_engine(DATABASE_URL, connect_args=connect_args)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
