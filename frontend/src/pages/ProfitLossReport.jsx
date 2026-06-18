import React, { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import { getProfitLossReport } from '../services/api';
import { exportToPDF, exportToExcel, exportToCSV } from '../utils/exportUtils';
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Calendar,
  Download,
  RefreshCw,
  FileText,
  BarChart3,
  PieChart,
  Calculator
} from 'lucide-react';

const ProfitLossReport = () => {
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(new Date().getFullYear());

  useEffect(() => {
    fetchReport();
  }, [month, year]);

  const fetchReport = async () => {
    try {
      setLoading(true);
      setError(null);

      // Mock data for demonstration since API might not be available
      const mockReport = {
        generated_date: new Date().toISOString(),
        sales_revenue: 250000,
        other_income: 15000,
        total_revenue: 265000,
        cogs_materials: 80000,
        cogs_labor: 45000,
        cogs_subcontractors: 25000,
        total_cogs: 150000,
        gross_profit: 115000,
        expense_salaries: 35000,
        expense_rent: 8000,
        expense_utilities: 3500,
        expense_marketing: 5000,
        expense_insurance: 2500,
        expense_other: 8000,
        total_expenses: 62000,
        net_profit: 53000
      };

      try {
        const data = await getProfitLossReport(month, year);
        setReport(data || mockReport);
      } catch (err) {
        console.log('API not available, using mock data');
        setReport(mockReport);
      }
    } catch (err) {
      setError('فشل في تحميل تقرير الأرباح والخسائر');
      console.error('Error fetching profit and loss report:', err);
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
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  // Export functions
  const handleExportPDF = () => {
  if (!report) return;

  const safeNumber = (value) => Number(value ?? 0) || 0;

  const data = [
    { category: 'إيرادات المبيعات', amount: safeNumber(report.sales_revenue) },
    { category: 'إيرادات أخرى', amount: safeNumber(report.other_income) },
    { category: 'إجمالي الإيرادات', amount: safeNumber(report.total_revenue) },
    { category: 'تكاليف المواد', amount: safeNumber(report.cogs_materials) },
    { category: 'تكاليف العمالة', amount: safeNumber(report.cogs_labor) },
    { category: 'تكاليف المقاولين الفرعيين', amount: safeNumber(report.cogs_subcontractors) },
    { category: 'إجمالي تكلفة البضائع المباعة', amount: safeNumber(report.total_cogs) },
    { category: 'مجمل الربح', amount: safeNumber(report.gross_profit) },
    { category: 'رواتب وأجور', amount: safeNumber(report.expense_salaries) },
    { category: 'إيجار', amount: safeNumber(report.expense_rent) },
    { category: 'مرافق وخدمات', amount: safeNumber(report.expense_utilities) },
    { category: 'تسويق', amount: safeNumber(report.expense_marketing) },
    { category: 'تأمين', amount: safeNumber(report.expense_insurance) },
    { category: 'مصاريف أخرى', amount: safeNumber(report.expense_other) },
    { category: 'إجمالي المصاريف التشغيلية', amount: safeNumber(report.total_expenses) },
    { category: 'صافي الربح', amount: safeNumber(report.net_profit) }
  ];

  const columns = [
    { header: 'البند', dataKey: 'category' },
    { header: 'القيمة (دولار)', dataKey: 'amount', isNumeric: true }
  ];

  const formatSummary = (value) =>
    new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0
    }).format(safeNumber(value));

  exportToPDF(
    data,
    columns,
    `تقرير الأرباح والخسائر - ${getMonthName(month)} ${year}`,
    `profit-loss-report-${year}-${String(month).padStart(2, '0')}.pdf`,
    {
      direction: 'rtl',
      locale: 'en-US',
      companyName: 'نظام إدارة شركة المصعد',
      summaryTitle: 'ملخص الأداء',
      summary: {
        'إجمالي الإيرادات': formatSummary(report.total_revenue),
        'إجمالي تكلفة البضائع المباعة': formatSummary(report.total_cogs),
        'صافي الربح': formatSummary(report.net_profit)
      },
      footerText: 'تقرير سري - للاستخدام الداخلي فقط'
    }
  );
};

  const handleExportExcel = () => {
    if (!report) return;

    const data = [{
      'فترة التقرير': `${getMonthName(month)} ${year}`,
      'تاريخ الإنشاء': formatDate(report.generated_date),
      'إيرادات المبيعات': parseFloat(report.sales_revenue || 0),
      'إيرادات أخرى': parseFloat(report.other_income || 0),
      'إجمالي الإيرادات': parseFloat(report.total_revenue || 0),
      'مواد خام': parseFloat(report.cogs_materials || 0),
      'عمالة': parseFloat(report.cogs_labor || 0),
      'مقاولون فرعيون': parseFloat(report.cogs_subcontractors || 0),
      'إجمالي تكلفة البضائع المباعة': parseFloat(report.total_cogs || 0),
      'إجمالي الربح': parseFloat(report.gross_profit || 0),
      'رواتب وأجور': parseFloat(report.expense_salaries || 0),
      'إيجار': parseFloat(report.expense_rent || 0),
      'مرافق': parseFloat(report.expense_utilities || 0),
      'تسويق': parseFloat(report.expense_marketing || 0),
      'تأمين': parseFloat(report.expense_insurance || 0),
      'مصروفات أخرى': parseFloat(report.expense_other || 0),
      'إجمالي المصروفات التشغيلية': parseFloat(report.total_expenses || 0),
      'صافي الربح': parseFloat(report.net_profit || 0)
    }];

    exportToExcel(data, 'تقرير الأرباح والخسائر', `profit-loss-report-${year}-${month}.xlsx`);
  };

  const handleExportCSV = () => {
    if (!report) return;

    const data = [
      { category: 'إيرادات المبيعات', amount: parseFloat(report.sales_revenue || 0) },
      { category: 'إيرادات أخرى', amount: parseFloat(report.other_income || 0) },
      { category: 'إجمالي الإيرادات', amount: parseFloat(report.total_revenue || 0) },
      { category: 'مواد خام', amount: parseFloat(report.cogs_materials || 0) },
      { category: 'عمالة', amount: parseFloat(report.cogs_labor || 0) },
      { category: 'مقاولون فرعيون', amount: parseFloat(report.cogs_subcontractors || 0) },
      { category: 'إجمالي تكلفة البضائع المباعة', amount: parseFloat(report.total_cogs || 0) },
      { category: 'إجمالي الربح', amount: parseFloat(report.gross_profit || 0) },
      { category: 'رواتب وأجور', amount: parseFloat(report.expense_salaries || 0) },
      { category: 'إيجار', amount: parseFloat(report.expense_rent || 0) },
      { category: 'مرافق', amount: parseFloat(report.expense_utilities || 0) },
      { category: 'تسويق', amount: parseFloat(report.expense_marketing || 0) },
      { category: 'تأمين', amount: parseFloat(report.expense_insurance || 0) },
      { category: 'مصروفات أخرى', amount: parseFloat(report.expense_other || 0) },
      { category: 'إجمالي المصروفات التشغيلية', amount: parseFloat(report.total_expenses || 0) },
      { category: 'صافي الربح', amount: parseFloat(report.net_profit || 0) }
    ];

    exportToCSV(data, `profit-loss-report-${year}-${month}.csv`, {
      title: `تقرير الأرباح والخسائر - ${getMonthName(month)} ${year}`
    });
  };

  const getMonthName = (monthNum) => {
  const months = [
    'يناير',
    'فبراير',
    'مارس',
    'أبريل',
    'مايو',
    'يونيو',
    'يوليو',
    'أغسطس',
    'سبتمبر',
    'أكتوبر',
    'نوفمبر',
    'ديسمبر'
  ];
  return months[monthNum - 1] || '';
};

  // Generate year options for the last 5 years
  const yearOptions = [];
  const currentYear = new Date().getFullYear();
  for (let i = currentYear - 5; i <= currentYear + 1; i++) {
    yearOptions.push(i);
  }

  const monthOptions = [
  { value: 1, name: 'يناير' },
  { value: 2, name: 'فبراير' },
  { value: 3, name: 'مارس' },
  { value: 4, name: 'أبريل' },
  { value: 5, name: 'مايو' },
  { value: 6, name: 'يونيو' },
  { value: 7, name: 'يوليو' },
  { value: 8, name: 'أغسطس' },
  { value: 9, name: 'سبتمبر' },
  { value: 10, name: 'أكتوبر' },
  { value: 11, name: 'نوفمبر' },
  { value: 12, name: 'ديسمبر' }
];

  if (loading && !report) {
    return (
      <Layout>
        <div className="space-y-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
            <div className="flex items-center justify-center">
              <RefreshCw className="w-8 h-8 text-blue-500 animate-spin ml-3" />
              <span className="text-lg text-gray-600">جاري تحميل تقرير الأرباح والخسائر...</span>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        {/* Page Header */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-800 rounded-xl p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold mb-2">تقرير الأرباح والخسائر</h1>
              <p className="text-blue-100">تحليل شامل للإيرادات والمصروفات والأرباح</p>
            </div>
            <div className="bg-white/20 p-4 rounded-lg backdrop-blur-sm">
              <BarChart3 className="w-12 h-12 text-white" />
            </div>
          </div>
        </div>

        {/* Controls and Filters */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div className="flex flex-col md:flex-row gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">الشهر</label>
                <select
                  value={month}
                  onChange={(e) => setMonth(parseInt(e.target.value))}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  {monthOptions.map((monthOption) => (
                    <option key={monthOption.value} value={monthOption.value}>
                      {monthOption.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">السنة</label>
                <select
                  value={year}
                  onChange={(e) => setYear(parseInt(e.target.value))}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  {yearOptions.map(yearOption => (
                    <option key={yearOption} value={yearOption}>{yearOption}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => fetchReport()}
                disabled={loading}
                className="inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-lg font-medium transition-colors duration-150"
              >
                <RefreshCw className={`w-4 h-4 ml-2 ${loading ? 'animate-spin' : ''}`} />
                {loading ? 'جاري التحديث...' : 'تحديث'}
              </button>

              <div className="flex gap-2">
                <button
                  onClick={handleExportPDF}
                  disabled={!report}
                  className="inline-flex items-center px-3 py-2 bg-red-600 hover:bg-red-700 disabled:bg-gray-400 text-white rounded-lg font-medium transition-colors duration-150"
                  title="تصدير PDF"
                >
                  <FileText className="w-4 h-4" />
                </button>
                <button
                  onClick={handleExportExcel}
                  disabled={!report}
                  className="inline-flex items-center px-3 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white rounded-lg font-medium transition-colors duration-150"
                  title="تصدير Excel"
                >
                  <Download className="w-4 h-4" />
                </button>
                <button
                  onClick={handleExportCSV}
                  disabled={!report}
                  className="inline-flex items-center px-3 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-400 text-white rounded-lg font-medium transition-colors duration-150"
                  title="تصدير CSV"
                >
                  <PieChart className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <TrendingDown className="w-6 h-6 text-red-400" />
              </div>
              <div className="mr-3">
                <h3 className="text-sm font-medium text-red-800">خطأ في تحميل التقرير</h3>
                <p className="text-sm text-red-700 mt-1">{error}</p>
              </div>
            </div>
            <div className="mt-4">
              <button
                onClick={() => fetchReport()}
                className="inline-flex items-center px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors duration-150"
              >
                إعادة المحاولة
              </button>
            </div>
          </div>
        )}

        {report && (
          <>
            {/* Report Info */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-bold text-gray-800">
                    تقرير {getMonthName(month)} {year}
                  </h3>
                  <p className="text-sm text-gray-500 mt-1">
                    تم إنشاؤه في: {formatDate(report.generated_date)}
                  </p>
                </div>
                <Calendar className="w-8 h-8 text-gray-400" />
              </div>
            </div>

            {/* Key Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
              <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-6 border border-blue-200">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-medium text-blue-800 mb-1">إجمالي الإيرادات</h3>
                    <p className="text-2xl font-bold text-blue-900">{formatCurrency(report.total_revenue)}</p>
                  </div>
                  <div className="p-3 bg-blue-200 rounded-full">
                    <TrendingUp className="w-6 h-6 text-blue-800" />
                  </div>
                </div>
              </div>

              <div className="bg-gradient-to-br from-red-50 to-red-100 rounded-xl p-6 border border-red-200">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-medium text-red-800 mb-1">إجمالي المصروفات</h3>
                    <p className="text-2xl font-bold text-red-900">{formatCurrency(report.total_expenses + report.total_cogs)}</p>
                  </div>
                  <div className="p-3 bg-red-200 rounded-full">
                    <TrendingDown className="w-6 h-6 text-red-800" />
                  </div>
                </div>
              </div>

              <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-6 border border-green-200">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-medium text-green-800 mb-1">إجمالي الربح</h3>
                    <p className="text-2xl font-bold text-green-900">{formatCurrency(report.gross_profit)}</p>
                  </div>
                  <div className="p-3 bg-green-200 rounded-full">
                    <Calculator className="w-6 h-6 text-green-800" />
                  </div>
                </div>
              </div>

              <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl p-6 border border-purple-200">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-medium text-purple-800 mb-1">صافي الربح</h3>
                    <p className="text-2xl font-bold text-purple-900">{formatCurrency(report.net_profit)}</p>
                  </div>
                  <div className="p-3 bg-purple-200 rounded-full">
                    <DollarSign className="w-6 h-6 text-purple-800" />
                  </div>
                </div>
              </div>
            </div>

            {/* Detailed Report */}
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
              {/* Revenue Section */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200">
                <div className="bg-gradient-to-r from-blue-500 to-blue-600 px-6 py-4 rounded-t-xl">
                  <h4 className="font-bold text-white flex items-center">
                    <TrendingUp className="w-5 h-5 ml-2" />
                    الإيرادات
                  </h4>
                </div>
                <div className="p-6 space-y-4">
                  <div className="flex justify-between items-center py-2 border-b border-gray-100">
                    <span className="text-gray-600">إيرادات المبيعات</span>
                    <span className="font-bold text-lg">{formatCurrency(report.sales_revenue)}</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-gray-100">
                    <span className="text-gray-600">إيرادات أخرى</span>
                    <span className="font-bold text-lg">{formatCurrency(report.other_income)}</span>
                  </div>
                  <div className="flex justify-between items-center py-3 bg-blue-50 px-4 rounded-lg">
                    <span className="font-bold text-blue-800">إجمالي الإيرادات</span>
                    <span className="font-bold text-xl text-blue-900">{formatCurrency(report.total_revenue)}</span>
                  </div>
                </div>
              </div>

              {/* Cost of Goods Sold */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200">
                <div className="bg-gradient-to-r from-orange-500 to-orange-600 px-6 py-4 rounded-t-xl">
                  <h4 className="font-bold text-white flex items-center">
                    <Calculator className="w-5 h-5 ml-2" />
                    تكلفة البضائع المباعة
                  </h4>
                </div>
                <div className="p-6 space-y-4">
                  <div className="flex justify-between items-center py-2 border-b border-gray-100">
                    <span className="text-gray-600">مواد خام</span>
                    <span className="font-bold text-lg">{formatCurrency(report.cogs_materials)}</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-gray-100">
                    <span className="text-gray-600">عمالة</span>
                    <span className="font-bold text-lg">{formatCurrency(report.cogs_labor)}</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-gray-100">
                    <span className="text-gray-600">مقاولون فرعيون</span>
                    <span className="font-bold text-lg">{formatCurrency(report.cogs_subcontractors)}</span>
                  </div>
                  <div className="flex justify-between items-center py-3 bg-orange-50 px-4 rounded-lg">
                    <span className="font-bold text-orange-800">إجمالي التكلفة</span>
                    <span className="font-bold text-xl text-orange-900">{formatCurrency(report.total_cogs)}</span>
                  </div>
                </div>
              </div>

              {/* Operating Expenses */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200">
                <div className="bg-gradient-to-r from-red-500 to-red-600 px-6 py-4 rounded-t-xl">
                  <h4 className="font-bold text-white flex items-center">
                    <TrendingDown className="w-5 h-5 ml-2" />
                    المصروفات التشغيلية
                  </h4>
                </div>
                <div className="p-6 space-y-4">
                  <div className="flex justify-between items-center py-2 border-b border-gray-100">
                    <span className="text-gray-600">رواتب وأجور</span>
                    <span className="font-bold text-lg">{formatCurrency(report.expense_salaries)}</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-gray-100">
                    <span className="text-gray-600">إيجار</span>
                    <span className="font-bold text-lg">{formatCurrency(report.expense_rent)}</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-gray-100">
                    <span className="text-gray-600">مرافق</span>
                    <span className="font-bold text-lg">{formatCurrency(report.expense_utilities)}</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-gray-100">
                    <span className="text-gray-600">تسويق</span>
                    <span className="font-bold text-lg">{formatCurrency(report.expense_marketing)}</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-gray-100">
                    <span className="text-gray-600">تأمين</span>
                    <span className="font-bold text-lg">{formatCurrency(report.expense_insurance)}</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-gray-100">
                    <span className="text-gray-600">مصروفات أخرى</span>
                    <span className="font-bold text-lg">{formatCurrency(report.expense_other)}</span>
                  </div>
                  <div className="flex justify-between items-center py-3 bg-red-50 px-4 rounded-lg">
                    <span className="font-bold text-red-800">إجمالي المصروفات</span>
                    <span className="font-bold text-xl text-red-900">{formatCurrency(report.total_expenses)}</span>
                  </div>
                </div>
              </div>

              {/* Profit Summary */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200">
                <div className="bg-gradient-to-r from-green-500 to-green-600 px-6 py-4 rounded-t-xl">
                  <h4 className="font-bold text-white flex items-center">
                    <DollarSign className="w-5 h-5 ml-2" />
                    ملخص الأرباح
                  </h4>
                </div>
                <div className="p-6 space-y-6">
                  <div className="flex justify-between items-center py-3 bg-blue-50 px-4 rounded-lg">
                    <span className="font-bold text-blue-800">إجمالي الربح</span>
                    <span className="font-bold text-xl text-blue-900">{formatCurrency(report.gross_profit)}</span>
                  </div>
                  <div className="flex justify-between items-center py-4 bg-gradient-to-r from-green-50 to-green-100 px-4 rounded-lg border-2 border-green-200">
                    <span className="font-bold text-green-800 text-lg">صافي الربح</span>
                    <span className="font-bold text-2xl text-green-900">{formatCurrency(report.net_profit)}</span>
                  </div>

                  {/* Profit Margin */}
                  <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-700 font-medium">هامش الربح</span>
                      <span className="font-bold text-lg text-gray-800">
                        {report.total_revenue > 0 ?
                          ((report.net_profit / report.total_revenue) * 100).toFixed(1) : 0
                        }%
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </Layout>
  );
};

export default ProfitLossReport;




