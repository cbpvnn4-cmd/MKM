import React from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Layout from '../components/Layout';
import ProductForm from '../components/ProductForm';
import { getProduct } from '../services/api';

const ProductDetail = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const [product, setProduct] = React.useState(null);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState(null);

  React.useEffect(() => {
    if (id && id !== 'new') {
      fetchProduct();
    }
  }, [id]);

  const fetchProduct = async () => {
    try {
      setLoading(true);
      const data = await getProduct(id);
      setProduct(data);
      setError(null);
    } catch (err) {
      const errorMessage = err?.response?.data?.detail ||
                          err?.response?.data?.message ||
                          err?.message ||
                          'Failed to fetch product. Please try again.';
      setError(errorMessage);
      console.error('Error fetching product:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (savedProduct) => {
    // Redirect to products list after save
    navigate('/products');
  };

  const handleCancel = () => {
    navigate('/products');
  };

  if (loading) {
    return (
      <Layout>
        <div className="bg-white rounded-lg shadow-md p-6">
          <div>Loading product...</div>
        </div>
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout>
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="text-red-500">{error}</div>
          <button
            onClick={handleCancel}
            className="mt-4 px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
          >
            Back to Products
          </button>
        </div>
      </Layout>
    );
  }

  // For new products or after loading existing product
  if (id === 'new' || product || (!id)) {
    return (
      <Layout>
        <ProductForm
          product={product}
          onSave={handleSave}
          onCancel={handleCancel}
        />
      </Layout>
    );
  }

  // Still loading existing product
  return null;
};

export default ProductDetail;