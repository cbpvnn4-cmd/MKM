import React, { useState, useEffect } from 'react';
import { createProduct, updateProduct } from '../services/api';

const ProductForm = ({ product, onSave, onCancel }) => {
  const [formData, setFormData] = useState({
    sku: product?.sku || '',
    name: product?.name || '',
    category: product?.category || '',
    uom: product?.uom || 'unit',
    price: product?.price || 0.00,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [fieldErrors, setFieldErrors] = useState({});

  useEffect(() => {
    if (product) {
      setFormData({
        sku: product.sku || '',
        name: product.name || '',
        category: product.category || '',
        uom: product.uom || 'unit',
        price: product.price || 0.00,
      });
    }
  }, [product]);

  const validateForm = () => {
    const errors = {};
    
    // Validate SKU
    if (!formData.sku.trim()) {
      errors.sku = 'SKU is required';
    } else if (formData.sku.length < 2) {
      errors.sku = 'SKU must be at least 2 characters';
    }
    
    // Validate name
    if (!formData.name.trim()) {
      errors.name = 'Product name is required';
    } else if (formData.name.length < 3) {
      errors.name = 'Product name must be at least 3 characters';
    }
    
    // Validate category
    if (!formData.category.trim()) {
      errors.category = 'Category is required';
    }
    
    // Validate price
    if (formData.price < 0) {
      errors.price = 'Price cannot be negative';
    }
    
    return errors;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'price' ? parseFloat(value) || 0 : value,
    }));
    
    // Clear field error when user starts typing
    if (fieldErrors[name]) {
      setFieldErrors(prev => ({
        ...prev,
        [name]: '',
      }));
    }
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
      let result;
      if (product && product.id) {
        // Update existing product
        result = await updateProduct(product.id, formData);
      } else {
        // Create new product
        result = await createProduct(formData);
      }
      onSave(result);
    } catch (err) {
      // Handle API validation errors
      if (err.response?.status === 422) {
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
        setError(err.response?.data?.detail || 'Failed to save product');
      }
      console.error('Error saving product:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h2 className="text-2xl font-bold text-gray-800 mb-6">
        {product ? 'Edit Product' : 'Add New Product'}
      </h2>
      
      {error && (
        <div className="mb-4 text-red-500 bg-red-50 p-3 rounded">
          {error}
        </div>
      )}
      
      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div>
            <label htmlFor="sku" className="block text-sm font-medium text-gray-700 mb-1">
              SKU *
            </label>
            <input
              type="text"
              id="sku"
              name="sku"
              value={formData.sku}
              onChange={handleChange}
              className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 ${
                fieldErrors.sku ? 'border-red-500' : 'border-gray-300'
              }`}
              required
            />
            {fieldErrors.sku && (
              <p className="mt-1 text-sm text-red-600">{fieldErrors.sku}</p>
            )}
          </div>
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
              Product Name *
            </label>
            <input
              type="text"
              id="name"
              name="name"
              value={formData.name}
              onChange={handleChange}
              className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 ${
                fieldErrors.name ? 'border-red-500' : 'border-gray-300'
              }`}
              required
            />
            {fieldErrors.name && (
              <p className="mt-1 text-sm text-red-600">{fieldErrors.name}</p>
            )}
          </div>
          <div>
            <label htmlFor="category" className="block text-sm font-medium text-gray-700 mb-1">
              Category *
            </label>
            <input
              type="text"
              id="category"
              name="category"
              value={formData.category}
              onChange={handleChange}
              className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 ${
                fieldErrors.category ? 'border-red-500' : 'border-gray-300'
              }`}
              required
            />
            {fieldErrors.category && (
              <p className="mt-1 text-sm text-red-600">{fieldErrors.category}</p>
            )}
          </div>
          <div>
            <label htmlFor="uom" className="block text-sm font-medium text-gray-700 mb-1">
              Unit of Measure
            </label>
            <select
              id="uom"
              name="uom"
              value={formData.uom}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="unit">Unit</option>
              <option value="piece">Piece</option>
              <option value="meter">Meter</option>
              <option value="kilogram">Kilogram</option>
              <option value="contract">Contract</option>
            </select>
          </div>
          <div className="md:col-span-2">
            <label htmlFor="price" className="block text-sm font-medium text-gray-700 mb-1">
              Price (USD) *
            </label>
            <input
              type="number"
              id="price"
              name="price"
              step="0.01"
              min="0"
              value={formData.price}
              onChange={handleChange}
              className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 ${
                fieldErrors.price ? 'border-red-500' : 'border-gray-300'
              }`}
              required
            />
            {fieldErrors.price && (
              <p className="mt-1 text-sm text-red-600">{fieldErrors.price}</p>
            )}
          </div>
        </div>
        <div className="flex justify-end space-x-3">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            disabled={loading}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
            disabled={loading}
          >
            {loading ? 'Saving...' : 'Save Product'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default ProductForm;