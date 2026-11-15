
import React from 'react';
import { AlertTriangle, X } from 'lucide-react';

interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
  confirmLabel?: string;
  cancelLabel?: string;
  isDanger?: boolean;
}

const ConfirmModal: React.FC<ConfirmModalProps> = ({ 
  isOpen, 
  title, 
  message, 
  onConfirm, 
  onCancel, 
  confirmLabel = "تأكيد الحذف", 
  cancelLabel = "إلغاء",
  isDanger = true
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[200] flex items-center justify-center p-6 animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 w-full max-w-sm rounded-3xl p-6 shadow-2xl space-y-4 animate-in zoom-in duration-200">
        <div className="flex justify-between items-start">
          <div className={`p-3 rounded-2xl ${isDanger ? 'bg-red-500/10 text-red-500' : 'bg-blue-500/10 text-blue-500'}`}>
            <AlertTriangle size={24} />
          </div>
          <button onClick={onCancel} className="text-slate-500 hover:text-white p-1">
            <X size={20} />
          </button>
        </div>
        
        <div>
          <h3 className="text-xl font-bold text-white mb-2">{title}</h3>
          <p className="text-slate-400 text-sm leading-relaxed">{message}</p>
        </div>

        <div className="flex gap-3 pt-4">
          <button 
            onClick={onConfirm}
            className={`flex-grow py-3 rounded-xl font-bold transition-all active:scale-95 shadow-lg ${
              isDanger 
                ? 'bg-red-600 text-white shadow-red-900/20 hover:bg-red-700' 
                : 'bg-blue-600 text-white shadow-blue-900/20 hover:bg-blue-700'
            }`}
          >
            {confirmLabel}
          </button>
          <button 
            onClick={onCancel}
            className="flex-grow bg-slate-800 text-slate-300 py-3 rounded-xl font-bold hover:bg-slate-700 transition-colors"
          >
            {cancelLabel}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmModal;
