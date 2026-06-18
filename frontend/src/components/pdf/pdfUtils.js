import { Font, StyleSheet } from '@react-pdf/renderer';

/**
 * Register the Cairo Arabic font once for all PDF components.
 * Called lazily so multiple imports don't conflict.
 */
let fontRegistered = false;
export const registerCairoFont = () => {
  if (fontRegistered) return;
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
    fontRegistered = true;
  } catch (error) {
    console.warn('Failed to register Cairo font:', error?.message || error);
  }
};

/**
 * Shared base styles used across all PDF documents.
 */
export const basePdfStyles = StyleSheet.create({
  page: {
    padding: 24,
    fontFamily: 'Cairo',
    backgroundColor: '#f8fafc',
  },
  header: {
    marginBottom: 16,
    paddingBottom: 8,
    borderBottom: '2 solid #2563eb',
  },
  title: {
    fontSize: 18,
    fontWeight: 700,
    color: '#0f172a',
  },
  subtitle: {
    fontSize: 10,
    color: '#475569',
    marginTop: 4,
  },
  section: {
    marginTop: 12,
    padding: 12,
    backgroundColor: '#ffffff',
    borderRadius: 8,
    border: '1 solid #e2e8f0',
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: 700,
    color: '#0f172a',
    marginBottom: 8,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    fontSize: 10,
    color: '#0f172a',
    paddingVertical: 4,
    borderBottom: '1 solid #e2e8f0',
  },
  rowLabel: {
    fontWeight: 600,
  },
  summaryCard: {
    marginTop: 12,
    padding: 12,
    borderRadius: 8,
    backgroundColor: '#ecfeff',
    border: '1 solid #67e8f9',
  },
  summaryText: {
    fontSize: 11,
    color: '#0f172a',
    fontWeight: 700,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#0f172a',
    color: '#ffffff',
  },
  cell: {
    padding: 6,
    fontSize: 9,
    borderRight: '1 solid #e2e8f0',
    borderBottom: '1 solid #e2e8f0',
  },
  headCell: {
    fontWeight: 700,
  },
});

/**
 * Format a numeric value as a USD currency string.
 */
export const formatPdfCurrency = (value, currency = 'USD') => {
  const amount = Number(value || 0);
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number.isFinite(amount) ? amount : 0);
};

/**
 * Format a date string into a readable short date.
 */
export const formatPdfDate = (value) => {
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
