import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Select, SelectItem } from '../components/ui/select';
import { createQuotation, getCustomers, getProducts, getSalesOrders } from '../services/api';
import {
  Building,
  CalendarDays,
  Loader2,
  Package,
  ShieldCheck,
  UserRound,
  Plus,
  Trash2
} from 'lucide-react';

const initialElevatorDetails = {
  model: 'SC200/200',
  modelYear: '2020',
  capacityKg: '2000 كجم (2 طن)',
  capacityPersons: '',
  travelHeight: '60 متر',
  autoLeveling: 'السكشن يحس تلقائياً',
  ropesCount: '',
  cabinSize: '(3.2 × 1.5 × 2.5) متر',
  sectionSize: '(65 × 65 × 150)',
  motorInfo: '(KW11 × 3) عدد المحركات',
  boardSystem: 'AC Drive',
  elevatorSpeed: '0.46 م/دقيقة',
  cableCarrier: 'حاملة كيبل متحركة',
  speed: '1.0 م/ث',
  stops: '',
  cabinFinish: '',
  controlSystem: ''
};

const elevatorDetailFields = [
  { key: 'model', label: 'النوع / الكود', placeholder: 'SC200/200' },
  { key: 'modelYear', label: 'الموديل', placeholder: '2020' },
  { key: 'capacityKg', label: 'الحمولة', placeholder: '2000 كجم (2 طن)' },
  { key: 'travelHeight', label: 'الارتفاع', placeholder: '60 متر' },
  { key: 'autoLeveling', label: 'نظام الاتزان', placeholder: 'السكشن يحس تلقائياً' },
  { key: 'ropesCount', label: 'عدد الرباط', placeholder: '' },
  { key: 'cabinSize', label: 'قياس الكابينة', placeholder: '(3.2 × 1.5 × 2.5) متر' },
  { key: 'sectionSize', label: 'قياس السكشن', placeholder: '(65 × 65 × 150)' },
  { key: 'motorInfo', label: 'المحركات', placeholder: '(KW11 × 3) عدد المحركات' },
  { key: 'boardSystem', label: 'نظام البورد', placeholder: 'AC Drive' },
  { key: 'elevatorSpeed', label: 'سرعة المصعد', placeholder: '0.46 م/دقيقة' },
  { key: 'speed', label: 'السرعة (م/ث)', placeholder: '1.0 م/ث' },
  { key: 'cableCarrier', label: 'حاملة الكيبل', placeholder: 'حاملة كيبل متحركة' },
  { key: 'controlSystem', label: 'نظام التحكم', placeholder: '' },
  { key: 'cabinFinish', label: 'تشطيب الكابينة', placeholder: '' },
  { key: 'stops', label: 'عدد المحطات', placeholder: '' },
  { key: 'capacityPersons', label: 'عدد الأشخاص', placeholder: '' }
];

const elevatorDetailKeys = elevatorDetailFields.map((field) => field.key);

const formatCurrency = (value, currency = 'USD') => {
  const amount = Number(value || 0);
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(Number.isFinite(amount) ? amount : 0);
};

const normalizeLower = (value) => (value || '').toString().toLowerCase();
const normalizeUpper = (value) => (value || '').toString().toUpperCase();

const collectTags = (product) => {
  if (!product) return [];
  const tags = [];
  if (Array.isArray(product?.tags)) tags.push(...product.tags);
  if (Array.isArray(product?.labels)) tags.push(...product.labels);
  return tags;
};

const productPriceValue = (product) => {
  const price = Number(product?.price_usd ?? product?.price ?? 0);
  return Number.isFinite(price) ? price : 0;
};

const sanitizeOptionId = (value) => value.replace(/[^a-zA-Z0-9-_]/g, '-');

const isElevatorProduct = (product) => {
  if (!product) return false;
  const type = normalizeLower(product.type) || normalizeLower(product.category);
  if (type.includes('elevator') || type.includes('lift')) return true;

  const tags = collectTags(product).map(normalizeLower);
  if (tags.some((tag) => tag.includes('elevator') || tag.includes('lift'))) {
    return true;
  }

  const sku = normalizeUpper(product.sku);
  const name = normalizeUpper(product.name);
  return (
    sku.includes('ELEVATOR') ||
    sku.includes('LIFT') ||
    name.includes('ELEVATOR') ||
    name.includes('LIFT') ||
    name.includes('مصعد')
  );
};

const detailKeyAliases = {
  model: ['model', 'code', 'product_code', 'elevator_code', 'sku'],
  modelYear: ['modelYear', 'model_year', 'year'],
  capacityKg: ['capacityKg', 'capacity_kg', 'capacity', 'load_kg'],
  capacityPersons: ['capacityPersons', 'capacity_persons', 'persons', 'passengers'],
  travelHeight: ['travelHeight', 'travel_height', 'height', 'max_height'],
  autoLeveling: ['autoLeveling', 'auto_leveling', 'leveling'],
  ropesCount: ['ropesCount', 'ropes_count', 'ropes'],
  cabinSize: ['cabinSize', 'cabin_size', 'cabin_dimensions'],
  sectionSize: ['sectionSize', 'section_size', 'shaft_size', 'shaft_dimensions'],
  motorInfo: ['motorInfo', 'motor_info', 'motors'],
  boardSystem: ['boardSystem', 'board_system', 'control_board'],
  elevatorSpeed: ['elevatorSpeed', 'elevator_speed'],
  cableCarrier: ['cableCarrier', 'cable_carrier'],
  speed: ['speed', 'nominal_speed'],
  stops: ['stops', 'stations'],
  cabinFinish: ['cabinFinish', 'cabin_finish', 'car_finish'],
  controlSystem: ['controlSystem', 'control_system', 'controller']
};

const tryReadDetailValue = (source, key) => {
  if (!source) return undefined;
  if (source[key] != null && source[key] !== '') return source[key];
  const aliases = detailKeyAliases[key] || [];
  for (const alias of aliases) {
    if (source[alias] != null && source[alias] !== '') {
      return source[alias];
    }
    const camelAlias = alias.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
    if (source[camelAlias] != null && source[camelAlias] !== '') {
      return source[camelAlias];
    }
  }
  return undefined;
};

const extractElevatorDetailsFromProduct = (product) => {
  if (!product) return {};
  const potentialSources = [
    product.elevator_details,
    product.elevatorDetails,
    product.metadata?.elevator_details,
    product.metadata?.elevatorDetails,
    product.metadata,
    product.details,
    product.specifications_json,
    product
  ].filter(Boolean);

  const result = {};
  Object.keys(initialElevatorDetails).forEach((key) => {
    for (const source of potentialSources) {
      const value = tryReadDetailValue(source, key);
      if (value != null && value !== '') {
        result[key] = value;
        break;
      }
    }
  });

  // Attempt to derive capacity if only numeric values exist
  if (!result.capacityKg && typeof product.capacity === 'number') {
    result.capacityKg = `${product.capacity} كجم`;
  }
  if (!result.capacityPersons && typeof product.passengers === 'number') {
    result.capacityPersons = `${product.passengers} أشخاص`;
  }

  return result;
};

const QuotationCreate = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [customers, setCustomers] = useState([]);
  const [products, setProducts] = useState([]);
  const [formError, setFormError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [formData, setFormData] = useState({
    customer_id: '',
    quotation_date: new Date().toISOString().split('T')[0],
    valid_until: '',
    status: 'DRAFT',
    order_type: 'items',
    currency: 'USD',
    tax_percent: 0,
    discount_percent: 0,
    discount_amount: 0,
    exchange_rate: 1,
    contact_person: '',
    contact_email: '',
    contact_phone: '',
    notes: '',
    terms_and_conditions: '',
    elevator_sales_order_id: '',
    elevator_cost: 0
  });

  const [quoteItem, setQuoteItem] = useState({
    product_id: '',
    description: '',
    specifications: '',
    qty: 1,
    unit_price: 0
  });
  const [selectedElevatorId, setSelectedElevatorId] = useState('');

  const [elevatorDetails, setElevatorDetails] = useState(initialElevatorDetails);

  // Terms and Conditions table
  const [termsConditions, setTermsConditions] = useState([
    { id: 1, term: 'ضمان شهر واحد', editable: true },
    { id: 2, term: 'أجور النقل إلى موقع العمل - على عاتق البائع', editable: true },
    { id: 3, term: 'أجور التركيب - على عاتق البائع', editable: true },
    { id: 4, term: 'توفير كرين للتركيب والتفريغ - على عاتق المشتري', editable: true }
  ]);

  // Payment milestones
  const [paymentMilestones, setPaymentMilestones] = useState([]);

  // Elevators from inventory
  const [elevators, setElevators] = useState([]);
  const [elevatorInputType, setElevatorInputType] = useState('from_inventory');

  const mergeElevatorDetails = (details, { overwrite = false } = {}) => {
    if (!details || Object.keys(details).length === 0) return;
    setElevatorDetails((prev) => {
      const next = { ...prev };
      Object.entries(details).forEach(([key, value]) => {
        if (value == null || value === '') return;
        if (overwrite || !next[key] || next[key] === initialElevatorDetails[key]) {
          next[key] = value;
        }
      });
      return next;
    });
  };

  const handleQuoteItemChange = (field, value) => {
    setQuoteItem((prev) => ({
      ...prev,
      [field]: field === 'qty' || field === 'unit_price' ? value : value
    }));
  };

  const elevatorProducts = useMemo(
    () => (products || []).filter((product) => isElevatorProduct(product)),
    [products]
  );

  const availableElevatorProducts = useMemo(() => {
    return elevatorProducts.filter((product) => {
      const stockFields = [
        product?.available_quantity,
        product?.availableQuantity,
        product?.quantity,
        product?.qty,
        product?.stock
      ]
        .map((value) => Number(value))
        .filter((value) => Number.isFinite(value));

      if (stockFields.length === 0) {
        // إذا لم تتوفر معلومات مخزون، نعتبر المنتج متاحًا لتجنب إخفائه.
        return true;
      }

      return stockFields.some((value) => value > 0);
    });
  }, [elevatorProducts]);

  const fieldOptions = useMemo(() => {
    const map = new Map();

    availableElevatorProducts.forEach((product) => {
      const details = extractElevatorDetailsFromProduct(product);
      elevatorDetailKeys.forEach((key) => {
        const raw = details[key];
        if (raw == null) return;
        const value = String(raw).trim();
        if (!value) return;
        if (!map.has(key)) {
          map.set(key, new Set());
        }
        map.get(key)?.add(value);
      });
    });

    const result = {};
    elevatorDetailKeys.forEach((key) => {
      const set = map.get(key);
      const values = set ? Array.from(set) : [];
      const defaultValue = String(initialElevatorDetails[key] || '').trim();
      if (defaultValue && !values.includes(defaultValue)) {
        values.push(defaultValue);
      }
      result[key] = values.sort((a, b) => a.localeCompare(b, 'ar', { sensitivity: 'base' }));
    });
    return result;
  }, [availableElevatorProducts]);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const [customersResult, productsResult, elevatorsResult] = await Promise.all([
          getCustomers(0, 100),
          getProducts(),
          getSalesOrders()
        ]);
        setCustomers(customersResult?.data || customersResult || []);
        setProducts(Array.isArray(productsResult) ? productsResult : []);

        // Load elevators from sales orders
        const elevatorsData = Array.isArray(elevatorsResult) ? elevatorsResult : (elevatorsResult?.data || []);
        const elevatorOrders = elevatorsData.filter(
          order => order.order_type === 'elevators' &&
          (order.status === 'CONFIRMED' || order.status === 'FULFILLED')
        );
        setElevators(elevatorOrders);
      } catch (err) {
        console.error('Error loading quotation prerequisites:', err);
        setFormError('حدث خطأ أثناء تحميل البيانات المطلوبة. الرجاء المحاولة مرة أخرى.');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const handleFormChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleElevatorDetailChange = (field, value) => {
    setElevatorDetails((prev) => ({ ...prev, [field]: value }));
    if (selectedElevatorId) {
      setSelectedElevatorId('');
    }
  };

  const handleOrderTypeChange = (type) => {
    setFormData((prev) => ({ ...prev, order_type: type }));
  };

  const handleElevatorSelection = (value) => {
    setSelectedElevatorId(value);
    if (!value) {
      setQuoteItem((prev) => ({
        ...prev,
        product_id: '',
        unit_price: prev.unit_price,
        description: prev.description
      }));
      return;
    }
    const product = availableElevatorProducts.find((item) => String(item?.id) === String(value));
    if (product) {
      setQuoteItem((prev) => ({
        ...prev,
        product_id: product.id ? String(product.id) : '',
        description: product.name || prev.description || 'حل مصعد متكامل',
        specifications: product.description || product.specifications || prev.specifications || '',
        unit_price: productPriceValue(product) || prev.unit_price,
        qty: prev.qty || 1
      }));
      const extractedDetails = extractElevatorDetailsFromProduct(product);
      mergeElevatorDetails(extractedDetails, { overwrite: true });
    }
  };

  const summary = useMemo(() => {
    const qty = Number(quoteItem.qty) || 0;
    const unit = Number(quoteItem.unit_price) || 0;
    const subtotal = qty * unit;
    const discountPercent = Number(formData.discount_percent) || 0;
    const discountAmount = Number(formData.discount_amount) || 0;
    const taxPercent = Number(formData.tax_percent) || 0;

    const afterPercent = subtotal * (1 - discountPercent / 100);
    const afterDiscount = Math.max(afterPercent - discountAmount, 0);
    const taxValue = afterDiscount * (taxPercent / 100);
    const total = afterDiscount + taxValue;

    return { subtotal, afterDiscount, taxValue, total };
  }, [quoteItem.qty, quoteItem.unit_price, formData.discount_amount, formData.discount_percent, formData.tax_percent]);

  const resetFeedback = () => {
    setFormError('');
    setSuccessMessage('');
  };

  // Handler functions for terms and conditions
  const addTermCondition = () => {
    const newId = termsConditions.length > 0 ? Math.max(...termsConditions.map(t => t.id)) + 1 : 1;
    setTermsConditions([...termsConditions, { id: newId, term: '', editable: true }]);
  };

  const updateTermCondition = (id, value) => {
    setTermsConditions(termsConditions.map(t => t.id === id ? { ...t, term: value } : t));
  };

  const removeTermCondition = (id) => {
    setTermsConditions(termsConditions.filter(t => t.id !== id));
  };

  // Handler functions for payment milestones
  const addMilestone = () => {
    const newId = paymentMilestones.length > 0 ? Math.max(...paymentMilestones.map(m => m.id)) + 1 : 1;
    setPaymentMilestones([...paymentMilestones, {
      id: newId,
      description: '',
      payment_amount: 0,
      payment_percent: 0
    }]);
  };

  const updateMilestone = (id, field, value) => {
    setPaymentMilestones(paymentMilestones.map(m => {
      if (m.id !== id) return m;

      const updated = { ...m, [field]: value };

      // Auto-calculate percentage when amount changes
      if (field === 'payment_amount' && summary.total > 0) {
        updated.payment_percent = ((parseFloat(value) || 0) / summary.total * 100).toFixed(2);
      }

      // Auto-calculate amount when percentage changes
      if (field === 'payment_percent' && summary.total > 0) {
        updated.payment_amount = ((parseFloat(value) || 0) / 100 * summary.total).toFixed(2);
      }

      return updated;
    }));
  };

  const removeMilestone = (id) => {
    setPaymentMilestones(paymentMilestones.filter(m => m.id !== id));
  };

  // Calculation functions
  const calculateTotalPaymentPercentage = () => {
    return paymentMilestones.reduce((sum, m) => sum + parseFloat(m.payment_percent || 0), 0).toFixed(2);
  };

  const calculateTotalPaymentAmount = () => {
    return paymentMilestones.reduce((sum, m) => sum + parseFloat(m.payment_amount || 0), 0).toFixed(2);
  };

  // Handler for elevator selection from inventory
  const handleElevatorSelectionFromInventory = (salesOrderId) => {
    if (!salesOrderId) {
      setFormData(prev => ({ ...prev, elevator_sales_order_id: '', elevator_cost: 0 }));
      return;
    }

    const elevator = elevators.find(e => String(e.id) === String(salesOrderId));
    if (elevator) {
      // Extract elevator details from sales order
      const item = elevator.items?.[0];
      if (item) {
        setQuoteItem(prev => ({
          ...prev,
          unit_price: item.unit_price_usd || 0,
          description: `مصعد - ${item.product?.name || 'غير محدد'}`
        }));

        // Update elevator details if available
        const details = {
          model: item.product?.sku || '',
          capacityKg: `${item.product?.capacity || ''} كجم`,
          travelHeight: `${item.product?.height || ''} متر`,
          ...extractElevatorDetailsFromProduct(item.product)
        };
        mergeElevatorDetails(details, { overwrite: true });
      }

      setFormData(prev => ({
        ...prev,
        elevator_sales_order_id: salesOrderId,
        elevator_cost: elevator.total_amount_usd || 0
      }));
    }
  };

  const elevatorDetailsBlock = () => {
    const lines = elevatorDetailFields
      .map(({ key, label }) => {
        const value = elevatorDetails[key];
        return value ? `${label}: ${value}` : null;
      })
      .filter(Boolean);

    return lines.length ? `تفاصيل المصعد:\n${lines.join('\n')}` : '';
  };

  const paymentMilestonesBlock = () => {
    if (paymentMilestones.length === 0) return '';

    const lines = paymentMilestones.map((m, index) => {
      const desc = m.description || `الدفعة ${index + 1}`;
      const amount = formatCurrency(m.payment_amount || 0, currency);
      const percent = Number(m.payment_percent || 0).toFixed(2);
      return `${desc}: ${amount} (${percent}%)`;
    });

    return `خطة الدفع:\n${lines.join('\n')}`;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    resetFeedback();

    if (!formData.customer_id) {
      setFormError('يرجى اختيار العميل قبل إنشاء عرض السعر.');
      return;
    }

    const preparedItem = {
      product_id: quoteItem.product_id ? Number(quoteItem.product_id) : null,
      description: (quoteItem.description || '').trim(),
      specifications: quoteItem.specifications ? quoteItem.specifications.trim() : null,
      qty: Number(quoteItem.qty) || 0,
      unit_price: Number(quoteItem.unit_price) || 0,
      discount_percent: 0,
      discount_amount: 0,
      uom: 'unit'
    };

    if (!preparedItem.description) {
      setFormError('يرجى كتابة وصف البند (مثال: حل مصعد متكامل، توريد وتركيب مصعد، إلخ)');
      return;
    }

    if (preparedItem.qty <= 0) {
      setFormError('الكمية يجب أن تكون أكبر من الصفر.');
      return;
    }

    const compiledTermsList = termsConditions
      .map((item) => (item.term || '').trim())
      .filter(Boolean);
    const termsText = compiledTermsList.join('\n').trim();

    const payload = {
      customer_id: Number(formData.customer_id),
      quotation_date: formData.quotation_date,
      valid_until: formData.valid_until || null,
      status: formData.status || 'DRAFT',
      order_type: formData.order_type || 'items',
      contact_person: formData.contact_person || null,
      contact_email: formData.contact_email || null,
      contact_phone: formData.contact_phone || null,
      currency: formData.currency || 'USD',
      exchange_rate: Number(formData.exchange_rate) || 1,
      tax_percent: Number(formData.tax_percent) || 0,
      discount_percent: Number(formData.discount_percent) || 0,
      discount_amount: Number(formData.discount_amount) || 0,
      notes: formData.notes || null,
      terms_and_conditions: termsText || formData.terms_and_conditions || null,
      payment_terms: null,
      items: [preparedItem]
    };

    const details = elevatorDetailsBlock();
    if (details) {
      payload.notes = payload.notes ? `${payload.notes}\n\n${details}` : details;
    }

    const paymentPlan = paymentMilestonesBlock();
    if (paymentPlan) {
      payload.payment_terms = paymentPlan;
    }

    try {
      setSaving(true);
      const created = await createQuotation(payload);
      setSuccessMessage('تم إنشاء عرض السعر بنجاح.');
      setTimeout(() => {
        if (created?.id) {
          navigate(`/quotations/${created.id}`);
        } else {
          navigate('/quotations');
        }
      }, 800);
    } catch (err) {
      console.error('Error creating quotation:', err);
      const apiMessage =
        err?.response?.data?.detail ||
        err?.message ||
        'حدث خطأ أثناء إنشاء عرض السعر. حاول مرة أخرى.';
      setFormError(apiMessage);
    } finally {
      setSaving(false);
    }
  };

  const currency = formData.currency || 'USD';

  return (
    <Layout>
      <div
        className="rounded-3xl bg-gradient-to-l from-slate-900 via-slate-800 to-indigo-700 text-white shadow-xl px-10 py-8 mb-8"
        dir="rtl"
      >
        <p className="text-indigo-200 text-xs uppercase tracking-[0.4em]">Sanad Elevators</p>
        <h1 className="mt-3 text-3xl font-bold">إنشاء عرض سعر مصاعد</h1>
        <p className="mt-2 text-indigo-100 max-w-2xl text-sm leading-6">
          لوحة واحدة تسهّل عليك إدخال معلومات العميل، مواصفات المصعد، تفاصيل البنود، ورؤية
          المبلغ الإجمالي مباشرة.
        </p>
      </div>

      {loading ? (
        <div className="bg-white border border-slate-200 rounded-3xl shadow-lg p-16 text-center">
          <Loader2 className="w-12 h-12 text-indigo-600 animate-spin mx-auto mb-4" />
          <p className="text-lg font-semibold text-slate-700">جاري تجهيز النموذج...</p>
        </div>
      ) : (
        <form
          onSubmit={handleSubmit}
          className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_340px]"
          dir="rtl"
        >
          <div className="space-y-7">
            {(formError || successMessage) && (
              <div
                className={`rounded-2xl border px-6 py-4 text-sm font-medium ${
                  formError
                    ? 'border-rose-200 bg-rose-50 text-rose-700'
                    : 'border-emerald-200 bg-emerald-50 text-emerald-700'
                }`}
              >
                {formError || successMessage}
              </div>
            )}

            <section className="bg-white border border-slate-200 rounded-3xl shadow-sm p-6 space-y-6">
              <header className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                  <h2 className="text-xl font-semibold text-slate-900 flex items-center gap-2">
                    <UserRound className="w-5 h-5 text-indigo-600" />
                    بيانات العميل والمشروع
                  </h2>
                  <p className="text-sm text-slate-500 mt-1">
                    اختر العميل وحدد مسؤول التواصل وتواريخ العرض.
                  </p>
                </div>
                <div className="inline-flex bg-slate-100 rounded-xl p-1 text-xs font-semibold">
                  <button
                    type="button"
                    onClick={() => handleOrderTypeChange('items')}
                    className={`px-4 py-2 rounded-[10px] transition ${
                      formData.order_type === 'items'
                        ? 'bg-indigo-600 text-white shadow'
                        : 'text-slate-600'
                    }`}
                  >
                    عرض معدات
                  </button>
                  <button
                    type="button"
                    onClick={() => handleOrderTypeChange('elevators')}
                    className={`px-4 py-2 rounded-[10px] transition ${
                      formData.order_type === 'elevators'
                        ? 'bg-indigo-600 text-white shadow'
                        : 'text-slate-600'
                    }`}
                  >
                    حل مصعد متكامل
                  </button>
                </div>
              </header>

              <div className="grid gap-5 md:grid-cols-2">
                <div className="space-y-2">
                  <Label className="text-sm font-semibold text-slate-700">العميل</Label>
                  <Select
                    value={formData.customer_id}
                    onChange={(e) => handleFormChange('customer_id', e.target.value)}
                  >
                    <option value="">اختر العميل</option>
                    {customers.map((customer) => (
                      <SelectItem key={customer.id} value={customer.id}>
                        {customer.name}
                      </SelectItem>
                    ))}
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-semibold text-slate-700">الشخص المسؤول</Label>
                  <Input
                    value={formData.contact_person}
                    onChange={(e) => handleFormChange('contact_person', e.target.value)}
                    placeholder="اسم الشخص المسؤول"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-semibold text-slate-700">هاتف التواصل</Label>
                  <Input
                    value={formData.contact_phone}
                    onChange={(e) => handleFormChange('contact_phone', e.target.value)}
                    placeholder="رقم الهاتف"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-semibold text-slate-700">البريد الإلكتروني</Label>
                  <Input
                    type="email"
                    value={formData.contact_email}
                    onChange={(e) => handleFormChange('contact_email', e.target.value)}
                    placeholder="example@email.com"
                  />
                </div>
              </div>

              <div className="grid gap-5 md:grid-cols-2">
                <div className="space-y-2">
                  <Label className="text-sm font-semibold text-slate-700">تاريخ العرض</Label>
                  <div className="relative">
                    <CalendarDays className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                    <Input
                      type="date"
                      className="pl-10"
                      value={formData.quotation_date}
                      onChange={(e) => handleFormChange('quotation_date', e.target.value)}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-semibold text-slate-700">صالح حتى</Label>
                  <div className="relative">
                    <ShieldCheck className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                    <Input
                      type="date"
                      className="pl-10"
                      value={formData.valid_until}
                      onChange={(e) => handleFormChange('valid_until', e.target.value)}
                    />
                  </div>
                </div>
              </div>
            </section>

            <section className="bg-white border border-slate-200 rounded-3xl shadow-sm p-6 space-y-5">
              <header>
                <h2 className="text-xl font-semibold text-slate-900 flex items-center gap-2">
                  <Building className="w-5 h-5 text-indigo-600" />
                  تفاصيل المصعد
                </h2>
                <p className="text-sm text-slate-500 mt-1">
                  اختر المصعد من المخزون أو أدخل التفاصيل يدوياً
                </p>
              </header>

              {/* Elevator input type toggle */}
              <div className="flex gap-4 mb-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="elevatorInputType"
                    value="from_inventory"
                    checked={elevatorInputType === 'from_inventory'}
                    onChange={(e) => setElevatorInputType(e.target.value)}
                    className="w-4 h-4 text-indigo-600"
                  />
                  <span className="text-sm font-medium text-slate-700">اختيار من المخزون</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="elevatorInputType"
                    value="manual"
                    checked={elevatorInputType === 'manual'}
                    onChange={(e) => setElevatorInputType(e.target.value)}
                    className="w-4 h-4 text-indigo-600"
                  />
                  <span className="text-sm font-medium text-slate-700">إدخال يدوي</span>
                </label>
              </div>

              {/* Elevator selection from inventory */}
              {elevatorInputType === 'from_inventory' && elevators.length > 0 && (
                <div className="space-y-2 mb-4">
                  <Label className="text-sm font-semibold text-slate-700">اختر المصعد من المخزون</Label>
                  <Select
                    value={formData.elevator_sales_order_id || ''}
                    onChange={(e) => handleElevatorSelectionFromInventory(e.target.value)}
                    className="md:max-w-sm"
                  >
                    <option value="">اختر المصعد</option>
                    {elevators.map((elevator) => (
                      <SelectItem key={elevator.id} value={String(elevator.id)}>
                        {elevator.so_no || `طلب #${elevator.id}`} - {formatCurrency(elevator.total_amount_usd || 0, 'USD')}
                      </SelectItem>
                    ))}
                  </Select>
                  <p className="text-xs text-slate-500">
                    سيتم تعبئة التفاصيل تلقائياً من المصعد المختار
                  </p>
                </div>
              )}

              {elevatorInputType === 'manual' && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-4">
                  <p className="text-sm text-amber-800">
                    ⚠️ الإدخال اليدوي: هذا المصعد لن يكون مرتبطاً بالمخزن
                  </p>
                </div>
              )}

              {/* Show product selection if available */}
              {availableElevatorProducts.length > 0 && (
                <div className="space-y-2">
                  <Label className="text-sm font-semibold text-slate-700">تحميل مواصفات مصعد متوفر</Label>
                  <Select
                    value={selectedElevatorId}
                    onChange={(e) => handleElevatorSelection(e.target.value)}
                    className="md:max-w-sm"
                  >
                    <option value="">اختر المصعد</option>
                    {availableElevatorProducts.map((product) => (
                      <SelectItem key={product.id} value={String(product.id)}>
                        {product.name}{' '}
                        {productPriceValue(product)
                          ? '— ' + formatCurrency(productPriceValue(product), currency)
                          : ''}
                      </SelectItem>
                    ))}
                  </Select>
                  <p className="text-xs text-slate-500">
                    الاختيار يملأ الحقول أدناه تلقائيًا ويمكنك تعديل أي قيمة يدويًا.
                  </p>
                </div>
              )}

              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                {elevatorDetailFields.map(({ key, label, placeholder }) => {
                  const options = fieldOptions[key] || [];
                  const currentValue = elevatorDetails[key] || '';
                  const datalistId = `elevator-${sanitizeOptionId(key)}-options`;
                  return (
                    <div key={key} className="space-y-2">
                      <Label className="text-sm font-semibold text-slate-700">{label}</Label>
                      <Input
                        value={currentValue}
                        onChange={(e) => handleElevatorDetailChange(key, e.target.value)}
                        placeholder={placeholder}
                        list={options.length ? datalistId : undefined}
                      />
                      {options.length > 0 && (
                        <datalist id={datalistId}>
                          {options.map((option) => (
                            <option key={option} value={option} />
                          ))}
                        </datalist>
                      )}
                    </div>
                  );
                })}
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label className="text-sm font-semibold text-slate-700">
                    عنوان البند <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    value={quoteItem.description}
                    onChange={(e) => handleQuoteItemChange('description', e.target.value)}
                    placeholder="اختر من القائمة أو اكتب يدوياً"
                    className={!quoteItem.description ? 'border-red-300' : ''}
                    list="elevator-descriptions"
                  />
                  <datalist id="elevator-descriptions">
                    <option value="حل مصعد متكامل" />
                    <option value="مصعد خدمي" />
                    <option value="مصعد ركاب" />
                    <option value="مصعد بضائع" />
                    <option value="مصعد بانورامي" />
                    <option value="توريد وتركيب مصعد" />
                    <option value="توريد وتركيب مصعد خدمي" />
                    <option value="توريد وتركيب مصعد ركاب" />
                    <option value="صيانة شهرية" />
                    <option value="صيانة سنوية" />
                    <option value="قطع غيار مصعد" />
                  </datalist>
                  <p className="text-xs text-slate-500">
                    هذا النص سيظهر في عرض السعر والفاتورة
                  </p>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-semibold text-slate-700">تفاصيل إضافية للبند</Label>
                  <textarea
                    value={quoteItem.specifications}
                    onChange={(e) => handleQuoteItemChange('specifications', e.target.value)}
                    className="h-24 w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="اكتب التفاصيل التي ترغب بظهورها مع البند"
                  />
                </div>
              </div>
            </section>


            <section className="bg-white border border-slate-200 rounded-3xl shadow-sm p-6 space-y-6">
              <header>
                <h2 className="text-xl font-semibold text-slate-900 flex items-center gap-2">
                  <Package className="w-5 h-5 text-indigo-600" />
                  الملاحظات
                </h2>
              </header>
              <div className="space-y-2">
                <Label className="text-sm font-semibold text-slate-700">ملاحظات</Label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => handleFormChange('notes', e.target.value)}
                  className="h-28 w-full rounded-2xl border border-slate-200 bg-white px-3 py-3 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="اكتب أي توضيحات إضافية للعميل..."
                />
              </div>
            </section>

            {/* Terms and Conditions Table */}
            <section className="bg-white border border-slate-200 rounded-3xl shadow-sm p-6 space-y-6">
              <header className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-semibold text-slate-900 flex items-center gap-2">
                    <ShieldCheck className="w-5 h-5 text-indigo-600" />
                    الشروط والأحكام
                  </h2>
                  <p className="text-sm text-slate-500 mt-1">
                    جدول تفاعلي لإدارة شروط العرض
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addTermCondition}
                  className="flex items-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  إضافة شرط
                </Button>
              </header>

              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="bg-slate-50">
                      <th className="text-right p-3 text-sm font-semibold text-slate-700 border border-slate-200">
                        #
                      </th>
                      <th className="text-right p-3 text-sm font-semibold text-slate-700 border border-slate-200">
                        الشرط
                      </th>
                      <th className="text-center p-3 text-sm font-semibold text-slate-700 border border-slate-200 w-24">
                        حذف
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {termsConditions.map((term, index) => (
                      <tr key={term.id} className="hover:bg-slate-50">
                        <td className="p-3 text-sm text-slate-700 border border-slate-200">
                          {index + 1}
                        </td>
                        <td className="p-3 border border-slate-200">
                          <textarea
                            value={term.term}
                            onChange={(e) => updateTermCondition(term.id, e.target.value)}
                            className="w-full min-h-[60px] rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            placeholder="اكتب الشرط..."
                          />
                        </td>
                        <td className="p-3 text-center border border-slate-200">
                          <button
                            type="button"
                            onClick={() => removeTermCondition(term.id)}
                            className="text-red-600 hover:text-red-800 transition"
                          >
                            <Trash2 className="w-5 h-5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {termsConditions.length === 0 && (
                  <div className="text-center py-8 text-slate-500">
                    لا توجد شروط. انقر "إضافة شرط" لإضافة شرط جديد.
                  </div>
                )}
              </div>
            </section>

            {/* Payment Schedule */}
            <section className="bg-white border border-slate-200 rounded-3xl shadow-sm p-6 space-y-6">
              <header className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-semibold text-slate-900 flex items-center gap-2">
                    <CalendarDays className="w-5 h-5 text-indigo-600" />
                    خطة الدفع
                  </h2>
                  <p className="text-sm text-slate-500 mt-1">
                    حدد المعالم والدفعات (يتم الحساب تلقائياً)
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addMilestone}
                  className="flex items-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  إضافة دفعة
                </Button>
              </header>

              {paymentMilestones.length > 0 && (
                <>
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse">
                      <thead>
                        <tr className="bg-slate-50">
                          <th className="text-right p-3 text-sm font-semibold text-slate-700 border border-slate-200">
                            الوصف
                          </th>
                          <th className="text-right p-3 text-sm font-semibold text-slate-700 border border-slate-200 w-40">
                            المبلغ ({currency})
                          </th>
                          <th className="text-right p-3 text-sm font-semibold text-slate-700 border border-slate-200 w-32">
                            النسبة %
                          </th>
                          <th className="text-center p-3 text-sm font-semibold text-slate-700 border border-slate-200 w-24">
                            حذف
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {paymentMilestones.map((milestone) => (
                          <tr key={milestone.id} className="hover:bg-slate-50">
                            <td className="p-3 border border-slate-200">
                              <Input
                                value={milestone.description}
                                onChange={(e) => updateMilestone(milestone.id, 'description', e.target.value)}
                                placeholder="مثال: عند توقيع العقد"
                                className="text-sm"
                              />
                            </td>
                            <td className="p-3 border border-slate-200">
                              <Input
                                type="number"
                                step="0.01"
                                value={milestone.payment_amount}
                                onChange={(e) => updateMilestone(milestone.id, 'payment_amount', e.target.value)}
                                className="text-sm"
                              />
                            </td>
                            <td className="p-3 border border-slate-200">
                              <Input
                                type="number"
                                step="0.01"
                                value={milestone.payment_percent}
                                onChange={(e) => updateMilestone(milestone.id, 'payment_percent', e.target.value)}
                                className="text-sm"
                              />
                            </td>
                            <td className="p-3 text-center border border-slate-200">
                              <button
                                type="button"
                                onClick={() => removeMilestone(milestone.id)}
                                className="text-red-600 hover:text-red-800 transition"
                              >
                                <Trash2 className="w-5 h-5" />
                              </button>
                            </td>
                          </tr>
                        ))}
                        <tr className="bg-indigo-50 font-semibold">
                          <td className="p-3 text-sm text-slate-700 border border-slate-200">
                            الإجمالي
                          </td>
                          <td className="p-3 text-sm text-indigo-700 border border-slate-200">
                            {formatCurrency(calculateTotalPaymentAmount(), currency)}
                          </td>
                          <td className="p-3 text-sm text-indigo-700 border border-slate-200">
                            {calculateTotalPaymentPercentage()}%
                          </td>
                          <td className="p-3 border border-slate-200"></td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  {/* Validation messages */}
                  <div className="space-y-2">
                    {parseFloat(calculateTotalPaymentPercentage()) > 100 && (
                      <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                        <p className="text-sm text-red-800">
                          ⚠️ تحذير: النسب المئوية تتجاوز 100% (المجموع: {calculateTotalPaymentPercentage()}%)
                        </p>
                      </div>
                    )}
                    {parseFloat(calculateTotalPaymentPercentage()) < 100 && parseFloat(calculateTotalPaymentPercentage()) > 0 && (
                      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                        <p className="text-sm text-blue-800">
                          💡 ملاحظة: المتبقي {(100 - parseFloat(calculateTotalPaymentPercentage())).toFixed(2)}%
                        </p>
                      </div>
                    )}
                    <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
                      <p className="text-sm text-slate-700">
                        ℹ️ مجموع الدفعات: {formatCurrency(calculateTotalPaymentAmount(), currency)} من أصل {formatCurrency(summary.total, currency)}
                      </p>
                    </div>
                  </div>
                </>
              )}

              {paymentMilestones.length === 0 && (
                <div className="text-center py-8">
                  <p className="text-slate-500 mb-4">
                    لم يتم إضافة خطة دفع بعد. انقر "إضافة دفعة" لبدء إنشاء خطة الدفع.
                  </p>
                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-right">
                    <p className="text-sm font-semibold text-slate-700 mb-2">مثال على خطة دفع:</p>
                    <ul className="text-sm text-slate-600 space-y-1">
                      <li>• عند توقيع العقد: {formatCurrency(summary.total * 0.2, currency)} (20%)</li>
                      <li>• عند وصول المصعد: {formatCurrency(summary.total * 0.3, currency)} (30%)</li>
                      <li>• بعد التركيب: {formatCurrency(summary.total * 0.5, currency)} (50%)</li>
                    </ul>
                  </div>
                </div>
              )}
            </section>

          </div>

          <aside className="space-y-6">
            <div className="bg-white border border-slate-200 rounded-3xl shadow-xl p-6 space-y-6 sticky top-24">
              <div>
                <div className="text-xs text-slate-400 uppercase tracking-[0.35em]">
                  ملخص العرض
                </div>
                <h3 className="mt-2 text-2xl font-bold text-slate-900">
                  {formatCurrency(summary.total, currency)}
                </h3>
                <p className="text-sm text-slate-500 mt-1">
                  يتم احتساب المبالغ حسب البنود والخصومات والضرائب المدخلة.
                </p>
              </div>

              <div className="rounded-2xl bg-slate-50 border border-slate-100 p-4 text-sm space-y-3">
                <div className="flex items-center justify-between text-slate-600">
                  <span>المجموع الفرعي</span>
                  <span>{formatCurrency(summary.subtotal, currency)}</span>
                </div>
                <div className="flex items-center justify-between text-slate-600">
                  <span>بعد الخصومات</span>
                  <span>{formatCurrency(summary.afterDiscount, currency)}</span>
                </div>
                <div className="flex items-center justify-between text-slate-600">
                  <span>الضريبة</span>
                  <span>{formatCurrency(summary.taxValue, currency)}</span>
                </div>
                <div className="flex items-center justify-between text-indigo-700 font-semibold text-base border-t border-slate-200 pt-3">
                  <span>الإجمالي</span>
                  <span>{formatCurrency(summary.total, currency)}</span>
                </div>
              </div>

              <div className="grid gap-4 text-sm">
                <div className="space-y-2">
                  <Label className="font-semibold text-slate-700">الكمية</Label>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={quoteItem.qty}
                    onChange={(e) => handleQuoteItemChange('qty', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="font-semibold text-slate-700">
                    سعر الوحدة ({currency})
                  </Label>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={quoteItem.unit_price}
                    onChange={(e) => handleQuoteItemChange('unit_price', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="font-semibold text-slate-700">العملة</Label>
                  <Input value={formData.currency} onChange={(e) => handleFormChange('currency', e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label className="font-semibold text-slate-700">سعر الصرف</Label>
                  <Input
                    type="number"
                    step="0.0001"
                    value={formData.exchange_rate}
                    onChange={(e) => handleFormChange('exchange_rate', e.target.value)}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="font-semibold text-slate-700">خصم %</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={formData.discount_percent}
                      onChange={(e) => handleFormChange('discount_percent', e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="font-semibold text-slate-700">خصم ثابت ({currency})</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={formData.discount_amount}
                      onChange={(e) => handleFormChange('discount_amount', e.target.value)}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="font-semibold text-slate-700">الضريبة %</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={formData.tax_percent}
                    onChange={(e) => handleFormChange('tax_percent', e.target.value)}
                  />
                </div>
              </div>

              <div className="flex flex-col gap-3">
                <Button type="submit" disabled={saving} className="w-full">
                  {saving ? (
                    <span className="flex items-center justify-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      جارٍ الحفظ...
                    </span>
                  ) : (
                    'حفظ عرض السعر'
                  )}
                </Button>
                <Button type="button" variant="outline" onClick={() => navigate('/quotations')}>
                  إلغاء والعودة
                </Button>
              </div>
            </div>
          </aside>
        </form>
      )}
    </Layout>
  );
};

export default QuotationCreate;
