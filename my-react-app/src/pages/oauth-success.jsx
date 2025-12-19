import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

// Trang này sẽ được redirect về sau khi đăng nhập Google thành công
export default function OAuthSuccess() {
        const navigate = useNavigate();
        const { setTokensAndSetUser } = useAuth(); // Hàm này lưu token và user trực tiếp

        useEffect(() => {
                // After redirect from backend OAuth, call /auth/session which uses the
                // httpOnly refresh cookie to rotate tokens and returns an accessToken + user.
                (async () => {
                        try {
                                const res = await (await import("../api")).api.get("/auth/session");
                                const accessToken = res.data?.accessToken;
                                const backendUser = res.data?.user;
                                if (accessToken) {
                                        await setTokensAndSetUser(accessToken, backendUser);
                                        try { window.dispatchEvent(new Event('auth:login')); } catch (e) {}
                                        navigate('/', { replace: true });
                                } else {
                                        navigate("/login?error=oauth");
                                }
                        } catch (err) {
                                navigate("/login?error=oauth");
                        }
                })();
                }, [navigate, setTokensAndSetUser]);

        return (
                <div style={{ textAlign: "center", marginTop: 80 }}>
                        <h2>Đang xử lý đăng nhập Google...</h2>
                </div>
        );
}
