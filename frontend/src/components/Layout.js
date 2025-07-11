// src/components/Layout.js - INTEGRATED VERSION

import React, { useState, useEffect } from 'react';
import Sidebar from './Sidebar';
import { useAuth } from '../context/AuthContext';
import '../styles/Layout.scss';

const Layout = ({ children }) => {
  // 1. Ambil status awal dari localStorage, jika tidak ada, default-nya 'false' (terbuka)
  const getInitialSidebarState = () => {
    const savedState = localStorage.getItem('sidebarCollapsed');
    return savedState ? JSON.parse(savedState) : false;
  };

  const [isSidebarCollapsed, setSidebarCollapsed] = useState(getInitialSidebarState);

  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  const [isSidebarOpen, setSidebarOpen] = useState(false);
  const { user, logout } = useAuth();

  // 2. useEffect ini akan menyimpan status sidebar setiap kali berubah
  useEffect(() => {
    // Jangan simpan state saat di tampilan mobile karena logikanya berbeda (selalu collapsed)
    if (!isMobile) {
      localStorage.setItem('sidebarCollapsed', JSON.stringify(isSidebarCollapsed));
    }
  }, [isSidebarCollapsed, isMobile]);

  const handleResize = () => {
    const mobileView = window.innerWidth <= 768;
    setIsMobile(mobileView);

    if (mobileView) {
      setSidebarCollapsed(true);
      setSidebarOpen(false);
    }
    // 3. Logika yang me-reset state di tampilan desktop DIHAPUS agar tidak menimpa pilihan user
  };

  useEffect(() => {
    window.addEventListener('resize', handleResize);
    handleResize();
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const toggleMobileSidebar = () => {
    setSidebarOpen(!isSidebarOpen);
  };

  const toggleDesktopSidebar = () => {
    setSidebarCollapsed(prevState => !prevState);
  };

  return (
    <div className="app-layout">
      <Sidebar
        isCollapsed={isSidebarCollapsed}
        isMobileOpen={isSidebarOpen}
        onToggleClick={toggleDesktopSidebar}
      />
      
      <div className="main-content-wrapper flex-grow-1 d-flex flex-column">
        <header className="top-bar d-md-none d-flex align-items-center justify-content-between shadow-sm">
          <button className="sidebar-toggle" onClick={toggleMobileSidebar}>
            <i className="fas fa-bars"></i>
          </button>
          
          <div className="d-flex align-items-center">
            {user && (
              <div className="dropdown">
                <button className="btn btn-light dropdown-toggle" type="button" data-bs-toggle="dropdown" aria-expanded="false">
                  <i className="fas fa-user-circle me-2"></i>
                  {user.nama}
                </button>
                <ul className="dropdown-menu dropdown-menu-end">
                  <li><a className="dropdown-item" href="/profile">Profil</a></li>
                  {/* NEW: Add Evaluation History to mobile dropdown */}
                  {(user.role === 'STAFF' || user.role === 'PIMPINAN') && (
                    <li>
                      <a className="dropdown-item" href="/evaluation-history">
                        <i className="fas fa-history me-2"></i>
                        Riwayat Penilaian
                      </a>
                    </li>
                  )}
                  <li><hr className="dropdown-divider" /></li>
                  <li><button className="dropdown-item text-danger" onClick={logout}>Logout</button></li>
                </ul>
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