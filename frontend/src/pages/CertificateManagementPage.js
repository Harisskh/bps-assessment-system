import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { certificateManagementAPI, periodAPI, getImageUrl } from '../services/api';
import '../styles/CertificateManagementPage.scss';
import '../styles/TemplateSelectionModal.scss';
import config, { BACKEND_BASE_URL } from '../config/config';

const CertificateManagementPage = () => {
  const { user } = useAuth();
  const [bestEmployees, setBestEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [processingStates, setProcessingStates] = useState({});

  // Photo modal states
  const [showPhotoModal, setShowPhotoModal] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState(null);

  // Template selection modal states
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [selectedEmployeeForTemplate, setSelectedEmployeeForTemplate] = useState(null);
  const [nomorSertifikat, setNomorSertifikat] = useState('');
  const [selectedTemplateType, setSelectedTemplateType] = useState('TTD_BASAH');
  const [availableTemplates, setAvailableTemplates] = useState([]);
  const [templatesLoading, setTemplatesLoading] = useState(false);

  // Delete confirmation modal states
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedEmployeeForDelete, setSelectedEmployeeForDelete] = useState(null);

  // Filter states
  const [filterTahun, setFilterTahun] = useState('');
  const [filterBulan, setFilterBulan] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [availablePeriods, setAvailablePeriods] = useState([]);

  // Status options for filter
  const statusOptions = [
    { value: '', label: 'Semua Status' },
    { value: 'BELUM_DIMULAI', label: 'Belum Dimulai' },
    { value: 'TEMPLATE_GENERATED', label: 'Template Ready' },
    { value: 'COMPLETED', label: 'Selesai' }
  ];

  // Role checks
  const canGenerate = user.role === 'ADMIN';
  const canUploadAndDelete = user.role === 'ADMIN' || user.role === 'PIMPINAN';
  const canViewAndDownload = user.role === 'ADMIN' || user.role === 'PIMPINAN';

  // Handle photo click
  const handlePhotoClick = (employee) => {
    console.log('📷 Photo clicked for:', employee.user.nama);
    setSelectedEmployee(employee);
    setShowPhotoModal(true);
    document.body.style.overflow = 'hidden';
  };

  // Handle close photo modal
  const handleClosePhotoModal = () => {
    setShowPhotoModal(false);
    setSelectedEmployee(null);
    document.body.style.overflow = 'unset';
  };

  // Handle template selection modal (ADMIN ONLY)
  const handleTemplateSelectionClick = async (employee) => {
    console.log('📝 Opening template selection modal for:', employee.user.nama);
    setSelectedEmployeeForTemplate(employee);
    
    const existingNumber = employee.certificate?.certificate_number || '';
    setNomorSertifikat(existingNumber);
    setSelectedTemplateType('TTD_BASAH');
    
    await loadAvailableTemplates();
    
    setShowTemplateModal(true);
    document.body.style.overflow = 'hidden';
  };

  // Load available templates
  const loadAvailableTemplates = async () => {
    setTemplatesLoading(true);
    try {
      console.log('🔄 Loading available templates...');
      const response = await certificateManagementAPI.getAvailableTemplates();
      
      if (response.data.success) {
        setAvailableTemplates(response.data.data.templates);
        console.log('✅ Available templates loaded:', response.data.data.templates);
      } else {
        setError('Gagal memuat template: ' + response.data.error);
        setAvailableTemplates([]);
      }
    } catch (error) {
      console.error('❌ Error loading templates:', error);
      setError('Gagal memuat template: ' + (error.response?.data?.message || error.message));
      setAvailableTemplates([]);
    } finally {
      setTemplatesLoading(false);
    }
  };

  // Handle close template modal
  const handleCloseTemplateModal = () => {
    setShowTemplateModal(false);
    setSelectedEmployeeForTemplate(null);
    setNomorSertifikat('');
    setSelectedTemplateType('TTD_BASAH');
    document.body.style.overflow = 'unset';
  };

  // Handle submit template generation (ADMIN ONLY)
  const handleSubmitTemplateGeneration = async () => {
    if (!nomorSertifikat.trim()) {
      setError('Nomor sertifikat harus diisi');
      return;
    }

    if (!selectedTemplateType) {
      setError('Template harus dipilih');
      return;
    }

    if (!selectedEmployeeForTemplate) {
      setError('Data pegawai tidak ditemukan');
      return;
    }

    const selectedTemplate = availableTemplates.find(t => t.key === selectedTemplateType);
    if (!selectedTemplate) {
      setError('Template yang dipilih tidak valid');
      return;
    }

    if (!selectedTemplate.exists) {
      setError(`Template ${selectedTemplate.displayName} tidak ditemukan di server.`);
      return;
    }

    const key = `${selectedEmployeeForTemplate.user.id}-${selectedEmployeeForTemplate.period.id}`;
    setProcessingStates(prev => ({ ...prev, [key]: 'generating' }));
    setError('');
    
    try {
      console.log('🔄 Generating template with type:', selectedTemplateType, 'nomor:', nomorSertifikat);
      const response = await certificateManagementAPI.generateTemplateWithNomor(
        selectedEmployeeForTemplate.user.id, 
        selectedEmployeeForTemplate.period.id,
        nomorSertifikat,
        selectedTemplateType
      );
      
      if (response.data.success) {
        setSuccess(`Sertifikat berhasil di-generate menggunakan ${selectedTemplate.displayName}!`);
        
        setTimeout(() => {
          handlePreviewCertificate(
            selectedEmployeeForTemplate.user.id, 
            selectedEmployeeForTemplate.period.id, 
            selectedEmployeeForTemplate.user.nama
          );
        }, 1000);
        
        fetchBestEmployees();
        handleCloseTemplateModal();
      } else {
        setError('Gagal generate template: ' + response.data.error);
      }
    } catch (error) {
      console.error('❌ Template generation error:', error);
      setError('Terjadi kesalahan: ' + (error.response?.data?.message || error.message));
    } finally {
      setProcessingStates(prev => ({ ...prev, [key]: null }));
    }
  };

  // Handle delete certificate (ADMIN & PIMPINAN)
  const handleDeleteCertificate = (employee) => {
    console.log('🗑️ Opening delete confirmation for:', employee.user.nama);
    setSelectedEmployeeForDelete(employee);
    setShowDeleteModal(true);
    document.body.style.overflow = 'hidden';
  };

  // Handle close delete modal
  const handleCloseDeleteModal = () => {
    setShowDeleteModal(false);
    setSelectedEmployeeForDelete(null);
    document.body.style.overflow = 'unset';
  };

  // Handle confirm delete (ADMIN & PIMPINAN)
  const handleConfirmDelete = async () => {
    if (!selectedEmployeeForDelete) {
      setError('Data pegawai tidak ditemukan');
      return;
    }

    const key = `${selectedEmployeeForDelete.user.id}-${selectedEmployeeForDelete.period.id}`;
    setProcessingStates(prev => ({ ...prev, [key]: 'deleting' }));
    setError('');
    
    try {
      console.log('🗑️ Deleting certificate for:', selectedEmployeeForDelete.user.nama);
      const response = await certificateManagementAPI.deleteCertificate(
        selectedEmployeeForDelete.user.id, 
        selectedEmployeeForDelete.period.id
      );
      
      if (response.data.success) {
        setSuccess(`Sertifikat ${selectedEmployeeForDelete.user.nama} berhasil dihapus!`);
        fetchBestEmployees();
        handleCloseDeleteModal();
      } else {
        setError('Gagal menghapus sertifikat: ' + response.data.error);
      }
    } catch (error) {
      console.error('❌ Delete certificate error:', error);
      setError('Terjadi kesalahan: ' + (error.response?.data?.message || error.message));
    } finally {
      setProcessingStates(prev => ({ ...prev, [key]: null }));
    }
  };

  // Handle certificate preview
  const handlePreviewCertificate = async (userId, periodId, employeeName) => {
    console.log('📋 Opening certificate preview for:', employeeName);
    
    try {
      setError('');
      
      const token = localStorage.getItem('token');
      if (!token) {
        setError('Token tidak ditemukan. Silakan login ulang.');
        return;
      }

      const baseUrl = BACKEND_BASE_URL;
      const apiUrl = `${baseUrl}/api/certificate/download-template/${userId}/${periodId}`;
      
      const response = await fetch(apiUrl, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/pdf',
          'X-Preview-Mode': 'true'
        }
      });

      if (response.ok) {
        const contentType = response.headers.get('content-type');
        
        if (contentType && contentType.includes('application/pdf')) {
          const blob = await response.blob();
          const pdfUrl = URL.createObjectURL(blob);
          
          window.open(pdfUrl, '_blank', 'width=1200,height=800,scrollbars=yes,resizable=yes');
          
          setTimeout(() => {
            URL.revokeObjectURL(pdfUrl);
          }, 10000);
          
          setSuccess(`Preview sertifikat ${employeeName} dibuka di tab baru`);
        } else {
          const errorData = await response.json();
          setError(`Gagal membuka preview: ${errorData.error || 'Response bukan PDF'}`);
        }
      } else {
        const errorText = await response.text();
        try {
          const errorData = JSON.parse(errorText);
          setError(`Gagal membuka preview: ${errorData.error || errorData.message || 'HTTP Error'}`);
        } catch (parseError) {
          setError(`Gagal membuka preview: HTTP ${response.status} - ${response.statusText}`);
        }
      }
      
    } catch (error) {
      console.error('❌ Preview error:', error);
      setError('Gagal membuka preview sertifikat: ' + error.message);
    }
  };

  // ESC key handler untuk modals
  useEffect(() => {
    const handleEscapeKey = (event) => {
      if (event.key === 'Escape') {
        if (showPhotoModal) {
          handleClosePhotoModal();
        }
        if (showTemplateModal) {
          handleCloseTemplateModal();
        }
        if (showDeleteModal) {
          handleCloseDeleteModal();
        }
      }
    };

    if (showPhotoModal || showTemplateModal || showDeleteModal) {
      document.addEventListener('keydown', handleEscapeKey);
      return () => {
        document.removeEventListener('keydown', handleEscapeKey);
      };
    }
  }, [showPhotoModal, showTemplateModal, showDeleteModal]);

  // Get unique years and months from available periods
  const getUniqueYears = () => {
    const years = [...new Set(availablePeriods.map(p => p.tahun))].sort((a, b) => b - a);
    return years;
  };

  const getUniqueMonths = () => {
    const months = [...new Set(availablePeriods.map(p => p.bulan))].sort((a, b) => a - b);
    return months.map(m => ({
      value: m,
      label: getMonthName(m)
    }));
  };

  const getMonthName = (monthNumber) => {
    const months = [
      'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
      'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
    ];
    return months[monthNumber - 1] || 'Januari';
  };

  // Helper untuk generate initials
  const getInitials = (name) => {
    if (!name) return '??';
    const parts = name.split(' ');
    if (parts.length > 1) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  useEffect(() => {
    fetchAvailablePeriods();
  }, []);

  useEffect(() => {
    fetchBestEmployees();
  }, [filterTahun, filterBulan, filterStatus]);

  const fetchAvailablePeriods = async () => {
    try {
      console.log('🔄 Fetching available periods for filters...');
      const response = await periodAPI.getAllSmart({ limit: 1000 });
      
      if (response.data.success !== false) {
        const periods = response.data.data?.periods || response.data.periods || [];
        console.log('✅ Available periods loaded:', periods.length);
        setAvailablePeriods(periods);
      } else {
        console.warn('⚠️ Could not load periods for filters');
        setAvailablePeriods([]);
      }
    } catch (error) {
      console.error('❌ Error fetching periods:', error);
      setAvailablePeriods([]);
    }
  };

  const fetchBestEmployees = async () => {
    setLoading(true);
    try {
      console.log('🔄 Fetching best employees with filters:', { 
        tahun: filterTahun, 
        bulan: filterBulan,
        status: filterStatus
      });

      const response = await certificateManagementAPI.getBestEmployees();
      
      if (response.data.success) {
        console.log('✅ Best employees data:', response.data.data);
        
        let employees = response.data.data.bestEmployees;
        
        if (filterTahun || filterBulan || filterStatus) {
          employees = employees.filter(emp => {
            let matches = true;
            
            if (filterTahun) {
              matches = matches && emp.period.tahun === parseInt(filterTahun);
            }
            
            if (filterBulan) {
              matches = matches && emp.period.bulan === parseInt(filterBulan);
            }

            if (filterStatus) {
              const cert = emp.certificate;
              switch (filterStatus) {
                case 'BELUM_DIMULAI':
                  matches = matches && !cert;
                  break;
                case 'TEMPLATE_GENERATED':
                  matches = matches && cert && cert.template_generated && !cert.is_uploaded;
                  break;
                case 'COMPLETED':
                  matches = matches && cert && cert.is_uploaded && cert.status === 'COMPLETED';
                  break;
                default:
                  break;
              }
            }
            
            return matches;
          });
        }
        
        setBestEmployees(employees);
        console.log('✅ Filtered employees:', employees.length);
      } else {
        setError('Gagal memuat data: ' + response.data.error);
      }
    } catch (error) {
      console.error('❌ Error fetching best employees:', error);
      setError('Terjadi kesalahan: ' + (error.response?.data?.message || error.message));
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadTemplate = async (userId, periodId) => {
    try {
      console.log('📥 Downloading template for:', userId, periodId);
      
      const token = localStorage.getItem('token');
      if (!token) {
        setError('Token autentikasi tidak ditemukan. Silakan login ulang.');
        return;
      }

      const baseUrl = BACKEND_BASE_URL;
      const downloadUrl = `${baseUrl}/api/certificate/download-template/${userId}/${periodId}`;
      
      const response = await fetch(downloadUrl, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/pdf'
        }
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        
        const contentDisposition = response.headers.get('content-disposition');
        let filename = 'template_sertifikat.pdf';
        if (contentDisposition && contentDisposition.includes('filename=')) {
          const matches = contentDisposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
          if (matches != null && matches[1]) {
            filename = matches[1].replace(/['"]/g, '');
          }
        }
        
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
        
        setSuccess('Template berhasil didownload!');
      } else {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
    } catch (error) {
      console.error('❌ Template download error:', error);
      setError('Gagal download template: ' + error.message);
    }
  };

  const handleDownloadFinalCertificate = async (certificateId) => {
    try {
      console.log('📥 Downloading final certificate:', certificateId);
      const response = await certificateManagementAPI.downloadCertificate(certificateId);
      
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      
      const contentDisposition = response.headers.get('content-disposition');
      let filename = `Sertifikat_Final_${certificateId}.pdf`;
      if (contentDisposition && contentDisposition.includes('filename=')) {
        const matches = contentDisposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
        if (matches != null && matches[1]) {
          filename = matches[1].replace(/['"]/g, '');
        }
      }
      
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      setSuccess('Sertifikat final berhasil didownload!');
      
    } catch (error) {
      console.error('❌ Download final certificate error:', error);
      setError('Gagal download sertifikat final: ' + (error.response?.data?.message || error.message));
    }
  };

  // Handle view final certificate
  const handleViewFinalCertificate = async (certificateId, employeeName) => {
    try {
      console.log('👁️ Opening final certificate in new tab:', certificateId);
      setError('');
      
      const token = localStorage.getItem('token');
      if (!token) {
        setError('Token tidak ditemukan. Silakan login ulang.');
        return;
      }

      const baseUrl = BACKEND_BASE_URL;
      const apiUrl = `${baseUrl}/api/certificate/download/${certificateId}`;
      
      const response = await fetch(apiUrl, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/pdf'
        }
      });

      if (response.ok) {
        const contentType = response.headers.get('content-type');
        
        if (contentType && (contentType.includes('application/pdf') || contentType.includes('image/'))) {
          const blob = await response.blob();
          const pdfUrl = URL.createObjectURL(blob);
          
          const newTab = window.open(pdfUrl, '_blank', 'width=1200,height=800,scrollbars=yes,resizable=yes');
          
          if (newTab) {
            newTab.onload = () => {
              newTab.document.title = `Sertifikat Final - ${employeeName}`;
            };
            
            setSuccess(`Sertifikat final ${employeeName} dibuka di tab baru`);
          } else {
            setError('Pop-up diblokir oleh browser. Silakan izinkan pop-up untuk situs ini.');
          }
          
          setTimeout(() => {
            URL.revokeObjectURL(pdfUrl);
          }, 10000);
          
        } else {
          const errorData = await response.json();
          setError(`Gagal membuka sertifikat: ${errorData.error || 'Response bukan PDF'}`);
        }
      } else {
        const errorText = await response.text();
        try {
          const errorData = JSON.parse(errorText);
          setError(`Gagal membuka sertifikat: ${errorData.error || errorData.message || 'HTTP Error'}`);
        } catch (parseError) {
          setError(`Gagal membuka sertifikat: HTTP ${response.status} - ${response.statusText}`);
        }
      }
      
    } catch (error) {
      console.error('❌ View final certificate error:', error);
      setError('Gagal membuka sertifikat final: ' + error.message);
    }
  };

  // Handle upload certificate (ADMIN & PIMPINAN)
  const handleUploadCertificate = async (userId, periodId, file) => {
    const key = `${userId}-${periodId}`;
    setProcessingStates(prev => ({ ...prev, [key]: 'uploading' }));
    setError('');
    
    try {
      console.log('📤 Uploading certificate for:', userId, periodId);
      const response = await certificateManagementAPI.uploadCertificate(userId, periodId, file);
      
      if (response.data.success) {
        setSuccess('Sertifikat final berhasil diupload!');
        fetchBestEmployees();
      } else {
        setError('Gagal upload sertifikat: ' + response.data.error);
      }
    } catch (error) {
      console.error('❌ Certificate upload error:', error);
      setError('Terjadi kesalahan: ' + (error.response?.data?.message || error.message));
    } finally {
      setProcessingStates(prev => ({ ...prev, [key]: null }));
    }
  };

  const handleClearFilters = () => {
    setFilterTahun('');
    setFilterBulan('');
    setFilterStatus('');
  };

  const getStatusBadge = (certificate) => {
    if (!certificate) {
      return <span className="badge bg-secondary">⏳ Belum Dimulai</span>;
    }
    
    if (certificate.is_uploaded && certificate.status === 'COMPLETED') {
      return <span className="badge bg-success">✅ Selesai</span>;
    }
    
    if (certificate.template_generated && !certificate.is_uploaded) {
      return <span className="badge bg-warning">📄 Template Ready</span>;
    }
    
    if (certificate.template_generated) {
      return <span className="badge bg-info">🔄 Proses Offline</span>;
    }
    
    return <span className="badge bg-secondary">⏳ Belum Dimulai</span>;
  };

  const clearMessages = () => {
    setError('');
    setSuccess('');
  };

  // 🔥 LOADING STATE COMPONENT dengan SCSS yang sudah dibuat
  if (loading) {
    return (
      <div className="container-fluid p-4 d-flex justify-content-center align-items-center" style={{ minHeight: '80vh' }}>
        <div className="loading-container text-center">
          <div className="loading-content">
            <div className="loading-spinner mb-3">
              <div className="spinner-border text-primary" role="status">
                <span className="visually-hidden">Loading...</span>
              </div>
            </div>
            <h4>Memuat Data Sertifikat...</h4>
            <p>
              Mohon tunggu sebentar
              <span className="loading-dots">
                <span className="dot"></span>
                <span className="dot"></span>
                <span className="dot"></span>
              </span>
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container-fluid p-4 certificate-management-page">
      {/* 🔥 Enhanced Header sesuai SCSS */}
      <div className="page-header">
        <div className="header-content">
          <div className="header-title">
            <i className="fas fa-certificate header-icon"></i>
            <div>
              <h1>Kelola Sertifikat Best Employee</h1>
              <p className="header-subtitle">
                Kelola template dan upload sertifikat pegawai terbaik BPS Pringsewu
              </p>
            </div>
          </div>
          <div className="header-stats">
            <div className="stat-card">
              <div className="stat-number">{bestEmployees.length}</div>
              <div className="stat-label">
                {filterTahun || filterBulan || filterStatus ? 'Best Employee (Filtered)' : 'Total Best Employee'}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 🔥 Enhanced Filter Section sesuai SCSS */}
      <div className="filter-section mb-4">
        <div className="card">
          <div className="card-header">
            <h5 className="mb-0">
              <i className="fas fa-filter me-2"></i>
              Filter Periode & Status
            </h5>
          </div>
          <div className="card-body">
            <div className="row align-items-end">
              <div className="col-md-2">
                <label htmlFor="filterTahun" className="form-label">Tahun</label>
                <select
                  id="filterTahun"
                  className="form-select"
                  value={filterTahun}
                  onChange={(e) => setFilterTahun(e.target.value)}
                >
                  <option value="">Semua Tahun</option>
                  {getUniqueYears().map(year => (
                    <option key={year} value={year}>{year}</option>
                  ))}
                </select>
              </div>
              
              <div className="col-md-2">
                <label htmlFor="filterBulan" className="form-label">Bulan</label>
                <select
                  id="filterBulan"
                  className="form-select"
                  value={filterBulan}
                  onChange={(e) => setFilterBulan(e.target.value)}
                >
                  <option value="">Semua Bulan</option>
                  {getUniqueMonths().map(month => (
                    <option key={month.value} value={month.value}>
                      {month.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="col-md-3">
                <label htmlFor="filterStatus" className="form-label">Status Sertifikat</label>
                <select
                  id="filterStatus"
                  className="form-select"
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                >
                  {statusOptions.map(option => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
              
              <div className="col-md-2">
                <button
                  className="btn btn-outline-secondary"
                  onClick={handleClearFilters}
                  disabled={!filterTahun && !filterBulan && !filterStatus}
                >
                  <i className="fas fa-times me-2"></i>
                  Clear Filter
                </button>
              </div>
              
              <div className="col-md-3">
                <div className="filter-info">
                  <small className="text-muted">
                    {filterTahun || filterBulan || filterStatus ? (
                      <>
                        <i className="fas fa-info-circle me-1"></i>
                        Menampilkan: {filterTahun && `Tahun ${filterTahun}`} 
                        {filterTahun && filterBulan && ', '}
                        {filterBulan && `Bulan ${getMonthName(parseInt(filterBulan))}`}
                        {(filterTahun || filterBulan) && filterStatus && ', '}
                        {filterStatus && statusOptions.find(s => s.value === filterStatus)?.label}
                      </>
                    ) : (
                      <>
                        <i className="fas fa-list me-1"></i>
                        Menampilkan semua periode & status
                      </>
                    )}
                  </small>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 🔥 Enhanced Alert Messages sesuai SCSS */}
      {error && (
        <div className="alert alert-danger alert-dismissible fade show" role="alert">
          <i className="fas fa-exclamation-triangle me-2"></i>
          {error}
          <button type="button" className="btn-close" onClick={clearMessages}></button>
        </div>
      )}
      {success && (
        <div className="alert alert-success alert-dismissible fade show" role="alert">
          <i className="fas fa-check-circle me-2"></i>
          {success}
          <button type="button" className="btn-close" onClick={clearMessages}></button>
        </div>
      )}

      {/* 🔥 Enhanced Certificate Management Grid sesuai SCSS */}
      <div className="certificates-grid">
        {bestEmployees.map((emp) => {
          const key = `${emp.user.id}-${emp.period.id}`;
          const processing = processingStates[key];
          
          return (
            <div key={key} className="certificate-card">
              {/* 🔥 Period Header di paling atas - sesuai SCSS */}
              <div className="card-period-header">
                <div className="period-highlight">
                  <i className="fas fa-trophy period-icon"></i>
                  <span className="period-text">
                    Pegawai Terbaik Bulan {getMonthName(emp.period.bulan)} {emp.period.tahun}
                  </span>
                </div>
              </div>

              {/* 🔥 Enhanced Card Header sesuai SCSS */}
              <div className="card-header">
                <div className="employee-info">
                  <div className="employee-details">
                    {/* 🔥 Enhanced Employee Photo sesuai SCSS */}
                    <div 
                      className="employee-photo" 
                      onClick={() => handlePhotoClick(emp)}
                      title="Klik untuk melihat foto lebih besar"
                    >
                      {emp.user.profilePicture ? (
                        <img 
                          src={getImageUrl(emp.user.profilePicture)} 
                          alt={emp.user.nama}
                          className="employee-avatar"
                          onError={(e) => {
                            e.target.style.display = 'none';
                            e.target.nextElementSibling.classList.add('show');
                          }}
                        />
                      ) : null}
                      <div 
                        className={`employee-initials ${!emp.user.profilePicture ? 'show' : ''}`}
                      >
                        {getInitials(emp.user.nama)}
                      </div>
                    </div>
                    
                    {/* 🔥 Enhanced Employee Text sesuai SCSS */}
                    <div className="employee-text">
                      <h5>{emp.user.nama}</h5>
                      <p className="employee-nip">NIP: {emp.user.nip}</p>
                      <div className="employee-score">
                        <i className="fas fa-star me-1"></i>
                        Score: {emp.finalScore?.toFixed(2)}
                      </div>
                    </div>
                  </div>
                </div>

                {/* 🔥 Enhanced Period Info sesuai SCSS */}
                <div className="period-info">
                  <div className="period-badge">
                    <i className="fas fa-calendar-alt me-1"></i>
                    Periode {emp.period.bulan}/{emp.period.tahun}
                  </div>
                  <div className="ranking-info">
                    <i className="fas fa-medal me-1"></i>
                    Ranking #{emp.ranking || 1}
                  </div>
                </div>
              </div>
              
              {/* 🔥 Enhanced Card Body sesuai SCSS */}
              <div className="card-body">
                <div className="status-section">
                  <div className="status-label">
                    <i className="fas fa-info-circle me-1"></i>
                    Status Sertifikat:
                  </div>
                  {getStatusBadge(emp.certificate)}
                </div>

                {/* 🔥 Enhanced Certificate Details sesuai SCSS */}
                {emp.certificate && (
                  <div className="certificate-details">
                    {emp.certificate.certificate_number && (
                      <div className="detail-item">
                        <i className="fas fa-hashtag text-info"></i>
                        <span>Nomor: {emp.certificate.certificate_number}</span>
                      </div>
                    )}

                    {emp.certificate.template_type && (
                      <div className="detail-item">
                        <i className="fas fa-file-pdf text-primary"></i>
                        <span>Template: {emp.certificate.template_type === 'TTD_BASAH' ? 'TTD Basah' : 'E-TTD'}</span>
                      </div>
                    )}
                    
                    {emp.certificate.template_generated && (
                      <div className="detail-item">
                        <i className="fas fa-calendar text-primary"></i>
                        <span>Generated: {emp.certificate.generated_at ? new Date(emp.certificate.generated_at).toLocaleDateString('id-ID') : 'N/A'}</span>
                      </div>
                    )}
                    
                    {emp.certificate.is_uploaded && (
                      <div className="detail-item">
                        <i className="fas fa-check-circle text-success"></i>
                        <span>Upload: {emp.certificate.uploaded_at ? new Date(emp.certificate.uploaded_at).toLocaleDateString('id-ID') : 'N/A'}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
              
              {/* 🔥 Enhanced Card Actions sesuai SCSS */}
              <div className="card-actions">
                {/* Generate Template - ADMIN ONLY */}
                {(!emp.certificate || !emp.certificate.template_generated) && canGenerate && (
                  <button
                    className={`btn btn-primary ${processing === 'generating' ? 'btn-loading' : ''}`}
                    onClick={() => handleTemplateSelectionClick(emp)}
                    disabled={processing === 'generating'}
                  >
                    {processing === 'generating' ? (
                      <>
                        <div className="spinner-border spinner-border-sm me-2"></div>
                        Generating...
                      </>
                    ) : (
                      <>
                        <i className="fas fa-plus-circle me-2"></i>
                        Generate Template
                      </>
                    )}
                  </button>
                )}

                {/* Info for Pimpinan when template not generated */}
                {(!emp.certificate || !emp.certificate.template_generated) && !canGenerate && (
                  <div className="alert alert-info mb-0">
                    <i className="fas fa-info-circle me-2"></i>
                    <strong>Menunggu Admin:</strong> Template belum di-generate oleh Admin.
                  </div>
                )}

                {/* Actions setelah template generated - ADMIN & PIMPINAN */}
                {emp.certificate?.template_generated && canViewAndDownload && (
                  <>
                    {/* SEBELUM UPLOAD - Show Template Actions */}
                    {!emp.certificate.is_uploaded && (
                      <>
                        {/* Download Template */}
                        <button
                          className="btn btn-outline-primary"
                          onClick={() => handleDownloadTemplate(emp.user.id, emp.period.id)}
                        >
                          <i className="fas fa-download me-2"></i>
                          Unduh Template
                        </button>

                        {/* Preview Certificate */}
                        <button
                          className="btn btn-outline-info"
                          onClick={() => handlePreviewCertificate(emp.user.id, emp.period.id, emp.user.nama)}
                          title="Buka preview sertifikat di tab baru"
                        >
                          <i className="fas fa-external-link-alt me-2"></i>
                          Preview Sertifikat
                        </button>

                        {/* Upload Final - ADMIN & PIMPINAN */}
                        {canUploadAndDelete && (
                          <div className="upload-section">
                            <label 
                              className={`btn btn-success ${processing === 'uploading' ? 'label-loading disabled' : ''}`} 
                              htmlFor={`upload-${key}`}
                            >
                              {processing === 'uploading' ? (
                                <>
                                  <div className="spinner-border spinner-border-sm me-2"></div>
                                  Uploading...
                                </>
                              ) : (
                                <>
                                  <i className="fas fa-upload me-2"></i>
                                  Upload Final
                                </>
                              )}
                            </label>
                            <input
                              id={`upload-${key}`}
                              type="file"
                              accept=".pdf,image/*"
                              style={{ display: 'none' }}
                              onChange={(e) => {
                                const file = e.target.files[0];
                                if (file) {
                                  handleUploadCertificate(emp.user.id, emp.period.id, file);
                                }
                              }}
                              disabled={processing === 'uploading'}
                            />
                          </div>
                        )}
                      </>
                    )}

                    {/* SETELAH UPLOAD - Show Final Certificate Actions */}
                    {emp.certificate?.is_uploaded && emp.certificate?.id && (
                      <>
                        {/* Unduh Sertifikat Final */}
                        <button
                          className="btn btn-outline-primary"
                          onClick={() => handleDownloadFinalCertificate(emp.certificate.id)}
                          title="Download sertifikat final yang sudah diupload"
                        >
                          <i className="fas fa-download me-2"></i>
                          Unduh Sertifikat Final
                        </button>

                        {/* Upload Ulang - ADMIN & PIMPINAN */}
                        {canUploadAndDelete && (
                          <div className="upload-section">
                            <label 
                              className={`btn btn-warning ${processing === 'uploading' ? 'label-loading disabled' : ''}`} 
                              htmlFor={`upload-replace-${key}`}
                              title="Upload ulang sertifikat final"
                            >
                              {processing === 'uploading' ? (
                                <>
                                  <div className="spinner-border spinner-border-sm me-2"></div>
                                  Uploading...
                                </>
                              ) : (
                                <>
                                  <i className="fas fa-upload me-2"></i>
                                  Upload Ulang
                                </>
                              )}
                            </label>
                            <input
                              id={`upload-replace-${key}`}
                              type="file"
                              accept=".pdf,image/*"
                              style={{ display: 'none' }}
                              onChange={(e) => {
                                const file = e.target.files[0];
                                if (file) {
                                  handleUploadCertificate(emp.user.id, emp.period.id, file);
                                }
                              }}
                              disabled={processing === 'uploading'}
                            />
                          </div>
                        )}

                        {/* Lihat Sertifikat Final */}
                        <button
                          className="btn btn-outline-success"
                          onClick={() => handleViewFinalCertificate(emp.certificate.id, emp.user.nama)}
                          title="Buka sertifikat final di tab baru"
                        >
                          <i className="fas fa-external-link-alt me-2"></i>
                          Lihat Sertifikat Final
                        </button>
                      </>
                    )}

                    {/* Delete Button - ADMIN & PIMPINAN (Always show if certificate exists) */}
                    {canUploadAndDelete && (
                      <button
                        className={`btn btn-outline-danger ${processing === 'deleting' ? 'btn-loading' : ''}`}
                        onClick={() => handleDeleteCertificate(emp)}
                        disabled={processing === 'deleting'}
                        title="Hapus sertifikat dan mulai ulang"
                      >
                        {processing === 'deleting' ? (
                          <>
                            <div className="spinner-border spinner-border-sm me-2"></div>
                            Deleting...
                          </>
                        ) : (
                          <>
                            <i className="fas fa-trash me-2"></i>
                            Hapus
                          </>
                        )}
                      </button>
                    )}
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* 🔥 Enhanced Empty State sesuai SCSS */}
      {bestEmployees.length === 0 && (
        <div className="empty-state">
          <i className="fas fa-certificate fa-3x text-muted mb-3"></i>
          <h4>
            {filterTahun || filterBulan || filterStatus ? 'Tidak Ada Data' : 'Belum Ada Best Employee'}
          </h4>
          <p className="text-muted">
            {filterTahun || filterBulan || filterStatus ? (
              <>
                Tidak ada data yang sesuai dengan filter yang dipilih.
                <br/>
                Coba ubah filter atau lakukan perhitungan final evaluation terlebih dahulu.
              </>
            ) : (
              <>
                Belum ada pegawai yang meraih predikat Best Employee.
                <br/>
                Lakukan perhitungan final evaluation terlebih dahulu di menu{' '}
                <strong>Perhitungan Final</strong>.
              </>
            )}
          </p>
        </div>
      )}

      {/* 🔥 Enhanced Instructions Panel sesuai SCSS */}
      <div className="instructions-panel mt-4">
        <div className="card">
          <div className="card-header">
            <h5 className="mb-0">
              <i className="fas fa-info-circle me-2"></i>
              Petunjuk Penggunaan - Role: {user.role}
            </h5>
          </div>
          <div className="card-body">
            {user.role === 'ADMIN' && (
              <div className="row">
                <div className="col-12">
                  <h6>
                    <i className="fas fa-user-cog me-2 text-primary"></i>
                    Role Admin (Full Access)
                  </h6>
                  <ol>
                    <li>
                      <strong>Generate Template:</strong> Buat template dengan pilihan TTD Basah/E-TTD dan input nomor sertifikat
                    </li>
                    <li>
                      <strong>Download Template:</strong> Unduh template untuk proses sertifikat (tanda tangan manual/E-TTD)
                    </li>
                    <li>
                      <strong>Preview:</strong> Lihat preview sertifikat di tab baru sebelum finalisasi
                    </li>
                    <li>
                      <strong>Upload Final:</strong> Upload sertifikat yang sudah ditandatangani (.pdf atau gambar)
                    </li>
                    <li>
                      <strong>Upload Ulang:</strong> Ganti sertifikat final jika perlu revisi
                    </li>
                    <li>
                      <strong>Download Final:</strong> Unduh sertifikat final untuk distribusi
                    </li>
                    <li>
                      <strong>View Final:</strong> Lihat sertifikat final di tab baru
                    </li>
                    <li>
                      <strong>Hapus:</strong> Reset proses dari awal (template + final)
                    </li>
                  </ol>
                  
                  <div className="alert alert-info mt-3">
                    <i className="fas fa-lightbulb me-2"></i>
                    <strong>Tips Admin:</strong> Gunakan fitur preview untuk memastikan template sudah benar sebelum proses pemberian TTD Sertifikat.
                  </div>
                </div>
              </div>
            )}

            {user.role === 'PIMPINAN' && (
              <div className="row">
                <div className="col-12">
                  <h6>
                    <i className="fas fa-user-tie me-2 text-primary"></i>
                    Role Pimpinan (Management Access)
                  </h6>
                  <ol>
                    <li>
                      <strong>✅ Download Template:</strong> Unduh template setelah Admin generate
                    </li>
                    <li>
                      <strong>✅ Preview:</strong> Lihat preview sertifikat di tab baru
                    </li>
                    <li>
                      <strong>✅ Upload Final:</strong> Upload sertifikat yang sudah ditandatangani
                    </li>
                    <li>
                      <strong>✅ Upload Ulang:</strong> Ganti sertifikat final jika perlu revisi
                    </li>
                    <li>
                      <strong>✅ Download Final:</strong> Unduh sertifikat final
                    </li>
                    <li>
                      <strong>✅ View Final:</strong> Lihat sertifikat final di tab baru
                    </li>
                    <li>
                      <strong>✅ Hapus:</strong> Reset proses dari awal
                    </li>
                  </ol>
                  
                  <div className="alert alert-success mt-3">
                    <i className="fas fa-check-circle me-2"></i>
                    <strong>Pimpinan Access:</strong> Setelah Admin generate template, Pimpinan memiliki akses penuh untuk semua fitur pengelolaan sertifikat.
                  </div>
                </div>
              </div>
            )}

            {user.role === 'STAFF' && (
              <div className="row">
                <div className="col-12">
                  <h6>
                    <i className="fas fa-user me-2 text-primary"></i>
                    Role Staff (View Only)
                  </h6>
                  <div className="alert alert-warning">
                    <i className="fas fa-eye me-2"></i>
                    <strong>Akses Terbatas:</strong> Staff hanya dapat melihat data sertifikat Best Employee. 
                    Untuk pengelolaan sertifikat, hubungi Admin atau Pimpinan.
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

       {/* Template Selection Modal - ADMIN ONLY */}
      {showTemplateModal && selectedEmployeeForTemplate && canGenerate && (
        <div className={`template-selection-modal ${showTemplateModal ? 'show' : ''}`} onClick={handleCloseTemplateModal}>
          <div 
            className={`template-modal-content ${showTemplateModal ? 'show' : ''}`} 
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <h5 className="modal-title">
                <i className="fas fa-file-pdf me-2"></i>
                Generate Template Sertifikat
              </h5>
              <button 
                className="btn-close" 
                onClick={handleCloseTemplateModal}
                aria-label="Close"
              >
                <i className="fas fa-times"></i>
              </button>
            </div>
            
            <div className="modal-body">
              <div className="employee-info-modal">
                <div className="employee-avatar-modal">
                  {selectedEmployeeForTemplate.user.profilePicture ? (
                    <img 
                      src={getImageUrl(selectedEmployeeForTemplate.user.profilePicture)} 
                      alt={selectedEmployeeForTemplate.user.nama}
                    />
                  ) : (
                    <div className="employee-initials-modal">
                      {getInitials(selectedEmployeeForTemplate.user.nama)}
                    </div>
                  )}
                </div>
                <div>
                  <h6>{selectedEmployeeForTemplate.user.nama}</h6>
                  <p className="text-muted mb-0">
                    Best Employee {getMonthName(selectedEmployeeForTemplate.period.bulan)} {selectedEmployeeForTemplate.period.tahun}
                  </p>
                  <small className="text-muted">NIP: {selectedEmployeeForTemplate.user.nip}</small>
                </div>
              </div>

              {/* Template Selection */}
              <div className="form-group mt-3">
                <label htmlFor="templateType" className="form-label">
                  <i className="fas fa-file-pdf me-2"></i>
                  Pilih Template <span className="text-danger">*</span>
                </label>
                {templatesLoading ? (
                  <div className="text-center py-3">
                    <div className="spinner-border spinner-border-sm me-2"></div>
                    Memuat template...
                  </div>
                ) : (
                  <select
                    id="templateType"
                    className="form-select"
                    value={selectedTemplateType}
                    onChange={(e) => setSelectedTemplateType(e.target.value)}
                  >
                    {availableTemplates.map((template) => (
                      <option 
                        key={template.key} 
                        value={template.key}
                        disabled={!template.exists}
                      >
                        {template.displayName} {!template.exists && '(Tidak tersedia)'}
                      </option>
                    ))}
                  </select>
                )}
                
                {availableTemplates.length > 0 && (
                  <div className="template-info mt-2">
                    {availableTemplates.map((template) => (
                      template.key === selectedTemplateType && (
                        <div key={template.key} className={`alert ${template.exists ? 'alert-success' : 'alert-danger'} mb-0`}>
                          <div className="d-flex align-items-center">
                            <i className={`fas ${template.exists ? 'fa-check-circle' : 'fa-exclamation-triangle'} me-2`}></i>
                            <div>
                              <strong>{template.displayName}</strong>
                              <div className="small">
                                {template.description}
                                {!template.exists && (
                                  <div className="text-danger mt-1">
                                    File {template.fileName} tidak ditemukan di folder temp_cert
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      )
                    ))}
                  </div>
                )}
              </div>

              <div className="form-group mt-3">
                <label htmlFor="nomorSertifikat" className="form-label">
                  <i className="fas fa-hashtag me-2"></i>
                  Nomor Sertifikat <span className="text-danger">*</span>
                </label>
                <input
                  type="text"
                  id="nomorSertifikat"
                  className="form-control"
                  value={nomorSertifikat}
                  onChange={(e) => setNomorSertifikat(e.target.value)}
                  placeholder="Contoh: 001/BPS-PWU/VII/2025"
                  autoFocus
                />
                <div className="form-text">
                  <i className="fas fa-info-circle me-1"></i>
                  Format: No_Urut/BPS-PWU/Bulan_Romawi/Tahun
                </div>
              </div>

              <div className="preview-info mt-3">
                <div className="alert alert-light">
                  <strong>Preview Template:</strong>
                  <ul className="mb-0 mt-2">
                    <li>Template: <span className="text-primary">
                      {availableTemplates.find(t => t.key === selectedTemplateType)?.displayName || 'Template dengan TTD Basah'}
                    </span></li>
                    <li>Nomor: <span className="text-primary">{nomorSertifikat || '[Nomor akan ditampilkan]'}</span></li>
                    <li>Nama Pegawai: <strong>{selectedEmployeeForTemplate.user.nama}</strong></li>
                    <li>Periode: <strong>{getMonthName(selectedEmployeeForTemplate.period.bulan)} {selectedEmployeeForTemplate.period.tahun}</strong></li>
                  </ul>
                </div>
              </div>
            </div>
            
            <div className="modal-footer">
              <button 
                className="btn btn-secondary me-2" 
                onClick={handleCloseTemplateModal}
              >
                <i className="fas fa-times me-2"></i>
                Batal
              </button>
              <button 
                className="btn btn-primary" 
                onClick={handleSubmitTemplateGeneration}
                disabled={!nomorSertifikat.trim() || !selectedTemplateType || 
                  (availableTemplates.find(t => t.key === selectedTemplateType) && 
                   !availableTemplates.find(t => t.key === selectedTemplateType).exists)}
              >
                <i className="fas fa-cog me-2"></i>
                Generate Template
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 🔥 DELETE CONFIRMATION MODAL - Enhanced sesuai SCSS */}
      {showDeleteModal && selectedEmployeeForDelete && canUploadAndDelete && (
        <div className={`cert-delete-modal ${showDeleteModal ? 'show' : ''}`} onClick={handleCloseDeleteModal}>
          <div 
            className={`delete-modal-content ${showDeleteModal ? 'show' : ''}`} 
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <h5 className="modal-title">
                <i className="fas fa-exclamation-triangle me-2 text-warning"></i>
                Konfirmasi Hapus Sertifikat
              </h5>
              <button 
                className="btn-close" 
                onClick={handleCloseDeleteModal}
                aria-label="Close"
              >
                <i className="fas fa-times"></i>
              </button>
            </div>
            
            <div className="modal-body">
              {/* Employee Info */}
              <div className="employee-info-modal">
                <div className="employee-avatar-modal">
                  {selectedEmployeeForDelete.user.profilePicture ? (
                    <img 
                      src={getImageUrl(selectedEmployeeForDelete.user.profilePicture)} 
                      alt={selectedEmployeeForDelete.user.nama}
                    />
                  ) : (
                    <div className="employee-initials-modal">
                      {getInitials(selectedEmployeeForDelete.user.nama)}
                    </div>
                  )}
                </div>
                <div>
                  <h6>{selectedEmployeeForDelete.user.nama}</h6>
                  <p className="text-muted mb-0">
                    Best Employee {getMonthName(selectedEmployeeForDelete.period.bulan)} {selectedEmployeeForDelete.period.tahun}
                  </p>
                  <small className="text-muted">NIP: {selectedEmployeeForDelete.user.nip}</small>
                </div>
              </div>

              {/* Warning Message */}
              <div className="warning-message mt-3">
                <div className="alert alert-danger">
                  <i className="fas fa-exclamation-triangle me-2"></i>
                  <strong>Peringatan!</strong> Tindakan ini akan menghapus:
                  <ul className="mb-0 mt-2">
                    <li>File template di folder uploads/cert/</li>
                    {selectedEmployeeForDelete.certificate?.is_uploaded && (
                      <li>File sertifikat final di folder uploads/certificates/</li>
                    )}
                    <li>Record sertifikat dari database</li>
                  </ul>
                </div>
                
                <div className="alert alert-info">
                  <i className="fas fa-info-circle me-2"></i>
                  <strong>Setelah dihapus:</strong> Proses dapat dimulai dari awal lagi dengan generate template baru.
                </div>
              </div>
            </div>
            
            <div className="modal-footer">
              <button 
                className="btn btn-secondary me-2" 
                onClick={handleCloseDeleteModal}
              >
                <i className="fas fa-times me-2"></i>
                Batal
              </button>
              <button 
                className="btn btn-danger" 
                onClick={handleConfirmDelete}
              >
                <i className="fas fa-trash me-2"></i>
                Ya, Hapus Sertifikat
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 🔥 PHOTO MODAL - Enhanced sesuai SCSS */}
      {showPhotoModal && selectedEmployee && (
        <div className={`cert-photo-modal ${showPhotoModal ? 'show' : ''}`} onClick={handleClosePhotoModal}>
          <div 
            className={`photo-modal-content ${showPhotoModal ? 'show' : ''}`} 
            onClick={(e) => e.stopPropagation()}
          >
            <button className="photo-modal-close" onClick={handleClosePhotoModal}>
              <i className="fas fa-times"></i>
            </button>
            
            <div className="photo-content">
              {selectedEmployee.user.profilePicture ? (
                <img 
                  src={getImageUrl(selectedEmployee.user.profilePicture)} 
                  alt={selectedEmployee.user.nama}
                  className="employee-photo-large"
                />
              ) : (
                <div className="employee-initials-large">
                  {getInitials(selectedEmployee.user.nama)}
                </div>
              )}
                    
              <div className="employee-info">
                <h4>{selectedEmployee.user.nama}</h4>
                <p><i className="fas fa-id-card me-2"></i> NIP: {selectedEmployee.user.nip}</p>
                <p><i className="fas fa-briefcase me-2"></i> Jabatan: {selectedEmployee.user.jabatan || 'N/A'}</p>
                <p><i className="fas fa-trophy me-2"></i> Best Employee: {getMonthName(selectedEmployee.period.bulan)} {selectedEmployee.period.tahun}</p>
                <p><i className="fas fa-star me-2"></i> Score: {selectedEmployee.finalScore?.toFixed(2)}</p>
                
                {!selectedEmployee.user.profilePicture && (
                  <p className="no-photo-text">
                    <i className="fas fa-camera me-2"></i>
                    Foto profil belum diatur
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CertificateManagementPage;