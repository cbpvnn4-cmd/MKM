import React, { useState, useEffect, useMemo } from 'react';
import Layout from '../components/Layout';
import { getWarehouses, deleteWarehouse } from '../services/api';
import { useToast } from '../components/ui/Toast';
import { useConfirmations } from '../components/ui/ConfirmDialog';

const Warehouses = () => {
  const { success, error: toastError } = useToast();
  const { confirmDelete } = useConfirmations();
  const [warehouses, setWarehouses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterField, setFilterField] = useState('all');

  useEffect(() => {
    fetchWarehouses();
  }, []);

  const fetchWarehouses = async () => {
    try {
      setLoading(true);
      const data = await getWarehouses();
      setWarehouses(data);
      setError(null);
    } catch (err) {
      const errorMessage = err.response?.data?.detail || err.message || 'Failed to fetch warehouses';
      setError(`خطأ في تحميل المخازن: ${errorMessage}`);
      console.error('Error fetching warehouses:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    const confirmed = await confirmDelete('المخزن');
    if (!confirmed) return;

    try {
      await deleteWarehouse(id);
      success('تم حذف المخزن بنجاح');
      fetchWarehouses(); // Refresh the list
    } catch (err) {
      toastError('فشل في حذف المخزن');
      console.error('Error deleting warehouse:', err);
    }
  };

  // Filter and search warehouses
  const filteredWarehouses = useMemo(() => {
    if (!searchTerm) return warehouses;

    return warehouses.filter(warehouse => {
      const searchLower = searchTerm.toLowerCase();

      switch (filterField) {
        case 'name':
          return warehouse.name?.toLowerCase().includes(searchLower);
        case 'location':
          return warehouse.location?.toLowerCase().includes(searchLower);
        default:
          // Search all fields
          return (
            warehouse.name?.toLowerCase().includes(searchLower) ||
            warehouse.location?.toLowerCase().includes(searchLower)
          );
      }
    });
  }, [warehouses, searchTerm, filterField]);

  if (loading) {
    return (
      <Layout>
        <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
          <div className="max-w-6xl mx-auto p-6">
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 p-8">
              <div className="flex items-center justify-center space-y-4">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                <div className="text-xl font-semibold text-gray-700 mr-4">جاري تحميل المخازن...</div>
              </div>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout>
        <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
          <div className="max-w-6xl mx-auto p-6">
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 p-8">
              <div className="text-center">
                <div className="text-red-600 text-lg mb-4">{error}</div>
                <button
                  onClick={fetchWarehouses}
                  className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white font-semibold rounded-xl hover:from-blue-600 hover:to-purple-700 transform hover:scale-105 transition-all duration-200 shadow-lg hover:shadow-xl"
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
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50" dir="rtl">
        <div className="max-w-6xl mx-auto p-6">
          {/* Header */}
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 p-8 mb-8">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4 rtl:space-x-reverse">
                <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-blue-600 rounded-xl flex items-center justify-center">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                </div>
                <div>
                  <h1 className="text-3xl font-bold text-gray-800">المخازن</h1>
                  <p className="text-gray-600 mt-1">إدارة وعرض جميع المخازن والمستودعات</p>
                </div>
              </div>
              <button
                className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white font-semibold rounded-xl hover:from-blue-600 hover:to-purple-700 transform hover:scale-105 transition-all duration-200 shadow-lg hover:shadow-xl"
                onClick={() => window.location.href = '/warehouses/new'}
              >
                <svg className="w-5 h-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                إضافة مخزن جديد
              </button>
            </div>
          </div>

          <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 p-8">

            {/* Search and Filter Controls */}
            <div className="mb-6 flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <input
                    type="text"
                    placeholder="البحث في المخازن..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl shadow-sm bg-white/70 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                  />
                  {searchTerm && (
                    <button
                      onClick={() => setSearchTerm('')}
                      className="absolute inset-y-0 left-0 pl-3 flex items-center"
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
                  className="px-4 py-3 border-2 border-gray-200 rounded-xl shadow-sm bg-white/70 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                >
                  <option value="all">جميع الحقول</option>
                  <option value="name">الاسم</option>
                  <option value="location">الموقع</option>
                </select>
              </div>
            </div>

            {/* Results Count */}
            <div className="mb-4 text-sm text-gray-500">
              عرض {filteredWarehouses.length} من {warehouses.length} مخزن
            </div>

            <div className="overflow-x-auto bg-white/50 backdrop-blur-sm rounded-xl border border-gray-200">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gradient-to-r from-gray-50 to-gray-100">
                  <tr>
                    <th scope="col" className="px-6 py-4 text-right text-sm font-bold text-gray-700">
                      اسم المخزن
                    </th>
                    <th scope="col" className="px-6 py-4 text-right text-sm font-bold text-gray-700">
                      الموقع
                    </th>
                    <th scope="col" className="px-6 py-4 text-right text-sm font-bold text-gray-700">
                      السعة
                    </th>
                    <th scope="col" className="px-6 py-4 text-center text-sm font-bold text-gray-700">
                      العمليات
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white/80 divide-y divide-gray-200">
                  {filteredWarehouses.length === 0 ? (
                    <tr>
                      <td colSpan="4" className="px-6 py-12 text-center">
                        <div className="flex flex-col items-center">
                          <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                          </svg>
                          <h3 className="mt-2 text-sm font-medium text-gray-900">
                            {searchTerm ? 'لا توجد مخازن تطابق معايير البحث' : 'لا توجد مخازن'}
                          </h3>
                          <p className="mt-1 text-sm text-gray-500">
                            {searchTerm ? 'جرب تغيير مصطلحات البحث' : 'ابدأ بإضافة مخزن جديد'}
                          </p>
                          {!searchTerm && (
                            <div className="mt-6">
                              <button
                                onClick={() => window.location.href = '/warehouses/new'}
                                className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-blue-500 to-purple-600 text-white font-semibold rounded-xl hover:from-blue-600 hover:to-purple-700 transform hover:scale-105 transition-all duration-200 shadow-lg hover:shadow-xl"
                              >
                                إضافة مخزن جديد
                              </button>
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  ) : (
                    filteredWarehouses.map((warehouse) => (
                      <tr key={warehouse.id} className="hover:bg-gray-50/50 transition-colors duration-200">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">{warehouse.name}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-700">{warehouse.location || 'غير محدد'}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-semibold text-gray-900">
                            {typeof warehouse.capacity === 'number' ? warehouse.capacity.toLocaleString('en-US') :
                             typeof warehouse.capacity === 'string' ? parseFloat(warehouse.capacity).toLocaleString('en-US') : '0'} قطعة
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-center">
                          <div className="flex items-center justify-center space-x-3 space-x-reverse">
                            <button
                              className="inline-flex items-center px-3 py-2 border border-transparent text-xs font-medium rounded-lg text-blue-700 bg-blue-100 hover:bg-blue-200 transition-colors duration-200"
                              onClick={() => window.location.href = `/warehouses/${warehouse.id}/edit`}
                            >
                              <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                              </svg>
                              تعديل
                            </button>
                            <button
                              className="inline-flex items-center px-3 py-2 border border-transparent text-xs font-medium rounded-lg text-red-700 bg-red-100 hover:bg-red-200 transition-colors duration-200"
                              onClick={() => handleDelete(warehouse.id)}
                            >
                              <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
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
      </div>
    </Layout>
  );
};

export default Warehouses;