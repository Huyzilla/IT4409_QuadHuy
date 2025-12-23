import React, { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { useNavigate, useSearchParams } from "react-router-dom";

export default function VerifyEmail() {
  const [otp, setOtp] = useState("");
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState("input"); // 'input', 'verifying', 'success'

  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // State cho bộ đếm ngược gửi lại mã
  const [countdown, setCountdown] = useState(0);
  const [resendSuccess, setResendSuccess] = useState("");
  // Lấy thêm hàm resendVerification
  const { verifyEmail, resendVerification } = useAuth();

  useEffect(() => {
    // 1. Kiểm tra nếu là Link bấm từ Email (có ?token=...&email=...)
    const tokenFromUrl = searchParams.get("token");
    const emailFromUrl = searchParams.get("email");

    if (tokenFromUrl && emailFromUrl) {
      handleAutoVerify(emailFromUrl, tokenFromUrl);
    } else {
      // 2. Nếu không có token, thử lấy email từ trang Register chuyển sang (nếu có)
      const emailFromState = localStorage.getItem("pendingEmail");
      if (emailFromState) {
        setEmail(emailFromState);
        setCountdown(30);
      }
    }
  }, []);
  // Effect để chạy đồng hồ đếm ngược
  useEffect(() => {
    let timer;
    if (countdown > 0) {
      timer = setInterval(() => {
        setCountdown((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [countdown]);

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

  const handleResend = async () => {
    if (countdown > 0) return; // Chặn nếu đang đếm ngược

    setError("");
    setResendSuccess("");
    setLoading(true);

    try {
      await resendVerification(email);
      setResendSuccess("Đã gửi lại mã xác thực vào email!");
      setCountdown(30);
    } catch (err) {
      console.error("Resend Error:", err);

      if (err.response) {
        const { status, data } = err.response;
        // XỬ LÝ RATE LIMIT (400 hoặc 429)
        if (status === 400 || status === 429) {
          setError(
            "Bạn đã gửi yêu cầu quá nhiều lần. Vui lòng thử lại sau ít phút."
          );
        } else {
          setError(data.message || "Không thể gửi lại mã.");
        }
      } else {
        setError("Lỗi kết nối mạng.");
      }
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
        {resendSuccess && (
          <div
            className="login-success"
            style={{
              backgroundColor: "rgba(16, 185, 129, 0.1)",
              border: "1px solid rgba(16, 185, 129, 0.2)",
              color: "#10b981",
              padding: "10px",
              borderRadius: "6px",
              marginBottom: "15px",
              textAlign: "center",
            }}
          >
            {resendSuccess}
          </div>
        )}

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

        {/*NÚT GỬI LẠI MÃ */}
        <div className="login-footer" style={{ marginTop: "20px" }}>
          <p>
            Không nhận được mã?{" "}
            <button
              type="button"
              onClick={handleResend}
              disabled={countdown > 0 || loading}
              style={{
                background: "none",
                border: "none",
                color:
                  countdown > 0
                    ? "#94a3b8"
                    : "var(--color-accent-blue, #0ea5e9)",
                cursor: countdown > 0 ? "not-allowed" : "pointer",
                fontWeight: "bold",
                textDecoration: "underline",
              }}
            >
              {countdown > 0 ? `Gửi lại sau ${countdown}s` : "Gửi lại mã"}
            </button>
          </p>
        </div>

        <div className="login-footer">
          <button onClick={() => navigate("/login")}>Quay lại Đăng nhập</button>
        </div>
      </div>
    </div>
  );
}
