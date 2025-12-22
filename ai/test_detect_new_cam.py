import argparse
import os
import sys
import time
from dataclasses import dataclass

import cv2
import numpy as np
import onnxruntime as ort
import yaml

sys.path.insert(0, os.path.dirname(__file__))

from yolo_onnx import YOLOv8ONNX


def _as_int_poly(poly):
    if not poly:
        return None
    return [(int(x), int(y)) for x, y in poly]


def point_in_poly(cx, cy, poly_pts):
    if not poly_pts:
        return True
    poly = np.array(poly_pts, dtype=np.int32)
    return cv2.pointPolygonTest(poly, (float(cx), float(cy)), False) >= 0


@dataclass
class CameraTestConfig:
    camera_id: int
    name: str
    source: str
    roi: list | None


def load_yaml(path: str) -> dict:
    with open(path, "r", encoding="utf-8") as f:
        return yaml.safe_load(f)


def resolve_camera(cfg: dict, camera_id: int, video_override: str | None) -> CameraTestConfig:
    cams = cfg.get("cameras") or []
    found = None
    for cam in cams:
        if int(cam.get("id")) == int(camera_id):
            found = cam
            break

    if not found:
        raise SystemExit(f"Camera id={camera_id} not found in config")

    name = found.get("name") or f"Camera {camera_id}"

    if video_override:
        source = video_override
    else:
        # Allow config to provide either local file path or rtsp.
        source = found.get("path") or found.get("rtsp")

    if not source:
        raise SystemExit(f"Camera id={camera_id} missing 'path' or 'rtsp'")

    roi = _as_int_poly(found.get("roi"))
    return CameraTestConfig(camera_id=int(camera_id), name=str(name), source=str(source), roi=roi)


def main():
    parser = argparse.ArgumentParser(description="Test YOLO detect on a specific camera source (file/rtsp)")
    parser.add_argument("--config", default=os.getenv("AI_CONFIG", "config_example.yaml"), help="Path to YAML config")
    parser.add_argument("--camera-id", type=int, default=5, help="Camera id in config")
    parser.add_argument(
        "--video",
        default=None,
        help="Override source with a local video file. Example: ..\\videos\\new\\new.mp4",
    )
    parser.add_argument("--model", default=os.getenv("MODEL_PATH", "models/best.onnx"), help="Path to ONNX model")
    parser.add_argument("--max-frames", type=int, default=600, help="Stop after N processed frames")
    parser.add_argument("--frame-skip", type=int, default=2, help="Skip N frames between inferences")
    parser.add_argument("--show", action="store_true", help="Show a debug window")
    args = parser.parse_args()

    cfg = load_yaml(args.config)

    # Sensible default for local testing (repo-root/videos/new/new.mp4)
    if args.video is None:
        default_video = os.path.normpath(os.path.join(os.path.dirname(__file__), "..", "videos", "new", "new.mp4"))
        if os.path.exists(default_video):
            args.video = default_video

    cam = resolve_camera(cfg, args.camera_id, args.video)
    print(f"[TEST] cameraId={cam.camera_id} name={cam.name}")
    print(f"[TEST] source={cam.source}")

    if cam.source.lower().startswith("rtsp://"):
        print("[TEST] RTSP source detected. Make sure camera docker stack is running.")

    if not cam.source.lower().startswith("rtsp://") and not os.path.exists(cam.source):
        raise SystemExit(f"Video file not found: {cam.source}")

    print("[TEST] Loading ONNX model...")
    sess = ort.InferenceSession(args.model, providers=["CPUExecutionProvider"])
    input_name = sess.get_inputs()[0].name
    detector = YOLOv8ONNX(sess, input_name, img_size=640, conf_thres=0.5, iou_thres=0.45)

    cap = cv2.VideoCapture(cam.source)
    if not cap.isOpened():
        raise SystemExit(f"Failed to open video source: {cam.source}")

    processed = 0
    total_detections = 0
    last_log = time.time()
    last_vis = time.time()
    fps = 0.0

    if args.show:
        cv2.namedWindow("detect-test", cv2.WINDOW_NORMAL)
        cv2.resizeWindow("detect-test", 1024, 576)

    try:
        while True:
            ret, frame = cap.read()
            if not ret:
                print("[TEST] End of stream. Rewinding...")
                cap.set(cv2.CAP_PROP_POS_FRAMES, 0)
                continue

            if processed % (args.frame_skip + 1) != 0:
                processed += 1
                continue

            frame = cv2.resize(frame, (512, 288))
            dets = detector.infer(frame)

            # Count vehicles inside ROI (if ROI is defined)
            vehicle_count = 0
            for det in dets:
                x1, y1, x2, y2 = map(int, det["box"])
                cx = (x1 + x2) / 2
                cy = (y1 + y2) / 2
                if point_in_poly(cx, cy, cam.roi):
                    vehicle_count += 1

            total_detections += vehicle_count

            now = time.time()
            if args.show:
                dt = now - last_vis
                if dt > 0:
                    fps = 1.0 / dt
                last_vis = now

            if (not args.show) and (now - last_log >= 1.0):
                avg = total_detections / max(1, (processed // (args.frame_skip + 1)))
                print(f"[TEST] frame={processed:6d} vehicles={vehicle_count:3d} avg={avg:.2f}")
                last_log = now

            if args.show:
                vis = frame.copy()
                if cam.roi:
                    cv2.polylines(vis, [np.array(cam.roi, dtype=np.int32)], True, (0, 255, 0), 2)
                for det in dets:
                    x1, y1, x2, y2 = map(int, det["box"])
                    cx = (x1 + x2) / 2
                    cy = (y1 + y2) / 2
                    in_roi = point_in_poly(cx, cy, cam.roi)
                    color = (0, 255, 0) if in_roi else (180, 180, 180)
                    cv2.rectangle(vis, (x1, y1), (x2, y2), color, 2)
                    score = float(det.get("score", 0.0))
                    label = f"{score:.2f}"
                    cv2.putText(
                        vis,
                        label,
                        (x1, max(12, y1 - 6)),
                        cv2.FONT_HERSHEY_SIMPLEX,
                        0.45,
                        color,
                        1,
                        cv2.LINE_AA,
                    )
                cv2.putText(
                    vis,
                    f"cam {cam.camera_id} | vehicles={vehicle_count} | fps={fps:.1f}",
                    (10, 24),
                    cv2.FONT_HERSHEY_SIMPLEX,
                    0.7,
                    (255, 255, 255),
                    2,
                )
                cv2.imshow("detect-test", vis)
                if cv2.waitKey(1) & 0xFF == ord("q"):
                    break

            processed += 1
            if args.max_frames and processed >= args.max_frames:
                break

    finally:
        cap.release()
        if args.show:
            cv2.destroyAllWindows()

    print("[TEST] Done.")


if __name__ == "__main__":
    main()
