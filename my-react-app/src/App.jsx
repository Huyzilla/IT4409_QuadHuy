import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "./context/AuthContext";
import Login from "./pages/Login";
import MainApp from "./MainApp";
import HistoryAnalysis from "./pages/HistoryAnalysis.jsx";

function ProtectedRoute({ children }) {
    const { isAuthenticated, loading } = useAuth();

    if (loading) {
        return (
            <div className="app-loading">
                <div>Đang khởi tạo hệ thống...</div>
            </div>
        );
    }

    return isAuthenticated ? children : <Navigate to="/login" replace />;
}

export default function App() {
    return (
        <Routes>
            <Route path="/login" element={<Login />} />

            <Route
                path="/*"
                element={
                    <ProtectedRoute>
                        <MainApp />
                    </ProtectedRoute>
                }
            />

            <Route path="/" element={<Navigate to="/dashboard" replace />} />

            <Route path="/history" element={<HistoryAnalysis />} />
        </Routes>
    );
}