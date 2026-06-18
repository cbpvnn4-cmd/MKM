import React, { useState, useEffect, useMemo } from 'react';
import Layout from '../components/Layout';
import { Link, useNavigate } from 'react-router-dom';
import { getStockMovements, deleteStockMovement, getProducts, getWarehouses } from '../services/api';
import StockMovementForm from '../components/StockMovementForm';
import { checkAPIHealth } from '../utils/apiHealthCheck2';
import { useToast } from '../components/ui/Toast';
import { useConfirmations } from '../components/ui/ConfirmDialog';

const formatNumber = (value = 0) =>
  new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 }).format(value ?? 0);

const StockMovements = () => {
  const navigate = useNavigate();
  const { success, error: toastError } = useToast();
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
  const [showForm, setShowForm] = useState(false);
  const [editingMovement, setEditingMovement] = useState(null);
  const [connectionStatus, setConnectionStatus] = useState('unknown');

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

      // Fetch all data with better error handling
      const [movementsData, productsData, warehousesData] = await Promise.all([
        getStockMovements().catch(err => {
          console.error('Error fetching stock movements:', err);
          return [];
        }),
        getProducts().catch(err => {
          console.error('Error fetching products:', err);
          return [];
        }),
        getWarehouses().catch(err => {
          console.error('Error fetching warehouses:', err);
          return [];
        })
      ]);

      setStockMovements(Array.isArray(movementsData) ? movementsData : []);
      setProducts(Array.isArray(productsData) ? productsData : []);
      setWarehouses(Array.isArray(warehousesData) ? warehousesData : []);

      // Show warning if some data failed to load
      if (!Array.isArray(movementsData) || movementsData.length === 0) {
        console.warn('No stock movements loaded');
      }
    } catch (err) {
      const errorMessage = err.response?.data?.detail || err.message || 'فشل في تحميل البيانات';
      setError(errorMessage);
      console.error('Error fetching data:', err);
      // Set empty arrays to prevent crashes
      setStockMovements([]);
      setProducts([]);
      setWarehouses([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchStockMovements = fetchData;

  const handleDelete = async (id) => {
    const confirmed = await confirmDelete('حركة المخزون');
    if (!confirmed) return;

    try {
      await deleteStockMovement(id);
      success('تم حذف حركة المخزون بنجاح');
      fetchStockMovements();
    } catch (err) {
      toastError('تعذر حذف حركة المخزون. حاول مرة أخرى لاحقًا.');
      console.error('Error deleting stock movement:', err);
    }
  };

  const handleAddNew = () => {
    setEditingMovement(null);
    setShowForm(true);
  };

  const handleEdit = (movement) => {
    setEditingMovement(movement);
    setShowForm(true);
  };

  const handleSave = async (savedMovement) => {
    setShowForm(false);
    setEditingMovement(null);
    fetchStockMovements();
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditingMovement(null);
  };

  // Helper functions to get names
  const getProductName = (productId) => {
    if (!productId) return 'غير محدد';
    const product = products.find(p => p.id === productId);
    return product ? product.name : `منتج #${productId}`;
  };

  const getWarehouseName = (warehouseId) => {
    if (!warehouseId) return 'غير محدد';
    const warehouse = warehouses.find(w => w.id === warehouseId);
    return warehouse ? warehouse.name : `مستودع #${warehouseId}`;
  };

  // Calculate statistics
  const movementStats = useMemo(() => {
    if (!stockMovements.length) {
      return {
        total: 0,
        inbound: 0,
        outbound: 0,
        adjustments: 0,
        totalValue: 0,
        lastMovementDate: null
      };
    }

    const stats = stockMovements.reduce((acc, movement) => {
      const movementType = movement.movement_type || movement.movementType || '';
      const quantity = movement.quantity || 0;
      const unitCost = movement.unit_cost || movement.unitCost || 0;

      if (movementType === 'IN') {
        acc.inbound += 1;
        acc.totalValue += quantity * unitCost;
      } else if (movementType === 'OUT') {
        acc.outbound += 1;
        acc.totalValue += quantity * unitCost;
      } else if (movementType === 'ADJUST') {
        acc.adjustments += 1;
      }

      const movementDate = new Date(movement.movement_date || movement.movementDate);
      if (!acc.lastMovementDate || movementDate > acc.lastMovementDate) {
        acc.lastMovementDate = movementDate;
      }

      return acc;
    }, {
      inbound: 0,
      outbound: 0,
      adjustments: 0,
      totalValue: 0,
      lastMovementDate: null
    });

    return {
      total: stockMovements.length,
      ...stats
    };
  }, [stockMovements]);

  // Filter and search stock movements
  const filteredStockMovements = useMemo(() => {
    let result = stockMovements;

    // Apply movement type filter
    if (movementTypeFilter !== 'all') {
      result = result.filter(movement => movement.movement_type === movementTypeFilter);
    }

    // Apply warehouse filter
    if (warehouseFilter !== 'all') {
      result = result.filter(movement => movement.warehouse_id === parseInt(warehouseFilter));
    }

    // Apply search term
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();

      const productName = (movement) => getProductName(movement.product_id).toLowerCase();
      const warehouseName = (movement) => getWarehouseName(movement.warehouse_id).toLowerCase();
      const referenceNo = (movement) => (movement.reference_no || '').toLowerCase();
      const notes = (movement) => (movement.notes || '').toLowerCase();

      switch (filterField) {
        case 'product':
          result = result.filter(movement => productName(movement).includes(searchLower));
          break;
        case 'warehouse':
          result = result.filter(movement => warehouseName(movement).includes(searchLower));
          break;
        case 'reference':
          result = result.filter(movement => referenceNo(movement).includes(searchLower));
          break;
        case 'notes':
          result = result.filter(movement => notes(movement).includes(searchLower));
          break;
        default:
          // Search all fields
          result = result.filter(movement =>
            productName(movement).includes(searchLower) ||
            warehouseName(movement).includes(searchLower) ||
            referenceNo(movement).includes(searchLower) ||
            notes(movement).includes(searchLower)
          );
      }
    }

    // Sort by movement date (most recent first)
    return result.sort((a, b) => {
      if (!a || !b || !a.movement_date || !b.movement_date) return 0;
      return new Date(b.movement_date) - new Date(a.movement_date);
    });
  }, [stockMovements, searchTerm, filterField, movementTypeFilter, warehouseFilter, products, warehouses]);

  const statCards = useMemo(
    () => [
      {
        title: 'إجمالي الحركات',
        value: formatNumber(movementStats.total),
        subtitle: 'جميع حركات المخزون المسجلة',
        gradient: 'from-blue-50 to-blue-100',
        border: 'border-blue-200',
        iconBg: 'bg-blue-200',
        iconColor: 'text-blue-800',
        icon: 'M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2',
      },
      {
        title: 'حركات الوارد',
        value: formatNumber(movementStats.inbound),
        subtitle: 'إجمالي المواد الواردة للمخزون',
        gradient: 'from-emerald-50 to-emerald-100',
        border: 'border-emerald-200',
        iconBg: 'bg-emerald-200',
        iconColor: 'text-emerald-800',
        icon: 'M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4',
      },
      {
        title: 'حركات الصادر',
        value: formatNumber(movementStats.outbound),
        subtitle: 'إجمالي المواد الصادرة من المخزون',
        gradient: 'from-rose-50 to-rose-100',
        border: 'border-rose-200',
        iconBg: 'bg-rose-200',
        iconColor: 'text-rose-800',
        icon: 'M17 8V20M17 20L21 16M17 20L13 16M7 4V16M7 16L3 12M7 16L11 12',
      },
      {
        title: 'التسويات',
        value: formatNumber(movementStats.adjustments),
        subtitle: 'عمليات التسوية والجرد',
        gradient: 'from-amber-50 to-amber-100',
        border: 'border-amber-200',
        iconBg: 'bg-amber-200',
        iconColor: 'text-amber-800',
        icon: 'M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z',
      },
    ],
    [movementStats]
  );

  const stockSections = [
    {
      title: 'المنتجات',
      description: 'إدارة المنتجات والمواد في المخزون',
      path: '/products',
      bgGradient: 'from-indigo-50 to-indigo-100',
      borderColor: 'border-indigo-200',
      iconBg: 'bg-indigo-200',
      iconColor: 'text-indigo-800',
      icon: 'M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4',
    },
    {
      title: 'المستودعات',
      description: 'مراجعة وإدارة المستودعات والمخازن',
      path: '/warehouses',
      bgGradient: 'from-purple-50 to-purple-100',
      borderColor: 'border-purple-200',
      iconBg: 'bg-purple-200',
      iconColor: 'text-purple-800',
      icon: 'M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4',
    },
    {
      title: 'طلبات الشراء',
      description: 'متابعة طلبات الشراء وتأثيرها على المخزون',
      path: '/purchase-orders',
      bgGradient: 'from-cyan-50 to-cyan-100',
      borderColor: 'border-cyan-200',
      iconBg: 'bg-cyan-200',
      iconColor: 'text-cyan-800',
      icon: 'M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z',
    },
    {
      title: 'تقارير المخزون',
      description: 'تحليل شامل لحالة المخزون والحركات',
      path: '/reports/inventory',
      bgGradient: 'from-teal-50 to-teal-100',
      borderColor: 'border-teal-200',
      iconBg: 'bg-teal-200',
      iconColor: 'text-teal-800',
      icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z',
    },
  ];

  const renderMovementTypeBadge = (type) => {
    const badges = {
      'IN': {
        style: 'border-emerald-200 bg-emerald-50 text-emerald-700',
        text: 'وارد',
        icon: '↓'
      },
      'OUT': {
        style: 'border-rose-200 bg-rose-50 text-rose-700',
        text: 'صادر',
        icon: '↑'
      },
      'ADJUST': {
        style: 'border-amber-200 bg-amber-50 text-amber-700',
        text: 'تسوية',
        icon: '⚖'
      }
    };

    const badge = badges[type] || {
      style: 'border-gray-200 bg-gray-50 text-gray-700',
      text: type,
      icon: '•'
    };

    return (
      <span className={`inline-flex items-center px-3 py-1 text-xs font-medium rounded-full border ${badge.style}`}>
        <span className="ml-1">{badge.icon}</span>
        {badge.text}
      </span>
    );
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
        </div>
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout>
        <div className="space-y-4">
          <div className="bg-white rounded-xl shadow-sm border border-rose-200 p-6">
            <h2 className="text-xl font-semibold text-rose-700 mb-2">حدث خطأ</h2>
            <p className="text-rose-600 mb-4">{error}</p>
            <button
              onClick={fetchData}
              className="inline-flex items-center px-4 py-2 rounded-lg bg-rose-600 text-white hover:bg-rose-700 transition-colors"
            >
              إعادة المحاولة
            </button>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">إدارة حركات المخزون</h1>
          <p className="text-gray-600">
            متابعة شاملة لحركات المخزون الواردة والصادرة والتسويات
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
          {statCards.map((card) => (
            <div
              key={card.title}
              className={`relative overflow-hidden bg-gradient-to-br ${card.gradient} rounded-xl p-6 border ${card.border} shadow-sm`}
            >
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-sm font-medium text-gray-600 mb-1">{card.title}</h3>
                  <p className="text-3xl font-bold text-gray-900">{card.value}</p>
                  <p className="text-xs text-gray-500 mt-2">{card.subtitle}</p>
                </div>
                <div className={`flex-shrink-0 ${card.iconBg} p-3 rounded-xl`}>
                  <svg
                    className={`w-6 h-6 ${card.iconColor}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={card.icon} />
                  </svg>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-3 text-sm text-gray-600">
            <span className="inline-flex items-center px-3 py-1 rounded-full bg-blue-100 text-blue-700">
              {formatNumber(filteredStockMovements.length)} حركة
            </span>
            <span className="text-gray-400">
              من أصل {formatNumber(stockMovements.length)}
            </span>
          </div>
          <div className="flex flex-wrap gap-3">
            <button
              onClick={handleAddNew}
              className="inline-flex items-center px-5 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white font-medium rounded-lg shadow hover:from-blue-700 hover:to-blue-800 transition-transform transform hover:-translate-y-0.5"
            >
              <svg className="w-5 h-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v12m6-6H6" />
              </svg>
              إضافة حركة جديدة
            </button>
            <Link
              to="/products"
              className="inline-flex items-center px-5 py-3 border border-blue-200 text-blue-700 font-medium rounded-lg hover:border-blue-300 hover:bg-blue-50 transition-colors"
            >
              إدارة المنتجات
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
          {stockSections.map((section) => (
            <Link
              key={section.title}
              to={section.path}
              className={`block bg-gradient-to-br ${section.bgGradient} rounded-xl p-6 border ${section.borderColor} hover:shadow-lg transform hover:-translate-y-1 transition-all duration-200`}
            >
              <div className="flex items-start gap-4 flex-row-reverse">
                <div className={`flex-shrink-0 ${section.iconBg} p-3 rounded-lg`}>
                  <svg
                    className={`w-6 h-6 ${section.iconColor}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={section.icon} />
                  </svg>
                </div>
                <div className="text-right">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">{section.title}</h3>
                  <p className="text-sm text-gray-600 mb-3">{section.description}</p>
                  <span className="text-sm text-blue-600 font-medium flex items-center justify-end">
                    إدارة
                    <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="px-6 py-5 border-b border-gray-200 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-gray-800">سجل حركات المخزون</h2>
              <p className="text-sm text-gray-500">
                استخدم البحث السريع لتصفية الحركات حسب المنتج أو المخزن أو النوع
              </p>
            </div>
            <button
              onClick={fetchData}
              className="inline-flex items-center px-4 py-2 text-sm text-blue-600 border border-blue-100 rounded-lg hover:bg-blue-50 transition-colors"
            >
              <svg className="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 4v5h.582M20 20v-5h-.581M5.063 9A7.002 7.002 0 0112 5c2.003 0 3.814.83 5.117 2.166M18.937 15A7.002 7.002 0 0112 19a6.992 6.992 0 01-5.117-2.166"
                />
              </svg>
              تحديث البيانات
            </button>
          </div>

          <div className="px-6 py-5 border-b border-gray-200">
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
              <div className="lg:col-span-5">
                <div className="relative">
                  <input
                    type="text"
                    placeholder="ابحث في المنتجات، المخازن، أو رقم المرجع..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full px-4 py-3 pr-11 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-right"
                  />
                  {searchTerm && (
                    <button
                      onClick={() => setSearchTerm('')}
                      className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-400 hover:text-gray-600"
                    >
                      <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  )}
                  <span className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 pointer-events-none">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M11 5a6 6 0 016 6m-6 6a6 6 0 110-12" />
                    </svg>
                  </span>
                </div>
              </div>
              <div className="lg:col-span-3">
                <select
                  value={filterField}
                  onChange={(e) => setFilterField(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-right bg-white"
                >
                  <option value="all">جميع الحقول</option>
                  <option value="product">المنتج</option>
                  <option value="warehouse">المخزن</option>
                  <option value="reference">رقم المرجع</option>
                </select>
              </div>
              <div className="lg:col-span-4">
                <select
                  value={movementTypeFilter}
                  onChange={(e) => setMovementTypeFilter(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-right bg-white"
                >
                  <option value="all">جميع أنواع الحركات</option>
                  <option value="IN">↓ وارد</option>
                  <option value="OUT">↑ صادر</option>
                  <option value="ADJUST">⚖ تسوية</option>
                </select>
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th
                    scope="col"
                    className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    المنتج
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    المخزن
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    نوع الحركة
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    الكمية
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    سعر الوحدة
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    رقم المرجع
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    التاريخ
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    الإجراءات
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredStockMovements.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-6 py-10 text-center text-sm text-gray-500">
                      {searchTerm || movementTypeFilter !== 'all'
                        ? 'لا توجد نتائج مطابقة لمعايير البحث الحالية'
                        : 'لم يتم تسجيل أي حركات مخزون حتى الآن'}
                    </td>
                  </tr>
                ) : (
                  filteredStockMovements.map((movement) => {
                    const movementType = movement.movement_type || movement.movementType;
                    const product = movement.product || products.find(p => p.id === movement.product_id);
                    const warehouse = movement.warehouse || warehouses.find(w => w.id === movement.warehouse_id);

                    return (
                      <tr key={movement.id}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          <div className="flex flex-col items-start space-y-1">
                            <span className="font-medium">{product?.name || getProductName(movement.product_id)}</span>
                            {product?.sku && (
                              <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded">
                                {product.sku}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {warehouse?.name || getWarehouseName(movement.warehouse_id)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-center">
                          {renderMovementTypeBadge(movementType)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-center text-sm font-semibold text-gray-900">
                          {formatNumber(movement.quantity)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-center text-sm font-semibold text-green-600">
                          ${formatNumber(movement.unit_cost || movement.unitCost)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {movement.reference_no || movement.referenceNo || '—'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-center text-sm text-gray-500">
                          {movement.movement_date ?
                            new Date(movement.movement_date).toLocaleDateString('en-US', {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric'
                            }) : '—'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <div className="flex items-center gap-3">
                            <button
                              onClick={() => movement.id && navigate(`/stock-movements/${movement.id}`)}
                              className="text-blue-600 hover:text-blue-800"
                            >
                              عرض
                            </button>
                            <button
                              onClick={() => movement.id && handleDelete(movement.id)}
                              className="text-rose-600 hover:text-rose-800"
                            >
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
        </div>
      </div>

      {/* Stock Movement Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-gray-900 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-11/12 md:w-3/4 lg:w-1/2 shadow-lg rounded-md bg-white">
            <StockMovementForm
              movement={editingMovement}
              products={products}
              warehouses={warehouses}
              onSave={handleSave}
              onCancel={handleCancel}
            />
          </div>
        </div>
      )}
    </Layout>
  );
};

export default StockMovements;
