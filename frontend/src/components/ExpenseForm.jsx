import React, { useState, useEffect } from 'react';
import { createExpense, updateExpense } from '../services/api';

const ExpenseForm = ({ expense, onSave, onCancel }) => {
  const [formData, setFormData] = useState({
    date: expense?.date || new Date().toISOString().split('T')[0],
    category: expense?.category || '',
    description: expense?.description || '',
    amount: expense?.amount || '',
    currency: expense?.currency || 'USD',
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Common expense categories with Arabic translations
  const expenseCategories = [
    { en: 'Equipment', ar: 'المعدات' },
    { en: 'Labor', ar: 'العمالة' },
    { en: 'Materials', ar: 'المواد' },
    { en: 'Transportation', ar: 'النقل' },
    { en: 'Utilities', ar: 'المرافق' },
    { en: 'Office Supplies', ar: 'اللوازم المكتبية' },
    { en: 'Marketing', ar: 'التسويق' },
    { en: 'Insurance', ar: 'التأمين' },
    { en: 'Maintenance', ar: 'الصيانة' },
    { en: 'Other', ar: 'أخرى' }
  ];

  // Common currencies with Arabic names
  const currencies = [
    { code: 'USD', name: 'US Dollar', symbol: '$' },
    { code: 'SAR', name: 'Saudi Riyal', symbol: 'ر.س' },
    { code: 'AED', name: 'UAE Dirham', symbol: 'د.إ' },
    { code: 'EUR', name: 'Euro', symbol: '€' },
    { code: 'QAR', name: 'Qatari Riyal', symbol: 'ر.ق' },
    { code: 'KWD', name: 'Kuwaiti Dinar', symbol: 'د.ك' },
    { code: 'BHD', name: 'Bahraini Dinar', symbol: 'د.ب' },
    { code: 'OMR', name: 'Omani Rial', symbol: 'ر.ع' },
    { code: 'JOD', name: 'Jordanian Dinar', symbol: 'د.أ' },
    { code: 'GBP', name: 'British Pound', symbol: '£' }
  ];

  useEffect(() => {
    if (expense) {
      setFormData({
        date: expense.date || new Date().toISOString().split('T')[0],
        category: expense.category || '',
        description: expense.description || '',
        amount: expense.amount || '',
        currency: expense.currency || 'USD',
      });
    }
  }, [expense]);

  const validateForm = () => {
    const newErrors = {};

    if (!formData.date) {
      newErrors.date = 'التاريخ مطلوب';
    }

    if (!formData.category.trim()) {
      newErrors.category = 'فئة المصروف مطلوبة';
    }

    if (!formData.description.trim()) {
      newErrors.description = 'وصف المصروف مطلوب';
    } else if (formData.description.length < 5) {
      newErrors.description = 'الوصف يجب أن يكون 5 أحرف على الأقل';
    }

    if (!formData.amount || parseFloat(formData.amount) <= 0) {
      newErrors.amount = 'المبلغ يجب أن يكون أكبر من صفر';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));

    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const handleAmountChange = (e) => {
    const { name, value } = e.target;
    // Allow only numbers and decimal point
    if (/^\d*\.?\d*$/.test(value) || value === '') {
      setFormData(prev => ({
        ...prev,
        [name]: value,
      }));

      // Clear error when user starts typing
      if (errors[name]) {
        setErrors(prev => ({
          ...prev,
          [name]: ''
        }));
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const expenseData = {
        date: formData.date,
        category: formData.category.trim(),
        description: formData.description.trim(),
        amount: parseFloat(formData.amount),
        currency: formData.currency,
      };

      let savedExpense;
      if (expense) {
        // Update existing expense
        savedExpense = await updateExpense(expense.id, expenseData);
      } else {
        // Create new expense
        savedExpense = await createExpense(expenseData);
      }

      // Call the onSave callback with the saved expense data
      onSave(savedExpense);
    } catch (err) {
      console.error('Error saving expense:', err);
      setError(err.response?.data?.detail || err.message || 'فشل في حفظ بيانات المصروف');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.864-.833-2.632 0L5.232 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <div className="mr-3">
              <h3 className="text-sm font-medium text-red-800">خطأ في حفظ البيانات</h3>
              <p className="mt-1 text-sm text-red-700">{error}</p>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* تاريخ المصروف */}
        <div>
          <label htmlFor="date" className="block text-sm font-semibold text-gray-700 mb-3">
            تاريخ المصروف *
          </label>
          <input
            type="date"
            id="date"
            name="date"
            value={formData.date}
            onChange={handleChange}
            className={`w-full px-4 py-3 border-2 rounded-xl shadow-sm bg-white/70 focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-transparent transition-all duration-200 ${
              errors.date ? 'border-red-300' : 'border-gray-200'
            }`}
          />
          {errors.date && <p className="mt-2 text-sm text-red-600">{errors.date}</p>}
        </div>

        {/* فئة المصروف */}
        <div>
          <label htmlFor="category" className="block text-sm font-semibold text-gray-700 mb-3">
            فئة المصروف *
          </label>
          <select
            id="category"
            name="category"
            value={formData.category}
            onChange={handleChange}
            className={`w-full px-4 py-3 border-2 rounded-xl shadow-sm bg-white/70 focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-transparent transition-all duration-200 ${
              errors.category ? 'border-red-300' : 'border-gray-200'
            }`}
          >
            <option value="">اختر فئة...</option>
            {expenseCategories.map(category => (
              <option key={category.en} value={category.en}>{category.ar}</option>
            ))}
          </select>
          {errors.category && <p className="mt-2 text-sm text-red-600">{errors.category}</p>}
        </div>

        {/* المبلغ */}
        <div>
          <label htmlFor="amount" className="block text-sm font-semibold text-gray-700 mb-3">
            المبلغ *
          </label>
          <input
            type="text"
            id="amount"
            name="amount"
            value={formData.amount}
            onChange={handleAmountChange}
            className={`w-full px-4 py-3 border-2 rounded-xl shadow-sm bg-white/70 focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-transparent transition-all duration-200 ${
              errors.amount ? 'border-red-300' : 'border-gray-200'
            }`}
            placeholder="مثال: 1500.50"
          />
          {errors.amount && <p className="mt-2 text-sm text-red-600">{errors.amount}</p>}
        </div>

        {/* العملة */}
        <div>
          <label htmlFor="currency" className="block text-sm font-semibold text-gray-700 mb-3">
            العملة
          </label>
          <select
            id="currency"
            name="currency"
            value={formData.currency}
            onChange={handleChange}
            className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl shadow-sm bg-white/70 focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-transparent transition-all duration-200"
          >
            {currencies.map(currency => (
              <option key={currency.code} value={currency.code}>
                {currency.name} ({currency.symbol})
              </option>
            ))}
          </select>
        </div>

        {/* وصف المصروف */}
        <div className="md:col-span-2">
          <label htmlFor="description" className="block text-sm font-semibold text-gray-700 mb-3">
            وصم المصروف *
          </label>
          <textarea
            id="description"
            name="description"
            value={formData.description}
            onChange={handleChange}
            rows={4}
            className={`w-full px-4 py-3 border-2 rounded-xl shadow-sm bg-white/70 focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-transparent transition-all duration-200 ${
              errors.description ? 'border-red-300' : 'border-gray-200'
            }`}
            placeholder="اكتب وصفاً مفصلاً للمصروف..."
          />
          {errors.description && <p className="mt-2 text-sm text-red-600">{errors.description}</p>}
        </div>
      </div>

      {/* الأزرار */}
      <div className="flex items-center justify-end space-x-4 rtl:space-x-reverse pt-8 border-t border-gray-200">
        <button
          type="button"
          onClick={onCancel}
          className="px-6 py-3 border border-gray-300 rounded-xl text-gray-700 font-medium hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-all duration-200"
        >
          إلغاء
        </button>
        <button
          type="submit"
          disabled={loading}
          className="px-6 py-3 bg-gradient-to-r from-rose-500 to-red-600 text-white font-semibold rounded-xl hover:from-rose-600 hover:to-red-700 focus:outline-none focus:ring-2 focus:ring-rose-500 focus:ring-offset-2 transform hover:scale-105 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
        >
          {loading ? (
            <div className="flex items-center">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white ml-2"></div>
              {expense ? 'جاري التحديث...' : 'جاري الحفظ...'}
            </div>
          ) : (
            expense ? 'تحديث المصروف' : 'إضافة المصروف'
          )}
        </button>
      </div>
    </form>
  );
};

export default ExpenseForm;