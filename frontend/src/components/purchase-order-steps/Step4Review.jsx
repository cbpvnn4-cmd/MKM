import React from 'react';
import { AlertTriangle, ClipboardList, CheckCircle } from 'lucide-react';

const Step4Review = ({
  formData,
  poNumber,
  orderType,
  suppliers,
  warehouses,
  installments,
  formatCurrency,
  calculateTotalAmount,
  capitalSummary = null,
  projectedBalance = null,
  isOverBudget = false
}) => {
  const supplier = suppliers.find((s) => String(s.id) === String(formData.supplierId));
  const warehouse = warehouses.find((w) => String(w.id) === String(formData.warehouseId));
  const totalAmountValue = calculateTotalAmount();
  const availableCapital = capitalSummary?.available_capital ?? null;
  const balanceAfterOrder =
    projectedBalance ?? (availableCapital !== null ? availableCapital - totalAmountValue : null);
  const outstandingAmount = Math.max(totalAmountValue - (formData.advancePayment || 0), 0);

  const hasItems = orderType === 'items' ? formData.items.length > 0 : formData.elevators.length > 0;

  return (
    <div className="space-y-8">
      <header className="text-center space-y-3">
        <span className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-cyan-500 text-white shadow-lg mx-auto">
          <ClipboardList className="w-7 h-7" />
        </span>
        <div className="space-y-2">
          <h2 className="text-2xl font-semibold text-slate-900">المراجعة النهائية</h2>
          <p className="text-sm text-slate-500">
            تحقق من البيانات المالية واللوجستية قبل إرسال أمر الشراء للاعتماد.
          </p>
        </div>
      </header>

      <section className="rounded-2xl border border-slate-200 bg-white shadow-sm px-6 py-6 space-y-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-base font-semibold text-slate-900">معلومات الطلب</h3>
            <p className="text-xs text-slate-500">ملخص سريع لأهم تفاصيل الطلب والارتباطات.</p>
          </div>
          <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-4 py-1 text-xs font-semibold text-emerald-700">
            <CheckCircle className="w-4 h-4" />
            جاهز للحفظ
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 text-sm text-slate-600">
          <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
            <span className="block text-xs uppercase tracking-widest text-slate-500">رقم الطلب</span>
            <span className="mt-1 font-semibold text-slate-900 font-mono">{poNumber}</span>
          </div>
          <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
            <span className="block text-xs uppercase tracking-widest text-slate-500">حالة الطلب</span>
            <span className="mt-1 font-semibold text-slate-900">{formData.status}</span>
          </div>
          <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
            <span className="block text-xs uppercase tracking-widest text-slate-500">تاريخ الطلب</span>
            <span className="mt-1 font-semibold text-slate-900">{formData.orderDate || 'غير محدد'}</span>
          </div>
          <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
            <span className="block text-xs uppercase tracking-widest text-slate-500">تاريخ التسليم</span>
            <span className="mt-1 font-semibold text-slate-900">{formData.deliveryDate || 'غير محدد'}</span>
          </div>
          <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
            <span className="block text-xs uppercase tracking-widest text-slate-500">المورد</span>
            <span className="mt-1 font-semibold text-slate-900">{supplier?.name || 'غير محدد'}</span>
          </div>
          <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
            <span className="block text-xs uppercase tracking-widest text-slate-500">المستودع</span>
            <span className="mt-1 font-semibold text-slate-900">{warehouse?.name || 'غير محدد'}</span>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white shadow-sm px-6 py-6 space-y-4">
        <h3 className="text-base font-semibold text-slate-900">
          {orderType === 'items'
            ? `تفاصيل المنتجات (${formData.items.length})`
            : `تفاصيل المصاعد (${formData.elevators.length})`}
        </h3>

        {hasItems ? (
          <div className="rounded-2xl border border-slate-200 overflow-hidden">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50 text-slate-600">
                <tr>
                  <th className="px-4 py-3 text-right">البند</th>
                  <th className="px-4 py-3 text-right">{orderType === 'items' ? 'الكمية' : 'الارتفاع (م)'}</th>
                  <th className="px-4 py-3 text-right">الإجمالي</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white text-slate-700">
                {orderType === 'items'
                  ? formData.items.map((item, index) => (
                      <tr key={index}>
                        <td className="px-4 py-3">
                          <div className="font-semibold text-slate-900">{item.product}</div>
                          {item.product_sku && (
                            <div className="text-xs text-slate-500">SKU: {item.product_sku}</div>
                          )}
                        </td>
                        <td className="px-4 py-3">{item.quantity}</td>
                        <td className="px-4 py-3 font-semibold text-slate-900">${formatCurrency(item.total)}</td>
                      </tr>
                    ))
                  : formData.elevators.map((elevator, index) => (
                      <tr key={index}>
                        <td className="px-4 py-3">
                          <div className="font-semibold text-slate-900">{elevator.elevator_code}</div>
                          <div className="text-xs text-slate-500">{elevator.capacity_kg} كجم</div>
                        </td>
                        <td className="px-4 py-3">{elevator.height_meters}</td>
                        <td className="px-4 py-3 font-semibold text-slate-900">
                          ${formatCurrency(elevator.total_cost_usd)}
                        </td>
                      </tr>
                    ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-10 text-center text-sm text-slate-500">
            لم يتم إضافة أي بنود بعد.
          </div>
        )}
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white shadow-sm px-6 py-6 space-y-4">
        <h3 className="text-base font-semibold text-slate-900">الملخص المالي</h3>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-4">
            <div className="flex items-center justify-between text-slate-600">
              <span>الإجمالي</span>
              <span className="text-lg font-semibold text-slate-900">${formatCurrency(totalAmountValue)}</span>
            </div>
            <div className="mt-3 flex items-center justify-between text-slate-600">
              <span>العربون ({formData.advancePercentage}%)</span>
              <span className="text-sm font-semibold text-slate-900">
                ${formatCurrency(formData.advancePayment)}
              </span>
            </div>
            <div className="mt-3 flex items-center justify-between text-slate-600">
              <span>المتبقي</span>
              <span className="text-sm font-semibold text-slate-900">${formatCurrency(outstandingAmount)}</span>
            </div>
            <div className="mt-4 text-xs text-slate-500">
              عدد الدفعات اللاحقة: {installments.length}
            </div>
          </div>

          {capitalSummary && balanceAfterOrder !== null && (
            <div
              className={`rounded-xl border px-4 py-4 ${
                isOverBudget
                  ? 'border-rose-200 bg-rose-50 text-rose-700'
                  : 'border-emerald-200 bg-emerald-50 text-emerald-700'
              }`}
            >
              <div className="flex items-center justify-between text-sm">
                <span>الرصيد الحالي</span>
                <span className="font-semibold">
                  ${formatCurrency(availableCapital ?? 0)}
                </span>
              </div>
              <div className="mt-3 flex items-center justify-between text-sm">
                <span>الرصيد بعد تنفيذ الطلب</span>
                <span className="font-semibold text-lg">
                  ${formatCurrency(balanceAfterOrder)}
                </span>
              </div>
              {isOverBudget ? (
                <p className="mt-3 flex items-center gap-2 text-xs">
                  <AlertTriangle className="w-4 h-4" />
                  الطلب سيتجاوز رأس المال الحالي، يرجى مراجعة القيم قبل الإرسال.
                </p>
              ) : (
                <p className="mt-3 text-xs">
                  الطلب ضمن الميزانية المسموح بها ويمكن اعتماده.
                </p>
              )}
            </div>
          )}
        </div>
      </section>

      {formData.notes && (
        <section className="rounded-2xl border border-amber-200 bg-amber-50 px-6 py-5">
          <h3 className="text-base font-semibold text-amber-900 mb-2">ملاحظات إضافية</h3>
          <p className="text-sm text-amber-800 whitespace-pre-line">{formData.notes}</p>
        </section>
      )}

      <section
        className={`rounded-2xl border px-6 py-5 text-sm ${
          isOverBudget
            ? 'border-rose-200 bg-rose-50 text-rose-700'
            : 'border-slate-200 bg-slate-50 text-slate-600'
        }`}
      >
        {isOverBudget ? (
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5" />
            لا يمكن حفظ الطلب ما لم يتم تعديل الميزانية أو تخفيض قيمة البنود.
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-emerald-600" />
            كل شيء جاهز. اضغط على "حفظ الطلب" لإتمام العملية.
          </div>
        )}
      </section>
    </div>
  );
};

export default Step4Review;
