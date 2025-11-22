import React, { useState, useEffect } from "react";
import Sidebar from "./components/Sidebar";
import Dashboard from "./components/Dashboard";
import CameraGridWithModal from "./components/CameraGridWithModal";
import { useTraffic } from "./context/TrafficContext";
import { useAuth } from "./context/AuthContext";

export default function MainApp() {
    const { user, logout } = useAuth();
    const {
        intersections,
        activeIntersection,
        handleIntersectionSelect,
        toggleTheme,
        refreshActiveDashboard,
        loading: trafficLoading,
    } = useTraffic();

    const [liveCamera, setLiveCamera] = useState(null);

    const openLiveView = (camera) => {
        if (!camera || !camera.id) return;
        setLiveCamera(camera);
    };

    const closeLiveView = () => {
        setLiveCamera(null);
    };

    useEffect(() => {
        const handleEsc = (e) => {
            if (e.key === "Escape" && liveCamera) closeLiveView();
        };
        window.addEventListener("keydown", handleEsc);
        return () => window.removeEventListener("keydown", handleEsc);
    }, [liveCamera]);

    // Khóa scroll khi mở modal
    useEffect(() => {
        if (liveCamera) {
            document.body.style.overflow = "hidden";
            return () => {
                document.body.style.overflow = "";
            };
        }
    }, [liveCamera]);

    if (trafficLoading) {
        return (
            <div className="app-loading">
                <div>Đang tải dữ liệu giao thông...</div>
            </div>
        );
    }

    return (
        <>
            <div className="app-layout">
                <Sidebar
                    currentUser={user}
                    onLogout={logout}
                    onThemeToggle={toggleTheme}
                />

                <Dashboard
                    activeIntersection={activeIntersection}
                    onReload={refreshActiveDashboard}
                    onLiveView={openLiveView}
                />
            </div>

            {liveCamera && (
                <div className="live-modal-overlay" onClick={closeLiveView}>
                    <div className="live-modal-content" onClick={(e) => e.stopPropagation()}>
                        <div className="live-modal-header">
                            <div className="live-modal-title">
                                {liveCamera.name || liveCamera.id}
                            </div>
                            <button onClick={closeLiveView} className="btn-close-modal">
                                ×
                            </button>
                        </div>

                        <video
                            src={liveCamera.streamUrl}
                            poster={liveCamera.thumbnail}
                            controls
                            autoPlay
                            playsInline
                            muted={false}
                            className="live-modal-video"
                        />
                    </div>
                </div>
            )}
        </>
    );
}