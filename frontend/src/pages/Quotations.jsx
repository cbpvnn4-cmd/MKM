import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import { useToast } from '../components/ui/Toast';
import { useConfirmations } from '../components/ui/ConfirmDialog';
import {
  getQuotations,
  deleteQuotation,
  sendQuotation,
  acceptQuotation,
  rejectQuotation,
  convertQuotationToContract
} from '../services/api';
import {
  FileText,
  DollarSign,
  CheckCircle2,
  Play,
  Plus,
  Search,
  Eye,
  Trash2,
  XCircle,
  Send,
  FileCheck,
  AlertCircle,
  LayoutGrid,
  List
} from 'lucide-react';
import { formatCurrency, formatDate, getQuotationStatusClass, getQuotationStatusText } from '../utils/formatters';

const Quotations = () => {
  const { success, error: toastError } = useToast();
  const { confirmDelete, confirmActivate, confirmComplete, confirmConvert } = useConfirmations();
  const navigate = useNavigate();

  const [quotations, setQuotations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [filterField, setFilterField] = useState('all');
  const [viewMode, setViewMode] = useState('table');

  useEffect(() => {
    fetchQuotations();
  }, []);

  const fetchQuotations = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getQuotations();
      setQuotations(Array.isArray(data) ? data : []);
    } catch (err) {
      setError('حدث خطأ أثناء جلب عروض الأسعار');
      console.error('Error fetching quotations:', err);
      setQuotations([]);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    const confirmed = await confirmDelete('هل تريد حذف عرض السعر؟');
    if (!confirmed) return;

    try {
      await deleteQuotation(id);
      success('تم حذف عرض السعر بنجاح');
      fetchQuotations();
    } catch (err) {
      toastError('تعذّر حذف عرض السعر. جرّب مجدداً أو تواصل مع الدعم.');
    }
  };

  const handleSend = async (id) => {
    try {
      await sendQuotation(id);
      success('تم إرسال عرض السعر للعميل');
      fetchQuotations();
    } catch (err) {
      toastError('تعذّر إرسال عرض السعر');
    }
  };

  const handleAccept = async (id) => {
    const confirmed = await confirmActivate('تأكيد قبول العرض؟');
    if (!confirmed) return;

    try {
      await acceptQuotation(id);
      success('تم قبول العرض وجاهز للتحويل إلى عقد');
      fetchQuotations();
    } catch (err) {
      toastError('تعذّر قبول العرض');
    }
  };

  const handleReject = async (id) => {
    const confirmed = await confirmComplete('تأكيد رفض العرض؟');
    if (!confirmed) return;

    try {
      await rejectQuotation(id);
      success('تم رفض عرض السعر');
      fetchQuotations();
    } catch (err) {
      toastError('تعذّر رفض العرض');
    }
  };

  const handleConvertToContract = async (id) => {
    const confirmed = await confirmConvert('تحويل العرض إلى عقد', 'تحويل');
    if (!confirmed) return;

    try {
      const contract = await convertQuotationToContract(id);
      success(`تم إنشاء عقد رقم ${contract.contract_no} بنجاح`);
      navigate(`/contracts/${contract.id}`);
    } catch (err) {
      toastError('تعذّر تحويل العرض إلى عقد. تحقق من البيانات وحاول لاحقاً.');
    }
  };

  const filteredQuotations = useMemo(() => {
    let result = quotations;

    if (statusFilter !== 'all') {
      result = result.filter((q) => q.status === statusFilter);
    }

    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();

      switch (filterField) {
        case 'quotationNo':
          result = result.filter((q) => q.quotation_no?.toLowerCase().includes(searchLower));
          break;
        case 'customer':
          result = result.filter((q) => q.customer_name?.toLowerCase().includes(searchLower));
          break;
        default:
          result = result.filter(
            (q) =>
              q.quotation_no?.toLowerCase().includes(searchLower) ||
              q.customer_name?.toLowerCase().includes(searchLower) ||
              q.notes?.toLowerCase().includes(searchLower)
          );
      }
    }

    return result;
  }, [quotations, statusFilter, searchTerm, filterField]);

  const statistics = useMemo(() => {
    const total = quotations.length;
    const draft = quotations.filter((q) => q.status === 'DRAFT').length;
    const sent = quotations.filter((q) => q.status === 'SENT').length;
    const accepted = quotations.filter((q) => q.status === 'ACCEPTED').length;
    const rejected = quotations.filter((q) => q.status === 'REJECTED').length;
    const totalValue = quotations
      .filter((q) => ['SENT', 'ACCEPTED'].includes(q.status))
      .reduce((sum, q) => sum + (parseFloat(q.total) || 0), 0);

    return { total, draft, sent, accepted, rejected, totalValue };
  }, [quotations]);

  const statCards = [
    {
      label: 'إجمالي العروض',
      value: statistics.total,
      sub: 'جميع العروض',
      icon: FileText,
      className: 'from-blue-50 to-blue-100 border-blue-200 text-blue-900',
      iconBg: 'bg-blue-200',
      iconColor: 'text-blue-800'
    },
    {
      label: 'مسودة',
      value: statistics.draft,
      sub: 'عروض قيد الإعداد',
      icon: FileText,
      className: 'from-gray-50 to-gray-100 border-gray-200 text-gray-900',
      iconBg: 'bg-gray-200',
      iconColor: 'text-gray-800'
    },
    {
      label: 'مُرسل',
      value: statistics.sent,
      sub: 'بانتظار رد العميل',
      icon: Send,
      className: 'from-blue-50 to-blue-100 border-blue-200 text-blue-900',
      iconBg: 'bg-blue-200',
      iconColor: 'text-blue-800'
    },
    {
      label: 'مقبول',
      value: statistics.accepted,
      sub: 'جاهز للتحويل إلى عقد',
      icon: CheckCircle2,
      className: 'from-green-50 to-green-100 border-green-200 text-green-900',
      iconBg: 'bg-green-200',
      iconColor: 'text-green-800'
    },
    {
      label: 'مرفوض',
      value: statistics.rejected,
      sub: 'لم يعتمد من العميل',
      icon: XCircle,
      className: 'from-red-50 to-red-100 border-red-200 text-red-900',
      iconBg: 'bg-red-200',
      iconColor: 'text-red-800'
    },
    {
      label: 'القيمة الإجمالية',
      value: formatCurrency(statistics.totalValue),
      sub: 'للعروض المرسلة والمقبولة',
      icon: DollarSign,
      className: 'from-purple-50 to-purple-100 border-purple-200 text-purple-900',
      iconBg: 'bg-purple-200',
      iconColor: 'text-purple-800'
    }
  ];

  if (loading) {
    return (
      <Layout>
        <div className="space-y-6">
          <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">عروض الأسعار</h1>
            <p className="text-gray-600">إدارة عروض الأسعار والتحويل إلى عقود.</p>
          </div>
          <div className="bg-white rounded-2xl border border-gray-200 p-8 shadow-sm flex flex-col items-center justify-center min-h-[200px]">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
            <p className="text-gray-600">جارٍ تحميل عروض الأسعار...</p>
          </div>
        </div>
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout>
        <div className="space-y-6">
          <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">عروض الأسعار</h1>
            <p className="text-gray-600">إدارة عروض الأسعار والتحويل إلى عقود.</p>
          </div>

          <div className="bg-red-50 border border-red-200 rounded-2xl p-6 shadow-sm">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-red-200 rounded-full">
                <AlertCircle className="w-6 h-6 text-red-800" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-red-800 mb-1">حدث خلل</h3>
                <p className="text-red-700">{error}</p>
                <button
                  onClick={fetchQuotations}
                  className="mt-3 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors duration-200"
                >
                  إعادة المحاولة
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
      <div className="space-y-6">
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm space-y-6">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">عروض الأسعار</h1>
              <p className="text-gray-600">إدارة عروض الأسعار والتحويل إلى عقود ثم أوامر بيع.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                className="bg-purple-600 hover:bg-purple-700 text-white font-semibold py-2 px-4 rounded-lg transition-all duration-200 shadow-sm flex items-center gap-2"
                onClick={() => navigate('/quotations/create')}
              >
                <Plus className="w-4 h-4" />
                عرض سعر جديد
              </button>
              <button
                className="bg-white border border-gray-300 text-gray-800 font-medium py-2 px-4 rounded-lg transition-all duration-200 shadow-sm hover:border-gray-400 hover:shadow-md flex items-center gap-2"
                onClick={() => navigate('/quotations/create/elevators')}
              >
                <Plus className="w-4 h-4" />
                عرض مصاعد
              </button>
              <button
                className="bg-white border border-purple-200 text-purple-800 font-medium py-2 px-4 rounded-lg transition-all duration-200 shadow-sm hover:border-purple-300 hover:shadow-md flex items-center gap-2"
                onClick={() => navigate('/contracts')}
              >
                <FileCheck className="w-4 h-4" />
                العقود
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
            {statCards.map((card) => (
              <div
                key={card.label}
                className={`bg-gradient-to-br ${card.className} rounded-xl p-4 border shadow-[0_10px_30px_-15px_rgba(0,0,0,0.25)]`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-semibold mb-1">{card.label}</h3>
                    <p className="text-2xl font-bold">{card.value}</p>
                    <p className="text-xs mt-1 text-gray-700">{card.sub}</p>
                  </div>
                  <div className={`p-3 rounded-full ${card.iconBg}`}>
                    <card.icon className={`w-6 h-6 ${card.iconColor}`} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">قائمة عروض الأسعار</h2>
            <div className="flex gap-2">
              <button
                className="bg-purple-600 hover:bg-purple-700 text-white font-semibold py-2 px-4 rounded-lg transition-all duration-200 shadow-sm flex items-center gap-2"
                onClick={() => navigate('/quotations/create')}
              >
                <Plus className="w-4 h-4" />
                عرض سعر جديد
              </button>
              <button
                className="bg-blue-50 border border-blue-200 text-blue-800 font-medium py-2 px-4 rounded-lg transition-all duration-200 hover:border-blue-300"
                onClick={() => navigate('/quotations/create/elevators')}
              >
                عقد مصعد جديد (كامل)
              </button>
            </div>
          </div>

          <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setViewMode('table')}
                  className={`p-3 rounded-lg border ${
                    viewMode === 'table'
                      ? 'bg-purple-600 text-white border-purple-600 shadow-sm'
                      : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
                  }`}
                  title="عرض جدولي"
                >
                  <LayoutGrid className="w-5 h-5" />
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`p-3 rounded-lg border ${
                    viewMode === 'list'
                      ? 'bg-purple-600 text-white border-purple-600 shadow-sm'
                      : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
                  }`}
                  title="عرض مبسط"
                >
                  <List className="w-5 h-5" />
                </button>
              </div>

              <div className="flex flex-1 flex-col gap-3 lg:flex-row lg:items-center lg:justify-end">
                <div className="w-full lg:w-48">
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                  >
                    <option value="all">جميع الحالات</option>
                    <option value="DRAFT">مسودة</option>
                    <option value="SENT">مرسل</option>
                    <option value="ACCEPTED">مقبول</option>
                    <option value="REJECTED">مرفوض</option>
                  </select>
                </div>
                <div className="w-full lg:w-48">
                  <select
                    value={filterField}
                    onChange={(e) => setFilterField(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                  >
                    <option value="all">جميع الحقول</option>
                    <option value="quotationNo">رقم العرض</option>
                    <option value="customer">اسم العميل</option>
                  </select>
                </div>
                <div className="flex-1 min-w-[220px]">
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="بحث برقم العرض أو اسم العميل..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full px-4 py-3 pr-10 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                    />
                    <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                      <Search className="h-5 w-5 text-gray-400" />
                    </div>
                    {searchTerm && (
                      <button
                        onClick={() => setSearchTerm('')}
                        className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-400 hover:text-gray-600"
                        title="مسح البحث"
                      >
                        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-4 text-sm text-gray-600">
              عرض <span className="font-semibold text-gray-900">{filteredQuotations.length}</span> من أصل{' '}
              <span className="font-semibold text-gray-900">{quotations.length}</span> عرض
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gradient-to-r from-gray-50 to-gray-100">
                <tr>
                  <th scope="col" className="px-6 py-4 text-right text-xs font-medium text-gray-700 uppercase tracking-wider">
                    رقم العرض
                  </th>
                  <th scope="col" className="px-6 py-4 text-right text-xs font-medium text-gray-700 uppercase tracking-wider">
                    العميل
                  </th>
                  <th scope="col" className="px-6 py-4 text-right text-xs font-medium text-gray-700 uppercase tracking-wider">
                    نوع الطلب
                  </th>
                  <th scope="col" className="px-6 py-4 text-right text-xs font-medium text-gray-700 uppercase tracking-wider">
                    تاريخ العرض
                  </th>
                  <th scope="col" className="px-6 py-4 text-right text-xs font-medium text-gray-700 uppercase tracking-wider">
                    صالح حتى
                  </th>
                  <th scope="col" className="px-6 py-4 text-right text-xs font-medium text-gray-700 uppercase tracking-wider">
                    الحالة
                  </th>
                  <th scope="col" className="px-6 py-4 text-right text-xs font-medium text-gray-700 uppercase tracking-wider">
                    المبلغ
                  </th>
                  <th scope="col" className="px-6 py-4 text-right text-xs font-medium text-gray-700 uppercase tracking-wider">
                    الإجراءات
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredQuotations.length === 0 ? (
                  <tr>
                    <td colSpan="8" className="px-6 py-12 text-center">
                      <div className="flex flex-col items-center">
                        <FileText className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                        <h3 className="text-sm font-medium text-gray-900 mb-1">
                          {searchTerm || statusFilter !== 'all' ? 'لا توجد عروض مطابقة' : 'لا توجد عروض أسعار'}
                        </h3>
                        <p className="text-sm text-gray-500 mb-4">
                          {searchTerm || statusFilter !== 'all'
                            ? 'عدّل معايير البحث أو امسحها لعرض كل النتائج.'
                            : 'ابدأ بإنشاء عرض سعر جديد للعملاء.'}
                        </p>
                        <button
                          className="bg-purple-600 hover:bg-purple-700 text-white font-semibold py-2 px-4 rounded-lg transition-all duration-200 shadow-sm flex items-center gap-2"
                          onClick={() => navigate('/quotations/create')}
                        >
                          <Plus className="w-4 h-4" />
                          عرض سعر جديد
                        </button>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredQuotations.map((quotation) => (
                    <tr key={quotation.id} className="hover:bg-gray-50 transition-colors duration-150">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-semibold text-blue-900 hover:text-blue-700 cursor-pointer">
                          {quotation.quotation_no}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900 font-medium">{quotation.customer_name || 'عميل غير محدد'}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-600">{quotation.order_type === 'elevators' ? 'مصاعد' : 'عام'}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-600">{formatDate(quotation.quotation_date) || '-'}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-600">{formatDate(quotation.valid_until) || '-'}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getQuotationStatusClass(quotation.status)}`}>
                          {getQuotationStatusText(quotation.status)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-semibold text-gray-900">{formatCurrency(quotation.total)}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => navigate(`/quotations/${quotation.id}`)}
                            className="text-blue-600 hover:text-blue-900 transition-colors duration-150"
                            title="عرض التفاصيل"
                          >
                            <Eye className="h-5 w-5" />
                          </button>

                          {quotation.status === 'DRAFT' && (
                            <>
                              <button
                                onClick={() => handleSend(quotation.id)}
                                className="text-green-600 hover:text-green-900 transition-colors duration-150"
                                title="إرسال للعميل"
                              >
                                <Play className="h-5 w-5" />
                              </button>
                              <button
                                onClick={() => handleDelete(quotation.id)}
                                className="text-red-600 hover:text-red-900 transition-colors duration-150"
                                title="حذف العرض"
                              >
                                <Trash2 className="h-5 w-5" />
                              </button>
                            </>
                          )}

                          {quotation.status === 'SENT' && (
                            <>
                              <button
                                onClick={() => handleAccept(quotation.id)}
                                className="text-green-600 hover:text-green-900 transition-colors duration-150"
                                title="قبول العرض"
                              >
                                <CheckCircle2 className="h-5 w-5" />
                              </button>
                              <button
                                onClick={() => handleReject(quotation.id)}
                                className="text-red-600 hover:text-red-900 transition-colors duration-150"
                                title="رفض العرض"
                              >
                                <XCircle className="h-5 w-5" />
                              </button>
                            </>
                          )}

                          {quotation.status === 'ACCEPTED' && (
                            <button
                              onClick={() => handleConvertToContract(quotation.id)}
                              className="px-3 py-1.5 bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white text-sm font-medium rounded-lg transition-all duration-200 shadow-sm hover:shadow-md flex items-center gap-1.5"
                              title="تحويل إلى عقد"
                            >
                              <FileCheck className="w-4 h-4" />
                              <span>تحويل إلى عقد</span>
                            </button>
                          )}
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
    </Layout>
  );
};

export default Quotations;
