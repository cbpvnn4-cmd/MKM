import React, { useState, useEffect } from 'react';

const toEnglishDigits = (input) => {
  if (input === null || input === undefined) return input;
  return input.toString().replace(/[٠-٩]/g, (digit) => {
    const map = { '٠': '0', '١': '1', '٢': '2', '٣': '3', '٤': '4', '٥': '5', '٦': '6', '٧': '7', '٨': '8', '٩': '9' };
    return map[digit] ?? digit;
  });
};

const parseIntegerInput = (value) => {
  if (value === '' || value === null || value === undefined) return '';
  const normalized = toEnglishDigits(value);
  const parsed = parseInt(normalized, 10);
  return Number.isNaN(parsed) ? '' : parsed;
};

const parseFloatInput = (value) => {
  if (value === '' || value === null || value === undefined) return '';
  const normalized = toEnglishDigits(value);
  const parsed = parseFloat(normalized);
  return Number.isNaN(parsed) ? '' : parsed;
};

const ElevatorForm = ({ elevators, onChange }) => {
  const [elevatorList, setElevatorList] = useState(elevators || []);
  const [calculations, setCalculations] = useState({});

  // نماذج المصاعد المتاحة
  const elevatorModels = [
    'OTIS 2000',
    'Schindler 3300',
    'KONE MonoSpace',
    'ThyssenKrupp Evolution',
    'Mitsubishi NEXIEZ',
    'Toshiba SPACEL',
    'Custom Model'
  ];

  useEffect(() => {
    if (!Array.isArray(elevators)) {
      if (elevatorList.length !== 0) setElevatorList([]);
      return;
    }

    // إذا كان نفس المرجع فلا تحديث
    if (elevators === elevatorList) return;

    const normalized = elevators.map((elevator) => ({
      ...elevator,
      section_count: elevator.section_count ?? elevator.sectionCount ?? '',
      rope_count: elevator.rope_count ?? elevator.ropeCount ?? '',
      cable_length_meters: elevator.cable_length_meters ?? elevator.cableLengthMeters ?? elevator.cable_count ?? elevator.cableCount ?? '',
      manual_section_edit: elevator.manual_section_edit ?? false,
      manual_rope_edit: elevator.manual_rope_edit ?? false,
      manual_cable_edit: elevator.manual_cable_edit ?? false
    }));

    // تجنّب إعادة التهيئة إن لم تتغير البيانات فعلياً
    try {
      const a = JSON.stringify(elevatorList);
      const b = JSON.stringify(normalized);
      if (a === b) return;
    } catch (_) { /* ignore stringify issues */ }

    setElevatorList(normalized);
  }, [elevators]);

  useEffect(() => {
    onChange(elevatorList);
  }, [elevatorList, onChange]);

  // حساب المكونات تلقائياً
  const calculateComponents = async (heightMeters, cabinCount) => {
    try {
      const token = localStorage.getItem('access_token') || sessionStorage.getItem('access_token');
      const response = await fetch(`/api/purchases/elevators/calculate?height_meters=${heightMeters}&cabin_count=${cabinCount}` , {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      if (response.ok) {
        const data = await response.json();
        return data;
      }
    } catch (error) {
      console.error('Error calculating elevator components:', error);
    }

    // حساب افتراضي في حالة فشل الـ API
    const sectionCount = Math.ceil(heightMeters / 1.5);
    const ropeCount = sectionCount * 2 * (cabinCount === 2 ? 1.8 : 1);
    const cableCount = sectionCount * 1 * (cabinCount === 2 ? 1.8 : 1);

    return {
      section_count: sectionCount,
      rope_count: Math.round(ropeCount),
      cable_count: Math.round(cableCount),
      height_meters: heightMeters,
      cabin_count: cabinCount
    };
  };

  const handleElevatorChange = async (index, field, value) => {
    const newElevators = [...elevatorList];

    let processedValue = value;
    if (typeof processedValue === 'string') {
      processedValue = toEnglishDigits(processedValue);
    }

    if (field === 'height_meters' || field === 'cable_length_meters' || field === 'unit_price_usd') {
      const parsedValue = parseFloatInput(processedValue);
      newElevators[index] = { ...newElevators[index], [field]: parsedValue };
    } else if (field === 'section_count' || field === 'cabin_count' || field === 'manufacture_year' || field === 'rope_count') {
      const parsedValue = parseIntegerInput(processedValue);
      newElevators[index] = { ...newElevators[index], [field]: parsedValue };
    } else {
      newElevators[index] = { ...newElevators[index], [field]: processedValue };
    }

    // إذا تغير الارتفاع، احسب عدد السكاشن تلقائياً (لكن يمكن تعديله يدوياً لاحقاً)
    if (field === 'height_meters' && newElevators[index].height_meters && newElevators[index].height_meters > 0) {
      // حساب عدد السكاشن تلقائياً (كل 1.5 متر = سكشن واحد)
      const calculatedSections = Math.ceil(parseFloat(newElevators[index].height_meters) / 1.5);

      // فقط احسب تلقائياً إذا لم يكن المستخدم قد عدّل القيمة يدوياً
      if (!newElevators[index].manual_section_edit) {
        newElevators[index].section_count = calculatedSections;
      }

      setCalculations({...calculations, [index]: { suggested_sections: calculatedSections }});
    }

    // إذا عدّل المستخدم عدد السكاشن يدوياً، ضع علامة
    if (field === 'section_count') {
      newElevators[index].manual_section_edit = true;
    }

    if (field === 'rope_count') {
      newElevators[index].manual_rope_edit = true;
    }

    if (field === 'cable_length_meters') {
      newElevators[index].manual_cable_edit = true;
    }

    // تحديث التكلفة عند تغيير سعر الوحدة
    if (field === 'unit_price_usd') {
      newElevators[index].total_cost_usd = processedValue;
    }

    // حساب المكونات (عدد السكاشن والرباط) تلقائياً عند تغيير الارتفاع أو عدد الكبائن
    if ((field === 'height_meters' || field === 'cabin_count') && newElevators[index].height_meters) {
      const heightValue = parseFloat(newElevators[index].height_meters) || 0;
      const cabinCountValue = parseInt(newElevators[index].cabin_count) || 1;

      if (heightValue > 0) {
        const componentData = await calculateComponents(heightValue, cabinCountValue);

        if (!newElevators[index].manual_section_edit && componentData.section_count) {
          newElevators[index].section_count = componentData.section_count;
        }
        if (!newElevators[index].manual_rope_edit && componentData.rope_count) {
          newElevators[index].rope_count = componentData.rope_count;
        }
        if (!newElevators[index].manual_cable_edit && componentData.cable_count) {
          newElevators[index].cable_length_meters = componentData.cable_count;
        }

        setCalculations({
          ...calculations,
          [index]: {
            suggested_sections: componentData.section_count,
            suggested_ropes: componentData.rope_count
          }
        });
      }
    }

    setElevatorList(newElevators);
  };

  const addElevator = () => {
    const newElevator = {
      elevator_code: `ELV-${Date.now()}`,
      height_meters: '',
      model_type: '',
      manufacture_year: new Date().getFullYear(),
      cabin_count: 1,
      unit_price_usd: '',
      notes: '',
      section_count: '',
      rope_count: '',
      cable_length_meters: '',
      total_cost_usd: 0,
      manual_section_edit: false,
      manual_rope_edit: false,
      manual_cable_edit: false
    };
    setElevatorList([...elevatorList, newElevator]);
  };

  const removeElevator = (index) => {
    const newElevators = elevatorList.filter((_, i) => i !== index);
    setElevatorList(newElevators);

    const newCalculations = {...calculations};
    delete newCalculations[index];
    setCalculations(newCalculations);
  };

  const getTotalElevatorsValue = () => {
    return elevatorList.reduce((sum, elevator) => sum + (parseFloat(elevator.total_cost_usd) || 0), 0);
  };

  const totalHeightMeters = elevatorList.reduce((sum, elevator) => sum + (parseFloat(elevator.height_meters) || 0), 0);
  const totalSections = elevatorList.reduce((sum, elevator) => sum + (parseInt(elevator.section_count) || 0), 0);
  const totalRopes = elevatorList.reduce((sum, elevator) => sum + (parseInt(elevator.rope_count) || 0), 0);
  const totalCableMeters = elevatorList.reduce((sum, elevator) => sum + (parseFloat(elevator.cable_length_meters) || 0), 0);
  const totalCostUsd = getTotalElevatorsValue();

  return (
    <div className="space-y-4">
      {/* Header with Add Button */}
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-bold text-slate-900">قائمة المصاعد ({elevatorList.length})</h3>
        <button
          type="button"
          onClick={addElevator}
          className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-600 text-white font-semibold rounded-xl hover:from-purple-600 hover:to-pink-700 shadow-md transition-all"
        >
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v12m6-6H6" />
          </svg>
          إضافة مصعد
        </button>
      </div>

      {/* Elevators List - Card Based View */}
      <div className="space-y-4">
        {elevatorList.length === 0 ? (
          <div className="text-center py-16 bg-gradient-to-br from-purple-50 to-pink-50 rounded-2xl border-2 border-dashed border-purple-300">
            <svg className="mx-auto h-16 w-16 text-purple-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8l4 4m0-8l4 4-4 4m6 0v12m0 0l4-4-4-4m0 8l-4-4 4-4" />
            </svg>
            <p className="text-purple-600 font-medium mb-4">لا توجد مصاعد. ابدأ بإضافة مصعد جديد</p>
            <button
              type="button"
              onClick={addElevator}
              className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-600 text-white font-semibold rounded-xl hover:from-purple-600 hover:to-pink-700 shadow-lg transition-all"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v12m6-6H6" />
              </svg>
              إضافة أول مصعد
            </button>
          </div>
        ) : (
          elevatorList.map((elevator, index) => {
            const suggestion = calculations[index]?.suggested_sections;
            const ropeSuggestion = calculations[index]?.suggested_ropes;
            return (
              <div key={elevator.elevator_code || index} className="bg-white rounded-2xl border-2 border-purple-200 p-6 shadow-sm hover:shadow-md transition-shadow">
                {/* Header */}
                <div className="flex items-center justify-between mb-6 pb-4 border-b border-purple-200">
                  <div className="flex items-center gap-3">
                    <span className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-gradient-to-r from-purple-500 to-pink-600 text-white font-bold text-sm shadow-md">
                      {index + 1}
                    </span>
                    <div>
                      <h4 className="text-lg font-bold text-slate-900">مصعد #{index + 1}</h4>
                      <p className="text-xs text-slate-500">{elevator.elevator_code || 'غير محدد'}</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeElevator(index)}
                    className="inline-flex items-center gap-2 px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors font-medium"
                  >
                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                    حذف
                  </button>
                </div>

                {/* Basic Information Section */}
                <div className="mb-6">
                  <h5 className="text-sm font-bold text-purple-900 mb-3 flex items-center gap-2">
                    <span className="w-1 h-5 bg-purple-500 rounded-full"></span>
                    المعلومات الأساسية
                  </h5>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {/* Elevator Code */}
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-2">
                        رمز المصعد *
                      </label>
                      <input
                        type="text"
                        value={elevator.elevator_code || ''}
                        onChange={(e) => handleElevatorChange(index, 'elevator_code', e.target.value)}
                        placeholder="ELV-0001"
                        className="w-full rounded-xl border-2 border-slate-300 px-4 py-3 text-sm font-medium bg-white hover:border-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all"
                      />
                    </div>

                    {/* Model Type */}
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-2">
                        طراز المصعد *
                      </label>
                      <input
                        type="text"
                        list={`elevator-models-${index}`}
                        value={elevator.model_type || ''}
                        onChange={(e) => handleElevatorChange(index, 'model_type', e.target.value)}
                        placeholder="اختر أو أدخل الطراز"
                        className="w-full rounded-xl border-2 border-slate-300 px-4 py-3 text-sm font-medium bg-white hover:border-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all"
                      />
                      <datalist id={`elevator-models-${index}`}>
                        {elevatorModels.map(model => (
                          <option key={model} value={model} />
                        ))}
                      </datalist>
                    </div>

                    {/* Manufacture Year */}
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-2">
                        سنة التصنيع
                      </label>
                      <input
                        type="number"
                        min="2000"
                        max="2050"
                        value={elevator.manufacture_year || ''}
                        onChange={(e) => handleElevatorChange(index, 'manufacture_year', e.target.value)}
                        placeholder="2024"
                        className="w-full rounded-xl border-2 border-slate-300 px-4 py-3 text-sm font-semibold bg-white hover:border-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all"
                      />
                    </div>

                    {/* Height */}
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-2">
                        الارتفاع (متر) *
                      </label>
                      <input
                        type="number"
                        step="0.1"
                        min="0"
                        value={elevator.height_meters || ''}
                        onChange={(e) => handleElevatorChange(index, 'height_meters', e.target.value)}
                        placeholder="50.0"
                        className="w-full rounded-xl border-2 border-slate-300 px-4 py-3 text-sm font-semibold bg-white hover:border-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all"
                      />
                    </div>

                    {/* Cabin Count */}
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-2">
                        عدد الكبائن *
                      </label>
                      <select
                        value={elevator.cabin_count || 1}
                        onChange={(e) => handleElevatorChange(index, 'cabin_count', e.target.value)}
                        className="w-full rounded-xl border-2 border-slate-300 px-4 py-3 text-sm font-medium bg-white hover:border-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all"
                      >
                        <option value={1}>كابينة واحدة</option>
                        <option value={2}>كابينتين متوازيتين</option>
                      </select>
                    </div>

                    {/* Unit Price */}
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-2">
                        السعر (USD) *
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={elevator.unit_price_usd || ''}
                        onChange={(e) => handleElevatorChange(index, 'unit_price_usd', e.target.value)}
                        placeholder="50000.00"
                        className="w-full rounded-xl border-2 border-slate-300 px-4 py-3 text-sm font-semibold bg-white hover:border-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all"
                      />
                    </div>
                  </div>
                </div>

                {/* Technical Details Section */}
                <div className="mb-6">
                  <h5 className="text-sm font-bold text-purple-900 mb-3 flex items-center gap-2">
                    <span className="w-1 h-5 bg-pink-500 rounded-full"></span>
                    التفاصيل الفنية
                  </h5>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* Section Count */}
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-2">
                        عدد السكاشن
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={elevator.section_count || ''}
                        onChange={(e) => handleElevatorChange(index, 'section_count', e.target.value)}
                        placeholder="0"
                        className="w-full rounded-xl border-2 border-slate-300 px-4 py-3 text-sm font-semibold bg-white hover:border-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all"
                      />
                      {suggestion && (
                        <p className="text-xs text-purple-600 mt-1 font-medium">💡 اقتراح: {suggestion} سكشن</p>
                      )}
                    </div>

                    {/* Rope Count */}
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-2">
                        عدد الرباط
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={elevator.rope_count || ''}
                        onChange={(e) => handleElevatorChange(index, 'rope_count', e.target.value)}
                        placeholder="0"
                        className="w-full rounded-xl border-2 border-slate-300 px-4 py-3 text-sm font-semibold bg-white hover:border-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all"
                      />
                      {ropeSuggestion && (
                        <p className="text-xs text-purple-600 mt-1 font-medium">💡 اقتراح: {ropeSuggestion} رباط</p>
                      )}
                    </div>

                    {/* Cable Length */}
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-2">
                        طول الكابل (متر)
                      </label>
                      <input
                        type="number"
                        step="0.1"
                        min="0"
                        value={elevator.cable_length_meters || ''}
                        onChange={(e) => handleElevatorChange(index, 'cable_length_meters', e.target.value)}
                        placeholder="10.0"
                        className="w-full rounded-xl border-2 border-slate-300 px-4 py-3 text-sm font-semibold bg-white hover:border-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all"
                      />
                    </div>
                  </div>
                </div>

                {/* Notes and Total */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {/* Notes */}
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">
                      ملاحظات
                    </label>
                    <textarea
                      value={elevator.notes || ''}
                      onChange={(e) => handleElevatorChange(index, 'notes', e.target.value)}
                      rows={3}
                      className="w-full rounded-xl border-2 border-slate-300 px-4 py-3 text-sm bg-white hover:border-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all resize-none"
                      placeholder="أي تفاصيل إضافية عن المصعد..."
                    />
                  </div>

                  {/* Total Cost Display */}
                  <div className="flex items-end">
                    <div className="w-full bg-gradient-to-r from-purple-50 to-pink-50 border-2 border-purple-200 rounded-xl p-4">
                      <p className="text-xs font-semibold uppercase text-purple-700 mb-1">التكلفة الإجمالية</p>
                      <p className="text-3xl font-bold text-purple-900">${Number(elevator.total_cost_usd || 0).toLocaleString()}</p>
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Summary Statistics */}
      {elevatorList.length > 0 && (
        <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-2xl border-2 border-purple-200 p-6">
          <h4 className="text-sm font-bold text-purple-900 mb-4">إحصائيات المصاعد</h4>
          <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
            <div className="bg-white rounded-xl border-2 border-purple-100 p-4">
              <p className="text-xs font-semibold uppercase text-purple-700 mb-1">العدد</p>
              <p className="text-2xl font-bold text-purple-900">{elevatorList.length}</p>
            </div>
            <div className="bg-white rounded-xl border-2 border-purple-100 p-4">
              <p className="text-xs font-semibold uppercase text-purple-700 mb-1">الارتفاع (م)</p>
              <p className="text-2xl font-bold text-purple-900">{totalHeightMeters.toFixed(1)}</p>
            </div>
            <div className="bg-white rounded-xl border-2 border-purple-100 p-4">
              <p className="text-xs font-semibold uppercase text-purple-700 mb-1">السكاشن</p>
              <p className="text-2xl font-bold text-purple-900">{totalSections}</p>
            </div>
            <div className="bg-white rounded-xl border-2 border-purple-100 p-4">
              <p className="text-xs font-semibold uppercase text-purple-700 mb-1">الرباط</p>
              <p className="text-2xl font-bold text-purple-900">{totalRopes}</p>
            </div>
            <div className="bg-white rounded-xl border-2 border-purple-100 p-4">
              <p className="text-xs font-semibold uppercase text-purple-700 mb-1">الكابلات (م)</p>
              <p className="text-2xl font-bold text-purple-900">{totalCableMeters.toFixed(1)}</p>
            </div>
            <div className="bg-white rounded-xl border-2 border-purple-100 p-4">
              <p className="text-xs font-semibold uppercase text-purple-700 mb-1">التكلفة الكلية</p>
              <p className="text-2xl font-bold text-purple-900">${totalCostUsd.toLocaleString()}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ElevatorForm;
