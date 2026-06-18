import React, { useState, useEffect } from 'react';

const ContainerForm = ({ containers, onChange }) => {
  const [containerList, setContainerList] = useState(containers || []);

  // أنواع الحاويات المتاحة مع أسعارها الافتراضية
  const containerTypes = [
    { type: '20ft', label: '20 قدم', defaultPrice: 1800 },
    { type: '40ft', label: '40 قدم', defaultPrice: 3000 },
    { type: '40ft-hc', label: '40 قدم - عالي', defaultPrice: 3200 },
    { type: '45ft-hc', label: '45 قدم - عالي', defaultPrice: 3500 },
    { type: 'refrigerated-20ft', label: '20 قدم - مبرد', defaultPrice: 2500 },
    { type: 'refrigerated-40ft', label: '40 قدم - مبرد', defaultPrice: 4000 }
  ];

  useEffect(() => {
    setContainerList(containers || []);
  }, [containers]);

  useEffect(() => {
    onChange(containerList);
  }, [containerList, onChange]);

  const handleContainerChange = (index, field, value) => {
    const newContainers = [...containerList];
    newContainers[index] = { ...newContainers[index], [field]: value };

    // إذا تغير نوع الحاوية، احسب السعر الافتراضي
    if (field === 'type') {
      const selectedType = containerTypes.find(t => t.type === value);
      if (selectedType && !newContainers[index].price_per_unit) {
        newContainers[index].price_per_unit = selectedType.defaultPrice;
      }
    }

    // حساب التكلفة الإجمالية
    const quantity = parseInt(newContainers[index].quantity) || 0;
    const pricePerUnit = parseFloat(newContainers[index].price_per_unit) || 0;
    newContainers[index].total_cost = quantity * pricePerUnit;

    setContainerList(newContainers);
  };

  const addContainer = () => {
    const newContainer = {
      id: Date.now(),
      type: '40ft',
      quantity: 1,
      price_per_unit: 3000,
      total_cost: 3000,
      notes: ''
    };
    setContainerList([...containerList, newContainer]);
  };

  const removeContainer = (index) => {
    const newContainers = containerList.filter((_, i) => i !== index);
    setContainerList(newContainers);
  };

  const getTotalContainerCount = () => {
    return containerList.reduce((sum, container) => sum + (parseInt(container.quantity) || 0), 0);
  };

  const getTotalShippingCost = () => {
    return containerList.reduce((sum, container) => sum + (parseFloat(container.total_cost) || 0), 0);
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button
          type="button"
          onClick={addContainer}
          className="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-semibold text-slate-600 transition-colors hover:bg-slate-100"
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v12m6-6H6" />
          </svg>
          إضافة حاوية
        </button>
      </div>

      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-50 text-slate-600">
            <tr className="text-xs font-semibold uppercase tracking-wide">
              <th className="px-3 py-3 text-right">#</th>
              <th className="px-3 py-3 text-right">نوع الحاوية</th>
              <th className="px-3 py-3 text-right">الكمية</th>
              <th className="px-3 py-3 text-right">سعر الوحدة (USD)</th>
              <th className="px-3 py-3 text-right">إجمالي التكلفة</th>
              <th className="px-3 py-3 text-right">ملاحظات</th>
              <th className="px-3 py-3 text-right">إجراءات</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-slate-700">
            {containerList.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-slate-500">
                  لا توجد حاويات مضافة بعد. استخدم زر «إضافة حاوية» لبداية القائمة.
                </td>
              </tr>
            ) : (
              containerList.map((container, index) => {
                const selectedType = containerTypes.find(t => t.type === container.type);
                return (
                  <tr key={container.id || index} className="align-top">
                    <td className="whitespace-nowrap px-3 py-3 text-slate-500">{index + 1}</td>
                    <td className="px-3 py-3">
                      <select
                        value={container.type || ''}
                        onChange={(e) => handleContainerChange(index, 'type', e.target.value)}
                        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      >
                        {containerTypes.map(type => (
                          <option key={type.type} value={type.type}>{type.label}</option>
                        ))}
                      </select>
                    </td>
                    <td className="px-3 py-3">
                      <input
                        type="number"
                        min="1"
                        step="1"
                        value={container.quantity || ''}
                        onChange={(e) => handleContainerChange(index, 'quantity', e.target.value)}
                        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        placeholder="1"
                      />
                    </td>
                    <td className="px-3 py-3">
                      <div className="space-y-1">
                        <input
                          type="number"
                          min="0"
                          step="100"
                          value={container.price_per_unit || ''}
                          onChange={(e) => handleContainerChange(index, 'price_per_unit', e.target.value)}
                          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                          placeholder="3000"
                        />
                        {selectedType && (
                          <p className="text-xs text-slate-500">السعر المرجعي: {'$' + selectedType.defaultPrice.toLocaleString()}</p>
                        )}
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-3 py-3 text-slate-900 font-semibold">
                      ${(container.total_cost || 0).toLocaleString()}
                    </td>
                    <td className="px-3 py-3">
                      <input
                        type="text"
                        value={container.notes || ''}
                        onChange={(e) => handleContainerChange(index, 'notes', e.target.value)}
                        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        placeholder="ملاحظات اختيارية"
                      />
                    </td>
                    <td className="px-3 py-3 text-left">
                      <button
                        type="button"
                        onClick={() => removeContainer(index)}
                        className="inline-flex items-center rounded-lg border border-transparent px-2 py-1 text-sm text-rose-500 transition-colors hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600"
                        aria-label="حذف الحاوية"
                      >
                        حذف
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">عدد الحاويات</p>
          <p className="mt-1 text-lg font-bold text-slate-900">{containerList.length}</p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">إجمالي الوحدات</p>
          <p className="mt-1 text-lg font-bold text-slate-900">{getTotalContainerCount()}</p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">تكلفة الشحن المقدّرة</p>
          <p className="mt-1 text-lg font-bold text-slate-900">{'$' + getTotalShippingCost().toLocaleString()}</p>
        </div>
      </div>
    </div>
  );
};

export default ContainerForm;
