import React, { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import { useNavigate } from 'react-router-dom';
import { createContract, getCustomers, getQuotations, createCustomer, getSalesOrders } from '../services/api';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import {
  ArrowLeft, Save, Plus, Trash2, Package, Users, FileText, DollarSign,
  CheckCircle, ChevronDown, ChevronUp, AlertCircle, Info, Eye
} from 'lucide-react';
import { useToast } from '../components/ui/Toast';
import { useConfirmations } from '../components/ui/ConfirmDialog';

const ContractCreate = () => {
  const navigate = useNavigate();
  const { success, error: toastError } = useToast();
  const { confirmCustom } = useConfirmations();
  const [loading, setLoading] = useState(false);
  const [customers, setCustomers] = useState([]);
  const [quotations, setQuotations] = useState([]);
  const [elevators, setElevators] = useState([]);
  const [isNewCustomer, setIsNewCustomer] = useState(false);
  const [elevatorInputType, setElevatorInputType] = useState('from_inventory');
  const [errors, setErrors] = useState({});
  const [selectedElevator, setSelectedElevator] = useState(null);
  
  // Collapsible sections state
  const [expandedSections, setExpandedSections] = useState({
    elevator: true,
    customer: false,
    basic: false,
    terms: false,
    milestones: false,
    summary: false
  });

  const [formData, setFormData] = useState({
    customer_id: '',
    customer_name: '',
    customer_phone: '',
    customer_email: '',
    customer_address: '',
    quotation_id: '',
    contract_date: new Date().toISOString().split('T')[0],
    start_date: '',
    end_date: '',
    status: 'DRAFT',
    contract_type: 'SALES',
    signed_by_customer: '',
    signed_by_company: '',
    payment_terms: '',
    delivery_terms: '',
    warranty_terms: '',
    terms_and_conditions: '',
    total_amount: 0,
    notes: '',
    milestones: [],
    // Elevator details
    elevator_sales_order_id: '',
    elevator_type: '',
    elevator_model: '',
    elevator_capacity: '',
    elevator_height: '',
    elevator_sections: '',
    elevator_cost: 0,
    allow_manual_cost_edit: false
  });
  
  // Auto-save draft - MOVED AFTER formData
  useEffect(() => {
    const savedDraft = localStorage.getItem('contract-draft');
    if (savedDraft) {
      const loadDraft = async () => {
        try {
          const draft = JSON.parse(savedDraft);
          const confirmed = await confirmCustom('تم العثور على مسودة محفوظة. هل تريد استعادتها؟', 'restore_draft');
          if (confirmed) {
            setFormData(prev => ({ ...prev, ...draft }));
          }
        } catch (err) {
          console.error('Error loading draft:', err);
        }
      };
      loadDraft();
    }
  }, []);
  
  useEffect(() => {
    const interval = setInterval(() => {
      localStorage.setItem('contract-draft', JSON.stringify(formData));
    }, 30000); // Auto-save every 30 seconds
    return () => clearInterval(interval);
  }, [formData]);

  // Terms and Conditions with categories
  const [useDefaultTerms, setUseDefaultTerms] = useState(true);
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
  
  // Log customers for debugging
  console.log('Customers loaded:', customers.length);
  console.log('Customers list:', customers);

  useEffect(() => {
    fetchCustomers();
    fetchQuotations();
    fetchElevators();
  }, []);

  const fetchCustomers = async () => {
    try {
      const response = await getCustomers();
      // The getCustomers API returns {data, total, pageSize, offset}, we need just the data array
      const customersArray = response.data || response;
      setCustomers(Array.isArray(customersArray) ? customersArray : []);
      console.log('Customers loaded successfully:', customersArray.length);
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
      // Get sales orders with type 'elevators' that are in stock
      const response = await getSalesOrders();
      const elevatorsData = Array.isArray(response) ? response : (response.data || []);
      // Filter only elevator type orders that are confirmed/fulfilled
      const elevatorOrders = elevatorsData.filter(
        order => order.order_type === 'elevators' &&
        (order.status === 'CONFIRMED' || order.status === 'FULFILLED')
      );
      setElevators(elevatorOrders);
      console.log('Elevators loaded successfully:', elevatorOrders.length);
    } catch (err) {
      console.error('Error fetching elevators:', err);
      setElevators([]);
    }
  };

  // Price adjustment tracking
  const [priceAdjustment, setPriceAdjustment] = useState({
    original_cost: 0,
    adjusted_cost: 0,
    is_adjusted: false,
    adjustment_reason: ''
  });
  
  // Handle elevator selection from inventory
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
          elevator_sales_order_id: salesOrderId,
          elevator_type: item.product?.category || '',
          elevator_model: item.product?.name || '',
          elevator_capacity: item.product?.name?.match(/\d+\s*(kg|كغ)/i)?.[0] || '',
          elevator_height: item.cable_meters || '',
          elevator_sections: item.sections || '',
          elevator_cost: cost,
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
      setFormData(prev => ({
        ...prev,
        elevator_sales_order_id: '',
        elevator_type: '',
        elevator_model: '',
        elevator_capacity: '',
        elevator_height: '',
        elevator_sections: '',
        elevator_cost: 0
      }));
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

  // Toggle section
  const toggleSection = (section) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };
  
  // Add new term/condition
  const addTermCondition = () => {
    const newId = Math.max(...termsConditions.map(t => t.id), 0) + 1;
    setTermsConditions(prev => [
      ...prev,
      { id: newId, category: 'OTHER', term: '', is_default: false }
    ]);
  };

  // Update term/condition
  const updateTermCondition = (id, field, value) => {
    setTermsConditions(prev =>
      prev.map(tc => tc.id === id ? { ...tc, [field]: value } : tc)
    );
  };

  // Remove term/condition
  const removeTermCondition = (id) => {
    setTermsConditions(prev => prev.filter(tc => tc.id !== id));
  };
  
  // Move term up/down
  const moveTermCondition = (index, direction) => {
    const newTerms = [...termsConditions];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= newTerms.length) return;
    [newTerms[index], newTerms[targetIndex]] = [newTerms[targetIndex], newTerms[index]];
    setTermsConditions(newTerms);
  };
  
  // Get category icon and color
  const getCategoryStyle = (category) => {
    const styles = {
      WARRANTY: { icon: '🛡️', color: 'bg-blue-100 text-blue-800', label: 'ضمان' },
      PAYMENT: { icon: '💰', color: 'bg-green-100 text-green-800', label: 'دفع' },
      DELIVERY: { icon: '🚚', color: 'bg-purple-100 text-purple-800', label: 'تسليم' },
      INSTALLATION: { icon: '🔧', color: 'bg-orange-100 text-orange-800', label: 'تركيب' },
      TRANSPORT: { icon: '🚛', color: 'bg-yellow-100 text-yellow-800', label: 'نقل' },
      EQUIPMENT: { icon: '⚙️', color: 'bg-gray-100 text-gray-800', label: 'معدات' },
      OTHER: { icon: '📌', color: 'bg-pink-100 text-pink-800', label: 'أخرى' }
    };
    return styles[category] || styles.OTHER;
  };

  const validateForm = () => {
    const validationErrors = {};

    // Validate customer
    if (!formData.customer_id && !formData.customer_name) {
      validationErrors.customer = 'الرجاء اختيار عميل أو إدخال اسم عميل جديد';
    }

    // Validate total amount
    if (!formData.total_amount || formData.total_amount <= 0) {
      validationErrors.total_amount = 'المبلغ الإجمالي مطلوب ويجب أن يكون أكبر من صفر';
    }

    // Validate dates
    if (formData.start_date && formData.end_date) {
      if (new Date(formData.end_date) < new Date(formData.start_date)) {
        validationErrors.end_date = 'تاريخ الانتهاء يجب أن يكون بعد تاريخ البدء';
      }
    }

    // Validate milestones if present
    if (formData.milestones.length > 0) {
      const totalPercent = parseFloat(calculateTotalPaymentPercentage());
      if (totalPercent > 100) {
        validationErrors.milestones = `مجموع النسب المئوية (${totalPercent}%) يتجاوز 100%`;
      }
    }

    // Validate new customer fields
    if (isNewCustomer) {
      if (!formData.customer_name || !formData.customer_name.trim()) {
        validationErrors.customer_name = 'اسم العميل مطلوب';
      }
    }
    
    // Validate price adjustment
    if (priceAdjustment.is_adjusted && !priceAdjustment.adjustment_reason.trim()) {
      validationErrors.adjustment_reason = 'يرجى إدخال سبب تعديل السعر';
    }

    return validationErrors;
  };
  
  // Save draft
  const saveDraft = () => {
    localStorage.setItem('contract-draft', JSON.stringify(formData));
    success('تم حفظ المسودة بنجاح');
  };
  
  // Check if section is complete
  const isSectionComplete = (section) => {
    switch(section) {
      case 'customer':
        return formData.customer_id || formData.customer_name;
      case 'details':
        return formData.contract_date && formData.contract_type;
      case 'financial':
        return formData.total_amount > 0;
      case 'milestones':
        return true; // Optional
      case 'terms':
        return termsConditions.length > 0;
      default:
        return false;
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validate form
    const validationErrors = validateForm();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      // Scroll to first error
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    // Clear errors
    setErrors({});

    try {
      setLoading(true);

      let finalCustomerId = formData.customer_id;

      // If new customer name is provided, create the customer first
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
          toastError('تعذر إنشاء العميل الجديد');
          return;
        }
      }

      // Convert terms and conditions table to formatted text with categories
      const termsAsText = termsConditions
        .filter(tc => tc.term && tc.term.trim())
        .map((tc, idx) => `[${tc.category}] ${idx + 1}. ${tc.term}`)
        .join('\n');

      const contractData = {
        customer_id: parseInt(finalCustomerId),
        quotation_id: formData.quotation_id ? parseInt(formData.quotation_id) : null,
        sales_order_id: formData.elevator_sales_order_id ? parseInt(formData.elevator_sales_order_id) : null,
        contract_date: formData.contract_date,
        start_date: formData.start_date || null,
        end_date: formData.end_date || null,
        status: formData.status,
        contract_type: formData.contract_type,
        signed_by_customer: formData.signed_by_customer || null,
        signed_by_company: formData.signed_by_company || null,
        payment_terms: formData.payment_terms || null,
        delivery_terms: formData.delivery_terms || null,
        warranty_terms: formData.warranty_terms || null,
        terms_and_conditions: termsAsText || formData.terms_and_conditions || null,
        total_amount: parseFloat(formData.total_amount),
        notes: formData.notes || null,
        // Append price adjustment info if adjusted
        ...(priceAdjustment.is_adjusted && {
          notes: `${formData.notes || ''}

[تعديل السعر]
السعر الأصلي: $${priceAdjustment.original_cost}
السعر المعدل: $${priceAdjustment.adjusted_cost}
السبب: ${priceAdjustment.adjustment_reason}`.trim()
        }),
        milestones: formData.milestones,
        // Elevator data (only send if manual entry, not from inventory)
        elevator_type: elevatorInputType === 'manual' ? formData.elevator_type : null,
        elevator_model: elevatorInputType === 'manual' ? formData.elevator_model : null,
        elevator_capacity: elevatorInputType === 'manual' ? formData.elevator_capacity : null,
        elevator_height: elevatorInputType === 'manual' ? formData.elevator_height : null,
        elevator_sections: elevatorInputType === 'manual' ? formData.elevator_sections : null,
        elevator_cost: elevatorInputType === 'manual' ? parseFloat(formData.elevator_cost) || null : null,
        elevator_notes: formData.elevator_notes || null
      };

      const result = await createContract(contractData);

      // Clear draft
      localStorage.removeItem('contract-draft');

      success(`تم إنشاء العقد ${result.contract_no} بنجاح`);
      navigate('/contracts');
    } catch (err) {
      toastError('تعذر إنشاء العقد');
      console.error('Error creating contract:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
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
          warranty_terms: selectedQuotation.warranty_terms || '',
          terms_and_conditions: selectedQuotation.terms_and_conditions || ''
        }));
      }
    } else {
      setFormData(prev => ({
        ...prev,
        quotation_id: ''
      }));
    }
  };

  const addMilestone = () => {
    setFormData(prev => ({
      ...prev,
      milestones: [
        ...prev.milestones,
        {
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
  
  // Auto-distribute payments
  const autoDistributePayments = (type) => {
    const total = formData.total_amount;
    if (!total || total <= 0) {
      toastError('الرجاء إدخال المبلغ الإجمالي أولاً');
      return;
    }
    
    let percentages = [];
    if (type === 'equal3') {
      percentages = [33.33, 33.33, 33.34];
    } else if (type === 'standard') {
      percentages = [30, 50, 20];
    }
    
    const newMilestones = percentages.map((percent, index) => ({
      milestone_name: '',
      description: index === 0 ? 'عند التوقيع' : index === 1 ? 'عند التسليم' : 'بعد التركيب',
      sequence_order: index + 1,
      due_date: '',
      payment_percent: percent,
      payment_amount: ((percent * total) / 100).toFixed(2),
      status: 'PENDING',
      notes: ''
    }));
    
    setFormData(prev => ({ ...prev, milestones: newMilestones }));
  };
  
  // Get milestone status style
  const getMilestoneStatusStyle = (status) => {
    const styles = {
      PENDING: { color: 'bg-yellow-100 text-yellow-800', label: '⏳ معلق' },
      PAID: { color: 'bg-green-100 text-green-800', label: '✅ مدفوع' },
      OVERDUE: { color: 'bg-red-100 text-red-800', label: '⚠️ متأخر' },
      CANCELLED: { color: 'bg-gray-100 text-gray-800', label: '❌ ملغي' }
    };
    return styles[status] || styles.PENDING;
  };

  const removeMilestone = (index) => {
    setFormData(prev => ({
      ...prev,
      milestones: prev.milestones.filter((_, i) => i !== index)
    }));
  };

  const updateMilestone = (index, field, value) => {
    setFormData(prev => {
      const newMilestones = prev.milestones.map((milestone, i) => {
        if (i === index) {
          const updated = { ...milestone, [field]: value };

          // Auto-calculate percentage when amount is changed
          if (field === 'payment_amount' && prev.total_amount > 0) {
            updated.payment_percent = ((parseFloat(value) / prev.total_amount) * 100).toFixed(2);
          }

          // Auto-calculate amount when percentage is changed
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

  // Calculate total payment percentage
  const calculateTotalPaymentPercentage = () => {
    return formData.milestones.reduce((sum, m) => sum + parseFloat(m.payment_percent || 0), 0).toFixed(2);
  };

  // Calculate total payment amount
  const calculateTotalPaymentAmount = () => {
    return formData.milestones.reduce((sum, m) => sum + parseFloat(m.payment_amount || 0), 0).toFixed(2);
  };
  
  // Calculate remaining amount
  const calculateRemainingAmount = () => {
    const total = parseFloat(formData.total_amount || 0);
    const paid = parseFloat(calculateTotalPaymentAmount());
    return (total - paid).toFixed(2);
  };
  
  // Get section completion status
  const getSectionStatus = (section) => {
    switch(section) {
      case 'elevator':
        if (elevatorInputType === 'from_inventory') {
          return formData.elevator_sales_order_id ? 'complete' : 'incomplete';
        } else {
          return formData.elevator_type && formData.elevator_cost > 0 ? 'complete' : 'incomplete';
        }
      case 'customer':
        return (formData.customer_id || formData.customer_name) ? 'complete' : 'incomplete';
      case 'basic':
        return formData.contract_date && formData.total_amount > 0 ? 'complete' : 'warning';
      case 'terms':
        return termsConditions.filter(t => t.term.trim()).length > 0 ? 'complete' : 'warning';
      case 'milestones':
        const totalPercent = parseFloat(calculateTotalPaymentPercentage());
        if (formData.milestones.length === 0) return 'warning';
        if (totalPercent === 100) return 'complete';
        if (totalPercent > 100) return 'error';
        return 'warning';
      default:
        return 'incomplete';
    }
  };
  
  const getSectionIcon = (status) => {
    if (status === 'complete') return '✅';
    if (status === 'warning') return '⚠️';
    if (status === 'error') return '❌';
    return '○';
  };

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header with Summary */}
        <div className="bg-gradient-to-r from-indigo-600 via-indigo-700 to-purple-700 rounded-2xl shadow-xl p-6 text-white">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-4">
              <Button
                variant="outline"
                onClick={() => navigate('/contracts')}
                className="gap-2 bg-white/10 hover:bg-white/20 text-white border-white/30"
              >
                <ArrowLeft className="w-4 h-4" />
                رجوع
              </Button>
              <div>
                <h1 className="text-3xl font-bold">عقد جديد</h1>
                <p className="text-indigo-100 text-sm">
                  إنشاء عقد جديد مع العميل
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                type="button"
                onClick={saveDraft}
                variant="outline"
                className="gap-2 bg-white/10 hover:bg-white/20 text-white border-white/30"
              >
                <Save className="w-4 h-4" />
                حفظ مسودة
              </Button>
            </div>
          </div>
          
          {/* Quick Summary Bar */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4 p-4 bg-white/10 backdrop-blur-sm rounded-xl">
            <div className="flex items-center gap-3">
              <Users className="w-5 h-5 text-indigo-200" />
              <div>
                <p className="text-xs text-indigo-200">العميل</p>
                <p className="text-sm font-semibold">
                  {isNewCustomer 
                    ? (formData.customer_name || 'غير محدد')
                    : (customers.find(c => c.id === parseInt(formData.customer_id))?.name || 'غير محدد')}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <FileText className="w-5 h-5 text-indigo-200" />
              <div>
                <p className="text-xs text-indigo-200">التاريخ</p>
                <p className="text-sm font-semibold">{formData.contract_date || '-'}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <DollarSign className="w-5 h-5 text-indigo-200" />
              <div>
                <p className="text-xs text-indigo-200">المبلغ الإجمالي</p>
                <p className="text-lg font-bold">${formData.total_amount || 0}</p>
              </div>
            </div>
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

        {/* Progress Indicator */}
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-gray-700">تقدم العمل</h3>
            <div className="flex gap-2">
              <Button
                type="button"
                onClick={() => setExpandedSections({
                  customer: true,
                  basic: true,
                  elevator: true,
                  terms: true,
                  milestones: true
                })}
                variant="outline"
                size="sm"
                className="text-xs gap-1"
              >
                <ChevronDown className="w-3 h-3" />
                توسيع الكل
              </Button>
              <Button
                type="button"
                onClick={() => setExpandedSections({
                  customer: false,
                  basic: false,
                  elevator: false,
                  terms: false,
                  milestones: false
                })}
                variant="outline"
                size="sm"
                className="text-xs gap-1"
              >
                <ChevronUp className="w-3 h-3" />
                طي الكل
              </Button>
            </div>
          </div>
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <span className={`w-8 h-8 rounded-full flex items-center justify-center ${
                getSectionStatus('elevator') === 'complete' ? 'bg-green-500 text-white' : 'bg-gray-300 text-gray-600'
              }`}>1</span>
              <span className="font-medium">المصعد</span>
            </div>
            <div className="flex-1 h-1 mx-2 bg-gray-200 rounded">
              <div className={`h-full rounded transition-all ${
                getSectionStatus('elevator') === 'complete' ? 'bg-green-500 w-full' : 'bg-gray-300 w-0'
              }`}></div>
            </div>
            <div className="flex items-center gap-2">
              <span className={`w-8 h-8 rounded-full flex items-center justify-center ${
                getSectionStatus('customer') === 'complete' ? 'bg-green-500 text-white' : 'bg-gray-300 text-gray-600'
              }`}>2</span>
              <span className="font-medium">العميل</span>
            </div>
            <div className="flex-1 h-1 mx-2 bg-gray-200 rounded">
              <div className={`h-full rounded transition-all ${
                getSectionStatus('customer') === 'complete' ? 'bg-green-500 w-full' : 'bg-gray-300 w-0'
              }`}></div>
            </div>
            <div className="flex items-center gap-2">
              <span className={`w-8 h-8 rounded-full flex items-center justify-center ${
                getSectionStatus('basic') === 'complete' ? 'bg-green-500 text-white' : 'bg-gray-300 text-gray-600'
              }`}>3</span>
              <span className="font-medium">البيانات</span>
            </div>
            <div className="flex-1 h-1 mx-2 bg-gray-200 rounded">
              <div className={`h-full rounded transition-all ${
                getSectionStatus('terms') === 'complete' ? 'bg-green-500 w-full' : 'bg-gray-300 w-0'
              }`}></div>
            </div>
            <div className="flex items-center gap-2">
              <span className={`w-8 h-8 rounded-full flex items-center justify-center ${
                getSectionStatus('milestones') === 'complete' ? 'bg-green-500 text-white' : 'bg-gray-300 text-gray-600'
              }`}>4</span>
              <span className="font-medium">الدفع</span>
            </div>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Elevator Details Section - Collapsible */}
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <button
              type="button"
              onClick={() => toggleSection('elevator')}
              className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <Package className="w-6 h-6 text-indigo-600" />
                <h2 className="text-lg font-semibold text-gray-900">
                  تفاصيل المصعد
                </h2>
                <span className="text-xl">{getSectionIcon(getSectionStatus('elevator'))}</span>
              </div>
              {expandedSections.elevator ? 
                <ChevronUp className="w-5 h-5 text-gray-400" /> : 
                <ChevronDown className="w-5 h-5 text-gray-400" />
              }
            </button>
            
            {expandedSections.elevator && (
              <div className="px-6 pb-6 border-t">

            {/* Elevator Input Type Toggle */}
            <div className="mb-6 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-indigo-200">
              <p className="text-sm text-gray-700 mb-3 font-medium">
                اختر طريقة إدخال بيانات المصعد:
              </p>
              <div className="flex gap-3">
                <label className={`flex items-center gap-2 cursor-pointer px-4 py-3 rounded-lg border-2 transition-all ${
                  elevatorInputType === 'from_inventory'
                    ? 'bg-white border-indigo-500 text-indigo-700 shadow-md'
                    : 'bg-white/50 border-gray-300 text-gray-700 hover:bg-white'
                }`}>
                  <input
                    type="radio"
                    name="elevatorInputType"
                    checked={elevatorInputType === 'from_inventory'}
                    onChange={() => setElevatorInputType('from_inventory')}
                    className="text-indigo-600 focus:ring-indigo-500"
                  />
                  <div>
                    <span className="text-sm font-semibold block">من المخزون</span>
                    <span className="text-xs text-gray-600">اختيار مصعد موجود في المخزن</span>
                  </div>
                </label>

                <label className={`flex items-center gap-2 cursor-pointer px-4 py-3 rounded-lg border-2 transition-all ${
                  elevatorInputType === 'manual'
                    ? 'bg-white border-indigo-500 text-indigo-700 shadow-md'
                    : 'bg-white/50 border-gray-300 text-gray-700 hover:bg-white'
                }`}>
                  <input
                    type="radio"
                    name="elevatorInputType"
                    checked={elevatorInputType === 'manual'}
                    onChange={() => setElevatorInputType('manual')}
                    className="text-indigo-600 focus:ring-indigo-500"
                  />
                  <div>
                    <span className="text-sm font-semibold block">إدخال يدوي</span>
                    <span className="text-xs text-gray-600">إدخال بيانات مصعد جديد</span>
                  </div>
                </label>
              </div>
            </div>

            {/* From Inventory */}
            {elevatorInputType === 'from_inventory' ? (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    اختر المصعد من المخزون
                  </label>
                  <select
                    value={formData.elevator_sales_order_id}
                    onChange={handleElevatorSelection}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  >
                    <option value="">اختر مصعد من المخزون ({elevators.length} مصعد متوفر)</option>
                    {elevators.map(elevator => (
                      <option key={elevator.id} value={elevator.id}>
                        {elevator.so_no} - {elevator.items?.[0]?.product?.name || 'مصعد'}
                        {elevator.items?.[0]?.cable_meters ? ` - ${elevator.items[0].cable_meters}م` : ''}
                        {elevator.items?.[0]?.unit_price_usd ? ` - $${elevator.items[0].unit_price_usd}` : ''}
                      </option>
                    ))}
                  </select>
                </div>

                {formData.elevator_sales_order_id && (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-gray-50 rounded-lg">
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">النوع</label>
                      <p className="text-sm font-semibold text-gray-900">{formData.elevator_type || 'غير محدد'}</p>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">الموديل</label>
                      <p className="text-sm font-semibold text-gray-900">{formData.elevator_model || 'غير محدد'}</p>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">الحمولة</label>
                      <p className="text-sm font-semibold text-gray-900">{formData.elevator_capacity || 'غير محدد'}</p>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">الارتفاع (متر)</label>
                      <p className="text-sm font-semibold text-gray-900">{formData.elevator_height || 'غير محدد'}</p>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">عدد السكاشن</label>
                      <p className="text-sm font-semibold text-gray-900">{formData.elevator_sections || 'غير محدد'}</p>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">التكلفة</label>
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-bold text-green-600">${formData.elevator_cost}</p>
                        <label className="flex items-center gap-1 text-xs text-gray-600">
                          <input
                            type="checkbox"
                            checked={formData.allow_manual_cost_edit}
                            onChange={(e) => setFormData(prev => ({ ...prev, allow_manual_cost_edit: e.target.checked }))}
                            className="rounded"
                          />
                          تعديل
                        </label>
                      </div>
                    </div>
                  </div>
                )}

                {formData.allow_manual_cost_edit && formData.elevator_sales_order_id && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      تعديل التكلفة يدوياً
                    </label>
                    <Input
                      type="number"
                      value={formData.elevator_cost}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        elevator_cost: parseFloat(e.target.value) || 0,
                        total_amount: parseFloat(e.target.value) || 0
                      }))}
                      step="0.01"
                      min="0"
                      className="max-w-xs"
                    />
                  </div>
                )}
              </div>
            ) : (
              /* Manual Input */
              <div className="space-y-4">
                <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <p className="text-sm text-yellow-800">
                    💡 هذا المصعد سيُستخدم للعرض فقط ولم يتم إدخاله للمخزن بعد
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      النوع
                    </label>
                    <Input
                      type="text"
                      name="elevator_type"
                      value={formData.elevator_type}
                      onChange={handleChange}
                      placeholder="مثال: مصعد ركاب"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      الموديل
                    </label>
                    <Input
                      type="text"
                      name="elevator_model"
                      value={formData.elevator_model}
                      onChange={handleChange}
                      placeholder="مثال: KONE MonoSpace 500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      الحمولة
                    </label>
                    <Input
                      type="text"
                      name="elevator_capacity"
                      value={formData.elevator_capacity}
                      onChange={handleChange}
                      placeholder="مثال: 630 kg"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      الارتفاع (متر)
                    </label>
                    <Input
                      type="number"
                      name="elevator_height"
                      value={formData.elevator_height}
                      onChange={handleChange}
                      placeholder="مثال: 15"
                      step="0.1"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      عدد السكاشن (الأقسام)
                    </label>
                    <Input
                      type="number"
                      name="elevator_sections"
                      value={formData.elevator_sections}
                      onChange={handleChange}
                      placeholder="مثال: 5"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      التكلفة ($)
                    </label>
                    <Input
                      type="number"
                      name="elevator_cost"
                      value={formData.elevator_cost}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        elevator_cost: parseFloat(e.target.value) || 0,
                        total_amount: parseFloat(e.target.value) || 0
                      }))}
                      placeholder="مثال: 36000"
                      step="0.01"
                      min="0"
                    />
                  </div>
                </div>
              </div>
            )}
              </div>
            )}
          </div>

          {/* Basic Information - Collapsible */}
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <button
              type="button"
              onClick={() => toggleSection('basic')}
              className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <FileText className="w-6 h-6 text-indigo-600" />
                <h2 className="text-lg font-semibold text-gray-900">
                  المعلومات الأساسية
                </h2>
                <span className="text-xl">{getSectionIcon(getSectionStatus('basic'))}</span>
              </div>
              {expandedSections.basic ? 
                <ChevronUp className="w-5 h-5 text-gray-400" /> : 
                <ChevronDown className="w-5 h-5 text-gray-400" />
              }
            </button>
            
            {expandedSections.basic && (
              <div className="px-6 pb-6 border-t pt-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  عرض السعر (اختياري)
                </label>
                <select
                  name="quotation_id"
                  value={formData.quotation_id}
                  onChange={handleQuotationChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                >
                  <option value="">اختر عرض سعر مقبول</option>
                  {quotations.map(q => (
                    <option key={q.id} value={q.id}>
                      {q.quotation_no} - {q.customer_name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  العميل <span className="text-red-500">*</span>
                </label>
                
                {errors.customer && (
                  <p className="text-sm text-red-600 mb-2">{errors.customer}</p>
                )}
                
                {/* Clear instruction */}
                <div className="mb-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-sm text-blue-800">
                    <strong>يمكنك اختيار العميل بإحدى الطريقتين:</strong><br/>
                    1️⃣ <strong>اختيار من النظام:</strong> اختر عميل موجود مسبقاً<br/>
                    2️⃣ <strong>كتابة يدوية:</strong> إنشاء عميل جديد
                  </p>
                </div>

                {/* Toggle between existing and new customer */}
                <div className="flex gap-3 mb-4">
                  <label className={`flex items-center gap-2 cursor-pointer px-4 py-2 rounded-lg border transition-all ${
                    !isNewCustomer
                      ? 'bg-indigo-50 border-indigo-300 text-indigo-700'
                      : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                  }`}>
                    <input
                      type="radio"
                      name="customerType"
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
                      className="text-indigo-600 focus:ring-indigo-500"
                    />
                    <span className="text-sm font-medium">اختيار من النظام</span>
                  </label>

                  <label className={`flex items-center gap-2 cursor-pointer px-4 py-2 rounded-lg border transition-all ${
                    isNewCustomer
                      ? 'bg-indigo-50 border-indigo-300 text-indigo-700'
                      : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                  }`}>
                    <input
                      type="radio"
                      name="customerType"
                      checked={isNewCustomer}
                      onChange={() => {
                          setIsNewCustomer(true);
                          setFormData(prev => ({
                            ...prev,
                            customer_id: ''
                          }));
                        }}
                      className="text-indigo-600 focus:ring-indigo-500"
                    />
                    <span className="text-sm font-medium">كتابة يدوية</span>
                  </label>
                </div>

                {/* Conditional rendering based on customer type */}
                {!isNewCustomer ? (
                  <div className="space-y-3">
                    <div className="relative">
                      <select
                        name="customer_id"
                        value={formData.customer_id}
                        onChange={(e) => {
                          console.log('Customer selected:', e.target.value);
                          handleChange(e);
                        }}
                        required={!isNewCustomer}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent appearance-none bg-white"
                      >
                        <option value="">اختر العميل من القائمة ({customers.length} عميل)</option>
                        {customers.map(c => (
                          <option key={c.id} value={c.id}>
                            {c.name} {c.phone ? `- ${c.phone}` : ''}
                          </option>
                        ))}
                      </select>
                      <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                        <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </div>
                    </div>
                    
                    {/* Status indicator */}
                    {loading ? (
                      <p className="text-xs text-blue-600 flex items-center gap-2">
                        <div className="w-3 h-3 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                        جاري تحميل العملاء...
                      </p>
                    ) : customers.length === 0 ? (
                      <p className="text-xs text-orange-600 bg-orange-50 p-2 rounded-lg flex items-center gap-2">
                        ⚠️ لا توجد عملاء في النظام حالياً. يمكنك إنشاء عميل جديد.
                      </p>
                    ) : (
                      <p className="text-xs text-gray-500">
                        💡 اختر من قائمة العملاء المسجلين مسبقاً في النظام
                      </p>
                    )}
                    
                    {/* Manual refresh button */}
                    <button
                      type="button"
                      onClick={() => {
                        console.log('Refreshing customers...');
                        fetchCustomers();
                      }}
                      className="text-xs text-indigo-600 hover:text-indigo-800 underline"
                    >
                      🔄 تحديث القائمة
                    </button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div>
                      <input
                        type="text"
                        name="customer_name"
                        value={formData.customer_name}
                        onChange={handleChange}
                        required={isNewCustomer}
                        placeholder="اكتب اسم العميل الجديد"
                        className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent ${
                          errors.customer_name ? 'border-red-500' : 'border-gray-300'
                        }`}
                      />
                      {errors.customer_name && (
                        <p className="text-sm text-red-600 mt-1">{errors.customer_name}</p>
                      )}
                    </div>
                    
                    {/* Additional fields for new customer */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <input
                        type="text"
                        name="customer_phone"
                        value={formData.customer_phone}
                        onChange={handleChange}
                        placeholder="رقم الهاتف (اختياري)"
                        className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm"
                      />
                      <input
                        type="email"
                        name="customer_email"
                        value={formData.customer_email}
                        onChange={handleChange}
                        placeholder="البريد الإلكتروني (اختياري)"
                        className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm"
                      />
                    </div>
                    
                    <textarea
                      name="customer_address"
                      value={formData.customer_address}
                      onChange={handleChange}
                      placeholder="العنوان (اختياري)"
                      rows="2"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm"
                    />
                    
                    <p className="text-xs text-blue-600 bg-blue-50 p-2 rounded-lg">
                      ✨ سيتم إنشاء عميل جديد في النظام تلقائياً عند حفظ العقد
                    </p>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  تاريخ العقد <span className="text-red-500">*</span>
                </label>
                <Input
                  type="date"
                  name="contract_date"
                  value={formData.contract_date}
                  onChange={handleChange}
                  required
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
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
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
                {errors.end_date && (
                  <p className="text-sm text-red-600 mt-1">{errors.end_date}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  المبلغ الإجمالي <span className="text-red-500">*</span>
                </label>
                <Input
                  type="number"
                  name="total_amount"
                  value={formData.total_amount}
                  onChange={handleChange}
                  required
                  step="0.01"
                  min="0"
                  className={errors.total_amount ? 'border-red-500' : ''}
                />
                {errors.total_amount && (
                  <p className="text-sm text-red-600 mt-1">{errors.total_amount}</p>
                )}
              </div>
                </div>
              </div>
            )}
          </div>

          {/* Terms & Conditions as Table - Collapsible */}
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <button
              type="button"
              onClick={() => toggleSection('terms')}
              className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <FileText className="w-6 h-6 text-indigo-600" />
                <h2 className="text-lg font-semibold text-gray-900">
                  الشروط والأحكام ({termsConditions.length})
                </h2>
                <span className="text-xl">{getSectionIcon(getSectionStatus('terms'))}</span>
              </div>
              <div className="flex items-center gap-3">
                {expandedSections.terms && (
                  <Button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      addTermCondition();
                    }}
                    variant="outline"
                    size="sm"
                    className="gap-2"
                  >
                    <Plus className="w-4 h-4" />
                    إضافة شرط
                  </Button>
                )}
                {expandedSections.terms ? 
                  <ChevronUp className="w-5 h-5 text-gray-400" /> : 
                  <ChevronDown className="w-5 h-5 text-gray-400" />
                }
              </div>
            </button>
            
            {expandedSections.terms && (
              <div className="px-6 pb-6 border-t pt-6">

            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-gradient-to-r from-indigo-50 to-blue-50">
                    <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700 border">
                      #
                    </th>
                    <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700 border">
                      التصنيف
                    </th>
                    <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700 border">
                      الشرط
                    </th>
                    <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700 border w-32">
                      إجراءات
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {termsConditions.map((tc, index) => {
                    const categoryStyle = getCategoryStyle(tc.category);
                    return (
                      <tr key={tc.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-sm text-gray-600 border">
                          {index + 1}
                        </td>
                        <td className="px-4 py-3 border">
                          <select
                            value={tc.category}
                            onChange={(e) => updateTermCondition(tc.id, 'category', e.target.value)}
                            className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-indigo-500"
                          >
                            {TERM_CATEGORIES.map(cat => (
                              <option key={cat.value} value={cat.value}>
                                {cat.label}
                              </option>
                            ))}
                          </select>
                          <span className={`inline-block mt-1 px-2 py-1 rounded-full text-xs ${categoryStyle.color}`}>
                            {categoryStyle.icon} {categoryStyle.label}
                          </span>
                        </td>
                        <td className="px-4 py-3 border">
                          <textarea
                            value={tc.term}
                            onChange={(e) => updateTermCondition(tc.id, 'term', e.target.value)}
                            rows="2"
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm"
                            placeholder="اكتب الشرط هنا..."
                          />
                        </td>
                        <td className="px-4 py-3 border text-center">
                          <div className="flex items-center justify-center gap-1">
                            <Button
                              type="button"
                              onClick={() => moveTermCondition(index, 'up')}
                              variant="outline"
                              size="sm"
                              disabled={index === 0}
                              className="text-gray-600 hover:text-gray-700 p-1"
                            >
                              <ChevronUp className="w-4 h-4" />
                            </Button>
                            <Button
                              type="button"
                              onClick={() => moveTermCondition(index, 'down')}
                              variant="outline"
                              size="sm"
                              disabled={index === termsConditions.length - 1}
                              className="text-gray-600 hover:text-gray-700 p-1"
                            >
                              <ChevronDown className="w-4 h-4" />
                            </Button>
                            <Button
                              type="button"
                              onClick={() => removeTermCondition(tc.id)}
                              variant="outline"
                              size="sm"
                              className="text-red-600 hover:text-red-700 hover:bg-red-50 p-1"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {termsConditions.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                لم يتم إضافة شروط بعد. انقر على "إضافة شرط" لإضافة شرط جديد.
              </div>
            )}

            <div className="mt-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  ملاحظات إضافية
                </label>
                <textarea
                  name="notes"
                  value={formData.notes}
                  onChange={handleChange}
                  rows="3"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  placeholder="أي ملاحظات أخرى..."
                />
              </div>
            </div>
              </div>
            )}
          </div>

          {/* Payment Schedule (Milestones) - Collapsible */}
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <button
              type="button"
              onClick={() => toggleSection('milestones')}
              className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <DollarSign className="w-6 h-6 text-indigo-600" />
                <h2 className="text-lg font-semibold text-gray-900">
                  خطة الدفع ({formData.milestones.length})
                </h2>
                <span className="text-xl">{getSectionIcon(getSectionStatus('milestones'))}</span>
                {formData.milestones.length > 0 && (
                  <span className="text-sm text-gray-500">
                    {calculateTotalPaymentPercentage()}%
                  </span>
                )}
              </div>
              <div className="flex items-center gap-3">
                {expandedSections.milestones && (
                  <>
                    <Button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        autoDistributePayments('standard');
                      }}
                      variant="outline"
                      size="sm"
                      className="gap-2 text-xs"
                    >
                      30-50-20
                    </Button>
                    <Button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        autoDistributePayments('equal3');
                      }}
                      variant="outline"
                      size="sm"
                      className="gap-2 text-xs"
                    >
                      3 متساوية
                    </Button>
                    <Button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        addMilestone();
                      }}
                      variant="outline"
                      size="sm"
                      className="gap-2"
                    >
                      <Plus className="w-4 h-4" />
                      إضافة
                    </Button>
                  </>
                )}
                {expandedSections.milestones ? 
                  <ChevronUp className="w-5 h-5 text-gray-400" /> : 
                  <ChevronDown className="w-5 h-5 text-gray-400" />
                }
              </div>
            </button>
            
            {expandedSections.milestones && (
              <div className="px-6 pb-6 border-t pt-6">

            {/* Example Payment Plan */}
            <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm font-medium text-blue-900 mb-2">💡 مثال على خطة الدفع:</p>
              <ul className="text-xs text-blue-800 space-y-1">
                <li>• عند توقيع العقد: دفعة $7,200 (20%)</li>
                <li>• عند وصول المصعد إلى موقع العمل: $10,800 (30%)</li>
                <li>• بعد تركيب المصعد مباشرة: $18,000 (50%)</li>
              </ul>
            </div>

            {formData.milestones.length === 0 ? (
              <div className="text-center py-8 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
                <p className="text-gray-500 mb-2">لم يتم إضافة دفعات بعد</p>
                <p className="text-sm text-gray-400">انقر على "إضافة دفعة" لإنشاء خطة الدفع</p>
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="bg-gradient-to-r from-indigo-50 to-blue-50">
                        <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700 border">#</th>
                        <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700 border">الشرط/الوصف</th>
                        <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700 border">المبلغ ($)</th>
                        <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700 border">النسبة (%)</th>
                        <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700 border">تاريخ الاستحقاق</th>
                        <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700 border">الحالة</th>
                        <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700 border w-20">إجراءات</th>
                      </tr>
                    </thead>
                    <tbody>
                      {formData.milestones.map((milestone, index) => {
                        const statusStyle = getMilestoneStatusStyle(milestone.status || 'PENDING');
                        return (
                        <tr key={index} className="hover:bg-gray-50">
                          <td className="px-4 py-3 text-sm font-medium text-gray-900 border">
                            {index + 1}
                          </td>
                          <td className="px-4 py-3 border">
                            <Input
                              type="text"
                              value={milestone.description || milestone.milestone_name}
                              onChange={(e) => updateMilestone(index, 'description', e.target.value)}
                              placeholder="مثال: عند توقيع العقد"
                              className="text-sm"
                            />
                          </td>
                          <td className="px-4 py-3 border">
                            <Input
                              type="number"
                              value={milestone.payment_amount}
                              onChange={(e) => updateMilestone(index, 'payment_amount', e.target.value)}
                              min="0"
                              step="0.01"
                              placeholder="0.00"
                              className="text-sm font-semibold"
                            />
                          </td>
                          <td className="px-4 py-3 border">
                            <div className="flex items-center gap-2">
                              <Input
                                type="number"
                                value={milestone.payment_percent}
                                onChange={(e) => updateMilestone(index, 'payment_percent', e.target.value)}
                                min="0"
                                max="100"
                                step="0.01"
                                placeholder="0"
                                className="text-sm"
                              />
                              <span className="text-xs text-gray-500">%</span>
                            </div>
                          </td>
                          <td className="px-4 py-3 border">
                            <Input
                              type="date"
                              value={milestone.due_date || ''}
                              onChange={(e) => updateMilestone(index, 'due_date', e.target.value)}
                              className="text-sm"
                            />
                          </td>
                          <td className="px-4 py-3 border text-center">
                            <select
                              value={milestone.status || 'PENDING'}
                              onChange={(e) => updateMilestone(index, 'status', e.target.value)}
                              className={`px-2 py-1 rounded-full text-xs font-medium ${statusStyle.color}`}
                            >
                              <option value="PENDING">⏳ معلق</option>
                              <option value="PAID">✅ مدفوع</option>
                              <option value="OVERDUE">⚠️ متأخر</option>
                              <option value="CANCELLED">❌ ملغي</option>
                            </select>
                          </td>
                          <td className="px-4 py-3 border text-center">
                            <Button
                              type="button"
                              onClick={() => removeMilestone(index)}
                              variant="outline"
                              size="sm"
                              className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </td>
                        </tr>
                        );
                      })}
                      {/* Total Row */}
                      <tr className="bg-gradient-to-r from-green-50 to-emerald-50 font-bold">
                        <td colSpan="2" className="px-4 py-3 text-sm text-gray-900 border text-right">
                          الإجمالي
                        </td>
                        <td className="px-4 py-3 text-sm text-green-700 border">
                          ${calculateTotalPaymentAmount()}
                        </td>
                        <td className="px-4 py-3 text-sm text-green-700 border">
                          {calculateTotalPaymentPercentage()}%
                        </td>
                        <td colSpan="3" className="border"></td>
                      </tr>
                      {/* Remaining Amount Row */}
                      {parseFloat(formData.total_amount) > 0 && (
                        <tr className="bg-gradient-to-r from-blue-50 to-indigo-50 font-semibold">
                          <td colSpan="2" className="px-4 py-3 text-sm text-gray-900 border text-right">
                            المتبقي
                          </td>
                          <td className="px-4 py-3 text-sm text-blue-700 border">
                            ${calculateRemainingAmount()}
                          </td>
                          <td className="px-4 py-3 text-sm text-blue-700 border">
                            {(100 - parseFloat(calculateTotalPaymentPercentage())).toFixed(2)}%
                          </td>
                          <td colSpan="3" className="border"></td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Validation Messages */}
                <div className="mt-4 space-y-2">
                  {errors.milestones && (
                    <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                      <p className="text-sm text-red-800">
                        ⚠️ {errors.milestones}
                      </p>
                    </div>
                  )}
                  {parseFloat(calculateTotalPaymentPercentage()) > 100 && (
                    <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                      <p className="text-sm text-red-800">
                        ⚠️ تحذير: مجموع النسب المئوية ({calculateTotalPaymentPercentage()}%) أكبر من 100%
                      </p>
                    </div>
                  )}
                  {parseFloat(calculateTotalPaymentPercentage()) < 100 && formData.milestones.length > 0 && (
                    <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                      <p className="text-sm text-yellow-800">
                        💡 ملاحظة: مجموع النسب المئوية ({calculateTotalPaymentPercentage()}%) أقل من 100%. المتبقي: {(100 - parseFloat(calculateTotalPaymentPercentage())).toFixed(2)}%
                      </p>
                    </div>
                  )}
                  {parseFloat(calculateTotalPaymentAmount()) !== parseFloat(formData.total_amount) && formData.total_amount > 0 && (
                    <div className="p-3 bg-orange-50 border border-orange-200 rounded-lg">
                      <p className="text-sm text-orange-800">
                        ℹ️ مجموع الدفعات (${calculateTotalPaymentAmount()}) {parseFloat(calculateTotalPaymentAmount()) > parseFloat(formData.total_amount) ? 'أكبر' : 'أقل'} من المبلغ الإجمالي (${formData.total_amount})
                      </p>
                    </div>
                  )}
                </div>
              </>
            )}
              </div>
            )}
          </div>

          {/* Summary Section - Collapsible */}
          <div className="bg-gradient-to-r from-indigo-50 to-blue-50 rounded-lg shadow overflow-hidden border-2 border-indigo-200">
            <button
              type="button"
              onClick={() => toggleSection('summary')}
              className="w-full px-6 py-4 flex items-center justify-between hover:bg-indigo-100 transition-colors"
            >
              <div className="flex items-center gap-3">
                <Eye className="w-6 h-6 text-indigo-600" />
                <h2 className="text-lg font-semibold text-gray-900">
                  ملخص العقد
                </h2>
              </div>
              {expandedSections.summary ? 
                <ChevronUp className="w-5 h-5 text-gray-600" /> : 
                <ChevronDown className="w-5 h-5 text-gray-600" />
              }
            </button>
            
            {expandedSections.summary && (
              <div className="px-6 pb-6 border-t pt-6 bg-white">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {/* Customer Info */}
                  <div className="p-4 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg border border-blue-200">
                    <div className="flex items-center gap-2 mb-2">
                      <Users className="w-5 h-5 text-blue-600" />
                      <h3 className="font-semibold text-gray-900">العميل</h3>
                    </div>
                    <p className="text-sm text-gray-700">
                      {isNewCustomer 
                        ? (formData.customer_name || 'غير محدد')
                        : (customers.find(c => c.id === parseInt(formData.customer_id))?.name || 'غير محدد')}
                    </p>
                  </div>

                  {/* Elevator Info */}
                  <div className="p-4 bg-gradient-to-br from-purple-50 to-pink-50 rounded-lg border border-purple-200">
                    <div className="flex items-center gap-2 mb-2">
                      <Package className="w-5 h-5 text-purple-600" />
                      <h3 className="font-semibold text-gray-900">المصعد</h3>
                    </div>
                    <p className="text-sm text-gray-700">
                      {formData.elevator_model || formData.elevator_type || 'غير محدد'}
                    </p>
                  </div>

                  {/* Contract Date */}
                  <div className="p-4 bg-gradient-to-br from-green-50 to-emerald-50 rounded-lg border border-green-200">
                    <div className="flex items-center gap-2 mb-2">
                      <FileText className="w-5 h-5 text-green-600" />
                      <h3 className="font-semibold text-gray-900">تاريخ العقد</h3>
                    </div>
                    <p className="text-sm text-gray-700">
                      {formData.contract_date || 'غير محدد'}
                    </p>
                  </div>

                  {/* Total Amount */}
                  <div className="p-4 bg-gradient-to-br from-yellow-50 to-orange-50 rounded-lg border border-yellow-200">
                    <div className="flex items-center gap-2 mb-2">
                      <DollarSign className="w-5 h-5 text-orange-600" />
                      <h3 className="font-semibold text-gray-900">المبلغ الإجمالي</h3>
                    </div>
                    <p className="text-lg font-bold text-orange-600">
                      ${formData.total_amount || 0}
                    </p>
                  </div>

                  {/* Terms Count */}
                  <div className="p-4 bg-gradient-to-br from-indigo-50 to-blue-50 rounded-lg border border-indigo-200">
                    <div className="flex items-center gap-2 mb-2">
                      <FileText className="w-5 h-5 text-indigo-600" />
                      <h3 className="font-semibold text-gray-900">الشروط</h3>
                    </div>
                    <p className="text-sm text-gray-700">
                      {termsConditions.filter(t => t.term.trim()).length} شرط
                    </p>
                  </div>

                  {/* Milestones Count */}
                  <div className="p-4 bg-gradient-to-br from-pink-50 to-rose-50 rounded-lg border border-pink-200">
                    <div className="flex items-center gap-2 mb-2">
                      <DollarSign className="w-5 h-5 text-pink-600" />
                      <h3 className="font-semibold text-gray-900">خطة الدفع</h3>
                    </div>
                    <p className="text-sm text-gray-700">
                      {formData.milestones.length} دفعة ({calculateTotalPaymentPercentage()}%)
                    </p>
                  </div>
                </div>

                {/* Completion Status */}
                <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                  <h3 className="font-semibold text-gray-900 mb-3">حالة الإكمال</h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div className="flex items-center gap-2">
                      <span className="text-xl">{getSectionIcon(getSectionStatus('elevator'))}</span>
                      <span className="text-sm text-gray-700">المصعد</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xl">{getSectionIcon(getSectionStatus('customer'))}</span>
                      <span className="text-sm text-gray-700">العميل</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xl">{getSectionIcon(getSectionStatus('basic'))}</span>
                      <span className="text-sm text-gray-700">البيانات</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xl">{getSectionIcon(getSectionStatus('terms'))}</span>
                      <span className="text-sm text-gray-700">الشروط</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate('/contracts')}
            >
              إلغاء
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className="bg-indigo-600 hover:bg-indigo-700 text-white gap-2"
            >
              {loading ? (
                'جاري الحفظ...'
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  حفظ العقد
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </Layout>
  );
};

export default ContractCreate;
