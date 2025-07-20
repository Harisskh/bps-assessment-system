// src/pages/EvaluationManagementPage.js - FIXED VERSION WITHOUT PHOTO MODAL & PHOTO HANDLERS
import React, { useState, useEffect } from 'react';
import { evaluationAPI, periodAPI, userAPI } from '../services/api';
import Select from 'react-select';
import '../styles/EvaluationManagement.scss';

const EvaluationManagementPage = () => {
  const [loading, setLoading] = useState(true);
  const [evaluations, setEvaluations] = useState([]);
  const [periods, setPeriods] = useState([]);
  const [users, setUsers] = useState([]);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  // States untuk filter
  const [selectedPeriod, setSelectedPeriod] = useState(null);
  const [selectedEvaluator, setSelectedEvaluator] = useState(null);
  const [selectedTarget, setSelectedTarget] = useState(null);
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalEvaluations, setTotalEvaluations] = useState(0);
  const itemsPerPage = 10;
  
  // Detail Modal
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedEvaluation, setSelectedEvaluation] = useState(null);

  // Parameter BerAKHLAK yang standar
  const standardParameters = [
    'Perilaku Melayani Sepenuh Hati, Ramah, dan Solutif',
    'Perilaku Bertanggung Jawab, Disiplin, dan Jujur', 
    'Perilaku Profesional, Senang Belajar, dan Berbagi Pengetahuan',
    'Perilaku Suka Menolong, Toleransi, dan Menghargai Keberagaman',
    'Perilaku Menjaga Nama Baik BPS dan Berdedikasi',
    'Perilaku Kreatif, Inovatif, dan Siap terhadap Perubahan',
    'Perilaku Komunikatif dan Mampu Bekerja Sama antar Tim Kerja',
    'Penampilan dan Kerapian'
  ];

  useEffect(() => {
    loadInitialData();
  }, []);

  useEffect(() => {
    if (periods.length > 0) {
      loadEvaluations();
    }
  }, [selectedPeriod, selectedEvaluator, selectedTarget, currentPage]);

  const loadInitialData = async () => {
    try {
      setLoading(true);
      setError('');

      const [periodsRes, usersRes] = await Promise.all([
        periodAPI.getAll({ limit: 100 }),
        userAPI.getAll({ limit: 1000 })
      ]);

      setPeriods(periodsRes.data.data.periods);
      setUsers(usersRes.data.data.users);

      const activePeriod = periodsRes.data.data.periods.find(p => p.isActive);
      if (activePeriod) {
        setSelectedPeriod({ value: activePeriod.id, label: activePeriod.namaPeriode });
      } else {
        loadEvaluations();
      }

    } catch (error) {
      console.error('Load initial data error:', error);
      setError('Gagal memuat data filter');
    } finally {
      setLoading(false);
    }
  };

  const loadEvaluations = async () => {
    try {
      setLoading(true);
      setError('');

      const params = {
        page: currentPage,
        limit: itemsPerPage,
        periodId: selectedPeriod?.value || '',
        evaluatorId: selectedEvaluator?.value || '',
        targetUserId: selectedTarget?.value || ''
      };

      const response = await evaluationAPI.getAll(params);
      const data = response.data.data;
      setEvaluations(data.evaluations);
      setTotalPages(data.pagination.totalPages);
      setTotalEvaluations(data.pagination.totalCount);

    } catch (error) {
      console.error('Load evaluations error:', error);
      setError('Gagal memuat data evaluasi');
      setEvaluations([]);
    } finally {
      setLoading(false);
    }
  };

  const handleShowDetail = (evaluation) => {
    setSelectedEvaluation(evaluation);
    setShowDetailModal(true);
  };
  
  const resetFilters = () => {
    setSelectedPeriod(null);
    setSelectedEvaluator(null);
    setSelectedTarget(null);
    setCurrentPage(1);
  };

  // Function untuk mendapatkan inisial user
  const getInitials = (name = '') => {
    return name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase();
  };

  const calculateAverageScore = (scores) => {
    if (!scores || scores.length === 0) return 0;
    const total = scores.reduce((sum, score) => sum + score.score, 0);
    return (total / scores.length).toFixed(1);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('id-ID', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  const generatePageNumbers = () => {
    const pages = [];
    const maxVisiblePages = 5;
    
    if (totalPages <= maxVisiblePages) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      const start = Math.max(1, currentPage - 2);
      const end = Math.min(totalPages, start + maxVisiblePages - 1);
      
      if (start > 1) {
        pages.push(1);
        if (start > 2) pages.push('...');
      }
      
      for (let i = start; i <= end; i++) {
        pages.push(i);
      }
      
      if (end < totalPages) {
        if (end < totalPages - 1) pages.push('...');
        pages.push(totalPages);
      }
    }
    
    return pages;
  };

  // Opsi untuk dropdown filter - exclude Administrator
  const periodOptions = periods.map(p => ({ 
    value: p.id, 
    label: `${p.namaPeriode}${p.isActive ? ' (Aktif)' : ''}` 
  }));
  
  // Filter users: exclude Administrator role
  const filteredUsers = users.filter(user => user.role !== 'ADMIN');
  const userOptions = filteredUsers.map(u => ({ value: u.id, label: u.nama }));

  const customSelectStyles = {
    control: (provided, state) => ({
      ...provided,
      borderRadius: '0.75rem',
      minHeight: '48px',
      border: `2px solid ${state.isFocused ? '#2c549c' : '#ced4da'}`,
      boxShadow: state.isFocused ? '0 0 0 3px rgba(44, 84, 156, 0.1)' : '0 2px 8px rgba(0, 0, 0, 0.05)',
      '&:hover': {
        borderColor: '#2c549c',
        boxShadow: '0 4px 12px rgba(44, 84, 156, 0.1)'
      }
    }),
    menu: (provided) => ({
      ...provided,
      borderRadius: '0.75rem',
      border: '1px solid #ced4da',
      boxShadow: '0 8px 30px rgba(0, 0, 0, 0.12)',
      zIndex: 1060
    }),
    menuPortal: (provided) => ({
      ...provided,
      zIndex: 1060
    }),
    option: (provided, state) => ({
      ...provided,
      padding: '12px 16px',
      backgroundColor: state.isSelected ? '#2c549c' : state.isFocused ? '#f8f9fa' : 'white',
      color: state.isSelected ? 'white' : state.isFocused ? '#2c549c' : '#495057',
      '&:hover': {
        backgroundColor: state.isSelected ? '#2c549c' : '#f8f9fa',
        color: state.isSelected ? 'white' : '#2c549c'
      }
    })
  };

  return (
    <div className="container-fluid p-4 evaluation-management-page">
      {/* 🔥 Enhanced Header */}
      <div className="page-header">
        <div className="header-content">
          <div className="header-title">
            <i className="fas fa-tasks header-icon"></i>
            <div>
              <h1>Kelola Penilaian</h1>
              <p className="header-subtitle">Lihat dan monitor semua penilaian Tokoh BerAKHLAK dari seluruh pegawai</p>
            </div>
          </div>
        </div>
      </div>

      {/* Alert Messages */}
      {error && (
        <div className="alert alert-danger alert-dismissible fade show" role="alert">
          <i className="fas fa-exclamation-triangle me-2"></i>
          {error}
          <button type="button" className="btn-close" onClick={() => setError('')}></button>
        </div>
      )}
      {success && (
        <div className="alert alert-success alert-dismissible fade show" role="alert">
          <i className="fas fa-check-circle me-2"></i>
          {success}
          <button type="button" className="btn-close" onClick={() => setSuccess('')}></button>
        </div>
      )}

      {/* 🔥 Enhanced Filter Section */}
      <div className="filter-section">
        <div className="filter-header">
          <h5>
            <i className="fas fa-filter"></i>
            Filter & Pencarian Data
          </h5>
          <div className="total-data-badge">
            <i className="fas fa-database"></i>
            <span>Total Data: <strong>{totalEvaluations}</strong></span>
          </div>
        </div>
        
        <div className="filter-grid">
          <div className="filter-group">
            <label className="form-label">
              <i className="fas fa-calendar-alt"></i>
              Periode Penilaian
            </label>
            <Select 
              options={periodOptions} 
              value={selectedPeriod} 
              onChange={(option) => {
                setSelectedPeriod(option);
                setCurrentPage(1);
              }} 
              placeholder="Pilih periode..." 
              isClearable 
              styles={customSelectStyles}
              menuPortalTarget={document.body}
              noOptionsMessage={() => "Tidak ada periode tersedia"}
            />
          </div>
          
          <div className="filter-group">
            <label className="form-label">
              <i className="fas fa-user-edit"></i>
              Penilai (Evaluator)
            </label>
            <Select 
              options={userOptions} 
              value={selectedEvaluator} 
              onChange={(option) => {
                setSelectedEvaluator(option);
                setCurrentPage(1);
              }} 
              placeholder="Pilih penilai..." 
              isClearable 
              styles={customSelectStyles}
              menuPortalTarget={document.body}
              noOptionsMessage={() => "Tidak ada penilai tersedia"}
            />
          </div>
          
          <div className="filter-group">
            <label className="form-label">
              <i className="fas fa-user-check"></i>
              Yang Dinilai (Target)
            </label>
            <Select 
              options={userOptions} 
              value={selectedTarget} 
              onChange={(option) => {
                setSelectedTarget(option);
                setCurrentPage(1);
              }} 
              placeholder="Pilih yang dinilai..." 
              isClearable 
              styles={customSelectStyles}
              menuPortalTarget={document.body}
              noOptionsMessage={() => "Tidak ada target tersedia"}
            />
          </div>
          
          <div className="reset-button-wrapper">
            <button 
              className="btn btn-reset" 
              onClick={resetFilters}
            >
              <i className="fas fa-undo"></i>
              Reset Filter
            </button>
          </div>
        </div>
      </div>

      {/* 🔥 Enhanced Table Section */}
      <div className="table-section">
        <div className="table-header">
          <h5>
            <i className="fas fa-table"></i>
            Data Penilaian BerAKHLAK
          </h5>
        </div>
        
        <div className="table-responsive">
          <table className="table evaluation-table">
            <thead>
              <tr>
                <th style={{width: '50px'}}>No.</th>
                <th>Penilai</th>
                <th>Yang Dinilai</th>
                <th className="d-none d-md-table-cell">Periode Penilaian</th>
                <th className="text-center">Detail Penilaian</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="5" className="text-center p-5">
                    <div className="spinner-border text-primary" role="status">
                      <span className="visually-hidden">Loading...</span>
                    </div>
                  </td>
                </tr>
              ) : evaluations.length > 0 ? (
                evaluations.map((evaluation, index) => (
                  <tr key={evaluation.id}>
                    <td className="text-center fw-bold text-muted">
                      {((currentPage - 1) * itemsPerPage) + index + 1}
                    </td>
                    <td>
                      <div className="evaluator-info">
                        <div 
                          className="avatar"
                          style={{ cursor: 'default' }}
                        >
                          <span 
                            style={{ 
                              display: 'flex',
                              width: '100%',
                              height: '100%',
                              alignItems: 'center',
                              justifyContent: 'center'
                            }}
                          >
                            {getInitials(evaluation.evaluator.nama)}
                          </span>
                        </div>
                        <div className="info">
                          <strong>{evaluation.evaluator.nama}</strong>
                          <small>{evaluation.evaluator.jabatan}</small>
                        </div>
                      </div>
                    </td>
                    <td>
                      <div className="target-info">
                        <div 
                          className="avatar"
                          style={{ cursor: 'default' }}
                        >
                          <span 
                            style={{ 
                              display: 'flex',
                              width: '100%',
                              height: '100%',
                              alignItems: 'center',
                              justifyContent: 'center'
                            }}
                          >
                            {getInitials(evaluation.target.nama)}
                          </span>
                        </div>
                        <div className="info">
                          <strong>{evaluation.target.nama}</strong>
                          <small>{evaluation.target.jabatan}</small>
                        </div>
                      </div>
                    </td>
                    <td className="d-none d-md-table-cell">
                      <div className="period-info">
                        <div className="period-badge">
                          {evaluation.period.namaPeriode}
                        </div>
                        <div className="period-date">
                          Dinilai: {formatDate(evaluation.submitDate)}
                        </div>
                      </div>
                    </td>
                    <td className="text-center">
                      <div className="action-button">
                        <button 
                          className="btn btn-sm" 
                          onClick={() => handleShowDetail(evaluation)} 
                          title="Lihat Detail Penilaian"
                        >
                          <i className="fas fa-eye"></i>
                          <span className="d-none d-md-inline ms-1">Detail</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="5" className="text-center p-5 text-muted">
                    <i className="fas fa-inbox fa-2x mb-3 d-block"></i>
                    {selectedPeriod || selectedEvaluator || selectedTarget ? 
                      'Tidak ada data untuk filter yang dipilih' :
                      'Belum ada data penilaian yang tersedia'
                    }
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        
        {/* Enhanced Footer with Summary and Pagination */}
        <div className="summary-pagination-footer">
          <div className="summary-stats">
            <div className="stat-item">
              <strong>{totalEvaluations}</strong>
              <div>Total Data</div>
            </div>
            <div className="stat-item">
              <strong>{currentPage}</strong>
              <div>Halaman</div>
            </div>
            <div className="stat-item">
              <strong>{totalPages}</strong>
              <div>Total Halaman</div>
            </div>
          </div>
          
          {totalPages > 1 && (
            <nav>
              <ul className="pagination mb-0">
                <li className={`page-item ${currentPage === 1 ? 'disabled' : ''}`}>
                  <button 
                    className="page-link" 
                    onClick={() => setCurrentPage(c => c - 1)}
                    disabled={currentPage === 1}
                  >
                    <i className="fas fa-chevron-left"></i>
                    <span className="d-none d-md-inline ms-1">Prev</span>
                  </button>
                </li>
                
                {generatePageNumbers().map((page, index) => (
                  <li 
                    key={index} 
                    className={`page-item ${page === currentPage ? 'active' : ''} ${page === '...' ? 'disabled' : ''}`}
                  >
                    {page === '...' ? (
                      <span className="page-link">...</span>
                    ) : (
                      <button 
                        className="page-link" 
                        onClick={() => setCurrentPage(page)}
                      >
                        {page}
                      </button>
                    )}
                  </li>
                ))}
                
                <li className={`page-item ${currentPage === totalPages ? 'disabled' : ''}`}>
                  <button 
                    className="page-link" 
                    onClick={() => setCurrentPage(c => c + 1)}
                    disabled={currentPage === totalPages}
                  >
                    <span className="d-none d-md-inline me-1">Next</span>
                    <i className="fas fa-chevron-right"></i>
                  </button>
                </li>
              </ul>
            </nav>
          )}
        </div>
      </div>

      {/* 🔥 Enhanced Modal Detail Penilaian */}
      {showDetailModal && selectedEvaluation && (
        <div className="modal fade show d-block detail-modal" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-xl modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">
                  <i className="fas fa-chart-line me-2"></i>
                  Detail Penilaian Tokoh BerAKHLAK
                </h5>
                <button 
                  type="button" 
                  className="btn-close" 
                  onClick={() => setShowDetailModal(false)}
                ></button>
              </div>
              <div className="modal-body">
                {/* Header Info */}
                <div className="row mb-4">
                  <div className="col-md-4">
                    <div className="card bg-light">
                      <div className="card-body text-center">
                        <h6 className="card-title text-primary">
                          <i className="fas fa-user me-2"></i>Penilai
                        </h6>
                        <div className="avatar mx-auto mb-2" style={{
                          width: '60px', 
                          height: '60px', 
                          backgroundColor: '#2c549c', 
                          color: 'white',
                          borderRadius: '50%',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontWeight: 'bold',
                          fontSize: '1.2rem',
                          cursor: 'default',
                          overflow: 'hidden'
                        }}>
                          {getInitials(selectedEvaluation.evaluator.nama)}
                        </div>
                        <div className="fw-bold">{selectedEvaluation.evaluator.nama}</div>
                        <div className="text-muted small">{selectedEvaluation.evaluator.jabatan}</div>
                      </div>
                    </div>
                  </div>
                  <div className="col-md-4">
                    <div className="card bg-light">
                      <div className="card-body text-center">
                        <h6 className="card-title text-success">
                          <i className="fas fa-star me-2"></i>Yang Dinilai
                        </h6>
                        <div className="avatar mx-auto mb-2" style={{
                          width: '60px', 
                          height: '60px', 
                          backgroundColor: '#198754', 
                          color: 'white',
                          borderRadius: '50%',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontWeight: 'bold',
                          fontSize: '1.2rem',
                          cursor: 'default',
                          overflow: 'hidden'
                        }}>
                          {getInitials(selectedEvaluation.target.nama)}
                        </div>
                        <div className="fw-bold">{selectedEvaluation.target.nama}</div>
                        <div className="text-muted small">{selectedEvaluation.target.jabatan}</div>
                      </div>
                    </div>
                  </div>
                  <div className="col-md-4">
                    <div className="card bg-light">
                      <div className="card-body text-center">
                        <h6 className="card-title text-info">
                          <i className="fas fa-calendar me-2"></i>Periode & Waktu
                        </h6>
                        <div className="mb-2">
                          <span className="badge bg-info fs-6 px-3 py-2">
                            {selectedEvaluation.period.namaPeriode}
                          </span>
                        </div>
                        <div className="text-muted small">
                          Dinilai: {formatDate(selectedEvaluation.submitDate)}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Summary Stats */}
                <div className="card mb-4">
                  <div className="card-body">
                    <div className="row text-center">
                      <div className="col-md-6">
                        <div className="p-3">
                          <div className="h2 text-primary mb-0">
                            {calculateAverageScore(selectedEvaluation.scores)}
                          </div>
                          <div className="text-muted">Rata-rata Skor</div>
                        </div>
                      </div>
                      <div className="col-md-6">
                        <div className="p-3">
                          <div className="h2 text-info mb-0">
                            {selectedEvaluation.scores?.length || 8}
                          </div>
                          <div className="text-muted">Total Parameter</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Detail Skor per Parameter */}
                <div className="card">
                  <div className="card-header bg-primary text-white">
                    <h6 className="mb-0">
                      <i className="fas fa-list-check me-2"></i>
                      Detail Skor per Parameter BerAKHLAK
                    </h6>
                  </div>
                  <div className="card-body p-0">
                    <div className="table-responsive parameter-table">
                      <table className="table table-hover mb-0">
                        <thead>
                          <tr>
                            <th style={{width: '60px'}}>No.</th>
                            <th>Parameter Penilaian</th>
                            <th className="text-center" style={{width: '100px'}}>Skor</th>
                          </tr>
                        </thead>
                        <tbody>
                          {standardParameters.map((param, index) => {
                            const score = selectedEvaluation.scores?.find(s => 
                              s.parameter?.urutan === (index + 1) || 
                              s.parameterId === (index + 1)
                            )?.score || selectedEvaluation.scores?.[index]?.score || 0;
                            
                            return (
                              <tr key={index}>
                                <td className="text-center fw-bold text-muted">
                                  {index + 1}
                                </td>
                                <td>
                                  <div className="parameter-name">
                                    {param}
                                  </div>
                                </td>
                                <td className="text-center">
                                  <span className="score-badge">
                                    {score}
                                  </span>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button 
                  type="button" 
                  className="btn btn-secondary" 
                  onClick={() => setShowDetailModal(false)}
                >
                  <i className="fas fa-times me-2"></i>Tutup
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EvaluationManagementPage;
