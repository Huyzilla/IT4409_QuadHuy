import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import { api, initialIntersectionData } from './data/mockData';

const getInitialTheme = () => {
    const savedTheme = localStorage.getItem('traffic-monitor-theme');
    if (savedTheme) return savedTheme;
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches) {
        return 'theme-light';
    }
    return 'theme-dark';
};

const App = () => {
    const [theme, setTheme] = useState(getInitialTheme);

    const [intersections, setIntersections] = useState(initialIntersectionData);

    const [activeIntersection, setActiveIntersection] = useState(
        intersections.find(i => i.id === 'A') || null
    );

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
            console.log(`Đã hủy theo dõi ngã tư: ${intersections.find(i => i.id === id)?.label}. Dashboard đã được reset.`);
        } else {
            // Chọn ngã tư mới
            const newActive = intersections.find(i => i.id === id);
            if (newActive) {
                setActiveIntersection(newActive);
                console.log(`Đã chọn ngã tư: ${newActive.label}. Dashboard đã được cập nhật chi tiết.`);
            }
        }
    };

    const refreshActiveDashboard = async () => {
        if (activeIntersection) {
            const result = await api.fetchRealtimeData(activeIntersection.id);
            if (result.success) {
                // Cập nhật lại danh sách intersections và activeIntersection
                setIntersections(prev => prev.map(i => i.id === result.data.id ? result.data : i));
                setActiveIntersection(result.data);
                console.log(`Dữ liệu của ${result.data.label} đã được làm mới.`);
            } else {
                alert('Lỗi tải lại dữ liệu!');
            }
        } else {
            alert('Vui lòng chọn một ngã tư để tải lại dữ liệu.');
        }
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
                onLiveView={() => alert('Mở luồng camera trực tiếp (Simulated)...')}
            />
        </div>
    );
};

export default App;