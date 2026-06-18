import React from 'react';
import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';
import { registerCairoFont, formatPdfCurrency, formatPdfDate, basePdfStyles } from './pdfUtils';

registerCairoFont();

const styles = StyleSheet.create({
  ...basePdfStyles,
  header: { ...basePdfStyles.header, borderBottom: '2 solid #2563eb', paddingBottom: 8, marginBottom: 12 },
  title: { fontSize: 16, fontWeight: 700, color: '#0f172a' },
  meta: { fontSize: 11, color: '#475569', marginTop: 2 },
  section: { marginBottom: 12, padding: 12, backgroundColor: '#ffffff', borderRadius: 6, border: '1 solid #e2e8f0' },
  sectionTitle: { fontSize: 12, fontWeight: 700, color: '#0f172a', marginBottom: 6 },
  row: { flexDirection: 'row', justifyContent: 'space-between', gap: 8 },
  col: { flex: 1 },
  label: { fontSize: 9, color: '#475569' },
  value: { fontSize: 11, fontWeight: 700, color: '#0f172a', marginTop: 2 },
  table: { border: '1 solid #e2e8f0', borderRadius: 6, overflow: 'hidden' },
  tableHeader: { flexDirection: 'row', backgroundColor: '#0f172a', color: '#ffffff' },
  cell: { padding: 6, fontSize: 9, borderRight: '1 solid #e2e8f0', borderBottom: '1 solid #e2e8f0' },
  headCell: { fontWeight: 700, borderColor: '#0f172a' },
  colIndex: { width: '8%' },
  colDesc: { width: '44%' },
  colQty: { width: '12%', textAlign: 'right' },
  colPrice: { width: '18%', textAlign: 'right' },
  colTotal: { width: '18%', textAlign: 'right' },
  rowAlt: { backgroundColor: '#f8fafc' },
  summaryRow: { flexDirection: 'row', justifyContent: 'flex-end', gap: 8, marginTop: 6 },
  summaryLabel: { fontSize: 10, color: '#475569' },
  summaryValue: { fontSize: 11, fontWeight: 700, color: '#0f172a' },
});

const InvoicePDF = ({ invoice }) => {
  if (!invoice) {
    return (
      <Document>
        <Page size="A4" style={styles.page}>
          <Text style={styles.title}>لا توجد بيانات فاتورة</Text>
        </Page>
      </Document>
    );
  }

  const items = Array.isArray(invoice.items) ? invoice.items : [];
  const currency = invoice.currency || 'USD';
  const subtotal = items.reduce((sum, item) => {
    const qty = Number(item?.qty ?? item?.quantity ?? 1) || 1;
    const unit = Number(item?.unit_price_usd ?? item?.unitPrice ?? item?.price ?? 0) || 0;
    const line = Number(item?.line_total_usd ?? item?.lineTotal ?? item?.total ?? unit * qty) || unit * qty;
    return sum + line;
  }, 0);
  const tax = Number(invoice.tax || invoice.tax_amount || 0) || 0;
  const discount = Number(invoice.discount || invoice.discount_amount || 0) || 0;
  const total = Number(invoice.total ?? invoice.total_usd ?? subtotal - discount + tax) || subtotal - discount + tax;

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.title}>فاتورة / Invoice</Text>
          <Text style={styles.meta}>
            رقم: {invoice.invoice_no || invoice.invoiceNo || '---'} | تاريخ:{' '}
            {formatPdfDate(invoice.invoice_date || invoice.date)}
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>بيانات العميل</Text>
          <View style={styles.row}>
            <View style={styles.col}>
              <Text style={styles.label}>الاسم</Text>
              <Text style={styles.value}>{invoice.customer_name || invoice.customerName || '-'}</Text>
            </View>
            <View style={styles.col}>
              <Text style={styles.label}>العنوان</Text>
              <Text style={styles.value}>{invoice.customer_address || '-'}</Text>
            </View>
            <View style={styles.col}>
              <Text style={styles.label}>الحالة</Text>
              <Text style={styles.value}>{invoice.status || '-'}</Text>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>البنود</Text>
          <View style={styles.table}>
            <View style={styles.tableHeader}>
              <Text style={[styles.cell, styles.headCell, styles.colIndex]}>#</Text>
              <Text style={[styles.cell, styles.headCell, styles.colDesc]}>الوصف</Text>
              <Text style={[styles.cell, styles.headCell, styles.colQty]}>الكمية</Text>
              <Text style={[styles.cell, styles.headCell, styles.colPrice]}>سعر الوحدة</Text>
              <Text style={[styles.cell, styles.headCell, styles.colTotal]}>الإجمالي</Text>
            </View>
            {items.length ? (
              items.map((item, idx) => {
                const qty = Number(item?.qty ?? item?.quantity ?? 1) || 1;
                const unit = Number(item?.unit_price_usd ?? item?.unitPrice ?? item?.price ?? 0) || 0;
                const line = Number(item?.line_total_usd ?? item?.lineTotal ?? item?.total ?? unit * qty) || unit * qty;
                return (
                  <View key={idx.toString()} style={[styles.row, idx % 2 === 1 && styles.rowAlt]}>
                    <Text style={[styles.cell, styles.colIndex]}>{idx + 1}</Text>
                    <Text style={[styles.cell, styles.colDesc]}>{item?.description || item?.item_description || item?.product_name || '-'}</Text>
                    <Text style={[styles.cell, styles.colQty]}>{qty}</Text>
                    <Text style={[styles.cell, styles.colPrice]}>{formatPdfCurrency(unit, currency)}</Text>
                    <Text style={[styles.cell, styles.colTotal]}>{formatPdfCurrency(line, currency)}</Text>
                  </View>
                );
              })
            ) : (
              <View style={styles.row}>
                <Text style={[styles.cell, { width: '100%' }]}>لا توجد بنود</Text>
              </View>
            )}
          </View>

          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>الإجمالي الفرعي</Text>
            <Text style={styles.summaryValue}>{formatPdfCurrency(subtotal, currency)}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>الخصم</Text>
            <Text style={styles.summaryValue}>{formatPdfCurrency(discount, currency)}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>الضريبة</Text>
            <Text style={styles.summaryValue}>{formatPdfCurrency(tax, currency)}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>الإجمالي النهائي</Text>
            <Text style={styles.summaryValue}>{formatPdfCurrency(total, currency)}</Text>
          </View>
        </View>
      </Page>
    </Document>
  );
};

export default InvoicePDF;


