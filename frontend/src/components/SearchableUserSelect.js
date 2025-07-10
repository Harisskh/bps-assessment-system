// src/components/SearchableSelect.js - FIXED VERSION
import React, { useState, useRef, useEffect } from 'react';
import '../styles/SearchableSelect.scss'; // Pastikan file SCSS diimpor

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
  const dropdownRef = useRef(null);
  const searchRef = useRef(null);

  const filteredOptions = searchTerm
    ? options.filter(option =>
        option.label.toLowerCase().includes(searchTerm.toLowerCase())
      )
    : options;

  const selectedOption = options.find(opt => opt.value === value);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      setTimeout(() => searchRef.current?.focus(), 100);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const handleSelectOption = (optionValue) => {
    onChange({ target: { value: optionValue } }); // Mimic native event
    setIsOpen(false);
    setSearchTerm('');
  };

  const displayValue = selectedOption ? selectedOption.label : placeholder;

  return (
    <div className={`searchable-select ${isOpen ? 'is-open' : ''} ${className}`} ref={dropdownRef}>
      <button
        type="button"
        className="searchable-select__toggle"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
      >
        <span className={!selectedOption ? 'text-muted' : ''}>{displayValue}</span>
        <i className="fas fa-chevron-down searchable-select__arrow"></i>
      </button>

      {isOpen && (
        <div className="searchable-select__menu">
          <div className="searchable-select__search-wrapper">
            <i className="fas fa-search"></i>
            <input
              ref={searchRef}
              type="text"
              className="searchable-select__search-input"
              placeholder="Cari..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <ul className="searchable-select__options-list">
            {filteredOptions.length === 0 ? (
              <li className="searchable-select__no-options">Tidak ditemukan</li>
            ) : (
              filteredOptions.map((option) => (
                <li
                  key={option.value}
                  className={`searchable-select__option ${option.value === value ? 'is-selected' : ''}`}
                  onClick={() => handleSelectOption(option.value)}
                  onMouseDown={(e) => e.preventDefault()}
                >
                  {option.label}
                  {option.value === value && <i className="fas fa-check"></i>}
                </li>
              ))
            )}
          </ul>
        </div>
      )}
    </div>
  );
};

export default SearchableSelect;