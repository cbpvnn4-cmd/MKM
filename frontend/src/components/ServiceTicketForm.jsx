import React, { useState, useEffect } from 'react';
import { createServiceTicket, updateServiceTicket } from '../services/api';

const ServiceTicketForm = ({ serviceTicket, customers, onSave, onCancel }) => {
  const [formData, setFormData] = useState({
    ticket_no: serviceTicket?.ticket_no || '',
    customer_id: serviceTicket?.customer_id || serviceTicket?.customer || '',
    title: serviceTicket?.title || '',
    description: serviceTicket?.description || '',
    priority: serviceTicket?.priority || 'MEDIUM',
    status: serviceTicket?.status || 'OPEN',
    assigned_to: serviceTicket?.assigned_to || '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [fieldErrors, setFieldErrors] = useState({});

  useEffect(() => {
    if (serviceTicket) {
      setFormData({
        ticket_no: serviceTicket.ticket_no || '',
        customer_id: serviceTicket.customer_id || serviceTicket.customer || '',
        title: serviceTicket.title || '',
        description: serviceTicket.description || '',
        priority: serviceTicket.priority || 'MEDIUM',
        status: serviceTicket.status || 'OPEN',
        assigned_to: serviceTicket.assigned_to || '',
      });
    }
  }, [serviceTicket]);

  const validateForm = () => {
    const errors = {};
    
    // Validate ticket number
    if (!formData.ticket_no.trim()) {
      errors.ticket_no = 'Ticket number is required';
    } else if (formData.ticket_no.length < 2) {
      errors.ticket_no = 'Ticket number must be at least 2 characters';
    }
    
    // Validate customer ID
    if (!formData.customer_id) {
      errors.customer_id = 'Customer is required';
    }
    
    // Validate title
    if (!formData.title.trim()) {
      errors.title = 'Title is required';
    } else if (formData.title.length < 3) {
      errors.title = 'Title must be at least 3 characters';
    }
    
    // Validate description
    if (formData.description && formData.description.length > 1000) {
      errors.description = 'Description must be less than 1000 characters';
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
      if (serviceTicket) {
        // Update existing service ticket
        result = await updateServiceTicket(serviceTicket.id, formData);
      } else {
        // Create new service ticket
        result = await createServiceTicket(formData);
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
        setError(err.response?.data?.detail || 'Failed to save service ticket');
      }
      console.error('Error saving service ticket:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h2 className="text-2xl font-bold text-gray-800 mb-6">
        {serviceTicket ? 'Edit Service Ticket' : 'Add New Service Ticket'}
      </h2>
      {error && (
        <div className="mb-4 text-red-500 bg-red-50 p-3 rounded">
          {error}
        </div>
      )}
      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div>
            <label htmlFor="ticket_no" className="block text-sm font-medium text-gray-700 mb-1">
              Ticket Number *
            </label>
            <input
              type="text"
              id="ticket_no"
              name="ticket_no"
              value={formData.ticket_no}
              onChange={handleChange}
              className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 ${
                fieldErrors.ticket_no ? 'border-red-500' : 'border-gray-300'
              }`}
              required
            />
            {fieldErrors.ticket_no && (
              <p className="mt-1 text-sm text-red-600">{fieldErrors.ticket_no}</p>
            )}
          </div>
          <div>
            <label htmlFor="customer_id" className="block text-sm font-medium text-gray-700 mb-1">
              Customer *
            </label>
            <select
              id="customer_id"
              name="customer_id"
              value={formData.customer_id}
              onChange={handleChange}
              className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 ${
                fieldErrors.customer_id ? 'border-red-500' : 'border-gray-300'
              }`}
              required
            >
              <option value="">Select a customer</option>
              {customers.map(customer => (
                <option key={customer.id} value={customer.id}>
                  {customer.name}
                </option>
              ))}
            </select>
            {fieldErrors.customer_id && (
              <p className="mt-1 text-sm text-red-600">{fieldErrors.customer_id}</p>
            )}
          </div>
          <div>
            <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">
              Title *
            </label>
            <input
              type="text"
              id="title"
              name="title"
              value={formData.title}
              onChange={handleChange}
              className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 ${
                fieldErrors.title ? 'border-red-500' : 'border-gray-300'
              }`}
              required
            />
            {fieldErrors.title && (
              <p className="mt-1 text-sm text-red-600">{fieldErrors.title}</p>
            )}
          </div>
          <div>
            <label htmlFor="priority" className="block text-sm font-medium text-gray-700 mb-1">
              Priority
            </label>
            <select
              id="priority"
              name="priority"
              value={formData.priority}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="LOW">Low</option>
              <option value="MEDIUM">Medium</option>
              <option value="HIGH">High</option>
              <option value="URGENT">Urgent</option>
            </select>
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
              <option value="OPEN">Open</option>
              <option value="IN_PROGRESS">In Progress</option>
              <option value="ON_HOLD">On Hold</option>
              <option value="RESOLVED">Resolved</option>
              <option value="CLOSED">Closed</option>
            </select>
          </div>
          <div className="md:col-span-2">
            <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea
              id="description"
              name="description"
              rows={4}
              value={formData.description}
              onChange={handleChange}
              className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 ${
                fieldErrors.description ? 'border-red-500' : 'border-gray-300'
              }`}
            />
            {fieldErrors.description && (
              <p className="mt-1 text-sm text-red-600">{fieldErrors.description}</p>
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
            {loading ? 'Saving...' : 'Save Service Ticket'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default ServiceTicketForm;