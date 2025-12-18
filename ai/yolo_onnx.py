import cv2
import numpy as np

def letterbox(im, new_shape=(640, 640), color=(114, 114, 114)):
    h, w = im.shape[:2]
    if isinstance(new_shape, int):
        new_shape = (new_shape, new_shape)

    r = min(new_shape[0] / h, new_shape[1] / w)
    new_unpad = (int(round(w * r)), int(round(h * r)))
    dw, dh = new_shape[1] - new_unpad[0], new_shape[0] - new_unpad[1]
    dw /= 2
    dh /= 2

    if (w, h) != new_unpad:
        im = cv2.resize(im, new_unpad, interpolation=cv2.INTER_LINEAR)

    top, bottom = int(round(dh - 0.1)), int(round(dh + 0.1))
    left, right = int(round(dw - 0.1)), int(round(dw + 0.1))
    im = cv2.copyMakeBorder(im, top, bottom, left, right, cv2.BORDER_CONSTANT, value=color)
    return im, r, (dw, dh)

def nms_boxes(boxes, scores, iou_thres=0.45):
    # boxes: xyxy
    x1 = boxes[:, 0]
    y1 = boxes[:, 1]
    x2 = boxes[:, 2]
    y2 = boxes[:, 3]
    areas = (x2 - x1 + 1) * (y2 - y1 + 1)
    order = scores.argsort()[::-1]

    keep = []
    while order.size > 0:
        i = order[0]
        keep.append(i)
        if order.size == 1:
            break
        xx1 = np.maximum(x1[i], x1[order[1:]])
        yy1 = np.maximum(y1[i], y1[order[1:]])
        xx2 = np.minimum(x2[i], x2[order[1:]])
        yy2 = np.minimum(y2[i], y2[order[1:]])

        w = np.maximum(0.0, xx2 - xx1 + 1)
        h = np.maximum(0.0, yy2 - yy1 + 1)
        inter = w * h
        ovr = inter / (areas[i] + areas[order[1:]] - inter)
        inds = np.where(ovr <= iou_thres)[0]
        order = order[inds + 1]
    return keep

class YOLOv8ONNX:
    def __init__(self, session, input_name, img_size=640, conf_thres=0.7, iou_thres=0.45):
        self.session = session
        self.input_name = input_name
        self.img_size = img_size
        self.conf_thres = conf_thres
        self.iou_thres = iou_thres

    def infer(self, bgr):
        img, r, (dw, dh) = letterbox(bgr, (self.img_size, self.img_size))
        img = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
        img = img.astype(np.float32) / 255.0
        img = np.transpose(img, (2, 0, 1))[None, ...] 
        out = self.session.run(None, {self.input_name: img})[0]
        out = out[0].T
        xywh = out[:, 0:4]
        score = out[:, 4]   
        keep = score > self.conf_thres
        xywh = xywh[keep]
        score = score[keep]

        if xywh.shape[0] == 0:
            return []

        # xywh -> xyxy (trên ảnh 640x640)
        xyxy = np.zeros_like(xywh)
        xyxy[:, 0] = xywh[:, 0] - xywh[:, 2] / 2
        xyxy[:, 1] = xywh[:, 1] - xywh[:, 3] / 2
        xyxy[:, 2] = xywh[:, 0] + xywh[:, 2] / 2
        xyxy[:, 3] = xywh[:, 1] + xywh[:, 3] / 2

        # NMS
        keep_idx = nms_boxes(xyxy, score, self.iou_thres)
        xyxy = xyxy[keep_idx]
        score = score[keep_idx]

        # scale back về ảnh gốc
        # bỏ padding
        xyxy[:, [0, 2]] -= dw
        xyxy[:, [1, 3]] -= dh
        xyxy /= r

        # clamp
        h0, w0 = bgr.shape[:2]
        xyxy[:, [0, 2]] = np.clip(xyxy[:, [0, 2]], 0, w0 - 1)
        xyxy[:, [1, 3]] = np.clip(xyxy[:, [1, 3]], 0, h0 - 1)

        dets = []
        for box, sc in zip(xyxy, score):
            dets.append({
                "box": box.tolist(),
                "score": float(sc),
                "cls": 0
            })
        return dets
