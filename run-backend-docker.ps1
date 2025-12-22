param()

$ErrorActionPreference = "Stop"

Write-Host "=====================================" -ForegroundColor Cyan
Write-Host "Starting Backend in Docker" -ForegroundColor Cyan
Write-Host "Container: nest-backend (port 3000)" -ForegroundColor Yellow
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

# Ensure port 3000 is free (DEV local backend uses this port)
$p = Get-PortOwnerProcess -Port 3000
if ($p) {
    Write-Host "" 
    Write-Host ("ERROR: Port 3000 is already in use by PID {0} ({1})." -f $p.Id, $p.ProcessName) -ForegroundColor Red
    if ($p.Path) {
        Write-Host ("Path: {0}" -f $p.Path) -ForegroundColor DarkGray
    }
    Write-Host "Stop the local backend (DEV) first, then re-run this script." -ForegroundColor Yellow
    Write-Host "Tip: run .\\stop-all-dev.ps1 (it will stop local npm processes)." -ForegroundColor Gray
    exit 1
}

# Ensure docker network exists
if (-not (docker network ls -q -f name=traffic-net)) {
    Write-Host "Creating Docker network 'traffic-net'..." -ForegroundColor Gray
    docker network create traffic-net | Out-Null
}

Write-Host "" 
Write-Host "Starting Backend stack (postgres, redis, backend)..." -ForegroundColor Green
Set-Location "$PSScriptRoot\backend"

# Bring up database + redis first, then backend
docker-compose up -d postgres redis backend

Write-Host "" 
Write-Host "Done." -ForegroundColor Green
Write-Host "Backend API: http://localhost:3000" -ForegroundColor Cyan
Write-Host "Swagger:     http://localhost:3000/api/docs" -ForegroundColor Cyan
Write-Host "Logs:        docker logs -f nest-backend" -ForegroundColor Gray

Read-Host "Press Enter..."
