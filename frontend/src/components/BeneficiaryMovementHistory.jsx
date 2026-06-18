import React, { useState } from 'react';
import { ChevronDown, ChevronUp, Calendar, User, DollarSign, TrendingUp, FileText, CalendarDays } from 'lucide-react';

const BeneficiaryMovementHistory = ({ decisions, beneficiaries, profitRuns }) => {
  const [expandedDecision, setExpandedDecision] = useState(null);

  const toggleDecisionExpansion = (decisionId) => {
    setExpandedDecision(expandedDecision === decisionId ? null : decisionId);
  };

  const getBeneficiaryName = (beneficiaryId) => {
    const beneficiary = beneficiaries.find(b => b.id === beneficiaryId);
    return beneficiary ? beneficiary.name : `مستفيد #${beneficiaryId}`;
  };

  const getProfitRunDate = (runId) => {
    const run = profitRuns[runId];
    if (!run) return 'غير معروف';

    const raw = run?.run_month || run?.month;
    const date = new Date(raw);
    return date.toLocaleDateString('ar-EG', { year: 'numeric', month: 'long' });
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2
    }).format(amount || 0);
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'غير محدد';
    const date = new Date(dateString);
    return date.toLocaleDateString('ar-EG', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const getDecisionTypeBadge = (type) => {
    if (type === 'CASH') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs font-medium">
          <DollarSign className="w-3 h-3" />
          سحب نقدي
        </span>
      );
    } else if (type === 'CAPITAL') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-medium">
          <TrendingUp className="w-3 h-3" />
          تحويل لرأس المال
        </span>
      );
    }
    return null;
  };

  const sortedDecisions = [...decisions].sort((a, b) => {
    const dateA = new Date(a.decided_at || a.created_at);
    const dateB = new Date(b.decided_at || b.created_at);
    return dateB - dateA; // Most recent first
  });

  return (
    <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 overflow-hidden">
      <div className="bg-gradient-to-r from-purple-500 to-blue-600 px-8 py-6">
        <h2 className="text-xl font-bold text-white flex items-center">
          <FileText className="w-6 h-6 ml-2" />
          سجل العمليات التاريخي
        </h2>
        <p className="text-purple-100 mt-1">عرض جميع قرارات التوزيع المسجلة</p>
      </div>

      <div className="p-8">
        {sortedDecisions.length === 0 ? (
          <div className="text-center py-12">
            <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 text-lg">لا توجد عمليات مسجلة بعد</p>
            <p className="text-gray-400 text-sm mt-2">ستظهر هنا جميع قرارات التوزيع المستقبلية</p>
          </div>
        ) : (
          <div className="space-y-4">
            {sortedDecisions.map(decision => (
              <div key={decision.id} className="border border-gray-200 rounded-xl overflow-hidden hover:shadow-md transition-shadow duration-200">
                {/* Decision Summary */}
                <div
                  className="bg-gray-50 p-6 cursor-pointer hover:bg-gray-100 transition-colors duration-200"
                  onClick={() => toggleDecisionExpansion(decision.id)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
                        <User className="w-6 h-6 text-purple-600" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900 text-lg">
                          {getBeneficiaryName(decision.beneficiary_id)}
                        </h3>
                        <div className="flex items-center gap-3 text-sm text-gray-600 mt-1">
                          <div className="flex items-center gap-1">
                            <Calendar className="w-4 h-4" />
                            <span>{getProfitRunDate(decision.profit_run_id)}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <CalendarDays className="w-4 h-4" />
                            <span>{formatDate(decision.decided_at || decision.created_at)}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      <div className="text-left">
                        <p className="text-2xl font-bold text-gray-900">
                          {formatCurrency(decision.amount_usd)}
                        </p>
                        {getDecisionTypeBadge(decision.decision_type)}
                      </div>

                      <div className="flex items-center">
                        {expandedDecision === decision.id ? (
                          <ChevronUp className="w-5 h-5 text-gray-500" />
                        ) : (
                          <ChevronDown className="w-5 h-5 text-gray-500" />
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Expanded Details */}
                {expandedDecision === decision.id && (
                  <div className="border-t border-gray-200 bg-white p-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <h4 className="font-semibold text-gray-900 mb-3">تفاصيل القرار</h4>
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span className="text-gray-600">رقم القرار:</span>
                            <span className="font-medium">#{decision.id}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">نوع القرار:</span>
                            <span className="font-medium">
                              {decision.decision_type === 'CASH' ? 'سحب نقدي' : 'تحويل لرأس المال'}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">المبلغ:</span>
                            <span className="font-medium text-green-600">{formatCurrency(decision.amount_usd)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">تاريخ القرار:</span>
                            <span className="font-medium">{formatDate(decision.decided_at || decision.created_at)}</span>
                          </div>
                          {decision.partner_id && (
                            <div className="flex justify-between">
                              <span className="text-gray-600">تم التحويل للشريك:</span>
                              <span className="font-medium text-blue-600">#{decision.partner_id}</span>
                            </div>
                          )}
                        </div>
                      </div>

                      <div>
                        <h4 className="font-semibold text-gray-900 mb-3">معلومات إضافية</h4>
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span className="text-gray-600">فترة الربح:</span>
                            <span className="font-medium">{getProfitRunDate(decision.profit_run_id)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">تاريخ الإنشاء:</span>
                            <span className="font-medium">{formatDate(decision.created_at)}</span>
                          </div>
                          {decision.updated_at && (
                            <div className="flex justify-between">
                              <span className="text-gray-600">آخر تحديث:</span>
                              <span className="font-medium">{formatDate(decision.updated_at)}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {decision.notes && (
                      <div className="mt-6 pt-6 border-t border-gray-200">
                        <h4 className="font-semibold text-gray-900 mb-3">ملاحظات</h4>
                        <div className="bg-gray-50 rounded-lg p-4">
                          <p className="text-gray-700 text-sm">{decision.notes}</p>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default BeneficiaryMovementHistory;
