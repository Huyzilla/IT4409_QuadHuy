import React, { createContext, useState, useEffect, useContext } from "react";
import axios from "axios";

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
const API_URL = "http://localhost:3001/api";

const rtspToHls = (videoSource) => {
    if (!videoSource || typeof videoSource !== "string") return null;
    if (!videoSource.startsWith("rtsp://")) return null;

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
    const [cameraSettings, setCameraSettings] = useState({});

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
                        const savedSettings = cameraSettings[cam.id];
                        return {
                            ...cam,
                            rtspSource: cam.videoSource,
                            videoSource: hls || cam.videoSource,
                            threshold: savedSettings?.threshold ?? cam.threshold ?? 0.7,
                            aiEnabled: savedSettings?.aiEnabled ?? (cam.aiEnabled !== undefined ? cam.aiEnabled : true),
                            maxVehicles: savedSettings?.maxVehicles ?? cam.maxVehicles ?? 70,
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
        try {
            // Gọi API POST /intersections
            const res = await axios.post(`${API_URL}/intersections`, {
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
        try {
            // Gọi API PUT /intersections/:id
            const res = await axios.put(`${API_URL}/intersections/${id}`, {
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
        if (
            !window.confirm(
                "Bạn chắc chắn muốn xóa ngã tư này? Dữ liệu camera liên quan có thể bị ảnh hưởng."
            )
        )
            return;

        try {
            // Gọi API DELETE /intersections/:id
            await axios.delete(`${API_URL}/intersections/${id}`);

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

    const updateCameraSettings = (cameraId, settings) => {
        setCameraSettings(prev => ({
            ...prev,
            [cameraId]: settings
        }));

        // Cập nhật trực tiếp object camera trong intersections
        setIntersections(prevIntersections => 
            prevIntersections.map(intersection => ({
                ...intersection,
                cameras: intersection.cameras.map(cam => 
                    cam.id === cameraId 
                        ? { ...cam, ...settings }
                        : cam
                )
            }))
        );

        // Cập nhật activeIntersection nếu chứa camera này
        setActiveIntersection(prev => {
            if (!prev) return prev;
            return {
                ...prev,
                cameras: prev.cameras.map(cam => 
                    cam.id === cameraId 
                        ? { ...cam, ...settings }
                        : cam
                )
            };
        });
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
        updateCameraSettings,
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
