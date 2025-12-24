# AI Service (Python) — Nhận diện & tính toán thời gian đèn

Module AI có nhiệm vụ:

- Đọc luồng camera (RTSP) / video demo
- Chạy YOLOv8 (ONNX) để phát hiện phương tiện
- Đếm xe trong vùng ROI, (tuỳ chọn) đếm lưu lượng qua vạch (count line)
- Tính toán **đề xuất pha/thời lượng đèn** cho từng ngã tư
- Gửi dữ liệu realtime lên Backend qua Socket.IO (`/ingest`)

## 1) Luồng hoạt động

1. Kết nối WebSocket tới Backend (Socket.IO) ở namespace `/ingest`
2. Mỗi camera:
   - Đọc frame, resize (512x288) để giảm tải
   - Detect phương tiện → đếm số xe
   - Gửi `traffic_data` theo chu kỳ ~1s
   - Gom dữ liệu theo phút → gửi `traffic_minute_summary`
3. Vòng điều khiển đèn (mỗi ngã tư):
   - Ưu tiên road có **emergency**
   - Nếu không có emergency: chọn theo số xe (và đảm bảo công bằng bằng vòng `roads_cycle`)
   - Tính thời gian xanh theo mật độ

## 2) Thuật toán tính thời gian đèn

- Nếu có xe ưu tiên (emergency): dùng `emergency_green` (mặc định 80s)
- Nếu bình thường:

$$\text{green\_time} = \text{clamp}(10, 80, \text{round}(default\_green \cdot \frac{vehicles}{max\_vehicles}))$$

Trong đó:
- `vehicles`: số xe đếm được
- `max_vehicles`: ngưỡng tối đa để scale thời gian
- `default_green`: thời lượng xanh “chuẩn”

## 3) Cấu hình

### 3.1. File cấu hình

- File local: `ai/config.yaml` (đã gitignore)
- File mẫu: `ai/config_example.yaml`

Cách tạo:
- Copy `ai/config_example.yaml` → `ai/config.yaml`

Các trường quan trọng:
- `backend_url`: ví dụ `http://backend:3000` (khi chạy Docker) hoặc `http://localhost:3000` (khi chạy AI trên host)
- `namespace`: thường là `/ingest`
- `model_path`: ví dụ `/models/best.onnx`
- `cameras[]`:
  - `id`: cameraId (1..8)
  - `rtsp`: URL RTSP nguồn
  - `roi`: polygon ROI để đếm xe
  - `count_line`: (tuỳ chọn) vạch đếm lưu lượng
  - `max_vehicles`, `default_green`, `emergency_green`

### 3.2. Lưu ý về RTSP khi chạy Docker

Trong `config_example.yaml` đang dùng `rtsp://localhost:8554/...` phù hợp khi:
- `mediamtx` expose port ra host, và AI chạy trực tiếp trên máy

Nếu AI chạy trong Docker cùng network với `mediamtx` (khuyến nghị), hãy đổi RTSP sang:
- `rtsp://mediamtx:8554/north` (tương tự `east/south/west`)

## 4) Biến môi trường (override)

Có thể override cấu hình bằng env:

- `AI_CONFIG`: đường dẫn file config (mặc định `config.yaml`)
- `BACKEND_URL`: URL backend (đè `backend_url`)
- `NAMESPACE`: namespace Socket.IO (mặc định `/ingest`)
- `MODEL_PATH`: đường dẫn model ONNX

## 5) Chạy bằng Docker

Yêu cầu: đã có Docker network dùng chung:

```powershell
docker network create traffic-net
```

Chạy AI:

```powershell
cd ai
# cần có ai/config.yaml ở local (mount vào container)
docker compose -f docker-compose.ai.yml up -d --build
```

## 6) Chạy local (không Docker)

```powershell
cd ai
pip install -r requirements.txt

# nếu cần override config
# $env:AI_CONFIG = "config.yaml"
# $env:BACKEND_URL = "http://localhost:3000"

python ai_service.py
```

## 7) WebSocket events (AI → Backend)

Namespace: `/ingest`

### 7.1. `traffic_data`

Gửi mỗi ~1s cho từng `cameraId`:

```json
{
  "cameraId": 1,
  "vehicles": 5,
  "isEmergency": false,
  "timestamp": 1763108805
}
```

### 7.2. `signal_decision`

Gửi khi AI chọn road được xanh:

```json
{
  "intersectionId": 1,
  "timestamp": 1763108805.123,
  "readableTime": "2025-12-24 20:10:05",
  "decision": {
    "greenRoadId": 2,
    "duration": 30,
    "reason": "NORMAL_ADAPTIVE"
  },
  "trafficStatus": {
    "1": { "vehicles": 2, "isEmergency": false, "light": "RED", "time_left": 0 },
    "2": { "vehicles": 6, "isEmergency": false, "light": "GREEN", "time_left": 30 },
    "3": { "vehicles": 1, "isEmergency": false, "light": "RED", "time_left": 0 },
    "4": { "vehicles": 3, "isEmergency": false, "light": "RED", "time_left": 0 }
  }
}
```

### 7.3. `traffic_minute_summary`

Gửi mỗi phút để tổng hợp thống kê:

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
