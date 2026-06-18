import React, { useState, useEffect, useMemo } from 'react';
import Layout from '../components/Layout';
import { getCustomers, deleteCustomer } from '../services/api';
import { useToast } from '../components/ui/Toast';
import { useConfirmations } from '../components/ui/ConfirmDialog';
import { formatNumber } from '../utils/formatters';
import { ActionButtons } from '../components/ui/IconButton';

const Customers = () => {
  const { success, error: toastError } = useToast();
  const { confirmDelete } = useConfirmations();
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterField, setFilterField] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [totalCount, setTotalCount] = useState(0);

  useEffect(() => {
    fetchCustomers();
  }, [currentPage, pageSize]);

  const fetchCustomers = async () => {
    try {
      setLoading(true);
      const skip = (currentPage - 1) * pageSize;
      const result = await getCustomers(skip, pageSize);
      setCustomers(Array.isArray(result.data) ? result.data : []);
      setTotalCount(result.total || 0);
      setError(null);
    } catch (err) {
      setError('تعذر تحميل قائمة العملاء');
      console.error('Error fetching customers:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!id) {
      return;
    }

    const confirmed = await confirmDelete('العميل');
    if (!confirmed) return;

    try {
      await deleteCustomer(id);
      success('تم حذف العميل بنجاح');
      fetchCustomers();
    } catch (err) {
      toastError('تعذر حذف العميل');
      console.error('Error deleting customer:', err);
    }
  };

  const filteredCustomers = useMemo(() => {
    if (!searchTerm) {
      return customers;
    }

    const term = searchTerm.toLowerCase();

    return customers.filter((customer) => {
      const taxNumber = customer.tax_number || customer.taxNo || '';
      switch (filterField) {
        case 'name':
          return customer.name?.toLowerCase().includes(term);
        case 'email':
          return customer.email?.toLowerCase().includes(term);
        case 'phone':
          return customer.phone?.toLowerCase().includes(term);
        case 'tax_number':
          return taxNumber.toLowerCase().includes(term);
        default:
          return (
            customer.name?.toLowerCase().includes(term) ||
            customer.email?.toLowerCase().includes(term) ||
            customer.phone?.toLowerCase().includes(term) ||
            taxNumber.toLowerCase().includes(term)
          );
      }
    });
  }, [customers, searchTerm, filterField]);

  const totalCustomers = totalCount; // Use the total from backend
  const withPhone = customers.filter((customer) => Boolean(customer.phone)).length;
  const withEmail = customers.filter((customer) => Boolean(customer.email)).length;
  const withTaxNumber = customers.filter((customer) => Boolean(customer.tax_number || customer.taxNo)).length;
  const withAddress = customers.filter((customer) => Boolean(customer.address)).length;
  const contactable = customers.filter((customer) => customer.phone || customer.email).length;
  const contactRate = customers.length ? Math.round((contactable / customers.length) * 100) : 0;
  const taxRate = customers.length ? Math.round((withTaxNumber / customers.length) * 100) : 0;
  const addressRate = customers.length ? Math.round((withAddress / customers.length) * 100) : 0;
  const recentCustomers = useMemo(() => customers.slice(0, 5), [customers]);

  const bothContacts = customers.filter((customer) => customer.phone && customer.email).length;
  const phoneOnly = withPhone - bothContacts;
  const emailOnly = withEmail - bothContacts;
  const withoutContacts = Math.max(totalCustomers - (bothContacts + phoneOnly + emailOnly), 0);

  const contactBreakdown = [
    { label: 'هاتف وبريد', value: bothContacts, color: 'bg-blue-500' },
    { label: 'هاتف فقط', value: phoneOnly, color: 'bg-green-500' },
    { label: 'بريد فقط', value: emailOnly, color: 'bg-purple-500' },
    { label: 'بدون بيانات', value: withoutContacts, color: 'bg-gray-400' },
  ];
  const breakdownTotal = contactBreakdown.reduce((sum, item) => sum + item.value, 0) || 1;

  // formatNumber تم استيرادها من utils/formatters
  // formatNumber is now imported from utils/formatters

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
        </div>
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout>
        <div className="space-y-6">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-800 mb-2">العملاء</h1>
            <p className="text-gray-600">واجهنا مشكلة أثناء تحميل البيانات، حاول مرة أخرى.</p>
          </div>
          <div className="bg-gradient-to-br from-red-50 to-red-100 rounded-xl p-6 border border-red-200">
            <div className="flex items-center">
              <div className="p-2 bg-red-200 rounded-full mr-3">
                <svg className="w-6 h-6 text-red-800" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="text-red-800 font-medium">{error}</div>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">العملاء</h1>
          <p className="text-gray-600">إدارة بيانات العملاء وقنوات التواصل معهم عبر لوحة سهلة وواضحة.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
          <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-6 border border-blue-200">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-medium text-blue-800 mb-1">إجمالي العملاء</h3>
                <p className="text-2xl font-bold text-blue-900">{formatNumber(totalCustomers)}</p>
                <p className="text-xs text-blue-600 mt-1">عدد العملاء المسجلين في النظام</p>
              </div>
              <div className="p-3 bg-blue-200 rounded-full">
                <svg className="w-6 h-6 text-blue-800" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-6 border border-green-200">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-medium text-green-800 mb-1">جهات قابلة للتواصل</h3>
                <p className="text-2xl font-bold text-green-900">{contactRate}%</p>
                <p className="text-xs text-green-600 mt-1">{formatNumber(contactable)} عميل لديهم هاتف أو بريد</p>
              </div>
              <div className="p-3 bg-green-200 rounded-full">
                <svg className="w-6 h-6 text-green-800" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493A1 1 0 0011.69 9H19a2 2 0 012 2v3a2 2 0 01-2 2h-6l-2 3H9l1-3H5a2 2 0 01-2-2z" />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl p-6 border border-purple-200">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-medium text-purple-800 mb-1">عملاء لديهم رقم ضريبي</h3>
                <p className="text-2xl font-bold text-purple-900">{formatNumber(withTaxNumber)}</p>
                <p className="text-xs text-purple-600 mt-1">{taxRate}% من الإجمالي</p>
              </div>
              <div className="p-3 bg-purple-200 rounded-full">
                <svg className="w-6 h-6 text-purple-800" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2h5m4-12h3m-3 4h3m-3 4h3" />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-xl p-6 border border-orange-200">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-medium text-orange-800 mb-1">عناوين مسجلة</h3>
                <p className="text-2xl font-bold text-orange-900">{formatNumber(withAddress)}</p>
                <p className="text-xs text-orange-600 mt-1">{addressRate}% من العملاء لديهم عنوان</p>
              </div>
              <div className="p-3 bg-orange-200 rounded-full">
                <svg className="w-6 h-6 text-orange-800" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 11l9-9 9 9M4 10v10a1 1 0 001 1h3m10-11v11a1 1 0 001 1h3m-10 0h4" />
                </svg>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          <div className="space-y-6 xl:col-span-2">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                <div>
                  <h2 className="text-xl font-semibold text-gray-900">قائمة العملاء</h2>
                  <p className="text-sm text-gray-500 mt-1">ابحث عن العملاء وتابع بيانات التواصل معهم بسرعة.</p>
                </div>
                <button
                  onClick={() => (window.location.href = '/customers/new')}
                  className="inline-flex items-center justify-center px-4 py-2 text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 transition-colors duration-150"
                >
                  إضافة عميل جديد
                </button>
              </div>

              <div className="mt-6 grid grid-cols-1 lg:grid-cols-4 gap-4">
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
                      onChange={(event) => setSearchTerm(event.target.value)}
                      placeholder="ابحث باسم العميل أو البريد أو الهاتف"
                      className="w-full pl-4 pr-10 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-shadow duration-150"
                    />
                  </div>
                </div>
                <div>
                  <select
                    value={filterField}
                    onChange={(event) => setFilterField(event.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-shadow duration-150"
                  >
                    <option value="all">كل الحقول</option>
                    <option value="name">الاسم</option>
                    <option value="email">البريد الإلكتروني</option>
                    <option value="phone">رقم الهاتف</option>
                    <option value="tax_number">الرقم الضريبي</option>
                  </select>
                </div>
                <div>
                  <button
                    onClick={() => {
                      setSearchTerm('');
                      setFilterField('all');
                    }}
                    className="w-full inline-flex items-center justify-center px-4 py-2 text-sm font-medium rounded-md border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors duration-150"
                  >
                    إعادة التعيين
                  </button>
                </div>
              </div>

              <div className="mt-6 overflow-x-auto border border-gray-200 rounded-xl">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[150px]">العميل</th>
                      <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[200px]">التواصل</th>
                      <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[120px]">الرقم الضريبي</th>
                      <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[200px]">العنوان</th>
                      <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[120px]">إجراءات</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredCustomers.length === 0 ? (
                      <tr>
                        <td colSpan="5" className="px-6 py-12 text-center text-sm text-gray-500">
                          {searchTerm
                            ? 'لا توجد نتائج مطابقة لمعايير البحث الحالية.'
                            : 'لم يتم إضافة عملاء حتى الآن.'}
                        </td>
                      </tr>
                    ) : (
                      filteredCustomers.map((customer) => (
                        <tr key={customer.id || customer.tax_number || customer.taxNo || customer.name}>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-semibold text-gray-900">{customer.name || '—'}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-600">{customer.phone || 'لا يوجد رقم'}</div>
                            <div className="text-xs text-gray-400">{customer.email || 'لا يوجد بريد'}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {customer.tax_number || customer.taxNo || '—'}
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-500 max-w-xs">
                            <div className="truncate" title={customer.address || '—'}>
                              {customer.address || '—'}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                            <div className="flex items-center gap-2">
                              <button
                                className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md text-blue-700 bg-blue-100 hover:bg-blue-200 transition-colors duration-150"
                                onClick={() => customer.id && (window.location.href = `/customers/${customer.id}/edit`)}
                              >
                                تعديل
                              </button>
                              <button
                                className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md text-red-700 bg-red-100 hover:bg-red-200 transition-colors duration-150"
                                onClick={() => handleDelete(customer.id)}
                              >
                                حذف
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {totalCount > 0 && (
                <div className="mt-6 flex items-center justify-between border-t border-gray-200 bg-white px-4 py-3 sm:px-6">
                  <div className="flex flex-1 justify-between items-center sm:hidden">
                    <button
                      onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                      disabled={currentPage === 1}
                      className="relative inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      السابق
                    </button>
                    <span className="text-sm text-gray-700">
                      صفحة {currentPage} من {Math.ceil(totalCount / pageSize)}
                    </span>
                    <button
                      onClick={() => setCurrentPage(prev => Math.min(prev + 1, Math.ceil(totalCount / pageSize)))}
                      disabled={currentPage >= Math.ceil(totalCount / pageSize)}
                      className="relative ml-3 inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      التالي
                    </button>
                  </div>
                  <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
                    <div className="flex items-center gap-4">
                      <p className="text-sm text-gray-700">
                        عرض <span className="font-medium">{((currentPage - 1) * pageSize) + 1}</span> إلى <span className="font-medium">{Math.min(currentPage * pageSize, totalCount)}</span> من <span className="font-medium">{formatNumber(totalCount)}</span> عميل
                      </p>
                      <select
                        value={pageSize}
                        onChange={(e) => {
                          setPageSize(Number(e.target.value));
                          setCurrentPage(1);
                        }}
                        className="rounded-md border border-gray-300 bg-white px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      >
                        <option value={10}>10</option>
                        <option value={20}>20</option>
                        <option value={50}>50</option>
                        <option value={100}>100</option>
                      </select>
                      <span className="text-sm text-gray-500">عنصر في الصفحة</span>
                    </div>
                    <div>
                      <nav className="isolate inline-flex -space-x-px rounded-md shadow-sm" aria-label="Pagination">
                        <button
                          onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                          disabled={currentPage === 1}
                          className="relative inline-flex items-center rounded-r-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                            <path fillRule="evenodd" d="M12.79 5.23a.75.75 0 01-.02 1.06L8.832 10l3.938 3.71a.75.75 0 11-1.04 1.08l-4.5-4.25a.75.75 0 010-1.08l4.5-4.25a.75.75 0 011.06.02z" clipRule="evenodd" />
                          </svg>
                        </button>

                        {Array.from({ length: Math.min(5, Math.ceil(totalCount / pageSize)) }, (_, i) => {
                          const pageNum = i + 1;
                          return (
                            <button
                              key={pageNum}
                              onClick={() => setCurrentPage(pageNum)}
                              className={`relative inline-flex items-center px-4 py-2 text-sm font-semibold ${
                                currentPage === pageNum
                                  ? 'z-10 bg-blue-600 text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600'
                                  : 'text-gray-900 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0'
                              }`}
                            >
                              {pageNum}
                            </button>
                          );
                        })}

                        <button
                          onClick={() => setCurrentPage(prev => Math.min(prev + 1, Math.ceil(totalCount / pageSize)))}
                          disabled={currentPage >= Math.ceil(totalCount / pageSize)}
                          className="relative inline-flex items-center rounded-l-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                            <path fillRule="evenodd" d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z" clipRule="evenodd" />
                          </svg>
                        </button>
                      </nav>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="space-y-6">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">صحة بيانات التواصل</h3>
              <div className="space-y-4">
                {contactBreakdown.map((item) => {
                  const percentage = breakdownTotal ? Math.round((item.value / breakdownTotal) * 100) : 0;
                  const clamped = Math.min(100, Math.max(percentage, 0));
                  return (
                    <div key={item.label}>
                      <div className="flex items-center justify-between text-sm text-gray-600 mb-1">
                        <span>{item.label}</span>
                        <span className="font-medium text-gray-900">{formatNumber(item.value)}</span>
                      </div>
                      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div className={`h-full ${item.color}`} style={{ width: `${clamped}%` }} />
                      </div>
                      <div className="text-xs text-gray-400 mt-1">{clamped}% من الإجمالي</div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">أحدث العملاء</h3>
              <ul className="space-y-4">
                {recentCustomers.length === 0 ? (
                  <li className="text-sm text-gray-500">لا توجد بيانات لعرضها.</li>
                ) : (
                  recentCustomers.map((customer) => (
                    <li
                      key={`recent-${customer.id || customer.tax_number || customer.taxNo || customer.name}`}
                      className="flex items-start justify-between"
                    >
                      <div>
                        <p className="text-sm font-semibold text-gray-900">{customer.name || '—'}</p>
                        <p className="text-xs text-gray-500 mt-1">
                          {customer.phone || customer.email || 'لا توجد بيانات تواصل'}
                        </p>
                      </div>
                      <button
                        className="text-xs text-blue-600 hover:text-blue-800 font-medium"
                        onClick={() => customer.id && (window.location.href = `/customers/${customer.id}`)}
                      >
                        عرض التفاصيل
                      </button>
                    </li>
                  ))
                )}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default Customers;
