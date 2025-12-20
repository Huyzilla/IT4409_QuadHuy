param()

$ErrorActionPreference = "Stop"

Write-Host "=====================================" -ForegroundColor Cyan
Write-Host "Starting All Services (DEV Mode)" -ForegroundColor Cyan
Write-Host "Backend: Local | Camera: Docker | AI: Docker | React: Local" -ForegroundColor Yellow
Write-Host "=====================================" -ForegroundColor Cyan

function Get-PortOwnerProcess([int]$Port) {
    try {
        $conn = Get-NetTCPConnection -LocalPort $Port -ErrorAction SilentlyContinue | Select-Object -First 1
        if (-not $conn) { return $null }
        return Get-Process -Id $conn.OwningProcess -ErrorAction SilentlyContinue
    } catch {
        return $null
    }
}

function Assert-PortFree([int]$Port, [string]$Name) {
    $p = Get-PortOwnerProcess -Port $Port
    if ($p) {
        Write-Host "" 
        Write-Host ("ERROR: {0} port {1} is already in use by PID {2} ({3})." -f $Name, $Port, $p.Id, $p.ProcessName) -ForegroundColor Red
        if ($p.Path) {
            Write-Host ("Path: {0}" -f $p.Path) -ForegroundColor DarkGray
        }
        Write-Host "Please stop the process (or close the old dev window) then run this script again." -ForegroundColor Yellow
        exit 1
    }
}

# --- NETWORK (DA SUA LOI) ---
# Kiem tra neu network chua co thi moi tao
if (-not (docker network ls -q -f name=traffic-net)) {
    Write-Host "Creating Docker network 'traffic-net'..." -ForegroundColor Gray
    docker network create traffic-net
} else {
    Write-Host "Docker network 'traffic-net' already exists. Skipping." -ForegroundColor Gray
}

# --- DATABASE ---
Write-Host ""
Write-Host "Starting Database Services (Docker)..." -ForegroundColor Green
Set-Location "$PSScriptRoot\backend"
docker-compose up -d postgres redis

# If a dockerized backend is still running from PROD, stop it so DEV hot-reload works.
try {
    $backendContainer = (docker ps -q -f "name=nest-backend")
    if ($backendContainer) {
        Write-Host "Stopping docker backend container 'nest-backend' (DEV uses local backend)..." -ForegroundColor Yellow
        docker stop nest-backend | Out-Null
    }
} catch {
    # ignore
}

# --- CAMERA ---
Write-Host ""
Write-Host "Starting Camera Services..." -ForegroundColor Green
Set-Location "$PSScriptRoot" 
docker-compose -f docker-compose.cam.yml up -d

# --- BACKEND ---
Write-Host ""
Write-Host "Starting Backend (Local)..." -ForegroundColor Green
Set-Location "$PSScriptRoot\backend"

# Ensure backend .env exists for local dev (DATABASE_URL/JWT_SECRET)
if (-not (Test-Path ".env")) {
    if (Test-Path ".env.example") {
        Write-Host "Creating backend/.env from .env.example..." -ForegroundColor Gray
        Copy-Item ".env.example" ".env" -Force
    } else {
        Write-Host "Creating backend/.env with default values..." -ForegroundColor Gray
        @(
            'DATABASE_URL="postgresql://admin:admin123@localhost:5433/traffic_ai?schema=public"',
            'REDIS_HOST="localhost"',
            'REDIS_PORT=6379',
            'PORT=3000',
            'JWT_SECRET="dev_jwt_secret_change_me"'
        ) | Set-Content -Encoding UTF8 ".env"
    }
}

# If .env exists but is missing JWT_SECRET, append it.
if (-not (Select-String -Path ".env" -Pattern '^\s*JWT_SECRET\s*=' -Quiet)) {
    Write-Host "Adding JWT_SECRET to backend/.env..." -ForegroundColor Gray
    Add-Content -Encoding UTF8 ".env" 'JWT_SECRET="dev_jwt_secret_change_me"'
}

if (-not (Test-Path "node_modules")) {
    Write-Host "Installing Backend dependencies..." -ForegroundColor Gray
    npm install
}

# Wait for Postgres
$dbHost = "localhost"
$dbPort = 5433
$maxSeconds = 60
Write-Host "Waiting for PostgreSQL at localhost:5433 (timeout 60s)..." -ForegroundColor Yellow

$timer = [System.Diagnostics.Stopwatch]::StartNew()
$connected = $false

while ($timer.Elapsed.TotalSeconds -lt $maxSeconds) {
    # Kiem tra ket noi don gian
    $test = Test-NetConnection -ComputerName $dbHost -Port $dbPort -InformationLevel Quiet -WarningAction SilentlyContinue
    
    if ($test) {
        $connected = $true
        Write-Host "PostgreSQL is reachable" -ForegroundColor Green
        break
    }
    
    Start-Sleep -Seconds 1
    Write-Host -NoNewline "." 
}
$timer.Stop()

if (-not $connected) {
    Write-Host ""
    Write-Host "PostgreSQL not reachable. Script aborted." -ForegroundColor Red
    exit 1
}

# Prisma Push
Write-Host ""
Write-Host "Pushing DB schema..." -ForegroundColor Gray
cmd /c npx prisma db push

Write-Host "Launching Backend API..."
# Ensure API port is free, otherwise hot-reload won't reflect your code changes
Assert-PortFree -Port 3000 -Name "Backend API"

# Dung npm.cmd de chay tren Windows (array args to avoid quoting issues)
Start-Process "npm.cmd" -ArgumentList @("run", "start:dev") -WorkingDirectory "$PSScriptRoot\backend" -WindowStyle Normal

# --- AI SERVICE ---
Write-Host ""
Write-Host "Starting AI Service..." -ForegroundColor Green
Set-Location "$PSScriptRoot\ai"
docker-compose -f docker-compose.ai.yml up -d

# --- FRONTEND ---
Write-Host ""
Write-Host "Starting React Frontend..." -ForegroundColor Green
Set-Location "$PSScriptRoot\my-react-app"

if (-not (Test-Path "node_modules")) {
    Write-Host "Installing Frontend dependencies..." -ForegroundColor Gray
    npm install
}

# Ensure Vite port is free to get proper HMR
Assert-PortFree -Port 5173 -Name "React (Vite)"

Start-Process "npm.cmd" -ArgumentList @("run", "dev") -WorkingDirectory "$PSScriptRoot\my-react-app" -WindowStyle Normal

# --- SUMMARY ---
Write-Host ""
Write-Host "===== DEV MODE STARTED =====" -ForegroundColor Cyan
Write-Host ""
Write-Host "LOCAL:" -ForegroundColor Yellow
Write-Host "  Backend API: http://localhost:3000"
Write-Host "  React:       http://localhost:5173"

Write-Host ""
Write-Host "DOCKER:" -ForegroundColor Yellow
Write-Host "  Camera RTSP: rtsp://localhost:8554/[north|east|south]"
Write-Host "  HLS:         http://localhost:8888"
Write-Host "  AI:          ai-service"

Write-Host ""
Write-Host "DATABASE:" -ForegroundColor Yellow
Write-Host "  PostgreSQL:  localhost:5433"
Write-Host "  Redis:       localhost:6379"

Write-Host ""
Write-Host "To stop: .\stop-all-dev.ps1" -ForegroundColor Magenta

Read-Host "Press Enter to exit this launcher (Services will keep running)..."