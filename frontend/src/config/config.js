// frontend/src/config/config.js - FIXED untuk Development & Production

const config = {
  // 🔥 DYNAMIC API Configuration based on environment
  API_BASE_URL: (() => {
    // Development environment detection
    const isDevelopment = process.env.NODE_ENV === 'development' || 
                         window.location.hostname === 'localhost' ||
                         window.location.hostname === '127.0.0.1';
    
    if (isDevelopment) {
      // Development: Use localhost backend
      return process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
    } else {
      // Production: Use production backend
      return process.env.REACT_APP_API_URL || 'https://siapik1810.web.bps.go.id/api';
    }
  })(),
  
  // Backend base URL (for uploads, static files)
  BACKEND_BASE_URL: (() => {
    const isDevelopment = process.env.NODE_ENV === 'development' || 
                         window.location.hostname === 'localhost' ||
                         window.location.hostname === '127.0.0.1';
    
    if (isDevelopment) {
      return process.env.REACT_APP_API_URL?.replace('/api', '') || 'http://localhost:5000';
    } else {
      return process.env.REACT_APP_API_URL?.replace('/api', '') || 'https://siapik1810.web.bps.go.id';
    }
  })(),
  
  // File upload configuration
  MAX_FILE_SIZE: 5 * 1024 * 1024, // 5MB
  ALLOWED_IMAGE_TYPES: ['image/jpeg', 'image/jpg', 'image/png', 'image/gif'],
  ALLOWED_EXCEL_TYPES: [
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-excel'
  ],
  
  // Environment detection
  IS_DEVELOPMENT: process.env.NODE_ENV === 'development' || 
                  window.location.hostname === 'localhost',
  IS_PRODUCTION: process.env.NODE_ENV === 'production' && 
                 window.location.hostname !== 'localhost',
  
  // System configuration
  SYSTEM: {
    NAME: 'SiAPIK - Sistem Penilaian dan Penentuan Pegawai Terbaik',
    COMPANY: 'BPS Kabupaten Pringsewu',
    VERSION: '1.0.0',
    
    WEIGHTS: {
      PRESENSI: 40,        // 40%
      TOKOH_BERAKHLAK: 30, // 30%  
      CKP: 30              // 30%
    },
    
    BERAKHLAK: {
      MIN_SCORE: 80,
      MAX_SCORE: 100,
      PARAMETERS_COUNT: 8
    },
    
    TIMEOUTS: {
      API_REQUEST: 30000,     // 30 seconds
      FILE_UPLOAD: 60000,     // 60 seconds
      REPORT_GENERATION: 120000 // 2 minutes
    }
  },
  
  STORAGE_KEYS: {
    TOKEN: 'token',
    USER: 'user',
    SIDEBAR_COLLAPSED: 'sidebarCollapsed',
    THEME: 'theme'
  },
  
  UI_SETTINGS: {
    DEFAULT_PAGE_SIZE: 10,
    MAX_PAGE_SIZE: 100,
    TOAST_DURATION: 3000,
    DEBOUNCE_DELAY: 500
  },
  
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

// Debug configuration
if (config.IS_DEVELOPMENT) {
  console.group('🔧 SiAPIK Config Debug');
  console.log('Environment:', process.env.NODE_ENV);
  console.log('Hostname:', window.location.hostname);
  console.log('API Base URL:', config.API_BASE_URL);
  console.log('Backend Base URL:', config.BACKEND_BASE_URL);
  console.log('Is Development:', config.IS_DEVELOPMENT);
  console.log('Is Production:', config.IS_PRODUCTION);
  console.groupEnd();
}

// Helper functions
export const getApiUrl = (endpoint) => {
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : '/' + endpoint;
  return config.API_BASE_URL + cleanEndpoint;
};

export const getBackendUrl = () => config.BACKEND_BASE_URL;

export const getStaticUrl = (path) => {
  if (!path) return null;
  const cleanPath = path.startsWith('/') ? path : '/' + path;
  return config.BACKEND_BASE_URL + cleanPath;
};

export const isDevelopment = () => config.IS_DEVELOPMENT;
export const isProduction = () => config.IS_PRODUCTION;

// Export config
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