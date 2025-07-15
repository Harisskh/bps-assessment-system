// src/components/SearchableUserSelect.js - FIXED VERSION
import React from 'react';
import Select from 'react-select';

const SearchableUserSelect = ({
  users = [],
  value = '',
  onChange,
  placeholder = '-- Pilih Pegawai --',
  disabled = false,
  required = false,
  className = '',
  isMulti = false,
  isClearable = true
}) => {
  // FIXED: Pastikan users array valid dan transform ke format react-select
  const options = Array.isArray(users) ? users.map(user => ({
    value: user.id,
    label: `${user.nama} (${user.nip})`,
    user: user
  })) : [];

  console.log('🔍 SearchableUserSelect Debug:', {
    usersCount: users.length,
    optionsCount: options.length,
    currentValue: value,
    users: users.slice(0, 3) // Log 3 users pertama untuk debug
  });

  // FIXED: Find selected option dengan pengecekan yang lebih robust
  const selectedValue = isMulti 
    ? options.filter(option => Array.isArray(value) ? value.includes(option.value) : false)
    : options.find(option => option.value === value) || null;

  // FIXED: Handle change dengan error handling
  const handleChange = (selected) => {
    try {
      if (isMulti) {
        const values = selected ? selected.map(opt => opt.value) : [];
        onChange(values);
      } else {
        onChange(selected ? selected.value : '');
      }
    } catch (error) {
      console.error('SearchableUserSelect onChange error:', error);
    }
  };

  // FIXED: Custom styles yang lebih stabil
  const customStyles = {
    control: (provided, state) => ({
      ...provided,
      minHeight: '42px',
      borderColor: state.isFocused ? '#0d6efd' : '#ced4da',
      boxShadow: state.isFocused ? '0 0 0 0.25rem rgba(13, 110, 253, 0.25)' : 'none',
      '&:hover': {
        borderColor: state.isFocused ? '#0d6efd' : '#adb5bd'
      }
    }),
    menu: (provided) => ({
      ...provided,
      zIndex: 9999,
      borderRadius: '0.375rem',
      boxShadow: '0 0.5rem 1rem rgba(0, 0, 0, 0.15)',
      border: '1px solid #dee2e6'
    }),
    menuList: (provided) => ({
      ...provided,
      maxHeight: '300px',
      padding: '0.25rem'
    }),
    option: (provided, state) => ({
      ...provided,
      borderRadius: '0.25rem',
      margin: '0.125rem 0',
      backgroundColor: state.isSelected 
        ? '#0d6efd' 
        : state.isFocused 
          ? '#f8f9fa' 
          : 'transparent',
      color: state.isSelected ? 'white' : '#212529',
      '&:hover': {
        backgroundColor: state.isSelected ? '#0d6efd' : '#f8f9fa'
      },
      cursor: 'pointer',
      fontSize: '0.9rem',
      padding: '0.5rem 0.75rem'
    }),
    placeholder: (provided) => ({
      ...provided,
      color: '#6c757d',
      fontSize: '0.9rem'
    }),
    singleValue: (provided) => ({
      ...provided,
      color: '#212529',
      fontSize: '0.9rem'
    }),
    noOptionsMessage: (provided) => ({
      ...provided,
      color: '#6c757d',
      fontSize: '0.9rem',
      padding: '0.75rem'
    }),
    loadingMessage: (provided) => ({
      ...provided,
      color: '#6c757d',
      fontSize: '0.9rem'
    })
  };

  // FIXED: Custom Option component dengan info lebih detail
  const CustomOption = ({ innerProps, label, data, isSelected, isFocused }) => (
    <div 
      {...innerProps}
      style={{
        padding: '0.75rem',
        borderRadius: '0.25rem',
        margin: '0.125rem 0',
        backgroundColor: isSelected 
          ? '#0d6efd' 
          : isFocused 
            ? '#f8f9fa' 
            : 'transparent',
        color: isSelected ? 'white' : '#212529',
        cursor: 'pointer',
        transition: 'all 0.2s'
      }}
    >
      <div className="d-flex align-items-center">
        <div className="me-3">
          <div 
            className="rounded-circle d-flex align-items-center justify-content-center"
            style={{
              width: '32px',
              height: '32px',
              backgroundColor: isSelected ? 'rgba(255,255,255,0.2)' : '#0d6efd',
              color: 'white',
              fontSize: '0.75rem',
              fontWeight: '600'
            }}
          >
            {data.user.nama.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()}
          </div>
        </div>
        <div className="flex-grow-1">
          <div style={{ 
            fontWeight: '600',
            fontSize: '0.9rem',
            marginBottom: '2px'
          }}>
            {data.user.nama}
          </div>
          <div style={{ 
            fontSize: '0.75rem',
            opacity: 0.8
          }}>
            NIP: {data.user.nip} • {data.user.jabatan || 'Staff'}
          </div>
        </div>
        {isSelected && (
          <div className="ms-2">
            <i className="fas fa-check"></i>
          </div>
        )}
      </div>
    </div>
  );

  // FIXED: NoOptionsMessage component
  const NoOptionsMessage = () => (
    <div style={{
      padding: '1.5rem',
      textAlign: 'center',
      color: '#6c757d'
    }}>
      <i className="fas fa-search fa-2x mb-2 d-block" style={{ opacity: 0.5 }}></i>
      <div style={{ fontSize: '0.9rem' }}>Tidak ada pegawai ditemukan</div>
      <div style={{ fontSize: '0.8rem', marginTop: '4px' }}>
        Coba gunakan kata kunci yang berbeda
      </div>
    </div>
  );

  // FIXED: Custom filter function
  const filterOption = (option, inputValue) => {
    if (!inputValue) return true;
    const searchTerm = inputValue.toLowerCase();
    
    return (
      option.user.nama.toLowerCase().includes(searchTerm) ||
      option.user.nip.toLowerCase().includes(searchTerm) ||
      (option.user.jabatan && option.user.jabatan.toLowerCase().includes(searchTerm)) ||
      (option.user.username && option.user.username.toLowerCase().includes(searchTerm))
    );
  };

  return (
    <div className={className}>
      <Select
        value={selectedValue}
        onChange={handleChange}
        options={options}
        styles={customStyles}
        components={{
          Option: CustomOption,
          NoOptionsMessage,
          IndicatorSeparator: () => null
        }}
        placeholder={placeholder}
        isDisabled={disabled}
        isMulti={isMulti}
        isClearable={isClearable}
        isSearchable={true}
        filterOption={filterOption}
        noOptionsMessage={() => "Tidak ada pegawai ditemukan"}
        loadingMessage={() => "Memuat data pegawai..."}
        menuPlacement="auto"
        menuPosition="absolute"
        maxMenuHeight={300}
        closeMenuOnSelect={!isMulti}
        hideSelectedOptions={false}
        blurInputOnSelect={true}
      />
      {required && !value && (
        <div className="invalid-feedback d-block">
          <small className="text-danger">
            <i className="fas fa-exclamation-circle me-1"></i>
            Pegawai wajib dipilih
          </small>
        </div>
      )}
    </div>
  );
};

export default SearchableUserSelect;