import React, { useState, useEffect } from "react";
import { Routes, Route } from "react-router-dom";
import { useTraffic } from "./context/TrafficContext";
import { useAuth } from "./context/AuthContext";
import Sidebar from "./components/Sidebar";
import Dashboard from "./components/Dashboard";
import AccountSettings from "./pages/AccountSettings.jsx";
import CameraGridWithModal from "./components/CameraGridWithModal"; // Component lưới camera
import HlsVideo from "./components/HlsVideo.jsx";

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

const LiveCameraGridModal = ({ activeIntersection, closeModal }) => {
    if (!activeIntersection || activeIntersection.cameras.length === 0) {
        return (
            <div
                className="live-modal-overlay"
                role="dialog"
                aria-modal="true"
                onClick={closeModal}
            >
                <div className="live-modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '600px', padding: '30px' }}>
                    <div className="live-modal-header" style={{ position: 'relative', background: 'none', color: 'var(--color-text-primary)', padding: 0 }}>
                        <h3 className="live-modal-title">{activeIntersection.name}</h3>
                        <button onClick={closeModal} className="btn-close-modal" style={{ position: 'absolute', top: '-40px', right: '-40px' }}>
                            ×
                        </button>
                    </div>
                    <p style={{ marginTop: '20px', color: 'var(--color-text-secondary)' }}>
                        Ngã tư này không có camera nào được cấu hình.
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div
            className="live-modal-overlay"
            role="dialog"
            aria-modal="true"
            aria-label={`Live View: ${activeIntersection.name}`}
            onClick={closeModal}
        >
            <div
                className="live-modal-content"
                onClick={(e) => e.stopPropagation()}
                style={{
                    maxWidth: '95%',
                    maxHeight: '95vh',
                    width: '95%',
                    background: 'var(--color-bg-primary)', // Đổi màu nền cho modal lớn
                    padding: '20px',
                }}
            >
                <div className="live-modal-header" style={{ position: 'relative', background: 'none', color: 'var(--color-text-primary)', padding: '0 0 15px 0' }}>
                    <h3 className="live-modal-title">Live Grid: {activeIntersection.name}</h3>
                    <button onClick={closeModal} className="btn-close-modal" style={{ position: 'absolute', top: '-10px', right: '-10px', width: '38px', height: '38px', fontSize: '20px' }}>
                        ×
                    </button>
                </div>

                <CameraGridWithModal cameras={activeIntersection.cameras} />

            </div>
        </div>
    );
};

const SingleCameraModal = ({ liveCamera, closeModal }) => {
    if (!liveCamera || !liveCamera.videoSource) {
        return null;
    }

    return (
        <div
            className="live-modal-overlay"
            role="dialog"
            aria-modal="true"
            aria-label={`Live View: ${liveCamera.name}`}
            onClick={closeModal}
        >
            <div
                className="live-modal-content"
                onClick={(e) => e.stopPropagation()}
                style={{
                    maxWidth: '90%',
                    maxHeight: '90vh',
                    width: 'fit-content',
                    padding: '20px',
                    background: 'var(--color-bg-primary)',
                }}
            >
                <div className="live-modal-header" style={{ position: 'relative', background: 'none', color: 'var(--color-text-primary)', padding: '0 0 15px 0' }}>
                    <h3 className="live-modal-title" style={{ maxWidth: 'calc(100% - 60px)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {liveCamera.name || liveCamera.id}
                    </h3>
                    <button onClick={closeModal} className="btn-close-modal" style={{ position: 'absolute', top: '-10px', right: '-10px', width: '38px', height: '38px', fontSize: '20px' }}>
                        ×
                    </button>
                </div>

                <HlsVideo
                    src={liveCamera.videoSource}
                    poster={liveCamera.thumbnail || ""}
                    controls
                    autoPlay
                    playsInline
                    muted
                    className="live-modal-video"
                    style={{ maxHeight: '80vh', maxWidth: '100%', objectFit: 'contain' }}
                    onError={(e) => {
                        e.target.parentNode.innerHTML = `
                            <div style="padding:40px; text-align:center; color:#fca5a5; background:rgba(0,0,0,0.5); height:100%; display:flex; align-items:center; justify-content:center; flex-direction:column; min-height: 400px; width: 600px;">
                                <div style="font-size:18px; margin-bottom:8px;">Không thể phát video</div>
                                <div style="font-size:12px; opacity:0.8;">URL: ${liveCamera.videoSource || "Không có"}</div>
                            </div>
                         `;
                    }}
                />
            </div>
        </div>
    );
};


export default function MainApp() {
    const { user, logout } = useAuth();
    const {
        activeIntersection,
        toggleTheme,
        theme,
        refreshActiveDashboard,
        loading: trafficLoading,
    } = useTraffic();

    const [liveIntersection, setLiveIntersection] = useState(null);
    const [liveCamera, setLiveCamera] = useState(null);
    const [showLogoutModal, setShowLogoutModal] = useState(false);
    const [showUserDropdown, setShowUserDropdown] = useState(false);

    const openLiveView = () => {
        if (!activeIntersection || activeIntersection.cameras.length === 0) return;
        setLiveIntersection(activeIntersection);
    };

    const closeLiveView = () => {
        setLiveIntersection(null);
    };

    const openSingleLiveView = (camera) => {
        setLiveCamera(camera);
    };

    const closeSingleLiveView = () => {
        setLiveCamera(null);
    };

    useEffect(() => {
        document.body.className = theme;
    }, [theme]);

    useEffect(() => {
        const handleEsc = (e) => {
            if (e.key === "Escape") {
                if (liveIntersection) closeLiveGrid();
                if (liveCamera) closeSingleLiveView(); // Thêm logic cho camera đơn
            }
        };
        window.addEventListener("keydown", handleEsc);
        return () => window.removeEventListener("keydown", handleEsc);
    }, [liveIntersection, liveCamera]); // Thêm liveCamera vào dependency

    useEffect(() => {
        if (liveIntersection || liveCamera || showLogoutModal) {
            document.body.style.overflow = "hidden";
            return () => {
                document.body.style.overflow = "";
            };
        }

        const closeDropdown = (e) => {
            const sidebar = document.querySelector('.sidebar');
            const alertButton = document.querySelector('.alert-btn');
            const alertPanel = document.querySelector('.alert-dropdown-menu');
            if (showUserDropdown && sidebar && !sidebar.contains(e.target)) {
                setShowUserDropdown(false);
            }
        };
        window.addEventListener('mousedown', closeDropdown);
        return () => window.removeEventListener('mousedown', closeDropdown);

    }, [liveIntersection, liveCamera, showLogoutModal, showUserDropdown]);

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
                    onLogoutRequest={() => setShowLogoutModal(true)}
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
                                    onLiveGrid={openLiveView}
                                    onLiveView={openSingleLiveView}
                                />
                            }
                        />

                        <Route
                            path="/*"
                            element={
                                <Dashboard
                                    activeIntersection={activeIntersection}
                                    onReload={refreshActiveDashboard}
                                    onLiveGrid={openLiveView}
                                    onLiveView={openSingleLiveView}
                                />
                            }
                        />

                        <Route
                            path="/account"
                            element={<AccountSettings />}
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

            {/* MODAL LƯỚI CAMERA TRỰC TIẾP */}
            {liveIntersection && (
                <LiveCameraGridModal
                    activeIntersection={liveIntersection}
                    closeModal={closeLiveView}
                />
            )}

            {/* MODAL CAMERA ĐƠN*/}
            {liveCamera && (
                <SingleCameraModal
                    liveCamera={liveCamera}
                    closeModal={closeSingleLiveView}
                />
            )}
        </>
    );
}