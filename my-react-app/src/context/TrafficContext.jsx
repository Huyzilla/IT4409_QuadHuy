import React, { createContext, useState, useEffect, useContext } from 'react';
import { api } from '../data/mockApi';

const TrafficContext = createContext();

const getInitialTheme = () => {
    const savedTheme = localStorage.getItem('traffic-monitor-theme');
    if (savedTheme) return savedTheme;
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches) {
        return 'theme-light';
    }
    return 'theme-dark';
};

export const TrafficProvider = ({ children }) => {
    const [theme, setTheme] = useState(getInitialTheme);
    const [intersections, setIntersections] = useState([]);
    const [alerts, setAlerts] = useState([]);
    const [activeIntersection, setActiveIntersection] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const loadInitialData = async () => {
            try {
                setLoading(true);
                const [intRes, alertRes] = await Promise.all([
                    api.fetchIntersections(),
                    api.fetchAlerts()
                ]);

                if (intRes.success) {
                    const data = intRes.data;
                    setIntersections(data);
                    const defaultIntersection = data.find(i => i.id === 'A') || data[0];
                    setActiveIntersection(defaultIntersection);
                }

                if (alertRes.success) {
                    setAlerts(alertRes.data);
                }
            } catch (err) {
                console.error('Lỗi tải dữ liệu ban đầu:', err);
                alert('Không thể tải dữ liệu. Vui lòng thử lại.');
            } finally {
                setLoading(false);
            }
        };

        loadInitialData();
    }, []);

    useEffect(() => {
        document.body.className = theme;
        localStorage.setItem('traffic-monitor-theme', theme);
    }, [theme]);

    const toggleTheme = () => {
        setTheme(prev => (prev === 'theme-dark' ? 'theme-light' : 'theme-dark'));
    };

    const handleIntersectionSelect = (id) => {
        if (activeIntersection && activeIntersection.id === id) {
            setActiveIntersection(null);
            console.log(`Đã hủy theo dõi ngã tư: ${id}`);
        } else {
            const newActive = intersections.find(i => i.id === id);
            if (newActive) {
                setActiveIntersection(newActive);
                console.log(`Đã chọn ngã tư: ${newActive.label}`);
            }
        }
    };

    const refreshActiveDashboard = async () => {
        if (!activeIntersection) {
            alert('Vui lòng chọn một ngã tư để tải lại dữ liệu.');
            return false;
        }

        const result = await api.fetchRealtimeData(activeIntersection.id);
        if (result.success) {
            const updated = result.data;
            setIntersections(prev =>
                prev.map(i => (i.id === updated.id ? updated : i))
            );
            setActiveIntersection(updated);
            console.log(`Dữ liệu của ${updated.label} đã được làm mới.`);
            return true;
        } else {
            alert('Lỗi tải lại dữ liệu!');
            return false;
        }
    };

    const markAlertsAsRead = () => {
        setAlerts(prev => prev.map(a => ({ ...a, read: true })));
        alert('Đã xem tất cả các cảnh báo.');
    };

    const unreadAlertCount = alerts.filter(a => !a.read).length;

    const contextValue = {
        theme,
        toggleTheme,
        intersections,
        activeIntersection,
        handleIntersectionSelect,
        refreshActiveDashboard,
        alerts,
        unreadAlertCount,
        markAlertsAsRead,
        loading,
        user: {
            role: 'admin',
            username: 'admin_traffic',
            fullName: 'Quản trị viên giao thông'
        }
    };

    return (
        <TrafficContext.Provider value={contextValue}>
            {children}
        </TrafficContext.Provider>
    );
};

export const useTraffic = () => {
    const context = useContext(TrafficContext);
    if (!context) {
        throw new Error('useTraffic must be used within TrafficProvider');
    }
    return context;
};