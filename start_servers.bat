@echo off
echo Starting Elevator Company Management System...
echo ================================================

REM Check if Python is installed
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: Python is not installed or not in PATH
    echo Please install Python 3.8+ from https://python.org
    pause
    exit /b 1
)

REM Check if Node.js is installed
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: Node.js is not installed or not in PATH
    echo Please install Node.js from https://nodejs.org
    pause
    exit /b 1
)

echo ✓ Python and Node.js are available

REM Start backend server
echo.
echo Starting Backend Server (FastAPI)...
echo =====================================
start "Backend Server" cmd /k "cd backend && echo Installing Python dependencies... && pip install -r requirements.txt && echo Starting FastAPI server on http://localhost:8000... && python main.py"

REM Wait a bit for backend to start
timeout /t 5 /nobreak > nul

REM Start frontend server
echo.
echo Starting Frontend Server (React + Vite)...
echo ==========================================
start "Frontend Server" cmd /k "cd frontend && echo Installing Node.js dependencies... && npm install && echo Starting frontend on http://localhost:3000... && npm run dev"

echo.
echo ✓ Both servers are starting...
echo.
echo Backend:  http://localhost:8000
echo Frontend: http://localhost:3000
echo.
echo API Health Check: http://localhost:8000/health
echo API Docs: http://localhost:8000/docs
echo.
echo Press any key to close this window...
pause > nul