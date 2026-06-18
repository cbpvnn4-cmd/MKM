import React from 'react';
import { Document, Page, Text, View, StyleSheet, Font } from '@react-pdf/renderer';

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

Font.registerHyphenationCallback((word) => [word]);

const styles = StyleSheet.create({
  page: {
    padding: 28,
    backgroundColor: '#f8fafc',
    fontFamily: 'Cairo',
  },
  header: {
    textAlign: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 16,
    fontWeight: 700,
    color: '#0f172a',
  },
  subtitle: {
    fontSize: 12,
    color: '#475569',
    marginTop: 2,
  },
  partnerName: {
    fontSize: 14,
    fontWeight: 700,
    marginTop: 8,
    color: '#111827',
  },
  meta: {
    fontSize: 10,
    color: '#475569',
    marginTop: 2,
  },
  section: {
    marginTop: 12,
    padding: 12,
    backgroundColor: '#ffffff',
    borderRadius: 6,
    border: '1 solid #e2e8f0',
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: 700,
    color: '#0f172a',
    marginBottom: 8,
    textAlign: 'right',
  },
  summaryGrid: {
    display: 'flex',
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  summaryCard: {
    flexGrow: 1,
    minWidth: '48%',
    border: '1 solid #e2e8f0',
    borderRadius: 6,
    padding: 10,
    backgroundColor: '#f8fafc',
  },
  summaryLabelAr: {
    fontSize: 10,
    color: '#0f172a',
    textAlign: 'right',
  },
  summaryLabelEn: {
    fontSize: 9,
    color: '#475569',
    textAlign: 'right',
  },
  summaryValue: {
    marginTop: 6,
    fontSize: 14,
    fontWeight: 700,
    color: '#0f172a',
    textAlign: 'right',
  },
  summaryValuePositive: {
    color: '#166534',
  },
  summaryValueNegative: {
    color: '#991b1b',
  },
  summaryValuePrimary: {
    color: '#6b21a8',
  },
  summaryPrimary: {
    border: '1 solid #c084fc',
    backgroundColor: '#faf5ff',
  },
  summaryPositive: {
    border: '1 solid #86efac',
    backgroundColor: '#f0fdf4',
    color: '#166534',
  },
  summaryNegative: {
    border: '1 solid #fecdd3',
    backgroundColor: '#fff1f2',
    color: '#991b1b',
  },
  table: {
    marginTop: 8,
    border: '1 solid #e2e8f0',
    borderRadius: 6,
    overflow: 'hidden',
  },
  tableHeaderRow: {
    flexDirection: 'row',
    backgroundColor: '#0f172a',
    color: '#ffffff',
  },
  tableRow: {
    flexDirection: 'row',
  },
  tableCell: {
    fontSize: 9,
    padding: 6,
    borderRight: '1 solid #e2e8f0',
    borderBottom: '1 solid #e2e8f0',
    textAlign: 'right',
  },
  headerCell: {
    fontWeight: 700,
    color: '#ffffff',
    borderColor: '#0f172a',
  },
  rowAlt: {
    backgroundColor: '#f8fafc',
  },
  colDate: { width: '13%' },
  colType: { width: '17%' },
  colDescription: { width: '26%' },
  colCurrency: { width: '10%' },
  colDebit: { width: '11%' },
  colCredit: { width: '11%' },
  colBalance: { width: '12%', borderRight: '0 solid transparent' },
  emptyState: {
    padding: 16,
    textAlign: 'center',
  },
  emptyText: {
    fontSize: 11,
    color: '#475569',
  },
});

const formatNumber = (value) =>
  new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(value || 0));

const formatDate = (value) => {
  if (!value) return '-';
  try {
    return new Date(value).toLocaleDateString('en-GB', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
  } catch {
    return '-';
  }
};

const getTransactionTypeLabel = (type) => {
  const types = {
    CAPITAL_DEPOSIT: 'إيداع رأس المال',
    CAPITAL_WITHDRAW: 'سحب رأس المال',
    PROFIT_DISTRIBUTION: 'توزيع أرباح',
    PROFIT_PAYOUT: 'صرف أرباح',
    ADJUSTMENT: 'تسوية',
    TRANSFER_IN: 'تحويل وارد',
    TRANSFER_OUT: 'تحويل صادر',
  };

  return types[type] || type || '-';
};

const SummaryCard = ({ labelAr, labelEn, value, variant }) => (
  <View
    style={[
      styles.summaryCard,
      variant === 'primary' && styles.summaryPrimary,
      variant === 'positive' && styles.summaryPositive,
      variant === 'negative' && styles.summaryNegative,
    ]}
  >
    <Text style={styles.summaryLabelAr}>{labelAr}</Text>
    <Text style={styles.summaryLabelEn}>{labelEn}</Text>
    <Text
      style={[
        styles.summaryValue,
        variant === 'primary' && styles.summaryValuePrimary,
        variant === 'positive' && styles.summaryValuePositive,
        variant === 'negative' && styles.summaryValueNegative,
      ]}
    >
      ${formatNumber(value)}
    </Text>
  </View>
);

const PartnerStatementPDF = ({ statement, partnerName, filters }) => {
  if (!statement) {
    return (
      <Document>
        <Page size="A4" style={styles.page}>
          <Text style={styles.title}>لا توجد بيانات لعرض كشف الشريك</Text>
        </Page>
      </Document>
    );
  }

  const transactions = statement.transactions || [];
  const fromDate = statement.from_date || filters?.from_date;
  const toDate = statement.to_date || filters?.to_date;
  const preparedAt = formatDate(new Date());

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.title}>كشف حساب الشريك</Text>
          <Text style={styles.subtitle}>Partner Account Statement</Text>
          <Text style={styles.partnerName}>{statement.partner_name || partnerName}</Text>
          <Text style={styles.meta}>
            الفترة: {formatDate(fromDate)} - {formatDate(toDate)}
          </Text>
          <Text style={styles.meta}>تاريخ التوليد: {preparedAt}</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>ملخص الحساب / Account Summary</Text>
          <View style={styles.summaryGrid}>
            <SummaryCard labelAr="الرصيد الافتتاحي" labelEn="Opening Balance" value={statement.opening_balance} />
            <SummaryCard labelAr="إجمالي الإيداعات" labelEn="Total Deposits" value={statement.total_deposits} variant="positive" />
            <SummaryCard labelAr="إجمالي السحوبات" labelEn="Total Withdrawals" value={statement.total_withdrawals} variant="negative" />
            <SummaryCard labelAr="الأرباح الموزعة" labelEn="Profits Distributed" value={statement.total_profits_distributed} />
            <SummaryCard labelAr="الرصيد الختامي" labelEn="Closing Balance" value={statement.closing_balance} variant="primary" />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>تفاصيل العمليات / Transaction Details</Text>
          <View style={styles.table}>
            <View style={styles.tableHeaderRow}>
              <Text style={[styles.tableCell, styles.headerCell, styles.colDate]}>التاريخ{'\n'}Date</Text>
              <Text style={[styles.tableCell, styles.headerCell, styles.colType]}>النوع{'\n'}Type</Text>
              <Text style={[styles.tableCell, styles.headerCell, styles.colDescription]}>الوصف{'\n'}Description</Text>
              <Text style={[styles.tableCell, styles.headerCell, styles.colCurrency]}>العملة{'\n'}Currency</Text>
              <Text style={[styles.tableCell, styles.headerCell, styles.colDebit]}>مدين{'\n'}Debit</Text>
              <Text style={[styles.tableCell, styles.headerCell, styles.colCredit]}>دائن{'\n'}Credit</Text>
              <Text style={[styles.tableCell, styles.headerCell, styles.colBalance]}>الرصيد{'\n'}Balance</Text>
            </View>
            {transactions.length > 0 ? (
              transactions.map((tx, index) => (
                <View key={`${tx.transaction_date}-${index}`} style={[styles.tableRow, index % 2 === 1 && styles.rowAlt]}>
                  <Text style={[styles.tableCell, styles.colDate]}>{formatDate(tx.transaction_date)}</Text>
                  <Text style={[styles.tableCell, styles.colType]}>
                    {getTransactionTypeLabel(tx.transaction_type)}
                  </Text>
                  <Text style={[styles.tableCell, styles.colDescription]}>{tx.description || '-'}</Text>
                  <Text style={[styles.tableCell, styles.colCurrency]}>{tx.currency || '-'}</Text>
                  <Text style={[styles.tableCell, styles.colDebit]}>{tx.debit_amount > 0 ? formatNumber(tx.debit_amount) : '-'}</Text>
                  <Text style={[styles.tableCell, styles.colCredit]}>{tx.credit_amount > 0 ? formatNumber(tx.credit_amount) : '-'}</Text>
                  <Text style={[styles.tableCell, styles.colBalance]}>{formatNumber(tx.running_balance)}</Text>
                </View>
              ))
            ) : (
              <View style={styles.emptyState}>
                <Text style={styles.emptyText}>لا توجد معاملات متاحة في الفترة المحددة</Text>
              </View>
            )}
          </View>
        </View>
      </Page>
    </Document>
  );
};

export default PartnerStatementPDF;
