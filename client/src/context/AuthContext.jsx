import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { loginApi, getMeApi } from '../api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [token, setToken] = useState(() => localStorage.getItem('chess_token') || null);
  const [user, setUser] = useState(() => {
    try {
      const savedUser = localStorage.getItem('chess_user');
      return savedUser ? JSON.parse(savedUser) : null;
    } catch {
      return null;
    }
  });

  const logout = useCallback(() => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('chess_token');
    localStorage.removeItem('chess_user');
  }, []);

  const refreshUser = useCallback(async () => {
    const activeToken = localStorage.getItem('chess_token');
    if (!activeToken) return;
    try {
      const data = await getMeApi();
      if (data?.user) {
        setUser(data.user);
        localStorage.setItem('chess_user', JSON.stringify(data.user));
      }
    } catch (err) {
      if (err.response?.status === 401 || err.response?.status === 403) {
        logout();
      }
    }
  }, [logout]);

  useEffect(() => {
    if (token) {
      refreshUser();
    }
  }, [token, refreshUser]);

  const login = async (emailOrUsername, password) => {
    const data = await loginApi(emailOrUsername, password);
    setToken(data.token);
    setUser(data.user);
    localStorage.setItem('chess_token', data.token);
    localStorage.setItem('chess_user', JSON.stringify(data.user));
    return data;
  };

  return (
    <AuthContext.Provider value={{ token, user, isLoggedIn: !!token, login, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
