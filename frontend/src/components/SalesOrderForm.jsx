import React, { useState, useEffect } from 'react';
import { createSalesOrder, createSalesOrderWithItems, updateSalesOrder, getProducts } from '../services/api';
import { useToast } from './ui/Toast';
import { useConfirmations } from './ui/ConfirmDialog';

const SalesOrderForm = ({ salesOrder, onSave, onCancel }) => {
  const { success, error: toastError } = useToast();
  const { confirmDelete } = useConfirmations();

  const [formData, setFormData] = useState({
    soNo: salesOrder?.soNo || salesOrder?.so_no || '',
    customer: salesOrder?.customer || '',
    date: salesOrder?.date || new Date().toISOString().split('T')[0],
    status: salesOrder?.status || 'DRAFT',
  });

  const [items, setItems] = useState(salesOrder?.items || [
    { id: 1, product_id: '', product: '', qty: 1, unitPrice: 0, lineTotal: 0, availableStock: 0 }
  ]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [fieldErrors, setFieldErrors] = useState({});
  const [products, setProducts] = useState([]);
  const [productsLoading, setProductsLoading] = useState(true);

  // Fetch products on component mount
  useEffect(() => {
    console.log('SalesOrderForm mounting, fetching products...');
    const fetchProducts = async () => {
      try {
        setProductsLoading(true);
        setError(null);
        console.log('Calling getProducts API...');
        const data = await getProducts();
        console.log('Products fetched:', data?.length || 0, 'items');

        if (data && Array.isArray(data)) {
          setProducts(data);
          console.log('Products set successfully');
        } else {
          console.warn('Products data is not an array:', data);
          setProducts([]);
        }
      } catch (err) {
        console.error('Error fetching products:', err);
        // Don't show error, just set empty array and allow form to work
        setProducts([]);
        // Only show warning in console, not to user
        console.warn('Could not load products, continuing with empty list');
      } finally {
        setProductsLoading(false);
        console.log('Products loading completed');
      }
    };

    fetchProducts();
  }, []);

  useEffect(() => {
    if (salesOrder) {
      setFormData({
        soNo: salesOrder.soNo || salesOrder.so_no || '',
        customer: salesOrder.customer || '',
        date: salesOrder.date || new Date().toISOString().split('T')[0],
        status: salesOrder.status || 'DRAFT',
      });
      setItems(salesOrder.items || [
        { id: 1, product_id: '', product: '', qty: 1, unitPrice: 0, lineTotal: 0, availableStock: 0 }
      ]);
    }
  }, [salesOrder]);

  const validateForm = () => {
    const errors = {};
    
    // Validate sales order number
    if (!formData.soNo.trim()) {
      errors.soNo = 'Sales order number is required';
    } else if (formData.soNo.length < 3) {
      errors.soNo = 'Sales order number must be at least 3 characters';
    }
    
    // Validate customer
    if (!formData.customer.trim()) {
      errors.customer = 'Customer is required';
    }
    
    // Validate date
    if (!formData.date) {
      errors.date = 'Date is required';
    }
    
    // Validate items
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (!item.product_id) {
        errors[`item_${item.id}_product`] = `يجب اختيار منتج للبند ${i + 1}`;
      }
      if (item.qty <= 0) {
        errors[`item_${item.id}_qty`] = `الكمية يجب أن تكون أكثر من 0 للبند ${i + 1}`;
      }
      if (item.qty > item.availableStock) {
        errors[`item_${item.id}_qty`] = `الكمية المطلوبة (${item.qty}) أكثر من المتوفر (${item.availableStock}) للبند ${i + 1}`;
      }
      if (item.unitPrice < 0) {
        errors[`item_${item.id}_unitPrice`] = `سعر الوحدة لا يمكن أن يكون سالب للبند ${i + 1}`;
      }
    }
    
    return errors;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
    
    // Clear field error when user starts typing
    if (fieldErrors[name]) {
      setFieldErrors(prev => ({
        ...prev,
        [name]: '',
      }));
    }
  };

  const handleItemChange = (id, field, value) => {
    setItems(prevItems =>
      prevItems.map(item => {
        if (item.id === id) {
          if (field === 'product_id') {
            // When product is selected, find product details and set price and stock
            const selectedProduct = products.find(p => p.id === parseInt(value));
            if (selectedProduct) {
              return {
                ...item,
                product_id: value,
                product: selectedProduct.name,
                unitPrice: parseFloat(selectedProduct.price) || 0,
                availableStock: parseInt(selectedProduct.stock) || 0
              };
            }
            return { ...item, product_id: value, product: '', unitPrice: 0, availableStock: 0 };
          } else if (field === 'qty' || field === 'unitPrice') {
            return { ...item, [field]: parseFloat(value) || 0 };
          } else {
            return { ...item, [field]: value };
          }
        }
        return item;
      })
    );

    // Clear item field error when user starts typing
    if (fieldErrors[`item_${id}_${field}`]) {
      setFieldErrors(prev => ({
        ...prev,
        [`item_${id}_${field}`]: '',
      }));
    }
  };

  const addItem = () => {
    setItems(prevItems => [
      ...prevItems,
      { id: Date.now(), product_id: '', product: '', qty: 1, unitPrice: 0, lineTotal: 0, availableStock: 0 }
    ]);
  };

  const removeItem = (id) => {
    if (items.length > 1) {
      setItems(prevItems => prevItems.filter(item => item.id !== id));
      // Also remove any errors associated with this item
      const newErrors = { ...fieldErrors };
      Object.keys(newErrors).forEach(key => {
        if (key.startsWith(`item_${id}_`)) {
          delete newErrors[key];
        }
      });
      setFieldErrors(newErrors);
    }
  };

  const calculateLineTotal = (qty, unitPrice) => {
    return qty * unitPrice;
  };

  const calculateTotal = () => {
    return items.reduce((sum, item) => sum + calculateLineTotal(item.qty, item.unitPrice), 0);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    
    // Validate form
    const errors = validateForm();
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      setLoading(false);
      return;
    }
    
    try {
      // Prepare data for submission
      const salesOrderData = {
        ...formData,
        orderType: salesOrder?.order_type || salesOrder?.orderType || 'items',
        items: items.map(item => ({
          ...item,
          lineTotal: calculateLineTotal(item.qty, item.unitPrice)
        })),
        total: calculateTotal()
      };
      
      let result;
      if (salesOrder && salesOrder.id) {
        // Update existing sales order
        result = await updateSalesOrder(salesOrder.id, salesOrderData);
      } else {
        // Create new sales order with items and stock update
        result = await createSalesOrderWithItems(salesOrderData);
      }
      // Show success message with stock update info
      if (result.message) {
        success(`${result.message} - تم تحديث المخزون تلقائياً لجميع المنتجات المباعة.`);
      }
      onSave(result);
    } catch (err) {
      // Handle API validation errors
      if (err.response?.status === 400) {
        // Stock validation error
        setError(err.response?.data?.detail || 'خطأ في المخزون');
      } else if (err.response?.status === 422) {
        // Validation error from backend
        const backendErrors = err.response.data.detail || [];
        const formattedErrors = {};
        
        backendErrors.forEach(error => {
          if (error.loc && error.loc.length > 1) {
            const field = error.loc[1];
            formattedErrors[field] = error.msg;
          }
        });
        
        setFieldErrors(formattedErrors);
      } else {
        setError(err.response?.data?.detail || 'Failed to save sales order');
      }
      console.error('Error saving sales order:', err);
    } finally {
      setLoading(false);
    }
  };

  // Show loading state while products are loading
  if (productsLoading) {
    return (
      <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 p-8" dir="rtl">
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600 mx-auto mb-6"></div>
          <p className="text-xl font-semibold text-gray-800 mb-2">جاري تحميل المنتجات...</p>
          <p className="text-sm text-gray-500">يرجى الانتظار قليلاً</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 p-8" dir="rtl">
      {error && (
        <div className="mb-6 bg-red-50/80 backdrop-blur-sm border border-red-200 rounded-xl p-4">
          <div className="text-red-700 font-medium">{error}</div>
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div>
            <label htmlFor="soNo" className="block text-sm font-semibold text-gray-700 mb-2">
              رقم أمر البيع *
            </label>
            <input
              type="text"
              id="soNo"
              name="soNo"
              value={formData.soNo}
              onChange={handleChange}
              className={`w-full px-4 py-3 border-2 rounded-xl shadow-sm bg-white/70 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 ${
                fieldErrors.soNo ? 'border-red-400 focus:ring-red-500' : 'border-gray-200 hover:border-gray-300'
              }`}
              placeholder="أدخل رقم أمر البيع"
              required
            />
            {fieldErrors.soNo && (
              <p className="mt-2 text-sm text-red-600 flex items-center">
                <svg className="w-4 h-4 ml-1" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                {fieldErrors.soNo}
              </p>
            )}
          </div>
          <div>
            <label htmlFor="date" className="block text-sm font-semibold text-gray-700 mb-2">
              التاريخ *
            </label>
            <input
              type="date"
              id="date"
              name="date"
              value={formData.date}
              onChange={handleChange}
              className={`w-full px-4 py-3 border-2 rounded-xl shadow-sm bg-white/70 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 ${
                fieldErrors.date ? 'border-red-400 focus:ring-red-500' : 'border-gray-200 hover:border-gray-300'
              }`}
              required
            />
            {fieldErrors.date && (
              <p className="mt-2 text-sm text-red-600 flex items-center">
                <svg className="w-4 h-4 ml-1" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                {fieldErrors.date}
              </p>
            )}
          </div>
          <div>
            <label htmlFor="customer" className="block text-sm font-semibold text-gray-700 mb-2">
              العميل *
            </label>
            <input
              type="text"
              id="customer"
              name="customer"
              value={formData.customer}
              onChange={handleChange}
              className={`w-full px-4 py-3 border-2 rounded-xl shadow-sm bg-white/70 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 ${
                fieldErrors.customer ? 'border-red-400 focus:ring-red-500' : 'border-gray-200 hover:border-gray-300'
              }`}
              placeholder="أدخل اسم العميل"
              required
            />
            {fieldErrors.customer && (
              <p className="mt-2 text-sm text-red-600 flex items-center">
                <svg className="w-4 h-4 ml-1" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                {fieldErrors.customer}
              </p>
            )}
          </div>
          <div>
            <label htmlFor="status" className="block text-sm font-semibold text-gray-700 mb-2">
              الحالة
            </label>
            <select
              id="status"
              name="status"
              value={formData.status}
              onChange={handleChange}
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl shadow-sm bg-white/70 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 hover:border-gray-300"
            >
              <option value="DRAFT">مسودة</option>
              <option value="CONFIRMED">مؤكد</option>
              <option value="FULFILLED">منجز</option>
              <option value="INVOICED">مفوتر</option>
              <option value="CANCELLED">ملغى</option>
            </select>
          </div>
        </div>

        <div className="mb-8">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-xl font-bold text-gray-800 flex items-center">
              <svg className="w-6 h-6 ml-2 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              بنود أمر البيع
            </h3>
            <button
              type="button"
              onClick={addItem}
              className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-green-500 to-emerald-600 text-white font-semibold rounded-xl hover:from-green-600 hover:to-emerald-700 transform hover:scale-105 transition-all duration-200 shadow-lg hover:shadow-xl"
            >
              <svg className="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              إضافة بند
            </button>
          </div>
          <div className="overflow-x-auto bg-white/50 backdrop-blur-sm rounded-xl border border-gray-200">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gradient-to-r from-gray-50 to-gray-100">
                <tr>
                  <th scope="col" className="px-6 py-4 text-right text-sm font-bold text-gray-700">
                    المنتج *
                  </th>
                  <th scope="col" className="px-6 py-4 text-right text-sm font-bold text-gray-700">
                    الكمية *
                  </th>
                  <th scope="col" className="px-6 py-4 text-right text-sm font-bold text-gray-700">
                    سعر الوحدة *
                  </th>
                  <th scope="col" className="px-6 py-4 text-right text-sm font-bold text-gray-700">
                    المجموع
                  </th>
                  <th scope="col" className="px-6 py-4 text-center text-sm font-bold text-gray-700">
                    العمليات
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white/80 divide-y divide-gray-200">
                {items.map((item, index) => (
                  <tr key={item.id} className="hover:bg-gray-50/50 transition-colors duration-200">
                    <td className="px-6 py-4">
                      <div className="space-y-2">
                        <select
                          value={item.product_id}
                          onChange={(e) => handleItemChange(item.id, 'product_id', e.target.value)}
                          className={`w-full px-3 py-2 border-2 rounded-lg shadow-sm bg-white/70 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 ${
                            fieldErrors[`item_${item.id}_product`] ? 'border-red-400 focus:ring-red-500' : 'border-gray-200 hover:border-gray-300'
                          }`}
                          required
                          disabled={productsLoading}
                        >
                          <option value="">اختر منتج...</option>
                          {products.map((product) => (
                            <option key={product.id} value={product.id}>
                              {product.name} - المتوفر: {product.stock || 0} | ${(product.price || 0).toFixed(2)}
                            </option>
                          ))}
                        </select>
                        {item.product_id && (
                          <div className="flex items-center text-xs">
                            <div className={`flex items-center ${item.availableStock > 10 ? 'text-green-600' : item.availableStock > 0 ? 'text-yellow-600' : 'text-red-600'}`}>
                              <div className={`w-2 h-2 rounded-full mr-1 ${item.availableStock > 10 ? 'bg-green-500' : item.availableStock > 0 ? 'bg-yellow-500' : 'bg-red-500'}`}></div>
                              {item.availableStock > 10 ? 'متوفر' : item.availableStock > 0 ? 'مخزون منخفض' : 'غير متوفر'}
                              ({item.availableStock} قطعة متاحة)
                            </div>
                          </div>
                        )}
                        {fieldErrors[`item_${item.id}_product`] && (
                          <p className="mt-1 text-xs text-red-600 flex items-center">
                            <svg className="w-3 h-3 ml-1" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                            </svg>
                            {fieldErrors[`item_${item.id}_product`]}
                          </p>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="space-y-2">
                        <input
                          type="number"
                          min="0"
                          max={item.availableStock || undefined}
                          step="0.001"
                          value={item.qty}
                          onChange={(e) => handleItemChange(item.id, 'qty', e.target.value)}
                          className={`w-full px-3 py-2 border-2 rounded-lg shadow-sm bg-white/70 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 ${
                            fieldErrors[`item_${item.id}_qty`] || (item.qty > item.availableStock && item.availableStock > 0) ? 'border-red-400 focus:ring-red-500' : 'border-gray-200 hover:border-gray-300'
                          }`}
                          placeholder="الكمية"
                          required
                        />
                        {item.qty > item.availableStock && item.availableStock > 0 && !fieldErrors[`item_${item.id}_qty`] && (
                          <p className="text-xs text-red-600 flex items-center">
                            <svg className="w-3 h-3 ml-1" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                            </svg>
                            تحذير: الكمية أكثر من المتوفر ({item.availableStock})
                          </p>
                        )}
                        {fieldErrors[`item_${item.id}_qty`] && (
                          <p className="mt-1 text-xs text-red-600 flex items-center">
                            <svg className="w-3 h-3 ml-1" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                            </svg>
                            {fieldErrors[`item_${item.id}_qty`]}
                          </p>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={item.unitPrice}
                        onChange={(e) => handleItemChange(item.id, 'unitPrice', e.target.value)}
                        className={`w-full px-3 py-2 border-2 rounded-lg shadow-sm bg-white/70 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 ${
                          fieldErrors[`item_${item.id}_unitPrice`] ? 'border-red-400 focus:ring-red-500' : 'border-gray-200 hover:border-gray-300'
                        }`}
                        placeholder="السعر"
                        required
                      />
                      {fieldErrors[`item_${item.id}_unitPrice`] && (
                        <p className="mt-1 text-xs text-red-600 flex items-center">
                          <svg className="w-3 h-3 ml-1" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                          </svg>
                          {fieldErrors[`item_${item.id}_unitPrice`]}
                        </p>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-lg font-semibold text-gray-700">
                        ${calculateLineTotal(item.qty, item.unitPrice).toFixed(2)}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <button
                        type="button"
                        onClick={() => removeItem(item.id)}
                        className="inline-flex items-center px-3 py-2 text-red-600 hover:text-white hover:bg-red-600 border border-red-300 hover:border-red-600 rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                        disabled={items.length <= 1}
                      >
                        <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                        حذف
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="bg-gradient-to-r from-gray-50 to-blue-50 rounded-xl p-6 mb-8">
          <div className="flex justify-between items-center">
            <div className="text-lg font-medium text-gray-600">
              إجمالي أمر البيع
            </div>
            <div className="text-3xl font-bold text-blue-600">
              ${calculateTotal().toFixed(2)}
            </div>
          </div>
        </div>

        <div className="flex justify-start gap-4">
          <button
            type="button"
            onClick={onCancel}
            className="inline-flex items-center px-6 py-3 border-2 border-gray-300 rounded-xl shadow-sm text-sm font-semibold text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 transition-all duration-200 disabled:opacity-50"
            disabled={loading}
          >
            <svg className="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
            إلغاء
          </button>
          <button
            type="submit"
            className="inline-flex items-center px-8 py-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white font-semibold rounded-xl hover:from-blue-600 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transform hover:scale-105 transition-all duration-200 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:transform-none"
            disabled={loading}
          >
            {loading ? (
              <>
                <svg className="w-4 h-4 ml-2 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                جاري الحفظ...
              </>
            ) : (
              <>
                <svg className="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                </svg>
                حفظ أمر البيع
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default SalesOrderForm;
