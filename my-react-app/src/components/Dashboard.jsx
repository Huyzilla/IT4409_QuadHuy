import React from 'react';
import { STATUS_MAP } from '../data/mockData';

const DashboardSegmentCard = ({ segment }) => {
    const statusInfo = STATUS_MAP[segment.status] || STATUS_MAP['no-connection'];
    const densityPercent = Math.round(segment.density * 100);

    const trendOptions = ['up', 'down', 'stable'];
    const randomIndex = Math.floor(Math.random() * trendOptions.length);
    const randomTrend = trendOptions[randomIndex];

    let trendText = 'Không rõ (60 phút)';
    if (segment.status !== 'no-connection') {
        if (randomTrend === 'up') trendText = 'Xu hướng: Tăng (60 phút)';
        if (randomTrend === 'down') trendText = 'Xu hướng: Giảm (60 phút)';
        if (randomTrend === 'stable') trendText = 'Xu hướng: Ổn định (60 phút)';
    }

    const handleQuickAction = () => {
        alert(`Đã nhấn nút Tùy chọn Nhanh (Cài đặt) cho: ${segment.title}.`);
    };

    return (
        <div className="segment-card">
            <div className="card-header">
                <h2>{segment.title}</h2>
                <span className={`status-tag ${statusInfo.colorClass}`}>
                    <span className="color-dot"></span> {statusInfo.label}
                </span>
                <button className="quick-action-btn" aria-label="Tùy chọn nhanh" onClick={handleQuickAction}>
                    <span className="icon icon-settings"></span>
                </button>
            </div>

            <div className="trend-chart" data-trend={segment.status === 'no-connection' ? 'unknown' : randomTrend}>
                <p>{trendText}</p>
            </div>

            <div className="progress-bar-container">
                <div
                    className={`progress-bar ${segment.status !== 'no-connection' && segment.status !== 'low' ? 'gradient-full' : statusInfo.gradientClass}`}
                    style={{
                        width: `${densityPercent}%`,
                        // Chỉ dùng background color cho trạng thái Mất kết nối (density 0)
                        backgroundColor: segment.status === 'no-connection' ? 'var(--color-text-secondary)' : (segment.status === 'low' ? 'var(--color-traffic-low)' : undefined)
                    }}
                ></div>
            </div>
            <p className="density-label">
                Mật độ: {segment.status === 'no-connection' ? '—' : segment.density.toFixed(2)}
            </p>
        </div>
    );
};

const Dashboard = ({ activeIntersection, onReload, onLiveView }) => {
    const title = activeIntersection
        ? `${activeIntersection.label} — Trạng thái hiện tại`
        : "Vui lòng chọn một Ngã tư để theo dõi";

    const segments = activeIntersection?.segments || [];
    const isDashboardEmpty = segments.length === 0;

    const handleFilterClick = (statusLabel) => {
        alert(`Đã lọc/tập trung vào các đoạn đường có trạng thái: ${statusLabel}`);
    };

    return (
        <main className="main-content" role="main">
            <header className="main-header">
                <h1 className="page-title">{title}</h1>
                <div className="header-actions">
                    <button className="alert-btn action-btn" aria-label="Xem cảnh báo" onClick={() => alert('Mở danh sách 3 cảnh báo giao thông nghiêm trọng...')}>
                        <span className="icon icon-bell"></span>
                        <span className="alert-badge">3</span>
                    </button>
                    <button className="action-btn" aria-label="Tải lại dữ liệu" onClick={onReload}>Tải lại</button>
                    <button className="action-btn primary" aria-label="Xem trực tiếp" onClick={onLiveView}>Trực tiếp</button>
                </div>
            </header>

            <div className="traffic-filters">
                <span className="filter-item low-traffic" onClick={() => handleFilterClick('Ít đông')}><span className="color-dot"></span> Ít đông</span>
                <span className="filter-item medium-traffic" onClick={() => handleFilterClick('Trung bình')}><span className="color-dot"></span> Trung bình</span>
                <span className="filter-item heavy-traffic" onClick={() => handleFilterClick('Ùn tắc')}><span className="color-dot"></span> Ùn tắc</span>
                <span className="filter-item no-connection" onClick={() => handleFilterClick('Mất kết nối')}><span className="color-dot"></span> Mất kết nối</span>
            </div>

            <div className="dashboard-grid">
                {isDashboardEmpty ? (
                    Array(4).fill(null).map((_, index) => (
                        <div className="segment-card" key={index}>
                            <div className="card-header">
                                <h2>Đoạn đường — Dữ liệu trống</h2>
                                <span className="status-tag no-connection">Không có dữ liệu</span>
                                <button className="quick-action-btn" aria-label="Tùy chọn nhanh" disabled>
                                    <span className="icon icon-settings"></span>
                                </button>
                            </div>
                            <div className="trend-chart" data-trend="unknown"><p>Xu hướng: Không rõ (60 phút)</p></div>
                            <div className="progress-bar-container"><div className="progress-bar"></div></div>
                            <p className="density-label">Mật độ: —</p>
                        </div>
                    ))
                ) : (
                    segments.map(segment => (
                        <DashboardSegmentCard key={segment.id} segment={segment} />
                    ))
                )}
            </div>
        </main>
    );
};

export default Dashboard;