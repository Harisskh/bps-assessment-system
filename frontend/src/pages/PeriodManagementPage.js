// src/pages/PeriodManagementPage.js - ENHANCED WITH READ-ONLY EDIT MODE
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
  
  // Delete States
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteStep, setDeleteStep] = useState(1);
  const [periodToDelete, setPeriodToDelete] = useState(null);
  const [periodHasData, setPeriodHasData] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  
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
    const currentYear = new Date().getFullYear();
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
      let submitData;
      
      if (modalMode === 'create') {
        // For create mode, send all data
        submitData = {
          tahun: parseInt(formData.tahun),
          bulan: parseInt(formData.bulan),
          namaPeriode: formData.namaPeriode,
          startDate: formData.startDate,
          endDate: formData.endDate,
          isActive: formData.isActive
        };
        
        console.log('📤 Creating period data:', submitData);
        await periodAPI.create(submitData);
        setSuccess('Periode berhasil dibuat');
      } else {
        // For edit mode, only send editable fields (excluding tahun, bulan, namaPeriode)
        submitData = {
          startDate: formData.startDate,
          endDate: formData.endDate,
          isActive: formData.isActive
        };
        
        console.log('📤 Updating period data:', submitData);
        console.log('🔒 Read-only fields (not sent):', {
          tahun: formData.tahun,
          bulan: formData.bulan,
          namaPeriode: formData.namaPeriode
        });
        
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
      const response = await periodAPI.getAll({ limit: 1000 });
      setAllPeriods(response.data.data.periods);
    } catch (error) {
      console.error('Activate period error:', error);
      setError(error.response?.data?.message || 'Gagal mengaktifkan periode');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeletePeriodClick = (period) => {
    console.log('🔄 Handling delete click for period:', period.namaPeriode);
    
    try {
      setPeriodToDelete(period);
      setDeleteStep(1);
      setDeleteConfirmText('');
      setError('');
      setPeriodHasData(true);
      setShowDeleteModal(true);
      
      setTimeout(async () => {
        try {
          console.log('📊 Background data check for period:', period.id);
          const detailResponse = await periodAPI.getById(period.id);
          const periodDetail = detailResponse.data.data.period;
          
          const hasData = (
            periodDetail._count?.evaluations > 0 ||
            periodDetail._count?.attendances > 0 ||
            periodDetail._count?.ckpScores > 0 ||
            periodDetail._count?.finalEvaluations > 0
          );
          
          console.log('✅ Background data check completed, hasData:', hasData);
          setPeriodHasData(hasData);
        } catch (error) {
          console.error('❌ Background data check error:', error);
          setPeriodHasData(true);
        }
      }, 100);
      
    } catch (error) {
      console.error('❌ handleDeletePeriodClick error:', error);
      setError('Terjadi kesalahan saat menyiapkan dialog hapus');
    }
  };

  const handleDeleteConfirm = () => {
    if (periodHasData) {
      if (deleteStep === 1) {
        setDeleteStep(2);
      } else {
        const expectedText = `hapus ${periodToDelete.namaPeriode}`;
        if (deleteConfirmText.toLowerCase() === expectedText.toLowerCase()) {
          performDelete();
        } else {
          setError('Teks konfirmasi tidak sesuai. Ketik persis: ' + expectedText);
        }
      }
    } else {
      performDelete();
    }
  };

  const performDelete = async () => {
    if (!periodToDelete) return;
    
    try {
      setSubmitting(true);
      const response = await periodAPI.delete(periodToDelete.id);
      setSuccess(response.data.message || `Periode ${periodToDelete.namaPeriode} berhasil dihapus`);
      setShowDeleteModal(false);
      setPeriodToDelete(null);
      setDeleteStep(1);
      setDeleteConfirmText('');
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

  const handleDeleteCancel = () => {
    setShowDeleteModal(false);
    setPeriodToDelete(null);
    setDeleteStep(1);
    setDeleteConfirmText('');
    setPeriodHasData(false);
  };

  const getMonthName = (month) => {
    const monthNames = [
      'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
      'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
    ];
    return monthNames[month - 1];
  };
  
  const getLastDayOfMonth = (year, month) => new Date(year, month, 0).getDate();
  
  // 🔒 Modified handleFormChange to prevent changes in edit mode for read-only fields
  const handleFormChange = (e) => {
    const { name, value, type, checked } = e.target;
    
    // 🔒 Block changes to read-only fields in edit mode
    if (modalMode === 'edit' && (name === 'tahun' || name === 'bulan' || name === 'namaPeriode')) {
      console.log(`🔒 Blocked attempt to change ${name} in edit mode`);
      return;
    }
    
    setFormData(prev => {
      const newFormState = {
        ...prev,
        [name]: type === 'checkbox' ? checked : value
      };
      
      // Only auto-generate namaPeriode in create mode
      if (modalMode === 'create' && (name === 'tahun' || name === 'bulan')) {
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
    return yearsFromData.sort((a, b) => b - a).map(year => ({
      value: year,
      label: year.toString()
    }));
  };
  
  const modalYearOptions = generateModalYearOptions();
  const filterYearOptions = generateFilterYearOptions();

  const customSelectStyles = {
    control: (provided, state) => ({
      ...provided,
      borderRadius: '0.75rem',
      minHeight: '48px',
      border: `2px solid ${state.isFocused ? '#2c549c' : '#ced4da'}`,
      boxShadow: state.isFocused ? '0 0 0 3px rgba(44, 84, 156, 0.1)' : 'none',
      '&:hover': {
        borderColor: '#2c549c'
      }
    }),
    menu: (provided) => ({
      ...provided,
      borderRadius: '0.75rem',
      border: '1px solid #ced4da',
      boxShadow: '0 8px 30px rgba(0, 0, 0, 0.12)',
      zIndex: 1056
    }),
    option: (provided, state) => ({
      ...provided,
      padding: '12px 16px',
      backgroundColor: state.isSelected ? '#2c549c' : state.isFocused ? '#f8f9fa' : 'white',
      color: state.isSelected ? 'white' : state.isFocused ? '#2c549c' : '#495057',
      '&:hover': {
        backgroundColor: state.isSelected ? '#2c549c' : '#f8f9fa',
        color: state.isSelected ? 'white' : '#2c549c'
      }
    })
  };

  const clearFilter = () => {
    setYearFilter(null);
    setCurrentPage(1);
  };

  return (
    <div className="container-fluid p-4 period-management-page">
      {/* Header */}
      <div className="page-header">
        <div className="header-content">
          <div className="header-title">
            <i className="fas fa-calendar-alt header-icon"></i>
            <div>
              <h1>Kelola Periode Penilaian</h1>
              <p className="header-subtitle">Atur periode penilaian dan aktivasi sistem evaluasi pegawai</p>
            </div>
          </div>
          <button className="btn btn-add-period" onClick={handleCreatePeriod}>
            <i className="fas fa-plus me-2"></i>Tambah Periode
          </button>
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
      
      {/* Filter Section */}
      <div className="filter-section">
        <div className="filter-header">
          <h5>
            <i className="fas fa-filter"></i>
            Filter & Pencarian
          </h5>
          <div className="active-period-badge">
            <i className="fas fa-check-circle"></i>
            <span>Periode Aktif: <strong>{activePeriodInfo}</strong></span>
          </div>
        </div>
        
        <div className="filter-controls">
          <div className="filter-group">
            <label htmlFor="year-filter">Filter Tahun:</label>
            <div className="filter-select-wrapper">
              <Select
                id="year-filter"
                options={filterYearOptions}
                value={yearFilter}
                onChange={(option) => {
                  setYearFilter(option);
                  setCurrentPage(1);
                }}
                placeholder="Pilih tahun..."
                isClearable
                styles={customSelectStyles}
                noOptionsMessage={() => "Tidak ada tahun tersedia"}
              />
            </div>
          </div>
          
          <div className="filter-actions">
            {yearFilter && (
              <button className="btn btn-clear-filter" onClick={clearFilter}>
                <i className="fas fa-times me-1"></i>
                Bersihkan Filter
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Table Section */}
      <div className="table-section">
        <div className="table-header">
          <h5>
            <i className="fas fa-table"></i>
            Daftar Periode Penilaian
          </h5>
        </div>
        
        <div className="table-responsive">
          <table className="table period-table">
            <thead>
              <tr>
                <th className="d-none d-md-table-cell">No.</th>
                <th>Periode</th>
                <th className="d-none d-md-table-cell">Tanggal Mulai</th>
                <th className="d-none d-md-table-cell">Tanggal Selesai</th>
                <th>Status</th>
                <th>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="6" className="text-center p-5">
                    <div className="spinner-border text-primary" role="status">
                      <span className="visually-hidden">Loading...</span>
                    </div>
                  </td>
                </tr>
              ) : periods.length > 0 ? (
                periods.map((period, index) => (
                  <tr key={period.id}>
                    <td className="d-none d-md-table-cell text-center fw-bold text-muted">
                      {((currentPage - 1) * 10) + index + 1}
                    </td>
                    <td>
                      <div>
                        <strong>{period.namaPeriode}</strong>
                        <br />
                        <small className="text-muted">
                          {period.tahun}/{String(period.bulan).padStart(2, '0')}
                        </small>
                      </div>
                    </td>
                    <td className="d-none d-md-table-cell">
                      {period.startDate ?
                        new Date(period.startDate).toLocaleDateString('id-ID', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric'
                        }) : '-'
                      }
                    </td>
                    <td className="d-none d-md-table-cell">
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
                        <i className={`fas ${period.isActive ? 'fa-check-circle' : 'fa-pause-circle'}`}></i>
                        <span className="d-none d-md-inline ms-1">
                          {period.isActive ? 'Aktif' : 'Nonaktif'}
                        </span>
                      </span>
                    </td>
                    <td>
                      <div className="action-buttons">
                        <button
                          className="btn btn-sm action-edit"
                          onClick={() => handleEditPeriod(period)}
                          title="Edit Periode"
                        >
                          <i className="fas fa-edit"></i>
                        </button>
                        {!period.isActive && (
                          <button
                            className="btn btn-sm action-activate"
                            onClick={() => handleActivatePeriod(period.id)}
                            title="Aktifkan Periode"
                            disabled={submitting}
                          >
                            <i className="fas fa-play"></i>
                          </button>
                        )}
                        <button
                          className="btn btn-sm action-delete"
                          onClick={() => handleDeletePeriodClick(period)}
                          title="Hapus Periode"
                          disabled={period.isActive || submitting}
                        >
                          <i className="fas fa-trash"></i>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="6" className="text-center p-5 text-muted">
                    <i className="fas fa-inbox fa-2x mb-3 d-block"></i>
                    {yearFilter ? 
                      `Tidak ada periode untuk tahun ${yearFilter.label}` :
                      'Belum ada periode yang dibuat'
                    }
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
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
                <i className="fas fa-chevron-left"></i>
                <span className="d-none d-md-inline ms-1">Previous</span>
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
                <span className="d-none d-md-inline me-1">Next</span>
                <i className="fas fa-chevron-right"></i>
              </button>
            </li>
          </ul>
        </nav>
      )}

      {/* 🔒 Modal Tambah/Edit Periode - WITH READ-ONLY FIELDS IN EDIT MODE */}
      {showModal && (
        <div className="modal fade show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-lg modal-dialog-centered">
            <div className="modal-content">
              <form onSubmit={handleFormSubmit}>
                <div className="modal-header">
                  <h5 className="modal-title">
                    <i className={`fas ${modalMode === 'create' ? 'fa-plus' : 'fa-edit'} me-2`}></i>
                    {modalMode === 'create' ? 'Tambah Periode Baru' : 'Edit Periode'}
                  </h5>
                  <button
                    type="button"
                    className="btn-close"
                    onClick={() => setShowModal(false)}
                  ></button>
                </div>
                <div className="modal-body">
                  {/* 🔒 Show notification in edit mode */}
                  {modalMode === 'edit' && (
                    <div className="alert alert-info mb-4">
                      <i className="fas fa-info-circle me-2"></i>
                      <strong>Catatan:</strong> Tahun, bulan, dan nama periode tidak dapat diubah setelah periode dibuat.
                      Anda hanya dapat mengedit tanggal mulai, tanggal selesai, dan status aktif.
                    </div>
                  )}
                  
                  <div className="row g-3">
                    <div className="col-6">
                      <label className="form-label">
                        Tahun * 
                        {modalMode === 'edit' && <i className="fas fa-lock text-muted ms-1" title="Tidak dapat diubah"></i>}
                      </label>
                      {modalMode === 'create' ? (
                        <Select
                          options={modalYearOptions}
                          value={modalYearOptions.find(y => y.value === formData.tahun)}
                          onChange={(opt) => handleFormChange({
                            target: { name: 'tahun', value: opt.value }
                          })}
                          styles={customSelectStyles}
                          placeholder="Pilih Tahun"
                        />
                      ) : (
                        <input
                          type="text"
                          className="form-control"
                          value={formData.tahun}
                          readOnly
                          disabled
                          style={{ 
                            minHeight: '48px', 
                            borderRadius: '0.75rem',
                            backgroundColor: '#f8f9fa',
                            color: '#6c757d'
                          }}
                        />
                      )}
                    </div>
                    <div className="col-6">
                      <label className="form-label">
                        Bulan * 
                        {modalMode === 'edit' && <i className="fas fa-lock text-muted ms-1" title="Tidak dapat diubah"></i>}
                      </label>
                      {modalMode === 'create' ? (
                        <select
                          className="form-select"
                          name="bulan"
                          value={formData.bulan}
                          onChange={handleFormChange}
                          required
                          style={{ minHeight: '48px', borderRadius: '0.75rem' }}
                        >
                          {Array.from({ length: 12 }, (_, i) => (
                            <option key={i + 1} value={i + 1}>
                              {getMonthName(i + 1)}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <input
                          type="text"
                          className="form-control"
                          value={getMonthName(formData.bulan)}
                          readOnly
                          disabled
                          style={{ 
                            minHeight: '48px', 
                            borderRadius: '0.75rem',
                            backgroundColor: '#f8f9fa',
                            color: '#6c757d'
                          }}
                        />
                      )}
                    </div>
                    <div className="col-12">
                      <label className="form-label">
                        Nama Periode * 
                        {modalMode === 'edit' && <i className="fas fa-lock text-muted ms-1" title="Tidak dapat diubah"></i>}
                      </label>
                      <input
                        type="text"
                        className="form-control"
                        name="namaPeriode"
                        value={formData.namaPeriode}
                        onChange={handleFormChange}
                        required={modalMode === 'create'}
                        readOnly={modalMode === 'edit'}
                        disabled={modalMode === 'edit'}
                        style={{ 
                          minHeight: '48px', 
                          borderRadius: '0.75rem',
                          backgroundColor: modalMode === 'edit' ? '#f8f9fa' : 'white',
                          color: modalMode === 'edit' ? '#6c757d' : 'inherit'
                        }}
                      />
                    </div>
                    <div className="col-6">
                      <label className="form-label">Tanggal Mulai</label>
                      <input
                        type="date"
                        className="form-control"
                        name="startDate"
                        value={formData.startDate}
                        onChange={handleFormChange}
                        style={{ minHeight: '48px', borderRadius: '0.75rem' }}
                      />
                    </div>
                    <div className="col-6">
                      <label className="form-label">Tanggal Selesai</label>
                      <input
                        type="date"
                        className="form-control"
                        name="endDate"
                        value={formData.endDate}
                        onChange={handleFormChange}
                        style={{ minHeight: '48px', borderRadius: '0.75rem' }}
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
                          <strong>Aktifkan periode ini</strong>
                        </label>
                      </div>
                    </div>
                    <div className="col-12">
                      <div className="card bg-light">
                        <div className="card-body">
                          <h6 className="card-title text-secondary">
                            <i className="fas fa-eye me-2"></i>Preview Periode
                          </h6>
                          <div className="row">
                            <div className="col-md-6">
                              <p className="mb-1">
                                <strong>Nama:</strong> {formData.namaPeriode}
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
                    <i className="fas fa-times me-2"></i>Batal
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
                      <>
                        <i className="fas fa-save me-2"></i>Simpan
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Delete Modal */}
      {showDeleteModal && periodToDelete && (
        <div className="modal fade show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-lg modal-dialog-centered">
            <div className="modal-content delete-modal">
              <div className="modal-header">
                <h5 className="modal-title">
                  <i className="fas fa-exclamation-triangle me-2"></i>
                  {deleteStep === 1 ? 'Peringatan Hapus Periode' : 'Konfirmasi Final'}
                </h5>
                <button
                  type="button"
                  className="btn-close btn-close-white"
                  onClick={handleDeleteCancel}
                ></button>
              </div>
              <div className="modal-body">
                {deleteStep === 1 && (
                  <>
                    <div className="alert alert-warning">
                      <i className="fas fa-exclamation-triangle me-2"></i>
                      <strong>Perhatian!</strong> Anda akan menghapus periode penilaian.
                    </div>
                    
                    <div className="mb-3">
                      <h6>Periode yang akan dihapus:</h6>
                      <div className="card bg-light">
                        <div className="card-body py-2">
                          <strong>{periodToDelete.namaPeriode}</strong><br />
                          <small className="text-muted">
                            {periodToDelete.tahun}/{String(periodToDelete.bulan).padStart(2, '0')}
                            {periodToDelete.startDate && periodToDelete.endDate && (
                              <> • {new Date(periodToDelete.startDate).toLocaleDateString('id-ID')} s/d {new Date(periodToDelete.endDate).toLocaleDateString('id-ID')}</>
                            )}
                          </small>
                        </div>
                      </div>
                    </div>

                    {periodHasData && (
                      <div className="data-impact-list">
                        <h6 className="text-danger mb-3">
                          <i className="fas fa-database me-2"></i>
                          Data yang akan ikut terhapus:
                        </h6>
                        <ul>
                          <li><i className="fas fa-times"></i>Semua evaluasi BerAKHLAK</li>
                          <li><i className="fas fa-times"></i>Semua data presensi</li>
                          <li><i className="fas fa-times"></i>Semua data CKP</li>
                          <li><i className="fas fa-times"></i>Semua hasil perhitungan final</li>
                          <li><i className="fas fa-times"></i>Data Best Employee (jika ada)</li>
                        </ul>
                      </div>
                    )}

                    <p className="mt-3">
                      {periodHasData ? (
                        <>
                          <strong className="text-danger">Periode ini memiliki data!</strong> 
                          Tindakan ini akan menghapus semua data terkait dan tidak dapat dibatalkan.
                        </>
                      ) : (
                        <>
                          <strong className="text-info">Periode ini belum memiliki data.</strong> 
                          Apakah Anda yakin ingin menghapus?
                        </>
                      )}
                    </p>
                  </>
                )}

                {deleteStep === 2 && (
                  <>
                    <div className="alert alert-danger">
                      <i className="fas fa-exclamation-triangle me-2"></i>
                      <strong>KONFIRMASI TERAKHIR!</strong> Tindakan ini tidak dapat dibatalkan.
                    </div>

                    <div className="mb-3">
                      <p className="mb-2">
                        Untuk melanjutkan penghapusan, ketik teks berikut persis:
                      </p>
                      <div className="card bg-light">
                        <div className="card-body text-center">
                          <code className="text-danger fs-5">
                            hapus {periodToDelete.namaPeriode}
                          </code>
                        </div>
                      </div>
                    </div>

                    <div className="mb-3">
                      <label className="form-label">Konfirmasi Penghapusan:</label>
                      <input
                        type="text"
                        className="form-control"
                        value={deleteConfirmText}
                        onChange={(e) => setDeleteConfirmText(e.target.value)}
                        placeholder="Ketik teks konfirmasi..."
                        style={{ minHeight: '48px', borderRadius: '0.75rem' }}
                      />
                    </div>

                    <p className="text-muted small">
                      <i className="fas fa-info-circle me-1"></i>
                      Teks harus diketik persis seperti yang ditampilkan di atas.
                    </p>
                  </>
                )}
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={handleDeleteCancel}
                >
                  <i className="fas fa-times me-2"></i>Batal
                </button>
                <button
                  type="button"
                  className="btn btn-danger"
                  onClick={handleDeleteConfirm}
                  disabled={submitting || (deleteStep === 2 && !deleteConfirmText)}
                >
                  {submitting ? (
                    <>
                      <span className="spinner-border spinner-border-sm me-2"></span>
                      Menghapus...
                    </>
                  ) : deleteStep === 1 ? (
                    <>
                      <i className="fas fa-arrow-right me-2"></i>
                      {periodHasData ? 'Lanjutkan' : 'Ya, Hapus'}
                    </>
                  ) : (
                    <>
                      <i className="fas fa-trash me-2"></i>
                      HAPUS PERMANEN
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