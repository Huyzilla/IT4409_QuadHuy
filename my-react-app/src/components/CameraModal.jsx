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
    <div className="enhanced-modal-overlay">
      <div className="enhanced-modal-content">
        {/* Header với icon và gradient */}
        <div className="enhanced-modal-header">
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <div className="modal-icon-wrapper camera-icon">
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                <circle cx="12" cy="13" r="4" />
              </svg>
            </div>
            <h2 className="modal-title">
              {initialData ? "Cập Nhật Camera" : "Thêm Camera Mới"}
            </h2>
          </div>
          <button onClick={onClose} className="btn-close-modal-enhanced">
            ×
          </button>
        </div>

        {/* Form */}
        <form className="enhanced-form" onSubmit={handleSubmit}>
          <div className="form-group-enhanced">
            <label className="form-label-enhanced">
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                <circle cx="12" cy="13" r="4" />
              </svg>
              Tên Camera <span className="required-mark">*</span>
            </label>
            <input
              required
              type="text"
              className="form-input-enhanced"
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
              placeholder="VD: Cam Cổng Chính"
              autoFocus
            />
          </div>

          <div className="form-group-enhanced">
            <label className="form-label-enhanced">
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <rect x="2" y="7" width="20" height="15" rx="2" ry="2" />
                <polyline points="17 2 12 7 7 2" />
              </svg>
              Link RTSP / Video <span className="required-mark">*</span>
            </label>
            <input
              required
              type="text"
              className="form-input-enhanced"
              value={formData.videoSource}
              onChange={(e) =>
                setFormData({ ...formData, videoSource: e.target.value })
              }
              placeholder="rtsp://admin:pass@IP:554/..."
            />
            <small className="form-hint">Hỗ trợ RTSP, HTTP hoặc file video local</small>
          </div>

          <div className="form-row-enhanced">
            <div className="form-group-enhanced">
              <label className="form-label-enhanced">
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="2" x2="12" y2="22" />
                </svg>
                Vĩ độ
              </label>
              <input
                type="number"
                step="any"
                className="form-input-enhanced"
                value={formData.latitude}
                onChange={(e) =>
                  setFormData({ ...formData, latitude: e.target.value })
                }
                placeholder="21.0285"
              />
            </div>
            <div className="form-group-enhanced">
              <label className="form-label-enhanced">
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <circle cx="12" cy="12" r="10" />
                  <line x1="2" y1="12" x2="22" y2="12" />
                </svg>
                Kinh độ
              </label>
              <input
                type="number"
                step="any"
                className="form-input-enhanced"
                value={formData.longitude}
                onChange={(e) =>
                  setFormData({ ...formData, longitude: e.target.value })
                }
                placeholder="105.8542"
              />
            </div>
          </div>

          <div className="form-actions-enhanced">
            <button type="button" className="btn-cancel-enhanced" onClick={onClose}>
              Hủy bỏ
            </button>
            <button type="submit" className="btn-submit-enhanced">
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <polyline points="20 6 9 17 4 12" />
              </svg>
              {initialData ? "Lưu thay đổi" : "Thêm mới"}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}
