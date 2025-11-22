import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

export default function Login(){
    const [isRegister, setIsRegister] = useState(false);
    const [formData, setFormData] = useState({
        fullName: '',
        userName: '',
        password: '',
    });
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    const {login, register} = useAuth();
    const navigate = useNavigate();

    const handleChange = (e) => {
        setFormData({...formData, [e.target.name]: e.target.value});
    };
    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            if (isRegister) {
                await register(formData.fullName, formData.username, formData.password);
                setIsRegister(false);
                setFormData({ ...formData, fullName: '' });
            } else {
                await login(formData.username, formData.password);
                navigate('/');
            }
        } catch (err) {
            setError(err.message || 'Đã có lỗi xảy ra');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="login-container">
            <div className="login-card">
                <div className="login-header">
                    <h1 className="login-title">Traffic Monitor</h1>
                    <p className="login-subtitle">
                        {isRegister ? 'Dang ky tai khoan moi' : 'Dang nhap he thong giam sat'}
                    </p>
                </div>

                {error && <div className="login-error">{error}</div> }

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
                                placeholder="Nguyen Van ..."
                            />
                        </div>
                    )}

                    <div className="form-group">
                        <label>Tên đăng nhập</label>
                        <input
                            type="text"
                            name="username"
                            required
                            value={formData.username}
                            onChange={handleChange}
                            placeholder={!isRegister ? "admin" : ""}
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
                            placeholder={!isRegister ? "123456" : ""}
                        />
                    </div>

                    <button type="submit" className="login-submit" disabled={loading}>
                        {loading ? 'Đang xử lý...' : (isRegister ? 'Đăng ký' : 'Đăng nhập')}
                    </button>
                </form>

                <div className="login-toggle">
                    {isRegister ? (
                        <>Đã có tài khoản? <button type="button" onClick={() => { setIsRegister(false); setError(''); }}>Đăng nhập ngay</button></>
                    ) : (
                        <>Chưa có tài khoản? <button type="button" onClick={() => { setIsRegister(true); setError(''); }}>Đăng ký miễn phí</button></>
                    )}
                </div>

                {!isRegister && (
                    <div className="login-hint">
                        <strong>Gợi ý tài khoản nhanh:</strong><br />
                        • admin / 123456 → Quản trị viên<br />
                        • user / user → Nhân viên giám sát
                    </div>
                )}
            </div>
        </div>
    )
}

