import React, { useState } from 'react';

const Sidebar = ({ intersections, activeId, onSelect, onThemeToggle }) => {
    const [searchText, setSearchText] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [areaFilter, setAreaFilter] = useState('all');

    const filteredIntersections = intersections.filter(item => {
        const matchesStatus = statusFilter === 'all' || item.status === statusFilter;
        const matchesArea = areaFilter === 'all' || item.area === areaFilter;
        const lowerSearchText = searchText.toLowerCase();
        const matchesSearch = item.label.toLowerCase().includes(lowerSearchText) || item.details.toLowerCase().includes(lowerSearchText);
        return matchesStatus && matchesArea && matchesSearch;
    });

    return (
        <aside className="sidebar" role="navigation">
            <div className="sidebar-header">
                <span className="icon icon-traffic" style={{ color: 'var(--color-accent-blue)' }}></span>
                <span className="logo-text">Traffic Monitor</span>
                <button className="theme-toggle-btn" aria-label="Chuyển chế độ Sáng/Tối" onClick={onThemeToggle}>
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
                <select aria-label="Lọc theo trạng thái" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                    <option value="all">Tất cả trạng thái</option>
                    <option value="heavy">Ùn tắc</option>
                    <option value="medium">Trung bình</option>
                    <option value="low">Ít đông</option>
                </select>
                <select aria-label="Lọc theo khu vực" value={areaFilter} onChange={(e) => setAreaFilter(e.target.value)}>
                    <option value="all">Tất cả khu vực</option>
                    <option value="quan1">Quận 1</option>
                    <option value="quan3">Quận 3</option>
                </select>
            </div>

            <h3 className="list-title">DANH SÁCH NGÃ TƯ</h3>
            <ul className="intersection-list">
                {filteredIntersections.length > 0 ? (
                    filteredIntersections.map(item => {
                        const isActive = item.id === activeId;
                        const statusText = isActive ? 'Đang theo dõi' : 'Sẵn sàng';
                        const statusClass = isActive ? 'active' : 'ready';

                        return (
                            <li
                                key={item.id}
                                className={`intersection-item ${isActive ? 'active' : ''}`}
                                data-status={item.status}
                                data-area={item.area}
                                onClick={() => onSelect(item.id)}
                            >
                                <div className="intersection-info">
                                    <span className="intersection-label">{item.label}</span>
                                    <p className="intersection-details">{item.details}</p>
                                </div>
                                <span className={`status-button ${statusClass}`}>{statusText}</span>
                            </li>
                        );
                    })
                ) : (
                    <li style={{ padding: '15px', color: 'var(--color-text-secondary)', textAlign: 'center' }}>
                        Không tìm thấy ngã tư nào.
                    </li>
                )}
            </ul>

            <button className="report-btn action-btn" onClick={() => alert('Chuyển đến trang Lịch sử & Phân tích chuyên sâu...')}>
                <span className="icon icon-dashboard"></span> Lịch sử & Phân tích chuyên sâu
            </button>
        </aside>
    );
};

export default Sidebar;