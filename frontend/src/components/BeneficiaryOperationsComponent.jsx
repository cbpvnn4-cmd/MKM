import React, { useState } from 'react';
import { Plus, DollarSign, TrendingUp, AlertCircle, CheckCircle, FileText } from 'lucide-react';

const BeneficiaryOperationsComponent = ({ beneficiaries, decisions, profitRuns, onOperationComplete }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [operationType, setOperationType] = useState('CASH'); // CASH or CAPITAL
  const [formData, setFormData] = useState({
    beneficiary_id: '',
    profit_run_id: '',
    amount_usd: '',
    decided_at: new Date().toISOString().split('T')[0],
    notes: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  const openModal = (type) => {
    setOperationType(type);
    setIsModalOpen(true);
    setError(null);
    setSuccess(false);
    setFormData({
      beneficiary_id: '',
      profit_run_id: '',
      amount_usd: '',
      decided_at: new Date().toISOString().split('T')[0],
      notes: ''
    });
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setFormData({
      beneficiary_id: '',
      profit_run_id: '',
      amount_usd: '',
      decided_at: new Date().toISOString().split('T')[0],
      notes: ''
    });
    setError(null);
    setSuccess(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.beneficiary_id || !formData.profit_run_id || !formData.amount_usd || parseFloat(formData.amount_usd) <= 0) {
      setError('يرجى ملء جميع الحقول المطلوبة بقيم صحيحة');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const token = localStorage.getItem('access_token') || sessionStorage.getItem('access_token');
      if (!token) {
        throw new Error('لم يتم العثور على جلسة صالحة. يرجى تسجيل الدخول.');
      }
      const response = await fetch('/api/profit-distribution/decisions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          beneficiary_id: parseInt(formData.beneficiary_id),
          profit_run_id: parseInt(formData.profit_run_id),
          decision_type: operationType,
          amount_usd: parseFloat(formData.amount_usd),
          decided_at: formData.decided_at,
          notes: formData.notes || (operationType === 'CASH' ? 'سحب نقدي' : 'تحويل لرأس المال')
        })
      });

      if (!response.ok) {
        throw new Error('فشل في إنشاء القرار');
      }

      setSuccess(true);
      setTimeout(() => {
        closeModal();
        if (onOperationComplete) {
          onOperationComplete();
        }
      }, 1500);
    } catch (err) {
      setError('فشل في تنفيذ العملية، حاول مرة أخرى');
      console.error('Error creating decision:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Get available profit runs that haven't been fully distributed
  const getAvailableProfitRuns = () => {
    const usedRuns = new Set(decisions.map(d => d.profit_run_id));
    const idOf = (run) => (run?.run_id ?? run?.id);
    return Object.values(profitRuns).filter(run => {
      const rid = idOf(run);
      return !usedRuns.has(rid) || rid === parseInt(formData.profit_run_id);
    });
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
    const date = new Date(dateString);
    return date.toLocaleDateString('ar-EG', { year: 'numeric', month: 'long' });
  };

  return (
    <>
      {/* Action Buttons */}
      <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 p-6 mb-8">
        <h3 className="text-xl font-bold text-gray-800 mb-6 flex items-center">
          <DollarSign className="w-6 h-6 text-purple-600 ml-2" />
          عمليات التوزيع الجديدة
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Cash Withdrawal Button */}
          <button
            onClick={() => openModal('CASH')}
            className="group relative bg-gradient-to-br from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 text-white rounded-xl p-6 transition-all duration-200 transform hover:scale-105 shadow-lg hover:shadow-xl"
          >
            <div className="flex items-center justify-between">
              <div className="text-right">
                <h4 className="text-lg font-bold">سحب نقدي</h4>
                <p className="text-emerald-100 text-sm mt-1">إنشاء قرار سحب نقدي للمستفيد</p>
              </div>
              <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                <DollarSign className="w-6 h-6" />
              </div>
            </div>
          </button>

          {/* Capital Transfer Button */}
          <button
            onClick={() => openModal('CAPITAL')}
            className="group relative bg-gradient-to-br from-purple-500 to-blue-600 hover:from-purple-600 hover:to-blue-700 text-white rounded-xl p-6 transition-all duration-200 transform hover:scale-105 shadow-lg hover:shadow-xl"
          >
            <div className="flex items-center justify-between">
              <div className="text-right">
                <h4 className="text-lg font-bold">تحويل لرأس المال</h4>
                <p className="text-purple-100 text-sm mt-1">إنشاء قرار تحويل لرأس المال</p>
              </div>
              <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                <TrendingUp className="w-6 h-6" />
              </div>
            </div>
          </button>
        </div>
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className={`${operationType === 'CASH' ? 'bg-gradient-to-r from-emerald-500 to-green-600' : 'bg-gradient-to-r from-purple-500 to-blue-600'} px-6 py-4 rounded-t-2xl`}>
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold text-white flex items-center">
                  {operationType === 'CASH' ? (
                    <>
                      <DollarSign className="w-6 h-6 ml-2" />
                      سحب نقدي جديد
                    </>
                  ) : (
                    <>
                      <TrendingUp className="w-6 h-6 ml-2" />
                      تحويل لرأس المال جديد
                    </>
                  )}
                </h3>
                <button
                  onClick={closeModal}
                  className="text-white hover:bg-white/20 rounded-lg p-1 transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            <div className="p-6">
              {error && (
                <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-xl flex items-center text-red-700">
                  <AlertCircle className="w-5 h-5 ml-2" />
                  {error}
                </div>
              )}

              {success && (
                <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-xl flex items-center text-green-700">
                  <CheckCircle className="w-5 h-5 ml-2" />
                  تم إنشاء القرار بنجاح!
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Beneficiary Selection */}
                <div>
                  <label htmlFor="beneficiary_id" className="block text-sm font-medium text-gray-700 mb-2">
                    👤 المستفيد *
                  </label>
                  <select
                    id="beneficiary_id"
                    name="beneficiary_id"
                    value={formData.beneficiary_id}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all duration-200"
                    required
                  >
                    <option value="">اختر المستفيد</option>
                    {beneficiaries.map(beneficiary => (
                      <option key={beneficiary.id} value={beneficiary.id}>
                        {beneficiary.name} (نسبة: {beneficiary.percentage}%)
                      </option>
                    ))}
                  </select>
                </div>

                {/* Profit Run Selection */}
                <div>
                  <label htmlFor="profit_run_id" className="block text-sm font-medium text-gray-700 mb-2">
                    📊 فترة الربح *
                  </label>
                  <select
                    id="profit_run_id"
                    name="profit_run_id"
                    value={formData.profit_run_id}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all duration-200"
                    required
                  >
                    <option value="">اختر فترة الربح</option>
                    {getAvailableProfitRuns().map(run => {
                      const rid = run?.run_id ?? run?.id;
                      const rmonth = run?.month ?? run?.run_month;
                      return (
                        <option key={rid} value={rid}>
                          {formatDate(rmonth)}
                        </option>
                      );
                    })}
                  </select>
                </div>

                {/* Amount Input */}
                <div>
                  <label htmlFor="amount_usd" className="block text-sm font-medium text-gray-700 mb-2">
                    💰 المبلغ (دولار أمريكي) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    id="amount_usd"
                    name="amount_usd"
                    value={formData.amount_usd}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all duration-200"
                    placeholder="أدخل المبلغ"
                    required
                  />
                </div>

                {/* Date Input */}
                <div>
                  <label htmlFor="decided_at" className="block text-sm font-medium text-gray-700 mb-2">
                    📅 تاريخ القرار *
                  </label>
                  <input
                    type="date"
                    id="decided_at"
                    name="decided_at"
                    value={formData.decided_at}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all duration-200"
                    required
                  />
                </div>

                {/* Notes Input */}
                <div>
                  <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-2">
                    📝 ملاحظات (اختياري)
                  </label>
                  <textarea
                    id="notes"
                    name="notes"
                    value={formData.notes}
                    onChange={handleInputChange}
                    rows={3}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all duration-200 resize-none"
                    placeholder={`أدخل تفاصيل إضافية عن قرار ${operationType === 'CASH' ? 'السحب النقدي' : 'التحويل لرأس المال'}`}
                  />
                </div>

                {/* Action Buttons */}
                <div className="flex flex-col sm:flex-row gap-3 pt-4">
                  <button
                    type="button"
                    onClick={closeModal}
                    className="w-full sm:w-auto px-6 py-3 border border-gray-300 rounded-xl shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 transition-all duration-200"
                    disabled={loading}
                  >
                    إلغاء
                  </button>
                  <button
                    type="submit"
                    className={`w-full sm:w-auto px-6 py-3 border border-transparent rounded-xl shadow-sm text-sm font-medium text-white ${
                      operationType === 'CASH'
                        ? 'bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700'
                        : 'bg-gradient-to-r from-purple-500 to-blue-600 hover:from-purple-600 hover:to-blue-700'
                    } focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200`}
                    disabled={loading}
                  >
                    {loading ? (
                      <span className="flex items-center justify-center">
                        <svg className="animate-spin -ml-1 mr-3 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        جاري التنفيذ...
                      </span>
                    ) : (
                      `إنشاء ${operationType === 'CASH' ? 'السحب النقدي' : 'التحويل لرأس المال'}`
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default BeneficiaryOperationsComponent;
