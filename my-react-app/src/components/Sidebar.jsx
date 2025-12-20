import React, { useState } from "react";
import { useTraffic } from "../context/TrafficContext";
import { NavLink, useNavigate } from "react-router-dom";

import IntersectionModal from "./IntersectionModal";
import "./Sidebar.css";

const UserDropdown = ({
  onLogoutRequest,
  onToggleTheme,
  currentUser,
  closeModal,
}) => {
  const navigate = useNavigate();
  const { theme } = useTraffic();

  const handleNavigation = (path) => {
    navigate(path);
    closeModal();
  };

  return (
    <div className="user-dropdown-menu">
      <div className="user-dropdown-header-compact">
        <div
          className="sidebar-user-avatar"
          style={{ width: "32px", height: "32px" }}
        >
          {currentUser?.avatarUrl ? (
            <img src={currentUser.avatarUrl} alt="Avatar người dùng" />
          ) : (
            <span className="icon icon-user-placeholder"></span>
          )}
        </div>
        <div className="user-info-text">
          <strong>{currentUser?.fullName}</strong>
          <small>
            {currentUser?.role === "admin"
              ? "Quản trị viên"
              : "Nhân viên giám sát"}
          </small>
        </div>
      </div>

      <button
        className="dropdown-item"
        onClick={() => handleNavigation("/account")}
      >
        <span className="icon icon-settings-dropdown"></span>
        Thông tin tài khoản
      </button>

      <button className="dropdown-item" onClick={onToggleTheme}>
        <span className="icon icon-moon-dropdown"></span>
        Chế độ ({theme === "theme-dark" ? "Tối" : "Sáng"})
      </button>

      <div className="dropdown-divider"></div>

      <button className="dropdown-item logout" onClick={onLogoutRequest}>
        <span className="icon icon-logout-dropdown"></span>
        Đăng xuất
      </button>
    </div>
  );
};

const Sidebar = ({
  currentUser,
  onLogoutRequest,
  onThemeToggle,
  onToggleDropdown,
  isDropdownOpen,
}) => {
  const {
    intersections,
    activeIntersection,
    handleIntersectionSelect,
    createIntersection,
    updateIntersection,
    deleteIntersection,
  } = useTraffic();

  const [searchText, setSearchText] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [areaFilter, setAreaFilter] = useState("all");

  const filteredIntersections = intersections.filter((item) => {
    const matchesStatus =
      statusFilter === "all" || item.status === statusFilter;
    const matchesArea = areaFilter === "all" || item.area === areaFilter;
    const lowerSearchText = searchText.toLowerCase();
    const matchesSearch =
      item.label.toLowerCase().includes(lowerSearchText) ||
      item.details.toLowerCase().includes(lowerSearchText);
    return matchesStatus && matchesArea && matchesSearch;
  });
  // State cho Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);

  const handleCreate = () => {
    setEditingItem(null); // Mode tạo mới
    setIsModalOpen(true);
  };

  const handleEdit = (e, item) => {
    e.stopPropagation(); // Chặn sự kiện click vào item cha (để không bị active ngã tư khi ấn sửa)
    setEditingItem(item);
    setIsModalOpen(true);
  };

  const handleDelete = (e, id) => {
    e.stopPropagation();
    deleteIntersection(id);
  };

  const handleFormSubmit = (formData) => {
    if (editingItem) {
      updateIntersection(editingItem.id, formData);
    } else {
      createIntersection(formData);
    }
  };
  const closeDropdownWrapper = () => onToggleDropdown(false);

  return (
    <aside className="sidebar" role="navigation">
      <div className="sidebar-header">
        <span
          className="icon icon-traffic"
          style={{ color: "var(--color-accent-blue)" }}
        ></span>
        <span className="logo-text">Traffic Monitor</span>
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
      <button className="btn-add-new" onClick={handleCreate}>
        + Thêm
      </button>
      <ul className="intersection-list">
        {filteredIntersections.length > 0 ? (
          filteredIntersections.map((item) => {
            const isActive = item.id === activeIntersection?.id;
            const statusText = isActive ? "Đang theo dõi" : "Sẵn sàng";
            const statusClass = isActive ? "active" : "ready";

            return (
              <li
                key={item.id}
                className={`intersection-item ${isActive ? "active" : ""}`}
                data-status={item.status}
                data-area={item.area}
                onClick={() => handleIntersectionSelect(item.id)}
              >
                <div className="intersection-info">
                  <span className="intersection-label">{item.label}</span>
                  <div className={`intersection-status-badge ${item.status}`}>
                    {item.status === "heavy" && "Xe kẹt"}
                    {item.status === "medium" && "Xe nhiều"}
                    {item.status === "low" && "Thông thoáng"}
                    {item.status === "no-connection" && "Mất kết nối"}
                  </div>
                  <p className="intersection-details">{item.details}</p>
                </div>
                <span className={`status-button ${statusClass}`}>
                  {statusText}
                </span>

                <div className="item-actions-group">
                  {/*nút sửa ngã tư */}
                  <button
                    className="btn-icon-action edit"
                    onClick={(e) => handleEdit(e, item)}
                    title="Sửa thông tin"
                  >
                    ✎
                  </button>
                  {/* nút xóa ngã tư */}
                  <button
                    className="btn-icon-action delete"
                    onClick={(e) => handleDelete(e, item.id)}
                    title="Xóa ngã tư"
                  >
                    ✕
                  </button>
                </div>
              </li>
            );
          })
        ) : (
          <li className="no-results">Không tìm thấy ngã tư nào.</li>
        )}
      </ul>

      <NavLink
        to="/history"
        className="report-btn action-btn"
        style={{ textDecoration: "none", marginTop: "15px" }}
      >
        <span className="icon icon-dashboard"></span>
        Lịch sử & Phân tích
      </NavLink>

      <div className="sidebar-user-info">
        <div
          className={`sidebar-user-card ${
            isDropdownOpen ? "active-dropdown" : ""
          }`}
          onClick={() => onToggleDropdown(!isDropdownOpen)}
        >
          <div
            className="sidebar-user-avatar"
            aria-label={`Avatar của ${currentUser?.fullName || "Người dùng"}`}
          >
            {currentUser?.avatarUrl ? (
              <img src={currentUser.avatarUrl} alt="Avatar người dùng" />
            ) : (
              <span className="icon icon-user-placeholder"></span>
            )}
          </div>

          <div
            className="sidebar-user-details"
            style={{ flex: "1", minWidth: 0 }}
          >
            <div
              className="sidebar-user-name"
              style={{
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {currentUser?.fullName || "Người dùng"}
            </div>
            <div className="sidebar-user-role">
              {currentUser?.role === "admin"
                ? "Quản trị viên"
                : "Nhân viên giám sát"}
            </div>
          </div>

          <span
            className={`icon icon-chevron ${isDropdownOpen ? "open" : ""}`}
          ></span>

          {isDropdownOpen && (
            <UserDropdown
              onLogoutRequest={onLogoutRequest}
              onToggleTheme={onThemeToggle}
              currentUser={currentUser}
              closeModal={closeDropdownWrapper}
            />
          )}
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
