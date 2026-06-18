import React, { useState, useEffect, useMemo } from 'react';
import Layout from '../components/Layout';
import { getServiceLogs, deleteServiceLog } from '../services/api';
import { useConfirmations } from '../components/ui/ConfirmDialog';

const ServiceLogs = () => {
  const { confirmDelete } = useConfirmations();
  const [serviceLogs, setServiceLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterField, setFilterField] = useState('all');

  useEffect(() => {
    fetchServiceLogs();
  }, []);

  const fetchServiceLogs = async () => {
    try {
      setLoading(true);
      const data = await getServiceLogs();
      setServiceLogs(data);
      setError(null);
    } catch (err) {
      setError('Failed to fetch service logs');
      console.error('Error fetching service logs:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    const confirmed = await confirmDelete('Are you sure you want to delete this service log?');
    if (confirmed) {
      try {
        await deleteServiceLog(id);
        fetchServiceLogs(); // Refresh the list
      } catch (err) {
        setError('Failed to delete service log');
        console.error('Error deleting service log:', err);
      }
    }
  };

  // Filter and search service logs
  const filteredServiceLogs = useMemo(() => {
    let result = serviceLogs;
    
    // Apply search term
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      
      switch (filterField) {
        case 'ticket_no':
          result = result.filter(log => 
            (log.service_ticket?.ticket_no || log.ticketNo)?.toLowerCase().includes(searchLower)
          );
          break;
        case 'description':
          result = result.filter(log => 
            log.description?.toLowerCase().includes(searchLower)
          );
          break;
        case 'technician':
          result = result.filter(log => 
            (log.technician_name || log.technician)?.toLowerCase().includes(searchLower)
          );
          break;
        default:
          // Search all fields
          result = result.filter(log => 
            (log.service_ticket?.ticket_no || log.ticketNo)?.toLowerCase().includes(searchLower) ||
            log.description?.toLowerCase().includes(searchLower) ||
            (log.technician_name || log.technician)?.toLowerCase().includes(searchLower)
          );
      }
    }
    
    return result;
  }, [serviceLogs, searchTerm, filterField]);

  if (loading) {
    return (
      <Layout>
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-gray-800">Service Logs</h2>
          </div>
          <div>Loading service logs...</div>
        </div>
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout>
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-gray-800">Service Logs</h2>
          </div>
          <div className="text-red-500">{error}</div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-800">Service Logs</h2>
          <button 
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
            onClick={() => window.location.href = '/service-logs/new'}
          >
            Add New Log
          </button>
        </div>
        
        {/* Search and Filter Controls */}
        <div className="mb-6 flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <input
                type="text"
                placeholder="Search service logs..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                >
                  <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>
          </div>
          <div>
            <select
              value={filterField}
              onChange={(e) => setFilterField(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">All Fields</option>
              <option value="ticket_no">Ticket No</option>
              <option value="description">Description</option>
              <option value="technician">Technician</option>
            </select>
          </div>
        </div>
        
        {/* Results Count */}
        <div className="mb-4 text-sm text-gray-500">
          Showing {filteredServiceLogs.length} of {serviceLogs.length} service logs
        </div>
        
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Ticket No
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Log Date
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Technician
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Hours Spent
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Description
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredServiceLogs.length === 0 ? (
                <tr>
                  <td colSpan="6" className="px-6 py-4 text-center text-gray-500">
                    {searchTerm ? 'No service logs match your search criteria' : 'No service logs found'}
                  </td>
                </tr>
              ) : (
                filteredServiceLogs.map((log) => (
                  <tr key={log.id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {log.service_ticket?.ticket_no || log.ticketNo}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-500">
                        {log.log_date ? new Date(log.log_date).toLocaleDateString() : ''}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-500">
                        {log.technician_name || log.technician}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-500">
                        {log.hours_spent || log.hoursSpent || 0}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-500 max-w-md truncate">
                        {log.description}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <button 
                        className="text-blue-600 hover:text-blue-900 mr-3"
                        onClick={() => window.location.href = `/service-logs/${log.id}/edit`}
                      >
                        Edit
                      </button>
                      <button 
                        className="text-red-600 hover:text-red-900"
                        onClick={() => handleDelete(log.id)}
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </Layout>
  );
};

export default ServiceLogs;