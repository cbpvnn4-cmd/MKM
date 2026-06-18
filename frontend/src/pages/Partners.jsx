import React, { useState, useEffect, useMemo } from 'react';
import {
  AlertTriangle,
  Wallet,
  Coins,
  TrendingDown,
  Rocket,
  Users2,
  UserCheck,
  UserX,
  PhoneCall,
  Filter,
  UserPlus,
  RefreshCcw,
  ClipboardList,
  Receipt,
  Search
} from 'lucide-react';
import Layout from '../components/Layout';
import { useToast } from '../components/ui/Toast';
import { useConfirmations } from '../components/ui/ConfirmDialog';
import { getPartners, deletePartner, getPartnerCapitalMovements, getPartnerOwnershipSnapshots, calculateAndCreateOwnershipSnapshots, getCapitalSummary } from '../services/api';

const Partners = () => {
  // Toast and Confirm hooks
  const { success, error: toastError } = useToast();
  const { confirmDelete, confirmUpdate } = useConfirmations();

  const [partners, setPartners] = useState([]);
  const [partnersFinancialData, setPartnersFinancialData] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [capitalSummary, setCapitalSummary] = useState(null);
  const [capitalSummaryLoading, setCapitalSummaryLoading] = useState(true);
  const [capitalSummaryError, setCapitalSummaryError] = useState(null);
  const [companyShare, setCompanyShare] = useState(null);

  useEffect(() => {
    fetchPartners();
  }, []);

  const fetchPartners = async () => {
    try {
      setLoading(true);
      setError(null);
      setCapitalSummaryLoading(true);
      setCapitalSummaryError(null);

      const [partnersResult, summaryResult] = await Promise.allSettled([
        getPartners(),
        getCapitalSummary()
      ]);

      if (partnersResult.status !== 'fulfilled') {
        throw partnersResult.reason;
      }

      const data = partnersResult.value;
      const partnersArray = Array.isArray(data) ? data : [];
      setPartners(partnersArray);

      // Company share is now managed separately in the Beneficiary Operations page
      // No longer displayed as a partner

      if (summaryResult.status === 'fulfilled') {
        setCapitalSummary(summaryResult.value || null);
        setCapitalSummaryError(null);
      } else {
        console.error('Error fetching capital summary:', summaryResult.reason);
        setCapitalSummary(null);
        setCapitalSummaryError('تعذر تحميل ملخص رأس المال');
      }

      // Initialize financial data with safe defaults
      const financialData = {};
      partnersArray.forEach(partner => {
        if (typeof partner?.id === 'number') {
          financialData[partner.id] = {
            netCapital: 0,
            ownershipPercentage: 0
          };
        }
      });

      // Fetch financial data for each partner
      try {
        await Promise.all(
          partnersArray.map(async (partner) => {
            if (typeof partner?.id === 'number') {
              try {
                const [movements, snapshots] = await Promise.all([
                  getPartnerCapitalMovements(partner.id),
                  getPartnerOwnershipSnapshots(partner.id)
                ]);

                // Calculate net capital
                const movementsArray = Array.isArray(movements) ? movements : [];
                const deposits = movementsArray.filter(m => m?.movement_type === 'DEPOSIT').reduce((sum, m) => sum + parseFloat(m?.amount_usd || 0), 0);
                const withdrawals = movementsArray.filter(m => m?.movement_type === 'WITHDRAW').reduce((sum, m) => sum + parseFloat(m?.amount_usd || 0), 0);
                const netCapital = deposits - withdrawals;

                // Get latest ownership
                const snapshotsArray = Array.isArray(snapshots) ? snapshots : [];
                const latestOwnership = snapshotsArray
                  .filter(Boolean)
                  .sort((a, b) => {
                    const aDate = new Date(a.snapshot_on || a.snapshot_date || a.created_at || 0);
                    const bDate = new Date(b.snapshot_on || b.snapshot_date || b.created_at || 0);
                    if (bDate.getTime() !== aDate.getTime()) {
                      return bDate - aDate;
                    }
                    const aCreated = new Date(a.created_at || a.updated_at || 0);
                    const bCreated = new Date(b.created_at || b.updated_at || 0);
                    if (bCreated.getTime() !== aCreated.getTime()) {
                      return bCreated - aCreated;
                    }
                    return (b.id || 0) - (a.id || 0);
                  })[0] || null;

                financialData[partner.id] = {
                  netCapital: Number(netCapital) || 0,
                  ownershipPercentage: Number(latestOwnership?.equity_pct ?? latestOwnership?.ownership_percentage) || 0
                };
              } catch (err) {
                console.error(`Error fetching financial data for partner ${partner.id}:`, err);
                // Keep the default values already set
              }
            }
          })
        );
      } catch (err) {
        console.error('Error in Promise.all for financial data:', err);
        // Continue with default values
      }

      // Ensure all partners have financial data with safe defaults
      const safeFinancialData = {};
      partnersArray.forEach(partner => {
        if (typeof partner?.id === 'number') {
          safeFinancialData[partner.id] = financialData[partner.id] || {
            netCapital: 0,
            ownershipPercentage: 0
          };
        }
      });

      setPartnersFinancialData(safeFinancialData);
      setCompanyShare(null); // No longer needed
      setError(null);
    } catch (err) {
      setCompanyShare(null);
      setError('تعذر تحميل قائمة الشركاء');
      console.error('Error fetching partners:', err);
    } finally {
      setLoading(false);
      setCapitalSummaryLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!id) return;

    const confirmed = await confirmDelete('الشريك');
    if (!confirmed) return;

    try {
      await deletePartner(id);
      success('تم حذف الشريك بنجاح');
      fetchPartners();
    } catch (err) {
      toastError('تعذر حذف الشريك');
    }
  };

  const handleRecalculateOwnership = async () => {
    const confirmed = await confirmUpdate('نسب الملكية', 'هل تريد إعادة حساب نسب الملكية لجميع الشركاء بناءً على رؤوس أموالهم الحالية؟');
    if (!confirmed) return;

    try {
      setLoading(true);
      await calculateAndCreateOwnershipSnapshots();
      await fetchPartners();
      success('تم إعادة حساب نسب الملكية بنجاح');
      setError(null);
    } catch (err) {
      toastError('تعذر إعادة حساب نسب الملكية');
    } finally {
      setLoading(false);
    }
  };

  const filteredPartners = useMemo(() => {
    let result = partners; // Only show real partners, not company share

    if (statusFilter !== 'all') {
      const isActive = statusFilter === 'active';
      result = result.filter((partner) => partner.active === isActive);
    }

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter((partner) => {
        const nationalId = partner.national_id || partner.nationalId || '';
        return (
          partner.name?.toLowerCase().includes(term) ||
          nationalId.toLowerCase().includes(term) ||
          partner.phone?.toLowerCase().includes(term) ||
          partner.email?.toLowerCase().includes(term)
        );
      });
    }

    return result;
  }, [partners, companyShare, statusFilter, searchTerm]);

  const totalPartners = partners.length;
  const activePartners = partners.filter((partner) => partner.active).length;
  const inactivePartners = totalPartners - activePartners;
  const partnersWithContact = partners.filter((partner) => partner.phone || partner.email).length;
  const activationRate = totalPartners ? Math.round((activePartners / totalPartners) * 100) : 0;
  const contactRate = totalPartners ? Math.round((partnersWithContact / totalPartners) * 100) : 0;
  const recentPartners = useMemo(() => partners.slice(0, 5), [partners]);

  const formatNumber = (value) => new Intl.NumberFormat('en-US').format(value || 0);
  const formatCurrency = (value) => new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(value || 0);

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
            <h1 className="text-3xl font-bold text-gray-800 mb-2">الشركاء</h1>
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

  const statusDistribution = [
    { label: 'شركاء نشطون', value: activePartners, color: 'bg-green-500' },
    { label: 'شركاء غير نشطين', value: inactivePartners, color: 'bg-red-500' },
  ];
  const distributionTotal = statusDistribution.reduce((sum, item) => sum + item.value, 0) || 1;

  const hasCapitalSummary = !!capitalSummary;
  const availableCapitalValue = capitalSummary?.available_capital ?? 0;
  const netCapitalValue = capitalSummary?.net_capital ?? 0;

  const capitalDetailCards = [
    {
      label: 'إجمالي الإيداعات',
      value: capitalSummary?.total_deposits ?? 0,
      icon: Coins,
      wrapperClass: 'border border-emerald-100 bg-white/70',
      iconClass: 'bg-emerald-500/10 text-emerald-600'
    },
    {
      label: 'إجمالي السحوبات',
      value: capitalSummary?.total_withdrawals ?? 0,
      icon: TrendingDown,
      wrapperClass: 'border border-rose-100 bg-white/70',
      iconClass: 'bg-rose-500/10 text-rose-600'
    },
    {
      label: 'التزامات المشتريات',
      value: capitalSummary?.total_purchase_commitments ?? 0,
      icon: ClipboardList,
      wrapperClass: 'border border-indigo-100 bg-white/70',
      iconClass: 'bg-indigo-500/10 text-indigo-600'
    },
    {
      label: 'المصروفات المسجلة',
      value: capitalSummary?.total_expenses ?? 0,
      icon: Receipt,
      wrapperClass: 'border border-amber-100 bg-white/70',
      iconClass: 'bg-amber-500/10 text-amber-600'
    }
  ];

  const overviewCards = [
    {
      label: 'إجمالي الشركاء',
      value: totalPartners,
      caption: 'عدد السجلات الحالية في النظام',
      icon: Users2,
      border: 'border-blue-100 bg-blue-50',
      iconClass: 'bg-blue-500/10 text-blue-600'
    },
    {
      label: 'شركاء نشطون',
      value: activePartners,
      caption: `${activationRate}% من إجمالي الشركاء`,
      icon: UserCheck,
      border: 'border-emerald-100 bg-emerald-50',
      iconClass: 'bg-emerald-500/10 text-emerald-600'
    },
    {
      label: 'شركاء غير نشطين',
      value: inactivePartners,
      caption: 'تحتاج هذه السجلات إلى متابعة',
      icon: UserX,
      border: 'border-rose-100 bg-rose-50',
      iconClass: 'bg-rose-500/10 text-rose-600'
    },
    {
      label: 'قابلية التواصل',
      value: `${contactRate}%`,
      caption: `${formatNumber(partnersWithContact)} شريك لديهم بيانات تواصل`,
      icon: PhoneCall,
      border: 'border-purple-100 bg-purple-50',
      iconClass: 'bg-purple-500/10 text-purple-600'
    }
  ];

  return (
    <Layout>
      <div className="space-y-6">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">الشركاء</h1>
          <p className="text-gray-600">تابع حالة شركاء الشركة وتواصل معهم بسهولة بواسطة لوحة معلومات محدثة.</p>
        </div>

        <section className="bg-gradient-to-br from-emerald-50 via-white to-blue-50 border border-emerald-100 rounded-3xl shadow-sm p-6 lg:p-8 space-y-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-sm font-semibold text-emerald-600">ملخص رأس المال الحالي</p>
              <h2 className="text-2xl font-bold text-slate-900 mt-1">
                نظرة سريعة على الإيداعات، الالتزامات، والمبلغ المتاح للصرف.
              </h2>
            </div>
            {capitalSummaryLoading ? (
              <div className="inline-flex items-center gap-2 text-sm text-emerald-700">
                <RefreshCcw className="w-4 h-4 animate-spin" />
                <span>جاري تحميل البيانات المالية...</span>
              </div>
            ) : capitalSummaryError ? (
              <div className="inline-flex items-center gap-2 rounded-full bg-rose-500/10 px-4 py-2 text-sm font-semibold text-rose-600">
                <AlertTriangle className="w-4 h-4" />
                <span>{capitalSummaryError}</span>
              </div>
            ) : (
              <div className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold ${availableCapitalValue >= 0 ? 'bg-emerald-500/10 text-emerald-700' : 'bg-rose-500/10 text-rose-600'}`}>
                <Wallet className="w-4 h-4" />
                <span>المتاح الآن: {formatCurrency(availableCapitalValue)}</span>
              </div>
            )}
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-2xl border border-emerald-200 bg-white/80 p-5 shadow-sm">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <span className="text-xs font-semibold uppercase tracking-wide text-emerald-600">صافي رأس المال</span>
                  <p className="mt-2 text-3xl font-bold text-slate-900">{formatCurrency(netCapitalValue)}</p>
                  <p className="mt-1 text-xs text-slate-500">إجمالي الإيداعات ناقص السحوبات.</p>
                </div>
                <div className="p-3 rounded-xl bg-emerald-500/10 text-emerald-600">
                  <Wallet className="w-6 h-6" />
                </div>
              </div>
            </div>
            <div className="rounded-2xl border border-sky-200 bg-white/80 p-5 shadow-sm">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <span className="text-xs font-semibold uppercase tracking-wide text-sky-600">الرصيد بعد الالتزامات</span>
                  <p className={`mt-2 text-3xl font-bold ${availableCapitalValue >= 0 ? 'text-slate-900' : 'text-rose-600'}`}>
                    {formatCurrency(availableCapitalValue)}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">يشمل جميع أوامر الشراء المؤكدة والمصروفات المسجلة.</p>
                </div>
                <div className="p-3 rounded-xl bg-sky-500/10 text-sky-600">
                  <Rocket className="w-6 h-6" />
                </div>
              </div>
            </div>
          </div>

          {hasCapitalSummary && (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {capitalDetailCards.map(({ label, value, icon: Icon, wrapperClass, iconClass }) => (
                <div key={label} className={`rounded-2xl p-4 shadow-sm transition-transform hover:-translate-y-1 ${wrapperClass}`}>
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="text-xs font-semibold text-slate-500">{label}</p>
                      <p className="mt-2 text-xl font-bold text-slate-900">{formatCurrency(value)}</p>
                    </div>
                    <span className={`flex h-10 w-10 items-center justify-center rounded-xl ${iconClass}`}>
                      <Icon className="w-5 h-5" />
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
          {overviewCards.map(({ label, value, caption, icon: Icon, border, iconClass }) => (
            <div key={label} className={`rounded-2xl border ${border} p-6 shadow-sm transition-transform hover:-translate-y-1`}>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-medium text-slate-600">{label}</p>
                  <p className="mt-2 text-2xl font-bold text-slate-900">
                    {typeof value === 'number' ? formatNumber(value) : value}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">{caption}</p>
                </div>
                <span className={`flex h-10 w-10 items-center justify-center rounded-xl ${iconClass}`}>
                  <Icon className="w-5 h-5" />
                </span>
              </div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          <div className="space-y-6 xl:col-span-2">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                <div>
                  <h2 className="text-xl font-semibold text-gray-900">قائمة الشركاء</h2>
                  <p className="text-sm text-gray-500 mt-1">ابحث وفرز الشركاء حسب الحالة أو بيانات التواصل.</p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    onClick={handleRecalculateOwnership}
                    className="inline-flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-600 transition-colors hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-60"
                    disabled={loading}
                  >
                    <RefreshCcw className="w-4 h-4" />
                    حساب النسب تلقائياً
                  </button>
                  <button
                    onClick={() => (window.location.href = '/partners/new')}
                    className="inline-flex items-center gap-2 rounded-lg bg-amber-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-amber-700 border border-amber-700"
                  >
                    <UserPlus className="w-4 h-4" />
                    إضافة شريك جديد
                  </button>
                </div>
              </div>

              <div className="mt-6 grid grid-cols-1 lg:grid-cols-3 gap-4">
                <div className="lg:col-span-2">
                  <div className="relative">
                    <span className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400">
                      <Search className="h-5 w-5" />
                    </span>
                    <input
                      type="text"
                      value={searchTerm}
                      onChange={(event) => setSearchTerm(event.target.value)}
                      placeholder="ابحث باسم الشريك، رقم الهوية، الهاتف أو البريد"
                      className="w-full rounded-md border border-gray-300 px-4 py-2 pr-10 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-shadow duration-150"
                    />
                  </div>
                </div>
                <div>
                  <div className="relative">
                    <span className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400">
                      <Filter className="h-4 w-4" />
                    </span>
                    <select
                      value={statusFilter}
                      onChange={(event) => setStatusFilter(event.target.value)}
                      className="w-full rounded-md border border-gray-300 px-4 py-2 pr-10 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-shadow duration-150"
                    >
                      <option value="all">كل الحالات</option>
                      <option value="active">نشط</option>
                      <option value="inactive">غير نشط</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="mt-6 overflow-x-auto border border-gray-200 rounded-xl">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th scope="col" className="px-4 lg:px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">الشريك</th>
                      <th scope="col" className="hidden lg:table-cell px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">رقم الهوية</th>
                      <th scope="col" className="hidden xl:table-cell px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">بيانات التواصل</th>
                      <th scope="col" className="px-4 lg:px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">المالية</th>
                      <th scope="col" className="px-4 lg:px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">الحالة</th>
                      <th scope="col" className="px-4 lg:px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">إجراءات</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredPartners.length === 0 ? (
                      <tr>
                        <td colSpan="6" className="px-6 py-12 text-center text-sm text-gray-500">
                          {searchTerm || statusFilter !== 'all'
                            ? 'لا توجد سجلات مطابقة لخيارات البحث الحالية.'
                            : 'لم يتم إضافة شركاء حتى الآن.'}
                        </td>
                      </tr>
                    ) : (
                      filteredPartners.map((partner) => (
                        <tr key={partner.id || partner.national_id || partner.nationalId || partner.name} className="hover:bg-amber-50 transition-colors">
                          {/* Partner Info */}
                          <td className="px-4 lg:px-6 py-4">
                            <div className="flex items-center">
                              <div className="relative flex-shrink-0">
                                <div className="w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center">
                                  <span className="text-amber-600 font-bold text-sm">
                                    {partner.name?.charAt(0) || 'ش'}
                                  </span>
                                </div>
                                {partner.active && (
                                  <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 border-2 border-white rounded-full"></div>
                                )}
                              </div>
                              <div className="mr-4">
                                <button
                                  onClick={() => {
                                    if (!partner.isCompanyShare && typeof partner.id === 'number') {
                                      window.location.href = `/partners/${partner.id}`;
                                    }
                                  }}
                                  disabled={partner.isCompanyShare || typeof partner.id !== 'number'}
                                  className={`text-sm font-semibold transition-colors ${
                                    partner.isCompanyShare
                                      ? 'text-gray-500 cursor-default'
                                      : 'text-gray-900 hover:text-amber-600'
                                  }`}
                                >
                                  {partner.name || '—'}
                                </button>
                                <div className="text-xs text-gray-500 lg:hidden">
                                  {partner.national_id || partner.nationalId || '—'}
                                </div>
                                <div className="text-xs text-gray-400 xl:hidden">
                                  {partner.phone && `📱 ${partner.phone}`}
                                </div>
                              </div>
                            </div>
                          </td>

                          {/* National ID - Hidden on mobile */}
                          <td className="hidden lg:table-cell px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {partner.national_id || partner.nationalId || '—'}
                          </td>

                          {/* Contact Info - Hidden on tablet and mobile */}
                          <td className="hidden xl:table-cell px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-600">{partner.phone || 'لا يوجد رقم'}</div>
                            <div className="text-xs text-gray-400">{partner.email || 'لا يوجد بريد'}</div>
                          </td>

                          {/* Financial Info - Combined */}
                          <td className="px-4 lg:px-6 py-4 whitespace-nowrap">
                            <div className="space-y-1.5">
                              {/* Capital */}
                              <div className="flex items-center gap-1.5">
                                <span className={`text-xs lg:text-sm font-bold ${
                                  partner.isCompanyShare
                                    ? 'text-gray-500'
                                    : (partnersFinancialData[partner.id]?.netCapital || 0) >= 0
                                      ? 'text-emerald-600'
                                      : 'text-red-600'
                                }`}>
                                  {partner.isCompanyShare ? '—' : formatCurrency(partnersFinancialData[partner.id]?.netCapital || 0)}
                                </span>
                              </div>

                              {/* Ownership */}
                              <div className="flex items-center gap-2">
                                <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-purple-50 text-purple-600 text-xs font-semibold border border-purple-200">
                                  {((partnersFinancialData[partner.id]?.ownershipPercentage) || 0).toFixed(1)}%
                                </span>
                              </div>
                            </div>
                          </td>

                          {/* Status */}
                          <td className="px-4 lg:px-6 py-4 whitespace-nowrap">
                            {partner.active ? (
                              <span className="inline-flex items-center gap-1 px-2 lg:px-3 py-1 text-xs font-semibold rounded-full bg-green-50 text-green-600 border border-green-200">
                                <span className="w-1.5 h-1.5 bg-green-500 rounded-full"></span>
                                نشط
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 lg:px-3 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-600 border border-gray-200">
                                <span className="w-1.5 h-1.5 bg-gray-400 rounded-full"></span>
                                غير نشط
                              </span>
                            )}
                          </td>

                          {/* Actions */}
                          <td className="px-4 lg:px-6 py-4 whitespace-nowrap text-sm font-medium">
                            <div className="flex items-center gap-1 lg:gap-2">
                              <button
                                className={[
                                  'inline-flex items-center justify-center w-8 h-8 lg:w-auto lg:px-3 lg:py-1.5 text-xs font-medium rounded-lg transition-colors duration-150',
                                  partner.isCompanyShare || typeof partner.id !== 'number'
                                    ? 'text-gray-400 bg-gray-100 border border-gray-200 cursor-default'
                                    : 'text-blue-600 bg-blue-50 hover:bg-blue-100 border border-blue-200'
                                ].join(' ')}
                                onClick={() => {
                                  if (!partner.isCompanyShare && typeof partner.id === 'number') {
                                    window.location.href = '/partners/' + partner.id + '/edit';
                                  }
                                }}
                                title="تحرير"
                                disabled={partner.isCompanyShare || typeof partner.id !== 'number'}
                              >
                                <svg className="w-4 h-4 lg:ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                </svg>
                                <span className="hidden lg:inline">تحرير</span>
                              </button>
                              <button
                                className={[
                                  'inline-flex items-center justify-center w-8 h-8 lg:w-auto lg:px-3 lg:py-1.5 text-xs font-medium rounded-lg transition-colors duration-150',
                                  partner.isCompanyShare || typeof partner.id !== 'number'
                                    ? 'text-gray-400 bg-gray-100 border border-gray-200 cursor-default'
                                    : 'text-red-600 bg-red-50 hover:bg-red-100 border border-red-200'
                                ].join(' ')}
                                onClick={() => {
                                  if (!partner.isCompanyShare && typeof partner.id === 'number') {
                                    handleDelete(partner.id);
                                  }
                                }}
                                title="حذف"
                                disabled={partner.isCompanyShare || typeof partner.id !== 'number'}
                              >
                                <svg className="w-4 h-4 lg:ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                                <span className="hidden lg:inline">حذف</span>
                              </button>
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
              <h3 className="text-lg font-semibold text-gray-900 mb-4">توزيع الحالات</h3>
              <div className="space-y-4">
                {statusDistribution.map((item) => {
                  const percentage = distributionTotal ? Math.round((item.value / distributionTotal) * 100) : 0;
                  const clamped = Math.min(100, Math.max(percentage, 0));
                  return (
                    <div key={item.label}>
                      <div className="flex items-center justify-between text-sm text-gray-600 mb-1">
                        <span>{item.label}</span>
                        <span className="font-medium text-gray-900">{formatNumber(item.value)}</span>
                      </div>
                      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div className={`h-full ${item.color}`} style={{ width: `${clamped}%` }} />
                      </div>
                      <div className="text-xs text-gray-400 mt-1">{clamped}% من الإجمالي</div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-800">أحدث الشركاء</h3>
              </div>
              <div className="p-6">
                {recentPartners.length === 0 ? (
                  <div className="text-center py-8">
                    <Users2 className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-500 font-medium">لا يوجد شركاء حالياً</p>
                    <p className="text-sm text-gray-400 mt-1">ابدأ بإضافة شريك جديد</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {recentPartners.map((partner) => (
                      <div
                        key={`recent-${partner.id || partner.national_id || partner.nationalId || partner.name}`}
                        className="group relative bg-gray-50 rounded-lg border border-gray-200 hover:border-amber-300 hover:shadow-md transition-all duration-200"
                      >
                        <div className="flex items-center gap-3 p-4">
                          {/* Avatar */}
                          <div className="relative flex-shrink-0">
                            <div className="w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center group-hover:bg-amber-200 transition-colors">
                              <span className="text-amber-600 font-bold text-lg">
                                {partner.name?.charAt(0) || 'ش'}
                              </span>
                            </div>
                            {partner.active && (
                              <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-green-500 border-2 border-white rounded-full"></div>
                            )}
                          </div>

                          {/* Info */}
                          <div className="flex-1 min-w-0 text-right">
                            <p className="text-sm font-semibold text-gray-900 group-hover:text-amber-600 transition-colors truncate">
                              {partner.name || '—'}
                            </p>
                            <p className="text-xs text-gray-500 truncate mt-0.5">
                              {partner.phone || partner.email || 'لا توجد بيانات تواصل'}
                            </p>
                            {/* Capital */}
                            {partnersFinancialData[partner.id]?.netCapital != null && (
                              <p className="text-xs font-semibold text-emerald-600 mt-1">
                                {formatCurrency(partnersFinancialData[partner.id]?.netCapital || 0)}
                              </p>
                            )}
                          </div>

                          {/* Action Button */}
                          <div className="flex-shrink-0">
                            <button
                              onClick={() => partner.id && (window.location.href = `/partners/${partner.id}`)}
                              className="flex items-center gap-2 px-3 py-2 bg-amber-50 hover:bg-amber-600 text-amber-600 hover:text-white rounded-lg border border-amber-200 hover:border-amber-600 transition-all duration-200 text-xs font-semibold"
                            >
                              <span>عرض التفاصيل</span>
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                              </svg>
                            </button>
                          </div>
                        </div>

                        {/* Ownership Badge at bottom */}
                        {(partnersFinancialData[partner.id]?.ownershipPercentage || 0) > 0 && (
                          <div className="px-4 pb-3">
                            <div className="flex items-center gap-2 pt-2 border-t border-gray-200">
                              <span className="text-xs text-gray-500">نسبة الملكية:</span>
                              <div className="flex items-center gap-2 flex-1">
                                <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                                  <div
                                    className="h-full bg-gradient-to-r from-purple-500 to-purple-600 rounded-full transition-all duration-300"
                                    style={{ width: `${Math.min((partnersFinancialData[partner.id]?.ownershipPercentage) || 0, 100)}%` }}
                                  ></div>
                                </div>
                                <span className="text-xs font-bold text-purple-600 min-w-[45px] text-left">
                                  {((partnersFinancialData[partner.id]?.ownershipPercentage) || 0).toFixed(1)}%
                                </span>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default Partners;
