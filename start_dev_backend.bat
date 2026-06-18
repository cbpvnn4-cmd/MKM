@echo off
chcp 65001 >nul
title Backend DEV Mode (Auto-Reload)

echo.
echo ========================================
echo    Backend DEV Mode (Auto-Reload)
echo    وضع التطوير - إعادة تحميل تلقائية
echo ========================================
echo.
echo   URL: http://localhost:8000
echo   Docs: http://localhost:8000/docs
echo.
echo   Features:
echo   - Auto-Reload: ON (any change = restart)
echo   - Rate Limiting: OFF
echo   - Database: SQLite (no Docker needed)
echo.
echo   Press Ctrl+C to stop
echo ========================================
echo.

cd /d "%~dp0backend"

python -m uvicorn main:app --reload --host 0.0.0.0 --port 8000 --log-level info
