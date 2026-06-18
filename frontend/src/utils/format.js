// Simple shared formatting helpers for locale and currency

const getLocale = () => (import.meta?.env?.VITE_LOCALE) || 'en-GB'; // Changed to en-GB for Gregorian calendar with Arabic number formatting
const getCurrency = () => (import.meta?.env?.VITE_CURRENCY) || 'USD';

export const formatCurrency = (amount, { currency, minimumFractionDigits = 2, maximumFractionDigits = 2 } = {}) => {
  const value = Number.isFinite(Number(amount)) ? Number(amount) : 0;
  const cur = currency || getCurrency();
  const locale = getLocale();
  try {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: cur,
      minimumFractionDigits,
      maximumFractionDigits,
    }).format(value);
  } catch {
    // Fallback
    return `${value.toFixed(2)} ${cur}`;
  }
};

export const formatDate = (dateInput, opts = {}) => {
  // Always use en-GB for Gregorian calendar dates
  const locale = 'en-GB';
  const date = dateInput instanceof Date ? dateInput : new Date(dateInput);
  const options = {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    calendar: 'gregory', // Explicitly use Gregorian calendar
    ...opts,
  };
  try {
    return new Intl.DateTimeFormat(locale, options).format(date);
  } catch {
    // Fallback ISO slice
    return isNaN(date.getTime()) ? '' : date.toISOString().slice(0, 10);
  }
};

export const numberFormat = (value, { minimumFractionDigits = 0, maximumFractionDigits = 0 } = {}) => {
  // Always use en-US for numbers to avoid Arabic-Indic numerals
  const n = Number.isFinite(Number(value)) ? Number(value) : 0;
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits,
    maximumFractionDigits,
  }).format(n);
};

export const localeConfig = { getLocale, getCurrency };
