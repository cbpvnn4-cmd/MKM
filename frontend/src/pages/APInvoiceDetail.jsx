import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { FileText, ArrowRight, Loader2, X, Receipt, ShoppingCart, User } from 'lucide-react';
import Layout from '../components/Layout';
import APInvoiceForm from '../components/APInvoiceForm';
import { getAPInvoice, getSuppliers, getPurchaseOrders } from '../services/api';

const APInvoiceDetail = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const [apInvoice, setAPInvoice] = useState(null);
  const [suppliers, setSuppliers] = useState([]);
  const [purchaseOrders, setPurchaseOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchSuppliers();
    fetchPurchaseOrders();
    if (id && id !== 'new') {
      fetchAPInvoice();
    }
  }, [id]);

  const fetchSuppliers = async () => {
    try {
      const data = await getSuppliers();
      setSuppliers(data);
    } catch (err) {
      console.error('Error fetching suppliers:', err);
    }
  };

  const fetchPurchaseOrders = async () => {
    try {
      const data = await getPurchaseOrders();
      setPurchaseOrders(data);
    } catch (err) {
      console.error('Error fetching purchase orders:', err);
    }
  };

  const fetchAPInvoice = async () => {
    try {
      setLoading(true);
      const data = await getAPInvoice(id);
      setAPInvoice(data);
      setError(null);
    } catch (err) {
      setError('فشل في تحميل فاتورة الدفع');
      console.error('Error fetching AP invoice:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = (savedAPInvoice) => {
    navigate('/ap-invoices');
  };

  const handleCancel = () => {
    navigate('/ap-invoices');
  };

  if (loading) {
    return (
      <Layout>
        <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-red-50">
          <div className="max-w-6xl mx-auto p-6">
            {/* Header */}
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 p-8 mb-8">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4 rtl:space-x-reverse">
                  <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-red-600 rounded-xl flex items-center justify-center">
                    <Receipt className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h1 className="text-3xl font-bold text-gray-800">تفاصيل فاتورة الدفع</h1>
                    <p className="text-gray-600 mt-1">عرض وتعديل معلومات الفاتورة</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Loading Card */}
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 p-12">
              <div className="flex flex-col items-center justify-center space-y-4">
                <Loader2 className="w-12 h-12 text-orange-500 animate-spin" />
                <div className="text-xl font-semibold text-gray-700">جاري تحميل فاتورة الدفع...</div>
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
        <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-red-50">
          <div className="max-w-6xl mx-auto p-6">
            {/* Header */}
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 p-8 mb-8">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4 rtl:space-x-reverse">
                  <div className="w-12 h-12 bg-gradient-to-br from-red-500 to-pink-600 rounded-xl flex items-center justify-center">
                    <X className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h1 className="text-3xl font-bold text-gray-800">تفاصيل فاتورة الدفع</h1>
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
                  className="inline-flex items-center px-8 py-3 bg-gradient-to-r from-orange-500 to-red-600 text-white font-semibold rounded-xl hover:from-orange-600 hover:to-red-700 transform hover:scale-105 transition-all duration-200 shadow-lg hover:shadow-xl"
                >
                  <ArrowRight className="w-5 h-5 ml-2" />
                  العودة إلى فواتير الدفع
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
      <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-red-50">
        <div className="max-w-6xl mx-auto p-6">
          {/* Header */}
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 p-8 mb-8">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4 rtl:space-x-reverse">
                <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-red-600 rounded-xl flex items-center justify-center">
                  <Receipt className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h1 className="text-3xl font-bold text-gray-800">تفاصيل فاتورة الدفع</h1>
                  <p className="text-gray-600 mt-1">
                    {id === 'new' ? 'إنشاء فاتورة دفع جديدة' : 'عرض وتعديل معلومات الفاتورة'}
                  </p>
                </div>
              </div>
              <div className="flex items-center space-x-3 rtl:space-x-reverse">
                {id !== 'new' && (
                  <span className="px-4 py-2 bg-orange-100 text-orange-800 rounded-full text-sm font-medium">
                    معلومات الفاتورة
                  </span>
                )}
                {id === 'new' && (
                  <span className="px-4 py-2 bg-green-100 text-green-800 rounded-full text-sm font-medium">
                    فاتورة جديدة
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Quick Info Cards */}
          {!loading && !error && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">الموردين المتاحين</p>
                    <p className="text-2xl font-bold text-blue-600">{suppliers.length}</p>
                  </div>
                  <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                    <User className="w-6 h-6 text-blue-600" />
                  </div>
                </div>
              </div>

              <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">أوامر الشراء</p>
                    <p className="text-2xl font-bold text-purple-600">{purchaseOrders.length}</p>
                  </div>
                  <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
                    <ShoppingCart className="w-6 h-6 text-purple-600" />
                  </div>
                </div>
              </div>

              <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">نوع العملية</p>
                    <p className="text-lg font-bold text-orange-600">
                      {id === 'new' ? 'إنشاء جديد' : 'تعديل موجود'}
                    </p>
                  </div>
                  <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center">
                    <FileText className="w-6 h-6 text-orange-600" />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Invoice Form */}
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 p-8">
            <div className="mb-6">
              <h2 className="text-xl font-bold text-gray-800 mb-2">
                {id === 'new' ? 'إنشاء فاتورة دفع جديدة' : 'تعديل فاتورة الدفع'}
              </h2>
              <p className="text-gray-600">
                {id === 'new'
                  ? 'قم بملء جميع البيانات المطلوبة لإنشاء فاتورة دفع جديدة'
                  : 'يمكنك تعديل بيانات الفاتورة أدناه'
                }
              </p>
            </div>

            <APInvoiceForm
              apInvoice={apInvoice}
              suppliers={suppliers}
              purchaseOrders={purchaseOrders}
              onSave={handleSave}
              onCancel={handleCancel}
            />
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default APInvoiceDetail;