import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Building2, MapPin, Package, Archive } from 'lucide-react';
import Layout from '../components/Layout';
import WarehouseForm from '../components/WarehouseForm';

const WarehouseCreate = () => {
  const navigate = useNavigate();

  const handleSave = (newWarehouse) => {
    // Navigate back to warehouses list after successful creation
    navigate('/warehouses');
  };

  const handleCancel = () => {
    // Navigate back to warehouses list if user cancels
    navigate('/warehouses');
  };

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
                <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-blue-600 rounded-xl flex items-center justify-center">
                  <Building2 className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h1 className="text-3xl font-bold text-gray-800">إضافة مخزن جديد</h1>
                  <p className="text-gray-600 mt-1">قم بملء البيانات التالية لإضافة مخزن جديد إلى النظام</p>
                </div>
              </div>
            </div>
          </div>

          {/* Info Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">إجمالي المخازن</p>
                  <p className="text-3xl font-bold text-blue-600">+1</p>
                  <p className="text-xs text-gray-500 mt-1">سيتم إضافة مخزن جديد</p>
                </div>
                <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                  <Archive className="w-6 h-6 text-blue-600" />
                </div>
              </div>
            </div>

            <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">السعة التخزينية</p>
                  <p className="text-3xl font-bold text-emerald-600">0</p>
                  <p className="text-xs text-gray-500 mt-1">سيتم تحديدها حسب الإدخال</p>
                </div>
                <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center">
                  <Package className="w-6 h-6 text-emerald-600" />
                </div>
              </div>
            </div>

            <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">الموقع</p>
                  <p className="text-3xl font-bold text-purple-600">جديد</p>
                  <p className="text-xs text-gray-500 mt-1">سيتم تحديده حسب الإدخال</p>
                </div>
                <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
                  <MapPin className="w-6 h-6 text-purple-600" />
                </div>
              </div>
            </div>
          </div>

          {/* Form Section */}
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 overflow-hidden">
            <div className="bg-gradient-to-r from-green-500 to-blue-600 px-8 py-6">
              <h2 className="text-xl font-bold text-white">بيانات المخزن الجديد</h2>
              <p className="text-green-100 mt-1">يرجى ملء جميع الحقول المطلوبة بعناية</p>
            </div>

            <div className="p-8">
              <WarehouseForm
                warehouse={null}
                onSave={handleSave}
                onCancel={handleCancel}
              />
            </div>
          </div>

          {/* Tips Section */}
          <div className="mt-8 bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">💡 نصائح مهمة</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-start space-x-3 rtl:space-x-reverse">
                <div className="w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
                <div>
                  <p className="text-sm font-medium text-gray-700">السعة التخزينية</p>
                  <p className="text-xs text-gray-600">حدد السعة القصوى للمخزن بوحدة القطع أو حسب نوع المنتجات</p>
                </div>
              </div>
              <div className="flex items-start space-x-3 rtl:space-x-reverse">
                <div className="w-2 h-2 bg-emerald-500 rounded-full mt-2"></div>
                <div>
                  <p className="text-sm font-medium text-gray-700">الموقع الجغرافي</p>
                  <p className="text-xs text-gray-600">اختر موقعاً واضحاً ومحدداً لسهولة الوصول والتتبع</p>
                </div>
              </div>
              <div className="flex items-start space-x-3 rtl:space-x-reverse">
                <div className="w-2 h-2 bg-purple-500 rounded-full mt-2"></div>
                <div>
                  <p className="text-sm font-medium text-gray-700">اسم المخزن</p>
                  <p className="text-xs text-gray-600">استخدم اسماً وصفياً يسهل التعرف على المخزن</p>
                </div>
              </div>
              <div className="flex items-start space-x-3 rtl:space-x-reverse">
                <div className="w-2 h-2 bg-amber-500 rounded-full mt-2"></div>
                <div>
                  <p className="text-sm font-medium text-gray-700">إدارة المخزون</p>
                  <p className="text-xs text-gray-600">بعد الإنشاء يمكنك إضافة المنتجات وإدارة حركات المخزون</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default WarehouseCreate;