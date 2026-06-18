import React, { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import { useNavigate } from 'react-router-dom';
import { createContract, getCustomers, getQuotations, createCustomer } from '../services/api';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { ArrowLeft, ArrowRight, Save, Plus, Trash2, Check, FileText, DollarSign, Users, FileSignature } from 'lucide-react';
import { useToast } from '../components/ui/Toast';
import { useConfirmations } from '../components/ui/ConfirmDialog';

// Contract Templates
const CONTRACT_TEMPLATES = {
  ELEVATOR_INSTALLATION: {
    name: 'عقد تركيب مصعد',
    contract_type: 'SALES',
    payment_terms: '30% مقدم عند التوقيع\n40% عند توريد المعدات\n30% بعد إتمام التركيب والتشغيل',
    delivery_terms: 'التسليم خلال 60-90 يوم من تاريخ التوقيع والدفعة المقدمة',
    warranty_terms: 'ضمان سنتين شامل قطع الغيار والصيانة الدورية',
    terms_and_conditions: `1. يلتزم الطرف الأول بتوريد وتركيب المصعد حسب المواصفات المتفق عليها
2. يلتزم الطرف الثاني بتجهيز الموقع وتوفير البنية التحتية اللازمة
3. تشمل الخدمة التدريب على التشغيل والصيانة الأساسية
4. الضمان لا يشمل الأعطال الناتجة عن سوء الاستخدام`,
    milestones: [
      {
        milestone_name: 'دفعة مقدمة',
        description: 'عند التوقيع على العقد',
        payment_percent: 30,
        sequence_order: 1,
        status: 'PENDING'
      },
      {
        milestone_name: 'دفعة التوريد',
        description: 'عند وصول المعدات للموقع',
        payment_percent: 40,
        sequence_order: 2,
        status: 'PENDING'
      },
      {
        milestone_name: 'الدفعة النهائية',
        description: 'بعد إتمام التركيب والتشغيل بنجاح',
        payment_percent: 30,
        sequence_order: 3,
        status: 'PENDING'
      }
    ]
  },
  MAINTENANCE: {
    name: 'عقد صيانة شهرية',
    contract_type: 'MAINTENANCE',
    payment_terms: 'دفع شهري مقدم في بداية كل شهر',
    delivery_terms: 'استجابة فورية للطوارئ - زيارات صيانة دورية شهرية',
    warranty_terms: 'استجابة خلال 24 ساعة من الإبلاغ عن العطل\nقطع الغيار الأساسية مشمولة في العقد',
    terms_and_conditions: `1. تشمل الصيانة الفحص الدوري الشامل والتشحيم والتنظيف
2. الاستجابة للأعطال الطارئة خلال 24 ساعة
3. قطع الغيار الأساسية مشمولة في العقد
4. يتم إخطار العميل بأي أعمال صيانة إضافية مطلوبة`,
    milestones: []
  },
  MODERNIZATION: {
    name: 'عقد تحديث وتطوير مصعد',
    contract_type: 'SALES',
    payment_terms: '50% مقدم عند التوقيع\n50% عند إتمام التحديث والتشغيل',
    delivery_terms: 'إتمام العمل خلال 30-45 يوم من تاريخ البدء',
    warranty_terms: 'ضمان سنة على الأجزاء المحدثة والعمالة',
    terms_and_conditions: `1. يشمل العقد تحديث نظام التحكم والأبواب والإضاءة
2. يتم العمل خلال ساعات محددة لتقليل التأثير على المستخدمين
3. فحص شامل بعد التحديث وإصدار شهادة سلامة
4. تدريب المشغل على النظام الجديد`,
    milestones: [
      {
        milestone_name: 'دفعة مقدمة',
        description: 'عند التوقيع والبدء في العمل',
        payment_percent: 50,
        sequence_order: 1,
        status: 'PENDING'
      },
      {
        milestone_name: 'الدفعة النهائية',
        description: 'عند إتمام التحديث والتشغيل التجريبي',
        payment_percent: 50,
        sequence_order: 2,
        status: 'PENDING'
      }
    ]
  },
  CUSTOM: {
    name: 'عقد مخصص',
    contract_type: 'SALES',
    payment_terms: '',
    delivery_terms: '',
    warranty_terms: '',
    terms_and_conditions: '',
    milestones: []
  }
};

const ContractCreateImproved = () => {
  const navigate = useNavigate();
  const { success, error: toastError } = useToast();
  const { confirmDelete } = useConfirmations();
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [customers, setCustomers] = useState([]);
  const [quotations, setQuotations] = useState([]);
  const [selectedTemplate, setSelectedTemplate] = useState('');

  const [formData, setFormData] = useState({
    source: 'new', // 'new' or 'quotation'
    customer_id: '',
    customer_name: '',
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
    penalties_clause: '',
    termination_clause: '',
    total_amount: 0,
    currency: 'USD',
    notes: '',
    milestones: []
  });

  const [isNewCustomer, setIsNewCustomer] = useState(false);

  useEffect(() => {
    fetchCustomers();
    fetchQuotations();
  }, []);

  const fetchCustomers = async () => {
    try {
      const response = await getCustomers();
      const customersData = response.data || response;
      setCustomers(Array.isArray(customersData) ? customersData : []);
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

  const applyTemplate = (templateKey) => {
    const template = CONTRACT_TEMPLATES[templateKey];
    if (!template) return;

    setSelectedTemplate(templateKey);
    setFormData(prev => ({
      ...prev,
      contract_type: template.contract_type,
      payment_terms: template.payment_terms,
      delivery_terms: template.delivery_terms,
      warranty_terms: template.warranty_terms,
      terms_and_conditions: template.terms_and_conditions,
      milestones: template.milestones.map(m => ({
        ...m,
        payment_amount: 0,
        due_date: '',
        notes: ''
      }))
    }));
  };

  const handleSubmit = async () => {
    // Validation
    if (!formData.customer_id && !formData.customer_name) {
      toastError('الرجاء اختيار عميل أو إدخال اسم عميل جديد');
      return;
    }

    if (!formData.total_amount || formData.total_amount <= 0) {
      toastError('الرجاء إدخال المبلغ الإجمالي');
      return;
    }

    try {
      setLoading(true);

      let finalCustomerId = formData.customer_id;

      // Create new customer if needed
      if (isNewCustomer && formData.customer_name) {
        try {
          const newCustomer = await createCustomer({
            name: formData.customer_name,
            phone: '',
            email: '',
            address: ''
          });
          finalCustomerId = newCustomer.id;
        } catch (err) {
          console.error('Error creating customer:', err);
          toastError('تعذر إنشاء العميل الجديد');
          return;
        }
      }

      // Calculate milestone amounts if needed
      const milestonesWithAmounts = formData.milestones.map(m => {
        const amount = m.payment_amount || (formData.total_amount * (m.payment_percent / 100));
        return {
          ...m,
          payment_amount: amount
        };
      });

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
        penalties_clause: formData.penalties_clause || null,
        termination_clause: formData.termination_clause || null,
        currency: formData.currency,
        total_amount: parseFloat(formData.total_amount),
        notes: formData.notes || null,
        milestones: milestonesWithAmounts
      };

      const result = await createContract(contractData);
      success(`تم إنشاء العقد ${result.contract_no} بنجاح`);
      navigate(`/contracts/${result.id}`);
    } catch (err) {
      toastError('تعذر إنشاء العقد: ' + (err.response?.data?.detail || err.message));
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
        setIsNewCustomer(false);
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
      milestones: prev.milestones.filter((_, i) => i !== index).map((m, i) => ({
        ...m,
        sequence_order: i + 1
      }))
    }));
  };

  const updateMilestone = (index, field, value) => {
    setFormData(prev => ({
      ...prev,
      milestones: prev.milestones.map((milestone, i) =>
        i === index ? { ...milestone, [field]: value } : milestone
      )
    }));
  };

  const autoDistributeMilestones = (count) => {
    if (!formData.total_amount || count <= 0) return;

    const percentPerMilestone = 100 / count;
    const newMilestones = Array.from({ length: count }, (_, i) => ({
      milestone_name: `دفعة ${i + 1}`,
      description: '',
      sequence_order: i + 1,
      due_date: '',
      payment_percent: percentPerMilestone,
      payment_amount: (formData.total_amount * percentPerMilestone) / 100,
      status: 'PENDING',
      notes: ''
    }));

    setFormData(prev => ({
      ...prev,
      milestones: newMilestones
    }));
  };

  const nextStep = () => {
    if (currentStep < 6) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const steps = [
    { number: 1, title: 'المصدر', icon: <FileText className="w-5 h-5" /> },
    { number: 2, title: 'العميل', icon: <Users className="w-5 h-5" /> },
    { number: 3, title: 'التفاصيل', icon: <DollarSign className="w-5 h-5" /> },
    { number: 4, title: 'الشروط', icon: <FileSignature className="w-5 h-5" /> },
    { number: 5, title: 'المعالم', icon: <Check className="w-5 h-5" /> },
    { number: 6, title: 'المراجعة', icon: <Check className="w-5 h-5" /> }
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
              <ArrowRight className="w-4 h-4" />
              رجوع
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">عقد جديد</h1>
              <p className="mt-1 text-sm text-gray-500">
                معالج إنشاء عقد جديد مع العميل
              </p>
            </div>
          </div>
        </div>

        {/* Progress Steps */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            {steps.map((step, index) => (
              <React.Fragment key={step.number}>
                <div className="flex flex-col items-center">
                  <div
                    className={`w-12 h-12 rounded-full flex items-center justify-center font-semibold transition ${
                      currentStep === step.number
                        ? 'bg-indigo-600 text-white'
                        : currentStep > step.number
                        ? 'bg-emerald-500 text-white'
                        : 'bg-gray-200 text-gray-600'
                    }`}
                  >
                    {currentStep > step.number ? <Check className="w-6 h-6" /> : step.icon}
                  </div>
                  <span className={`mt-2 text-sm font-medium ${
                    currentStep === step.number ? 'text-indigo-600' : 'text-gray-600'
                  }`}>
                    {step.title}
                  </span>
                </div>
                {index < steps.length - 1 && (
                  <div className={`flex-1 h-1 mx-4 transition ${
                    currentStep > step.number ? 'bg-emerald-500' : 'bg-gray-200'
                  }`} />
                )}
              </React.Fragment>
            ))}
          </div>
        </div>

        {/* Step Content */}
        <div className="bg-white rounded-lg shadow p-6">
          {/* Step 1: Source */}
          {currentStep === 1 && (
            <div className="space-y-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">اختر مصدر العقد</h2>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <button
                  onClick={() => {
                    setFormData(prev => ({ ...prev, source: 'new', quotation_id: '' }));
                    setSelectedTemplate('');
                  }}
                  className={`p-6 border-2 rounded-lg text-center transition ${
                    formData.source === 'new'
                      ? 'border-indigo-600 bg-indigo-50'
                      : 'border-gray-300 hover:border-indigo-300'
                  }`}
                >
                  <FileText className="w-12 h-12 mx-auto mb-3 text-indigo-600" />
                  <h3 className="font-semibold text-gray-900 mb-1">عقد جديد</h3>
                  <p className="text-sm text-gray-500">إنشاء عقد من الصفر</p>
                </button>

                <button
                  onClick={() => setFormData(prev => ({ ...prev, source: 'quotation' }))}
                  className={`p-6 border-2 rounded-lg text-center transition ${
                    formData.source === 'quotation'
                      ? 'border-indigo-600 bg-indigo-50'
                      : 'border-gray-300 hover:border-indigo-300'
                  }`}
                >
                  <FileSignature className="w-12 h-12 mx-auto mb-3 text-indigo-600" />
                  <h3 className="font-semibold text-gray-900 mb-1">من عرض سعر</h3>
                  <p className="text-sm text-gray-500">تحويل عرض سعر مقبول</p>
                </button>
              </div>

              {formData.source === 'quotation' && (
                <div className="mt-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    اختر عرض السعر
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
                        {q.quotation_no} - {q.customer_name} - {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(q.total || 0)}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {formData.source === 'new' && (
                <div className="mt-6">
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    اختر قالب جاهز (اختياري)
                  </label>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {Object.entries(CONTRACT_TEMPLATES).map(([key, template]) => (
                      <button
                        key={key}
                        onClick={() => applyTemplate(key)}
                        className={`p-4 border-2 rounded-lg text-right transition ${
                          selectedTemplate === key
                            ? 'border-emerald-600 bg-emerald-50'
                            : 'border-gray-300 hover:border-emerald-300'
                        }`}
                      >
                        <h4 className="font-semibold text-gray-900 mb-1">{template.name}</h4>
                        <p className="text-xs text-gray-500">{template.contract_type}</p>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Step 2: Customer */}
          {currentStep === 2 && (
            <div className="space-y-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">معلومات العميل</h2>

              <div className="flex gap-4 mb-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    checked={!isNewCustomer}
                    onChange={() => {
                      setIsNewCustomer(false);
                      setFormData(prev => ({ ...prev, customer_name: '' }));
                    }}
                    className="text-indigo-600 focus:ring-indigo-500"
                  />
                  <span className="text-sm text-gray-700">عميل موجود</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    checked={isNewCustomer}
                    onChange={() => {
                      setIsNewCustomer(true);
                      setFormData(prev => ({ ...prev, customer_id: '' }));
                    }}
                    className="text-indigo-600 focus:ring-indigo-500"
                  />
                  <span className="text-sm text-gray-700">عميل جديد</span>
                </label>
              </div>

              {!isNewCustomer ? (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    اختر العميل <span className="text-red-500">*</span>
                  </label>
                  <select
                    name="customer_id"
                    value={formData.customer_id}
                    onChange={handleChange}
                    required
                    disabled={formData.source === 'quotation' && formData.quotation_id}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent disabled:bg-gray-100"
                  >
                    <option value="">اختر العميل</option>
                    {customers.map(c => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    اسم العميل الجديد <span className="text-red-500">*</span>
                  </label>
                  <Input
                    type="text"
                    name="customer_name"
                    value={formData.customer_name}
                    onChange={handleChange}
                    required
                    placeholder="اكتب اسم العميل الجديد"
                  />
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    الموقع من قبل العميل
                  </label>
                  <Input
                    type="text"
                    name="signed_by_customer"
                    value={formData.signed_by_customer}
                    onChange={handleChange}
                    placeholder="اسم ممثل العميل"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    الموقع من قبل الشركة
                  </label>
                  <Input
                    type="text"
                    name="signed_by_company"
                    value={formData.signed_by_company}
                    onChange={handleChange}
                    placeholder="اسم ممثل الشركة"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Financial Details */}
          {currentStep === 3 && (
            <div className="space-y-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">التفاصيل المالية</h2>

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
                    placeholder="0.00"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    العملة
                  </label>
                  <select
                    name="currency"
                    value={formData.currency}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  >
                    <option value="USD">دولار أمريكي (USD)</option>
                    <option value="EUR">يورو (EUR)</option>
                    <option value="SAR">ريال سعودي (SAR)</option>
                    <option value="AED">درهم إماراتي (AED)</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* Step 4: Terms */}
          {currentStep === 4 && (
            <div className="space-y-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">الشروط والأحكام</h2>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  شروط الدفع
                </label>
                <textarea
                  name="payment_terms"
                  value={formData.payment_terms}
                  onChange={handleChange}
                  rows="3"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  placeholder="مثال: 50% عند التوقيع، 50% عند التسليم"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  شروط التسليم
                </label>
                <textarea
                  name="delivery_terms"
                  value={formData.delivery_terms}
                  onChange={handleChange}
                  rows="3"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  placeholder="مثال: 30 يوم من تاريخ التوقيع"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  شروط الضمان
                </label>
                <textarea
                  name="warranty_terms"
                  value={formData.warranty_terms}
                  onChange={handleChange}
                  rows="3"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  placeholder="مثال: ضمان سنة من الشركة المصنعة"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  الشروط والأحكام العامة
                </label>
                <textarea
                  name="terms_and_conditions"
                  value={formData.terms_and_conditions}
                  onChange={handleChange}
                  rows="5"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  بنود الغرامات
                </label>
                <textarea
                  name="penalties_clause"
                  value={formData.penalties_clause}
                  onChange={handleChange}
                  rows="3"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  شروط الإلغاء
                </label>
                <textarea
                  name="termination_clause"
                  value={formData.termination_clause}
                  onChange={handleChange}
                  rows="3"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  ملاحظات
                </label>
                <textarea
                  name="notes"
                  value={formData.notes}
                  onChange={handleChange}
                  rows="3"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>
            </div>
          )}

          {/* Step 5: Milestones */}
          {currentStep === 5 && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-gray-900">المعالم والدفعات</h2>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    onClick={addMilestone}
                    variant="outline"
                    className="gap-2"
                    size="sm"
                  >
                    <Plus className="w-4 h-4" />
                    إضافة معلم
                  </Button>
                </div>
              </div>

              {/* Quick Distribution */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h3 className="text-sm font-semibold text-blue-900 mb-3">توزيع تلقائي</h3>
                <div className="flex gap-2 items-end">
                  <div className="flex-1">
                    <label className="block text-xs text-blue-700 mb-1">عدد الدفعات</label>
                    <Input
                      type="number"
                      min="1"
                      max="10"
                      placeholder="مثال: 3"
                      id="auto-count"
                      className="bg-white"
                    />
                  </div>
                  <Button
                    type="button"
                    onClick={() => {
                      const count = parseInt(document.getElementById('auto-count').value);
                      if (count > 0) autoDistributeMilestones(count);
                    }}
                    size="sm"
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    توزيع متساوي
                  </Button>
                </div>
              </div>

              {formData.milestones.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <p>لم يتم إضافة معالم بعد</p>
                  <p className="text-sm">يمكنك إضافة معالم لتتبع الدفعات أو استخدام التوزيع التلقائي</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {formData.milestones.map((milestone, index) => (
                    <div key={index} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="font-medium text-gray-900">معلم {index + 1}</h3>
                        <Button
                          type="button"
                          onClick={() => removeMilestone(index)}
                          variant="outline"
                          size="sm"
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            اسم المعلم
                          </label>
                          <Input
                            type="text"
                            value={milestone.milestone_name}
                            onChange={(e) => updateMilestone(index, 'milestone_name', e.target.value)}
                            placeholder="مثال: دفعة أولى"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            تاريخ الاستحقاق
                          </label>
                          <Input
                            type="date"
                            value={milestone.due_date}
                            onChange={(e) => updateMilestone(index, 'due_date', e.target.value)}
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            نسبة الدفع (%)
                          </label>
                          <Input
                            type="number"
                            value={milestone.payment_percent}
                            onChange={(e) => {
                              const percent = parseFloat(e.target.value);
                              updateMilestone(index, 'payment_percent', percent);
                              if (formData.total_amount) {
                                updateMilestone(index, 'payment_amount', (formData.total_amount * percent) / 100);
                              }
                            }}
                            min="0"
                            max="100"
                            step="0.01"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            المبلغ
                          </label>
                          <Input
                            type="number"
                            value={milestone.payment_amount}
                            onChange={(e) => {
                              const amount = parseFloat(e.target.value);
                              updateMilestone(index, 'payment_amount', amount);
                              if (formData.total_amount) {
                                updateMilestone(index, 'payment_percent', (amount / formData.total_amount) * 100);
                              }
                            }}
                            min="0"
                            step="0.01"
                          />
                        </div>

                        <div className="md:col-span-2">
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            الوصف
                          </label>
                          <textarea
                            value={milestone.description}
                            onChange={(e) => updateMilestone(index, 'description', e.target.value)}
                            rows="2"
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Summary */}
              {formData.milestones.length > 0 && (
                <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
                  <div className="flex justify-between items-center">
                    <span className="font-medium text-gray-900">المجموع:</span>
                    <div className="text-left">
                      <p className="text-lg font-bold text-gray-900">
                        {new Intl.NumberFormat('en-US', { style: 'currency', currency: formData.currency }).format(
                          formData.milestones.reduce((sum, m) => sum + (parseFloat(m.payment_amount) || 0), 0)
                        )}
                      </p>
                      <p className="text-sm text-gray-500">
                        {formData.milestones.reduce((sum, m) => sum + (parseFloat(m.payment_percent) || 0), 0).toFixed(2)}%
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Step 6: Review */}
          {currentStep === 6 && (
            <div className="space-y-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">مراجعة العقد</h2>

              <div className="space-y-4">
                <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
                  <h3 className="font-semibold text-gray-900 mb-3">معلومات العميل</h3>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <span className="text-gray-600">العميل:</span>
                      <span className="font-medium text-gray-900 mr-2">
                        {isNewCustomer ? formData.customer_name : customers.find(c => c.id === parseInt(formData.customer_id))?.name || 'غير محدد'}
                      </span>
                    </div>
                    {formData.signed_by_customer && (
                      <div>
                        <span className="text-gray-600">الموقع:</span>
                        <span className="font-medium text-gray-900 mr-2">{formData.signed_by_customer}</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h3 className="font-semibold text-gray-900 mb-3">التفاصيل المالية</h3>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <span className="text-gray-600">المبلغ الإجمالي:</span>
                      <span className="font-bold text-gray-900 mr-2">
                        {new Intl.NumberFormat('en-US', { style: 'currency', currency: formData.currency }).format(formData.total_amount)}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-600">نوع العقد:</span>
                      <span className="font-medium text-gray-900 mr-2">{formData.contract_type}</span>
                    </div>
                    <div>
                      <span className="text-gray-600">تاريخ العقد:</span>
                      <span className="font-medium text-gray-900 mr-2">{formData.contract_date}</span>
                    </div>
                    {formData.start_date && (
                      <div>
                        <span className="text-gray-600">تاريخ البدء:</span>
                        <span className="font-medium text-gray-900 mr-2">{formData.start_date}</span>
                      </div>
                    )}
                  </div>
                </div>

                {formData.milestones.length > 0 && (
                  <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4">
                    <h3 className="font-semibold text-gray-900 mb-3">المعالم ({formData.milestones.length})</h3>
                    <div className="space-y-2 text-sm">
                      {formData.milestones.map((m, i) => (
                        <div key={i} className="flex justify-between items-center">
                          <span className="text-gray-700">{i + 1}. {m.milestone_name || 'معلم بدون اسم'}</span>
                          <span className="font-medium text-gray-900">
                            {new Intl.NumberFormat('en-US', { style: 'currency', currency: formData.currency }).format(m.payment_amount)} ({m.payment_percent}%)
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {(formData.payment_terms || formData.delivery_terms || formData.warranty_terms) && (
                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                    <h3 className="font-semibold text-gray-900 mb-3">الشروط</h3>
                    <div className="space-y-2 text-sm">
                      {formData.payment_terms && (
                        <div>
                          <span className="font-medium text-gray-700">شروط الدفع:</span>
                          <p className="text-gray-600 mt-1">{formData.payment_terms.substring(0, 100)}{formData.payment_terms.length > 100 ? '...' : ''}</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Navigation Buttons */}
          <div className="flex justify-between mt-8 pt-6 border-t border-gray-200">
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

            {currentStep < 6 ? (
              <Button
                type="button"
                onClick={nextStep}
                className="bg-indigo-600 hover:bg-indigo-700 text-white gap-2"
              >
                التالي
                <ArrowLeft className="w-4 h-4" />
              </Button>
            ) : (
              <Button
                type="button"
                onClick={handleSubmit}
                disabled={loading}
                className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2"
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
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default ContractCreateImproved;
