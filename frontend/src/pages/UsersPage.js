// src/pages/UsersPage.js - COMPLETE ENHANCED UI/UX VERSION WITH DOUBLE CONFIRMATION DELETE
import React, { useState, useEffect } from 'react';
import { userAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import ImportExcelModal from '../components/ImportExcelModal';
import '../styles/ImportExcel.scss';
import '../styles/UserManagement.scss';

const UsersPage = () => {
  const { user } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  // Pagination & Filter
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const [allFilteredAndSortedUsers, setAllFilteredAndSortedUsers] = useState([]);
  
  // Modal states
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState('create');
  const [selectedUser, setSelectedUser] = useState(null);
  
  // 🔥 Enhanced Delete States
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteStep, setDeleteStep] = useState(1); // 1 = first warning, 2 = final confirmation
  const [userToDelete, setUserToDelete] = useState(null);
  const [userHasData, setUserHasData] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  
  const [showDeactivateModal, setShowDeactivateModal] = useState(false);
  const [userToDeactivate, setUserToDeactivate] = useState(null);
  
  // 🔥 IMPORT EXCEL STATE
  const [showImportModal, setShowImportModal] = useState(false);
  const [downloading, setDownloading] = useState(false);
  
  // Form data
  const [formData, setFormData] = useState({
    nip: '',
    nama: '',
    email: '',
    jenisKelamin: 'LK',
    tanggalLahir: '',
    alamat: '',
    mobilePhone: '',
    pendidikanTerakhir: '',
    jabatan: '',
    golongan: '',
    status: 'PNS',
    username: '',
    password: 'bps1810',
    role: 'STAFF'
  });

  useEffect(() => {
    loadUsers();
  }, [search, roleFilter, statusFilter]);

  useEffect(() => {
    const applyFrontendPagination = () => {
      const usersPerPage = 10;
      const totalCount = allFilteredAndSortedUsers.length;
      const calculatedTotalPages = Math.ceil(totalCount / usersPerPage);
      setTotalPages(calculatedTotalPages);

      const startIndex = (currentPage - 1) * usersPerPage;
      const endIndex = startIndex + usersPerPage;
      const usersForCurrentPage = allFilteredAndSortedUsers.slice(startIndex, endIndex);
      
      setUsers(usersForCurrentPage);
    };

    applyFrontendPagination();
  }, [currentPage, allFilteredAndSortedUsers]);

  const loadUsers = async () => {
    try {
      setLoading(true);
      setError('');
      
      const params = {
        limit: 9999,
        search: search.trim(),
        role: roleFilter,
        status: statusFilter
      };

      const response = await userAPI.getAll(params);
      let fetchedUsers = response.data.data.users;
      
      // Custom sorting
      const roleOrder = { 'ADMIN': 1, 'PIMPINAN': 2, 'STAFF': 3 };

      fetchedUsers.sort((a, b) => {
        const orderA = roleOrder[a.role] || 99;
        const orderB = roleOrder[b.role] || 99;

        if (orderA < orderB) return -1;
        if (orderA > orderB) return 1;

        return a.nama.localeCompare(b.nama);
      });

      setAllFilteredAndSortedUsers(fetchedUsers); 
      setCurrentPage(1);
      
    } catch (error) {
      console.error('Load users error:', error);
      setError(error.response?.data?.message || 'Gagal memuat data user');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateUser = () => {
    setModalMode('create');
    setFormData({
      nip: '',
      nama: '',
      email: '',
      jenisKelamin: 'LK',
      tanggalLahir: '',
      alamat: '',
      mobilePhone: '',
      pendidikanTerakhir: '',
      jabatan: '',
      golongan: '',
      status: 'PNS',
      username: '',
      password: 'bps1810',
      role: 'STAFF'
    });
    setShowModal(true);
  };

  // 🔥 FIXED: Import Success Handler
  const handleImportSuccess = (result) => {
  console.log('✅ Import success:', result);
  setSuccess(`Import berhasil! ${result.successfulImports || 0} pegawai ditambahkan.`);
  setTimeout(() => setSuccess(''), 5000);
  loadUsers(); // Reload data
};

  // 🔥 NEW: Test Import System
  const testImportSystem = async () => {
    try {
      console.log('🧪 Testing import system...');
      
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:5000/api/import/debug', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
        }
      });

      if (response.ok) {
        const data = await response.json();
        console.log('✅ Import system test:', data);
        setSuccess('Import system berfungsi dengan baik!');
      } else {
        throw new Error(`Test failed: ${response.status}`);
      }
    } catch (error) {
      console.error('❌ Import system test failed:', error);
      setError('Import system tidak dapat diakses: ' + error.message);
    }
  };


  // 🔥 FIXED: Download Template Handler
const handleDownloadTemplate = async () => {
  try {
    setDownloading(true);
    setError('');
    
    console.log('📥 Starting download template...');
    
    const token = localStorage.getItem('token');
    const response = await fetch('http://localhost:5000/api/import/template', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'template_import_pegawai.xlsx';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
    
    setSuccess('Template Excel berhasil didownload!');
    setTimeout(() => setSuccess(''), 3000);
    
  } catch (error) {
    console.error('❌ Download error:', error);
    setError('Gagal download template: ' + error.message);
  } finally {
    setDownloading(false);
  }
};

// 🔥 NEW: Show Import Modal Handler
const handleShowImportModal = () => {
  console.log('📤 Opening import modal...');
  setShowImportModal(true);
};



  const handleEditUser = (userData) => {
    if (user?.role === 'PIMPINAN') {
      setModalMode('view');
    } else {
      setModalMode('edit');
    }
    
    setSelectedUser(userData);
    setFormData({
      nip: userData.nip || '',
      nama: userData.nama || '',
      email: userData.email || '',
      jenisKelamin: userData.jenisKelamin || 'LK',
      tanggalLahir: userData.tanggalLahir ? userData.tanggalLahir.split('T')[0] : '',
      alamat: userData.alamat || '',
      mobilePhone: userData.mobilePhone || '',
      pendidikanTerakhir: userData.pendidikanTerakhir || '',
      jabatan: userData.jabatan || '',
      golongan: userData.golongan || '',
      status: userData.status || 'PNS',
      username: userData.username || '',
      role: userData.role || 'STAFF',
      isActive: userData.isActive !== undefined ? userData.isActive : true
    });
    setShowModal(true);
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    setSuccess('');

    try {
      if (modalMode === 'create') {
        const createData = {
          nip: formData.nip,
          nama: formData.nama,
          email: formData.email,
          jenisKelamin: formData.jenisKelamin,
          tanggalLahir: formData.tanggalLahir,
          alamat: formData.alamat,
          mobilePhone: formData.mobilePhone,
          pendidikanTerakhir: formData.pendidikanTerakhir,
          jabatan: formData.jabatan,
          golongan: formData.golongan,
          status: formData.status,
          username: formData.username,
          password: formData.password || 'bps1810',
          role: formData.role
        };
        
        console.log('Creating user with data:', createData);
        await userAPI.create(createData); 
        setSuccess('User berhasil dibuat');
        
      } else if (modalMode === 'edit') {
        const updateData = {
          nip: formData.nip,
          nama: formData.nama,
          email: formData.email,
          jenisKelamin: formData.jenisKelamin,
          tanggalLahir: formData.tanggalLahir,
          alamat: formData.alamat,
          mobilePhone: formData.mobilePhone,
          pendidikanTerakhir: formData.pendidikanTerakhir,
          jabatan: formData.jabatan,
          golongan: formData.golongan,
          status: formData.status,
          username: formData.username,
          role: formData.role,
          isActive: formData.isActive
        };
        
        console.log('Updating user with data:', updateData);
        await userAPI.update(selectedUser.id, updateData);
        setSuccess('User berhasil diperbarui');
      }
      
      setShowModal(false);
      
      setTimeout(() => {
        loadUsers();
      }, 1000);
      
    } catch (error) {
      console.error('Submit user error:', error);
      setError(error.response?.data?.message || 'Gagal menyimpan user');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeactivateUser = async () => {
    if (!userToDeactivate) return;
    
    try {
      setSubmitting(true);
      await userAPI.delete(userToDeactivate.id);
      setSuccess(`User ${userToDeactivate.nama} berhasil dinonaktifkan`);
      setShowDeactivateModal(false);
      setUserToDeactivate(null);
      
      setTimeout(() => {
        loadUsers();
      }, 500);
    } catch (error) {
      console.error('Deactivate user error:', error);
      setError(error.response?.data?.message || 'Gagal menonaktifkan user');
    } finally {
      setSubmitting(false);
    }
  };

  // 🔥 Enhanced Delete Handler with Data Check
  const handleDeleteUserClick = async (userData) => {
    setUserToDelete(userData);
    setDeleteStep(1);
    setDeleteConfirmText('');
    
    try {
      // Check if user has related data using the new API endpoint
      const response = await userAPI.checkData(userData.id);
      const hasData = response.data.data.hasData;
      
      setUserHasData(hasData);
      setShowDeleteModal(true);
      
    } catch (error) {
      console.error('Check user data error:', error);
      // If we can't check, assume they have data for safety
      setUserHasData(true);
      setShowDeleteModal(true);
    }
  };

  const handleDeleteConfirm = () => {
    if (userHasData) {
      if (deleteStep === 1) {
        // First confirmation - show second warning
        setDeleteStep(2);
      } else {
        // Second confirmation - check text input
        const expectedText = `hapus ${userToDelete.nama}`;
        if (deleteConfirmText.toLowerCase() === expectedText.toLowerCase()) {
          performDelete();
        } else {
          setError('Teks konfirmasi tidak sesuai. Ketik persis: ' + expectedText);
        }
      }
    } else {
      // No data - single confirmation
      performDelete();
    }
  };

  const performDelete = async () => {
    if (!userToDelete) return;
    
    try {
      setSubmitting(true);
      await userAPI.permanentDelete(userToDelete.id);
      setSuccess(`User ${userToDelete.nama} berhasil dihapus permanen`);
      setShowDeleteModal(false);
      setUserToDelete(null);
      setDeleteStep(1);
      setDeleteConfirmText('');
      loadUsers();
      
    } catch (error) {
      console.error('Delete user error:', error);
      setError(error.response?.data?.message || 'Gagal menghapus user');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteCancel = () => {
    setShowDeleteModal(false);
    setUserToDelete(null);
    setDeleteStep(1);
    setDeleteConfirmText('');
    setUserHasData(false);
  };

  const handleActivateUser = async (userData) => {
    try {
      setSubmitting(true);
      await userAPI.activate(userData.id);
      setSuccess(`User ${userData.nama} berhasil diaktifkan`);
      
      setTimeout(() => {
        loadUsers();
      }, 500);
    } catch (error) {
      console.error('Activate user error:', error);
      setError(error.response?.data?.message || 'Gagal mengaktifkan user');
    } finally {
      setSubmitting(false);
    }
  };

  const handleResetPassword = async (userData) => {
    try {
      setSubmitting(true);
      const response = await userAPI.resetPassword(userData.id, { newPassword: 'bps1810' });
      setSuccess(`Password ${userData.nama} berhasil direset ke: ${response.data.data.newPassword}`);
    } catch (error) {
      console.error('Reset password error:', error);
      setError(error.response?.data?.message || 'Gagal reset password');
    } finally {
      setSubmitting(false);
    }
  };

  const getRoleBadge = (role) => {
    const badges = {
      ADMIN: 'role-admin',
      PIMPINAN: 'role-pimpinan',
      STAFF: 'role-staff'
    };
    return badges[role] || 'role-staff';
  };

  const getStatusBadge = (isActive) => {
    return isActive ? 'status-active' : 'status-inactive';
  };

  const getEmployeeStatusBadge = (status) => {
    const badges = {
      PNS: 'status-pns',
      PPPK: 'status-pppk',
      HONORER: 'status-inactive'
    };
    return badges[status] || 'status-inactive';
  };

  const clearFilters = () => {
    setSearch('');
    setRoleFilter('');
    setStatusFilter('');
    setCurrentPage(1);
  };

  const isAdmin = user?.role === 'ADMIN';
  const isPimpinan = user?.role === 'PIMPINAN';

  return (
    <div className="container-fluid p-4 user-management-page">
      {/* 🔥 Enhanced Header */}
      <div className="page-header">
        <div className="header-content">
          <div className="header-title">
            <i className="fas fa-users header-icon"></i>
            <div className="title-section">
              <h1>{isPimpinan ? 'Data Pegawai' : 'Kelola User'}</h1>
              <p className="header-subtitle">
                {isPimpinan 
                  ? 'Lihat data pegawai dan informasi lengkap'
                  : 'Kelola data pegawai dan pengguna sistem'
                }
              </p>
            </div>
          </div>
          {isAdmin && (
            <div className="header-actions">
              {/* 🔥 SIMPLIFIED: Tombol-tombol terpisah tanpa dropdown */}              
              <button 
                className="btn btn-success me-2"
                onClick={handleShowImportModal}
                title="Import Data dari Excel"
              >
                <i className="fas fa-file-excel me-2"></i>
                Import Excel
              </button>
              
              <button 
                className="btn btn-primary"
                onClick={handleCreateUser}
                title="Tambah User Manual"
              >
                <i className="fas fa-plus me-2"></i>
                Tambah User
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Alert Messages */}
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

      {/* 🔥 Enhanced Filter Section */}
      <div className="filter-section">
        <div className="filter-header">
          <h5>
            <i className="fas fa-filter"></i>
            Filter & Pencarian Data
          </h5>
          <div className="total-users-badge">
            <i className="fas fa-users"></i>
            <span>Total User: <strong>{allFilteredAndSortedUsers.length}</strong></span>
          </div>
        </div>
        
        <form className="filter-form" onSubmit={(e) => {
          e.preventDefault();
            loadUsers();
          }}>
            <div className="filter-row">
            <div className="filter-group">
              <label>Cari Pegawai</label>
              <div style={{ position: 'relative' }}>
              <input
                type="text"
                className={`form-control ${search ? 'has-clear' : ''}`}
                placeholder="Nama, NIP, atau username..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              {search && (
                <button
                type="button"
                className="clear-input"
                onClick={() => setSearch('')}
                title="Hapus pencarian"
                >
                <i className="fas fa-times"></i>
                </button>
              )}
              </div>
            </div>
            
            <div className="filter-group">
              <label>Role Sistem</label>
              <div style={{ position: 'relative' }}>
              <select
                className={`form-select ${roleFilter ? 'has-clear' : ''}`}
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
              >
                <option value="">Semua Role</option>
                <option value="ADMIN">Admin</option>
                <option value="PIMPINAN">Pimpinan</option>
                <option value="STAFF">Staff</option>
              </select>
              {roleFilter && (
                <button
                type="button"
                className="clear-input"
                onClick={() => setRoleFilter('')}
                title="Hapus filter role"
                >
                <i className="fas fa-times"></i>
                </button>
              )}
              </div>
            </div>
            
            <div className="filter-group">
              <label>Jabatan</label>
              <div style={{ position: 'relative' }}>
              <select
                className={`form-select ${statusFilter ? 'has-clear' : ''}`}
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="">Semua Jabatan</option>
                {/* Render jabatan dari database */}
                {allFilteredAndSortedUsers
                .map(u => u.jabatan)
                .filter((v, i, arr) => v && arr.indexOf(v) === i)
                .sort((a, b) => a.localeCompare(b))
                .map(jabatan => (
                  <option key={jabatan} value={jabatan}>{jabatan}</option>
                ))}
              </select>
              {statusFilter && (
                <button
                type="button"
                className="clear-input"
                onClick={() => setStatusFilter('')}
                title="Hapus filter jabatan"
                >
                <i className="fas fa-times"></i>
                </button>
              )}
              </div>
            </div>
            
            <div className="filter-actions">
              {(search || roleFilter || statusFilter) && (
              <button
                type="button"
                className="btn btn-reset"
                onClick={clearFilters}
              >
                <i className="fas fa-times me-2"></i>
                Reset Filter
              </button>
              )}
            </div>
            </div>
          </form>
          </div>

          {/* 🔥 Enhanced Table Section */}
      <div className="table-section">
        <div className="table-header">
          <h5>
            <i className="fas fa-table"></i>
            Daftar Pegawai & Pengguna Sistem
          </h5>
        </div>
        
        <div className="table-responsive">
          {loading ? (
            <div className="text-center py-5">
              <div className="spinner-border text-primary" role="status">
                <span className="visually-hidden">Loading...</span>
              </div>
              <p className="mt-3 text-muted">Memuat data user...</p>
            </div>
          ) : (
            <table className="table users-table">
              <thead>
                <tr>
                  <th className="d-none d-lg-table-cell">No.</th>
                  <th>Informasi Pegawai</th>
                  <th className="d-none d-md-table-cell">Username</th>
                  <th>Role</th>
                  <th className="d-none d-lg-table-cell">Jabatan</th>
                  <th className="d-none d-md-table-cell">Status Pegawai</th>
                  <th>Status Akun</th>
                  <th>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {users.length === 0 ? (
                  <tr>
                    <td colSpan="8" className="text-center py-5 text-muted">
                      <i className="fas fa-inbox fa-3x mb-3 d-block"></i>
                      {search || roleFilter || statusFilter ? 
                        'Tidak ada data user yang sesuai dengan filter' :
                        'Belum ada data user'
                      }
                    </td>
                  </tr>
                ) : (
                  users.map((userData, index) => (
                    <tr key={userData.id}>
                      <td className="d-none d-lg-table-cell text-center">
                        <span className="fw-bold text-muted">
                          {((currentPage - 1) * 10) + index + 1}
                        </span>
                      </td>
                      
                      <td>
                        <div className="user-info">
                          <div className="user-name">{userData.nama}</div>
                          {userData.email && (
                            <div className="user-contact">
                              <i className="fas fa-envelope"></i>
                              <span>{userData.email}</span>
                            </div>
                          )}
                          {userData.mobilePhone && (
                            <div className="user-contact">
                              <i className="fas fa-phone"></i>
                              <span>{userData.mobilePhone}</span>
                            </div>
                          )}
                          <div className="user-id">NIP: {userData.nip}</div>
                        </div>
                      </td>
                      
                      <td className="d-none d-md-table-cell">
                        <span className="badge bg-light text-dark fs-6">
                          {userData.username}
                        </span>
                      </td>
                      
                      <td>
                        <span className={`role-badge ${getRoleBadge(userData.role)}`}>
                          <i className="fas fa-user-tag"></i>
                          <span className="badge-text d-none d-sm-inline">{userData.role}</span>
                        </span>
                      </td>
                      
                      <td className="d-none d-lg-table-cell">
                        <div className="job-info">
                          <div className="job-title">{userData.jabatan || '-'}</div>
                          {userData.golongan && (
                            <div className="job-grade">Gol. {userData.golongan}</div>
                          )}
                        </div>
                      </td>
                      
                      <td className="d-none d-md-table-cell">
                        <span className={`status-badge ${getEmployeeStatusBadge(userData.status)}`}>
                          <i className="fas fa-id-card"></i>
                          <span className="badge-text d-none d-lg-inline">{userData.status}</span>
                        </span>
                      </td>
                      
                      <td>
                        <span className={`status-badge ${getStatusBadge(userData.isActive)}`}>
                          <i className={`fas ${userData.isActive ? 'fa-check-circle' : 'fa-pause-circle'}`}></i>
                          <span className="badge-text d-none d-lg-inline">{userData.isActive ? 'Aktif' : 'Nonaktif'}</span>
                        </span>
                      </td>
                      
                      <td>
                        <div className="action-buttons">
                          <button 
                            className={`btn btn-action ${isPimpinan ? 'action-view' : 'action-edit'}`}
                            onClick={() => handleEditUser(userData)}
                            title={isPimpinan ? 'Lihat Detail Pegawai' : 'Edit Data User'}
                          >
                            <i className={`fas ${isPimpinan ? 'fa-eye' : 'fa-edit'}`}></i>
                          </button>
                          
                          {isAdmin && (
                            <>
                              {userData.isActive ? (
                                <button 
                                  className="btn btn-action action-deactivate"
                                  onClick={() => {
                                    setUserToDeactivate(userData);
                                    setShowDeactivateModal(true);
                                  }}
                                  title="Nonaktifkan User"
                                  disabled={userData.id === user.id}
                                >
                                  <i className="fas fa-user-slash"></i>
                                </button>
                              ) : (
                                <button 
                                  className="btn btn-action action-activate"
                                  onClick={() => handleActivateUser(userData)}
                                  title="Aktifkan User"
                                >
                                  <i className="fas fa-user-check"></i>
                                </button>
                              )}
                              
                              <button 
                                className="btn btn-action action-reset"
                                onClick={() => handleResetPassword(userData)}
                                title="Reset Password ke Default"
                              >
                                <i className="fas fa-key"></i>
                              </button>
                              
                              <button 
                                className="btn btn-action action-delete"
                                onClick={() => handleDeleteUserClick(userData)}
                                title="Hapus User Permanen"
                                disabled={userData.id === user.id || userData.role === 'ADMIN'}
                              >
                                <i className="fas fa-trash"></i>
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Enhanced Pagination */}
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

      {/* 🔥 NEW: Import Excel Modal */}
      <ImportExcelModal 
        isOpen={showImportModal}
        onClose={() => setShowImportModal(false)}
        onSuccess={handleImportSuccess}
      />

      {/* 🔥 Enhanced User Form/Detail Modal */}
      {showModal && (
        <div className="modal fade show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-lg modal-dialog-centered">
            <div className={`modal-content ${modalMode === 'view' ? 'view-modal' : ''}`}>
              <div className="modal-header">
                <h5 className="modal-title">
                  <i className={`fas ${modalMode === 'create' ? 'fa-plus' : modalMode === 'edit' ? 'fa-edit' : 'fa-eye'} me-2`}></i>
                  {modalMode === 'create' ? 'Tambah User Baru' : 
                    modalMode === 'edit' ? 'Edit Data User' : 
                    'Detail Pegawai'}
                </h5>
                <button 
                  type="button" 
                  className="btn-close"
                  onClick={() => setShowModal(false)}
                ></button>
              </div>
              
              {modalMode === 'view' ? (
                <div className="modal-body">
                  <div className="row g-3">
                    <div className="col-md-6">
                      <div className="detail-row">
                        <label className="detail-label">NIP</label>
                        <div className="detail-value">{formData.nip || '-'}</div>
                      </div>
                    </div>
                    <div className="col-md-6">
                      <div className="detail-row">
                        <label className="detail-label">Username</label>
                        <div className="detail-value">
                          <span className="badge bg-primary">{formData.username || '-'}</span>
                        </div>
                      </div>
                    </div>
                    <div className="col-md-8">
                      <div className="detail-row">
                        <label className="detail-label">Nama Lengkap</label>
                        <div className="detail-value">{formData.nama || '-'}</div>
                      </div>
                    </div>
                    <div className="col-md-4">
                      <div className="detail-row">
                        <label className="detail-label">Jenis Kelamin</label>
                        <div className="detail-value">
                          {formData.jenisKelamin === 'LK' ? 'Laki-laki' : 'Perempuan'}
                        </div>
                      </div>
                    </div>
                    <div className="col-md-6">
                      <div className="detail-row">
                        <label className="detail-label">Email</label>
                        <div className="detail-value">
                          {formData.email ? (
                            <a href={`mailto:${formData.email}`} className="text-decoration-none">
                              <i className="fas fa-envelope me-2"></i>
                              {formData.email}
                            </a>
                          ) : '-'}
                        </div>
                      </div>
                    </div>
                    <div className="col-md-6">
                      <div className="detail-row">
                        <label className="detail-label">No. HP</label>
                        <div className="detail-value">
                          {formData.mobilePhone ? (
                            <a href={`tel:${formData.mobilePhone}`} className="text-decoration-none">
                              <i className="fas fa-phone me-2"></i>
                              {formData.mobilePhone}
                            </a>
                          ) : '-'}
                        </div>
                      </div>
                    </div>
                    <div className="col-md-6">
                      <div className="detail-row">
                        <label className="detail-label">Jabatan</label>
                        <div className="detail-value">{formData.jabatan || '-'}</div>
                      </div>
                    </div>
                    <div className="col-md-6">
                      <div className="detail-row">
                        <label className="detail-label">Golongan</label>
                        <div className="detail-value">{formData.golongan || '-'}</div>
                      </div>
                    </div>
                    <div className="col-md-4">
                      <div className="detail-row">
                        <label className="detail-label">Jabatan</label>
                        <div className="detail-value">
                          <span className={`status-badge ${getEmployeeStatusBadge(formData.status)}`}>
                            <i className="fas fa-id-card me-1"></i>
                            {formData.status}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="col-md-4">
                      <div className="detail-row">
                        <label className="detail-label">Role Sistem</label>
                        <div className="detail-value">
                          <span className={`role-badge ${getRoleBadge(formData.role)}`}>
                            <i className="fas fa-user-tag me-1"></i>
                            {formData.role}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="col-md-4">
                      <div className="detail-row">
                        <label className="detail-label">Status Akun</label>
                        <div className="detail-value">
                          <span className={`status-badge ${getStatusBadge(formData.isActive)}`}>
                            <i className={`fas ${formData.isActive ? 'fa-check-circle' : 'fa-pause-circle'} me-1`}></i>
                            {formData.isActive ? 'Aktif' : 'Nonaktif'}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="col-12">
                      <div className="detail-row">
                        <label className="detail-label">Alamat</label>
                        <div className="detail-value" style={{ minHeight: '60px' }}>
                          {formData.alamat || '-'}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleFormSubmit}>
                  <div className="modal-body">
                    <div className="row g-3">
                      <div className="col-md-6">
                        <label className="form-label">NIP *</label>
                        <input
                          type="text"
                          className="form-control"
                          value={formData.nip}
                          onChange={(e) => setFormData({ ...formData, nip: e.target.value })}
                          required
                          maxLength="18"
                          pattern="[0-9]{18}"
                          title="NIP harus 18 digit angka"
                          style={{ minHeight: '48px', borderRadius: '0.75rem' }}
                        />
                        <small className="text-muted">18 digit angka</small>
                      </div>
                      <div className="col-md-6">
                        <label className="form-label">Username *</label>
                        <input
                          type="text"
                          className="form-control"
                          value={formData.username}
                          onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                          required
                          style={{ minHeight: '48px', borderRadius: '0.75rem' }}
                        />
                      </div>
                      <div className="col-md-8">
                        <label className="form-label">Nama Lengkap *</label>
                        <input
                          type="text"
                          className="form-control"
                          value={formData.nama}
                          onChange={(e) => setFormData({ ...formData, nama: e.target.value })}
                          required
                          style={{ minHeight: '48px', borderRadius: '0.75rem' }}
                        />
                      </div>
                      <div className="col-md-4">
                        <label className="form-label">Jenis Kelamin *</label>
                        <select
                          className="form-select"
                          value={formData.jenisKelamin}
                          onChange={(e) => setFormData({ ...formData, jenisKelamin: e.target.value })}
                          required
                          style={{ minHeight: '48px', borderRadius: '0.75rem' }}
                        >
                          <option value="LK">Laki-laki</option>
                          <option value="PR">Perempuan</option>
                        </select>
                      </div>
                      <div className="col-md-6">
                        <label className="form-label">Email</label>
                        <input
                          type="email"
                          className="form-control"
                          value={formData.email}
                          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                          style={{ minHeight: '48px', borderRadius: '0.75rem' }}
                        />
                      </div>
                      <div className="col-md-6">
                        <label className="form-label">No. HP</label>
                        <input
                          type="text"
                          className="form-control"
                          value={formData.mobilePhone}
                          onChange={(e) => setFormData({ ...formData, mobilePhone: e.target.value })}
                          placeholder="08123456789"
                          style={{ minHeight: '48px', borderRadius: '0.75rem' }}
                        />
                      </div>
                      <div className="col-md-6">
                        <label className="form-label">Jabatan</label>
                        <input
                          type="text"
                          className="form-control"
                          value={formData.jabatan}
                          onChange={(e) => setFormData({ ...formData, jabatan: e.target.value })}
                          placeholder="Statistisi, Kasubbag, dll"
                          style={{ minHeight: '48px', borderRadius: '0.75rem' }}
                        />
                      </div>
                      <div className="col-md-6">
                        <label className="form-label">Golongan</label>
                        <input
                          type="text"
                          className="form-control"
                          value={formData.golongan}
                          onChange={(e) => setFormData({ ...formData, golongan: e.target.value })}
                          placeholder="IV/b, III/a, dll"
                          style={{ minHeight: '48px', borderRadius: '0.75rem' }}
                        />
                      </div>
                      <div className="col-md-4">
                        <label className="form-label">Jabatan</label>
                        <select
                          className="form-select"
                          value={formData.status}
                          onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                          style={{ minHeight: '48px', borderRadius: '0.75rem' }}
                        >
                          <option value="PNS">PNS</option>
                          <option value="PPPK">PPPK</option>
                          <option value="HONORER">HONORER</option>
                        </select>
                      </div>
                      <div className="col-md-4">
                        <label className="form-label">Role Sistem *</label>
                        <select
                          className="form-select"
                          value={formData.role}
                          onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                          required
                          style={{ minHeight: '48px', borderRadius: '0.75rem' }}
                          disabled={selectedUser?.role === 'ADMIN'}
                        >
                          <option value="STAFF">Staff</option>
                          <option value="PIMPINAN">Pimpinan</option>
                          {user?.role === 'ADMIN' && selectedUser?.role !== 'ADMIN' && (
                            <option value="ADMIN">Admin</option>
                          )}
                        </select>
                        {selectedUser?.role === 'ADMIN' && (
                          <small className="text-muted">Role Admin tidak dapat diubah</small>
                        )}
                      </div>
                      {modalMode === 'create' && (
                        <div className="col-md-4">
                          <label className="form-label">Password</label>
                          <input
                            type="text"
                            className="form-control"
                            value={formData.password}
                            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                            placeholder="Default: bps1810"
                            style={{ minHeight: '48px', borderRadius: '0.75rem' }}
                          />
                        </div>
                      )}
                      <div className="col-12">
                        <label className="form-label">Alamat</label>
                        <textarea
                          className="form-control"
                          rows="3"
                          value={formData.alamat}
                          onChange={(e) => setFormData({ ...formData, alamat: e.target.value })}
                          placeholder="Alamat lengkap pegawai..."
                          style={{ borderRadius: '0.75rem' }}
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
                      <i className="fas fa-times me-2"></i>
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
                        <>
                          <i className="fas fa-save me-2"></i>
                          {modalMode === 'create' ? 'Tambah User' : 'Simpan Perubahan'}
                        </>
                      )}
                    </button>
                  </div>
                </form>
              )}
              
              {modalMode === 'view' && (
                <div className="modal-footer">
                  <button 
                    type="button" 
                    className="btn btn-secondary"
                    onClick={() => setShowModal(false)}
                  >
                    <i className="fas fa-times me-2"></i>
                    Tutup
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Deactivate Confirmation Modal */}
      {showDeactivateModal && isAdmin && (
        <div className="modal fade show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header bg-warning text-dark">
                <h5 className="modal-title">
                  <i className="fas fa-user-slash me-2"></i>
                  Konfirmasi Nonaktifkan User
                </h5>
                <button 
                  type="button" 
                  className="btn-close"
                  onClick={() => setShowDeactivateModal(false)}
                ></button>
              </div>
              <div className="modal-body">
                <div className="text-center mb-3">
                  <i className="fas fa-user-slash text-warning" style={{ fontSize: '3rem' }}></i>
                </div>
                <p className="text-center">
                  Apakah Anda yakin ingin <strong>menonaktifkan</strong> user:
                </p>
                <div className="card bg-light text-center">
                  <div className="card-body">
                    <h6 className="card-title mb-1">{userToDeactivate?.nama}</h6>
                    <small className="text-muted">NIP: {userToDeactivate?.nip}</small>
                  </div>
                </div>
                <div className="alert alert-info mt-3">
                  <i className="fas fa-info-circle me-2"></i>
                  <strong>Info:</strong> User yang dinonaktifkan tidak dapat login, tetapi data tetap tersimpan dan dapat diaktifkan kembali.
                </div>
              </div>
              <div className="modal-footer">
                <button 
                  type="button" 
                  className="btn btn-secondary"
                  onClick={() => setShowDeactivateModal(false)}
                >
                  <i className="fas fa-times me-2"></i>
                  Batal
                </button>
                <button 
                  type="button" 
                  className="btn btn-warning"
                  onClick={handleDeactivateUser}
                  disabled={submitting}
                >
                  {submitting ? (
                    <>
                      <span className="spinner-border spinner-border-sm me-2"></span>
                      Memproses...
                    </>
                  ) : (
                    <>
                      <i className="fas fa-user-slash me-2"></i>
                      Ya, Nonaktifkan
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 🔥 Enhanced Delete Modal with Double Confirmation */}
      {showDeleteModal && isAdmin && (
        <div className="modal fade show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-lg modal-dialog-centered">
            <div className="modal-content delete-modal">
              <div className="modal-header">
                <h5 className="modal-title">
                  <i className="fas fa-exclamation-triangle me-2"></i>
                  {deleteStep === 1 ? 'Peringatan Hapus User' : 'Konfirmasi Final'}
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
                      <strong>Perhatian!</strong> Anda akan menghapus user dari sistem.
                    </div>
                    
                    <div className="mb-3">
                      <h6>User yang akan dihapus:</h6>
                      <div className="card bg-light">
                        <div className="card-body py-2">
                          <strong>{userToDelete?.nama}</strong><br />
                          <small className="text-muted">
                            NIP: {userToDelete?.nip} • Username: {userToDelete?.username}
                          </small>
                        </div>
                      </div>
                    </div>

                    {userHasData && (
                      <div className="data-impact-list">
                        <h6 className="text-danger mb-3">
                          <i className="fas fa-database me-2"></i>
                          Data yang akan ikut terhapus:
                        </h6>
                        <ul>
                          <li><i className="fas fa-times"></i>Semua evaluasi yang diberikan</li>
                          <li><i className="fas fa-times"></i>Semua evaluasi yang diterima</li>
                          <li><i className="fas fa-times"></i>Riwayat penilaian dan aktivitas</li>
                          <li><i className="fas fa-times"></i>Data presensi dan CKP</li>
                        </ul>
                      </div>
                    )}

                    <p className="mt-3">
                      {userHasData ? (
                        <>
                          <strong className="text-danger">User ini memiliki data penilaian!</strong> 
                          Tindakan ini akan menghapus semua data penilaian terkait dan tidak dapat dibatalkan.
                        </>
                      ) : (
                        <>
                          <strong className="text-info">User ini belum memiliki data penilaian.</strong> 
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
                            hapus {userToDelete?.nama}
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
                  <i className="fas fa-times me-2"></i>
                  Batal
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
                      {userHasData ? 'Lanjutkan' : 'Ya, Hapus'}
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

export default UsersPage;