import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import Layout from '../components/Layout';
import { getPurchaseOrder, getPurchaseOrderPayments } from '../services/api';
import ProtectedComponent from '../components/ProtectedComponent';
import { PERMISSIONS } from '../utils/permissions';
import { ArrowLeft, Edit3, ExternalLink, FileText } from 'lucide-react';

const STATUS_LABELS = {
  DRAFT: 'مسودة',
  CONFIRMED: 'مؤكد',
  RECEIVED: 'مستلم',
  CANCELLED: 'ملغي'
};

const formatCurrency = (value) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Number(value || 0));
const formatDate = (value) => { if (!value) return '—'; const d = new Date(value); return Number.isNaN(d.getTime()) ? '—' : d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }); };
const safeNumber = (value) => { const n = Number(value); return Number.isFinite(n) ? n : 0; };

const PurchaseOrderView = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [purchaseOrder, setPurchaseOrder] = useState(null);
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        setError(null);
        const [orderData, paymentData] = await Promise.all([
          getPurchaseOrder(id),
          getPurchaseOrderPayments(id)
        ]);
        setPurchaseOrder(orderData);
        setPayments(Array.isArray(paymentData) ? paymentData : []);
      } catch (err) {
        setError(err?.response?.data?.detail || err?.message || 'تعذر تحميل أمر الشراء');
      } finally {
        setLoading(false);
      }
    };
    if (id) load();
  }, [id]);

  const totals = useMemo(() => {
    const total = safeNumber(purchaseOrder?.total_amount_usd || purchaseOrder?.total_amount);
    const paid = safeNumber(purchaseOrder?.paid_amount_usd || purchaseOrder?.paid_amount);
    return { total, paid, outstanding: Math.max(total - paid, 0) };
  }, [purchaseOrder]);

  const statusLabel = useMemo(() => {
    const key = (purchaseOrder?.status || '').toUpperCase();
    return STATUS_LABELS[key] || key || 'غير محدد';
  }, [purchaseOrder]);

  if (loading) {
    return (
      <Layout>
        <div className='flex items-center justify-center min-h-[60vh]'>
          <div className='animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600' />
        </div>
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout>
        <div className='max-w-3xl mx-auto bg-white shadow rounded-xl p-8 text-center'>
          <p className='text-red-600 mb-6'>{error}</p>
          <button type='button' onClick={() => navigate('/purchase-orders')} className='px-5 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700'>
            العودة إلى قائمة أوامر الشراء
          </button>
        </div>
      </Layout>
    );
  }

  if (!purchaseOrder) return null;

  return (
    <Layout>
      <div className='flex flex-col gap-6'>
        <div className='flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3'>
          <div>
            <h1 className='text-3xl font-bold text-gray-900'>عرض أمر الشراء</h1>
            <p className='text-gray-600'>استعراض كامل التفاصيل دون إمكانية التعديل.</p>
          </div>
          <div className='flex flex-wrap gap-3'>
            <button type='button' onClick={() => navigate('/purchase-orders')} className='inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-100'>
              <ArrowLeft className='w-4 h-4' /> العودة للقائمة
            </button>
            <ProtectedComponent permission={PERMISSIONS.MANAGE_INVENTORY}>
              <button type='button' onClick={() => navigate(`/purchase-orders/${id}/edit`, { state: { fromView: true } })} className='inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-purple-600 text-white hover:bg-purple-700'>
                <Edit3 className='w-4 h-4' /> تعديل أمر الشراء
              </button>
            </ProtectedComponent>
          </div>
        </div>

        <div className='grid grid-cols-1 md:grid-cols-3 gap-4'>
          <div className='bg-white border border-gray-200 rounded-xl p-5 shadow-sm'>
            <div className='text-sm text-gray-500'>إجمالي الأمر</div>
            <div className='text-2xl font-bold text-gray-900 mt-1'>{formatCurrency(totals.total)}</div>
            <div className='text-xs text-gray-400 mt-2'>العملة: {purchaseOrder.currency || 'USD'}</div>
          </div>
          <div className='bg-white border border-gray-200 rounded-xl p-5 shadow-sm'>
            <div className='text-sm text-gray-500'>المبلغ المدفوع</div>
            <div className='text-2xl font-bold text-green-600 mt-1'>{formatCurrency(totals.paid)}</div>
            <div className='text-xs text-gray-400 mt-2'>آخر تحديث: {formatDate(purchaseOrder.updated_at)}</div>
          </div>
          <div className='bg-white border border-gray-200 rounded-xl p-5 shadow-sm'>
            <div className='text-sm text-gray-500'>الرصيد المتبقي</div>
            <div className='text-2xl font-bold text-orange-600 mt-1'>{formatCurrency(totals.outstanding)}</div>
            <div className='text-xs text-gray-400 mt-2'>الحالة: {statusLabel}</div>
          </div>
        </div>

        <section className='bg-white border border-gray-200 rounded-xl shadow-sm'>
          <div className='border-b border-gray-200 px-6 py-4 flex items-center gap-2'>
            <FileText className='w-5 h-5 text-blue-600' />
            <h2 className='text-lg font-semibold text-gray-900'>البيانات العامة</h2>
          </div>
          <dl className='px-6 py-5 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-sm'>
            <div><dt className='text-gray-500'>رقم أمر الشراء</dt><dd className='font-medium text-gray-900'>{purchaseOrder.po_no}</dd></div>
            <div><dt className='text-gray-500'>المورد</dt><dd className='font-medium text-blue-600 inline-flex items-center gap-2'><Link to={`/suppliers/${purchaseOrder.supplier_id}`} className='hover:underline inline-flex items-center gap-1'>{purchaseOrder.supplier?.name || 'غير محدد'}<ExternalLink className='w-3 h-3' /></Link></dd></div>
            <div><dt className='text-gray-500'>المستودع</dt><dd className='font-medium text-gray-900'>{purchaseOrder.warehouse?.name || 'غير محدد'}</dd></div>
            <div><dt className='text-gray-500'>طريقة الدفع</dt><dd className='font-medium text-gray-900'>{purchaseOrder.payment_terms || 'غير محدد'}</dd></div>
            <div><dt className='text-gray-500'>ملاحظات</dt><dd className='font-medium text-gray-900'>{purchaseOrder.notes || 'لا توجد ملاحظات'}</dd></div>
            <div><dt className='text-gray-500'>العملة</dt><dd className='font-medium text-gray-900'>{purchaseOrder.currency || 'USD'}</dd></div>
          </dl>
        </section>

        <section className='bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden'>
          <div className='border-b border-gray-200 px-6 py-4 flex items-center gap-2'>
            <FileText className='w-5 h-5 text-blue-600' />
            <h2 className='text-lg font-semibold text-gray-900'>بنود أمر الشراء</h2>
          </div>
          <div className='overflow-x-auto'>
            <table className='min-w-full divide-y divide-gray-200 text-sm'>
              <thead className='bg-gray-50'>
                <tr><th className='px-6 py-3 text-right font-medium text-gray-600'>الصنف</th><th className='px-6 py-3 text-right font-medium text-gray-600'>الوصف</th><th className='px-6 py-3 text-right font-medium text-gray-600'>الكمية</th><th className='px-6 py-3 text-right font-medium text-gray-600'>سعر الوحدة</th><th className='px-6 py-3 text-right font-medium text-gray-600'>الإجمالي</th></tr>
              </thead>
              <tbody className='bg-white divide-y divide-gray-100'>
                {(purchaseOrder.items || []).length === 0 ? (
                  <tr><td colSpan={5} className='px-6 py-4 text-center text-gray-500'>لا توجد بنود مسجلة.</td></tr>
                ) : (
                  (purchaseOrder.items || []).map((item) => {
                    const qty = safeNumber(item.qty || item.quantity);
                    const unitPrice = safeNumber(item.unit_cost_usd || item.unit_price_usd);
                    const lineTotal = qty * unitPrice;
                    return (
                      <tr key={item.id || `${item.product_id}-${item.product_name}`}>
                        <td className='px-6 py-3 text-gray-900 font-medium'>{item.product?.name || item.product_name || 'غير محدد'}</td>
                        <td className='px-6 py-3 text-gray-600'>{item.description || item.product?.description || '—'}</td>
                        <td className='px-6 py-3 text-gray-600'>{qty}</td>
                        <td className='px-6 py-3 text-gray-600'>{formatCurrency(unitPrice)}</td>
                        <td className='px-6 py-3 text-gray-900 font-semibold'>{formatCurrency(lineTotal)}</td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </section>

        <section className='bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden'>
          <div className='border-b border-gray-200 px-6 py-4 flex items-center gap-2'><FileText className='w-5 h-5 text-blue-600' /><h2 className='text-lg font-semibold text-gray-900'>المدفوعات</h2></div>
          <div className='px-6 py-5 grid grid-cols-1 lg:grid-cols-4 gap-3 text-sm bg-gray-50'>
            <div><div className='text-gray-500'>عدد الدفعات</div><div className='font-medium text-gray-900'>{payments.length}</div></div>
            <div><div className='text-gray-500'>إجمالي المدفوع</div><div className='font-medium text-green-600'>{formatCurrency(totals.paid)}</div></div>
            <div><div className='text-gray-500'>الرصيد المتبقي</div><div className='font-medium text-orange-600'>{formatCurrency(totals.outstanding)}</div></div>
            <div><div className='text-gray-500'>آخر دفعة</div><div className='font-medium text-gray-900'>{payments.length ? formatDate(payments[0].paid_on) : '—'}</div></div>
          </div>
          <div className='overflow-x-auto'>
            <table className='min-w-full divide-y divide-gray-200 text-sm'>
              <thead className='bg-gray-50'><tr><th className='px-6 py-3 text-right font-medium text-gray-600'>التاريخ</th><th className='px-6 py-3 text-right font-medium text-gray-600'>المبلغ (USD)</th><th className='px-6 py-3 text-right font-medium text-gray-600'>الطريقة</th><th className='px-6 py-3 text-right font-medium text-gray-600'>المرجع</th><th className='px-6 py-3 text-right font-medium text-gray-600'>ملاحظات</th></tr></thead>
              <tbody className='bg-white divide-y divide-gray-100'>
                {payments.length === 0 ? (
                  <tr><td colSpan={5} className='px-6 py-4 text-center text-gray-500'>لا توجد دفعات مسجلة.</td></tr>
                ) : (
                  payments.map((payment) => (
                    <tr key={payment.id}><td className='px-6 py-3 text-gray-700'>{formatDate(payment.paid_on)}</td><td className='px-6 py-3 text-green-600 font-semibold'>{formatCurrency(payment.amount_usd)}</td><td className='px-6 py-3 text-gray-700'>{payment.method || 'غير محدد'}</td><td className='px-6 py-3 text-gray-600'>{payment.reference_no || '—'}</td><td className='px-6 py-3 text-gray-600'>{payment.notes || '—'}</td></tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>

        <section className='grid grid-cols-1 md:grid-cols-2 gap-4'>
          <div className='bg-white border border-gray-200 rounded-xl shadow-sm'>
            <div className='border-b border-gray-200 px-6 py-4 flex items-center gap-2'><FileText className='w-5 h-5 text-blue-600' /><h2 className='text-lg font-semibold text-gray-900'>التواريخ الرئيسية</h2></div>
            <div className='px-6 py-5 text-sm space-y-3'>
              <div className='flex justify-between text-gray-600'><span>تاريخ الإنشاء</span><span className='font-medium text-gray-900'>{formatDate(purchaseOrder.po_date)}</span></div>
              <div className='flex justify-between text-gray-600'><span>تاريخ الاستحقاق المتوقع</span><span className='font-medium text-gray-900'>{formatDate(purchaseOrder.expected_delivery_date)}</span></div>
              <div className='flex justify-between text-gray-600'><span>تاريخ الاستلام</span><span className='font-medium text-gray-900'>{formatDate(purchaseOrder.received_date)}</span></div>
              <div className='flex justify-between text-gray-600'><span>آخر تعديل</span><span className='font-medium text-gray-900'>{formatDate(purchaseOrder.updated_at)}</span></div>
            </div>
          </div>
          <div className='bg-white border border-gray-200 rounded-xl shadow-sm'>
            <div className='border-b border-gray-200 px-6 py-4 flex items-center gap-2'><FileText className='w-5 h-5 text-blue-600' /><h2 className='text-lg font-semibold text-gray-900'>السجل التدقيقي</h2></div>
            <div className='px-6 py-5 text-sm space-y-3'>
              <div><div className='text-gray-500'>أنشئ بواسطة</div><div className='font-medium text-gray-900'>{purchaseOrder.created_by || 'غير متوفر'}</div><div className='text-xs text-gray-500'>بتاريخ {formatDate(purchaseOrder.created_at)}</div></div>
              <div><div className='text-gray-500'>آخر تعديل بواسطة</div><div className='font-medium text-gray-900'>{purchaseOrder.updated_by || 'غير متوفر'}</div><div className='text-xs text-gray-500'>بتاريخ {formatDate(purchaseOrder.updated_at)}</div></div>
            </div>
          </div>
        </section>

        <section className='bg-white border border-gray-200 rounded-xl shadow-sm'>
          <div className='border-b border-gray-200 px-6 py-4 flex items-center gap-2'><FileText className='w-5 h-5 text-blue-600' /><h2 className='text-lg font-semibold text-gray-900'>المرفقات</h2></div>
          <div className='px-6 py-5 text-sm text-gray-600'>
            {Array.isArray(purchaseOrder.attachments) && purchaseOrder.attachments.length > 0 ? (
              <ul className='space-y-2'>
                {purchaseOrder.attachments.map((attachment) => (
                  <li key={attachment.id}><a href={attachment.url} target='_blank' rel='noreferrer' className='text-blue-600 hover:underline inline-flex items-center gap-2'>{attachment.name || 'مرفق'}<ExternalLink className='w-3 h-3' /></a></li>
                ))}
              </ul>
            ) : (
              <span>لا توجد مرفقات مرتبطة بهذا الأمر.</span>
            )}
          </div>
        </section>
      </div>
    </Layout>
  );
};

export default PurchaseOrderView;