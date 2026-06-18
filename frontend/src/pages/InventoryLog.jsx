import React, { useState, useEffect, useMemo } from 'react';
import Layout from '../components/Layout';
import { getStockMovements, deleteStockMovement, getProducts, getWarehouses } from '../services/api';
import { useNavigate } from 'react-router-dom';
import { checkAPIHealth } from '../utils/apiHealthCheck2';
import { useToast } from '../components/ui/Toast';
import { useConfirmations } from '../components/ui/ConfirmDialog';

const InventoryLog = () => {
  const { confirmDelete } = useConfirmations();
  const [stockMovements, setStockMovements] = useState([]);
  const [products, setProducts] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterField, setFilterField] = useState('all');
  const [movementTypeFilter, setMovementTypeFilter] = useState('all');
  const [warehouseFilter, setWarehouseFilter] = useState('all');
  const [connectionStatus, setConnectionStatus] = useState('unknown');

  const navigate = useNavigate();

  useEffect(() => {
    fetchData();
  }, []);

  const testConnection = async () => {
    try {
      const healthCheck = await checkAPIHealth();
      setConnectionStatus(healthCheck.backendStatus);
      return healthCheck;
    } catch (err) {
      setConnectionStatus('disconnected');
      return { backendStatus: 'disconnected', errors: [{ error: err.message }] };
    }
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      // First, check connection
      const healthCheck = await testConnection();

      if (healthCheck.backendStatus === 'disconnected') {
        setError('لا يمكن الاتصال بالخادم. تأكد من تشغيل الخادم الخلفي على المنفذ 8000');
        setStockMovements([]);
        setProducts([]);
        setWarehouses([]);
        return;
      }

      // Fetch data with individual error handling
      const [movementsData, productsData, warehousesData] = await Promise.allSettled([
        getStockMovements(),
        getProducts(),
        getWarehouses()
      ]);

      // Handle stock movements
      if (movementsData.status === 'fulfilled') {
        setStockMovements(movementsData.value || []);
      } else {
        console.error('Error fetching stock movements:', movementsData.reason);
        setStockMovements([]);
      }

      // Handle products
      if (productsData.status === 'fulfilled') {
        setProducts(productsData.value || []);
      } else {
        console.error('Error fetching products:', productsData.reason);
        setProducts([]);
      }

      // Handle warehouses
      if (warehousesData.status === 'fulfilled') {
        setWarehouses(warehousesData.value || []);
      } else {
        console.error('Error fetching warehouses:', warehousesData.reason);
        setWarehouses([]);
      }

      // Set error only if all requests failed
      if (movementsData.status === 'rejected' && productsData.status === 'rejected' && warehousesData.status === 'rejected') {
        const errorMsg = movementsData.reason?.message || 'فشل في جلب بيانات سجل المخزون';
        setError(errorMsg);
      }

    } catch (err) {
      setError('خطأ في الاتصال بالخادم: ' + err.message);
      console.error('خطأ في جلب بيانات سجل المخزون:', err);
      setStockMovements([]);
      setProducts([]);
      setWarehouses([]);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    const confirmed = await confirmDelete('هل أنت متأكد من أنك تريد حذف هذه الحركة من سجل المخزون؟');
    if (confirmed) {
      try {
        await deleteStockMovement(id);
        fetchData(); // Refresh the list
      } catch (err) {
        setError('فشل في حذف حركة المخزون');
        console.error('خطأ في حذف حركة المخزون:', err);
      }
    }
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

  // Format date
  const formatDate = (dateString) => {
    if (!dateString) return '';
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    }).format(new Date(dateString));
  };

  // Get movement type display and color
  const getMovementTypeDisplay = (type) => {
    const types = {
      'IN': { text: 'إدخال', color: 'bg-green-100 text-green-800', indicator: 'bg-green-500' },
      'OUT': { text: 'إخراج', color: 'bg-red-100 text-red-800', indicator: 'bg-red-500' },
      'ADJUST': { text: 'تعديل', color: 'bg-blue-100 text-blue-800', indicator: 'bg-blue-500' }
    };
    return types[type] || { text: type, color: 'bg-gray-100 text-gray-800', indicator: 'bg-gray-500' };
  };

  // Get product name by id
  const getProductName = (productId) => {
    if (!productId) return 'غير محدد';
    const product = products.find(p => p.id === productId);
    return product ? product.name : `منتج #${productId}`;
  };

  // Get warehouse name by id
  const getWarehouseName = (warehouseId) => {
    if (!warehouseId) return 'غير محدد';
    const warehouse = warehouses.find(w => w.id === warehouseId);
    return warehouse ? warehouse.name : `مستودع #${warehouseId}`;
  };

  // Calculate statistics
  const statistics = useMemo(() => {
    if (!Array.isArray(stockMovements)) {
      return { totalMovements: 0, inMovements: 0, outMovements: 0, adjustments: 0, totalValue: 0 };
    }

    const totalMovements = stockMovements.length;
    const inMovements = stockMovements.filter(m => m && m.movement_type === 'IN').length;
    const outMovements = stockMovements.filter(m => m && m.movement_type === 'OUT').length;
    const adjustments = stockMovements.filter(m => m && m.movement_type === 'ADJUST').length;

    const totalValue = stockMovements.reduce((sum, movement) => {
      if (!movement) return sum;
      const cost = parseFloat(movement.unit_cost) || 0;
      const quantity = parseFloat(movement.quantity) || 0;
      return sum + (cost * quantity);
    }, 0);

    return { totalMovements, inMovements, outMovements, adjustments, totalValue };
  }, [stockMovements]);

  // Filter and search movements
  const filteredMovements = useMemo(() => {
    if (!Array.isArray(stockMovements)) {
      return [];
    }

    let filtered = stockMovements.filter(movement => movement != null);

    // Filter by movement type
    if (movementTypeFilter !== 'all') {
      filtered = filtered.filter(movement => movement && movement.movement_type === movementTypeFilter);
    }

    // Filter by warehouse
    if (warehouseFilter !== 'all') {
      filtered = filtered.filter(movement => movement && movement.warehouse_id === parseInt(warehouseFilter));
    }

    // Search filter
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();

      filtered = filtered.filter(movement => {
        if (!movement) return false;

        const productName = getProductName(movement.product_id).toLowerCase();
        const warehouseName = getWarehouseName(movement.warehouse_id).toLowerCase();
        const referenceNo = (movement.reference_no || '').toLowerCase();
        const notes = (movement.notes || '').toLowerCase();

        switch (filterField) {
          case 'product':
            return productName.includes(searchLower);
          case 'warehouse':
            return warehouseName.includes(searchLower);
          case 'reference':
            return referenceNo.includes(searchLower);
          case 'notes':
            return notes.includes(searchLower);
          default:
            // Search all fields
            return (
              productName.includes(searchLower) ||
              warehouseName.includes(searchLower) ||
              referenceNo.includes(searchLower) ||
              notes.includes(searchLower)
            );
        }
      });
    }

    // Sort by movement date (most recent first)
    return filtered.sort((a, b) => {
      if (!a || !b || !a.movement_date || !b.movement_date) return 0;
      return new Date(b.movement_date) - new Date(a.movement_date);
    });
  }, [stockMovements, searchTerm, filterField, movementTypeFilter, warehouseFilter, products, warehouses]);

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
            <h1 className="text-3xl font-bold text-gray-800 mb-2">سجل المخزون</h1>
            <p className="text-gray-600">عرض وإدارة حركات المخزون وتفاصيلها</p>
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
                  <div className="mt-3 text-sm">
                    <p className="font-medium">خطوات الإصلاح:</p>
                    <ul className="list-disc list-inside mt-2 space-y-1">
                      <li>تأكد من تشغيل الخادم الخلفي: <code className="bg-red-200 px-1 rounded">python main.py</code></li>
                      <li>تحقق من المنفذ 8000: <a href="http://localhost:8000/health" target="_blank" rel="noopener noreferrer" className="text-red-800 underline hover:text-red-900">http://localhost:8000/health</a></li>
                      <li>راجع وحدة التحكم للأخطاء التفصيلية</li>
                      <li>تأكد من تثبيت المكتبات المطلوبة</li>
                    </ul>
                  </div>
                </div>
                <div className="mt-4">
                  <button
                    onClick={fetchData}
                    className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-red-700 bg-red-100 hover:bg-red-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                  >
                    إعادة المحاولة
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Show partial data if available */}
          {(stockMovements.length > 0 || products.length > 0 || warehouses.length > 0) && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-yellow-800">
                    تم تحميل بعض البيانات فقط
                  </h3>
                  <div className="mt-2 text-sm text-yellow-700">
                    <ul className="list-disc list-inside space-y-1">
                      <li>حركات المخزون: {stockMovements.length} حركة</li>
                      <li>المنتجات: {products.length} منتج</li>
                      <li>المستودعات: {warehouses.length} مستودع</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">سجل المخزون</h1>
          <p className="text-gray-600">عرض وإدارة حركات المخزون وتفاصيلها</p>

          {/* Status indicators */}
          <div className="flex items-center justify-between mt-4">
            <div className="flex items-center space-x-4 space-x-reverse">
              <div className="flex items-center">
                <div className={`w-3 h-3 rounded-full ml-2 ${stockMovements.length > 0 ? 'bg-green-500' : 'bg-gray-400'}`}></div>
                <span className="text-sm text-gray-600">حركات المخزون ({stockMovements.length})</span>
              </div>
              <div className="flex items-center">
                <div className={`w-3 h-3 rounded-full ml-2 ${products.length > 0 ? 'bg-green-500' : 'bg-gray-400'}`}></div>
                <span className="text-sm text-gray-600">المنتجات ({products.length})</span>
              </div>
              <div className="flex items-center">
                <div className={`w-3 h-3 rounded-full ml-2 ${warehouses.length > 0 ? 'bg-green-500' : 'bg-gray-400'}`}></div>
                <span className="text-sm text-gray-600">المستودعات ({warehouses.length})</span>
              </div>
            </div>

            {/* Connection Status */}
            <div className="flex items-center">
              <div className={`w-3 h-3 rounded-full ml-2 animate-pulse ${
                connectionStatus === 'connected' ? 'bg-green-500' :
                connectionStatus === 'disconnected' ? 'bg-red-500' : 'bg-yellow-500'
              }`}></div>
              <span className={`text-sm font-medium ${
                connectionStatus === 'connected' ? 'text-green-600' :
                connectionStatus === 'disconnected' ? 'text-red-600' : 'text-yellow-600'
              }`}>
                {connectionStatus === 'connected' ? 'متصل' :
                 connectionStatus === 'disconnected' ? 'غير متصل' : 'جاري التحقق...'}
              </span>
              <button
                onClick={fetchData}
                className="mr-2 p-1 text-gray-400 hover:text-gray-600 transition-colors"
                title="إعادة فحص الاتصال"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </button>
            </div>
          </div>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
          <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-6 border border-blue-200">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-medium text-blue-800 mb-1">إجمالي الحركات</h3>
                <p className="text-2xl font-bold text-blue-900">
                  {statistics.totalMovements.toLocaleString('en-US')}
                </p>
                <p className="text-xs text-blue-600 mt-1">
                  حركة مخزون
                </p>
              </div>
              <div className="p-3 bg-blue-200 rounded-full">
                <svg className="w-6 h-6 text-blue-800" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-6 border border-green-200">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-medium text-green-800 mb-1">حركات الإدخال</h3>
                <p className="text-2xl font-bold text-green-900">
                  {statistics.inMovements.toLocaleString('en-US')}
                </p>
                <p className="text-xs text-green-600 mt-1">
                  إدخال للمخزون
                </p>
              </div>
              <div className="p-3 bg-green-200 rounded-full">
                <svg className="w-6 h-6 text-green-800" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-red-50 to-red-100 rounded-xl p-6 border border-red-200">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-medium text-red-800 mb-1">حركات الإخراج</h3>
                <p className="text-2xl font-bold text-red-900">
                  {statistics.outMovements.toLocaleString('en-US')}
                </p>
                <p className="text-xs text-red-600 mt-1">
                  إخراج من المخزون
                </p>
              </div>
              <div className="p-3 bg-red-200 rounded-full">
                <svg className="w-6 h-6 text-red-800" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl p-6 border border-purple-200">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-medium text-purple-800 mb-1">حركات التعديل</h3>
                <p className="text-2xl font-bold text-purple-900">
                  {statistics.adjustments.toLocaleString('en-US')}
                </p>
                <p className="text-xs text-purple-600 mt-1">
                  تعديل المخزون
                </p>
              </div>
              <div className="p-3 bg-purple-200 rounded-full">
                <svg className="w-6 h-6 text-purple-800" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-xl p-6 border border-orange-200">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-medium text-orange-800 mb-1">إجمالي القيمة</h3>
                <p className="text-2xl font-bold text-orange-900">
                  {formatCurrency(statistics.totalValue)}
                </p>
                <p className="text-xs text-orange-600 mt-1">
                  قيمة الحركات
                </p>
              </div>
              <div className="p-3 bg-orange-200 rounded-full">
                <svg className="w-6 h-6 text-orange-800" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h2 className="text-lg font-semibold text-gray-800">حركات المخزون</h2>
              <p className="text-sm text-gray-600 mt-1">عرض وإدارة تفاصيل حركات المخزون</p>
            </div>
            <button
              className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-medium rounded-lg shadow-sm transition-all duration-200 transform hover:scale-105"
              onClick={() => navigate('/stock-movements')}
            >
              <svg className="w-5 h-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              إدارة حركات المخزون
            </button>
          </div>

          <div className="p-6">
            {/* Search and Filter Controls */}
            <div className="mb-6 flex flex-col lg:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                    <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </div>
                  <input
                    type="text"
                    placeholder="البحث في سجل المخزون..."
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

              <div className="flex gap-4">
                <select
                  value={filterField}
                  onChange={(e) => setFilterField(e.target.value)}
                  className="px-4 py-3 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white transition-colors duration-200"
                >
                  <option value="all">جميع الحقول</option>
                  <option value="product">المنتج</option>
                  <option value="warehouse">المستودع</option>
                  <option value="reference">رقم المرجع</option>
                  <option value="notes">الملاحظات</option>
                </select>

                <select
                  value={movementTypeFilter}
                  onChange={(e) => setMovementTypeFilter(e.target.value)}
                  className="px-4 py-3 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white transition-colors duration-200"
                >
                  <option value="all">جميع الأنواع</option>
                  <option value="IN">إدخال</option>
                  <option value="OUT">إخراج</option>
                  <option value="ADJUST">تعديل</option>
                </select>

                <select
                  value={warehouseFilter}
                  onChange={(e) => setWarehouseFilter(e.target.value)}
                  className="px-4 py-3 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white transition-colors duration-200"
                >
                  <option value="all">جميع المستودعات</option>
                  {warehouses.map((warehouse) => (
                    <option key={warehouse.id} value={warehouse.id}>
                      {warehouse.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Results Count */}
            <div className="mb-4 flex justify-between items-center">
              <div className="text-sm text-gray-500">
                عرض {filteredMovements.length.toLocaleString('en-US')} من {stockMovements.length.toLocaleString('en-US')} حركة
              </div>
              {searchTerm && (
                <div className="text-sm text-blue-600">
                  نتائج البحث عن: "{searchTerm}"
                </div>
              )}
            </div>

            {/* Stock Movements Table */}
            <div className="overflow-x-auto rounded-lg border border-gray-200">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gradient-to-r from-gray-50 to-gray-100">
                  <tr>
                    <th scope="col" className="px-6 py-4 text-right text-xs font-medium text-gray-700 uppercase tracking-wider">
                      التاريخ
                    </th>
                    <th scope="col" className="px-6 py-4 text-right text-xs font-medium text-gray-700 uppercase tracking-wider">
                      رقم المرجع
                    </th>
                    <th scope="col" className="px-6 py-4 text-right text-xs font-medium text-gray-700 uppercase tracking-wider">
                      المنتج
                    </th>
                    <th scope="col" className="px-6 py-4 text-right text-xs font-medium text-gray-700 uppercase tracking-wider">
                      المستودع
                    </th>
                    <th scope="col" className="px-6 py-4 text-right text-xs font-medium text-gray-700 uppercase tracking-wider">
                      نوع الحركة
                    </th>
                    <th scope="col" className="px-6 py-4 text-right text-xs font-medium text-gray-700 uppercase tracking-wider">
                      الكمية
                    </th>
                    <th scope="col" className="px-6 py-4 text-right text-xs font-medium text-gray-700 uppercase tracking-wider">
                      تكلفة الوحدة
                    </th>
                    <th scope="col" className="px-6 py-4 text-right text-xs font-medium text-gray-700 uppercase tracking-wider">
                      إجمالي القيمة
                    </th>
                    <th scope="col" className="px-6 py-4 text-right text-xs font-medium text-gray-700 uppercase tracking-wider">
                      الإجراءات
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredMovements.length === 0 ? (
                    <tr>
                      <td colSpan="9" className="px-6 py-12 text-center">
                        <div className="flex flex-col items-center">
                          <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                          </svg>
                          <h3 className="mt-2 text-sm font-medium text-gray-900">
                            {searchTerm || movementTypeFilter !== 'all' || warehouseFilter !== 'all'
                              ? 'لا توجد حركات تطابق معايير البحث'
                              : 'لا توجد حركات مخزون'}
                          </h3>
                          <p className="mt-1 text-sm text-gray-500">
                            {searchTerm || movementTypeFilter !== 'all' || warehouseFilter !== 'all'
                              ? 'جرب تغيير معايير البحث والفلترة'
                              : 'ابدأ بإضافة حركة مخزون جديدة'}
                          </p>
                          {!searchTerm && movementTypeFilter === 'all' && warehouseFilter === 'all' && (
                            <div className="mt-6">
                              <button
                                onClick={() => navigate('/stock-movements')}
                                className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
                              >
                                إدارة حركات المخزون
                              </button>
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  ) : (
                    filteredMovements.map((movement) => {
                      const movementType = getMovementTypeDisplay(movement.movement_type);
                      const quantity = parseFloat(movement.quantity) || 0;
                      const unitCost = parseFloat(movement.unit_cost) || 0;
                      const totalValue = quantity * unitCost;

                      return (
                        <tr key={movement.id} className="hover:bg-gray-50 transition-colors duration-150">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900">
                              {formatDate(movement.movement_date)}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">{movement.reference_no || '-'}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900">
                              {getProductName(movement.product_id)}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">
                              {getWarehouseName(movement.warehouse_id)}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <div className={`w-2 h-2 rounded-full ml-2 ${movementType.indicator}`}></div>
                              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${movementType.color}`}>
                                {movementType.text}
                              </span>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900">
                              {quantity.toLocaleString('en-US', {
                                minimumFractionDigits: 0,
                                maximumFractionDigits: 3
                              })}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">
                              {formatCurrency(unitCost)}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900">
                              {formatCurrency(totalValue)}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                            <div className="flex items-center space-x-3 space-x-reverse">
                              <button
                                className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md text-blue-700 bg-blue-100 hover:bg-blue-200 transition-colors duration-150"
                                onClick={() => console.log(`عرض تفاصيل الحركة رقم: ${movement.id}`)}
                                title="عرض التفاصيل"
                              >
                                <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                </svg>
                                عرض
                              </button>
                              <button
                                className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md text-green-700 bg-green-100 hover:bg-green-200 transition-colors duration-150"
                                onClick={() => console.log(`تعديل الحركة رقم: ${movement.id}`)}
                                title="تعديل الحركة"
                              >
                                <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                </svg>
                                تعديل
                              </button>
                              <button
                                className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md text-red-700 bg-red-100 hover:bg-red-200 transition-colors duration-150"
                                onClick={() => handleDelete(movement.id)}
                                title="حذف الحركة"
                              >
                                <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                                حذف
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Notes section for movements with notes */}
            {filteredMovements.some(movement => movement.notes) && (
              <div className="mt-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">الملاحظات</h3>
                <div className="space-y-3">
                  {filteredMovements
                    .filter(movement => movement.notes)
                    .slice(0, 5) // Show only first 5 notes
                    .map((movement) => (
                      <div key={movement.id} className="flex items-start space-x-3 space-x-reverse p-3 bg-gray-50 rounded-lg">
                        <div className="flex-shrink-0">
                          <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
                          </svg>
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="text-sm text-gray-900">
                            <strong>{getProductName(movement.product_id)}</strong> - {formatDate(movement.movement_date)}
                          </div>
                          <p className="text-sm text-gray-500 mt-1">{movement.notes}</p>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default InventoryLog;
