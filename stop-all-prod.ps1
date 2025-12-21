param()

Write-Host "=====================================" -ForegroundColor Yellow
Write-Host "Stopping All PROD Services..." -ForegroundColor Yellow
Write-Host "=====================================" -ForegroundColor Yellow

Set-Location "$PSScriptRoot"

docker-compose -f docker-compose.cam.yml down

Set-Location "$PSScriptRoot\backend"
docker-compose down

Set-Location "$PSScriptRoot\ai"
docker-compose -f docker-compose.ai.yml down

Get-Process npm -ErrorAction SilentlyContinue | Stop-Process -Force

Write-Host "`nDone!" -ForegroundColor Green