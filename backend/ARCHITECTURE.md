# 🏗️ System Architecture Diagram

## Overall System Flow

```
┌─────────────────┐
│   AI Camera 1   │ ──┐
│    (North)      │   │
└─────────────────┘   │
                      │
┌─────────────────┐   │   WebSocket
│   AI Camera 2   │ ──┼──  traffic_data   ┌──────────────────────┐
│    (East)       │   │  ───────────────→  │  IngestGateway       │
└─────────────────┘   │                    │  (ws://.../ingest)   │
                      │                    └──────────┬───────────┘
┌─────────────────┐   │                               │
│   AI Camera 3   │ ──┤                               ▼
│    (South)      │   │                    ┌──────────────────────┐
└─────────────────┘   │                    │  TrafficService      │
                      │                    │  - Save to DB        │
┌─────────────────┐   │                    │  - Update state      │
│   AI Camera 4   │ ──┘                    │  - Cache in Redis    │
│    (West)       │                        │  - Run algorithm     │
└─────────────────┘                        └──────────┬───────────┘
                                                      │
                                                      ▼
                                          ┌───────────────────────┐
                                          │ TrafficControlService │
                                          │ - Check emergency     │
                                          │ - Calculate optimal   │
                                          │ - Update cycle queue  │
                                          └──────────┬────────────┘
                                                     │
                        ┌────────────────────────────┼─────────────────────┐
                        │                            │                     │
                        ▼                            ▼                     ▼
               ┌────────────────┐         ┌──────────────────┐   ┌────────────────┐
               │  PostgreSQL    │         │  Redis           │   │ TrafficGateway │
               │  - cameras     │         │  - traffic:state │   │ (ws://.../     │
               │  - frame_stats │         │  - pub/sub       │   │  traffic)      │
               │  - signal_logs │         └──────────────────┘   └────────┬───────┘
               │  - intersections│                                         │
               └────────────────┘                                          │
                                                                           ▼
                                                               ┌───────────────────┐
                                                               │  Dashboard Client │
                                                               │  (Frontend)       │
                                                               │  - Real-time view │
                                                               │  - Traffic lights │
                                                               └───────────────────┘
```

---

## Module Structure

```
backend/
│
├── src/
│   ├── main.ts ────────────────────┐ Application Bootstrap
│   ├── app.module.ts ──────────────┤ Root Module
│   │                               │
│   └── modules/                    │
│       │                           │
│       ├── database/ ──────────────┤ Global Infrastructure
│       │   ├── prisma.module.ts   │ (Injected everywhere)
│       │   └── prisma.service.ts  │
│       │                           │
│       ├── redis/ ─────────────────┤
│       │   ├── redis.module.ts    │
│       │   └── redis.service.ts   │
│       │                           │
│       ├── camera/ ────────────────┤ Feature Modules
│       │   ├── camera.module.ts   │ (Business Logic)
│       │   ├── camera.controller.ts
│       │   ├── camera.service.ts
│       │   ├── camera.repository.ts
│       │   ├── dto/
│       │   └── entities/
│       │
│       ├── intersection/
│       │   ├── intersection.module.ts
│       │   ├── intersection.controller.ts
│       │   ├── intersection.service.ts
│       │   └── ...
│       │
│       └── traffic/ ──────────────┐ Core Traffic Module
│           ├── traffic.module.ts  │
│           │                      │
│           ├── GATEWAYS           │
│           │   ├── ingest.gateway.ts     ◄── AI Cameras
│           │   └── traffic.gateway.ts    ──► Dashboard
│           │
│           ├── SERVICES
│           │   ├── traffic.service.ts         (Orchestrator)
│           │   └── traffic.control.service.ts (Algorithm)
│           │
│           ├── DATA ACCESS
│           │   ├── traffic.repository.ts
│           │   └── traffic.controller.ts (REST)
│           │
│           ├── dto/
│           │   ├── ingest-traffic-data.dto.ts
│           │   ├── create-traffic-signal-log.dto.ts
│           │   └── traffic-query.dto.ts
│           │
│           └── entities/
│               └── traffic.entity.ts
│
├── prisma/
│   └── schema.prisma ─────────────┐ Database Schema
│                                  │ (4 tables)
│
├── Dockerfile ────────────────────┐ Container Build
├── docker-compose.yml ────────────┤ (Multi-service)
└── .env ──────────────────────────┘ Configuration
```

---

## Data Flow Diagram

### 1. Incoming Traffic Data (AI → Backend)

```
AI Camera sends JSON
       │
       ▼
┌──────────────────┐
│ IngestGateway    │ ◄── WebSocket: ws://localhost:3000/ingest
│ @SubscribeMessage│     Event: 'traffic_data'
│  ('traffic_data')│
└────────┬─────────┘
         │
         ▼
┌──────────────────────────────────────┐
│ TrafficService.processIncomingData() │
├──────────────────────────────────────┤
│ 1. Save to traffic_frame_stats       │
│ 2. Update current state (N/E/S/W)    │
│ 3. Cache in Redis                    │
│ 4. Run traffic control algorithm     │
│ 5. If light change needed:           │
│    - Update all road states          │
│    - Save to traffic_signal_logs     │
│    - Publish to Redis pub/sub        │
│    - Broadcast to dashboard          │
└──────────────────────────────────────┘
```

### 2. Traffic Control Algorithm

```
┌─────────────────────────────────────────────┐
│ TrafficControlService.calculateOptimal()    │
├─────────────────────────────────────────────┤
│                                             │
│ INPUT: Current state for all 4 roads       │
│                                             │
│ STEP 1: Check for emergency vehicles       │
│         └─► If found → IMMEDIATE GREEN      │
│                                             │
│ STEP 2: Check current green light          │
│         └─► If time left → CONTINUE         │
│                                             │
│ STEP 3: Compare roads                      │
│         ├─► High traffic road (>10 vehicles)│
│         └─► Or next in cycle queue          │
│                                             │
│ STEP 4: Calculate duration                 │
│         └─► 8-15 seconds (adaptive)         │
│                                             │
│ STEP 5: Update cycle queue                 │
│         └─► Move green road to end          │
│                                             │
│ OUTPUT: Decision {greenRoadId, duration,    │
│                   reason, nextQueue}        │
└─────────────────────────────────────────────┘
```

### 3. Dashboard Broadcast (Backend → Frontend)

```
┌──────────────────────┐
│ TrafficGateway       │ ──► WebSocket: ws://localhost:3000/traffic
├──────────────────────┤     Event: 'traffic_update'
│ setInterval(1000ms)  │     
└──────┬───────────────┘
       │
       ▼
┌──────────────────────────────────┐
│ Broadcast every 1 second:        │
│ {                                │
│   north: {vehicles, light, time} │
│   east:  {vehicles, light, time} │
│   south: {vehicles, light, time} │
│   west:  {vehicles, light, time} │
│ }                                │
└──────────────────────────────────┘
       │
       ▼
┌──────────────────────┐
│ All connected        │
│ Dashboard clients    │
└──────────────────────┘
```

---

## Database Schema Relationships

```
┌─────────────────────┐
│ cameras             │
├─────────────────────┤
│ id (PK)             │◄────┐
│ name                │     │
│ video_source        │     │
│ latitude            │     │
│ longitude           │     │
│ created_at          │     │
│ updated_at          │     │
└─────────────────────┘     │
                            │
                            │ 1:N
                            │
┌─────────────────────┐     │
│ traffic_frame_stats │     │
├─────────────────────┤     │
│ id (PK)             │     │
│ camera_id (FK) ─────┼─────┘
│ vehicles            │
│ is_emergency        │
│ captured_at         │
└─────────────────────┘


┌─────────────────────┐
│ traffic_signal_logs │ (Independent - System Events)
├─────────────────────┤
│ id (PK)             │
│ timestamp           │
│ readable_time       │
│ event               │
│ green_road_id       │
│ duration            │
│ reason              │
│ traffic_status (JSON)│
│ cycle_queue (JSON)  │
│ created_at          │
└─────────────────────┘


┌─────────────────────┐
│ intersections       │ (Independent - Metadata)
├─────────────────────┤
│ id (PK)             │
│ name                │
│ latitude            │
│ longitude           │
│ description         │
│ created_at          │
│ updated_at          │
└─────────────────────┘
```

---

## Redis Keys & TTL

```
┌──────────────────────────────────────┐
│ Redis Cache Structure                │
├──────────────────────────────────────┤
│                                      │
│ Key: "traffic:state"                 │
│ Value: {                             │
│   north: {...},                      │
│   east: {...},                       │
│   south: {...},                      │
│   west: {...}                        │
│ }                                    │
│ TTL: 60 seconds                      │
│                                      │
├──────────────────────────────────────┤
│ Pub/Sub Channels                     │
├──────────────────────────────────────┤
│                                      │
│ Channel: "traffic:update"            │
│ Message: General traffic updates     │
│                                      │
│ Channel: "traffic:light-change"      │
│ Message: {                           │
│   greenRoadId: 1,                    │
│   duration: 10,                      │
│   reason: "EMERGENCY_PRIORITY",      │
│   state: {...}                       │
│ }                                    │
└──────────────────────────────────────┘
```

---

## Request/Response Examples

### WebSocket: AI Camera → Backend

**Request** (from AI camera):
```json
{
  "cameraId": 1,
  "vehicles": 7,
  "isEmergency": false,
  "timestamp": 1763108805
}
```

**Response** (from backend):
```json
{
  "status": "success",
  "message": "Traffic data processed",
  "state": {
    "north": {"vehicles": 7, "light": "GREEN", "remaining": 12},
    "east": {"vehicles": 3, "light": "RED", "remaining": 0},
    "south": {"vehicles": 2, "light": "RED", "remaining": 0},
    "west": {"vehicles": 4, "light": "RED", "remaining": 0}
  }
}
```

### WebSocket: Backend → Dashboard

**Auto-broadcast** (every 1 second):
```json
{
  "north": {"vehicles": 7, "light": "GREEN", "remaining": 12},
  "east": {"vehicles": 3, "light": "RED", "remaining": 0},
  "south": {"vehicles": 2, "light": "RED", "remaining": 0},
  "west": {"vehicles": 4, "light": "RED", "remaining": 0}
}
```

### REST: Get Traffic Logs

**Request**:
```
GET /traffic/logs?limit=5
```

**Response**:
```json
[
  {
    "id": 123,
    "timestamp": "1763108805",
    "readableTime": "2025-11-25 10:30:05",
    "event": "signal_change",
    "greenRoadId": 1,
    "duration": 12,
    "reason": "HIGH_TRAFFIC_ADAPTIVE",
    "trafficStatus": {...},
    "cycleQueue": [2, 3, 4, 1],
    "createdAt": "2025-11-25T10:30:05.000Z"
  },
  ...
]
```

---

This architecture ensures:
- ✅ **Separation of Concerns** (Clean Architecture)
- ✅ **Scalability** (Module-based design)
- ✅ **Real-time Performance** (WebSocket + Redis)
- ✅ **Data Integrity** (PostgreSQL with transactions)
- ✅ **Type Safety** (TypeScript + Prisma)
- ✅ **Maintainability** (Clear structure, documented)
