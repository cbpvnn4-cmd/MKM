import React, { useState, useEffect } from 'react';
import { PlusCircle, Edit, Trash2, PieChart, TrendingUp, Calendar, User, Loader2 } from 'lucide-react';
import Layout from '../components/Layout';
import OwnershipSnapshotForm from '../components/OwnershipSnapshotForm';
import { getAllOwnershipSnapshots } from '../services/api';

const OwnershipSnapshots = () => {
  const [snapshots, setSnapshots] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editingSnapshot, setEditingSnapshot] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchSnapshots();
  }, []);

  const fetchSnapshots = async () => {
    try {
      setLoading(true);
      const data = await getAllOwnershipSnapshots();
      setSnapshots(Array.isArray(data) ? data : []);
      setError(null);
    } catch (err) {
      setError('تعذر تحميل قائمة لقطات الملكية');
      console.error('Error fetching ownership snapshots:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = (newSnapshot) => {
    setShowForm(false);
    setEditingSnapshot(null);
    fetchSnapshots(); // Refresh the list after saving
  };

  const handleEdit = (snapshot) => {
    setEditingSnapshot(snapshot);
    setShowForm(true);
  };

  const handleDelete = (id) => {
    setSnapshots(prev => prev.filter(s => s.id !== id));
  };

  const calculateCurrentOwnership = () => {
    const latestSnapshots = {};
    snapshots.forEach(snapshot => {
      const key = snapshot.partner_id;
      if (!latestSnapshots[key] ||
          new Date(snapshot.snapshot_on || 0) > new Date(latestSnapshots[key].snapshot_on || 0)) {
        latestSnapshots[key] = snapshot;
      }
    });
    return Object.values(latestSnapshots);
  };

  const currentOwnership = calculateCurrentOwnership();

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
                    <PieChart className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h1 className="text-3xl font-bold text-gray-800">لقطات الملكية</h1>
                    <p className="text-gray-600 mt-1">إدارة وتتبع حصص الشركاء</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Loading Card */}
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 p-12">
              <div className="flex flex-col items-center justify-center space-y-4">
                <Loader2 className="w-12 h-12 text-purple-500 animate-spin" />
                <div className="text-xl font-semibold text-gray-700">جاري تحميل اللقطات...</div>
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
                  <PieChart className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h1 className="text-3xl font-bold text-gray-800">لقطات الملكية</h1>
                  <p className="text-gray-600 mt-1">إدارة وتتبع حصص الشركاء</p>
                </div>
              </div>
              {!showForm && (
                <button
                  onClick={() => setShowForm(true)}
                  className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-purple-500 to-blue-600 text-white font-semibold rounded-xl hover:from-purple-600 hover:to-blue-700 transform hover:scale-105 transition-all duration-200 shadow-lg hover:shadow-xl"
                >
                  <PlusCircle className="w-5 h-5 ml-2" />
                  إضافة لقطة ملكية
                </button>
              )}
            </div>
          </div>

          {/* Current Ownership Distribution */}
          {!showForm && currentOwnership.length > 0 && (
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 p-8 mb-8">
              <div className="bg-gradient-to-r from-purple-500 to-blue-600 px-6 py-4 rounded-t-xl -mx-8 -mt-8 mb-6">
                <h2 className="text-xl font-bold text-white">التوزيع الحالي للملكية</h2>
              </div>
              <div className="space-y-6">
                {currentOwnership.map(snapshot => {
                  const pct = parseFloat(snapshot.equity_pct ?? snapshot.ownership_percentage ?? 0);
                  return (
                    <div key={snapshot.partner_id} className="space-y-3">
                      <div className="flex justify-between items-center">
                        <div className="flex items-center space-x-3 rtl:space-x-reverse">
                          <div className="w-10 h-10 bg-gradient-to-br from-purple-400 to-blue-500 rounded-full flex items-center justify-center">
                            <User className="w-5 h-5 text-white" />
                          </div>
                          <span className="font-medium text-gray-900">{snapshot.partner_name || snapshot.partner?.name}</span>
                        </div>
                        <div className="text-2xl font-bold text-purple-600">{pct.toFixed(2)}%</div>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-3">
                        <div
                          className="bg-gradient-to-r from-purple-500 to-blue-600 h-3 rounded-full transition-all duration-300"
                          style={{ width: `${Math.min(pct, 100)}%` }}
                        ></div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {showForm ? (
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 p-8">
              <OwnershipSnapshotForm
                snapshot={editingSnapshot}
                onSave={handleSave}
                onCancel={() => {
                  setShowForm(false);
                  setEditingSnapshot(null);
                }}
              />
            </div>
          ) : (
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 overflow-hidden">
              <div className="bg-gradient-to-r from-purple-500 to-blue-600 px-6 py-4">
                <h2 className="text-xl font-bold text-white">تاريخ لقطات الملكية</h2>
              </div>

              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-4 text-right text-sm font-bold text-gray-700">الشريك</th>
                      <th className="px-6 py-4 text-right text-sm font-bold text-gray-700">نسبة الملكية</th>
                      <th className="px-6 py-4 text-right text-sm font-bold text-gray-700">تاريخ اللقطة</th>
                      <th className="px-6 py-4 text-right text-sm font-bold text-gray-700">قيمة الملكية (دولار)</th>
                      <th className="px-6 py-4 text-right text-sm font-bold text-gray-700">الإجراءات</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {snapshots.map((snapshot) => {
                      const pct = parseFloat(snapshot.equity_pct ?? snapshot.ownership_percentage ?? 0);
                      const snapshotDate = snapshot.snapshot_on || snapshot.snapshot_date;
                      const equityValue = snapshot.equity_usd ?? snapshot.ownership_value ?? 0;

                      return (
                        <tr key={snapshot.id} className="hover:bg-gray-50 transition-colors">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <div className="w-10 h-10 bg-gradient-to-br from-purple-400 to-blue-500 rounded-full flex items-center justify-center">
                                <User className="w-5 h-5 text-white" />
                              </div>
                            <div className="mr-4">
                              <div className="text-sm font-medium text-gray-900">{snapshot.partner_name || snapshot.partner?.name}</div>
                              <div className="text-sm text-gray-500">معرف: {snapshot.partner_id}</div>
                            </div>
                          </div>
                        </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-purple-100 text-purple-700">
                              <TrendingUp className="w-4 h-4 ml-1" />
                              {pct.toFixed(2)}%
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center text-gray-600">
                              <Calendar className="w-4 h-4 ml-2" />
                              {snapshotDate ? new Date(snapshotDate).toLocaleDateString('en-US') : '—'}
                            </div>
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-600">
                            {`$${parseFloat(equityValue || 0).toLocaleString()}`}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex space-x-2 rtl:space-x-reverse">
                              <button
                                className="inline-flex items-center px-3 py-2 text-sm font-medium text-blue-600 bg-blue-100 rounded-lg hover:bg-blue-200 transition-colors"
                                onClick={() => handleEdit(snapshot)}
                              >
                                <Edit className="w-4 h-4 ml-1" />
                                تعديل
                              </button>
                              <button
                                className="inline-flex items-center px-3 py-2 text-sm font-medium text-red-600 bg-red-100 rounded-lg hover:bg-red-200 transition-colors"
                                onClick={() => handleDelete(snapshot.id)}
                              >
                                <Trash2 className="w-4 h-4 ml-1" />
                                حذف
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {snapshots.length === 0 && (
                <div className="text-center py-12">
                  <PieChart className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">لا توجد لقطات ملكية</h3>
                  <p className="text-gray-500 mb-6">ابدأ بإضافة لقطة ملكية جديدة</p>
                  <button
                    onClick={() => setShowForm(true)}
                    className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-purple-500 to-blue-600 text-white font-semibold rounded-xl hover:from-purple-600 hover:to-blue-700 transform hover:scale-105 transition-all duration-200 shadow-lg hover:shadow-xl"
                  >
                    <PlusCircle className="w-5 h-5 ml-2" />
                    إضافة لقطة ملكية
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

export default OwnershipSnapshots;
