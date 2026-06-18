import { useState, useEffect, useMemo } from 'react';
import { X, Printer, Download } from 'lucide-react';
import InvoicePrintTemplate from './InvoicePrintTemplate';
import InvoicePDF from './pdf/InvoicePDF';
import usePdfPrint from '../hooks/usePdfPrint';
import { getInvoice, getSalesInvoicePayments, getSalesOrder, getProduct } from '../services/api';

const InvoiceViewModal = ({ invoiceId, onClose }) => {
  const [invoice, setInvoice] = useState(null);
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [salesOrder, setSalesOrder] = useState(null);
  const [productDetails, setProductDetails] = useState({});
  const pdfFileName = useMemo(
    () => `Invoice_${invoice?.invoice_no || invoice?.invoiceNo || 'draft'}.pdf`,
    [invoice]
  );

  const { print: handlePrint, download: handleExportPDF, printing, downloading } = usePdfPrint({
    createDocument: () => (
      <InvoicePDF
        invoice={invoice}
        payments={payments}
        salesOrder={salesOrder}
        productsById={productDetails}
      />
    ),
    fileName: pdfFileName,
  });

  useEffect(() => {
    if (invoiceId) {
      loadInvoiceData();
    }
  }, [invoiceId]);

  const hydrateProductDetails = async (order) => {
    if (!order || !Array.isArray(order.items) || order.items.length === 0) {
      setProductDetails({});
      return;
    }

    const productIds = Array.from(
      new Set(
        order.items
          .map((item) => item?.product_id)
          .filter((value) => value !== undefined && value !== null)
      )
    );

    if (productIds.length === 0) {
      setProductDetails({});
      return;
    }

    try {
      const entries = await Promise.all(
        productIds.map(async (id) => {
          try {
            const product = await getProduct(id);
            return [id, product];
          } catch (err) {
            console.error('Error fetching product info for invoice preview:', err);
            return null;
          }
        })
      );

      const map = {};
      entries.forEach((entry) => {
        if (entry && entry[0] != null && entry[1]) {
          map[entry[0]] = entry[1];
        }
      });
      setProductDetails(map);
    } catch (err) {
      console.error('Unexpected error while preparing product details:', err);
      setProductDetails({});
    }
  };

  const loadInvoiceData = async () => {
    try {
      setLoading(true);
      const [invoiceData, paymentsData] = await Promise.all([
        getInvoice(invoiceId),
        getSalesInvoicePayments(invoiceId)
      ]);
      setInvoice(invoiceData);
      setPayments(Array.isArray(paymentsData) ? paymentsData : []);
      setProductDetails({});

      if (invoiceData?.sales_order_id) {
        try {
          const order = await getSalesOrder(invoiceData.sales_order_id);
          setSalesOrder(order);
          await hydrateProductDetails(order);
        } catch (orderErr) {
          console.error('Error loading sales order for invoice:', orderErr);
          setSalesOrder(null);
          setProductDetails({});
        }
      } else if (invoiceData?.salesOrder) {
        setSalesOrder(invoiceData.salesOrder);
        await hydrateProductDetails(invoiceData.salesOrder);
      } else {
        setSalesOrder(null);
        setProductDetails({});
      }
    } catch (error) {
      console.error('Error loading invoice:', error);
    } finally {
      setLoading(false);
    }
  };



  if (!invoiceId) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-6xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-amber-500 to-amber-600 px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-bold text-white">
            عرض الفاتورة #{invoice?.invoice_no || invoice?.invoiceNo || '...'}
          </h2>
          <div className="flex items-center gap-3">
            <button
              onClick={handlePrint}
              disabled={loading || !invoice || printing || downloading}
              className="flex items-center gap-2 px-3 py-2 bg-white hover:bg-gray-100 text-amber-600 rounded-lg font-semibold transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
              title="طباعة (أو حفظ كـ PDF)"
            >
              <Printer className="w-4 h-4" />
              <span>{printing ? 'جاري الطباعة...' : 'طباعة'}</span>
            </button>
            <button
              onClick={handleExportPDF}
              disabled={loading || !invoice || printing || downloading}
              className="flex items-center gap-2 px-3 py-2 bg-white hover:bg-gray-100 text-amber-600 rounded-lg font-semibold transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
            >
              <Download className="w-4 h-4" />
              <span>{downloading ? 'جاري التحميل...' : 'PDF'}</span>
            </button>
            <button
              onClick={onClose}
              className="p-2 bg-white hover:bg-gray-100 text-amber-600 rounded-lg transition-all duration-200 ml-2"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="overflow-y-auto max-h-[calc(90vh-80px)] p-6 bg-gray-50">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-600"></div>
            </div>
          ) : (
            <div className="bg-white rounded-xl shadow-sm">
              <InvoicePrintTemplate
                invoice={invoice}
                payments={payments}
                salesOrder={salesOrder}
                productsById={productDetails}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default InvoiceViewModal;

