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
      className="live-modal-overlay"
      onClick={onClose}
      style={{ zIndex: 99999 }} // Tăng thêm số 9 cho chắc ăn
    >
      <div
        className="live-modal-content"
        onClick={(e) => e.stopPropagation()}
        style={{
          maxWidth: "500px",
          padding: "30px",
          maxHeight: "90vh",
          overflowY: "auto",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            marginBottom: "20px",
          }}
        >
          <h2 style={{ margin: 0 }}>
            {initialData ? "Cập nhật Ngã tư" : "Thêm Ngã tư mới"}
          </h2>
          <button
            onClick={onClose}
            className="btn-close-modal-mini"
            style={{
              background: "none",
              border: "none",
              color: "white",
              fontSize: "24px",
              cursor: "pointer",
            }}
          >
            ×
          </button>
        </div>

        <form className="login-form" onSubmit={handleSubmit}>
          <div className="form-group">
            <label>
              Tên Ngã tư <span style={{ color: "red" }}>*</span>
            </label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
              placeholder="Ví dụ: Ngã tư Cầu Giấy"
              autoFocus //Thêm cái này để test xem focus được không
            />
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "15px",
            }}
          >
            <div className="form-group">
              <label>
                Vĩ độ (Latitude) <span style={{ color: "red" }}>*</span>
              </label>
              <input
                type="number"
                step="any"
                required
                value={formData.latitude}
                onChange={(e) =>
                  setFormData({ ...formData, latitude: e.target.value })
                }
                placeholder="21.0..."
              />
            </div>
            <div className="form-group">
              <label>
                Kinh độ (Longitude) <span style={{ color: "red" }}>*</span>
              </label>
              <input
                type="number"
                step="any"
                required
                value={formData.longitude}
                onChange={(e) =>
                  setFormData({ ...formData, longitude: e.target.value })
                }
                placeholder="105.8..."
              />
            </div>
          </div>

          <div className="form-group">
            <label>Mô tả thêm</label>
            <textarea
              value={formData.description}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
              placeholder="Ghi chú về lưu lượng, đặc điểm..."
              style={{
                width: "100%",
                padding: "10px",
                background: "var(--color-bg-primary)",
                border: "1px solid var(--color-border)",
                color: "white",
                borderRadius: "8px",
                minHeight: "80px",
              }}
            />
          </div>

          <button
            type="submit"
            className="login-submit"
            style={{ marginTop: "20px" }}
          >
            {initialData ? "Lưu thay đổi" : "Tạo mới"}
          </button>
        </form>
      </div>
    </div>,
    document.body // tham số thứ 2: Gắn vào body
  );
}
