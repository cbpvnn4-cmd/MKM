@echo off
chcp 65001 >nul
echo ========================================
echo إعادة تشغيل الباك إند فقط...
echo Restarting Backend Container...
echo ========================================
echo.

cd /d "%~dp0"

echo [1/3] إيقاف حاوية الباك إند...
docker-compose stop backend

echo.
echo [2/3] إعادة بناء الباك إند...
docker-compose build backend

echo.
echo [3/3] تشغيل الباك إند...
docker-compose up -d backend

echo.
echo ========================================
echo ✅ تم إعادة التشغيل بنجاح!
echo Backend Restarted Successfully!
echo ========================================
echo.
pause
