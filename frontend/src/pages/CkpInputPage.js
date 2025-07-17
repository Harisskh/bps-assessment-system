// src/pages/CkpInputPage.js - IMPROVED VERSION
import React, { useState, useEffect } from 'react';
import Select from 'react-select';
import { ckpAPI, periodAPI, userAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import SearchableUserSelect from '../components/SearchableUserSelect';

const CkpInputPage = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  // Master data
  const [periods, setPeriods] = useState([]);
  const [users, setUsers] = useState([]);
  const [ckpRecords, setCkpRecords] = useState([]);
  
  // Filters - FIXED: Using react-select for user search
  const [selectedPeriod, setSelectedPeriod] = useState('');
  const [selectedUserFilter, setSelectedUserFilter] = useState(null); // react-select value
  
  // Modal states
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState('create');
  const [selectedCkp, setSelectedCkp] = useState(null);
  const [showDeleteAllModal, setShowDeleteAllModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [ckpToDelete, setCkpToDelete] = useState(null);
  
  // Form data
  const [formData, setFormData] = useState({
    userId: '',
    periodId: '',
    score: '',
    keterangan: ''
  });

  useEffect(() => {
    loadInitialData();
  }, []);

  useEffect(() => {
    if (selectedPeriod) {
      loadCkpRecords();
    }
  }, [selectedPeriod]); // FIXED: Remove selectedUserFilter from dependency to prevent auto-refresh

  const loadInitialData = async () => {
    try {
      setLoading(true);
      setError('');
      
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

      // Set default to active period
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

  const loadCkpRecords = async () => {
    try {
      setLoading(true);
      
      const params = {
        periodId: selectedPeriod,
        limit: 100
      };

      console.log('🔄 Loading CKP records with params:', params);

      const response = await ckpAPI.getAll(params);
      let records = response.data.data.ckpScores || [];

      console.log('📥 CKP records received:', records.length);

      // FIXED: Remove user filter from here - will be done in render
      console.log('✅ Final records loaded:', records.length);
      setCkpRecords(records);
      
    } catch (error) {
      console.error('❌ Load CKP records error:', error);
      setError('Gagal memuat data CKP');
    } finally {
      setLoading(false);
    }
  };

  // FIXED: Client-side filter for user search (no API call)
  const getFilteredRecords = () => {
    if (!ckpRecords) return [];
    
    // Apply user filter on the client side
    if (selectedUserFilter && selectedUserFilter.value) {
      return ckpRecords.filter(record => record.userId === selectedUserFilter.value);
    }
    
    return ckpRecords;
  };

  const filteredRecords = getFilteredRecords();

  const handleCreateCkp = () => {
    setModalMode('create');
    setFormData({
      userId: '',
      periodId: selectedPeriod,
      score: '',
      keterangan: ''
    });
    setShowModal(true);
  };

  const handleEditCkp = (ckp) => {
    setModalMode('edit');
    setSelectedCkp(ckp);
    setFormData({
      userId: ckp.userId,
      periodId: ckp.periodId,
      score: ckp.score.toString(),
      keterangan: ckp.keterangan || ''
    });
    setShowModal(true);
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    setSuccess('');

    try {
      const submitData = {
        ...formData,
        score: parseFloat(formData.score)
      };

      console.log('💾 Submitting CKP data:', submitData);

      await ckpAPI.upsert(submitData);
      setSuccess(modalMode === 'create' ? 'Data CKP berhasil ditambahkan' : 'Data CKP berhasil diperbarui');
      
      // Close modal and reset form
      setShowModal(false);
      setFormData({
        userId: '',
        periodId: selectedPeriod,
        score: '',
        keterangan: ''
      });
      
      // Reload data
      loadCkpRecords();
      
    } catch (error) {
      console.error('❌ Submit CKP error:', error);
      setError(error.response?.data?.message || 'Gagal menyimpan data CKP');
    } finally {
      setSubmitting(false);
    }
  };

  // NEW: Handle create bulk data for all eligible users
  const handleCreateBulkData = async () => {
    if (!selectedPeriod || !users || users.length === 0) return;
    
    setSubmitting(true);
    setError('');
    setSuccess('');
    
    try {
      // Filter users: exclude ADMIN role and system accounts
      const eligibleUsers = users.filter(user => 
        user.role !== 'ADMIN' && 
        user.nama !== 'Administrator System' &&
        user.username !== 'admin' &&
        user.isActive === true
      );

      if (eligibleUsers.length === 0) {
        setError('Tidak ada pegawai yang memenuhi kriteria untuk dibuatkan data CKP');
        setSubmitting(false);
        return;
      }

      // Create CKP records for eligible users with default score 98
      const bulkData = eligibleUsers.map(user => ({
        userId: user.id,
        periodId: selectedPeriod,
        score: 98,
        keterangan: 'Tidak ada keterangan'
      }));

      // Create all records in parallel
      const createPromises = bulkData.map(data => ckpAPI.upsert(data));
      await Promise.all(createPromises);
      
      setSuccess(`Berhasil membuat ${eligibleUsers.length} data Capaian Kinerja Pegawai (CKP) untuk periode ini`);
      
      // Reload data
      loadCkpRecords();
      
    } catch (error) {
      console.error('❌ Create bulk data error:', error);
      setError('Gagal membuat data CKP bulk');
    } finally {
      setSubmitting(false);
    }
  };

  // NEW: Handle delete all CKP for selected period
  const handleDeleteAllCkp = async () => {
    if (!selectedPeriod || !filteredRecords || filteredRecords.length === 0) return;
    
    setSubmitting(true);
    try {
      // Delete all CKP records for the selected period
      const deletePromises = filteredRecords.map(ckp => 
        ckpAPI.delete(ckp.id)
      );
      
      await Promise.all(deletePromises);
      
      setSuccess(`Berhasil menghapus ${filteredRecords.length} data CKP untuk periode ini`);
      
      // Close modal and reset state
      setShowDeleteAllModal(false);
      
      // Reload data
      loadCkpRecords();
      
    } catch (error) {
      console.error('❌ Delete all CKP error:', error);
      setError('Gagal menghapus semua data CKP');
    } finally {
      setSubmitting(false);
    }
  };

  // NEW: Handle delete single CKP
  const handleDeleteCkp = async () => {
    if (!ckpToDelete) return;
    
    setSubmitting(true);
    try {
      await ckpAPI.delete(ckpToDelete.id);
      setSuccess(`Data CKP ${ckpToDelete.user.nama} berhasil dihapus`);
      
      // Close modal and reset state
      setShowDeleteModal(false);
      setCkpToDelete(null);
      
      // Reload data
      loadCkpRecords();
      
    } catch (error) {
      console.error('❌ Delete CKP error:', error);
      setError('Gagal menghapus data CKP');
    } finally {
      setSubmitting(false);
    }
  };

  const getScoreLevel = (score) => {
    if (score >= 90) return { label: 'Sangat Baik', color: 'success' };
    if (score >= 80) return { label: 'Baik', color: 'primary' };
    if (score >= 70) return { label: 'Cukup', color: 'warning' };
    if (score >= 60) return { label: 'Kurang', color: 'danger' };
    return { label: 'Sangat Kurang', color: 'dark' };
  };

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
      {/* Header */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h1 className="h3 mb-1">
            <i className="fas fa-chart-line me-2"></i>
            Rekap Data Capaian Kinerja Pegawai
          </h1>
          <p className="text-muted">Kelola Capaian Kinerja Pegawai per periode (Bobot: 30%)</p>
        </div>
        <div className="d-flex gap-2">
          {selectedPeriod && filteredRecords && filteredRecords.length > 0 && (
            <button 
              className="btn btn-outline-danger"
              onClick={() => setShowDeleteAllModal(true)}
              title="Hapus semua data CKP untuk periode ini"
            >
              <i className="fas fa-trash-alt me-2"></i>Hapus Semua
            </button>
          )}
          <button 
            className="btn btn-primary"
            onClick={handleCreateCkp}
            disabled={!selectedPeriod}
          >
            <i className="fas fa-plus me-2"></i>
            Input CKP
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
            Tentang CKP (Capaian Kinerja Pegawai)
          </h6>
          <div className="row">
            <div className="col-md-8">
              <p className="card-text text-muted">
                CKP adalah hasil kerja secara kualitas dan kuantitas yang dicapai oleh seorang pegawai 
                dalam melaksanakan tugasnya sesuai dengan tanggung jawab yang diberikan kepadanya.
              </p>
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
                    zIndex: 9999
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
            
            <div className="col-md-4">
              <label className="form-label">&nbsp;</label>
              <button 
                type="button" 
                className="btn btn-outline-secondary w-100"
                onClick={() => setSelectedUserFilter(null)}
              >
                <i className="fas fa-refresh me-2"></i>
                Reset Filter
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* CKP Records - FIXED: Same structure as attendance */}
      {!selectedPeriod ? (
        <div className="text-center py-5">
          <i className="fas fa-calendar-alt fa-3x text-muted mb-3"></i>
          <h5 className="text-muted">Pilih periode untuk melihat data CKP</h5>
        </div>
      ) : filteredRecords && filteredRecords.length === 0 ? (
        <div className="text-center py-5">
          <i className="fas fa-chart-line fa-3x text-muted mb-3"></i>
          <h5 className="text-muted">Belum ada data CKP untuk periode ini</h5>
          <p className="text-muted">Klik tombol di bawah untuk membuat data CKP untuk semua pegawai dengan nilai default 98</p>
          <p className="text-muted"><small><i className="fas fa-info-circle me-1"></i>Administrator dan akun sistem akan dikecualikan dari pembuatan bulk data</small></p>
          <button 
            className="btn btn-primary mt-3"
            onClick={handleCreateBulkData}
            disabled={submitting}
          >
            <i className="fas fa-magic me-2"></i>Buat Data Awal
          </button>
        </div>
      ) : (
        <>
          {/* Table Header */}
          <div className="bg-white border-bottom mb-3 pb-2">
            <h5 className="mb-0">
              <i className="fas fa-chart-line me-2 text-success"></i>
              Data CKP - {periods.find(p => p.id === selectedPeriod)?.namaPeriode}
              <span className="badge bg-success ms-2">{filteredRecords.length} pegawai</span>
            </h5>
          </div>

          {/* Table without card wrapper */}
          <div className="table-responsive">
            <table className="table table-hover table-striped">
              <thead className="table-dark">
                <tr>
                  <th>NIP</th>
                  <th>Nama Pegawai</th>
                  <th>Jabatan</th>
                  <th>Skor CKP</th>
                  <th>Keterangan</th>
                  <th>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {filteredRecords && filteredRecords.map((ckp) => {
                  const scoreLevel = getScoreLevel(ckp.score);
                  return (
                    <tr key={ckp.id}>
                      <td className='text-dark'>{ckp.user.nip}</td>
                      <td className="text-dark fw-semibold">{ckp.user.nama}</td>
                      <td>
                        <small className="text-muted">{ckp.user.jabatan}</small>
                      </td>
                      <td>
                        <div className="d-flex align-items-center">
                          <span className={`h6 mb-0 me-2 text-${scoreLevel.color}`}>
                            {ckp.score}
                          </span>
                          <div 
                            className="progress flex-grow-1" 
                            style={{ height: '8px', width: '80px' }}
                          >
                            <div 
                              className={`progress-bar bg-${scoreLevel.color}`}
                              style={{ width: `${ckp.score}%` }}
                            ></div>
                          </div>
                        </div>
                      </td>
                      <td>
                        <small className="text-muted">
                          {ckp.keterangan ? 
                            (ckp.keterangan.length > 50 ? 
                              `${ckp.keterangan.substring(0, 50)}...` : 
                              ckp.keterangan
                            ) : '-'
                          }
                        </small>
                      </td>
                      <td>
                        <div className="d-flex gap-1">
                          <button 
                            className="btn btn-sm btn-outline-primary"
                            onClick={() => handleEditCkp(ckp)}
                            title="Edit CKP"
                          >
                            <i className="fas fa-edit"></i>
                          </button>
                          <button
                            className="btn btn-sm btn-outline-danger"
                            onClick={() => {
                              setCkpToDelete(ckp);
                              setShowDeleteModal(true);
                            }}
                            title="Hapus"
                          >
                            <i className="fas fa-trash"></i>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* CKP Form Modal */}
      {showModal && (
        <div className="modal fade show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-lg">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">
                  <i className="fas fa-chart-line me-2"></i>
                  {modalMode === 'create' ? 'Input Data CKP' : 'Edit Data CKP'}
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
                      {users.length === 0 && (
                        <div className="alert alert-warning">
                          <i className="fas fa-exclamation-triangle me-2"></i>
                          Data pegawai belum dimuat. Silakan refresh halaman.
                        </div>
                      )}
                      {modalMode === 'create' ? (
                        <SearchableUserSelect
                          users={users.filter(u => u.role !== 'ADMIN' && u.nama !== 'Administrator System' && u.username !== 'admin')}
                          value={formData.userId}
                          onChange={(userId) => {
                            console.log('🔄 User selected:', userId);
                            setFormData({ ...formData, userId });
                          }}
                          placeholder="-- Pilih Pegawai --"
                          required={true}
                          className="mb-2"
                        />
                      ) : (
                        <div className="form-control-plaintext bg-light p-2 rounded">
                          <strong>{selectedCkp?.user?.nama}</strong>
                          <small className="d-block text-muted">
                            {selectedCkp?.user?.jabatan} - {selectedCkp?.user?.nip}
                          </small>
                        </div>
                      )}
                    </div>

                    <div className="col-md-6">
                      <label className="form-label">Skor CKP * (0-100)</label>
                      <input
                        type="number"
                        className="form-control"
                        value={formData.score}
                        onChange={(e) => setFormData({ ...formData, score: e.target.value })}
                        min="0"
                        max="100"
                        step="0.1"
                        placeholder="85.5"
                        required
                      />
                      <small className="form-text text-muted">
                        Masukkan nilai CKP antara 0-100 (bisa desimal)
                      </small>
                    </div>

                    <div className="col-12">
                      <label className="form-label">Keterangan</label>
                      <textarea
                        className="form-control"
                        rows="3"
                        value={formData.keterangan}
                        onChange={(e) => setFormData({ ...formData, keterangan: e.target.value })}
                        placeholder="Catatan tambahan mengenai capaian kinerja pegawai..."
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
                    disabled={submitting || !formData.userId || !formData.score}
                  >
                    {submitting ? (
                      <>
                        <span className="spinner-border spinner-border-sm me-2"></span>
                        Menyimpan...
                      </>
                    ) : (
                      modalMode === 'create' ? 'Simpan Data CKP' : 'Update Data CKP'
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
                  Konfirmasi Hapus Semua Data CKP
                </h5>
                <button type="button" className="btn-close btn-close-white" onClick={() => {
                  setShowDeleteAllModal(false);
                }}></button>
              </div>
              <div className="modal-body">
                <div className="alert alert-warning">
                  <i className="fas fa-exclamation-triangle me-2"></i>
                  <strong>Peringatan!</strong> Tindakan ini akan menghapus SEMUA data CKP untuk periode ini dan tidak dapat dibatalkan.
                </div>
                
                <p>Apakah Anda yakin ingin menghapus <strong>SEMUA DATA CKP</strong> untuk periode ini?</p>
                
                <div className="bg-light p-3 rounded">
                  <strong>Periode:</strong> {periods.find(p => p.id === selectedPeriod)?.namaPeriode}<br/>
                  <strong>Total Record:</strong> {filteredRecords ? filteredRecords.length : 0} data CKP<br/>
                  <strong>Pegawai Terdampak:</strong> {filteredRecords ? filteredRecords.length : 0} pegawai
                </div>
                
                <div className="mt-3">
                  <h6 className="text-danger">Data yang akan dihapus:</h6>
                  <div className="border rounded p-2" style={{ maxHeight: '150px', overflowY: 'auto' }}>
                    {filteredRecords && filteredRecords.slice(0, 10).map((ckp, index) => (
                      <div key={ckp.id} className="d-flex justify-content-between py-1">
                        <small>{ckp.user.nama}</small>
                        <small className="text-muted">Skor: {ckp.score}</small>
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
                  onClick={handleDeleteAllCkp}
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
      {showDeleteModal && ckpToDelete && (
        <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header bg-danger text-white">
                <h5 className="modal-title">Konfirmasi Hapus Data CKP</h5>
                <button type="button" className="btn-close btn-close-white" onClick={() => {
                  setShowDeleteModal(false);
                  setCkpToDelete(null);
                }}></button>
              </div>
              <div className="modal-body">
                <div className="alert alert-warning">
                  <i className="fas fa-exclamation-triangle me-2"></i>
                  <strong>Peringatan!</strong> Tindakan ini akan menghapus data CKP pegawai dan tidak dapat dibatalkan.
                </div>
                
                <p>Apakah Anda yakin ingin menghapus data CKP untuk:</p>
                
                <div className="bg-light p-3 rounded">
                  <strong>Nama:</strong> {ckpToDelete.user.nama}<br/>
                  <strong>NIP:</strong> {ckpToDelete.user.nip}<br/>
                  <strong>Periode:</strong> {ckpToDelete.period?.namaPeriode || periods.find(p => p.id === selectedPeriod)?.namaPeriode}<br/>
                  <strong>Skor CKP:</strong> {ckpToDelete.score}
                </div>
              </div>
              <div className="modal-footer">
                <button 
                  type="button" 
                  className="btn btn-secondary" 
                  onClick={() => {
                    setShowDeleteModal(false);
                    setCkpToDelete(null);
                  }}
                  disabled={submitting}
                >
                  Batal
                </button>
                <button 
                  type="button" 
                  className="btn btn-danger" 
                  onClick={handleDeleteCkp}
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

export default CkpInputPage;