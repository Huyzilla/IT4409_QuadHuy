import React, {useEffect, useRef, useState} from "react";
import {useTraffic} from "../context/TrafficContext";
import AlertPanel from "./AlertPanel.jsx";
import {ingestSocket} from "../socket.js";
import axios from "axios";

const API_URL = "http://localhost:3001/api";

const STATUS_MAP = {
    low: {label: "Ít đông", colorClass: "low-traffic", gradientClass: "low-gradient"},
    medium: {label: "Trung bình", colorClass: "medium-traffic", gradientClass: "medium-gradient"},
    heavy: {label: "Ùn tắc", colorClass: "heavy-traffic", gradientClass: "heavy-gradient"},
    "no-connection": {label: "Mất kết nối", colorClass: "no-connection", gradientClass: ""},
};

const TrafficLight = ({ light = 'RED', remaining = 0 }) => {
    const SIZE = 20;
    const isLong = remaining >= 100;

    const baseStyle = {
        height: SIZE,
        minWidth: isLong ? 34 : SIZE,
        padding: isLong ? '0 6px' : 0,
        borderRadius: isLong ? 12 : '50%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '11px',
        fontWeight: 'bold',
        transition: 'all 0.25s ease',
        userSelect: 'none'
    };

    const renderLight = (type, activeColor, inactiveColor, textColor = '#fff') => {
        const isActive = light === type;

        return (
            <div
                key={type}
                style={{
                    ...baseStyle,
                    background: isActive ? activeColor : inactiveColor,
                    boxShadow: isActive ? `0 0 10px ${activeColor}` : 'none',
                    color: textColor
                }}
            >
                {isActive ? remaining : ''}
            </div>
        );
    };

    return (
        <div
            className="traffic-light-horizontal"
            style={{
                display: 'flex',
                flexDirection: 'row',
                gap: '6px',
                background: 'rgba(0,0,0,0.45)',
                padding: '5px 12px',
                borderRadius: '22px',
                alignItems: 'center',
                border: '1px solid rgba(255,255,255,0.12)'
            }}
        >
            {renderLight('RED', '#ff3e3e', '#330000')}
            {renderLight('YELLOW', '#ffcc00', '#332b00', '#000')}
            {renderLight('GREEN', '#00ff7f', '#002211', '#000')}
        </div>
    );
};


const CameraSettingsModal = ({camera, onClose, onSave}) => {
    const [threshold, setThreshold] = useState(camera.threshold || 0.7);
    const [aiEnabled, setAiEnabled] = useState(camera.aiEnabled !== undefined ? camera.aiEnabled : true);
    const [maxVehicles, setMaxVehicles] = useState(camera.maxVehicles || 70);
    const [loading, setLoading] = useState(false);

    const handleSave = () => {
        setLoading(true);
        setTimeout(() => {
            onSave(camera.id, {threshold, aiEnabled, maxVehicles});
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
                        <label>Số xe tối đa</label>
                        <input
                            type="number"
                            step="1"
                            min="10"
                            max="200"
                            value={maxVehicles}
                            onChange={(e) => setMaxVehicles(parseInt(e.target.value))}
                            disabled={loading}
                        />
                        <small>Số xe tối đa camera này có thể chứa. Dùng để tính mật độ thực tế.</small>
                    </div>

                    <div className="form-group">
                        <label>Ngưỡng ùn tắc (Density %)</label>
                        <input
                            type="number"
                            step="5"
                            min="50"
                            max="100"
                            value={Math.round(threshold * 100)}
                            onChange={(e) => setThreshold(parseInt(e.target.value) / 100)}
                            disabled={loading}
                        />
                        <small>Giá trị hiện tại: {Math.round(threshold * 100)}%. Mật độ vượt quá ngưỡng sẽ kích hoạt cảnh báo *Ùn tắc*.</small>
                    </div>

                    <div className="form-group checkbox-group">
                        <label className="checkbox-label">
                            <input
                                type="checkbox"
                                checked={aiEnabled}
                                onChange={(e) => setAiEnabled(e.target.checked)}
                                disabled={loading}
                            />
                            Kích hoạt đếm phương tiện
                        </label>
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

const DashboardSegmentCard = ({camera, realTimeData, onLiveView, onSettings}) => {
    const vehicles = realTimeData?.flowCount || 0;
    const trend = realTimeData?.trend || "stable";
    const trendText = realTimeData?.trendText || "Xu hướng: Đang cập nhật...";

    const threshold = camera.threshold || 0.7;
    const aiEnabled = camera.aiEnabled !== undefined ? camera.aiEnabled : true;
    const maxVehicles = camera.maxVehicles || 70;

    // Tính density dựa trên số xe thực tế / số xe tối đa
    const density = maxVehicles > 0 ? vehicles / maxVehicles : 0;

    let status = "low";
    if (density >= threshold) status = "heavy";
    else if (density >= threshold * 0.5) status = "medium";
    if (!camera.videoSource) status = "no-connection";

    const statusInfo = STATUS_MAP[status] || STATUS_MAP["no-connection"];
    const densityPercent = Math.round(density * 100);

    const light = realTimeData?.light || 'RED';
    const remaining = realTimeData?.remaining || 0;

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
            style={{display: "flex", flexDirection: "column"}}
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
                {camera.videoSource ? (
                    <video
                        src={camera.videoSource}
                        muted
                        playsInline
                        autoPlay
                        loop
                        style={{width: "100%", height: "100%", objectFit: "cover"}}
                        onError={(e) => {
                            e.target.style.display = "none";
                            e.target.parentNode.innerHTML =
                                '<div style="display:flex;justify-content:center;align-items:center;height:100%;color:gray;font-size:12px">Mất tín hiệu</div>';
                        }}
                    />
                ) : (
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

                <div style={{flexShrink: 0}}>
                    <TrafficLight light={light} remaining={remaining}/>
                </div>

                <div style={{display: "flex", gap: 8}}>
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

            <div className="trend-chart" data-trend={trend} style={{marginTop: 8}}>
                <p style={{margin: 0, fontSize: '13px'}}>{trendText}</p>
            </div>

            <div className="progress-bar-container" style={{
                marginTop: 8,
                background: "rgba(255,255,255,0.03)",
                height: 10,
                borderRadius: 6,
                overflow: "hidden"
            }}>
                <div className={`progress-bar ${statusInfo.gradientClass}`}
                     style={{width: `${densityPercent}%`, height: "100%", transition: "width 300ms ease"}}/>
            </div>

            <div style={{display: "flex", justifyContent: "space-between", marginTop: 8, alignItems: "center"}}>
                <p className="density-label" style={{margin: 0}}>Mật độ: {densityPercent}%</p>

                {aiEnabled && (
                    <span style={{
                        fontSize: '12px',
                        color: 'var(--color-accent-blue)',
                        fontWeight: 'bold',
                        background: 'rgba(37, 99, 235, 0.1)',
                        padding: '2px 6px',
                        borderRadius: '4px'
                    }}>
                        {vehicles} phương tiện
                    </span>
                )}
            </div>
        </div>
    );
};

const Dashboard = ({onReload, onLiveGrid, onLiveView}) => {
    const {activeIntersection, loading, unreadAlertCount, addAlert, updateCameraSettings} = useTraffic();
    const [settingsCamera, setSettingsCamera] = useState(null);
    const [showAlertPanel, setShowAlertPanel] = useState(false);
    const [realTimeStats, setRealTimeStats] = useState({});
    const alertRef = useRef(null);

    const processDensityAlert = React.useCallback((data) => {
        if (!activeIntersection) return;

        const cam = activeIntersection.cameras.find(
            (c) => c.id === data.cameraId
        );
        if (!cam) return;

        const maxVehicles = cam.maxVehicles || 70;
        const vehicles = Math.round(data.vehicles_avg);
        const density = maxVehicles > 0 ? vehicles / maxVehicles : 0;
        const threshold = cam.threshold ?? 0.7;

        if (density >= threshold) {
            addAlert({
                type: "heavy",
                message: `Ùn tắc tại ${activeIntersection.name} (${cam.name})`,
                intersectionId: activeIntersection.id,
                cameraId: cam.id,
                timestamp: Date.now(),
            });
        }
        else if (density >= threshold * 0.6) {
            addAlert({
                type: "medium",
                message: `Mật độ cao tại ${activeIntersection.name} (${cam.name})`,
                intersectionId: activeIntersection.id,
                cameraId: cam.id,
                timestamp: Date.now(),
            });
        }
    }, [activeIntersection, addAlert]);

    // Fetch dữ liệu lịch sử ban đầu (1 giờ gần nhất)
    const fetchInitialData = React.useCallback(async () => {
        if (!activeIntersection?.cameras || activeIntersection.cameras.length === 0) return;

        const activeCamIds = activeIntersection.cameras.map(c => c.id);

        try {
            const now = new Date();
            const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);

            const params = {
                cameraIds: activeCamIds.join(','),
                from: oneHourAgo.toISOString(),
                to: now.toISOString(),
                _t: Date.now()
            };

            console.log("🔄 Fetching initial data for cameras:", activeCamIds);

            const response = await axios.get(`${API_URL}/traffic/minute-stats`, { params });

            const cameraData = {};

            activeCamIds.forEach(camId => {
                const camStats = response.data
                    .filter(item => item.cameraId === camId)
                    .sort((a, b) => b.minuteStart - a.minuteStart)
                    .slice(0, 2);

                if (camStats.length > 0) {
                    const latest = camStats[0];
                    const previous = camStats[1];

                    const currentDensity = Math.min(1, (Number(latest.vehiclesAvg) || 0) / 100);
                    const currentVehicles = Math.round(latest.flowCount || 0);

                    let trend = "stable";
                    let trendText = "Xu hướng: Ổn định";

                    if (previous) {
                        const previousVehicles = Math.round(previous.flowCount || 0)

                        if (currentVehicles !== previousVehicles && previousVehicles > 0) {
                            const percentChange = ((currentVehicles - previousVehicles) / previousVehicles) * 100;
                            const sign = percentChange > 0 ? "+" : "";

                            if (currentVehicles > previousVehicles) {
                                trend = "up";
                                trendText = `Xu hướng: Tăng ${sign}${percentChange.toFixed(1)}%`;
                            } else {
                                trend = "down";
                                trendText = `Xu hướng: Giảm ${percentChange.toFixed(1)}%`;
                            }
                        }
                    }

                    cameraData[camId] = {
                        density: currentDensity,
                        vehicles: currentVehicles,
                        trend: trend,
                        trendText: trendText,
                        flowCount: currentVehicles,
                        light: 'RED',
                        remaining: 60
                    };
                }
            });

            console.log("✅ Initial data loaded:", cameraData);
            setRealTimeStats(cameraData);

        } catch (err) {
            console.error("❌ Error fetching initial data:", err);

            // Fallback: khởi tạo với giá trị mặc định
            const initialStats = {};
            activeCamIds.forEach(camId => {
                initialStats[camId] = {
                    density: 0,
                    vehicles: 0,
                    trend: "stable",
                    trendText: "Xu hướng: Đang cập nhật...",
                    flowCount: 0,
                    light: 'RED',
                    remaining: 60
                };
            });
            setRealTimeStats(initialStats);
        }
    }, [activeIntersection]);

    // Gọi fetch khi intersection thay đổi
    useEffect(() => {
        fetchInitialData();
    }, [fetchInitialData]);

    // Socket listener cho real-time updates
    useEffect(() => {
        if (!activeIntersection) return;

        const activeCamIds = activeIntersection.cameras.map(c => c.id);
        console.log("🎯 Dashboard mount/update - Active Intersection:", activeIntersection.id, "Cameras:", activeCamIds);

        const handleNewData = (data) => {
            console.log("📨 Dashboard nhận socket data:", data);

            if (!activeCamIds.includes(Number(data.cameraId))) {
                console.log("⏭️ Skip camera", data.cameraId, "- Not in active cams:", activeCamIds);
                return;
            }

            console.log("✅ Processing data for camera", data.cameraId);
            processDensityAlert(data);

            setRealTimeStats(prev => {
                const prevData = prev[data.cameraId];

                const currentDensity = Math.min(1, (Number(data.vehicles_avg) || 0) / 100);
                const currentVehicles = Math.round(data.flowCount || 0);

                let trend = "stable";
                let trendText = "Xu hướng: Ổn định";

                if (prevData && prevData.vehicles !== undefined) {
                    const oldVehicles = prevData.vehicles;

                    if (currentVehicles !== oldVehicles && oldVehicles > 0) {
                        const percentChange = ((currentVehicles - oldVehicles) / oldVehicles) * 100;
                        const sign = percentChange > 0 ? "+" : "";

                        if (currentVehicles > oldVehicles) {
                            trend = "up";
                            trendText = `Xu hướng: Tăng ${sign}${percentChange.toFixed(1)}%`;
                        } else {
                            trend = "down";
                            trendText = `Xu hướng: Giảm ${percentChange.toFixed(1)}%`;
                        }
                    }
                }

                return {
                    ...prev,
                    [data.cameraId]: {
                        density: currentDensity,
                        vehicles: currentVehicles,
                        trend: trend,
                        trendText: trendText,
                        flowCount: currentVehicles,
                        light: prev[data.cameraId]?.light || 'RED',
                        remaining: prev[data.cameraId]?.remaining || 60
                    }
                };
            });
        };

        console.log("Dashboard đăng ký socket cho cameras:", activeCamIds);

        ingestSocket.on("new_minute_stats", handleNewData);
        return () => {
            console.log("Dashboard hủy socket listener");
            ingestSocket.off("new_minute_stats", handleNewData);
        };
    }, [activeIntersection, processDensityAlert]);

    useEffect(() => {
        const handleClickOutside = (e) => {
            if (alertRef.current && !alertRef.current.contains(e.target)) {
                setShowAlertPanel(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const handleSaveSettings = (cameraId, settings) => {
        console.log("Saving settings for cam:", cameraId, settings);
        
        // Cập nhật cấu hình qua context (không lưu database)
        updateCameraSettings(cameraId, settings);
        
        console.log("✅ Settings saved successfully to state");
        setSettingsCamera(null);
    };

    // Traffic light countdown timer
    useEffect(() => {
        const timer = setInterval(() => {
            setRealTimeStats(prev => {
                const nextState = {...prev};
                let hasChange = false;

                Object.keys(nextState).forEach(camId => {
                    const camData = nextState[camId];
                    if (!camData || camData.remaining === undefined) return;

                    hasChange = true;
                    let {light, remaining} = camData;

                    if (remaining > 0) {
                        remaining -= 1;
                        if (light === 'GREEN' && remaining <= 2) {
                            light = 'YELLOW';
                        }
                    } else {
                        light = 'RED';
                        remaining = 0;
                    }

                    nextState[camId] = {...camData, light, remaining};
                });

                return hasChange ? nextState : prev;
            });
        }, 1000);

        return () => clearInterval(timer);
    }, []);

    // Signal decision handler
    useEffect(() => {
        const handleSignalChange = (data) => {
            console.log("Dashboard nhận signal_decision:", data);

            const {greenRoadId, duration} = data.decision;

            setRealTimeStats(prev => {
                const newState = {...prev};
                Object.keys(newState).forEach(id => {
                    newState[id] = {
                        ...newState[id],
                        light: 'RED',
                        remaining: 60
                    };
                });
                if (newState[greenRoadId]) {
                    newState[greenRoadId] = {
                        ...newState[greenRoadId],
                        light: 'GREEN',
                        remaining: duration
                    };
                }
                return newState;
            });
        };

        ingestSocket.on("signal_decision", handleSignalChange);
        return () => ingestSocket.off("signal_decision", handleSignalChange);
    }, []);

    if (loading) {
        return <div style={{padding: 30, color: "white"}}>Đang tải dữ liệu...</div>;
    }

    const cameras = activeIntersection?.cameras || [];

    return (
        <main className="main-content" role="main">
            <header className="main-header">
                <h1 className="page-title">
                    {activeIntersection ? `${activeIntersection.name} — Trạng thái hiện tại` : "Vui lòng chọn một Ngã tư"}
                </h1>
                <div className="header-actions">
                    <div ref={alertRef} style={{position: 'relative', display: 'inline-block'}}>
                        <button className="alert-btn action-btn" onClick={() => setShowAlertPanel(!showAlertPanel)}>
                            <span className="icon icon-bell"></span>
                            {unreadAlertCount > 0 &&
                                <span className="alert-badge pulse-animation">{unreadAlertCount}</span>}
                        </button>
                        {showAlertPanel && <AlertPanel onClose={() => setShowAlertPanel(false)} isDropdown={true}/>}
                    </div>
                    <button className="action-btn" onClick={onReload}>Tải lại</button>
                    <button className="action-btn primary"
                            onClick={() => onLiveGrid(activeIntersection)}
                            disabled={cameras.length === 0}>
                        Trực tiếp
                    </button>
                </div>
            </header>

            <div className="traffic-filters">
                {Object.entries(STATUS_MAP).map(([key, val]) => (
                    <span key={key} className={`filter-item ${val.colorClass}`}>
                        <span className="color-dot"></span> {val.label}
                    </span>
                ))}
            </div>

            <div className="dashboard-grid" style={{display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12}}>
                {cameras.length === 0 ? (
                    <div style={{color: "#94a3b8", gridColumn: "span 2", textAlign: "center", marginTop: 50}}>
                        {activeIntersection ? "Chưa có Camera nào." : "Chưa chọn ngã tư."}
                    </div>
                ) : (
                    cameras.map((cam) => (
                        <DashboardSegmentCard
                            key={cam.id}
                            camera={cam}
                            realTimeData={realTimeStats[cam.id]}
                            onLiveView={onLiveView}
                            onSettings={setSettingsCamera}
                        />
                    ))
                )}
            </div>

            {settingsCamera && (
                <CameraSettingsModal
                    camera={settingsCamera}
                    onClose={() => setSettingsCamera(null)}
                    onSave={handleSaveSettings}
                />
            )}
        </main>
    );
};

export default Dashboard;