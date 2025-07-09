// src/components/SearchableUserSelect.js - COMPLETE FIXED VERSION
import React, { useState, useEffect, useRef, useMemo } from 'react';

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
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const dropdownRef = useRef(null);
  const inputRef = useRef(null);

  // FIXED: Use useMemo for filtering to prevent re-renders and refresh issues
  const filteredUsers = useMemo(() => {
    if (!searchTerm.trim()) return users;
    
    const term = searchTerm.toLowerCase();
    return users.filter(user => 
      user.nama?.toLowerCase().includes(term) ||
      user.nip?.toLowerCase().includes(term) ||
      user.jabatan?.toLowerCase().includes(term)
    );
  }, [users, searchTerm]);

  // Get selected user
  const selectedUser = users.find(user => user.id === value);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
        setSearchTerm('');
        setHighlightedIndex(-1);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Handle keyboard navigation
  const handleKeyDown = (e) => {
    if (!isOpen) {
      if (e.key === 'Enter' || e.key === 'ArrowDown') {
        e.preventDefault();
        setIsOpen(true);
        setHighlightedIndex(0);
      }
      return;
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setHighlightedIndex(prev => 
          prev < filteredUsers.length - 1 ? prev + 1 : 0
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHighlightedIndex(prev => 
          prev > 0 ? prev - 1 : filteredUsers.length - 1
        );
        break;
      case 'Enter':
        e.preventDefault();
        if (highlightedIndex >= 0 && filteredUsers[highlightedIndex]) {
          handleSelectUser(filteredUsers[highlightedIndex]);
        }
        break;
      case 'Escape':
        setIsOpen(false);
        setSearchTerm('');
        setHighlightedIndex(-1);
        inputRef.current?.blur();
        break;
      default:
        break;
    }
  };

  // Handle user selection
  const handleSelectUser = (user) => {
    onChange(user.id);
    setIsOpen(false);
    setSearchTerm('');
    setHighlightedIndex(-1);
    inputRef.current?.blur();
  };

  // Handle input focus
  const handleInputFocus = () => {
    if (!disabled) {
      setIsOpen(true);
      setHighlightedIndex(-1);
    }
  };

  // FIXED: Handle search input change without causing refresh
  const handleSearchChange = (e) => {
    const newSearchTerm = e.target.value;
    setSearchTerm(newSearchTerm);
    setHighlightedIndex(-1);
    
    // Keep dropdown open while searching
    if (!isOpen) {
      setIsOpen(true);
    }
  };

  // Clear selection
  const handleClearSelection = (e) => {
    e.stopPropagation();
    onChange('');
    setSearchTerm('');
    setIsOpen(false);
    setHighlightedIndex(-1);
  };

  // Display value in input
  const getDisplayValue = () => {
    if (isOpen) {
      return searchTerm;
    }
    return selectedUser ? `${selectedUser.nama} - ${selectedUser.nip}` : '';
  };

  // Get placeholder text
  const getPlaceholderText = () => {
    if (selectedUser && !isOpen) {
      return `${selectedUser.nama} - ${selectedUser.nip}`;
    }
    return placeholder;
  };

  return (
    <div className={`position-relative ${className}`} ref={dropdownRef}>
      {/* Input Field */}
      <div className="input-group">
        <input
          ref={inputRef}
          type="text"
          className={`form-control ${isOpen ? 'focus' : ''}`}
          placeholder={getPlaceholderText()}
          value={getDisplayValue()}
          onChange={handleSearchChange}
          onFocus={handleInputFocus}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          required={required}
          autoComplete="off"
          style={{
            backgroundColor: disabled ? '#e9ecef' : 'white',
            cursor: disabled ? 'not-allowed' : 'text'
          }}
        />
        
        {/* Clear button */}
        {selectedUser && !disabled && (
          <button
            type="button"
            className="btn btn-outline-secondary"
            onClick={handleClearSelection}
            tabIndex="-1"
            title="Clear selection"
          >
            <i className="fas fa-times"></i>
          </button>
        )}
        
        {/* Dropdown toggle */}
        <button
          type="button"
          className="btn btn-outline-secondary dropdown-toggle"
          onClick={() => !disabled && setIsOpen(!isOpen)}
          disabled={disabled}
          tabIndex="-1"
          title="Open dropdown"
        >
          <i className={`fas fa-chevron-${isOpen ? 'up' : 'down'}`}></i>
        </button>
      </div>

      {/* Dropdown Menu */}
      {isOpen && !disabled && (
        <div 
          className="dropdown-menu show w-100 shadow-lg" 
          style={{ 
            maxHeight: '300px', 
            overflowY: 'auto',
            zIndex: 1050,
            position: 'absolute',
            top: '100%',
            left: 0,
            right: 0
          }}
        >
          {/* Search info */}
          {searchTerm && (
            <div className="dropdown-header">
              <small className="text-muted">
                <i className="fas fa-search me-1"></i>
                Hasil pencarian "{searchTerm}" ({filteredUsers.length} ditemukan)
              </small>
            </div>
          )}
          
          {/* User options */}
          {filteredUsers.length > 0 ? (
            filteredUsers.map((user, index) => (
              <button
                key={user.id}
                type="button"
                className={`dropdown-item d-flex align-items-center ${
                  index === highlightedIndex ? 'active' : ''
                } ${user.id === value ? 'selected bg-light' : ''}`}
                onClick={() => handleSelectUser(user)}
                onMouseEnter={() => setHighlightedIndex(index)}
                style={{ 
                  whiteSpace: 'normal',
                  padding: '8px 16px'
                }}
              >
                <div className="flex-grow-1">
                  <div className="fw-medium">{user.nama}</div>
                  <small className="text-muted">
                    NIP: {user.nip} • {user.jabatan}
                  </small>
                  {user.jenisKelamin && (
                    <small className="text-muted d-block">
                      {user.jenisKelamin} • {user.role}
                    </small>
                  )}
                </div>
                {user.id === value && (
                  <i className="fas fa-check text-primary ms-2"></i>
                )}
              </button>
            ))
          ) : (
            <div className="dropdown-item-text text-center text-muted py-3">
              <i className="fas fa-search-minus fa-2x mb-2 d-block"></i>
              {searchTerm ? 
                `Tidak ditemukan pegawai dengan "${searchTerm}"` : 
                'Tidak ada data pegawai'
              }
            </div>
          )}
          
          {/* Footer info */}
          {filteredUsers.length > 0 && (
            <div className="dropdown-divider"></div>
          )}
          <div className="dropdown-header">
            <small className="text-muted">
              <i className="fas fa-keyboard me-1"></i>
              Gunakan ↑↓ untuk navigasi, Enter untuk pilih, Esc untuk tutup
            </small>
          </div>
        </div>
      )}

      {/* Validation message */}
      {required && !value && (
        <div className="invalid-feedback d-block">
          <small>Silakan pilih pegawai</small>
        </div>
      )}
    </div>
  );
};

export default SearchableUserSelect;