// src/pages/PeriodManagementPage.js - UPDATED DELETE MODAL
import React, { useState, useEffect } from 'react';
import { periodAPI } from '../services/api';
import Select from 'react-select';

import '../styles/PeriodManagement.scss';

const PeriodManagementPage = () => {
  const [periods, setPeriods] = useState([]);
  const [allPeriods, setAllPeriods] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [yearFilter, setYearFilter] = useState(null);
  
  const [activePeriodInfo, setActivePeriodInfo] = useState('Tidak Ditemukan');
  
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState('create');
  const [selectedPeriod, setSelectedPeriod] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [periodToDelete, setPeriodToDelete] = useState(null);
  
  const [formData, setFormData] = useState({
    tahun: 2025,
    bulan: new Date().getMonth() + 1,
    namaPeriode: '',
    startDate: '',
    endDate: '',
    isActive: false
  });

  useEffect(() => {
    loadPeriods();
  }, [currentPage, yearFilter]);

  useEffect(() => {
    const fetchAllPeriodsForFilter = async () => {
        try {
            const response = await periodAPI.getAll({ limit: 1000 });
            setAllPeriods(response.data.data.periods);
        } catch (error) {
            console.error("Failed to fetch all periods for filter", error);
        }
    };
    fetchAllPeriodsForFilter();
  }, []);

  const loadPeriods = async () => {
    try {
      setLoading(true); 
      setError('');
      const params = { 
        page: currentPage, 
        limit: 10, 
        tahun: yearFilter?.value || '' 
      };
      const response = await periodAPI.getAll(params);
      const fetchedPeriods = response.data.data.periods;
      
      setPeriods(fetchedPeriods);
      setTotalPages(response.data.data.pagination.totalPages);

      const activePeriod = fetchedPeriods.find(p => p.isActive);
      if (activePeriod) {
        setActivePeriodInfo(`${activePeriod.namaPeriode}`);
      } else {
        const globalActive = allPeriods.find(p => p.isActive);
        setActivePeriodInfo(globalActive ? globalActive.namaPeriode : 'Tidak Ada');
      }

    } catch (error) {
      console.error('Load periods error:', error);
      setError(error.response?.data?.message || 'Gagal memuat data periode');
    } finally {
      setLoading(false);
    }
  };

  const handleCreatePeriod = () => {
    const currentYear = 2025;
    const currentMonth = new Date().getMonth() + 1;
    setModalMode('create');
    setFormData({
      tahun: currentYear, 
      bulan: currentMonth,
      namaPeriode: `${getMonthName(currentMonth)} ${currentYear}`, 
      startDate: `${currentYear}-${String(currentMonth).padStart(2, '0')}-01`,
      endDate: `${currentYear}-${String(currentMonth).padStart(2, '0')}-${getLastDayOfMonth(currentYear, currentMonth)}`,
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
      const response = await periodAPI.getAll({ limit: 1000 });
      setAllPeriods(response.data.data.periods);
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
      const response = await periodAPI.getAll({ limit: 1000 });
      setAllPeriods(response.data.data.periods);
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
      const response = await periodAPI.delete(periodToDelete.id);
      setSuccess(response.data.message || `Periode ${periodToDelete.namaPeriode} berhasil dihapus`);
      setShowDeleteModal(false); 
      setPeriodToDelete(null); 
      loadPeriods();
      const periodsResponse = await periodAPI.getAll({ limit: 1000 });
      setAllPeriods(periodsResponse.data.data.periods);
    } catch (error) {
      console.error('Delete period error:', error);
      setError(error.response?.data?.message || 'Gagal menghapus periode');
    } finally {
      setSubmitting(false);
    }
  };

  const getMonthName = (month) => {
    const monthNames = [
      'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
      'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
    ];
    return monthNames[month - 1];
  };
  
  const getLastDayOfMonth = (year, month) => new Date(year, month, 0).getDate();
  
  const handleFormChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => {
        const newFormState = { 
          ...prev, 
          [name]: type === 'checkbox' ? checked : value 
        };
        
        if (name === 'tahun' || name === 'bulan') {
            const tahun = name === 'tahun' ? parseInt(value) : newFormState.tahun;
            const bulan = name === 'bulan' ? parseInt(value) : newFormState.bulan;
            const newNamaPeriode = `${getMonthName(bulan)} ${tahun}`;
            return { 
              ...newFormState, 
              namaPeriode: newNamaPeriode 
            };
        }
        return newFormState;
    });
  };

  const generateModalYearOptions = () => {
    const years = [];
    for (let year = 2025; year <= 2125; year++) {
      years.push({ value: year, label: year.toString() });
    }
    return years;
  };
  
  const generateFilterYearOptions = () => {
      const yearsFromData = [...new Set(allPeriods.map(p => p.tahun))];
      return yearsFromData.sort((a, b) => a - b).map(year => ({
          value: year,
          label: year.toString()
      }));
  };
  
  const modalYearOptions = generateModalYearOptions();
  const filterYearOptions = generateFilterYearOptions();

  const customSelectStyles = {
    control: (provided) => ({ 
      ...provided, 
      borderRadius: '0.5rem', 
      minHeight: '42px', 
      boxShadow: 'none' 
    }),
    menu: (provided) => ({ 
      ...provided, 
      borderRadius: '0.5rem', 
      zIndex: 1056 
    }),
  };

  return (
    <div className="container-fluid p-4 period-management-page">
      <div className="page-header">
        <div className="header-title">
          <i className="fas fa-calendar-alt header-icon"></i>
          <div>
            <h1>Kelola Periode Penilaian</h1>
            <p className="header-subtitle mb-0">Atur periode penilaian dan aktivasi sistem.</p>
          </div>
        </div>
        <button className="btn btn-primary btn-add-period" onClick={handleCreatePeriod}>
          <i className="fas fa-plus me-2"></i>Tambah Periode
        </button>
      </div>

      {error && <div className="alert alert-danger">{error}</div>}
      {success && <div className="alert alert-success">{success}</div>}
      
      <div className="table-controls">
          <div className="filter-group">
              <label htmlFor="year-filter" className="form-label mb-0 fw-bold">Filter Tahun:</label>
              <div className="searchable-select-wrapper">
                  <Select
                      id="year-filter"
                      options={filterYearOptions}
                      value={yearFilter}
                      onChange={(option) => { 
                        setYearFilter(option); 
                        setCurrentPage(1); 
                      }}
                      placeholder="Semua Tahun"
                      isClearable
                      styles={customSelectStyles}
                  />
              </div>
          </div>
          <div className="info-badge">
            <i className="fas fa-info-circle"></i>
            <span>Periode Aktif: <strong>{activePeriodInfo}</strong></span>
          </div>
      </div>

      <div className="period-table-wrapper">
        <div className="table-responsive">
          <table className="table period-table">
            <thead>
              <tr>
                <th style={{width: '60px'}}>No.</th>
                <th>Periode</th>
                <th>Tahun/Bulan</th>
                <th>Tanggal Mulai</th>
                <th>Tanggal Selesai</th>
                <th>Status</th>
                <th>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="7" className="text-center p-5">
                    <div className="spinner-border text-primary"></div>
                  </td>
                </tr>
              ) : periods.length > 0 ? (
                periods.map((period, index) => (
                  <tr key={period.id}>
                    <td className="text-center fw-bold text-muted">
                      {((currentPage - 1) * 10) + index + 1}
                    </td>
                    <td>
                      <strong>{period.namaPeriode}</strong><br/>
                    </td>
                    <td>{period.tahun}/{String(period.bulan).padStart(2, '0')}</td>
                    <td>
                      {period.startDate ? 
                        new Date(period.startDate).toLocaleDateString('id-ID', { 
                          day: '2-digit', 
                          month: 'short', 
                          year: 'numeric' 
                        }) : '-'
                      }
                    </td>
                    <td>
                      {period.endDate ? 
                        new Date(period.endDate).toLocaleDateString('id-ID', { 
                          day: '2-digit', 
                          month: 'short', 
                          year: 'numeric' 
                        }) : '-'
                      }
                    </td>
                    <td>
                      <span className={`status-badge ${period.isActive ? 'status-active' : 'status-inactive'}`}>
                        <i className={`fas ${period.isActive ? 'fa-check-circle' : 'fa-pause-circle'} me-1`}></i>
                        {period.isActive ? 'Aktif' : 'Nonaktif'}
                      </span>
                    </td>
                    <td>
                      <div className="action-buttons">
                        <button 
                          className="btn btn-sm action-edit" 
                          onClick={() => handleEditPeriod(period)} 
                          title="Edit"
                        >
                          <i className="fas fa-edit"></i>
                        </button>
                        {!period.isActive && (
                          <button 
                            className="btn btn-sm action-activate" 
                            onClick={() => handleActivatePeriod(period.id)} 
                            title="Aktifkan" 
                            disabled={submitting}
                          >
                            <i className="fas fa-play"></i>
                          </button>
                        )}
                        <button 
                          className="btn btn-sm action-delete" 
                          onClick={() => { 
                            setPeriodToDelete(period); 
                            setShowDeleteModal(true); 
                          }} 
                          title="Hapus" 
                          disabled={period.isActive}
                        >
                          <i className="fas fa-trash"></i>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="7" className="text-center p-5 text-muted">
                    Tidak ada data untuk filter yang dipilih.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

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

      {/* Modal Tambah/Edit Periode */}
      {showModal && (
        <div className="modal fade show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
            <div className="modal-dialog modal-lg modal-dialog-centered">
                <div className="modal-content">
                    <form onSubmit={handleFormSubmit}>
                        <div className="modal-header">
                            <h5 className="modal-title">
                              {modalMode === 'create' ? 'Tambah Periode Baru' : 'Edit Periode'}
                            </h5>
                            <button 
                              type="button" 
                              className="btn-close" 
                              onClick={() => setShowModal(false)}
                            ></button>
                        </div>
                        <div className="modal-body">
                            <div className="row g-3">
                                <div className="col-md-6">
                                    <label className="form-label">Tahun *</label>
                                    <Select 
                                        options={modalYearOptions} 
                                        value={modalYearOptions.find(y => y.value === formData.tahun)} 
                                        onChange={(opt) => handleFormChange({ 
                                          target: { name: 'tahun', value: opt.value }
                                        })} 
                                        styles={customSelectStyles} 
                                        placeholder="Pilih Tahun"
                                    />
                                </div>
                                <div className="col-md-6">
                                    <label className="form-label">Bulan *</label>
                                    <select 
                                      className="form-select" 
                                      name="bulan" 
                                      value={formData.bulan} 
                                      onChange={handleFormChange} 
                                      required 
                                      style={{minHeight: '42px'}}
                                    >
                                        {Array.from({ length: 12 }, (_, i) => (
                                          <option key={i + 1} value={i + 1}>
                                            {getMonthName(i + 1)}
                                          </option>
                                        ))}
                                    </select>
                                </div>
                                <div className="col-md-8">
                                    <label className="form-label">Nama Periode *</label>
                                    <input 
                                      type="text" 
                                      className="form-control" 
                                      name="namaPeriode" 
                                      value={formData.namaPeriode} 
                                      onChange={handleFormChange} 
                                      required 
                                    />
                                </div>
                                <div className="col-md-6">
                                    <label className="form-label">Tanggal Mulai</label>
                                    <input 
                                      type="date" 
                                      className="form-control" 
                                      name="startDate" 
                                      value={formData.startDate} 
                                      onChange={handleFormChange} 
                                    />
                                </div>
                                <div className="col-md-6">
                                    <label className="form-label">Tanggal Selesai</label>
                                    <input 
                                      type="date" 
                                      className="form-control" 
                                      name="endDate" 
                                      value={formData.endDate} 
                                      onChange={handleFormChange} 
                                    />
                                </div>
                                <div className="col-12">
                                  <div className="form-check form-switch">
                                    <input 
                                      className="form-check-input" 
                                      type="checkbox" 
                                      id="isActive" 
                                      name="isActive" 
                                      checked={formData.isActive} 
                                      onChange={handleFormChange} 
                                    />
                                    <label className="form-check-label" htmlFor="isActive">
                                      Aktifkan periode ini
                                    </label>
                                  </div>
                                </div>
                                <div className="col-12">
                                  <div className="card bg-light">
                                    <div className="card-body">
                                      <h6 className="card-title text-secondary">Preview Periode</h6>
                                      <div className="row">
                                        <div className="col-md-6">
                                          <p className="mb-1">
                                            <strong>Nama:</strong> {formData.namaPeriode}
                                          </p>
                                          <p className="mb-1">
                                            <strong>Tahun/Bulan:</strong> {formData.tahun}/{formData.bulan.toString().padStart(2, '0')}
                                          </p>
                                        </div>
                                        <div className="col-md-6">
                                          <p className="mb-1">
                                            <strong>Tanggal:</strong> {formData.startDate} s/d {formData.endDate}
                                          </p>
                                          <p className="mb-1">
                                            <strong>Status:</strong> 
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
                              {submitting ? 'Menyimpan...' : 'Simpan'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
      )}

      {/* UPDATED Modal Konfirmasi Hapus */}
      {showDeleteModal && periodToDelete && (
          <div className="modal fade show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
              <div className="modal-dialog modal-dialog-centered">
                  <div className="modal-content">
                      <div className="modal-header bg-danger text-white">
                          <h5 className="modal-title">
                            <i className="fas fa-exclamation-triangle me-2"></i>Konfirmasi Hapus Periode
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
                            <strong>Perhatian!</strong> Tindakan ini akan menghapus periode beserta SEMUA data terkait dan tidak dapat dibatalkan.
                          </div>
                          
                          <div className="mb-3">
                            <h6>Periode yang akan dihapus:</h6>
                            <div className="card bg-light">
                              <div className="card-body py-2">
                                <strong>{periodToDelete.namaPeriode}</strong><br/>
                                <small className="text-muted">
                                  {periodToDelete.tahun}/{String(periodToDelete.bulan).padStart(2, '0')}
                                  {periodToDelete.startDate && periodToDelete.endDate && (
                                    <> • {new Date(periodToDelete.startDate).toLocaleDateString('id-ID')} s/d {new Date(periodToDelete.endDate).toLocaleDateString('id-ID')}</>
                                  )}
                                </small>
                              </div>
                            </div>
                          </div>

                          <div className="mb-3">
                            <h6 className="text-danger">Data yang akan ikut terhapus:</h6>
                            <ul className="list-unstyled">
                              <li><i className="fas fa-times text-danger me-2"></i>Semua evaluasi BerAKHLAK</li>
                              <li><i className="fas fa-times text-danger me-2"></i>Semua data presensi</li>
                              <li><i className="fas fa-times text-danger me-2"></i>Semua data CKP</li>
                              <li><i className="fas fa-times text-danger me-2"></i>Semua hasil perhitungan final</li>
                              <li><i className="fas fa-times text-danger me-2"></i>Data Best Employee (jika ada)</li>
                            </ul>
                          </div>

                          <p className="mb-0">
                            Apakah Anda yakin ingin menghapus periode <strong>{periodToDelete.namaPeriode}</strong> beserta semua data terkait?
                          </p>
                      </div>
                      <div className="modal-footer">
                          <button 
                            type="button" 
                            className="btn btn-secondary" 
                            onClick={() => setShowDeleteModal(false)}
                          >
                            <i className="fas fa-times me-2"></i>Batal
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
                                Ya, Hapus Semua
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