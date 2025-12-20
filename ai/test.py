import cv2
import onnxruntime as ort
from yolo_onnx import YOLOv8ONNX
import threading, time
import socketio
import copy 
import os, yaml

def draw_dets(frame, dets, road_id, conf_show=True):
    for d in dets:
        x1, y1, x2, y2 = map(int, d["box"])
        cv2.rectangle(frame, (x1, y1), (x2, y2), (0, 255, 0), 2)
        if conf_show:
            cv2.putText(frame, f'{d["score"]:.2f}', (x1, max(0, y1-5)),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0,255,0), 1, cv2.LINE_AA)

    max_conf = max((d["score"] for d in dets), default=0.0)
    cv2.putText(frame, f"Cam {road_id} | dets={len(dets)} | max={max_conf:.2f}",
                (8, 22), cv2.FONT_HERSHEY_SIMPLEX, 0.65, (255,255,255), 2, cv2.LINE_AA)
    return frame

PREVIEW = os.getenv("PREVIEW", "1") == "1"   # bật/tắt preview: $env:PREVIEW="1"   
preview_frames = {}                          # road_id -> frame annotated
preview_lock = threading.Lock()

def preview_loop():
    win = "AI Preview (4 cams) - press Q to quit"
    cv2.namedWindow(win, cv2.WINDOW_NORMAL)

    while True:
        with preview_lock:
            frames = [preview_frames.get(i) for i in [1,2,3,4]]

        if any(f is None for f in frames):
            time.sleep(0.05)
            continue
        H, W = 360, 640
        frames = [cv2.resize(f, (W, H)) for f in frames]

        top = cv2.hconcat([frames[0], frames[1]])
        bot = cv2.hconcat([frames[2], frames[3]])
        grid = cv2.vconcat([top, bot])

        cv2.imshow(win, grid)
        key = cv2.waitKey(1) & 0xFF
        if key in (ord('q'), ord('Q')):
            cv2.destroyAllWindows()
            os._exit(0)   

def load_config():
    path = os.getenv("AI_CONFIG", "config.yaml")
    with open(path, "r", encoding="utf-8") as f:
        return yaml.safe_load(f)

CFG = load_config()
BACKEND_URL = os.getenv("BACKEND_URL", CFG["backend_url"])
NAMESPACE = os.getenv("NAMESPACE", CFG.get("namespace", "/ingest"))
MODEL_PATH = os.getenv("MODEL_PATH", CFG["model_path"])

sio = socketio.Client()

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
            BACKEND_URL,
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
        # print(f"[WS] Sent traffic_data: {payload}")
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
    cam["id"]: {
        "name": cam["name"],
        "path": cam["rtsp"],
        "max_vehicles": cam["max_vehicles"],
        "default_green": cam["default_green"],
        "emergency_green": cam["emergency_green"],
    }
    for cam in CFG["cameras"]
}

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

def process_camera(road_id, config, detector):
    video_path = config["path"]
    cap = cv2.VideoCapture(video_path)
    cap.set(cv2.CAP_PROP_BUFFERSIZE, 1)
    # throttle realtime emit
    last_sent = 0.0
    send_interval = 1.0

    frame_skip = 2
    frame_count = 0
    # per-minute aggregation state
    minute_start_ts = int(time.time() // 60 * 60)
    minute_counts = []
    minute_max = 0

    while True:
        ret, frame = cap.read()
        if not ret:
            cap.release()
            time.sleep(1)
            cap = cv2.VideoCapture(video_path)
            continue

        frame_count += 1
        if frame_count % (frame_skip + 1) != 0:
            continue

        # giảm tải CPU: infer trên frame nhỏ hơn
        frame = cv2.resize(frame, (640, 360))
        dets = detector.infer(frame)
        vehicle_count = len(dets)
        if PREVIEW:
            annotated = frame.copy()
            annotated = draw_dets(annotated, dets, road_id)
            with preview_lock:
                preview_frames[road_id] = annotated
        emergency_count = 0

        now = time.time()
        if now - last_sent >= send_interval:
            send_traffic(road_id, vehicle_count, emergency_count)
            last_sent = now

            # cập nhật trạng thái ở tốc độ 1Hz (ổn định và ít jitter hơn)
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
    print("Loading ONNX model...")
    sess = ort.InferenceSession(MODEL_PATH, providers=["CPUExecutionProvider"])
    print("INPUTS:", [(i.name, i.shape, i.type) for i in sess.get_inputs()])
    print("OUTPUTS:", [(o.name, o.shape, o.type) for o in sess.get_outputs()])
    input_name = sess.get_inputs()[0].name  
    detector = YOLOv8ONNX(sess, input_name, img_size=640, conf_thres=0.7, iou_thres=0.45)
    # kết nối backend trước khi start các thread
    connect_backend()
    # if PREVIEW:
    #     threading.Thread(target=preview_loop, daemon=True).start()
    # Thread xử lý từng camera
    for r_id, config in cam_config.items():
        t = threading.Thread(target=process_camera, args=(r_id, config, detector))
        t.daemon = True
        t.start()
    # Thread thuật toán điều khiển đèn
    threading.Thread(target=traffic_control_loop, daemon=True).start()
    print("AI traffic service is running...")
    while True:
        time.sleep(10)

