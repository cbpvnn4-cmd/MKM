@echo off
chcp 65001 >nul
setlocal enabledelayedexpansion

:: ============================================================
:: نظام السند للمصاعد - SANAD ELEVATORS Management System
:: ملف إعادة تشغيل النظام
:: ============================================================

title "نظام السند للمصاعد - جاري إعادة التشغيل..."

echo.
echo ============================================================
echo    نظام السند للمصاعد المتكامل - إعادة التشغيل
echo    SANAD ELEVATORS Management System - Restart
echo ============================================================
echo.

:: الألوان
set "GREEN=[92m"
set "RED=[91m"
set "YELLOW=[93m"
set "CYAN=[96m"
set "RESET=[0m"

echo %CYAN%جاري إيقاف النظام...%RESET%
echo.

:: إيقاف جميع الحاويات - نحاول docker compose أولاً ثم docker-compose
docker compose down 2>nul
if %errorlevel% neq 0 (
    docker-compose down 2>nul
)

:: انتظر قليلاً
timeout /t 3 /nobreak >nul

echo.
echo %CYAN%جاري إعادة تشغيل النظام...%RESET%
echo.

:: إعادة التشغيل - نحاول docker compose أولاً ثم docker-compose
docker compose up -d 2>nul
if %errorlevel% neq 0 (
    docker-compose up -d 2>nul
)

echo.
echo %CYAN%في انتظار جاهزية الخدمات...%RESET%
echo.

:: انتظار قاعدة البيانات
:wait_db
timeout /t 2 /nobreak >nul
docker ps --format "{{.Status}}" | findstr "elevator_db.*healthy" >nul
if %errorlevel% neq 0 (
    goto wait_db
)
echo %GREEN%✓ قاعدة البيانات جاهزة%RESET%

:: انتظار الواجهة الخلفية
:wait_backend
timeout /t 2 /nobreak >nul
curl -s http://localhost:8000/health >nul 2>&1
if %errorlevel% neq 0 (
    goto wait_backend
)
echo %GREEN%✓ الواجهة الخلفية جاهزة%RESET%

:: انتظار الواجهة الأمامية
:wait_frontend
timeout /t 2 /nobreak >nul
curl -s http://localhost:3000 >nul 2>&1
if %errorlevel% neq 0 (
    goto wait_frontend
)
echo %GREEN%✓ الواجهة الأمامية جاهزة%RESET%

echo.
echo %GREEN%============================================================%RESET%
echo %GREEN%  ✓ تم إعادة تشغيل النظام بنجاح!%RESET%
echo %GREEN%============================================================%RESET%
echo.
echo %CYAN%الخدمات المتاحة:%RESET%
echo   http://localhost:3000  - الواجهة الأمامية
echo   http://localhost:8000  - الواجهة الخلفية
echo   http://localhost:80    - Nginx Proxy
echo.
echo %CYAN%اضغط أي زر للخروج...%RESET%
pause >nul
