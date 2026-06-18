// API Configuration
// Centralized API base URL configuration

// Get API base URL from environment variable or use default
// Development: http://localhost:8000
// Production: Set VITE_API_BASE_URL in .env file
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

// Log API URL in development for debugging
if (import.meta.env.DEV) {
  console.log('🔗 API Base URL:', API_BASE_URL);
}

// API Endpoints
export const API_ENDPOINTS = {
  // Auth
  LOGIN: '/api/auth/login',
  LOGOUT: '/api/auth/logout',
  ME: '/api/auth/me',
  REGISTER: '/api/auth/register',

  // Products
  PRODUCTS: '/api/products',
  PRODUCT: (id) => `/api/products/${id}`,

  // Customers
  CUSTOMERS: '/api/customers',
  CUSTOMER: (id) => `/api/customers/${id}`,

  // Suppliers
  SUPPLIERS: '/api/suppliers',
  SUPPLIER: (id) => `/api/suppliers/${id}`,

  // Partners
  PARTNERS: '/api/partners',
  PARTNER: (id) => `/api/partners/${id}`,

  // Warehouses
  WAREHOUSES: '/api/warehouses',
  WAREHOUSE: (id) => `/api/warehouses/${id}`,

  // Sales Orders
  SALES_ORDERS: '/api/sales-orders',
  SALES_ORDER: (id) => `/api/sales-orders/${id}`,
  SALES_ORDERS_UNINVOICED: '/api/sales-orders/uninvoiced',

  // Invoices
  INVOICES: '/api/invoices',
  INVOICE: (id) => `/api/invoices/${id}`,
  INVOICE_NEXT_NUMBER: '/api/invoices/next-number',
  INVOICE_PAYMENTS: (id) => `/api/sales-invoices/${id}/payments`,
  INVOICE_PAYMENT_DELETE: (id) => `/api/sales-invoice-payments/${id}`,

  // Purchase Orders
  PURCHASE_ORDERS: '/api/purchase-orders',
  PURCHASE_ORDER: (id) => `/api/purchase-orders/${id}`,
  PURCHASE_ORDER_RECEIVE: (id) => `/api/purchase-orders/${id}/receive`,

  // Quotations
  QUOTATIONS: '/api/quotations',
  QUOTATION: (id) => `/api/quotations/${id}`,

  // Contracts
  CONTRACTS: '/api/contracts',
  CONTRACT: (id) => `/api/contracts/${id}`,
  CONTRACT_ACTIVATE: (id) => `/api/contracts/${id}/activate`,
  CONTRACT_COMPLETE: (id) => `/api/contracts/${id}/complete`,
  CONTRACT_CONVERT_TO_SO: (id) => `/api/contracts/${id}/convert-to-sales-order`,
  QUOTATION_CONVERT_TO_CONTRACT: (id) => `/api/quotations/${id}/convert-to-contract`,

  // Expenses
  EXPENSES: '/api/expenses',
  EXPENSE: (id) => `/api/expenses/${id}`,

  // Stock Movements
  STOCK_MOVEMENTS: '/api/stock-movements',

  // Reports
  REPORTS_PROFIT_LOSS: '/api/reports/profit-loss',
  REPORTS_BALANCE_SHEET: '/api/reports/balance-sheet',
  REPORTS_INVENTORY: '/api/reports/inventory',
  REPORTS_PARTNER_DISTRIBUTION: '/api/reports/partner-distribution',

  // Users
  USERS: '/api/users',
  USER: (id) => `/api/users/${id}`,

  // Capital Movements
  CAPITAL_MOVEMENTS: '/api/capital-movements',

  // Ownership Snapshots
  OWNERSHIP_SNAPSHOTS: '/api/ownership-snapshots',

  // Profit Distribution
  PROFIT_DISTRIBUTION: '/api/profit-distribution',
};

// Helper function to build full URL
export const buildApiUrl = (endpoint) => {
  return `${API_BASE_URL}${endpoint}`;
};

// Helper function to get auth headers
export const getAuthHeaders = () => {
  const token = localStorage.getItem('access_token') || sessionStorage.getItem('access_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
};

// Helper function for API requests
export const apiRequest = async (endpoint, options = {}) => {
  const url = buildApiUrl(endpoint);
  const headers = {
    'Content-Type': 'application/json',
    ...getAuthHeaders(),
    ...options.headers,
  };

  const response = await fetch(url, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Network error' }));
    throw new Error(error.detail || error.message || 'Request failed');
  }

  return response.json();
};

export default {
  API_BASE_URL,
  API_ENDPOINTS,
  buildApiUrl,
  getAuthHeaders,
  apiRequest,
};
