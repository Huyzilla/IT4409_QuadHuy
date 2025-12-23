import React, { createContext, useState, useEffect, useContext } from "react";
import { useAuth } from "./AuthContext";
import { api } from "../api";
import axios from "axios";

const API_URL = "http://localhost:3000/api";
const MOCK_ALERTS = [
  {
    id: 1,
    type: "heavy",
    message:
      "Ùn tắc nghiêm trọng tại Ngã tư Nguyễn Chí Thanh - Láng (Camera A1).",
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
const trafficAxios = axios.create({
  baseURL: API_URL,
  withCredentials: true, // : Cho phép gửi/nhận Cookie
});

trafficAxios.interceptors.request.use(
  (config) => {
    // Lấy token từ localStorage (do AuthContext lưu vào đây)
    const token = localStorage.getItem("traffic-access-token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

const HLS_BASE_URL = import.meta.env.VITE_HLS_BASE_URL || "http://localhost:8888";
const normalizeBase = (url) => String(url || "").replace(/\/+$/, "");

const rtspToHls = (videoSource) => {
  if (!videoSource || typeof videoSource !== "string") return null;
  if (!videoSource.startsWith("rtsp://")) return null;

  // Example seeded value: rtsp://mediamtx:8554/north
  const match = videoSource.match(/^rtsp:\/\/[^/]+\/(.+)$/);
  if (!match) return null;
  const streamPath = match[1];

  // MediaMTX HLS default: http(s)://<host>/<path>/index.m3u8
  return `${normalizeBase(HLS_BASE_URL)}/${streamPath}/index.m3u8`;
};

export const TrafficProvider = ({ children }) => {
  const { accessToken, user } = useAuth();
  const isAdmin = user?.role === "admin" || user?.roleId === 0;
  const [intersections, setIntersections] = useState([]);
  const [activeIntersection, setActiveIntersection] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchIntersections = async (preferredActiveId) => {
    setLoading(true);
    try {
      const res = await api.get(`/intersections`);

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
        console.debug("TrafficContext: intersections updated", {
          count: formattedData.length,
        });

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
      setIntersections([]);
      setActiveIntersection(null);
    } finally {
      setLoading(false);
    }
  };

  // ĐỊNH NGHĨA HÀM refreshActiveDashboard-------------------
  const refreshActiveDashboard = async () => {
    if (activeIntersection) {
      await fetchIntersections(activeIntersection.id);
    } else {
      await fetchIntersections();
    }
  };

  useEffect(() => {
    const effectiveToken =
      accessToken || localStorage.getItem("traffic-access-token");
    if (!effectiveToken) {
      setLoading(false);
      setIntersections([]);
      setActiveIntersection(null);
      return;
    }

    fetchIntersections();
  }, [accessToken]);

  useEffect(() => {
    const onAuthLogin = () => {
      const effectiveToken =
        accessToken || localStorage.getItem("traffic-access-token");
      if (effectiveToken) fetchIntersections();
    };
    window.addEventListener("auth:login", onAuthLogin);
    return () => window.removeEventListener("auth:login", onAuthLogin);
  }, [accessToken]);

  useEffect(() => {
    const onSocketConnect = () => {
      const effectiveToken =
        accessToken || localStorage.getItem("traffic-access-token");
      if (effectiveToken) fetchIntersections();
    };
    window.addEventListener("socket:connect", onSocketConnect);
    return () => window.removeEventListener("socket:connect", onSocketConnect);
  }, [accessToken]);

  const [theme, setTheme] = useState("theme-dark");
  const toggleTheme = () => {
    setTheme((prev) => (prev === "theme-dark" ? "theme-light" : "theme-dark"));
  };

  const handleIntersectionSelect = (id) => {
    const found = intersections.find((i) => i.id === id);
    if (found) {
      setActiveIntersection(found);
    }
  };
  // Hàm tạo Ngã tư --------------------------------------------------------
  const createIntersection = async (data) => {
    if (!isAdmin) {
      alert("Bạn không có quyền thực hiện thao tác này (chỉ quản trị viên).");
      return;
    }
    try {
      // Gọi API POST /intersections
      const res = await api.post(`/intersections`, {
        name: data.name,
        latitude: parseFloat(data.latitude),
        longitude: parseFloat(data.longitude),
        description: data.description || "",
      });

      // Backend trả về object vừa tạo, ta thêm vào đầu danh sách local
      const newIntersection = {
        ...res.data,
        label: res.data.name, // Map cho khớp UI cũ
        details: res.data.description,
        status: "tracking",
        area: "Chưa phân loại",
      };

      setIntersections([newIntersection, ...intersections]);
      alert("Thêm ngã tư thành công!");
    } catch (error) {
      console.error("Lỗi tạo ngã tư:", error);
      alert(
        "Thêm thất bại: " + (error.response?.data?.message || error.message)
      );
    }
  };

  // Hàm sửa Ngã tư -------------------------------------------------------------
  const updateIntersection = async (id, data) => {
    if (!isAdmin) {
      alert("Bạn không có quyền thực hiện thao tác này (chỉ quản trị viên).");
      return;
    }
    try {
      // Gọi API PUT /intersections/:id
      const res = await api.put(`/intersections/${id}`, {
        name: data.name,
        latitude: parseFloat(data.latitude),
        longitude: parseFloat(data.longitude),
        description: data.description || "",
      });

      // Cập nhật lại danh sách local
      setIntersections((prev) =>
        prev.map((item) => {
          if (item.id === id) {
            return {
              ...item,
              ...res.data,
              label: res.data.name,
              details: res.data.description,
            };
          }
          return item;
        })
      );

      // Nếu đang chọn ngã tư này thì update luôn activeIntersection
      if (activeIntersection && activeIntersection.id === id) {
        setActiveIntersection((prev) => ({
          ...prev,
          ...res.data,
          label: res.data.name,
        }));
      }

      alert("Cập nhật thành công!");
    } catch (error) {
      console.error("Lỗi cập nhật:", error);
      alert("Cập nhật thất bại: " + error.message);
    }
  };

  //Hàm xóa Ngã tư ---------------------------------------------------------------
  const deleteIntersection = async (id) => {
    if (!isAdmin) {
      alert("Bạn không có quyền thực hiện thao tác này (chỉ quản trị viên).");
      return;
    }
    if (
      !window.confirm(
        "Bạn chắc chắn muốn xóa ngã tư này? Dữ liệu camera liên quan có thể bị ảnh hưởng."
      )
    )
      return;

    try {
      // Gọi API DELETE /intersections/:id
      await api.delete(`/intersections/${id}`);

      // Xóa khỏi danh sách local
      setIntersections((prev) => prev.filter((item) => item.id !== id));

      // Nếu đang chọn cái bị xóa thì reset active
      if (activeIntersection && activeIntersection.id === id) {
        setActiveIntersection(null);
      }
    } catch (error) {
      console.error("Lỗi xóa:", error);
      alert("Xóa thất bại!");
    }
  };

  // --- quản lí camera ----------------------------------------------------

  // 1. Thêm Camera vào Ngã tư
  const addCamera = async (intersectionId, cameraData) => {
    try {
      const payload = {
        name: cameraData.name,
        videoSource: cameraData.videoSource,
        latitude: parseFloat(cameraData.latitude),
        longitude: parseFloat(cameraData.longitude),
        intersectionId: parseInt(intersectionId), // Quan trọng: Gửi kèm ID ngã tư
      };

      // Gọi API POST /cameras
      const res = await trafficAxios.post("/cameras", payload);

      // Cập nhật State Frontend ngay lập tức (để UI tự hiện camera mới)
      setIntersections((prev) =>
        prev.map((i) => {
          if (i.id === intersectionId) {
            return {
              ...i,
              // Thêm camera mới vào mảng cameras của ngã tư đó
              cameras: [res.data, ...(i.cameras || [])],
            };
          }
          return i;
        })
      );

      // Nếu đang xem ngã tư này thì refresh lại activeIntersection
      if (activeIntersection && activeIntersection.id === intersectionId) {
        refreshActiveDashboard();
      }

      alert("Thêm camera thành công!");
      return true;
    } catch (error) {
      console.error("Lỗi thêm camera:", error);
      alert("Lỗi: " + (error.response?.data?.message || error.message));
      return false;
    }
  };

  // 2. Sửa Camera
  const updateCamera = async (cameraId, cameraData) => {
    try {
      const payload = {
        name: cameraData.name,
        videoSource: cameraData.videoSource,
        latitude: parseFloat(cameraData.latitude),
        longitude: parseFloat(cameraData.longitude),
        // intersectionId: ... (Nếu muốn đổi ngã tư thì gửi thêm)
      };

      const res = await trafficAxios.put(`/cameras/${cameraId}`, payload);

      // Cập nhật State local
      setIntersections((prev) =>
        prev.map((i) => ({
          ...i,
          cameras: (i.cameras || []).map((c) =>
            c.id === cameraId ? { ...c, ...res.data } : c
          ),
        }))
      );

      if (activeIntersection) refreshActiveDashboard();
      alert("Cập nhật thành công!");
      return true;
    } catch (error) {
      console.error("Lỗi sửa camera:", error);
      alert("Lỗi: " + error.message);
      return false;
    }
  };

  // 3. Xóa Camera
  const deleteCamera = async (cameraId, intersectionId) => {
    if (!window.confirm("Bạn có chắc muốn xóa camera này không?")) return;

    try {
      await trafficAxios.delete(`/cameras/${cameraId}`);

      // Xóa khỏi State local
      setIntersections((prev) =>
        prev.map((i) => {
          if (i.id === intersectionId) {
            return {
              ...i,
              cameras: i.cameras.filter((c) => c.id !== cameraId),
            };
          }
          return i;
        })
      );

      if (activeIntersection) refreshActiveDashboard();
    } catch (error) {
      console.error("Lỗi xóa camera:", error);
      alert("Xóa thất bại!");
    }
  };

  const [alerts, setAlerts] = useState([]);
  const unreadAlertCount = alerts.filter((a) => !a.isRead).length;

  const addAlert = (newAlert) => {
    setAlerts((prev) => {
      const isDuplicate = prev.some(
        (a) =>
          a.type === newAlert.type &&
          a.cameraId === newAlert.cameraId &&
          Date.now() - a.timestamp < 60_000
      );
      if (isDuplicate) return prev;

      return [
        {
          id: Date.now() + Math.random(),
          isRead: false,
          createdAt: new Date().toISOString(),
          ...newAlert,
        },
        ...prev,
      ].slice(0, 50);
    });
  };

  const markAlertsAsRead = (alertIds) => {
    setAlerts((prev) =>
      prev.map((alert) => {
        if (alertIds.includes(alert.id)) {
          return { ...alert, isRead: true };
        }
        return alert;
      })
    );
  };

  const markAllAsRead = () => {
    setAlerts((prev) => prev.map((alert) => ({ ...alert, isRead: true })));
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
    createIntersection,
    updateIntersection,
    deleteIntersection,
    addCamera,
    updateCamera,
    deleteCamera,
    user,
    isAdmin,
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
