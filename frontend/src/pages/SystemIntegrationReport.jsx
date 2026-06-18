import React, { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import { Card, CardContent, CardHeader } from '../components/ui/card';
import SystemConnectionMap from '../components/SystemConnectionMap';
import ReferenceTracker from '../components/ReferenceTracker';

const SystemIntegrationReport = () => {
  const [reportData, setReportData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedSystem, setSelectedSystem] = useState('all');
  const [dateRange, setDateRange] = useState('7days');
  const [selectedReference, setSelectedReference] = useState(null);

  useEffect(() => {
    fetchReportData();
  }, [selectedSystem, dateRange]);

  const fetchReportData = async () => {
    setLoading(true);
    try {
      // Simulate API call
      const data = generateMockReportData(selectedSystem, dateRange);
      setReportData(data);
    } catch (error) {
      console.error('Error fetching report data:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateMockReportData = (system, range) => {
    return {
      summary: {
        totalTransactions: 147,
        activeConnections: 23,
        systemsInvolved: 4,
        averageProcessingTime: '2.3 ساعة',
        successRate: '96.7%',
        pendingItems: 5
      },
      systemFlow: [
        {
          system: 'أوامر الشراء',
          count: 12,
          percentage: 35,
          status: 'مكتمل',
          connections: [
            { target: 'حركات المخزون', count: 28, type: 'automatic' },
            { target: 'الفواتير المستحقة', count: 10, type: 'manual' }
          ]
        },
        {
          system: 'حركات المخزون',
          count: 45,
          percentage: 42,
          status: 'نشط',
          connections: [
            { target: 'المخازن', count: 45, type: 'automatic' },
            { target: 'تقارير المخزون', count: 15, type: 'automatic' }
          ]
        },
        {
          system: 'أوامر البيع',
          count: 18,
          percentage: 28,
          status: 'مكتمل',
          connections: [
            { target: 'حركات المخزون', count: 35, type: 'automatic' },
            { target: 'الفواتير', count: 18, type: 'automatic' }
          ]
        },
        {
          system: 'التقارير',
          count: 8,
          percentage: 15,
          status: 'محدث',
          connections: [
            { target: 'جميع الأنظمة', count: 120, type: 'automatic' }
          ]
        }
      ],
      recentActivity: [
        {
          id: 1,
          timestamp: '2025-09-24 10:30',
          type: 'purchase_order',
          reference: 'PO-001',
          action: 'تم استلام أمر الشراء',
          connections: ['SM-001', 'SM-002'],
          status: 'completed'
        },
        {
          id: 2,
          timestamp: '2025-09-24 09:15',
          type: 'stock_movement',
          reference: 'SM-003',
          action: 'تم صرف 5 وحدات للعميل',
          connections: ['SO-012'],
          status: 'completed'
        },
        {
          id: 3,
          timestamp: '2025-09-24 08:45',
          type: 'sales_order',
          reference: 'SO-012',
          action: 'تم إنشاء أمر بيع جديد',
          connections: ['SM-003', 'INV-024'],
          status: 'in_progress'
        },
        {
          id: 4,
          timestamp: '2025-09-23 16:20',
          type: 'ap_invoice',
          reference: 'AP-001',
          action: 'فاتورة في انتظار الدفع',
          connections: ['PO-001'],
          status: 'pending'
        }
      ],
      performanceMetrics: {
        automationRate: 89,
        dataConsistency: 94,
        responseTime: 1.2,
        errorRate: 3.3
      },
      alerts: [
        {
          type: 'warning',
          message: 'يوجد 3 أوامر شراء لم تتم معالجتها بعد',
          system: 'purchase_orders',
          timestamp: '2025-09-24 11:00'
        },
        {
          type: 'info',
          message: 'تم تحديث 25 عنصر في المخزون تلقائياً اليوم',
          system: 'inventory',
          timestamp: '2025-09-24 10:45'
        }
      ]
    };
  };

  const handleReferenceClick = (type, reference) => {
    setSelectedReference({ type, reference });
  };

  const getSystemIcon = (system) => {
    const icons = {
      'purchase_orders': '📋',
      'stock_movements': '📦',
      'sales_orders': '🛒',
      'inventory': '📊',
      'reports': '📈',
      'أوامر الشراء': '📋',
      'حركات المخزون': '📦',
      'أوامر البيع': '🛒',
      'التقارير': '📈'
    };
    return icons[system] || '⚙️';
  };

  const getStatusClass = (status) => {
    switch (status) {
      case 'completed':
      case 'مكتمل':
        return 'text-green-600 bg-green-100';
      case 'in_progress':
      case 'نشط':
        return 'text-blue-600 bg-blue-100';
      case 'pending':
      case 'في الانتظار':
        return 'text-yellow-600 bg-yellow-100';
      case 'محدث':
        return 'text-purple-600 bg-purple-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="space-y-6">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-gray-200 rounded w-1/3"></div>
            <div className="h-32 bg-gray-200 rounded"></div>
            <div className="h-64 bg-gray-200 rounded"></div>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">تقرير تكامل الأنظمة</h1>
            <p className="text-gray-600">رؤية شاملة لترابط وتدفق البيانات بين الأنظمة المختلفة</p>
          </div>

          <div className="flex items-center gap-3">
            <select
              value={selectedSystem}
              onChange={(e) => setSelectedSystem(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
            >
              <option value="all">جميع الأنظمة</option>
              <option value="purchase_orders">أوامر الشراء</option>
              <option value="stock_movements">حركات المخزون</option>
              <option value="sales_orders">أوامر البيع</option>
              <option value="inventory">المخزون</option>
            </select>

            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
            >
              <option value="1day">اليوم</option>
              <option value="7days">آخر 7 أيام</option>
              <option value="30days">آخر 30 يوم</option>
              <option value="90days">آخر 3 أشهر</option>
            </select>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
          {Object.entries(reportData.summary).map(([key, value]) => (
            <Card key={key}>
              <CardContent className="p-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-gray-900 mb-1">{value}</div>
                  <div className="text-xs text-gray-500">
                    {key === 'totalTransactions' && 'إجمالي المعاملات'}
                    {key === 'activeConnections' && 'الاتصالات النشطة'}
                    {key === 'systemsInvolved' && 'الأنظمة المشتركة'}
                    {key === 'averageProcessingTime' && 'متوسط وقت المعالجة'}
                    {key === 'successRate' && 'معدل النجاح'}
                    {key === 'pendingItems' && 'العناصر المعلقة'}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* System Flow */}
          <Card>
            <CardHeader>
              <h3 className="text-lg font-semibold">تدفق البيانات بين الأنظمة</h3>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {reportData.systemFlow.map((system, index) => (
                  <div key={index} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">{getSystemIcon(system.system)}</span>
                        <div>
                          <h4 className="font-medium text-gray-900">{system.system}</h4>
                          <p className="text-sm text-gray-500">{system.count} معاملة</p>
                        </div>
                      </div>
                      <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusClass(system.status)}`}>
                        {system.status}
                      </span>
                    </div>

                    {/* Progress bar */}
                    <div className="mb-3">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs text-gray-500">نسبة النشاط</span>
                        <span className="text-xs font-medium">{system.percentage}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                          style={{ width: `${system.percentage}%` }}
                        ></div>
                      </div>
                    </div>

                    {/* Connections */}
                    <div className="space-y-2">
                      <h5 className="text-xs font-medium text-gray-700">الاتصالات:</h5>
                      {system.connections.map((connection, idx) => (
                        <div key={idx} className="flex items-center justify-between text-xs">
                          <div className="flex items-center gap-2">
                            <span className={`w-2 h-2 rounded-full ${
                              connection.type === 'automatic' ? 'bg-green-400' : 'bg-yellow-400'
                            }`}></span>
                            <span className="text-gray-600">{connection.target}</span>
                          </div>
                          <span className="font-medium text-gray-800">{connection.count}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Recent Activity */}
          <Card>
            <CardHeader>
              <h3 className="text-lg font-semibold">النشاط الحديث</h3>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {reportData.recentActivity.map((activity) => (
                  <div
                    key={activity.id}
                    className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
                    onClick={() => handleReferenceClick(activity.type, activity.reference)}
                  >
                    <div className="flex-shrink-0 text-lg">
                      {getSystemIcon(activity.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium text-gray-900">
                          {activity.reference}
                        </span>
                        <span className="text-xs text-gray-500">
                          {activity.timestamp}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 mb-1">{activity.action}</p>
                      {activity.connections.length > 0 && (
                        <div className="flex items-center gap-2 text-xs text-gray-500">
                          <span>مرتبط بـ:</span>
                          {activity.connections.map((conn, idx) => (
                            <span key={idx} className="bg-blue-100 text-blue-800 px-1 py-0.5 rounded text-xs">
                              {conn}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Performance Metrics */}
        <Card>
          <CardHeader>
            <h3 className="text-lg font-semibold">مؤشرات الأداء</h3>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              {Object.entries(reportData.performanceMetrics).map(([key, value]) => (
                <div key={key} className="text-center">
                  <div className="mb-2">
                    <div className={`w-16 h-16 mx-auto rounded-full flex items-center justify-center text-2xl font-bold ${
                      value >= 90 ? 'bg-green-100 text-green-600' :
                      value >= 70 ? 'bg-yellow-100 text-yellow-600' :
                      'bg-red-100 text-red-600'
                    }`}>
                      {typeof value === 'number' ? Math.round(value) : value}
                      {key !== 'responseTime' && typeof value === 'number' && '%'}
                    </div>
                  </div>
                  <h4 className="font-medium text-gray-900 text-sm mb-1">
                    {key === 'automationRate' && 'معدل الأتمتة'}
                    {key === 'dataConsistency' && 'تناسق البيانات'}
                    {key === 'responseTime' && 'وقت الاستجابة (ثانية)'}
                    {key === 'errorRate' && 'معدل الأخطاء'}
                  </h4>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full transition-all duration-500 ${
                        (typeof value === 'number' ? value : 0) >= 90 ? 'bg-green-500' :
                        (typeof value === 'number' ? value : 0) >= 70 ? 'bg-yellow-500' :
                        'bg-red-500'
                      }`}
                      style={{ width: `${typeof value === 'number' ? value : 50}%` }}
                    ></div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Alerts */}
        {reportData.alerts.length > 0 && (
          <Card>
            <CardHeader>
              <h3 className="text-lg font-semibold">التنبيهات والإشعارات</h3>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {reportData.alerts.map((alert, index) => (
                  <div key={index} className={`p-4 rounded-lg border-l-4 ${
                    alert.type === 'warning' ? 'bg-yellow-50 border-yellow-400' :
                    alert.type === 'error' ? 'bg-red-50 border-red-400' :
                    'bg-blue-50 border-blue-400'
                  }`}>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <p className="text-sm text-gray-800 mb-1">{alert.message}</p>
                        <div className="flex items-center gap-2 text-xs text-gray-500">
                          <span>{getSystemIcon(alert.system)} {alert.system}</span>
                          <span>•</span>
                          <span>{alert.timestamp}</span>
                        </div>
                      </div>
                      <div className="text-lg">
                        {alert.type === 'warning' ? '⚠️' :
                         alert.type === 'error' ? '❌' :
                         'ℹ️'}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

      </div>
    </Layout>
  );
};

export default SystemIntegrationReport;