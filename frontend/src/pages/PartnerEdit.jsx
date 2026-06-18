import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Edit3, DollarSign, TrendingUp, TrendingDown, Users, Briefcase, FileText } from 'lucide-react';
import Layout from '../components/Layout';
import PartnerForm from '../components/PartnerForm';
import FinancialOperations from '../components/FinancialOperations';
import MovementHistory from '../components/MovementHistory';
import PartnerStatementViewer from '../components/PartnerStatementViewer';
import { getPartner, getPartnerCapitalMovements, getPartnerOwnershipSnapshots } from '../services/api';

const PartnerEdit = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [partner, setPartner] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('overview'); // 'overview' or 'statement'
  const [financialData, setFinancialData] = useState({
    netCapital: 0,
    ownershipPercentage: 0,
    movements: [],
    snapshots: []
  });

  useEffect(() => {
    const fetchPartnerData = async () => {
      try {
        setLoading(true);
        setError(null);

        // Initialize financial data with safe defaults
        setFinancialData({
          netCapital: 0,
          ownershipPercentage: 0,
          movements: [],
          snapshots: []
        });

        const [partnerData, movements, snapshots] = await Promise.all([
          getPartner(id),
          getPartnerCapitalMovements(id).catch(err => {
            console.error('Error fetching movements:', err);
            return [];
          }),
          getPartnerOwnershipSnapshots(id).catch(err => {
            console.error('Error fetching snapshots:', err);
            return [];
          })
        ]);

        setPartner(partnerData);

        // Calculate financial data with safe checks
        const movementsArray = Array.isArray(movements) ? movements : [];
        const deposits = movementsArray.filter(m => m?.movement_type === 'DEPOSIT').reduce((sum, m) => sum + parseFloat(m?.amount_usd || 0), 0);
        const withdrawals = movementsArray.filter(m => m?.movement_type === 'WITHDRAW').reduce((sum, m) => sum + parseFloat(m?.amount_usd || 0), 0);
        const netCapital = deposits - withdrawals;

        const snapshotsArray = Array.isArray(snapshots) ? snapshots : [];
        const latestOwnership = snapshotsArray.length > 0
          ? snapshotsArray.reduce((latest, snapshot) => {
              if (!latest || !snapshot) return latest || snapshot;
              const currentDate = snapshot.snapshot_on || snapshot.snapshot_date || 0;
              const latestDate = latest.snapshot_on || latest.snapshot_date || 0;
              return new Date(currentDate) > new Date(latestDate) ? snapshot : latest;
            })
          : null;

        setFinancialData({
          netCapital: Number(netCapital) || 0,
          ownershipPercentage: Number(latestOwnership?.equity_pct ?? latestOwnership?.ownership_percentage) || 0,
          movements: movementsArray,
          snapshots: snapshotsArray
        });

        setError(null);
      } catch (err) {
        setError('تعذر تحميل بيانات الشريك');
        console.error('Error fetching partner data:', err);
        // Keep safe defaults in financialData
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      fetchPartnerData();
    }
  }, [id]);

  const handleSave = (updatedPartner) => {
    // Navigate back to partners list after successful update
    navigate('/partners');
  };

  const handleCancel = () => {
    // Navigate back to partners list if user cancels
    navigate('/partners');
  };

  const handleOperationComplete = () => {
    // Refresh financial data after operation
    const fetchPartnerData = async () => {
      try {
        const [movements, snapshots] = await Promise.all([
          getPartnerCapitalMovements(id).catch(err => {
            console.error('Error fetching movements:', err);
            return [];
          }),
          getPartnerOwnershipSnapshots(id).catch(err => {
            console.error('Error fetching snapshots:', err);
            return [];
          })
        ]);

        const movementsArray = Array.isArray(movements) ? movements : [];
        const deposits = movementsArray.filter(m => m?.movement_type === 'DEPOSIT').reduce((sum, m) => sum + parseFloat(m?.amount_usd || 0), 0);
        const withdrawals = movementsArray.filter(m => m?.movement_type === 'WITHDRAW').reduce((sum, m) => sum + parseFloat(m?.amount_usd || 0), 0);
        const netCapital = deposits - withdrawals;

        const snapshotsArray = Array.isArray(snapshots) ? snapshots : [];
        const latestOwnership = snapshotsArray.length > 0
          ? snapshotsArray.reduce((latest, snapshot) => {
              if (!latest || !snapshot) return latest || snapshot;
              const currentDate = snapshot.snapshot_on || snapshot.snapshot_date || 0;
              const latestDate = latest.snapshot_on || latest.snapshot_date || 0;
              return new Date(currentDate) > new Date(latestDate) ? snapshot : latest;
            })
          : null;

        setFinancialData({
          netCapital: Number(netCapital) || 0,
          ownershipPercentage: Number(latestOwnership?.equity_pct ?? latestOwnership?.ownership_percentage) || 0,
          movements: movementsArray,
          snapshots: snapshotsArray
        });
      } catch (err) {
        console.error('Error refreshing financial data:', err);
        // Keep existing data on error
      }
    };

    fetchPartnerData();
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
        </div>
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout>
        <div className="space-y-6">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-800 mb-2">تعديل الشريك</h1>
            <p className="text-gray-600">واجهنا مشكلة أثناء تحميل البيانات، حاول مرة أخرى.</p>
          </div>
          <div className="bg-gradient-to-br from-red-50 to-red-100 rounded-xl p-6 border border-red-200">
            <div className="flex items-center">
              <div className="p-2 bg-red-200 rounded-full mr-3">
                <svg className="w-6 h-6 text-red-800" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="text-red-800 font-medium">{error}</div>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  const formatNumber = (value) => new Intl.NumberFormat('en-US').format(value || 0);

  return (
    <Layout>
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-blue-50">
        <div className="max-w-6xl mx-auto p-6">
          {/* Header Section */}
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
                  <Edit3 className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h1 className="text-3xl font-bold text-gray-800">تعديل الشريك</h1>
                  <p className="text-gray-600 mt-1">قم بتحديث بيانات الشريك وإدارة حركاته المالية</p>
                </div>
              </div>
            </div>
          </div>

          {/* Financial Overview Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-emerald-600">رأس المال الصافي</p>
                  <p className={`text-3xl font-bold ${ (financialData?.netCapital || 0) >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                    ${formatNumber(financialData?.netCapital || 0)}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">إجمالي الإيداعات ناقص السحوبات</p>
                </div>
                <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center">
                  <DollarSign className="w-6 h-6 text-emerald-600" />
                </div>
              </div>
            </div>

            <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-purple-600">نسبة الملكية</p>
                  <p className="text-3xl font-bold text-purple-600">
                    {(financialData?.ownershipPercentage || 0).toFixed(1)}%
                  </p>
                  <p className="text-xs text-gray-500 mt-1">آخر تحديث للملكية</p>
                </div>
                <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
                  <Briefcase className="w-6 h-6 text-purple-600" />
                </div>
              </div>
            </div>

            <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-blue-600">إجمالي الإيداعات</p>
                  <p className="text-3xl font-bold text-blue-600">
                    ${formatNumber((financialData?.movements || []).filter(m => m?.movement_type === 'DEPOSIT').reduce((sum, m) => sum + parseFloat(m?.amount_usd || 0), 0))}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">{(financialData?.movements || []).filter(m => m?.movement_type === 'DEPOSIT').length} عملية</p>
                </div>
                <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                  <TrendingUp className="w-6 h-6 text-blue-600" />
                </div>
              </div>
            </div>

            <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-red-600">إجمالي السحوبات</p>
                  <p className="text-3xl font-bold text-red-600">
                    ${formatNumber((financialData?.movements || []).filter(m => m?.movement_type === 'WITHDRAW').reduce((sum, m) => sum + parseFloat(m?.amount_usd || 0), 0))}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">{(financialData?.movements || []).filter(m => m?.movement_type === 'WITHDRAW').length} عملية</p>
                </div>
                <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center">
                  <TrendingDown className="w-6 h-6 text-red-600" />
                </div>
              </div>
            </div>
          </div>

          {/* Tab Navigation */}
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 mb-6 overflow-hidden">
            <div className="flex border-b border-gray-200">
              <button
                onClick={() => setActiveTab('overview')}
                className={`flex-1 px-6 py-4 font-semibold transition-all duration-200 ${
                  activeTab === 'overview'
                    ? 'bg-gradient-to-r from-purple-500 to-blue-600 text-white'
                    : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                <div className="flex items-center justify-center gap-2">
                  <Edit3 className="w-5 h-5" />
                  <span>العمليات المالية والبيانات</span>
                </div>
              </button>
              <button
                onClick={() => setActiveTab('statement')}
                className={`flex-1 px-6 py-4 font-semibold transition-all duration-200 ${
                  activeTab === 'statement'
                    ? 'bg-gradient-to-r from-purple-500 to-blue-600 text-white'
                    : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                <div className="flex items-center justify-center gap-2">
                  <FileText className="w-5 h-5" />
                  <span>كشف الحساب التفصيلي</span>
                </div>
              </button>
            </div>
          </div>

          {/* Tab Content */}
          {activeTab === 'overview' ? (
            <>
              {/* Financial Operations Section */}
              <FinancialOperations
                partnerId={id}
                onOperationComplete={handleOperationComplete}
              />

              {/* Movement History Section */}
              <div className="mt-8">
                <MovementHistory movements={financialData.movements} />
              </div>

              {/* Main Content - Form Section */}
              <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 overflow-hidden mb-8 mt-8">
                <div className="bg-gradient-to-r from-purple-500 to-blue-600 px-8 py-6">
                  <h2 className="text-xl font-bold text-white">بيانات الشريك</h2>
                  <p className="text-purple-100 mt-1">تحديث المعلومات الأساسية للشريك</p>
                </div>

                <div className="p-8">
                  <PartnerForm
                    partner={partner}
                    onSave={handleSave}
                    onCancel={handleCancel}
                  />
                </div>
              </div>
            </>
          ) : (
            /* Partner Statement Tab */
            <PartnerStatementViewer
              partnerId={id}
              partnerName={partner?.name}
            />
          )}
        </div>
      </div>
    </Layout>
  );
};

export default PartnerEdit;
