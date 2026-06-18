import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import { profitAPI } from '../services/api';
import ProtectedComponent from '../components/ProtectedComponent';
import { PERMISSIONS } from '../utils/permissions';
import { useToast } from '../components/ui/Toast';
import { useConfirmations } from '../components/ui/ConfirmDialog';

const normalizeMonthValue = (value) => {
  if (!value) return '';
  const trimmed = value.trim();
  if (trimmed.length >= 10) {
    return trimmed.slice(0, 10);
  }
  if (/^\d{4}-\d{2}$/.test(trimmed)) {
    return `${trimmed}-01`;
  }
  return trimmed;
};

const ProfitDistribution = () => {
  const navigate = useNavigate();
  const { success, error: toastError } = useToast();
  const { confirmCustom } = useConfirmations();
  const [distributions, setDistributions] = useState([]);
  const [selectedMonth, setSelectedMonth] = useState('');
  const [selectedDistribution, setSelectedDistribution] = useState(null);
  const [showSimulation, setShowSimulation] = useState(false);
  const [simulation, setSimulation] = useState({
    target_month: '',
    net_profit: '',
    method: 'TWCap'
  });
  const [simulationResult, setSimulationResult] = useState(null);
  const [config, setConfig] = useState({
    company_pct: 30,
    reserve_rate: 0,
    use_time_weight: true,
    unusual_lookback: 6
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [actionMessage, setActionMessage] = useState(null);
  const [actionError, setActionError] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [editModal, setEditModal] = useState({
    open: false,
    run: null,
    method: 'TWCap',
    company_pct: '',
    reserve_rate: '',
    use_time_weight: true,
    reason: '',
    confirmText: ''
  });
  const [deleteModal, setDeleteModal] = useState({
    open: false,
    run: null,
    reason: '',
    confirmText: ''
  });

  // States for beneficiary allocations
  const [beneficiaryAllocations, setBeneficiaryAllocations] = useState(null);
  const [beneficiaryDecisions, setBeneficiaryDecisions] = useState({});
  const [partners, setPartners] = useState([]);
  const [savingDecisions, setSavingDecisions] = useState(false);

  useEffect(() => {
    fetchProfitHistory();
    fetchConfig();
  }, []);

  useEffect(() => {
    if (!actionMessage) return;
    const timer = setTimeout(() => setActionMessage(null), 5000);
    return () => clearTimeout(timer);
  }, [actionMessage]);

  useEffect(() => {
    if (selectedDistribution && selectedDistribution.run_id) {
      fetchBeneficiaryAllocations(selectedDistribution.run_id);
      fetchPartners();
    } else {
      setBeneficiaryAllocations(null);
      setBeneficiaryDecisions({});
    }
  }, [selectedDistribution]);

  const fetchProfitHistory = async () => {
    try {
      setLoading(true);
      const data = await profitAPI.getHistory(12);
      setDistributions(Array.isArray(data) ? data : []);
      setError(null);
    } catch (error) {
      console.error('خطأ في جلب تاريخ الأرباح:', error);
      const detail = error?.response?.data?.detail || error?.message || 'فشل في جلب بيانات الأرباح';
      setError(detail);
      setDistributions([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchConfig = async () => {
    try {
      const data = await profitAPI.getConfig();
      setConfig(data);
    } catch (error) {
      console.error('خطأ في جلب الإعدادات:', error);
      // Use default config
    }
  };

  const fetchBeneficiaryAllocations = async (runId) => {
    try {
      const token = localStorage.getItem('access_token') || sessionStorage.getItem('access_token');
      const response = await fetch(`/api/profit-distribution/profit-run/${runId}/beneficiary-allocations`, {
        headers: {
          'Authorization': token ? `Bearer ${token}` : ''
        }
      });
      if (response.ok) {
        const data = await response.json();
        setBeneficiaryAllocations(data);
        // Initialize decisions from existing decisions
        const decisions = {};
        data.beneficiaries?.forEach(b => {
          if (b.decision) {
            decisions[b.beneficiary_id] = {
              type: b.decision.type,
              partner_id: b.decision.partner_id,
              notes: b.decision.notes || ''
            };
          } else {
            decisions[b.beneficiary_id] = {
              type: 'CASH',
              partner_id: null,
              notes: ''
            };
          }
        });
        setBeneficiaryDecisions(decisions);
      }
    } catch (error) {
      console.error('Error fetching beneficiary allocations:', error);
    }
  };

  const fetchPartners = async () => {
    try {
      const token = localStorage.getItem('access_token') || sessionStorage.getItem('access_token');
      const response = await fetch('/api/partners', {
        headers: {
          'Authorization': token ? `Bearer ${token}` : ''
        }
      });
      if (response.ok) {
        const data = await response.json();
        setPartners(Array.isArray(data) ? data : []);
      }
    } catch (error) {
      console.error('Error fetching partners:', error);
    }
  };

  const handleDecisionChange = (beneficiaryId, field, value) => {
    setBeneficiaryDecisions(prev => ({
      ...prev,
      [beneficiaryId]: {
        ...prev[beneficiaryId],
        [field]: value
      }
    }));
  };

  const saveBeneficiaryDecisions = async () => {
    if (!beneficiaryAllocations) return;

    setSavingDecisions(true);
    try {
      const promises = beneficiaryAllocations.beneficiaries.map(async (beneficiary) => {
        const decision = beneficiaryDecisions[beneficiary.beneficiary_id];
        if (!decision) return;

        const payload = {
          profit_run_id: beneficiaryAllocations.profit_run_id,
          beneficiary_id: beneficiary.beneficiary_id,
          amount_usd: beneficiary.allocated_amount,
          decision_type: decision.type,
          partner_id: decision.type === 'CAPITAL' ? decision.partner_id : null,
          notes: decision.notes,
          decided_at: new Date().toISOString().split('T')[0]
        };

        // Check if decision exists
        if (beneficiary.has_decision && beneficiary.decision?.id) {
          // Update existing decision
          const token = localStorage.getItem('access_token') || sessionStorage.getItem('access_token');
          const response = await fetch(`/api/profit-distribution/decisions/${beneficiary.decision.id}`, {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': token ? `Bearer ${token}` : ''
            },
            body: JSON.stringify({
              amount_usd: payload.amount_usd,
              decision_type: payload.decision_type,
              partner_id: payload.partner_id,
              notes: payload.notes,
              decided_at: payload.decided_at
            })
          });
          if (!response.ok) throw new Error('Failed to update decision');
        } else {
          // Create new decision
          const token = localStorage.getItem('access_token') || sessionStorage.getItem('access_token');
          const response = await fetch('/api/profit-distribution/decisions', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': token ? `Bearer ${token}` : ''
            },
            body: JSON.stringify(payload)
          });
          if (!response.ok) throw new Error('Failed to create decision');
        }
      });

      await Promise.all(promises);
      setActionMessage('تم حفظ قرارات التوزيع بنجاح');
      // Refresh allocations
      fetchBeneficiaryAllocations(beneficiaryAllocations.profit_run_id);
    } catch (error) {
      console.error('Error saving decisions:', error);
      setActionError('فشل في حفظ القرارات: ' + error.message);
    } finally {
      setSavingDecisions(false);
    }
  };

  const runProfitDistribution = async () => {
    if (!selectedMonth) {
      toastError('يرجى اختيار الشهر');
      return;
    }

    setLoading(true);
    try {
      const normalizedMonth = normalizeMonthValue(selectedMonth);
      const result = await profitAPI.runDistribution(normalizedMonth, 'TWCap');

      if (result.success) {
        success('تم توزيع الأرباح بنجاح');
        fetchProfitHistory();
        setSelectedMonth('');
      }
    } catch (error) {
      const errorMessage = error.response?.data?.detail || error.message;
      toastError(`خطأ في توزيع الأرباح: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };

  const fetchDistributionDetails = async (month) => {
    try {
      const data = await profitAPI.getDistribution(normalizeMonthValue(month));
      setSelectedDistribution(data);
    } catch (error) {
      console.error('خطأ في جلب تفاصيل التوزيع:', error);
      toastError(`خطأ في جلب تفاصيل التوزيع: ${error.message}`);
    }
  };

  const simulateDistribution = async () => {
    if (!simulation.target_month || !simulation.net_profit) {
      toastError('يرجى ملء جميع البيانات');
      return;
    }

    try {
      const result = await profitAPI.simulate(
        normalizeMonthValue(simulation.target_month),
        parseFloat(simulation.net_profit),
        simulation.method
      );
      setSimulationResult(result);
    } catch (error) {
      const errorMessage = error.response?.data?.detail || error.message;
      toastError(`خطأ في المحاكاة: ${errorMessage}`);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount || 0);
  };

  const formatDate = (dateString) => {
    if (!dateString) return '';
    const normalized = normalizeMonthValue(dateString);
    const dateObj = new Date(normalized);
    if (Number.isNaN(dateObj.getTime())) return '';
    return dateObj.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long'
    });
  };

  const formatNumber = (value) => new Intl.NumberFormat('en-US').format(value || 0);

  const formatDateTime = (value) => {
    if (!value) return '';
    const dateObj = new Date(value);
    if (Number.isNaN(dateObj.getTime())) return '';
    return dateObj.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const safeNumber = (value) => {
    const num = Number(value);
    return Number.isFinite(num) ? num : 0;
  };

  const openEditModal = async (dist) => {
    try {
      setActionError(null);
      const details = await profitAPI.getDistribution(normalizeMonthValue(dist.month));
      setEditModal({
        open: true,
        run: { ...dist, ...details },
        method: details.method || dist.method || 'TWCap',
        company_pct: details.company_pct !== undefined ? Number(details.company_pct) : Number(config.company_pct || 30),
        reserve_rate: details.reserve_rate !== undefined ? Number(details.reserve_rate) : Number(config.reserve_rate || 0),
        use_time_weight: details.use_time_weight !== undefined ? details.use_time_weight : config.use_time_weight,
        reason: '',
        confirmText: ''
      });
    } catch (err) {
      setActionError(err.response?.data?.detail || err.message);
    }
  };

  const openDeleteModal = (dist) => {
    setActionError(null);
    setDeleteModal({
      open: true,
      run: dist,
      reason: '',
      confirmText: ''
    });
  };

  const closeModals = () => {
    setActionError(null);
    setEditModal({
      open: false,
      run: null,
      method: 'TWCap',
      company_pct: '',
      reserve_rate: '',
      use_time_weight: true,
      reason: '',
      confirmText: ''
    });
    setDeleteModal({
      open: false,
      run: null,
      reason: '',
      confirmText: ''
    });
  };

  const handleEditSubmit = async () => {
    if (!editModal.run || actionLoading) return;
    setActionError(null);
    if (!editModal.reason || editModal.reason.trim().length < 10) {
      setActionError('يرجى كتابة سبب واضح (10 أحرف على الأقل).');
      return;
    }
    if (editModal.confirmText.trim().toUpperCase() !== 'CONFIRM') {
      setActionError('اكتب CONFIRM بالأحرف الإنجليزية للموافقة على التعديل.');
      return;
    }

    const payload = {
      reason: editModal.reason.trim(),
      method: editModal.method,
      company_pct: editModal.company_pct !== '' ? Number(editModal.company_pct) : undefined,
      reserve_rate: editModal.reserve_rate !== '' ? Number(editModal.reserve_rate) : undefined,
      use_time_weight: editModal.use_time_weight
    };

    try {
      setActionLoading(true);
      await profitAPI.updateDistribution(editModal.run.run_id || editModal.run.id, payload);
      setActionMessage('تم تعديل توزيع الأرباح بنجاح.');
      closeModals();
      await fetchProfitHistory();
      if (editModal.run?.month) {
        fetchDistributionDetails(editModal.run.month);
      }
    } catch (err) {
      setActionError(err.response?.data?.detail || err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteSubmit = async () => {
    if (!deleteModal.run || actionLoading) return;
    setActionError(null);
    if (!deleteModal.reason || deleteModal.reason.trim().length < 15) {
      setActionError('يجب كتابة سبب لا يقل عن 15 حرفاً قبل الحذف.');
      return;
    }
    if (deleteModal.confirmText.trim().toUpperCase() !== 'DELETE') {
      setActionError('اكتب DELETE بالأحرف الإنجليزية لتأكيد الحذف.');
      return;
    }

    try {
      setActionLoading(true);
      await profitAPI.deleteDistribution(deleteModal.run.run_id || deleteModal.run.id, {
        reason: deleteModal.reason.trim()
      });
      setActionMessage('تم حذف توزيع الأرباح بنجاح.');
      if (selectedDistribution && normalizeMonthValue(selectedDistribution.month) === normalizeMonthValue(deleteModal.run.month)) {
        setSelectedDistribution(null);
      }
      closeModals();
      await fetchProfitHistory();
    } catch (err) {
      setActionError(err.response?.data?.detail || err.message);
    } finally {
      setActionLoading(false);
    }
  };

  // Calculate statistics
  const totalDistributions = distributions.length;
  const totalProfit = distributions.reduce((sum, dist) => sum + (parseFloat(dist.net_profit) || 0), 0);
  const totalCompanyShare = distributions.reduce((sum, dist) => sum + (parseFloat(dist.company_share) || 0), 0);
  const totalPartnersShare = distributions.reduce((sum, dist) => sum + (parseFloat(dist.partners_total) || 0), 0);
  const averageProfit = totalDistributions > 0 ? totalProfit / totalDistributions : 0;
  const lastDistribution = distributions[0];

  const recentDistributions = useMemo(() => distributions.slice(0, 5), [distributions]);

  if (loading && distributions.length === 0) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">توزيع الأرباح</h1>
          <p className="text-gray-600">إدارة وتوزيع الأرباح الشهرية على الشركاء والشركة</p>
        </div>

        {actionMessage && (
          <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg">
            {actionMessage}
          </div>
        )}
        {actionError && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
            {actionError}
          </div>
        )}

        {/* Error Alert */}
        {error && (
          <div className="bg-gradient-to-br from-red-50 to-orange-100 rounded-xl p-4 border border-orange-200 mb-6">
            <div className="flex items-center">
              <div className="p-2 bg-orange-200 rounded-full mr-3">
                <svg className="w-5 h-5 text-orange-800" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="text-orange-800 font-medium text-sm">
                {error}
              </div>
              <button
                onClick={() => setError(null)}
                className="mr-auto text-orange-600 hover:text-orange-800"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        )}

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
          <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-6 border border-blue-200">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-medium text-blue-800 mb-1">آخر توزيع أرباح</h3>
                <p className="text-2xl font-bold text-blue-900">
                  {lastDistribution ? formatCurrency(lastDistribution.net_profit) : 'لا يوجد'}
                </p>
                <p className="text-xs text-blue-600 mt-1">
                  {lastDistribution ? formatDate(lastDistribution.month) : ''}
                </p>
              </div>
              <div className="p-3 bg-blue-200 rounded-full">
                <svg className="w-6 h-6 text-blue-800" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-6 border border-green-200">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-medium text-green-800 mb-1">إجمالي الأرباح</h3>
                <p className="text-2xl font-bold text-green-900">{formatCurrency(totalProfit)}</p>
                <p className="text-xs text-green-600 mt-1">{formatNumber(totalDistributions)} توزيع</p>
              </div>
              <div className="p-3 bg-green-200 rounded-full">
                <svg className="w-6 h-6 text-green-800" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl p-6 border border-purple-200">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-medium text-purple-800 mb-1">حصة الشركة</h3>
                <p className="text-2xl font-bold text-purple-900">{formatCurrency(totalCompanyShare)}</p>
                <p className="text-xs text-purple-600 mt-1">{config.company_pct}% من الأرباح</p>
              </div>
              <div className="p-3 bg-purple-200 rounded-full">
                <svg className="w-6 h-6 text-purple-800" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-xl p-6 border border-orange-200">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-medium text-orange-800 mb-1">حصة الشركاء</h3>
                <p className="text-2xl font-bold text-orange-900">{formatCurrency(totalPartnersShare)}</p>
                <p className="text-xs text-orange-600 mt-1">{100 - config.company_pct}% من الأرباح</p>
              </div>
              <div className="p-3 bg-orange-200 rounded-full">
                <svg className="w-6 h-6 text-orange-800" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          <div className="space-y-6 xl:col-span-2">
            {/* Profit Distribution Actions */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                <div>
                  <h2 className="text-xl font-semibold text-gray-900">توزيع أرباح جديد</h2>
                  <p className="text-sm text-gray-500 mt-1">قم بتشغيل توزيع الأرباح لشهر معين</p>
                </div>
              </div>

              <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">اختر الشهر</label>
                  <input
                    type="month"
                    value={selectedMonth}
                    onChange={(e) => setSelectedMonth(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div className="flex items-end">
                  <ProtectedComponent permission={PERMISSIONS.MANAGE_PROFIT_DISTRIBUTION}>
                    <button
                      onClick={runProfitDistribution}
                      disabled={loading || !selectedMonth}
                      className="w-full inline-flex items-center justify-center px-4 py-2 text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 disabled:bg-gray-400 transition-colors duration-150"
                    >
                      {loading ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                          جاري التوزيع...
                        </>
                      ) : (
                        'تشغيل توزيع الأرباح'
                      )}
                    </button>
                  </ProtectedComponent>
                </div>
              </div>
            </div>

            {/* Recent Distributions */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold text-gray-900">آخر توزيعات الأرباح</h2>
                <div className="flex gap-2">
                  <button
                    onClick={() => navigate('/beneficiary-operations')}
                    className="inline-flex items-center px-4 py-2 text-sm font-medium rounded-md text-purple-700 bg-purple-100 hover:bg-purple-200 transition-colors duration-150"
                  >
                    <svg className="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                    </svg>
                    عمليات المستفيدين
                  </button>
                  <button
                    onClick={() => setShowSimulation(!showSimulation)}
                    className="inline-flex items-center px-4 py-2 text-sm font-medium rounded-md text-blue-700 bg-blue-100 hover:bg-blue-200 transition-colors duration-150"
                  >
                    محاكاة توزيع
                  </button>
                </div>
              </div>

              {showSimulation && (
                <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">محاكاة توزيع الأرباح</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">الشهر المستهدف</label>
                      <input
                        type="month"
                        value={simulation.target_month}
                        onChange={(e) => setSimulation({...simulation, target_month: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">صافي الربح</label>
                      <input
                        type="number"
                        value={simulation.net_profit}
                        onChange={(e) => setSimulation({...simulation, net_profit: e.target.value})}
                        placeholder="مبلغ الربح"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div className="flex items-end">
                      <button
                        onClick={simulateDistribution}
                        className="w-full inline-flex items-center justify-center px-4 py-2 text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 transition-colors duration-150"
                      >
                        تشغيل المحاكاة
                      </button>
                    </div>
                  </div>

                  {simulationResult && (
                    <div className="mt-4 p-4 bg-white rounded-lg border">
                      <h4 className="font-medium text-gray-900 mb-2">نتيجة المحاكاة:</h4>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                        <div>
                          <span className="text-gray-600">حصة الشركة:</span>
                          <span className="font-medium mr-2">{formatCurrency(simulationResult.company_share)}</span>
                        </div>
                        <div>
                          <span className="text-gray-600">حصة الشركاء:</span>
                          <span className="font-medium mr-2">{formatCurrency(simulationResult.partners_total)}</span>
                        </div>
                        <div>
                          <span className="text-gray-600">عدد الشركاء:</span>
                          <span className="font-medium mr-2">{simulationResult.partner_distributions?.length || 0}</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              <div className="overflow-hidden border border-gray-200 rounded-xl">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">الشهر</th>
                      <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">صافي الربح</th>
                      <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">حصة الشركة</th>
                      <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">حصة الشركاء</th>
                      <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">تاريخ التوزيع</th>
                      <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">إجراءات</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {distributions.length === 0 ? (
                      <tr>
                        <td colSpan="6" className="px-6 py-12 text-center text-sm text-gray-500">
                          لم يتم تسجيل أي توزيعات أرباح حتى الآن
                        </td>
                      </tr>
                    ) : (
                      distributions.map((dist) => (
                        <tr key={dist.run_id || dist.month}>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900">{formatDate(dist.month)}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-semibold text-green-600">{formatCurrency(dist.net_profit)}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-purple-600">{formatCurrency(dist.company_share)}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-orange-600">{formatCurrency(dist.partners_total)}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {formatDateTime(dist.created_at)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                            <div className="flex flex-wrap gap-2">
                              <button
                                className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md text-blue-700 bg-blue-100 hover:bg-blue-200 transition-colors duration-150"
                                onClick={() => fetchDistributionDetails(dist.month)}
                              >
                                عرض التفاصيل
                              </button>
                              <ProtectedComponent permission={PERMISSIONS.MANAGE_PROFIT_DISTRIBUTION}>
                                <button
                                  className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md text-purple-700 bg-purple-100 hover:bg-purple-200 transition-colors duration-150"
                                  onClick={() => openEditModal(dist)}
                                >
                                  تعديل
                                </button>
                                <button
                                  className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md text-red-700 bg-red-100 hover:bg-red-200 transition-colors duration-150"
                                  onClick={() => openDeleteModal(dist)}
                                >
                                  حذف
                                </button>
                              </ProtectedComponent>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">إعدادات التوزيع</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">نسبة الشركة</label>
                  <div className="text-2xl font-bold text-purple-600">{config.company_pct}%</div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">نسبة الشركاء</label>
                  <div className="text-2xl font-bold text-orange-600">{100 - config.company_pct}%</div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">الطريقة</label>
                  <div className="text-sm text-gray-600">
                    {config.use_time_weight ? 'توزيع زمني موزون' : 'توزيع لحظي'}
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">إحصائيات سريعة</h3>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">متوسط الربح الشهري</span>
                  <span className="font-medium text-gray-900">{formatCurrency(averageProfit)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">عدد التوزيعات</span>
                  <span className="font-medium text-gray-900">{formatNumber(totalDistributions)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">آخر توزيع</span>
                  <span className="font-medium text-gray-900">
                    {lastDistribution ? formatDate(lastDistribution.month) : 'لا يوجد'}
                  </span>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">تفاصيل التوزيع</h3>
                {selectedDistribution && (
                  <button
                    onClick={() => setSelectedDistribution(null)}
                    className="text-xs text-red-600 hover:text-red-800"
                  >
                    إغلاق
                  </button>
                )}
              </div>

              {!selectedDistribution ? (
                <p className="text-sm text-gray-500">
                  اختر «عرض التفاصيل» من الجدول لعرض البيانات التفصيلية للتوزيع.
                </p>
              ) : (
                <div className="space-y-4">
                  <div className="space-y-2 text-sm text-gray-600">
                    <div className="flex justify-between">
                      <span>الشهر</span>
                      <span className="font-medium text-gray-900">{formatDate(selectedDistribution.month)}</span>
                    </div>
                    {'net_profit' in selectedDistribution && (
                      <div className="flex justify-between">
                        <span>صافي الربح</span>
                        <span className="font-medium text-green-600">
                          {formatCurrency(safeNumber(selectedDistribution.net_profit))}
                        </span>
                      </div>
                    )}
                    {'company_share' in selectedDistribution && (
                      <div className="flex justify-between">
                        <span>حصة الشركة</span>
                        <span className="font-medium text-purple-600">
                          {formatCurrency(safeNumber(selectedDistribution.company_share))}
                        </span>
                      </div>
                    )}
                    {'partners_total' in selectedDistribution && (
                      <div className="flex justify-between">
                        <span>حصة الشركاء</span>
                        <span className="font-medium text-orange-600">
                          {formatCurrency(safeNumber(selectedDistribution.partners_total))}
                        </span>
                      </div>
                    )}
                    {'reserve_amount' in selectedDistribution && (
                      <div className="flex justify-between">
                        <span>الاحتياطي</span>
                        <span className="font-medium text-gray-900">
                          {formatCurrency(safeNumber(selectedDistribution.reserve_amount))}
                        </span>
                      </div>
                    )}
                    {'method' in selectedDistribution && (
                      <div className="flex justify-between">
                        <span>طريقة الحساب</span>
                        <span className="font-medium text-gray-900">
                          {selectedDistribution.method === 'TWCap' ? 'توزيع زمني موزون' : 'توزيع لحظي'}
                        </span>
                      </div>
                    )}
                    {'your_share' in selectedDistribution && !selectedDistribution.distribution_lines && (
                      <div className="flex justify-between">
                        <span>حصتك</span>
                        <span className="font-medium text-blue-600">
                          {formatCurrency(safeNumber(selectedDistribution.your_share))}
                        </span>
                      </div>
                    )}
                  </div>

                  {Array.isArray(selectedDistribution.alerts) && selectedDistribution.alerts.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="text-sm font-semibold text-gray-800">التنبيهات</h4>
                      <ul className="space-y-1 text-sm">
                        {selectedDistribution.alerts.map((alert, idx) => (
                          <li key={idx} className="flex items-start gap-2 text-gray-600">
                            <span className="mt-1">•</span>
                            <span>
                              <span className="font-medium text-gray-800">{alert.level}</span> — {alert.message}
                              {alert.partner_name ? ` (${alert.partner_name})` : ''}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm text-gray-600">
                    {'company_pct' in selectedDistribution && (
                      <div className="flex justify-between">
                        <span>نسبة الشركة المستخدمة</span>
                        <span className="font-medium text-purple-600">{formatNumber(safeNumber(selectedDistribution.company_pct))}%</span>
                      </div>
                    )}
                    {'reserve_rate' in selectedDistribution && (
                      <div className="flex justify-between">
                        <span>نسبة الاحتياطي</span>
                        <span className="font-medium text-gray-900">{formatNumber(safeNumber(selectedDistribution.reserve_rate))}%</span>
                      </div>
                    )}
                    {'use_time_weight' in selectedDistribution && (
                      <div className="flex justify-between">
                        <span>الوزن الزمني مفعَّل؟</span>
                        <span className="font-medium text-gray-900">{selectedDistribution.use_time_weight ? 'نعم' : 'لا'}</span>
                      </div>
                    )}
                  </div>

                  {Array.isArray(selectedDistribution.distribution_lines) && selectedDistribution.distribution_lines.length > 0 && (
                    <div className="overflow-hidden border border-gray-200 rounded-lg">
                      <table className="min-w-full divide-y divide-gray-200 text-sm">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wide">الشريك</th>
                            <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wide">النسبة</th>
                            <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wide">المبلغ</th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {selectedDistribution.distribution_lines.map((line) => (
                            <tr key={line.partner_id || line.partner_name}>
                              <td className="px-4 py-2 text-gray-900">{line.partner_name || line.partner_id}</td>
                              <td className="px-4 py-2 text-gray-600">
                                {formatNumber(safeNumber(line.weight_used ?? line.weight ?? 0) * 100)}%
                              </td>
                              <td className="px-4 py-2 text-gray-900">
                                {formatCurrency(safeNumber(line.amount_usd ?? line.amount ?? 0))}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {/* Beneficiary Allocations Section */}
                  {beneficiaryAllocations && beneficiaryAllocations.beneficiaries && beneficiaryAllocations.beneficiaries.length > 0 && (
                    <div className="mt-6 space-y-4">
                      <div className="flex items-center justify-between">
                        <h4 className="text-sm font-semibold text-purple-800">توزيع حصة الشركة - المستفيدون</h4>
                        <span className="text-xs text-gray-500">
                          إجمالي: {formatCurrency(beneficiaryAllocations.company_share_usd)}
                        </span>
                      </div>

                      <div className="space-y-3">
                        {beneficiaryAllocations.beneficiaries.map((beneficiary) => {
                          const decision = beneficiaryDecisions[beneficiary.beneficiary_id] || { type: 'CASH', partner_id: null, notes: '' };
                          return (
                            <div key={beneficiary.beneficiary_id} className="bg-purple-50 border border-purple-200 rounded-lg p-4 space-y-3">
                              <div className="flex items-center justify-between">
                                <div>
                                  <h5 className="font-medium text-gray-900">{beneficiary.beneficiary_name}</h5>
                                  <p className="text-xs text-gray-600">
                                    {beneficiary.percentage}% من حصة الشركة = {formatCurrency(beneficiary.allocated_amount)}
                                  </p>
                                </div>
                                {beneficiary.has_decision && (
                                  <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
                                    تم اتخاذ القرار
                                  </span>
                                )}
                              </div>

                              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                <div>
                                  <label className="block text-xs font-medium text-gray-700 mb-1">نوع القرار</label>
                                  <div className="flex gap-4">
                                    <label className="flex items-center gap-2 cursor-pointer">
                                      <input
                                        type="radio"
                                        name={`decision_type_${beneficiary.beneficiary_id}`}
                                        value="CASH"
                                        checked={decision.type === 'CASH'}
                                        onChange={(e) => handleDecisionChange(beneficiary.beneficiary_id, 'type', e.target.value)}
                                        className="text-purple-600"
                                      />
                                      <span className="text-sm text-gray-700">سحب نقدي</span>
                                    </label>
                                    <label className="flex items-center gap-2 cursor-pointer">
                                      <input
                                        type="radio"
                                        name={`decision_type_${beneficiary.beneficiary_id}`}
                                        value="CAPITAL"
                                        checked={decision.type === 'CAPITAL'}
                                        onChange={(e) => handleDecisionChange(beneficiary.beneficiary_id, 'type', e.target.value)}
                                        className="text-purple-600"
                                      />
                                      <span className="text-sm text-gray-700">تحويل لرأس المال</span>
                                    </label>
                                  </div>
                                </div>

                                {decision.type === 'CAPITAL' && (
                                  <div>
                                    <label className="block text-xs font-medium text-gray-700 mb-1">اختر الشريك</label>
                                    <select
                                      value={decision.partner_id || ''}
                                      onChange={(e) => handleDecisionChange(beneficiary.beneficiary_id, 'partner_id', e.target.value ? parseInt(e.target.value) : null)}
                                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                                      required
                                    >
                                      <option value="">-- اختر شريك --</option>
                                      {partners.map(partner => (
                                        <option key={partner.id} value={partner.id}>
                                          {partner.name}
                                        </option>
                                      ))}
                                    </select>
                                  </div>
                                )}
                              </div>

                              <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">ملاحظات (اختياري)</label>
                                <input
                                  type="text"
                                  value={decision.notes}
                                  onChange={(e) => handleDecisionChange(beneficiary.beneficiary_id, 'notes', e.target.value)}
                                  placeholder="أضف ملاحظات..."
                                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                                />
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      <button
                        onClick={saveBeneficiaryDecisions}
                        disabled={savingDecisions}
                        className="w-full bg-purple-600 hover:bg-purple-700 disabled:bg-purple-300 text-white font-medium py-2 px-4 rounded-lg transition-colors"
                      >
                        {savingDecisions ? 'جاري الحفظ...' : 'حفظ قرارات التوزيع'}
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {editModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm px-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-purple-200 max-w-2xl w-full p-6 space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-xl font-bold text-gray-900">تعديل توزيع الأرباح</h3>
                <p className="text-sm text-gray-600 mt-1">
                  إعادة التوزيع ستحذف النتائج الحالية وتعيد احتسابها. يرجى التأكد قبل المتابعة.
                </p>
              </div>
              <button
                onClick={closeModals}
                className="text-gray-500 hover:text-gray-700"
                aria-label="إغلاق"
              >
                ✕
              </button>
            </div>

            <div className="bg-orange-50 border border-orange-200 text-orange-800 rounded-xl p-4 text-sm space-y-2">
              <p className="font-semibold">تحذير صارم:</p>
              <ul className="list-disc list-inside space-y-1">
                <li>سيتم استبدال جميع مبالغ الشركاء والملاحظات الحالية بالنتائج الجديدة.</li>
                <li>يُسجَّل سبب التعديل في سجل النظام ويمكن مراجعته لاحقاً.</li>
                <li>لن يمكن التراجع عن العملية إلا بإعادة التوزيع أو الحذف الكامل.</li>
              </ul>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">الطريقة</label>
                <select
                  value={editModal.method}
                  onChange={(e) => setEditModal((prev) => ({ ...prev, method: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  <option value="TWCap">توزيع زمني موزون (TWCap)</option>
                  <option value="Instant">توزيع لحظي (Instant)</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">نسبة الشركة (%)</label>
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={editModal.company_pct}
                  onChange={(e) => setEditModal((prev) => ({ ...prev, company_pct: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">نسبة الاحتياطي (%)</label>
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={editModal.reserve_rate}
                  onChange={(e) => setEditModal((prev) => ({ ...prev, reserve_rate: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>
              <div className="flex items-center gap-2">
                <input
                  id="use-time-weight"
                  type="checkbox"
                  checked={editModal.use_time_weight}
                  onChange={(e) => setEditModal((prev) => ({ ...prev, use_time_weight: e.target.checked }))}
                  className="h-4 w-4 text-purple-600 border-gray-300 rounded"
                />
                <label htmlFor="use-time-weight" className="text-sm text-gray-700">تطبيق الوزن الزمني للشركاء عند استخدام TWCap</label>
              </div>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">السبب التفصيلي</label>
                <textarea
                  rows={3}
                  value={editModal.reason}
                  onChange={(e) => setEditModal((prev) => ({ ...prev, reason: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder="اشرح لماذا يتم تعديل التوزيع (10 أحرف على الأقل)"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">تأكيد صريح</label>
                <input
                  type="text"
                  value={editModal.confirmText}
                  onChange={(e) => setEditModal((prev) => ({ ...prev, confirmText: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder="اكتب CONFIRM بالأحرف الإنجليزية"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3">
              <button
                className="px-4 py-2 rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-100"
                onClick={closeModals}
                disabled={actionLoading}
              >
                إلغاء
              </button>
              <button
                className="px-5 py-2 rounded-lg bg-purple-600 text-white hover:bg-purple-700 disabled:bg-purple-300"
                onClick={handleEditSubmit}
                disabled={actionLoading}
              >
                {actionLoading ? 'جاري التعديل...' : 'حفظ التعديل'}
              </button>
            </div>
          </div>
        </div>
      )}

      {deleteModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-red-200 max-w-xl w-full p-6 space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-xl font-bold text-gray-900">حذف توزيع الأرباح</h3>
                <p className="text-sm text-gray-600 mt-1">
                  سيتم حذف جميع بيانات التوزيع للشهر المحدد نهائياً. يمكن إعادة التوزيع لاحقاً لكن لن تتمكن من استرجاع هذا السجل.
                </p>
              </div>
              <button
                onClick={closeModals}
                className="text-gray-500 hover:text-gray-700"
                aria-label="إغلاق"
              >
                ✕
              </button>
            </div>

            <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-4 text-sm space-y-2">
              <p className="font-semibold">تنبيه حرج:</p>
              <ul className="list-disc list-inside space-y-1">
                <li>سيتم فقدان جميع تفاصيل التوزيع بما فيها حصص الشركاء والتنبيهات المرتبطة.</li>
                <li>يجب تدوين سبب واضح للحذف وسيُسجل ضمن السجلات الإدارية.</li>
                <li>يمكن إعادة تشغيل التوزيع للشهر نفسه بعد الحذف إذا لزم الأمر.</li>
              </ul>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">سبب الحذف</label>
                <textarea
                  rows={3}
                  value={deleteModal.reason}
                  onChange={(e) => setDeleteModal((prev) => ({ ...prev, reason: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-red-500"
                  placeholder="اشرح سبب الحذف بالتفصيل (15 حرفاً على الأقل)"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">تأكيد الحذف</label>
                <input
                  type="text"
                  value={deleteModal.confirmText}
                  onChange={(e) => setDeleteModal((prev) => ({ ...prev, confirmText: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-red-500"
                  placeholder="اكتب DELETE بالأحرف الإنجليزية"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3">
              <button
                className="px-4 py-2 rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-100"
                onClick={closeModals}
                disabled={actionLoading}
              >
                إلغاء
              </button>
              <button
                className="px-5 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700 disabled:bg-red-300"
                onClick={handleDeleteSubmit}
                disabled={actionLoading}
              >
                {actionLoading ? 'جاري الحذف...' : 'حذف التوزيع'}
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
};

export default ProfitDistribution;
