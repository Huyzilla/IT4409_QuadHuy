# Backend (NestJS) — Trung tâm điều phối & Dashboard Realtime

Backend chịu trách nhiệm:

- Nhận dữ liệu realtime từ AI qua Socket.IO (`/ingest`)
- Nhận **đề xuất điều khiển đèn** do AI tính toán (`signal_decision`)
- Lưu log vào PostgreSQL (Prisma)
- Cache/truyền sự kiện qua Redis
- Phát realtime trạng thái giao thông cho Frontend Dashboard qua Socket.IO (`/traffic`)

## 1) Công nghệ

- **Framework**: NestJS (TypeScript)
- **Database**: PostgreSQL 16 (Prisma)
- **Cache/PubSub**: Redis 7
- **Realtime**: Socket.IO
- **Docker**: `docker-compose.backend.yml`

## 2) Cấu trúc thư mục

```
backend/
  src/
    modules/
      traffic/
        ingest.gateway.ts     # WS: AI -> Backend (/ingest)
        traffic.gateway.ts    # WS: Backend -> FE (/traffic)
        traffic.service.ts    # applySignalDecision + cache/log
  prisma/
    schema.prisma
    migrations/
  docker-compose.backend.yml
  Dockerfile
```

## 3) Chạy bằng Docker (khuyến nghị)

### 3.1. Chuẩn bị

Tạo Docker network dùng chung (chỉ cần chạy 1 lần, ở root project):

```powershell
docker network create traffic-net
```

Tạo `.env` từ mẫu:

- `backend/.env.example` → `backend/.env`

### 3.2. Start services

```powershell
cd backend
docker compose -f docker-compose.backend.yml up -d --build
```

Mặc định services:

- REST API: `http://localhost:3000`
- Socket.IO ingest (AI): `http://localhost:3000/ingest`
- Socket.IO traffic (Dashboard): `http://localhost:3000/traffic`
- PostgreSQL: `localhost:5433`
- Redis: `localhost:6379`

Ghi chú: trong `docker-compose.backend.yml` container backend chạy `npx prisma db push` trước khi start.

## 4) Chạy local (dev)

1) Dựng hạ tầng DB/Redis bằng Docker:

```powershell
cd backend
docker compose -f docker-compose.backend.yml up -d postgres redis
```

2) Cài dependencies và migrate:

```powershell
npm install
npx prisma generate
npx prisma migrate dev --name init_db
```

3) Chạy server:

```powershell
npm run start:dev
```

## 5) Mapping cameraId → ngã tư/hướng

Backend map `cameraId` thành:

- `cameraId` 1..4 → **intersection 1** với thứ tự: 1=north, 2=east, 3=south, 4=west
- `cameraId` 5..8 → **intersection 2** với thứ tự: 5=north, 6=east, 7=south, 8=west

## 6) API (REST)

Tuỳ theo module đang bật trong repo, các endpoint thường dùng:

| Method | Endpoint | Mô tả |
|---|---|---|
| GET | `/cameras` | Lấy danh sách camera |
| POST | `/cameras` | Tạo camera |
| GET | `/traffic/logs?limit=20` | Lấy log chuyển pha đèn |
| GET | `/traffic/snapshot` | Lấy trạng thái hiện tại |
| GET | `/traffic/stats?cameraId=1&from=...&to=...` | Thống kê |

## 7) WebSocket events

### 7.1. AI → Backend (`/ingest`)

**Event: `traffic_data`**

```json
{
  "cameraId": 1,
  "vehicles": 5,
  "isEmergency": false,
  "timestamp": 1763108805
}
```

**Event: `signal_decision`** (AI tính thời lượng đèn và gửi sang)

```json
{
  "intersectionId": 1,
  "decision": {
    "greenRoadId": 2,
    "duration": 30,
    "reason": "NORMAL_ADAPTIVE"
  },
  "trafficStatus": {
    "1": { "vehicles": 2, "isEmergency": false, "light": "RED", "time_left": 0 },
    "2": { "vehicles": 6, "isEmergency": false, "light": "GREEN", "time_left": 30 }
  }
}
```

**Event: `traffic_minute_summary`** (tổng hợp theo phút)

```json
{
  "cameraId": 1,
  "minuteStart": 1763108760,
  "minuteEnd": 1763108820,
  "vehicles_avg": 2.33,
  "vehicles_max": 6,
  "samples": 20,
  "flow_count": 12
}
```

### 7.2. Backend → Dashboard (`/traffic`)

**Event: `traffic_update`** (broadcast mỗi 1s)

```json
{
  "intersectionStates": {
    "1": {
      "north": { "vehicles": 3, "light": "GREEN", "remaining": 10, "isEmergency": false },
      "east": { "vehicles": 7, "light": "RED", "remaining": 0, "isEmergency": false },
      "south": { "vehicles": 2, "light": "RED", "remaining": 0, "isEmergency": false },
      "west": { "vehicles": 6, "light": "RED", "remaining": 0, "isEmergency": false }
    }
  }
}
```

**Event: `new_minute_stats`** (khi nhận `traffic_minute_summary` từ AI)

```json
{
  "cameraId": 1,
  "minuteStart": 1763108760,
  "vehicles_avg": 2.33,
  "density": 0.0233
}
```

Ghi chú: kết nối `/traffic` có middleware auth (token Bearer hoặc `handshake.auth.token`).

## 8) Redis

- Channel: `traffic:light-change` (publish khi apply quyết định từ AI)
- Cache: `traffic:state` (state hiện tại)

## 9) Lệnh hữu ích

```powershell
cd backend
npm run start:dev
npm run build
npm run start:prod
npm run lint
```
