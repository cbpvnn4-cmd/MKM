import React, { useState, useEffect } from 'react';
import { X, Search, Package, Check, Square, ArrowLeft, CheckCircle, ShoppingCart } from 'lucide-react';
import { getSalesOrder, getProduct } from '../services/api';
import { useToast } from './ui/Toast';
import { useConfirmations } from './ui/ConfirmDialog';

const SalesOrderItemSelector = ({
  isOpen,
  onClose,
  onConfirm,
  salesOrderId,
  loading: externalLoading = false
}) => {
  const { success, error: toastError } = useToast();
  const { confirmDelete } = useConfirmations();

  const [salesOrder, setSalesOrder] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedItems, setSelectedItems] = useState(new Set());
  const [searchTerm, setSearchTerm] = useState('');
  const [productDetails, setProductDetails] = useState({});

  // Load sales order details
  useEffect(() => {
    if (isOpen && salesOrderId) {
      loadSalesOrderDetails();
    }
  }, [isOpen, salesOrderId]);

  const loadSalesOrderDetails = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const data = await getSalesOrder(salesOrderId);
      setSalesOrder(data);

      // Load product details for better display
      const items = Array.isArray(data?.items) ? data.items : [];
      const uniqueProductIds = Array.from(
        new Set(
          items
            .map((item) => item?.product_id)
            .filter((value) => value !== undefined && value !== null)
        )
      );

      if (uniqueProductIds.length) {
        const results = await Promise.all(
          uniqueProductIds.map(async (id) => {
            try {
              const product = await getProduct(id);
              return [id, product];
            } catch (err) {
              console.error('Error fetching product info:', err);
              return null;
            }
          })
        );
        
        const map = {};
        results.forEach((entry) => {
          if (entry && entry[0] != null && entry[1]) {
            map[entry[0]] = entry[1];
          }
        });
        setProductDetails(map);
      }

    } catch (err) {
      console.error('Error loading sales order:', err);
      setError('فشل في تحميل بيانات أمر البيع');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value) => {
    const amount = typeof value === 'number' ? value : 0;
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  const getItemDescription = (item, index) => {
    const orderType = String(salesOrder?.order_type || salesOrder?.orderType || 'items').toLowerCase();
    
    if (orderType === 'elevators') {
      const details = [];
      const sections = Number(item.sections ?? 0);
      if (sections > 0) details.push(`المقاطع: ${sections}`);
      const ropes = Number(item.ropes ?? 0);
      if (ropes > 0) details.push(`الرباط: ${ropes}`);
      const cable = Number(item.cable_meters ?? item.cable ?? 0);
      if (cable > 0) details.push(`الكابل (م): ${cable}`);
      const cabins = Number(item.cabins ?? 0);
      if (cabins > 0) details.push(`الكبائن: ${cabins}`);
      return `مصعد ${index + 1}${details.length ? ` (${details.join(' | ')})` : ''}`;
    }

    // For regular items, prefer product details
    const product = productDetails[item.product_id];
    if (product?.name) {
      return product.name;
    }
    
    return (
      item.product?.name ||
      item.product_name ||
      item.product ||
      `بند ${index + 1}`
    );
  };

  const getItemDetails = (item) => {
    const product = productDetails[item.product_id];
    if (product?.description) {
      return product.description;
    }
    return '';
  };

  const getItemTotal = (item) => {
    const qty = Number(item.qty ?? item.quantity ?? 0) || 1;
    const unitPrice = Number(
      item.unit_price_usd ?? item.unitPrice ?? item.sale_price ?? item.line_total_usd ?? 0
    ) || 0;
    return qty * unitPrice;
  };

  const filteredItems = React.useMemo(() => {
    if (!salesOrder?.items) return [];
    
    return salesOrder.items.filter((item, index) => {
      const description = getItemDescription(item, index);
      const details = getItemDetails(item);
      const searchLower = searchTerm.toLowerCase();
      
      return (
        description.toLowerCase().includes(searchLower) ||
        details.toLowerCase().includes(searchLower)
      );
    });
  }, [salesOrder?.items, searchTerm, productDetails]);

  const handleItemToggle = (itemIndex) => {
    setSelectedItems(prev => {
      const newSet = new Set(prev);
      if (newSet.has(itemIndex)) {
        newSet.delete(itemIndex);
      } else {
        newSet.add(itemIndex);
      }
      return newSet;
    });
  };

  const handleSelectAll = () => {
    if (selectedItems.size === filteredItems.length) {
      setSelectedItems(new Set());
    } else {
      setSelectedItems(new Set(filteredItems.map((_, index) => {
        // Find original index in salesOrder.items
        return salesOrder.items.indexOf(filteredItems[index]);
      })));
    }
  };

  const handleConfirm = () => {
    if (selectedItems.size === 0) {
      toastError('يرجى اختيار بند واحد على الأقل');
      return;
    }

    const selectedItemsData = Array.from(selectedItems).map(index => {
      const item = salesOrder.items[index];
      return {
        ...item,
        index,
        description: getItemDescription(item, index),
        details: getItemDetails(item),
        total: getItemTotal(item)
      };
    });

    onConfirm(selectedItemsData);
  };

  const getStatusIcon = () => {
    if (!salesOrder) return null;
    
    const status = String(salesOrder.status || '').toUpperCase();
    switch (status) {
      case 'COMPLETED':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'PENDING':
        return <div className="w-5 h-5 bg-yellow-500 rounded-full" />;
      case 'IN_PROGRESS':
        return <div className="w-5 h-5 bg-blue-500 rounded-full" />;
      default:
        return <div className="w-5 h-5 bg-gray-400 rounded-full" />;
    }
  };

  const getStatusText = () => {
    if (!salesOrder) return '';
    
    const status = String(salesOrder.status || '').toUpperCase();
    const statusMap = {
      'COMPLETED': 'مكتمل',
      'PENDING': 'معلق',
      'IN_PROGRESS': 'قيد التنفيذ',
      'DRAFT': 'مسودة'
    };
    return statusMap[status] || status;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-3xl shadow-2xl border border-white/20 max-w-4xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-500 to-indigo-600 px-8 py-6 text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4 rtl:space-x-reverse">
              <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                <ShoppingCart className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-2xl font-bold">اختيار البنود من أمر البيع</h2>
                <p className="text-blue-100 mt-1">اختر البنود التي تريد استيرادها إلى الفاتورة</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-10 h-10 bg-white/20 hover:bg-white/30 rounded-xl flex items-center justify-center transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Sales Order Info */}
        {salesOrder && (
          <div className="px-8 py-4 bg-gray-50 border-b">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4 rtl:space-x-reverse">
                <div className="flex items-center space-x-2 rtl:space-x-reverse">
                  {getStatusIcon()}
                  <span className="font-semibold text-gray-800">
                    أمر بيع #{salesOrder.so_no || salesOrder.soNo || salesOrder.id}
                  </span>
                  <span className="text-sm text-gray-600">({getStatusText()})</span>
                </div>
                <div className="text-sm text-gray-600">
                  العميل: <span className="font-medium">{salesOrder.customer?.name || salesOrder.customer_name || 'غير محدد'}</span>
                </div>
              </div>
              <div className="text-right">
                <div className="text-sm text-gray-600">إجمالي أمر البيع</div>
                <div className="text-lg font-bold text-emerald-600">
                  {formatCurrency(salesOrder.total_usd || salesOrder.total || 0)}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Content */}
        <div className="p-8 max-h-[60vh] overflow-hidden flex flex-col">
          {loading ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <div className="w-12 h-12 mx-auto mb-4 border-4 border-blue-100 border-t-blue-500 rounded-full animate-spin"></div>
                <p className="text-gray-600">جارٍ تحميل بيانات أمر البيع...</p>
              </div>
            </div>
          ) : error ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <div className="w-12 h-12 mx-auto mb-4 bg-red-100 rounded-full flex items-center justify-center">
                  <X className="w-6 h-6 text-red-600" />
                </div>
                <p className="text-red-600 mb-4">{error}</p>
                <button
                  onClick={loadSalesOrderDetails}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  إعادة المحاولة
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* Search and Actions */}
              <div className="flex items-center justify-between mb-6">
                <div className="relative flex-1 max-w-md">
                  <Search className="absolute right-3 rtl:left-3 rtl:right-auto top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input
                    type="text"
                    placeholder="ابحث في البنود..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pr-10 rtl:pl-10 rtl:pr-3 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div className="flex items-center gap-3">
                  <button
                    onClick={handleSelectAll}
                    className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl transition-colors"
                  >
                    {selectedItems.size === filteredItems.length ? (
                      <CheckCircle className="w-5 h-5 text-green-600" />
                    ) : (
                      <Square className="w-5 h-5" />
                    )}
                    {selectedItems.size === filteredItems.length ? 'إلغاء الكل' : 'تحديد الكل'}
                  </button>
                  <div className="text-sm text-gray-600">
                    محدد: <span className="font-semibold">{selectedItems.size}</span> من {filteredItems.length}
                  </div>
                </div>
              </div>

              {/* Items List */}
              <div className="flex-1 overflow-y-auto">
                <div className="space-y-3">
                  {filteredItems.length === 0 ? (
                    <div className="text-center py-12">
                      <Package className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                      <p className="text-gray-500">
                        {searchTerm ? 'لا توجد بنود مطابقة للبحث' : 'لا توجد بنود في أمر البيع'}
                      </p>
                    </div>
                  ) : (
                    filteredItems.map((item, filteredIndex) => {
                      const originalIndex = salesOrder.items.indexOf(item);
                      const isSelected = selectedItems.has(originalIndex);
                      const description = getItemDescription(item, originalIndex);
                      const details = getItemDetails(item);
                      const qty = Number(item.qty ?? item.quantity ?? 0) || 1;
                      const unitPrice = Number(
                        item.unit_price_usd ?? item.unitPrice ?? item.sale_price ?? item.line_total_usd ?? 0
                      ) || 0;
                      const total = qty * unitPrice;

                      return (
                        <div
                          key={originalIndex}
                          className={`border rounded-xl p-4 transition-all cursor-pointer ${
                            isSelected 
                              ? 'border-blue-500 bg-blue-50 shadow-md' 
                              : 'border-gray-200 hover:border-gray-300 hover:shadow-sm'
                          }`}
                          onClick={() => handleItemToggle(originalIndex)}
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex items-start space-x-4 rtl:space-x-reverse flex-1">
                              <button
                                className="mt-1"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleItemToggle(originalIndex);
                                }}
                              >
                                {isSelected ? (
                                  <CheckCircle className="w-6 h-6 text-blue-600" />
                                ) : (
                                  <Square className="w-6 h-6 text-gray-400" />
                                )}
                              </button>
                              
                              <div className="flex-1">
                                <h3 className="font-semibold text-gray-800 mb-1">
                                  {description}
                                </h3>
                                {details && (
                                  <p className="text-sm text-gray-600 mb-2">
                                    {details}
                                  </p>
                                )}
                                <div className="flex items-center gap-4 text-sm text-gray-600">
                                  <span>الكمية: <strong>{qty}</strong></span>
                                  <span>سعر الوحدة: <strong>{formatCurrency(unitPrice)}</strong></span>
                                </div>
                              </div>
                            </div>
                            
                            <div className="text-left rtl:text-right">
                              <div className="text-lg font-bold text-emerald-600">
                                {formatCurrency(total)}
                              </div>
                              <div className="text-xs text-gray-500">
                                الإجمالي
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="bg-gray-50 px-8 py-6 border-t">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-600">
              {selectedItems.size > 0 && (
                <>
                  سيتم استيراد <span className="font-semibold">{selectedItems.size}</span> بند
                  <span className="mx-2">•</span>
                  إجمالي المبلغ: <span className="font-semibold text-emerald-600">
                    {formatCurrency(
                      Array.from(selectedItems).reduce((sum, index) => {
                        const item = salesOrder.items[index];
                        return sum + getItemTotal(item);
                      }, 0)
                    )}
                  </span>
                </>
              )}
            </div>
            
            <div className="flex items-center gap-3">
              <button
                onClick={onClose}
                className="px-6 py-3 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-xl transition-colors"
              >
                إلغاء
              </button>
              <button
                onClick={handleConfirm}
                disabled={selectedItems.size === 0 || loading}
                className="px-8 py-3 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white rounded-xl font-semibold transition-all duration-200 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
              >
                استيراد البنود المحددة ({selectedItems.size})
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SalesOrderItemSelector;