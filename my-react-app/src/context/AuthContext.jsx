import initialUsers from "../data/users.json";
import React, { createContext, useContext, useState, useEffect } from "react";

const AuthContext = createContext();

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) throw new Error("useAuth must be used within AuthProvider");
    return context;
};

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [users, setUsers] = useState([]);

    const DB_KEY = "traffic-users-db";

    useEffect(() => {
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

        setLoading(false);
    }, []);

    const register = async (fullName, username, password) => {
        await new Promise((r) => setTimeout(r, 800));

        const exists = users.some((u) => u.username === username);
        if (exists) {
            throw new Error("Tên đăng nhập đã tồn tại!");
        }

        const newUser = {
            id: "usr_" + Date.now(),
            username,
            password,
            fullName,
            role: username === "20225336" ? "admin" : "user",
        };

        const updatedUsers = [...users, newUser];
        setUsers(updatedUsers);
        localStorage.setItem(DB_KEY, JSON.stringify(updatedUsers));

        alert("Đăng ký thành công! Bây giờ bạn có thể đăng nhập.");
    };

    const login = async (username, password) => {
        await new Promise((r) => setTimeout(r, 600));

        const foundUser = users.find(
            (u) => u.username === username && u.password === password
        );
        if (!foundUser) {
            throw new Error("Sai tên đăng nhập hoặc mật khẩu!");
        }

        const { password: _, ...userWithoutPassword } = foundUser;
        setUser(userWithoutPassword);
        localStorage.setItem("traffic-user", JSON.stringify(userWithoutPassword));
    };

    // HÀM ĐĂNG NHẬP GOOGLE(GIẢ LẬP)
    const googleLogin = async (googleIdToken) => {
        await new Promise((r) => setTimeout(r, 1000));

        // Dữ liệu người dùng giả định từ Google
        const mockUser = {
            id: "google_" + Date.now(),
            username: "google_user_" + Date.now(),
            fullName: "Tài khoản Google",
            role: "user",
        };

        setUser(mockUser);
        localStorage.setItem("traffic-user", JSON.stringify(mockUser));
    };

    const logout = () => {
        setUser(null);
        localStorage.removeItem("traffic-user");
    };

    return (
        <AuthContext.Provider
            value={{
                user,
                users,
                login,
                register,
                logout,
                googleLogin,
                loading,
                isAuthenticated: !!user,
            }}
        >
            {children}
        </AuthContext.Provider>
    );
};