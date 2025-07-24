// src/pages/DashboardPage.js - COMPLETE AND FINAL VERSION
import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { dashboardAPI, periodAPI, evaluationAPI } from '../services/api';
import { Link } from 'react-router-dom';
import '../styles/Dashboard.scss';

// PhotoModal Component
const PhotoModal = ({ isOpen, onClose, imageUrl, userName, userRole }) => {
    useEffect(() => {
        const handleEscape = (e) => {
            if (e.key === 'Escape') onClose();
        };
        
        if (isOpen) {
            document.addEventListener('keydown', handleEscape);
            document.body.style.overflow = 'hidden';
        }
        
        return () => {
            document.removeEventListener('keydown', handleEscape);
            document.body.style.overflow = 'unset';
        };
    }, [isOpen, onClose]);
    
    const getInitials = (name = '') => {
        if (!name) return '??';
        const parts = name.split(' ');
        if (parts.length > 1) {
            return parts[0][0] + parts[1][0];
        }
        return name.substring(0, 2);
    };
    
    if (!isOpen) return null;
    
    return (
        <div 
            className={`photo-modal ${isOpen ? 'show' : ''}`}
            onClick={onClose}
        >
            <div 
                className={`photo-modal-content ${isOpen ? 'show' : ''}`}
                onClick={(e) => e.stopPropagation()}
            >
                <button className="photo-modal-close" onClick={onClose}>
                    <i className="fas fa-times"></i>
                </button>
                
                {imageUrl ? (
                    <img src={imageUrl} alt={userName} style={{ maxWidth: '90vw', maxHeight: '80vh', borderRadius: '1rem' }} />
                ) : (
                    <div 
                        style={{
                            width: '400px',
                            height: '400px',
                            backgroundColor: '#2c549c',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: 'white',
                            fontSize: '6rem',
                            fontWeight: 'bold',
                            borderRadius: '1rem'
                        }}
                    >
                        {getInitials(userName).toUpperCase()}
                    </div>
                )}
                
                <div className="photo-modal-info">
                    <h5>{userName}</h5>
                    <p>{userRole}</p>
                    {!imageUrl && <small style={{opacity: 0.8}}>Foto profil belum diatur</small>}
                </div>
            </div>
        </div>
    );
};

const StatCardColorful = ({ title, value, icon, unit = '', colorClass = 'bg-primary' }) => (
    <div className={`stat-card-colorful ${colorClass} h-100`}>
        <h6 className="stat-label">{title}</h6>
        <h2 className="stat-value">
            {value} 
            {unit && <small className="fs-6 opacity-75 d-none d-md-inline">{unit}</small>}
        </h2>
        <i className={`fas ${icon} stat-icon`}></i>
    </div>
);

const BestEmployeeCard = ({ employee, period, onPhotoClick }) => {
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
    
    const handlePhotoClick = (e) => {
        e.preventDefault();
        e.stopPropagation();
        console.log('=== BEST EMPLOYEE PHOTO CLICK ===');
        console.log('profileImageUrl:', profileImageUrl);
        console.log('userData:', userData);
        onPhotoClick(profileImageUrl, userData.nama, userData.jabatan);
    };
    
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
                            className="avatar-image-large clickable-photo"
                            onClick={handlePhotoClick}
                            onError={(e) => {
                                console.log('Image load error, switching to initials');
                                e.target.style.display = 'none';
                                const parent = e.target.parentElement;
                                if (parent && !parent.querySelector('.avatar-placeholder-large')) {
                                    const placeholderDiv = document.createElement('div');
                                    placeholderDiv.className = 'avatar-placeholder-large clickable-photo';
                                    placeholderDiv.innerHTML = `<span class="avatar-initials">${getInitials(userData.nama)}</span>`;
                                    placeholderDiv.addEventListener('click', handlePhotoClick);
                                    parent.appendChild(placeholderDiv);
                                }
                            }}
                        />
                    ) : (
                        <div 
                            className="avatar-placeholder-large clickable-photo"
                            onClick={handlePhotoClick}
                        >
                            <span className="avatar-initials">{getInitials(userData.nama)}</span>
                        </div>
                    )}
                </div>
                
                <h4 className="mt-3 mb-1 fw-bold">{userData.nama}</h4>
                <p className="text-muted small mb-3">{userData.jabatan}</p>
                
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
                    <div className="col">
                        <div className="bg-light p-2 rounded text-center">
                            <small className="text-muted d-block">BerAKHLAK</small>
                            <strong className="text-primary">{scores.berakhlak.toFixed(1)}</strong>
                        </div>
                    </div>
                    <div className="col">
                        <div className="bg-light p-2 rounded text-center">
                            <small className="text-muted d-block">Presensi</small>
                            <strong className="text-primary">{scores.presensi.toFixed(1)}</strong>
                        </div>
                    </div>
                    <div className="col">
                        <div className="bg-light p-2 rounded text-center">
                            <small className="text-muted d-block">CKP</small>
                            <strong className="text-primary">{scores.ckp.toFixed(1)}</strong>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

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
            <span>Mulai Menilai</span>
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
        <div className="card dashboard-card evaluation-history-card h-100">
            <div className="card-body">
                <div className="d-flex justify-content-between align-items-center mb-4">
                    <h5 className="card-title mb-0">
                        <i className="fas fa-history me-2 text-primary"></i>
                        Riwayat Penilaian
                    </h5>
                    <span className="badge bg-primary-subtle text-primary">{evaluations.length}</span>
                </div>

                {evaluations.length > 0 ? (
                    <div className="evaluation-history-compact">
                        {evaluations.slice(0, 3).map((evaluation, index) => {
                            const badge = getRankingBadge(evaluation.ranking);
                            return (
                                <div key={evaluation.id || index} className="history-item-compact">
                                    <div className="d-flex align-items-center">
                                        <span className={`badge ${badge.class} me-3 flex-shrink-0`}>
                                            <i className={`fas ${badge.icon} me-1`}></i>
                                            <span className="d-none d-sm-inline">{badge.text}</span>
                                            <span className="d-sm-none">{badge.text.split(' ')[1] || badge.text}</span>
                                        </span>
                                        <div className="flex-grow-1 min-w-0">
                                            <div className="fw-semibold text-truncate">{evaluation.target?.nama || 'N/A'}</div>
                                            <small className="text-muted text-truncate d-block">{evaluation.target?.jabatan || 'N/A'}</small>
                                        </div>
                                        <div className="text-end flex-shrink-0 ms-2">
                                            <small className="text-muted">
                                                {formatDate(evaluation.submitDate)}
                                            </small>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                        {evaluations.length > 3 && (
                            <div className="text-center mt-3">
                                <small className="text-muted">
                                    +{evaluations.length - 3} penilaian lainnya
                                </small>
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="text-center py-4">
                        <i className="fas fa-inbox fa-3x text-muted mb-3"></i>
                        <p className="text-muted mb-3">Belum ada riwayat penilaian untuk periode ini.</p>
                        <Link to="/evaluation-history" className="btn btn-outline-primary btn-sm">
                            <i className="fas fa-external-link-alt me-2"></i>
                            Lihat Semua Riwayat
                        </Link>
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
    const [photoModal, setPhotoModal] = useState({
        isOpen: false,
        imageUrl: '',
        userName: '',
        userRole: ''
    });

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
        if (!name) return '??';
        const parts = name.split(' ');
        if (parts.length > 1) {
            return parts[0][0] + parts[1][0];
        }
        return name.substring(0, 2);
    };

    const handlePhotoClick = (imageUrl, userName, userRole) => {
        console.log('=== PHOTO CLICK DEBUG ===');
        console.log('imageUrl:', imageUrl);
        console.log('userName:', userName);
        console.log('userRole:', userRole);
        
        setPhotoModal({
            isOpen: true,
            imageUrl: imageUrl,
            userName,
            userRole
        });
    };

    const closePhotoModal = () => {
        console.log('=== CLOSING PHOTO MODAL ===');
        setPhotoModal({
            isOpen: false,
            imageUrl: '',
            userName: '',
            userRole: ''
        });
    };

    useEffect(() => {
        const loadData = async () => {
            try {
                setLoading(true);
                setError('');
                
                console.log('🔄 Starting dashboard data load...');
                
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
                
                const currentPeriodId = activePeriodData.id;
                console.log('📊 Loading data for period:', currentPeriodId);
                
                const promises = [];
                
                promises.push(
                    dashboardAPI.getStats({ periodId: currentPeriodId })
                        .then(res => ({ type: 'stats', data: res }))
                        .catch(err => {
                            console.warn('Stats failed:', err);
                            return { type: 'stats', error: err };
                        })
                );
                
                promises.push(
                    evaluationAPI.getMyEvaluations({ periodId: currentPeriodId })
                        .then(res => ({ type: 'myEvaluations', data: res }))
                        .catch(err => ({ type: 'myEvaluations', error: err }))
                );
                
                if (user.role === 'ADMIN' || user.role === 'PIMPINAN') {
                    promises.push(
                        dashboardAPI.getEvaluationProgress({ periodId: currentPeriodId })
                            .then(res => ({ type: 'progress', data: res }))
                            .catch(err => ({ type: 'progress', error: err }))
                    );
                }
                
                const results = await Promise.all(promises);
                
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
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [user]);

    const calculateProgressPercentage = () => {
        if (!stats?.overview) return 0;
        
        const totalUsers = stats.overview.totalUsers || 0;
        const completedEvaluations = stats.overview.completedEvaluations || 0;
        
        if (totalUsers === 0) return 0;
        
        const percentage = Math.round((completedEvaluations / totalUsers) * 100);
        return percentage;
    };

    const renderAdminDashboard = () => {
        const progressPercentage = calculateProgressPercentage();
        const totalUsers = stats?.overview?.totalUsers || 0;
        const completedEvaluations = stats?.overview?.completedEvaluations || 0;
        const notStarted = totalUsers - completedEvaluations;
        
        return (
            <div className="row g-4">
                <div className="col-lg-5 d-flex flex-column">
                    <BestEmployeeCard 
                        employee={bestEmployee} 
                        period={bestEmployeePeriod} 
                        onPhotoClick={handlePhotoClick}
                    />
                </div>
                <div className="col-lg-7 d-flex flex-column">
                    <div className="row g-4 flex-grow-1">
                        <div className="col-md-6">
                            <div className="progress-card card h-100">
                                <div className="card-body d-flex flex-column align-items-center justify-content-center">
                                    <div className="d-flex align-items-center mb-4">
                                        <i className="fas fa-chart-pie text-primary me-2 fs-5"></i>
                                        <h5 className="card-title mb-0">Progress Evaluasi</h5>
                                    </div>
                                    <RadialProgress percentage={progressPercentage} />
                                    <div className="w-100 mt-4">
                                        <div className="row text-center">
                                            <div className="col-6">
                                                <div className="border-end">
                                                    <p className="mb-1 h4 fw-bold text-success">
                                                        {completedEvaluations}
                                                    </p>
                                                    <small className="text-muted">Sudah Menilai</small>
                                                </div>
                                            </div>
                                            <div className="col-6">
                                                <p className="mb-1 h4 fw-bold text-danger">
                                                    {notStarted}
                                                </p>
                                                <small className="text-muted">Belum Menilai</small>
                                            </div>
                                        </div>
                                        <Link to="/monitoring" className="btn btn-outline-primary btn-sm mt-3 w-100">
                                            <i className="fas fa-eye me-2"></i>
                                            Lihat Detail
                                        </Link>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="col-md-6">
                            <div className="quick-actions-card card h-100">
                                <div className="card-body">
                                    <div className="d-flex align-items-center mb-4">
                                        <i className="fas fa-rocket text-primary me-2 fs-5"></i>
                                        <h5 className="card-title mb-0">Aksi Cepat</h5>
                                    </div>
                                    <div className="d-grid gap-3">
                                        <Link to="/attendance-input" className="btn btn-outline-success btn-action">
                                            <i className="fas fa-calendar-check text-success"></i>
                                            <span>Input Presensi</span>
                                        </Link>
                                        <Link to="/ckp-input" className="btn btn-outline-warning btn-action">
                                            <i className="fas fa-chart-line text-warning"></i>
                                            <span>Input CKP</span>
                                        </Link>
                                        <Link to="/period-management" className="btn btn-outline-danger btn-action">
                                            <i className="fas fa-calendar-alt text-danger"></i>
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

    const renderPimpinanDashboard = () => {
        const progressPercentage = calculateProgressPercentage();
        const totalUsers = stats?.overview?.totalUsers || 0;
        const completedEvaluations = stats?.overview?.completedEvaluations || 0;
        const notStarted = totalUsers - completedEvaluations;
        
        return (
            <div className="row g-4">
                <div className="col-lg-8">
                    <div className="row g-4 mb-4">
                        <div className="col-md-7">
                            <StaffActionCard periodName={activePeriod?.namaPeriode} />
                        </div>
                        <div className="col-md-5">
                            <div className="progress-card card h-100 d-none d-md-block">
                                <div className="card-body d-flex flex-column align-items-center justify-content-center">
                                    <div className="d-flex align-items-center mb-3">
                                        <i className="fas fa-chart-pie text-primary me-2 fs-6"></i>
                                        <h6 className="card-title mb-0">Progress Evaluasi</h6>
                                    </div>
                                    <RadialProgress percentage={progressPercentage} />
                                    <div className="w-100 mt-3">
                                        <div className="row text-center">
                                            <div className="col-6">
                                                <div className="border-end">
                                                    <p className="mb-1 h5 fw-bold text-success">
                                                        {completedEvaluations}
                                                    </p>
                                                    <small className="text-muted">Sudah</small>
                                                </div>
                                            </div>
                                            <div className="col-6">
                                                <p className="mb-1 h5 fw-bold text-danger">
                                                    {notStarted}
                                                </p>
                                            </div>
                                        </div>
                                        <Link to="/monitoring" className="btn btn-outline-primary btn-sm mt-3 w-100">
                                            <i className="fas fa-eye me-1"></i>
                                            Detail
                                        </Link>
                                    </div>
                                </div>
                            </div>
                            
                            <div className="progress-card card mobile-simple d-md-none">
                                <div className="card-body">
                                    <div className="mobile-progress-header">
                                        <i className="fas fa-chart-pie text-primary"></i>
                                        <h6>Progress Evaluasi</h6>
                                    </div>
                                    <div className="mobile-progress-info">
                                        <div className="progress-item success">
                                            <div className="number">{completedEvaluations}</div>
                                            <div className="label">Sudah Menilai</div>
                                        </div>
                                        <div className="progress-item danger">
                                            <div className="number">{notStarted}</div>
                                            <div className="label">Belum Menilai</div>
                                        </div>
                                    </div>
                                    <Link to="/monitoring" className="btn btn-outline-primary btn-sm">
                                        <i className="fas fa-eye me-1"></i>
                                        Lihat Detail
                                    </Link>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <div className="d-none d-lg-block">
                        <EvaluationHistoryCard evaluations={myEvaluations} />
                    </div>
                </div>
                
                <div className="col-lg-4">
                    <BestEmployeeCard 
                        employee={bestEmployee} 
                        period={bestEmployeePeriod} 
                        onPhotoClick={handlePhotoClick}
                    />
                </div>
                
                <div className="col-12 d-lg-none">
                    <EvaluationHistoryCard evaluations={myEvaluations} />
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
                <BestEmployeeCard 
                    employee={bestEmployee} 
                    period={bestEmployeePeriod} 
                    onPhotoClick={handlePhotoClick}
                />
            </div>
            <div className="col-12 d-lg-none">
                <EvaluationHistoryCard evaluations={myEvaluations} />
            </div>
        </div>
    );

    return (
        <div className="container-fluid">
            <PhotoModal
                isOpen={photoModal.isOpen}
                onClose={closePhotoModal}
                imageUrl={photoModal.imageUrl}
                userName={photoModal.userName}
                userRole={photoModal.userRole}
            />
            
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
                                {user.profilePicture && getImageUrl(user.profilePicture) ? (
                                    <img
                                        src={getImageUrl(user.profilePicture)}
                                        alt="Foto Profil"
                                        className="dashboard-profile-pic me-4 clickable-photo" 
                                        onClick={() => {
                                            const imageUrl = getImageUrl(user.profilePicture);
                                            handlePhotoClick(imageUrl, user.nama, user.jabatan);
                                        }}
                                        onError={(e) => {
                                            e.target.style.display = 'none';
                                            const parent = e.target.parentElement;
                                            if (parent && !parent.querySelector('.dashboard-profile-initials')) {
                                                const initialsDiv = document.createElement('div');
                                                initialsDiv.className = 'dashboard-profile-pic dashboard-profile-initials me-4 d-flex align-items-center justify-content-center clickable-photo';
                                                initialsDiv.style.cssText = 'background-color: #2c549c; color: white; font-weight: bold; font-size: 1.2rem; cursor: pointer;';
                                                initialsDiv.textContent = getInitials(user.nama).toUpperCase();
                                                initialsDiv.addEventListener('click', () => {
                                                    handlePhotoClick(null, user.nama, user.jabatan);
                                                });
                                                parent.insertBefore(initialsDiv, e.target);
                                            }
                                        }}
                                    />
                                ) : (
                                    <div 
                                        className="dashboard-profile-pic me-4 d-flex align-items-center justify-content-center clickable-photo"
                                        style={{
                                            backgroundColor: '#2c549c',
                                            color: 'white',
                                            fontWeight: 'bold',
                                            fontSize: '1.2rem',
                                            cursor: 'pointer'
                                        }}
                                        onClick={() => {
                                            handlePhotoClick(null, user.nama, user.jabatan);
                                        }}
                                    >
                                        {getInitials(user.nama).toUpperCase()}
                                    </div>
                                )}
                                
                                <div>
                                    <h1 className="welcome-title">Dashboard</h1>
                                    <p className="welcome-subtitle mb-0">
                                        <span className="d-none d-md-inline">
                                            Selamat datang, <span className="welcome-user-badge">{user.nama}</span>
                                        </span>
                                        <span className="d-md-none">
                                            Selamat datang,<br />
                                            <span className="welcome-user-badge">{user.nama}</span>
                                        </span>
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

                    {user.role === 'STAFF' ? 
                        renderStaffDashboard() : 
                        user.role === 'PIMPINAN' ?
                        renderPimpinanDashboard() :
                        renderAdminDashboard()
                    }
                </>
            )}
        </div>
    );
};

export default DashboardPage;