import React from 'react';
import { Package, Building2, Plus, Trash2, ClipboardList } from 'lucide-react';
import ElevatorForm from '../ElevatorForm';

const baseInputClasses =
  'w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition-all focus:outline-none focus:ring-2 focus:ring-cyan-200 focus:border-cyan-400 placeholder:text-slate-400';

const Step2Items = ({
  orderType,
  formData,
  errors,
  products,
  warehouses,
  warehousesLoading,
  handleOrderTypeChange,
  addItem,
  removeItem,
  handleItemChange,
  handleElevatorsChange,
  formatCurrency,
  calculateTotalAmount
}) => {
  const itemRowErrors = Array.isArray(errors.items) ? errors.items : [];
  const hasItems = formData.items.length > 0;
  const totalAmount = calculateTotalAmount(formData, orderType);

  return (
    <div className="space-y-8" data-testid="step2-items">
      <header className="text-center space-y-3">
        <span className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-purple-500 to-indigo-600 text-white shadow-lg mx-auto">
          <Package className="w-7 h-7" />
        </span>
        <div className="space-y-2">
          <h2 className="text-2xl font-semibold text-slate-900">بنود الطلب والمنتجات</h2>
          <p className="text-sm text-slate-500">
            أضف المنتجات أو المصاعد مع تفاصيل الأسعار والمستودعات لتكوين الطلب بدقة.
          </p>
        </div>
      </header>

      <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-4 border-b border-slate-100 px-6 py-5 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3">
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
              <ClipboardList className="w-5 h-5" />
            </span>
            <div>
              <h3 className="text-base font-semibold text-slate-900">نوع أمر الشراء</h3>
              <p className="text-sm text-slate-500">اختر بين إضافة منتجات مفردة أو مصاعد مخصصة.</p>
            </div>
          </div>

          <div className="flex items-center gap-2 rounded-full bg-slate-100 p-1">
            <button
              type="button"
              onClick={() => handleOrderTypeChange('items')}
              className={`rounded-full px-4 py-2 text-sm font-semibold transition-all ${
                orderType === 'items'
                  ? 'bg-white shadow-sm text-slate-900'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              المنتجات
            </button>
            <button
              type="button"
              onClick={() => handleOrderTypeChange('elevators')}
              className={`rounded-full px-4 py-2 text-sm font-semibold transition-all ${
                orderType === 'elevators'
                  ? 'bg-white shadow-sm text-slate-900'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              المصاعد
            </button>
          </div>
        </div>

        {orderType === 'items' ? (
          <div className="space-y-6 px-6 py-6">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-sm uppercase tracking-widest text-slate-500">إجمالي البنود</p>
                <h4 className="text-xl font-semibold text-slate-900">
                  {formData.items.length} منتج
                  <span className="mr-3 text-base font-medium text-slate-500">
                    | الإجمالي {formatCurrency(totalAmount)} $
                  </span>
                </h4>
              </div>
              <button
                type="button"
                onClick={addItem}
                className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 px-4 py-2 text-sm font-semibold text-white shadow-md transition hover:shadow-lg"
              >
                <Plus className="w-4 h-4" />
                إضافة بند جديد
              </button>
            </div>

            {hasItems ? (
              <div className="overflow-x-auto rounded-2xl border border-slate-200">
                <table className="min-w-full divide-y divide-slate-200 text-xs">
                  <thead className="bg-slate-50 text-slate-600 font-semibold">
                    <tr>
                      <th className="px-4 py-3 text-right">المنتج</th>
                      <th className="px-4 py-3 text-right hidden xl:table-cell">SKU</th>
                      <th className="px-4 py-3 text-right hidden lg:table-cell">التصنيف</th>
                      <th className="px-4 py-3 text-right">الكمية</th>
                      <th className="px-4 py-3 text-right">سعر الوحدة</th>
                      <th className="px-4 py-3 text-right hidden sm:table-cell">المستودع</th>
                      <th className="px-4 py-3 text-right">الإجمالي</th>
                      <th className="px-4 py-3 text-center">إجراء</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {formData.items.map((item, index) => {
                      const rowError = itemRowErrors[index] || {};
                      const datalistId = `products-${index}`;

                      return (
                        <tr key={index} className="align-top">
                          <td className="px-4 py-3">
                            <div className="space-y-2">
                              <input
                                type="text"
                                list={datalistId}
                                value={item.product}
                                onChange={(e) => handleItemChange(index, 'product', e.target.value)}
                                className={`${baseInputClasses} ${rowError.product ? 'border-rose-300 bg-rose-50/60' : ''}`}
                                placeholder="اسم المنتج"
                              />
                              <datalist id={datalistId}>
                                {products.map((product) => (
                                  <option key={product.id} value={product.name} />
                                ))}
                              </datalist>
                              {rowError.product && (
                                <p className="text-[11px] font-medium text-rose-600">{rowError.product}</p>
                              )}
                              <textarea
                                rows={2}
                                value={item.note || ''}
                                onChange={(e) => handleItemChange(index, 'note', e.target.value)}
                                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-[11px] text-slate-600 focus:border-cyan-300 focus:outline-none"
                                placeholder="ملاحظات إضافية أو تعليمات خاصة"
                              />
                            </div>
                          </td>
                          <td className="px-4 py-3 hidden xl:table-cell">
                            <input
                              type="text"
                              value={item.product_sku || ''}
                              onChange={(e) => handleItemChange(index, 'product_sku', e.target.value)}
                              className={baseInputClasses}
                              placeholder="SKU"
                            />
                          </td>
                          <td className="px-4 py-3 hidden lg:table-cell">
                            <input
                              type="text"
                              value={item.product_category || ''}
                              onChange={(e) => handleItemChange(index, 'product_category', e.target.value)}
                              className={baseInputClasses}
                              placeholder="تصنيف المنتج"
                            />
                          </td>
                          <td className="px-4 py-3">
                            <input
                              type="number"
                              min="0"
                              value={item.quantity}
                              onChange={(e) => handleItemChange(index, 'quantity', e.target.value)}
                              className={`${baseInputClasses} text-center ${rowError.quantity ? 'border-rose-300 bg-rose-50/60' : ''}`}
                            />
                            {rowError.quantity && (
                              <p className="mt-1 text-[11px] font-medium text-rose-600">{rowError.quantity}</p>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              value={item.unitPrice}
                              onChange={(e) => handleItemChange(index, 'unitPrice', e.target.value)}
                              className={`${baseInputClasses} text-center ${rowError.unitPrice ? 'border-rose-300 bg-rose-50/60' : ''}`}
                            />
                            {rowError.unitPrice && (
                              <p className="mt-1 text-[11px] font-medium text-rose-600">{rowError.unitPrice}</p>
                            )}
                          </td>
                          <td className="px-4 py-3 hidden sm:table-cell">
                            <select
                              value={item.warehouse}
                              onChange={(e) => handleItemChange(index, 'warehouse', e.target.value)}
                              disabled={warehousesLoading}
                              className={`${baseInputClasses} ${rowError.warehouse ? 'border-rose-300 bg-rose-50/60' : ''} ${warehousesLoading ? 'opacity-60 cursor-not-allowed' : ''}`}
                            >
                              <option value="">اختر المستودع</option>
                              {warehouses.map((w) => (
                                <option key={w.id} value={w.name}>
                                  {w.name}
                                </option>
                              ))}
                            </select>
                            {rowError.warehouse && (
                              <p className="mt-1 text-[11px] font-medium text-rose-600">{rowError.warehouse}</p>
                            )}
                          </td>
                          <td className="px-4 py-3 text-left">
                            <div className="rounded-xl bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700">
                              ${formatCurrency(item.total)}
                            </div>
                          </td>
                          <td className="px-2 py-3 text-center">
                            <button
                              type="button"
                              onClick={() => removeItem(index)}
                              className="inline-flex items-center justify-center rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-600 transition hover:bg-rose-100"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50/60 py-20 text-center">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full border border-slate-300 bg-white text-slate-400">
                  <Package className="w-8 h-8" />
                </div>
                <h3 className="mt-4 text-lg font-semibold text-slate-700">لا توجد بنود حتى الآن</h3>
                <p className="mt-2 text-sm text-slate-500">
                  استخدم زر "إضافة بند جديد" لإدراج المنتجات وتحديد كمياتها وأسعارها.
                </p>
              </div>
            )}

            {typeof errors.items === 'string' && (
              <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-600">
                {errors.items}
              </div>
            )}

            {hasItems && (
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-6 py-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-xs uppercase tracking-widest text-emerald-600">ملخص البنود</p>
                    <h4 className="text-lg font-semibold text-emerald-800">
                      {formData.items.length} منتج / إجمالي ${formatCurrency(totalAmount)}
                    </h4>
                  </div>
                  <p className="text-xs text-emerald-700">
                    يمكن تعديل الأسعار أو الكميات في أي وقت، وسيتم تحديث الإجمالي مباشرة.
                  </p>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="px-6 py-6">
            <div className="mb-6 rounded-2xl border border-purple-200 bg-purple-50 px-5 py-4">
              <div className="flex items-center gap-3">
                <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-purple-500 text-white">
                  <Building2 className="w-5 h-5" />
                </span>
                <div>
                  <h3 className="text-base font-semibold text-purple-900">نموذج المصاعد</h3>
                  <p className="text-xs text-purple-700">
                    أضف المواصفات الفنية للمصعد، وسنقوم بحساب التكلفة تلقائياً بناءً على الإعدادات.
                  </p>
                </div>
              </div>
            </div>
            <ElevatorForm elevators={formData.elevators} onChange={handleElevatorsChange} />
          </div>
        )}
      </section>
    </div>
  );
};

export default Step2Items;
