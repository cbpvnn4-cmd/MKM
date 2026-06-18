import React, { useState, useEffect, useMemo } from 'react';
import Layout from '../components/Layout';
import { profitAPI } from '../services/api';

const ProfitDistributionReport = () => {
  const [reportData, setReportData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [dateRange, setDateRange] = useState({
    startMonth: new Date().toISOString().slice(0, 7), // YYYY-MM format
    endMonth: new Date().toISOString().slice(0, 7)
  });

  useEffect(() => {
    fetchReport();
  }, []);

  const fetchReport = async () => {
    if (!dateRange.startMonth || !dateRange.endMonth) {
      setError('يرجى تحديد فترة التقرير');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const data = await profitAPI.getSummary(dateRange.startMonth, dateRange.endMonth);
      setReportData(data);
    } catch (error) {
      console.error('خطأ في جلب تقرير الأرباح:', error);
      setError(`خطأ في جلب التقرير: ${error.message}`);

      // Mock data for demonstration
      const mockReport = {
        total_runs: 3,
        total_profit: 450000,
        total_company_share: 135000,
        total_partners_share: 315000,
        total_reserve: 45000,
        runs: [
          {
            id: 1,
            run_month: '2024-01-01',
            net_profit_usd: 150000,
            mamar_share_usd: 45000,
            partners_total_usd: 105000,
            reserve_amount_usd: 15000,
            calculation_method: 'TWCap',
            created_at: '2024-02-01T10:00:00Z'
          },
          {
            id: 2,
            run_month: '2024-02-01',
            net_profit_usd: 120000,
            mamar_share_usd: 36000,
            partners_total_usd: 84000,
            reserve_amount_usd: 12000,
            calculation_method: 'TWCap',
            created_at: '2024-03-01T10:00:00Z'
          },
          {
            id: 3,
            run_month: '2024-03-01',
            net_profit_usd: 180000,
            mamar_share_usd: 54000,
            partners_total_usd: 126000,
            reserve_amount_usd: 18000,
            calculation_method: 'TWCap',
            created_at: '2024-04-01T10:00:00Z'
          }
        ]
      };
      setReportData(mockReport);
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

  const formatDate = (dateString) => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleDateString('en-GB', {
      year: 'numeric',
      month: 'long'
    });
  };

  const formatNumber = (value) => new Intl.NumberFormat('en-US').format(value || 0);

  const exportToCSV = () => {
    if (!reportData || !reportData.runs) return;

    const headers = ['الشهر', 'صافي الربح', 'حصة الشركة', 'حصة الشركاء', 'الاحتياطي', 'طريقة الحساب'];
    const csvData = [
      headers.join(','),
      ...reportData.runs.map(run => [
        formatDate(run.run_month),
        run.net_profit_usd,
        run.mamar_share_usd,
        run.partners_total_usd,
        run.reserve_amount_usd,
        run.calculation_method
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvData], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `profit_distribution_report_${dateRange.startMonth}_${dateRange.endMonth}.csv`;
    link.click();
  };

  // Calculate statistics
  const recentRuns = useMemo(() => reportData?.runs?.slice(0, 5) || [], [reportData]);
  const totalDistributions = reportData?.total_runs || 0;
  const averageProfit = totalDistributions > 0 ? (reportData?.total_profit || 0) / totalDistributions : 0;

  if (loading && !reportData) {
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
          <h1 className="text-3xl font-bold text-gray-800 mb-2">تقرير توزيع الأرباح</h1>
          <p className="text-gray-600">تقرير مفصل لتوزيعات الأرباح مع التحليلات والاتجاهات</p>
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
                <h3 className="text-sm font-medium text-blue-800 mb-1">إجمالي الأرباح</h3>
                <p className="text-2xl font-bold text-blue-900">
                  {formatCurrency(reportData?.total_profit)}
                </p>
                <p className="text-xs text-blue-600 mt-1">
                  {formatNumber(totalDistributions)} توزيع
                </p>
              </div>
              <div className="p-3 bg-blue-200 rounded-full">
                <svg className="w-6 h-6 text-blue-800" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl p-6 border border-purple-200">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-medium text-purple-800 mb-1">حصة الشركة</h3>
                <p className="text-2xl font-bold text-purple-900">
                  {formatCurrency(reportData?.total_company_share)}
                </p>
                <p className="text-xs text-purple-600 mt-1">
                  30% من الأرباح
                </p>
              </div>
              <div className="p-3 bg-purple-200 rounded-full">
                <svg className="w-6 h-6 text-purple-800" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-xl p-6 border border-orange-200">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-medium text-orange-800 mb-1">حصة الشركاء</h3>
                <p className="text-2xl font-bold text-orange-900">
                  {formatCurrency(reportData?.total_partners_share)}
                </p>
                <p className="text-xs text-orange-600 mt-1">
                  70% من الأرباح
                </p>
              </div>
              <div className="p-3 bg-orange-200 rounded-full">
                <svg className="w-6 h-6 text-orange-800" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-6 border border-green-200">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-medium text-green-800 mb-1">إجمالي الاحتياطي</h3>
                <p className="text-2xl font-bold text-green-900">
                  {formatCurrency(reportData?.total_reserve)}
                </p>
                <p className="text-xs text-green-600 mt-1">
                  مبلغ محجوز
                </p>
              </div>
              <div className="p-3 bg-green-200 rounded-full">
                <svg className="w-6 h-6 text-green-800" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
                  <h2 className="text-xl font-semibold text-gray-900">فلترة التقرير</h2>
                  <p className="text-sm text-gray-500 mt-1">اختر نطاق التاريخ لعرض البيانات المطلوبة</p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={fetchReport}
                    disabled={loading}
                    className="inline-flex items-center justify-center px-4 py-2 text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 transition-colors duration-150"
                  >
                    {loading ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        جاري التحميل...
                      </>
                    ) : (
                      'إنشاء التقرير'
                    )}
                  </button>
                  {reportData && (
                    <button
                      onClick={exportToCSV}
                      className="inline-flex items-center justify-center px-4 py-2 text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 transition-colors duration-150"
                    >
                      CSV تصدير
                    </button>
                  )}
                </div>
              </div>

              <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">من شهر</label>
                  <input
                    type="month"
                    value={dateRange.startMonth}
                    onChange={(e) => setDateRange({...dateRange, startMonth: e.target.value})}
                    className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-shadow duration-150"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">إلى شهر</label>
                  <input
                    type="month"
                    value={dateRange.endMonth}
                    onChange={(e) => setDateRange({...dateRange, endMonth: e.target.value})}
                    className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-shadow duration-150"
                  />
                </div>
              </div>
            </div>

            {/* Detailed Table */}
            {reportData && reportData.runs && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200">
                <div className="px-6 py-4 border-b border-gray-200">
                  <h2 className="text-xl font-semibold text-gray-900">تفاصيل التوزيعات</h2>
                </div>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">الشهر</th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">صافي الربح</th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">حصة الشركة</th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">حصة الشركاء</th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">الاحتياطي</th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">طريقة الحساب</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {reportData.runs.map((run, index) => (
                        <tr key={run.id || index} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            {formatDate(run.run_month)}
                          </td>
                          <td className={`px-6 py-4 whitespace-nowrap text-sm font-medium ${
                            parseFloat(run.net_profit_usd) >= 0 ? 'text-green-600' : 'text-red-600'
                          }`}>
                            {formatCurrency(run.net_profit_usd)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-purple-600">
                            {formatCurrency(run.mamar_share_usd)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-orange-600">
                            {formatCurrency(run.partners_total_usd)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600">
                            {formatCurrency(run.reserve_amount_usd)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              run.calculation_method === 'TWCap'
                                ? 'bg-blue-100 text-blue-800'
                                : 'bg-gray-100 text-gray-800'
                            }`}>
                              {run.calculation_method === 'TWCap' ? 'موزون زمنياً' : 'لحظي'}
                            </span>
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
              <h3 className="text-lg font-semibold text-gray-900 mb-4">تحليل سريع</h3>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">متوسط الربح الشهري</span>
                  <span className="font-medium text-gray-900">{formatCurrency(averageProfit)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">عدد التوزيعات</span>
                  <span className="font-medium text-gray-900">{formatNumber(totalDistributions)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">نسبة الأشهر الربحية</span>
                  <span className="font-medium text-gray-900">
                    {reportData?.runs ?
                      ((reportData.runs.filter(r => parseFloat(r.net_profit_usd) > 0).length / reportData.runs.length) * 100).toFixed(1) + '%' :
                      '0%'
                    }
                  </span>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">أحدث التوزيعات</h3>
              <ul className="space-y-4">
                {recentRuns.length === 0 ? (
                  <li className="text-sm text-gray-500">لا توجد بيانات لعرضها حاليًا.</li>
                ) : (
                  recentRuns.map((run, index) => (
                    <li
                      key={`recent-${run.id || index}`}
                      className="flex items-start justify-between"
                    >
                      <div>
                        <p className="text-sm font-semibold text-gray-900">{formatDate(run.run_month)}</p>
                        <p className="text-xs text-gray-500 mt-1">
                          ربح: {formatCurrency(run.net_profit_usd)}
                        </p>
                      </div>
                      <span className={`text-xs font-medium px-2 py-1 rounded-full ${
                        parseFloat(run.net_profit_usd) >= 0 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                      }`}>
                        {run.calculation_method === 'TWCap' ? 'موزون' : 'لحظي'}
                      </span>
                    </li>
                  ))
                )}
              </ul>
            </div>
          </div>
        </div>

        {/* No Data State */}
        {!loading && !reportData && (
          <div className="text-center py-12 bg-white rounded-xl shadow-sm border border-gray-200">
            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-900">لا يوجد تقرير</h3>
            <p className="mt-1 text-sm text-gray-500">اختر الفترة الزمنية وانقر على "إنشاء التقرير"</p>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default ProfitDistributionReport;