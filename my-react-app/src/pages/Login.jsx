import React, { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";
import { GoogleOAuthProvider, GoogleLogin } from "@react-oauth/google";

const GOOGLE_CLIENT_ID = "GOOGLE_CLIENT_ID";

export default function Login() {
  const [isRegister, setIsRegister] = useState(false);
  const [formData, setFormData] = useState({
    fullName: "",
    username: "",
    email: "",
    password: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const { login, register, googleLogin } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e) =>
    setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      if (isRegister) {
        await register(
          formData.fullName,
          formData.username,
          formData.email,
          formData.password
        );

        setIsRegister(false);
        setFormData({ ...formData, fullName: "", email: "", password: "" });
        alert("Đăng ký thành công! Vui lòng đăng nhập.");
      } else {
        await login(formData.username, formData.password);

        navigate("/");
      }
    } catch (err) {
      setError(err.message || "Đã có lỗi xảy ra");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSuccess = async (credentialResponse) => {
    setLoading(true);
    setError("");

    try {
      await googleLogin(credentialResponse.credential);
      navigate("/");
    } catch (err) {
      setError(err.message || "Đăng nhập Google thất bại.");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleFailure = () => {
    setError("Đăng nhập Google thất bại. Vui lòng thử lại.");
  };

  return (
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <div className="login-container">
        {/* Hiệu ứng nền mờ trang trí */}
        <div className="bg-glow-1"></div>
        <div className="bg-glow-2"></div>

        <div className="login-card">
          <div className="login-header">
            <div className="login-logo">
              <svg
                viewBox="0 0 24 24"
                fill="currentColor"
                width="40"
                height="40"
              >
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z" />
              </svg>
            </div>
            <h1 className="login-title">Traffic Monitor</h1>
            <p className="login-subtitle">
              {isRegister
                ? "Đăng ký tài khoản giám sát viên"
                : "Hệ thống giám sát giao thông thông minh"}
            </p>
          </div>

          {error && <div className="login-error">⚠️ {error}</div>}

          <form className="login-form" onSubmit={handleSubmit}>
            {isRegister && (
              <div className="form-group">
                <label>Họ và tên</label>
                <input
                  type="text"
                  name="fullName"
                  required
                  value={formData.fullName}
                  onChange={handleChange}
                  placeholder="Ví dụ: Nguyễn Văn A"
                />
              </div>
            )}

            {/*Tách riêng ô Username */}
            <div className="form-group">
              <label>Tên đăng nhập</label>
              <input
                type="text"
                name="username"
                required
                value={formData.username}
                onChange={handleChange}
                placeholder="Ví dụ: huynguyen123"
              />
            </div>

            {/* Tách riêng ô Email */}
            <div className="form-group">
              <label>Email xác thực</label>
              <input
                type="email"
                name="email"
                required
                value={formData.email}
                onChange={handleChange}
                placeholder="Ví dụ: email@domain.com"
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
              {loading ? (
                <span className="loader"></span>
              ) : isRegister ? (
                "Tạo tài khoản"
              ) : (
                "Truy cập hệ thống"
              )}
            </button>
          </form>

          {!isRegister && (
            <div
              className="google-login-wrapper"
              style={{
                marginTop: "20px",
                display: "flex",
                justifyContent: "center",
              }}
            >
              <GoogleLogin
                onSuccess={handleGoogleSuccess}
                onError={handleGoogleFailure}
                useOneTap
              />
            </div>
          )}

          <div className="login-footer">
            {isRegister ? (
              <p>
                Đã có tài khoản?{" "}
                <button
                  onClick={() => {
                    setIsRegister(false);
                    setError("");
                  }}
                >
                  Đăng nhập
                </button>
              </p>
            ) : (
              <p>
                Chưa có tài khoản?{" "}
                <button
                  onClick={() => {
                    setIsRegister(true);
                    setError("");
                  }}
                >
                  Đăng ký ngay
                </button>
              </p>
            )}
          </div>
        </div>
      </div>
    </GoogleOAuthProvider>
  );
}
