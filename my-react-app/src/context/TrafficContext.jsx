import React, { createContext, useState, useEffect, useContext } from "react";
import axios from "axios";

const TrafficContext = createContext();
const API_URL = "http://localhost:3000/api";

export const TrafficProvider = ({ children }) => {
  const [intersections, setIntersections] = useState([]);
  const [activeIntersection, setActiveIntersection] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchIntersections = async () => {
      try {
        const res = await axios.get(`${API_URL}/intersections`);

        if (res.data && res.data.length > 0) {
          console.log("✅ Raw Data from DB:", res.data);

          //  Map dữ liệu DB sang UI cũ --- chắc phải sửa sidebar
          const formattedData = res.data.map((item) => ({
            ...item, // Giữ lại id, latitude, longitude, cameras...

            // Map các trường DB sang trường UI cũ
            label: item.name,
            details: item.description || "Chưa có mô tả",

            // Thêm các trường giả định để Sidebar không bị lỗi
            status: "tracking",
            area: "Khu vực chính",
          }));
          // ------

          setIntersections(formattedData);
          setActiveIntersection(formattedData[0]);
        }
      } catch (err) {
        console.error("❌ Lỗi tải ngã tư:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchIntersections();
  }, []);

  const [theme, setTheme] = useState("theme-dark");

  const handleIntersectionSelect = (id) => {
    const found = intersections.find((i) => i.id === id);
    if (found) {
      setActiveIntersection(found);
    }
  };

  const toggleTheme = () => {
    setTheme((prev) => (prev === "theme-dark" ? "theme-light" : "theme-dark"));
  };

  const contextValue = {
    theme,
    toggleTheme,
    intersections,
    activeIntersection,
    handleIntersectionSelect,
    refreshActiveDashboard: async () => {},
    loading,
    alerts: [],
    unreadAlertCount: 0,
    markAlertsAsRead: () => {},
    user: { role: "admin", username: "admin", fullName: "Quản trị viên" },
  };

  return (
    <TrafficContext.Provider value={contextValue}>
      {children}
    </TrafficContext.Provider>
  );
};

export const useTraffic = () => {
  const context = useContext(TrafficContext);
  if (!context)
    throw new Error("useTraffic must be used within TrafficProvider");
  return context;
};
