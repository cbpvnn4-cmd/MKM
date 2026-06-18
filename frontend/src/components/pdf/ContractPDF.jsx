import React from 'react';
import { Document, Page, Text, View, StyleSheet, Font } from '@react-pdf/renderer';

// Register Arabic font (Cairo)
// PRODUCTION TIP: For better reliability, download Cairo fonts and place them in /frontend/src/assets/fonts/
// Then use local paths instead of external URLs to avoid network dependency
// Example: src: '/src/assets/fonts/Cairo-Regular.ttf'
try {
  Font.register({
    family: 'Cairo',
    fonts: [
      { src: 'https://fonts.gstatic.com/s/cairo/v31/SLXgc1nY6HkvangtZmpQdkhzfH5lkSs2SgRjCAGMQ1z0hOA-W1Q.ttf', fontWeight: 400 },
      { src: 'https://fonts.gstatic.com/s/cairo/v31/SLXgc1nY6HkvangtZmpQdkhzfH5lkSs2SgRjCAGMQ1z0hAc5W1Q.ttf', fontWeight: 700 },
    ],
  });
} catch (error) {
  console.warn('Failed to register Cairo font:', error?.message || error);
}

const styles = StyleSheet.create({
  page: {
    padding: 24,
    fontFamily: 'Cairo',
    backgroundColor: '#f1f5f9',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  companyBlock: {
    flex: 1,
  },
  companyTitle: {
    fontSize: 16,
    fontWeight: 700,
    color: '#0f172a',
    textAlign: 'right',
  },
  companyMeta: {
    fontSize: 9,
    color: '#475569',
    textAlign: 'right',
    marginTop: 2,
  },
  contractMeta: {
    minWidth: 170,
    backgroundColor: '#0f172a',
    color: '#fff',
    padding: 10,
    borderRadius: 8,
  },
  metaTitle: {
    fontSize: 14,
    fontWeight: 700,
    textAlign: 'right',
  },
  metaLine: {
    fontSize: 10,
    marginTop: 4,
    textAlign: 'right',
  },
  section: {
    marginBottom: 10,
    padding: 10,
    backgroundColor: '#ffffff',
    borderRadius: 8,
    border: '1 solid #e2e8f0',
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: 700,
    color: '#0f172a',
    marginBottom: 8,
    textAlign: 'right',
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  infoCol: {
    flex: 1,
    paddingHorizontal: 4,
  },
  label: {
    fontSize: 9,
    color: '#475569',
    textAlign: 'right',
  },
  value: {
    fontSize: 11,
    fontWeight: 700,
    color: '#0f172a',
    textAlign: 'right',
    marginTop: 2,
  },
  badge: {
    alignSelf: 'flex-start',
    backgroundColor: '#eef2ff',
    color: '#1e1b4b',
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 999,
    fontSize: 9,
    marginTop: 4,
  },
  table: {
    border: '1 solid #e2e8f0',
    borderRadius: 8,
    overflow: 'hidden',
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#0f172a',
  },
  tableRow: {
    flexDirection: 'row',
  },
  cell: {
    fontSize: 9,
    paddingVertical: 6,
    paddingHorizontal: 6,
    borderRight: '1 solid #e2e8f0',
    borderBottom: '1 solid #e2e8f0',
    textAlign: 'right',
    color: '#0f172a',
    flexShrink: 0,
  },
  headerCell: {
    color: '#fff',
    fontWeight: 700,
    borderColor: '#0f172a',
  },
  colIndex: { flex: 0.7 },
  colShort: { flex: 1 },
  colMedium: { flex: 1.2 },
  colLong: { flex: 1.6 },
  colFull: { flex: 1 },
  altRow: { backgroundColor: '#f8fafc' },
  note: {
    fontSize: 10,
    color: '#334155',
    lineHeight: 1.5,
    textAlign: 'right',
  },
  chipsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  chip: {
    flex: 1,
    padding: 8,
    borderRadius: 8,
    textAlign: 'right',
    marginLeft: 4,
    marginRight: 4,
  },
  chipLabel: {
    fontSize: 9,
    color: '#475569',
  },
  chipValue: {
    fontSize: 12,
    fontWeight: 700,
    marginTop: 3,
    color: '#0f172a',
  },
  signatureRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
  },
  signatureBlock: {
    flex: 1,
    alignItems: 'center',
    textAlign: 'center',
  },
  signatureLine: {
    height: 1,
    width: '70%',
    backgroundColor: '#cbd5e1',
    marginBottom: 6,
  },
  signatureLabel: {
    fontSize: 10,
    fontWeight: 700,
    color: '#0f172a',
  },
  signatureName: {
    fontSize: 9,
    color: '#475569',
    marginTop: 2,
  },
});

const pickFirst = (...values) => values.find((v) => v !== undefined && v !== null && v !== '');

const formatDate = (value) => {
  if (!value) return '-';
  try {
    const date = new Date(value);
    return new Intl.DateTimeFormat('ar-EG', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(date);
  } catch {
    return '-';
  }
};

const formatCurrency = (value, currency = 'USD') => {
  const num = Number(value || 0);
  const safe = Number.isFinite(num) ? num : 0;
  
  // Validate currency code
  const validCurrencies = ['USD', 'SAR', 'AED', 'EUR', 'IQD', 'GBP'];
  const cur = validCurrencies.includes(currency) ? currency : 'USD';
  
  try {
    return new Intl.NumberFormat('ar-EG', {
      style: 'currency',
      currency: cur,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(safe);
  } catch {
    return `${safe.toFixed(2)} ${cur}`;
  }
};

const statusLabels = {
  DRAFT: 'مسودة',
  ACTIVE: 'ساري',
  COMPLETED: 'مكتمل',
  TERMINATED: 'منتهي',
};

const paymentStatusLabels = {
  PENDING: 'قيد الاستحقاق',
  PAID: 'مدفوع',
  LATE: 'متأخر',
  CANCELLED: 'ملغى',
};

const DEFAULT_TERMS = [
  'يلتزم الطرف الأول بتوريد وتركيب المصاعد وفق المواصفات والشروط المتفق عليها.',
  'يلتزم الطرف الثاني بسداد الدفعات في المواعيد المحددة في جدول الدفعات.',
  'لا يجوز لأي من الطرفين التنازل عن هذا العقد أو جزء منه إلا بموافقة خطية من الطرف الآخر.',
  'في حال حدوث أي خلاف يتم حله وديًا، وإن تعذر ذلك فيكون عبر الجهات المختصة.',
];

const ContractPDF = ({ contract }) => {
  if (!contract) {
    return (
      <Document>
        <Page size="A4" style={styles.page}>
          <Text style={styles.companyTitle}>لا توجد بيانات عقد</Text>
        </Page>
      </Document>
    );
  }

  const currency = contract.currency || 'USD';
  const milestones = Array.isArray(contract.milestones) ? contract.milestones : [];
  const elevators = Array.isArray(contract.elevators) ? contract.elevators : [];
  const payments = Array.isArray(contract.payments) ? contract.payments : [];
  const totalElevators = elevators.reduce((sum, e) => sum + Number(e.total_price || 0), 0);
  const totalAmount = Number(
    pickFirst(
      contract.total_amount,
      contract.total_value,
      contract.contract_value,
      contract.total_contract_amount,
      contract.contract_total_amount,
      contract.contract_amount,
      totalElevators
    ) || 0
  );
  const downPayment = Number(
    pickFirst(
      contract.down_payment,
      contract.down_payment_amount,
      contract.advance_payment,
      contract.deposit_amount,
      contract.deposit
    ) || 0
  );
  const remaining = (Number(totalAmount) || 0) - downPayment;

  return (
    <Document>
      <Page size="A4" style={styles.page} wrap>
        <View style={styles.headerRow}>
          <View style={styles.companyBlock}>
            <Text style={styles.companyTitle}>{contract.company_name || 'اسم الشركة'}</Text>
            <Text style={styles.companyMeta}>{contract.company_address || 'العنوان غير متوفر'}</Text>
            <Text style={styles.companyMeta}>
              هاتف: {contract.company_phone || '---'} | بريد: {contract.company_email || '---'}
            </Text>
          </View>
          <View style={styles.contractMeta}>
            <Text style={styles.metaTitle}>عقد / Contract</Text>
            <Text style={styles.metaLine}>رقم: {contract.contract_no || '-'}</Text>
            <Text style={styles.metaLine}>التاريخ: {formatDate(contract.contract_date)}</Text>
            <Text style={styles.metaLine}>الحالة: {statusLabels[contract.status] || contract.status || '-'}</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>بيانات العقد</Text>
          <View style={styles.infoRow}>
            <View style={styles.infoCol}>
              <Text style={styles.label}>العميل</Text>
              <Text style={styles.value}>{contract.customer_name || contract.buyer_name || '-'}</Text>
            </View>
            <View style={styles.infoCol}>
              <Text style={styles.label}>تاريخ البدء</Text>
              <Text style={styles.value}>{formatDate(contract.start_date || contract.startDate)}</Text>
            </View>
            <View style={styles.infoCol}>
              <Text style={styles.label}>تاريخ الانتهاء</Text>
              <Text style={styles.value}>{formatDate(contract.end_date || contract.endDate)}</Text>
            </View>
          </View>
          <View style={styles.infoRow}>
            <View style={styles.infoCol}>
              <Text style={styles.label}>تاريخ التوقيع</Text>
              <Text style={styles.value}>{formatDate(contract.signed_date || contract.signedDate)}</Text>
            </View>
            <View style={styles.infoCol}>
              <Text style={styles.label}>القيمة الإجمالية</Text>
              <Text style={styles.value}>{formatCurrency(totalAmount, currency)}</Text>
            </View>
            <View style={styles.infoCol}>
              <Text style={styles.label}>حالة العقد</Text>
              <Text style={styles.badge}>{statusLabels[contract.status] || contract.status || '-'}</Text>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>أطراف العقد</Text>
          <View style={styles.infoRow}>
            <View style={styles.infoCol}>
              <Text style={styles.label}>البائع (الطرف الأول)</Text>
              <Text style={styles.value}>{contract.seller_company_name || contract.company_name || '-'}</Text>
              <Text style={styles.companyMeta}>{contract.seller_address || contract.company_address || '-'}</Text>
              {contract.seller_phone && <Text style={styles.companyMeta}>هاتف: {contract.seller_phone}</Text>}
              {contract.seller_authorized_person && <Text style={styles.companyMeta}>المخول: {contract.seller_authorized_person}</Text>}
            </View>
            <View style={styles.infoCol}>
              <Text style={styles.label}>المشتري (الطرف الثاني)</Text>
              <Text style={styles.value}>{contract.buyer_name || contract.customer_name || '-'}</Text>
              <Text style={styles.companyMeta}>{contract.buyer_address || contract.customer_address || '-'}</Text>
              {contract.buyer_phone && <Text style={styles.companyMeta}>هاتف: {contract.buyer_phone}</Text>}
              {contract.buyer_representative && <Text style={styles.companyMeta}>المخول: {contract.buyer_representative}</Text>}
            </View>
          </View>
        </View>

        {(contract.project_name || contract.project_location || contract.building_type || contract.num_floors) && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>بيانات المشروع</Text>
            <View style={styles.infoRow}>
              {contract.project_name && (
                <View style={styles.infoCol}>
                  <Text style={styles.label}>اسم المشروع</Text>
                  <Text style={styles.value}>{contract.project_name}</Text>
                </View>
              )}
              {contract.project_location && (
                <View style={styles.infoCol}>
                  <Text style={styles.label}>موقع المشروع</Text>
                  <Text style={styles.value}>{contract.project_location}</Text>
                </View>
              )}
              {contract.building_type && (
                <View style={styles.infoCol}>
                  <Text style={styles.label}>نوع المبنى</Text>
                  <Text style={styles.value}>{contract.building_type}</Text>
                </View>
              )}
              {contract.num_floors && (
                <View style={styles.infoCol}>
                  <Text style={styles.label}>عدد الطوابق</Text>
                  <Text style={styles.value}>{contract.num_floors}</Text>
                </View>
              )}
            </View>
          </View>
        )}
        {contract.contract_description && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>وصف العقد</Text>
            <Text style={styles.note}>{contract.contract_description}</Text>
          </View>
        )}

        {(elevators.length > 0 || contract.elevator_type || contract.elevator_model) && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>تفاصيل المصاعد</Text>
            {elevators.length > 0 ? (
              <View style={styles.table}>
                <View style={styles.tableHeader}>
                  <Text style={[styles.cell, styles.headerCell, styles.colIndex]}>#</Text>
                  <Text style={[styles.cell, styles.headerCell, styles.colLong]}>النوع</Text>
                  <Text style={[styles.cell, styles.headerCell, styles.colMedium]}>الموديل</Text>
                  <Text style={[styles.cell, styles.headerCell, styles.colMedium]}>الحمولة (كغم)</Text>
                  <Text style={[styles.cell, styles.headerCell, styles.colMedium]}>عدد الأشخاص</Text>
                  <Text style={[styles.cell, styles.headerCell, styles.colShort]}>السرعة (م/ث)</Text>
                  <Text style={[styles.cell, styles.headerCell, styles.colShort]}>عدد التوقفات</Text>
                  <Text style={[styles.cell, styles.headerCell, styles.colShort]}>الكمية</Text>
                  <Text style={[styles.cell, styles.headerCell, styles.colMedium]}>السعر الإجمالي</Text>
                </View>
                {elevators.map((elevator, idx) => (
                  <View key={elevator.id || idx} style={[styles.tableRow, idx % 2 === 1 && styles.altRow]}>
                    <Text style={[styles.cell, styles.colIndex]}>{idx + 1}</Text>
                    <Text style={[styles.cell, styles.colLong]}>{elevator.elevator_type || '-'}</Text>
                    <Text style={[styles.cell, styles.colMedium]}>{elevator.model || elevator.elevator_model || '-'}</Text>
                    <Text style={[styles.cell, styles.colMedium]}>{elevator.capacity_kg || '-'}</Text>
                    <Text style={[styles.cell, styles.colMedium]}>{elevator.capacity_persons || '-'}</Text>
                    <Text style={[styles.cell, styles.colShort]}>{elevator.speed_mps || '-'}</Text>
                    <Text style={[styles.cell, styles.colShort]}>{elevator.num_stops || elevator.stops || '-'}</Text>
                    <Text style={[styles.cell, styles.colShort]}>{elevator.quantity || 1}</Text>
                    <Text style={[styles.cell, styles.colMedium]}>{formatCurrency(pickFirst(elevator.total_price, elevator.total, elevator.price_total), currency)}</Text>
                  </View>
                ))}
                <View style={styles.tableRow}>
                  <Text style={[styles.cell, styles.colFull, { textAlign: 'left', fontWeight: 700 }]}>
                    إجمالي المصاعد: {formatCurrency(totalElevators, currency)}
                  </Text>
                </View>
              </View>
            ) : (
              <View style={styles.infoRow}>
                {contract.elevator_type && (
                  <View style={styles.infoCol}>
                    <Text style={styles.label}>نوع المصعد</Text>
                    <Text style={styles.value}>{contract.elevator_type}</Text>
                  </View>
                )}
                {contract.elevator_model && (
                  <View style={styles.infoCol}>
                    <Text style={styles.label}>الموديل</Text>
                    <Text style={styles.value}>{contract.elevator_model}</Text>
                  </View>
                )}
                {contract.elevator_cost && (
                  <View style={styles.infoCol}>
                    <Text style={styles.label}>تكلفة المصعد</Text>
                    <Text style={styles.value}>{formatCurrency(contract.elevator_cost, currency)}</Text>
                  </View>
                )}
              </View>
            )}
          </View>
        )}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>الشروط المالية</Text>
          <View style={styles.chipsRow}>
            <View style={[styles.chip, { backgroundColor: '#eef2ff' }]}>
              <Text style={styles.chipLabel}>القيمة الكلية للعقد</Text>
              <Text style={styles.chipValue}>{formatCurrency(totalAmount, currency)}</Text>
            </View>
            <View style={[styles.chip, { backgroundColor: '#f8fafc' }]}>
              <Text style={styles.chipLabel}>الدفعة المقدمة</Text>
              <Text style={styles.chipValue}>{formatCurrency(downPayment, currency)}</Text>
            </View>
            <View style={[styles.chip, { backgroundColor: '#f8fafc' }]}>
              <Text style={styles.chipLabel}>المتبقي</Text>
              <Text style={styles.chipValue}>{formatCurrency(remaining, currency)}</Text>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>جدول الدفعات</Text>
          <View style={styles.table}>
            <View style={styles.tableHeader}>
              <Text style={[styles.cell, styles.headerCell, styles.colIndex]}>#</Text>
              <Text style={[styles.cell, styles.headerCell, styles.colLong]}>الوصف</Text>
              <Text style={[styles.cell, styles.headerCell, styles.colShort]}>النسبة %</Text>
              <Text style={[styles.cell, styles.headerCell, styles.colMedium]}>المبلغ</Text>
              <Text style={[styles.cell, styles.headerCell, styles.colMedium]}>تاريخ الاستحقاق</Text>
              <Text style={[styles.cell, styles.headerCell, styles.colShort]}>الحالة</Text>
            </View>
            {payments.length > 0
              ? payments.map((payment, idx) => (
                <View key={payment.id || idx} style={[styles.tableRow, idx % 2 === 1 && styles.altRow]}>
                  <Text style={[styles.cell, styles.colIndex]}>{payment.payment_number || idx + 1}</Text>
                  <Text style={[styles.cell, styles.colLong]}>{payment.description || payment.name || payment.title || '-'}</Text>
                  <Text style={[styles.cell, styles.colShort]}>
                    {payment.percentage != null ? `${Number(payment.percentage).toFixed(2)}%` : '-'}
                  </Text>
                  <Text style={[styles.cell, styles.colMedium]}>{formatCurrency(pickFirst(payment.amount, payment.payment_amount), currency)}</Text>
                  <Text style={[styles.cell, styles.colMedium]}>{formatDate(payment.due_date || payment.dueDate)}</Text>
                  <Text style={[styles.cell, styles.colShort]}>{paymentStatusLabels[payment.status] || payment.status || '-'}</Text>
                </View>
              ))
              : milestones.length > 0
                ? milestones.map((ms, idx) => (
                  <View key={ms.id || idx} style={[styles.tableRow, idx % 2 === 1 && styles.altRow]}>
                    <Text style={[styles.cell, styles.colIndex]}>{idx + 1}</Text>
                    <Text style={[styles.cell, styles.colLong]}>{ms.title || ms.milestone_name || ms.name || '-'}</Text>
                    <Text style={[styles.cell, styles.colShort]}>-</Text>
                    <Text style={[styles.cell, styles.colMedium]}>{formatCurrency(pickFirst(ms.payment_amount, ms.amount), currency)}</Text>
                    <Text style={[styles.cell, styles.colMedium]}>{formatDate(ms.due_date || ms.dueDate)}</Text>
                    <Text style={[styles.cell, styles.colShort]}>{statusLabels[ms.status] || ms.status || '-'}</Text>
                  </View>
                ))
                : (
                  <View style={styles.tableRow}>
                    <Text style={[styles.cell, styles.colFull, { textAlign: 'center' }]}>لا توجد دفعات مسجلة</Text>
                  </View>
                )
            }
          </View>
        </View>

        {(contract.warranty_period || contract.seller_obligations || contract.buyer_obligations || contract.general_terms || contract.terms || DEFAULT_TERMS.length) && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>الشروط والأحكام</Text>
            {contract.warranty_period && (
              <Text style={[styles.note, { marginBottom: 6 }]}>فترة الضمان: {contract.warranty_period}</Text>
            )}
            {contract.seller_obligations && (
              <Text style={[styles.note, { marginBottom: 6 }]}>التزامات البائع: {contract.seller_obligations}</Text>
            )}
            {contract.buyer_obligations && (
              <Text style={[styles.note, { marginBottom: 6 }]}>التزامات المشتري: {contract.buyer_obligations}</Text>
            )}
            {contract.general_terms && <Text style={styles.note}>{contract.general_terms}</Text>}
            {!contract.general_terms && contract.terms && <Text style={styles.note}>{contract.terms}</Text>}
            {!contract.general_terms && !contract.terms && !contract.seller_obligations && !contract.buyer_obligations && DEFAULT_TERMS.map((term, idx) => (
              <Text key={idx} style={styles.note}>{`${idx + 1}. ${term}`}</Text>
            ))}
          </View>
        )}

        <View style={styles.signatureRow}>
          <View style={styles.signatureBlock}>
            <View style={styles.signatureLine} />
            <Text style={styles.signatureLabel}>توقيع وختم الشركة (البائع)</Text>
            <Text style={styles.signatureName}>الاسم: {contract.signed_by_company || '........................'}</Text>
            <Text style={styles.signatureName}>القسم: {contract.seller_department || '........................'}</Text>
          </View>
          <View style={styles.signatureBlock}>
            <View style={styles.signatureLine} />
            <Text style={styles.signatureLabel}>توقيع وختم العميل (المشتري)</Text>
            <Text style={styles.signatureName}>الاسم: {contract.signed_by_customer || '........................'}</Text>
            <Text style={styles.signatureName}>الوظيفة: {contract.buyer_role || '........................'}</Text>
          </View>
        </View>
      </Page>
    </Document>
  );
};

export default ContractPDF;
