import React from 'react';
import { DollarSign, TrendingUp, Calendar, FileText, User } from 'lucide-react';

const BeneficiaryDecisionHistory = ({ decisions }) => {
  const formatDate = (dateString) => {
    if (!dateString) return 'غير محدد';
    return new Date(dateString).toLocaleDateString('ar-EG', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatNumber = (value) => new Intl.NumberFormat('en-US').format(value || 0);

  if (!decisions || decisions.length === 0) {
    return (
      <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 p-8">
        <h3 className="text-xl font-bold text-gray-800 mb-6 flex items-center">
          <DollarSign className="w-6 h-6 text-purple-600 ml-2" />
          تاريخ قرارات التوزيع
        </h3>
        <div className="text-center py-12">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <FileText className="w-8 h-8 text-gray-400" />
          </div>
          <p className="text-gray-500 text-lg font-medium">لا توجد قرارات توزيع حتى الآن</p>
          <p className="text-gray-400 text-sm mt-2">استخدم أزرار القرارات أعلاه لإضافة قرارات جديدة</p>
        </div>
      </div>
    );
  }

  // Sort decisions by date (newest first)
  const sortedDecisions = [...decisions].sort((a, b) => {
    const dateA = new Date(a.decided_at || a.created_at);
    const dateB = new Date(b.decided_at || b.created_at);
    return dateB - dateA;
  });

  // Calculate totals
  const totalCash = decisions
    .filter(d => d.decision_type === 'CASH')
    .reduce((sum, d) => sum + parseFloat(d.amount_usd || 0), 0);

  const totalCapital = decisions
    .filter(d => d.decision_type === 'CAPITAL')
    .reduce((sum, d) => sum + parseFloat(d.amount_usd || 0), 0);

  return (
    <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 p-6">
      <h3 className="text-xl font-bold text-gray-800 mb-6 flex items-center">
        <DollarSign className="w-6 h-6 text-purple-600 ml-2" />
        تاريخ قرارات التوزيع
        <span className="bg-purple-100 text-purple-800 text-sm font-medium px-2.5 py-0.5 rounded-full mr-2">
          {decisions.length}
        </span>
      </h3>

      <div className="space-y-4 max-h-96 overflow-y-auto mb-6">
        {sortedDecisions.map((decision, index) => (
          <div
            key={decision.id || index}
            className={`relative p-4 rounded-xl border-2 transition-all duration-200 hover:shadow-md ${
              decision.decision_type === 'CASH'
                ? 'bg-emerald-50 border-emerald-200 hover:bg-emerald-100'
                : 'bg-blue-50 border-blue-200 hover:bg-blue-100'
            }`}
          >
            <div className="flex items-start justify-between">
              <div className="flex items-start space-x-3 rtl:space-x-reverse flex-1">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                  decision.decision_type === 'CASH'
                    ? 'bg-emerald-200'
                    : 'bg-blue-200'
                }`}>
                  {decision.decision_type === 'CASH' ? (
                    <DollarSign className={`w-5 h-5 text-emerald-700`} />
                  ) : (
                    <TrendingUp className={`w-5 h-5 text-blue-700`} />
                  )}
                </div>

                <div className="flex-1">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className={`font-bold text-lg ${
                      decision.decision_type === 'CASH' ? 'text-emerald-800' : 'text-blue-800'
                    }`}>
                      {decision.decision_type === 'CASH' ? 'سحب نقدي' : 'تحويل لرأس المال'}
                    </h4>
                    <span className={`text-2xl font-bold ${
                      decision.decision_type === 'CASH' ? 'text-emerald-600' : 'text-blue-600'
                    }`}>
                      ${formatNumber(decision.amount_usd)}
                    </span>
                  </div>

                  <div className="flex items-center text-sm text-gray-600 mb-2">
                    <Calendar className="w-4 h-4 ml-1" />
                    {formatDate(decision.decided_at || decision.created_at)}
                  </div>

                  {/* Show partner if CAPITAL */}
                  {decision.decision_type === 'CAPITAL' && decision.partner_id && (
                    <div className="flex items-center text-sm text-blue-700 bg-blue-100/50 rounded-lg p-2 mt-2">
                      <User className="w-4 h-4 ml-1" />
                      <span>تم التحويل للشريك #{decision.partner_id}</span>
                    </div>
                  )}

                  {decision.notes && (
                    <div className="flex items-start text-sm text-gray-700 bg-white/50 rounded-lg p-2 mt-2">
                      <FileText className="w-4 h-4 ml-1 mt-0.5 flex-shrink-0" />
                      <span>{decision.notes}</span>
                    </div>
                  )}

                  {/* Profit Run Info */}
                  {decision.profit_run_id && (
                    <div className="text-xs text-gray-500 mt-2">
                      جولة التوزيع #{decision.profit_run_id}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Decision number indicator */}
            <div className="absolute top-2 left-2">
              <span className="bg-white/80 text-gray-600 text-xs font-medium px-2 py-1 rounded-full">
                #{decisions.length - index}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Summary at the bottom */}
      <div className="mt-6 pt-4 border-t border-gray-200">
        <div className="grid grid-cols-2 gap-4">
          <div className="text-center p-4 bg-emerald-50 rounded-xl">
            <p className="text-sm font-medium text-emerald-600">إجمالي السحوبات النقدية</p>
            <p className="text-xl font-bold text-emerald-700">
              ${formatNumber(totalCash)}
            </p>
            <p className="text-xs text-emerald-600 mt-1">
              {decisions.filter(d => d.decision_type === 'CASH').length} عملية
            </p>
          </div>
          <div className="text-center p-4 bg-blue-50 rounded-xl">
            <p className="text-sm font-medium text-blue-600">إجمالي التحويل لرأس المال</p>
            <p className="text-xl font-bold text-blue-700">
              ${formatNumber(totalCapital)}
            </p>
            <p className="text-xs text-blue-600 mt-1">
              {decisions.filter(d => d.decision_type === 'CAPITAL').length} عملية
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BeneficiaryDecisionHistory;
