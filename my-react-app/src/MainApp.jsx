// File: MainApp.jsx

import React, { useState, useEffect } from "react";
import { Routes, Route } from "react-router-dom";
import { useTraffic } from "./context/TrafficContext";
import { useAuth } from "./context/AuthContext";
import Sidebar from "./components/Sidebar";
import Dashboard from "./components/Dashboard";
import AccountSettings from "./pages/AccountSettings.jsx";

const LogoutConfirmationModal = ({ onConfirm, onCancel }) => (
    <div
        className="live-modal-overlay"
        role="dialog"
        aria-modal="true"
        aria-label="Xác nhận Đăng xuất"
        onClick={onCancel}
    >
        <div
            className="live-modal-content"
            onClick={(e) => e.stopPropagation()}
            style={{
                maxWidth: '420px',
                padding: '30px',
                background: 'var(--color-bg-secondary)'
            }}
        >
            <h3 style={{
                marginBottom: '15px',
                fontSize: '22px',
                fontWeight: '700',
                color: 'var(--color-traffic-heavy)'
            }}>
                Xác nhận Đăng xuất
            </h3>

            <p style={{
                marginBottom: '30px',
                color: 'var(--color-text-secondary)',
                fontSize: '16px'
            }}>
                Bạn có chắc chắn muốn đăng xuất khỏi hệ thống Traffic Monitor không?
            </p>

            <div className="modal-actions" style={{ display: 'flex', justifyContent: 'flex-end', gap: '15px' }}>
                <button
                    onClick={onCancel}
                    className="action-btn"
                    style={{
                        background: 'var(--color-bg-tertiary)',
                        color: 'var(--color-text-primary)',
                        padding: '10px 20px',
                        borderRadius: 'var(--radius-md)'
                    }}
                >
                    Hủy bỏ
                </button>
                <button
                    onClick={onConfirm}
                    className="action-btn primary"
                    style={{
                        background: 'var(--color-traffic-heavy)',
                        borderColor: 'var(--color-traffic-heavy)',
                        padding: '10px 20px',
                        borderRadius: 'var(--radius-md)'
                    }}
                >
                    Đăng xuất
                </button>
            </div>
        </div>
    </div>
);


export default function MainApp() {
    const { user, logout } = useAuth();
    const {
        activeIntersection,
        toggleTheme,
        theme,
        refreshActiveDashboard,
        loading: trafficLoading,
    } = useTraffic();

    const [liveCamera, setLiveCamera] = useState(null);
    const [showLogoutModal, setShowLogoutModal] = useState(false);
    const [showUserDropdown, setShowUserDropdown] = useState(false);

    const openLiveView = (camera) => {
        if (!camera || !camera.id) return;
        console.log("Mở camera:", camera);
        setLiveCamera(camera);
    };

    const closeLiveView = () => {
        setLiveCamera(null);
    };

    useEffect(() => {
        document.body.className = theme;
    }, [theme]);

    useEffect(() => {
        const handleEsc = (e) => {
            if (e.key === "Escape" && liveCamera) closeLiveView();
        };
        window.addEventListener("keydown", handleEsc);
        return () => window.removeEventListener("keydown", handleEsc);
    }, [liveCamera]);

    useEffect(() => {
        if (liveCamera || showLogoutModal) {
            document.body.style.overflow = "hidden";
            return () => {
                document.body.style.overflow = "";
            };
        }

        const closeDropdown = (e) => {
            const sidebar = document.querySelector('.sidebar');
            if (showUserDropdown && sidebar && !sidebar.contains(e.target)) {
                setShowUserDropdown(false);
            }
        };
        window.addEventListener('mousedown', closeDropdown);
        return () => window.removeEventListener('mousedown', closeDropdown);

    }, [liveCamera, showLogoutModal, showUserDropdown]);

    const handleLogoutConfirm = () => {
        logout();
        setShowLogoutModal(false);
        setShowUserDropdown(false);
    }

    const handleToggleDropdown = (forceState) => {
        if (typeof forceState === 'boolean') {
            setShowUserDropdown(forceState);
        } else {
            setShowUserDropdown(prev => !prev);
        }
    }


    if (trafficLoading) {
        return (
            <div className="app-loading">
                <div>Đang tải dữ liệu ngã tư...</div>
            </div>
        );
    }

    return (
        <>
            <div className="app-layout">
                <Sidebar
                    currentUser={user}
                    onToggleDropdown={handleToggleDropdown}
                    isDropdownOpen={showUserDropdown}
                    onLogoutRequest={() => setShowLogoutModal(true)} // Gọi modal xác nhận
                    onThemeToggle={toggleTheme}
                />

                <div className="main-content">
                    <Routes>
                        <Route
                            path="/dashboard"
                            element={
                                <Dashboard
                                    activeIntersection={activeIntersection}
                                    onReload={refreshActiveDashboard}
                                    onLiveView={openLiveView}
                                />
                            }
                        />
                        <Route path="/account" element={<AccountSettings />} />

                        <Route
                            path="/*"
                            element={
                                <Dashboard
                                    activeIntersection={activeIntersection}
                                    onReload={refreshActiveDashboard}
                                    onLiveView={openLiveView}
                                />
                            }
                        />
                    </Routes>
                </div>

            </div>

            {showLogoutModal && (
                <LogoutConfirmationModal
                    onConfirm={handleLogoutConfirm}
                    onCancel={() => setShowLogoutModal(false)}
                />
            )}

            {/* MODAL XEM CHI TIẾT CAMERA */}
            {liveCamera && (
                <div
                    className="live-modal-overlay"
                    role="dialog"
                    aria-modal="true"
                    aria-label={`Live View: ${liveCamera.name || liveCamera.id}`}
                    onClick={closeLiveView}
                >
                    <div
                        className="live-modal-content"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="live-modal-header">
                            <div className="live-modal-title">
                                {liveCamera.name || liveCamera.id}
                            </div>
                            <button onClick={closeLiveView} className="btn-close-modal">
                                ×
                            </button>
                        </div>

                        <video
                            src={liveCamera.videoSource}
                            poster={liveCamera.thumbnail || ""}
                            controls
                            autoPlay
                            playsInline
                            muted={false}
                            className="live-modal-video"
                            onError={(e) => {
                                e.target.innerHTML = `
                                  <div style="padding:40px; text-align:center; color:#fca5a5; background:rgba(0,0,0,0.5); height:100%; display:flex; align-items:center; justify-content:center; flex-direction:column;">
                                    <div style="font-size:18px; margin-bottom:8px;">Không thể phát video</div>
                                    <div style="font-size:12px; opacity:0.8;">URL: ${
                                    liveCamera.videoSource || "Không có"
                                }</div>
                                  </div>
                                `;
                            }}
                        />
                    </div>
                </div>
            )}
        </>
    );
}