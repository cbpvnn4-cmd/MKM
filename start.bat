@echo off
setlocal ENABLEEXTENSIONS
title Elevator Management System

REM Delegate to PowerShell orchestrator for a robust startup
powershell -ExecutionPolicy Bypass -NoProfile -File "%~dp0start.ps1" %*

endlocal
