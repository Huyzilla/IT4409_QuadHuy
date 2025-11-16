import React, { useState, useEffect, useRef } from "react";
import Sidebar from "./components/Sidebar";
import Dashboard from "./components/Dashboard";
import { useTraffic } from "./context/TrafficContext";

const App = () => {
    const {
        intersections,
        activeIntersection,
        handleIntersectionSelect,
        toggleTheme,
        refreshActiveDashboard,
        loading,
    } = useTraffic();

    const [liveCamera, setLiveCamera] = useState(null);

    const openLiveView = (camera) => {
        if (!camera || !camera.id) return;
        setLiveCamera(camera);
        console.log(`Mở luồng chi tiết cho camera: ${camera.name || camera.id}`);
    };

    const closeLiveView = () => {
        if (liveCamera?.mediaStream && liveCamera.stopOnClose) {
            try {
                liveCamera.mediaStream.getTracks().forEach((track) => track.stop());
            } catch (e) {
                console.warn("Lỗi khi dừng media stream:", e);
            }
        }
        setLiveCamera(null);
    };

    useEffect(() => {
        const handleEsc = (e) => {
            if (e.key === "Escape") {
                closeLiveView();
            }
        };
        window.addEventListener("keydown", handleEsc);
        return () => window.removeEventListener("keydown", handleEsc);
    }, [liveCamera]);

    useEffect(() => {
        if (liveCamera) {
            const prevOverflow = document.body.style.overflow;
            document.body.style.overflow = "hidden";
            return () => {
                document.body.style.overflow = prevOverflow;
            };
        }
    }, [liveCamera]);

    if (loading) {
        return (
            <div
                style={{
                    display: "flex",
                    justifyContent: "center",
                    alignItems: "center",
                    height: "100vh",
                    background: "var(--color-bg-primary)",
                    color: "var(--color-text-primary)",
                    fontSize: "18px",
                }}
            >
                Đang tải dữ liệu...
            </div>
        );
    }

    return (
        <div className="app">
            <Sidebar
                intersections={intersections}
                activeId={activeIntersection?.id}
                onSelect={handleIntersectionSelect}
                onThemeToggle={toggleTheme}
            />
            <Dashboard
                activeIntersection={activeIntersection}
                onReload={refreshActiveDashboard}
                onLiveView={openLiveView}
            />
            <LiveModal camera={liveCamera} onClose={closeLiveView} />
        </div>
    );
};

// === LiveModal Component ===
function LiveModal({ camera, onClose }) {
    const videoRef = useRef(null);

    useEffect(() => {
        const videoEl = videoRef.current;
        if (!videoEl) return;

        if (!camera) {
            videoEl.srcObject = null;
            videoEl.src = "";
            return;
        }

        if (camera.mediaStream) {
            videoEl.srcObject = camera.mediaStream;
            videoEl.play().catch(() => {});
        } else if (camera.streamUrl) {
            videoEl.srcObject = null;
            videoEl.src = camera.streamUrl;
            videoEl.play().catch(() => {});
        } else {
            videoEl.srcObject = null;
            videoEl.src = "";
        }
    }, [camera]);

    if (!camera) return null;

    return (
        <div
            className="ch-modal-overlay"
            role="dialog"
            aria-modal="true"
            aria-label={`Chi tiết ${camera.name || camera.id}`}
            onClick={onClose}
            style={{
                position: "fixed",
                inset: 0,
                background: "rgba(0, 0, 0, 0.85)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                zIndex: 2000,
                padding: "1rem",
            }}
        >
            <div
                className="ch-modal"
                onClick={(e) => e.stopPropagation()}
                style={{
                    width: "100%",
                    maxWidth: 1200,
                    maxHeight: "92vh",
                    background: "#0b1220",
                    borderRadius: 12,
                    overflow: "hidden",
                    display: "flex",
                    flexDirection: "column",
                    boxShadow: "0 20px 40px rgba(0, 0, 0, 0.5)",
                }}
            >
                {/* Header */}
                <div
                    style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        padding: "16px 20px",
                        background: "#111827",
                        color: "#fff",
                        borderBottom: "1px solid #374151",
                    }}
                >
                    <h3 style={{ margin: 0, fontSize: "1.25rem", fontWeight: 600 }}>
                        {camera.name || camera.id}
                    </h3>
                    <button
                        onClick={onClose}
                        aria-label="Đóng"
                        style={{
                            background: "none",
                            border: "none",
                            color: "#e5e7eb",
                            fontSize: "1.5rem",
                            cursor: "pointer",
                            padding: "4px",
                            borderRadius: "6px",
                            transition: "background 0.2s",
                        }}
                        onMouseEnter={(e) => (e.target.style.background = "#374151")}
                        onMouseLeave={(e) => (e.target.style.background = "none")}
                    >
                        ×
                    </button>
                </div>

                {/* Video Body */}
                <div
                    style={{
                        flex: 1,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        padding: 16,
                        background: "#000",
                    }}
                >
                    <video
                        ref={videoRef}
                        className="ch-modal-video"
                        controls
                        autoPlay
                        playsInline
                        muted={false}
                        poster={camera.thumbnail || undefined}
                        style={{
                            width: "100%",
                            height: "100%",
                            maxHeight: "calc(92vh - 140px)",
                            objectFit: "contain",
                            borderRadius: 8,
                            background: "#000",
                        }}
                    />
                </div>

                {/* Footer */}
                <div
                    style={{
                        padding: "12px 20px",
                        background: "#111827",
                        color: "#94a3b8",
                        fontSize: "0.875rem",
                        borderTop: "1px solid #374151",
                    }}
                >
                    <small>Camera ID: {camera.id}</small>
                    {camera.offline && (
                        <span style={{ marginLeft: 12, color: "#ef4444" }}>
              (Ngoại tuyến)
            </span>
                    )}
                </div>
            </div>
        </div>
    );
}

export default App;