import React, { useState, useEffect } from 'react';
import { createSupplier, updateSupplier } from '../services/api';

const baseFormState = {
  name: '',
  contactPerson: '',
  phone: '',
  email: '',
  address: '',
  taxId: '',
  notes: '',
};

const SupplierForm = ({ supplier, onSave, onCancel }) => {
  const [formData, setFormData] = useState(baseFormState);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [fieldErrors, setFieldErrors] = useState({});

  useEffect(() => {
    if (supplier) {
      setFormData({
        name: supplier.name || '',
        contactPerson: supplier.contact_person || supplier.contactPerson || '',
        phone: supplier.phone || '',
        email: supplier.email || '',
        address: supplier.address || '',
        taxId: supplier.tax_id || supplier.taxId || '',
        notes: supplier.notes || supplier.description || '',
      });
    } else {
      setFormData({ ...baseFormState });
    }
  }, [supplier]);

  const validateForm = () => {
    const errors = {};

    if (!formData.name.trim()) {
      errors.name = 'اسم المورد مطلوب لإكمال التسجيل';
    } else if (formData.name.trim().length < 2) {
      errors.name = 'اسم المورد يجب أن يتكون من حرفين على الأقل';
    }

    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      errors.email = 'الرجاء إدخال بريد إلكتروني صالح';
    }

    if (formData.phone && !/^[+]?[\d\s\-()]+$/.test(formData.phone)) {
      errors.phone = 'الرجاء إدخال رقم هاتف صحيح';
    }

    return errors;
  };

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));

    if (fieldErrors[name]) {
      setFieldErrors((prev) => ({
        ...prev,
        [name]: '',
      }));
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError(null);

    const validationErrors = validateForm();
    if (Object.keys(validationErrors).length > 0) {
      setFieldErrors(validationErrors);
      return;
    }

    setLoading(true);

    try {
      let result;

      const payload = {
        name: formData.name,
        contact_person: formData.contactPerson,
        phone: formData.phone,
        email: formData.email,
        address: formData.address,
        tax_id: formData.taxId,
      };

      const trimmedNotes = formData.notes.trim();
      if (trimmedNotes) {
        payload.notes = trimmedNotes;
      }

      if (supplier && supplier.id) {
        result = await updateSupplier(supplier.id, payload);
      } else {
        result = await createSupplier(payload);
      }

      onSave?.(result);
    } catch (err) {
      if (err.response?.status === 422) {
        const backendErrors = err.response.data.detail || [];
        const formattedErrors = {};

        backendErrors.forEach((backendError) => {
          if (backendError.loc && backendError.loc.length > 1) {
            const field = backendError.loc[1];
            formattedErrors[field] = backendError.msg;
          }
        });

        setFieldErrors(formattedErrors);
      } else {
        setError(err.response?.data?.detail || 'تعذر حفظ بيانات المورد. حاول مرة أخرى لاحقًا.');
      }
      console.error('Error saving supplier:', err);
    } finally {
      setLoading(false);
    }
  };

  const inputClasses = (hasError) =>
    `w-full px-4 py-3 rounded-lg border ${
      hasError ? 'border-rose-400 focus:border-rose-500 focus:ring-rose-200' : 'border-gray-300 focus:border-blue-500 focus:ring-blue-200'
    } shadow-sm bg-white text-right placeholder-gray-400 focus:outline-none focus:ring-2 transition`;

  return (
    <div className="relative bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
      {loading && (
        <div className="absolute inset-0 bg-white/60 backdrop-blur-sm flex items-center justify-center z-10">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600" />
        </div>
      )}

      <div className="px-6 py-5 border-b border-gray-200 bg-gradient-to-l from-blue-50 to-white text-right">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-800 mb-1">
              {supplier ? 'تحديث بيانات المورد' : 'تسجيل مورد جديد'}
            </h2>
            <p className="text-sm text-gray-500">
              أدخل بيانات المورد بالتسلسل لضمان اكتمال الملفات وتعزيز تجربة التعاون.
            </p>
          </div>
          <div className="flex flex-wrap gap-3 text-sm text-gray-600">
            <span className="inline-flex items-center px-3 py-1 rounded-full bg-blue-100 text-blue-700">
              1. المعلومات الأساسية
            </span>
            <span className="inline-flex items-center px-3 py-1 rounded-full bg-emerald-100 text-emerald-700">
              2. بيانات التواصل
            </span>
            <span className="inline-flex items-center px-3 py-1 rounded-full bg-purple-100 text-purple-700">
              3. التوثيق والملاحظات
            </span>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="px-6 py-8 space-y-8 text-right" dir="rtl">
        {error && (
          <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-rose-700">
            {error}
          </div>
        )}

        <section className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-800">المعلومات الأساسية</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
                اسم المورد *
              </label>
              <input
                type="text"
                id="name"
                name="name"
                autoComplete="organization"
                value={formData.name}
                onChange={handleChange}
                className={inputClasses(Boolean(fieldErrors.name))}
                placeholder="أدخل الاسم التجاري أو القانوني للمورد"
                disabled={loading}
              />
              {fieldErrors.name && (
                <p className="mt-2 text-sm text-rose-600">{fieldErrors.name}</p>
              )}
            </div>
            <div>
              <label htmlFor="taxId" className="block text-sm font-medium text-gray-700 mb-2">
                المعرّف الضريبي (إن وجد)
              </label>
              <input
                type="text"
                id="taxId"
                name="taxId"
                autoComplete="off"
                value={formData.taxId}
                onChange={handleChange}
                className={inputClasses(Boolean(fieldErrors.taxId))}
                placeholder="مثال: 310123456700003"
                disabled={loading}
              />
              {fieldErrors.taxId && (
                <p className="mt-2 text-sm text-rose-600">{fieldErrors.taxId}</p>
              )}
            </div>
          </div>
        </section>

        <section className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-800">بيانات التواصل</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label htmlFor="contactPerson" className="block text-sm font-medium text-gray-700 mb-2">
                مسؤول التواصل
              </label>
              <input
                type="text"
                id="contactPerson"
                name="contactPerson"
                autoComplete="name"
                value={formData.contactPerson}
                onChange={handleChange}
                className={inputClasses(Boolean(fieldErrors.contactPerson))}
                placeholder="اسم الشخص المسؤول عن التواصل"
                disabled={loading}
              />
              {fieldErrors.contactPerson && (
                <p className="mt-2 text-sm text-rose-600">{fieldErrors.contactPerson}</p>
              )}
            </div>
            <div>
              <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-2">
                رقم الهاتف
              </label>
              <input
                type="tel"
                id="phone"
                name="phone"
                autoComplete="tel"
                value={formData.phone}
                onChange={handleChange}
                className={inputClasses(Boolean(fieldErrors.phone))}
                placeholder="مثال: +966 5X XXX XXXX"
                disabled={loading}
              />
              {fieldErrors.phone && (
                <p className="mt-2 text-sm text-rose-600">{fieldErrors.phone}</p>
              )}
            </div>
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                البريد الإلكتروني
              </label>
              <input
                type="email"
                id="email"
                name="email"
                autoComplete="email"
                value={formData.email}
                onChange={handleChange}
                className={inputClasses(Boolean(fieldErrors.email))}
                placeholder="example@supplier.com"
                disabled={loading}
              />
              {fieldErrors.email && (
                <p className="mt-2 text-sm text-rose-600">{fieldErrors.email}</p>
              )}
            </div>
            <div>
              <label htmlFor="address" className="block text-sm font-medium text-gray-700 mb-2">
                عنوان المورد
              </label>
              <textarea
                id="address"
                name="address"
                rows={3}
                value={formData.address}
                onChange={handleChange}
                className={`${inputClasses(Boolean(fieldErrors.address))} resize-none`}
                placeholder="المدينة، الشارع، أي تفاصيل إضافية"
                disabled={loading}
              />
              {fieldErrors.address && (
                <p className="mt-2 text-sm text-rose-600">{fieldErrors.address}</p>
              )}
            </div>
          </div>
        </section>

        <section className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-800">ملاحظات إضافية</h3>
          <div className="grid grid-cols-1">
            <textarea
              id="notes"
              name="notes"
              rows={4}
              value={formData.notes}
              onChange={handleChange}
              className={`${inputClasses(Boolean(fieldErrors.notes))} resize-none`}
              placeholder="سجّل مجالات التوريد، شروط الدفع، أو أي تفاصيل تود تذكرها"
              disabled={loading}
            />
            {fieldErrors.notes && (
              <p className="mt-2 text-sm text-rose-600">{fieldErrors.notes}</p>
            )}
          </div>
        </section>

        <div className="flex flex-col-reverse md:flex-row md:items-center md:justify-between gap-4">
          <button
            type="button"
            onClick={() => onCancel?.()}
            className="inline-flex items-center justify-center px-6 py-3 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors"
            disabled={loading}
          >
            إلغاء والرجوع للقائمة
          </button>
          <div className="flex flex-wrap gap-3">
            <span className="inline-flex items-center px-3 py-2 rounded-lg bg-blue-50 text-blue-700 text-sm">
              سيتم إرسال إشعار للفريق بعد الحفظ
            </span>
            <button
              type="submit"
              className="inline-flex items-center justify-center px-6 py-3 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors shadow"
              disabled={loading}
            >
              {supplier ? 'تحديث بيانات المورد' : 'حفظ المورد الجديد'}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};

export default SupplierForm;
