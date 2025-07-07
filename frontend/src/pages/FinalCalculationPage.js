// src/pages/FinalCalculationPage.js - PERHITUNGAN FINAL & BEST EMPLOYEE
import React, { useState, useEffect } from 'react';
import { finalEvaluationAPI, periodAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';

const FinalCalculationPage = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [calculating, setCalculating] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  // Data states
  const [periods, setPeriods] = useState([]);
  const [selectedPeriod, setSelectedPeriod] = useState('');
  const [finalEvaluations, setFinalEvaluations] = useState([]);
  const [bestEmployee, setBestEmployee] = useState(null);
  const [calculationResult, setCalculationResult] = useState(null);
  
  // View states
  const [showCandidatesOnly, setShowCandidatesOnly] = useState(false);
  const [showCalculationModal, setShowCalculationModal] = useState(false);

  useEffect(() => {
    loadInitialData();
  }, []);

  useEffect(() => {
    if (selectedPeriod) {
      loadFinalEvaluations();
      loadBestEmployee();
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

  const loadFinalEvaluations = async () => {
    try {
      setLoading(true);
      
      const params = {
        periodId: selectedPeriod,
        onlyCandidates: showCandidatesOnly,
        limit: 50
      };

      const response = await finalEvaluationAPI.getFinal(params);
      setFinalEvaluations(response.data.data.finalEvaluations);
      
    } catch (error) {
      console.error('Load final evaluations error:', error);
      setError('Gagal memuat data evaluasi final');
    } finally {
      setLoading(false);
    }
  };

  const loadBestEmployee = async () => {
    try {
      const response = await finalEvaluationAPI.getBestEmployee(selectedPeriod);
      setBestEmployee(response.data.data.bestEmployee);
    } catch (error) {
      console.warn('Best employee not found:', error);
      setBestEmployee(null);
    }
  };

  const handleCalculateFinal = async () => {
    if (!selectedPeriod) {
      setError('Pilih periode terlebih dahulu');
      return;
    }

    setCalculating(true);
    setError('');
    setSuccess('');

    try {
      const response = await finalEvaluationAPI.calculate({ periodId: selectedPeriod });
      setCalculationResult(response.data.data);
      setSuccess('Perhitungan final berhasil diselesaikan');
      setShowCalculationModal(true);
      
      // Reload data
      loadFinalEvaluations();
      loadBestEmployee();
      
    } catch (error) {
      console.error('Calculate final error:', error);
      setError(error.response?.data?.message || 'Gagal melakukan perhitungan final');
    } finally {
      setCalculating(false);
    }
  };

  const getScoreColor = (score) => {
    if (score >= 90) return 'text-success';
    if (score >= 80) return 'text-primary';
    if (score >= 70) return 'text-warning';
    return 'text-danger';
  };

  const getRankingBadge = (ranking) => {
    if (ranking === 1) return 'bg-warning text-dark';
    if (ranking === 2) return 'bg-secondary';
    if (ranking === 3) return 'bg-info';
    return 'bg-light text-dark';
  };

  if (loading && finalEvaluations.length === 0) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '50vh' }}>
        <div className="text-center">
          <div className="spinner-border text-primary mb-3" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
          <p className="text-muted">Memuat data perhitungan final...</p>
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
            <i className="fas fa-calculator me-2"></i>
            Perhitungan Final & Best Employee
          </h1>
          <p className="text-muted">Hitung nilai akhir dan tentukan Best Employee of the Month</p>
        </div>
        <button 
          className="btn btn-success btn-lg"
          onClick={handleCalculateFinal}
          disabled={!selectedPeriod || calculating}
        >
          {calculating ? (
            <>
              <span className="spinner-border spinner-border-sm me-2"></span>
              Menghitung...
            </>
          ) : (
            <>
              <i className="fas fa-play me-2"></i>
              Jalankan Perhitungan
            </>
          )}
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

      {/* Calculation Info */}
      <div className="card border-info mb-4">
        <div className="card-header bg-info text-white">
          <h6 className="mb-0">
            <i className="fas fa-info-circle me-2"></i>
            Formula Perhitungan Best Employee
          </h6>
        </div>
        <div className="card-body">
          <div className="row">
            <div className="col-md-8">
              <h6 className="text-primary">Bobot Penilaian:</h6>
              <div className="d-flex justify-content-around mb-3">
                <div className="text-center">
                  <div className="bg-primary text-white rounded p-2 mb-1">
                    <strong>40%</strong>
                  </div>
                  <small>Presensi</small>
                </div>
                <div className="text-center">
                  <div className="bg-success text-white rounded p-2 mb-1">
                    <strong>30%</strong>
                  </div>
                  <small>BerAKHLAK</small>
                </div>
                <div className="text-center">
                  <div className="bg-warning text-dark rounded p-2 mb-1">
                    <strong>30%</strong>
                  </div>
                  <small>CKP</small>
                </div>
              </div>
              <p className="text-muted mb-0">
                <strong>Formula:</strong> Nilai Akhir = (Presensi × 40%) + (BerAKHLAK × 30%) + (CKP × 30%)
              </p>
            </div>
            <div className="col-md-4">
              <h6 className="text-secondary">Kriteria Kandidat:</h6>
              <ul className="list-unstyled">
                <li><i className="fas fa-check text-success me-2"></i>2 peringkat teratas jumlah pemilih</li>
                <li><i className="fas fa-check text-success me-2"></i>Jika seri, semua masuk kandidat</li>
                <li><i className="fas fa-check text-success me-2"></i>Nilai tertinggi = Best Employee</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Period Selection & Controls */}
      <div className="card mb-4">
        <div className="card-body">
          <div className="row g-3 align-items-center">
            <div className="col-md-4">
              <label className="form-label">Periode Penilaian *</label>
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
            <div className="col-md-4">
              <div className="form-check mt-4">
                <input
                  className="form-check-input"
                  type="checkbox"
                  id="showCandidatesOnly"
                  checked={showCandidatesOnly}
                  onChange={(e) => setShowCandidatesOnly(e.target.checked)}
                />
                <label className="form-check-label" htmlFor="showCandidatesOnly">
                  Tampilkan hanya kandidat
                </label>
              </div>
            </div>
            <div className="col-md-4">
              {selectedPeriod && (
                <button 
                  className="btn btn-outline-primary w-100"
                  onClick={loadFinalEvaluations}
                  disabled={loading}
                >
                  <i className="fas fa-sync-alt me-2"></i>
                  Refresh Data
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {selectedPeriod ? (
        <>
          {/* Best Employee Card */}
          {bestEmployee && (
            <div className="card border-warning mb-4">
              <div className="card-header bg-warning text-dark">
                <h5 className="mb-0">
                  <i className="fas fa-crown me-2"></i>
                  Best Employee of the Month - {bestEmployee.period.namaPeriode}
                </h5>
              </div>
              <div className="card-body">
                <div className="row align-items-center">
                  <div className="col-md-3 text-center">
                    <i className="fas fa-trophy text-warning" style={{ fontSize: '4rem' }}></i>
                  </div>
                  <div className="col-md-6">
                    <h3 className="text-primary mb-1">{bestEmployee.user.nama}</h3>
                    <p className="text-muted mb-2">{bestEmployee.user.jabatan}</p>
                    <div className="d-flex gap-3">
                      <span className="badge bg-primary fs-6">NIP: {bestEmployee.user.nip}</span>
                      <span className="badge bg-success fs-6">Ranking: #{bestEmployee.ranking}</span>
                    </div>
                  </div>
                  <div className="col-md-3 text-center">
                    <h2 className="text-success mb-0">{bestEmployee.finalScore.toFixed(2)}</h2>
                    <small className="text-muted">Nilai Akhir</small>
                    <div className="mt-2">
                      <div className="row text-center">
                        <div className="col-4">
                          <div className="text-primary">
                            <strong>{bestEmployee.presensiScore.toFixed(1)}</strong>
                            <small className="d-block">Presensi</small>
                          </div>
                        </div>
                        <div className="col-4">
                          <div className="text-success">
                            <strong>{bestEmployee.berakhlakScore.toFixed(1)}</strong>
                            <small className="d-block">BerAKHLAK</small>
                          </div>
                        </div>
                        <div className="col-4">
                          <div className="text-warning">
                            <strong>{bestEmployee.ckpScore.toFixed(1)}</strong>
                            <small className="d-block">CKP</small>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Final Evaluations Table */}
          <div className="card">
            <div className="card-header">
              <div className="d-flex justify-content-between align-items-center">
                <h5 className="mb-0">
                  <i className="fas fa-list me-2"></i>
                  Hasil Perhitungan Final - {periods.find(p => p.id === selectedPeriod)?.namaPeriode}
                </h5>
                <span className="badge bg-primary fs-6">
                  {finalEvaluations.length} pegawai
                </span>
              </div>
            </div>
            <div className="card-body">
              {loading ? (
                <div className="text-center py-4">
                  <div className="spinner-border text-primary" role="status">
                    <span className="visually-hidden">Loading...</span>
                  </div>
                </div>
              ) : (
                <>
                  <div className="table-responsive">
                    <table className="table table-hover">
                      <thead className="table-light">
                        <tr>
                          <th width="60">Rank</th>
                          <th>Pegawai</th>
                          <th>Jabatan</th>
                          <th>Pemilih</th>
                          <th>Presensi (40%)</th>
                          <th>BerAKHLAK (30%)</th>
                          <th>CKP (30%)</th>
                          <th>Nilai Akhir</th>
                          <th>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {finalEvaluations.length === 0 ? (
                          <tr>
                            <td colSpan="9" className="text-center py-4 text-muted">
                              <i className="fas fa-calculator fa-2x mb-2"></i>
                              <br />Belum ada hasil perhitungan untuk periode ini
                              <br />
                              <button 
                                className="btn btn-primary btn-sm mt-2"
                                onClick={handleCalculateFinal}
                                disabled={calculating}
                              >
                                <i className="fas fa-play me-1"></i>
                                Jalankan Perhitungan
                              </button>
                            </td>
                          </tr>
                        ) : (
                          finalEvaluations.map((evaluation, index) => (
                            <tr 
                              key={evaluation.user.id} 
                              className={evaluation.isBestEmployee ? 'table-warning' : evaluation.isCandidate ? 'table-light' : ''}
                            >
                              <td>
                                {evaluation.ranking ? (
                                  <span className={`badge ${getRankingBadge(evaluation.ranking)} fs-6`}>
                                    #{evaluation.ranking}
                                  </span>
                                ) : (
                                  <span className="text-muted">-</span>
                                )}
                              </td>
                              <td>
                                <div>
                                  <strong className="text-primary">{evaluation.user.nama}</strong>
                                  <small className="d-block text-muted">NIP: {evaluation.user.nip}</small>
                                </div>
                              </td>
                              <td>
                                <small className="text-muted">{evaluation.user.jabatan}</small>
                              </td>
                              <td>
                                <div className="text-center">
                                  <span className="h6 mb-0">{evaluation.totalEvaluators}</span>
                                  <small className="d-block text-muted">
                                    T1:{evaluation.tokoh1Count} T2:{evaluation.tokoh2Count} T3:{evaluation.tokoh3Count}
                                  </small>
                                </div>
                              </td>
                              <td>
                                <div className="text-center">
                                  <span className={`fw-bold ${getScoreColor(evaluation.presensiScore)}`}>
                                    {evaluation.presensiScore.toFixed(1)}
                                  </span>
                                  <small className="d-block text-muted">
                                    ({evaluation.presensiWeighted.toFixed(1)})
                                  </small>
                                </div>
                              </td>
                              <td>
                                <div className="text-center">
                                  <span className={`fw-bold ${getScoreColor(evaluation.berakhlakScore)}`}>
                                    {evaluation.berakhlakScore.toFixed(1)}
                                  </span>
                                  <small className="d-block text-muted">
                                    ({evaluation.berakhlakWeighted.toFixed(1)})
                                  </small>
                                </div>
                              </td>
                              <td>
                                <div className="text-center">
                                  <span className={`fw-bold ${getScoreColor(evaluation.ckpScore)}`}>
                                    {evaluation.ckpScore.toFixed(1)}
                                  </span>
                                  <small className="d-block text-muted">
                                    ({evaluation.ckpWeighted.toFixed(1)})
                                  </small>
                                </div>
                              </td>
                              <td>
                                <div className="text-center">
                                  <span className={`h6 mb-0 ${getScoreColor(evaluation.finalScore)}`}>
                                    {evaluation.finalScore.toFixed(2)}
                                  </span>
                                  <div 
                                    className="progress mt-1" 
                                    style={{ height: '4px' }}
                                  >
                                    <div 
                                      className={`progress-bar ${evaluation.finalScore >= 90 ? 'bg-success' : evaluation.finalScore >= 80 ? 'bg-primary' : evaluation.finalScore >= 70 ? 'bg-warning' : 'bg-danger'}`}
                                      style={{ width: `${evaluation.finalScore}%` }}
                                    ></div>
                                  </div>
                                </div>
                              </td>
                              <td>
                                <div className="d-flex flex-column gap-1">
                                  {evaluation.isBestEmployee && (
                                    <span className="badge bg-warning text-dark">
                                      <i className="fas fa-crown me-1"></i>
                                      Best Employee
                                    </span>
                                  )}
                                  {evaluation.isCandidate && (
                                    <span className="badge bg-success">
                                      <i className="fas fa-medal me-1"></i>
                                      Kandidat
                                    </span>
                                  )}
                                </div>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>

                  {/* Summary Statistics */}
                  {finalEvaluations.length > 0 && (
                    <div className="mt-4 p-3 bg-light rounded">
                      <div className="row text-center">
                        <div className="col-md-2">
                          <h5 className="text-primary mb-0">{finalEvaluations.length}</h5>
                          <small className="text-muted">Total Pegawai</small>
                        </div>
                        <div className="col-md-2">
                          <h5 className="text-success mb-0">
                            {finalEvaluations.filter(e => e.isCandidate).length}
                          </h5>
                          <small className="text-muted">Kandidat</small>
                        </div>
                        <div className="col-md-2">
                          <h5 className="text-warning mb-0">
                            {finalEvaluations.filter(e => e.isBestEmployee).length}
                          </h5>
                          <small className="text-muted">Best Employee</small>
                        </div>
                        <div className="col-md-2">
                          <h5 className="text-info mb-0">
                            {finalEvaluations.length > 0 ? 
                              (finalEvaluations.reduce((sum, e) => sum + e.finalScore, 0) / finalEvaluations.length).toFixed(1) : 0
                            }
                          </h5>
                          <small className="text-muted">Rata-rata</small>
                        </div>
                        <div className="col-md-2">
                          <h5 className="text-success mb-0">
                            {finalEvaluations.length > 0 ? Math.max(...finalEvaluations.map(e => e.finalScore)).toFixed(1) : 0}
                          </h5>
                          <small className="text-muted">Tertinggi</small>
                        </div>
                        <div className="col-md-2">
                          <h5 className="text-danger mb-0">
                            {finalEvaluations.length > 0 ? Math.min(...finalEvaluations.map(e => e.finalScore)).toFixed(1) : 0}
                          </h5>
                          <small className="text-muted">Terendah</small>
                        </div>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </>
      ) : (
        <div className="card">
          <div className="card-body text-center py-5">
            <i className="fas fa-calculator fa-3x text-muted mb-3"></i>
            <h5 className="text-muted">Pilih Periode untuk Perhitungan</h5>
            <p className="text-muted">Silakan pilih periode penilaian untuk melihat dan menjalankan perhitungan final</p>
          </div>
        </div>
      )}

      {/* Calculation Result Modal */}
      {showCalculationModal && calculationResult && (
        <div className="modal fade show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-lg">
            <div className="modal-content">
              <div className="modal-header bg-success text-white">
                <h5 className="modal-title">
                  <i className="fas fa-check-circle me-2"></i>
                  Perhitungan Selesai!
                </h5>
                <button 
                  type="button" 
                  className="btn-close btn-close-white"
                  onClick={() => setShowCalculationModal(false)}
                ></button>
              </div>
              <div className="modal-body">
                <div className="text-center mb-4">
                  <i className="fas fa-trophy text-warning" style={{ fontSize: '4rem' }}></i>
                  <h4 className="mt-3 text-primary">Perhitungan Final Berhasil!</h4>
                </div>

                <div className="row text-center mb-4">
                  <div className="col-md-3">
                    <div className="bg-primary text-white rounded p-3">
                      <h4 className="mb-0">{calculationResult.totalUsers}</h4>
                      <small>Total Pegawai</small>
                    </div>
                  </div>
                  <div className="col-md-3">
                    <div className="bg-success text-white rounded p-3">
                      <h4 className="mb-0">{calculationResult.candidates}</h4>
                      <small>Kandidat</small>
                    </div>
                  </div>
                  <div className="col-md-3">
                    <div className="bg-warning text-dark rounded p-3">
                      <h4 className="mb-0">1</h4>
                      <small>Best Employee</small>
                    </div>
                  </div>
                  <div className="col-md-3">
                    <div className="bg-info text-white rounded p-3">
                      <h4 className="mb-0">{calculationResult.period}</h4>
                      <small>Periode</small>
                    </div>
                  </div>
                </div>

                {calculationResult.bestEmployee && (
                  <div className="card border-warning">
                    <div className="card-header bg-warning text-dark">
                      <h6 className="mb-0">
                        <i className="fas fa-crown me-2"></i>
                        Best Employee of the Month
                      </h6>
                    </div>
                    <div className="card-body">
                      <div className="row align-items-center">
                        <div className="col-md-8">
                          <h5 className="text-primary mb-1">{calculationResult.bestEmployee.user.nama}</h5>
                          <p className="text-muted mb-2">{calculationResult.bestEmployee.user.jabatan}</p>
                          <span className="badge bg-primary me-2">NIP: {calculationResult.bestEmployee.user.nip}</span>
                        </div>
                        <div className="col-md-4 text-center">
                          <h3 className="text-success mb-0">{calculationResult.bestEmployee.finalScore.toFixed(2)}</h3>
                          <small className="text-muted">Nilai Akhir</small>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                <div className="mt-4">
                  <h6 className="text-secondary">Detail Perhitungan:</h6>
                  <ul className="list-unstyled">
                    <li><i className="fas fa-check text-success me-2"></i>Evaluasi BerAKHLAK telah dihitung dengan bobot 30%</li>
                    <li><i className="fas fa-check text-success me-2"></i>Data Presensi telah dihitung dengan bobot 40%</li>
                    <li><i className="fas fa-check text-success me-2"></i>Data CKP telah dihitung dengan bobot 30%</li>
                    <li><i className="fas fa-check text-success me-2"></i>Kandidat ditentukan berdasarkan 2 peringkat teratas jumlah pemilih</li>
                    <li><i className="fas fa-check text-success me-2"></i>Best Employee ditentukan dari nilai akhir tertinggi</li>
                  </ul>
                </div>
              </div>
              <div className="modal-footer">
                <button 
                  type="button" 
                  className="btn btn-success"
                  onClick={() => setShowCalculationModal(false)}
                >
                  <i className="fas fa-check me-2"></i>
                  Selesai
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FinalCalculationPage;