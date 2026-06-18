import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Layout from '../components/Layout';
import ServiceTicketForm from '../components/ServiceTicketForm';
import { getServiceTicket, getCustomers } from '../services/api';

const ServiceTicketDetail = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const [serviceTicket, setServiceTicket] = useState(null);
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchCustomers();
    if (id && id !== 'new') {
      fetchServiceTicket();
    }
  }, [id]);

  const fetchCustomers = async () => {
    try {
      const data = await getCustomers();
      setCustomers(data);
    } catch (err) {
      console.error('Error fetching customers:', err);
    }
  };

  const fetchServiceTicket = async () => {
    try {
      setLoading(true);
      const data = await getServiceTicket(id);
      setServiceTicket(data);
      setError(null);
    } catch (err) {
      setError('Failed to fetch service ticket');
      console.error('Error fetching service ticket:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = () => {
    navigate('/service-tickets');
  };

  const handleCancel = () => {
    navigate('/service-tickets');
  };

  if (loading && id && id !== 'new') {
    return (
      <Layout>
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-gray-800">
              {id === 'new' ? 'Create Service Ticket' : 'Edit Service Ticket'}
            </h2>
          </div>
          <div>Loading service ticket...</div>
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
              {id === 'new' ? 'Create Service Ticket' : 'Edit Service Ticket'}
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
            {id === 'new' ? 'Create Service Ticket' : 'Edit Service Ticket'}
          </h2>
        </div>
        
        <ServiceTicketForm
          serviceTicket={serviceTicket}
          customers={customers}
          onSave={handleSave}
          onCancel={handleCancel}
        />
      </div>
    </Layout>
  );
};

export default ServiceTicketDetail;