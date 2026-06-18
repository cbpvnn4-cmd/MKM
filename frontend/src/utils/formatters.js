/**
 * ملف الدوال الموحدة لتنسيق البيانات
 * Unified Formatters for SANAD ELEVATORS System
 */

/**
 * تنسيق المبالغ المالية بالدولار الأمريكي
 * Format currency amounts in USD
 * @param {number} amount - المبلغ المالي
 * @param {Object} options - خيارات إضافية
 * @returns {string} - المبلغ المنسق
 */
export const formatCurrency = (amount, options = {}) => {
  const {
    minimumFractionDigits = 2,
    maximumFractionDigits = 2,
    currency = 'USD',
    locale = 'en-US'
  } = options;

  if (amount === null || amount === undefined || isNaN(amount)) {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency,
      minimumFractionDigits,
      maximumFractionDigits
    }).format(0);
  }

  const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;

  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    minimumFractionDigits,
    maximumFractionDigits
  }).format(numAmount || 0);
};

/**
 * تنسيق المبالغ المالية بدون خانات عشرية (للأرقام الكبيرة)
 * Format currency without decimal places (for large numbers)
 * @param {number} amount - المبلغ المالي
 * @returns {string} - المبلغ المنسق
 */
export const formatCurrencyCompact = (amount) => {
  return formatCurrency(amount, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  });
};

/**
 * تنسيق التاريخ
 * Format date to localized string
 * @param {string|Date} dateString - تاريخ التنسيق
 * @param {Object} options - خيارات إضافية
 * @returns {string} - التاريخ المنسق
 */
export const formatDate = (dateString, options = {}) => {
  if (!dateString) return '';

  const {
    format = 'short', // 'short', 'long', 'month-year', 'time'
    locale = 'en-US'
  } = options;

  const date = new Date(dateString);
  if (isNaN(date)) return '';

  try {
    switch (format) {
      case 'long':
        return new Intl.DateTimeFormat(locale, {
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        }).format(date);

      case 'month-year':
        return new Intl.DateTimeFormat(locale, {
          year: 'numeric',
          month: 'long'
        }).format(date);

      case 'time':
        return new Intl.DateTimeFormat(locale, {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit'
        }).format(date);

      case 'short':
      default:
        return new Intl.DateTimeFormat(locale, {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit'
        }).format(date);
    }
  } catch (e) {
    return date.toLocaleDateString(locale);
  }
};

/**
 * تنسيق الأرقام مع فواصل الآلاف
 * Format numbers with thousand separators
 * @param {number} value - الرقم
 * @returns {string} - الرقم المنسق
 */
export const formatNumber = (value) => {
  if (value === null || value === undefined || isNaN(value)) {
    return '0';
  }

  const numValue = typeof value === 'string' ? parseFloat(value) : value;

  return new Intl.NumberFormat('en-US').format(numValue || 0);
};

/**
 * تنسيق النسب المئوية
 * Format percentage
 * @param {number} value - القيمة
 * @param {number} decimals - عدد الخانات العشرية
 * @returns {string} - النسبة المئوية المنسقة
 */
export const formatPercent = (value, decimals = 1) => {
  if (value === null || value === undefined || isNaN(value)) {
    return '0%';
  }

  const numValue = typeof value === 'string' ? parseFloat(value) : value;

  return `${numValue.toFixed(decimals)}%`;
};

/**
 * تحويل الأرقام العربية إلى إنجليزية
 * Convert Arabic numerals to English
 * @param {string|number} num - الرقم
 * @returns {string} - الرقم بالأرقام الإنجليزية
 */
export const toEnglishNumber = (num) => {
  if (num === null || num === undefined) return '0';

  const map = { '٠': '0', '١': '1', '٢': '2', '٣': '3', '٤': '4', '٥': '5', '٦': '6', '٧': '7', '٨': '8', '٩': '9' };

  return num.toString().replace(/[٠-٩]/g, digit => map[digit] ?? digit);
};

/**
 * تنسيق رقم الهاتف
 * Format phone number
 * @param {string} phone - رقم الهاتف
 * @returns {string} - رقم الهاتف المنسق
 */
export const formatPhoneNumber = (phone) => {
  if (!phone) return '';

  // إزالة جميع الأحرف غير الرقمية
  const cleaned = phone.replace(/\D/g, '');

  // تنسيق حسب طول الرقم
  if (cleaned.length === 10) {
    return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
  } else if (cleaned.length === 12) {
    return `+${cleaned.slice(0, 2)} (${cleaned.slice(2, 5)}) ${cleaned.slice(5, 8)}-${cleaned.slice(8)}`;
  }

  return phone;
};

/**
 * اختصار النص الطويل
 * Truncate long text
 * @param {string} text - النص
 * @param {number} maxLength - الحد الأقصى للطول
 * @returns {string} - النص المختصر
 */
export const truncateText = (text, maxLength = 50) => {
  if (!text) return '';

  if (text.length <= maxLength) return text;

  return text.slice(0, maxLength) + '...';
};

/**
 * تنسيق حجم الملف
 * Format file size
 * @param {number} bytes - حجم الملف بالبايت
 * @returns {string} - الحجم المنسق
 */
export const formatFileSize = (bytes) => {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
};

/**
 * الحصول على اللون المناسب لحالة الفاتورة
 * Get color class for invoice status
 * @param {string} status - حالة الفاتورة
 * @returns {string} - كلاسات CSS
 */
export const getInvoiceStatusClass = (status) => {
  const statusStyles = {
    'DRAFT': 'bg-gradient-to-r from-gray-100 to-gray-200 text-gray-800 border border-gray-300',
    'ISSUED': 'bg-gradient-to-r from-blue-100 to-blue-200 text-blue-800 border border-blue-300',
    'PARTIALLY_PAID': 'bg-gradient-to-r from-yellow-100 to-yellow-200 text-yellow-800 border border-yellow-300',
    'PAID': 'bg-gradient-to-r from-green-100 to-green-200 text-green-800 border border-green-300',
    'OVERDUE': 'bg-gradient-to-r from-red-100 to-red-200 text-red-800 border border-red-300',
    'VOID': 'bg-gradient-to-r from-gray-100 to-gray-200 text-gray-800 border border-gray-300'
  };

  return statusStyles[status] || statusStyles['DRAFT'];
};

/**
 * الحصول على النص المناسب لحالة الفاتورة
 * Get text for invoice status
 * @param {string} status - حالة الفاتورة
 * @returns {string} - النص المترجم
 */
export const getInvoiceStatusText = (status) => {
  const statusTexts = {
    'DRAFT': 'مسودة',
    'ISSUED': 'صادرة',
    'PARTIALLY_PAID': 'مدفوعة جزئياً',
    'PAID': 'مدفوعة',
    'OVERDUE': 'متأخرة',
    'VOID': 'ملغاة'
  };

  return statusTexts[status] || 'مسودة';
};

/**
 * الحصول على اللون المناسب لحالة أمر الشراء
 * Get color class for purchase order status
 * @param {string} status - حالة أمر الشراء
 * @returns {string} - كلاسات CSS
 */
export const getPurchaseOrderStatusClass = (status) => {
  const statusStyles = {
    'DRAFT': 'bg-gray-100 text-gray-700 border-gray-300',
    'CONFIRMED': 'bg-blue-100 text-blue-700 border-blue-300',
    'RECEIVED': 'bg-green-100 text-green-700 border-green-300',
    'CANCELLED': 'bg-red-100 text-red-700 border-red-300'
  };

  return statusStyles[status] || statusStyles['DRAFT'];
};

/**
 * الحصول على النص المناسب لحالة أمر الشراء
 * Get text for purchase order status
 * @param {string} status - حالة أمر الشراء
 * @returns {string} - النص المترجم
 */
export const getPurchaseOrderStatusText = (status) => {
  const statusTexts = {
    'DRAFT': 'مسودة',
    'CONFIRMED': 'مؤكد',
    'RECEIVED': 'مستلم',
    'CANCELLED': 'ملغي'
  };

  return statusTexts[status] || 'مسودة';
};

/**
 * الحصول على اللون المناسب لحالة العقد
 * Get color class for contract status
 * @param {string} status - حالة العقد
 * @returns {string} - كلاسات CSS
 */
export const getContractStatusClass = (status) => {
  const statusStyles = {
    'DRAFT': 'bg-gradient-to-r from-gray-100 to-gray-200 text-gray-800 border border-gray-300',
    'ACTIVE': 'bg-gradient-to-r from-blue-100 to-blue-200 text-blue-800 border border-blue-300',
    'COMPLETED': 'bg-gradient-to-r from-green-100 to-green-200 text-green-800 border border-green-300',
    'TERMINATED': 'bg-gradient-to-r from-red-100 to-red-200 text-red-800 border border-red-300'
  };

  return statusStyles[status] || statusStyles['DRAFT'];
};

/**
 * الحصول على النص المناسب لحالة العقد
 * Get text for contract status
 * @param {string} status - حالة العقد
 * @returns {string} - النص المترجم
 */
export const getContractStatusText = (status) => {
  const statusTexts = {
    'DRAFT': 'مسودة',
    'ACTIVE': 'نشط',
    'COMPLETED': 'مكتمل',
    'TERMINATED': 'ملغي'
  };

  return statusTexts[status] || 'مسودة';
};

/**
 * الحصول على اللون المناسب لحالة عرض الأسعار
 * Get color class for quotation status
 * @param {string} status - حالة عرض الأسعار
 * @returns {string} - كلاسات CSS
 */
export const getQuotationStatusClass = (status) => {
  const statusStyles = {
    'DRAFT': 'bg-gradient-to-r from-gray-100 to-gray-200 text-gray-800 border border-gray-300',
    'SENT': 'bg-gradient-to-r from-blue-100 to-blue-200 text-blue-800 border border-blue-300',
    'ACCEPTED': 'bg-gradient-to-r from-green-100 to-green-200 text-green-800 border border-green-300',
    'REJECTED': 'bg-gradient-to-r from-red-100 to-red-200 text-red-800 border border-red-300',
    'EXPIRED': 'bg-gradient-to-r from-orange-100 to-orange-200 text-orange-800 border border-orange-300'
  };

  return statusStyles[status] || statusStyles['DRAFT'];
};

/**
 * الحصول على النص المناسب لحالة عرض الأسعار
 * Get text for quotation status
 * @param {string} status - حالة عرض الأسعار
 * @returns {string} - النص المترجم
 */
export const getQuotationStatusText = (status) => {
  const statusTexts = {
    'DRAFT': 'مسودة',
    'SENT': 'مُرسل',
    'ACCEPTED': 'مقبول',
    'REJECTED': 'مرفوض',
    'EXPIRED': 'منتهي'
  };

  return statusTexts[status] || 'مسودة';
};

/**
 * الحصول على اللون المناسب لحالة أمر البيع
 * Get color class for sales order status
 * @param {string} status - حالة أمر البيع
 * @returns {string} - كلاسات CSS
 */
export const getSalesOrderStatusClass = (status) => {
  const statusStyles = {
    'DRAFT': 'bg-gray-100 text-gray-700 border-gray-300',
    'CONFIRMED': 'bg-blue-100 text-blue-700 border-blue-300',
    'FULFILLED': 'bg-green-100 text-green-700 border-green-300',
    'INVOICED': 'bg-purple-100 text-purple-700 border-purple-300',
    'CANCELLED': 'bg-red-100 text-red-700 border-red-300',
    'VOID': 'bg-gray-100 text-gray-700 border-gray-300'
  };

  return statusStyles[status] || statusStyles['DRAFT'];
};

/**
 * الحصول على النص المناسب لحالة أمر البيع
 * Get text for sales order status
 * @param {string} status - حالة أمر البيع
 * @returns {string} - النص المترجم
 */
export const getSalesOrderStatusText = (status) => {
  const statusTexts = {
    'DRAFT': 'مسودة',
    'CONFIRMED': 'مؤكد',
    'FULFILLED': 'مكتمل',
    'INVOICED': 'مفوترة',
    'CANCELLED': 'ملغى',
    'VOID': 'لاغٍ'
  };

  return statusTexts[status] || 'مسودة';
};

/**
 * التحقق من صحة البريد الإلكتروني
 * Validate email address
 * @param {string} email - البريد الإلكتروني
 * @returns {boolean} - هل البريد صحيح
 */
export const isValidEmail = (email) => {
  if (!email) return false;

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

/**
 * التحقق من صحة رقم الهاتف
 * Validate phone number
 * @param {string} phone - رقم الهاتف
 * @returns {boolean} - هل الرقم صحيح
 */
export const isValidPhone = (phone) => {
  if (!phone) return false;

  // يقبل أرقام الهاتف التي تحتوي على 7-15 رقماً
  const phoneRegex = /^[\d\s\-+()]{7,15}$/;
  return phoneRegex.test(phone);
};

/**
 * حساب الفرق بين تاريخين بالأيام
 * Calculate days difference between two dates
 * @param {string|Date} date1 - التاريخ الأول
 * @param {string|Date} date2 - التاريخ الثاني
 * @returns {number} - عدد الأيام
 */
export const daysBetween = (date1, date2) => {
  const d1 = new Date(date1);
  const d2 = new Date(date2);

  if (isNaN(d1) || isNaN(d2)) return 0;

  const diffTime = Math.abs(d2 - d1);
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  return diffDays;
};

/**
 * التحقق مما إذا كان التاريخ في الماضي
 * Check if date is in the past
 * @param {string|Date} date - التاريخ
 * @returns {boolean} - هل التاريخ في الماضي
 */
export const isPastDate = (date) => {
  const d = new Date(date);
  if (isNaN(d)) return false;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  d.setHours(0, 0, 0, 0);

  return d < today;
};

/**
 * التحقق مما إذا كان التاريخ قادم
 * Check if date is in the future
 * @param {string|Date} date - التاريخ
 * @returns {boolean} - هل التاريخ قادم
 */
export const isFutureDate = (date) => {
  const d = new Date(date);
  if (isNaN(d)) return false;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  d.setHours(0, 0, 0, 0);

  return d > today;
};

// تصدير جميع الدوال بشكل افتراضي ككائن واحد
export default {
  formatCurrency,
  formatCurrencyCompact,
  formatDate,
  formatNumber,
  formatPercent,
  toEnglishNumber,
  formatPhoneNumber,
  truncateText,
  formatFileSize,
  getInvoiceStatusClass,
  getInvoiceStatusText,
  getPurchaseOrderStatusClass,
  getPurchaseOrderStatusText,
  getContractStatusClass,
  getContractStatusText,
  getQuotationStatusClass,
  getQuotationStatusText,
  getSalesOrderStatusClass,
  getSalesOrderStatusText,
  isValidEmail,
  isValidPhone,
  daysBetween,
  isPastDate,
  isFutureDate
};
