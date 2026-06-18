import React from 'react';
import { Document, Page, Text, View, StyleSheet, Font } from '@react-pdf/renderer';

// Register Arabic font (Cairo) with error handling
try {
  Font.register({
    family: 'Cairo',
    fonts: [
      {
        src: 'https://fonts.gstatic.com/s/cairo/v31/SLXgc1nY6HkvangtZmpQdkhzfH5lkSs2SgRjCAGMQ1z0hOA-W1Q.ttf',
        fontWeight: 400,
      },
      {
        src: 'https://fonts.gstatic.com/s/cairo/v31/SLXgc1nY6HkvangtZmpQdkhzfH5lkSs2SgRjCAGMQ1z0hAc5W1Q.ttf',
        fontWeight: 700,
      },
    ],
  });
} catch (error) {
  console.warn('Failed to register Cairo font for QuotationPDF:', error?.message || error);
}

const DEFAULT_NOTES = [
  'السعر لا يشمل أي أعمال مدنية أو كهربائية غير مذكورة.',
  'فترة الضمان سنتان على المحرك وسنة على باقي الأجزاء.',
  'عرض السعر صالح لمدة 30 يوماً من تاريخ الإصدار.',
  'يتم تحديد موعد التركيب بعد استلام الدفعة المقدمة.',
];

const DETAIL_MARKERS = ['تفاصيل المصعد', 'مواصفات المصعد'];

const STATUS_LABELS = {
  ACCEPTED: 'ساري المفعول',
  APPROVED: 'ساري المفعول',
  ACTIVE: 'ساري المفعول',
  SENT: 'بانتظار الموافقة',
  DRAFT: 'مسودة',
  REJECTED: 'مرفوض',
  CANCELLED: 'ملغى',
  EXPIRED: 'منتهي',
};

const styles = StyleSheet.create({
  page: {
    padding: 3,
    fontFamily: 'Cairo',
    backgroundColor: '#E3F2FD',
  },
  scaleWrapper: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'flex-start',
  },
  scaledContent: {
    width: '100%',
    transform: [{ scale: 0.5 }],
    transformOrigin: 'top center',
  },
  hero: {
    backgroundColor: '#1A237E',
    color: '#fff',
    borderRadius: 8,
    padding: 5,
    marginBottom: 2,
  },
  heroTitle: {
    fontSize: 12,
    fontWeight: 700,
    textAlign: 'right',
  },
  heroSubtitle: {
    fontSize: 7,
    color: '#D0D8FF',
    textAlign: 'right',
    marginTop: 2,
  },
  heroStatus: {
    alignSelf: 'flex-start',
    marginTop: 6,
    paddingVertical: 2,
    paddingHorizontal: 4,
    borderRadius: 999,
    fontSize: 6.3,
    backgroundColor: '#EEF2FF',
    color: '#1E1B4B',
  },
  infoRow: {
    flexDirection: 'row',
    borderRadius: 8,
    border: '1 solid #d9e3f0',
    backgroundColor: '#fff',
    overflow: 'hidden',
    marginBottom: 4,
  },
  infoItem: {
    flex: 1,
    padding: 5,
  },
  infoSeparator: {
    borderLeft: '1 solid #e2e8f0',
  },
  infoLabel: {
    fontSize: 8,
    color: '#64748b',
  },
  infoValue: {
    fontSize: 9,
    fontWeight: 700,
    textAlign: 'right',
    color: '#0f172a',
  },
  sectionRow: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  sectionSpacer: {
    marginRight: 4,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 8,
    border: '1 solid #e2e8f0',
    padding: 5,
    flexGrow: 1,
  },
  sectionTitle: {
    fontSize: 8.5,
    fontWeight: 700,
    color: '#0f172a',
    marginBottom: 2,
    textAlign: 'right',
  },
  textSm: {
    fontSize: 7,
    color: '#475569',
    textAlign: 'right',
    lineHeight: 1.35,
  },
  table: {
    border: '1 solid #e2e8f0',
    borderRadius: 8,
    overflow: 'hidden',
    marginTop: 2,
  },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
  },
  tableHeaderRow: {
    backgroundColor: '#0f172a',
    color: '#fff',
  },
  tableCell: {
    fontSize: 7,
    color: '#0f172a',
    paddingVertical: 1.5,
    paddingHorizontal: 1.5,
    borderRight: '1 solid #e2e8f0',
    textAlign: 'right',
    flexShrink: 0,
  },
  headerCell: {
    fontWeight: 700,
    color: '#fff',
    borderColor: '#0f172a',
  },
  colIndex: { width: '8%' },
  colDesc: { width: '44%', borderRight: '1 solid #e2e8f0' },
  colQty: { width: '12%' },
  colPrice: { width: '18%' },
  colTotal: { width: '18%' },
  altRow: {
    backgroundColor: '#F8FAFC',
  },
  descText: {
    fontSize: 8.5,
    fontWeight: 700,
    color: '#0f172a',
    marginBottom: 1.5,
    textAlign: 'right',
  },
  specText: {
    fontSize: 7.5,
    color: '#475569',
    textAlign: 'right',
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 1,
  },
  summaryLabel: {
    fontSize: 7,
    color: '#475569',
  },
  summaryValue: {
    fontSize: 8,
    fontWeight: 700,
    color: '#0f172a',
  },
  statusCard: {
    backgroundColor: '#FFF7ED',
    borderColor: '#FDBA74',
  },
  statusLabel: {
    fontSize: 8.5,
    fontWeight: 700,
    color: '#9A3412',
    textAlign: 'center',
    marginTop: 6,
  },
  detailRow: {
    flexDirection: 'row',
    borderTop: '1 solid #e2e8f0',
  },
  detailLabel: {
    width: '30%',
    fontSize: 7.5,
    fontWeight: 700,
    color: '#475569',
    padding: 5,
    textAlign: 'right',
  },
  detailValue: {
    flex: 1,
    fontSize: 7.5,
    color: '#0f172a',
    padding: 5,
    textAlign: 'right',
  },
  paymentCard: {
    backgroundColor: '#F0F9FF',
    borderColor: '#BAE6FD',
  },
  notesList: {
    marginTop: 3,
  },
  noteLine: {
    fontSize: 7,
    color: '#475569',
    marginBottom: 1.2,
    textAlign: 'right',
  },
  footer: {
    marginTop: 2,
    fontSize: 6.5,
    textAlign: 'center',
    color: '#475569',
  },
});

const formatCurrency = (value, currency = 'USD') => {
  const amount = Number(value || 0);
  const safeValue = Number.isFinite(amount) ? amount : 0;
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(safeValue);
};

const formatDate = (value) => {
  if (!value) {
    return '—';
  }
  try {
    return new Date(value).toLocaleDateString('en-GB', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
  } catch {
    return '—';
  }
};

const separateNotesSections = (notes = '') => {
  if (!notes) {
    return { notesText: '', detailText: '' };
  }
  for (const marker of DETAIL_MARKERS) {
    const markerIndex = notes.indexOf(marker);
    if (markerIndex !== -1) {
      const detailText = notes
        .slice(markerIndex + marker.length)
        .replace(/^[:\-–\s]+/, '')
        .trim();
      return {
        notesText: notes.slice(0, markerIndex).trim(),
        detailText,
      };
    }
  }
  return { notesText: notes, detailText: '' };
};

const parseDetailLines = (text = '') =>
  text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [label, ...rest] = line.split(':');
      if (rest.length === 0) {
        return { label: null, value: line };
      }
      return {
        label: label.trim(),
        value: rest.join(':').trim(),
      };
    });

const getNotesList = (rawNotes = '') => {
  if (!rawNotes) {
    return DEFAULT_NOTES;
  }
  const lines = rawNotes
    .split(/\r?\n/)
    .map((line) => line.replace(/^[\-\u2022•\s]+/, '').trim())
    .filter(Boolean);
  return lines.length ? lines : DEFAULT_NOTES;
};

const getStatusLabel = (status = '') => {
  if (!status) {
    return STATUS_LABELS.ACCEPTED;
  }
  const key = status.toUpperCase();
  return STATUS_LABELS[key] || status;
};

const resolveNumber = (value, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const QuotationPDF = ({ quotation }) => {
  if (!quotation) {
    return (
      <Document>
        <Page size="A4" style={styles.page}>
          <Text style={styles.sectionTitle}>لا توجد بيانات عرض سعر</Text>
        </Page>
      </Document>
    );
  }

  const currency = quotation.currency || 'USD';
  const items = Array.isArray(quotation.items) ? quotation.items : [];
  const { notesText, detailText } = separateNotesSections(quotation.notes || '');
  const elevatorDetailsSource =
    quotation.elevator_details || detailText || (items[0]?.specifications || '');
  const elevatorDetails = parseDetailLines(elevatorDetailsSource);
  const trimmedNotes = (notesText || '').trim();
  const compiledTermsText = (quotation.terms_and_conditions || '').trim();
  const termsEntries = compiledTermsText ? getNotesList(compiledTermsText) : [];
  const generalNoteEntries = trimmedNotes ? getNotesList(trimmedNotes) : [];
  const notesList =
    termsEntries.length > 0
      ? [...termsEntries, ...generalNoteEntries]
      : generalNoteEntries.length > 0
      ? generalNoteEntries
      : DEFAULT_NOTES;

  const subtotalFromItems = items.reduce((sum, item) => {
    const qty = resolveNumber(item?.qty ?? item?.quantity ?? 0);
    const unitPrice = resolveNumber(
      item?.unit_price ?? item?.unit_price_usd ?? item?.unitPrice ?? 0,
    );
    const discountAmount = resolveNumber(item?.discount_amount ?? 0);
    const providedLine =
      item?.line_total ??
      item?.lineTotal ??
      item?.line_total_usd ??
      unitPrice * qty - discountAmount;
    return sum + resolveNumber(providedLine, unitPrice * qty - discountAmount);
  }, 0);

  const subtotalCandidate =
    quotation.subtotal ??
    quotation.subtotal_amount ??
    quotation.subtotal_value ??
    subtotalFromItems;
  const subtotal = resolveNumber(subtotalCandidate, subtotalFromItems);

  const discountCandidate =
    quotation.discount_amount ?? quotation.discount ?? quotation.discount_value ?? 0;
  const discount = resolveNumber(discountCandidate, 0);

  const taxCandidate = quotation.tax_amount ?? quotation.tax ?? quotation.tax_value ?? 0;
  const tax = resolveNumber(taxCandidate, 0);

  const totalCandidate =
    quotation.total ?? quotation.total_amount ?? subtotal - discount + tax;
  const total = resolveNumber(totalCandidate, subtotal - discount + tax);

  const validUntil = formatDate(quotation.valid_until);
  const issueDate = formatDate(quotation.quotation_date);
  const statusLabel = getStatusLabel(quotation.status);
  const customerCompany =
    quotation.customer_company || quotation.customer_name || '—';

  const companyInfo = [
    { label: 'اسم الشركة', value: quotation.company_name || 'السند للمصاعد' },
    { label: 'العنوان', value: quotation.company_address || 'شارع الستين، بغداد' },
    { label: 'الهاتف', value: quotation.company_phone || '+964 770 123 4567' },
    {
      label: 'البريد الإلكتروني',
      value: quotation.company_email || 'sales@sanadelevators.com',
    },
  ];

  const contactInfo = [
    { label: 'اسم العميل', value: quotation.customer_name || '—' },
    { label: 'شركة العميل', value: customerCompany },
  ];
  if (quotation.customer_address) {
    contactInfo.push({ label: 'العنوان', value: quotation.customer_address });
  }
  if (quotation.contact_email || quotation.customer_email) {
    contactInfo.push({
      label: 'جهة الاتصال',
      value: quotation.contact_email || quotation.customer_email,
    });
  }

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.scaleWrapper}>
          <View style={styles.scaledContent}>
            <View style={styles.hero}>
          <Text style={styles.heroTitle}>عرض سعر</Text>
          <Text style={styles.heroSubtitle}>
            رقم عرض السعر: {quotation.quotation_no || '—'} | تاريخ الإصدار: {issueDate}
          </Text>
          {validUntil && (
            <Text style={styles.heroStatus}>ساري حتى {validUntil}</Text>
          )}
        </View>

        <View style={styles.infoRow}>
          {companyInfo.map((info, idx) => (
            <View
              key={`${info.label}-${idx}`}
              style={[styles.infoItem, idx !== companyInfo.length - 1 && styles.infoSeparator]}
            >
              <Text style={styles.infoLabel}>{info.label}</Text>
              <Text style={styles.infoValue}>{info.value}</Text>
            </View>
          ))}
        </View>

        <View style={styles.sectionRow}>
          <View style={[styles.card, styles.sectionSpacer, { flex: 2 }]}>
            <Text style={styles.sectionTitle}>موجّه إلى</Text>
            {contactInfo.map((info, idx) => (
              <Text key={`${info.label}-${idx}`} style={styles.textSm}>
                <Text style={{ fontWeight: 700 }}>{info.label}:</Text> {info.value}
              </Text>
            ))}
          </View>
          <View style={[styles.card, styles.statusCard, { flex: 1 }]}>
            <Text style={[styles.sectionTitle, { color: '#9A3412' }]}>صالح حتى</Text>
            <Text style={{ fontSize: 18, fontWeight: 700, color: '#9A3412', textAlign: 'center' }}>
              {validUntil}
            </Text>
            <Text style={styles.statusLabel}>{statusLabel}</Text>
          </View>
        </View>

        <View style={[styles.card, { marginBottom: 4 }]}>
          <Text style={styles.sectionTitle}>البنود</Text>
          <View style={styles.table}>
            <View style={[styles.tableRow, styles.tableHeaderRow]}>
              <Text style={[styles.tableCell, styles.headerCell, styles.colIndex]}>#</Text>
              <View style={[styles.tableCell, styles.headerCell, styles.colDesc]}>
                <Text>الوصف</Text>
              </View>
              <Text style={[styles.tableCell, styles.headerCell, styles.colQty]}>الكمية</Text>
              <Text style={[styles.tableCell, styles.headerCell, styles.colPrice]}>سعر الوحدة</Text>
              <Text style={[styles.tableCell, styles.headerCell, styles.colTotal]}>الإجمالي</Text>
            </View>
            {items.length > 0 ? (
              items.map((item, index) => {
                const qty = resolveNumber(item?.qty ?? item?.quantity ?? 0, 0);
                const unitPrice = resolveNumber(
                  item?.unit_price ?? item?.unit_price_usd ?? item?.unitPrice ?? 0,
                  0,
                );
                const discountAmount = resolveNumber(item?.discount_amount ?? 0, 0);
                const providedLine =
                  item?.line_total ??
                  item?.lineTotal ??
                  item?.line_total_usd ??
                  unitPrice * qty - discountAmount;
                const lineTotal = resolveNumber(
                  providedLine,
                  unitPrice * qty - discountAmount,
                );
                return (
                  <View
                    key={`${item.id || 'item'}-${index}`}
                    style={[styles.tableRow, index % 2 === 1 && styles.altRow]}
                  >
                    <Text style={[styles.tableCell, styles.colIndex]}>{index + 1}</Text>
                    <View style={[styles.tableCell, styles.colDesc]}>
                      <Text style={styles.descText}>
                        {item.description || item.item_description || item.product_name || '—'}
                      </Text>
                      {item.specifications && (
                        <Text style={styles.specText}>{item.specifications}</Text>
                      )}
                    </View>
                    <Text style={[styles.tableCell, styles.colQty]}>{qty || '—'}</Text>
                    <Text style={[styles.tableCell, styles.colPrice]}>
                      {formatCurrency(unitPrice, currency)}
                    </Text>
                    <Text style={[styles.tableCell, styles.colTotal]}>
                      {formatCurrency(lineTotal, currency)}
                    </Text>
                  </View>
                );
              })
            ) : (
              <View style={styles.tableRow}>
                <Text style={[styles.tableCell, { width: '100%' }]}>
                  لا توجد أصناف مضافة في هذا العرض.
                </Text>
              </View>
            )}
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>المجموع الفرعي</Text>
            <Text style={styles.summaryValue}>{formatCurrency(subtotal, currency)}</Text>
          </View>
          {tax > 0 && (
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>ضريبة القيمة المضافة</Text>
              <Text style={styles.summaryValue}>{formatCurrency(tax, currency)}</Text>
            </View>
          )}
          {discount > 0 && (
            <View style={styles.summaryRow}>
              <Text style={[styles.summaryLabel, { color: '#15803d' }]}>خصم إضافي</Text>
              <Text style={[styles.summaryValue, { color: '#15803d' }]}>
                -{formatCurrency(discount, currency)}
              </Text>
            </View>
          )}
          <View style={styles.summaryRow}>
            <Text style={[styles.summaryLabel, { fontWeight: 700 }]}>الإجمالي</Text>
            <Text style={[styles.summaryValue, { fontSize: 14 }]}>
              {formatCurrency(total, currency)}
            </Text>
          </View>
        </View>

        {elevatorDetails.length > 0 && (
          <View style={[styles.card, { marginBottom: 4 }]}>
            <Text style={styles.sectionTitle}>تفاصيل المصعد</Text>
            {elevatorDetails.map((detail, idx) => (
              <View
                key={`${detail.label || 'detail'}-${idx}`}
                style={[
                  styles.detailRow,
                  idx === 0 && { borderTop: '0 solid transparent' },
                  idx % 2 === 1 && { backgroundColor: '#F8FAFC' },
                ]}
              >
                {detail.label ? (
                  <>
                    <Text style={styles.detailLabel}>{detail.label}</Text>
                    <Text style={styles.detailValue}>{detail.value}</Text>
                  </>
                ) : (
                  <Text style={[styles.detailValue, { flex: 1 }]}>{detail.value}</Text>
                )}
              </View>
            ))}
          </View>
        )}

        {quotation.payment_terms && (
          <View style={[styles.card, styles.paymentCard, { marginBottom: 4 }]}>
            <Text style={styles.sectionTitle}>خطة الدفع</Text>
            <Text style={styles.textSm}>{quotation.payment_terms}</Text>
          </View>
        )}

        <View style={styles.sectionRow}>
          <View style={[styles.card, styles.sectionSpacer, { flex: 2 }]}>
            <Text style={styles.sectionTitle}>الملاحظات والشروط</Text>
            <View style={styles.notesList}>
              {notesList.map((note, idx) => (
                <Text key={`note-${idx}`} style={styles.noteLine}>
                  {'\u2022'} {note}
                </Text>
              ))}
            </View>
          </View>
          <View style={[styles.card, { flex: 1 }]}>
            <Text style={styles.sectionTitle}>الملخص المالي</Text>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>المجموع الفرعي</Text>
              <Text style={styles.summaryValue}>{formatCurrency(subtotal, currency)}</Text>
            </View>
            {tax > 0 && (
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>الضريبة</Text>
                <Text style={styles.summaryValue}>{formatCurrency(tax, currency)}</Text>
              </View>
            )}
            {discount > 0 && (
              <View style={styles.summaryRow}>
                <Text style={[styles.summaryLabel, { color: '#15803d' }]}>الخصم</Text>
                <Text style={[styles.summaryValue, { color: '#15803d' }]}>
                  -{formatCurrency(discount, currency)}
                </Text>
              </View>
            )}
            <View style={[styles.summaryRow, { marginTop: 12 }]}>
              <Text style={[styles.summaryLabel, { fontSize: 12 }]}>الإجمالي المستحق</Text>
              <Text style={[styles.summaryValue, { fontSize: 14 }]}>
                {formatCurrency(total, currency)}
              </Text>
            </View>
          </View>
        </View>

        <Text style={styles.footer}>
          شكراً لتعاملكم معنا. هذا المستند صادر إلكترونياً ولا يتطلب توقيعاً.
        </Text>
          </View>
        </View>
      </Page>
    </Document>
  );
};

export default QuotationPDF;
