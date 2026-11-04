import React from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

/**
 * Design System Dark Monochrome Toast Component
 */
export const Toast = ({ id, message, type = 'info', onClose }) => {
  const configs = {
    success: {
      border: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300',
      icon: <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
    },
    error: {
      border: 'border-rose-500/30 bg-rose-500/10 text-rose-300',
      icon: <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
    },
    info: {
      border: 'border-[#C6A15B]/30 bg-[#C6A15B]/10 text-zinc-200',
      icon: <Info className="w-4 h-4 text-[#C6A15B] shrink-0" />
    }
  };

  const config = configs[type] || configs.info;

  return (
    <div
      className={`pointer-events-auto flex items-start gap-3 p-3.5 rounded-xl bg-[#1A1A1C] border shadow-2xl ${config.border} transition-all duration-300 animate-in slide-in-from-bottom-5 max-w-sm`}
    >
      <div className="mt-0.5">{config.icon}</div>
      <div className="flex-1 text-xs font-semibold text-white leading-snug break-words">
        {message}
      </div>
      {onClose && (
        <button
          onClick={() => onClose(id)}
          type="button"
          className="text-zinc-500 hover:text-white transition-colors p-1 -mr-1 -mt-1 rounded-md"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
};

export default Toast;

