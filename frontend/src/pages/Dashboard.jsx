import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Layout from '../components/Layout';
import RecentPartners from '../components/RecentPartners';
import { profitAPI, getDashboardOverview } from '../services/api';
import { formatCurrency as formatCurrencyUtil } from '../utils/formatters';

const initialProfitStats = {
  lastDistribution: null,
  totalProfit: 0,
  companyShare: 0,
  partnersShare: 0
};

const defaultOverview = {
  sales: {
    orders_count: 0,
    active_orders_count: 0,
    total_invoiced_usd: 0,
    total_paid_usd: 0,
    outstanding_usd: 0
  },
  purchases: {
    orders_count: 0,
    active_orders_count: 0,
    total_value_usd: 0,
    paid_usd: 0,
    outstanding_usd: 0
  },
  partners: {
    active_count: 0,
    net_capital_usd: 0,
    available_capital_usd: 0
  },
  profit: {
    month: null,
    year: null,
    net_profit_usd: 0
  }
};

const Dashboard = () => {
  const [profitStats, setProfitStats] = useState(initialProfitStats);
  const [recentDistributions, setRecentDistributions] = useState([]);
  const [overview, setOverview] = useState(defaultOverview);
  const [overviewError, setOverviewError] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const [historyResult, overviewResult] = await Promise.allSettled([
        profitAPI.getHistory(6),
        getDashboardOverview()
      ]);

      if (historyResult.status === 'fulfilled') {
        const history = Array.isArray(historyResult.value) ? historyResult.value : [];
        setRecentDistributions(history);

        if (history.length > 0) {
          const totalProfit = history.reduce((sum, dist) => sum + (parseFloat(dist.net_profit) || 0), 0);
          const companyShare = history.reduce((sum, dist) => sum + (parseFloat(dist.company_share) || 0), 0);
          const partnersShare = history.reduce((sum, dist) => sum + (parseFloat(dist.partners_total) || 0), 0);

          setProfitStats({
            lastDistribution: history[0],
            totalProfit,
            companyShare,
            partnersShare
          });
        } else {
          setProfitStats(initialProfitStats);
        }
      } else {
        console.error('خطأ في جلب تاريخ الأرباح:', historyResult.reason);
        setRecentDistributions([]);
        setProfitStats(initialProfitStats);
      }

      if (overviewResult.status === 'fulfilled') {
        const data = overviewResult.value || {};
        setOverview({
          sales: { ...defaultOverview.sales, ...(data.sales || {}) },
          purchases: { ...defaultOverview.purchases, ...(data.purchases || {}) },
          partners: { ...defaultOverview.partners, ...(data.partners || {}) },
          profit: { ...defaultOverview.profit, ...(data.profit || {}) }
        });
        setOverviewError(null);
      } else {
        console.error('خطأ في جلب مؤشرات العمليات:', overviewResult.reason);
        setOverview(defaultOverview);
        const detail = overviewResult.reason?.response?.data?.detail
          || overviewResult.reason?.message
          || 'تعذر تحميل مؤشرات العمليات.';
        setOverviewError(detail);
      }
    } finally {
      setLoading(false);
    }
  };

  // استخدام الدوال الموحدة
  const formatCurrency = (amount) => formatCurrencyUtil(amount, { minimumFractionDigits: 0, maximumFractionDigits: 0 });
  const formatNumber = (value) => new Intl.NumberFormat('en-US').format(value || 0);

  const formatDate = (dateString) => {
    if (!dateString) return '';
    const normalized = String(dateString).slice(0, 10);
    return new Date(normalized).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long'
    });
  };

  const formatMonthLabel = (month, year) => {
    if (!month || !year) return 'الشهر الحالي';
    try {
      const date = new Date(Number(year), Number(month) - 1, 1);
      return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', calendar: 'gregory' });
    } catch (_) {
      return `${month}/${year}`;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        {/* Page Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">لوحة التحكم</h1>
          <p className="text-gray-600">
            نظرة شاملة على توزيعات الأرباح، أداء المبيعات والشراء، وعدد الشركاء النشطين
          </p>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
          <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-6 border border-blue-200">
            <div className="flex items-center justify-between gap-3">
              <div className="flex-1">
                <h3 className="text-sm font-medium text-blue-800 mb-1">آخر توزيع أرباح</h3>
                <p className="text-sm md:text-base font-bold text-blue-900" dir="ltr">
                  {profitStats.lastDistribution ? formatCurrency(profitStats.lastDistribution.net_profit) : 'لا يوجد'}
                </p>
                <p className="text-xs text-blue-600 mt-1 whitespace-normal break-words overflow-visible text-clip">
                  {profitStats.lastDistribution ? formatDate(profitStats.lastDistribution.month) : ''}
                </p>
              </div>
              <div className="p-3 bg-blue-200 rounded-full flex-shrink-0">
                <svg className="w-6 h-6 text-blue-800" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-6 border border-green-200">
            <div className="flex items-center justify-between gap-3">
              <div className="flex-1">
                <h3 className="text-sm font-medium text-green-800 mb-1">إجمالي الأرباح (6 أشهر)</h3>
                <p className="text-sm md:text-base font-bold text-green-900" dir="ltr">
                  {formatCurrency(profitStats.totalProfit)}
                </p>
                <p className="text-xs text-green-600 mt-1 whitespace-normal break-words overflow-visible text-clip">
                  {recentDistributions.length} توزيع
                </p>
              </div>
              <div className="p-3 bg-green-200 rounded-full flex-shrink-0">
                <svg className="w-6 h-6 text-green-800" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl p-6 border border-purple-200">
            <div className="flex items-center justify-between gap-3">
              <div className="flex-1">
                <h3 className="text-sm font-medium text-purple-800 mb-1">حصة الشركة</h3>
                <p className="text-sm md:text-base font-bold text-purple-900" dir="ltr">
                  {formatCurrency(profitStats.companyShare)}
                </p>
                <p className="text-xs text-purple-600 mt-1 whitespace-normal break-words overflow-visible text-clip">
                  30% من الأرباح المقسمة
                </p>
              </div>
              <div className="p-3 bg-purple-200 rounded-full flex-shrink-0">
                <svg className="w-6 h-6 text-purple-800" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-xl p-6 border border-orange-200">
            <div className="flex items-center justify-between gap-3">
              <div className="flex-1">
                <h3 className="text-sm font-medium text-orange-800 mb-1">حصة الشركاء</h3>
                <p className="text-sm md:text-base font-bold text-orange-900" dir="ltr">
                  {formatCurrency(profitStats.partnersShare)}
                </p>
                <p className="text-xs text-orange-600 mt-1 whitespace-normal break-words overflow-visible text-clip">
                  70% موزعة على الشركاء
                </p>
              </div>
              <div className="p-3 bg-orange-200 rounded-full flex-shrink-0">
                <svg className="w-6 h-6 text-orange-800" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 515.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 919.288 0M15 7a3 3 0 11-6 0 3 3 0 616 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 rounded-xl p-6 border border-yellow-200">
            <div className="flex items-center justify-between gap-3">
              <div className="flex-1">
                <h3 className="text-sm font-medium text-yellow-800 mb-1">
                  صافي الربح – {formatMonthLabel(overview.profit.month, overview.profit.year)}
                </h3>
                <p className="text-sm md:text-base font-bold text-yellow-900" dir="ltr">
                  {formatCurrency(overview.profit.net_profit_usd)}
                </p>
                <p className="text-xs text-yellow-600 mt-1 whitespace-normal break-words overflow-visible text-clip">
                  يحتسب من الفواتير المحصلة والمصروفات المسجلة
                </p>
              </div>
              <div className="p-3 bg-yellow-200 rounded-full flex-shrink-0">
                <svg className="w-6 h-6 text-yellow-800" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
          </div>
        </div>

        {/* Operations Snapshot */}
        <div>
          <h2 className="text-lg font-semibold text-gray-800 mb-4">مؤشرات المبيعات والمشتريات</h2>
          {overviewError && (
            <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
              {overviewError}
            </div>
          )}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white rounded-xl shadow-sm border border-blue-100 p-6">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-lg font-semibold text-gray-900">المبيعات</h3>
                <div className="p-2 rounded-full bg-blue-100 text-blue-700">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h18M3 9h18M3 15h18M3 21h18" />
                  </svg>
                </div>
              </div>
              <p className="text-2xl font-bold text-blue-700">{formatNumber(overview.sales.orders_count)} أمر</p>
              <p className="text-sm text-gray-600 mt-1">نشط: {formatNumber(overview.sales.active_orders_count)}</p>
              <div className="mt-4 space-y-1 text-sm text-gray-700">
                <p>قيمة مفوترة: {formatCurrency(overview.sales.total_invoiced_usd)}</p>
                <p>محصّل: {formatCurrency(overview.sales.total_paid_usd)}</p>
                <p className="text-blue-800 font-medium">مستحق: {formatCurrency(overview.sales.outstanding_usd)}</p>
              </div>
              <Link
                to="/sales-orders"
                className="mt-4 inline-flex items-center text-sm font-medium text-blue-600 hover:text-blue-800"
              >
                إدارة أوامر البيع →
              </Link>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-purple-100 p-6">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-lg font-semibold text-gray-900">المشتريات</h3>
                <div className="p-2 rounded-full bg-purple-100 text-purple-700">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                  </svg>
                </div>
              </div>
              <p className="text-2xl font-bold text-purple-700">{formatNumber(overview.purchases.orders_count)} أمر</p>
              <p className="text-sm text-gray-600 mt-1">نشط: {formatNumber(overview.purchases.active_orders_count)}</p>
              <div className="mt-4 space-y-1 text-sm text-gray-700">
                <p>قيمة إجمالية: {formatCurrency(overview.purchases.total_value_usd)}</p>
                <p>مدفوع: {formatCurrency(overview.purchases.paid_usd)}</p>
                <p className="text-purple-800 font-medium">متبقي: {formatCurrency(overview.purchases.outstanding_usd)}</p>
              </div>
              <Link
                to="/purchase-orders"
                className="mt-4 inline-flex items-center text-sm font-medium text-purple-600 hover:text-purple-800"
              >
                مراجعة أوامر الشراء →
              </Link>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-amber-100 p-6">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-lg font-semibold text-gray-900">الشركاء</h3>
                <div className="p-2 rounded-full bg-amber-100 text-amber-600">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 515.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 919.288 0M15 7a3 3 0 11-6 0 3 3 0 616 0z" />
                  </svg>
                </div>
              </div>
              <p className="text-2xl font-bold text-amber-600">{formatNumber(overview.partners.active_count)} شريكاً</p>
              <div className="mt-4 space-y-1 text-sm text-gray-700">
                <p>صافي رأس المال: {formatCurrency(overview.partners.net_capital_usd)}</p>
                <p className="text-amber-700 font-medium">رأس مال متاح: {formatCurrency(overview.partners.available_capital_usd)}</p>
              </div>
              <Link
                to="/partners"
                className="mt-4 inline-flex items-center text-sm font-medium text-amber-600 hover:text-amber-800"
              >
                إدارة الشركاء →
              </Link>
            </div>
          </div>
        </div>

        {/* Recent Profit Distributions */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-800">آخر توزيعات الأرباح</h2>
            <Link
              to="/profit-distribution"
              className="text-blue-600 hover:text-blue-800 text-sm font-medium"
            >
              عرض الكل →
            </Link>
          </div>
          <div className="p-6">
            {recentDistributions.length > 0 ? (
              <div className="space-y-4">
                {recentDistributions.slice(0, 5).map((dist, index) => (
                  <div key={dist.run_id || index} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div className="flex items-center space-x-4 space-x-reverse">
                      <div
                        className={`w-3 h-3 rounded-full ${
                          parseFloat(dist.net_profit) > 0 ? 'bg-green-500' : 'bg-red-500'
                        }`}
                      ></div>
                      <div>
                        <p className="font-medium text-gray-900">
                          {formatDate(dist.month)}
                        </p>
                        <p className="text-sm text-gray-600">
                          {dist.method === 'TWCap' ? 'توزيع زمني موزون' : 'توزيع لحظي'}
                        </p>
                      </div>
                    </div>
                    <div className="text-left">
                      <p
                        className={`font-semibold ${
                          parseFloat(dist.net_profit) > 0 ? 'text-green-600' : 'text-red-600'
                        }`}
                      >
                        {formatCurrency(dist.net_profit)}
                      </p>
                      <p className="text-sm text-gray-500">صافي الربح</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                <h3 className="mt-2 text-sm font-medium text-gray-900">لا توجد توزيعات أرباح</h3>
                <p className="mt-1 text-sm text-gray-500">لم يتم تسجيل أي توزيعات أرباح حتى الآن</p>
                <div className="mt-6">
                  <Link
                    to="/profit-distribution"
                    className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
                  >
                    إنشاء توزيع جديد
                  </Link>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Recent Partners */}
        <div className="mb-6">
          <RecentPartners limit={4} />
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center mb-4">
              <div className="p-2 bg-blue-100 rounded-lg">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="mr-3 text-lg font-medium text-gray-900">توزيع الأرباح</h3>
            </div>
            <p className="text-gray-600 mb-4">إدارة وتوزيع الأرباح الشهرية</p>
            <Link
              to="/profit-distribution"
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-blue-700 bg-blue-100 hover:bg-blue-200"
            >
              الانتقال →
            </Link>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center mb-4">
              <div className="p-2 bg-green-100 rounded-lg">
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                </svg>
              </div>
              <h3 className="mr-3 text-lg font-medium text-gray-900">أوامر الشراء</h3>
            </div>
            <p className="text-gray-600 mb-4">متابعة استلام ودفعات الموردين</p>
            <Link
              to="/purchase-orders"
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-green-700 bg-green-100 hover:bg-green-200"
            >
              إدارة الطلبات →
            </Link>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center mb-4">
              <div className="p-2 bg-amber-100 rounded-lg">
                <svg className="w-6 h-6 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 515.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 919.288 0M15 7a3 3 0 11-6 0 3 3 0 616 0z" />
                </svg>
              </div>
              <h3 className="mr-3 text-lg font-medium text-gray-900">الشركاء</h3>
            </div>
            <p className="text-gray-600 mb-4">إدارة بيانات الشركاء وحصصهم</p>
            <Link
              to="/partners"
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-amber-700 bg-amber-100 hover:bg-amber-200"
            >
              عرض الشركاء →
            </Link>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default Dashboard;
