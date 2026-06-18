import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShoppingCart } from 'lucide-react';
import Layout from '../components/Layout';
import { getProducts, createSalesOrderWithItems, getSalesOrders, getCustomers } from '../services/api';
import SalesElevatorForm from '../components/SalesElevatorForm';

const SalesOrderCreate = () => {
  console.log('SalesOrderCreate component is rendering');
  const navigate = useNavigate();

  // State management
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [products, setProducts] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState('');

  // Order type: 'items' or 'elevators'
  const [orderType, setOrderType] = useState('items');

  // Form state
  const [formData, setFormData] = useState({
    soNo: '',
    customer_id: '',
    date: new Date().toISOString().split('T')[0],
    status: 'DRAFT'
  });

  const [items, setItems] = useState([
    { id: Date.now(), product_id: '', qty: 1, unitPrice: 0 }
  ]);

  const [elevators, setElevators] = useState([]);
  const [componentStock, setComponentStock] = useState({
    sections: 0,
    rabat: 0,
    cable: 0,
    cabin: 0
  });
  const [elevatorSummary, setElevatorSummary] = useState({
    totals: { sections: 0, rabat: 0, cable: 0, cabin: 0 },
    deficits: { sections: 0, rabat: 0, cable: 0, cabin: 0 }
  });

  const componentLabelMap = {
    sections: 'السكاشن',
    rabat: 'الرباط',
    cable: 'الكيبل',
    cabin: 'الكابينات'
  };

  const extractComponentStock = (productsData = []) => {
    const stock = {
      sections: 0,
      rabat: 0,
      cable: 0,
      cabin: 0
    };

    productsData.forEach(product => {
      const sku = (product.sku || '').toUpperCase();
      const name = product.name || '';
      const quantity = Number(product.stock) || 0;

      if (sku.includes('ELEVATOR-SECTION') || name.includes('سكشن')) {
        stock.sections += quantity;
      } else if (sku.includes('ELEVATOR-RABAT') || sku.includes('ELEVATOR-ROPE') || name.includes('رباط')) {
        stock.rabat += quantity;
      } else if (sku.includes('ELEVATOR-CABLE') || name.includes('كيبل')) {
        stock.cable += quantity;
      } else if (sku.includes('ELEVATOR-CABIN') || name.includes('كابينة')) {
        stock.cabin += quantity;
      }
    });

    return stock;
  };

  // Generate next SO number
  const generateNextSoNo = async () => {
    try {
      const salesOrders = await getSalesOrders();
      if (salesOrders && salesOrders.length > 0) {
        // Extract numbers from SO numbers (assuming format like SO-001, SO-003, etc.)
        const numbers = salesOrders
          .map(so => {
            const identifier = so.so_no || so.soNo || so.soNumber || '';
            const match = identifier.match(/(\d+)$/);
            return match ? parseInt(match[1], 10) : 0;
          })
          .filter(num => !Number.isNaN(num));

        const maxNumber = numbers.length > 0 ? Math.max(...numbers) : 0;
        const nextNumber = maxNumber + 1;
        return `SO-${String(nextNumber).padStart(3, '0')}`;
      } else {
        return 'SO-001';
      }
    } catch (err) {
      console.error('Error generating SO number:', err);
      return `SO-${String(Date.now()).slice(-3)}`;
    }
  };

  // Fetch products, customers, and generate SO number on mount
  useEffect(() => {
    const fetchData = async () => {
      try {
        console.log('Fetching data...');
        setLoading(true);

        const [productsData, customersData, nextSoNo] = await Promise.all([
          getProducts(),
          getCustomers(),
          generateNextSoNo()
        ]);

        console.log('Products fetched:', productsData);
        console.log('Customers fetched:', customersData);
        console.log('Next SO No:', nextSoNo);

        setProducts(productsData || []);
        setComponentStock(extractComponentStock(productsData || []));
        setCustomers(customersData?.data || customersData || []);
        setFormData(prev => ({ ...prev, soNo: nextSoNo }));
      } catch (err) {
        console.error('Error fetching data:', err);
        setError('فشل في تحميل البيانات. تأكد من تشغيل الخادم الخلفي.');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const handleFormChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleItemChange = (id, field, value) => {
    setItems(prev => prev.map(item => {
      if (item.id === id) {
        if (field === 'product_id') {
          const product = products.find(p => p.id === parseInt(value));
          return {
            ...item,
            product_id: value,
            unitPrice: product ? parseFloat(product.price_usd) : 0
          };
        }
        return { ...item, [field]: value };
      }
      return item;
    }));
  };

  const addItem = () => {
    setItems(prev => [...prev, {
      id: Date.now(),
      product_id: '',
      qty: 1,
      unitPrice: 0
    }]);
  };

  const removeItem = (id) => {
    if (items.length > 1) {
      setItems(prev => prev.filter(item => item.id !== id));
    }
  };

  const calculateTotal = () => {
    if (orderType === 'elevators') {
      return elevators.reduce((sum, elevator) => sum + (Number(elevator.sale_price) || 0), 0);
    }
    return items.reduce((sum, item) => sum + (item.qty * item.unitPrice), 0);
  };

  const handleOrderTypeChange = (type) => {
    setOrderType(type);
    setError(null);
  };

  const handleElevatorsChange = (updatedElevators, summary = { totals: {}, deficits: {} }) => {
    const sanitized = (updatedElevators || []).map(({ manualSections, manualRabat, manualCable, ...rest }) => rest);
    setElevators(sanitized);
    setElevatorSummary({
      totals: summary.totals || { sections: 0, rabat: 0, cable: 0, cabin: 0 },
      deficits: summary.deficits || { sections: 0, rabat: 0, cable: 0, cabin: 0 }
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validation
    if (!formData.soNo || !formData.customer_id) {
      setError('يرجى ملء جميع الحقول المطلوبة (رقم الأمر والعميل)');
      return;
    }

    if (orderType === 'items') {
      const hasInvalidItems = items.some(item => !item.product_id || item.qty <= 0);
      if (hasInvalidItems) {
        setError('يرجى التأكد من اختيار المنتجات والكميات بشكل صحيح');
        return;
      }
    } else if (orderType === 'elevators') {
      if (!elevators || elevators.length === 0) {
        setError('يرجى إضافة مصعد واحد على الأقل');
        return;
      }
      const validElevators = elevators.filter(e => (
        Number(e.sections) > 0 ||
        Number(e.rabat) > 0 ||
        Number(e.cable_meters) > 0 ||
        Number(e.height_meters) > 0
      ));
      if (validElevators.length === 0) {
        setError('يرجى إدخال بيانات المصعد مثل الارتفاع أو عدد السكاشن');
        return;
      }
      const deficitEntries = Object.entries(elevatorSummary.deficits || {}).filter(([, value]) => value > 0);
      if (deficitEntries.length > 0) {
        const messages = deficitEntries.map(([key, value]) => {
          const available = componentStock[key] ?? 0;
          const required = elevatorSummary.totals?.[key] ?? 0;
          const label = componentLabelMap[key] || key;
          return `${label} (المتاح ${available}، المطلوب ${required}، العجز ${value})`;
        });
        setError(`❌ لا يتوفر مخزون كافٍ من المكونات التالية: ${messages.join('، ')}`);
        return;
      }
    }

    try {
      setSaving(true);
      setError(null);

      const orderData = {
        soNo: formData.soNo,
        customer_id: parseInt(formData.customer_id),
        date: formData.date,
        status: formData.status,
        orderType: orderType,
        total: calculateTotal()
      };

      if (orderType === 'items') {
        orderData.items = items.map(item => ({
          product_id: parseInt(item.product_id),
          qty: parseFloat(item.qty),
          unitPrice: parseFloat(item.unitPrice)
        }));
      } else if (orderType === 'elevators') {
        orderData.elevators = elevators.map(elevator => ({
          height_meters: Number(elevator.height_meters ?? 0),
          sections: Number(elevator.sections ?? 0),
          rabat: Number(elevator.rabat ?? 0),
          cable_meters: Number(elevator.cable_meters ?? 0),
          cabins: Number(elevator.cabins ?? 1),
          sale_price: Number(elevator.sale_price ?? 0),
          installation_date: elevator.installation_date || null,
          notes: elevator.notes || ''
        }));
      }

      console.log('Submitting order:', orderData);
      const result = await createSalesOrderWithItems(orderData);
      console.log('Order created:', result);

      setSuccessMessage('تم إنشاء أمر البيع بنجاح! ✅');
      setTimeout(() => navigate('/sales-orders'), 1500);
    } catch (err) {
      console.error('Error creating order:', err);
      setError(err.response?.data?.detail || 'فشل في إنشاء أمر البيع');
    } finally {
      setSaving(false);
    }
  };

  // Loading state
  if (loading) {
    return (
      <Layout>
        <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600 mx-auto mb-4"></div>
            <p className="text-xl font-semibold text-gray-800">جاري تحميل البيانات...</p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
        <div className="max-w-6xl mx-auto p-6">
          {/* Header */}
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 p-8 mb-8">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4 rtl:space-x-reverse">
                <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center">
                  <ShoppingCart className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h1 className="text-3xl font-bold text-gray-800">إضافة أمر بيع جديد</h1>
                  <p className="text-gray-600 mt-1">المنتجات المتوفرة: {products.length}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Messages */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6">
              <p className="text-red-800">{error}</p>
            </div>
          )}

          {successMessage && (
            <div className="bg-green-50 border border-green-200 rounded-xl p-4 mb-6">
              <p className="text-green-800">{successMessage}</p>
            </div>
          )}

          {/* Form */}
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 p-8" dir="rtl">
            <form onSubmit={handleSubmit}>
              {/* Basic Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    رقم أمر البيع *
                  </label>
                  <input
                    type="text"
                    value={formData.soNo}
                    onChange={(e) => handleFormChange('soNo', e.target.value)}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-gray-50"
                    placeholder="يتم التوليد تلقائياً"
                    readOnly
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    العميل *
                  </label>
                  <select
                    value={formData.customer_id}
                    onChange={(e) => handleFormChange('customer_id', e.target.value)}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    required
                  >
                    <option value="">-- اختر العميل --</option>
                    {customers.map(customer => (
                      <option key={customer.id} value={customer.id}>
                        {customer.name} {customer.phone ? `- ${customer.phone}` : ''}
                      </option>
                    ))}
                  </select>
                  {customers.length === 0 && (
                    <p className="text-sm text-amber-600 mt-1">لا يوجد عملاء. يرجى إضافة عميل أولاً.</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    التاريخ *
                  </label>
                  <input
                    type="date"
                    value={formData.date}
                    onChange={(e) => handleFormChange('date', e.target.value)}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    الحالة
                  </label>
                  <select
                    value={formData.status}
                    onChange={(e) => handleFormChange('status', e.target.value)}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="DRAFT">مسودة</option>
                    <option value="CONFIRMED">مؤكد</option>
                    <option value="FULFILLED">منجز</option>
                  </select>
                </div>
              </div>

              {/* Order Type Toggle */}
              <div className="mb-8">
                <label className="block text-sm font-semibold text-gray-700 mb-3">
                  نوع الطلب
                </label>
                <div className="inline-flex rounded-xl overflow-hidden border-2 border-gray-300 shadow-sm">
                  <button
                    type="button"
                    onClick={() => handleOrderTypeChange('items')}
                    className={`px-6 py-3 text-sm font-semibold transition-all ${
                      orderType === 'items'
                        ? 'bg-blue-600 text-white'
                        : 'bg-white text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    <svg className="w-5 h-5 inline-block ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                    </svg>
                    أصناف عادية
                  </button>
                  <button
                    type="button"
                    onClick={() => handleOrderTypeChange('elevators')}
                    className={`px-6 py-3 text-sm font-semibold border-r-2 border-gray-300 transition-all ${
                      orderType === 'elevators'
                        ? 'bg-indigo-600 text-white'
                        : 'bg-white text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    <svg className="w-5 h-5 inline-block ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                    </svg>
                    بيع مصاعد
                  </button>
                </div>
              </div>

              {/* Items Table - Show only when orderType is 'items' */}
              {orderType === 'items' && (
              <div className="mb-8">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-xl font-bold text-gray-800">بنود أمر البيع</h3>
                  <button
                    type="button"
                    onClick={addItem}
                    className="px-4 py-2 bg-green-600 text-white rounded-xl hover:bg-green-700 transition-colors"
                  >
                    + إضافة بند
                  </button>
                </div>

                <div className="overflow-x-auto border border-gray-200 rounded-xl">
                  <table className="min-w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-right text-sm font-bold text-gray-700">المنتج</th>
                        <th className="px-4 py-3 text-right text-sm font-bold text-gray-700">الكمية</th>
                        <th className="px-4 py-3 text-right text-sm font-bold text-gray-700">السعر</th>
                        <th className="px-4 py-3 text-right text-sm font-bold text-gray-700">المجموع</th>
                        <th className="px-4 py-3 text-center text-sm font-bold text-gray-700">إجراء</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {items.map((item) => {
                        const product = products.find(p => p.id === parseInt(item.product_id));
                        return (
                          <tr key={item.id}>
                            <td className="px-4 py-3">
                              <select
                                value={item.product_id}
                                onChange={(e) => handleItemChange(item.id, 'product_id', e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                                required
                              >
                                <option value="">اختر منتج...</option>
                                {products.map(p => (
                                  <option key={p.id} value={p.id}>
                                    {p.name} - المتوفر: {p.stock} - ${p.price_usd}
                                  </option>
                                ))}
                              </select>
                              {product && (
                                <div className="text-xs text-gray-500 mt-1">
                                  المخزون: {product.stock}
                                </div>
                              )}
                            </td>
                            <td className="px-4 py-3">
                              <input
                                type="number"
                                min="1"
                                value={item.qty}
                                onChange={(e) => handleItemChange(item.id, 'qty', parseFloat(e.target.value))}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                                required
                              />
                            </td>
                            <td className="px-4 py-3">
                              <input
                                type="number"
                                step="0.01"
                                value={item.unitPrice}
                                onChange={(e) => handleItemChange(item.id, 'unitPrice', parseFloat(e.target.value))}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                                required
                              />
                            </td>
                            <td className="px-4 py-3 font-semibold">
                              ${(item.qty * item.unitPrice).toFixed(2)}
                            </td>
                            <td className="px-4 py-3 text-center">
                              <button
                                type="button"
                                onClick={() => removeItem(item.id)}
                                className="px-3 py-1 text-red-600 hover:bg-red-50 rounded"
                                disabled={items.length === 1}
                              >
                                حذف
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Total */}
                <div className="mt-4 p-4 bg-blue-50 rounded-xl">
                  <div className="flex justify-between items-center">
                    <span className="text-lg font-semibold">المجموع الكلي:</span>
                    <span className="text-2xl font-bold text-blue-600">
                      ${calculateTotal().toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>
              )}

              {/* Elevators Section - Show only when orderType is 'elevators' */}
              {orderType === 'elevators' && (
                <SalesElevatorForm
                  onElevatorsChange={handleElevatorsChange}
                  componentStock={componentStock}
                />
              )}

              {/* Actions */}
              <div className="flex justify-start gap-4">
                <button
                  type="button"
                  onClick={() => navigate('/sales-orders')}
                  className="px-6 py-3 border-2 border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50"
                  disabled={saving}
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-8 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-50"
                  disabled={saving}
                >
                  {saving ? 'جاري الحفظ...' : 'حفظ أمر البيع'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default SalesOrderCreate;
