@echo off
chcp 65001 >nul
setlocal enabledelayedexpansion

:: ============================================================
:: نظام السند للمصاعد - SANAD ELEVATORS Management System
:: ملف فحص حالة النظام
:: ============================================================

title "نظام السند للمصاعد - حالة النظام"

cls
echo.
echo ============================================================
echo    نظام السند للمصاعد المتكامل - حالة النظام
echo    SANAD ELEVATORS Management System - Status
echo ============================================================
echo.

:: الألوان
set "GREEN=[92m"
set "RED=[91m"
set "YELLOW=[93m"
set "BLUE=[94m"
set "CYAN=[96m"
set "RESET=[0m"

echo %CYAN%جاري فحص حالة الخدمات...%RESET%
echo.

:: فحص Docker
docker --version >nul 2>&1
if %errorlevel% neq 0 (
    echo %RED%✗ Docker غير مثبت أو لا يعمل!%RESET%
    pause
    exit /b 1
)

:: فحص الحاويات
echo %CYAN%──────────────────────────────────────────────%RESET%
echo %CYAN%  حالة الحاويات (Docker Containers)%RESET%
echo %CYAN%──────────────────────────────────────────────%RESET%
echo.

docker ps -a --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}" 2>nul | findstr /i "elevator_ NAMES"
docker ps -a --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}" 2>nul | findstr /i "elevator_"

echo.
echo %CYAN%──────────────────────────────────────────────%RESET%
echo.

:: فحص كل خدمة على حدة
set "all_ok=1"

:: قاعدة البيانات
echo %CYAN%قاعدة البيانات (PostgreSQL):%RESET%
docker ps --format "{{.Status}}" | findstr "elevator_db" >nul
if %errorlevel% equ 0 (
    docker ps --format "{{.Status}}" | findstr "elevator_db.*healthy" >nul
    if %errorlevel% equ 0 (
        echo %GREEN%  ✓ تعمل بشكل صحيح (Healthy)%RESET%
        echo     المنفذ: 5433
    ) else (
        echo %YELLOW%  ⚠ تعمل لكن ليست جاهزة بعد%RESET%
        set "all_ok=0"
    )
) else (
    echo %RED%  ✗ متوقفة%RESET%
    set "all_ok=0"
)
echo.

:: الواجهة الخلفية
echo %CYAN%الواجهة الخلفية (Backend API):%RESET%
docker ps --format "{{.Status}}" | findstr "elevator_backend.*Up" >nul
if %errorlevel% equ 0 (
    curl -s http://localhost:8000/health >nul 2>&1
    if %errorlevel% equ 0 (
        echo %GREEN%  ✓ تعمل بشكل صحيح%RESET%
        echo     المنفذ: 8000
        echo     Health: http://localhost:8000/health
    ) else (
        echo %YELLOW%  ⚠ الحاوية تعمل لكن الخدمة لا تستجيب%RESET%
        set "all_ok=0"
    )
) else (
    echo %RED%  ✗ متوقفة%RESET%
    set "all_ok=0"
)
echo.

:: الواجهة الأمامية
echo %CYAN%الواجهة الأمامية (Frontend):%RESET%
docker ps --format "{{.Status}}" | findstr "elevator_frontend.*Up" >nul
if %errorlevel% equ 0 (
    curl -s http://localhost:3000 >nul 2>&1
    if %errorlevel% equ 0 (
        echo %GREEN%  ✓ تعمل بشكل صحيح%RESET%
        echo     المنفذ: 3000
        echo     URL: http://localhost:3000
    ) else (
        echo %YELLOW%  ⚠ الحاوية تعمل لكن الخدمة لا تستجيب%RESET%
        set "all_ok=0"
    )
) else (
    echo %RED%  ✗ متوقفة%RESET%
    set "all_ok=0"
)
echo.

:: Nginx
echo %CYAN%خادم الوكيل (Nginx Proxy):%RESET%
docker ps --format "{{.Status}}" | findstr "elevator_nginx.*Up" >nul
if %errorlevel% equ 0 (
    echo %GREEN%  ✓ يعمل بشكل صحيح%RESET%
    echo     المنافذ: 80, 443
    echo     URL: http://localhost:80
) else (
    echo %RED%  ✗ متوقف%RESET%
    set "all_ok=0"
)
echo.

echo %CYAN%──────────────────────────────────────────────%RESET%
echo.

:: ملخص الحالة
if "%all_ok%" equ "1" (
    echo %GREEN%============================================================%RESET%
    echo %GREEN%  ✓ جميع الخدمات تعمل بشكل صحيح%RESET%
    echo %GREEN%============================================================%RESET%
    echo.
    echo %CYAN%يمكنك الوصول إلى النظام عبر:%RESET%
    echo   %BLUE%http://localhost:80%RESET%     - عبر Nginx (موصى به)
    echo   %BLUE%http://localhost:3000%RESET%   - الواجهة الأمامية مباشرة
    echo   %BLUE%http://localhost:8000%RESET%   - الواجهة الخلفية API
) else (
    echo %RED%============================================================%RESET%
    echo %RED%  ⚠ بعض الخدمات لا تعمل بشكل صحيح%RESET%
    echo %RED%============================================================%RESET%
    echo.
    echo %CYAN%لإصلاح المشكلة، جرب:%RESET%
    echo   1. تشغيل: restart_system.bat
    echo   2. أو: stop_system.bat ثم start_system.bat
)
echo.

echo %CYAN%──────────────────────────────────────────────%RESET%
echo %CYAN%سجلات الأخطاء (آخر 10 أسطر):%RESET%
echo %CYAN%──────────────────────────────────────────────%RESET%
echo.

:: عرض سجلات الأخطاء من جميع الحاويات
for %%c in (elevator_backend elevator_frontend elevator_db elevator_nginx) do (
    echo %YELLOW%%%c:%RESET%
    docker logs --tail 5 %%c 2>&1 | findstr /i "error warning fail" || echo     لا توجد أخطاء
    echo.
)

echo.
echo %CYAN%اضغط أي زر للخروج...%RESET%
pause >nul
