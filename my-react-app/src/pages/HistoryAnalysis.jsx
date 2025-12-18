import React, { useState, useEffect } from "react";
import {
    LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from "recharts";
import { useTraffic } from "../context/TrafficContext";
import * as XLSX from 'xlsx';

// const API_URL = "http://localhost:3000/api";

const COLOR_PALETTE = ["#8b5cf6", "#10b981", "#f59e0b", "#ef4444", "#06b6d4"];

export default function HistoryAnalysis() {
    const { activeIntersection, intersections } = useTraffic();
    const [stats, setStats] = useState([]);
    const [loading, setLoading] = useState(true);
    const [timeRange, setTimeRange] = useState("24h");
    const [selectedIntersections, setSelectedIntersections] = useState([]);

    useEffect(() => {
        if (activeIntersection && selectedIntersections.includes(activeIntersection.id)) {
            setSelectedIntersections(prev => prev.filter(id => id !== activeIntersection.id));
        }
    }, [activeIntersection]);

    useEffect(() => {
        fetchHistory();
    }, [timeRange, activeIntersection, selectedIntersections]);

    const fetchHistory = async () => {
        try {
            setLoading(true);
            setStats(generateFakeLastHourHistory(selectedIntersections));
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const generateFakeLastHourHistory = (compareIds) => {
        const data = [];
        const now = Date.now();
        const totalMinutes = 60;

        for (let i = totalMinutes - 1; i >= 0; i--) {
            const time = new Date(now - i * 60 * 1000);
            const minutesAgo = i;

            let baseDensity = 0.4 + Math.sin(minutesAgo / 10) * 0.2 + Math.random() * 0.15;

            const hour = time.getHours();
            if ((hour >= 7 && hour <= 9) || (hour >= 17 && hour <= 19)) {
                baseDensity += 0.25 + Math.random() * 0.15;
            }

            const dataPoint = {
                time: time.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" }),
                density: Math.min(1, Math.max(0, baseDensity)),
                vehicles: Math.floor(baseDensity * 220 + Math.random() * 40),
            };

            compareIds.forEach(id => {
                let compareDensity = 0.35 + Math.sin((minutesAgo + id) / 8) * 0.25 + Math.random() * 0.2;
                if ((hour >= 7 && hour <= 9) || (hour >= 17 && hour <= 19)) {
                    compareDensity += 0.2 + Math.random() * 0.15;
                }
                dataPoint[`density_${id}`] = Math.min(1, Math.max(0, compareDensity));
            });

            data.push(dataPoint);
        }

        return data;
    };

    if (loading) {
        return (
            <div
                className="main-content"
                style={{
                    display: "grid",
                    placeItems: "center",
                    height: "100vh",
                    color: "#94a3b8",
                }}
            >
                <div>Đang tải dữ liệu lịch sử...</div>
            </div>
        );
    }

    const handleCompare = (intersectionId) => {
        if (selectedIntersections.includes(intersectionId)) {
            setSelectedIntersections(prev => prev.filter(id => id !== intersectionId));
        } else if (selectedIntersections.length < 3) {
            setSelectedIntersections(prev => [...prev, intersectionId]);
        }
    };

    const handleExportExcel = () => {
        if (!stats || stats.length === 0) return;

        const exportData = stats.map(item => {
            const row = {
                "Thời điểm (Phút)": item.time,
                [`${activeIntersection?.label} (Mật độ)`]: item.density.toFixed(2),
            };

            selectedIntersections.forEach(id => {
                const name = intersections.find(i => i.id === id)?.label || `Ngã tư ${id}`;
                row[`${name} (Mật độ)`] = item[`density_${id}`] ? item[`density_${id}`].toFixed(2) : "0.00";
            });

            row["Số xe dự kiến"] = item.vehicles;
            return row;
        });

        const ws = XLSX.utils.json_to_sheet(exportData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Báo cáo phút");
        XLSX.writeFile(wb, `Bao_cao_Phut_${activeIntersection?.label}.xlsx`);
    };

    return (
        <main className="main-content">
            <header className="main-header">
                <h1 className="page-title">
                    Lịch sử & Phân tích giao thông
                    <span
                        style={{
                            fontSize: "15px",
                            color: "#94a3b8",
                            marginLeft: "12px",
                            fontWeight: "normal",
                        }}
                    >
                        {activeIntersection
                            ? `— ${activeIntersection.label}`
                            : "— Toàn mạng lưới"}
                    </span>
                </h1>

                <div className="header-actions">
                    <div style={{height: "40px", marginRight: "12px", display: "flex", alignItems: "center", color: "#94a3b8", fontSize: "14px"}}>
                        Dữ liệu chi tiết theo từng phút (60 phút gần nhất)
                    </div>
                    <button className="action-btn primary" onClick={handleExportExcel}>
                        Export Excel
                    </button>
                </div>
            </header>

            <div className="comparison-selector" style={{ marginBottom: '20px', display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '14px', color: 'var(--color-text-secondary)', alignSelf: 'center', marginRight: '10px' }}>
                    So sánh với:
                </span>
                {intersections
                    .filter(item => item.id !== activeIntersection?.id)
                    .map(item => (
                        <button
                            key={item.id}
                            onClick={() => handleCompare(item.id)}
                            className={`chip-btn ${selectedIntersections.includes(item.id) ? 'active' : ''}`}
                            style={{
                                padding: '8px 16px',
                                borderRadius: '20px',
                                border: '1px solid var(--color-border)',
                                background: selectedIntersections.includes(item.id) ? 'var(--color-accent-blue)' : 'rgba(255,255,255,0.05)',
                                color: 'white',
                                cursor: 'pointer',
                                transition: 'all 0.3s',
                                fontSize: '13px'
                            }}
                        >
                            {selectedIntersections.includes(item.id) ? '✓ ' : '+ '} {item.label}
                        </button>
                    ))}
            </div>

            <div className="chart-card" style={{ background: 'var(--color-bg-secondary)', padding: '25px', borderRadius: '16px', boxShadow: 'var(--shadow-lg)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                    <h3 style={{ margin: 0 }}>Phân tích tương quan lưu lượng (24h gần nhất)</h3>
                    <div style={{ fontSize: '12px', display: 'flex', gap: '15px' }}>
                        <span style={{ color: COLOR_PALETTE[0] }}>● Nét liền: Tiêu điểm</span>
                        <span style={{ color: '#94a3b8' }}>◌ Nét đứt: So sánh</span>
                    </div>
                </div>

                <ResponsiveContainer width="100%" height={420}>
                    <LineChart data={stats}>
                        <CartesianGrid strokeDasharray="4 4" stroke="#334155" vertical={false} />
                        <XAxis
                            dataKey="time"
                            stroke="#94a3b8"
                            interval="9"
                            tick={{ fontSize: 12 }}
                        />
                        <YAxis stroke="#94a3b8" domain={[0, 1]} tickFormatter={(value) => `${(value * 100).toFixed(0)}%`} />
                        <Tooltip
                            contentStyle={{ background: "#1e293b", border: "none", borderRadius: "12px", boxShadow: 'var(--shadow-lg)' }}
                            itemStyle={{ fontSize: '13px' }}
                        />
                        <Legend
                            verticalAlign="top"
                            align="right"
                            iconType="circle"
                            wrapperStyle={{ paddingBottom: '20px' }}
                        />

                        <Line
                            type="monotone"
                            dataKey="density"
                            stroke={COLOR_PALETTE[0]}
                            strokeWidth={4}
                            dot={false}
                            activeDot={false}
                            name={`${activeIntersection?.label || "Mật độ chính"}`}
                        />

                        {selectedIntersections.map((id, index) => {
                            const target = intersections.find(i => i.id === id);
                            return (
                                <Line
                                    key={id}
                                    type="monotone"
                                    dataKey={`density_${id}`}
                                    stroke={COLOR_PALETTE[(index + 1) % COLOR_PALETTE.length]}
                                    strokeWidth={2}
                                    strokeDasharray="6 6"
                                    dot={false}
                                    name={`${target?.label || id}`}
                                />
                            );
                        })}
                    </LineChart>
                </ResponsiveContainer>
            </div>

            <div className="ranking-section" style={{ marginTop: '40px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '20px' }}>
                    <div>
                        <h3 style={{ margin: 0 }}>🏆 Xếp hạng Điểm nóng Giao thông</h3>
                        <p style={{ color: 'var(--color-text-secondary)', fontSize: '13px', margin: '5px 0 0 0' }}>Dựa trên mật độ và thời gian ùn tắc thực tế toàn thành phố</p>
                    </div>
                </div>

                <div className="segment-card" style={{ padding: '0', overflow: 'hidden' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                        <thead style={{ background: 'var(--color-bg-tertiary)', fontSize: '13px', color: 'var(--color-text-secondary)' }}>
                        <tr>
                            <th style={{ padding: '15px 20px' }}># Hạng</th>
                            <th>Ngã tư</th>
                            <th>Khu vực</th>
                            <th>Mật độ hiện tại</th>
                            <th>Xu hướng (24h)</th>
                        </tr>
                        </thead>
                        <tbody>
                        {[
                            { rank: 1, name: "Ngã tư Sở", area: "Đống Đa", density: 0.96, trend: "+12%", status: "heavy" },
                            { rank: 2, name: "Cầu Giấy", area: "Cầu Giấy", density: 0.88, trend: "+5%", status: "heavy" },
                            { rank: 3, name: "Kim Mã", area: "Ba Đình", density: 0.72, trend: "-3%", status: "medium" },
                            { rank: 4, name: "Giải Phóng", area: "Hai Bà Trưng", density: 0.65, trend: "+2%", status: "medium" }
                        ].map((item) => (
                            <tr key={item.rank} className="ranking-row" style={{ borderBottom: '1px solid var(--color-border)', transition: '0.2s' }}>
                                <td style={{ padding: '18px 20px', fontWeight: '800', color: item.rank <= 2 ? 'var(--color-traffic-heavy)' : 'inherit' }}>
                                    {item.rank === 1 ? '🥇' : item.rank === 2 ? '🥈' : `#${item.rank}`}
                                </td>
                                <td style={{ fontWeight: '600' }}>{item.name}</td>
                                <td style={{ color: 'var(--color-text-secondary)', fontSize: '14px' }}>{item.area}</td>
                                <td>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                        <div style={{ flex: 1, height: '6px', background: 'var(--color-bg-tertiary)', borderRadius: '3px', maxWidth: '80px' }}>
                                            <div style={{ width: `${item.density * 100}%`, height: '100%', background: item.status === 'heavy' ? 'var(--color-traffic-heavy)' : 'var(--color-traffic-medium)', borderRadius: '3px' }}></div>
                                        </div>
                                        <span style={{ fontWeight: '700', fontSize: '14px' }}>{(item.density * 100).toFixed(0)}%</span>
                                    </div>
                                </td>
                                <td style={{ color: item.trend.includes('+') ? 'var(--color-traffic-heavy)' : 'var(--color-traffic-low)', fontSize: '14px', fontWeight: '600' }}>
                                    {item.trend} {item.trend.includes('+') ? '▲' : '▼'}
                                </td>
                            </tr>
                        ))}
                        </tbody>
                    </table>
                </div>
            </div>

            <div
                style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
                    gap: 20,
                    marginTop: 32,
                }}
            >
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
