import React from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowRight, User, Edit3, Save, X, Loader2 } from 'lucide-react';
import Layout from '../components/Layout';
import CustomerForm from '../components/CustomerForm';
import { getCustomer } from '../services/api';

const CustomerDetail = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const [customer, setCustomer] = React.useState(null);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState(null);

  React.useEffect(() => {
    if (id && id !== 'new') {
      fetchCustomer();
    } else if (id === 'new') {
      setCustomer(null);
      setLoading(false);
    }
  }, [id]);

  const fetchCustomer = async () => {
    try {
      setLoading(true);
      console.log('Fetching customer with ID:', id);
      const data = await getCustomer(id);
      console.log('Customer data received:', data);
      setCustomer(data);
      setError(null);
    } catch (err) {
      console.error('Error fetching customer:', err);
      console.error('Error details:', {
        message: err.message,
        response: err.response,
        status: err.response?.status,
        data: err.response?.data
      });

      if (err.response?.status === 404) {
        setError('العميل غير موجود في النظام');
      } else if (err.response?.status >= 500) {
        setError('خطأ في الخادم - يرجى المحاولة لاحقاً');
      } else if (err.code === 'NETWORK_ERROR' || !err.response) {
        setError('خطأ في الاتصال بالخادم - تأكد من تشغيل النظام');
      } else {
        setError(`فشل في تحميل بيانات العميل: ${err.response?.data?.detail || err.message}`);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (savedCustomer) => {
    // Redirect to customers list after save
    navigate('/customers');
  };

  const handleCancel = () => {
    navigate('/customers');
  };

  if (loading) {
    return (
      <Layout>
        <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
          <div className="max-w-6xl mx-auto p-6">
            {/* Header */}
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 p-8 mb-8">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4 rtl:space-x-reverse">
                  <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center">
                    <User className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h1 className="text-3xl font-bold text-gray-800">تفاصيل العميل</h1>
                    <p className="text-gray-600 mt-1">عرض وتعديل معلومات العميل</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Loading Card */}
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 p-12">
              <div className="flex flex-col items-center justify-center space-y-4">
                <Loader2 className="w-12 h-12 text-blue-500 animate-spin" />
                <div className="text-xl font-semibold text-gray-700">جاري تحميل بيانات العميل...</div>
                <div className="text-gray-500">يرجى الانتظار قليلاً</div>
              </div>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout>
        <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
          <div className="max-w-6xl mx-auto p-6">
            {/* Header */}
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 p-8 mb-8">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4 rtl:space-x-reverse">
                  <div className="w-12 h-12 bg-gradient-to-br from-red-500 to-pink-600 rounded-xl flex items-center justify-center">
                    <X className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h1 className="text-3xl font-bold text-gray-800">تفاصيل العميل</h1>
                    <p className="text-gray-600 mt-1">حدث خطأ في تحميل البيانات</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Error Card */}
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 p-8">
              <div className="text-center">
                <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
                  <X className="w-10 h-10 text-red-500" />
                </div>
                <h2 className="text-2xl font-bold text-gray-800 mb-4">خطأ في التحميل</h2>
                <div className="text-red-600 text-lg mb-8">{error}</div>
                <button
                  onClick={handleCancel}
                  className="inline-flex items-center px-8 py-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white font-semibold rounded-xl hover:from-blue-600 hover:to-purple-700 transform hover:scale-105 transition-all duration-200 shadow-lg hover:shadow-xl"
                >
                  <ArrowRight className="w-5 h-5 ml-2" />
                  العودة إلى قائمة العملاء
                </button>
              </div>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
        <div className="max-w-6xl mx-auto p-6">
          {/* Header */}
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 p-8 mb-8">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4 rtl:space-x-reverse">
                <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center">
                  <User className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h1 className="text-3xl font-bold text-gray-800">تفاصيل العميل</h1>
                  <p className="text-gray-600 mt-1">عرض وتعديل معلومات العميل</p>
                </div>
              </div>
              <div className="flex items-center space-x-3 rtl:space-x-reverse">
                <span className="px-4 py-2 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">
                  معلومات العميل
                </span>
              </div>
            </div>
          </div>

          {/* Customer Form */}
          <CustomerForm
            customer={customer}
            onSave={handleSave}
            onCancel={handleCancel}
          />
        </div>
      </div>
    </Layout>
  );
};

export default CustomerDetail;