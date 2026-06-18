import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Receipt, DollarSign, Calendar, Tag } from 'lucide-react';
import Layout from '../components/Layout';
import ExpenseForm from '../components/ExpenseForm';

const ExpenseCreate = () => {
  const navigate = useNavigate();

  const handleSave = (newExpense) => {
    // Navigate back to expenses list after successful creation
    navigate('/expenses');
  };

  const handleCancel = () => {
    // Navigate back to expenses list if user cancels
    navigate('/expenses');
  };

  return (
    <Layout>
      <div className="min-h-screen bg-gradient-to-br from-rose-50 via-white to-red-50" dir="rtl">
        <div className="max-w-5xl mx-auto p-6">
          {/* Header Section */}
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 p-8 mb-8">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4 rtl:space-x-reverse">
                <button
                  onClick={() => navigate('/expenses')}
                  className="w-12 h-12 bg-gradient-to-br from-gray-400 to-gray-600 rounded-xl flex items-center justify-center hover:from-gray-500 hover:to-gray-700 transition-all duration-200"
                >
                  <ArrowLeft className="w-6 h-6 text-white" />
                </button>
                <div className="w-12 h-12 bg-gradient-to-br from-rose-500 to-red-600 rounded-xl flex items-center justify-center">
                  <Receipt className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h1 className="text-3xl font-bold text-gray-800">إضافة مصروف جديد</h1>
                  <p className="text-gray-600 mt-1">قم بملء البيانات التالية لإضافة مصروف جديد إلى النظام</p>
                </div>
              </div>
            </div>
          </div>

          {/* Info Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">تاريخ المصروف</p>
                  <p className="text-2xl font-bold text-blue-600">اليوم</p>
                  <p className="text-xs text-gray-500 mt-1">يمكن تغييره حسب الحاجة</p>
                </div>
                <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                  <Calendar className="w-6 h-6 text-blue-600" />
                </div>
              </div>
            </div>

            <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">المبلغ</p>
                  <p className="text-2xl font-bold text-emerald-600">$0.00</p>
                  <p className="text-xs text-gray-500 mt-1">سيتم تحديده حسب الإدخال</p>
                </div>
                <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center">
                  <DollarSign className="w-6 h-6 text-emerald-600" />
                </div>
              </div>
            </div>

            <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">الفئة</p>
                  <p className="text-2xl font-bold text-purple-600">جديد</p>
                  <p className="text-xs text-gray-500 mt-1">اختر من الفئات المتاحة</p>
                </div>
                <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
                  <Tag className="w-6 h-6 text-purple-600" />
                </div>
              </div>
            </div>
          </div>

          {/* Form Section */}
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 overflow-hidden">
            <div className="bg-gradient-to-r from-rose-500 to-red-600 px-8 py-6">
              <h2 className="text-xl font-bold text-white">بيانات المصروف الجديد</h2>
              <p className="text-rose-100 mt-1">يرجى ملء جميع الحقول المطلوبة بعناية</p>
            </div>

            <div className="p-8">
              <ExpenseForm
                expense={null}
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
                  <p className="text-sm font-medium text-gray-700">تاريخ المصروف</p>
                  <p className="text-xs text-gray-600">تأكد من اختيار التاريخ الصحيح للمصروف</p>
                </div>
              </div>
              <div className="flex items-start space-x-3 rtl:space-x-reverse">
                <div className="w-2 h-2 bg-emerald-500 rounded-full mt-2"></div>
                <div>
                  <p className="text-sm font-medium text-gray-700">الفئة والوصف</p>
                  <p className="text-xs text-gray-600">اختر فئة مناسبة واكتب وصفاً واضحاً للمصروف</p>
                </div>
              </div>
              <div className="flex items-start space-x-3 rtl:space-x-reverse">
                <div className="w-2 h-2 bg-purple-500 rounded-full mt-2"></div>
                <div>
                  <p className="text-sm font-medium text-gray-700">المبلغ والعملة</p>
                  <p className="text-xs text-gray-600">أدخل المبلغ الصحيح واختر العملة المناسبة</p>
                </div>
              </div>
              <div className="flex items-start space-x-3 rtl:space-x-reverse">
                <div className="w-2 h-2 bg-amber-500 rounded-full mt-2"></div>
                <div>
                  <p className="text-sm font-medium text-gray-700">المراجعة والحفظ</p>
                  <p className="text-xs text-gray-600">راجع جميع البيانات قبل الحفظ لضمان الدقة</p>
                </div>
              </div>
            </div>
          </div>

          {/* Categories Reference */}
          <div className="mt-8 bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl p-6 border border-blue-200">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">📂 فئات المصروفات المتاحة</h3>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              <div className="flex items-center space-x-2 rtl:space-x-reverse">
                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                <span className="text-sm text-gray-700">المعدات</span>
              </div>
              <div className="flex items-center space-x-2 rtl:space-x-reverse">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span className="text-sm text-gray-700">العمالة</span>
              </div>
              <div className="flex items-center space-x-2 rtl:space-x-reverse">
                <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                <span className="text-sm text-gray-700">المواد</span>
              </div>
              <div className="flex items-center space-x-2 rtl:space-x-reverse">
                <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                <span className="text-sm text-gray-700">النقل</span>
              </div>
              <div className="flex items-center space-x-2 rtl:space-x-reverse">
                <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                <span className="text-sm text-gray-700">المرافق</span>
              </div>
              <div className="flex items-center space-x-2 rtl:space-x-reverse">
                <div className="w-2 h-2 bg-indigo-500 rounded-full"></div>
                <span className="text-sm text-gray-700">اللوازم المكتبية</span>
              </div>
              <div className="flex items-center space-x-2 rtl:space-x-reverse">
                <div className="w-2 h-2 bg-pink-500 rounded-full"></div>
                <span className="text-sm text-gray-700">التسويق</span>
              </div>
              <div className="flex items-center space-x-2 rtl:space-x-reverse">
                <div className="w-2 h-2 bg-teal-500 rounded-full"></div>
                <span className="text-sm text-gray-700">التأمين</span>
              </div>
              <div className="flex items-center space-x-2 rtl:space-x-reverse">
                <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                <span className="text-sm text-gray-700">الصيانة</span>
              </div>
              <div className="flex items-center space-x-2 rtl:space-x-reverse">
                <div className="w-2 h-2 bg-gray-500 rounded-full"></div>
                <span className="text-sm text-gray-700">أخرى</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default ExpenseCreate;