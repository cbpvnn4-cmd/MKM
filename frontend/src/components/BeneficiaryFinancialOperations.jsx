import React, { useState, useEffect } from 'react';
import { Plus, DollarSign, Calendar, FileText, AlertCircle, CheckCircle, TrendingUp, User } from 'lucide-react';
import { createBeneficiaryDecision, getProfitRuns, getPartners } from '../services/api';

const BeneficiaryFinancialOperations = ({ beneficiaryId, onOperationComplete }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [operationType, setOperationType] = useState('CASH'); // CASH or CAPITAL
  const [profitRuns, setProfitRuns] = useState([]);
  const [partners, setPartners] = useState([]);
  const [formData, setFormData] = useState({
    profit_run_id: '',
    amount_usd: '',
    decision_type: 'CASH',
    partner_id: '',
    decided_at: new Date().toISOString().split('T')[0],
    notes: ''
  });
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  // Fetch profit runs and partners when modal opens
  useEffect(() => {
    if (isModalOpen) {
      fetchRequiredData();
    }
  }, [isModalOpen]);

  const fetchRequiredData = async () => {
    setLoadingData(true);
    try {
      const [runsData, partnersData] = await Promise.all([
        getProfitRuns({ limit: 12 }),
        getPartners()
      ]);
      setProfitRuns(runsData || []);
      setPartners(partnersData || []);
    } catch (err) {
      console.error('Error fetching data:', err);
      setError('فشل في تحميل البيانات المطلوبة');
    } finally {
      setLoadingData(false);
    }
  };

  const openModal = (type) => {
    setOperationType(type);
    setIsModalOpen(true);
    setError(null);
    setSuccess(false);
    setFormData({
      profit_run_id: '',
      amount_usd: '',
      decision_type: type,
      partner_id: '',
      decided_at: new Date().toISOString().split('T')[0],
      notes: ''
    });
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setFormData({
      profit_run_id: '',
      amount_usd: '',
      decision_type: 'CASH',
      partner_id: '',
      decided_at: new Date().toISOString().split('T')[0],
      notes: ''
    });
    setError(null);
    setSuccess(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validation
    if (!formData.profit_run_id) {
      setError('يرجى اختيار جولة توزيع أرباح');
      return;
    }

    if (!formData.amount_usd || parseFloat(formData.amount_usd) <= 0) {
      setError('يرجى إدخال مبلغ صحيح');
      return;
    }

    if (formData.decision_type === 'CAPITAL' && !formData.partner_id) {
      setError('يرجى اختيار الشريك عند التحويل لرأس المال');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const decisionData = {
        profit_run_id: parseInt(formData.profit_run_id),
        beneficiary_id: beneficiaryId,
        amount_usd: parseFloat(formData.amount_usd),
        decision_type: formData.decision_type,
        decided_at: formData.decided_at,
        notes: formData.notes || null
      };

      if (formData.decision_type === 'CAPITAL' && formData.partner_id) {
        decisionData.partner_id = parseInt(formData.partner_id);
      }

      await createBeneficiaryDecision(decisionData);

      setSuccess(true);
      setTimeout(() => {
        closeModal();
        if (onOperationComplete) {
          onOperationComplete();
        }
      }, 1500);
    } catch (err) {
      console.error('Error creating decision:', err);
      const errorMessage = err.response?.data?.detail || 'فشل في تنفيذ العملية، حاول مرة أخرى';
      setError(errorMessage);
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

    // Clear partner_id if changing to CASH
    if (name === 'decision_type' && value === 'CASH') {
      setFormData(prev => ({
        ...prev,
        partner_id: ''
      }));
    }
  };

  return (
    <>
      {/* Action Buttons */}
      <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 p-6">
        <h3 className="text-xl font-bold text-gray-800 mb-6 flex items-center">
          <DollarSign className="w-6 h-6 text-purple-600 ml-2" />
          قرارات التوزيع
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Cash Button */}
          <button
            onClick={() => openModal('CASH')}
            className="group relative bg-gradient-to-br from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 text-white rounded-xl p-6 transition-all duration-200 transform hover:scale-105 shadow-lg hover:shadow-xl"
          >
            <div className="flex items-center justify-between">
              <div className="text-right">
                <h4 className="text-lg font-bold">سحب نقدي</h4>
                <p className="text-emerald-100 text-sm mt-1">سحب المبلغ نقداً</p>
              </div>
              <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                <DollarSign className="w-6 h-6" />
              </div>
            </div>
          </button>

          {/* Capital Button */}
          <button
            onClick={() => openModal('CAPITAL')}
            className="group relative bg-gradient-to-br from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white rounded-xl p-6 transition-all duration-200 transform hover:scale-105 shadow-lg hover:shadow-xl"
          >
            <div className="flex items-center justify-between">
              <div className="text-right">
                <h4 className="text-lg font-bold">تحويل لرأس المال</h4>
                <p className="text-blue-100 text-sm mt-1">تحويل لشريك كرأس مال</p>
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
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className={`${operationType === 'CASH' ? 'bg-gradient-to-r from-emerald-500 to-green-600' : 'bg-gradient-to-r from-blue-500 to-indigo-600'} px-6 py-4 rounded-t-2xl`}>
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold text-white flex items-center">
                  {operationType === 'CASH' ? (
                    <>
                      <DollarSign className="w-6 h-6 ml-2" />
                      سحب نقدي
                    </>
                  ) : (
                    <>
                      <TrendingUp className="w-6 h-6 ml-2" />
                      تحويل لرأس المال
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
              {loadingData && (
                <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-xl flex items-center text-blue-700">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-700 ml-2"></div>
                  جاري تحميل البيانات...
                </div>
              )}

              {error && (
                <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-xl flex items-center text-red-700">
                  <AlertCircle className="w-5 h-5 ml-2 flex-shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {success && (
                <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-xl flex items-center text-green-700">
                  <CheckCircle className="w-5 h-5 ml-2" />
                  تم تنفيذ القرار بنجاح!
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Profit Run Selection */}
                <div>
                  <label htmlFor="profit_run_id" className="block text-sm font-medium text-gray-700 mb-2">
                    📊 جولة توزيع الأرباح *
                  </label>
                  <select
                    id="profit_run_id"
                    name="profit_run_id"
                    value={formData.profit_run_id}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all duration-200"
                    required
                    disabled={loadingData}
                  >
                    <option value="">اختر جولة التوزيع</option>
                    {profitRuns.map(run => (
                      <option key={run.run_id || run.id} value={run.run_id || run.id}>
                        {new Date(run.month).toLocaleDateString('ar-EG', { year: 'numeric', month: 'long' })}
                        {' - '}${ new Intl.NumberFormat('en-US').format(run.company_share || 0)}
                      </option>
                    ))}
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

                {/* Decision Type */}
                <div>
                  <label htmlFor="decision_type" className="block text-sm font-medium text-gray-700 mb-2">
                    🎯 نوع القرار *
                  </label>
                  <select
                    id="decision_type"
                    name="decision_type"
                    value={formData.decision_type}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all duration-200"
                    required
                  >
                    <option value="CASH">سحب نقدي</option>
                    <option value="CAPITAL">تحويل لرأس المال</option>
                  </select>
                </div>

                {/* Partner Selection (only for CAPITAL) */}
                {formData.decision_type === 'CAPITAL' && (
                  <div>
                    <label htmlFor="partner_id" className="block text-sm font-medium text-gray-700 mb-2">
                      👤 الشريك المستلم *
                    </label>
                    <select
                      id="partner_id"
                      name="partner_id"
                      value={formData.partner_id}
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all duration-200"
                      required={formData.decision_type === 'CAPITAL'}
                      disabled={loadingData}
                    >
                      <option value="">اختر الشريك</option>
                      {partners.map(partner => (
                        <option key={partner.id} value={partner.id}>
                          {partner.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

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
                    placeholder={`أدخل تفاصيل إضافية عن القرار`}
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
                        : 'bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700'
                    } focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200`}
                    disabled={loading || loadingData}
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
                      `تأكيد القرار`
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

export default BeneficiaryFinancialOperations;
