// src/App.js - FIXED WITH CONSISTENT PROTECTEDROUTE USAGE
import React, { Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';

// Pages
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import EvaluationPage from './pages/EvaluationPage';
import EvaluationManagementPage from './pages/EvaluationManagementPage';
import UsersPage from './pages/UsersPage';
import ProfilePage from './pages/ProfilePage';
import EvaluationHistoryPage from './pages/EvaluationHistoryPage';

// NEW PAGES
import PeriodManagementPage from './pages/PeriodManagementPage';
import AttendanceInputPage from './pages/AttendanceInputPage';
import CkpInputPage from './pages/CkpInputPage';
import EnhancedMonitoringPage from './pages/EnhancedMonitoringPage';
import FinalCalculationPage from './pages/FinalCalculationPage';
import ComprehensiveReportPage from './pages/ComprehensiveReportPage';

// 🔥 CERTIFICATE PAGES
import CertificateManagementPage from './pages/CertificateManagementPage';
import CertificatePage from './pages/CertificatePage';

// Components
import Layout from './components/Layout';

// Protected Route component
const ProtectedRoute = ({ children, requiredRole = null }) => {
  const { user, loading } = useAuth();
  
  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ height: '100vh' }}>
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
      </div>
    );
  }
  
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  
  if (requiredRole && !requiredRole.includes(user.role)) {
    return <Navigate to="/dashboard" replace />;
  }
  
  return children;
};

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          {/* Public routes */}
          <Route path="/login" element={<LoginPage />} />
          
          {/* Protected routes dengan Layout yang sudah include Sidebar */}
          <Route path="/dashboard" element={
            <ProtectedRoute>
              <Layout>
                <DashboardPage />
              </Layout>
            </ProtectedRoute>
          } />
          
          {/* Profile Route - Available for all authenticated users */}
          <Route path="/profile" element={
            <ProtectedRoute>
              <Layout>
                <ProfilePage />
              </Layout>
            </ProtectedRoute>
          } />
          
          {/* Staff & Pimpinan only - Evaluation */}
          <Route path="/evaluation" element={
            <ProtectedRoute requiredRole={['STAFF', 'PIMPINAN']}>
              <Layout>
                <EvaluationPage />
              </Layout>
            </ProtectedRoute>
          } />
          
          {/* Evaluation History Route - Staff & Pimpinan only */}
          <Route path="/evaluation-history" element={
            <ProtectedRoute requiredRole={['STAFF', 'PIMPINAN']}>
              <Layout>
                <EvaluationHistoryPage />
              </Layout>
            </ProtectedRoute>
          } />

          {/* 🔥 FIXED: Certificate route for STAFF menggunakan ProtectedRoute */}
          <Route path="/my-certificates" element={
            <ProtectedRoute requiredRole={['STAFF']}>
              <Layout>
                <CertificatePage />
              </Layout>
            </ProtectedRoute>
          } />
          
          {/* Admin only - Management Routes */}
          <Route path="/evaluation-management" element={
            <ProtectedRoute requiredRole={['ADMIN']}>
              <Layout>
                <EvaluationManagementPage />
              </Layout>
            </ProtectedRoute>
          } />
          
          <Route path="/period-management" element={
            <ProtectedRoute requiredRole={['ADMIN']}>
              <Layout>
                <PeriodManagementPage />
              </Layout>
            </ProtectedRoute>
          } />
          
          <Route path="/attendance-input" element={
            <ProtectedRoute requiredRole={['ADMIN']}>
              <Layout>
                <AttendanceInputPage />
              </Layout>
            </ProtectedRoute>
          } />
          
          <Route path="/ckp-input" element={
            <ProtectedRoute requiredRole={['ADMIN']}>
              <Layout>
                <CkpInputPage />
              </Layout>
            </ProtectedRoute>
          } />
          
          <Route path="/final-calculation" element={
            <ProtectedRoute requiredRole={['ADMIN']}>
              <Layout>
                <FinalCalculationPage />
              </Layout>
            </ProtectedRoute>
          } />

          {/* 🔥 Certificate Management Route - Admin & Pimpinan */}
          <Route path="/certificate-management" element={
            <ProtectedRoute requiredRole={['ADMIN', 'PIMPINAN']}>
              <Layout>
                <CertificateManagementPage />
              </Layout>
            </ProtectedRoute>
          } />
          
          {/* Admin & Pimpinan - Users/Data Pegawai */}
          <Route path="/users" element={
            <ProtectedRoute requiredRole={['ADMIN', 'PIMPINAN']}>
              <Layout>
                <UsersPage />
              </Layout>
            </ProtectedRoute>
          } />
          
          {/* Admin & Pimpinan - Monitoring */}
          <Route path="/monitoring" element={
            <ProtectedRoute requiredRole={['ADMIN', 'PIMPINAN']}>
              <Layout>
                <EnhancedMonitoringPage />
              </Layout>
            </ProtectedRoute>
          } />

          {/* Admin & Pimpinan - Reports */}
          <Route path="/reports" element={
            <ProtectedRoute requiredRole={['ADMIN', 'PIMPINAN']}>
              <Layout>
                <ComprehensiveReportPage />
              </Layout>
            </ProtectedRoute>
          } />
          
          {/* Redirect root to dashboard */}
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          
          {/* 404 Route */}
          <Route path="*" element={
            <ProtectedRoute>
              <Layout>
                <div className="container-fluid p-4">
                  <div className="text-center">
                    <h1 className="display-1">404</h1>
                    <h2>Halaman Tidak Ditemukan</h2>
                    <p className="lead">Halaman yang Anda cari tidak tersedia.</p>
                    <a href="/dashboard" className="btn btn-primary">
                      <i className="fas fa-home me-2"></i>
                      Kembali ke Dashboard
                    </a>
                  </div>
                </div>
              </Layout>
            </ProtectedRoute>
          } />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;