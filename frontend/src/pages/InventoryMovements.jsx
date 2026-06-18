import React, { useState, useEffect, useMemo, useCallback } from 'react';
import Layout from '../components/Layout';

const movementTypeOptions = [
  { value: 'in', label: 'استلام' },
  { value: 'out', label: 'صرف' },
  { value: 'transfer', label: 'نقل' },
  { value: 'adjustment', label: 'تسوية' },
];

const sampleMovementsSeed = [
  {
    id: 1,
    date: '2025-09-23',
    type: 'in',
    typeLabel: 'استلام',
    product: 'مضخة مياه صناعية',
    productCode: 'PUMP-001',
    quantity: 10,
    warehouse: 'المخزن الرئيسي - الرياض',
    warehouseLocation: 'الرياض',
    reference: 'PO-001',
    referenceType: 'purchase_order',
    notes: 'استلام من طلب الشراء PO-001',
    user: 'أحمد محمد',
    currentStock: 35,
  },
  {
    id: 2,
    date: '2025-09-22',
    type: 'out',
    typeLabel: 'صرف',
    product: 'محرك كهربائي 5 حصان',
    productCode: 'MOTOR-005',
    quantity: -3,
    warehouse: 'مستودع قطع الغيار - جدة',
    warehouseLocation: 'جدة',
    reference: 'SO-015',
    referenceType: 'sales_order',
    notes: 'صرف للعميل ضمن طلب المبيعات SO-015',
    user: 'فاطمة أحمد',
    currentStock: 9,
  },
  {
    id: 3,
    date: '2025-09-21',
    type: 'transfer',
    typeLabel: 'نقل',
    product: 'أنابيب PVC قطر 6 بوصة',
    productCode: 'PIPE-006',
    quantity: 50,
    warehouse: 'مستودع المواد الخام - الدمام',
    warehouseLocation: 'الدمام',
    transferTo: 'المخزن الرئيسي - الرياض',
    reference: 'TR-003',
    referenceType: 'transfer',
    notes: 'نقل داخلي لدعم مشروع الرياض',
    user: 'خالد سعد',
    currentStock: 200,
  },
  {
    id: 4,
    date: '2025-09-20',
    type: 'adjustment',
    typeLabel: 'تسوية',
    product: 'صمام تحكم أوتوماتيكي',
    productCode: 'VALVE-AUTO',
    quantity: -2,
    warehouse: 'المخزن الرئيسي - الرياض',
    warehouseLocation: 'الرياض',
    reference: 'ADJ-001',
    referenceType: 'adjustment',
    notes: 'تسوية جرد بعد فحص دوري',
    user: 'سارة علي',
    currentStock: 6,
  },
  {
    id: 5,
    date: '2025-09-19',
    type: 'in',
    typeLabel: 'استلام',
    product: 'لوحة تحكم كهربائية',
    productCode: 'PANEL-CTRL',
    quantity: 8,
    warehouse: 'مخزن المشاريع - المدينة المنورة',
    warehouseLocation: 'المدينة المنورة',
    reference: 'PO-002',
    referenceType: 'purchase_order',
    notes: 'توريد دفعة أولى من المورد الرئيسي',
    user: 'محمد عبدالله',
    currentStock: 13,
  },
];

const warehousesSeed = [
  'المخزن الرئيسي - الرياض',
  'مستودع قطع الغيار - جدة',
  'مستودع المواد الخام - الدمام',
  'مخزن المشاريع - المدينة المنورة',
  'المخزن المؤقت - العفيف',
];

const InventoryMovements = () => {
  const [movements, setMovements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterField, setFilterField] = useState('all');
  const [filterType, setFilterType] = useState('all');
  const [filterWarehouse, setFilterWarehouse] = useState('all');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newMovementErrors, setNewMovementErrors] = useState({});

  const sampleMovements = useMemo(() => sampleMovementsSeed, []);
  const warehouses = useMemo(() => warehousesSeed, []);

  const buildNewMovementTemplate = useCallback(
    () => ({
      date: new Date().toISOString().split('T')[0],
      type: 'in',
      product: '',
      productCode: '',
      quantity: '1',
      warehouse: warehouses[0] || '',
      warehouseLocation: '',
      transferTo: '',
      reference: '',
      notes: '',
      user: '',
      currentStock: '',
    }),
    [warehouses]
  );

  const [newMovement, setNewMovement] = useState(() => buildNewMovementTemplate());

  useEffect(() => {
    const timer = setTimeout(() => {
      setMovements(sampleMovements);
      setLoading(false);
    }, 500);

    return () => clearTimeout(timer);
  }, [sampleMovements]);

  useEffect(() => {
    setNewMovement(prev => ({
      ...prev,
      warehouse: prev.warehouse || warehouses[0] || '',
    }));
  }, [warehouses]);

  const openCreateModal = () => {
    setNewMovement(buildNewMovementTemplate());
    setNewMovementErrors({});
    setIsCreateModalOpen(true);
  };

  const closeCreateModal = () => {
    setIsCreateModalOpen(false);
    setNewMovementErrors({});
  };

  const handleNewMovementChange = field => event => {
    const value = event.target.value;

    setNewMovement(prev => ({
      ...prev,
      [field]: value,
    }));

    setNewMovementErrors(prev => {
      if (!prev[field]) {
        return prev;
      }
      const updated = { ...prev };
      delete updated[field];
      return updated;
    });
  };

  const handleTypeChange = event => {
    const value = event.target.value;

    setNewMovement(prev => ({
      ...prev,
      type: value,
      transferTo: value === 'transfer' ? prev.transferTo : '',
    }));

    setNewMovementErrors(prev => {
      if (!prev.type && (value === 'transfer' || !prev.transferTo)) {
        return prev;
      }
      const updated = { ...prev };
      delete updated.type;
      if (value !== 'transfer') {
        delete updated.transferTo;
      }
      return updated;
    });
  };

  const validateNewMovement = useCallback(() => {
    const errors = {};

    if (!newMovement.product.trim()) {
      errors.product = 'يرجى إدخال اسم المنتج';
    }

    if (!newMovement.productCode.trim()) {
      errors.productCode = 'يرجى إدخال كود المنتج';
    }

    if (!newMovement.user.trim()) {
      errors.user = 'يرجى تحديد اسم المستخدم';
    }

    if (!newMovement.date) {
      errors.date = 'يرجى اختيار التاريخ';
    }

    if (!newMovement.warehouse) {
      errors.warehouse = 'يرجى اختيار المخزن';
    }

    const quantityValue = parseFloat(newMovement.quantity);
    if (Number.isNaN(quantityValue) || quantityValue <= 0) {
      errors.quantity = 'الكمية يجب أن تكون أكبر من صفر';
    }

    if (newMovement.type === 'transfer' && !newMovement.transferTo.trim()) {
      errors.transferTo = 'يرجى تحديد المخزن المحول إليه';
    }

    return errors;
  }, [newMovement]);

  const handleCreateMovement = event => {
    event.preventDefault();

    const errors = validateNewMovement();
    if (Object.keys(errors).length > 0) {
      setNewMovementErrors(errors);
      return;
    }

    const quantityValue = parseFloat(newMovement.quantity);
    const adjustedQuantity = newMovement.type === 'out' ? -Math.abs(quantityValue) : quantityValue;

    const existingMovement = movements.find(
      movement =>
        movement.productCode &&
        movement.productCode.toLowerCase() === newMovement.productCode.trim().toLowerCase()
    );

    const guessedCurrentStock = existingMovement
      ? existingMovement.currentStock + adjustedQuantity
      : adjustedQuantity;

    const parsedCurrentStock =
      newMovement.currentStock === ''
        ? guessedCurrentStock
        : parseFloat(newMovement.currentStock);

    const currentStock = Number.isNaN(parsedCurrentStock) ? guessedCurrentStock : parsedCurrentStock;

    const typeLabel =
      movementTypeOptions.find(option => option.value === newMovement.type)?.label ||
      newMovement.type;

    const newEntry = {
      id: Date.now(),
      date: newMovement.date,
      type: newMovement.type,
      typeLabel,
      product: newMovement.product,
      productCode: newMovement.productCode,
      quantity: adjustedQuantity,
      warehouse: newMovement.warehouse,
      warehouseLocation: newMovement.warehouseLocation,
      transferTo: newMovement.type === 'transfer' ? newMovement.transferTo : undefined,
      reference: newMovement.reference,
      referenceType: 'manual',
      notes: newMovement.notes,
      user: newMovement.user,
      currentStock,
    };

    setMovements(prev => [newEntry, ...prev]);
    closeCreateModal();
  };

  // Calculate statistics
  const statistics = useMemo(() => {
    const totalMovements = movements.length;
    const totalInbound = movements.filter(m => m.type === 'in').length;
    const totalOutbound = movements.filter(m => m.type === 'out').length;
    const totalTransfers = movements.filter(m => m.type === 'transfer').length;

    return { totalMovements, totalInbound, totalOutbound, totalTransfers };
  }, [movements]);

  // Filter and search movements
  const filteredMovements = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();

    return movements.filter(movement => {
      const product = movement.product ? movement.product.toLowerCase() : '';
      const productCode = movement.productCode ? movement.productCode.toLowerCase() : '';
      const reference = movement.reference ? movement.reference.toLowerCase() : '';
      const warehouse = movement.warehouse ? movement.warehouse.toLowerCase() : '';
      const user = movement.user ? movement.user.toLowerCase() : '';

      let matchesSearch = true;
      if (normalizedSearch) {
        switch (filterField) {
          case 'product':
            matchesSearch = product.includes(normalizedSearch);
            break;
          case 'productCode':
            matchesSearch = productCode.includes(normalizedSearch);
            break;
          case 'reference':
            matchesSearch = reference.includes(normalizedSearch);
            break;
          case 'warehouse':
            matchesSearch = warehouse.includes(normalizedSearch);
            break;
          case 'user':
            matchesSearch = user.includes(normalizedSearch);
            break;
          default:
            // Search all fields
            matchesSearch = (
              product.includes(normalizedSearch) ||
              productCode.includes(normalizedSearch) ||
              reference.includes(normalizedSearch) ||
              warehouse.includes(normalizedSearch) ||
              user.includes(normalizedSearch)
            );
        }
      }

      const matchesType = filterType === 'all' || movement.type === filterType;
      const matchesWarehouse = filterWarehouse === 'all' || movement.warehouse === filterWarehouse;

      return matchesSearch && matchesType && matchesWarehouse;
    });
  }, [movements, searchTerm, filterField, filterType, filterWarehouse]);

  const getMovementIcon = type => {
    switch (type) {
      case 'in':
        return (
          <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
        );
      case 'out':
        return (
          <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
          </svg>
        );
      case 'transfer':
        return (
          <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
          </svg>
        );
      case 'adjustment':
        return (
          <svg className="w-5 h-5 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
      default:
        return null;
    }
  };

  const getMovementTypeColor = type => {
    switch (type) {
      case 'in':
        return 'bg-green-100 text-green-800';
      case 'out':
        return 'bg-red-100 text-red-800';
      case 'transfer':
        return 'bg-blue-100 text-blue-800';
      case 'adjustment':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

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
            <p className="text-gray-600">تتبع حركات المخزون والمنتجات</p>
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
          <h1 className="text-3xl font-bold text-gray-800 mb-2">سجل المخزون</h1>
          <p className="text-gray-600">تتبع حركات المخزون والمنتجات</p>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-6 border border-blue-200">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-medium text-blue-800 mb-1">إجمالي الحركات</h3>
                <p className="text-2xl font-bold text-blue-900">
                  {statistics.totalMovements.toLocaleString('en-US')}
                </p>
                <p className="text-xs text-blue-600 mt-1">
                  حركة مسجلة
                </p>
              </div>
              <div className="p-3 bg-blue-200 rounded-full">
                <svg className="w-6 h-6 text-blue-800" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-6 border border-green-200">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-medium text-green-800 mb-1">الاستلام</h3>
                <p className="text-2xl font-bold text-green-900">
                  {statistics.totalInbound.toLocaleString('en-US')}
                </p>
                <p className="text-xs text-green-600 mt-1">
                  حركة استلام
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
                <h3 className="text-sm font-medium text-red-800 mb-1">الصرف</h3>
                <p className="text-2xl font-bold text-red-900">
                  {statistics.totalOutbound.toLocaleString('en-US')}
                </p>
                <p className="text-xs text-red-600 mt-1">
                  حركة صرف
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
                <h3 className="text-sm font-medium text-purple-800 mb-1">النقل</h3>
                <p className="text-2xl font-bold text-purple-900">
                  {statistics.totalTransfers.toLocaleString('en-US')}
                </p>
                <p className="text-xs text-purple-600 mt-1">
                  حركة نقل
                </p>
              </div>
              <div className="p-3 bg-purple-200 rounded-full">
                <svg className="w-6 h-6 text-purple-800" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                </svg>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h2 className="text-lg font-semibold text-gray-800">سجل حركات المخزون</h2>
              <p className="text-sm text-gray-600 mt-1">عرض وإدارة جميع حركات المخزون</p>
            </div>
            <button
              className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-medium rounded-lg shadow-sm transition-all duration-200 transform hover:scale-105"
              onClick={openCreateModal}
            >
              <svg className="w-5 h-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              إضافة حركة جديدة
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
                    placeholder="البحث في حركات المخزون..."
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
                  <option value="productCode">كود المنتج</option>
                  <option value="reference">المرجع</option>
                  <option value="warehouse">المخزن</option>
                  <option value="user">المستخدم</option>
                </select>
                <select
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value)}
                  className="px-4 py-3 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white transition-colors duration-200"
                >
                  <option value="all">جميع الأنواع</option>
                  {movementTypeOptions.map(option => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                <select
                  value={filterWarehouse}
                  onChange={(e) => setFilterWarehouse(e.target.value)}
                  className="px-4 py-3 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white transition-colors duration-200"
                >
                  <option value="all">جميع المخازن</option>
                  {warehouses.map(warehouse => (
                    <option key={warehouse} value={warehouse}>
                      {warehouse}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Results Count */}
            <div className="mb-4 flex justify-between items-center">
              <div className="text-sm text-gray-500">
                عرض {filteredMovements.length.toLocaleString('en-US')} من {movements.length.toLocaleString('en-US')} حركة
              </div>
              {searchTerm && (
                <div className="text-sm text-blue-600">
                  نتائج البحث عن: "{searchTerm}"
                </div>
              )}
            </div>

            {/* Movements Table */}
            <div className="overflow-x-auto rounded-lg border border-gray-200">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gradient-to-r from-gray-50 to-gray-100">
                  <tr>
                    <th scope="col" className="px-6 py-4 text-right text-xs font-medium text-gray-700 uppercase tracking-wider">
                      التاريخ والنوع
                    </th>
                    <th scope="col" className="px-6 py-4 text-right text-xs font-medium text-gray-700 uppercase tracking-wider">
                      المنتج
                    </th>
                    <th scope="col" className="px-6 py-4 text-right text-xs font-medium text-gray-700 uppercase tracking-wider">
                      الكمية
                    </th>
                    <th scope="col" className="px-6 py-4 text-right text-xs font-medium text-gray-700 uppercase tracking-wider">
                      المخزن
                    </th>
                    <th scope="col" className="px-6 py-4 text-right text-xs font-medium text-gray-700 uppercase tracking-wider">
                      المرجع
                    </th>
                    <th scope="col" className="px-6 py-4 text-right text-xs font-medium text-gray-700 uppercase tracking-wider">
                      المستخدم
                    </th>
                    <th scope="col" className="px-6 py-4 text-right text-xs font-medium text-gray-700 uppercase tracking-wider">
                      الرصيد الحالي
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredMovements.length === 0 ? (
                    <tr>
                      <td colSpan="7" className="px-6 py-12 text-center">
                        <div className="flex flex-col items-center">
                          <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                          </svg>
                          <h3 className="mt-2 text-sm font-medium text-gray-900">
                            {searchTerm ? 'لا توجد حركات تطابق معايير البحث' : 'لا توجد حركات مخزون'}
                          </h3>
                          <p className="mt-1 text-sm text-gray-500">
                            {searchTerm ? 'جرب تغيير مصطلحات البحث' : 'ابدأ بإضافة حركة مخزون جديدة'}
                          </p>
                          {!searchTerm && (
                            <div className="mt-6">
                              <button
                                onClick={openCreateModal}
                                className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
                              >
                                إضافة حركة جديدة
                              </button>
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  ) : (
                    filteredMovements.map((movement) => (
                      <tr key={movement.id} className="hover:bg-gray-50 transition-colors duration-150">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="flex-shrink-0 mr-3">
                              {getMovementIcon(movement.type)}
                            </div>
                            <div>
                              <div className="text-sm font-medium text-gray-900">
                                {new Date(movement.date).toLocaleDateString('en-US', {
                                  year: 'numeric',
                                  month: '2-digit',
                                  day: '2-digit'
                                })}
                              </div>
                              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getMovementTypeColor(movement.type)}`}>
                                {movement.typeLabel}
                              </span>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">{movement.product}</div>
                          <div className="text-sm text-gray-500">{movement.productCode}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className={`text-sm font-bold ${movement.quantity >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {movement.quantity > 0 ? '+' : ''}
                            {movement.quantity.toLocaleString('en-US')}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{movement.warehouse}</div>
                          <div className="text-sm text-gray-500">{movement.warehouseLocation}</div>
                          {movement.transferTo && (
                            <div className="text-xs text-blue-600 mt-1">إلى: {movement.transferTo}</div>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-blue-600 hover:text-blue-800 cursor-pointer">
                            {movement.reference}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{movement.user}</div>
                          {movement.notes && (
                            <div className="text-xs text-gray-400 mt-1 max-w-xs truncate" title={movement.notes}>
                              {movement.notes}
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-bold text-gray-900">
                            {movement.currentStock.toLocaleString('en-US')}
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

      {/* Create Movement Modal */}
      {isCreateModalOpen && (
        <div
          className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center px-4"
          onClick={closeCreateModal}
        >
          <div
            className="relative w-full max-w-3xl bg-white rounded-3xl shadow-2xl p-6 md:p-8 max-h-[90vh] overflow-y-auto"
            onClick={event => event.stopPropagation()}
          >
            <button
              type="button"
              onClick={closeCreateModal}
              className="absolute top-4 left-4 text-gray-400 hover:text-gray-600 focus:outline-none"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            <div className="mb-6">
              <h3 className="text-2xl font-semibold text-gray-800">إضافة حركة مخزون جديدة</h3>
              <p className="text-sm text-gray-500 mt-1">
                قم بتعبئة بيانات الحركة وسيتم تحديث السجل فوراً بعد الحفظ
              </p>
            </div>

            <form onSubmit={handleCreateMovement} className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">اسم المنتج *</label>
                <input
                  type="text"
                  value={newMovement.product}
                  onChange={handleNewMovementChange('product')}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white transition-colors duration-200"
                  placeholder="مثال: مضخة مياه صناعية"
                />
                {newMovementErrors.product && (
                  <p className="mt-1 text-sm text-red-600">{newMovementErrors.product}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">كود المنتج *</label>
                <input
                  type="text"
                  value={newMovement.productCode}
                  onChange={handleNewMovementChange('productCode')}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white transition-colors duration-200"
                  placeholder="مثال: PUMP-001"
                />
                {newMovementErrors.productCode && (
                  <p className="mt-1 text-sm text-red-600">{newMovementErrors.productCode}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">نوع الحركة *</label>
                <select
                  value={newMovement.type}
                  onChange={handleTypeChange}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white transition-colors duration-200"
                >
                  {movementTypeOptions.map(option => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">الكمية *</label>
                <input
                  type="number"
                  min="0"
                  step="0.001"
                  value={newMovement.quantity}
                  onChange={handleNewMovementChange('quantity')}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white transition-colors duration-200"
                />
                {newMovementErrors.quantity && (
                  <p className="mt-1 text-sm text-red-600">{newMovementErrors.quantity}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">التاريخ *</label>
                <input
                  type="date"
                  value={newMovement.date}
                  onChange={handleNewMovementChange('date')}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white transition-colors duration-200"
                />
                {newMovementErrors.date && (
                  <p className="mt-1 text-sm text-red-600">{newMovementErrors.date}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">المخزن *</label>
                <select
                  value={newMovement.warehouse}
                  onChange={handleNewMovementChange('warehouse')}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white transition-colors duration-200"
                >
                  {warehouses.map(warehouse => (
                    <option key={warehouse} value={warehouse}>
                      {warehouse}
                    </option>
                  ))}
                </select>
                {newMovementErrors.warehouse && (
                  <p className="mt-1 text-sm text-red-600">{newMovementErrors.warehouse}</p>
                )}
              </div>

              {newMovement.type === 'transfer' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">تحويل إلى *</label>
                  <select
                    value={newMovement.transferTo}
                    onChange={handleNewMovementChange('transferTo')}
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white transition-colors duration-200"
                  >
                    <option value="">اختر المخزن المستلم</option>
                    {warehouses.map(warehouse => (
                      <option key={warehouse} value={warehouse}>
                        {warehouse}
                      </option>
                    ))}
                  </select>
                  {newMovementErrors.transferTo && (
                    <p className="mt-1 text-sm text-red-600">{newMovementErrors.transferTo}</p>
                  )}
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">موقع المخزن</label>
                <input
                  type="text"
                  value={newMovement.warehouseLocation}
                  onChange={handleNewMovementChange('warehouseLocation')}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white transition-colors duration-200"
                  placeholder="مثال: الرياض"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">المرجع</label>
                <input
                  type="text"
                  value={newMovement.reference}
                  onChange={handleNewMovementChange('reference')}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white transition-colors duration-200"
                  placeholder="مثال: PO-100 أو SO-250"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">الرصيد بعد الحركة</label>
                <input
                  type="number"
                  step="0.001"
                  value={newMovement.currentStock}
                  onChange={handleNewMovementChange('currentStock')}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white transition-colors duration-200"
                  placeholder="يتم تقديره تلقائياً عند تركه فارغاً"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">المستخدم المسؤول *</label>
                <input
                  type="text"
                  value={newMovement.user}
                  onChange={handleNewMovementChange('user')}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white transition-colors duration-200"
                  placeholder="اسم المسؤول عن الحركة"
                />
                {newMovementErrors.user && (
                  <p className="mt-1 text-sm text-red-600">{newMovementErrors.user}</p>
                )}
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">ملاحظات إضافية</label>
                <textarea
                  rows={3}
                  value={newMovement.notes}
                  onChange={handleNewMovementChange('notes')}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white transition-colors duration-200"
                  placeholder="أي تفاصيل إضافية حول الحركة..."
                />
              </div>

              <div className="md:col-span-2 flex justify-end gap-3 pt-4 border-t border-gray-100 mt-2">
                <button
                  type="button"
                  onClick={closeCreateModal}
                  className="px-6 py-2 rounded-xl border border-gray-200 text-gray-700 hover:bg-gray-50 transition-colors duration-200"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-blue-700 text-white font-medium hover:from-blue-700 hover:to-blue-800 transition-all duration-200 shadow-sm"
                >
                  حفظ الحركة
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </Layout>
  );
};

export default InventoryMovements;