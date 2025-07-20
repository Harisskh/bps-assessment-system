// src/pages/CkpInputPage.js - ENHANCED VERSION WITH AUTO SCROLL + JOB FILTER
import React, { useState, useEffect, useRef } from 'react';
import Select from 'react-select';
import { ckpAPI, periodAPI, userAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import SearchableUserSelect from '../components/SearchableUserSelect';
import '../styles/AttendanceInput.scss'; // Reuse the same SCSS styles

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
  
  // Filters - ADDED JOB FILTER
  const [selectedPeriod, setSelectedPeriod] = useState('');
  const [selectedUserFilter, setSelectedUserFilter] = useState(null);
  const [selectedJobFilter, setSelectedJobFilter] = useState('');
  
  // Modal states
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState('create');
  const [selectedCkp, setSelectedCkp] = useState(null);
  const [showDeleteAllModal, setShowDeleteAllModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [ckpToDelete, setCkpToDelete] = useState(null);
  
  // 🔥 NEW: Auto scroll states
  const [hasPerformedAutoScroll, setHasPerformedAutoScroll] = useState(false);
  const emptyStateRef = useRef(null);
  
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
  }, [selectedPeriod]);

  // 🔥 NEW: Auto scroll effect when no data exists
  useEffect(() => {
    if (
      !loading && 
      !hasPerformedAutoScroll && 
      selectedPeriod && 
      ckpRecords && 
      ckpRecords.length === 0 && 
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
  }, [loading, selectedPeriod, ckpRecords, hasPerformedAutoScroll]);

  // 🔥 NEW: Reset auto scroll flag when period changes
  useEffect(() => {
    if (selectedPeriod) {
      setHasPerformedAutoScroll(false);
    }
  }, [selectedPeriod]);

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

  const loadCkpRecords = async () => {
    try {
      setLoading(true);
      
      const params = {
        periodId: selectedPeriod,
        limit: 100
      };

      const response = await ckpAPI.getAll(params);
      let records = response.data.data.ckpScores || [];

      // Filter out Administrator System from results
      records = records.filter(record => 
        record.user.nama !== 'Administrator System' &&
        record.user.username !== 'admin' &&
        record.user.role !== 'ADMIN'
      );
      
      setCkpRecords(records);
      
    } catch (error) {
      console.error('❌ Load CKP records error:', error);
      setError('Gagal memuat data CKP');
    } finally {
      setLoading(false);
    }
  };

  // 🔥 UPDATED: Enhanced getFilteredRecords with job filter
  const getFilteredRecords = () => {
    if (!ckpRecords) return [];
    
    let filtered = ckpRecords;
    
    // Apply user filter
    if (selectedUserFilter && selectedUserFilter.value) {
      filtered = filtered.filter(record => record.userId === selectedUserFilter.value);
    }
    
    // Apply job filter
    if (selectedJobFilter) {
      filtered = filtered.filter(record => record.user.jabatan === selectedJobFilter);
    }
    
    return filtered;
  };

  // 🔥 NEW: Function to get unique jobs for filter dropdown
  const getUniqueJobs = () => {
    if (!ckpRecords) return [];
    const jobs = ckpRecords.map(record => record.user.jabatan).filter(Boolean);
    return [...new Set(jobs)].sort();
  };

  const filteredRecords = getFilteredRecords();
  const hasRecords = filteredRecords && filteredRecords.length > 0;

  const handleCreateCkp = () => {
    setModalMode('create');
    setFormData({
      userId: '',
      periodId: selectedPeriod,
      score: '',
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

      await ckpAPI.upsert(submitData);
      setSuccess(modalMode === 'create' ? 'Data CKP berhasil ditambahkan' : 'Data CKP berhasil diperbarui');
      
      setShowModal(false);
      setFormData({
        userId: '',
        periodId: selectedPeriod,
        score: '',
      });
      
      loadCkpRecords();
      
    } catch (error) {
      console.error('❌ Submit CKP error:', error);
      setError(error.response?.data?.message || 'Gagal menyimpan data CKP');
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
        setError('Tidak ada pegawai yang memenuhi kriteria untuk dibuatkan data CKP');
        setSubmitting(false);
        return;
      }

      const bulkData = eligibleUsers.map(user => ({
        userId: user.id,
        periodId: selectedPeriod,
        score: 98,
      }));

      const createPromises = bulkData.map(data => ckpAPI.upsert(data));
      await Promise.all(createPromises);
      
      setSuccess(`Berhasil membuat ${eligibleUsers.length} data CKP.`);
      loadCkpRecords();
      
    } catch (error) {
      console.error('❌ Create bulk data error:', error);
      setError('Gagal membuat data CKP bulk');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteAllCkp = async () => {
    if (!selectedPeriod || !filteredRecords || filteredRecords.length === 0) return;
    
    setSubmitting(true);
    try {
      const deletePromises = filteredRecords.map(ckp => 
        ckpAPI.delete(ckp.id)
      );
      
      await Promise.all(deletePromises);
      
      setSuccess(`Berhasil menghapus ${filteredRecords.length} data CKP untuk periode ini`);
      setShowDeleteAllModal(false);
      loadCkpRecords();
      
    } catch (error) {
      console.error('❌ Delete all CKP error:', error);
      setError('Gagal menghapus semua data CKP');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteCkp = async () => {
    if (!ckpToDelete) return;
    
    setSubmitting(true);
    try {
      await ckpAPI.delete(ckpToDelete.id);
      setSuccess(`Data CKP ${ckpToDelete.user.nama} berhasil dihapus`);
      
      setShowDeleteModal(false);
      setCkpToDelete(null);
      loadCkpRecords();
      
    } catch (error) {
      console.error('❌ Delete CKP error:', error);
      setError('Gagal menghapus data CKP');
    } finally {
      setSubmitting(false);
    }
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
    <div className="container-fluid p-4 attendance-input-page">
      {/* 🔥 Enhanced Header (same as AttendanceInputPage) */}
      <div className="page-header">
        <div className="header-content">
          <div className="header-title">
            <i className="fas fa-chart-line header-icon"></i>
            <div className="title-section">
              <h2>Rekap CKP</h2>
              <p className="header-subtitle">Kelola Capaian Kinerja Pegawai per periode (Bobot: 30%)</p>
            </div>
          </div>
          <div className="header-actions">
            {hasRecords && (
              <>
                <button 
                  className="btn btn-outline-light" 
                  onClick={() => setShowDeleteAllModal(true)}
                  title="Hapus semua data CKP untuk periode ini"
                >
                  <i className="fas fa-trash-alt me-2"></i>Hapus Semua
                </button>
                <button className="btn btn-light" onClick={handleCreateCkp}>
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
          Tentang CKP (Capaian Kinerja Pegawai)
        </h6>
        <p>
          CKP adalah hasil kerja secara kualitas dan kuantitas yang dicapai oleh seorang pegawai 
          dalam melaksanakan tugasnya sesuai dengan tanggung jawab yang diberikan kepadanya.
        </p>
      </div>

      {/* 🔥 Enhanced Filter Section WITH JOB FILTER */}
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

            {/* 🔥 NEW: Filter Jabatan */}
            <div className="filter-group">
              <label>Filter Jabatan</label>
              <select 
                className="form-select"
                value={selectedJobFilter}
                onChange={(e) => setSelectedJobFilter(e.target.value)}
              >
                <option value="">Semua Jabatan</option>
                {getUniqueJobs().map(job => (
                  <option key={job} value={job}>{job}</option>
                ))}
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
                menuPortalTarget={document.body}
                styles={{
                  menuPortal: (base) => ({ ...base, zIndex: 9999 }),
                  menu: (base) => ({ ...base, zIndex: 9999 })
                }}
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
          <h5>Pilih periode untuk melihat data CKP</h5>
          <p>Gunakan dropdown periode di atas untuk memulai</p>
        </div>
      ) : !hasRecords ? (
        // 🔥 Enhanced Empty State with Auto Scroll Reference
        <div className="card border-0 shadow-sm" ref={emptyStateRef}>
          <div className="card-body empty-state empty-state-highlighted">
            <div className="empty-icon">
              <i className="fas fa-chart-line"></i>
            </div>
            <h5>Belum ada data CKP untuk periode ini</h5>
            <div className="alert alert-warning mt-3 mb-3">
              <i className="fas fa-exclamation-triangle me-2"></i>
              <strong>Perhatian Admin!</strong> Sistem memerlukan data awal untuk dapat beroperasi dengan optimal.
            </div>
            <p>
              Sistem akan membuat data awal untuk semua pegawai dengan nilai default 98.
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
          {/* 🔥 Enhanced Table Section (same style as AttendanceInputPage) */}
          <div className="table-section">
            <div className="table-header">
              <h5>
                <i className="fas fa-table"></i>
                Data CKP - {periods.find(p => p.id === selectedPeriod)?.namaPeriode}
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
                    <th>Skor CKP</th>
                    <th>Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRecords.map((ckp, index) => {
                    return (
                      <tr key={ckp.id}>
                        <td className="d-none d-md-table-cell text-center fw-bold text-muted">
                          {index + 1}
                        </td>
                        <td>
                          <div className="employee-info">
                            <div className="employee-name">{ckp.user.nama}</div>
                            <div className="employee-contact">
                              <i className="fas fa-id-card"></i>
                              <span>NIP: {ckp.user.nip}</span>
                            </div>
                          </div>
                        </td>
                        <td className="d-none d-lg-table-cell">
                          <span className="position-badge">
                            {ckp.user.jabatan}
                          </span>
                        </td>
                        <td>
                          <span className={`score-badge ${
                            ckp.score >= 90 ? 'score-excellent' :
                            ckp.score >= 80 ? 'score-good' :
                            ckp.score >= 70 ? 'score-fair' : 'score-poor'
                          }`}>
                            <i className="fas fa-chart-line me-1"></i>
                            <span className='fs-6'>{ckp.score}</span>
                          </span>
                        </td>
                        <td>
                          <div className="action-buttons">
                            <button
                              className="btn-action action-edit"
                              onClick={() => handleEditCkp(ckp)}
                              title="Edit Data"
                            >
                              <i className="fas fa-edit"></i>
                            </button>
                            <button
                              className="btn-action action-delete"
                              onClick={() => {
                                setCkpToDelete(ckp);
                                setShowDeleteModal(true);
                              }}
                              title="Hapus Data"
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
          </div>
        </>
      )}

      {/* CKP Form Modal */}
      {showModal && (
        <div className="modal show d-block modal-enhanced" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-lg">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">
                  <i className="fas fa-chart-line me-2"></i>
                  {modalMode === 'create' ? 'Input Data CKP' : 'Edit Data CKP'}
                  <small>Capaian Kinerja Pegawai</small>
                </h5>
                <button type="button" className="btn-close" onClick={() => setShowModal(false)}></button>
              </div>
              
              <form onSubmit={handleFormSubmit}>
                <div className="modal-body">
                  <div className="row g-4">
                    <div className="col-12">
                      <div className="form-group">
                        <label className="form-label">Pegawai *</label>
                        {modalMode === 'create' ? (
                          <SearchableUserSelect
                            users={users}
                            value={formData.userId}
                            onChange={(userId) => setFormData({ ...formData, userId })}
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
                        {modalMode === 'edit' && selectedCkp && (
                          <small className="text-info">
                            <i className="fas fa-info-circle me-1"></i>
                            Pegawai tidak dapat diubah saat edit data
                          </small>
                        )}
                      </div>
                    </div>

                    <div className="col-md-6">
                      <div className="form-group">
                        <label className="form-label">
                          <span className="badge bg-primary me-2">CKP</span>
                          Skor CKP (0-100)
                        </label>
                        <input
                          type="number"
                          className="form-control"
                          value={formData.score}
                          onChange={(e) => setFormData({ ...formData, score: e.target.value })}
                          min="0"
                          max="100"
                          step="0.1"
                          placeholder="98.5"
                          required
                        />
                        <small className="form-text text-muted">
                          Masukkan nilai CKP antara 0-100 (bisa desimal)
                        </small>
                      </div>
                    </div>

                    {/* Preview Score */}
                    <div className="col-12">
                      <div className="alert alert-info border-0">
                        <h6 className="alert-heading mb-3">
                          <i className="fas fa-chart-line me-2"></i>
                          Preview Skor CKP
                        </h6>
                        
                        <div className="preview-calculation d-flex align-items-center justify-content-between flex-wrap gap-2 p-3 bg-white rounded border">
                          <div className="d-flex align-items-center flex-wrap gap-2">
                            <span className="badge bg-light text-dark border fs-6 px-3 py-2">
                              <i className="fas fa-user me-1"></i>
                              Pegawai: {users.find(u => u.id === formData.userId)?.nama || 'Belum dipilih'}
                            </span>
                            
                            <span className="badge bg-primary fs-6 px-3 py-2">
                              <i className="fas fa-chart-line me-1"></i>
                              Skor: {formData.score || '0'}
                            </span>
                          </div>
                        </div>
                        
                        <div className="mt-3 small text-muted">
                          <i className="fas fa-info-circle me-1"></i>
                          Nilai CKP mencerminkan capaian kinerja pegawai dalam periode yang dinilai
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="modal-footer">
                  <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>
                    <i className="fas fa-times me-2"></i>Batal
                  </button>
                  <button type="submit" className="btn btn-primary" disabled={submitting || !formData.userId || !formData.score}>
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
                  <strong>Peringatan!</strong> Tindakan ini akan menghapus SEMUA data CKP untuk periode ini dan tidak dapat dibatalkan.
                </div>

                <p className="mb-3">Apakah Anda yakin ingin menghapus <strong>SEMUA DATA CKP</strong> untuk periode ini?</p>

                <div className="bg-light p-3 rounded">
                  <div className="row">
                    <div className="col-sm-4"><strong>Periode:</strong></div>
                    <div className="col-sm-8">{periods.find(p => p.id === selectedPeriod)?.namaPeriode}</div>
                  </div>
                  <div className="row">
                    <div className="col-sm-4"><strong>Total Record:</strong></div>
                    <div className="col-sm-8">{filteredRecords ? filteredRecords.length : 0} data CKP</div>
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
                  onClick={handleDeleteAllCkp}
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
      {showDeleteModal && ckpToDelete && (
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
                  <strong>Peringatan!</strong> Tindakan ini akan menghapus SEMUA data CKP untuk periode ini dan tidak dapat dibatalkan.
                </div>

                <p className="mb-3">Apakah Anda yakin ingin menghapus <strong>SEMUA DATA CKP</strong> untuk periode ini?</p>

                <div className="bg-light p-3 rounded">
                  <div className="row">
                    <div className="col-sm-4"><strong>Periode:</strong></div>
                    <div className="col-sm-8">{periods.find(p => p.id === selectedPeriod)?.namaPeriode}</div>
                  </div>
                  <div className="row">
                    <div className="col-sm-4"><strong>Total Record:</strong></div>
                    <div className="col-sm-8">{filteredRecords ? filteredRecords.length : 0} data CKP</div>
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
                  onClick={handleDeleteAllCkp}
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
      {showDeleteModal && ckpToDelete && (
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
                  setCkpToDelete(null);
                }}></button>
              </div>
              <div className="modal-body">
                <div className="alert alert-warning">
                  <i className="fas fa-exclamation-triangle me-2"></i>
                  <strong>Peringatan!</strong> Tindakan ini akan menghapus data CKP pegawai dan tidak dapat dibatalkan.
                </div>

                <p className="mb-3">Apakah Anda yakin ingin menghapus data CKP untuk:</p>

                <div className="bg-light p-3 rounded">
                  <div className="row">
                    <div className="col-sm-4"><strong>Nama:</strong></div>
                    <div className="col-sm-8">{ckpToDelete.user.nama}</div>
                  </div>
                  <div className="row">
                    <div className="col-sm-4"><strong>NIP:</strong></div>
                    <div className="col-sm-8">{ckpToDelete.user.nip}</div>
                  </div>
                  <div className="row">
                    <div className="col-sm-4"><strong>Periode:</strong></div>
                    <div className="col-sm-8">{periods.find(p => p.id === selectedPeriod)?.namaPeriode}</div>
                  </div>
                  <div className="row">
                    <div className="col-sm-4"><strong>Skor CKP:</strong></div>
                    <div className="col-sm-8">
                      <span className="badge bg-primary">{ckpToDelete.score}</span>
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
                    setCkpToDelete(null);
                  }}
                  disabled={submitting}
                >
                  <i className="fas fa-times me-2"></i>Batal
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

export default CkpInputPage;