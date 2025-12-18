import React, { createContext, useState, useEffect, useContext } from "react";
import axios from "axios";

const MOCK_ALERTS = [
    {
        id: 1,
        type: "heavy",
        message: "Ùn tắc nghiêm trọng tại Ngã tư Nguyễn Chí Thanh - Láng (Camera A1).",
        time: "1 phút trước",
        isRead: false,
    },
    {
        id: 2,
        type: "medium",
        message: "Mật độ tăng nhanh tại Ngã tư Chùa Bộc - Phạm Ngọc Thạch.",
        time: "15 phút trước",
        isRead: false,
    },
    {
        id: 3,
        type: "system",
        message: "Camera B3 bị mất kết nối lúc 19:30.",
        time: "2 giờ trước",
        isRead: true,
    },
];

const TrafficContext = createContext();
const API_URL = "http://localhost:3001/api";

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

  const [alerts, setAlerts] = useState([]);
  const unreadAlertCount = alerts.filter(a => !a.isRead).length;

    useEffect(() => {
        if (intersections.length === 0) return;

        const interval = setInterval(() => {
            const randomIdx = Math.floor(Math.random() * intersections.length);
            const intersection = intersections[randomIdx];

            const eventType = Math.random();

            if (eventType > 0.8) {
                addAlert({
                    type: "heavy",
                    message: `[Nguy cấp] ${intersection.label} đang ùn tắc nghiêm trọng, cần điều tiết!`,
                    intersectionId: intersection.id,
                    timestamp: Date.now()
                });
            }
            else if (eventType > 0.6) {
                addAlert({
                    type: "medium",
                    message: `[Cảnh báo] Mật độ phương tiện tại ${intersection.label} đang tăng nhanh (Xu hướng tăng).`,
                    intersectionId: intersection.id,
                    timestamp: Date.now()
                });
            }
            else if (eventType > 0.5) {
                const camNames = ["A1", "B2", "C3", "D1"];
                const randomCam = camNames[Math.floor(Math.random() * camNames.length)];
                addAlert({
                    type: "system",
                    message: `[Hệ thống] Camera ${randomCam} tại ${intersection.label} mất tín hiệu video.`,
                    intersectionId: intersection.id,
                    timestamp: Date.now()
                });
            }
        }, 20000);

        return () => clearInterval(interval);
    }, [intersections]);

  const addAlert = (newAlert) => {
    setAlerts(prev => {
        const isDuplicate = prev.slice(0, 10).some(a =>
            a.intersectionId === newAlert.intersectionId &&
            (new Date().getTime() - a.timestamp < 60000)
        );
        if (isDuplicate) return prev;

        return [{
            id: Date.now() + Math.random(),
            isRead: false,
            createdAt: new Date().toISOString(),
            ...newAlert
        }, ...prev].slice(0, 20);
    });
  };

  const markAlertsAsRead = (alertIds) => {
    setAlerts(prev => prev.map(alert => {
        if (alertIds.includes(alert.id)) {
            return { ...alert, isRead: true };
        }
        return alert;
    }));
  };

  const markAllAsRead = () => {
    setAlerts(prev => prev.map(alert => ({ ...alert, isRead: true })));
  };

  const contextValue = {
    theme,
    toggleTheme,
    intersections,
    activeIntersection,
    handleIntersectionSelect,
    refreshActiveDashboard: async () => {},
    loading,
    alerts,
    addAlert,
    unreadAlertCount,
    markAlertsAsRead,
    markAllAsRead,
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
