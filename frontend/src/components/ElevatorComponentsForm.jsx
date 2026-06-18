import React, { useState, useEffect } from 'react';

const ElevatorComponentsForm = ({ elevator, onComponentsChange }) => {
  const [components, setComponents] = useState({
    sections: 0,      // عدد السكاشن
    cable_meters: 0,  // طول الكيبل بالمتر
    cabins: 1,        // عدد الكابينات
    doors: 0,         // عدد الأبواب
    total_price: 0    // السعر الإجمالي
  });

  // تعيين القيم الافتراضية عند اختيار المصعد
  useEffect(() => {
    if (elevator?.id) {
      const initialPrice = parseFloat(elevator.price_usd || elevator.price || 0);
      setComponents(prev => ({
        ...prev,
        total_price: initialPrice
      }));

      // إرسال التحديث للمكون الأب
      if (onComponentsChange) {
        onComponentsChange({
          ...components,
          total_price: initialPrice
        });
      }
    }
  }, [elevator?.id]);

  const handleChange = (field, value) => {
    const numValue = parseFloat(value) || 0;
    const newComponents = {
      ...components,
      [field]: numValue
    };
    setComponents(newComponents);

    // إرسال التحديث للمكون الأب
    if (onComponentsChange) {
      onComponentsChange(newComponents);
    }
  };

  // عرض رسالة إذا لم يتم اختيار مصعد
  if (!elevator || !elevator.id) {
    return (
      <div className="text-center py-6 text-gray-500" dir="rtl">
        الرجاء اختيار مصعد لتحديد المكونات
      </div>
    );
  }

  return (
    <div className="space-y-6" dir="rtl">
      {/* قسم المكونات */}
      <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl p-6 border-2 border-purple-200">
        <div className="flex items-center mb-4">
          <svg className="w-6 h-6 text-purple-600 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
          </svg>
          <h4 className="text-lg font-bold text-purple-900">مكونات المصعد المطلوبة</h4>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* عدد السكاشن */}
          <div className="bg-white rounded-lg p-4">
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              عدد السكاشن (قطعة)
            </label>
            <input
              type="number"
              min="0"
              step="1"
              value={components.sections}
              onChange={(e) => handleChange('sections', e.target.value)}
              className="w-full px-4 py-2 border-2 border-purple-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
              placeholder="0"
            />
          </div>

          {/* عدد الحبال أزيل */}

          {/* طول الكيبل */}
          <div className="bg-white rounded-lg p-4">
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              طول الكيبل (متر)
            </label>
            <input
              type="number"
              min="0"
              step="0.1"
              value={components.cable_meters}
              onChange={(e) => handleChange('cable_meters', e.target.value)}
              className="w-full px-4 py-2 border-2 border-purple-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
              placeholder="0"
            />
          </div>

          {/* عدد الكابينات */}
          <div className="bg-white rounded-lg p-4">
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              عدد الكابينات
            </label>
            <select
              value={components.cabins}
              onChange={(e) => handleChange('cabins', e.target.value)}
              className="w-full px-4 py-2 border-2 border-purple-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
            >
              <option value="1">1 كابينة</option>
              <option value="2">2 كابينة (دبل)</option>
            </select>
          </div>

          {/* عدد الأبواب */}
          <div className="bg-white rounded-lg p-4">
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              عدد الأبواب (باب)
            </label>
            <input
              type="number"
              min="0"
              step="1"
              value={components.doors}
              onChange={(e) => handleChange('doors', e.target.value)}
              className="w-full px-4 py-2 border-2 border-purple-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
              placeholder="0"
            />
          </div>
        </div>
      </div>

      {/* قسم التسعير */}
      <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-6 border-2 border-blue-200">
        <div className="flex items-center mb-4">
          <svg className="w-6 h-6 text-blue-600 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <h4 className="text-lg font-bold text-blue-900">التسعير</h4>
        </div>

        <div className="bg-white rounded-lg p-4">
          <label className="block text-sm font-semibold text-gray-700 mb-3">
            السعر الإجمالي (USD) *
          </label>
          <div className="flex items-center gap-3">
            <span className="text-3xl font-bold text-gray-400">$</span>
            <input
              type="number"
              step="0.01"
              min="0"
              value={components.total_price}
              onChange={(e) => handleChange('total_price', e.target.value)}
              className="flex-1 px-4 py-3 border-2 border-blue-300 rounded-xl text-2xl font-bold text-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="0.00"
            />
          </div>

          <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
            <div className="flex items-center text-sm text-blue-800">
              <svg className="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>السعر الأساسي من المخزون: ${parseFloat(elevator?.price_usd || elevator?.price || 0).toFixed(2)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* ملخص المكونات */}
      <div className="bg-gradient-to-r from-green-500 to-emerald-600 rounded-xl p-6 text-white shadow-lg">
        <h4 className="text-lg font-semibold mb-3">ملخص الطلب</h4>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm mb-4">
          <div>
            <p className="text-green-100">السكاشن</p>
            <p className="text-2xl font-bold">{components.sections}</p>
          </div>
          {/* الحبال أزيل من الملخص */}
          <div>
            <p className="text-green-100">الكيبل</p>
            <p className="text-2xl font-bold">{components.cable_meters}م</p>
          </div>
          <div>
            <p className="text-green-100">الكابينات</p>
            <p className="text-2xl font-bold">{components.cabins}</p>
          </div>
          <div>
            <p className="text-green-100">الأبواب</p>
            <p className="text-2xl font-bold">{components.doors}</p>
          </div>
          <div>
            <p className="text-green-100">السعر الإجمالي</p>
            <p className="text-2xl font-bold">${components.total_price.toFixed(2)}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ElevatorComponentsForm;
