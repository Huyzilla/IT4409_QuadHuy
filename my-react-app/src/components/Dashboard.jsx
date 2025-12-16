import React, {useEffect, useRef, useState} from "react";
import { useTraffic } from "../context/TrafficContext";
import AlertPanel from "./AlertPanel.jsx";

const STATUS_MAP = {
    low: {
        label: "Ít đông",
        colorClass: "low-traffic",
        gradientClass: "low-gradient",
        densityMax: 0.3,
    },
    medium: {
        label: "Trung bình",
        colorClass: "medium-traffic",
        gradientClass: "medium-gradient",
        densityMax: 0.6,
    },
    heavy: {
        label: "Ùn tắc",
        colorClass: "heavy-traffic",
        gradientClass: "heavy-gradient",
        densityMax: 1.0,
    },
    "no-connection": {
        label: "Mất kết nối",
        colorClass: "no-connection",
        gradientClass: "",
        densityMax: 0,
    },
};

const generateFakeStats = (camId) => {
    const density = Math.random();
    let status = "low";
    if (density > 0.6) status = "heavy";
    else if (density > 0.3) status = "medium";

    const trends = ["up", "down", "stable"];
    const trend = trends[Math.floor(Math.random() * trends.length)];
    let trendText = "Xu hướng: Ổn định (60 phút)";
    if (trend === "up") trendText = "Xu hướng: Tăng (60 phút)";
    if (trend === "down") trendText = "Xu hướng: Giảm (60 phút)";

    return { density, status, trend, trendText };
};

const CameraSettingsModal = ({ camera, onClose, onSave }) => {
    // Giá trị giả lập ban đầu cho ngưỡng (dựa trên tên camera)
    const initialThreshold = camera.id === 'A1' ? 0.75 : camera.id === 'A2' ? 0.85 : 0.7;
    const initialAIEnabled = camera.id === 'A1' ? true : false;

    const [threshold, setThreshold] = useState(initialThreshold);
    const [aiEnabled, setAiEnabled] = useState(initialAIEnabled);
    const [loading, setLoading] = useState(false);

    const handleSave = () => {
        setLoading(true);
        setTimeout(() => {
            onSave(camera.id, { threshold, aiEnabled });
            setLoading(false);
        }, 800);
    };

    return (
        <div
            className="settings-modal-overlay"
            role="dialog"
            aria-modal="true"
            aria-label={`Cấu hình ${camera.name}`}
            onClick={onClose}
        >
            <div
                className="settings-modal-content"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="settings-modal-header">
                    <h2>Cấu hình AI & Ngưỡng</h2>
                    <button className="btn-close-modal-mini" onClick={onClose}>
                        ×
                    </button>
                </div>
                <p className="settings-camera-name">{camera.name}</p>

                <div className="settings-form">
                    <div className="form-group">
                        <label>Ngưỡng ùn tắc (Density)</label>
                        <input
                            type="number"
                            step="0.05"
                            min="0.5"
                            max="1.0"
                            value={threshold}
                            onChange={(e) => setThreshold(parseFloat(e.target.value))}
                            disabled={loading}
                        />
                        <small>Giá trị hiện tại: {threshold.toFixed(2)}. Mật độ vượt quá ngưỡng sẽ kích hoạt cảnh báo *Ùn tắc*.</small>
                    </div>

                    <div className="form-group checkbox-group">
                        <label className="checkbox-label">
                            <input
                                type="checkbox"
                                checked={aiEnabled}
                                onChange={(e) => setAiEnabled(e.target.checked)}
                                disabled={loading}
                            />
                            Kích hoạt Đếm phương tiện (AI Model)
                        </label>
                        <small>Kích hoạt mô hình học sâu để đếm và phân loại phương tiện.</small>
                    </div>
                </div>

                <div className="settings-modal-footer">
                    <button className="action-btn" onClick={onClose} disabled={loading}>
                        Hủy
                    </button>
                    <button className="action-btn primary" onClick={handleSave} disabled={loading}>
                        {loading ? 'Đang lưu...' : 'Lưu Cấu hình'}
                    </button>
                </div>
            </div>
        </div>
    );
};

const DashboardSegmentCard = ({ camera, onLiveView, onSettings }) => {
    const { density, status, trend, trendText } = generateFakeStats(camera.id);

    const statusInfo = STATUS_MAP[status] || STATUS_MAP["no-connection"];
    const densityPercent = Math.round(density * 100);

    const handleDetailClick = () => {
        if (camera.videoSource && onLiveView) {
            onLiveView(camera);
        }
    };

    const handleSettingsClick = () => {
        if (onSettings) {
            onSettings(camera);
        }
    };


    return (
        <div
            className="segment-card"
            style={{ display: "flex", flexDirection: "column" }}
        >
            <div
                className="segment-thumb"
                style={{
                    height: 160,
                    background: "#000",
                    borderRadius: 8,
                    overflow: "hidden",
                    position: "relative",
                }}
            >
                {/*hiển thị camera*/}
                {camera.videoSource ? (
                    <video
                        src={camera.videoSource}
                        muted
                        playsInline
                        autoPlay
                        loop
                        style={{ width: "100%", height: "100%", objectFit: "cover" }}
                        onError={(e) => {
                            e.target.style.display = "none";
                            e.target.parentNode.innerHTML =
                                '<div style="display:flex;justify-content:center;align-items:center;height:100%;color:gray;font-size:12px">Mất tín hiệu</div>';
                        }}
                    />
                ) : (
                    /* ------ */
                    <div
                        style={{
                            color: "#94a3b8",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            height: "100%",
                        }}
                    >
                        Không có hình
                    </div>
                )}
            </div>

            <div
                className="card-header"
                style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    marginTop: 8,
                }}
            >
                <div
                    style={{
                        display: "flex",
                        gap: 8,
                        alignItems: "center",
                        overflow: "hidden",
                    }}
                >
                    <h2
                        style={{
                            margin: 0,
                            fontSize: 16,
                            whiteSpace: "nowrap",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                        }}
                    >
                        {camera.name}
                    </h2>
                    <span
                        className={`status-tag ${statusInfo.colorClass}`}
                        style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 6,
                            flexShrink: 0,
                        }}
                    >
            <span className="color-dot"></span> {statusInfo.label}
          </span>
                </div>

                <div style={{ display: "flex", gap: 8 }}>
                    <button
                        className="quick-action-btn"
                        aria-label="Cấu hình AI và Ngưỡng"
                        title="Cấu hình AI và Ngưỡng"
                        onClick={handleSettingsClick}
                    >
                        <span className="icon icon-settings"></span>
                    </button>
                    <button
                        className="btn-view-detail"
                        title="Xem chi tiết"
                        onClick={handleDetailClick}
                        disabled={!camera.videoSource}
                        style={{
                            padding: "6px 10px",
                            borderRadius: 6,
                            border: "none",
                            cursor: "pointer",
                            background: "#2563eb",
                            color: "#fff",
                            fontSize: 12,
                        }}
                    >
                        Xem chi tiết
                    </button>
                </div>
            </div>

            <div className="trend-chart" data-trend={trend} style={{ marginTop: 8 }}>
                <p style={{ margin: 0 }}>{trendText}</p>
            </div>

            <div
                className="progress-bar-container"
                style={{
                    marginTop: 8,
                    background: "rgba(255,255,255,0.03)",
                    height: 10,
                    borderRadius: 6,
                    overflow: "hidden",
                }}
            >
                <div
                    className={`progress-bar ${
                        status !== "low" ? "gradient-full" : statusInfo.gradientClass
                    }`}
                    style={{
                        width: `${densityPercent}%`,
                        height: "100%",
                        transition: "width 300ms ease",
                        backgroundColor:
                            status === "low" ? "var(--color-traffic-low)" : undefined,
                    }}
                />
            </div>

            <div
                style={{
                    display: "flex",
                    justifyContent: "space-between",
                    marginTop: 8,
                }}
            >
                <p className="density-label" style={{ margin: 0 }}>
                    Mật độ: {density.toFixed(2)}
                </p>
            </div>
        </div>
    );
};

const Dashboard = ({ onReload, onLiveGrid, onLiveView }) => {
    const { activeIntersection, loading, unreadAlertCount } = useTraffic();
    const [settingsCamera, setSettingsCamera] = useState(null);
    const [showAlertPanel, setShowAlertPanel] = useState(false);

    const alertRef = useRef(null);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (alertRef.current && !alertRef.current.contains(event.target)) {
                setShowAlertPanel(false);
            }
        };

        if (showAlertPanel) {
            document.addEventListener("mousedown", handleClickOutside);
        } else {
            document.removeEventListener("mousedown", handleClickOutside);
        }

        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, [showAlertPanel]);

    if (loading)
        return (
            <div style={{ padding: 30, color: "white" }}>
                ⏳ Đang tải dữ liệu hệ thống...
            </div>
        );

    const cameras = activeIntersection?.cameras || [];
    const title = activeIntersection
        ? `${activeIntersection.name} — Trạng thái hiện tại`
        : "Vui lòng chọn một Ngã tư";

    const handleOpenSettings = (camera) => {
        setSettingsCamera(camera);
    };

    const handleCloseSettings = () => {
        setSettingsCamera(null);
    };

    const handleSaveSettings = (cameraId, settings) => {
        console.log(`Đã lưu cấu hình cho Camera ${cameraId}:`, settings);
        alert(`Đã lưu cấu hình AI/Ngưỡng cho ${settingsCamera.name}`);
        handleCloseSettings();
    };

    return (
        <main className="main-content" role="main">
            <header className="main-header">
                <h1 className="page-title">{title}</h1>
                <div className="header-actions">
                    <div ref={alertRef} style={{ position: 'relative', display: 'inline-block' }}> {/* Gắn ref vào container */}
                        <button
                            className="alert-btn action-btn"
                            onClick={() => setShowAlertPanel(prev => !prev)}
                            aria-label={`Thông báo, có ${unreadAlertCount} chưa đọc`}
                        >
                            <span className="icon icon-bell"></span>
                            {unreadAlertCount > 0 && (
                                <span className="alert-badge pulse-animation">{unreadAlertCount}</span>
                            )}
                        </button>

                        {showAlertPanel && (
                            <AlertPanel onClose={() => setShowAlertPanel(false)} isDropdown={true} />
                        )}
                    </div>

                    <button className="action-btn" onClick={onReload}>
                        Tải lại
                    </button>
                    <button
                        className="action-btn primary"
                        onClick={() => activeIntersection && activeIntersection.cameras.length > 0 && onLiveGrid(activeIntersection)}
                        disabled={cameras.length === 0}
                    >
                        Trực tiếp
                    </button>
                </div>
            </header>

            <div className="traffic-filters">
        <span className="filter-item low-traffic">
          <span className="color-dot"></span> Ít đông
        </span>
                <span className="filter-item medium-traffic">
          <span className="color-dot"></span> Trung bình
        </span>
                <span className="filter-item heavy-traffic">
          <span className="color-dot"></span> Ùn tắc
        </span>
                <span className="filter-item no-connection">
          <span className="color-dot"></span> Mất kết nối
        </span>
            </div>

            <div
                className="dashboard-grid"
                style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}
            >
                {cameras.length === 0 ? (
                    <div
                        style={{
                            color: "#94a3b8",
                            gridColumn: "span 2",
                            textAlign: "center",
                            marginTop: 50,
                        }}
                    >
                        {activeIntersection
                            ? "Ngã tư này chưa được gắn Camera nào trong Database."
                            : "Chưa chọn ngã tư nào."}
                    </div>
                ) : (
                    cameras.map((cam) => (
                        <DashboardSegmentCard
                            key={cam.id}
                            camera={cam}
                            onLiveView={onLiveView}
                            onSettings={handleOpenSettings}
                        />
                    ))
                )}
            </div>

            {/* Modal Cài đặt Camera */}
            {settingsCamera && (
                <CameraSettingsModal
                    camera={settingsCamera}
                    onClose={handleCloseSettings}
                    onSave={handleSaveSettings}
                />
            )}
        </main>
    );
};

export default Dashboard;