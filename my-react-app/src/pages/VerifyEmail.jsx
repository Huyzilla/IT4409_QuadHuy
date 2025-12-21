import React, { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { useNavigate, useSearchParams } from "react-router-dom";

export default function VerifyEmail() {
  const [otp, setOtp] = useState("");
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState("input"); // 'input', 'verifying', 'success'

  const { verifyEmail } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    // 1. Kiểm tra nếu là Link bấm từ Email (có ?token=...&email=...)
    const tokenFromUrl = searchParams.get("token");
    const emailFromUrl = searchParams.get("email");

    if (tokenFromUrl && emailFromUrl) {
      handleAutoVerify(emailFromUrl, tokenFromUrl);
    } else {
      // 2. Nếu không có token, thử lấy email từ trang Register chuyển sang (nếu có)
      const emailFromState = localStorage.getItem("pendingEmail");
      if (emailFromState) setEmail(emailFromState);
    }
  }, []);

  const handleAutoVerify = async (email, token) => {
    setStatus("verifying");
    try {
      await verifyEmail(email, null, token);
      setStatus("success");
      setTimeout(() => navigate("/"), 1500); // Tự vào trang chủ sau 1.5s
    } catch (err) {
      setError(err.message);
      setStatus("input"); // Quay về chế độ nhập tay nếu link lỗi
      setEmail(email);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await verifyEmail(email, otp, null);
      // Xóa email tạm
      localStorage.removeItem("pendingEmail");
      alert("Kích hoạt tài khoản thành công!");
      navigate("/");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Giao diện khi đang tự động xác thực qua Link
  if (status === "verifying") {
    return (
      <div
        className="login-container"
        style={{ color: "white", textAlign: "center" }}
      >
        <h2>Đang xác thực...</h2>
        <div className="loader"></div>
      </div>
    );
  }

  // Giao diện khi thành công
  if (status === "success") {
    return (
      <div
        className="login-container"
        style={{ color: "#4ade80", textAlign: "center" }}
      >
        <h2>✅ Xác thực thành công!</h2>
        <p>Đang chuyển hướng vào hệ thống...</p>
      </div>
    );
  }

  // Giao diện nhập OTP bình thường
  return (
    <div className="login-container">
      <div className="bg-glow-1"></div>
      <div className="bg-glow-2"></div>
      <div className="login-card">
        <div className="login-header">
          <h1 className="login-title">Xác Thực Email</h1>
          <p className="login-subtitle">
            Nhập mã 6 số được gửi tới:
            <br />
            <strong>{email}</strong>
          </p>
        </div>

        {error && <div className="login-error">⚠️ {error}</div>}

        <form className="login-form" onSubmit={handleSubmit}>
          <div className="form-group">
            <input
              type="text"
              value={otp}
              onChange={(e) =>
                setOtp(e.target.value.replace(/[^0-9]/g, "").slice(0, 6))
              }
              placeholder="123456"
              style={{
                letterSpacing: "8px",
                textAlign: "center",
                fontSize: "24px",
                fontWeight: "bold",
              }}
              required
            />
          </div>

          <button type="submit" className="login-submit" disabled={loading}>
            {loading ? "Đang xử lý..." : "Xác nhận"}
          </button>
        </form>

        <div className="login-footer">
          <button onClick={() => navigate("/login")}>Quay lại Đăng nhập</button>
        </div>
      </div>
    </div>
  );
}
