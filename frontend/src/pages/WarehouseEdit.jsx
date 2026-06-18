import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Building2, MapPin, Package, Archive, Edit } from 'lucide-react';
import Layout from '../components/Layout';
import WarehouseForm from '../components/WarehouseForm';
import { getWarehouse } from '../services/api';

const WarehouseEdit = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [warehouse, setWarehouse] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchWarehouse();
  }, [id]);

  const fetchWarehouse = async () => {
    try {
      setLoading(true);
      const data = await getWarehouse(id);
      setWarehouse(data);
      setError(null);
    } catch (err) {
      setError('فشل في تحميل بيانات المخزن');
      console.error('Error fetching warehouse:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = (updatedWarehouse) => {
    // Navigate back to warehouses list after successful update
    navigate('/warehouses');
  };

  const handleCancel = () => {
    // Navigate back to warehouses list if user cancels
    navigate('/warehouses');
  };

  if (loading) {
    return (
      <Layout>
        <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-blue-50" dir="rtl">
          <div className="max-w-5xl mx-auto p-6">
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 p-8">
              <div className="flex items-center justify-center space-y-4">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                <div className="text-xl font-semibold text-gray-700 mr-4">جاري تحميل بيانات المخزن...</div>
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
        <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-blue-50" dir="rtl">
          <div className="max-w-5xl mx-auto p-6">
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 p-8">
              <div className="text-center">
                <div className="text-red-600 text-lg mb-4">{error}</div>
                <button
                  onClick={fetchWarehouse}
                  className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white font-semibold rounded-xl hover:from-blue-600 hover:to-purple-700 transform hover:scale-105 transition-all duration-200 shadow-lg hover:shadow-xl"
                >
                  إعادة المحاولة
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
      <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-blue-50" dir="rtl">
        <div className="max-w-5xl mx-auto p-6">
          {/* Header Section */}
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 p-8 mb-8">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4 rtl:space-x-reverse">
                <button
                  onClick={() => navigate('/warehouses')}
                  className="w-12 h-12 bg-gradient-to-br from-gray-400 to-gray-600 rounded-xl flex items-center justify-center hover:from-gray-500 hover:to-gray-700 transition-all duration-200"
                >
                  <ArrowLeft className="w-6 h-6 text-white" />
                </button>
                <div className="w-12 h-12 bg-gradient-to-br from-amber-500 to-orange-600 rounded-xl flex items-center justify-center">
                  <Edit className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h1 className="text-3xl font-bold text-gray-800">تعديل المخزن</h1>
                  <p className="text-gray-600 mt-1">قم بتحديث بيانات المخزن: {warehouse?.name}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Info Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">الاسم الحالي</p>
                  <p className="text-2xl font-bold text-blue-600">{warehouse?.name}</p>
                  <p className="text-xs text-gray-500 mt-1">يمكن تعديله</p>
                </div>
                <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                  <Archive className="w-6 h-6 text-blue-600" />
                </div>
              </div>
            </div>

            <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">السعة الحالية</p>
                  <p className="text-2xl font-bold text-emerald-600">
                    {warehouse?.capacity ? parseFloat(warehouse.capacity).toLocaleString('en-US') : '0'}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">يمكن تعديلها</p>
                </div>
                <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center">
                  <Package className="w-6 h-6 text-emerald-600" />
                </div>
              </div>
            </div>

            <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">الموقع الحالي</p>
                  <p className="text-2xl font-bold text-purple-600">{warehouse?.location || 'غير محدد'}</p>
                  <p className="text-xs text-gray-500 mt-1">يمكن تحديثه</p>
                </div>
                <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
                  <MapPin className="w-6 h-6 text-purple-600" />
                </div>
              </div>
            </div>
          </div>

          {/* Form Section */}
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 overflow-hidden">
            <div className="bg-gradient-to-r from-amber-500 to-orange-600 px-8 py-6">
              <h2 className="text-xl font-bold text-white">تحديث بيانات المخزن</h2>
              <p className="text-amber-100 mt-1">قم بتعديل الحقول المطلوبة واحفظ التغييرات</p>
            </div>

            <div className="p-8">
              <WarehouseForm
                warehouse={warehouse}
                onSave={handleSave}
                onCancel={handleCancel}
              />
            </div>
          </div>

          {/* Tips Section */}
          <div className="mt-8 bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">💡 نصائح التعديل</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-start space-x-3 rtl:space-x-reverse">
                <div className="w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
                <div>
                  <p className="text-sm font-medium text-gray-700">تعديل السعة</p>
                  <p className="text-xs text-gray-600">تأكد من أن السعة الجديدة تتناسب مع المخزون الحالي</p>
                </div>
              </div>
              <div className="flex items-start space-x-3 rtl:space-x-reverse">
                <div className="w-2 h-2 bg-emerald-500 rounded-full mt-2"></div>
                <div>
                  <p className="text-sm font-medium text-gray-700">تحديث الموقع</p>
                  <p className="text-xs text-gray-600">الموقع المحدث سيظهر في جميع التقارير والوثائق</p>
                </div>
              </div>
              <div className="flex items-start space-x-3 rtl:space-x-reverse">
                <div className="w-2 h-2 bg-purple-500 rounded-full mt-2"></div>
                <div>
                  <p className="text-sm font-medium text-gray-700">تغيير الاسم</p>
                  <p className="text-xs text-gray-600">اسم المخزن الجديد سيظهر في جميع أنحاء النظام</p>
                </div>
              </div>
              <div className="flex items-start space-x-3 rtl:space-x-reverse">
                <div className="w-2 h-2 bg-amber-500 rounded-full mt-2"></div>
                <div>
                  <p className="text-sm font-medium text-gray-700">حفظ التغييرات</p>
                  <p className="text-xs text-gray-600">التغييرات ستطبق فوراً على النظام</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default WarehouseEdit;