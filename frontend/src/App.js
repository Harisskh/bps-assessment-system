// src/App.js - UPDATED WITH ALL NEW ROUTES
import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';

// Pages
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import EvaluationPage from './pages/EvaluationPage';
import EvaluationManagementPage from './pages/EvaluationManagementPage';
import UsersPage from './pages/UsersPage';

// NEW PAGES
import PeriodManagementPage from './pages/PeriodManagementPage';
import AttendanceInputPage from './pages/AttendanceInputPage';
import CkpInputPage from './pages/CkpInputPage';
import EnhancedMonitoringPage from './pages/EnhancedMonitoringPage';
import FinalCalculationPage from './pages/FinalCalculationPage';

// Components
import Navbar from './components/Navbar';
import Sidebar from './components/Sidebar';

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

// Layout component
const Layout = ({ children }) => {
  return (
    <div className="d-flex">
      <Sidebar />
      <div className="flex-grow-1">
        <Navbar />
        <div className="container-fluid p-4">
          {children}
        </div>
      </div>
    </div>
  );
};

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          {/* Public routes */}
          <Route path="/login" element={<LoginPage />} />
          
          {/* Protected routes */}
          <Route path="/dashboard" element={
            <ProtectedRoute>
              <Layout>
                <DashboardPage />
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
          
          {/* Admin & Pimpinan Routes */}
          <Route path="/users" element={
            <ProtectedRoute requiredRole={['ADMIN', 'PIMPINAN']}>
              <Layout>
                <UsersPage />
              </Layout>
            </ProtectedRoute>
          } />
          
          <Route path="/monitoring" element={
            <ProtectedRoute requiredRole={['ADMIN', 'PIMPINAN']}>
              <Layout>
                <EnhancedMonitoringPage />
              </Layout>
            </ProtectedRoute>
          } />
          
          {/* Legacy routes - keep for backward compatibility */}
          <Route path="/attendance" element={
            <ProtectedRoute requiredRole={['ADMIN']}>
              <Layout>
                <AttendanceInputPage />
              </Layout>
            </ProtectedRoute>
          } />
          
          <Route path="/ckp" element={
            <ProtectedRoute requiredRole={['ADMIN']}>
              <Layout>
                <CkpInputPage />
              </Layout>
            </ProtectedRoute>
          } />
          
          {/* Default redirect */}
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;