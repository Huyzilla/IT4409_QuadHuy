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
const API_URL = "http://localhost:3000/api";

const rtspToHls = (videoSource) => {
  if (!videoSource || typeof videoSource !== 'string') return null;
  if (!videoSource.startsWith('rtsp://')) return null;

  // Example seeded value: rtsp://mediamtx:8554/north
  const match = videoSource.match(/^rtsp:\/\/[^/]+\/(.+)$/);
  if (!match) return null;
  const streamPath = match[1];

  // MediaMTX HLS default: http://<host>:8888/<path>/index.m3u8
  return `http://localhost:8888/${streamPath}/index.m3u8`;
};

export const TrafficProvider = ({ children }) => {
  const [intersections, setIntersections] = useState([]);
  const [activeIntersection, setActiveIntersection] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchIntersections = async (preferredActiveId) => {
    setLoading(true);
    try {
      const res = await axios.get(`${API_URL}/intersections`);

      if (res.data && res.data.length > 0) {
        console.log("✅ Raw Data from DB:", res.data);

        const formattedData = res.data.map((item) => ({
          ...item,

          cameras: (item.cameras || []).map((cam) => {
            const hls = rtspToHls(cam.videoSource);
            return {
              ...cam,
              rtspSource: cam.videoSource,
              videoSource: hls || cam.videoSource,
            };
          }),

          label: item.name,
          details: item.description || "Chưa có mô tả",
          status: "tracking",
          area: "Khu vực chính",
        }));

        setIntersections(formattedData);

        const nextActive =
          (preferredActiveId
            ? formattedData.find((x) => x.id === preferredActiveId)
            : null) || formattedData[0];
        setActiveIntersection(nextActive);
      } else {
        setIntersections([]);
        setActiveIntersection(null);
      }
    } catch (err) {
      console.error("❌ Lỗi tải ngã tư:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
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
    refreshActiveDashboard: async () => {
      await fetchIntersections(activeIntersection?.id);
    },
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
