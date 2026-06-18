import React, { useState, useEffect } from 'react';
import Layout from '../components/Layout';

const RecentActivity = () => {
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    fetchRecentActivities();
  }, [filter]);

  const fetchRecentActivities = async () => {
    try {
      // Simulate API call - replace with actual API endpoint
      setTimeout(() => {
        const allActivities = [
          {
            id: 1,
            type: 'sales_order',
            title: 'طلب بيع جديد #SO-2024-001',
            description: 'مصعد سكني - برج الريان',
            amount: 45000,
            time: 'منذ ساعتين',
            status: 'created',
            user: 'أحمد محمد'
          },
          {
            id: 2,
            type: 'invoice',
            title: 'فاتورة مصدرة #INV-2024-089',
            description: 'مصعد تجاري - مول النخيل',
            amount: 85000,
            time: 'أمس',
            status: 'issued',
            user: 'فاطمة أحمد'
          },
          {
            id: 3,
            type: 'sales_order',
            title: 'تحديث طلب #SO-2024-098',
            description: 'مصعد مستشفى - مستشفى الملك فيصل',
            amount: 120000,
            time: 'منذ 3 أيام',
            status: 'updated',
            user: 'محمد علي'
          },
          {
            id: 4,
            type: 'payment',
            title: 'دفعة مستلمة #PAY-2024-045',
            description: 'دفعة من شركة الإنشاءات الحديثة',
            amount: 25000,
            time: 'منذ يومين',
            status: 'received',
            user: 'سارة خالد'
          },
          {
            id: 5,
            type: 'purchase_order',
            title: 'أمر شراء جديد #PO-2024-023',
            description: 'قطع غيار مصاعد من الموردين',
            amount: 15000,
            time: 'منذ أسبوع',
            status: 'created',
            user: 'عبدالله ناصر'
          },
          {
            id: 6,
            type: 'service_ticket',
            title: 'تذكرة صيانة #ST-2024-156',
            description: 'صيانة دورية - برج التجارة',
            amount: 2500,
            time: 'منذ أسبوعين',
            status: 'completed',
            user: 'خالد أحمد'
          }
        ];

        const filteredActivities = filter === 'all'
          ? allActivities
          : allActivities.filter(activity => activity.type === filter);

        setActivities(filteredActivities);
        setLoading(false);
      }, 500);
    } catch (error) {
      console.error('خطأ في جلب النشاط الحديث:', error);
      setLoading(false);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount || 0);
  };

  const getActivityIcon = (type) => {
    const icons = {
      sales_order: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2',
      invoice: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z',
      payment: 'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
      purchase_order: 'M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z',
      service_ticket: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z'
    };
    return icons[type] || icons.sales_order;
  };

  const getActivityColor = (type, status) => {
    const colors = {
      sales_order: status === 'created' ? 'green' : 'blue',
      invoice: 'blue',
      payment: 'green',
      purchase_order: 'purple',
      service_ticket: status === 'completed' ? 'green' : 'orange'
    };
    return colors[type] || 'gray';
  };

  const getActivityTypeLabel = (type) => {
    const labels = {
      sales_order: 'أمر بيع',
      invoice: 'فاتورة',
      payment: 'دفعة',
      purchase_order: 'أمر شراء',
      service_ticket: 'تذكرة صيانة'
    };
    return labels[type] || 'نشاط';
  };

  const filterOptions = [
    { value: 'all', label: 'جميع الأنشطة' },
    { value: 'sales_order', label: 'أوامر البيع' },
    { value: 'invoice', label: 'الفواتير' },
    { value: 'payment', label: 'المدفوعات' },
    { value: 'purchase_order', label: 'أوامر الشراء' },
    { value: 'service_ticket', label: 'تذاكر الصيانة' }
  ];

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        {/* Page Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">النشاط الحديث</h1>
          <p className="text-gray-600">تتبع جميع الأنشطة والمعاملات الحديثة في النظام</p>
        </div>

        {/* Filter Options */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex flex-wrap gap-2">
            {filterOptions.map((option) => (
              <button
                key={option.value}
                onClick={() => setFilter(option.value)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  filter === option.value
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        {/* Activities List */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-800">
              {filter === 'all' ? 'جميع الأنشطة' : filterOptions.find(f => f.value === filter)?.label}
              <span className="text-sm text-gray-500 font-normal mr-2">
                ({activities.length} عنصر)
              </span>
            </h2>
          </div>

          <div className="p-6">
            {activities.length > 0 ? (
              <div className="space-y-4">
                {activities.map((activity) => {
                  const color = getActivityColor(activity.type, activity.status);
                  return (
                    <div key={activity.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                      <div className="flex items-center space-x-4 space-x-reverse">
                        <div className={`p-2 bg-${color}-100 rounded-lg`}>
                          <svg xmlns="http://www.w3.org/2000/svg" className={`h-5 w-5 text-${color}-600`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={getActivityIcon(activity.type)} />
                          </svg>
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{activity.title}</p>
                          <p className="text-sm text-gray-600">{activity.description}</p>
                          <div className="flex items-center mt-1 space-x-4 space-x-reverse">
                            <span className={`text-xs px-2 py-1 bg-${color}-100 text-${color}-800 rounded-full`}>
                              {getActivityTypeLabel(activity.type)}
                            </span>
                            <span className="text-xs text-gray-500">بواسطة {activity.user}</span>
                          </div>
                        </div>
                      </div>
                      <div className="text-left">
                        <p className={`font-semibold text-${color}-600`}>
                          {formatCurrency(activity.amount)}
                        </p>
                        <p className="text-sm text-gray-500">{activity.time}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-8">
                <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2-2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 712 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                <h3 className="mt-2 text-sm font-medium text-gray-900">لا توجد أنشطة</h3>
                <p className="mt-1 text-sm text-gray-500">لم يتم العثور على أنشطة لهذا الفلتر</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default RecentActivity;