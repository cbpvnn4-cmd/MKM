import React, { useState, useEffect } from 'react';
import { createStockMovement, updateStockMovement } from '../services/api';
import { useToast } from './ui/Toast';
import { useConfirmations } from './ui/ConfirmDialog';

const StockMovementForm = ({ stockMovement, products, warehouses, onSave, onCancel }) => {
  const { success, error: toastError } = useToast();
  const { confirmDelete } = useConfirmations();

  const [formData, setFormData] = useState({
    productId: stockMovement?.product_id || stockMovement?.productId || '',
    warehouseId: stockMovement?.warehouse_id || stockMovement?.warehouseId || '',
    movementType: stockMovement?.movement_type || stockMovement?.movementType || 'IN',
    quantity: stockMovement?.quantity || 0.000,
    unitCost: stockMovement?.unit_cost || stockMovement?.unitCost || 0.00,
    referenceNo: stockMovement?.reference_no || stockMovement?.referenceNo || '',
    movementDate: stockMovement?.movement_date || stockMovement?.movementDate || new Date().toISOString().split('T')[0],
    notes: stockMovement?.notes || '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [fieldErrors, setFieldErrors] = useState({});

  // Simple inventory update function instead of hook
  const broadcastInventoryUpdate = (productId, warehouseId, change) => {
    console.log(`📊 تحديث المخزون: ${productId} في ${warehouseId} بكمية ${change}`);
    // Dispatch a simple event for inventory update
    const event = new CustomEvent('inventoryUpdate', {
      detail: { productId, warehouseId, change, timestamp: Date.now() }
    });
    window.dispatchEvent(event);
  };

  useEffect(() => {
    if (stockMovement) {
      setFormData({
        productId: stockMovement.product_id || stockMovement.productId || '',
        warehouseId: stockMovement.warehouse_id || stockMovement.warehouseId || '',
        movementType: stockMovement.movement_type || stockMovement.movementType || 'IN',
        quantity: stockMovement.quantity || 0.000,
        unitCost: stockMovement.unit_cost || stockMovement.unitCost || 0.00,
        referenceNo: stockMovement.reference_no || stockMovement.referenceNo || '',
        movementDate: stockMovement.movement_date || stockMovement.movementDate || new Date().toISOString().split('T')[0],
        notes: stockMovement.notes || '',
      });
    }
  }, [stockMovement]);

  const validateForm = () => {
    const errors = {};
    
    // Validate product
    if (!formData.productId) {
      errors.productId = 'Product is required';
    }
    
    // Validate warehouse
    if (!formData.warehouseId) {
      errors.warehouseId = 'Warehouse is required';
    }
    
    // Validate movement type
    if (!formData.movementType) {
      errors.movementType = 'Movement type is required';
    }
    
    // Validate quantity
    if (formData.quantity <= 0) {
      errors.quantity = 'Quantity must be greater than 0';
    }
    
    // Validate movement date
    if (!formData.movementDate) {
      errors.movementDate = 'Movement date is required';
    }
    
    // Validate unit cost
    if (formData.unitCost < 0) {
      errors.unitCost = 'Unit cost cannot be negative';
    }
    
    return errors;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;

    let processedValue = value;

    // Handle numeric fields
    if (name === 'quantity' || name === 'unitCost') {
      processedValue = value === '' ? 0 : parseFloat(value);
    } else if (name === 'productId' || name === 'warehouseId') {
      processedValue = value === '' ? '' : parseInt(value);
    }

    setFormData(prev => ({
      ...prev,
      [name]: processedValue,
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
      if (stockMovement && stockMovement.id) {
        // Update existing stock movement
        result = await updateStockMovement(stockMovement.id, {
          product_id: formData.productId,
          warehouse_id: formData.warehouseId,
          movement_type: formData.movementType,
          quantity: formData.quantity,
          unit_cost: formData.unitCost,
          reference_no: formData.referenceNo,
          movement_date: formData.movementDate,
          notes: formData.notes,
        });
      } else {
        // Create new stock movement
        result = await createStockMovement({
          product_id: formData.productId,
          warehouse_id: formData.warehouseId,
          movement_type: formData.movementType,
          quantity: formData.quantity,
          unit_cost: formData.unitCost,
          reference_no: formData.referenceNo,
          movement_date: formData.movementDate,
          notes: formData.notes,
        });

        // Broadcast real-time inventory update
        const quantityChange = formData.movementType === 'IN'
          ? formData.quantity
          : formData.movementType === 'OUT'
          ? -formData.quantity
          : 0; // ADJUST type would need special handling

        broadcastInventoryUpdate(formData.productId, formData.warehouseId, quantityChange);
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
        setError(err.response?.data?.detail || 'Failed to save stock movement');
      }
      console.error('Error saving stock movement:', err);
    } finally {
      setLoading(false);
    }
  };

  const getMovementTypeClass = (type) => {
    switch (type) {
      case 'IN':
        return 'bg-green-100 text-green-800';
      case 'OUT':
        return 'bg-red-100 text-red-800';
      case 'ADJUST':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div>
      {error && (
        <div className="mb-4 text-red-500 bg-red-50 p-3 rounded">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div>
            <label htmlFor="productId" className="block text-sm font-medium text-gray-700 mb-1">
              Product *
            </label>
            <select
              id="productId"
              name="productId"
              value={formData.productId}
              onChange={handleChange}
              className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 ${
                fieldErrors.productId ? 'border-red-500' : 'border-gray-300'
              }`}
              required
            >
              <option value="">Select a product</option>
              {products && products.map(product => (
                <option key={product.id} value={product.id}>
                  {product.name} ({product.sku})
                </option>
              ))}
            </select>
            {fieldErrors.productId && (
              <p className="mt-1 text-sm text-red-600">{fieldErrors.productId}</p>
            )}
          </div>
          <div>
            <label htmlFor="warehouseId" className="block text-sm font-medium text-gray-700 mb-1">
              Warehouse *
            </label>
            <select
              id="warehouseId"
              name="warehouseId"
              value={formData.warehouseId}
              onChange={handleChange}
              className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 ${
                fieldErrors.warehouseId ? 'border-red-500' : 'border-gray-300'
              }`}
              required
            >
              <option value="">Select a warehouse</option>
              {warehouses && warehouses.map(warehouse => (
                <option key={warehouse.id} value={warehouse.id}>
                  {warehouse.name}
                </option>
              ))}
            </select>
            {fieldErrors.warehouseId && (
              <p className="mt-1 text-sm text-red-600">{fieldErrors.warehouseId}</p>
            )}
          </div>
          <div>
            <label htmlFor="movementType" className="block text-sm font-medium text-gray-700 mb-1">
              Movement Type *
            </label>
            <select
              id="movementType"
              name="movementType"
              value={formData.movementType}
              onChange={handleChange}
              className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 ${
                fieldErrors.movementType ? 'border-red-500' : 'border-gray-300'
              }`}
              required
            >
              <option value="IN">Stock In</option>
              <option value="OUT">Stock Out</option>
              <option value="ADJUST">Adjustment</option>
            </select>
            {fieldErrors.movementType && (
              <p className="mt-1 text-sm text-red-600">{fieldErrors.movementType}</p>
            )}
          </div>
          <div>
            <label htmlFor="quantity" className="block text-sm font-medium text-gray-700 mb-1">
              Quantity *
            </label>
            <input
              type="number"
              id="quantity"
              name="quantity"
              step="0.001"
              min="0"
              value={formData.quantity}
              onChange={handleChange}
              className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 ${
                fieldErrors.quantity ? 'border-red-500' : 'border-gray-300'
              }`}
              required
            />
            {fieldErrors.quantity && (
              <p className="mt-1 text-sm text-red-600">{fieldErrors.quantity}</p>
            )}
          </div>
          <div>
            <label htmlFor="unitCost" className="block text-sm font-medium text-gray-700 mb-1">
              Unit Cost (USD)
            </label>
            <input
              type="number"
              id="unitCost"
              name="unitCost"
              step="0.01"
              min="0"
              value={formData.unitCost}
              onChange={handleChange}
              className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 ${
                fieldErrors.unitCost ? 'border-red-500' : 'border-gray-300'
              }`}
            />
            {fieldErrors.unitCost && (
              <p className="mt-1 text-sm text-red-600">{fieldErrors.unitCost}</p>
            )}
          </div>
          <div>
            <label htmlFor="movementDate" className="block text-sm font-medium text-gray-700 mb-1">
              Movement Date *
            </label>
            <input
              type="date"
              id="movementDate"
              name="movementDate"
              value={formData.movementDate}
              onChange={handleChange}
              className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 ${
                fieldErrors.movementDate ? 'border-red-500' : 'border-gray-300'
              }`}
              required
            />
            {fieldErrors.movementDate && (
              <p className="mt-1 text-sm text-red-600">{fieldErrors.movementDate}</p>
            )}
          </div>
          <div>
            <label htmlFor="referenceNo" className="block text-sm font-medium text-gray-700 mb-1">
              Reference No.
            </label>
            <input
              type="text"
              id="referenceNo"
              name="referenceNo"
              value={formData.referenceNo}
              onChange={handleChange}
              className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 ${
                fieldErrors.referenceNo ? 'border-red-500' : 'border-gray-300'
              }`}
            />
            {fieldErrors.referenceNo && (
              <p className="mt-1 text-sm text-red-600">{fieldErrors.referenceNo}</p>
            )}
          </div>
          <div className="md:col-span-2">
            <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-1">
              Notes
            </label>
            <textarea
              id="notes"
              name="notes"
              value={formData.notes}
              onChange={handleChange}
              rows="3"
              className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 ${
                fieldErrors.notes ? 'border-red-500' : 'border-gray-300'
              }`}
            />
            {fieldErrors.notes && (
              <p className="mt-1 text-sm text-red-600">{fieldErrors.notes}</p>
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
            {loading ? 'Saving...' : 'Save Stock Movement'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default StockMovementForm;