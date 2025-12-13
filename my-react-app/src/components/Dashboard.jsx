import React from "react";
import { useTraffic } from "../context/TrafficContext";

// ------
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

// --- component card (cấy ni dự nguyên ui cũ) ---
const DashboardSegmentCard = ({ camera, onLiveView }) => {
  // camera.id, camera.name, camera.videoSource là dữ liệu THẬT từ DB
  const { density, status, trend, trendText } = generateFakeStats(camera.id);

  const statusInfo = STATUS_MAP[status] || STATUS_MAP["no-connection"];
  const densityPercent = Math.round(density * 100);

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

// --- MAIN DASHBOARD ---
const Dashboard = ({ onReload, onLiveView }) => {
  // ---Lấy activeIntersection từ Context ---
  const { activeIntersection, loading } = useTraffic();

  if (loading)
    return (
      <div style={{ padding: 30, color: "white" }}>
        ⏳ Đang tải dữ liệu hệ thống...
      </div>
    );

  // Lấy danh sách camera từ ngã tư đang chọn (nếu có)
  const cameras = activeIntersection?.cameras || [];
  const title = activeIntersection
    ? `${activeIntersection.name} — Trạng thái hiện tại`
    : "Vui lòng chọn một Ngã tư";
  // ------

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
        {/* --- Render danh sách camera của Ngã tư --- */}
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
            />
          ))
        )}
        {/* ------ */}
      </div>
    </main>
  );
};

export default Dashboard;
