@echo off
chcp 65001 >nul
title Start DEV Environment (No Docker)

echo.
echo ========================================
echo    Start DEV Environment (No Docker)
echo    تشغيل بيئة التطوير
echo ========================================
echo.
echo   Backend:  http://localhost:8000
echo   Frontend: http://localhost:3000
echo.
echo   Press Ctrl+C to stop all
echo ========================================
echo.

cd /d "%~dp0"

echo [1/2] Starting Backend...
start "Backend DEV" cmd /k "cd /d "%~dp0backend" && python -m uvicorn main:app --reload --host 0.0.0.0 --port 8000"

timeout /t 3 /nobreak >nul

echo [2/2] Starting Frontend...
start "Frontend DEV" cmd /k "cd /d "%~dp0frontend" && npm run dev"

echo.
echo ========================================
echo   Both servers started!
echo   تم تشغيل الخوادم!
echo ========================================
echo.
pause
