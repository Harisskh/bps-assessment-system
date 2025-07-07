// src/pages/AttendanceInputPage.js - COMPLETE ATTENDANCE MANAGEMENT SYSTEM
import React, { useState, useEffect } from 'react';
import { attendanceAPI, periodAPI, userAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';

const AttendanceInputPage = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  // Master data
  const [periods, setPeriods] = useState([]);
  const [users, setUsers] = useState([]);
  const [attendanceRecords, setAttendanceRecords] = useState([]);
  
  // Filters
  const [selectedPeriod, setSelectedPeriod] = useState('');
  const [selectedUser, setSelectedUser] = useState('');
  const [searchUser, setSearchUser] = useState('');
  
  // Modal states
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState('create'); // 'create', 'edit'
  const [selectedAttendance, setSelectedAttendance] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [attendanceToDelete, setAttendanceToDelete] = useState(null);
  
  // Form data
  const [formData, setFormData] = useState({
    userId: '',
    periodId: '',
    adaTidakKerja: false,
    adaPulangAwal: false,
    adaTelat: false,
    adaAbsenApel: false,
    adaCuti: false,
    keterangan: ''
  });

  useEffect(() => {
    loadInitialData();
  }, []);

  useEffect(() => {
    if (selectedPeriod) {
      loadAttendanceRecords();
    }
  }, [selectedPeriod, selectedUser]);

  const loadInitialData = async () => {
    try {
      setLoading(true);
      setError('');
      
      const [periodsRes, usersRes] = await Promise.all([
        periodAPI.getAll({ limit: 50 }),
        userAPI.getAll({ limit: 100, role: '', status: '' })
      ]);

      setPeriods(periodsRes.data.data.periods);
      setUsers(usersRes.data.data.users.filter(u => u.isActive));

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

  const loadAttendanceRecords = async () => {
    try {
      setLoading(true);
      
      const params = {
        periodId: selectedPeriod,
        userId: selectedUser,
        limit: 100
      };

      const response = await attendanceAPI.getAll(params);
      setAttendanceRecords(response.data.data.attendances);
      
    } catch (error) {
      console.error('Load attendance records error:', error);
      setError('Gagal memuat data presensi');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateAttendance = () => {
    setModalMode('create');
    setFormData({
      userId: '',
      periodId: selectedPeriod,
      adaTidakKerja: false,
      adaPulangAwal: false,
      adaTelat: false,
      adaAbsenApel: false,
      adaCuti: false,
      keterangan: ''
    });
    setShowModal(true);
  };

  const handleEditAttendance = (attendance) => {
    setModalMode('edit');
    setSelectedAttendance(attendance);
    setFormData({
      userId: attendance.userId,
      periodId: attendance.periodId,
      adaTidakKerja: attendance.adaTidakKerja,
      adaPulangAwal: attendance.adaPulangAwal,
      adaTelat: attendance.adaTelat,
      adaAbsenApel: attendance.adaAbsenApel,
      adaCuti: attendance.adaCuti,
      keterangan: attendance.keterangan || ''
    });
    setShowModal(true);
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    setSuccess('');

    try {
      await attendanceAPI.upsert(formData);
      setSuccess(modalMode === 'create' ? 'Data presensi berhasil ditambahkan' : 'Data presensi berhasil diperbarui');
      setShowModal(false);
      loadAttendanceRecords();
      
    } catch (error) {
      console.error('Submit attendance error:', error);
      setError(error.response?.data?.message || 'Gagal menyimpan data presensi');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteAttendance = async () => {
    if (!attendanceToDelete) return;
    
    try {
      setSubmitting(true);
      await attendanceAPI.delete(attendanceToDelete.id);
      setSuccess(`Data presensi ${attendanceToDelete.user.nama} berhasil dihapus`);
      setShowDeleteModal(false);
      setAttendanceToDelete(null);
      loadAttendanceRecords();
    } catch (error) {
      console.error('Delete attendance error:', error);
      setError(error.response?.data?.message || 'Gagal menghapus data presensi');
    } finally {
      setSubmitting(false);
    }
  };

  const handleBulkCreate = () => {
    if (!selectedPeriod) {
      setError('Pilih periode terlebih dahulu');
      return;
    }
    
    const bulkCreate = async () => {
      setSubmitting(true);
      setError('');
      
      try {
        const promises = users.map(user => 
          attendanceAPI.upsert({
            userId: user.id,
            periodId: selectedPeriod,
            adaTidakKerja: false,
            adaPulangAwal: false,
            adaTelat: false,
            adaAbsenApel: false,
            adaCuti: false,
            keterangan: 'Bulk input - default 100%'
          })
        );
        
        await Promise.all(promises);
        setSuccess(`Berhasil membuat ${users.length} record presensi dengan nilai 100%`);
        loadAttendanceRecords();
        
      } catch (error) {
        console.error('Bulk create error:', error);
        setError('Gagal membuat bulk attendance records');
      } finally {
        setSubmitting(false);
      }
    };
    
    bulkCreate();
  };

  const calculatePresensiScore = (data) => {
    let totalMinus = 0;
    if (data.adaTidakKerja) totalMinus += 30;
    if (data.adaPulangAwal) totalMinus += 10;
    if (data.adaTelat) totalMinus += 10;
    if (data.adaAbsenApel) totalMinus += 10;
    if (data.adaCuti) totalMinus += 5;
    
    return Math.max(0, 100 - totalMinus);
  };

  const getViolationBadges = (attendance) => {
    const violations = [];
    if (attendance.adaTidakKerja) violations.push({ label: 'TK', color: 'bg-danger', penalty: '-30%' });
    if (attendance.adaPulangAwal) violations.push({ label: 'PSW', color: 'bg-warning text-dark', penalty: '-10%' });
    if (attendance.adaTelat) violations.push({ label: 'TLT', color: 'bg-warning text-dark', penalty: '-10%' });
    if (attendance.adaAbsenApel) violations.push({ label: 'APEL', color: 'bg-info', penalty: '-10%' });
    if (attendance.adaCuti) violations.push({ label: 'CT', color: 'bg-secondary', penalty: '-5%' });
    
    return violations;
  };

  const filteredUsers = users.filter(user =>
    user.nama.toLowerCase().includes(searchUser.toLowerCase()) ||
    user.nip.includes(searchUser)
  );

  if (loading && attendanceRecords.length === 0) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '50vh' }}>
        <div className="text-center">
          <div className="spinner-border text-primary mb-3" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
          <p className="text-muted">Memuat data presensi...</p>
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
            <i className="fas fa-calendar-check me-2"></i>
            Input Data Presensi
          </h1>
          <p className="text-muted">Kelola data presensi pegawai per periode (Bobot: 40%)</p>
        </div>
        <div className="d-flex gap-2">
          <button 
            className="btn btn-outline-primary"
            onClick={handleBulkCreate}
            disabled={!selectedPeriod || submitting}
          >
            <i className="fas fa-users me-2"></i>
            Bulk Input (100%)
          </button>
          <button 
            className="btn btn-primary"
            onClick={handleCreateAttendance}
            disabled={!selectedPeriod}
          >
            <i className="fas fa-plus me-2"></i>
            Input Presensi
          </button>
        </div>
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

      {/* Info Card */}
      <div className="card border-info mb-4">
        <div className="card-body">
          <h6 className="card-title text-info">
            <i className="fas fa-info-circle me-2"></i>
            Sistem Penilaian Presensi
          </h6>
          <div className="row">
            <div className="col-md-8">
              <p className="card-text text-muted">
                Penilaian presensi menggunakan sistem pengurangan dari 100% berdasarkan jenis pelanggaran.
                Setiap jenis pelanggaran memiliki pengurangan maksimal yang tidak dikalikan dengan frekuensi.
              </p>
            </div>
            <div className="col-md-4">
              <div className="d-flex flex-wrap gap-2">
                <span className="badge bg-danger">TK: -30%</span>
                <span className="badge bg-warning text-dark">PSW: -10%</span>
                <span className="badge bg-warning text-dark">TLT: -10%</span>
                <span className="badge bg-info">APEL: -10%</span>
                <span className="badge bg-secondary">CT: -5%</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="card mb-4">
        <div className="card-body">
          <div className="row g-3">
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
            <div className="col-md-3">
              <label className="form-label">Filter Pegawai</label>
              <select
                className="form-select"
                value={selectedUser}
                onChange={(e) => setSelectedUser(e.target.value)}
              >
                <option value="">Semua Pegawai</option>
                {users.map(user => (
                  <option key={user.id} value={user.id}>
                    {user.nama} - {user.jabatan}
                  </option>
                ))}
              </select>
            </div>
            <div className="col-md-3">
              <label className="form-label">Cari Pegawai</label>
              <input
                type="text"
                className="form-control"
                placeholder="Nama atau NIP..."
                value={searchUser}
                onChange={(e) => setSearchUser(e.target.value)}
              />
            </div>
            <div className="col-md-2">
              <label className="form-label">&nbsp;</label>
              <button 
                type="button" 
                className="btn btn-outline-secondary w-100"
                onClick={() => {
                  setSelectedUser('');
                  setSearchUser('');
                }}
              >
                <i className="fas fa-refresh me-2"></i>
                Reset
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Attendance Records */}
      {selectedPeriod ? (
        <div className="card">
          <div className="card-header">
            <div className="d-flex justify-content-between align-items-center">
              <h5 className="mb-0">
                <i className="fas fa-list me-2"></i>
                Data Presensi - {periods.find(p => p.id === selectedPeriod)?.namaPeriode}
              </h5>
              {attendanceRecords.length > 0 && (
                <span className="badge bg-primary fs-6">
                  {attendanceRecords.length} record
                </span>
              )}
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
                        <th>NIP</th>
                        <th>Nama Pegawai</th>
                        <th>Jabatan</th>
                        <th>Pelanggaran</th>
                        <th>Total Minus</th>
                        <th>Nilai Presensi</th>
                        <th>Keterangan</th>
                        <th width="150">Aksi</th>
                      </tr>
                    </thead>
                    <tbody>
                      {attendanceRecords.length === 0 ? (
                        <tr>
                          <td colSpan="8" className="text-center py-4 text-muted">
                            <i className="fas fa-calendar-alt fa-2x mb-2"></i>
                            <br />Belum ada data presensi untuk periode ini
                            <br />
                            <button 
                              className="btn btn-primary btn-sm mt-2"
                              onClick={handleBulkCreate}
                              disabled={submitting}
                            >
                              <i className="fas fa-plus me-1"></i>
                              Buat Data Awal
                            </button>
                          </td>
                        </tr>
                      ) : (
                        attendanceRecords.map((attendance) => {
                          const violations = getViolationBadges(attendance);
                          return (
                            <tr key={attendance.id}>
                              <td>
                                <span className="fw-bold">{attendance.user.nip}</span>
                              </td>
                              <td>
                                <strong>{attendance.user.nama}</strong>
                              </td>
                              <td>
                                <small className="text-muted">{attendance.user.jabatan}</small>
                              </td>
                              <td>
                                {violations.length === 0 ? (
                                  <span className="badge bg-success">
                                    <i className="fas fa-check me-1"></i>
                                    Perfect
                                  </span>
                                ) : (
                                  <div className="d-flex flex-wrap gap-1">
                                    {violations.map((violation, index) => (
                                      <span 
                                        key={index}
                                        className={`badge ${violation.color}`}
                                        title={violation.penalty}
                                      >
                                        {violation.label}
                                      </span>
                                    ))}
                                  </div>
                                )}
                              </td>
                              <td>
                                <span className={`fw-bold ${attendance.totalMinus > 0 ? 'text-danger' : 'text-success'}`}>
                                  {attendance.totalMinus}%
                                </span>
                              </td>
                              <td>
                                <div className="d-flex align-items-center">
                                  <span className={`h6 mb-0 me-2 ${attendance.nilaiPresensi >= 90 ? 'text-success' : attendance.nilaiPresensi >= 70 ? 'text-warning' : 'text-danger'}`}>
                                    {attendance.nilaiPresensi.toFixed(1)}
                                  </span>
                                  <div 
                                    className="progress flex-grow-1" 
                                    style={{ height: '6px', width: '60px' }}
                                  >
                                    <div 
                                      className={`progress-bar ${attendance.nilaiPresensi >= 90 ? 'bg-success' : attendance.nilaiPresensi >= 70 ? 'bg-warning' : 'bg-danger'}`}
                                      style={{ width: `${attendance.nilaiPresensi}%` }}
                                    ></div>
                                  </div>
                                </div>
                              </td>
                              <td>
                                <small className="text-muted">
                                  {attendance.keterangan ? 
                                    (attendance.keterangan.length > 30 ? 
                                      `${attendance.keterangan.substring(0, 30)}...` : 
                                      attendance.keterangan
                                    ) : '-'
                                  }
                                </small>
                              </td>
                              <td>
                                <div className="btn-group btn-group-sm">
                                  <button 
                                    className="btn btn-outline-primary"
                                    onClick={() => handleEditAttendance(attendance)}
                                    title="Edit Presensi"
                                  >
                                    <i className="fas fa-edit"></i>
                                  </button>
                                  <button 
                                    className="btn btn-outline-danger"
                                    onClick={() => {
                                      setAttendanceToDelete(attendance);
                                      setShowDeleteModal(true);
                                    }}
                                    title="Hapus Presensi"
                                  >
                                    <i className="fas fa-trash"></i>
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Summary Statistics */}
                {attendanceRecords.length > 0 && (
                  <div className="mt-4 p-3 bg-light rounded">
                    <div className="row text-center">
                      <div className="col-md-2">
                        <h5 className="text-primary mb-0">{attendanceRecords.length}</h5>
                        <small className="text-muted">Total Record</small>
                      </div>
                      <div className="col-md-2">
                        <h5 className="text-success mb-0">
                          {attendanceRecords.filter(a => a.nilaiPresensi === 100).length}
                        </h5>
                        <small className="text-muted">Perfect (100%)</small>
                      </div>
                      <div className="col-md-2">
                        <h5 className="text-warning mb-0">
                          {attendanceRecords.filter(a => a.nilaiPresensi >= 70 && a.nilaiPresensi < 100).length}
                        </h5>
                        <small className="text-muted">Good (70-99%)</small>
                      </div>
                      <div className="col-md-2">
                        <h5 className="text-danger mb-0">
                          {attendanceRecords.filter(a => a.nilaiPresensi < 70).length}
                        </h5>
                        <small className="text-muted">Need Improve</small>
                      </div>
                      <div className="col-md-2">
                        <h5 className="text-info mb-0">
                          {attendanceRecords.length > 0 ? 
                            (attendanceRecords.reduce((sum, a) => sum + a.nilaiPresensi, 0) / attendanceRecords.length).toFixed(1) : 0
                          }
                        </h5>
                        <small className="text-muted">Rata-rata</small>
                      </div>
                      <div className="col-md-2">
                        <h5 className="text-secondary mb-0">
                          {attendanceRecords.filter(a => a.totalMinus > 0).length}
                        </h5>
                        <small className="text-muted">Ada Pelanggaran</small>
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      ) : (
        <div className="card">
          <div className="card-body text-center py-5">
            <i className="fas fa-calendar-alt fa-3x text-muted mb-3"></i>
            <h5 className="text-muted">Pilih Periode Penilaian</h5>
            <p className="text-muted">Silakan pilih periode penilaian untuk melihat dan mengelola data presensi</p>
          </div>
        </div>
      )}

      {/* Attendance Form Modal */}
      {showModal && (
        <div className="modal fade show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-xl">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">
                  <i className="fas fa-calendar-check me-2"></i>
                  {modalMode === 'create' ? 'Input Data Presensi' : 'Edit Data Presensi'}
                </h5>
                <button 
                  type="button" 
                  className="btn-close"
                  onClick={() => setShowModal(false)}
                ></button>
              </div>
              
              <form onSubmit={handleFormSubmit}>
                <div className="modal-body">
                  <div className="row g-3">
                    <div className="col-12">
                      <label className="form-label">Pegawai *</label>
                      {modalMode === 'create' ? (
                        <select
                          className="form-select"
                          value={formData.userId}
                          onChange={(e) => setFormData({ ...formData, userId: e.target.value })}
                          required
                        >
                          <option value="">-- Pilih Pegawai --</option>
                          {filteredUsers.map(user => (
                            <option key={user.id} value={user.id}>
                              {user.nama} - {user.jabatan} ({user.nip})
                            </option>
                          ))}
                        </select>
                      ) : (
                        <div className="form-control-plaintext bg-light p-2 rounded">
                          <strong>{attendanceRecords.find(a => a.userId === formData.userId)?.user?.nama}</strong>
                          <small className="d-block text-muted">
                            {attendanceRecords.find(a => a.userId === formData.userId)?.user?.jabatan}
                          </small>
                        </div>
                      )}
                    </div>

                    <div className="col-12">
                      <h6 className="text-secondary mb-3">
                        <i className="fas fa-exclamation-triangle me-2"></i>
                        Jenis Pelanggaran Presensi
                      </h6>
                    </div>

                    <div className="col-md-6">
                      <div className="card border-danger h-100">
                        <div className="card-header bg-danger text-white">
                          <h6 className="mb-0">Pelanggaran Berat</h6>
                        </div>
                        <div className="card-body">
                          <div className="form-check">
                            <input
                              className="form-check-input"
                              type="checkbox"
                              id="adaTidakKerja"
                              checked={formData.adaTidakKerja}
                              onChange={(e) => setFormData({ ...formData, adaTidakKerja: e.target.checked })}
                            />
                            <label className="form-check-label" htmlFor="adaTidakKerja">
                              <strong>Tidak Kerja (TK)</strong>
                              <span className="badge bg-danger ms-2">-30%</span>
                              <small className="d-block text-muted">Tidak masuk kerja tanpa keterangan</small>
                            </label>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="col-md-6">
                      <div className="card border-warning h-100">
                        <div className="card-header bg-warning text-dark">
                          <h6 className="mb-0">Pelanggaran Sedang</h6>
                        </div>
                        <div className="card-body">
                          <div className="form-check mb-3">
                            <input
                              className="form-check-input"
                              type="checkbox"
                              id="adaPulangAwal"
                              checked={formData.adaPulangAwal}
                              onChange={(e) => setFormData({ ...formData, adaPulangAwal: e.target.checked })}
                            />
                            <label className="form-check-label" htmlFor="adaPulangAwal">
                              <strong>Pulang Sebelum Waktunya (PSW)</strong>
                              <span className="badge bg-warning text-dark ms-2">-10%</span>
                              <small className="d-block text-muted">Pulang sebelum jam kerja selesai</small>
                            </label>
                          </div>

                          <div className="form-check">
                            <input
                              className="form-check-input"
                              type="checkbox"
                              id="adaTelat"
                              checked={formData.adaTelat}
                              onChange={(e) => setFormData({ ...formData, adaTelat: e.target.checked })}
                            />
                            <label className="form-check-label" htmlFor="adaTelat">
                              <strong>Telat (TLT)</strong>
                              <span className="badge bg-warning text-dark ms-2">-10%</span>
                              <small className="d-block text-muted">Terlambat datang kerja</small>
                            </label>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="col-md-6">
                      <div className="card border-info h-100">
                        <div className="card-header bg-info text-white">
                          <h6 className="mb-0">Pelanggaran Ringan</h6>
                        </div>
                        <div className="card-body">
                          <div className="form-check mb-3">
                            <input
                              className="form-check-input"
                              type="checkbox"
                              id="adaAbsenApel"
                              checked={formData.adaAbsenApel}
                              onChange={(e) => setFormData({ ...formData, adaAbsenApel: e.target.checked })}
                            />
                            <label className="form-check-label" htmlFor="adaAbsenApel">
                              <strong>Absen APEL</strong>
                              <span className="badge bg-info ms-2">-10%</span>
                              <small className="d-block text-muted">Tidak mengikuti apel pagi</small>
                            </label>
                          </div>

                          <div className="form-check">
                            <input
                              className="form-check-input"
                              type="checkbox"
                              id="adaCuti"
                              checked={formData.adaCuti}
                              onChange={(e) => setFormData({ ...formData, adaCuti: e.target.checked })}
                            />
                            <label className="form-check-label" htmlFor="adaCuti">
                              <strong>Cuti (CT)</strong>
                              <span className="badge bg-secondary ms-2">-5%</span>
                              <small className="d-block text-muted">Mengambil cuti dalam periode ini</small>
                            </label>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="col-md-6">
                      <div className="card bg-light h-100">
                        <div className="card-header bg-primary text-white">
                          <h6 className="mb-0">
                            <i className="fas fa-calculator me-2"></i>
                            Perhitungan Nilai
                          </h6>
                        </div>
                        <div className="card-body">
                          <div className="text-center">
                            <div className="bg-white rounded p-3 border">
                              <h4 className="text-primary mb-1">
                                {calculatePresensiScore(formData).toFixed(1)}%
                              </h4>
                              <small className="text-muted">Nilai Presensi</small>
                              
                              <div className="progress mt-2" style={{ height: '8px' }}>
                                <div 
                                  className={`progress-bar ${calculatePresensiScore(formData) >= 90 ? 'bg-success' : calculatePresensiScore(formData) >= 70 ? 'bg-warning' : 'bg-danger'}`}
                                  style={{ width: `${calculatePresensiScore(formData)}%` }}
                                ></div>
                              </div>
                            </div>
                            
                            <div className="mt-3">
                              <h6 className="text-secondary">Breakdown Pengurangan:</h6>
                              <div className="row text-center">
                                <div className="col-6 mb-2">
                                  <div className={`p-2 rounded ${formData.adaTidakKerja ? 'bg-danger text-white' : 'bg-light'}`}>
                                    <strong>TK: {formData.adaTidakKerja ? '-30%' : '0%'}</strong>
                                  </div>
                                </div>
                                <div className="col-6 mb-2">
                                  <div className={`p-2 rounded ${formData.adaPulangAwal ? 'bg-warning text-dark' : 'bg-light'}`}>
                                    <strong>PSW: {formData.adaPulangAwal ? '-10%' : '0%'}</strong>
                                  </div>
                                </div>
                                <div className="col-6 mb-2">
                                  <div className={`p-2 rounded ${formData.adaTelat ? 'bg-warning text-dark' : 'bg-light'}`}>
                                    <strong>TLT: {formData.adaTelat ? '-10%' : '0%'}</strong>
                                  </div>
                                </div>
                                <div className="col-6 mb-2">
                                  <div className={`p-2 rounded ${formData.adaAbsenApel ? 'bg-info text-white' : 'bg-light'}`}>
                                    <strong>APEL: {formData.adaAbsenApel ? '-10%' : '0%'}</strong>
                                  </div>
                                </div>
                                <div className="col-12">
                                  <div className={`p-2 rounded ${formData.adaCuti ? 'bg-secondary text-white' : 'bg-light'}`}>
                                    <strong>CT: {formData.adaCuti ? '-5%' : '0%'}</strong>
                                  </div>
                                </div>
                              </div>
                              
                              <div className="mt-3 p-2 bg-primary text-white rounded">
                                <strong>
                                  Total Minus: {
                                    (formData.adaTidakKerja ? 30 : 0) +
                                    (formData.adaPulangAwal ? 10 : 0) +
                                    (formData.adaTelat ? 10 : 0) +
                                    (formData.adaAbsenApel ? 10 : 0) +
                                    (formData.adaCuti ? 5 : 0)
                                  }%
                                </strong>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="col-12">
                      <label className="form-label">Keterangan</label>
                      <textarea
                        className="form-control"
                        rows="3"
                        value={formData.keterangan}
                        onChange={(e) => setFormData({ ...formData, keterangan: e.target.value })}
                        placeholder="Catatan tambahan mengenai presensi pegawai..."
                      ></textarea>
                    </div>
                  </div>
                </div>
                
                <div className="modal-footer">
                  <button 
                    type="button" 
                    className="btn btn-secondary"
                    onClick={() => setShowModal(false)}
                  >
                    Batal
                  </button>
                  <button 
                    type="submit" 
                    className="btn btn-primary"
                    disabled={submitting}
                  >
                    {submitting ? (
                      <>
                        <span className="spinner-border spinner-border-sm me-2"></span>
                        Menyimpan...
                      </>
                    ) : (
                      modalMode === 'create' ? 'Simpan Data Presensi' : 'Update Data Presensi'
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="modal fade show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header bg-danger text-white">
                <h5 className="modal-title">
                  <i className="fas fa-exclamation-triangle me-2"></i>
                  Konfirmasi Hapus Data Presensi
                </h5>
                <button 
                  type="button" 
                  className="btn-close btn-close-white"
                  onClick={() => setShowDeleteModal(false)}
                ></button>
              </div>
              <div className="modal-body">
                <div className="alert alert-warning">
                  <i className="fas fa-exclamation-triangle me-2"></i>
                  <strong>Peringatan!</strong> Tindakan ini tidak dapat dibatalkan.
                </div>
                <p>Apakah Anda yakin ingin menghapus data presensi:</p>
                <div className="bg-light p-3 rounded">
                  <strong>{attendanceToDelete?.user?.nama}</strong><br/>
                  <small className="text-muted">
                    NIP: {attendanceToDelete?.user?.nip} | 
                    Jabatan: {attendanceToDelete?.user?.jabatan}
                  </small><br/>
                  <small className="text-muted">
                    Nilai Presensi: {attendanceToDelete?.nilaiPresensi?.toFixed(1)}%
                  </small>
                </div>
              </div>
              <div className="modal-footer">
                <button 
                  type="button" 
                  className="btn btn-secondary"
                  onClick={() => setShowDeleteModal(false)}
                >
                  Batal
                </button>
                <button 
                  type="button" 
                  className="btn btn-danger"
                  onClick={handleDeleteAttendance}
                  disabled={submitting}
                >
                  {submitting ? (
                    <>
                      <span className="spinner-border spinner-border-sm me-2"></span>
                      Menghapus...
                    </>
                  ) : (
                    <>
                      <i className="fas fa-trash me-2"></i>
                      Ya, Hapus Data
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AttendanceInputPage;