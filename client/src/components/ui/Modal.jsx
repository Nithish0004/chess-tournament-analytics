import React, { useEffect } from 'react';
import { X } from 'lucide-react';

/**
 * Design System Modal Component
 */
export const Modal = ({
  isOpen,
  onClose,
  title,
  subtitle,
  children,
  maxWidth = 'max-w-lg',
  className = ''
}) => {
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/80 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Modal Dialog */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div
          className={`relative w-full ${maxWidth} rounded-2xl bg-[#161617] border border-[#262628] shadow-2xl p-6 transition-all transform animate-in fade-in zoom-in-95 text-[#F5F5F5] ${className}`}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-start justify-between pb-4 mb-4 border-b border-[#242426]">
            <div>
              <h3 className="text-lg font-condensed font-bold uppercase tracking-wider text-white">
                {title}
              </h3>
              {subtitle && (
                <p className="text-xs text-zinc-400 mt-0.5">{subtitle}</p>
              )}
            </div>
            <button
              onClick={onClose}
              type="button"
              className="rounded-xl p-1.5 text-zinc-400 hover:bg-white/10 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          <div>{children}</div>
        </div>
      </div>
    </div>
  );
};

export default Modal;

