// SearchableUserSelect.js - Complete Component
// File: src/components/SearchableUserSelect.js

import React, { useState, useRef, useEffect } from 'react';

const SearchableUserSelect = ({ 
  users = [], 
  value = '', 
  onChange, 
  placeholder = '-- Pilih Pegawai --',
  disabled = false,
  required = false,
  className = ''
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredUsers, setFilteredUsers] = useState(users);
  const dropdownRef = useRef(null);
  const inputRef = useRef(null);

  // Get selected user
  const selectedUser = users.find(user => user.id === value);

  // Filter users based on search term
  useEffect(() => {
    if (!searchTerm) {
      setFilteredUsers(users);
    } else {
      const filtered = users.filter(user =>
        user.nama.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.nip.includes(searchTerm) ||
        user.jabatan?.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredUsers(filtered);
    }
  }, [searchTerm, users]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
        setSearchTerm('');
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleToggleDropdown = () => {
    if (!disabled) {
      setIsOpen(!isOpen);
      if (!isOpen) {
        setTimeout(() => inputRef.current?.focus(), 100);
      }
    }
  };

  const handleUserSelect = (user) => {
    onChange(user.id);
    setIsOpen(false);
    setSearchTerm('');
  };

  const handleClear = (e) => {
    e.stopPropagation();
    onChange('');
    setSearchTerm('');
  };

  return (
    <div className={`position-relative ${className}`} ref={dropdownRef}>
      {/* Display Selected Value */}
      <div 
        className={`form-select d-flex justify-content-between align-items-center ${disabled ? 'disabled' : ''}`}
        onClick={handleToggleDropdown}
        style={{ cursor: disabled ? 'not-allowed' : 'pointer' }}
      >
        <span className={selectedUser ? 'text-dark' : 'text-muted'}>
          {selectedUser ? (
            <>
              {selectedUser.nama} - {selectedUser.nip}
              <small className="text-muted ms-2">({selectedUser.jabatan})</small>
            </>
          ) : (
            placeholder
          )}
        </span>
        <div className="d-flex align-items-center">
          {selectedUser && !disabled && (
            <button
              type="button"
              className="btn btn-sm p-0 me-2"
              onClick={handleClear}
              style={{ background: 'none', border: 'none' }}
            >
              <i className="fas fa-times text-muted"></i>
            </button>
          )}
          <i className={`fas fa-chevron-${isOpen ? 'up' : 'down'} text-muted`}></i>
        </div>
      </div>

      {/* Dropdown Menu */}
      {isOpen && !disabled && (
        <div 
          className="dropdown-menu show w-100 shadow-lg"
          style={{ 
            maxHeight: '300px', 
            overflowY: 'auto',
            zIndex: 1050 
          }}
        >
          {/* Search Input */}
          <div className="p-2 border-bottom">
            <input
              ref={inputRef}
              type="text"
              className="form-control form-control-sm"
              placeholder="Cari nama, NIP, atau jabatan..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onClick={(e) => e.stopPropagation()}
            />
          </div>

          {/* User List */}
          <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
            {filteredUsers.length === 0 ? (
              <div className="dropdown-item-text text-muted text-center py-3">
                <i className="fas fa-search me-2"></i>
                Tidak ada pegawai yang ditemukan
              </div>
            ) : (
              filteredUsers.map(user => (
                <button
                  key={user.id}
                  type="button"
                  className={`dropdown-item d-flex justify-content-between align-items-start ${
                    user.id === value ? 'active' : ''
                  }`}
                  onClick={() => handleUserSelect(user)}
                >
                  <div className="flex-grow-1">
                    <div className="fw-medium">{user.nama}</div>
                    <small className="text-muted">
                      NIP: {user.nip} • {user.jabatan}
                    </small>
                  </div>
                  {user.id === value && (
                    <i className="fas fa-check text-success ms-2"></i>
                  )}
                </button>
              ))
            )}
          </div>

          {/* Footer Info */}
          {filteredUsers.length > 0 && (
            <div className="dropdown-divider m-0"></div>
          )}
          <div className="dropdown-item-text text-muted text-center small py-2">
            {filteredUsers.length} dari {users.length} pegawai
          </div>
        </div>
      )}

      {/* Hidden input for form validation */}
      <input
        type="hidden"
        value={value}
        required={required}
      />
    </div>
  );
};

export default SearchableUserSelect;