// src/components/Sidebar.js

import React from 'react';
import { useAuth } from '../context/AuthContext';
import { useLocation } from 'react-router-dom';

// ... (Icon component and menuIcons object remain the same) ...
const Icon = ({ path, className = "nav-icon" }) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
    <path d={path} />
  </svg>
);



const Sidebar = ({ isCollapsed, isMobileOpen, onToggleClick  }) => { // Accept isMobileOpen prop
  const { user, logout } = useAuth();
  const location = useLocation();

  const menuIcons = {
    dashboard: "M3 13h8V3H3v10zm0 8h8v-6H3v6zm10 0h8V11h-8v10zm0-18v6h8V3h-8z",
    evaluation: "M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z",
    period: "M19 4h-1V2h-2v2H8V2H6v2H5c-1.11 0-1.99.9-1.99 2L3 20c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 16H5V10h14v10zM9 14H7v-2h2v2zm4 0h-2v-2h2v2zm4 0h-2v-2h2v2z",
    evaluation_management: "M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 2 2h12c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z",
    users: "M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z",
    attendance: "M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm-1-5h2v2h-2zm0-8h2v6h-2z",
    ckp: "M3.5 18.49l6-6.01 4 4L22 6.92l-1.41-1.41-7.09 7.09-4-4L2 17.08z",
    calculation: "M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-4 14h-2v-4h2v4zm0-6h-2v-2h2v2zm-4 6H9v-4h2v4zm0-6H9v-2h2v2zm-4 6H5v-4h2v4zm0-6H5v-2h2v2z",
    monitoring: "M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z",
    logout: "M17 7l-1.41 1.41L18.17 11H8v2h10.17l-2.58 2.58L17 17l5-5zM4 5h8V3H4c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h8v-2H4V5z"
  };

  // ... (menuItems and other logic remain the same) ...
  const menuItems = [
    { path: '/dashboard', icon: menuIcons.dashboard, label: 'Dashboard', roles: ['STAFF', 'ADMIN', 'PIMPINAN'] },
    { path: '/evaluation', icon: menuIcons.evaluation, label: 'Penilaian BerAKHLAK', roles: ['STAFF', 'PIMPINAN'] },
    { type: 'divider', roles: ['ADMIN', 'PIMPINAN'] },
    { type: 'title', label: 'Manajemen', roles: ['ADMIN'] },
    { path: '/period-management', icon: menuIcons.period, label: 'Kelola Periode', roles: ['ADMIN'] },
    { path: '/evaluation-management', icon: menuIcons.evaluation_management, label: 'Kelola Penilaian', roles: ['ADMIN'] },
    { path: '/users', icon: menuIcons.users, label: 'Kelola User', roles: ['ADMIN'] },
    { type: 'title', label: 'Input Data', roles: ['ADMIN'] },
    { path: '/attendance-input', icon: menuIcons.attendance, label: 'Input Presensi', roles: ['ADMIN'] },
    { path: '/ckp-input', icon: menuIcons.ckp, label: 'Input CKP', roles: ['ADMIN'] },
    { type: 'divider', roles: ['ADMIN', 'PIMPINAN'] },
    { type: 'title', label: 'Analisis', roles: ['ADMIN', 'PIMPINAN'] },
    { path: '/final-calculation', icon: menuIcons.calculation, label: 'Perhitungan Final', roles: ['ADMIN'] },
    { path: '/monitoring', icon: menuIcons.monitoring, label: 'Monitoring', roles: ['ADMIN', 'PIMPINAN'] },
    { path: '/users', icon: menuIcons.users, label: 'Data Pegawai', roles: ['PIMPINAN'] },
  ];
  const allowedMenus = menuItems.filter(item => item.roles.includes(user?.role));

  const getInitial = (name) => {
    if (!name) return '?';
    const parts = name.split(' ');
    if (parts.length > 1) {
      return parts[0][0] + parts[1][0];
    }
    return name.substring(0, 2);
  };

  return (
    <div className={`sidebar ${isCollapsed ? 'collapsed' : ''} ${isMobileOpen ? 'open' : ''}`}>
      <div className="sidebar-header" onClick={onToggleClick}>
        {/* 1. Beri class pada SVG dan hapus width/height agar diatur oleh CSS */}
        <svg className="logo-icon" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M13 29V18.5C13 16.567 14.567 15 16.5 15H20.5" stroke="white" strokeWidth="3" strokeLinecap="round"/>
          <path d="M20.5 15H23.5C25.433 15 27 16.567 27 18.5V29" stroke="white" strokeWidth="3" strokeLinecap="round"/>
          <path d="M20.5 29V24C20.5 22.3431 19.1569 21 17.5 21H16.5" stroke="white" strokeWidth="3" strokeLinecap="round"/>
        </svg>
        {/* 2. Beri class pada H4 dan hapus div pembungkusnya */}
        <h4 className="logo-text mt-1 mb-0 fw-bold text-white">SIPEKA</h4>
      </div>

      <nav className="nav-menu">
        {/* ... (mapping of menuItems remains the same) ... */}
        {allowedMenus.map((item, index) => {
          if (item.type === 'divider') {
            return <hr key={`divider-${index}`} className="my-2" style={{borderColor: 'rgba(255,255,255,0.1)'}} />;
          }
          if (item.type === 'title') {
            return <h6 key={`title-${index}`} className="nav-section-title">{item.label}</h6>;
          }
          const isActive = location.pathname === item.path;
          return (
            <div key={item.path + index} className="nav-item" title={isCollapsed ? item.label : ''}>
              <a href={item.path} className={`nav-link ${isActive ? 'active' : ''}`}>
                <Icon path={item.icon} />
                <span className="nav-label">{item.label}</span>
              </a>
            </div>
          );
        })}
      </nav>

      {/* ... (sidebar-footer remains the same) ... */}
      <div className="sidebar-footer">
         <div className="user-profile">
            <div className="user-avatar">{getInitial(user?.nama)}</div>
            <div className="user-info">
              <p className="user-name">{user?.nama}</p>
              <p className="user-role">{user?.role}</p>
            </div>
         </div>
         <div className="nav-item mt-2" title={isCollapsed ? "Logout" : ''}>
            <a href="#" onClick={logout} className="nav-link">
                <Icon path={menuIcons.logout} />
                <span className="nav-label">Logout</span>
            </a>
         </div>
      </div>
    </div>
  );
};

export default Sidebar;