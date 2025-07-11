// =====================
// EVALUATION HISTORY PAGE - MOBILE RESPONSIVE VERSION
// File: src/pages/EvaluationHistoryPage.js
// =====================

import React, { useState, useEffect } from 'react';
import { evaluationAPI, periodAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import '../styles/EvaluationHistory.scss';

const EvaluationHistoryPage = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [evaluations, setEvaluations] = useState([]);
  const [allEvaluations, setAllEvaluations] = useState([]);
  const [periods, setPeriods] = useState([]);
  const [summary, setSummary] = useState(null);
  const [showDetails, setShowDetails] = useState({});
  const [showFilters, setShowFilters] = useState(false);
  
  const [filters, setFilters] = useState({
    tahun: '',
    bulan: '',
    ranking: '',
    sortBy: 'submitDate',
    sortOrder: 'desc'
  });

  useEffect(() => {
    loadInitialData();
  }, []);

  useEffect(() => {
    filterEvaluations();
  }, [filters, allEvaluations]);

  const getMonthName = (month) => {
    const months = [
      'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
      'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
    ];
    return months[month - 1] || 'Unknown';
  };

  const generateYearOptions = () => {
    const currentYear = new Date().getFullYear();
    const years = [];
    
    for (let year = currentYear - 3; year <= currentYear + 1; year++) {
      years.push(year);
    }
    
    return years.sort((a, b) => b - a);
  };

  const generateMonthOptions = () => {
    const months = [];
    for (let month = 1; month <= 12; month++) {
      months.push({
        value: month,
        label: getMonthName(month)
      });
    }
    return months;
  };

  const loadInitialData = async () => {
    try {
      setLoading(true);
      
      console.log('🔄 Loading data for user role:', user?.role);
      
      const evaluationsRes = await evaluationAPI.getMyEvaluations({ limit: 1000 });
      const userEvaluations = evaluationsRes.data.data?.evaluations || evaluationsRes.data.evaluations || [];
      setAllEvaluations(userEvaluations);
      
      console.log('📊 User evaluations loaded:', userEvaluations.length);
      
      // Extract unique periods dari evaluations
      const uniquePeriods = [];
      const seenPeriods = new Set();
      
      userEvaluations.forEach(evaluation => {
        if (evaluation.period) {
          const key = `${evaluation.period.tahun}-${evaluation.period.bulan}`;
          if (!seenPeriods.has(key)) {
            seenPeriods.add(key);
            uniquePeriods.push({
              ...evaluation.period,
              hasEvaluations: true
            });
          }
        }
      });
      
      uniquePeriods.sort((a, b) => {
        if (a.isActive && !b.isActive) return -1;
        if (!a.isActive && b.isActive) return 1;
        return (b.tahun - a.tahun) || (b.bulan - a.bulan);
      });
      
      setPeriods(uniquePeriods);
      console.log('📅 Unique periods extracted:', uniquePeriods.length);
      
      try {
        const activePeriodRes = await periodAPI.getActive();
        const activePeriod = activePeriodRes.data.data?.period || activePeriodRes.data.period;
        
        if (activePeriod) {
          const existingIndex = uniquePeriods.findIndex(p => p.id === activePeriod.id);
          if (existingIndex >= 0) {
            uniquePeriods[existingIndex] = { ...activePeriod, hasEvaluations: uniquePeriods[existingIndex].hasEvaluations };
          } else {
            uniquePeriods.unshift({ ...activePeriod, hasEvaluations: false });
          }
          setPeriods([...uniquePeriods]);
          console.log('✅ Active period info updated:', activePeriod.namaPeriode);
        }
      } catch (error) {
        console.warn('⚠️ Could not get active period info:', error);
      }
      
    } catch (error) {
      console.error('❌ Error in loadInitialData:', error);
      setAllEvaluations([]);
    } finally {
      setLoading(false);
    }
  };

  const filterEvaluations = () => {
    let filteredEvaluations = [...allEvaluations];
    
    if (filters.tahun) {
      filteredEvaluations = filteredEvaluations.filter(e => 
        e.period && e.period.tahun === parseInt(filters.tahun)
      );
    }
    
    if (filters.bulan) {
      filteredEvaluations = filteredEvaluations.filter(e => 
        e.period && e.period.bulan === parseInt(filters.bulan)
      );
    }
    
    if (filters.ranking) {
      filteredEvaluations = filteredEvaluations.filter(e => 
        e.ranking === parseInt(filters.ranking)
      );
    }

    filteredEvaluations.sort((a, b) => {
      let aValue, bValue;
      
      switch (filters.sortBy) {
        case 'submitDate':
          aValue = new Date(a.submitDate || a.createdAt || Date.now());
          bValue = new Date(b.submitDate || b.createdAt || Date.now());
          break;
        case 'targetName':
          aValue = a.target?.nama || a.targetUser?.nama || '';
          bValue = b.target?.nama || b.targetUser?.nama || '';
          break;
        case 'ranking':
          aValue = a.ranking || 0;
          bValue = b.ranking || 0;
          break;
        case 'averageScore':
          aValue = a.scores?.length ? a.scores.reduce((sum, s) => sum + (s.score || 0), 0) / a.scores.length : 0;
          bValue = b.scores?.length ? b.scores.reduce((sum, s) => sum + (s.score || 0), 0) / b.scores.length : 0;
          break;
        case 'period':
          aValue = a.period ? `${a.period.tahun}-${String(a.period.bulan).padStart(2, '0')}` : '';
          bValue = b.period ? `${b.period.tahun}-${String(b.period.bulan).padStart(2, '0')}` : '';
          break;
        default:
          return 0;
      }

      if (filters.sortOrder === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });

    setEvaluations(filteredEvaluations);
    
    const summaryData = {
      totalEvaluations: filteredEvaluations.length,
      tokoh1Count: filteredEvaluations.filter(e => e.ranking === 1).length,
      tokoh2Count: filteredEvaluations.filter(e => e.ranking === 2).length,
      tokoh3Count: filteredEvaluations.filter(e => e.ranking === 3).length,
      averageScores: calculateAverageScores(filteredEvaluations),
      periodsInvolved: getUniquePeriodsCount(filteredEvaluations)
    };
    setSummary(summaryData);
  };

  const getUniquePeriodsCount = (evaluations) => {
    const uniquePeriods = new Set();
    evaluations.forEach(e => {
      if (e.period) {
        uniquePeriods.add(`${e.period.tahun}-${e.period.bulan}`);
      }
    });
    return uniquePeriods.size;
  };

  const calculateAverageScores = (evaluations) => {
    if (evaluations.length === 0) return null;

    const allScores = evaluations.flatMap(e => e.scores || []);
    if (allScores.length === 0) return null;

    const totalScore = allScores.reduce((sum, score) => sum + (score.score || 0), 0);
    const avgScore = totalScore / allScores.length;

    return {
      overall: avgScore.toFixed(1),
      count: allScores.length
    };
  };

  const getRankingBadge = (ranking) => {
    const badges = {
      1: { class: 'badge-tokoh-1', icon: 'fa-trophy', text: 'Tokoh 1' },
      2: { class: 'badge-tokoh-2', icon: 'fa-medal', text: 'Tokoh 2' },
      3: { class: 'badge-tokoh-3', icon: 'fa-award', text: 'Tokoh 3' }
    };
    return badges[ranking] || { class: 'badge-tokoh-default', icon: 'fa-star', text: `Tokoh ${ranking}` };
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const toggleDetails = (evaluationId) => {
    setShowDetails(prev => ({
      ...prev,
      [evaluationId]: !prev[evaluationId]
    }));
  };

  const getScoreColor = (score) => {
    if (score >= 95) return 'score-excellent';
    if (score >= 90) return 'score-good';
    if (score >= 85) return 'score-fair';
    return 'score-poor';
  };

  const getParameterName = (index) => {
    const parameterNames = [
      'Perilaku Melayani Sepenuh Hati, Ramah, dan Solutif',
      'Perilaku Bertanggung Jawab, Disiplin, dan Jujur',
      'Perilaku Profesional, Senang Belajar, dan Berbagi Pengetahuan',
      'Perilaku Suka Menolong, Toleransi, dan Menghargai Keberagaman',
      'Perilaku Menjaga Nama Baik BPS dan Berdedikasi',
      'Perilaku Kreatif, Inovatif, dan Siap terhadap Perubahan',
      'Perilaku Komunikatif dan Mampu Bekerja Sama antar Tim Kerja',
      'Penampilan dan Kerapian'
    ];
    return parameterNames[index] || `Parameter ${index + 1}`;
  };

  const resetFilters = () => {
    setFilters({
      tahun: '',
      bulan: '',
      ranking: '',
      sortBy: 'submitDate',
      sortOrder: 'desc'
    });
  };

  const getFilterSummary = () => {
    const parts = [];
    if (filters.tahun) parts.push(`Tahun ${filters.tahun}`);
    if (filters.bulan) parts.push(getMonthName(parseInt(filters.bulan)));
    if (filters.ranking) parts.push(`Tokoh ${filters.ranking}`);
    
    if (parts.length === 0) return 'Semua Periode';
    return parts.join(' - ');
  };

  const hasActiveFilters = () => {
    return filters.tahun || filters.bulan || filters.ranking;
  };

  return (
    <div className="evaluation-history-page">
      <div className="container-fluid p-3 p-md-4">
        {/* Header */}
        <div className="page-header">
          <h2 className="page-title">
            <i className="fas fa-history"></i>
            Riwayat Penilaian
          </h2>
          <p className="page-subtitle">
            Lihat seluruh riwayat penilaian yang telah Anda berikan
            {user?.role === 'STAFF' && (
              <span className="badge bg-info ms-2">Mode Staff</span>
            )}
          </p>
        </div>

        {/* Mobile: Daftar Penilaian di Atas */}
        <div className="d-block d-md-none">
          {/* Mobile Filter Toggle */}
          <div className="mobile-filter-toggle">
            <button 
              className={`btn btn-outline-primary w-100 mb-3 ${showFilters ? 'active' : ''}`}
              onClick={() => setShowFilters(!showFilters)}
            >
              <i className={`fas fa-filter me-2`}></i>
              Filter & Sorting
              {hasActiveFilters() && <span className="badge bg-danger ms-2">!</span>}
              <i className={`fas fa-chevron-${showFilters ? 'up' : 'down'} ms-auto`}></i>
            </button>
          </div>

          {/* Mobile Filters (Collapsible) */}
          {showFilters && (
            <div className="mobile-filters mb-3">
              <div className="card">
                <div className="card-body p-3">
                  <div className="row g-2">
                    <div className="col-6">
                      <label className="form-label small">Tahun</label>
                      <select 
                        className="form-select form-select-sm"
                        value={filters.tahun}
                        onChange={(e) => setFilters({...filters, tahun: e.target.value})}
                      >
                        <option value="">Semua</option>
                        {generateYearOptions().map(year => (
                          <option key={year} value={year}>{year}</option>
                        ))}
                      </select>
                    </div>
                    <div className="col-6">
                      <label className="form-label small">Bulan</label>
                      <select 
                        className="form-select form-select-sm"
                        value={filters.bulan}
                        onChange={(e) => setFilters({...filters, bulan: e.target.value})}
                      >
                        <option value="">Semua</option>
                        {generateMonthOptions().map(month => (
                          <option key={month.value} value={month.value}>
                            {month.label}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="col-4">
                      <label className="form-label small">Ranking</label>
                      <select 
                        className="form-select form-select-sm"
                        value={filters.ranking}
                        onChange={(e) => setFilters({...filters, ranking: e.target.value})}
                      >
                        <option value="">Semua</option>
                        <option value="1">Tokoh 1</option>
                        <option value="2">Tokoh 2</option>
                        <option value="3">Tokoh 3</option>
                      </select>
                    </div>
                    <div className="col-5">
                      <label className="form-label small">Urutkan</label>
                      <select 
                        className="form-select form-select-sm"
                        value={filters.sortBy}
                        onChange={(e) => setFilters({...filters, sortBy: e.target.value})}
                      >
                        <option value="submitDate">Tanggal</option>
                        <option value="period">Periode</option>
                        <option value="targetName">Nama</option>
                        <option value="ranking">Ranking</option>
                      </select>
                    </div>
                    <div className="col-3">
                      <label className="form-label small">Urutan</label>
                      <select 
                        className="form-select form-select-sm"
                        value={filters.sortOrder}
                        onChange={(e) => setFilters({...filters, sortOrder: e.target.value})}
                      >
                        <option value="desc">Baru</option>
                        <option value="asc">Lama</option>
                      </select>
                    </div>
                  </div>
                  <div className="mt-3 d-flex gap-2">
                    <button 
                      className="btn btn-outline-secondary btn-sm flex-fill"
                      onClick={resetFilters}
                    >
                      <i className="fas fa-redo me-1"></i>
                      Reset
                    </button>
                    <button 
                      className="btn btn-primary btn-sm flex-fill"
                      onClick={() => setShowFilters(false)}
                    >
                      <i className="fas fa-check me-1"></i>
                      Terapkan
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Mobile Summary Statistics (Compact) */}
          {summary && allEvaluations.length > 0 && (
            <div className="mobile-summary mb-3">
              <div className="summary-compact">
                <div className="summary-item">
                  <div className="summary-icon">
                    <i className="fas fa-list-alt"></i>
                  </div>
                  <div className="summary-text">
                    <span className="summary-number">{summary.totalEvaluations}</span>
                    <span className="summary-label">Total</span>
                  </div>
                </div>
                <div className="summary-item">
                  <div className="summary-icon tokoh-1">
                    <i className="fas fa-trophy"></i>
                  </div>
                  <div className="summary-text">
                    <span className="summary-number">{summary.tokoh1Count}</span>
                    <span className="summary-label">Tokoh 1</span>
                  </div>
                </div>
                <div className="summary-item">
                  <div className="summary-icon tokoh-2">
                    <i className="fas fa-medal"></i>
                  </div>
                  <div className="summary-text">
                    <span className="summary-number">{summary.tokoh2Count}</span>
                    <span className="summary-label">Tokoh 2</span>
                  </div>
                </div>
                <div className="summary-item">
                  <div className="summary-icon tokoh-3">
                    <i className="fas fa-award"></i>
                  </div>
                  <div className="summary-text">
                    <span className="summary-number">{summary.tokoh3Count}</span>
                    <span className="summary-label">Tokoh 3</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Mobile Evaluations List */}
          <div className="mobile-evaluations">
            {loading ? (
              <div className="loading-state">
                <div className="spinner-border text-primary"></div>
                <p>Memuat riwayat penilaian...</p>
              </div>
            ) : evaluations.length > 0 ? (
              <div className="evaluation-cards">
                {evaluations.map((evaluation, index) => {
                  const badge = getRankingBadge(evaluation.ranking);
                  const isDetailsShown = showDetails[evaluation.id];
                  const averageScore = evaluation.scores?.length ? 
                    (evaluation.scores.reduce((sum, s) => sum + (s.score || 0), 0) / evaluation.scores.length) : 0;
                  
                  return (
                    <div key={evaluation.id} className="mobile-evaluation-card">
                      <div className="card-header">
                        <div className="d-flex align-items-center">
                          <span className={`ranking-badge ${badge.class}`}>
                            <i className={`fas ${badge.icon}`}></i>
                            <span>{badge.text}</span>
                          </span>
                          <span className="card-number">#{index + 1}</span>
                        </div>
                      </div>
                      <div className="card-body">
                        <h6 className="target-name">{evaluation.target?.nama || evaluation.targetUser?.nama || 'N/A'}</h6>
                        <p className="target-position">{evaluation.target?.jabatan || evaluation.targetUser?.jabatan || 'N/A'}</p>
                        
                        <div className="evaluation-meta">
                          <div className="meta-item">
                            <i className="fas fa-calendar"></i>
                            <span>{formatDate(evaluation.submitDate || evaluation.createdAt)}</span>
                          </div>
                          {evaluation.period && (
                            <div className="meta-item">
                              <i className="fas fa-clock"></i>
                              <span>{evaluation.period.namaPeriode}</span>
                            </div>
                          )}
                          {averageScore > 0 && (
                            <div className="meta-item">
                              <i className="fas fa-star"></i>
                              <span className={`score ${getScoreColor(averageScore)}`}>
                                {averageScore.toFixed(1)}
                              </span>
                            </div>
                          )}
                        </div>
                        
                        <button
                          className="btn btn-outline-primary btn-sm w-100 mt-2"
                          onClick={() => toggleDetails(evaluation.id)}
                        >
                          {isDetailsShown ? (
                            <>
                              <i className="fas fa-eye-slash me-1"></i>
                              Sembunyikan Detail
                            </>
                          ) : (
                            <>
                              <i className="fas fa-eye me-1"></i>
                              Lihat Detail
                            </>
                          )}
                        </button>

                        {/* Mobile Detail Scores */}
                        {isDetailsShown && evaluation.scores && (
                          <div className="mobile-detail-scores mt-3">
                            <h6 className="detail-title">
                              <i className="fas fa-star me-2"></i>
                              Detail Penilaian (8 Parameter)
                            </h6>
                            <div className="parameter-grid">
                              {evaluation.scores.map((score, paramIndex) => (
                                <div key={score.id || paramIndex} className="parameter-item">
                                  <div className="parameter-info">
                                    <span className="parameter-number">P{paramIndex + 1}</span>
                                    <span className="parameter-name">
                                      {score.parameter?.namaParameter || getParameterName(paramIndex)}
                                    </span>
                                  </div>
                                  <div className={`parameter-score ${getScoreColor(score.score || 0)}`}>
                                    {score.score || 0}
                                  </div>
                                </div>
                              ))}
                            </div>
                            
                            {evaluation.scores.length > 0 && (
                              <div className="score-stats">
                                <div className="stat-item">
                                  <span className="stat-label">Rata-rata</span>
                                  <span className="stat-value primary">{averageScore.toFixed(1)}</span>
                                </div>
                                <div className="stat-item">
                                  <span className="stat-label">Tertinggi</span>
                                  <span className="stat-value success">{Math.max(...evaluation.scores.map(s => s.score || 0))}</span>
                                </div>
                                <div className="stat-item">
                                  <span className="stat-label">Terendah</span>
                                  <span className="stat-value danger">{Math.min(...evaluation.scores.map(s => s.score || 0))}</span>
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="empty-state">
                <i className="fas fa-inbox empty-icon"></i>
                <h5>Tidak Ada Data</h5>
                <p>
                  {hasActiveFilters()
                    ? `Tidak ada penilaian yang sesuai dengan filter: ${getFilterSummary()}`
                    : 'Anda belum melakukan penilaian apapun.'}
                </p>
                {allEvaluations.length > 0 && (
                  <button 
                    className="btn btn-outline-primary me-2"
                    onClick={resetFilters}
                  >
                    <i className="fas fa-filter me-1"></i>
                    Reset Filter
                  </button>
                )}
                <a href="/evaluation" className="btn btn-primary">
                  <i className="fas fa-plus me-1"></i>
                  Mulai Menilai
                </a>
              </div>
            )}
          </div>
        </div>

        {/* Desktop Version */}
        <div className="d-none d-md-block">
          {/* Desktop Filters */}
          <div className="desktop-filters mb-4">
            <div className="card">
              <div className="card-header">
                <h6 className="mb-0">
                  <i className="fas fa-filter me-2"></i>
                  Filter & Sorting
                </h6>
              </div>
              <div className="card-body">
                <div className="row g-3">
                  <div className="col-md-2">
                    <label className="form-label fw-semibold">
                      <i className="fas fa-calendar-year me-1"></i>
                      Tahun
                    </label>
                    <select 
                      className="form-select"
                      value={filters.tahun}
                      onChange={(e) => setFilters({...filters, tahun: e.target.value})}
                    >
                      <option value="">Semua Tahun</option>
                      {generateYearOptions().map(year => (
                        <option key={year} value={year}>{year}</option>
                      ))}
                    </select>
                  </div>
                  <div className="col-md-2">
                    <label className="form-label fw-semibold">
                      <i className="fas fa-calendar-month me-1"></i>
                      Bulan
                    </label>
                    <select 
                      className="form-select"
                      value={filters.bulan}
                      onChange={(e) => setFilters({...filters, bulan: e.target.value})}
                    >
                      <option value="">Semua Bulan</option>
                      {generateMonthOptions().map(month => (
                        <option key={month.value} value={month.value}>
                          {month.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="col-md-2">
                    <label className="form-label fw-semibold">
                      <i className="fas fa-award me-1"></i>
                      Ranking
                    </label>
                    <select 
                      className="form-select"
                      value={filters.ranking}
                      onChange={(e) => setFilters({...filters, ranking: e.target.value})}
                    >
                      <option value="">Semua Ranking</option>
                      <option value="1">Tokoh 1</option>
                      <option value="2">Tokoh 2</option>
                      <option value="3">Tokoh 3</option>
                    </select>
                  </div>
                  <div className="col-md-2">
                    <label className="form-label fw-semibold">
                      <i className="fas fa-sort me-1"></i>
                      Urutkan
                    </label>
                    <select 
                      className="form-select"
                      value={filters.sortBy}
                      onChange={(e) => setFilters({...filters, sortBy: e.target.value})}
                    >
                      <option value="submitDate">Tanggal Penilaian</option>
                      <option value="period">Periode</option>
                      <option value="targetName">Nama Pegawai</option>
                      <option value="ranking">Ranking</option>
                      <option value="averageScore">Rata-rata Skor</option>
                    </select>
                  </div>
                  <div className="col-md-2">
                    <label className="form-label fw-semibold">Urutan</label>
                    <select 
                      className="form-select"
                      value={filters.sortOrder}
                      onChange={(e) => setFilters({...filters, sortOrder: e.target.value})}
                    >
                      <option value="desc">Terbaru</option>
                      <option value="asc">Terlama</option>
                    </select>
                  </div>
                  <div className="col-md-2 d-flex align-items-end">
                    <button 
                      className="btn btn-outline-secondary w-100"
                      onClick={resetFilters}
                    >
                      <i className="fas fa-redo me-1"></i>
                      Reset
                    </button>
                  </div>
                </div>
                
                <div className="filter-summary mt-3 pt-3 border-top">
                  <small className="text-muted">
                    <i className="fas fa-info-circle me-1"></i>
                    Menampilkan: <strong>{getFilterSummary()}</strong>
                    {summary && (
                      <span className="ms-2">
                        | Total: <strong>{summary.totalEvaluations}</strong> penilaian
                        {summary.periodsInvolved > 0 && (
                          <span> dari <strong>{summary.periodsInvolved}</strong> periode</span>
                        )}
                      </span>
                    )}
                  </small>
                </div>
              </div>
            </div>
          </div>

          {/* No Evaluations */}
          {allEvaluations.length === 0 && !loading && (
            <div className="alert alert-warning">
              <i className="fas fa-exclamation-triangle me-2"></i>
              Tidak ada riwayat penilaian. Anda belum melakukan penilaian apapun.
            </div>
          )}

          {/* Summary Statistics */}
          {summary && allEvaluations.length > 0 && (
            <div className="row mb-4">
              <div className="col-md-3">
                <div className="card bg-light shadow-sm">
                  <div className="card-body text-center">
                    <i className="fas fa-list-alt fa-2x text-primary mb-2"></i>
                    <h3 className="text-primary mb-1">{summary.totalEvaluations}</h3>
                    <small className="text-muted">Total Penilaian</small>
                  </div>
                </div>
              </div>
              <div className="col-md-3">
                <div className="card bg-success bg-opacity-10 shadow-sm">
                  <div className="card-body text-center">
                    <i className="fas fa-trophy fa-2x text-success mb-2"></i>
                    <h3 className="text-success mb-1">{summary.tokoh1Count}</h3>
                    <small className="text-muted">Tokoh Berakhlak 1</small>
                  </div>
                </div>
              </div>
              <div className="col-md-3">
                <div className="card bg-primary bg-opacity-10 shadow-sm">
                  <div className="card-body text-center">
                    <i className="fas fa-medal fa-2x text-primary mb-2"></i>
                    <h3 className="text-primary mb-1">{summary.tokoh2Count}</h3>
                    <small className="text-muted">Tokoh Berakhlak 2</small>
                  </div>
                </div>
              </div>
              <div className="col-md-3">
                <div className="card bg-info bg-opacity-10 shadow-sm">
                  <div className="card-body text-center">
                    <i className="fas fa-award fa-2x text-info mb-2"></i>
                    <h3 className="text-info mb-1">{summary.tokoh3Count}</h3>
                    <small className="text-muted">Tokoh Berakhlak 3</small>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Evaluations List */}
          <div className="card shadow-sm">
            <div className="card-header bg-white">
              <h5 className="mb-0">
                <i className="fas fa-list me-2"></i>
                Daftar Penilaian
                {evaluations.length > 0 && (
                  <span className="badge bg-primary ms-2">{evaluations.length}</span>
                )}
              </h5>
            </div>
            <div className="card-body">
              {loading ? (
                <div className="text-center py-5">
                  <div className="spinner-border text-primary" role="status" style={{ width: '3rem', height: '3rem' }}>
                    <span className="visually-hidden">Loading...</span>
                  </div>
                  <p className="mt-3">Memuat riwayat penilaian...</p>
                </div>
              ) : evaluations.length > 0 ? (
                <div className="evaluation-history-list">
                  {evaluations.map((evaluation, index) => {
                    const badge = getRankingBadge(evaluation.ranking);
                    const isDetailsShown = showDetails[evaluation.id];
                    const averageScore = evaluation.scores?.length ? 
                      (evaluation.scores.reduce((sum, s) => sum + (s.score || 0), 0) / evaluation.scores.length) : 0;
                    
                    return (
                      <div key={evaluation.id} className="card mb-3 border evaluation-card">
                        <div className="card-body">
                          <div className="d-flex justify-content-between align-items-start">
                            <div className="d-flex align-items-center">
                              <span className="badge bg-light text-dark me-3 fs-6">
                                #{index + 1}
                              </span>
                              <span className={`badge ${badge.class} me-3 p-2`}>
                                <i className={`fas ${badge.icon} me-1`}></i>
                                {badge.text}
                              </span>
                              <div>
                                <h5 className="mb-1">{evaluation.target?.nama || evaluation.targetUser?.nama || 'N/A'}</h5>
                                <p className="text-muted mb-1">{evaluation.target?.jabatan || evaluation.targetUser?.jabatan || 'N/A'}</p>
                                <small className="text-muted">
                                  <i className="fas fa-calendar me-1"></i>
                                  {formatDate(evaluation.submitDate || evaluation.createdAt)}
                                </small>
                                {/* Period info */}
                                {evaluation.period && (
                                  <span className="ms-3">
                                    <i className="fas fa-clock me-1"></i>
                                    <span className="text-muted">{evaluation.period.namaPeriode}</span>
                                  </span>
                                )}
                                {averageScore > 0 && (
                                  <span className="ms-3">
                                    <small className="text-muted">Rata-rata: </small>
                                    <span className={`fw-bold ${getScoreColor(averageScore)}`}>
                                      {averageScore.toFixed(1)}
                                    </span>
                                  </span>
                                )}
                              </div>
                            </div>
                            <div className="text-end">
                              <button
                                className="btn btn-sm btn-outline-primary detail-button"
                                onClick={() => toggleDetails(evaluation.id)}
                              >
                                {isDetailsShown ? (
                                  <>
                                    <i className="fas fa-eye-slash me-1"></i>
                                    Sembunyikan
                                  </>
                                ) : (
                                  <>
                                    <i className="fas fa-eye me-1"></i>
                                    Lihat Detail
                                  </>
                                )}
                              </button>
                            </div>
                          </div>

                          {/* Detailed Scores */}
                          {isDetailsShown && evaluation.scores && (
                            <div className="mt-4 pt-3 border-top">
                              <h6 className="mb-3">
                                <i className="fas fa-star me-2"></i>
                                Detail Penilaian (8 Parameter Berakhlak)
                              </h6>
                              <div className="row">
                                {evaluation.scores.map((score, paramIndex) => (
                                  <div key={score.id || paramIndex} className="col-md-6 mb-3">
                                    <div className="d-flex justify-content-between align-items-center p-3 bg-light rounded">
                                      <div className="flex-grow-1">
                                        <div className="fw-semibold">Parameter {paramIndex + 1}</div>
                                        <small className="text-muted">
                                          {score.parameter?.namaParameter || getParameterName(paramIndex)}
                                        </small>
                                      </div>
                                      <div className="text-end">
                                        <span className={`h5 mb-0 ${getScoreColor(score.score || 0)}`}>
                                          {score.score || 0}
                                        </span>
                                        <br/>
                                        <small className="text-muted">/ 100</small>
                                      </div>
                                    </div>
                                  </div>
                                ))}
                              </div>

                              {/* Statistics */}
                              {evaluation.scores.length > 0 && (
                                <div className="row mt-3">
                                  <div className="col-md-4">
                                    <div className="p-3 bg-primary bg-opacity-10 rounded text-center">
                                      <div className="fw-bold text-primary">Rata-rata</div>
                                      <span className="h4 text-primary">
                                        {averageScore.toFixed(1)}
                                      </span>
                                    </div>
                                  </div>
                                  <div className="col-md-4">
                                    <div className="p-3 bg-success bg-opacity-10 rounded text-center">
                                      <div className="fw-bold text-success">Tertinggi</div>
                                      <span className="h4 text-success">
                                        {Math.max(...evaluation.scores.map(s => s.score || 0))}
                                      </span>
                                    </div>
                                  </div>
                                  <div className="col-md-4">
                                    <div className="p-3 bg-danger bg-opacity-10 rounded text-center">
                                      <div className="fw-bold text-danger">Terendah</div>
                                      <span className="h4 text-danger">
                                        {Math.min(...evaluation.scores.map(s => s.score || 0))}
                                      </span>
                                    </div>
                                  </div>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-5">
                  <i className="fas fa-inbox fa-3x text-muted mb-3"></i>
                  <h5 className="text-muted">Tidak Ada Data</h5>
                  <p className="text-muted">
                    {(filters.tahun || filters.bulan || filters.ranking)
                      ? `Tidak ada penilaian yang sesuai dengan filter: ${getFilterSummary()}`
                      : 'Anda belum melakukan penilaian apapun.'}
                  </p>
                  {allEvaluations.length > 0 && (
                    <button 
                      className="btn btn-outline-primary me-2"
                      onClick={resetFilters}
                    >
                      <i className="fas fa-filter me-1"></i>
                      Reset Filter
                    </button>
                  )}
                  <a href="/evaluation" className="btn btn-primary">
                    <i className="fas fa-plus me-2"></i>
                    Mulai Menilai
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EvaluationHistoryPage;