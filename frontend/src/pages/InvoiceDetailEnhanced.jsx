import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { 
  ArrowLeft, 
  FilePlus, 
  DollarSign, 
  ClipboardList, 
  FileText, 
  Save,
  User,
  Calendar,
  Package,
  Calculator,
  AlertCircle,
  CheckCircle,
  Plus,
  Minus,
  Search,
  Building,
  Receipt,
  Calculator as CalcIcon,
  Eye,
  Printer
} from 'lucide-react';
import Layout from '../components/Layout';
import InvoiceForm from '../components/InvoiceForm';
import InvoicePDF from '../components/pdf/InvoicePDF';
import usePdfPrint from '../hooks/usePdfPrint';
import { getInvoice, getCustomers, getNextInvoiceNumber } from '../services/api';

const InvoiceDetailEnhanced = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const [invoice, setInvoice] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [prefillInvoice, setPrefillInvoice] = useState(null);
  const [currentStep, setCurrentStep] = useState(1); // 1: Basic Info, 2: Items, 3: Review
  const [isEditMode] = useState(id && id !== 'new');
  const invoiceId = isEditMode ? id : null;
  const activeInvoice = invoiceId ? invoice : prefillInvoice;
  const pdfFileName = useMemo(
    () => `Invoice_${activeInvoice?.invoice_no || activeInvoice?.invoiceNo || 'draft'}.pdf`,
    [activeInvoice]
  );
  const { print: handlePrint, printing } = usePdfPrint({
    createDocument: () => <InvoicePDF invoice={activeInvoice} />,
    fileName: pdfFileName,
  });
  
  // Form Data States
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

  // Items Management
  const [items, setItems] = useState([
    { id: 1, description: '', qty: 1, unitPrice: 0, discount: 0, lineTotal: 0 }
  ]);

  // Customer Search
  const [customers, setCustomers] = useState([]);
  const [customerSearch, setCustomerSearch] = useState('');
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);

  // Quick Actions
  const [quickActions, setQuickActions] = useState({
    addItem: false,
    bulkImport: false,
    templates: false
  });

  // Calculated Values
  const [calculations, setCalculations] = useState({
    subtotal: 0,
    taxAmount: 0,
    discountAmount: 0,
    total: 0
  });

  // Load initial data
  useEffect(() => {
    const loadInitialData = async () => {
      try {
        setLoading(true);
        
        // Load next invoice number
        if (!invoiceId) {
          try {
            const nextInvoiceData = await getNextInvoiceNumber();
            setFormData(prev => ({ ...prev, invoiceNo: nextInvoiceData.invoiceNo || '' }));
          } catch (err) {
            console.log('Could not get next invoice number');
          }
        }

        // Load customers
        try {
          const customersData = await getCustomers(0, 100);
          setCustomers(customersData?.data || customersData || []);
        } catch (err) {
          console.log('Could not load customers');
        }

        // Initialize prefill invoice for new invoice
        if (!invoiceId) {
          setPrefillInvoice({
            invoiceNo: formData.invoiceNo,
            customer: formData.customer,
            issueDate: formData.issueDate,
            dueDate: formData.dueDate,
            status: formData.status,
            tax: formData.tax,
            items: items,
            total: calculations.total
          });
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

  // Calculate totals
  useEffect(() => {
    const subtotal = items.reduce((sum, item) => {
      const lineTotal = (item.qty || 0) * (item.unitPrice || 0);
      const itemDiscount = (item.discount || 0) * lineTotal / 100;
      return sum + (lineTotal - itemDiscount);
    }, 0);

    const discountAmount = (formData.discount || 0) * subtotal / 100;
    const taxAmount = (formData.tax || 0) * (subtotal - discountAmount) / 100;
    const total = subtotal - discountAmount + taxAmount;

    setCalculations({
      subtotal,
      discountAmount,
      taxAmount,
      total
    });

    // Update prefill invoice
    if (!invoiceId && prefillInvoice) {
      setPrefillInvoice({
        ...prefillInvoice,
        ...formData,
        items: items,
        total: total
      });
    }
  }, [items, formData, invoiceId, prefillInvoice]);

  // Customer search filtered results
  const filteredCustomers = customers.filter(customer =>
    customer.name?.toLowerCase().includes(customerSearch.toLowerCase()) ||
    customer.email?.toLowerCase().includes(customerSearch.toLowerCase()) ||
    customer.phone?.includes(customerSearch)
  );

  const handleFormChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Clear error when user starts typing
    if (error) setError(null);
  };

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

  const handleCustomerSelect = (customer) => {
    setFormData(prev => ({
      ...prev,
      customer: customer.name,
      customerId: customer.id
    }));
    setCustomerSearch(customer.name);
    setShowCustomerDropdown(false);
  };

  const handleSave = async () => {
    try {
      setLoading(true);
      
      // Validate form
      const validationErrors = validateForm();
      if (validationErrors.length > 0) {
        setError(validationErrors.join('\n'));
        return;
      }

      // Here you would call the API to save the invoice
      // const result = await createInvoice({ ...formData, items, total: calculations.total });
      
      console.log('Saving invoice:', { ...formData, items, total: calculations.total });
      
      // Navigate to invoices list
      navigate('/invoices');
    } catch (err) {
      setError('فشل في حفظ الفاتورة');
      console.error('Error saving invoice:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    navigate('/invoices');
  };

  const validateForm = () => {
    const errors = [];
    
    if (!formData.invoiceNo?.trim()) errors.push('رقم الفاتورة مطلوب');
    if (!formData.customer?.trim()) errors.push('اسم العميل مطلوب');
    if (!formData.issueDate) errors.push('تاريخ الإصدار مطلوب');
    
    // Check items
    const validItems = items.filter(item => item.description?.trim() && item.qty > 0 && item.unitPrice >= 0);
    if (validItems.length === 0) errors.push('يجب إضافة بند واحد على الأقل');

    return errors;
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
    }).format(value || 0);
  };

  if (loading) {
    return (
      <Layout>
        <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex items-center justify-center">
          <div className="bg-white/90 backdrop-blur-sm rounded-3xl shadow-2xl border border-white/20 p-10 text-center max-w-md">
            <div className="w-16 h-16 mx-auto mb-6 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full flex items-center justify-center">
              <FilePlus className="w-8 h-8 text-white animate-pulse" />
            </div>
            <h2 className="text-2xl font-bold text-gray-800 mb-2">جارٍ إعداد النموذج</h2>
            <p className="text-gray-600">يرجى الانتظار قليلاً...</p>
            <div className="mt-6 w-full bg-gray-200 rounded-full h-2">
              <div className="bg-gradient-to-r from-blue-500 to-indigo-600 h-2 rounded-full animate-pulse" style={{ width: '70%' }}></div>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout>
        <div className="min-h-screen bg-gradient-to-br from-red-50 via-white to-pink-50 flex items-center justify-center">
          <div className="bg-white/90 backdrop-blur-sm rounded-3xl shadow-2xl border border-white/20 p-10 text-center max-w-md">
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
                  <h1 className="text-3xl font-bold text-gray-800">فاتورة جديدة</h1>
                  <p className="text-gray-600 mt-1">إنشاء فاتورة احترافية في خطوات بسيطة</p>
                </div>
              </div>
              
              <div className="flex items-center gap-3">
                <button
                  onClick={handlePrint}
                  disabled={!activeInvoice || printing}
                  className="flex items-center gap-2 px-6 py-3 bg-white hover:bg-gray-50 text-gray-700 border-2 border-gray-300 hover:border-gray-400 rounded-xl font-semibold transition-all duration-200 shadow-sm hover:shadow-md disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  <Printer className="w-5 h-5" />
                  {printing ? 'جارٍ التحضير...' : 'معاينة/طباعة'}
                </button>
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

        <div className="max-w-7xl mx-auto px-6 py-8">
          {/* Progress Steps */}
          <div className="mb-8">
            <div className="flex items-center justify-center space-x-8 rtl:space-x-reverse">
              {[1, 2, 3].map((step) => (
                <div key={step} className="flex items-center">
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center font-bold transition-all duration-300 ${
                    currentStep >= step 
                      ? 'bg-gradient-to-r from-emerald-500 to-blue-600 text-white shadow-lg' 
                      : 'bg-gray-200 text-gray-500'
                  }`}>
                    {currentStep > step ? <CheckCircle className="w-6 h-6" /> : step}
                  </div>
                  <div className="ml-4 rtl:ml-0 rtl:mr-4">
                    <p className={`font-semibold ${
                      currentStep >= step ? 'text-emerald-600' : 'text-gray-500'
                    }`}>
                      {step === 1 && 'البيانات الأساسية'}
                      {step === 2 && 'البنود والأسعار'}
                      {step === 3 && 'المراجعة النهائية'}
                    </p>
                  </div>
                  {step < 3 && (
                    <div className={`w-16 h-1 mx-4 rtl:mx-0 rtl:ml-4 rounded-full ${
                      currentStep > step ? 'bg-gradient-to-r from-emerald-500 to-blue-600' : 'bg-gray-200'
                    }`} />
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
            {/* Main Form */}
            <div className="lg:col-span-3">
              <div className="bg-white/80 backdrop-blur-sm rounded-3xl shadow-2xl border border-white/20 overflow-hidden">
                
                {/* Step 1: Basic Information */}
                {currentStep === 1 && (
                  <div className="p-8">
                    <div className="bg-gradient-to-r from-emerald-500 to-blue-600 px-8 py-6 -mx-8 -mt-8 mb-8">
                      <h2 className="text-2xl font-bold text-white">البيانات الأساسية</h2>
                      <p className="text-emerald-100 mt-1">أدخل معلومات الفاتورة والعميل</p>
                    </div>

                    <div className="space-y-6">
                      {/* Invoice Number & Status */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-2">
                            <FileText className="w-4 h-4 inline mr-2" />
                            رقم الفاتورة *
                          </label>
                          <input
                            type="text"
                            value={formData.invoiceNo}
                            onChange={(e) => handleFormChange('invoiceNo', e.target.value)}
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
                            onChange={(e) => handleFormChange('status', e.target.value)}
                            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all duration-200"
                          >
                            <option value="DRAFT">مسودة</option>
                            <option value="ISSUED">صادرة</option>
                            <option value="PAID">مدفوعة</option>
                          </select>
                        </div>
                      </div>

                      {/* Customer Selection */}
                      <div className="relative">
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
                              handleFormChange('customer', e.target.value);
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
                                onClick={() => handleCustomerSelect(customer)}
                                className="w-full px-4 py-3 text-right hover:bg-gray-50 border-b border-gray-100 last:border-b-0 transition-colors"
                              >
                                <div className="font-semibold text-gray-800">{customer.name}</div>
                                <div className="text-sm text-gray-500">{customer.email || customer.phone}</div>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Dates */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-2">
                            <Calendar className="w-4 h-4 inline mr-2" />
                            تاريخ الإصدار *
                          </label>
                          <input
                            type="date"
                            value={formData.issueDate}
                            onChange={(e) => handleFormChange('issueDate', e.target.value)}
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
                            onChange={(e) => handleFormChange('dueDate', e.target.value)}
                            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all duration-200"
                          />
                        </div>
                      </div>

                      {/* Additional Fields */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-2">
                            المشروع
                          </label>
                          <input
                            type="text"
                            value={formData.project}
                            onChange={(e) => handleFormChange('project', e.target.value)}
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
                            onChange={(e) => handleFormChange('reference', e.target.value)}
                            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all duration-200"
                            placeholder="رقم المرجع أو المرجع الخارجي"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                          الملاحظات
                        </label>
                        <textarea
                          value={formData.notes}
                          onChange={(e) => handleFormChange('notes', e.target.value)}
                          rows={3}
                          className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all duration-200"
                          placeholder="أي ملاحظات إضافية..."
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Step 2: Items & Pricing */}
                {currentStep === 2 && (
                  <div className="p-8">
                    <div className="bg-gradient-to-r from-blue-500 to-purple-600 px-8 py-6 -mx-8 -mt-8 mb-8">
                      <h2 className="text-2xl font-bold text-white">البنود والأسعار</h2>
                      <p className="text-blue-100 mt-1">أضف بنود الفاتورة واحسب الإجماليات</p>
                    </div>

                    {/* Quick Actions */}
                    <div className="flex flex-wrap gap-3 mb-6">
                      <button
                        onClick={addNewItem}
                        className="flex items-center gap-2 px-4 py-2 bg-emerald-100 text-emerald-700 rounded-xl hover:bg-emerald-200 transition-colors"
                      >
                        <Plus className="w-4 h-4" />
                        إضافة بند
                      </button>
                      <button className="flex items-center gap-2 px-4 py-2 bg-blue-100 text-blue-700 rounded-xl hover:bg-blue-200 transition-colors">
                        <Package className="w-4 h-4" />
                        استيراد من CSV
                      </button>
                      <button className="flex items-center gap-2 px-4 py-2 bg-purple-100 text-purple-700 rounded-xl hover:bg-purple-200 transition-colors">
                        <FileText className="w-4 h-4" />
                        قالب جاهز
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
                                  onChange={(e) => handleItemChange(item.id, 'description', e.target.value)}
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
                                  onChange={(e) => handleItemChange(item.id, 'qty', e.target.value)}
                                  className="w-20 px-3 py-2 border border-gray-300 rounded-lg text-center focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                />
                              </td>
                              <td className="px-4 py-4 text-center">
                                <input
                                  type="number"
                                  min="0"
                                  step="0.01"
                                  value={item.unitPrice}
                                  onChange={(e) => handleItemChange(item.id, 'unitPrice', e.target.value)}
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
                                  onChange={(e) => handleItemChange(item.id, 'discount', e.target.value)}
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
                                  onClick={() => removeItem(item.id)}
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
                )}

                {/* Step 3: Review & Finalize */}
                {currentStep === 3 && (
                  <div className="p-8">
                    <div className="bg-gradient-to-r from-purple-500 to-pink-600 px-8 py-6 -mx-8 -mt-8 mb-8">
                      <h2 className="text-2xl font-bold text-white">المراجعة النهائية</h2>
                      <p className="text-purple-100 mt-1">راجع جميع البيانات قبل حفظ الفاتورة</p>
                    </div>

                    <div className="space-y-6">
                      {/* Invoice Summary */}
                      <div className="bg-gray-50 rounded-xl p-6">
                        <h3 className="text-lg font-semibold text-gray-800 mb-4">ملخص الفاتورة</h3>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                          <div>
                            <span className="text-gray-600">رقم الفاتورة:</span>
                            <p className="font-semibold">{formData.invoiceNo}</p>
                          </div>
                          <div>
                            <span className="text-gray-600">العميل:</span>
                            <p className="font-semibold">{formData.customer}</p>
                          </div>
                          <div>
                            <span className="text-gray-600">تاريخ الإصدار:</span>
                            <p className="font-semibold">{formData.issueDate}</p>
                          </div>
                          <div>
                            <span className="text-gray-600">عدد البنود:</span>
                            <p className="font-semibold">{items.length}</p>
                          </div>
                        </div>
                      </div>

                      {/* Tax & Discount Settings */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-2">
                            <CalcIcon className="w-4 h-4 inline mr-2" />
                            نسبة الضريبة (%)
                          </label>
                          <input
                            type="number"
                            min="0"
                            max="100"
                            step="0.01"
                            value={formData.tax}
                            onChange={(e) => handleFormChange('tax', parseFloat(e.target.value) || 0)}
                            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all duration-200"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-2">
                            <Calculator className="w-4 h-4 inline mr-2" />
                            خصم عام (%)
                          </label>
                          <input
                            type="number"
                            min="0"
                            max="100"
                            step="0.01"
                            value={formData.discount}
                            onChange={(e) => handleFormChange('discount', parseFloat(e.target.value) || 0)}
                            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all duration-200"
                          />
                        </div>
                      </div>

                      {/* Items Preview */}
                      <div>
                        <h3 className="text-lg font-semibold text-gray-800 mb-4">معاينة البنود</h3>
                        <div className="overflow-hidden rounded-xl border border-gray-200">
                          <table className="w-full">
                            <thead className="bg-gray-50">
                              <tr>
                                <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">الوصف</th>
                                <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700">الكمية</th>
                                <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700">سعر الوحدة</th>
                                <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700">الإجمالي</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200">
                              {items.map((item) => (
                                <tr key={item.id}>
                                  <td className="px-4 py-3 text-sm text-gray-900">{item.description || 'غير محدد'}</td>
                                  <td className="px-4 py-3 text-center text-sm text-gray-600">{item.qty}</td>
                                  <td className="px-4 py-3 text-center text-sm text-gray-600">{formatCurrency(item.unitPrice)}</td>
                                  <td className="px-4 py-3 text-center text-sm font-semibold text-emerald-600">{formatCurrency(item.lineTotal)}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Navigation Buttons */}
                <div className="bg-gray-50 px-8 py-6 -mx-8 mt-8">
                  <div className="flex justify-between items-center">
                    <button
                      onClick={() => setCurrentStep(Math.max(1, currentStep - 1))}
                      disabled={currentStep === 1}
                      className="flex items-center gap-2 px-6 py-3 bg-white border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
                    >
                      <ArrowLeft className="w-5 h-5 rotate-180" />
                      السابق
                    </button>
                    
                    {currentStep < 3 ? (
                      <button
                        onClick={() => setCurrentStep(Math.min(3, currentStep + 1))}
                        className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-emerald-500 to-blue-600 text-white rounded-xl hover:from-emerald-600 hover:to-blue-700 transition-all duration-200 shadow-lg hover:shadow-xl"
                      >
                        التالي
                        <ArrowLeft className="w-5 h-5" />
                      </button>
                    ) : (
                      <button
                        onClick={handleSave}
                        disabled={loading}
                        className="flex items-center gap-2 px-8 py-3 bg-gradient-to-r from-emerald-500 to-blue-600 text-white rounded-xl hover:from-emerald-600 hover:to-blue-700 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <Save className="w-5 h-5" />
                        {loading ? 'جارٍ الحفظ...' : 'حفظ الفاتورة'}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Sidebar - Invoice Summary */}
            <div className="lg:col-span-1">
              <div className="sticky top-24">
                {/* Invoice Summary Card */}
                <div className="bg-white/80 backdrop-blur-sm rounded-3xl shadow-2xl border border-white/20 p-6 mb-6">
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
                        {formData.customer ? 'محدد' : 'غير محدد'}
                      </span>
                    </div>
                    
                    <div className="flex items-center justify-between p-3 bg-purple-50 rounded-xl">
                      <div className="flex items-center">
                        <ClipboardList className="w-5 h-5 text-purple-600 mr-2" />
                        <span className="text-sm font-medium text-gray-700">التقدم</span>
                      </div>
                      <span className="font-bold text-purple-600">{Math.round((currentStep / 3) * 100)}%</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default InvoiceDetailEnhanced;
