import React, { useEffect, useState } from "react";
import axios from "axios";

// --- CẤU HÌNH API ---
const API_URL = "http://localhost:3000/api";

// --- CẤU HÌNH GIAO DIỆN (STATUS MAP CŨ) ---
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

// Hàm giả lập thông số AI (Để giao diện hiển thị đẹp như cũ)
const generateFakeStats = (camId) => {
  // Random mật độ từ 0.0 đến 1.0
  const density = Math.random();

  // Xác định trạng thái dựa trên mật độ
  let status = "low";
  if (density > 0.6) status = "heavy";
  else if (density > 0.3) status = "medium";

  // Random xu hướng
  const trends = ["up", "down", "stable"];
  const trend = trends[Math.floor(Math.random() * trends.length)];
  let trendText = "Xu hướng: Ổn định (60 phút)";
  if (trend === "up") trendText = "Xu hướng: Tăng (60 phút)";
  if (trend === "down") trendText = "Xu hướng: Giảm (60 phút)";

  return { density, status, trend, trendText };
};

// --- COMPONENT CARD (GIỮ NGUYÊN GIAO DIỆN CŨ) ---
const DashboardSegmentCard = ({ camera, onLiveView }) => {
  // 1. Lấy dữ liệu giả lập cho các chỉ số
  // Lưu ý: camera.id, camera.name, camera.videoSource là THẬT từ DB
  const { density, status, trend, trendText } = generateFakeStats(camera.id);

  const statusInfo = STATUS_MAP[status] || STATUS_MAP["no-connection"];
  const densityPercent = Math.round(density * 100);

  return (
    <div
      className="segment-card"
      style={{ display: "flex", flexDirection: "column" }}
    >
      {/* Phần Video/Thumbnail */}
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
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
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

      {/* Header: Tên và Trạng thái */}
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
            aria-label="Cài đặt"
            title="Cài đặt nhanh"
          >
            <span className="icon icon-settings"></span>
          </button>
          <button
            className="btn-view-detail"
            onClick={() => onLiveView && onLiveView(camera)}
            title="Xem chi tiết"
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

      {/* Biểu đồ Xu hướng (UI Cũ) */}
      <div className="trend-chart" data-trend={trend} style={{ marginTop: 8 }}>
        <p style={{ margin: 0 }}>{trendText}</p>
      </div>

      {/* Thanh Mật độ (Progress Bar Gradient) */}
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

// --- MAIN DASHBOARD ---
const Dashboard = ({ activeIntersection, onReload, onLiveView }) => {
  const [cameras, setCameras] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // 1. Gọi API lấy Camera thật từ DB
  useEffect(() => {
    const fetchCameras = async () => {
      try {
        // Gọi API NestJS
        const res = await axios.get(`${API_URL}/cameras`);
        if (res.data) {
          console.log("📸 Dữ liệu Camera từ Backend:", res.data);
          setCameras(res.data);
        }
      } catch (err) {
        console.error("❌ Lỗi Backend:", err);
        setError("Không kết nối được Server.");
      } finally {
        setLoading(false);
      }
    };

    fetchCameras();
  }, []); // Chạy 1 lần khi mount

  // --- RENDER ---
  const title = activeIntersection
    ? `${activeIntersection.label || "Ngã tư"} — Trạng thái hiện tại`
    : "Giám sát Giao thông (Camera từ DB)";

  if (loading)
    return (
      <div style={{ padding: 30, color: "white" }}>
        ⏳ Đang tải dữ liệu Camera...
      </div>
    );
  if (error)
    return <div style={{ padding: 30, color: "#FC8181" }}>⚠️ {error}</div>;

  return (
    <main className="main-content" role="main">
      <header className="main-header">
        <h1 className="page-title">{title}</h1>
        <div className="header-actions">
          <button className="alert-btn action-btn">
            <span className="icon icon-bell"></span>
            <span className="alert-badge">3</span>
          </button>
          <button className="action-btn" onClick={onReload}>
            Tải lại
          </button>
          <button
            className="action-btn primary"
            onClick={() => cameras.length > 0 && onLiveView(cameras[0])}
          >
            Trực tiếp
          </button>
        </div>
      </header>

      {/* Bộ lọc trạng thái (Chỉ để hiển thị cho đẹp, chưa có logic filter thật) */}
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

      {/* Grid hiển thị Camera */}
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
            Chưa có camera nào trong Database.
          </div>
        ) : (
          cameras.map((cam) => (
            <DashboardSegmentCard
              key={cam.id}
              camera={cam} // Truyền object camera thật vào
              onLiveView={onLiveView}
            />
          ))
        )}
      </div>
    </main>
  );
};

export default Dashboard;
