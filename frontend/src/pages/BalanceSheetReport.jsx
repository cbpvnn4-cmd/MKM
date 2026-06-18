import React, { useState, useEffect, useMemo } from 'react';
import { BarChart3, TrendingUp, Download, RefreshCw, FileText, FileSpreadsheet, FileImage, Loader2 } from 'lucide-react';
import Layout from '../components/Layout';
import { getBalanceSheetReport } from '../services/api';
import { exportToExcel, exportToCSV } from '../utils/exportUtils';
import usePdfPrint from '../hooks/usePdfPrint';
import BalanceSheetPDF from '../components/pdf/BalanceSheetPDF.jsx';

const BalanceSheetReport = () => {
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const pdfFileName = useMemo(() => 'balance_sheet_report.pdf', []);
  const { print: handlePrint, download: handleDownloadPDF, printing, downloading } = usePdfPrint({
    createDocument: () => <BalanceSheetPDF report={report} />,
    fileName: pdfFileName,
  });

  useEffect(() => {
    fetchReport();
  }, []);

  const fetchReport = async () => {
    try {
      setLoading(true);
      const data = await getBalanceSheetReport();
      setReport(data);
      setError(null);
    } catch (err) {
      setError('فشل في تحميل تقرير الميزانية العمومية');
      console.error('Error fetching balance sheet report:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = () => {
    fetchReport();
  };

  const handleExportExcel = () => {
    if (!report) return;
    
    const assetData = [
      { category: 'Cash & Bank', amount: parseFloat(report.cash_and_bank || 0) },
      { category: 'Accounts Receivable', amount: parseFloat(report.accounts_receivable || 0) },
      { category: 'Inventory', amount: parseFloat(report.inventory || 0) },
      { category: 'Equipment', amount: parseFloat(report.equipment || 0) },
      { category: 'Other Assets', amount: parseFloat(report.other_assets || 0) },
      { category: 'Total Assets', amount: parseFloat(report.total_assets || 0) }
    ];
    
    const liabilityData = [
      { category: 'Accounts Payable', amount: parseFloat(report.accounts_payable || 0) },
      { category: 'Short-term Loans', amount: parseFloat(report.short_term_loans || 0) },
      { category: 'Taxes Payable', amount: parseFloat(report.taxes_payable || 0) },
      { category: 'Other Liabilities', amount: parseFloat(report.other_liabilities || 0) },
      { category: 'Total Liabilities', amount: parseFloat(report.total_liabilities || 0) }
    ];
    
    const equityData = [
      { category: 'Partner Capital', amount: parseFloat(report.partner_capital || 0) },
      { category: 'Retained Earnings', amount: parseFloat(report.retained_earnings || 0) },
      { category: 'Total Equity', amount: parseFloat(report.total_equity || 0) }
    ];
    
    // Create workbook with all sections
    const workbook = XLSX.utils.book_new();
    
    // Add assets sheet
    const assetSheet = XLSX.utils.json_to_sheet(assetData);
    XLSX.utils.book_append_sheet(workbook, assetSheet, 'Assets');
    
    // Add liabilities sheet
    const liabilitySheet = XLSX.utils.json_to_sheet(liabilityData);
    XLSX.utils.book_append_sheet(workbook, liabilitySheet, 'Liabilities');
    
    // Add equity sheet
    const equitySheet = XLSX.utils.json_to_sheet(equityData);
    XLSX.utils.book_append_sheet(workbook, equitySheet, 'Equity');
    
    // Save workbook
    XLSX.writeFile(workbook, 'balance_sheet_report.xlsx');
  };

  const handleExportCSV = () => {
    if (!report) return;
    
    const assetData = [
      { category: 'Cash & Bank', amount: parseFloat(report.cash_and_bank || 0) },
      { category: 'Accounts Receivable', amount: parseFloat(report.accounts_receivable || 0) },
      { category: 'Inventory', amount: parseFloat(report.inventory || 0) },
      { category: 'Equipment', amount: parseFloat(report.equipment || 0) },
      { category: 'Other Assets', amount: parseFloat(report.other_assets || 0) },
      { category: 'Total Assets', amount: parseFloat(report.total_assets || 0) }
    ];
    
    const liabilityData = [
      { category: 'Accounts Payable', amount: parseFloat(report.accounts_payable || 0) },
      { category: 'Short-term Loans', amount: parseFloat(report.short_term_loans || 0) },
      { category: 'Taxes Payable', amount: parseFloat(report.taxes_payable || 0) },
      { category: 'Other Liabilities', amount: parseFloat(report.other_liabilities || 0) },
      { category: 'Total Liabilities', amount: parseFloat(report.total_liabilities || 0) }
    ];
    
    const equityData = [
      { category: 'Partner Capital', amount: parseFloat(report.partner_capital || 0) },
      { category: 'Retained Earnings', amount: parseFloat(report.retained_earnings || 0) },
      { category: 'Total Equity', amount: parseFloat(report.total_equity || 0) }
    ];
    
    // Create CSV with all sections
    const assetCSV = Papa.unparse(assetData);
    const liabilityCSV = Papa.unparse(liabilityData);
    const equityCSV = Papa.unparse(equityData);
    
    // Save CSV files
    exportToCSV(assetCSV, 'balance_sheet_report_assets.csv');
    exportToCSV(liabilityCSV, 'balance_sheet_report_liabilities.csv');
    exportToCSV(equityCSV, 'balance_sheet_report_equity.csv');
  };

  if (loading && !report) {
    return (
      <Layout>
        <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-blue-50">
          <div className="max-w-7xl mx-auto p-6">
            {/* Header */}
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 p-8 mb-8">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4 rtl:space-x-reverse">
                  <div className="w-12 h-12 bg-gradient-to-br from-emerald-500 to-blue-600 rounded-xl flex items-center justify-center">
                    <BarChart3 className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h1 className="text-3xl font-bold text-gray-800">تقرير الميزانية العمومية</h1>
                    <p className="text-gray-600 mt-1">عرض الأصول والخصوم وحقوق الملكية</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Loading Card */}
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 p-12">
              <div className="flex flex-col items-center justify-center space-y-4">
                <Loader2 className="w-12 h-12 text-emerald-500 animate-spin" />
                <div className="text-xl font-semibold text-gray-700">جاري تحميل التقرير...</div>
                <div className="text-gray-500">يرجى الانتظار قليلاً</div>
              </div>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  if (error && !report) {
    return (
      <Layout>
        <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-blue-50">
          <div className="max-w-7xl mx-auto p-6">
            {/* Header */}
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 p-8 mb-8">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4 rtl:space-x-reverse">
                  <div className="w-12 h-12 bg-gradient-to-br from-red-500 to-pink-600 rounded-xl flex items-center justify-center">
                    <BarChart3 className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h1 className="text-3xl font-bold text-gray-800">تقرير الميزانية العمومية</h1>
                    <p className="text-gray-600 mt-1">حدث خطأ في تحميل التقرير</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Error Card */}
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 p-8">
              <div className="text-center">
                <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
                  <BarChart3 className="w-10 h-10 text-red-500" />
                </div>
                <h2 className="text-2xl font-bold text-gray-800 mb-4">خطأ في التحميل</h2>
                <div className="text-red-600 text-lg mb-8">{error}</div>
                <button
                  className="inline-flex items-center px-8 py-3 bg-gradient-to-r from-emerald-500 to-blue-600 text-white font-semibold rounded-xl hover:from-emerald-600 hover:to-blue-700 transform hover:scale-105 transition-all duration-200 shadow-lg hover:shadow-xl"
                  onClick={handleRefresh}
                >
                  <RefreshCw className="w-5 h-5 ml-2" />
                  محاولة مرة أخرى
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
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-blue-50">
        <div className="max-w-7xl mx-auto p-6">
          {/* Header */}
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 p-8 mb-8">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4 rtl:space-x-reverse">
                <div className="w-12 h-12 bg-gradient-to-br from-emerald-500 to-blue-600 rounded-xl flex items-center justify-center">
                  <BarChart3 className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h1 className="text-3xl font-bold text-gray-800">تقرير الميزانية العمومية</h1>
                  <p className="text-gray-600 mt-1">عرض الأصول والخصوم وحقوق الملكية</p>
                </div>
              </div>
              <div className="flex items-center space-x-3 rtl:space-x-reverse">
                <button
                  className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-emerald-500 to-blue-600 text-white font-semibold rounded-xl hover:from-emerald-600 hover:to-blue-700 transform hover:scale-105 transition-all duration-200 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
                  onClick={handleRefresh}
                  disabled={loading}
                >
                  <RefreshCw className={`w-5 h-5 ml-2 ${loading ? 'animate-spin' : ''}`} />
                  {loading ? 'جاري التحديث...' : 'تحديث'}
                </button>
              </div>
            </div>
          </div>

          {report && (
            <div className="space-y-8">
              {/* Report Info */}
              <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 p-8">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4 rtl:space-x-reverse">
                    <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-600 rounded-xl flex items-center justify-center">
                      <FileText className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-gray-800">معلومات التقرير</h3>
                      <p className="text-gray-600">
                        تم الإنشاء في: {report.generated_date ? new Date(report.generated_date).toLocaleDateString() : new Date().toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <div className="flex space-x-3 rtl:space-x-reverse">
                    <button
                      onClick={handleDownloadPDF}
                      disabled={!report || printing || downloading}
                      className="inline-flex items-center px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      <FileText className="w-4 h-4 ml-2" />
                      {downloading ? 'جارٍ التحميل...' : 'PDF'}
                    </button>
                    <button
                      onClick={handleExportExcel}
                      className="inline-flex items-center px-4 py-2 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors"
                    >
                      <FileSpreadsheet className="w-4 h-4 ml-2" />
                      Excel
                    </button>
                    <button
                      onClick={handleExportCSV}
                      className="inline-flex items-center px-4 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors"
                    >
                      <FileImage className="w-4 h-4 ml-2" />
                      CSV
                    </button>
                  </div>
                </div>
              </div>

              {/* Financial Summary Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">إجمالي الأصول</p>
                      <p className="text-3xl font-bold text-emerald-600">${parseFloat(report.total_assets || 0).toLocaleString()}</p>
                    </div>
                    <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center">
                      <TrendingUp className="w-6 h-6 text-emerald-600" />
                    </div>
                  </div>
                </div>

                <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">إجمالي الخصوم</p>
                      <p className="text-3xl font-bold text-red-600">${parseFloat(report.total_liabilities || 0).toLocaleString()}</p>
                    </div>
                    <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center">
                      <TrendingUp className="w-6 h-6 text-red-600" />
                    </div>
                  </div>
                </div>

                <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">حقوق الملكية</p>
                      <p className="text-3xl font-bold text-blue-600">${parseFloat(report.total_equity || 0).toLocaleString()}</p>
                    </div>
                    <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                      <TrendingUp className="w-6 h-6 text-blue-600" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Assets Section */}
              <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 overflow-hidden">
                <div className="bg-gradient-to-r from-emerald-500 to-blue-600 px-6 py-4">
                  <h4 className="font-bold text-white text-lg">الأصول</h4>
                </div>
                <div className="p-6 space-y-4">
                  <div className="flex justify-between items-center py-3 border-b border-gray-100">
                    <span className="text-gray-700 font-medium">النقد والبنوك</span>
                    <span className="font-bold text-emerald-600">${parseFloat(report.cash_and_bank || 0).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between items-center py-3 border-b border-gray-100">
                    <span className="text-gray-700 font-medium">الذمم المدينة</span>
                    <span className="font-bold text-emerald-600">${parseFloat(report.accounts_receivable || 0).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between items-center py-3 border-b border-gray-100">
                    <span className="text-gray-700 font-medium">المخزون</span>
                    <span className="font-bold text-emerald-600">${parseFloat(report.inventory || 0).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between items-center py-3 border-b border-gray-100">
                    <span className="text-gray-700 font-medium">المعدات</span>
                    <span className="font-bold text-emerald-600">${parseFloat(report.equipment || 0).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between items-center py-3 border-b border-gray-100">
                    <span className="text-gray-700 font-medium">أصول أخرى</span>
                    <span className="font-bold text-emerald-600">${parseFloat(report.other_assets || 0).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between items-center py-4 bg-emerald-50 rounded-lg px-4 mt-4">
                    <span className="font-bold text-gray-800 text-lg">إجمالي الأصول</span>
                    <span className="font-bold text-emerald-700 text-xl">${parseFloat(report.total_assets || 0).toLocaleString()}</span>
                  </div>
                </div>
              </div>

              {/* Liabilities Section */}
              <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 overflow-hidden">
                <div className="bg-gradient-to-r from-red-500 to-pink-600 px-6 py-4">
                  <h4 className="font-bold text-white text-lg">الخصوم</h4>
                </div>
                <div className="p-6 space-y-4">
                  <div className="flex justify-between items-center py-3 border-b border-gray-100">
                    <span className="text-gray-700 font-medium">الذمم الدائنة</span>
                    <span className="font-bold text-red-600">${parseFloat(report.accounts_payable || 0).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between items-center py-3 border-b border-gray-100">
                    <span className="text-gray-700 font-medium">القروض قصيرة الأجل</span>
                    <span className="font-bold text-red-600">${parseFloat(report.short_term_loans || 0).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between items-center py-3 border-b border-gray-100">
                    <span className="text-gray-700 font-medium">الضرائب المستحقة</span>
                    <span className="font-bold text-red-600">${parseFloat(report.taxes_payable || 0).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between items-center py-3 border-b border-gray-100">
                    <span className="text-gray-700 font-medium">خصوم أخرى</span>
                    <span className="font-bold text-red-600">${parseFloat(report.other_liabilities || 0).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between items-center py-4 bg-red-50 rounded-lg px-4 mt-4">
                    <span className="font-bold text-gray-800 text-lg">إجمالي الخصوم</span>
                    <span className="font-bold text-red-700 text-xl">${parseFloat(report.total_liabilities || 0).toLocaleString()}</span>
                  </div>
                </div>
              </div>

              {/* Equity Section */}
              <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 overflow-hidden">
                <div className="bg-gradient-to-r from-blue-500 to-purple-600 px-6 py-4">
                  <h4 className="font-bold text-white text-lg">حقوق الملكية</h4>
                </div>
                <div className="p-6 space-y-4">
                  <div className="flex justify-between items-center py-3 border-b border-gray-100">
                    <span className="text-gray-700 font-medium">رأس مال الشريك</span>
                    <span className="font-bold text-blue-600">${parseFloat(report.partner_capital || 0).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between items-center py-3 border-b border-gray-100">
                    <span className="text-gray-700 font-medium">الأرباح المحتجزة</span>
                    <span className="font-bold text-blue-600">${parseFloat(report.retained_earnings || 0).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between items-center py-4 bg-blue-50 rounded-lg px-4 mt-4">
                    <span className="font-bold text-gray-800 text-lg">إجمالي حقوق الملكية</span>
                    <span className="font-bold text-blue-700 text-xl">${parseFloat(report.total_equity || 0).toLocaleString()}</span>
                  </div>
                </div>
              </div>

              {/* Balance Check */}
              <div className="bg-gradient-to-r from-purple-500 to-pink-600 rounded-2xl shadow-xl p-8 text-white">
                <div className="text-center">
                  <h3 className="text-2xl font-bold mb-4">معادلة الميزانية</h3>
                  <div className="flex justify-center items-center space-x-8 rtl:space-x-reverse text-lg">
                    <div className="text-center">
                      <div className="font-semibold">إجمالي الخصوم + حقوق الملكية</div>
                      <div className="text-3xl font-bold mt-2">${parseFloat((report.total_liabilities || 0) + (report.total_equity || 0)).toLocaleString()}</div>
                    </div>
                    <div className="text-4xl font-bold">=</div>
                    <div className="text-center">
                      <div className="font-semibold">إجمالي الأصول</div>
                      <div className="text-3xl font-bold mt-2">${parseFloat(report.total_assets || 0).toLocaleString()}</div>
                    </div>
                  </div>
                  <div className="mt-4 text-sm opacity-90">
                    {parseFloat((report.total_liabilities || 0) + (report.total_equity || 0)).toFixed(2) === parseFloat(report.total_assets || 0).toFixed(2)
                      ? '✅ الميزانية متوازنة'
                      : '⚠️ الميزانية غير متوازنة'}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
};

export default BalanceSheetReport;
