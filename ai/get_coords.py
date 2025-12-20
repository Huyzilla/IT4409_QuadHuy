import cv2
import numpy as np

VIDEO_PATH = "demo_10s_low.mp4" 

# Kích thước chuẩn mà AI đang dùng (quan trọng, không đổi)
TARGET_W, TARGET_H = 512, 288

points = []

def mouse_callback(event, x, y, flags, param):
    if event == cv2.EVENT_LBUTTONDOWN:
        points.append((x, y))
        print(f"Clicked point: [{x}, {y}]")
        # Vẽ điểm vừa click
        cv2.circle(frame_resized, (x, y), 4, (0, 0, 255), -1)
        cv2.imshow("Get Coords", frame_resized)

cap = cv2.VideoCapture(VIDEO_PATH)
ret, frame = cap.read()
cap.release()

if not ret:
    print("Không đọc được video! Kiểm tra lại đường dẫn VIDEO_PATH.")
else:
    # Resize về đúng kích thước mô hình AI đang chạy
    frame_resized = cv2.resize(frame, (TARGET_W, TARGET_H))
    
    print("--- HƯỚNG DẪN ---")
    print("1. Click chuột trái để lấy điểm.")
    print("2. Nhấn phím bất kỳ để thoát và in list tọa độ.")
    print("-----------------")

    cv2.imshow("Get Coords", frame_resized)
    cv2.setMouseCallback("Get Coords", mouse_callback)
    
    cv2.waitKey(0)
    cv2.destroyAllWindows()

    print("\n--- KẾT QUẢ ĐỂ COPY VÀO CONFIG.YAML ---")
    print("ROI (Copy vào phần roi:):")
    for p in points:
        print(f"      - [{p[0]}, {p[1]}]")
    
    if len(points) >= 2:
        print("\nCOUNT LINE (Lấy 2 điểm cuối làm line):")
        print(f"      p1: [{points[-2][0]}, {points[-2][1]}]")
        print(f"      p2: [{points[-1][0]}, {points[-1][1]}]")