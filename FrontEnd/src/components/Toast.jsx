import React from 'react';
import { useToast } from '../context/ToastContext';
import { CheckCircle2, XCircle, AlertTriangle, Info, X } from 'lucide-react';

const Toast = () => {
  const { toasts, removeToast } = useToast();

  if (!toasts || toasts.length === 0) return null;

  return (
    <div className="fixed top-5 right-4 sm:right-6 z-[9999] flex flex-col items-end gap-2.5 pointer-events-none max-w-sm w-[calc(100%-2rem)] sm:w-auto">
      {toasts.map((toast) => {
        const isSuccess = toast.type === 'success';
        const isError = toast.type === 'error';
        const isWarning = toast.type === 'warning';

        return (
          <div
            key={toast.id}
            className="pointer-events-auto w-full sm:min-w-[320px] bg-white/95 backdrop-blur-md rounded-2xl shadow-xl shadow-slate-900/10 border border-slate-200/80 p-3.5 flex items-start gap-3 animate-in slide-in-from-right-8 fade-in duration-300 transition-all hover:shadow-2xl"
          >
            {/* Left Accent Icon */}
            <div className="shrink-0 pt-0.5">
              {isSuccess && (
                <div className="w-7 h-7 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <CheckCircle2 size={18} />
                </div>
              )}
              {isError && (
                <div className="w-7 h-7 rounded-xl bg-red-50 text-red-600 flex items-center justify-center">
                  <XCircle size={18} />
                </div>
              )}
              {isWarning && (
                <div className="w-7 h-7 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                  <AlertTriangle size={18} />
                </div>
              )}
              {!isSuccess && !isError && !isWarning && (
                <div className="w-7 h-7 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                  <Info size={18} />
                </div>
              )}
            </div>

            {/* Message Body */}
            <div className="flex-1 min-w-0 pr-1">
              <p className="text-xs font-black text-slate-900 tracking-tight">
                {isSuccess ? 'Berhasil' : isError ? 'Peringatan' : isWarning ? 'Perhatian' : 'Informasi'}
              </p>
              <p className="text-[11px] text-slate-600 font-medium mt-0.5 leading-snug break-words">
                {typeof toast.message === 'object' ? (toast.message?.message || toast.message?.error || JSON.stringify(toast.message)) : String(toast.message || '')}
              </p>
            </div>

            {/* Close Button */}
            <button
              onClick={() => removeToast(toast.id)}
              className="text-slate-400 hover:text-slate-700 hover:bg-slate-100 p-1 rounded-lg transition-colors shrink-0"
              title="Tutup Notifikasi"
            >
              <X size={14} />
            </button>
          </div>
        );
      })}
    </div>
  );
};

export default Toast;
