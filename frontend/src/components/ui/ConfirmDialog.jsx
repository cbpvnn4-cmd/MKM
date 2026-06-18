import { createContext, useContext, useState, useCallback } from 'react';
import { AlertTriangle, Info, CheckCircle, XCircle } from 'lucide-react';

const ConfirmContext = createContext();

export const useConfirm = () => {
  const context = useContext(ConfirmContext);
  if (!context) {
    throw new Error('useConfirm must be used within ConfirmProvider');
  }
  return context;
};

export const ConfirmProvider = ({ children }) => {
  const [dialog, setDialog] = useState(null);

  const confirm = useCallback((options) => {
    return new Promise((resolve) => {
      setDialog({
        ...options,
        onConfirm: () => {
          setDialog(null);
          resolve(true);
        },
        onCancel: () => {
          setDialog(null);
          resolve(false);
        },
      });
    });
  }, []);

  const closeDialog = () => setDialog(null);

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      {dialog && <ConfirmDialog dialog={dialog} onClose={closeDialog} />}
    </ConfirmContext.Provider>
  );
};

const ConfirmDialog = ({ dialog, onClose }) => {
  const {
    title,
    message,
    confirmText = 'تأكيد',
    cancelText = 'إلغاء',
    type = 'warning',
    onConfirm,
    onCancel,
  } = dialog;

  const typeStyles = {
    warning: {
      icon: <AlertTriangle className="w-12 h-12 text-amber-500" />,
      bgClass: 'bg-amber-50',
      borderClass: 'border-amber-200',
      confirmBtnClass: 'bg-amber-600 hover:bg-amber-700 text-white',
    },
    danger: {
      icon: <XCircle className="w-12 h-12 text-red-500" />,
      bgClass: 'bg-red-50',
      borderClass: 'border-red-200',
      confirmBtnClass: 'bg-red-600 hover:bg-red-700 text-white',
    },
    info: {
      icon: <Info className="w-12 h-12 text-blue-500" />,
      bgClass: 'bg-blue-50',
      borderClass: 'border-blue-200',
      confirmBtnClass: 'bg-blue-600 hover:bg-blue-700 text-white',
    },
    success: {
      icon: <CheckCircle className="w-12 h-12 text-emerald-500" />,
      bgClass: 'bg-emerald-50',
      borderClass: 'border-emerald-200',
      confirmBtnClass: 'bg-emerald-600 hover:bg-emerald-700 text-white',
    },
  };

  const style = typeStyles[type] || typeStyles.warning;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onCancel}
      />

      {/* Dialog */}
      <div
        className={`relative w-full max-w-md rounded-2xl border-2 shadow-2xl p-6 ${style.bgClass} ${style.borderClass} animate-scale-in`}
        dir="rtl"
      >
        {/* Close button */}
        <button
          onClick={onCancel}
          className="absolute top-4 left-4 text-gray-400 hover:text-gray-600 transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {/* Content */}
        <div className="flex flex-col items-center text-center space-y-4">
          {/* Icon */}
          <div className="flex-shrink-0">
            {style.icon}
          </div>

          {/* Title */}
          <h3 className="text-xl font-bold text-gray-900">
            {title}
          </h3>

          {/* Message */}
          {message && (
            <p className="text-sm text-gray-600 leading-relaxed">
              {message}
            </p>
          )}

          {/* Buttons */}
          <div className="flex gap-3 w-full pt-2">
            <button
              onClick={onCancel}
              className="flex-1 px-4 py-2.5 rounded-xl border-2 border-gray-300 text-gray-700 font-semibold hover:bg-gray-100 transition-colors"
            >
              {cancelText}
            </button>
            <button
              onClick={onConfirm}
              className={`flex-1 px-4 py-2.5 rounded-xl font-semibold transition-colors ${style.confirmBtnClass}`}
            >
              {confirmText}
            </button>
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes scale-in {
          from {
            opacity: 0;
            transform: scale(0.95);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }
        .animate-scale-in {
          animation: scale-in 0.2s ease-out;
        }
      `}</style>
    </div>
  );
};

// Helper hook for common confirmations
export const useConfirmations = () => {
  const confirm = useConfirm();

  return {
    confirmActivate: (itemName) =>
      confirm({
        type: 'info',
        title: 'تفعيل العنصر',
        message: `هل تريد تفعيل "${itemName}"؟`,
        confirmText: 'تفعيل',
        cancelText: 'إلغاء',
      }),

    confirmComplete: (itemName) =>
      confirm({
        type: 'success',
        title: 'إكمال العنصر',
        message: `هل تريد إكمال "${itemName}"؟`,
        confirmText: 'إكمال',
        cancelText: 'إلغاء',
      }),

    confirmDelete: (itemName) =>
      confirm({
        type: 'danger',
        title: 'حذف العنصر',
        message: `هل أنت متأكد من حذف "${itemName}"؟ لا يمكن التراجع عن هذا الإجراء.`,
        confirmText: 'حذف',
        cancelText: 'إلغاء',
      }),

    confirmConvert: (fromType, toType) =>
      confirm({
        type: 'info',
        title: 'تحويل العنصر',
        message: `هل تريد تحويل ${fromType} إلى ${toType}؟`,
        confirmText: 'تحويل',
        cancelText: 'إلغاء',
      }),

    confirmUpdate: (itemName) =>
      confirm({
        type: 'warning',
        title: 'تحديث العنصر',
        message: `هل تريد تحديث "${itemName}"؟`,
        confirmText: 'تحديث',
        cancelText: 'إلغاء',
      }),
  };
};

export default ConfirmProvider;
