import cv2
import onnxruntime as ort
from yolo_onnx import YOLOv8ONNX
import threading, time
import socketio
import copy 
import os, yaml
import numpy as np

DEBUG_VIEW = False
SHOW_DEBUG = False 

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

def process_camera_shared(source_config, target_road_ids, detector):
    video_path = source_config["path"]
    cap = cv2.VideoCapture(video_path)
    cap.set(cv2.CAP_PROP_BUFFERSIZE, 1)

    last_sent = 0.0
    send_interval = 1.0
    frame_skip = 1
    frame_count = 0

    minute_start_ts = int(time.time() // 60 * 60)
    minute_counts = []
    minute_max = 0
    minute_flow = 0

    roi_pts = source_config.get("roi")
    line = source_config.get("count_line")
    line_dir = source_config.get("line_dir", None)

    if line and "p1" in line and "p2" in line:
        a = (int(line["p1"][0]), int(line["p1"][1]))
        b = (int(line["p2"][0]), int(line["p2"][1]))
    else:
        a = b = None
    
    tracked_objects = {}
    next_id = 0

    MAX_DISAPPEARED = 10  
    MAX_DISTANCE = 80     

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
        
        frame = cv2.resize(frame, (512, 288))
        dets = detector.infer(frame)
        now = time.time()

        if SHOW_DEBUG:
            vis = frame.copy()
            if roi_pts:
                cv2.polylines(vis, [np.array(roi_pts, dtype=np.int32)], True, (0, 255, 0), 2)
            if line:
                cv2.line(vis, a, b, (0, 0, 255), 2)

        input_centroids = []
        for det in dets:
            x1, y1, x2, y2 = map(int, det["box"])
            cx = int((x1 + x2) / 2)
            cy = int((y1 + y2) / 2)
            
            if roi_pts is None or point_in_poly(cx, cy, roi_pts):
                input_centroids.append((cx, cy))
                
            if SHOW_DEBUG:
                cv2.rectangle(vis, (x1, y1), (x2, y2), (100, 100, 100), 1)

        vehicle_count = len(input_centroids)
        emergency_count = 0

        if len(input_centroids) == 0:
            for obj_id in list(tracked_objects.keys()):
                tracked_objects[obj_id]["disappeared"] += 1
                if tracked_objects[obj_id]["disappeared"] > MAX_DISAPPEARED:
                    del tracked_objects[obj_id]
        else:
            if len(tracked_objects) == 0:
                for inp_c in input_centroids:
                    tracked_objects[next_id] = {
                        "centroid": inp_c,
                        "disappeared": 0,
                        "counted": False
                    }
                    next_id += 1
            else:
                object_ids = list(tracked_objects.keys())
                object_centroids = [tracked_objects[oid]["centroid"] for oid in object_ids]
                used_rows = set() 
                used_cols = set()

                distances = []
                for t_idx, t_c in enumerate(object_centroids):
                    for i_idx, i_c in enumerate(input_centroids):
                        dist = get_distance(t_c, i_c)
                        if dist < MAX_DISTANCE:
                            distances.append((dist, t_idx, i_idx))

                distances.sort(key=lambda x: x[0])

                for d, t_idx, i_idx in distances:
                    if t_idx in used_cols or i_idx in used_rows:
                        continue

                    obj_id = object_ids[t_idx]
                    prev_c = tracked_objects[obj_id]["centroid"]
                    curr_c = input_centroids[i_idx]

                    if not tracked_objects[obj_id]["counted"] and a is not None:
                        if crossed(prev_c, curr_c, a, b):
                            valid_dir = True
                            if line_dir:
                                ddir = movement_in_dir(prev_c, curr_c, a, b)
                                if ddir != line_dir:
                                    valid_dir = False
                            
                            if valid_dir:
                                minute_flow += 1
                                tracked_objects[obj_id]["counted"] = True 
                                if SHOW_DEBUG:
                                    cv2.circle(vis, curr_c, 10, (0, 255, 255), -1)

                    tracked_objects[obj_id]["centroid"] = curr_c
                    tracked_objects[obj_id]["disappeared"] = 0
                    
                    used_rows.add(i_idx)
                    used_cols.add(t_idx)

                for t_idx in range(len(object_ids)):
                    if t_idx not in used_cols:
                        obj_id = object_ids[t_idx]
                        tracked_objects[obj_id]["disappeared"] += 1
                        if tracked_objects[obj_id]["disappeared"] > MAX_DISAPPEARED:
                            del tracked_objects[obj_id]

                for i_idx in range(len(input_centroids)):
                    if i_idx not in used_rows:
                        tracked_objects[next_id] = {
                            "centroid": input_centroids[i_idx],
                            "disappeared": 0,
                            "counted": False
                        }
                        next_id += 1

        if SHOW_DEBUG:
            for oid, info in tracked_objects.items():
                if info["disappeared"] == 0:
                    c = info["centroid"]
                    cv2.putText(vis, f"ID:{oid}", (c[0]-10, c[1]-10), 
                                cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 255, 0), 1)
                    color = (0, 255, 255) if info["counted"] else (0, 0, 255) 
                    cv2.circle(vis, c, 4, color, -1)
            
            cv2.putText(vis, f"Live: {vehicle_count} | Flow: {minute_flow}", (10, 20), 
                        cv2.FONT_HERSHEY_SIMPLEX, 0.7, (255, 255, 255), 2)
            cv2.imshow("Tracking Debug V2", vis)
            if cv2.waitKey(1) & 0xFF == ord('q'):
                break
        
        if now - last_sent >= send_interval:
            for tid in target_road_ids:
                send_traffic(tid, vehicle_count, emergency_count)
            last_sent = now

            with state_lock:
                for tid in target_road_ids:
                    traffic_state[tid]["vehicles"] = vehicle_count
                    traffic_state[tid]["emergency"] = emergency_count

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
                for tid in target_road_ids:
                    send_minute_summary(tid, summary)

            minute_start_ts = current_minute_start
            minute_counts = []
            minute_max = 0
            minute_flow = 0
            
        minute_counts.append(vehicle_count)
        minute_max = max(minute_max, vehicle_count)

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

def process_camera(source_config, target_road_ids, detector):
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
    roi_pts = source_config.get("roi")
    line = source_config.get("count_line")
    line_dir = source_config.get("line_dir", None)

    if line and "p1" in line and "p2" in line:
        a = (int(line["p1"][0]), int(line["p1"][1]))
        b = (int(line["p2"][0]), int(line["p2"][1]))
    else:
        a = b = None

    tracked_objects = {}
    next_id = 0
    MAX_DISAPPEARED = 10
    MAX_DISTANCE = 80

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
        now = time.time()

        if SHOW_DEBUG:
            vis = frame.copy()
            if roi_pts:
                cv2.polylines(vis, [np.array(roi_pts, dtype=np.int32)], True, (0, 255, 0), 2)
            if line:
                cv2.line(vis, a, b, (0, 0, 255), 2)

            input_centroids = []
            for det in dets:
                x1, y1, x2, y2 = map(int, det["box"])
                cx = int((x1 + x2) / 2)
                cy = int((y1 + y2) / 2)

                if roi_pts is None or point_in_poly(cx, cy, roi_pts):
                    input_centroids.append((cx, cy))
                if SHOW_DEBUG:
                    cv2.rectangle(vis, (x1, y1), (x2, y2), (100, 100, 100), 1)
            vehicle_count = len(input_centroids)
            emergency_count = 0

            if len(input_centroids) == 0:
                for obj_id in list(tracked_objects.keys()):
                    tracked_objects[obj_id]["disappeared"] += 1
                    if tracked_objects[obj_id]["disappeared"] > MAX_DISAPPEARED:
                        del tracked_objects[obj_id]
            else:
                if len(tracked_objects) == 0:
                    for inp_c in input_centroids:
                        tracked_objects[next_id] = {
                            "centroid": inp_c,
                            "disappeared": 0,
                            "counted": False
                        }
                        next_id += 1
                else:
                    object_ids = list(tracked_objects.keys())
                    object_centroids = [tracked_objects[oid]["centroid"] for oid in object_ids]
                    used_rows = set() 
                    used_cols = set()

                    distances = []
                    for t_idx, t_c in enumerate(object_centroids):
                        for i_idx, i_c in enumerate(input_centroids):
                            dist = get_distance(t_c, i_c)
                            if dist < MAX_DISTANCE:
                                distances.append((dist, t_idx, i_idx))
                    
                    distances.sort(key=lambda x: x[0])

                    for d, t_idx, i_idx in distances:
                        if t_idx in used_cols or i_idx in used_rows:
                            continue
                        obj_id = object_ids[t_idx]
                        prev_c = tracked_objects[obj_id]["centroid"]
                        curr_c = input_centroids[i_idx]

                        if not tracked_objects[obj_id]["counted"] and a is not None:
                            if crossed(prev_c, curr_c, a, b):
                                valid_dir = True
                                if line_dir:
                                    ddir = movement_in_dir(prev_c, curr_c, a, b)
                                    if ddir != line_dir:
                                        valid_dir = False
                                
                                if valid_dir:
                                    minute_flow += 1
                                    tracked_objects[obj_id]["counted"] = True 
                                    if SHOW_DEBUG:
                                        cv2.circle(vis, curr_c, 10, (0, 255, 255), -1)
                        tracked_objects[obj_id]["centroid"] = curr_c
                        tracked_objects[obj_id]["disappeared"] = 0
                        
                        used_rows.add(i_idx)
                        used_cols.add(t_idx)    
                    for t_idx in range(len(object_ids)):
                        if t_idx not in used_cols:
                            obj_id = object_ids[t_idx]
                            tracked_objects[obj_id]["disappeared"] += 1
                            if tracked_objects[obj_id]["disappeared"] > MAX_DISAPPEARED:
                                del tracked_objects[obj_id]
                    for i_idx in range(len(input_centroids)):
                        if i_idx not in used_rows:
                            tracked_objects[next_id] = {
                                "centroid": input_centroids[i_idx],
                                "disappeared": 0,
                                "counted": False
                            }
                            next_id += 1

            if SHOW_DEBUG:
                for oid, info in tracked_objects.items():
                    if info["disappeared"] == 0:
                        c = info["centroid"]
                        cv2.putText(vis, f"ID:{oid}", (c[0]-10, c[1]-10), 
                                    cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 255, 0), 1)
                        color = (0, 255, 255) if info["counted"] else (0, 0, 255) 
                        cv2.circle(vis, c, 4, color, -1)
                
                cv2.putText(vis, f"Live: {vehicle_count} | Flow: {minute_flow}", (10, 20), 
                            cv2.FONT_HERSHEY_SIMPLEX, 0.7, (255, 255, 255), 2)
                cv2.imshow("Tracking Debug V2", vis)
                if cv2.waitKey(1) & 0xFF == ord('q'):
                    break
            
            if now - last_sent >= send_interval:
                for tid in target_road_ids:
                    send_traffic(tid, vehicle_count, emergency_count)
                last_sent = now

                with state_lock:
                    for tid in target_road_ids:
                        traffic_state[tid]["vehicles"] = vehicle_count
                        traffic_state[tid]["emergency"] = emergency_count
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
                    for tid in target_road_ids:
                        send_minute_summary(tid, summary)

                minute_start_ts = current_minute_start
                minute_counts = []
                minute_max = 0
                minute_flow = 0
                
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
    detector = YOLOv8ONNX(sess, input_name, img_size=640, conf_thres=0.5, iou_thres=0.45)
    
    # Kết nối backend trước khi start các thread
    connect_backend()

    DEMO_OPTIMIZED = True
    
    if DEMO_OPTIMIZED:
        print(">>> STARTING DEMO MODE: 1 VIDEO SOURCE FOR 4 ROADS <<<")
        source_id = 1
        source_config = cam_config.get(source_id)
        all_road_ids = list(cam_config.keys()) 
        
        if source_config:
            t = threading.Thread(
                target=process_camera_shared, 
                args=(source_config, all_road_ids, detector)
            )
            t.daemon = True
            t.start()
        else:
            print("Error: Config for camera not found!")
    else:
        print("Run with full 4 camera (High CPU usage)....")
        for r_id, config in cam_config.items():
            t = threading.Thread(target=process_camera, args=(r_id, config, detector))
            t.daemon = True
            t.start()

    # Thread thuật toán điều khiển đèn
    threading.Thread(target=traffic_control_loop, daemon=True).start()
    print("AI traffic service is running...")
    while True:
        time.sleep(10)
