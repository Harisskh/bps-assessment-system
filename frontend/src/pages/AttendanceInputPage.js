// src/pages/AttendanceInputPage.js - UPDATED WITH NEW CALCULATION SYSTEM
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

  // 🔥 NEW: Calculate preview score with new rules
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
      
      console.log('🔄 Loading initial data...');
      
      const [periodsRes, usersRes] = await Promise.all([
        periodAPI.getAll({ limit: 50 }),
        userAPI.getAll({ limit: 100, role: '', status: '' })
      ]);

      console.log('📥 Periods received:', periodsRes.data.data.periods?.length || 0);
      console.log('👥 Users received:', usersRes.data.data.users?.length || 0);

      setPeriods(periodsRes.data.data.periods || []);
      
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
      
      console.log('✅ Final records after filters:', records.length);
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

      console.log('💾 Submitting data:', submitData);

      const response = await attendanceAPI.upsert(submitData);
      
      console.log('✅ Response:', response.data);
      
      setSuccess(modalMode === 'create' ? 
        'Data ketidakhadiran berhasil ditambahkan dengan sistem perhitungan baru' : 
        'Data ketidakhadiran berhasil diperbarui dengan sistem perhitungan baru');
      
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
        keterangan: 'Tidak Ada Keterangan'
      }));

      const createPromises = bulkData.map(data => attendanceAPI.upsert(data));
      await Promise.all(createPromises);
      
      setSuccess(`Berhasil membuat ${eligibleUsers.length} data ketidakhadiran dengan sistem perhitungan baru.`);
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
    if (attendance.adaTidakKerja) violations.push(`TK: ${attendance.jumlahTidakKerja || 1}`);
    if (attendance.adaPulangAwal) violations.push(`PSW: ${attendance.jumlahPulangAwal || 1}`);
    if (attendance.adaTelat) violations.push(`TLT: ${attendance.jumlahTelat || 1}`);
    if (attendance.adaAbsenApel) violations.push(`APEL: ${attendance.jumlahAbsenApel || 1}`);
    if (attendance.adaCuti) violations.push(`CT: ${attendance.jumlahCuti || 1}`);
    
    return violations.length > 0 ? violations.join(', ') : 'Tidak ada pelanggaran';
  };

  const getFilteredRecords = () => {
    if (!attendanceRecords) return [];
    
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
              <h2>Rekap Data Ketidakhadiran</h2>
              <p className="text-muted">Kelola data ketidakhadiran pegawai per periode (Bobot: 40%) - Sistem Perhitungan Baru</p>
            </div>
            <div className="d-flex gap-2">
              {selectedPeriod && filteredRecords && filteredRecords.length > 0 && (
                <button 
                  className="btn btn-outline-danger" 
                  onClick={() => setShowDeleteAllModal(true)}
                  title="Hapus semua data ketidakhadiran untuk periode ini"
                >
                  <i className="fas fa-trash-alt me-2"></i>Hapus Semua
                </button>
              )}
              <button className="btn btn-primary" onClick={handleCreateAttendance}>
                <i className="fas fa-plus me-2"></i>Rekap Ketidakhadiran
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

          {/* 🔥 MODIFIKASI: Updated Info Card with New Calculation Rules */}
          <div className="card border-info mb-4">
            <div className="card-body">
              <h6 className="card-title text-info">
                <i className="fas fa-info-circle me-2"></i>
                Sistem Penilaian Ketidakhadiran - Perhitungan Baru
              </h6>
              <div className="row">
                <div className="col-md-12">
                  <p className="card-text text-muted mb-4">
                    Penilaian ketidakhadiran menggunakan sistem pengurangan progresif dari 100% berdasarkan jumlah dan jenis pelanggaran.
                  </p>
                  <div className="row g-3"> {/* Gunakan g-3 untuk gap antar kolom */}
                    {/* Tidak Kerja (TK) */}
                    <div className="col-md-6">
                      <div className="p-3 bg-light rounded border border-danger"> {/* Card-like style */}
                        <h6 className="d-flex align-items-center mb-2">
                          <span className="badge bg-danger me-2">TK</span>
                          <i className="fas fa-times-circle text-danger me-2"></i> {/* Icon */}
                          Tanpa Keterangan
                        </h6>
                        <ul className="list-unstyled mb-0 small text-muted">
                          <li><i className="fas fa-circle-check text-success me-1"></i> 1 kali: -20%</li>
                          <li><i className="fas fa-circle-check text-success me-1"></i> Lebih dari 1 kali: -30%</li>
                        </ul>
                      </div>
                    </div>

                    {/* Cuti (CT) */}
                    <div className="col-md-6">
                      <div className="p-3 bg-light rounded border border-secondary">
                        <h6 className="d-flex align-items-center mb-2">
                          <span className="badge bg-secondary me-2">CT</span>
                          <i className="fas fa-suitcase-rolling text-secondary me-2"></i> {/* Icon */}
                          Cuti (hari)
                        </h6>
                        <ul className="list-unstyled mb-0 small text-muted">
                          <li><i className="fas fa-circle-check text-success me-1"></i> Kurang dari 3 hari: -2.5%</li>
                          <li><i className="fas fa-circle-check text-success me-1"></i> 3 hari atau lebih: -5%</li>
                        </ul>
                      </div>
                    </div>

                    {/* Pulang Sebelum Waktunya (PSW) */}
                    <div className="col-md-6">
                      <div className="p-3 bg-light rounded border border-warning">
                        <h6 className="d-flex align-items-center mb-2">
                          <span className="badge bg-warning text-dark me-2">PSW</span>
                          <i className="fas fa-hourglass-end text-warning me-2"></i> {/* Icon */}
                          Pulang Sebelum Waktunya
                        </h6>
                        <ul className="list-unstyled mb-0 small text-muted">
                          <li><i className="fas fa-circle-check text-success me-1"></i> 1 kali: -5%</li>
                          <li><i className="fas fa-circle-check text-success me-1"></i> Lebih dari 1 kali: -10%</li>
                        </ul>
                      </div>
                    </div>

                    {/* Telat (TLT) */}
                    <div className="col-md-6">
                      <div className="p-3 bg-light rounded border border-warning">
                        <h6 className="d-flex align-items-center mb-2">
                          <span className="badge bg-warning text-dark me-2">TLT</span>
                          <i className="fas fa-clock text-warning me-2"></i> {/* Icon */}
                          Telat
                        </h6>
                        <ul className="list-unstyled mb-0 small text-muted">
                          <li><i className="fas fa-circle-check text-success me-1"></i> 1 kali: -5%</li>
                          <li><i className="fas fa-circle-check text-success me-1"></i> Lebih dari 1 kali: -10%</li>
                        </ul>
                      </div>
                    </div>

                    {/* Absen APEL */}
                    <div className="col-md-6">
                      <div className="p-3 bg-light rounded border border-info">
                        <h6 className="d-flex align-items-center mb-2">
                          <span className="badge bg-info me-2">APEL</span>
                          <i className="fas fa-user-minus text-info me-2"></i> {/* Icon */}
                          Absen APEL
                        </h6>
                        <ul className="list-unstyled mb-0 small text-muted">
                          <li><i className="fas fa-circle-check text-success me-1"></i> Berapapun jumlahnya: -10%</li>
                        </ul>
                      </div>
                    </div>
                    
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
                        zIndex: 9999
                      }),
                      menuPortal: (provided) => ({
                        ...provided,
                        zIndex: 9999
                      })
                    }}
                    menuPortalTarget={document.body}
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

          {/* Data Table */}
          {!selectedPeriod ? (
            <div className="text-center py-5">
              <i className="fas fa-calendar-alt fa-3x text-muted mb-3"></i>
              <h5 className="text-muted">Pilih periode untuk melihat data ketidakhadiran</h5>
            </div>
          ) : filteredRecords && filteredRecords.length === 0 ? (
            <div className="text-center py-5">
              <i className="fas fa-inbox fa-3x text-muted mb-3"></i>
              <h5 className="text-muted">Belum ada data ketidakhadiran untuk periode ini</h5>
              <p className="text-muted">Klik tombol di bawah untuk membuat data ketidakhadiran untuk semua pegawai dengan nilai default 100%</p>
              <p className="text-muted"><small><i className="fas fa-info-circle me-1"></i>Administrator dan akun sistem akan dikecualikan dari pembuatan bulk data</small></p>
              <button className="btn btn-primary mt-3" onClick={handleCreateBulkData}>
                <i className="fas fa-magic me-2"></i>Buat Data Awal
              </button>
            </div>
          ) : (
            <>
              <div className="bg-white border-bottom mb-3 pb-2">
                <h5 className="mb-0">
                  <i className="fas fa-table me-2 text-primary"></i>
                  Data Ketidakhadiran - {periods.find(p => p.id === selectedPeriod)?.namaPeriode}
                  <span className="badge bg-primary ms-2">{filteredRecords.length} pegawai</span>
                </h5>
              </div>

              <div className="table-responsive">
                <table className="table table-hover table-striped">
                  <thead className="table-dark">
                    <tr>
                      <th>NIP</th>
                      <th>Nama Pegawai</th>
                      <th>Jabatan</th>
                      <th>Detail Pelanggaran</th>
                      <th>Nilai Ketidakhadiran</th>
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

      {/* UPDATED: Input Modal with New Calculation System */}
      {showModal && (
        <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-xl">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">
                  {modalMode === 'create' ? 'Input Data Ketidakhadiran' : 'Edit Data Ketidakhadiran'}
                  <small className="text-muted d-block">Sistem Perhitungan Baru</small>
                </h5>
                <button type="button" className="btn-close" onClick={() => setShowModal(false)}></button>
              </div>
              <form onSubmit={handleFormSubmit}>
                <div className="modal-body">
                  <div className="row g-3">
                    <div className="col-12">
                      <label className="form-label">Pegawai *</label>
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
                    </div>

                    <div className="col-12">
                      <h6 className="text-primary">Sistem Perhitungan Ketidakhadiran Baru</h6>
                      <div className="alert alert-info">
                        <p className="mb-2"><small>Masukkan jumlah pelanggaran. Sistem akan menghitung pengurangan secara progresif:</small></p>
                        <div className="row">
                          <div className="col-md-6">
                            <ul className="list-unstyled mb-0">
                              <li><strong>Tidak Kerja:</strong> 1x = -20%, lebih dari 1x = -30%</li>
                              <li><strong>Cuti:</strong> kurang dari 3 hari = -2.5%, {'\u22653'} hari = -5%</li>
                            </ul>
                          </div>
                          <div className="col-md-6">
                            <ul className="list-unstyled mb-0">
                              <li><strong>Pulang Awal/Telat:</strong> 1x = -5%, lebih dari 1x = -10%</li>
                              <li><strong>Absen APEL:</strong> Berapapun = -10%</li>
                            </ul>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Updated input fields with new labels and previews */}
                    <div className="col-md-6">
                      <label className="form-label text-danger">
                        <span className="badge bg-danger me-2">TK</span>
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
                      <small className="text-muted">1 kali = -20%, lebih dari 1 kali = -30%</small>
                    </div>

                    <div className="col-md-6">
                      <label className="form-label text-secondary">
                        <span className="badge bg-secondary me-2">CT</span>
                        Jumlah Cuti (hari)
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
                      <small className="text-muted">Kurang dari 3 hari = -2.5%, 3 hari atau lebih = -5%</small>
                    </div>

                    <div className="col-md-6">
                      <label className="form-label text-warning">
                        <span className="badge bg-warning text-dark me-2">PSW</span>
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
                      <small className="text-muted">1 kali = -5%, lebih dari 1 kali = -10%</small>
                    </div>

                    <div className="col-md-6">
                      <label className="form-label text-warning">
                        <span className="badge bg-warning text-dark me-2">TLT</span>
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
                      <small className="text-muted">1 kali = -5%, lebih dari 1 kali = -10%</small>
                    </div>

                    <div className="col-md-6">
                      <label className="form-label text-info">
                        <span className="badge bg-info me-2">APEL</span>
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
                      <small className="text-muted">Berapapun jumlahnya = -10%</small>
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

                    {/* NEW: Preview with New Calculation */}
                    <div className="col-12">
                      <div className="alert alert-success">
                        <h6><i className="fas fa-calculator me-2"></i>Preview Nilai Ketidakhadiran (Sistem Baru)</h6>
                        <div className="d-flex align-items-center flex-wrap">
                          <span className="me-3 fw-bold">100%</span>
                          
                          {parseInt(formData.jumlahTidakKerja) > 0 && (
                            <span className="me-2 mb-1">
                              <span className="badge bg-danger me-1">
                                -{parseInt(formData.jumlahTidakKerja) === 1 ? '20%' : '30%'}
                              </span>
                              TK ({parseInt(formData.jumlahTidakKerja)}x)
                            </span>
                          )}
                          
                          {parseInt(formData.jumlahCuti) > 0 && (
                            <span className="me-2 mb-1">
                              <span className="badge bg-secondary me-1">
                                -{parseInt(formData.jumlahCuti) < 3 ? '2.5%' : '5%'}
                              </span>
                              CT ({parseInt(formData.jumlahCuti)} hari)
                            </span>
                          )}
                          
                          {parseInt(formData.jumlahPulangAwal) > 0 && (
                            <span className="me-2 mb-1">
                              <span className="badge bg-warning text-dark me-1">
                                -{parseInt(formData.jumlahPulangAwal) === 1 ? '5%' : '10%'}
                              </span>
                              PSW ({parseInt(formData.jumlahPulangAwal)}x)
                            </span>
                          )}
                          
                          {parseInt(formData.jumlahTelat) > 0 && (
                            <span className="me-2 mb-1">
                              <span className="badge bg-warning text-dark me-1">
                                -{parseInt(formData.jumlahTelat) === 1 ? '5%' : '10%'}
                              </span>
                              TLT ({parseInt(formData.jumlahTelat)}x)
                            </span>
                          )}
                          
                          {parseInt(formData.jumlahAbsenApel) > 0 && (
                            <span className="me-2 mb-1">
                              <span className="badge bg-info me-1">-10%</span>
                              APEL ({parseInt(formData.jumlahAbsenApel)}x)
                            </span>
                          )}
                          
                          <span className="fw-bold text-success ms-auto fs-5">
                            = {calculatePreviewScore(
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

      {/* Delete Modals - Same as before */}
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
                  <strong>Peringatan!</strong> Tindakan ini akan menghapus SEMUA data ketidakhadiran untuk periode ini dan tidak dapat dibatalkan.
                </div>

                <p>Apakah Anda yakin ingin menghapus <strong>SEMUA DATA KETIDAKHADIRAN</strong> untuk periode ini?</p>

                <div className="bg-light p-3 rounded">
                  <strong>Periode:</strong> {periods.find(p => p.id === selectedPeriod)?.namaPeriode}<br/>
                  <strong>Total Record:</strong> {filteredRecords ? filteredRecords.length : 0} data ketidakhadiran<br/>
                  <strong>Pegawai Terdampak:</strong> {filteredRecords ? filteredRecords.length : 0} pegawai
                </div>
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

      {/* Delete Single Modal - Same as before */}
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
                  <strong>Peringatan!</strong> Tindakan ini akan menghapus data ketidakhadiran pegawai dan tidak dapat dibatalkan.
                </div>

                <p>Apakah Anda yakin ingin menghapus data ketidakhadiran untuk:</p>

                <div className="bg-light p-3 rounded">
                  <strong>Nama:</strong> {attendanceToDelete.user.nama}<br/>
                  <strong>NIP:</strong> {attendanceToDelete.user.nip}<br/>
                  <strong>Periode:</strong> {attendanceToDelete.period?.namaPeriode}<br/>
                  <strong>Nilai Ketidakhadiran:</strong> {attendanceToDelete.nilaiPresensi}%
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