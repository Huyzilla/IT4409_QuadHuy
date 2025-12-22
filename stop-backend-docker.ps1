param()

$ErrorActionPreference = "Stop"

Write-Host "=====================================" -ForegroundColor Yellow
Write-Host "Stopping Backend in Docker" -ForegroundColor Yellow
Write-Host "Container: nest-backend" -ForegroundColor DarkYellow
Write-Host "=====================================" -ForegroundColor Yellow

Set-Location "$PSScriptRoot\backend"

# Stop only the backend container (keep postgres/redis running)
docker-compose stop backend

Write-Host "" 
Write-Host "Done." -ForegroundColor Green

Read-Host "Press Enter..."
