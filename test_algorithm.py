import cv2
import numpy as np
from ultralytics import YOLO
import threading, time, queue, copy

cam_config = {
    1: {
        "name": "Road 1 (Bac)",
        "path": "videos/north.mp4",
        "regions": {
            "region-left": [(465, 350), (609, 350), (510, 630), (2, 630)],
            "region-right": [(678, 350), (815, 350), (1203, 630), (743, 630)],
        }
    },
    2: {
        "name": "Road 2 (Dong)",
        "path": "videos/east.mp4",
        "regions": {
            "region-left": [(465, 350), (609, 350), (510, 630), (2, 630)],
            "region-right": [(678, 350), (815, 350), (1203, 630), (743, 630)],
        }
    },
    3: {
        "name": "Road 3 (Nam)",
        "path": "videos/south.mp4",
        "regions": {
            "region-left": [(465, 350), (609, 350), (510, 630), (2, 630)],
            "region-right": [(678, 350), (815, 350), (1203, 630), (743, 630)],
        }
    },
    4: {
        "name": "Road 4 (Tay)",
        "path": "videos/west.mp4",
        "regions": {
            "region-left": [(465, 350), (609, 350), (510, 630), (2, 630)],
            "region-right": [(678, 350), (815, 350), (1203, 630), (743, 630)],
        }
    }
}

traffic_state = {
    1: {"vehicles": 0, "emergency": 0},
    2: {"vehicles": 0, "emergency": 0},
    3: {"vehicles": 0, "emergency": 0},
    4: {"vehicles": 0, "emergency": 0}
}

state_lock = threading.Lock()
backend_queue = queue.Queue(maxsize=100)

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
    print(f"[Cam {road_id}] Đang khởi động...")
    video_path = config["path"]
    cap = cv2.VideoCapture(video_path)

    region_polygons = []
    if "regions" in config:
        for key, pts in config["regions"].items():
             region_polygons.append(np.array(pts, dtype=np.int32))

    frame_skip = 2
    frame_count = 0
    TARGET_CLASSES = [0] 

    while True:
        ret, frame = cap.read()
        if not ret:
            cap.set(cv2.CAP_PROP_POS_FRAMES, 0)
            continue
        
        frame_count += 1
        if frame_count % (frame_skip + 1) != 0:
            continue

        results = model(frame, conf=0.5, classes=TARGET_CLASSES, verbose=False, stream=True)

        current_vehicle_count = 0
        is_emergency_detected = 0

        for r in results:
            boxes = r.boxes
            for box in boxes:
                x1, y1, x2, y2 = map(int, box.xyxy[0])
                center_point = ((x1 + x2) // 2, y2)
                
                in_region = False
                if not region_polygons:
                    in_region = True
                else:
                    for poly in region_polygons:
                        if cv2.pointPolygonTest(poly, center_point, False) >= 0:
                            in_region = True
                            break
                
                if in_region:
                    current_vehicle_count += 1
            
        with state_lock:
            traffic_state[road_id]["vehicles"] = current_vehicle_count
            traffic_state[road_id]["emergency"] = is_emergency_detected
            
        # Cập nhật sau mỗi 30 frames để giảm tải CPU
        if frame_count % 30 == 0: 
            pass

def traffic_control_loop():
    print("Controller đang chạy...")
    time.sleep(2) 
    roads_cycle = [1, 2, 3, 4]

    while True:
        with state_lock:
            current_data = copy.deepcopy(traffic_state)
            
        print(f"\nTrạng thái: {current_data}")

        sorted_roads = sorted(
            current_data.items(), 
            key=lambda x: (-x[1]["emergency"], -x[1]["vehicles"])
        )
        
        selected_road = None
        
        for r_id, info in sorted_roads:
            if info["emergency"] > 0:
                selected_road = r_id
                print(f"!!! PHÁT HIỆN XE ƯU TIÊN TẠI ĐƯỜNG {r_id} !!!")
                break

        if selected_road is None:
            if not roads_cycle:
                print(">>> Đã hết 1 vòng Cycle, Reset lại [1, 2, 3, 4]")
                roads_cycle = [1, 2, 3, 4]
            
            for r_id, info in sorted_roads:
                if r_id in roads_cycle:
                    selected_road = r_id
                    break
        
        if selected_road is None and roads_cycle:
            selected_road = roads_cycle[0]

        if selected_road is not None:
            road_info = current_data[selected_road]
            num_vehicles = road_info["vehicles"]
            has_emergency = road_info["emergency"]

            if has_emergency:
                green_time = 80
            else:
                green_time = calculate_adjusted_time(num_vehicles)

            msg = {
                "event": "signal_change",
                "green_road": selected_road,
                "vehicles": num_vehicles,
                "duration": green_time
            }
            backend_queue.put(msg)

            sleep_time = green_time / 10 
            print(f">>> BẬT ĐÈN XANH ĐƯỜNG {selected_road} (Xe: {num_vehicles}) trong {green_time}s (Demo sleep {sleep_time}s)")
            
            time.sleep(sleep_time)
            
            print(f">>> ĐÈN VÀNG ĐƯỜNG {selected_road}")
            time.sleep(1) 
            
            # Xóa khỏi cycle nếu không phải xe ưu tiên (xe ưu tiên k tính vào lượt)
            if not has_emergency and selected_road in roads_cycle:
                roads_cycle.remove(selected_road)
        else:
            print("Waiting...")
            time.sleep(1)

# --- LUỒNG IN KẾT QUẢ (Thay cho Backend) ---
def console_logger():
    while True:
        try:
            data = backend_queue.get(timeout=1)
            # Đây là nơi bạn thấy kết quả "ra gì"
            print(f"\n[LOG SYSTEM] SIGNAL UPDATE: {data}\n")
            backend_queue.task_done()
        except queue.Empty:
            pass

if __name__ == "__main__":
    print("Loading Model...")
    # Thay bằng model chuẩn nếu chưa có custom model để test
    model = YOLO("models/best.onnx", task='detect') 
    
    # Chạy logger
    threading.Thread(target=console_logger, daemon=True).start()

    threads = []
    for r_id, config in cam_config.items():
        t = threading.Thread(target=process_camera, args=(r_id, config, model))
        t.daemon = True
        t.start()
        threads.append(t)
        print(f"Started camera thread: {config['name']}")

    controller_thread = threading.Thread(target=traffic_control_loop, daemon=True)
    controller_thread.start()
    
    try:
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        print("Stopping...")