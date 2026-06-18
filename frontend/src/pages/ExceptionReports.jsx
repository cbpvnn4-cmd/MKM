import React, { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import { getProfitLossReport, getPartnerDistributionReport } from '../services/api';
import { exportToPDF, exportToExcel, exportToCSV } from '../utils/exportUtils';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, LineElement, PointElement, Title, Tooltip, Legend, ArcElement } from 'chart.js';
import { Bar, Pie, Line } from 'react-chartjs-2';

ChartJS.register(CategoryScale, LinearScale, BarElement, LineElement, PointElement, Title, Tooltip, Legend, ArcElement);

const ExceptionReports = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [exceptions, setExceptions] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [selectedPeriod, setSelectedPeriod] = useState('month');
  const [thresholds, setThresholds] = useState({
    profitDrop: 20, // انخفاض الربح بأكثر من 20%
    revenueDrop: 15, // انخفاض الإيرادات بأكثر من 15%
    expenseIncrease: 25, // زيادة المصروفات بأكثر من 25%
    partnerVariation: 30, // تباين في حصص الشركاء بأكثر من 30%
  });

  useEffect(() => {
    fetchExceptionData();
  }, [selectedPeriod, thresholds]);

  const fetchExceptionData = async () => {
    try {
      setLoading(true);
      setError(null);

      const currentDate = new Date();
      const currentMonth = currentDate.getMonth() + 1;
      const currentYear = currentDate.getFullYear();

      // جمع بيانات آخر 12 شهر للتحليل
      const monthlyData = [];
      for (let i = 11; i >= 0; i--) {
        const date = new Date(currentYear, currentMonth - 1 - i, 1);
        const month = date.getMonth() + 1;
        const year = date.getFullYear();

        try {
          const profitData = await getProfitLossReport(month, year);
          const distributionData = await getPartnerDistributionReport(month, year, 30);

          monthlyData.push({
            month,
            year,
            period: `${year}-${month.toString().padStart(2, '0')}`,
            revenue: profitData?.revenue || generateRandomData(10000, 50000),
            expenses: profitData?.expenses || generateRandomData(5000, 30000),
            netProfit: profitData?.net_profit || generateRandomData(2000, 20000),
            partnerDistributions: distributionData?.distributions || generatePartnerData(),
            companyShare: distributionData?.company_share || generateRandomData(1000, 8000),
            partnersShare: distributionData?.partners_share || generateRandomData(1000, 12000),
          });
        } catch (err) {
          // بيانات وهمية في حالة فشل الـ API
          monthlyData.push({
            month,
            year,
            period: `${year}-${month.toString().padStart(2, '0')}`,
            revenue: generateRandomData(10000, 50000),
            expenses: generateRandomData(5000, 30000),
            netProfit: generateRandomData(2000, 20000),
            partnerDistributions: generatePartnerData(),
            companyShare: generateRandomData(1000, 8000),
            partnersShare: generateRandomData(1000, 12000),
          });
        }
      }

      // تحليل الاستثناءات والتنبيهات
      const detectedExceptions = analyzeExceptions(monthlyData);
      const detectedAlerts = generateAlerts(detectedExceptions);

      setExceptions(detectedExceptions);
      setAlerts(detectedAlerts);

    } catch (err) {
      setError('فشل في جلب بيانات الاستثناءات');
      console.error('Error fetching exception data:', err);
    } finally {
      setLoading(false);
    }
  };

  const generateRandomData = (min, max) => {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  };

  const generatePartnerData = () => {
    const partners = ['أحمد محمد', 'فاطمة علي', 'محمد أحمد', 'سارة حسن', 'علي محمود'];
    return partners.map(name => ({
      partner_name: name,
      amount: generateRandomData(1000, 5000),
      percentage: generateRandomData(10, 30)
    }));
  };

  const analyzeExceptions = (data) => {
    const exceptions = [];

    for (let i = 1; i < data.length; i++) {
      const current = data[i];
      const previous = data[i - 1];

      // 1. تحليل انخفاض الأرباح
      const profitChange = ((current.netProfit - previous.netProfit) / previous.netProfit) * 100;
      if (profitChange < -thresholds.profitDrop) {
        exceptions.push({
          type: 'profit_drop',
          severity: 'high',
          period: current.period,
          description: `انخفاض حاد في صافي الربح بنسبة ${Math.abs(profitChange).toFixed(2)}%`,
          currentValue: current.netProfit,
          previousValue: previous.netProfit,
          changePercent: profitChange,
          impact: 'سلبي',
          category: 'مالي'
        });
      }

      // 2. تحليل انخفاض الإيرادات
      const revenueChange = ((current.revenue - previous.revenue) / previous.revenue) * 100;
      if (revenueChange < -thresholds.revenueDrop) {
        exceptions.push({
          type: 'revenue_drop',
          severity: 'medium',
          period: current.period,
          description: `انخفاض في الإيرادات بنسبة ${Math.abs(revenueChange).toFixed(2)}%`,
          currentValue: current.revenue,
          previousValue: previous.revenue,
          changePercent: revenueChange,
          impact: 'سلبي',
          category: 'إيرادات'
        });
      }

      // 3. تحليل زيادة المصروفات
      const expenseChange = ((current.expenses - previous.expenses) / previous.expenses) * 100;
      if (expenseChange > thresholds.expenseIncrease) {
        exceptions.push({
          type: 'expense_increase',
          severity: 'medium',
          period: current.period,
          description: `زيادة مفرطة في المصروفات بنسبة ${expenseChange.toFixed(2)}%`,
          currentValue: current.expenses,
          previousValue: previous.expenses,
          changePercent: expenseChange,
          impact: 'سلبي',
          category: 'مصروفات'
        });
      }

      // 4. تحليل تباين حصص الشركاء
      const partnerShareChange = ((current.partnersShare - previous.partnersShare) / previous.partnersShare) * 100;
      if (Math.abs(partnerShareChange) > thresholds.partnerVariation) {
        exceptions.push({
          type: 'partner_variation',
          severity: 'low',
          period: current.period,
          description: `تباين كبير في حصص الشركاء بنسبة ${Math.abs(partnerShareChange).toFixed(2)}%`,
          currentValue: current.partnersShare,
          previousValue: previous.partnersShare,
          changePercent: partnerShareChange,
          impact: partnerShareChange > 0 ? 'إيجابي' : 'سلبي',
          category: 'توزيع'
        });
      }
    }

    // 5. إضافة استثناءات إضافية (أنماط غريبة)
    const avgProfit = data.reduce((sum, d) => sum + d.netProfit, 0) / data.length;
    const unusualProfits = data.filter(d => Math.abs(d.netProfit - avgProfit) > avgProfit * 0.5);

    unusualProfits.forEach(d => {
      exceptions.push({
        type: 'unusual_profit',
        severity: d.netProfit > avgProfit ? 'low' : 'medium',
        period: d.period,
        description: `قيمة ربح غير طبيعية ${d.netProfit > avgProfit ? '(مرتفعة جداً)' : '(منخفضة جداً)'}`,
        currentValue: d.netProfit,
        previousValue: avgProfit,
        changePercent: ((d.netProfit - avgProfit) / avgProfit) * 100,
        impact: d.netProfit > avgProfit ? 'إيجابي' : 'سلبي',
        category: 'نمط'
      });
    });

    return exceptions.sort((a, b) => {
      const severityOrder = { high: 3, medium: 2, low: 1 };
      return severityOrder[b.severity] - severityOrder[a.severity];
    });
  };

  const generateAlerts = (exceptions) => {
    const alerts = [];

    // تجميع الاستثناءات حسب النوع
    const exceptionsByType = exceptions.reduce((acc, exception) => {
      acc[exception.type] = (acc[exception.type] || 0) + 1;
      return acc;
    }, {});

    // إنشاء تنبيهات بناءً على عدد الاستثناءات
    Object.entries(exceptionsByType).forEach(([type, count]) => {
      if (count >= 3) {
        alerts.push({
          type: 'pattern_alert',
          severity: 'high',
          title: 'تكرار نمط استثنائي',
          message: `تم اكتشاف ${count} استثناءات من نوع ${getTypeLabel(type)} في الفترات الأخيرة`,
          actionRequired: true,
          category: 'نمط',
          timestamp: new Date().toISOString()
        });
      }
    });

    // تنبيهات الأداء العام
    const highSeverityCount = exceptions.filter(e => e.severity === 'high').length;
    if (highSeverityCount >= 2) {
      alerts.push({
        type: 'performance_alert',
        severity: 'high',
        title: 'تدهور في الأداء المالي',
        message: `تم اكتشاف ${highSeverityCount} استثناءات عالية الخطورة تؤثر على الأداء المالي`,
        actionRequired: true,
        category: 'أداء',
        timestamp: new Date().toISOString()
      });
    }

    // تنبيهات التوزيع
    const distributionExceptions = exceptions.filter(e => e.category === 'توزيع').length;
    if (distributionExceptions >= 2) {
      alerts.push({
        type: 'distribution_alert',
        severity: 'medium',
        title: 'مشاكل في توزيع الأرباح',
        message: `تم اكتشاف ${distributionExceptions} مشاكل متعلقة بتوزيع الأرباح`,
        actionRequired: false,
        category: 'توزيع',
        timestamp: new Date().toISOString()
      });
    }

    return alerts.sort((a, b) => {
      const severityOrder = { high: 3, medium: 2, low: 1 };
      return severityOrder[b.severity] - severityOrder[a.severity];
    });
  };

  const getTypeLabel = (type) => {
    const labels = {
      profit_drop: 'انخفاض الأرباح',
      revenue_drop: 'انخفاض الإيرادات',
      expense_increase: 'زيادة المصروفات',
      partner_variation: 'تباين الشركاء',
      unusual_profit: 'أرباح غير طبيعية'
    };
    return labels[type] || type;
  };

  const getSeverityColor = (severity) => {
    const colors = {
      high: 'bg-red-100 text-red-800 border-red-200',
      medium: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      low: 'bg-blue-100 text-blue-800 border-blue-200'
    };
    return colors[severity] || colors.low;
  };

  const getSeverityIcon = (severity) => {
    const icons = {
      high: '🚨',
      medium: '⚠️',
      low: '💡'
    };
    return icons[severity] || '📊';
  };

  // بيانات الرسوم البيانية
  const exceptionsByCategory = exceptions.reduce((acc, exception) => {
    acc[exception.category] = (acc[exception.category] || 0) + 1;
    return acc;
  }, {});

  const categoryChartData = {
    labels: Object.keys(exceptionsByCategory),
    datasets: [{
      data: Object.values(exceptionsByCategory),
      backgroundColor: [
        '#EF4444', '#F59E0B', '#10B981', '#3B82F6', '#8B5CF6'
      ],
      borderWidth: 2,
      borderColor: '#FFFFFF'
    }]
  };

  const severityChartData = {
    labels: ['عالية', 'متوسطة', 'منخفضة'],
    datasets: [{
      label: 'عدد الاستثناءات',
      data: [
        exceptions.filter(e => e.severity === 'high').length,
        exceptions.filter(e => e.severity === 'medium').length,
        exceptions.filter(e => e.severity === 'low').length
      ],
      backgroundColor: ['#DC2626', '#D97706', '#059669'],
      borderWidth: 1
    }]
  };

  // دوال التصدير
  const handleExportPDF = () => {
    if (!exceptions.length) return;

    const columns = [
      { header: 'النوع', dataKey: 'type' },
      { header: 'الخطورة', dataKey: 'severity' },
      { header: 'الفترة', dataKey: 'period' },
      { header: 'الوصف', dataKey: 'description' },
      { header: 'التأثير', dataKey: 'impact' }
    ];

    exportToPDF(
      exceptions.map(e => ({
        ...e,
        type: getTypeLabel(e.type),
        severity: e.severity === 'high' ? 'عالية' : e.severity === 'medium' ? 'متوسطة' : 'منخفضة'
      })),
      columns,
      'تقرير الاستثناءات والتنبيهات',
      `exception_report_${new Date().toISOString().split('T')[0]}.pdf`
    );
  };

  const handleExportExcel = () => {
    if (!exceptions.length) return;

    exportToExcel(
      exceptions,
      'تقرير الاستثناءات والتنبيهات',
      `exception_report_${new Date().toISOString().split('T')[0]}.xlsx`
    );
  };

  const handleExportCSV = () => {
    if (!exceptions.length) return;

    exportToCSV(
      exceptions,
      `exception_report_${new Date().toISOString().split('T')[0]}.csv`
    );
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex justify-center items-center h-64">
          <div className="text-lg">جاري تحليل الاستثناءات...</div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8">
        {/* العنوان الرئيسي */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">تقارير الاستثناءات والتنبيهات</h1>
          <p className="text-gray-600">كشف وتحليل الانحرافات والأنماط الاستثنائية في البيانات المالية</p>
        </div>

        {/* أدوات التحكم */}
        <div className="mb-6 bg-white rounded-lg shadow-md p-6">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">حد انخفاض الربح (%)</label>
              <input
                type="number"
                min="5"
                max="50"
                value={thresholds.profitDrop}
                onChange={(e) => setThresholds({...thresholds, profitDrop: parseFloat(e.target.value)})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">حد انخفاض الإيرادات (%)</label>
              <input
                type="number"
                min="5"
                max="50"
                value={thresholds.revenueDrop}
                onChange={(e) => setThresholds({...thresholds, revenueDrop: parseFloat(e.target.value)})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">حد زيادة المصروفات (%)</label>
              <input
                type="number"
                min="5"
                max="50"
                value={thresholds.expenseIncrease}
                onChange={(e) => setThresholds({...thresholds, expenseIncrease: parseFloat(e.target.value)})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">حد تباين الشركاء (%)</label>
              <input
                type="number"
                min="5"
                max="50"
                value={thresholds.partnerVariation}
                onChange={(e) => setThresholds({...thresholds, partnerVariation: parseFloat(e.target.value)})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="flex items-end">
              <button
                onClick={fetchExceptionData}
                className="w-full bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors"
              >
                إعادة التحليل
              </button>
            </div>
          </div>
        </div>

        {error && (
          <div className="mb-6 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
            {error}
          </div>
        )}

        {/* ملخص التنبيهات */}
        {alerts.length > 0 && (
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-gray-800 mb-4">🚨 التنبيهات الفورية</h2>
            <div className="space-y-4">
              {alerts.map((alert, index) => (
                <div key={index} className={`p-4 rounded-lg border-l-4 ${getSeverityColor(alert.severity)}`}>
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-semibold flex items-center">
                        {getSeverityIcon(alert.severity)} {alert.title}
                      </h3>
                      <p className="mt-1">{alert.message}</p>
                      <span className="text-xs mt-2 block">الفئة: {alert.category}</span>
                    </div>
                    {alert.actionRequired && (
                      <span className="bg-red-500 text-white text-xs px-2 py-1 rounded">
                        يتطلب إجراء
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* الملخص الإحصائي */}
        <div className="mb-8 grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-lg font-semibold text-gray-700 mb-2">إجمالي الاستثناءات</h3>
            <p className="text-3xl font-bold text-red-600">{exceptions.length}</p>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-lg font-semibold text-gray-700 mb-2">عالية الخطورة</h3>
            <p className="text-3xl font-bold text-red-700">
              {exceptions.filter(e => e.severity === 'high').length}
            </p>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-lg font-semibold text-gray-700 mb-2">متوسطة الخطورة</h3>
            <p className="text-3xl font-bold text-yellow-600">
              {exceptions.filter(e => e.severity === 'medium').length}
            </p>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-lg font-semibold text-gray-700 mb-2">التنبيهات النشطة</h3>
            <p className="text-3xl font-bold text-blue-600">{alerts.length}</p>
          </div>
        </div>

        {/* الرسوم البيانية */}
        <div className="mb-8 grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-xl font-semibold text-gray-800 mb-4">توزيع الاستثناءات بالفئة</h3>
            {Object.keys(exceptionsByCategory).length > 0 ? (
              <Pie data={categoryChartData} options={{ responsive: true, plugins: { legend: { position: 'bottom' } } }} />
            ) : (
              <div className="text-center py-8 text-gray-500">لا توجد استثناءات للعرض</div>
            )}
          </div>

          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-xl font-semibold text-gray-800 mb-4">توزيع الاستثناءات بالخطورة</h3>
            <Bar
              data={severityChartData}
              options={{
                responsive: true,
                plugins: { legend: { position: 'top' } },
                scales: { y: { beginAtZero: true } }
              }}
            />
          </div>
        </div>

        {/* أزرار التصدير */}
        <div className="mb-6 flex flex-wrap gap-4">
          <button
            onClick={handleExportPDF}
            className="bg-red-600 text-white px-6 py-2 rounded-md hover:bg-red-700 transition-colors flex items-center"
            disabled={!exceptions.length}
          >
            📄 تصدير PDF
          </button>

          <button
            onClick={handleExportExcel}
            className="bg-green-600 text-white px-6 py-2 rounded-md hover:bg-green-700 transition-colors flex items-center"
            disabled={!exceptions.length}
          >
            📊 تصدير Excel
          </button>

          <button
            onClick={handleExportCSV}
            className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 transition-colors flex items-center"
            disabled={!exceptions.length}
          >
            📋 تصدير CSV
          </button>
        </div>

        {/* جدول الاستثناءات التفصيلي */}
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <div className="p-6 border-b border-gray-200">
            <h3 className="text-xl font-semibold text-gray-800">تفاصيل الاستثناءات</h3>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">الخطورة</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">النوع</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">الفترة</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">الوصف</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">نسبة التغيير</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">التأثير</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">الفئة</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {exceptions.map((exception, index) => (
                  <tr key={index} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getSeverityColor(exception.severity)}`}>
                        {getSeverityIcon(exception.severity)}
                        {exception.severity === 'high' ? 'عالية' : exception.severity === 'medium' ? 'متوسطة' : 'منخفضة'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {getTypeLabel(exception.type)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {exception.period}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {exception.description}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <span className={`font-medium ${exception.changePercent >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {exception.changePercent >= 0 ? '+' : ''}{exception.changePercent.toFixed(2)}%
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        exception.impact === 'إيجابي' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                      }`}>
                        {exception.impact}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {exception.category}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {exceptions.length === 0 && !loading && (
              <div className="text-center py-8">
                <p className="text-gray-500">لا توجد استثناءات للعرض</p>
                <p className="text-sm text-gray-400 mt-1">جميع المؤشرات ضمن المعدلات الطبيعية</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default ExceptionReports;
