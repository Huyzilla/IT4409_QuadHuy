import React, { useState, useEffect } from "react";
import axios from "axios";
import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer,
} from "recharts";
import { useTraffic } from "../context/TrafficContext";

const API_URL = "http://localhost:3000/api";

export default function HistoryAnalysis() {
    const { activeIntersection } = useTraffic();
    const [stats, setStats] = useState([]);
    const [loading, setLoading] = useState(true);
    const [timeRange, setTimeRange] = useState("24h");

    useEffect(() => {
        fetchHistory();
    }, [timeRange, activeIntersection]);

    const fetchHistory = async () => {
        try {
            setLoading(true);
            // const res = await axios.get(`${API_URL}/traffic-stats/history?range=${timeRange}&intersectionId=${activeIntersection?.id}`);

            setStats(generateFakeHistory(timeRange));
        } catch (err) {
            setStats(generateFakeHistory(timeRange));
        } finally {
            setLoading(false);
        }
    };

    const generateFakeHistory = (range) => {
        const data = [];
        const now = Date.now();
        let points = 24;
        let intervalHours = 1;

        if (range === "7d") { points = 7 * 24; intervalHours = 1; }
        if (range === "30d") { points = 30; intervalHours = 24; }

        for (let i = points; i >= 0; i--) {
            const time = new Date(now - i * intervalHours * 60 * 60 * 1000);
            const hour = time.getHours();

            let baseDensity = 0.2;
            if ((hour >= 7 && hour <= 9) || (hour >= 17 && hour <= 19)) {
                baseDensity = 0.65 + Math.random() * 0.3;
            } else if (hour >= 22 || hour <= 5) {
                baseDensity = 0.05 + Math.random() * 0.1;
            } else {
                baseDensity = 0.3 + Math.random() * 0.4;
            }

            data.push({
                time:
                    range === "24h"
                        ? time.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })
                        : range === "7d"
                            ? time.toLocaleDateString("vi-VN", { weekday: "short", day: "numeric", month: "short" })
                            : time.toLocaleDateString("vi-VN"),
                density: Math.min(1, baseDensity),
                vehicles: Math.floor(baseDensity * 200 + Math.random() * 50),
            });
        }
        return data;
    };

    if (loading) {
        return (
            <div className="main-content" style={{ display: "grid", placeItems: "center", height: "100vh", color: "#94a3b8" }}>
                <div>Đang tải dữ liệu lịch sử...</div>
            </div>
        );
    }

    return (
        <main className="main-content">
            <header className="main-header">
                <h1 className="page-title">
                    Lịch sử & Phân tích giao thông
                    <span style={{ fontSize: "15px", color: "#94a3b8", marginLeft: "12px", fontWeight: "normal" }}>
            {activeIntersection ? `— ${activeIntersection.label}` : "— Toàn mạng lưới"}
          </span>
                </h1>

                <div className="header-actions">
                    <select
                        value={timeRange}
                        onChange={(e) => setTimeRange(e.target.value)}
                        className="custom-select"
                        style={{ height: "40px", marginRight: "12px" }}
                    >
                        <option value="24h">24 giờ gần nhất</option>
                        <option value="7d">7 ngày gần nhất</option>
                        <option value="30d">30 ngày gần nhất</option>
                    </select>

                    <button className="action-btn primary">
                        Export Excel
                    </button>
                </div>
            </header>

            {/* Biểu đồ chính */}
            <div className="chart-card">
                <h3>Mật độ giao thông theo thời gian</h3>
                <ResponsiveContainer width="100%" height={420}>
                    <LineChart data={stats} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="4 4" stroke="#334155" />
                        <XAxis dataKey="time" stroke="#94a3b8" />
                        <YAxis stroke="#94a3b8" domain={[0, 1]} ticks={[0, 0.3, 0.6, 1.0]} />
                        <Tooltip
                            contentStyle={{ background: "#1e293b", border: "none", borderRadius: "12px", boxShadow: "0 10px 30px rgba(0,0,0,0.6)" }}
                            labelStyle={{ color: "#e2e8f0", fontWeight: "600" }}
                        />
                        <Legend />
                        <Line
                            type="monotone"
                            dataKey="density"
                            stroke="#8b5cf6"
                            strokeWidth={4}
                            dot={false}
                            name="Mật độ (0 → 1)"
                            animationDuration={800}
                        />
                        <Line
                            type="monotone"
                            dataKey="vehicles"
                            stroke="#ec4899"
                            strokeWidth={3}
                            dot={false}
                            name="Số xe ước tính"
                            strokeDasharray="8 8"
                        />
                    </LineChart>
                </ResponsiveContainer>
            </div>

            {/* 3 ô thống kê nhanh */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 20, marginTop: 32 }}>
                <div className="stat-box heavy">
                    <div className="stat-value">18</div>
                    <div className="stat-label">Lần ùn tắc kéo dài</div>
                </div>
                <div className="stat-box medium">
                    <div className="stat-value">07:00 – 09:00</div>
                    <div className="stat-label">Giờ cao điểm sáng</div>
                </div>
                <div className="stat-box low">
                    <div className="stat-value">4.821</div>
                    <div className="stat-label">Tổng phương tiện hôm nay</div>
                </div>
            </div>
        </main>
    );
}