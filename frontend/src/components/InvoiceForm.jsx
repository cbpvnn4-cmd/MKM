import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  createInvoice,
  updateInvoice,
  getCustomers,
  getSalesOrders,
  getSalesOrder,
  getNextInvoiceNumber,
} from '../services/api';
import CustomerForm from './CustomerForm';
import SalesOrderItemSelector from './SalesOrderItemSelector';
import { useToast } from './ui/Toast';
import { useConfirmations } from './ui/ConfirmDialog';

const SALES_ORDER_STATUS_LABELS = {
  DRAFT: 'مسودة',
  CONFIRMED: 'مؤكد',
  FULFILLED: 'مكتمل',
  INVOICED: 'مفوترة',
  CANCELLED: 'ملغى',
  VOID: 'لاغٍ',
};

const INVOICE_STATUS_LABELS = {
  DRAFT: 'مسودة',
  ISSUED: 'صادرة',
  PARTIALLY_PAID: 'مدفوعة جزئياً',
  PAID: 'مدفوعة',
  OVERDUE: 'متأخرة',
  VOID: 'ملغاة',
};

const INVOICE_STATUS_STYLES = {
  DRAFT: 'bg-white/20 text-white border-white/10',
  ISSUED: 'bg-blue-500/20 text-blue-50 border-blue-400/40',
  PARTIALLY_PAID: 'bg-amber-500/20 text-amber-50 border-amber-400/40',
  PAID: 'bg-emerald-500/25 text-emerald-50 border-emerald-400/40',
  OVERDUE: 'bg-rose-500/25 text-rose-50 border-rose-400/40',
  VOID: 'bg-slate-500/20 text-slate-100 border-slate-400/40',
};

const numberFormatterOptions = { minimumFractionDigits: 2, maximumFractionDigits: 2 };

const InvoiceForm = ({ invoice, onSave, onCancel, linkedSalesOrderId }) => {
  const { success, error: toastError } = useToast();
  const { confirmDelete } = useConfirmations();

  const [formData, setFormData] = useState({
    invoiceNo: invoice?.invoiceNo || invoice?.invoice_no || '',
    customer: invoice?.customer || '',
    issueDate: invoice?.issueDate || invoice?.issue_date || '',
    dueDate: invoice?.dueDate || invoice?.due_date || '',
    status: invoice?.status || 'DRAFT',
    tax: typeof invoice?.tax === 'number' ? invoice.tax : 0,
  });

  const [items, setItems] = useState(
    Array.isArray(invoice?.items) && invoice.items.length
      ? invoice.items
      : [{ id: 1, description: '', qty: 1, unitPrice: 0 }]
  );

  const [payments, setPayments] = useState(invoice?.payments || []);
  const [loading, setLoading] = useState(false);
  const [lookupsLoading, setLookupsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [fieldErrors, setFieldErrors] = useState({});

  const [customers, setCustomers] = useState([]);
  const [salesOrders, setSalesOrders] = useState([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState(
    invoice?.customer_id ? String(invoice.customer_id) : ''
  );
  const [selectedSalesOrderId, setSelectedSalesOrderId] = useState(
    linkedSalesOrderId
      ? String(linkedSalesOrderId)
      : invoice?.sales_order_id
      ? String(invoice.sales_order_id)
      : ''
  );

  const [itemsLocked, setItemsLocked] = useState(Boolean(invoice?.sales_order_id));
  const [customerSearch, setCustomerSearch] = useState(invoice?.customer || '');
  const [showCustomerResults, setShowCustomerResults] = useState(false);
  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const customerDropdownRef = useRef(null);
  
  // New states for selective item import
  const [showItemSelector, setShowItemSelector] = useState(false);
  const [tempSelectedOrderId, setTempSelectedOrderId] = useState('');

  useEffect(() => {
    let mounted = true;
    const loadLookups = async () => {
      try {
        setLookupsLoading(true);
        const requests = [getCustomers(0, 200), getSalesOrders()];
        if (!invoice?.invoiceNo && !invoice?.invoice_no) {
          requests.push(getNextInvoiceNumber());
        }
        const [customersRes, salesOrdersRes, nextNumberRes] = await Promise.all(requests);
        if (!mounted) return;

        const customersList = customersRes?.data || customersRes || [];
        setCustomers(Array.isArray(customersList) ? customersList : []);

        const ordersList = Array.isArray(salesOrdersRes) ? salesOrdersRes : [];
        const openOrders = ordersList.filter(
          (order) => !['INVOICED', 'CANCELLED', 'VOID'].includes(String(order.status || '').toUpperCase())
        );
        setSalesOrders(openOrders);

        if (!invoice && nextNumberRes?.invoiceNo) {
          setFormData((prev) => ({ ...prev, invoiceNo: nextNumberRes.invoiceNo }));
        }
      } catch (loadErr) {
        console.error('تعذر تحميل بيانات العملاء وأوامر البيع:', loadErr);
      } finally {
        if (mounted) setLookupsLoading(false);
      }
    };

    loadLookups();
    return () => {
      mounted = false;
    };
  }, [invoice]);

  useEffect(() => {
    if (!selectedCustomerId) return;
    const foundCustomer = (customers || []).find((customer) => String(customer.id) === String(selectedCustomerId));
    if (foundCustomer) {
      setFormData((prev) => ({ ...prev, customer: foundCustomer.name || '' }));
      setCustomerSearch(foundCustomer.name || '');
    }
  }, [selectedCustomerId, customers]);

  useEffect(() => {
    const handler = (event) => {
      if (!customerDropdownRef.current) return;
      if (!customerDropdownRef.current.contains(event.target)) {
        setShowCustomerResults(false);
      }
    };

    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const activeCustomers = useMemo(() => {
    const list = Array.isArray(customers) ? customers : [];
    return list.filter(
      (customer) =>
        customer &&
        typeof customer === 'object' &&
        customer.is_active !== false &&
        String(customer.status || '').toUpperCase() !== 'INACTIVE'
    );
  }, [customers]);

  const customerSearchResults = useMemo(() => {
    const query = (customerSearch || '').trim().toLowerCase();
    if (!query) return activeCustomers.slice(0, 8);
    return activeCustomers
      .filter((customer) => {
        const name = (customer.name || '').toLowerCase();
        const phone = (customer.phone || '').toLowerCase();
        const email = (customer.email || '').toLowerCase();
        return name.includes(query) || phone.includes(query) || email.includes(query);
      })
      .slice(0, 8);
  }, [activeCustomers, customerSearch]);

  const populateFromSalesOrder = (salesOrder) => {
    if (!salesOrder) return;
    const rawItems = Array.isArray(salesOrder.items) ? salesOrder.items : [];
    const baseId = Date.now();
    const mapped = rawItems.map((item, index) => {
      const qty = Number(item.qty ?? item.quantity ?? 1) || 1;
      const unitPrice = Number(item.unit_price_usd ?? item.unitPrice ?? item.sale_price ?? 0) || 0;
      return {
        id: baseId + index,
        description: item.product?.name || item.product_name || `بند ${index + 1}`,
        qty,
        unitPrice,
      };
    });

    setItems(mapped.length ? mapped : [{ id: Date.now(), description: '', qty: 1, unitPrice: 0 }]);
    setItemsLocked(true);

    if (salesOrder.customer_id) {
      setSelectedCustomerId(String(salesOrder.customer_id));
    }

    const customerName =
      (salesOrder.customer && typeof salesOrder.customer === 'object'
        ? salesOrder.customer.name
        : salesOrder.customer) ||
      salesOrder.customer_name ||
      '';
    if (customerName) {
      setFormData((prev) => ({
        ...prev,
        customer: customerName,
        issueDate: prev.issueDate || new Date().toISOString().split('T')[0],
      }));
      setCustomerSearch(customerName);
    }
  };

  const lineTotal = (qty, price) => (Number(qty) || 0) * (Number(price) || 0);
  const subtotal = () => items.reduce((sum, item) => sum + lineTotal(item.qty, item.unitPrice), 0);
  const taxAmount = () => subtotal() * ((Number(formData.tax) || 0) / 100);
  const total = () => subtotal() + taxAmount();
  const paid = () =>
    payments.reduce((sum, payment) => sum + (typeof payment.amount === 'number' ? payment.amount : 0), 0);
  const balance = () => total() - paid();

  const validateForm = () => {
    const errors = {};
    if (!String(formData.invoiceNo || '').trim()) errors.invoiceNo = 'رقم الفاتورة مطلوب';
    if (!String(formData.customer || '').trim()) errors.customer = 'اسم العميل مطلوب';
    if (!formData.issueDate) errors.issueDate = 'تاريخ الإصدار مطلوب';
    if (!formData.dueDate) errors.dueDate = 'تاريخ الاستحقاق مطلوب';
    if (formData.issueDate && formData.dueDate) {
      if (new Date(formData.dueDate) < new Date(formData.issueDate)) {
        errors.dueDate = 'تاريخ الاستحقاق لا يمكن أن يسبق تاريخ الإصدار';
      }
    }
    if (Number(formData.tax) < 0) errors.tax = 'نسبة الضريبة لا يمكن أن تكون سالبة';
    if (Number(formData.tax) > 100) errors.tax = 'نسبة الضريبة لا يمكن أن تتجاوز 100%';

    items.forEach((item, index) => {
      if (!String(item.description || '').trim()) {
        errors[`item_${item.id}_description`] = `وصف البند (بند ${index + 1}) مطلوب`;
      }

      // التحقق من الكمية
      const qty = Number(item.qty);
      if (item.qty === undefined || item.qty === null || item.qty === '') {
        errors[`item_${item.id}_qty`] = `الكمية للبند ${index + 1} مطلوبة`;
      } else if (isNaN(qty)) {
        errors[`item_${item.id}_qty`] = `الكمية للبند ${index + 1} يجب أن تكون رقماً`;
      } else if (qty < 0) {
        errors[`item_${item.id}_qty`] = `الكمية للبند ${index + 1} لا يمكن أن تكون سالبة`;
      }

      // التحقق من سعر الوحدة
      const price = Number(item.unitPrice);
      if (item.unitPrice === undefined || item.unitPrice === null || item.unitPrice === '') {
        errors[`item_${item.id}_unitPrice`] = `سعر الوحدة للبند ${index + 1} مطلوب`;
      } else if (isNaN(price)) {
        errors[`item_${item.id}_unitPrice`] = `سعر الوحدة للبند ${index + 1} يجب أن يكون رقماً`;
      } else if (price < 0) {
        errors[`item_${item.id}_unitPrice`] = `سعر الوحدة للبند ${index + 1} لا يمكن أن يكون سالباً`;
      }
    });

    return errors;
  };

  const handleChange = (event) => {
    const { name, value } = event.target;
    if (name === 'invoiceNo') return;
    setFormData((prev) => ({ ...prev, [name]: name === 'tax' ? parseFloat(value) || 0 : value }));
    if (fieldErrors[name]) setFieldErrors((prevErrors) => ({ ...prevErrors, [name]: '' }));
  };

  const handleItemChange = (id, field, value) => {
    if (itemsLocked) return;
    setItems((prev) =>
      prev.map((item) =>
        item.id === id
          ? {
              ...item,
              [field]: field === 'qty' || field === 'unitPrice' ? parseFloat(value) || 0 : value,
            }
          : item
      )
    );
    if (fieldErrors[`item_${id}_${field}`]) {
      setFieldErrors((prevErrors) => ({ ...prevErrors, [`item_${id}_${field}`]: '' }));
    }
  };

  const addItem = () => {
    if (itemsLocked) return;
    setItems((prev) => [...prev, { id: Date.now(), description: '', qty: 1, unitPrice: 0 }]);
  };

  const removeItem = (id) => {
    if (itemsLocked) return;
    if (items.length <= 1) return;
    setItems((prev) => prev.filter((item) => item.id !== id));
  };

  const handleCustomerSearchChange = (event) => {
    const value = event.target.value;
    setCustomerSearch(value);
    setShowCustomerResults(true);
    if (selectedCustomerId) setSelectedCustomerId('');
    if (formData.customer) setFormData((prev) => ({ ...prev, customer: '' }));
    if (fieldErrors.customer) setFieldErrors((prevErrors) => ({ ...prevErrors, customer: '' }));
  };

  const handleCustomerPick = (customer) => {
    if (!customer) return;
    setSelectedCustomerId(String(customer.id));
    setFormData((prev) => ({ ...prev, customer: customer.name || '' }));
    setCustomerSearch(customer.name || '');
    setShowCustomerResults(false);
    setFieldErrors((prevErrors) => ({ ...prevErrors, customer: '' }));
  };

  const clearCustomer = () => {
    setSelectedCustomerId('');
    setFormData((prev) => ({ ...prev, customer: '' }));
    setCustomerSearch('');
    setShowCustomerResults(false);
  };

  const clearSalesOrder = () => {
    setSelectedSalesOrderId('');
    setItemsLocked(false);
  };

  const handleSalesOrderSelectChange = async (event) => {
    const value = event.target.value;
    setSelectedSalesOrderId(value);
    if (!value) {
      setItemsLocked(false);
      return;
    }
    try {
      setLookupsLoading(true);
      const salesOrder = await getSalesOrder(value);
      
      // Show item selector instead of automatically importing all items
      setTempSelectedOrderId(value);
      setShowItemSelector(true);
      
    } catch (salesOrderErr) {
      console.error('تعذر تحميل أمر البيع:', salesOrderErr);
    } finally {
      setLookupsLoading(false);
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
      const salesOrder = await getSalesOrder(tempSelectedOrderId);
      if (!salesOrder) {
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
      const customerName = salesOrder.customer?.name || salesOrder.customer_name || '';
      const customerId = salesOrder.customer_id || null;
      const project = salesOrder.project || '';

      // Set customer data properly
      if (customerId) {
        setSelectedCustomerId(String(customerId));
      }

      // Update form data
      setFormData(prev => ({
        ...prev,
        customer: customerName,
        project: project
      }));

      // Update customer search field
      setCustomerSearch(customerName);

      // Lock items to prevent editing when imported from sales order
      setItemsLocked(true);

      // Set the linked sales order
      setSelectedSalesOrderId(tempSelectedOrderId);

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
    if (!selectedSalesOrderId) return;
    
    setTempSelectedOrderId(selectedSalesOrderId);
    setShowItemSelector(true);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError(null);
    const validationErrors = validateForm();
    if (Object.keys(validationErrors).length) {
      setFieldErrors(validationErrors);
      setLoading(false);
      return;
    }

    try {
      const payload = {
        invoice_no: formData.invoiceNo || undefined,
        issue_date: formData.issueDate,
        due_date: formData.dueDate || null,
        status: formData.status,
        tax_pct: typeof formData.tax === 'number' ? formData.tax : 0,
        currency: 'USD',
        subtotal_usd: subtotal(),
        tax_amount_usd: taxAmount(),
        total_usd: total(),
      };

      const customerId = selectedCustomerId
        ? parseInt(selectedCustomerId, 10)
        : invoice?.customer_id ?? null;
      if (customerId) payload.customer_id = customerId;

      const linkedSalesOrder = selectedSalesOrderId
        ? parseInt(selectedSalesOrderId, 10)
        : linkedSalesOrderId
        ? parseInt(linkedSalesOrderId, 10)
        : invoice?.sales_order_id ?? null;
      if (linkedSalesOrder) payload.sales_order_id = linkedSalesOrder;

      const result = invoice?.id ? await updateInvoice(invoice.id, payload) : await createInvoice(payload);
      onSave(result);
    } catch (submitErr) {
      if (submitErr?.response?.status === 422) {
        const backendErrors = submitErr.response.data.detail || [];
        const mappedErrors = {};
        backendErrors.forEach((err) => {
          if (err.loc && err.loc.length > 1) mappedErrors[err.loc[1]] = err.msg;
        });
        setFieldErrors(mappedErrors);
      } else {
        setError(submitErr?.response?.data?.detail || 'حدث خطأ غير متوقع أثناء حفظ الفاتورة.');
      }
      console.error('خطأ غير متوقع عند حفظ الفاتورة:', submitErr);
    } finally {
      setLoading(false);
    }
  };

  const subtotalValue = subtotal();
  const taxValue = taxAmount();
  const totalValue = total();
  const statusLabel = INVOICE_STATUS_LABELS[formData.status] || INVOICE_STATUS_LABELS.DRAFT || formData.status;
  const statusTone = INVOICE_STATUS_STYLES[formData.status] || 'bg-white/20 text-white border-white/10';
  const invoiceHeading = formData.invoiceNo ? `فاتورة رقم ${formData.invoiceNo}` : 'فاتورة جديدة';
  const heroSubtitle = invoice ? 'تحرير تفاصيل الفاتورة الحالية' : 'أكمل بيانات الفاتورة خطوة بخطوة';
  const heroCustomerName = (customerSearch || formData.customer || '').trim() || '?';
  const heroIssueDate = formData.issueDate || '?';
  const heroDueDate = formData.dueDate || '?';
  const paymentsBadgeText = payments.length ? `${payments.length} دفعة مسجلة` : 'لا توجد دفعات بعد';
  const formattedSubtotal = subtotalValue.toLocaleString('en-US', numberFormatterOptions);
  const formattedTax = taxValue.toLocaleString('en-US', numberFormatterOptions);
  const formattedTotal = totalValue.toLocaleString('en-US', numberFormatterOptions);

  const baseInputClasses =
    'w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm transition focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200';
  const errorInputClasses = 'border-rose-400 focus:border-rose-400 focus:ring-rose-200';
  const disabledInputClasses = 'bg-slate-100 text-slate-500 cursor-not-allowed';
  const tableInputClasses =
    'w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm transition focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200';

  return (
    <div className="space-y-10">
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white shadow-2xl">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.12),transparent_60%)]" aria-hidden="true" />
        <div className="absolute -bottom-12 -left-12 h-56 w-56 rounded-full bg-emerald-500/20 blur-3xl" aria-hidden="true" />
        <div className="relative z-10 space-y-8 p-6 sm:p-8 lg:p-10">
          <div className="flex flex-wrap items-start justify-between gap-6">
            <div>
              <p className="text-sm text-white/70">{heroSubtitle}</p>
              <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">{invoiceHeading}</h1>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <span className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium ${statusTone}`}>
                <span className="h-2.5 w-2.5 rounded-full bg-current/80" />
                {statusLabel}
              </span>
              <span className="inline-flex items-center rounded-full border border-white/20 bg-white/10 px-4 py-2 text-sm font-medium text-white/80">
                {paymentsBadgeText}
              </span>
            </div>
          </div>
          <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-2xl border border-white/15 bg-white/10 p-4 backdrop-blur-sm">
              <dt className="text-xs font-medium text-white/70">تاريخ الإصدار</dt>
              <dd className="mt-2 text-lg font-semibold tracking-wide">{heroIssueDate}</dd>
            </div>
            <div className="rounded-2xl border border-white/15 bg-white/10 p-4 backdrop-blur-sm">
              <dt className="text-xs font-medium text-white/70">تاريخ الاستحقاق</dt>
              <dd className="mt-2 text-lg font-semibold tracking-wide">{heroDueDate}</dd>
            </div>
            <div className="rounded-2xl border border-white/15 bg-white/10 p-4 backdrop-blur-sm">
              <dt className="text-xs font-medium text-white/70">العميل</dt>
              <dd className="mt-2 text-lg font-semibold tracking-wide">{heroCustomerName}</dd>
            </div>
            <div className="rounded-2xl border border-white/15 bg-white/10 p-4 backdrop-blur-sm">
              <dt className="text-xs font-medium text-white/70">إجمالي الفاتورة</dt>
              <dd className="mt-2 text-2xl font-bold">{formattedTotal}</dd>
            </div>
          </dl>
        </div>
      </section>

      <form onSubmit={handleSubmit} className="space-y-8">
        {error && (
          <div className="rounded-2xl border border-rose-200 bg-rose-50/80 px-4 py-3 text-sm font-medium text-rose-700 shadow-sm">
            {error}
          </div>
        )}

        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 bg-slate-50 px-6 py-5">
            <h2 className="text-lg font-semibold text-slate-900">تفاصيل الفاتورة</h2>
            <p className="mt-1 text-sm text-slate-500">راجع رقم الفاتورة، التواريخ، وحالة الفاتورة.</p>
          </div>
          <div className="grid gap-6 px-6 py-6 sm:grid-cols-2 xl:grid-cols-4">
            <div className="flex flex-col gap-2">
              <label htmlFor="invoiceNo" className="text-sm font-medium text-slate-700">
                رقم الفاتورة *
              </label>
              <input
                type="text"
                id="invoiceNo"
                name="invoiceNo"
                value={formData.invoiceNo}
                readOnly
                className={`${baseInputClasses} ${disabledInputClasses}`}
                required
              />
              {fieldErrors.invoiceNo && <p className="text-xs text-rose-600">{fieldErrors.invoiceNo}</p>}
            </div>
            <div className="flex flex-col gap-2">
              <label htmlFor="issueDate" className="text-sm font-medium text-slate-700">
                تاريخ الإصدار *
              </label>
              <input
                type="date"
                id="issueDate"
                name="issueDate"
                value={formData.issueDate}
                onChange={handleChange}
                className={`${baseInputClasses} ${fieldErrors.issueDate ? errorInputClasses : ''}`}
                required
              />
              {fieldErrors.issueDate && <p className="text-xs text-rose-600">{fieldErrors.issueDate}</p>}
            </div>
            <div className="flex flex-col gap-2">
              <label htmlFor="dueDate" className="text-sm font-medium text-slate-700">
                تاريخ الاستحقاق *
              </label>
              <input
                type="date"
                id="dueDate"
                name="dueDate"
                value={formData.dueDate}
                onChange={handleChange}
                className={`${baseInputClasses} ${fieldErrors.dueDate ? errorInputClasses : ''}`}
                required
              />
              {fieldErrors.dueDate && <p className="text-xs text-rose-600">{fieldErrors.dueDate}</p>}
            </div>
            <div className="flex flex-col gap-2">
              <label htmlFor="status" className="text-sm font-medium text-slate-700">
                حالة الفاتورة
              </label>
              <select
                id="status"
                name="status"
                value={formData.status}
                onChange={handleChange}
                className={`${baseInputClasses} appearance-none`}
              >
                <option value="DRAFT">مسودة</option>
                <option value="ISSUED">صادرة</option>
                <option value="PARTIALLY_PAID">مدفوعة جزئياً</option>
                <option value="PAID">مدفوعة</option>
                <option value="OVERDUE">متأخرة</option>
                <option value="VOID">ملغاة</option>
              </select>
            </div>
          </div>
        </section>

        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 bg-slate-50 px-6 py-5">
            <h2 className="text-lg font-semibold text-slate-900">العميل وربط الفاتورة</h2>
            <p className="mt-1 text-sm text-slate-500">ابحث عن العميل أو أضف عميلًا جديدًا، واربط الفاتورة بأمر بيع جاهز.</p>
          </div>
          <div className="space-y-6 px-6 py-6">
            <div ref={customerDropdownRef} className="space-y-2">
              <label htmlFor="customerSearch" className="text-sm font-medium text-slate-700">
                العميل *
              </label>
              <div className="relative">
                <input
                  type="text"
                  id="customerSearch"
                  value={customerSearch}
                  onChange={handleCustomerSearchChange}
                  onFocus={() => setShowCustomerResults(true)}
                  placeholder="ابحث عن اسم العميل أو رقم الهاتف..."
                  autoComplete="off"
                  className={`${baseInputClasses} ${fieldErrors.customer ? errorInputClasses : ''}`}
                />
                {showCustomerResults && customerSearchResults.length > 0 && (
                  <ul className="absolute z-20 mt-2 max-h-60 w-full overflow-auto rounded-2xl border border-slate-200 bg-white shadow-xl">
                    {customerSearchResults.map((customer) => (
                      <li key={customer.id} className="border-b border-slate-100 last:border-0">
                        <button
                          type="button"
                          onClick={() => handleCustomerPick(customer)}
                          className="flex w-full flex-col items-start gap-1 px-4 py-3 text-right transition hover:bg-slate-50"
                        >
                          <span className="text-sm font-semibold text-slate-800">{customer.name}</span>
                          {(customer.phone || customer.email) && (
                            <span className="text-xs text-slate-500">{customer.phone || customer.email}</span>
                          )}
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
                {showCustomerResults && customerSearchResults.length === 0 && customerSearch.trim() && (
                  <div className="absolute z-20 mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-500 shadow-xl">
                    لا توجد نتائج مطابقة
                  </div>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={clearCustomer}
                  className="rounded-full border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-600 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
                  disabled={!customerSearch}
                >
                  مسح الاختيار
                </button>
                <button
                  type="button"
                  onClick={() => setShowCustomerModal(true)}
                  className="rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-700"
                >
                  + إنشاء عميل جديد
                </button>
              </div>
              {fieldErrors.customer && <p className="text-xs text-rose-600">{fieldErrors.customer}</p>}
            </div>

            <div className="grid gap-4 lg:grid-cols-[2fr,1fr]">
              <div className="flex flex-col gap-2">
                <label htmlFor="salesOrder" className="text-sm font-medium text-slate-700">
                  ربط بأمر بيع
                </label>
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                  <select
                    id="salesOrder"
                    name="salesOrder"
                    value={selectedSalesOrderId}
                    onChange={handleSalesOrderSelectChange}
                    className={`${baseInputClasses} appearance-none sm:flex-1`}
                    disabled={lookupsLoading}
                  >
                    <option value="">{lookupsLoading ? 'جارٍ التحميل...' : 'بدون ربط'}</option>
                    {salesOrders.map((order) => {
                      const number = order.so_no || order.soNo || order.reference || `SO-${order.id}`;
                      const status = String(order.status || '').toUpperCase();
                      const statusText = SALES_ORDER_STATUS_LABELS[status] || status;
                      return (
                        <option key={order.id} value={order.id}>{`${number} • ${statusText}`}</option>
                      );
                    })}
                  </select>
                  {selectedSalesOrderId && (
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={handleSelectItemsFromOrder}
                        className="rounded-full border border-blue-300 bg-blue-50 px-3 py-1.5 text-sm font-medium text-blue-700 transition hover:bg-blue-100"
                      >
                        اختيار البنود
                      </button>
                      <button
                        type="button"
                        onClick={clearSalesOrder}
                        className="rounded-full border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-600 transition hover:bg-slate-100"
                      >
                        إزالة الربط
                      </button>
                    </div>
                  )}
                </div>
              </div>
              <div className="flex flex-col gap-2">
                <label htmlFor="tax" className="text-sm font-medium text-slate-700">
                  نسبة الضريبة (%)
                </label>
                <input
                  type="number"
                  id="tax"
                  name="tax"
                  min={0}
                  max={100}
                  step={0.01}
                  value={formData.tax}
                  onChange={handleChange}
                  className={`${baseInputClasses} ${fieldErrors.tax ? errorInputClasses : ''}`}
                />
                {fieldErrors.tax && <p className="text-xs text-rose-600">{fieldErrors.tax}</p>}
              </div>
            </div>

            <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/60 px-4 py-3 text-sm text-slate-600">
              {itemsLocked
                ? 'تم قفل البنود لأنها مستوردة من أمر البيع. قم بإزالة الربط لتحرير البنود.'
                : 'يمكنك ربط الفاتورة بأمر بيع لاستيراد البنود تلقائياً أو إضافة البنود يدوياً أدناه.'}
            </div>
          </div>
        </section>

        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 bg-slate-50 px-6 py-5">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">بنود الفاتورة</h2>
              <p className="mt-1 text-sm text-slate-500">أدخل وصف كل بند، الكمية، وسعر الوحدة لحساب الإجمالي تلقائياً.</p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              {itemsLocked && (
                <span className="inline-flex items-center rounded-full border border-amber-300 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">
                  البنود مقفلة من أمر البيع
                </span>
              )}
              <button
                type="button"
                onClick={addItem}
                disabled={itemsLocked}
                className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition ${
                  itemsLocked
                    ? 'cursor-not-allowed border border-slate-200 bg-slate-100 text-slate-400'
                    : 'border border-transparent bg-emerald-600 text-white shadow-sm hover:bg-emerald-700'
                }`}
              >
                <span className="text-lg leading-none">+</span>
                إضافة بند
              </button>
            </div>
          </div>
          <div className="px-4 py-4 sm:px-6">
            <div className="overflow-x-auto">
              <table className="min-w-full border-separate border-spacing-y-3 text-sm text-slate-700">
                <thead>
                  <tr className="text-xs uppercase tracking-wide text-slate-500">
                    <th className="rounded-r-xl bg-slate-100/80 px-4 py-3 text-right font-semibold">وصف البند</th>
                    <th className="bg-slate-100/80 px-4 py-3 text-right font-semibold">الكمية</th>
                    <th className="bg-slate-100/80 px-4 py-3 text-right font-semibold">سعر الوحدة</th>
                    <th className="bg-slate-100/80 px-4 py-3 text-right font-semibold">الإجمالي الفرعي</th>
                    <th className="rounded-l-xl bg-slate-100/80 px-4 py-3 text-center font-semibold">إجراءات</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item) => (
                    <tr key={item.id} className="bg-white shadow-sm ring-1 ring-slate-100">
                      <td className="align-top px-4 py-3">
                        <input
                          type="text"
                          value={item.description}
                          onChange={(event) => handleItemChange(item.id, 'description', event.target.value)}
                          disabled={itemsLocked}
                          readOnly={itemsLocked}
                          className={`${tableInputClasses} ${itemsLocked ? disabledInputClasses : ''} ${
                            fieldErrors[`item_${item.id}_description`] ? errorInputClasses : ''
                          }`}
                          required
                        />
                        {fieldErrors[`item_${item.id}_description`] && (
                          <p className="mt-2 text-xs text-rose-600">{fieldErrors[`item_${item.id}_description`]}</p>
                        )}
                      </td>
                      <td className="align-top px-4 py-3">
                        <input
                          type="number"
                          min={0}
                          step={0.001}
                          value={item.qty}
                          onChange={(event) => handleItemChange(item.id, 'qty', event.target.value)}
                          disabled={itemsLocked}
                          readOnly={itemsLocked}
                          className={`${tableInputClasses} ${itemsLocked ? disabledInputClasses : ''} ${
                            fieldErrors[`item_${item.id}_qty`] ? errorInputClasses : ''
                          }`}
                          required
                        />
                        {fieldErrors[`item_${item.id}_qty`] && (
                          <p className="mt-2 text-xs text-rose-600">{fieldErrors[`item_${item.id}_qty`]}</p>
                        )}
                      </td>
                      <td className="align-top px-4 py-3">
                        <input
                          type="number"
                          min={0}
                          step={0.01}
                          value={item.unitPrice}
                          onChange={(event) => handleItemChange(item.id, 'unitPrice', event.target.value)}
                          disabled={itemsLocked}
                          readOnly={itemsLocked}
                          className={`${tableInputClasses} ${itemsLocked ? disabledInputClasses : ''} ${
                            fieldErrors[`item_${item.id}_unitPrice`] ? errorInputClasses : ''
                          }`}
                          required
                        />
                        {fieldErrors[`item_${item.id}_unitPrice`] && (
                          <p className="mt-2 text-xs text-rose-600">{fieldErrors[`item_${item.id}_unitPrice`]}</p>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="text-sm font-semibold text-slate-900">{lineTotal(item.qty, item.unitPrice).toFixed(2)}</div>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <button
                          type="button"
                          onClick={() => removeItem(item.id)}
                          disabled={items.length <= 1 || itemsLocked}
                          className={`rounded-full px-3 py-1 text-sm font-semibold transition ${
                            items.length <= 1 || itemsLocked
                              ? 'cursor-not-allowed border border-slate-200 bg-slate-100 text-slate-400'
                              : 'border border-rose-200 bg-rose-50 text-rose-600 hover:bg-rose-100'
                          }`}
                        >
                          حذف
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="grid gap-4 px-6 py-6 sm:grid-cols-2 lg:grid-cols-3">
            <div className="flex items-center gap-3 rounded-xl border border-slate-100 bg-slate-50/80 p-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-200 text-slate-600">Σ</div>
              <div>
                <p className="text-xs font-medium text-slate-500">الإجمالي قبل الضريبة</p>
                <p className="mt-1 text-xl font-semibold text-slate-900">{formattedSubtotal}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 rounded-xl border border-slate-100 bg-amber-50/70 p-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-200 text-amber-700">%</div>
              <div>
                <p className="text-xs font-medium text-amber-700">قيمة الضريبة ({formData.tax || 0}%)</p>
                <p className="mt-1 text-xl font-semibold text-amber-700">{formattedTax}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 rounded-xl border border-slate-100 bg-emerald-50/70 p-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-200 text-emerald-700">∑</div>
              <div>
                <p className="text-xs font-medium text-emerald-700">الإجمالي النهائي</p>
                <p className="mt-1 text-2xl font-bold text-emerald-700">{formattedTotal}</p>
              </div>
            </div>
          </div>
          <div className="flex flex-col gap-3 border-t border-slate-100 bg-slate-50/60 px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-slate-600">
              تأكد من مراجعة البنود والعميل قبل حفظ الفاتورة. يمكن تعديل التفاصيل لاحقاً عند الحاجة.
            </p>
            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={onCancel}
                className="rounded-full border border-slate-300 px-5 py-2 text-sm font-semibold text-slate-600 transition hover:bg-white"
                disabled={loading}
              >
                رجوع
              </button>
              <button
                type="submit"
                className="rounded-full bg-slate-900 px-6 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
                disabled={loading}
              >
                {loading ? 'جارٍ الحفظ...' : invoice ? 'تحديث الفاتورة' : 'حفظ الفاتورة'}
              </button>
            </div>
          </div>
        </section>
      </form>

      {showCustomerModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 px-4 py-6 backdrop-blur-sm">
          <div className="w-full max-w-3xl overflow-hidden rounded-2xl bg-white shadow-2xl">
            <CustomerForm
              customer={null}
              onSave={(customer) => {
                setShowCustomerModal(false);
                if (customer) handleCustomerPick(customer);
              }}
              onCancel={() => setShowCustomerModal(false)}
            />
          </div>
        </div>
      )}

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
          loading={lookupsLoading}
        />
      )}
    </div>
  );
};

export default InvoiceForm;
