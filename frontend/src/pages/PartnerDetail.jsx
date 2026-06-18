import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { User, DollarSign, PieChart, Edit, ArrowLeft, Calendar, TrendingUp, TrendingDown, Loader2, Wallet, Book } from 'lucide-react';
import Layout from '../components/Layout';
import CapitalMovementForm from '../components/CapitalMovementForm';
import OwnershipSnapshotForm from '../components/OwnershipSnapshotForm';
import PartnerFinancialDashboard from '../components/PartnerFinancialDashboard';
import PartnerAccountLedger from '../components/PartnerAccountLedger';
import { getPartner, getPartnerCapitalMovements, getPartnerOwnershipSnapshots } from '../services/api';

const PartnerDetail = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const [partner, setPartner] = useState(null);
  const [movements, setMovements] = useState([]);
  const [snapshots, setSnapshots] = useState([]);
  const [activeTab, setActiveTab] = useState('financial'); // Changed default to financial
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showMovementForm, setShowMovementForm] = useState(false);
  const [showSnapshotForm, setShowSnapshotForm] = useState(false);

  useEffect(() => {
    if (id) {
      fetchPartnerData();
    }
  }, [id]);

  const fetchPartnerData = async () => {
    try {
      setLoading(true);
      const [partnerData, movementsData, snapshotsData] = await Promise.all([
        getPartner(id),
        getPartnerCapitalMovements(id),
        getPartnerOwnershipSnapshots(id)
      ]);

      setPartner(partnerData);
      setMovements(Array.isArray(movementsData) ? movementsData : []);
      setSnapshots(Array.isArray(snapshotsData) ? snapshotsData : []);
      setError(null);
    } catch (err) {
      setError('فشل في تحميل بيانات الشريك');
      console.error('Error fetching partner data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleMovementSave = () => {
    setShowMovementForm(false);
    fetchPartnerData(); // Refresh data
  };

  const handleSnapshotSave = () => {
    setShowSnapshotForm(false);
    fetchPartnerData(); // Refresh data
  };

  const calculateTotals = () => {
    const deposits = movements.filter(m => m.movement_type === 'DEPOSIT').reduce((sum, m) => sum + parseFloat(m.amount_usd || 0), 0);
    const withdrawals = movements.filter(m => m.movement_type === 'WITHDRAW').reduce((sum, m) => sum + parseFloat(m.amount_usd || 0), 0);
    return { deposits, withdrawals, net: deposits - withdrawals };
  };

  const getLatestOwnership = () => {
    if (snapshots.length === 0) return null;
    return snapshots.reduce((latest, snapshot) => {
      const currentDate = snapshot.snapshot_on || snapshot.snapshot_date || 0;
      const latestDate = latest.snapshot_on || latest.snapshot_date || 0;
      return new Date(currentDate) > new Date(latestDate) ? snapshot : latest;
    });
  };

  const totals = calculateTotals();
  const latestOwnership = getLatestOwnership();

  if (loading) {
    return (
      <Layout>
        <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-blue-50">
          <div className="max-w-7xl mx-auto p-6">
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 p-12">
              <div className="flex flex-col items-center justify-center space-y-4">
                <Loader2 className="w-12 h-12 text-purple-500 animate-spin" />
                <div className="text-xl font-semibold text-gray-700">جاري تحميل بيانات الشريك...</div>
                <div className="text-gray-500">يرجى الانتظار قليلاً</div>
              </div>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout>
        <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-blue-50">
          <div className="max-w-7xl mx-auto p-6">
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 p-8">
              <div className="text-center">
                <div className="text-red-500 text-xl mb-4">{error}</div>
                <button
                  onClick={() => navigate('/partners')}
                  className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-purple-500 to-blue-600 text-white font-semibold rounded-xl hover:from-purple-600 hover:to-blue-700 transform hover:scale-105 transition-all duration-200 shadow-lg hover:shadow-xl"
                >
                  <ArrowLeft className="w-5 h-5 ml-2" />
                  العودة إلى قائمة الشركاء
                </button>
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
                <button
                  onClick={() => navigate('/partners')}
                  className="w-12 h-12 bg-gradient-to-br from-gray-400 to-gray-600 rounded-xl flex items-center justify-center hover:from-gray-500 hover:to-gray-700 transition-all duration-200"
                >
                  <ArrowLeft className="w-6 h-6 text-white" />
                </button>
                <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-blue-600 rounded-xl flex items-center justify-center">
                  <User className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h1 className="text-3xl font-bold text-gray-800">{partner?.name}</h1>
                  <p className="text-gray-600 mt-1">تفاصيل ومعلومات الشريك</p>
                </div>
              </div>
              <button
                onClick={() => navigate(`/partners/${id}/edit`)}
                className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-purple-500 to-blue-600 text-white font-semibold rounded-xl hover:from-purple-600 hover:to-blue-700 transform hover:scale-105 transition-all duration-200 shadow-lg hover:shadow-xl"
              >
                <Edit className="w-5 h-5 ml-2" />
                تعديل الشريك
              </button>
            </div>
          </div>

          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            {/* Total Capital */}
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">صافي رأس المال</p>
                  <p className={`text-3xl font-bold ${totals.net >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                    ${totals.net.toLocaleString()}
                  </p>
                </div>
                <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                  <DollarSign className="w-6 h-6 text-blue-600" />
                </div>
              </div>
            </div>

            {/* Current Ownership */}
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">نسبة الملكية الحالية</p>
                  <p className="text-3xl font-bold text-purple-600">
                    {latestOwnership ? `${parseFloat((latestOwnership.equity_pct ?? latestOwnership.ownership_percentage) || 0).toFixed(2)}%` : '—'}
                  </p>
                </div>
                <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
                  <PieChart className="w-6 h-6 text-purple-600" />
                </div>
              </div>
            </div>

            {/* Total Movements */}
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">عدد الحركات</p>
                  <p className="text-3xl font-bold text-gray-700">{movements.length}</p>
                </div>
                <div className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center">
                  <Calendar className="w-6 h-6 text-gray-600" />
                </div>
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 overflow-hidden">
            {/* Tab Navigation */}
            <div className="flex border-b border-gray-200 overflow-x-auto">
              <button
                onClick={() => setActiveTab('financial')}
                className={`px-6 py-4 text-sm font-medium transition-colors whitespace-nowrap flex items-center gap-2 ${
                  activeTab === 'financial'
                    ? 'text-purple-600 border-b-2 border-purple-600 bg-purple-50'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <Wallet className="w-4 h-4" />
                الملخص المالي الشامل
              </button>
              <button
                onClick={() => setActiveTab('overview')}
                className={`px-6 py-4 text-sm font-medium transition-colors whitespace-nowrap ${
                  activeTab === 'overview'
                    ? 'text-purple-600 border-b-2 border-purple-600 bg-purple-50'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                نظرة عامة
              </button>
              <button
                onClick={() => setActiveTab('movements')}
                className={`px-6 py-4 text-sm font-medium transition-colors whitespace-nowrap ${
                  activeTab === 'movements'
                    ? 'text-purple-600 border-b-2 border-purple-600 bg-purple-50'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                حركات رأس المال
              </button>
              <button
                onClick={() => setActiveTab('ownership')}
                className={`px-6 py-4 text-sm font-medium transition-colors whitespace-nowrap ${
                  activeTab === 'ownership'
                    ? 'text-purple-600 border-b-2 border-purple-600 bg-purple-50'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                لقطات الملكية
              </button>
              <button
                onClick={() => setActiveTab('ledger')}
                className={`px-6 py-4 text-sm font-medium transition-colors whitespace-nowrap flex items-center gap-2 ${
                  activeTab === 'ledger'
                    ? 'text-purple-600 border-b-2 border-purple-600 bg-purple-50'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <Book className="w-4 h-4" />
                دفتر الأستاذ
              </button>
            </div>

            {/* Tab Content */}
            <div className="p-6">
              {activeTab === 'financial' && (
                <PartnerFinancialDashboard partnerId={id} />
              )}

              {activeTab === 'overview' && (
                <div className="space-y-6">
                  {/* Partner Info */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <h3 className="text-lg font-semibold text-gray-800">المعلومات الشخصية</h3>
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span className="text-gray-600">الاسم:</span>
                          <span className="font-medium">{partner?.name}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">رقم الهوية:</span>
                          <span className="font-medium">{partner?.national_id || '—'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">الهاتف:</span>
                          <span className="font-medium">{partner?.phone || '—'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">البريد الإلكتروني:</span>
                          <span className="font-medium">{partner?.email || '—'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">الحالة:</span>
                          <span className={`font-medium ${partner?.active ? 'text-green-600' : 'text-red-600'}`}>
                            {partner?.active ? 'نشط' : 'غير نشط'}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <h3 className="text-lg font-semibold text-gray-800">ملخص مالي</h3>
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span className="text-gray-600">إجمالي الإيداعات:</span>
                          <span className="font-medium text-emerald-600">${totals.deposits.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">إجمالي السحوبات:</span>
                          <span className="font-medium text-red-600">${totals.withdrawals.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between border-t pt-2">
                          <span className="text-gray-600 font-semibold">صافي رأس المال:</span>
                          <span className={`font-bold text-lg ${totals.net >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                            ${totals.net.toLocaleString()}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'movements' && (
                <div className="space-y-6">
                  <div className="flex justify-between items-center">
                    <h3 className="text-lg font-semibold text-gray-800">حركات رأس المال</h3>
                    <button
                      onClick={() => setShowMovementForm(true)}
                      className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-purple-500 to-blue-600 text-white font-semibold rounded-lg hover:from-purple-600 hover:to-blue-700 transition-all duration-200"
                    >
                      <DollarSign className="w-4 h-4 ml-1" />
                      إضافة حركة
                    </button>
                  </div>

                  {showMovementForm && (
                    <div className="border rounded-lg p-4 bg-gray-50">
                      <CapitalMovementForm
                        partnerId={id}
                        onSave={handleMovementSave}
                        onCancel={() => setShowMovementForm(false)}
                      />
                    </div>
                  )}

                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">نوع الحركة</th>
                          <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">المبلغ</th>
                          <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">التاريخ</th>
                          <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">ملاحظات</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {movements.map((movement) => (
                          <tr key={movement.id}>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                                movement.movement_type === 'DEPOSIT'
                                  ? 'bg-emerald-100 text-emerald-700'
                                  : 'bg-red-100 text-red-700'
                              }`}>
                                {movement.movement_type === 'DEPOSIT' ? (
                                  <><TrendingUp className="w-4 h-4 ml-1" />إيداع</>
                                ) : (
                                  <><TrendingDown className="w-4 h-4 ml-1" />سحب</>
                                )}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className={`text-lg font-bold ${movement.movement_type === 'DEPOSIT' ? 'text-emerald-600' : 'text-red-600'}`}>
                                {movement.movement_type === 'DEPOSIT' ? '+' : '-'}${parseFloat(movement.amount_usd || 0).toLocaleString()}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {new Date(movement.happened_at || movement.movement_date).toLocaleDateString('ar-EG')}
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-600">
                              {movement.note || movement.description || '—'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {movements.length === 0 && (
                      <div className="text-center py-8 text-gray-500">
                        لا توجد حركات مالية لهذا الشريك
                      </div>
                    )}
                  </div>
                </div>
              )}

              {activeTab === 'ownership' && (
                <div className="space-y-6">
                  <div className="flex justify-between items-center">
                    <h3 className="text-lg font-semibold text-gray-800">لقطات الملكية</h3>
                    <button
                      onClick={() => setShowSnapshotForm(true)}
                      className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-purple-500 to-blue-600 text-white font-semibold rounded-lg hover:from-purple-600 hover:to-blue-700 transition-all duration-200"
                    >
                      <PieChart className="w-4 h-4 ml-1" />
                      إضافة لقطة
                    </button>
                  </div>

                  {showSnapshotForm && (
                    <div className="border rounded-lg p-4 bg-gray-50">
                      <OwnershipSnapshotForm
                        snapshot={null}
                        onSave={handleSnapshotSave}
                        onCancel={() => setShowSnapshotForm(false)}
                      />
                    </div>
                  )}

                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">نسبة الملكية</th>
                          <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">تاريخ اللقطة</th>
                          <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">قيمة الملكية (دولار)</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {snapshots.map((snapshot) => {
                          const pct = parseFloat(snapshot.equity_pct ?? snapshot.ownership_percentage ?? 0);
                          const snapshotDate = snapshot.snapshot_on || snapshot.snapshot_date;
                          const equityValue = snapshot.equity_usd ?? snapshot.ownership_value ?? 0;

                          return (
                            <tr key={snapshot.id}>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-purple-100 text-purple-700">
                                  <PieChart className="w-4 h-4 ml-1" />
                                  {pct.toFixed(2)}%
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                {snapshotDate ? new Date(snapshotDate).toLocaleDateString('ar-EG') : '—'}
                              </td>
                              <td className="px-6 py-4 text-sm text-gray-600">
                                {`$${parseFloat(equityValue || 0).toLocaleString()}`}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                    {snapshots.length === 0 && (
                      <div className="text-center py-8 text-gray-500">
                        لا توجد لقطات ملكية لهذا الشريك
                      </div>
                    )}
                  </div>
                </div>
              )}

              {activeTab === 'ledger' && (
                <PartnerAccountLedger partnerId={id} />
              )}
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default PartnerDetail;
