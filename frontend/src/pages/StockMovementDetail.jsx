import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Layout from '../components/Layout';
import StockMovementForm from '../components/StockMovementForm';
import { getStockMovement, getProducts, getWarehouses } from '../services/api';

const StockMovementDetail = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const [stockMovement, setStockMovement] = useState(null);
  const [products, setProducts] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchProducts();
    fetchWarehouses();
    if (id && id !== 'new') {
      fetchStockMovement();
    }
  }, [id]);

  const fetchProducts = async () => {
    try {
      const data = await getProducts();
      setProducts(data);
    } catch (err) {
      console.error('Error fetching products:', err);
    }
  };

  const fetchWarehouses = async () => {
    try {
      const data = await getWarehouses();
      setWarehouses(data);
    } catch (err) {
      console.error('Error fetching warehouses:', err);
    }
  };

  const fetchStockMovement = async () => {
    try {
      setLoading(true);
      const data = await getStockMovement(id);
      setStockMovement(data);
      setError(null);
    } catch (err) {
      setError('Failed to fetch stock movement');
      console.error('Error fetching stock movement:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = (savedStockMovement) => {
    navigate('/stock-movements');
  };

  const handleCancel = () => {
    navigate('/stock-movements');
  };

  if (loading) {
    return (
      <Layout>
        <div className="bg-white rounded-lg shadow-md p-6">
          <div>Loading stock movement...</div>
        </div>
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout>
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="text-red-500 mb-4">{error}</div>
          <button
            onClick={handleCancel}
            className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Back to Stock Movements
          </button>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <StockMovementForm 
        stockMovement={stockMovement} 
        products={products}
        warehouses={warehouses}
        onSave={handleSave} 
        onCancel={handleCancel} 
      />
    </Layout>
  );
};

export default StockMovementDetail;