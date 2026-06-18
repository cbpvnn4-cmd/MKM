import React, { useState, useEffect } from 'react';
import { createWarehouse, updateWarehouse } from '../services/api';

const WarehouseForm = ({ warehouse, onSave, onCancel }) => {
  const [formData, setFormData] = useState({
    name: warehouse?.name || '',
    location: warehouse?.location || '',
    capacity: warehouse?.capacity || '',
    description: warehouse?.description || '',
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (warehouse) {
      setFormData({
        name: warehouse.name || '',
        location: warehouse.location || '',
        capacity: warehouse.capacity || '',
        description: warehouse.description || '',
      });
    }
  }, [warehouse]);

  const validateForm = () => {
    const newErrors = {};

    if (!formData.name.trim()) {
      newErrors.name = 'اسم المخزن مطلوب';
    }

    if (!formData.location.trim()) {
      newErrors.location = 'موقع المخزن مطلوب';
    }

    if (!formData.capacity.trim()) {
      newErrors.capacity = 'سعة المخزن مطلوبة';
    } else {
      const capacity = parseFloat(formData.capacity);
      if (isNaN(capacity) || capacity <= 0) {
        newErrors.capacity = 'يرجى إدخال سعة صحيحة أكبر من صفر';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));

    // Clear error when user starts typing
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
      const warehouseData = {
        name: formData.name.trim(),
        location: formData.location.trim(),
        capacity: parseFloat(formData.capacity),
        description: formData.description.trim() || null,
      };

      let savedWarehouse;
      if (warehouse) {
        // Update existing warehouse
        savedWarehouse = await updateWarehouse(warehouse.id, warehouseData);
      } else {
        // Create new warehouse
        savedWarehouse = await createWarehouse(warehouseData);
      }

      // Call the onSave callback with the saved warehouse data
      onSave(savedWarehouse);
    } catch (err) {
      console.error('Error saving warehouse:', err);
      setError(err.response?.data?.detail || err.message || 'فشل في حفظ بيانات المخزن');
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
        {/* اسم المخزن */}
        <div>
          <label htmlFor="name" className="block text-sm font-semibold text-gray-700 mb-3">
            اسم المخزن *
          </label>
          <input
            type="text"
            id="name"
            name="name"
            value={formData.name}
            onChange={handleChange}
            className={`w-full px-4 py-3 border-2 rounded-xl shadow-sm bg-white/70 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 ${
              errors.name ? 'border-red-300' : 'border-gray-200'
            }`}
            placeholder="مثال: المخزن الرئيسي"
          />
          {errors.name && <p className="mt-2 text-sm text-red-600">{errors.name}</p>}
        </div>

        {/* موقع المخزن */}
        <div>
          <label htmlFor="location" className="block text-sm font-semibold text-gray-700 mb-3">
            موقع المخزن *
          </label>
          <input
            type="text"
            id="location"
            name="location"
            value={formData.location}
            onChange={handleChange}
            className={`w-full px-4 py-3 border-2 rounded-xl shadow-sm bg-white/70 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 ${
              errors.location ? 'border-red-300' : 'border-gray-200'
            }`}
            placeholder="مثال: الرياض - حي الملز"
          />
          {errors.location && <p className="mt-2 text-sm text-red-600">{errors.location}</p>}
        </div>

        {/* سعة المخزن */}
        <div>
          <label htmlFor="capacity" className="block text-sm font-semibold text-gray-700 mb-3">
            السعة التخزينية * (قطعة)
          </label>
          <input
            type="number"
            id="capacity"
            name="capacity"
            value={formData.capacity}
            onChange={handleChange}
            min="1"
            step="0.01"
            className={`w-full px-4 py-3 border-2 rounded-xl shadow-sm bg-white/70 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 ${
              errors.capacity ? 'border-red-300' : 'border-gray-200'
            }`}
            placeholder="مثال: 10000"
          />
          {errors.capacity && <p className="mt-2 text-sm text-red-600">{errors.capacity}</p>}
        </div>

        {/* وصف المخزن */}
        <div>
          <label htmlFor="description" className="block text-sm font-semibold text-gray-700 mb-3">
            وصف المخزن (اختياري)
          </label>
          <textarea
            id="description"
            name="description"
            value={formData.description}
            onChange={handleChange}
            rows={3}
            className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl shadow-sm bg-white/70 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
            placeholder="وصف إضافي للمخزن..."
          />
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
          className="px-6 py-3 bg-gradient-to-r from-green-500 to-blue-600 text-white font-semibold rounded-xl hover:from-green-600 hover:to-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transform hover:scale-105 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
        >
          {loading ? (
            <div className="flex items-center">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white ml-2"></div>
              {warehouse ? 'جاري التحديث...' : 'جاري الحفظ...'}
            </div>
          ) : (
            warehouse ? 'تحديث المخزن' : 'إضافة المخزن'
          )}
        </button>
      </div>
    </form>
  );
};

export default WarehouseForm;