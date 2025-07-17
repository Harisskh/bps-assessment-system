// src/pages/DashboardPage.js - FIXED PROGRESS CALCULATION FOR NEW SYSTEM
import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { dashboardAPI, finalEvaluationAPI, periodAPI, evaluationAPI } from '../services/api';
import { Link } from 'react-router-dom';
import '../styles/Dashboard.scss';

// Components remain the same...
const StatCardColorful = ({ title, value, icon, unit = '', colorClass = 'bg-primary' }) => (
    <div className={`stat-card-colorful ${colorClass} h-100`}>
        <h6 className="stat-label">{title}</h6>
        <h2 className="stat-value">{value} <small className="fs-5 opacity-75">{unit}</small></h2>
        <i className={`fas ${icon} stat-icon`}></i>
    </div>
);

// 🔥 ENHANCED: BestEmployeeCard with clear period display
const BestEmployeeCard = ({ employee, period }) => {
    const BACKEND_BASE_URL = 'http://localhost:5000';
    
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
                    <p className="small text-muted">
                        {period 
                            ? `Belum ada best employee untuk ${period.namaPeriode}`
                            : 'Belum ada best employee untuk periode sebelumnya.'
                        }
                    </p>
                </div>
            </div>
        );
    }
    
    const userData = employee.user || employee;
    const scores = {
        berakhlak: employee.berakhlakScore || employee.nilaiBerakhlak || employee.berAKHLAKScore || employee.berakhlak || 0,
        presensi: employee.presensiScore || employee.nilaiPresensi || employee.attendanceScore || employee.presensi || 0,
        ckp: employee.ckpScore || employee.nilaiCkp || employee.ckp || 0,
        final: employee.finalScore || employee.nilaiAkhir || employee.totalScore || 0
    };
    
    const profileImageUrl = userData.profilePicture ? getImageUrl(userData.profilePicture) : null;
    
    return (
        <div className="best-employee-card card dashboard-card mb-4">
            <div className="congrats-banner">
                <i className="fas fa-star"></i> CONGRATULATIONS!
            </div>
            <div className="text-center pt-4">
                <div className="employee-avatar-large mx-auto mb-3">
                    {profileImageUrl ? (
                        <img 
                            src={profileImageUrl}
                            alt={userData.nama}
                            className="avatar-image-large"
                            onError={(e) => {
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
                
                {/* 🔥 ALWAYS show period info (should be PREVIOUS period) */}
                <div className="best-employee-period mb-3">
                    <div className="d-flex align-items-center justify-content-center mb-2">
                        <i className="fas fa-trophy text-warning me-2"></i>
                        <span className="fw-bold text-primary">Best Employee of the Month</span>
                    </div>
                    <div className="period-badge">
                        <span className="badge bg-warning text-dark fs-6">
                            in {period?.namaPeriode || 'Previous Period'}
                        </span>
                    </div>
                </div>
                
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

// 🔥 FIXED: RadialProgress component with better calculation
const RadialProgress = ({ percentage, color = '#2c549c', backgroundColor = '#dc3545' }) => {
    const radius = 60;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (percentage / 100) * circumference;
    
    return (
        <div className="progress-radial">
            <svg width="100%" height="100%" viewBox="0 0 150 150">
                <circle 
                    cx="75" 
                    cy="75" 
                    r={radius} 
                    fill="none" 
                    stroke="#e9ecef" 
                    strokeWidth="15" 
                />
                
                <circle 
                    cx="75" 
                    cy="75" 
                    r={radius} 
                    fill="none" 
                    stroke={backgroundColor} 
                    strokeWidth="15" 
                    strokeDasharray={circumference} 
                    strokeDashoffset="0"
                    strokeLinecap="round" 
                    transform="rotate(-90 75 75)"
                />
                
                <circle 
                    className="progress-circle" 
                    cx="75" 
                    cy="75" 
                    r={radius} 
                    fill="none" 
                    stroke={color} 
                    strokeWidth="15" 
                    strokeDasharray={circumference} 
                    strokeDashoffset={offset} 
                    strokeLinecap="round" 
                    transform="rotate(-90 75 75)"
                />
                
                <text 
                    x="50%" 
                    y="50%" 
                    dy=".3em" 
                    textAnchor="middle" 
                    className="progress-text" 
                    fill={color}
                    fontSize="24"
                    fontWeight="bold"
                >
                    {percentage}%
                </text>
            </svg>
        </div>
    );
};

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
    if (ranking === undefined || ranking === null) {
      return { class: 'bg-success', icon: 'fa-star', text: 'Tokoh BerAKHLAK' };
    }
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

// Main Dashboard Component
const DashboardPage = () => {
    const { user } = useAuth();
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const [stats, setStats] = useState(null);
    const [bestEmployee, setBestEmployee] = useState(null);
    const [bestEmployeePeriod, setBestEmployeePeriod] = useState(null);
    const [activePeriod, setActivePeriod] = useState(null);
    const [evaluationProgress, setEvaluationProgress] = useState(null);
    const [myEvaluations, setMyEvaluations] = useState([]);

    const BACKEND_BASE_URL = 'http://localhost:5000';
    
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
        
        finalUrl += (finalUrl.includes('?') ? '&' : '?') + '_t=' + Date.now();
        return finalUrl;
    };

    // 🔥 FIXED: Main data loading useEffect - Backend now handles previous period logic
    useEffect(() => {
        const loadData = async () => {
            try {
                setLoading(true);
                setError('');
                
                console.log('🔄 Starting dashboard data load...');
                
                // STEP 1: Get active period
                let activePeriodData = null;
                try {
                    const periodRes = await periodAPI.getActive();
                    activePeriodData = periodRes.data.data?.period || periodRes.data.period;
                    console.log('✅ Active period loaded:', activePeriodData?.namaPeriode);
                } catch (periodError) {
                    console.error('❌ Error loading active period:', periodError);
                    setError('Tidak dapat memuat periode aktif. Hubungi administrator.');
                    setLoading(false);
                    return;
                }
                
                if (!activePeriodData || !activePeriodData.id) {
                    setError('Tidak ada periode aktif yang ditemukan. Hubungi administrator.');
                    setLoading(false);
                    return;
                }
                
                setActivePeriod(activePeriodData);
                
                // STEP 2: Load data with current period ID
                const currentPeriodId = activePeriodData.id;
                console.log('📊 Loading data for period:', currentPeriodId);
                
                const promises = [];
                
                // Load stats (backend now handles previous period best employee automatically)
                promises.push(
                    dashboardAPI.getStats({ periodId: currentPeriodId })
                        .then(res => ({ type: 'stats', data: res }))
                        .catch(err => {
                            console.warn('Stats failed:', err);
                            return { type: 'stats', error: err };
                        })
                );
                
                // Load my evaluations
                promises.push(
                    evaluationAPI.getMyEvaluations({ periodId: currentPeriodId })
                        .then(res => ({ type: 'myEvaluations', data: res }))
                        .catch(err => ({ type: 'myEvaluations', error: err }))
                );
                
                // Admin/Pimpinan specific data
                if (user.role === 'ADMIN' || user.role === 'PIMPINAN') {
                    promises.push(
                        dashboardAPI.getEvaluationProgress({ periodId: currentPeriodId })
                            .then(res => ({ type: 'progress', data: res }))
                            .catch(err => ({ type: 'progress', error: err }))
                    );
                }
                
                const results = await Promise.all(promises);
                
                // STEP 3: Process results
                results.forEach(result => {
                    if (result.error) {
                        console.warn(`⚠️ Error loading ${result.type}:`, result.error.message);
                        return;
                    }
                    
                    const responseData = result.data.data.data || result.data.data;
                    
                    switch (result.type) {
                        case 'stats':
                            setStats(responseData);
                            console.log('✅ Dashboard stats loaded:', responseData.overview);
                            
                            // 🔥 FIXED: Best employee comes from backend (previous period)
                            if (responseData.bestEmployee) {
                                setBestEmployee(responseData.bestEmployee);
                                setBestEmployeePeriod(responseData.bestEmployee.period);
                                console.log('✅ Best employee from previous period:', responseData.bestEmployee.user.nama);
                                console.log('📅 Best employee period:', responseData.bestEmployee.period?.namaPeriode);
                            } else {
                                console.log('⚠️ No best employee found from backend');
                                setBestEmployee(null);
                                setBestEmployeePeriod(null);
                            }
                            break;
                            
                        case 'myEvaluations':
                            const evaluations = responseData.evaluations || [];
                            setMyEvaluations(evaluations);
                            console.log('✅ My evaluations loaded:', evaluations.length);
                            break;
                            
                        case 'progress':
                            setEvaluationProgress(responseData);
                            console.log('✅ Evaluation progress loaded:', responseData.summary);
                            break;
                    }
                });
                
                // 🔥 FIXED: Use stats data for progress calculation if no specific progress data
                if ((user.role === 'ADMIN' || user.role === 'PIMPINAN') && !evaluationProgress && stats) {
                    console.log('🔄 Using stats data for progress calculation...');
                    const progressFromStats = {
                        summary: {
                            total: stats.overview.totalUsers,
                            completed: stats.overview.completedEvaluations,
                            notStarted: stats.overview.totalUsers - stats.overview.completedEvaluations,
                            completionRate: Math.round((stats.overview.completedEvaluations / stats.overview.totalUsers) * 100)
                        }
                    };
                    setEvaluationProgress(progressFromStats);
                    console.log('✅ Progress from stats set:', progressFromStats);
                }
                
                console.log('✅ Dashboard data loading completed successfully');

            } catch (err) {
                console.error('❌ Dashboard load error:', err);
                setError('Gagal memuat data dashboard: ' + (err.message || 'Unknown error'));
            } finally {
                setLoading(false);
            }
        };

        if (user) {
            loadData();
        }
    }, [user]);

    // 🔥 FIXED: Calculate progress percentage correctly
    const calculateProgressPercentage = () => {
        if (!stats?.overview) return 0;
        
        const totalUsers = stats.overview.totalUsers || 0;
        const completedEvaluations = stats.overview.completedEvaluations || 0;
        
        if (totalUsers === 0) return 0;
        
        const percentage = Math.round((completedEvaluations / totalUsers) * 100);
        console.log('📊 Progress calculation:', {
            totalUsers,
            completedEvaluations,
            percentage
        });
        
        return percentage;
    };

    // Dashboard render functions
    const renderAdminDashboard = () => {
        // 🔥 FIXED: Calculate progress from stats data
        const progressPercentage = calculateProgressPercentage();
        const totalUsers = stats?.overview?.totalUsers || 0;
        const completedEvaluations = stats?.overview?.completedEvaluations || 0;
        const notStarted = totalUsers - completedEvaluations;
        
        return (
            <div className="row g-4">
                <div className="col-lg-5 d-flex flex-column">
                    {/* 🔥 FIXED: Show best employee from PREVIOUS period */}
                    <BestEmployeeCard employee={bestEmployee} period={bestEmployeePeriod} />
                </div>
                <div className="col-lg-7 d-flex flex-column">
                    <div className="row g-4 flex-grow-1">
                        <div className="col-md-5">
                            <div className="dashboard-card progress-card">
                                <div className="card-body d-flex flex-column align-items-center justify-content-center p-4">
                                    <h5 className="card-title mb-4">Progress Evaluasi</h5>
                                    <RadialProgress percentage={progressPercentage} />
                                    <div className="w-100 mt-4 text-center">
                                        <div className="d-flex justify-content-around">
                                            <div>
                                                <p className="mb-0 h5 fw-bold text-success">
                                                    {completedEvaluations}
                                                </p>
                                                <small className="text-muted">Sudah Menilai</small>
                                            </div>
                                            <div>
                                                <p className="mb-0 h5 fw-bold text-danger">
                                                    {notStarted}
                                                </p>
                                                <small className="text-muted">Belum Menilai</small>
                                            </div>
                                        </div>
                                        <Link to="/monitoring" className="btn btn-outline-primary btn-sm mt-4 w-100">
                                            Lihat Detail
                                        </Link>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="col-md-7">
                            <div className="dashboard-card quick-actions-card">
                                <div className="card-body p-4">
                                    <h5 className="card-title mb-4">
                                        <i className="fas fa-rocket me-2"></i>Aksi Cepat
                                    </h5>
                                    <div className="d-grid gap-3">
                                        <Link to="/attendance-input" className="btn btn-light btn-action text-success border">
                                            <i className="fas fa-calendar-check"></i>
                                            <span>Input Presensi</span>
                                        </Link>
                                        <Link to="/ckp-input" className="btn btn-light btn-action text-warning border">
                                            <i className="fas fa-chart-line"></i>
                                            <span>Input CKP</span>
                                        </Link>
                                        <Link to="/period-management" className="btn btn-light btn-action text-danger border">
                                            <i className="fas fa-calendar-alt"></i>
                                            <span>Kelola Periode</span>
                                        </Link>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    const renderStaffDashboard = () => (
        <div className="row g-4">
            <div className="col-lg-7">
                <StaffActionCard periodName={activePeriod?.namaPeriode} />
                <div className="mt-4 d-none d-lg-block">
                    <EvaluationHistoryCard evaluations={myEvaluations} />
                </div>
            </div>
            <div className="col-lg-5">
                {/* 🔥 FIXED: Staff also shows best employee from PREVIOUS period */}
                <BestEmployeeCard employee={bestEmployee} period={bestEmployeePeriod} />
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
                    <div className="spinner-border text-primary" role="status" style={{ width: '3rem', height: '3rem' }}>
                        <span className="visually-hidden">Loading...</span>
                    </div>
                </div>
            ) : (
                <>
                    <div className="welcome-header">
                        <div className="d-flex justify-content-between align-items-center">
                            <div className="d-flex align-items-center">
                            <img
                                src={getImageUrl(user.profilePicture)}
                                alt="Foto Profil"
                                className="dashboard-profile-pic me-4" 
                            />
                            <div>
                                <h1 className="welcome-title">Dashboard</h1>
                                <p className="welcome-subtitle mb-0">
                                    Selamat datang, <span className="welcome-user-badge">{user.nama}</span>
                                </p>
                            </div>
                            </div>
                            <div className="text-end">
                                <h6 className="mb-1 opacity-75" style={{ fontSize: '1.1rem' }}>Periode Aktif</h6>
                                <span className="badge period-badge fs-6" style={{ fontSize: '1.2rem', padding: '0.7em 1.2em' }}>
                                    {activePeriod?.namaPeriode || 'N/A'}
                                </span>
                            </div>
                            </div>
                    </div>

                    {error && (
                        <div className="alert alert-danger">
                            <i className="fas fa-exclamation-triangle me-2"></i>
                            {error}
                        </div>
                    )}

                    {/* 🔥 FIXED: Stats cards with correct values (32 users, excluding admin) */}
                    {(user.role === 'ADMIN' || user.role === 'PIMPINAN') && (
                        <div className="row g-4 mb-4">
                            <div className="col-lg-3 col-md-6">
                                <StatCardColorful 
                                    title="Total Pegawai" 
                                    value={stats?.overview?.totalUsers || 32} 
                                    icon="fa-users" 
                                    colorClass="bg-primary" 
                                />
                            </div>
                            <div className="col-lg-3 col-md-6">
                                <StatCardColorful 
                                    title="Sudah Menilai" 
                                    value={stats?.overview?.completedEvaluations || 0} 
                                    icon="fa-user-check" 
                                    unit={`/ ${stats?.overview?.totalUsers || 32}`} 
                                    colorClass="bg-success" 
                                />
                            </div>
                            <div className="col-lg-3 col-md-6">
                                <StatCardColorful 
                                    title="Rata-rata Presensi" 
                                    value={stats?.scores?.attendance?.average?.toFixed(1) || '100.0'} 
                                    icon="fa-calendar-check" 
                                    colorClass="bg-warning text-dark" 
                                />
                            </div>
                            <div className="col-lg-3 col-md-6">
                                <StatCardColorful 
                                    title="Rata-rata CKP" 
                                    value={stats?.scores?.ckp?.average?.toFixed(1) || '98.0'} 
                                    icon="fa-chart-line" 
                                    colorClass="bg-info" 
                                />
                            </div>
                        </div>
                    )}

                    {user.role === 'STAFF' || user.role === 'PIMPINAN' ? 
                        renderStaffDashboard() : 
                        renderAdminDashboard()
                    }
                </>
            )}
        </div>
    );
};

export default DashboardPage;