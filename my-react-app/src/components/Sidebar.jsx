import React, { useState } from 'react';
import { useTraffic } from '../context/TrafficContext';

const Sidebar = ({ currentUser, onLogout, onThemeToggle }) => {
    const {
        intersections,
        activeIntersection,
        handleIntersectionSelect,
        alerts,
        unreadAlertCount
    } = useTraffic();

    const [searchText, setSearchText] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [areaFilter, setAreaFilter] = useState('all');

    const filteredIntersections = intersections.filter(item => {
        const matchesStatus = statusFilter === 'all' || item.status === statusFilter;
        const matchesArea = areaFilter === 'all' || item.area === areaFilter;
        const lowerSearchText = searchText.toLowerCase();
        const matchesSearch = item.label.toLowerCase().includes(lowerSearchText) ||
            item.details.toLowerCase().includes(lowerSearchText);
        return matchesStatus && matchesArea && matchesSearch;
    });

    return (
        <aside className="sidebar" role="navigation">
            <div className="sidebar-header">
                <span className="icon icon-traffic" style={{ color: 'var(--color-accent-blue)' }}></span>
                <span className="logo-text">Traffic Monitor</span>
                <button
                    className="theme-toggle-btn"
                    aria-label="Chuyển chế độ Sáng/Tối"
                    onClick={onThemeToggle}
                >
                    <span className="icon icon-moon"></span>
                </button>
            </div>

            <div className="search-box">
                <span className="icon icon-search search-icon"></span>
                <input
                    type="text"
                    placeholder="Tìm ngã tư..."
                    aria-label="Tìm kiếm ngã tư"
                    value={searchText}
                    onChange={(e) => setSearchText(e.target.value)}
                />
            </div>

            <div className="filter-controls">
                <select
                    aria-label="Lọc theo trạng thái"
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="custom-select"
                >
                    <option value="all">Tất cả trạng thái</option>
                    <option value="heavy">Ùn tắc</option>
                    <option value="medium">Trung bình</option>
                    <option value="low">Ít đông</option>
                </select>

                <select
                    aria-label="Lọc theo khu vực"
                    value={areaFilter}
                    onChange={(e) => setAreaFilter(e.target.value)}
                    className="custom-select"
                >
                    <option value="all">Tất cả khu vực</option>
                    <option value="Đống Đa">Đống Đa</option>
                    <option value="Phương Mai, Đống Đa">Phương Mai, Đống Đa</option>
                    <option value="Xuân Thủy">Xuân Thủy</option>
                    <option value="quan3">Quận 3</option>
                </select>
            </div>

            <h3 className="list-title">DANH SÁCH NGÃ TƯ</h3>
            <ul className="intersection-list">
                {filteredIntersections.length > 0 ? (
                    filteredIntersections.map(item => {
                        const isActive = item.id === activeIntersection?.id;
                        const statusText = isActive ? 'Đang theo dõi' : 'Sẵn sàng';
                        const statusClass = isActive ? 'active' : 'ready';

                        return (
                            <li
                                key={item.id}
                                className={`intersection-item ${isActive ? 'active' : ''}`}
                                data-status={item.status}
                                data-area={item.area}
                                onClick={() => handleIntersectionSelect(item.id)}
                            >
                                <div className="intersection-info">
                                    <span className="intersection-label">{item.label}</span>
                                    <div className={`intersection-status-badge ${item.status}`}>
                                        {item.status === 'heavy' && 'Xe kẹt'}
                                        {item.status === 'medium' && 'Xe nhiều'}
                                        {item.status === 'low' && 'Thông thoáng'}
                                        {item.status === 'no-connection' && 'Mất kết nối'}
                                    </div>
                                    <p className="intersection-details">{item.details}</p>
                                </div>
                                <span className={`status-button ${statusClass}`}>
                                    {statusText}
                                </span>
                            </li>
                        );
                    })
                ) : (
                    <li className="no-results">
                        Không tìm thấy ngã tư nào.
                    </li>
                )}
            </ul>

            <button className="report-btn action-btn">
                <span className="icon icon-dashboard"></span>
                Lịch sử & Phân tích
            </button>

            <div className="sidebar-user-info">
                <div className="sidebar-user-card">
                    <div className="sidebar-user-details">
                        <div className="sidebar-user-name">
                            {currentUser?.fullName || "Người dùng"}
                        </div>
                        <div className="sidebar-user-role">
                            {currentUser?.role === "admin" ? "Quản trị viên" : "Nhân viên giám sát"}
                        </div>
                    </div>
                    <button onClick={onLogout} className="btn-logout">
                        Đăng xuất
                    </button>
                </div>
            </div>
        </aside>
    );
};

export default Sidebar;