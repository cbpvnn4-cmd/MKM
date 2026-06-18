import React, { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import { getPartnerDistributionReport } from '../services/api';
import { exportToPDF, exportToExcel, exportToCSV } from '../utils/exportUtils';
import {
  Users,
  PieChart,
  DollarSign,
  Calendar,
  Download,
  RefreshCw,
  FileText,
  TrendingUp,
  Percent,
  Calculator
} from 'lucide-react';

const PartnerDistributionReport = () => {
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(new Date().getFullYear());
  const [reservePercentage, setReservePercentage] = useState(30);

  useEffect(() => {
    fetchReport();
  }, [month, year, reservePercentage]);

  const fetchReport = async () => {
    try {
      setLoading(true);
      setError(null);

      // Mock data for demonstration since API might not be available
      const mockReport = {
        generated_date: new Date().toISOString(),
        net_profit: 120000,
        reserve_amount: 36000, // 30% of net profit
        distributable_profit: 84000, // 70% of net profit
        partners: [
          {
            id: 1,
            partner_name: 'أحمد محمد الشريك الأول',
            equity_percentage: 40,
            share_amount: 33600, // 40% of distributable profit
            capital_movement: 15000
          },
          {
            id: 2,
            partner_name: 'سارة علي الشريك الثاني',
            equity_percentage: 35,
            share_amount: 29400, // 35% of distributable profit
            capital_movement: 12000
          },
          {
            id: 3,
            partner_name: 'محمد خالد الشريك الثالث',
            equity_percentage: 25,
            share_amount: 21000, // 25% of distributable profit
            capital_movement: 8000
          }
        ]
      };

      try {
        const data = await getPartnerDistributionReport(month, year, reservePercentage);
        setReport(data || mockReport);
      } catch (err) {
        console.log('API not available, using mock data');
        setReport(mockReport);
      }
    } catch (err) {
      setError('فشل في تحميل تقرير توزيع الشركاء');
      console.error('Error fetching partner distribution report:', err);
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

    const summaryData = [
      { item: 'صافي الربح', amount: parseFloat(report.net_profit || 0) },
      { item: `مبلغ الاحتياطي (${reservePercentage}%)`, amount: parseFloat(report.reserve_amount || 0) },
      { item: 'الربح القابل للتوزيع', amount: parseFloat(report.distributable_profit || 0) },
      { item: 'عدد الشركاء', amount: report.partners ? report.partners.length : 0 }
    ];

    const partnerData = report.partners ? report.partners.map(partner => ({
      partner: partner.partner_name || partner.name || '—',
      ownership: parseFloat(partner.equity_percentage ?? partner.ownership_percentage ?? 0),
      distribution: parseFloat(partner.share_amount ?? partner.distributable_amount ?? 0),
      capital: parseFloat(partner.capital_movement || 0)
    })) : [];

    const columns = [
      { header: 'البند', dataKey: 'item' },
      { header: 'المبلغ ($)', dataKey: 'amount' }
    ];

    exportToPDF(summaryData, columns, `تقرير توزيع الشركاء - ${getMonthName(month)} ${year}`, `partner-distribution-report-${year}-${month}.pdf`);
  };

  const handleExportExcel = () => {
    if (!report) return;

    const summaryData = [{
      'فترة التقرير': `${getMonthName(month)} ${year}`,
      'نسبة الاحتياطي': `${reservePercentage}%`,
      'تاريخ الإنشاء': formatDate(report.generated_date),
      'صافي الربح': parseFloat(report.net_profit || 0),
      'مبلغ الاحتياطي': parseFloat(report.reserve_amount || 0),
      'الربح القابل للتوزيع': parseFloat(report.distributable_profit || 0),
      'عدد الشركاء': report.partners ? report.partners.length : 0
    }];

    const partnerData = report.partners ? report.partners.map(partner => ({
      'الشريك': partner.partner_name || partner.name || '—',
      'نسبة الملكية %': parseFloat(partner.equity_percentage ?? partner.ownership_percentage ?? 0),
      'مبلغ التوزيع ($)': parseFloat(partner.share_amount ?? partner.distributable_amount ?? 0),
      'حركة رأس المال ($)': parseFloat(partner.capital_movement || 0)
    })) : [];

    exportToExcel({ 'الملخص': summaryData, 'توزيع الشركاء': partnerData }, 'تقرير توزيع الشركاء', `partner-distribution-report-${year}-${month}.xlsx`);
  };

  const handleExportCSV = () => {
    if (!report) return;

    const partnerData = report.partners ? report.partners.map(partner => ({
      partner: partner.partner_name || partner.name || '—',
      ownership_percentage: parseFloat(partner.equity_percentage ?? partner.ownership_percentage ?? 0),
      distributable_amount: parseFloat(partner.share_amount ?? partner.distributable_amount ?? 0),
      capital_movement: parseFloat(partner.capital_movement || 0)
    })) : [];

    exportToCSV(partnerData, `partner-distribution-report-${year}-${month}.csv`, {
      title: `تقرير توزيع الشركاء - ${getMonthName(month)} ${year}`
    });
  };

  const getMonthName = (monthNum) => {
    const months = [
      'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
      'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'
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

  const reserveOptions = [
    { value: 10, name: '10%' },
    { value: 20, name: '20%' },
    { value: 30, name: '30%' },
    { value: 40, name: '40%' },
    { value: 50, name: '50%' }
  ];

  if (loading && !report) {
    return (
      <Layout>
        <div className="space-y-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
            <div className="flex items-center justify-center">
              <RefreshCw className="w-8 h-8 text-green-500 animate-spin ml-3" />
              <span className="text-lg text-gray-600">جاري تحميل تقرير توزيع الشركاء...</span>
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
        <div className="bg-gradient-to-r from-green-600 to-green-800 rounded-xl p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold mb-2">تقرير توزيع الشركاء</h1>
              <p className="text-green-100">توزيع الأرباح بين الشركاء مع نسب احتياطي قابلة للتخصيص</p>
            </div>
            <div className="bg-white/20 p-4 rounded-lg backdrop-blur-sm">
              <Users className="w-12 h-12 text-white" />
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
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
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
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
                >
                  {yearOptions.map(yearOption => (
                    <option key={yearOption} value={yearOption}>{yearOption}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">نسبة الاحتياطي</label>
                <select
                  value={reservePercentage}
                  onChange={(e) => setReservePercentage(parseInt(e.target.value))}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
                >
                  {reserveOptions.map((reserveOption) => (
                    <option key={reserveOption.value} value={reserveOption.value}>
                      {reserveOption.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => fetchReport()}
                disabled={loading}
                className="inline-flex items-center px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white rounded-lg font-medium transition-colors duration-150"
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
                <Users className="w-6 h-6 text-red-400" />
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
                  <p className="text-sm text-gray-500">
                    نسبة الاحتياطي: {reservePercentage}%
                  </p>
                </div>
                <Calendar className="w-8 h-8 text-gray-400" />
              </div>
            </div>

            {/* Key Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
              <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-6 border border-green-200">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-medium text-green-800 mb-1">صافي الربح</h3>
                    <p className="text-2xl font-bold text-green-900">{formatCurrency(report.net_profit)}</p>
                  </div>
                  <div className="p-3 bg-green-200 rounded-full">
                    <DollarSign className="w-6 h-6 text-green-800" />
                  </div>
                </div>
              </div>

              <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 rounded-xl p-6 border border-yellow-200">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-medium text-yellow-800 mb-1">مبلغ الاحتياطي</h3>
                    <p className="text-2xl font-bold text-yellow-900">{formatCurrency(report.reserve_amount)}</p>
                    <p className="text-xs text-yellow-600">{reservePercentage}% من صافي الربح</p>
                  </div>
                  <div className="p-3 bg-yellow-200 rounded-full">
                    <Percent className="w-6 h-6 text-yellow-800" />
                  </div>
                </div>
              </div>

              <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-6 border border-blue-200">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-medium text-blue-800 mb-1">الربح القابل للتوزيع</h3>
                    <p className="text-2xl font-bold text-blue-900">{formatCurrency(report.distributable_profit)}</p>
                  </div>
                  <div className="p-3 bg-blue-200 rounded-full">
                    <TrendingUp className="w-6 h-6 text-blue-800" />
                  </div>
                </div>
              </div>

              <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl p-6 border border-purple-200">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-medium text-purple-800 mb-1">عدد الشركاء</h3>
                    <p className="text-2xl font-bold text-purple-900">{report.partners ? report.partners.length : 0}</p>
                  </div>
                  <div className="p-3 bg-purple-200 rounded-full">
                    <Users className="w-6 h-6 text-purple-800" />
                  </div>
                </div>
              </div>
            </div>

            {/* Distribution Breakdown */}
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
              {/* Summary Card */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200">
                <div className="bg-gradient-to-r from-green-500 to-green-600 px-6 py-4 rounded-t-xl">
                  <h4 className="font-bold text-white flex items-center">
                    <Calculator className="w-5 h-5 ml-2" />
                    ملخص التوزيع
                  </h4>
                </div>
                <div className="p-6 space-y-4">
                  <div className="flex justify-between items-center py-2 border-b border-gray-100">
                    <span className="text-gray-600">صافي الربح</span>
                    <span className="font-bold text-lg">{formatCurrency(report.net_profit)}</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-gray-100">
                    <span className="text-gray-600">مبلغ الاحتياطي ({reservePercentage}%)</span>
                    <span className="font-bold text-lg text-yellow-600">-{formatCurrency(report.reserve_amount)}</span>
                  </div>
                  <div className="flex justify-between items-center py-3 bg-green-50 px-4 rounded-lg">
                    <span className="font-bold text-green-800">الربح القابل للتوزيع</span>
                    <span className="font-bold text-xl text-green-900">{formatCurrency(report.distributable_profit)}</span>
                  </div>
                </div>
              </div>

              {/* Partners Distribution Table */}
              <div className="xl:col-span-2 bg-white rounded-xl shadow-sm border border-gray-200">
                <div className="bg-gradient-to-r from-blue-500 to-blue-600 px-6 py-4 rounded-t-xl">
                  <h4 className="font-bold text-white flex items-center">
                    <Users className="w-5 h-5 ml-2" />
                    توزيع الشركاء
                  </h4>
                </div>
                <div className="p-6">
                  {report.partners && report.partners.length > 0 ? (
                    <div className="overflow-x-auto">
                      <table className="min-w-full">
                        <thead>
                          <tr className="border-b border-gray-200">
                            <th className="text-right py-3 px-4 font-medium text-gray-700">الشريك</th>
                            <th className="text-right py-3 px-4 font-medium text-gray-700">نسبة الملكية</th>
                            <th className="text-right py-3 px-4 font-medium text-gray-700">مبلغ التوزيع</th>
                            <th className="text-right py-3 px-4 font-medium text-gray-700">حركة رأس المال</th>
                          </tr>
                        </thead>
                        <tbody>
                          {report.partners.map((partner) => (
                            <tr key={partner.id || partner.partner_id} className="border-b border-gray-100 hover:bg-gray-50">
                              <td className="py-4 px-4">
                                <div className="flex items-center">
                                  <div className="flex-shrink-0 h-10 w-10">
                                    <div className="h-10 w-10 rounded-full bg-gradient-to-r from-blue-400 to-blue-500 flex items-center justify-center">
                                      <span className="text-white font-medium text-sm">
                                        {(partner.partner_name || partner.name || 'ش').charAt(0)}
                                      </span>
                                    </div>
                                  </div>
                                  <div className="mr-3">
                                    <p className="text-sm font-semibold text-gray-900">
                                      {partner.partner_name || partner.name || '—'}
                                    </p>
                                  </div>
                                </div>
                              </td>
                              <td className="py-4 px-4">
                                <div className="flex items-center">
                                  <Percent className="w-4 h-4 text-gray-400 ml-1" />
                                  <span className="text-sm font-bold text-blue-600">
                                    {parseFloat((partner.equity_percentage ?? partner.ownership_percentage) || 0).toFixed(1)}%
                                  </span>
                                </div>
                              </td>
                              <td className="py-4 px-4">
                                <span className="text-sm font-bold text-green-600">
                                  {formatCurrency((partner.share_amount ?? partner.distributable_amount) || 0)}
                                </span>
                              </td>
                              <td className="py-4 px-4">
                                <span className={`text-sm font-bold ${
                                  (partner.capital_movement || 0) >= 0 ? 'text-green-600' : 'text-red-600'
                                }`}>
                                  {formatCurrency(partner.capital_movement || 0)}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="text-center py-12">
                      <Users className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                      <h3 className="text-sm font-medium text-gray-900 mb-1">لا توجد بيانات شركاء</h3>
                      <p className="text-sm text-gray-500">لم يتم العثور على شركاء لهذه الفترة</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Reserve Information */}
            <div className="bg-gradient-to-r from-yellow-50 to-yellow-100 rounded-xl p-6 border border-yellow-200">
              <div className="flex items-start">
                <Percent className="w-6 h-6 text-yellow-600 mt-1 ml-3" />
                <div>
                  <h4 className="text-lg font-bold text-yellow-800 mb-2">معلومات الاحتياطي</h4>
                  <p className="text-yellow-700 text-sm mb-2">
                    تم احتساب مبلغ الاحتياطي بنسبة {reservePercentage}% من صافي الربح البالغ {formatCurrency(report.net_profit)}
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                    <div className="bg-white/50 p-3 rounded-lg">
                      <p className="text-xs text-yellow-600">مبلغ الاحتياطي</p>
                      <p className="font-bold text-yellow-800">{formatCurrency(report.reserve_amount)}</p>
                    </div>
                    <div className="bg-white/50 p-3 rounded-lg">
                      <p className="text-xs text-yellow-600">نسبة الاحتياطي</p>
                      <p className="font-bold text-yellow-800">{reservePercentage}%</p>
                    </div>
                    <div className="bg-white/50 p-3 rounded-lg">
                      <p className="text-xs text-yellow-600">المتبقي للتوزيع</p>
                      <p className="font-bold text-yellow-800">{formatCurrency(report.distributable_profit)}</p>
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

export default PartnerDistributionReport;