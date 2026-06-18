import React, { useState, useEffect, useMemo } from 'react';
import Layout from '../components/Layout';
import InvoiceViewModal from '../components/InvoiceViewModal';
import { getInvoices, deleteInvoice } from '../services/api';
import { useToast } from '../components/ui/Toast';
import { useConfirmations } from '../components/ui/ConfirmDialog';
import { formatCurrency, formatDate, getInvoiceStatusClass, getInvoiceStatusText } from '../utils/formatters';
import { ActionButtons } from '../components/ui/IconButton';

const Invoices = () => {
  const { success, error: toastError } = useToast();
  const { confirmDelete } = useConfirmations();
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterField, setFilterField] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedInvoiceId, setSelectedInvoiceId] = useState(null);

  useEffect(() => {
    fetchInvoices();
  }, []);

  const fetchInvoices = async () => {
    try {
      setLoading(true);
      const data = await getInvoices();
      setInvoices(data);
      setError(null);
    } catch (err) {
      setError('فشل في جلب الفواتير');
      console.error('Error fetching invoices:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    const confirmed = await confirmDelete('الفاتورة');
    if (!confirmed) return;

    try {
      await deleteInvoice(id);
      success('تم حذف الفاتورة بنجاح');
      fetchInvoices(); // Refresh the list
    } catch (err) {
      toastError('فشل في حذف الفاتورة');
      console.error('Error deleting invoice:', err);
    }
  };

  // الدوالgetStatusClass, getStatusText, formatCurrency, formatDate تم استيرادها من utils/formatters
  // getStatusClass, getStatusText, formatCurrency, formatDate are now imported from utils/formatters

  // Helpers to normalize API fields from backend
  const getInvoiceTotal = (inv) => Number(inv.total_usd ?? inv.total ?? inv.totalUSD ?? 0);
  const getInvoicePaid = (inv) => Number(
    inv.paid_amount_usd ??
    inv.paid_amount ??
    inv.paidAmount ??
    inv.paid ??
    0
  );

  const calculateBalance = (invoice) => {
    const total = getInvoiceTotal(invoice);
    const paid = getInvoicePaid(invoice);
    return total - paid;
  };

  // Calculate statistics
  const invoiceStats = useMemo(() => {
    const totalInvoices = invoices.length;
    const totalAmount = invoices.reduce((sum, invoice) => sum + getInvoiceTotal(invoice), 0);
    const paidAmount = invoices.reduce((sum, invoice) => sum + getInvoicePaid(invoice), 0);
    const pendingAmount = totalAmount - paidAmount;

    const overdueInvoices = invoices.filter(invoice => {
      if (!invoice.dueDate && !invoice.due_date) return false;
      const dueDate = new Date(invoice.dueDate || invoice.due_date);
      const today = new Date();
      return dueDate < today && invoice.status !== 'PAID' && invoice.status !== 'VOID';
    }).length;

    const paidInvoices = invoices.filter(invoice => invoice.status === 'PAID').length;

    return {
      totalInvoices,
      totalAmount,
      paidAmount,
      pendingAmount,
      overdueInvoices,
      paidInvoices
    };
  }, [invoices]);

  // Filter and search invoices
  const filteredInvoices = useMemo(() => {
    let result = invoices;

    // Apply status filter
    if (statusFilter !== 'all') {
      result = result.filter(invoice => invoice.status === statusFilter);
    }

    // Apply search term
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();

      switch (filterField) {
        case 'invoiceNo':
          result = result.filter(invoice => (invoice.invoiceNo || invoice.invoice_no)?.toLowerCase().includes(searchLower));
          break;
        case 'customer':
          result = result.filter(invoice => invoice.customer?.toLowerCase().includes(searchLower));
          break;
        case 'project':
          result = result.filter(invoice => invoice.project?.toLowerCase().includes(searchLower));
          break;
        default:
          // Search all fields
          result = result.filter(invoice =>
            (invoice.invoiceNo || invoice.invoice_no)?.toLowerCase().includes(searchLower) ||
            invoice.customer?.toLowerCase().includes(searchLower) ||
            invoice.project?.toLowerCase().includes(searchLower)
          );
      }
    }

    return result;
  }, [invoices, searchTerm, filterField, statusFilter]);

  if (loading) {
    return (
      <Layout>
        <div className="space-y-6">
          {/* Page Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-800 mb-2">الفواتير</h1>
            <p className="text-gray-600">إدارة وتتبع جميع الفواتير والمدفوعات</p>
          </div>

          {/* Loading State */}
          <div className="flex items-center justify-center min-h-64">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600">جاري تحميل الفواتير...</p>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout>
        <div className="space-y-6">
          {/* Page Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-800 mb-2">الفواتير</h1>
            <p className="text-gray-600">إدارة وتتبع جميع الفواتير والمدفوعات</p>
          </div>

          {/* Error State */}
          <div className="bg-gradient-to-br from-red-50 to-red-100 rounded-xl border border-red-200 p-6">
            <div className="flex items-center">
              <div className="p-3 bg-red-200 rounded-full ml-4">
                <svg className="w-6 h-6 text-red-800" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-medium text-red-800 mb-1">حدث خطأ</h3>
                <p className="text-red-700">{error}</p>
                <button
                  onClick={fetchInvoices}
                  className="mt-3 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors duration-200"
                >
                  المحاولة مرة أخرى
                </button>
              </div>
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
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">الفواتير</h1>
          <p className="text-gray-600">إدارة وتتبع جميع الفواتير والمدفوعات</p>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-6 border border-blue-200">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-medium text-blue-800 mb-1">إجمالي الفواتير</h3>
                <p className="text-2xl font-bold text-blue-900">{invoiceStats.totalInvoices}</p>
                <p className="text-xs text-blue-600 mt-1">جميع الفواتير</p>
              </div>
              <div className="p-3 bg-blue-200 rounded-full">
                <svg className="w-6 h-6 text-blue-800" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-6 border border-green-200">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-medium text-green-800 mb-1">إجمالي المبلغ</h3>
                <p className="text-2xl font-bold text-green-900">{formatCurrency(invoiceStats.totalAmount)}</p>
                <p className="text-xs text-green-600 mt-1">قيمة جميع الفواتير</p>
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
                <h3 className="text-sm font-medium text-purple-800 mb-1">المبلغ المدفوع</h3>
                <p className="text-2xl font-bold text-purple-900">{formatCurrency(invoiceStats.paidAmount)}</p>
                <p className="text-xs text-purple-600 mt-1">{invoiceStats.paidInvoices} فاتورة مدفوعة</p>
              </div>
              <div className="p-3 bg-purple-200 rounded-full">
                <svg className="w-6 h-6 text-purple-800" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-red-50 to-red-100 rounded-xl p-6 border border-red-200">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-medium text-red-800 mb-1">الفواتير المتأخرة</h3>
                <p className="text-2xl font-bold text-red-900">{invoiceStats.overdueInvoices}</p>
                <p className="text-xs text-red-600 mt-1">تحتاج متابعة</p>
              </div>
              <div className="p-3 bg-red-200 rounded-full">
                <svg className="w-6 h-6 text-red-800" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-800">قائمة الفواتير</h2>
            <button
              className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-medium py-2 px-4 rounded-lg transition-all duration-200 shadow-sm hover:shadow-md"
              onClick={() => window.location.href = '/invoices/new'}
            >
              إضافة فاتورة جديدة
            </button>
          </div>

          {/* Search and Filter Controls */}
          <div className="p-6 border-b border-gray-200 bg-gray-50">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <input
                    type="text"
                    placeholder="البحث في الفواتير..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full px-4 py-3 pr-10 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                  />
                  <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                    <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </div>
                  {searchTerm && (
                    <button
                      onClick={() => setSearchTerm('')}
                      className="absolute inset-y-0 left-0 pl-3 flex items-center"
                    >
                      <svg className="h-5 w-5 text-gray-400 hover:text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  )}
                </div>
              </div>
              <div>
                <select
                  value={filterField}
                  onChange={(e) => setFilterField(e.target.value)}
                  className="px-4 py-3 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                >
                  <option value="all">جميع الحقول</option>
                  <option value="invoiceNo">رقم الفاتورة</option>
                  <option value="customer">العميل</option>
                  <option value="project">المشروع</option>
                </select>
              </div>
              <div>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="px-4 py-3 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                >
                  <option value="all">جميع الحالات</option>
                  <option value="DRAFT">مسودة</option>
                  <option value="ISSUED">صادرة</option>
                  <option value="PARTIALLY_PAID">مدفوعة جزئياً</option>
                  <option value="PAID">مدفوعة</option>
                  <option value="OVERDUE">متأخرة</option>
                  <option value="VOID">ملغاة</option>
                </select>
              </div>
            </div>

            {/* Results Count */}
            <div className="mt-4 text-sm text-gray-600">
              عرض {filteredInvoices.length} من أصل {invoices.length} فاتورة
            </div>
          </div>
          {/* Enhanced Table */}
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gradient-to-r from-gray-50 to-gray-100">
                <tr>
                  <th scope="col" className="px-6 py-4 text-right text-xs font-medium text-gray-700 uppercase tracking-wider">
                    رقم الفاتورة
                  </th>
                  <th scope="col" className="px-6 py-4 text-right text-xs font-medium text-gray-700 uppercase tracking-wider">
                    العميل
                  </th>
                  <th scope="col" className="px-6 py-4 text-right text-xs font-medium text-gray-700 uppercase tracking-wider">
                    المشروع
                  </th>
                  <th scope="col" className="px-6 py-4 text-right text-xs font-medium text-gray-700 uppercase tracking-wider">
                    تاريخ الإصدار
                  </th>
                  <th scope="col" className="px-6 py-4 text-right text-xs font-medium text-gray-700 uppercase tracking-wider">
                    تاريخ الاستحقاق
                  </th>
                  <th scope="col" className="px-6 py-4 text-right text-xs font-medium text-gray-700 uppercase tracking-wider">
                    الحالة
                  </th>
                  <th scope="col" className="px-6 py-4 text-right text-xs font-medium text-gray-700 uppercase tracking-wider">
                    المجموع
                  </th>
                  <th scope="col" className="px-6 py-4 text-right text-xs font-medium text-gray-700 uppercase tracking-wider">
                    المدفوع
                  </th>
                  <th scope="col" className="px-6 py-4 text-right text-xs font-medium text-gray-700 uppercase tracking-wider">
                    الرصيد
                  </th>
                  <th scope="col" className="px-6 py-4 text-right text-xs font-medium text-gray-700 uppercase tracking-wider">
                    الإجراءات
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredInvoices.length === 0 ? (
                  <tr>
                    <td colSpan="10" className="px-6 py-12 text-center">
                      <div className="flex flex-col items-center">
                        <svg className="mx-auto h-12 w-12 text-gray-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        <h3 className="text-sm font-medium text-gray-900 mb-1">
                          {searchTerm || statusFilter !== 'all' ? 'لا توجد فواتير مطابقة لمعايير البحث' : 'لا توجد فواتير'}
                        </h3>
                        <p className="text-sm text-gray-500">
                          {searchTerm || statusFilter !== 'all' ? 'حاول تغيير معايير البحث أو الفلتر' : 'ابدأ بإنشاء فاتورة جديدة'}
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredInvoices.map((invoice) => (
                    <tr key={invoice.id} className="hover:bg-gray-50 transition-colors duration-150">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-blue-900 hover:text-blue-700 cursor-pointer">
                          {invoice.invoiceNo || invoice.invoice_no}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900 font-medium">{invoice.customer}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-600">{invoice.project}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-600">
                          {formatDate(invoice.issueDate || invoice.issue_date)}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-600">
                          {formatDate(invoice.dueDate || invoice.due_date)}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusClass(invoice.status)}`}>
                          {getStatusText(invoice.status)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {formatCurrency(getInvoiceTotal(invoice))}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-green-600 font-medium">
                          {formatCurrency(getInvoicePaid(invoice))}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className={`text-sm font-medium ${calculateBalance(invoice) > 0 ? 'text-orange-600' : 'text-gray-500'}`}>
                          {formatCurrency(calculateBalance(invoice))}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <ActionButtons
                          onView={() => setSelectedInvoiceId(invoice.id)}
                          onEdit={() => window.location.href = `/invoices/${invoice.id}/edit`}
                          onDelete={() => handleDelete(invoice.id)}
                          viewTitle="عرض وطباعة"
                        />
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Invoice View Modal */}
      {selectedInvoiceId && (
        <InvoiceViewModal
          invoiceId={selectedInvoiceId}
          onClose={() => setSelectedInvoiceId(null)}
        />
      )}
    </Layout>
  );
};

export default Invoices;
