// src/pages/EnhancedMonitoringPage.js - MONITORING SISTEM LENGKAP
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
  const [statusFilter, setStatusFilter] = useState(''); // '', 'COMPLETE', 'PARTIAL', 'NOT_STARTED'
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
      
      const periodsRes = await periodAPI.getAll({ limit: 50 });
      setPeriods(periodsRes.data.data.periods);

      // Set default to active period
      const activePeriod = periodsRes.data.data.periods.find(p => p.isActive);
      if (activePeriod) {
        setSelectedPeriod(activePeriod.id);
      }

    } catch (error) {
      console.error('Load initial data error:', error);
      setError('Gagal memuat data initial');
    } finally {
      setLoading(false);
    }
  };

  const loadMonitoringData = async () => {
    try {
      setLoading(true);
      setError('');
      
      const [statusRes, incompleteRes] = await Promise.all([
        monitoringAPI.getEvaluationStatus({ periodId: selectedPeriod }),
        monitoringAPI.getIncompleteUsers({ periodId: selectedPeriod })
      ]);

      setEvaluationStatus(statusRes.data.data);
      setIncompleteUsers(incompleteRes.data.data.incompleteUsers);
      
    } catch (error) {
      console.error('Load monitoring data error:', error);
      setError('Gagal memuat data monitoring');
    } finally {
      setLoading(false);
    }
  };

  const handleShowUserDetail = async (userId) => {
    try {
      setLoading(true);
      setSelectedUserDetail(userId);
      
      const response = await monitoringAPI.getUserDetail(userId, { periodId: selectedPeriod });
      setUserDetailData(response.data.data);
      setShowDetailModal(true);
      
    } catch (error) {
      console.error('Load user detail error:', error);
      setError('Gagal memuat detail user');
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    const badges = {
      COMPLETE: { bg: 'bg-success', icon: 'fa-check-circle', text: 'Selesai' },
      NOT_STARTED: { bg: 'bg-danger', icon: 'fa-times-circle', text: 'Belum Mulai' }
    };
    return badges[status] || badges.NOT_STARTED;
  };

  const getRoleBadge = (role) => {
    const badges = {
      ADMIN: 'bg-danger',
      PIMPINAN: 'bg-warning text-dark',
      STAFF: 'bg-primary'
    };
    return badges[role] || 'bg-secondary';
  };

  const getProgressPercentage = (completedCount) => {
    return Math.round((completedCount / 3) * 100);
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
      {/* Header */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h1 className="h3 mb-1">
            <i className="fas fa-chart-pie me-2"></i>
            Monitoring Evaluasi
          </h1>
          <p className="text-muted">Monitor progress pengisian evaluasi Tokoh BerAKHLAK</p>
        </div>
        <button 
          className="btn btn-outline-primary"
          onClick={loadMonitoringData}
          disabled={loading}
        >
          <i className="fas fa-sync-alt me-2"></i>
          Refresh Data
        </button>
      </div>

      {/* Alerts */}
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

      {/* Period Selection */}
      <div className="card mb-4">
        <div className="card-body">
          <div className="row g-3 align-items-center">
            <div className="col-md-4">
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
            <div className="col-md-8">
              {evaluationStatus && (
                <div className="row text-center">
                  <div className="col-md-3">
                    <h5 className="text-primary mb-0">{evaluationStatus.summary.total}</h5>
                    <small className="text-muted">Total Pegawai</small>
                  </div>
                  <div className="col-md-3">
                    <h5 className="text-success mb-0">{evaluationStatus.summary.completed}</h5>
                    <small className="text-muted">Selesai</small>
                  </div>
                  <div className="col-md-3">
                    <h5 className="text-danger mb-0">{evaluationStatus.summary.notStarted}</h5>
                    <small className="text-muted">Belum</small>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {selectedPeriod && evaluationStatus ? (
        <>
          {/* Progress Overview */}
          <div className="row mb-4">
            <div className="col-md-8">
              <div className="card">
                <div className="card-body">
                  <h6 className="card-title">Progress Keseluruhan</h6>
                  <div className="d-flex align-items-center mb-3">
                    <div className="flex-grow-1 me-3">
                      <div className="progress" style={{ height: '20px' }}>
                        <div 
                          className="progress-bar bg-success" 
                          style={{ width: `${(evaluationStatus.summary.completed / evaluationStatus.summary.total * 100)}%` }}
                        ></div>
                        <div 
                          className="progress-bar bg-warning" 
                          style={{ width: `${(evaluationStatus.summary.partial / evaluationStatus.summary.total * 100)}%` }}
                        ></div>
                      </div>
                    </div>
                    <span className="fw-bold">
                      {Math.round((evaluationStatus.summary.completed / evaluationStatus.summary.total) * 100)}%
                    </span>
                  </div>
                  <div className="d-flex justify-content-between small">
                    <span className="text-success">
                      <i className="fas fa-circle me-1"></i>
                      Selesai ({evaluationStatus.summary.completed})
                    </span>
                    <span className="text-danger">
                      <i className="fas fa-circle me-1"></i>
                      Belum ({evaluationStatus.summary.notStarted})
                    </span>
                  </div>
                </div>
              </div>
            </div>
            <div className="col-md-4">
              <div className="card">
                <div className="card-body text-center">
                  <h6 className="card-title">Target Completion</h6>
                  <div className="position-relative d-inline-block">
                    <svg width="120" height="120" className="position-relative">
                      <circle 
                        cx="60" cy="60" r="50" 
                        fill="none" 
                        stroke="#e9ecef" 
                        strokeWidth="10"
                      />
                      <circle 
                        cx="60" cy="60" r="50" 
                        fill="none" 
                        stroke="#28a745" 
                        strokeWidth="10"
                        strokeDasharray={`${(evaluationStatus.summary.completed / evaluationStatus.summary.total) * 314} 314`}
                        strokeDashoffset="0"
                        transform="rotate(-90 60 60)"
                      />
                    </svg>
                    <div className="position-absolute top-50 start-50 translate-middle text-center">
                      <h4 className="mb-0">
                        {Math.round((evaluationStatus.summary.completed / evaluationStatus.summary.total) * 100)}%
                      </h4>
                      <small className="text-muted">Complete</small>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Filters */}
          <div className="card mb-4">
            <div className="card-body">
              <div className="row g-3">
                <div className="col-md-3">
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
                <div className="col-md-3">
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
                <div className="col-md-3">
                  <label className="form-label">&nbsp;</label>
                  <button 
                    type="button" 
                    className="btn btn-outline-secondary w-100"
                    onClick={() => {
                      setStatusFilter('');
                      setDepartmentFilter('');
                    }}
                  >
                    <i className="fas fa-refresh me-2"></i>
                    Reset Filter
                  </button>
                </div>
                <div className="col-md-3">
                  <label className="form-label">&nbsp;</label>
                  <div className="text-end">
                    <small className="text-muted">
                      Menampilkan {filteredUserStatuses.length} dari {evaluationStatus.userStatuses.length} pegawai
                    </small>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* User Status Table */}
          <div className="card">
            <div className="card-header">
              <h5 className="mb-0">
                <i className="fas fa-users me-2"></i>
                Status Pengisian Evaluasi
              </h5>
            </div>
            <div className="card-body">
              <div className="table-responsive">
                <table className="table table-hover">
                  <thead className="table-light">
                    <tr>
                      <th>Pegawai</th>
                      <th>Jabatan</th>
                      <th>Role</th>
                      <th>Progress</th>
                      <th>Status</th>
                      <th>Terakhir Update</th>
                      <th width="120">Aksi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredUserStatuses.length === 0 ? (
                      <tr>
                        <td colSpan="7" className="text-center py-4 text-muted">
                          <i className="fas fa-search fa-2x mb-2"></i>
                          <br />Tidak ada data sesuai filter
                        </td>
                      </tr>
                    ) : (
                      filteredUserStatuses.map((userStatus) => {
                        const statusBadge = getStatusBadge(userStatus.status);
                        const progressPercentage = getProgressPercentage(userStatus.completedCount);
                        
                        return (
                          <tr key={userStatus.user.id} className={userStatus.status === 'NOT_STARTED' ? 'table-warning' : ''}>
                            <td>
                              <div>
                                <strong>{userStatus.user.nama}</strong>
                                <small className="d-block text-muted">NIP: {userStatus.user.nip || '-'}</small>
                              </div>
                            </td>
                            <td>
                              <small className="text-muted">{userStatus.user.jabatan || '-'}</small>
                            </td>
                            <td>
                              <span className={`badge ${getRoleBadge(userStatus.user.role)}`}>
                                {userStatus.user.role}
                              </span>
                            </td>
                            <td>
                              <div className="d-flex align-items-center">
                                <div className="progress flex-grow-1 me-2" style={{ height: '8px' }}>
                                  <div 
                                    className={`progress-bar ${userStatus.status === 'COMPLETE' ? 'bg-success' : userStatus.status === 'PARTIAL' ? 'bg-warning' : 'bg-danger'}`}
                                    style={{ width: `${progressPercentage}%` }}
                                  ></div>
                                </div>
                                <small className="text-muted">
                                  {userStatus.completedCount}/3
                                </small>
                              </div>
                            </td>
                            <td>
                              <span className={`badge ${statusBadge.bg}`}>
                                <i className={`fas ${statusBadge.icon} me-1`}></i>
                                {statusBadge.text}
                              </span>
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
                              <button 
                                className="btn btn-outline-primary btn-sm"
                                onClick={() => handleShowUserDetail(userStatus.user.id)}
                                title="Lihat Detail"
                              >
                                <i className="fas fa-eye"></i>
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Quick Action for Incomplete Users */}
          {incompleteUsers.length > 0 && (
            <div className="card mt-4 border-warning">
              <div className="card-header bg-warning text-dark">
                <h6 className="mb-0">
                  <i className="fas fa-exclamation-triangle me-2"></i>
                  Pegawai yang Perlu Diingatkan ({incompleteUsers.length})
                </h6>
              </div>
              <div className="card-body">
                <div className="row">
                  {incompleteUsers.slice(0, 6).map((incompleteUser) => (
                    <div key={incompleteUser.user.id} className="col-md-4 mb-2">
                      <div className="d-flex justify-content-between align-items-center p-2 bg-light rounded">
                        <div>
                          <strong className="small">{incompleteUser.user.nama}</strong>
                          <small className="d-block text-muted">
                            {incompleteUser.completedCount}/3 selesai
                          </small>
                        </div>
                        <button 
                          className="btn btn-outline-primary btn-sm"
                          onClick={() => handleShowUserDetail(incompleteUser.user.id)}
                        >
                          <i className="fas fa-eye"></i>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
                {incompleteUsers.length > 6 && (
                  <div className="text-center mt-2">
                    <small className="text-muted">
                      Dan {incompleteUsers.length - 6} pegawai lainnya yang belum menyelesaikan evaluasi
                    </small>
                  </div>
                )}
              </div>
            </div>
          )}
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

      {/* User Detail Modal */}
      {showDetailModal && userDetailData && (
        <div className="modal fade show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-xl">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">
                  <i className="fas fa-user-check me-2"></i>
                  Detail Evaluasi - {userDetailData.user.nama}
                </h5>
                <button 
                  type="button" 
                  className="btn-close"
                  onClick={() => setShowDetailModal(false)}
                ></button>
              </div>
              <div className="modal-body">
                {/* User Info */}
                <div className="row mb-4">
                  <div className="col-md-6">
                    <h6 className="text-secondary">Informasi Pegawai</h6>
                    <table className="table table-sm table-borderless">
                      <tbody>
                        <tr>
                          <td><strong>Nama:</strong></td>
                          <td>{userDetailData.user.nama}</td>
                        </tr>
                        <tr>
                          <td><strong>Jabatan:</strong></td>
                          <td>{userDetailData.user.jabatan || '-'}</td>
                        </tr>
                        <tr>
                          <td><strong>Role:</strong></td>
                          <td>
                            <span className={`badge ${getRoleBadge(userDetailData.user.role)}`}>
                              {userDetailData.user.role}
                            </span>
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                  <div className="col-md-6">
                    <h6 className="text-secondary">Status Evaluasi</h6>
                    <div className="text-center">
                      <div className="d-flex justify-content-center align-items-center mb-2">
                        <div className="progress me-3" style={{ width: '100px', height: '8px' }}>
                          <div 
                            className={`progress-bar ${userDetailData.summary.isComplete ? 'bg-success' : userDetailData.summary.completedCount > 0 ? 'bg-warning' : 'bg-danger'}`}
                            style={{ width: `${(userDetailData.summary.completedCount / 3) * 100}%` }}
                          ></div>
                        </div>
                        <span className="fw-bold">
                          {userDetailData.summary.completedCount}/3
                        </span>
                      </div>
                      <span className={`badge ${getStatusBadge(userDetailData.summary.isComplete ? 'COMPLETE' : userDetailData.summary.completedCount > 0 ? 'PARTIAL' : 'NOT_STARTED').bg} fs-6`}>
                        {getStatusBadge(userDetailData.summary.isComplete ? 'COMPLETE' : userDetailData.summary.completedCount > 0 ? 'PARTIAL' : 'NOT_STARTED').text}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Evaluation Details */}
                <h6 className="text-secondary mb-3">Detail Evaluasi yang Telah Diselesaikan</h6>
                {userDetailData.evaluations.length === 0 ? (
                  <div className="alert alert-warning text-center">
                    <i className="fas fa-exclamation-triangle me-2"></i>
                    Pegawai ini belum mengisi evaluasi apapun
                  </div>
                ) : (
                  <div className="table-responsive">
                    <table className="table table-bordered">
                      <thead className="table-light">
                        <tr>
                          <th>Tokoh Ke-</th>
                          <th>Yang Dinilai</th>
                          <th>Tanggal Submit</th>
                          <th>Rata-rata Skor</th>
                          <th>Detail Skor</th>
                        </tr>
                      </thead>
                      <tbody>
                        {userDetailData.evaluations.map((evaluation) => (
                          <tr key={evaluation.id}>
                            <td>
                              <span className={`badge ${evaluation.ranking === 1 ? 'bg-success' : evaluation.ranking === 2 ? 'bg-primary' : 'bg-info'} fs-6`}>
                                Tokoh {evaluation.ranking}
                              </span>
                            </td>
                            <td>
                              <strong>{evaluation.target.nama}</strong>
                              <small className="d-block text-muted">{evaluation.target.jabatan}</small>
                            </td>
                            <td>
                              <small>
                                {new Date(evaluation.submitDate).toLocaleDateString('id-ID', {
                                  day: '2-digit',
                                  month: 'short',
                                  year: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit'
                                })}
                              </small>
                            </td>
                            <td>
                              <span className="h6 text-primary">{evaluation.averageScore}</span>
                            </td>
                            <td>
                              <div className="d-flex flex-wrap gap-1">
                                {evaluation.scores.map((score, index) => (
                                  <span 
                                    key={index}
                                    className="badge bg-light text-dark"
                                    title={score.parameter}
                                  >
                                    P{score.urutan}: {score.value}
                                  </span>
                                ))}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* Missing Evaluations */}
                {userDetailData.summary.missingCount > 0 && (
                  <div className="mt-4">
                    <h6 className="text-danger">Evaluasi yang Belum Diselesaikan</h6>
                    <div className="alert alert-danger">
                      <i className="fas fa-exclamation-triangle me-2"></i>
                      Pegawai ini masih perlu menyelesaikan evaluasi untuk:
                      <ul className="mb-0 mt-2">
                        {userDetailData.summary.missingRankings.map(ranking => (
                          <li key={ranking}>
                            <strong>Tokoh BerAKHLAK ke-{ranking}</strong>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                )}
              </div>
              <div className="modal-footer">
                <button 
                  type="button" 
                  className="btn btn-secondary"
                  onClick={() => setShowDetailModal(false)}
                >
                  Tutup
                </button>
                {userDetailData.summary.missingCount > 0 && (
                  <button 
                    type="button" 
                    className="btn btn-warning"
                    onClick={() => {
                      setSuccess(`Reminder telah dikirim kepada ${userDetailData.user.nama}`);
                      setShowDetailModal(false);
                    }}
                  >
                    <i className="fas fa-bell me-2"></i>
                    Kirim Reminder
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EnhancedMonitoringPage;