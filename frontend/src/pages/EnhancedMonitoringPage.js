// src/pages/EnhancedMonitoringPage.js - IMPROVED UI/UX CONSISTENT DESIGN
import React, { useState, useEffect } from 'react';
import { monitoringAPI, periodAPI, evaluationAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';

const EnhancedMonitoringPage = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  // Data states
  const [periods, setPeriods] = useState([]);
  const [evaluationStatus, setEvaluationStatus] = useState(null);
  const [incompleteUsers, setIncompleteUsers] = useState([]);
  const [selectedPeriod, setSelectedPeriod] = useState('');
  
  // Modal states
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedUserDetail, setSelectedUserDetail] = useState(null);
  const [userDetailData, setUserDetailData] = useState(null);
  
  // Filter states
  const [statusFilter, setStatusFilter] = useState(''); // '', 'COMPLETE', 'NOT_STARTED'
  const [departmentFilter, setDepartmentFilter] = useState('');

  useEffect(() => {
    loadInitialData();
  }, []);

  useEffect(() => {
    if (selectedPeriod) {
      loadMonitoringData();
    }
  }, [selectedPeriod]);

  const loadInitialData = async () => {
    try {
      setLoading(true);
      setError('');
      
      console.log('🔄 Loading initial data...');
      
      const periodsRes = await periodAPI.getAll({ limit: 50 });
      setPeriods(periodsRes.data.data.periods);

      // Set default to active period
      const activePeriod = periodsRes.data.data.periods.find(p => p.isActive);
      if (activePeriod) {
        setSelectedPeriod(activePeriod.id);
      }

      console.log('✅ Initial data loaded');

    } catch (error) {
      console.error('❌ Load initial data error:', error);
      setError('Gagal memuat data initial');
    } finally {
      setLoading(false);
    }
  };

  const loadMonitoringData = async () => {
    try {
      setLoading(true);
      setError('');
      
      console.log('🔄 Loading monitoring data for period:', selectedPeriod);
      
      const [statusRes, incompleteRes] = await Promise.all([
        monitoringAPI.getEvaluationStatus({ periodId: selectedPeriod }),
        monitoringAPI.getIncompleteUsers({ periodId: selectedPeriod })
      ]);

      console.log('📊 Status response:', statusRes.data);
      console.log('❌ Incomplete response:', incompleteRes.data);

      setEvaluationStatus(statusRes.data.data);
      setIncompleteUsers(incompleteRes.data.data.incompleteUsers);
      
      console.log('✅ Monitoring data loaded');
      
    } catch (error) {
      console.error('❌ Load monitoring data error:', error);
      setError('Gagal memuat data monitoring');
    } finally {
      setLoading(false);
    }
  };

  const handleShowUserDetail = async (userId) => {
    try {
      setLoading(true);
      setSelectedUserDetail(userId);
      
      console.log('👤 Loading user detail for:', userId);
      
      const response = await monitoringAPI.getUserDetail(userId, { periodId: selectedPeriod });
      console.log('📋 User detail response:', response.data);
      
      setUserDetailData(response.data.data);
      setShowDetailModal(true);
      
    } catch (error) {
      console.error('❌ Load user detail error:', error);
      setError('Gagal memuat detail user');
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    const badges = {
      COMPLETE: { bg: 'bg-success', icon: 'fa-check-circle', text: 'Selesai Menilai' },
      NOT_STARTED: { bg: 'bg-danger', icon: 'fa-times-circle', text: 'Belum Menilai' }
    };
    return badges[status] || badges.NOT_STARTED;
  };

  // Updated for single evaluation system
  const getProgressPercentage = (completedCount) => {
    return Math.round((completedCount / 1) * 100); // Only need 1 evaluation now
  };

  const filteredUserStatuses = evaluationStatus?.userStatuses?.filter(userStatus => {
    const matchesStatus = !statusFilter || userStatus.status === statusFilter;
    const matchesDepartment = !departmentFilter || 
      userStatus.user.jabatan?.toLowerCase().includes(departmentFilter.toLowerCase());
    return matchesStatus && matchesDepartment;
  }) || [];

  // Get unique departments for filter
  const departments = [...new Set(
    evaluationStatus?.userStatuses?.map(u => u.user.jabatan).filter(Boolean) || []
  )];

  // Calculate completion stats
  const completionStats = evaluationStatus ? {
    completed: evaluationStatus.summary.completed,
    notStarted: evaluationStatus.summary.total - evaluationStatus.summary.completed,
    total: evaluationStatus.summary.total,
    percentage: Math.round((evaluationStatus.summary.completed / evaluationStatus.summary.total) * 100)
  } : { completed: 0, notStarted: 0, total: 0, percentage: 0 };

  if (loading && !evaluationStatus) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '50vh' }}>
        <div className="text-center">
          <div className="spinner-border text-primary mb-3" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
          <p className="text-muted">Memuat data monitoring...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container-fluid">
      <div className="row">
        <div className="col-12">
          {/* Header - Consistent with other pages */}
          <div 
            className="d-flex justify-content-between align-items-center mb-4 p-4 text-white"
            style={{
              background: 'linear-gradient(135deg, #2c549c 0%, #3a6bb3 100%)',
              borderRadius: '1rem'
            }}
          >
            <div>
              <h2 className="mb-1">
                <i className="fas fa-chart-pie me-2"></i>
                Monitoring Evaluasi
              </h2>
              <p className="mb-0 opacity-75">Monitor progress pengisian evaluasi Tokoh BerAKHLAK</p>
            </div>
          </div>

          {/* Alert Messages */}
          {error && (
            <div className="alert alert-danger alert-dismissible fade show">
              <i className="fas fa-exclamation-triangle me-2"></i>
              {error}
              <button type="button" className="btn-close" onClick={() => setError('')}></button>
            </div>
          )}

          {success && (
            <div className="alert alert-success alert-dismissible fade show">
              <i className="fas fa-check-circle me-2"></i>
              {success}
              <button type="button" className="btn-close" onClick={() => setSuccess('')}></button>
            </div>
          )}

          {/* Info Card */}
          <div className="card border-info mb-4">
            <div className="card-body">
              <h6 className="card-title text-info">
                <i className="fas fa-info-circle me-2"></i>
                Sistem Monitoring Evaluasi BerAKHLAK
              </h6>
              <p className="text-muted mb-0">
                Pantau progress pengisian evaluasi Tokoh BerAKHLAK oleh seluruh pegawai. 
                Setiap pegawai hanya perlu memilih 1 tokoh BerAKHLAK dan memberikan penilaian pada 8 parameter.
              </p>
            </div>
          </div>


          {selectedPeriod && evaluationStatus ? (
            <>
              {/* Progress Overview - Enhanced */}
              <div className="row mb-4">
                <div className="col-md-3">
                  <div className="card border-primary">
                    <div className="card-body text-center">
                      <div className="text-primary mb-2">
                        <i className="fas fa-users fa-2x"></i>
                      </div>
                      <h4 className="text-primary mb-1">{completionStats.total}</h4>
                      <small className="text-muted">Total Pegawai</small>
                    </div>
                  </div>
                </div>
                <div className="col-md-3">
                  <div className="card border-success">
                    <div className="card-body text-center">
                      <div className="text-success mb-2">
                        <i className="fas fa-check-circle fa-2x"></i>
                      </div>
                      <h4 className="text-success mb-1">{completionStats.completed}</h4>
                      <small className="text-muted">Sudah Selesai</small>
                    </div>
                  </div>
                </div>
                <div className="col-md-3">
                  <div className="card border-danger">
                    <div className="card-body text-center">
                      <div className="text-danger mb-2">
                        <i className="fas fa-times-circle fa-2x"></i>
                      </div>
                      <h4 className="text-danger mb-1">{completionStats.notStarted}</h4>
                      <small className="text-muted">Belum Mulai</small>
                    </div>
                  </div>
                </div>
                <div className="col-md-3">
                  <div className="card border-info">
                    <div className="card-body text-center">
                      <div className="text-info mb-2">
                        <i className="fas fa-chart-pie fa-2x"></i>
                      </div>
                      <h4 className="text-info mb-1">{completionStats.percentage}%</h4>
                      <small className="text-muted">Progress Keseluruhan</small>
                    </div>
                  </div>
                </div>
              </div>

              {/* Filter & Period Selection - Unified */}
          <div className="card mb-4">
            <div className="card-body">
              <h6 className="text-muted mb-3">
                <i className="fas fa-filter me-2"></i>
                Filter & Pencarian Data
              </h6>
              <div className="row g-3 align-items-end">
                <div className="col-lg-3 col-md-6">
                  <label className="form-label">Periode Monitoring *</label>
                  <select
                    className="form-select"
                    value={selectedPeriod}
                    onChange={(e) => setSelectedPeriod(e.target.value)}
                  >
                    <option value="">-- Pilih Periode --</option>
                    {periods.map(period => (
                      <option key={period.id} value={period.id}>
                        {period.namaPeriode} {period.isActive && '(Aktif)'}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="col-lg-3 col-md-6">
                  <label className="form-label">Filter Status</label>
                  <select
                    className="form-select"
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                  >
                    <option value="">Semua Status</option>
                    <option value="COMPLETE">Selesai</option>
                    <option value="NOT_STARTED">Belum Mulai</option>
                  </select>
                </div>
                <div className="col-lg-3 col-md-6">
                  <label className="form-label">Filter Jabatan</label>
                  <select
                    className="form-select"
                    value={departmentFilter}
                    onChange={(e) => setDepartmentFilter(e.target.value)}
                  >
                    <option value="">Semua Jabatan</option>
                    {departments.map(dept => (
                      <option key={dept} value={dept}>{dept}</option>
                    ))}
                  </select>
                </div>
                <div className="col-lg-3 col-md-6">
                  <button 
                    type="button" 
                    className="btn btn-outline-primary w-100"
                    onClick={() => {
                      setStatusFilter('');
                      setDepartmentFilter('');
                    }}
                  >
                    <i className="fas fa-refresh me-2"></i>
                    Reset Filter
                  </button>
                </div>
              </div>
            </div>
          </div>

              {/* User Status Table - Consistent design */}
              <div className="card">
                <div 
                  className="card-header text-white d-flex justify-content-between align-items-center"
                  style={{ background: 'linear-gradient(135deg, #2c549c 0%, #3a6bb3 100%)' }}
                >
                  <h5 className="mb-0">
                    <i className="fas fa-users me-2"></i>
                    Status Pengisian Evaluasi - {periods.find(p => p.id === selectedPeriod)?.namaPeriode}
                  </h5>
                  <span className="badge bg-light text-dark">
                    {filteredUserStatuses.length} dari {evaluationStatus.userStatuses.length} pegawai
                  </span>
                </div>
                <div className="card-body">
                  {loading ? (
                    <div className="text-center py-4">
                      <div className="spinner-border text-primary" role="status">
                        <span className="visually-hidden">Loading...</span>
                      </div>
                      <p className="text-muted mt-2">Memuat data...</p>
                    </div>
                  ) : (
                    <>
                      {/* Desktop Table */}
                      <div className="d-none d-md-block">
                        <div className="table-responsive">
                          <table className="table table-hover">
                            <thead className="table-light">
                              <tr>
                                <th width="60">No.</th>
                                <th>Pegawai</th>
                                <th className="d-none d-lg-table-cell">Jabatan</th>
                                <th>Terakhir Update</th>
                                <th>Status</th>
                              </tr>
                            </thead>
                            <tbody>
                              {filteredUserStatuses.length === 0 ? (
                                <tr>
                                  <td colSpan="5" className="text-center py-5 text-muted">
                                    <i className="fas fa-search fa-2x mb-2"></i>
                                    <br />Tidak ada data sesuai filter
                                  </td>
                                </tr>
                              ) : (
                                filteredUserStatuses.map((userStatus, index) => {
                                  const statusBadge = getStatusBadge(userStatus.status);
                                  
                                  return (
                                    <tr 
                                      key={userStatus.user.id} 
                                      className={userStatus.status === 'NOT_STARTED' ? 'table-warning' : ''}
                                    >
                                      <td className="text-center fw-bold text-muted">
                                        {index + 1}
                                      </td>
                                      <td>
                                        <div>
                                          <strong className="text-primary">{userStatus.user.nama}</strong>
                                          <small className="d-block text-muted">NIP: {userStatus.user.nip || '-'}</small>
                                        </div>
                                      </td>
                                      <td className="d-none d-lg-table-cell">
                                        <small className="text-muted">{userStatus.user.jabatan || '-'}</small>
                                      </td>
                                      <td>
                                        {userStatus.lastSubmission ? (
                                          <small className="text-muted">
                                            {new Date(userStatus.lastSubmission).toLocaleDateString('id-ID', {
                                              day: '2-digit',
                                              month: 'short',
                                              hour: '2-digit',
                                              minute: '2-digit'
                                            })}
                                          </small>
                                        ) : (
                                          <span className="text-muted">-</span>
                                        )}
                                      </td>
                                      <td>
                                        <span className={`badge ${statusBadge.bg}`}>
                                          <i className={`fas ${statusBadge.icon} me-1`}></i>
                                          {statusBadge.text}
                                        </span>
                                      </td>
                                    </tr>
                                  );
                                })
                              )}
                            </tbody>
                          </table>
                        </div>
                      </div>

                      {/* Mobile Cards */}
                      <div className="d-md-none">
                        {filteredUserStatuses.length === 0 ? (
                          <div className="text-center py-5 text-muted">
                            <i className="fas fa-search fa-2x mb-2"></i>
                            <br />Tidak ada data sesuai filter
                          </div>
                        ) : (
                          filteredUserStatuses.map((userStatus, index) => {
                            const statusBadge = getStatusBadge(userStatus.status);
                            
                            return (
                              <div 
                                key={userStatus.user.id}
                                className={`card mb-3 ${
                                  userStatus.status === 'NOT_STARTED' ? 'border-warning' : 'border-light'
                                }`}
                              >
                                <div className="card-body">
                                  <div className="d-flex justify-content-between align-items-start mb-2">
                                    <div>
                                      <h6 className="text-primary mb-1">{userStatus.user.nama}</h6>
                                      <small className="text-muted">NIP: {userStatus.user.nip || '-'}</small>
                                    </div>
                                    <span className="badge bg-light text-dark">#{index + 1}</span>
                                  </div>
                                  
                                  <p className="small text-muted mb-2">{userStatus.user.jabatan || '-'}</p>
                                  
                                  <div className="d-flex justify-content-between align-items-center">
                                    <div>
                                      <small className="text-muted">
                                        Update: {userStatus.lastSubmission ? 
                                          new Date(userStatus.lastSubmission).toLocaleDateString('id-ID', {
                                            day: '2-digit',
                                            month: 'short'
                                          }) : '-'
                                        }
                                      </small>
                                    </div>
                                    <span className={`badge ${statusBadge.bg}`}>
                                      <i className={`fas ${statusBadge.icon} me-1`}></i>
                                      {statusBadge.text}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            );
                          })
                        )}
                      </div>
                    </>
                  )}
                </div>
              </div>
            </>
          ) : (
            <div className="card">
              <div className="card-body text-center py-5">
                <i className="fas fa-chart-pie fa-3x text-muted mb-3"></i>
                <h5 className="text-muted">Pilih Periode untuk Monitoring</h5>
                <p className="text-muted">Silakan pilih periode penilaian untuk melihat progress evaluasi</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default EnhancedMonitoringPage;