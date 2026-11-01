'use client';

import React, { createContext, useContext, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';
import { triggerHaptic } from '@/storage/haptics';

interface ToastItem {
  id: string;
  type: 'success' | 'error' | 'info';
  message: string;
}

interface ConfirmState {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  isDestructive?: boolean;
  onConfirm: () => void;
  onCancel?: () => void;
}

interface ToastContextValue {
  showToast: (message: string, type?: 'success' | 'error' | 'info') => void;
  showConfirm: (opts: {
    title: string;
    message: string;
    confirmLabel?: string;
    cancelLabel?: string;
    isDestructive?: boolean;
    onConfirm: () => void;
  }) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

let globalShowToast: ((msg: string, type?: 'success' | 'error' | 'info') => void) | null = null;
let globalShowConfirm: ((opts: ConfirmState) => void) | null = null;

export const toast = {
  success: (msg: string) => globalShowToast?.(msg, 'success'),
  error: (msg: string) => globalShowToast?.(msg, 'error'),
  info: (msg: string) => globalShowToast?.(msg, 'info'),
};

export const promptConfirm = (opts: {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  isDestructive?: boolean;
  onConfirm: () => void;
}) => {
  globalShowConfirm?.(opts);
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [confirmModal, setConfirmModal] = useState<ConfirmState | null>(null);

  const showToast = useCallback((message: string, type: 'success' | 'error' | 'info' = 'info') => {
    const id = Math.random().toString(36).slice(2, 9);
    setToasts((prev) => [...prev, { id, type, message }]);
    if (type === 'error') {
      triggerHaptic('error');
    } else {
      triggerHaptic('light');
    }
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3800);
  }, []);

  const showConfirm = useCallback((opts: ConfirmState) => {
    triggerHaptic('medium');
    setConfirmModal(opts);
  }, []);

  globalShowToast = showToast;
  globalShowConfirm = showConfirm;

  return (
    <ToastContext.Provider value={{ showToast, showConfirm }}>
      {children}

      {/* Floating Toasts */}
      <div className="fixed top-4 right-4 left-4 sm:left-auto sm:w-96 z-50 pointer-events-none flex flex-col gap-2 pt-safe">
        <AnimatePresence>
          {toasts.map((t) => (
            <motion.div
              key={t.id}
              initial={{ opacity: 0, y: -12, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className={`pointer-events-auto p-3.5 rounded-2xl glass-dock flex items-center gap-3 border shadow-2xl ${
                t.type === 'success'
                  ? 'border-emerald-500/30 text-emerald-300'
                  : t.type === 'error'
                  ? 'border-rose-500/30 text-rose-300'
                  : 'border-cyan-500/30 text-cyan-300'
              }`}
            >
              {t.type === 'success' && <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />}
              {t.type === 'error' && <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />}
              {t.type === 'info' && <Info className="w-4 h-4 shrink-0 text-cyan-400" />}
              <span className="text-xs font-semibold text-slate-100 flex-1 leading-snug">
                {t.message}
              </span>
              <button
                onClick={() => setToasts((prev) => prev.filter((item) => item.id !== t.id))}
                className="text-slate-400 hover:text-white p-1"
                aria-label="Dismiss notification"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* In-Page Confirmation Dialog */}
      <AnimatePresence>
        {confirmModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-sm rounded-3xl bg-[#12121C] border border-[#26263A] p-6 shadow-2xl space-y-4"
            >
              <h3 className="text-base font-bold text-white tracking-tight">
                {confirmModal.title}
              </h3>
              <p className="text-xs text-[#8D8DA8] leading-relaxed">
                {confirmModal.message}
              </p>
              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    confirmModal.onCancel?.();
                    setConfirmModal(null);
                  }}
                  className="px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-semibold text-slate-300 transition-colors touch-target"
                >
                  {confirmModal.cancelLabel || 'Cancel'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    confirmModal.onConfirm();
                    setConfirmModal(null);
                  }}
                  className={`px-4 py-2.5 rounded-xl text-xs font-bold text-white transition-colors touch-target ${
                    confirmModal.isDestructive
                      ? 'bg-rose-600 hover:bg-rose-500'
                      : 'brand-gradient shadow-lg shadow-violet-500/20'
                  }`}
                >
                  {confirmModal.confirmLabel || 'Confirm'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </ToastContext.Provider>
  );
}

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};
