# WebSocket Testing Guide

## Test AI Camera → Backend (Ingest)

**Endpoint**: `ws://localhost:3000/ingest`

### Using Socket.IO Client (JavaScript)

```javascript
const io = require('socket.io-client');

const socket = io('ws://localhost:3000/ingest', {
  transports: ['websocket']
});

socket.on('connect', () => {
  console.log('Connected to ingest gateway');
  
  // Send traffic data
  socket.emit('traffic_data', {
    cameraId: 1,
    vehicles: 5,
    isEmergency: false,
    timestamp: Math.floor(Date.now() / 1000)
  }, (response) => {
    console.log('Response:', response);
  });
});
```

### Using Python (socketio client)

```python
import socketio
import time

sio = socketio.Client()

@sio.event
def connect():
    print('Connected to ingest gateway')
    sio.emit('traffic_data', {
        'cameraId': 1,
        'vehicles': 5,
        'isEmergency': False,
        'timestamp': int(time.time())
    })

sio.connect('ws://localhost:3000/ingest')
sio.wait()
```

### Test Scenarios

#### Scenario 1: Normal Traffic
```json
{
  "cameraId": 1,
  "vehicles": 3,
  "isEmergency": false,
  "timestamp": 1763108805
}
```

#### Scenario 2: Heavy Traffic
```json
{
  "cameraId": 2,
  "vehicles": 12,
  "isEmergency": false,
  "timestamp": 1763108805
}
```

#### Scenario 3: Emergency Vehicle
```json
{
  "cameraId": 3,
  "vehicles": 5,
  "isEmergency": true,
  "timestamp": 1763108805
}
```

---

## Test Backend → Dashboard (Traffic Updates)

**Endpoint**: `ws://localhost:3000/traffic`

### Using Socket.IO Client (JavaScript)

```javascript
const io = require('socket.io-client');

const socket = io('ws://localhost:3000/traffic', {
  transports: ['websocket']
});

socket.on('connect', () => {
  console.log('Connected to traffic gateway');
});

// Listen for traffic updates (every 1 second)
socket.on('traffic_update', (data) => {
  console.log('Traffic Update:', JSON.stringify(data, null, 2));
});
```

### Expected Output

```json
{
  "north": {
    "vehicles": 3,
    "light": "RED",
    "remaining": 10
  },
  "east": {
    "vehicles": 7,
    "light": "GREEN",
    "remaining": 10
  },
  "south": {
    "vehicles": 2,
    "light": "RED",
    "remaining": 0
  },
  "west": {
    "vehicles": 6,
    "light": "RED",
    "remaining": 0
  }
}
```

---

## Complete Test Flow

### 1. Start Backend
```powershell
npm run start:dev
```

### 2. Connect Dashboard Client
```javascript
// dashboard.js
const io = require('socket.io-client');
const dashboardSocket = io('ws://localhost:3000/traffic');

dashboardSocket.on('traffic_update', (state) => {
  console.log('=== Traffic State ===');
  console.log(`North: ${state.north.vehicles} vehicles, ${state.north.light}, ${state.north.remaining}s`);
  console.log(`East:  ${state.east.vehicles} vehicles, ${state.east.light}, ${state.east.remaining}s`);
  console.log(`South: ${state.south.vehicles} vehicles, ${state.south.light}, ${state.south.remaining}s`);
  console.log(`West:  ${state.west.vehicles} vehicles, ${state.west.light}, ${state.west.remaining}s`);
  console.log('');
});
```

### 3. Send Traffic Data from AI Camera
```javascript
// camera.js
const io = require('socket.io-client');
const cameraSocket = io('ws://localhost:3000/ingest');

cameraSocket.on('connect', () => {
  // Simulate camera 1 (North) detecting vehicles
  setInterval(() => {
    const vehicles = Math.floor(Math.random() * 10);
    cameraSocket.emit('traffic_data', {
      cameraId: 1,
      vehicles: vehicles,
      isEmergency: Math.random() < 0.1, // 10% chance of emergency
      timestamp: Math.floor(Date.now() / 1000)
    });
  }, 3000); // Every 3 seconds
});
```

### 4. Watch the Algorithm Work

You'll see:
1. Camera sends traffic data
2. Backend logs the decision
3. Dashboard receives updates
4. Lights change based on algorithm

---

## REST API Testing

### Get Current Snapshot
```powershell
curl http://localhost:3000/traffic/snapshot
```

### Get Traffic Logs
```powershell
curl "http://localhost:3000/traffic/logs?limit=10"
```

### Get Statistics
```powershell
curl "http://localhost:3000/traffic/stats?cameraId=1"
```

### Create Camera
```powershell
curl -X POST http://localhost:3000/cameras `
  -H "Content-Type: application/json" `
  -d '{
    "name": "North Camera",
    "videoSource": "rtsp://camera1.example.com",
    "latitude": 21.0285,
    "longitude": 105.8542
  }'
```

### Get All Cameras
```powershell
curl http://localhost:3000/cameras
```

---

## WebSocket Client Installation

### Node.js
```powershell
npm install socket.io-client
```

### Python
```powershell
pip install python-socketio
```

---

## Troubleshooting

### Connection Refused
- Make sure backend is running: `npm run start:dev`
- Check port 3000 is not blocked

### No Updates Received
- Verify WebSocket connection: Check browser console or client logs
- Ensure namespace is correct: `/ingest` or `/traffic`

### Invalid Data Error
- Verify DTO structure matches exactly
- Check data types (number, boolean, string)
