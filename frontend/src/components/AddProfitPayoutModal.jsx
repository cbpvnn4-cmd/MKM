import React, { useState } from 'react';
import { X, DollarSign, Calendar, CreditCard, FileText, AlertCircle } from 'lucide-react';
import { createPartnerProfitPayout } from '../services/api';

const AddProfitPayoutModal = ({ isOpen, onClose, partnerId, outstandingAmount, onPayoutAdded }) => {
  const [formData, setFormData] = useState({
    payout_amount: '',
    payout_date: new Date().toISOString().split('T')[0],
    payment_method: 'BANK_TRANSFER',
    reference_no: '',
    notes: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const paymentMethods = [
    { value: 'BANK_TRANSFER', label: 'تحويل بنكي' },
    { value: 'CASH', label: 'نقداً' },
    { value: 'CHECK', label: 'شيك' },
    { value: 'WIRE_TRANSFER', label: 'حوالة سريعة' },
    { value: 'OTHER', label: 'أخرى' }
  ];

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    // Validation
    const amount = parseFloat(formData.payout_amount);
    if (isNaN(amount) || amount <= 0) {
      setError('يرجى إدخال مبلغ صحيح');
      return;
    }

    if (amount > outstandingAmount) {
      setError(`المبلغ المدخل (${amount}) يتجاوز الأرباح المستحقة (${outstandingAmount})`);
      return;
    }

    try {
      setLoading(true);
      await createPartnerProfitPayout(partnerId, {
        ...formData,
        payout_amount: amount
      });

      // Success
      onPayoutAdded();
      handleClose();
    } catch (err) {
      setError(err.response?.data?.detail || 'فشل في إضافة المدفوعة');
      console.error('Error creating payout:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setFormData({
      payout_amount: '',
      payout_date: new Date().toISOString().split('T')[0],
      payment_method: 'BANK_TRANSFER',
      reference_no: '',
      notes: ''
    });
    setError(null);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-500 to-purple-600 p-6 rounded-t-xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3 space-x-reverse">
              <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center">
                <DollarSign className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-white">إضافة دفعة أرباح</h2>
                <p className="text-blue-100 text-sm">
                  الأرباح المستحقة: ${outstandingAmount?.toFixed(2)}
                </p>
              </div>
            </div>
            <button
              onClick={handleClose}
              className="text-white hover:bg-white/20 rounded-lg p-2 transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Error Alert */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start">
              <AlertCircle className="w-5 h-5 text-red-500 mt-0.5 ml-3" />
              <div>
                <h4 className="font-semibold text-red-900">خطأ</h4>
                <p className="text-sm text-red-700 mt-1">{error}</p>
              </div>
            </div>
          )}

          {/* Payout Amount */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <DollarSign className="w-4 h-4 inline ml-1" />
              مبلغ الدفعة *
            </label>
            <input
              type="number"
              name="payout_amount"
              value={formData.payout_amount}
              onChange={handleChange}
              step="0.01"
              min="0.01"
              max={outstandingAmount}
              required
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="أدخل مبلغ الدفعة"
            />
          </div>

          {/* Payout Date */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Calendar className="w-4 h-4 inline ml-1" />
              تاريخ الدفعة *
            </label>
            <input
              type="date"
              name="payout_date"
              value={formData.payout_date}
              onChange={handleChange}
              required
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Payment Method */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <CreditCard className="w-4 h-4 inline ml-1" />
              طريقة الدفع *
            </label>
            <select
              name="payment_method"
              value={formData.payment_method}
              onChange={handleChange}
              required
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              {paymentMethods.map(method => (
                <option key={method.value} value={method.value}>
                  {method.label}
                </option>
              ))}
            </select>
          </div>

          {/* Reference Number */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <FileText className="w-4 h-4 inline ml-1" />
              الرقم المرجعي (اختياري)
            </label>
            <input
              type="text"
              name="reference_no"
              value={formData.reference_no}
              onChange={handleChange}
              maxLength="100"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="رقم الشيك أو رقم التحويل"
            />
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <FileText className="w-4 h-4 inline ml-1" />
              ملاحظات (اختياري)
            </label>
            <textarea
              name="notes"
              value={formData.notes}
              onChange={handleChange}
              rows="3"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="أي ملاحظات إضافية..."
            />
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-gradient-to-r from-blue-500 to-purple-600 text-white py-3 rounded-lg font-semibold hover:from-blue-600 hover:to-purple-700 transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'جاري الحفظ...' : 'حفظ الدفعة'}
            </button>
            <button
              type="button"
              onClick={handleClose}
              disabled={loading}
              className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              إلغاء
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddProfitPayoutModal;
