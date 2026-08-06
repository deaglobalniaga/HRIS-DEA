import React, { useEffect, useState } from 'react';
import { useToast } from '../context/ToastContext';
import { CheckCircle2, XCircle, X } from 'lucide-react';

const Toast = () => {
  const { toasts, removeToast } = useToast();

  if (toasts.length === 0) return null;

  return (
    <>
      {/* DESKTOP (Filament Style): Top Right Corner */}
      <div className="hidden md:flex fixed top-4 right-4 z-[9999] flex-col gap-2 pointer-events-none">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className="pointer-events-auto bg-white rounded-xl shadow-lg border border-slate-100 p-4 min-w-[320px] max-w-sm flex items-start gap-3 animate-in slide-in-from-right-8 fade-in duration-300"
          >
            {toast.type === 'success' ? (
              <CheckCircle2 className="text-green-500 w-6 h-6 shrink-0" />
            ) : (
              <XCircle className="text-red-500 w-6 h-6 shrink-0" />
            )}
            <div className="flex-1 pt-0.5">
              <p className="text-sm font-semibold text-slate-800">
                {toast.type === 'success' ? 'Berhasil' : 'Peringatan'}
              </p>
              <p className="text-xs text-slate-500 mt-1">{toast.message}</p>
            </div>
            <button
              onClick={() => removeToast(toast.id)}
              className="text-slate-400 hover:text-slate-600 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>

      {/* MOBILE (Dynamic Island Style): Top Center Pill */}
      <div className="flex md:hidden fixed top-4 mt-2 left-0 right-0 z-[9999] flex-col items-center gap-2 pointer-events-none px-4">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            onClick={() => removeToast(toast.id)}
            className={`pointer-events-auto flex items-center justify-center gap-2 px-4 py-2 rounded-full shadow-2xl backdrop-blur-md font-bold text-[13px] tracking-wide animate-in slide-in-from-top-4 fade-in duration-300 ${
              toast.type === 'success'
                ? 'bg-green-600/95 text-white'
                : 'bg-red-600/95 text-white'
            }`}
          >
            {toast.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4" />
            ) : (
              <XCircle className="w-4 h-4" />
            )}
            {toast.message}
          </div>
        ))}
      </div>
    </>
  );
};

export default Toast;
