import React, { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import { Link } from 'react-router-dom';
import { ChartBarLabelCustom } from '../components/ChartBarLabelCustom';

const Reports = () => {
  const [stats, setStats] = useState({
    totalReports: 8,
    availableReports: 6,
    lastGenerated: '2024-03-15',
    mostUsed: 'تقرير الأرباح والخسائر'
  });

  const reports = [
    {
      title: 'تقرير الأرباح والخسائر',
      description: 'عرض بيانات الأرباح والخسائر الشهرية مع تفاصيل الإيرادات والمصروفات',
      path: '/reports/profit-loss',
      icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z',
      color: 'from-blue-50 to-blue-100 border-blue-200',
      iconBg: 'bg-blue-200',
      iconColor: 'text-blue-800',
      category: 'مالي',
      frequency: 'شهري',
      lastRun: '2024-03-01'
    },
    {
      title: 'تقرير توزيع الشركاء',
      description: 'عرض توزيع الأرباح بين الشركاء مع نسب احتياطي قابلة للتخصيص',
      path: '/reports/partner-distributions',
      icon: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 919.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z',
      color: 'from-green-50 to-green-100 border-green-200',
      iconBg: 'bg-green-200',
      iconColor: 'text-green-800',
      category: 'شركاء',
      frequency: 'شهري',
      lastRun: '2024-02-28'
    },
    {
      title: 'تقرير الميزانية العمومية',
      description: 'عرض الوضع المالي للشركة مع الأصول والخصوم وحقوق الملكية',
      path: '/reports/balance-sheet',
      icon: 'M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4',
      color: 'from-purple-50 to-purple-100 border-purple-200',
      iconBg: 'bg-purple-200',
      iconColor: 'text-purple-800',
      category: 'مالي',
      frequency: 'ربعي',
      lastRun: '2024-01-31'
    },
    {
      title: 'تقرير توزيع الأرباح',
      description: 'عرض تقارير مفصلة لتوزيع الأرباح مع تفصيل الشركاء والاتجاهات التاريخية',
      path: '/reports/profit-distribution',
      icon: 'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
      color: 'from-orange-50 to-orange-100 border-orange-200',
      iconBg: 'bg-orange-200',
      iconColor: 'text-orange-800',
      category: 'توزيع',
      frequency: 'شهري',
      lastRun: '2024-03-01'
    },
    {
      title: 'تقرير المخزون',
      description: 'عرض مستويات المخزون الحالية وتوزيع المستودعات وتنبيهات نفاد المخزون',
      path: '/reports/inventory',
      icon: 'M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4',
      color: 'from-indigo-50 to-indigo-100 border-indigo-200',
      iconBg: 'bg-indigo-200',
      iconColor: 'text-indigo-800',
      category: 'مخزون',
      frequency: 'أسبوعي',
      lastRun: '2024-03-10'
    },
    {
      title: 'تقرير التقاعد الشهري',
      description: 'عرض تفاصيل التقاعد والانسحابات الشهرية للشركاء',
      path: '/reports/monthly-retirement',
      icon: 'M13 7h8m0 0v8m0-8l-8 8-4-4-6 6',
      color: 'from-red-50 to-red-100 border-red-200',
      iconBg: 'bg-red-200',
      iconColor: 'text-red-800',
      category: 'تقاعد',
      frequency: 'شهري',
      lastRun: '2024-02-29'
    },
    {
      title: 'تقرير تكامل الأنظمة',
      description: 'رؤية شاملة لترابط وتدفق البيانات بين الأنظمة المختلفة مع مؤشرات الأداء',
      path: '/reports/system-integration',
      icon: 'M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1',
      color: 'from-teal-50 to-teal-100 border-teal-200',
      iconBg: 'bg-teal-200',
      iconColor: 'text-teal-800',
      category: 'نظام',
      frequency: 'مباشر',
      lastRun: 'الآن'
    }
  ];

  const categories = [
    { name: 'جميع التقارير', value: 'all', count: reports.length },
    { name: 'مالي', value: 'مالي', count: reports.filter(r => r.category === 'مالي').length },
    { name: 'شركاء', value: 'شركاء', count: reports.filter(r => r.category === 'شركاء').length },
    { name: 'توزيع', value: 'توزيع', count: reports.filter(r => r.category === 'توزيع').length },
    { name: 'مخزون', value: 'مخزون', count: reports.filter(r => r.category === 'مخزون').length },
    { name: 'نظام', value: 'نظام', count: reports.filter(r => r.category === 'نظام').length }
  ];

  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  const filteredReports = reports.filter(report => {
    const matchesCategory = selectedCategory === 'all' || report.category === selectedCategory;
    const matchesSearch = report.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         report.description.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const formatDate = (dateString) => {
    if (!dateString) return '—';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const formatNumber = (value) => new Intl.NumberFormat('en-US').format(value || 0);

  return (
    <Layout>
      <div className="space-y-6">
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">التقارير</h1>
          <p className="text-gray-600">عرض وإنشاء التقارير المالية والإدارية المختلفة</p>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
          <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-6 border border-blue-200">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-medium text-blue-800 mb-1">إجمالي التقارير</h3>
                <p className="text-2xl font-bold text-blue-900">{formatNumber(stats.totalReports)}</p>
                <p className="text-xs text-blue-600 mt-1">تقرير متاح</p>
              </div>
              <div className="p-3 bg-blue-200 rounded-full">
                <svg className="w-6 h-6 text-blue-800" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-6 border border-green-200">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-medium text-green-800 mb-1">تقارير نشطة</h3>
                <p className="text-2xl font-bold text-green-900">{formatNumber(stats.availableReports)}</p>
                <p className="text-xs text-green-600 mt-1">قابلة للتشغيل</p>
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
                <h3 className="text-sm font-medium text-purple-800 mb-1">آخر تقرير</h3>
                <p className="text-lg font-bold text-purple-900">{formatDate(stats.lastGenerated)}</p>
                <p className="text-xs text-purple-600 mt-1">تم إنشاؤه</p>
              </div>
              <div className="p-3 bg-purple-200 rounded-full">
                <svg className="w-6 h-6 text-purple-800" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-xl p-6 border border-orange-200">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-medium text-orange-800 mb-1">الأكثر استخداماً</h3>
                <p className="text-sm font-bold text-orange-900 leading-tight">{stats.mostUsed}</p>
                <p className="text-xs text-orange-600 mt-1">تقرير شائع</p>
              </div>
              <div className="p-3 bg-orange-200 rounded-full">
                <svg className="w-6 h-6 text-orange-800" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
              </div>
            </div>
          </div>
        </div>

        {/* Bar Chart Section */}
        <div className="mb-6">
          <ChartBarLabelCustom />
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          <div className="space-y-6 xl:col-span-2">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                <div>
                  <h2 className="text-xl font-semibold text-gray-900">قائمة التقارير</h2>
                  <p className="text-sm text-gray-500 mt-1">ابحث وفرز التقارير حسب الفئة أو النوع.</p>
                </div>
              </div>

              <div className="mt-6 grid grid-cols-1 lg:grid-cols-3 gap-4">
                <div className="lg:col-span-2">
                  <div className="relative">
                    <span className="absolute inset-y-0 right-0 flex items-center pr-3">
                      <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-4.35-4.35M10.5 18a7.5 7.5 0 100-15 7.5 7.5 0 000 15z" />
                      </svg>
                    </span>
                    <input
                      type="text"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      placeholder="ابحث في التقارير بالاسم أو الوصف..."
                      className="w-full pl-4 pr-10 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-shadow duration-150"
                    />
                  </div>
                </div>
                <div>
                  <select
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-shadow duration-150"
                  >
                    {categories.map((category) => (
                      <option key={category.value} value={category.value}>
                        {category.name} ({category.count})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
                {filteredReports.length === 0 ? (
                  <div className="lg:col-span-2 text-center py-12">
                    <svg className="mx-auto h-12 w-12 text-gray-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                    <h3 className="text-sm font-medium text-gray-900 mb-1">لا توجد تقارير</h3>
                    <p className="text-sm text-gray-500">لم يتم العثور على تقارير تطابق معايير البحث الحالية</p>
                  </div>
                ) : (
                  filteredReports.map((report, index) => (
                    <Link
                      key={index}
                      to={report.path}
                      className={`block bg-gradient-to-br ${report.color} rounded-xl p-6 hover:shadow-lg transition-all duration-200 transform hover:-translate-y-1`}
                    >
                      <div className="flex items-start">
                        <div className={`flex-shrink-0 ${report.iconBg} p-3 rounded-lg`}>
                          <svg className={`h-6 w-6 ${report.iconColor}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={report.icon} />
                          </svg>
                        </div>
                        <div className="mr-4 flex-1">
                          <div className="flex items-center justify-between mb-2">
                            <h3 className="text-lg font-semibold text-gray-900">{report.title}</h3>
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              report.category === 'مالي' ? 'bg-blue-100 text-blue-800' :
                              report.category === 'شركاء' ? 'bg-green-100 text-green-800' :
                              report.category === 'توزيع' ? 'bg-orange-100 text-orange-800' :
                              report.category === 'مخزون' ? 'bg-indigo-100 text-indigo-800' :
                              'bg-gray-100 text-gray-800'
                            }`}>
                              {report.category}
                            </span>
                          </div>
                          <p className="text-sm text-gray-600 mb-3 leading-relaxed">{report.description}</p>
                          <div className="flex items-center justify-between text-xs text-gray-500">
                            <div className="flex items-center gap-4">
                              <span>التكرار: {report.frequency}</span>
                              <span>آخر تشغيل: {formatDate(report.lastRun)}</span>
                            </div>
                            <div className="flex items-center text-blue-600 font-medium">
                              <span className="ml-1">عرض التقرير</span>
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6L8 8l2 2-2 2 2 2-2 2" />
                              </svg>
                            </div>
                          </div>
                        </div>
                      </div>
                    </Link>
                  ))
                )}
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">توزيع الفئات</h3>
              <div className="space-y-4">
                {categories.slice(1).map((category) => {
                  const totalReports = reports.length || 1;
                  const percentage = Math.round((category.count / totalReports) * 100);
                  const clamped = Math.min(100, Math.max(percentage, 0));
                  return (
                    <div key={category.value}>
                      <div className="flex items-center justify-between text-sm text-gray-600 mb-1">
                        <span>{category.name}</span>
                        <span className="font-medium text-gray-900">{formatNumber(category.count)}</span>
                      </div>
                      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div className={`h-full ${
                          category.value === 'مالي' ? 'bg-blue-500' :
                          category.value === 'شركاء' ? 'bg-green-500' :
                          category.value === 'توزيع' ? 'bg-orange-500' :
                          category.value === 'مخزون' ? 'bg-indigo-500' :
                          'bg-purple-500'
                        }`} style={{ width: `${clamped}%` }} />
                      </div>
                      <div className="text-xs text-gray-400 mt-1">{clamped}% من الإجمالي</div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">أحدث التقارير</h3>
              <ul className="space-y-4">
                {reports.slice(0, 5).length === 0 ? (
                  <li className="text-sm text-gray-500">لا توجد بيانات لعرضها حاليًا.</li>
                ) : (
                  reports.slice(0, 5).map((report, index) => (
                    <li
                      key={`recent-${index}`}
                      className="flex items-start justify-between"
                    >
                      <div>
                        <p className="text-sm font-semibold text-gray-900">{report.title}</p>
                        <p className="text-xs text-gray-500 mt-1">
                          {report.frequency} - آخر تشغيل: {formatDate(report.lastRun)}
                        </p>
                      </div>
                      <Link
                        to={report.path}
                        className="text-xs text-blue-600 hover:text-blue-800 font-medium"
                      >
                        عرض التفاصيل
                      </Link>
                    </li>
                  ))
                )}
              </ul>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">إجراءات سريعة</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <button className="inline-flex items-center justify-center px-4 py-3 text-sm font-medium rounded-lg text-blue-700 bg-blue-100 hover:bg-blue-200 transition-colors duration-150">
              <svg className="w-5 h-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              تصدير جميع التقارير
            </button>
            <button className="inline-flex items-center justify-center px-4 py-3 text-sm font-medium rounded-lg text-green-700 bg-green-100 hover:bg-green-200 transition-colors duration-150">
              <svg className="w-5 h-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
              </svg>
              جدولة التقارير التلقائية
            </button>
            <button className="inline-flex items-center justify-center px-4 py-3 text-sm font-medium rounded-lg text-purple-700 bg-purple-100 hover:bg-purple-200 transition-colors duration-150">
              <svg className="w-5 h-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              </svg>
              إعدادات التقارير
            </button>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default Reports;