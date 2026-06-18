import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import Layout from '../components/Layout';

const WarehouseDetail = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const [warehouse, setWarehouse] = useState(null);
  const [inventory, setInventory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');

  const sampleWarehouses = {
    '1': {
      id: 1,
      name: 'المخزن الرئيسي',
      location: 'الرياض - المنطقة الصناعية',
      capacity: 10000,
      manager: 'أحمد محمد الأحمد',
      phone: '+966-50-123-4567',
      address: 'المنطقة الصناعية الثانية، شارع الملك فهد',
      description: 'المخزن الرئيسي للشركة يحتوي على معظم المواد والقطع'
    },
    '2': {
      id: 2,
      name: 'مخزن قطع الغيار',
      location: 'جدة - المنطقة التجارية',
      capacity: 5000,
      manager: 'خالد عبدالله السالم',
      phone: '+966-50-765-4321',
      address: 'المنطقة التجارية، طريق الملك عبدالعزيز',
      description: 'مخزن مخصص لقطع الغيار والصيانة'
    }
  };

  const sampleInventory = {
    '1': [
      {
        id: 1,
        productCode: 'PUMP-001',
        productName: 'مضخة مياه كهربائية 5HP',
        category: 'مضخات',
        currentStock: 25,
        reservedStock: 5,
        availableStock: 20,
        unitPrice: 1200,
        totalValue: 30000,
        minStock: 10,
        maxStock: 50,
        location: 'الرف A-01',
        lastMovement: '2024-01-15',
        supplier: 'شركة المضخات المتقدمة'
      },
      {
        id: 2,
        productCode: 'MOTOR-005',
        productName: 'محرك كهربائي 3 حصان',
        category: 'محركات',
        currentStock: 12,
        reservedStock: 2,
        availableStock: 10,
        unitPrice: 800,
        totalValue: 9600,
        minStock: 5,
        maxStock: 30,
        location: 'الرف B-03',
        lastMovement: '2024-01-12',
        supplier: 'مؤسسة المحركات الصناعية'
      },
      {
        id: 3,
        productCode: 'PIPE-006',
        productName: 'أنبوب PVC قطر 4 بوصة',
        category: 'أنابيب',
        currentStock: 150,
        reservedStock: 50,
        availableStock: 100,
        unitPrice: 25,
        totalValue: 3750,
        minStock: 20,
        maxStock: 200,
        location: 'المنطقة C',
        lastMovement: '2024-01-10',
        supplier: 'شركة الأنابيب البلاستيكية'
      },
      {
        id: 4,
        productCode: 'VALVE-AUTO',
        productName: 'صمام أوتوماتيكي',
        category: 'صمامات',
        currentStock: 8,
        reservedStock: 1,
        availableStock: 7,
        unitPrice: 150,
        totalValue: 1200,
        minStock: 3,
        maxStock: 15,
        location: 'الرف D-02',
        lastMovement: '2024-01-14',
        supplier: 'شركة الصمامات المتطورة'
      },
      {
        id: 5,
        productCode: 'PANEL-CTRL',
        productName: 'لوحة تحكم كهربائية',
        category: 'كهربائيات',
        currentStock: 5,
        reservedStock: 0,
        availableStock: 5,
        unitPrice: 500,
        totalValue: 2500,
        minStock: 2,
        maxStock: 10,
        location: 'الرف E-01',
        lastMovement: '2024-01-13',
        supplier: 'مؤسسة الكهربائيات الحديثة'
      }
    ],
    '2': [
      {
        id: 6,
        productCode: 'SPARE-001',
        productName: 'قطعة غيار للمضخة',
        category: 'قطع غيار',
        currentStock: 30,
        reservedStock: 5,
        availableStock: 25,
        unitPrice: 50,
        totalValue: 1500,
        minStock: 10,
        maxStock: 40,
        location: 'الرف F-01',
        lastMovement: '2024-01-11',
        supplier: 'شركة قطع الغيار'
      }
    ]
  };

  React.useEffect(() => {
    if (id) {
      fetchWarehouse();
    }
  }, [id]);

  const fetchWarehouse = async () => {
    try {
      setLoading(true);
      const warehouseData = sampleWarehouses[id];
      const inventoryData = sampleInventory[id] || [];

      if (warehouseData) {
        setWarehouse(warehouseData);
        setInventory(inventoryData);
        setError(null);
      } else {
        setError('المخزن غير موجود');
      }
    } catch (err) {
      setError('فشل في تحميل بيانات المخزن');
      console.error('Error fetching warehouse:', err);
    } finally {
      setLoading(false);
    }
  };

  const categories = useMemo(() => {
    const cats = ['all', ...new Set(inventory.map(item => item.category))];
    return cats;
  }, [inventory]);

  const filteredInventory = useMemo(() => {
    return inventory.filter(item => {
      const matchesSearch = item.productName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          item.productCode.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = filterCategory === 'all' || item.category === filterCategory;
      return matchesSearch && matchesCategory;
    });
  }, [inventory, searchTerm, filterCategory]);

  const warehouseStats = useMemo(() => {
    if (!inventory.length) return { totalItems: 0, totalValue: 0, lowStock: 0, occupancy: 0 };

    const totalItems = inventory.reduce((sum, item) => sum + item.currentStock, 0);
    const totalValue = inventory.reduce((sum, item) => sum + item.totalValue, 0);
    const lowStock = inventory.filter(item => item.currentStock <= item.minStock).length;
    const occupancy = warehouse ? (totalItems / warehouse.capacity) * 100 : 0;

    return { totalItems, totalValue, lowStock, occupancy };
  }, [inventory, warehouse]);

  const getStockStatus = (item) => {
    if (item.currentStock <= item.minStock) return 'low';
    if (item.currentStock >= item.maxStock * 0.8) return 'high';
    return 'normal';
  };

  const getStockStatusColor = (status) => {
    switch (status) {
      case 'low': return 'text-red-600 bg-red-100';
      case 'high': return 'text-green-600 bg-green-100';
      default: return 'text-blue-600 bg-blue-100';
    }
  };

  const getStockStatusText = (status) => {
    switch (status) {
      case 'low': return 'مخزون منخفض';
      case 'high': return 'مخزون عالي';
      default: return 'مخزون طبيعي';
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6">
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl p-8 text-center">
            <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <div className="text-gray-600 text-lg">جاري تحميل بيانات المخزن...</div>
          </div>
        </div>
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout>
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6">
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl p-8">
            <div className="text-red-600 text-xl mb-6 text-center">{error}</div>
            <div className="text-center">
              <button
                onClick={() => navigate('/warehouses')}
                className="px-6 py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-xl shadow-lg hover:from-blue-600 hover:to-blue-700 transition-all duration-200 transform hover:scale-105"
              >
                العودة للمخازن
              </button>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  if (!warehouse) {
    return (
      <Layout>
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6">
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl p-8 text-center">
            <div className="text-gray-600 text-lg">المخزن غير موجود</div>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4 space-x-reverse">
              <button
                onClick={() => navigate('/warehouses')}
                className="p-2 text-gray-600 hover:text-gray-800 rounded-lg hover:bg-white/50 transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <h1 className="text-3xl font-bold text-gray-800">{warehouse.name}</h1>
            </div>
            <div className="flex space-x-3 space-x-reverse">
              <button
                onClick={() => navigate(`/warehouses/${id}/edit`)}
                className="px-4 py-2 bg-gradient-to-r from-yellow-500 to-orange-500 text-white rounded-xl shadow-lg hover:from-yellow-600 hover:to-orange-600 transition-all duration-200 transform hover:scale-105"
              >
                تعديل المخزن
              </button>
              <button
                onClick={() => navigate('/stock-movements')}
                className="px-4 py-2 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-xl shadow-lg hover:from-green-600 hover:to-emerald-600 transition-all duration-200 transform hover:scale-105"
              >
                حركات المخزون
              </button>
            </div>
          </div>

          {/* Warehouse Info Card */}
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="space-y-2">
                <h3 className="text-sm font-medium text-gray-500">الموقع</h3>
                <p className="text-lg font-semibold text-gray-800">{warehouse.location}</p>
              </div>
              <div className="space-y-2">
                <h3 className="text-sm font-medium text-gray-500">المدير</h3>
                <p className="text-lg font-semibold text-gray-800">{warehouse.manager}</p>
              </div>
              <div className="space-y-2">
                <h3 className="text-sm font-medium text-gray-500">الهاتف</h3>
                <p className="text-lg font-semibold text-gray-800">{warehouse.phone}</p>
              </div>
              <div className="space-y-2">
                <h3 className="text-sm font-medium text-gray-500">السعة</h3>
                <p className="text-lg font-semibold text-gray-800">{warehouse.capacity.toLocaleString()} قطعة</p>
              </div>
            </div>
            {warehouse.address && (
              <div className="mt-4 pt-4 border-t border-gray-200">
                <h3 className="text-sm font-medium text-gray-500 mb-2">العنوان</h3>
                <p className="text-gray-800">{warehouse.address}</p>
              </div>
            )}
            {warehouse.description && (
              <div className="mt-4 pt-4 border-t border-gray-200">
                <h3 className="text-sm font-medium text-gray-500 mb-2">الوصف</h3>
                <p className="text-gray-800">{warehouse.description}</p>
              </div>
            )}
          </div>

          {/* Statistics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-2xl shadow-xl p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-medium opacity-90">إجمالي الأصناف</h3>
                  <p className="text-3xl font-bold">{warehouseStats.totalItems.toLocaleString()}</p>
                </div>
                <div className="p-3 bg-white/20 rounded-xl">
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                  </svg>
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-2xl shadow-xl p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-medium opacity-90">إجمالي القيمة</h3>
                  <p className="text-2xl font-bold">${warehouseStats.totalValue.toLocaleString()}</p>
                </div>
                <div className="p-3 bg-white/20 rounded-xl">
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                  </svg>
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-r from-red-500 to-pink-500 text-white rounded-2xl shadow-xl p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-medium opacity-90">مخزون منخفض</h3>
                  <p className="text-3xl font-bold">{warehouseStats.lowStock}</p>
                </div>
                <div className="p-3 bg-white/20 rounded-xl">
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.464 0L4.35 16.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-r from-purple-500 to-indigo-500 text-white rounded-2xl shadow-xl p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-medium opacity-90">نسبة الإشغال</h3>
                  <p className="text-3xl font-bold">{warehouseStats.occupancy.toFixed(1)}%</p>
                </div>
                <div className="p-3 bg-white/20 rounded-xl">
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
              </div>
            </div>
          </div>

          {/* Inventory Section */}
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-800">مخزون المواد</h2>
              <div className="flex space-x-3 space-x-reverse">
                <div className="relative">
                  <input
                    type="text"
                    placeholder="البحث في المخزون..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 pr-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  <svg className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
                <select
                  value={filterCategory}
                  onChange={(e) => setFilterCategory(e.target.value)}
                  className="px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="all">جميع الفئات</option>
                  {categories.filter(cat => cat !== 'all').map(category => (
                    <option key={category} value={category}>{category}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Inventory Table */}
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">المنتج</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">الفئة</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">المخزون الحالي</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">المخزون المحجوز</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">المخزون المتاح</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">الموقع</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">الحالة</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">القيمة الإجمالية</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredInventory.map((item) => {
                    const stockStatus = getStockStatus(item);
                    return (
                      <tr key={item.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div>
                            <div className="text-sm font-medium text-gray-900">{item.productName}</div>
                            <div className="text-sm text-gray-500">{item.productCode}</div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{item.category}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{item.currentStock}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{item.reservedStock}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{item.availableStock}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{item.location}</td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStockStatusColor(stockStatus)}`}>
                            {getStockStatusText(stockStatus)}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${item.totalValue.toLocaleString()}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {filteredInventory.length === 0 && (
              <div className="text-center py-12">
                <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2 2m16-7H4m16 0l-2-2m2 2l-2 2M4 13l2-2m-2 2l2 2" />
                </svg>
                <h3 className="mt-2 text-sm font-medium text-gray-900">لا توجد مواد</h3>
                <p className="mt-1 text-sm text-gray-500">لا توجد مواد مطابقة لمعايير البحث.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default WarehouseDetail;