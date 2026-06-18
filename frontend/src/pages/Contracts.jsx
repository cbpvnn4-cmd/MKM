import React, { useState, useEffect, useMemo } from 'react';
import Layout from '../components/Layout';
import { useToast } from '../components/ui/Toast';
import { useConfirmations } from '../components/ui/ConfirmDialog';
import {
  getContracts,
  deleteContract,
  getContractStats,
  activateContract,
  completeContract,
  convertContractToSalesOrder
} from '../services/api';
import { useNavigate } from 'react-router-dom';
import { Badge, StatusBadge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import {
  FileText,
  DollarSign,
  CheckCircle2,
  Play,
  Plus,
  Search,
  Eye,
  Trash2,
  Calendar,
  XCircle,
  ShoppingBag
} from 'lucide-react';
import { formatCurrency, formatDate, getContractStatusClass, getContractStatusText } from '../utils/formatters';

const Contracts = () => {
  // Toast and Confirm hooks
  const { success, error: toastError } = useToast();
  const { confirmDelete, confirmActivate, confirmComplete, confirmConvert } = useConfirmations();

  const [contracts, setContracts] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [filterField, setFilterField] = useState('all');

  const navigate = useNavigate();

  useEffect(() => {
    fetchContracts();
    fetchStats();
  }, []);

  const fetchContracts = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getContracts();
      setContracts(Array.isArray(data) ? data : []);
    } catch (err) {
      setError('تعذر تحميل العقود');
      console.error('Error fetching contracts:', err);
      setContracts([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const data = await getContractStats();
      setStats(data);
    } catch (err) {
      // Silent error for stats
    }
  };

  const handleDelete = async (id) => {
    const confirmed = await confirmDelete('العقد');
    if (!confirmed) return;

    try {
      await deleteContract(id);
      success('تم حذف العقد بنجاح');
      fetchContracts();
      fetchStats();
    } catch (err) {
      toastError('تعذر حذف العقد. يمكن حذف العقود بحالة "مسودة" فقط.');
    }
  };

  const handleActivate = async (id) => {
    const confirmed = await confirmActivate('العقد');
    if (!confirmed) return;

    try {
      await activateContract(id);
      success('تم تفعيل العقد بنجاح');
      fetchContracts();
      fetchStats();
    } catch (err) {
      toastError('تعذر تفعيل العقد');
    }
  };

  const handleComplete = async (id) => {
    const confirmed = await confirmComplete('العقد');
    if (!confirmed) return;

    try {
      await completeContract(id);
      success('تم إكمال العقد بنجاح');
      fetchContracts();
      fetchStats();
    } catch (err) {
      toastError('تعذر إكمال العقد');
    }
  };

  const handleConvertToSalesOrder = async (id) => {
    const confirmed = await confirmConvert('العقد', 'أمر بيع');
    if (!confirmed) return;

    try {
      const result = await convertContractToSalesOrder(id);
      success(`تم إنشاء أمر البيع ${result.sales_order_no} بنجاح`);
      navigate(`/sales-orders/${result.sales_order_id}`);
    } catch (err) {
      toastError('تعذر تحويل العقد إلى أمر بيع. تأكد من أن العقد نشط ومرتبط بعرض أسعار.');
    }
  };

  // الدوال getStatusClass, getStatusText, formatCurrency, formatDate تم استيرادها من utils/formatters
  // getStatusClass, getStatusText, formatCurrency, formatDate are now imported from utils/formatters

  // Filter and search contracts
  const filteredContracts = useMemo(() => {
    let result = contracts;

    // Apply status filter
    if (statusFilter !== 'all') {
      result = result.filter(c => c.status === statusFilter);
    }

    // Apply search term
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();

      switch (filterField) {
        case 'contractNo':
          result = result.filter(c => c.contract_no?.toLowerCase().includes(searchLower));
          break;
        case 'customer':
          result = result.filter(c => c.customer_name?.toLowerCase().includes(searchLower));
          break;
        default:
          // Search all fields
          result = result.filter(c =>
            c.contract_no?.toLowerCase().includes(searchLower) ||
            c.customer_name?.toLowerCase().includes(searchLower) ||
            c.notes?.toLowerCase().includes(searchLower)
          );
      }
    }

    return result;
  }, [contracts, statusFilter, searchTerm, filterField]);

  // Calculate statistics
  const statistics = useMemo(() => {
    const total = contracts.length;
    const draft = contracts.filter(c => c.status === 'DRAFT').length;
    const active = contracts.filter(c => c.status === 'ACTIVE').length;
    const completed = contracts.filter(c => c.status === 'COMPLETED').length;
    const terminated = contracts.filter(c => c.status === 'TERMINATED').length;
    const totalValue = contracts
      .filter(c => ['ACTIVE', 'COMPLETED'].includes(c.status))
      .reduce((sum, c) => sum + (parseFloat(c.total_amount) || 0), 0);

    return { total, draft, active, completed, terminated, totalValue };
  }, [contracts]);

  if (loading) {
    return (
      <Layout>
        <div className="space-y-6">
          {/* Page Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-800 mb-2">العقود</h1>
            <p className="text-gray-600">إدارة وتتبع جميع العقود والتحويل إلى أوامر بيع</p>
          </div>

          {/* Loading State */}
          <div className="flex items-center justify-center min-h-64">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600">جاري تحميل العقود...</p>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout>
        <div className="space-y-6">
          {/* Page Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-800 mb-2">العقود</h1>
            <p className="text-gray-600">إدارة وتتبع جميع العقود والتحويل إلى أوامر بيع</p>
          </div>

          {/* Error State */}
          <div className="bg-gradient-to-br from-red-50 to-red-100 rounded-xl border border-red-200 p-6">
            <div className="flex items-center">
              <div className="p-3 bg-red-200 rounded-full ml-4">
                <svg className="w-6 h-6 text-red-800" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-medium text-red-800 mb-1">حدث خطأ</h3>
                <p className="text-red-700">{error}</p>
                <button
                  onClick={fetchContracts}
                  className="mt-3 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors duration-200"
                >
                  المحاولة مرة أخرى
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
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">العقود</h1>
          <p className="text-gray-600">إدارة وتتبع جميع العقود والتحويل إلى أوامر بيع</p>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-6 border border-blue-200">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-medium text-blue-800 mb-1">إجمالي العقود</h3>
                <p className="text-2xl font-bold text-blue-900">{statistics.total}</p>
                <p className="text-xs text-blue-600 mt-1">جميع العقود</p>
              </div>
              <div className="p-3 bg-blue-200 rounded-full">
                <FileText className="w-6 h-6 text-blue-800" />
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl p-6 border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-medium text-gray-800 mb-1">مسودة</h3>
                <p className="text-2xl font-bold text-gray-900">{statistics.draft}</p>
                <p className="text-xs text-gray-600 mt-1">عقود قيد الإعداد</p>
              </div>
              <div className="p-3 bg-gray-200 rounded-full">
                <FileText className="w-6 h-6 text-gray-800" />
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-6 border border-green-200">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-medium text-green-800 mb-1">نشط</h3>
                <p className="text-2xl font-bold text-green-900">{statistics.active}</p>
                <p className="text-xs text-green-600 mt-1">عقود جارية</p>
              </div>
              <div className="p-3 bg-green-200 rounded-full">
                <Play className="w-6 h-6 text-green-800" />
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl p-6 border border-purple-200">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-medium text-purple-800 mb-1">القيمة الإجمالية</h3>
                <p className="text-2xl font-bold text-purple-900">{formatCurrency(statistics.totalValue)}</p>
                <p className="text-xs text-purple-600 mt-1">للعقود النشطة والمكتملة</p>
              </div>
              <div className="p-3 bg-purple-200 rounded-full">
                <DollarSign className="w-6 h-6 text-purple-800" />
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-800">قائمة العقود</h2>
            <div className="flex gap-2">
              <button
                className="bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white font-medium py-2 px-4 rounded-lg transition-all duration-200 shadow-sm hover:shadow-md flex items-center gap-2"
                onClick={() => navigate('/contracts/create/new')}
              >
                <Plus className="w-4 h-4" />
                عقد مصعد جديد (كامل)
              </button>
              <button
                className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-medium py-2 px-4 rounded-lg transition-all duration-200 shadow-sm hover:shadow-md"
                onClick={() => navigate('/contracts/create')}
              >
                إضافة عقد جديد
              </button>
            </div>
          </div>

          {/* Search and Filter Controls */}
          <div className="p-6 border-b border-gray-200 bg-gray-50">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <input
                    type="text"
                    placeholder="البحث في العقود..."
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
                      className="absolute inset-y-0 left-0 pl-3 flex items-center"
                    >
                      <svg className="h-5 w-5 text-gray-400 hover:text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  )}
                </div>
              </div>
              <div>
                <select
                  value={filterField}
                  onChange={(e) => setFilterField(e.target.value)}
                  className="px-4 py-3 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                >
                  <option value="all">جميع الحقول</option>
                  <option value="contractNo">رقم العقد</option>
                  <option value="customer">العميل</option>
                </select>
              </div>
              <div>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="px-4 py-3 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                >
                  <option value="all">جميع الحالات</option>
                  <option value="DRAFT">مسودة</option>
                  <option value="ACTIVE">نشط</option>
                  <option value="COMPLETED">مكتمل</option>
                  <option value="TERMINATED">ملغي</option>
                </select>
              </div>
            </div>

            {/* Results Count */}
            <div className="mt-4 text-sm text-gray-600">
              عرض {filteredContracts.length} من أصل {contracts.length} عقد
            </div>
          </div>

          {/* Enhanced Table */}
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gradient-to-r from-gray-50 to-gray-100">
                <tr>
                  <th scope="col" className="px-6 py-4 text-right text-xs font-medium text-gray-700 uppercase tracking-wider">
                    رقم العقد
                  </th>
                  <th scope="col" className="px-6 py-4 text-right text-xs font-medium text-gray-700 uppercase tracking-wider">
                    العميل
                  </th>
                  <th scope="col" className="px-6 py-4 text-right text-xs font-medium text-gray-700 uppercase tracking-wider">
                    نوع العقد
                  </th>
                  <th scope="col" className="px-6 py-4 text-right text-xs font-medium text-gray-700 uppercase tracking-wider">
                    تاريخ البدء
                  </th>
                  <th scope="col" className="px-6 py-4 text-right text-xs font-medium text-gray-700 uppercase tracking-wider">
                    تاريخ الانتهاء
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
                {filteredContracts.length === 0 ? (
                  <tr>
                    <td colSpan="8" className="px-6 py-12 text-center">
                      <div className="flex flex-col items-center">
                        <FileText className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                        <h3 className="text-sm font-medium text-gray-900 mb-1">
                          {searchTerm || statusFilter !== 'all' ? 'لا توجد عقود مطابقة لمعايير البحث' : 'لا توجد عقود'}
                        </h3>
                        <p className="text-sm text-gray-500">
                          {searchTerm || statusFilter !== 'all' ? 'حاول تغيير معايير البحث أو الفلتر' : 'ابدأ بإنشاء عقد جديد'}
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredContracts.map((contract) => (
                    <tr key={contract.id} className="hover:bg-gray-50 transition-colors duration-150">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-blue-900 hover:text-blue-700 cursor-pointer">
                          {contract.contract_no}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900 font-medium">{contract.customer_name || 'غير محدد'}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-600">{contract.contract_type || 'SALES'}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-600">{formatDate(contract.start_date) || '-'}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-600">{formatDate(contract.end_date) || '-'}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusClass(contract.status)}`}>
                          {getStatusText(contract.status)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-semibold text-gray-900">{formatCurrency(contract.total_amount)}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => navigate(`/contracts/${contract.id}`)}
                            className="text-blue-600 hover:text-blue-900 transition-colors duration-150"
                            title="عرض"
                          >
                            <Eye className="h-5 w-5" />
                          </button>

                          {contract.status === 'DRAFT' && (
                            <>
                              <button
                                onClick={() => handleActivate(contract.id)}
                                className="text-green-600 hover:text-green-900 transition-colors duration-150"
                                title="تفعيل"
                              >
                                <Play className="h-5 w-5" />
                              </button>
                              <button
                                onClick={() => handleDelete(contract.id)}
                                className="text-red-600 hover:text-red-900 transition-colors duration-150"
                                title="حذف"
                              >
                                <Trash2 className="h-5 w-5" />
                              </button>
                            </>
                          )}

                          {contract.status === 'ACTIVE' && (
                            <>
                              <button
                                onClick={() => handleConvertToSalesOrder(contract.id)}
                                className="text-purple-600 hover:text-purple-900 transition-colors duration-150"
                                title="تحويل لأمر بيع"
                              >
                                <ShoppingBag className="h-5 w-5" />
                              </button>
                              <button
                                onClick={() => handleComplete(contract.id)}
                                className="text-green-600 hover:text-green-900 transition-colors duration-150"
                                title="إكمال"
                              >
                                <CheckCircle2 className="h-5 w-5" />
                              </button>
                            </>
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

export default Contracts;
