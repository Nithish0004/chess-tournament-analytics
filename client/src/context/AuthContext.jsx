import React, { createContext, useContext, useState, useEffect } from 'react';
import { loginApi } from '../api';

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

  const login = async (username, password) => {
    const data = await loginApi(username, password);
    setToken(data.token);
    setUser(data.user);
    localStorage.setItem('chess_token', data.token);
    localStorage.setItem('chess_user', JSON.stringify(data.user));
    return data;
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('chess_token');
    localStorage.removeItem('chess_user');
  };

  return (
    <AuthContext.Provider value={{ token, user, isLoggedIn: !!token, login, logout }}>
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
