from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from app.routers import auth, partners, customers, sales, quotations, contracts, inventory, maintenance, expenses, reports, profit_distribution, user_management, elevator_bom, purchases
from app.database.database import Base, engine
from app.core.config import settings
from app.core.rate_limiter import rate_limit_middleware
import os
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

# For SQLite, we need to check_same_thread=False
if "sqlite" in os.getenv("DATABASE_URL", ""):
    from sqlalchemy import event
    @event.listens_for(engine, "connect")
    def set_sqlite_pragma(dbapi_connection, connection_record):
        cursor = dbapi_connection.cursor()
        cursor.execute("PRAGMA foreign_keys=ON")
        cursor.close()

# Create tables
Base.metadata.create_all(bind=engine)

app = FastAPI(title="SANAD ELEVATORS - نظام السند للمصاعد المتكامل",
              description="A comprehensive business management solution for SANAD ELEVATORS",
              version="1.0.0")

# Rate Limiting Middleware
if settings.ENABLE_RATE_LIMITING:
    @app.middleware("http")
    async def rate_limit_handler(request: Request, call_next):
        return await rate_limit_middleware(request, call_next)

# Security Headers Middleware
@app.middleware("http")
async def security_headers_middleware(request: Request, call_next):
    """Add security headers to all responses."""
    response = await call_next(request)
    # Security headers
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["X-XSS-Protection"] = "1; mode=block"
    response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
    response.headers["Permissions-Policy"] = "geolocation=(), microphone=(), camera=()"
    return response

# CORS Configuration - موحّد مع config.py و .env
# In development: allow all origins for flexibility
# In production: use specific origins from settings
if settings.DEBUG:
    # Development: permissive CORS
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],  # Development only
        allow_credentials=False,  # Cannot use credentials with wildcard
        allow_methods=["*"],
        allow_headers=["*"],
    )
else:
    # Production: use configured origins
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.CORS_ORIGINS,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

# Include routers
app.include_router(auth.router, prefix="/api/auth", tags=["Authentication"])
app.include_router(partners.router, prefix="/api/partners", tags=["Partners"])
app.include_router(customers.router, prefix="/api", tags=["Customers and Projects"])
app.include_router(sales.router, prefix="/api", tags=["Sales and Invoicing"])
app.include_router(quotations.router, prefix="/api", tags=["Quotations"])
app.include_router(contracts.router, prefix="/api", tags=["Contracts"])
app.include_router(inventory.router, prefix="/api", tags=["Inventory"])
app.include_router(maintenance.router, prefix="/api", tags=["Maintenance"])
app.include_router(expenses.router, prefix="/api/expenses", tags=["Expenses"])
app.include_router(reports.router, prefix="/api/reports", tags=["Reports"])
app.include_router(profit_distribution.router, prefix="/api/profit-distribution", tags=["Profit Distribution"])
app.include_router(user_management.router, prefix="/api/admin", tags=["User Management"])
app.include_router(elevator_bom.router, prefix="/api", tags=["Elevator BOM and Pricing"])
app.include_router(purchases.router, prefix="/api", tags=["Purchases and Elevators"])

@app.get("/")
def read_root():
    return {
        "message": "Welcome to SANAD ELEVATORS Management System API - مرحباً بك في نظام السند للمصاعد",
        "version": settings.APP_VERSION,
        "environment": settings.ENVIRONMENT
    }

@app.get("/health")
def health_check():
    """فحص صحة الخدمة"""
    return {
        "status": "healthy",
        "app_name": settings.APP_NAME,
        "version": settings.APP_VERSION
    }

# Global exception handler
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    """Global exception handler for unhandled exceptions."""
    if settings.DEBUG:
        # In development, return full error details
        import traceback
        return JSONResponse(
            status_code=500,
            content={
                "detail": str(exc),
                "type": type(exc).__name__,
                "traceback": traceback.format_exc()
            }
        )
    else:
        # In production, return generic error message
        return JSONResponse(
            status_code=500,
            content={"detail": "An internal server error occurred. Please try again later."}
        )

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
