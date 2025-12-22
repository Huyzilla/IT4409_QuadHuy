# Hướng dẫn chạy tất cả services

Có **2 chế độ chạy**:
- **DEV Mode**: Backend chạy trực tiếp (không Docker) - tối ưu cho development
- **PROD Mode**: Tất cả services chạy trên Docker - tối ưu cho production

## Yêu cầu
- Docker & Docker Compose
- Node.js & npm
- Python (cho AI service)

## Cách chạy - DEV Mode (Khuyên dùng cho phát triển)

Backend chạy cục bộ, Database/Camera/AI chạy trên Docker

### Windows (Batch File)
```bash
run-all-dev.bat
```

### Windows (PowerShell)
```powershell
powershell -ExecutionPolicy Bypass -File run-all-dev.ps1
```

### Dừng services
```bash
stop-all-dev.bat
```

---

## Cách chạy - PROD Mode (Tất cả trên Docker)

### Windows (Batch File)
```bash
run-all-prod.bat
```

### Windows (PowerShell)
```powershell
powershell -ExecutionPolicy Bypass -File run-all-prod.ps1
```

### Dừng services
```bash
stop-all-prod.bat
```

---

## Chạy riêng Backend Docker (khôi phục `nest-backend`)

Lưu ý: `nest-backend` dùng port **3000**, nên không thể chạy song song với DEV backend local.

### Start (Docker)
```powershell
powershell -ExecutionPolicy Bypass -File run-backend-docker.ps1
```

### Stop (Docker)
```powershell
powershell -ExecutionPolicy Bypass -File stop-backend-docker.ps1
```

---

## Bảng So Sánh

| Service | DEV Mode | PROD Mode |
|---------|----------|-----------|
| **Backend** | ✓ Local (npm run start:dev) | ✓ Docker |
| **Frontend** | ✓ Local (npm run dev) | ✓ Docker |
| **Database** | ✓ Docker (PostgreSQL + Redis) | ✓ Docker (PostgreSQL + Redis) |
| **Camera** | ✓ Docker (Mediamtx + FFmpeg) | ✓ Docker (Mediamtx + FFmpeg) |
| **AI Service** | ✓ Docker | ✓ Docker |

---

## Services Ports

| Service | Cổng | Url |
|---------|------|-----|
| **Mediamtx (RTSP)** | 8554 | rtsp://localhost:8554/[north\|east\|south] |
| **HLS Streams** | 8888 | http://localhost:8888/[north\|east\|south] |
| **Backend API** | 3000 | http://localhost:3000 |
| **PostgreSQL** | 5433 | localhost:5433 |
| **Redis** | 6379 | localhost:6379 |
| **AI Service** | N/A | Container: ai-service |
| **React Frontend** | 5173 | http://localhost:5173 |

## Xem logs

### DEV Mode
```bash
# Docker services
docker logs -f mediamtx
docker logs -f ai-service
docker logs -f postgres
docker logs -f redis

# Local services (trong terminal riêng)
# Backend
cd backend && npm run start:dev

# Frontend
cd my-react-app && npm run dev
```

### PROD Mode
```bash
# All Docker services
docker logs -f mediamtx
docker logs -f nest-backend
docker logs -f ai-service
docker logs -f postgres
docker logs -f redis
```

## Dừng services

### DEV Mode - Windows
```bash
stop-all-dev.bat
```

hoặc Ctrl+C trong các terminal chạy Backend/React

### PROD Mode - Windows
```bash
stop-all-prod.bat
```

### Hoặc dừng từng service riêng
```bash
docker-compose -f docker-compose.cam.yml down
docker-compose -f backend/docker-compose.yml down
docker-compose -f ai/docker-compose.ai.yml down
```

## Troubleshooting

### Port đã được sử dụng
```bash
# Tìm process dùng port 3000
netstat -ano | findstr :3000

# Tìm process npm
tasklist | findstr npm

# Kill process
taskkill /PID <PID> /F
```

### Docker không khởi động
- Mở **Docker Desktop**
- Chờ nó khởi động hoàn toàn (~30-60 giây)
- Chạy lại script

### Database connection error (DEV Mode)
```bash
cd backend

# Kiểm tra database chạy
docker ps | grep postgres

# Reset database
docker-compose down -v
docker-compose up -d postgres redis

# Chạy migrations
npx prisma db push
```

### Node modules error
```bash
# Frontend
cd my-react-app
rm -r node_modules package-lock.json
npm install

# Backend
cd backend
rm -r node_modules package-lock.json
npm install
npx prisma generate
```

### AI service không kết nối
```bash
# Kiểm tra network
docker network ls

# Tạo network nếu chưa có
docker network create traffic-net

# Restart AI service
cd ai
docker-compose down
docker-compose up -d
```

## Cấu trúc Architecture

```
┌──────────────────────────────────────────────────┐
│                  React Frontend                  │
│                   (localhost:5173)               │
└──────────────────┬───────────────────────────────┘
                   │
        ┌──────────▼──────────┐
        │   NestJS Backend    │
        │ (localhost:3000)    │
        │                     │
        │ ├─ PostgreSQL       │
        │ │  (localhost:5433) │
        │ └─ Redis            │
        │    (localhost:6379) │
        └──────────┬──────────┘
                   │
     ┌─────────────┼─────────────┐
     │             │             │
┌────▼────┐   ┌───▼────┐   ┌───▼────┐
│   AI    │   │ RTSP   │   │  HLS   │
│ Service │   │Streams │   │ Server │
│(Docker) │   │(8554)  │   │(8888)  │
└─────────┘   └───┬────┘   └────────┘
                  │
          ┌───────▼────────┐
          │    Mediamtx    │
          │   (rtsp/hls)   │
          │  (ffmpeg cams) │
          └────────────────┘
```
