import React, { useState, useEffect, useMemo, useCallback } from 'react';
import Layout from '../components/Layout';
import { getSalesOrders, deleteSalesOrder, getCustomer } from '../services/api';
import { useNavigate } from 'react-router-dom';
import { Badge, StatusBadge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { useToast } from '../components/ui/Toast';
import { useConfirmations } from '../components/ui/ConfirmDialog';
import {
  ShoppingBag,
  DollarSign,
  CheckCircle2,
  Clock,
  Plus,
  Search,
  Eye,
  Trash2,
  Package,
  Calendar,
  Grid3x3,
  List,
  FileText,
  CreditCard,
  AlertCircle,
  Edit3,
  Receipt
} from 'lucide-react';
import { formatCurrency, formatDate, toEnglishNumber } from '../utils/formatters';
import { ActionButtons } from '../components/ui/IconButton';

const SalesOrders = () => {
  const { success, error: toastError } = useToast();
  const { confirmDelete } = useConfirmations();
  const [salesOrders, setSalesOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [viewMode, setViewMode] = useState('table'); // default to clearer table view

  const navigate = useNavigate();

  useEffect(() => {
    fetchSalesOrders();
  }, []);

  const fetchSalesOrders = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getSalesOrders();
      
      // Process sales orders to include customer names
      const processedData = await Promise.all(data.map(async (order) => {
        // If order already has customer name as a string, use it
        if (order.customer && typeof order.customer === 'string') {
          return order;
        }
        
        // If order has customer as an object with name, use it
        if (order.customer && typeof order.customer === 'object' && order.customer.name) {
          return order;
        }
        
        // If order has customer_id, fetch customer details
        if (order.customer_id) {
          try {
            const customerData = await getCustomer(order.customer_id);
            return {
              ...order,
              customer: customerData.name || customerData.displayName || 'غير محدد'
            };
          } catch (err) {
            console.error('Error fetching customer:', err);
            return {
              ...order,
              customer: 'غير محدد'
            };
          }
        }
        
        // Handle various customer name fields
        const customerName = order.customer_name || order.customerName || order.client || order.clientName || 'غير محدد';
        return {
          ...order,
          customer: customerName
        };
      }));
      
      setSalesOrders(Array.isArray(processedData) ? processedData : []);
    } catch (err) {
      setError('تعذر تحميل أوامر البيع');
      console.error('Error fetching sales orders:', err);
      setSalesOrders([]);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    const confirmed = await confirmDelete('أمر البيع');
    if (!confirmed) return;

    try {
      await deleteSalesOrder(id);
      success('تم حذف أمر البيع بنجاح');
      fetchSalesOrders(); // Refresh the list
    } catch (err) {
      toastError('تعذر حذف أمر البيع');
      console.error('Error deleting sales order:', err);
    }
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      'DRAFT': {
        icon: <FileText className="w-3 h-3" />,
        label: 'مسودة',
        className: 'bg-gray-100 text-gray-700 border-gray-300'
      },
      'CONFIRMED': {
        icon: <CheckCircle2 className="w-3 h-3" />,
        label: 'مؤكد',
        className: 'bg-blue-100 text-blue-700 border-blue-300'
      },
      'FULFILLED': {
        icon: <Package className="w-3 h-3" />,
        label: 'مكتمل',
        className: 'bg-green-100 text-green-700 border-green-300'
      },
      'INVOICED': {
        icon: <CreditCard className="w-3 h-3" />,
        label: 'مفوتر',
        className: 'bg-purple-100 text-purple-700 border-purple-300'
      },
      'CANCELLED': {
        icon: <AlertCircle className="w-3 h-3" />,
        label: 'ملغي',
        className: 'bg-red-100 text-red-700 border-red-300'
      }
    };

    const config = statusConfig[status] || statusConfig['DRAFT'];
    return (
      <Badge variant="outline" className={`inline-flex items-center gap-1.5 ${config.className}`}>
        {config.icon}
        {config.label}
      </Badge>
    );
  };

  // الدوال formatCurrency, formatDate, toEnglishNumber تم استيرادها من utils/formatters
  // formatCurrency, formatDate, toEnglishNumber are now imported from utils/formatters

  const getOrderTotal = useCallback((order) => {
    if (!order) {
      return 0;
    }
    const rawTotal =
      order.total_amount_usd ??
      order.totalAmountUsd ??
      order.total ??
      order.amount ??
      order.totalAmount ??
      order.value ??
      0;
    const numericTotal = typeof rawTotal === 'string' ? parseFloat(rawTotal) : Number(rawTotal || 0);
    return Number.isFinite(numericTotal) ? numericTotal : 0;
  }, []);

  // Filter and search sales orders
  const filteredSalesOrders = useMemo(() => {
    let result = salesOrders;
    
    // Apply status filter
    if (statusFilter !== 'all') {
      result = result.filter(order => order.status === statusFilter);
    }
    
    // Apply search term
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      
      // Search all fields
      result = result.filter(order => 
        (order.soNo || order.so_no)?.toLowerCase().includes(searchLower) ||
        order.project?.toLowerCase().includes(searchLower) ||
        order.customer?.toLowerCase().includes(searchLower)
      );
    }
    
    return result;
  }, [salesOrders, searchTerm, statusFilter]);

  // Statistics
  const stats = useMemo(() => {
    const total = filteredSalesOrders.length;
    const confirmed = filteredSalesOrders.filter(o => o.status === 'CONFIRMED').length;
    const fulfilled = filteredSalesOrders.filter(o => o.status === 'FULFILLED').length;
    const draft = filteredSalesOrders.filter(o => o.status === 'DRAFT').length;

    const totalAmount = filteredSalesOrders.reduce((sum, o) => sum + getOrderTotal(o), 0);

    return { total, confirmed, fulfilled, draft, totalAmount };
  }, [filteredSalesOrders, getOrderTotal]);

  if (loading) {
    return (
      <Layout>
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-indigo-600 mx-auto mb-4"></div>
            <p className="text-xl font-semibold text-slate-700">جاري تحميل أوامر البيع...</p>
          </div>
        </div>
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout>
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-gray-800">أوامر البيع</h2>
          </div>
          <div className="text-red-500">{error}</div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        {/* Page Header - Same Style as Invoices */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">أوامر البيع</h1>
          <p className="text-gray-600">إدارة ومتابعة أوامر البيع للعملاء</p>
        </div>

          {/* Statistics Cards - Same Style as Invoices Page */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-6 border border-blue-200">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-medium text-blue-800 mb-1">إجمالي الأوامر</h3>
                  <p className="text-2xl font-bold text-blue-900">{stats.total}</p>
                  <p className="text-xs text-blue-600 mt-1">{stats.draft} مسودة</p>
                </div>
                <div className="p-3 bg-blue-200 rounded-full">
                  <ShoppingBag className="w-6 h-6 text-blue-800" />
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-6 border border-green-200">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-medium text-green-800 mb-1">الطلبات المؤكدة</h3>
                  <p className="text-2xl font-bold text-green-900">{stats.confirmed}</p>
                  <p className="text-xs text-green-600 mt-1">جاهزة للتنفيذ</p>
                </div>
                <div className="p-3 bg-green-200 rounded-full">
                  <CheckCircle2 className="w-6 h-6 text-green-800" />
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl p-6 border border-purple-200">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-medium text-purple-800 mb-1">الطلبات المكتملة</h3>
                  <p className="text-2xl font-bold text-purple-900">{stats.fulfilled}</p>
                  <p className="text-xs text-purple-600 mt-1">تم التسليم</p>
                </div>
                <div className="p-3 bg-purple-200 rounded-full">
                  <Package className="w-6 h-6 text-purple-800" />
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-xl p-6 border border-orange-200">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-medium text-orange-800 mb-1">إجمالي المبيعات</h3>
                  <p className="text-2xl font-bold text-orange-900">{formatCurrency(stats.totalAmount)}</p>
                  <p className="text-xs text-orange-600 mt-1">قيمة جميع الأوامر</p>
                </div>
                <div className="p-3 bg-orange-200 rounded-full">
                  <DollarSign className="w-6 h-6 text-orange-800" />
                </div>
              </div>
            </div>
          </div>

        {/* Main Content - Same Style as Invoices */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-800">قائمة أوامر البيع</h2>
            <button
              onClick={() => navigate('/sales-orders/new')}
              className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white shadow-sm rounded-lg px-4 py-2 font-medium transition-all"
            >
              <Plus className="w-5 h-5" />
              إضافة أمر جديد
            </button>
          </div>

          {/* Filters and Search */}
          <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
            <div className="flex flex-col lg:flex-row gap-4">
            {/* Search */}
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <Input
                  type="text"
                  placeholder="البحث برقم الطلب أو اسم المشروع أو العميل..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pr-10 pl-4"
                />
              </div>
            </div>

            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-2.5 border border-gray-300 rounded-lg focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
            >
              <option value="all">جميع الحالات</option>
              <option value="DRAFT">مسودة</option>
              <option value="CONFIRMED">مؤكد</option>
              <option value="FULFILLED">مكتمل</option>
              <option value="INVOICED">مفوتر</option>
              <option value="CANCELLED">ملغي</option>
            </select>

            {/* View Mode Toggle */}
            <div className="flex gap-2 bg-gray-100 p-1 rounded-lg">
              <button
                onClick={() => setViewMode('table')}
                className={`px-4 py-2 rounded-md font-medium transition-all ${
                  viewMode === 'table'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
                title="عرض جدولي"
              >
                <List className="w-5 h-5" />
              </button>
              <button
                onClick={() => setViewMode('grid')}
                className={`px-4 py-2 rounded-md font-medium transition-all ${
                  viewMode === 'grid'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
                title="عرض بطاقات"
              >
                <Grid3x3 className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>

        {/* Orders Display */}
        {filteredSalesOrders.length === 0 ? (
          <div className="p-12 text-center">
            <Package className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-700 mb-2">لا توجد أوامر بيع</h3>
            <p className="text-gray-500 mb-6">ابدأ بإضافة أول أمر بيع</p>
            <button
              onClick={() => navigate('/sales-orders/new')}
              className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white shadow-sm rounded-lg px-6 py-3 font-semibold transition-all"
            >
              <Plus className="w-5 h-5" />
              إضافة أمر بيع
            </button>
          </div>
        ) : viewMode === 'grid' ? (
          <GridView
            orders={filteredSalesOrders}
            onView={(id) => navigate(`/sales-orders/${id}`)}
            onEdit={(id) => navigate(`/sales-orders/${id}/edit`)}
            onCreateInvoice={(id) => navigate(`/invoices/new?fromSalesOrder=${id}`)}
            onDelete={handleDelete}
            getStatusBadge={getStatusBadge}
            formatCurrency={formatCurrency}
            formatDate={formatDate}
            getOrderTotal={getOrderTotal}
          />
        ) : (
          <TableView
            orders={filteredSalesOrders}
            onView={(id) => navigate(`/sales-orders/${id}`)}
            onEdit={(id) => navigate(`/sales-orders/${id}/edit`)}
            onCreateInvoice={(id) => navigate(`/invoices/new?fromSalesOrder=${id}`)}
            onDelete={handleDelete}
            getStatusBadge={getStatusBadge}
            formatCurrency={formatCurrency}
            formatDate={formatDate}
            getOrderTotal={getOrderTotal}
          />
        )}
        </div>
      </div>
    </Layout>
  );
};

// Grid View Component - Horizontal Card Design
const GridView = ({ orders, onView, onEdit, onCreateInvoice, onDelete, getStatusBadge, formatCurrency, formatDate, getOrderTotal }) => {
  return (
    <div className="p-6">
      <div className="space-y-3">
        {orders.map((order) => {
          const totalAmt = getOrderTotal(order);

          let customerName = 'Not available';
          if (order.customer) {
            customerName = typeof order.customer === 'object'
              ? (order.customer.name || order.customer.displayName || JSON.stringify(order.customer))
              : order.customer;
          } else if (order.customer_name) {
            customerName = order.customer_name;
          } else if (order.customerName) {
            customerName = order.customerName;
          } else if (order.client) {
            customerName = order.client;
          } else if (order.customer_id) {
            customerName = `Customer #${order.customer_id}`;
          } else if (order.clientName) {
            customerName = order.clientName;
          }

          const orderDate = order.date || order.so_date;

          return (
            <div key={order.id} className="bg-white rounded-lg border border-gray-200 hover:border-blue-300 hover:shadow-md transition-all overflow-hidden">
              <div className="flex flex-col md:flex-row md:items-center p-4 gap-4">
                {/* Order Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-2">
                    <span className="text-sm font-mono font-semibold text-gray-700">#{order.soNo || order.so_no}</span>
                    {getStatusBadge(order.status)}
                  </div>
                  <h3 className="text-base font-semibold text-gray-900 truncate mb-1">{customerName}</h3>
                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    <Calendar className="w-3 h-3" />
                    <span>{formatDate(orderDate)}</span>
                  </div>
                </div>

                {/* Metrics */}
                <div className="hidden md:flex items-center gap-6 px-6 border-r border-l border-gray-200">
                  <div className="text-center">
                    <div className="text-xs text-gray-500 mb-1">العميل</div>
                    <div className="text-sm font-medium text-gray-900">{customerName}</div>
                  </div>
                  <div className="text-center">
                    <div className="text-xs text-gray-500 mb-1">قيمة الطلب</div>
                    <div className="text-lg font-bold text-blue-600">{formatCurrency(totalAmt)}</div>
                  </div>
                  {/* Invoice Status Badge */}
                  {order.invoice || order.invoice_id ? (
                    <div className="text-center">
                      <Badge variant="outline" className="inline-flex items-center gap-1.5 bg-green-50 text-green-700 border-green-300">
                        <Receipt className="w-3 h-3" />
                        <span className="text-xs">تم عمل فاتورة</span>
                      </Badge>
                    </div>
                  ) : null}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 relative z-10">
                  <Button
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      console.log('View button clicked for order:', order.id);
                      onView(order.id);
                    }}
                    variant="info"
                    className="inline-flex items-center gap-2 px-4 py-2"
                    title="عرض التفاصيل"
                  >
                    <Eye className="w-4 h-4" />
                    <span className="hidden lg:inline">عرض</span>
                  </Button>
                  <Button
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      console.log('Invoice button clicked for order:', order.id);
                      onCreateInvoice(order.id);
                    }}
                    variant="secondary"
                    className="p-2.5"
                    title="إنشاء فاتورة"
                  >
                    <Receipt className="w-5 h-5" />
                  </Button>
                  <Button
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      console.log('Edit button clicked for order:', order.id);
                      onEdit(order.id);
                    }}
                    variant="outline"
                    className="p-2.5"
                    title="تعديل"
                  >
                    <Edit3 className="w-5 h-5" />
                  </Button>
                  <Button
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      console.log('Delete button clicked for order:', order.id);
                      onDelete(order.id);
                    }}
                    variant="danger"
                    className="p-2.5"
                    title="حذف"
                  >
                    <Trash2 className="w-5 h-5" />
                  </Button>
                </div>
              </div>

              {/* Mobile Metrics */}
              <div className="md:hidden px-4 pb-4 pt-2 border-t border-gray-100">
                <div className="grid grid-cols-2 gap-3 text-center">
                  <div>
                    <div className="text-xs text-gray-500 mb-1">العميل</div>
                    <div className="text-sm font-medium text-gray-900">{customerName}</div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500 mb-1">قيمة الطلب</div>
                    <div className="text-sm font-bold text-blue-600">{formatCurrency(totalAmt)}</div>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};



// Table View Component - Clean Simple Design
const TableView = ({ orders, onView, onEdit, onCreateInvoice, onDelete, getStatusBadge, formatCurrency, formatDate, getOrderTotal }) => {
  return (
    <div className="overflow-hidden">
      {/* Desktop Table */}
      <div className="hidden lg:block overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200 text-sm">
          <thead className="bg-gray-50 sticky top-0 z-10">
            <tr>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider"># الطلب</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">العميل</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">التاريخ</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">القيمة</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">الحالة</th>
              <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">الفاتورة</th>
              <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">الإجراءات</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {orders.map((order) => {
              let customerName = 'Not available';
              if (order.customer) {
                customerName = typeof order.customer === 'object'
                  ? (order.customer.name || order.customer.displayName || JSON.stringify(order.customer))
                  : order.customer;
              } else if (order.customer_name) {
                customerName = order.customer_name;
              } else if (order.customerName) {
                customerName = order.customerName;
              } else if (order.client) {
                customerName = order.client;
              } else if (order.customer_id) {
                customerName = `Customer #${order.customer_id}`;
              } else if (order.clientName) {
                customerName = order.clientName;
              }

              const totalAmt = getOrderTotal(order);
              const orderDate = order.date || order.so_date;

              return (
                <tr key={order.id} className="hover:bg-gray-50 transition-colors odd:bg-gray-50/30">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-sm font-mono font-medium text-gray-900">#{order.soNo || order.so_no}</span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-sm font-medium text-gray-900">{customerName}</span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-sm text-gray-600">{formatDate(orderDate)}</span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-sm font-bold text-blue-600">{formatCurrency(totalAmt)}</span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {getStatusBadge(order.status)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    {order.invoice || order.invoice_id ? (
                      <Badge variant="outline" className="inline-flex items-center gap-1.5 bg-green-50 text-green-700 border-green-300">
                        <Receipt className="w-3 h-3" />
                        <span className="text-xs">تم عمل فاتورة</span>
                      </Badge>
                    ) : (
                      <span className="text-xs text-gray-400">لا يوجد</span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center justify-end gap-2 relative z-10">
                      <Button
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          console.log('View button clicked for order:', order.id);
                          onView(order.id);
                        }}
                        variant="info"
                        size="sm"
                        className="gap-2 px-3"
                        title="عرض التفاصيل"
                      >
                        <Eye className="w-4 h-4" />
                        <span className="hidden xl:inline">عرض</span>
                      </Button>
                      <Button
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          console.log('Invoice button clicked for order:', order.id);
                          onCreateInvoice(order.id);
                        }}
                        variant="secondary"
                        size="sm"
                        className="gap-2 px-3"
                        title="إنشاء فاتورة"
                      >
                        <Receipt className="w-4 h-4" />
                        <span className="hidden xl:inline">فاتورة</span>
                      </Button>
                      <Button
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          console.log('Edit button clicked for order:', order.id);
                          onEdit(order.id);
                        }}
                        variant="outline"
                        size="sm"
                        className="gap-2 px-3"
                        title="تعديل"
                      >
                        <Edit3 className="w-4 h-4" />
                        <span className="hidden xl:inline">تعديل</span>
                      </Button>
                      <Button
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          console.log('Delete button clicked for order:', order.id);
                          onDelete(order.id);
                        }}
                        variant="danger"
                        size="sm"
                        className="gap-2 px-3"
                        title="حذف"
                      >
                        <Trash2 className="w-4 h-4" />
                        <span className="hidden xl:inline">حذف</span>
                      </Button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>


      {/* Mobile Cards */}
      <div className="lg:hidden divide-y divide-gray-200">
        {orders.map((order) => {
          let customerName = 'Not available';
          if (order.customer) {
            customerName = typeof order.customer === 'object'
              ? (order.customer.name || order.customer.displayName || JSON.stringify(order.customer))
              : order.customer;
          } else if (order.customer_name) {
            customerName = order.customer_name;
          } else if (order.customerName) {
            customerName = order.customerName;
          } else if (order.client) {
            customerName = order.client;
          } else if (order.customer_id) {
            customerName = `Customer #${order.customer_id}`;
          } else if (order.clientName) {
            customerName = order.clientName;
          }

          const totalAmt = getOrderTotal(order);
          const orderDate = order.date || order.so_date;

          return (
            <div key={order.id} className="p-4 hover:bg-gray-50 transition-colors">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-mono text-gray-500">#{order.soNo || order.so_no}</span>
                <div className="flex items-center gap-2">
                  {getStatusBadge(order.status)}
                  {order.invoice || order.invoice_id ? (
                    <Badge variant="outline" className="inline-flex items-center gap-1 bg-green-50 text-green-700 border-green-300">
                      <Receipt className="w-3 h-3" />
                    </Badge>
                  ) : null}
                </div>
              </div>
              <div className="space-y-2 text-sm mb-3">
                <div className="flex justify-between">
                  <span className="text-gray-500">العميل</span>
                  <span className="font-medium text-gray-900 truncate max-w-[70%]">{customerName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">التاريخ</span>
                  <span className="text-gray-900">{formatDate(orderDate)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">قيمة الطلب</span>
                  <span className="font-bold text-blue-600">{formatCurrency(totalAmt)}</span>
                </div>
                {order.invoice || order.invoice_id ? (
                  <div className="flex justify-between">
                    <span className="text-gray-500">حالة الفاتورة</span>
                    <span className="text-xs font-medium text-green-600">✓ تم عمل فاتورة</span>
                  </div>
                ) : null}
              </div>
              <div className="flex gap-2 relative z-10">
                <Button
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    console.log('View button clicked for order:', order.id);
                    onView(order.id);
                  }}
                  variant="info"
                  className="flex-1 inline-flex items-center justify-center gap-2 py-2.5"
                  title="عرض التفاصيل"
                >
                  <Eye className="w-4 h-4" />
                  عرض
                </Button>
                <Button
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    console.log('Invoice button clicked for order:', order.id);
                    onCreateInvoice(order.id);
                  }}
                  variant="secondary"
                  className="p-2.5"
                  title="إنشاء فاتورة"
                >
                  <Receipt className="w-5 h-5" />
                </Button>
                <Button
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    console.log('Edit button clicked for order:', order.id);
                    onEdit(order.id);
                  }}
                  variant="outline"
                  className="p-2.5"
                  title="تعديل"
                >
                  <Edit3 className="w-5 h-5" />
                </Button>
                <Button
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    console.log('Delete button clicked for order:', order.id);
                    onDelete(order.id);
                  }}
                  variant="danger"
                  className="p-2.5"
                  title="حذف"
                >
                  <Trash2 className="w-5 h-5" />
                </Button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default SalesOrders;
