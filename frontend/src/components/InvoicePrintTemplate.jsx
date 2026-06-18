import React, { forwardRef } from 'react';

const formatCurrency = (value) => {
  const amount = Number(value);
  if (!Number.isFinite(amount)) {
    return '$0.00';
  }
  return amount.toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};

const formatDate = (value) => {
  if (!value) {
    return '—';
  }
  try {
    return new Date(value).toLocaleDateString('en-US', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
  } catch (err) {
    return '—';
  }
};

const formatDateTime = (value) => {
  if (!value) {
    return '—';
  }
  try {
    return new Date(value).toLocaleString('en-US', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch (err) {
    return '—';
  }
};

const toNumberOrNull = (value) => {
  if (value === null || value === undefined || value === '') {
    return null;
  }
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
};

const formatNumber = (value, fractionDigits = 0) => {
  const numeric = toNumberOrNull(value);
  if (numeric === null) {
    return '—';
  }
  return numeric.toLocaleString('en-US', {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  });
};

const valueOrDash = (value) => {
  if (value === null || value === undefined) {
    return '—';
  }
  const trimmed = String(value).trim();
  return trimmed.length ? trimmed : '—';
};

const statusLabels = {
  DRAFT: 'مسودة',
  ISSUED: 'صادرة',
  PARTIALLY_PAID: 'مدفوعة جزئياً',
  PAID: 'مدفوعة',
  OVERDUE: 'متأخرة',
  VOID: 'ملغاة',
};

const statusColors = {
  DRAFT: 'bg-gray-100 text-gray-700',
  ISSUED: 'bg-blue-100 text-blue-700',
  PARTIALLY_PAID: 'bg-amber-100 text-amber-700',
  PAID: 'bg-green-100 text-green-700',
  OVERDUE: 'bg-red-100 text-red-700',
  VOID: 'bg-gray-100 text-gray-500',
};

const summarizeLineItem = (item, index, productsMap, options = {}) => {
  const productId = item?.product_id ?? item?.productId ?? item?.product?.id ?? null;
  const product = productId ? (productsMap?.[productId] || item?.product || null) : item?.product || null;

  const fallbackLabel = options.fallbackLabel || 'بند';
  const productName = product?.name;
  const description = item?.description || item?.item_description || productName || `${fallbackLabel} ${index + 1}`;
  const productSku = product?.sku || item?.sku || item?.product_sku || null;

  const quantity = toNumberOrNull(item?.qty ?? item?.quantity) ?? 1;
  const unitPriceCandidate = toNumberOrNull(item?.unitPrice ?? item?.unit_price_usd ?? item?.sale_price ?? item?.price);
  const lineTotalCandidate = toNumberOrNull(item?.lineTotal ?? item?.line_total_usd ?? item?.total ?? item?.amount);

  let unitPrice = unitPriceCandidate;
  let lineTotal = lineTotalCandidate;
  if (unitPrice === null && lineTotal !== null) {
    unitPrice = lineTotal / quantity;
  }
  if (lineTotal === null && unitPrice !== null) {
    lineTotal = unitPrice * quantity;
  }
  if (unitPrice === null) {
    unitPrice = 0;
  }
  if (lineTotal === null) {
    lineTotal = unitPrice * quantity;
  }

  const sections = toNumberOrNull(item?.sections ?? item?.section_count ?? item?.sectionCount);
  const ropes = toNumberOrNull(item?.ropes ?? item?.rabat ?? item?.rope_count ?? item?.ropeCount);
  const cableMeters = toNumberOrNull(
    item?.cable_meters ?? item?.cableMeters ?? item?.cable_length ?? item?.cable_length_meters ?? item?.cable_count,
  );
  const cabins = toNumberOrNull(item?.cabins ?? item?.cabin_count ?? item?.cabinsCount);
  const heightMeters = toNumberOrNull(item?.height_meters ?? item?.heightMeters) ?? cableMeters;
  const notes = item?.notes ?? item?.note ?? '';

  return {
    id: item?.id ?? `line-${index}`,
    description,
    quantity,
    unitPrice,
    lineTotal,
    productId,
    productName: productName || description,
    productSku,
    sections,
    ropes,
    cableMeters,
    cabins,
    heightMeters,
    notes: notes ? String(notes).trim() : '',
    source: item,
  };
};

const InvoicePrintTemplate = forwardRef(({
  invoice,
  payments = [],
  salesOrder = null,
  productsById = {},
}, ref) => {
  if (!invoice) {
    return null;
  }

  const runtimeSalesOrder = salesOrder || invoice.salesOrder || invoice.sales_order || null;

  const orderTypeRaw = (runtimeSalesOrder?.order_type || runtimeSalesOrder?.orderType || invoice?.order_type || invoice?.orderType || '')
    .toString()
    .toLowerCase();
  const isElevatorOrder = orderTypeRaw === 'elevators';

  const invoiceItemsRaw = Array.isArray(invoice.items) ? invoice.items : [];
  const salesOrderItems = Array.isArray(runtimeSalesOrder?.items) ? runtimeSalesOrder.items : [];
  const lineSource = invoiceItemsRaw.length ? invoiceItemsRaw : salesOrderItems;

  const productsMap = productsById || {};
  const lineSummaries = lineSource.map((item, index) =>
    summarizeLineItem(item, index, productsMap, { fallbackLabel: isElevatorOrder ? 'مصعد' : 'بند' }),
  );

  const subtotal = lineSummaries.reduce((sum, item) => sum + (item.lineTotal || 0), 0);
  const taxPct = toNumberOrNull(invoice.tax_pct ?? invoice.tax_percent ?? invoice.tax);
  let taxAmount = toNumberOrNull(invoice.tax_amount_usd ?? invoice.tax_amount);
  if ((taxAmount === null || taxAmount === 0) && taxPct) {
    taxAmount = subtotal * (taxPct / 100);
  }
  if (taxAmount === null) {
    taxAmount = 0;
  }

  const totalFromInvoice = toNumberOrNull(invoice.total_usd ?? invoice.total);
  const total = totalFromInvoice !== null ? totalFromInvoice : subtotal + taxAmount;
  const paid = toNumberOrNull(
    invoice.paid_amount_usd ??
    invoice.paid_amount ??
    invoice.paid ??
    invoice.amount_paid,
  ) ?? 0;
  const balance = toNumberOrNull(invoice.remaining_amount ?? invoice.balance) ?? (total - paid);

  const invoiceNumber = valueOrDash(invoice.invoice_no ?? invoice.invoiceNo);
  const issueDate = formatDate(
    invoice.issue_date
    ?? invoice.issueDate
    ?? runtimeSalesOrder?.so_date
    ?? runtimeSalesOrder?.date,
  );
  const dueDate = formatDate(invoice.due_date ?? invoice.dueDate);
  const statusLabel = statusLabels[invoice.status] || invoice.status || 'مسودة';
  const statusColor = statusColors[invoice.status] || 'bg-gray-100 text-gray-700';
  const salesperson = valueOrDash(invoice.salesperson_name ?? invoice.created_by_name ?? invoice.created_by);

  const customerName = valueOrDash(invoice.customer ?? invoice.customer_name ?? invoice.customerName);
  const customerPhone = valueOrDash(invoice.customer_phone ?? invoice.customerPhone);
  const customerEmail = valueOrDash(invoice.customer_email ?? invoice.customerEmail);
  const projectName = valueOrDash(invoice.project ?? invoice.project_name ?? invoice.projectName);

  const orderNumber = valueOrDash(invoice.sourceSalesOrderNo ?? runtimeSalesOrder?.so_no ?? runtimeSalesOrder?.soNo);
  const orderId = runtimeSalesOrder?.id ?? invoice.sales_order_id ?? invoice.salesOrderId ?? null;

  const notes = valueOrDash(
    invoice.notes
    ?? invoice.note
    ?? invoice.internal_notes
    ?? runtimeSalesOrder?.notes
    ?? runtimeSalesOrder?.note,
  );

  const percentLabel = taxPct !== null
    ? ` (${Number(taxPct).toLocaleString('en-US', { maximumFractionDigits: taxPct % 1 === 0 ? 0 : 2 })}%)`
    : '';

  return (
    <div
      ref={ref}
      className="bg-white text-gray-900 max-w-[210mm] mx-auto p-8"
      style={{ minHeight: '297mm', fontFamily: 'system-ui, -apple-system, sans-serif' }}
      dir="rtl"
    >
      {/* Page Header */}
      <div className="flex justify-between items-start mb-8 pb-6 border-b-2 border-gray-200">
        <div>
          <h1 className="text-3xl font-black text-gray-900 mb-1">شركة سند للمصاعد</h1>
          <p className="text-sm text-gray-600">SANAD ELEVATORS COMPANY</p>
          <p className="text-sm text-gray-500 mt-2">بغداد - العراق</p>
        </div>
        <div className="text-left">
          <p className="text-gray-500 text-xs uppercase tracking-wide mb-1">INVOICE</p>
          <p className="text-3xl font-black text-gray-900">{invoiceNumber}</p>
        </div>
      </div>

      {/* Details Section */}
      <div className="grid grid-cols-2 gap-8 mb-8 pb-8 border-b border-gray-200">
        {/* Client Information - LEFT SIDE */}
        <div>
          <h3 className="text-lg font-bold text-gray-900 mb-4">معلومات العميل</h3>
          <div className="space-y-3 text-sm">
            <div className="grid grid-cols-2 gap-2">
              <span className="text-gray-500">اسم العميل</span>
              <span className="text-gray-900 font-medium">{customerName}</span>
            </div>
            {projectName !== '—' && (
              <div className="grid grid-cols-2 gap-2">
                <span className="text-gray-500">اسم المشروع</span>
                <span className="text-gray-900 font-medium">{projectName}</span>
              </div>
            )}
            {customerPhone !== '—' && (
              <div className="grid grid-cols-2 gap-2">
                <span className="text-gray-500">رقم الهاتف</span>
                <span className="text-blue-600 font-medium">{customerPhone}</span>
              </div>
            )}
            {customerEmail !== '—' && (
              <div className="grid grid-cols-2 gap-2">
                <span className="text-gray-500">عنوان البريد الإلكتروني</span>
                <span className="text-blue-600 font-medium text-xs">{customerEmail}</span>
              </div>
            )}
          </div>
        </div>

        {/* Invoice Details - RIGHT SIDE */}
        <div>
          <h3 className="text-lg font-bold text-gray-900 mb-4">تفاصيل الفاتورة</h3>
          <div className="space-y-3 text-sm">
            <div className="grid grid-cols-2 gap-2">
              <span className="text-gray-500">تاريخ الإصدار</span>
              <span className="text-gray-900 font-medium">{issueDate}</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <span className="text-gray-500">تاريخ الاستحقاق</span>
              <span className="text-gray-900 font-medium">{dueDate}</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <span className="text-gray-500">حالة الفاتورة</span>
              <span className={`inline-block px-2 py-1 text-xs font-semibold rounded-full ${statusColor}`}>
                {statusLabel}
              </span>
            </div>
            {(orderNumber !== '—' || orderId !== null) && (
              <div className="grid grid-cols-2 gap-2">
                <span className="text-gray-500">رقم أمر البيع</span>
                <span className="text-blue-600 font-medium">{orderNumber !== '—' ? orderNumber : `#${orderId}`}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Items Table */}
      <div className="mb-8">
        <h3 className="text-lg font-bold text-gray-900 mb-4">البنود</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-sm text-gray-500 border-b-2 border-gray-200">
              <tr>
                <th className="font-semibold p-3 text-center w-12">رقم</th>
                <th className="font-semibold p-3 text-right">الوصف</th>
                <th className="font-semibold p-3 text-right w-20">الكود</th>
                <th className="font-semibold p-3 text-right w-20">الكمية</th>
                <th className="font-semibold p-3 text-right w-28">سعر الوحدة</th>
                <th className="font-semibold p-3 text-right w-32">المجموع</th>
              </tr>
            </thead>
            <tbody>
              {lineSummaries.map((item, idx) => (
                <React.Fragment key={item.id}>
                  <tr className="border-b border-gray-200">
                    <td className="p-3 text-center">{idx + 1}</td>
                    <td className="p-3 text-gray-900 font-medium">{item.productName}</td>
                    <td className="p-3">{item.productSku || '—'}</td>
                    <td className="p-3 text-right" dir="ltr">{formatNumber(item.quantity)}</td>
                    <td className="p-3 text-right" dir="ltr">{formatCurrency(item.unitPrice)}</td>
                    <td className="p-3 text-right font-semibold text-gray-900" dir="ltr">{formatCurrency(item.lineTotal)}</td>
                  </tr>

                  {/* Elevator Details Row */}
                  {isElevatorOrder && (item.heightMeters !== null || item.sections !== null || item.cabins !== null || item.cableMeters !== null || item.ropes !== null || item.notes) && (
                    <tr className="bg-gray-50">
                      <td colSpan={6} className="p-4">
                        <div className="p-4 bg-white rounded-lg border border-gray-200">
                          <h4 className="text-sm font-bold text-gray-900 mb-3">تفاصيل بند المصعد ({item.productSku || `بند ${idx + 1}`})</h4>
                          <div className="grid grid-cols-5 gap-4 text-sm">
                            {item.heightMeters !== null && (
                              <div>
                                <p className="text-gray-500">الارتفاع</p>
                                <p className="font-medium text-gray-900">{formatNumber(item.heightMeters, 2)}م</p>
                              </div>
                            )}
                            {item.sections !== null && (
                              <div>
                                <p className="text-gray-500">المقاطع</p>
                                <p className="font-medium text-gray-900">{formatNumber(item.sections)}</p>
                              </div>
                            )}
                            {item.cabins !== null && (
                              <div>
                                <p className="text-gray-500">الكبائن</p>
                                <p className="font-medium text-gray-900">{formatNumber(item.cabins)}</p>
                              </div>
                            )}
                            {item.cableMeters !== null && (
                              <div>
                                <p className="text-gray-500">طول الكابل</p>
                                <p className="font-medium text-gray-900">{formatNumber(item.cableMeters)}م</p>
                              </div>
                            )}
                            {item.ropes !== null && (
                              <div>
                                <p className="text-gray-500">الرباط</p>
                                <p className="font-medium text-gray-900">{formatNumber(item.ropes)}</p>
                              </div>
                            )}
                          </div>
                          {item.notes && (
                            <div className="mt-3">
                              <p className="text-gray-500 text-sm">ملاحظات</p>
                              <p className="font-medium text-gray-900 text-sm">{item.notes}</p>
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}

              {lineSummaries.length === 0 && (
                <tr>
                  <td className="p-8 text-center text-gray-400" colSpan={6}>
                    لا توجد بنود في هذه الفاتورة
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Financial Summary and Notes */}
      <div className="flex justify-between items-start gap-8 mb-8">
        {/* Notes */}
        <div className="w-1/2">
          {notes !== '—' && (
            <>
              <h3 className="text-lg font-bold text-gray-900 mb-2">ملاحظات</h3>
              <p className="text-sm text-gray-600 whitespace-pre-wrap">{notes}</p>
            </>
          )}
        </div>

        {/* Summary */}
        <div className="w-1/3">
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">الإجمالي الفرعي</span>
              <span className="font-medium text-gray-900" dir="ltr">{formatCurrency(subtotal)}</span>
            </div>
            {taxAmount > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">الضريبة{percentLabel}</span>
                <span className="font-medium text-gray-900" dir="ltr">{formatCurrency(taxAmount)}</span>
              </div>
            )}
            <div className="flex justify-between text-base font-bold text-gray-900 pt-2 border-t-2 border-dashed border-gray-300">
              <span>الإجمالي الكلي</span>
              <span dir="ltr">{formatCurrency(total)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">المبلغ المدفوع</span>
              <span className="font-medium text-gray-900" dir="ltr">{formatCurrency(paid)}</span>
            </div>
            <div className="flex justify-between text-lg font-bold text-blue-600 p-3 bg-blue-50 rounded-lg">
              <span>المبلغ المتبقي</span>
              <span dir="ltr">{formatCurrency(balance)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Payment History */}
      {payments.length > 0 && (
        <div className="mb-8">
          <h3 className="text-lg font-bold text-gray-900 mb-4">سجل المدفوعات</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-sm text-gray-500 border-b-2 border-gray-200">
                <tr>
                  <th className="font-semibold p-3 text-right">تاريخ الدفع</th>
                  <th className="font-semibold p-3 text-right">الطريقة</th>
                  <th className="font-semibold p-3 text-right">المبلغ</th>
                  <th className="font-semibold p-3 text-right">ملاحظات</th>
                </tr>
              </thead>
              <tbody>
                {payments.map((payment, index) => (
                  <tr key={payment.id ?? index} className="border-b border-gray-200">
                    <td className="p-3">{formatDate(payment.paid_on)}</td>
                    <td className="p-3">{valueOrDash(payment.method)}</td>
                    <td className="p-3 text-right" dir="ltr">{formatCurrency(payment.amount_usd ?? payment.amount)}</td>
                    <td className="p-3">{valueOrDash(payment.note)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="mt-12 pt-8 border-t border-gray-200">
        <div className="grid grid-cols-3 gap-8 text-sm">
          <div>
            <h4 className="font-bold mb-2 text-gray-900">الشروط والأحكام</h4>
            <p className="text-gray-600">الدفع خلال {dueDate !== '—' ? 'التاريخ المحدد' : '30 يوماً'}. الدفعات المتأخرة تخضع لرسوم بنسبة 5%.</p>
          </div>
          <div>
            <h4 className="font-bold mb-2 text-gray-900">المعلومات البنكية</h4>
            <p className="text-gray-600">البنك: البنك التجاري العراقي</p>
            <p className="text-gray-600">رقم الحساب: XXXX-XXXX-XXXX</p>
          </div>
          <div>
            <h4 className="font-bold mb-2 text-gray-900">معلومات الاتصال</h4>
            <p className="text-gray-600" dir="ltr">+964 XXX XXX XXXX</p>
            <p className="text-gray-600">info@sanadelevators.com</p>
            <p className="text-gray-600">www.sanadelevators.com</p>
          </div>
        </div>
        <p className="text-center text-xs text-gray-400 mt-8">
          تاريخ إنشاء الفاتورة: {formatDateTime(new Date())}
        </p>
      </div>
    </div>
  );
});

InvoicePrintTemplate.displayName = 'InvoicePrintTemplate';

export default InvoicePrintTemplate;
