import React, { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useLocation, useNavigate } from "react-router-dom";

export default function Login() {
  const [formData, setFormData] = useState({
    username: "",
    password: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const { login, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Default: if already logged in, don't let /login linger.
  // If you need to open the login page while authenticated (e.g. switch accounts), use: /login?stay=1
  useEffect(() => {
    const params = new URLSearchParams(location.search || "");
    const stay = params.get("stay") === "1";
    if (isAuthenticated && !stay) {
      navigate("/dashboard", { replace: true });
    }
  }, [isAuthenticated, location.search, navigate]);

  const handleChange = (e) =>
    setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      await login(formData.username, formData.password);
      navigate("/");
    } catch (err) {
      console.error("Login Failed:", err);

      let errorMessage = "Đã có lỗi xảy ra. Vui lòng thử lại.";

      // Kiểm tra nếu có phản hồi từ Server (API trả về lỗi)
      if (err.response) {
        const { status, data } = err.response;

        switch (status) {
          case 404:
            // Backend trả về 404 -> Không tìm thấy user
            errorMessage =
              "Tài khoản không tồn tại. Vui lòng kiểm tra lại Tên đăng nhập/Email.";
            break;
          case 401:
            // Backend trả về 401 -> Sai mật khẩu (hoặc sai thông tin đăng nhập nói chung)
            errorMessage = "Sai tên đăng nhập hoặc mật khẩu.";
            break;
          case 400:
            if (data.message?.includes("Quá nhiều lần")) {
              errorMessage = `${data.message} ⏳ (Chờ 10 phút để thử lại)`;
            } else {
              errorMessage = data.message || "Dữ liệu nhập không hợp lệ.";
            }
            break;
          case 403:
            // Backend trả về 403 -> Tài khoản bị khóa hoặc chưa xác thực
            errorMessage = "Tài khoản này đã bị khóa hoặc chưa xác thực email.";
            break;
          case 500:
            errorMessage = "Lỗi hệ thống máy chủ. Vui lòng thử lại sau.";
            break;
          default:
            // Các lỗi khác thì lấy message từ backend nếu có
            errorMessage = data.message || `Lỗi không xác định (${status})`;
        }
      } else if (err.request) {
        // Không nhận được phản hồi (Rớt mạng, Server tắt)
        errorMessage =
          "Không thể kết nối đến máy chủ. Vui lòng kiểm tra kết nối mạng.";
      } else {
        // Lỗi khi setup request
        errorMessage = err.message;
      }

      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // Đăng nhập Google bằng redirect
  const handleGoogleRedirect = () => {
    const backendOrigin =
      import.meta.env.VITE_BACKEND_URL || "http://localhost:3000";
    window.location.href = `${backendOrigin}/api/auth/google`;
  };

  return (
    <div className="login-container">
      {/* Hiệu ứng nền mờ trang trí */}
      <div className="bg-glow-1"></div>
      <div className="bg-glow-2"></div>

      <div className="login-card">
        <div className="login-header">
          <div className="login-logo">
            <svg viewBox="0 0 24 24" fill="currentColor" width="40" height="40">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z" />
            </svg>
          </div>
          <h1 className="login-title">Traffic Monitor</h1>
          <p className="login-subtitle">
            Hệ thống giám sát giao thông thông minh
          </p>
        </div>

        {error && <div className="login-error">⚠️ {error}</div>}

        <form className="login-form" onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Tên đăng nhập / Email</label>
            <input
              type="text"
              name="username"
              required
              value={formData.username}
              onChange={handleChange}
              placeholder="username"
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
            {loading ? <span className="loader"></span> : "Truy cập hệ thống"}
          </button>
        </form>

        <div
          className="google-login-wrapper"
          style={{
            marginTop: "20px",
            display: "flex",
            justifyContent: "center",
          }}
        >
          <button
            type="button"
            className="google-login-btn"
            onClick={handleGoogleRedirect}
            style={{
              background: "#fff",
              border: "1px solid #ccc",
              borderRadius: 4,
              padding: "8px 16px",
              display: "flex",
              alignItems: "center",
              cursor: "pointer",
              fontWeight: 500,
            }}
          >
            <img
              src="https://developers.google.com/identity/images/g-logo.png"
              alt="Google"
              style={{ width: 20, height: 20, marginRight: 8 }}
            />
            Đăng nhập với Google
          </button>
        </div>

        <div className="login-footer">
          <p>
            Chưa có tài khoản?{" "}
            <button
              type="button"
              onClick={() => {
                setError("");
                navigate("/register");
              }}
            >
              Đăng ký ngay
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
