import React, { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";
import { api } from "../api";

export default function AccountSettings() {
  const navigate = useNavigate();
  const {
    user,
    loading: authLoading,
    setTokensAndFetchUser,
    accessToken,
  } = useAuth();

  const [formData, setFormData] = useState({
    fullName: user?.fullName || "",
    username: user?.username || "",
    currentPassword: "",
    newPassword: "",
    confirmNewPassword: "",
  });

  const [statusMessage, setStatusMessage] = useState({
    type: null,
    message: "",
  });

  const [loading, setLoading] = useState(false);
  const [avatarFile, setAvatarFile] = useState(null);

  useEffect(() => {
    setFormData((prev) => ({
      ...prev,
      fullName: user?.fullName || "",
      username: user?.username || "",
    }));
  }, [user]);

  const handleInfoChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    if (statusMessage.message) setStatusMessage({ type: null, message: "" });
  };

  const convertToBase64 = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result);
      reader.onerror = (error) => reject(error);
    });
  };

  const handleInfoSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setStatusMessage({ type: null, message: "" });

    try {
      if (formData.fullName.trim().length === 0) {
        throw new Error("Họ tên không được để trống");
      }

      if (formData.newPassword || formData.confirmNewPassword) {
        if (formData.newPassword !== formData.confirmNewPassword) {
          throw new Error("Mật khẩu mới không khớp nhau.");
        }
        if (formData.newPassword.length < 6) {
          throw new Error("Mật khẩu mới phải có ít nhất 6 ký tự.");
        }
      }

      let avatarBase64 = null;
      if (avatarFile) {
        avatarBase64 = await convertToBase64(avatarFile);
      }

      const payload = {
        fullName: formData.fullName,
        ...(avatarBase64 && { avatar: avatarBase64 }),
        ...(formData.newPassword && { password: formData.newPassword }),
      };

      await api.patch(`/users/${user.id}`, payload);

      if (accessToken) {
        await setTokensAndFetchUser(accessToken);
      }

      setStatusMessage({
        type: "success",
        message: "Cập nhật hồ sơ thành công!",
      });

      setFormData((prev) => ({
        ...prev,
        currentPassword: "",
        newPassword: "",
        confirmNewPassword: "",
      }));
      setAvatarFile(null);
    } catch (err) {
      setStatusMessage({
        type: "error",
        message: err.response?.data?.message || err.message || "Có lỗi xảy ra.",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setAvatarFile(e.target.files[0]);
    }
  };

  // Hàm trigger click input file ẩn
  const triggerFileInput = () => {
    document.getElementById("avatar-upload-input").click();
  };

  return (
    <main className="dashboard-content">
      <div className="account-container">
        <div className="settings-header">
          <h2 className="settings-title">Cài đặt tài khoản</h2>
          <p className="settings-subtitle">
            Quản lý thông tin cá nhân và bảo mật
          </p>
        </div>

        <div className="settings-card">
          {/* Status Alert */}
          {statusMessage.message && (
            <div
              className={`alert ${
                statusMessage.type === "error" ? "alert-error" : "alert-success"
              }`}
            >
              {statusMessage.type === "error" ? "⚠️ " : "✅ "}
              {statusMessage.message}
            </div>
          )}

          <form onSubmit={handleInfoSubmit} className="settings-form">
            {/* Avatar Section */}
            <div className="avatar-upload-group">
              <div
                className="avatar-wrapper"
                onClick={triggerFileInput}
                title="Nhấn để đổi ảnh đại diện"
              >
                <img
                  src={
                    avatarFile
                      ? URL.createObjectURL(avatarFile)
                      : user?.avatarUrl || "https://via.placeholder.com/150"
                  }
                  alt="Avatar"
                  className="avatar-image"
                />
                <div className="avatar-overlay">
                  <span className="icon-camera">📷</span>
                </div>
              </div>
              <input
                id="avatar-upload-input"
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                style={{ display: "none" }}
              />
            </div>

            {/* Basic Info */}
            <div className="form-group">
              <label>Họ và tên</label>
              <input
                type="text"
                name="fullName"
                required
                value={formData.fullName}
                onChange={handleInfoChange}
                placeholder="Nhập họ và tên của bạn"
              />
            </div>

            <div className="form-group">
              <label>Tên đăng nhập (Không thể thay đổi)</label>
              <input
                type="text"
                name="username"
                disabled
                value={formData.username}
              />
            </div>

            <hr className="form-section-divider" />

            {/* Password Section */}
            <h4 className="section-label">Đổi mật khẩu</h4>

            <div className="form-group">
              <label>Mật khẩu cũ (Nếu có)</label>
              <input
                type="password"
                name="currentPassword"
                value={formData.currentPassword}
                onChange={handleInfoChange}
                placeholder="Nhập mật khẩu hiện tại"
              />
            </div>

            <div className="form-group">
              <label>Mật khẩu mới</label>
              <input
                type="password"
                name="newPassword"
                minLength={6}
                value={formData.newPassword}
                onChange={handleInfoChange}
                placeholder="Nhập mật khẩu mới (tối thiểu 6 ký tự)"
              />
            </div>

            <div className="form-group">
              <label>Xác nhận mật khẩu mới</label>
              <input
                type="password"
                name="confirmNewPassword"
                minLength={6}
                value={formData.confirmNewPassword}
                onChange={handleInfoChange}
                placeholder="Nhập lại mật khẩu mới"
              />
            </div>

            <button type="submit" className="btn-save" disabled={loading}>
              {loading ? "Đang xử lý..." : "Lưu thay đổi"}
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}
