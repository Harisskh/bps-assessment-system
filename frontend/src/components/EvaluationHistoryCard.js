// =====================
// ENHANCED EVALUATION HISTORY COMPONENT
// File: src/components/EvaluationHistoryCard.js
// =====================

import React, { useState, useEffect } from 'react';
import { evaluationAPI, periodAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';

const EvaluationHistoryCard = ({ isExpanded = false }) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [evaluations, setEvaluations] = useState([]);
  const [periods, setPeriods] = useState([]);
  const [selectedPeriod, setSelectedPeriod] = useState('');
  const [summary, setSummary] = useState(null);
  const [showDetails, setShowDetails] = useState({});

  useEffect(() => {
    loadInitialData();
  }, []);

  useEffect(() => {
    if (selectedPeriod) {
      loadEvaluations();
    }
  }, [selectedPeriod]);

  const loadInitialData = async () => {
    try {
      setLoading(true);
      const [periodsRes, activePeriodRes] = await Promise.all([
        periodAPI.getAll({ limit: 50 }),
        periodAPI.getActive()
      ]);

      const periodsData = periodsRes.data.periods || periodsRes.data.data?.periods || [];
      setPeriods(periodsData);

      // Set active period as default
      const activePeriod = activePeriodRes.data.period || activePeriodRes.data.data?.period;
      if (activePeriod) {
        setSelectedPeriod(activePeriod.id);
      } else if (periodsData.length > 0) {
        setSelectedPeriod(periodsData[0].id);
      }

    } catch (error) {
      console.error('Load initial data error:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadEvaluations = async () => {
    try {
      setLoading(true);
      const response = await evaluationAPI.getMyEvaluations({ 
        periodId: selectedPeriod,
        limit: 100 
      });
      
      const evaluationsData = response.data.evaluations || response.data.data?.evaluations || [];
      setEvaluations(evaluationsData);

      // Calculate summary
      const summaryData = {
        totalEvaluations: evaluationsData.length,
        tokoh1Count: evaluationsData.filter(e => e.ranking === 1).length,
        tokoh2Count: evaluationsData.filter(e => e.ranking === 2).length,
        tokoh3Count: evaluationsData.filter(e => e.ranking === 3).length,
        averageScores: calculateAverageScores(evaluationsData)
      };
      setSummary(summaryData);

    } catch (error) {
      console.error('Load evaluations error:', error);
      setEvaluations([]);
      setSummary(null);
    } finally {
      setLoading(false);
    }
  };

  const calculateAverageScores = (evaluations) => {
    if (evaluations.length === 0) return null;

    const allScores = evaluations.flatMap(e => e.scores || []);
    if (allScores.length === 0) return null;

    const totalScore = allScores.reduce((sum, score) => sum + score.score, 0);
    const avgScore = totalScore / allScores.length;

    return {
      average: avgScore.toFixed(1),
      count: allScores.length
    };
  };

  const getRankingBadge = (ranking) => {
    const badges = {
      1: { class: 'bg-success', icon: 'fa-trophy', text: 'Tokoh 1' },
      2: { class: 'bg-primary', icon: 'fa-medal', text: 'Tokoh 2' },
      3: { class: 'bg-info', icon: 'fa-award', text: 'Tokoh 3' }
    };
    return badges[ranking] || { class: 'bg-secondary', icon: 'fa-star', text: `Tokoh ${ranking}` };
  };

  const formatDate = (dateString) => {
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
    if (score >= 95) return 'text-success';
    if (score >= 85) return 'text-warning';
    return 'text-danger';
  };

  if (!isExpanded) {
    // Compact version for dashboard
    return (
      <div className="dashboard-card">
        <div className="card-body p-4">
          <div className="d-flex justify-content-between align-items-center mb-3">
            <h5 className="card-title mb-0">
              <i className="fas fa-history me-2"></i>
              Riwayat Penilaian
            </h5>
            <span className="badge bg-primary">{evaluations.length}</span>
          </div>

          {loading ? (
            <div className="text-center py-3">
              <div className="spinner-border spinner-border-sm" role="status"></div>
            </div>
          ) : evaluations.length > 0 ? (
            <div className="evaluation-history-compact">
              {evaluations.slice(0, 3).map(evaluation => {
                const badge = getRankingBadge(evaluation.ranking);
                return (
                  <div key={evaluation.id} className="history-item-compact mb-3">
                    <div className="d-flex align-items-center">
                      <span className={`badge ${badge.class} me-3`}>
                        <i className={`fas ${badge.icon} me-1`}></i>
                        {badge.text}
                      </span>
                      <div className="flex-grow-1">
                        <div className="fw-semibold">{evaluation.target.nama}</div>
                        <small className="text-muted">{evaluation.target.jabatan}</small>
                      </div>
                      <div className="text-end">
                        <small className="text-muted">
                          {formatDate(evaluation.submitDate)}
                        </small>
                      </div>
                    </div>
                  </div>
                );
              })}
              {evaluations.length > 3 && (
                <div className="text-center">
                  <small className="text-muted">
                    +{evaluations.length - 3} penilaian lainnya
                  </small>
                </div>
              )}
            </div>
          ) : (
            <p className="text-muted mb-0">Belum ada riwayat penilaian untuk periode ini.</p>
          )}
        </div>
      </div>
    );
  }

  // Expanded version for full page
  return (
    <div className="container-fluid">
      <div className="row">
        <div className="col-12">
          <div className="card">
            <div className="card-header bg-primary text-white">
              <div className="d-flex justify-content-between align-items-center">
                <h4 className="mb-0">
                  <i className="fas fa-history me-2"></i>
                  Riwayat Penilaian Tokoh Berakhlak
                </h4>
                <span className="badge bg-light text-primary">
                  {user.nama}
                </span>
              </div>
            </div>

            <div className="card-body">
              {/* Filter Controls */}
              <div className="row mb-4">
                <div className="col-md-4">
                  <label className="form-label">Filter Periode</label>
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
              </div>

              {/* Summary Statistics */}
              {summary && (
                <div className="row mb-4">
                  <div className="col-md-3">
                    <div className="card bg-light">
                      <div className="card-body text-center">
                        <h3 className="text-primary mb-1">{summary.totalEvaluations}</h3>
                        <small className="text-muted">Total Penilaian</small>
                      </div>
                    </div>
                  </div>
                  <div className="col-md-3">
                    <div className="card bg-success bg-opacity-10">
                      <div className="card-body text-center">
                        <h3 className="text-success mb-1">{summary.tokoh1Count}</h3>
                        <small className="text-muted">Tokoh Berakhlak 1</small>
                      </div>
                    </div>
                  </div>
                  <div className="col-md-3">
                    <div className="card bg-primary bg-opacity-10">
                      <div className="card-body text-center">
                        <h3 className="text-primary mb-1">{summary.tokoh2Count}</h3>
                        <small className="text-muted">Tokoh Berakhlak 2</small>
                      </div>
                    </div>
                  </div>
                  <div className="col-md-3">
                    <div className="card bg-info bg-opacity-10">
                      <div className="card-body text-center">
                        <h3 className="text-info mb-1">{summary.tokoh3Count}</h3>
                        <small className="text-muted">Tokoh Berakhlak 3</small>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Evaluations List */}
              {loading ? (
                <div className="text-center py-5">
                  <div className="spinner-border text-primary" role="status"></div>
                  <p className="mt-3">Memuat riwayat penilaian...</p>
                </div>
              ) : evaluations.length > 0 ? (
                <div className="evaluation-history-full">
                  {evaluations.map(evaluation => {
                    const badge = getRankingBadge(evaluation.ranking);
                    const isDetailsShown = showDetails[evaluation.id];
                    
                    return (
                      <div key={evaluation.id} className="card mb-3">
                        <div className="card-body">
                          <div className="d-flex justify-content-between align-items-start">
                            <div className="d-flex align-items-center">
                              <span className={`badge ${badge.class} me-3 p-2`}>
                                <i className={`fas ${badge.icon} me-1`}></i>
                                {badge.text}
                              </span>
                              <div>
                                <h5 className="mb-1">{evaluation.target.nama}</h5>
                                <p className="text-muted mb-1">{evaluation.target.jabatan}</p>
                                <small className="text-muted">
                                  <i className="fas fa-calendar me-1"></i>
                                  {formatDate(evaluation.submitDate)}
                                </small>
                              </div>
                            </div>
                            <div className="text-end">
                              <button
                                className="btn btn-sm btn-outline-primary"
                                onClick={() => toggleDetails(evaluation.id)}
                              >
                                {isDetailsShown ? 'Sembunyikan' : 'Lihat Detail'}
                                <i className={`fas fa-chevron-${isDetailsShown ? 'up' : 'down'} ms-1`}></i>
                              </button>
                            </div>
                          </div>

                          {/* Detailed Scores */}
                          {isDetailsShown && evaluation.scores && (
                            <div className="mt-4 pt-3 border-top">
                              <h6 className="mb-3">
                                <i className="fas fa-star me-2"></i>
                                Detail Penilaian (8 Parameter)
                              </h6>
                              <div className="row">
                                {evaluation.scores.map((score, index) => (
                                  <div key={score.id} className="col-md-6 mb-3">
                                    <div className="d-flex justify-content-between align-items-center p-2 bg-light rounded">
                                      <div>
                                        <strong>Parameter {index + 1}</strong>
                                        <br/>
                                        <small className="text-muted">
                                          {score.parameter?.namaParameter || `Parameter ${index + 1}`}
                                        </small>
                                      </div>
                                      <div className="text-end">
                                        <span className={`h5 mb-0 ${getScoreColor(score.score)}`}>
                                          {score.score}
                                        </span>
                                        <br/>
                                        <small className="text-muted">/ 100</small>
                                      </div>
                                    </div>
                                  </div>
                                ))}
                              </div>

                              {/* Average Score */}
                              {evaluation.scores.length > 0 && (
                                <div className="mt-3 p-3 bg-primary bg-opacity-10 rounded">
                                  <div className="d-flex justify-content-between align-items-center">
                                    <strong>Rata-rata Penilaian:</strong>
                                    <span className="h4 mb-0 text-primary">
                                      {(evaluation.scores.reduce((sum, s) => sum + s.score, 0) / evaluation.scores.length).toFixed(1)}
                                    </span>
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
                  <h5 className="text-muted">Belum Ada Riwayat Penilaian</h5>
                  <p className="text-muted">
                    {selectedPeriod 
                      ? 'Anda belum melakukan penilaian untuk periode ini.'
                      : 'Pilih periode untuk melihat riwayat penilaian.'}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EvaluationHistoryCard;