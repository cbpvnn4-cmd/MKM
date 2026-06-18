import React, { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import { useNavigate } from 'react-router-dom';
import { createContract, getCustomers, getQuotations, createCustomer, getSalesOrders } from '../services/api';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { 
  ArrowLeft, ArrowRight, Save, Plus, Trash2, Package, 
  Users, FileText, DollarSign, CheckCircle, AlertCircle 
} from 'lucide-react';

const ContractCreateWizard = () => {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [customers, setCustomers] = useState([]);
  const [quotations, setQuotations] = useState([]);
  const [elevators, setElevators] = useState([]);
  const [errors, setErrors] = useState({});
  const [isNewCustomer, setIsNewCustomer] = useState(false);
  const [selectedElevator, setSelectedElevator] = useState(null);

  const [formData, setFormData] = useState({
    // Customer
    customer_id: '',
    customer_name: '',
    customer_phone: '',
    customer_email: '',
    customer_address: '',
    
    // Quotation (optional)
    quotation_id: '',
    
    // Basic Info
    contract_date: new Date().toISOString().split('T')[0],
    start_date: '',
    end_date: '',
    status: 'DRAFT',
    contract_type: 'SALES',
    
    // Elevator
    sales_order_id: '',
    elevator_type: '',
    elevator_model: '',
    elevator_capacity: '',
    elevator_height: '',
    elevator_sections: '',
    
    // Financial
    total_amount: 0,
    currency: 'USD',
    
    // Terms
    payment_terms: '',
    delivery_terms: '',
    warranty_terms: '',
    notes: '',
    
    // Milestones
    milestones: []
  });

  // Price adjustment tracking
  const [priceAdjustment, setPriceAdjustment] = useState({
    original_cost: 0,
    adjusted_cost: 0,
    is_adjusted: false,
    adjustment_reason: ''
  });

  // Terms and Conditions with categories
  const [termsConditions, setTermsConditions] = useState([
    { id: 1, category: 'WARRANTY', term: 'ضمان شهر واحد', is_default: true },
    { id: 2, category: 'TRANSPORT', term: 'أجور النقل إلى موقع العمل - على عاتق البائع', is_default: true },
    { id: 3, category: 'INSTALLATION', term: 'أجور التركيب - على عاتق البائع', is_default: true },
    { id: 4, category: 'EQUIPMENT', term: 'توفير كرين للتركيب والتفريغ - على عاتق المشتري', is_default: true }
  ]);

  const TERM_CATEGORIES = [
    { value: 'WARRANTY', label: 'ضمان' },
    { value: 'PAYMENT', label: 'دفع' },
    { value: 'DELIVERY', label: 'تسليم' },
    { value: 'INSTALLATION', label: 'تركيب' },
    { value: 'TRANSPORT', label: 'نقل' },
    { value: 'EQUIPMENT', label: 'معدات' },
    { value: 'OTHER', label: 'أخرى' }
  ];

  useEffect(() => {
    fetchCustomers();
    fetchQuotations();
    fetchElevators();
  }, []);

  // Recalculate milestone amounts when total_amount changes
  useEffect(() => {
    if (formData.total_amount > 0 && formData.milestones.length > 0) {
      recalculateMilestoneAmounts();
    }
  }, [formData.total_amount]);

  const fetchCustomers = async () => {
    try {
      const response = await getCustomers();
      const customersArray = response.data || response;
      setCustomers(Array.isArray(customersArray) ? customersArray : []);
    } catch (err) {
      console.error('Error fetching customers:', err);
      setCustomers([]);
    }
  };

  const fetchQuotations = async () => {
    try {
      const data = await getQuotations({ status: 'ACCEPTED' });
      setQuotations(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Error fetching quotations:', err);
      setQuotations([]);
    }
  };

  const fetchElevators = async () => {
    try {
      const response = await getSalesOrders();
      const elevatorsData = Array.isArray(response) ? response : (response.data || []);
      const elevatorOrders = elevatorsData.filter(
        order => order.order_type === 'elevators' &&
        (order.status === 'CONFIRMED' || order.status === 'FULFILLED')
      );
      setElevators(elevatorOrders);
    } catch (err) {
      console.error('Error fetching elevators:', err);
      setElevators([]);
    }
  };

  const recalculateMilestoneAmounts = () => {
    setFormData(prev => ({
      ...prev,
      milestones: prev.milestones.map(m => ({
        ...m,
        payment_amount: ((parseFloat(m.payment_percent || 0) * parseFloat(prev.total_amount)) / 100).toFixed(2)
      }))
    }));
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    // Clear field error
    if (errors[name]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  const handleQuotationChange = (e) => {
    const quotationId = e.target.value;
    if (quotationId) {
      const selectedQuotation = quotations.find(q => q.id === parseInt(quotationId));
      if (selectedQuotation) {
        setFormData(prev => ({
          ...prev,
          quotation_id: quotationId,
          customer_id: selectedQuotation.customer_id?.toString() || '',
          total_amount: selectedQuotation.total || 0,
          payment_terms: selectedQuotation.payment_terms || '',
          delivery_terms: selectedQuotation.delivery_terms || '',
          warranty_terms: selectedQuotation.warranty_terms || ''
        }));
      }
    }
  };

  const handleElevatorSelection = (e) => {
    const salesOrderId = e.target.value;
    if (salesOrderId) {
      const elevator = elevators.find(el => el.id === parseInt(salesOrderId));
      if (elevator && elevator.items && elevator.items[0]) {
        const item = elevator.items[0];
        const cost = parseFloat(item.unit_price_usd || 0);
        
        setSelectedElevator(elevator);
        setFormData(prev => ({
          ...prev,
          sales_order_id: salesOrderId,
          elevator_type: item.product?.category || '',
          elevator_model: item.product?.name || '',
          elevator_capacity: item.product?.name?.match(/\d+\s*(kg|كغ)/i)?.[0] || '',
          elevator_height: item.cable_meters || '',
          elevator_sections: item.sections || '',
          total_amount: cost
        }));
        
        setPriceAdjustment({
          original_cost: cost,
          adjusted_cost: cost,
          is_adjusted: false,
          adjustment_reason: ''
        });
      }
    } else {
      setSelectedElevator(null);
      setPriceAdjustment({
        original_cost: 0,
        adjusted_cost: 0,
        is_adjusted: false,
        adjustment_reason: ''
      });
    }
  };

  const handlePriceChange = (newPrice) => {
    const original = priceAdjustment.original_cost;
    const adjusted = parseFloat(newPrice) || 0;
    
    setFormData(prev => ({ ...prev, total_amount: adjusted }));
    setPriceAdjustment(prev => ({
      ...prev,
      adjusted_cost: adjusted,
      is_adjusted: original > 0 && Math.abs(original - adjusted) > 0.01
    }));
  };

  // Terms management
  const addTermCondition = () => {
    const newId = Math.max(...termsConditions.map(t => t.id), 0) + 1;
    setTermsConditions(prev => [
      ...prev,
      { id: newId, category: 'OTHER', term: '', is_default: false }
    ]);
  };

  const updateTermCondition = (id, field, value) => {
    setTermsConditions(prev =>
      prev.map(tc => tc.id === id ? { ...tc, [field]: value } : tc)
    );
  };

  const removeTermCondition = (id) => {
    setTermsConditions(prev => prev.filter(tc => tc.id !== id));
  };

  // Milestones management
  const addMilestone = () => {
    setFormData(prev => ({
      ...prev,
      milestones: [
        ...prev.milestones,
        {
          id: Date.now(),
          milestone_name: '',
          description: '',
          sequence_order: prev.milestones.length + 1,
          due_date: '',
          payment_percent: 0,
          payment_amount: 0,
          status: 'PENDING',
          notes: ''
        }
      ]
    }));
  };

  const updateMilestone = (index, field, value) => {
    setFormData(prev => {
      const newMilestones = prev.milestones.map((milestone, i) => {
        if (i === index) {
          const updated = { ...milestone, [field]: value };

          if (field === 'payment_amount' && prev.total_amount > 0) {
            updated.payment_percent = ((parseFloat(value) / prev.total_amount) * 100).toFixed(2);
          }

          if (field === 'payment_percent' && prev.total_amount > 0) {
            updated.payment_amount = ((parseFloat(value) * prev.total_amount) / 100).toFixed(2);
          }

          return updated;
        }
        return milestone;
      });

      return { ...prev, milestones: newMilestones };
    });
  };

  const removeMilestone = (index) => {
    setFormData(prev => ({
      ...prev,
      milestones: prev.milestones.filter((_, i) => i !== index)
    }));
  };

  const calculateTotalPaymentPercentage = () => {
    return formData.milestones.reduce((sum, m) => sum + parseFloat(m.payment_percent || 0), 0).toFixed(2);
  };

  const calculateTotalPaymentAmount = () => {
    return formData.milestones.reduce((sum, m) => sum + parseFloat(m.payment_amount || 0), 0).toFixed(2);
  };

  // Validation for each step
  const validateStep = (step) => {
    const stepErrors = {};

    if (step === 1) {
      // Customer validation
      if (!formData.customer_id && !formData.customer_name) {
        stepErrors.customer = 'الرجاء اختيار عميل أو إدخال اسم عميل جديد';
      }
      if (isNewCustomer && !formData.customer_name.trim()) {
        stepErrors.customer_name = 'اسم العميل مطلوب';
      }
    }

    if (step === 2) {
      // Basic info validation
      if (!formData.contract_date) {
        stepErrors.contract_date = 'تاريخ العقد مطلوب';
      }
      if (formData.start_date && formData.end_date) {
        if (new Date(formData.end_date) < new Date(formData.start_date)) {
          stepErrors.end_date = 'تاريخ الانتهاء يجب أن يكون بعد تاريخ البدء';
        }
      }
    }

    if (step === 3) {
      // Financial validation
      if (!formData.total_amount || formData.total_amount <= 0) {
        stepErrors.total_amount = 'المبلغ الإجمالي مطلوب ويجب أن يكون أكبر من صفر';
      }
      
      // Price adjustment validation
      if (priceAdjustment.is_adjusted && !priceAdjustment.adjustment_reason.trim()) {
        stepErrors.adjustment_reason = 'يرجى إدخال سبب تعديل السعر';
      }
      
      // Milestones validation
      if (formData.milestones.length > 0) {
        const totalPercent = parseFloat(calculateTotalPaymentPercentage());
        if (totalPercent > 100) {
          stepErrors.milestones = `مجموع النسب المئوية (${totalPercent}%) يتجاوز 100%`;
        }
      }
    }

    if (step === 4) {
      // Terms validation
      const hasEmptyTerms = termsConditions.some(tc => !tc.term.trim());
      if (hasEmptyTerms) {
        stepErrors.terms = 'يرجى ملء جميع الشروط أو حذف الفارغة';
      }
    }

    setErrors(stepErrors);
    return Object.keys(stepErrors).length === 0;
  };

  const nextStep = () => {
    if (validateStep(currentStep)) {
      setCurrentStep(prev => Math.min(prev + 1, 4));
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const prevStep = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validate all steps
    for (let step = 1; step <= 4; step++) {
      if (!validateStep(step)) {
        setCurrentStep(step);
        return;
      }
    }

    try {
      setLoading(true);

      let finalCustomerId = formData.customer_id;

      // Create new customer if needed
      if (isNewCustomer && formData.customer_name) {
        try {
          const newCustomer = await createCustomer({
            name: formData.customer_name,
            phone: formData.customer_phone || '',
            email: formData.customer_email || '',
            address: formData.customer_address || ''
          });
          finalCustomerId = newCustomer.id;
        } catch (err) {
          console.error('Error creating customer:', err);
          setErrors({ submit: 'تعذر إنشاء العميل الجديد' });
          return;
        }
      }

      // Convert terms to structured format
      const termsAsText = termsConditions
        .filter(tc => tc.term && tc.term.trim())
        .map((tc, idx) => `[${tc.category}] ${idx + 1}. ${tc.term}`)
        .join('\n');

      const contractData = {
        customer_id: parseInt(finalCustomerId),
        quotation_id: formData.quotation_id ? parseInt(formData.quotation_id) : null,
        sales_order_id: formData.sales_order_id ? parseInt(formData.sales_order_id) : null,
        contract_date: formData.contract_date,
        start_date: formData.start_date || null,
        end_date: formData.end_date || null,
        status: formData.status,
        contract_type: formData.contract_type,
        payment_terms: formData.payment_terms || null,
        delivery_terms: formData.delivery_terms || null,
        warranty_terms: formData.warranty_terms || null,
        terms_and_conditions: termsAsText,
        total_amount: parseFloat(formData.total_amount),
        currency: formData.currency,
        notes: formData.notes || null,
        milestones: formData.milestones.map(m => ({
          milestone_name: m.description || m.milestone_name,
          description: m.description,
          sequence_order: m.sequence_order,
          due_date: m.due_date || null,
          status: m.status,
          payment_percent: parseFloat(m.payment_percent || 0),
          payment_amount: parseFloat(m.payment_amount || 0),
          notes: m.notes || null
        })),
        // Price adjustment info in notes
        ...(priceAdjustment.is_adjusted && {
          notes: `${formData.notes || ''}

[تعديل السعر]
السعر الأصلي: $${priceAdjustment.original_cost}
السعر المعدل: $${priceAdjustment.adjusted_cost}
السبب: ${priceAdjustment.adjustment_reason}`.trim()
        })
      };

      const result = await createContract(contractData);
      
      // Success - navigate to contracts list
      navigate('/contracts', { 
        state: { 
          message: `تم إنشاء العقد ${result.contract_no} بنجاح`,
          type: 'success'
        }
      });
    } catch (err) {
      console.error('Error creating contract:', err);
      setErrors({ submit: err.response?.data?.detail || 'تعذر إنشاء العقد' });
    } finally {
      setLoading(false);
    }
  };

  const steps = [
    { number: 1, title: 'العميل', icon: Users, description: 'اختيار أو إضافة عميل' },
    { number: 2, title: 'المعلومات', icon: FileText, description: 'البيانات الأساسية' },
    { number: 3, title: 'المالية', icon: DollarSign, description: 'المبالغ والدفعات' },
    { number: 4, title: 'المراجعة', icon: CheckCircle, description: 'الشروط والحفظ' }
  ];

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              onClick={() => navigate('/contracts')}
              className="gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              رجوع
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">عقد جديد</h1>
              <p className="mt-1 text-sm text-gray-500">
                معالج إنشاء عقد جديد - خطوة بخطوة
              </p>
            </div>
          </div>
        </div>

        {/* Progress Indicator */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            {steps.map((step, index) => {
              const Icon = step.icon;
              const isActive = currentStep === step.number;
              const isCompleted = currentStep > step.number;
              
              return (
                <React.Fragment key={step.number}>
                  <div className="flex flex-col items-center flex-1">
                    <div
                      className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${
                        isActive
                          ? 'bg-indigo-600 text-white ring-4 ring-indigo-200'
                          : isCompleted
                          ? 'bg-green-600 text-white'
                          : 'bg-gray-200 text-gray-500'
                      }`}
                    >
                      {isCompleted ? (
                        <CheckCircle className="w-6 h-6" />
                      ) : (
                        <Icon className="w-6 h-6" />
                      )}
                    </div>
                    <div className="mt-2 text-center">
                      <p className={`text-sm font-medium ${isActive ? 'text-indigo-600' : 'text-gray-600'}`}>
                        {step.title}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">{step.description}</p>
                    </div>
                  </div>
                  {index < steps.length - 1 && (
                    <div className="flex-1 h-0.5 mx-4 mb-8">
                      <div
                        className={`h-full transition-all ${
                          isCompleted ? 'bg-green-600' : 'bg-gray-200'
                        }`}
                      />
                    </div>
                  )}
                </React.Fragment>
              );
            })}
          </div>
        </div>

        {/* Error Summary */}
        {Object.keys(errors).length > 0 && (
          <div className="bg-red-50 border-r-4 border-red-600 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <h3 className="text-sm font-medium text-red-800">يرجى تصحيح الأخطاء التالية:</h3>
                <ul className="mt-2 text-sm text-red-700 list-disc list-inside space-y-1">
                  {Object.values(errors).map((error, idx) => (
                    <li key={idx}>{error}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* Form Content */}
        <form onSubmit={handleSubmit}>
          {/* Step 1: Customer Selection */}
          {currentStep === 1 && (
            <div className="bg-white rounded-lg shadow p-6 space-y-6">
              <div>
                <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <Users className="w-6 h-6 text-indigo-600" />
                  اختيار العميل
                </h2>

                {/* Quotation Selection (Optional) */}
                <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    هل تريد إنشاء العقد من عرض سعر؟ (اختياري)
                  </label>
                  <select
                    value={formData.quotation_id}
                    onChange={handleQuotationChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="">لا، إنشاء عقد جديد</option>
                    {quotations.map(q => (
                      <option key={q.id} value={q.id}>
                        {q.quotation_no} - {q.customer_name}
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-blue-700 mt-2">
                    💡 عند اختيار عرض سعر، سيتم ملء البيانات تلقائياً
                  </p>
                </div>

                {/* Customer Type Toggle */}
                <div className="flex gap-3 mb-4">
                  <label className={`flex items-center gap-2 cursor-pointer px-4 py-3 rounded-lg border-2 transition-all flex-1 ${
                    !isNewCustomer
                      ? 'bg-indigo-50 border-indigo-500 text-indigo-700'
                      : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                  }`}>
                    <input
                      type="radio"
                      checked={!isNewCustomer}
                      onChange={() => {
                        setIsNewCustomer(false);
                        setFormData(prev => ({
                          ...prev,
                          customer_name: '',
                          customer_phone: '',
                          customer_email: '',
                          customer_address: ''
                        }));
                      }}
                      className="text-indigo-600"
                    />
                    <div>
                      <span className="text-sm font-semibold block">اختيار عميل موجود</span>
                      <span className="text-xs text-gray-600">من قاعدة البيانات</span>
                    </div>
                  </label>

                  <label className={`flex items-center gap-2 cursor-pointer px-4 py-3 rounded-lg border-2 transition-all flex-1 ${
                    isNewCustomer
                      ? 'bg-indigo-50 border-indigo-500 text-indigo-700'
                      : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                  }`}>
                    <input
                      type="radio"
                      checked={isNewCustomer}
                      onChange={() => {
                        setIsNewCustomer(true);
                        setFormData(prev => ({ ...prev, customer_id: '' }));
                      }}
                      className="text-indigo-600"
                    />
                    <div>
                      <span className="text-sm font-semibold block">إضافة عميل جديد</span>
                      <span className="text-xs text-gray-600">إنشاء عميل جديد</span>
                    </div>
                  </label>
                </div>

                {/* Existing Customer */}
                {!isNewCustomer && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      اختر العميل <span className="text-red-500">*</span>
                    </label>
                    <select
                      name="customer_id"
                      value={formData.customer_id}
                      onChange={handleChange}
                      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 ${
                        errors.customer ? 'border-red-500' : 'border-gray-300'
                      }`}
                    >
                      <option value="">اختر العميل ({customers.length} عميل)</option>
                      {customers.map(c => (
                        <option key={c.id} value={c.id}>
                          {c.name} {c.phone ? `- ${c.phone}` : ''}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* New Customer */}
                {isNewCustomer && (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        اسم العميل <span className="text-red-500">*</span>
                      </label>
                      <Input
                        type="text"
                        name="customer_name"
                        value={formData.customer_name}
                        onChange={handleChange}
                        placeholder="أدخل اسم العميل"
                        className={errors.customer_name ? 'border-red-500' : ''}
                      />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          رقم الهاتف
                        </label>
                        <Input
                          type="text"
                          name="customer_phone"
                          value={formData.customer_phone}
                          onChange={handleChange}
                          placeholder="رقم الهاتف (اختياري)"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          البريد الإلكتروني
                        </label>
                        <Input
                          type="email"
                          name="customer_email"
                          value={formData.customer_email}
                          onChange={handleChange}
                          placeholder="البريد الإلكتروني (اختياري)"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        العنوان
                      </label>
                      <textarea
                        name="customer_address"
                        value={formData.customer_address}
                        onChange={handleChange}
                        rows="3"
                        placeholder="العنوان (اختياري)"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Step 2: Basic Information */}
          {currentStep === 2 && (
            <div className="bg-white rounded-lg shadow p-6 space-y-6">
              <div>
                <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <FileText className="w-6 h-6 text-indigo-600" />
                  المعلومات الأساسية
                </h2>

                {/* Elevator Selection */}
                <div className="mb-6 p-4 bg-gradient-to-r from-purple-50 to-indigo-50 border border-indigo-200 rounded-lg">
                  <div className="flex items-center gap-2 mb-3">
                    <Package className="w-5 h-5 text-indigo-600" />
                    <label className="block text-sm font-medium text-gray-700">
                      ربط بمصعد من المخزون (اختياري)
                    </label>
                  </div>
                  <select
                    value={formData.sales_order_id}
                    onChange={handleElevatorSelection}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="">اختر مصعد من المخزون ({elevators.length} متوفر)</option>
                    {elevators.map(elevator => (
                      <option key={elevator.id} value={elevator.id}>
                        {elevator.so_no} - {elevator.items?.[0]?.product?.name || 'مصعد'}
                        {elevator.items?.[0]?.unit_price_usd ? ` - $${elevator.items[0].unit_price_usd}` : ''}
                      </option>
                    ))}
                  </select>
                  
                  {selectedElevator && (
                    <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-3 p-3 bg-white rounded-lg">
                      <div>
                        <p className="text-xs text-gray-500">النوع</p>
                        <p className="text-sm font-semibold">{formData.elevator_type || '-'}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">الموديل</p>
                        <p className="text-sm font-semibold">{formData.elevator_model || '-'}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">الحمولة</p>
                        <p className="text-sm font-semibold">{formData.elevator_capacity || '-'}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">الارتفاع</p>
                        <p className="text-sm font-semibold">{formData.elevator_height ? `${formData.elevator_height}م` : '-'}</p>
                      </div>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      تاريخ العقد <span className="text-red-500">*</span>
                    </label>
                    <Input
                      type="date"
                      name="contract_date"
                      value={formData.contract_date}
                      onChange={handleChange}
                      className={errors.contract_date ? 'border-red-500' : ''}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      نوع العقد
                    </label>
                    <select
                      name="contract_type"
                      value={formData.contract_type}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value="SALES">مبيعات</option>
                      <option value="MAINTENANCE">صيانة</option>
                      <option value="SERVICE">خدمة</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      تاريخ البدء
                    </label>
                    <Input
                      type="date"
                      name="start_date"
                      value={formData.start_date}
                      onChange={handleChange}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      تاريخ الانتهاء
                    </label>
                    <Input
                      type="date"
                      name="end_date"
                      value={formData.end_date}
                      onChange={handleChange}
                      className={errors.end_date ? 'border-red-500' : ''}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      حالة العقد
                    </label>
                    <select
                      name="status"
                      value={formData.status}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value="DRAFT">مسودة</option>
                      <option value="ACTIVE">نشط</option>
                      <option value="COMPLETED">مكتمل</option>
                      <option value="TERMINATED">ملغي</option>
                    </select>
                  </div>
                </div>

                <div className="mt-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    ملاحظات
                  </label>
                  <textarea
                    name="notes"
                    value={formData.notes}
                    onChange={handleChange}
                    rows="3"
                    placeholder="أي ملاحظات إضافية..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Financial & Milestones */}
          {currentStep === 3 && (
            <div className="bg-white rounded-lg shadow p-6 space-y-6">
              <div>
                <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <DollarSign className="w-6 h-6 text-indigo-600" />
                  المعلومات المالية وخطة الدفع
                </h2>

                {/* Total Amount */}
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    المبلغ الإجمالي <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <Input
                      type="number"
                      value={formData.total_amount}
                      onChange={(e) => handlePriceChange(e.target.value)}
                      step="0.01"
                      min="0"
                      className={`text-lg font-semibold ${errors.total_amount ? 'border-red-500' : ''}`}
                    />
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-medium">
                      USD
                    </span>
                  </div>

                  {/* Price Adjustment Warning */}
                  {priceAdjustment.is_adjusted && (
                    <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                      <div className="flex items-start gap-2">
                        <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                        <div className="flex-1">
                          <p className="text-sm text-yellow-800 font-medium">تم تعديل السعر</p>
                          <p className="text-sm text-yellow-700 mt-1">
                            السعر الأصلي: <span className="font-semibold">${priceAdjustment.original_cost}</span>
                            {' → '}
                            السعر المعدل: <span className="font-semibold">${priceAdjustment.adjusted_cost}</span>
                          </p>
                          <div className="mt-2">
                            <label className="block text-xs font-medium text-yellow-800 mb-1">
                              سبب التعديل <span className="text-red-500">*</span>
                            </label>
                            <input
                              type="text"
                              value={priceAdjustment.adjustment_reason}
                              onChange={(e) => setPriceAdjustment(prev => ({ 
                                ...prev, 
                                adjustment_reason: e.target.value 
                              }))}
                              placeholder="مثال: خصم خاص للعميل المميز"
                              className={`w-full px-3 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-yellow-500 ${
                                errors.adjustment_reason ? 'border-red-500' : 'border-yellow-300'
                              }`}
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Payment Schedule */}
                <div className="border-t pt-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-gray-900">
                      خطة الدفع (اختياري)
                    </h3>
                    <Button
                      type="button"
                      onClick={addMilestone}
                      variant="outline"
                      className="gap-2"
                    >
                      <Plus className="w-4 h-4" />
                      إضافة دفعة
                    </Button>
                  </div>

                  {formData.milestones.length === 0 ? (
                    <div className="text-center py-8 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
                      <DollarSign className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                      <p className="text-gray-500 mb-2">لم يتم إضافة دفعات بعد</p>
                      <p className="text-sm text-gray-400">انقر "إضافة دفعة" لإنشاء خطة الدفع</p>
                    </div>
                  ) : (
                    <>
                      <div className="space-y-3">
                        {formData.milestones.map((milestone, index) => (
                          <div key={milestone.id || index} className="p-4 border border-gray-200 rounded-lg hover:border-indigo-300 transition-colors">
                            <div className="flex items-start gap-3">
                              <div className="flex-shrink-0 w-8 h-8 bg-indigo-100 text-indigo-700 rounded-full flex items-center justify-center font-semibold text-sm">
                                {index + 1}
                              </div>
                              <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-3">
                                <div className="md:col-span-3">
                                  <input
                                    type="text"
                                    value={milestone.description}
                                    onChange={(e) => updateMilestone(index, 'description', e.target.value)}
                                    placeholder="الوصف (مثال: عند توقيع العقد)"
                                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                                  />
                                </div>
                                <div>
                                  <label className="block text-xs text-gray-600 mb-1">المبلغ ($)</label>
                                  <Input
                                    type="number"
                                    value={milestone.payment_amount}
                                    onChange={(e) => updateMilestone(index, 'payment_amount', e.target.value)}
                                    min="0"
                                    step="0.01"
                                    className="text-sm"
                                  />
                                </div>
                                <div>
                                  <label className="block text-xs text-gray-600 mb-1">النسبة (%)</label>
                                  <Input
                                    type="number"
                                    value={milestone.payment_percent}
                                    onChange={(e) => updateMilestone(index, 'payment_percent', e.target.value)}
                                    min="0"
                                    max="100"
                                    step="0.01"
                                    className="text-sm"
                                  />
                                </div>
                                <div>
                                  <label className="block text-xs text-gray-600 mb-1">تاريخ الاستحقاق</label>
                                  <Input
                                    type="date"
                                    value={milestone.due_date}
                                    onChange={(e) => updateMilestone(index, 'due_date', e.target.value)}
                                    className="text-sm"
                                  />
                                </div>
                              </div>
                              <Button
                                type="button"
                                onClick={() => removeMilestone(index)}
                                variant="outline"
                                size="sm"
                                className="text-red-600 hover:text-red-700 hover:bg-red-50"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Milestones Summary */}
                      <div className="mt-4 p-4 bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg border border-green-200">
                        <div className="flex items-center justify-between text-sm">
                          <div>
                            <span className="text-gray-700">إجمالي النسبة:</span>
                            <span className={`ml-2 text-lg font-bold ${
                              parseFloat(calculateTotalPaymentPercentage()) > 100
                                ? 'text-red-600'
                                : parseFloat(calculateTotalPaymentPercentage()) === 100
                                ? 'text-green-600'
                                : 'text-yellow-600'
                            }`}>
                              {calculateTotalPaymentPercentage()}%
                            </span>
                          </div>
                          <div>
                            <span className="text-gray-700">إجمالي المبلغ:</span>
                            <span className="ml-2 text-lg font-bold text-green-700">
                              ${calculateTotalPaymentAmount()}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Validation Messages */}
                      {errors.milestones && (
                        <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                          <p className="text-sm text-red-800">{errors.milestones}</p>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Step 4: Terms & Review */}
          {currentStep === 4 && (
            <div className="bg-white rounded-lg shadow p-6 space-y-6">
              <div>
                <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <CheckCircle className="w-6 h-6 text-indigo-600" />
                  الشروط والأحكام والمراجعة النهائية
                </h2>

                {/* Terms Table */}
                <div className="mb-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-gray-900">الشروط والأحكام</h3>
                    <Button
                      type="button"
                      onClick={addTermCondition}
                      variant="outline"
                      size="sm"
                      className="gap-2"
                    >
                      <Plus className="w-4 h-4" />
                      إضافة شرط
                    </Button>
                  </div>

                  <div className="space-y-2">
                    {termsConditions.map((tc) => (
                      <div key={tc.id} className="flex items-start gap-3 p-3 border border-gray-200 rounded-lg hover:border-indigo-300 transition-colors">
                        <div className="flex-1 grid grid-cols-1 md:grid-cols-4 gap-3">
                          <div>
                            <select
                              value={tc.category}
                              onChange={(e) => updateTermCondition(tc.id, 'category', e.target.value)}
                              disabled={tc.is_default}
                              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 disabled:bg-gray-100"
                            >
                              {TERM_CATEGORIES.map(cat => (
                                <option key={cat.value} value={cat.value}>
                                  {cat.label}
                                </option>
                              ))}
                            </select>
                          </div>
                          <div className="md:col-span-3 flex items-center gap-2">
                            <textarea
                              value={tc.term}
                              onChange={(e) => updateTermCondition(tc.id, 'term', e.target.value)}
                              rows="2"
                              placeholder="اكتب الشرط هنا..."
                              className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                            />
                            {tc.is_default && (
                              <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs font-medium rounded">
                                افتراضي
                              </span>
                            )}
                          </div>
                        </div>
                        {!tc.is_default && (
                          <Button
                            type="button"
                            onClick={() => removeTermCondition(tc.id)}
                            variant="outline"
                            size="sm"
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Contract Summary */}
                <div className="border-t pt-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">ملخص العقد</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg">
                    <div>
                      <p className="text-xs text-gray-500">العميل</p>
                      <p className="text-sm font-semibold">
                        {isNewCustomer 
                          ? formData.customer_name 
                          : customers.find(c => c.id === parseInt(formData.customer_id))?.name || '-'}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">نوع العقد</p>
                      <p className="text-sm font-semibold">
                        {formData.contract_type === 'SALES' ? 'مبيعات' : 
                         formData.contract_type === 'MAINTENANCE' ? 'صيانة' : 'خدمة'}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">تاريخ العقد</p>
                      <p className="text-sm font-semibold">{formData.contract_date}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">المبلغ الإجمالي</p>
                      <p className="text-lg font-bold text-green-600">${formData.total_amount}</p>
                    </div>
                    {selectedElevator && (
                      <div className="md:col-span-2">
                        <p className="text-xs text-gray-500">المصعد المرتبط</p>
                        <p className="text-sm font-semibold">
                          {selectedElevator.so_no} - {selectedElevator.items?.[0]?.product?.name}
                        </p>
                      </div>
                    )}
                    <div className="md:col-span-2">
                      <p className="text-xs text-gray-500">عدد الدفعات</p>
                      <p className="text-sm font-semibold">
                        {formData.milestones.length} دفعة
                        {formData.milestones.length > 0 && ` (${calculateTotalPaymentPercentage()}%)`}
                      </p>
                    </div>
                    <div className="md:col-span-2">
                      <p className="text-xs text-gray-500">عدد الشروط</p>
                      <p className="text-sm font-semibold">{termsConditions.length} شرط</p>
                    </div>
                  </div>
                </div>

                {/* Submit Error */}
                {errors.submit && (
                  <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                    <div className="flex items-center gap-2">
                      <AlertCircle className="w-5 h-5 text-red-600" />
                      <p className="text-sm text-red-800">{errors.submit}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Navigation Buttons */}
          <div className="flex items-center justify-between bg-white rounded-lg shadow p-6">
            <Button
              type="button"
              onClick={prevStep}
              disabled={currentStep === 1}
              variant="outline"
              className="gap-2"
            >
              <ArrowRight className="w-4 h-4" />
              السابق
            </Button>

            <div className="text-sm text-gray-500">
              الخطوة {currentStep} من {steps.length}
            </div>

            {currentStep < steps.length ? (
              <Button
                type="button"
                onClick={nextStep}
                className="gap-2 bg-indigo-600 hover:bg-indigo-700 text-white"
              >
                التالي
                <ArrowLeft className="w-4 h-4" />
              </Button>
            ) : (
              <Button
                type="submit"
                disabled={loading}
                className="gap-2 bg-green-600 hover:bg-green-700 text-white"
              >
                {loading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    جاري الحفظ...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    حفظ العقد
                  </>
                )}
              </Button>
            )}
          </div>
        </form>
      </div>
    </Layout>
  );
};

export default ContractCreateWizard;
