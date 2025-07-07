// src/services/api.js - FIXED VERSION WITH PERMANENT DELETE
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

// Request interceptor
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    console.log(`🚀 API Request: ${config.method?.toUpperCase()} ${config.url}`, {
      headers: config.headers,
      data: config.data
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
      data: response.data
    });
    return response;
  },
  (error) => {
    console.error(`❌ API Error: ${error.config?.method?.toUpperCase()} ${error.config?.url}`, {
      status: error.response?.status,
      message: error.response?.data?.message,
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
// AUTH API - FIXED: Added register function
// =====================
export const authAPI = {
  login: (credentials) => api.post('/auth/login', credentials),
  register: (userData) => api.post('/auth/register', userData), // FIXED: Added register function
  getCurrentUser: () => api.get('/auth/me'),
  changePassword: (data) => api.put('/auth/change-password', data),
  logout: () => api.post('/auth/logout'),
};

// =====================
// USER API - FIXED: Added permanent delete
// =====================
export const userAPI = {
  getAll: (params) => api.get('/users', { params }),
  getById: (id) => api.get(`/users/${id}`),
  update: (id, data) => api.put(`/users/${id}`, data),
  delete: (id) => api.delete(`/users/${id}`), // Soft delete (deactivate)
  permanentDelete: (id) => api.delete(`/users/${id}/permanent`), // FIXED: Permanent delete
  activate: (id) => api.put(`/users/${id}/activate`),
  resetPassword: (id, data) => api.put(`/users/${id}/reset-password`, data),
  getStats: () => api.get('/users/stats'),
};

// =====================
// EVALUATION API
// =====================
export const evaluationAPI = {
  getParameters: () => api.get('/evaluations/parameters'),
  getScoreRanges: () => api.get('/evaluations/score-ranges'),
  getActivePeriod: () => api.get('/evaluations/active-period'),
  getEligibleUsers: () => api.get('/evaluations/eligible-users'),
  submit: (data) => api.post('/evaluations/submit', data),
  getMyEvaluations: (params) => api.get('/evaluations/my-evaluations', { params }),
  getAll: (params) => api.get('/evaluations/all', { params }),
  getSummary: (periodId) => api.get(`/evaluations/summary/${periodId}`),
};

// =====================
// ATTENDANCE API
// =====================
export const attendanceAPI = {
  getAll: (params) => api.get('/attendance/attendance', { params }),
  getById: (id) => api.get(`/attendance/attendance/${id}`),
  upsert: (data) => api.post('/attendance/attendance', data),
  delete: (id) => api.delete(`/attendance/attendance/${id}`),
  getStats: (params) => api.get('/attendance/stats', { params }),
};

// =====================
// CKP API
// =====================
export const ckpAPI = {
  getAll: (params) => api.get('/attendance/ckp', { params }),
  getById: (id) => api.get(`/attendance/ckp/${id}`),
  upsert: (data) => api.post('/attendance/ckp', data),
  delete: (id) => api.delete(`/attendance/ckp/${id}`),
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

export default api;