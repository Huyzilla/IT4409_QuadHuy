import React, { useState, useEffect, useRef } from "react";
import Sidebar from "./components/Sidebar";
import Dashboard from "./components/Dashboard";
import { api, initialIntersectionData } from "./data/mockData";

const getInitialTheme = () => {
  const savedTheme = localStorage.getItem("traffic-monitor-theme");
  if (savedTheme) return savedTheme;
  if (
    window.matchMedia &&
    window.matchMedia("(prefers-color-scheme: light)").matches
  ) {
    return "theme-light";
  }
  return "theme-dark";
};

const App = () => {
  const [theme, setTheme] = useState(getInitialTheme);
  const [intersections, setIntersections] = useState(initialIntersectionData);
  const [activeIntersection, setActiveIntersection] = useState(
    intersections.find((i) => i.id === "A") || null
  );

  const [liveCamera, setLiveCamera] = useState(null);

  useEffect(() => {
    document.body.className = theme;
    localStorage.setItem("traffic-monitor-theme", theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === "theme-dark" ? "theme-light" : "theme-dark"));
  };

  const handleIntersectionSelect = (id) => {
    if (activeIntersection && activeIntersection.id === id) {
      setActiveIntersection(null);
      console.log(
        `Đã hủy theo dõi ngã tư: ${
          intersections.find((i) => i.id === id)?.label
        }. Dashboard đã được reset.`
      );
    } else {
      const newActive = intersections.find((i) => i.id === id);
      if (newActive) {
        setActiveIntersection(newActive);
        console.log(
          `Đã chọn ngã tư: ${newActive.label}. Dashboard đã được cập nhật chi tiết.`
        );
      }
    }
  };

  const refreshActiveDashboard = async () => {
    if (activeIntersection) {
      const result = await api.fetchRealtimeData(activeIntersection.id);
      if (result.success) {
        setIntersections((prev) =>
          prev.map((i) => (i.id === result.data.id ? result.data : i))
        );
        setActiveIntersection(result.data);
        console.log(`Dữ liệu của ${result.data.label} đã được làm mới.`);
      } else {
        alert("Lỗi tải lại dữ liệu!");
      }
    } else {
      alert("Vui lòng chọn một ngã tư để tải lại dữ liệu.");
    }
  };

  const openLiveView = (camera) => {
    if (!camera) return;
    setLiveCamera(camera);
    console.log(`Mở luồng chi tiết cho camera: ${camera.name || camera.id}`);
  };

  const closeLiveView = () => {
    if (liveCamera?.mediaStream && liveCamera.stopOnClose) {
      try {
        liveCamera.mediaStream.getTracks().forEach((t) => t.stop());
      } catch (e) {
        // ignore
      }
    }
    setLiveCamera(null);
  };

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

export default App;
function LiveModal({ camera, onClose }) {
  const videoRef = useRef(null);

  React.useEffect(() => {
    const el = videoRef.current;
    if (!el) return;

    if (!camera) {
      el.srcObject = null;
      el.src = "";
      return;
    }

    if (camera.mediaStream) {
      el.srcObject = camera.mediaStream;
      el.play().catch(() => {});
      return;
    }

    if (camera.streamUrl) {
      el.srcObject = null;
      el.src = camera.streamUrl;
      el.play().catch(() => {});
      return;
    }

    el.srcObject = null;
    el.src = "";
  }, [camera]);

  // ESC
  React.useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  React.useEffect(() => {
    const prev = document.body.style.overflow;
    if (camera) document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
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
        background: "rgba(0,0,0,0.7)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 2000,
      }}
    >
      <div
        className="ch-modal"
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "92%",
          maxWidth: 1200,
          maxHeight: "92vh",
          background: "#0b1220",
          borderRadius: 10,
          padding: 12,
          display: "flex",
          flexDirection: "column",
        }}
      >
        <div
          className="ch-modal-header"
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            color: "#fff",
            marginBottom: 8,
          }}
        >
          <h3 style={{ margin: 0 }}>{camera.name || camera.id}</h3>
          <button
            onClick={onClose}
            aria-label="Đóng"
            style={{
              background: "transparent",
              border: "none",
              color: "#fff",
              fontSize: 18,
              cursor: "pointer",
            }}
          >
            ✕
          </button>
        </div>

        <div
          className="ch-modal-body"
          style={{
            flex: "1 1 auto",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <video
            ref={videoRef}
            className="ch-modal-video"
            controls
            autoPlay
            playsInline
            poster={camera.thumbnail || undefined}
            style={{
              width: "100%",
              height: "100%",
              maxHeight: "calc(92vh - 140px)",
              objectFit: "contain",
              background: "#000",
              borderRadius: 6,
            }}
          />
        </div>

        <div
          className="ch-modal-footer"
          style={{ paddingTop: 8, color: "#cbd5e1", fontSize: 13 }}
        >
          <small>Camera ID: {camera.id}</small>
        </div>
      </div>
    </div>
  );
}
