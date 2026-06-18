import React, { useState, useEffect } from 'react';
import { PlusCircle, Edit, Trash2, TrendingUp, TrendingDown, DollarSign, Calendar, User, Loader2, RefreshCw } from 'lucide-react';
import Layout from '../components/Layout';
import CapitalMovementForm from '../components/CapitalMovementForm';
import { getAllCapitalMovements } from '../services/api';

const CapitalMovements = () => {
  const [movements, setMovements] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editingMovement, setEditingMovement] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchMovements();
  }, []);

  const fetchMovements = async () => {
    try {
      setLoading(true);
      const data = await getAllCapitalMovements();
      setMovements(Array.isArray(data) ? data : []);
      setError(null);
    } catch (err) {
      setError('تعذر تحميل قائمة حركات رأس المال');
      console.error('Error fetching capital movements:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = (newMovement) => {
    setShowForm(false);
    setEditingMovement(null);
    fetchMovements(); // Refresh the list after saving
  };

  const handleEdit = (movement) => {
    setEditingMovement(movement);
    setShowForm(true);
  };

  const handleDelete = (id) => {
    setMovements(prev => prev.filter(m => m.id !== id));
  };

  const getTypeBadge = (type) => {
    switch (type) {
      case 'DEPOSIT':
        return (
          <div className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-emerald-100 text-emerald-700">
            <TrendingUp className="w-4 h-4 ml-1" />
            إيداع
          </div>
        );
      case 'WITHDRAW':
        return (
          <div className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-red-100 text-red-700">
            <TrendingDown className="w-4 h-4 ml-1" />
            سحب
          </div>
        );
      default:
        return <div className="px-3 py-1 rounded-full text-sm font-medium bg-gray-100 text-gray-700">{type}</div>;
    }
  };

  const calculateTotals = () => {
    const deposits = movements.filter(m => m.movement_type === 'DEPOSIT').reduce((sum, m) => sum + parseFloat(m.amount_usd || 0), 0);
    const withdrawals = movements.filter(m => m.movement_type === 'WITHDRAW').reduce((sum, m) => sum + parseFloat(m.amount_usd || 0), 0);
    return { deposits, withdrawals, net: deposits - withdrawals };
  };

  const totals = calculateTotals();

  if (loading) {
    return (
      <Layout>
        <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-blue-50">
          <div className="max-w-7xl mx-auto p-6">
            {/* Header */}
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 p-8 mb-8">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4 rtl:space-x-reverse">
                  <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-blue-600 rounded-xl flex items-center justify-center">
                    <DollarSign className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h1 className="text-3xl font-bold text-gray-800">حركات رؤوس الأموال</h1>
                    <p className="text-gray-600 mt-1">إدارة إيداعات وسحوبات الشركاء</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Loading Card */}
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 p-12">
              <div className="flex flex-col items-center justify-center space-y-4">
                <Loader2 className="w-12 h-12 text-purple-500 animate-spin" />
                <div className="text-xl font-semibold text-gray-700">جاري تحميل الحركات...</div>
                <div className="text-gray-500">يرجى الانتظار قليلاً</div>
              </div>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-blue-50">
        <div className="max-w-7xl mx-auto p-6">
          {/* Header */}
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 p-8 mb-8">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4 rtl:space-x-reverse">
                <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-blue-600 rounded-xl flex items-center justify-center">
                  <DollarSign className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h1 className="text-3xl font-bold text-gray-800">حركات رؤوس الأموال</h1>
                  <p className="text-gray-600 mt-1">إدارة إيداعات وسحوبات الشركاء</p>
                </div>
              </div>
              {!showForm && (
                <button
                  onClick={() => setShowForm(true)}
                  className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-purple-500 to-blue-600 text-white font-semibold rounded-xl hover:from-purple-600 hover:to-blue-700 transform hover:scale-105 transition-all duration-200 shadow-lg hover:shadow-xl"
                >
                  <PlusCircle className="w-5 h-5 ml-2" />
                  إضافة حركة
                </button>
              )}
            </div>
          </div>

          {/* Summary Cards */}
          {!showForm && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">إجمالي الإيداعات</p>
                    <p className="text-3xl font-bold text-emerald-600">${totals.deposits.toLocaleString()}</p>
                  </div>
                  <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center">
                    <TrendingUp className="w-6 h-6 text-emerald-600" />
                  </div>
                </div>
              </div>

              <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">إجمالي السحوبات</p>
                    <p className="text-3xl font-bold text-red-600">${totals.withdrawals.toLocaleString()}</p>
                  </div>
                  <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center">
                    <TrendingDown className="w-6 h-6 text-red-600" />
                  </div>
                </div>
              </div>

              <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">صافي رأس المال</p>
                    <p className={`text-3xl font-bold ${totals.net >= 0 ? 'text-blue-600' : 'text-red-600'}`}>
                      ${totals.net.toLocaleString()}
                    </p>
                  </div>
                  <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                    <DollarSign className="w-6 h-6 text-blue-600" />
                  </div>
                </div>
              </div>
            </div>
          )}

          {showForm ? (
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 p-8">
              <CapitalMovementForm
                movement={editingMovement}
                onSave={handleSave}
                onCancel={() => {
                  setShowForm(false);
                  setEditingMovement(null);
                }}
              />
            </div>
          ) : (
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 overflow-hidden">
              <div className="bg-gradient-to-r from-purple-500 to-blue-600 px-6 py-4">
                <h2 className="text-xl font-bold text-white">قائمة حركات رؤوس الأموال</h2>
              </div>

              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-4 text-right text-sm font-bold text-gray-700">الشريك</th>
                      <th className="px-6 py-4 text-right text-sm font-bold text-gray-700">نوع الحركة</th>
                      <th className="px-6 py-4 text-right text-sm font-bold text-gray-700">المبلغ</th>
                      <th className="px-6 py-4 text-right text-sm font-bold text-gray-700">التاريخ</th>
                      <th className="px-6 py-4 text-right text-sm font-bold text-gray-700">الوصف</th>
                      <th className="px-6 py-4 text-right text-sm font-bold text-gray-700">الإجراءات</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {movements.map((movement) => (
                      <tr key={movement.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="w-10 h-10 bg-gradient-to-br from-purple-400 to-blue-500 rounded-full flex items-center justify-center">
                              <User className="w-5 h-5 text-white" />
                            </div>
                            <div className="mr-4">
                              <div className="text-sm font-medium text-gray-900">{movement.partner_name || movement.partner?.name}</div>
                              <div className="text-sm text-gray-500">معرف: {movement.partner_id}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {getTypeBadge(movement.movement_type)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className={`text-lg font-bold ${movement.movement_type === 'DEPOSIT' ? 'text-emerald-600' : 'text-red-600'}`}>
                            {movement.movement_type === 'DEPOSIT' ? '+' : '-'}${parseFloat(movement.amount_usd || 0).toLocaleString()}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center text-gray-600">
                            <Calendar className="w-4 h-4 ml-2" />
                            {new Date(movement.happened_at || movement.movement_date).toLocaleDateString('en-US')}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600">
                          <div className="max-w-xs truncate">{movement.note || movement.description || '—'}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex space-x-2 rtl:space-x-reverse">
                            <button
                              className="inline-flex items-center px-3 py-2 text-sm font-medium text-blue-600 bg-blue-100 rounded-lg hover:bg-blue-200 transition-colors"
                              onClick={() => handleEdit(movement)}
                            >
                              <Edit className="w-4 h-4 ml-1" />
                              تعديل
                            </button>
                            <button
                              className="inline-flex items-center px-3 py-2 text-sm font-medium text-red-600 bg-red-100 rounded-lg hover:bg-red-200 transition-colors"
                              onClick={() => handleDelete(movement.id)}
                            >
                              <Trash2 className="w-4 h-4 ml-1" />
                              حذف
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {movements.length === 0 && (
                <div className="text-center py-12">
                  <DollarSign className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">لا توجد حركات</h3>
                  <p className="text-gray-500 mb-6">ابدأ بإضافة حركة رأس مال جديدة</p>
                  <button
                    onClick={() => setShowForm(true)}
                    className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-purple-500 to-blue-600 text-white font-semibold rounded-xl hover:from-purple-600 hover:to-blue-700 transform hover:scale-105 transition-all duration-200 shadow-lg hover:shadow-xl"
                  >
                    <PlusCircle className="w-5 h-5 ml-2" />
                    إضافة حركة
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
};

export default CapitalMovements;