@echo off
chcp 65001 >nul
setlocal enabledelayedexpansion

:: ============================================================
:: نظام السند للمصاعد - SANAD ELEVATORS Management System
:: ملف عرض السجلات (Logs)
:: ============================================================

title "نظام السند للمصاعد - السجلات"

cls
echo.
echo ============================================================
echo    نظام السند للمصاعد - عرض السجلات
echo ============================================================
echo.

set "GREEN=[92m"
set "YELLOW=[93m"
set "CYAN=[96m"
set "RESET=[0m"

echo %CYAN%اختر الخدمة لعرض سجلاتها:%RESET%
echo.
echo   1 - الواجهة الخلفية (Backend)
echo   2 - الواجهة الأمامية (Frontend)
echo   3 - قاعدة البيانات (Database)
echo   4 - Nginx Proxy
echo   5 - جميع الخدمات
echo   6 - عرض سجلات مباشرة (Live)
echo.
set /p choice="اختيارك (1-6): "

if "%choice%" equ "1" (
    echo.
    echo %CYAN%سجلات الواجهة الخلفية (آخر 50 سطر):%RESET%
    echo %CYAN%────────────────────────────────────%RESET%
    docker logs --tail 50 --follow elevator_backend
) else if "%choice%" equ "2" (
    echo.
    echo %CYAN%سجلات الواجهة الأمامية (آخر 50 سطر):%RESET%
    echo %CYAN%────────────────────────────────────%RESET%
    docker logs --tail 50 --follow elevator_frontend
) else if "%choice%" equ "3" (
    echo.
    echo %CYAN%سجلات قاعدة البيانات (آخر 50 سطر):%RESET%
    echo %CYAN%────────────────────────────────────%RESET%
    docker logs --tail 50 --follow elevator_db
) else if "%choice%" equ "4" (
    echo.
    echo %CYAN%سجلات Nginx (آخر 50 سطر):%RESET%
    echo %CYAN%────────────────────────────────────%RESET%
    docker logs --tail 50 --follow elevator_nginx
) else if "%choice%" equ "5" (
    echo.
    echo %CYAN%سجلات جميع الخدمات (آخر 30 سطر لكل):%RESET%
    echo.
    echo %YELLOW%═══ Backend ═══%RESET%
    docker logs --tail 30 elevator_backend 2>&1
    echo.
    echo %YELLOW%═══ Frontend ═══%RESET%
    docker logs --tail 30 elevator_frontend 2>&1
    echo.
    echo %YELLOW%═══ Database ═══%RESET%
    docker logs --tail 30 elevator_db 2>&1
    echo.
    echo %YELLOW%═══ Nginx ═══%RESET%
    docker logs --tail 30 elevator_nginx 2>&1
    echo.
    pause
) else if "%choice%" equ "6" (
    echo.
    echo %CYAN%عرض السجلات المباشرة (Live Logs)%RESET%
    echo %CYAN%اختر الخدمة:%RESET%
    echo   1 - Backend
    echo   2 - Frontend
    echo   3 - Database
    echo   4 - Nginx
    echo.
    set /p live="اختيارك (1-4): "
    echo.
    echo %CYAN%اضغط Ctrl+C للإيقاف%RESET%
    echo.
    if "!live!" equ "1" docker logs --follow elevator_backend
    if "!live!" equ "2" docker logs --follow elevator_frontend
    if "!live!" equ "3" docker logs --follow elevator_db
    if "!live!" equ "4" docker logs --follow elevator_nginx
) else (
    echo %YELLOW%اختيار غير صحيح%RESET%
    pause
)
