import React, { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import { Link } from 'react-router-dom';
import { getInvoices, getSalesOrders, getContracts } from '../services/api';

const Sales = () => {
  const [salesStats, setSalesStats] = useState({
    totalSales: 0,
    monthlySales: 0,
    pendingOrders: 0,
    totalInvoices: 0
  });
  const [recentHighlights, setRecentHighlights] = useState([]);
  const [recentSalesOrders, setRecentSalesOrders] = useState([]);
  const [recentContracts, setRecentContracts] = useState([]);
  const [loading, setLoading] = useState(true);

  const extractInvoiceTotal = (invoice = {}) => {
    const raw = invoice.total_usd ?? invoice.total ?? invoice.amount;
    if (typeof raw === 'number') return raw;
    const parsed = parseFloat(raw);
    return Number.isFinite(parsed) ? parsed : 0;
  };

  const parseDateValue = (value) => {
    if (!value) return null;
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  };

  const buildRecentHighlights = (invoicesList = [], salesOrdersList = [], contractsList = []) => {
    const invoiceActivities = (invoicesList || []).map((invoice) => {
      const date =
        parseDateValue(invoice.issueDate) ||
        parseDateValue(invoice.issue_date) ||
        parseDateValue(invoice.createdAt) ||
        parseDateValue(invoice.created_at);

      return {
        id: invoice.id ? `invoice-${invoice.id}` : `invoice-${invoice.invoiceNo || invoice.invoice_no || Math.random()}`.replace(/\s+/g, ''),
        type: 'invoice',
        title: `إصدار فاتورة ${invoice.invoiceNo || invoice.invoice_no || ''}`.trim(),
        description: invoice.customer ? `العميل: ${invoice.customer}` : 'فاتورة مبيعات',
        amount: extractInvoiceTotal(invoice) || null,
        amountLabel: 'مبلغ الفاتورة',
        amountClass: 'text-blue-600',
        indicatorClass: 'bg-blue-500',
        date
      };
    }).filter((activity) => activity.date);

    const orderActivities = (salesOrdersList || []).map((order) => {
      const date =
        parseDateValue(order.so_date) ||
        parseDateValue(order.date) ||
        parseDateValue(order.createdAt) ||
        parseDateValue(order.created_at);

      const computedTotal = (() => {
        if (typeof order.total_usd === 'number') return order.total_usd;
        if (Array.isArray(order.items) && order.items.length > 0) {
          const sum = order.items.reduce((acc, item) => {
            const qty = parseFloat(item.qty ?? item.quantity ?? 0) || 0;
            const unit = parseFloat(item.unitPrice ?? item.unit_price_usd ?? 0) || 0;
            return acc + qty * unit;
          }, 0);
          return sum || null;
        }
        return null;
      })();

      const status = order.status ? order.status.toUpperCase() : 'UNKNOWN';
      const statusLabelMap = {
        DRAFT: 'مسودة',
        CONFIRMED: 'مؤكد',
        FULFILLED: 'مكتمل',
        INVOICED: 'مفوترة',
        CANCELLED: 'ملغاة'
      };

      return {
        id: order.id ? `order-${order.id}` : `order-${order.so_no || Math.random()}`.replace(/\s+/g, ''),
        type: 'sales_order',
        title: `أمر بيع ${order.so_no || ''}`.trim(),
        description: `الحالة: ${statusLabelMap[status] || status}`,
        amount: computedTotal,
        amountLabel: 'قيمة الطلب',
        amountClass: 'text-green-600',
        indicatorClass: status === 'FULFILLED' ? 'bg-green-500' : status === 'CONFIRMED' ? 'bg-amber-500' : 'bg-gray-400',
        date
      };
    }).filter((activity) => activity.date);

    const contractActivities = (contractsList || []).map((contract) => {
      const date =
        parseDateValue(contract.created_at) ||
        parseDateValue(contract.createdAt) ||
        parseDateValue(contract.start_date) ||
        new Date();

      const contractTotal = parseFloat(contract.total_amount || 0);

      const status = contract.status ? contract.status.toUpperCase() : 'DRAFT';
      const statusLabelMap = {
        DRAFT: 'مسودة',
        ACTIVE: 'نشط',
        COMPLETED: 'مكتمل',
        TERMINATED: 'ملغي'
      };

      return {
        id: contract.id ? `contract-${contract.id}` : `contract-${contract.contract_no || Math.random()}`.replace(/\s+/g, ''),
        type: 'contract',
        title: `عقد ${contract.contract_no || ''}`.trim(),
        description: `${contract.customer_name || contract.customer || 'عميل'} - ${statusLabelMap[status] || status}`,
        amount: contractTotal,
        amountLabel: 'قيمة العقد',
        amountClass: 'text-indigo-600',
        indicatorClass: status === 'ACTIVE' ? 'bg-indigo-500' : status === 'COMPLETED' ? 'bg-green-500' : 'bg-gray-400',
        date
      };
    }).filter((activity) => activity.date);

    return [...invoiceActivities, ...orderActivities, ...contractActivities]
      .sort((a, b) => b.date - a.date)
      .slice(0, 5);
  };

  useEffect(() => {
    fetchSalesDataFromApi();
  }, []);

  const fetchSalesDataFromApi = async () => {
    try {
      setLoading(true);
      const [invRes, soRes, contractRes] = await Promise.allSettled([
        getInvoices(),
        getSalesOrders(),
        getContracts()
      ]);

      const invoices = invRes.status === 'fulfilled' ? (Array.isArray(invRes.value) ? invRes.value : []) : [];
      const salesOrders = soRes.status === 'fulfilled' ? (Array.isArray(soRes.value) ? soRes.value : []) : [];
      const contracts = contractRes.status === 'fulfilled' ? (Array.isArray(contractRes.value) ? contractRes.value : []) : [];

      const totalSales = invoices.reduce((sum, inv) => sum + extractInvoiceTotal(inv), 0);

      const now = new Date();
      const year = now.getFullYear();
      const month = now.getMonth();
      const monthlySales = invoices.reduce((sum, inv) => {
        const invoiceDate =
          parseDateValue(inv.issueDate) ||
          parseDateValue(inv.issue_date) ||
          parseDateValue(inv.createdAt) ||
          parseDateValue(inv.created_at);
        if (!invoiceDate) return sum;
        return invoiceDate.getFullYear() === year && invoiceDate.getMonth() === month
          ? sum + extractInvoiceTotal(inv)
          : sum;
      }, 0);

      const pendingOrders = salesOrders.filter((o) => ['DRAFT', 'CONFIRMED'].includes((o.status || '').toUpperCase())).length;
      const totalInvoices = invoices.length;

      setSalesStats({ totalSales, monthlySales, pendingOrders, totalInvoices });
      setRecentHighlights(buildRecentHighlights(invoices, salesOrders, contracts));
      
      // جهّز آخر 10 أوامر بيع لعرضها في جدول سريع
      const latestOrders = [...salesOrders]
        .sort((a, b) => {
          const da = parseDateValue(a.so_date || a.date || a.created_at || a.createdAt) || new Date(0);
          const db = parseDateValue(b.so_date || b.date || b.created_at || b.createdAt) || new Date(0);
          return db - da;
        })
        .slice(0, 10);
      setRecentSalesOrders(latestOrders);
      
      // جهّز آخر 5 عقود لعرضها
      const latestContracts = [...contracts]
        .sort((a, b) => {
          const da = parseDateValue(a.created_at || a.createdAt || a.start_date) || new Date(0);
          const db = parseDateValue(b.created_at || b.createdAt || b.start_date) || new Date(0);
          return db - da;
        })
        .slice(0, 5);
      setRecentContracts(latestContracts);
    } catch (error) {
      console.error('Error loading sales summary:', error);
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

  const salesSections = [
    {
      title: 'العقود والاتفاقيات',
      description: 'إدارة عقود العملاء وتحويلها إلى أوامر بيع عند التوقيع',
      path: '/contracts',
      icon: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z',
      bgGradient: 'from-indigo-50 to-indigo-100',
      borderColor: 'border-indigo-200',
      iconBg: 'bg-indigo-200',
      iconColor: 'text-indigo-800',
      textColor: 'text-indigo-600'
    },
    {
      title: 'طلبات المبيعات',
      description: 'إدارة أوامر البيع ومتابعة حالتها وتحديث المخزون المرتبط بها',
      path: '/sales-orders',
      icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2',
      bgGradient: 'from-blue-50 to-blue-100',
      borderColor: 'border-blue-200',
      iconBg: 'bg-blue-200',
      iconColor: 'text-blue-800',
      textColor: 'text-blue-600'
    },
    {
      title: 'الفواتير والتحصيل',
      description: 'إنشاء الفواتير وتتبع حالة السداد ومواعيد الاستحقاق',
      path: '/invoices',
      icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z',
      bgGradient: 'from-purple-50 to-purple-100',
      borderColor: 'border-purple-200',
      iconBg: 'bg-purple-200',
      iconColor: 'text-purple-800',
      textColor: 'text-purple-600'
    },
    {
      title: 'المنتجات والمخزون',
      description: 'عرض المواد المتاحة وتحرير الأسعار ومستويات المخزون بسهولة',
      path: '/products',
      icon: 'M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4',
      bgGradient: 'from-green-50 to-green-100',
      borderColor: 'border-green-200',
      iconBg: 'bg-green-200',
      iconColor: 'text-green-800',
      textColor: 'text-green-600'
    },
    {
      title: 'العملاء والعلاقات',
      description: 'متابعة بيانات العملاء وقنوات التواصل وتاريخ العمليات',
      path: '/customers',
      icon: 'M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z',
      bgGradient: 'from-orange-50 to-orange-100',
      borderColor: 'border-orange-200',
      iconBg: 'bg-orange-200',
      iconColor: 'text-orange-800',
      textColor: 'text-orange-600'
    }
  ];

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6" dir="rtl">
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">لوحة مراقبة المبيعات</h1>
          <p className="text-gray-600">نظرة شاملة على الأداء الشهري، الطلبات المعلقة، وعدد الفواتير الصادرة.</p>
        </div>

        {/* Sales Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
          <div className="bg-gradient-to-br from-indigo-50 to-indigo-100 rounded-xl p-6 border border-indigo-200">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-medium text-indigo-800 mb-1">إجمالي العقود</h3>
                <p className="text-2xl font-bold text-indigo-900">
                  {recentContracts.length}
                </p>
                <p className="text-xs text-indigo-600 mt-1">
                  جميع العقود النشطة
                </p>
              </div>
              <div className="p-3 bg-indigo-200 rounded-full">
                <svg className="w-6 h-6 text-indigo-800" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-6 border border-blue-200">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-medium text-blue-800 mb-1">إجمالي المبيعات</h3>
                <p className="text-2xl font-bold text-blue-900">
                  {formatCurrency(salesStats.totalSales)}
                </p>
                <p className="text-xs text-blue-600 mt-1">
                  يشمل كل الفواتير الصادرة
                </p>
              </div>
              <div className="p-3 bg-blue-200 rounded-full">
                <svg className="w-6 h-6 text-blue-800" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-6 border border-green-200">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-medium text-green-800 mb-1">مبيعات الشهر الحالي</h3>
                <p className="text-2xl font-bold text-green-900">
                  {formatCurrency(salesStats.monthlySales)}
                </p>
                <p className="text-xs text-green-600 mt-1">
                  +15% من الشهر الماضي
                </p>
              </div>
              <div className="p-3 bg-green-200 rounded-full">
                <svg className="w-6 h-6 text-green-800" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl p-6 border border-purple-200">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-medium text-purple-800 mb-1">الطلبات المعلقة</h3>
                <p className="text-2xl font-bold text-purple-900">
                  {salesStats.pendingOrders}
                </p>
                <p className="text-xs text-purple-600 mt-1">
                  تشمل الحالات: مسودة ومؤكد
                </p>
              </div>
              <div className="p-3 bg-purple-200 rounded-full">
                <svg className="w-6 h-6 text-purple-800" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-xl p-6 border border-orange-200">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-medium text-orange-800 mb-1">عدد الفواتير</h3>
                <p className="text-2xl font-bold text-orange-900">
                  {salesStats.totalInvoices}
                </p>
                <p className="text-xs text-orange-600 mt-1">
                  فواتير مبيعات صادرة
                </p>
              </div>
              <div className="p-3 bg-orange-200 rounded-full">
                <svg className="w-6 h-6 text-orange-800" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Add Button */}
        <div className="mb-6">
          <Link
            to="/sales-orders/new"
            className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white font-medium rounded-lg shadow-md hover:from-blue-700 hover:to-blue-800 transform hover:scale-105 transition-all duration-200"
          >
            <svg className="w-5 h-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            إضافة طلب بيع
          </Link>
        </div>

        {/* Sales Sections */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-4 gap-6">
          {salesSections.map((section, index) => (
            <Link
              key={index}
              to={section.path}
              className={`block bg-gradient-to-br ${section.bgGradient} rounded-xl p-6 border ${section.borderColor} hover:shadow-lg transform hover:scale-105 transition-all duration-200`}
            >
              <div className="flex items-start">
                <div className={`flex-shrink-0 ${section.iconBg} p-3 rounded-lg`}>
                  <svg xmlns="http://www.w3.org/2000/svg" className={`h-6 w-6 ${section.iconColor}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={section.icon} />
                  </svg>
                </div>
                <div className="mr-4">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">{section.title}</h3>
                  <p className="text-sm text-gray-600 mb-3">{section.description}</p>
                  <div className={`text-sm ${section.textColor} font-medium flex items-center`}>
                    استعرض التفاصيل
                    <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>

        {/* Recent Activity */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-800">آخر الأنشطة</h2>
            <Link
              to="/recent-activity"
              className="text-blue-600 hover:text-blue-800 text-sm font-medium"
            >
              عرض كل الأنشطة
            </Link>
          </div>
          <div className="p-6">
            <div className="space-y-4">
              {recentHighlights.length > 0 ? (
                recentHighlights.map((activity) => (
                  <div key={activity.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div className="flex items-center space-x-4 space-x-reverse">
                      <div className={`w-3 h-3 rounded-full ${activity.indicatorClass}`}></div>
                      <div>
                        <p className="font-medium text-gray-900">{activity.title}</p>
                        <p className="text-sm text-gray-600">{activity.description}</p>
                      </div>
                    </div>
                    <div className="text-left">
                      <p className={`font-semibold ${activity.amountClass}`}>
                        {activity.amount != null ? formatCurrency(activity.amount) : '—'}
                      </p>
                      <p className="text-sm text-gray-500">{activity.amountLabel}</p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center text-sm text-gray-500 py-6">
                  لا توجد أنشطة حديثة حالياً.
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Recent Sales Orders Table */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-800">آخر أوامر البيع</h2>
            <Link to="/sales-orders" className="text-blue-600 hover:text-blue-800 text-sm font-medium">
              استعراض جميع الأوامر
            </Link>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">رقم الطلب</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">العميل</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">التاريخ</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">الحالة</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {recentSalesOrders.length === 0 ? (
                  <tr>
                    <td className="px-6 py-4 text-center text-gray-500" colSpan={4}>لا توجد أوامر بيع مسجلة حالياً</td>
                  </tr>
                ) : (
                  recentSalesOrders.map((o) => (
                    <tr key={o.id} className="hover:bg-gray-50">
                      <td className="px-6 py-3 font-mono">{o.so_no || o.soNo || o.id}</td>
                      <td className="px-6 py-3">{o.customer?.name || o.customer_name || '—'}</td>
                      <td className="px-6 py-3">{(o.so_date || o.date || '').toString().slice(0, 10)}</td>
                      <td className="px-6 py-3">{(o.status || '').toString().toUpperCase()}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Recent Contracts Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-800">آخر العقود</h2>
          <Link to="/contracts" className="text-indigo-600 hover:text-indigo-800 text-sm font-medium">
            استعراض جميع العقود
          </Link>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">رقم العقد</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">العميل</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">تاريخ البدء</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">الحالة</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">القيمة</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {recentContracts.length === 0 ? (
                <tr>
                  <td className="px-6 py-4 text-center text-gray-500" colSpan={5}>لا توجد عقود مسجلة حالياً</td>
                </tr>
              ) : (
                recentContracts.map((contract) => {
                  const getStatusText = (status) => {
                    const statusMap = {
                      'DRAFT': 'مسودة',
                      'ACTIVE': 'نشط',
                      'COMPLETED': 'مكتمل',
                      'TERMINATED': 'ملغي'
                    };
                    return statusMap[status] || status;
                  };

                  const getStatusClass = (status) => {
                    const classMap = {
                      'DRAFT': 'bg-gray-100 text-gray-700',
                      'ACTIVE': 'bg-blue-100 text-blue-700',
                      'COMPLETED': 'bg-green-100 text-green-700',
                      'TERMINATED': 'bg-red-100 text-red-700'
                    };
                    return classMap[status] || 'bg-gray-100 text-gray-700';
                  };

                  const formatDate = (dateString) => {
                    if (!dateString) return '';
                    const d = new Date(dateString);
                    if (isNaN(d)) return '';
                    return d.toLocaleDateString('ar-SA', {
                      year: 'numeric',
                      month: '2-digit',
                      day: '2-digit'
                    });
                  };

                  return (
                    <tr key={contract.id} className="hover:bg-gray-50">
                      <td className="px-6 py-3 font-mono">{contract.contract_no || contract.id}</td>
                      <td className="px-6 py-3">{contract.customer_name || contract.customer || 'غير محدد'}</td>
                      <td className="px-6 py-3">{(contract.start_date || '').toString().slice(0, 10)}</td>
                      <td className="px-6 py-3">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusClass(contract.status)}`}>
                          {getStatusText(contract.status)}
                        </span>
                      </td>
                      <td className="px-6 py-3 font-semibold text-indigo-600">
                        {formatCurrency(parseFloat(contract.total_amount || 0))}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </Layout>
  );
};

export default Sales;
