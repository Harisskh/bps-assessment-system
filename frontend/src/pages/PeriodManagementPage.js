

// src/pages/PeriodManagementPage.js - HANYA UPDATE DROPDOWN TAHUN
import React, { useState, useEffect } from 'react';
import { periodAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import SearchableSelect from '../components/SearchableSelect'; // Import component baru

const PeriodManagementPage = () => {
  const { user } = useAuth();
  const [periods, setPeriods] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [yearFilter, setYearFilter] = useState('');
  
  // Modal states
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState('create'); // 'create', 'edit'
  const [selectedPeriod, setSelectedPeriod] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [periodToDelete, setPeriodToDelete] = useState(null);
  
  // Form data
  const [formData, setFormData] = useState({
    tahun: new Date().getFullYear(),
    bulan: new Date().getMonth() + 1,
    namaPeriode: '',
    noPeriode: '',
    startDate: '',
    endDate: '',
    isActive: false
  });

  useEffect(() => {
    loadPeriods();
  }, [currentPage, yearFilter]);

  const loadPeriods = async () => {
    try {
      setLoading(true);
      setError('');
      
      const params = {
        page: currentPage,
        limit: 10,
        tahun: yearFilter
      };

      const response = await periodAPI.getAll(params);
      setPeriods(response.data.data.periods);
      setTotalPages(response.data.data.pagination.totalPages);
      
    } catch (error) {
      console.error('Load periods error:', error);
      setError(error.response?.data?.message || 'Gagal memuat data periode');
    } finally {
      setLoading(false);
    }
  };

  const handleCreatePeriod = () => {
    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth() + 1;
    
    setModalMode('create');
    setFormData({
      tahun: currentYear,
      bulan: currentMonth,
      namaPeriode: `${getMonthName(currentMonth)} ${currentYear}`,
      noPeriode: currentMonth,
      startDate: `${currentYear}-${currentMonth.toString().padStart(2, '0')}-01`,
      endDate: `${currentYear}-${currentMonth.toString().padStart(2, '0')}-${getLastDayOfMonth(currentYear, currentMonth)}`,
      isActive: false
    });
    setShowModal(true);
  };

  const handleEditPeriod = (period) => {
    setModalMode('edit');
    setSelectedPeriod(period);
    setFormData({
      tahun: period.tahun,
      bulan: period.bulan,
      namaPeriode: period.namaPeriode,
      noPeriode: period.noPeriode || '',
      startDate: period.startDate ? period.startDate.split('T')[0] : '',
      endDate: period.endDate ? period.endDate.split('T')[0] : '',
      isActive: period.isActive
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
        tahun: parseInt(formData.tahun),
        bulan: parseInt(formData.bulan),
        namaPeriode: formData.namaPeriode,
        noPeriode: formData.noPeriode ? parseInt(formData.noPeriode) : null,
        startDate: formData.startDate,
        endDate: formData.endDate,
        isActive: formData.isActive
      };

      if (modalMode === 'create') {
        await periodAPI.create(submitData);
        setSuccess('Periode berhasil dibuat');
      } else {
        await periodAPI.update(selectedPeriod.id, submitData);
        setSuccess('Periode berhasil diperbarui');
      }
      
      setShowModal(false);
      loadPeriods();
      
    } catch (error) {
      console.error('Submit period error:', error);
      setError(error.response?.data?.message || 'Gagal menyimpan periode');
    } finally {
      setSubmitting(false);
    }
  };

  const handleActivatePeriod = async (periodId) => {
    try {
      setSubmitting(true);
      await periodAPI.activate(periodId);
      setSuccess('Periode berhasil diaktifkan');
      loadPeriods();
    } catch (error) {
      console.error('Activate period error:', error);
      setError(error.response?.data?.message || 'Gagal mengaktifkan periode');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeletePeriod = async () => {
    if (!periodToDelete) return;
    
    try {
      setSubmitting(true);
      await periodAPI.delete(periodToDelete.id);
      setSuccess(`Periode ${periodToDelete.namaPeriode} berhasil dihapus`);
      setShowDeleteModal(false);
      setPeriodToDelete(null);
      loadPeriods();
    } catch (error) {
      console.error('Delete period error:', error);
      setError(error.response?.data?.message || 'Gagal menghapus periode');
    } finally {
      setSubmitting(false);
    }
  };

  const getMonthName = (month) => {
    const months = [
      'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
      'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
    ];
    return months[month - 1];
  };

  const getLastDayOfMonth = (year, month) => {
    return new Date(year, month, 0).getDate();
  };

  const handleMonthYearChange = () => {
    const monthName = getMonthName(formData.bulan);
    const newPeriodName = `${monthName} ${formData.tahun}`;
    setFormData(prev => ({ ...prev, namaPeriode: newPeriodName }));
  };

  // Generate year options untuk dropdown - UBAH JADI FORMAT UNTUK SearchableSelect
  const getYearOptions = () => {
    const currentYear = new Date().getFullYear();
    const startYear = 2020;
    const endYear = currentYear + 100;
    
    const years = [];
    for (let year = startYear; year <= endYear; year++) {
      years.push({
        value: year,
        label: year.toString()
      });
    }
    return years;
  };

  // Generate filter year options - UBAH JADI FORMAT UNTUK SearchableSelect
  const getFilterYearOptions = () => {
    const currentYear = new Date().getFullYear();
    const yearsFromData = [...new Set(periods.map(p => p.tahun))];
    
    const allYears = new Set([
      currentYear - 2,
      currentYear - 1,
      currentYear,
      ...yearsFromData,
    ]);
    
    return Array.from(allYears).sort((a, b) => b - a).map(year => ({
      value: year,
      label: year.toString()
    }));
  };

  const yearOptions = getYearOptions();
  const filterYearOptions = getFilterYearOptions();

  return (
    <div className="container-fluid">
      {/* Header */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h1 className="h3 mb-1">
            <i className="fas fa-calendar-alt me-2"></i>
            Kelola Periode Penilaian
          </h1>
          <p className="text-muted">Atur periode penilaian dan aktivasi system</p>
        </div>
        <button 
          className="btn btn-primary"
          onClick={handleCreatePeriod}
        >
          <i className="fas fa-plus me-2"></i>
          Tambah Periode
        </button>
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

      {/* Filter */}
      <div className="card mb-4">
        <div className="card-body">
          <div className="row g-3">
            <div className="col-md-3">
              <label className="form-label">Filter Tahun</label>
              {/* GANTI DROPDOWN BIASA DENGAN SearchableSelect */}
              <SearchableSelect
                value={yearFilter}
                onChange={(e) => {
                  setYearFilter(e.target.value);
                  setCurrentPage(1);
                }}
                options={[
                  { value: '', label: 'Semua Tahun' },
                  ...filterYearOptions
                ]}
                placeholder="Semua Tahun"
              />
            </div>
            <div className="col-md-3">
              <label className="form-label">&nbsp;</label>
              <button 
                type="button" 
                className="btn btn-outline-secondary w-100"
                onClick={() => {
                  setYearFilter('');
                  setCurrentPage(1);
                }}
              >
                <i className="fas fa-refresh me-2"></i>
                Reset Filter
              </button>
            </div>
            <div className="col-md-6">
              <label className="form-label">Info</label>
              <div className="text-muted small">
                <i className="fas fa-info-circle me-2"></i>
                Tahun saat ini: <strong>{new Date().getFullYear()}</strong> | 
                Bulan saat ini: <strong>{getMonthName(new Date().getMonth() + 1)}</strong>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Periods Table */}
      <div className="card">
        <div className="card-body">
          {loading ? (
            <div className="text-center py-4">
              <div className="spinner-border text-primary" role="status">
                <span className="visually-hidden">Loading...</span>
              </div>
              <p className="mt-2 text-muted">Memuat data periode...</p>
            </div>
          ) : (
            <>
              <div className="table-responsive">
                <table className="table table-hover">
                  <thead className="table-light">
                    <tr>
                      <th>Periode</th>
                      <th>Tahun/Bulan</th>
                      <th>Tanggal Mulai</th>
                      <th>Tanggal Selesai</th>
                      <th>Status</th>
                      <th width="200">Aksi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {periods.length === 0 ? (
                      <tr>
                        <td colSpan="6" className="text-center py-4 text-muted">
                          <i className="fas fa-calendar-alt fa-2x mb-2"></i>
                          <br />Belum ada periode penilaian
                        </td>
                      </tr>
                    ) : (
                      periods.map((period) => (
                        <tr key={period.id}>
                          <td>
                            <strong className="text-primary">{period.namaPeriode}</strong>
                            {period.noPeriode && (
                              <small className="d-block text-muted">No. {period.noPeriode}</small>
                            )}
                          </td>
                          <td>
                            <span className="badge bg-light text-dark">
                              {period.tahun}/{period.bulan.toString().padStart(2, '0')}
                            </span>
                          </td>
                          <td>
                            {period.startDate ? (
                              <small>{new Date(period.startDate).toLocaleDateString('id-ID')}</small>
                            ) : (
                              <span className="text-muted">-</span>
                            )}
                          </td>
                          <td>
                            {period.endDate ? (
                              <small>{new Date(period.endDate).toLocaleDateString('id-ID')}</small>
                            ) : (
                              <span className="text-muted">-</span>
                            )}
                          </td>
                          <td>
                            <span className={`badge ${period.isActive ? 'bg-success' : 'bg-secondary'}`}>
                              {period.isActive ? (
                                <>
                                  <i className="fas fa-check-circle me-1"></i>
                                  Aktif
                                </>
                              ) : (
                                <>
                                  <i className="fas fa-pause-circle me-1"></i>
                                  Nonaktif
                                </>
                              )}
                            </span>
                          </td>
                          <td>
                            <div className="btn-group btn-group-sm">
                              {/* Edit Button */}
                              <button 
                                className="btn btn-outline-primary"
                                onClick={() => handleEditPeriod(period)}
                                title="Edit Periode"
                              >
                                <i className="fas fa-edit"></i>
                              </button>
                              
                              {/* Activate Button */}
                              {!period.isActive && (
                                <button 
                                  className="btn btn-outline-success"
                                  onClick={() => handleActivatePeriod(period.id)}
                                  title="Aktifkan Periode"
                                  disabled={submitting}
                                >
                                  <i className="fas fa-play"></i>
                                </button>
                              )}
                              
                              {/* Delete Button */}
                              <button 
                                className="btn btn-outline-danger"
                                onClick={() => {
                                  setPeriodToDelete(period);
                                  setShowDeleteModal(true);
                                }}
                                title="Hapus Periode"
                                disabled={period.isActive}
                              >
                                <i className="fas fa-trash"></i>
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <nav className="mt-4">
                  <ul className="pagination justify-content-center">
                    <li className={`page-item ${currentPage === 1 ? 'disabled' : ''}`}>
                      <button 
                        className="page-link"
                        onClick={() => setCurrentPage(currentPage - 1)}
                        disabled={currentPage === 1}
                      >
                        Previous
                      </button>
                    </li>
                    
                    {[...Array(totalPages)].map((_, index) => (
                      <li key={index + 1} className={`page-item ${currentPage === index + 1 ? 'active' : ''}`}>
                        <button 
                          className="page-link"
                          onClick={() => setCurrentPage(index + 1)}
                        >
                          {index + 1}
                        </button>
                      </li>
                    ))}
                    
                    <li className={`page-item ${currentPage === totalPages ? 'disabled' : ''}`}>
                      <button 
                        className="page-link"
                        onClick={() => setCurrentPage(currentPage + 1)}
                        disabled={currentPage === totalPages}
                      >
                        Next
                      </button>
                    </li>
                  </ul>
                </nav>
              )}
            </>
          )}
        </div>
      </div>

      {/* Period Form Modal */}
      {showModal && (
        <div className="modal fade show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-lg">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">
                  <i className="fas fa-calendar-plus me-2"></i>
                  {modalMode === 'create' ? 'Tambah Periode Baru' : 'Edit Periode'}
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
                    <div className="col-md-6">
                      <label className="form-label">Tahun *</label>
                      {/* GANTI DROPDOWN BIASA DENGAN SearchableSelect DI MODAL JUGA */}
                      <SearchableSelect
                        value={formData.tahun}
                        onChange={(e) => {
                          setFormData({ ...formData, tahun: parseInt(e.target.value) });
                          setTimeout(handleMonthYearChange, 0);
                        }}
                        options={yearOptions}
                        placeholder="Pilih tahun..."
                      />
                      <small className="form-text text-muted">
                        Tersedia tahun 2020 - {new Date().getFullYear() + 10}
                      </small>
                    </div>
                    
                    <div className="col-md-6">
                      <label className="form-label">Bulan *</label>
                      <select
                        className="form-select"
                        value={formData.bulan}
                        onChange={(e) => {
                          setFormData({ ...formData, bulan: parseInt(e.target.value) });
                          setTimeout(handleMonthYearChange, 0);
                        }}
                        required
                      >
                        {Array.from({ length: 12 }, (_, i) => (
                          <option key={i + 1} value={i + 1}>
                            {i + 1} - {getMonthName(i + 1)}
                          </option>
                        ))}
                      </select>
                    </div>
                    
                    <div className="col-md-8">
                      <label className="form-label">Nama Periode *</label>
                      <input
                        type="text"
                        className="form-control"
                        value={formData.namaPeriode}
                        onChange={(e) => setFormData({ ...formData, namaPeriode: e.target.value })}
                        placeholder="Januari 2025"
                        required
                      />
                    </div>
                    
                    <div className="col-md-4">
                      <label className="form-label">No. Periode</label>
                      <input
                        type="number"
                        className="form-control"
                        value={formData.noPeriode}
                        onChange={(e) => setFormData({ ...formData, noPeriode: e.target.value })}
                        placeholder="1"
                        min="1"
                        max="12"
                      />
                    </div>
                    
                    <div className="col-md-6">
                      <label className="form-label">Tanggal Mulai</label>
                      <input
                        type="date"
                        className="form-control"
                        value={formData.startDate}
                        onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                      />
                    </div>
                    
                    <div className="col-md-6">
                      <label className="form-label">Tanggal Selesai</label>
                      <input
                        type="date"
                        className="form-control"
                        value={formData.endDate}
                        onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                      />
                    </div>
                    
                    <div className="col-12">
                      <div className="form-check">
                        <input
                          className="form-check-input"
                          type="checkbox"
                          id="isActive"
                          checked={formData.isActive}
                          onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                        />
                        <label className="form-check-label" htmlFor="isActive">
                          <strong>Aktifkan periode ini</strong>
                          <small className="d-block text-muted">
                            Hanya satu periode yang bisa aktif pada satu waktu. 
                            Mengaktifkan periode ini akan menonaktifkan periode lainnya.
                          </small>
                        </label>
                      </div>
                    </div>

                    {/* Preview Card */}
                    <div className="col-12">
                      <div className="card bg-light">
                        <div className="card-body">
                          <h6 className="card-title text-secondary">Preview Periode</h6>
                          <div className="row">
                            <div className="col-md-6">
                              <p className="mb-1"><strong>Nama:</strong> {formData.namaPeriode}</p>
                              <p className="mb-1"><strong>Tahun/Bulan:</strong> {formData.tahun}/{formData.bulan.toString().padStart(2, '0')}</p>
                            </div>
                            <div className="col-md-6">
                              <p className="mb-1"><strong>Tanggal:</strong> {formData.startDate} s/d {formData.endDate}</p>
                              <p className="mb-1"><strong>Status:</strong> 
                                <span className={`badge ms-2 ${formData.isActive ? 'bg-success' : 'bg-secondary'}`}>
                                  {formData.isActive ? 'Aktif' : 'Nonaktif'}
                                </span>
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
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
                      modalMode === 'create' ? 'Tambah Periode' : 'Simpan Perubahan'
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
                  Konfirmasi Hapus Periode
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
                <p>Apakah Anda yakin ingin menghapus periode:</p>
                <div className="bg-light p-3 rounded">
                  <strong>{periodToDelete?.namaPeriode}</strong><br/>
                  <small className="text-muted">
                    Tahun: {periodToDelete?.tahun} | Bulan: {periodToDelete?.bulan}
                  </small>
                </div>
                <div className="mt-3">
                  <small className="text-muted">
                    <i className="fas fa-info-circle me-1"></i>
                    Periode hanya bisa dihapus jika belum memiliki data evaluasi.
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
                  onClick={handleDeletePeriod}
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
                      Ya, Hapus Periode
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

export default PeriodManagementPage;