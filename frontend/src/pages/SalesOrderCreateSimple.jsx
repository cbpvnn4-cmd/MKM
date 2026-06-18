import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import { getProducts, createSalesOrderWithItems } from '../services/api';

const SalesOrderCreateSimple = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState([]);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        console.log('Fetching products...');
        const data = await getProducts();
        console.log('Products received:', data);
        setProducts(data || []);
        setLoading(false);
      } catch (err) {
        console.error('Error:', err);
        setError('فشل تحميل المنتجات: ' + err.message);
        setLoading(false);
      }
    };
    fetchProducts();
  }, []);

  if (loading) {
    return (
      <Layout>
        <div className="p-8">
          <h1 className="text-2xl mb-4">جاري التحميل...</h1>
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout>
        <div className="p-8">
          <h1 className="text-2xl mb-4 text-red-600">خطأ</h1>
          <p>{error}</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="p-8" dir="rtl">
        <h1 className="text-3xl font-bold mb-6">إضافة بيع جديد - صفحة اختبار</h1>

        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">المنتجات المتوفرة ({products.length})</h2>

          {products.length === 0 ? (
            <p className="text-gray-500">لا توجد منتجات متوفرة</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 text-right">الرقم</th>
                    <th className="px-4 py-2 text-right">اسم المنتج</th>
                    <th className="px-4 py-2 text-right">الفئة</th>
                    <th className="px-4 py-2 text-right">السعر</th>
                    <th className="px-4 py-2 text-right">المخزون</th>
                  </tr>
                </thead>
                <tbody>
                  {products.map((product, index) => (
                    <tr key={product.id} className="border-b">
                      <td className="px-4 py-2">{index + 1}</td>
                      <td className="px-4 py-2">{product.name}</td>
                      <td className="px-4 py-2">{product.category}</td>
                      <td className="px-4 py-2">${product.price_usd}</td>
                      <td className="px-4 py-2">
                        <span className={`px-2 py-1 rounded ${product.stock > 0 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                          {product.stock}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="mt-6">
          <button
            onClick={() => navigate('/sales-orders')}
            className="px-6 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
          >
            رجوع
          </button>
        </div>
      </div>
    </Layout>
  );
};

export default SalesOrderCreateSimple;