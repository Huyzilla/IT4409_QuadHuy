import React, { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";

export default function AccountSettings() {
    const { user, loading: authLoading, updateUserProfile } = useAuth();
    const [formData, setFormData] = useState({
        fullName: user?.fullName || "",
        username: user?.username || "",
        currentPassword: "",
        newPassword: "",
        confirmNewPassword: "",
    });
    const [statusMessage, setStatusMessage] = useState({ type: null, message: "" });
    const [loading, setLoading] = useState(false);
    const [avatarFile, setAvatarFile] = useState(null);

    useEffect(() => {
        setFormData(prev => ({
            ...prev,
            fullName: user?.fullName || "",
            username: user?.username || "",
        }));
    }, [user]);

    const handleInfoChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
        if (statusMessage.message) setStatusMessage({ type: null, message: "" });
    };

    const handleInfoSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setStatusMessage({ type: null, message: "" });

        try {
            if (formData.fullName.trim().length < 3) {
                throw new Error("Họ và tên phải có ít nhất 3 ký tự.");
            }
            if (formData.fullName === user.fullName) {
                setStatusMessage({ type: "info", message: "ℹ️ Không có thay đổi nào để lưu." });
                setLoading(false);
                return;
            }

            await updateUserProfile({
                fullName: formData.fullName,
            });
            setStatusMessage({ type: "success", message: "Cập nhật thông tin cơ bản thành công!" });
        } catch (error) {
            setStatusMessage({ type: "error", message: error.message || "Cập nhật thông tin cơ bản thất bại." });
        } finally {
            setLoading(false);
        }
    };

    const handlePasswordSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setStatusMessage({ type: null, message: "" });

        if (formData.newPassword.length < 6) {
            setStatusMessage({ type: "error", message: "⚠Mật khẩu mới phải có ít nhất 6 ký tự." });
            setLoading(false);
            return;
        }

        if (formData.newPassword !== formData.confirmNewPassword) {
            setStatusMessage({ type: "error", message: "Mật khẩu mới và Xác nhận mật khẩu không khớp." });
            setLoading(false);
            return;
        }

        if (!formData.currentPassword) {
            setStatusMessage({ type: "error", message: "Vui lòng nhập mật khẩu hiện tại để xác nhận thay đổi." });
            setLoading(false);
            return;
        }

        // Giả lập gọi API đổi mật khẩu
        await new Promise((r) => setTimeout(r, 1200));

        const isCurrentPasswordCorrect = user.password && formData.currentPassword === user.password || formData.currentPassword === "123456";

        if (!isCurrentPasswordCorrect) {
            setStatusMessage({ type: "error", message: "Mật khẩu hiện tại không đúng." });
        } else {
            setStatusMessage({ type: "success", message: "Đổi mật khẩu thành công. Mật khẩu mới sẽ có hiệu lực lần đăng nhập tới." });
            setFormData(prev => ({ ...prev, currentPassword: "", newPassword: "", confirmNewPassword: "" }));
        }
        setLoading(false);
    };

    const handleAvatarUpload = async (e) => {
        e.preventDefault();
        setLoading(true);
        setStatusMessage({ type: null, message: "" });

        if (!avatarFile) {
            setStatusMessage({ type: "error", message: "Vui lòng chọn một tệp ảnh để tải lên." });
            setLoading(false);
            return;
        }

        const newAvatarUrl = `https://picsum.photos/seed/${Date.now() + Math.random()}/100/100`; // URL giả lập thay đổi

        try {
            await updateUserProfile({ avatarUrl: newAvatarUrl });

            setStatusMessage({ type: "success", message: "Cập nhật ảnh đại diện thành công!" });
        } catch (error) {
            setStatusMessage({ type: "error", message: error.message || "Cập nhật ảnh đại diện thất bại." });
        } finally {
            setLoading(false);
            setAvatarFile(null); // Clear file state
            const fileInput = document.getElementById('avatar-upload-input');
            if (fileInput) fileInput.value = '';
        }
    };

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setAvatarFile(file);
            if (statusMessage.message) setStatusMessage({ type: null, message: "" });
        }
    };


    if (authLoading) {
        return (
            <div className="main-content" style={{ display: "grid", placeItems: "center", height: "100vh" }}>
                Đang tải dữ liệu người dùng...
            </div>
        );
    }

    const messageClass = statusMessage.type === "error" ? "login-error" : "login-hint";
    const messageStyle = statusMessage.type === "success" ? { borderColor: 'var(--color-traffic-low)', color: 'var(--color-traffic-low)', background: 'rgba(52, 211, 153, 0.1)' } : statusMessage.type === "info" ? { borderColor: 'var(--color-accent-blue)', color: 'var(--color-accent-blue)', background: 'rgba(59, 130, 246, 0.1)' } : {};

    return (
        <main className="main-content">
            <header className="main-header">
                <h1 className="page-title">
                    Cài đặt Tài khoản
                    <span style={{ fontSize: "15px", color: "#94a3b8", marginLeft: "12px", fontWeight: "normal" }}>
                        — Quản lý hồ sơ và bảo mật
                    </span>
                </h1>
                <div className="header-actions">
                    <button className="action-btn">
                        Trợ giúp
                    </button>
                </div>
            </header>

            {statusMessage.message && (
                <div className={messageClass} style={{ marginBottom: '30px', ...messageStyle }}>
                    {statusMessage.message}
                </div>
            )}

            <div className="account-settings-grid">

                <div className="account-info-group">
                    <div className="segment-card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                        <h3 style={{ marginTop: 0, paddingBottom: '10px', marginBottom: '20px', width: '100%', textAlign: 'center', borderBottom: '1px solid var(--color-border)' }}>Ảnh Đại Diện</h3>

                        {/* Avatar hiện tại */}
                        <div className="avatar-preview-large">
                            {user?.avatarUrl ? (
                                <img src={user.avatarUrl} alt="Avatar người dùng" />
                            ) : (
                                <span className="icon icon-user-placeholder"></span>
                            )}
                        </div>
                        <p style={{marginTop: '15px', color: 'var(--color-text-primary)'}}>{user?.fullName}</p>
                        <p style={{marginBottom: '20px', fontSize: '14px', color: 'var(--color-text-secondary)'}}>{user?.role === "admin" ? "Quản trị viên" : "Nhân viên giám sát"}</p>


                        <form onSubmit={handleAvatarUpload} style={{ width: '100%', maxWidth: '300px' }}>
                            <input
                                type="file"
                                id="avatar-upload-input"
                                accept="image/*"
                                className="hidden-file-input"
                                onChange={handleFileChange}
                            />
                            <label htmlFor="avatar-upload-input" className="avatar-upload-file-input">
                                {avatarFile ? `Đã chọn: ${avatarFile.name}` : "Chọn tệp ảnh..."}
                            </label>

                            <button type="submit" className="login-submit" disabled={loading || !avatarFile} style={{ background: 'var(--color-accent-cyan)' }}>
                                {loading ? "Đang tải lên..." : "Cập nhật Avatar"}
                            </button>
                        </form>
                    </div>


                    <div className="segment-card">
                        <h3 style={{ marginTop: 0, borderBottom: '1px solid var(--color-border)', paddingBottom: '10px', marginBottom: '20px' }}>Thông tin Cơ bản</h3>
                        <form className="login-form" onSubmit={handleInfoSubmit}>
                            <div className="form-group">
                                <label>Họ và tên</label>
                                <input
                                    type="text"
                                    name="fullName"
                                    required
                                    value={formData.fullName}
                                    onChange={handleInfoChange}
                                />
                            </div>

                            <div className="form-group">
                                <label>Tên đăng nhập / Email</label>
                                <input
                                    type="text"
                                    name="username"
                                    disabled
                                    value={formData.username}
                                    style={{ background: 'var(--color-bg-tertiary)', opacity: 0.8 }}
                                />
                                <small>Không thể thay đổi Tên đăng nhập / Email.</small>
                            </div>

                            <button type="submit" className="login-submit" disabled={loading} style={{ marginTop: '20px' }}>
                                {loading ? "Đang lưu..." : "Lưu thay đổi"}
                            </button>
                        </form>
                    </div>

                </div>


                <div className="segment-card" style={{ height: 'fit-content' }}>
                    <h3 style={{ marginTop: 0, borderBottom: '1px solid var(--color-border)', paddingBottom: '10px', marginBottom: '20px' }}>Thay đổi Mật khẩu</h3>
                    <form className="login-form" onSubmit={handlePasswordSubmit}>
                        <div className="form-group">
                            <label>Mật khẩu hiện tại</label>
                            <input
                                type="password"
                                name="currentPassword"
                                required
                                value={formData.currentPassword}
                                onChange={handleInfoChange}
                                placeholder="Nhập mật khẩu cũ"
                            />
                        </div>

                        <div className="form-group">
                            <label>Mật khẩu mới (Tối thiểu 6 ký tự)</label>
                            <input
                                type="password"
                                name="newPassword"
                                required
                                minLength={6}
                                value={formData.newPassword}
                                onChange={handleInfoChange}
                                placeholder="••••••"
                            />
                        </div>

                        <div className="form-group">
                            <label>Xác nhận Mật khẩu mới</label>
                            <input
                                type="password"
                                name="confirmNewPassword"
                                required
                                minLength={6}
                                value={formData.confirmNewPassword}
                                onChange={handleInfoChange}
                                placeholder="••••••"
                            />
                        </div>

                        <button type="submit" className="login-submit" disabled={loading} style={{ background: 'var(--color-traffic-warning)', marginTop: '20px' }}>
                            {loading ? "Đang xử lý..." : "Đổi mật khẩu"}
                        </button>
                    </form>
                </div>

            </div>
        </main>
    );
}