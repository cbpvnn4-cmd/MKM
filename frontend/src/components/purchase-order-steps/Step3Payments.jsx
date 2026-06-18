import React from 'react';
import {
  DollarSign,
  Calendar,
  Plus,
  Trash2,
  CheckCircle,
  AlertTriangle,
  Loader2,
  Package
} from 'lucide-react';
import ContainerForm from '../ContainerForm';

const cardBase =
  'rounded-2xl border border-slate-200 bg-white shadow-sm';

const inputClasses =
  'w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs font-medium text-slate-700 focus:border-cyan-400 focus:outline-none focus:ring-1 focus:ring-cyan-200';

const Step3Payments = ({
  formData,
  installments,
  handleChange,
  addInstallment,
  removeInstallment,
  updateInstallment,
  formatCurrency,
  setFormData,
  capitalSummary = null,
  capitalSummaryLoading = false,
  capitalSummaryError = null,
  totalAmount = undefined,
  projectedBalance = null,
  isOverBudget = false,
  errors = {}
}) => {
  const totalOrderAmount = totalAmount ?? formData.totalAmount ?? 0;
  const totalRemaining = Math.max(totalOrderAmount - (formData.advancePayment || 0), 0);
  const installmentsProgress = installments.reduce(
    (sum, installment) => sum + (parseFloat(installment.percentage) || 0),
    0
  );
  const availableCapital = capitalSummary?.available_capital ?? null;
  const balanceAfterOrder = projectedBalance ?? (availableCapital !== null ? availableCapital - totalOrderAmount : null);
  const showCapitalSummary = capitalSummary || capitalSummaryError || capitalSummaryLoading;
  const validationErrors = errors || {};

  return (
    <div className="space-y-8" data-testid="step3-payments">
      <header className="text-center space-y-3">
        <span className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-500 text-white shadow-lg mx-auto">
          <DollarSign className="w-7 h-7" />
        </span>
        <div className="space-y-2">
          <h2 className="text-2xl font-semibold text-slate-900">إدارة الدفعات والميزانية</h2>
          <p className="text-sm text-slate-500">
            وزّع قيم الدفعات عبر الجدول الزمني وتابع رأس المال المتاح قبل اعتماد الطلب.
          </p>
        </div>
      </header>

      {validationErrors.totalAmount && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">
          {validationErrors.totalAmount}
        </div>
      )}
      {validationErrors.installments && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">
          {validationErrors.installments}
        </div>
      )}

      <section className={`${cardBase} px-6 py-6`}>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
            <p className="text-xs uppercase tracking-widest text-slate-500">إجمالي الطلب</p>
            <p className="mt-2 text-xl font-semibold text-slate-900">${formatCurrency(totalOrderAmount)}</p>
            <p className="mt-1 text-[11px] text-slate-500">
              يشمل جميع البنود أو تكلفة المصاعد المضافة في الخطوة السابقة.
            </p>
          </div>
          <div className="rounded-2xl border border-cyan-200 bg-cyan-50 px-4 py-4">
            <label htmlFor="advancePercentage" className="text-xs uppercase tracking-widest text-cyan-600">
              نسبة العربون %
            </label>
            <input
              type="number"
              id="advancePercentage"
              name="advancePercentage"
              min="0"
              max="100"
              value={formData.advancePercentage}
              onChange={handleChange}
              className="mt-3 w-full rounded-xl border border-cyan-200 bg-white px-3 py-2 text-base font-semibold text-cyan-700 focus:border-cyan-400 focus:outline-none"
            />
            <p className="mt-1 text-[11px] text-cyan-600">
              يتم تحديث قيمة العربون والمدفوعات تلقائياً عند التعديل.
            </p>
            {validationErrors.advancePercentage && (
              <p className="mt-2 text-[11px] font-medium text-rose-600">{validationErrors.advancePercentage}</p>
            )}
          </div>
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-4">
            <p className="text-xs uppercase tracking-widest text-emerald-600">قيمة العربون</p>
            <p className="mt-2 text-xl font-semibold text-emerald-800">${formatCurrency(formData.advancePayment)}</p>
            <p className="mt-1 text-[11px] text-emerald-600">
              الدفعة الأولى التي يتم تحصيلها مباشرة من العميل.
            </p>
          </div>
          <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-4">
            <p className="text-xs uppercase tracking-widest text-amber-600">المتبقي بعد العربون</p>
            <p className="mt-2 text-xl font-semibold text-amber-800">${formatCurrency(totalRemaining)}</p>
            <p className="mt-1 text-[11px] text-amber-600">
              سيتم توزيعه على الدفعات اللاحقة حسب الجدول أدناه.
            </p>
          </div>
        </div>

        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-slate-200 text-slate-600">
              <Calendar className="w-4 h-4" />
            </span>
            إجمالي توزيع الدفعات: {installmentsProgress.toFixed(1)}%
          </div>
          <div className="w-full rounded-full bg-slate-100 h-2 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${
                installmentsProgress > 100
                  ? 'bg-rose-500'
                  : installmentsProgress === 100
                    ? 'bg-emerald-500'
                    : 'bg-amber-500'
              }`}
              style={{ width: `${Math.min(installmentsProgress, 120)}%` }}
            />
          </div>
        </div>
      </section>

      {showCapitalSummary && (
        <section className={`${cardBase} px-6 py-5`}>
          <div className="flex items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-semibold text-slate-900">رأس المال المتاح</h3>
              <p className="text-xs text-slate-500">تحقق من أثر الطلب على الرصيد قبل المتابعة.</p>
            </div>
            <DollarSign className="w-5 h-5 text-slate-500" />
          </div>

          <div className="mt-4">
            {capitalSummaryLoading ? (
              <div className="flex items-center gap-2 text-sm text-slate-500">
                <Loader2 className="w-4 h-4 animate-spin" />
                جاري تحميل بيانات رأس المال...
              </div>
            ) : capitalSummaryError ? (
              <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                تعذر استرجاع بيانات رأس المال. تأكد من الاتصال ثم أعد المحاولة.
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                  <p className="text-xs uppercase tracking-widest text-slate-500">الرصيد الحالي</p>
                  <p className="mt-1 text-lg font-semibold text-slate-900">
                    {availableCapital !== null ? `$${formatCurrency(availableCapital)}` : 'غير متاح'}
                  </p>
                </div>
                <div
                  className={`rounded-xl border px-4 py-3 ${
                    isOverBudget
                      ? 'border-rose-200 bg-rose-50 text-rose-700'
                      : 'border-emerald-200 bg-emerald-50 text-emerald-700'
                  }`}
                >
                  <p className="text-xs uppercase tracking-widest">
                    الرصيد بعد التنفيذ
                  </p>
                  <p className="mt-1 text-lg font-semibold">
                    {balanceAfterOrder !== null ? `$${formatCurrency(balanceAfterOrder)}` : 'غير متاح'}
                  </p>
                  {isOverBudget ? (
                    <p className="mt-2 flex items-center gap-2 text-[11px]">
                      <AlertTriangle className="w-4 h-4" />
                      الطلب سيتجاوز رأس المال الحالي. يرجى تأجيل الإرسال أو زيادة الرصيد.
                    </p>
                  ) : (
                    <p className="mt-2 text-[11px]">
                      الرصيد يبقى ضمن الحدود المسموح بها ويمكن اعتماد الطلب.
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>
        </section>
      )}

      <section className={`${cardBase} px-6 py-6 space-y-5`}>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-base font-semibold text-slate-900">جدول الدفعات</h3>
            <p className="text-xs text-slate-500">يمكن تعديل الأسماء والنسب والتواريخ لكل دفعة على حدة.</p>
          </div>
          <button
            type="button"
            onClick={addInstallment}
            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-500 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:shadow-md"
          >
            <Plus className="w-4 h-4" />
            إضافة دفعة
          </button>
        </div>

        <div className="overflow-x-auto rounded-2xl border border-slate-200">
          <table className="min-w-full divide-y divide-slate-200 text-xs">
            <thead className="bg-slate-50 text-slate-600 font-semibold">
              <tr>
                <th className="px-3 py-3 text-right">#</th>
                <th className="px-3 py-3 text-right">اسم الدفعة</th>
                <th className="px-3 py-3 text-right">النسبة %</th>
                <th className="px-3 py-3 text-right">القيمة</th>
                <th className="px-3 py-3 text-right hidden sm:table-cell">المسدّد</th>
                <th className="px-3 py-3 text-right">تاريخ الاستحقاق</th>
                <th className="px-3 py-3 text-center">إجراء</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {installments.map((installment, index) => {
                const amount =
                  (parseFloat(installment.percentage) || 0) * (totalOrderAmount / 100);
                const paymentProgress =
                  amount > 0 ? Math.min((installment.paidAmount || 0) / amount, 1) * 100 : 0;

                return (
                  <tr key={installment.id} className="align-middle">
                    <td className="px-3 py-3 text-sm font-semibold text-slate-500">{index + 1}</td>
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={installment.name}
                          onChange={(e) => updateInstallment(installment.id, 'name', e.target.value)}
                          className={inputClasses}
                          placeholder="مثال: دفعة التسليم"
                        />
                        {installment.type === 'advance' && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">
                            <CheckCircle className="w-3 h-3" />
                            عربون
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-3 py-3">
                      <input
                        type="number"
                        min="0"
                        max="100"
                        step="0.1"
                        value={installment.percentage}
                        onChange={(e) => updateInstallment(installment.id, 'percentage', e.target.value)}
                        className={`${inputClasses} w-20 text-center`}
                      />
                    </td>
                    <td className="px-3 py-3 text-slate-900 font-semibold">${formatCurrency(amount)}</td>
                    <td className="px-3 py-3 hidden sm:table-cell">
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          min="0"
                          max={amount}
                          step="0.01"
                          value={installment.paidAmount || 0}
                          onChange={(e) =>
                            updateInstallment(
                              installment.id,
                              'paidAmount',
                              parseFloat(e.target.value) || 0
                            )
                          }
                          className={`${inputClasses} w-24 text-center`}
                        />
                        <span
                          className={`text-[11px] font-semibold ${
                            paymentProgress === 100 ? 'text-emerald-600' : 'text-slate-400'
                          }`}
                        >
                          {paymentProgress.toFixed(0)}%
                        </span>
                      </div>
                    </td>
                    <td className="px-3 py-3">
                      <input
                        type="date"
                        value={installment.dueDate}
                        onChange={(e) => updateInstallment(installment.id, 'dueDate', e.target.value)}
                        className={inputClasses}
                      />
                    </td>
                    <td className="px-3 py-3 text-center">
                      {installment.type !== 'advance' && (
                        <button
                          type="button"
                          onClick={() => removeInstallment(installment.id)}
                          className="inline-flex items-center justify-center rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-600 transition hover:bg-rose-100"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {installmentsProgress !== 100 && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
            إجمالي نسب الدفعات يساوي {installmentsProgress.toFixed(1)}%. احرص على أن تساوي 100% قبل الحفظ.
          </div>
        )}
      </section>

      <section className={`${cardBase} overflow-hidden`}>
        <div className="flex items-center gap-3 border-b border-slate-100 bg-slate-50 px-6 py-4">
          <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-500 text-white">
            <Package className="w-5 h-5" />
          </span>
          <div>
            <h3 className="text-base font-semibold text-slate-900">الشحن والحاويات</h3>
            <p className="text-xs text-slate-500">
              أدر تفاصيل الحاويات إن وجدت لتبقى كافة تكاليف الطلب في مكان واحد.
            </p>
          </div>
        </div>
        <div className="px-6 py-5">
          <ContainerForm
            containers={formData.containers}
            onChange={(containers) => setFormData((prev) => ({ ...prev, containers }))}
          />
        </div>
      </section>
    </div>
  );
};

export default Step3Payments;
