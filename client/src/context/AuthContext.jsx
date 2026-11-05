import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { loginApi, getMeApi } from '../api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [token, setToken] = useState(() => localStorage.getItem('chess_token') || sessionStorage.getItem('chess_token') || null);
  const [user, setUser] = useState(() => {
    try {
      const savedUser = localStorage.getItem('chess_user') || sessionStorage.getItem('chess_user');
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
    sessionStorage.removeItem('chess_token');
    sessionStorage.removeItem('chess_user');
  }, []);

  const refreshUser = useCallback(async () => {
    const activeToken = localStorage.getItem('chess_token') || sessionStorage.getItem('chess_token');
    if (!activeToken) return;
    try {
      const data = await getMeApi();
      const userData = data?.user || (data?.user_id ? data : null);
      if (userData) {
        setUser(userData);
        if (localStorage.getItem('chess_token')) {
          localStorage.setItem('chess_user', JSON.stringify(userData));
        } else {
          sessionStorage.setItem('chess_user', JSON.stringify(userData));
        }
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

  const setAuthSession = useCallback((newToken, newUser, rememberMe = true) => {
    setToken(newToken);
    setUser(newUser);
    localStorage.removeItem('chess_token');
    localStorage.removeItem('chess_user');
    sessionStorage.removeItem('chess_token');
    sessionStorage.removeItem('chess_user');

    const storage = rememberMe ? localStorage : sessionStorage;
    if (newToken) {
      storage.setItem('chess_token', newToken);
    }
    if (newUser) {
      storage.setItem('chess_user', JSON.stringify(newUser));
    }
  }, []);

  const login = async (emailOrUsername, password, rememberMe = false) => {
    const data = await loginApi(emailOrUsername, password, rememberMe);
    const resolvedUser = data.user || {
      user_id: data.user_id,
      email: data.email,
      username: data.username,
      full_name: data.full_name,
      role: data.role,
      status: data.status,
      approval_status: data.approval_status,
      approval_note: data.approval_note,
      permissions: data.permissions
    };
    setAuthSession(data.token, resolvedUser, rememberMe);
    if (rememberMe) {
      localStorage.setItem('chess_remembered_identifier', emailOrUsername);
    } else {
      localStorage.removeItem('chess_remembered_identifier');
    }
    return data;
  };

  return (
    <AuthContext.Provider
      value={{
        token,
        user,
        isLoggedIn: !!token,
        login,
        logout,
        refreshUser,
        setAuthSession
      }}
    >
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
