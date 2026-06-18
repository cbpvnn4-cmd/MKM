import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader } from './ui/card';

const SystemConnectionMap = ({ currentReference, currentType }) => {
  const [connectionData, setConnectionData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (currentReference && currentType) {
      fetchConnectionData();
    }
  }, [currentReference, currentType]);

  const fetchConnectionData = async () => {
    setLoading(true);
    try {
      // Simulate API call to get connection map
      const data = generateConnectionMap(currentType, currentReference);
      setConnectionData(data);
    } catch (error) {
      console.error('Error fetching connection data:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateConnectionMap = (type, reference) => {
    // Example connection flow for a purchase order
    if (type === 'purchase_order') {
      return {
        timeline: [
          {
            id: 1,
            step: 'إنشاء أمر الشراء',
            reference: reference,
            status: 'completed',
            date: '2025-09-20',
            description: 'تم إنشاء أمر الشراء مع المورد',
            icon: '📝',
            connections: []
          },
          {
            id: 2,
            step: 'تأكيد أمر الشراء',
            reference: reference,
            status: 'completed',
            date: '2025-09-21',
            description: 'تم تأكيد الطلب من المورد',
            icon: '✅',
            connections: []
          },
          {
            id: 3,
            step: 'استلام البضاعة',
            reference: reference,
            status: 'completed',
            date: '2025-09-23',
            description: 'تم استلام البضاعة في المخزن',
            icon: '📦',
            connections: [
              { type: 'stock_movement', reference: 'SM-001', description: 'إدخال مضخة مياه - 10 وحدات' },
              { type: 'stock_movement', reference: 'SM-002', description: 'إدخال محرك كهربائي - 5 وحدات' }
            ]
          },
          {
            id: 4,
            step: 'فاتورة المورد',
            reference: `AP-${reference.split('-')[1]}`,
            status: 'pending',
            date: '2025-09-24',
            description: 'في انتظار فاتورة المورد',
            icon: '🧾',
            connections: [
              { type: 'ap_invoice', reference: `INV-${Date.now()}`, description: 'فاتورة المورد - 15,000 ريال' }
            ]
          }
        ],
        summary: {
          totalItems: 2,
          totalQuantity: 15,
          totalValue: 15000,
          warehouse: 'المخزن الرئيسي',
          supplier: 'مورد المعدات المتقدمة',
          status: 'في التنفيذ'
        }
      };
    }

    // Example for stock movement
    if (type === 'stock_movement') {
      return {
        timeline: [
          {
            id: 1,
            step: 'المرجع الأصلي',
            reference: 'PO-001',
            status: 'completed',
            date: '2025-09-20',
            description: 'أمر الشراء الأصلي',
            icon: '📋',
            connections: []
          },
          {
            id: 2,
            step: 'حركة المخزون',
            reference: reference,
            status: 'completed',
            date: '2025-09-23',
            description: 'تم تسجيل حركة المخزون',
            icon: '📊',
            connections: []
          },
          {
            id: 3,
            step: 'تحديث الرصيد',
            reference: 'AUTO-UPDATE',
            status: 'completed',
            date: '2025-09-23',
            description: 'تم تحديث رصيد المخزن',
            icon: '🔄',
            connections: []
          }
        ],
        summary: {
          product: 'مضخة مياه صناعية',
          quantity: '+10',
          warehouse: 'المخزن الرئيسي',
          currentStock: 35,
          movementType: 'استلام',
          status: 'مكتمل'
        }
      };
    }

    return null;
  };

  const getStatusClass = (status) => {
    switch (status) {
      case 'completed':
        return 'border-green-500 bg-green-50';
      case 'pending':
        return 'border-yellow-500 bg-yellow-50';
      case 'in_progress':
        return 'border-blue-500 bg-blue-50';
      default:
        return 'border-gray-300 bg-gray-50';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'completed':
        return '✅';
      case 'pending':
        return '⏳';
      case 'in_progress':
        return '🔄';
      default:
        return '⚪';
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <div className="animate-pulse h-4 bg-gray-200 rounded w-1/3"></div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="animate-pulse h-4 bg-gray-200 rounded"></div>
            <div className="animate-pulse h-4 bg-gray-200 rounded w-3/4"></div>
            <div className="animate-pulse h-4 bg-gray-200 rounded w-1/2"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!connectionData) {
    return (
      <Card>
        <CardContent className="text-center py-8 text-gray-500">
          لا توجد بيانات ربط متاحة
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">
            خريطة الربط بين الأنظمة
          </h3>
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <span className="w-2 h-2 bg-green-400 rounded-full"></span>
            <span>مكتمل</span>
            <span className="w-2 h-2 bg-yellow-400 rounded-full"></span>
            <span>في الانتظار</span>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        {/* Timeline */}
        <div className="space-y-4 mb-6">
          {connectionData.timeline.map((step, index) => (
            <div key={step.id} className="relative">
              {/* Connection line */}
              {index < connectionData.timeline.length - 1 && (
                <div className="absolute right-6 top-12 h-8 w-0.5 bg-gray-300"></div>
              )}

              {/* Step card */}
              <div className={`border-r-4 p-4 rounded-lg ${getStatusClass(step.status)}`}>
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 text-2xl">
                    {step.icon}
                  </div>

                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-semibold text-gray-900">{step.step}</h4>
                      <div className="flex items-center gap-2 text-sm text-gray-500">
                        {getStatusIcon(step.status)}
                        <span>{step.date}</span>
                      </div>
                    </div>

                    <p className="text-sm text-gray-600 mb-2">{step.description}</p>

                    <div className="flex items-center gap-2 text-sm">
                      <span className="bg-gray-100 px-2 py-1 rounded text-gray-700 font-mono text-xs">
                        {step.reference}
                      </span>
                    </div>

                    {/* Connected items */}
                    {step.connections.length > 0 && (
                      <div className="mt-3 pl-4 border-r-2 border-gray-200">
                        <h5 className="text-xs font-medium text-gray-700 mb-2">العناصر المرتبطة:</h5>
                        <div className="space-y-1">
                          {step.connections.map((connection, idx) => (
                            <div key={idx} className="flex items-center gap-2 text-xs text-gray-600">
                              <span className="w-1.5 h-1.5 bg-blue-400 rounded-full"></span>
                              <span className="font-mono">{connection.reference}</span>
                              <span>-</span>
                              <span>{connection.description}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Summary */}
        <div className="border-t pt-4">
          <h4 className="font-semibold text-gray-900 mb-3">ملخص العملية</h4>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {Object.entries(connectionData.summary).map(([key, value]) => (
              <div key={key} className="text-center p-3 bg-gray-50 rounded-lg">
                <div className="text-xs text-gray-500 mb-1">
                  {key === 'totalItems' && 'إجمالي العناصر'}
                  {key === 'totalQuantity' && 'إجمالي الكمية'}
                  {key === 'totalValue' && 'إجمالي القيمة'}
                  {key === 'warehouse' && 'المخزن'}
                  {key === 'supplier' && 'المورد'}
                  {key === 'status' && 'الحالة'}
                  {key === 'product' && 'المنتج'}
                  {key === 'quantity' && 'الكمية'}
                  {key === 'currentStock' && 'الرصيد الحالي'}
                  {key === 'movementType' && 'نوع الحركة'}
                </div>
                <div className="font-medium text-gray-900 text-sm">
                  {typeof value === 'number' && key === 'totalValue'
                    ? `${value.toLocaleString()} ريال`
                    : value}
                </div>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default SystemConnectionMap;