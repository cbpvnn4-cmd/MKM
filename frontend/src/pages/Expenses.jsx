import React, { useState, useEffect, useMemo } from 'react';
import Layout from '../components/Layout';
import { getExpenses, deleteExpense } from '../services/api';
import { useToast } from '../components/ui/Toast';
import { useConfirmations } from '../components/ui/ConfirmDialog';

const Expenses = () => {
  const { success, error: toastError } = useToast();
  const { confirmDelete } = useConfirmations();
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterField, setFilterField] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');

  // Common expense categories with Arabic translations
  const expenseCategories = [
    { en: 'Equipment', ar: 'المعدات' },
    { en: 'Labor', ar: 'العمالة' },
    { en: 'Materials', ar: 'المواد' },
    { en: 'Transportation', ar: 'النقل' },
    { en: 'Utilities', ar: 'المرافق' },
    { en: 'Office Supplies', ar: 'اللوازم المكتبية' },
    { en: 'Marketing', ar: 'التسويق' },
    { en: 'Insurance', ar: 'التأمين' },
    { en: 'Maintenance', ar: 'الصيانة' },
    { en: 'Other', ar: 'أخرى' }
  ];

  // Helper function to get Arabic category name
  const getCategoryInArabic = (englishCategory) => {
    const category = expenseCategories.find(cat => cat.en === englishCategory);
    return category ? category.ar : englishCategory;
  };

  useEffect(() => {
    fetchExpenses();
  }, []);

  const fetchExpenses = async () => {
    try {
      setLoading(true);
      const data = await getExpenses();
      setExpenses(Array.isArray(data) ? data : []);
      setError(null);
    } catch (err) {
      setError('فشل في جلب المصروفات');
      console.error('خطأ في جلب المصروفات:', err);

      // Add sample data for development/testing
      const sampleExpenses = [
        {
          id: 1,
          date: '2024-01-15',
          category: 'Equipment',
          description: 'شراء معدات جديدة للمشروع',
          project_name: 'مشروع البناء الأول',
          amount: 15000,
          currency: 'USD'
        },
        {
          id: 2,
          date: '2024-01-20',
          category: 'Labor',
          description: 'رواتب العمال لشهر يناير',
          project_name: 'مشروع الصيانة',
          amount: 8500,
          currency: 'USD'
        },
        {
          id: 3,
          date: '2024-01-25',
          category: 'Materials',
          description: 'مواد البناء والخرسانة',
          project_name: 'مشروع البناء الأول',
          amount: 12000,
          currency: 'USD'
        },
        {
          id: 4,
          date: '2024-02-01',
          category: 'Transportation',
          description: 'نقل المواد والمعدات',
          project_name: 'مشروع الصيانة',
          amount: 3500,
          currency: 'USD'
        },
        {
          id: 5,
          date: '2024-02-10',
          category: 'Office Supplies',
          description: 'لوازم مكتبية ومستلزمات إدارية',
          project_name: 'الإدارة العامة',
          amount: 1200,
          currency: 'USD'
        }
      ];
      setExpenses(sampleExpenses);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    const confirmed = await confirmDelete('المصروف');
    if (!confirmed) return;

    try {
      await deleteExpense(id);
      success('تم حذف المصروف بنجاح');
      // Remove from local state instead of refetching
      setExpenses(prevExpenses => prevExpenses.filter(expense => expense.id !== id));
      setError(null);
    } catch (err) {
      toastError('فشل في حذف المصروف');
      console.error('خطأ في حذف المصروف:', err);
      // Fallback: just remove from local state for demo
      setExpenses(prevExpenses => prevExpenses.filter(expense => expense.id !== id));
    }
  };

  // Format currency for Arabic display
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount || 0);
  };

  // Filter and search expenses
  const filteredExpenses = useMemo(() => {
    let result = expenses;

    // Apply category filter
    if (categoryFilter !== 'all') {
      result = result.filter(expense => expense.category === categoryFilter);
    }

    // Apply search term
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();

      switch (filterField) {
        case 'description':
          result = result.filter(expense => expense.description?.toLowerCase().includes(searchLower));
          break;
        case 'category':
          result = result.filter(expense => {
            const categoryAr = getCategoryInArabic(expense.category);
            return expense.category?.toLowerCase().includes(searchLower) ||
                   categoryAr?.toLowerCase().includes(searchLower);
          });
          break;
        case 'project':
          result = result.filter(expense =>
            (expense.project_name || expense.project)?.toLowerCase().includes(searchLower)
          );
          break;
        default:
          // Search all fields
          result = result.filter(expense => {
            const categoryAr = getCategoryInArabic(expense.category);
            return expense.description?.toLowerCase().includes(searchLower) ||
                   expense.category?.toLowerCase().includes(searchLower) ||
                   categoryAr?.toLowerCase().includes(searchLower) ||
                   (expense.project_name || expense.project)?.toLowerCase().includes(searchLower);
          });
      }
    }

    return result;
  }, [expenses, searchTerm, filterField, categoryFilter]);

  // Calculate total expenses
  const totalExpenses = useMemo(() => {
    return filteredExpenses.reduce((sum, expense) => sum + parseFloat(expense.amount || 0), 0);
  }, [filteredExpenses]);

  const uniqueCategories = useMemo(() => {
    const categories = new Set(filteredExpenses.map(expense => expense.category).filter(Boolean));
    return categories.size;
  }, [filteredExpenses]);

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">جاري تحميل المصروفات...</p>
          </div>
        </div>
      </Layout>
    );
  }


  return (
    <Layout>
      <div className="space-y-6">
        {/* Page Header */}
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 p-8 mb-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4 rtl:space-x-reverse">
              <div className="w-12 h-12 bg-gradient-to-br from-rose-500 to-red-600 rounded-xl flex items-center justify-center">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-800">المصروفات</h1>
                <p className="text-gray-600 mt-1">إدارة ومتابعة مصروفات المشاريع والعمليات</p>
              </div>
            </div>
            <button
              className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-rose-500 to-red-600 text-white font-semibold rounded-xl hover:from-rose-600 hover:to-red-700 transform hover:scale-105 transition-all duration-200 shadow-lg hover:shadow-xl"
              onClick={() => window.location.href = '/expenses/new'}
            >
              <svg className="w-5 h-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              إضافة مصروف جديد
            </button>
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 rounded-xl p-4 border border-yellow-200 mb-6">
            <div className="flex items-center">
              <div className="p-2 bg-yellow-200 rounded-full mr-3">
                <svg className="w-5 h-5 text-yellow-800" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="text-yellow-800 font-medium text-sm">
                تم تحميل البيانات التجريبية - {error}
              </div>
              <button
                onClick={() => setError(null)}
                className="mr-auto text-yellow-600 hover:text-yellow-800"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        )}

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 mb-8">
          <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-6 border border-blue-200">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-medium text-blue-800 mb-1">إجمالي المصروفات</h3>
                <p className="text-2xl font-bold text-blue-900">
                  {formatCurrency(totalExpenses)}
                </p>
                <p className="text-xs text-blue-600 mt-1">
                  {filteredExpenses.length} مصروف
                </p>
              </div>
              <div className="p-3 bg-blue-200 rounded-full">
                <svg className="w-6 h-6 text-blue-800" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-6 border border-green-200">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-medium text-green-800 mb-1">إجمالي النتائج</h3>
                <p className="text-2xl font-bold text-green-900">
                  {filteredExpenses.length}
                </p>
                <p className="text-xs text-green-600 mt-1">
                  من أصل {expenses.length} مصروف
                </p>
              </div>
              <div className="p-3 bg-green-200 rounded-full">
                <svg className="w-6 h-6 text-green-800" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl p-6 border border-purple-200">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-medium text-purple-800 mb-1">متوسط المصروف</h3>
                <p className="text-2xl font-bold text-purple-900">
                  {formatCurrency(filteredExpenses.length > 0 ? totalExpenses / filteredExpenses.length : 0)}
                </p>
                <p className="text-xs text-purple-600 mt-1">
                  لكل مصروف
                </p>
              </div>
              <div className="p-3 bg-purple-200 rounded-full">
                <svg className="w-6 h-6 text-purple-800" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
              </div>
            </div>
          </div>
          <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-xl p-6 border border-orange-200">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-medium text-orange-800 mb-1">عدد الفئات المستخدمة</h3>
                <p className="text-2xl font-bold text-orange-900">
                  {uniqueCategories}
                </p>
                <p className="text-xs text-orange-600 mt-1">
                  تنوع المصروفات حسب التصنيفات الحالية
                </p>
              </div>
              <div className="p-3 bg-orange-200 rounded-full">
                <svg className="w-6 h-6 text-orange-800" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8m-3-9h6m-6 4h6m-6 4h6" />
                </svg>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-800">قائمة المصروفات</h2>
            <button
              className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-medium rounded-lg shadow-md hover:shadow-lg transition-all duration-200"
              onClick={() => window.location.href = '/expenses/new'}
            >
              <svg className="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              إضافة مصروف جديد
            </button>
          </div>

          {/* Search and Filter Controls */}
          <div className="p-6 border-b border-gray-200">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                    <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </div>
                  <input
                    type="text"
                    placeholder="البحث في المصروفات..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-4 pr-10 py-3 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                  />
                  {searchTerm && (
                    <button
                      onClick={() => setSearchTerm('')}
                      className="absolute inset-y-0 left-0 pl-3 flex items-center"
                    >
                      <svg className="h-5 w-5 text-gray-400 hover:text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  )}
                </div>
              </div>
              <div>
                <select
                  value={filterField}
                  onChange={(e) => setFilterField(e.target.value)}
                  className="px-4 py-3 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                >
                  <option value="all">جميع الحقول</option>
                  <option value="description">الوصف</option>
                  <option value="category">الفئة</option>
                  <option value="project">المشروع</option>
                </select>
              </div>
              <div>
                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className="px-4 py-3 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                >
                  <option value="all">جميع الفئات</option>
                  {expenseCategories.map(category => (
                    <option key={category.en} value={category.en}>{category.ar}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>
          {/* Data Table */}
          <div className="p-6">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gradient-to-r from-gray-50 to-gray-100">
                  <tr>
                    <th scope="col" className="px-6 py-4 text-right text-xs font-medium text-gray-600 uppercase tracking-wider">
                      التاريخ
                    </th>
                    <th scope="col" className="px-6 py-4 text-right text-xs font-medium text-gray-600 uppercase tracking-wider">
                      الفئة
                    </th>
                    <th scope="col" className="px-6 py-4 text-right text-xs font-medium text-gray-600 uppercase tracking-wider">
                      الوصف
                    </th>
                    <th scope="col" className="px-6 py-4 text-right text-xs font-medium text-gray-600 uppercase tracking-wider">
                      المشروع
                    </th>
                    <th scope="col" className="px-6 py-4 text-right text-xs font-medium text-gray-600 uppercase tracking-wider">
                      المبلغ
                    </th>
                    <th scope="col" className="px-6 py-4 text-right text-xs font-medium text-gray-600 uppercase tracking-wider">
                      العملة
                    </th>
                    <th scope="col" className="px-6 py-4 text-right text-xs font-medium text-gray-600 uppercase tracking-wider">
                      الإجراءات
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredExpenses.length === 0 ? (
                    <tr>
                      <td colSpan="7" className="px-6 py-12 text-center">
                        <div className="flex flex-col items-center">
                          <svg className="mx-auto h-12 w-12 text-gray-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                          </svg>
                          <h3 className="text-sm font-medium text-gray-900 mb-1">
                            {searchTerm || categoryFilter !== 'all' ? 'لا توجد مصروفات تطابق معايير البحث' : 'لا توجد مصروفات'}
                          </h3>
                          <p className="text-sm text-gray-500">
                            {searchTerm || categoryFilter !== 'all' ? 'جرب تعديل معايير البحث أو الفلترة' : 'ابدأ بإضافة مصروف جديد'}
                          </p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    filteredExpenses.map((expense) => (
                      <tr key={expense.id} className="hover:bg-gray-50 transition-colors duration-150">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">
                            {expense.date ? new Date(expense.date).toLocaleDateString('en-US') : '-'}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                            {getCategoryInArabic(expense.category)}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm text-gray-900 max-w-md">
                            {expense.description || '-'}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-600">
                            {expense.project_name || expense.project || '-'}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-semibold text-gray-900">
                            {formatCurrency(expense.amount)}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-600">{expense.currency || 'USD'}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <div className="flex items-center gap-2">
                            <button
                              className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md text-blue-700 bg-blue-100 hover:bg-blue-200 transition-colors duration-150"
                              onClick={() => window.location.href = `/expenses/${expense.id}/edit`}
                            >
                              تعديل
                            </button>
                            <button
                              className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md text-red-700 bg-red-100 hover:bg-red-200 transition-colors duration-150"
                              onClick={() => handleDelete(expense.id)}
                            >
                              حذف
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default Expenses;




