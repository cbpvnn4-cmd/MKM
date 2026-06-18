import React, { useState, useEffect } from 'react';
import { createPartnerCapitalMovement, getPartners } from '../services/api';

const CapitalMovementForm = ({ partnerId, onSave, onCancel }) => {
  const [formData, setFormData] = useState({
    partner_id: partnerId || '',
    movement_type: 'DEPOSIT',
    amount_usd: '',
    happened_at: new Date().toISOString().split('T')[0],
    note: ''
  });
  const [partners, setPartners] = useState([]);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!partnerId) {
      fetchPartners();
    }
  }, [partnerId]);

  const fetchPartners = async () => {
    try {
      const data = await getPartners();
      setPartners(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Error fetching partners:', err);
      setPartners([]);
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.partner_id) {
      newErrors.partner_id = 'يرجى اختيار الشريك';
    }

    if (!formData.amount_usd || isNaN(formData.amount_usd) || parseFloat(formData.amount_usd) <= 0) {
      newErrors.amount_usd = 'يرجى إدخال مبلغ صحيح أكبر من صفر';
    }

    if (!formData.happened_at) {
      newErrors.happened_at = 'يرجى اختيار تاريخ الحركة';
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
      const dataToSubmit = {
        movement_type: formData.movement_type,
        amount_usd: parseFloat(formData.amount_usd),
        happened_at: formData.happened_at,
        note: formData.note || null
      };

      const result = await createPartnerCapitalMovement(formData.partner_id, dataToSubmit);
      onSave(result);
    } catch (err) {
      if (err.response?.data?.detail) {
        setError(err.response.data.detail);
      } else if (err.response?.data) {
        setErrors(err.response.data);
      } else {
        setError('فشل في حفظ حركة رأس المال');
      }
      console.error('Error saving capital movement:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h2 className="text-2xl font-bold text-gray-800 mb-6">
        إضافة حركة رأس مال جديدة
      </h2>
      {error && (
        <div className="mb-4 text-red-500 bg-red-50 p-3 rounded">
          {error}
        </div>
      )}
      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          {!partnerId && (
            <div className="md:col-span-2">
              <label htmlFor="partner_id" className="block text-sm font-medium text-gray-700 mb-1">
                الشريك *
              </label>
              <select
                id="partner_id"
                name="partner_id"
                value={formData.partner_id}
                onChange={handleChange}
                className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 ${errors.partner_id ? 'border-red-500' : 'border-gray-300'}`}
                required
              >
                <option value="">اختر الشريك</option>
                {partners.map((partner) => (
                  <option key={partner.id} value={partner.id}>
                    {partner.name}
                  </option>
                ))}
              </select>
              {errors.partner_id && <p className="mt-1 text-sm text-red-600">{errors.partner_id}</p>}
            </div>
          )}

          <div>
            <label htmlFor="movement_type" className="block text-sm font-medium text-gray-700 mb-1">
              نوع الحركة *
            </label>
            <select
              id="movement_type"
              name="movement_type"
              value={formData.movement_type}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              required
            >
              <option value="DEPOSIT">إيداع</option>
              <option value="WITHDRAW">سحب</option>
            </select>
          </div>

          <div>
            <label htmlFor="amount_usd" className="block text-sm font-medium text-gray-700 mb-1">
              المبلغ (دولار أمريكي) *
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              id="amount_usd"
              name="amount_usd"
              value={formData.amount_usd}
              onChange={handleChange}
              className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 ${errors.amount_usd ? 'border-red-500' : 'border-gray-300'}`}
              required
            />
            {errors.amount_usd && <p className="mt-1 text-sm text-red-600">{errors.amount_usd}</p>}
          </div>

          <div>
            <label htmlFor="happened_at" className="block text-sm font-medium text-gray-700 mb-1">
              تاريخ الحركة *
            </label>
            <input
              type="date"
              id="happened_at"
              name="happened_at"
              value={formData.happened_at}
              onChange={handleChange}
              className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 ${errors.happened_at ? 'border-red-500' : 'border-gray-300'}`}
              required
            />
            {errors.happened_at && <p className="mt-1 text-sm text-red-600">{errors.happened_at}</p>}
          </div>

          <div className="md:col-span-2">
            <label htmlFor="note" className="block text-sm font-medium text-gray-700 mb-1">
              ملاحظات
            </label>
            <textarea
              id="note"
              name="note"
              rows="3"
              value={formData.note}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              placeholder="ملاحظات إضافية حول هذه الحركة..."
            />
          </div>
        </div>

        <div className="flex justify-end space-x-3">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            disabled={loading}
          >
            إلغاء
          </button>
          <button
            type="submit"
            className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
            disabled={loading}
          >
            {loading ? 'جاري الحفظ...' : 'حفظ الحركة'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default CapitalMovementForm;