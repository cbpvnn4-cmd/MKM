import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { 
  ArrowLeft, FilePlus, DollarSign, ClipboardList, FileText, Printer, Download,
  User, Calendar, Package, Calculator, AlertCircle, CheckCircle, Plus, Minus,
  Receipt, Building, Search, ShoppingCart, CreditCard, Save, Eye, RefreshCw,
  TrendingUp, Settings, Star, Zap, Target, BookOpen, Award, Gift, Tag, Link2,
  Mail, Phone, MapPin, CreditCard as Card, Clock, BarChart3, PieChart
} from 'lucide-react';
import Layout from '../components/Layout';
import InvoiceForm from '../components/InvoiceForm';
import InvoicePDF from '../components/pdf/InvoicePDF';
import usePdfPrint from '../hooks/usePdfPrint';
import SalesOrderItemSelector from '../components/SalesOrderItemSelector';
import { useToast } from '../components/ui/Toast';
import { useConfirmations } from '../components/ui/ConfirmDialog';
import {
  getInvoice, getSalesOrder, getSalesInvoicePayments, addSalesInvoicePayment,
  deleteSalesInvoicePayment, getProduct, getCustomers, getSalesOrders,
  getUninvoicedSalesOrders, // ✅ للحصول على أوامر البيع غير المفوترة فقط
  getNextInvoiceNumber, createInvoice, updateInvoice
} from '../services/api';

// Color schemes and status mappings
const statusLabels = {
  DRAFT: 'مسودة', ISSUED: 'صادرة', PARTIALLY_PAID: 'مدفوعة جزئياً', 
  PAID: 'مدفوعة', OVERDUE: 'متأخرة', VOID: 'ملغاة'
};

const statusColorMap = {
  DRAFT: 'text-gray-600', ISSUED: 'text-blue-600', PARTIALLY_PAID: 'text-amber-600',
  PAID: 'text-emerald-600', OVERDUE: 'text-red-600', VOID: 'text-gray-500'
};

const formatCurrency = (value) => {
  const amount = typeof value === 'number' ? value : 0;
  return new Intl.NumberFormat('en-US', { 
    style: 'currency', 
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount);
};

// Sales Order Modal Component
const SalesOrderModal = ({ show, onClose, salesOrders, onImport, search, setSearch, formatCurrency }) => {
  if (!show) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-3xl shadow-2xl max-w-4xl w-full max-h-[80vh] overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-500 to-indigo-600 px-6 py-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <ShoppingCart className="w-6 h-6 text-white" />
              <h2 className="text-xl font-bold text-white">اختر أمر بيع للاستيراد</h2>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 bg-white/20 hover:bg-white/30 rounded-lg flex items-center justify-center transition-colors"
            >
              <Plus className="w-5 h-5 text-white rotate-45" />
            </button>
          </div>
          
          {/* Additional info for excluded orders */}
          <div className="mt-3 flex items-center gap-2 text-blue-100 text-sm">
            <AlertCircle className="w-4 h-4" />
            <span>
              تم استبعاد الأوامر التي لديها فواتير بالفعل لضمان عدم التكرار
            </span>
          </div>
        </div>

        {/* Search */}
        <div className="p-6 border-b border-gray-200">
          {/* Info Notice */}
          <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-xl">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-blue-600" />
              <span className="text-sm text-blue-700 font-medium">
                النظام يعرض فقط أوامر البيع التي لم يتم عمل فواتير لها مسبقاً لتجنب التكرار
              </span>
            </div>
          </div>
          
          {/* Filter Status */}
          {!search && salesOrders.length > 0 && (
            <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-xl">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-amber-600" />
                  <span className="text-amber-700 font-medium">
                    تم استبعاد {salesOrders.filter(so => so.invoice || so.invoice_id).length} أمر بيع يحتوي على فواتير
                  </span>
                </div>
                <span className="text-amber-600 text-sm">
                  متاح: {salesOrders.filter(so => !so.invoice && !so.invoice_id).length} أمر
                </span>
              </div>
            </div>
          )}
          
          <div className="relative">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="ابحث برقم الأمر، العميل، أو المشروع..."
              className="w-full px-4 py-3 pr-12 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
            <Search className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          </div>
        </div>

        {/* Sales Orders List */}
        <div className="overflow-y-auto max-h-96 p-6">
          {salesOrders.length === 0 ? (
            <div className="text-center py-12">
              <ShoppingCart className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500 text-lg">
                {search ? 'لا توجد نتائج مطابقة للبحث' : 'لا توجد أوامر بيع متاحة للاستيراد'}
              </p>
              <p className="text-gray-400 text-sm mt-2">
                {search ? 'جرب البحث بكلمات مختلفة' : 'جميع أوامر البيع لديها فواتير مسبقاً أو لا توجد أوامر بيع'}
              </p>
            </div>
          ) : (
            <>
              {/* Stats */}
              <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-xl">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-5 h-5 text-green-600" />
                    <span className="text-green-700 font-medium">
                      متاح للاستيراد: {salesOrders.length} أمر بيع
                    </span>
                  </div>
                  <div className="text-green-600 text-sm">
                    قيمة إجمالية: {formatCurrency(salesOrders.reduce((sum, so) => sum + (so.total_usd || 0), 0))}
                  </div>
                </div>
              </div>
              
              <div className="space-y-3">
                {salesOrders.map((so) => (
                  <div
                    key={so.id}
                    className="border border-gray-200 rounded-xl p-4 hover:border-blue-400 hover:shadow-md transition-all duration-200"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-lg font-bold text-gray-800">
                            أمر بيع #{so.so_no || so.id}
                          </h3>
                          <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                            so.status === 'COMPLETED' ? 'bg-green-100 text-green-700' :
                            so.status === 'PENDING' ? 'bg-yellow-100 text-yellow-700' :
                            'bg-blue-100 text-blue-700'
                          }`}>
                            {so.status || 'PENDING'}
                          </span>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                          <div>
                            <span className="text-gray-500">العميل:</span>
                            <p className="font-semibold text-gray-800">{so.customer_name || 'غير محدد'}</p>
                          </div>
                          <div>
                            <span className="text-gray-500">المشروع:</span>
                            <p className="font-semibold text-gray-800">{so.project || 'غير محدد'}</p>
                          </div>
                          <div>
                            <span className="text-gray-500">الإجمالي:</span>
                            <p className="font-semibold text-emerald-600">{formatCurrency(so.total_usd || 0)}</p>
                          </div>
                          <div>
                            <span className="text-gray-500">التاريخ:</span>
                            <p className="font-semibold text-gray-800">
                              {so.order_date ? new Date(so.order_date).toLocaleDateString('ar-EG') : '-'}
                            </p>
                          </div>
                        </div>
                      </div>

                      <button
                        onClick={() => onImport(so)}
                        className="mr-4 px-6 py-3 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-xl font-semibold hover:from-blue-600 hover:to-indigo-700 transition-all duration-200 shadow-md hover:shadow-lg flex items-center gap-2"
                      >
                        <Download className="w-4 h-4" />
                        استيراد
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

// Invoice Creation Form Component
const InvoiceCreationForm = ({
  formData, setFormData, items, customers, customerSearch, setCustomerSearch,
  showCustomerDropdown, setShowCustomerDropdown, filteredCustomers, onCustomerSelect,
  onItemChange, onAddItem, onRemoveItem, onLinkSalesOrder, customerSalesOrdersCount
}) => {
  return (
    <div className="space-y-8">
      {/* Basic Information Section */}
      <div className="bg-gray-50 rounded-2xl p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-bold text-gray-800 flex items-center">
            <User className="w-6 h-6 mr-3 text-blue-600" />
            البيانات الأساسية
          </h3>

          {/* Link Sales Order Button */}
          <button
            onClick={onLinkSalesOrder}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-xl font-semibold hover:from-blue-600 hover:to-indigo-700 transition-all duration-200 shadow-md hover:shadow-lg"
          >
            <Link2 className="w-4 h-4" />
            ربط مع أمر بيع
          </button>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Invoice Number & Status */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              <FileText className="w-4 h-4 inline mr-2" />
              رقم الفاتورة *
            </label>
            <input
              type="text"
              value={formData.invoiceNo}
              onChange={(e) => setFormData(prev => ({ ...prev, invoiceNo: e.target.value }))}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all duration-200"
              placeholder="سيتم توليده تلقائياً"
            />
          </div>
          
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              <Calendar className="w-4 h-4 inline mr-2" />
              حالة الفاتورة
            </label>
            <select
              value={formData.status}
              onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value }))}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all duration-200"
            >
              <option value="DRAFT">مسودة</option>
              <option value="ISSUED">صادرة</option>
              <option value="PAID">مدفوعة</option>
            </select>
          </div>
        </div>

        {/* Customer Selection */}
        <div className="mt-6 relative">
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            <User className="w-4 h-4 inline mr-2" />
            العميل *
          </label>
          <div className="relative">
            <input
              type="text"
              value={customerSearch || formData.customer}
              onChange={(e) => {
                setCustomerSearch(e.target.value);
                setShowCustomerDropdown(true);
                setFormData(prev => ({ ...prev, customer: e.target.value }));
              }}
              onFocus={() => setShowCustomerDropdown(true)}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all duration-200"
              placeholder="ابحث عن العميل..."
            />
            <Search className="absolute left-3 rtl:right-3 rtl:left-auto top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          </div>

          {/* Customer Dropdown */}
          {showCustomerDropdown && filteredCustomers.length > 0 && (
            <div className="absolute z-50 w-full mt-2 bg-white border border-gray-300 rounded-xl shadow-xl max-h-60 overflow-y-auto">
              {filteredCustomers.map((customer) => (
                <button
                  key={customer.id}
                  onClick={() => onCustomerSelect(customer)}
                  className="w-full px-4 py-3 text-right hover:bg-gray-50 border-b border-gray-100 last:border-b-0 transition-colors"
                >
                  <div className="font-semibold text-gray-800">{customer.name}</div>
                  <div className="text-sm text-gray-500">{customer.email || customer.phone}</div>
                </button>
              ))}
            </div>
          )}

          {/* Customer Sales Orders Notice */}
          {formData.customerId && customerSalesOrdersCount > 0 && (
            <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-xl flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShoppingCart className="w-4 h-4 text-blue-600" />
                <span className="text-sm text-blue-700">
                  لهذا العميل <strong>{customerSalesOrdersCount}</strong> {customerSalesOrdersCount === 1 ? 'أمر بيع' : 'أوامر بيع'}
                </span>
              </div>
              <button
                onClick={onLinkSalesOrder}
                className="text-sm text-blue-600 hover:text-blue-800 font-semibold underline"
              >
                عرض الأوامر
              </button>
            </div>
          )}
        </div>

        {/* Dates */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              <Calendar className="w-4 h-4 inline mr-2" />
              تاريخ الإصدار *
            </label>
            <input
              type="date"
              value={formData.issueDate}
              onChange={(e) => setFormData(prev => ({ ...prev, issueDate: e.target.value }))}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all duration-200"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              <Calendar className="w-4 h-4 inline mr-2" />
              تاريخ الاستحقاق
            </label>
            <input
              type="date"
              value={formData.dueDate}
              onChange={(e) => setFormData(prev => ({ ...prev, dueDate: e.target.value }))}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all duration-200"
            />
          </div>
        </div>

        {/* Additional Fields */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              المشروع
            </label>
            <input
              type="text"
              value={formData.project}
              onChange={(e) => setFormData(prev => ({ ...prev, project: e.target.value }))}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all duration-200"
              placeholder="اسم المشروع أو المرجع"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              المرجع
            </label>
            <input
              type="text"
              value={formData.reference}
              onChange={(e) => setFormData(prev => ({ ...prev, reference: e.target.value }))}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all duration-200"
              placeholder="رقم المرجع أو المرجع الخارجي"
            />
          </div>
        </div>

        <div className="mt-6">
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            الملاحظات
          </label>
          <textarea
            value={formData.notes}
            onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
            rows={3}
            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all duration-200"
            placeholder="أي ملاحظات إضافية..."
          />
        </div>
      </div>

      {/* Items Section */}
      <div className="bg-gray-50 rounded-2xl p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-bold text-gray-800 flex items-center">
            <Package className="w-6 h-6 mr-3 text-emerald-600" />
            البنود والأسعار
          </h3>
          <button
            onClick={onAddItem}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-100 text-emerald-700 rounded-xl hover:bg-emerald-200 transition-colors"
          >
            <Plus className="w-4 h-4" />
            إضافة بند
          </button>
        </div>

        {/* Items Table */}
        <div className="overflow-hidden rounded-xl border border-gray-200">
          <table className="w-full">
            <thead className="bg-gradient-to-r from-gray-50 to-gray-100">
              <tr>
                <th className="px-6 py-4 text-right text-sm font-semibold text-gray-700">الوصف</th>
                <th className="px-4 py-4 text-center text-sm font-semibold text-gray-700">الكمية</th>
                <th className="px-4 py-4 text-center text-sm font-semibold text-gray-700">سعر الوحدة</th>
                <th className="px-4 py-4 text-center text-sm font-semibold text-gray-700">الخصم %</th>
                <th className="px-4 py-4 text-center text-sm font-semibold text-gray-700">الإجمالي</th>
                <th className="px-4 py-4 text-center text-sm font-semibold text-gray-700">إجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {items.map((item, index) => (
                <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4">
                    <textarea
                      value={item.description}
                      onChange={(e) => onItemChange(item.id, 'description', e.target.value)}
                      placeholder="وصف البند أو الخدمة..."
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg resize-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      rows={2}
                    />
                  </td>
                  <td className="px-4 py-4 text-center">
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={item.qty}
                      onChange={(e) => onItemChange(item.id, 'qty', e.target.value)}
                      className="w-20 px-3 py-2 border border-gray-300 rounded-lg text-center focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </td>
                  <td className="px-4 py-4 text-center">
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={item.unitPrice}
                      onChange={(e) => onItemChange(item.id, 'unitPrice', e.target.value)}
                      className="w-24 px-3 py-2 border border-gray-300 rounded-lg text-center focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </td>
                  <td className="px-4 py-4 text-center">
                    <input
                      type="number"
                      min="0"
                      max="100"
                      step="0.01"
                      value={item.discount}
                      onChange={(e) => onItemChange(item.id, 'discount', e.target.value)}
                      className="w-20 px-3 py-2 border border-gray-300 rounded-lg text-center focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </td>
                  <td className="px-4 py-4 text-center">
                    <span className="font-semibold text-emerald-600">
                      {formatCurrency(item.lineTotal)}
                    </span>
                  </td>
                  <td className="px-4 py-4 text-center">
                    <button
                      onClick={() => onRemoveItem(item.id)}
                      disabled={items.length === 1}
                      className="p-2 text-red-500 hover:bg-red-50 rounded-lg disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                    >
                      <Minus className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Tax & Discount Settings */}
      <div className="bg-gray-50 rounded-2xl p-6">
        <h3 className="text-xl font-bold text-gray-800 mb-6 flex items-center">
          <Calculator className="w-6 h-6 mr-3 text-purple-600" />
          الإعدادات المالية
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              نسبة الضريبة (%)
            </label>
            <input
              type="number"
              min="0"
              max="100"
              step="0.01"
              value={formData.tax}
              onChange={(e) => setFormData(prev => ({ ...prev, tax: parseFloat(e.target.value) || 0 }))}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all duration-200"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              خصم عام (%)
            </label>
            <input
              type="number"
              min="0"
              max="100"
              step="0.01"
              value={formData.discount}
              onChange={(e) => setFormData(prev => ({ ...prev, discount: parseFloat(e.target.value) || 0 }))}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all duration-200"
            />
          </div>
        </div>
      </div>
    </div>
  );
};

const InvoiceDetailUltimate = () => {
  const navigate = useNavigate();
  const { id: routeId } = useParams();
  const [searchParams] = useSearchParams();
  const { success, error: toastError } = useToast();
  const { confirmDelete } = useConfirmations();
  const [invoice, setInvoice] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [prefillInvoice, setPrefillInvoice] = useState(null);
  const [linkedSalesOrderId, setLinkedSalesOrderId] = useState(null);
  const [salesOrderDetails, setSalesOrderDetails] = useState(null);
  const [productDetails, setProductDetails] = useState({});
  const [payments, setPayments] = useState([]);
  const [payLoading, setPayLoading] = useState(false);
  const [payError, setPayError] = useState(null);
  const [showPayForm, setShowPayForm] = useState(false);
  
  // Enhanced form states for new invoice creation
  const [formData, setFormData] = useState({
    invoiceNo: '',
    customer: '',
    customerId: null,
    issueDate: new Date().toISOString().split('T')[0],
    dueDate: '',
    status: 'DRAFT',
    tax: 0,
    discount: 0,
    notes: '',
    project: '',
    reference: ''
  });

  const [items, setItems] = useState([{ id: 1, description: '', qty: 1, unitPrice: 0, discount: 0, lineTotal: 0 }]);
  const [customers, setCustomers] = useState([]);
  const [salesOrders, setSalesOrders] = useState([]);
  const [customerSearch, setCustomerSearch] = useState('');
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
  const [showSalesOrderModal, setShowSalesOrderModal] = useState(false);
  const [salesOrderSearch, setSalesOrderSearch] = useState('');
  const [paymentForm, setPaymentForm] = useState({
    amount_usd: '', paid_on: new Date().toISOString().split('T')[0], method: 'CASH', note: ''
  });

  // New states for selective item import
  const [showItemSelector, setShowItemSelector] = useState(false);
  const [tempSelectedOrderId, setTempSelectedOrderId] = useState('');

  const [calculations, setCalculations] = useState({ subtotal: 0, discountAmount: 0, taxAmount: 0, total: 0 });


  // Route and mode detection
  const invoiceId = routeId && routeId !== 'new' ? routeId : null;
  const salesOrderParam = !invoiceId ? searchParams.get('fromSalesOrder') : null;
  const isEditMode = Boolean(invoiceId);
  const activeInvoice = isEditMode ? invoice : prefillInvoice;
  const pdfFileName = useMemo(() => `Invoice_${activeInvoice?.invoice_no || activeInvoice?.invoiceNo || 'draft'}.pdf`, [activeInvoice]);
  const { print: handlePrint, download: handleExportPDF, printing, downloading } = usePdfPrint({
    createDocument: () => <InvoicePDF invoice={activeInvoice} />,
    fileName: pdfFileName,
  });

  // Calculate totals in real-time
  useEffect(() => {
    const subtotal = items.reduce((sum, item) => {
      const lineTotal = (item.qty || 0) * (item.unitPrice || 0);
      const itemDiscount = (item.discount || 0) * lineTotal / 100;
      return sum + (lineTotal - itemDiscount);
    }, 0);

    const discountAmount = (formData.discount || 0) * subtotal / 100;
    const taxAmount = (formData.tax || 0) * (subtotal - discountAmount) / 100;
    const total = subtotal - discountAmount + taxAmount;

    setCalculations({ subtotal, discountAmount, taxAmount, total });

    // Update prefill invoice for new invoices
    if (!invoiceId && prefillInvoice) {
      setPrefillInvoice({
        ...prefillInvoice,
        ...formData,
        items: items,
        total: total
      });
    }
  }, [items, formData, invoiceId, prefillInvoice]);

  // Load initial data
  useEffect(() => {
    const loadInitialData = async () => {
      try {
        setLoading(true);
        
        // Load customers and ONLY uninvoiced sales orders (prevent duplicate invoicing)
        const [customersData, salesOrdersData] = await Promise.all([
          getCustomers(0, 100),
          getUninvoicedSalesOrders() // ✅ Only load orders without invoices
        ]);
        setCustomers(customersData?.data || customersData || []);
        setSalesOrders(Array.isArray(salesOrdersData) ? salesOrdersData : []);

        // Load next invoice number for new invoices
        if (!invoiceId) {
          try {
            const nextInvoiceData = await getNextInvoiceNumber();
            setFormData(prev => ({ ...prev, invoiceNo: nextInvoiceData.invoiceNo || '' }));
          } catch (err) {
            console.log('Could not get next invoice number');
          }
        }

        // Load existing invoice if editing
        if (invoiceId) {
          await loadInvoiceData();
        } else {
          // Initialize new invoice
          await initializeNewInvoice();
        }

        setError(null);
      } catch (err) {
        setError('فشل في تحميل البيانات الأساسية');
        console.error('Error loading initial data:', err);
      } finally {
        setLoading(false);
      }
    };

    loadInitialData();
  }, [invoiceId]);

  const loadInvoiceData = async () => {
    try {
      const [invoiceData, paymentsData] = await Promise.all([
        getInvoice(invoiceId),
        getSalesInvoicePayments(invoiceId)
      ]);
      
      setInvoice(invoiceData);
      setLinkedSalesOrderId(invoiceData?.sales_order_id ?? null);
      setPayments(Array.isArray(paymentsData) ? paymentsData : []);
      setError(null);
    } catch (err) {
      setError('فشل في تحميل بيانات الفاتورة');
      console.error('Error loading invoice data:', err);
    }
  };

  const initializeNewInvoice = async () => {
    if (salesOrderParam) {
      await loadSalesOrderForNewInvoice();
    } else {
      setPrefillInvoice({
        invoiceNo: formData.invoiceNo,
        customer: '',
        issueDate: formData.issueDate,
        dueDate: '',
        status: 'DRAFT',
        tax: 0,
        items: [{ id: Date.now(), description: '', qty: 1, unitPrice: 0 }],
        payments: [],
        total: 0,
        paid: 0,
        balance: 0,
      });
    }
  };

  const loadSalesOrderForNewInvoice = async () => {
    try {
      const data = await loadSalesOrderDetails(salesOrderParam);
      if (data) {
        const prepared = buildInvoiceFromSalesOrder(data);
        setPrefillInvoice(prepared);
        setLinkedSalesOrderId(data?.id || null);
      }
    } catch (err) {
      setError('فشل في تحميل البيانات من أمر البيع المحدد.');
    }
  };

  // Load sales order details with product information
  const loadSalesOrderDetails = useCallback(async (orderId) => {
    if (!orderId) return null;
    
    try {
      const data = await getSalesOrder(orderId);
      setSalesOrderDetails(data);
      
      const items = Array.isArray(data?.items) ? data.items : [];
      const uniqueProductIds = [...new Set(items.map(item => item?.product_id).filter(Boolean))];
      
      if (uniqueProductIds.length) {
        const results = await Promise.all(
          uniqueProductIds.map(async (id) => {
            try {
              const product = await getProduct(id);
              return [id, product];
            } catch (err) {
              console.error('Error fetching product info for invoice:', err);
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
      } else {
        setProductDetails({});
      }
      return data;
    } catch (err) {
      console.error('Error loading sales order details:', err);
      setSalesOrderDetails(null);
      setProductDetails({});
      return null;
    }
  }, []);

  // Build invoice from sales order
  const buildInvoiceFromSalesOrder = useCallback((salesOrder) => {
    if (!salesOrder) return null;

    const orderType = String(salesOrder.order_type || salesOrder.orderType || 'items').toLowerCase();
    const rawItems = Array.isArray(salesOrder.items) ? salesOrder.items : [];
    const baseId = Date.now();

    const mappedItems = rawItems.map((item, index) => {
      const qty = Number(item.qty ?? item.quantity ?? 0) || 1;
      const unitPrice = Number(
        item.unit_price_usd ?? item.unitPrice ?? item.sale_price ?? item.line_total_usd ?? 0
      ) || 0;
      const lineTotal = Number(item.line_total_usd ?? item.lineTotal ?? qty * unitPrice) || qty * unitPrice;

      let description = '';
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
        description = `مصعد ${index + 1}${details.length ? ` (${details.join(' | ')})` : ''}`;
      } else {
        description = item.product?.name || item.product_name || item.product || `بند ${index + 1}`;
      }

      return {
        id: baseId + index,
        description,
        qty,
        unitPrice,
        lineTotal,
      };
    });

    const safeItems = mappedItems.length > 0 ? mappedItems : [
      { id: Date.now(), description: '', qty: 1, unitPrice: 0, lineTotal: 0 }
    ];

    const total = safeItems.reduce((sum, current) => sum + (Number(current.lineTotal) || 0), 0);

    const resolveCustomerName = () => {
      const customer = salesOrder.customer;
      if (typeof customer === 'string') return customer;
      if (customer && typeof customer === 'object') return customer.name || customer.displayName || '';
      return salesOrder.customer_name || salesOrder.customerName || salesOrder.client || salesOrder.clientName || '';
    };

    return {
      invoiceNo: '',
      customer: resolveCustomerName(),
      project: salesOrder.project || '',
      issueDate: new Date().toISOString().split('T')[0],
      dueDate: '',
      status: 'DRAFT',
      tax: 0,
      items: safeItems,
      payments: [],
      total,
      paid: 0,
      balance: total,
      sales_order_id: salesOrder.id,
      sourceSalesOrderNo: salesOrder.so_no || salesOrder.soNo || '',
    };
  }, []);

  // Customer management functions
  const filteredCustomers = customers.filter(customer =>
    customer.name?.toLowerCase().includes(customerSearch.toLowerCase()) ||
    customer.email?.toLowerCase().includes(customerSearch.toLowerCase()) ||
    customer.phone?.includes(customerSearch)
  );

  const handleCustomerSelect = (customer) => {
    setFormData(prev => ({
      ...prev,
      customer: customer.name,
      customerId: customer.id
    }));
    setCustomerSearch(customer.name);
    setShowCustomerDropdown(false);
  };

  // Handle sales order import
  const handleImportSalesOrder = async (salesOrder, importMode = 'replace') => {
    try {
      setLoading(true);

      // Load full sales order details
      const fullSalesOrder = await loadSalesOrderDetails(salesOrder.id);
      if (!fullSalesOrder) {
        toastError('فشل في تحميل تفاصيل أمر البيع');
        return;
      }

      // Show item selector instead of automatically importing all items
      setTempSelectedOrderId(salesOrder.id);
      setShowItemSelector(true);
      setShowSalesOrderModal(false);
      setSalesOrderSearch('');

    } catch (err) {
      console.error('Error importing sales order:', err);
      toastError('حدث خطأ أثناء استيراد أمر البيع');
    } finally {
      setLoading(false);
    }
  };

  // New function to handle selected items from sales order
  const handleSelectedItemsFromSalesOrder = async (selectedItems) => {
    if (!selectedItems || selectedItems.length === 0) {
      return;
    }

    try {
      setLoading(true);

      // Get full sales order details to populate customer and project info
      const fullSalesOrder = await loadSalesOrderDetails(tempSelectedOrderId);
      if (!fullSalesOrder) {
        toastError('فشل في تحميل بيانات أمر البيع');
        return;
      }

      const baseId = Date.now();
      const mappedItems = selectedItems.map((item, index) => {
        const qty = Number(item.qty ?? item.quantity ?? 1) || 1;
        const unitPrice = Number(
          item.unit_price_usd ?? item.unitPrice ?? item.sale_price ?? 0
        ) || 0;
        const lineTotal = qty * unitPrice;
        
        return {
          id: baseId + index,
          description: item.description || `بند ${index + 1}`,
          qty,
          unitPrice,
          lineTotal,
        };
      });

      // If there are existing items, append new items
      // Otherwise, replace with selected items
      setItems(prevItems => {
        if (prevItems.length === 0 ||
            (prevItems.length === 1 && !prevItems[0].description)) {
          return mappedItems;
        } else {
          return [...prevItems, ...mappedItems];
        }
      });

      // Populate customer and project information from sales order
      const customerName = fullSalesOrder.customer?.name || fullSalesOrder.customer_name || '';
      const customerId = fullSalesOrder.customer_id || null;
      const project = fullSalesOrder.project || '';

      // Set customer data properly
      if (customerId) {
        setFormData(prev => ({
          ...prev,
          customer: customerName,
          customerId: customerId,
          project: project
        }));
      } else {
        // If no customer ID, just set name and project
        setFormData(prev => ({
          ...prev,
          customer: customerName,
          project: project
        }));
      }

      // Update customer search field
      setCustomerSearch(customerName);

      // Set linked sales order
      setLinkedSalesOrderId(tempSelectedOrderId);
      setSalesOrderDetails(fullSalesOrder);

      // Close the item selector
      setShowItemSelector(false);
      setTempSelectedOrderId('');

      success(`تم استيراد ${mappedItems.length} بند من أمر البيع مع بيانات العميل!`);

    } catch (err) {
      console.error('Error loading sales order details:', err);
      toastError('حدث خطأ أثناء تحميل بيانات أمر البيع');
    } finally {
      setLoading(false);
    }
  };

  // Function to handle opening item selector for existing selected order
  const handleSelectItemsFromOrder = async () => {
    if (!linkedSalesOrderId) return;
    
    setTempSelectedOrderId(linkedSalesOrderId);
    setShowItemSelector(true);
  };

  // Filter sales orders - exclude those that already have invoices
  const filteredSalesOrders = salesOrders.filter(so => {
    // Enhanced filtering to ensure we exclude invoiced orders completely
    // Check multiple conditions to be absolutely sure
    const hasInvoice = so.has_invoice === true ||
                      so.invoice ||
                      so.invoice_id ||
                      so.invoice_status ||
                      (so.invoice_id && so.invoice_id !== null && so.invoice_id !== undefined);
    
    if (hasInvoice) {
      console.log('🔴 Excluding invoiced order:', so.so_no || so.id, {
        has_invoice: so.has_invoice,
        invoice: so.invoice,
        invoice_id: so.invoice_id,
        invoice_status: so.invoice_status
      });
      return false;
    }

    const searchLower = salesOrderSearch.toLowerCase();
    const matchesSearch =
      so.so_no?.toLowerCase().includes(searchLower) ||
      so.customer_name?.toLowerCase().includes(searchLower) ||
      so.project?.toLowerCase().includes(searchLower);

    // If customer is selected, filter by customer
    if (formData.customerId) {
      return matchesSearch && so.customer_id === formData.customerId;
    }

    return matchesSearch;
  });

  // Count customer's sales orders
  const customerSalesOrdersCount = formData.customerId
    ? salesOrders.filter(so => so.customer_id === formData.customerId).length
    : 0;

  // Items management
  const handleItemChange = (id, field, value) => {
    setItems(prev => prev.map(item => {
      if (item.id === id) {
        const updatedItem = { ...item, [field]: field === 'qty' || field === 'unitPrice' || field === 'discount' ? parseFloat(value) || 0 : value };
        
        // Recalculate line total
        const lineTotal = (updatedItem.qty || 0) * (updatedItem.unitPrice || 0);
        const itemDiscount = (updatedItem.discount || 0) * lineTotal / 100;
        updatedItem.lineTotal = lineTotal - itemDiscount;
        
        return updatedItem;
      }
      return item;
    }));
  };

  const addNewItem = () => {
    const newId = Math.max(...items.map(item => item.id)) + 1;
    setItems(prev => [...prev, {
      id: newId,
      description: '',
      qty: 1,
      unitPrice: 0,
      discount: 0,
      lineTotal: 0
    }]);
  };

  const removeItem = (id) => {
    if (items.length > 1) {
      setItems(prev => prev.filter(item => item.id !== id));
    }
  };

  // Payments management
  const handleAddPayment = async (e) => {
    e?.preventDefault?.();
    if (!invoiceId) return;
    try {
      setPayLoading(true);
      const payload = {
        amount_usd: parseFloat(paymentForm.amount_usd) || 0,
        paid_on: paymentForm.paid_on,
        method: paymentForm.method,
        note: paymentForm.note || ''
      };
      await addSalesInvoicePayment(invoiceId, payload);
      setShowPayForm(false);
      setPaymentForm({ amount_usd: '', paid_on: new Date().toISOString().split('T')[0], method: 'CASH', note: '' });
      const list = await getSalesInvoicePayments(invoiceId);
      setPayments(Array.isArray(list) ? list : []);
    } catch (e) {
      toastError(e?.response?.data?.detail || 'خطأ في إضافة الدفعة');
    } finally {
      setPayLoading(false);
    }
  };

  const handleDeletePayment = async (paymentId) => {
    const confirmed = await confirmDelete('هل أنت متأكد؟');
    if (!confirmed) return;
    try {
      setPayLoading(true);
      await deleteSalesInvoicePayment(paymentId);
      const list = await getSalesInvoicePayments(invoiceId);
      setPayments(Array.isArray(list) ? list : []);
    } catch (e) {
      toastError(e?.response?.data?.detail || 'خطأ حذف الدفعة');
    } finally {
      setPayLoading(false);
    }
  };

  // Save invoice
  const handleSave = async () => {
    try {
      setLoading(true);
      
      // Validate form
      const validationErrors = validateForm();
      if (validationErrors.length > 0) {
        setError(validationErrors.join('\n'));
        return;
      }

      const invoiceData = {
        invoice_no: formData.invoiceNo,
        issue_date: formData.issueDate,
        due_date: formData.dueDate || null,
        status: formData.status,
        tax_pct: typeof formData.tax === 'number' ? formData.tax : 0,
        customer_id: formData.customerId || null,
        currency: 'USD',
        subtotal_usd: calculations.subtotal,
        tax_amount_usd: calculations.taxAmount,
        total_usd: calculations.total,
      };

      if (isEditMode) {
        await updateInvoice(invoiceId, invoiceData);
      } else {
        await createInvoice(invoiceData);
      }
      
      navigate('/invoices');
    } catch (err) {
      setError('فشل في حفظ الفاتورة');
      console.error('Error saving invoice:', err);
    } finally {
      setLoading(false);
    }
  };

  const validateForm = () => {
    const errors = [];
    if (!formData.invoiceNo?.trim()) errors.push('رقم الفاتورة مطلوب');
    if (!formData.customer?.trim()) errors.push('اسم العميل مطلوب');
    if (!formData.issueDate) errors.push('تاريخ الإصدار مطلوب');
    
    const validItems = items.filter(item => item.description?.trim() && item.qty > 0 && item.unitPrice >= 0);
    if (validItems.length === 0) errors.push('يجب إضافة بند واحد على الأقل');

    return errors;
  };

  // Status and totals derived from active invoice data
  const statusDisplay = activeInvoice?.status ? (statusLabels[activeInvoice.status] || activeInvoice.status) : 'مسودة';
  const statusColor = activeInvoice?.status ? (statusColorMap[activeInvoice.status] || 'text-purple-600') : 'text-purple-600';
  
  const computeItemsTotal = (inv) => {
    if (!inv || !Array.isArray(inv.items)) return 0;
    return inv.items.reduce((sum, item) => {
      const qty = Number(item.qty ?? 0) || 0;
      const unitPrice = Number(item.unitPrice ?? item.unit_price_usd ?? 0) || 0;
      const lineTotal = Number(item.lineTotal ?? item.line_total_usd ?? qty * unitPrice) || qty * unitPrice;
      return sum + lineTotal;
    }, 0);
  };

  const itemsTotal = computeItemsTotal(activeInvoice);
  const totalAmount = activeInvoice ? (typeof activeInvoice.total === 'number' ? activeInvoice.total : itemsTotal) : 0;
  const paidAmount = activeInvoice && typeof activeInvoice.paid === 'number' ? activeInvoice.paid : 0;
  const balanceAmount = activeInvoice && typeof activeInvoice.balance === 'number' ? activeInvoice.balance : totalAmount - paidAmount;

  // Handle navigation
  const handleCancel = () => navigate('/invoices');

  // Loading state
  if (loading) {
    return (
      <Layout>
        <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex items-center justify-center px-4">
          <div className="bg-white/90 backdrop-blur-sm rounded-3xl shadow-2xl border border-white/20 px-10 py-12 text-center max-w-md">
            <div className="w-16 h-16 mx-auto mb-6 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full flex items-center justify-center">
              <FilePlus className="w-8 h-8 text-white animate-pulse" />
            </div>
            <h2 className="text-2xl font-bold text-gray-800 mb-2">{isEditMode ? 'جارٍ تحميل بيانات الفاتورة' : 'جارٍ إعداد النموذج'}</h2>
            <p className="text-gray-600">يرجى الانتظار قليلاً...</p>
            <div className="mt-6 w-full bg-gray-200 rounded-full h-2">
              <div className="bg-gradient-to-r from-blue-500 to-indigo-600 h-2 rounded-full animate-pulse" style={{ width: '70%' }}></div>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  // Error state
  if (error) {
    return (
      <Layout>
        <div className="min-h-screen bg-gradient-to-br from-red-50 via-white to-pink-50 flex items-center justify-center px-4">
          <div className="bg-white/90 backdrop-blur-sm rounded-3xl shadow-2xl border border-white/20 px-10 py-12 text-center max-w-md">
            <div className="w-16 h-16 mx-auto mb-6 bg-gradient-to-r from-red-500 to-pink-600 rounded-full flex items-center justify-center">
              <AlertCircle className="w-8 h-8 text-white" />
            </div>
            <h2 className="text-2xl font-bold text-gray-800 mb-4">حدث خطأ</h2>
            <p className="text-gray-600 mb-6 whitespace-pre-line">{error}</p>
            <button
              onClick={handleCancel}
              className="w-full bg-gradient-to-r from-red-500 to-pink-600 text-white px-6 py-3 rounded-xl font-semibold hover:from-red-600 hover:to-pink-700 transition-all duration-200 shadow-lg hover:shadow-xl"
            >
              العودة إلى الفواتير
            </button>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50">
        {/* Header */}
        <div className="bg-white/80 backdrop-blur-sm shadow-xl border-b border-white/20 sticky top-0 z-40">
          <div className="max-w-7xl mx-auto px-6 py-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4 rtl:space-x-reverse">
                <button
                  onClick={handleCancel}
                  className="w-12 h-12 bg-gradient-to-br from-gray-400 to-gray-600 rounded-xl flex items-center justify-center hover:from-gray-500 hover:to-gray-700 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105"
                >
                  <ArrowLeft className="w-6 h-6 text-white" />
                </button>
                <div className="w-12 h-12 bg-gradient-to-br from-emerald-500 to-blue-600 rounded-xl flex items-center justify-center shadow-lg">
                  <Receipt className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h1 className="text-3xl font-bold text-gray-800">{isEditMode ? 'تعديل الفاتورة' : 'فاتورة جديدة'}</h1>
                  <p className="text-gray-600 mt-1">{isEditMode ? 'تعديل تفاصيل الفاتورة وإدارة المدفوعات' : 'إنشاء فاتورة احترافية في خطوات بسيطة'}</p>
                </div>
              </div>
              
              <div className="flex items-center gap-3">
                {isEditMode && activeInvoice && (
                  <>
                    <button
                      onClick={handlePrint}
                      className="flex items-center gap-2 px-5 py-3 bg-white hover:bg-gray-50 text-gray-700 border-2 border-gray-300 hover:border-gray-400 rounded-xl font-semibold transition-all duration-200 shadow-sm hover:shadow-md disabled:opacity-60 disabled:cursor-not-allowed"
                      disabled={printing || downloading}
                    >
                      <Printer className="w-5 h-5" />
                      {printing ? 'جارٍ التحضير...' : 'طباعة'}
                    </button>
                    <button
                      onClick={handleExportPDF}
                      className="flex items-center gap-2 px-5 py-3 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white rounded-xl font-semibold transition-all duration-200 shadow-md hover:shadow-lg disabled:opacity-60 disabled:cursor-not-allowed"
                      disabled={printing || downloading}
                    >
                      <Download className="w-5 h-5" />
                      {downloading ? 'جارٍ التحميل...' : 'تصدير PDF'}
                    </button>
                  </>
                )}
                <button
                  onClick={handleSave}
                  disabled={loading}
                  className="flex items-center gap-2 px-8 py-3 bg-gradient-to-r from-emerald-500 to-blue-600 text-white rounded-xl font-semibold hover:from-emerald-600 hover:to-blue-700 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Save className="w-5 h-5" />
                  {loading ? 'جارٍ الحفظ...' : 'حفظ الفاتورة'}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Sales Order Link Notice */}
        {linkedSalesOrderId && !isEditMode && activeInvoice && (
          <div className="max-w-7xl mx-auto px-6 py-4">
            <div className="mb-6 bg-blue-50 border border-blue-200 text-blue-700 rounded-2xl px-6 py-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
              <div>
                <p className="font-semibold">تم الربط مع أمر البيع #{activeInvoice.sourceSalesOrderNo || linkedSalesOrderId}</p>
                <p className="text-sm mt-1">تم استيراد البنود تلقائياً من أمر البيع المحدد.</p>
              </div>
              <button
                onClick={() => linkedSalesOrderId && navigate(`/sales-orders/${linkedSalesOrderId}`)}
                className="inline-flex items-center gap-2 px-4 py-2 bg-white text-blue-700 border border-blue-200 rounded-xl hover:bg-blue-100 transition-colors"
              >
                <ArrowLeft className="w-4 h-4 rotate-180" />
                عرض أمر البيع
              </button>
            </div>
          </div>
        )}

        {/* Quick Stats Cards */}
        <div className="max-w-7xl mx-auto px-6 py-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">إجمالي الفاتورة</p>
                  <p className="text-3xl font-bold text-blue-600">{formatCurrency(totalAmount)}</p>
                  <p className="text-xs text-gray-500 mt-1">{isEditMode ? 'المبلغ الإجمالي المستحق' : 'إجمالي قيمة البنود'}</p>
                </div>
                <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                  <DollarSign className="w-6 h-6 text-blue-600" />
                </div>
              </div>
            </div>

            <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">المبلغ المتبقي</p>
                  <p className="text-3xl font-bold text-emerald-600">{formatCurrency(balanceAmount)}</p>
                  <p className="text-xs text-gray-500 mt-1">{isEditMode ? `تم دفع ${formatCurrency(paidAmount)}` : 'المبلغ المتبقي للدفع'}</p>
                </div>
                <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center">
                  <ClipboardList className="w-6 h-6 text-emerald-600" />
                </div>
              </div>
            </div>

            <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">حالة الفاتورة</p>
                  <p className={`text-3xl font-bold ${statusColor}`}>{statusDisplay}</p>
                  <p className="text-xs text-gray-500 mt-1">{isEditMode ? 'الحالة الحالية' : 'ستتغير حسب المدفوعات'}</p>
                </div>
                <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
                  <FileText className="w-6 h-6 text-purple-600" />
                </div>
              </div>
            </div>

            <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">عدد البنود</p>
                  <p className="text-3xl font-bold text-amber-600">{isEditMode ? (activeInvoice?.items?.length || 0) : items.length}</p>
                  <p className="text-xs text-gray-500 mt-1">بند في الفاتورة</p>
                </div>
                <div className="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center">
                  <Package className="w-6 h-6 text-amber-600" />
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
            {/* Main Form Area */}
            <div className="lg:col-span-3">
              <div className="bg-white/80 backdrop-blur-sm rounded-3xl shadow-2xl border border-white/20 overflow-hidden">
                
                {/* Form Content */}
                <div className="p-8">
                  {!activeInvoice ? (
                    <div className="text-center py-12">
                      <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
                      <p className="mt-4 text-gray-600">جارٍ تحميل نموذج الفاتورة...</p>
                    </div>
                  ) : isEditMode ? (
                    // Edit Mode - Use existing InvoiceForm component
                    <InvoiceForm
                      invoice={activeInvoice}
                      linkedSalesOrderId={invoice?.sales_order_id ?? null}
                      onSave={handleSave}
                      onCancel={handleCancel}
                    />
                  ) : (
                    // New Mode - Enhanced Custom Form
                    <InvoiceCreationForm
                      formData={formData}
                      setFormData={setFormData}
                      items={items}
                      customers={customers}
                      customerSearch={customerSearch}
                      setCustomerSearch={setCustomerSearch}
                      showCustomerDropdown={showCustomerDropdown}
                      setShowCustomerDropdown={setShowCustomerDropdown}
                      filteredCustomers={filteredCustomers}
                      onCustomerSelect={handleCustomerSelect}
                      onItemChange={handleItemChange}
                      onAddItem={addNewItem}
                      onRemoveItem={removeItem}
                      onLinkSalesOrder={() => setShowSalesOrderModal(true)}
                      customerSalesOrdersCount={customerSalesOrdersCount}
                    />
                  )}
                </div>
              </div>
            </div>

            {/* Sidebar */}
            <div className="lg:col-span-1">
              <div className="sticky top-24 space-y-6">
                
                {/* Invoice Summary */}
                <div className="bg-white/80 backdrop-blur-sm rounded-3xl shadow-2xl border border-white/20 p-6">
                  <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
                    <Calculator className="w-5 h-5 mr-2" />
                    ملخص الفاتورة
                  </h3>
                  
                  <div className="space-y-4">
                    <div className="flex justify-between items-center py-2 border-b border-gray-200">
                      <span className="text-gray-600">المجموع الفرعي:</span>
                      <span className="font-semibold">{formatCurrency(calculations.subtotal)}</span>
                    </div>
                    
                    {calculations.discountAmount > 0 && (
                      <div className="flex justify-between items-center py-2 border-b border-gray-200">
                        <span className="text-gray-600">الخصم ({formData.discount}%):</span>
                        <span className="font-semibold text-red-600">-{formatCurrency(calculations.discountAmount)}</span>
                      </div>
                    )}
                    
                    {formData.tax > 0 && (
                      <div className="flex justify-between items-center py-2 border-b border-gray-200">
                        <span className="text-gray-600">الضريبة ({formData.tax}%):</span>
                        <span className="font-semibold text-amber-600">{formatCurrency(calculations.taxAmount)}</span>
                      </div>
                    )}
                    
                    <div className="bg-gradient-to-r from-emerald-500 to-blue-600 text-white rounded-xl p-4">
                      <div className="flex justify-between items-center">
                        <span className="font-semibold">الإجمالي النهائي:</span>
                        <span className="text-2xl font-bold">{formatCurrency(calculations.total)}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Quick Stats */}
                <div className="bg-white/80 backdrop-blur-sm rounded-3xl shadow-2xl border border-white/20 p-6">
                  <h3 className="text-lg font-semibold text-gray-800 mb-4">إحصائيات سريعة</h3>
                  
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-3 bg-blue-50 rounded-xl">
                      <div className="flex items-center">
                        <Package className="w-5 h-5 text-blue-600 mr-2" />
                        <span className="text-sm font-medium text-gray-700">عدد البنود</span>
                      </div>
                      <span className="font-bold text-blue-600">{items.length}</span>
                    </div>
                    
                    <div className="flex items-center justify-between p-3 bg-emerald-50 rounded-xl">
                      <div className="flex items-center">
                        <User className="w-5 h-5 text-emerald-600 mr-2" />
                        <span className="text-sm font-medium text-gray-700">حالة العميل</span>
                      </div>
                      <span className="font-bold text-emerald-600">
                        {(formData.customerId && formData.customer) ? 'محدد' : 'غير محدد'}
                      </span>
                    </div>
                    
                    <div className="flex items-center justify-between p-3 bg-purple-50 rounded-xl">
                      <div className="flex items-center">
                        <FileText className="w-5 h-5 text-purple-600 mr-2" />
                        <span className="text-sm font-medium text-gray-700">رقم الفاتورة</span>
                      </div>
                      <span className="font-bold text-purple-600 text-xs">
                        {formData.invoiceNo || 'غير محدد'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Quick Tips */}
                <div className="bg-white/80 backdrop-blur-sm rounded-3xl shadow-2xl border border-white/20 p-6">
                  <h3 className="text-lg font-semibold text-gray-800 mb-4">نصائح سريعة</h3>
                  <div className="space-y-3">
                    <div className="flex items-start space-x-3 rtl:space-x-reverse">
                      <div className="w-2 h-2 bg-blue-500 rounded-full mt-2" />
                      <div>
                        <p className="text-sm font-medium text-gray-700">إضافة بنود متعددة</p>
                        <p className="text-xs text-gray-600">يمكنك إضافة عدة بنود والنظام سيحسب الإجمالي تلقائياً</p>
                      </div>
                    </div>
                    
                    <div className="flex items-start space-x-3 rtl:space-x-reverse">
                      <div className="w-2 h-2 bg-emerald-500 rounded-full mt-2" />
                      <div>
                        <p className="text-sm font-medium text-gray-700">ربط مع أوامر البيع</p>
                        <p className="text-xs text-gray-600">يمكنك ربط الفاتورة لاستيراد البنود تلقائياً</p>
                      </div>
                    </div>
                    
                    <div className="flex items-start space-x-3 rtl:space-x-reverse">
                      <div className="w-2 h-2 bg-purple-500 rounded-full mt-2" />
                      <div>
                        <p className="text-sm font-medium text-gray-700">طباعة وتصدير PDF</p>
                        <p className="text-xs text-gray-600">يمكنك طباعة الفاتورة أو تصديرها بصيغة PDF</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Payments Section - Only for Edit Mode */}
          {isEditMode && (
            <div className="mt-8 bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 overflow-hidden">
              <div className="bg-gradient-to-r from-emerald-500 to-green-600 px-8 py-6">
                <h2 className="text-xl font-bold text-white">المدفوعات</h2>
                <p className="text-emerald-100 mt-1">إدارة وتتبع جميع المدفوعات المستلمة لهذه الفاتورة.</p>
              </div>

              <div className="p-6" dir="rtl">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="text-sm text-gray-500">الإجمالي</div>
                    <div className="text-lg font-bold text-gray-800">{formatCurrency(invoice?.total_usd || 0)}</div>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="text-sm text-gray-500">المدفوع</div>
                    <div className="text-lg font-bold text-emerald-700">{formatCurrency(invoice?.paid_amount_usd || 0)}</div>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="text-sm text-gray-500">المتبقي</div>
                    <div className="text-lg font-bold text-orange-600">{formatCurrency(invoice?.remaining_amount || 0)}</div>
                  </div>
                </div>

                <div className="mb-4">
                  <button
                    onClick={() => setShowPayForm(!showPayForm)}
                    className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700"
                    disabled={payLoading}
                  >
                    {showPayForm ? 'إلغاء' : 'إضافة دفعة'}
                  </button>
                </div>

                {showPayForm && (
                  <form onSubmit={handleAddPayment} className="bg-white border rounded-lg p-4 mb-6">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                      <div>
                        <label className="block text-sm text-gray-700 mb-1">تاريخ الدفع</label>
                        <input type="date" value={paymentForm.paid_on} onChange={(e)=>setPaymentForm({...paymentForm, paid_on: e.target.value})} className="w-full px-3 py-2 border rounded" required />
                      </div>
                      <div>
                        <label className="block text-sm text-gray-700 mb-1">المبلغ (USD)</label>
                        <input type="number" min={0} step={0.01} value={paymentForm.amount_usd} onChange={(e)=>setPaymentForm({...paymentForm, amount_usd: e.target.value})} className="w-full px-3 py-2 border rounded" required />
                      </div>
                      <div>
                        <label className="block text-sm text-gray-700 mb-1">طريقة الدفع</label>
                        <select value={paymentForm.method} onChange={(e)=>setPaymentForm({...paymentForm, method: e.target.value})} className="w-full px-3 py-2 border rounded">
                          <option value="CASH">نقدي</option>
                          <option value="BANK_TRANSFER">تحويل بنكي</option>
                          <option value="CHECK">شيك</option>
                          <option value="CREDIT_CARD">بطاقة ائتمان</option>
                          <option value="OTHER">أخرى</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm text-gray-700 mb-1">ملاحظات</label>
                        <input type="text" value={paymentForm.note} onChange={(e)=>setPaymentForm({...paymentForm, note: e.target.value})} className="w-full px-3 py-2 border rounded" />
                      </div>
                    </div>
                    <div className="mt-4 flex gap-3">
                      <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700" disabled={payLoading}>حفظ الدفعة</button>
                      <button type="button" className="px-4 py-2 border rounded" onClick={()=>setShowPayForm(false)} disabled={payLoading}>إلغاء</button>
                    </div>
                  </form>
                )}

                {payError && <div className="text-red-600 mb-3">{payError}</div>}
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-2 text-right text-xs font-medium text-gray-600">التاريخ</th>
                        <th className="px-4 py-2 text-right text-xs font-medium text-gray-600">الطريقة</th>
                        <th className="px-4 py-2 text-right text-xs font-medium text-gray-600">المبلغ</th>
                        <th className="px-4 py-2 text-right text-xs font-medium text-gray-600">ملاحظات</th>
                        <th className="px-4 py-2"></th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {payments.map((p)=> (
                        <tr key={p.id}>
                          <td className="px-4 py-2">{p.paid_on}</td>
                          <td className="px-4 py-2">{p.method}</td>
                          <td className="px-4 py-2">{formatCurrency(typeof p.amount_usd === 'number' ? p.amount_usd : parseFloat(p.amount_usd || 0))}</td>
                          <td className="px-4 py-2">{p.note || ''}</td>
                          <td className="px-4 py-2 text-left"><button onClick={()=>handleDeletePayment(p.id)} className="text-red-600 hover:text-red-800">حذف</button></td>
                        </tr>
                      ))}
                      {(!payments || payments.length === 0) && (
                        <tr>
                          <td className="px-4 py-3 text-gray-500 text-sm" colSpan={5}>لا توجد مدفوعات حتى الآن.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Sales Order Modal */}
        <SalesOrderModal
          show={showSalesOrderModal}
          onClose={() => {
            setShowSalesOrderModal(false);
            setSalesOrderSearch('');
          }}
          salesOrders={filteredSalesOrders}
          onImport={handleImportSalesOrder}
          search={salesOrderSearch}
          setSearch={setSalesOrderSearch}
          formatCurrency={formatCurrency}
        />

        {/* Sales Order Item Selector Modal */}
        {showItemSelector && tempSelectedOrderId && (
          <SalesOrderItemSelector
            isOpen={showItemSelector}
            onClose={() => {
              setShowItemSelector(false);
              setTempSelectedOrderId('');
            }}
            onConfirm={handleSelectedItemsFromSalesOrder}
            salesOrderId={tempSelectedOrderId}
            loading={loading}
          />
        )}
      </div>
    </Layout>
  );
};

export default InvoiceDetailUltimate;
