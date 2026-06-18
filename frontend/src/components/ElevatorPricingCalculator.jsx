import React, { useState, useEffect } from 'react';

const ElevatorPricingCalculator = ({ elevator, onPriceCalculated }) => {
  const [customPrice, setCustomPrice] = useState(0);

  // تحديث السعر عند تغيير المصعد فقط
  useEffect(() => {
    if (elevator?.id) {
      const initialPrice = parseFloat(elevator.price_usd || elevator.price || 0);
      setCustomPrice(initialPrice);

      // استدعاء مباشر بدون useCallback
      if (onPriceCalculated) {
        onPriceCalculated({
          method: 'direct',
          price: initialPrice,
          details: null
        });
      }
    }
  }, [elevator?.id]); // فقط ID المصعد - بدون onPriceCalculated

  const handlePriceChange = (value) => {
    const newPrice = parseFloat(value) || 0;
    setCustomPrice(newPrice);

    if (onPriceCalculated) {
      onPriceCalculated({
        method: 'direct',
        price: newPrice,
        details: null
      });
    }
  };

  // عرض رسالة إذا لم يتم اختيار مصعد
  if (!elevator || !elevator.id) {
    return (
      <div className="text-center py-6 text-gray-500" dir="rtl">
        الرجاء اختيار مصعد لعرض خيارات التسعير
      </div>
    );
  }

  return (
    <div className="space-y-4" dir="rtl">
      {/* معلومات المصعد */}
      <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-6 border-2 border-blue-200">
        <div className="flex items-center mb-4">
          <svg className="w-6 h-6 text-blue-600 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <h4 className="text-lg font-bold text-blue-900">تسعير المصعد</h4>
        </div>

        <div className="bg-white rounded-lg p-4">
          <label className="block text-sm font-semibold text-gray-700 mb-3">
            سعر البيع (USD) *
          </label>
          <div className="flex items-center gap-3">
            <span className="text-2xl font-bold text-gray-400">$</span>
            <input
              type="number"
              step="0.01"
              min="0"
              value={customPrice}
              onChange={(e) => handlePriceChange(e.target.value)}
              className="flex-1 px-4 py-3 border-2 border-blue-300 rounded-xl text-2xl font-bold text-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
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

      {/* ملخص السعر النهائي */}
      <div className="bg-gradient-to-r from-green-500 to-emerald-600 rounded-xl p-6 text-white shadow-lg">
        <div className="flex justify-between items-center">
          <div>
            <h4 className="text-lg font-semibold mb-1">السعر النهائي للبيع</h4>
            <p className="text-sm text-green-100">شامل جميع التكاليف</p>
          </div>
          <div className="text-left">
            <div className="text-4xl font-bold">
              ${customPrice.toFixed(2)}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ElevatorPricingCalculator;
