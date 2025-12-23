import React, { createContext, useContext, useEffect, useState } from "react";
import { api, setOnUnauthorized } from "../api";
import { connectTrafficSocket, disconnectTrafficSocket } from "../socket";

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
};

const normalizeBackendUser = (backendUser, providerFallback) => {
  if (!backendUser) return null;

  const roleIdRaw =
    backendUser.roleId ?? backendUser.role_id ?? backendUser.roleID ?? null;
  const roleId = Number.isFinite(Number(roleIdRaw)) ? Number(roleIdRaw) : null;
  const role =
    backendUser.role ||
    (roleId === 0 ? "admin" : roleId === 1 ? "user" : "user");
  return {
    id: backendUser.id,
    username: backendUser.username,
    fullName: backendUser.fullName,
    role,
    roleId: roleId ?? undefined,
    avatarUrl: backendUser.avatar || backendUser.avatarUrl || null,
    email: backendUser.email,
    provider: backendUser.provider || providerFallback || "local",
  };
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [accessToken, setAccessToken] = useState(null);
  const [loading, setLoading] = useState(true);

  const clearAuth = (redirectToLogin = false) => {
    setUser(null);
    setAccessToken(null);
    localStorage.removeItem("traffic-user");
    localStorage.removeItem("traffic-google-id-token");
    localStorage.removeItem("traffic-access-token");
    disconnectTrafficSocket();

    if (redirectToLogin && window.location?.pathname !== "/login") {
      window.location.assign("/login");
    }
  };

  const persistAuth = (token, backendUser, providerFallback) => {
    if (token) {
      setAccessToken(token);
      localStorage.setItem("traffic-access-token", token);
      connectTrafficSocket();
    }

    const normalizedUser = normalizeBackendUser(backendUser, providerFallback);
    if (normalizedUser) {
      setUser(normalizedUser);
      localStorage.setItem("traffic-user", JSON.stringify(normalizedUser));
    }
  };

  useEffect(() => {
    setOnUnauthorized(() => clearAuth(true));

    const savedToken = localStorage.getItem("traffic-access-token");
    const savedUser = localStorage.getItem("traffic-user");

    // Nếu có cả token và user, khôi phục ngay và set loading = false
    if (savedToken && savedUser) {
      try {
        setAccessToken(savedToken);
        setUser(JSON.parse(savedUser));
        connectTrafficSocket();
        setLoading(false);
        return;
      } catch {
        localStorage.removeItem("traffic-user");
      }
    }

    // Nếu chỉ có token, fetch user từ API
    if (savedToken && !savedUser) {
      setAccessToken(savedToken);
      connectTrafficSocket();

      (async () => {
        try {
          const res = await api.get("/auth/me");
          persistAuth(savedToken, res.data, res.data?.provider);
        } catch {
          // Global 401 handler will take care.
        } finally {
          setLoading(false);
        }
      })();
      return;
    }

    // Không có token hoặc user, set loading = false ngay
    setLoading(false);
  }, []);

  const register = async (fullName, username, email, password) => {
    const res = await api.post("/auth/register", {
      fullName,
      username,
      email,
      password,
    });

    // Backend flow: registration requires email verification (OTP/link).
    // Response: { verificationRequired: true, email }
    const verificationRequired = res.data?.verificationRequired;
    const returnedEmail = res.data?.email || email;
    if (!verificationRequired) {
      throw new Error("Đăng ký thất bại: thiếu thông tin xác thực email.");
    }

    if (returnedEmail) {
      localStorage.setItem("pendingEmail", returnedEmail);
    }
    return res.data;
  };

  const login = async (usernameOrEmail, password) => {
    const res = await api.post("/auth/login", {
      username: usernameOrEmail,
      password,
    });

    const issuedToken = res.data?.accessToken;
    const backendUser = res.data?.user;
    if (!issuedToken || !backendUser) {
      throw new Error("Backend không trả về accessToken/user.");
    }

    persistAuth(issuedToken, backendUser, backendUser?.provider || "local");
    try {
      window.dispatchEvent(new Event("auth:login"));
    } catch {}
  };

  const googleLogin = async (credentialOrToken) => {
    const token =
      typeof credentialOrToken === "string"
        ? credentialOrToken
        : credentialOrToken?.credential;
    if (!token) throw new Error("Không nhận được token từ Google");

    const res = await api.post("/auth/google", { credential: token });
    const issuedToken = res.data?.accessToken;
    const backendUser = res.data?.user;
    if (!issuedToken || !backendUser) {
      throw new Error("Backend không trả về accessToken/user.");
    }

    localStorage.setItem("traffic-google-id-token", token);
    persistAuth(issuedToken, backendUser, "google");
    try {
      window.dispatchEvent(new Event("auth:login"));
    } catch {}
  };

  const logout = async () => {
    try {
      await api.post("/auth/logout");
    } catch {
      // ignore
    } finally {
      clearAuth(true);
    }
  };

  const verifyEmail = async (email, code, token) => {
    const payload = { email };
    if (code) payload.code = code;
    if (token) payload.token = token;

    const res = await api.post("/auth/verify-email", payload);
    const issuedToken = res.data?.accessToken;
    const backendUser = res.data?.user;
    if (issuedToken || backendUser) {
      persistAuth(issuedToken, backendUser, backendUser?.provider);
      try {
        window.dispatchEvent(new Event("auth:login"));
      } catch {}
    }
    return true;
  };

  const setTokens = (token) => {
    if (!token) return;
    setAccessToken(token);
    localStorage.setItem("traffic-access-token", token);
    connectTrafficSocket();
  };

  const setTokensAndFetchUser = async (token) => {
    setTokens(token);
    const res = await api.get("/auth/me");
    persistAuth(token, res.data, res.data?.provider);
  };

  const setTokensAndSetUser = async (token, backendUser) => {
    setTokens(token);
    if (backendUser) {
      const normalizedUser = normalizeBackendUser(
        backendUser,
        backendUser?.provider
      );
      setUser(normalizedUser);
      localStorage.setItem("traffic-user", JSON.stringify(normalizedUser));
    }
  };

  const resendVerification = async (email) => {
    try {
      // Giả định endpoint backend là /auth/resend-verification
      // Nếu backend của bạn là endpoint khác (VD: /auth/resend-code), hãy sửa lại đường dẫn này
      await api.post("/auth/resend-verification", { email });
      return true;
    } catch (error) {
      // Ném lỗi ra để component VerifyEmail tự xử lý (hiện thông báo)
      throw error;
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        accessToken,
        loading,
        isAuthenticated: !!accessToken,
        register,
        login,
        googleLogin,
        verifyEmail,
        resendVerification,
        logout,
        setTokens,
        setTokensAndFetchUser,
        setTokensAndSetUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
