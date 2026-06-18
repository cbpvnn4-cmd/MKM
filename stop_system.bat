@echo off
chcp 65001 >nul
setlocal enabledelayedexpansion

:: ============================================================
:: نظام السند للمصاعد - SANAD ELEVATORS Management System
:: ملف إيقاف النظام
:: ============================================================

title "نظام السند للمصاعد - جاري الإيقاف..."

echo.
echo ============================================================
echo    نظام السند للمصاعد المتكامل - إيقاف النظام
echo    SANAD ELEVATORS Management System - Stop
echo ============================================================
echo.

:: الألوان
set "GREEN=[92m"
set "RED=[91m"
set "YELLOW=[93m"
set "CYAN=[96m"
set "RESET=[0m"

echo %CYAN%جاري فحص الخدمات النشطة...%RESET%
echo.

:: فحص ما إذا كانت الحاويات تعمل
docker ps --format "{{.Names}}" 2>nul | findstr "elevator_" >nul
if %errorlevel% neq 0 (
    echo %YELLOW%لا توجد خدمات تعمل حالياً.%RESET%
    echo.
    pause
    exit /b 0
)

:: عرض الحاويات النشطة
echo %CYAN%الخدمات النشطة:%RESET%
echo.
docker ps --format "table {{.Names}}\t{{.Status}}" 2>nul | findstr "elevator_"
echo.

:: تأكيد الإيقاف
set /p confirm="هل تريد إيقاف جميع الخدمات؟ (y/n): "
if /i "!confirm!" neq "y" (
    echo %RED%تم الإلغاء.%RESET%
    pause
    exit /b 0
)

echo.
echo %CYAN%جاري إيقاف الخدمات...%RESET%
echo.

:: إيقاف Docker containers - نحاول docker compose أولاً ثم docker-compose
docker compose down 2>nul
if %errorlevel% neq 0 (
    docker-compose down 2>nul
)

if %errorlevel% equ 0 (
    echo %GREEN%✓ تم إيقاف جميع الخدمات بنجاح%RESET%
    echo.

    :: فحص إذا كانت هناك حاويات لا تزال تعمل
    docker ps --format "{{.Names}}" 2>nul | findstr "elevator_" >nul
    if %errorlevel% equ 0 (
        echo %YELLOW%بعض الحاويات لا تزال تعمل، جاري إيقافها بالقوة...%RESET%
        docker ps --format "{{.Names}}" 2>nul | findstr "elevator_" > temp_containers.txt
        for /f "tokens=*" %%c in (temp_containers.txt) do (
            docker stop %%c 2>nul
            docker rm %%c 2>nul
        )
        del temp_containers.txt 2>nul
        echo %GREEN%✓ تم إيقاف جميع الحاويات%RESET%
    )
) else (
    echo %RED%✗ حدث خطأ أثناء إيقاف الخدمات%RESET%
    echo.
    echo جاري المحاولة بالطريقة اليدوية...
    docker ps -q --filter "name=elevator_" | for /f "tokens=*" %%i in ('more') do docker stop %%i 2>nul
    docker ps -aq --filter "name=elevator_" | for /f "tokens=*" %%i in ('more') do docker rm %%i 2>nul
    echo %YELLOW%تمت المحاولة%RESET%
)

echo.
echo %CYAN%حالة الخدمات الآن:%RESET%
echo.

docker ps --format "table {{.Names}}\t{{.Status}}" 2>nul | findstr "elevator_"
if %errorlevel% neq 0 (
    echo %GREEN%جميع الخدمات متوقفة%RESET%
)

echo.
echo %CYAN%اضغط أي زر للخروج...%RESET%
pause >nul
