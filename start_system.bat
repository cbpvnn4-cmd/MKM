@echo off
setlocal enabledelayedexpansion

:: ============================================================
:: SANAD ELEVATORS Management System - System Startup
:: ============================================================

title "SANAD ELEVATORS - Starting System..."

echo.
echo ============================================================
echo    SANAD ELEVATORS Management System
echo ============================================================
echo.

echo Checking service status...
echo.

:: Check if Docker containers are already running
docker ps 2>nul | findstr "elevator_" >nul
if %errorlevel% equ 0 (
    echo WARNING: Some containers are already running!
    echo.
    docker ps | findstr "elevator_"
    echo.
    set /p continue="Do you want to restart the system? (y/n): "
    if /i "!continue!" neq "y" (
        echo Cancelled.
        pause
        exit /b 0
    )
    echo.
    echo Stopping current services...
    call stop_system.bat
    echo.
)

echo Starting database...
docker compose up -d db 2>nul
if %errorlevel% neq 0 (
    docker-compose up -d db 2>nul
)

echo Waiting for database readiness...
set DB_WAIT=0
set DB_MAX_WAIT=60
:wait_db
timeout /t 2 /nobreak >nul
set /a DB_WAIT+=2
if !DB_WAIT! gtr !DB_MAX_WAIT! (
    echo WARNING: Database health not confirmed, but continuing...
    goto continue_backend
)

docker ps 2>nul | findstr "elevator_db" >nul
if %errorlevel% neq 0 (
    goto wait_db
)

echo [OK] Database is ready
echo.

:continue_backend
echo Starting Backend...
docker compose up -d backend 2>nul
if %errorlevel% neq 0 (
    docker-compose up -d backend 2>nul
)

echo Waiting for Backend readiness...
set BACKEND_WAIT=0
set BACKEND_MAX_WAIT=120
:wait_backend
timeout /t 2 /nobreak >nul
set /a BACKEND_WAIT+=2
if !BACKEND_WAIT! gtr !BACKEND_MAX_WAIT! (
    echo WARNING: Backend readiness not confirmed, but continuing...
    goto continue_frontend
)

:: Check if container is running
docker ps 2>nul | findstr "elevator_backend" >nul
if %errorlevel% neq 0 (
    echo Waiting for container to start...
    goto wait_backend
)

:: Check HTTP response
curl -s http://localhost:8000/api/v1/health >nul 2>&1
if %errorlevel% equ 0 (
    echo [OK] Backend is ready
    echo.
    goto continue_frontend
)

:: Alternative check
curl -s http://localhost:8000/ >nul 2>&1
if %errorlevel% equ 0 (
    echo [OK] Backend is ready
    echo.
    goto continue_frontend
)

:: Check logs if container has been running long
if !BACKEND_WAIT! gtr 20 (
    docker logs elevator_backend 2>&1 | findstr /i "Application startup complete" >nul
    if %errorlevel% equ 0 (
        echo [OK] Backend is ready
        echo.
        goto continue_frontend
    )
)

echo Waiting for Backend... (Elapsed: !BACKEND_WAIT!/!BACKEND_MAX_WAIT! seconds)
goto wait_backend

:continue_frontend
echo Starting Frontend...
docker compose up -d frontend 2>nul
if %errorlevel% neq 0 (
    docker-compose up -d frontend 2>nul
)

echo Waiting for Frontend readiness...
set FRONTEND_WAIT=0
set FRONTEND_MAX_WAIT=120
:wait_frontend
timeout /t 2 /nobreak >nul
set /a FRONTEND_WAIT+=2
if !FRONTEND_WAIT! gtr !FRONTEND_MAX_WAIT! (
    echo WARNING: Frontend readiness not confirmed, but continuing...
    goto continue_nginx
)

:: Check if container is running
docker ps 2>nul | findstr "elevator_frontend" >nul
if %errorlevel% neq 0 (
    echo Waiting for container to start... (Elapsed: !FRONTEND_WAIT!/!FRONTEND_MAX_WAIT! seconds)
    goto wait_frontend
)

:: Check HTTP response
curl -s http://localhost:3000 >nul 2>&1
if %errorlevel% equ 0 (
    echo [OK] Frontend is ready
    echo.
    goto continue_nginx
)

echo Waiting for Frontend... (Elapsed: !FRONTEND_WAIT!/!FRONTEND_MAX_WAIT! seconds)
goto wait_frontend

:continue_nginx
echo Starting Nginx Proxy...
docker compose up -d nginx 2>nul
if %errorlevel% neq 0 (
    docker-compose up -d nginx 2>nul
)

timeout /t 3 /nobreak >nul

echo.
echo =============================================================
echo   [OK] System started successfully!
echo =============================================================
echo.
echo Available Services:
echo.
echo   1. Frontend:    http://localhost:3000
echo   2. Backend API: http://localhost:8000
echo   3. Nginx Proxy: http://localhost:80
echo   4. PostgreSQL:  localhost:5433
echo.
echo To stop the system, run: stop_system.bat
echo.
echo Current Service Status:
docker ps | findstr "elevator_"
echo.

:: Open browser automatically
set /p open="Do you want to open browser? (y/n): "
if /i "!open!" equ "y" (
    echo Opening browser...
    start http://localhost:80
)

echo.
echo Press any key to exit...
pause >nul
