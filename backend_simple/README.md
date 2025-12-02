# Backend Simple -- Real-Time Traffic API (NestJS 11)

Backend tối giản để **thu nhận dữ liệu giao thông từ AI** và **phát
realtime** ra dashboard qua WebSocket.\
Toàn bộ state được lưu **in-memory**, không cần cơ sở dữ liệu.

## 1. Kiến trúc hệ thống

### Thành phần chính

-   **`AiGateway`** -- WebSocket namespace `/ingest`
    -   Nhận dữ liệu từ AI:
        -   `ping` → trả `pong`
        -   `traffic_data` → cập nhật lưu lượng xe & xe ưu tiên
        -   `signal_decision` → cập nhật trạng thái đèn, thời gian đếm
            ngược và log
-   **`TrafficGateway`** -- WebSocket namespace `/traffic`
    -   Phát sự kiện `traffic_update` đến dashboard
-   **`TrafficController`** -- REST API
    -   `GET /traffic/snapshot` → trạng thái 4 hướng
    -   `GET /traffic/decisions` → danh sách quyết định đã lưu
-   **`TrafficStateService`**
    -   State in-memory gồm 4 hướng: `north`, `east`, `south`, `west`
    -   Lưu tối đa **1000 log** quyết định

## 2. Yêu cầu hệ thống

-   Node.js **18+** (khuyến nghị 20)
-   npm

## 3. Cài đặt & chạy

### Cài dependencies:

``` bash
npm install
```

### Chạy backend:

``` bash
npm run start
```

-   Mặc định chạy trên **PORT=3000**
-   Đặt biến môi trường `PORT` để đổi cổng

### Watch mode:

``` bash
npm run start:dev
```

### Production:

``` bash
npm run start:prod
```

## 4. REST API

### `GET /`

Trả `"Hello World!"`

### `GET /traffic/snapshot`

Trả trạng thái mới nhất của 4 hướng:

``` json
{
  "north": { "vehicles": 0, "isEmergency": false, "light": "RED", "timeLeft": 0 },
  "east":  { "vehicles": 0, "isEmergency": false, "light": "RED", "timeLeft": 0 },
  "south": { "vehicles": 0, "isEmergency": false, "light": "RED", "timeLeft": 0 },
  "west":  { "vehicles": 0, "isEmergency": false, "light": "RED", "timeLeft": 0 }
}
```

### `GET /traffic/decisions`

Lịch sử quyết định đèn, tối đa 1000 mục:

``` json
[
  {
    "timestamp": 1733160000000,
    "intersectionId": 1,
    "green": {
      "roadId": 2,
      "direction": "east",
      "vehicles": 5,
      "duration": 12,
      "reason": "density"
    },
    "reds": [
      { "roadId": 1, "direction": "north", "vehicles": 1 },
      { "roadId": 3, "direction": "south", "vehicles": 0 },
      { "roadId": 4, "direction": "west",  "vehicles": 2 }
    ]
  }
]
```

## 5. WebSocket API

# Namespace `/ingest` -- AI gửi dữ liệu vào

### Event: `traffic_data`

Payload:

``` json
{ "cameraId": 1, "vehicles": 7, "isEmergency": false }
```

Mapping: - 1 = north\
- 2 = east\
- 3 = south\
- 4 = west

Server cập nhật: - Số lượng xe (`vehicles`) - Có xe ưu tiên không
(`isEmergency`)

### Event: `signal_decision`

Payload:

``` json
{
  "timestamp": 1733160000000,
  "intersectionId": 1,
  "decision": { "greenRoadId": 2, "duration": 12, "reason": "density" }
}
```

Server xử lý: - Hướng `greenRoadId` → **GREEN** +
`timeLeft = duration` - Các hướng khác → **RED** + `timeLeft = 0` - Lưu
log quyết định - Phát realtime sang dashboard

# Namespace `/traffic` -- Dashboard nhận realtime

Event: **`traffic_update`**

``` json
{
  "north": { "vehicles": 0, "isEmergency": false, "light": "RED",   "timeLeft": 0 },
  "east":  { "vehicles": 7, "isEmergency": false, "light": "GREEN", "timeLeft": 12 },
  "south": { "vehicles": 0, "isEmergency": false, "light": "RED",   "timeLeft": 0 },
  "west":  { "vehicles": 0, "isEmergency": false, "light": "RED",   "timeLeft": 0 }
}
```

## 7. Cấu trúc thư mục chính

    src/
      app.module.ts            # Khai báo module
      app.controller.ts        # Route gốc
      app.service.ts           # Service cơ bản
      ai.gateway.ts            # WS nhận dữ liệu AI (/ingest)
      traffic.gateway.ts       # WS broadcast cho dashboard (/traffic)
      traffic_state.service.ts # Quản lý state + log
      traffic.controller.ts    # REST Snapshot + Logs
