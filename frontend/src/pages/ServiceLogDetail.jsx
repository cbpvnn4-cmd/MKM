import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Layout from '../components/Layout';
import ServiceLogForm from '../components/ServiceLogForm';
import { getServiceLog, getServiceTickets } from '../services/api';

const ServiceLogDetail = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const [serviceLog, setServiceLog] = useState(null);
  const [serviceTickets, setServiceTickets] = useState([]);
  const [technicians, setTechnicians] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchServiceTickets();
    // In a real application, you would also fetch technicians here
    // For now, we'll use a mock list of technicians
    setTechnicians([
      { id: 1, name: 'Ahmed Mohamed' },
      { id: 2, name: 'Ali Hassan' },
      { id: 3, name: 'Omar Khalid' },
    ]);
    
    if (id && id !== 'new') {
      fetchServiceLog();
    }
  }, [id]);

  const fetchServiceTickets = async () => {
    try {
      const data = await getServiceTickets();
      setServiceTickets(data);
    } catch (err) {
      console.error('Error fetching service tickets:', err);
    }
  };

  const fetchServiceLog = async () => {
    try {
      setLoading(true);
      const data = await getServiceLog(id);
      setServiceLog(data);
      setError(null);
    } catch (err) {
      setError('Failed to fetch service log');
      console.error('Error fetching service log:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = () => {
    navigate('/service-logs');
  };

  const handleCancel = () => {
    navigate('/service-logs');
  };

  if (loading && id && id !== 'new') {
    return (
      <Layout>
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-gray-800">
              {id === 'new' ? 'Create Service Log' : 'Edit Service Log'}
            </h2>
          </div>
          <div>Loading service log...</div>
        </div>
      </Layout>
    );
  }

  if (error && id && id !== 'new') {
    return (
      <Layout>
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-gray-800">
              {id === 'new' ? 'Create Service Log' : 'Edit Service Log'}
            </h2>
          </div>
          <div className="text-red-500">{error}</div>
          <button 
            className="mt-4 bg-gray-500 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded"
            onClick={handleCancel}
          >
            Back to List
          </button>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-800">
            {id === 'new' ? 'Create Service Log' : 'Edit Service Log'}
          </h2>
        </div>
        
        <ServiceLogForm 
          serviceLog={serviceLog}
          serviceTickets={serviceTickets}
          technicians={technicians}
          onSave={handleSave}
          onCancel={handleCancel}
        />
      </div>
    </Layout>
  );
};

export default ServiceLogDetail;