import React, { useEffect, useState } from "react";
import axios from "axios";

// Dựa trên file main.ts: app.setGlobalPrefix('api')
const API_URL = "http://localhost:3000/api";

const Dashboard = ({ onLiveView }) => {
  // 1. State lưu danh sách Camera lấy từ DB
  const [cameras, setCameras] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // 2. Gọi API lấy danh sách Camera khi mở trang
  useEffect(() => {
    const fetchCameras = async () => {
      try {
        // Gọi API: GET http://localhost:3000/api/cameras
        const res = await axios.get(`${API_URL}/cameras`);
        if (res.data) {
          console.log("✅ Đã lấy được Camera từ DB:", res.data);
          setCameras(res.data);
        }
      } catch (err) {
        console.error("❌ Lỗi kết nối Backend:", err);
        setError(
          "Không thể kết nối đến Server (http://localhost:3000). Hãy kiểm tra lại Backend!"
        );
      } finally {
        setLoading(false);
      }
    };

    fetchCameras();
  }, []);

  // 3. Hàm tạo dữ liệu giả định (Hardcode) để test giao diện trước
  const getFakeTrafficData = (camId) => {
    return {
      vehicles: Math.floor(Math.random() * 30), // Giả định số xe từ 0-30
      light: camId % 2 === 0 ? "RED" : "GREEN", // Giả định chẵn là Đỏ, lẻ là Xanh
      remaining: 15,
      statusLabel: "Ổn định (Giả định)",
      statusClass: "medium-traffic",
    };
  };

  // Hiển thị màn hình Loading hoặc Lỗi
  if (loading)
    return (
      <div style={{ padding: 20, color: "white" }}>
        ⏳ Đang tải danh sách Camera từ Server...
      </div>
    );
  if (error)
    return <div style={{ padding: 20, color: "#FC8181" }}>⚠️ {error}</div>;

  return (
    <main className="main-content">
      <header className="main-header">
        <h1 className="page-title">
          Giám sát Giao thông (Dữ liệu Camera từ DB)
        </h1>
      </header>

      {cameras.length === 0 ? (
        <div style={{ color: "white", textAlign: "center" }}>
          Chưa có Camera nào trong Database. Hãy thêm dữ liệu bằng Prisma
          Studio.
        </div>
      ) : (
        <div
          className="dashboard-grid"
          style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}
        >
          {cameras.map((camera) => {
            // Lấy thông số giả định để hiển thị cho đẹp
            const fakeData = getFakeTrafficData(camera.id);

            return (
              <div
                key={camera.id}
                className="segment-card"
                style={{
                  display: "flex",
                  flexDirection: "column",
                  padding: 15,
                  background: "#2D3748",
                  borderRadius: 10,
                  color: "white",
                }}
              >
                {/* --- PHẦN DỮ LIỆU THẬT TỪ DATABASE --- */}
                <div
                  className="segment-thumb"
                  style={{
                    height: 200,
                    background: "black",
                    borderRadius: 8,
                    overflow: "hidden",
                    marginBottom: 10,
                  }}
                >
                  {camera.videoSource ? (
                    <video
                      src={camera.videoSource}
                      muted
                      playsInline
                      autoPlay
                      loop
                      style={{
                        width: "100%",
                        height: "100%",
                        objectFit: "cover",
                      }}
                      onError={(e) => {
                        e.target.style.display = "none"; // Ẩn video nếu link lỗi
                        e.target.parentNode.innerHTML =
                          '<div style="display:flex;justify-content:center;align-items:center;height:100%;color:gray">Link Video hỏng</div>';
                      }}
                    />
                  ) : (
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "center",
                        alignItems: "center",
                        height: "100%",
                        color: "gray",
                      }}
                    >
                      Chưa có Video Source
                    </div>
                  )}
                </div>
                <h3 style={{ color: "#63B3ED", margin: "0 0 10px 0" }}>
                  {camera.name}
                </h3>

                {/* --- PHẦN DỮ LIỆU GIẢ ĐỊNH --- */}
                <div
                  style={{
                    background: "rgba(255,255,255,0.1)",
                    padding: 10,
                    borderRadius: 5,
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      marginBottom: 5,
                    }}
                  >
                    <span>Trạng thái đèn:</span>
                    <span
                      style={{
                        fontWeight: "bold",
                        color:
                          fakeData.light === "GREEN" ? "#48BB78" : "#FC8181",
                      }}
                    >
                      {fakeData.light} ({fakeData.remaining}s)
                    </span>
                  </div>
                  <div
                    style={{ display: "flex", justifyContent: "space-between" }}
                  >
                    <span>Mật độ xe (Giả):</span>
                    <span>{fakeData.vehicles} xe</span>
                  </div>
                  <div
                    style={{
                      marginTop: 5,
                      fontSize: 12,
                      fontStyle: "italic",
                      color: "#A0AEC0",
                    }}
                  >
                    *Dữ liệu AI đang giả lập
                  </div>
                </div>

                <button
                  style={{
                    marginTop: 10,
                    padding: "8px",
                    cursor: "pointer",
                    background: "#3182CE",
                    color: "white",
                    border: "none",
                    borderRadius: 5,
                  }}
                  onClick={() => onLiveView(camera)}
                >
                  Xem chi tiết
                </button>
              </div>
            );
          })}
        </div>
      )}
    </main>
  );
};

export default Dashboard;
