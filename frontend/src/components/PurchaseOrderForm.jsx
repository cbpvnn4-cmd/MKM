import React, { useState, useEffect } from 'react';
import { createPurchaseOrder, updatePurchaseOrder, getSuppliers, getWarehouses, getProducts } from '../services/api';
import { updateInventoryFromPurchaseOrder, validateInventoryUpdateRelaxed } from '../utils/inventoryUpdater';
import ElevatorForm from './ElevatorForm';
import ContainerForm from './ContainerForm';
import { Card, CardHeader, CardTitle, CardContent } from './ui/card';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from './ui/table';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Select } from './ui/select';
import { Tabs, TabsList, TabsTrigger } from './ui/tabs';

// Auto-save key for localStorage
const AUTOSAVE_KEY = 'purchase_order_draft';

// Inventory Update Status Messages
const INVENTORY_STATUS_COPY = {
  updating: {
    title: 'جاري تحديث المخزون',
    body: 'نقوم بتطبيق التعديلات على الكميات المتاحة، قد يستغرق ذلك لحظات قليلة.'
  },
  success: {
    title: 'تم تحديث المخزون بنجاح',
    body: 'تمت مزامنة الكميات مع هذا الطلب، يمكنك متابعة الحفظ أو المراجعة.'
  },
  warning: {
    title: 'تم التحديث مع بعض التحذيرات',
    body: 'تم تحديث أغلب الأصناف، لكن تعذر تحديث بعضها. تحقق من التفاصيل قبل المتابعة.'
  },
  error: {
    title: 'تعذّر تحديث المخزون',
    body: 'تعذر مزامنة الكميات الخاصة بالطلب. حاول مرة أخرى أو راجع المسؤول.'
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

const ORDER_STATUS_OPTIONS = [
  { value: 'DRAFT', label: 'مسودة' },
  { value: 'CONFIRMED', label: 'مؤكد' },
  { value: 'RECEIVED', label: 'تم الاستلام' },
  { value: 'CANCELLED', label: 'ملغي' }
];

const RECEIVED_STATUS = 'RECEIVED';

// Steps configuration
const STEPS = [
  { id: 1, name: 'المعلومات الأساسية', icon: '📋' },
  { id: 2, name: 'الأصناف والمنتجات', icon: '📦' },
  { id: 3, name: 'الدفعات والتكلفة', icon: '💰' },
  { id: 4, name: 'المراجعة والحفظ', icon: '✅' }
];

const PurchaseOrderFormImproved = ({ purchaseOrder, onSave, onCancel }) => {
  // Configurable default for advance percentage (via Vite env)
  const DEFAULT_ADVANCE_PERCENT = Math.max(
    0,
    Math.min(100, Number(import.meta?.env?.VITE_DEFAULT_ADVANCE_PERCENT ?? 0))
  );
  const [currentStep, setCurrentStep] = useState(1);
  const [slideDirection, setSlideDirection] = useState('right'); // Animation direction
  const defaultType = (purchaseOrder?.elevators?.length || 0) > 0 && (!purchaseOrder?.items || purchaseOrder.items.length === 0)
    ? 'elevators'
    : 'items';

  const [orderType, setOrderType] = useState(defaultType);
  const [poNumber, setPoNumber] = useState(purchaseOrder?.po_no || generatePurchaseOrderNumber());
  const initialOrderDate = purchaseOrder?.po_date || purchaseOrder?.orderDate || new Date().toISOString().split('T')[0];
  const initialDeliveryDate = purchaseOrder?.expected_delivery_date || purchaseOrder?.deliveryDate || '';
  const normalizedStatus = purchaseOrder?.status ? purchaseOrder.status.toString().toUpperCase() : 'CONFIRMED';
  const allowedStatus = ORDER_STATUS_OPTIONS.some((status) => status.value === normalizedStatus) ? normalizedStatus : 'CONFIRMED';
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
  const [toast, setToast] = useState({ show: false, message: '', type: 'info', actionLabel: null, onAction: null });
  const DRAFT_MAX_AGE_MS = 24 * 60 * 60 * 1000; // 24 hours

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

    // Load auto-saved data if editing new order
    if (!purchaseOrder) {
      const savedData = localStorage.getItem(AUTOSAVE_KEY);
      if (savedData) {
        try {
          const parsed = JSON.parse(savedData);
          const ts = parsed.timestamp ? new Date(parsed.timestamp).getTime() : 0;
          const isRecent = ts > 0 && (Date.now() - ts) <= DRAFT_MAX_AGE_MS;

          if (!isRecent) {
            // Old draft: remove quietly
            localStorage.removeItem(AUTOSAVE_KEY);
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
  }, []);

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
        localStorage.setItem(AUTOSAVE_KEY, JSON.stringify(dataToSave));
        setLastSaved(new Date());
      }, 30000); // 30 seconds

      return () => clearInterval(autoSaveInterval);
    }
  }, [formData, installments, currentStep, orderType, purchaseOrder]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (e) => {
      // Ctrl/Cmd + Enter = Next step or Submit
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        if (currentStep < STEPS.length) {
          nextStep();
        } else {
          handleSubmit(e);
        }
      }

      // Escape = Cancel
      if (e.key === 'Escape') {
        e.preventDefault();
        if (window.confirm('هل تريد حقاً إلغاء العملية؟')) {
          onCancel();
        }
      }

      // Ctrl/Cmd + Left Arrow = Previous step
      if ((e.ctrlKey || e.metaKey) && e.key === 'ArrowLeft') {
        e.preventDefault();
        if (currentStep > 1) {
          prevStep();
        }
      }

      // Ctrl/Cmd + Right Arrow = Next step
      if ((e.ctrlKey || e.metaKey) && e.key === 'ArrowRight') {
        e.preventDefault();
        if (currentStep < STEPS.length) {
          nextStep();
        }
      }

      // Ctrl/Cmd + S = Save draft
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        const dataToSave = {
          formData,
          installments,
          currentStep,
          orderType,
          timestamp: new Date().toISOString()
        };
        localStorage.setItem(AUTOSAVE_KEY, JSON.stringify(dataToSave));
        setLastSaved(new Date());
        setToast({
          show: true,
          message: '💾 تم حفظ المسودة',
          type: 'success'
        });
        setTimeout(() => setToast({ show: false, message: '', type: 'info' }), 2000);
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [currentStep, formData, installments, orderType]);

  const handleOrderTypeChange = (type) => {
    setOrderType(type);
    setErrors(prev => ({ ...prev, items: undefined }));
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => {
      const newData = {
        ...prev,
        [name]: value,
      };

      if (name === 'supplierId') {
        const selectedSupplier = suppliers.find((supplier) => String(supplier.id) === value);
        newData.supplierName = selectedSupplier?.name || '';
      }

      if (name === 'warehouse' && value) {
        newData.items = prev.items.map(item => ({
          ...item,
          warehouse: item.warehouse || value
        }));
      }

      return newData;
    });

    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const handleItemChange = (index, field, value) => {
    const newItems = [...formData.items];
    newItems[index] = { ...newItems[index], [field]: value };

    if (field === 'quantity' || field === 'unitPrice') {
      const quantity = parseFloat(newItems[index].quantity) || 0;
      const unitPrice = parseFloat(newItems[index].unitPrice) || 0;
      newItems[index].total = (quantity * unitPrice).toFixed(2);
    }

    setFormData(prev => ({
      ...prev,
      items: newItems
    }));

    if (errors.items && errors.items[index]) {
      const newItemErrors = [...(errors.items || [])];
      if (newItemErrors[index]) {
        delete newItemErrors[index][field];
        if (Object.keys(newItemErrors[index]).length === 0) {
          delete newItemErrors[index];
        }
      }
      setErrors(prev => ({
        ...prev,
        items: newItemErrors
      }));
    }
  };

  const addItem = () => {
    setFormData(prev => ({
      ...prev,
      items: [...prev.items, {
        product: '',
        product_id: null,
        product_name: '',
        product_sku: '',
        product_category: '',
        note: '',
        quantity: '',
        unitPrice: '',
        total: '',
        warehouse: prev.warehouseName || '',
        isNewProduct: false
      }]
    }));
  };

  const removeItem = (index) => {
    if (formData.items.length > 0) {
      const newItems = formData.items.filter((_, i) => i !== index);
      setFormData(prev => ({
        ...prev,
        items: newItems
      }));
    }
  };

  const calculateTotalAmount = () => {
    const itemsTotal = formData.items.reduce((sum, item) => {
      return sum + (parseFloat(item.total) || 0);
    }, 0);

    const elevatorsTotal = formData.elevators.reduce((sum, elevator) => {
      return sum + (parseFloat(elevator.total_cost_usd) || 0);
    }, 0);

    const containersTotal = formData.containers.reduce((sum, container) => {
      return sum + (parseFloat(container.total_cost) || 0);
    }, 0);

    return itemsTotal + elevatorsTotal + containersTotal;
  };

  useEffect(() => {
    const total = calculateTotalAmount();
    const advanceAmount = (total * formData.advancePercentage / 100);

    setFormData(prev => ({
      ...prev,
      totalAmount: total,
      advancePayment: advanceAmount
    }));

    if (installments.length > 0 && installments[0].type === 'advance') {
      const newInstallments = [...installments];
      newInstallments[0].amount = advanceAmount;
      newInstallments[0].percentage = formData.advancePercentage;
      setInstallments(newInstallments);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData.items, formData.elevators, formData.containers]);

  const addInstallment = () => {
    const newInstallment = {
      id: Date.now(),
      name: `الدفعة ${installments.length + 1}`,
      type: 'regular',
      percentage: 0,
      amount: 0,
      dueDate: new Date().toISOString().split('T')[0],
      status: 'pending',
      paidAmount: 0,
      notes: ''
    };
    setInstallments([...installments, newInstallment]);
  };

  const removeInstallment = (id) => {
    setInstallments(installments.filter(inst => inst.id !== id));
  };

  const updateInstallment = (id, field, value) => {
    setInstallments(installments.map(inst => {
      if (inst.id === id) {
        const updated = { ...inst, [field]: value };

        if (field === 'percentage') {
          updated.amount = (formData.totalAmount * parseFloat(value) / 100) || 0;
        }

        if (field === 'amount' && formData.totalAmount > 0) {
          updated.percentage = ((parseFloat(value) / formData.totalAmount) * 100) || 0;
        }

        if (field === 'paidAmount') {
          const paidAmount = parseFloat(value) || 0;
          const requiredAmount = parseFloat(updated.amount) || 0;
          if (paidAmount > requiredAmount) {
            updated.paidAmount = requiredAmount;
            setToast({
              show: true,
              message: `⚠️ المبلغ المدفوع لا يمكن أن يتجاوز المبلغ المطلوب ($${requiredAmount.toFixed(2)})`,
              type: 'warning'
            });
            setTimeout(() => setToast({ show: false, message: '', type: 'info' }), 4000);
          }
        }

        return updated;
      }
      return inst;
    }));
  };

  const handleElevatorsChange = (elevators) => {
    setFormData(prev => ({
      ...prev,
      elevators: elevators
    }));
  };

  const validateStep = (step) => {
    const newErrors = {};

    if (step === 1) {
      if (!formData.orderDate) newErrors.orderDate = 'تاريخ الطلب مطلوب';
      if (!formData.supplierId) newErrors.supplierId = 'المورّد مطلوب';
      if (!formData.warehouseId) newErrors.warehouseId = 'المستودع مطلوب';
      if (!formData.deliveryDate) {
        newErrors.deliveryDate = 'تاريخ التوريد مطلوب';
      } else if (new Date(formData.deliveryDate) <= new Date(formData.orderDate)) {
        newErrors.deliveryDate = 'تاريخ التوريد يجب أن يكون بعد تاريخ الطلب';
      }
    }

    if (step === 2) {
      const filledItems = (formData.items || []).filter(it => (it.product || '').trim());
      const itemErrors = [];
      filledItems.forEach((item, idx) => {
        const err = {};
        if (!item.quantity || parseFloat(item.quantity) <= 0) err.quantity = 'الكمية أكبر من صفر';
        if (!item.unitPrice || parseFloat(item.unitPrice) <= 0) err.unitPrice = 'السعر أكبر من صفر';
        if (!item.warehouse || !item.warehouse.trim()) err.warehouse = 'المستودع مطلوب للصنف';
        if (Object.keys(err).length) itemErrors[idx] = err;
      });
      if (itemErrors.length) newErrors.items = itemErrors;

      const filledElevators = (formData.elevators || []).filter(e => e.elevator_code && e.height_meters);
      if (filledItems.length === 0 && filledElevators.length === 0) {
        newErrors.items = 'أضف منتجًا واحدًا أو مصعدًا واحدًا على الأقل';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const nextStep = () => {
    if (validateStep(currentStep)) {
      setSlideDirection('left');
      setTimeout(() => {
        setCurrentStep(prev => Math.min(prev + 1, STEPS.length));
      }, 50);
    }
  };

  const prevStep = () => {
    setSlideDirection('right');
    setTimeout(() => {
      setCurrentStep(prev => Math.max(prev - 1, 1));
    }, 50);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateStep(1) || !validateStep(2)) {
      setToast({
        show: true,
        message: '⚠️ يرجى التحقق من جميع الحقول المطلوبة',
        type: 'error'
      });
      setTimeout(() => setToast({ show: false, message: '', type: 'info' }), 4000);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const totalAmountValue = calculateTotalAmount();
      const trimmedNotes = formData.notes.trim();
      const selectedSupplier = suppliers.find((supplier) => String(supplier.id) === String(formData.supplierId));
      const supplierName = formData.supplierName || selectedSupplier?.name || '';
      const currentPoNumber = poNumber || generatePurchaseOrderNumber();
      setPoNumber(currentPoNumber);

      const apiPayload = {
        supplierId: formData.supplierId,
        poNo: currentPoNumber,
        orderDate: formData.orderDate,
        expectedDeliveryDate: formData.deliveryDate || null,
        status: formData.status,
        notes: trimmedNotes,
        totalAmount: totalAmountValue,
        items: orderType === 'items' ? formData.items : [],
        elevators: orderType === 'elevators' ? formData.elevators : [],
        containers: formData.containers || [],
        installments: installments || [],
        advancePayment: formData.advancePayment,
        advancePercentage: formData.advancePercentage
      };

      let savedOrder;
      const previousStatus = purchaseOrder?.status ? purchaseOrder.status.toString().toUpperCase() : null;
      const wasReceived = previousStatus === RECEIVED_STATUS;
      const isNowReceived = formData.status === RECEIVED_STATUS;

      if (purchaseOrder) {
        savedOrder = await updatePurchaseOrder(purchaseOrder.id, apiPayload);
      } else {
        savedOrder = await createPurchaseOrder(apiPayload);
      }

      if (!wasReceived && isNowReceived) {
        setInventoryUpdateStatus('updating');

        try {
          const validation = validateInventoryUpdateRelaxed({ ...savedOrder, items: formData.items, elevators: formData.elevators, po_no: savedOrder?.po_no || currentPoNumber, warehouse: formData.warehouse });
          if (!validation.isValid) {
            setInventoryUpdateStatus('warning');
            setError(`تم حفظ الطلب ولكن لم يتم تحديث المخزون:\n${validation.errors.join('\n')}`);
          } else {
            const inventoryResult = await updateInventoryFromPurchaseOrder({ ...savedOrder, items: formData.items, elevators: formData.elevators, po_no: savedOrder?.po_no || currentPoNumber, warehouse: formData.warehouse });

            if (inventoryResult.success) {
              if (inventoryResult.failedCount > 0) {
                setInventoryUpdateStatus('warning');
                const errorMessages = inventoryResult.errors.map(e => `- ${e.product}: ${e.error}`).join('\n');
                setError(`تم حفظ الطلب وتحديث ${inventoryResult.updatesCount} عنصر، لكن فشل ${inventoryResult.failedCount} عنصر:\n${errorMessages}`);
              } else {
                setInventoryUpdateStatus('success');
                console.log(`✅ تم تحديث ${inventoryResult.updatesCount} عنصر في المخزون بنجاح`);
              }
            } else {
              setInventoryUpdateStatus('error');
              const errorMessages = inventoryResult.errors.map(e => `- ${e.product}: ${e.error}`).join('\n');
              setError(`تم حفظ الطلب ولكن فشل تحديث المخزون:\n${errorMessages}`);
            }
          }
        } catch (inventoryError) {
          setInventoryUpdateStatus('error');
          console.error('❌ Inventory update failed:', inventoryError);
          setError(`تم حفظ الطلب ولكن فشل تحديث المخزون: ${inventoryError.message}`);
        }
      }

      // Clear auto-save on successful submission
      localStorage.removeItem(AUTOSAVE_KEY);

      onSave(savedOrder);
    } catch (err) {
      console.error('Error saving purchase order:', err);
      setError(err.response?.data?.detail || err.message || 'فشل في حفظ بيانات أمر الشراء');
    } finally {
      setLoading(false);
    }
  };

  // Render Step Content
  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return <Step1BasicInfo
          formData={formData}
          errors={errors}
          suppliers={suppliers}
          warehouses={warehouses}
          suppliersLoading={suppliersLoading}
          warehousesLoading={warehousesLoading}
          poNumber={poNumber}
          handleChange={handleChange}
          setFormData={setFormData}
          ORDER_STATUS_OPTIONS={ORDER_STATUS_OPTIONS}
        />;

      case 2:
        return <Step2Items
          orderType={orderType}
          formData={formData}
          errors={errors}
          products={products}
          warehouses={warehouses}
          warehousesLoading={warehousesLoading}
          handleOrderTypeChange={handleOrderTypeChange}
          addItem={addItem}
          removeItem={removeItem}
          handleItemChange={handleItemChange}
          handleElevatorsChange={handleElevatorsChange}
          formatCurrency={formatCurrency}
          calculateTotalAmount={calculateTotalAmount}
        />;

      case 3:
        return <Step3Payments
          formData={formData}
          installments={installments}
          handleChange={handleChange}
          addInstallment={addInstallment}
          removeInstallment={removeInstallment}
          updateInstallment={updateInstallment}
          formatCurrency={formatCurrency}
          setFormData={setFormData}
        />;

      case 4:
        return <Step4Review
          formData={formData}
          poNumber={poNumber}
          orderType={orderType}
          suppliers={suppliers}
          warehouses={warehouses}
          installments={installments}
          formatCurrency={formatCurrency}
          calculateTotalAmount={calculateTotalAmount}
        />;

      default:
        return null;
    }
  };

  return (
    <>
      <style>{`
        @keyframes slideInLeft {
          from {
            opacity: 0;
            transform: translateX(-20px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }

        @keyframes slideInRight {
          from {
            opacity: 0;
            transform: translateX(20px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }

        .animate-slideInLeft {
          animation: slideInLeft 0.3s ease-out;
        }

        .animate-slideInRight {
          animation: slideInRight 0.3s ease-out;
        }
      `}</style>

      <div className="relative min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50 pb-20" dir="rtl">
        {/* Progress Bar */}
      <div className="sticky top-0 z-50 bg-white/95 backdrop-blur-sm border-b border-slate-200 shadow-sm">
        <div className="max-w-5xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between mb-4">
            {STEPS.map((step, index) => (
              <React.Fragment key={step.id}>
                <div className="flex flex-col items-center flex-1">
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center text-2xl transition-all duration-300 ${
                    currentStep === step.id
                      ? 'bg-gradient-to-r from-indigo-500 to-blue-600 text-white shadow-lg scale-110'
                      : currentStep > step.id
                      ? 'bg-green-500 text-white'
                      : 'bg-slate-200 text-slate-500'
                  }`}>
                    {currentStep > step.id ? '✓' : step.icon}
                  </div>
                  <p className={`mt-2 text-xs sm:text-sm font-medium text-center ${
                    currentStep === step.id ? 'text-indigo-600' : 'text-slate-600'
                  }`}>
                    {step.name}
                  </p>
                </div>
                {index < STEPS.length - 1 && (
                  <div className={`h-1 flex-1 mx-2 rounded-full transition-all duration-300 ${
                    currentStep > step.id ? 'bg-green-500' : 'bg-slate-200'
                  }`} />
                )}
              </React.Fragment>
            ))}
          </div>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="max-w-5xl mx-auto px-4 mt-6">
          <div className="bg-red-50 border border-red-200 rounded-xl p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.864-.833-2.632 0L5.232 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <div className="mr-3">
                <h3 className="text-sm font-medium text-red-800">خطأ في حفظ البيانات</h3>
                <p className="mt-1 text-sm text-red-700 whitespace-pre-line">{error}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Inventory Update Status */}
      {inventoryUpdateStatus && (
        <div className="max-w-5xl mx-auto px-4 mt-6">
          <div className={`flex items-start gap-3 rounded-xl border-2 px-4 py-4 text-sm transition-all ${INVENTORY_STATUS_STYLES[inventoryUpdateStatus]}`}>
            <span className="mt-0.5 flex h-8 w-8 items-center justify-center rounded-full bg-white/70 text-lg">
              {inventoryUpdateStatus === 'updating' && (
                <div className="animate-spin rounded-full h-5 w-5 border-2 border-current border-t-transparent"></div>
              )}
              {inventoryUpdateStatus === 'success' && '✓'}
              {inventoryUpdateStatus === 'warning' && '⚠'}
              {inventoryUpdateStatus === 'error' && '✕'}
            </span>
            <div className="space-y-1 flex-1">
              <p className="font-bold text-base">{INVENTORY_STATUS_COPY[inventoryUpdateStatus]?.title}</p>
              <p className="text-xs leading-relaxed opacity-90">{INVENTORY_STATUS_COPY[inventoryUpdateStatus]?.body}</p>
            </div>
          </div>
        </div>
      )}

      {/* Step Content */}
      <form onSubmit={handleSubmit} className="max-w-5xl mx-auto px-4 py-8">
        <div className={`bg-white rounded-2xl shadow-xl border border-slate-200 p-6 sm:p-8 mb-8 transition-all duration-300 ${
          slideDirection === 'left' ? 'animate-slideInLeft' : 'animate-slideInRight'
        }`}>
          {renderStepContent()}
        </div>

        {/* Navigation Buttons */}
        <div className="bg-white rounded-2xl shadow-xl border border-slate-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <button
              type="button"
              onClick={prevStep}
              disabled={currentStep === 1}
              className="px-6 py-3 border border-slate-300 rounded-xl text-slate-700 font-medium hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              السابق
            </button>

            <div className="text-center">
              <div className="text-sm font-medium text-slate-700">
                الخطوة {currentStep} من {STEPS.length}
              </div>
              {lastSaved && !purchaseOrder && (
                <div className="text-xs text-green-600 mt-1 flex items-center justify-center gap-1">
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  تم الحفظ التلقائي منذ {Math.floor((new Date() - lastSaved) / 1000)} ثانية
                </div>
              )}
            </div>

            {currentStep < STEPS.length ? (
              <button
                type="button"
                onClick={nextStep}
                className="px-6 py-3 bg-gradient-to-r from-indigo-500 to-blue-600 text-white font-semibold rounded-xl hover:from-indigo-600 hover:to-blue-700 transform hover:scale-105 transition-all duration-200 shadow-lg flex items-center gap-2"
              >
                التالي
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            ) : (
              <button
                type="submit"
                disabled={loading}
                className="px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white font-semibold rounded-xl hover:from-green-600 hover:to-emerald-700 transform hover:scale-105 transition-all duration-200 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
              >
                {loading ? (
                  <div className="flex items-center">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white ml-2"></div>
                    {purchaseOrder ? 'جاري التحديث...' : 'جاري الحفظ...'}
                  </div>
                ) : (
                  purchaseOrder ? 'تحديث أمر الشراء' : 'إنشاء أمر الشراء'
                )}
              </button>
            )}
          </div>

          {/* Keyboard Shortcuts Info */}
          <div className="border-t border-slate-200 pt-4">
            <details className="text-xs text-slate-500">
              <summary className="cursor-pointer hover:text-slate-700 font-medium">اختصارات لوحة المفاتيح ⌨️</summary>
              <div className="mt-2 space-y-1 pr-4">
                <div className="flex items-center gap-2">
                  <kbd className="px-2 py-1 bg-slate-100 rounded text-slate-700 font-mono text-xs">Ctrl</kbd>
                  <span>+</span>
                  <kbd className="px-2 py-1 bg-slate-100 rounded text-slate-700 font-mono text-xs">Enter</kbd>
                  <span>- التالي / الحفظ</span>
                </div>
                <div className="flex items-center gap-2">
                  <kbd className="px-2 py-1 bg-slate-100 rounded text-slate-700 font-mono text-xs">Ctrl</kbd>
                  <span>+</span>
                  <kbd className="px-2 py-1 bg-slate-100 rounded text-slate-700 font-mono text-xs">→</kbd>
                  <span>- الخطوة التالية</span>
                </div>
                <div className="flex items-center gap-2">
                  <kbd className="px-2 py-1 bg-slate-100 rounded text-slate-700 font-mono text-xs">Ctrl</kbd>
                  <span>+</span>
                  <kbd className="px-2 py-1 bg-slate-100 rounded text-slate-700 font-mono text-xs">←</kbd>
                  <span>- الخطوة السابقة</span>
                </div>
                <div className="flex items-center gap-2">
                  <kbd className="px-2 py-1 bg-slate-100 rounded text-slate-700 font-mono text-xs">Ctrl</kbd>
                  <span>+</span>
                  <kbd className="px-2 py-1 bg-slate-100 rounded text-slate-700 font-mono text-xs">S</kbd>
                  <span>- حفظ المسودة</span>
                </div>
                <div className="flex items-center gap-2">
                  <kbd className="px-2 py-1 bg-slate-100 rounded text-slate-700 font-mono text-xs">Esc</kbd>
                  <span>- إلغاء</span>
                </div>
              </div>
            </details>
          </div>
        </div>

        <div className="flex justify-center mt-6">
          <button
            type="button"
            onClick={onCancel}
            className="px-6 py-3 text-slate-600 hover:text-slate-900 font-medium transition-colors"
          >
            إلغاء العملية
          </button>
        </div>
      </form>

      {/* Toast Notification */}
      {toast.show && (
        <div className="fixed bottom-4 left-4 z-50 animate-slide-up">
          <div className={`rounded-xl shadow-2xl p-4 flex items-center space-x-3 rtl:space-x-reverse max-w-md ${
            toast.type === 'warning' ? 'bg-yellow-50 border-2 border-yellow-400' :
            toast.type === 'error' ? 'bg-red-50 border-2 border-red-400' :
            toast.type === 'success' ? 'bg-green-50 border-2 border-green-400' :
            'bg-blue-50 border-2 border-blue-400'
          }`}>
            <p className={`text-sm font-medium ${
              toast.type === 'warning' ? 'text-yellow-800' :
              toast.type === 'error' ? 'text-red-800' :
              toast.type === 'success' ? 'text-green-800' :
              'text-blue-800'
            }`}>
              {toast.message}
            </p>
            {toast.actionLabel && (
              <button
                onClick={() => toast.onAction && toast.onAction()}
                className="ml-2 px-2 py-1 text-sm font-semibold text-blue-800 hover:underline"
              >
                {toast.actionLabel}
              </button>
            )}
            <button
              onClick={() => setToast({ show: false, message: '', type: 'info', actionLabel: null, onAction: null })}
              className="flex-shrink-0"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}
      </div>
    </>
  );
};

// Step 1: Basic Info Component
const Step1BasicInfo = ({ formData, errors, suppliers, warehouses, suppliersLoading, warehousesLoading, poNumber, handleChange, setFormData, ORDER_STATUS_OPTIONS }) => {
  return (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-slate-900">المعلومات الأساسية</h2>
        <p className="text-slate-600 mt-2">أدخل البيانات الأساسية لأمر الشراء</p>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <div className="space-y-2">
          <label htmlFor="poNumber" className="text-sm font-semibold text-slate-700">
            رقم أمر الشراء
          </label>
          <input
            type="text"
            id="poNumber"
            value={poNumber}
            readOnly
            dir="ltr"
            className="w-full rounded-lg border border-dashed border-slate-300 bg-slate-50 px-4 py-3 font-mono text-sm tracking-widest text-slate-600"
          />
          <p className="text-xs text-slate-500">يتم توليد الرقم تلقائياً</p>
        </div>

        <div className="space-y-2">
          <label htmlFor="status" className="text-sm font-semibold text-slate-700">
            حالة الطلب
          </label>
          <select
            id="status"
            name="status"
            value={formData.status}
            onChange={handleChange}
            className="w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            {ORDER_STATUS_OPTIONS.map((status) => (
              <option key={status.value} value={status.value}>
                {status.label}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          <label htmlFor="orderDate" className="text-sm font-semibold text-slate-700">
            تاريخ الطلب *
          </label>
          <input
            type="date"
            id="orderDate"
            name="orderDate"
            value={formData.orderDate}
            onChange={handleChange}
            className={`w-full rounded-lg border px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
              errors.orderDate ? 'border-red-300 bg-rose-50/60' : 'border-slate-300 bg-white'
            }`}
          />
          {errors.orderDate && (
            <p className="text-xs font-medium text-rose-600">{errors.orderDate}</p>
          )}
        </div>

        <div className="space-y-2">
          <label htmlFor="deliveryDate" className="text-sm font-semibold text-slate-700">
            تاريخ التسليم المتوقع *
          </label>
          <input
            type="date"
            id="deliveryDate"
            name="deliveryDate"
            value={formData.deliveryDate}
            onChange={handleChange}
            className={`w-full rounded-lg border px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
              errors.deliveryDate ? 'border-red-300 bg-rose-50/60' : 'border-slate-300 bg-white'
            }`}
          />
          {errors.deliveryDate && (
            <p className="text-xs font-medium text-rose-600">{errors.deliveryDate}</p>
          )}
        </div>

        <div className="space-y-2">
          <label htmlFor="supplierId" className="text-sm font-semibold text-slate-700">
            المورد *
          </label>
          <select
            id="supplierId"
            name="supplierId"
            value={formData.supplierId}
            onChange={handleChange}
            disabled={suppliersLoading}
            className={`w-full rounded-lg border px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
              errors.supplierId ? 'border-red-300 bg-rose-50/60' : 'border-slate-300 bg-white'
            } ${suppliersLoading ? 'cursor-not-allowed opacity-60' : ''}`}
          >
            <option value="">
              {suppliersLoading ? 'جاري تحميل الموردين...' : 'اختر المورد'}
            </option>
            {suppliers.map((supplier) => (
              <option key={supplier.id} value={supplier.id}>
                {supplier.name}
              </option>
            ))}
          </select>
          {errors.supplierId && (
            <p className="text-xs font-medium text-rose-600">{errors.supplierId}</p>
          )}
        </div>

        <div className="space-y-2">
          <label htmlFor="warehouseId" className="text-sm font-semibold text-slate-700">
            المستودع الرئيسي *
          </label>
          <select
            id="warehouseId"
            name="warehouseId"
            value={formData.warehouseId}
            onChange={(e) => {
              const selectedWarehouse = warehouses.find((w) => w.id === parseInt(e.target.value, 10));
              setFormData((prev) => ({
                ...prev,
                warehouseId: e.target.value,
                warehouseName: selectedWarehouse?.name || ''
              }));
            }}
            disabled={warehousesLoading}
            className={`w-full rounded-lg border px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
              errors.warehouseId ? 'border-red-300 bg-rose-50/60' : 'border-slate-300 bg-white'
            } ${warehousesLoading ? 'cursor-not-allowed opacity-60' : ''}`}
          >
            <option value="">
              {warehousesLoading ? 'جاري تحميل المستودعات...' : 'اختر المستودع'}
            </option>
            {warehouses.map((warehouse) => (
              <option key={warehouse.id} value={warehouse.id}>
                {warehouse.name} - {warehouse.location}
              </option>
            ))}
          </select>
          {errors.warehouseId && (
            <p className="text-xs font-medium text-rose-600">{errors.warehouseId}</p>
          )}
        </div>
      </div>

      <div className="space-y-2">
        <label htmlFor="notes" className="text-sm font-semibold text-slate-700">
          ملاحظات إضافية
        </label>
        <textarea
          id="notes"
          name="notes"
          value={formData.notes}
          onChange={handleChange}
          rows={4}
          className="w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          placeholder="أضف أي ملاحظات أو تعليمات خاصة بالطلب..."
        />
      </div>
    </div>
  );
};

// Step 2: Items Component
const Step2Items = ({
  orderType,
  formData,
  errors,
  products,
  warehouses,
  warehousesLoading,
  handleOrderTypeChange,
  addItem,
  removeItem,
  handleItemChange,
  handleElevatorsChange,
  formatCurrency,
  calculateTotalAmount
}) => {
  return (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-slate-900">الأصناف والمنتجات</h2>
        <p className="text-slate-600 mt-2">أضف المنتجات أو المصاعد لأمر الشراء</p>
      </div>

      {/* Order Type Tabs */}
      <div className="flex items-center justify-center gap-2 mb-6">
        <button
          type="button"
          onClick={() => handleOrderTypeChange('items')}
          className={`px-6 py-3 rounded-xl font-semibold transition-all duration-200 ${
            orderType === 'items'
              ? 'bg-gradient-to-r from-blue-500 to-cyan-600 text-white shadow-lg scale-105'
              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          }`}
        >
          📦 الأصناف
        </button>
        <button
          type="button"
          onClick={() => handleOrderTypeChange('elevators')}
          className={`px-6 py-3 rounded-xl font-semibold transition-all duration-200 ${
            orderType === 'elevators'
              ? 'bg-gradient-to-r from-purple-500 to-pink-600 text-white shadow-lg scale-105'
              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          }`}
        >
          🏗️ المصاعد
        </button>
      </div>

      {orderType === 'items' && (
        <div className="space-y-4">
          {/* Add Button */}
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-bold text-slate-900">قائمة المنتجات ({formData.items.length})</h3>
            <button
              type="button"
              onClick={addItem}
              className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-green-500 to-emerald-600 text-white font-semibold rounded-xl hover:from-green-600 hover:to-emerald-700 shadow-md transition-all"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v12m6-6H6" />
              </svg>
              إضافة منتج
            </button>
          </div>

          {/* Products List - Card Based View */}
          <div className="space-y-4">
            {formData.items.length === 0 ? (
              <div className="text-center py-16 bg-gradient-to-br from-slate-50 to-blue-50 rounded-2xl border-2 border-dashed border-slate-300">
                <svg className="mx-auto h-16 w-16 text-slate-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                </svg>
                <p className="text-slate-500 font-medium mb-4">لا توجد منتجات. ابدأ بإضافة منتج جديد</p>
                <button
                  type="button"
                  onClick={addItem}
                  className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-500 to-cyan-600 text-white font-semibold rounded-xl hover:from-blue-600 hover:to-cyan-700 shadow-lg transition-all"
                >
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v12m6-6H6" />
                  </svg>
                  إضافة أول منتج
                </button>
              </div>
            ) : (
              formData.items.map((item, index) => {
                const rowError = Array.isArray(errors.items) ? errors.items[index] || {} : {};
                return (
                  <div key={index} className="bg-white rounded-2xl border-2 border-slate-200 p-6 shadow-sm hover:shadow-md transition-shadow">
                    {/* Header */}
                    <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-200">
                      <div className="flex items-center gap-3">
                        <span className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-gradient-to-r from-blue-500 to-cyan-600 text-white font-bold text-sm shadow-md">
                          {index + 1}
                        </span>
                        <h4 className="text-lg font-bold text-slate-900">منتج #{index + 1}</h4>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeItem(index)}
                        className="inline-flex items-center gap-2 px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors font-medium"
                      >
                        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                        حذف
                      </button>
                    </div>

                    {/* Form Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {/* Product Name */}
                      <div className="lg:col-span-2">
                        <label className="block text-sm font-semibold text-slate-700 mb-2">
                          اسم المنتج *
                        </label>
                        <input
                          type="text"
                          list={`products-${index}`}
                          value={item.product}
                          onChange={(e) => handleItemChange(index, 'product', e.target.value)}
                          placeholder="ابحث عن المنتج أو أدخل اسم جديد..."
                          className={`w-full rounded-xl border-2 px-4 py-3 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all ${
                            rowError.product ? 'border-red-300 bg-rose-50' : 'border-slate-300 bg-white hover:border-slate-400'
                          }`}
                        />
                        <datalist id={`products-${index}`}>
                          {products.map((product) => (
                            <option key={product.id} value={product.name}>
                              {product.name} - رصيد: {product.currentStock}
                            </option>
                          ))}
                        </datalist>
                        {rowError.product && (
                          <p className="text-xs font-medium text-red-600 mt-1">{rowError.product}</p>
                        )}
                      </div>

                      {/* SKU */}
                      <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-2">
                          رمز SKU
                        </label>
                        <input
                          type="text"
                          value={item.product_sku || ''}
                          onChange={(e) => handleItemChange(index, 'product_sku', e.target.value)}
                          placeholder="SKU-123"
                          className="w-full rounded-xl border-2 border-slate-300 px-4 py-3 text-sm bg-white hover:border-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                        />
                      </div>

                      {/* Category */}
                      <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-2">
                          الفئة
                        </label>
                        <input
                          type="text"
                          value={item.product_category || ''}
                          onChange={(e) => handleItemChange(index, 'product_category', e.target.value)}
                          placeholder="الفئة"
                          className="w-full rounded-xl border-2 border-slate-300 px-4 py-3 text-sm bg-white hover:border-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                        />
                      </div>

                      {/* Quantity */}
                      <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-2">
                          الكمية *
                        </label>
                        <input
                          type="number"
                          min="0"
                          value={item.quantity}
                          onChange={(e) => handleItemChange(index, 'quantity', e.target.value)}
                          placeholder="10"
                          className={`w-full rounded-xl border-2 px-4 py-3 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all ${
                            rowError.quantity ? 'border-red-300 bg-rose-50' : 'border-slate-300 bg-white hover:border-slate-400'
                          }`}
                        />
                        {rowError.quantity && (
                          <p className="text-xs font-medium text-red-600 mt-1">{rowError.quantity}</p>
                        )}
                      </div>

                      {/* Unit Price */}
                      <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-2">
                          سعر الوحدة (USD) *
                        </label>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={item.unitPrice}
                          onChange={(e) => handleItemChange(index, 'unitPrice', e.target.value)}
                          placeholder="100.00"
                          className={`w-full rounded-xl border-2 px-4 py-3 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all ${
                            rowError.unitPrice ? 'border-red-300 bg-rose-50' : 'border-slate-300 bg-white hover:border-slate-400'
                          }`}
                        />
                        {rowError.unitPrice && (
                          <p className="text-xs font-medium text-red-600 mt-1">{rowError.unitPrice}</p>
                        )}
                      </div>

                      {/* Warehouse */}
                      <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-2">
                          المستودع *
                        </label>
                        <select
                          value={item.warehouse}
                          onChange={(e) => handleItemChange(index, 'warehouse', e.target.value)}
                          className={`w-full rounded-xl border-2 px-4 py-3 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all ${
                            rowError.warehouse ? 'border-red-300 bg-rose-50' : 'border-slate-300 bg-white hover:border-slate-400'
                          }`}
                        >
                          <option value="">اختر المستودع</option>
                          {warehouses.map((w) => (
                            <option key={w.id} value={w.name}>{w.name}</option>
                          ))}
                        </select>
                        {rowError.warehouse && (
                          <p className="text-xs font-medium text-red-600 mt-1">{rowError.warehouse}</p>
                        )}
                      </div>

                      {/* Notes */}
                      <div className="lg:col-span-2">
                        <label className="block text-sm font-semibold text-slate-700 mb-2">
                          ملاحظات
                        </label>
                        <textarea
                          value={item.note || ''}
                          onChange={(e) => handleItemChange(index, 'note', e.target.value)}
                          rows={3}
                          className="w-full rounded-xl border-2 border-slate-300 px-4 py-3 text-sm bg-white hover:border-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all resize-none"
                          placeholder="أي تفاصيل إضافية عن المنتج..."
                        />
                      </div>

                      {/* Total Display */}
                      <div className="flex items-end">
                        <div className="w-full bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-200 rounded-xl p-4">
                          <p className="text-xs font-semibold uppercase text-green-700 mb-1">الإجمالي</p>
                          <p className="text-2xl font-bold text-green-900">${formatCurrency(item.total)}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {typeof errors.items === 'string' && (
            <div className="bg-red-50 border-2 border-red-200 rounded-xl p-4">
              <p className="text-sm font-semibold text-red-700 text-center">{errors.items}</p>
            </div>
          )}

          {formData.items.length > 0 && (
            <div className="bg-gradient-to-r from-blue-50 to-cyan-50 rounded-2xl border-2 border-blue-200 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold uppercase text-blue-700 mb-1">إجمالي المشتريات</p>
                  <p className="text-xs text-blue-600">مجموع {formData.items.length} منتج</p>
                </div>
                <div className="text-left">
                  <p className="text-4xl font-bold text-blue-900">${formatCurrency(calculateTotalAmount())}</p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {orderType === 'elevators' && (
        <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-2xl border-2 border-purple-200 p-6">
          <ElevatorForm
            elevators={formData.elevators}
            onChange={handleElevatorsChange}
          />
        </div>
      )}
    </div>
  );
};

// Step 3: Payments Component
const Step3Payments = ({
  formData,
  installments,
  handleChange,
  addInstallment,
  removeInstallment,
  updateInstallment,
  formatCurrency,
  setFormData
}) => {
  const totalRemaining = Math.max((formData.totalAmount || 0) - (formData.advancePayment || 0), 0);
  const installmentsProgress = installments.reduce((sum, inst) => sum + (parseFloat(inst.percentage) || 0), 0);

  return (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-slate-900">الدفعات والتكلفة</h2>
        <p className="text-slate-600 mt-2">حدد التكاليف وأقساط الدفع</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl border-2 border-blue-200 p-6">
          <p className="text-xs font-semibold uppercase text-blue-700">إجمالي الطلب</p>
          <p className="mt-2 text-3xl font-bold text-blue-900">${formatCurrency(formData.totalAmount)}</p>
        </div>
        <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl border-2 border-green-200 p-6">
          <p className="text-xs font-semibold uppercase text-green-700">العربون ({formData.advancePercentage}%)</p>
          <p className="mt-2 text-3xl font-bold text-green-900">${formatCurrency(formData.advancePayment)}</p>
        </div>
        <div className="bg-gradient-to-br from-orange-50 to-amber-50 rounded-xl border-2 border-orange-200 p-6">
          <p className="text-xs font-semibold uppercase text-orange-700">المتبقي</p>
          <p className="mt-2 text-3xl font-bold text-orange-900">${formatCurrency(totalRemaining)}</p>
        </div>
      </div>

      {/* Advance Percentage */}
      <div className="bg-white rounded-xl border-2 border-slate-200 p-6">
        <label htmlFor="advancePercentage" className="text-sm font-semibold text-slate-700">
          نسبة العربون (%)
        </label>
        <input
          type="number"
          name="advancePercentage"
          id="advancePercentage"
          min="0"
          max="100"
          value={formData.advancePercentage}
          onChange={handleChange}
          className="mt-2 w-full rounded-lg border-2 border-slate-300 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
      </div>

      {/* Installments Progress Bar */}
      <div className="bg-white rounded-xl border-2 border-slate-200 p-6">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-slate-700">تقدم توزيع الدفعات</h3>
          <span className={`text-lg font-bold ${installmentsProgress > 100 ? 'text-red-600' : installmentsProgress === 100 ? 'text-green-600' : 'text-amber-600'}`}>
            {installmentsProgress.toFixed(1)}% من 100%
          </span>
        </div>
        <div className="h-3 bg-slate-200 rounded-full overflow-hidden">
          <div
            className={`h-full transition-all duration-500 ${
              installmentsProgress > 100
                ? 'bg-gradient-to-r from-red-500 to-red-600'
                : installmentsProgress === 100
                ? 'bg-gradient-to-r from-green-500 to-emerald-500'
                : 'bg-gradient-to-r from-amber-500 to-orange-500'
            }`}
            style={{ width: `${Math.min(installmentsProgress, 100)}%` }}
          />
        </div>
        {installmentsProgress > 100 && (
          <p className="mt-2 text-xs text-red-600 font-medium">
            ⚠️ تحذير: مجموع نسب الدفعات يتجاوز 100%
          </p>
        )}
        {installmentsProgress < 100 && installmentsProgress > 0 && (
          <p className="mt-2 text-xs text-amber-600 font-medium">
            ℹ️ المتبقي: {(100 - installmentsProgress).toFixed(1)}%
          </p>
        )}
      </div>

      {/* Installments */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-slate-800">الدفعات ({installments.length})</h3>
          <button
            type="button"
            onClick={addInstallment}
            className="inline-flex items-center gap-2 rounded-lg bg-indigo-100 px-4 py-2 text-sm font-semibold text-indigo-600 hover:bg-indigo-200 transition-colors"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v12m6-6H6" />
            </svg>
            إضافة دفعة
          </button>
        </div>

        {installments.map((installment, index) => {
          const amount = parseFloat(installment.amount) || 0;
          const paidAmount = parseFloat(installment.paidAmount) || 0;
          const paymentProgress = amount > 0 ? Math.min((paidAmount / amount) * 100, 100) : 0;

          return (
            <div key={installment.id} className="bg-white rounded-xl border-2 border-slate-200 p-6 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <span className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-indigo-100 text-indigo-600 font-bold">
                    #{index + 1}
                  </span>
                  <input
                    type="text"
                    value={installment.name}
                    onChange={(e) => updateInstallment(installment.id, 'name', e.target.value)}
                    className="rounded-lg border-2 border-slate-300 px-3 py-2 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="اسم الدفعة"
                  />
                  {installment.type === 'advance' && (
                    <span className="rounded-full bg-emerald-100 border-2 border-emerald-300 px-3 py-1 text-xs font-bold text-emerald-700">
                      عربون
                    </span>
                  )}
                </div>
                {installment.type !== 'advance' && (
                  <button
                    type="button"
                    onClick={() => removeInstallment(installment.id)}
                    className="text-red-500 hover:text-red-700 transition-colors"
                  >
                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-slate-600">النسبة %</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="0.1"
                    value={installment.percentage}
                    onChange={(e) => updateInstallment(installment.id, 'percentage', e.target.value)}
                    disabled={installment.type === 'advance'}
                    className="mt-1 w-full rounded-lg border-2 border-slate-300 px-3 py-2 text-sm disabled:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-600">المبلغ (USD)</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={installment.amount}
                    readOnly={installment.type === 'advance'}
                    className="mt-1 w-full rounded-lg border-2 border-slate-300 px-3 py-2 text-sm bg-slate-50 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-600">المبلغ المدفوع</label>
                  <input
                    type="number"
                    min="0"
                    max={amount}
                    step="0.01"
                    value={installment.paidAmount || 0}
                    onChange={(e) => updateInstallment(installment.id, 'paidAmount', parseFloat(e.target.value) || 0)}
                    className="mt-1 w-full rounded-lg border-2 border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-600">تاريخ الاستحقاق</label>
                  <input
                    type="date"
                    value={installment.dueDate}
                    onChange={(e) => updateInstallment(installment.id, 'dueDate', e.target.value)}
                    className="mt-1 w-full rounded-lg border-2 border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              {amount > 0 && (
                <div className="mt-4">
                  <div className="flex items-center justify-between text-xs text-slate-600 mb-1">
                    <span>التقدم في الدفع</span>
                    <span className="font-semibold">{paymentProgress.toFixed(1)}%</span>
                  </div>
                  <div className="h-2 rounded-full bg-slate-200 overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-emerald-500 to-green-500 transition-all duration-500"
                      style={{ width: `${paymentProgress}%` }}
                    />
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Containers Section */}
      <div className="bg-slate-50 rounded-xl border-2 border-slate-200 p-6">
        <h3 className="text-lg font-semibold text-slate-800 mb-4">الحاويات والشحن</h3>
        <ContainerForm
          containers={formData.containers}
          onChange={(containers) => setFormData(prev => ({ ...prev, containers }))}
        />
      </div>
    </div>
  );
};

// Step 4: Review Component
const Step4Review = ({
  formData,
  poNumber,
  orderType,
  suppliers,
  warehouses,
  installments,
  formatCurrency,
  calculateTotalAmount
}) => {
  const supplier = suppliers.find(s => String(s.id) === String(formData.supplierId));
  const warehouse = warehouses.find(w => String(w.id) === String(formData.warehouseId));

  return (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-slate-900">المراجعة النهائية</h2>
        <p className="text-slate-600 mt-2">راجع جميع البيانات قبل الحفظ</p>
      </div>

      {/* Order Info */}
      <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl border-2 border-blue-200 p-6">
        <h3 className="text-lg font-bold text-blue-900 mb-4">معلومات الطلب</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div>
            <span className="font-semibold text-blue-700">رقم الطلب:</span>
            <span className="mr-2 font-mono text-blue-900">{poNumber}</span>
          </div>
          <div>
            <span className="font-semibold text-blue-700">الحالة:</span>
            <span className="mr-2 text-blue-900">{formData.status}</span>
          </div>
          <div>
            <span className="font-semibold text-blue-700">تاريخ الطلب:</span>
            <span className="mr-2 text-blue-900">{formData.orderDate}</span>
          </div>
          <div>
            <span className="font-semibold text-blue-700">تاريخ التسليم:</span>
            <span className="mr-2 text-blue-900">{formData.deliveryDate}</span>
          </div>
          <div>
            <span className="font-semibold text-blue-700">المورد:</span>
            <span className="mr-2 text-blue-900">{supplier?.name || 'غير محدد'}</span>
          </div>
          <div>
            <span className="font-semibold text-blue-700">المستودع:</span>
            <span className="mr-2 text-blue-900">{warehouse?.name || 'غير محدد'}</span>
          </div>
        </div>
      </div>

      {/* Items Summary */}
      <div className="bg-white rounded-xl border-2 border-slate-200 p-6">
        <h3 className="text-lg font-bold text-slate-900 mb-4">
          {orderType === 'items' ? `المنتجات (${formData.items.length})` : `المصاعد (${formData.elevators.length})`}
        </h3>
        {orderType === 'items' && formData.items.length > 0 ? (
          <div className="space-y-2">
            {formData.items.map((item, index) => (
              <div key={index} className="flex items-center justify-between py-2 border-b border-slate-100">
                <div className="flex-1">
                  <span className="font-medium text-slate-900">{item.product}</span>
                  <span className="text-slate-500 text-sm mr-2">× {item.quantity}</span>
                </div>
                <span className="font-bold text-slate-900">${formatCurrency(item.total)}</span>
              </div>
            ))}
          </div>
        ) : orderType === 'elevators' && formData.elevators.length > 0 ? (
          <div className="space-y-2">
            {formData.elevators.map((elevator, index) => (
              <div key={index} className="flex items-center justify-between py-2 border-b border-slate-100">
                <div className="flex-1">
                  <span className="font-medium text-slate-900">{elevator.elevator_code}</span>
                  <span className="text-slate-500 text-sm mr-2">- {elevator.height_meters}m</span>
                </div>
                <span className="font-bold text-slate-900">${formatCurrency(elevator.total_cost_usd)}</span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-center text-slate-500 py-4">لا توجد عناصر</p>
        )}
      </div>

      {/* Financial Summary */}
      <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl border-2 border-green-200 p-6">
        <h3 className="text-lg font-bold text-green-900 mb-4">الملخص المالي</h3>
        <div className="space-y-3">
          <div className="flex items-center justify-between text-lg">
            <span className="font-semibold text-green-700">الإجمالي:</span>
            <span className="font-bold text-green-900 text-2xl">${formatCurrency(calculateTotalAmount())}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="font-medium text-green-700">العربون ({formData.advancePercentage}%):</span>
            <span className="font-bold text-green-900">${formatCurrency(formData.advancePayment)}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="font-medium text-green-700">المتبقي:</span>
            <span className="font-bold text-green-900">${formatCurrency(formData.totalAmount - formData.advancePayment)}</span>
          </div>
          <div className="pt-3 border-t border-green-300">
            <span className="font-medium text-green-700">عدد الدفعات: {installments.length}</span>
          </div>
        </div>
      </div>

      {/* Notes */}
      {formData.notes && (
        <div className="bg-amber-50 rounded-xl border-2 border-amber-200 p-6">
          <h3 className="text-lg font-bold text-amber-900 mb-2">ملاحظات</h3>
          <p className="text-amber-800 whitespace-pre-line">{formData.notes}</p>
        </div>
      )}

      <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-4 text-center">
        <p className="text-sm text-blue-800">
          ✅ جميع البيانات صحيحة؟ اضغط "إنشاء أمر الشراء" للحفظ
        </p>
      </div>
    </div>
  );
};

export default PurchaseOrderFormImproved;
