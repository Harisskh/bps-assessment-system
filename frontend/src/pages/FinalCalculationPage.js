// src/pages/FinalCalculationPage.js - CONSISTENT UI/UX DESIGN
import React, { useState, useEffect, useRef } from 'react';
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
  const [excludedPositions, setExcludedPositions] = useState([]);
  
  // View states
  const [showCandidatesOnly, setShowCandidatesOnly] = useState(false);
  const [showCalculationModal, setShowCalculationModal] = useState(false);

  // Ref for auto scroll
  const calculationButtonRef = useRef(null);

  // EXCLUDED POSITIONS - Frontend reference
  const EXCLUDED_POSITIONS = [
    'Statistisi Ahli Madya BPS Kabupaten/Kota',
    'Statistisi Ahli Madya',
    'Statistisi Ahli Madya Badan Pusat Statistik Kabupaten/Kota',
    'Kepala BPS',
    'Kepala Badan Pusat Statistik Kabupaten/Kota',
    'Kepala BPS Kabupaten/Kota',
    'Kasubbag Umum',
    'Kasubbag Umum Badan Pusat Statistik Kabupaten/Kota',
    'Kasubbag Umum BPS Kabupaten/Kota',
    'Kepala Subbagian Umum Badan Pusat Statistik Kabupaten/Kota',
    'Kepala Subbagian Umum BPS Kabupaten/Kota',
    'Kepala Subbagian Umum',
    'kepala',
    'madya',
    'Madya',
    'Kepala',
    'KEPALA',
    'MADYA'
  ];

  useEffect(() => {
    loadInitialData();
  }, []);

  useEffect(() => {
    if (selectedPeriod) {
      loadFinalEvaluations();
      loadBestEmployee();
    }
  }, [selectedPeriod, showCandidatesOnly]);

  // Auto scroll when no data
  useEffect(() => {
    if (selectedPeriod && finalEvaluations.length === 0 && !loading && calculationButtonRef.current) {
      const timer = setTimeout(() => {
        calculationButtonRef.current?.scrollIntoView({ 
          behavior: 'smooth', 
          block: 'center' 
        });
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [selectedPeriod, finalEvaluations, loading]);

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

  const loadFinalEvaluations = async () => {
    try {
      setLoading(true);
      setError('');
      
      const params = {
        periodId: selectedPeriod,
        onlyCandidates: showCandidatesOnly,
        limit: 100
      };

      console.log('🔄 Loading final evaluations with params:', params);
      
      const response = await finalEvaluationAPI.getFinal(params);
      console.log('📊 Final evaluations response:', response.data);
      
      setFinalEvaluations(response.data.data.finalEvaluations || []);
      setExcludedPositions(response.data.data.excludedPositions || EXCLUDED_POSITIONS);
      
      console.log('✅ Final evaluations loaded:', response.data.data.finalEvaluations?.length || 0);
      
    } catch (error) {
      console.error('❌ Load final evaluations error:', error);
      
      // Better error handling
      if (error.response?.status === 404) {
        setError('');
        setFinalEvaluations([]);
      } else if (error.response?.status === 401) {
        setError('Anda tidak memiliki akses untuk melihat data ini.');
      } else {
        setError(error.response?.data?.message || 'Gagal memuat data evaluasi final');
      }
    } finally {
      setLoading(false);
    }
  };

  const loadBestEmployee = async () => {
    try {
      console.log('👑 Loading best employee for period:', selectedPeriod);
      const response = await finalEvaluationAPI.getBestEmployee(selectedPeriod);
      setBestEmployee(response.data.data.bestEmployee);
      console.log('✅ Best employee loaded:', response.data.data.bestEmployee?.user?.nama);
    } catch (error) {
      console.warn('⚠️ Best employee not found:', error);
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
      console.log('🔄 Starting calculation for period:', selectedPeriod);
      
      const response = await finalEvaluationAPI.calculate({ 
        periodId: selectedPeriod 
      });
      
      console.log('✅ Calculation response:', response.data);
      
      setCalculationResult(response.data.data);
      setSuccess('Perhitungan final berhasil diselesaikan');
      setShowCalculationModal(true);
      
      // Reload data
      setTimeout(() => {
        loadFinalEvaluations();
        loadBestEmployee();
      }, 1000);
      
    } catch (error) {
      console.error('❌ Calculate final error:', error);
      
      // Enhanced error handling
      if (error.response?.status === 404) {
        setError('API endpoint tidak ditemukan. Pastikan server berjalan dengan benar.');
      } else if (error.response?.status === 400) {
        setError(error.response.data.message || 'Data tidak valid untuk perhitungan');
      } else if (error.response?.status === 401) {
        setError('Anda tidak memiliki akses untuk melakukan perhitungan.');
      } else if (error.code === 'ERR_NETWORK') {
        setError('Tidak dapat terhubung ke server. Periksa koneksi internet Anda.');
      } else {
        setError(error.response?.data?.message || 'Gagal melakukan perhitungan final');
      }
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

  const isExcludedPosition = (jabatan) => {
    if (!jabatan) return false;
    return EXCLUDED_POSITIONS.some(excludedPos => 
      jabatan.toLowerCase().includes(excludedPos.toLowerCase()) ||
      (excludedPos.includes('Kepala BPS') && jabatan.toLowerCase().includes('kepala bps')) ||
      (excludedPos.includes('Kasubbag') && jabatan.toLowerCase().includes('kasubbag')) ||
      (excludedPos.includes('Kepala Subbagian') && jabatan.toLowerCase().includes('kepala subbagian')) ||
      (excludedPos.includes('Kepala') && jabatan.toLowerCase().includes('kepala')) ||
      (excludedPos.includes('madya') && jabatan.toLowerCase().includes('madya'))
    );
  };

  if (loading && finalEvaluations.length === 0 && !selectedPeriod) {
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
                <i className="fas fa-calculator me-2"></i>
                Perhitungan Final & Best Employee
              </h2>
              <p className="mb-0 opacity-75">Hitung nilai akhir dan tentukan Best Employee of the Month</p>
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

          {/* 🔥 UPDATED: Calculation Info with New Formula */}
      <div className="card border-info mb-4">
        <div className="card-header bg-info text-white">
          <h6 className="mb-0">
            <i className="fas fa-info-circle me-2"></i>
            Formula Perhitungan Best Employee
          </h6>
        </div>
        <div className="card-body">
          <div className="row">
            <div className="col-md-6">
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
            <div className="col-md-3">
              <h6 className="text-success">Formula BerAKHLAK Baru:</h6>
              <ul className="list-unstyled">
                <li><i className="fas fa-star text-warning me-2"></i>Penilai hanya memilih 1 tokoh BerAKHLAK</li>
                <li><i className="fas fa-plus text-success me-2"></i> Jumlah/Total Rata-Rata per Penilai</li>
                <li><i className="fas fa-chart-line text-primary me-2"></i> Fokus nilai tertinggi</li>
                <li><i className="fas fa-infinity text-info me-2"></i>Nilai bisa lebih dari 100</li>
              </ul>
            </div>
            <div className="col-md-3">
              <h6 className="text-secondary">Kriteria Kandidat:</h6>
              <ul className="list-unstyled">
                <li><i className="fas fa-check text-success me-2"></i>Pegawai dengan 2 peringkat teratas jumlah pemilih</li>
                <li><i className="fas fa-check text-success me-2"></i>Jika Jumlah pemilih seri, semua pegawai masuk kandidat</li>
                <li><i className="fas fa-check text-success me-2"></i>Nilai tertinggi = Best Employee</li>
              </ul>
            </div>
          </div>          
        </div>
      </div>

          {/* Filter & Pencarian Data - Consistent with other pages */}
          <div className="card mb-4">
            <div className="card-body">
              <h6 className="text-muted mb-3">
                <i className="fas fa-filter me-2"></i>
                Filter & Pencarian Data
              </h6>
              <div className="row g-3 align-items-end">
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
                  <div className="form-check">
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
                  <div 
                    className="card-header text-dark d-flex justify-content-between align-items-center"
                    style={{ background: 'linear-gradient(135deg, #ffc107 0%, #ffdb4d 100%)' }}
                  >
                    <h5 className="mb-0">
                      <i className="fas fa-crown me-2"></i>
                      Best Employee of the Month - {bestEmployee.period.namaPeriode}
                    </h5>
                    <span className="badge bg-dark">Total: {bestEmployee.totalEvaluators} pemilih</span>
                  </div>
                  <div className="card-body">
                    <div className="row align-items-center">
                      <div className="col-md-2 text-center mb-3 mb-md-0">
                        <i className="fas fa-trophy text-warning" style={{ fontSize: '3rem' }}></i>
                      </div>
                      <div className="col-md-6 mb-3 mb-md-0">
                        <h3 className="text-primary mb-1">{bestEmployee.user.nama}</h3>
                        <p className="text-muted mb-2">{bestEmployee.user.jabatan}</p>
                        <div className="d-flex flex-wrap gap-2">
                          <span className="badge bg-primary">NIP: {bestEmployee.user.nip}</span>
                          <span className="badge bg-success">Ranking: #{bestEmployee.ranking}</span>
                        </div>
                      </div>
                      <div className="col-md-4 text-center">
                        <h2 className="text-success mb-2">{bestEmployee.finalScore.toFixed(2)}</h2>
                        <small className="text-muted d-block mb-3">Nilai Akhir</small>
                        <div className="row text-center">
                          <div className="col-4">
                            <div className="text-primary">
                              <strong className="d-block">{bestEmployee.presensiScore.toFixed(1)}</strong>
                              <small>Presensi</small>
                            </div>
                          </div>
                          <div className="col-4">
                            <div className="text-success">
                              <strong className="d-block">{bestEmployee.berakhlakScore.toFixed(1)}</strong>
                              <small>BerAKHLAK</small>
                            </div>
                          </div>
                          <div className="col-4">
                            <div className="text-warning">
                              <strong className="d-block">{bestEmployee.ckpScore.toFixed(1)}</strong>
                              <small>CKP</small>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Results Table - Consistent with other pages */}
              <div className="card">
                <div 
                  className="card-header text-white d-flex justify-content-between align-items-center"
                  style={{ background: 'linear-gradient(135deg, #2c549c 0%, #3a6bb3 100%)' }}
                >
                  <h5 className="mb-0">
                    <i className="fas fa-list me-2"></i>
                    Hasil Perhitungan Final - {periods.find(p => p.id === selectedPeriod)?.namaPeriode}
                  </h5>
                  <span className="badge bg-light text-dark">
                    Total: {finalEvaluations.length}
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
                  ) : finalEvaluations.length === 0 ? (
                    <div className="text-center py-5" ref={calculationButtonRef}>
                      <i className="fas fa-calculator fa-3x text-muted mb-3"></i>
                      <h5 className="text-muted mb-3">Belum ada hasil perhitungan untuk periode ini</h5>
                      <p className="text-muted mb-4">Klik tombol "Jalankan Perhitungan" untuk memulai proses perhitungan final</p>
                      
                      <button 
                        className="btn btn-success btn-lg px-5 py-3"
                        onClick={handleCalculateFinal}
                        disabled={calculating}
                        style={{ 
                          borderRadius: '50px',
                          boxShadow: '0 4px 15px rgba(40, 167, 69, 0.4)',
                          fontSize: '1.1rem',
                          fontWeight: '600'
                        }}
                      >
                        {calculating ? (
                          <>
                            <span className="spinner-border spinner-border-sm me-3"></span>
                            Sedang Menghitung...
                          </>
                        ) : (
                          <>
                            <i className="fas fa-play me-3"></i>
                            Jalankan Perhitungan Final
                          </>
                        )}
                      </button>
                      {calculating && (
                        <div className="mt-3">
                          <small className="text-muted">
                            <i className="fas fa-hourglass-half me-1"></i>
                            Proses ini membutuhkan waktu beberapa saat...
                          </small>
                        </div>
                      )}
                    </div>
                  ) : (
                    <>
                      {/* Desktop Table */}
                      <div className="d-none d-md-block">
                        <div className="table-responsive">
                          <table className="table table-hover">
                            <thead className="table-light">
                              <tr>
                                <th width="60">Rank</th>
                                <th>Pegawai</th>
                                <th className="d-none d-lg-table-cell">Jabatan</th>
                                <th>Pemilih</th>
                                <th>Presensi (40%)</th>
                                <th>BerAKHLAK (30%)</th>
                                <th>CKP (30%)</th>
                                <th>Nilai Akhir</th>
                                <th>Status</th>
                              </tr>
                            </thead>
                            <tbody>
                              {finalEvaluations.map((evaluation, index) => {
                                const isExcluded = isExcludedPosition(evaluation.user.jabatan);
                                return (
                                  <tr 
                                    key={evaluation.user.id} 
                                    className={
                                      evaluation.isBestEmployee ? 'table-warning' : 
                                      evaluation.isCandidate ? 'table-light' : 
                                      isExcluded ? 'table-secondary' : ''
                                    }
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
                                        {isExcluded && (
                                          <small className="d-block text-danger">
                                            <i className="fas fa-exclamation-triangle me-1"></i>
                                            Tidak diikutsertakan (Jabatan Tinggi)
                                          </small>
                                        )}
                                      </div>
                                    </td>
                                    <td className="d-none d-lg-table-cell">
                                      <small className="text-muted">{evaluation.user.jabatan}</small>
                                    </td>
                                    <td>
                                      <div className="text-center">
                                        <span className="h6 mb-0">{evaluation.totalEvaluators}</span>
                                        <small className="d-block text-muted">Pemilih</small>
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
                                            style={{ width: `${Math.min(evaluation.finalScore, 100)}%` }}
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
                                        {isExcluded && (
                                          <span className="badge bg-secondary">
                                            <i className="fas fa-ban me-1"></i>
                                            Dikecualikan
                                          </span>
                                        )}
                                      </div>
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      </div>

                      {/* Mobile Cards */}
                      <div className="d-md-none">
                        {finalEvaluations.map((evaluation, index) => {
                          const isExcluded = isExcludedPosition(evaluation.user.jabatan);
                          return (
                            <div 
                              key={evaluation.user.id}
                              className={`card mb-3 ${
                                evaluation.isBestEmployee ? 'border-warning' : 
                                evaluation.isCandidate ? 'border-success' : 
                                isExcluded ? 'border-secondary' : 'border-light'
                              }`}
                            >
                              <div className="card-body">
                                <div className="d-flex justify-content-between align-items-start mb-2">
                                  <div>
                                    <h6 className="text-primary mb-1">{evaluation.user.nama}</h6>
                                    <small className="text-muted">{evaluation.user.nip}</small>
                                  </div>
                                  {evaluation.ranking && (
                                    <span className={`badge ${getRankingBadge(evaluation.ranking)}`}>
                                      #{evaluation.ranking}
                                    </span>
                                  )}
                                </div>
                                
                                <p className="small text-muted mb-2">{evaluation.user.jabatan}</p>
                                
                                {isExcluded && (
                                  <div className="alert alert-secondary py-2 mb-2">
                                    <small>
                                      <i className="fas fa-exclamation-triangle me-1"></i>
                                      Tidak diikutsertakan (Jabatan Tinggi)
                                    </small>
                                  </div>
                                )}
                                
                                <div className="row text-center mb-2">
                                  <div className="col-3">
                                    <div className="text-primary">
                                      <strong className="d-block">{evaluation.presensiScore.toFixed(1)}</strong>
                                      <small>Presensi</small>
                                    </div>
                                  </div>
                                  <div className="col-3">
                                    <div className="text-success">
                                      <strong className="d-block">{evaluation.berakhlakScore.toFixed(1)}</strong>
                                      <small>BerAKHLAK</small>
                                    </div>
                                  </div>
                                  <div className="col-3">
                                    <div className="text-warning">
                                      <strong className="d-block">{evaluation.ckpScore.toFixed(1)}</strong>
                                      <small>CKP</small>
                                    </div>
                                  </div>
                                  <div className="col-3">
                                    <div className="text-info">
                                      <strong className="d-block">{evaluation.totalEvaluators}</strong>
                                      <small>Pemilih</small>
                                    </div>
                                  </div>
                                </div>
                                
                                <div className="text-center">
                                  <h5 className={`mb-1 ${getScoreColor(evaluation.finalScore)}`}>
                                    {evaluation.finalScore.toFixed(2)}
                                  </h5>
                                  <small className="text-muted">Nilai Akhir</small>
                                  
                                  <div className="mt-2">
                                    {evaluation.isBestEmployee && (
                                      <span className="badge bg-warning text-dark me-1">
                                        <i className="fas fa-crown me-1"></i>Best Employee
                                      </span>
                                    )}
                                    {evaluation.isCandidate && (
                                      <span className="badge bg-success me-1">
                                        <i className="fas fa-medal me-1"></i>Kandidat
                                      </span>
                                    )}
                                    {isExcluded && (
                                      <span className="badge bg-secondary">
                                        <i className="fas fa-ban me-1"></i>Dikecualikan
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      {/* Summary Statistics */}
                      {finalEvaluations.length > 0 && (
                        <div className="mt-4 p-3 bg-light rounded">
                          <div className="row text-center">
                            <div className="col-6 col-md-2">
                              <h5 className="text-primary mb-0">{finalEvaluations.length}</h5>
                              <small className="text-muted">Total Pegawai</small>
                            </div>
                            <div className="col-6 col-md-2">
                              <h5 className="text-success mb-0">
                                {finalEvaluations.filter(e => e.isCandidate).length}
                              </h5>
                              <small className="text-muted">Kandidat</small>
                            </div>
                            <div className="col-6 col-md-2">
                              <h5 className="text-warning mb-0">
                                {finalEvaluations.filter(e => e.isBestEmployee).length}
                              </h5>
                              <small className="text-muted">Best Employee</small>
                            </div>
                            <div className="col-6 col-md-2">
                              <h5 className="text-danger mb-0">
                                {finalEvaluations.filter(e => isExcludedPosition(e.user.jabatan)).length}
                              </h5>
                              <small className="text-muted">Dikecualikan</small>
                            </div>
                            <div className="col-6 col-md-2">
                              <h5 className="text-success mb-0">
                                {finalEvaluations.length > 0 ? Math.max(...finalEvaluations.map(e => e.finalScore)).toFixed(1) : 0}
                              </h5>
                              <small className="text-muted">Skor Tertinggi</small>
                            </div>
                            <div className="col-6 col-md-2">
                              <h5 className="text-info mb-0">
                                {finalEvaluations.length > 0 ? (finalEvaluations.reduce((sum, e) => sum + e.finalScore, 0) / finalEvaluations.length).toFixed(1) : 0}
                              </h5>
                              <small className="text-muted">Rata-rata</small>
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
              <div className="modal-dialog modal-xl">
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
                      <div className="col-6 col-md-3">
                        <div className="bg-primary text-white rounded p-3">
                          <h4 className="mb-0">{calculationResult.totalUsers}</h4>
                          <small>Total Pegawai</small>
                        </div>
                      </div>
                      <div className="col-6 col-md-3">
                        <div className="bg-success text-white rounded p-3">
                          <h4 className="mb-0">{calculationResult.candidates}</h4>
                          <small>Kandidat</small>
                        </div>
                      </div>
                      <div className="col-6 col-md-3">
                        <div className="bg-warning text-dark rounded p-3">
                          <h4 className="mb-0">1</h4>
                          <small>Best Employee</small>
                        </div>
                      </div>
                      <div className="col-6 col-md-3">
                        <div className="bg-danger text-white rounded p-3">
                          <h4 className="mb-0">{calculationResult.excludedUsers || 0}</h4>
                          <small>Dikecualikan</small>
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
                              <span className="badge bg-info me-2">Pemilih: {calculationResult.bestEmployee.totalEvaluators}</span>
                            </div>
                            <div className="col-md-4 text-center">
                              <h3 className="text-success mb-0">{calculationResult.bestEmployee.finalScore.toFixed(2)}</h3>
                              <small className="text-muted">Nilai Akhir</small>
                              <div className="mt-2">
                                <div className="row text-center">
                                  <div className="col-4">
                                    <div className="text-primary">
                                      <strong>{calculationResult.bestEmployee.presensiScore.toFixed(1)}</strong>
                                      <small className="d-block">Presensi</small>
                                    </div>
                                  </div>
                                  <div className="col-4">
                                    <div className="text-success">
                                      <strong>{calculationResult.bestEmployee.berakhlakScore.toFixed(1)}</strong>
                                      <small className="d-block">BerAKHLAK</small>
                                    </div>
                                  </div>
                                  <div className="col-4">
                                    <div className="text-warning">
                                      <strong>{calculationResult.bestEmployee.ckpScore.toFixed(1)}</strong>
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

                    <div className="mt-4">
                      <h6 className="text-secondary">Detail Perhitungan:</h6>
                      <div className="row">
                        <div className="col-md-6">
                          <div className="alert alert-success">
                            <h6 className="text-success">✅ Yang Sudah Dihitung:</h6>
                            <ul className="mb-0">
                              <li>Evaluasi BerAKHLAK dengan <strong>penjumlahan langsung</strong></li>
                              <li>Data Presensi dengan sistem progresif</li>
                              <li>Data CKP dengan bobot 30%</li>
                              <li>Kandidat berdasarkan 2 peringkat teratas pemilih</li>
                              <li>Best Employee dari nilai akhir tertinggi</li>
                            </ul>
                          </div>
                        </div>
                        <div className="col-md-6">
                          <div className="alert alert-info">
                            <h6 className="text-info">📊 Proses Perhitungan:</h6>
                            <ul className="mb-0">
                              <li><strong>BerAKHLAK:</strong> Total skor rata-rata dari seluruh penilai</li>
                              <li><strong>Rentang penilaian BerAKHLAK:</strong> 80-100</li>
                              <li><strong>Presensi:</strong> Sistem pengurangan progresif</li>
                              <li><strong>CKP:</strong> Sistem pengurangan progresif</li>
                              <li><strong>Hasil:</strong> Nilai bisa lebih dari 100</li>
                            </ul>
                          </div>
                        </div>
                      </div>

                      {calculationResult.summary?.excludedUserDetails && calculationResult.summary.excludedUserDetails.length > 0 && (
                        <div className="mt-3">
                          <h6 className="text-danger">Pegawai yang Dikecualikan:</h6>
                          <div className="bg-light p-3 rounded">
                            {calculationResult.summary.excludedUserDetails.map((user, index) => (
                              <div key={index} className="d-flex justify-content-between align-items-center border-bottom py-2">
                                <div>
                                  <strong>{user.nama}</strong>
                                  <small className="d-block text-muted">NIP: {user.nip}</small>
                                </div>
                                <small className="text-danger">{user.jabatan}</small>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="modal-footer">
                    <button 
                      type="button" 
                      className="btn btn-secondary"
                      onClick={() => setShowCalculationModal(false)}
                    >
                      <i className="fas fa-times me-2"></i>
                      Tutup
                    </button>
                    <button 
                      type="button" 
                      className="btn btn-success btn-lg"
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
      </div>
    </div>
  );
};

export default FinalCalculationPage;