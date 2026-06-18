﻿﻿﻿﻿﻿﻿﻿﻿import React, { useState, useEffect, useCallback } from 'react';
import { createPurchaseOrder, updatePurchaseOrder, getSuppliers, getWarehouses, getProducts, ping, getCapitalSummary } from '../services/api';
import { updateInventoryFromPurchaseOrder, validateInventoryUpdateRelaxed } from '../utils/inventoryUpdater';
import Step1BasicInfo from './purchase-order-steps/Step1BasicInfo';
import Step2Items from './purchase-order-steps/Step2Items';
import Step3Payments from './purchase-order-steps/Step3Payments';
import Step4Review from './purchase-order-steps/Step4Review';
import ElevatorForm from './ElevatorForm';
import ContainerForm from './ContainerForm';
import { Card, CardHeader, CardTitle, CardContent } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Select } from './ui/select';
import { Tabs, TabsList, TabsTrigger } from './ui/tabs';
import {
  FileText,
  Package,
  DollarSign,
  CheckCircle,
  Building2,
  Calendar,
  User,
  ClipboardList,
  Plus,
  X,
  ChevronRight,
  ChevronLeft,
  Save
} from 'lucide-react';

// Auto-save key for localStorage
const AUTOSAVE_KEY = 'purchase_order_draft';

const safeStorage = {
  get: (key) => {
    if (typeof window === 'undefined' || !window.localStorage) {
      return null;
    }
    try {
      return window.localStorage.getItem(key);
    } catch (err) {
      console.warn('localStorage.getItem unavailable:', err);
      return null;
    }
  },
  set: (key, value) => {
    if (typeof window === 'undefined' || !window.localStorage) {
      return false;
    }
    try {
      window.localStorage.setItem(key, value);
      return true;
    } catch (err) {
      console.warn('localStorage.setItem failed:', err);
      return false;
    }
  },
  remove: (key) => {
    if (typeof window === 'undefined' || !window.localStorage) {
      return;
    }
    try {
      window.localStorage.removeItem(key);
    } catch (err) {
      console.warn('localStorage.removeItem failed:', err);
    }
  }
};

// Inventory Update Status Messages
const INVENTORY_STATUS_COPY = {
  updating: {
    title: 'جاري تحديث المخزون',
    body: 'جاري تحديث المخزون بناءً على طلب الشراء الجديد. يرجى الانتظار حتى يتم الانتهاء من العملية.'
  },
  success: {
    title: 'تم تحديث المخزون بنجاح',
    body: 'تم تحديث المخزون بنجاح بناءً على طلب الشراء الجديد. يمكنك مراجعة التحديثات في صفحة المخزون.'
  },
  warning: {
    title: 'تحذير أثناء تحديث المخزون',
    body: 'حدث خطأ أثناء تحديث المخزون. يرجى مراجعة التحديثات وتصحيح أي مشاكل قد تكون وقعت.'
  },
  error: {
    title: 'خطأ في تحديث المخزون',
    body: 'حدث خطأ أثناء تحديث المخزون. يرجى إعادة المحاولة في وقت لاحق.'
  }
};

const INVENTORY_STATUS_STYLES = {
  updating: 'border-blue-200 bg-blue-50 text-blue-700',
  success: 'border-green-200 bg-green-50 text-green-700',
  warning: 'border-yellow-200 bg-yellow-50 text-yellow-700',
  error: 'border-red-200 bg-red-50 text-red-700'
};

const generatePurchaseOrderNumber = () => {
  const now = new Date();
  const pad = (value) => value.toString().padStart(2, '0');
  const datePart = String(now.getFullYear()) + pad(now.getMonth() + 1) + pad(now.getDate());
  const timePart = pad(now.getHours()) + pad(now.getMinutes()) + pad(now.getSeconds());
  const msPart = now.getMilliseconds().toString().padStart(3, '0');
  return 'PO-' + datePart + timePart + '-' + msPart;
};

const formatCurrency = (value) =>
  Number(value || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

// Add the missing calculateTotalAmount function
const calculateTotalAmount = (formData, orderType) => {
  if (orderType === 'items' && formData.items) {
    return formData.items.reduce((sum, item) => {
      const quantity = Number(item.quantity) || 0;
      const unitPrice = Number(item.unit_price || item.unitPrice) || 0;
      return sum + (quantity * unitPrice);
    }, 0);
  } else if (orderType === 'elevators' && formData.elevators) {
    return formData.elevators.reduce((sum, elevator) => {
      const price = Number(elevator.total_price || elevator.totalPrice) || 0;
      return sum + price;
    }, 0);
  }
  return 0;
};

const ORDER_STATUS_OPTIONS = [
  { value: 'DRAFT', label: 'مسودة' },
  { value: 'CONFIRMED', label: 'مؤكد' },
  { value: 'RECEIVED', label: 'تم الاستلام' },
  { value: 'CANCELLED', label: 'ملغي' }
];

const RECEIVED_STATUS = 'RECEIVED';

// Steps configuration with Lucide icons
const STEPS = [
  { id: 1, name: 'المعلومات الأساسية', icon: FileText, color: 'from-blue-500 to-cyan-600' },
  { id: 2, name: 'الأصناف والمنتجات', icon: Package, color: 'from-purple-500 to-pink-600' },
  { id: 3, name: 'الدفعات والتكلفة', icon: DollarSign, color: 'from-green-500 to-emerald-600' },
  { id: 4, name: 'المراجعة والحفظ', icon: CheckCircle, color: 'from-orange-500 to-amber-600' }
];

const PurchaseOrderFormImproved = ({ purchaseOrder, onSave, onCancel }) => {
  // Configurable default for advance percentage (via Vite env)
  const DEFAULT_ADVANCE_PERCENT = Math.max(
    0,
    Math.min(100, Number(import.meta?.env?.VITE_DEFAULT_ADVANCE_PERCENT ?? 0))
  );
  const [currentStep, setCurrentStep] = useState(1);
  const defaultType = (purchaseOrder?.elevators?.length || 0) > 0 && (!purchaseOrder?.items || purchaseOrder.items.length === 0)
    ? 'elevators'
    : 'items';

  const [orderType, setOrderType] = useState(defaultType);
  const [poNumber, setPoNumber] = useState(purchaseOrder?.po_no || generatePurchaseOrderNumber());
  const initialOrderDate = purchaseOrder?.po_date || purchaseOrder?.orderDate || new Date().toISOString().split('T')[0];
  const initialDeliveryDate = purchaseOrder?.expected_delivery_date || purchaseOrder?.deliveryDate || '';
  // Default to DRAFT on new orders to avoid premature capital blocking
  const normalizedStatus = purchaseOrder?.status ? purchaseOrder.status.toString().toUpperCase() : 'DRAFT';
  const allowedStatus = ORDER_STATUS_OPTIONS.some((status) => status.value === normalizedStatus) ? normalizedStatus : 'DRAFT';
  const [lastSaved, setLastSaved] = useState(null);

  const [formData, setFormData] = useState({
    orderDate: initialOrderDate,
    deliveryDate: initialDeliveryDate,
    supplierId: purchaseOrder?.supplier_id || purchaseOrder?.supplierId || '',
    supplierName: purchaseOrder?.supplier?.name || purchaseOrder?.supplierName || purchaseOrder?.supplier || '',
    warehouseId: purchaseOrder?.warehouse_id || purchaseOrder?.warehouseId || '',
    warehouseName: purchaseOrder?.warehouse?.name || purchaseOrder?.warehouseName || '',
    status: allowedStatus,
    notes: purchaseOrder?.notes || '',
    items: purchaseOrder?.items || [],
    elevators: purchaseOrder?.elevators || [],
    containers: purchaseOrder?.containers || [],
    totalAmount: purchaseOrder?.totalAmount || Number(purchaseOrder?.total_amount) || 0,
    advancePayment: purchaseOrder?.advancePayment || 0,
    advancePercentage: purchaseOrder?.advancePercentage ?? DEFAULT_ADVANCE_PERCENT,
  });

  const [installments, setInstallments] = useState(purchaseOrder?.installments || [
    {
      id: 1,
      name: 'دفعة مقدمة',
      type: 'advance',
      percentage: DEFAULT_ADVANCE_PERCENT,
      amount: 0,
      dueDate: new Date().toISOString().split('T')[0],
      status: 'pending',
      paidAmount: 0,
      notes: 'لبدء تجهيز الطلب'
    }
  ]);

  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [inventoryUpdateStatus, setInventoryUpdateStatus] = useState(null);

  const [suppliers, setSuppliers] = useState([]);
  const [suppliersLoading, setSuppliersLoading] = useState(false);
  const [warehouses, setWarehouses] = useState([]);
  const [warehousesLoading, setWarehousesLoading] = useState(false);
  const [products, setProducts] = useState([]);
  const [productsLoading, setProductsLoading] = useState(false);
  const [capitalSummary, setCapitalSummary] = useState(null);
  const [capitalSummaryLoading, setCapitalSummaryLoading] = useState(false);
  const [capitalSummaryError, setCapitalSummaryError] = useState(null);
  const [toast, setToast] = useState({ show: false, message: '', type: 'info', actionLabel: null, onAction: null });
  const DRAFT_MAX_AGE_MS = 24 * 60 * 60 * 1000; // 24 hours

  const loadCapitalSummary = useCallback(async () => {
    setCapitalSummaryLoading(true);
    try {
      const data = await getCapitalSummary();
      setCapitalSummary(data);
      setCapitalSummaryError(null);
    } catch (summaryError) {
      console.error('Error loading capital summary:', summaryError);
      setCapitalSummary(null);
      setCapitalSummaryError('خطأ في تحميل ملخص رأس المال');
    } finally {
      setCapitalSummaryLoading(false);
    }
  }, []);

  useEffect(() => {
    const fetchSuppliers = async () => {
      setSuppliersLoading(true);
      try {
        const data = await getSuppliers();
        setSuppliers(Array.isArray(data) ? data : []);
      } catch (fetchError) {
        console.error('Error loading suppliers:', fetchError);
        setSuppliers([]);
      } finally {
        setSuppliersLoading(false);
      }
    };

    const fetchWarehouses = async () => {
      setWarehousesLoading(true);
      try {
        const data = await getWarehouses();
        setWarehouses(Array.isArray(data) ? data : []);
      } catch (fetchError) {
        console.error('Error loading warehouses:', fetchError);
        setWarehouses([]);
      } finally {
        setWarehousesLoading(false);
      }
    };

    const fetchProducts = async () => {
      setProductsLoading(true);
      try {
        const data = await getProducts();
        setProducts(Array.isArray(data) ? data : []);
      } catch (fetchError) {
        console.error('Error loading products:', fetchError);
        setProducts([]);
      } finally {
        setProductsLoading(false);
      }
    };

    fetchSuppliers();
   fetchWarehouses();
   fetchProducts();
    loadCapitalSummary();

    // Load auto-saved data if editing new order
    if (!purchaseOrder) {
      const savedData = safeStorage.get(AUTOSAVE_KEY);
      if (savedData) {
        try {
          const parsed = JSON.parse(savedData);
          const ts = parsed.timestamp ? new Date(parsed.timestamp).getTime() : 0;
          const isRecent = ts > 0 && (Date.now() - ts) <= DRAFT_MAX_AGE_MS;

          if (!isRecent) {
            // Old draft: remove quietly
            safeStorage.remove(AUTOSAVE_KEY);
            return;
          }

          // Keep previous state to allow undo
          const prevState = {
            formData,
            installments,
            currentStep,
            orderType,
          };

          // Restore silently without a blocking confirm dialog
          setFormData(parsed.formData || formData);
          setInstallments(parsed.installments || installments);
          setCurrentStep(parsed.currentStep || 1);
          setOrderType(parsed.orderType || orderType);

          // Show toast with Undo action
          setToast({
            show: true,
            message: '✅ تم استعادة المسودة المحفوظة',
            type: 'success',
            actionLabel: 'تراجع',
            onAction: () => {
              setFormData(prevState.formData);
              setInstallments(prevState.installments);
              setCurrentStep(prevState.currentStep);
              setOrderType(prevState.orderType);
              setToast({ show: true, message: 'تم التراجع عن الاستعادة', type: 'info', actionLabel: null, onAction: null });
              setTimeout(() => setToast({ show: false, message: '', type: 'info', actionLabel: null, onAction: null }), 2000);
            }
          });
          setTimeout(() => setToast({ show: false, message: '', type: 'info', actionLabel: null, onAction: null }), 3000);
        } catch (e) {
          console.error('Failed to restore auto-save:', e);
        }
      }
    }
  }, [purchaseOrder, loadCapitalSummary]);

  // Auto-save functionality - save every 30 seconds
  useEffect(() => {
    if (!purchaseOrder) {
      const autoSaveInterval = setInterval(() => {
        const dataToSave = {
          formData,
          installments,
          currentStep,
          orderType,
          timestamp: new Date().toISOString()
        };
        if (safeStorage.set(AUTOSAVE_KEY, JSON.stringify(dataToSave))) {
          setLastSaved(new Date());
        }
      }, 30000); // 30 seconds

      return () => clearInterval(autoSaveInterval);
    }
  }, [formData, installments, currentStep, orderType, purchaseOrder]);

  // Add the missing isOverBudget state
  const [isOverBudget, setIsOverBudget] = useState(false);

  // Effect to calculate totals when items or elevators change
  useEffect(() => {
    let total = 0;
    
    if (orderType === 'items' && formData.items) {
      total = formData.items.reduce((sum, item) => {
        const quantity = Number(item.quantity) || 0;
        const unitPrice = Number(item.unit_price) || 0;
        return sum + (quantity * unitPrice);
      }, 0);
    } else if (orderType === 'elevators' && formData.elevators) {
      total = formData.elevators.reduce((sum, elevator) => {
        const price = Number(elevator.total_price) || 0;
        return sum + price;
      }, 0);
    }
    
    const advancePayment = (total * (formData.advancePercentage / 100));
    
    setFormData(prev => ({
      ...prev,
      totalAmount: total,
      advancePayment: advancePayment
    }));
    
    // Update installments with calculated amounts
    setInstallments(prev => prev.map(installment => {
      if (installment.type === 'advance') {
        return {
          ...installment,
          amount: advancePayment,
          percentage: formData.advancePercentage
        };
      }
      return installment;
    }));
    
    // Check if over budget
    if (capitalSummary && capitalSummary.available_capital !== undefined) {
      setIsOverBudget(total > capitalSummary.available_capital);
    }
  }, [formData.items, formData.elevators, formData.advancePercentage, orderType, capitalSummary]);

  const stepProgress =
    ((currentStep - 1) / Math.max(STEPS.length - 1, 1)) * 100;
  let formattedLastSaved = null;
  if (lastSaved) {
    try {
      const locale = typeof navigator !== 'undefined' ? navigator.language : 'en-US';
      formattedLastSaved = new Intl.DateTimeFormat(locale, { hour: '2-digit', minute: '2-digit' }).format(lastSaved);
    } catch (err) {
      console.warn('Intl formatting failed, falling back to localeTimeString:', err);
      formattedLastSaved = lastSaved.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
    }
  }

  // Add the missing handleChange function
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  const validateStep = useCallback((stepNumber) => {
    const stepErrors = {};
    const keysToClear = [];

    if (stepNumber === 1) {
      keysToClear.push('supplierId', 'warehouseId');
      if (!formData.supplierId) {
        stepErrors.supplierId = 'الرجاء اختيار المورد قبل المتابعة';
      }
      if (!formData.warehouseId) {
        stepErrors.warehouseId = 'الرجاء اختيار المستودع أو موقع التسليم';
      }
    } else if (stepNumber === 2) {
      keysToClear.push('items');
      if (orderType === 'items') {
        if (!formData.items || formData.items.length === 0) {
          stepErrors.items = 'أضف صنفًا واحدًا على الأقل قبل الانتقال للخطوة التالية';
        } else {
          const rowErrors = formData.items.map((item) => {
            const rowError = {};
            if (!item.product || !item.product.trim()) {
              rowError.product = 'اسم المادة مطلوب';
            }
            if (!item.quantity || Number(item.quantity) <= 0) {
              rowError.quantity = 'أدخل كمية صحيحة';
            }
            if (!item.unitPrice || Number(item.unitPrice) <= 0) {
              rowError.unitPrice = 'أدخل سعر الوحدة';
            }
            return rowError;
          });
          if (rowErrors.some((row) => Object.keys(row).length > 0)) {
            stepErrors.items = rowErrors;
          }
        }
      } else if (!formData.elevators || formData.elevators.length === 0) {
        stepErrors.items = 'أضف مصعدًا واحدًا على الأقل قبل المتابعة';
      }
    } else if (stepNumber === 3) {
      keysToClear.push('totalAmount', 'installments', 'advancePercentage');
      const totalAmountValue = calculateTotalAmount(formData, orderType);
      if (!totalAmountValue || totalAmountValue <= 0) {
        stepErrors.totalAmount = 'يجب إضافة بنود بقيمة صحيحة قبل متابعة خطة الدفعات';
      }
      if (formData.advancePercentage < 0 || formData.advancePercentage > 100) {
        stepErrors.advancePercentage = 'نسبة الدفعة المقدمة يجب أن تكون بين 0% و100%';
      }
      if (!installments || installments.length === 0) {
        stepErrors.installments = 'أضف دفعة واحدة على الأقل';
      } else {
        const totalPercent = installments.reduce(
          (sum, installment) => sum + (parseFloat(installment.percentage) || 0),
          0
        );
        if (totalPercent > 100.0001) {
          stepErrors.installments = 'مجموع نسب الدفعات يجب ألا يتجاوز 100%';
        }
      }
    }

    if (Object.keys(stepErrors).length > 0) {
      setErrors((prev) => ({ ...prev, ...stepErrors }));
      return false;
    }

    if (keysToClear.length > 0) {
      setErrors((prev) => {
        if (!prev || Object.keys(prev).length === 0) {
          return prev;
        }
        const updated = { ...prev };
        let changed = false;
        keysToClear.forEach((key) => {
          if (key in updated) {
            delete updated[key];
            changed = true;
          }
        });
        return changed ? updated : prev;
      });
    }

    return true;
  }, [formData, orderType, installments]);

  const nextStep = () => {
    const isValid = validateStep(currentStep);
    if (isValid && currentStep < STEPS.length) {
      setCurrentStep((prev) => prev + 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else if (!isValid) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep((prev) => prev - 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleSubmit = async () => {
    setError(null);

    for (let step = 1; step <= STEPS.length; step++) {
      if (!validateStep(step)) {
        setCurrentStep(step);
        window.scrollTo({ top: 0, behavior: 'smooth' });
        return;
      }
    }

    setLoading(true);
    
    try {
      
      // Prepare data for submission
      const poData = {
        po_no: poNumber,
        po_date: formData.orderDate,
        expected_delivery_date: formData.deliveryDate,
        supplier_id: formData.supplierId,
        warehouse_id: formData.warehouseId,
        status: formData.status,
        notes: formData.notes,
        total_amount: formData.totalAmount,
        advance_payment: formData.advancePayment,
        advance_percentage: formData.advancePercentage,
        items: orderType === 'items' ? formData.items : [],
        elevators: orderType === 'elevators' ? formData.elevators : [],
        containers: formData.containers || [],
        installments: installments
      };
      
      // Submit the purchase order
      const response = purchaseOrder 
        ? await updatePurchaseOrder(purchaseOrder.id, poData)
        : await createPurchaseOrder(poData);
      
      // Clear auto-saved data
      if (!purchaseOrder) {
        safeStorage.remove(AUTOSAVE_KEY);
      }
      
      // Call the onSave callback
      if (onSave) {
        onSave(response);
      }
    } catch (err) {
      console.error('Error saving purchase order:', err);
      // Try to surface backend-provided reason (e.g., INSUFFICIENT_CAPITAL)
      try {
        const data = err?.response?.data;
        if (data) {
          if (typeof data === 'string') {
            setError(data);
          } else if (typeof data === 'object') {
            const detail = data.detail || data.message || data.error || data.errors;
            if (detail && typeof detail === 'object' && detail.error === 'INSUFFICIENT_CAPITAL') {
              const msg = detail.message || 'الطلب يتجاوز رأس المال المتاح.';
              setError(`${msg}\nيمكنك اختيار الحالة "مسودة" ثم الحفظ لإدراج الطلب دون التأثير على الالتزامات.`);
              return;
            }
            if (typeof detail === 'string') {
              setError(detail);
            } else if (detail && typeof detail === 'object') {
              const msg = detail.message || JSON.stringify(detail);
              setError(msg);
            } else {
              setError('حدث خطأ أثناء حفظ أمر الشراء. يرجى المحاولة مرة أخرى.');
            }
          } else {
            setError('حدث خطأ أثناء حفظ أمر الشراء. يرجى المحاولة مرة أخرى.');
          }
        } else {
          setError('حدث خطأ أثناء حفظ أمر الشراء. يرجى المحاولة مرة أخرى.');
        }
      } catch (_) {
        setError('حدث خطأ أثناء حفظ أمر الشراء. يرجى المحاولة مرة أخرى.');
      }
    } finally {
      setLoading(false);
    }
  };

  // Add the missing helper function

  // Add the missing order type change handler
  const handleOrderTypeChange = (newType) => {
    setOrderType(newType);
    
    // Clear errors when switching types
    setErrors(prev => {
      const newErrors = { ...prev };
      delete newErrors.items;
      delete newErrors.elevators;
      return newErrors;
    });
  };

  // Add the missing item handlers
  const addItem = () => {
    setFormData(prev => ({
      ...prev,
      items: [
        ...prev.items,
        {
          id: Date.now(), // temporary id
          product: '',
          product_sku: '',
          product_category: '',
          quantity: 1,
          unit_price: 0,
          unitPrice: 0,
          total: 0,
          warehouse: '',
          note: ''
        }
      ]
    }));
  };

  const removeItem = (index) => {
    setFormData(prev => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index)
    }));
    
    // Clear item errors when removing
    if (errors.items && Array.isArray(errors.items)) {
      setErrors(prev => {
        const newErrors = { ...prev };
        newErrors.items = newErrors.items.filter((_, i) => i !== index);
        return newErrors;
      });
    }
  };

  const handleItemChange = (index, field, value) => {
    setFormData(prev => {
      const newItems = [...prev.items];
      newItems[index] = { ...newItems[index], [field]: value };
      
      // Calculate total when quantity or unit price changes
      if (field === 'quantity' || field === 'unit_price' || field === 'unitPrice') {
        const quantity = field === 'quantity' ? Number(value) : Number(newItems[index].quantity || 0);
        const unitPrice = (field === 'unit_price' || field === 'unitPrice') ? Number(value) : 
          Number(newItems[index].unit_price || newItems[index].unitPrice || 0);
        newItems[index].total = quantity * unitPrice;
      }
      
      return {
        ...prev,
        items: newItems
      };
    });
    
    // Clear specific item error when user starts typing
    if (errors.items && Array.isArray(errors.items) && errors.items[index] && errors.items[index][field]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        newErrors.items[index] = { ...newErrors.items[index] };
        delete newErrors.items[index][field];
        return newErrors;
      });
    }
  };

  // Add the missing elevator handler
  const handleElevatorsChange = (elevators) => {
    setFormData(prev => ({
      ...prev,
      elevators
    }));
  };

  // Add the missing renderStepContent function
  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <Step1BasicInfo
            formData={formData}
            setFormData={setFormData}
            errors={errors}
            suppliers={suppliers}
            suppliersLoading={suppliersLoading}
            warehouses={warehouses}
            warehousesLoading={warehousesLoading}
            orderType={orderType}
            setOrderType={setOrderType}
            poNumber={poNumber}
            setPoNumber={setPoNumber}
            handleChange={handleChange}
            ORDER_STATUS_OPTIONS={ORDER_STATUS_OPTIONS}
          />
        );
      case 2:
        return orderType === 'items' ? (
          <Step2Items
            formData={formData}
            setFormData={setFormData}
            errors={errors}
            products={products}
            productsLoading={productsLoading}
            warehouses={warehouses}
            warehousesLoading={warehousesLoading}
            handleOrderTypeChange={handleOrderTypeChange}
            addItem={addItem}
            removeItem={removeItem}
            handleItemChange={handleItemChange}
            handleElevatorsChange={handleElevatorsChange}
            formatCurrency={formatCurrency}
            calculateTotalAmount={() => calculateTotalAmount(formData, orderType)}
            orderType={orderType}
          />
        ) : (
          <div className="space-y-4">
            <ElevatorForm
              formData={formData}
              setFormData={setFormData}
              errors={errors}
              handleChange={handleChange}
              elevators={formData.elevators}
              onChange={handleElevatorsChange}
            />
            {typeof errors.items === 'string' && (
              <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-600">
                {errors.items}
              </div>
            )}
          </div>
        );
      case 3:
        return (
          <Step3Payments
            installments={installments}
            setInstallments={setInstallments}
            totalAmount={formData.totalAmount}
            advancePercentage={formData.advancePercentage}
            setFormData={setFormData}
            capitalSummary={capitalSummary}
            capitalSummaryLoading={capitalSummaryLoading}
            capitalSummaryError={capitalSummaryError}
            loadCapitalSummary={loadCapitalSummary}
            handleChange={handleChange}
            formData={formData}
            formatCurrency={formatCurrency}
            errors={errors}
          />
        );
      case 4:
        return (
          <Step4Review
            formData={formData}
            installments={installments}
            orderType={orderType}
            suppliers={suppliers}
            warehouses={warehouses}
            products={products}
            totalAmount={formData.totalAmount}
            advancePayment={formData.advancePayment}
            isOverBudget={isOverBudget}
            formatCurrency={formatCurrency}
            calculateTotalAmount={() => calculateTotalAmount(formData, orderType)}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className="space-y-8">
      <section className="rounded-2xl border border-slate-200 bg-slate-50/80 shadow-sm px-4 py-5 sm:px-6">
        <div className="flex flex-col gap-6">
          <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">
                مسار العمل
              </p>
              <h2 className="text-lg font-semibold text-slate-900">خطوات إنشاء أمر الشراء</h2>
              <p className="text-sm text-slate-500">
                تنقل بين المراحل الأربع بثقة، ويمكنك الرجوع للخلف في أي وقت بدون فقدان البيانات.
              </p>
            </div>
            {formattedLastSaved && (
              <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-white px-3 py-1 text-xs font-medium text-emerald-700 shadow-sm">
                <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                <span>آخر حفظ: {formattedLastSaved}</span>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {STEPS.map((step) => {
              const Icon = step.icon;
              const isActive = currentStep === step.id;
              const isCompleted = currentStep > step.id;

              return (
                <div
                  key={step.id}
                  className={`rounded-2xl border px-4 py-3 text-center transition-all ${
                    isActive
                      ? 'border-cyan-300 bg-white shadow-md'
                      : isCompleted
                        ? 'border-emerald-200 bg-emerald-50'
                        : 'border-slate-200 bg-white'
                  }`}
                >
                  <div className="flex items-center justify-center mb-3">
                    <div
                      className={`flex h-11 w-11 items-center justify-center rounded-xl border-2 ${
                        isActive
                          ? 'border-cyan-400 bg-cyan-50 text-cyan-600'
                          : isCompleted
                            ? 'border-emerald-400 bg-emerald-50 text-emerald-600'
                            : 'border-slate-200 bg-slate-100 text-slate-500'
                      }`}
                    >
                      {isCompleted ? <CheckCircle className="w-5 h-5" /> : <Icon className="w-5 h-5" />}
                    </div>
                  </div>
                  <h3
                    className={`text-sm font-semibold ${
                      isActive
                        ? 'text-slate-900'
                        : isCompleted
                          ? 'text-emerald-700'
                          : 'text-slate-600'
                    }`}
                  >
                    {step.name}
                  </h3>
                  <p className="mt-1 text-[11px] text-slate-500">
                    {isActive
                      ? 'الخطوة الحالية'
                      : isCompleted
                        ? 'اكتملت بنجاح'
                        : 'جاهزة للمتابعة'}
                  </p>
                </div>
              );
            })}
          </div>

          <div className="h-1.5 w-full rounded-full bg-white shadow-inner overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-cyan-500 via-indigo-500 to-purple-500 transition-all duration-500"
              style={{ width: `${stepProgress}%` }}
            />
          </div>
        </div>
      </section>

      <div className="rounded-2xl border border-slate-200 bg-white shadow-md overflow-hidden">
        <div className="p-4 sm:p-6 lg:p-8">
          {renderStepContent()}
        </div>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-t border-slate-200 pt-6">
        <Button
          onClick={prevStep}
          disabled={currentStep === 1}
          variant="outline"
          className="gap-2 text-slate-600 border-slate-300 hover:bg-slate-100"
        >
          <ChevronLeft className="w-5 h-5" />
          السابق
        </Button>

        {currentStep < STEPS.length ? (
          <Button
            onClick={nextStep}
            variant="gradient"
            className="gap-2 from-cyan-500 to-indigo-600 hover:from-cyan-600 hover:to-indigo-700"
          >
            التالي
            <ChevronRight className="w-5 h-5" />
          </Button>
        ) : (
          <Button
            onClick={handleSubmit}
            disabled={loading || isOverBudget}
            variant="success"
            className="gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {loading ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                جاري الحفظ...
              </>
            ) : (
              <>
                <Save className="w-5 h-5" />
                حفظ الطلب
              </>
            )}
          </Button>
        )}
      </div>
      {/* Toast Notification */}
      {toast.show && (
        <div className={`fixed top-4 right-4 z-50 p-4 rounded-xl shadow-lg transition-all transform ${
          toast.type === 'success' ? 'bg-green-500 text-white' :
          toast.type === 'error' ? 'bg-red-500 text-white' :
          toast.type === 'warning' ? 'bg-yellow-500 text-slate-800' :
          'bg-blue-500 text-white'
        }`}>
          <div className="flex items-center gap-2">
            <span>{toast.message}</span>
            {toast.actionLabel && (
              <button 
                onClick={toast.onAction}
                className="ml-2 px-2 py-1 bg-white/20 hover:bg-white/30 rounded-lg text-sm font-medium transition-colors"
              >
                {toast.actionLabel}
              </button>
            )}
          </div>
        </div>
      )}

      {/* Error Modal */}
      {error && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-md">
            <CardHeader className="bg-red-50">
              <CardTitle className="flex items-center gap-2 text-red-700">
                <X className="w-5 h-5" />
                خطأ
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <p className="text-slate-700 whitespace-pre-wrap">{error}</p>
              <div className="mt-6 flex justify-end">
                <Button 
                  onClick={() => setError(null)}
                  className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg"
                >
                  إغلاق
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Inventory Update Status */}
      {inventoryUpdateStatus && (
        <div className={`mt-6 p-4 rounded-xl border ${INVENTORY_STATUS_STYLES[inventoryUpdateStatus]}`}>
          <div className="flex items-start gap-3">
            <div className={`flex-shrink-0 w-3 h-3 rounded-full mt-1.5 ${
              inventoryUpdateStatus === 'updating' ? 'bg-blue-500 animate-pulse' :
              inventoryUpdateStatus === 'success' ? 'bg-green-500' :
              inventoryUpdateStatus === 'warning' ? 'bg-yellow-500' :
              'bg-red-500'
            }`} />
            <div>
              <h3 className="font-bold">{INVENTORY_STATUS_COPY[inventoryUpdateStatus].title}</h3>
              <p className="text-sm opacity-90">{INVENTORY_STATUS_COPY[inventoryUpdateStatus].body}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PurchaseOrderFormImproved;
