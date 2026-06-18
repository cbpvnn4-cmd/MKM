@echo off
chcp 65001 >nul
title Backend Server - Sanad Elevators

echo.
echo ========================================
echo   Backend Server - Sanad Elevators
echo ========================================
echo.

REM Check if server is already running
netstat -ano | findstr ":8000" >nul 2>&1
if %errorlevel% equ 0 (
    echo [✓] Backend Server is ALREADY RUNNING!
    echo.
    echo     Server URL: http://localhost:8000
    echo     API Docs:   http://localhost:8000/docs
    echo.
    echo To stop: Close the running backend window or press Ctrl+C
    echo.
    pause
    exit /b 0
)

echo [i] Checking backend directory...
cd backend 2>nul
if %errorlevel% neq 0 (
    echo [✗] Error: backend directory not found!
    pause
    exit /b 1
)

echo [✓] Backend directory found
echo.
echo [i] Starting server...
echo.
echo     Server URL: http://localhost:8000
echo     API Docs:   http://localhost:8000/docs
echo.
echo Press Ctrl+C to stop the server
echo ----------------------------------------
echo.

REM Try run_server.py first, then main.py
if exist "run_server.py" (
    echo [i] Running: python run_server.py
    echo.
    python run_server.py
    set EXIT_CODE=%errorlevel%
) else if exist "main.py" (
    echo [i] Running: python main.py
    echo.
    python main.py
    set EXIT_CODE=%errorlevel%
) else (
    echo [✗] Error: No server file found!
    echo     Expected: run_server.py or main.py
    echo.
    pause
    exit /b 1
)

REM If we reach here, the server stopped
echo.
echo ========================================
if %EXIT_CODE% neq 0 (
    echo [✗] Server stopped with ERROR!
    echo     Exit Code: %EXIT_CODE%
    echo.
    echo Check the error messages above ^^^
    echo.
    color 0C
) else (
    echo [✓] Server stopped normally
    echo.
)
echo ========================================
echo.
pause
