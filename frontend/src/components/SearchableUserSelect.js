// src/components/SearchableUserSelect.js

import React, { useState, useEffect, useRef, useMemo } from 'react';
import '../styles/SearchableSelect.scss'; // Import SCSS baru

const SearchableUserSelect = ({
  users = [],
  value,
  onChange,
  placeholder = "-- Pilih Pegawai --",
  disabled = false,
  required = false,
  className = ""
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const dropdownRef = useRef(null);
  const searchInputRef = useRef(null);

  const filteredUsers = useMemo(() => {
    if (!searchTerm.trim()) return users;
    const term = searchTerm.toLowerCase();
    return users.filter(user =>
      user.nama?.toLowerCase().includes(term) ||
      user.nip?.toLowerCase().includes(term) ||
      user.jabatan?.toLowerCase().includes(term)
    );
  }, [users, searchTerm]);

  const selectedUser = users.find(user => user.id === value);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);
  
  useEffect(() => {
    if (isOpen) {
        setTimeout(() => searchInputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  const handleSelectUser = (userId) => {
    onChange(userId);
    setIsOpen(false);
    setSearchTerm('');
  };
  
  const displayLabel = selectedUser 
    ? `${selectedUser.nama} (${selectedUser.nip})`
    : <span className="placeholder">{placeholder}</span>;

  return (
    <div className={`searchable-select ${className}`} ref={dropdownRef}>
      <button
        type="button"
        className="dropdown-toggle-custom"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
      >
        {displayLabel}
        <i className={`fas fa-chevron-${isOpen ? 'up' : 'down'} text-muted ms-2`}></i>
      </button>

      {isOpen && !disabled && (
        <div className="dropdown-menu show">
          <div className="search-header">
            <input
              ref={searchInputRef}
              type="text"
              className="form-control"
              placeholder="Cari nama, NIP, atau jabatan..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="options-list">
            {filteredUsers.length > 0 ? (
              filteredUsers.map((user) => (
                <button
                  key={user.id}
                  type="button"
                  className={`dropdown-item ${value === user.id ? 'active' : ''}`}
                  onClick={() => handleSelectUser(user.id)}
                >
                  <div>
                    <div>{user.nama}</div>
                    <div className="user-jabatan">{user.jabatan || 'N/A'}</div>
                  </div>
                </button>
              ))
            ) : (
              <span className="dropdown-item-text text-muted text-center p-3">
                Pegawai tidak ditemukan.
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default SearchableUserSelect;