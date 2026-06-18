import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Layout from '../components/Layout';
import InvoiceForm from '../components/InvoiceForm';
import { getInvoice, getSalesOrder } from '../services/api';

const InvoiceDetail = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const [invoice, setInvoice] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [prefillInvoice, setPrefillInvoice] = useState(null);

  const isEditMode = id && id !== 'new';
  const invoiceId = isEditMode ? id : null;

  useEffect(() => {
    if (!invoiceId) {
      // إنشاء فاتورة جديدة فارغة
      setPrefillInvoice({
        invoiceNo: '',
        customer: '',
        issueDate: new Date().toISOString().split('T')[0],
        dueDate: '',
        status: 'DRAFT',
        tax: 0,
        items: [{ id: Date.now(), description: '', qty: 1, unitPrice: 0 }],
        payments: [],
        total: 0,
        paid: 0,
        balance: 0,
      });
      setLoading(false);
      return;
    }

    // تحميل فاتورة موجودة
    const loadInvoice = async () => {
      try {
        setLoading(true);
        const data = await getInvoice(invoiceId);
        setInvoice(data);
        setError(null);
      } catch (err) {
        setError('فشل في تحميل بيانات الفاتورة');
        console.error('خطأ تحميل الفاتورة:', err);
      } finally {
        setLoading(false);
      }
    };

    loadInvoice();
  }, [invoiceId]);

  const handleSave = (savedInvoice) => {
    navigate('/invoices');
  };

  const handleCancel = () => {
    navigate('/invoices');
  };

  if (loading) {
    return (
      <Layout>
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
            <p className="text-gray-600">جارٍ تحميل الفاتورة...</p>
          </div>
        </div>
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout>
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-red-600 mb-4">خطأ في التحميل</h2>
            <p className="text-gray-600 mb-6">{error}</p>
            <button
              onClick={handleCancel}
              className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700"
            >
              العودة إلى الفواتير
            </button>
          </div>
        </div>
      </Layout>
    );
  }

  const activeInvoice = isEditMode ? invoice : prefillInvoice;

  return (
    <Layout>
      <div className="max-w-5xl mx-auto p-6">
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-bold text-gray-800">
              {isEditMode ? 'تعديل الفاتورة' : 'إضافة فاتورة جديدة'}
            </h1>
            <button
              onClick={handleCancel}
              className="bg-gray-500 text-white px-4 py-2 rounded-lg hover:bg-gray-600"
            >
              رجوع
            </button>
          </div>

          {activeInvoice ? (
            <InvoiceForm
              invoice={activeInvoice}
              onSave={handleSave}
              onCancel={handleCancel}
            />
          ) : (
            <div className="text-center py-8">
              <p className="text-gray-600">جارٍ تحميل النموذج...</p>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
};

export default InvoiceDetail;