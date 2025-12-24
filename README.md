# AI-Based Adaptive Traffic Control System

Hệ thống điều khiển đèn giao thông thích nghi theo thời gian thực.

Web demo (Vercel): https://traffic-monitor-all.vercel.app/

- **Frontend**: Vite + React dashboard ([my-react-app/](my-react-app/))
- **Backend**: NestJS + Prisma + PostgreSQL + Redis ([backend/](backend/))
- **AI service**: Python (YOLO/ONNX) xử lý video/camera ([ai/](ai/))
- **Video mẫu**: [videos/](videos/) (dùng cho chạy local/demo)

## 1) Kiến trúc tổng quan

Luồng dữ liệu (mô tả ngắn):

1. AI đọc RTSP/video → đếm xe/nhận diện tình huống
2. AI gửi dữ liệu lên Backend qua WebSocket
3. **AI tính toán đề xuất thời gian/pha đèn** (chu kỳ, thời lượng xanh/đỏ, v.v.) và gửi kèm dữ liệu lên Backend
4. Backend nhận đề xuất → lưu log DB + cache Redis + broadcast ra dashboard
5. Frontend nhận cập nhật real-time để hiển thị dashboard

Chi tiết Backend xem tại [backend/README.md](backend/README.md).

## 2) Chuẩn bị

### Yêu cầu

- Docker Desktop (khuyến nghị cho chạy nhanh)
- Node.js (nếu chạy backend/frontend không qua Docker)
- Python 3.x (nếu chạy AI không qua Docker)

### Cấu hình local (không commit lên git)

- Frontend: copy file ví dụ → tạo file local
	- `my-react-app/.env.example` → `my-react-app/.env`
- Backend: copy file ví dụ → tạo file local
	- `backend/.env.example` → `backend/.env`
- AI: copy file ví dụ → tạo file local
	- `ai/config_example.yaml` → `ai/config.yaml`

Lưu ý: các file `.env*` và `ai/config.yaml` đã được cấu hình để **gitignore** (chỉ dùng local).

## 3) Chạy nhanh bằng Docker (khuyến nghị)

### 3.1. (Tuỳ chọn) Dựng RTSP camera giả lập

Ở thư mục gốc:

```powershell
# Tạo network dùng chung (chỉ cần chạy 1 lần)
docker network create traffic-net

docker compose -f docker-compose.cam.yml up -d
```

Camera stack gồm `mediamtx` (RTSP/HLS/WebRTC) + các container ffmpeg giả lập camera.

- RTSP local (để AI đọc): `rtsp://localhost:8554/north` (tương tự `east/south/west`)
- HLS local (để frontend đọc): `http://localhost:8888/north/index.m3u8`

### 3.1.1. Public camera (HLS) bằng Cloudflare Tunnel

Mục tiêu: publish **HLS** (HTTP) ra Internet qua Cloudflare Zero Trust để mở được từ Vercel/ngoài LAN.

1) Tạo Cloudflare Tunnel trên Zero Trust Dashboard

- Zero Trust → **Tunnels** → Create tunnel
- Copy **Token** (dùng cho `cloudflared tunnel run --token ...`)

2) Tạo Public Hostname trỏ về HLS service

- Trong cấu hình tunnel, thêm **Public Hostname** (ví dụ: `hls.yourdomain.com`)
- Service/Origin trỏ về HLS của `mediamtx`:
	- Nếu Cloudflare tunnel chạy cùng Docker network với `mediamtx`: trỏ `http://mediamtx:8888`
	- Nếu trỏ về host: `http://host.docker.internal:8888` (tuỳ môi trường)

3) Cấu hình token local

- Copy file: `.env.tunnel.example` → `.env.tunnel`
- Set `CF_TUNNEL_TOKEN=...`

4) Chạy cloudflared

```powershell
docker compose -f docker-compose.tunnel.yml --env-file .env.tunnel up -d
```

5) Trỏ frontend tới HLS public

- Set `VITE_HLS_BASE_URL` (local: trong `my-react-app/.env`, deploy: set Env Var trên Vercel)
- Ví dụ: `VITE_HLS_BASE_URL=https://hls.yourdomain.com`

### 3.2. Chạy Backend

```powershell
cd backend

# khởi động postgres/redis/backend 
docker compose -f docker-compose.backend.yml up -d --build

# tạo/migrate DB 
docker compose -f docker-compose.backend.yml run --rm backend npx prisma migrate dev --name init_db
```

### 3.3. Chạy AI service

```powershell
cd ai
docker compose -f docker-compose.ai.yml up -d --build
```

### 3.4. Chạy Frontend

```powershell
cd my-react-app
npm install
npm run dev
```

## 4) Chạy không dùng Docker (dev)

### Backend

```powershell
cd backend
npm install
npx prisma generate
npm run start:dev
```

### AI

```powershell
cd ai
pip install -r requirements.txt
python ai_service.py
```

### Frontend

```powershell
cd my-react-app
npm install
npm run dev
```

## 5) Deploy (tóm tắt)

- **Vercel**: deploy thư mục frontend (`my-react-app/`).
- **Render**: deploy backend (`backend/`).

## 6) Notes

### Cắt video demo bằng ffmpeg

```bash
ffmpeg -ss 10 -i input.mp4 -t 10 -an -vf "scale=512:288" -c:v libx264 -preset fast -crf 28 -r 25 video_demo.mp4
```
