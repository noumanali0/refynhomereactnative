/**
 * Toast Context Provider
 *
 * Global toast management for the entire app
 * Usage: const { showToast } = useToast();
 */

import React, { createContext, useContext, useState, ReactNode } from 'react';
import Toast, { ToastType } from '@/components/common/Toast';

interface ToastOptions {
  type: ToastType;
  title: string;
  message?: string;
  duration?: number;
}

interface ToastContextType {
  showToast: (options: ToastOptions) => void;
  hideToast: () => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<(ToastOptions & { visible: boolean }) | null>(null);

  const showToast = (options: ToastOptions) => {
    setToast({ ...options, visible: true });
  };

  const hideToast = () => {
    setToast((prev) => (prev ? { ...prev, visible: false } : null));
    // Clear toast state after animation
    setTimeout(() => setToast(null), 300);
  };

  return (
    <ToastContext.Provider value={{ showToast, hideToast }}>
      {children}
      {toast && (
        <Toast
          type={toast.type}
          title={toast.title}
          message={toast.message}
          duration={toast.duration}
          onDismiss={hideToast}
          visible={toast.visible}
        />
      )}
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within ToastProvider');
  }
  return context;
}
