import React, { useState, useEffect, useRef } from 'react';
import {
  FileText,
  Printer,
  Download,
  Calendar,
  Filter,
  X,
  RefreshCw,
  Clock,
  SlidersHorizontal,
  AlertCircle,
  CheckCircle,
} from 'lucide-react';
import { PDFDownloadLink, pdf } from '@react-pdf/renderer';
import { getPartnerAccountStatement } from '../services/api';
import PartnerStatementPDF from './PartnerStatementPDF';

const printStyles = `
  @media print {
    @page {
      size: A4 portrait;
      margin: 15mm;
    }

    html, body {
      margin: 0;
      padding: 0;
      background: #ffffff !important;
      direction: rtl !important;
      font-family: 'Cairo', 'Noto Sans Arabic', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif !important;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }

    body * {
      visibility: hidden !important;
    }

    #partner-statement-print,
    #partner-statement-print * {
      visibility: visible !important;
    }

    #partner-statement-print {
      position: absolute !important;
      inset: 0 !important;
      margin: 0 !important;
      padding: 15mm !important;
      box-shadow: none !important;
      border-radius: 0 !important;
    }

    .no-print {
      display: none !important;
    }
  }
`;

const quickRanges = [
  {
    key: '7d',
    label: 'آخر 7 أيام',
    getRange: () => {
      const to = new Date();
      const from = new Date();
      from.setDate(to.getDate() - 6);
      return { from, to };
    },
  },
  {
    key: '30d',
    label: 'آخر 30 يوم',
    getRange: () => {
      const to = new Date();
      const from = new Date();
      from.setDate(to.getDate() - 29);
      return { from, to };
    },
  },
  {
    key: 'thisMonth',
    label: 'هذا الشهر',
    getRange: () => {
      const now = new Date();
      const from = new Date(now.getFullYear(), now.getMonth(), 1);
      const to = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      return { from, to };
    },
  },
  {
    key: 'ytd',
    label: 'منذ بداية السنة',
    getRange: () => {
      const now = new Date();
      const from = new Date(now.getFullYear(), 0, 1);
      return { from, to: now };
    },
  },
];

const formatNumber = (value) =>
  new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(value || 0));

const formatDate = (value) => {
  if (!value) return '-';
  try {
    return new Date(value).toLocaleDateString('en-GB', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
  } catch {
    return '-';
  }
};

const formatDateForInput = (value) => {
  if (!value) return '';
  const date = new Date(value);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const rtlText = (text) => {
  if (!text) return text;
  return '\u202B\u200F' + text + '\u200F\u202C';
};

const getTransactionTypeArabic = (type) => {
  const types = {
    CAPITAL_DEPOSIT: 'إيداع رأس مال',
    CAPITAL_WITHDRAW: 'سحب رأس مال',
    PROFIT_DISTRIBUTION: 'توزيع أرباح',
    PROFIT_PAYOUT: 'صرف أرباح',
    ADJUSTMENT: 'تسوية',
    TRANSFER_IN: 'تحويل وارد',
    TRANSFER_OUT: 'تحويل صادر',
  };
  return types[type] || type || '-';
};

const getTransactionBadgeClasses = (type) => {
  switch (type) {
    case 'CAPITAL_DEPOSIT':
      return 'bg-green-100 text-green-800';
    case 'CAPITAL_WITHDRAW':
      return 'bg-red-100 text-red-800';
    case 'PROFIT_DISTRIBUTION':
      return 'bg-blue-100 text-blue-800';
    case 'PROFIT_PAYOUT':
      return 'bg-purple-100 text-purple-800';
    case 'TRANSFER_IN':
      return 'bg-teal-100 text-teal-800';
    case 'TRANSFER_OUT':
      return 'bg-amber-100 text-amber-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
};

const PartnerStatementViewer = ({ partnerId, partnerName }) => {
  const [statement, setStatement] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [printLoading, setPrintLoading] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [activeQuickRange, setActiveQuickRange] = useState(null);
  const [filters, setFilters] = useState({
    from_date: '',
    to_date: '',
    transaction_type: '',
  });

  const printRef = useRef(null);
  const pdfFileName = `partner_statement_${String(
    statement?.partner_name || partnerName || partnerId || 'partner'
  )
    .trim()
    .replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`;

  const hasActiveFilters =
    Boolean(filters.from_date || filters.to_date || filters.transaction_type) ||
    Boolean(activeQuickRange);
  const transactionsCount = statement?.transactions?.length || 0;
  const netChange = statement
    ? Number(statement.closing_balance || 0) - Number(statement.opening_balance || 0)
    : 0;

  useEffect(() => {
    if (partnerId) {
      fetchStatement();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [partnerId]);

  const fetchStatement = async (overrides) => {
    const filtersToUse = overrides || filters;
    try {
      setLoading(true);
      setError(null);
      const data = await getPartnerAccountStatement(partnerId, filtersToUse);
      setStatement(data);
    } catch (err) {
      console.error('Error fetching partner statement:', err);
      setError('حدث خطأ أثناء جلب كشف الحساب. حاول مرة أخرى.');
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (field, value) => {
    setFilters((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleApplyFilters = () => {
    setActiveQuickRange(null);
    fetchStatement(filters);
    setShowFilters(false);
  };

  const handleClearFilters = () => {
    const cleared = {
      from_date: '',
      to_date: '',
      transaction_type: '',
    };
    setFilters(cleared);
    setActiveQuickRange(null);
    fetchStatement(cleared);
  };

  const applyQuickRange = (rangeKey) => {
    const range = quickRanges.find((item) => item.key === rangeKey);
    if (!range) return;
    const { from, to } = range.getRange();
    const nextFilters = {
      ...filters,
      from_date: formatDateForInput(from),
      to_date: formatDateForInput(to),
    };
    setFilters(nextFilters);
    setActiveQuickRange(rangeKey);
    fetchStatement(nextFilters);
    setShowFilters(false);
  };

  const handlePrint = async () => {
    if (!statement) return;

    setPrintLoading(true);
    try {
      const blob = await pdf(
        <PartnerStatementPDF statement={statement} partnerName={partnerName} filters={filters} />
      ).toBlob();
      const blobUrl = URL.createObjectURL(blob);
      const iframe = document.createElement('iframe');
      iframe.style.display = 'none';
      iframe.src = blobUrl;
      document.body.appendChild(iframe);

      const cleanup = () => {
        URL.revokeObjectURL(blobUrl);
        document.body.removeChild(iframe);
      };

      iframe.onload = () => {
        try {
          iframe.contentWindow?.focus();
          iframe.contentWindow?.print();
        } catch (printErr) {
          console.error('Error calling print on iframe:', printErr);
        } finally {
          setTimeout(cleanup, 1500);
        }
      };
    } catch (err) {
      console.error('Error generating partner statement PDF for print:', err);
      setError('تعذر تجهيز ملف الطباعة. حاول مجدداً.');
    } finally {
      setPrintLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 p-8">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-gray-200 rounded w-1/3" />
          <div className="h-10 bg-gray-200 rounded" />
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[1, 2, 3, 4].map((item) => (
              <div key={item} className="h-20 bg-gray-200 rounded" />
            ))}
          </div>
          <div className="h-64 bg-gray-200 rounded" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 partner-statement-root">
      <style>{printStyles}</style>

      {/* Actions Bar */}
      <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 p-6 no-print">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-blue-600 rounded-xl flex items-center justify-center">
                <FileText className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-800">كشف حساب الشريك الاستثماري</h3>
                <p className="text-sm text-gray-600">{partnerName || statement?.partner_name}</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2 text-sm text-gray-600">
              <span className="flex items-center gap-1 bg-gray-100 px-3 py-1 rounded-full">
                <Clock className="w-4 h-4 text-gray-500" />
                {statement?.from_date || filters.from_date
                  ? `${formatDate(statement?.from_date || filters.from_date)} - ${formatDate(
                      statement?.to_date || filters.to_date
                    )}`
                  : 'الفترة: كل الوقت'}
              </span>
              <span className="flex items-center gap-1 bg-gray-100 px-3 py-1 rounded-full">
                <CheckCircle className="w-4 h-4 text-emerald-600" />
                {transactionsCount} حركة
              </span>
              <span
                className={`flex items-center gap-1 px-3 py-1 rounded-full ${
                  hasActiveFilters ? 'bg-amber-50 text-amber-800 border border-amber-200' : 'bg-gray-100'
                }`}
              >
                <SlidersHorizontal className="w-4 h-4" />
                {hasActiveFilters ? 'تصفية مفعلة' : 'بدون تصفية'}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3 flex-wrap justify-end">
            <button
              onClick={() => setShowFilters((prev) => !prev)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-semibold transition-all duration-200 ${
                showFilters ? 'bg-purple-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <Filter className="w-4 h-4" />
              التصفية
            </button>

            <button
              onClick={() => fetchStatement()}
              className="flex items-center gap-2 bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg font-semibold transition-all duration-200"
            >
              <RefreshCw className="w-4 h-4" />
              تحديث
            </button>

            <button
              onClick={handlePrint}
              disabled={!statement || printLoading}
              className={`flex items-center gap-2 text-white px-4 py-2 rounded-lg font-semibold transition-all duration-200 ${
                printLoading ? 'bg-green-400 cursor-wait opacity-80' : 'bg-green-500 hover:bg-green-600'
              }`}
            >
              <Printer className="w-4 h-4" />
              {printLoading ? 'جارٍ تجهيز الطباعة...' : 'طباعة'}
            </button>

            {statement ? (
              <PDFDownloadLink
                document={
                  <PartnerStatementPDF statement={statement} partnerName={partnerName} filters={filters} />
                }
                fileName={pdfFileName}
                className="flex items-center gap-2 bg-gradient-to-r from-purple-500 to-blue-600 hover:from-purple-600 hover:to-blue-700 text-white px-4 py-2 rounded-lg font-semibold transition-all duration-200"
              >
                {({ loading: pdfLoading }) => (
                  <>
                    <Download className="w-4 h-4" />
                    {pdfLoading ? 'جارٍ إعداد PDF...' : 'تنزيل PDF'}
                  </>
                )}
              </PDFDownloadLink>
            ) : (
              <button
                disabled
                className="flex items-center gap-2 bg-gray-200 text-gray-500 px-4 py-2 rounded-lg font-semibold cursor-not-allowed"
              >
                <Download className="w-4 h-4" />
                تنزيل PDF
              </button>
            )}
          </div>
        </div>

        {showFilters && (
          <div className="mt-6 pt-6 border-t border-gray-200">
            <div className="flex items-center gap-2 flex-wrap mb-4">
              {quickRanges.map((range) => (
                <button
                  key={range.key}
                  onClick={() => applyQuickRange(range.key)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-all ${
                    activeQuickRange === range.key
                      ? 'bg-purple-600 text-white shadow-sm'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  <Clock className="w-4 h-4" />
                  {range.label}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <Calendar className="w-4 h-4 inline ml-1" />
                  من تاريخ
                </label>
                <input
                  type="date"
                  value={filters.from_date}
                  onChange={(e) => handleFilterChange('from_date', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <Calendar className="w-4 h-4 inline ml-1" />
                  إلى تاريخ
                </label>
                <input
                  type="date"
                  value={filters.to_date}
                  onChange={(e) => handleFilterChange('to_date', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <Filter className="w-4 h-4 inline ml-1" />
                  نوع الحركة
                </label>
                <select
                  value={filters.transaction_type}
                  onChange={(e) => handleFilterChange('transaction_type', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                >
                  <option value="">الكل</option>
                  <option value="CAPITAL_DEPOSIT">إيداع رأس مال</option>
                  <option value="CAPITAL_WITHDRAW">سحب رأس مال</option>
                  <option value="PROFIT_DISTRIBUTION">توزيع أرباح</option>
                  <option value="PROFIT_PAYOUT">صرف أرباح</option>
                  <option value="ADJUSTMENT">تسوية</option>
                  <option value="TRANSFER_IN">تحويل وارد</option>
                  <option value="TRANSFER_OUT">تحويل صادر</option>
                </select>
              </div>
            </div>

            {hasActiveFilters && (
              <div className="flex items-center gap-2 mt-4 text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                <AlertCircle className="w-4 h-4" />
                <span>تصفية مفعّلة الآن. يمكنك مسح التصفية للعودة لكل الحركات.</span>
              </div>
            )}

            <div className="flex justify-end gap-3 mt-4">
              <button
                onClick={handleClearFilters}
                className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-semibold transition-all duration-200"
              >
                <X className="w-4 h-4" />
                مسح التصفية
              </button>
              <button
                onClick={handleApplyFilters}
                className="px-6 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-semibold transition-all duration-200"
              >
                تطبيق
              </button>
            </div>
          </div>
        )}
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-800 no-print flex items-center gap-2">
          <AlertCircle className="w-5 h-5" />
          <span>{error}</span>
          <button
            onClick={() => fetchStatement()}
            className="ml-auto text-sm text-red-700 underline decoration-dotted decoration-2"
          >
            إعادة المحاولة
          </button>
        </div>
      )}

      {statement && (
        <div
          ref={printRef}
          id="partner-statement-print"
          className="bg-white rounded-2xl shadow-xl border border-gray-200 overflow-hidden"
          style={{ direction: 'rtl', fontFamily: "'Cairo', 'Noto Sans Arabic', sans-serif" }}
          lang="ar"
        >
          {/* Header */}
          <div className="p-6 border-b-2 border-gray-800 text-center" dir="rtl">
            <h1 className="text-2xl font-bold text-gray-900 mb-2" dir="ltr">
              Partner Account Statement / <span dir="rtl">{rtlText('كشف حساب الشريك')}</span>
            </h1>
            <h2 className="text-xl font-semibold text-gray-700">
              {statement.partner_name || partnerName}
            </h2>
            <p className="text-sm text-gray-600 mt-2" dir="ltr">
              Period / <span dir="rtl">{rtlText('الفترة')}</span>: {formatDate(statement.from_date)} -{' '}
              {formatDate(statement.to_date)}
            </p>
          </div>

          {/* Summary */}
          <div className="p-6 border-b border-gray-200" dir="rtl">
            <h3 className="text-lg font-bold text-gray-800 mb-4" dir="ltr">
              Account Summary / <span dir="rtl">{rtlText('ملخص الحساب')}</span>
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              <div className="rounded-lg p-4 border border-gray-200 bg-gray-50">
                <p className="text-xs text-gray-600 mb-1" dir="ltr">
                  Opening Balance
                  <br />
                  <span dir="rtl">{rtlText('الرصيد الافتتاحي')}</span>
                </p>
                <p className="text-lg font-bold text-gray-800">${formatNumber(statement.opening_balance)}</p>
              </div>
              <div className="rounded-lg p-4 border border-green-200 bg-green-50">
                <p className="text-xs text-gray-600 mb-1" dir="ltr">
                  Total Deposits
                  <br />
                  <span dir="rtl">{rtlText('إجمالي الإيداعات')}</span>
                </p>
                <p className="text-lg font-bold text-green-600">${formatNumber(statement.total_deposits)}</p>
              </div>
              <div className="rounded-lg p-4 border border-red-200 bg-red-50">
                <p className="text-xs text-gray-600 mb-1" dir="ltr">
                  Total Withdrawals
                  <br />
                  <span dir="rtl">{rtlText('إجمالي السحوبات')}</span>
                </p>
                <p className="text-lg font-bold text-red-600">${formatNumber(statement.total_withdrawals)}</p>
              </div>
              <div className="rounded-lg p-4 border border-blue-200 bg-blue-50">
                <p className="text-xs text-gray-600 mb-1" dir="ltr">
                  Profits Distributed
                  <br />
                  <span dir="rtl">{rtlText('الأرباح الموزعة')}</span>
                </p>
                <p className="text-lg font-bold text-blue-600">
                  ${formatNumber(statement.total_profits_distributed)}
                </p>
              </div>
              <div className="rounded-lg p-4 border border-amber-200 bg-amber-50">
                <p className="text-xs text-gray-600 mb-1" dir="ltr">
                  Net Change
                  <br />
                  <span dir="rtl">{rtlText('صافي التغير')}</span>
                </p>
                <p
                  className={`text-lg font-bold ${
                    netChange >= 0 ? 'text-emerald-700' : 'text-red-600'
                  }`}
                >
                  ${formatNumber(netChange)}
                </p>
              </div>
            </div>

            <div className="mt-5 rounded-lg p-5 border-2 border-purple-300 bg-gradient-to-r from-purple-50 to-blue-50 text-center">
              <p className="text-sm font-semibold text-gray-700 mb-1" dir="ltr">
                Closing Balance / <span dir="rtl">{rtlText('الرصيد الختامي')}</span>
              </p>
              <p className="text-3xl font-bold text-gray-900">${formatNumber(statement.closing_balance)}</p>
            </div>
          </div>

          {/* Transactions */}
          <div className="p-6" dir="rtl">
            <h3 className="text-lg font-bold text-gray-800 mb-4" dir="ltr">
              Transaction Details / <span dir="rtl">{rtlText('تفاصيل الحركات')}</span>
            </h3>

            {statement.transactions && statement.transactions.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="min-w-full border border-gray-200 text-sm">
                  <thead className="sticky top-0">
                    <tr className="bg-gray-800 text-white">
                      <th className="px-4 py-3 text-center text-xs font-bold" dir="ltr">
                        Date
                        <br />
                        <span dir="rtl">{rtlText('التاريخ')}</span>
                      </th>
                      <th className="px-4 py-3 text-center text-xs font-bold" dir="ltr">
                        Type
                        <br />
                        <span dir="rtl">{rtlText('نوع الحركة')}</span>
                      </th>
                      <th className="px-4 py-3 text-center text-xs font-bold" dir="ltr">
                        Description
                        <br />
                        <span dir="rtl">{rtlText('الوصف')}</span>
                      </th>
                      <th className="px-4 py-3 text-center text-xs font-bold" dir="ltr">
                        Currency
                        <br />
                        <span dir="rtl">{rtlText('العملة')}</span>
                      </th>
                      <th className="px-4 py-3 text-center text-xs font-bold" dir="ltr">
                        Debit
                        <br />
                        <span dir="rtl">{rtlText('مدين')}</span>
                      </th>
                      <th className="px-4 py-3 text-center text-xs font-bold" dir="ltr">
                        Credit
                        <br />
                        <span dir="rtl">{rtlText('دائن')}</span>
                      </th>
                      <th className="px-4 py-3 text-center text-xs font-bold" dir="ltr">
                        Balance
                        <br />
                        <span dir="rtl">{rtlText('الرصيد')}</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {statement.transactions.map((tx, index) => (
                      <tr key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                        <td className="px-4 py-3 text-center whitespace-nowrap text-gray-700">
                          {formatDate(tx.transaction_date)}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span
                            className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${getTransactionBadgeClasses(
                              tx.transaction_type
                            )}`}
                            dir="rtl"
                          >
                            {rtlText(getTransactionTypeArabic(tx.transaction_type))}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center text-gray-700" dir="rtl">
                          {tx.description ? rtlText(tx.description) : '-'}
                        </td>
                        <td className="px-4 py-3 text-center text-gray-700">{tx.currency || '-'}</td>
                        <td className="px-4 py-3 text-center font-semibold text-red-600">
                          {tx.debit_amount > 0 ? formatNumber(tx.debit_amount) : '-'}
                        </td>
                        <td className="px-4 py-3 text-center font-semibold text-green-600">
                          {tx.credit_amount > 0 ? formatNumber(tx.credit_amount) : '-'}
                        </td>
                        <td className="px-4 py-3 text-center font-bold text-gray-900">
                          {formatNumber(tx.running_balance)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-12 text-gray-500">
                <FileText className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                <p className="text-lg font-semibold">لا توجد حركات في الفترة المحددة</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default PartnerStatementViewer;
