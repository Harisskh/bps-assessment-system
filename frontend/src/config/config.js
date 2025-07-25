// frontend/src/config/config.js
// FINAL OPTIMIZED CONFIG - PRODUCTION READY

const config = {
  // 🔥 API Configuration - Environment Based
  API_BASE_URL: process.env.REACT_APP_API_URL || 'http://localhost:5000/api',
  
  // Backend base URL (for uploads, static files)
  BACKEND_BASE_URL: (process.env.REACT_APP_API_URL || 'http://localhost:5000/api').replace('/api', ''),
  
  // File upload configuration (matching backend limits)
  MAX_FILE_SIZE: 5 * 1024 * 1024, // 5MB
  ALLOWED_IMAGE_TYPES: ['image/jpeg', 'image/jpg', 'image/png', 'image/gif'],
  ALLOWED_EXCEL_TYPES: [
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-excel'
  ],
  
  // Environment detection
  IS_DEVELOPMENT: process.env.NODE_ENV === 'development',
  IS_PRODUCTION: process.env.NODE_ENV === 'production',
  IS_TEST: process.env.NODE_ENV === 'test',
  
  // 🎯 BPS Assessment System Settings (ACTUAL IMPLEMENTATION)
  SYSTEM: {
    NAME: 'SiAPIK - Sistem Penilaian dan Penentuan Pegawai Terbaik',
    COMPANY: 'BPS Kabupaten Pringsewu',
    VERSION: '1.0.0',
    
    // Evaluation weights (from final spec)
    WEIGHTS: {
      PRESENSI: 40,        // 40%
      TOKOH_BERAKHLAK: 30, // 30%  
      CKP: 30              // 30%
    },
    
    // Single BerAKHLAK category (current implementation)
    BERAKHLAK: {
      MIN_SCORE: 80,
      MAX_SCORE: 100,
      PARAMETERS_COUNT: 8
    },
    
    // Timeouts and limits
    TIMEOUTS: {
      API_REQUEST: 30000,     // 30 seconds
      FILE_UPLOAD: 60000,     // 60 seconds
      REPORT_GENERATION: 120000 // 2 minutes
    }
  },
  
  // Local Storage keys (actually used in app)
  STORAGE_KEYS: {
    TOKEN: 'token',
    USER: 'user',
    SIDEBAR_COLLAPSED: 'sidebarCollapsed',
    THEME: 'theme'
  },
  
  // UI Configuration
  UI_SETTINGS: {
    DEFAULT_PAGE_SIZE: 10,
    MAX_PAGE_SIZE: 100,
    TOAST_DURATION: 3000,
    DEBOUNCE_DELAY: 500
  },
  
  // API Endpoints (for consistency)
  ENDPOINTS: {
    AUTH: '/auth',
    USERS: '/users',
    PROFILE: '/profile',
    EVALUATIONS: '/evaluations',
    ATTENDANCE: '/attendance',
    CKP: '/ckp',
    PERIODS: '/periods',
    CERTIFICATE: '/certificate',
    IMPORT: '/import',
    EXPORT: '/export',
    DASHBOARD: '/dashboard',
    MONITORING: '/monitoring',
    REPORTS: '/reports'
  }
};

// 🔧 HELPER FUNCTIONS - NO DUPLICATION WITH API.JS

/**
 * Get full API URL
 * @param {string} endpoint - API endpoint (e.g., '/users')
 * @returns {string} - Full API URL
 */
export const getApiUrl = (endpoint) => {
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : '/' + endpoint;
  return config.API_BASE_URL + cleanEndpoint;
};

/**
 * Get backend base URL (without /api)
 * @returns {string} - Backend base URL
 */
export const getBackendUrl = () => {
  return config.BACKEND_BASE_URL;
};

/**
 * Get upload/static file URL
 * @param {string} path - File path
 * @returns {string} - Full static file URL
 */
export const getStaticUrl = (path) => {
  if (!path) return null;
  const cleanPath = path.startsWith('/') ? path : '/' + path;
  return config.BACKEND_BASE_URL + cleanPath;
};

/**
 * Check if current environment is development
 * @returns {boolean}
 */
export const isDevelopment = () => config.IS_DEVELOPMENT;

/**
 * Check if current environment is production
 * @returns {boolean}
 */
export const isProduction = () => config.IS_PRODUCTION;

/**
 * Debug configuration (development only)
 */
export const debugConfig = () => {
  if (config.IS_DEVELOPMENT) {
    console.group('🔧 Config Debug Info');
    console.log('Environment:', process.env.NODE_ENV);
    console.log('API Base URL:', config.API_BASE_URL);
    console.log('Backend Base URL:', config.BACKEND_BASE_URL);
    console.log('REACT_APP_API_URL:', process.env.REACT_APP_API_URL);
    console.log('File Upload Max Size:', config.MAX_FILE_SIZE);
    console.log('System Version:', config.SYSTEM.VERSION);
    console.groupEnd();
  }
};

// Export individual items for easier imports
export const {
  API_BASE_URL,
  BACKEND_BASE_URL,  
  MAX_FILE_SIZE,
  SYSTEM,
  STORAGE_KEYS,
  UI_SETTINGS,
  ENDPOINTS
} = config;

export default config;