@echo off
chcp 65001 >nul
title Restart Backend Server

echo.
echo ========================================
echo   Restart Backend Server
echo ========================================
echo.

echo [i] Stopping backend server...
call stop_backend.bat

echo.
echo [i] Starting backend server...
timeout /t 2 /nobreak >nul
call start_backend.bat
