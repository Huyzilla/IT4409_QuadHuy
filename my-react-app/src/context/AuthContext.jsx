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
  return {
    id: backendUser.id,
    username: backendUser.username,
    fullName: backendUser.fullName,
    role: backendUser.role || "user",
    avatarUrl: backendUser.avatar || backendUser.avatarUrl || null,
    email: backendUser.email,
    provider: backendUser.provider || providerFallback || "local",
  };
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [accessToken, setAccessToken] = useState(null);
  const [loading, setLoading] = useState(true);

  const persistAuth = (token, backendUser, providerFallback) => {
    if (token) {
      setAccessToken(token);
      localStorage.setItem("traffic-access-token", token);
      connectTrafficSocket();
    }

    const normalized = normalizeBackendUser(backendUser, providerFallback);
    if (normalized) {
      setUser(normalized);
      localStorage.setItem("traffic-user", JSON.stringify(normalized));
    }
  };

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

  useEffect(() => {
    setOnUnauthorized(() => clearAuth(true));

    const savedUser = localStorage.getItem("traffic-user");
    if (savedUser) {
      try {
        setUser(JSON.parse(savedUser));
      } catch {
        localStorage.removeItem("traffic-user");
      }
    }

    const savedToken = localStorage.getItem("traffic-access-token");
    if (savedToken) {
      setAccessToken(savedToken);
      connectTrafficSocket();
    }

    setLoading(false);
  }, []);

  const register = async (fullName, username, email, password) => {
    try {
      const res = await api.post(`/auth/register`, {
        fullName,
        username,
        email,
        password,
      });

      const { accessToken: issuedToken, user: backendUser } = res.data || {};
      if (issuedToken || backendUser) {
        persistAuth(issuedToken, backendUser, "local");
        try {
          window.dispatchEvent(new Event("auth:login"));
        } catch {
          // ignore
        }
      }

      return res.data;
    } catch (error) {
      const msg = error?.response?.data?.message;
      throw new Error(Array.isArray(msg) ? msg[0] : msg || "Đăng ký thất bại");
    }
  };

  const login = async (usernameOrEmail, password) => {
    try {
      const res = await api.post(`/auth/login`, {
        username: usernameOrEmail,
        password,
      });

      const { accessToken: issuedToken, user: backendUser } = res.data || {};
      if (!issuedToken) {
        throw new Error("Backend không trả về accessToken.");
      }

      persistAuth(issuedToken, backendUser, backendUser?.provider || "local");
      try {
        window.dispatchEvent(new Event("auth:login"));
      } catch {
        // ignore
      }

      return res.data;
    } catch (error) {
      const msg = error?.response?.data?.message;
      throw new Error(Array.isArray(msg) ? msg[0] : msg || "Sai tài khoản hoặc mật khẩu");
    }
  };

  // Supports both:
  // - googleLogin(googleIdTokenString)
  // - googleLogin({ credential: googleIdTokenString })
  const googleLogin = async (credentialOrToken) => {
    const token =
      typeof credentialOrToken === "string"
        ? credentialOrToken
        : credentialOrToken?.credential;
    if (!token) throw new Error("Không nhận được token từ Google");

    const res = await api.post(`/auth/google`, { credential: token });
    const { accessToken: issuedToken, user: backendUser } = res.data || {};
    if (!issuedToken) {
      throw new Error("Backend không trả về accessToken.");
    }

    localStorage.setItem("traffic-google-id-token", token);
    persistAuth(issuedToken, backendUser, "google");
    try {
      window.dispatchEvent(new Event("auth:login"));
    } catch {
      // ignore
    }
  };

  const verifyEmail = async (email, code, token) => {
    const payload = { email };
    if (code) payload.code = code;
    if (token) payload.token = token;

    const res = await api.post("/auth/verify-email", payload);
    const { accessToken: issuedToken, user: backendUser } = res.data || {};

    // Some backends may return user without wrapping; handle both.
    persistAuth(issuedToken, backendUser || res.data?.user, backendUser?.provider);
    try {
      window.dispatchEvent(new Event("auth:login"));
    } catch {
      // ignore
    }

    return true;
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

  // OAuth redirect helpers
  const setTokens = (token) => {
    persistAuth(token, null);
  };

  const setTokensAndFetchUser = async (token) => {
    setTokens(token);
    try {
      const res = await api.get("/auth/me");
      persistAuth(token, res.data, res.data?.provider);
    } catch {
      // If fetching user fails, clear auth but don't hard redirect here.
      clearAuth(false);
    }
  };

  const setTokensAndSetUser = async (token, backendUser) => {
    persistAuth(token, backendUser, backendUser?.provider);
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
