// src/components/ImportExcelModal.js - ENHANCED VERSION dengan Better UX
import React, { useState, useRef } from 'react';
// import { API_BASE_URL } from '../config/config'; 
import { importService } from '../services/importService'; 

const ImportExcelModal = ({ isOpen, onClose, onSuccess }) => {
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [dragOver, setDragOver] = useState(false);
  const [downloading, setDownloading] = useState(false);
  
  const fileInputRef = useRef(null);

  // ✅ FIXED: Download Template Function menggunakan API_BASE_URL langsung
  const handleDownloadTemplate = async () => {
    try {
      setDownloading(true);
      setError('');
      
      const blob = await importService.downloadTemplate();
      
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'template_import_pegawai_bps.xlsx';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      setSuccess('✅ Template Excel berhasil didownload!');
      setTimeout(() => setSuccess(''), 3000);
      
    } catch (error) {
      console.error('❌ Download error:', error);
      setError('Gagal download template: ' + error.message);
    } finally {
      setDownloading(false);
    }
  };

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      handleFileSelect(selectedFile);
    }
  };

  const handleFileSelect = (selectedFile) => {
    console.log('📁 File selected:', selectedFile.name);
    
    setError('');
    setSuccess('');
    
    // Validation
    if (!selectedFile.name.match(/\.(xlsx|xls)$/i)) {
      setError('❌ File harus berformat Excel (.xlsx atau .xls)');
      return;
    }
    
    if (selectedFile.size > 10 * 1024 * 1024) {
      setError('❌ File maksimal 10MB');
      return;
    }
    
    setFile(selectedFile);
    setSuccess('✅ File Excel valid dan siap diimport');
  };

  // Drag & Drop Handlers
  const handleDragOver = (e) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setDragOver(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) {
      handleFileSelect(droppedFile);
    }
  };

  // ✅ FIXED: Import function menggunakan API_BASE_URL langsung
   const handleImport = async () => {
    if (!file) {
      setError('❌ Pilih file Excel terlebih dahulu');
      return;
    }

    console.log('🚀 Starting import...');
    setUploading(true);
    setError('');
    setSuccess('');

    try {
      const result = await importService.importUsers(file);
      
      setSuccess('🎉 ' + result.message);
      onSuccess(result.data);
      
      // Auto close after success
      setTimeout(() => {
        handleClose();
      }, 2500);

    } catch (error) {
      console.error('❌ Import error:', error);
      setError('❌ ' + error.message);
    } finally {
      setUploading(false);
    }
  };

  const handleClose = () => {
    if (uploading || downloading) return;
    
    setFile(null);
    setError('');
    setSuccess('');
    setDragOver(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    onClose();
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  if (!isOpen) return null;

  return (
    <div 
      className="modal fade show d-block" 
      style={{ backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1055 }}
      onClick={(e) => e.target === e.currentTarget && handleClose()}
    >
      <div className="modal-dialog modal-lg modal-dialog-centered">
        <div className="modal-content shadow-lg">
          {/* Enhanced Header */}
          <div className="modal-header bg-gradient" style={{ background: 'linear-gradient(135deg, #28a745 0%, #20c997 100%)' }}>
            <h5 className="modal-title text-white fw-bold">
              <i className="fas fa-file-excel me-2"></i>
              Import Data Pegawai dari Excel
            </h5>
            <button
              type="button"
              className="btn-close btn-close-white"
              onClick={handleClose}
              disabled={uploading || downloading}
            ></button>
          </div>
          
          <div className="modal-body p-4">
            {/* Alert Messages */}
            {error && (
              <div className="alert alert-danger border-0 shadow-sm">
                <i className="fas fa-exclamation-triangle me-2"></i>
                {error}
              </div>
            )}

            {success && (
              <div className="alert alert-success border-0 shadow-sm">
                <i className="fas fa-check-circle me-2"></i>
                {success}
              </div>
            )}

            {/* Step Indicators */}
            <div className="row mb-4">
              <div className="col-md-4 text-center">
                <div className="step-indicator">
                  <div className="step-circle bg-primary text-white">1</div>
                  <h6 className="mt-2 small">Download Template</h6>
                </div>
              </div>
              <div className="col-md-4 text-center">
                <div className="step-indicator">
                  <div className="step-circle bg-primary text-white">2</div>
                  <h6 className="mt-2 small">Isi Data Excel</h6>
                </div>
              </div>
              <div className="col-md-4 text-center">
                <div className="step-indicator">
                  <div className="step-circle bg-primary text-white">3</div>
                  <h6 className="mt-2 small">Upload & Import</h6>
                </div>
              </div>
            </div>

            {/* Download Template Section */}
            <div className="card mb-4 border-0 bg-light">
              <div className="card-body text-center py-3">
                <h6 className="card-title text-primary mb-3">
                  <i className="fas fa-download me-2"></i>
                  Langkah 1: Download Template Excel
                </h6>
                <p className="small text-muted mb-3">
                  Download template untuk mendapatkan format Excel yang benar
                </p>
                <button 
                  className="btn btn-outline-primary"
                  onClick={handleDownloadTemplate}
                  disabled={downloading}
                >
                  {downloading ? (
                    <>
                      <span className="spinner-border spinner-border-sm me-2"></span>
                      Downloading...
                    </>
                  ) : (
                    <>
                      <i className="fas fa-download me-2"></i>
                      Download Template Excel
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Format Requirements */}
            <div className="card mb-4 border-0" style={{ backgroundColor: '#f8f9fa' }}>
              <div className="card-body py-3">
                <h6 className="text-success mb-3">
                  <i className="fas fa-list-check me-2"></i>
                  Format Excel yang Diperlukan:
                </h6>
                <div className="row small">
                  <div className="col-md-6">
                    <ul className="list-unstyled">
                      <li className="mb-1">
                        <i className="fas fa-check text-success me-2"></i>
                        <strong>NIP:</strong> 18 digit angka <span className="badge bg-danger">Wajib</span>
                      </li>
                      <li className="mb-1">
                        <i className="fas fa-check text-success me-2"></i>
                        <strong>Nama:</strong> Nama lengkap <span className="badge bg-danger">Wajib</span>
                      </li>
                      <li className="mb-1">
                        <i className="fas fa-check text-success me-2"></i>
                        <strong>Username:</strong> Login sistem <span className="badge bg-danger">Wajib</span>
                      </li>
                    </ul>
                  </div>
                  <div className="col-md-6">
                    <ul className="list-unstyled">
                      <li className="mb-1">
                        <i className="fas fa-check text-muted me-2"></i>
                        <strong>Jabatan:</strong> Contoh: Statistisi <span className="badge bg-secondary">Opsional</span>
                      </li>
                      <li className="mb-1">
                        <i className="fas fa-check text-muted me-2"></i>
                        <strong>Gol.Akhir:</strong> Contoh: IV/b <span className="badge bg-secondary">Opsional</span>
                      </li>
                      <li className="mb-1">
                        <i className="fas fa-check text-muted me-2"></i>
                        <strong>Status & Jenis Kelamin</strong> <span className="badge bg-secondary">Opsional</span>
                      </li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>

            {/* Upload Area */}
            <div className="card border-0">
              <div className="card-body">
                <h6 className="text-primary mb-3">
                  <i className="fas fa-upload me-2"></i>
                  Langkah 2: Upload File Excel
                </h6>
                
                <div 
                  className={`upload-zone border-2 border-dashed rounded-3 p-4 text-center transition-all ${
                    dragOver ? 'border-primary bg-primary bg-opacity-10' : 
                    file ? 'border-success bg-success bg-opacity-10' : 'border-secondary'
                  }`}
                  style={{ cursor: (uploading || downloading) ? 'not-allowed' : 'pointer' }}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  onClick={() => !(uploading || downloading) && fileInputRef.current?.click()}
                >
                  <div className="upload-icon mb-3">
                    {file ? (
                      <i className="fas fa-file-excel text-success" style={{ fontSize: '3rem' }}></i>
                    ) : (
                      <i className="fas fa-cloud-upload-alt text-primary" style={{ fontSize: '3rem' }}></i>
                    )}
                  </div>
                  
                  <div className="upload-text">
                    {file ? (
                      <div>
                        <h6 className="text-success mb-1">{file.name}</h6>
                        <p className="text-muted small mb-1">{formatFileSize(file.size)}</p>
                        <small className="text-success">
                          <i className="fas fa-check-circle me-1"></i>
                          File siap untuk diimport
                        </small>
                      </div>
                    ) : (
                      <div>
                        <h6 className="mb-2">Klik atau drag & drop file Excel di sini</h6>
                        <p className="text-muted small mb-0">
                          Format: .xlsx, .xls • Maksimal: 10MB
                        </p>
                      </div>
                    )}
                  </div>
                  
                  <input
                    ref={fileInputRef}
                    type="file"
                    className="d-none"
                    accept=".xlsx,.xls"
                    onChange={handleFileChange}
                    disabled={uploading || downloading}
                  />
                </div>

                {/* File Actions */}
                {file && !(uploading || downloading) && (
                  <div className="mt-3 d-flex justify-content-between align-items-center">
                    <div className="file-info">
                      <i className="fas fa-file-excel text-success me-2"></i>
                      <strong>{file.name}</strong>
                      <span className="text-muted ms-2">({formatFileSize(file.size)})</span>
                    </div>
                    <button
                      className="btn btn-sm btn-outline-danger"
                      onClick={(e) => {
                        e.stopPropagation();
                        setFile(null);
                        setSuccess('');
                        setError('');
                        if (fileInputRef.current) {
                          fileInputRef.current.value = '';
                        }
                      }}
                      title="Hapus file"
                    >
                      <i className="fas fa-times"></i>
                    </button>
                  </div>
                )}

                {/* Progress Indicator */}
                {uploading && (
                  <div className="mt-4 text-center">
                    <div className="spinner-border text-primary mb-3"></div>
                    <h6 className="text-primary">Mengimport data pegawai...</h6>
                    <p className="small text-muted">
                      Mohon tunggu, proses import sedang berlangsung. Jangan tutup halaman ini.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
          
          {/* Enhanced Footer */}
          <div className="modal-footer bg-light">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={handleClose}
              disabled={uploading || downloading}
            >
              <i className="fas fa-times me-2"></i>
              {(uploading || downloading) ? 'Memproses...' : 'Tutup'}
            </button>
            <button
              type="button"
              className="btn btn-success"
              onClick={handleImport}
              disabled={!file || uploading || downloading}
            >
              {uploading ? (
                <>
                  <span className="spinner-border spinner-border-sm me-2"></span>
                  Mengimport...
                </>
              ) : (
                <>
                  <i className="fas fa-upload me-2"></i>
                  Import Data Pegawai
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ImportExcelModal;