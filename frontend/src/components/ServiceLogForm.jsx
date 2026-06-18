import React, { useState, useEffect } from 'react';
import { createServiceLog, updateServiceLog } from '../services/api';

const ServiceLogForm = ({ serviceLog, serviceTickets, technicians, onSave, onCancel }) => {
  const [formData, setFormData] = useState({
    service_ticket_id: serviceLog?.service_ticket_id || serviceLog?.serviceTicket || '',
    log_date: serviceLog?.log_date || serviceLog?.logDate || new Date().toISOString().split('T')[0],
    technician_id: serviceLog?.technician_id || serviceLog?.technician || '',
    hours_spent: serviceLog?.hours_spent || serviceLog?.hoursSpent || 0,
    description: serviceLog?.description || '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [fieldErrors, setFieldErrors] = useState({});

  useEffect(() => {
    if (serviceLog) {
      setFormData({
        service_ticket_id: serviceLog.service_ticket_id || serviceLog.serviceTicket || '',
        log_date: serviceLog.log_date || serviceLog.logDate || new Date().toISOString().split('T')[0],
        technician_id: serviceLog.technician_id || serviceLog.technician || '',
        hours_spent: serviceLog.hours_spent || serviceLog.hoursSpent || 0,
        description: serviceLog.description || '',
      });
    }
  }, [serviceLog]);

  const validateForm = () => {
    const errors = {};
    
    // Validate service ticket
    if (!formData.service_ticket_id) {
      errors.service_ticket_id = 'Service ticket is required';
    }
    
    // Validate log date
    if (!formData.log_date) {
      errors.log_date = 'Log date is required';
    }
    
    // Validate hours spent
    if (formData.hours_spent < 0) {
      errors.hours_spent = 'Hours spent cannot be negative';
    }
    
    // Validate description
    if (!formData.description.trim()) {
      errors.description = 'Description is required';
    } else if (formData.description.length < 10) {
      errors.description = 'Description must be at least 10 characters';
    } else if (formData.description.length > 1000) {
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
      if (serviceLog) {
        // Update existing service log
        result = await updateServiceLog(serviceLog.id, formData);
      } else {
        // Create new service log
        result = await createServiceLog(formData);
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
        setError(err.response?.data?.detail || 'Failed to save service log');
      }
      console.error('Error saving service log:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h2 className="text-2xl font-bold text-gray-800 mb-6">
        {serviceLog ? 'Edit Service Log' : 'Add New Service Log'}
      </h2>
      {error && (
        <div className="mb-4 text-red-500 bg-red-50 p-3 rounded">
          {error}
        </div>
      )}
      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div>
            <label htmlFor="service_ticket_id" className="block text-sm font-medium text-gray-700 mb-1">
              Service Ticket *
            </label>
            <select
              id="service_ticket_id"
              name="service_ticket_id"
              value={formData.service_ticket_id}
              onChange={handleChange}
              className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 ${
                fieldErrors.service_ticket_id ? 'border-red-500' : 'border-gray-300'
              }`}
              required
            >
              <option value="">Select a service ticket</option>
              {serviceTickets.map(ticket => (
                <option key={ticket.id} value={ticket.id}>
                  {ticket.ticket_no} - {ticket.title}
                </option>
              ))}
            </select>
            {fieldErrors.service_ticket_id && (
              <p className="mt-1 text-sm text-red-600">{fieldErrors.service_ticket_id}</p>
            )}
          </div>
          <div>
            <label htmlFor="log_date" className="block text-sm font-medium text-gray-700 mb-1">
              Log Date *
            </label>
            <input
              type="date"
              id="log_date"
              name="log_date"
              value={formData.log_date}
              onChange={handleChange}
              className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 ${
                fieldErrors.log_date ? 'border-red-500' : 'border-gray-300'
              }`}
              required
            />
            {fieldErrors.log_date && (
              <p className="mt-1 text-sm text-red-600">{fieldErrors.log_date}</p>
            )}
          </div>
          <div>
            <label htmlFor="technician_id" className="block text-sm font-medium text-gray-700 mb-1">
              Technician
            </label>
            <select
              id="technician_id"
              name="technician_id"
              value={formData.technician_id}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Select a technician (optional)</option>
              {technicians.map(technician => (
                <option key={technician.id} value={technician.id}>
                  {technician.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="hours_spent" className="block text-sm font-medium text-gray-700 mb-1">
              Hours Spent
            </label>
            <input
              type="number"
              id="hours_spent"
              name="hours_spent"
              value={formData.hours_spent}
              onChange={handleChange}
              min="0"
              step="0.5"
              className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 ${
                fieldErrors.hours_spent ? 'border-red-500' : 'border-gray-300'
              }`}
            />
            {fieldErrors.hours_spent && (
              <p className="mt-1 text-sm text-red-600">{fieldErrors.hours_spent}</p>
            )}
          </div>
          <div className="md:col-span-2">
            <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
              Description *
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
              required
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
            {loading ? 'Saving...' : 'Save Service Log'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default ServiceLogForm;