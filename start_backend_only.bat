@echo off
echo Starting Backend Server only...
echo.

REM Check if server is already running
netstat -ano | findstr ":8000" >nul 2>&1
if %errorlevel% equ 0 (
    echo.
    echo ========================================
    echo Backend Server is ALREADY RUNNING!
    echo ========================================
    echo.
    echo Backend is available at: http://localhost:8000
    echo API Documentation at: http://localhost:8000/docs
    echo.
    echo To stop the server, close the running backend window or use Ctrl+C
    echo.
    pause
    exit /b 0
)

cd backend
if not exist "run_server.py" (
    echo Error: run_server.py not found in backend directory!
    echo Trying to run main.py instead...
    if exist "main.py" (
        python main.py
    ) else (
        echo Error: Neither run_server.py nor main.py found!
        pause
        exit /b 1
    )
) else (
    echo Backend will be available at: http://localhost:8000
    echo API Documentation at: http://localhost:8000/docs
    echo.
    python run_server.py
)