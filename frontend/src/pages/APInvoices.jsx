import React, { useState, useEffect, useMemo } from 'react';
import Layout from '../components/Layout';
import { getAPInvoices, deleteAPInvoice } from '../services/api';
import { useConfirmations } from '../components/ui/ConfirmDialog';

const APInvoices = () => {
  const { confirmDelete } = useConfirmations();
  const [apInvoices, setAPInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterField, setFilterField] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  useEffect(() => {
    fetchAPInvoices();
  }, []);

  const fetchAPInvoices = async () => {
    try {
      setLoading(true);
      const data = await getAPInvoices();
      setAPInvoices(data);
      setError(null);
    } catch (err) {
      setError('فشل في جلب فواتير الدفع');
      console.error('Error fetching AP invoices:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    const confirmed = await confirmDelete('هل أنت متأكد من حذف هذه الفاتورة؟');
    if (confirmed) {
      try {
        await deleteAPInvoice(id);
        fetchAPInvoices(); // Refresh the list
      } catch (err) {
        setError('فشل في حذف الفاتورة');
        console.error('Error deleting AP invoice:', err);
      }
    }
  };

  const getStatusClass = (status) => {
    switch (status) {
      case 'DRAFT':
        return 'bg-gray-100 text-gray-800';
      case 'ISSUED':
        return 'bg-blue-100 text-blue-800';
      case 'PARTIALLY_PAID':
        return 'bg-yellow-100 text-yellow-800';
      case 'PAID':
        return 'bg-green-100 text-green-800';
      case 'VOID':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const calculateBalance = (invoice) => {
    const amount = typeof invoice.amount === 'number' ? invoice.amount : 0;
    const paidAmount = typeof invoice.paid_amount === 'number' ? invoice.paid_amount : 
                      typeof invoice.paidAmount === 'number' ? invoice.paidAmount : 0;
    return amount - paidAmount;
  };

  // Filter and search AP invoices
  const filteredAPInvoices = useMemo(() => {
    let result = apInvoices;
    
    // Apply status filter
    if (statusFilter !== 'all') {
      result = result.filter(invoice => invoice.status === statusFilter);
    }
    
    // Apply search term
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      
      switch (filterField) {
        case 'invoiceNo':
          result = result.filter(invoice => (invoice.invoice_no || invoice.invoiceNo)?.toLowerCase().includes(searchLower));
          break;
        case 'supplier':
          result = result.filter(invoice => invoice.supplier?.name?.toLowerCase().includes(searchLower));
          break;
        default:
          // Search all fields
          result = result.filter(invoice => 
            (invoice.invoice_no || invoice.invoiceNo)?.toLowerCase().includes(searchLower) ||
            invoice.supplier?.name?.toLowerCase().includes(searchLower)
          );
      }
    }
    
    return result;
  }, [apInvoices, searchTerm, filterField, statusFilter]);

  if (loading) {
    return (
      <Layout>
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-3xl font-bold text-gray-800">فواتير الدفع</h2>
          </div>
          <div className="text-gray-600">جاري تحميل فواتير الدفع...</div>
        </div>
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout>
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-3xl font-bold text-gray-800">فواتير الدفع</h2>
          </div>
          <div className="text-red-500">{error}</div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="bg-gradient-to-br from-blue-50 to-indigo-100 rounded-xl shadow-lg p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-800">AP Invoices</h2>
          <button 
            className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-bold py-3 px-6 rounded-lg shadow-md hover:shadow-lg transition-all duration-200"
            onClick={() => window.location.href = '/ap-invoices/new'}
          >
إضافة فاتورة جديدة
          </button>
        </div>
        
        {/* Search and Filter Controls */}
        <div className="mb-6 flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <input
                type="text"
                placeholder="البحث في فواتير الدفع..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                >
                  <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
              className="px-4 py-3 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
            >
              <option value="all">جميع الحقول</option>
              <option value="invoiceNo">رقم الفاتورة</option>
              <option value="supplier">المورد</option>
            </select>
          </div>
          <div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-3 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
            >
              <option value="all">جميع الحالات</option>
              <option value="DRAFT">مسودة</option>
              <option value="ISSUED">صادرة</option>
              <option value="PARTIALLY_PAID">مدفوعة جزئياً</option>
              <option value="PAID">مدفوعة</option>
              <option value="VOID">ملغاة</option>
            </select>
          </div>
        </div>
        
        {/* Results Count */}
        <div className="mb-4 text-sm text-gray-500">
عرض {filteredAPInvoices.length} من أصل {apInvoices.length} فاتورة
        </div>
        
        <div className="bg-white rounded-xl shadow-md overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gradient-to-r from-gray-50 to-gray-100">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
رقم الفاتورة
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
المورد
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
تاريخ الفاتورة
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
تاريخ الاستحقاق
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
الحالة
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
المبلغ (دولار)
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
المدفوع (دولار)
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
الرصيد (دولار)
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
الإجراءات
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredAPInvoices.length === 0 ? (
                <tr>
                  <td colSpan="9" className="px-6 py-4 text-center text-gray-500">
                    {searchTerm || statusFilter !== 'all' ? 'لم يتم العثور على فواتير مطابقة لمعايير البحث' : 'لم يتم العثور على فواتير'}
                  </td>
                </tr>
              ) : (
                filteredAPInvoices.map((invoice) => (
                  <tr key={invoice.id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{invoice.invoice_no || invoice.invoiceNo}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-500">{invoice.supplier?.name}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-500">
                        {invoice.invoice_date || invoice.invoiceDate ? new Date(invoice.invoice_date || invoice.invoiceDate).toLocaleDateString() : ''}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-500">
                        {(invoice.due_date || invoice.dueDate) ? 
                          new Date(invoice.due_date || invoice.dueDate).toLocaleDateString() : ''}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusClass(invoice.status)}`}>
                        {invoice.status ? invoice.status.replace('_', ' ') : 'DRAFT'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-500">
                        ${typeof invoice.amount === 'number' ? invoice.amount.toFixed(2) : '0.00'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-500">
                        ${typeof (invoice.paid_amount || invoice.paidAmount) === 'number' ? 
                          (invoice.paid_amount || invoice.paidAmount).toFixed(2) : '0.00'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-500">
                        ${calculateBalance(invoice).toFixed(2)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <button 
                        className="text-blue-600 hover:text-blue-900 mr-3 hover:bg-blue-50 px-2 py-1 rounded transition-colors"
                        onClick={() => window.location.href = `/ap-invoices/${invoice.id}/edit`}
                      >
تعديل
                      </button>
                      <button 
                        className="text-red-600 hover:text-red-900 hover:bg-red-50 px-2 py-1 rounded transition-colors"
                        onClick={() => handleDelete(invoice.id)}
                      >
حذف
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
            </table>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default APInvoices;