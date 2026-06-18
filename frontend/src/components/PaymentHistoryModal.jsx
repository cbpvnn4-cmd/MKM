import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { useToast } from './ui/Toast';
import { useConfirmations } from './ui/ConfirmDialog';

const PaymentHistoryModal = ({ invoice, onClose, onRefresh }) => {
  const { success, error: toastError } = useToast();
  const { confirmDelete } = useConfirmations();

  const [invoiceDetails, setInvoiceDetails] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [deletingPaymentId, setDeletingPaymentId] = useState(null);

  useEffect(() => {
    fetchInvoiceDetails();
  }, [invoice.id]);

  const fetchInvoiceDetails = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/invoices/${invoice.id}/details`);
      setInvoiceDetails(response.data);
      setError(null);
    } catch (err) {
      setError('تعذر تحميل تفاصيل الفاتورة');
      console.error('Error fetching invoice details:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDeletePayment = async (paymentId) => {
    const confirmed = await confirmDelete('الدفعة');
    if (!confirmed) return;

    try {
      setDeletingPaymentId(paymentId);
      // AP (Accounts Payable) payments deletion endpoint
      await api.delete(`/ap-payments/${paymentId}`);
      await fetchInvoiceDetails();
      onRefresh(); // تحديث القائمة الرئيسية
      success('تم حذف الدفعة بنجاح');
    } catch (err) {
      toastError(err.response?.data?.detail || 'حدث خطأ أثناء حذف الدفعة');
      console.error('Error deleting payment:', err);
    } finally {
      setDeletingPaymentId(null);
    }
  };

  const getMethodText = (method) => {
    const methods = {
      'CASH': 'نقدي',
      'BANK_TRANSFER': 'تحويل بنكي',
      'CHECK': 'شيك',
      'CREDIT_CARD': 'بطاقة ائتمان',
      'OTHER': 'أخرى'
    };
    return methods[method] || method;
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
        <div className="relative top-20 mx-auto p-5 border w-11/12 md:w-3/4 lg:w-2/3 shadow-lg rounded-md bg-white">
          <div className="text-center py-8">جاري التحميل...</div>
        </div>
      </div>
    );
  }

  if (error || !invoiceDetails) {
    return (
      <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
        <div className="relative top-20 mx-auto p-5 border w-11/12 md:w-3/4 lg:w-2/3 shadow-lg rounded-md bg-white">
          <div className="text-center py-8 text-red-600">{error || 'حدث خطأ'}</div>
          <div className="text-center">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
            >
              إغلاق
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-10 mx-auto p-5 border w-11/12 md:w-3/4 lg:w-2/3 shadow-lg rounded-md bg-white mb-10">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-bold text-gray-900">سجل الدفعات</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Invoice Summary */}
        <div className="bg-gray-50 rounded-lg p-4 mb-6">
          <h4 className="font-semibold text-gray-900 mb-3">ملخص الفاتورة</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-500">رقم الفاتورة:</span>
              <span className="font-semibold ml-2">{invoiceDetails.invoice_no}</span>
            </div>
            <div>
              <span className="text-gray-500">المورد:</span>
              <span className="font-semibold ml-2">{invoiceDetails.supplier.name}</span>
            </div>
            <div>
              <span className="text-gray-500">رقم الطلب:</span>
              <span className="font-semibold ml-2">
                {invoiceDetails.purchase_order ? invoiceDetails.purchase_order.po_no : '-'}
              </span>
            </div>
            <div>
              <span className="text-gray-500">تاريخ الفاتورة:</span>
              <span className="font-semibold ml-2">
                {new Date(invoiceDetails.invoice_date).toLocaleDateString('ar-EG')}
              </span>
            </div>
          </div>

          <div className="border-t border-gray-200 mt-4 pt-4">
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <div className="text-sm text-gray-500">المبلغ الكلي</div>
                <div className="text-xl font-bold text-gray-900">
                  ${invoiceDetails.amount_usd.toFixed(2)}
                </div>
              </div>
              <div>
                <div className="text-sm text-gray-500">المدفوع</div>
                <div className="text-xl font-bold text-green-600">
                  ${invoiceDetails.paid_amount_usd.toFixed(2)}
                </div>
              </div>
              <div>
                <div className="text-sm text-gray-500">المتبقي</div>
                <div className="text-xl font-bold text-red-600">
                  ${invoiceDetails.remaining_amount.toFixed(2)}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Payment History */}
        <div>
          <h4 className="font-semibold text-gray-900 mb-3">
            سجل الدفعات ({invoiceDetails.payments.length})
          </h4>

          {invoiceDetails.payments.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              لا توجد دفعات مسجلة
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      التاريخ
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      المبلغ
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      الطريقة
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      رقم المرجع
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      ملاحظات
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      الإجراءات
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {invoiceDetails.payments.map((payment) => (
                    <tr key={payment.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <div className="text-sm text-gray-900">
                          {new Date(payment.paid_on).toLocaleDateString('ar-EG')}
                        </div>
                        <div className="text-xs text-gray-500">
                          {payment.created_at && `(تم التسجيل: ${new Date(payment.created_at).toLocaleDateString('ar-EG')})`}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <div className="text-sm font-semibold text-green-600">
                          ${payment.amount_usd.toFixed(2)}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <div className="text-sm text-gray-900">
                          {getMethodText(payment.method)}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <div className="text-sm text-gray-500">
                          {payment.reference_no || '-'}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="text-sm text-gray-500 max-w-xs truncate">
                          {payment.notes || '-'}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <button
                          onClick={() => handleDeletePayment(payment.id)}
                          disabled={deletingPaymentId === payment.id}
                          className="text-red-600 hover:text-red-900 disabled:text-red-300"
                        >
                          {deletingPaymentId === payment.id ? 'جاري الحذف...' : 'حذف'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="mt-6 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
          >
            إغلاق
          </button>
        </div>
      </div>
    </div>
  );
};

export default PaymentHistoryModal;
