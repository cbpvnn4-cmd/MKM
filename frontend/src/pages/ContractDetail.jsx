import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Layout from '../components/Layout';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { useToast } from '../components/ui/Toast';
import { useConfirmations } from '../components/ui/ConfirmDialog';
import {
  getContract,
  activateContract,
  completeContract,
  convertContractToSalesOrder,
  updateContractMilestone,
  deleteContract
} from '../services/api';
import { PDFDownloadLink, pdf } from '@react-pdf/renderer';
import ContractPDF from '../components/pdf/ContractPDF';
import {
  ArrowRight,
  Loader2,
  Printer,
  Download,
  FileText,
  Mail,
  Phone,
  User2,
  MapPin,
  Calendar,
  DollarSign,
  Play,
  CheckCircle2,
  ShoppingBag,
  Edit,
  Trash2,
  FileCheck,
  Clock,
  AlertCircle,
  Building2,
  FileSignature
} from 'lucide-react';

const formatCurrency = (value, currency = 'USD') => {
  const amount = Number(value || 0);
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(Number.isFinite(amount) ? amount : 0);
};

const formatDate = (value) => {
  if (!value) return 'غير محدد';
  try {
    const date = new Date(value);
    return date.toLocaleDateString('ar-EG', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  } catch (error) {
    return value;
  }
};

const statusConfig = {
  DRAFT: {
    icon: <FileText className='w-4 h-4' />,
    label: 'مسودة',
    className: 'bg-slate-100 text-slate-700 border-slate-300'
  },
  ACTIVE: {
    icon: <Play className='w-4 h-4' />,
    label: 'ساري',
    className: 'bg-blue-100 text-blue-700 border-blue-300'
  },
  COMPLETED: {
    icon: <CheckCircle2 className='w-4 h-4' />,
    label: 'مكتمل',
    className: 'bg-emerald-100 text-emerald-700 border-emerald-300'
  },
  TERMINATED: {
    icon: <AlertCircle className='w-4 h-4' />,
    label: 'منتهي',
    className: 'bg-rose-100 text-rose-700 border-rose-300'
  },
};

const milestoneStatusConfig = {
  PENDING: {
    icon: <Clock className='w-3.5 h-3.5' />,
    label: 'قيد الانتظار',
    className: 'bg-gray-100 text-gray-700 border-gray-300'
  },
  IN_PROGRESS: {
    icon: <Play className='w-3.5 h-3.5' />,
    label: 'قيد التنفيذ',
    className: 'bg-blue-100 text-blue-700 border-blue-300'
  },
  COMPLETED: {
    icon: <CheckCircle2 className='w-3.5 h-3.5' />,
    label: 'مكتمل',
    className: 'bg-emerald-100 text-emerald-700 border-emerald-300'
  },
  OVERDUE: {
    icon: <AlertCircle className='w-3.5 h-3.5' />,
    label: 'متأخر',
    className: 'bg-rose-100 text-rose-700 border-rose-300'
  },
};
const pickFirst = (...values) => values.find((v) => v !== undefined && v !== null && v !== '');

const mapContractForPdf = (source) => {
  if (!source) return null;

  const company = source.company || source.organization || {};
  const customer = source.customer || source.client || {};
  const financial = source.financial || {};
  const project = source.project || {};

  const mapped = {
    ...source,
    company_name: pickFirst(source.company_name, company.name),
    company_address: pickFirst(source.company_address, company.address, company.location),
    company_phone: pickFirst(source.company_phone, company.phone, company.mobile),
    company_email: pickFirst(source.company_email, company.email),
    seller_company_name: pickFirst(source.seller_company_name, source.company_name, company.name),
    seller_address: pickFirst(source.seller_address, source.company_address, company.address, company.location),
    seller_phone: pickFirst(source.seller_phone, company.phone),
    seller_authorized_person: pickFirst(source.seller_authorized_person, company.authorized_person, company.contact_person),

    customer_name: pickFirst(source.customer_name, customer.name),
    customer_address: pickFirst(source.customer_address, customer.address, customer.location),
    buyer_name: pickFirst(source.buyer_name, source.customer_name, customer.name),
    buyer_address: pickFirst(source.buyer_address, source.customer_address, customer.address, customer.location),
    buyer_phone: pickFirst(source.buyer_phone, source.customer_phone, customer.phone, customer.mobile),
    buyer_representative: pickFirst(source.buyer_representative, customer.representative, customer.contact_person),

    contract_no: pickFirst(source.contract_no, source.code, source.contract_code, source.reference),
    contract_date: pickFirst(source.contract_date, source.date, source.created_at, source.createdAt),
    start_date: pickFirst(source.start_date, source.startDate, project.start_date, project.startDate),
    end_date: pickFirst(source.end_date, source.endDate, project.end_date, project.endDate),
    signed_date: pickFirst(source.signed_date, source.signedDate, source.signature_date),
    status: pickFirst(source.status, source.state),

    total_amount: pickFirst(
      source.total_amount,
      source.total_value,
      source.contract_value,
      source.contract_total_amount,
      financial.total_amount,
      financial.total_value
    ),
    down_payment: pickFirst(
      source.down_payment,
      source.down_payment_amount,
      source.advance_payment,
      source.deposit_amount,
      source.deposit,
      financial.down_payment
    ),
    currency: pickFirst(source.currency, financial.currency, company.currency, 'USD'),

    payments: Array.isArray(source.payments) && source.payments.length
      ? source.payments
      : Array.isArray(financial.payments)
        ? financial.payments
        : [],
    milestones: Array.isArray(source.milestones) && source.milestones.length
      ? source.milestones
      : Array.isArray(financial.milestones)
        ? financial.milestones
        : [],
    elevators: Array.isArray(source.elevators) && source.elevators.length
      ? source.elevators
      : Array.isArray(source.items)
        ? source.items
        : [],

    project_name: pickFirst(source.project_name, project.name),
    project_location: pickFirst(source.project_location, project.location, project.address),
    building_type: pickFirst(source.building_type, project.building_type, project.type),
    num_floors: pickFirst(source.num_floors, project.num_floors, project.floors),
    contract_description: pickFirst(source.contract_description, source.description, project.description),
    general_terms: pickFirst(source.general_terms, source.terms, financial.general_terms, financial.terms),
    warranty_period: pickFirst(source.warranty_period, source.warranty, financial.warranty_period),
    seller_obligations: pickFirst(source.seller_obligations, financial.seller_obligations),
    buyer_obligations: pickFirst(source.buyer_obligations, financial.buyer_obligations),
  };

  return mapped;
};

const ContractDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [contract, setContract] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [exporting, setExporting] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const printRef = useRef(null);
  const pdfContract = useMemo(() => mapContractForPdf(contract), [contract]);

  const loadContract = useCallback(async () => {
    if (!id) return;
    try {
      setLoading(true);
      const data = await getContract(id);
      setContract(data || null);
      setError('');
    } catch (err) {
      console.error('Error loading contract:', err);
      const message =
        err?.response?.data?.detail ||
        'حدث خطأ أثناء تحميل بيانات العقد. يرجى المحاولة مجددًا.';
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadContract();
  }, [loadContract]);

  // Toast and Confirm hooks
  const { success, error: showError } = useToast();
  const { confirmActivate, confirmComplete, confirmDelete, confirmConvert, confirmUpdate } = useConfirmations();

  const handleActivate = async () => {
    const confirmed = await confirmActivate(contract?.contract_no || 'العقد');
    if (!confirmed) return;

    try {
      await activateContract(id);
      await loadContract();
      success('تم تفعيل العقد بنجاح');
    } catch (err) {
      showError('تعذر تفعيل العقد');
    }
  };

  const handleComplete = async () => {
    const confirmed = await confirmComplete(contract?.contract_no || 'العقد');
    if (!confirmed) return;

    try {
      await completeContract(id);
      await loadContract();
      success('تم إكمال العقد بنجاح');
    } catch (err) {
      showError('تعذر إكمال العقد');
    }
  };

  const handleConvertToSalesOrder = async () => {
    const confirmed = await confirmConvert('العقد', 'أمر بيع');
    if (!confirmed) return;

    try {
      const result = await convertContractToSalesOrder(id);
      success(`تم إنشاء أمر البيع ${result.sales_order_no} بنجاح`);
      navigate(`/sales-orders/${result.sales_order_id}`);
    } catch (err) {
      showError('تعذر تحويل العقد إلى أمر بيع');
    }
  };

  const handleDelete = async () => {
    const confirmed = await confirmDelete(contract?.contract_no || 'العقد');
    if (!confirmed) return;

    try {
      await deleteContract(id);
      success('تم حذف العقد بنجاح');
      navigate('/contracts');
    } catch (err) {
      showError('تعذر حذف العقد. يمكن حذف العقود بحالة "مسودة" فقط.');
    }
  };

  const handleUpdateMilestone = async (milestoneId, newStatus) => {
    const confirmed = await confirmUpdate('حالة المعلم');
    if (!confirmed) return;

    try {
      await updateContractMilestone(id, milestoneId, { status: newStatus });
      await loadContract();
      success('تم تحديث حالة المعلم بنجاح');
    } catch (err) {
      showError('تعذر تحديث المعلم');
    }
  };

  const handlePrint = async () => {
    if (!pdfContract) return;
    try {
      setExporting(true);
      const blob = await pdf(<ContractPDF contract={pdfContract} />).toBlob();
      const url = URL.createObjectURL(blob);
      const printWindow = window.open(url);
      if (printWindow) {
        printWindow.onload = () => {
          printWindow.print();
        };
      }
    } catch (err) {
      showError('حدث خطأ أثناء تجهيز الطباعة');
    } finally {
      setExporting(false);
    }
  };

  const getStatusBadge = (status) => {
    const config = statusConfig[status] || statusConfig.DRAFT;
    return (
      <Badge variant="outline" className={`inline-flex items-center gap-1.5 ${config.className}`}>
        {config.icon}
        {config.label}
      </Badge>
    );
  };

  const getMilestoneStatusBadge = (status) => {
    const config = milestoneStatusConfig[status] || milestoneStatusConfig.PENDING;
    return (
      <Badge variant="outline" className={`inline-flex items-center gap-1 text-xs ${config.className}`}>
        {config.icon}
        {config.label}
      </Badge>
    );
  };

  const currency = contract?.currency || 'USD';
  const milestones = Array.isArray(contract?.milestones) ? contract.milestones : [];
  const completedMilestones = milestones.filter(m => m.status === 'COMPLETED').length;
  const totalMilestones = milestones.length;
  const milestoneProgress = totalMilestones > 0 ? (completedMilestones / totalMilestones) * 100 : 0;

  return (
    <Layout>
      {/* Header - Hidden on Print */}
      <div className="flex items-center justify-between mb-6 print:hidden">
        <div>
          <button
            onClick={() => navigate('/contracts')}
            className="inline-flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900 transition"
          >
            <ArrowRight className="w-4 h-4" />
            العودة إلى العقود
          </button>
          <h1 className="mt-3 text-3xl font-bold text-slate-900">تفاصيل العقد</h1>
          <p className="text-slate-500 mt-1">
            استعراض تفصيلي للعقد رقم {contract?.contract_no || `#${id}`}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {contract?.status === 'DRAFT' && (
            <>
              <Button onClick={() => navigate(`/contracts/${id}/edit`)} variant="outline" className="text-purple-600">
                <Edit className="w-4 h-4 ml-2" />
                تعديل
              </Button>
              <Button onClick={handleActivate} variant="outline" className="text-blue-600">
                <Play className="w-4 h-4 ml-2" />
                تفعيل العقد
              </Button>
              <Button onClick={handleDelete} variant="outline" className="text-rose-600">
                <Trash2 className="w-4 h-4 ml-2" />
                حذف
              </Button>
            </>
          )}
          {contract?.status === 'ACTIVE' && (
            <>
              <Button onClick={handleConvertToSalesOrder} variant="outline" className="text-emerald-600">
                <ShoppingBag className="w-4 h-4 ml-2" />
                تحويل لأمر بيع
              </Button>
              <Button onClick={handleComplete} variant="outline" className="text-purple-600">
                <CheckCircle2 className="w-4 h-4 ml-2" />
                إكمال العقد
              </Button>
            </>
          )}
          <Button onClick={handlePrint} disabled={!contract || exporting}>
            <Printer className="w-4 h-4 ml-2" />
            طباعة
          </Button>

          {pdfContract && (
            <PDFDownloadLink
              document={<ContractPDF contract={pdfContract} />}
              fileName={`Contract_${pdfContract.contract_no || id}.pdf`}
              className={`inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-10 px-4 py-2 ${exporting ? 'opacity-50 pointer-events-none' : ''}`}
            >
              {({ blob, url, loading: pdfLoading, error }) => (
                <>
                  {pdfLoading ? (
                    <Loader2 className="w-4 h-4 ml-2 animate-spin" />
                  ) : (
                    <Download className="w-4 h-4 ml-2" />
                  )}
                  حفظ PDF
                </>
              )}
            </PDFDownloadLink>
          )}
        </div>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-16 flex flex-col items-center justify-center text-center">
          <Loader2 className="w-10 h-10 text-indigo-600 animate-spin mb-4" />
          <p className="text-lg font-semibold text-slate-700">جاري تحميل تفاصيل العقد...</p>
        </div>
      )}

      {/* Error State */}
      {!loading && error && (
        <div className="bg-white border border-rose-200 rounded-2xl shadow-sm p-10 text-center text-rose-700">
          <p className="text-lg font-semibold mb-3">تعذر تحميل العقد</p>
          <p>{error}</p>
          <div className="mt-6">
            <Button variant="outline" onClick={() => navigate('/contracts')}>
              العودة للقائمة
            </Button>
          </div>
        </div>
      )}

      {/* Contract Content */}
      {!loading && !error && contract && (
        <>
          {/* Tabs Navigation - Hidden on Print */}
          <div className="bg-white border-b border-slate-200 mb-6 print:hidden">
            <div className="flex gap-6 px-6">
              <button
                onClick={() => setActiveTab('overview')}
                className={`py-3 px-2 border-b-2 font-medium text-sm transition ${activeTab === 'overview'
                  ? 'border-indigo-600 text-indigo-600'
                  : 'border-transparent text-slate-600 hover:text-slate-900'
                  }`}
              >
                نظرة عامة
              </button>
              <button
                onClick={() => setActiveTab('milestones')}
                className={`py-3 px-2 border-b-2 font-medium text-sm transition ${activeTab === 'milestones'
                  ? 'border-indigo-600 text-indigo-600'
                  : 'border-transparent text-slate-600 hover:text-slate-900'
                  }`}
              >
                المعالم والدفعات ({totalMilestones})
              </button>
              <button
                onClick={() => setActiveTab('terms')}
                className={`py-3 px-2 border-b-2 font-medium text-sm transition ${activeTab === 'terms'
                  ? 'border-indigo-600 text-indigo-600'
                  : 'border-transparent text-slate-600 hover:text-slate-900'
                  }`}
              >
                الشروط والأحكام
              </button>
            </div>
          </div>

          {/* Printable Content */}
          <div className="bg-white dark:bg-gray-900" dir="rtl" lang="ar">
            <div className="relative flex min-h-screen w-full flex-col items-center bg-background-light dark:bg-background-dark py-10">
              <div ref={printRef} className="printable-area relative w-full max-w-4xl flex-1 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-8 shadow-lg" dir="rtl">
                {/* Optional Watermark */}
                <div aria-hidden="true" className="watermark">{contract.company_name || 'اسم الشركة'}</div>
                {/* Page Content */}
                <div className="relative z-10 flex h-full flex-col">
                  {/* Header */}
                  <header className="flex w-full flex-col gap-4 border-b-2 border-primary pb-4">
                    <div className="flex flex-col gap-4 @container sm:flex-row sm:justify-between">
                      <div className="flex items-center gap-4">
                        <div className="bg-center bg-no-repeat aspect-square bg-cover rounded-lg h-24 w-24" style={{ backgroundImage: 'url("https://lh3.googleusercontent.com/aida-public/AB6AXuDoFRC7M7u82y2sjt6h6wXmVaBxVxExxEGyB0z26yaEbyW5HhrHACOI7T0HnTujW7NtLDCch_zGB-WrygU3fwcEpkvQ0IimUak_ZgNthlOGp_bc-8lL1-vkMewviI9ts-_hPn8ziiMdAVIS7C5_tVAcdSJOGzL5ryeBvTRlz3MO8HL7UKExRjH4XBlI7VycrvjSK2yAHiTXRNgZuKGhXNP7FCY6UG20vxeFMTu3ODzeFpmZiM3Z4qB3lH3UHBxd7sUA7IRA1fZ9Vnc");' }}></div>
                        <div className="flex flex-col">
                          <p className="text-text-primary dark:text-white text-xl font-bold leading-tight">{contract.company_name || 'اسم الشركة الهندسية'}</p>
                          <p className="text-text-secondary dark:text-gray-400 text-sm font-normal leading-normal">{contract.company_address || 'العنوان الكامل للشركة، بغداد، العراق'}</p>
                          <p className="text-text-secondary dark:text-gray-400 text-sm font-normal leading-normal">هاتف: {contract.company_phone || '+964-XXX-XXXXXX'} | بريد إلكتروني: {contract.company_email || 'info@company.iq'}</p>
                        </div>
                      </div>
                    </div>
                  </header>
                  {/* Page Heading */}
                  <div className="flex flex-wrap justify-between gap-3 py-8">
                    <div className="flex min-w-72 flex-col gap-2">
                      <p className="text-primary-dark dark:text-primary text-4xl font-black leading-tight tracking-tight">عقد بيع</p>
                      <p className="text-text-secondary dark:text-gray-400 text-sm font-normal leading-normal">
                        رقم العقد: {contract.contract_no} | تاريخ الإصدار: {formatDate(contract.contract_date)} | العملة: {currency === 'USD' ? 'دولار أمريكي' : currency} | سعر الصرف الثابت: 1460 دينار عراقي
                      </p>
                    </div>
                  </div>
                  {/* Parties Information */}
                  <section className="grid grid-cols-1 gap-x-6 gap-y-4 border-t border-gray-200 dark:border-gray-700 pt-6 sm:grid-cols-2">
                    <div className="flex flex-col gap-1 pr-2">
                      <p className="text-primary-dark dark:text-primary text-base font-bold">البائع (الطرف الأول)</p>
                      <p className="text-text-secondary dark:text-gray-400 text-sm font-normal">اسم الشركة: <span className="text-text-primary dark:text-gray-300">{contract.seller_company_name || contract.company_name || 'الشركة الهندسية العراقية'}</span></p>
                      <p className="text-text-secondary dark:text-gray-400 text-sm font-normal">العنوان: <span className="text-text-primary dark:text-gray-300">{contract.seller_address || contract.company_address || 'بغداد، العراق'}</span></p>
                      {contract.seller_phone && <p className="text-text-secondary dark:text-gray-400 text-sm font-normal">الهاتف: <span className="text-text-primary dark:text-gray-300">{contract.seller_phone}</span></p>}
                      {contract.seller_authorized_person && <p className="text-text-secondary dark:text-gray-400 text-sm font-normal">المفوّض بالتوقيع: <span className="text-text-primary dark:text-gray-300">{contract.seller_authorized_person}</span></p>}
                    </div>
                    <div className="flex flex-col gap-1 pl-2">
                      <p className="text-primary-dark dark:text-primary text-base font-bold">المشتري (الطرف الثاني)</p>
                      <p className="text-text-secondary dark:text-gray-400 text-sm font-normal">اسم الشركة: <span className="text-text-primary dark:text-gray-300">{contract.buyer_name || contract.customer_name || 'شركة العميل'}</span></p>
                      <p className="text-text-secondary dark:text-gray-400 text-sm font-normal">العنوان: <span className="text-text-primary dark:text-gray-300">{contract.buyer_address || contract.customer_address || 'البصرة، العراق'}</span></p>
                      {contract.buyer_phone && <p className="text-text-secondary dark:text-gray-400 text-sm font-normal">الهاتف: <span className="text-text-primary dark:text-gray-300">{contract.buyer_phone}</span></p>}
                      {contract.buyer_representative && <p className="text-text-secondary dark:text-gray-400 text-sm font-normal">الممثل: <span className="text-text-primary dark:text-gray-300">{contract.buyer_representative}</span></p>}
                    </div>
                  </section>

                  {/* Project Information */}
                  {(contract.project_name || contract.project_location) && (
                    <section className="mt-6 border-t border-gray-200 dark:border-gray-700 pt-6">
                      <h2 className="text-primary-dark dark:text-primary text-lg font-bold leading-tight pb-3">بيانات المشروع</h2>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                        {contract.project_name && (
                          <p className="text-text-secondary dark:text-gray-400">اسم المشروع: <span className="text-text-primary dark:text-gray-300 font-medium">{contract.project_name}</span></p>
                        )}
                        {contract.project_location && (
                          <p className="text-text-secondary dark:text-gray-400">موقع المشروع: <span className="text-text-primary dark:text-gray-300 font-medium">{contract.project_location}</span></p>
                        )}
                        {contract.building_type && (
                          <p className="text-text-secondary dark:text-gray-400">نوع المبنى: <span className="text-text-primary dark:text-gray-300 font-medium">{contract.building_type}</span></p>
                        )}
                        {contract.num_floors && (
                          <p className="text-text-secondary dark:text-gray-400">عدد الطوابق: <span className="text-text-primary dark:text-gray-300 font-medium">{contract.num_floors}</span></p>
                        )}
                      </div>
                    </section>
                  )}
                  {/* Elevators Information */}
                  {(Array.isArray(contract.elevators) && contract.elevators.length > 0) ? (
                    <section className="mt-8">
                      <h2 className="text-primary-dark dark:text-primary text-xl font-bold leading-tight pb-3">مواصفات المصاعد</h2>
                      <div className="overflow-x-auto border-t border-gray-200 dark:border-gray-700 pt-2">
                        <table className="w-full text-right text-sm">
                          <thead className="text-text-secondary dark:text-gray-400 border-b border-gray-200 dark:border-gray-700">
                            <tr>
                              <th className="px-4 py-3 font-normal">النوع</th>
                              <th className="px-4 py-3 font-normal">الموديل</th>
                              <th className="px-4 py-3 font-normal">الحمولة (kg)</th>
                              <th className="px-4 py-3 font-normal">السعة (أشخاص)</th>
                              <th className="px-4 py-3 font-normal">السرعة (m/s)</th>
                              <th className="px-4 py-3 font-normal">عدد المحطات</th>
                              <th className="px-4 py-3 font-normal">الكمية</th>
                              <th className="px-4 py-3 font-normal text-left">سعر الوحدة</th>
                              <th className="px-4 py-3 font-normal text-left">الإجمالي</th>
                            </tr>
                          </thead>
                          <tbody>
                            {contract.elevators.map((elevator, index) => (
                              <tr key={elevator.id || index} className={index % 2 === 0 ? "bg-gray-50 dark:bg-gray-800/50" : ""}>
                                <td className="px-4 py-3">{elevator.elevator_type}</td>
                                <td className="px-4 py-3">{elevator.model || '—'}</td>
                                <td className="px-4 py-3">{elevator.capacity_kg || '—'}</td>
                                <td className="px-4 py-3">{elevator.capacity_persons || '—'}</td>
                                <td className="px-4 py-3">{elevator.speed_mps || '—'}</td>
                                <td className="px-4 py-3">{elevator.num_stops || '—'}</td>
                                <td className="px-4 py-3">{elevator.quantity || 1}</td>
                                <td className="px-4 py-3 text-left">{formatCurrency(elevator.unit_price, currency)}</td>
                                <td className="px-4 py-3 text-left font-semibold">{formatCurrency(elevator.total_price, currency)}</td>
                              </tr>
                            ))}
                          </tbody>
                          <tfoot className="border-t-2 border-gray-300 dark:border-gray-600">
                            <tr>
                              <td colSpan="8" className="px-4 py-3 text-left font-bold">إجمالي المصاعد:</td>
                              <td className="px-4 py-3 text-left font-bold text-lg">{formatCurrency(contract.elevators.reduce((sum, e) => sum + parseFloat(e.total_price || 0), 0), currency)}</td>
                            </tr>
                          </tfoot>
                        </table>
                      </div>
                    </section>
                  ) : (contract.elevator_type || contract.elevator_model || contract.sales_order_no) && (
                    <section className="mt-8">
                      <h2 className="text-primary-dark dark:text-primary text-xl font-bold leading-tight pb-3">معلومات المصعد</h2>
                      <div className="grid grid-cols-[auto_1fr] gap-x-6 border-t border-gray-200 dark:border-gray-700 text-sm">
                        {contract.elevator_type && (
                          <div className="col-span-2 grid grid-cols-subgrid border-b border-gray-200 dark:border-gray-700 py-3">
                            <p className="text-text-secondary dark:text-gray-400 font-normal">نوع المصعد</p>
                            <p className="text-text-primary dark:text-gray-300 font-normal">{contract.elevator_type}</p>
                          </div>
                        )}
                        {contract.elevator_model && (
                          <div className="col-span-2 grid grid-cols-subgrid border-b border-gray-200 dark:border-gray-700 py-3">
                            <p className="text-text-secondary dark:text-gray-400 font-normal">الموديل</p>
                            <p className="text-text-primary dark:text-gray-300 font-normal">{contract.elevator_model}</p>
                          </div>
                        )}
                        {contract.elevator_capacity && (
                          <div className="col-span-2 grid grid-cols-subgrid border-b border-gray-200 dark:border-gray-700 py-3">
                            <p className="text-text-secondary dark:text-gray-400 font-normal">الحمولة</p>
                            <p className="text-text-primary dark:text-gray-300 font-normal">{contract.elevator_capacity}</p>
                          </div>
                        )}
                        {contract.elevator_height && (
                          <div className="col-span-2 grid grid-cols-subgrid border-b border-gray-200 dark:border-gray-700 py-3">
                            <p className="text-text-secondary dark:text-gray-400 font-normal">الارتفاع</p>
                            <p className="text-text-primary dark:text-gray-300 font-normal">{contract.elevator_height} متر</p>
                          </div>
                        )}
                        {contract.elevator_sections && (
                          <div className="col-span-2 grid grid-cols-subgrid border-b border-gray-200 dark:border-gray-700 py-3">
                            <p className="text-text-secondary dark:text-gray-400 font-normal">عدد السكاشن (الأقسام)</p>
                            <p className="text-text-primary dark:text-gray-300 font-normal">{contract.elevator_sections}</p>
                          </div>
                        )}
                        {contract.elevator_cost && (
                          <div className="col-span-2 grid grid-cols-subgrid border-b border-gray-200 dark:border-gray-700 py-3">
                            <p className="text-text-secondary dark:text-gray-400 font-normal">تكلفة المصعد</p>
                            <p className="text-text-primary dark:text-gray-300 font-normal">{formatCurrency(contract.elevator_cost, currency)}</p>
                          </div>
                        )}
                        {contract.sales_order_no && (
                          <div className="col-span-2 grid grid-cols-subgrid py-3">
                            <p className="text-text-secondary dark:text-gray-400 font-normal">رقم أمر البيع المرتبط</p>
                            <p className="text-text-primary dark:text-gray-300 font-normal">{contract.sales_order_no}</p>
                          </div>
                        )}
                        {contract.elevator_notes && (
                          <div className="col-span-2 grid grid-cols-subgrid py-3">
                            <p className="text-text-secondary dark:text-gray-400 font-normal">ملاحظات إضافية</p>
                            <p className="text-text-primary dark:text-gray-300 font-normal">{contract.elevator_notes}</p>
                          </div>
                        )}
                      </div>
                    </section>
                  )}
                  {/* Financial Terms */}
                  <section className="mt-8">
                    <h2 className="text-primary-dark dark:text-primary text-xl font-bold leading-tight pb-3">الشروط المالية</h2>
                    <div className="grid grid-cols-1 gap-4 border-t border-gray-200 dark:border-gray-700 pt-4 sm:grid-cols-3 text-sm">
                      <div className="flex flex-col gap-1 rounded-lg bg-primary/10 dark:bg-primary/20 p-4">
                        <p className="text-text-secondary dark:text-gray-400">السعر الإجمالي للعقد</p>
                        <p className="text-text-primary dark:text-gray-200 text-lg font-bold">{formatCurrency(contract.total_amount, currency)}</p>
                      </div>
                      <div className="flex flex-col gap-1 rounded-lg bg-gray-100 dark:bg-gray-800 p-4">
                        <p className="text-text-secondary dark:text-gray-400">الدفعة المقدمة</p>
                        <p className="text-text-primary dark:text-gray-200 text-lg font-bold">{formatCurrency(contract.down_payment || 0, currency)}</p>
                      </div>
                      <div className="flex flex-col gap-1 rounded-lg bg-gray-100 dark:bg-gray-800 p-4">
                        <p className="text-text-secondary dark:text-gray-400">الأقساط المتبقية</p>
                        <p className="text-text-primary dark:text-gray-200 text-lg font-bold">{formatCurrency((contract.total_amount || 0) - (contract.down_payment || 0), currency)} ({Array.isArray(milestones) ? milestones.filter(m => m.status !== 'COMPLETED').length : 0} أقساط)</p>
                      </div>
                    </div>
                  </section>
                  {/* Payment Schedule */}
                  <section className="mt-8">
                    <h2 className="text-primary-dark dark:text-primary text-xl font-bold leading-tight pb-3">جدول الدفعات</h2>
                    <div className="overflow-x-auto border-t border-gray-200 dark:border-gray-700 pt-2">
                      <table className="w-full text-right text-sm">
                        <thead className="text-text-secondary dark:text-gray-400 border-b border-gray-200 dark:border-gray-700">
                          <tr>
                            <th className="px-4 py-3 font-normal">رقم الدفعة</th>
                            <th className="px-4 py-3 font-normal">البيان</th>
                            <th className="px-4 py-3 font-normal text-center">النسبة (%)</th>
                            <th className="px-4 py-3 font-normal text-left">المبلغ ({currency === 'USD' ? 'دولار أمريكي' : currency})</th>
                            <th className="px-4 py-3 font-normal text-center">تاريخ الاستحقاق</th>
                            <th className="px-4 py-3 font-normal text-center">الحالة</th>
                          </tr>
                        </thead>
                        <tbody>
                          {Array.isArray(contract.payments) && contract.payments.length > 0 ? (
                            contract.payments.map((payment, index) => {
                              const paymentStatusConfig = {
                                PENDING: { label: 'معلّق', className: 'bg-yellow-100 text-yellow-700' },
                                PAID: { label: 'مدفوع', className: 'bg-emerald-100 text-emerald-700' },
                                LATE: { label: 'متأخر', className: 'bg-rose-100 text-rose-700' },
                                CANCELLED: { label: 'ملغى', className: 'bg-gray-100 text-gray-700' }
                              };
                              const status = paymentStatusConfig[payment.status] || paymentStatusConfig.PENDING;

                              return (
                                <tr key={payment.id || index} className={index % 2 === 0 ? "bg-gray-50 dark:bg-gray-800/50" : ""}>
                                  <td className="px-4 py-3">{payment.payment_number}</td>
                                  <td className="px-4 py-3">{payment.description}</td>
                                  <td className="px-4 py-3 text-center">{payment.percentage ? `${parseFloat(payment.percentage).toFixed(2)}%` : '—'}</td>
                                  <td className="px-4 py-3 text-left font-semibold">{formatCurrency(payment.amount, currency)}</td>
                                  <td className="px-4 py-3 text-center">{formatDate(payment.due_date)}</td>
                                  <td className="px-4 py-3 text-center">
                                    <span className={`inline-block px-2 py-1 rounded text-xs ${status.className}`}>{status.label}</span>
                                  </td>
                                </tr>
                              );
                            })
                          ) : Array.isArray(milestones) && milestones.length > 0 ? (
                            milestones.map((milestone, index) => (
                              <tr key={milestone.id} className={index % 2 === 0 ? "bg-gray-50 dark:bg-gray-800/50" : ""}>
                                <td className="px-4 py-3">{index + 1}</td>
                                <td className="px-4 py-3">{milestone.milestone_name || 'دفعة'}</td>
                                <td className="px-4 py-3 text-center">—</td>
                                <td className="px-4 py-3 text-left">{formatCurrency(milestone.payment_amount, currency)}</td>
                                <td className="px-4 py-3 text-center">{formatDate(milestone.due_date)}</td>
                                <td className="px-4 py-3 text-center">{getMilestoneStatusBadge(milestone.status)}</td>
                              </tr>
                            ))
                          ) : (
                            <tr>
                              <td colSpan="6" className="px-4 py-6 text-center text-text-secondary dark:text-gray-400">لا توجد دفعات محددة</td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </section>
                  {/* Contract Terms */}
                  <section className="mt-8">
                    <h2 className="text-primary-dark dark:text-primary text-xl font-bold leading-tight pb-3">شروط وأحكام العقد</h2>
                    <div className="space-y-4 border-t border-gray-200 dark:border-gray-700 pt-4 text-sm text-text-secondary dark:text-gray-400">

                      {contract.warranty_period && (
                        <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
                          <h3 className="text-primary-dark dark:text-primary text-base font-bold mb-2">فترة الضمان</h3>
                          <p className="text-text-primary dark:text-gray-300">{contract.warranty_period}</p>
                        </div>
                      )}

                      {contract.seller_obligations && (
                        <div>
                          <h3 className="text-primary-dark dark:text-primary text-base font-bold mb-2">التزامات البائع (الطرف الأول)</h3>
                          <div className="whitespace-pre-wrap text-text-primary dark:text-gray-300 leading-relaxed">
                            {contract.seller_obligations}
                          </div>
                        </div>
                      )}

                      {contract.buyer_obligations && (
                        <div>
                          <h3 className="text-primary-dark dark:text-primary text-base font-bold mb-2">التزامات المشتري (الطرف الثاني)</h3>
                          <div className="whitespace-pre-wrap text-text-primary dark:text-gray-300 leading-relaxed">
                            {contract.buyer_obligations}
                          </div>
                        </div>
                      )}

                      {contract.general_terms && (
                        <div>
                          <h3 className="text-primary-dark dark:text-primary text-base font-bold mb-2">شروط عامة</h3>
                          <div className="whitespace-pre-wrap text-text-primary dark:text-gray-300 leading-relaxed">
                            {contract.general_terms}
                          </div>
                        </div>
                      )}

                      {!contract.seller_obligations && !contract.buyer_obligations && !contract.general_terms && (
                        <ol className="list-decimal list-inside space-y-2">
                          <li>يلتزم الطرف الثاني بسداد جميع الدفعات في تواريخ استحقاقها المحددة في جدول الدفعات.</li>
                          <li>يظل الطرف الأول هو المالك القانوني للمعدات حتى يتم سداد كامل المبلغ المتفق عليه.</li>
                          <li>يتحمل الطرف الثاني مسؤولية تأمين المعدات ضد جميع المخاطر من تاريخ التسليم.</li>
                          <li>يتم تسليم المعدات في موقع الطرف الثاني، وتكاليف النقل والتركيب مشمولة في السعر الإجمالي.</li>
                        </ol>
                      )}
                    </div>
                  </section>
                  <div className="flex-grow"></div> {/* Spacer to push footer to bottom */}
                  {/* Signatures */}
                  <section className="mt-16 grid grid-cols-1 gap-12 sm:grid-cols-2">
                    <div className="flex flex-col items-center text-center">
                      <div className="h-24 w-48 border-b border-gray-400 dark:border-gray-600"></div>
                      <p className="text-text-primary dark:text-gray-300 mt-2 font-bold">توقيع وختم الطرف الأول (البائع)</p>
                      <p className="text-text-secondary dark:text-gray-400 text-sm">الاسم: {contract.signed_by_company || '...........................................'}</p>
                    </div>
                    <div className="flex flex-col items-center text-center">
                      <div className="h-24 w-48 border-b border-gray-400 dark:border-gray-600"></div>
                      <p className="text-text-primary dark:text-gray-300 mt-2 font-bold">توقيع وختم الطرف الثاني (المشتري)</p>
                      <p className="text-text-secondary dark:text-gray-400 text-sm">الاسم: {contract.signed_by_customer || '...........................................'}</p>
                    </div>
                  </section>
                  {/* Footer */}
                  <footer className="mt-12 border-t-2 border-primary pt-4 text-center">
                    <p className="text-xs text-text-secondary dark:text-gray-500">
                      هذا العقد ملزم للطرفين ويخضع لقوانين جمهورية العراق. | رقم السجل التجاري: 123456 | صفحة 1 من 1
                    </p>
                  </footer>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </Layout>
  );
};

export default ContractDetail;
