import React, { useState, useEffect, useMemo } from 'react';
import Layout from '../components/Layout';
import { Link, useNavigate } from 'react-router-dom';
import { getSuppliers, deleteSupplier } from '../services/api';
import { useToast } from '../components/ui/Toast';
import { useConfirmations } from '../components/ui/ConfirmDialog';

const formatNumber = (value = 0) =>
  new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(value ?? 0);

const Suppliers = () => {
  const navigate = useNavigate();
  const { success, error: toastError } = useToast();
  const { confirmDelete } = useConfirmations();
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterField, setFilterField] = useState('all');

  useEffect(() => {
    fetchSuppliers();
  }, []);

  const fetchSuppliers = async () => {
    try {
      setLoading(true);
      const data = await getSuppliers();
      setSuppliers(Array.isArray(data) ? data : []);
      setError(null);
    } catch (err) {
      console.error('Error fetching suppliers:', err);
      setError('تعذر جلب بيانات الموردين. يرجى المحاولة مرة أخرى.');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    const confirmed = await confirmDelete('المورد');
    if (!confirmed) return;

    try {
      await deleteSupplier(id);
      success('تم حذف المورد بنجاح');
      fetchSuppliers();
    } catch (err) {
      console.error('Error deleting supplier:', err);
      toastError('تعذر حذف المورد. حاول مرة أخرى لاحقًا.');
    }
  };

  const supplierStats = useMemo(() => {
    if (!suppliers.length) {
      return {
        total: 0,
        active: 0,
        pending: 0,
        withContact: 0,
        contactCoverage: 0,
        withTaxId: 0,
        categories: 0,
      };
    }

    const aggregates = suppliers.reduce(
      (acc, supplier) => {
        const statusValue = (
          supplier.status ||
          supplier.lifecycle_status ||
          supplier.state ||
          supplier.supplier_status ||
          ''
        )
          .toString()
          .toLowerCase();

        if (statusValue) {
          acc.hasStatus = true;

          if (
            ['active', 'approved', 'current', 'نشط', 'معتمد'].some((status) =>
              statusValue.includes(status)
            )
          ) {
            acc.active += 1;
          } else if (
            ['pending', 'awaiting', 'review', 'draft', 'قيد', 'new', 'جديد'].some((status) =>
              statusValue.includes(status)
            )
          ) {
            acc.pending += 1;
          }
        }

        const categoryValue = (
          supplier.category ||
          supplier.type ||
          supplier.supplier_type ||
          supplier.vendor_category ||
          ''
        )
          .toString()
          .trim();

        if (categoryValue) {
          acc.categorySet.add(categoryValue);
        }

        const hasPhone = Boolean(supplier.phone && supplier.phone.toString().trim());
        const hasEmail = Boolean(supplier.email && supplier.email.toString().trim());

        if (hasPhone || hasEmail) {
          acc.withContact += 1;
        }

        if (supplier.tax_id || supplier.taxId) {
          acc.withTaxId += 1;
        }

        return acc;
      },
      {
        active: 0,
        pending: 0,
        withContact: 0,
        withTaxId: 0,
        hasStatus: false,
        categorySet: new Set(),
      }
    );

    const total = suppliers.length;
    const contactCoverage = total
      ? Math.round((aggregates.withContact / total) * 100)
      : 0;
    const active = aggregates.hasStatus ? aggregates.active : total;
    const pending = aggregates.hasStatus ? aggregates.pending : Math.max(total - active, 0);

    return {
      total,
      active,
      pending,
      withContact: aggregates.withContact,
      contactCoverage,
      withTaxId: aggregates.withTaxId,
      categories: aggregates.categorySet.size,
    };
  }, [suppliers]);

  const filteredSuppliers = useMemo(() => {
    if (!searchTerm) {
      return suppliers;
    }

    const normalize = (value) =>
      value === null || value === undefined ? '' : value.toString().toLowerCase();

    const searchLower = searchTerm.toLowerCase();

    return suppliers.filter((supplier) => {
      const name = normalize(supplier.name);
      const contactPerson = normalize(
        supplier.contact_person || supplier.contactPerson
      );
      const email = normalize(supplier.email);
      const phone = normalize(supplier.phone);
      const taxId = normalize(supplier.tax_id || supplier.taxId);
      const address = normalize(supplier.address);
      const status = normalize(
        supplier.status ||
          supplier.lifecycle_status ||
          supplier.state ||
          supplier.supplier_status
      );

      switch (filterField) {
        case 'name':
          return name.includes(searchLower);
        case 'contactPerson':
          return contactPerson.includes(searchLower);
        case 'email':
          return email.includes(searchLower);
        case 'phone':
          return phone.includes(searchLower);
        case 'taxId':
          return taxId.includes(searchLower);
        default:
          return (
            name.includes(searchLower) ||
            contactPerson.includes(searchLower) ||
            email.includes(searchLower) ||
            phone.includes(searchLower) ||
            taxId.includes(searchLower) ||
            address.includes(searchLower) ||
            status.includes(searchLower)
          );
      }
    });
  }, [suppliers, searchTerm, filterField]);

  const statCards = useMemo(
    () => [
      {
        title: 'إجمالي الموردين',
        value: formatNumber(supplierStats.total),
        subtitle: 'جميع الموردين المسجلين في النظام',
        gradient: 'from-blue-50 to-blue-100',
        border: 'border-blue-200',
        iconBg: 'bg-blue-200',
        iconColor: 'text-blue-800',
        icon: 'M20 13V7a2 2 0 00-2-2h-4l-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2h8m6-6h-6m6 0l-2-2m2 2l-2 2',
      },
      {
        title: 'موردون نشطون',
        value: formatNumber(supplierStats.active),
        subtitle:
          supplierStats.pending > 0
            ? `${formatNumber(supplierStats.pending)} قيد التفعيل`
            : 'جاهزون للتوريد',
        gradient: 'from-emerald-50 to-emerald-100',
        border: 'border-emerald-200',
        iconBg: 'bg-emerald-200',
        iconColor: 'text-emerald-800',
        icon: 'M5 13l4 4L19 7',
      },
      {
        title: 'اكتمال بيانات الاتصال',
        value: `${supplierStats.contactCoverage}%`,
        subtitle: `${formatNumber(supplierStats.withContact)} مورد ببيانات كاملة`,
        gradient: 'from-sky-50 to-sky-100',
        border: 'border-sky-200',
        iconBg: 'bg-sky-200',
        iconColor: 'text-sky-800',
        icon: 'M2 8l10 5 10-5M2 13l10 5 10-5',
      },
      {
        title: 'معرّف ضريبي مسجل',
        value: formatNumber(supplierStats.withTaxId),
        subtitle: 'موثقون لدى الجهات الرسمية',
        gradient: 'from-purple-50 to-purple-100',
        border: 'border-purple-200',
        iconBg: 'bg-purple-200',
        iconColor: 'text-purple-800',
        icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z',
      },
    ],
    [supplierStats]
  );

  const supplierSections = [
    {
      title: 'طلبات الشراء',
      description: 'إنشاء وتتبع أوامر الشراء من الموردين',
      path: '/purchase-orders',
      bgGradient: 'from-indigo-50 to-indigo-100',
      borderColor: 'border-indigo-200',
      iconBg: 'bg-indigo-200',
      iconColor: 'text-indigo-800',
      icon: 'M3 7h18M3 12h18M3 17h18',
    },
    {
      title: 'فواتير الموردين',
      description: 'مراجعة وتتبع فواتير الحسابات الدائنة',
      path: '/ap-invoices',
      bgGradient: 'from-rose-50 to-rose-100',
      borderColor: 'border-rose-200',
      iconBg: 'bg-rose-200',
      iconColor: 'text-rose-800',
      icon: 'M9 12h6m-6 4h6m2 4H7a2 2 0 01-2-2V6a2 2 0 012-2h5l2 2h5a2 2 0 012 2v10a2 2 0 01-2 2z',
    },
    {
      title: 'مصروفات الموردين',
      description: 'توثيق المدفوعات والمصروفات المرتبطة بالموردين',
      path: '/expenses',
      bgGradient: 'from-amber-50 to-amber-100',
      borderColor: 'border-amber-200',
      iconBg: 'bg-amber-200',
      iconColor: 'text-amber-800',
      icon: 'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8V6m0 10v2',
    },
    {
      title: 'حركات المخزون',
      description: 'مراجعة أثر الموردين على المخزون والمستودعات',
      path: '/stock-movements',
      bgGradient: 'from-teal-50 to-teal-100',
      borderColor: 'border-teal-200',
      iconBg: 'bg-teal-200',
      iconColor: 'text-teal-800',
      icon: 'M4 6h16M4 10h16M4 14h16M4 18h16',
    },
  ];

  const renderStatusBadge = (statusText) => {
    if (!statusText) {
      return null;
    }

    const normalized = statusText.toString().toLowerCase();

    let style = 'border-gray-200 bg-gray-100 text-gray-700';

    if (
      ['active', 'approved', 'current', 'نشط', 'معتمد'].some((status) =>
        normalized.includes(status)
      )
    ) {
      style = 'border-emerald-200 bg-emerald-50 text-emerald-700';
    } else if (
      ['pending', 'awaiting', 'review', 'draft', 'قيد', 'new', 'جديد'].some((status) =>
        normalized.includes(status)
      )
    ) {
      style = 'border-amber-200 bg-amber-50 text-amber-700';
    } else if (
      ['inactive', 'suspended', 'موقوف', 'متوقف'].some((status) =>
        normalized.includes(status)
      )
    ) {
      style = 'border-rose-200 bg-rose-50 text-rose-700';
    }

    return (
      <span
        className={`inline-flex items-center px-3 py-1 text-xs font-medium rounded-full border ${style}`}
      >
        {statusText}
      </span>
    );
  };

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
        <div className="space-y-4">
          <div className="bg-white rounded-xl shadow-sm border border-rose-200 p-6">
            <h2 className="text-xl font-semibold text-rose-700 mb-2">حدث خطأ</h2>
            <p className="text-rose-600 mb-4">{error}</p>
            <button
              onClick={fetchSuppliers}
              className="inline-flex items-center px-4 py-2 rounded-lg bg-rose-600 text-white hover:bg-rose-700 transition-colors"
            >
              إعادة المحاولة
            </button>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">إدارة الموردين</h1>
          <p className="text-gray-600">
            نظرة شاملة على شبكة الموردين ومتابعة العقود وطلبات الشراء
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
          {statCards.map((card) => (
            <div
              key={card.title}
              className={`relative overflow-hidden bg-gradient-to-br ${card.gradient} rounded-xl p-6 border ${card.border} shadow-sm`}
            >
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-sm font-medium text-gray-600 mb-1">{card.title}</h3>
                  <p className="text-3xl font-bold text-gray-900">{card.value}</p>
                  <p className="text-xs text-gray-500 mt-2">{card.subtitle}</p>
                </div>
                <div className={`flex-shrink-0 ${card.iconBg} p-3 rounded-xl`}>
                  <svg
                    className={`w-6 h-6 ${card.iconColor}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={card.icon} />
                  </svg>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-3 text-sm text-gray-600">
            <span className="inline-flex items-center px-3 py-1 rounded-full bg-blue-100 text-blue-700">
              {formatNumber(filteredSuppliers.length)} مورد
            </span>
            <span className="text-gray-400">
              من أصل {formatNumber(suppliers.length)}
            </span>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link
              to="/suppliers/new"
              className="inline-flex items-center px-5 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white font-medium rounded-lg shadow hover:from-blue-700 hover:to-blue-800 transition-transform transform hover:-translate-y-0.5"
            >
              <svg className="w-5 h-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v12m6-6H6" />
              </svg>
              إضافة مورد جديد
            </Link>
            <Link
              to="/purchase-orders/new"
              className="inline-flex items-center px-5 py-3 border border-blue-200 text-blue-700 font-medium rounded-lg hover:border-blue-300 hover:bg-blue-50 transition-colors"
            >
              إنشاء طلب شراء
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
          {supplierSections.map((section) => (
            <Link
              key={section.title}
              to={section.path}
              className={`block bg-gradient-to-br ${section.bgGradient} rounded-xl p-6 border ${section.borderColor} hover:shadow-lg transform hover:-translate-y-1 transition-all duration-200`}
            >
              <div className="flex items-start gap-4 flex-row-reverse">
                <div className={`flex-shrink-0 ${section.iconBg} p-3 rounded-lg`}>
                  <svg
                    className={`w-6 h-6 ${section.iconColor}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={section.icon} />
                  </svg>
                </div>
                <div className="text-right">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">{section.title}</h3>
                  <p className="text-sm text-gray-600 mb-3">{section.description}</p>
                  <span className="text-sm text-blue-600 font-medium flex items-center justify-end">
                    إدارة
                    <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="px-6 py-5 border-b border-gray-200 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-gray-800">سجل الموردين</h2>
              <p className="text-sm text-gray-500">
                استخدم البحث السريع لتصفية الموردين بحسب الاسم أو بيانات التواصل
              </p>
            </div>
            <button
              onClick={fetchSuppliers}
              className="inline-flex items-center px-4 py-2 text-sm text-blue-600 border border-blue-100 rounded-lg hover:bg-blue-50 transition-colors"
            >
              <svg className="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 4v5h.582M20 20v-5h-.581M5.063 9A7.002 7.002 0 0112 5c2.003 0 3.814.83 5.117 2.166M18.937 15A7.002 7.002 0 0112 19a6.992 6.992 0 01-5.117-2.166"
                />
              </svg>
              تحديث البيانات
            </button>
          </div>

          <div className="px-6 py-5 border-b border-gray-200">
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
              <div className="lg:col-span-2">
                <div className="relative">
                  <input
                    type="text"
                    placeholder="ابحث باسم المورد أو البريد أو الهاتف..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full px-4 py-3 pr-11 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-right"
                  />
                  {searchTerm && (
                    <button
                      onClick={() => setSearchTerm('')}
                      className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-400 hover:text-gray-600"
                    >
                      <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  )}
                  <span className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 pointer-events-none">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M11 5a6 6 0 016 6m-6 6a6 6 0 110-12" />
                    </svg>
                  </span>
                </div>
              </div>
              <div>
                <select
                  value={filterField}
                  onChange={(e) => setFilterField(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-right bg-white"
                >
                  <option value="all">جميع الحقول</option>
                  <option value="name">اسم المورد</option>
                  <option value="contactPerson">مسؤول التواصل</option>
                  <option value="email">البريد الإلكتروني</option>
                  <option value="phone">الهاتف</option>
                  <option value="taxId">المعرف الضريبي</option>
                </select>
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th
                    scope="col"
                    className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    المورد
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    بيانات الاتصال
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    العنوان
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    المعرف الضريبي
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    الإجراءات
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredSuppliers.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-10 text-center text-sm text-gray-500">
                      {searchTerm
                        ? 'لا توجد نتائج مطابقة لمعايير البحث الحالية'
                        : 'لم يتم تسجيل أي موردين حتى الآن'}
                    </td>
                  </tr>
                ) : (
                  filteredSuppliers.map((supplier) => {
                    const contactPerson =
                      supplier.contact_person || supplier.contactPerson || '';
                    const statusText =
                      supplier.status ||
                      supplier.lifecycle_status ||
                      supplier.state ||
                      supplier.supplier_status;

                    return (
                      <tr key={supplier.id || supplier.name}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          <div className="flex flex-col items-start space-y-2">
                            <Link
                              to={supplier.id ? `/suppliers/${supplier.id}` : '#'}
                              className="text-blue-600 hover:text-blue-800 font-medium"
                            >
                              {supplier.name || '—'}
                            </Link>
                            {contactPerson && (
                              <span className="text-xs text-gray-500">
                                مسؤول التواصل: {contactPerson}
                              </span>
                            )}
                            {renderStatusBadge(statusText)}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          <div className="flex flex-col items-start gap-1">
                            {supplier.phone && <span>{supplier.phone}</span>}
                            {supplier.email && (
                              <a
                                href={`mailto:${supplier.email}`}
                                className="text-blue-600 hover:text-blue-800"
                              >
                                {supplier.email}
                              </a>
                            )}
                            {!supplier.phone && !supplier.email && <span>—</span>}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {supplier.address || '—'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {supplier.tax_id || supplier.taxId || '—'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <div className="flex items-center gap-3">
                            <button
                              onClick={() =>
                                supplier.id && navigate(`/suppliers/${supplier.id}/edit`)
                              }
                              className="text-blue-600 hover:text-blue-800"
                            >
                              تعديل
                            </button>
                            <button
                              onClick={() => supplier.id && handleDelete(supplier.id)}
                              className="text-rose-600 hover:text-rose-800"
                            >
                              حذف
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default Suppliers;
