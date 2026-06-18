import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Layout from '../components/Layout';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { useToast } from '../components/ui/Toast';
import {
  FileText, Building2, Users, Package, DollarSign, FileSignature,
  Plus, Trash2, Save, ArrowLeft, CheckCircle2
} from 'lucide-react';
import { getCustomers, createContract, getQuotations, getQuotation, getContract, updateContract } from '../services/api';
import { useAuth } from '../contexts/AuthContext';

const STEP_CONFIG = [
  { id: 'basic', label: 'المعلومات الأساسية', icon: FileText, description: 'التاريخ، العميل، العملة، وقيمة العقد.' },
  { id: 'parties', label: 'الأطراف والمشروع', icon: Users, description: 'بيانات البائع والمشتري ومعلومات المشروع.' },
  { id: 'elevators', label: 'المصاعد', icon: Package, description: 'مواصفات المصاعد والأسعار والضمان.' },
  { id: 'payments', label: 'الدفعات', icon: DollarSign, description: 'نسب ومبالغ الدفعات وتواريخ الاستحقاق.' },
  { id: 'terms', label: 'المراجعة والشروط', icon: FileSignature, description: 'مراجعة نهائية وإضافة الشروط والتوقيعات.' }
];

const DEFAULT_COMPANY_PROFILE = {
  name: 'السند للمصاعد',
  phone: '',
  email: '',
  address: ''
};

const COMPANY_SETTINGS_KEYS = ['systemSettings', 'businessSettings', 'companyProfile', 'companySettings', 'settings'];

const normalizeCompanySettings = (rawSettings) => {
  if (!rawSettings || typeof rawSettings !== 'object') return null;
  const sections = [rawSettings];
  ['business', 'company', 'organization', 'profile'].forEach((key) => {
    if (rawSettings[key] && typeof rawSettings[key] === 'object') {
      sections.push(rawSettings[key]);
    }
  });
  const pickField = (keys) => {
    for (const section of sections) {
      if (!section || typeof section !== 'object') continue;
      for (const key of keys) {
        const value = section[key];
        if (typeof value === 'string' && value.trim()) {
          return value.trim();
        }
      }
    }
    return null;
  };
  const normalized = {
    name: pickField(['companyName', 'company_name', 'name', 'seller_company_name']),
    phone: pickField(['companyPhone', 'company_phone', 'phone', 'seller_phone', 'contact_phone']),
    email: pickField(['companyEmail', 'company_email', 'email', 'seller_email', 'contact_email']),
    address: pickField(['companyAddress', 'company_address', 'address', 'seller_address', 'location'])
  };
  if (!Object.values(normalized).some(Boolean)) {
    return null;
  }
  return {
    name: normalized.name || DEFAULT_COMPANY_PROFILE.name,
    phone: normalized.phone || DEFAULT_COMPANY_PROFILE.phone,
    email: normalized.email || DEFAULT_COMPANY_PROFILE.email,
    address: normalized.address || DEFAULT_COMPANY_PROFILE.address
  };
};

const loadCompanyProfile = () => {
  if (typeof window === 'undefined') {
    return DEFAULT_COMPANY_PROFILE;
  }
  const storages = [];
  try {
    if (window.localStorage) {
      storages.push(window.localStorage);
    }
  } catch (err) {
    console.warn('localStorage unavailable for system settings:', err);
  }
  try {
    if (window.sessionStorage) {
      storages.push(window.sessionStorage);
    }
  } catch (err) {
    console.warn('sessionStorage unavailable for system settings:', err);
  }
  for (const storage of storages) {
    for (const key of COMPANY_SETTINGS_KEYS) {
      try {
        const raw = storage.getItem(key);
        if (!raw) continue;
        const parsed = JSON.parse(raw);
        const normalized = normalizeCompanySettings(parsed);
        if (normalized) {
          return normalized;
        }
      } catch (parseErr) {
        console.warn('Failed to parse system settings for company profile:', parseErr);
      }
    }
  }
  if (typeof window !== 'undefined' && window.__SYSTEM_SETTINGS__) {
    const normalized = normalizeCompanySettings(window.__SYSTEM_SETTINGS__);
    if (normalized) {
      return normalized;
    }
  }
  return DEFAULT_COMPANY_PROFILE;
};

const normalizeContractType = (value) => (value === 'SERVICE' ? 'SERVICE' : 'SALES');

const ElevatorContractNew = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const { user } = useAuth();
  const { success, error: toastError } = useToast();
  const companyProfile = useMemo(() => loadCompanyProfile(), []);
  const isEditMode = Boolean(id);
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(isEditMode);
  const [customers, setCustomers] = useState([]);
  const [quotations, setQuotations] = useState([]);
  const [errors, setErrors] = useState({});
  const [formData, setFormData] = useState(() => ({
    contract_date: new Date().toISOString().split('T')[0],
    start_date: '',
    end_date: '',
    customer_id: '',
    quotation_id: '',
    status: 'DRAFT',
    contract_type: 'SALES',
    currency: 'USD',
    total_amount: 0,
    total_amount_text: '',
    seller_company_name: companyProfile.name,
    seller_address: companyProfile.address || '',
    seller_phone: companyProfile.phone || '',
    seller_email: companyProfile.email || '',
    seller_authorized_person: '',
    buyer_name: '',
    buyer_address: '',
    buyer_phone: '',
    buyer_email: '',
    buyer_representative: '',
    project_name: '',
    warranty_period: '12 شهر',
    payment_schedule: '',
    payment_terms: '',
    delivery_terms: '',
    warranty_terms: '',
    seller_obligations: `• توريد المصعد حسب المواصفات المذكورة في العقد
• الالتزام بجدول التنفيذ المتفق عليه
• توفير ضمان لمدة 12 شهر على الأقل
• تدريب المستفيد على التشغيل والصيانة`,
    buyer_obligations: `• الالتزام بدفع الدفعات (المقدم + الدفعات التعاقدية) في مواعيدها
• تجهيز الموقع للبداية الفعلية للتركيب
• توفير مصدر كهرباء (ثلاثي) للغذاء الرئيسي
• توفير مكان آمن لحفظ المواد (المستودع)`,
    general_terms: `• يتعين الحصول على الموافقات الرسمية قبل البدء بأعمال التركيب
• يتحمل الطرف الثاني أي غرامات أو مخالفات رسمية
• لا يجوز التنازل عن العقد أو بيعه لطرف ثالث دون موافقة خطية`,
    price_includes: `• النقل والتسليم
• التركيب الكامل
• مواد التشغيل الأساسية
• التدريب اللازم`,
    terms_and_conditions: '',
    penalties_clause: '',
    termination_clause: '',
    notes: '',
    signed_by_company: '',
    signed_by_customer: ''
  }));
  const [calculatedTotal, setCalculatedTotal] = useState(0);
  const [isManualTotalOverride, setIsManualTotalOverride] = useState(false);
  const [elevators, setElevators] = useState([{
    id: Date.now(),
    elevator_type: 'ركاب',
    model: '',
    capacity_kg: 630,
    capacity_persons: 8,
    speed_mps: 1.0,
    num_stops: 6,
    travel_height: '',
    door_type: 'أوتوماتيك',
    origin_country: 'الصين',
    quantity: 1,
    emergency_system: 'نعم',
    intercom: 'نعم',
    display_screen: 'نعم',
    other_features: '',
    unit_price: 0,
    total_price: 0,
    warranty_period: '12 شهر',
    notes: ''
  }]);
  const [payments, setPayments] = useState([
    { id: 1, payment_number: 1, description: 'عند توقيع العقد', percentage: 30, amount: 0, due_date: '', status: 'PENDING' },
    { id: 2, payment_number: 2, description: 'عند وصول المصعد للموقع', percentage: 30, amount: 0, due_date: '', status: 'PENDING' },
    { id: 3, payment_number: 3, description: 'بعد انتهاء التركيب والتشغيل', percentage: 40, amount: 0, due_date: '', status: 'PENDING' }
  ]);
  const [quotationLoading, setQuotationLoading] = useState(false);
  const steps = STEP_CONFIG;
  const stepOrder = steps.map(step => step.id);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);

  useEffect(() => {
    loadData();
    if (isEditMode) {
      loadContractData();
    }
  }, [id]);

  useEffect(() => {
    if (!user) return;
    setFormData(prev => {
      if (!user.full_name || prev.seller_authorized_person === user.full_name) {
        return prev;
      }
      return { ...prev, seller_authorized_person: user.full_name };
    });
  }, [user]);

  const loadContractData = async () => {
    try {
      setLoadingData(true);
      const contract = await getContract(id);

      setFormData({
        contract_date: contract.contract_date || new Date().toISOString().split('T')[0],
        start_date: contract.start_date || '',
        end_date: contract.end_date || '',
        customer_id: contract.customer_id ? String(contract.customer_id) : '',
        quotation_id: contract.quotation_id ? String(contract.quotation_id) : '',
        status: contract.status || 'DRAFT',
        contract_type: normalizeContractType(contract.contract_type),
        currency: contract.currency || 'USD',
        total_amount: contract.total_amount || 0,
        total_amount_text: contract.total_amount_text || '',
        seller_company_name: contract.seller_company_name || companyProfile.name,
        seller_address: contract.seller_address || companyProfile.address || '',
        seller_phone: contract.seller_phone || companyProfile.phone || '',
        seller_email: contract.seller_email || companyProfile.email || '',
        seller_authorized_person: contract.seller_authorized_person || '',
        buyer_name: contract.buyer_name || '',
        buyer_address: contract.buyer_address || '',
        buyer_phone: contract.buyer_phone || '',
        buyer_email: contract.buyer_email || '',
        buyer_representative: contract.buyer_representative || '',
        project_name: contract.project_name || '',
        warranty_period: contract.warranty_period || '12 شهر',
        payment_schedule: contract.payment_schedule || '',
        payment_terms: contract.payment_terms || '',
        delivery_terms: contract.delivery_terms || '',
        warranty_terms: contract.warranty_terms || '',
        seller_obligations: contract.seller_obligations || '',
        buyer_obligations: contract.buyer_obligations || '',
        general_terms: contract.general_terms || '',
        price_includes: contract.price_includes || '',
        terms_and_conditions: contract.terms_and_conditions || '',
        penalties_clause: contract.penalties_clause || '',
        termination_clause: contract.termination_clause || '',
        notes: contract.notes || '',
        signed_by_company: contract.signed_by_company || '',
        signed_by_customer: contract.signed_by_customer || ''
      });

      let normalizedElevators = [];
      if (contract.elevators && contract.elevators.length > 0) {
        normalizedElevators = contract.elevators.map((e, idx) => ({
          id: e.id || Date.now() + idx,
          elevator_type: e.elevator_type || 'مصعد',
          model: e.model || '',
          capacity_kg: e.capacity_kg || 630,
          capacity_persons: e.capacity_persons || 8,
          speed_mps: e.speed_mps || 1.0,
          num_stops: e.num_stops || 6,
          travel_height: e.travel_height || '',
          door_type: e.door_type || 'أوتوماتيك',
          origin_country: e.origin_country || 'الصين',
          quantity: e.quantity || 1,
          emergency_system: e.emergency_system || 'نعم',
          intercom: e.intercom || 'نعم',
          display_screen: e.display_screen || 'نعم',
          other_features: e.other_features || '',
          unit_price: e.unit_price || 0,
          total_price: e.total_price || 0,
          warranty_period: e.warranty_period || '12 شهر',
          notes: e.notes || ''
        }));
        setElevators(normalizedElevators);
      }
      const contractTotalNumber = Number(contract.total_amount) || 0;
      const autoTotal = normalizedElevators.reduce((sum, el) => sum + parseFloat(el.total_price || 0), 0);
      const needsManualOverride = normalizedElevators.length === 0
        ? contractTotalNumber > 0
        : Math.abs(autoTotal - contractTotalNumber) > 0.01;
      setIsManualTotalOverride(needsManualOverride);

      if (contract.payments && contract.payments.length > 0) {
        setPayments(contract.payments.map((p, idx) => ({
          id: p.id || idx + 1,
          payment_number: p.payment_number || idx + 1,
          description: p.description || '',
          percentage: p.percentage || 0,
          amount: p.amount || 0,
          due_date: p.due_date || '',
          status: p.status || 'PENDING'
        })));
      }
    } catch (err) {
      console.error('Error loading contract:', err);
      toastError('فشل تحميل بيانات العقد');
      navigate('/contracts');
    } finally {
      setLoadingData(false);
    }
  };

  useEffect(() => {
    const total = elevators.reduce((sum, el) => sum + parseFloat(el.total_price || 0), 0);
    setCalculatedTotal(total);
    if (isManualTotalOverride) {
      return;
    }
    setFormData(prev => (
      prev.total_amount === total
        ? prev
        : { ...prev, total_amount: total }
    ));
  }, [elevators, isManualTotalOverride]);

  useEffect(() => {
    const totalBase = Number(formData.total_amount) || 0;
    setPayments(prev => prev.map(p => ({
      ...p,
      amount: (totalBase * parseFloat(p.percentage || 0)) / 100
    })));
  }, [formData.total_amount]);

  const loadData = async () => {
    try {
      const [customersRes, quotationsRes] = await Promise.all([
        getCustomers(),
        getQuotations({ status: 'ACCEPTED' })
      ]);
      setCustomers(customersRes.data || customersRes || []);
      setQuotations(quotationsRes || []);
    } catch (err) {
      console.error('Error loading data:', err);
    }
  };

  const handleCustomerChange = (customerId) => {
    setFormData(prev => ({ ...prev, customer_id: customerId }));
    if (!customerId) {
      setFormData(prev => ({
        ...prev,
        buyer_name: '',
        buyer_phone: '',
        buyer_email: '',
        buyer_address: ''
      }));
      return;
    }
    const numericId = parseInt(customerId, 10);
    if (Number.isNaN(numericId)) {
      return;
    }
    const customer = customers.find(c => c.id === numericId);
    if (customer) {
      setFormData(prev => ({
        ...prev,
        buyer_name: customer.name || '',
        buyer_phone: customer.phone || '',
        buyer_email: customer.email || '',
        buyer_address: customer.address || ''
      }));
    }
  };

  const handleQuotationChange = async (quotationId) => {
    setFormData(prev => ({ ...prev, quotation_id: quotationId }));
    if (!quotationId) return;
    const numericId = parseInt(quotationId, 10);
    if (Number.isNaN(numericId)) return;
    setIsManualTotalOverride(false);
    try {
      setQuotationLoading(true);
      const quotation = await getQuotation(numericId);
      if (!quotation) return;
      setFormData(prev => ({
        ...prev,
        quotation_id: quotationId,
        customer_id: quotation.customer_id ? String(quotation.customer_id) : prev.customer_id,
        buyer_name: quotation.customer_name || prev.buyer_name,
        buyer_phone: quotation.customer_phone || prev.buyer_phone,
        buyer_email: quotation.customer_email || prev.buyer_email,
        buyer_address: quotation.customer_address || prev.buyer_address,
        contract_date: quotation.quotation_date || prev.contract_date,
        currency: quotation.currency || prev.currency,
        payment_terms: quotation.payment_terms || prev.payment_terms,
        delivery_terms: quotation.delivery_terms || prev.delivery_terms,
        warranty_terms: quotation.warranty_terms || prev.warranty_terms,
        notes: quotation.notes || prev.notes
      }));
      if (quotation.customer_id) {
        handleCustomerChange(String(quotation.customer_id));
      }
      const elevatorItems = Array.isArray(quotation.items)
        ? quotation.items.filter(item => item.elevator_type || quotation.order_type === 'elevators')
        : [];
      if (elevatorItems.length > 0) {
        const currentWarrantyPeriod = formData.warranty_period;
        const now = Date.now();
        setElevators(elevatorItems.map((item, index) => ({
          id: now + index,
          elevator_type: item.elevator_type || 'مصعد ركاب',
          model: item.description || '',
          capacity_kg: item.capacity_kg || '',
          capacity_persons: item.capacity_persons || '',
          speed_mps: item.speed_mps || '',
          num_stops: item.stops || item.floors || '',
          travel_height: item.travel_distance || '',
          door_type: item.door_type || 'أوتوماتيكية',
          origin_country: item.origin_country || '',
          quantity: Number(item.qty) || 1,
          emergency_system: 'نعم',
          intercom: 'نعم',
          display_screen: 'نعم',
          other_features: item.specifications || '',
          unit_price: Number(item.unit_price) || 0,
          total_price: (Number(item.unit_price) || 0) * (Number(item.qty) || 1),
          warranty_period: item.warranty_period || currentWarrantyPeriod,
          notes: item.notes || ''
        })));
      }
    } catch (err) {
      console.error('Error loading quotation:', err);
      toastError('تعذر تحميل بيانات عرض السعر المختار');
    } finally {
      setQuotationLoading(false);
    }
  };

  const handleManualTotalChange = (value) => {
    const parsed = parseFloat(value);
    if (Number.isNaN(parsed)) {
      setIsManualTotalOverride(true);
      setFormData(prev => ({ ...prev, total_amount: 0 }));
      return;
    }
    setIsManualTotalOverride(true);
    setFormData(prev => ({ ...prev, total_amount: parsed }));
  };

  const handleResetTotalToAuto = () => {
    setIsManualTotalOverride(false);
    setFormData(prev => ({ ...prev, total_amount: calculatedTotal }));
  };

  const updateElevator = (id, field, value) => {
    setElevators(prevElevators => prevElevators.map(e => {
      if (e.id === id) {
        const updated = { ...e, [field]: value };
        if (field === 'unit_price' || field === 'quantity') {
          updated.total_price = parseFloat(updated.unit_price || 0) * parseFloat(updated.quantity || 1);
        }
        return updated;
      }
      return e;
    }));
  };

  const updatePayment = (id, field, value) => {
    setPayments(prevPayments => prevPayments.map(p => {
      if (p.id === id) {
        const updated = { ...p, [field]: value };
        if (field === 'percentage') {
          updated.amount = (formData.total_amount * parseFloat(value || 0)) / 100;
        } else if (field === 'amount') {
          updated.percentage = formData.total_amount > 0 ? (parseFloat(value || 0) / formData.total_amount) * 100 : 0;
        }
        return updated;
      }
      return p;
    }));
  };

  const handleAddPayment = () => {
    const nextNumber = payments.reduce((max, payment) => Math.max(max, payment.payment_number || 0), 0) + 1;
    setPayments([
      ...payments,
      {
        id: Date.now(),
        payment_number: nextNumber,
        description: '',
        percentage: 0,
        amount: 0,
        due_date: '',
        status: 'PENDING'
      }
    ]);
  };

  const paymentPercentTotal = payments.reduce((sum, payment) => sum + parseFloat(payment.percentage || 0), 0);
  const paymentAmountTotal = payments.reduce((sum, payment) => sum + parseFloat(payment.amount || 0), 0);

  const goToStep = (nextIndex) => {
    setCurrentStepIndex(Math.min(Math.max(nextIndex, 0), steps.length - 1));
  };

  const handleNextStep = () => {
    const currentStepId = steps[currentStepIndex]?.id;
    if (currentStepId && !validateTab(currentStepId)) return;
    goToStep(currentStepIndex + 1);
  };

  const handlePrevStep = () => goToStep(currentStepIndex - 1);

  const handleStepClick = (targetIndex) => {
    if (targetIndex === currentStepIndex) return;
    if (targetIndex < currentStepIndex) {
      goToStep(targetIndex);
      return;
    }
    const currentStepId = steps[currentStepIndex]?.id;
    if (currentStepId && validateTab(currentStepId) && targetIndex === currentStepIndex + 1) {
      goToStep(targetIndex);
    }
  };

  const validateTab = (tabId) => {
    const details = {};
    const tabLabel = steps.find(step => step.id === tabId)?.label || '';

    if (tabId === 'basic') {
      if (!formData.contract_date) details.contract_date = 'يرجى تحديد تاريخ العقد.';
      if (!formData.customer_id) details.customer_id = 'يرجى اختيار العميل.';
      if (formData.start_date && formData.end_date) {
        const startDate = new Date(formData.start_date);
        const endDate = new Date(formData.end_date);
        if (endDate < startDate) {
          details.dates = 'تاريخ الانتهاء يجب أن يكون بعد تاريخ البدء.';
        }
      }
    } else if (tabId === 'parties') {
      if (!formData.buyer_name) details.buyer_name = 'أدخل اسم الجهة المشترية.';
      if (!formData.buyer_phone) details.buyer_phone = 'أدخل هاتف المشتري.';
    } else if (tabId === 'elevators') {
      if (!elevators || elevators.length === 0) {
        details.elevators = 'أضف مصعداً واحداً على الأقل.';
      } else {
        const invalidElevator = elevators.find((el) => {
          const unitPrice = parseFloat(el.unit_price || 0);
          const qty = parseInt(el.quantity, 10);
          return !el.model?.trim() || Number.isNaN(unitPrice) || unitPrice <= 0 || Number.isNaN(qty) || qty <= 0;
        });
        if (invalidElevator) {
          details.elevators = 'تأكد من إدخال الموديل والكمية وسعر الوحدة بشكل صحيح لكل مصعد.';
        }
      }
      const contractTotal = parseFloat(formData.total_amount);
      if (Number.isNaN(contractTotal) || contractTotal <= 0) {
        details.total_amount = 'أدخل قيمة العقد الناتجة عن تسعير المصاعد.';
      }
    } else if (tabId === 'payments') {
      if (!payments || payments.length === 0) {
        details.payments = 'أضف خطة دفعات واضحة.';
      } else {
        const totalPercent = payments.reduce((sum, payment) => sum + (parseFloat(payment.percentage || 0)), 0);
        if (Math.abs(totalPercent - 100) > 0.5) {
          details.payments = 'يجب أن يساوي مجموع نسب الدفعات 100%.';
        }
        const emptyDescription = payments.find(payment => !payment.description?.trim());
        if (emptyDescription) {
          details.payments_description = 'أدخل وصفاً لكل دفعة.';
        }
      }
    } else if (tabId === 'terms') {
      if (!formData.warranty_period) details.warranty_period = 'حدد فترة الضمان.';
      if (!formData.seller_obligations?.trim()) details.seller_obligations = 'اكتب التزامات البائع.';
      if (!formData.buyer_obligations?.trim()) details.buyer_obligations = 'اكتب التزامات المشتري.';
      if (!formData.signed_by_company?.trim()) details.signed_by_company = 'حدد ممثل الشركة الموقّع.';
      if (!formData.signed_by_customer?.trim()) details.signed_by_customer = 'حدد ممثل العميل الموقّع.';
    }

    if (Object.keys(details).length > 0) {
      const detailMessages = Object.values(details).filter(Boolean);
      setErrors({
        tab: tabId,
        global: detailMessages[0] || `أكمل بيانات قسم ${tabLabel} قبل المتابعة.`,
        details
      });
      return false;
    }

    setErrors(prev => (prev?.tab === tabId ? {} : prev));
    return true;
  };

  const handleSubmit = async () => {
    for (let i = 0; i < stepOrder.length; i++) {
      const tabId = stepOrder[i];
      if (!validateTab(tabId)) {
        goToStep(i);
        return;
      }
    }
    setLoading(true);
    try {
      const contractData = {
        ...formData,
        customer_id: parseInt(formData.customer_id, 10),
        quotation_id: formData.quotation_id ? parseInt(formData.quotation_id, 10) : null,
        total_amount: parseFloat(formData.total_amount),
        start_date: formData.start_date || null,
        end_date: formData.end_date || null,
        payment_schedule: formData.payment_schedule || null,
        payment_terms: formData.payment_terms || null,
        delivery_terms: formData.delivery_terms || null,
        warranty_terms: formData.warranty_terms || null,
        terms_and_conditions: formData.terms_and_conditions || null,
        penalties_clause: formData.penalties_clause || null,
        termination_clause: formData.termination_clause || null,
        elevators: elevators.map(e => ({
          elevator_type: e.elevator_type,
          model: e.model,
          capacity_kg: e.capacity_kg ? parseInt(e.capacity_kg) : null,
          capacity_persons: e.capacity_persons ? parseInt(e.capacity_persons) : null,
          speed_mps: e.speed_mps ? parseFloat(e.speed_mps) : null,
          num_stops: e.num_stops ? parseInt(e.num_stops) : null,
          travel_height: e.travel_height ? parseFloat(e.travel_height) : null,
          door_type: e.door_type,
          origin_country: e.origin_country,
          quantity: parseInt(e.quantity || 1),
          emergency_system: e.emergency_system,
          intercom: e.intercom,
          display_screen: e.display_screen,
          other_features: e.other_features,
          unit_price: parseFloat(e.unit_price || 0),
          total_price: parseFloat(e.total_price || 0),
          warranty_period: e.warranty_period,
          notes: e.notes
        })),
        payments: payments.map(p => ({
          payment_number: p.payment_number,
          description: p.description,
          percentage: parseFloat(p.percentage || 0),
          amount: parseFloat(p.amount || 0),
          due_date: p.due_date || null,
          status: p.status
        }))
      };
      if (isEditMode) {
        await updateContract(id, contractData);
        success('تم تحديث العقد بنجاح!');
      } else {
        await createContract(contractData);
        success('تم حفظ العقد بنجاح!');
      }
      navigate('/contracts');
    } catch (err) {
      console.error('Error saving contract:', err);
      toastError('حدث خطأ أثناء حفظ العقد: ' + (err.response?.data?.detail || err.message));
    } finally {
      setLoading(false);
    }
  };

  if (loadingData) {
    return (
      <Layout>
        <div className="p-6 max-w-7xl mx-auto flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">جارٍ تحميل البيانات...</p>
          </div>
        </div>
      </Layout>
    );
  }

  const currentStep = steps[currentStepIndex] || steps[0];
  const currentStepId = currentStep.id;
  const isLastStep = currentStepIndex === steps.length - 1;
  const progressPercent = Math.round(((currentStepIndex + 1) / steps.length) * 100);
  const currencyLabel = formData.currency || 'USD';
  const formattedTotal = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currencyLabel,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(Number(formData.total_amount || 0));
  const formattedAutoTotal = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currencyLabel,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(Number(calculatedTotal || 0));

  const renderStepContent = () => {
    switch (currentStepId) {
      case 'basic':
        return (
          <section className="bg-white border border-slate-200 rounded-3xl shadow-sm p-6 space-y-6">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
              <div>
                <h2 className="text-xl font-semibold text-slate-900 flex items-center gap-2">
                  <FileText className="w-5 h-5 text-indigo-600" />
                  المعلومات الأساسية
                </h2>
                <p className="text-sm text-slate-500 mt-1">تاريخ العقد، العميل، العملة، والمجموع.</p>
              </div>
              {isManualTotalOverride && (
                <button
                  type="button"
                  onClick={handleResetTotalToAuto}
                  className="text-xs text-indigo-700 underline"
                >
                  إعادة حساب المجموع تلقائياً
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  تاريخ العقد <span className="text-red-500">*</span>
                </label>
                <Input
                  type="date"
                  value={formData.contract_date}
                  onChange={(e) => setFormData({ ...formData, contract_date: e.target.value })}
                  className="w-full"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  تاريخ بدء التنفيذ
                </label>
                <Input
                  type="date"
                  value={formData.start_date}
                  onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                  className="w-full"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  تاريخ الانتهاء المتوقع
                </label>
                <Input
                  type="date"
                  value={formData.end_date}
                  onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                  className="w-full"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  العميل <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.customer_id}
                  onChange={(e) => handleCustomerChange(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-indigo-500 focus:border-indigo-500 bg-white"
                >
                  <option value="">اختر العميل</option>
                  {customers.map(c => (
                    <option key={c.id} value={String(c.id)}>{c.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  عرض السعر المرتبط
                </label>
                <select
                  value={formData.quotation_id}
                  onChange={(e) => handleQuotationChange(e.target.value)}
                  disabled={quotationLoading}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-indigo-500 focus:border-indigo-500 disabled:bg-slate-50 bg-white"
                >
                  <option value="">اختر عرض السعر (اختياري)</option>
                  {quotations.map(q => (
                    <option key={q.id} value={String(q.id)}>{q.quotation_no} - {q.customer_name}</option>
                  ))}
                </select>
                {quotationLoading && (
                  <p className="text-xs text-indigo-600 mt-1">جاري استيراد بيانات العرض...</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  حالة العقد
                </label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-indigo-500 focus:border-indigo-500 bg-white"
                >
                  <option value="DRAFT">مسودة</option>
                  <option value="ACTIVE">ساري</option>
                  <option value="COMPLETED">مكتمل</option>
                  <option value="TERMINATED">منتهي</option>
                  <option value="CANCELLED">ملغي</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  نوع العقد
                </label>
                <select
                  value={formData.contract_type}
                  onChange={(e) => setFormData({ ...formData, contract_type: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-indigo-500 focus:border-indigo-500 bg-white"
                >
                  <option value="SALES">عقد بيع</option>
                  <option value="SERVICE">عقد خدمة</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  العملة
                </label>
                <select
                  value={formData.currency}
                  onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-indigo-500 focus:border-indigo-500 bg-white"
                >
                  <option value="USD">دولار أمريكي (USD)</option>
                  <option value="IQD">دينار عراقي (IQD)</option>
                </select>
              </div>
              <div>
                <div className="flex items-center justify-between text-sm font-medium text-slate-700 mb-2">
                  <span>قيمة العقد الإجمالية</span>
                  {isManualTotalOverride && <span className="text-xs text-slate-500">إدخال يدوي</span>}
                </div>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.total_amount}
                  onChange={(e) => handleManualTotalChange(e.target.value)}
                  className={`w-full ${isManualTotalOverride ? '' : 'bg-slate-50'}`}
                />
                {isManualTotalOverride && (
                  <p className="text-xs text-slate-500 mt-1">
                    المجموع التلقائي الحالي: {formattedAutoTotal}
                  </p>
                )}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                المبلغ كتابةً
              </label>
              <Input
                value={formData.total_amount_text}
                onChange={(e) => setFormData({ ...formData, total_amount_text: e.target.value })}
                placeholder="مثال: فقط ثلاثون ألف دولار أمريكي لا غير"
                className="w-full"
              />
            </div>
          </section>
        );
      case 'parties':
        return (
          <section className="bg-white border border-slate-200 rounded-3xl shadow-sm p-6 space-y-6">
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-green-600" />
              <h2 className="text-xl font-semibold text-slate-900">الأطراف والمشروع</h2>
            </div>

            <div className="space-y-5">
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Building2 className="w-5 h-5 text-indigo-600" />
                  <h3 className="text-md font-semibold text-slate-900">بيانات البائع (الطرف الأول)</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-slate-700 mb-2">اسم الشركة</label>
                    <Input
                      value={formData.seller_company_name}
                      onChange={(e) => setFormData({ ...formData, seller_company_name: e.target.value })}
                      className="w-full"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">الهاتف</label>
                    <Input
                      value={formData.seller_phone}
                      onChange={(e) => setFormData({ ...formData, seller_phone: e.target.value })}
                      className="w-full"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">البريد الإلكتروني</label>
                    <Input
                      type="email"
                      value={formData.seller_email}
                      onChange={(e) => setFormData({ ...formData, seller_email: e.target.value })}
                      className="w-full"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-slate-700 mb-2">العنوان</label>
                    <textarea
                      value={formData.seller_address}
                      onChange={(e) => setFormData({ ...formData, seller_address: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-indigo-500 focus:border-indigo-500"
                      rows="2"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">اسم ممثل البائع</label>
                    <Input
                      value={formData.seller_authorized_person}
                      readOnly
                      className="w-full bg-slate-50"
                    />
                    <p className="text-xs text-slate-500 mt-1">يتم جلب الاسم تلقائياً من حساب المستخدم الحالي.</p>
                  </div>
                </div>
              </div>

              <div className="border-t border-slate-200 pt-4">
                <div className="flex items-center gap-2 mb-3">
                  <Users className="w-5 h-5 text-green-600" />
                  <h3 className="text-md font-semibold text-slate-900">بيانات المشتري (الطرف الثاني)</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">الاسم</label>
                    <Input
                      value={formData.buyer_name}
                      onChange={(e) => setFormData({ ...formData, buyer_name: e.target.value })}
                      className="w-full"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">الممثل عن المشتري</label>
                    <Input
                      value={formData.buyer_representative}
                      onChange={(e) => setFormData({ ...formData, buyer_representative: e.target.value })}
                      className="w-full"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">الهاتف</label>
                    <Input
                      value={formData.buyer_phone}
                      onChange={(e) => setFormData({ ...formData, buyer_phone: e.target.value })}
                      className="w-full"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">البريد الإلكتروني</label>
                    <Input
                      type="email"
                      value={formData.buyer_email}
                      onChange={(e) => setFormData({ ...formData, buyer_email: e.target.value })}
                      className="w-full"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-slate-700 mb-2">العنوان</label>
                    <textarea
                      value={formData.buyer_address}
                      onChange={(e) => setFormData({ ...formData, buyer_address: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-indigo-500 focus:border-indigo-500"
                      rows="2"
                    />
                  </div>
                </div>
              </div>

              <div className="border-t border-slate-200 pt-4">
                <div className="flex items-center gap-2 mb-3">
                  <Building2 className="w-5 h-5 text-purple-600" />
                  <h3 className="text-md font-semibold text-slate-900">بيانات المشروع</h3>
                </div>
                <div className="grid grid-cols-1 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">اسم المشروع (اختياري)</label>
                    <Input
                      value={formData.project_name}
                      onChange={(e) => setFormData({ ...formData, project_name: e.target.value })}
                      placeholder="مثال: مشروع المدينة الذهبية"
                      className="w-full"
                    />
                  </div>
                </div>
              </div>
            </div>
          </section>
        );
      case 'elevators':
        return (
          <section className="bg-white border border-slate-200 rounded-3xl shadow-sm p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold text-slate-900 flex items-center gap-2">
                  <Package className="w-5 h-5 text-indigo-600" />
                  مواصفات المصاعد
                </h2>
                <p className="text-sm text-slate-500 mt-1">محاذاة مع أسلوب صفحة عرض السعر لتقليل التشتت.</p>
                <p className="text-xs text-slate-500 mt-1">
                  عدد المصاعد: {elevators.length} — المجموع الحالي: {formattedAutoTotal}
                </p>
              </div>
              <Button
                onClick={() => setElevators([...elevators, {
                  id: Date.now(),
                  elevator_type: 'ركاب',
                  model: '',
                  capacity_kg: 630,
                  capacity_persons: 8,
                  speed_mps: 1.0,
                  num_stops: 6,
                  travel_height: '',
                  door_type: 'أوتوماتيك',
                  origin_country: 'الصين',
                  quantity: 1,
                  emergency_system: 'نعم',
                  intercom: 'نعم',
                  display_screen: 'نعم',
                  other_features: '',
                  unit_price: 0,
                  total_price: 0,
                  warranty_period: '12 شهر',
                  notes: ''
                }])}
                className="flex items-center gap-2 bg-green-600 hover:bg-green-700"
              >
                <Plus className="w-4 h-4" />
                إضافة مصعد
              </Button>
            </div>

            <div className="space-y-4">
              {elevators.map((elevator, index) => (
                <div key={elevator.id} className="border border-slate-200 rounded-2xl p-4 bg-slate-50">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-semibold">
                        {index + 1}
                      </div>
                      <div>
                        <p className="text-sm text-slate-500">مصعد</p>
                        <p className="text-base font-semibold text-slate-900">#{index + 1}</p>
                      </div>
                    </div>
                    {elevators.length > 1 && (
                      <Button
                        onClick={() => setElevators(elevators.filter(e => e.id !== elevator.id))}
                        variant="outline"
                        size="sm"
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">نوع المصعد</label>
                      <select
                        value={elevator.elevator_type}
                        onChange={(e) => updateElevator(elevator.id, 'elevator_type', e.target.value)}
                        className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-white"
                      >
                        <option value="ركاب">ركاب</option>
                        <option value="خدمي">خدمي</option>
                        <option value="بنورامي">بنورامي</option>
                        <option value="مستشفى">مستشفى</option>
                        <option value="بضائع">بضائع</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">الموديل</label>
                      <Input
                        value={elevator.model}
                        onChange={(e) => updateElevator(elevator.id, 'model', e.target.value)}
                        placeholder="مثال: SC200/200"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">الحمولة (كغم)</label>
                      <Input
                        type="number"
                        value={elevator.capacity_kg}
                        onChange={(e) => updateElevator(elevator.id, 'capacity_kg', e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">عدد الأشخاص</label>
                      <Input
                        type="number"
                        value={elevator.capacity_persons}
                        onChange={(e) => updateElevator(elevator.id, 'capacity_persons', e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">السرعة (م/ث)</label>
                      <Input
                        type="number"
                        step="0.1"
                        value={elevator.speed_mps}
                        onChange={(e) => updateElevator(elevator.id, 'speed_mps', e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">عدد التوقفات</label>
                      <Input
                        type="number"
                        value={elevator.num_stops}
                        onChange={(e) => updateElevator(elevator.id, 'num_stops', e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">ارتفاع الخدمة (م)</label>
                      <Input
                        type="number"
                        value={elevator.travel_height}
                        onChange={(e) => updateElevator(elevator.id, 'travel_height', e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">نوع الأبواب</label>
                      <select
                        value={elevator.door_type}
                        onChange={(e) => updateElevator(elevator.id, 'door_type', e.target.value)}
                        className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-white"
                      >
                        <option value="أوتوماتيك">أوتوماتيك</option>
                        <option value="نصف أوتوماتيك">نصف أوتوماتيك</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">بلد المنشأ</label>
                      <Input
                        value={elevator.origin_country}
                        onChange={(e) => updateElevator(elevator.id, 'origin_country', e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">الكمية</label>
                      <Input
                        type="number"
                        value={elevator.quantity}
                        onChange={(e) => updateElevator(elevator.id, 'quantity', e.target.value)}
                        min="1"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">سعر الوحدة</label>
                      <Input
                        type="number"
                        value={elevator.unit_price}
                        onChange={(e) => updateElevator(elevator.id, 'unit_price', e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">السعر الإجمالي</label>
                      <Input
                        type="number"
                        value={elevator.total_price}
                        readOnly
                        className="bg-slate-100"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">فترة الضمان</label>
                      <Input
                        value={elevator.warranty_period}
                        onChange={(e) => updateElevator(elevator.id, 'warranty_period', e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">نظام إنقاذ طوارئ</label>
                      <select
                        value={elevator.emergency_system}
                        onChange={(e) => updateElevator(elevator.id, 'emergency_system', e.target.value)}
                        className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-white"
                      >
                        <option value="نعم">نعم</option>
                        <option value="لا">لا</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">إنتركم</label>
                      <select
                        value={elevator.intercom}
                        onChange={(e) => updateElevator(elevator.id, 'intercom', e.target.value)}
                        className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-white"
                      >
                        <option value="نعم">نعم</option>
                        <option value="لا">لا</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">شاشة عرض</label>
                      <select
                        value={elevator.display_screen}
                        onChange={(e) => updateElevator(elevator.id, 'display_screen', e.target.value)}
                        className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-white"
                      >
                        <option value="نعم">نعم</option>
                        <option value="لا">لا</option>
                      </select>
                    </div>
                    <div className="md:col-span-3">
                      <label className="block text-sm font-medium text-slate-700 mb-2">ملحقات أخرى</label>
                      <textarea
                        value={elevator.other_features}
                        onChange={(e) => updateElevator(elevator.id, 'other_features', e.target.value)}
                        className="w-full px-3 py-2 border border-slate-200 rounded-xl"
                        rows="2"
                        placeholder="أي ميزات إضافية..."
                      />
                    </div>
                    <div className="md:col-span-3">
                      <label className="block text-sm font-medium text-slate-700 mb-2">ملاحظات</label>
                      <textarea
                        value={elevator.notes}
                        onChange={(e) => updateElevator(elevator.id, 'notes', e.target.value)}
                        className="w-full px-3 py-2 border border-slate-200 rounded-xl"
                        rows="2"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        );
      case 'payments':
        return (
          <section className="bg-white border border-slate-200 rounded-3xl shadow-sm p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold text-slate-900 flex items-center gap-2">
                  <DollarSign className="w-5 h-5 text-indigo-600" />
                  جدول الدفعات
                </h2>
                <p className="text-sm text-slate-500 mt-1">نفس تصميم عرض السعر لسهولة القراءة.</p>
                <p className="text-xs text-slate-500 mt-1">
                  المجموع: {paymentPercentTotal.toFixed(2)}% — عدد الدفعات: {payments.length}
                </p>
              </div>
              <Button
                onClick={handleAddPayment}
                className="flex items-center gap-2 bg-green-600 hover:bg-green-700"
              >
                <Plus className="w-4 h-4" />
                إضافة دفعة
              </Button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-slate-50">
                    <th className="border border-slate-200 px-4 py-2 text-center text-sm font-semibold text-slate-700">#</th>
                    <th className="border border-slate-200 px-4 py-2 text-right text-sm font-semibold text-slate-700">الوصف</th>
                    <th className="border border-slate-200 px-4 py-2 text-center text-sm font-semibold text-slate-700 w-32">النسبة %</th>
                    <th className="border border-slate-200 px-4 py-2 text-center text-sm font-semibold text-slate-700 w-40">المبلغ</th>
                    <th className="border border-slate-200 px-4 py-2 text-center text-sm font-semibold text-slate-700 w-40">تاريخ الاستحقاق</th>
                    <th className="border border-slate-200 px-4 py-2 text-center text-sm font-semibold text-slate-700 w-32">الحالة</th>
                    <th className="border border-slate-200 px-4 py-2 text-center text-sm font-semibold text-slate-700 w-24">إجراءات</th>
                  </tr>
                </thead>
                <tbody>
                  {payments.map((payment) => (
                    <tr key={payment.id} className="hover:bg-slate-50">
                      <td className="border border-slate-200 px-4 py-2 text-center text-sm text-slate-700">
                        {payment.payment_number}
                      </td>
                      <td className="border border-slate-200 px-4 py-2">
                        <Input
                          value={payment.description}
                          onChange={(e) => updatePayment(payment.id, 'description', e.target.value)}
                          placeholder="وصف الدفعة"
                          className="w-full text-sm"
                        />
                      </td>
                      <td className="border border-slate-200 px-4 py-2">
                        <Input
                          type="number"
                          value={payment.percentage}
                          onChange={(e) => updatePayment(payment.id, 'percentage', e.target.value)}
                          className="w-full text-center text-sm"
                        />
                      </td>
                      <td className="border border-slate-200 px-4 py-2">
                        <Input
                          type="number"
                          value={payment.amount}
                          onChange={(e) => updatePayment(payment.id, 'amount', e.target.value)}
                          className="w-full text-center text-sm"
                        />
                      </td>
                      <td className="border border-slate-200 px-4 py-2">
                        <Input
                          type="date"
                          value={payment.due_date}
                          onChange={(e) => updatePayment(payment.id, 'due_date', e.target.value)}
                          className="w-full text-sm"
                        />
                      </td>
                      <td className="border border-slate-200 px-4 py-2">
                        <select
                          value={payment.status}
                          onChange={(e) => updatePayment(payment.id, 'status', e.target.value)}
                          className="w-full px-2 py-1 border border-slate-200 rounded-lg text-sm bg-white"
                        >
                          <option value="PENDING">لم تُدفع</option>
                          <option value="PAID">مدفوعة</option>
                          <option value="LATE">متأخرة</option>
                          <option value="CANCELLED">ملغاة</option>
                        </select>
                      </td>
                      <td className="border border-slate-200 px-4 py-2 text-center">
                        {payments.length > 1 && (
                          <Button
                            onClick={() => setPayments(payments.filter(p => p.id !== payment.id))}
                            variant="outline"
                            size="sm"
                            className="text-red-600"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                  <tr className="bg-indigo-50 font-semibold">
                    <td colSpan="2" className="border border-slate-200 px-4 py-2 text-right text-slate-700">
                      المجموع
                    </td>
                    <td className="border border-slate-200 px-4 py-2 text-center text-indigo-700">
                      {paymentPercentTotal.toFixed(2)}%
                    </td>
                    <td className="border border-slate-200 px-4 py-2 text-center text-indigo-700">
                      {paymentAmountTotal.toLocaleString()}
                    </td>
                    <td colSpan="3" className="border border-slate-200"></td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="space-y-2">
              {paymentPercentTotal > 100 && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-800">
                  ⚠️ مجموع النسب يتجاوز 100% (الحالي: {paymentPercentTotal.toFixed(2)}%)
                </div>
              )}
              {paymentPercentTotal > 0 && paymentPercentTotal < 100 && (
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-sm text-blue-800">
                  المجموع الحالي {paymentPercentTotal.toFixed(2)}% — تبقّى {(100 - paymentPercentTotal).toFixed(2)}%
                </div>
              )}
            </div>
          </section>
        );
      case 'terms':
        return (
          <section className="bg-white border border-slate-200 rounded-3xl shadow-sm p-6 space-y-6">
            <div className="flex items-center gap-2">
              <FileSignature className="w-5 h-5 text-indigo-600" />
              <h2 className="text-xl font-semibold text-slate-900">المراجعة والشروط</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 space-y-2">
                <div className="flex items-center justify-between text-sm text-slate-600">
                  <span>تاريخ العقد</span>
                  <span className="font-semibold text-slate-900">{formData.contract_date || '-'}</span>
                </div>
                <div className="flex items-center justify-between text-sm text-slate-600">
                  <span>العميل</span>
                  <span className="font-semibold text-slate-900">{formData.buyer_name || 'لم يحدد'}</span>
                </div>
                <div className="flex items-center justify-between text-sm text-slate-600">
                  <span>نوع العقد</span>
                  <span className="font-semibold text-slate-900">{formData.contract_type === 'SERVICE' ? 'خدمة' : 'بيع'}</span>
                </div>
                <div className="flex items-center justify-between text-sm text-slate-600">
                  <span>قيمة العقد</span>
                  <span className="font-semibold text-indigo-700">{formattedTotal}</span>
                </div>
                <div className="flex items-center justify-between text-sm text-slate-600">
                  <span>عدد الدفعات</span>
                  <span className="font-semibold text-slate-900">{payments.length}</span>
                </div>
                <div className="flex items-center justify-between text-sm text-slate-600">
                  <span>عدد المصاعد</span>
                  <span className="font-semibold text-slate-900">{elevators.length}</span>
                </div>
              </div>
              <div className="rounded-2xl border border-indigo-100 bg-indigo-50 p-4 space-y-2 text-indigo-900">
                <div className="flex items-center justify-between text-sm">
                  <span>نسبة الدفعات الكلية</span>
                  <span className="font-semibold">{paymentPercentTotal.toFixed(2)}%</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span>الإجمالي المحسوب تلقائياً</span>
                  <span className="font-semibold">{formattedAutoTotal}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span>نوع الإدخال</span>
                  <span className="font-semibold">{isManualTotalOverride ? 'يدوي' : 'تلقائي'}</span>
                </div>
                {isManualTotalOverride && (
                  <p className="text-xs text-indigo-800">
                    لقد تجاوزت الإجمالي المحسوب تلقائياً من المواصفات. سيتم استخدام الإدخال اليدوي بدلاً من ذلك.
                  </p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  فترة الضمان
                </label>
                <Input
                  value={formData.warranty_period}
                  onChange={(e) => setFormData({ ...formData, warranty_period: e.target.value })}
                  placeholder="مثال: 12 شهر"
                  className="w-full"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  جدول الدفعات التعاقدية
                </label>
                <textarea
                  value={formData.payment_schedule}
                  onChange={(e) => setFormData({ ...formData, payment_schedule: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-indigo-500 focus:border-indigo-500"
                  rows="3"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  شروط الدفع
                </label>
                <textarea
                  value={formData.payment_terms}
                  onChange={(e) => setFormData({ ...formData, payment_terms: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-indigo-500 focus:border-indigo-500"
                  rows="3"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  شروط التسليم
                </label>
                <textarea
                  value={formData.delivery_terms}
                  onChange={(e) => setFormData({ ...formData, delivery_terms: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-indigo-500 focus:border-indigo-500"
                  rows="3"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  شروط الضمان
                </label>
                <textarea
                  value={formData.warranty_terms}
                  onChange={(e) => setFormData({ ...formData, warranty_terms: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-indigo-500 focus:border-indigo-500"
                  rows="3"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                التزامات البائع
              </label>
              <textarea
                value={formData.seller_obligations}
                onChange={(e) => setFormData({ ...formData, seller_obligations: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-indigo-500 focus:border-indigo-500"
                rows="5"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                التزامات المشتري
              </label>
              <textarea
                value={formData.buyer_obligations}
                onChange={(e) => setFormData({ ...formData, buyer_obligations: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-indigo-500 focus:border-indigo-500"
                rows="5"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                يشمل السعر
              </label>
              <textarea
                value={formData.price_includes}
                onChange={(e) => setFormData({ ...formData, price_includes: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-indigo-500 focus:border-indigo-500"
                rows="4"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                شروط عامة
              </label>
              <textarea
                value={formData.general_terms}
                onChange={(e) => setFormData({ ...formData, general_terms: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-indigo-500 focus:border-indigo-500"
                rows="5"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                الشروط والأحكام التعاقدية
              </label>
              <textarea
                value={formData.terms_and_conditions}
                onChange={(e) => setFormData({ ...formData, terms_and_conditions: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-indigo-500 focus:border-indigo-500"
                rows="5"
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-slate-200">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  الموقع من قبل الشركة
                </label>
                <Input
                  value={formData.signed_by_company}
                  onChange={(e) => setFormData({ ...formData, signed_by_company: e.target.value })}
                  placeholder="اسم الموقع من قبل الشركة"
                  className="w-full"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  الموقع من قبل العميل
                </label>
                <Input
                  value={formData.signed_by_customer}
                  onChange={(e) => setFormData({ ...formData, signed_by_customer: e.target.value })}
                  placeholder="اسم الموقع من قبل العميل"
                  className="w-full"
                />
              </div>
            </div>
          </section>
        );
      default:
        return null;
    }
  };


  return (
    <Layout>
      <div className="p-6 max-w-7xl mx-auto space-y-6" dir="rtl">
        <div className="rounded-3xl bg-gradient-to-l from-slate-900 via-slate-800 to-indigo-700 text-white shadow-xl px-6 md:px-10 py-8">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="space-y-2">
              <p className="text-indigo-200 text-xs uppercase tracking-[0.35em]">Sanad Elevators</p>
              <h1 className="text-3xl font-bold">إنشاء أو تعديل عقد مصعد جديد</h1>
              <p className="text-indigo-100 max-w-2xl text-sm leading-6">
                أدخل تفاصيل العقد بدقة. يمكنك إضافة المصاعد والدفعات والشروط والأحكام.
              </p>
              <div className="flex flex-wrap gap-3 text-xs text-indigo-100">
                <span className="px-3 py-1 rounded-full bg-white/10 border border-white/20">الحالة: {formData.status}</span>
                <span className="px-3 py-1 rounded-full bg-white/10 border border-white/20">النوع: {formData.contract_type === 'SERVICE' ? 'خدمة' : 'بيع'}</span>
                <span className="px-3 py-1 rounded-full bg-white/10 border border-white/20">العملة: {currencyLabel}</span>
              </div>
            </div>
            <div className="flex flex-wrap gap-3">
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate('/contracts')}
                className="flex items-center gap-2 border-white/40 text-white hover:bg-white/10"
              >
                <ArrowLeft className="w-4 h-4" />
                عودة
              </Button>
              <Button
                onClick={isLastStep ? handleSubmit : handleNextStep}
                disabled={loading}
                className="flex items-center gap-2 bg-white text-slate-900 hover:bg-slate-100"
              >
                <Save className="w-4 h-4" />
                {loading ? 'جاري الحفظ...' : (isLastStep ? (isEditMode ? 'حفظ التعديلات' : 'حفظ العقد') : 'التالي')}
              </Button>
            </div>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-3xl shadow-sm p-4 space-y-4">
          <div className="flex items-center gap-3">
            <div className="text-xs text-slate-500">الخطوة {currentStepIndex + 1} من {steps.length}</div>
            <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-l from-indigo-600 to-purple-600" style={{ width: `${progressPercent}%` }}></div>
            </div>
            <div className="text-xs text-slate-500">{progressPercent}%</div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-2">
            {steps.map((step, idx) => {
              const StepIcon = step.icon;
              const isActive = idx === currentStepIndex;
              const isDone = idx < currentStepIndex;
              const isLocked = idx > currentStepIndex + 1;
              return (
                <button
                  key={step.id}
                  type="button"
                  onClick={() => handleStepClick(idx)}
                  disabled={isLocked}
                  className={`rounded-2xl border px-4 py-3 text-right transition ${isActive ? 'border-indigo-600 bg-indigo-50 text-indigo-900 shadow-sm' : isDone ? 'border-emerald-200 bg-emerald-50 text-emerald-900' : 'border-slate-200 bg-white text-slate-700'} ${isLocked ? 'opacity-60 cursor-not-allowed' : ''}`}
                >
                  <div className="flex items-center gap-2">
                    {isDone ? <CheckCircle2 className="w-4 h-4" /> : <StepIcon className="w-4 h-4" />}
                    <span className="font-semibold text-sm">{step.label}</span>
                  </div>
                  <p className="text-xs mt-1 text-slate-500">{step.description}</p>
                </button>
              );
            })}
          </div>
        </div>

        {errors?.global && (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-4 text-red-800 text-sm">
            {errors.global}
          </div>
        )}

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
          <div className="space-y-6">
            {renderStepContent()}

            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
              <Button
                variant="outline"
                onClick={handlePrevStep}
                disabled={currentStepIndex === 0}
                className="flex items-center gap-2"
              >
                <ArrowLeft className="w-4 h-4 rotate-180" />
                السابق
              </Button>
              <div className="flex flex-wrap gap-3">
                <Button variant="outline" onClick={() => navigate('/contracts')}>
                  إلغاء والعودة
                </Button>
                <Button
                  onClick={isLastStep ? handleSubmit : handleNextStep}
                  disabled={loading}
                  className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700"
                >
                  <Save className="w-4 h-4" />
                  {loading
                    ? 'جاري الحفظ...'
                    : isLastStep
                      ? (isEditMode ? 'حفظ التعديلات' : 'حفظ العقد')
                      : 'التالي'}
                </Button>
              </div>
            </div>
          </div>

          <aside className="space-y-4 lg:sticky lg:top-24 h-fit">
            <div className="bg-white border border-slate-200 rounded-3xl shadow-xl p-6 space-y-4">
              <div className="text-xs text-slate-400 uppercase tracking-[0.35em]">الإجمالي التعاقدي</div>
              <h3 className="text-2xl font-bold text-slate-900">{formattedTotal}</h3>
              <p className="text-sm text-slate-500">
                {isManualTotalOverride
                  ? `الإدخال اليدوي للإجمالي. الإجمالي المحسوب تلقائياً هو ${formattedAutoTotal}.`
                  : 'الإجمالي المحسوب تلقائياً من المواصفات.'}
              </p>

              <div className="rounded-2xl bg-slate-50 border border-slate-100 p-4 text-sm space-y-3">
                <div className="flex items-center justify-between text-slate-600">
                  <span>النوع</span>
                  <span className="font-semibold text-slate-800">
                    {formData.contract_type === 'SERVICE' ? 'خدمة' : 'بيع'}
                  </span>
                </div>
                <div className="flex items-center justify-between text-slate-600">
                  <span>الحالة</span>
                  <span className="font-semibold text-slate-800">{formData.status}</span>
                </div>
                <div className="flex items-center justify-between text-slate-600">
                  <span>العملة</span>
                  <span className="font-semibold text-slate-800">{currencyLabel}</span>
                </div>
                <div className="flex items-center justify-between text-indigo-700 font-semibold text-base border-t border-slate-200 pt-3">
                  <span>عدد الدفعات</span>
                  <span>{payments.length}</span>
                </div>
              </div>

              <div className="rounded-2xl bg-indigo-50 border border-indigo-100 p-4 text-sm text-indigo-800 space-y-2">
                <div className="flex items-center justify-between">
                  <span>نسبة الدفعات الكلية</span>
                  <span className="font-semibold">{paymentPercentTotal.toFixed(2)}%</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>مجموع الدفعات</span>
                  <span className="font-semibold">{paymentAmountTotal.toLocaleString()}</span>
                </div>
              </div>

              <div className="flex flex-col gap-3">
                <Button onClick={isLastStep ? handleSubmit : handleNextStep} disabled={loading} className="w-full">
                  <span className="flex items-center justify-center gap-2">
                    <Save className="w-4 h-4" />
                    {loading
                      ? 'جاري الحفظ...'
                      : isLastStep
                        ? (isEditMode ? 'حفظ التعديلات' : 'حفظ العقد')
                        : 'التالي'}
                  </span>
                </Button>
                <Button variant="outline" onClick={() => navigate('/contracts')}>
                  إلغاء والعودة
                </Button>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </Layout>
  );
};
export default ElevatorContractNew;
