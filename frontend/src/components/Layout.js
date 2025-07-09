// src/components/Layout.js - UPDATED LAYOUT WITHOUT NAVBAR
import React from 'react';
import Sidebar from './Sidebar';

const Layout = ({ children }) => {
  return (
    <div className="d-flex min-vh-100">
      {/* Sidebar Component */}
      <Sidebar />
      
      {/* Main Content Area */}
      <div className="main-content flex-grow-1">
        {children}
      </div>
    </div>
  );
};

export default Layout;