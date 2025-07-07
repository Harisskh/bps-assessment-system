// src/components/SearchableSelect.js
import React, { useState, useRef, useEffect } from 'react';

const SearchableSelect = ({ 
  value, 
  onChange, 
  options = [],
  placeholder = "Pilih...",
  className = "",
  disabled = false 
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const dropdownRef = useRef(null);
  const searchRef = useRef(null);

  // Filter options based on search
  const filteredOptions = searchTerm
    ? options.filter(option => 
        option.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
        option.value.toString().includes(searchTerm)
      )
    : options;

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
        setSearchTerm('');
        setHighlightedIndex(-1);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      setTimeout(() => {
        if (searchRef.current) {
          searchRef.current.focus();
        }
      }, 100);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Handle keyboard navigation
  const handleKeyDown = (e) => {
    if (!isOpen) {
      if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown') {
        e.preventDefault();
        setIsOpen(true);
      }
      return;
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setHighlightedIndex(prev => 
          prev < filteredOptions.length - 1 ? prev + 1 : 0
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHighlightedIndex(prev => 
          prev > 0 ? prev - 1 : filteredOptions.length - 1
        );
        break;
      case 'Enter':
        e.preventDefault();
        if (highlightedIndex >= 0 && filteredOptions[highlightedIndex]) {
          handleSelectOption(filteredOptions[highlightedIndex].value);
        }
        break;
      case 'Escape':
        setIsOpen(false);
        setSearchTerm('');
        setHighlightedIndex(-1);
        break;
    }
  };

  const handleToggle = () => {
    if (!disabled) {
      setIsOpen(!isOpen);
      if (!isOpen) {
        setSearchTerm('');
        setHighlightedIndex(-1);
      }
    }
  };

  const handleSelectOption = (optionValue) => {
    onChange({ target: { value: optionValue } }); // Mimic native select onChange
    setIsOpen(false);
    setSearchTerm('');
    setHighlightedIndex(-1);
  };

  const handleSearchChange = (e) => {
    const value = e.target.value;
    setSearchTerm(value);
    setHighlightedIndex(0);
  };

  // Find selected option
  const selectedOption = options.find(opt => opt.value == value);
  const displayValue = selectedOption ? selectedOption.label : placeholder;

  return (
    <div className={`searchable-select position-relative ${className}`} ref={dropdownRef}>
      {/* Main trigger button */}
      <button
        type="button"
        className={`form-select text-start d-flex justify-content-between align-items-center ${
          disabled ? 'disabled' : ''
        } ${!selectedOption ? 'text-muted' : ''}`}
        onClick={handleToggle}
        onKeyDown={handleKeyDown}
        disabled={disabled}
        style={{
          cursor: disabled ? 'not-allowed' : 'pointer'
        }}
      >
        <span>{displayValue}</span>
        <i className={`fas fa-chevron-${isOpen ? 'up' : 'down'}`}></i>
      </button>

      {/* Dropdown menu */}
      {isOpen && (
        <div 
          className="dropdown-menu show position-absolute w-100 mt-1 p-0 shadow-lg border"
          style={{ 
            zIndex: 1050,
            maxHeight: '350px',
            borderRadius: '0.5rem'
          }}
        >
          {/* Search header */}
          <div className="p-2 border-bottom bg-light">
            <div className="input-group input-group-sm">
              <span className="input-group-text bg-white border-end-0">
                <i className="fas fa-search text-muted"></i>
              </span>
              <input
                ref={searchRef}
                type="text"
                className="form-control border-start-0"
                placeholder="Cari..."
                value={searchTerm}
                onChange={handleSearchChange}
                onKeyDown={handleKeyDown}
                style={{ 
                  boxShadow: 'none'
                }}
              />
              {searchTerm && (
                <button
                  type="button"
                  className="btn btn-sm btn-outline-secondary px-2"
                  onClick={() => {
                    setSearchTerm('');
                    setHighlightedIndex(-1);
                    if (searchRef.current) {
                      searchRef.current.focus();
                    }
                  }}
                  style={{ fontSize: '0.75rem' }}
                >
                  <i className="fas fa-times"></i>
                </button>
              )}
            </div>
          </div>

          {/* Options list */}
          <div 
            className="overflow-auto"
            style={{ maxHeight: '280px' }}
          >
            {filteredOptions.length === 0 ? (
              <div className="p-3 text-center text-muted">
                <i className="fas fa-search mb-2 d-block"></i>
                <small>Tidak ditemukan "{searchTerm}"</small>
              </div>
            ) : (
              filteredOptions.map((option, index) => {
                const isSelected = option.value == value;
                const isHighlighted = index === highlightedIndex;
                
                return (
                  <button
                    key={option.value}
                    type="button"
                    className={`dropdown-item d-flex justify-content-between align-items-center ${
                      isSelected ? 'active' : ''
                    } ${isHighlighted && !isSelected ? 'bg-light' : ''}`}
                    onClick={() => handleSelectOption(option.value)}
                    onMouseEnter={() => setHighlightedIndex(index)}
                    style={{
                      cursor: 'pointer',
                      padding: '0.5rem 1rem'
                    }}
                  >
                    <span>{option.label}</span>
                    {isSelected && (
                      <i className="fas fa-check"></i>
                    )}
                  </button>
                );
              })
            )}
          </div>

          {/* Footer info */}
          <div className="px-3 py-2 border-top bg-light">
            <small className="text-muted">
              <i className="fas fa-list me-1"></i>
              {filteredOptions.length} dari {options.length} item
            </small>
          </div>
        </div>
      )}

      {/* Custom styles */}
      <style jsx>{`
        .searchable-select .dropdown-menu {
          animation: slideDown 0.15s ease-out;
        }
        
        @keyframes slideDown {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        .searchable-select .dropdown-item:hover {
          background-color: #f8f9fa;
        }
        
        .searchable-select .dropdown-item.active {
          background-color: #0d6efd;
          color: white;
        }
        
        .searchable-select .overflow-auto::-webkit-scrollbar {
          width: 6px;
        }
        
        .searchable-select .overflow-auto::-webkit-scrollbar-track {
          background: #f1f1f1;
        }
        
        .searchable-select .overflow-auto::-webkit-scrollbar-thumb {
          background: #c1c1c1;
          border-radius: 3px;
        }
        
        .searchable-select .overflow-auto::-webkit-scrollbar-thumb:hover {
          background: #a8a8a8;
        }
      `}</style>
    </div>
  );
};

export default SearchableSelect;