import React, { useState, useEffect } from 'react';
import { DollarSign, TrendingUp, TrendingDown, Wallet, PieChart, AlertCircle, Plus } from 'lucide-react';
import { getPartnerFinancialSummary } from '../services/api';
import AddProfitPayoutModal from './AddProfitPayoutModal';

const PartnerFinancialDashboard = ({ partnerId }) => {
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isPayoutModalOpen, setIsPayoutModalOpen] = useState(false);

  useEffect(() => {
    if (partnerId) {
      fetchFinancialSummary();
    }
  }, [partnerId]);

  const fetchFinancialSummary = async () => {
    try {
      setLoading(true);
      const data = await getPartnerFinancialSummary(partnerId);
      setSummary(data);
      setError(null);
    } catch (err) {
      setError('فشل في تحميل الملخص المالي');
      console.error('Error fetching financial summary:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount || 0);
  };

  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
        <p className="text-gray-600 mt-4">جاري تحميل الملخص المالي...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-center">
        <AlertCircle className="w-8 h-8 text-red-500 mx-auto mb-2" />
        <p className="text-red-700">{error}</p>
      </div>
    );
  }

  if (!summary) return null;

  return (
    <div className="space-y-6">
      {/* Header Card - Total Balance */}
      <div className="bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl p-8 text-white shadow-2xl">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-blue-100 text-sm font-medium mb-2">الرصيد الإجمالي</p>
            <h2 className="text-5xl font-bold">{formatCurrency(summary.total_balance)}</h2>
            <p className="text-blue-100 text-sm mt-2">
              {summary.partner_name}
            </p>
          </div>
          <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center">
            <Wallet className="w-10 h-10" />
          </div>
        </div>
      </div>

      {/* Financial Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Net Capital */}
        <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-sm text-gray-600 mb-1">صافي رأس المال</p>
              <p className="text-2xl font-bold text-gray-900">
                {formatCurrency(summary.net_capital)}
              </p>
            </div>
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <DollarSign className="w-6 h-6 text-green-600" />
            </div>
          </div>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500">إجمالي الإيداعات:</span>
              <span className="font-medium text-green-600">
                {formatCurrency(summary.total_capital_deposits)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">إجمالي السحوبات:</span>
              <span className="font-medium text-red-600">
                {formatCurrency(summary.total_capital_withdrawals)}
              </span>
            </div>
          </div>
        </div>

        {/* Outstanding Profits */}
        <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-sm text-gray-600 mb-1">الأرباح المستحقة</p>
              <p className="text-2xl font-bold text-orange-600">
                {formatCurrency(summary.outstanding_profits)}
              </p>
            </div>
            <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-orange-600" />
            </div>
          </div>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500">إجمالي الأرباح الموزعة:</span>
              <span className="font-medium text-green-600">
                {formatCurrency(summary.total_profit_distributions)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">المدفوع فعلياً:</span>
              <span className="font-medium text-blue-600">
                {formatCurrency(summary.total_profit_payouts)}
              </span>
            </div>
          </div>
        </div>

        {/* Ownership */}
        <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-sm text-gray-600 mb-1">نسبة الملكية</p>
              <p className="text-2xl font-bold text-purple-600">
                {summary.current_ownership_percentage ?
                  `${summary.current_ownership_percentage.toFixed(2)}%` : '—'}
              </p>
            </div>
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
              <PieChart className="w-6 h-6 text-purple-600" />
            </div>
          </div>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500">قيمة الحصة:</span>
              <span className="font-medium text-purple-600">
                {summary.current_equity_value ?
                  formatCurrency(summary.current_equity_value) : '—'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Summary Breakdown */}
      <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
        <h3 className="text-lg font-bold text-gray-800 mb-4">ملخص الحساب التفصيلي</h3>
        <div className="space-y-3">
          <div className="flex justify-between items-center py-3 border-b border-gray-100">
            <span className="text-gray-700 font-medium">صافي رأس المال</span>
            <span className="text-lg font-bold text-green-600">
              {formatCurrency(summary.net_capital)}
            </span>
          </div>
          <div className="flex justify-between items-center py-3 border-b border-gray-100">
            <span className="text-gray-700 font-medium">الأرباح غير المدفوعة</span>
            <span className="text-lg font-bold text-orange-600">
              {formatCurrency(summary.outstanding_profits)}
            </span>
          </div>
          <div className="flex justify-between items-center py-3 border-t-2 border-gray-300 bg-gray-50 px-4 -mx-6">
            <span className="text-gray-900 font-bold text-lg">الرصيد الإجمالي</span>
            <span className="text-2xl font-bold text-blue-600">
              {formatCurrency(summary.total_balance)}
            </span>
          </div>
        </div>
      </div>

      {/* Alert if outstanding profits */}
      {summary.outstanding_profits > 0 && (
        <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
          <div className="flex items-start justify-between">
            <div className="flex items-start">
              <AlertCircle className="w-5 h-5 text-orange-500 mt-0.5 ml-3" />
              <div>
                <h4 className="font-semibold text-orange-900">أرباح غير مدفوعة</h4>
                <p className="text-sm text-orange-700 mt-1">
                  يوجد {formatCurrency(summary.outstanding_profits)} من الأرباح المستحقة غير المدفوعة لهذا الشريك.
                </p>
              </div>
            </div>
            <button
              onClick={() => setIsPayoutModalOpen(true)}
              className="flex items-center gap-2 bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded-lg font-semibold transition-colors shadow-md"
            >
              <Plus className="w-4 h-4" />
              إضافة دفعة
            </button>
          </div>
        </div>
      )}

      {/* Add Payout Modal */}
      <AddProfitPayoutModal
        isOpen={isPayoutModalOpen}
        onClose={() => setIsPayoutModalOpen(false)}
        partnerId={partnerId}
        outstandingAmount={summary?.outstanding_profits || 0}
        onPayoutAdded={fetchFinancialSummary}
      />
    </div>
  );
};

export default PartnerFinancialDashboard;
