import React, { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import { getProducts } from '../services/api';

const InventorySalesReport = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchProductsWithStock();
  }, []);

  const fetchProductsWithStock = async () => {
    try {
      setLoading(true);
      const data = await getProducts();
      setProducts(data);
      setError(null);
    } catch (err) {
      setError('فشل في تحميل بيانات المنتجات والمخزون');
      console.error('Error fetching products:', err);
    } finally {
      setLoading(false);
    }
  };

  const getStockStatus = (stock) => {
    if (stock === 0) {
      return { text: 'نفذ المخزون', color: 'bg-red-100 text-red-800', indicator: 'bg-red-500' };
    } else if (stock < 10) {
      return { text: 'مخزون منخفض', color: 'bg-yellow-100 text-yellow-800', indicator: 'bg-yellow-500' };
    }
    return { text: 'متوفر', color: 'bg-green-100 text-green-800', indicator: 'bg-green-500' };
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount || 0);
  };

  if (loading) {
    return (
      <Layout>
        <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
          <div className="max-w-6xl mx-auto p-6">
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 p-8">
              <div className="flex items-center justify-center space-y-4">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                <div className="text-xl font-semibold text-gray-700 mr-4">جاري تحميل تقرير المخزون والمبيعات...</div>
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
                  onClick={fetchProductsWithStock}
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

  const totalValue = products.reduce((sum, product) => {
    return sum + (product.stock * product.price_usd);
  }, 0);

  const lowStockProducts = products.filter(p => p.stock > 0 && p.stock < 10);
  const outOfStockProducts = products.filter(p => p.stock === 0);

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
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
                <div>
                  <h1 className="text-3xl font-bold text-gray-800">تقرير المخزون والمبيعات</h1>
                  <p className="text-gray-600 mt-1">نظرة شاملة على حالة المخزون وربطه بالمبيعات</p>
                </div>
              </div>
            </div>
          </div>

          {/* Statistics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-6 border border-blue-200">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-medium text-blue-800 mb-1">إجمالي المنتجات</h3>
                  <p className="text-2xl font-bold text-blue-900">{products.length}</p>
                </div>
                <div className="p-3 bg-blue-200 rounded-full">
                  <svg className="w-6 h-6 text-blue-800" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                  </svg>
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-6 border border-green-200">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-medium text-green-800 mb-1">قيمة المخزون الإجمالية</h3>
                  <p className="text-2xl font-bold text-green-900">{formatCurrency(totalValue)}</p>
                </div>
                <div className="p-3 bg-green-200 rounded-full">
                  <svg className="w-6 h-6 text-green-800" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 rounded-xl p-6 border border-yellow-200">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-medium text-yellow-800 mb-1">مخزون منخفض</h3>
                  <p className="text-2xl font-bold text-yellow-900">{lowStockProducts.length}</p>
                </div>
                <div className="p-3 bg-yellow-200 rounded-full">
                  <svg className="w-6 h-6 text-yellow-800" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.864-.833-2.632 0L5.232 16.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-red-50 to-red-100 rounded-xl p-6 border border-red-200">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-medium text-red-800 mb-1">نفذ المخزون</h3>
                  <p className="text-2xl font-bold text-red-900">{outOfStockProducts.length}</p>
                </div>
                <div className="p-3 bg-red-200 rounded-full">
                  <svg className="w-6 h-6 text-red-800" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </div>
              </div>
            </div>
          </div>

          {/* Products Table */}
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 p-8">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-gray-800">تفاصيل المخزون لكل منتج</h2>
              <div className="text-sm text-gray-500">
                النظام مرتبط تلقائياً - المخزون يتحدث عند كل عملية بيع
              </div>
            </div>

            <div className="overflow-x-auto rounded-xl border border-gray-200">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gradient-to-r from-gray-50 to-gray-100">
                  <tr>
                    <th className="px-6 py-4 text-right text-sm font-bold text-gray-700">اسم المنتج</th>
                    <th className="px-6 py-4 text-right text-sm font-bold text-gray-700">الفئة</th>
                    <th className="px-6 py-4 text-right text-sm font-bold text-gray-700">سعر البيع</th>
                    <th className="px-6 py-4 text-right text-sm font-bold text-gray-700">المخزون المتاح</th>
                    <th className="px-6 py-4 text-right text-sm font-bold text-gray-700">قيمة المخزون</th>
                    <th className="px-6 py-4 text-center text-sm font-bold text-gray-700">الحالة</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {products.map((product) => {
                    const stockStatus = getStockStatus(product.stock);
                    const stockValue = product.stock * product.price_usd;

                    return (
                      <tr key={product.id} className="hover:bg-gray-50 transition-colors duration-200">
                        <td className="px-6 py-4">
                          <div className="text-sm font-medium text-gray-900">{product.name}</div>
                          <div className="text-xs text-gray-500">{product.sku}</div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                            {product.category || 'غير محدد'}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm font-medium text-gray-900">
                          {formatCurrency(product.price_usd)}
                        </td>
                        <td className="px-6 py-4 text-sm font-bold text-gray-900">
                          {product.stock.toLocaleString('en-US')} {product.uom || 'قطعة'}
                        </td>
                        <td className="px-6 py-4 text-sm font-medium text-gray-900">
                          {formatCurrency(stockValue)}
                        </td>
                        <td className="px-6 py-4 text-center">
                          <div className="flex items-center justify-center">
                            <div className={`w-2 h-2 rounded-full ml-2 ${stockStatus.indicator}`}></div>
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${stockStatus.color}`}>
                              {stockStatus.text}
                            </span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Info Box */}
          <div className="mt-8 bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl p-6 border border-blue-200">
            <div className="flex items-start">
              <div className="flex-shrink-0">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="mr-3">
                <h3 className="text-sm font-medium text-blue-800">نظام متكامل ومترابط</h3>
                <div className="mt-2 text-sm text-blue-700">
                  <p>📊 النظام مرتبط بالكامل - عند إنشاء أمر بيع جديد، سيتم تحديث المخزون تلقائياً</p>
                  <p>🔍 يتم التحقق من توفر المخزون قبل السماح بالبيع</p>
                  <p>⚠️ تحذيرات تلقائية عند انخفاض المخزون أو نفاده</p>
                  <p>📈 تقارير فورية لحالة المخزون وقيمته</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default InventorySalesReport;