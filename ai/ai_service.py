import cv2
import onnxruntime as ort
from yolo_onnx import YOLOv8ONNX
import threading, time
import socketio
import copy 
import os, yaml
import numpy as np

DEBUG_VIEW = True

def get_distance(p1, p2):
    return np.sqrt((p1[0] - p2[0])**2 + (p1[1] - p2[1])**2)

def _as_int_poly(poly):
    if not poly:
        return None
    return [(int(x), int(y)) for x, y in poly]

def point_in_poly(cx, cy, poly_pts):
    if not poly_pts:
        return False
    poly = np.array(poly_pts, dtype=np.int32)
    return cv2.pointPolygonTest(poly, (float(cx), float(cy)), False) >= 0

def side_of_line(p, a, b):
    return (b[0] - a[0]) * (p[1] - a[1]) - (b[1] - a[1]) * (p[0] - a[0])

# kiểm tra xem điểm prev_p -> cur_p có cắt qua đoạn thẳng ab không
def crossed(prev_p, cur_p, a, b):
    s1 = side_of_line(prev_p, a, b)
    s2 = side_of_line(cur_p, a, b)
    return (s1 == 0) or (s2 == 0) or ((s1 > 0) != (s2 > 0))

# xác định hướng di chuyển qua đoạn thẳng ab
def movement_in_dir(prev_p, cur_p, a, b):
    s1 = side_of_line(prev_p, a, b)
    s2 = side_of_line(cur_p, a, b)
    if s1 > 0 and s2 < 0:
        return "down"
    if s1 < 0 and s2 > 0:
        return "up"
    return "unknown"

def count_in_roi(dets, roi_pts):
    count = 0
    for det in dets:
        box = det["box"]
        x1, y1, x2, y2 = box
        cx = (x1 + x2) / 2
        cy = (y1 + y2) / 2
        if point_in_poly(cx, cy, roi_pts):
            count += 1
    return count

def load_config():
    path = os.getenv("AI_CONFIG", "config_example.yaml")
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
        "roi": _as_int_poly(cam.get("roi")),
        "count_line": cam.get("count_line"),
        "line_dir": cam.get("line_dir", None),
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

    frame_skip = 1
    frame_count = 0
    # per-minute aggregation state
    minute_start_ts = int(time.time() // 60 * 60)
    minute_counts = []
    minute_max = 0
    minute_flow = 0

    # ROI + line
    roi_pts = config.get("roi")
    line = config.get("count_line")
    line_dir = config.get("line_dir", None)

    if line and "p1" in line and "p2" in line:
        a = (int(line["p1"][0]), int(line["p1"][1]))
        b = (int(line["p2"][0]), int(line["p2"][1]))
    else:
        a = b = None

    # ===== SIMPLE EUCLIDEAN TRACKING (as you proposed) =====
    prev_centroids = {}   # {id: (cx, cy)}
    next_id = 0
    max_distance = 100     # px

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

        # giảm tải CPU
        frame = cv2.resize(frame, (512, 288))
        dets = detector.infer(frame)

        # ===== DEBUG overlay =====
        if DEBUG_VIEW:
            vis = frame.copy()

            if roi_pts:
                cv2.polylines(vis, [np.array(roi_pts, dtype=np.int32)], True, (0, 255, 0), 2)

            if line:
                cv2.line(vis, a, b, (0, 0, 255), 2)

            in_roi = 0
            for det in dets:
                x1, y1, x2, y2 = map(int, det["box"])
                cx = int((x1 + x2) / 2)
                cy = int((y1 + y2) / 2)

                inside = (roi_pts is not None) and point_in_poly(cx, cy, roi_pts)
                if inside:
                    in_roi += 1
                    cv2.rectangle(vis, (x1, y1), (x2, y2), (255, 0, 0), 2)
                    cv2.circle(vis, (cx, cy), 3, (255, 0, 0), -1)
                else:
                    cv2.rectangle(vis, (x1, y1), (x2, y2), (80, 80, 80), 1)
                    cv2.circle(vis, (cx, cy), 2, (80, 80, 80), -1)

            cv2.putText(
                vis,
                f"cam={road_id} dets={len(dets)} flow={minute_flow}",
                (10, 25),
                cv2.FONT_HERSHEY_SIMPLEX,
                0.7,
                (255, 255, 255),
                2
            )

            cv2.imshow(f"cam_{road_id}", vis)
            cv2.waitKey(1)

        now = time.time()

        # ===== build centers in ROI =====
        centers = []
        for det in dets:
            x1, y1, x2, y2 = det["box"]
            cx = (x1 + x2) / 2
            cy = (y1 + y2) / 2
            if roi_pts is None or point_in_poly(cx, cy, roi_pts):
                centers.append((cx, cy))

        vehicle_count = len(centers)
        emergency_count = 0

        # ===== TRACKING + LINE COUNTING (simple version) =====
        curr_centroids = {}

        for curr_p in centers:
            matched_id = None
            min_dist = max_distance

            for obj_id, prev_p in prev_centroids.items():
                d = get_distance(curr_p, prev_p)
                if d < min_dist:
                    min_dist = d
                    matched_id = obj_id

            if matched_id is not None:
                # kiểm tra cắt vạch
                if a is not None and crossed(prev_centroids[matched_id], curr_p, a, b):
                    if line_dir:
                        ddir = movement_in_dir(prev_centroids[matched_id], curr_p, a, b)
                        if ddir == line_dir:
                            minute_flow += 1
                    else:
                        minute_flow += 1

                curr_centroids[matched_id] = curr_p
                del prev_centroids[matched_id]
            else:
                curr_centroids[next_id] = curr_p
                next_id += 1

        prev_centroids = curr_centroids

        # ===== SEND DATA =====
        if now - last_sent >= send_interval:
            send_traffic(road_id, vehicle_count, emergency_count)
            last_sent = now

            with state_lock:
                traffic_state[road_id]["vehicles"] = vehicle_count
                traffic_state[road_id]["emergency"] = emergency_count

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
                        "flow_count": int(minute_flow),
                    }
                    send_minute_summary(road_id, summary)

                # reset per minute
                minute_start_ts = current_minute_start
                minute_counts = []
                minute_max = 0
                minute_flow = 0
                prev_centroids = {}
                next_id = 0

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

