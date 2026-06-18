import React, { useState, useEffect, useMemo } from 'react';
import Layout from '../components/Layout';
import { getServiceTickets, deleteServiceTicket } from '../services/api';
import { useToast } from '../components/ui/Toast';
import { useConfirmations } from '../components/ui/ConfirmDialog';

const ServiceTickets = () => {
  const { success, error: toastError } = useToast();
  const { confirmDelete } = useConfirmations();
  const [serviceTickets, setServiceTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterField, setFilterField] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');

  useEffect(() => {
    fetchServiceTickets();
  }, []);

  const fetchServiceTickets = async () => {
    try {
      setLoading(true);
      const data = await getServiceTickets();
      setServiceTickets(data);
      setError(null);
    } catch (err) {
      setError('فشل في جلب تذاكر الخدمة');
      console.error('Error fetching service tickets:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    const confirmed = await confirmDelete('التذكرة');
    if (!confirmed) return;

    try {
      await deleteServiceTicket(id);
      success('تم حذف التذكرة بنجاح');
      fetchServiceTickets(); // Refresh the list
    } catch (err) {
      toastError('فشل في حذف تذكرة الخدمة');
      console.error('Error deleting service ticket:', err);
    }
  };

  const getStatusClass = (status) => {
    switch (status) {
      case 'OPEN':
        return 'bg-gradient-to-r from-gray-100 to-gray-200 text-gray-800 border border-gray-300';
      case 'IN_PROGRESS':
        return 'bg-gradient-to-r from-blue-100 to-blue-200 text-blue-800 border border-blue-300';
      case 'ON_HOLD':
        return 'bg-gradient-to-r from-yellow-100 to-yellow-200 text-yellow-800 border border-yellow-300';
      case 'RESOLVED':
        return 'bg-gradient-to-r from-green-100 to-green-200 text-green-800 border border-green-300';
      case 'CLOSED':
        return 'bg-gradient-to-r from-purple-100 to-purple-200 text-purple-800 border border-purple-300';
      default:
        return 'bg-gradient-to-r from-gray-100 to-gray-200 text-gray-800 border border-gray-300';
    }
  };

  const getPriorityClass = (priority) => {
    switch (priority) {
      case 'LOW':
        return 'bg-gradient-to-r from-gray-100 to-gray-200 text-gray-800 border border-gray-300';
      case 'MEDIUM':
        return 'bg-gradient-to-r from-blue-100 to-blue-200 text-blue-800 border border-blue-300';
      case 'HIGH':
        return 'bg-gradient-to-r from-orange-100 to-orange-200 text-orange-800 border border-orange-300';
      case 'URGENT':
        return 'bg-gradient-to-r from-red-100 to-red-200 text-red-800 border border-red-300';
      default:
        return 'bg-gradient-to-r from-gray-100 to-gray-200 text-gray-800 border border-gray-300';
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'OPEN':
        return 'مفتوحة';
      case 'IN_PROGRESS':
        return 'قيد التنفيذ';
      case 'ON_HOLD':
        return 'معلقة';
      case 'RESOLVED':
        return 'محلولة';
      case 'CLOSED':
        return 'مغلقة';
      default:
        return status;
    }
  };

  const getPriorityText = (priority) => {
    switch (priority) {
      case 'LOW':
        return 'منخفضة';
      case 'MEDIUM':
        return 'متوسطة';
      case 'HIGH':
        return 'عالية';
      case 'URGENT':
        return 'عاجلة';
      default:
        return priority;
    }
  };

  // Filter and search service tickets
  const filteredServiceTickets = useMemo(() => {
    let result = serviceTickets;
    
    // Apply status filter
    if (statusFilter !== 'all') {
      result = result.filter(ticket => ticket.status === statusFilter);
    }
    
    // Apply priority filter
    if (priorityFilter !== 'all') {
      result = result.filter(ticket => ticket.priority === priorityFilter);
    }
    
    // Apply search term
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      
      switch (filterField) {
        case 'ticket_no':
          result = result.filter(ticket => ticket.ticket_no?.toLowerCase().includes(searchLower));
          break;
        case 'title':
          result = result.filter(ticket => ticket.title?.toLowerCase().includes(searchLower));
          break;
        case 'customer':
          result = result.filter(ticket => 
            (ticket.customer_name || ticket.customer)?.toLowerCase().includes(searchLower)
          );
          break;
        case 'project':
          result = result.filter(ticket => 
            (ticket.project_name || ticket.project)?.toLowerCase().includes(searchLower)
          );
          break;
        default:
          // Search all fields
          result = result.filter(ticket => 
            ticket.ticket_no?.toLowerCase().includes(searchLower) ||
            ticket.title?.toLowerCase().includes(searchLower) ||
            (ticket.customer_name || ticket.customer)?.toLowerCase().includes(searchLower) ||
            (ticket.project_name || ticket.project)?.toLowerCase().includes(searchLower)
          );
      }
    }
    
    return result;
  }, [serviceTickets, searchTerm, filterField, statusFilter, priorityFilter]);

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout>
        <div className="bg-white rounded-xl shadow-sm border border-red-200 p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-gray-800">تذاكر الخدمة</h2>
          </div>
          <div className="text-red-500 bg-red-50 p-4 rounded-lg border border-red-200">{error}</div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-800 mb-2">تذاكر الخدمة</h1>
            <p className="text-gray-600">إدارة تذاكر صيانة المصاعد وطلبات الخدمة</p>
          </div>
          <button
            className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-semibold py-3 px-6 rounded-lg shadow-md hover:shadow-lg transition-all duration-200 transform hover:-translate-y-1"
            onClick={() => window.location.href = '/service-tickets/new'}
          >
            <svg className="w-5 h-5 inline-block ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            إضافة تذكرة جديدة
          </button>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        
          {/* Search and Filter Controls */}
          <div className="mb-6 flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
                <input
                  type="text"
                  placeholder="البحث في تذاكر الخدمة..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                />
                {searchTerm && (
                  <button
                    onClick={() => setSearchTerm('')}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center hover:text-gray-600 transition-colors"
                  >
                    <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
                <option value="ticket_no">رقم التذكرة</option>
                <option value="title">العنوان</option>
                <option value="customer">العميل</option>
                <option value="project">المشروع</option>
              </select>
            </div>
            <div>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-4 py-3 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
              >
                <option value="all">جميع الحالات</option>
                <option value="OPEN">مفتوحة</option>
                <option value="IN_PROGRESS">قيد التنفيذ</option>
                <option value="ON_HOLD">معلقة</option>
                <option value="RESOLVED">محلولة</option>
                <option value="CLOSED">مغلقة</option>
              </select>
            </div>
            <div>
              <select
                value={priorityFilter}
                onChange={(e) => setPriorityFilter(e.target.value)}
                className="px-4 py-3 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
              >
                <option value="all">جميع الأولويات</option>
                <option value="LOW">منخفضة</option>
                <option value="MEDIUM">متوسطة</option>
                <option value="HIGH">عالية</option>
                <option value="URGENT">عاجلة</option>
              </select>
            </div>
          </div>
        
          {/* Results Count */}
          <div className="mb-4 flex items-center justify-between">
            <div className="text-sm text-gray-500">
              عرض {filteredServiceTickets.length} من {serviceTickets.length} تذكرة خدمة
            </div>
            <div className="text-xs text-gray-400">
              آخر تحديث: {new Date().toLocaleDateString('en-GB')}
            </div>
          </div>
        
          <div className="overflow-x-auto rounded-lg border border-gray-200">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gradient-to-r from-gray-50 to-gray-100">
                <tr>
                  <th scope="col" className="px-6 py-4 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    رقم التذكرة
                  </th>
                  <th scope="col" className="px-6 py-4 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    العميل
                  </th>
                  <th scope="col" className="px-6 py-4 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    العنوان
                  </th>
                  <th scope="col" className="px-6 py-4 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    المشروع
                  </th>
                  <th scope="col" className="px-6 py-4 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    الأولوية
                  </th>
                  <th scope="col" className="px-6 py-4 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    الحالة
                  </th>
                  <th scope="col" className="px-6 py-4 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    الإجراءات
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredServiceTickets.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="px-6 py-12 text-center">
                      <div className="flex flex-col items-center">
                        <svg className="w-12 h-12 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        <h3 className="text-lg font-medium text-gray-900 mb-2">
                          {searchTerm || statusFilter !== 'all' || priorityFilter !== 'all' ? 'لا توجد تذاكر تطابق معايير البحث' : 'لا توجد تذاكر خدمة'}
                        </h3>
                        <p className="text-gray-500">
                          {searchTerm || statusFilter !== 'all' || priorityFilter !== 'all' ? 'جرب تغيير معايير البحث أو الفلتر' : 'ابدأ بإنشاء تذكرة خدمة جديدة'}
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredServiceTickets.map((ticket) => (
                    <tr key={ticket.id} className="hover:bg-gray-50 transition-colors duration-150">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-semibold text-blue-900 bg-blue-50 px-2 py-1 rounded-md inline-block">
                          {ticket.ticket_no}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="w-8 h-8 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full flex items-center justify-center text-white text-xs font-bold mr-3">
                            {(ticket.customer_name || ticket.customer || 'ع').charAt(0)}
                          </div>
                          <div className="text-sm font-medium text-gray-900">{ticket.customer_name || ticket.customer}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-900 font-medium">{ticket.title}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-600">{ticket.project_name || ticket.project}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full shadow-sm ${getPriorityClass(ticket.priority || 'MEDIUM')}`}>
                          {getPriorityText(ticket.priority || 'MEDIUM')}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full shadow-sm ${getStatusClass(ticket.status || 'OPEN')}`}>
                          {getStatusText(ticket.status || 'OPEN')}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex items-center space-x-2 space-x-reverse">
                          <button
                            className="bg-blue-50 text-blue-700 hover:bg-blue-100 hover:text-blue-800 px-3 py-1 rounded-md transition-colors duration-200 flex items-center text-xs"
                            onClick={() => window.location.href = `/service-tickets/${ticket.id}/edit`}
                          >
                            <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                            تحرير
                          </button>
                          <button
                            className="bg-red-50 text-red-700 hover:bg-red-100 hover:text-red-800 px-3 py-1 rounded-md transition-colors duration-200 flex items-center text-xs"
                            onClick={() => handleDelete(ticket.id)}
                          >
                            <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                            حذف
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
    </Layout>
  );
};

export default ServiceTickets;