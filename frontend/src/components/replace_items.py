# -*- coding: utf-8 -*-
from pathlib import Path

path = Path("PurchaseOrderForm.jsx")
text = path.read_text(encoding="utf-8", errors="ignore")
start = text.index("      {orderType === 'items' && (")
end = text.find("\n      )}", start) + len("\n      )}")
replacement = """      {orderType === 'items' && (
        <FormSection
          title=\"خطوط المشتريات\"
          description=\"أضف الأصناف والكميات وسعر الوحدة لضمان دقة التكلفة.\"
          action={(
            <button
              type=\"button\"
              onClick={addItem}
              className=\"inline-flex items-center gap-2 rounded-lg border border-indigo-200 px-3 py-1.5 text-sm font-semibold text-indigo-600 transition-colors hover:bg-indigo-50\"
            >
              <svg className=\"h-4 w-4\" fill=\"none\" stroke=\"currentColor\" viewBox=\"0 0 24 24\">
                <path strokeLinecap=\"round\" strokeLinejoin=\"round\" strokeWidth={2} d=\"M12 6v12m6-6H6\" />
              </svg>
              <span>إضافة صنف</span>
            </button>
          )}
        >
          <div className=\"space-y-4\">
            <div className=\"rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-600\">
              <span className=\"font-medium text-slate-700\">تنبيه:</span> تأكد من توزيع الأصناف على المستودعات الصحيحة ومراجعة الرصيد المتاح قبل الحفظ.
            </div>
            <div className=\"overflow-x-auto rounded-xl border border-slate-200 bg-white\">
              <table className=\"min-w-full divide-y divide-slate-200 text-sm\">
                <thead className=\"bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-600\">
                  <tr>
                    <th className=\"px-3 py-3\">#</th>
                    <th className=\"px-3 py-3\">الصنف *</th>
                    <th className=\"px-3 py-3\">الكمية *</th>
                    <th className=\"px-3 py-3\">سعر الوحدة *</th>
                    <th className=\"px-3 py-3\">المستودع *</th>
                    <th className=\"px-3 py-3 text-right\">الإجمالي</th>
                    <th className=\"px-3 py-3\"></th>
                  </tr>
                </thead>
                <tbody className=\"divide-y divide-slate-100\">
                  {formData.items.length === 0 ? (
                    <tr>
                      <td colSpan={7} className=\"px-4 py-8 text-center text-slate-500\">
                        لا توجد أصناف مضافة بعد. اضغط زر \"إضافة صنف\" لبدء القائمة.
                      </td>
                    </tr>
                  ) : (
                    formData.items.map((item, index) => {
                      const rowError = itemErrors[index] if index < len(itemErrors) else {}
                      const productMatch = next((product for product in products if product.name == item.product), None)
                      return f"__PLACEHOLDER__"
                    })
                  )}
                </tbody>
              </table>
            </div>
            <div className=\"flex justify-end\">
              <div className=\"inline-flex items-center gap-3 rounded-lg border border-indigo-100 bg-indigo-50 px-4 py-3 text-sm font-medium text-indigo-700\">
                <span>إجمالي المشتريات:</span>
                <span className=\"text-base font-semibold text-indigo-700\">{formatCurrency(calculateTotal())}</span>
              </div>
            </div>
            {typeof errors.items === 'string' && (
              <p className=\"text-xs font-medium text-rose-600\">{errors.items}</p>
            )}
          </div>
        </FormSection>
      )}
"""

raise SystemExit('placeholder not replaced')
