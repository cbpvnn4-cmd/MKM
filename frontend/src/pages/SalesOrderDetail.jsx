import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { useNavigate, useParams, useLocation, Link } from 'react-router-dom';
import Layout from '../components/Layout';
import SalesOrderForm from '../components/SalesOrderForm';
import SalesElevatorForm from '../components/SalesElevatorForm';
import { getSalesOrder, updateSalesOrder } from '../services/api';

const formatCurrency = (value) => {
  const amount = Number(value || 0);
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number.isFinite(amount) ? amount : 0);
};

const SalesOrderDetail = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const location = useLocation();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [salesOrder, setSalesOrder] = useState(null);

  const isEdit = useMemo(() => (location.pathname || '').endsWith('/edit'), [location.pathname]);

  const orderType = useMemo(() => {
    const t = (salesOrder?.order_type || salesOrder?.orderType || '').toString().toLowerCase();
    if (t === 'elevators') return 'elevators';
    return 'items';
  }, [salesOrder]);

  useEffect(() => {
    const load = async () => {
      if (!id) return;
      try {
        setLoading(true);
        const data = await getSalesOrder(id);
        setSalesOrder(data || null);
        setError(null);
      } catch (e) {
        setError(e?.response?.data?.detail || 'تعذر تحميل أمر البيع');
        setSalesOrder(null);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id]);

  const resolveCustomerName = useCallback(() => {
    if (!salesOrder) return '';
    const c = salesOrder.customer;
    if (typeof c === 'string') return c;
    if (c && typeof c === 'object') return c.name || c.displayName || '';
    return (
      salesOrder.customer_name ||
      salesOrder.customerName ||
      salesOrder.client ||
      salesOrder.clientName ||
      (salesOrder.customer_id ? `Customer #${salesOrder.customer_id}` : '')
    );
  }, [salesOrder]);

  const getTotal = useCallback(() => {
    if (!salesOrder) return 0;
    const raw =
      salesOrder.total_amount_usd ??
      salesOrder.totalAmountUsd ??
      salesOrder.total ??
      salesOrder.amount ??
      salesOrder.totalAmount ??
      salesOrder.value ??
      0;
    const n = typeof raw === 'string' ? parseFloat(raw) : Number(raw || 0);
    return Number.isFinite(n) ? n : 0;
  }, [salesOrder]);

  const handleCancel = () => {
    if (isEdit) {
      navigate(`/sales-orders/${id}`);
    } else {
      navigate('/sales-orders');
    }
  };

  const handleSaveElevators = async (elevators) => {
    if (!salesOrder?.id) return;
    try {
      setSaving(true);
      setError(null);
      const payload = {
        ...salesOrder,
        orderType: 'elevators',
        order_type: 'elevators',
        elevators: (elevators || []).map((el) => ({
          height_meters: Number(el.height_meters ?? 0) || 0,
          sections: Number(el.sections ?? 0) || 0,
          rabat: Number(el.rabat ?? 0) || 0,
          cable_meters: Number(el.cable_meters ?? el.cable ?? 0) || 0,
          cabins: Number(el.cabins ?? 1) || 1,
          sale_price: Number(el.sale_price ?? 0) || 0,
          installation_date: el.installation_date || null,
          notes: el.notes || ''
        })),
      };
      await updateSalesOrder(salesOrder.id, payload);
      navigate(`/sales-orders/${salesOrder.id}`);
    } catch (e) {
      setError(e?.response?.data?.detail || 'فشل حفظ البيانات');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600 mx-auto mb-4"></div>
            <p className="text-xl font-semibold text-gray-800">جاري تحميل أمر البيع...</p>
          </div>
        </div>
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="text-red-600 mb-4">{error}</div>
          <button
            onClick={handleCancel}
            className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
          >
            العودة
          </button>
        </div>
      </Layout>
    );
  }

  if (!salesOrder) {
    return (
      <Layout>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="text-gray-700">لم يتم العثور على أمر البيع</div>
        </div>
      </Layout>
    );
  }

  const customerName = resolveCustomerName();
  const title = `أمر البيع ${salesOrder.soNo || salesOrder.so_no || ''}`;

  // Edit mode for items-based orders -> reuse existing form component
  if (isEdit && orderType === 'items') {
    return (
      <Layout>
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-800">تعديل {title}</h1>
          <p className="text-gray-600 mt-1">العميل: {customerName || 'غير محدد'}</p>
        </div>
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 p-6">
          <SalesOrderForm
            salesOrder={salesOrder}
            onSave={() => navigate(`/sales-orders/${salesOrder.id}`)}
            onCancel={() => navigate(`/sales-orders/${salesOrder.id}`)}
          />
        </div>
      </Layout>
    );
  }

  // Edit mode for elevators-based orders -> use elevator form for editing
  if (isEdit && orderType === 'elevators') {
    const initialElevators = Array.isArray(salesOrder.elevators)
      ? salesOrder.elevators.map((e) => ({
          height_meters: e.height_meters ?? e.heightMeters ?? 0,
          sections: e.sections ?? e.section_count ?? 0,
          rabat: e.rabat ?? e.rope_count ?? 0,
          cable_meters: e.cable_meters ?? e.cable ?? e.cable_count ?? 0,
          cabins: e.cabins ?? e.cabin_count ?? 1,
          sale_price: e.sale_price ?? e.unit_price_usd ?? 0,
          installation_date: e.installation_date || '',
          notes: e.notes || ''
        }))
      : [];

    const [elevators, setElevators] = useState(initialElevators);

    return (
      <Layout>
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-800">تعديل {title}</h1>
          <p className="text-gray-600 mt-1">العميل: {customerName || 'غير محدد'}</p>
        </div>

        {error && (
          <div className="mb-4 bg-red-50 border border-red-200 text-red-700 rounded-xl p-3">{error}</div>
        )}

        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 space-y-6">
          <SalesElevatorForm onElevatorsChange={(list) => setElevators(list)} initialElevators={initialElevators} />

          <div className="flex gap-3">
            <button
              disabled={saving}
              onClick={() => handleSaveElevators(elevators)}
              className="px-5 py-2 rounded-xl bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {saving ? 'جاري الحفظ...' : 'حفظ'}
            </button>
            <button
              disabled={saving}
              onClick={() => navigate(`/sales-orders/${salesOrder.id}`)}
              className="px-5 py-2 rounded-xl border border-gray-300 text-gray-700 hover:bg-gray-50"
            >
              إلغاء
            </button>
          </div>
        </div>
      </Layout>
    );
  }

  // View mode
  const items = Array.isArray(salesOrder.items) ? salesOrder.items : [];
  const elevators = orderType === 'elevators' && Array.isArray(salesOrder.items)
    ? salesOrder.items
    : [];
  const status = (salesOrder.status || '').toString().toUpperCase();

  // Payment summary
  const paymentSummary = salesOrder.payment_summary || salesOrder.paymentSummary || {};
  const totalPaid = paymentSummary.total_paid_usd || paymentSummary.totalPaidUsd || 0;
  const remainingBalance = paymentSummary.remaining_balance_usd || paymentSummary.remainingBalanceUsd || getTotal();
  const payments = Array.isArray(salesOrder.payments) ? salesOrder.payments : [];

  // Attachments
  const attachments = Array.isArray(salesOrder.attachments) ? salesOrder.attachments : [];

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-800">{title}</h1>
            <p className="text-gray-600 mt-1">العميل: {customerName || 'غير محدد'}</p>
          </div>
          <div className="flex gap-2">
            <Link
              to={`/invoices/new?fromSalesOrder=${salesOrder.id}`}
              className="px-4 py-2 rounded-xl bg-purple-600 text-white hover:bg-purple-700"
            >
              إنشاء فاتورة
            </Link>
            <Link
              to={`/sales-orders/${salesOrder.id}/edit`}
              className="px-4 py-2 rounded-xl border border-gray-300 text-gray-700 hover:bg-gray-50"
            >
              تعديل
            </Link>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="text-sm text-gray-500">الحالة</div>
            <div className="text-lg font-semibold">{status || 'DRAFT'}</div>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="text-sm text-gray-500">التاريخ</div>
            <div className="text-lg font-semibold">{salesOrder.date || salesOrder.so_date || '-'}</div>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="text-sm text-gray-500">إجمالي القيمة</div>
            <div className="text-lg font-bold text-blue-600">{formatCurrency(getTotal())}</div>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="text-sm text-gray-500">المتبقي</div>
            <div className="text-lg font-bold text-orange-600">{formatCurrency(remainingBalance)}</div>
          </div>
        </div>

        {/* Elevators Details - Enhanced */}
        {orderType === 'elevators' && (
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="text-2xl font-bold mb-6 text-gray-800 border-b pb-3">تفاصيل المصاعد</h3>
            {elevators.length === 0 ? (
              <div className="text-gray-600 text-center py-8">لا توجد بيانات مصاعد</div>
            ) : (
              <div className="space-y-4">
                {elevators.map((el, i) => {
                  const sections = el.sections ?? el.section_count ?? 0;
                  const rabat = el.ropes ?? el.rabat ?? el.rope_count ?? 0;
                  const cable = el.cable_meters ?? el.cable ?? el.cable_count ?? 0;
                  const cabins = el.cabins ?? el.cabin_count ?? 1;
                  const salePrice = el.unit_price_usd ?? el.sale_price ?? 0;

                  return (
                    <div key={i} className="border-2 border-gray-200 rounded-xl p-5 hover:shadow-md transition-shadow">
                      <div className="flex justify-between items-start mb-4">
                        <div className="text-xl font-bold text-gray-800">مصعد #{i + 1}</div>
                        <div className="text-2xl font-bold text-blue-600">{formatCurrency(salePrice)}</div>
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                        <div className="bg-blue-50 rounded-lg p-3">
                          <div className="text-xs text-gray-500 mb-1">السكاشن (Sections)</div>
                          <div className="text-2xl font-bold text-blue-700">{sections}</div>
                          <div className="text-xs text-gray-500">قطعة</div>
                        </div>

                        <div className="bg-green-50 rounded-lg p-3">
                          <div className="text-xs text-gray-500 mb-1">الرباط (Ropes)</div>
                          <div className="text-2xl font-bold text-green-700">{rabat}</div>
                          <div className="text-xs text-gray-500">قطعة</div>
                        </div>

                        <div className="bg-purple-50 rounded-lg p-3">
                          <div className="text-xs text-gray-500 mb-1">الكيبل (Cable)</div>
                          <div className="text-2xl font-bold text-purple-700">{cable}</div>
                          <div className="text-xs text-gray-500">متر</div>
                        </div>

                        <div className="bg-orange-50 rounded-lg p-3">
                          <div className="text-xs text-gray-500 mb-1">الكابينات (Cabins)</div>
                          <div className="text-2xl font-bold text-orange-700">{cabins}</div>
                          <div className="text-xs text-gray-500">كابينة</div>
                        </div>

                        <div className="bg-gray-50 rounded-lg p-3 col-span-2">
                          <div className="text-xs text-gray-500 mb-1">ملاحظات</div>
                          <div className="text-sm text-gray-700">{el.notes || 'لا توجد ملاحظات'}</div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Items Details */}
        {orderType === 'items' && (
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="text-2xl font-bold mb-6 text-gray-800 border-b pb-3">البنود</h3>
            {items.length === 0 ? (
              <div className="text-gray-600 text-center py-8">لا توجد بنود</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full">
                  <thead>
                    <tr className="bg-gray-50 text-gray-700 border-b-2 border-gray-200">
                      <th className="px-4 py-3 text-right font-semibold">#</th>
                      <th className="px-4 py-3 text-right font-semibold">المنتج</th>
                      <th className="px-4 py-3 text-right font-semibold">الكمية</th>
                      <th className="px-4 py-3 text-right font-semibold">سعر الوحدة</th>
                      <th className="px-4 py-3 text-right font-semibold">المجموع</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {items.map((it, idx) => {
                      const qty = Number(it.qty ?? it.quantity ?? 0) || 0;
                      const unitPrice = Number(it.unit_price_usd ?? it.unitPrice ?? 0) || 0;
                      const lineTotal = Number(it.line_total_usd ?? it.lineTotal ?? qty * unitPrice) || qty * unitPrice;
                      const name =
                        it.product?.name ||
                        it.product_name ||
                        it.product ||
                        `بند ${idx + 1}`;
                      return (
                        <tr key={idx} className="hover:bg-gray-50">
                          <td className="px-4 py-3 text-gray-600">{idx + 1}</td>
                          <td className="px-4 py-3 font-medium">{name}</td>
                          <td className="px-4 py-3">{qty}</td>
                          <td className="px-4 py-3">{formatCurrency(unitPrice)}</td>
                          <td className="px-4 py-3 font-semibold text-blue-600">{formatCurrency(lineTotal)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr className="bg-gray-50 border-t-2 border-gray-200">
                      <td colSpan="4" className="px-4 py-3 text-right font-bold">الإجمالي:</td>
                      <td className="px-4 py-3 font-bold text-blue-600 text-lg">{formatCurrency(getTotal())}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Payment Information */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="text-2xl font-bold mb-6 text-gray-800 border-b pb-3">المعلومات المالية</h3>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="bg-blue-50 rounded-lg p-4">
              <div className="text-sm text-gray-600 mb-1">إجمالي الفاتورة</div>
              <div className="text-2xl font-bold text-blue-700">{formatCurrency(getTotal())}</div>
            </div>
            <div className="bg-green-50 rounded-lg p-4">
              <div className="text-sm text-gray-600 mb-1">المدفوع</div>
              <div className="text-2xl font-bold text-green-700">{formatCurrency(totalPaid)}</div>
            </div>
            <div className="bg-orange-50 rounded-lg p-4">
              <div className="text-sm text-gray-600 mb-1">المتبقي</div>
              <div className="text-2xl font-bold text-orange-700">{formatCurrency(remainingBalance)}</div>
            </div>
          </div>

          {/* Payment History */}
          {payments.length > 0 && (
            <div>
              <h4 className="text-lg font-semibold mb-3 text-gray-700">سجل الدفعات</h4>
              <div className="overflow-x-auto">
                <table className="min-w-full">
                  <thead>
                    <tr className="bg-gray-50 text-gray-700 border-b border-gray-200">
                      <th className="px-4 py-2 text-right text-sm font-semibold">#</th>
                      <th className="px-4 py-2 text-right text-sm font-semibold">التاريخ</th>
                      <th className="px-4 py-2 text-right text-sm font-semibold">المبلغ</th>
                      <th className="px-4 py-2 text-right text-sm font-semibold">طريقة الدفع</th>
                      <th className="px-4 py-2 text-right text-sm font-semibold">ملاحظات</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {payments.map((payment, idx) => (
                      <tr key={payment.id || idx} className="hover:bg-gray-50">
                        <td className="px-4 py-2 text-sm text-gray-600">{idx + 1}</td>
                        <td className="px-4 py-2 text-sm">{payment.paid_on || payment.paidOn || '-'}</td>
                        <td className="px-4 py-2 text-sm font-semibold text-green-600">
                          {formatCurrency(payment.amount_usd || payment.amountUsd || 0)}
                        </td>
                        <td className="px-4 py-2 text-sm">{payment.method || 'نقدي'}</td>
                        <td className="px-4 py-2 text-sm text-gray-600">{payment.note || payment.notes || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {payments.length === 0 && (
            <div className="text-center py-4 text-gray-500">لا توجد دفعات مسجلة</div>
          )}
        </div>

        {/* Attachments */}
        {attachments.length > 0 && (
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="text-2xl font-bold mb-6 text-gray-800 border-b pb-3">المرفقات</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {attachments.map((att, idx) => (
                <div key={att.id || idx} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between mb-2">
                    <div className="font-semibold text-gray-800 truncate flex-1">{att.filename || att.original_filename}</div>
                    {att.download_url && (
                      <a
                        href={att.download_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:text-blue-800 ml-2"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                        </svg>
                      </a>
                    )}
                  </div>
                  <div className="text-sm text-gray-500">
                    <div>الحجم: {att.file_size ? `${(att.file_size / 1024).toFixed(2)} KB` : '-'}</div>
                    <div>النوع: {att.mime_type || '-'}</div>
                    {att.uploaded_by && <div>رفع بواسطة: {att.uploaded_by}</div>}
                  </div>
                  {att.description && (
                    <div className="mt-2 text-sm text-gray-600 border-t pt-2">{att.description}</div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-2">
          <button onClick={handleCancel} className="px-6 py-3 rounded-xl border border-gray-300 text-gray-700 hover:bg-gray-50 font-semibold">
            رجوع
          </button>
        </div>
      </div>
    </Layout>
  );
};

export default SalesOrderDetail;

