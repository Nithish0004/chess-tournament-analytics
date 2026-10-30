import React from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

export const Toast = ({ id, message, type = 'info', onClose }) => {
  const configs = {
    success: {
      borderColor: 'border-l-4 border-l-emerald-500',
      icon: <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
    },
    error: {
      borderColor: 'border-l-4 border-l-rose-500',
      icon: <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
    },
    info: {
      borderColor: 'border-l-4 border-l-blue-500',
      icon: <Info className="w-5 h-5 text-blue-600 shrink-0" />
    }
  };

  const config = configs[type] || configs.info;

  return (
    <div
      className={`pointer-events-auto flex items-start gap-3 p-4 bg-white rounded-xl shadow-lg border border-slate-200/90 ${config.borderColor} transition-all duration-300 animate-in slide-in-from-bottom-5`}
    >
      <div className="mt-0.5">{config.icon}</div>
      <div className="flex-1 text-xs sm:text-sm font-semibold text-slate-800 leading-snug break-words">
        {message}
      </div>
      {onClose && (
        <button
          onClick={() => onClose(id)}
          className="text-slate-400 hover:text-slate-600 transition-colors p-1 -mr-1 -mt-1 rounded-md"
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  );
};
