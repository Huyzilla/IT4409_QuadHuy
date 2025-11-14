import cv2
import numpy as np
from ultralytics import YOLO
import threading, time, queue, copy, requests,json

BACKEND_API_URL = "http://localhost:8000/api/traffic-control" 
backend_queue = queue.Queue(maxsize=100) 
log_file = "log.json"

def save_log(payload):
    try:
        with open(log_file, "a", encoding="utf-8") as f:
            json_string = json.dumps(payload, ensure_ascii=False)
            f.write(json_string + "\n")
    except Exception as e:
        print(f"Lỗi ghi log: {e}")

cam_config = {
    1: {
        "name": "Road 1 (Bac)",
        "path": "videos/north.mp4",
        # "regions": {
        #     "region-left": [(465, 350), (609, 350), (510, 630), (2, 630)],
        #     "region-right": [(678, 350), (815, 350), (1203, 630), (743, 630)],
        # }
    },
    2: {
        "name": "Road 2 (Dong)",
        "path": "videos/east.mp4",
        # "regions": {
        #     "region-left": [(465, 350), (609, 350), (510, 630), (2, 630)],
        #     "region-right": [(678, 350), (815, 350), (1203, 630), (743, 630)],
        # }
    },
    3: {
        "name": "Road 3 (Nam)",
        "path": "videos/south.mp4",
        # "regions": {
        #     "region-left": [(465, 350), (609, 350), (510, 630), (2, 630)],
        #     "region-right": [(678, 350), (815, 350), (1203, 630), (743, 630)],
        # }
    },
    4: {
        "name": "Road 4 (Tay)",
        "path": "videos/west.mp4",
        # "regions": {
        #     "region-left": [(465, 350), (609, 350), (510, 630), (2, 630)],
        #     "region-right": [(678, 350), (815, 350), (1203, 630), (743, 630)],
        # }
    }
}

frame_buffer = { 1: None, 2: None, 3: None, 4: None }
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
    
    frame_skip = 2
    frame_count = 0
    
    blank_image = np.zeros((360, 640, 3), np.uint8)
    cv2.putText(blank_image, "Loading...", (50, 180), cv2.FONT_HERSHEY_SIMPLEX, 1, (255, 255, 255), 2)
    frame_buffer[road_id] = blank_image

    while True:
        ret, frame = cap.read()
        if not ret:
            cap.set(cv2.CAP_PROP_POS_FRAMES, 0) 
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
                cv2.rectangle(annotated_frame, (x1, y1), (x2, y2), (0, 255, 0), 2)
                cv2.putText(annotated_frame, "Car", (x1, y1 - 5), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 255, 0), 1)

        with state_lock:
            traffic_state[road_id]["vehicles"] = vehicle_count
            traffic_state[road_id]["emergency"] = emergency_count

            current_light = traffic_state[road_id]["light"]
            time_left = traffic_state[road_id]["time_left"]

        cv2.rectangle(annotated_frame, (0, 0), (640, 50), (0, 0, 0), -1)
        
        info_text = f"Road {road_id}: {vehicle_count} vehicles"
        cv2.putText(annotated_frame, info_text, (10, 30), cv2.FONT_HERSHEY_COMPLEX, 0.8, (255, 255, 255), 2)
        
        color = (0, 0, 255) 
        if current_light == "GREEN": color = (0, 255, 0)
        elif current_light == "YELLOW": color = (0, 255, 255)
        
        cv2.circle(annotated_frame, (600, 25), 15, color, -1)
        
        if current_light == "GREEN":
            cv2.putText(annotated_frame, str(time_left), (585, 32), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0,0,0), 1)

        frame_buffer[road_id] = annotated_frame

def backend_sender_worker():
    while True:
        try:
            payload = backend_queue.get()
            print(f"\nGửi dữ liệu đến Backend: {payload}")
            
            backend_queue.task_done()
        except Exception as e:
            print(f"Lỗi gửi Backend: {e}")

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

        # Logic chọn đường 
        if selected_road is None:
            if not roads_cycle: roads_cycle = [1, 2, 3, 4]
            for r_id, info in sorted_roads:
                if r_id in roads_cycle:
                    selected_road = r_id
                    break
        if selected_road is None and roads_cycle: selected_road = roads_cycle[0]
        
        if selected_road is not None:
            road_info = current_data[selected_road]
            # Tính toán thời gian
            green_time = calculate_adjusted_time(road_info["vehicles"]) if road_info["emergency"] == 0 else 80

            status_snapshot = {}
            for rid, rdata in current_data.items():
                light_status = "RED"
                time_status = 0

                if rid == selected_road:
                    light_status = "GREEN"
                    time_status = green_time

                status_snapshot[rid] = {
                    "vehicles": rdata["vehicles"],
                    "is_emergency": bool(rdata["emergency"]),
                    "light": light_status,
                    "time_left": time_status
                }

            payload = {
                "timestamp": time.time(),
                "readable_time": time.strftime("%Y-%m-%d %H:%M:%S", time.localtime()),
                "event": "signal_change",
                "decision": {
                    "green_road_id": selected_road,
                    "duration": green_time,
                    "reason": "EMERGENCY" if road_info["emergency"] > 0 else "NORMAL_ADAPTIVE"
                },
                "traffic_status": status_snapshot,
                "cycle_queue": roads_cycle
            }

            save_log(payload)

            try:
                backend_queue.put_nowait(payload)
            except queue.Full:
                pass 

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
    
    for r_id, config in cam_config.items():
        t = threading.Thread(target=process_camera, args=(r_id, config, model))
        t.daemon = True
        t.start()

    sender_t = threading.Thread(target=backend_sender_worker, daemon=True)
    sender_t.start()
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