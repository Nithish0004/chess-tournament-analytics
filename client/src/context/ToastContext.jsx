import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { Toast } from '../components/Toast';

const ToastContext = createContext(null);

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback((message, type = 'error') => {
    if (!message) return;
    setToasts((prev) => {
      if (prev.some((t) => t.message === message && t.type === type)) {
        return prev;
      }
      const id = Date.now() + Math.random().toString(36).substring(2, 9);
      setTimeout(() => {
        removeToast(id);
      }, 4500);
      return [...prev, { id, message, type }];
    });
  }, [removeToast]);

  // Listen for global toast events dispatched by axios interceptors (e.g. 403 Forbidden)
  useEffect(() => {
    const handleToastEvent = (e) => {
      if (e.detail?.message) {
        showToast(e.detail.message, e.detail.type || 'error');
      }
    };
    window.addEventListener('app:toast', handleToastEvent);
    return () => window.removeEventListener('app:toast', handleToastEvent);
  }, [showToast]);

  return (
    <ToastContext.Provider value={{ showToast, removeToast }}>
      {children}
      {/* Toast Container */}
      <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2 max-w-md w-full pointer-events-none px-4">
        {toasts.map((toast) => (
          <Toast
            key={toast.id}
            id={toast.id}
            message={toast.message}
            type={toast.type}
            onClose={removeToast}
          />
        ))}
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};
