// src/components/Navbar.js - Enhanced with Logout Function
import React from 'react';
import { useAuth } from '../context/AuthContext';

const Navbar = () => {
  const { user, logout } = useAuth();

  const handleLogout = () => {
    logout();
    window.location.href = '/login';
  };

  return (
    <nav className="navbar navbar-expand-lg navbar-dark bg-primary">
      <div className="container-fluid">
        <span className="navbar-brand">
          <i className="fas fa-chart-line me-2"></i>
          BPS Assessment System
        </span>
        
        <div className="navbar-nav ms-auto">
          <div className="nav-item dropdown">
            <button 
              className="nav-link dropdown-toggle btn btn-link text-white" 
              type="button"
              data-bs-toggle="dropdown"
              style={{ border: 'none', textDecoration: 'none' }}
            >
              <i className="fas fa-user-circle me-2"></i>
              {user?.nama}
            </button>
            <ul className="dropdown-menu dropdown-menu-end">
              <li>
                <div className="dropdown-item-text">
                  <div className="fw-bold">{user?.nama}</div>
                  <small className="text-muted">{user?.jabatan}</small>
                </div>
              </li>
              <li>
                <div className="dropdown-item-text">
                  <span className={`badge ${user?.role === 'ADMIN' ? 'bg-danger' : user?.role === 'PIMPINAN' ? 'bg-warning text-dark' : 'bg-primary'}`}>
                    {user?.role}
                  </span>
                </div>
              </li>
              <li><hr className="dropdown-divider" /></li>
              <li>
                <button className="dropdown-item" onClick={handleLogout}>
                  <i className="fas fa-sign-out-alt me-2"></i>
                  Logout
                </button>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;