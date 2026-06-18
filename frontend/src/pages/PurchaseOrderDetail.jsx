import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import Layout from '../components/Layout';
import PurchaseOrderForm from '../components/PurchaseOrderFormImproved';
import PaymentManager from '../components/PaymentManager';
import { getPurchaseOrder, getSuppliers, getWarehouses } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { hasPermission, PERMISSIONS } from '../utils/permissions';
import { updateInventoryFromPurchaseOrder } from '../utils/inventoryUpdater';
import { useToast } from '../components/ui/Toast';
import { useConfirmations } from '../components/ui/ConfirmDialog';

const PurchaseOrderDetail = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const { success, error: toastError } = useToast();
  const { confirmDelete } = useConfirmations();
  const { user } = useAuth();
  const location = useLocation();
  const [purchaseOrder, setPurchaseOrder] = useState(null);
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(id && id !== 'new');
  const [error, setError] = useState(null);
  const [warehouses, setWarehouses] = useState([]);
  const [receiveOpen, setReceiveOpen] = useState(false);
  const [receiveWarehouseId, setReceiveWarehouseId] = useState('');
  const [receiveDate, setReceiveDate] = useState(new Date().toISOString().split('T')[0]);
  const [receiveLoading, setReceiveLoading] = useState(false);
  const [receiveError, setReceiveError] = useState(null);

  useEffect(() => {
    fetchSuppliers();
    fetchWarehouses();
    if (id && id !== 'new') {
      fetchPurchaseOrder();
    }
  }, [id]);

  useEffect(() => {
    if (user && !hasPermission(user, PERMISSIONS.MANAGE_INVENTORY)) {
      navigate(`/purchase-orders/${id}`);
    }
  }, [user, id, navigate]);

  
  const resolveReturnPath = () => {
    if (location?.state?.fromView && id && id !== 'new') {
      return `/purchase-orders/${id}`;
    }
    return '/purchase-orders';
  };
const fetchSuppliers = async () => {
    try {
      const data = await getSuppliers();
      setSuppliers(data);
    } catch (err) {
      console.error('خطأ في تحميل الموردين:', err);
      setError('فشل في تحميل قائمة الموردين');
    }
  };

  const fetchWarehouses = async () => {
    try {
      const data = await getWarehouses();
      setWarehouses(Array.isArray(data) ? data : []);
      if (Array.isArray(data) && data.length > 0) {
        setReceiveWarehouseId(String(data[0].id));
      }
    } catch (err) {
      console.error('خطأ في تحميل المستودعات:', err);
      setError('فشل في تحميل قائمة المستودعات');
    }
  };

  const fetchPurchaseOrder = async () => {
    try {
      setLoading(true);
      const data = await getPurchaseOrder(id);
      setPurchaseOrder(data);
      setError(null);
    } catch (err) {
      const errorMessage = err.response?.data?.detail || err.message || 'فشل في تحميل أمر الشراء';
      setError(errorMessage);
      console.error('خطأ في تحميل أمر الشراء:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = () => {
    navigate(resolveReturnPath());
  };

  const handleCancel = () => {
    navigate(resolveReturnPath());
  };

  if (loading) {
    return (
      <Layout>
        <div className="bg-white rounded-lg shadow-md p-6">
          <div>جاري تحميل أمر الشراء...</div>
        </div>
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout>
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="text-red-500 mb-4">{error}</div>
          <button
            onClick={handleCancel}
            className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            العودة إلى قائمة أوامر الشراء
          </button>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      {purchaseOrder && purchaseOrder.status && purchaseOrder.status.toString().toUpperCase() === 'RECEIVED' && (
        <div className="mb-6 p-6 rounded-2xl bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-300 shadow-lg">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex items-start gap-4">
              <div className="bg-blue-500 text-white p-3 rounded-xl shadow-md">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <div>
                <div className="text-blue-900 font-bold text-lg">✅ الأمر بحالة تم الاستلام</div>
                <div className="text-sm text-blue-700 mt-1">يمكنك الآن إنشاء قيود إدخال المخزون لهذا الأمر وتحديث الكميات المتاحة</div>
              </div>
            </div>
            <button
              onClick={() => setReceiveOpen(true)}
              className="px-6 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold hover:from-blue-700 hover:to-indigo-700 shadow-lg transform hover:scale-105 transition-all flex items-center gap-2 whitespace-nowrap"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              إنشاء قيود المخزون
            </button>
          </div>
        </div>
      )}

      {receiveOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn" onClick={() => setReceiveOpen(false)}>
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg p-8 transform transition-all animate-scaleIn" onClick={(e) => e.stopPropagation()}>
            {/* Header */}
            <div className="flex items-center gap-4 mb-6">
              <div className="bg-gradient-to-r from-blue-500 to-indigo-500 text-white p-4 rounded-2xl shadow-lg">
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <div>
                <h3 className="text-2xl font-bold text-gray-900">إنشاء قيود المخزون</h3>
                <p className="text-sm text-gray-600 mt-1">تحديد معلومات الاستلام</p>
              </div>
            </div>

            {/* Error Alert */}
            {receiveError && (
              <div className="mb-4 p-4 bg-red-50 border-2 border-red-200 rounded-xl flex items-start gap-3">
                <svg className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-red-800">خطأ في الإنشاء</p>
                  <p className="text-xs text-red-600 mt-1">{receiveError}</p>
                </div>
              </div>
            )}

            {/* Form Fields */}
            <div className="space-y-5 mb-8">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2 flex items-center gap-2">
                  <svg className="w-4 h-4 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                  المستودع المستهدف *
                </label>
                <select
                  className="w-full border-2 border-gray-300 rounded-xl px-4 py-3 text-sm font-medium focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition-all"
                  value={receiveWarehouseId}
                  onChange={(e) => setReceiveWarehouseId(e.target.value)}
                >
                  {warehouses.map(w => (
                    <option key={w.id} value={String(w.id)}>{w.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2 flex items-center gap-2">
                  <svg className="w-4 h-4 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  تاريخ الاستلام *
                </label>
                <input
                  type="date"
                  className="w-full border-2 border-gray-300 rounded-xl px-4 py-3 text-sm font-medium focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition-all"
                  value={receiveDate}
                  onChange={(e) => setReceiveDate(e.target.value)}
                />
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={async () => {
                  try {
                    setReceiveLoading(true);
                    setReceiveError(null);
                    if (!purchaseOrder) throw new Error('لا يوجد أمر شراء محمل');
                    const payload = {
                      ...purchaseOrder,
                      items: purchaseOrder.items || [],
                      elevators: purchaseOrder.elevators || [],
                      po_no: purchaseOrder.po_no,
                      warehouseId: receiveWarehouseId ? parseInt(receiveWarehouseId) : undefined,
                      deliveryDate: receiveDate
                    };
                    const res = await updateInventoryFromPurchaseOrder(payload);
                    if (!res.success) {
                      setReceiveError(`فشل إنشاء بعض الحركات (${res.failedCount})`);
                    } else {
                      setReceiveOpen(false);
                      success('تم إنشاء قيود المخزون بنجاح!');
                    }
                  } catch (e) {
                    setReceiveError(e.message);
                  } finally {
                    setReceiveLoading(false);
                  }
                }}
                disabled={receiveLoading}
                className="flex-1 px-6 py-3 rounded-xl bg-gradient-to-r from-green-600 to-emerald-600 text-white font-bold hover:from-green-700 hover:to-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg transform hover:scale-105 transition-all flex items-center justify-center gap-2"
              >
                {receiveLoading ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
                    جاري الإنشاء...
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    تأكيد وإنشاء القيود
                  </>
                )}
              </button>
              <button
                onClick={() => setReceiveOpen(false)}
                disabled={receiveLoading}
                className="px-6 py-3 rounded-xl border-2 border-gray-300 text-gray-700 font-semibold hover:bg-gray-50 disabled:opacity-50 transition-all"
              >
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes scaleIn {
          from { transform: scale(0.95); opacity: 0; }
          to { transform: scale(1); opacity: 1; }
        }
        .animate-fadeIn {
          animation: fadeIn 0.2s ease-out;
        }
        .animate-scaleIn {
          animation: scaleIn 0.3s ease-out;
        }
      `}</style>

      <PurchaseOrderForm
        purchaseOrder={purchaseOrder}
        suppliers={suppliers}
        onSave={handleSave}
        onCancel={handleCancel}
      />

      {/* Payment Management Section - Only show for existing purchase orders */}
      {purchaseOrder && purchaseOrder.id && (
        <div className="mt-8">
          <PaymentManager purchaseOrder={purchaseOrder} onPaymentUpdate={fetchPurchaseOrder} />
        </div>
      )}
    </Layout>
  );
};

export default PurchaseOrderDetail;
