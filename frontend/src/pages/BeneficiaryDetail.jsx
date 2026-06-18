import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Edit3, DollarSign, TrendingUp, TrendingDown, Users, Percent } from 'lucide-react';
import Layout from '../components/Layout';
import BeneficiaryFinancialOperations from '../components/BeneficiaryFinancialOperations';
import BeneficiaryDecisionHistory from '../components/BeneficiaryDecisionHistory';
import { getBeneficiary, getBeneficiaryDecisions } from '../services/api';

const BeneficiaryDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [beneficiary, setBeneficiary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [financialData, setFinancialData] = useState({
    totalCash: 0,
    totalCapital: 0,
    totalAmount: 0,
    decisions: []
  });

  useEffect(() => {
    const fetchBeneficiaryData = async () => {
      try {
        setLoading(true);
        setError(null);

        // Initialize financial data with safe defaults
        setFinancialData({
          totalCash: 0,
          totalCapital: 0,
          totalAmount: 0,
          decisions: []
        });

        const [beneficiaryData, decisions] = await Promise.all([
          getBeneficiary(id),
          getBeneficiaryDecisions({ beneficiary_id: id, limit: 1000 }).catch(err => {
            console.error('Error fetching decisions:', err);
            return [];
          })
        ]);

        setBeneficiary(beneficiaryData);

        // Calculate financial data with safe checks
        const decisionsArray = Array.isArray(decisions) ? decisions : [];
        const cashTotal = decisionsArray
          .filter(d => d?.decision_type === 'CASH')
          .reduce((sum, d) => sum + parseFloat(d?.amount_usd || 0), 0);

        const capitalTotal = decisionsArray
          .filter(d => d?.decision_type === 'CAPITAL')
          .reduce((sum, d) => sum + parseFloat(d?.amount_usd || 0), 0);

        setFinancialData({
          totalCash: Number(cashTotal) || 0,
          totalCapital: Number(capitalTotal) || 0,
          totalAmount: Number(cashTotal + capitalTotal) || 0,
          decisions: decisionsArray
        });

        setError(null);
      } catch (err) {
        setError('تعذر تحميل بيانات المستفيد');
        console.error('Error fetching beneficiary data:', err);
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      fetchBeneficiaryData();
    }
  }, [id]);

  const handleOperationComplete = () => {
    // Refresh financial data after operation
    const refreshData = async () => {
      try {
        const decisions = await getBeneficiaryDecisions({ beneficiary_id: id, limit: 1000 }).catch(err => {
          console.error('Error fetching decisions:', err);
          return [];
        });

        const decisionsArray = Array.isArray(decisions) ? decisions : [];
        const cashTotal = decisionsArray
          .filter(d => d?.decision_type === 'CASH')
          .reduce((sum, d) => sum + parseFloat(d?.amount_usd || 0), 0);

        const capitalTotal = decisionsArray
          .filter(d => d?.decision_type === 'CAPITAL')
          .reduce((sum, d) => sum + parseFloat(d?.amount_usd || 0), 0);

        setFinancialData({
          totalCash: Number(cashTotal) || 0,
          totalCapital: Number(capitalTotal) || 0,
          totalAmount: Number(cashTotal + capitalTotal) || 0,
          decisions: decisionsArray
        });
      } catch (err) {
        console.error('Error refreshing financial data:', err);
      }
    };

    refreshData();
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600" />
        </div>
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout>
        <div className="space-y-6">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-800 mb-2">تفاصيل المستفيد</h1>
            <p className="text-gray-600">واجهنا مشكلة أثناء تحميل البيانات، حاول مرة أخرى.</p>
          </div>
          <div className="bg-gradient-to-br from-red-50 to-red-100 rounded-xl p-6 border border-red-200">
            <div className="flex items-center">
              <div className="p-2 bg-red-200 rounded-full mr-3">
                <svg className="w-6 h-6 text-red-800" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="text-red-800 font-medium">{error}</div>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  const formatNumber = (value) => new Intl.NumberFormat('en-US').format(value || 0);

  return (
    <Layout>
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-blue-50">
        <div className="max-w-6xl mx-auto p-6">
          {/* Header Section */}
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 p-8 mb-8">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4 rtl:space-x-reverse">
                <button
                  onClick={() => navigate('/profit-distribution')}
                  className="w-12 h-12 bg-gradient-to-br from-gray-400 to-gray-600 rounded-xl flex items-center justify-center hover:from-gray-500 hover:to-gray-700 transition-all duration-200"
                >
                  <ArrowLeft className="w-6 h-6 text-white" />
                </button>
                <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-blue-600 rounded-xl flex items-center justify-center">
                  <Users className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h1 className="text-3xl font-bold text-gray-800">{beneficiary?.name || 'المستفيد'}</h1>
                  <p className="text-gray-600 mt-1">إدارة قرارات توزيع حصة المستفيد</p>
                </div>
              </div>

              {/* Status Badge */}
              {beneficiary && (
                <div className={`px-4 py-2 rounded-full text-sm font-medium ${
                  beneficiary.is_active
                    ? 'bg-green-100 text-green-800'
                    : 'bg-gray-100 text-gray-800'
                }`}>
                  {beneficiary.is_active ? 'نشط' : 'غير نشط'}
                </div>
              )}
            </div>
          </div>

          {/* Financial Overview Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            {/* Total Amount Card */}
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-purple-600">إجمالي التوزيعات</p>
                  <p className="text-3xl font-bold text-purple-600">
                    ${formatNumber(financialData?.totalAmount || 0)}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">جميع القرارات</p>
                </div>
                <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
                  <DollarSign className="w-6 h-6 text-purple-600" />
                </div>
              </div>
            </div>

            {/* Percentage Card */}
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-indigo-600">نسبة الاستفادة</p>
                  <p className="text-3xl font-bold text-indigo-600">
                    {beneficiary?.percentage || 0}%
                  </p>
                  <p className="text-xs text-gray-500 mt-1">من حصة الشركة</p>
                </div>
                <div className="w-12 h-12 bg-indigo-100 rounded-xl flex items-center justify-center">
                  <Percent className="w-6 h-6 text-indigo-600" />
                </div>
              </div>
            </div>

            {/* Cash Withdrawals Card */}
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-emerald-600">السحوبات النقدية</p>
                  <p className="text-3xl font-bold text-emerald-600">
                    ${formatNumber(financialData?.totalCash || 0)}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    {(financialData?.decisions || []).filter(d => d?.decision_type === 'CASH').length} عملية
                  </p>
                </div>
                <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center">
                  <TrendingDown className="w-6 h-6 text-emerald-600" />
                </div>
              </div>
            </div>

            {/* Capital Conversions Card */}
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-blue-600">التحويل لرأس المال</p>
                  <p className="text-3xl font-bold text-blue-600">
                    ${formatNumber(financialData?.totalCapital || 0)}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    {(financialData?.decisions || []).filter(d => d?.decision_type === 'CAPITAL').length} عملية
                  </p>
                </div>
                <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                  <TrendingUp className="w-6 h-6 text-blue-600" />
                </div>
              </div>
            </div>
          </div>

          {/* Financial Operations Section */}
          <BeneficiaryFinancialOperations
            beneficiaryId={id}
            onOperationComplete={handleOperationComplete}
          />

          {/* Decision History Section */}
          <div className="mt-8">
            <BeneficiaryDecisionHistory decisions={financialData.decisions} />
          </div>

          {/* Beneficiary Details Card */}
          {beneficiary?.notes && (
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 overflow-hidden mt-8">
              <div className="bg-gradient-to-r from-purple-500 to-blue-600 px-8 py-6">
                <h2 className="text-xl font-bold text-white">ملاحظات إضافية</h2>
              </div>
              <div className="p-8">
                <p className="text-gray-700 leading-relaxed">{beneficiary.notes}</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
};

export default BeneficiaryDetail;
