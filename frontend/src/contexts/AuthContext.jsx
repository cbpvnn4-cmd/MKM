import React, { createContext, useState, useContext, useEffect } from 'react';
import { getCurrentUser, login as loginApi, logout as logoutApi } from '../services/api';

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
  const [error, setError] = useState(null);

  useEffect(() => {
    const checkAuthStatus = async () => {
      const persistentToken = localStorage.getItem('access_token');
      const sessionToken = sessionStorage.getItem('access_token');
      const token = persistentToken || sessionToken;

      if (token) {
        const tokenExpiry = localStorage.getItem('token_expiry');
        if (tokenExpiry && new Date(tokenExpiry) <= new Date()) {
          localStorage.removeItem('access_token');
          localStorage.removeItem('token_expiry');
          sessionStorage.removeItem('access_token');
          setLoading(false);
          return;
        }

        try {
          const userData = await getCurrentUser();
          setUser(userData);
        } catch (err) {
          // Token invalid -> clear and continue unauthenticated
          localStorage.removeItem('access_token');
          localStorage.removeItem('token_expiry');
          sessionStorage.removeItem('access_token');
        }
      }
      setLoading(false);
    };

    checkAuthStatus();
  }, []);

  const login = async (username, password, rememberDays = null) => {
    try {
      setLoading(true);
      setError(null);

      const data = await loginApi(username, password, rememberDays);

      if (rememberDays) {
        localStorage.setItem('access_token', data.access_token);
        const expiryDate = new Date();
        expiryDate.setDate(expiryDate.getDate() + rememberDays);
        localStorage.setItem('token_expiry', expiryDate.toISOString());
        localStorage.setItem('remember_duration', String(rememberDays));
      } else {
        sessionStorage.setItem('access_token', data.access_token);
        localStorage.removeItem('access_token');
        localStorage.removeItem('token_expiry');
        localStorage.removeItem('remember_duration');
      }

      const userData = await getCurrentUser();
      setUser(userData);
      return { success: true };
    } catch (err) {
            const backendMessage = err?.response?.data?.detail;
      let localizedMessage = backendMessage;

      if (!localizedMessage) {
        localizedMessage = 'تعذر تسجيل الدخول الآن. يرجى المحاولة لاحقاً أو التواصل مع الدعم.';
      } else if (backendMessage === 'Incorrect username or password') {
        localizedMessage = '\u0627\u0633\u0645 \u0627\u0644\u0645\u0633\u062A\u062E\u062F\u0645 \u0623\u0648 \u0643\u0644\u0645\u0629 \u0627\u0644\u0645\u0631\u0648\u0631 \u063A\u064A\u0631 \u0635\u062D\u064A\u062D\u0629';
      }

      setError(localizedMessage);

      return { success: false, error: localizedMessage };
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      await logoutApi();
    } catch (err) {
      console.error('Logout error:', err);
    } finally {
      localStorage.removeItem('access_token');
      localStorage.removeItem('token_expiry');
      localStorage.removeItem('remember_duration');
      sessionStorage.removeItem('access_token');
      setUser(null);
    }
  };

  const isRemembered = () => {
    return Boolean(localStorage.getItem('access_token') && localStorage.getItem('token_expiry'));
  };

  const getRemainingRememberTime = () => {
    const expiry = localStorage.getItem('token_expiry');
    if (!expiry) return null;
    const expiryDate = new Date(expiry);
    const now = new Date();
    const diffTime = expiryDate - now;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays > 0 ? diffDays : 0;
  };

  const value = {
    user,
    login,
    logout,
    loading,
    error,
    isAuthenticated: !!user,
    isRemembered,
    getRemainingRememberTime,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

