// src/config/config.js - CENTRALIZED CONFIGURATION FOR DEPLOYMENT
const config = {
  // 🔥 API Configuration - WILL BE REPLACED FOR PRODUCTION
  API_BASE_URL: process.env.REACT_APP_API_URL || 'http://localhost:5000/api',
  
  // Get backend base URL (remove /api suffix for file serving)
  BACKEND_BASE_URL: (process.env.REACT_APP_API_URL || 'http://localhost:5000/api').replace('/api', ''),
  
  // File upload configuration
  MAX_FILE_SIZE: 5 * 1024 * 1024, // 5MB
  ALLOWED_IMAGE_TYPES: ['image/jpeg', 'image/jpg', 'image/png', 'image/gif'],
  ALLOWED_EXCEL_TYPES: [
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-excel'
  ],
  
  // Pagination
  DEFAULT_PAGE_SIZE: 10,
  MAX_PAGE_SIZE: 100,
  
  // Environment
  IS_DEVELOPMENT: process.env.NODE_ENV === 'development',
  IS_PRODUCTION: process.env.NODE_ENV === 'production',
  IS_TEST: process.env.NODE_ENV === 'test',
  
  // 🔥 BPS Specific Settings
  BPS_SETTINGS: {
    COMPANY_NAME: 'BPS Kabupaten Pringsewu',
    SYSTEM_NAME: 'SIAPIK - Sistem Penilaian Pegawai',
    SYSTEM_VERSION: '1.0.0',
    
    // Evaluation settings
    TOKOH_BERAKHLAK_CATEGORIES: 3,
    TOKOH_BERAKHLAK_PARAMETERS: 8,
    
    // Scoring weights
    WEIGHTS: {
      PRESENSI: 40,      // 40%
      TOKOH_BERAKHLAK: 30, // 30%
      CKP: 30            // 30%
    },
    
    // Score ranges for Tokoh Berakhlak
    SCORE_RANGES: {
      TOKOH_1: { min: 96, max: 100 },
      TOKOH_2: { min: 86, max: 95 },
      TOKOH_3: { min: 80, max: 85 }
    }
  },
  
  // UI Settings
  UI_SETTINGS: {
    ITEMS_PER_PAGE: 10,
    TOAST_DURATION: 3000,
    MODAL_ANIMATION_DURATION: 300,
    DEBOUNCE_DELAY: 500,
    
    // Responsive breakpoints
    BREAKPOINTS: {
      sm: '640px',
      md: '768px',
      lg: '1024px',
      xl: '1280px',
      '2xl': '1536px'
    }
  },
  
  // Date formats
  DATE_FORMATS: {
    DISPLAY: 'DD/MM/YYYY',
    API: 'YYYY-MM-DD',
    DATETIME: 'DD/MM/YYYY HH:mm',
    TIME: 'HH:mm'
  },
  
  // Local Storage keys
  STORAGE_KEYS: {
    TOKEN: 'token',
    USER: 'user',
    SIDEBAR_COLLAPSED: 'sidebarCollapsed',
    THEME: 'theme',
    LANGUAGE: 'language'
  }
};

// 🔥 HELPER FUNCTIONS

/**
 * Get properly formatted image URL
 * @param {string} imagePath - Path to image
 * @param {boolean} bustCache - Add timestamp to prevent caching
 * @returns {string|null} - Full image URL or null
 */
export const getImageUrl = (imagePath, bustCache = false) => {
  if (!imagePath || imagePath === 'undefined' || imagePath === 'null') {
    return null;
  }
  
  let finalUrl;
  
  // Check if it's already a full URL
  if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) {
    finalUrl = imagePath;
  } else {
    // Construct URL from backend base
    const cleanPath = imagePath.startsWith('/') ? imagePath : '/' + imagePath;
    finalUrl = config.BACKEND_BASE_URL + cleanPath;
  }
  
  // Add cache busting if requested
  if (bustCache) {
    const separator = finalUrl.includes('?') ? '&' : '?';
    finalUrl += `${separator}_t=${Date.now()}`;
  }
  
  return finalUrl;
};

/**
 * Get user initials from full name
 * @param {string} name - Full name
 * @returns {string} - User initials (max 2 characters)
 */
export const getInitials = (name = '') => {
  if (!name || typeof name !== 'string') return '??';
  
  return name
    .trim()
    .split(' ')
    .map(word => word.charAt(0).toUpperCase())
    .slice(0, 2)
    .join('');
};

/**
 * Format file size to human readable format
 * @param {number} bytes - File size in bytes
 * @returns {string} - Formatted size
 */
export const formatFileSize = (bytes) => {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

/**
 * Validate file type and size
 * @param {File} file - File to validate
 * @param {string} type - 'image' or 'excel'
 * @returns {object} - Validation result
 */
export const validateFile = (file, type = 'image') => {
  const result = {
    valid: true,
    errors: []
  };
  
  // Check file size
  if (file.size > config.MAX_FILE_SIZE) {
    result.valid = false;
    result.errors.push(`File terlalu besar. Maksimal ${formatFileSize(config.MAX_FILE_SIZE)}`);
  }
  
  // Check file type
  const allowedTypes = type === 'image' 
    ? config.ALLOWED_IMAGE_TYPES 
    : config.ALLOWED_EXCEL_TYPES;
    
  if (!allowedTypes.includes(file.type)) {
    result.valid = false;
    result.errors.push(`Tipe file tidak didukung. Yang diizinkan: ${allowedTypes.join(', ')}`);
  }
  
  return result;
};

/**
 * Debug logging (only in development)
 * @param {...any} args - Arguments to log
 */
export const debugLog = (...args) => {
  if (config.IS_DEVELOPMENT) {
    console.log('[DEBUG]', ...args);
  }
};

/**
 * Production logging (always logs but differently)
 * @param {string} level - Log level
 * @param {...any} args - Arguments to log
 */
export const log = (level = 'info', ...args) => {
  const timestamp = new Date().toISOString();
  const prefix = `[${timestamp}] [${level.toUpperCase()}]`;
  
  if (config.IS_DEVELOPMENT) {
    console.log(prefix, ...args);
  } else {
    // In production, you might want to send to external logging service
    console.log(prefix, ...args);
  }
};

/**
 * Format date according to specified format
 * @param {string|Date} date - Date to format
 * @param {string} format - Format key from DATE_FORMATS
 * @returns {string} - Formatted date
 */
export const formatDate = (date, format = 'DISPLAY') => {
  if (!date) return '';
  
  const dateObj = new Date(date);
  if (isNaN(dateObj.getTime())) return '';
  
  const options = {
    DISPLAY: { day: '2-digit', month: '2-digit', year: 'numeric' },
    API: { year: 'numeric', month: '2-digit', day: '2-digit' },
    DATETIME: { 
      day: '2-digit', 
      month: '2-digit', 
      year: 'numeric', 
      hour: '2-digit', 
      minute: '2-digit' 
    },
    TIME: { hour: '2-digit', minute: '2-digit' }
  };
  
  return dateObj.toLocaleString('id-ID', options[format] || options.DISPLAY);
};

/**
 * Get storage item with JSON parsing
 * @param {string} key - Storage key
 * @param {any} defaultValue - Default value if not found
 * @returns {any} - Parsed value or default
 */
export const getStorageItem = (key, defaultValue = null) => {
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : defaultValue;
  } catch (error) {
    debugLog('Error parsing storage item:', key, error);
    return defaultValue;
  }
};

/**
 * Set storage item with JSON stringification
 * @param {string} key - Storage key
 * @param {any} value - Value to store
 */
export const setStorageItem = (key, value) => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    debugLog('Error setting storage item:', key, error);
  }
};

/**
 * Calculate final score for employee evaluation
 * @param {object} scores - Object containing evaluation scores
 * @returns {number} - Final weighted score
 */
export const calculateFinalScore = (scores) => {
  const { presensi = 0, tokohBerakhlak = 0, ckp = 0 } = scores;
  const weights = config.BPS_SETTINGS.WEIGHTS;
  
  return (
    (presensi * weights.PRESENSI / 100) +
    (tokohBerakhlak * weights.TOKOH_BERAKHLAK / 100) +
    (ckp * weights.CKP / 100)
  );
};

/**
 * Check if score is within range for Tokoh Berakhlak category
 * @param {number} score - Score to check
 * @param {number} category - Category (1, 2, or 3)
 * @returns {boolean} - Whether score is valid for category
 */
export const isValidTokohBerakhlakScore = (score, category) => {
  const ranges = config.BPS_SETTINGS.SCORE_RANGES;
  
  switch (category) {
    case 1:
      return score >= ranges.TOKOH_1.min && score <= ranges.TOKOH_1.max;
    case 2:
      return score >= ranges.TOKOH_2.min && score <= ranges.TOKOH_2.max;
    case 3:
      return score >= ranges.TOKOH_3.min && score <= ranges.TOKOH_3.max;
    default:
      return false;
  }
};

// Export configuration and helpers
export default config;