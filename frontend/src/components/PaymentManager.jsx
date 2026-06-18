import React, { useState, useEffect } from 'react';
import {
  getPurchaseOrderPayments,
  addPurchaseOrderPayment,
  deletePurchaseOrderPayment
} from '../services/api';
import { useToast } from './ui/Toast';
import { useConfirmations } from './ui/ConfirmDialog';

// طرق الدفع المتاحة - قابلة للتوسع
const PAYMENT_METHODS = [
  { value: 'BANK_TRANSFER', label: 'تحويل بنكي', icon: '🏦' },
  { value: 'CASH', label: 'نقداً', icon: '💵' },
  { value: 'CHECK', label: 'شيك', icon: '📝' },
  { value: 'CREDIT_CARD', label: 'بطاقة ائتمان', icon: '💳' },
  { value: 'DEBIT_CARD', label: 'بطاقة مدى', icon: '💳' },
  { value: 'WIRE_TRANSFER', label: 'حوالة سريعة', icon: '⚡' },
  { value: 'MOBILE_PAYMENT', label: 'محفظة إلكترونية', icon: '📱' },
  { value: 'OTHER', label: 'أخرى', icon: '📋' }
];

const PaymentManager = ({ purchaseOrder, onPaymentUpdate }) => {
  const { success, error: toastError } = useToast();
  const { confirmDelete } = useConfirmations();

  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [notification, setNotification] = useState(null);

  // Payment form data
  const [paymentForm, setPaymentForm] = useState({
    amount_usd: '',
    paid_on: new Date().toISOString().split('T')[0],
    method: 'BANK_TRANSFER',
    reference_no: '',
    notes: ''
  });

  useEffect(() => {
    if (purchaseOrder?.id) {
      fetchPayments();
    }
  }, [purchaseOrder]);

  const fetchPayments = async () => {
    try {
      setLoading(true);
      const data = await getPurchaseOrderPayments(purchaseOrder.id);
      setPayments(data);
      setError(null);
    } catch (err) {
      setError('فشل في تحميل المدفوعات');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const showNotification = (message, type = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3000);
  };

  const handleAddPayment = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      await addPurchaseOrderPayment(purchaseOrder.id, paymentForm);
      setShowPaymentForm(false);
      setPaymentForm({
        amount_usd: '',
        paid_on: new Date().toISOString().split('T')[0],
        method: 'BANK_TRANSFER',
        reference_no: '',
        notes: ''
      });
      await fetchPayments();
      if (onPaymentUpdate) {
        onPaymentUpdate(); // Refresh parent component
      }
      success('تم إضافة الدفعة بنجاح');
    } catch (err) {
      toastError(`خطأ: ${err.response?.data?.detail || err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleDeletePayment = async (paymentId) => {
    const confirmed = await confirmDelete('الدفعة');
    if (!confirmed) return;

    try {
      setLoading(true);
      await deletePurchaseOrderPayment(paymentId);
      await fetchPayments();
      if (onPaymentUpdate) {
        onPaymentUpdate(); // Refresh parent component
      }
      success('تم حذف الدفعة بنجاح');
    } catch (err) {
      toastError(`خطأ: ${err.response?.data?.detail || err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2
    }).format(amount || 0);
  };

  const formatDate = (dateString) => {
    if (!dateString) return '';
    try {
      // تنسيق موحد مع باقي المكونات
      return new Date(dateString).toLocaleDateString('en-GB', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
      });
    } catch (err) {
      console.error('خطأ في تنسيق التاريخ:', err);
      return dateString;
    }
  };

  // Calculate amounts from purchase order
  const totalAmount = parseFloat(purchaseOrder?.total_amount_usd || 0);
  const paidAmount = parseFloat(purchaseOrder?.paid_amount_usd || 0);
  const remainingAmount = totalAmount - paidAmount;

  const getPaymentStatusBadge = () => {
    if (totalAmount === 0) {
      return { class: 'bg-gray-100 text-gray-800 border-gray-300', label: 'غير محدد' };
    }
    if (paidAmount === 0) {
      return { class: 'bg-red-100 text-red-800 border-red-300', label: 'غير مدفوع ⏳' };
    }
    if (paidAmount >= totalAmount) {
      return { class: 'bg-green-100 text-green-800 border-green-300', label: 'مدفوع بالكامل ✓' };
    }
    return { class: 'bg-yellow-100 text-yellow-800 border-yellow-300', label: 'مدفوع جزئياً ⚠️' };
  };

  const paymentStatus = getPaymentStatusBadge();

  return (
    <div className="space-y-6" dir="rtl">
      {/* Notification */}
      {notification && (
        <div className={`p-4 rounded-lg ${notification.type === 'error' ? 'bg-red-100 border-red-400 text-red-700' : 'bg-green-100 border-green-400 text-green-700'} border`}>
          {notification.message}
        </div>
      )}

      {/* Header & Summary */}
      <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl p-6 border-2 border-purple-200">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h3 className="text-xl font-bold text-gray-900">إدارة المدفوعات</h3>
            <p className="text-sm text-gray-600 mt-1">تتبع المدفوعات لأمر الشراء #{purchaseOrder?.po_no}</p>
          </div>
          <span className={`px-4 py-2 rounded-full text-sm font-bold border-2 ${paymentStatus.class}`}>
            {paymentStatus.label}
          </span>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white rounded-lg p-4 shadow-sm border border-purple-200">
            <div className="text-sm text-gray-600 mb-1">إجمالي المبلغ المطلوب</div>
            <div className="text-2xl font-bold text-blue-600">{formatCurrency(totalAmount)}</div>
          </div>
          <div className="bg-white rounded-lg p-4 shadow-sm border border-green-200">
            <div className="text-sm text-gray-600 mb-1">المبلغ المدفوع</div>
            <div className="text-2xl font-bold text-green-600">{formatCurrency(paidAmount)}</div>
            <div className="text-xs text-gray-500 mt-1">{payments.length} دفعة مسجلة</div>
          </div>
          <div className="bg-white rounded-lg p-4 shadow-sm border border-orange-200">
            <div className="text-sm text-gray-600 mb-1">المتبقي للدفع</div>
            <div className="text-2xl font-bold text-orange-600">{formatCurrency(remainingAmount)}</div>
          </div>
        </div>

        {/* Add Payment Button */}
        {remainingAmount > 0 && (
          <div className="mt-4">
            <button
              onClick={() => {
                setShowPaymentForm(!showPaymentForm);
                if (!showPaymentForm) {
                  setPaymentForm({ ...paymentForm, amount_usd: remainingAmount });
                }
              }}
              className="w-full md:w-auto px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-lg hover:from-green-700 hover:to-emerald-700 font-medium shadow-md flex items-center justify-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              إضافة دفعة جديدة
            </button>
          </div>
        )}
      </div>

      {/* Payment Form */}
      {showPaymentForm && (
        <div className="bg-green-50 rounded-xl p-6 border-2 border-green-200">
          <h4 className="font-bold text-gray-900 mb-4 text-lg">إضافة دفعة جديدة</h4>
          <form onSubmit={handleAddPayment} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">المبلغ المدفوع (USD) *</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  max={remainingAmount}
                  value={paymentForm.amount_usd}
                  onChange={(e) => setPaymentForm({ ...paymentForm, amount_usd: parseFloat(e.target.value) })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  placeholder="0.00"
                />
                <p className="text-xs text-gray-500 mt-1">الحد الأقصى: {formatCurrency(remainingAmount)}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">تاريخ الدفع *</label>
                <input
                  type="date"
                  required
                  value={paymentForm.paid_on}
                  onChange={(e) => setPaymentForm({ ...paymentForm, paid_on: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">طريقة الدفع</label>
                <select
                  value={paymentForm.method}
                  onChange={(e) => setPaymentForm({ ...paymentForm, method: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                >
                  {PAYMENT_METHODS.map(method => (
                    <option key={method.value} value={method.value}>
                      {method.icon} {method.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">رقم المرجع</label>
                <input
                  type="text"
                  value={paymentForm.reference_no}
                  onChange={(e) => setPaymentForm({ ...paymentForm, reference_no: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  placeholder="رقم التحويل أو الشيك..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">ملاحظات</label>
                <input
                  type="text"
                  value={paymentForm.notes}
                  onChange={(e) => setPaymentForm({ ...paymentForm, notes: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  placeholder="ملاحظات إضافية..."
                />
              </div>
            </div>
            <div className="flex gap-3">
              <button
                type="submit"
                disabled={loading}
                className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 font-medium shadow-md"
              >
                {loading ? 'جاري الإضافة...' : 'حفظ الدفعة'}
              </button>
              <button
                type="button"
                onClick={() => setShowPaymentForm(false)}
                className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 font-medium"
              >
                إلغاء
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700 flex items-center gap-2">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          {error}
        </div>
      )}

      {/* Loading Spinner */}
      {loading && payments.length === 0 && (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">جاري تحميل المدفوعات...</p>
        </div>
      )}

      {/* Payments List */}
      {payments.length > 0 && (
        <div className="bg-white rounded-xl border-2 border-gray-200 shadow-md overflow-hidden">
          <div className="bg-gradient-to-r from-gray-50 to-gray-100 px-6 py-4 border-b border-gray-200">
            <h4 className="text-lg font-bold text-gray-900">سجل المدفوعات ({payments.length})</h4>
          </div>
          <div className="p-6 space-y-3">
            {payments.map((payment, index) => (
              <div
                key={payment.id}
                className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg p-4 border-2 border-green-200 flex items-center justify-between hover:shadow-md transition-shadow"
              >
                <div className="flex items-center gap-4">
                  <div className="bg-green-500 text-white w-10 h-10 rounded-full flex items-center justify-center font-bold shadow-md">
                    {index + 1}
                  </div>
                  <div>
                    <div className="font-bold text-gray-900 text-lg">{formatCurrency(payment.amount_usd)}</div>
                    <div className="text-sm text-gray-600 flex items-center gap-2 mt-1">
                      <span>📅 {formatDate(payment.paid_on)}</span>
                      <span>•</span>
                      <span>💳 {getPaymentMethodLabel(payment.method)}</span>
                      {payment.reference_no && (
                        <>
                          <span>•</span>
                          <span className="text-blue-600 font-medium">مرجع: {payment.reference_no}</span>
                        </>
                      )}
                    </div>
                    {payment.notes && (
                      <div className="text-xs text-gray-500 mt-1 italic">📝 {payment.notes}</div>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => handleDeletePayment(payment.id)}
                  className="p-2 text-red-600 hover:bg-red-100 rounded-lg transition-colors"
                  title="حذف الدفعة"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* No Payments Message */}
      {payments.length === 0 && !loading && !showPaymentForm && (
        <div className="text-center py-12 bg-gray-50 rounded-xl border-2 border-dashed border-gray-300">
          <svg className="w-16 h-16 mx-auto text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
          <p className="text-gray-600 font-medium">لا توجد دفعات مسجلة لهذا الطلب</p>
          <p className="text-sm text-gray-500 mt-1">قم بإضافة أول دفعة باستخدام الزر أعلاه</p>
        </div>
      )}
    </div>
  );
};

// Helper function to get payment method label in Arabic
const getPaymentMethodLabel = (method) => {
  const paymentMethod = PAYMENT_METHODS.find(m => m.value === method);
  return paymentMethod ? `${paymentMethod.icon} ${paymentMethod.label}` : method;
};

export default PaymentManager;
