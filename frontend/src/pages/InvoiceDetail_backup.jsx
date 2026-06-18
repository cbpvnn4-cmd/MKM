import React, { useMemo } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { ArrowLeft, FilePlus, DollarSign, ClipboardList, FileText, Printer, Download } from 'lucide-react';
import Layout from '../components/Layout';
import InvoiceForm from '../components/InvoiceForm';
import InvoicePDF from '../components/pdf/InvoicePDF';
import usePdfPrint from '../hooks/usePdfPrint';
import { getInvoice, getSalesOrder, getSalesInvoicePayments, addSalesInvoicePayment, deleteSalesInvoicePayment, getProduct } from '../services/api';

const statusLabels = {
  DRAFT: 'مسودة',
  ISSUED: 'صادرة',
  PARTIALLY_PAID: 'مدفوعة جزئياً',
  PAID: 'مدفوعة',
  OVERDUE: 'متأخرة',
  VOID: 'ملغاة',
};

const statusColorMap = {
  DRAFT: 'text-gray-600',
  ISSUED: 'text-blue-600',
  PARTIALLY_PAID: 'text-amber-600',
  PAID: 'text-emerald-600',
  OVERDUE: 'text-red-600',
  VOID: 'text-gray-500',
};

const formatCurrency = (value) => {
  const amount = typeof value === 'number' ? value : 0;
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
};

const InvoiceDetail = () => {
  const navigate = useNavigate();
  const { id: routeId } = useParams();
  const [searchParams] = useSearchParams();
  const [invoice, setInvoice] = React.useState(null);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState(null);
  const [prefillInvoice, setPrefillInvoice] = React.useState(null);
  const [linkedSalesOrderId, setLinkedSalesOrderId] = React.useState(null);
  const [salesOrderDetails, setSalesOrderDetails] = React.useState(null);
  const [productDetails, setProductDetails] = React.useState({});
  const [payments, setPayments] = React.useState([]);
  const [payLoading, setPayLoading] = React.useState(false);
  const [payError, setPayError] = React.useState(null);
  const [showPayForm, setShowPayForm] = React.useState(false);
  const [paymentForm, setPaymentForm] = React.useState({
    amount_usd: '',
    paid_on: new Date().toISOString().split('T')[0],
    method: 'CASH',
    note: ''
  });

  const invoiceId = routeId && routeId !== 'new' ? routeId : null;
  const salesOrderParam = !invoiceId ? searchParams.get('fromSalesOrder') : null;
  const isEditMode = Boolean(invoiceId);

  // Load payments when editing existing invoice
  React.useEffect(() => {
    const loadPayments = async () => {
      if (!invoiceId) return;
      try {
        setPayLoading(true);
        const data = await getSalesInvoicePayments(invoiceId);
        setPayments(Array.isArray(data) ? data : []);
        setPayError(null);
      } catch (e) {
        setPayError('فشل تحميل المدفوعات');
      } finally {
        setPayLoading(false);
      }
    };
    loadPayments();
  }, [invoiceId]);

  const refreshInvoice = React.useCallback(async () => {
    if (!invoiceId) return;
    try {
      const data = await getInvoice(invoiceId);
      setInvoice(data);
    } catch (_) {}
  }, [invoiceId]);

  const loadSalesOrderDetails = React.useCallback(async (orderId) => {
    if (!orderId) {
      setSalesOrderDetails(null);
      setProductDetails({});
      return null;
    }
    try {
      const data = await getSalesOrder(orderId);
      setSalesOrderDetails(data);
      const items = Array.isArray(data?.items) ? data.items : [];
      const uniqueProductIds = Array.from(
        new Set(
          items
            .map((item) => item?.product_id)
            .filter((value) => value !== undefined && value !== null)
        )
      );
      if (uniqueProductIds.length) {
        const results = await Promise.all(
          uniqueProductIds.map(async (id) => {
            try {
              const product = await getProduct(id);
              return [id, product];
            } catch (err) {
              console.error('Error fetching product info for invoice:', err);
              return null;
            }
          })
        );
        const map = {};
        results.forEach((entry) => {
          if (entry && entry[0] != null && entry[1]) {
            map[entry[0]] = entry[1];
          }
        });
        setProductDetails(map);
      } else {
        setProductDetails({});
      }
      return data;
    } catch (err) {
      console.error('Error loading linked sales order:', err);
      setSalesOrderDetails(null);
      setProductDetails({});
      return null;
    }
  }, []);

  const handleAddPayment = async (e) => {
    e?.preventDefault?.();
    if (!invoiceId) return;
    try {
      setPayLoading(true);
      const payload = {
        amount_usd: parseFloat(paymentForm.amount_usd) || 0,
        paid_on: paymentForm.paid_on,
        method: paymentForm.method,
        note: paymentForm.note || ''
      };
      await addSalesInvoicePayment(invoiceId, payload);
      setShowPayForm(false);
      setPaymentForm({ amount_usd: '', paid_on: new Date().toISOString().split('T')[0], method: 'CASH', note: '' });
      const list = await getSalesInvoicePayments(invoiceId);
      setPayments(Array.isArray(list) ? list : []);
      await refreshInvoice();
    } catch (e) {
      alert(e?.response?.data?.detail || 'خطأ في إضافة الدفعة');
    } finally {
      setPayLoading(false);
    }
  };

  const handleDeletePayment = async (paymentId) => {
    if (!window.confirm('هل أنت متأكد؟')) return;
    try {
      setPayLoading(true);
      await deleteSalesInvoicePayment(paymentId);
      const list = await getSalesInvoicePayments(invoiceId);
      setPayments(Array.isArray(list) ? list : []);
      await refreshInvoice();
    } catch (e) {
      alert(e?.response?.data?.detail || 'خطأ حذف الدفعة');
    } finally {
      setPayLoading(false);
    }
  };

  const buildInvoiceFromSalesOrder = React.useCallback((salesOrder) => {
    if (!salesOrder) {
      return null;
    }

    const orderType = String(salesOrder.order_type || salesOrder.orderType || 'items').toLowerCase();
    const rawItems = Array.isArray(salesOrder.items) ? salesOrder.items : [];
    const baseId = Date.now();

    const mappedItems = rawItems.map((item, index) => {
      const qty = Number(item.qty ?? item.quantity ?? 0) || 1;
      const unitPrice =
        Number(
          item.unit_price_usd ??
          item.unitPrice ??
          item.sale_price ??
          item.line_total_usd ??
          0
        ) || 0;
      const lineTotal =
        Number(item.line_total_usd ?? item.lineTotal ?? qty * unitPrice) || qty * unitPrice;

      let description = '';
      if (orderType === 'elevators') {
        const details = [];
        const sections = Number(item.sections ?? 0);
        if (sections > 0) details.push(`المقاطع: ${sections}`);
        const ropes = Number(item.ropes ?? 0);
        if (ropes > 0) details.push(`الرباط: ${ropes}`);
        const cable = Number(item.cable_meters ?? item.cable ?? 0);
        if (cable > 0) details.push(`الكابل (م): ${cable}`);
        const cabins = Number(item.cabins ?? 0);
        if (cabins > 0) details.push(`الكبائن: ${cabins}`);
        description = `مصعد ${index + 1}${details.length ? ` (${details.join(' | ')})` : ''}`;
      } else {
        description =
          item.product?.name ||
          item.product_name ||
          item.product ||
          `بند ${index + 1}`;
      }

      return {
        id: baseId + index,
        description,
        qty,
        unitPrice,
        lineTotal,
      };
    });

    const safeItems =
      mappedItems.length > 0
        ? mappedItems
        : [
            {
              id: Date.now(),
              description: '',
              qty: 1,
              unitPrice: 0,
              lineTotal: 0,
            },
          ];

    const total = safeItems.reduce((sum, current) => sum + (Number(current.lineTotal) || 0), 0);

    const resolveCustomerName = () => {
      const customer = salesOrder.customer;
      if (typeof customer === 'string') {
        return customer;
      }
      if (customer && typeof customer === 'object') {
        return customer.name || customer.displayName || '';
      }
      return (
        salesOrder.customer_name ||
        salesOrder.customerName ||
        salesOrder.client ||
        salesOrder.clientName ||
        ''
      );
    };

    return {
      invoiceNo: '',
      customer: resolveCustomerName(),
      project: salesOrder.project || '',
      issueDate: new Date().toISOString().split('T')[0],
      dueDate: '',
      status: 'DRAFT',
      tax: 0,
      items: safeItems,
      payments: [],
      total,
      paid: 0,
      balance: total,
      sales_order_id: salesOrder.id,
      sourceSalesOrderNo: salesOrder.so_no || salesOrder.soNo || '',
    };
  }, []);

  const computeItemsTotal = React.useCallback((inv) => {
    if (!inv || !Array.isArray(inv.items)) {
      return 0;
    }
    return inv.items.reduce((sum, item) => {
      const qty = Number(item.qty ?? 0) || 0;
      const unitPrice = Number(item.unitPrice ?? item.unit_price_usd ?? 0) || 0;
      const lineTotal = Number(item.lineTotal ?? item.line_total_usd ?? qty * unitPrice) || qty * unitPrice;
      return sum + lineTotal;
    }, 0);
  }, []);

  const fetchInvoice = React.useCallback(async (targetId) => {
    try {
      setLoading(true);
      const data = await getInvoice(targetId);
      setInvoice(data);
      setLinkedSalesOrderId(data?.sales_order_id ?? null);
      setPrefillInvoice(null);
      setError(null);
    } catch (err) {
      setError('فشل تحميل بيانات الفاتورة');
      console.error('خطأ تحميل بيانات الفاتورة:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    if (!invoiceId) {
      setInvoice(null);
      setError(null);
      setLoading(false);
      setSalesOrderDetails(null);
      return;
    }

    fetchInvoice(invoiceId);
  }, [invoiceId, fetchInvoice]);

  React.useEffect(() => {
    if (!salesOrderParam) {
      // Create empty invoice for new invoice page without sales order
      if (!invoiceId) {
        setPrefillInvoice({
          invoiceNo: '',
          customer: '',
          project: '',
          issueDate: new Date().toISOString().split('T')[0],
          dueDate: '',
          status: 'DRAFT',
          tax: 0,
          items: [{ id: Date.now(), description: '', qty: 1, unitPrice: 0 }],
          payments: [],
          total: 0,
          paid: 0,
          balance: 0,
        });
      } else {
        setPrefillInvoice(null);
      }
      setLinkedSalesOrderId(null);
      setSalesOrderDetails(null);
      return;
    }

    let isMounted = true;

    const loadSalesOrder = async () => {
      try {
        setLoading(true);
        const data = await loadSalesOrderDetails(salesOrderParam);
        if (!isMounted) return;
        if (data) {
          const prepared = buildInvoiceFromSalesOrder(data);
          setPrefillInvoice(prepared);
          setLinkedSalesOrderId(data?.id || null);
          setError(null);
        } else {
          setPrefillInvoice(null);
          setLinkedSalesOrderId(null);
        }
      } catch (err) {
        console.error('Error preparing invoice from sales order:', err);
        if (isMounted) {
          setError('فشل تحميل البيانات من أمر البيع المحدد.');
          setPrefillInvoice(null);
          setLinkedSalesOrderId(null);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadSalesOrder();

    return () => {
      isMounted = false;
    };
  }, [salesOrderParam, buildInvoiceFromSalesOrder, invoiceId]);

  React.useEffect(() => {
    if (!linkedSalesOrderId) {
      if (!salesOrderParam) {
        setSalesOrderDetails(null);
      }
      return;
    }

    if (salesOrderDetails && Number(salesOrderDetails.id) === Number(linkedSalesOrderId)) {
      return;
    }

    loadSalesOrderDetails(linkedSalesOrderId);
  }, [linkedSalesOrderId, loadSalesOrderDetails, salesOrderDetails, salesOrderParam]);

  React.useEffect(() => {
    if (!invoiceId || !salesOrderDetails) {
      return;
    }

    setInvoice((current) => {
      if (!current) return current;
      const existingItems = Array.isArray(current.items) ? current.items : [];
      if (existingItems.length) {
        return current;
      }

      const derived = buildInvoiceFromSalesOrder(salesOrderDetails);
      if (derived?.items?.length) {
        return { ...current, items: derived.items };
      }

      return current;
    });
  }, [invoiceId, salesOrderDetails, buildInvoiceFromSalesOrder]);

  const handleSave = async () => {
    navigate('/invoices');
  };

  const handleCancel = () => {
    navigate('/invoices');
  };

  const activeInvoice = invoiceId ? invoice : prefillInvoice;
  const pdfFileName = React.useMemo(
    () => `Invoice_${activeInvoice?.invoice_no || activeInvoice?.invoiceNo || 'draft'}.pdf`,
    [activeInvoice]
  );

  const { print: handlePrint, download: handleExportPDF, printing, downloading } = usePdfPrint({
    createDocument: () => <InvoicePDF invoice={activeInvoice} />,
    fileName: pdfFileName,
  });

  const statusDisplay = activeInvoice?.status ? (statusLabels[activeInvoice.status] || activeInvoice.status) : 'مسودة';
  const statusColor = activeInvoice?.status ? (statusColorMap[activeInvoice.status] || 'text-purple-600') : 'text-purple-600';
  const itemsTotal = computeItemsTotal(activeInvoice);
  const totalAmount = activeInvoice
    ? (typeof activeInvoice.total === 'number' ? activeInvoice.total : itemsTotal)
    : 0;
  const paidAmount = activeInvoice && typeof activeInvoice.paid === 'number' ? activeInvoice.paid : 0;
  const balanceAmount =
    activeInvoice && typeof activeInvoice.balance === 'number'
      ? activeInvoice.balance
      : totalAmount - paidAmount;

  if (loading) {
    return (
      <Layout>
        <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex items-center justify-center px-4">
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 px-8 py-10 text-center">
            <div className="mb-4">
              <div className="w-14 h-14 mx-auto rounded-full border-4 border-blue-100 border-t-blue-500 animate-spin" />
            </div>
            <h2 className="text-xl font-semibold text-gray-800">
              {isEditMode ? '���� ����� ������ ��������' : '���� ����� ����� ��������'}
            </h2>
            <p className="text-sm text-gray-500 mt-2">
              ���� �������� ����� ���� ������ ���� ������ �������.
            </p>
          </div>
        </div>
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout>
        <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex items-center justify-center px-4">
          <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 px-10 py-12 text-center max-w-lg">
            <h2 className="text-2xl font-bold text-red-600">���� ����� ��������</h2>
            <p className="text-gray-600 mt-3">{error}</p>
            <button
              onClick={handleCancel}
              className="mt-6 inline-flex items-center justify-center px-5 py-3 rounded-xl text-sm font-medium text-white bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 transition-all duration-200"
            >
              ������ ��� ��������
            </button>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
        <div className="max-w-5xl mx-auto p-6">
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 p-8 mb-8">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4 rtl:space-x-reverse">
                <button
                  onClick={handleCancel}
                  className="w-12 h-12 bg-gradient-to-br from-gray-400 to-gray-600 rounded-xl flex items-center justify-center hover:from-gray-500 hover:to-gray-700 transition-all duration-200"
                >
                  <ArrowLeft className="w-6 h-6 text-white" />
                </button>
                <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center">
                  <FilePlus className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h1 className="text-3xl font-bold text-gray-800">
                    {isEditMode ? '����� ��������' : '����� ������ �����'}
                  </h1>
                  <p className="text-gray-600 mt-1">
                    {isEditMode
                      ? '���� ���� ������ �������� ���������� ������� �������.'
                      : '���� ������ ������� ������� �������� ������ ������ ��������.'}
                  </p>
                </div>
              </div>

              {/* Print & PDF Buttons - Only show in edit mode */}
              {isEditMode && activeInvoice && (
                <div className="flex items-center gap-3">
                  <button
                    onClick={handlePrint}
                    className="flex items-center gap-2 px-5 py-3 bg-white hover:bg-gray-50 text-gray-700 border-2 border-gray-300 hover:border-gray-400 rounded-xl font-semibold transition-all duration-200 shadow-sm hover:shadow-md disabled:opacity-60 disabled:cursor-not-allowed"
                    disabled={printing || downloading}
                  >
                    <Printer className="w-5 h-5" />
                    <span>{printing ? 'جارٍ التحضير...' : 'طباعة'}</span>
                  </button>
                  <button
                    onClick={handleExportPDF}
                    className="flex items-center gap-2 px-5 py-3 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white rounded-xl font-semibold transition-all duration-200 shadow-md hover:shadow-lg disabled:opacity-60 disabled:cursor-not-allowed"
                    disabled={printing || downloading}
                  >
                    <Download className="w-5 h-5" />
                    <span>{downloading ? 'جارٍ التحميل...' : 'تصدير PDF'}</span>
                  </button>
                </div>
              )}
            </div>
          </div>

          {linkedSalesOrderId && !isEditMode && activeInvoice && (
            <div className="mb-6 bg-blue-50 border border-blue-200 text-blue-700 rounded-2xl px-6 py-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
              <div>
                <p className="font-semibold">�� ����� �������� �� ��� ����� ��� #{activeInvoice.sourceSalesOrderNo || linkedSalesOrderId}</p>
                <p className="text-sm mt-1">����� ������ ������ �������� ��� ��� ��������.</p>
              </div>
              <button
                onClick={() => linkedSalesOrderId && navigate(`/sales-orders/${linkedSalesOrderId}`)}
                className="inline-flex items-center gap-2 px-4 py-2 bg-white text-blue-700 border border-blue-200 rounded-xl hover:bg-blue-100 transition-colors"
              >
                <ArrowLeft className="w-4 h-4 rotate-180" />
                ��� ��� �����
              </button>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">���� ��������</p>
                  <p className="text-3xl font-bold text-blue-600">{formatCurrency(totalAmount)}</p>
                  <p className="text-xs text-gray-500 mt-1">
                    {isEditMode ? '������ ������� ������� ���������.' : '���� ����� ������ ��� ����� ������.'}
                  </p>
                </div>
                <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                  <DollarSign className="w-6 h-6 text-blue-600" />
                </div>
              </div>
            </div>

            <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">������ �������</p>
                  <p className="text-3xl font-bold text-emerald-600">{formatCurrency(balanceAmount)}</p>
                  <p className="text-xs text-gray-500 mt-1">
                    {isEditMode ? `�� ��� ${formatCurrency(paidAmount)} ��� ����.` : '��� ���� ������ ������� ��������.'}
                  </p>
                </div>
                <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center">
                  <ClipboardList className="w-6 h-6 text-emerald-600" />
                </div>
              </div>
            </div>

            <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">���� ��������</p>
                  <p className={`text-3xl font-bold ${statusColor}`}>{statusDisplay}</p>
                  <p className="text-xs text-gray-500 mt-1">
                    {isEditMode ? '���� ������ ��� ���� ���� ������.' : '������ ���������� �� �����ɻ ��� ��� ����� ��������.'}
                  </p>
                </div>
                <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
                  <FileText className="w-6 h-6 text-purple-600" />
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 overflow-hidden">
            <div className="bg-gradient-to-r from-blue-500 to-indigo-600 px-8 py-6">
              <h2 className="text-xl font-bold text-white">
                {isEditMode ? '������ ��������' : '����� ������ �����'}
              </h2>
              <p className="text-blue-100 mt-1">
                ���� ������ ������ �������� ��������. ��� ���� ���������� �������� ��� ����� ������.
              </p>
            </div>

            <div className="p-8">
              <InvoiceForm
                invoice={activeInvoice}
                linkedSalesOrderId={invoiceId ? (invoice?.sales_order_id ?? null) : linkedSalesOrderId}
                onSave={handleSave}
                onCancel={handleCancel}
              />
            </div>
          </div>

          {/* Payments Section */}
          {isEditMode && (
            <div className="mt-8 bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 overflow-hidden">
              <div className="bg-gradient-to-r from-emerald-500 to-green-600 px-8 py-6">
                <h2 className="text-xl font-bold text-white">���������</h2>
                <p className="text-emerald-100 mt-1">��� ������� ����� ������� ��� ��� ��������.</p>
              </div>

              <div className="p-6" dir="rtl">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="text-sm text-gray-500">��������</div>
                    <div className="text-lg font-bold text-gray-800">{formatCurrency(invoice?.total_usd || 0)}</div>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="text-sm text-gray-500">�������</div>
                    <div className="text-lg font-bold text-emerald-700">{formatCurrency(invoice?.paid_amount_usd || 0)}</div>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="text-sm text-gray-500">�������</div>
                    <div className="text-lg font-bold text-orange-600">{formatCurrency(invoice?.remaining_amount || 0)}</div>
                  </div>
                </div>

                <div className="mb-4">
                  <button
                    onClick={() => setShowPayForm(!showPayForm)}
                    className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700"
                    disabled={payLoading}
                  >
                    {showPayForm ? '�����' : '����� ����'}
                  </button>
                </div>

                {showPayForm && (
                  <form onSubmit={handleAddPayment} className="bg-white border rounded-lg p-4 mb-6">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                      <div>
                        <label className="block text-sm text-gray-700 mb-1">�������</label>
                        <input type="date" value={paymentForm.paid_on} onChange={(e)=>setPaymentForm({...paymentForm, paid_on: e.target.value})} className="w-full px-3 py-2 border rounded" required />
                      </div>
                      <div>
                        <label className="block text-sm text-gray-700 mb-1">������ (USD)</label>
                        <input type="number" min={0} step={0.01} value={paymentForm.amount_usd} onChange={(e)=>setPaymentForm({...paymentForm, amount_usd: e.target.value})} className="w-full px-3 py-2 border rounded" required />
                      </div>
                      <div>
                        <label className="block text-sm text-gray-700 mb-1">�������</label>
                        <select value={paymentForm.method} onChange={(e)=>setPaymentForm({...paymentForm, method: e.target.value})} className="w-full px-3 py-2 border rounded">
                          <option value="CASH">�����</option>
                          <option value="BANK_TRANSFER">����� ����</option>
                          <option value="CHECK">���</option>
                          <option value="CREDIT_CARD">����� ������</option>
                          <option value="OTHER">����</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm text-gray-700 mb-1">������</label>
                        <input type="text" value={paymentForm.note} onChange={(e)=>setPaymentForm({...paymentForm, note: e.target.value})} className="w-full px-3 py-2 border rounded" />
                      </div>
                    </div>
                    <div className="mt-4 flex gap-3">
                      <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700" disabled={payLoading}>��� ������</button>
                      <button type="button" className="px-4 py-2 border rounded" onClick={()=>setShowPayForm(false)} disabled={payLoading}>�����</button>
                    </div>
                  </form>
                )}

                {payError && <div className="text-red-600 mb-3">{payError}</div>}
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-2 text-right text-xs font-medium text-gray-600">�������</th>
                        <th className="px-4 py-2 text-right text-xs font-medium text-gray-600">�������</th>
                        <th className="px-4 py-2 text-right text-xs font-medium text-gray-600">������</th>
                        <th className="px-4 py-2 text-right text-xs font-medium text-gray-600">������</th>
                        <th className="px-4 py-2"></th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {payments.map((p)=> (
                        <tr key={p.id}>
                          <td className="px-4 py-2">{p.paid_on}</td>
                          <td className="px-4 py-2">{p.method}</td>
                          <td className="px-4 py-2">{formatCurrency(typeof p.amount_usd === 'number' ? p.amount_usd : parseFloat(p.amount_usd || 0))}</td>
                          <td className="px-4 py-2">{p.note || ''}</td>
                          <td className="px-4 py-2 text-left"><button onClick={()=>handleDeletePayment(p.id)} className="text-red-600 hover:text-red-800">���</button></td>
                        </tr>
                      ))}
                      {(!payments || payments.length === 0) && (
                        <tr>
                          <td className="px-4 py-3 text-gray-500 text-sm" colSpan={5}>�� ���� ����� ����� ���.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          <div className="mt-8 bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">����� ����</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-start space-x-3 rtl:space-x-reverse">
                <div className="w-2 h-2 bg-blue-500 rounded-full mt-2" />
                <div>
                  <p className="text-sm font-medium text-gray-700">���� ������ ������ ������</p>
                  <p className="text-xs text-gray-600">
                    ���� ���� �������� �� ���� ������� �� ����� ������ �������� ������ ���������.
                  </p>
                </div>
              </div>
              <div className="flex items-start space-x-3 rtl:space-x-reverse">
                <div className="w-2 h-2 bg-emerald-500 rounded-full mt-2" />
                <div>
                  <p className="text-sm font-medium text-gray-700">������ ������� ������� �������</p>
                  <p className="text-xs text-gray-600">
                    ���� ��� ������ ������ ��� ������ ����� �������� ��� �������.
                  </p>
                </div>
              </div>
              <div className="flex items-start space-x-3 rtl:space-x-reverse">
                <div className="w-2 h-2 bg-purple-500 rounded-full mt-2" />
                <div>
                  <p className="text-sm font-medium text-gray-700">���� ������� �������</p>
                  <p className="text-xs text-gray-600">
                    ���� �� ���� ��� ������ ����� ���� �������� ������ ����� �������.
                  </p>
                </div>
              </div>
              <div className="flex items-start space-x-3 rtl:space-x-reverse">
                <div className="w-2 h-2 bg-amber-500 rounded-full mt-2" />
                <div>
                  <p className="text-sm font-medium text-gray-700">���� ��������� ������</p>
                  <p className="text-xs text-gray-600">
                    ���� ����� ��������� ������� ������ ���� ����� ��������� ������ �������� ��������.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default InvoiceDetail;




