import initialUsers from "../data/users.json";
import React, { createContext, useContext, useState, useEffect } from "react";
import { api, setOnUnauthorized } from "../api";
import { connectTrafficSocket, disconnectTrafficSocket } from "../socket";

const AuthContext = createContext();

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) throw new Error("useAuth must be used within AuthProvider");
    return context;
};

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [accessToken, setAccessToken] = useState(null);
    const [loading, setLoading] = useState(true);
    const [users, setUsers] = useState([]);

    const DB_KEY = "traffic-users-db";

    useEffect(() => {
        // Global 401 handler: if token becomes invalid/expired, force logout and go to login.
        setOnUnauthorized(() => {
            // Avoid loops if we're already on /login
            const isOnLogin = window.location?.pathname === "/login";
            setUser(null);
            setAccessToken(null);
            localStorage.removeItem("traffic-user");
            localStorage.removeItem("traffic-google-id-token");
            localStorage.removeItem("traffic-access-token");
            disconnectTrafficSocket();
            if (!isOnLogin) {
                window.location.assign("/login");
            }
        });

        const savedUsers = localStorage.getItem(DB_KEY);

        if (savedUsers) {
            setUsers(JSON.parse(savedUsers));
        } else {
            setUsers(initialUsers);
            localStorage.setItem(DB_KEY, JSON.stringify(initialUsers));
        }

        const savedUser = localStorage.getItem("traffic-user");
        if (savedUser) {
            setUser(JSON.parse(savedUser));
        }

        const savedAccessToken = localStorage.getItem("traffic-access-token");
        if (savedAccessToken) {
            setAccessToken(savedAccessToken);
            connectTrafficSocket();
        }

        setLoading(false);
    }, []);

    const register = async (fullName, username, email, password) => {
        const res = await api.post(`/auth/register`, {
            fullName,
            username,
            email,
            password,
        });

        const { accessToken: issuedToken, user: backendUser } = res.data || {};
        if (!issuedToken || !backendUser) {
            throw new Error("Backend không trả về accessToken/user.");
        }

        setAccessToken(issuedToken);
        localStorage.setItem("traffic-access-token", issuedToken);
        connectTrafficSocket();

        const normalizedUser = {
            id: backendUser.id,
            username: backendUser.username,
            fullName: backendUser.fullName,
            role: "user",
            avatarUrl: backendUser.avatar || null,
            email: backendUser.email,
            provider: "local",
        };

        setUser(normalizedUser);
        localStorage.setItem("traffic-user", JSON.stringify(normalizedUser));
    };

    const login = async (usernameOrEmail, password) => {
        const res = await api.post(`/auth/login`, {
            username: usernameOrEmail,
            password,
        });

        const { accessToken: issuedToken, user: backendUser } = res.data || {};
        if (!issuedToken || !backendUser) {
            throw new Error("Backend không trả về accessToken/user.");
        }

        setAccessToken(issuedToken);
        localStorage.setItem("traffic-access-token", issuedToken);
        connectTrafficSocket();

        const normalizedUser = {
            id: backendUser.id,
            username: backendUser.username,
            fullName: backendUser.fullName,
            role: "user",
            avatarUrl: backendUser.avatar || null,
            email: backendUser.email,
            provider: backendUser.provider || "local",
        };

        setUser(normalizedUser);
        localStorage.setItem("traffic-user", JSON.stringify(normalizedUser));
    };

    const updateUserProfile = async (updates) => {
        if (!user) {
            throw new Error("Người dùng chưa đăng nhập.");
        }

        const updatedUser = { ...user, ...updates };
        setUser(updatedUser);
        localStorage.setItem("traffic-user", JSON.stringify(updatedUser));

        return updatedUser;
    };

    // HÀM ĐĂNG NHẬP GOOGLE(GIẢ LẬP)
    const googleLogin = async (googleIdToken) => {
        if (!googleIdToken) {
            throw new Error("Thiếu Google credential.");
        }

        // Case 2: gửi Google credential lên backend để verify, rồi nhận JWT của hệ thống
        const res = await api.post(`/auth/google`, {
            credential: googleIdToken,
        });

        const { accessToken: issuedToken, user: backendUser } = res.data || {};
        if (!issuedToken || !backendUser) {
            throw new Error("Backend không trả về accessToken/user.");
        }

        setAccessToken(issuedToken);
        localStorage.setItem("traffic-access-token", issuedToken);
        connectTrafficSocket();

        const normalizedUser = {
            id: backendUser.id,
            username: backendUser.username,
            fullName: backendUser.fullName,
            role: "user",
            avatarUrl: backendUser.avatar || null,
            email: backendUser.email,
            provider: "google",
        };

        setUser(normalizedUser);
        localStorage.setItem("traffic-user", JSON.stringify(normalizedUser));
        localStorage.setItem("traffic-google-id-token", googleIdToken);
    };

    const logout = () => {
        setUser(null);
        setAccessToken(null);
        localStorage.removeItem("traffic-user");
        localStorage.removeItem("traffic-google-id-token");
        localStorage.removeItem("traffic-access-token");
        disconnectTrafficSocket();
    };

    // Hàm cho OAuth redirect: lưu accessToken và refreshToken
    const setTokens = (token, refreshToken) => {
        setAccessToken(token);
        localStorage.setItem("traffic-access-token", token);
        // Refresh token is now managed by httpOnly cookie set by the backend
        connectTrafficSocket();
    };

    // After setting tokens, fetch user profile from backend and set user in context
    const setTokensAndFetchUser = async (token, refreshToken) => {
        try {
            setTokens(token);
            // Fetch current user
            const res = await api.get('/auth/me');
            const backendUser = res.data || {};
            const normalizedUser = {
                id: backendUser.id,
                username: backendUser.username,
                fullName: backendUser.fullName,
                role: 'user',
                avatarUrl: backendUser.avatar || null,
                email: backendUser.email,
                provider: backendUser.provider || 'google',
            };
            setUser(normalizedUser);
            localStorage.setItem('traffic-user', JSON.stringify(normalizedUser));
        } catch (err) {
            // If fetching user fails, clear tokens
            setAccessToken(null);
            localStorage.removeItem('traffic-access-token');
            // refresh token is server-managed cookie
        }
    };

    // Set tokens and user directly when the backend returns user data
    const setTokensAndSetUser = async (token, backendUser) => {
        setTokens(token);
        if (backendUser) {
            const normalizedUser = {
                id: backendUser.id,
                username: backendUser.username,
                fullName: backendUser.fullName,
                role: 'user',
                avatarUrl: backendUser.avatar || null,
                email: backendUser.email,
                provider: backendUser.provider || 'google',
            };
            setUser(normalizedUser);
            localStorage.setItem('traffic-user', JSON.stringify(normalizedUser));
        }
    };

    return (
        <AuthContext.Provider
            value={{
                user,
                accessToken,
                users,
                login,
                register,
                logout,
                googleLogin,
                setTokens,
                setTokensAndFetchUser,
                setTokensAndSetUser,
                loading,
                isAuthenticated: !!accessToken,
            }}
        >
            {children}
        </AuthContext.Provider>
    );
};