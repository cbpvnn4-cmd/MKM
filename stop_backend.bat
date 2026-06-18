@echo off
chcp 65001 >nul
title Stop Backend Server

echo.
echo ========================================
echo   Stop Backend Server
echo ========================================
echo.

REM Find processes using port 8000
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":8000"') do (
    set PID=%%a
    goto :kill
)

echo [i] No backend server running on port 8000
pause
exit /b 0

:kill
echo [i] Found backend server with PID: %PID%
echo [i] Stopping server...
taskkill /F /PID %PID% >nul 2>&1
if %errorlevel% equ 0 (
    echo [✓] Backend server stopped successfully!
) else (
    echo [✗] Failed to stop backend server
    echo     You may need to close it manually or run this as Administrator
)
echo.
pause
