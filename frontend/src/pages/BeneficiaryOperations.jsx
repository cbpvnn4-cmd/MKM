import React, { useState, useEffect } from 'react';
import { ArrowLeft, DollarSign, TrendingUp, TrendingDown, Users, User, FileText, AlertCircle, Edit3, PieChart, Percent, BarChart3, TrendingDown as TrendingDownIcon } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import BeneficiaryOperationsComponent from '../components/BeneficiaryOperationsComponent';
import BeneficiaryMovementHistory from '../components/BeneficiaryMovementHistory';

const BeneficiaryOperations = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Data states
  const [beneficiaries, setBeneficiaries] = useState([]);
  const [decisions, setDecisions] = useState([]);
  const [profitRuns, setProfitRuns] = useState({});

  // Filter states
  const [selectedBeneficiary, setSelectedBeneficiary] = useState('all');
  const [selectedDecisionType, setSelectedDecisionType] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  // Statistics
  const [statistics, setStatistics] = useState({
    totalCash: 0,
    totalCapital: 0,
    totalOperations: 0,
    byBeneficiary: {},
    companyShareStats: {
      totalCompanyShare: 0,
      totalDistributed: 0,
      totalUndistributed: 0,
      distributedPercentage: 0,
      totalProfit: 0,
      profitRunsCount: 0
    }
  });

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    calculateStatistics();
  }, [decisions, profitRuns, selectedBeneficiary, selectedDecisionType, dateFrom, dateTo]);

  const fetchData = async () => {
    try {
      setLoading(true);
      // Unify token retrieval with app-wide convention
      const token = localStorage.getItem('access_token') || sessionStorage.getItem('access_token');

      if (!token) {
        setError('لم يتم العثور على جلسة صالحة. يرجى تسجيل الدخول.');
        setLoading(false);
        return;
      }

      console.log('Fetching data with token:', token.substring(0, 20) + '...');

      // Fetch beneficiaries
      const beneficiariesRes = await fetch('/api/profit-distribution/beneficiaries', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!beneficiariesRes.ok) {
        const errorText = await beneficiariesRes.text();
        console.error('Beneficiaries error:', beneficiariesRes.status, errorText);
        throw new Error(`فشل في تحميل المستفيدين (${beneficiariesRes.status})`);
      }
      const beneficiariesData = await beneficiariesRes.json();
      console.log('Beneficiaries loaded:', beneficiariesData.length);
      setBeneficiaries(beneficiariesData);

      // Fetch all decisions
      const decisionsRes = await fetch('/api/profit-distribution/decisions', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!decisionsRes.ok) {
        const errorText = await decisionsRes.text();
        console.error('Decisions error:', decisionsRes.status, errorText);
        throw new Error(`فشل في تحميل القرارات (${decisionsRes.status})`);
      }
      const decisionsData = await decisionsRes.json();
      console.log('Decisions loaded:', decisionsData.length);
      setDecisions(decisionsData);

      // Fetch profit runs for decision details (use history endpoint)
      const runsRes = await fetch('/api/profit-distribution/history', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (runsRes.ok) {
        const runsData = await runsRes.json();
        console.log('Profit runs data:', runsData); // Debug log
        const runsMap = {};
        runsData.forEach(run => {
          const key = (run && (run.run_id ?? run.id));
          if (key != null) {
            runsMap[key] = {
              ...run,
              run_month: run.month || run.run_month,
              net_profit_usd: run.net_profit || run.net_profit_usd,
              company_pct: run.company_pct || 30
            };
          }
        });
        console.log('Profit runs map:', runsMap); // Debug log
        setProfitRuns(runsMap);
      } else {
        console.error('Failed to fetch profit runs:', runsRes.status, await runsRes.text());
      }

      setError(null);
    } catch (err) {
      console.error('Error fetching data:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const calculateStatistics = () => {
    const filtered = getFilteredDecisions();

    let totalCash = 0;
    let totalCapital = 0;
    const byBeneficiary = {};

    filtered.forEach(decision => {
      const amount = parseFloat(decision.amount_usd) || 0;

      if (decision.decision_type === 'CASH') {
        totalCash += amount;
      } else if (decision.decision_type === 'CAPITAL') {
        totalCapital += amount;
      }

      if (!byBeneficiary[decision.beneficiary_id]) {
        byBeneficiary[decision.beneficiary_id] = {
          cash: 0,
          capital: 0,
          total: 0,
          count: 0
        };
      }

      byBeneficiary[decision.beneficiary_id].total += amount;
      byBeneficiary[decision.beneficiary_id].count += 1;

      if (decision.decision_type === 'CASH') {
        byBeneficiary[decision.beneficiary_id].cash += amount;
      } else {
        byBeneficiary[decision.beneficiary_id].capital += amount;
      }
    });

    // Calculate company share statistics (30%)
    let totalCompanyShare = 0;
    let totalProfit = 0;
    let profitRunsCount = 0;

    const profitRunsArray = Object.values(profitRuns);
    profitRunsArray.forEach(run => {
      const netProfit = parseFloat(run.net_profit_usd) || 0;
      const companyPct = parseFloat(run.company_pct) || 30;
      const companyShare = (netProfit * companyPct) / 100;

      totalProfit += netProfit;
      totalCompanyShare += companyShare;
      profitRunsCount++;
    });

    const totalDistributed = totalCash + totalCapital;
    const totalUndistributed = totalCompanyShare - totalDistributed;
    const distributedPercentage = totalCompanyShare > 0 ? (totalDistributed / totalCompanyShare) * 100 : 0;

    setStatistics({
      totalCash,
      totalCapital,
      totalOperations: filtered.length,
      byBeneficiary,
      companyShareStats: {
        totalCompanyShare,
        totalDistributed,
        totalUndistributed,
        distributedPercentage,
        totalProfit,
        profitRunsCount
      }
    });
  };

  const getFilteredDecisions = () => {
    return decisions.filter(decision => {
      // Filter by beneficiary
      if (selectedBeneficiary !== 'all' && decision.beneficiary_id !== parseInt(selectedBeneficiary)) {
        return false;
      }

      // Filter by decision type
      if (selectedDecisionType !== 'all' && decision.decision_type !== selectedDecisionType) {
        return false;
      }

      // Filter by date range
      if (dateFrom || dateTo) {
        const decisionDate = decision.decided_at || decision.created_at;
        if (!decisionDate) return false;

        const date = new Date(decisionDate);
        if (dateFrom && date < new Date(dateFrom)) return false;
        if (dateTo && date > new Date(dateTo)) return false;
      }

      return true;
    });
  };

  const getBeneficiaryName = (beneficiaryId) => {
    const beneficiary = beneficiaries.find(b => b.id === beneficiaryId);
    return beneficiary ? beneficiary.name : `مستفيد #${beneficiaryId}`;
  };

  const getProfitRunDate = (runId) => {
    const run = profitRuns[runId];
    if (!run) return 'غير معروف';

    const monthValue = run.run_month || run.month;
    const date = new Date(monthValue);
    return date.toLocaleDateString('ar-EG', { year: 'numeric', month: 'long' });
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2
    }).format(amount || 0);
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'غير محدد';
    const date = new Date(dateString);
    return date.toLocaleDateString('ar-EG', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const getDecisionTypeBadge = (type) => {
    if (type === 'CASH') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs font-medium">
          <DollarSign className="w-3 h-3" />
          سحب نقدي
        </span>
      );
    } else if (type === 'CAPITAL') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-medium">
          <TrendingUp className="w-3 h-3" />
          تحويل لرأس المال
        </span>
      );
    }
    return null;
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

  const filteredDecisions = getFilteredDecisions();

  return (
    <Layout>
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-blue-50">
        <div className="max-w-6xl mx-auto p-6">
          {/* Header Section */}
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 p-8 mb-8">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4 rtl:space-x-reverse">
                <button
                  onClick={() => navigate('/profit-distribution')}
                  className="w-12 h-12 bg-gradient-to-br from-gray-400 to-gray-600 rounded-xl flex items-center justify-center hover:from-gray-500 hover:to-gray-700 transition-all duration-200"
                >
                  <ArrowLeft className="w-6 h-6 text-white" />
                </button>
                <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-blue-600 rounded-xl flex items-center justify-center">
                  <Edit3 className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h1 className="text-3xl font-bold text-gray-800">عمليات المستفيدين من حصة الشركة</h1>
                  <p className="text-gray-600 mt-1">عرض شامل لجميع قرارات توزيع حصة الشركة (30%) على المستفيدين</p>
                </div>
              </div>
            </div>
          </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-red-800 font-medium">حدث خطأ</p>
              <p className="text-red-600 text-sm">{error}</p>
            </div>
          </div>
        )}

          {/* Company Share Statistics - Main Overview */}
          <div className="bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 rounded-2xl shadow-2xl p-8 mb-8 text-white">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-2xl font-bold flex items-center">
                  <PieChart className="w-8 h-8 ml-3" />
                  إحصائيات نسبة الشركة (30%)
                </h2>
                <p className="text-purple-100 mt-2">نظرة شاملة على توزيع حصة الشركة من الأرباح</p>
              </div>
              <div className="text-right">
                <p className="text-sm text-purple-100">عدد فترات الربح</p>
                <p className="text-3xl font-bold">{statistics.companyShareStats.profitRunsCount}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              {/* Total Net Profit */}
              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20">
                <div className="flex items-center justify-between mb-3">
                  <BarChart3 className="w-8 h-8 text-yellow-300" />
                </div>
                <p className="text-sm text-purple-100 mb-1">إجمالي صافي الربح</p>
                <p className="text-2xl font-bold">{formatCurrency(statistics.companyShareStats.totalProfit)}</p>
                <p className="text-xs text-purple-200 mt-2">مجموع الأرباح الصافية</p>
              </div>

              {/* Total Company Share (30%) */}
              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20">
                <div className="flex items-center justify-between mb-3">
                  <Percent className="w-8 h-8 text-green-300" />
                </div>
                <p className="text-sm text-purple-100 mb-1">نسبة الشركة الكلية</p>
                <p className="text-2xl font-bold">{formatCurrency(statistics.companyShareStats.totalCompanyShare)}</p>
                <p className="text-xs text-purple-200 mt-2">30% من صافي الربح</p>
              </div>

              {/* Total Distributed */}
              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20">
                <div className="flex items-center justify-between mb-3">
                  <TrendingUp className="w-8 h-8 text-blue-300" />
                </div>
                <p className="text-sm text-purple-100 mb-1">ما تم توزيعه</p>
                <p className="text-2xl font-bold">{formatCurrency(statistics.companyShareStats.totalDistributed)}</p>
                <p className="text-xs text-purple-200 mt-2">
                  {statistics.companyShareStats.distributedPercentage.toFixed(1)}% من نسبة الشركة
                </p>
              </div>

              {/* Total Undistributed */}
              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20">
                <div className="flex items-center justify-between mb-3">
                  <TrendingDownIcon className="w-8 h-8 text-orange-300" />
                </div>
                <p className="text-sm text-purple-100 mb-1">المتبقي للتوزيع</p>
                <p className="text-2xl font-bold">{formatCurrency(statistics.companyShareStats.totalUndistributed)}</p>
                <p className="text-xs text-purple-200 mt-2">
                  {(100 - statistics.companyShareStats.distributedPercentage).toFixed(1)}% من نسبة الشركة
                </p>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="mt-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">نسبة التوزيع</span>
                <span className="text-sm font-bold">{statistics.companyShareStats.distributedPercentage.toFixed(1)}%</span>
              </div>
              <div className="w-full bg-white/20 rounded-full h-4 overflow-hidden">
                <div
                  className="bg-gradient-to-r from-green-400 to-blue-400 h-4 rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(statistics.companyShareStats.distributedPercentage, 100)}%` }}
                />
              </div>
            </div>
          </div>

          {/* Financial Overview Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-emerald-600">إجمالي السحوبات النقدية</p>
                  <p className="text-3xl font-bold text-emerald-600">
                    {formatCurrency(statistics.totalCash)}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">مجموع السحوبات النقدية</p>
                </div>
                <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center">
                  <DollarSign className="w-6 h-6 text-emerald-600" />
                </div>
              </div>
            </div>

            <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-purple-600">إجمالي التحويل لرأس المال</p>
                  <p className="text-3xl font-bold text-purple-600">
                    {formatCurrency(statistics.totalCapital)}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">مجموع التحويلات لرأس المال</p>
                </div>
                <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
                  <TrendingUp className="w-6 h-6 text-purple-600" />
                </div>
              </div>
            </div>

            <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-blue-600">إجمالي العمليات</p>
                  <p className="text-3xl font-bold text-blue-600">
                    {statistics.totalOperations}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">عدد قرارات التوزيع</p>
                </div>
                <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                  <FileText className="w-6 h-6 text-blue-600" />
                </div>
              </div>
            </div>

            <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">المستفيدين</p>
                  <p className="text-3xl font-bold text-gray-600">
                    {beneficiaries.length}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">عدد المستفيدين النشطين</p>
                </div>
                <div className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center">
                  <Users className="w-6 h-6 text-gray-600" />
                </div>
              </div>
            </div>
          </div>

          {/* Detailed Beneficiary Breakdown */}
          {beneficiaries.length > 0 && (
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 p-8 mb-8">
              <h3 className="text-xl font-bold text-gray-800 mb-6 flex items-center">
                <Users className="w-6 h-6 text-indigo-600 ml-2" />
                تفصيل كل مستفيد
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {beneficiaries.map(beneficiary => {
                  const beneficiaryStats = statistics.byBeneficiary[beneficiary.id] || {
                    cash: 0,
                    capital: 0,
                    total: 0,
                    count: 0
                  };

                  // Calculate total percentage of all beneficiaries
                  const totalBeneficiaryPercentage = beneficiaries.reduce((sum, b) => sum + parseFloat(b.percentage || 0), 0);

                  // Calculate beneficiary's potential share from total company share
                  // Formula: (beneficiary_percentage / total_beneficiaries_percentage) * total_company_share
                  const beneficiaryPotentialShare = totalBeneficiaryPercentage > 0
                    ? (statistics.companyShareStats.totalCompanyShare * beneficiary.percentage) / totalBeneficiaryPercentage
                    : 0;

                  const beneficiaryDistributedPct = beneficiaryPotentialShare > 0
                    ? (beneficiaryStats.total / beneficiaryPotentialShare) * 100
                    : 0;
                  const beneficiaryUndistributed = beneficiaryPotentialShare - beneficiaryStats.total;

                  return (
                    <div key={beneficiary.id} className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl p-6 border border-gray-200 hover:shadow-lg transition-shadow">
                      <div className="flex items-start justify-between mb-4">
                        <div>
                          <h4 className="text-lg font-bold text-gray-800">{beneficiary.name}</h4>
                          <p className="text-sm text-gray-600">نسبة: {beneficiary.percentage}%</p>
                        </div>
                        <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center">
                          <User className="w-5 h-5 text-indigo-600" />
                        </div>
                      </div>

                      {/* Stats Grid */}
                      <div className="space-y-3 mb-4">
                        <div className="flex items-center justify-between p-3 bg-white rounded-lg">
                          <span className="text-sm text-gray-600">الحصة المستحقة</span>
                          <span className="font-bold text-gray-800">{formatCurrency(beneficiaryPotentialShare)}</span>
                        </div>

                        <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                          <span className="text-sm text-green-700">ما تم توزيعه</span>
                          <span className="font-bold text-green-700">{formatCurrency(beneficiaryStats.total)}</span>
                        </div>

                        <div className="flex items-center justify-between p-3 bg-orange-50 rounded-lg">
                          <span className="text-sm text-orange-700">المتبقي</span>
                          <span className="font-bold text-orange-700">{formatCurrency(beneficiaryUndistributed)}</span>
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                          <div className="p-2 bg-emerald-50 rounded-lg text-center">
                            <p className="text-xs text-emerald-600">سحب نقدي</p>
                            <p className="text-sm font-bold text-emerald-700">{formatCurrency(beneficiaryStats.cash)}</p>
                          </div>
                          <div className="p-2 bg-blue-50 rounded-lg text-center">
                            <p className="text-xs text-blue-600">رأس المال</p>
                            <p className="text-sm font-bold text-blue-700">{formatCurrency(beneficiaryStats.capital)}</p>
                          </div>
                        </div>

                        <div className="p-3 bg-purple-50 rounded-lg">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-xs text-purple-700">عدد العمليات</span>
                            <span className="text-sm font-bold text-purple-700">{beneficiaryStats.count}</span>
                          </div>
                        </div>
                      </div>

                      {/* Progress Bar */}
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs text-gray-600">نسبة التوزيع</span>
                          <span className="text-xs font-bold text-gray-800">{beneficiaryDistributedPct.toFixed(1)}%</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                          <div
                            className="bg-gradient-to-r from-indigo-500 to-purple-500 h-2 rounded-full transition-all duration-500"
                            style={{ width: `${Math.min(beneficiaryDistributedPct, 100)}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Beneficiary Operations Section */}
          <BeneficiaryOperationsComponent
            beneficiaries={beneficiaries}
            decisions={decisions}
            profitRuns={profitRuns}
            onOperationComplete={fetchData}
          />

          {/* Movement History Section */}
          <div className="mt-8">
            <BeneficiaryMovementHistory decisions={decisions} beneficiaries={beneficiaries} profitRuns={profitRuns} />
          </div>

        </div>
      </div>
    </Layout>
  );
};

export default BeneficiaryOperations;
