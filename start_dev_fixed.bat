@echo off
chcp 65001 >nul
title Start DEV Environment

echo.
echo ========================================
echo    Start DEV Environment - No Docker
echo ========================================
echo.
echo   Backend:  http://localhost:8000
echo   Frontend: http://localhost:3000
echo   API Docs: http://localhost:8000/docs
echo.
echo   Press Ctrl+C to stop all
echo ========================================
echo.

cd /d "%~dp0"

echo [1/2] Starting Backend...
cd backend
start "Backend DEV" cmd /k python -m uvicorn main:app --reload --host 0.0.0.0 --port 8000 --log-level info
cd ..

timeout /t 5 /nobreak >nul

echo [2/2] Starting Frontend...
cd frontend
start "Frontend DEV" cmd /k npm run dev
cd ..

echo.
echo ========================================
echo   Both servers started!
echo ========================================
echo.
echo   Backend:  http://localhost:8000
echo   Frontend: http://localhost:3000
echo   API Docs: http://localhost:8000/docs
echo.
pause
