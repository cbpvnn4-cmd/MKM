@echo off
chcp 65001 >nul
color 0A
title Backend Server - Sanad Elevators [Verbose Mode]

echo.
echo ╔════════════════════════════════════════╗
echo ║  Backend Server - Sanad Elevators      ║
echo ║  [Verbose Mode - Shows All Errors]     ║
echo ╚════════════════════════════════════════╝
echo.

REM Check if server is already running
echo [1/5] Checking if server is already running...
netstat -ano | findstr ":8000" | findstr LISTENING >nul 2>&1
if %errorlevel% equ 0 (
    color 0E
    echo.
    echo ╔════════════════════════════════════════╗
    echo ║  ⚠️  SERVER ALREADY RUNNING!           ║
    echo ╚════════════════════════════════════════╝
    echo.
    echo     Server URL: http://localhost:8000
    echo     API Docs:   http://localhost:8000/docs
    echo.
    echo To stop it first, run: stop_backend.bat
    echo Then try again.
    echo.
    pause
    exit /b 0
)
echo      ✓ Port 8000 is free

REM Check Python installation
echo [2/5] Checking Python installation...
python --version >nul 2>&1
if %errorlevel% neq 0 (
    color 0C
    echo      ✗ ERROR: Python not found!
    echo.
    echo Please install Python first.
    pause
    exit /b 1
)
for /f "tokens=*" %%i in ('python --version 2^>^&1') do set PYTHON_VERSION=%%i
echo      ✓ %PYTHON_VERSION% found

REM Check backend directory
echo [3/5] Checking backend directory...
if not exist "backend" (
    color 0C
    echo      ✗ ERROR: backend directory not found!
    echo.
    echo Make sure you're running this from the project root.
    pause
    exit /b 1
)
cd backend
echo      ✓ Backend directory found

REM Check server files
echo [4/5] Checking server files...
if exist "run_server.py" (
    set SERVER_FILE=run_server.py
    echo      ✓ Found: run_server.py
) else if exist "main.py" (
    set SERVER_FILE=main.py
    echo      ✓ Found: main.py
) else (
    color 0C
    echo      ✗ ERROR: No server file found!
    echo.
    echo Expected: run_server.py or main.py
    pause
    exit /b 1
)

REM Start server
echo [5/5] Starting server...
echo.
echo ╔════════════════════════════════════════╗
echo ║  🚀 Server Starting...                 ║
echo ╚════════════════════════════════════════╝
echo.
echo     Server URL: http://localhost:8000
echo     API Docs:   http://localhost:8000/docs
echo     Server File: %SERVER_FILE%
echo.
echo ════════════════════════════════════════
echo  All output and errors will appear below:
echo ════════════════════════════════════════
echo.

REM Run server and capture exit code
python %SERVER_FILE%
set EXIT_CODE=%errorlevel%

REM Server stopped - show status
echo.
echo.
echo ════════════════════════════════════════
if %EXIT_CODE% equ 0 (
    color 0A
    echo.
    echo ╔════════════════════════════════════════╗
    echo ║  ✓ Server Stopped Normally             ║
    echo ╚════════════════════════════════════════╝
    echo.
) else (
    color 0C
    echo.
    echo ╔════════════════════════════════════════╗
    echo ║  ✗ SERVER STOPPED WITH ERROR!          ║
    echo ╚════════════════════════════════════════╝
    echo.
    echo     Exit Code: %EXIT_CODE%
    echo.
    echo 📋 Common Errors and Solutions:
    echo ────────────────────────────────────────
    echo.
    echo   • Port 8000 already in use:
    echo     → Run stop_backend.bat first
    echo.
    echo   • Module not found:
    echo     → Run: pip install -r requirements.txt
    echo.
    echo   • Database error:
    echo     → Check if database file exists
    echo.
    echo   • Import error:
    echo     → Check Python version (need 3.8+)
    echo.
    echo ════════════════════════════════════════
    echo.
    echo ⬆️  Check the error messages above ⬆️
    echo.
)
echo.
pause
