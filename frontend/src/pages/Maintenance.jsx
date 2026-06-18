import React, { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import { Link } from 'react-router-dom';
import { getServiceTickets } from '../services/api';

const Maintenance = () => {
  const [stats, setStats] = useState({
    totalTickets: 0,
    openTickets: 0,
    inProgressTickets: 0,
    resolvedTickets: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMaintenanceStats();
  }, []);

  const fetchMaintenanceStats = async () => {
    try {
      const tickets = await getServiceTickets();
      const totalTickets = tickets.length;
      const openTickets = tickets.filter(t => t.status === 'OPEN').length;
      const inProgressTickets = tickets.filter(t => t.status === 'IN_PROGRESS').length;
      const resolvedTickets = tickets.filter(t => t.status === 'RESOLVED').length;

      setStats({
        totalTickets,
        openTickets,
        inProgressTickets,
        resolvedTickets
      });
    } catch (error) {
      console.error('خطأ في جلب إحصائيات الصيانة:', error);
    } finally {
      setLoading(false);
    }
  };

  const maintenanceSections = [
    {
      title: 'تذاكر الخدمة',
      description: 'إدارة تذاكر الخدمة لطلبات صيانة المصاعد',
      path: '/service-tickets',
      icon: 'M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z',
      color: 'blue'
    },
    {
      title: 'سجلات الخدمة',
      description: 'تتبع أنشطة الخدمة وسجلات عمل الفنيين',
      path: '/service-logs',
      icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2',
      color: 'green'
    }
  ];

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">الصيانة</h1>
          <p className="text-gray-600">إدارة تذاكر الخدمة وسجلات الصيانة للمصاعد</p>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-6 border border-blue-200">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-medium text-blue-800 mb-1">إجمالي التذاكر</h3>
                <p className="text-2xl font-bold text-blue-900">{stats.totalTickets}</p>
                <p className="text-xs text-blue-600 mt-1">جميع التذاكر</p>
              </div>
              <div className="p-3 bg-blue-200 rounded-full">
                <svg className="w-6 h-6 text-blue-800" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 rounded-xl p-6 border border-yellow-200">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-medium text-yellow-800 mb-1">تذاكر مفتوحة</h3>
                <p className="text-2xl font-bold text-yellow-900">{stats.openTickets}</p>
                <p className="text-xs text-yellow-600 mt-1">تحتاج معالجة</p>
              </div>
              <div className="p-3 bg-yellow-200 rounded-full">
                <svg className="w-6 h-6 text-yellow-800" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-xl p-6 border border-orange-200">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-medium text-orange-800 mb-1">قيد التنفيذ</h3>
                <p className="text-2xl font-bold text-orange-900">{stats.inProgressTickets}</p>
                <p className="text-xs text-orange-600 mt-1">تحت المعالجة</p>
              </div>
              <div className="p-3 bg-orange-200 rounded-full">
                <svg className="w-6 h-6 text-orange-800" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-6 border border-green-200">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-medium text-green-800 mb-1">تم الحل</h3>
                <p className="text-2xl font-bold text-green-900">{stats.resolvedTickets}</p>
                <p className="text-xs text-green-600 mt-1">تم إنجازها</p>
              </div>
              <div className="p-3 bg-green-200 rounded-full">
                <svg className="w-6 h-6 text-green-800" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
          </div>
        </div>

        {/* Management Sections */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {maintenanceSections.map((section, index) => (
            <Link
              key={index}
              to={section.path}
              className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-all duration-200 transform hover:-translate-y-1"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-start">
                  <div className={`flex-shrink-0 p-3 rounded-lg ${
                    section.color === 'blue' ? 'bg-blue-100' : 'bg-green-100'
                  }`}>
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className={`h-6 w-6 ${
                        section.color === 'blue' ? 'text-blue-600' : 'text-green-600'
                      }`}
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={section.icon} />
                    </svg>
                  </div>
                  <div className="mr-4">
                    <h3 className="text-lg font-semibold text-gray-900 mb-1">{section.title}</h3>
                    <p className="text-sm text-gray-600">{section.description}</p>
                  </div>
                </div>
                <div className={`text-sm font-medium flex items-center ${
                  section.color === 'blue' ? 'text-blue-600' : 'text-green-600'
                }`}>
                  إدارة
                  <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </Layout>
  );
};

export default Maintenance;