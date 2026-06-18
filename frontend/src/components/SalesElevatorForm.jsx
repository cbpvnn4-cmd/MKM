import React, { useState, useEffect, useMemo } from 'react';

const DEFAULT_COMPONENT_STOCK = {
  sections: 0,
  rabat: 0,
  cable: 0,
  cabin: 0
};

const SalesElevatorForm = ({
  onElevatorsChange,
  initialElevators = [],
  componentStock = DEFAULT_COMPONENT_STOCK
}) => {
  const createBlankElevator = () => ({
    id: Date.now(),
    height_meters: '',
    sections: 0,
    rabat: 0,
    cable_meters: 0,
    cabins: 1,
    sale_price: 0,
    installation_date: '',
    notes: '',
    manualSections: false,
    manualRabat: false,
    manualCable: false
  });

  const [elevatorList, setElevatorList] = useState(
    initialElevators.length > 0
      ? initialElevators.map((el) => ({
          ...createBlankElevator(),
          ...el,
          manualSections: Boolean(el.manualSections),
          manualRabat: Boolean(el.manualRabat),
          manualCable: Boolean(el.manualCable)
        }))
      : [createBlankElevator()]
  );
  const [isCalculating, setIsCalculating] = useState(false);
  const [fetchError, setFetchError] = useState('');

  // Synchronize with parent passed initial values when they change (e.g., editing existing order)
  useEffect(() => {
    if (initialElevators.length > 0) {
      setElevatorList(
        initialElevators.map((el) => ({
          ...createBlankElevator(),
          ...el,
          manualSections: Boolean(el.manualSections),
          manualRabat: Boolean(el.manualRabat),
          manualCable: Boolean(el.manualCable)
        }))
      );
    }
  }, [initialElevators]);

  const totals = useMemo(() => {
    return elevatorList.reduce(
      (acc, elevator) => {
        acc.sections += Number(elevator.sections) || 0;
        acc.rabat += Number(elevator.rabat) || 0;
        acc.cable += Number(elevator.cable_meters) || 0;
        acc.cabin += Number(elevator.cabins) || 0;
        return acc;
      },
      { sections: 0, rabat: 0, cable: 0, cabin: 0 }
    );
  }, [elevatorList]);

  const deficits = useMemo(() => {
    return {
      sections: Math.max(0, totals.sections - (componentStock.sections || 0)),
      rabat: Math.max(0, totals.rabat - (componentStock.rabat || 0)),
      cable: Math.max(0, totals.cable - (componentStock.cable || 0)),
      cabin: Math.max(0, totals.cabin - (componentStock.cabin || 0))
    };
  }, [totals, componentStock]);

  useEffect(() => {
    if (onElevatorsChange) {
      onElevatorsChange(elevatorList, { totals, deficits });
    }
  }, [elevatorList, totals, deficits, onElevatorsChange]);

  const calculateComponents = async (height, cabins = 1) => {
    if (!height || Number(height) <= 0) {
      return {
        section_count: 0,
        rope_count: 0,
        cable_count: 0
      };
    }

    try {
      setIsCalculating(true);
      setFetchError('');
      const params = new URLSearchParams({
        height_meters: Number(height),
        cabin_count: Number(cabins || 1)
      });
      const token = localStorage.getItem('access_token') || sessionStorage.getItem('access_token');
      const response = await fetch(`/api/purchases/elevators/calculate?${params.toString()}` , {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      if (!response.ok) {
        throw new Error('فشل في حساب المكونات تلقائياً');
      }
      const data = await response.json();
      return {
        section_count: Number(data.section_count) || 0,
        rope_count: Number(data.rope_count) || 0,
        cable_count: Number(data.cable_count) || 0
      };
    } catch (err) {
      console.error('Automatic calculation failed:', err);
      setFetchError('تعذر الحصول على الحساب التلقائي، سيتم استخدام المعادلة الافتراضية.');
      // Fallback calculation (نفس منطق صفحة المشتريات)
      const sectionLength = 1.5;
      const baseRabatPerSection = 2;
      const baseCablePerSection = 1;
      const cabinMultiplier = Number(cabins) === 2 ? 1.8 : 1.0;
      const sectionCount = Math.ceil(Number(height) / sectionLength);
      return {
        section_count: sectionCount,
        rope_count: Math.round(sectionCount * baseRabatPerSection * cabinMultiplier),
        cable_count: Math.round(sectionCount * baseCablePerSection * cabinMultiplier)
      };
    } finally {
      setIsCalculating(false);
    }
  };

  const applyAutoComponents = async (index) => {
    const elevator = elevatorList[index];
    const components = await calculateComponents(elevator.height_meters, elevator.cabins);

    setElevatorList((prev) => {
      const list = [...prev];
      const updated = { ...list[index] };
      if (!updated.manualSections) {
        updated.sections = components.section_count;
      }
      if (!updated.manualRabat) {
        updated.rabat = components.rope_count;
      }
      if (!updated.manualCable) {
        updated.cable_meters = components.cable_count;
      }
      list[index] = updated;
      return list;
    });
  };

  const handleFieldChange = (index, field, value) => {
    setElevatorList((prev) => {
      const list = [...prev];
      const elevator = { ...list[index] };

      switch (field) {
        case 'height_meters':
          elevator.height_meters = value;
          elevator.manualSections = false;
          elevator.manualRabat = false;
          elevator.manualCable = false;
          list[index] = elevator;
          return list;
        case 'cabins':
          elevator.cabins = Number(value) || 1;
          elevator.manualSections = false;
          elevator.manualRabat = false;
          elevator.manualCable = false;
          list[index] = elevator;
          return list;
        case 'sections':
          elevator.sections = Number(value) || 0;
          elevator.manualSections = true;
          break;
        case 'rabat':
          elevator.rabat = Number(value) || 0;
          elevator.manualRabat = true;
          break;
        case 'cable_meters':
          elevator.cable_meters = Number(value) || 0;
          elevator.manualCable = true;
          break;
        case 'sale_price':
          elevator.sale_price = Number(value) || 0;
          break;
        default:
          elevator[field] = value;
      }

      list[index] = elevator;
      return list;
    });
  };

  const addElevator = () => {
    setElevatorList((prev) => [...prev, createBlankElevator()]);
  };

  const removeElevator = (index) => {
    setElevatorList((prev) => {
      if (prev.length === 1) return prev;
      return prev.filter((_, i) => i !== index);
    });
  };

  const sectionDeficit = deficits.sections > 0;
  const rabatDeficit = deficits.rabat > 0;
  const cableDeficit = deficits.cable > 0;
  const cabinDeficit = deficits.cabin > 0;

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex justify-between items-center mb-4">
        <div>
          <h3 className="text-xl font-bold text-gray-800">إعداد مصاعد للبيع</h3>
          <p className="text-sm text-gray-600 mt-1">
            حدد ارتفاع المصعد ليتم حساب السكاشن والرباط والكيبل تلقائياً مع إمكانية التعديل اليدوي.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={addElevator}
            className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-600 text-white font-semibold rounded-xl hover:from-purple-600 hover:to-pink-700 transition-all shadow-md"
          >
            <svg className="w-5 h-5 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v12m6-6H6" />
            </svg>
            إضافة مصعد
          </button>
        </div>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
        <div>
          <p className="text-blue-700 font-semibold">المتوفر من السكاشن</p>
          <p className={`text-lg font-bold ${sectionDeficit ? 'text-red-600' : 'text-blue-900'}`}>
            {componentStock.sections ?? 0} قطعة
          </p>
        </div>
        <div>
          <p className="text-blue-700 font-semibold">المتوفر من الرباط</p>
          <p className={`text-lg font-bold ${rabatDeficit ? 'text-red-600' : 'text-blue-900'}`}>
            {componentStock.rabat ?? 0} رباط
          </p>
        </div>
        <div>
          <p className="text-blue-700 font-semibold">المتوفر من الكيبل</p>
          <p className={`text-lg font-bold ${cableDeficit ? 'text-red-600' : 'text-blue-900'}`}>
            {componentStock.cable ?? 0} وحدة
          </p>
        </div>
        <div>
          <p className="text-blue-700 font-semibold">المتوفر من الكابينات</p>
          <p className={`text-lg font-bold ${cabinDeficit ? 'text-red-600' : 'text-blue-900'}`}>
            {componentStock.cabin ?? 0} كابينة
          </p>
        </div>
      </div>

      {(sectionDeficit || rabatDeficit || cableDeficit || cabinDeficit) && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-700 font-semibold">
          ❌ لا يتوفر مخزون كافٍ من المكونات التالية:
          <ul className="list-disc pr-6 mt-2 text-sm font-normal">
            {sectionDeficit && (
              <li>
                السكاشن: المتاح {componentStock.sections ?? 0}، المطلوب {totals.sections} (العجز {deficits.sections})
              </li>
            )}
            {rabatDeficit && (
              <li>
                الرباط: المتاح {componentStock.rabat ?? 0}، المطلوب {totals.rabat} (العجز {deficits.rabat})
              </li>
            )}
            {cableDeficit && (
              <li>
                الكيبل: المتاح {componentStock.cable ?? 0}، المطلوب {totals.cable} (العجز {deficits.cable})
              </li>
            )}
            {cabinDeficit && (
              <li>
                الكابينات: المتاح {componentStock.cabin ?? 0}، المطلوب {totals.cabin} (العجز {deficits.cabin})
              </li>
            )}
          </ul>
        </div>
      )}

      {fetchError && (
        <div className="bg-amber-50 border border-amber-200 text-amber-800 rounded-xl p-4 text-sm">
          {fetchError}
        </div>
      )}

      {elevatorList.map((elevator, index) => (
        <div key={elevator.id} className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 space-y-5">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-lg font-semibold text-gray-800">مصعد #{index + 1}</h4>
              <p className="text-sm text-gray-500 mt-1">
                قم بتحديد الارتفاع لتحديث المكونات ثم عدّل القيم يدويًا إذا لزم الأمر.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => applyAutoComponents(index)}
                className="text-blue-600 hover:text-blue-800 text-sm font-medium"
              >
                إعادة الحساب من الارتفاع
              </button>
              {elevatorList.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeElevator(index)}
                  className="text-red-600 hover:bg-red-50 px-3 py-1 rounded-lg transition-colors"
                >
                  حذف
                </button>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                ارتفاع المصعد (متر) *
              </label>
              <input
                type="number"
                min="0"
                step="0.1"
                value={elevator.height_meters}
                onChange={(e) => handleFieldChange(index, 'height_meters', e.target.value)}
                onBlur={() => applyAutoComponents(index)}
                className="w-full px-4 py-2 border-2 border-blue-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="مثال: 60"
              />
            </div>

            <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                عدد الكابينات *
              </label>
              <select
                value={elevator.cabins}
                onChange={(e) => handleFieldChange(index, 'cabins', e.target.value)}
                onBlur={() => applyAutoComponents(index)}
                className="w-full px-4 py-2 border-2 border-blue-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="1">1 كابينة</option>
                <option value="2">2 كابينة (دبل)</option>
              </select>
            </div>

            <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                السعر (USD)
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={elevator.sale_price}
                onChange={(e) => handleFieldChange(index, 'sale_price', e.target.value)}
                className="w-full px-4 py-2 border-2 border-blue-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="0.00"
              />
            </div>

            <div className="bg-white rounded-lg p-4 border border-gray-200">
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                عدد السكاشن (قطعة)
              </label>
              <input
                type="number"
                min="0"
                step="1"
                value={elevator.sections}
                onChange={(e) => handleFieldChange(index, 'sections', e.target.value)}
                className="w-full px-4 py-2 border-2 border-purple-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
              />
            </div>

            <div className="bg-white rounded-lg p-4 border border-gray-200">
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                عدد الرباط (قطعة)
              </label>
              <input
                type="number"
                min="0"
                step="1"
                value={elevator.rabat}
                onChange={(e) => handleFieldChange(index, 'rabat', e.target.value)}
                className="w-full px-4 py-2 border-2 border-purple-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
              />
            </div>

            <div className="bg-white rounded-lg p-4 border border-gray-200">
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                عدد وحدات الكيبل
              </label>
              <input
                type="number"
                min="0"
                step="1"
                value={elevator.cable_meters}
                onChange={(e) => handleFieldChange(index, 'cable_meters', e.target.value)}
                className="w-full px-4 py-2 border-2 border-purple-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                تاريخ التركيب المتوقع
              </label>
              <input
                type="date"
                value={elevator.installation_date}
                onChange={(e) => handleFieldChange(index, 'installation_date', e.target.value)}
                className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                ملاحظات
              </label>
              <textarea
                value={elevator.notes}
                onChange={(e) => handleFieldChange(index, 'notes', e.target.value)}
                rows={3}
                className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="أي تفاصيل إضافية عن المصعد أو التركيب..."
              />
            </div>
          </div>
        </div>
      ))}

      <div className="bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-2xl p-6 shadow-lg">
        <h4 className="text-lg font-semibold mb-4">ملخص المكونات المطلوبة</h4>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>
            <p className="text-emerald-100">إجمالي السكاشن</p>
            <p className="text-2xl font-bold">{totals.sections}</p>
          </div>
          <div>
            <p className="text-emerald-100">إجمالي الرباط</p>
            <p className="text-2xl font-bold">{totals.rabat}</p>
          </div>
          <div>
            <p className="text-emerald-100">إجمالي وحدات الكيبل</p>
            <p className="text-2xl font-bold">{totals.cable}</p>
          </div>
          <div>
            <p className="text-emerald-100">إجمالي الكابينات</p>
            <p className="text-2xl font-bold">{totals.cabin}</p>
          </div>
        </div>
        {isCalculating && (
          <div className="mt-4 text-sm text-emerald-100">
            جارِ تحديث المكونات بناءً على الارتفاع والكابينات...
          </div>
        )}
      </div>
    </div>
  );
};

export default SalesElevatorForm;
