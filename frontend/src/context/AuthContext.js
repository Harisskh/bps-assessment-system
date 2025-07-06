// src/context/AuthContext.js
import React, { createContext, useContext, useState, useEffect } from 'react';
import { authAPI } from '../services/api';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Check if user is logged in on app start
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      getCurrentUser();
    } else {
      setLoading(false);
    }
  }, []);

  const getCurrentUser = async () => {
    try {
      const response = await authAPI.getCurrentUser();
      if (response.data.success) {
        setUser(response.data.data.user);
      }
    } catch (error) {
      console.error('Get current user error:', error);
      localStorage.removeItem('token');
    } finally {
      setLoading(false);
    }
  };

  const login = async (credentials) => {
    try {
      const response = await authAPI.login(credentials);
      if (response.data.success) {
        const { user, token } = response.data.data;
        localStorage.setItem('token', token);
        setUser(user);
        return { success: true };
      }
    } catch (error) {
      console.error('Login error:', error);
      return { 
        success: false, 
        message: error.response?.data?.message || 'Login gagal' 
      };
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    setUser(null);
  };

  const value = {
    user,
    loading,
    login,
    logout,
    getCurrentUser
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};