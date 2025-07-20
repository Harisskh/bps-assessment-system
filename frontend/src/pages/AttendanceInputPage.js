// src/pages/AttendanceInputPage.js - WITH AUTO SCROLL LOGIC
import React, { useState, useEffect, useRef } from 'react';
import Select from 'react-select';
import { attendanceAPI, periodAPI, userAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import SearchableUserSelect from '../components/SearchableUserSelect';
import '../styles/AttendanceInput.scss';

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
  const [violationFilter, setViolationFilter] = useState('');
  const [selectedUserFilter, setSelectedUserFilter] = useState(null);
  
  // Modal states
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState('create');
  const [selectedAttendance, setSelectedAttendance] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [attendanceToDelete, setAttendanceToDelete] = useState(null);
  const [showDeleteAllModal, setShowDeleteAllModal] = useState(false);
  
  // 🔥 NEW: Auto scroll states
  const [hasPerformedAutoScroll, setHasPerformedAutoScroll] = useState(false);
  const emptyStateRef = useRef(null);
  
  // Form data
  const [formData, setFormData] = useState({
    userId: '',
    periodId: '',
    jumlahTidakKerja: '',
    jumlahPulangAwal: '',
    jumlahTelat: '',
    jumlahAbsenApel: '',
    jumlahCuti: '',
    keterangan: ''
  });

  useEffect(() => {
    loadInitialData();
  }, []);

  useEffect(() => {
    if (selectedPeriod) {
      loadAttendanceRecords();
    }
  }, [selectedPeriod, violationFilter]);

  // 🔥 NEW: Auto scroll effect when no data exists
  useEffect(() => {
    if (
      !loading && 
      !hasPerformedAutoScroll && 
      selectedPeriod && 
      attendanceRecords && 
      attendanceRecords.length === 0 && 
      emptyStateRef.current
    ) {
      console.log('🔥 Auto scrolling to empty state section...');
      
      // Small delay to ensure DOM is fully rendered
      setTimeout(() => {
        emptyStateRef.current?.scrollIntoView({
          behavior: 'smooth',
          block: 'center'
        });
        setHasPerformedAutoScroll(true);
      }, 500);
    }
  }, [loading, selectedPeriod, attendanceRecords, hasPerformedAutoScroll]);

  // 🔥 NEW: Reset auto scroll flag when period changes
  useEffect(() => {
    if (selectedPeriod) {
      setHasPerformedAutoScroll(false);
    }
  }, [selectedPeriod]);

  // Calculate preview score with new rules
  const calculatePreviewScore = (tk, psw, tlt, apel, ct) => {
    const jumlahTK = parseInt(tk) || 0;
    const jumlahPSW = parseInt(psw) || 0;
    const jumlahTLT = parseInt(tlt) || 0;
    const jumlahAPEL = parseInt(apel) || 0;
    const jumlahCT = parseInt(ct) || 0;
    
    let totalPengurangan = 0;
    
    // Cuti calculation
    if (jumlahCT > 0) {
      totalPengurangan += jumlahCT < 3 ? 2.5 : 5.0;
    }
    
    // Tidak Kerja calculation
    if (jumlahTK > 0) {
      totalPengurangan += jumlahTK === 1 ? 20.0 : 30.0;
    }
    
    // Pulang Sebelum Waktunya calculation
    if (jumlahPSW > 0) {
      totalPengurangan += jumlahPSW === 1 ? 5.0 : 10.0;
    }
    
    // Telat calculation
    if (jumlahTLT > 0) {
      totalPengurangan += jumlahTLT === 1 ? 5.0 : 10.0;
    }
    
    // Absen APEL calculation
    if (jumlahAPEL > 0) {
      totalPengurangan += 10.0;
    }
    
    return Math.max(0, 100 - totalPengurangan);
  };

  const loadInitialData = async () => {
    try {
      setLoading(true);
      setError('');
      
      const [periodsRes, usersRes] = await Promise.all([
        periodAPI.getAll({ limit: 50 }),
        userAPI.getAll({ limit: 100, role: '', status: '' })
      ]);

      setPeriods(periodsRes.data.data.periods || []);
      
      // Filter out Administrator System
      const activeUsers = (usersRes.data.data.users || []).filter(u => 
        u.isActive && 
        u.nama && 
        u.nip &&
        u.nama !== 'Administrator System' &&
        u.username !== 'admin' &&
        u.role !== 'ADMIN'
      );
      setUsers(activeUsers);

      const activePeriod = periodsRes.data.data.periods?.find(p => p.isActive);
      if (activePeriod) {
        setSelectedPeriod(activePeriod.id);
      }

    } catch (error) {
      console.error('❌ Load initial data error:', error);
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
        limit: 100
      };

      const response = await attendanceAPI.getAll(params);
      let records = response.data.data.attendances || [];

      // Filter out Administrator System from results
      records = records.filter(record => 
        record.user.nama !== 'Administrator System' &&
        record.user.username !== 'admin' &&
        record.user.role !== 'ADMIN'
      );

      // Apply violation filter
      if (violationFilter === 'clean') {
        records = records.filter(record => 
          !record.adaTidakKerja && !record.adaPulangAwal && 
          !record.adaTelat && !record.adaAbsenApel && !record.adaCuti
        );
      } else if (violationFilter === 'tk') {
        records = records.filter(record => record.adaTidakKerja);
      } else if (violationFilter === 'psw') {
        records = records.filter(record => record.adaPulangAwal);
      } else if (violationFilter === 'tlt') {
        records = records.filter(record => record.adaTelat);
      } else if (violationFilter === 'apel') {
        records = records.filter(record => record.adaAbsenApel);
      } else if (violationFilter === 'cuti') {
        records = records.filter(record => record.adaCuti);
      }
      
      setAttendanceRecords(records);
      
    } catch (error) {
      console.error('❌ Load attendance records error:', error);
      setError('Gagal memuat data ketidakhadiran');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateAttendance = () => {
    setModalMode('create');
    setFormData({
      userId: '',
      periodId: selectedPeriod,
      jumlahTidakKerja: '',
      jumlahPulangAwal: '',
      jumlahTelat: '',
      jumlahAbsenApel: '',
      jumlahCuti: '',
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
      jumlahTidakKerja: attendance.jumlahTidakKerja || '',
      jumlahPulangAwal: attendance.jumlahPulangAwal || '',
      jumlahTelat: attendance.jumlahTelat || '',
      jumlahAbsenApel: attendance.jumlahAbsenApel || '',
      jumlahCuti: attendance.jumlahCuti || '',
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
      const jumlahTK = parseInt(formData.jumlahTidakKerja) || 0;
      const jumlahPSW = parseInt(formData.jumlahPulangAwal) || 0;
      const jumlahTLT = parseInt(formData.jumlahTelat) || 0;
      const jumlahAPEL = parseInt(formData.jumlahAbsenApel) || 0;
      const jumlahCT = parseInt(formData.jumlahCuti) || 0;

      const submitData = {
        userId: formData.userId,
        periodId: formData.periodId,
        jumlahTidakKerja: jumlahTK,
        jumlahPulangAwal: jumlahPSW,
        jumlahTelat: jumlahTLT,
        jumlahAbsenApel: jumlahAPEL,
        jumlahCuti: jumlahCT,
        keterangan: formData.keterangan
      };

      const response = await attendanceAPI.upsert(submitData);
      
      setSuccess(modalMode === 'create' ? 
        'Data ketidakhadiran berhasil ditambahkan' : 
        'Data ketidakhadiran berhasil diperbarui');
      
      setShowModal(false);
      setFormData({
        userId: '',
        periodId: selectedPeriod,
        jumlahTidakKerja: '',
        jumlahPulangAwal: '',
        jumlahTelat: '',
        jumlahAbsenApel: '',
        jumlahCuti: '',
        keterangan: ''
      });
      
      loadAttendanceRecords();
      
    } catch (error) {
      console.error('❌ Submit attendance error:', error);
      setError(error.response?.data?.message || 'Gagal menyimpan data ketidakhadiran');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteAttendance = async () => {
    if (!attendanceToDelete) return;
    
    setSubmitting(true);
    try {
      await attendanceAPI.delete(attendanceToDelete.id);
      setSuccess(`Data ketidakhadiran ${attendanceToDelete.user.nama} berhasil dihapus`);
      
      setShowDeleteModal(false);
      setAttendanceToDelete(null);
      loadAttendanceRecords();
      
    } catch (error) {
      console.error('❌ Delete attendance error:', error);
      setError('Gagal menghapus data ketidakhadiran');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCreateBulkData = async () => {
    if (!selectedPeriod || !users || users.length === 0) return;
    
    setSubmitting(true);
    setError('');
    setSuccess('');
    
    try {
      const eligibleUsers = users.filter(user => 
        user.role !== 'ADMIN' && 
        user.nama !== 'Administrator System' &&
        user.username !== 'admin' &&
        user.isActive === true
      );

      if (eligibleUsers.length === 0) {
        setError('Tidak ada pegawai yang memenuhi kriteria untuk dibuatkan data ketidakhadiran');
        setSubmitting(false);
        return;
      }

      const bulkData = eligibleUsers.map(user => ({
        userId: user.id,
        periodId: selectedPeriod,
        jumlahTidakKerja: 0,
        jumlahPulangAwal: 0,
        jumlahTelat: 0,
        jumlahAbsenApel: 0,
        jumlahCuti: 0,
        keterangan: 'Data Awal'
      }));

      const createPromises = bulkData.map(data => attendanceAPI.upsert(data));
      await Promise.all(createPromises);
      
      setSuccess(`Berhasil membuat ${eligibleUsers.length} data ketidakhadiran.`);
      loadAttendanceRecords();
      
    } catch (error) {
      console.error('❌ Create bulk data error:', error);
      setError('Gagal membuat data ketidakhadiran bulk');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteAllAttendance = async () => {
    if (!selectedPeriod || !attendanceRecords || attendanceRecords.length === 0) return;
    
    setSubmitting(true);
    try {
      const deletePromises = attendanceRecords.map(attendance => 
        attendanceAPI.delete(attendance.id)
      );
      
      await Promise.all(deletePromises);
      
      setSuccess(`Berhasil menghapus ${attendanceRecords.length} data ketidakhadiran untuk periode ini`);
      setShowDeleteAllModal(false);
      loadAttendanceRecords();
      
    } catch (error) {
      console.error('❌ Delete all attendance error:', error);
      setError('Gagal menghapus semua data ketidakhadiran');
    } finally {
      setSubmitting(false);
    }
  };

  const calculatePresensiScore = (attendance) => {
    return attendance.nilaiPresensi || 0;
  };

  const getDetailPelanggaran = (attendance) => {
    const violations = [];
    if (attendance.adaTidakKerja) violations.push({ type: 'TK', count: attendance.jumlahTidakKerja || 1 });
    if (attendance.adaPulangAwal) violations.push({ type: 'PSW', count: attendance.jumlahPulangAwal || 1 });
    if (attendance.adaTelat) violations.push({ type: 'TLT', count: attendance.jumlahTelat || 1 });
    if (attendance.adaAbsenApel) violations.push({ type: 'APEL', count: attendance.jumlahAbsenApel || 1 });
    if (attendance.adaCuti) violations.push({ type: 'CT', count: attendance.jumlahCuti || 1 });
    
    return violations;
  };

  const getFilteredRecords = () => {
    if (!attendanceRecords) return [];
    
    if (selectedUserFilter && selectedUserFilter.value) {
      return attendanceRecords.filter(record => record.userId === selectedUserFilter.value);
    }
    
    return attendanceRecords;
  };

  const filteredRecords = getFilteredRecords();
  const hasRecords = filteredRecords && filteredRecords.length > 0;

  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '400px' }}>
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="container-fluid p-4 attendance-input-page">
      {/* 🔥 Enhanced Header */}
      <div className="page-header">
        <div className="header-content">
          <div className="header-title">
            <i className="fas fa-calendar-check header-icon"></i>
            <div className="title-section">
              <h2>Rekap  Ketidakhadiran</h2>
              <p className="header-subtitle">Kelola data ketidakhadiran pegawai per periode (Bobot: 40%)</p>
            </div>
          </div>
          <div className="header-actions">
            {hasRecords && (
              <>
                <button 
                  className="btn btn-outline-light" 
                  onClick={() => setShowDeleteAllModal(true)}
                  title="Hapus semua data ketidakhadiran untuk periode ini"
                >
                  <i className="fas fa-trash-alt me-2"></i>Hapus Semua
                </button>
                <button className="btn btn-light" onClick={handleCreateAttendance}>
                  <i className="fas fa-plus me-2"></i>Tambah Data
                </button>
              </>
            )}
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

      {/* 🔥 Enhanced System Info Section */}
      <div className="system-info-section">
        <h6>
          <i className="fas fa-info-circle"></i>
          Sistem Penilaian Ketidakhadiran
        </h6>
        <p>
          Penilaian menggunakan sistem pengurangan progresif dari 100% berdasarkan jumlah dan jenis pelanggaran.
          Setiap jenis pelanggaran memiliki dampak pengurangan yang berbeda.
        </p>
        <div className="violation-types">
          <div className="violation-type">
            <span className="violation-badge tk">TK</span>
            <span className="violation-label">Tanpa Keterangan</span>
          </div>
          <div className="violation-type">
            <span className="violation-badge psw">PSW</span>
            <span className="violation-label">Pulang Awal</span>
          </div>
          <div className="violation-type">
            <span className="violation-badge tlt">TLT</span>
            <span className="violation-label">Telat</span>
          </div>
          <div className="violation-type">
            <span className="violation-badge apel">APEL</span>
            <span className="violation-label">Absen APEL</span>
          </div>
          <div className="violation-type">
            <span className="violation-badge ct">CT</span>
            <span className="violation-label">Cuti</span>
          </div>
        </div>
      </div>

      {/* 🔥 Enhanced Filter Section */}
      <div className="filter-section">
        <div className="filter-header">
          <h6>
            <i className="fas fa-filter"></i>
            Filter & Pencarian Data
          </h6>
        </div>
        <div className="filter-controls">
          <div className="filter-row">
            <div className="filter-group">
              <label>Periode Penilaian *</label>
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
            
            <div className="filter-group">
              <label>Filter Pelanggaran</label>
              <select 
                className="form-select"
                value={violationFilter}
                onChange={(e) => setViolationFilter(e.target.value)}
              >
                <option value="">Semua Data</option>
                <option value="clean">Tanpa Pelanggaran</option>
                <option value="tk">Tanpa Keterangan</option>
                <option value="psw">Pulang Sebelum Waktunya</option>
                <option value="tlt">Telat</option>
                <option value="apel">Absen APEL</option>
                <option value="cuti">Cuti</option>
              </select>
            </div>
            
            <div className="filter-group">
              <label>Cari Pegawai</label>
              <Select
                value={selectedUserFilter}
                onChange={setSelectedUserFilter}
                options={[
                  { value: null, label: 'Semua Pegawai' },
                  ...users.map(user => ({
                    value: user.id,
                    label: `${user.nama} (${user.nip})`,
                    user: user
                  }))
                ]}
                placeholder="Pilih pegawai..."
                isClearable={true}
                isSearchable={true}
                noOptionsMessage={() => "Tidak ada pegawai ditemukan"}
                className="react-select-container"
                classNamePrefix="react-select"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Data Table */}
      {!selectedPeriod ? (
        <div className="empty-state">
          <div className="empty-icon">
            <i className="fas fa-calendar-alt"></i>
          </div>
          <h5>Pilih periode untuk melihat data ketidakhadiran</h5>
          <p>Gunakan dropdown periode di atas untuk memulai</p>
        </div>
      ) : !hasRecords ? (
        // 🔥 Enhanced Empty State with Auto Scroll Reference
        <div className="card border-0 shadow-sm" ref={emptyStateRef}>
          <div className="card-body empty-state empty-state-highlighted">
            <div className="empty-icon">
              <i className="fas fa-inbox"></i>
            </div>
            <h5>Belum ada data ketidakhadiran untuk periode ini</h5>
            <div className="alert alert-warning mt-3 mb-3">
              <i className="fas fa-exclamation-triangle me-2"></i>
              <strong>Perhatian Admin!</strong> Sistem memerlukan data awal untuk dapat beroperasi dengan optimal.
            </div>
            <p>
              Sistem akan membuat data awal untuk semua pegawai dengan nilai default 100%.
              <br />
              <small className="text-info">
                <i className="fas fa-info-circle me-1"></i>
                Administrator sistem akan dikecualikan dari pembuatan data
              </small>
            </p>
            <button 
              className="btn btn-primary-enhanced pulse-effect"
              onClick={handleCreateBulkData}
              disabled={submitting}
            >
              {submitting ? (
                <>
                  <span className="spinner-border spinner-border-sm me-2" role="status"></span>
                  Membuat Data...
                </>
              ) : (
                <>
                  <i className="fas fa-magic me-2"></i>
                  Buat Data Awal Semua Pegawai
                </>
              )}
            </button>
          </div>
        </div>
      ) : (
        <>
          {/* 🔥 Enhanced Table Section (UserManagement Style) */}
          <div className="table-section">
            <div className="table-header">
              <h5>
                <i className="fas fa-table"></i>
                Data Ketidakhadiran - {periods.find(p => p.id === selectedPeriod)?.namaPeriode}
              </h5>
              <div className="table-actions">
                <div className="total-badge">
                  <i className="fas fa-users"></i>
                  <span>Total: {filteredRecords.length}</span>
                </div>
              </div>
            </div>

            <div className="table-responsive">
              <table className="table attendance-table">
                <thead>
                  <tr>
                    <th className="d-none d-md-table-cell">No.</th>
                    <th>Informasi Pegawai</th>
                    <th className="d-none d-lg-table-cell">Jabatan</th>
                    <th>Detail Pelanggaran</th>
                    <th>Nilai Ketidakhadiran</th>
                    <th>Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRecords.map((attendance, index) => (
                    <tr key={attendance.id}>
                      <td className="d-none d-md-table-cell text-center fw-bold text-muted">
                        {index + 1}
                      </td>
                      <td>
                        <div className="employee-info">
                          <div className="employee-name">{attendance.user.nama}</div>
                          <div className="employee-contact">
                            <i className="fas fa-id-card"></i>
                            <span>NIP: {attendance.user.nip}</span>
                          </div>
                        </div>
                      </td>
                      <td className="d-none d-lg-table-cell">
                        <span className="position-badge">
                          {attendance.user.jabatan}
                        </span>
                      </td>
                      <td>
                        <div className="violation-info">
                          <div className="violation-summary">
                            {getDetailPelanggaran(attendance).length > 0 ? (
                              getDetailPelanggaran(attendance).map((violation, index) => (
                                <div 
                                  key={index}
                                  className={`violation-item violation-${violation.type.toLowerCase()}`}
                                >
                                  <span className="violation-code">{violation.type}</span>
                                  <span className="violation-count">{violation.count}</span>
                                </div>
                              ))
                            ) : (
                              <div className="no-violations">
                                <span>Tidak ada pelanggaran</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td>
                        <span className={`score-badge ${
                          calculatePresensiScore(attendance) >= 95 ? 'score-excellent' :
                          calculatePresensiScore(attendance) >= 90 ? 'score-good' :
                          calculatePresensiScore(attendance) >= 80 ? 'score-fair' : 'score-poor'
                        }`}>
                          <span>{calculatePresensiScore(attendance)}%</span>
                        </span>
                      </td>
                      <td>
                        <div className="action-buttons">
                          <button
                            className="btn-action action-edit"
                            onClick={() => handleEditAttendance(attendance)}
                            title="Edit Data"
                          >
                            <i className="fas fa-edit"></i>
                          </button>
                          <button
                            className="btn-action action-delete"
                            onClick={() => {
                              setAttendanceToDelete(attendance);
                              setShowDeleteModal(true);
                            }}
                            title="Hapus Data"
                          >
                            <i className="fas fa-trash"></i>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* Rest of the modals remain the same... */}
      {/* Enhanced Input Modal */}
      {showModal && (
        <div className="modal show d-block modal-enhanced" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-xl">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">
                  <i className="fas fa-clipboard-list me-2"></i>
                  {modalMode === 'create' ? 'Input Data Ketidakhadiran' : 'Edit Data Ketidakhadiran'}
                  <small>Sistem Perhitungan Progresif</small>
                </h5>
                <button type="button" className="btn-close" onClick={() => setShowModal(false)}></button>
              </div>
              <form onSubmit={handleFormSubmit}>
                <div className="modal-body">
                  <div className="row g-4">
                    <div className="col-12">
                      <div className="form-group">
                        <label className="form-label">Pegawai *</label>
                        <SearchableUserSelect
                          users={users}
                          value={formData.userId}
                          onChange={(userId) => {
                            setFormData({...formData, userId});
                          }}
                          placeholder="-- Pilih Pegawai --"
                          disabled={modalMode === 'edit'}
                          required={true}
                          className="mb-2"
                        />
                        {modalMode === 'edit' && selectedAttendance && (
                          <small className="text-info">
                            <i className="fas fa-info-circle me-1"></i>
                            Pegawai tidak dapat diubah saat edit data
                          </small>
                        )}
                      </div>
                    </div>

                    {/* Enhanced System Info */}
                    <div className="col-12">
                      <div className="alert alert-info">
                        <h6 className="alert-heading">
                          <i className="fas fa-calculator me-2"></i>
                          Sistem Perhitungan Ketidakhadiran Progresif
                        </h6>
                        <p>Masukkan jumlah pelanggaran. Sistem akan menghitung pengurangan secara progresif:</p>
                        <div className="row g-2">
                          <div className="col-md-6">
                            <ul className="list-unstyled mb-0 small">
                              <li><strong>Tanpa Keterangan:</strong> 1x = -20%, lebih dari 1x = -30%</li>
                              <li><strong>Cuti:</strong> kurang dari 3 hari = -2.5%, ≥3 hari = -5%</li>
                            </ul>
                          </div>
                          <div className="col-md-6">
                            <ul className="list-unstyled mb-0 small">
                              <li><strong>Pulang Awal/Telat:</strong> 1x = -5%, lebih dari 1x = -10%</li>
                              <li><strong>Absen APEL:</strong> Berapapun = -10%</li>
                            </ul>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Input Fields with Enhanced Design */}
                    <div className="col-md-6">
                      <div className="form-group">
                        <label className="form-label">
                          <span className="badge bg-danger me-2">TK</span>
                          Jumlah Tanpa Keterangan
                        </label>
                        <input
                          type="number"
                          min="0"
                          max="31"
                          className="form-control"
                          value={formData.jumlahTidakKerja}
                          onChange={(e) => {
                            const value = Math.max(0, Math.min(31, parseInt(e.target.value) || 0));
                            setFormData({...formData, jumlahTidakKerja: value.toString()});
                          }}
                          placeholder="0"
                        />
                        <small className="text-muted">1 kali = -20%, lebih dari 1 kali = -30%</small>
                      </div>
                    </div>

                    <div className="col-md-6">
                      <div className="form-group">
                        <label className="form-label">
                          <span className="badge bg-secondary me-2">CT</span>
                          Jumlah Cuti (hari)
                        </label>
                        <input
                          type="number"
                          min="0"
                          max="31"
                          className="form-control"
                          value={formData.jumlahCuti}
                          onChange={(e) => {
                            const value = Math.max(0, Math.min(31, parseInt(e.target.value) || 0));
                            setFormData({...formData, jumlahCuti: value.toString()});
                          }}
                          placeholder="0"
                        />
                        <small className="text-muted">Kurang dari 3 hari = -2.5%, 3 hari atau lebih = -5%</small>
                      </div>
                    </div>

                    <div className="col-md-6">
                      <div className="form-group">
                        <label className="form-label">
                          <span className="badge bg-warning text-dark me-2">PSW</span>
                          Jumlah Pulang Sebelum Waktunya
                        </label>
                        <input
                          type="number"
                          min="0"
                          max="31"
                          className="form-control"
                          value={formData.jumlahPulangAwal}
                          onChange={(e) => {
                            const value = Math.max(0, Math.min(31, parseInt(e.target.value) || 0));
                            setFormData({...formData, jumlahPulangAwal: value.toString()});
                          }}
                          placeholder="0"
                        />
                        <small className="text-muted">1 kali = -5%, lebih dari 1 kali = -10%</small>
                      </div>
                    </div>

                    <div className="col-md-6">
                      <div className="form-group">
                        <label className="form-label">
                          <span className="badge bg-warning text-dark me-2">TLT</span>
                          Jumlah Telat
                        </label>
                        <input
                          type="number"
                          min="0"
                          max="31"
                          className="form-control"
                          value={formData.jumlahTelat}
                          onChange={(e) => {
                            const value = Math.max(0, Math.min(31, parseInt(e.target.value) || 0));
                            setFormData({...formData, jumlahTelat: value.toString()});
                          }}
                          placeholder="0"
                        />
                        <small className="text-muted">1 kali = -5%, lebih dari 1 kali = -10%</small>
                      </div>
                    </div>

                    <div className="col-md-6">
                      <div className="form-group">
                        <label className="form-label">
                          <span className="badge bg-info me-2">APEL</span>
                          Jumlah Absen APEL
                        </label>
                        <input
                          type="number"
                          min="0"
                          max="31"
                          className="form-control"
                          value={formData.jumlahAbsenApel}
                          onChange={(e) => {
                            const value = Math.max(0, Math.min(31, parseInt(e.target.value) || 0));
                            setFormData({...formData, jumlahAbsenApel: value.toString()});
                          }}
                          placeholder="0"
                        />
                        <small className="text-muted">Berapapun jumlahnya = -10%</small>
                      </div>
                    </div>



                    {/* Preview Calculation */}
                    <div className="col-12">
                      <div className="alert alert-success">
                        <h6>
                          <i className="fas fa-calculator me-2"></i>
                          Preview Nilai Ketidakhadiran (Sistem Progresif)
                        </h6>
                        <div className="preview-calculation">
                          <span className="badge bg-light text-dark">Start: 100%</span>
                          
                          {parseInt(formData.jumlahTidakKerja) > 0 && (
                            <span className="badge bg-danger">
                              -{parseInt(formData.jumlahTidakKerja) === 1 ? '20%' : '30%'} TK
                            </span>
                          )}
                          
                          {parseInt(formData.jumlahCuti) > 0 && (
                            <span className="badge bg-secondary">
                              -{parseInt(formData.jumlahCuti) < 3 ? '2.5%' : '5%'} CT
                            </span>
                          )}
                          
                          {parseInt(formData.jumlahPulangAwal) > 0 && (
                            <span className="badge bg-warning">
                              -{parseInt(formData.jumlahPulangAwal) === 1 ? '5%' : '10%'} PSW
                            </span>
                          )}
                          
                          {parseInt(formData.jumlahTelat) > 0 && (
                            <span className="badge bg-warning">
                              -{parseInt(formData.jumlahTelat) === 1 ? '5%' : '10%'} TLT
                            </span>
                          )}
                          
                          {parseInt(formData.jumlahAbsenApel) > 0 && (
                            <span className="badge bg-info">
                              -10% APEL
                            </span>
                          )}
                          
                          <div className="ms-auto">
                            <i className="fas fa-arrow-right me-2"></i>
                            <span className={`badge fs-5 ${
                              calculatePreviewScore(
                                formData.jumlahTidakKerja,
                                formData.jumlahPulangAwal,
                                formData.jumlahTelat,
                                formData.jumlahAbsenApel,
                                formData.jumlahCuti
                              ) >= 95 ? 'bg-success' :
                              calculatePreviewScore(
                                formData.jumlahTidakKerja,
                                formData.jumlahPulangAwal,
                                formData.jumlahTelat,
                                formData.jumlahAbsenApel,
                                formData.jumlahCuti
                              ) >= 90 ? 'bg-primary' :
                              calculatePreviewScore(
                                formData.jumlahTidakKerja,
                                formData.jumlahPulangAwal,
                                formData.jumlahTelat,
                                formData.jumlahAbsenApel,
                                formData.jumlahCuti
                              ) >= 80 ? 'bg-warning' : 'bg-danger'
                            }`}>
                              {calculatePreviewScore(
                                formData.jumlahTidakKerja,
                                formData.jumlahPulangAwal,
                                formData.jumlahTelat,
                                formData.jumlahAbsenApel,
                                formData.jumlahCuti
                              )}%
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>
                    <i className="fas fa-times me-2"></i>Batal
                  </button>
                  <button type="submit" className="btn btn-primary" disabled={submitting || !formData.userId}>
                    {submitting ? (
                      <>
                        <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                        Menyimpan...
                      </>
                    ) : (
                      <>
                        <i className="fas fa-save me-2"></i>
                        {modalMode === 'create' ? 'Simpan Data' : 'Update Data'}
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Enhanced Delete All Modal */}
      {showDeleteAllModal && (
        <div className="modal show d-block modal-enhanced" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog">
            <div className="modal-content delete-modal">
              <div className="modal-header">
                <h5 className="modal-title">
                  <i className="fas fa-exclamation-triangle me-2"></i>
                  Konfirmasi Hapus Semua Data
                </h5>
                <button type="button" className="btn-close" onClick={() => setShowDeleteAllModal(false)}></button>
              </div>
              <div className="modal-body">
                <div className="alert alert-warning">
                  <i className="fas fa-exclamation-triangle me-2"></i>
                  <strong>Peringatan!</strong> Tindakan ini akan menghapus SEMUA data ketidakhadiran untuk periode ini dan tidak dapat dibatalkan.
                </div>

                <p className="mb-3">Apakah Anda yakin ingin menghapus <strong>SEMUA DATA KETIDAKHADIRAN</strong> untuk periode ini?</p>

                <div className="bg-light p-3 rounded">
                  <div className="row">
                    <div className="col-sm-4"><strong>Periode:</strong></div>
                    <div className="col-sm-8">{periods.find(p => p.id === selectedPeriod)?.namaPeriode}</div>
                  </div>
                  <div className="row">
                    <div className="col-sm-4"><strong>Total Record:</strong></div>
                    <div className="col-sm-8">{filteredRecords ? filteredRecords.length : 0} data ketidakhadiran</div>
                  </div>
                  <div className="row">
                    <div className="col-sm-4"><strong>Pegawai Terdampak:</strong></div>
                    <div className="col-sm-8">{filteredRecords ? filteredRecords.length : 0} pegawai</div>
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button 
                  type="button" 
                  className="btn btn-secondary" 
                  onClick={() => setShowDeleteAllModal(false)}
                  disabled={submitting}
                >
                  <i className="fas fa-times me-2"></i>Batal
                </button>
                <button 
                  type="button" 
                  className="btn btn-danger" 
                  onClick={handleDeleteAllAttendance}
                  disabled={submitting}
                >
                  {submitting ? (
                    <>
                      <span className="spinner-border spinner-border-sm me-2" role="status"></span>
                      Menghapus...
                    </>
                  ) : (
                    <>
                      <i className="fas fa-trash-alt me-2"></i>
                      Ya, Hapus Semua
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Enhanced Delete Single Modal */}
      {showDeleteModal && attendanceToDelete && (
        <div className="modal show d-block modal-enhanced" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog">
            <div className="modal-content delete-modal">
              <div className="modal-header">
                <h5 className="modal-title">
                  <i className="fas fa-trash me-2"></i>
                  Konfirmasi Hapus Data
                </h5>
                <button type="button" className="btn-close" onClick={() => {
                  setShowDeleteModal(false);
                  setAttendanceToDelete(null);
                }}></button>
              </div>
              <div className="modal-body">
                <div className="alert alert-warning">
                  <i className="fas fa-exclamation-triangle me-2"></i>
                  <strong>Peringatan!</strong> Tindakan ini akan menghapus data ketidakhadiran pegawai dan tidak dapat dibatalkan.
                </div>

                <p className="mb-3">Apakah Anda yakin ingin menghapus data ketidakhadiran untuk:</p>

                <div className="bg-light p-3 rounded">
                  <div className="row">
                    <div className="col-sm-4"><strong>Nama:</strong></div>
                    <div className="col-sm-8">{attendanceToDelete.user.nama}</div>
                  </div>
                  <div className="row">
                    <div className="col-sm-4"><strong>NIP:</strong></div>
                    <div className="col-sm-8">{attendanceToDelete.user.nip}</div>
                  </div>
                  <div className="row">
                    <div className="col-sm-4"><strong>Periode:</strong></div>
                    <div className="col-sm-8">{attendanceToDelete.period?.namaPeriode}</div>
                  </div>
                  <div className="row">
                    <div className="col-sm-4"><strong>Nilai Ketidakhadiran:</strong></div>
                    <div className="col-sm-8">
                      <span className="badge bg-primary">{attendanceToDelete.nilaiPresensi}%</span>
                    </div>
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button 
                  type="button" 
                  className="btn btn-secondary" 
                  onClick={() => {
                    setShowDeleteModal(false);
                    setAttendanceToDelete(null);
                  }}
                  disabled={submitting}
                >
                  <i className="fas fa-times me-2"></i>Batal
                </button>
                <button 
                  type="button" 
                  className="btn btn-danger" 
                  onClick={handleDeleteAttendance}
                  disabled={submitting}
                >
                  {submitting ? (
                    <>
                      <span className="spinner-border spinner-border-sm me-2" role="status"></span>
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