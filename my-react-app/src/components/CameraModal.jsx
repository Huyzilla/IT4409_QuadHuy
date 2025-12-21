import React, { useState, useEffect } from "react";
import ReactDOM from "react-dom";

export default function CameraModal({
  isOpen,
  onClose,
  onSubmit,
  initialData,
}) {
  const [formData, setFormData] = useState({
    name: "",
    videoSource: "",
    latitude: "21.0285",
    longitude: "105.8542",
  });

  // Load dữ liệu cũ nếu là chế độ Sửa
  useEffect(() => {
    if (initialData) {
      setFormData({
        name: initialData.name,
        videoSource: initialData.videoSource,
        latitude: initialData.latitude,
        longitude: initialData.longitude,
      });
    } else {
      setFormData({
        name: "",
        videoSource: "",
        latitude: "21.0285",
        longitude: "105.8542",
      });
    }
  }, [initialData, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData);
    onClose();
  };

  return ReactDOM.createPortal(
    <div className="settings-modal-overlay">
      <div className="settings-modal-content" style={{ maxWidth: "500px" }}>
        <div className="settings-modal-header">
          <h2>{initialData ? "Cập Nhật Camera" : "Thêm Camera Mới"}</h2>
          <button className="btn-close-modal-mini" onClick={onClose}>
            ×
          </button>
        </div>

        <form className="settings-form" onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Tên Camera</label>
            <input
              required
              type="text"
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
              placeholder="VD: Cam Cổng Chính"
            />
          </div>

          <div className="form-group">
            <label>Link RTSP / Video</label>
            <input
              required
              type="text"
              value={formData.videoSource}
              onChange={(e) =>
                setFormData({ ...formData, videoSource: e.target.value })
              }
              placeholder="rtsp://admin:pass@IP:554/..."
            />
          </div>

          <div style={{ display: "flex", gap: "10px" }}>
            <div className="form-group" style={{ flex: 1 }}>
              <label>Vĩ độ (Lat)</label>
              <input
                type="number"
                step="any"
                value={formData.latitude}
                onChange={(e) =>
                  setFormData({ ...formData, latitude: e.target.value })
                }
              />
            </div>
            <div className="form-group" style={{ flex: 1 }}>
              <label>Kinh độ (Long)</label>
              <input
                type="number"
                step="any"
                value={formData.longitude}
                onChange={(e) =>
                  setFormData({ ...formData, longitude: e.target.value })
                }
              />
            </div>
          </div>

          <div className="settings-modal-footer">
            <button type="button" className="action-btn" onClick={onClose}>
              Hủy
            </button>
            <button type="submit" className="action-btn primary">
              {initialData ? "Lưu thay đổi" : "Thêm mới"}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}
