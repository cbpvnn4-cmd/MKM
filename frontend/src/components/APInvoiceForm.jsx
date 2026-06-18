import React, { useState, useEffect } from 'react';
import { createAPInvoice, updateAPInvoice } from '../services/api';

const APInvoiceForm = ({ apInvoice, suppliers, purchaseOrders, onSave, onCancel }) => {
  const [formData, setFormData] = useState({
    supplierId: apInvoice?.supplier_id || apInvoice?.supplierId || '',
    purchaseOrderId: apInvoice?.purchase_order_id || apInvoice?.purchaseOrderId || '',
    invoiceNo: apInvoice?.invoice_no || apInvoice?.invoiceNo || '',
    invoiceDate: apInvoice?.invoice_date || apInvoice?.invoiceDate || '',
    dueDate: apInvoice?.due_date || apInvoice?.dueDate || '',
    amount: apInvoice?.amount || 0.00,
    paidAmount: apInvoice?.paid_amount || apInvoice?.paidAmount || 0.00,
    status: apInvoice?.status || 'DRAFT',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [fieldErrors, setFieldErrors] = useState({});

  useEffect(() => {
    if (apInvoice) {
      setFormData({
        supplierId: apInvoice.supplier_id || apInvoice.supplierId || '',
        purchaseOrderId: apInvoice.purchase_order_id || apInvoice.purchaseOrderId || '',
        invoiceNo: apInvoice.invoice_no || apInvoice.invoiceNo || '',
        invoiceDate: apInvoice.invoice_date || apInvoice.invoiceDate || '',
        dueDate: apInvoice.due_date || apInvoice.dueDate || '',
        amount: apInvoice.amount || 0.00,
        paidAmount: apInvoice.paid_amount || apInvoice.paidAmount || 0.00,
        status: apInvoice.status || 'DRAFT',
      });
    }
  }, [apInvoice]);

  const validateForm = () => {
    const errors = {};
    
    // Validate supplier
    if (!formData.supplierId) {
      errors.supplierId = 'Supplier is required';
    }
    
    // Validate invoice number
    if (!formData.invoiceNo.trim()) {
      errors.invoiceNo = 'Invoice number is required';
    } else if (formData.invoiceNo.length < 2) {
      errors.invoiceNo = 'Invoice number must be at least 2 characters';
    }
    
    // Validate invoice date
    if (!formData.invoiceDate) {
      errors.invoiceDate = 'Invoice date is required';
    }
    
    // Validate that due date is after invoice date
    if (formData.invoiceDate && formData.dueDate) {
      const invoiceDate = new Date(formData.invoiceDate);
      const dueDate = new Date(formData.dueDate);
      
      if (dueDate < invoiceDate) {
        errors.dueDate = 'Due date must be after invoice date';
      }
    }
    
    // Validate amount
    if (formData.amount <= 0) {
      errors.amount = 'Amount must be greater than 0';
    }
    
    // Validate paid amount
    if (formData.paidAmount < 0) {
      errors.paidAmount = 'Paid amount cannot be negative';
    } else if (formData.paidAmount > formData.amount) {
      errors.paidAmount = 'Paid amount cannot exceed invoice amount';
    }
    
    return errors;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'supplierId' || name === 'purchaseOrderId' || name === 'amount' || name === 'paidAmount' ? 
        (value === '' ? '' : Number(value)) : value,
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
      if (apInvoice && apInvoice.id) {
        // Update existing AP invoice
        result = await updateAPInvoice(apInvoice.id, {
          supplier_id: formData.supplierId,
          purchase_order_id: formData.purchaseOrderId,
          invoice_no: formData.invoiceNo,
          invoice_date: formData.invoiceDate,
          due_date: formData.dueDate,
          amount: formData.amount,
          paid_amount: formData.paidAmount,
          status: formData.status,
        });
      } else {
        // Create new AP invoice
        result = await createAPInvoice({
          supplier_id: formData.supplierId,
          purchase_order_id: formData.purchaseOrderId,
          invoice_no: formData.invoiceNo,
          invoice_date: formData.invoiceDate,
          due_date: formData.dueDate,
          amount: formData.amount,
          paid_amount: formData.paidAmount,
          status: formData.status,
        });
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
        setError(err.response?.data?.detail || 'Failed to save AP invoice');
      }
      console.error('Error saving AP invoice:', err);
    } finally {
      setLoading(false);
    }
  };

  const getStatusClass = (status) => {
    switch (status) {
      case 'DRAFT':
        return 'bg-gray-100 text-gray-800';
      case 'ISSUED':
        return 'bg-blue-100 text-blue-800';
      case 'PARTIALLY_PAID':
        return 'bg-yellow-100 text-yellow-800';
      case 'PAID':
        return 'bg-green-100 text-green-800';
      case 'VOID':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h2 className="text-2xl font-bold text-gray-800 mb-6">
        {apInvoice ? 'Edit AP Invoice' : 'Add New AP Invoice'}
      </h2>
      
      {error && (
        <div className="mb-4 text-red-500 bg-red-50 p-3 rounded">
          {error}
        </div>
      )}
      
      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div>
            <label htmlFor="supplierId" className="block text-sm font-medium text-gray-700 mb-1">
              Supplier *
            </label>
            <select
              id="supplierId"
              name="supplierId"
              value={formData.supplierId}
              onChange={handleChange}
              className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 ${
                fieldErrors.supplierId ? 'border-red-500' : 'border-gray-300'
              }`}
              required
            >
              <option value="">Select a supplier</option>
              {suppliers && suppliers.map(supplier => (
                <option key={supplier.id} value={supplier.id}>
                  {supplier.name}
                </option>
              ))}
            </select>
            {fieldErrors.supplierId && (
              <p className="mt-1 text-sm text-red-600">{fieldErrors.supplierId}</p>
            )}
          </div>
          <div>
            <label htmlFor="purchaseOrderId" className="block text-sm font-medium text-gray-700 mb-1">
              Purchase Order
            </label>
            <select
              id="purchaseOrderId"
              name="purchaseOrderId"
              value={formData.purchaseOrderId}
              onChange={handleChange}
              className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 ${
                fieldErrors.purchaseOrderId ? 'border-red-500' : 'border-gray-300'
              }`}
            >
              <option value="">Select a purchase order</option>
              {purchaseOrders && purchaseOrders.map(po => (
                <option key={po.id} value={po.id}>
                  {po.po_no || po.poNo} - {po.supplier?.name}
                </option>
              ))}
            </select>
            {fieldErrors.purchaseOrderId && (
              <p className="mt-1 text-sm text-red-600">{fieldErrors.purchaseOrderId}</p>
            )}
          </div>
          <div>
            <label htmlFor="invoiceNo" className="block text-sm font-medium text-gray-700 mb-1">
              Invoice Number *
            </label>
            <input
              type="text"
              id="invoiceNo"
              name="invoiceNo"
              value={formData.invoiceNo}
              onChange={handleChange}
              className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 ${
                fieldErrors.invoiceNo ? 'border-red-500' : 'border-gray-300'
              }`}
              required
            />
            {fieldErrors.invoiceNo && (
              <p className="mt-1 text-sm text-red-600">{fieldErrors.invoiceNo}</p>
            )}
          </div>
          <div>
            <label htmlFor="invoiceDate" className="block text-sm font-medium text-gray-700 mb-1">
              Invoice Date *
            </label>
            <input
              type="date"
              id="invoiceDate"
              name="invoiceDate"
              value={formData.invoiceDate}
              onChange={handleChange}
              className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 ${
                fieldErrors.invoiceDate ? 'border-red-500' : 'border-gray-300'
              }`}
              required
            />
            {fieldErrors.invoiceDate && (
              <p className="mt-1 text-sm text-red-600">{fieldErrors.invoiceDate}</p>
            )}
          </div>
          <div>
            <label htmlFor="dueDate" className="block text-sm font-medium text-gray-700 mb-1">
              Due Date
            </label>
            <input
              type="date"
              id="dueDate"
              name="dueDate"
              value={formData.dueDate}
              onChange={handleChange}
              className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 ${
                fieldErrors.dueDate ? 'border-red-500' : 'border-gray-300'
              }`}
            />
            {fieldErrors.dueDate && (
              <p className="mt-1 text-sm text-red-600">{fieldErrors.dueDate}</p>
            )}
          </div>
          <div>
            <label htmlFor="amount" className="block text-sm font-medium text-gray-700 mb-1">
              Amount (USD) *
            </label>
            <input
              type="number"
              id="amount"
              name="amount"
              step="0.01"
              min="0"
              value={formData.amount}
              onChange={handleChange}
              className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 ${
                fieldErrors.amount ? 'border-red-500' : 'border-gray-300'
              }`}
              required
            />
            {fieldErrors.amount && (
              <p className="mt-1 text-sm text-red-600">{fieldErrors.amount}</p>
            )}
          </div>
          <div>
            <label htmlFor="paidAmount" className="block text-sm font-medium text-gray-700 mb-1">
              Paid Amount (USD)
            </label>
            <input
              type="number"
              id="paidAmount"
              name="paidAmount"
              step="0.01"
              min="0"
              value={formData.paidAmount}
              onChange={handleChange}
              className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 ${
                fieldErrors.paidAmount ? 'border-red-500' : 'border-gray-300'
              }`}
            />
            {fieldErrors.paidAmount && (
              <p className="mt-1 text-sm text-red-600">{fieldErrors.paidAmount}</p>
            )}
          </div>
          <div>
            <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-1">
              Status
            </label>
            <select
              id="status"
              name="status"
              value={formData.status}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="DRAFT">Draft</option>
              <option value="ISSUED">Issued</option>
              <option value="PARTIALLY_PAID">Partially Paid</option>
              <option value="PAID">Paid</option>
              <option value="VOID">Void</option>
            </select>
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
            {loading ? 'Saving...' : 'Save AP Invoice'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default APInvoiceForm;