param()

Write-Host "=====================================" -ForegroundColor Cyan
Write-Host "Starting All Services (PROD Mode)" -ForegroundColor Cyan
Write-Host "All Services: Docker" -ForegroundColor Yellow
Write-Host "=====================================" -ForegroundColor Cyan

docker network create traffic-net 2>$null

Write-Host "`nStarting Camera Services..." -ForegroundColor Green
Set-Location "$PSScriptRoot"
docker-compose -f docker-compose.cam.yml up -d

Write-Host "`nStarting Backend Services..." -ForegroundColor Green
Set-Location "$PSScriptRoot\backend"
docker-compose -f docker-compose.yml up -d

Write-Host "`nStarting AI Service..." -ForegroundColor Green
Set-Location "$PSScriptRoot\ai"
docker-compose -f docker-compose.ai.yml up -d

Write-Host "`nStarting React Frontend..." -ForegroundColor Green
Set-Location "$PSScriptRoot\my-react-app"

if (-not (Test-Path "node_modules")) {
    npm install
}

Start-Process npm -ArgumentList "run dev" -WindowStyle Normal

Write-Host @"

===== PROD MODE STARTED (All Docker) =====

Services:
  Backend API: http://localhost:3000
  React: http://localhost:5173
  Camera RTSP: rtsp://localhost:8554/[north|east|south]
  HLS: http://localhost:8888
  PostgreSQL: localhost:5433
  Redis: localhost:6379

View logs:
  docker logs -f nest-backend
  docker logs -f ai-service
  docker logs -f mediamtx

To stop: .\stop-all-prod.ps1
"@ -ForegroundColor Cyan

Read-Host "Press Enter..."