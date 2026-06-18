import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { 
  ArrowLeft, FileText, Printer, Download, Calendar, User, Building, Phone, Mail, MapPin,
  CreditCard, Package, Calculator, CheckCircle, Clock, AlertTriangle, Star, Award,
  TrendingUp, BarChart3, PieChart, DollarSign, Receipt, FileCheck, Search,
  ChevronRight, ChevronDown, Tag, Shield, Zap, Target, Gift, BookOpen, Globe,
  ExternalLink, Share2, Bookmark, Filter, Grid3x3, List, Layers, Settings2,
  Loader2, RefreshCw, PlusCircle, MinusCircle, MoreHorizontal, Info, HelpCircle,
  XCircle, AlertCircle, CheckCircle2, FileImage, PrinterCheck, DownloadCloud
} from 'lucide-react';
import Layout from '../components/Layout';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter
} from '../components/ui/card';
import {
  Button
} from '../components/ui/button';
import {
  Badge
} from '../components/ui/badge';
import {
  Separator
} from '../components/ui/separator';
import {
  Alert,
  AlertDescription,
  AlertTitle
} from '../components/ui/alert';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger
} from '../components/ui/tooltip';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger
} from '../components/ui/collapsible';
import { getInvoice, getCustomers } from '../services/api';
import InvoicePDF from '../components/pdf/InvoicePDF';
import usePdfPrint from '../hooks/usePdfPrint';

// Status configuration with enhanced icons and colors
const statusConfig = {
  DRAFT: {
    label: 'مسودة',
    icon: Clock,
    color: 'bg-gray-100 text-gray-700 border-gray-200',
    progress: 0,
    bgGradient: 'from-gray-400 to-gray-600'
  },
  ISSUED: {
    label: 'صادرة',
    icon: FileCheck,
    color: 'bg-blue-100 text-blue-700 border-blue-200',
    progress: 25,
    bgGradient: 'from-blue-500 to-indigo-600'
  },
  PARTIALLY_PAID: {
    label: 'مدفوعة جزئياً',
    icon: DollarSign,
    color: 'bg-amber-100 text-amber-700 border-amber-200',
    progress: 60,
    bgGradient: 'from-amber-500 to-orange-600'
  },
  PAID: {
    label: 'مدفوعة',
    icon: CheckCircle2,
    color: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    progress: 100,
    bgGradient: 'from-emerald-500 to-green-600'
  },
  OVERDUE: {
    label: 'متأخرة',
    icon: AlertTriangle,
    color: 'bg-red-100 text-red-700 border-red-200',
    progress: 75,
    bgGradient: 'from-red-500 to-pink-600'
  },
  VOID: {
    label: 'ملغاة',
    icon: XCircle,
    color: 'bg-gray-100 text-gray-500 border-gray-200',
    progress: 0,
    bgGradient: 'from-gray-500 to-slate-600'
  }
};

const formatCurrency = (value) => {
  const amount = typeof value === 'number' ? value : 0;
  return new Intl.NumberFormat('en-US', { 
    style: 'currency', 
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount);
};

const formatDate = (dateString) => {
  if (!dateString) return '-';
  return new Date(dateString).toLocaleDateString('ar-EG', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
};

const InvoiceDisplayEnhanced = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const [invoice, setInvoice] = useState(null);
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeView, setActiveView] = useState('overview');
  const [showPaymentDetails, setShowPaymentDetails] = useState(false);
  const pdfFileName = useMemo(() => `Invoice_${invoice?.invoice_no || 'invoice'}.pdf`, [invoice]);
  const { print: handlePrint, download: handleExportPDF, printing, downloading } = usePdfPrint({
    createDocument: () => <InvoicePDF invoice={invoice} />,
    fileName: pdfFileName,
  });

  // Load invoice data
  useEffect(() => {
    const loadInvoiceData = async () => {
      try {
        setLoading(true);
        const invoiceId = id && id !== 'new' ? id : searchParams.get('id');
        
        if (!invoiceId) {
          setError('معرف الفاتورة غير متوفر');
          return;
        }

        const invoiceData = await getInvoice(invoiceId);
        setInvoice(invoiceData);
        
        // Load customers for additional data
        try {
          const customersData = await getCustomers(0, 50);
          setCustomers(customersData?.data || customersData || []);
        } catch (err) {
          console.warn('Could not load customers data:', err);
        }

        setError(null);
      } catch (err) {
        setError('فشل في تحميل بيانات الفاتورة');
        console.error('Error loading invoice:', err);
      } finally {
        setLoading(false);
      }
    };

    loadInvoiceData();
  }, [id, searchParams]);

  // Calculate totals with enhanced calculations
  const calculateTotals = useCallback(() => {
    if (!invoice || !Array.isArray(invoice.items)) {
      return { 
        subtotal: 0, 
        taxAmount: 0, 
        total: 0,
        totalItems: 0,
        averageAmount: 0
      };
    }

    const subtotal = invoice.items.reduce((sum, item) => {
      const quantity = Number(item.quantity || item.qty || 0);
      const unitPrice = Number(item.unit_price_usd || item.unitPrice || 0);
      const lineTotal = quantity * unitPrice;
      return sum + lineTotal;
    }, 0);

    const taxAmount = (subtotal * (invoice.tax_pct || 0)) / 100;
    const total = subtotal + taxAmount;
    const totalItems = invoice.items.reduce((sum, item) => sum + Number(item.quantity || item.qty || 0), 0);
    const averageAmount = totalItems > 0 ? subtotal / totalItems : 0;

    return { subtotal, taxAmount, total, totalItems, averageAmount };
  }, [invoice]);

    }
  };

  // Enhanced status badge with animation
  const StatusBadge = ({ status }) => {
    const config = statusConfig[status] || statusConfig.DRAFT;
    const Icon = config.icon;
    
    return (
      <Badge className={`${config.color} transition-all duration-300 hover:scale-105`}>
        <Icon className="w-3 h-3 mr-1" />
        {config.label}
      </Badge>
    );
  };

  // Enhanced progress bar with gradient
  const StatusProgress = ({ status }) => {
    const config = statusConfig[status] || statusConfig.DRAFT;
    
    return (
      <div className="w-full space-y-2">
        <div className="flex justify-between text-sm text-gray-600">
          <span className="font-medium">تقدم المعالجة</span>
          <span className="font-bold">{config.progress}%</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
          <div 
            className={`h-3 rounded-full transition-all duration-500 bg-gradient-to-r ${config.bgGradient}`}
            style={{ width: `${config.progress}%` }}
          />
        </div>
      </div>
    );
  };

  // Loading state with enhanced animation
  if (loading) {
    return (
      <Layout>
        <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex items-center justify-center px-4">
          <Card className="w-full max-w-md bg-white/80 backdrop-blur-sm border-white/20 shadow-2xl">
            <CardContent className="p-8 text-center">
              <div className="relative mb-6">
                <div className="w-16 h-16 mx-auto bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full flex items-center justify-center">
                  <Receipt className="w-8 h-8 text-white animate-pulse" />
                </div>
                <div className="absolute -top-1 -right-1">
                  <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
                </div>
              </div>
              <h3 className="text-xl font-bold text-gray-800 mb-2">جارٍ تحميل بيانات الفاتورة</h3>
              <p className="text-gray-600 mb-4">يرجى الانتظار قليلاً...</p>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div className="bg-gradient-to-r from-blue-500 to-indigo-600 h-2 rounded-full animate-pulse" style={{ width: '70%' }}></div>
              </div>
            </CardContent>
          </Card>
        </div>
      </Layout>
    );
  }

  // Error state with enhanced styling
  if (error) {
    return (
      <Layout>
        <div className="min-h-screen bg-gradient-to-br from-red-50 via-white to-pink-50 flex items-center justify-center px-4">
          <Card className="w-full max-w-md bg-white/80 backdrop-blur-sm border-white/20 shadow-2xl">
            <CardContent className="p-8 text-center">
              <div className="w-16 h-16 mx-auto mb-6 bg-gradient-to-r from-red-500 to-pink-600 rounded-full flex items-center justify-center">
                <AlertTriangle className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-xl font-bold text-gray-800 mb-2">حدث خطأ</h3>
              <p className="text-gray-600 mb-6">{error}</p>
              <Button 
                onClick={() => navigate('/invoices')} 
                className="w-full bg-gradient-to-r from-red-500 to-pink-600 hover:from-red-600 hover:to-pink-700"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                العودة إلى الفواتير
              </Button>
            </CardContent>
          </Card>
        </div>
      </Layout>
    );
  }

  const totals = calculateTotals();

  return (
    <Layout>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50">
        {/* Enhanced Header */}
        <div className="bg-white/80 backdrop-blur-sm shadow-xl border-b border-white/20 sticky top-0 z-40">
          <div className="max-w-7xl mx-auto px-6 py-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4 rtl:space-x-reverse">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigate('/invoices')}
                  className="rounded-full hover:scale-105 transition-all duration-200"
                >
                  <ArrowLeft className="w-4 h-4" />
                </Button>
                <div className="flex items-center space-x-3 rtl:space-x-reverse">
                  <div className="w-12 h-12 bg-gradient-to-br from-emerald-500 to-blue-600 rounded-xl flex items-center justify-center shadow-lg">
                    <Receipt className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h1 className="text-3xl font-bold text-gray-800">عرض الفاتورة</h1>
                    <p className="text-gray-600 flex items-center">
                      عرض تفصيلي لفاتورة #{invoice?.invoice_no}
                      <StatusBadge status={invoice?.status} className="ml-2" />
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="flex items-center gap-3">
                <Button
                  variant="outline"
                  onClick={handlePrint}
                  className="rounded-xl hover:scale-105 transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed"
                  disabled={!invoice || printing || downloading}
                >
                  <PrinterCheck className="w-4 h-4" />
                  {printing ? 'جارٍ التحضير...' : 'طباعة'}
                </Button>

                <Button
                  onClick={handleExportPDF}
                  disabled={!invoice || printing || downloading}
                  className="rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 hover:scale-105 transition-all duration-200 shadow-lg disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {downloading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <DownloadCloud className="w-4 h-4" />
                  )}
                  {downloading ? 'جارٍ التحميل...' : 'تصدير PDF'}
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Enhanced Navigation Tabs */}
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex space-x-1 rtl:space-x-reverse bg-white/60 backdrop-blur-sm p-1 rounded-xl shadow-sm border border-white/20">
            {[
              { id: 'overview', label: 'نظرة عامة', icon: Grid3x3, color: 'blue' },
              { id: 'details', label: 'التفاصيل', icon: FileText, color: 'green' },
              { id: 'payments', label: 'المدفوعات', icon: CreditCard, color: 'emerald' },
              { id: 'timeline', label: 'الخط الزمني', icon: Clock, color: 'purple' }
            ].map((tab) => {
              const Icon = tab.icon;
              const isActive = activeView === tab.id;
              return (
                <Button
                  key={tab.id}
                  variant={isActive ? "default" : "ghost"}
                  onClick={() => setActiveView(tab.id)}
                  className={`flex-1 rounded-lg transition-all duration-200 ${
                    isActive ? `bg-${tab.color}-600 hover:bg-${tab.color}-700 text-white shadow-md` : 'hover:bg-white/50'
                  }`}
                >
                  <Icon className={`w-4 h-4 mr-2 ${isActive ? 'text-white' : `text-${tab.color}-600`}`} />
                  {tab.label}
                </Button>
              );
            })}
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-6 pb-8">
          {/* Enhanced Overview Tab */}
          {activeView === 'overview' && (
            <div className="space-y-8">
              {/* Enhanced Status and Progress */}
              <Card className="bg-white/80 backdrop-blur-sm border-white/20 shadow-xl">
                <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-t-lg">
                  <CardTitle className="flex items-center justify-between text-xl">
                    <span className="flex items-center">
                      <TrendingUp className="w-6 h-6 mr-2 text-blue-600" />
                      حالة الفاتورة
                    </span>
                    <StatusBadge status={invoice?.status} />
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6 space-y-6">
                  <StatusProgress status={invoice?.status} />
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="text-center p-6 bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl border border-blue-200">
                      <div className="text-3xl font-bold text-blue-600 mb-2">
                        {formatCurrency(totals.total)}
                      </div>
                      <div className="text-sm text-blue-700 font-medium">إجمالي الفاتورة</div>
                      <div className="text-xs text-blue-600 mt-1">القيمة الكاملة للفاتورة</div>
                    </div>
                    <div className="text-center p-6 bg-gradient-to-br from-emerald-50 to-emerald-100 rounded-xl border border-emerald-200">
                      <div className="text-3xl font-bold text-emerald-600 mb-2">
                        {formatCurrency(invoice?.paid_amount_usd || 0)}
                      </div>
                      <div className="text-sm text-emerald-700 font-medium">المبلغ المدفوع</div>
                      <div className="text-xs text-emerald-600 mt-1">تم استلام هذه القيمة</div>
                    </div>
                    <div className="text-center p-6 bg-gradient-to-br from-amber-50 to-amber-100 rounded-xl border border-amber-200">
                      <div className="text-3xl font-bold text-amber-600 mb-2">
                        {formatCurrency(totals.total - (invoice?.paid_amount_usd || 0))}
                      </div>
                      <div className="text-sm text-amber-700 font-medium">المبلغ المتبقي</div>
                      <div className="text-xs text-amber-600 mt-1">مطلوب تحصيله</div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Enhanced Quick Actions */}
              <Card className="bg-white/80 backdrop-blur-sm border-white/20 shadow-xl">
                <CardHeader className="bg-gradient-to-r from-emerald-50 to-blue-50 rounded-t-lg">
                  <CardTitle className="flex items-center text-xl">
                    <Zap className="w-6 h-6 mr-2 text-emerald-600" />
                    الإجراءات السريعة
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {[
                      { icon: DownloadCloud, label: 'تحميل PDF', action: handleExportPDF, color: 'amber' },
                      { icon: PrinterCheck, label: 'طباعة', action: handlePrint, color: 'blue' },
                      { icon: Share2, label: 'مشاركة', action: () => {}, color: 'green' },
                      { icon: Bookmark, label: 'حفظ', action: () => {}, color: 'purple' }
                    ].map((action, index) => {
                      const Icon = action.icon;
                      return (
                        <Button
                          key={index}
                          variant="outline"
                          onClick={action.action}
                          className={`h-20 flex-col space-y-2 hover:scale-105 transition-all duration-200 bg-${action.color}-50 border-${action.color}-200 hover:bg-${action.color}-100`}
                          disabled={!invoice || printing || downloading}
                        >
                          <Icon className={`w-6 h-6 text-${action.color}-600`} />
                          <span className={`text-sm text-${action.color}-700 font-medium`}>{action.label}</span>
                        </Button>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>

              {/* Statistics Cards */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                {[
                  { 
                    icon: Package, 
                    label: 'عدد البنود', 
                    value: invoice?.items?.length || 0,
                    color: 'blue',
                    gradient: 'from-blue-500 to-blue-600'
                  },
                  { 
                    icon: Calculator, 
                    label: 'إجمالي الكمية', 
                    value: totals.totalItems,
                    color: 'green',
                    gradient: 'from-green-500 to-green-600'
                  },
                  { 
                    icon: DollarSign, 
                    label: 'متوسط السعر', 
                    value: formatCurrency(totals.averageAmount),
                    color: 'emerald',
                    gradient: 'from-emerald-500 to-emerald-600'
                  },
                  { 
                    icon: FileText, 
                    label: 'رقم الفاتورة', 
                    value: invoice?.invoice_no || '-',
                    color: 'purple',
                    gradient: 'from-purple-500 to-purple-600'
                  }
                ].map((stat, index) => {
                  const Icon = stat.icon;
                  return (
                    <Card key={index} className="bg-white/80 backdrop-blur-sm border-white/20 shadow-lg hover:shadow-xl transition-all duration-200">
                      <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium text-gray-600">{stat.label}</p>
                            <p className="text-2xl font-bold text-gray-800">{stat.value}</p>
                          </div>
                          <div className={`w-12 h-12 bg-gradient-to-br ${stat.gradient} rounded-xl flex items-center justify-center`}>
                            <Icon className="w-6 h-6 text-white" />
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          )}

          {/* Enhanced Details Tab */}
          {activeView === 'details' && (
            <div className="space-y-8">
              {/* Enhanced Invoice Information */}
              <Card className="bg-white/80 backdrop-blur-sm border-white/20 shadow-xl">
                <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-t-lg">
                  <CardTitle className="flex items-center text-xl">
                    <Info className="w-6 h-6 mr-2 text-blue-600" />
                    معلومات الفاتورة
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6 space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-6">
                      <div className="flex items-center space-x-4 rtl:space-x-reverse p-4 bg-blue-50 rounded-xl border border-blue-100">
                        <FileText className="w-8 h-8 text-blue-600" />
                        <div>
                          <div className="text-sm text-blue-600 font-medium">رقم الفاتورة</div>
                          <div className="text-lg font-bold text-gray-800">#{invoice?.invoice_no}</div>
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-4 rtl:space-x-reverse p-4 bg-green-50 rounded-xl border border-green-100">
                        <Calendar className="w-8 h-8 text-green-600" />
                        <div>
                          <div className="text-sm text-green-600 font-medium">تاريخ الإصدار</div>
                          <div className="text-lg font-bold text-gray-800">{formatDate(invoice?.issue_date)}</div>
                        </div>
                      </div>

                      <div className="flex items-center space-x-4 rtl:space-x-reverse p-4 bg-amber-50 rounded-xl border border-amber-100">
                        <Clock className="w-8 h-8 text-amber-600" />
                        <div>
                          <div className="text-sm text-amber-600 font-medium">تاريخ الاستحقاق</div>
                          <div className="text-lg font-bold text-gray-800">{formatDate(invoice?.due_date)}</div>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-6">
                      <div className="flex items-center space-x-4 rtl:space-x-reverse p-4 bg-purple-50 rounded-xl border border-purple-100">
                        <User className="w-8 h-8 text-purple-600" />
                        <div>
                          <div className="text-sm text-purple-600 font-medium">العميل</div>
                          <div className="text-lg font-bold text-gray-800">{invoice?.customer?.name || invoice?.customer_name || 'غير محدد'}</div>
                        </div>
                      </div>

                      <div className="flex items-center space-x-4 rtl:space-x-reverse p-4 bg-indigo-50 rounded-xl border border-indigo-100">
                        <Tag className="w-8 h-8 text-indigo-600" />
                        <div>
                          <div className="text-sm text-indigo-600 font-medium">العملة</div>
                          <div className="text-lg font-bold text-gray-800">{invoice?.currency || 'USD'}</div>
                        </div>
                      </div>

                      <div className="flex items-center space-x-4 rtl:space-x-reverse p-4 bg-emerald-50 rounded-xl border border-emerald-100">
                        <Calculator className="w-8 h-8 text-emerald-600" />
                        <div>
                          <div className="text-sm text-emerald-600 font-medium">نسبة الضريبة</div>
                          <div className="text-lg font-bold text-gray-800">{invoice?.tax_pct || 0}%</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Enhanced Invoice Items */}
              <Card className="bg-white/80 backdrop-blur-sm border-white/20 shadow-xl">
                <CardHeader className="bg-gradient-to-r from-emerald-50 to-blue-50 rounded-t-lg">
                  <CardTitle className="flex items-center text-xl">
                    <Package className="w-6 h-6 mr-2 text-emerald-600" />
                    بنود الفاتورة
                  </CardTitle>
                  <CardDescription>
                    تفاصيل جميع البنود والخدمات في هذه الفاتورة
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b-2 border-gray-200 bg-gradient-to-r from-gray-50 to-gray-100">
                          <th className="text-right py-4 px-6 font-bold text-gray-700">الوصف</th>
                          <th className="text-center py-4 px-4 font-bold text-gray-700">الكمية</th>
                          <th className="text-center py-4 px-4 font-bold text-gray-700">سعر الوحدة</th>
                          <th className="text-center py-4 px-4 font-bold text-gray-700">الإجمالي</th>
                        </tr>
                      </thead>
                      <tbody>
                        {invoice?.items?.map((item, index) => (
                          <tr key={index} className="border-b hover:bg-gray-50 transition-colors duration-200">
                            <td className="py-4 px-6">
                              <div className="font-semibold text-gray-800">{item.description || item.product_name}</div>
                              {item.product_code && (
                                <div className="text-sm text-gray-500 mt-1">
                                  <Badge variant="outline" className="text-xs">
                                    <Tag className="w-3 h-3 mr-1" />
                                    {item.product_code}
                                  </Badge>
                                </div>
                              )}
                            </td>
                            <td className="text-center py-4 px-4 font-semibold text-blue-600">
                              {Number(item.quantity || item.qty || 0).toLocaleString('en-US')}
                            </td>
                            <td className="text-center py-4 px-4 font-semibold text-emerald-600">
                              {formatCurrency(item.unit_price_usd || item.unitPrice || 0)}
                            </td>
                            <td className="text-center py-4 px-4 font-bold text-gray-800">
                              {formatCurrency(
                                (item.quantity || item.qty || 0) * (item.unit_price_usd || item.unitPrice || 0)
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>

              {/* Enhanced Invoice Totals */}
              <Card className="bg-white/80 backdrop-blur-sm border-white/20 shadow-xl">
                <CardContent className="p-6 pt-8">
                  <div className="space-y-4">
                    <div className="flex justify-between items-center py-3 border-b border-gray-200">
                      <span className="text-gray-600 font-medium">المجموع الفرعي:</span>
                      <span className="font-bold text-gray-800 text-lg">{formatCurrency(totals.subtotal)}</span>
                    </div>
                    {invoice?.tax_pct > 0 && (
                      <div className="flex justify-between items-center py-3 border-b border-gray-200">
                        <span className="text-gray-600 font-medium">الضريبة ({invoice.tax_pct}%):</span>
                        <span className="font-bold text-amber-600 text-lg">{formatCurrency(totals.taxAmount)}</span>
                      </div>
                    )}
                    <Separator />
                    <div className="flex justify-between items-center p-4 bg-gradient-to-r from-emerald-500 to-blue-600 text-white rounded-xl">
                      <span className="font-bold text-lg">الإجمالي النهائي:</span>
                      <span className="text-2xl font-bold">{formatCurrency(totals.total)}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Enhanced Payments Tab */}
          {activeView === 'payments' && (
            <Card className="bg-white/80 backdrop-blur-sm border-white/20 shadow-xl">
              <CardHeader className="bg-gradient-to-r from-emerald-50 to-green-50 rounded-t-lg">
                <CardTitle className="flex items-center text-xl">
                  <CreditCard className="w-6 h-6 mr-2 text-emerald-600" />
                  المدفوعات
                </CardTitle>
                <CardDescription>
                  تتبع جميع المدفوعات المستلمة لهذه الفاتورة
                </CardDescription>
              </CardHeader>
              <CardContent>
                {invoice?.payments && invoice.payments.length > 0 ? (
                  <div className="space-y-4">
                    {invoice.payments.map((payment, index) => (
                      <div key={index} className="flex items-center justify-between p-6 bg-gradient-to-r from-emerald-50 to-green-50 rounded-xl border border-emerald-200 hover:shadow-md transition-all duration-200">
                        <div className="flex items-center space-x-4 rtl:space-x-reverse">
                          <div className="w-12 h-12 bg-gradient-to-br from-emerald-500 to-green-600 rounded-full flex items-center justify-center shadow-md">
                            <CreditCard className="w-6 h-6 text-white" />
                          </div>
                          <div>
                            <div className="font-bold text-lg text-gray-800">{formatCurrency(payment.amount_usd)}</div>
                            <div className="text-sm text-emerald-600 font-medium">{payment.method}</div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm text-gray-600">تاريخ الدفع</div>
                          <div className="font-bold text-gray-800">{formatDate(payment.paid_on)}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-br from-gray-100 to-gray-200 rounded-full flex items-center justify-center">
                      <CreditCard className="w-10 h-10 text-gray-400" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-600 mb-2">لا توجد مدفوعات مسجلة بعد</h3>
                    <p className="text-gray-500">سيتم عرض المدفوعات عند استلامها</p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Enhanced Timeline Tab */}
          {activeView === 'timeline' && (
            <Card className="bg-white/80 backdrop-blur-sm border-white/20 shadow-xl">
              <CardHeader className="bg-gradient-to-r from-purple-50 to-indigo-50 rounded-t-lg">
                <CardTitle className="flex items-center text-xl">
                  <Clock className="w-6 h-6 mr-2 text-purple-600" />
                  الخط الزمني
                </CardTitle>
                <CardDescription>
                  تتبع جميع الأحداث والتغييرات في حالة الفاتورة
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {[
                    {
                      icon: FileCheck,
                      title: 'تم إنشاء الفاتورة',
                      date: invoice?.created_at || invoice?.issue_date,
                      description: 'تم إنشاء الفاتورة بحالة مسودة',
                      status: 'completed',
                      color: 'blue'
                    },
                    ...(invoice?.status !== 'DRAFT' ? [{
                      icon: FileText,
                      title: 'تم إصدار الفاتورة',
                      date: invoice?.issue_date,
                      description: 'تم إرسال الفاتورة للعميل',
                      status: 'completed',
                      color: 'green'
                    }] : []),
                    ...(invoice?.payments && invoice.payments.length > 0 ? [{
                      icon: CreditCard,
                      title: 'تم استلام دفعة',
                      date: invoice.payments[0]?.paid_on,
                      description: `تم استلام دفعة بقيمة ${formatCurrency(invoice.payments[0]?.amount_usd)}`,
                      status: 'completed',
                      color: 'emerald'
                    }] : [])
                  ].map((event, index) => {
                    const Icon = event.icon;
                    return (
                      <div key={index} className="flex items-start space-x-4 rtl:space-x-reverse">
                        <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                          event.status === 'completed' ? 
                            `bg-${event.color}-100 border-2 border-${event.color}-200` : 
                            'bg-gray-100 border-2 border-gray-200'
                        }`}>
                          <Icon className={`w-6 h-6 ${
                            event.status === 'completed' ? `text-${event.color}-600` : 'text-gray-400'
                          }`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <h4 className="font-bold text-gray-900">{event.title}</h4>
                            <time className="text-sm text-gray-500 font-medium">{formatDate(event.date)}</time>
                          </div>
                          <p className="text-sm text-gray-600 mt-1">{event.description}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

              <tbody>
                {invoice?.items?.map((item, index) => (
                  <tr key={index} className="hover:bg-gray-50">
                    <td className="border border-gray-300 px-4 py-3">
                      <div className="font-semibold">{item.description || item.product_name}</div>
                      {item.product_code && (
                        <div className="text-sm text-gray-600">رمز المنتج: {item.product_code}</div>
                      )}
                    </td>
                    <td className="border border-gray-300 px-4 py-3 text-center font-semibold">
                      {Number(item.quantity || item.qty || 0).toLocaleString('en-US')}
                    </td>
                    <td className="border border-gray-300 px-4 py-3 text-center font-semibold">
                      {formatCurrency(item.unit_price_usd || item.unitPrice || 0)}
                    </td>
                    <td className="border border-gray-300 px-4 py-3 text-center font-bold">
                      {formatCurrency(
                        (item.quantity || item.qty || 0) * (item.unit_price_usd || item.unitPrice || 0)
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Enhanced Totals */}
            <div className="text-left ml-auto w-1/3 bg-gray-50 p-6 rounded-lg border border-gray-200">
              <table className="w-full">
                <tr>
                  <td className="py-2 font-medium">المجموع الفرعي:</td>
                  <td className="py-2 text-right font-bold">{formatCurrency(totals.subtotal)}</td>
                </tr>
                {invoice?.tax_pct > 0 && (
                  <tr>
                    <td className="py-2 font-medium">الضريبة ({invoice.tax_pct}%):</td>
                    <td className="py-2 text-right font-bold">{formatCurrency(totals.taxAmount)}</td>
                  </tr>
                )}
                <tr className="border-t-2 border-gray-400">
                  <td className="py-3 font-bold text-lg">الإجمالي النهائي:</td>
                  <td className="py-3 text-right font-bold text-lg text-blue-600">{formatCurrency(totals.total)}</td>
                </tr>
              </table>
            </div>

            {/* Enhanced Footer */}
            <div className="mt-12 text-center border-t-2 border-gray-200 pt-6">
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-6 rounded-lg mb-4">
                <p className="font-bold text-lg text-gray-800 mb-2">شكراً لثقتكم في خدماتنا</p>
                <p className="text-gray-600">نحن نسعى دائماً لتقديم أفضل الخدمات</p>
              </div>
              <div className="text-sm text-gray-500">
                <p>للمزيد من المعلومات، يرجى التواصل معنا</p>
                <p>SANAD ELEVATORS - شركة المصاعد المتقدمة</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default InvoiceDisplayEnhanced;
