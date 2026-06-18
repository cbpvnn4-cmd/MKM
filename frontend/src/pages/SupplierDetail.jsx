import React, { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import Layout from '../components/Layout';
import SupplierForm from '../components/SupplierForm';
import { getSupplier } from '../services/api';

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
    <span className={`inline-flex items-center px-3 py-1 text-xs font-medium rounded-full border ${style}`}>
      {statusText}
    </span>
  );
};

const SupplierDetail = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const [supplier, setSupplier] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const isNewSupplier = !id || id === 'new';

  useEffect(() => {
    if (!isNewSupplier) {
      fetchSupplier();
    }
  }, [isNewSupplier]);

  const fetchSupplier = async () => {
    try {
      setLoading(true);
      const data = await getSupplier(id);
      setSupplier(data);
      setError(null);
    } catch (err) {
      setError('تعذر تحميل بيانات المورد. يرجى المحاولة مرة أخرى.');
      console.error('Error fetching supplier:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = () => {
    navigate('/suppliers');
  };

  const handleCancel = () => {
    navigate('/suppliers');
  };

  const insightCards = useMemo(() => {
    if (isNewSupplier) {
      return [
        {
          title: 'الخطوة الأولى',
          value: 'بيانات المورد الأساسية',
          subtitle: 'أدخل الاسم التجاري والمعرّف الضريبي إن وجد',
          icon: 'M12 11c1.105 0 2-.672 2-1.5S13.105 8 12 8s-2 .672-2 1.5.895 1.5 2 1.5zm0 0v4m-7 4h14a2 2 0 002-2V7a2 2 0 00-2-2h-3.172a2 2 0 01-1.414-.586l-.828-.828A2 2 0 0011.172 3H5a2 2 0 00-2 2v12a2 2 0 002 2z',
          gradient: 'from-blue-50 to-blue-100',
          border: 'border-blue-200',
          iconBg: 'bg-blue-200',
          iconColor: 'text-blue-800',
        },
        {
          title: 'بيانات التواصل',
          value: 'الهاتف والبريد الإلكتروني',
          subtitle: 'تساعد على تسريع أوامر الشراء والتنسيق اللوجستي',
          icon: 'M21 8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2h14a2 2 0 002-2V8zm-2 0l-7 5-7-5',
          gradient: 'from-emerald-50 to-emerald-100',
          border: 'border-emerald-200',
          iconBg: 'bg-emerald-200',
          iconColor: 'text-emerald-800',
        },
        {
          title: 'ملاحظات وتخصصات',
          value: 'حدد مجالات التوريد',
          subtitle: 'سجّل المنتجات أو الخدمات التي يوفرها المورد لتسهيل البحث لاحقًا',
          icon: 'M3 5h18M9 3v4m6-4v4M4 9h16v10a2 2 0 01-2 2H6a2 2 0 01-2-2V9z',
          gradient: 'from-purple-50 to-purple-100',
          border: 'border-purple-200',
          iconBg: 'bg-purple-200',
          iconColor: 'text-purple-800',
        },
      ];
    }

    const channels = [supplier?.phone, supplier?.email].filter((value) =>
      value && value.toString().trim()
    );

    return [
      {
        title: 'اسم المورد',
        value: supplier?.name || 'غير محدد',
        subtitle: supplier?.address || 'لا يوجد عنوان مسجل',
        icon: 'M5.121 17.804A13.937 13.937 0 0112 16c2.5 0 4.847.655 6.879 1.804M15 11a3 3 0 11-6 0 3 3 0 016 0zm6 1a9 9 0 11-18 0 9 9 0 0118 0z',
        gradient: 'from-blue-50 to-blue-100',
        border: 'border-blue-200',
        iconBg: 'bg-blue-200',
        iconColor: 'text-blue-800',
      },
      {
        title: 'قنوات التواصل',
        value: channels.length ? `${channels.length} قناة فعّالة` : 'بيانات ناقصة',
        subtitle: channels.length
          ? channels.join(' • ')
          : 'أضف رقم هاتف أو بريد إلكتروني للتواصل السريع',
        icon: 'M3 5h2l.4 2M7 13h10l1-5H6.4m0 0L5 4H3',
        gradient: 'from-emerald-50 to-emerald-100',
        border: 'border-emerald-200',
        iconBg: 'bg-emerald-200',
        iconColor: 'text-emerald-800',
      },
      {
        title: 'الحالة الضريبية',
        value: supplier?.tax_id || supplier?.taxId || 'غير مسجل',
        subtitle: supplier?.tax_id || supplier?.taxId
          ? 'المورد موثق بضريبة القيمة المضافة'
          : 'أضف المعرّف الضريبي لإتمام إجراءات الفوترة',
        icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z',
        gradient: 'from-purple-50 to-purple-100',
        border: 'border-purple-200',
        iconBg: 'bg-purple-200',
        iconColor: 'text-purple-800',
      },
    ];
  }, [isNewSupplier, supplier]);

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
            <div className="flex items-center gap-3">
              {!isNewSupplier && (
                <button
                  onClick={fetchSupplier}
                  className="inline-flex items-center px-4 py-2 rounded-lg bg-rose-600 text-white hover:bg-rose-700 transition-colors"
                >
                  إعادة المحاولة
                </button>
              )}
              <button
                onClick={handleCancel}
                className="inline-flex items-center px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors"
              >
                الرجوع لقائمة الموردين
              </button>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  const statusText = supplier?.status ||
    supplier?.lifecycle_status ||
    supplier?.state ||
    supplier?.supplier_status;

  return (
    <Layout>
      <div className="space-y-6">
        <div className="relative overflow-hidden bg-gradient-to-r from-blue-600/10 via-blue-500/10 to-indigo-500/10 border border-blue-100 rounded-2xl">
          <div className="absolute inset-y-0 right-0 w-1/2 bg-gradient-to-l from-blue-200/40 to-transparent" />
          <div className="relative px-8 py-10">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6 text-right">
              <div>
                <span className="inline-flex items-center px-4 py-1 rounded-full bg-blue-200 text-blue-800 text-sm font-medium mb-4">
                  إدارة الموردين
                </span>
                <h1 className="text-3xl font-bold text-gray-800 mb-3">
                  {isNewSupplier
                    ? 'إضافة مورد جديد'
                    : `تحديث بيانات المورد ${supplier?.name ? `- ${supplier.name}` : ''}`}
                </h1>
                <p className="text-gray-600 max-w-2xl">
                  صممت هذه الصفحة لتسهيل عملية إدخال بيانات الموردين بنفس تجربة صفحة المبيعات، مع بطاقات معلوماتية وأدوات مساعدة لضمان اكتمال البيانات وتسريع إجراءات الشراء.
                </p>
              </div>
              <div className="flex flex-col items-end gap-3">
                {renderStatusBadge(statusText)}
                <div className="flex flex-wrap gap-3">
                  <button
                    onClick={handleCancel}
                    className="inline-flex items-center px-4 py-2 rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    الرجوع للقائمة
                  </button>
                  {!isNewSupplier && (
                    <Link
                      to="/purchase-orders/new"
                      className="inline-flex items-center px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors shadow"
                    >
                      إنشاء طلب شراء
                    </Link>
                  )}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 mt-10">
              {insightCards.map((card) => (
                <div
                  key={card.title}
                  className={`relative overflow-hidden bg-gradient-to-br ${card.gradient} rounded-xl p-6 border ${card.border} shadow-sm`}
                >
                  <div className="flex items-start gap-4 flex-row-reverse text-right">
                    <div className={`flex-shrink-0 ${card.iconBg} p-3 rounded-lg`}>
                      <svg className={`w-6 h-6 ${card.iconColor}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={card.icon} />
                      </svg>
                    </div>
                    <div>
                      <h3 className="text-sm font-medium text-gray-700 mb-2">{card.title}</h3>
                      <p className="text-lg font-semibold text-gray-900 mb-1">{card.value}</p>
                      <p className="text-sm text-gray-600">{card.subtitle}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <SupplierForm supplier={supplier} onSave={handleSave} onCancel={handleCancel} />
      </div>
    </Layout>
  );
};

export default SupplierDetail;
