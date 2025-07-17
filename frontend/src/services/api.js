// src/services/api.js - FIXED PROFILE API
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

// 🔥 FIXED: Helper function untuk construct image URL dengan benar
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
// PROFILE API - FIXED VERSION
// =====================
export const profileAPI = {
  getProfile: () => api.get('/profile'),
  updateProfile: (formData) => {
    // 🔥 FIXED: Proper FormData handling
    console.log('📤 Sending profile update with FormData');
    
    return api.put('/profile', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      // Add timeout for file uploads
      timeout: 60000, // 60 seconds for file uploads
    });
  },
  deleteProfilePicture: () => api.delete('/profile/picture'),
};

// =====================
// USER API
// =====================
export const userAPI = {
  getAll: (params) => api.get('/users', { params }),
  getById: (id) => api.get(`/users/${id}`),
  create: (userData) => {
    console.log('📤 Creating user via /users endpoint:', userData);
    return api.post('/users', userData);  // 🔥 FIXED: Use /users endpoint instead of auth/register
  },
  update: (id, userData) => api.put(`/users/${id}`, userData),
  delete: (id) => api.delete(`/users/${id}`),
  permanentDelete: (id) => api.delete(`/users/${id}/permanent`),
  activate: (id) => api.put(`/users/${id}/activate`),
  resetPassword: (id, data) => api.put(`/users/${id}/reset-password`, data),
  getStats: () => api.get('/users/stats'),
};

// =====================
// 🔥 FIXED: EVALUATION API
// =====================
export const evaluationAPI = {
  // GET evaluation parameters (8 BerAKHLAK parameters)
  getParameters: () => {
    console.log('🔄 Getting evaluation parameters...');
    return api.get('/evaluations/parameters');
  },
  
  // GET score ranges (80-100 for single category)
  getScoreRanges: () => {
    console.log('🔄 Getting score ranges...');
    return api.get('/evaluations/score-ranges');
  },
  
  // GET active period
  getActivePeriod: () => {
    console.log('🔄 Getting active period...');
    return api.get('/evaluations/active-period');
  },
  
  // GET eligible users for evaluation
  getEligibleUsers: () => {
    console.log('🔄 Getting eligible users...');
    return api.get('/evaluations/eligible-users');
  },
  
  // 🔥 FIXED: Submit evaluation with proper data structure
  submit: (data) => {
    console.log('📤 Submitting evaluation:', data);
    
    // Validate data structure
    if (!data.periodId || !data.evaluations || !Array.isArray(data.evaluations)) {
      console.error('❌ Invalid evaluation data structure');
      return Promise.reject(new Error('Invalid evaluation data structure'));
    }
    
    // Transform data for backend compatibility
    const evaluation = data.evaluations[0]; // Single evaluation now
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
  
  // GET user's own evaluations
  getMyEvaluations: (params = {}) => {
    console.log('🔄 Getting my evaluations:', params);
    return api.get('/evaluations/my-evaluations', { params });
  },
  
  // GET all evaluations (admin/pimpinan only)
  getAll: (params = {}) => {
    console.log('🔄 Getting all evaluations:', params);
    return api.get('/evaluations/all', { params });
  },
  
  // GET evaluation summary for period
  getSummary: (periodId) => {
    console.log('🔄 Getting evaluation summary for period:', periodId);
    return api.get(`/evaluations/summary/${periodId}`);
  },
};

// =====================
// 🔥 FIXED: ATTENDANCE API
// =====================
export const attendanceAPI = {
  // GET all attendance records
  getAll: (params = {}) => {
    console.log('🔄 Getting attendance records:', params);
    return api.get('/attendance', { params });
  },
  
  // GET attendance by ID
  getById: (id) => {
    console.log('🔄 Getting attendance by ID:', id);
    return api.get(`/attendance/${id}`);
  },
  
  // 🔥 FIXED: Create/Update attendance (upsert)
  upsert: (data) => {
    console.log('💾 Upserting attendance:', data);
    
    // Validate required fields
    if (!data.userId || !data.periodId) {
      console.error('❌ Missing required fields: userId, periodId');
      return Promise.reject(new Error('Missing required fields: userId, periodId'));
    }
    
    // Ensure numeric fields are numbers
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
  
  // DELETE attendance
  delete: (id) => {
    console.log('🗑️ Deleting attendance:', id);
    return api.delete(`/attendance/${id}`);
  },
  
  // GET attendance statistics
  getStats: (params = {}) => {
    console.log('📊 Getting attendance stats:', params);
    return api.get('/attendance/stats', { params });
  },
};

// =====================
// 🔥 FIXED: CKP API
// =====================
export const ckpAPI = {
  // GET all CKP scores
  getAll: (params = {}) => {
    console.log('🔄 Getting CKP scores:', params);
    return api.get('/ckp', { params });
  },
  
  // GET CKP by ID
  getById: (id) => {
    console.log('🔄 Getting CKP by ID:', id);
    return api.get(`/ckp/${id}`);
  },
  
  // Create/Update CKP score
  upsert: (data) => {
    console.log('💾 Upserting CKP:', data);
    
    // Validate required fields
    if (!data.userId || !data.periodId || typeof data.score !== 'number') {
      console.error('❌ Missing required fields: userId, periodId, score');
      return Promise.reject(new Error('Missing required fields: userId, periodId, score'));
    }
    
    // Validate score range
    if (data.score < 0 || data.score > 100) {
      console.error('❌ Score must be between 0-100');
      return Promise.reject(new Error('Score must be between 0-100'));
    }
    
    return api.post('/ckp', data);
  },
  
  // DELETE CKP score
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

  // Smart method to get all periods for any user role
  getAllSmart: async (params = {}) => {
    try {
      // Try the staff endpoint first (if backend is updated)
      try {
        return await api.get('/periods/staff/all', { params });
      } catch (staffError) {
        console.log('Staff endpoint not available, trying main endpoint...');
      }
      
      // Try main periods endpoint
      try {
        return await api.get('/periods', { params });
      } catch (mainError) {
        console.log('Main periods endpoint not accessible, using active only...');
      }
      
      // Fallback to active period only
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

  // 🔥 NEW: Search period by year and month
getByYearMonth: (tahun, bulan) => {
  console.log('🔄 Getting period by year month:', tahun, bulan);
  return api.get('/periods/search', { params: { tahun, bulan, limit: 1 } });
},

// 🔥 NEW: Get previous period from active period
getPrevious: () => {
  console.log('🔄 Getting previous period from active...');
  return api.get('/periods/previous');
},
  
  // Get comprehensive periods from multiple sources
  getComprehensivePeriods: async () => {
    try {
      const allPeriods = new Map();
      
      // Method 1: Try to get all periods
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
      
      // Method 2: Get active period
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
      
      // Method 3: Extract periods from evaluations
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
      
      // Method 4: Generate comprehensive period list
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
  
  // Map existing periods by year-month key
  existingPeriods.forEach(period => {
    const key = `${period.tahun}-${period.bulan}`;
    existingPeriodsMap.set(key, period);
  });
  
  // Generate periods for current year and previous 2 years
  const yearsToGenerate = [currentYear - 2, currentYear - 1, currentYear];
  
  yearsToGenerate.forEach(year => {
    for (let month = 1; month <= 12; month++) {
      // Skip future months for current year
      if (year === currentYear && month > currentMonth) {
        continue;
      }
      
      const key = `${year}-${month}`;
      const monthName = getMonthName(month);
      const periodName = `${monthName} ${year}`;
      
      if (existingPeriodsMap.has(key)) {
        // Use existing period data
        const existingPeriod = existingPeriodsMap.get(key);
        allPeriods.push({
          ...existingPeriod,
          hasEvaluations: true,
          isReal: true
        });
      } else {
        // Create placeholder period
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
  
  // Sort periods (active first, then by year and month desc)
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

// Alternative endpoints that might be needed
export const finalEvaluationAPIAlternative = {
  // If the backend uses different route patterns
  calculate: (data) => api.post('/final-evaluations/calculate', data),
  getFinal: (params) => api.get('/final-evaluations', { params }),
  getBestEmployee: (periodId) => api.get(`/final-evaluations/best-employee/${periodId}`),
  getLeaderboard: (params) => api.get('/final-evaluations/leaderboard', { params }),
};

// =====================
// 🔥 NEW: REPORTS API
// =====================
export const reportsAPI = {
  // Get comprehensive report data (all-in-one)
  getComprehensive: (params = {}) => {
    console.log('📊 Getting comprehensive report data:', params);
    return api.get('/reports/comprehensive', { params });
  },
  
  // Get BerAKHLAK report only
  getBerakhlak: (params = {}) => {
    console.log('📊 Getting BerAKHLAK report:', params);
    return api.get('/reports/berakhlak', { params });
  },
  
  // Get attendance report only
  getAttendance: (params = {}) => {
    console.log('📊 Getting attendance report:', params);
    return api.get('/reports/attendance', { params });
  },
  
  // Get CKP report only
  getCkp: (params = {}) => {
    console.log('📊 Getting CKP report:', params);
    return api.get('/reports/ckp', { params });
  },
  
  // Export report to PDF
  exportToPDF: (data) => {
    console.log('📄 Exporting report to PDF:', data);
    return api.post('/reports/export/pdf', data, {
      responseType: 'blob', // Important for file downloads
      timeout: 120000 // 2 minutes for PDF generation
    });
  }
};

export default api;