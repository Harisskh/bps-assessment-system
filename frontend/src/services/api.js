// src/services/api.js - UPDATED WITH TEMPLATE SELECTION SUPPORT
import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

console.log('API Base URL:', API_BASE_URL);

// Create axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000, // 30 seconds timeout
});

// Helper function untuk construct image URL dengan benar
export const getImageUrl = (imagePath) => {
  if (!imagePath) return null;
  const baseUrl = process.env.REACT_APP_API_URL?.replace('/api', '') || 'http://localhost:5000';
  
  // Handle different path formats
  if (imagePath.startsWith('http')) {
    return imagePath; // Already full URL
  }
  
  const cleanPath = imagePath.startsWith('/') ? imagePath : '/' + imagePath;
  return `${baseUrl}${cleanPath}`;
};

// Request interceptor
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    console.log(`🚀 API Request: ${config.method?.toUpperCase()} ${config.url}`, {
      headers: config.headers,
      data: config.data instanceof FormData ? 'FormData' : config.data
    });
    
    return config;
  },
  (error) => {
    console.error('❌ Request Error:', error);
    return Promise.reject(error);
  }
);

// Response interceptor
api.interceptors.response.use(
  (response) => {
    console.log(`✅ API Response: ${response.config.method?.toUpperCase()} ${response.config.url}`, {
      status: response.status,
      success: response.data?.success,
      hasData: !!response.data?.data
    });
    return response;
  },
  (error) => {
    console.error(`❌ API Error: ${error.config?.method?.toUpperCase()} ${error.config?.url}`, {
      status: error.response?.status,
      message: error.response?.data?.message || error.response?.data?.error,
      data: error.response?.data
    });

    // Handle specific error cases
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
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

// Test connection function
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

// =====================
// AUTH API
// =====================
export const authAPI = {
  login: (credentials) => api.post('/auth/login', credentials),
  register: (userData) => api.post('/auth/register', userData),
  getCurrentUser: () => api.get('/auth/me'),
  changePassword: (data) => api.put('/auth/change-password', data),
  logout: () => api.post('/auth/logout'),
};

// =====================
// PROFILE API
// =====================
export const profileAPI = {
  getProfile: () => api.get('/profile'),
  updateProfile: (formData) => {
    console.log('📤 Sending profile update with FormData');
    
    return api.put('/profile', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      timeout: 60000, // 60 seconds for file uploads
    });
  },
  deleteProfilePicture: () => api.delete('/profile/picture'),
};

// =====================
// USER API
// =====================
export const userAPI = {
  getAll: (params = {}) => {
    const queryParams = new URLSearchParams();
    
    Object.keys(params).forEach(key => {
      if (params[key] !== undefined && params[key] !== '') {
        queryParams.append(key, params[key]);
      }
    });
    
    return api.get(`/users?${queryParams.toString()}`);
  },
  getById: (id) => api.get(`/users/${id}`),
  checkData: (id) => api.get(`/users/${id}/check-data`),
  getStats: () => api.get('/users/stats'),
  create: (userData) => api.post('/users', userData),
  update: (id, userData) => api.put(`/users/${id}`, userData),
  delete: (id) => api.delete(`/users/${id}`),
  permanentDelete: (id) => api.delete(`/users/${id}/permanent`),
  activate: (id) => api.put(`/users/${id}/activate`),
  resetPassword: (id, data) => api.put(`/users/${id}/reset-password`, data),
};

// =====================
// IMPORT/EXPORT API
// =====================
export const importExportAPI = {
  importUsers: (formData) => {
    return api.post('/import/users', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      timeout: 60000,
    });
  },
  downloadTemplate: () => {
    return api.get('/import/template', {
      responseType: 'blob',
    });
  },
  exportUsers: (params = {}) => {
    const queryParams = new URLSearchParams();
    
    Object.keys(params).forEach(key => {
      if (params[key] !== undefined && params[key] !== '') {
        queryParams.append(key, params[key]);
      }
    });
    
    return api.get(`/export/users?${queryParams.toString()}`, {
      responseType: 'blob',
    });
  }
};

// =====================
// EVALUATION API
// =====================
export const evaluationAPI = {
  getParameters: () => {
    console.log('🔄 Getting evaluation parameters...');
    return api.get('/evaluations/parameters');
  },
  getScoreRanges: () => {
    console.log('🔄 Getting score ranges...');
    return api.get('/evaluations/score-ranges');
  },
  getActivePeriod: () => {
    console.log('🔄 Getting active period...');
    return api.get('/evaluations/active-period');
  },
  getEligibleUsers: () => {
    console.log('🔄 Getting eligible users...');
    return api.get('/evaluations/eligible-users');
  },
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
    return api.post('/evaluations/submit', transformedData);
  },
  getMyEvaluations: (params = {}) => {
    console.log('🔄 Getting my evaluations:', params);
    return api.get('/evaluations/my-evaluations', { params });
  },
  getAll: (params = {}) => {
    console.log('🔄 Getting all evaluations:', params);
    return api.get('/evaluations/all', { params });
  },
  getSummary: (periodId) => {
    console.log('🔄 Getting evaluation summary for period:', periodId);
    return api.get(`/evaluations/summary/${periodId}`);
  },
};

// =====================
// ATTENDANCE API
// =====================
export const attendanceAPI = {
  getAll: (params = {}) => {
    console.log('🔄 Getting attendance records:', params);
    return api.get('/attendance', { params });
  },
  getById: (id) => {
    console.log('🔄 Getting attendance by ID:', id);
    return api.get(`/attendance/${id}`);
  },
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
    
    console.log('💾 Clean attendance data:', cleanData);
    return api.post('/attendance', cleanData);
  },
  delete: (id) => {
    console.log('🗑️ Deleting attendance:', id);
    return api.delete(`/attendance/${id}`);
  },
  getStats: (params = {}) => {
    console.log('📊 Getting attendance stats:', params);
    return api.get('/attendance/stats', { params });
  },
};

// =====================
// CKP API
// =====================
export const ckpAPI = {
  getAll: (params = {}) => {
    console.log('🔄 Getting CKP scores:', params);
    return api.get('/ckp', { params });
  },
  getById: (id) => {
    console.log('🔄 Getting CKP by ID:', id);
    return api.get(`/ckp/${id}`);
  },
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
    
    return api.post('/ckp', data);
  },
  delete: (id) => {
    console.log('🗑️ Deleting CKP:', id);
    return api.delete(`/ckp/${id}`);
  },
};

// =====================
// PERIOD API
// =====================
export const periodAPI = {
  getAll: (params) => api.get('/periods', { params }),
  getActive: () => api.get('/periods/active'),
  getById: (id) => api.get(`/periods/${id}`),
  create: (data) => api.post('/periods', data),
  update: (id, data) => api.put(`/periods/${id}`, data),
  activate: (id) => api.put(`/periods/${id}/activate`),
  delete: (id) => api.delete(`/periods/${id}`),
  
  getAllSmart: async (params = {}) => {
    try {
      try {
        return await api.get('/periods/staff/all', { params });
      } catch (staffError) {
        console.log('Staff endpoint not available, trying main endpoint...');
      }
      
      try {
        return await api.get('/periods', { params });
      } catch (mainError) {
        console.log('Main periods endpoint not accessible, using active only...');
      }
      
      const activeResponse = await api.get('/periods/active');
      const activePeriod = activeResponse.data.data?.period || activeResponse.data.period;
      
      return {
        data: {
          data: {
            periods: activePeriod ? [activePeriod] : [],
            pagination: {
              currentPage: 1,
              totalPages: 1,
              totalCount: activePeriod ? 1 : 0,
              limit: 50
            }
          }
        }
      };
    } catch (error) {
      console.error('All periods access methods failed:', error);
      throw error;
    }
  },
  
  getByYearMonth: (tahun, bulan) => {
    console.log('🔄 Getting period by year month:', tahun, bulan);
    return api.get('/periods/search', { params: { tahun, bulan, limit: 1 } });
  },
  
  getPrevious: () => {
    console.log('🔄 Getting previous period from active...');
    return api.get('/periods/previous');
  },
  
  getComprehensivePeriods: async () => {
    try {
      const allPeriods = new Map();
      
      try {
        const allPeriodsResponse = await periodAPI.getAllSmart({ limit: 100 });
        const periods = allPeriodsResponse.data.data?.periods || allPeriodsResponse.data.periods || [];
        periods.forEach(period => {
          allPeriods.set(period.id, period);
        });
        console.log('✅ Got periods from main source:', periods.length);
      } catch (error) {
        console.warn('⚠️ Could not get all periods:', error);
      }
      
      try {
        const activeResponse = await api.get('/periods/active');
        const activePeriod = activeResponse.data.data?.period || activeResponse.data.period;
        if (activePeriod) {
          allPeriods.set(activePeriod.id, activePeriod);
          console.log('✅ Got active period:', activePeriod.namaPeriode);
        }
      } catch (error) {
        console.warn('⚠️ Could not get active period:', error);
      }
      
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
      const comprehensivePeriods = generateAllPossiblePeriods(periodsArray);
      
      return comprehensivePeriods;
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
      if (year === currentYear && month > currentMonth) {
        continue;
      }
      
      const key = `${year}-${month}`;
      const monthName = getMonthName(month);
      const periodName = `${monthName} ${year}`;
      
      if (existingPeriodsMap.has(key)) {
        const existingPeriod = existingPeriodsMap.get(key);
        allPeriods.push({
          ...existingPeriod,
          hasEvaluations: true,
          isReal: true
        });
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
  const months = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
  ];
  return months[month - 1] || 'Unknown';
};

// =====================
// 🔥 UPDATED: CERTIFICATE MANAGEMENT API WITH TEMPLATE SELECTION
// =====================
export const certificateManagementAPI = {
  // 🔥 UPDATED: Get available templates (ADMIN & PIMPINAN)
  getAvailableTemplates: () => {
    console.log('🔄 Getting available certificate templates...');
    return api.get('/certificate/templates');
  },

  // 🔥 UPDATED: Get all best employees for certificate management (ADMIN & PIMPINAN)
  getBestEmployees: (filters = {}) => {
    const params = new URLSearchParams();
    if (filters.tahun) params.append('tahun', filters.tahun);
    if (filters.bulan) params.append('bulan', filters.bulan);
    if (filters.status) params.append('status', filters.status);
    
    const queryString = params.toString();
    const url = queryString ? `/certificate/management?${queryString}` : '/certificate/management';
    
    console.log('🔄 Getting best employees for certificate management with filters:', filters);
    return api.get(url);
  },

  // 🔥 UPDATED: Generate template with template type selection and nomor sertifikat (ADMIN ONLY)
  generateTemplateWithNomor: (userId, periodId, nomorSertifikat, templateType = 'TTD_BASAH') => {
    console.log('🔄 Generating template with type:', templateType, 'nomor:', nomorSertifikat);
    console.log('👤 Current user role should be ADMIN for this action');
    
    return api.post(`/certificate/generate-template/${userId}/${periodId}`, {
      nomorSertifikat: nomorSertifikat,
      templateType: templateType
    });
  },

  // 🔥 UPDATED: Update certificate number (ADMIN & PIMPINAN)
  updateCertificateNumber: (userId, periodId, nomorSertifikat) => {
    console.log('📝 Updating certificate number:', nomorSertifikat);
    return api.put(`/certificate/update-number/${userId}/${periodId}`, {
      nomorSertifikat: nomorSertifikat
    });
  },

  // 🔥 UPDATED: Delete certificate - Reset to beginning (ADMIN & PIMPINAN)
  deleteCertificate: (userId, periodId) => {
    console.log('🗑️ Deleting certificate for user:', userId, 'period:', periodId);
    console.log('👤 User role should be ADMIN or PIMPINAN for this action');
    console.log('🔗 DELETE URL:', `/certificate/delete/${userId}/${periodId}`);
    
    return api.delete(`/certificate/delete/${userId}/${periodId}`).then(response => {
      console.log('✅ Delete response:', response.data);
      return response;
    }).catch(error => {
      console.error('❌ Delete error:', error);
      console.error('❌ Delete error response:', error.response?.data);
      console.error('❌ Delete error status:', error.response?.status);
      throw error;
    });
  },

  // 🔥 UPDATED: Download template with proper authentication (ADMIN & PIMPINAN)
  downloadTemplate: async (userId, periodId) => {
    try {
      console.log('📥 Downloading template for user:', userId, 'period:', periodId);
      console.log('👤 User role should be ADMIN or PIMPINAN for this action');
      
      const response = await api.get(`/certificate/download-template/${userId}/${periodId}`, {
        responseType: 'blob',
        headers: {
          'Accept': 'application/pdf'
        }
      });
      
      return response;
    } catch (error) {
      console.error('❌ Template download API error:', error);
      throw error;
    }
  },

  // 🔥 UPDATED: Get download URL (for window.open method) (ADMIN & PIMPINAN)
  getTemplateDownloadUrl: (userId, periodId) => {
    console.log('📥 Getting template download URL for user:', userId, 'period:', periodId);
    console.log('👤 User role should be ADMIN or PIMPINAN for this action');
    const baseUrl = process.env.REACT_APP_API_URL?.replace('/api', '') || 'http://localhost:5000';
    const token = localStorage.getItem('token');
    return `${baseUrl}/api/certificate/download-template/${userId}/${periodId}?token=${encodeURIComponent(token)}`;
  },
  
  // 🔥 UPDATED: Upload final certificate (ADMIN & PIMPINAN)
  uploadCertificate: (userId, periodId, file) => {
    console.log('📤 Uploading certificate for user:', userId, 'period:', periodId);
    console.log('👤 User role should be ADMIN or PIMPINAN for this action');
    console.log('📁 File:', file.name, 'Size:', file.size, 'Type:', file.type);
    
    const formData = new FormData();
    formData.append('certificate', file);
    
    return api.post(`/certificate/upload/${userId}/${periodId}`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      timeout: 60000, // 60 seconds for upload
    });
  },

  // 🔥 UPDATED: Preview template (ADMIN & PIMPINAN)
  previewTemplate: (userId, periodId) => {
    console.log('👁️ Previewing template for user:', userId, 'period:', periodId);
    console.log('👤 User role should be ADMIN or PIMPINAN for this action');
    
    return api.get(`/certificate/preview-template/${userId}/${periodId}`, {
      responseType: 'blob',
    });
  },
  
  // 🔥 UPDATED: Download final certificate (ADMIN & PIMPINAN & STAFF for own certificates)
  downloadCertificate: (certificateId) => {
    console.log('📥 Downloading final certificate:', certificateId);
    console.log('👤 User role: ADMIN/PIMPINAN can download any, STAFF can download own');
    
    return api.get(`/certificate/download/${certificateId}`, {
      responseType: 'blob',
    });
  }
};

// 🔥 UPDATED: User Certificate API (ALL ROLES)
export const userCertificateAPI = {
  // Get user's own certificates (ALL ROLES)
  getMyCertificates: () => {
    console.log('🔄 Getting my certificates...');
    console.log('👤 Available for all roles (STAFF, ADMIN, PIMPINAN)');
    return api.get('/certificate/my-certificates');
  },

  // Get detailed certificates with scores (ALL ROLES)
  getMyCertificatesDetailed: () => {
    console.log('🔄 Getting my detailed certificates with scores...');
    console.log('👤 Available for all roles (STAFF, ADMIN, PIMPINAN)');
    return api.get('/certificate/my-certificates-detailed');
  },
  
  // Download user's certificate (ALL ROLES for own certificates)
  downloadMyCertificate: (certificateId) => {
    console.log('⬇️ Downloading my certificate:', certificateId);
    console.log('👤 User can only download their own certificates');
    return api.get(`/certificate/download/${certificateId}`, {
      responseType: 'blob'
    });
  }
};

// =====================
// DASHBOARD API
// =====================
export const dashboardAPI = {
  getStats: (params) => api.get('/dashboard/stats', { params }),
  getEvaluationProgress: (params) => api.get('/dashboard/evaluation-progress', { params }),
  getCharts: (params) => api.get('/dashboard/charts', { params }),
  getActivities: (params) => api.get('/dashboard/activities', { params }),
};

// =====================
// MONITORING API
// =====================
export const monitoringAPI = {
  getEvaluationStatus: (params) => api.get('/monitoring/evaluation-status', { params }),
  getIncompleteUsers: (params) => api.get('/monitoring/incomplete-users', { params }),
  getUserDetail: (userId, params) => api.get(`/monitoring/user/${userId}/detail`, { params }),
};

// =====================
// FINAL EVALUATION API
// =====================
export const finalEvaluationAPI = {
  calculate: (data) => api.post('/final-evaluation/calculate', data),
  getFinal: (params) => api.get('/final-evaluation/final-evaluations', { params }),
  getBestEmployee: (periodId) => api.get(`/final-evaluation/best-employee/${periodId}`),
  getLeaderboard: (params) => api.get('/final-evaluation/leaderboard', { params }),
};

export const finalEvaluationAPIAlternative = {
  calculate: (data) => api.post('/final-evaluations/calculate', data),
  getFinal: (params) => api.get('/final-evaluations', { params }),
  getBestEmployee: (periodId) => api.get(`/final-evaluations/best-employee/${periodId}`),
  getLeaderboard: (params) => api.get('/final-evaluations/leaderboard', { params }),
};

// =====================
// REPORTS API
// =====================
export const reportsAPI = {
  getComprehensive: (params = {}) => {
    console.log('📊 Getting comprehensive report data:', params);
    return api.get('/reports/comprehensive', { 
      params,
      timeout: 60000
    });
  },
  getBerakhlak: (params = {}) => {
    console.log('📊 Getting BerAKHLAK report:', params);
    return api.get('/reports/berakhlak', { params });
  },
  getAttendance: (params = {}) => {
    console.log('📊 Getting attendance report:', params);
    return api.get('/reports/attendance', { params });
  },
  getCkp: (params = {}) => {
    console.log('📊 Getting CKP report:', params);
    return api.get('/reports/ckp', { params });
  },
  exportToPDF: (data) => {
    console.log('📄 Exporting report to PDF:', data);
    return api.post('/reports/export/pdf', data, {
      responseType: 'blob',
      timeout: 120000
    });
  }
};

// =====================
// UTILITY FUNCTIONS
// =====================

// CSS fix for cursor pointer issue
export const fixCursorIssue = () => {
  const style = document.createElement('style');
  style.textContent = `
    * {
      cursor: auto !important;
    }
    
    button, .btn, a, [role="button"], input[type="button"], input[type="submit"] {
      cursor: pointer !important;
    }
    
    .table-responsive {
      cursor: auto !important;
    }
    
    .form-control, .form-select, input, textarea, select {
      cursor: text !important;
    }
    
    .disabled, :disabled {
      cursor: not-allowed !important;
    }
    
    .text-muted {
      cursor: auto !important;
    }
  `;
  
  const existingFix = document.getElementById('cursor-fix');
  if (existingFix) {
    existingFix.remove();
  }
  
  style.id = 'cursor-fix';
  document.head.appendChild(style);
  
  console.log('🔧 Applied cursor fix');
};

// Enhanced comprehensive report API call with better error handling
export const getComprehensiveReportWithFix = async (params = {}) => {
  try {
    console.log('📊 Getting comprehensive report with cursor fix:', params);
    
    fixCursorIssue();
    
    const response = await api.get('/reports/comprehensive', { 
      params,
      timeout: 60000,
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

export default api;