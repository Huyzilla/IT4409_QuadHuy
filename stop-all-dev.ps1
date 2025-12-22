param()

Write-Host "=====================================" -ForegroundColor Yellow
Write-Host "Stopping All DEV Services..." -ForegroundColor Yellow
Write-Host "=====================================" -ForegroundColor Yellow

Set-Location "$PSScriptRoot"

Write-Host "`nStopping Camera Services..." -ForegroundColor Yellow
docker-compose -f docker-compose.cam.yml down

Write-Host "`nStopping Database Services..." -ForegroundColor Yellow
Set-Location "$PSScriptRoot\backend"
docker-compose down

Write-Host "`nStopping AI Service..." -ForegroundColor Yellow
Set-Location "$PSScriptRoot\ai"
docker-compose -f docker-compose.ai.yml down

Write-Host "`nStopping Backend (Local)..." -ForegroundColor Yellow
Get-Process npm -ErrorAction SilentlyContinue | Stop-Process -Force

Write-Host "`nDone!" -ForegroundColor Green
