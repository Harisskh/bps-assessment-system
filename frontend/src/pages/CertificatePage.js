// src/pages/CertificatePage.js - FIXED LOADING PER CARD
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  getMyAwards, 
  generateCertificate 
} from '../services/api';

import '../styles/CertificatePage.scss';

const CertificatePage = () => {
  const navigate = useNavigate();
  const [awards, setAwards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState(null);
  
  // 🔥 FIXED: Individual loading state for each card
  const [generatingStates, setGeneratingStates] = useState({}); // Object to track each period's loading
  
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    console.log('🎯 CertificatePage mounted');
    fetchMyAwards();
  }, []);

  const fetchMyAwards = async () => {
    console.log('📊 Fetching my awards...');
    setLoading(true);
    setError('');
    
    try {
      const response = await getMyAwards();
      console.log('📊 Awards response:', response);
      
      if (response.success) {
        setAwards(response.data.awards || []);
        console.log('✅ Awards loaded:', response.data.awards?.length || 0);
      } else {
        setError('Gagal memuat data penghargaan');
        console.error('❌ Awards fetch failed:', response);
      }
    } catch (error) {
      console.error('❌ Error fetching awards:', error);
      setError('Terjadi kesalahan saat memuat data: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  // 🔥 FIXED: Download function with individual loading states
  const handleDownload = async (periodId) => {
    console.log('⬇️ Downloading certificate for period:', periodId);
    
    // Set loading state for this specific period only
    setGeneratingStates(prev => ({ ...prev, [periodId]: true }));
    setError('');
    
    try {
      const response = await generateCertificate(periodId);
      console.log('⬇️ Download response received');
      
      // Create download link
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      
      // Extract filename from response headers
      const contentDisposition = response.headers['content-disposition'];
      let filename = 'Sertifikat.pdf';
      
      if (contentDisposition) {
        const matches = contentDisposition.match(/filename[^;=\n]*=((['"]).?\2|[^;\n]*)/);
        if (matches && matches[1]) {
          filename = matches[1].replace(/['"]/g, '');
        }
      }
      
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      // Refresh awards data to update download status
      fetchMyAwards();
      
      // Success notification
      setSuccess('🎉 Sertifikat berhasil diunduh! Font diperbaiki dengan Poppins dan nama dalam bold italic.');
      setTimeout(() => setSuccess(''), 5000);
      
    } catch (error) {
      console.error('❌ Error downloading certificate:', error);
      setError('Gagal mengunduh sertifikat: ' + error.message);
    } finally {
      // Clear loading state for this specific period
      setGeneratingStates(prev => ({ ...prev, [periodId]: false }));
    }
  };

  const goBackToDashboard = () => {
    navigate('/dashboard');
  };

  // 🔥 HELPER: Check if specific period is generating
  const isGenerating = (periodId) => {
    return generatingStates[periodId] || false;
  };

  if (loading) {
    return (
      <div className="container-fluid p-4 certificate-page">
        <div className="loading-section">
          <div className="loading-content">
            <div className="loading-spinner">
              <div className="spinner-border text-primary" role="status">
                <span className="visually-hidden">Loading...</span>
              </div>
            </div>
            <h4>Memuat Data Penghargaan...</h4>
            <p className="text-muted">Mohon tunggu sebentar</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container-fluid p-4 certificate-page">
      {/* Enhanced Header with Back Button */}
      <div className="page-header">
        <div className="header-content">
          <div className="header-left">
            <button 
              className="btn btn-back"
              onClick={goBackToDashboard}
              title="Kembali ke Dashboard"
            >
              <i className="fas fa-arrow-left me-2"></i>
              Dashboard
            </button>
            <div className="header-title">
              <div>
                <h1>Sertifikat Pegawai Terbaik</h1>
                <p className="header-subtitle">Unduh sertifikat penghargaan pegawai terbaik yang telah Anda raih</p>
              </div>
            </div>
          </div>
          <div className="header-stats">
            <div className="stat-card">
              <div className="stat-number">{awards.length}</div>
              <div className="stat-label">Penghargaan</div>
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

      {/* Main Content */}
      {awards.length > 0 ? (
        <div className="awards-section">
          <div className="section-header">
            <h5>
              <i className="fas fa-trophy"></i>
              Koleksi Sertifikat Penghargaan Anda
            </h5>
            <p className="section-subtitle">
              Anda telah meraih <strong className="text-warning">{awards.length}</strong> penghargaan sebagai Pegawai Terbaik
            </p>
          </div>
          
          <div className="awards-grid">
            {awards.map((award, index) => (
              <div key={award.periodId} className={`award-card ${index === 0 ? 'latest' : ''}`}>                
                <div className="award-header">
                  <div className="award-icon">
                    <i className="fas fa-medal"></i>
                  </div>
                  <div className="award-title">
                    <h6>Pegawai Terbaik</h6>
                    <strong>{award.periodName}</strong>
                  </div>
                </div>
                
                <div className="award-body">
                  <div className="award-detail">
                    <span className="label">Skor Final</span>
                    <span className="value score">{award.finalScore?.toFixed(2) || 'N/A'}</span>
                  </div>
                  
                  <div className="award-detail">
                    <span className="label">Ranking</span>
                    <span className="value ranking">#{award.ranking || 1}</span>
                  </div>
                  
                  <div className="award-detail">
                    <span className="label">Status</span>
                    <span className={`value status ${award.hasDownloaded ? 'downloaded' : 'pending'}`}>
                      <i className={`fas ${award.hasDownloaded ? 'fa-check-circle' : 'fa-clock'}`}></i>
                      {award.hasDownloaded ? 'Sudah Diunduh' : 'Belum Diunduh'}
                    </span>
                  </div>

                  {award.hasDownloaded && award.downloadInfo && (
                    <div className="download-info">
                      <i className="fas fa-info-circle me-2"></i>
                      Terakhir diunduh: {new Date(award.downloadInfo.generatedAt).toLocaleDateString('id-ID')}
                    </div>
                  )}
                </div>

                <div className="award-actions">                  
                  {/* 🔥 FIXED: Individual loading state per button */}
                  <button
                    className="btn btn-download"
                    onClick={() => handleDownload(award.periodId)}
                    disabled={isGenerating(award.periodId)}
                  >
                    {isGenerating(award.periodId) ? (
                      <>
                        <div className="spinner-border spinner-border-sm me-2"></div>
                        Generating...
                      </>
                    ) : (
                      <>
                        <i className="fas fa-download me-2"></i>
                        {award.hasDownloaded ? 'Unduh Ulang' : 'Unduh Sertifikat'}
                      </>
                    )}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="no-awards-section">
          <div className="no-awards-content">
            <div className="no-awards-icon">
              <i className="fas fa-medal"></i>
            </div>
            <h4>Belum Ada Penghargaan</h4>
            <p>Anda belum pernah meraih predikat Pegawai Terbaik. Terus tingkatkan kinerja dan dedikasi Anda!</p>
            
            <div className="tips-section">
              <h6>Tips Meraih Penghargaan:</h6>
              <div className="tips-grid">
                <div className="tip-item">
                  <i className="fas fa-star"></i>
                  <span>Tingkatkan nilai BerAKHLAK</span>
                </div>
                <div className="tip-item">
                  <i className="fas fa-clock"></i>
                  <span>Jaga kehadiran dan disiplin</span>
                </div>
                <div className="tip-item">
                  <i className="fas fa-chart-line"></i>
                  <span>Optimalkan skor CKP</span>
                </div>
                <div className="tip-item">
                  <i className="fas fa-users"></i>
                  <span>Aktif dalam tim kerja</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CertificatePage;