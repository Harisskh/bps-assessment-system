// src/components/Sidebar.js - UPDATED WITH ALL NEW MENU ITEMS
import React from 'react';
import { useAuth } from '../context/AuthContext';
import { useLocation } from 'react-router-dom';

const Sidebar = () => {
  const { user } = useAuth();
  const location = useLocation();
  
  const menuItems = [
    // Dashboard - All users
    { path: '/dashboard', icon: 'fas fa-home', label: 'Dashboard', roles: ['STAFF', 'ADMIN', 'PIMPINAN'] },
    
    // Evaluation - Staff & Pimpinan
    { path: '/evaluation', icon: 'fas fa-star', label: 'Penilaian BerAKHLAK', roles: ['STAFF', 'PIMPINAN'] },
    
    // Admin Management Section
    { path: '/period-management', icon: 'fas fa-calendar-alt', label: 'Kelola Periode', roles: ['ADMIN'] },
    { path: '/evaluation-management', icon: 'fas fa-clipboard-list', label: 'Kelola Penilaian', roles: ['ADMIN'] },
    { path: '/users', icon: 'fas fa-users', label: 'Kelola User', roles: ['ADMIN'] },
    
    // Data Input Section (Admin)
    { path: '/attendance-input', icon: 'fas fa-calendar-check', label: 'Input Presensi', roles: ['ADMIN'] },
    { path: '/ckp-input', icon: 'fas fa-chart-line', label: 'Input CKP', roles: ['ADMIN'] },
    
    // Final Calculation (Admin)
    { path: '/final-calculation', icon: 'fas fa-calculator', label: 'Perhitungan Final', roles: ['ADMIN'] },
    
    // Monitoring & Reports (Admin & Pimpinan)
    { path: '/users', icon: 'fas fa-users', label: 'Data Pegawai', roles: ['PIMPINAN'] }, // Different label for Pimpinan
    { path: '/monitoring', icon: 'fas fa-chart-pie', label: 'Monitoring', roles: ['ADMIN', 'PIMPINAN'] },
  ];

  const allowedMenus = menuItems.filter(item => item.roles.includes(user?.role));

  // Group menus by role for better organization
  const getMenuSections = () => {
    const sections = [];
    
    if (user?.role === 'ADMIN') {
      sections.push(
        {
          title: 'Dashboard',
          items: allowedMenus.filter(item => item.path === '/dashboard')
        },
        {
          title: 'Manajemen Sistem',
          items: allowedMenus.filter(item => 
            ['/period-management', '/evaluation-management', '/users'].includes(item.path)
          )
        },
        {
          title: 'Input Data',
          items: allowedMenus.filter(item => 
            ['/attendance-input', '/ckp-input'].includes(item.path)
          )
        },
        {
          title: 'Perhitungan & Monitoring',
          items: allowedMenus.filter(item => 
            ['/final-calculation', '/monitoring'].includes(item.path)
          )
        }
      );
    } else if (user?.role === 'PIMPINAN') {
      sections.push(
        {
          title: 'Dashboard',
          items: allowedMenus.filter(item => item.path === '/dashboard')
        },
        {
          title: 'Penilaian',
          items: allowedMenus.filter(item => item.path === '/evaluation')
        },
        {
          title: 'Monitoring & Data',
          items: allowedMenus.filter(item => 
            ['/users', '/monitoring'].includes(item.path)
          )
        }
      );
    } else {
      // STAFF - Simple menu
      sections.push(
        {
          title: 'Menu Utama',
          items: allowedMenus
        }
      );
    }
    
    return sections;
  };

  const sections = getMenuSections();

  return (
    <div className="bg-dark text-white" style={{ width: '280px', minHeight: '100vh' }}>
      <div className="p-3">
        {/* Header */}
        <div className="text-center mb-4">
          <h6 className="text-uppercase mb-1">BPS Assessment</h6>
          <small className="text-muted">Sistem Penilaian Pegawai</small>
        </div>
        
        <hr className="border-secondary" />

        {/* Menu Sections */}
        {sections.map((section, sectionIndex) => (
          <div key={sectionIndex} className="mb-4">
            {/* Section Title - Only show if more than one section */}
            {sections.length > 1 && (
              <h6 className="text-muted text-uppercase small mb-2 px-2">
                {section.title}
              </h6>
            )}
            
            {/* Menu Items */}
            <ul className="nav flex-column">
              {section.items.map((item, index) => {
                const isActive = location.pathname === item.path;
                return (
                  <li key={`${item.path}-${index}`} className="nav-item mb-1">
                    <a 
                      href={item.path} 
                      className={`nav-link text-white d-flex align-items-center px-3 py-2 rounded ${isActive ? 'bg-primary' : 'hover-bg-dark'}`}
                      style={{ 
                        textDecoration: 'none',
                        transition: 'all 0.2s ease-in-out'
                      }}
                      onMouseEnter={(e) => {
                        if (!isActive) {
                          e.target.style.backgroundColor = 'rgba(255,255,255,0.1)';
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!isActive) {
                          e.target.style.backgroundColor = 'transparent';
                        }
                      }}
                    >
                      <i className={`${item.icon} me-3`} style={{ width: '20px' }}></i>
                      <span className="small">{item.label}</span>
                      {isActive && (
                        <i className="fas fa-chevron-right ms-auto"></i>
                      )}
                    </a>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}

        {/* Quick Stats for Admin */}
        {user?.role === 'ADMIN' && (
          <div className="mt-3 px-3">
            <div className="bg-dark border border-secondary rounded p-2">
              <div className="text-center">
                <small className="text-muted d-block">System Status</small>
                <div className="d-flex justify-content-between mt-1">
                  <span className="badge bg-success small">Online</span>
                  <span className="badge bg-info small">v1.0</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Sidebar;