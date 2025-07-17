// src/pages/UsersPage.js - FIXED CRUD LENGKAP dengan Alamat/HP dan Icons
import React, { useState, useEffect } from 'react';
import { userAPI, authAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';

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

  // 🔥 NEW STATE: Untuk menyimpan semua user setelah difilter dan diurutkan, sebelum paginasi frontend
  const [allFilteredAndSortedUsers, setAllFilteredAndSortedUsers] = useState([]);
  
  // Modal states
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState('create'); // 'create', 'edit', 'view'
  const [selectedUser, setSelectedUser] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showDeactivateModal, setShowDeactivateModal] = useState(false);
  const [userToDelete, setUserToDelete] = useState(null);
  const [userToDeactivate, setUserToDeactivate] = useState(null);
  
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
  }, [search, roleFilter, statusFilter]); // 🔥 MODIFIKASI: currentPage tidak lagi trigger loadUsers, karena paginasi di frontend

  // 🔥 NEW useEffect untuk paginasi frontend setelah allFilteredAndSortedUsers berubah atau currentPage berubah
  useEffect(() => {
    const applyFrontendPagination = () => {
      const usersPerPage = 10; // Jumlah user per halaman (sesuai limit asli Anda)
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
        // 🔥 MODIFIKASI: Hapus page: currentPage dan berikan limit yang besar untuk mengambil semua data
        limit: 9999, // Ambil semua user yang cocok dengan filter lain
        search: search.trim(),
        role: roleFilter,
        status: statusFilter
      };

      const response = await userAPI.getAll(params);
      let fetchedUsers = response.data.data.users; // Ambil data user yang sudah difetch
      
      // 🔥 MODIFIKASI: Implementasi sorting kustom berdasarkan role dan nama
      const roleOrder = { 'ADMIN': 1, 'PIMPINAN': 2, 'STAFF': 3 }; // Prioritas: ADMIN (1) > PIMPINAN (2) > STAFF (3)

      fetchedUsers.sort((a, b) => {
        const orderA = roleOrder[a.role] || 99; // Beri nilai tinggi jika role tidak dikenal
        const orderB = roleOrder[b.role] || 99;

        // Urutkan berdasarkan role terlebih dahulu
        if (orderA < orderB) return -1; // ADMIN akan lebih kecil dari PIMPINAN, PIMPINAN lebih kecil dari STAFF
        if (orderA > orderB) return 1;

        // Jika role sama, urutkan berdasarkan nama (abjad)
        return a.nama.localeCompare(b.nama);
      });

      // 🔥 SIMPAN HASIL SORTING GLOBAL KE STATE BARU
      setAllFilteredAndSortedUsers(fetchedUsers); 
      setCurrentPage(1); // Reset ke halaman 1 setiap kali filter/pencarian berubah
      
    } catch (error) {
      console.error('Load users error:', error);
      setError(error.response?.data?.message || 'Gagal memuat data user');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    setCurrentPage(1); // Ini akan ditangani oleh useEffect `allFilteredAndSortedUsers`
    // loadUsers(); // Tidak perlu panggil langsung, useEffect `search` akan memicu `loadUsers`
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
      loadUsers(); // Panggil loadUsers untuk memuat ulang dan mensorting ulang
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
      await userAPI.delete(userToDeactivate.id); // Soft delete
      setSuccess(`User ${userToDeactivate.nama} berhasil dinonaktifkan`);
      setShowDeactivateModal(false);
      setUserToDeactivate(null);
      
      setTimeout(() => {
        loadUsers(); // Panggil loadUsers untuk memuat ulang dan mensorting ulang
      }, 500);
    } catch (error) {
      console.error('Deactivate user error:', error);
      setError(error.response?.data?.message || 'Gagal menonaktifkan user');
    } finally {
      setSubmitting(false);
    }
  };

  const handlePermanentDelete = async () => {
    if (!userToDelete) return;
    
    try {
      setSubmitting(true);
      await userAPI.permanentDelete(userToDelete.id); // Permanent delete
      setSuccess(`User ${userToDelete.nama} berhasil dihapus permanen`);
      setShowDeleteModal(false);
      setUserToDelete(null);
      
      setTimeout(() => {
        loadUsers(); // Panggil loadUsers untuk memuat ulang dan mensorting ulang
      }, 500);
    } catch (error) {
      console.error('Permanent delete user error:', error);
      setError(error.response?.data?.message || 'Gagal menghapus user permanen');
    } finally {
      setSubmitting(false);
    }
  };

  const handleActivateUser = async (userData) => {
    try {
      setSubmitting(true);
      await userAPI.activate(userData.id);
      setSuccess(`User ${userData.nama} berhasil diaktifkan`);
      
      setTimeout(() => {
        loadUsers(); // Panggil loadUsers untuk memuat ulang dan mensorting ulang
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
      ADMIN: 'bg-danger',
      PIMPINAN: 'bg-warning text-dark',
      STAFF: 'bg-primary'
    };
    return badges[role] || 'bg-secondary';
  };

  const getStatusBadge = (isActive) => {
    return isActive ? 'bg-success' : 'bg-secondary';
  };

  const isAdmin = user?.role === 'ADMIN';
  const isPimpinan = user?.role === 'PIMPINAN';

  return (
    <div className="container-fluid">
      {/* Header */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h1 className="h3 mb-1">
            {isPimpinan ? 'Data Pegawai' : 'Kelola User'}
          </h1>
          <p className="text-muted">
            {isPimpinan 
              ? 'Lihat data pegawai dan informasi lengkap'
              : 'Kelola data pegawai dan pengguna sistem'
            }
          </p>
        </div>
        {isAdmin && (
          <button 
            className="btn btn-primary"
            onClick={handleCreateUser}
          >
            <i className="fas fa-plus me-2"></i>
            Tambah User
          </button>
        )}
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

      {/* Filter & Search */}
      <div className="card mb-4">
        <div className="card-body">
          <form
            onSubmit={(e) => {
            e.preventDefault();
            // setCurrentPage(1); // Tidak perlu karena loadUsers akan me-resetnya
            loadUsers(); // Panggil loadUsers untuk memicu pencarian/filter
            }}
            >
            <div className="row g-3">
              <div className="col-md-4">
                <label className="form-label">Cari</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="Nama, NIP, atau username..."
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    // setCurrentPage(1); // Tidak perlu, karena useEffect 'search' akan memicu loadUsers dan mereset currentPage
                  }}
                />
              </div>
              <div className="col-md-2">
                <label className="form-label">Role</label>
                <select
                  className="form-select"
                  value={roleFilter}
                  onChange={(e) => {
                    setRoleFilter(e.target.value);
                    // setCurrentPage(1); // Tidak perlu
                  }}
                >
                  <option value="">Semua Role</option>
                  <option value="ADMIN">Admin</option>
                  <option value="PIMPINAN">Pimpinan</option>
                  <option value="STAFF">Staff</option>
                </select>
              </div>
              <div className="col-md-2">
                <label className="form-label">Status</label>
                <select
                  className="form-select"
                  value={statusFilter}
                  onChange={(e) => {
                    setStatusFilter(e.target.value);
                    // setCurrentPage(1); // Tidak perlu
                  }}
                >
                  <option value="">Semua Status</option>
                  <option value="PNS">PNS</option>
                  <option value="PPPK">PPPK</option>
                  <option value="HONORER">Honorer</option>
                </select>
              </div>
              <div className="col-md-2">
                <label className="form-label">&nbsp;</label>
                <button
                  type="button"
                  className="btn btn-outline-secondary w-100"
                  onClick={() => {
                    setSearch('');
                    setRoleFilter('');
                    setStatusFilter('');
                    // setCurrentPage(1); // Tidak perlu
                    // loadUsers(); // Tidak perlu, useEffect akan memicu ini
                  }}
                >
                  Reset
                </button>
              </div>
            </div>
            </form>
          </div>
        </div>

      {/* Users Table - ENHANCED dengan Icons */}
      <div className="card">
        <div className="card-body">
          {loading ? (
            <div className="text-center py-4">
              <div className="spinner-border text-primary" role="status">
                <span className="visually-hidden">Loading...</span>
              </div>
              <p className="mt-2 text-muted">Memuat data user...</p>
            </div>
          ) : (
            <>
              <div className="table-responsive">
                <table className="table table-hover">
                  <thead className="table-light">
                    <tr>
                      <th>NIP</th>
                      <th>Nama & Kontak</th>
                      <th>Username</th>
                      <th>Role</th>
                      <th>Jabatan</th>
                      <th>Status</th>
                      <th>Aktif</th>
                      <th width="220">Aksi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.length === 0 ? (
                      <tr>
                        <td colSpan="8" className="text-center py-4 text-muted">
                          Tidak ada data user
                        </td>
                      </tr>
                    ) : (
                      users.map((userData) => (
                        <tr key={userData.id}>
                          <td>
                            <span className="fw-bold">{userData.nip}</span>
                          </td>
                          <td>
                            <div>
                              <strong>{userData.nama}</strong>
                              {userData.email && (
                                <small className="d-block text-muted">
                                  <i className="fas fa-envelope me-1"></i>
                                  {userData.email}
                                </small>
                              )}
                              {userData.mobilePhone && (
                                <small className="d-block text-muted">
                                  <i className="fas fa-phone me-1"></i>
                                  {userData.mobilePhone}
                                </small>
                              )}
                            </div>
                          </td>
                          <td>
                            <span className="badge bg-light text-dark">
                              {userData.username}
                            </span>
                          </td>
                          <td>
                            <span className={`badge ${getRoleBadge(userData.role)}`}>
                              {userData.role}
                            </span>
                          </td>
                          <td>
                            <div>
                              <span className="fw-bold">{userData.jabatan || '-'}</span>
                              {userData.golongan && (
                                <small className="d-block text-muted">
                                  Gol. {userData.golongan}
                                </small>
                              )}
                            </div>
                          </td>
                          <td>
                            <span className="badge bg-secondary">
                              {userData.status}
                            </span>
                          </td>
                          <td>
                            <span className={`badge ${getStatusBadge(userData.isActive)}`}>
                              {userData.isActive ? 'Aktif' : 'Nonaktif'}
                            </span>
                          </td>
                          <td>
                            <div className="btn-group btn-group-sm">
                              <button 
                                className={`btn ${isPimpinan ? 'btn-outline-info' : 'btn-outline-primary'}`}
                                onClick={() => handleEditUser(userData)}
                                title={isPimpinan ? 'Lihat Detail' : 'Edit User'}
                              >
                                <i className={`fas ${isPimpinan ? 'fa-eye' : 'fa-edit'}`}></i>
                              </button>
                              
                              {isAdmin && (
                                <>
                                  {userData.isActive ? (
                                    <button 
                                      className="btn btn-outline-warning"
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
                                      className="btn btn-outline-success"
                                      onClick={() => handleActivateUser(userData)}
                                      title="Aktifkan User"
                                    >
                                      <i className="fas fa-user-check"></i>
                                    </button>
                                  )}
                                  
                                  <button 
                                    className="btn btn-outline-info"
                                    onClick={() => handleResetPassword(userData)}
                                    title="Reset Password"
                                  >
                                    <i className="fas fa-key"></i>
                                  </button>
                                  
                                  <button 
                                    className="btn btn-outline-danger"
                                    onClick={() => {
                                      setUserToDelete(userData);
                                      setShowDeleteModal(true);
                                    }}
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

      {/* User Form/Detail Modal */}
      {showModal && (
        <div className="modal fade show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-lg">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">
                  {modalMode === 'create' ? 'Tambah User Baru' : 
                    modalMode === 'edit' ? 'Edit User' : 
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
                      <label className="form-label"><strong>NIP</strong></label>
                      <p className="form-control-plaintext bg-light p-2 rounded">{formData.nip || '-'}</p>
                    </div>
                    <div className="col-md-6">
                      <label className="form-label"><strong>Username</strong></label>
                      <p className="form-control-plaintext bg-light p-2 rounded">{formData.username || '-'}</p>
                    </div>
                    <div className="col-md-8">
                      <label className="form-label"><strong>Nama Lengkap</strong></label>
                      <p className="form-control-plaintext bg-light p-2 rounded">{formData.nama || '-'}</p>
                    </div>
                    <div className="col-md-4">
                      <label className="form-label"><strong>Jenis Kelamin</strong></label>
                      <p className="form-control-plaintext bg-light p-2 rounded">
                        {formData.jenisKelamin === 'LK' ? 'Laki-laki' : 'Perempuan'}
                      </p>
                    </div>
                    <div className="col-md-6">
                      <label className="form-label"><strong>Email</strong></label>
                      <p className="form-control-plaintext bg-light p-2 rounded">
                        {formData.email ? (
                          <a href={`mailto:${formData.email}`} className="text-decoration-none">
                            <i className="fas fa-envelope me-1"></i>
                            {formData.email}
                          </a>
                        ) : '-'}
                      </p>
                    </div>
                    <div className="col-md-6">
                      <label className="form-label"><strong>No. HP</strong></label>
                      <p className="form-control-plaintext bg-light p-2 rounded">
                        {formData.mobilePhone ? (
                          <a href={`tel:${formData.mobilePhone}`} className="text-decoration-none">
                            <i className="fas fa-phone me-1"></i>
                            {formData.mobilePhone}
                          </a>
                        ) : '-'}
                      </p>
                    </div>
                    <div className="col-md-6">
                      <label className="form-label"><strong>Jabatan</strong></label>
                      <p className="form-control-plaintext bg-light p-2 rounded">{formData.jabatan || '-'}</p>
                    </div>
                    <div className="col-md-6">
                      <label className="form-label"><strong>Golongan</strong></label>
                      <p className="form-control-plaintext bg-light p-2 rounded">{formData.golongan || '-'}</p>
                    </div>
                    <div className="col-md-4">
                      <label className="form-label"><strong>Status Kepegawaian</strong></label>
                      <p className="form-control-plaintext">
                        <span className="badge bg-secondary fs-6">{formData.status}</span>
                      </p>
                    </div>
                    <div className="col-md-4">
                      <label className="form-label"><strong>Role Sistem</strong></label>
                      <p className="form-control-plaintext">
                        <span className={`badge ${getRoleBadge(formData.role)} fs-6`}>
                          {formData.role}
                        </span>
                      </p>
                    </div>
                    <div className="col-md-4">
                      <label className="form-label"><strong>Status Akun</strong></label>
                      <p className="form-control-plaintext">
                        <span className={`badge ${getStatusBadge(formData.isActive)} fs-6`}>
                          {formData.isActive ? 'Aktif' : 'Nonaktif'}
                        </span>
                      </p>
                    </div>
                    <div className="col-12">
                      <label className="form-label"><strong>Alamat</strong></label>
                      <p className="form-control-plaintext bg-light p-2 rounded" style={{ minHeight: '60px' }}>
                        {formData.alamat || '-'}
                      </p>
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
                        />
                      </div>
                      <div className="col-md-6">
                        <label className="form-label">Username *</label>
                        <input
                          type="text"
                          className="form-control"
                          value={formData.username}
                          onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                          required
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
                        />
                      </div>
                      <div className="col-md-4">
                        <label className="form-label">Jenis Kelamin *</label>
                        <select
                          className="form-select"
                          value={formData.jenisKelamin}
                          onChange={(e) => setFormData({ ...formData, jenisKelamin: e.target.value })}
                          required
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
                        />
                      </div>
                      <div className="col-md-4">
                        <label className="form-label">Status Kepegawaian</label>
                        <select
                          className="form-select"
                          value={formData.status}
                          onChange={(e) => setFormData({ ...formData, status: e.target.value })}
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
                        >
                          <option value="STAFF">Staff</option>
                          <option value="PIMPINAN">Pimpinan</option>
                          {user?.role === 'ADMIN' && (
                            <option value="ADMIN">Admin</option>
                          )}
                        </select>
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
                        modalMode === 'create' ? 'Tambah User' : 'Simpan Perubahan'
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
                    Tuturp
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* FIXED: Deactivate Confirmation Modal */}
      {showDeactivateModal && isAdmin && (
        <div className="modal fade show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog">
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
                <p>Apakah Anda yakin ingin <strong>menonaktifkan</strong> user <strong>{userToDeactivate?.nama}</strong>?</p>
                <div className="alert alert-info">
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

      {/* FIXED: Permanent Delete Confirmation Modal */}
      {showDeleteModal && isAdmin && (
        <div className="modal fade show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header bg-danger text-white">
                <h5 className="modal-title">
                  <i className="fas fa-exclamation-triangle me-2"></i>
                  Hapus User Permanen
                </h5>
                <button 
                  type="button" 
                  className="btn-close btn-close-white"
                  onClick={() => setShowDeleteModal(false)}
                ></button>
              </div>
              <div className="modal-body">
                <div className="alert alert-danger">
                  <i className="fas fa-exclamation-triangle me-2"></i>
                  <strong>Peringatan!</strong> Tindakan ini tidak dapat dibatalkan.
                </div>
                <p>Apakah Anda yakin ingin <strong>menghapus permanen</strong> user:</p>
                <div className="bg-light p-3 rounded">
                  <strong>{userToDelete?.nama}</strong><br/>
                  <small className="text-muted">NIP: {userToDelete?.nip}</small><br/>
                  <small className="text-muted">Username: {userToDelete?.username}</small>
                </div>
                <div className="mt-3">
                  <h6 className="text-danger">Dampak penghapusan:</h6>
                  <ul className="small text-muted">
                    <li>Semua data user akan dihapus permanen</li>
                    <li>Riwayat evaluasi akan tetap ada tetapi tanpa referensi user</li>
                    <li>User tidak dapat login lagi ke sistem</li>
                  </ul>
                </div>
              </div>
              <div className="modal-footer">
                <button 
                  type="button" 
                  className="btn btn-secondary"
                  onClick={() => setShowDeleteModal(false)}
                >
                  <i className="fas fa-times me-2"></i>
                  Batal
                </button>
                <button 
                  type="button" 
                  className="btn btn-danger"
                  onClick={handlePermanentDelete}
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
                      Ya, Hapus Permanen
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