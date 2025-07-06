// src/pages/EvaluationManagementPage.js - GROUPED BY EVALUATOR
import React, { useState, useEffect } from 'react';
import { evaluationAPI, periodAPI, userAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';

const EvaluationManagementPage = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [evaluations, setEvaluations] = useState([]);
  const [groupedEvaluations, setGroupedEvaluations] = useState({});
  const [periods, setPeriods] = useState([]);
  const [users, setUsers] = useState([]);
  const [error, setError] = useState('');
  
  // Filters
  const [selectedPeriod, setSelectedPeriod] = useState('');
  const [selectedEvaluator, setSelectedEvaluator] = useState('');
  const [selectedTarget, setSelectedTarget] = useState('');
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  
  // Detail Modal
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedEvaluation, setSelectedEvaluation] = useState(null);
  
  // Expandable groups
  const [expandedGroups, setExpandedGroups] = useState({});

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
        periodAPI.getAll(),
        userAPI.getAll({ limit: 100 }) // Get all users for filter
      ]);

      setPeriods(periodsRes.data.data.periods);
      setUsers(usersRes.data.data.users);

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

  const loadEvaluations = async () => {
    try {
      setLoading(true);
      setError('');

      const params = {
        page: currentPage,
        limit: 50, // Increased limit for grouping
        periodId: selectedPeriod,
        evaluatorId: selectedEvaluator,
        targetUserId: selectedTarget
      };

      const response = await evaluationAPI.getAll(params);
      const evaluationsData = response.data.data.evaluations;
      setEvaluations(evaluationsData);
      setTotalPages(response.data.data.pagination.totalPages);

      // Group evaluations by evaluator
      const grouped = {};
      evaluationsData.forEach(evaluation => {
        const evaluatorKey = evaluation.evaluator.id;
        if (!grouped[evaluatorKey]) {
          grouped[evaluatorKey] = {
            evaluator: evaluation.evaluator,
            evaluations: [],
            totalCount: 0
          };
        }
        grouped[evaluatorKey].evaluations.push(evaluation);
        grouped[evaluatorKey].totalCount++;
      });

      setGroupedEvaluations(grouped);

    } catch (error) {
      console.error('Load evaluations error:', error);
      setError('Gagal memuat data evaluasi');
    } finally {
      setLoading(false);
    }
  };

  const toggleGroup = (evaluatorId) => {
    setExpandedGroups(prev => ({
      ...prev,
      [evaluatorId]: !prev[evaluatorId]
    }));
  };

  const handleShowDetail = (evaluation) => {
    setSelectedEvaluation(evaluation);
    setShowDetailModal(true);
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

  const getScoreRange = (ranking) => {
    const ranges = {
      1: '96-100',
      2: '86-95', 
      3: '80-85'
    };
    return ranges[ranking] || '';
  };

  if (loading && Object.keys(groupedEvaluations).length === 0) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '50vh' }}>
        <div className="text-center">
          <div className="spinner-border text-primary mb-3" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
          <p className="text-muted">Memuat data evaluasi...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container-fluid">
      {/* Header */}
      <div className="row mb-4">
        <div className="col-12">
          <h1 className="h3 mb-1">Kelola Penilaian</h1>
          <p className="text-muted">Lihat dan monitor semua penilaian Tokoh BerAKHLAK</p>
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

      {/* Filters */}
      <div className="card mb-4">
        <div className="card-body">
          <div className="row g-3">
            <div className="col-md-3">
              <label className="form-label">Periode</label>
              <select
                className="form-select"
                value={selectedPeriod}
                onChange={(e) => {
                  setSelectedPeriod(e.target.value);
                  setCurrentPage(1);
                }}
              >
                <option value="">Semua Periode</option>
                {periods.map(period => (
                  <option key={period.id} value={period.id}>
                    {period.namaPeriode} {period.isActive && '(Aktif)'}
                  </option>
                ))}
              </select>
            </div>
            <div className="col-md-3">
              <label className="form-label">Penilai</label>
              <select
                className="form-select"
                value={selectedEvaluator}
                onChange={(e) => {
                  setSelectedEvaluator(e.target.value);
                  setCurrentPage(1);
                }}
              >
                <option value="">Semua Penilai</option>
                {users.filter(u => u.role === 'STAFF' || u.role === 'PIMPINAN').map(user => (
                  <option key={user.id} value={user.id}>
                    {user.nama}
                  </option>
                ))}
              </select>
            </div>
            <div className="col-md-3">
              <label className="form-label">Yang Dinilai</label>
              <select
                className="form-select"
                value={selectedTarget}
                onChange={(e) => {
                  setSelectedTarget(e.target.value);
                  setCurrentPage(1);
                }}
              >
                <option value="">Semua Pegawai</option>
                {users.map(user => (
                  <option key={user.id} value={user.id}>
                    {user.nama}
                  </option>
                ))}
              </select>
            </div>
            <div className="col-md-3">
              <label className="form-label">&nbsp;</label>
              <button 
                className="btn btn-outline-secondary w-100"
                onClick={() => {
                  setSelectedPeriod('');
                  setSelectedEvaluator('');
                  setSelectedTarget('');
                  setCurrentPage(1);
                }}
              >
                <i className="fas fa-refresh me-2"></i>
                Reset Filter
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Grouped Evaluations */}
      <div className="card">
        <div className="card-body">
          {loading ? (
            <div className="text-center py-4">
              <div className="spinner-border text-primary" role="status">
                <span className="visually-hidden">Loading...</span>
              </div>
            </div>
          ) : (
            <>
              {Object.keys(groupedEvaluations).length === 0 ? (
                <div className="text-center py-5">
                  <i className="fas fa-inbox fa-3x text-muted mb-3"></i>
                  <h5 className="text-muted">Tidak ada data evaluasi</h5>
                  <p className="text-muted">Belum ada evaluasi untuk filter yang dipilih</p>
                </div>
              ) : (
                <div className="accordion" id="evaluationAccordion">
                  {Object.entries(groupedEvaluations).map(([evaluatorId, group], index) => (
                    <div key={evaluatorId} className="accordion-item mb-3 border rounded">
                      <h2 className="accordion-header">
                        <button
                          className={`accordion-button ${!expandedGroups[evaluatorId] ? 'collapsed' : ''}`}
                          type="button"
                          onClick={() => toggleGroup(evaluatorId)}
                          style={{ backgroundColor: '#f8f9fa' }}
                        >
                          <div className="d-flex justify-content-between align-items-center w-100 me-3">
                            <div>
                              <h6 className="mb-0 text-primary">
                                <i className="fas fa-user me-2"></i>
                                {group.evaluator.nama}
                              </h6>
                              <small className="text-muted">
                                {group.evaluator.jabatan} • {group.totalCount} evaluasi
                              </small>
                            </div>
                            <div className="d-flex align-items-center gap-2">
                              <span className="badge bg-primary fs-6">
                                {group.totalCount}
                              </span>
                              <small className="text-muted">
                                {expandedGroups[evaluatorId] ? 'Sembunyikan' : 'Tampilkan'}
                              </small>
                            </div>
                          </div>
                        </button>
                      </h2>
                      
                      {expandedGroups[evaluatorId] && (
                        <div className="accordion-collapse collapse show">
                          <div className="accordion-body">
                            <div className="table-responsive">
                              <table className="table table-sm table-hover">
                                <thead className="table-light">
                                  <tr>
                                    <th>Tanggal</th>
                                    <th>Yang Dinilai</th>
                                    <th>Ranking</th>
                                    <th>Rata-rata Skor</th>
                                    <th width="100">Aksi</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {group.evaluations.map((evaluation) => (
                                    <tr key={evaluation.id}>
                                      <td>
                                        <small>
                                          {new Date(evaluation.submitDate).toLocaleDateString('id-ID', {
                                            day: '2-digit',
                                            month: 'short',
                                            hour: '2-digit',
                                            minute: '2-digit'
                                          })}
                                        </small>
                                      </td>
                                      <td>
                                        <div>
                                          <strong className="text-dark">{evaluation.target.nama}</strong>
                                          <br />
                                          <small className="text-muted">{evaluation.target.jabatan}</small>
                                        </div>
                                      </td>
                                      <td>
                                        <span className={`badge ${getRankingBadge(evaluation.ranking)}`}>
                                          Tokoh {evaluation.ranking}
                                        </span>
                                        <br />
                                        <small className="text-muted">{getScoreRange(evaluation.ranking)}</small>
                                      </td>
                                      <td>
                                        <span className="h6 text-primary">
                                          {calculateAverageScore(evaluation.scores)}
                                        </span>
                                        <br />
                                        <small className="text-muted">{evaluation.scores.length} parameter</small>
                                      </td>
                                      <td>
                                        <button
                                          className="btn btn-outline-primary btn-sm"
                                          onClick={() => handleShowDetail(evaluation)}
                                          title="Lihat Detail"
                                        >
                                          <i className="fas fa-eye"></i>
                                        </button>
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Summary Statistics */}
              {Object.keys(groupedEvaluations).length > 0 && (
                <div className="mt-4 p-3 bg-light rounded">
                  <div className="row text-center">
                    <div className="col-md-3">
                      <h5 className="text-primary mb-0">{Object.keys(groupedEvaluations).length}</h5>
                      <small className="text-muted">Total Penilai</small>
                    </div>
                    <div className="col-md-3">
                      <h5 className="text-success mb-0">{evaluations.length}</h5>
                      <small className="text-muted">Total Evaluasi</small>
                    </div>
                    <div className="col-md-3">
                      <h5 className="text-warning mb-0">
                        {evaluations.filter(e => e.ranking === 1).length}
                      </h5>
                      <small className="text-muted">Tokoh 1</small>
                    </div>
                    <div className="col-md-3">
                      <h5 className="text-info mb-0">
                        {[...new Set(evaluations.map(e => e.target.id))].length}
                      </h5>
                      <small className="text-muted">Pegawai Dinilai</small>
                    </div>
                  </div>
                </div>
              )}

              {/* Pagination */}
              {totalPages > 1 && (
                <nav className="mt-4">
                  <ul className="pagination justify-content-center">
                    <li className={`page-item ${currentPage === 1 ? 'disabled' : ''}`}>
                      <button 
                        className="page-link"
                        onClick={() => setCurrentPage(currentPage - 1)}
                        disabled={currentPage === 1}
                      >
                        Previous
                      </button>
                    </li>
                    
                    {[...Array(totalPages)].map((_, index) => (
                      <li key={index + 1} className={`page-item ${currentPage === index + 1 ? 'active' : ''}`}>
                        <button 
                          className="page-link"
                          onClick={() => setCurrentPage(index + 1)}
                        >
                          {index + 1}
                        </button>
                      </li>
                    ))}
                    
                    <li className={`page-item ${currentPage === totalPages ? 'disabled' : ''}`}>
                      <button 
                        className="page-link"
                        onClick={() => setCurrentPage(currentPage + 1)}
                        disabled={currentPage === totalPages}
                      >
                        Next
                      </button>
                    </li>
                  </ul>
                </nav>
              )}
            </>
          )}
        </div>
      </div>

      {/* Detail Modal */}
      {showDetailModal && selectedEvaluation && (
        <div className="modal fade show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-lg">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">
                  <i className="fas fa-star text-warning me-2"></i>
                  Detail Penilaian
                </h5>
                <button 
                  type="button" 
                  className="btn-close"
                  onClick={() => setShowDetailModal(false)}
                ></button>
              </div>
              <div className="modal-body">
                {/* Evaluation Info */}
                <div className="row mb-4">
                  <div className="col-md-6">
                    <h6 className="text-secondary">Informasi Penilaian</h6>
                    <table className="table table-sm table-borderless">
                      <tbody>
                        <tr>
                          <td><strong>Periode:</strong></td>
                          <td>{selectedEvaluation.period.namaPeriode}</td>
                        </tr>
                        <tr>
                          <td><strong>Tanggal:</strong></td>
                          <td>{new Date(selectedEvaluation.submitDate).toLocaleDateString('id-ID')}</td>
                        </tr>
                        <tr>
                          <td><strong>Penilai:</strong></td>
                          <td>{selectedEvaluation.evaluator.nama}</td>
                        </tr>
                        <tr>
                          <td><strong>Yang Dinilai:</strong></td>
                          <td>{selectedEvaluation.target.nama}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                  <div className="col-md-6">
                    <h6 className="text-secondary">Kategori & Skor</h6>
                    <div className="text-center">
                      <span className={`badge ${getRankingBadge(selectedEvaluation.ranking)} fs-5 mb-2`}>
                        Tokoh BerAKHLAK {selectedEvaluation.ranking}
                      </span>
                      <br />
                      <span className="text-muted">Rentang: {getScoreRange(selectedEvaluation.ranking)}</span>
                      <br />
                      <h3 className="text-primary mt-2">
                        {calculateAverageScore(selectedEvaluation.scores)}
                      </h3>
                      <small className="text-muted">Rata-rata Skor</small>
                    </div>
                  </div>
                </div>

                {/* Parameter Scores */}
                <h6 className="text-secondary mb-3">Detail Skor per Parameter</h6>
                <div className="table-responsive">
                  <table className="table table-bordered">
                    <thead className="table-light">
                      <tr>
                        <th width="60">No.</th>
                        <th>Parameter Penilaian</th>
                        <th width="100" className="text-center">Skor</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedEvaluation.scores
                        .sort((a, b) => a.parameter.urutan - b.parameter.urutan)
                        .map((score, index) => (
                        <tr key={score.id}>
                          <td className="text-center">{score.parameter.urutan}</td>
                          <td>{score.parameter.namaParameter}</td>
                          <td className="text-center">
                            <span className="badge bg-primary fs-6">
                              {score.score}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="table-light">
                      <tr>
                        <td colSpan="2" className="text-end"><strong>Rata-rata:</strong></td>
                        <td className="text-center">
                          <strong className="text-primary">
                            {calculateAverageScore(selectedEvaluation.scores)}
                          </strong>
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
              <div className="modal-footer">
                <button 
                  type="button" 
                  className="btn btn-secondary"
                  onClick={() => setShowDetailModal(false)}
                >
                  Tutup
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