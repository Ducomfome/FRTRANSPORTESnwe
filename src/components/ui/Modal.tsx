import React from 'react';
import { X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  maxWidth?: string;
}

export function Modal({ isOpen, onClose, title, children, maxWidth = 'max-w-lg' }: ModalProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 print:static print:p-0 print:block print:bg-white">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-brand-dark/60 backdrop-blur-sm print:hidden"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className={`relative bg-brand-panel w-full ${maxWidth} rounded-2xl shadow-2xl overflow-hidden print:w-full print:bg-white print:rounded-none print:shadow-none print:border-none print:p-0 print:static print:h-auto print:overflow-visible`}
          >
            <div className="px-6 py-4 border-b border-brand-border flex items-center justify-between bg-[var(--table-header-bg)] print:hidden">
              <h3 className="font-bold text-brand-text">{title}</h3>
              <button onClick={onClose} className="p-1 hover:bg-brand-bg rounded-full transition-colors">
                <X size={20} className="text-brand-text-muted" />
              </button>
            </div>
            <div className="p-6 text-brand-text print:p-0 print:m-0 print:text-black">
              {children}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
