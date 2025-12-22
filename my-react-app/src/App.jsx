import React, { Suspense, lazy } from "react";
import { Routes, Route, Navigate, Outlet } from "react-router-dom";
import { useAuth } from "./context/AuthContext";
import Login from "./pages/Login";
import TrafficLayout from "./layouts/TrafficLayout";
import Spinner from "./components/Spinner";

const MainApp = lazy(() => import("./MainApp"));
const HistoryAnalysis = lazy(() => import("./pages/HistoryAnalysis.jsx"));
const Register = lazy(() => import("./pages/Register"));
const VerifyEmail = lazy(() => import("./pages/VerifyEmail"));
const OAuthSuccess = lazy(() => import("./pages/oauth-success.jsx"));

function ProtectedRoute() {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="app-loading">
        <div>Đang khởi tạo hệ thống...</div>
      </div>
    );
  }

  return isAuthenticated ? <Outlet /> : <Navigate to="/login" replace />;
}

export default function App() {
  return (
    <Suspense fallback={<Spinner small />}>
      <Routes>
        {/* Public routes */}
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/verify-email" element={<VerifyEmail />} />
        <Route path="/oauth-success" element={<OAuthSuccess />} />

        {/* Protected + Traffic layout nested */}
        <Route element={<ProtectedRoute />}>
          <Route element={<TrafficLayout />}>
            <Route path="/" element={<MainApp />} />
            <Route path="/dashboard" element={<MainApp />} />
            <Route path="/history" element={<HistoryAnalysis />} />
            <Route path="/*" element={<MainApp />} />
          </Route>
        </Route>

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
}
