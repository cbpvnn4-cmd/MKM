import React, { useState, useEffect } from 'react';
import {
  User,
  BadgeCheck,
  Phone,
  Mail,
  Coins,
  Info,
  AlertCircle,
  X,
  CheckCircle2,
  Loader2,
  UserCheck
} from 'lucide-react';
import { createPartner, updatePartner, createPartnerCapitalMovement, calculateAndCreateOwnershipSnapshots } from '../services/api';

const PartnerForm = ({ partner, onSave, onCancel }) => {
  const [formData, setFormData] = useState({
    name: partner?.name || '',
    national_id: partner?.national_id || partner?.nationalId || '',
    phone: partner?.phone || '',
    email: partner?.email || '',
    active: partner?.active !== undefined ? partner.active : true,
    initial_capital: partner ? '' : '0', // Only for new partners
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (partner) {
      setFormData({
        name: partner.name || '',
        national_id: partner.national_id || partner.nationalId || '',
        phone: partner.phone || '',
        email: partner.email || '',
        active: partner.active !== undefined ? partner.active : true,
        initial_capital: '', // Don't show initial capital for existing partners
      });
    }
  }, [partner]);

  const validateForm = () => {
    const newErrors = {};

    if (!formData.name.trim()) {
      newErrors.name = 'اسم الشريك مطلوب';
    }

    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'يرجى إدخال عنوان بريد إلكتروني صحيح';
    }

    if (formData.phone && !/^\+?[0-9\s\-()]{7,20}$/.test(formData.phone)) {
      newErrors.phone = 'يرجى إدخال رقم هاتف صحيح';
    }

    // Validate initial capital for new partners only
    if (!partner && formData.initial_capital !== '') {
      const capital = parseFloat(formData.initial_capital);
      if (isNaN(capital) || capital < 0) {
        newErrors.initial_capital = 'يرجى إدخال مبلغ رأس المال صحيح';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
    
    // Clear error for this field when user starts typing
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
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
      let result;
      // Build a sanitized payload: drop empty optional strings so backend Optional fields validate
      const buildPayload = (data) => {
        const copy = { ...data };
        // Remove helper-only field
        delete copy.initial_capital;
        // Normalize optional fields: convert empty string to undefined (omitted)
        ['national_id', 'phone', 'email'].forEach((k) => {
          if (copy[k] !== undefined && String(copy[k]).trim() === '') {
            delete copy[k];
          }
        });
        return copy;
      };

      if (partner) {
        // Update existing partner
        result = await updatePartner(partner.id, buildPayload(formData));
      } else {
        // Create new partner
        const partnerData = buildPayload(formData);
        result = await createPartner(partnerData);

        // If initial capital is provided, create initial capital movement
        if (formData.initial_capital && parseFloat(formData.initial_capital) > 0) {
          await createPartnerCapitalMovement(result.id, {
            movement_type: 'DEPOSIT',
            amount_usd: parseFloat(formData.initial_capital),
            happened_at: new Date().toISOString().split('T')[0],
            note: 'رأس المال الأولي عند إنشاء الشريك'
          });

          // Automatically calculate and create ownership snapshots for all partners
          try {
            await calculateAndCreateOwnershipSnapshots();
          } catch (ownershipError) {
            console.error('Error calculating ownership snapshots:', ownershipError);
            // Don't fail the entire operation, just log the error
          }
        }
      }
      onSave(result);
    } catch (err) {
      // Handle validation errors from backend
      if (err.response?.data?.detail) {
        setError(err.response.data.detail);
      } else if (err.response?.data) {
        // Handle field-specific errors
        setErrors(err.response.data);
      } else {
        setError('فشل في حفظ بيانات الشريك');
      }
      console.error('Error saving partner:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      {error && (
        <div className="mb-6 text-red-600 bg-red-50 border border-red-200 p-4 rounded-xl">
          <div className="flex items-center">
            <svg className="w-5 h-5 text-red-500 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {error}
          </div>
        </div>
      )}
      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
              <span className="inline-flex items-center gap-2">
                <User className="h-4 w-4 text-purple-500" />
                اسم الشريك *
              </span>
            </label>
            <input
              type="text"
              id="name"
              name="name"
              value={formData.name}
              onChange={handleChange}
              className={`w-full px-4 py-3 border rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all duration-200 ${errors.name ? 'border-red-500 bg-red-50' : 'border-gray-300 hover:border-gray-400'}`}
              placeholder="أدخل اسم الشريك الكامل"
              required
            />
            {errors.name && (
              <p className="mt-2 text-sm text-red-600 flex items-center">
                <AlertCircle className="w-4 h-4 ml-1" />
                {errors.name}
              </p>
            )}
          </div>
          <div>
            <label htmlFor="national_id" className="block text-sm font-medium text-gray-700 mb-2">
              <span className="inline-flex items-center gap-2">
                <BadgeCheck className="h-4 w-4 text-indigo-500" />
                رقم الهوية الوطنية
              </span>
            </label>
            <input
              type="text"
              id="national_id"
              name="national_id"
              value={formData.national_id}
              onChange={handleChange}
              className={`w-full px-4 py-3 border rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all duration-200 ${errors.national_id ? 'border-red-500 bg-red-50' : 'border-gray-300 hover:border-gray-400'}`}
              placeholder="أدخل رقم الهوية (اختياري)"
            />
            {errors.national_id && (
              <p className="mt-2 text-sm text-red-600 flex items-center">
                <AlertCircle className="w-4 h-4 ml-1" />
                {errors.national_id}
              </p>
            )}
          </div>
          <div>
            <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-2">
              <span className="inline-flex items-center gap-2">
                <Phone className="h-4 w-4 text-sky-500" />
                رقم الهاتف
              </span>
            </label>
            <input
              type="text"
              id="phone"
              name="phone"
              value={formData.phone}
              onChange={handleChange}
              className={`w-full px-4 py-3 border rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all duration-200 ${errors.phone ? 'border-red-500 bg-red-50' : 'border-gray-300 hover:border-gray-400'}`}
              placeholder="مثال: +966512345678"
            />
            {errors.phone && (
              <p className="mt-2 text-sm text-red-600 flex items-center">
                <AlertCircle className="w-4 h-4 ml-1" />
                {errors.phone}
              </p>
            )}
          </div>
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
              <span className="inline-flex items-center gap-2">
                <Mail className="h-4 w-4 text-rose-500" />
                البريد الإلكتروني
              </span>
            </label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              className={`w-full px-4 py-3 border rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all duration-200 ${errors.email ? 'border-red-500 bg-red-50' : 'border-gray-300 hover:border-gray-400'}`}
              placeholder="مثال: partner@company.com"
            />
            {errors.email && (
              <p className="mt-2 text-sm text-red-600 flex items-center">
                <AlertCircle className="w-4 h-4 ml-1" />
                {errors.email}
              </p>
            )}
          </div>

          {/* Initial Capital field - only for new partners */}
          {!partner && (
            <div className="md:col-span-2 bg-gradient-to-br from-emerald-50 to-blue-50 p-6 rounded-xl border border-emerald-200">
              <label htmlFor="initial_capital" className="block text-sm font-medium text-gray-700 mb-2">
                <span className="inline-flex items-center gap-2">
                  <Coins className="h-4 w-4 text-emerald-500" />
                  رأس المال الأولي (دولار أمريكي)
                </span>
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                id="initial_capital"
                name="initial_capital"
                value={formData.initial_capital}
                onChange={handleChange}
                className={`w-full px-4 py-3 border rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all duration-200 ${errors.initial_capital ? 'border-red-500 bg-red-50' : 'border-emerald-300 hover:border-emerald-400 bg-white'}`}
                placeholder="مثال: 50000"
              />
              {errors.initial_capital && (
                <p className="mt-2 text-sm text-red-600 flex items-center">
                  <AlertCircle className="w-4 h-4 ml-1" />
                  {errors.initial_capital}
                </p>
              )}
              <div className="mt-3 p-3 bg-white/70 rounded-lg border border-emerald-200">
                <p className="text-sm text-emerald-700 flex items-center">
                  <Info className="w-4 h-4 ml-1 text-emerald-500" />
                  سيتم إضافة هذا المبلغ كإيداع أولي في حركات رأس المال للشريك
                </p>
              </div>
            </div>
          )}
        </div>
        <div className="bg-gradient-to-br from-purple-50 to-blue-50 p-6 rounded-xl border border-purple-200 mb-8">
          <div className="flex items-center">
            <input
              id="active"
              name="active"
              type="checkbox"
              checked={formData.active}
              onChange={handleChange}
              className="h-5 w-5 text-purple-600 focus:ring-purple-500 border-gray-300 rounded-md"
            />
            <label htmlFor="active" className="ml-3 block text-sm font-medium text-gray-700">
              <span className="inline-flex items-center gap-2">
                <UserCheck className="h-4 w-4 text-purple-500" />
                شريك نشط
              </span>
            </label>
          </div>
          <p className="mt-2 text-xs text-gray-600 mr-8">
            الشريك النشط يمكنه المشاركة في جميع العمليات والأرباح
          </p>
        </div>

        <div className="flex flex-col sm:flex-row sm:justify-end gap-4">
          <button
            type="button"
            onClick={onCancel}
            className="w-full sm:w-auto px-6 py-3 border border-gray-300 rounded-xl shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 transition-all duration-200"
            disabled={loading}
          >
            <span className="flex items-center justify-center">
              <X className="w-4 h-4 ml-2" />
              إلغاء
            </span>
          </button>
          <button
            type="submit"
            className="w-full sm:w-auto px-6 py-3 border border-transparent rounded-xl shadow-sm text-sm font-medium text-white bg-gradient-to-r from-purple-500 to-blue-600 hover:from-purple-600 hover:to-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
            disabled={loading}
          >
            <span className="flex items-center justify-center">
              {loading ? (
                <>
                  <Loader2 className="animate-spin -ml-1 mr-3 h-4 w-4 text-white" />
                  جاري الحفظ...
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4 ml-2" />
                  {partner ? 'تحديث الشريك' : 'حفظ الشريك'}
                </>
              )}
            </span>
          </button>
        </div>
      </form>
    </div>
  );
};

export default PartnerForm;
