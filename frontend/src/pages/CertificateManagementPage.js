import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { certificateManagementAPI, periodAPI, getImageUrl } from '../services/api';
import '../styles/CertificateManagementPage.scss';

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

  // Nomor sertifikat modal states
  const [showNomorModal, setShowNomorModal] = useState(false);
  const [selectedEmployeeForNomor, setSelectedEmployeeForNomor] = useState(null);
  const [nomorSertifikat, setNomorSertifikat] = useState('');

  // 🔥 NEW: Delete confirmation modal states
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

  // Handle nomor sertifikat modal
  const handleNomorSertifikatClick = (employee) => {
    console.log('📝 Opening nomor sertifikat modal for:', employee.user.nama);
    setSelectedEmployeeForNomor(employee);
    
    // Pre-fill dengan nomor yang sudah ada jika ada
    const existingNumber = employee.certificate?.certificate_number || '';
    setNomorSertifikat(existingNumber);
    
    setShowNomorModal(true);
    document.body.style.overflow = 'hidden';
  };

  // Handle close nomor modal
  const handleCloseNomorModal = () => {
    setShowNomorModal(false);
    setSelectedEmployeeForNomor(null);
    setNomorSertifikat('');
    document.body.style.overflow = 'unset';
  };

  // Handle submit nomor sertifikat
  const handleSubmitNomorSertifikat = async () => {
    if (!nomorSertifikat.trim()) {
      setError('Nomor sertifikat harus diisi');
      return;
    }

    if (!selectedEmployeeForNomor) {
      setError('Data pegawai tidak ditemukan');
      return;
    }

    const key = `${selectedEmployeeForNomor.user.id}-${selectedEmployeeForNomor.period.id}`;
    setProcessingStates(prev => ({ ...prev, [key]: 'generating' }));
    setError('');
    
    try {
      console.log('🔄 Generating template with nomor:', nomorSertifikat);
      const response = await certificateManagementAPI.generateTemplateWithNomor(
        selectedEmployeeForNomor.user.id, 
        selectedEmployeeForNomor.period.id,
        nomorSertifikat
      );
      
      if (response.data.success) {
        setSuccess(`Sertifikat dengan nomor ${nomorSertifikat} berhasil di-generate! Template disimpan ke folder uploads/cert`);
        
        // Auto preview setelah berhasil generate
        setTimeout(() => {
          handlePreviewCertificate(
            selectedEmployeeForNomor.user.id, 
            selectedEmployeeForNomor.period.id, 
            selectedEmployeeForNomor.user.nama
          );
        }, 1000);
        
        fetchBestEmployees(); // Refresh data
        handleCloseNomorModal(); // Close modal
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

  // 🔥 NEW: Handle delete certificate
  const handleDeleteCertificate = (employee) => {
    console.log('🗑️ Opening delete confirmation for:', employee.user.nama);
    setSelectedEmployeeForDelete(employee);
    setShowDeleteModal(true);
    document.body.style.overflow = 'hidden';
  };

  // 🔥 NEW: Handle close delete modal
  const handleCloseDeleteModal = () => {
    setShowDeleteModal(false);
    setSelectedEmployeeForDelete(null);
    document.body.style.overflow = 'unset';
  };

  // 🔥 NEW: Handle confirm delete
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
        setSuccess(`Sertifikat ${selectedEmployeeForDelete.user.nama} berhasil dihapus! Proses dapat dimulai dari awal.`);
        fetchBestEmployees(); // Refresh data
        handleCloseDeleteModal(); // Close modal
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

  // Handle certificate preview dengan download approach
  const handlePreviewCertificate = async (userId, periodId, employeeName) => {
    console.log('📋 Opening certificate preview for:', employeeName);
    
    try {
      setError(''); // Clear previous errors
      
      const token = localStorage.getItem('token');
      if (!token) {
        setError('Token tidak ditemukan. Silakan login ulang.');
        return;
      }

      console.log('🔄 Fetching certificate via API...');
      
      // Gunakan fetch dengan Authorization header (lebih reliable)
      const baseUrl = process.env.REACT_APP_API_URL?.replace('/api', '') || 'http://localhost:5000';
      const apiUrl = `${baseUrl}/api/certificate/download-template/${userId}/${periodId}`;
      
      const response = await fetch(apiUrl, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/pdf',
          'X-Preview-Mode': 'true'
        }
      });

      console.log('📡 Response status:', response.status);
      console.log('📡 Response headers:', response.headers);

      if (response.ok) {
        // Check content type
        const contentType = response.headers.get('content-type');
        console.log('📄 Content type:', contentType);
        
        if (contentType && contentType.includes('application/pdf')) {
          // It's a PDF, create blob and open
          const blob = await response.blob();
          const pdfUrl = URL.createObjectURL(blob);
          
          console.log('✅ PDF blob created, opening in new tab');
          window.open(pdfUrl, '_blank', 'width=1200,height=800,scrollbars=yes,resizable=yes');
          
          // Clean up blob URL after some time
          setTimeout(() => {
            URL.revokeObjectURL(pdfUrl);
          }, 10000);
          
          setSuccess(`Preview sertifikat ${employeeName} dibuka di tab baru`);
        } else {
          // Probably JSON error response
          const errorData = await response.json();
          console.error('❌ Error response:', errorData);
          setError(`Gagal membuka preview: ${errorData.error || 'Response bukan PDF'}`);
        }
      } else {
        // Handle HTTP error
        const errorText = await response.text();
        console.error('❌ HTTP Error:', response.status, errorText);
        
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
        if (showNomorModal) {
          handleCloseNomorModal();
        }
        if (showDeleteModal) {
          handleCloseDeleteModal();
        }
      }
    };

    if (showPhotoModal || showNomorModal || showDeleteModal) {
      document.addEventListener('keydown', handleEscapeKey);
      return () => {
        document.removeEventListener('keydown', handleEscapeKey);
      };
    }
  }, [showPhotoModal, showNomorModal, showDeleteModal]);

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
        
        // Apply client-side filtering if backend doesn't support it yet
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

      const baseUrl = process.env.REACT_APP_API_URL?.replace('/api', '') || 'http://localhost:5000';
      const downloadUrl = `${baseUrl}/api/certificate/download-template/${userId}/${periodId}`;
      
      console.log('📥 Download URL:', downloadUrl);

      try {
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
          
          setSuccess('Template berhasil didownload dari folder uploads/cert!');
        } else {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
      } catch (fetchError) {
        console.warn('Fetch method failed, trying alternative:', fetchError);
        const urlWithToken = `${downloadUrl}?token=${encodeURIComponent(token)}`;
        window.open(urlWithToken, '_blank', 'noopener,noreferrer');
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
    
    // Get filename from response headers
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

// 🔥 FIXED: Handle view final certificate (open in new tab, NOT download)
const handleViewFinalCertificate = async (certificateId, employeeName) => {
  try {
    console.log('👁️ Opening final certificate in new tab:', certificateId);
    setError(''); // Clear previous errors
    
    const token = localStorage.getItem('token');
    if (!token) {
      setError('Token tidak ditemukan. Silakan login ulang.');
      return;
    }

    console.log('🔄 Fetching final certificate via API...');
    
    // Create URL for viewing certificate in new tab
    const baseUrl = process.env.REACT_APP_API_URL?.replace('/api', '') || 'http://localhost:5000';
    const apiUrl = `${baseUrl}/api/certificate/download/${certificateId}`;
    
    // Use fetch to get the PDF as blob for preview
    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/pdf'
      }
    });

    console.log('📡 Final certificate response status:', response.status);

    if (response.ok) {
      // Check content type
      const contentType = response.headers.get('content-type');
      console.log('📄 Final certificate content type:', contentType);
      
      if (contentType && (contentType.includes('application/pdf') || contentType.includes('image/'))) {
        // It's a PDF or image, create blob and open in new tab
        const blob = await response.blob();
        const pdfUrl = URL.createObjectURL(blob);
        
        console.log('✅ Final certificate blob created, opening in new tab');
        
        // Open in new tab for viewing
        const newTab = window.open(pdfUrl, '_blank', 'width=1200,height=800,scrollbars=yes,resizable=yes');
        
        if (newTab) {
          // Set title for the new tab
          newTab.onload = () => {
            newTab.document.title = `Sertifikat Final - ${employeeName}`;
          };
          
          setSuccess(`Sertifikat final ${employeeName} dibuka di tab baru`);
        } else {
          setError('Pop-up diblokir oleh browser. Silakan izinkan pop-up untuk situs ini.');
        }
        
        // Clean up blob URL after some time
        setTimeout(() => {
          URL.revokeObjectURL(pdfUrl);
        }, 10000);
        
      } else {
        // Probably JSON error response
        const errorData = await response.json();
        console.error('❌ Error response:', errorData);
        setError(`Gagal membuka sertifikat: ${errorData.error || 'Response bukan PDF'}`);
      }
    } else {
      // Handle HTTP error
      const errorText = await response.text();
      console.error('❌ HTTP Error:', response.status, errorText);
      
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

// 🔥 UPDATED: Handle upload certificate (support upload ulang)
const handleUploadCertificate = async (userId, periodId, file) => {
  const key = `${userId}-${periodId}`;
  setProcessingStates(prev => ({ ...prev, [key]: 'uploading' }));
  setError('');
  
  try {
    console.log('📤 Uploading certificate for:', userId, periodId);
    const response = await certificateManagementAPI.uploadCertificate(userId, periodId, file);
    
    if (response.data.success) {
      setSuccess('Sertifikat final berhasil diupload ke folder uploads/certificates!');
      fetchBestEmployees(); // Refresh data
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

  if (loading) {
    return (
      <div className="container-fluid p-4">
        <div className="loading-container">
          <div className="loading-content">
            <div className="loading-spinner">
              <div className="spinner-border text-primary" role="status">
                <span className="visually-hidden">Loading...</span>
              </div>
            </div>
            <h4>Memuat Data Sertifikat...</h4>
            <p>Mohon tunggu sebentar</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container-fluid p-4 certificate-management-page">
      {/* Header */}
      <div className="page-header">
        <div className="header-content">
          <div className="header-title">
            <i className="fas fa-certificate header-icon"></i>
            <div>
              <h1>Kelola Sertifikat</h1>
              <p className="header-subtitle">
                Kelola template dan upload sertifikat Best Employee
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

      {/* Filter Section */}
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

      {/* Alert Messages */}
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

      {/* Certificate Management Grid */}
      <div className="certificates-grid">
        {bestEmployees.map((emp) => {
          const key = `${emp.user.id}-${emp.period.id}`;
          const processing = processingStates[key];
          
          return (
            <div key={key} className="certificate-card">
              {/* Period Header di paling atas */}
              <div className="card-period-header">
                <div className="period-highlight">
                  <i className="fas fa-trophy period-icon"></i>
                  <span className="period-text">
                    Pegawai Terbaik Bulan {getMonthName(emp.period.bulan)} {emp.period.tahun}
                  </span>
                </div>
              </div>

              <div className="card-header">
                <div className="employee-info">
                  <div className="employee-details">
                    {/* Employee Photo with Click Handler */}
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
                    
                    <div className="employee-text">
                      <h5>{emp.user.nama}</h5>
                      <p className="employee-nip">{emp.user.nip}</p>
                      <div className="employee-score">Score: {emp.finalScore?.toFixed(2)}</div>
                    </div>
                  </div>
                </div>

                <div className="period-info">
                  <div className="period-badge">
                    Periode {emp.period.bulan}/{emp.period.tahun}
                  </div>
                  <div className="ranking-info">
                    Ranking #{emp.ranking || 1}
                  </div>
                </div>
              </div>
              
              <div className="card-body">
                <div className="status-section">
                  <div className="status-label">Status:</div>
                  {getStatusBadge(emp.certificate)}
                </div>

                {emp.certificate && (
                  <div className="certificate-details">
                    {/* Show certificate number if exists */}
                    {emp.certificate.certificate_number && (
                      <div className="detail-item">
                        <i className="fas fa-hashtag text-info"></i>
                        <span>Nomor: {emp.certificate.certificate_number}</span>
                      </div>
                    )}
                    
                    {emp.certificate.template_generated && (
                      <div className="detail-item">
                        <i className="fas fa-file-pdf text-primary"></i>
                        <span>Template: {emp.certificate.generated_at ? new Date(emp.certificate.generated_at).toLocaleDateString('id-ID') : 'N/A'}</span>
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
              
              <div className="card-actions">
              {/* Generate Template with Nomor Button - Admin Only */}
              {(!emp.certificate || !emp.certificate.template_generated) && user.role === 'ADMIN' && (
                <button
                  className="btn btn-primary"
                  onClick={() => handleNomorSertifikatClick(emp)}
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

              {/* SEBELUM UPLOAD - Show: Download Template, Preview, Upload Final */}
              {emp.certificate?.template_generated && !emp.certificate?.is_uploaded && (
                <>
                  {/* Download Template Button */}
                  <button
                    className="btn btn-outline-primary"
                    onClick={() => handleDownloadTemplate(emp.user.id, emp.period.id)}
                  >
                    <i className="fas fa-download me-2"></i>
                    Unduh Template
                  </button>

                  {/* Preview Certificate Button */}
                  <button
                    className="btn btn-outline-info"
                    onClick={() => handlePreviewCertificate(emp.user.id, emp.period.id, emp.user.nama)}
                    title="Buka preview sertifikat di tab baru"
                  >
                    <i className="fas fa-external-link-alt me-2"></i>
                    Preview Sertifikat
                  </button>

                  {/* Upload Final Certificate - Admin Only */}
                  {user.role === 'ADMIN' && (
                    <div className="upload-section">
                      <label 
                        className={`btn btn-success ${processing === 'uploading' ? 'disabled' : ''}`} 
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

              {/* 🔥 FIXED: SETELAH UPLOAD - Show: Unduh Sertifikat Final, Upload Ulang, Lihat Sertifikat Final */}
              {emp.certificate?.is_uploaded && emp.certificate?.id && (
                <>
                  {/* 🔥 NEW: Unduh Sertifikat Final (Download the uploaded certificate) */}
                  <button
                    className="btn btn-outline-primary"
                    onClick={() => handleDownloadFinalCertificate(emp.certificate.id)}
                    title="Download sertifikat final yang sudah diupload"
                  >
                    <i className="fas fa-download me-2"></i>
                    Unduh Sertifikat Final
                  </button>

                  {/* 🔥 FIXED: Upload Ulang - Admin Only (Replace existing certificate) */}
                  {user.role === 'ADMIN' && (
                    <div className="upload-section">
                      <label 
                        className={`btn btn-warning ${processing === 'uploading' ? 'disabled' : ''}`} 
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

                  {/* 🔥 FIXED: Lihat Sertifikat Final (Preview in new tab, NOT download) */}
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

              {/* Delete Button - Admin Only, Show for any generated certificate */}
              {emp.certificate && user.role === 'ADMIN' && (
                <button
                  className="btn btn-outline-danger"
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
            </div>
            </div>
          );
        })}
      </div>

      {/* Empty State */}
      {bestEmployees.length === 0 && (
        <div className="empty-state">
          <i className="fas fa-certificate fa-3x text-muted mb-3"></i>
          <h4>
            {filterTahun || filterBulan || filterStatus ? 'Tidak Ada Data' : 'Belum Ada Best Employee'}
          </h4>
          <p className="text-muted">
            {filterTahun || filterBulan || filterStatus ? (
              <>
                Tidak ada data yang sesuai dengan filter yang dipilih:
                <br/>
                {filterTahun && `Tahun: ${filterTahun}`}
                {filterTahun && (filterBulan || filterStatus) && ', '}
                {filterBulan && `Bulan: ${getMonthName(parseInt(filterBulan))}`}
                {filterBulan && filterStatus && ', '}
                {filterStatus && `Status: ${statusOptions.find(s => s.value === filterStatus)?.label}`}
                <br/>
                Coba ubah filter atau lakukan perhitungan final evaluation terlebih dahulu.
              </>
            ) : (
              <>
                Belum ada pegawai yang meraih predikat Best Employee.
                Lakukan perhitungan final evaluation terlebih dahulu.
              </>
            )}
          </p>
        </div>
      )}

      {/* Instructions Panel */}
      <div className="instructions-panel mt-4">
        <div className="card">
          <div className="card-header">
            <h5 className="mb-0">
              <i className="fas fa-info-circle me-2"></i>
              Petunjuk Penggunaan & Update Folder Structure
            </h5>
          </div>
          <div className="card-body">
            <div className="row">
              <div className="col-md-6">
                <h6>📄 Generate & Download Template</h6>
                <ol>
                  <li>Klik tombol "Generate Template" untuk membuka form input nomor sertifikat</li>
                  <li>Masukkan nomor sertifikat yang diinginkan (contoh: 001/BPS-PWU/VII/2025)</li>
                  <li>Klik "Generate" untuk membuat template dengan nomor dan nama Kepala BPS</li>
                  <li>Template akan disimpan ke folder <strong>uploads/cert/</strong></li>
                  <li>Preview akan otomatis terbuka di tab baru</li>
                  <li>Download template dengan klik tombol "Unduh Template"</li>
                </ol>
              </div>
              <div className="col-md-6">
                <h6>📤 Upload & Manage Sertifikat</h6>
                <ol>
                  <li>Setelah proses offline (cap, TTD, dll) selesai, scan/foto sertifikat</li>
                  <li>Klik tombol "Upload Final" dan pilih file</li>
                  <li>Sertifikat final akan disimpan ke folder <strong>uploads/certificates/</strong></li>
                  <li>Setelah upload, tombol "Preview" berubah jadi "Upload"</li>
                  <li>Gunakan tombol "Hapus" untuk reset dan mulai ulang proses</li>
                  <li>Pegawai dapat melihat sertifikat mereka di dashboard</li>
                </ol>
              </div>
            </div>
            
            <div className="row mt-3">
              <div className="col-12">
                <div className="alert alert-info">
                  <i className="fas fa-folder me-2"></i>
                  <strong>🔥 NEW: Struktur Folder Update:</strong>
                  <ul className="mb-0 mt-2">
                    <li><strong>uploads/temp_cert/</strong> - Template sumber (kosong, siap untuk 2 template)</li>
                    <li><strong>uploads/cert/</strong> - Template yang sudah di-generate (Template_NamaPegawai_Bulan_Tahun.pdf)</li>
                    <li><strong>uploads/certificates/</strong> - Sertifikat final yang sudah diupload (Sertifikat_NamaPegawai_Bulan_Tahun.pdf)</li>
                  </ul>
                </div>
                
                <div className="alert alert-warning">
                  <i className="fas fa-exclamation-triangle me-2"></i>
                  <strong>Fitur Hapus Sertifikat:</strong> Tombol hapus akan menghapus semua file (template & final) dan record database. 
                  Proses dapat dimulai dari awal lagi. Gunakan dengan hati-hati!
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Nomor Sertifikat Modal */}
      {showNomorModal && selectedEmployeeForNomor && (
        <div className={`nomor-modal ${showNomorModal ? 'show' : ''}`} onClick={handleCloseNomorModal}>
          <div 
            className={`nomor-modal-content ${showNomorModal ? 'show' : ''}`} 
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <h5 className="modal-title">
                <i className="fas fa-hashtag me-2"></i>
                Input Nomor Sertifikat
              </h5>
              <button 
                className="btn-close" 
                onClick={handleCloseNomorModal}
                aria-label="Close"
              >
                <i className="fas fa-times"></i>
              </button>
            </div>
            
            <div className="modal-body">
              <div className="employee-info-modal">
                <div className="employee-avatar-modal">
                  {selectedEmployeeForNomor.user.profilePicture ? (
                    <img 
                      src={getImageUrl(selectedEmployeeForNomor.user.profilePicture)} 
                      alt={selectedEmployeeForNomor.user.nama}
                    />
                  ) : (
                    <div className="employee-initials-modal">
                      {getInitials(selectedEmployeeForNomor.user.nama)}
                    </div>
                  )}
                </div>
                <div>
                  <h6>{selectedEmployeeForNomor.user.nama}</h6>
                  <p className="text-muted mb-0">
                    Best Employee {getMonthName(selectedEmployeeForNomor.period.bulan)} {selectedEmployeeForNomor.period.tahun}
                  </p>
                  <small className="text-muted">NIP: {selectedEmployeeForNomor.user.nip}</small>
                </div>
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
                    <li>Nomor: <span className="text-primary">{nomorSertifikat || '[Nomor akan ditampilkan]'}</span></li>
                    <li>Nama Pegawai: <strong>{selectedEmployeeForNomor.user.nama}</strong></li>
                    <li>Periode: <strong>{getMonthName(selectedEmployeeForNomor.period.bulan)} {selectedEmployeeForNomor.period.tahun}</strong></li>
                    <li>Kepala BPS: <strong>Eko Purnomo, SST., MM</strong></li>
                    <li>NIP Kepala: <strong>197309131994031004</strong></li>
                    <li>Folder Output: <strong>uploads/cert/</strong></li>
                  </ul>
                </div>
              </div>
            </div>
            
            <div className="modal-footer">
              <button 
                className="btn btn-secondary me-2" 
                onClick={handleCloseNomorModal}
              >
                <i className="fas fa-times me-2"></i>
                Batal
              </button>
              <button 
                className="btn btn-primary" 
                onClick={handleSubmitNomorSertifikat}
                disabled={!nomorSertifikat.trim()}
              >
                <i className="fas fa-cog me-2"></i>
                Generate Template
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 🔥 NEW: Delete Confirmation Modal */}
      {showDeleteModal && selectedEmployeeForDelete && (
        <div className={`delete-modal ${showDeleteModal ? 'show' : ''}`} onClick={handleCloseDeleteModal}>
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

              <div className="warning-message mt-3">
                <div className="alert alert-danger">
                  <i className="fas fa-exclamation-triangle me-2"></i>
                  <strong>Peringatan!</strong> Tindakan ini akan menghapus:
                  <ul className="mb-0 mt-2">
                    <li>File template di folder <code>uploads/cert/</code></li>
                    {selectedEmployeeForDelete.certificate?.is_uploaded && (
                      <li>File sertifikat final di folder <code>uploads/certificates/</code></li>
                    )}
                    <li>Record sertifikat dari database</li>
                    <li>Semua data terkait sertifikat ini</li>
                  </ul>
                </div>
                
                <div className="alert alert-info">
                  <i className="fas fa-info-circle me-2"></i>
                  <strong>Setelah dihapus:</strong> Proses dapat dimulai dari awal lagi dengan klik tombol "Generate Template".
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

      {/* Photo Modal */}
      {showPhotoModal && selectedEmployee && (
        <div className={`photo-modal ${showPhotoModal ? 'show' : ''}`} onClick={handleClosePhotoModal}>
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
                <p><i className="fas fa-id-card"></i> NIP: {selectedEmployee.user.nip}</p>
                <p><i className="fas fa-briefcase"></i> Jabatan: {selectedEmployee.user.jabatan || 'N/A'}</p>
                <p><i className="fas fa-trophy"></i> Best Employee: {getMonthName(selectedEmployee.period.bulan)} {selectedEmployee.period.tahun}</p>
                <p><i className="fas fa-star"></i> Score: {selectedEmployee.finalScore?.toFixed(2)}</p>
                
                {!selectedEmployee.user.profilePicture && (
                  <p className="no-photo-text">Foto profil belum diatur</p>
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