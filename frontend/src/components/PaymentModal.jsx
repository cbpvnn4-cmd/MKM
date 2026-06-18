import React, { useState } from 'react';
import { api } from '../services/api';

const PaymentModal = ({ invoice, onClose, onSuccess }) => {
  const [formData, setFormData] = useState({
    amount_usd: invoice.remaining_amount,
    paid_on: new Date().toISOString().split('T')[0],
    method: 'BANK_TRANSFER',
    reference_no: '',
    notes: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validation
    if (formData.amount_usd <= 0) {
      setError('المبلغ يجب أن يكون أكبر من صفر');
      return;
    }

    if (formData.amount_usd > invoice.remaining_amount) {
      setError(`المبلغ المدخل يتجاوز المتبقي ($${invoice.remaining_amount.toFixed(2)})`);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      await api.post(`/invoices/${invoice.id}/payments`, {
        amount_usd: parseFloat(formData.amount_usd),
        paid_on: formData.paid_on,
        method: formData.method,
        reference_no: formData.reference_no || null,
        notes: formData.notes || null
      });

      onSuccess();
    } catch (err) {
      setError(err.response?.data?.detail || 'حدث خطأ أثناء إضافة الدفعة');
      console.error('Error adding payment:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-20 mx-auto p-5 border w-11/12 md:w-2/3 lg:w-1/2 shadow-lg rounded-md bg-white">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-bold text-gray-900">إضافة دفعة جديدة</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Invoice Info */}
        <div className="bg-gray-50 rounded-lg p-4 mb-4">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-500">رقم الفاتورة:</span>
              <span className="font-semibold ml-2">{invoice.invoice_no}</span>
            </div>
            <div>
              <span className="text-gray-500">المورد:</span>
              <span className="font-semibold ml-2">{invoice.supplier_name}</span>
            </div>
            <div>
              <span className="text-gray-500">المبلغ الكلي:</span>
              <span className="font-semibold ml-2">${invoice.amount_usd.toFixed(2)}</span>
            </div>
            <div>
              <span className="text-gray-500">المدفوع:</span>
              <span className="font-semibold ml-2 text-green-600">${invoice.paid_amount_usd.toFixed(2)}</span>
            </div>
            <div className="col-span-2">
              <span className="text-gray-500">المتبقي:</span>
              <span className="font-bold ml-2 text-red-600 text-lg">${invoice.remaining_amount.toFixed(2)}</span>
            </div>
          </div>
        </div>

        {error && (
          <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                المبلغ المدفوع (USD) *
              </label>
              <input
                type="number"
                name="amount_usd"
                value={formData.amount_usd}
                onChange={handleChange}
                step="0.01"
                min="0.01"
                max={invoice.remaining_amount}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                تاريخ الدفع *
              </label>
              <input
                type="date"
                name="paid_on"
                value={formData.paid_on}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                طريقة الدفع *
              </label>
              <select
                name="method"
                value={formData.method}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="CASH">نقدي</option>
                <option value="BANK_TRANSFER">تحويل بنكي</option>
                <option value="CHECK">شيك</option>
                <option value="CREDIT_CARD">بطاقة ائتمان</option>
                <option value="OTHER">أخرى</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                رقم المرجع (اختياري)
              </label>
              <input
                type="text"
                name="reference_no"
                value={formData.reference_no}
                onChange={handleChange}
                placeholder="رقم الشيك، رقم التحويل، إلخ"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                ملاحظات (اختياري)
              </label>
              <textarea
                name="notes"
                value={formData.notes}
                onChange={handleChange}
                rows="3"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>

          <div className="mt-6 flex justify-end space-x-3 space-x-reverse">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
              disabled={loading}
            >
              إلغاء
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-blue-400"
            >
              {loading ? 'جاري الحفظ...' : 'إضافة الدفعة'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default PaymentModal;
