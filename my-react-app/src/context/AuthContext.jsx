import React, { createContext, useContext, useState, useEffect } from "react";
import axios from "axios";

const AuthContext = createContext();

// 1. Cấu hình Axios: Port 3001 và luôn gửi kèm Cookie
const API_URL = "http://localhost:3000/api";
axios.defaults.baseURL = API_URL;
axios.defaults.withCredentials = true; // 👈 BẮT BUỘC để nhận/gửi Cookie HttpOnly

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // --- 1. Tự động kiểm tra đăng nhập (F5 trang) ---
  useEffect(() => {
    const checkAuth = async () => {
      try {
        // Gọi API /auth/me. Nếu cookie còn hạn, server sẽ trả về info user
        const res = await axios.get("/auth/me");
        setUser(res.data);
      } catch (error) {
        // Lỗi 401: Chưa đăng nhập hoặc hết hạn -> Không làm gì cả, user = null
        setUser(null);
      } finally {
        setLoading(false);
      }
    };
    checkAuth();
  }, []);

  // --- 2. Hàm Đăng Ký ---
  const register = async (fullName, username, password) => {
    try {
      // ⚠️ LƯU Ý QUAN TRỌNG:
      // File register.dto.ts yêu cầu trường "email".
      // Vì form đăng ký hiện tại của bạn chưa có ô nhập email,
      // tôi sẽ tạm thời tự sinh email để không bị lỗi API.
      // Về sau bạn nên thêm ô input type="email" vào Login.jsx
      const fakeEmail = `${username.toLowerCase()}@traffic-system.local`;

      await axios.post("/auth/register", {
        fullName,
        username,
        email: fakeEmail, // Gửi email lên cho đúng chuẩn DTO

        password,
      });

      return true;
    } catch (error) {
      console.error("Lỗi đăng ký:", error);
      const msg = error.response?.data?.message;
      // Xử lý thông báo lỗi mảng (NestJS class-validator thường trả về mảng)
      throw new Error(Array.isArray(msg) ? msg[0] : msg || "Đăng ký thất bại");
    }
  };

  // --- 3. Hàm Đăng Nhập (Thường) ---
  const login = async (username, password) => {
    try {
      // Gửi user/pass lên. Server check đúng sẽ Set-Cookie (HttpOnly)
      const res = await axios.post("/auth/login", {
        username,
        password,
      });

      // Lấy thông tin user từ response (Backend trả về { user: ... })
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
      // Lấy ID Token mà Google trả về cho Frontend
      const token = credentialResponse.credential;

      if (!token) throw new Error("Không nhận được token từ Google");

      // Gửi token này lên Backend để verify
      // Endpoint này phải khớp với file auth.controller.ts (dùng GoogleAuthDto)
      const res = await axios.post("/auth/google", {
        credential: token,
      });

      // Đăng nhập thành công, server đã set cookie
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
      // Gọi API để Server xóa Cookie
      await axios.post("/auth/logout");
    } catch (error) {
      console.warn("Lỗi logout server:", error);
    } finally {
      setUser(null);
      // Xóa header (dù cookie tự xóa nhưng reset cho sạch)
      delete axios.defaults.headers.common["Authorization"];
      // Reload nhẹ để reset state ứng dụng
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

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        register,
        googleLogin, //Đã export hàm này
        logout,
        updateUserProfile,
        isAuthenticated: !!user,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
