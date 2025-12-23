// src/components/IntersectionModal.jsx
import React, { useState, useEffect } from "react";
import ReactDOM from "react-dom";
import "./Sidebar.css"; // Đảm bảo CSS đã được load

export default function IntersectionModal({
  isOpen,
  onClose,
  onSubmit,
  initialData,
}) {
  const [formData, setFormData] = useState({
    name: "",
    latitude: "",
    longitude: "",
    description: "",
  });

  useEffect(() => {
    if (initialData) {
      setFormData({
        name: initialData.name || "",
        latitude: initialData.latitude || "",
        longitude: initialData.longitude || "",
        description: initialData.description || initialData.details || "",
      });
    } else {
      setFormData({ name: "", latitude: "", longitude: "", description: "" });
    }
  }, [initialData, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData);
    onClose();
  };

  //Dùng createPortal để đưa Modal ra khỏi Sidebar
  return ReactDOM.createPortal(
    <div
      className="enhanced-modal-overlay"
      onClick={onClose}
      style={{ zIndex: 99999 }}
    >
      <div
        className="enhanced-modal-content"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header với icon và gradient */}
        <div className="enhanced-modal-header">
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <div className="modal-icon-wrapper">
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M12 2L2 7l10 5 10-5-10-5z" />
                <path d="M2 17l10 5 10-5M2 12l10 5 10-5" />
              </svg>
            </div>
            <h2 className="modal-title">
              {initialData ? "Cập nhật Ngã tư" : "Thêm Ngã tư mới"}
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
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                <circle cx="12" cy="10" r="3" />
              </svg>
              Tên Ngã tư <span className="required-mark">*</span>
            </label>
            <input
              type="text"
              required
              className="form-input-enhanced"
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
              placeholder="Ví dụ: Ngã tư Cầu Giấy"
              autoFocus
            />
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
                Vĩ độ <span className="required-mark">*</span>
              </label>
              <input
                type="number"
                step="any"
                required
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
                Kinh độ <span className="required-mark">*</span>
              </label>
              <input
                type="number"
                step="any"
                required
                className="form-input-enhanced"
                value={formData.longitude}
                onChange={(e) =>
                  setFormData({ ...formData, longitude: e.target.value })
                }
                placeholder="105.8542"
              />
            </div>
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
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
                <line x1="16" y1="13" x2="8" y2="13" />
                <line x1="16" y1="17" x2="8" y2="17" />
              </svg>
              Mô tả thêm
            </label>
            <textarea
              className="form-textarea-enhanced"
              value={formData.description}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
              placeholder="Ghi chú về lưu lượng, đặc điểm..."
              rows="3"
            />
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
              {initialData ? "Lưu thay đổi" : "Tạo mới"}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body // tham số thứ 2: Gắn vào body
  );
}
