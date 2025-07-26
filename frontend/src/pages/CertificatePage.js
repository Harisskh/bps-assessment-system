// src/pages/CertificatePage.js - FIXED PROFILE PICTURE & ENHANCED SCORE DISPLAY
import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { userCertificateAPI, getImageUrl } from '../services/api';
import '../styles/CertificatePage.scss';

const CertificatePage = () => {
  const { user } = useAuth();
  const [certificates, setCertificates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [downloadingCert, setDownloadingCert] = useState(null);

  useEffect(() => {
    fetchMyCertificates();
  }, []);

  const fetchMyCertificates = async () => {
    setLoading(true);
    try {
      console.log('🔄 Fetching user certificates...');
      // 🔥 UPDATED: Use detailed endpoint to get scores
      const response = await userCertificateAPI.getMyCertificatesDetailed();
      
      if (response.data.success) {
        console.log('✅ Certificates loaded:', response.data.data.certificates.length);
        setCertificates(response.data.data.certificates || []);
      } else {
        setError('Gagal memuat sertifikat: ' + response.data.error);
      }
    } catch (error) {
      console.error('❌ Error fetching certificates:', error);
      // 🔥 FALLBACK: Try regular endpoint if detailed fails
      try {
        const fallbackResponse = await userCertificateAPI.getMyCertificates();
        if (fallbackResponse.data.success) {
          setCertificates(fallbackResponse.data.data.certificates || []);
        } else {
          setError('Gagal memuat sertifikat: ' + error.message);
        }
      } catch (fallbackError) {
        setError('Terjadi kesalahan: ' + (error.response?.data?.message || error.message));
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadCertificate = async (certificateId, periodName) => {
    setDownloadingCert(certificateId);
    try {
      console.log('📥 Downloading certificate:', certificateId);
      const response = await userCertificateAPI.downloadMyCertificate(certificateId);
      
      // Create blob and download
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      
      // Use proper filename format from backend
      link.download = `Sertifikat_Best_Employee_${periodName}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
    } catch (error) {
      console.error('❌ Error downloading certificate:', error);
      setError('Gagal mengunduh sertifikat: ' + (error.response?.data?.message || error.message));
    } finally {
      setDownloadingCert(null);
    }
  };

  const getMonthName = (monthNumber) => {
    const months = [
      'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
      'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
    ];
    return months[monthNumber - 1] || 'Januari';
  };

  const clearError = () => {
    setError('');
  };

  // 🔥 NEW: Get user initials for profile picture
  const getUserInitials = (name) => {
    if (!name) return 'BPS';
    return name
      .split(' ')
      .map(word => word.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  // 🔥 NEW: Format score for display
  const formatScore = (score) => {
    if (score === null || score === undefined) return 'N/A';
    return typeof score === 'number' ? score.toFixed(2) : score;
  };

  const getProfilePictureUrl = () => {
    if (user?.profilePicture) {
      const imageUrl = getImageUrl(user.profilePicture);
      return imageUrl ? `${imageUrl}?_t=${Date.now()}` : null;
    }
    return null;
  };

  if (loading) {
    return (
      <div className="container-fluid p-4 d-flex justify-content-center align-items-center" style={{ minHeight: '80vh' }}>
        <div className="loading-container text-center">
          <div className="loading-content">
            <div className="loading-spinner mb-3">
              <div className="spinner-border text-primary" role="status">
                <span className="visually-hidden">Loading...</span>
              </div>
            </div>
            <h4>Memuat Koleksi Sertifikat Anda...</h4>
            <p>Mohon tunggu sebentar</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container-fluid p-4 certificate-page">
      {/* 🔥 UPDATED: Header yang diperkecil */}
      <div className="page-header">
        <div className="header-content">
          <div className="header-title">
            <i className="fas fa-award header-icon"></i>
            <div>
              <h1>
                <span className="award-emoji">🏆</span>
                Koleksi Sertifikat Pegawai Terbaik
              </h1>
              <p className="header-subtitle">
                Dokumentasi pencapaian Anda sebagai Best Employee of the Month
              </p>
            </div>
          </div>
          <div className="header-stats">
            <div className="stat-card">
              <div className="stat-number">{certificates.length}</div>
              <div className="stat-label">Sertifikat Diraih</div>
            </div>
          </div>
        </div>
      </div>

      {/* Alert Messages */}
      {error && (
        <div className="alert alert-danger alert-dismissible fade show" role="alert">
          <i className="fas fa-exclamation-triangle me-2"></i>
          {error}
          <button type="button" className="btn-close" onClick={clearError}></button>
        </div>
      )}

      {/* 🔥 UPDATED: Certificates Grid dengan background kuning keemasan */}
      <div className="certificates-grid">
        {certificates.map((cert) => (
          <div key={cert.id} className="certificate-card">
            <div className="certificate-ribbon">
              <span>🏆 Best Employee</span>
            </div>
            
            <div className="certificate-content">
              {/* 🔥 NEW: Star dengan foto profile */}
              <div className="certificate-icon">
                <div className="profile-overlay">
                  {getProfilePictureUrl() ? (
                    <img 
                      src={getProfilePictureUrl()} 
                      alt={user.nama}
                      className="profile-picture"
                      onError={(e) => {
                        e.target.style.display = 'none';
                        const parent = e.target.parentElement;
                        if (parent && !parent.querySelector('.profile-initials')) {
                          const initialsSpan = document.createElement('span');
                          initialsSpan.className = 'profile-initials';
                          initialsSpan.textContent = getUserInitials(user.nama);
                          parent.appendChild(initialsSpan);
                        }
                      }}
                    />
                  ) : (
                    <span className="profile-initials">{getUserInitials(user.nama)}</span>
                  )}
                </div>
              </div>
              
              <div className="certificate-info">
                <h5 className="period-title">Pegawai Terbaik Periode {cert.periodName}</h5>
                <p className="period-details">
                  <i className="fas fa-calendar me-2"></i>
                  {getMonthName(cert.bulan)} {cert.tahun}
                </p>
                
                {cert.certificateNumber && (
                  <p className="cert-number">
                    Nomor Sertifikat: {cert.certificateNumber}
                  </p>
                )}
                
                <p className="upload-date">
                  <i className="fas fa-clock me-2"></i>
                  Diterbitkan: {new Date(cert.uploadedAt).toLocaleDateString('id-ID', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric'
                  })}
                </p>
              </div>
            </div>
            
            <div className="certificate-actions">
              <button
                className="btn btn-primary btn-download"
                onClick={() => handleDownloadCertificate(cert.id, cert.periodName)}
                disabled={downloadingCert === cert.id}
              >
                {downloadingCert === cert.id ? (
                  <>
                    <div className="spinner-border spinner-border-sm me-2"></div>
                    Mengunduh...
                  </>
                ) : (
                  <>
                    <i className="fas fa-download me-2"></i>
                    Unduh Sertifikat
                  </>
                )}
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* 🔥 ENHANCED: Empty State dengan konten yang lebih menarik */}
      {certificates.length === 0 && (
        <div className="empty-state">
          <div className="empty-icon">
            <i className="fas fa-certificate fa-4x"></i>
          </div>
          <h3>Anda Belum Memiliki Koleksi Sertifikat</h3>
          <p className="empty-description">
            Anda belum memiliki sertifikat prestasi sebagai Best Employee. 
            Wujudkan dedikasi terbaik Anda dan raih kesempatan untuk menjadi Best Employee bulan depan!
          </p>
          <div className="empty-tips">
            <h6>💡 Strategi Meraih Prestasi Best Employee:</h6>
            <ul>
              <li><strong>Konsistensi Penilaian:</strong> Berikan penilaian BerAKHLAK secara rutin kepada rekan kerja</li>
              <li><strong>Kedisiplinan Kerja:</strong> Jaga kehadiran, ketepatan waktu, dan komitmen kerja</li>
              <li><strong>Capaian Kinerja:</strong> Tingkatkan dan pertahankan hasil evaluasi CKP yang optimal</li>
              <li><strong>Nilai-nilai BPS:</strong> Terapkan prinsip BerAKHLAK dalam setiap aspek pekerjaan</li>
              <li><strong>Inovasi & Kolaborasi:</strong> Berperan aktif dalam tim dan berkontribusi positif</li>
            </ul>
          </div>
        </div>
      )}

      {/* 🔥 UPDATED: Achievement Timeline yang diperkecil dengan highlight dan score details */}
      {certificates.length > 0 && (
        <div className="achievement-timeline mt-5">
          <div className="card">
            <div className="card-header">
              <h5 className="mb-0">
                <i className="fas fa-history me-2"></i>
                Perjalanan Prestasi Anda
              </h5>
            </div>
            <div className="card-body">
              <div className="timeline">
                {certificates
                  .sort((a, b) => new Date(b.uploadedAt) - new Date(a.uploadedAt))
                  .map((cert, index) => (
                  <div key={cert.id} className="timeline-item">
                    <div className="timeline-marker">
                      <i className="fas fa-award"></i>
                    </div>
                    <div className="timeline-content">
                      <div className="timeline-date">
                        {getMonthName(cert.bulan)} {cert.tahun}
                      </div>
                      <h6 className="timeline-title">🏆 Prestasi Best Employee</h6>
                      <div className="timeline-description">
                        Anda berhasil meraih penghargaan tertinggi sebagai Best Employee pada periode {cert.periodName}.
                        
                        {/* 🔥 NEW: Achievement highlight */}
                        <div className="achievement-highlight">
                          Anda berhasil meraih penghargaan tertinggi sebagai Best Employee pada periode {cert.periodName}, 
                          yang menunjukkan dedikasi dan kinerja luar biasa dalam menjalankan tugas.
                        </div>

                        {/* 🔥 NEW: Score details */}
                        {(cert.berakhlakScore || cert.presensiScore || cert.ckpScore || cert.totalVoters) && (
                          <div className="score-details">
                            <div className="score-header">
                              📊 Detail Pencapaian Skor
                            </div>
                            <div className="score-grid">
                              {cert.totalVoters > 0 && (
                                <div className="score-item voters">
                                  <div className="score-label">Jumlah Pemilih</div>
                                  <div className="score-value">{cert.totalVoters}</div>
                                </div>
                              )}
                              {cert.berakhlakScore && (
                                <div className="score-item berakhlak">
                                  <div className="score-label">Skor BerAKHLAK</div>
                                  <div className="score-value">{formatScore(cert.berakhlakScore)}</div>
                                </div>
                              )}
                              {cert.presensiScore && (
                                <div className="score-item presensi">
                                  <div className="score-label">Skor Presensi</div>
                                  <div className="score-value">{formatScore(cert.presensiScore)}%</div>
                                </div>
                              )}
                              {cert.ckpScore && (
                                <div className="score-item ckp">
                                  <div className="score-label">Skor CKP</div>
                                  <div className="score-value">{formatScore(cert.ckpScore)}%</div>
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                      <small className="text-muted">
                        <i className="fas fa-calendar me-1"></i>
                        Sertifikat resmi diterbitkan: {new Date(cert.uploadedAt).toLocaleDateString('id-ID', {
                          day: 'numeric',
                          month: 'long',
                          year: 'numeric'
                        })}
                      </small>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 🔥 ENHANCED: Congratulations Message untuk multiple certificates */}
      {certificates.length > 1 && (
        <div className="congratulations-section mt-4">
          <div className="card congratulations-card">
            <div className="card-body text-center">
              <div className="congratulations-icon">
                <i className="fas fa-trophy"></i>
              </div>
              <h4>Prestasi Luar Biasa! 🎉</h4>
              <p className="lead">
                Anda telah berhasil meraih <strong>{certificates.length} sertifikat</strong> Best Employee! 
                Pencapaian yang membanggakan dan menginspirasi.
              </p>
              <p className="text-muted">
                Konsistensi dan dedikasi Anda dalam memberikan kinerja terbaik telah membuahkan hasil yang gemilang. 
                Terus pertahankan semangat dan jadilah teladan bagi seluruh tim BPS Kabupaten Pringsewu.
              </p>
              
              {certificates.length >= 3 && (
                <div className="achievement-badge mt-3">
                  <span className="badge bg-warning text-dark fs-6 px-3 py-2">
                    ⭐ Hall of Fame Best Employee ⭐
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 🔥 NEW: Motivational Quote untuk single certificate */}
      {certificates.length === 1 && (
        <div className="motivation-section mt-4">
          <div className="card border-0" style={{ 
            background: 'linear-gradient(135deg, rgba(44, 84, 156, 0.05), rgba(44, 84, 156, 0.02))',
            borderRadius: '1.5rem'
          }}>
            <div className="card-body text-center py-4">
              <div className="mb-3">
                <i className="fas fa-quote-left fa-2x text-primary opacity-50"></i>
              </div>
              <h5 className="text-primary fw-bold mb-3">
                "Prestasi adalah hasil dari kerja keras, dedikasi, dan komitmen yang konsisten"
              </h5>
              <p className="text-muted mb-0">
                Sertifikat pertama Anda adalah langkah awal menuju pencapaian yang lebih besar. 
                Pertahankan kinerja terbaik dan raih prestasi selanjutnya!
              </p>
            </div>
          </div>
        </div>
      )}

      {/* 🔥 NEW: Call to Action untuk user tanpa sertifikat */}
      {certificates.length === 0 && (
        <div className="cta-section mt-4">
          <div className="card" style={{
            background: 'linear-gradient(135deg, rgba(25, 135, 84, 0.1), rgba(25, 135, 84, 0.05))',
            border: '2px solid rgba(25, 135, 84, 0.2)',
            borderRadius: '1.5rem'
          }}>
            <div className="card-body text-center py-4">
              <h5 className="text-success fw-bold mb-3">
                🎯 Saatnya Meraih Prestasi Pertama Anda!
              </h5>
              <p className="text-muted mb-4">
                Setiap pegawai BPS memiliki potensi untuk menjadi yang terbaik. 
                Mulai perjalanan prestasi Anda dengan menerapkan nilai-nilai BerAKHLAK dalam pekerjaan sehari-hari.
              </p>
              <div className="row text-start">
                <div className="col-md-6">
                  <h6 className="text-success">🏃‍♀️ Langkah Praktis:</h6>
                  <ul className="list-unstyled small text-muted">
                    <li> Aktif dalam penilaian BerAKHLAK</li>
                    <li> Jaga konsistensi kehadiran</li>
                    <li> Tingkatkan capaian CKP</li>
                  </ul>
                </div>
                <div className="col-md-6">
                  <h6 className="text-success">🎨 Nilai Tambah:</h6>
                  <ul className="list-unstyled small text-muted">
                    <li> Proaktif dalam berbagi pengetahuan</li>
                    <li> Kolaboratif dengan tim</li>
                    <li> Inovatif dalam menyelesaikan tugas</li>
                  </ul>
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