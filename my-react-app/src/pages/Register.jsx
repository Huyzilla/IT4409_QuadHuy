import React, { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";

export default function Register() {
  const [formData, setFormData] = useState({
    fullName: "",
    username: "",
    email: "",
    password: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const { register } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e) =>
    setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      // Gọi hàm register với đầy đủ 4 tham số
      await register(
        formData.fullName,
        formData.username,
        formData.email,
        formData.password
      );
      localStorage.setItem("pendingEmail", formData.email);
      alert("Đăng ký thành công! Vui lòng kiểm tra Email để lấy mã xác thực.");
      navigate("/verify-email");
    } catch (err) {
      console.error("Register Error:", err);

      // 1. KHAI BÁO BIẾN LỖI MẶC ĐỊNH Ở NGOÀI CÙNG
      let errorMessage = "Đăng ký thất bại. Vui lòng thử lại.";
      if (err.response) {
        const { status, data } = err.response;
        switch (status) {
          case 409: // Conflict
            // Đây là mã lỗi chuẩn khi Username hoặc Email đã có trong DB
            errorMessage = "Tên đăng nhập hoặc Email này đã được sử dụng.";
            break;
          case 400:
            if (data.message?.includes("Quá nhiều lần")) {
              errorMessage = `${data.message} ⏳ (Chờ 10 phút để thử lại)`;
            } else {
              errorMessage = data.message || "Dữ liệu nhập không hợp lệ.";
            }
            break;
          case 500:
            errorMessage = "Lỗi hệ thống máy chủ. Vui lòng thử lại sau.";
            break;
          default:
            errorMessage = data.message || "Đã có lỗi xảy ra.";
        }
      } else if (err.request) {
        errorMessage = "Không thể kết nối đến máy chủ. Vui lòng kiểm tra mạng.";
      } else {
        errorMessage = err.message;
      }
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      {/* Tận dụng lại CSS background cũ */}
      <div className="bg-glow-1"></div>
      <div className="bg-glow-2"></div>

      <div className="login-card">
        <div className="login-header">
          <h1 className="login-title">Đăng Ký Tài Khoản</h1>
          <p className="login-subtitle">Giám sát giao thông thông minh</p>
        </div>

        {error && <div className="login-error">⚠️ {error}</div>}

        <form className="login-form" onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Họ và tên</label>
            <input
              type="text"
              name="fullName"
              required
              value={formData.fullName}
              onChange={handleChange}
              placeholder="Nguyễn Văn A"
            />
          </div>

          <div className="form-group">
            <label>Tên đăng nhập (Username)</label>
            <input
              type="text"
              name="username"
              required
              value={formData.username}
              onChange={handleChange}
              placeholder="username123"
            />
          </div>

          <div className="form-group">
            <label>Email (Bắt buộc)</label>
            <input
              type="email"
              name="email"
              required
              value={formData.email}
              onChange={handleChange}
              placeholder="email@example.com"
            />
          </div>

          <div className="form-group">
            <label>Mật khẩu</label>
            <input
              type="password"
              name="password"
              required
              value={formData.password}
              onChange={handleChange}
              placeholder="••••••"
            />
          </div>

          <button type="submit" className="login-submit" disabled={loading}>
            {loading ? <span className="loader"></span> : "Đăng Ký"}
          </button>
        </form>

        <div className="login-footer">
          <p>
            Đã có tài khoản?{" "}
            <button onClick={() => navigate("/login")}>Đăng nhập ngay</button>
          </p>
        </div>
      </div>
    </div>
  );
}
