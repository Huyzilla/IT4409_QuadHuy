import React, { createContext, useContext, useState, useEffect } from "react";
import axios from "axios";

const AuthContext = createContext();

// Kiểm tra kỹ Backend đang chạy Port 3000 hay 3001
// Nếu Backend chạy port 3001 thì sửa số 3000 bên dưới thành 3001
const API_URL = "http://localhost:3000/api";

axios.defaults.baseURL = API_URL;
axios.defaults.withCredentials = true; // Bắt buộc để dùng Cookie

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // --- 1. Tự động kiểm tra đăng nhập ---
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const res = await axios.get("/auth/me");
        setUser(res.data);
      } catch (error) {
        setUser(null);
      } finally {
        setLoading(false);
      }
    };
    checkAuth();
  }, []);

  // --- 2. Hàm Đăng Ký---
  const register = async (fullName, username, email, password) => {
    try {
      // Gửi đúng 4 tham số lên Backend
      await axios.post("/auth/register", {
        fullName,
        username,
        email, // Email thực tế người dùng nhập
        password,
      });

      return true;
    } catch (error) {
      console.error("Lỗi đăng ký:", error);
      const msg = error.response?.data?.message;
      throw new Error(Array.isArray(msg) ? msg[0] : msg || "Đăng ký thất bại");
    }
  };

  // --- 3. Hàm Đăng Nhập ---
  const login = async (username, password) => {
    try {
      const res = await axios.post("/auth/login", {
        username,
        password,
      });
      const userData = res.data.user || res.data;
      setUser(userData);
      return true;
    } catch (error) {
      console.error("Lỗi đăng nhập:", error);
      throw new Error(
        error.response?.data?.message || "Sai tài khoản hoặc mật khẩu"
      );
    }
  };

  // --- 4. Hàm Đăng Nhập Google ---
  const googleLogin = async (credentialResponse) => {
    try {
      const token = credentialResponse.credential;
      if (!token) throw new Error("Không nhận được token từ Google");

      const res = await axios.post("/auth/google", {
        credential: token,
      });

      const userData = res.data.user || res.data;
      setUser(userData);
    } catch (error) {
      console.error("Lỗi Google Login:", error);
      throw new Error(
        error.response?.data?.message || "Đăng nhập Google thất bại"
      );
    }
  };

  // --- 5. Hàm Đăng Xuất ---
  const logout = async () => {
    try {
      await axios.post("/auth/logout");
    } catch (error) {
      console.warn("Lỗi logout server:", error);
    } finally {
      setUser(null);
      delete axios.defaults.headers.common["Authorization"];
      window.location.href = "/login";
    }
  };

  // --- 6. Cập nhật Profile ---
  const updateUserProfile = async (data) => {
    try {
      const res = await axios.put("/users/profile", data);
      setUser(res.data);
      return res.data;
    } catch (error) {
      throw error;
    }
  };
  // --- 7. Hàm Xác thực Email (OTP hoặc Token) ---
  const verifyEmail = async (email, code, token) => {
    try {
      // Chuẩn bị dữ liệu gửi lên
      const payload = { email };
      if (code) payload.code = code;
      if (token) payload.token = token;

      // Gọi API
      const res = await axios.post("/auth/verify-email", payload);

      // Backend trả về user + token luôn -> Đăng nhập thành công ngay lập tức!
      const userData = res.data.user || res.data;
      setUser(userData);

      return true;
    } catch (error) {
      console.error("Xác thực lỗi:", error);
      throw new Error(
        error.response?.data?.message ||
          "Mã xác thực không đúng hoặc đã hết hạn."
      );
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        register,
        googleLogin,
        logout,
        updateUserProfile,
        isAuthenticated: !!user,
        verifyEmail,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
