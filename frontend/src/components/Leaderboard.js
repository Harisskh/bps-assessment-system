// src/components/Leaderboard.js 
import React, { useState, useEffect } from 'react';
import { finalEvaluationAPI } from '../services/api';

const Leaderboard = ({ periodeId, showTitle = true, maxItems = 10 }) => {
  const [leaderboardData, setLeaderboardData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const BACKEND_BASE_URL = 'http://localhost:5000';

  useEffect(() => {
    fetchLeaderboard();
  }, [periodeId]);

  const fetchLeaderboard = async () => {
    try {
      setLoading(true);
      setError('');
      
      const params = periodeId ? { periodeId } : {};
      const response = await finalEvaluationAPI.getLeaderboard(params);
      
      if (response.data.success) {
        const data = response.data.data.leaderboard || [];
        setLeaderboardData(data.slice(0, maxItems));
      } else {
        throw new Error(response.data.message || 'Failed to fetch leaderboard');
      }
    } catch (error) {
      console.error('Error fetching leaderboard:', error);
      setError('Gagal memuat data leaderboard');
      setLeaderboardData([]);
    } finally {
      setLoading(false);
    }
  };

  // 🔥 Helper function untuk construct image URL
  const getImageUrl = (imagePath) => {
    if (!imagePath || imagePath === 'undefined' || imagePath === 'null') {
      return null;
    }
    
    let finalUrl;
    if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) {
      finalUrl = imagePath;
    } else {
      const cleanPath = imagePath.startsWith('/') ? imagePath : '/' + imagePath;
      finalUrl = BACKEND_BASE_URL + cleanPath;
    }
    
    // Add cache busting
    finalUrl += (finalUrl.includes('?') ? '&' : '?') + '_t=' + Date.now();
    
    return finalUrl;
  };

  const getInitials = (name) => {
    if (!name) return '??';
    const parts = name.split(' ');
    if (parts.length > 1) {
      return parts[0][0] + parts[1][0];
    }
    return name.substring(0, 2);
  };

  const getRankIcon = (rank) => {
    switch (rank) {
      case 1:
        return '👑';
      case 2:
        return '🥈';
      case 3:
        return '🥉';
      default:
        return `#${rank}`;
    }
  };

  const getRankClass = (rank) => {
    switch (rank) {
      case 1:
        return 'rank-1';
      case 2:
        return 'rank-2';
      case 3:
        return 'rank-3';
      default:
        return 'rank-other';
    }
  };

  if (loading) {
    return (
      <div className="leaderboard-container">
        <div className="d-flex justify-content-center align-items-center" style={{ height: '200px' }}>
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="leaderboard-container">
        <div className="alert alert-danger">
          <i className="fas fa-exclamation-triangle me-2"></i>
          {error}
        </div>
      </div>
    );
  }

  return (
    <div className="leaderboard-container">
      <div className="card leaderboard-card">
        {showTitle && (
          <div className="card-header">
            <div className="d-flex align-items-center">
              <i className="fas fa-trophy me-2"></i>
              <h5 className="card-title mb-0">Peringkat Pegawai Terbaik</h5>
            </div>
          </div>
        )}
        <div className="card-body">
          {leaderboardData.length === 0 ? (
            <div className="text-center py-4">
              <i className="fas fa-trophy mb-3" style={{ fontSize: '3rem', color: '#dee2e6' }}></i>
              <p className="text-muted">Belum ada data peringkat untuk periode ini</p>
            </div>
          ) : (
            <div className="leaderboard-list">
              {leaderboardData.map((employee, index) => {
                const rank = index + 1;
                const profileImageUrl = employee.profilePicture ? getImageUrl(employee.profilePicture) : null;
                
                return (
                  <div key={employee.id || index} className={`leaderboard-item ${getRankClass(rank)}`}>
                    {/* Rank Badge */}
                    <div className="rank-badge">
                      <span className="rank-icon">{getRankIcon(rank)}</span>
                    </div>

                    {/* 🔥 Profile Photo */}
                    <div className="employee-avatar">
                      {profileImageUrl ? (
                        <img 
                          src={profileImageUrl}
                          alt={employee.nama}
                          className="avatar-image"
                          onError={(e) => {
                            // Fallback ke initials jika gambar gagal load
                            e.target.style.display = 'none';
                            const parent = e.target.parentElement;
                            if (parent && !parent.querySelector('.avatar-placeholder')) {
                              const placeholderDiv = document.createElement('div');
                              placeholderDiv.className = 'avatar-placeholder';
                              placeholderDiv.innerHTML = `<span class="avatar-initials">${getInitials(employee.nama)}</span>`;
                              parent.appendChild(placeholderDiv);
                            }
                          }}
                        />
                      ) : (
                        <div className="avatar-placeholder">
                          <span className="avatar-initials">{getInitials(employee.nama)}</span>
                        </div>
                      )}
                    </div>

                    {/* Employee Info */}
                    <div className="employee-info">
                      <h6 className="employee-name">{employee.nama}</h6>
                      <p className="employee-details">
                        <span className="nip">NIP: {employee.nip}</span>
                        <span className="jabatan">{employee.jabatan}</span>
                      </p>
                    </div>

                    {/* Score Section */}
                    <div className="score-section">
                      <div className="final-score">
                        <span className="score-value">{employee.nilaiAkhir?.toFixed(2) || '0.00'}</span>
                        <span className="score-label">Nilai Akhir</span>
                      </div>
                      
                      <div className="score-breakdown">
                        <div className="score-item">
                          <span className="score-type">BerAKHLAK</span>
                          <span className="score-value-small">{employee.nilaiBerakhlak?.toFixed(1) || '0.0'}</span>
                        </div>
                        <div className="score-item">
                          <span className="score-type">Presensi</span>
                          <span className="score-value-small">{employee.nilaiPresensi?.toFixed(1) || '0.0'}</span>
                        </div>
                        <div className="score-item">
                          <span className="score-type">CKP</span>
                          <span className="score-value-small">{employee.nilaiCkp?.toFixed(1) || '0.0'}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Leaderboard;