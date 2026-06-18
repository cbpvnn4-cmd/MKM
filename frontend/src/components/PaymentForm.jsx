import React, { useState } from 'react';
import { addSalesInvoicePayment } from '../services/api';

const PaymentForm = ({ invoice, onPaymentAdded, onCancel }) => {
  const [formData, setFormData] = useState({
    amount_usd: '',
    paid_on: new Date().toISOString().split('T')[0],
    method: 'CASH',
    note: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [fieldErrors, setFieldErrors] = useState({});

  const getTotal = () => Number(invoice?.total_usd ?? invoice?.total ?? 0);
  const getPaid = () => Number(invoice?.paid_amount_usd ?? invoice?.paid ?? 0);
  const getRemaining = () => Number(invoice?.remaining_amount ?? invoice?.balance ?? (getTotal() - getPaid()));

  const validateForm = () => {
    const errors = {};
    const amountValue = parseFloat(formData.amount_usd);

    if (!formData.amount_usd) {
      errors.amount = 'Payment amount is required';
    } else if (Number.isNaN(amountValue) || amountValue <= 0) {
      errors.amount = 'Payment amount must be greater than 0';
    } else if (amountValue > getRemaining()) {
      errors.amount = `Payment amount cannot exceed balance of $${getRemaining().toFixed(2)}`;
    }

    if (!formData.paid_on) {
      errors.paymentDate = 'Payment date is required';
    }

    if (!formData.method) {
      errors.paymentMethod = 'Payment method is required';
    }

    return errors;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));

    if (fieldErrors[name]) {
      setFieldErrors((prev) => ({
        ...prev,
        [name]: '',
      }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const errors = validateForm();
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      setLoading(false);
      return;
    }

    try {
      const payload = {
        amount_usd: parseFloat(formData.amount_usd),
        paid_on: formData.paid_on,
        method: formData.method,
        note: formData.note,
      };

      const result = await addSalesInvoicePayment(invoice.id, payload);
      onPaymentAdded(result);
      setFormData({
        amount_usd: '',
        paid_on: new Date().toISOString().split('T')[0],
        method: 'CASH',
        note: '',
      });
    } catch (err) {
      if (err?.response?.status === 422) {
        const backendErrors = err.response.data?.detail || [];
        const formattedErrors = {};
        backendErrors.forEach((issue) => {
          if (issue?.loc?.length > 1) {
            const field = issue.loc[1];
            formattedErrors[field] = issue.msg;
          }
        });
        setFieldErrors(formattedErrors);
      } else {
        setError(err?.response?.data?.detail || 'Failed to add payment');
      }
      console.error('Error adding payment:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h2 className="text-2xl font-bold text-gray-800 mb-6">
        Add Payment to Invoice {invoice?.invoice_no ?? invoice?.invoiceNo ?? ''}
      </h2>

      {error && (
        <div className="mb-4 text-red-500 bg-red-50 p-3 rounded">
          {error}
        </div>
      )}

      <div className="mb-6 p-4 bg-blue-50 rounded">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <div className="text-sm text-gray-500">Invoice Total</div>
            <div className="text-lg font-medium text-gray-800">
              ${getTotal().toFixed(2)}
            </div>
          </div>
          <div>
            <div className="text-sm text-gray-500">Amount Paid</div>
            <div className="text-lg font-medium text-gray-800">
              ${getPaid().toFixed(2)}
            </div>
          </div>
          <div>
            <div className="text-sm text-gray-500">Balance</div>
            <div className="text-lg font-medium text-gray-800">
              ${getRemaining().toFixed(2)}
            </div>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div>
            <label htmlFor="amount" className="block text-sm font-medium text-gray-700 mb-1">
              Payment Amount *
            </label>
            <input
              type="number"
              id="amount"
              name="amount_usd"
              min="0"
              step="0.01"
              value={formData.amount_usd}
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
            <label htmlFor="paymentDate" className="block text-sm font-medium text-gray-700 mb-1">
              Payment Date *
            </label>
            <input
              type="date"
              id="paymentDate"
              name="paid_on"
              value={formData.paid_on}
              onChange={handleChange}
              className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 ${
                fieldErrors.paymentDate ? 'border-red-500' : 'border-gray-300'
              }`}
              required
            />
            {fieldErrors.paymentDate && (
              <p className="mt-1 text-sm text-red-600">{fieldErrors.paymentDate}</p>
            )}
          </div>
          <div>
            <label htmlFor="paymentMethod" className="block text-sm font-medium text-gray-700 mb-1">
              Payment Method *
            </label>
            <select
              id="paymentMethod"
              name="method"
              value={formData.method}
              onChange={handleChange}
              className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 ${
                fieldErrors.paymentMethod ? 'border-red-500' : 'border-gray-300'
              }`}
              required
            >
              <option value="CASH">Cash</option>
              <option value="BANK_TRANSFER">Bank Transfer</option>
              <option value="CHECK">Check</option>
              <option value="CREDIT_CARD">Credit Card</option>
              <option value="DEBIT_CARD">Debit Card</option>
              <option value="OTHER">Other</option>
            </select>
            {fieldErrors.paymentMethod && (
              <p className="mt-1 text-sm text-red-600">{fieldErrors.paymentMethod}</p>
            )}
          </div>
          <div>
            <label htmlFor="note" className="block text-sm font-medium text-gray-700 mb-1">
              Reference / Note
            </label>
            <input
              type="text"
              id="note"
              name="note"
              value={formData.note}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              placeholder="Optional reference number"
            />
          </div>
        </div>

        <div className="flex justify-end gap-3">
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
            {loading ? 'Adding Payment...' : 'Add Payment'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default PaymentForm;
