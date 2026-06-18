import React from 'react';
import { TrendingUp, TrendingDown, Calendar, FileText, DollarSign } from 'lucide-react';

const MovementHistory = ({ movements }) => {
  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatNumber = (value) => new Intl.NumberFormat('en-US').format(value || 0);

  if (!movements || movements.length === 0) {
    return (
      <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 p-8">
        <h3 className="text-xl font-bold text-gray-800 mb-6 flex items-center">
          <DollarSign className="w-6 h-6 text-purple-600 ml-2" />
          تاريخ الحركات المالية
        </h3>
        <div className="text-center py-12">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <DollarSign className="w-8 h-8 text-gray-400" />
          </div>
          <p className="text-gray-500 text-lg font-medium">لا توجد حركات مالية حتى الآن</p>
          <p className="text-gray-400 text-sm mt-2">استخدم أزرار الإيداع والسحب أعلاه لإضافة حركات مالية</p>
        </div>
      </div>
    );
  }

  // Sort movements by date (newest first)
  const sortedMovements = [...movements].sort((a, b) => new Date(b.happened_at) - new Date(a.happened_at));

  return (
    <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 p-6">
      <h3 className="text-xl font-bold text-gray-800 mb-6 flex items-center">
        <DollarSign className="w-6 h-6 text-purple-600 ml-2" />
        تاريخ الحركات المالية
        <span className="bg-purple-100 text-purple-800 text-sm font-medium px-2.5 py-0.5 rounded-full mr-2">
          {movements.length}
        </span>
      </h3>

      <div className="space-y-4 max-h-96 overflow-y-auto">
        {sortedMovements.map((movement, index) => (
          <div
            key={movement.id || index}
            className={`relative p-4 rounded-xl border-2 transition-all duration-200 hover:shadow-md ${
              movement.movement_type === 'DEPOSIT'
                ? 'bg-emerald-50 border-emerald-200 hover:bg-emerald-100'
                : 'bg-red-50 border-red-200 hover:bg-red-100'
            }`}
          >
            <div className="flex items-start justify-between">
              <div className="flex items-start space-x-3 rtl:space-x-reverse">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                  movement.movement_type === 'DEPOSIT'
                    ? 'bg-emerald-200'
                    : 'bg-red-200'
                }`}>
                  {movement.movement_type === 'DEPOSIT' ? (
                    <TrendingUp className={`w-5 h-5 text-emerald-700`} />
                  ) : (
                    <TrendingDown className={`w-5 h-5 text-red-700`} />
                  )}
                </div>

                <div className="flex-1">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className={`font-bold text-lg ${
                      movement.movement_type === 'DEPOSIT' ? 'text-emerald-800' : 'text-red-800'
                    }`}>
                      {movement.movement_type === 'DEPOSIT' ? 'إيداع' : 'سحب'}
                    </h4>
                    <span className={`text-2xl font-bold ${
                      movement.movement_type === 'DEPOSIT' ? 'text-emerald-600' : 'text-red-600'
                    }`}>
                      ${formatNumber(movement.amount_usd)}
                    </span>
                  </div>

                  <div className="flex items-center text-sm text-gray-600 mb-2">
                    <Calendar className="w-4 h-4 ml-1" />
                    {formatDate(movement.happened_at)}
                  </div>

                  {movement.note && (
                    <div className="flex items-start text-sm text-gray-700 bg-white/50 rounded-lg p-2 mt-2">
                      <FileText className="w-4 h-4 ml-1 mt-0.5 flex-shrink-0" />
                      <span>{movement.note}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Movement number indicator */}
            <div className="absolute top-2 left-2">
              <span className="bg-white/80 text-gray-600 text-xs font-medium px-2 py-1 rounded-full">
                #{movements.length - index}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Summary at the bottom */}
      <div className="mt-6 pt-4 border-t border-gray-200">
        <div className="grid grid-cols-2 gap-4">
          <div className="text-center p-4 bg-emerald-50 rounded-xl">
            <p className="text-sm font-medium text-emerald-600">إجمالي الإيداعات</p>
            <p className="text-xl font-bold text-emerald-700">
              ${formatNumber(movements.filter(m => m.movement_type === 'DEPOSIT').reduce((sum, m) => sum + parseFloat(m.amount_usd || 0), 0))}
            </p>
          </div>
          <div className="text-center p-4 bg-red-50 rounded-xl">
            <p className="text-sm font-medium text-red-600">إجمالي السحوبات</p>
            <p className="text-xl font-bold text-red-700">
              ${formatNumber(movements.filter(m => m.movement_type === 'WITHDRAW').reduce((sum, m) => sum + parseFloat(m.amount_usd || 0), 0))}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MovementHistory;