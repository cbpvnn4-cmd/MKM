import React, { useState } from 'react';
import { Plus, Minus, DollarSign, Calendar, FileText, AlertCircle, CheckCircle } from 'lucide-react';
import { createPartnerCapitalMovement } from '../services/api';

const FinancialOperations = ({ partnerId, onOperationComplete }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [operationType, setOperationType] = useState('DEPOSIT'); // DEPOSIT or WITHDRAW
  const [formData, setFormData] = useState({
    amount_usd: '',
    happened_at: new Date().toISOString().split('T')[0],
    note: ''
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
      amount_usd: '',
      happened_at: new Date().toISOString().split('T')[0],
      note: ''
    });
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setFormData({
      amount_usd: '',
      happened_at: new Date().toISOString().split('T')[0],
      note: ''
    });
    setError(null);
    setSuccess(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.amount_usd || parseFloat(formData.amount_usd) <= 0) {
      setError('يرجى إدخال مبلغ صحيح');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await createPartnerCapitalMovement(partnerId, {
        movement_type: operationType,
        amount_usd: parseFloat(formData.amount_usd),
        happened_at: formData.happened_at,
        note: formData.note || (operationType === 'DEPOSIT' ? 'إيداع' : 'سحب')
      });

      setSuccess(true);
      setTimeout(() => {
        closeModal();
        if (onOperationComplete) {
          onOperationComplete();
        }
      }, 1500);
    } catch (err) {
      setError('فشل في تنفيذ العملية، حاول مرة أخرى');
      console.error('Error creating capital movement:', err);
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

  return (
    <>
      {/* Action Buttons */}
      <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 p-6">
        <h3 className="text-xl font-bold text-gray-800 mb-6 flex items-center">
          <DollarSign className="w-6 h-6 text-purple-600 ml-2" />
          العمليات المالية
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Deposit Button */}
          <button
            onClick={() => openModal('DEPOSIT')}
            className="group relative bg-gradient-to-br from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 text-white rounded-xl p-6 transition-all duration-200 transform hover:scale-105 shadow-lg hover:shadow-xl"
          >
            <div className="flex items-center justify-between">
              <div className="text-right">
                <h4 className="text-lg font-bold">إضافة إيداع</h4>
                <p className="text-emerald-100 text-sm mt-1">إيداع مبلغ جديد لرأس المال</p>
              </div>
              <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                <Plus className="w-6 h-6" />
              </div>
            </div>
          </button>

          {/* Withdraw Button */}
          <button
            onClick={() => openModal('WITHDRAW')}
            className="group relative bg-gradient-to-br from-red-500 to-pink-600 hover:from-red-600 hover:to-pink-700 text-white rounded-xl p-6 transition-all duration-200 transform hover:scale-105 shadow-lg hover:shadow-xl"
          >
            <div className="flex items-center justify-between">
              <div className="text-right">
                <h4 className="text-lg font-bold">إضافة سحب</h4>
                <p className="text-red-100 text-sm mt-1">سحب مبلغ من رأس المال</p>
              </div>
              <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                <Minus className="w-6 h-6" />
              </div>
            </div>
          </button>
        </div>
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className={`${operationType === 'DEPOSIT' ? 'bg-gradient-to-r from-emerald-500 to-green-600' : 'bg-gradient-to-r from-red-500 to-pink-600'} px-6 py-4 rounded-t-2xl`}>
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold text-white flex items-center">
                  {operationType === 'DEPOSIT' ? (
                    <>
                      <Plus className="w-6 h-6 ml-2" />
                      إضافة إيداع
                    </>
                  ) : (
                    <>
                      <Minus className="w-6 h-6 ml-2" />
                      إضافة سحب
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
                  تم تنفيذ العملية بنجاح!
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-6">
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
                  <label htmlFor="happened_at" className="block text-sm font-medium text-gray-700 mb-2">
                    📅 تاريخ العملية *
                  </label>
                  <input
                    type="date"
                    id="happened_at"
                    name="happened_at"
                    value={formData.happened_at}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all duration-200"
                    required
                  />
                </div>

                {/* Note Input */}
                <div>
                  <label htmlFor="note" className="block text-sm font-medium text-gray-700 mb-2">
                    📝 ملاحظات (اختياري)
                  </label>
                  <textarea
                    id="note"
                    name="note"
                    value={formData.note}
                    onChange={handleInputChange}
                    rows={3}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all duration-200 resize-none"
                    placeholder={`أدخل تفاصيل إضافية عن عملية ${operationType === 'DEPOSIT' ? 'الإيداع' : 'السحب'}`}
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
                      operationType === 'DEPOSIT'
                        ? 'bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700'
                        : 'bg-gradient-to-r from-red-500 to-pink-600 hover:from-red-600 hover:to-pink-700'
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
                      `تأكيد ${operationType === 'DEPOSIT' ? 'الإيداع' : 'السحب'}`
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

export default FinancialOperations;