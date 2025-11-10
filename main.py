import cv2
import numpy as np
from ultralytics import YOLO
import threading, json, time, requests, queue

cam_config = {
    "cam_bac": {
        "path": "videos/north.mp4",
        "regions": {
            "region-left": [(465, 350), (609, 350), (510, 630), (2, 630)],
            "region-right": [(678, 350), (815, 350), (1203, 630), (743, 630)],
        }
    },
    "cam_dong": {
        "path": "videos/east.mp4",
        "regions": {
            "region-left": [(465, 350), (609, 350), (510, 630), (2, 630)],
            "region-right": [(678, 350), (815, 350), (1203, 630), (743, 630)],
        }
    },
    "cam_nam": {
        "path": "videos/south.mp4",
        "regions": {
            "region-left": [(465, 350), (609, 350), (510, 630), (2, 630)],
            "region-right": [(678, 350), (815, 350), (1203, 630), (743, 630)],
        }
    },
    "cam_tay": {
        "path": "videos/west.mp4",
        "regions": {
            "region-left": [(465, 350), (609, 350), (510, 630), (2, 630)],
            "region-right": [(678, 350), (815, 350), (1203, 630), (743, 630)],
        }
    }
}

HEAVY_TRAFFIC_THRESHOLD = 10

backend_api_url = "http://localhost:8000/api/ingest"
data_queue = queue.Queue()

def process_camera(camera_id, video_path, model, regions_config):
    cap = cv2.VideoCapture(video_path)
    if not cap.isOpened():
        print(f"Lỗi: Không thể mở camera {camera_id} tại {video_path}")
        return
    
    region_polygons = {
        name: np.array(pts, dtype=np.int32) 
        for name, pts in regions_config.items()
    }

    update_interval_seconds = 5.0
    last_update_time = time.time()
    accumulated_counts = {name: [] for name in region_polygons.keys()}

    while True:
        ret, frame = cap.read()
        if not ret:
            cap.set(cv2.CAP_PROP_POS_FRAMES, 0)
            continue

        results = model(frame, verbose=False)
        region_counts = {name: 0 for name in region_polygons}
        detected_boxes = results[0].boxes

        for box in detected_boxes:
            conf = float(box.conf[0])
            if conf < 0.7:
                continue

            x1, y1, x2, y2 = map(int, box.xyxy[0])
            bottom_center_point = ((x1 + x2) // 2, y2)

            for region_name, polygon in region_polygons.items():
                if cv2.pointPolygonTest(polygon, bottom_center_point, False) > 0:
                    region_counts[region_name] += 1
                    break
        
        for region_name, count in region_counts.items():
            if region_name in accumulated_counts:
                accumulated_counts[region_name].append(count)

        current_time = time.time()
        if(current_time - last_update_time) >= update_interval_seconds:
            list_left = accumulated_counts.get("region-left", [])
            avg_count_left = np.mean(list_left) if list_left else 0

            list_right = accumulated_counts.get("region-right", [])
            avg_count_right = np.mean(list_right) if list_right else 0

            status_left = "Heavy" if avg_count_left > HEAVY_TRAFFIC_THRESHOLD else "Smooth"
            status_right = "Heavy" if avg_count_right > HEAVY_TRAFFIC_THRESHOLD else "Smooth"

            output_data = {
                "camera_id": camera_id,
                "timestamp_ms": int(current_time * 1000),
                "vehicles_left": int(round(avg_count_left)),
                "intensity_left": status_left,
                "vehicles_right": int(round(avg_count_right)),
                "intensity_right": status_right
            }
            
            try:
                data_queue.put_nowait(output_data)
            except queue.Full:
                print(f"Queue bị đầy, bỏ qua cập nhật từ {camera_id}")

            # Reset bộ đếm
            last_update_time = current_time
            for name in accumulated_counts:
                accumulated_counts[name].clear()

def send_to_backend():
    while True:
        data = data_queue.get()
        try:
            requests.post(backend_api_url, json=data, timeout=1.0)
        except requests.exceptions.RequestException as e:
            print(f"Error connect to backend: {e}")
        data_queue.task_done()
        # print(f"DỮ LIỆU TỪ AI (Camera: {data['camera_id']})")
        # print(json.dumps(data, indent=2))
        # print("--------------------------------------------------")

if __name__ == "__main__":
    print("Load model ...")
    model = YOLO("models/best.onnx")
    print("Successful download!")
    
    threads = []
    for cam_id, config in cam_config.items():
        thread = threading.Thread(
            target=process_camera,
            args=(cam_id, config["path"], model, config["regions"])
        )
        thread.daemon = True 
        threads.append(thread)
        thread.start()

    print("Khởi chạy luồng gửi dữ liệu (Sender)...")
    sender_thread = threading.Thread(target=send_to_backend, daemon=True)
    sender_thread.start()

    print("Hệ thống đang chạy 5 luồng (4 AI, 1 Sender). Nhấn Ctrl+C để dừng.")
    try:
        while True:
            print(f"Kích thước hàng đợi hiện tại: {data_queue.qsize()}")
            time.sleep(10) 
    except KeyboardInterrupt:
        print("Đã nhận tín hiệu dừng... Đang tắt.")