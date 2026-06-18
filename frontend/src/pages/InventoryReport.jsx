import React, { useState, useEffect, useMemo } from 'react';
import Layout from '../components/Layout';
import StatCard from '../components/ui/StatCard';
import { getInventoryReport, getElevatorComponentsReport } from '../services/api';

const InventoryReport = () => {
  const [report, setReport] = useState(null);
  const [elevatorReport, setElevatorReport] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchReport();
  }, []);

  const fetchReport = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getInventoryReport();
      setReport(data);

      // Fetch elevator components report
      try {
        const elevatorData = await getElevatorComponentsReport();
        setElevatorReport(elevatorData);
      } catch (elevErr) {
        console.error('خطأ في جلب تقرير مكونات المصاعد:', elevErr);
      }
    } catch (err) {
      console.error('خطأ في جلب تقرير المخزون:', err);
      setError(`خطأ في جلب التقرير: ${err.message}`);

      // Mock data for demonstration
      const mockReport = {
        generated_date: new Date().toISOString(),
        total_products: 25,
        total_inventory_value: 125000,
        low_stock_count: 3,
        warehouses: [
          {
            id: 1,
            name: "المستودع الرئيسي",
            item_count: 15,
            total_value: 75000
          },
          {
            id: 2,
            name: "مستودع فرعي",
            item_count: 10,
            total_value: 50000
          }
        ],
        low_stock_items: [
          {
            id: 1,
            product_name: "منتج أ",
            sku: "PRD-001",
            current_stock: 5,
            reorder_level: 10,
            warehouse_name: "المستودع الرئيسي"
          },
          {
            id: 2,
            product_name: "منتج ب",
            sku: "PRD-002",
            current_stock: 2,
            reorder_level: 15,
            warehouse_name: "مستودع فرعي"
          },
          {
            id: 3,
            product_name: "منتج ج",
            sku: "PRD-003",
            current_stock: 8,
            reorder_level: 20,
            warehouse_name: "المستودع الرئيسي"
          }
        ],
        inventory_items: [
          {
            product_id: 1,
            product_name: "منتج أ",
            sku: "PRD-001",
            current_stock: 5,
            unit_price: 100,
            total_value: 500
          },
          {
            product_id: 2,
            product_name: "منتج ب",
            sku: "PRD-002",
            current_stock: 2,
            unit_price: 250,
            total_value: 500
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
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
  };

  // Calculate statistics
  const recentItems = useMemo(() => report?.inventory_items?.slice(0, 5) || [], [report]);
  const totalProducts = report?.total_products || 0;
  const lowStockCount = report?.low_stock_count || 0;
  const totalValue = report?.total_inventory_value || 0;
  const averageItemValue = totalProducts > 0 ? totalValue / totalProducts : 0;

  const exportToCSV = () => {
    if (!report || !report.inventory_items) return;

    const headers = ['المنتج', 'رمز المنتج', 'الكمية الحالية', 'سعر الوحدة', 'القيمة الإجمالية'];
    const csvData = [
      headers.join(','),
      ...report.inventory_items.map(item => [
        item.product_name,
        item.sku,
        item.current_stock,
        item.unit_price,
        item.total_value
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvData], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `inventory_report_${new Date().toISOString().slice(0, 10)}.csv`;
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
          <h1 className="text-3xl font-bold text-gray-800 mb-2">تقرير المخزون</h1>
          <p className="text-gray-600">تقرير شامل لحالة المخزون والمنتجات</p>
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
          <StatCard
            title="إجمالي المنتجات"
            value={formatNumber(totalProducts)}
            sub="منتج في المخزون"
            color="blue"
            iconPath="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
          />
          <StatCard
            title="القيمة الإجمالية"
            value={formatCurrency(totalValue)}
            sub="قيمة المخزون"
            color="green"
            iconPath="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
          <StatCard
            title="مخزون منخفض"
            value={formatNumber(lowStockCount)}
            sub="منتج يحتاج إعادة تموين"
            color="red"
            iconPath="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
          />
          <StatCard
            title="متوسط قيمة المنتج"
            value={formatCurrency(averageItemValue)}
            sub="لكل منتج"
            color="purple"
            iconPath="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
          />
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          <div className="space-y-6 xl:col-span-2">
            {/* Report Controls */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                <div>
                  <h2 className="text-xl font-semibold text-gray-900">إعدادات التقرير</h2>
                  <p className="text-sm text-gray-500 mt-1">تحديث وتصدير بيانات المخزون</p>
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
            </div>

            {/* Inventory by Warehouse */}
            {report && report.warehouses && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200">
                <div className="px-6 py-4 border-b border-gray-200">
                  <h2 className="text-xl font-semibold text-gray-900">المخزون حسب المستودع</h2>
                </div>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">المستودع</th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">عدد المواد</th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">القيمة الإجمالية</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {report.warehouses.map((warehouse) => (
                        <tr key={warehouse.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            {warehouse.name}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {formatNumber(warehouse.item_count)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600 font-medium">
                            {formatCurrency(warehouse.total_value)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Low Stock Items */}
            {report && report.low_stock_items && report.low_stock_items.length > 0 && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200">
                <div className="px-6 py-4 border-b border-gray-200">
                  <div className="flex items-center">
                    <h2 className="text-xl font-semibold text-gray-900">منتجات بمخزون منخفض</h2>
                    <span className="mr-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                      {report.low_stock_items.length}
                    </span>
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">المنتج</th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">رمز المنتج</th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">المخزون الحالي</th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">مستوى إعادة الطلب</th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">المستودع</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {report.low_stock_items.map((item) => (
                        <tr key={item.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            {item.product_name}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {item.sku}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm">
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                              {formatNumber(item.current_stock)}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {formatNumber(item.reorder_level)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {item.warehouse_name}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Elevator Components Report */}
            {elevatorReport && elevatorReport.elevators && elevatorReport.elevators.length > 0 && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 md:col-span-2">
                <div className="px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50">
                  <div className="flex items-center">
                    <svg className="w-6 h-6 text-blue-600 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                    </svg>
                    <h2 className="text-xl font-semibold text-blue-900">تقرير مكونات المصاعد</h2>
                    <span className="mr-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                      {elevatorReport.total_elevators} مصعد
                    </span>
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">المصعد</th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">المخزون</th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">السعر</th>
                        <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider" colSpan="4">
                          المكونات المباعة
                        </th>
                      </tr>
                      <tr className="bg-blue-50">
                        <th className="px-6 py-2"></th>
                        <th className="px-6 py-2"></th>
                        <th className="px-6 py-2"></th>
                        <th className="px-3 py-2 text-center text-xs font-medium text-blue-700">السكاشن</th>
                        <th className="px-3 py-2 text-center text-xs font-medium text-blue-700">الكيبل (م)</th>
                        <th className="px-3 py-2 text-center text-xs font-medium text-blue-700">الكابينات</th>
                        <th className="px-3 py-2 text-center text-xs font-medium text-blue-700">الأبواب</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {elevatorReport.elevators.map((elevator) => (
                        <tr key={elevator.product_id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900">{elevator.product_name}</div>
                            <div className="text-xs text-gray-500">{elevator.product_sku}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-center">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              elevator.current_stock > 0 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                            }`}>
                              {formatNumber(elevator.current_stock)}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            {formatCurrency(elevator.price_usd)}
                          </td>
                          <td className="px-3 py-4 text-center text-sm text-gray-700 bg-purple-50">
                            {elevator.sold_components.sections || 0}
                          </td>
                          <td className="px-3 py-4 text-center text-sm text-gray-700 bg-green-50">
                            {(elevator.sold_components.cable_meters || 0).toFixed(1)}
                          </td>
                          <td className="px-3 py-4 text-center text-sm text-gray-700 bg-yellow-50">
                            {elevator.sold_components.cabins || 0}
                          </td>
                          <td className="px-3 py-4 text-center text-sm text-gray-700 bg-pink-50">
                            {elevator.sold_components.doors || 0}
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
                  <span className="text-sm text-gray-600">متوسط قيمة المنتج</span>
                  <span className="font-medium text-gray-900">{formatCurrency(averageItemValue)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">عدد المستودعات</span>
                  <span className="font-medium text-gray-900">{formatNumber(report?.warehouses?.length || 0)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">نسبة المخزون المنخفض</span>
                  <span className={`font-medium ${lowStockCount > 0 ? 'text-red-600' : 'text-green-600'}`}>
                    {totalProducts > 0 ? ((lowStockCount / totalProducts) * 100).toFixed(1) + '%' : '0%'}
                  </span>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">أحدث المنتجات</h3>
              <ul className="space-y-4">
                {recentItems.length === 0 ? (
                  <li className="text-sm text-gray-500">لا توجد بيانات لعرضها حاليًا.</li>
                ) : (
                  recentItems.map((item, index) => (
                    <li
                      key={`recent-${item.product_id || index}`}
                      className="flex items-start justify-between"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-900 truncate">{item.product_name}</p>
                        <p className="text-xs text-gray-500 mt-1">
                          {item.sku} - {formatNumber(item.current_stock)} وحدة
                        </p>
                      </div>
                      <div className="text-right ml-3">
                        <p className="text-sm font-medium text-gray-900">
                          {formatCurrency(item.total_value)}
                        </p>
                        <p className="text-xs text-gray-500">
                          {formatCurrency(item.unit_price)}/وحدة
                        </p>
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
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-900">لا يوجد تقرير</h3>
            <p className="mt-1 text-sm text-gray-500">انقر على "تحديث التقرير" لجلب البيانات</p>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default InventoryReport;
