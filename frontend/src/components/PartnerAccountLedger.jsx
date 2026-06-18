import React, { useState, useEffect } from 'react';
import { Book, Calendar, TrendingUp, TrendingDown, AlertCircle, FileText } from 'lucide-react';
import { getPartnerAccountLedger } from '../services/api';

const PartnerAccountLedger = ({ partnerId }) => {
  const [ledger, setLedger] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (partnerId) {
      fetchLedger();
    }
  }, [partnerId]);

  const fetchLedger = async () => {
    try {
      setLoading(true);
      const data = await getPartnerAccountLedger(partnerId);
      setLedger(data);
      setError(null);
    } catch (err) {
      setError('فشل في تحميل دفتر الأستاذ');
      console.error('Error fetching ledger:', err);
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

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-GB', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
  };

  const getTransactionTypeLabel = (type) => {
    const labels = {
      'CAPITAL_DEPOSIT': 'إيداع رأس مال',
      'CAPITAL_WITHDRAW': 'سحب رأس مال',
      'PROFIT_DISTRIBUTION': 'توزيع أرباح',
      'PROFIT_PAYOUT': 'دفع أرباح',
      'ADJUSTMENT': 'تسوية',
      'TRANSFER_IN': 'تحويل وارد',
      'TRANSFER_OUT': 'تحويل صادر'
    };
    return labels[type] || type;
  };

  const getTransactionTypeColor = (type) => {
    const colors = {
      'CAPITAL_DEPOSIT': 'text-green-600 bg-green-50',
      'CAPITAL_WITHDRAW': 'text-red-600 bg-red-50',
      'PROFIT_DISTRIBUTION': 'text-blue-600 bg-blue-50',
      'PROFIT_PAYOUT': 'text-purple-600 bg-purple-50',
      'ADJUSTMENT': 'text-gray-600 bg-gray-50',
      'TRANSFER_IN': 'text-teal-600 bg-teal-50',
      'TRANSFER_OUT': 'text-orange-600 bg-orange-50'
    };
    return colors[type] || 'text-gray-600 bg-gray-50';
  };

  const getTransactionIcon = (type) => {
    if (type.includes('DEPOSIT') || type.includes('DISTRIBUTION') || type.includes('IN')) {
      return <TrendingUp className="w-4 h-4" />;
    }
    return <TrendingDown className="w-4 h-4" />;
  };

  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
        <p className="text-gray-600 mt-4">جاري تحميل دفتر الأستاذ...</p>
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

  if (ledger.length === 0) {
    return (
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center">
        <Book className="w-12 h-12 text-gray-400 mx-auto mb-3" />
        <h3 className="text-lg font-semibold text-gray-700 mb-2">لا توجد معاملات</h3>
        <p className="text-gray-600">لم يتم تسجيل أي معاملات مالية بعد</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl p-6 text-white">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center">
              <Book className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-2xl font-bold">دفتر الأستاذ</h2>
              <p className="text-blue-100 text-sm">
                إجمالي المعاملات: {ledger.length}
              </p>
            </div>
          </div>
          {ledger.length > 0 && (
            <div className="text-left">
              <p className="text-blue-100 text-sm">الرصيد الحالي</p>
              <p className="text-3xl font-bold">
                {formatCurrency(ledger[ledger.length - 1]?.running_balance || 0)}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Ledger Table */}
      <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-4 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  التاريخ
                </th>
                <th className="px-6 py-4 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  نوع المعاملة
                </th>
                <th className="px-6 py-4 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  الوصف
                </th>
                <th className="px-6 py-4 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  مدين
                </th>
                <th className="px-6 py-4 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  دائن
                </th>
                <th className="px-6 py-4 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  الرصيد
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {ledger.map((entry) => (
                <tr key={entry.id} className="hover:bg-gray-50 transition-colors">
                  {/* Date */}
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-2 text-sm text-gray-900">
                      <Calendar className="w-4 h-4 text-gray-400" />
                      {formatDate(entry.transaction_date)}
                    </div>
                  </td>

                  {/* Transaction Type */}
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${getTransactionTypeColor(entry.transaction_type)}`}>
                      {getTransactionIcon(entry.transaction_type)}
                      {getTransactionTypeLabel(entry.transaction_type)}
                    </span>
                  </td>

                  {/* Description */}
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      {entry.description ? (
                        <p className="text-sm text-gray-700">{entry.description}</p>
                      ) : (
                        <p className="text-sm text-gray-400 italic">لا يوجد وصف</p>
                      )}
                      {entry.reference_id && (
                        <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded">
                          #{entry.reference_id}
                        </span>
                      )}
                    </div>
                  </td>

                  {/* Debit */}
                  <td className="px-6 py-4 whitespace-nowrap text-right">
                    {entry.debit_amount > 0 ? (
                      <span className="text-sm font-semibold text-red-600">
                        {formatCurrency(entry.debit_amount)}
                      </span>
                    ) : (
                      <span className="text-sm text-gray-400">—</span>
                    )}
                  </td>

                  {/* Credit */}
                  <td className="px-6 py-4 whitespace-nowrap text-right">
                    {entry.credit_amount > 0 ? (
                      <span className="text-sm font-semibold text-green-600">
                        {formatCurrency(entry.credit_amount)}
                      </span>
                    ) : (
                      <span className="text-sm text-gray-400">—</span>
                    )}
                  </td>

                  {/* Running Balance */}
                  <td className="px-6 py-4 whitespace-nowrap text-right">
                    <span className={`text-sm font-bold ${entry.running_balance >= 0 ? 'text-blue-600' : 'text-red-600'}`}>
                      {formatCurrency(entry.running_balance)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Summary Footer */}
      {ledger.length > 0 && (
        <div className="bg-gradient-to-r from-gray-50 to-blue-50 rounded-xl p-6 border border-gray-200">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center">
              <p className="text-sm text-gray-600 mb-1">إجمالي المدين</p>
              <p className="text-2xl font-bold text-red-600">
                {formatCurrency(
                  ledger.reduce((sum, entry) => sum + parseFloat(entry.debit_amount || 0), 0)
                )}
              </p>
            </div>
            <div className="text-center">
              <p className="text-sm text-gray-600 mb-1">إجمالي الدائن</p>
              <p className="text-2xl font-bold text-green-600">
                {formatCurrency(
                  ledger.reduce((sum, entry) => sum + parseFloat(entry.credit_amount || 0), 0)
                )}
              </p>
            </div>
            <div className="text-center">
              <p className="text-sm text-gray-600 mb-1">الرصيد النهائي</p>
              <p className="text-2xl font-bold text-blue-600">
                {formatCurrency(ledger[ledger.length - 1]?.running_balance || 0)}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PartnerAccountLedger;
