import React, { createContext, useContext, useState, useCallback } from 'react';
import { CheckCircle2, AlertCircle, Info, AlertTriangle, X } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface Toast {
  id: string;
  type: ToastType;
  title?: string;
  message: string;
  duration?: number;
}

interface ToastContextType {
  toast: (options: { type?: ToastType; title?: string; message: string; duration?: number }) => void;
  showToast: (message: string, type?: ToastType) => void;
  success: (message: string, title?: string) => void;
  error: (message: string, title?: string) => void;
  info: (message: string, title?: string) => void;
  warning: (message: string, title?: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const addToast = useCallback(
    ({
      type = 'info',
      title,
      message,
      duration = 4000
    }: {
      type?: ToastType;
      title?: string;
      message: string;
      duration?: number;
    }) => {
      const id = `${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
      const newToast: Toast = { id, type, title, message, duration };

      setToasts(prev => [...prev.slice(-4), newToast]);

      if (duration > 0) {
        setTimeout(() => {
          removeToast(id);
        }, duration);
      }
    },
    [removeToast]
  );

  const success = useCallback((message: string, title?: string) => addToast({ type: 'success', title: title || 'Success', message }), [addToast]);
  const error = useCallback((message: string, title?: string) => addToast({ type: 'error', title: title || 'Error', message, duration: 5500 }), [addToast]);
  const info = useCallback((message: string, title?: string) => addToast({ type: 'info', title: title || 'Information', message }), [addToast]);
  const warning = useCallback((message: string, title?: string) => addToast({ type: 'warning', title: title || 'Warning', message, duration: 5000 }), [addToast]);
  const showToast = useCallback((message: string, type: ToastType = 'info') => addToast({ type, message }), [addToast]);

  return (
    <ToastContext.Provider value={{ toast: addToast, showToast, success, error, info, warning }}>
      {children}

      {/* Floating Toasts Stack */}
      <div className="fixed bottom-5 right-5 z-[9999] flex flex-col gap-2.5 max-w-sm w-full pointer-events-none px-4 sm:px-0">
        {toasts.map(t => {
          const isSuccess = t.type === 'success';
          const isError = t.type === 'error';
          const isWarning = t.type === 'warning';

          return (
            <div
              key={t.id}
              className={`pointer-events-auto p-4 rounded-2xl backdrop-blur-xl border shadow-2xl transition-all duration-300 transform translate-y-0 animate-in fade-in slide-in-from-bottom-3 flex items-start gap-3.5 ${
                isSuccess
                  ? 'bg-slate-900/95 border-emerald-500/30 text-white shadow-emerald-950/40'
                  : isError
                  ? 'bg-slate-900/95 border-rose-500/30 text-white shadow-rose-950/40'
                  : isWarning
                  ? 'bg-slate-900/95 border-amber-500/30 text-white shadow-amber-950/40'
                  : 'bg-slate-900/95 border-blue-500/30 text-white shadow-blue-950/40'
              }`}
            >
              <div
                className={`w-7 h-7 rounded-xl flex items-center justify-center shrink-0 border ${
                  isSuccess
                    ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                    : isError
                    ? 'bg-rose-500/20 text-rose-400 border-rose-500/30'
                    : isWarning
                    ? 'bg-amber-500/20 text-amber-400 border-amber-500/30'
                    : 'bg-blue-500/20 text-blue-400 border-blue-500/30'
                }`}
              >
                {isSuccess && <CheckCircle2 className="w-4 h-4" />}
                {isError && <AlertCircle className="w-4 h-4" />}
                {isWarning && <AlertTriangle className="w-4 h-4" />}
                {!isSuccess && !isError && !isWarning && <Info className="w-4 h-4" />}
              </div>

              <div className="flex-1 min-w-0">
                {t.title && <h4 className="text-xs font-bold text-white mb-0.5">{t.title}</h4>}
                <p className="text-xs text-slate-300 leading-relaxed font-medium break-words">{t.message}</p>
              </div>

              <button
                type="button"
                onClick={() => removeToast(t.id)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/10 transition shrink-0"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}
