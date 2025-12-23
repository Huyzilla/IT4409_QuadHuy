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


def _as_int_point(pt):
    if not pt:
        return None
    if isinstance(pt, dict):
        # allow {x:..., y:...}
        x = pt.get("x")
        y = pt.get("y")
        if x is None or y is None:
            return None
        return (int(x), int(y))
    if isinstance(pt, (list, tuple)) and len(pt) >= 2:
        return (int(pt[0]), int(pt[1]))
    return None


def _as_int_line(count_line):
    if not count_line:
        return None
    if isinstance(count_line, dict):
        p1 = _as_int_point(count_line.get("p1"))
        p2 = _as_int_point(count_line.get("p2"))
        if p1 and p2:
            return (p1, p2)
        return None
    if isinstance(count_line, (list, tuple)) and len(count_line) == 2:
        p1 = _as_int_point(count_line[0])
        p2 = _as_int_point(count_line[1])
        if p1 and p2:
            return (p1, p2)
    return None


def point_in_poly(cx, cy, poly_pts):
    if not poly_pts:
        return True
    poly = np.array(poly_pts, dtype=np.int32)
    return cv2.pointPolygonTest(poly, (float(cx), float(cy)), False) >= 0


def _segments_intersect(a, b, c, d):
    # Return True if segment AB intersects segment CD
    def orient(p, q, r):
        return (q[0] - p[0]) * (r[1] - p[1]) - (q[1] - p[1]) * (r[0] - p[0])

    def on_segment(p, q, r):
        return (
            min(p[0], r[0]) <= q[0] <= max(p[0], r[0])
            and min(p[1], r[1]) <= q[1] <= max(p[1], r[1])
        )

    o1 = orient(a, b, c)
    o2 = orient(a, b, d)
    o3 = orient(c, d, a)
    o4 = orient(c, d, b)

    if (o1 > 0 and o2 < 0 or o1 < 0 and o2 > 0) and (o3 > 0 and o4 < 0 or o3 < 0 and o4 > 0):
        return True

    # Colinear cases
    if o1 == 0 and on_segment(a, c, b):
        return True
    if o2 == 0 and on_segment(a, d, b):
        return True
    if o3 == 0 and on_segment(c, a, d):
        return True
    if o4 == 0 and on_segment(c, b, d):
        return True

    return False


class _Track:
    __slots__ = ("id", "pt", "prev_pt", "missed", "counted")

    def __init__(self, track_id: int, pt: tuple[int, int]):
        self.id = track_id
        self.pt = pt
        self.prev_pt = None
        self.missed = 0
        self.counted = False


class SimpleCentroidTracker:
    def __init__(self, max_dist: float = 40.0, max_missed: int = 8):
        self.max_dist = float(max_dist)
        self.max_missed = int(max_missed)
        self._next_id = 1
        self._tracks: dict[int, _Track] = {}

    @staticmethod
    def _dist(a, b):
        dx = a[0] - b[0]
        dy = a[1] - b[1]
        return (dx * dx + dy * dy) ** 0.5

    def update(self, points: list[tuple[int, int]]):
        # Age existing tracks
        for tr in self._tracks.values():
            tr.missed += 1

        used_points = set()

        # Greedy nearest-neighbor assignment
        track_ids = list(self._tracks.keys())
        for tid in track_ids:
            tr = self._tracks.get(tid)
            if tr is None:
                continue

            best_idx = None
            best_dist = None
            for idx, pt in enumerate(points):
                if idx in used_points:
                    continue
                d = self._dist(tr.pt, pt)
                if best_dist is None or d < best_dist:
                    best_dist = d
                    best_idx = idx

            if best_idx is not None and best_dist is not None and best_dist <= self.max_dist:
                pt = points[best_idx]
                used_points.add(best_idx)
                tr.prev_pt = tr.pt
                tr.pt = pt
                tr.missed = 0

        # Add new tracks for unmatched points
        for idx, pt in enumerate(points):
            if idx in used_points:
                continue
            tr = _Track(self._next_id, pt)
            self._tracks[self._next_id] = tr
            self._next_id += 1

        # Remove dead tracks
        dead = [tid for tid, tr in self._tracks.items() if tr.missed > self.max_missed]
        for tid in dead:
            self._tracks.pop(tid, None)

        return list(self._tracks.values())


@dataclass
class CameraTestConfig:
    camera_id: int
    name: str
    source: str
    roi: list | None
    count_line: tuple | None
    line_dir: str | None


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

    count_line = _as_int_line(found.get("count_line") or found.get("line"))
    line_dir = found.get("line_dir")
    if line_dir is not None:
        line_dir = str(line_dir)

    return CameraTestConfig(
        camera_id=int(camera_id),
        name=str(name),
        source=str(source),
        roi=roi,
        count_line=count_line,
        line_dir=line_dir,
    )


def _parse_line_arg(text: str | None):
    if not text:
        return None
    # "x1,y1,x2,y2"
    parts = [p.strip() for p in str(text).split(",") if p.strip()]
    if len(parts) != 4:
        raise SystemExit("--line must be in format x1,y1,x2,y2")
    x1, y1, x2, y2 = map(int, parts)
    return ((x1, y1), (x2, y2))


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
    parser.add_argument(
        "--line",
        default=None,
        help="Override count line as x1,y1,x2,y2 (in resized frame coords 512x288)",
    )
    parser.add_argument("--track-max-dist", type=float, default=40.0, help="Tracker max distance (px)")
    parser.add_argument("--track-max-missed", type=int, default=8, help="Tracker max missed frames")

    # UI behavior: show video by default for more intuitive local testing.
    # Use --no-show for headless runs.
    show_group = parser.add_mutually_exclusive_group()
    show_group.add_argument(
        "--show",
        dest="show",
        action="store_true",
        help="Show a debug window (default)",
    )
    show_group.add_argument(
        "--no-show",
        dest="show",
        action="store_false",
        help="Disable debug window (headless)",
    )
    parser.set_defaults(show=True)
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
    total_flow = 0
    infer_frames = 0
    last_log = time.time()
    last_vis = time.time()
    fps = 0.0

    tracker = SimpleCentroidTracker(max_dist=args.track_max_dist, max_missed=args.track_max_missed)

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

            line = _parse_line_arg(args.line) or cam.count_line
            if not line:
                # Fallback line for visual testing if config has none
                h, w = frame.shape[:2]
                line = ((0, h // 2), (w - 1, h // 2))

            # Count vehicles inside ROI (if ROI is defined)
            vehicle_count = 0
            points_in_roi: list[tuple[int, int]] = []
            for det in dets:
                x1, y1, x2, y2 = map(int, det["box"])
                cx = (x1 + x2) / 2
                cy = (y1 + y2) / 2
                if point_in_poly(cx, cy, cam.roi):
                    vehicle_count += 1
                    points_in_roi.append((int(cx), int(cy)))

            total_detections += vehicle_count
            infer_frames += 1

            # Flow count: count tracks that cross the configured line
            flow_in_frame = 0
            tracks = tracker.update(points_in_roi)
            if line:
                (lx1, ly1), (lx2, ly2) = line
                for tr in tracks:
                    if tr.prev_pt is None:
                        continue
                    if tr.counted:
                        continue
                    if _segments_intersect(tr.prev_pt, tr.pt, (lx1, ly1), (lx2, ly2)):
                        tr.counted = True
                        flow_in_frame += 1
            total_flow += flow_in_frame

            now = time.time()
            if args.show:
                dt = now - last_vis
                if dt > 0:
                    fps = 1.0 / dt
                last_vis = now

            if (not args.show) and (now - last_log >= 1.0):
                avg = total_detections / max(1, infer_frames)
                flow_avg = total_flow / max(1, infer_frames)
                print(
                    f"[TEST] frame={processed:6d} vehicles={vehicle_count:3d} flow={flow_in_frame:2d} "
                    f"totalFlow={total_flow:4d} avgVeh={avg:.2f} avgFlow={flow_avg:.2f}"
                )
                last_log = now

            if args.show:
                vis = frame.copy()
                if cam.roi:
                    cv2.polylines(vis, [np.array(cam.roi, dtype=np.int32)], True, (0, 255, 0), 2)
                if line:
                    cv2.line(vis, line[0], line[1], (0, 200, 255), 2)
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
                    f"cam {cam.camera_id} | vehicles={vehicle_count} | flow={flow_in_frame} | totalFlow={total_flow} | fps={fps:.1f}",
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
