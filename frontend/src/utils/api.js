// frontend/src/utils/api.js - PRODUCTION READY
import axios from 'axios';

// Environment-based API URL
const getApiUrl = () => {
  // Check if running in development
  if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    return 'http://localhost:5000/api';
  }
  
  // Production URL
  return 'https://siapik1810.web.bps.go.id/api';
};

const API_BASE_URL = getApiUrl();

console.log('🌐 API Base URL:', API_BASE_URL);

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 120000, // 2 minutes timeout
  headers: {
    'Content-Type': 'application/json',
  },
  // Add retry configuration
  retry: 3,
  retryDelay: 2000,
});

// Request interceptor
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    // Log request in development only
    if (process.env.NODE_ENV === 'development') {
      console.log(`🚀 API Request: ${config.method?.toUpperCase()} ${config.url}`);
    }
    
    return config;
  },
  (error) => {
    console.error('❌ Request Error:', error);
    return Promise.reject(error);
  }
);

// Response interceptor dengan retry logic
apiClient.interceptors.response.use(
  (response) => {
    if (process.env.NODE_ENV === 'development') {
      console.log(`✅ API Response: ${response.config.url} - ${response.status}`);
    }
    return response;
  },
  async (error) => {
    const originalRequest = error.config;
    
    console.error('❌ API Error:', {
      url: error.config?.url,
      method: error.config?.method,
      status: error.response?.status,
      message: error.message,
      code: error.code
    });

    // Retry logic untuk network errors
    if (
      (error.code === 'ECONNABORTED' || error.code === 'NETWORK_ERROR' || !error.response) &&
      originalRequest &&
      !originalRequest._retry &&
      originalRequest._retryCount < 3
    ) {
      originalRequest._retry = true;
      originalRequest._retryCount = (originalRequest._retryCount || 0) + 1;
      
      console.log(`🔄 Retrying request (${originalRequest._retryCount}/3): ${originalRequest.url}`);
      
      // Wait before retry dengan exponential backoff
      const delay = Math.pow(2, originalRequest._retryCount) * 1000;
      await new Promise(resolve => setTimeout(resolve, delay));
      
      return apiClient(originalRequest);
    }

    // Handle specific errors
    if (error.code === 'ECONNABORTED') {
      return Promise.reject({
        message: 'Server membutuhkan waktu lama untuk merespons. Silakan coba lagi.',
        type: 'TIMEOUT',
        status: 'timeout'
      });
    }

    if (error.code === 'NETWORK_ERROR' || !error.response) {
      return Promise.reject({
        message: 'Tidak dapat terhubung ke server. Periksa koneksi internet Anda.',
        type: 'NETWORK',
        status: 'network_error'
      });
    }

    if (error.response?.status === 401) {
      // Clear auth data dan redirect ke login
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      
      // Jangan redirect jika sudah di halaman login
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
      
      return Promise.reject({
        message: 'Sesi telah berakhir. Silakan login kembali.',
        type: 'AUTH',
        status: 401
      });
    }

    if (error.response?.status >= 500) {
      return Promise.reject({
        message: 'Terjadi kesalahan server. Tim IT sedang menangani masalah ini.',
        type: 'SERVER_ERROR',
        status: error.response.status
      });
    }

    // Return original error untuk status codes lainnya
    return Promise.reject(error.response?.data || {
      message: error.message || 'Terjadi kesalahan yang tidak diketahui',
      type: 'UNKNOWN',
      status: error.response?.status || 'unknown'
    });
  }
);

// Utility function untuk handle API calls dengan loading state
export const makeApiCall = async (apiCall, setLoading, setError) => {
  try {
    setLoading(true);
    setError(null);
    
    const response = await apiCall();
    return response.data;
    
  } catch (error) {
    const errorMessage = error.message || 'Terjadi kesalahan. Silakan coba lagi.';
    setError(errorMessage);
    throw error;
    
  } finally {
    setLoading(false);
  }
};

export default apiClient;