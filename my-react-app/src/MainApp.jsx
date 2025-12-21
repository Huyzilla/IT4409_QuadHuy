import React, { useState, useEffect } from "react";
import { Routes, Route } from "react-router-dom";
import { useTraffic } from "./context/TrafficContext";
import { useAuth } from "./context/AuthContext";
import Sidebar from "./components/Sidebar";
import Dashboard from "./components/Dashboard";
import AccountSettings from "./pages/AccountSettings.jsx";
import CameraGridWithModal from "./components/CameraGridWithModal";
import AIBotIcon from "./assets/chatbot1.png";

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
        maxWidth: "420px",
        padding: "30px",
        background: "var(--color-bg-secondary)",
      }}
    >
      <h3
        style={{
          marginBottom: "15px",
          fontSize: "22px",
          fontWeight: "700",
          color: "var(--color-traffic-heavy)",
        }}
      >
        Xác nhận Đăng xuất
      </h3>

      <p
        style={{
          marginBottom: "30px",
          color: "var(--color-text-secondary)",
          fontSize: "16px",
        }}
      >
        Bạn có chắc chắn muốn đăng xuất khỏi hệ thống Traffic Monitor không?
      </p>

      <div
        className="modal-actions"
        style={{ display: "flex", justifyContent: "flex-end", gap: "15px" }}
      >
        <button
          onClick={onCancel}
          className="action-btn"
          style={{
            background: "var(--color-bg-tertiary)",
            color: "var(--color-text-primary)",
            padding: "10px 20px",
            borderRadius: "var(--radius-md)",
          }}
        >
          Hủy bỏ
        </button>
        <button
          onClick={onConfirm}
          className="action-btn primary"
          style={{
            background: "var(--color-traffic-heavy)",
            borderColor: "var(--color-traffic-heavy)",
            padding: "10px 20px",
            borderRadius: "var(--radius-md)",
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
        <div
          className="live-modal-content"
          onClick={(e) => e.stopPropagation()}
          style={{ maxWidth: "600px", padding: "30px" }}
        >
          <div
            className="live-modal-header"
            style={{
              position: "relative",
              background: "none",
              color: "var(--color-text-primary)",
              padding: 0,
            }}
          >
            <h3 className="live-modal-title">{activeIntersection.name}</h3>
            <button
              onClick={closeModal}
              className="btn-close-modal"
              style={{ position: "absolute", top: "-40px", right: "-40px" }}
            >
              ×
            </button>
          </div>
          <p
            style={{ marginTop: "20px", color: "var(--color-text-secondary)" }}
          >
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
          maxWidth: "95%",
          maxHeight: "95vh",
          width: "95%",
          background: "var(--color-bg-primary)", // Đổi màu nền cho modal lớn
          padding: "20px",
        }}
      >
        <div
          className="live-modal-header"
          style={{
            position: "relative",
            background: "none",
            color: "var(--color-text-primary)",
            padding: "0 0 15px 0",
          }}
        >
          <h3 className="live-modal-title">
            Live Grid: {activeIntersection.name}
          </h3>
          <button
            onClick={closeModal}
            className="btn-close-modal"
            style={{
              position: "absolute",
              top: "-10px",
              right: "-10px",
              width: "38px",
              height: "38px",
              fontSize: "20px",
            }}
          >
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
          maxWidth: "90%",
          maxHeight: "90vh",
          width: "fit-content",
          padding: "20px",
          background: "var(--color-bg-primary)",
        }}
      >
        <div
          className="live-modal-header"
          style={{
            position: "relative",
            background: "none",
            color: "var(--color-text-primary)",
            padding: "0 0 15px 0",
          }}
        >
          <h3
            className="live-modal-title"
            style={{
              maxWidth: "calc(100% - 60px)",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {liveCamera.name || liveCamera.id}
          </h3>
          <button
            onClick={closeModal}
            className="btn-close-modal"
            style={{
              position: "absolute",
              top: "-10px",
              right: "-10px",
              width: "38px",
              height: "38px",
              fontSize: "20px",
            }}
          >
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
          style={{ maxHeight: "80vh", maxWidth: "100%", objectFit: "contain" }}
          onError={(e) => {
            e.target.parentNode.innerHTML = `
                            <div style="padding:40px; text-align:center; color:#fca5a5; background:rgba(0,0,0,0.5); height:100%; display:flex; align-items:center; justify-content:center; flex-direction:column; min-height: 400px; width: 600px;">
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
  );
};

const AIChatbox = () => {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [position, setPosition] = useState({
    x: window.innerWidth - 100,
    y: window.innerHeight - 100,
  });
  const [isDragging, setIsDragging] = useState(false);
  const [rel, setRel] = useState({ x: 0, y: 0 });

  const [input, setInput] = useState("");
  const [messages, setMessages] = useState([
    {
      role: "bot",
      text: `Chào ${
        user?.fullName || "bạn"
      }, tôi đã sẵn sàng phân tích dữ liệu. Bạn cần hỏi gì không?`,
    },
  ]);

  const onMouseDown = (e) => {
    if (e.button !== 0) return;
    setIsDragging(true);
    const ref = e.currentTarget.getBoundingClientRect();
    setRel({ x: e.pageX - ref.left, y: e.pageY - ref.top });
    e.stopPropagation();
    e.preventDefault();
  };

  useEffect(() => {
    const onMouseMove = (e) => {
      if (!isDragging) return;
      setPosition({
        x: e.pageX - rel.x,
        y: e.pageY - rel.y,
      });
    };
    const onMouseUp = () => setIsDragging(false);

    if (isDragging) {
      document.addEventListener("mousemove", onMouseMove);
      document.addEventListener("mouseup", onMouseUp);
    }
    return () => {
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseup", onMouseUp);
    };
  }, [isDragging, rel]);

  const handleSendMessage = async () => {
    if (!input.trim()) return;
    const userMessage = input; 
    setInput("");
    setMessages((prev) => [...prev, { role: "user", text: userMessage }]);
    const loadingId = Date.now();
    setMessages((prev) => [
        ...prev,
        { role: "bot", text: "...", isLoading: true, id: loadingId }
    ]);

    try {
        const response = await fetch('http://localhost:3000/api/chat', { 
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ message: userMessage }),
        });

        const data = await response.json();

        setMessages((prev) => {
            const newMessages = prev.filter(msg => msg.id !== loadingId);
            return [
                ...newMessages,
                { role: "bot", text: data.reply } 
            ];
        });

    } catch (error) {
        console.error("Lỗi chat:", error);
        setMessages((prev) => {
             const newMessages = prev.filter(msg => msg.id !== loadingId);
             return [
                 ...newMessages,
                 { role: "bot", text: "Xin lỗi, tôi bị mất kết nối tới server." }
             ];
        });
    }
  };

  return (
    <div
      className="ai-chat-container"
      style={{
        position: "fixed",
        left: `${position.x}px`,
        top: `${position.y}px`,
        zIndex: 1000,
        cursor: isDragging ? "grabbing" : "auto",
      }}
    >
      <button
        className="ai-trigger-btn"
        onMouseDown={onMouseDown}
        onClick={() => !isDragging && setIsOpen(!isOpen)}
        style={{
          width: "64px",
          height: "64px",
          background: "none",
          border: "none",
          cursor: isDragging ? "grabbing" : "pointer",
          padding: "0",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          position: "relative",
        }}
      >
        <div className="bot-floating-container">
          <img
            src={AIBotIcon}
            alt="Trợ lý AI"
            style={{
              width: "172px",
              height: "172px",
              objectFit: "contain",
              position: "relative",
              zIndex: 2,
            }}
          />
        </div>
      </button>

      {isOpen && (
        <div
          className="ai-window"
          style={{
            position: "absolute",
            bottom: "85px",
            right: "0",
            width: "380px",
            height: "520px",
            background: "var(--color-bg-secondary)",
            borderRadius: "20px",
            border: "1px solid var(--color-border)",
            boxShadow: "var(--shadow-lg)",
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
            animation: "slideUp 0.3s ease",
          }}
        >
          <div
            className="ai-header"
            style={{
              padding: "20px",
              background: "var(--color-bg-tertiary)",
              borderBottom: "1px solid var(--color-border)",
            }}
          >
            <h4
              style={{
                margin: 0,
                display: "flex",
                alignItems: "center",
                gap: "10px",
              }}
            >
              <span
                className="status-dot"
                style={{
                  background: "#10b981",
                  width: "8px",
                  height: "8px",
                  borderRadius: "50%",
                }}
              ></span>
              Trợ lý Giao thông AI
            </h4>
          </div>

          <div
            className="ai-messages"
            style={{
              flex: 1,
              padding: "20px",
              overflowY: "auto",
              display: "flex",
              flexDirection: "column",
              gap: "15px",
            }}
          >
            {messages.map((msg, idx) => (
              <div
                key={idx}
                className={`msg ${msg.role}`}
                style={{
                  background:
                    msg.role === "bot"
                      ? "var(--color-bg-tertiary)"
                      : "var(--color-accent-blue)",
                  padding: "12px 16px",
                  borderRadius:
                    msg.role === "bot"
                      ? "0 15px 15px 15px"
                      : "15px 15px 0 15px",
                  maxWidth: "85%",
                  fontSize: "14px",
                  alignSelf: msg.role === "bot" ? "flex-start" : "flex-end",
                  color: "white",
                }}
              >
                {msg.text}
              </div>
            ))}
          </div>

          <div
            className="ai-input-area"
            style={{
              padding: "20px",
              borderTop: "1px solid var(--color-border)",
            }}
          >
            <div style={{ position: "relative", display: "flex", gap: "10px" }}>
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={(e) => e.key === "Enter" && handleSendMessage()}
                placeholder="Hỏi về xu hướng ùn tắc..."
                style={{
                  flex: 1,
                  padding: "12px 15px",
                  borderRadius: "12px",
                  border: "1px solid var(--color-border)",
                  background: "var(--color-bg-primary)",
                  color: "white",
                  outline: "none",
                }}
              />
              <button
                onClick={handleSendMessage}
                style={{
                  background: "var(--color-accent-blue)",
                  border: "none",
                  borderRadius: "10px",
                  color: "white",
                  padding: "0 15px",
                  cursor: "pointer",
                }}
              >
                ➤
              </button>
            </div>
          </div>
        </div>
      )}
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
      const sidebar = document.querySelector(".sidebar");
      const alertButton = document.querySelector(".alert-btn");
      const alertPanel = document.querySelector(".alert-dropdown-menu");
      if (showUserDropdown && sidebar && !sidebar.contains(e.target)) {
        setShowUserDropdown(false);
      }
    };
    window.addEventListener("mousedown", closeDropdown);
    return () => window.removeEventListener("mousedown", closeDropdown);
  }, [liveIntersection, liveCamera, showLogoutModal, showUserDropdown]);

  const handleLogoutConfirm = () => {
    logout();
    setShowLogoutModal(false);
    setShowUserDropdown(false);
  };

  const handleToggleDropdown = (forceState) => {
    if (typeof forceState === "boolean") {
      setShowUserDropdown(forceState);
    } else {
      setShowUserDropdown((prev) => !prev);
    }
  };

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

            <Route path="/account" element={<AccountSettings />} />
          </Routes>
        </div>
      </div>

      <AIChatbox />

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
