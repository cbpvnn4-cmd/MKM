import React, { useState, useEffect, useMemo } from 'react';
import Layout from '../components/Layout';
import { getMonthlyRetirementReport } from '../services/api';

const MonthlyRetirementReport = () => {
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [retirementRate, setRetirementRate] = useState(5.0);

  useEffect(() => {
    fetchRetirementReport();
  }, [selectedMonth, selectedYear, retirementRate]);

  const fetchRetirementReport = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getMonthlyRetirementReport(selectedMonth, selectedYear, retirementRate);
      setReport(data);
    } catch (err) {
      console.error('خطأ في جلب تقرير التقاعد:', err);
      setError(`خطأ في جلب التقرير: ${err.message}`);

      // Mock data for demonstration
      const mockReport = {
        generated_date: new Date().toISOString(),
        month: selectedMonth,
        year: selectedYear,
        retirement_rate: retirementRate,
        total_partners: 8,
        eligible_for_retirement: 3,
        total_contributions: 15000,
        retirement_fund_balance: 450000,
        average_contribution: 1875,
        eligibility_percentage: 37.5,
        distributions: [
          {
            partner_id: 1,
            partner_name: "أحمد محمد",
            distributable_amount: 25000,
            retirement_contribution: 1250,
            years_of_service: 15,
            age: 55,
            is_eligible: true,
            eligibility_status: "مؤهل",
            ownership_percentage: 25.0,
            monthly_benefit: 12500
          },
          {
            partner_id: 2,
            partner_name: "سارة أحمد",
            distributable_amount: 20000,
            retirement_contribution: 1000,
            years_of_service: 12,
            age: 52,
            is_eligible: true,
            eligibility_status: "مؤهل",
            ownership_percentage: 20.0,
            monthly_benefit: 10000
          },
          {
            partner_id: 3,
            partner_name: "محمد علي",
            distributable_amount: 15000,
            retirement_contribution: 750,
            years_of_service: 8,
            age: 45,
            is_eligible: false,
            eligibility_status: "غير مؤهل",
            ownership_percentage: 15.0,
            monthly_benefit: 0
          }
        ]
      };
      setReport(mockReport);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount || 0);
  };

  const formatNumber = (value) => new Intl.NumberFormat('en-US').format(value || 0);

  const formatDate = (dateString) => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleDateString('en-GB', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatMonthYear = (month, year) => {
    return new Date(year, month - 1, 1).toLocaleDateString('en-GB', {
      year: 'numeric',
      month: 'long'
    });
  };

  // Calculate statistics
  const recentDistributions = useMemo(() => report?.distributions?.slice(0, 5) || [], [report]);
  const eligiblePartners = useMemo(() => report?.distributions?.filter(d => d.is_eligible) || [], [report]);

  const exportToCSV = () => {
    if (!report || !report.distributions) return;

    const headers = ['الشريك', 'المبلغ القابل للتوزيع', 'مساهمة التقاعد', 'سنوات الخدمة', 'العمر', 'حالة الأهلية', 'المعاش الشهري'];
    const csvData = [
      headers.join(','),
      ...report.distributions.map(dist => [
        dist.partner_name,
        dist.distributable_amount,
        dist.retirement_contribution,
        dist.years_of_service,
        dist.age,
        dist.eligibility_status,
        dist.monthly_benefit
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvData], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `retirement_report_${selectedMonth}_${selectedYear}.csv`;
    link.click();
  };

  if (loading && !report) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">تقرير التقاعد الشهري</h1>
          <p className="text-gray-600">تقرير شامل لمساهمات التقاعد ومعاشات الشركاء</p>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 rounded-xl p-4 border border-yellow-200 mb-6">
            <div className="flex items-center">
              <div className="p-2 bg-yellow-200 rounded-full mr-3">
                <svg className="w-5 h-5 text-yellow-800" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="text-yellow-800 font-medium text-sm">
                تم تحميل البيانات التجريبية - {error}
              </div>
              <button
                onClick={() => setError(null)}
                className="mr-auto text-yellow-600 hover:text-yellow-800"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        )}

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
          <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-6 border border-blue-200">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-medium text-blue-800 mb-1">إجمالي الشركاء</h3>
                <p className="text-2xl font-bold text-blue-900">
                  {formatNumber(report?.total_partners || 0)}
                </p>
                <p className="text-xs text-blue-600 mt-1">
                  شريك في النظام
                </p>
              </div>
              <div className="p-3 bg-blue-200 rounded-full">
                <svg className="w-6 h-6 text-blue-800" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-6 border border-green-200">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-medium text-green-800 mb-1">مؤهلين للتقاعد</h3>
                <p className="text-2xl font-bold text-green-900">
                  {formatNumber(report?.eligible_for_retirement || 0)}
                </p>
                <p className="text-xs text-green-600 mt-1">
                  {report?.eligibility_percentage?.toFixed(1) || 0}% من الإجمالي
                </p>
              </div>
              <div className="p-3 bg-green-200 rounded-full">
                <svg className="w-6 h-6 text-green-800" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl p-6 border border-purple-200">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-medium text-purple-800 mb-1">مساهمات شهرية</h3>
                <p className="text-2xl font-bold text-purple-900">
                  {formatCurrency(report?.total_contributions || 0)}
                </p>
                <p className="text-xs text-purple-600 mt-1">
                  بنسبة {report?.retirement_rate || 0}%
                </p>
              </div>
              <div className="p-3 bg-purple-200 rounded-full">
                <svg className="w-6 h-6 text-purple-800" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-xl p-6 border border-orange-200">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-medium text-orange-800 mb-1">رصيد صندوق التقاعد</h3>
                <p className="text-2xl font-bold text-orange-900">
                  {formatCurrency(report?.retirement_fund_balance || 0)}
                </p>
                <p className="text-xs text-orange-600 mt-1">
                  رصيد تقديري
                </p>
              </div>
              <div className="p-3 bg-orange-200 rounded-full">
                <svg className="w-6 h-6 text-orange-800" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          <div className="space-y-6 xl:col-span-2">
            {/* Report Controls */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                <div>
                  <h2 className="text-xl font-semibold text-gray-900">إعدادات التقرير</h2>
                  <p className="text-sm text-gray-500 mt-1">اختر المعايير وأنشئ التقرير</p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={fetchRetirementReport}
                    disabled={loading}
                    className="inline-flex items-center justify-center px-4 py-2 text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 transition-colors duration-150"
                  >
                    {loading ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        جاري التحديث...
                      </>
                    ) : (
                      'تحديث التقرير'
                    )}
                  </button>
                  {report && (
                    <button
                      onClick={exportToCSV}
                      className="inline-flex items-center justify-center px-4 py-2 text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 transition-colors duration-150"
                    >
                      CSV تصدير
                    </button>
                  )}
                </div>
              </div>

              <div className="mt-6 grid grid-cols-1 lg:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">الشهر</label>
                  <select
                    value={selectedMonth}
                    onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
                    className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-shadow duration-150"
                  >
                    {Array.from({ length: 12 }, (_, i) => (
                      <option key={i + 1} value={i + 1}>
                        {new Date(2023, i, 1).toLocaleDateString('ar', { month: 'long' })}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">السنة</label>
                  <select
                    value={selectedYear}
                    onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                    className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-shadow duration-150"
                  >
                    {Array.from({ length: 5 }, (_, i) => (
                      <option key={i} value={new Date().getFullYear() - i}>
                        {new Date().getFullYear() - i}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">نسبة التقاعد (%)</label>
                  <input
                    type="number"
                    min="0"
                    max="20"
                    step="0.5"
                    value={retirementRate}
                    onChange={(e) => setRetirementRate(parseFloat(e.target.value))}
                    className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-shadow duration-150"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">الفترة</label>
                  <div className="px-4 py-2 bg-gray-100 rounded-md text-sm text-gray-700">
                    {formatMonthYear(selectedMonth, selectedYear)}
                  </div>
                </div>
              </div>
            </div>

            {/* Detailed Table */}
            {report && report.distributions && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200">
                <div className="px-6 py-4 border-b border-gray-200">
                  <h2 className="text-xl font-semibold text-gray-900">تفاصيل مساهمات التقاعد</h2>
                </div>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">الشريك</th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">المبلغ الموزع</th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">مساهمة التقاعد</th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">سنوات الخدمة</th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">العمر</th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">حالة الأهلية</th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">المعاش المتوقع</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {report.distributions.map((distribution, index) => (
                        <tr key={distribution.partner_id || index} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            {distribution.partner_name}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {formatCurrency(distribution.distributable_amount)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-purple-600 font-medium">
                            {formatCurrency(distribution.retirement_contribution)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {formatNumber(distribution.years_of_service)} سنة
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {formatNumber(distribution.age)} سنة
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              distribution.is_eligible
                                ? 'bg-green-100 text-green-800'
                                : 'bg-red-100 text-red-800'
                            }`}>
                              {distribution.eligibility_status}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-orange-600 font-medium">
                            {formatCurrency(distribution.monthly_benefit)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>

          <div className="space-y-6">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">ملخص سريع</h3>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">تاريخ التقرير</span>
                  <span className="font-medium text-gray-900">{formatDate(report?.generated_date)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">متوسط المساهمة</span>
                  <span className="font-medium text-gray-900">{formatCurrency(report?.average_contribution)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">نسبة الأهلية</span>
                  <span className="font-medium text-gray-900">{(report?.eligibility_percentage || 0).toFixed(1)}%</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">إجمالي المعاشات المتوقعة</span>
                  <span className="font-medium text-gray-900">
                    {formatCurrency(eligiblePartners.reduce((sum, p) => sum + (p.monthly_benefit || 0), 0))}
                  </span>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">الشركاء المؤهلون للتقاعد</h3>
              <ul className="space-y-4">
                {eligiblePartners.length === 0 ? (
                  <li className="text-sm text-gray-500">لا يوجد شركاء مؤهلون حالياً.</li>
                ) : (
                  eligiblePartners.map((partner, index) => (
                    <li
                      key={`eligible-${partner.partner_id || index}`}
                      className="flex items-start justify-between"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-900 truncate">{partner.partner_name}</p>
                        <p className="text-xs text-gray-500 mt-1">
                          {partner.years_of_service} سنة خدمة - {partner.age} سنة
                        </p>
                      </div>
                      <div className="text-right ml-3">
                        <p className="text-sm font-medium text-green-600">
                          {formatCurrency(partner.monthly_benefit)}
                        </p>
                        <p className="text-xs text-gray-500">
                          معاش متوقع
                        </p>
                      </div>
                    </li>
                  ))
                )}
              </ul>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">أحدث المساهمات</h3>
              <ul className="space-y-4">
                {recentDistributions.length === 0 ? (
                  <li className="text-sm text-gray-500">لا توجد بيانات لعرضها حاليًا.</li>
                ) : (
                  recentDistributions.map((dist, index) => (
                    <li
                      key={`recent-${dist.partner_id || index}`}
                      className="flex items-start justify-between"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-900 truncate">{dist.partner_name}</p>
                        <p className="text-xs text-gray-500 mt-1">
                          {dist.ownership_percentage}% ملكية
                        </p>
                      </div>
                      <div className="text-right ml-3">
                        <p className="text-sm font-medium text-purple-600">
                          {formatCurrency(dist.retirement_contribution)}
                        </p>
                        <span className={`text-xs px-2 py-1 rounded-full ${
                          dist.is_eligible ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                        }`}>
                          {dist.eligibility_status}
                        </span>
                      </div>
                    </li>
                  ))
                )}
              </ul>
            </div>
          </div>
        </div>

        {/* No Data State */}
        {!loading && !report && (
          <div className="text-center py-12 bg-white rounded-xl shadow-sm border border-gray-200">
            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-900">لا يوجد تقرير</h3>
            <p className="mt-1 text-sm text-gray-500">اختر الفترة والمعايير وانقر على "تحديث التقرير"</p>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default MonthlyRetirementReport;