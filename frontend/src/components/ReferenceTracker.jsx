import React, { useState, useEffect } from 'react';
import { Card, CardContent } from './ui/card';

const ReferenceTracker = ({ referenceType, referenceId, onReferenceClick }) => {
  const [relatedItems, setRelatedItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (referenceId && referenceType) {
      fetchRelatedItems();
    }
  }, [referenceId, referenceType]);

  const fetchRelatedItems = async () => {
    setLoading(true);
    try {
      // Simulate API call to fetch related items
      const mockData = generateMockRelatedItems(referenceType, referenceId);
      setRelatedItems(mockData);
    } catch (error) {
      console.error('Error fetching related items:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateMockRelatedItems = (type, id) => {
    const baseReference = `${type.toUpperCase()}-${id}`;

    switch (type) {
      case 'purchase_order':
        return [
          {
            id: 1,
            type: 'stock_movement',
            reference: `SM-${Date.now()}-1`,
            description: 'استلام مضخة مياه صناعية - 10 وحدات',
            status: 'completed',
            date: new Date().toISOString().split('T')[0],
            warehouse: 'المخزن الرئيسي',
            amount: '+10'
          },
          {
            id: 2,
            type: 'stock_movement',
            reference: `SM-${Date.now()}-2`,
            description: 'استلام محرك كهربائي - 5 وحدات',
            status: 'completed',
            date: new Date().toISOString().split('T')[0],
            warehouse: 'مخزن قطع الغيار',
            amount: '+5'
          },
          {
            id: 3,
            type: 'ap_invoice',
            reference: `INV-${Date.now()}`,
            description: 'فاتورة أمر الشراء',
            status: 'pending',
            date: new Date().toISOString().split('T')[0],
            amount: '15,000 ريال'
          }
        ];

      case 'stock_movement':
        return [
          {
            id: 1,
            type: 'purchase_order',
            reference: baseReference.replace('STOCK_MOVEMENT', 'PO'),
            description: 'أمر الشراء المرجعي',
            status: 'received',
            date: new Date(Date.now() - 86400000).toISOString().split('T')[0],
            supplier: 'مورد المعدات المتقدمة'
          }
        ];

      case 'sales_order':
        return [
          {
            id: 1,
            type: 'stock_movement',
            reference: `SM-OUT-${Date.now()}`,
            description: 'صرف للعميل - 3 وحدات',
            status: 'completed',
            date: new Date().toISOString().split('T')[0],
            warehouse: 'المخزن الرئيسي',
            amount: '-3'
          },
          {
            id: 2,
            type: 'invoice',
            reference: `INV-${Date.now()}`,
            description: 'فاتورة البيع',
            status: 'issued',
            date: new Date().toISOString().split('T')[0],
            amount: '8,500 ريال'
          }
        ];

      default:
        return [];
    }
  };

  const getTypeIcon = (type) => {
    switch (type) {
      case 'purchase_order':
        return (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
          </svg>
        );
      case 'stock_movement':
        return (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
          </svg>
        );
      case 'ap_invoice':
      case 'invoice':
        return (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        );
      case 'sales_order':
        return (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
          </svg>
        );
      default:
        return (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        );
    }
  };

  const getTypeLabel = (type) => {
    const labels = {
      purchase_order: 'أمر شراء',
      stock_movement: 'حركة مخزون',
      ap_invoice: 'فاتورة مستحقة',
      invoice: 'فاتورة',
      sales_order: 'أمر بيع'
    };
    return labels[type] || type;
  };

  const getStatusClass = (status) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'received':
        return 'bg-blue-100 text-blue-800';
      case 'issued':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="animate-pulse">
        <div className="h-4 bg-gray-200 rounded mb-2"></div>
        <div className="h-4 bg-gray-200 rounded mb-2"></div>
        <div className="h-4 bg-gray-200 rounded"></div>
      </div>
    );
  }

  if (relatedItems.length === 0) {
    return (
      <div className="text-center py-4 text-gray-500 text-sm">
        لا توجد عناصر مرتبطة
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <h4 className="text-sm font-medium text-gray-700 flex items-center gap-2">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
        </svg>
        العناصر المرتبطة ({relatedItems.length})
      </h4>

      <div className="space-y-2">
        {relatedItems.map((item) => (
          <div
            key={`${item.type}-${item.id}`}
            className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
            onClick={() => onReferenceClick && onReferenceClick(item.type, item.reference)}
          >
            <div className="flex items-start gap-3 flex-1">
              <div className="flex-shrink-0 mt-0.5 text-gray-500">
                {getTypeIcon(item.type)}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-sm font-medium text-gray-900">
                    {item.reference}
                  </span>
                  <span className="text-xs text-gray-500">
                    ({getTypeLabel(item.type)})
                  </span>
                  <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${getStatusClass(item.status)}`}>
                    {item.status}
                  </span>
                </div>

                <p className="text-xs text-gray-600 truncate">
                  {item.description}
                </p>

                <div className="flex items-center gap-4 mt-1 text-xs text-gray-500">
                  <span>📅 {item.date}</span>
                  {item.warehouse && <span>🏪 {item.warehouse}</span>}
                  {item.supplier && <span>🏢 {item.supplier}</span>}
                  {item.amount && (
                    <span className={`font-medium ${
                      item.amount.startsWith('+') ? 'text-green-600' :
                      item.amount.startsWith('-') ? 'text-red-600' :
                      'text-blue-600'
                    }`}>
                      {item.amount}
                    </span>
                  )}
                </div>
              </div>
            </div>

            <svg className="w-4 h-4 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ReferenceTracker;