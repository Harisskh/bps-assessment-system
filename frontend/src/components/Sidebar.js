// src/components/Sidebar.js - UPDATED WITH EVALUATION MANAGEMENT
import React from 'react';
import { useAuth } from '../context/AuthContext';
import { useLocation } from 'react-router-dom';

const Sidebar = () => {
  const { user } = useAuth();
  const location = useLocation();
  
  const menuItems = [
    { path: '/dashboard', icon: 'fas fa-home', label: 'Dashboard', roles: ['STAFF', 'ADMIN', 'PIMPINAN'] },
    { path: '/evaluation', icon: 'fas fa-star', label: 'Penilaian', roles: ['STAFF', 'PIMPINAN'] },
    { path: '/evaluation-management', icon: 'fas fa-clipboard-list', label: 'Kelola Penilaian', roles: ['ADMIN'] },
    { path: '/users', icon: 'fas fa-users', label: 'Kelola User', roles: ['ADMIN'] },
    { path: '/users', icon: 'fas fa-users', label: 'Data Pegawai', roles: ['PIMPINAN'] },
    { path: '/attendance', icon: 'fas fa-calendar-check', label: 'Presensi', roles: ['ADMIN'] },
    { path: '/monitoring', icon: 'fas fa-chart-bar', label: 'Monitoring', roles: ['ADMIN', 'PIMPINAN'] },
  ];

  const allowedMenus = menuItems.filter(item => item.roles.includes(user?.role));

  return (
    <div className="bg-dark text-white" style={{ width: '250px', minHeight: '100vh' }}>
      <div className="p-3">
        <h6 className="text-center text-uppercase">Menu</h6>
        <hr />
        <ul className="nav flex-column">
          {allowedMenus.map((item, index) => {
            const isActive = location.pathname === item.path;
            return (
              <li key={`${item.path}-${index}`} className="nav-item">
                <a 
                  href={item.path} 
                  className={`nav-link text-white ${isActive ? 'bg-primary rounded' : ''}`}
                  style={{ textDecoration: 'none' }}
                >
                  <i className={`${item.icon} me-2`}></i>
                  {item.label}
                </a>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
};

export default Sidebar;