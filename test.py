import cv2
import numpy as np
from ultralytics import YOLO

VIDEO_PATH = "videos/north.mp4"

ROI_CONFIG = {
    "region-left": [(465, 350), (609, 350), (510, 630), (2, 630)],
    "region-right": [(678, 350), (815, 350), (1203, 630), (743, 630)],
}

HEAVY_TRAFFIC_THRESHOLD = 10

def main():
    print("Đang tải model YOLO...")
    model = YOLO("models/best.onnx") 
    print("Tải model thành công.")

    cap = cv2.VideoCapture(VIDEO_PATH)
    if not cap.isOpened():
        print(f"Lỗi: Không thể mở video tại {VIDEO_PATH}")
        return

    region_polygons = {
        name: np.array(pts, dtype=np.int32) 
        for name, pts in ROI_CONFIG.items()
    }

    print("Đang xử lý video... Nhấn 'q' trên cửa sổ video để thoát.")

    while True:
        ret, frame = cap.read()
        if not ret:
            print("Hết video. Lặp lại...")
            cap.set(cv2.CAP_PROP_POS_FRAMES, 0) 
            continue

        results = model(frame, verbose=False)
        annotated_frame = frame.copy() # Tạo bản sao để vẽ

        # 2. Logic đếm xe (Sử dụng cv2.pointPolygonTest)
        region_counts = {name: 0 for name in region_polygons}
        
        for box in results[0].boxes:
            conf = float(box.conf[0])
            if conf < 0.7:
                continue
            x1, y1, x2, y2 = map(int, box.xyxy[0])
            
            # Vẽ Bounding Box của xe
            cv2.rectangle(annotated_frame, (x1, y1), (x2, y2), (255, 0, 0), 2)
            
            # Lấy điểm tâm đáy
            bottom_center_point = ((x1 + x2) // 2, y2)
            
            # Đánh dấu điểm tâm đáy để test
            cv2.circle(annotated_frame, bottom_center_point, 5, (0, 0, 255), -1)

            # Kiểm tra xem điểm này có nằm trong ROI nào không
            for region_name, polygon in region_polygons.items():
                if cv2.pointPolygonTest(polygon, bottom_center_point, False) > 0:
                    region_counts[region_name] += 1
                    break 

        # 3. Vẽ ROI và Hiển thị kết quả
        y_text_pos = 50 # Vị trí Y ban đầu để vẽ chữ
        
        for region_name, polygon in region_polygons.items():
            count = region_counts[region_name]

            # Xác định trạng thái
            status = "Smooth"
            if count > HEAVY_TRAFFIC_THRESHOLD: 
                status = "Heavy"
            
            # Vẽ đa giác ROI
            cv2.polylines(annotated_frame, [polygon], isClosed=True, color=(0, 255, 0), thickness=2)

            # Chuẩn bị text
            text_count = f"{region_name}: {count} xe"
            text_status = f"Status: {status}"

            # Vẽ text lên màn hình
            cv2.putText(annotated_frame, text_count, (50, y_text_pos), 
                        cv2.FONT_HERSHEY_SIMPLEX, 1, (0, 255, 255), 2)
            y_text_pos += 40 # Dịch xuống cho dòng tiếp theo
            cv2.putText(annotated_frame, text_status, (50, y_text_pos), 
                        cv2.FONT_HERSHEY_SIMPLEX, 1, (0, 255, 255), 2)
            y_text_pos += 60 # Dịch xuống cho vùng tiếp theo

        # 4. Hiển thị
        cv2.imshow("Test Visual (Nhan 'q' de thoat)", annotated_frame)

        if cv2.waitKey(1) & 0xFF == ord('q'):
            break

    # Dọn dẹp
    cap.release()
    cv2.destroyAllWindows()

if __name__ == "__main__":
    main()