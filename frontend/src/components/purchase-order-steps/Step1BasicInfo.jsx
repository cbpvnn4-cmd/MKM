import React from 'react';
import { FileText, ClipboardList, Calendar, CheckCircle, User } from 'lucide-react';

const fieldBaseClasses =
  'w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm transition-all focus:outline-none focus:ring-2 focus:ring-cyan-200 focus:border-cyan-400';

const Step1BasicInfo = ({
  formData,
  errors,
  suppliers,
  warehouses,
  suppliersLoading,
  warehousesLoading,
  poNumber,
  handleChange,
  setFormData,
  ORDER_STATUS_OPTIONS
}) => {
  return (
    <div className="space-y-8" data-testid="step1-basic-info">
      <header className="text-center space-y-3">
        <span className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-500 to-indigo-600 text-white shadow-lg mx-auto">
          <FileText className="w-7 h-7" />
        </span>
        <div className="space-y-2">
          <h2 className="text-2xl font-semibold text-slate-900">البيانات الأساسية للطلب</h2>
          <p className="text-sm text-slate-500">عرّف الطلب بالأرقام الرئيسية، التواريخ، ومعلومات المورد قبل الانتقال إلى البنود.</p>
        </div>
      </header>

      <div className="space-y-6">
        {/* Order metadata */}
        <section className="rounded-2xl border border-slate-200 bg-white shadow-sm p-6 space-y-6">
          <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
            <ClipboardList className="w-5 h-5 text-cyan-600" />
            <h3 className="text-base font-semibold text-slate-900">معرّفات الطلب</h3>
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <div className="space-y-2">
              <label htmlFor="poNumber" className="text-xs font-semibold uppercase tracking-widest text-slate-500">رقم أمر الشراء</label>
              <div className="flex items-center gap-3">
                <input id="poNumber" type="text" value={poNumber} readOnly dir="ltr" className="flex-1 rounded-xl border border-dashed border-cyan-300 bg-cyan-50/50 px-4 py-3 font-mono text-sm font-semibold tracking-wider text-cyan-700" />
                <span className="inline-flex items-center rounded-lg bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-600">يتم توليده تلقائياً</span>
              </div>
              <p className="text-xs text-slate-400">يتم إنشاء رقم فريد عند كل عملية حفظ لضمان تتبّع الطلبات بسهولة داخل النظام.</p>
            </div>

            <div className="space-y-2">
              <label htmlFor="status" className="text-xs font-semibold uppercase tracking-widest text-slate-500">حالة الطلب</label>
              <div className="relative">
                <select id="status" name="status" value={formData.status} onChange={handleChange} className={`${fieldBaseClasses} appearance-none pr-10`}>
                  {ORDER_STATUS_OPTIONS.map((status) => (
                    <option key={status.value} value={status.value}>{status.label}</option>
                  ))}
                </select>
                <CheckCircle className="pointer-events-none absolute top-1/2 right-3 h-4 w-4 -translate-y-1/2 text-cyan-500" />
              </div>
            </div>
          </div>
        </section>

        {/* Dates */}
        <section className="rounded-2xl border border-slate-200 bg-white shadow-sm p-6 space-y-6">
          <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
            <Calendar className="w-5 h-5 text-indigo-600" />
            <h3 className="text-base font-semibold text-slate-900">التواريخ الرئيسية</h3>
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <div className="space-y-2">
              <label htmlFor="orderDate" className="text-xs font-semibold uppercase tracking-widest text-slate-500">تاريخ الطلب *</label>
              <input type="date" id="orderDate" name="orderDate" value={formData.orderDate || ''} onChange={handleChange} className={fieldBaseClasses} />
            </div>
            <div className="space-y-2">
              <label htmlFor="deliveryDate" className="text-xs font-semibold uppercase tracking-widest text-slate-500">تاريخ التسليم</label>
              <input type="date" id="deliveryDate" name="deliveryDate" value={formData.deliveryDate || ''} onChange={handleChange} className={fieldBaseClasses} />
            </div>
          </div>
        </section>

        {/* Supplier and warehouse */}
        <section className="rounded-2xl border border-slate-200 bg-white shadow-sm p-6 space-y-6">
          <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
            <User className="w-5 h-5 text-emerald-600" />
            <h3 className="text-base font-semibold text-slate-900">المورد والمستودع</h3>
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <div className="space-y-2">
              <label htmlFor="supplierId" className="text-xs font-semibold uppercase tracking-widest text-slate-500">المورد *</label>
              <select id="supplierId" name="supplierId" value={formData.supplierId} onChange={handleChange} disabled={suppliersLoading} className={`${fieldBaseClasses} ${errors.supplierId ? 'border-rose-300 bg-rose-50/60 focus:ring-rose-100 focus:border-rose-400' : ''} ${suppliersLoading ? 'opacity-70 cursor-not-allowed' : ''}`}>
                <option value="">{suppliersLoading ? 'جاري تحميل الموردين...' : 'اختر المورد'}</option>
                {suppliers.map((supplier) => (
                  <option key={supplier.id} value={supplier.id}>{supplier.name}</option>
                ))}
              </select>
              {errors.supplierId && (<p className="text-xs font-medium text-rose-600">{errors.supplierId}</p>)}
            </div>

            <div className="space-y-2">
              <label htmlFor="warehouseId" className="text-xs font-semibold uppercase tracking-widest text-slate-500">المستودع الرئيسي *</label>
              <select id="warehouseId" name="warehouseId" value={formData.warehouseId} onChange={(e) => {
                const selectedWarehouse = warehouses.find((w) => w.id === parseInt(e.target.value, 10));
                setFormData((prev) => ({ ...prev, warehouseId: e.target.value, warehouseName: selectedWarehouse?.name || '' }));
              }} disabled={warehousesLoading} className={`${fieldBaseClasses} ${errors.warehouseId ? 'border-rose-300 bg-rose-50/60 focus:ring-rose-100 focus:border-rose-400' : ''} ${warehousesLoading ? 'opacity-70 cursor-not-allowed' : ''}`}>
                <option value="">{warehousesLoading ? 'جاري تحميل المستودعات...' : 'اختر المستودع'}</option>
                {warehouses.map((warehouse) => (
                  <option key={warehouse.id} value={warehouse.id}>{warehouse.name} - {warehouse.location}</option>
                ))}
              </select>
              {errors.warehouseId && (<p className="text-xs font-medium text-rose-600">{errors.warehouseId}</p>)}
            </div>
          </div>
        </section>

        {/* Notes */}
        <section className="rounded-2xl border border-slate-200 bg-white shadow-sm p-6 space-y-3">
          <div className="flex items-center gap-3">
            <ClipboardList className="w-5 h-5 text-amber-600" />
            <h3 className="text-base font-semibold text-slate-900">ملاحظات إضافية</h3>
          </div>
          <label htmlFor="notes" className="sr-only">ملاحظات إضافية</label>
          <textarea id="notes" name="notes" value={formData.notes} onChange={handleChange} rows={4} className={`${fieldBaseClasses} resize-none`} placeholder="أضف أي تعليمات أو تفاصيل خاصة يتم الرجوع إليها لاحقاً." />
        </section>
      </div>
    </div>
  );
};

export default Step1BasicInfo;
