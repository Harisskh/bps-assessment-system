// src/pages/EvaluationManagementPage.js - FIXED WITH COMPLETE FEATURES
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

  const getInitials = (name = '') => {
    return name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase();
  };

  const getRankingBadge = (ranking) => {
    const badges = {
      1: 'bg-success',
      2: 'bg-primary', 
      3: 'bg-info'
    };
    return badges[ranking] || 'bg-secondary';
  };

  const calculateAverageScore = (scores) => {
    if (!scores || scores.length === 0) return 0;
    const total = scores.reduce((sum, score) => sum + score.score, 0);
    return (total / scores.length).toFixed(1);
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

  // Opsi untuk dropdown filter
  const periodOptions = periods.map(p => ({ 
    value: p.id, 
    label: `${p.namaPeriode}${p.isActive ? ' (Aktif)' : ''}` 
  }));
  const userOptions = users.map(u => ({ value: u.id, label: u.nama }));

  const customSelectStyles = {
    control: (provided) => ({ 
      ...provided, 
      borderRadius: '0.5rem', 
      minHeight: '42px' 
    }),
    menu: (provided) => ({ 
      ...provided, 
      borderRadius: '0.5rem', 
      zIndex: 10 
    }),
  };

  return (
    <div className="container-fluid p-4 evaluation-management-page">
      <div className="page-header">
        <div className="header-title">
          <i className="fas fa-tasks header-icon"></i>
          <div>
            <h1>Kelola Penilaian</h1>
            <p className="header-subtitle mb-0">Lihat dan monitor semua penilaian Tokoh BerAKHLAK.</p>
          </div>
        </div>
      </div>

      {error && <div className="alert alert-danger">{error}</div>}

      <div className="filter-card">
        <div className="filter-grid">
          <div>
            <label className="form-label fw-bold">Periode</label>
            <Select 
              options={periodOptions} 
              value={selectedPeriod} 
              onChange={setSelectedPeriod} 
              placeholder="Semua Periode" 
              isClearable 
              styles={customSelectStyles} 
            />
          </div>
          <div>
            <label className="form-label fw-bold">Penilai</label>
            <Select 
              options={userOptions} 
              value={selectedEvaluator} 
              onChange={setSelectedEvaluator} 
              placeholder="Semua Penilai" 
              isClearable 
              styles={customSelectStyles} 
            />
          </div>
          <div>
            <label className="form-label fw-bold">Yang Dinilai</label>
            <Select 
              options={userOptions} 
              value={selectedTarget} 
              onChange={setSelectedTarget} 
              placeholder="Semua Pegawai" 
              isClearable 
              styles={customSelectStyles} 
            />
          </div>
          <div>
            <button 
              className="btn btn-outline-secondary w-100" 
              onClick={resetFilters} 
              style={{ minHeight: '42px' }}
            >
              <i className="fas fa-refresh me-2"></i>Reset
            </button>
          </div>
        </div>
      </div>

      <div className="results-wrapper">
        <div className="table-responsive">
          <table className="table evaluation-table">
            <thead>
              <tr>
                <th style={{width: '60px'}}>No.</th>
                <th>Penilai</th>
                <th>Yang Dinilai</th>
                <th>Detail Penilaian</th>
                <th className="text-center">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="5" className="text-center p-5">
                    <div className="spinner-border text-primary"></div>
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
                        <div className="avatar">
                          {getInitials(evaluation.evaluator.nama)}
                        </div>
                        <div className="info">
                          <strong>{evaluation.evaluator.nama}</strong>
                          <small className="d-block">{evaluation.evaluator.jabatan}</small>
                        </div>
                      </div>
                    </td>
                    <td>
                      <div className="target-info">
                        <div className="avatar" style={{backgroundColor: '#e0e7ff', color: '#4338ca'}}>
                          {getInitials(evaluation.target.nama)}
                        </div>
                        <div className="info">
                          <strong>{evaluation.target.nama}</strong>
                          <small className="d-block">{evaluation.target.jabatan}</small>
                        </div>
                      </div>
                    </td>
                    <td>
                      <div className="evaluation-details">
                        <span className={`badge ${getRankingBadge(evaluation.ranking)}`}>
                          Tokoh {evaluation.ranking}
                        </span>
                        <div className="mt-1">
                          <small className="text-muted">Rata-rata Skor: </small>
                          <span className="score">
                            {calculateAverageScore(evaluation.scores)}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="text-center">
                      <div className="action-button">
                        <button 
                          className="btn btn-sm btn-primary" 
                          onClick={() => handleShowDetail(evaluation)} 
                          title="Lihat Detail"
                        >
                          <i className="fas fa-eye me-2"></i>Detail
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="5" className="text-center p-5 text-muted">
                    Tidak ada data untuk filter yang dipilih.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        
        <div className="summary-pagination-footer">
          <div className="summary-stats">
            <div className="stat-item">
              <strong>{totalEvaluations}</strong>
              <div>Total Data</div>
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
                </li>
                <li className={`page-item ${currentPage === 1 ? 'disabled' : ''}`}>
                  <button 
                    className="page-link" 
                    onClick={() => setCurrentPage(c => c - 1)}
                    disabled={currentPage === 1}
                  >
                    Prev
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
                    Next
                  </button>
                </li>
                <li className={`page-item ${currentPage === totalPages ? 'disabled' : ''}`}>
                </li>
              </ul>
            </nav>
          )}
        </div>
      </div>

      {/* Modal Detail Penilaian */}
      {showDetailModal && selectedEvaluation && (
        <div className="modal fade show d-block detail-modal" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-xl modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header bg-primary text-white">
                <h5 className="modal-title">
                  <i className="fas fa-chart-line me-2"></i>
                  Detail Penilaian Tokoh BerAKHLAK
                </h5>
                <button 
                  type="button" 
                  className="btn-close btn-close-white" 
                  onClick={() => setShowDetailModal(false)}
                ></button>
              </div>
              <div className="modal-body p-4">
                {/* Header Info */}
                <div className="row mb-4">
                  <div className="col-md-6">
                    <div className="card bg-light">
                      <div className="card-body">
                        <h6 className="card-title text-primary">
                          <i className="fas fa-user me-2"></i>Penilai
                        </h6>
                        <div className="d-flex align-items-center">
                          <div className="avatar me-3" style={{
                            width: '50px', 
                            height: '50px', 
                            backgroundColor: '#007bff', 
                            color: 'white',
                            borderRadius: '50%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontWeight: 'bold'
                          }}>
                            {getInitials(selectedEvaluation.evaluator.nama)}
                          </div>
                          <div>
                            <div className="fw-bold">{selectedEvaluation.evaluator.nama}</div>
                            <div className="text-muted">{selectedEvaluation.evaluator.jabatan}</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="col-md-6">
                    <div className="card bg-light">
                      <div className="card-body">
                        <h6 className="card-title text-success">
                          <i className="fas fa-star me-2"></i>Yang Dinilai
                        </h6>
                        <div className="d-flex align-items-center">
                          <div className="avatar me-3" style={{
                            width: '50px', 
                            height: '50px', 
                            backgroundColor: '#28a745', 
                            color: 'white',
                            borderRadius: '50%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontWeight: 'bold'
                          }}>
                            {getInitials(selectedEvaluation.target.nama)}
                          </div>
                          <div>
                            <div className="fw-bold">{selectedEvaluation.target.nama}</div>
                            <div className="text-muted">{selectedEvaluation.target.jabatan}</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Ranking & Summary */}
                <div className="card mb-4">
                  <div className="card-body">
                    <div className="row text-center">
                      <div className="col-md-4">
                        <div className="p-3">
                          <span className={`badge fs-6 ${getRankingBadge(selectedEvaluation.ranking)}`}>
                            Tokoh BerAKHLAK {selectedEvaluation.ranking}
                          </span>
                          <div className="mt-2 text-muted">Kategori Penilaian</div>
                        </div>
                      </div>
                      <div className="col-md-4">
                        <div className="p-3">
                          <div className="h4 text-primary mb-0">
                            {calculateAverageScore(selectedEvaluation.scores)}
                          </div>
                          <div className="text-muted">Rata-rata Skor</div>
                        </div>
                      </div>
                      <div className="col-md-4">
                        <div className="p-3">
                          <div className="h4 text-info mb-0">
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
                    <div className="table-responsive">
                      <table className="table table-hover mb-0">
                        <thead className="table-light">
                          <tr>
                            <th style={{width: '60px'}}>No.</th>
                            <th>Parameter Penilaian</th>
                            <th className="text-center" style={{width: '100px'}}>Skor</th>
                          </tr>
                        </thead>
                        <tbody>
                          {standardParameters.map((param, index) => {
                            const score = selectedEvaluation.scores?.find(s => s.parameterId === index + 1)?.score || 
                                         selectedEvaluation.scores?.[index]?.score || 0;
                            
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
                                  <span className="fw-bold text-primary fs-5">
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