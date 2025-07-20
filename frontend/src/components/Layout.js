// src/components/Layout.js - ENHANCED VERSION WITH WORKING MOBILE DROPDOWN

import React, { useState, useEffect } from 'react';
import Sidebar from './Sidebar';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import '../styles/Layout.scss';

const Layout = ({ children }) => {
  // Sidebar state management
  const getInitialSidebarState = () => {
    const savedState = localStorage.getItem('sidebarCollapsed');
    return savedState ? JSON.parse(savedState) : false;
  };

  const [isSidebarCollapsed, setSidebarCollapsed] = useState(getInitialSidebarState);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  const [isSidebarOpen, setSidebarOpen] = useState(false);
  
  // 🔥 NEW: Mobile dropdown state
  const [isMobileDropdownOpen, setMobileDropdownOpen] = useState(false);
  
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  // Save sidebar state
  useEffect(() => {
    if (!isMobile) {
      localStorage.setItem('sidebarCollapsed', JSON.stringify(isSidebarCollapsed));
    }
  }, [isSidebarCollapsed, isMobile]);

  // Handle window resize
  const handleResize = () => {
    const mobileView = window.innerWidth <= 768;
    setIsMobile(mobileView);

    if (mobileView) {
      setSidebarCollapsed(true);
      setSidebarOpen(false);
    }
  };

  useEffect(() => {
    window.addEventListener('resize', handleResize);
    handleResize();
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // 🔥 NEW: Handle click outside dropdown
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (!e.target.closest('.mobile-user-dropdown')) {
        setMobileDropdownOpen(false);
      }
    };

    if (isMobileDropdownOpen) {
      document.addEventListener('click', handleClickOutside);
    }

    return () => {
      document.removeEventListener('click', handleClickOutside);
    };
  }, [isMobileDropdownOpen]);

  const toggleMobileSidebar = () => {
    setSidebarOpen(!isSidebarOpen);
  };

  const toggleDesktopSidebar = () => {
    setSidebarCollapsed(prevState => !prevState);
  };

  // 🔥 NEW: Mobile dropdown handlers
  const toggleMobileDropdown = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setMobileDropdownOpen(!isMobileDropdownOpen);
  };

  const handleDropdownItemClick = (path) => {
    setMobileDropdownOpen(false);
    navigate(path);
  };

  const handleLogout = () => {
    setMobileDropdownOpen(false);
    logout();
  };

  return (
    <div className="app-layout">
      <Sidebar
        isCollapsed={isSidebarCollapsed}
        isMobileOpen={isSidebarOpen}
        onToggleClick={toggleDesktopSidebar}
      />
      
      <div className="main-content-wrapper flex-grow-1 d-flex flex-column">
        {/* 🔥 ENHANCED: Mobile header with working dropdown */}
        <header className="top-bar d-md-none d-flex align-items-center justify-content-between shadow-sm">
          <button className="sidebar-toggle" onClick={toggleMobileSidebar}>
            <i className="fas fa-bars"></i>
          </button>
          
          <div className="d-flex align-items-center">
            {user && (
              <div className="mobile-user-dropdown">
                <button 
                  className={`mobile-dropdown-toggle ${isMobileDropdownOpen ? 'active' : ''}`}
                  onClick={toggleMobileDropdown}
                  type="button"
                >
                  <i className="fas fa-user-circle me-2"></i>
                  {user.nama}
                  <i className={`fas fa-chevron-down ms-2 ${isMobileDropdownOpen ? 'rotated' : ''}`}></i>
                </button>
                
                <div className={`mobile-dropdown-menu ${isMobileDropdownOpen ? 'show' : ''}`}>
                  <button 
                    className="mobile-dropdown-item" 
                    onClick={() => handleDropdownItemClick('/profile')}
                  >
                    <i className="fas fa-user me-2"></i>
                    Lihat Profile
                  </button>
                  
                  {(user.role === 'STAFF' || user.role === 'PIMPINAN') && (
                    <button 
                      className="mobile-dropdown-item" 
                      onClick={() => handleDropdownItemClick('/evaluation-history')}
                    >
                      <i className="fas fa-history me-2"></i>
                      Riwayat Penilaian
                    </button>
                  )}
                  
                  <div className="mobile-dropdown-divider"></div>
                  
                  <button 
                    className="mobile-dropdown-item text-danger" 
                    onClick={handleLogout}
                  >
                    <i className="fas fa-sign-out-alt me-2"></i>
                    Logout
                  </button>
                </div>
              </div>
            )}
          </div>
        </header>

        <main className="main-content flex-grow-1 position-relative">
          {children}
        </main>
      </div>

      {isMobile && isSidebarOpen && (
        <div className="sidebar-overlay" onClick={toggleMobileSidebar}></div>
      )}
    </div>
  );
};

export default Layout;