import React, { useState, useEffect, useMemo } from 'react';
import Layout from '../components/Layout';
import { getProducts, deleteProduct, getProductComponentsSummary } from '../services/api';
import { useNavigate } from 'react-router-dom';
import { useToast } from '../components/ui/Toast';
import { useConfirmations } from '../components/ui/ConfirmDialog';

const Products = () => {
  const { success, error: toastError } = useToast();
  const { confirmDelete } = useConfirmations();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterField, setFilterField] = useState('all');
  const [selectedProductComponents, setSelectedProductComponents] = useState(null);
  const [componentsModalOpen, setComponentsModalOpen] = useState(false);

  const navigate = useNavigate();

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const data = await getProducts();
      setProducts(data);
      setError(null);
    } catch (err) {
      setError('فشل في جلب بيانات المنتجات');
      console.error('خطأ في جلب المنتجات:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    const confirmed = await confirmDelete('المنتج');
    if (!confirmed) return;

    try {
      await deleteProduct(id);
      success('تم حذف المنتج بنجاح');
      fetchProducts(); // Refresh the list
    } catch (err) {
      toastError('فشل في حذف المنتج');
      console.error('خطأ في حذف المنتج:', err);
    }
  };

  const handleViewComponents = async (productId) => {
    try {
      const data = await getProductComponentsSummary(productId);
      setSelectedProductComponents(data);
      setComponentsModalOpen(true);
    } catch (err) {
      console.error('خطأ في جلب مكونات المنتج:', err);
      const errorMessage = err.response?.data?.detail || err.message || 'فشل في جلب مكونات المنتج';
      toastError(`خطأ: ${errorMessage}`);
    }
  };

  const closeComponentsModal = () => {
    setComponentsModalOpen(false);
    setSelectedProductComponents(null);
  };

  // Format currency for Arabic locale
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount || 0);
  };

  // Get stock status with color
  const getStockStatus = (stock, minStock = 10) => {
    if (stock === 0) {
      return { text: 'نفذ المخزون', color: 'bg-red-100 text-red-800', indicator: 'bg-red-500' };
    } else if (stock < minStock) {
      return { text: 'مخزون منخفض', color: 'bg-yellow-100 text-yellow-800', indicator: 'bg-yellow-500' };
    }
    return { text: 'متوفر', color: 'bg-green-100 text-green-800', indicator: 'bg-green-500' };
  };

  // Get category badge color
  const getCategoryColor = (category) => {
    const colors = {
      'Electronics': 'bg-blue-100 text-blue-800',
      'Clothing': 'bg-purple-100 text-purple-800',
      'Food': 'bg-green-100 text-green-800',
      'Books': 'bg-yellow-100 text-yellow-800',
      'Toys': 'bg-pink-100 text-pink-800',
      'Sports': 'bg-indigo-100 text-indigo-800',
    };
    return colors[category] || 'bg-gray-100 text-gray-800';
  };

  // Calculate statistics
  const statistics = useMemo(() => {
    const totalProducts = products.length;
    const totalStockValue = products.reduce((sum, product) => {
      const price = parseFloat(product.price) || 0;
      const stock = parseInt(product.stock) || 0;
      return sum + (price * stock);
    }, 0);
    const lowStockCount = products.filter(product => {
      const stock = parseInt(product.stock) || 0;
      return stock > 0 && stock < 10;
    }).length;
    const outOfStockCount = products.filter(product => {
      const stock = parseInt(product.stock) || 0;
      return stock === 0;
    }).length;

    return { totalProducts, totalStockValue, lowStockCount, outOfStockCount };
  }, [products]);

  // Filter and search products
  const filteredProducts = useMemo(() => {
    if (!searchTerm) return products;

    return products.filter(product => {
      const searchLower = searchTerm.toLowerCase();

      switch (filterField) {
        case 'sku':
          return product.sku?.toLowerCase().includes(searchLower);
        case 'name':
          return product.name?.toLowerCase().includes(searchLower);
        case 'category':
          return product.category?.toLowerCase().includes(searchLower);
        default:
          // Search all fields
          return (
            product.sku?.toLowerCase().includes(searchLower) ||
            product.name?.toLowerCase().includes(searchLower) ||
            product.category?.toLowerCase().includes(searchLower)
          );
      }
    });
  }, [products, searchTerm, filterField]);

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout>
        <div className="space-y-6">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-800 mb-2">المنتجات</h1>
            <p className="text-gray-600">إدارة وعرض جميع منتجات المتجر</p>
          </div>
          <div className="bg-red-50 border border-red-200 rounded-xl p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">
                  خطأ في تحميل البيانات
                </h3>
                <div className="mt-2 text-sm text-red-700">
                  <p>{error}</p>
                </div>
                <div className="mt-4">
                  <button
                    onClick={fetchProducts}
                    className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-red-700 bg-red-100 hover:bg-red-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                  >
                    إعادة المحاولة
                  </button>
                </div>
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
          <h1 className="text-3xl font-bold text-gray-800 mb-2">المنتجات</h1>
          <p className="text-gray-600">إدارة وعرض جميع منتجات المتجر</p>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-6 border border-blue-200">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-medium text-blue-800 mb-1">إجمالي المنتجات</h3>
                <p className="text-2xl font-bold text-blue-900">
                  {statistics.totalProducts.toLocaleString('en-US')}
                </p>
                <p className="text-xs text-blue-600 mt-1">
                  منتج متاح
                </p>
              </div>
              <div className="p-3 bg-blue-200 rounded-full">
                <svg className="w-6 h-6 text-blue-800" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-6 border border-green-200">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-medium text-green-800 mb-1">قيمة المخزون الإجمالية</h3>
                <p className="text-2xl font-bold text-green-900">
                  {formatCurrency(statistics.totalStockValue)}
                </p>
                <p className="text-xs text-green-600 mt-1">
                  القيمة الإجمالية
                </p>
              </div>
              <div className="p-3 bg-green-200 rounded-full">
                <svg className="w-6 h-6 text-green-800" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 rounded-xl p-6 border border-yellow-200">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-medium text-yellow-800 mb-1">مخزون منخفض</h3>
                <p className="text-2xl font-bold text-yellow-900">
                  {statistics.lowStockCount.toLocaleString('en-US')}
                </p>
                <p className="text-xs text-yellow-600 mt-1">
                  منتج يحتاج تجديد
                </p>
              </div>
              <div className="p-3 bg-yellow-200 rounded-full">
                <svg className="w-6 h-6 text-yellow-800" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.864-.833-2.632 0L5.232 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-red-50 to-red-100 rounded-xl p-6 border border-red-200">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-medium text-red-800 mb-1">نفذ المخزون</h3>
                <p className="text-2xl font-bold text-red-900">
                  {statistics.outOfStockCount.toLocaleString('en-US')}
                </p>
                <p className="text-xs text-red-600 mt-1">
                  منتج غير متوفر
                </p>
              </div>
              <div className="p-3 bg-red-200 rounded-full">
                <svg className="w-6 h-6 text-red-800" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h2 className="text-lg font-semibold text-gray-800">قائمة المنتجات</h2>
              <p className="text-sm text-gray-600 mt-1">إدارة وعرض تفاصيل المنتجات</p>
            </div>
            <button
              className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-medium rounded-lg shadow-sm transition-all duration-200 transform hover:scale-105"
              onClick={() => navigate('/products/new')}
            >
              <svg className="w-5 h-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              إضافة منتج جديد
            </button>
          </div>

          <div className="p-6">
            {/* Search and Filter Controls */}
            <div className="mb-6 flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                    <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </div>
                  <input
                    type="text"
                    placeholder="البحث في المنتجات..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-4 pr-10 py-3 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors duration-200"
                  />
                  {searchTerm && (
                    <button
                      onClick={() => setSearchTerm('')}
                      className="absolute inset-y-0 left-0 pl-3 flex items-center hover:text-gray-600"
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
                  className="px-4 py-3 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white transition-colors duration-200"
                >
                  <option value="all">جميع الحقول</option>
                  <option value="sku">رمز المنتج</option>
                  <option value="name">الاسم</option>
                  <option value="category">الفئة</option>
                </select>
              </div>
            </div>

            {/* Results Count */}
            <div className="mb-4 flex justify-between items-center">
              <div className="text-sm text-gray-500">
                عرض {filteredProducts.length.toLocaleString('en-US')} من {products.length.toLocaleString('en-US')} منتج
              </div>
              {searchTerm && (
                <div className="text-sm text-blue-600">
                  نتائج البحث عن: "{searchTerm}"
                </div>
              )}
            </div>

            {/* Products Table */}
            <div className="overflow-x-auto rounded-lg border border-gray-200">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gradient-to-r from-gray-50 to-gray-100">
                  <tr>
                    <th scope="col" className="px-6 py-4 text-right text-xs font-medium text-gray-700 uppercase tracking-wider">
                      رمز المنتج
                    </th>
                    <th scope="col" className="px-6 py-4 text-right text-xs font-medium text-gray-700 uppercase tracking-wider">
                      الاسم
                    </th>
                    <th scope="col" className="px-6 py-4 text-right text-xs font-medium text-gray-700 uppercase tracking-wider">
                      الفئة
                    </th>
                    <th scope="col" className="px-6 py-4 text-right text-xs font-medium text-gray-700 uppercase tracking-wider">
                      الوحدة
                    </th>
                    <th scope="col" className="px-6 py-4 text-right text-xs font-medium text-gray-700 uppercase tracking-wider">
                      سعر التكلفة
                    </th>
                    <th scope="col" className="px-6 py-4 text-right text-xs font-medium text-gray-700 uppercase tracking-wider">
                      سعر البيع
                    </th>
                    <th scope="col" className="px-6 py-4 text-right text-xs font-medium text-gray-700 uppercase tracking-wider">
                      المخزون
                    </th>
                    <th scope="col" className="px-6 py-4 text-right text-xs font-medium text-gray-700 uppercase tracking-wider">
                      الإجراءات
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredProducts.length === 0 ? (
                    <tr>
                      <td colSpan="8" className="px-6 py-12 text-center">
                        <div className="flex flex-col items-center">
                          <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                          </svg>
                          <h3 className="mt-2 text-sm font-medium text-gray-900">
                            {searchTerm ? 'لا توجد منتجات تطابق معايير البحث' : 'لا توجد منتجات'}
                          </h3>
                          <p className="mt-1 text-sm text-gray-500">
                            {searchTerm ? 'جرب تغيير مصطلحات البحث' : 'ابدأ بإضافة منتج جديد'}
                          </p>
                          {!searchTerm && (
                            <div className="mt-6">
                              <button
                                onClick={() => navigate('/products/new')}
                                className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
                              >
                                إضافة منتج جديد
                              </button>
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  ) : (
                    filteredProducts.map((product) => {
                      const stock = parseInt(product.stock) || 0;
                      const stockStatus = getStockStatus(stock);

                      return (
                        <tr key={product.id} className="hover:bg-gray-50 transition-colors duration-150">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900">{product.sku}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900">{product.name}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getCategoryColor(product.category)}`}>
                              {product.category}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">{product.uom}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">
                              {formatCurrency(parseFloat(product.cost_price) || 0)}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900">
                              {formatCurrency(parseFloat(product.price) || 0)}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <div className={`w-2 h-2 rounded-full ml-2 ${stockStatus.indicator}`}></div>
                              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${stockStatus.color}`}>
                                {stock.toLocaleString('en-US')} - {stockStatus.text}
                              </span>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                            <div className="flex items-center space-x-3 space-x-reverse">
                              <button
                                className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md text-blue-700 bg-blue-100 hover:bg-blue-200 transition-colors duration-150"
                                onClick={() => navigate(`/products/${product.id}/edit`)}
                              >
                                <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                </svg>
                                تعديل
                              </button>
                              <button
                                className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md text-red-700 bg-red-100 hover:bg-red-200 transition-colors duration-150"
                                onClick={() => handleDelete(product.id)}
                              >
                                <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                                حذف
                              </button>
                              {product.category && product.category.toLowerCase().includes('elevator') && (
                                <button
                                  className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md text-purple-700 bg-purple-100 hover:bg-purple-200 transition-colors duration-150"
                                  onClick={() => handleViewComponents(product.id)}
                                >
                                  <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                                  </svg>
                                  المكونات
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Components Modal */}
        {componentsModalOpen && selectedProductComponents && (
          <div
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center px-4"
            onClick={closeComponentsModal}
          >
            <div
              className="relative w-full max-w-3xl bg-white rounded-3xl shadow-2xl p-6 md:p-8 max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={closeComponentsModal}
                className="absolute top-4 left-4 text-gray-400 hover:text-gray-600 focus:outline-none"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>

              <div className="mb-6" dir="rtl">
                <div className="flex items-center mb-4">
                  <svg className="w-8 h-8 text-blue-600 ml-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                  </svg>
                  <div>
                    <h3 className="text-2xl font-bold text-gray-800">{selectedProductComponents.product_name}</h3>
                    <p className="text-sm text-gray-500 mt-1">الكود: {selectedProductComponents.product_sku}</p>
                  </div>
                </div>
              </div>

              <div className="space-y-6" dir="rtl">
                {/* Current Stock Card */}
                <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl p-6 border border-green-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-lg font-semibold text-green-900 mb-1">المخزون الحالي</h4>
                      <p className="text-sm text-green-700">عدد المصاعد الكاملة المتوفرة</p>
                    </div>
                    <div className="text-right">
                      <p className="text-4xl font-bold text-green-900">
                        {selectedProductComponents.current_stock}
                      </p>
                      <p className="text-sm text-green-700 mt-1">وحدة</p>
                    </div>
                  </div>
                </div>

                {/* Sold Components Card */}
                <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-6 border-2 border-blue-200">
                  <h4 className="text-lg font-semibold text-blue-900 mb-4 flex items-center">
                    <svg className="w-6 h-6 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                    </svg>
                    المكونات المباعة
                  </h4>

                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    <div className="bg-white rounded-lg p-4 border border-purple-200">
                      <p className="text-xs text-gray-600 mb-1">السكاشن</p>
                      <p className="text-2xl font-bold text-purple-700">
                        {selectedProductComponents.sold_components.sections}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">قطعة</p>
                    </div>

                    <div className="bg-white rounded-lg p-4 border border-green-200">
                      <p className="text-xs text-gray-600 mb-1">الكيبل</p>
                      <p className="text-2xl font-bold text-green-700">
                        {selectedProductComponents.sold_components.cable_meters.toFixed(1)}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">متر</p>
                    </div>

                    <div className="bg-white rounded-lg p-4 border border-yellow-200">
                      <p className="text-xs text-gray-600 mb-1">الكابينات</p>
                      <p className="text-2xl font-bold text-yellow-700">
                        {selectedProductComponents.sold_components.cabins}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">كابينة</p>
                    </div>

                    <div className="bg-white rounded-lg p-4 border border-pink-200">
                      <p className="text-xs text-gray-600 mb-1">الأبواب</p>
                      <p className="text-2xl font-bold text-pink-700">
                        {selectedProductComponents.sold_components.doors}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">باب</p>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end pt-4">
                  <button
                    onClick={closeComponentsModal}
                    className="px-6 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-blue-700 text-white font-medium hover:from-blue-700 hover:to-blue-800 transition-all duration-200 shadow-sm"
                  >
                    إغلاق
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default Products;
