import React from 'react';
import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';
import { registerCairoFont, formatPdfCurrency, basePdfStyles } from './pdfUtils';

registerCairoFont();

const styles = StyleSheet.create({
  ...basePdfStyles,
  header: {
    ...basePdfStyles.header,
    borderBottom: '2 solid #22c55e',
  },
});

const Section = ({ title, items }) => (
  <View style={styles.section}>
    <Text style={styles.sectionTitle}>{title}</Text>
    {items.map((item, idx) => (
      <View key={idx} style={styles.row}>
        <Text style={styles.rowLabel}>{item.label}</Text>
        <Text>{formatPdfCurrency(item.amount)}</Text>
      </View>
    ))}
  </View>
);

const BalanceSheetPDF = ({ report }) => {
  const data = report || {};

  const assets = [
    { label: 'Cash & Bank', amount: data.cash_and_bank },
    { label: 'Accounts Receivable', amount: data.accounts_receivable },
    { label: 'Inventory', amount: data.inventory },
    { label: 'Equipment', amount: data.equipment },
    { label: 'Other Assets', amount: data.other_assets },
    { label: 'Total Assets', amount: data.total_assets },
  ];

  const liabilities = [
    { label: 'Accounts Payable', amount: data.accounts_payable },
    { label: 'Short-term Loans', amount: data.short_term_loans },
    { label: 'Taxes Payable', amount: data.taxes_payable },
    { label: 'Other Liabilities', amount: data.other_liabilities },
    { label: 'Total Liabilities', amount: data.total_liabilities },
  ];

  const equity = [
    { label: 'Partner Capital', amount: data.partner_capital },
    { label: 'Retained Earnings', amount: data.retained_earnings },
    { label: 'Total Equity', amount: data.total_equity },
  ];

  const totalLiabilitiesEquity =
    Number(data.total_liabilities || 0) + Number(data.total_equity || 0);

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.title}>تقرير الميزانية العمومية</Text>
          <Text style={styles.subtitle}>
            تاريخ التقرير:{' '}
            {data.generated_date
              ? new Date(data.generated_date).toLocaleDateString()
              : new Date().toLocaleDateString()}
          </Text>
        </View>

        <Section title="الأصول" items={assets} />
        <Section title="الالتزامات" items={liabilities} />
        <Section title="حقوق الملكية" items={equity} />

        <View style={styles.summaryCard}>
          <Text style={styles.summaryText}>
            إجمالي الالتزامات + حقوق الملكية: {formatPdfCurrency(totalLiabilitiesEquity)}
          </Text>
          <Text style={[styles.summaryText, { marginTop: 4 }]}>
            إجمالي الأصول: {formatPdfCurrency(data.total_assets)}
          </Text>
        </View>
      </Page>
    </Document>
  );
};

export default BalanceSheetPDF;
