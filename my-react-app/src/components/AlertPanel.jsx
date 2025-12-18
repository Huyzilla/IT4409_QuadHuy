import React, { useState } from "react";
import { useTraffic } from "../context/TrafficContext";
import { useNavigate } from "react-router-dom";


const AlertPanel = ({ onClose, isDropdown = false }) => {
    const { alerts, unreadAlertCount, markAllAsRead, markAlertsAsRead, handleIntersectionSelect } = useTraffic();
    const [filter, setFilter] = useState("all"); // 'all', 'heavy', 'medium', 'system'
    const navigate = useNavigate();

    const handleAlertClick = (alert) => {
        if (!alert.isRead) markAlertsAsRead([alert.id]);

        if (alert.intersectionId) {
            handleIntersectionSelect(alert.intersectionId);
            navigate("/dashboard");
            if (onClose) onClose();
        }
    };

    const formatRelativeTime = (isoString) => {
        const now = new Date();
        const past = new Date(isoString);
        const diffInSeconds = Math.floor((now - past) / 1000);

        if (diffInSeconds < 60) return "Vừa xong";

        const diffInMinutes = Math.floor(diffInSeconds / 60);
        if (diffInMinutes < 60) return `${diffInMinutes} phút trước`;

        const diffInHours = Math.floor(diffInMinutes / 60);
        if (diffInHours < 24) return `${diffInHours} giờ trước`;

        return past.toLocaleDateString('vi-VN');
    };

    const filteredAlerts = alerts.filter(alert => {
        if (filter === "all") return true;
        if (filter === "unread" && !alert.isRead) return true;
        if (alert.type === filter) return true;
        return false;
    });

    const alertTypeMap = {
        heavy: { label: "Ùn Tắc", color: "var(--color-traffic-heavy)" },
        medium: { label: "Mật Độ Cao", color: "var(--color-traffic-warning)" },
        system: { label: "Lỗi Hệ Thống", color: "var(--color-text-secondary)" },
    };

    const panelClass = isDropdown ? "alert-dropdown-menu" : "alert-panel-content live-modal-content";
    const overlayClass = isDropdown ? "" : "alert-panel-overlay live-modal-overlay";
    const containerStyle = isDropdown ? {} : { maxWidth: '480px', width: '90%', padding: '0', background: 'var(--color-bg-secondary)', maxHeight: '85vh' };

    if (isDropdown) {
        return (
            <div
                className="alert-dropdown-menu"
                onClick={(e) => e.stopPropagation()}
                style={{
                    position: 'absolute',
                    top: 'calc(100% + 10px)',
                    right: '0',
                    width: '350px',
                    zIndex: 10,
                    background: 'var(--color-bg-secondary)',
                    border: '1px solid var(--color-border)',
                    borderRadius: 'var(--radius-md)',
                    boxShadow: 'var(--shadow-lg)',
                    maxHeight: '400px',
                    overflow: 'hidden',
                    animation: 'fadeIn 0.2s ease-out, slideInDown 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
                }}
            >
                <div className="alert-panel-header" style={{ padding: '15px 20px', borderBottom: '1px solid var(--color-border)', position: 'relative' }}>
                    <h3 style={{ margin: 0, fontSize: '16px' }}>🔔 Thông báo ({unreadAlertCount} mới)</h3>
                </div>

                <div className="alert-panel-filters" style={{ display: 'flex', gap: '10px', padding: '10px 20px', borderBottom: '1px solid var(--color-border)' }}>
                    <select value={filter} onChange={(e) => setFilter(e.target.value)} className="custom-select" style={{ height: '35px', padding: '6px 10px' }}>
                        <option value="all">Tất cả</option>
                        <option value="unread">Chưa đọc ({unreadAlertCount})</option>
                        <option value="heavy">Ùn tắc</option>
                        <option value="medium">Mật độ</option>
                    </select>
                    <button onClick={markAllAsRead} className="action-btn" disabled={unreadAlertCount === 0} style={{ flexShrink: 0, padding: '6px 10px', fontSize: '12px' }}>
                        Đã đọc tất cả
                    </button>
                </div>

                <div className="alert-panel-list" style={{ overflowY: 'auto', maxHeight: '280px' }}>
                    {filteredAlerts.length > 0 ? (
                        filteredAlerts.map(alert => (
                            <div
                                key={alert.id}
                                className={`alert-item ${alert.isRead ? 'read' : 'unread'}`}
                                style={{
                                    padding: '10px 20px',
                                    borderBottom: '1px solid var(--color-border)',
                                    background: alert.isRead ? 'transparent' : 'rgba(5, 150, 105, 0.05)',
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    cursor: 'pointer',
                                }}
                                onClick={() => handleAlertClick(alert)}
                            >
                                <div style={{ flexGrow: 1, minWidth: 0 }}>
                                    <div style={{ fontWeight: '500', fontSize: '14px', color: alert.isRead ? 'var(--color-text-secondary)' : 'var(--color-text-primary)' }}>
                                        <span style={{ color: alertTypeMap[alert.type]?.color || 'var(--color-text-primary)', marginRight: '6px', fontSize: '18px' }}>
                                            •
                                        </span>
                                        {alert.message}
                                    </div>
                                    <small style={{ color: 'var(--color-text-secondary)', display: 'block', marginTop: '2px', fontSize: '11px' }}>
                                        {formatRelativeTime(alert.createdAt)}
                                    </small>
                                </div>
                            </div>
                        ))
                    ) : (
                        <p style={{ textAlign: 'center', color: 'var(--color-text-secondary)', padding: '20px' }}>
                            Không có thông báo nào.
                        </p>
                    )}
                </div>
            </div>
        );
    }

    return (
        <div
            className={overlayClass}
            role="dialog"
            aria-modal="true"
            aria-label="Bảng Thông báo Cảnh báo"
            onClick={onClose}
        >
            <div
                className={panelClass}
                onClick={(e) => e.stopPropagation()}
                style={containerStyle}
            >
            </div>
        </div>
    );
};

export default AlertPanel;