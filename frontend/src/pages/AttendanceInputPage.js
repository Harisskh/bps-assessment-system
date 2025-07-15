// src/pages/AttendanceInputPage.js - FIXED VERSION
import React, { useState, useEffect } from 'react';
import Select from 'react-select';
import { attendanceAPI, periodAPI, userAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import SearchableUserSelect from '../components/SearchableUserSelect';

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
  
  // Filters - FIXED: Using react-select for user search
  const [selectedPeriod, setSelectedPeriod] = useState('');
  const [violationFilter, setViolationFilter] = useState('');
  const [selectedUserFilter, setSelectedUserFilter] = useState(null); // react-select value
  
  // Modal states
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState('create');
  const [selectedAttendance, setSelectedAttendance] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [attendanceToDelete, setAttendanceToDelete] = useState(null);
  const [showDeleteAllModal, setShowDeleteAllModal] = useState(false);
  
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

  // FIXED: Remove debounce functions - not needed with react-select

  useEffect(() => {
    loadInitialData();
  }, []);

  useEffect(() => {
    if (selectedPeriod) {
      loadAttendanceRecords();
    }
  }, [selectedPeriod, violationFilter]); // FIXED: Remove selectedUserFilter from dependency

  const loadInitialData = async () => {
    try {
      setLoading(true);
      setError('');
      
      console.log('🔄 Loading initial data...');
      
      const [periodsRes, usersRes] = await Promise.all([
        periodAPI.getAll({ limit: 50 }),
        userAPI.getAll({ limit: 100, role: '', status: '' })
      ]);

      console.log('📥 Periods received:', periodsRes.data.data.periods?.length || 0);
      console.log('👥 Users received:', usersRes.data.data.users?.length || 0);

      setPeriods(periodsRes.data.data.periods || []);
      
      // FIXED: Filter active users dan pastikan data lengkap
      const activeUsers = (usersRes.data.data.users || []).filter(u => u.isActive && u.nama && u.nip);
      setUsers(activeUsers);
      
      console.log('✅ Active users set:', activeUsers.length);

      const activePeriod = periodsRes.data.data.periods?.find(p => p.isActive);
      if (activePeriod) {
        setSelectedPeriod(activePeriod.id);
        console.log('📅 Active period set:', activePeriod.namaPeriode);
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

      console.log('🔄 Loading attendance records with params:', params);

      const response = await attendanceAPI.getAll(params);
      let records = response.data.data.attendances || [];

      console.log('📥 Attendance records received:', records.length);

      // FIXED: Remove user filter from here - will be done in render
      // Apply violation filter only
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
      
      console.log('✅ Final records after filters:', records.length);
      setAttendanceRecords(records);
      
    } catch (error) {
      console.error('❌ Load attendance records error:', error);
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
        adaTidakKerja: jumlahTK > 0,
        adaPulangAwal: jumlahPSW > 0,
        adaTelat: jumlahTLT > 0,
        adaAbsenApel: jumlahAPEL > 0,
        adaCuti: jumlahCT > 0,
        keterangan: formData.keterangan
      };

      console.log('💾 Submitting data:', submitData);

      await attendanceAPI.upsert(submitData);
      setSuccess(modalMode === 'create' ? 
        'Data presensi berhasil ditambahkan' : 
        'Data presensi berhasil diperbarui');
      
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
      setError(error.response?.data?.message || 'Gagal menyimpan data presensi');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteAttendance = async () => {
    if (!attendanceToDelete) return;
    
    setSubmitting(true);
    try {
      await attendanceAPI.delete(attendanceToDelete.id);
      setSuccess(`Data presensi ${attendanceToDelete.user.nama} berhasil dihapus`);
      
      setShowDeleteModal(false);
      setAttendanceToDelete(null);
      loadAttendanceRecords();
      
    } catch (error) {
      console.error('❌ Delete attendance error:', error);
      setError('Gagal menghapus data presensi');
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
        setError('Tidak ada pegawai yang memenuhi kriteria untuk dibuatkan data presensi');
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
        adaTidakKerja: false,
        adaPulangAwal: false,
        adaTelat: false,
        adaAbsenApel: false,
        adaCuti: false,
        keterangan: 'Tidak Ada Keterangan'
      }));

      const createPromises = bulkData.map(data => attendanceAPI.upsert(data));
      await Promise.all(createPromises);
      
      setSuccess(`Berhasil membuat ${eligibleUsers.length} data presensi.`);
      loadAttendanceRecords();
      
    } catch (error) {
      console.error('❌ Create bulk data error:', error);
      setError('Gagal membuat data presensi bulk');
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
      
      setSuccess(`Berhasil menghapus ${attendanceRecords.length} data presensi untuk periode ini`);
      setShowDeleteAllModal(false);
      loadAttendanceRecords();
      
    } catch (error) {
      console.error('❌ Delete all attendance error:', error);
      setError('Gagal menghapus semua data presensi');
    } finally {
      setSubmitting(false);
    }
  };

  const calculatePresensiScore = (attendance) => {
    return attendance.nilaiPresensi || 0;
  };

  const getDetailPelanggaran = (attendance) => {
    const violations = [];
    if (attendance.adaTidakKerja) violations.push(`TK: ${attendance.jumlahTidakKerja || 1}`);
    if (attendance.adaPulangAwal) violations.push(`PSW: ${attendance.jumlahPulangAwal || 1}`);
    if (attendance.adaTelat) violations.push(`TLT: ${attendance.jumlahTelat || 1}`);
    if (attendance.adaAbsenApel) violations.push(`APEL: ${attendance.jumlahAbsenApel || 1}`);
    if (attendance.adaCuti) violations.push(`Cuti: ${attendance.jumlahCuti || 1}`);
    
    return violations.length > 0 ? violations.join(', ') : 'Tidak ada pelanggaran';
  };

  // FIXED: Client-side filter for user search (no API call)
  const getFilteredRecords = () => {
    if (!attendanceRecords) return [];
    
    // Apply user filter on the client side
    if (selectedUserFilter && selectedUserFilter.value) {
      return attendanceRecords.filter(record => record.userId === selectedUserFilter.value);
    }
    
    return attendanceRecords;
  };

  const filteredRecords = getFilteredRecords();

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
    <div className="container-fluid">
      <div className="row">
        <div className="col-12">
          <div className="d-flex justify-content-between align-items-center mb-4">
            <div>
              <h2>Input Data Presensi</h2>
              <p className="text-muted">Kelola data presensi pegawai per periode (Bobot: 40%)</p>
            </div>
            <div className="d-flex gap-2">
              {selectedPeriod && filteredRecords && filteredRecords.length > 0 && (
                <button 
                  className="btn btn-outline-danger" 
                  onClick={() => setShowDeleteAllModal(true)}
                  title="Hapus semua data presensi untuk periode ini"
                >
                  <i className="fas fa-trash-alt me-2"></i>Hapus Semua
                </button>
              )}
              <button className="btn btn-primary" onClick={handleCreateAttendance}>
                <i className="fas fa-plus me-2"></i>Input Presensi
              </button>
            </div>
          </div>

          {/* Alert Messages */}
          {error && (
            <div className="alert alert-danger alert-dismissible fade show" role="alert">
              {error}
              <button type="button" className="btn-close" onClick={() => setError('')}></button>
            </div>
          )}
          
          {success && (
            <div className="alert alert-success alert-dismissible fade show" role="alert">
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
                <div className="col-md-12">
                  <p className="card-text text-muted mb-4">
                    Penilaian presensi menggunakan sistem pengurangan dari 100% berdasarkan jenis pelanggaran.
                    Input berupa angka jumlah pelanggaran, namun pengurangan tetap maksimal per kategori.
                  </p>
                  <div className="row text-sm">
                    <div className="col-md-2 mb-2 fw-bold"><span className="badge bg-danger fs-6">TK: -30%</span> Tidak Kerja</div>
                    <div className="col-md-3 mb-2 fw-bold"><span className="badge bg-warning text-dark fs-6">PSW: -10%</span> Pulang Sebelum Waktunya</div>
                    <div className="col-md-2 mb-2 fw-bold"><span className="badge bg-warning text-dark fs-6">TLT: -10%</span> Telat</div>
                    <div className="col-md-2 mb-2 fw-bold"><span className="badge bg-info fs-6">APEL: -10%</span> Absen APEL</div>
                    <div className="col-md-2 mb-2 fw-bold"><span className="badge bg-secondary fs-6">CT: -5%</span> Cuti</div>
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
                
                <div className="col-md-4">
                  <label className="form-label">Filter Pelanggaran</label>
                  <select 
                    className="form-select"
                    value={violationFilter}
                    onChange={(e) => setViolationFilter(e.target.value)}
                  >
                    <option value="">Semua Data</option>
                    <option value="clean">Tanpa Pelanggaran</option>
                    <option value="tk">Tidak Kerja</option>
                    <option value="psw">Pulang Sebelum Waktunya</option>
                    <option value="tlt">Telat</option>
                    <option value="apel">Absen APEL</option>
                    <option value="cuti">Cuti</option>
                  </select>
                </div>
                
                {/* FIXED: React-Select for user search filter */}
                <div className="col-md-4">
                  <label className="form-label">Cari Pegawai</label>
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
                    styles={{
                      control: (provided, state) => ({
                        ...provided,
                        minHeight: '38px',
                        borderColor: state.isFocused ? '#0d6efd' : '#ced4da',
                        boxShadow: state.isFocused ? '0 0 0 0.25rem rgba(13, 110, 253, 0.25)' : 'none',
                        '&:hover': {
                          borderColor: state.isFocused ? '#0d6efd' : '#adb5bd'
                        }
                      }),
                      menu: (provided) => ({
                        ...provided,
                        zIndex: 9999 // Even higher z-index
                      }),
                      menuPortal: (provided) => ({
                        ...provided,
                        zIndex: 9999
                      }),
                      option: (provided, state) => ({
                        ...provided,
                        fontSize: '0.9rem',
                        padding: '0.5rem 0.75rem'
                      })
                    }}
                    menuPortalTarget={document.body} // Portal to body to avoid z-index issues
                    components={{
                      Option: ({ innerProps, label, data }) => (
                        <div {...innerProps} style={{ padding: '0.5rem 0.75rem', cursor: 'pointer' }}>
                          {data.user ? (
                            <div>
                              <div style={{ fontWeight: '600', fontSize: '0.9rem' }}>
                                {data.user.nama}
                              </div>
                              <div style={{ fontSize: '0.75rem', color: '#6c757d' }}>
                                NIP: {data.user.nip} • {data.user.jabatan || 'Staff'}
                              </div>
                            </div>
                          ) : (
                            <div style={{ fontStyle: 'italic', color: '#6c757d' }}>
                              {label}
                            </div>
                          )}
                        </div>
                      )
                    }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Data Table - FIXED: Remove card wrapper and make sticky header */}
          {!selectedPeriod ? (
            <div className="text-center py-5">
              <i className="fas fa-calendar-alt fa-3x text-muted mb-3"></i>
              <h5 className="text-muted">Pilih periode untuk melihat data presensi</h5>
            </div>
          ) : filteredRecords && filteredRecords.length === 0 ? (
            <div className="text-center py-5">
              <i className="fas fa-inbox fa-3x text-muted mb-3"></i>
              <h5 className="text-muted">Belum ada data presensi untuk periode ini</h5>
              <p className="text-muted">Klik tombol di bawah untuk membuat data presensi untuk semua pegawai dengan nilai default 100%</p>
              <p className="text-muted"><small><i className="fas fa-info-circle me-1"></i>Administrator dan akun sistem akan dikecualikan dari pembuatan bulk data</small></p>
              <button className="btn btn-primary mt-3" onClick={handleCreateBulkData}>
                <i className="fas fa-magic me-2"></i>Buat Data Awal
              </button>
            </div>
          ) : (
            <>
              {/* Table Header - Fixed position */}
              <div className="bg-white border-bottom mb-3 pb-2">
                <h5 className="mb-0">
                  <i className="fas fa-table me-2 text-primary"></i>
                  Data Presensi - {periods.find(p => p.id === selectedPeriod)?.namaPeriode}
                  <span className="badge bg-primary ms-2">{filteredRecords.length} pegawai</span>
                </h5>
              </div>

              {/* Table without card wrapper - Full height table */}
              <div className="table-responsive">
                <table className="table table-hover table-striped">
                  <thead className="table-dark">
                    <tr>
                      <th>NIP</th>
                      <th>Nama Pegawai</th>
                      <th>Jabatan</th>
                      <th>Detail Pelanggaran</th>
                      <th>Nilai Presensi</th>
                      <th>Keterangan</th>
                      <th>Aksi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredRecords && filteredRecords.map((attendance) => (
                      <tr key={attendance.id}>
                        <td className='text-dark'>{attendance.user.nip}</td>
                        <td className="text-dark fw-semibold">{attendance.user.nama}</td>
                        <td><small>{attendance.user.jabatan}</small></td>
                        <td>
                          <small className="text-muted">
                            {getDetailPelanggaran(attendance)}
                          </small>
                        </td>
                        <td>
                          <span className={`badge fs-6 ${calculatePresensiScore(attendance) >= 90 ? 
                            'bg-success' : calculatePresensiScore(attendance) >= 80 ? 'bg-warning text-dark' : 'bg-danger'}`}>
                            {calculatePresensiScore(attendance)}%
                          </span>
                        </td>
                        <td><small>{attendance.keterangan}</small></td>
                        <td>
                          <div className="d-flex gap-1">
                            <button
                              className="btn btn-sm btn-outline-primary"
                              onClick={() => handleEditAttendance(attendance)}
                              title="Edit"
                            >
                              <i className="fas fa-edit"></i>
                            </button>
                            <button
                              className="btn btn-sm btn-outline-danger"
                              onClick={() => {
                                setAttendanceToDelete(attendance);
                                setShowDeleteModal(true);
                              }}
                              title="Hapus"
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
            </>
          )}
        </div>
      </div>

      {/* Input Modal - FIXED VERSION */}
      {showModal && (
        <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-lg">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">
                  {modalMode === 'create' ? 'Input Data Presensi' : 'Edit Data Presensi'}
                </h5>
                <button type="button" className="btn-close" onClick={() => setShowModal(false)}></button>
              </div>
              <form onSubmit={handleFormSubmit}>
                <div className="modal-body">
                  <div className="row g-3">
                    <div className="col-12">
                      <label className="form-label">Pegawai *</label>
                      {/* FIXED: Debug info dan better error handling */}
                      {users.length === 0 && (
                        <div className="alert alert-warning">
                          <i className="fas fa-exclamation-triangle me-2"></i>
                          Data pegawai belum dimuat. Silakan refresh halaman.
                        </div>
                      )}
                      <SearchableUserSelect
                        users={users}
                        value={formData.userId}
                        onChange={(userId) => {
                          console.log('🔄 User selected:', userId);
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
                      
                      {/* DEBUG INFO - Remove in production */}
                      <small className="text-muted d-block mt-1">
                        Debug: {users.length} pegawai tersedia, Selected: {formData.userId || 'none'}
                      </small>
                    </div>

                    <div className="col-12">
                      <h6 className="text-muted">Jenis Pelanggaran Presensi</h6>
                      <p><small className="text-muted">Masukkan jumlah pelanggaran. Pengurangan nilai tetap maksimal per kategori.</small></p>
                    </div>

                    {/* Number inputs dengan improved handling */}
                    <div className="col-md-6">
                      <label className="form-label text-danger">
                        <span className="badge bg-danger me-2">-30%</span>
                        Jumlah Tidak Kerja
                      </label>
                      <input
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        className="form-control"
                        value={formData.jumlahTidakKerja}
                        onChange={(e) => {
                          const value = e.target.value.replace(/[^0-9]/g, '');
                          const numValue = parseInt(value) || 0;
                          if (numValue <= 31) {
                            setFormData({...formData, jumlahTidakKerja: value});
                          }
                        }}
                        placeholder="0"
                        maxLength="2"
                        onWheel={(e) => e.target.blur()}
                      />
                      <small className="text-muted">Tidak masuk kerja tanpa keterangan</small>
                    </div>

                    <div className="col-md-6">
                      <label className="form-label text-warning">
                        <span className="badge bg-warning text-dark me-2">-10%</span>
                        Jumlah Pulang Sebelum Waktunya
                      </label>
                      <input
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        className="form-control"
                        value={formData.jumlahPulangAwal}
                        onChange={(e) => {
                          const value = e.target.value.replace(/[^0-9]/g, '');
                          const numValue = parseInt(value) || 0;
                          if (numValue <= 31) {
                            setFormData({...formData, jumlahPulangAwal: value});
                          }
                        }}
                        placeholder="0"
                        maxLength="2"
                        onWheel={(e) => e.target.blur()}
                      />
                      <small className="text-muted">Pulang sebelum jam kerja selesai</small>
                    </div>

                    <div className="col-md-6">
                      <label className="form-label text-warning">
                        <span className="badge bg-warning text-dark me-2">-10%</span>
                        Jumlah Telat
                      </label>
                      <input
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        className="form-control"
                        value={formData.jumlahTelat}
                        onChange={(e) => {
                          const value = e.target.value.replace(/[^0-9]/g, '');
                          const numValue = parseInt(value) || 0;
                          if (numValue <= 31) {
                            setFormData({...formData, jumlahTelat: value});
                          }
                        }}
                        placeholder="0"
                        maxLength="2"
                        onWheel={(e) => e.target.blur()}
                      />
                      <small className="text-muted">Terlambat datang kerja</small>
                    </div>

                    <div className="col-md-6">
                      <label className="form-label text-info">
                        <span className="badge bg-info me-2">-10%</span>
                        Jumlah Absen APEL
                      </label>
                      <input
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        className="form-control"
                        value={formData.jumlahAbsenApel}
                        onChange={(e) => {
                          const value = e.target.value.replace(/[^0-9]/g, '');
                          const numValue = parseInt(value) || 0;
                          if (numValue <= 31) {
                            setFormData({...formData, jumlahAbsenApel: value});
                          }
                        }}
                        placeholder="0"
                        maxLength="2"
                        onWheel={(e) => e.target.blur()}
                      />
                      <small className="text-muted">Tidak mengikuti apel pagi</small>
                    </div>

                    <div className="col-md-6">
                      <label className="form-label text-secondary">
                        <span className="badge bg-secondary me-2">-5%</span>
                        Jumlah Cuti
                      </label>
                      <input
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        className="form-control"
                        value={formData.jumlahCuti}
                        onChange={(e) => {
                          const value = e.target.value.replace(/[^0-9]/g, '');
                          const numValue = parseInt(value) || 0;
                          if (numValue <= 31) {
                            setFormData({...formData, jumlahCuti: value});
                          }
                        }}
                        placeholder="0"
                        maxLength="2"
                        onWheel={(e) => e.target.blur()}
                      />
                      <small className="text-muted">Mengambil cuti dalam periode ini</small>
                    </div>

                    <div className="col-12">
                      <label className="form-label">Keterangan</label>
                      <textarea
                        className="form-control"
                        rows="3"
                        value={formData.keterangan}
                        onChange={(e) => setFormData({...formData, keterangan: e.target.value})}
                        placeholder="Keterangan tambahan..."
                      />
                    </div>

                    {/* Preview Nilai */}
                    <div className="col-12">
                      <div className="alert alert-info">
                        <h6><i className="fas fa-calculator me-2"></i>Preview Nilai Presensi</h6>
                        <div className="d-flex align-items-center flex-wrap">
                          <span className="me-3">100%</span>
                          {parseInt(formData.jumlahTidakKerja) > 0 && (
                            <span className="me-2 mb-1">
                              <span className="badge bg-danger me-1">-30%</span>
                              TK ({parseInt(formData.jumlahTidakKerja)}x)
                            </span>
                          )}
                          {parseInt(formData.jumlahPulangAwal) > 0 && (
                            <span className="me-2 mb-1">
                              <span className="badge bg-warning text-dark me-1">-10%</span>
                              PSW ({parseInt(formData.jumlahPulangAwal)}x)
                            </span>
                          )}
                          {parseInt(formData.jumlahTelat) > 0 && (
                            <span className="me-2 mb-1">
                              <span className="badge bg-warning text-dark me-1">-10%</span>
                              TLT ({parseInt(formData.jumlahTelat)}x)
                            </span>
                          )}
                          {parseInt(formData.jumlahAbsenApel) > 0 && (
                            <span className="me-2 mb-1">
                              <span className="badge bg-info me-1">-10%</span>
                              APEL ({parseInt(formData.jumlahAbsenApel)}x)
                            </span>
                          )}
                          {parseInt(formData.jumlahCuti) > 0 && (
                            <span className="me-2 mb-1">
                              <span className="badge bg-secondary me-1">-5%</span>
                              CT ({parseInt(formData.jumlahCuti)}x)
                            </span>
                          )}
                          <span className="fw-bold text-primary ms-auto">
                            = {100 - ((parseInt(formData.jumlahTidakKerja) > 0 ? 30 : 0) + 
                                     (parseInt(formData.jumlahPulangAwal) > 0 ? 10 : 0) + 
                                     (parseInt(formData.jumlahTelat) > 0 ? 10 : 0) + 
                                     (parseInt(formData.jumlahAbsenApel) > 0 ? 10 : 0) + 
                                     (parseInt(formData.jumlahCuti) > 0 ? 5 : 0))}%
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>
                    Batal
                  </button>
                  <button type="submit" className="btn btn-primary" disabled={submitting || !formData.userId}>
                    {submitting ? (
                      <>
                        <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                        Menyimpan...
                      </>
                    ) : (
                      modalMode === 'create' ? 'Simpan' : 'Update'
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Delete All Confirmation Modal */}
      {showDeleteAllModal && (
        <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header bg-danger text-white">
                <h5 className="modal-title">
                  <i className="fas fa-exclamation-triangle me-2"></i>
                  Konfirmasi Hapus Semua Data
                </h5>
                <button type="button" className="btn-close btn-close-white" onClick={() => {
                  setShowDeleteAllModal(false);
                }}></button>
              </div>
              <div className="modal-body">
                <div className="alert alert-warning">
                  <i className="fas fa-exclamation-triangle me-2"></i>
                  <strong>Peringatan!</strong> Tindakan ini akan menghapus SEMUA data presensi untuk periode ini dan tidak dapat dibatalkan.
                </div>
                
                <p>Apakah Anda yakin ingin menghapus <strong>SEMUA DATA PRESENSI</strong> untuk periode ini?</p>
                
                <div className="bg-light p-3 rounded">
                  <strong>Periode:</strong> {periods.find(p => p.id === selectedPeriod)?.namaPeriode}<br/>
                  <strong>Total Record:</strong> {filteredRecords ? filteredRecords.length : 0} data presensi<br/>
                  <strong>Pegawai Terdampak:</strong> {filteredRecords ? filteredRecords.length : 0} pegawai
                </div>
                
                <div className="mt-3">
                  <h6 className="text-danger">Data yang akan dihapus:</h6>
                  <div className="border rounded p-2" style={{ maxHeight: '150px', overflowY: 'auto' }}>
                    {filteredRecords && filteredRecords.slice(0, 10).map((attendance, index) => (
                      <div key={attendance.id} className="d-flex justify-content-between py-1">
                        <small>{attendance.user.nama}</small>
                        <small className="text-muted">{attendance.user.nip}</small>
                      </div>
                    ))}
                    {filteredRecords && filteredRecords.length > 10 && (
                      <div className="text-center py-1">
                        <small className="text-muted">... dan {filteredRecords.length - 10} pegawai lainnya</small>
                      </div>
                    )}
                  </div>
                </div>
                
                <p className="text-danger mt-3 mb-0">
                  <strong>Data yang dihapus tidak dapat dikembalikan. Pastikan Anda telah membuat backup jika diperlukan.</strong>
                </p>
              </div>
              <div className="modal-footer">
                <button 
                  type="button" 
                  className="btn btn-secondary" 
                  onClick={() => setShowDeleteAllModal(false)}
                  disabled={submitting}
                >
                  Batal
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
                      Menghapus {filteredRecords ? filteredRecords.length : 0} Data...
                    </>
                  ) : (
                    <>
                      <i className="fas fa-trash-alt me-2"></i>
                      Ya, Hapus Semua {filteredRecords ? filteredRecords.length : 0} Data
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Single Confirmation Modal */}
      {showDeleteModal && attendanceToDelete && (
        <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header bg-danger text-white">
                <h5 className="modal-title">Konfirmasi Hapus Data</h5>
                <button type="button" className="btn-close btn-close-white" onClick={() => {
                  setShowDeleteModal(false);
                  setAttendanceToDelete(null);
                }}></button>
              </div>
              <div className="modal-body">
                <div className="alert alert-warning">
                  <i className="fas fa-exclamation-triangle me-2"></i>
                  <strong>Peringatan!</strong> Tindakan ini akan menghapus data presensi pegawai dan tidak dapat dibatalkan.
                </div>
                
                <p>Apakah Anda yakin ingin menghapus data presensi untuk:</p>
                
                <div className="bg-light p-3 rounded">
                  <strong>Nama:</strong> {attendanceToDelete.user.nama}<br/>
                  <strong>NIP:</strong> {attendanceToDelete.user.nip}<br/>
                  <strong>Periode:</strong> {attendanceToDelete.period?.namaPeriode}<br/>
                  <strong>Nilai Presensi:</strong> {attendanceToDelete.nilaiPresensi}%
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
                      <span className="spinner-border spinner-border-sm me-2" role="status"></span>
                      Menghapus...
                    </>
                  ) : (
                    'Ya, Hapus Data'
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