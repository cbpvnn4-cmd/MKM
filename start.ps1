<#
  Start the Integrated Elevator Company Management System (Windows)
  - Creates/uses Python venv in backend/.venv
  - Installs backend deps and runs Alembic migrations
  - Ensures frontend deps and Tailwind config
  - Starts backend (Uvicorn) and frontend (Vite) in separate windows
#>

param(
  [switch]$NoBrowser,
  [int]$ApiPort = 8000,
  [int]$WebPort = 3000
)

$ErrorActionPreference = 'Stop'

function Write-Step([string]$text) {
  Write-Host "[+] $text" -ForegroundColor Cyan
}

function Resolve-Python() {
  $py = Get-Command python -ErrorAction SilentlyContinue
  if (-not $py) { $py = Get-Command py -ErrorAction SilentlyContinue }
  if (-not $py) { throw 'Python is not installed or not in PATH. Install Python 3.10+.' }
  return $py.Source
}

function Ensure-Venv($backendPath) {
  $venvPython = Join-Path $backendPath ".venv/Scripts/python.exe"
  if (-not (Test-Path $venvPython)) {
    Write-Step "Creating Python virtual environment (.venv)"
    $python = Resolve-Python
    Push-Location $backendPath
    & $python -m venv .venv
    Pop-Location
  }
  return $venvPython
}

function Install-BackendDeps($backendPath, $venvPython) {
  Write-Step "Installing backend dependencies"
  & $venvPython -m pip install --upgrade pip > $null
  & $venvPython -m pip install -r (Join-Path $backendPath 'requirements.txt')
}

function Ensure-Env($backendPath) {
  $envFile = Join-Path $backendPath '.env'
  $envExample = Join-Path $backendPath '.env.example'
  if (-not (Test-Path $envFile) -and (Test-Path $envExample)) {
    Write-Step "Creating backend/.env from .env.example (edit as needed)"
    Copy-Item $envExample $envFile -Force
  }
}

function Maybe-Start-DB($backendPath) {
  $envFile = Join-Path $backendPath '.env'
  if (-not (Test-Path $envFile)) { return }
  $dbUrl = (Get-Content $envFile | Where-Object { $_ -match '^DATABASE_URL=' }) -replace '^DATABASE_URL=',''
  if ($dbUrl -and $dbUrl -match '^postgres') {
    $docker = Get-Command docker -ErrorAction SilentlyContinue
    $compose = Get-Command docker-compose -ErrorAction SilentlyContinue
    if ($docker -and $compose) {
      $running = (& docker ps --format '{{.Names}}' | Select-String -SimpleMatch 'db').Length
      if (-not $running) {
        Write-Step "Starting PostgreSQL via docker-compose (db service)"
        Push-Location (Split-Path -Parent $PSCommandPath)
        & docker-compose up -d db
        Pop-Location
        Start-Sleep -Seconds 5
      }
    } else {
      Write-Host "[!] DATABASE_URL is Postgres but Docker not found; ensure DB is available." -ForegroundColor Yellow
    }
  }
}

function Run-Migrations($backendPath, $venvPython) {
  Write-Step "Running Alembic migrations"
  Push-Location $backendPath
  & (Join-Path (Split-Path $venvPython -Parent) 'alembic.exe') upgrade head
  Pop-Location
}

function Ensure-FrontendDeps($frontendPath) {
  Write-Step "Installing frontend dependencies"
  Push-Location $frontendPath
  if (Test-Path 'package-lock.json') {
    if (-not (Test-Path 'node_modules')) { & npm.cmd ci } else { & npm.cmd install }
  } else { & npm.cmd install }
  Pop-Location
}

function Ensure-TailwindConfig($frontendPath) {
  $tailwind = Join-Path $frontendPath 'tailwind.config.js'
  $postcss = Join-Path $frontendPath 'postcss.config.cjs'
  if (-not (Test-Path $tailwind)) {
@'
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./index.html','./src/**/*.{js,jsx,ts,tsx}'],
  theme: { extend: {} },
  plugins: [],
}
'@ | Set-Content $tailwind -Encoding utf8
  }
  if (-not (Test-Path $postcss)) {
@'
module.exports = { plugins: { tailwindcss: {} } }
'@ | Set-Content $postcss -Encoding utf8
  }
}

function Ensure-FreePort([int]$port){
  try {
    $conns = Get-NetTCPConnection -State Listen -LocalPort $port -ErrorAction SilentlyContinue
    if ($conns) {
      $pid = $conns[0].OwningProcess
      Write-Host "[!] Port $port in use by PID $pid. Stopping it." -ForegroundColor Yellow
      Stop-Process -Id $pid -Force -ErrorAction SilentlyContinue
      Start-Sleep -Milliseconds 600
    }
  } catch {}
}

function Start-Backend($backendPath, $venvPython, [int]$port) {
  Write-Step "Starting backend (FastAPI) on port $port"
  Ensure-FreePort $port
  $args = @('-m','uvicorn','main:app','--host','0.0.0.0','--port',"$port",'--reload')
  Start-Process -FilePath $venvPython -ArgumentList $args -WorkingDirectory $backendPath -WindowStyle Minimized -PassThru | Out-Null
}

function Start-Frontend($frontendPath, [int]$port) {
  Write-Step "Starting frontend (Vite) on port $port"
  Ensure-FreePort $port
  # Use npm.cmd on Windows
  Start-Process -FilePath 'npm.cmd' -ArgumentList 'run','start' -WorkingDirectory $frontendPath -WindowStyle Minimized -PassThru | Out-Null
}

# Main
$repoRoot = Split-Path -Parent $PSCommandPath
$backend = Join-Path $repoRoot 'backend'
$frontend = Join-Path $repoRoot 'frontend'

Write-Host "=== Starting Elevator Management System ===" -ForegroundColor Green

Ensure-Env $backend
$venvPy = Ensure-Venv $backend
Install-BackendDeps $backend $venvPy
Maybe-Start-DB $backend
Run-Migrations $backend $venvPy
Ensure-TailwindConfig $frontend
Ensure-FrontendDeps $frontend
Start-Backend $backend $venvPy $ApiPort
Start-Frontend $frontend $WebPort

if (-not $NoBrowser) {
  Start-Process "http://localhost:$WebPort/login"
  Start-Process "http://localhost:$ApiPort/docs"
}

Write-Host "=== System started. Frontend: http://localhost:$WebPort  API: http://localhost:$ApiPort ===" -ForegroundColor Green
