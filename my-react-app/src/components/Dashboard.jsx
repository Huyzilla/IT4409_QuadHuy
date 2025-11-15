import React from "react";
import { STATUS_MAP } from "../data/mockData";

const DashboardSegmentCard = ({ segment, onLiveView }) => {
  const statusInfo = STATUS_MAP[segment.status] || STATUS_MAP["no-connection"];
  const densityPercent = Math.round((segment.density ?? 0) * 100);

  const trendOptions = ["up", "down", "stable"];
  const randomIndex = Math.floor(Math.random() * trendOptions.length);
  const randomTrend = trendOptions[randomIndex];

  let trendText = "Không rõ (60 phút)";
  if (segment.status !== "no-connection") {
    if (randomTrend === "up") trendText = "Xu hướng: Tăng (60 phút)";
    if (randomTrend === "down") trendText = "Xu hướng: Giảm (60 phút)";
    if (randomTrend === "stable") trendText = "Xu hướng: Ổn định (60 phút)";
  }

  const handleQuickAction = () => {
    alert(`Đã nhấn nút Tùy chọn Nhanh (Cài đặt) cho: ${segment.title}.`);
  };

  return (
    <div
      className="segment-card"
      style={{ display: "flex", flexDirection: "column" }}
    >
      {/*Thumbnail / preview area*/}
      <div
        className="segment-thumb"
        style={{
          height: 160,
          background: "#000",
          borderRadius: 8,
          overflow: "hidden",
        }}
      >
        {segment.thumbnail ? (
          <img
            src={segment.thumbnail}
            alt={segment.title}
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
              display: "block",
            }}
          />
        ) : segment.streamUrl ? (
          // muted preview (optional) — can be heavy if many videos autoplay
          <video
            src={segment.streamUrl}
            muted
            playsInline
            loop
            preload="metadata"
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
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

      {/* --- Header: title + status + quick settings --- */}
      <div
        className="card-header"
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginTop: 8,
        }}
      >
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <h2 style={{ margin: 0, fontSize: 16 }}>{segment.title}</h2>
          <span
            className={`status-tag ${statusInfo.colorClass}`}
            style={{ display: "inline-flex", alignItems: "center", gap: 6 }}
          >
            <span className="color-dot"></span> {statusInfo.label}
          </span>
        </div>

        <div style={{ display: "flex", gap: 8 }}>
          <button
            className="quick-action-btn"
            aria-label="Tùy chọn nhanh"
            onClick={handleQuickAction}
            title="Cài đặt nhanh"
          >
            <span className="icon icon-settings"></span>
          </button>

          {/* Xem chi tiết button: gọi onLiveView với chính segment (camera) */}
          <button
            className="btn-view-detail"
            onClick={() => onLiveView && onLiveView(segment)}
            title="Xem chi tiết"
            style={{
              padding: "6px 10px",
              borderRadius: 6,
              border: "none",
              cursor: "pointer",
              background: "#2563eb",
              color: "#fff",
            }}
          >
            Xem chi tiết
          </button>
        </div>
      </div>

      <div
        className="trend-chart"
        data-trend={
          segment.status === "no-connection" ? "unknown" : randomTrend
        }
        style={{ marginTop: 8 }}
      >
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
            segment.status !== "no-connection" && segment.status !== "low"
              ? "gradient-full"
              : statusInfo.gradientClass
          }`}
          style={{
            width: `${Math.max(0, Math.min(100, densityPercent))}%`,
            height: "100%",
            transition: "width 300ms ease",
            backgroundColor:
              segment.status === "no-connection"
                ? "var(--color-text-secondary)"
                : segment.status === "low"
                ? "var(--color-traffic-low)"
                : undefined,
          }}
        />
      </div>

      <p className="density-label" style={{ marginTop: 8 }}>
        Mật độ:{" "}
        {segment.status === "no-connection"
          ? "—"
          : (segment.density ?? 0).toFixed(2)}
      </p>
    </div>
  );
};

const Dashboard = ({ activeIntersection, onReload, onLiveView }) => {
  const title = activeIntersection
    ? `${activeIntersection.label} — Trạng thái hiện tại`
    : "Vui lòng chọn một Ngã tư để theo dõi";

  const segments = activeIntersection?.segments || []; // mỗi segment = một camera tile
  const isDashboardEmpty = segments.length === 0;

  const handleFilterClick = (statusLabel) => {
    alert(`Đã lọc/tập trung vào các đoạn đường có trạng thái: ${statusLabel}`);
  };

  const handleHeaderLive = () => {
    if (segments && segments.length > 0) {
      onLiveView && onLiveView(segments[0]);
    } else {
      alert("Không có camera để mở trực tiếp cho ngã tư này.");
    }
  };

  return (
    <main className="main-content" role="main">
      <header className="main-header">
        <h1 className="page-title">{title}</h1>
        <div className="header-actions">
          <button
            className="alert-btn action-btn"
            aria-label="Xem cảnh báo"
            onClick={() =>
              alert("Mở danh sách 3 cảnh báo giao thông nghiêm trọng...")
            }
          >
            <span className="icon icon-bell"></span>
            <span className="alert-badge">3</span>
          </button>
          <button
            className="action-btn"
            aria-label="Tải lại dữ liệu"
            onClick={onReload}
          >
            Tải lại
          </button>
          <button
            className="action-btn primary"
            aria-label="Xem trực tiếp"
            onClick={handleHeaderLive}
          >
            Trực tiếp
          </button>
        </div>
      </header>

      <div className="traffic-filters">
        <span
          className="filter-item low-traffic"
          onClick={() => handleFilterClick("Ít đông")}
        >
          <span className="color-dot"></span> Ít đông
        </span>
        <span
          className="filter-item medium-traffic"
          onClick={() => handleFilterClick("Trung bình")}
        >
          <span className="color-dot"></span> Trung bình
        </span>
        <span
          className="filter-item heavy-traffic"
          onClick={() => handleFilterClick("Ùn tắc")}
        >
          <span className="color-dot"></span> Ùn tắc
        </span>
        <span
          className="filter-item no-connection"
          onClick={() => handleFilterClick("Mất kết nối")}
        >
          <span className="color-dot"></span> Mất kết nối
        </span>
      </div>

      <div
        className="dashboard-grid"
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(2, 1fr)",
          gap: 12,
        }}
      >
        {isDashboardEmpty
          ? Array(4)
              .fill(null)
              .map((_, index) => (
                <div className="segment-card" key={index}>
                  <div className="card-header">
                    <h2>Đoạn đường — Dữ liệu trống</h2>
                    <span className="status-tag no-connection">
                      Không có dữ liệu
                    </span>
                    <button
                      className="quick-action-btn"
                      aria-label="Tùy chọn nhanh"
                      disabled
                    >
                      <span className="icon icon-settings"></span>
                    </button>
                  </div>
                  <div className="trend-chart" data-trend="unknown">
                    <p>Xu hướng: Không rõ (60 phút)</p>
                  </div>
                  <div className="progress-bar-container">
                    <div className="progress-bar"></div>
                  </div>
                  <p className="density-label">Mật độ: —</p>
                </div>
              ))
          : segments.map((segment) => (
              <DashboardSegmentCard
                key={segment.id}
                segment={segment}
                onLiveView={onLiveView}
              />
            ))}
      </div>
    </main>
  );
};

export default Dashboard;
