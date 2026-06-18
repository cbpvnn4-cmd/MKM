import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Layout from '../components/Layout';
import ExpenseForm from '../components/ExpenseForm';
import { getExpense } from '../services/api';

const ExpenseDetail = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const [expense, setExpense] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (id && id !== 'new') {
      fetchExpense();
    }
  }, [id]);

  const fetchExpense = async () => {
    try {
      setLoading(true);
      const data = await getExpense(id);
      setExpense(data);
      setError(null);
    } catch (err) {
      setError('Failed to fetch expense');
      console.error('Error fetching expense:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = () => {
    navigate('/expenses');
  };

  const handleCancel = () => {
    navigate('/expenses');
  };

  if (loading && id && id !== 'new') {
    return (
      <Layout>
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-gray-800">
              {id === 'new' ? 'Create Expense' : 'Edit Expense'}
            </h2>
          </div>
          <div>Loading expense...</div>
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
              {id === 'new' ? 'Create Expense' : 'Edit Expense'}
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
            {id === 'new' ? 'Create Expense' : 'Edit Expense'}
          </h2>
        </div>
        
        <ExpenseForm
          expense={expense}
          onSave={handleSave}
          onCancel={handleCancel}
        />
      </div>
    </Layout>
  );
};

export default ExpenseDetail;