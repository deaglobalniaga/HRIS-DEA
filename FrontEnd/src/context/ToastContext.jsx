import React, { createContext, useContext, useState, useCallback } from 'react';

const ToastContext = createContext(null);

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback((message, type = 'success', duration = 3000) => {
    let cleanMessage = '';
    if (typeof message === 'string') {
      cleanMessage = message;
    } else if (message && typeof message === 'object') {
      cleanMessage = message.error || message.message || JSON.stringify(message);
    } else {
      cleanMessage = String(message || '');
    }
    const id = Date.now().toString() + Math.random().toString(36).substring(7);
    setToasts(prev => [...prev, { id, message: cleanMessage, type }]);
    
    if (duration > 0) {
      setTimeout(() => {
        setToasts(prev => prev.filter(t => t.id !== id));
      }, duration);
    }
  }, []);

  const removeToast = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ addToast, removeToast, toasts }}>
      {children}
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) throw new Error('useToast must be used within ToastProvider');
  return context;
};
