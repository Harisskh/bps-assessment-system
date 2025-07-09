// src/pages/DashboardPage.js

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

const BestEmployeeCard = ({ employee }) => {
    if (!employee) {
        return (
            <div className="card dashboard-card mb-4">
                <div className="card-body text-center p-5">
                    <i className="fas fa-award fa-3x text-muted mb-3"></i>
                    <h6 className="text-muted">Best Employee belum ditentukan</h6>
                    <p className="small text-muted">Silahkan melakukan penilaian dan jalankan perhitungan final untuk menentukan pegawai terbaik periode ini.</p>
                </div>
            </div>
        );
    }
    const getInitials = (name = '') => name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase();
    return (
        <div className="best-employee-card card dashboard-card mb-4">
            <div className="congrats-banner">
                <i className="fas fa-star"></i> CONGRATULATIONS!
            </div>
            <div className="text-center pt-4">
                <div className="mx-auto d-flex align-items-center justify-content-center" style={{ width: '80px', height: '80px', borderRadius: '50%', background: 'linear-gradient(135deg, #fceabb, #f8b500)', color: '#fff', fontSize: '2rem', fontWeight: 'bold', boxShadow: '0 4px 15px rgba(0,0,0,0.1)' }}>
                    {getInitials(employee.user.nama)}
                </div>
                <h4 className="mt-3 mb-1 fw-bold">{employee.user.nama}</h4>
                <p className="text-muted small mb-3">{employee.user.jabatan}</p>
                <div className="mb-3">
                    <span className="h1 fw-bolder text-success me-2">{employee.finalScore.toFixed(2)}</span>
                    <br />
                    <span className="text-muted">Nilai Akhir</span>
                </div>
                <div className="row gx-2">
                    <div className="col"><div className="bg-light p-2 rounded text-center"><small className="text-muted d-block">BerAKHLAK</small><strong className="text-primary">{employee.berakhlakScore.toFixed(1)}</strong></div></div>
                    <div className="col"><div className="bg-light p-2 rounded text-center"><small className="text-muted d-block">Presensi</small><strong className="text-primary">{employee.presensiScore.toFixed(1)}</strong></div></div>
                    <div className="col"><div className="bg-light p-2 rounded text-center"><small className="text-muted d-block">CKP</small><strong className="text-primary">{employee.ckpScore.toFixed(1)}</strong></div></div>
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
        if (ranking === 1) return 'bg-success';
        if (ranking === 2) return 'bg-primary';
        return 'bg-info';
    };

    return (
        <div className="dashboard-card">
            <div className="card-body p-4">
                <h5 className="card-title mb-2">
                    <i className="fas fa-history me-2"></i>
                    Riwayat Penilaian Terakhir
                </h5>
                {evaluations.length > 0 ? (
                    <div className="list-group list-group-flush">
                        {evaluations.map(ev => (
                            <div key={ev.id} className="list-group-item history-item px-0">
                                <div className="d-flex align-items-center">
                                    <span className={`badge ${getRankingBadge(ev.ranking)} me-3`}>Tokoh {ev.ranking}</span>
                                    <div className="user-info">
                                        <strong>{ev.target.nama}</strong>
                                        <span className="jabatan">{ev.target.jabatan}</span>
                                    </div>
                                </div>
                                <div className="text-end">
                                    <span className="text-muted small">{ev.period.namaPeriode}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <p className="text-muted mt-3">Anda belum pernah melakukan penilaian.</p>
                )}
            </div>
        </div>
    );
};


// --- Komponen Utama Dashboard ---
const DashboardPage = () => {
    // ... (Hooks useState dan useEffect tetap sama dari sebelumnya)
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
                const periodId = periodRes.data.data.period.id;
                setActivePeriod(periodRes.data.data.period);

                const commonPromises = [
                    finalEvaluationAPI.getLeaderboard({ periodId, limit: 1 }).catch(e => e),
                    evaluationAPI.getMyEvaluations({ periodId }).catch(e => e)
                ];

                if (user.role === 'ADMIN' || user.role === 'PIMPINAN') {
                    commonPromises.push(dashboardAPI.getStats({ periodId }).catch(e => e));
                    commonPromises.push(dashboardAPI.getEvaluationProgress({ periodId }).catch(e => e));
                }

                const results = await Promise.all(commonPromises);
                
                const leaderboardRes = results[0];
                const myEvaluationsRes = results[1];

                if (!(leaderboardRes instanceof Error) && leaderboardRes.data.data.leaderboard.length > 0 && leaderboardRes.data.data.leaderboard[0].isBestEmployee) {
                    setBestEmployee(leaderboardRes.data.data.leaderboard[0]);
                }
                if (!(myEvaluationsRes instanceof Error)) {
                    setMyEvaluations(myEvaluationsRes.data.data.evaluations);
                }

                if (user.role === 'ADMIN' || user.role === 'PIMPINAN') {
                    const statsRes = results[2];
                    const progressRes = results[3];
                    if (!(statsRes instanceof Error)) setStats(statsRes.data.data);
                    if (!(progressRes instanceof Error)) setEvaluationProgress(progressRes.data.data);
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
                <div className="d-none d-lg-block mt-4">
                  <EvaluationHistoryCard evaluations={myEvaluations} />
                </div>
            </div>
            <div className="col-lg-5">
                <BestEmployeeCard employee={bestEmployee} />
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
                            <div className="col-lg-3 col-md-6"><StatCardColorful title="Rata-rata Presensi" value={stats?.scores?.attendance?.average.toFixed(1) || '0.0'} icon="fa-calendar-check" colorClass="bg-warning text-dark" /></div>
                            <div className="col-lg-3 col-md-6"><StatCardColorful title="Rata-rata CKP" value={stats?.scores?.ckp?.average.toFixed(1) || '0.0'} icon="fa-chart-line" colorClass="bg-info" /></div>
                        </div>
                    )}

                    {user.role === 'STAFF' || user.role === 'PIMPINAN' ? renderStaffDashboard() : renderAdminDashboard()}
                </>
            )}
        </div>
    );
};

export default DashboardPage;