// src/pages/DashboardPage.js - FIXED ADMIN DASHBOARD (No Evaluation Access)
import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { dashboardAPI, finalEvaluationAPI, periodAPI, testConnection, evaluationAPI } from '../services/api';

// Simple inline API Test component
const ApiTest = () => {
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);

  const runTests = async () => {
    setLoading(true);
    setResults([]);

    const tests = [
      {
        name: 'Backend Connection',
        test: async () => {
          const result = await testConnection();
          return result.success ? 'Connected' : 'Failed';
        }
      },
      {
        name: 'Get Parameters',
        test: async () => {
          const response = await evaluationAPI.getParameters();
          return `${response.data.data.parameters.length} parameters`;
        }
      },
      {
        name: 'Get Period',
        test: async () => {
          const response = await evaluationAPI.getActivePeriod();
          return response.data.data.period.namaPeriode;
        }
      }
    ];

    for (const testCase of tests) {
      try {
        const result = await testCase.test();
        setResults(prev => [...prev, { name: testCase.name, success: true, result }]);
      } catch (error) {
        setResults(prev => [...prev, { name: testCase.name, success: false, result: error.message }]);
      }
    }

    setLoading(false);
  };

  return (
    <div className="card">
      <div className="card-header">
        <h6 className="mb-0">API Test</h6>
      </div>
      <div className="card-body">
        <button 
          className="btn btn-primary btn-sm w-100 mb-2" 
          onClick={runTests}
          disabled={loading}
        >
          {loading ? 'Testing...' : 'Run Tests'}
        </button>
        
        {results.map((result, index) => (
          <div key={index} className={`small p-2 mb-1 rounded ${result.success ? 'bg-success bg-opacity-10' : 'bg-danger bg-opacity-10'}`}>
            <strong>{result.name}:</strong> {result.result}
          </div>
        ))}
      </div>
    </div>
  );
};

const DashboardPage = () => {
  const { user, logout } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Dashboard data
  const [stats, setStats] = useState(null);
  const [leaderboard, setLeaderboard] = useState([]);
  const [activePeriod, setActivePeriod] = useState(null);
  const [evaluationProgress, setEvaluationProgress] = useState(null);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      setError('');

      // Load basic data for all users
      try {
        const periodResponse = await periodAPI.getActive();
        setActivePeriod(periodResponse.data.data.period);
      } catch (error) {
        console.warn('Failed to load active period:', error);
      }

      try {
        const leaderboardResponse = await finalEvaluationAPI.getLeaderboard({ limit: 5 });
        setLeaderboard(leaderboardResponse.data.data.leaderboard);
      } catch (error) {
        console.warn('Failed to load leaderboard:', error);
      }

      // Load additional data for ADMIN/PIMPINAN only
      if (user?.role === 'ADMIN' || user?.role === 'PIMPINAN') {
        try {
          const [statsResponse, progressResponse] = await Promise.all([
            dashboardAPI.getStats(),
            dashboardAPI.getEvaluationProgress()
          ]);
          
          setStats(statsResponse.data.data);
          setEvaluationProgress(progressResponse.data.data);
        } catch (error) {
          console.warn('Failed to load admin/pimpinan data:', error);
        }
      }

    } catch (error) {
      console.error('Load dashboard data error:', error);
      if (user?.role === 'STAFF') {
        console.log('Staff dashboard loaded with limited data');
      } else {
        setError('Gagal memuat sebagian data dashboard');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    logout();
    window.location.href = '/login';
  };

  const getProgressPercentage = (completed, total) => {
    if (total === 0) return 0;
    return Math.round((completed / total) * 100);
  };

  const getProgressColor = (percentage) => {
    if (percentage >= 80) return 'bg-success';
    if (percentage >= 60) return 'bg-warning';
    return 'bg-danger';
  };

  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '50vh' }}>
        <div className="text-center">
          <div className="spinner-border text-primary mb-3" role="status" style={{ width: '3rem', height: '3rem' }}>
            <span className="visually-hidden">Loading...</span>
          </div>
          <p className="text-muted">Memuat dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container-fluid">
      {/* Header */}
      <div className="row mb-4">
        <div className="col-12">
          <div className="d-flex justify-content-between align-items-center">
            <div>
              <h1 className="h3 mb-1">Dashboard</h1>
              <p className="text-muted">
                Selamat datang, <strong>{user?.nama}</strong> | 
                <span className={`badge ms-2 ${user?.role === 'ADMIN' ? 'bg-danger' : user?.role === 'PIMPINAN' ? 'bg-warning text-dark' : 'bg-primary'}`}>
                  {user?.role}
                </span>
              </p>
            </div>
            <div className="d-flex align-items-center gap-3">
              {activePeriod && (
                <div className="text-end">
                  <small className="text-muted">Periode Aktif</small>
                  <h6 className="mb-0">{activePeriod.namaPeriode}</h6>
                </div>
              )}
              <button 
                className="btn btn-outline-danger btn-sm"
                onClick={handleLogout}
                title="Logout"
              >
                <i className="fas fa-sign-out-alt me-2"></i>
                Logout
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="alert alert-danger alert-dismissible fade show">
          <i className="fas fa-exclamation-triangle me-2"></i>
          {error}
          <button type="button" className="btn-close" onClick={() => setError('')}></button>
        </div>
      )}

      {/* Quick Actions for Staff */}
      {user?.role === 'STAFF' && (
        <div className="row mb-4">
          <div className="col-12">
            <div className="card border-primary">
              <div className="card-body text-center py-4">
                <h5 className="card-title text-primary">
                  <i className="fas fa-star me-2"></i>
                  Penilaian Tokoh BerAKHLAK
                </h5>
                <p className="card-text text-muted">
                  Lakukan penilaian untuk periode <strong>{activePeriod?.namaPeriode}</strong>
                </p>
                <a href="/evaluation" className="btn btn-primary btn-lg">
                  <i className="fas fa-pencil-alt me-2"></i>
                  Mulai Penilaian
                </a>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Statistics Cards - Admin/Pimpinan Only */}
      {(user?.role === 'ADMIN' || user?.role === 'PIMPINAN') && stats && (
        <div className="row mb-4">
          <div className="col-md-3">
            <div className="card bg-primary text-white">
              <div className="card-body">
                <div className="d-flex justify-content-between align-items-center">
                  <div>
                    <h6 className="card-title mb-0">Total Pegawai</h6>
                    <h3 className="mb-0">{stats.overview.totalUsers}</h3>
                  </div>
                  <i className="fas fa-users fa-2x opacity-75"></i>
                </div>
              </div>
            </div>
          </div>
          <div className="col-md-3">
            <div className="card bg-success text-white">
              <div className="card-body">
                <div className="d-flex justify-content-between align-items-center">
                  <div>
                    <h6 className="card-title mb-0">Sudah Menilai</h6>
                    <h3 className="mb-0">{stats.overview.completedEvaluations}</h3>
                    <small>{stats.overview.completionRate}%</small>
                  </div>
                  <i className="fas fa-check-circle fa-2x opacity-75"></i>
                </div>
              </div>
            </div>
          </div>
          <div className="col-md-3">
            <div className="card bg-warning text-dark">
              <div className="card-body">
                <div className="d-flex justify-content-between align-items-center">
                  <div>
                    <h6 className="card-title mb-0">Rata-rata Presensi</h6>
                    <h3 className="mb-0">{stats.scores.attendance.average.toFixed(1)}</h3>
                  </div>
                  <i className="fas fa-calendar-check fa-2x opacity-75"></i>
                </div>
              </div>
            </div>
          </div>
          <div className="col-md-3">
            <div className="card bg-info text-white">
              <div className="card-body">
                <div className="d-flex justify-content-between align-items-center">
                  <div>
                    <h6 className="card-title mb-0">Rata-rata CKP</h6>
                    <h3 className="mb-0">{stats.scores.ckp.average.toFixed(1)}</h3>
                  </div>
                  <i className="fas fa-chart-line fa-2x opacity-75"></i>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="row">
        {/* Best Employee / Leaderboard */}
        <div className="col-md-8">
          <div className="card h-100">
            <div className="card-header">
              <h5 className="card-title mb-0">
                <i className="fas fa-trophy text-warning me-2"></i>
                {leaderboard.length > 0 && leaderboard[0]?.isBestEmployee 
                  ? 'Best Employee of the Month' 
                  : 'Top Performers'
                }
              </h5>
            </div>
            <div className="card-body">
              {leaderboard.length === 0 ? (
                <div className="text-center py-4">
                  <i className="fas fa-award fa-3x text-muted mb-3"></i>
                  <p className="text-muted">Belum ada data evaluasi untuk periode ini</p>
                </div>
              ) : (
                <div className="row">
                  {leaderboard.map((employee, index) => (
                    <div key={employee.user.id} className="col-12 mb-3">
                      <div className={`card ${index === 0 && employee.isBestEmployee ? 'border-warning bg-light' : 'border-light'}`}>
                        <div className="card-body py-3">
                          <div className="d-flex justify-content-between align-items-center">
                            <div className="d-flex align-items-center">
                              <div className={`badge ${index === 0 ? 'bg-warning text-dark' : index === 1 ? 'bg-secondary' : 'bg-light text-dark'} me-3 fs-6`}>
                                #{index + 1}
                              </div>
                              <div>
                                <h6 className="mb-0">{employee.user.nama}</h6>
                                <small className="text-muted">{employee.user.jabatan}</small>
                                {index === 0 && employee.isBestEmployee && (
                                  <span className="badge bg-warning text-dark ms-2">
                                    <i className="fas fa-crown me-1"></i>
                                    Best Employee
                                  </span>
                                )}
                              </div>
                            </div>
                            <div className="text-end">
                              <strong className="text-primary">{employee.finalScore.toFixed(2)}</strong>
                              <div className="small text-muted">
                                B:{employee.berakhlakScore.toFixed(1)} | 
                                P:{employee.presensiScore.toFixed(1)} | 
                                C:{employee.ckpScore.toFixed(1)}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Evaluation Progress - Admin/Pimpinan Only */}
        <div className="col-md-4">
          {(user?.role === 'ADMIN' || user?.role === 'PIMPINAN') && evaluationProgress ? (
            <div className="card h-100">
              <div className="card-header">
                <h5 className="card-title mb-0">
                  <i className="fas fa-chart-pie me-2"></i>
                  Progress Evaluasi
                </h5>
              </div>
              <div className="card-body">
                <div className="text-center mb-4">
                  <div className="position-relative d-inline-block">
                    <div 
                      className="progress mx-auto" 
                      style={{ width: '120px', height: '120px', borderRadius: '50%' }}
                    >
                      <div 
                        className={`progress-bar ${getProgressColor(getProgressPercentage(evaluationProgress.summary.completed, evaluationProgress.summary.total))}`}
                        style={{ 
                          width: `${getProgressPercentage(evaluationProgress.summary.completed, evaluationProgress.summary.total)}%`,
                          borderRadius: '50%'
                        }}
                      ></div>
                    </div>
                    <div className="position-absolute top-50 start-50 translate-middle">
                      <h4 className="mb-0">{getProgressPercentage(evaluationProgress.summary.completed, evaluationProgress.summary.total)}%</h4>
                      <small className="text-muted">Selesai</small>
                    </div>
                  </div>
                </div>
                
                <div className="row text-center">
                  <div className="col-4">
                    <div className="border-end">
                      <h6 className="text-success mb-0">{evaluationProgress.summary.completed}</h6>
                      <small className="text-muted">Selesai</small>
                    </div>
                  </div>
                  <div className="col-4">
                    <div className="border-end">
                      <h6 className="text-warning mb-0">{evaluationProgress.summary.partial}</h6>
                      <small className="text-muted">Sebagian</small>
                    </div>
                  </div>
                  <div className="col-4">
                    <h6 className="text-danger mb-0">{evaluationProgress.summary.notStarted}</h6>
                    <small className="text-muted">Belum</small>
                  </div>
                </div>

                <div className="mt-4">
                  <a href="/monitoring" className="btn btn-outline-primary btn-sm w-100">
                    <i className="fas fa-eye me-2"></i>
                    Lihat Detail
                  </a>
                </div>
              </div>
            </div>
          ) : (
            // Quick Links for Staff
            <div className="card h-100">
              <div className="card-header">
                <h5 className="card-title mb-0">
                  <i className="fas fa-link me-2"></i>
                  Menu Cepat
                </h5>
              </div>
              <div className="card-body">
                <div className="d-grid gap-2">
                  <a href="/evaluation" className="btn btn-outline-primary">
                    <i className="fas fa-star me-2"></i>
                    Penilaian BerAKHLAK
                  </a>
                  <a href="/dashboard" className="btn btn-outline-secondary">
                    <i className="fas fa-chart-bar me-2"></i>
                    Lihat Ranking
                  </a>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Quick Actions - FIXED: Admin can't do evaluation */}
      {(user?.role === 'ADMIN' || user?.role === 'PIMPINAN') && (
        <div className="row mt-4">
          <div className="col-12">
            <div className="card">
              <div className="card-header">
                <h5 className="card-title mb-0">
                  <i className="fas fa-cogs me-2"></i>
                  Aksi Cepat
                </h5>
              </div>
              <div className="card-body">
                <div className="row">
                  {user?.role === 'ADMIN' && (
                    <>
                      <div className="col-md-3 mb-3">
                        <a href="/users" className="btn btn-outline-primary w-100">
                          <i className="fas fa-users me-2"></i>
                          Kelola User
                        </a>
                      </div>
                      <div className="col-md-3 mb-3">
                        <a href="/attendance" className="btn btn-outline-success w-100">
                          <i className="fas fa-calendar-check me-2"></i>
                          Input Presensi
                        </a>
                      </div>
                    </>
                  )}
                  <div className="col-md-3 mb-3">
                    <a href="/monitoring" className="btn btn-outline-warning w-100">
                      <i className="fas fa-chart-pie me-2"></i>
                      Monitoring
                    </a>
                  </div>
                  {/* REMOVED: Evaluation access for Admin */}
                  {user?.role === 'PIMPINAN' && (
                    <div className="col-md-3 mb-3">
                      <a href="/evaluation" className="btn btn-outline-info w-100">
                        <i className="fas fa-star me-2"></i>
                        Ikut Menilai
                      </a>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* System Info */}
      <div className="row mt-4">
        <div className="col-md-8">
          <div className="card bg-light">
            <div className="card-body py-3">
              <div className="row align-items-center">
                <div className="col-md-8">
                  <h6 className="mb-1">
                    <i className="fas fa-info-circle me-2"></i>
                    Sistem Penilaian Pegawai BPS Kabupaten Pringsewu
                  </h6>
                  <small className="text-muted">
                    Sistem penilaian berbasis nilai BerAKHLAK, Presensi, dan CKP untuk menentukan Best Employee of the Month
                  </small>
                </div>
                <div className="col-md-4 text-end">
                  <small className="text-muted">
                    Logged in as: <strong>{user?.nama}</strong><br/>
                    Period: <strong>{activePeriod?.namaPeriode || 'Tidak ada periode aktif'}</strong>
                  </small>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        {/* API Test - Admin Only */}
        {user?.role === 'ADMIN' && (
          <div className="col-md-4">
            <ApiTest />
          </div>
        )}
      </div>
    </div>
  );
};

export default DashboardPage;