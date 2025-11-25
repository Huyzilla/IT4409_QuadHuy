# AI-Based Adaptive Traffic Control System - Backend

## 📋 Overview

Backend system for an AI-based adaptive traffic control system. Receives real-time traffic data from AI cameras via WebSocket, processes it using an intelligent traffic control algorithm, stores logs in PostgreSQL, caches state in Redis, and broadcasts updates to a dashboard.

## 🏗️ Architecture

- **Framework**: NestJS (TypeScript)
- **Database**: PostgreSQL 16 (Prisma ORM)
- **Cache/PubSub**: Redis 7
- **Communication**: 
  - WebSocket (Socket.IO) for AI cameras → Backend
  - WebSocket (Socket.IO) for Backend → Frontend Dashboard
  - REST API for historical data queries
- **Infrastructure**: Docker & Docker Compose

## 📁 Project Structure

```
backend/
├── src/
│   ├── main.ts                      # Application entry point
│   ├── app.module.ts                # Root module
│   │
│   └── modules/
│       ├── camera/                  # Camera management
│       ├── traffic/                 # Traffic control & monitoring
│       │   ├── ingest.gateway.ts    # WebSocket: AI → Backend
│       │   ├── traffic.gateway.ts   # WebSocket: Backend → Frontend
│       │   ├── traffic.control.service.ts  # Traffic light algorithm
│       ├── intersection/            # Intersection management
│       ├── database/                # Prisma integration
│       └── redis/                   # Redis integration
│
├── prisma/
│   ├── schema.prisma               # Database schema
│   └── migrations/                 # Database migrations
│
├── Dockerfile                      # Production Docker image
└── docker-compose.yml              # Multi-service orchestration
```

## 🚀 Getting Started

### Option 1: Run with Docker (Recommended for Production)

```powershell
# Start all services
docker-compose up -d --build

# Run database migrations
docker exec -it nest-backend npx prisma migrate deploy
```

Services will be available at:
- REST API: `http://localhost:3000`
- WebSocket (AI Cameras): `ws://localhost:3000/ingest`
- WebSocket (Dashboard): `ws://localhost:3000/traffic`
- PostgreSQL: `localhost:5433`
- Redis: `localhost:6379`

### Option 2: Run Locally (Development with Hot Reload)

1. **Start infrastructure only**:
```powershell
docker-compose up -d postgres redis
```

2. **Install dependencies**:
```powershell
npm install
```

3. **Set up environment** (create `.env`):
```env
DATABASE_URL="postgresql://admin:admin123@localhost:5433/traffic_ai?schema=public"
REDIS_HOST=localhost
REDIS_PORT=6379
NODE_ENV=development
```

4. **Run migrations**:
```powershell
npx prisma migrate dev --name init
npx prisma generate
```

5. **Start dev server** (with hot reload):
```powershell
npm run start:dev
```

## 📡 API Endpoints

### REST API

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/cameras` | Get all cameras |
| POST | `/cameras` | Create a new camera |
| GET | `/traffic/logs?limit=20` | Get traffic signal logs |
| GET | `/traffic/snapshot` | Get current traffic state |
| GET | `/traffic/stats?cameraId=1&from=...&to=...` | Get statistics |

### WebSocket Events

#### AI Camera → Backend (`ws://localhost:3000/ingest`)

**Event**: `traffic_data`

```json
{
  "cameraId": 1,
  "vehicles": 5,
  "isEmergency": false,
  "timestamp": 1763108805
}
```

#### Backend → Dashboard (`ws://localhost:3000/traffic`)

**Event**: `traffic_update` (auto-broadcast every 1 second)

```json
{
  "north": { "vehicles": 3, "light": "RED", "remaining": 10 },
  "east":  { "vehicles": 7, "light": "GREEN", "remaining": 10 },
  "south": { "vehicles": 2, "light": "RED", "remaining": 10 },
  "west":  { "vehicles": 6, "light": "RED", "remaining": 10 }
}
```

## 🧠 Traffic Control Algorithm

### Rules

1. **Emergency Priority**: Immediate green light for emergency vehicles
2. **Adaptive Selection**: Choose road with highest vehicle count
3. **Fair Cycling**: Maintain cycle queue to ensure all roads get green
4. **Adaptive Duration**: 8-15 seconds based on vehicle density
5. **Full Logging**: All decisions logged with state and reasoning

### Flow

```
1. Receive traffic data from camera
2. Update current state (vehicles, emergency)
3. Run control algorithm
4. If light change needed:
   - Update road states
   - Save to database
   - Publish to Redis
   - Broadcast to dashboard
```

## 🔧 Development

### Scripts

```powershell
npm run start:dev      # Development with hot reload
npm run build          # Production build
npm run start:prod     # Start production build
npm run lint           # Lint code
npm test               # Run tests
```

### Database

```powershell
npx prisma migrate dev --name <name>  # Create migration
npx prisma migrate deploy              # Apply migrations
npx prisma studio                      # Open GUI
npx prisma generate                    # Regenerate client
```

### Docker

```powershell
docker-compose up -d --build           # Build and start
docker-compose logs -f backend         # View logs
docker-compose down                    # Stop all
docker exec -it nest-backend sh        # Access shell
```

## 🗄️ Database Schema

- **cameras** - Camera information
- **traffic_frame_stats** - Raw traffic data from cameras
- **traffic_signal_logs** - Traffic light change logs
- **intersections** - Intersection metadata

## 📊 Redis Usage

- **Cache**: `traffic:state` (current state, TTL 60s)
- **Pub/Sub**: 
  - `traffic:update` - General updates
  - `traffic:light-change` - Light changes

## 🐛 Troubleshooting

### Port Conflict
Change postgres port in `docker-compose.yml` to `5433:5432`

### Prisma Issues
```powershell
npx prisma generate
npx prisma migrate reset  # Development only!
```

## 📝 License

UNLICENSED - Private Project
