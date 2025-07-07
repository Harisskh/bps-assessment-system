// src/pages/CkpInputPage.js - INPUT CKP (CAPAIAN KINERJA PEGAWAI)
import React, { useState, useEffect } from 'react';
import { ckpAPI, periodAPI, userAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';

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
  
  // Filters
  const [selectedPeriod, setSelectedPeriod] = useState('');
  const [selectedUser, setSelectedUser] = useState('');
  const [searchUser, setSearchUser] = useState('');
  
  // Modal states
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState('create'); // 'create', 'edit'
  const [selectedCkp, setSelectedCkp] = useState(null);
  
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

  const loadCkpRecords = async () => {
    try {
      setLoading(true);
      
      const params = {
        periodId: selectedPeriod,
        userId: selectedUser,
        limit: 50
      };

      const response = await ckpAPI.getAll(params);
      setCkpRecords(response.data.data.ckpScores);
      
    } catch (error) {
      console.error('Load CKP records error:', error);
      setError('Gagal memuat data CKP');
    } finally {
      setLoading(false);
    }
  };

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

      await ckpAPI.upsert(submitData);
      setSuccess(modalMode === 'create' ? 'Data CKP berhasil ditambahkan' : 'Data CKP berhasil diperbarui');
      setShowModal(false);
      loadCkpRecords();
      
    } catch (error) {
      console.error('Submit CKP error:', error);
      setError(error.response?.data?.message || 'Gagal menyimpan data CKP');
    } finally {
      setSubmitting(false);
    }
  };

  const handleBulkCreate = () => {
    if (!selectedPeriod) {
      setError('Pilih periode terlebih dahulu');
      return;
    }
    
    // Create CKP records for all users with default score 85
    const bulkCreate = async () => {
      setSubmitting(true);
      setError('');
      
      try {
        const promises = users.map(user => 
          ckpAPI.upsert({
            userId: user.id,
            periodId: selectedPeriod,
            score: 85, // Default score
            keterangan: 'Bulk input - default score 85'
          })
        );
        
        await Promise.all(promises);
        setSuccess(`Berhasil membuat ${users.length} record CKP dengan nilai default 85`);
        loadCkpRecords();
        
      } catch (error) {
        console.error('Bulk create error:', error);
        setError('Gagal membuat bulk CKP records');
      } finally {
        setSubmitting(false);
      }
    };
    
    bulkCreate();
  };

  const getScoreLevel = (score) => {
    if (score >= 90) return { label: 'Sangat Baik', color: 'success' };
    if (score >= 80) return { label: 'Baik', color: 'primary' };
    if (score >= 70) return { label: 'Cukup', color: 'warning' };
    if (score >= 60) return { label: 'Kurang', color: 'danger' };
    return { label: 'Sangat Kurang', color: 'dark' };
  };

  const filteredUsers = users.filter(user =>
    user.nama.toLowerCase().includes(searchUser.toLowerCase()) ||
    user.nip.includes(searchUser)
  );

  if (loading && ckpRecords.length === 0) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '50vh' }}>
        <div className="text-center">
          <div className="spinner-border text-primary mb-3" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
          <p className="text-muted">Memuat data CKP...</p>
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
            Input Data CKP
          </h1>
          <p className="text-muted">Kelola Capaian Kinerja Pegawai per periode (Bobot: 30%)</p>
        </div>
        <div className="d-flex gap-2">
          <button 
            className="btn btn-outline-primary"
            onClick={handleBulkCreate}
            disabled={!selectedPeriod || submitting}
          >
            <i className="fas fa-users me-2"></i>
            Bulk Input (85)
          </button>
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
            <div className="col-md-4">
              <div className="d-flex justify-content-around">
                <div className="text-center">
                  <span className="badge bg-success fs-6">90-100</span>
                  <small className="d-block text-muted">Sangat Baik</small>
                </div>
                <div className="text-center">
                  <span className="badge bg-primary fs-6">80-89</span>
                  <small className="d-block text-muted">Baik</small>
                </div>
                <div className="text-center">
                  <span className="badge bg-warning fs-6">70-79</span>
                  <small className="d-block text-muted">Cukup</small>
                </div>
                <div className="text-center">
                  <span className="badge bg-danger fs-6">60-69</span>
                  <small className="d-block text-muted">Kurang</small>
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
            <div className="col-md-4">
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
                Reset Filter
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* CKP Records */}
      {selectedPeriod ? (
        <div className="card">
          <div className="card-header">
            <h5 className="mb-0">
              <i className="fas fa-list me-2"></i>
              Data CKP - {periods.find(p => p.id === selectedPeriod)?.namaPeriode}
            </h5>
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
                        <th>Skor CKP</th>
                        <th>Level</th>
                        <th>Keterangan</th>
                        <th width="150">Aksi</th>
                      </tr>
                    </thead>
                    <tbody>
                      {ckpRecords.length === 0 ? (
                        <tr>
                          <td colSpan="7" className="text-center py-4 text-muted">
                            <i className="fas fa-chart-line fa-2x mb-2"></i>
                            <br />Belum ada data CKP untuk periode ini
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
                        ckpRecords.map((ckp) => {
                          const scoreLevel = getScoreLevel(ckp.score);
                          return (
                            <tr key={ckp.id}>
                              <td>
                                <span className="fw-bold">{ckp.user.nip}</span>
                              </td>
                              <td>
                                <strong>{ckp.user.nama}</strong>
                              </td>
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
                                <span className={`badge bg-${scoreLevel.color}`}>
                                  {scoreLevel.label}
                                </span>
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
                                <div className="btn-group btn-group-sm">
                                  <button 
                                    className="btn btn-outline-primary"
                                    onClick={() => handleEditCkp(ckp)}
                                    title="Edit CKP"
                                  >
                                    <i className="fas fa-edit"></i>
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
                {ckpRecords.length > 0 && (
                  <div className="mt-4 p-3 bg-light rounded">
                    <div className="row text-center">
                      <div className="col-md-2">
                        <h5 className="text-primary mb-0">{ckpRecords.length}</h5>
                        <small className="text-muted">Total Record</small>
                      </div>
                      <div className="col-md-2">
                        <h5 className="text-success mb-0">
                          {ckpRecords.filter(c => c.score >= 90).length}
                        </h5>
                        <small className="text-muted">Sangat Baik</small>
                      </div>
                      <div className="col-md-2">
                        <h5 className="text-primary mb-0">
                          {ckpRecords.filter(c => c.score >= 80 && c.score < 90).length}
                        </h5>
                        <small className="text-muted">Baik</small>
                      </div>
                      <div className="col-md-2">
                        <h5 className="text-warning mb-0">
                          {ckpRecords.filter(c => c.score >= 70 && c.score < 80).length}
                        </h5>
                        <small className="text-muted">Cukup</small>
                      </div>
                      <div className="col-md-2">
                        <h5 className="text-danger mb-0">
                          {ckpRecords.filter(c => c.score >= 60 && c.score < 70).length}
                        </h5>
                        <small className="text-muted">Kurang</small>
                      </div>
                      <div className="col-md-2">
                        <h5 className="text-success mb-0">
                          {ckpRecords.length > 0 ? (ckpRecords.reduce((sum, c) => sum + c.score, 0) / ckpRecords.length).toFixed(1) : 0}
                        </h5>
                        <small className="text-muted">Rata-rata</small>
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
            <i className="fas fa-chart-line fa-3x text-muted mb-3"></i>
            <h5 className="text-muted">Pilih Periode Penilaian</h5>
            <p className="text-muted">Silakan pilih periode penilaian untuk melihat dan mengelola data CKP</p>
          </div>
        </div>
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
                          <strong>{ckpRecords.find(c => c.userId === formData.userId)?.user?.nama}</strong>
                          <small className="d-block text-muted">
                            {ckpRecords.find(c => c.userId === formData.userId)?.user?.jabatan}
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

                    <div className="col-md-6">
                      <label className="form-label">Preview Level</label>
                      <div className="form-control-plaintext">
                        {formData.score ? (
                          <span className={`badge bg-${getScoreLevel(parseFloat(formData.score)).color} fs-6`}>
                            {getScoreLevel(parseFloat(formData.score)).label}
                          </span>
                        ) : (
                          <span className="text-muted">Masukkan skor untuk melihat level</span>
                        )}
                      </div>
                    </div>

                    {/* Score Reference */}
                    <div className="col-12">
                      <div className="card bg-light">
                        <div className="card-body">
                          <h6 className="card-title text-secondary">Referensi Penilaian CKP</h6>
                          <div className="row">
                            <div className="col-md-3 text-center">
                              <span className="badge bg-success mb-2 fs-6">90 - 100</span>
                              <p className="small mb-0"><strong>Sangat Baik</strong><br/>Melebihi target</p>
                            </div>
                            <div className="col-md-3 text-center">
                              <span className="badge bg-primary mb-2 fs-6">80 - 89</span>
                              <p className="small mb-0"><strong>Baik</strong><br/>Mencapai target</p>
                            </div>
                            <div className="col-md-3 text-center">
                              <span className="badge bg-warning mb-2 fs-6">70 - 79</span>
                              <p className="small mb-0"><strong>Cukup</strong><br/>Hampir target</p>
                            </div>
                            <div className="col-md-3 text-center">
                              <span className="badge bg-danger mb-2 fs-6">60 - 69</span>
                              <p className="small mb-0"><strong>Kurang</strong><br/>Di bawah target</p>
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
                    disabled={submitting}
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
    </div>
  );
};

export default CkpInputPage;