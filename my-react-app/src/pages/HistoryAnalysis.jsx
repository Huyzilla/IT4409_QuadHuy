import React, { useState, useEffect, useCallback } from "react";
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
import { ingestSocket } from "../socket";
import axios from "axios";
import * as XLSX from "xlsx";

const API_URL = "http://localhost:3000/api";

const COLOR_PALETTE = ["#8b5cf6", "#10b981", "#f59e0b", "#ef4444", "#06b6d4"];

export default function HistoryAnalysis() {
  const { activeIntersection, intersections } = useTraffic();
  const [stats, setStats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isRealTime, setIsRealTime] = useState(true);
  const [selectedDate, setSelectedDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [selectedHour, setSelectedHour] = useState("all");
  const [selectedIntersections, setSelectedIntersections] = useState([]);

  const fetchHistoryData = useCallback(async () => {
    const mainCamId = activeIntersection?.cameras?.[0]?.id;
    if (!mainCamId) return;

    const compareCamIds = selectedIntersections
      .map((id) => intersections.find((i) => i.id === id)?.cameras?.[0]?.id)
      .filter(Boolean);

    const allIds = [mainCamId, ...compareCamIds];

    setLoading(true);
    try {
      const params = {
        cameraIds: allIds.join(","),
        _t: Date.now(),
      };

      if (!isRealTime) {
        const datePart = selectedDate;
        if (selectedHour === "all") {
          params.from = new Date(`${datePart}T00:00:00`).toISOString();
          params.to = new Date(`${datePart}T23:59:59`).toISOString();
        } else {
          const hour = parseInt(selectedHour);
          params.from = new Date(
            `${datePart}T${hour.toString().padStart(2, "0")}:00:00`
          ).toISOString();
          params.to = new Date(
            `${datePart}T${hour.toString().padStart(2, "0")}:59:59`
          ).toISOString();
        }
      }

      const response = await axios.get(`${API_URL}/traffic/minute-stats`, {
        params,
      });

      const grouped = response.data.reduce((acc, item) => {
        const timeKey = new Date(item.minuteStart * 1000).toLocaleTimeString(
          "vi-VN",
          {
            hour: "2-digit",
            minute: "2-digit",
          }
        );

        if (!acc[timeKey]) acc[timeKey] = { time: timeKey, vehicles: 0 };

        if (item.cameraId === mainCamId) {
          acc[timeKey].density = Math.min(
            1,
            (Number(item.vehiclesAvg) || 0) / 100
          );
          acc[timeKey].vehicles = Math.round(item.vehiclesAvg) || 0;
        } else {
          acc[timeKey][`density_${item.cameraId}`] = Math.min(
            1,
            (Number(item.vehiclesAvg) || 0) / 100
          );
        }
        return acc;
      }, {});

      setStats(Object.values(grouped));
    } catch (err) {
      console.error("Lỗi fetch:", err);
    } finally {
      setLoading(false);
    }
  }, [
    activeIntersection,
    isRealTime,
    selectedDate,
    selectedHour,
    selectedIntersections,
    intersections,
  ]);

  useEffect(() => {
    fetchHistoryData();
  }, [fetchHistoryData]);

  const handleToggleRealTime = () => {
    setIsRealTime(true);
    setSelectedHour("all");
  };

  const handleHourChange = (e) => {
    setSelectedHour(e.target.value);
    setIsRealTime(false);
  };

  useEffect(() => {
    const handleNewData = (newData) => {
      if (!isRealTime) return;

      const currentCamId = activeIntersection?.cameras?.[0]?.id;
      if (currentCamId && Number(newData.cameraId) === Number(currentCamId)) {
        setStats((prev) => {
          const newTime = new Date(
            newData.minuteStart * 1000
          ).toLocaleTimeString("vi-VN", {
            hour: "2-digit",
            minute: "2-digit",
          });

          if (prev.length > 0 && prev[prev.length - 1].time === newTime)
            return prev;

          const newPoint = {
            time: newTime,
            density: newData.density,
            vehicles: Math.round(newData.vehicles_avg),
          };

          const updated = [...prev, newPoint];
          return updated.slice(-60);
        });
      }
    };

    ingestSocket.on("new_minute_stats", handleNewData);
    return () => ingestSocket.off("new_minute_stats");
  }, [isRealTime, activeIntersection]);

  const handleCompare = (intersectionId) => {
    setSelectedIntersections((prev) => {
      const isSelected = prev.includes(intersectionId);
      if (isSelected) {
        return prev.filter((id) => id !== intersectionId);
      } else if (prev.length < 3) {
        return [...prev, intersectionId];
      }
      return prev;
    });
  };

  const handleExportExcel = () => {
    if (!stats || stats.length === 0) return;

    const exportData = stats.map((item) => {
      const row = {
        "Thời điểm": item.time,
        [`${activeIntersection?.label} (Mật độ %)`]:
          (item.density * 100).toFixed(1) + "%",
        [`${activeIntersection?.label} (Số xe)`]: item.vehicles,
      };

      selectedIntersections.forEach((id) => {
        const intersection = intersections.find((i) => i.id === id);
        const name = intersection?.label || `Ngã tư ${id}`;
        const camId = intersection?.cameras?.[0]?.id;

        const val = item[`density_${camId}`];
        row[`${name} (Mật độ %)`] = val ? (val * 100).toFixed(1) + "%" : "0.0%";
      });

      return row;
    });

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Báo cáo lưu lượng");
    XLSX.writeFile(
      wb,
      `Bao_cao_${activeIntersection?.label}_${selectedDate}.xlsx`
    );
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

        <div
          className="header-actions"
          style={{ display: "flex", gap: "12px" }}
        >
          <button
            className="action-btn"
            onClick={handleExportExcel}
            style={{
              background: "#10b981",
              color: "white",
              border: "none",
              borderRadius: "8px",
              padding: "8px 16px",
              fontWeight: "bold",
              cursor: "pointer",
            }}
          >
            Export Excel
          </button>
        </div>
      </header>

      <div
        className="filter-controls"
        style={{
          marginBottom: "20px",
          display: "flex",
          gap: "15px",
          alignItems: "center",
        }}
      >
        <button
          onClick={handleToggleRealTime}
          style={{
            padding: "10px 20px",
            borderRadius: "10px",
            border: "none",
            background: isRealTime ? "#ef4444" : "#334155",
            color: "white",
            fontWeight: "bold",
            cursor: "pointer",
            boxShadow: isRealTime ? "0 0 10px rgba(239, 68, 68, 0.3)" : "none",
          }}
        >
          🔴 {isRealTime ? "Đang trực tiếp..." : "Xem Trực tiếp"}
        </button>

        <div
          style={{
            display: "flex",
            gap: "10px",
            alignItems: "center",
            background: "var(--color-bg-secondary)",
            padding: "6px 15px",
            borderRadius: "12px",
          }}
        >
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => {
              setSelectedDate(e.target.value);
              setIsRealTime(false);
            }}
            style={{
              background: "#0f172a",
              color: "white",
              border: "1px solid #334155",
              borderRadius: "6px",
              padding: "5px",
            }}
          />
          <select
            value={selectedHour}
            onChange={(e) => {
              setSelectedHour(e.target.value);
              setIsRealTime(false);
            }}
            style={{
              background: "#0f172a",
              color: "white",
              border: "1px solid #334155",
              borderRadius: "6px",
              padding: "5px",
            }}
          >
            <option value="all">Cả ngày</option>
            {[...Array(24).keys()].map((h) => (
              <option key={h} value={h}>
                {h.toString().padStart(2, "0")}:00 -{" "}
                {(h + 1).toString().padStart(2, "0")}:00
              </option>
            ))}
          </select>
        </div>
      </div>

      <div
        className="comparison-selector"
        style={{
          marginBottom: "20px",
          display: "flex",
          gap: "10px",
          flexWrap: "wrap",
        }}
      >
        <span
          style={{ fontSize: "14px", color: "#94a3b8", alignSelf: "center" }}
        >
          So sánh:
        </span>
        {intersections
          .filter((item) => item.id !== activeIntersection?.id)
          .map((item) => {
            const isSelected = selectedIntersections.includes(item.id);
            return (
              <button
                key={item.id}
                onClick={() => handleCompare(item.id)}
                style={{
                  padding: "6px 14px",
                  borderRadius: "20px",
                  border: `1px solid ${isSelected ? "#3b82f6" : "#334155"}`,
                  background: isSelected
                    ? "rgba(59, 130, 246, 0.2)"
                    : "transparent",
                  color: isSelected ? "#60a5fa" : "#94a3b8",
                  cursor: "pointer",
                  fontSize: "13px",
                }}
              >
                {isSelected ? "✓ " : "+ "} {item.label}
              </button>
            );
          })}
      </div>

      <div
        className="chart-card"
        style={{
          background: "var(--color-bg-secondary)",
          padding: "25px",
          borderRadius: "16px",
        }}
      >
        <h3 style={{ marginTop: 0, marginBottom: "20px" }}>
          Phân tích tương quan lưu lượng
        </h3>
        <ResponsiveContainer width="100%" height={420}>
          <LineChart data={stats}>
            <CartesianGrid
              strokeDasharray="4 4"
              stroke="#334155"
              vertical={false}
            />
            <XAxis dataKey="time" stroke="#94a3b8" tick={{ fontSize: 12 }} />
            <YAxis
              stroke="#94a3b8"
              tickFormatter={(v) => `${(v * 100).toFixed(0)}%`}
            />
            <Tooltip
              contentStyle={{
                background: "#1e293b",
                border: "none",
                borderRadius: "12px",
                color: "#fff",
              }}
              formatter={(value, name) => [
                `${(value * 100).toFixed(1)}%`,
                name,
              ]}
            />
            <Legend verticalAlign="top" align="right" />

            <Line
              type="monotone"
              dataKey="density"
              stroke={COLOR_PALETTE[0]}
              strokeWidth={4}
              dot={false}
              name={activeIntersection?.label || "Chính"}
            />

            {selectedIntersections.map((id, index) => {
              const intersection = intersections.find((i) => i.id === id);
              const camId = intersection?.cameras?.[0]?.id;

              return (
                <Line
                  key={id}
                  type="monotone"
                  dataKey={`density_${camId}`}
                  stroke={COLOR_PALETTE[(index + 1) % COLOR_PALETTE.length]}
                  strokeWidth={4}
                  dot={false}
                  name={intersection?.label || id}
                />
              );
            })}
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="ranking-section" style={{ marginTop: "40px" }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-end",
            marginBottom: "20px",
          }}
        >
          <div>
            <h3 style={{ margin: 0 }}>🏆 Xếp hạng Điểm nóng Giao thông</h3>
            <p
              style={{
                color: "var(--color-text-secondary)",
                fontSize: "13px",
                margin: "5px 0 0 0",
              }}
            >
              Dựa trên mật độ và thời gian ùn tắc thực tế toàn thành phố
            </p>
          </div>
        </div>

        <div
          className="segment-card"
          style={{ padding: "0", overflow: "hidden" }}
        >
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              textAlign: "left",
            }}
          >
            <thead
              style={{
                background: "var(--color-bg-tertiary)",
                fontSize: "13px",
                color: "var(--color-text-secondary)",
              }}
            >
              <tr>
                <th style={{ padding: "15px 20px" }}># Hạng</th>
                <th>Ngã tư</th>
                <th>Khu vực</th>
                <th>Mật độ hiện tại</th>
                <th>Xu hướng (24h)</th>
              </tr>
            </thead>
            <tbody>
              {[
                {
                  rank: 1,
                  name: "Ngã tư Sở",
                  area: "Đống Đa",
                  density: 0.96,
                  trend: "+12%",
                  status: "heavy",
                },
                {
                  rank: 2,
                  name: "Cầu Giấy",
                  area: "Cầu Giấy",
                  density: 0.88,
                  trend: "+5%",
                  status: "heavy",
                },
                {
                  rank: 3,
                  name: "Kim Mã",
                  area: "Ba Đình",
                  density: 0.72,
                  trend: "-3%",
                  status: "medium",
                },
                {
                  rank: 4,
                  name: "Giải Phóng",
                  area: "Hai Bà Trưng",
                  density: 0.65,
                  trend: "+2%",
                  status: "medium",
                },
              ].map((item) => (
                <tr
                  key={item.rank}
                  className="ranking-row"
                  style={{
                    borderBottom: "1px solid var(--color-border)",
                    transition: "0.2s",
                  }}
                >
                  <td
                    style={{
                      padding: "18px 20px",
                      fontWeight: "800",
                      color:
                        item.rank <= 2
                          ? "var(--color-traffic-heavy)"
                          : "inherit",
                    }}
                  >
                    {item.rank === 1
                      ? "🥇"
                      : item.rank === 2
                      ? "🥈"
                      : `#${item.rank}`}
                  </td>
                  <td style={{ fontWeight: "600" }}>{item.name}</td>
                  <td
                    style={{
                      color: "var(--color-text-secondary)",
                      fontSize: "14px",
                    }}
                  >
                    {item.area}
                  </td>
                  <td>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "10px",
                      }}
                    >
                      <div
                        style={{
                          flex: 1,
                          height: "6px",
                          background: "var(--color-bg-tertiary)",
                          borderRadius: "3px",
                          maxWidth: "80px",
                        }}
                      >
                        <div
                          style={{
                            width: `${item.density * 100}%`,
                            height: "100%",
                            background:
                              item.status === "heavy"
                                ? "var(--color-traffic-heavy)"
                                : "var(--color-traffic-medium)",
                            borderRadius: "3px",
                          }}
                        ></div>
                      </div>
                      <span style={{ fontWeight: "700", fontSize: "14px" }}>
                        {(item.density * 100).toFixed(0)}%
                      </span>
                    </div>
                  </td>
                  <td
                    style={{
                      color: item.trend.includes("+")
                        ? "var(--color-traffic-heavy)"
                        : "var(--color-traffic-low)",
                      fontSize: "14px",
                      fontWeight: "600",
                    }}
                  >
                    {item.trend} {item.trend.includes("+") ? "▲" : "▼"}
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
