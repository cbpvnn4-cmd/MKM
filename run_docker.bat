@echo off
setlocal

rem Run from the project root even if launched elsewhere
cd /d "%~dp0"

echo Starting Docker Compose (build + up)...
docker compose version >nul 2>&1
if errorlevel 1 (
  echo Using docker-compose ^(legacy^)...
  docker-compose up -d --build --force-recreate --remove-orphans
) else (
  docker compose up -d --build --force-recreate --remove-orphans
)

if errorlevel 1 (
  echo.
  echo Failed to start containers. Check Docker Desktop and try again.
  exit /b 1
)

echo.
echo Done. Open http://localhost
endlocal
