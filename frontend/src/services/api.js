// frontend/src/services/api.js - COMPLETE FIXED VERSION WITH CONFIG INTEGRATION
import axios from 'axios';
import config, { API_BASE_URL, BACKEND_BASE_URL } from '../config/config';

console.log('🔧 API Service initialized with Base URL:', API_BASE_URL);

// Create axios instance with config integration
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: config.SYSTEM.TIMEOUTS.API_REQUEST, // Use config timeout
});

// 🔧 HELPER FUNCTIONS - INTEGRATED WITH CONFIG

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
  
  // If already full URL, return as is
  if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) {
    return imagePath;
  }
  
  // Clean path and construct URL using config
  const cleanPath = imagePath.startsWith('/') ? imagePath : '/' + imagePath;
  let finalUrl = BACKEND_BASE_URL + cleanPath;
  
  // Add cache busting if requested
  if (bustCache) {
    const separator = finalUrl.includes('?') ? '&' : '?';
    finalUrl += separator + 't=' + Date.now();
  }
  
  return finalUrl;
};

/**
 * Get download URL with token for protected files
 * @param {string} endpoint - API endpoint
 * @returns {string} - URL with token
 */
export const getDownloadUrl = (endpoint) => {
  const token = localStorage.getItem(config.STORAGE_KEYS.TOKEN);
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : '/' + endpoint;
  const baseUrl = BACKEND_BASE_URL + '/api' + cleanEndpoint;
  return token ? `${baseUrl}?token=${encodeURIComponent(token)}` : baseUrl;
};

// =====================
// 🔗 CERTIFICATE HELPER FUNCTIONS - NEW ADDITIONS FOR FIXED URL HANDLING
// =====================

/**
 * ✅ NEW: Get certificate preview URL dengan proper config
 * @param {string} userId - User ID
 * @param {string} periodId - Period ID  
 * @param {boolean} isPreview - Whether this is for preview (adds preview=true param)
 * @returns {string} - Complete preview URL with token
 */
export const getCertificatePreviewUrl = (userId, periodId, isPreview = true) => {
  const token = localStorage.getItem(config.STORAGE_KEYS.TOKEN);
  const baseUrl = `${BACKEND_BASE_URL}/api${config.ENDPOINTS.CERTIFICATE}/download-template/${userId}/${periodId}`;
  const params = new URLSearchParams();
  
  if (isPreview) params.append('preview', 'true');
  if (token) params.append('token', token);
  
  return `${baseUrl}?${params.toString()}`;
};

/**
 * ✅ NEW: Get final certificate URL dengan proper config
 * @param {string} certificateId - Certificate ID
 * @returns {string} - Complete final certificate URL with token
 */
export const getFinalCertificateUrl = (certificateId) => {
  const token = localStorage.getItem(config.STORAGE_KEYS.TOKEN);
  const baseUrl = `${BACKEND_BASE_URL}/api${config.ENDPOINTS.CERTIFICATE}/download/${certificateId}`;
  
  return token ? `${baseUrl}?token=${encodeURIComponent(token)}` : baseUrl;
};

/**
 * ✅ NEW: Get template download URL dengan proper config
 * @param {string} userId - User ID
 * @param {string} periodId - Period ID
 * @returns {string} - Complete template download URL with token
 */
export const getTemplateDownloadUrl = (userId, periodId) => {
  const token = localStorage.getItem(config.STORAGE_KEYS.TOKEN);
  const baseUrl = `${BACKEND_BASE_URL}/api${config.ENDPOINTS.CERTIFICATE}/download-template/${userId}/${periodId}`;
  
  return token ? `${baseUrl}?token=${encodeURIComponent(token)}` : baseUrl;
};

// 🔧 AXIOS INTERCEPTORS

// Request interceptor with config integration
api.interceptors.request.use(
  (requestConfig) => {
    const token = localStorage.getItem(config.STORAGE_KEYS.TOKEN);
    if (token) {
      requestConfig.headers.Authorization = `Bearer ${token}`;
    }
    
    if (config.IS_DEVELOPMENT) {
      console.log(`🚀 API Request: ${requestConfig.method?.toUpperCase()} ${requestConfig.url}`, {
        headers: requestConfig.headers,
        data: requestConfig.data instanceof FormData ? 'FormData' : requestConfig.data
      });
    }
    
    return requestConfig;
  },
  (error) => {
    console.error('❌ Request Error:', error);
    return Promise.reject(error);
  }
);

// Response interceptor with config integration
api.interceptors.response.use(
  (response) => {
    if (config.IS_DEVELOPMENT) {
      console.log(`✅ API Response: ${response.config.method?.toUpperCase()} ${response.config.url}`, {
        status: response.status,
        success: response.data?.success,
        hasData: !!response.data?.data
      });
    }
    return response;
  },
  (error) => {
    console.error(`❌ API Error: ${error.config?.method?.toUpperCase()} ${error.config?.url}`, {
      status: error.response?.status,
      message: error.response?.data?.message || error.response?.data?.error,
      data: error.response?.data
    });

    // Handle 401 - Unauthorized
    if (error.response?.status === 401) {
      localStorage.removeItem(config.STORAGE_KEYS.TOKEN);
      localStorage.removeItem(config.STORAGE_KEYS.USER);
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }

    // Network error
    if (!error.response) {
      error.message = 'Tidak dapat terhubung ke server. Periksa koneksi internet Anda.';
    }

    return Promise.reject(error);
  }
);

// 🔧 UTILITY FUNCTIONS

/**
 * Test backend connection
 */
export const testConnection = async () => {
  try {
    const response = await api.get('/test');
    console.log('✅ Backend connection test successful:', response.data);
    return { success: true, data: response.data };
  } catch (error) {
    console.error('❌ Backend connection test failed:', error);
    return { success: false, error: error.message };
  }
};

/**
 * CSS fix for cursor pointer issue
 */
export const fixCursorIssue = () => {
  const style = document.createElement('style');
  style.textContent = `
    * { cursor: auto !important; }
    button, .btn, a, [role="button"], input[type="button"], input[type="submit"] { cursor: pointer !important; }
    .table-responsive { cursor: auto !important; }
    .form-control, .form-select, input, textarea, select { cursor: text !important; }
    .disabled, :disabled { cursor: not-allowed !important; }
    .text-muted { cursor: auto !important; }
  `;
  
  const existingFix = document.getElementById('cursor-fix');
  if (existingFix) existingFix.remove();
  
  style.id = 'cursor-fix';
  document.head.appendChild(style);
  
  console.log('🔧 Applied cursor fix');
};

// =====================
// 🔐 AUTH API
// =====================
export const authAPI = {
  login: (credentials) => api.post(config.ENDPOINTS.AUTH + '/login', credentials),
  register: (userData) => api.post(config.ENDPOINTS.AUTH + '/register', userData),
  getCurrentUser: () => api.get(config.ENDPOINTS.AUTH + '/me'),
  changePassword: (data) => api.put(config.ENDPOINTS.AUTH + '/change-password', data),
  logout: () => api.post(config.ENDPOINTS.AUTH + '/logout'),
};

// =====================
// 👤 PROFILE API
// =====================
export const profileAPI = {
  getProfile: () => api.get(config.ENDPOINTS.PROFILE),
  updateProfile: (formData) => {
    console.log('📤 Sending profile update with FormData');
    return api.put(config.ENDPOINTS.PROFILE, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: config.SYSTEM.TIMEOUTS.FILE_UPLOAD,
    });
  },
  deleteProfilePicture: () => api.delete(config.ENDPOINTS.PROFILE + '/picture'),
};

// =====================
// 👥 USER API
// =====================
export const userAPI = {
  getAll: (params = {}) => {
    const queryParams = new URLSearchParams();
    Object.keys(params).forEach(key => {
      if (params[key] !== undefined && params[key] !== '') {
        queryParams.append(key, params[key]);
      }
    });
    return api.get(`${config.ENDPOINTS.USERS}?${queryParams.toString()}`);
  },
  getById: (id) => api.get(`${config.ENDPOINTS.USERS}/${id}`),
  checkData: (id) => api.get(`${config.ENDPOINTS.USERS}/${id}/check-data`),
  getStats: () => api.get(`${config.ENDPOINTS.USERS}/stats`),
  create: (userData) => api.post(config.ENDPOINTS.USERS, userData),
  update: (id, userData) => api.put(`${config.ENDPOINTS.USERS}/${id}`, userData),
  delete: (id) => api.delete(`${config.ENDPOINTS.USERS}/${id}`),
  permanentDelete: (id) => api.delete(`${config.ENDPOINTS.USERS}/${id}/permanent`),
  activate: (id) => api.put(`${config.ENDPOINTS.USERS}/${id}/activate`),
  resetPassword: (id, data) => api.put(`${config.ENDPOINTS.USERS}/${id}/reset-password`, data),
};

// =====================
// 📊 IMPORT/EXPORT API
// =====================
export const importExportAPI = {
  importUsers: (formData) => api.post(config.ENDPOINTS.IMPORT + '/users', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    timeout: config.SYSTEM.TIMEOUTS.FILE_UPLOAD,
  }),
  downloadTemplate: () => api.get(config.ENDPOINTS.IMPORT + '/template', { responseType: 'blob' }),
  exportUsers: (params = {}) => {
    const queryParams = new URLSearchParams();
    Object.keys(params).forEach(key => {
      if (params[key] !== undefined && params[key] !== '') {
        queryParams.append(key, params[key]);
      }
    });
    return api.get(`${config.ENDPOINTS.EXPORT}/users?${queryParams.toString()}`, { responseType: 'blob' });
  }
};

// =====================
// 📝 EVALUATION API
// =====================
export const evaluationAPI = {
  getParameters: () => api.get(config.ENDPOINTS.EVALUATIONS + '/parameters'),
  getScoreRanges: () => api.get(config.ENDPOINTS.EVALUATIONS + '/score-ranges'),
  getActivePeriod: () => api.get(config.ENDPOINTS.EVALUATIONS + '/active-period'),
  getEligibleUsers: () => api.get(config.ENDPOINTS.EVALUATIONS + '/eligible-users'),
  submit: (data) => {
    console.log('📤 Submitting evaluation:', data);
    
    if (!data.periodId || !data.evaluations || !Array.isArray(data.evaluations)) {
      console.error('❌ Invalid evaluation data structure');
      return Promise.reject(new Error('Invalid evaluation data structure'));
    }
    
    const evaluation = data.evaluations[0];
    const transformedData = {
      periodId: data.periodId,
      targetUserId: evaluation.targetUserId,
      scores: evaluation.scores.map(score => ({
        parameterId: score.parameterId,
        value: score.value
      }))
    };
    
    console.log('📤 Transformed data for backend:', transformedData);
    return api.post(config.ENDPOINTS.EVALUATIONS + '/submit', transformedData);
  },
  getMyEvaluations: (params = {}) => api.get(config.ENDPOINTS.EVALUATIONS + '/my-evaluations', { params }),
  getAll: (params = {}) => api.get(config.ENDPOINTS.EVALUATIONS + '/all', { params }),
  getSummary: (periodId) => api.get(`${config.ENDPOINTS.EVALUATIONS}/summary/${periodId}`),
};

// =====================
// 📅 ATTENDANCE API
// =====================
export const attendanceAPI = {
  getAll: (params = {}) => api.get(config.ENDPOINTS.ATTENDANCE, { params }),
  getById: (id) => api.get(`${config.ENDPOINTS.ATTENDANCE}/${id}`),
  upsert: (data) => {
    console.log('💾 Upserting attendance:', data);
    
    if (!data.userId || !data.periodId) {
      console.error('❌ Missing required fields: userId, periodId');
      return Promise.reject(new Error('Missing required fields: userId, periodId'));
    }
    
    const cleanData = {
      ...data,
      jumlahTidakKerja: parseInt(data.jumlahTidakKerja) || 0,
      jumlahPulangAwal: parseInt(data.jumlahPulangAwal) || 0,
      jumlahTelat: parseInt(data.jumlahTelat) || 0,
      jumlahAbsenApel: parseInt(data.jumlahAbsenApel) || 0,
      jumlahCuti: parseInt(data.jumlahCuti) || 0
    };
    
    return api.post(config.ENDPOINTS.ATTENDANCE, cleanData);
  },
  delete: (id) => api.delete(`${config.ENDPOINTS.ATTENDANCE}/${id}`),
  getStats: (params = {}) => api.get(`${config.ENDPOINTS.ATTENDANCE}/stats`, { params }),
};

// =====================
// 📈 CKP API
// =====================
export const ckpAPI = {
  getAll: (params = {}) => api.get(config.ENDPOINTS.CKP, { params }),
  getById: (id) => api.get(`${config.ENDPOINTS.CKP}/${id}`),
  upsert: (data) => {
    console.log('💾 Upserting CKP:', data);
    
    if (!data.userId || !data.periodId || typeof data.score !== 'number') {
      console.error('❌ Missing required fields: userId, periodId, score');
      return Promise.reject(new Error('Missing required fields: userId, periodId, score'));
    }
    
    if (data.score < 0 || data.score > 100) {
      console.error('❌ Score must be between 0-100');
      return Promise.reject(new Error('Score must be between 0-100'));
    }
    
    return api.post(config.ENDPOINTS.CKP, data);
  },
  delete: (id) => api.delete(`${config.ENDPOINTS.CKP}/${id}`),
};

// =====================
// 📅 PERIOD API
// =====================
export const periodAPI = {
  getAll: (params) => api.get(config.ENDPOINTS.PERIODS, { params }),
  getActive: () => api.get(config.ENDPOINTS.PERIODS + '/active'),
  getById: (id) => api.get(`${config.ENDPOINTS.PERIODS}/${id}`),
  create: (data) => api.post(config.ENDPOINTS.PERIODS, data),
  update: (id, data) => api.put(`${config.ENDPOINTS.PERIODS}/${id}`, data),
  activate: (id) => api.put(`${config.ENDPOINTS.PERIODS}/${id}/activate`),
  delete: (id) => api.delete(`${config.ENDPOINTS.PERIODS}/${id}`),
  
  // Smart period fetching with fallbacks
  getAllSmart: async (params = {}) => {
    try {
      try {
        return await api.get(config.ENDPOINTS.PERIODS + '/staff/all', { params });
      } catch (staffError) {
        console.log('Staff endpoint not available, trying main endpoint...');
      }
      
      try {
        return await api.get(config.ENDPOINTS.PERIODS, { params });
      } catch (mainError) {
        console.log('Main periods endpoint not accessible, using active only...');
      }
      
      const activeResponse = await api.get(config.ENDPOINTS.PERIODS + '/active');
      const activePeriod = activeResponse.data.data?.period || activeResponse.data.period;
      
      return {
        data: {
          data: {
            periods: activePeriod ? [activePeriod] : [],
            pagination: { currentPage: 1, totalPages: 1, totalCount: activePeriod ? 1 : 0, limit: 50 }
          }
        }
      };
    } catch (error) {
      console.error('All periods access methods failed:', error);
      throw error;
    }
  },
  
  getByYearMonth: (tahun, bulan) => api.get(config.ENDPOINTS.PERIODS + '/search', { params: { tahun, bulan, limit: 1 } }),
  getPrevious: () => api.get(config.ENDPOINTS.PERIODS + '/previous'),
  
  // Comprehensive periods with data generation
  getComprehensivePeriods: async () => {
    try {
      const allPeriods = new Map();
      
      // Try to get all periods
      try {
        const allPeriodsResponse = await periodAPI.getAllSmart({ limit: 100 });
        const periods = allPeriodsResponse.data.data?.periods || allPeriodsResponse.data.periods || [];
        periods.forEach(period => allPeriods.set(period.id, period));
        console.log('✅ Got periods from main source:', periods.length);
      } catch (error) {
        console.warn('⚠️ Could not get all periods:', error);
      }
      
      // Try to get active period
      try {
        const activeResponse = await api.get(config.ENDPOINTS.PERIODS + '/active');
        const activePeriod = activeResponse.data.data?.period || activeResponse.data.period;
        if (activePeriod) {
          allPeriods.set(activePeriod.id, activePeriod);
          console.log('✅ Got active period:', activePeriod.namaPeriode);
        }
      } catch (error) {
        console.warn('⚠️ Could not get active period:', error);
      }
      
      // Extract periods from evaluations
      try {
        const evaluationsResponse = await evaluationAPI.getMyEvaluations({ limit: 1000 });
        const evaluations = evaluationsResponse.data.data?.evaluations || evaluationsResponse.data.evaluations || [];
        evaluations.forEach(evaluation => {
          if (evaluation.period) {
            allPeriods.set(evaluation.period.id, evaluation.period);
          }
        });
        console.log('✅ Extracted periods from evaluations');
      } catch (error) {
        console.warn('⚠️ Could not extract periods from evaluations:', error);
      }
      
      const periodsArray = Array.from(allPeriods.values());
      return generateAllPossiblePeriods(periodsArray);
    } catch (error) {
      console.error('Error getting comprehensive periods:', error);
      return [];
    }
  }
};

// Helper function to generate all possible periods
const generateAllPossiblePeriods = (existingPeriods) => {
  const currentDate = new Date();
  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth() + 1;
  
  const allPeriods = [];
  const existingPeriodsMap = new Map();
  
  existingPeriods.forEach(period => {
    const key = `${period.tahun}-${period.bulan}`;
    existingPeriodsMap.set(key, period);
  });
  
  const yearsToGenerate = [currentYear - 2, currentYear - 1, currentYear];
  
  yearsToGenerate.forEach(year => {
    for (let month = 1; month <= 12; month++) {
      if (year === currentYear && month > currentMonth) continue;
      
      const key = `${year}-${month}`;
      const monthName = getMonthName(month);
      const periodName = `${monthName} ${year}`;
      
      if (existingPeriodsMap.has(key)) {
        const existingPeriod = existingPeriodsMap.get(key);
        allPeriods.push({ ...existingPeriod, hasEvaluations: true, isReal: true });
      } else {
        allPeriods.push({
          id: `generated-${year}-${month}`,
          namaPeriode: periodName,
          tahun: year,
          bulan: month,
          isActive: false,
          hasEvaluations: false,
          isReal: false,
          startDate: null,
          endDate: null
        });
      }
    }
  });
  
  allPeriods.sort((a, b) => {
    if (a.isActive && !b.isActive) return -1;
    if (!a.isActive && b.isActive) return 1;
    if (a.tahun !== b.tahun) return b.tahun - a.tahun;
    return b.bulan - a.bulan;
  });
  
  return allPeriods;
};

const getMonthName = (month) => {
  const months = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
  return months[month - 1] || 'Unknown';
};

// =====================
// 🏆 CERTIFICATE MANAGEMENT API - COMPLETE FIXED VERSION
// =====================
export const certificateManagementAPI = {
  getAvailableTemplates: () => api.get(config.ENDPOINTS.CERTIFICATE + '/templates'),
  
  getBestEmployees: (filters = {}) => {
    const params = new URLSearchParams();
    if (filters.tahun) params.append('tahun', filters.tahun);
    if (filters.bulan) params.append('bulan', filters.bulan);
    if (filters.status) params.append('status', filters.status);
    
    const queryString = params.toString();
    const url = queryString ? 
      `${config.ENDPOINTS.CERTIFICATE}/management?${queryString}` : 
      `${config.ENDPOINTS.CERTIFICATE}/management`;
    
    return api.get(url);
  },

  generateTemplateWithNomor: (userId, periodId, nomorSertifikat, templateType = 'TTD_BASAH') => {
    return api.post(`${config.ENDPOINTS.CERTIFICATE}/generate-template/${userId}/${periodId}`, {
      nomorSertifikat: nomorSertifikat,
      templateType: templateType
    });
  },

  updateCertificateNumber: (userId, periodId, nomorSertifikat) => {
    return api.put(`${config.ENDPOINTS.CERTIFICATE}/update-number/${userId}/${periodId}`, {
      nomorSertifikat: nomorSertifikat
    });
  },

  deleteCertificate: (userId, periodId) => {
    return api.delete(`${config.ENDPOINTS.CERTIFICATE}/delete/${userId}/${periodId}`);
  },

  // ✅ FIXED: Download template menggunakan axios dengan responseType blob
  downloadTemplate: async (userId, periodId) => {
    return await api.get(`${config.ENDPOINTS.CERTIFICATE}/download-template/${userId}/${periodId}`, {
      responseType: 'blob',
      headers: { 'Accept': 'application/pdf' }
    });
  },

  // ✅ FIXED: Generate download URL menggunakan BACKEND_BASE_URL dari config
  getTemplateDownloadUrl: (userId, periodId) => {
    const token = localStorage.getItem(config.STORAGE_KEYS.TOKEN);
    return `${BACKEND_BASE_URL}/api${config.ENDPOINTS.CERTIFICATE}/download-template/${userId}/${periodId}?token=${encodeURIComponent(token)}`;
  },

  // ✅ FIXED: Upload certificate dengan proper timeout dari config
  uploadCertificate: (userId, periodId, file) => {
    const formData = new FormData();
    formData.append('certificate', file);
    return api.post(`${config.ENDPOINTS.CERTIFICATE}/upload/${userId}/${periodId}`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: config.SYSTEM.TIMEOUTS.FILE_UPLOAD,
    });
  },

  // ✅ FIXED: Preview template (tidak digunakan lagi, diganti dengan direct URL)
  previewTemplate: (userId, periodId) => {
    return api.get(`${config.ENDPOINTS.CERTIFICATE}/preview-template/${userId}/${periodId}`, { 
      responseType: 'blob' 
    });
  },

  // ✅ FIXED: Download final certificate menggunakan config endpoint
  downloadCertificate: (certificateId) => {
    return api.get(`${config.ENDPOINTS.CERTIFICATE}/download/${certificateId}`, { 
      responseType: 'blob' 
    });
  }
};

// =====================
// 👤 USER CERTIFICATE API - FIXED CONFIG INTEGRATION
// =====================
export const userCertificateAPI = {
  getMyCertificates: () => api.get(config.ENDPOINTS.CERTIFICATE + '/my-certificates'),
  getMyCertificatesDetailed: () => api.get(config.ENDPOINTS.CERTIFICATE + '/my-certificates-detailed'),
  downloadMyCertificate: (certificateId) => api.get(`${config.ENDPOINTS.CERTIFICATE}/download/${certificateId}`, { 
    responseType: 'blob' 
  })
};

// =====================
// 📊 DASHBOARD API
// =====================
export const dashboardAPI = {
  getStats: (params) => api.get(config.ENDPOINTS.DASHBOARD + '/stats', { params }),
  getEvaluationProgress: (params) => api.get(config.ENDPOINTS.DASHBOARD + '/evaluation-progress', { params }),
  getCharts: (params) => api.get(config.ENDPOINTS.DASHBOARD + '/charts', { params }),
  getActivities: (params) => api.get(config.ENDPOINTS.DASHBOARD + '/activities', { params }),
};

// =====================
// 🔍 MONITORING API
// =====================
export const monitoringAPI = {
  getEvaluationStatus: (params) => api.get(config.ENDPOINTS.MONITORING + '/evaluation-status', { params }),
  getIncompleteUsers: (params) => api.get(config.ENDPOINTS.MONITORING + '/incomplete-users', { params }),
  getUserDetail: (userId, params) => api.get(`${config.ENDPOINTS.MONITORING}/user/${userId}/detail`, { params }),
};

// =====================
// 🏆 FINAL EVALUATION API
// =====================
export const finalEvaluationAPI = {
  // 🔥 FIXED: Use correct endpoint path
  calculate: (data) => {
    console.log('🔄 Calculating final evaluations:', data);
    return api.post('/final-evaluation/calculate', data);
  },
  
  // 🔥 FIXED: Use correct endpoint path
  getFinal: (params) => {
    console.log('📊 Getting final evaluations:', params);
    return api.get('/final-evaluation/final-evaluations', { params });
  },
  
  // 🔥 FIXED: Use correct endpoint path
  getBestEmployee: (periodId) => {
    console.log('👑 Getting best employee for period:', periodId);
    return api.get(`/final-evaluation/best-employee/${periodId}`);
  },
  
  // 🔥 FIXED: Use correct endpoint path
  getLeaderboard: (params) => {
    console.log('📊 Getting leaderboard:', params);
    return api.get('/final-evaluation/leaderboard', { params });
  },
};

// 🔥 NEW: Alternative endpoints with fallback for compatibility
export const finalEvaluationAPIWithFallback = {
  calculate: async (data) => {
    try {
      // Try primary endpoint first
      return await api.post('/final-evaluation/calculate', data);
    } catch (error) {
      if (error.response?.status === 404) {
        console.log('🔄 Primary endpoint not found, trying alternative...');
        // Try alternative endpoint
        return await api.post('/final-evaluations/calculate', data);
      }
      throw error;
    }
  },
  
  getFinal: async (params) => {
    try {
      // Try primary endpoint first
      return await api.get('/final-evaluation/final-evaluations', { params });
    } catch (error) {
      if (error.response?.status === 404) {
        console.log('🔄 Primary endpoint not found, trying alternative...');
        // Try alternative endpoint
        return await api.get('/final-evaluations', { params });
      }
      throw error;
    }
  },
  
  getBestEmployee: async (periodId) => {
    try {
      // Try primary endpoint first
      return await api.get(`/final-evaluation/best-employee/${periodId}`);
    } catch (error) {
      if (error.response?.status === 404) {
        console.log('🔄 Primary endpoint not found, trying alternative...');
        // Try alternative endpoint
        return await api.get(`/final-evaluations/best-employee/${periodId}`);
      }
      throw error;
    }
  },
  
  getLeaderboard: async (params) => {
    try {
      // Try primary endpoint first
      return await api.get('/final-evaluation/leaderboard', { params });
    } catch (error) {
      if (error.response?.status === 404) {
        console.log('🔄 Primary endpoint not found, trying alternative...');
        // Try alternative endpoint
        return await api.get('/final-evaluations/leaderboard', { params });
      }
      throw error;
    }
  },
};

// 🔥 RECOMMENDED: Use this as the main export
export const finalEvaluationAPIFixed = finalEvaluationAPIWithFallback;


// =====================
// 📊 REPORTS API
// =====================
export const reportsAPI = {
  getComprehensive: (params = {}) => {
    console.log('📊 Getting comprehensive report data:', params);
    return api.get(config.ENDPOINTS.REPORTS + '/comprehensive', { 
      params,
      timeout: config.SYSTEM.TIMEOUTS.REPORT_GENERATION
    });
  },
  getBerakhlak: (params = {}) => api.get(config.ENDPOINTS.REPORTS + '/berakhlak', { params }),
  getAttendance: (params = {}) => api.get(config.ENDPOINTS.REPORTS + '/attendance', { params }),
  getCkp: (params = {}) => api.get(config.ENDPOINTS.REPORTS + '/ckp', { params }),
  exportToPDF: (data) => {
    console.log('📄 Exporting report to PDF:', data);
    return api.post(config.ENDPOINTS.REPORTS + '/export/pdf', data, {
      responseType: 'blob',
      timeout: config.SYSTEM.TIMEOUTS.REPORT_GENERATION
    });
  }
};

// =====================
// 🔧 ENHANCED UTILITY FUNCTIONS
// =====================

/**
 * Enhanced comprehensive report API call with better error handling
 */
export const getComprehensiveReportWithFix = async (params = {}) => {
  try {
    console.log('📊 Getting comprehensive report with cursor fix:', params);
    
    fixCursorIssue();
    
    const response = await api.get(config.ENDPOINTS.REPORTS + '/comprehensive', { 
      params,
      timeout: config.SYSTEM.TIMEOUTS.REPORT_GENERATION,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    });
    
    setTimeout(() => {
      fixCursorIssue();
    }, 500);
    
    return response;
    
  } catch (error) {
    console.error('❌ Comprehensive report error:', error);
    
    setTimeout(() => {
      fixCursorIssue();
    }, 500);
    
    throw error;
  }
};

/**
 * Generic file download helper
 * @param {string} url - Download URL
 * @param {string} filename - Default filename
 */
export const downloadFile = (url, filename = 'download') => {
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  document.body.removeChild(link);
};

/**
 * Format file size in human readable format
 * @param {number} bytes - File size in bytes
 * @returns {string} - Formatted file size
 */
export const formatFileSize = (bytes) => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

/**
 * Check if file type is allowed
 * @param {File} file - File object
 * @param {string[]} allowedTypes - Array of allowed MIME types
 * @returns {boolean} - Whether file type is allowed
 */
export const isFileTypeAllowed = (file, allowedTypes) => {
  return allowedTypes.includes(file.type);
};

/**
 * Validate file size
 * @param {File} file - File object
 * @param {number} maxSize - Maximum file size in bytes
 * @returns {boolean} - Whether file size is valid
 */
export const isFileSizeValid = (file, maxSize = config.MAX_FILE_SIZE) => {
  return file.size <= maxSize;
};

/**
 * Create blob URL for preview
 * @param {Blob} blob - Blob object
 * @returns {string} - Blob URL
 */
export const createBlobUrl = (blob) => {
  return window.URL.createObjectURL(blob);
};

/**
 * Revoke blob URL to free memory
 * @param {string} url - Blob URL to revoke
 */
export const revokeBlobUrl = (url) => {
  window.URL.revokeObjectURL(url);
};

/**
 * Debug API configuration
 */
export const debugAPI = () => {
  if (config.IS_DEVELOPMENT) {
    console.group('🔧 API Configuration Debug');
    console.log('API Base URL:', API_BASE_URL);
    console.log('Backend Base URL:', BACKEND_BASE_URL);
    console.log('Max File Size:', formatFileSize(config.MAX_FILE_SIZE));
    console.log('Request Timeout:', config.SYSTEM.TIMEOUTS.API_REQUEST + 'ms');
    console.log('Upload Timeout:', config.SYSTEM.TIMEOUTS.FILE_UPLOAD + 'ms');
    console.log('Report Timeout:', config.SYSTEM.TIMEOUTS.REPORT_GENERATION + 'ms');
    console.log('Environment:', config.IS_DEVELOPMENT ? 'Development' : 'Production');
    console.groupEnd();
  }
};

// Initialize debug on import (development only)
if (config.IS_DEVELOPMENT) {
  debugAPI();
}

export default api;