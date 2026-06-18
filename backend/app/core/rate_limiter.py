"""
Rate Limiting Middleware for FastAPI
Protects API endpoints from abuse and DDoS attacks
"""

from fastapi import Request, HTTPException, status
from fastapi.responses import JSONResponse
from collections import defaultdict
from datetime import datetime, timedelta
from typing import Dict, Tuple
import asyncio
from functools import wraps

from app.core.config import settings


class RateLimiter:
    """
    In-memory rate limiter using sliding window algorithm.
    For production, consider using Redis for distributed rate limiting.
    """

    def __init__(self):
        # Store request counts: {identifier: [(timestamp, count), ...]}
        self.requests: Dict[str, list] = defaultdict(list)
        # Lock for thread safety
        self._lock = asyncio.Lock()

    async def is_allowed(
        self,
        identifier: str,
        limit: int,
        window: int
    ) -> Tuple[bool, dict]:
        """
        Check if request is allowed based on rate limit.

        Args:
            identifier: Unique identifier (IP address or user ID)
            limit: Maximum number of requests allowed
            window: Time window in seconds

        Returns:
            Tuple of (allowed, info_dict)
        """
        async with self._lock:
            now = datetime.utcnow()
            window_start = now - timedelta(seconds=window)

            # Get existing requests for this identifier
            request_timestamps = self.requests.get(identifier, [])

            # Filter out timestamps outside the current window
            valid_requests = [
                ts for ts in request_timestamps
                if ts > window_start
            ]

            # Update the stored list
            self.requests[identifier] = valid_requests

            # Check if limit exceeded
            current_count = len(valid_requests)
            allowed = current_count < limit

            # Add current request if allowed
            if allowed:
                self.requests[identifier].append(now)

            # Calculate remaining requests and reset time
            remaining = max(0, limit - current_count - (1 if allowed else 0))
            reset_time = now + timedelta(
                seconds=max(0, window - (now - valid_requests[0]).total_seconds())
            ) if valid_requests else now + timedelta(seconds=window)

            return allowed, {
                "limit": limit,
                "remaining": remaining,
                "reset": reset_time.isoformat(),
            }

    async def reset(self, identifier: str):
        """Reset rate limit for a specific identifier."""
        async with self._lock:
            if identifier in self.requests:
                del self.requests[identifier]


# Global rate limiter instance
rate_limiter = RateLimiter()


# Rate limit configurations (requests per window)
RATE_LIMITS = {
    # Default limits
    "default": (100, 60),  # 100 requests per minute

    # Authentication endpoints (stricter)
    "login": (5, 300),     # 5 requests per 5 minutes
    "register": (3, 3600), # 3 requests per hour
    "reset_password": (3, 3600),

    # API endpoints
    "api_read": (60, 60),   # 60 requests per minute
    "api_write": (30, 60),  # 30 requests per minute

    # File upload
    "upload": (10, 3600),   # 10 uploads per hour
}


def get_rate_limit_key(request: Request) -> str:
    """
    Generate rate limit key from request.
    Uses API key if available, otherwise IP address.
    """
    # Try to get user ID from token
    auth_header = request.headers.get("Authorization")
    if auth_header and auth_header.startswith("Bearer "):
        # In production, decode token and get user ID
        # For now, use IP address
        pass

    # Use IP address as fallback
    forwarded = request.headers.get("X-Forwarded-For")
    if forwarded:
        ip = forwarded.split(",")[0].strip()
    else:
        ip = request.client.host if request.client else "unknown"

    return f"{ip}:{request.url.path}"


async def check_rate_limit(request: Request, limit_type: str = "default") -> None:
    """
    Check rate limit and raise exception if exceeded.

    Args:
        request: FastAPI request object
        limit_type: Type of rate limit to apply

    Raises:
        HTTPException: If rate limit exceeded
    """
    limit, window = RATE_LIMITS.get(limit_type, RATE_LIMITS["default"])
    key = get_rate_limit_key(request)

    allowed, info = await rate_limiter.is_allowed(key, limit, window)

    if not allowed:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail={
                "error": "Rate limit exceeded",
                "message": f"Too many requests. Maximum {limit} requests per {window} seconds allowed.",
                "retry_after": int((datetime.fromisoformat(info["reset"]) - datetime.utcnow()).total_seconds()),
            },
            headers={
                "X-RateLimit-Limit": str(info["limit"]),
                "X-RateLimit-Remaining": str(info["remaining"]),
                "X-RateLimit-Reset": info["reset"],
                "Retry-After": str(int((datetime.fromisoformat(info["reset"]) - datetime.utcnow()).total_seconds())),
            },
        )


def rate_limit(limit_type: str = "default"):
    """
    Decorator for rate limiting endpoints.

    Usage:
        @router.get("/api/products")
        @rate_limit("api_read")
        async def get_products():
            ...
    """
    def decorator(func):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            # Find request object
            request = None
            for arg in args:
                if isinstance(arg, Request):
                    request = arg
                    break

            if request:
                await check_rate_limit(request, limit_type)

            return await func(*args, **kwargs)
        return wrapper
    return decorator


# Rate limit middleware for all requests
async def rate_limit_middleware(request: Request, call_next):
    """
    Apply rate limiting to all requests.
    Can be used as FastAPI middleware.
    """
    # Skip rate limiting in development if configured
    if settings.DEBUG and settings.DISABLE_RATE_LIMIT_IN_DEBUG:
        return await call_next(request)

    try:
        # Determine limit type based on request
        path = request.url.path.lower()

        if "/login" in path or "/auth/login" in path:
            limit_type = "login"
        elif "/register" in path or "/auth/register" in path:
            limit_type = "register"
        elif "/upload" in path:
            limit_type = "upload"
        elif request.method in ["GET", "HEAD", "OPTIONS"]:
            limit_type = "api_read"
        else:
            limit_type = "api_write"

        # Check rate limit
        await check_rate_limit(request, limit_type)

    except HTTPException as e:
        if e.status_code == status.HTTP_429_TOO_MANY_REQUESTS:
            return JSONResponse(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                content=e.detail,
                headers=getattr(e, "headers", {}),
            )
        raise

    # Process request
    response = await call_next(request)

    # Add rate limit headers to response
    limit, window = RATE_LIMITS.get("default", RATE_LIMITS["default"])
    response.headers["X-RateLimit-Limit"] = str(limit)
    response.headers["X-RateLimit-Window"] = str(window)

    return response


# Export for use in main.py
__all__ = [
    "rate_limit",
    "rate_limit_middleware",
    "check_rate_limit",
    "rate_limiter",
    "RATE_LIMITS",
]
