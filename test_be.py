import cv2
import numpy as np
from ultralytics import YOLO
import threading, time, json
import socketio
import copy 

sio = socketio.Client()
NAMESPACE = "/ingest"

@sio.event
def connect():
    print("[WS] Connected to backend")

@sio.event
def disconnect():
    print("[WS] Disconnected from backend")

# @sio.event(namespace=NAMESPACE)
# def connect_ingest():
#     print("[WS] Connected to namespace /ingest")

def connect_backend():
    try:
        sio.connect(
            "http://localhost:3000",
            transports=["websocket"],
            namespaces=[NAMESPACE],
        )
        print("[WS] sio.connected =", sio.connected)
    except Exception as e:
        print(f"[WS] Cannot connect to backend: {e}")

def send_traffic(road_id, vehicles, emergency_count):
    payload = {
        "cameraId": int(road_id),
        "vehicles": int(vehicles),
        "isEmergency": bool(emergency_count > 0),
        "timestamp": int(time.time()),
    }
    try:
        sio.emit("traffic_data", payload, namespace=NAMESPACE)
        print(f"[WS] Sent traffic_data: {payload}")
    except Exception as e:
        print(f"[WS] Error sending traffic_data: {e}")

def send_minute_summary(road_id, summary):
    payload = {"cameraId": int(road_id), **summary}
    try: 
        sio.emit("traffic_minute_summary", payload, namespace=NAMESPACE)
        print(f"[WS] Sent traffic_minute_summary: cam {road_id} {summary}")
    except Exception as e:
        print(f"[WS] Error sending traffic_minute_summary: {e}")

cam_config = {
    1: {"name": "Road 1 (Bac)",  "path": "rtsp://localhost:8554/north", "max_vehicles": 5, "default_green": 42, "emergency_green": 80},
    2: {"name": "Road 2 (Dong)", "path": "rtsp://localhost:8554/east",  "max_vehicles": 5, "default_green": 42, "emergency_green": 80},
    3: {"name": "Road 3 (Nam)",  "path": "rtsp://localhost:8554/south", "max_vehicles": 5, "default_green": 42, "emergency_green": 80},
    4: {"name": "Road 4 (Tay)",  "path": "rtsp://localhost:8554/west",  "max_vehicles": 5, "default_green": 42, "emergency_green": 80},
}

frame_buffer = {1: None, 2: None, 3: None, 4: None}
traffic_state = {
    1: {"vehicles": 0, "emergency": 0, "light": "RED", "time_left": 0},
    2: {"vehicles": 0, "emergency": 0, "light": "RED", "time_left": 0},
    3: {"vehicles": 0, "emergency": 0, "light": "RED", "time_left": 0},
    4: {"vehicles": 0, "emergency": 0, "light": "RED", "time_left": 0}
}
state_lock = threading.Lock()

def calculate_adjusted_time(num_vehicles, max_vehicles=30, default_time=42):
    if num_vehicles >= max_vehicles:
        percentage_diff = ((num_vehicles - max_vehicles) / max_vehicles) * 100
        adjusted_time = default_time * (1 + percentage_diff / 100)
    elif num_vehicles < max_vehicles:
        percentage_diff = ((max_vehicles - num_vehicles) / max_vehicles) * 100
        adjusted_time = default_time * (1 - percentage_diff / 100)
    else:
        adjusted_time = default_time
    return max(10, min(80, round(adjusted_time)))

def process_camera(road_id, config, model):
    video_path = config["path"]
    cap = cv2.VideoCapture(video_path)
    if not cap.isOpened():
        print(f"[{road_id}] Cannot open {video_path}, retrying...")
        time.sleep(1)
        cap = cv2.VideoCapture(video_path)

    frame_skip = 2
    frame_count = 0

    # throttle realtime emit
    last_sent = 0.0 
    send_interval = 1.0  
    # per-minute aggregation state
    minute_start_ts = int(time.time() // 60 * 60)
    minute_counts = []
    minute_max = 0

    blank_image = np.zeros((360, 640, 3), np.uint8)
    cv2.putText(blank_image, "Loading...", (50, 180),
                cv2.FONT_HERSHEY_SIMPLEX, 1, (255, 255, 255), 2)
    frame_buffer[road_id] = blank_image

    while True:
        ret, frame = cap.read()
        if not ret:
            print(f"[{road_id}] Lost stream, reconnecting...")
            cap.release()
            time.sleep(1)
            cap = cv2.VideoCapture(video_path)
            continue

        frame_count += 1
        if frame_count % (frame_skip + 1) != 0:
            continue

        frame = cv2.resize(frame, (640, 360))

        results = model(frame, conf=0.7, classes=[0], verbose=False, stream=True)

        vehicle_count = 0
        emergency_count = 0
        annotated_frame = frame.copy()

        for r in results:
            boxes = r.boxes
            for box in boxes:
                vehicle_count += 1
                x1, y1, x2, y2 = map(int, box.xyxy[0])
                cv2.rectangle(annotated_frame, (x1, y1), (x2, y2),
                              (0, 255, 0), 2)
                cv2.putText(annotated_frame, "Car", (x1, y1 - 5),
                            cv2.FONT_HERSHEY_SIMPLEX, 0.5,
                            (0, 255, 0), 1)
                
        now = time.time()
        if now - last_sent >= send_interval:
            send_traffic(road_id, vehicle_count, emergency_count)
            last_sent = now

            # chỉ cập nhật trạng thái chia sẻ ở tốc độ 1Hz (ổn định và ít jitter hơn)
            with state_lock: 
                traffic_state[road_id]["vehicles"] = vehicle_count
                traffic_state[road_id]["emergency"] = emergency_count

            # cập nhật số liệu phút hiện tại
            current_minute_start = int(now // 60 * 60)
            if current_minute_start != minute_start_ts:
                samples = len(minute_counts)
                if samples > 0:
                    avg_vehicles = sum(minute_counts) / samples
                    summary = {
                        "minuteStart": minute_start_ts,
                        "minuteEnd": minute_start_ts + 60,
                        "vehicles_avg": round(avg_vehicles, 3),
                        "vehicles_max": int(minute_max),
                        "samples": int(samples),
                    }
                    send_minute_summary(road_id, summary)

                # reset for new minute
                minute_start_ts = current_minute_start
                minute_counts = []
                minute_max = 0

            minute_counts.append(vehicle_count)
            minute_max = max(minute_max, vehicle_count)

        with state_lock:
            traffic_state[road_id]["vehicles"] = vehicle_count
            traffic_state[road_id]["emergency"] = emergency_count

            current_light = traffic_state[road_id]["light"]
            time_left = traffic_state[road_id]["time_left"]

        cv2.rectangle(annotated_frame, (0, 0), (640, 50), (0, 0, 0), -1)

        info_text = f"Road {road_id}: {vehicle_count} vehicles"
        cv2.putText(annotated_frame, info_text,
                    (10, 30), cv2.FONT_HERSHEY_COMPLEX, 0.8,
                    (255, 255, 255), 2)

        color = (0, 0, 255)
        if current_light == "GREEN":
            color = (0, 255, 0)
        elif current_light == "YELLOW":
            color = (0, 255, 255)

        cv2.circle(annotated_frame, (600, 25), 15, color, -1)

        if current_light == "GREEN":
            cv2.putText(annotated_frame, str(time_left),
                        (585, 32),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.5,
                        (0, 0, 0), 1)

        frame_buffer[road_id] = annotated_frame

def traffic_control_loop():
    time.sleep(2)
    roads_cycle = [1, 2, 3, 4]

    while True:
        with state_lock:
            current_data = copy.deepcopy(traffic_state)

        sorted_roads = sorted(
            current_data.items(),
            key=lambda x: (-x[1]["emergency"], -x[1]["vehicles"])
        )

        selected_road = None

        if selected_road is None:
            if not roads_cycle:
                roads_cycle = [1, 2, 3, 4]
            for r_id, info in sorted_roads:
                if r_id in roads_cycle:
                    selected_road = r_id
                    break
        if selected_road is None and roads_cycle:
            selected_road = roads_cycle[0]

        if selected_road is not None:
            road_info = current_data[selected_road]
            road_cfg = cam_config.get(selected_road, {})

            max_v = road_cfg.get("max_vehicles", 5)
            default_g = road_cfg.get("default_green", 42)
            emergency_g = road_cfg.get("emergency_green", 80)

            if road_info["emergency"] == 0:
                green_time = calculate_adjusted_time(
                    road_info["vehicles"],
                    max_vehicles=max_v,
                    default_time=default_g
                )
                decision_reason = "NORMAL_ADAPTIVE"
            else:
                green_time = emergency_g
                decision_reason = "EMERGENCY"

            status_snapshot = {}
            for rid, rdata in current_data.items():
                light_status = "RED"
                time_status = 0

                if rid == selected_road:
                    light_status = "GREEN"
                    time_status = green_time

                status_snapshot[rid] = {
                    "vehicles": rdata["vehicles"],
                    "isEmergency": bool(rdata["emergency"]),
                    "light": light_status,
                    "time_left": time_status
                }

            payload = {
                "intersectionId": 1,
                "timestamp": time.time(),
                "readableTime": time.strftime(
                    "%Y-%m-%d %H:%M:%S", time.localtime()),
                "decision": {
                    "greenRoadId": selected_road,
                    "duration": green_time,
                    "reason": decision_reason,
                },
                "trafficStatus": status_snapshot,
            }

            try:
                sio.emit("signal_decision", payload, namespace=NAMESPACE)
                print("[WS] Sent signal_decision:", payload["decision"])
            except Exception as e:
                print("[WS] Error sending decision:", e)

            with state_lock:
                traffic_state[selected_road]["light"] = "GREEN"
                traffic_state[selected_road]["time_left"] = green_time

            for t in range(green_time, 0, -1):
                with state_lock:
                    traffic_state[selected_road]["time_left"] = t
                time.sleep(1)

            with state_lock:
                traffic_state[selected_road]["light"] = "YELLOW"
            time.sleep(1)

            with state_lock:
                traffic_state[selected_road]["light"] = "RED"

            if selected_road in roads_cycle:
                roads_cycle.remove(selected_road)
        else:
            time.sleep(0.1)

if __name__ == "__main__":
    print("Loading Model...")
    model = YOLO("models/best.onnx", task='detect')

    # NEW: kết nối backend trước khi start các thread
    connect_backend()

    # Thread xử lý từng camera
    for r_id, config in cam_config.items():
        t = threading.Thread(target=process_camera, args=(r_id, config, model))
        t.daemon = True
        t.start()

    # Thread thuật toán điều khiển đèn
    threading.Thread(target=traffic_control_loop, daemon=True).start()

    print("Hệ thống đang chạy. Nhấn 'q' trên cửa sổ hình ảnh để thoát.")

    while True:
        f1 = frame_buffer[1]
        f2 = frame_buffer[2]
        f3 = frame_buffer[3]
        f4 = frame_buffer[4]

        if f1 is None or f2 is None or f3 is None or f4 is None:
            time.sleep(0.1)
            continue

        top_row = np.hstack((f1, f2))
        bottom_row = np.hstack((f4, f3))

        dashboard = np.vstack((top_row, bottom_row))
        cv2.imshow("Traffic Control System Monitoring", dashboard)

        if cv2.waitKey(1) & 0xFF == ord('q'):
            break

    cv2.destroyAllWindows()
