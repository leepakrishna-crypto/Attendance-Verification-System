import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';

const AppContext = createContext();

export const useApp = () => useContext(AppContext);

// Configure an Axios instance with base URL and automatic JWT injection
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
export const api = axios.create({
  baseURL: API_URL
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
}, (error) => {
  return Promise.reject(error);
});

export const AppProvider = ({ children }) => {
  // Theme Management
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('theme') || 'light';
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'light' ? 'dark' : 'light'));
  };

  // Toast Notifications Management
  const [toasts, setToasts] = useState([]);

  const showToast = (message, type = 'success') => {
    const id = Date.now() + Math.random().toString(36).substr(2, 9);
    setToasts((prev) => [...prev, { id, message, type }]);
    
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  };

  const removeToast = (id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // Authentication State
  const [token, setToken] = useState(() => localStorage.getItem('token') || '');
  const [user, setUser] = useState(() => {
    const storedUser = localStorage.getItem('user');
    try {
      return storedUser ? JSON.parse(storedUser) : null;
    } catch {
      return null;
    }
  });

  const isAuthenticated = !!token;
  const userRole = user?.role || null;

  const login = async (username, password) => {
    try {
      const response = await api.post('/auth/login', { username, password });
      const { success, token: jwtToken, user: userData, message } = response.data;

      if (success) {
        localStorage.setItem('token', jwtToken);
        localStorage.setItem('user', JSON.stringify(userData));
        
        setToken(jwtToken);
        setUser(userData);
        
        showToast(message || 'Login successful!', 'success');
        return userData.role;
      }
      return null;
    } catch (error) {
      console.error('Login request error:', error);
      const errMsg = error.response?.data?.message || 'Login failed. Please verify credentials.';
      showToast(errMsg, 'error');
      throw error;
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    
    setToken('');
    setUser(null);
    
    showToast('Logged out successfully.', 'info');
  };

  return (
    <AppContext.Provider
      value={{
        theme,
        toggleTheme,
        toasts,
        showToast,
        removeToast,
        token,
        user,
        isAuthenticated,
        userRole,
        login,
        logout,
        API_URL
      }}
    >
      {children}
      
      {/* Toast Overlay UI */}
      <div className="toast-container-custom">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`custom-toast p-3 toast-${toast.type} d-flex justify-content-between align-items-center`}
            style={{ borderLeftWidth: '5px' }}
          >
            <div className="d-flex align-items-center">
              <span className="me-2">
                {toast.type === 'success' && '✅'}
                {toast.type === 'error' && '❌'}
                {toast.type === 'warning' && '⚠️'}
                {toast.type === 'info' && 'ℹ️'}
              </span>
              <span style={{ fontSize: '0.9rem', fontWeight: 500 }}>{toast.message}</span>
            </div>
            <button
              type="button"
              className="btn-close"
              style={{ fontSize: '0.75rem', filter: theme === 'dark' ? 'invert(1)' : 'none' }}
              onClick={() => removeToast(toast.id)}
            ></button>
          </div>
        ))}
      </div>
    </AppContext.Provider>
  );
};
