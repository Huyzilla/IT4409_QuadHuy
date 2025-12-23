import React, { useEffect, useRef, useState } from "react";
import { useTraffic } from "../context/TrafficContext";
import AlertPanel from "./AlertPanel.jsx";
import { ingestSocket, getTrafficSocket } from "../socket.js";
import { api } from "../api";
import HlsVideo from "./HlsVideo.jsx";
import CameraModal from "./CameraModal.jsx";

const STATUS_MAP = {
  low: {
    label: "Ít đông",
    colorClass: "low-traffic",
    gradientClass: "low-gradient",
  },
  medium: {
    label: "Trung bình",
    colorClass: "medium-traffic",
    gradientClass: "medium-gradient",
  },
  heavy: {
    label: "Ùn tắc",
    colorClass: "heavy-traffic",
    gradientClass: "heavy-gradient",
  },
  "no-connection": {
    label: "Mất kết nối",
    colorClass: "no-connection",
    gradientClass: "",
  },
};

const TrafficLight = ({ light = "RED", remaining = 0 }) => {
  const SIZE = 20;
  const isLong = remaining >= 100;

  const baseStyle = {
    height: SIZE,
    minWidth: isLong ? 34 : SIZE,
    padding: isLong ? "0 6px" : 0,
    borderRadius: isLong ? 12 : "50%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "11px",
    fontWeight: "bold",
    transition: "all 0.25s ease",
    userSelect: "none",
  };

  const renderLight = (
    type,
    activeColor,
    inactiveColor,
    textColor = "#fff"
  ) => {
    const isActive = light === type;

    return (
      <div
        key={type}
        style={{
          ...baseStyle,
          background: isActive ? activeColor : inactiveColor,
          boxShadow: isActive ? `0 0 10px ${activeColor}` : "none",
          color: textColor,
        }}
      >
        {isActive ? remaining : ""}
      </div>
    );
  };

  return (
    <div
      className="traffic-light-horizontal"
      style={{
        display: "flex",
        flexDirection: "row",
        gap: "6px",
        background: "rgba(0,0,0,0.45)",
        padding: "5px 12px",
        borderRadius: "22px",
        alignItems: "center",
        border: "1px solid rgba(255,255,255,0.12)",
      }}
    >
      {renderLight("RED", "#ff3e3e", "#330000")}
      {renderLight("YELLOW", "#ffcc00", "#332b00", "#000")}
      {renderLight("GREEN", "#00ff7f", "#002211", "#000")}
    </div>
  );
};

const CameraSettingsModal = ({ camera, onClose, onSave }) => {
  const [threshold, setThreshold] = useState(camera.threshold || 0.7);
  const [maxVehicles, setMaxVehicles] = useState(
    Number.isFinite(Number(camera.maxVehicles)) ? Number(camera.maxVehicles) : 5
  );
  const [aiEnabled, setAiEnabled] = useState(
    camera.aiEnabled !== undefined ? camera.aiEnabled : true
  );
  const [loading, setLoading] = useState(false);

  const handleSave = () => {
    setLoading(true);
    Promise.resolve(
      onSave(camera.id, { threshold, maxVehicles, aiEnabled })
    ).finally(() => setLoading(false));
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
            <small>
              Giá trị hiện tại: {threshold.toFixed(2)}. Mật độ vượt quá ngưỡng
              sẽ kích hoạt cảnh báo *Ùn tắc*.
            </small>
          </div>

          <div className="form-group">
            <label>Số phương tiện tối đa</label>
            <input
              type="number"
              step="1"
              min="1"
              max="999"
              value={maxVehicles}
              onChange={(e) =>
                setMaxVehicles(parseInt(e.target.value || "0", 10) || 0)
              }
              disabled={loading}
            />
            <small>
              Dùng để quy đổi mật độ: density = vehicles / maxVehicles.
            </small>
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
          <button
            className="action-btn primary"
            onClick={handleSave}
            disabled={loading}
          >
            {loading ? "Đang lưu..." : "Lưu Cấu hình"}
          </button>
        </div>
      </div>
    </div>
  );
};

const DashboardSegmentCard = ({
  camera,
  realTimeData,
  onLiveView,
  onSettings,
  onEdit,
  onDelete,
}) => {
  const density = realTimeData?.density || 0;
  const vehicles = realTimeData?.flowCount || 0;
  const trend = realTimeData?.trend || "stable";
  const trendText = realTimeData?.trendText || "Xu hướng: Đang cập nhật...";

  const threshold = camera.threshold || 0.7;
  const aiEnabled = camera.aiEnabled !== undefined ? camera.aiEnabled : true;

  let status = "low";
  if (density >= threshold) status = "heavy";
  else if (density >= threshold * 0.5) status = "medium";
  if (!camera.videoSource) status = "no-connection";

  const statusInfo = STATUS_MAP[status] || STATUS_MAP["no-connection"];
  const densityPercent = Math.round(density * 100);

  const light = realTimeData?.light || "RED";
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
        {camera?.videoSource ? (
          <HlsVideo
            src={camera.videoSource}
            muted
            autoPlay
            playsInline
            controls
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
          />
        ) : (
          <div
            style={{
              color: "#94a3b8",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              height: "100%",
              gap: 6,
              padding: 10,
              textAlign: "center",
            }}
          >
            <div style={{ fontSize: 12, opacity: 0.9 }}>Snapshot</div>
            <div style={{ fontSize: 12, opacity: 0.75 }}>
              {camera?.name || ""}
            </div>
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

        <div style={{ flexShrink: 0 }}>
          <TrafficLight light={light} remaining={remaining} />
        </div>

        <div style={{ display: "flex", gap: 8 }}>
          {/* Nút Sửa */}
          <button
            className="quick-action-btn"
            title="Sửa"
            onClick={() => onEdit(camera)}
          >
            ✎
          </button>

          {/* Nút Xóa */}
          <button
            className="quick-action-btn"
            title="Xóa"
            style={{ color: "#ef4444" }}
            onClick={() => onDelete(camera.id)}
          >
            🗑️
          </button>
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
        <p style={{ margin: 0, fontSize: "13px" }}>{trendText}</p>
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
          className={`progress-bar ${statusInfo.gradientClass}`}
          style={{
            width: `${densityPercent}%`,
            height: "100%",
            transition: "width 300ms ease",
          }}
        />
      </div>

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          marginTop: 8,
          alignItems: "center",
        }}
      >
        <p className="density-label" style={{ margin: 0 }}>
          Mật độ: {densityPercent}%
        </p>

        {aiEnabled && (
          <span
            style={{
              fontSize: "12px",
              color: "var(--color-accent-blue)",
              fontWeight: "bold",
              background: "rgba(37, 99, 235, 0.1)",
              padding: "2px 6px",
              borderRadius: "4px",
            }}
          >
            🚗 {vehicles} phương tiện
          </span>
        )}
      </div>
    </div>
  );
};

const Dashboard = ({ onReload, onLiveGrid, onLiveView }) => {
  const {
    activeIntersection,
    loading,
    unreadAlertCount,
    addAlert,
    addCamera,
    updateCamera,
    deleteCamera,
  } = useTraffic();
  const [settingsCamera, setSettingsCamera] = useState(null);
  const [showAlertPanel, setShowAlertPanel] = useState(false);
  const [realTimeStats, setRealTimeStats] = useState({});

  //  thêm state quản lí thêm/sửa cam
  const [isCamModalOpen, setIsCamModalOpen] = useState(false);
  const [editingCamera, setEditingCamera] = useState(null);

  // hàm xửa lí thêm sửa xóa cam
  const handleEditCamera = (cam) => {
    setEditingCamera(cam);
    setIsCamModalOpen(true);
  };
  const handleDeleteCamera = (id) => {
    if (activeIntersection) {
      deleteCamera(id, activeIntersection.id);
    }
  };
  const handleSaveCamera = (data) => {
    if (editingCamera) updateCamera(editingCamera.id, data);
    else if (activeIntersection) addCamera(activeIntersection.id, data);
  };

  if (loading)
    return (
      <div style={{ padding: 30, color: "white" }}>⏳ Đang tải dữ liệu...</div>
    );

  const alertRef = useRef(null);

  useEffect(() => {
    const timer = setInterval(() => {
      setRealTimeStats((prev) => {
        const next = { ...prev };
        let changed = false;
        Object.keys(next).forEach((key) => {
          const cur = next[key];
          if (!cur) return;

          const serverRemainingRaw = cur.serverRemaining ?? cur.remaining;
          const serverRemaining = Number(serverRemainingRaw);
          const serverLight = cur.serverLight ?? cur.light;

          let nextServerRemaining = serverRemaining;
          if (Number.isFinite(serverRemaining) && serverRemaining > 0) {
            nextServerRemaining = Math.max(0, Math.floor(serverRemaining) - 1);
          }

          const pendingLight = cur.pendingLight;
          if (pendingLight) {
            const remaining = Number(cur.remaining);
            if (Number.isFinite(remaining) && remaining > 0) {
              next[key] = {
                ...cur,
                serverRemaining: nextServerRemaining,
                remaining: Math.max(0, Math.floor(remaining) - 1),
              };
              changed = true;
            } else {
              next[key] = {
                ...cur,
                serverRemaining: nextServerRemaining,
                light: pendingLight,
                remaining: Number.isFinite(nextServerRemaining)
                  ? nextServerRemaining
                  : 0,
                pendingLight: null,
              };
              changed = true;
            }
            return;
          }

          const reachedZeroFromGreen =
            serverLight === "GREEN" &&
            Number.isFinite(serverRemaining) &&
            serverRemaining === 1 &&
            nextServerRemaining === 0;

          if (reachedZeroFromGreen) {
            next[key] = {
              ...cur,
              serverRemaining: nextServerRemaining,
              light: "YELLOW",
              remaining: 2,
              pendingLight: "RED",
            };
            changed = true;
            return;
          }

          if (
            cur.serverRemaining !== nextServerRemaining ||
            cur.remaining !== nextServerRemaining ||
            cur.light !== serverLight
          ) {
            next[key] = {
              ...cur,
              serverRemaining: nextServerRemaining,
              light: serverLight,
              remaining: Number.isFinite(nextServerRemaining)
                ? nextServerRemaining
                : 0,
            };
            changed = true;
          }
        });
        return changed ? next : prev;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const processDensityAlert = (data) => {
    if (!activeIntersection) return;

    const cam = activeIntersection.cameras.find((c) => c.id === data.cameraId);
    if (!cam) return;

    const aiEnabled = cam.aiEnabled !== undefined ? cam.aiEnabled : true;
    if (!aiEnabled) return;

    const density = data.density;
    const threshold = cam.threshold ?? 0.7;

    if (density >= threshold) {
      addAlert({
        type: "heavy",
        message: `🚨 Ùn tắc tại ${activeIntersection.name} (${cam.name})`,
        intersectionId: activeIntersection.id,
        cameraId: cam.id,
        timestamp: Date.now(),
      });
    } else if (density >= threshold * 0.6) {
      addAlert({
        type: "medium",
        message: `⚠️ Mật độ cao tại ${activeIntersection.name} (${cam.name})`,
        intersectionId: activeIntersection.id,
        cameraId: cam.id,
        timestamp: Date.now(),
      });
    }
  };

  useEffect(() => {
    const handleNewData = (data) => {
      if (!activeIntersection) return;

      const cam = activeIntersection.cameras.find(
        (c) => c.id === data.cameraId
      );
      const aiEnabled = cam?.aiEnabled !== undefined ? cam.aiEnabled : true;
      const maxVehicles = cam?.maxVehicles ?? 5;
      const vehiclesAvg = Number(data.vehicles_avg) || 0;
      const density =
        maxVehicles > 0 ? Math.min(1, vehiclesAvg / maxVehicles) : 0;

      const computed = {
        ...data,
        density,
      };

      processDensityAlert(computed);

      setRealTimeStats((prev) => {
        const prevData = prev[data.cameraId] || {};
        let trend = "stable";
        let trendText = "Xu hướng: Ổn định";

        if (prevData) {
          const oldVehicles = prevData.vehicles;
          const newVehicles = Math.round(data.vehicles_avg);

          if (newVehicles !== oldVehicles && oldVehicles > 0) {
            const percentChange =
              ((newVehicles - oldVehicles) / oldVehicles) * 100;
            const sign = percentChange > 0 ? "+" : "";

            if (newVehicles > oldVehicles) {
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
            ...prevData,
            density: density,
            vehicles: Math.round(vehiclesAvg),
            trend: trend,
            trendText: trendText,
            flowCount: aiEnabled ? data.flowCount : 0,
          },
        };
      });
    };

    ingestSocket.on("new_minute_stats", handleNewData);
    return () => ingestSocket.off("new_minute_stats");
  }, [activeIntersection]);

  useEffect(() => {
    if (!activeIntersection?.id) return;

    const intersectionId = activeIntersection.id;

    const handleTrafficUpdate = (payload) => {
      const state = payload?.intersectionStates
        ? payload.intersectionStates[intersectionId]
        : payload;

      if (!state?.north || !state?.east || !state?.south || !state?.west)
        return;

      const base = intersectionId === 2 ? 4 : 0;
      const camByDir = {
        north: 1 + base,
        east: 2 + base,
        south: 3 + base,
        west: 4 + base,
      };

      setRealTimeStats((prev) => {
        const next = { ...prev };
        Object.keys(camByDir).forEach((dir) => {
          const camId = camByDir[dir];
          const road = state[dir];
          if (!road) return;

          const remaining =
            road.remaining ??
            road.remainingSeconds ??
            road.remaining_seconds ??
            0;

          const prevCam = next[camId] || {};
          const prevServerLight = prevCam.serverLight ?? prevCam.light;
          const nextServerLight = road.light;
          const nextServerRemaining = Math.max(
            0,
            Math.floor(Number(remaining) || 0)
          );

          const alreadyInInjectedYellow = Boolean(prevCam.pendingLight);
          const shouldInjectYellow =
            !alreadyInInjectedYellow &&
            prevServerLight === "GREEN" &&
            nextServerLight === "RED";

          const baseUpdate = {
            ...prevCam,
            serverLight: nextServerLight,
            serverRemaining: nextServerRemaining,
            vehicles: road.vehicles,
            flowCount: road.vehicles,
            isEmergency: road.isEmergency,
          };

          if (shouldInjectYellow) {
            next[camId] = {
              ...baseUpdate,
              light: "YELLOW",
              remaining: 2,
              pendingLight: "RED",
            };
            return;
          }

          if (alreadyInInjectedYellow) {
            next[camId] = baseUpdate;
            return;
          }

          next[camId] = {
            ...baseUpdate,
            light: nextServerLight,
            remaining: nextServerRemaining,
            pendingLight: null,
          };
        });
        return next;
      });
    };

    const attach = () => {
      const socket = getTrafficSocket();
      if (!socket) return;
      socket.off("traffic_update", handleTrafficUpdate);
      socket.on("traffic_update", handleTrafficUpdate);
      try {
        socket.emit("request-initial-stream");
      } catch {}
    };

    attach();
    window.addEventListener("socket:connect", attach);
    return () => {
      window.removeEventListener("socket:connect", attach);
      const socket = getTrafficSocket();
      if (socket) socket.off("traffic_update", handleTrafficUpdate);
    };
  }, [activeIntersection?.id]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (alertRef.current && !alertRef.current.contains(e.target))
        setShowAlertPanel(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSaveSettings = async (cameraId, settings) => {
    try {
      await api.put(`/cameras/${cameraId}`, {
        threshold: settings.threshold,
        maxVehicles: settings.maxVehicles,
        aiEnabled: settings.aiEnabled,
      });
      if (onReload) await onReload();
    } catch (error) {
      console.error("Failed to save camera settings:", error);
      alert(
        "Lưu cấu hình thất bại: " +
          (error.response?.data?.message || error.message)
      );
    } finally {
      setSettingsCamera(null);
    }
  };

  if (loading)
    return (
      <div style={{ padding: 30, color: "white" }}>⏳ Đang tải dữ liệu...</div>
    );

  const cameras = activeIntersection?.cameras || [];

  const handleOpenSettings = (camera) => {
    setSettingsCamera(camera);
  };

  const handleCloseSettings = () => {
    setSettingsCamera(null);
  };

  return (
    <main className="main-content" role="main">
      <header className="main-header">
        <h1 className="page-title">
          {activeIntersection
            ? `${activeIntersection.name} — Trạng thái hiện tại`
            : "Vui lòng chọn một Ngã tư"}
        </h1>
        <div className="header-actions">
          {/*NÚT THÊM CAM*/}

          {activeIntersection && (
            <button
              className="action-btn"
              onClick={() => {
                setEditingCamera(null);
                setIsCamModalOpen(true);
              }}
              style={{
                marginRight: 10,
              }}
            >
              Thêm Camera
            </button>
          )}
          <div
            ref={alertRef}
            style={{ position: "relative", display: "inline-block" }}
          >
            <button
              className="alert-btn action-btn"
              onClick={() => setShowAlertPanel(!showAlertPanel)}
            >
              <span className="icon icon-bell"></span>
              {unreadAlertCount > 0 && (
                <span className="alert-badge pulse-animation">
                  {unreadAlertCount}
                </span>
              )}
            </button>
            {showAlertPanel && (
              <AlertPanel
                onClose={() => setShowAlertPanel(false)}
                isDropdown={true}
              />
            )}
          </div>
          <button className="action-btn" onClick={onReload}>
            Tải lại
          </button>
          <button
            className="action-btn primary"
            onClick={() => onLiveGrid(activeIntersection)}
            disabled={cameras.length === 0}
          >
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
              onEdit={handleEditCamera}
              onDelete={handleDeleteCamera}
            />
          ))
        )}
      </div>
      {/* Modal Cài đặt Camera */}
      {settingsCamera && (
        <CameraSettingsModal
          camera={settingsCamera}
          onClose={() => setSettingsCamera(null)}
          onSave={handleSaveSettings}
        />
      )}
      {/*modal thêm sửa CAM*/}
      <CameraModal
        isOpen={isCamModalOpen}
        onClose={() => setIsCamModalOpen(false)}
        onSubmit={handleSaveCamera}
        initialData={editingCamera}
      />
    </main>
  );
};

export default Dashboard;
