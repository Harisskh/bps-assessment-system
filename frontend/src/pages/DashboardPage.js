// src/pages/DashboardPage.js - FIXED VERSION WITH PROFILE PICTURE SUPPORT
import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { dashboardAPI, finalEvaluationAPI, periodAPI, evaluationAPI } from '../services/api';
import { Link } from 'react-router-dom';
import '../styles/Dashboard.scss';

// --- Komponen-komponen Dashboard ---

const StatCardColorful = ({ title, value, icon, unit = '', colorClass = 'bg-primary' }) => (
    <div className={`stat-card-colorful ${colorClass} h-100`}>
        <h6 className="stat-label">{title}</h6>
        <h2 className="stat-value">{value} <small className="fs-5 opacity-75">{unit}</small></h2>
        <i className={`fas ${icon} stat-icon`}></i>
    </div>
);

// 🔥 FIXED: BestEmployeeCard dengan profile picture support
const BestEmployeeCard = ({ employee }) => {
    const BACKEND_BASE_URL = 'http://localhost:5000';
    
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
    
    const getInitials = (name = '') => {
        if (!name) return '?';
        const parts = name.split(' ');
        if (parts.length > 1) {
            return parts[0][0] + parts[1][0];
        }
        return name.substring(0, 2);
    };
    
    if (!employee) {
        return (
            <div className="card dashboard-card mb-4">
                <div className="card-body text-center p-5">
                    <i className="fas fa-award fa-3x text-muted mb-3"></i>
                    <h6 className="text-muted">Best Employee belum ditentukan</h6>
                    <p className="small text-muted">Jalankan perhitungan final untuk menentukan pegawai terbaik periode ini.</p>
                </div>
            </div>
        );
    }
    
    // 🔥 FIX: Handle different data structures more comprehensively
    const userData = employee.user || employee;
    const scores = {
        // Handle multiple possible field names for each score type
        berakhlak: employee.berakhlakScore || employee.tokohBerakhlakScore || employee.berAKHLAKScore || employee.berakhlak || 0,
        presensi: employee.presensiScore || employee.attendanceScore || employee.presensi || 0,
        ckp: employee.ckpScore || employee.ckp || 0,
        final: employee.finalScore || employee.totalScore || employee.nilaiAkhir || 0
    };
    
    // 🔥 Profile picture URL
    const profileImageUrl = userData.profilePicture ? getImageUrl(userData.profilePicture) : null;
    
    return (
        <div className="best-employee-card card dashboard-card mb-4">
            <div className="congrats-banner">
                <i className="fas fa-star"></i> CONGRATULATIONS!
            </div>
            <div className="text-center pt-4">
                {/* 🔥 PROFILE PICTURE SECTION */}
                <div className="employee-avatar-large mx-auto mb-3">
                    {profileImageUrl ? (
                        <img 
                            src={profileImageUrl}
                            alt={userData.nama}
                            className="avatar-image-large"
                            onError={(e) => {
                                // Fallback ke initials jika gambar gagal load
                                e.target.style.display = 'none';
                                const parent = e.target.parentElement;
                                if (parent && !parent.querySelector('.avatar-placeholder-large')) {
                                    const placeholderDiv = document.createElement('div');
                                    placeholderDiv.className = 'avatar-placeholder-large';
                                    placeholderDiv.innerHTML = `<span class="avatar-initials">${getInitials(userData.nama)}</span>`;
                                    parent.appendChild(placeholderDiv);
                                }
                            }}
                        />
                    ) : (
                        <div className="avatar-placeholder-large">
                            <span className="avatar-initials">{getInitials(userData.nama)}</span>
                        </div>
                    )}
                </div>
                
                <h4 className="mt-3 mb-1 fw-bold">{userData.nama}</h4>
                <p className="text-muted small mb-3">{userData.jabatan}</p>
                <div className="mb-3">
                    <span className="h1 fw-bolder text-success me-2">{scores.final.toFixed(2)}</span>
                    <br />
                    <span className="text-muted">Nilai Akhir</span>
                </div>
                <div className="row gx-2">
                    <div className="col"><div className="bg-light p-2 rounded text-center"><small className="text-muted d-block">BerAKHLAK</small><strong className="text-primary">{scores.berakhlak.toFixed(1)}</strong></div></div>
                    <div className="col"><div className="bg-light p-2 rounded text-center"><small className="text-muted d-block">Presensi</small><strong className="text-primary">{scores.presensi.toFixed(1)}</strong></div></div>
                    <div className="col"><div className="bg-light p-2 rounded text-center"><small className="text-muted d-block">CKP</small><strong className="text-primary">{scores.ckp.toFixed(1)}</strong></div></div>
                </div>
            </div>
        </div>
    );
};

const RadialProgress = ({ percentage, color = '#2c549c' }) => {
    const radius = 60;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (percentage / 100) * circumference;
    return (
        <div className="progress-radial">
            <svg width="100%" height="100%" viewBox="0 0 150 150">
                <circle cx="75" cy="75" r={radius} fill="none" stroke="#e9ecef" strokeWidth="15" />
                <circle className="progress-circle" cx="75" cy="75" r={radius} fill="none" stroke={color} strokeWidth="15" strokeDasharray={circumference} strokeDashoffset={offset} strokeLinecap="round" transform="rotate(-90 75 75)" />
                <text x="50%" y="50%" dy=".3em" textAnchor="middle" className="progress-text" fill={color}>{percentage}%</text>
            </svg>
        </div>
    );
};

// --- Komponen Baru untuk Staff ---

const StaffActionCard = ({ periodName }) => (
    <div className="staff-action-card mb-4">
        <h4>Saatnya Memberi Penilaian!</h4>
        <p>Periode <strong>{periodName || 'saat ini'}</strong> telah dibuka. Berikan penilaian Anda untuk menentukan pegawai teladan.</p>
        <Link to="/evaluation" className="btn btn-warning btn-lg btn-action-start">
            Mulai Menilai
            <i className="fas fa-arrow-right ms-2"></i>
        </Link>
    </div>
);

const EvaluationHistoryCard = ({ evaluations = [] }) => {
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
            year: 'numeric'
        });
    };

    return (
        <div className="card dashboard-card h-100">
            <div className="card-body p-4">
                <div className="d-flex justify-content-between align-items-center mb-3">
                    <h5 className="card-title mb-0">
                        <i className="fas fa-history me-2"></i>
                        Riwayat Penilaian
                    </h5>
                    <span className="badge bg-primary">{evaluations.length}</span>
                </div>

                {evaluations.length > 0 ? (
                    <div className="evaluation-history-compact">
                        {evaluations.slice(0, 3).map((evaluation, index) => {
                            const badge = getRankingBadge(evaluation.ranking);
                            return (
                                <div key={evaluation.id || index} className="history-item-compact mb-3">
                                    <div className="d-flex align-items-center">
                                        <span className={`badge ${badge.class} me-3`}>
                                            <i className={`fas ${badge.icon} me-1`}></i>
                                            {badge.text}
                                        </span>
                                        <div className="flex-grow-1">
                                            <div className="fw-semibold">{evaluation.target?.nama || 'N/A'}</div>
                                            <small className="text-muted">{evaluation.target?.jabatan || 'N/A'}</small>
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
                    <div className="text-center py-3">
                        <i className="fas fa-inbox fa-2x text-muted mb-2"></i>
                        <p className="text-muted mb-0">Belum ada riwayat penilaian untuk periode ini.</p>
                        <div className="text-center mt-3">
                            <Link to="/evaluation-history" className="btn btn-outline-primary btn-sm">
                                <i className="fas fa-external-link-alt me-2"></i>
                                Lihat Semua Riwayat
                            </Link>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

// --- Komponen Utama Dashboard ---
const DashboardPage = () => {
    const { user } = useAuth();
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const [stats, setStats] = useState(null);
    const [bestEmployee, setBestEmployee] = useState(null);
    const [activePeriod, setActivePeriod] = useState(null);
    const [evaluationProgress, setEvaluationProgress] = useState(null);
    const [myEvaluations, setMyEvaluations] = useState([]);

    useEffect(() => {
        const loadData = async () => {
            try {
                setLoading(true);
                const periodRes = await periodAPI.getActive();
                const period = periodRes.data.data?.period || periodRes.data.period;
                const periodId = period?.id;
                
                setActivePeriod(period);

                const commonPromises = [
                    evaluationAPI.getMyEvaluations({ periodId }).catch(e => e)
                ];

                // 🔥 FIX: Load best employee for ALL users (Admin, Pimpinan, Staff)
                if (periodId) {
                    // For ALL users, try getBestEmployee first, then fallback to leaderboard
                    commonPromises.push(
                        finalEvaluationAPI.getBestEmployee(periodId).catch(e => {
                            console.warn('getBestEmployee failed, trying leaderboard:', e);
                            return finalEvaluationAPI.getLeaderboard({ periodId }).catch(e2 => {
                                console.warn('Leaderboard also failed:', e2);
                                return null;
                            });
                        })
                    );
                } else {
                    commonPromises.push(Promise.resolve(null));
                }

                if (user.role === 'ADMIN' || user.role === 'PIMPINAN') {
                    commonPromises.push(dashboardAPI.getStats({ periodId }).catch(e => e));
                    commonPromises.push(dashboardAPI.getEvaluationProgress({ periodId }).catch(e => e));
                }

                const results = await Promise.all(commonPromises);
                
                const myEvaluationsRes = results[0];
                const bestEmployeeRes = results[1];

                // Handle my evaluations
                if (!(myEvaluationsRes instanceof Error)) {
                    const evaluations = myEvaluationsRes.data.data?.evaluations || myEvaluationsRes.data.evaluations || [];
                    setMyEvaluations(evaluations);
                }

                // 🔥 FIX: Handle best employee response for different user roles
                if (bestEmployeeRes && bestEmployeeRes.data?.success) {
                    const responseData = bestEmployeeRes.data.data || bestEmployeeRes.data;
                    
                    // Check if it's getBestEmployee response
                    if (responseData.bestEmployee) {
                        setBestEmployee(responseData.bestEmployee);
                        console.log('✅ Best employee loaded:', responseData.bestEmployee.user.nama);
                        console.log('📸 Profile picture:', responseData.bestEmployee.user.profilePicture);
                    }
                    // Check if it's getLeaderboard response
                    else if (responseData.leaderboard && responseData.leaderboard.length > 0) {
                        // 🔥 FIX: Find the ACTUAL best employee from leaderboard (the one with status "Best Employee")
                        const actualBestEmployee = responseData.leaderboard.find(employee => 
                            employee.status === 'Best Employee' || 
                            employee.isBestEmployee === true ||
                            employee.rank === 1
                        );
                        
                        if (actualBestEmployee) {
                            setBestEmployee(actualBestEmployee);
                            console.log('✅ Best employee from leaderboard:', actualBestEmployee.nama || actualBestEmployee.user?.nama);
                            console.log('📸 Profile picture:', actualBestEmployee.profilePicture || actualBestEmployee.user?.profilePicture);
                        } else {
                            // Fallback: if no specific best employee found, take the first one but log warning
                            console.warn('⚠️ No specific best employee found, using top performer');
                            setBestEmployee(responseData.leaderboard[0]);
                        }
                    }
                    else {
                        console.log('⚠️ No best employee data found in response');
                        setBestEmployee(null);
                    }
                } else {
                    console.log('⚠️ No best employee found for period:', periodId);
                    setBestEmployee(null);
                }

                if (user.role === 'ADMIN' || user.role === 'PIMPINAN') {
                    const statsRes = results[2];
                    const progressRes = results[3];
                    
                    if (!(statsRes instanceof Error)) {
                        const statsData = statsRes.data.data || statsRes.data;
                        setStats(statsData);
                    }
                    
                    if (!(progressRes instanceof Error)) {
                        const progressData = progressRes.data.data || progressRes.data;
                        setEvaluationProgress(progressData);
                    }
                }

            } catch (err) {
                setError('Gagal memuat data dashboard.');
                console.error("Dashboard load error:", err);
            } finally {
                setLoading(false);
            }
        };

        loadData();
    }, [user.role]);
    
    const renderAdminDashboard = () => (
        <div className="row g-4">
            <div className="col-lg-5 d-flex flex-column">
                <BestEmployeeCard employee={bestEmployee} />
            </div>
            <div className="col-lg-7 d-flex flex-column">
                <div className="row g-4 flex-grow-1">
                    <div className="col-md-5">
                        <div className="dashboard-card progress-card">
                            <div className="card-body d-flex flex-column align-items-center justify-content-center p-4">
                                <h5 className="card-title mb-4">Progress Evaluasi</h5>
                                <RadialProgress percentage={evaluationProgress ? Math.round((evaluationProgress.summary.completed / evaluationProgress.summary.total) * 100) : 0} />
                                <div className="w-100 mt-4 text-center">
                                    <div className="d-flex justify-content-around">
                                        <div><p className="mb-0 h5 fw-bold text-success">{evaluationProgress?.summary?.completed || 0}</p><small className="text-muted">Sudah Menilai</small></div>
                                        <div><p className="mb-0 h5 fw-bold text-danger">{(evaluationProgress?.summary?.total - evaluationProgress?.summary?.completed) || 0}</p><small className="text-muted">Belum Menilai</small></div>
                                    </div>
                                    <Link to="/monitoring" className="btn btn-outline-primary btn-sm mt-4 w-100">Lihat Detail</Link>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="col-md-7">
                        <div className="dashboard-card quick-actions-card">
                            <div className="card-body p-4">
                                <h5 className="card-title mb-4"><i className="fas fa-rocket me-2"></i>Aksi Cepat</h5>
                                <div className="d-grid gap-3">
                                    <Link to="/attendance-input" className="btn btn-light btn-action text-success border"><i className="fas fa-calendar-check"></i><span>Input Presensi</span></Link>
                                    <Link to="/ckp-input" className="btn btn-light btn-action text-warning border"><i className="fas fa-chart-line"></i><span>Input CKP</span></Link>
                                    <Link to="/period-management" className="btn btn-light btn-action text-danger border"><i className="fas fa-calendar-alt"></i><span>Kelola Periode</span></Link>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
    
    const renderStaffDashboard = () => (
        <div className="row g-4">
            <div className="col-lg-7">
                <StaffActionCard periodName={activePeriod?.namaPeriode} />
                <div className="mt-4 d-none d-lg-block">
                    <EvaluationHistoryCard evaluations={myEvaluations} />
                </div>
            </div>
            <div className="col-lg-5">
                {/* 🔥 FIX: Always show BestEmployeeCard for staff too */}
                <BestEmployeeCard employee={bestEmployee} />
            </div>
            <div className="col-12 d-lg-none">
                <EvaluationHistoryCard evaluations={myEvaluations} />
            </div>
        </div>
    );
    
    return (
        <div className="container-fluid">
            {loading ? (
                <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '80vh' }}>
                    <div className="spinner-border text-primary" role="status" style={{ width: '3rem', height: '3rem' }}></div>
                </div>
            ) : (
                <>
                    <div className="welcome-header">
                        <div className="d-flex justify-content-between align-items-center">
                            <div>
                                <h1 className="welcome-title">Dashboard</h1>
                                <p className="welcome-subtitle mb-0">Selamat datang, <span className="welcome-user-badge">{user.nama}</span></p>
                            </div>
                            <div className="text-end">
                                <h6 className="mb-1 opacity-75">Periode Aktif</h6>
                                <span className="badge period-badge fs-6">{activePeriod?.namaPeriode || 'N/A'}</span>
                            </div>
                        </div>
                    </div>

                    {error && <div className="alert alert-danger">{error}</div>}

                    {(user.role === 'ADMIN' || user.role === 'PIMPINAN') && (
                        <div className="row g-4 mb-4">
                            <div className="col-lg-3 col-md-6"><StatCardColorful title="Total Pegawai" value={stats?.overview?.totalUsers || 0} icon="fa-users" colorClass="bg-primary" /></div>
                            <div className="col-lg-3 col-md-6"><StatCardColorful title="Sudah Menilai" value={evaluationProgress?.summary?.completed || 0} icon="fa-user-check" unit={`/ ${evaluationProgress?.summary?.total || 0}`} colorClass="bg-success" /></div>
                            <div className="col-lg-3 col-md-6"><StatCardColorful title="Rata-rata Presensi" value={stats?.scores?.attendance?.average?.toFixed(1) || '0.0'} icon="fa-calendar-check" colorClass="bg-warning text-dark" /></div>
                            <div className="col-lg-3 col-md-6"><StatCardColorful title="Rata-rata CKP" value={stats?.scores?.ckp?.average?.toFixed(1) || '0.0'} icon="fa-chart-line" colorClass="bg-info" /></div>
                        </div>
                    )}

                    {user.role === 'STAFF' || user.role === 'PIMPINAN' ? renderStaffDashboard() : renderAdminDashboard()}
                </>
            )}
        </div>
    );
};

export default DashboardPage;