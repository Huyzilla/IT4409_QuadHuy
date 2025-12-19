import React, { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useLocation, useNavigate } from "react-router-dom";


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

    const { login, register, isAuthenticated } = useAuth();
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
            if (isRegister) {
                await register(
                    formData.fullName,
                    formData.username,
                    formData.email,
                    formData.password
                );

                setIsRegister(false);
                setFormData({ ...formData, fullName: "", email: "", password: "" });
                navigate("/");
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


    // Đăng nhập Google bằng redirect
    const handleGoogleRedirect = () => {
        window.location.href = `${import.meta.env.VITE_BACKEND_URL || "http://localhost:3000"}/api/auth/google`;
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

                        {isRegister && (
                            <div className="form-group">
                                <label>Email</label>
                                <input
                                    type="email"
                                    name="email"
                                    required
                                    value={formData.email}
                                    onChange={handleChange}
                                    placeholder="you@example.com"
                                />
                            </div>
                        )}

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
                            <button
                                type="button"
                                className="google-login-btn"
                                onClick={handleGoogleRedirect}
                                style={{
                                    background: '#fff',
                                    border: '1px solid #ccc',
                                    borderRadius: 4,
                                    padding: '8px 16px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    cursor: 'pointer',
                                    fontWeight: 500
                                }}
                            >
                                <img src="https://developers.google.com/identity/images/g-logo.png" alt="Google" style={{ width: 20, height: 20, marginRight: 8 }} />
                                Đăng nhập với Google
                            </button>
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
    );
}
