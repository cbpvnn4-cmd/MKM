import React, { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import { useNavigate } from 'react-router-dom';
import { createContract, getCustomers, getQuotations, createCustomer, getSalesOrders } from '../services/api';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { ArrowLeft, Save, Plus, Trash2, Package } from 'lucide-react';
import { useToast } from '../components/ui/Toast';
import { useConfirmations } from '../components/ui/ConfirmDialog';

const ContractCreate = () => {
  const navigate = useNavigate();
  const { success, error: toastError } = useToast();
  const { confirmDelete } = useConfirmations();
  const [loading, setLoading] = useState(false);
  const [customers, setCustomers] = useState([]);
  const [quotations, setQuotations] = useState([]);
  const [elevators, setElevators] = useState([]); // Available elevators from inventory
  const [isNewCustomer, setIsNewCustomer] = useState(false);
  const [elevatorInputType, setElevatorInputType] = useState('from_inventory'); // 'from_inventory' or 'manual'

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

  // Terms and Conditions table
  const [termsConditions, setTermsConditions] = useState([
    { id: 1, term: 'ضمان شهر واحد', editable: true },
    { id: 2, term: 'أجور النقل إلى موقع العمل - على عاتق البائع', editable: true },
    { id: 3, term: 'أجور التركيب - على عاتق البائع', editable: true },
    { id: 4, term: 'توفير كرين للتركيب والتفريغ - على عاتق المشتري', editable: true }
  ]);
  
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

  // Handle elevator selection from inventory
  const handleElevatorSelection = (e) => {
    const salesOrderId = e.target.value;
    if (salesOrderId) {
      const selectedElevator = elevators.find(el => el.id === parseInt(salesOrderId));
      if (selectedElevator && selectedElevator.items && selectedElevator.items[0]) {
        const item = selectedElevator.items[0];
        setFormData(prev => ({
          ...prev,
          elevator_sales_order_id: salesOrderId,
          elevator_type: item.product?.category || '',
          elevator_model: item.product?.name || '',
          elevator_capacity: item.product?.name?.match(/\d+\s*(kg|كغ)/i)?.[0] || '',
          elevator_height: item.cable_meters || '',
          elevator_sections: item.sections || '',
          elevator_cost: parseFloat(item.unit_price_usd || 0),
          total_amount: parseFloat(item.unit_price_usd || 0)
        }));
      }
    } else {
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
    }
  };

  // Add new term/condition
  const addTermCondition = () => {
    const newId = Math.max(...termsConditions.map(t => t.id), 0) + 1;
    setTermsConditions(prev => [
      ...prev,
      { id: newId, term: '', editable: true }
    ]);
  };

  // Update term/condition
  const updateTermCondition = (id, newTerm) => {
    setTermsConditions(prev =>
      prev.map(tc => tc.id === id ? { ...tc, term: newTerm } : tc)
    );
  };

  // Remove term/condition
  const removeTermCondition = (id) => {
    setTermsConditions(prev => prev.filter(tc => tc.id !== id));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validate customer - either selected or new name entered
    if (!formData.customer_id && !formData.customer_name) {
      toastError('الرجاء اختيار عميل أو إدخال اسم عميل جديد');
      return;
    }

    if (!formData.total_amount) {
      toastError('الرجاء إدخال المبلغ الإجمالي');
      return;
    }

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

      const contractData = {
        customer_id: parseInt(finalCustomerId),
        quotation_id: formData.quotation_id ? parseInt(formData.quotation_id) : null,
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
        terms_and_conditions: formData.terms_and_conditions || null,
        total_amount: parseFloat(formData.total_amount),
        notes: formData.notes || null,
        milestones: formData.milestones
      };

      const result = await createContract(contractData);
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
                إنشاء عقد جديد مع العميل
              </p>
            </div>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Elevator Details Section */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center gap-3 mb-4">
              <Package className="w-6 h-6 text-indigo-600" />
              <h2 className="text-lg font-semibold text-gray-900">
                تفاصيل المصعد
              </h2>
            </div>

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

          {/* Basic Information */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              المعلومات الأساسية
            </h2>

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
                    <input
                      type="text"
                      name="customer_name"
                      value={formData.customer_name}
                      onChange={handleChange}
                      required={isNewCustomer}
                      placeholder="اكتب اسم العميل الجديد"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    />
                    
                    {/* Additional fields for new customer */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <input
                        type="text"
                        name="customer_phone"
                        placeholder="رقم الهاتف (اختياري)"
                        className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm"
                      />
                      <input
                        type="email"
                        name="customer_email"
                        placeholder="البريد الإلكتروني (اختياري)"
                        className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm"
                      />
                    </div>
                    
                    <textarea
                      name="customer_address"
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
                />
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
                />
              </div>
            </div>
          </div>

          {/* Terms & Conditions as Table */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">
                الشروط والأحكام
              </h2>
              <Button
                type="button"
                onClick={addTermCondition}
                variant="outline"
                className="gap-2"
              >
                <Plus className="w-4 h-4" />
                إضافة شرط
              </Button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700 border">
                      #
                    </th>
                    <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700 border">
                      الشرط
                    </th>
                    <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700 border w-20">
                      إجراءات
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {termsConditions.map((tc, index) => (
                    <tr key={tc.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm text-gray-600 border">
                        {index + 1}
                      </td>
                      <td className="px-4 py-3 border">
                        <textarea
                          value={tc.term}
                          onChange={(e) => updateTermCondition(tc.id, e.target.value)}
                          rows="2"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm"
                          placeholder="اكتب الشرط هنا..."
                        />
                      </td>
                      <td className="px-4 py-3 border text-center">
                        <Button
                          type="button"
                          onClick={() => removeTermCondition(tc.id)}
                          variant="outline"
                          size="sm"
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </td>
                    </tr>
                  ))}
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

          {/* Payment Schedule (Milestones) */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">
                خطة الدفع (Payment Schedule)
              </h2>
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
                        <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700 border w-20">إجراءات</th>
                      </tr>
                    </thead>
                    <tbody>
                      {formData.milestones.map((milestone, index) => (
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
                      ))}
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
                        <td className="border"></td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* Validation Messages */}
                <div className="mt-4 space-y-2">
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
