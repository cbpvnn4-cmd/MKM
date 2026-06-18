import React, { useState, useEffect } from 'react';
import { createPartnerOwnershipSnapshot, getPartners } from '../services/api';

const OwnershipSnapshotForm = ({ snapshot, onSave, onCancel }) => {
  const [formData, setFormData] = useState({
    partner_id: '',
    equity_pct: '',
    equity_usd: '',
    snapshot_on: new Date().toISOString().split('T')[0]
  });
  const [partners, setPartners] = useState([]);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchPartners();
    if (snapshot) {
      const existingPct = snapshot.equity_pct ?? snapshot.ownership_percentage;
      const existingValue = snapshot.equity_usd ?? snapshot.ownership_value;
      const existingDate = snapshot.snapshot_on ?? snapshot.snapshot_date;

      setFormData({
        partner_id: snapshot.partner_id ? String(snapshot.partner_id) : '',
        equity_pct: existingPct !== undefined ? String(existingPct) : '',
        equity_usd: existingValue !== undefined ? String(existingValue) : '',
        snapshot_on: existingDate || new Date().toISOString().split('T')[0]
      });
    }
  }, [snapshot]);

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

    const pct = parseFloat(formData.equity_pct);
    if (Number.isNaN(pct) || pct < 0 || pct > 100) {
      newErrors.equity_pct = 'يرجى إدخال نسبة ملكية صحيحة بين 0 و 100';
    }

    const equityValue = parseFloat(formData.equity_usd);
    if (Number.isNaN(equityValue) || equityValue < 0) {
      newErrors.equity_usd = 'يرجى إدخال قيمة ملكية صحيحة';
    }

    if (!formData.snapshot_on) {
      newErrors.snapshot_on = 'يرجى اختيار تاريخ اللقطة';
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
      const partnerId = parseInt(formData.partner_id, 10);
      const payload = {
        equity_pct: parseFloat(formData.equity_pct),
        equity_usd: parseFloat(formData.equity_usd),
        snapshot_on: formData.snapshot_on,
        // Legacy field names for backward compatibility
        ownership_percentage: parseFloat(formData.equity_pct),
        ownership_value: parseFloat(formData.equity_usd),
        snapshot_date: formData.snapshot_on
      };

      const result = await createPartnerOwnershipSnapshot(partnerId, payload);
      onSave(result);
    } catch (err) {
      if (err.response?.data?.detail) {
        setError(err.response.data.detail);
      } else if (err.response?.data) {
        setErrors(err.response.data);
      } else {
        setError('فشل في حفظ لقطة الملكية');
      }
      console.error('Error saving ownership snapshot:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h2 className="text-2xl font-bold text-gray-800 mb-6">
        {snapshot ? 'تعديل لقطة الملكية' : 'إضافة لقطة ملكية جديدة'}
      </h2>
      {error && (
        <div className="mb-4 text-red-500 bg-red-50 p-3 rounded">
          {error}
        </div>
      )}
      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div>
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

          <div>
            <label htmlFor="equity_pct" className="block text-sm font-medium text-gray-700 mb-1">
              نسبة الملكية (%) *
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              max="100"
              id="equity_pct"
              name="equity_pct"
              value={formData.equity_pct}
              onChange={handleChange}
              className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 ${errors.equity_pct ? 'border-red-500' : 'border-gray-300'}`}
              placeholder="أدخل نسبة الملكية"
              required
            />
            {errors.equity_pct && <p className="mt-1 text-sm text-red-600">{errors.equity_pct}</p>}
          </div>

          <div>
            <label htmlFor="equity_usd" className="block text-sm font-medium text-gray-700 mb-1">
              قيمة الملكية (دولار) *
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              id="equity_usd"
              name="equity_usd"
              value={formData.equity_usd}
              onChange={handleChange}
              className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 ${errors.equity_usd ? 'border-red-500' : 'border-gray-300'}`}
              placeholder="أدخل قيمة الملكية بالدولار"
              required
            />
            {errors.equity_usd && <p className="mt-1 text-sm text-red-600">{errors.equity_usd}</p>}
          </div>

          <div>
            <label htmlFor="snapshot_on" className="block text-sm font-medium text-gray-700 mb-1">
              تاريخ اللقطة *
            </label>
            <input
              type="date"
              id="snapshot_on"
              name="snapshot_on"
              value={formData.snapshot_on}
              onChange={handleChange}
              className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 ${errors.snapshot_on ? 'border-red-500' : 'border-gray-300'}`}
              required
            />
            {errors.snapshot_on && <p className="mt-1 text-sm text-red-600">{errors.snapshot_on}</p>}
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
            {loading ? 'جاري الحفظ...' : (snapshot ? 'تحديث اللقطة' : 'حفظ اللقطة')}
          </button>
        </div>
      </form>
    </div>
  );
};

export default OwnershipSnapshotForm;
