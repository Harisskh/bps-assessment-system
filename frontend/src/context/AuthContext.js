// src/context/AuthContext.js - FIXED VERSION WITH BETTER EVENT HANDLING
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
      console.log('🔄 AuthContext - Getting current user...');
      const response = await authAPI.getCurrentUser();
      
      if (response.data.success) {
        const userData = response.data.data.user;
        console.log('✅ AuthContext - User data received:', userData.nama);
        console.log('📸 AuthContext - Profile picture path:', userData.profilePicture);
        setUser(userData);
        return userData;
      }
    } catch (error) {
      console.error('❌ AuthContext - Get current user error:', error);
      localStorage.removeItem('token');
      setUser(null);
      return null;
    } finally {
      setLoading(false);
    }
  };

  const login = async (credentials) => {
    try {
      console.log('🔐 AuthContext - Attempting login...');
      const response = await authAPI.login(credentials);
      
      if (response.data.success) {
        const { user, token } = response.data.data;
        localStorage.setItem('token', token);
        console.log('✅ AuthContext - Login successful for:', user.nama);
        setUser(user);
        return { success: true };
      }
    } catch (error) {
      console.error('❌ AuthContext - Login error:', error);
      return { 
        success: false, 
        message: error.response?.data?.message || 'Login gagal' 
      };
    }
  };

  const logout = () => {
    console.log('👋 AuthContext - Logging out...');
    localStorage.removeItem('token');
    setUser(null);
    window.location.href = '/login';
  };

  // 🔥 FIXED: Enhanced updateUser function with event dispatch
  const updateUser = (updatedUserData) => {
    console.log('🔄 AuthContext - Updating user data...');
    console.log('📸 AuthContext - New profile picture:', updatedUserData.profilePicture);
    
    setUser(prevUser => {
      const newUser = {
        ...prevUser,
        ...updatedUserData
      };
      
      console.log('✅ AuthContext - User updated successfully');
      
      // 🔥 DISPATCH EVENT for UI components to listen
      setTimeout(() => {
        console.log('📡 AuthContext - Dispatching userUpdated event');
        window.dispatchEvent(new CustomEvent('userUpdated', { 
          detail: newUser 
        }));
      }, 100);
      
      return newUser;
    });
  };

  // 🔥 FIXED: Enhanced refreshUser function with better event handling
  const refreshUser = async () => {
    try {
      console.log('🔄 AuthContext - Refreshing user data...');
      setLoading(true);
      const userData = await getCurrentUser();
      
      if (userData) {
        console.log('✅ AuthContext - User refreshed successfully');
        
        // 🔥 DISPATCH REFRESH EVENT
        setTimeout(() => {
          console.log('📡 AuthContext - Dispatching userRefreshed event');
          window.dispatchEvent(new CustomEvent('userRefreshed', { 
            detail: userData 
          }));
        }, 100);
        
        return userData;
      } else {
        throw new Error('Failed to refresh user data');
      }
    } catch (error) {
      console.error('❌ AuthContext - Refresh failed:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const value = {
    user,
    loading,
    login,
    logout,
    getCurrentUser,
    updateUser,
    refreshUser
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};