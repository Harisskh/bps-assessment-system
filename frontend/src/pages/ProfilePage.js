// src/pages/ProfilePage.js 
import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { profileAPI } from '../services/api';
import '../styles/ProfilePage.scss';

const ProfilePage = () => {
  const { user, updateUser, refreshUser } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [forceRefresh, setForceRefresh] = useState(0);
  
  const [profileData, setProfileData] = useState({
    nama: '',
    email: '',
    mobilePhone: '',
    alamat: '',
    username: '',
    profilePicture: null,
    previewImage: null
  });

  // Backend URL
  const BACKEND_BASE_URL = 'http://localhost:5000';
  
  // Image URL construction
  const getImageUrl = useCallback((imagePath, bustCache = false) => {
    if (!imagePath || imagePath === 'undefined' || imagePath === 'null' || imagePath === '') {
      return null;
    }
    
    let finalUrl;
    if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) {
      finalUrl = imagePath;
    } else {
      const cleanPath = imagePath.startsWith('/') ? imagePath : '/' + imagePath;
      finalUrl = BACKEND_BASE_URL + cleanPath;
    }
    
    if (bustCache) {
      const separator = finalUrl.includes('?') ? '&' : '?';
      finalUrl += `${separator}_t=${Date.now()}&_fr=${forceRefresh}`;
    }
    
    return finalUrl;
  }, [forceRefresh]);

  // Update local profile data
  const updateLocalProfileData = useCallback(() => {
    if (user) {
      const imageUrl = user.profilePicture ? getImageUrl(user.profilePicture, true) : null;
      
      setProfileData({
        nama: user.nama || '',
        email: user.email || '',
        mobilePhone: user.mobilePhone || '',
        alamat: user.alamat || '',
        username: user.username || '',
        profilePicture: user.profilePicture || null,
        previewImage: imageUrl
      });
    }
  }, [user, getImageUrl]);

  useEffect(() => {
    updateLocalProfileData();
  }, [updateLocalProfileData]);

  useEffect(() => {
    if (forceRefresh > 0) {
      updateLocalProfileData();
    }
  }, [forceRefresh, updateLocalProfileData]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setProfileData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        setError('File harus berupa gambar');
        return;
      }
      
      if (file.size > 5 * 1024 * 1024) {
        setError('Ukuran file maksimal 5MB');
        return;
      }

      setError('');

      const reader = new FileReader();
      reader.onload = (e) => {
        setProfileData(prev => ({
          ...prev,
          profilePicture: file,
          previewImage: e.target.result
        }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleDeletePhoto = async () => {
    if (!user?.profilePicture && !profileData.previewImage) {
      setError('Tidak ada foto untuk dihapus');
      return;
    }

    try {
      setLoading(true);
      setError('');
      setSuccess('');
      
      const response = await profileAPI.deleteProfilePicture();
      
      if (response.data.success) {
        setSuccess('Foto profile berhasil dihapus');
        
        // Immediate UI update
        setProfileData(prev => ({
          ...prev,
          profilePicture: null,
          previewImage: null
        }));
        
        setForceRefresh(prev => prev + 1);
        await refreshUser();
        window.dispatchEvent(new Event('userUpdated'));
      } else {
        throw new Error(response.data.error || 'Gagal menghapus foto');
      }
      
    } catch (error) {
      setError(error.response?.data?.error || error.message || 'Gagal menghapus foto');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const formData = new FormData();
      formData.append('nama', profileData.nama);
      formData.append('email', profileData.email);
      formData.append('mobilePhone', profileData.mobilePhone || '');
      formData.append('alamat', profileData.alamat || '');
      formData.append('username', profileData.username || '');
      
      if (profileData.profilePicture instanceof File) {
        formData.append('profilePicture', profileData.profilePicture);
      }

      const response = await profileAPI.updateProfile(formData);
      
      let success = false;
      let updatedUser = null;
      
      if (response.data?.success && response.data?.data?.user) {
        success = true;
        updatedUser = response.data.data.user;
      } else if (response.data?.user) {
        success = true;
        updatedUser = response.data.user;
      }
      
      if (success && updatedUser) {
        setSuccess('Profile berhasil diperbarui');
        setIsEditing(false);
        
        setForceRefresh(prev => prev + 1);
        updateUser(updatedUser);
        
        const newImageUrl = updatedUser.profilePicture ? 
          getImageUrl(updatedUser.profilePicture, true) : null;
          
        setProfileData(prev => ({
          ...prev,
          profilePicture: updatedUser.profilePicture,
          previewImage: newImageUrl
        }));
        
        setTimeout(() => {
          setForceRefresh(prev => prev + 1);
        }, 500);
        
        setTimeout(async () => {
          await refreshUser();
        }, 1000);
        
        window.dispatchEvent(new Event('userUpdated'));
        
      } else {
        throw new Error('Invalid response format');
      }
      
    } catch (error) {
      setError(
        error.response?.data?.error || 
        error.response?.data?.message || 
        error.message ||
        'Terjadi kesalahan saat memperbarui profile'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
    setError('');
    setSuccess('');
    updateLocalProfileData();
  };

  const getInitials = (name) => {
    if (!name) return '?';
    const parts = name.split(' ');
    if (parts.length > 1) {
      return parts[0][0] + parts[1][0];
    }
    return name.substring(0, 2);
  };

  return (
    <div className={`profile-page ${isEditing ? 'editing' : ''}`}>
      <div className="container-fluid">
        {/* Header */}
        <div className="d-flex justify-content-between align-items-center mb-4">
          <div>
            <h1 className="h3 mb-1">Profile Saya</h1>
            <p className="text-muted">Kelola informasi profile dan foto Anda</p>
          </div>
          <div className="d-flex gap-2">
            {!isEditing && (
              <button 
                className="btn btn-primary"
                onClick={() => setIsEditing(true)}
              >
                <i className="fas fa-edit me-2"></i>
                Edit Profile
              </button>
            )}
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

        <div className="row">
          {/* Profile Picture Section */}
          <div className="col-md-4">
            <div className="card profile-card">
              <div className="card-body text-center">
                <div className="profile-picture-container">
                  {profileData.previewImage ? (
                    <div className="profile-picture-wrapper">
                      <img 
                        src={profileData.previewImage} 
                        alt="Profile" 
                        className="profile-picture"
                        key={`profile-img-${forceRefresh}-${Date.now()}`}
                        onError={(e) => {
                          e.target.style.display = 'none';
                          const parent = e.target.parentElement;
                          if (parent && !parent.querySelector('.fallback-initials')) {
                            const initialsDiv = document.createElement('div');
                            initialsDiv.className = 'profile-picture-placeholder fallback-initials';
                            initialsDiv.innerHTML = `<span class="initials">${getInitials(profileData.nama)}</span>`;
                            parent.appendChild(initialsDiv);
                          }
                        }}
                      />
                    </div>
                  ) : (
                    <div className="profile-picture-placeholder">
                      <span className="initials">{getInitials(profileData.nama)}</span>
                    </div>
                  )}
                  
                  {/* 🔥 FIXED: Perfect overlay with proper positioning */}
                  {isEditing && (
                    <div className="profile-picture-overlay">
                      <label htmlFor="profilePicture" className="btn btn-primary">
                        <i className="fas fa-camera"></i>
                      </label>
                      <input
                        type="file"
                        id="profilePicture"
                        accept="image/*"
                        onChange={handleFileChange}
                        className="d-none"
                      />
                    </div>
                  )}
                </div>
                
                <h5 className="mt-3 mb-1">{profileData.nama}</h5>
                <p className="text-muted mb-2">{user?.role}</p>
                <p className="text-muted small">NIP: {user?.nip}</p>
                
                {/* Hapus Foto Button - Show when NOT editing and has photo */}
                {!isEditing && (profileData.previewImage || user?.profilePicture) && (
                  <div className="mt-3">
                    <button 
                      className="btn btn-outline-danger btn-sm"
                      onClick={handleDeletePhoto}
                      disabled={loading}
                    >
                      <i className="fas fa-trash me-1"></i>
                      Hapus Foto
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Profile Information Section */}
          <div className="col-md-8">
            <div className="card">
              <div className="card-header">
                <h5 className="card-title mb-0">Informasi Profile</h5>
              </div>
              <div className="card-body">
                <form onSubmit={handleSubmit}>
                  <div className="row">
                    <div className="col-md-6">
                      <div className="mb-3">
                        <label className="form-label">NIP</label>
                        <input
                          type="text"
                          className="form-control"
                          value={user?.nip || ''}
                          disabled
                        />
                      </div>
                    </div>
                    <div className="col-md-6">
                      <div className="mb-3">
                        <label htmlFor="username" className="form-label">Username</label>
                        <input
                          type="text"
                          className="form-control"
                          id="username"
                          name="username"
                          value={profileData.username || ''}
                          onChange={handleInputChange}
                          disabled={!isEditing}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="row">
                    <div className="col-md-6">
                      <div className="mb-3">
                        <label htmlFor="nama" className="form-label">Nama Lengkap</label>
                        <input
                          type="text"
                          className="form-control"
                          id="nama"
                          name="nama"
                          value={profileData.nama || ''}
                          onChange={handleInputChange}
                          disabled={!isEditing}
                          required
                        />
                      </div>
                    </div>
                    <div className="col-md-6">
                      <div className="mb-3">
                        <label htmlFor="email" className="form-label">Email</label>
                        <input
                          type="email"
                          className="form-control"
                          id="email"
                          name="email"
                          value={profileData.email || ''}
                          onChange={handleInputChange}
                          disabled={!isEditing}
                          required
                        />
                      </div>
                    </div>
                  </div>

                  <div className="row">
                    <div className="col-md-6">
                      <div className="mb-3">
                        <label htmlFor="mobilePhone" className="form-label">No. Handphone</label>
                        <input
                          type="tel"
                          className="form-control"
                          id="mobilePhone"
                          name="mobilePhone"
                          value={profileData.mobilePhone || ''}
                          onChange={handleInputChange}
                          disabled={!isEditing}
                        />
                      </div>
                    </div>
                    <div className="col-md-6">
                      <div className="mb-3">
                        <label className="form-label">Golongan</label>
                        <input
                          type="text"
                          className="form-control"
                          value={user?.golongan || ''}
                          disabled
                        />
                      </div>
                    </div>
                  </div>

                  <div className="row">
                    <div className="col-md-6">
                      <div className="mb-3">
                        <label className="form-label">Jabatan</label>
                        <input
                          type="text"
                          className="form-control"
                          value={user?.jabatan || ''}
                          disabled
                        />
                      </div>
                    </div>
                    <div className="col-md-6">
                      <div className="mb-3">
                        <label className="form-label">Status Kepegawaian</label>
                        <input
                          type="text"
                          className="form-control"
                          value={user?.status || ''}
                          disabled
                        />
                      </div>
                    </div>
                  </div>

                  <div className="mb-3">
                    <label htmlFor="alamat" className="form-label">Alamat</label>
                    <textarea
                      className="form-control"
                      id="alamat"
                      name="alamat"
                      rows="3"
                      value={profileData.alamat || ''}
                      onChange={handleInputChange}
                      disabled={!isEditing}
                      placeholder="Alamat lengkap pegawai..."
                    />
                  </div>

                  {isEditing && (
                    <div className="d-flex justify-content-end gap-2">
                      <button 
                        type="button" 
                        className="btn btn-secondary"
                        onClick={handleCancel}
                        disabled={loading}
                      >
                        <i className="fas fa-times me-2"></i>
                        Batal
                      </button>
                      <button 
                        type="submit" 
                        className="btn btn-primary"
                        disabled={loading}
                      >
                        {loading ? (
                          <>
                            <span className="spinner-border spinner-border-sm me-2"></span>
                            Menyimpan...
                          </>
                        ) : (
                          <>
                            <i className="fas fa-save me-2"></i>
                            Simpan
                          </>
                        )}
                      </button>
                    </div>
                  )}
                </form>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;