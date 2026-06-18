import React, { useState, useEffect, useMemo } from 'react';
import Layout from '../components/Layout';
import { getPurchaseOrders, deletePurchaseOrder, receivePurchaseOrder, unreceivePurchaseOrder } from '../services/api';
import { useNavigate } from 'react-router-dom';
import { Badge, StatusBadge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import ProtectedComponent from '../components/ProtectedComponent';
import { PERMISSIONS } from '../utils/permissions';
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
  Undo2,
  Edit3
} from 'lucide-react';
import { formatCurrency, formatDate, toEnglishNumber } from '../utils/formatters';

const PurchaseOrders = () => {
  const { success, error: toastError } = useToast();
  const { confirmDelete } = useConfirmations();
  const [purchaseOrders, setPurchaseOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [viewMode, setViewMode] = useState('grid'); // grid or table

  const navigate = useNavigate();

  useEffect(() => {
    fetchPurchaseOrders();
  }, []);

  const fetchPurchaseOrders = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getPurchaseOrders();
      setPurchaseOrders(Array.isArray(data) ? data : []);
    } catch (err) {
      const errorMessage = err.response?.data?.detail || err.message || 'فشل في تحميل أوامر الشراء';
      setError(errorMessage);
      console.error('Error fetching purchase orders:', err);
      setPurchaseOrders([]);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!id) {
      toastError('خطأ: معرّف أمر الشراء غير صالح');
      return;
    }

    const confirmed = await confirmDelete('أمر الشراء');
    if (!confirmed) return;

    try {
      setLoading(true);
      await deletePurchaseOrder(id);
      success('تم حذف أمر الشراء بنجاح');
      await fetchPurchaseOrders();
    } catch (err) {
      const errorMessage = err.response?.data?.detail || err.message || 'فشل في حذف أمر الشراء';
      toastError(`خطأ في الحذف: ${errorMessage}`);
      console.error('Error deleting purchase order:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleReceive = async (id, poNo) => {
    const confirmed = await confirmDelete(`استلام بضاعة أمر الشراء ${poNo}`, 'هل تريد تأكيد استلام البضاعة؟ سيتم تحديث المخزون تلقائياً');
    if (!confirmed) return;

    try {
      setLoading(true);
      const result = await receivePurchaseOrder(id);
      success(result.message || 'تم استلام البضاعة وتحديث المخزون بنجاح');
      fetchPurchaseOrders();
    } catch (err) {
      const errorMessage = err.response?.data?.detail || err.message || 'فشل في تأكيد الاستلام';
      toastError(`خطأ: ${errorMessage}`);
      console.error('Error receiving purchase order:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleUnreceive = async (id, poNo) => {
    const confirmed = await confirmDelete(`إلغاء استلام أمر الشراء ${poNo}`, 'هل تريد إلغاء الاستلام؟ لن يتم التراجع عن حركات المخزون تلقائياً.');
    if (!confirmed) return;

    try {
      setLoading(true);
      const result = await unreceivePurchaseOrder(id);
      success(result.message || 'تم إلغاء الاستلام بنجاح');
      fetchPurchaseOrders();
    } catch (err) {
      const errorMessage = err.response?.data?.detail || err.message || 'فشل في إلغاء الاستلام';
      toastError(`خطأ: ${errorMessage}`);
      console.error('Error unreceiving purchase order:', err);
    } finally {
      setLoading(false);
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
      'RECEIVED': {
        icon: <Package className="w-3 h-3" />,
        label: 'مستلم',
        className: 'bg-green-100 text-green-700 border-green-300'
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

  const getPaymentBadge = (order) => {
    const totalAmount = parseFloat(order.total_amount_usd || order.total_amount || order.totalAmount) || 0;
    const paidAmount = parseFloat(order.paid_amount_usd || order.paid_amount || order.paidAmount) || 0;

    if (totalAmount === 0) {
      return (
        <Badge variant="outline" className="inline-flex items-center gap-1.5 bg-gray-100 text-gray-700 border-gray-300">
          <DollarSign className="w-3 h-3" />
          غير محدد
        </Badge>
      );
    }

    if (paidAmount === 0) {
      return (
        <Badge variant="outline" className="inline-flex items-center gap-1.5 bg-red-100 text-red-700 border-red-300">
          <Clock className="w-3 h-3" />
          غير مدفوع
        </Badge>
      );
    }

    if (paidAmount >= totalAmount) {
      return (
        <Badge variant="outline" className="inline-flex items-center gap-1.5 bg-green-100 text-green-700 border-green-300">
          <CheckCircle2 className="w-3 h-3" />
          مدفوع بالكامل
        </Badge>
      );
    }

    const percentage = toEnglishNumber(((paidAmount / totalAmount) * 100).toFixed(0));
    return (
      <Badge variant="outline" className="inline-flex items-center gap-1.5 bg-yellow-100 text-yellow-700 border-yellow-300">
        <AlertCircle className="w-3 h-3" />
        مدفوع جزئياً ({percentage}%)
      </Badge>
    );
  };

  // الدوال formatCurrency, formatDate, toEnglishNumber تم استيرادها من utils/formatters
  // formatCurrency, formatDate, toEnglishNumber are now imported from utils/formatters

  // Filter and search
  const filteredPurchaseOrders = useMemo(() => {
    let result = purchaseOrders;

    if (statusFilter !== 'all') {
      result = result.filter(order => order.status === statusFilter);
    }

    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      result = result.filter(order =>
        (order.po_no || order.poNo)?.toLowerCase().includes(searchLower) ||
        order.supplier?.name?.toLowerCase().includes(searchLower)
      );
    }

    return result;
  }, [purchaseOrders, searchTerm, statusFilter]);

  // Statistics
  const stats = useMemo(() => {
    const total = filteredPurchaseOrders.length;
    const confirmed = filteredPurchaseOrders.filter(o => o.status === 'CONFIRMED').length;
    const received = filteredPurchaseOrders.filter(o => o.status === 'RECEIVED').length;
    const draft = filteredPurchaseOrders.filter(o => o.status === 'DRAFT').length;

    const totalAmount = filteredPurchaseOrders.reduce((sum, o) =>
      sum + (parseFloat(o.total_amount_usd || o.total_amount || o.totalAmount) || 0), 0);

    const paidAmount = filteredPurchaseOrders.reduce((sum, o) =>
      sum + (parseFloat(o.paid_amount_usd || o.paid_amount || o.paidAmount) || 0), 0);

    const pendingAmount = totalAmount - paidAmount;

    return { total, confirmed, received, draft, totalAmount, paidAmount, pendingAmount };
  }, [filteredPurchaseOrders]);

  if (loading) {
    return (
      <Layout>
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-indigo-600 mx-auto mb-4"></div>
            <p className="text-xl font-semibold text-slate-700">جاري تحميل أوامر الشراء...</p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        {/* Page Header - Same Style as Invoices */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">أوامر الشراء</h1>
          <p className="text-gray-600">إدارة ومتابعة أوامر الشراء من الموردين</p>
        </div>

          {/* Statistics Cards - Same Style as Invoices Page */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-6 border border-blue-200">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-medium text-blue-800 mb-1">إجمالي الأوامر</h3>
                  <p className="text-2xl font-bold text-blue-900">{toEnglishNumber(stats.total)}</p>
                  <p className="text-xs text-blue-600 mt-1">{toEnglishNumber(stats.draft)} مسودة</p>
                </div>
                <div className="p-3 bg-blue-200 rounded-full">
                  <ShoppingBag className="w-6 h-6 text-blue-800" />
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-6 border border-green-200">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-medium text-green-800 mb-1">إجمالي المبلغ</h3>
                  <p className="text-2xl font-bold text-green-900">{formatCurrency(stats.totalAmount)}</p>
                  <p className="text-xs text-green-600 mt-1">قيمة جميع الأوامر</p>
                </div>
                <div className="p-3 bg-green-200 rounded-full">
                  <DollarSign className="w-6 h-6 text-green-800" />
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl p-6 border border-purple-200">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-medium text-purple-800 mb-1">المبلغ المدفوع</h3>
                  <p className="text-2xl font-bold text-purple-900">{formatCurrency(stats.paidAmount)}</p>
                  <p className="text-xs text-purple-600 mt-1">من إجمالي القيمة</p>
                </div>
                <div className="p-3 bg-purple-200 rounded-full">
                  <CheckCircle2 className="w-6 h-6 text-purple-800" />
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-xl p-6 border border-orange-200">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-medium text-orange-800 mb-1">المتبقي</h3>
                  <p className="text-2xl font-bold text-orange-900">{formatCurrency(stats.pendingAmount)}</p>
                  <p className="text-xs text-orange-600 mt-1">مبالغ غير مسددة</p>
                </div>
                <div className="p-3 bg-orange-200 rounded-full">
                  <Clock className="w-6 h-6 text-orange-800" />
                </div>
              </div>
            </div>
          </div>

        {/* Main Content - Same Style as Invoices */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-800">قائمة أوامر الشراء</h2>
            <button
              onClick={() => navigate('/purchase-orders/new')}
              className="inline-flex items-center gap-2 bg-cyan-500 hover:bg-cyan-600 text-white shadow-sm rounded-lg px-4 py-2 font-medium transition-all"
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
                  placeholder="البحث برقم الطلب أو اسم المورد..."
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
              <option value="RECEIVED">مستلم</option>
              <option value="CANCELLED">ملغي</option>
            </select>

            {/* View Mode Toggle */}
            <div className="flex gap-2 bg-gray-100 p-1 rounded-lg">
              <button
                onClick={() => setViewMode('grid')}
                className={`px-4 py-2 rounded-md font-medium transition-all ${
                  viewMode === 'grid'
                    ? 'bg-cyan-500 text-white shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <Grid3x3 className="w-5 h-5" />
              </button>
              <button
                onClick={() => setViewMode('table')}
                className={`px-4 py-2 rounded-md font-medium transition-all ${
                  viewMode === 'table'
                    ? 'bg-cyan-500 text-white shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <List className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>

        {/* Orders Display */}
        {filteredPurchaseOrders.length === 0 ? (
          <div className="p-12 text-center">
            <Package className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-700 mb-2">لا توجد أوامر شراء</h3>
            <p className="text-gray-500 mb-6">ابدأ بإضافة أول أمر شراء</p>
            <button
              onClick={() => navigate('/purchase-orders/new')}
              className="inline-flex items-center gap-2 bg-cyan-500 hover:bg-cyan-600 text-white shadow-sm rounded-lg px-6 py-3 font-semibold transition-all"
            >
              <Plus className="w-5 h-5" />
              إضافة أمر شراء
            </button>
          </div>
        ) : viewMode === 'grid' ? (
            <GridView
              orders={filteredPurchaseOrders}
              onView={(id) => navigate(`/purchase-orders/${id}`)}
              onEdit={(id) => navigate(`/purchase-orders/${id}/edit`)}
              onDelete={handleDelete}
              onReceive={handleReceive}
              onUnreceive={handleUnreceive}
              getStatusBadge={getStatusBadge}
              getPaymentBadge={getPaymentBadge}
              formatCurrency={formatCurrency}
              formatDate={formatDate}
            />
          ) : (
            <TableView
              orders={filteredPurchaseOrders}
              onView={(id) => navigate(`/purchase-orders/${id}`)}
              onEdit={(id) => navigate(`/purchase-orders/${id}/edit`)}
              onDelete={handleDelete}
              onReceive={handleReceive}
              onUnreceive={handleUnreceive}
              getStatusBadge={getStatusBadge}
              getPaymentBadge={getPaymentBadge}
              formatCurrency={formatCurrency}
              formatDate={formatDate}
            />
          )}
        </div>
      </div>
    </Layout>
  );
};

// Grid View Component - Horizontal Card Design
const GridView = ({ orders, onView, onEdit, onDelete, onReceive, onUnreceive, getStatusBadge, getPaymentBadge, formatCurrency, formatDate }) => {
  return (
    <div className="p-6">
      <div className="space-y-3">
        {orders.map((order) => {
          const totalAmt = parseFloat(order.total_amount_usd || order.total_amount || order.totalAmount) || 0;
          const paidAmt = parseFloat(order.paid_amount_usd || order.paid_amount || order.paidAmount) || 0;
          const remainingAmt = totalAmt - paidAmt;

          return (
            <div key={order.id} className="bg-white rounded-lg border border-gray-200 hover:border-blue-300 hover:shadow-md transition-all overflow-hidden">
              <div className="flex items-center p-4 gap-4">
                {/* Right Section - Order Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-2">
                    <span className="text-sm font-mono font-semibold text-gray-700">#{order.po_no || order.poNo}</span>
                    {getStatusBadge(order.status)}
                    {getPaymentBadge(order)}
                  </div>
                  <h3 className="text-base font-semibold text-gray-900 truncate mb-1">
                    {order.supplier?.name || 'مورد غير محدد'}
                  </h3>
                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    <Calendar className="w-3 h-3" />
                    <span>{formatDate(order.po_date || order.orderDate)}</span>
                  </div>
                </div>

                {/* Middle Section - Financial Info */}
                <div className="hidden md:flex items-center gap-6 px-6 border-r border-l border-gray-200">
                  <div className="text-center">
                    <div className="text-xs text-gray-500 mb-1">القيمة الإجمالية</div>
                    <div className="text-lg font-bold text-blue-600">{formatCurrency(totalAmt)}</div>
                  </div>
                  <div className="text-center">
                    <div className="text-xs text-gray-500 mb-1">المدفوع</div>
                    <div className="text-sm font-semibold text-green-600">{formatCurrency(paidAmt)}</div>
                  </div>
                  <div className="text-center">
                    <div className="text-xs text-gray-500 mb-1">المتبقي</div>
                    <div className="text-sm font-semibold text-orange-600">{formatCurrency(remainingAmt)}</div>
                  </div>
                </div>

                {/* Left Section - Actions */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => onView(order.id)}
                    className="whitespace-nowrap bg-cyan-500 hover:bg-cyan-600 text-white shadow-md px-6 py-2.5 font-semibold rounded-lg transition-all inline-flex items-center gap-2"
                  >
                    <Eye className="w-4 h-4" />
                    عرض التفاصيل
                  </button>

                  <ProtectedComponent permission={PERMISSIONS.MANAGE_INVENTORY}>
                    <button
                      onClick={() => onEdit(order.id)}
                      className="whitespace-nowrap bg-purple-100 text-purple-700 border border-purple-300 hover:bg-purple-200 px-4 py-2 rounded-lg text-sm font-semibold transition-all inline-flex items-center gap-2"
                    >
                      <Edit3 className="w-4 h-4" />
                      تعديل
                    </button>
                  </ProtectedComponent>

                  {order.status === 'CONFIRMED' && (
                    <Button
                      onClick={() => onReceive(order.id, order.po_no || order.poNo)}
                      variant="success"
                      className="font-extrabold px-5 py-2.5 transition-transform hover:scale-[1.02] whitespace-nowrap"
                    >
                      <Package className="w-4 h-4 ml-2" />
                      استلام
                    </Button>
                  )}
                  {order.status === 'RECEIVED' && (
                    <Button
                      onClick={() => onUnreceive(order.id, order.po_no || order.poNo)}
                      variant="warning"
                      className="font-semibold px-4 py-2.5 whitespace-nowrap"
                    >
                      <Undo2 className="w-4 h-4 ml-2" />
                      إلغاء الاستلام
                    </Button>
                  )}
                  <Button
                    onClick={() => onDelete(order.id)}
                    variant="ghost"
                    className="text-red-600 hover:bg-red-50 hover:text-red-700 p-2.5"
                    title="حذف"
                  >
                    <Trash2 className="w-5 h-5" />
                  </Button>
                </div>
              </div>

              {/* Mobile Financial Info */}
              <div className="md:hidden px-4 pb-4 pt-2 border-t border-gray-100">
                <div className="grid grid-cols-3 gap-3 text-center">
                  <div>
                    <div className="text-xs text-gray-500 mb-1">الإجمالي</div>
                    <div className="text-sm font-bold text-blue-600">{formatCurrency(totalAmt)}</div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500 mb-1">المدفوع</div>
                    <div className="text-sm font-semibold text-green-600">{formatCurrency(paidAmt)}</div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500 mb-1">المتبقي</div>
                    <div className="text-sm font-semibold text-orange-600">{formatCurrency(remainingAmt)}</div>
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
const TableView = ({ orders, onView, onEdit, onDelete, onReceive, onUnreceive, getStatusBadge, getPaymentBadge, formatCurrency, formatDate }) => {
  return (
    <div className="overflow-hidden">
      {/* Desktop Table */}
      <div className="hidden lg:block overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">رقم الطلب</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">المورد</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">التاريخ</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">القيمة</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">الحالة</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">الدفع</th>
              <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">الإجراءات</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {orders.map((order) => (
              <tr key={order.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="text-sm font-mono font-medium text-gray-900">#{order.po_no || order.poNo}</span>
                </td>
                <td className="px-6 py-4">
                  <span className="text-sm font-medium text-gray-900">{order.supplier?.name || 'غير محدد'}</span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="text-sm text-gray-600">{formatDate(order.po_date || order.orderDate)}</span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="text-sm font-bold text-blue-600">
                    {formatCurrency(order.total_amount_usd || order.total_amount || order.totalAmount)}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {getStatusBadge(order.status)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {getPaymentBadge(order)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-center">
                  <div className="flex items-center justify-center gap-2">
                    <Button
                      onClick={() => onView(order.id)}
                      variant="ghost"
                      size="sm"
                      className="text-blue-600 hover:bg-blue-50 hover:text-blue-700"
                      title="عرض"
                    >
                      <Eye className="w-5 h-5" />
                    </Button>
                    <ProtectedComponent permission={PERMISSIONS.MANAGE_INVENTORY}>
                      <Button
                        onClick={() => onEdit(order.id)}
                        variant="outline"
                        size="sm"
                        className="text-purple-700 border border-purple-200 hover:bg-purple-100"
                        title="تعديل"
                      >
                        <Edit3 className="w-4 h-4" />
                      </Button>
                    </ProtectedComponent>

                    {order.status === 'CONFIRMED' && (
                      <Button
                        onClick={() => onReceive(order.id, order.po_no || order.poNo)}
                        size="sm"
                        variant="success"
                        className="font-bold px-3 py-2"
                        title="استلام"
                      >
                        <CheckCircle2 className="w-5 h-5" />
                      </Button>
                    )}
                    {order.status === 'RECEIVED' && (
                      <Button
                        onClick={() => onUnreceive(order.id, order.po_no || order.poNo)}
                        size="sm"
                        variant="warning"
                        className="font-bold px-3 py-2"
                        title="إلغاء الاستلام"
                      >
                        <Undo2 className="w-5 h-5" />
                      </Button>
                    )}
                    <Button
                      onClick={() => onDelete(order.id)}
                      variant="ghost"
                      size="sm"
                      className="text-red-600 hover:bg-red-50"
                      title="حذف"
                    >
                      <Trash2 className="w-5 h-5" />
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile Cards */}
      <div className="lg:hidden divide-y divide-gray-200">
        {orders.map((order) => (
          <div key={order.id} className="p-4 hover:bg-gray-50 transition-colors">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-mono text-gray-500">#{order.po_no || order.poNo}</span>
              {getStatusBadge(order.status)}
            </div>
            <h4 className="font-semibold text-gray-900 mb-2">{order.supplier?.name || 'غير محدد'}</h4>
            <div className="space-y-2 text-sm mb-3">
              <div className="flex justify-between">
                <span className="text-gray-600">القيمة:</span>
                <span className="font-bold text-blue-600">
                  {formatCurrency(order.total_amount_usd || order.total_amount || order.totalAmount)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">الدفع:</span>
                {getPaymentBadge(order)}
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => onView(order.id)}
                className="flex-1 bg-cyan-500 hover:bg-cyan-600 text-white shadow-md py-2.5 font-semibold rounded-lg transition-all inline-flex items-center justify-center gap-2"
              >
                <Eye className="w-4 h-4" />
                عرض التفاصيل
              </button>
              <ProtectedComponent permission={PERMISSIONS.MANAGE_INVENTORY}>
                <button
                  onClick={() => onEdit(order.id)}
                  className='flex-1 bg-purple-100 text-purple-700 border border-purple-300 hover:bg-purple-200 py-2.5 font-semibold rounded-lg transition-all inline-flex items-center justify-center gap-2'
                >
                  <Edit3 className='w-4 h-4' />
                  تعديل
                </button>
              </ProtectedComponent>
              {order.status === 'CONFIRMED' && (
                <Button
                  onClick={() => onReceive(order.id, order.po_no || order.poNo)}
                  variant="success"
                  className="flex-1 font-extrabold py-2.5 transition-transform hover:scale-[1.02]"
                >
                  <Package className="w-4 h-4 ml-2" />
                  استلام
                </Button>
              )}
              {order.status === 'RECEIVED' && (
                <Button
                  onClick={() => onUnreceive(order.id, order.po_no || order.poNo)}
                  variant="warning"
                  className="flex-1 font-semibold py-2.5"
                >
                  <Undo2 className="w-4 h-4 ml-2" />
                  إلغاء الاستلام
                </Button>
              )}
              <Button
                onClick={() => onDelete(order.id)}
                variant="ghost"
                className="text-red-600 hover:bg-red-100 p-2.5"
              >
                <Trash2 className="w-5 h-5" />
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default PurchaseOrders;
