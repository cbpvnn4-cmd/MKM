import axios from 'axios';

// API prefix and runtime base detection (handles 8000/8002 automatically)
const API_PREFIX = '/api';
// Always resolve at runtime to validate connectivity; env value is only a first candidate
let RUNTIME_BASE_URL = null;
let resolvingBase = null;

const candidateBases = () => {
  const envBase = (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_API_URL) ? import.meta.env.VITE_API_URL.replace(/\/$/, '') : null;
  const schemes = ['http', 'https'];
  const ports = [8000, 8002];
  const winHost = (typeof window !== 'undefined') ? window.location.hostname : 'localhost';
  const hosts = new Set(['localhost', '127.0.0.1', winHost]);
  const bases = new Set();

  if (envBase) {
    bases.add(envBase);
  }

  hosts.forEach((host) => {
    ports.forEach((port) => {
      schemes.forEach((scheme) => {
        bases.add(`${scheme}://${host}:${port}`);
      });
    });
  });

  if (typeof window !== 'undefined' && window.location.origin) {
    bases.add(window.location.origin.replace(/\/$/, ''));
  }

  return [...bases];
};

const detectBaseURL = async () => {
  // If we already resolved a working base in this session, reuse it
  if (RUNTIME_BASE_URL) return RUNTIME_BASE_URL;
  if (!resolvingBase) {
    resolvingBase = (async () => {
      const bases = candidateBases();
      for (const base of bases) {
        try {
          const res = await fetch(`${base}/health`, { method: 'GET' });
          if (res.ok) {
            RUNTIME_BASE_URL = base;
            return base;
          }
        } catch (_) {
          // try next candidate silently
        }
      }
      // Final fallback if nothing responded
      const fallbackOrigin = (typeof window !== 'undefined' && window.location.origin) ? window.location.origin.replace(/\/$/, '') : null;
      RUNTIME_BASE_URL = (import.meta?.env?.VITE_API_URL) || fallbackOrigin || 'http://localhost:8000';
      return RUNTIME_BASE_URL;
    })();
  }
  return resolvingBase;
};

// Create axios instance
const apiClient = axios.create({
  // Will be overridden by detectBaseURL() in the interceptor before send
  baseURL: 'http://localhost:8000',
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
});

// Request interceptor
apiClient.interceptors.request.use(
  async (config) => {
    try {
      const base = await detectBaseURL();
      if (base) config.baseURL = base;
    } catch (_) { /* keep existing */ }
    if (config.url && !config.url.startsWith('http')) {
      const normalizedPath = config.url.startsWith('/') ? config.url : `/${config.url}`;
      const hasApiPrefix = normalizedPath.startsWith(`${API_PREFIX}/`) || normalizedPath === API_PREFIX;
      config.url = hasApiPrefix ? normalizedPath : `${API_PREFIX}${normalizedPath}`;
    }

    const persistentToken = localStorage.getItem('access_token');
    const sessionToken = sessionStorage.getItem('access_token');
    const token = persistentToken || sessionToken;

    // Debug logging without leaking token contents
    console.log('[API Request]', {
      method: config.method,
      url: config.url,
      baseURL: config.baseURL,
      fullURL: `${config.baseURL}${config.url}`,
      hasToken: !!token,
      tokenPreview: token ? '<hidden>' : 'NO TOKEN'
    });

    if (token) {
      if (!config.headers) {
        config.headers = {};
      }
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    console.error('[API Request Error]', error);
    return Promise.reject(error);
  }
);

// Response interceptor with smart error handling
apiClient.interceptors.response.use(
  (response) => {
    console.log('[API Response Success]', {
      url: response.config.url,
      status: response.status,
      dataType: Array.isArray(response.data) ? 'array' : typeof response.data,
      dataLength: Array.isArray(response.data) ? response.data.length : 'N/A'
    });
    return response;
  },
  async (error) => {
    const originalRequest = error.config;
    const status = error?.response?.status;
    const url = error?.config?.url || '';
    const detail = error?.response?.data?.detail;

    console.error('[API Response Error]', {
      url,
      status,
      detail,
      fullError: error?.response?.data
    });

    const isLoginCall = url.includes('/auth/login');
    const isRegisterCall = url.includes('/auth/register');
    const isInvalidCreds = detail === 'Incorrect username or password';

    // Handle 401 Unauthorized - Token expired or invalid
    if (status === 401 && !isLoginCall && !isInvalidCreds && !originalRequest._retry) {
      originalRequest._retry = true;

      const currentPath = window.location.pathname;
      if (currentPath.includes('purchase-order')) {
        console.log('[Auth] Saving purchase order draft before redirect...');
      }

      // Clear tokens
      localStorage.removeItem('access_token');
      localStorage.removeItem('token_expiry');
      localStorage.removeItem('remember_duration');
      sessionStorage.removeItem('access_token');

      // Show user-friendly message
      if (typeof window !== 'undefined' && window.location.pathname !== '/login') {
        const notification = document.createElement('div');
        notification.innerHTML = `
          <div style="position: fixed; top: 20px; right: 20px; z-index: 10000; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px 30px; border-radius: 15px; box-shadow: 0 10px 40px rgba(0,0,0,0.3); max-width: 400px; font-family: 'Rubik', 'Noto Sans Arabic', 'Cairo', 'Tajawal', 'Inter', sans-serif;">
            <div style="display: flex; align-items: center; gap: 15px;">
              <div style="font-size: 32px;">🔒</div>
              <div>
                <div style="font-size: 18px; font-weight: bold; margin-bottom: 5px;">انتهت الجلسة</div>
                <div style="font-size: 14px; opacity: 0.9;">تم تسجيل الخروج بسبب انتهاء صلاحية الجلسة. سيتم توجيهك لتسجيل الدخول من جديد...</div>
              </div>
            </div>
          </div>
        `;
        document.body.appendChild(notification);

        setTimeout(() => {
          window.location.href = '/login?redirect=' + encodeURIComponent(currentPath);
        }, 2000);
      }

      return Promise.reject(error);
    }

    // Handle 403 Forbidden - No permission
    if (status === 403 && !isLoginCall && !isRegisterCall) {
      console.error('[Auth] Access forbidden - insufficient permissions');

      if (typeof window !== 'undefined') {
        const notification = document.createElement('div');
        notification.innerHTML = `
          <div style="position: fixed; top: 20px; right: 20px; z-index: 10000; background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); color: white; padding: 20px 30px; border-radius: 15px; box-shadow: 0 10px 40px rgba(0,0,0,0.3); max-width: 400px; font-family: 'Rubik', 'Noto Sans Arabic', 'Cairo', 'Tajawal', 'Inter', sans-serif;">
            <div style="display: flex; align-items: center; gap: 15px;">
              <div style="font-size: 32px;">🚫</div>
              <div>
                <div style="font-size: 18px; font-weight: bold; margin-bottom: 5px;">صلاحيات غير كافية</div>
                <div style="font-size: 14px; opacity: 0.9;">ليس لديك صلاحية لتنفيذ هذه العملية. تواصل مع مسؤول النظام للحصول على صلاحية.</div>
              </div>
            </div>
          </div>
        `;
        document.body.appendChild(notification);
        setTimeout(() => notification.remove(), 4000);
      }
    }

    // Handle Network Errors
    if (!error.response && error.message) {
      console.error('[Network Error]', error.message);

      if (error.message.toLowerCase().includes('network') ||
          error.message.toLowerCase().includes('failed to fetch')) {
        if (typeof window !== 'undefined' && !window._networkErrorShown) {
          window._networkErrorShown = true;

          const notification = document.createElement('div');
          notification.innerHTML = `
            <div style="position: fixed; top: 20px; right: 20px; z-index: 10000; background: linear-gradient(135deg, #fa709a 0%, #fee140 100%); color: #333; padding: 20px 30px; border-radius: 15px; box-shadow: 0 10px 40px rgba(0,0,0,0.3); max-width: 400px; font-family: 'Rubik', 'Noto Sans Arabic', 'Cairo', 'Tajawal', 'Inter', sans-serif;">
              <div style="display: flex; align-items: center; gap: 15px;">
                <div style="font-size: 32px;">🌐</div>
                <div>
                  <div style="font-size: 18px; font-weight: bold; margin-bottom: 5px;">مشكلة في الاتصال</div>
                  <div style="font-size: 14px; opacity: 0.9;">تعذر الوصول للخادم. تأكد من الاتصال أو المنافذ 8000 / 8002 ثم أعد المحاولة.</div>
                </div>
              </div>
            </div>
          `;
          document.body.appendChild(notification);
          setTimeout(() => {
            notification.remove();
            window._networkErrorShown = false;
          }, 5000);
        }
      }
    }

    return Promise.reject(error);
  }
);
// Authentication API functions
export const login = async (username, password, rememberDays = null) => {
  // FastAPI OAuth2PasswordRequestForm expects x-www-form-urlencoded
  const form = new URLSearchParams();
  form.append('username', username);
  form.append('password', password);
  if (rememberDays && Number.isFinite(rememberDays)) {
    try { form.append('remember_days', String(rememberDays)); } catch (_) {}
  }
  const response = await apiClient.post('/auth/login', form, {
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  });
  return response.data;
};

// Register new user
export const register = async (userData) => {
  const response = await apiClient.post('/auth/register', userData);
  return response.data;
};

// User Management API
export const userAPI = {
  getUsers: async (skip = 0, limit = 100) => {
    const response = await apiClient.get(`/admin/users?skip=${skip}&limit=${limit}`);
    return response.data;
  },

  createUser: async (userData) => {
    const response = await apiClient.post('/admin/users', userData);
    return response.data;
  },

  updateUser: async (userId, userData) => {
    const response = await apiClient.put(`/admin/users/${userId}`, userData);
    return response.data;
  },

  deleteUser: async (userId) => {
    const response = await apiClient.delete(`/admin/users/${userId}`);
    return response.data;
  },

  getRoles: async () => {
    const response = await apiClient.get('/admin/roles');
    return response.data;
  },

  createRole: async (roleData) => {
    const response = await apiClient.post('/admin/roles', roleData);
    return response.data;
  },

  getPermissions: async () => {
    const response = await apiClient.get('/admin/permissions');
    return response.data;
  },

  assignUserRoles: async (userId, roleIds) => {
    const response = await apiClient.post('/admin/assign-roles', {
      user_id: userId,
      role_ids: roleIds
    });
    return response.data;
  },

  initPermissions: async () => {
    const response = await apiClient.post('/admin/init-permissions');
    return response.data;
  },

  // Reset user password
  resetUserPassword: async (userId, newPassword) => {
    const response = await apiClient.post(`/admin/users/${userId}/reset-password`, {
      new_password: newPassword
    });
    return response.data;
  },

  // Get user permissions
  getUserPermissions: async (userId) => {
    const response = await apiClient.get(`/admin/users/${userId}/permissions`);
    return response.data;
  },

  // Assign custom permissions to user
  assignUserPermissions: async (userId, permissionIds) => {
    const response = await apiClient.post('/admin/assign-permissions', {
      user_id: userId,
      permission_ids: permissionIds
    });
    return response.data;
  },

  // Bulk delete users
  bulkDeleteUsers: async (userIds) => {
    const response = await apiClient.post('/admin/users/bulk-delete', {
      user_ids: userIds
    });
    return response.data;
  },

  // Bulk activate/deactivate users
  bulkUpdateUserStatus: async (userIds, isActive) => {
    const response = await apiClient.post('/admin/users/bulk-status', {
      user_ids: userIds,
      is_active: isActive
    });
    return response.data;
  },

  // Export users to CSV
  exportUsers: async () => {
    const response = await apiClient.get('/admin/users/export', {
      responseType: 'blob'
    });
    return response.data;
  },

  // Lock/unlock user account
  lockUserAccount: async (userId, locked) => {
    const response = await apiClient.post(`/admin/users/${userId}/lock`, {
      locked: locked
    });
    return response.data;
  },

  // Send notification to user
  sendUserNotification: async (userId, message) => {
    const response = await apiClient.post(`/admin/users/${userId}/notify`, {
      message: message
    });
    return response.data;
  },

  // Get user activity log
  getUserActivityLog: async (userId, limit = 50) => {
    const response = await apiClient.get(`/admin/users/${userId}/activity?limit=${limit}`);
    return response.data;
  }
};

// Profit Distribution API functions
export const profitAPI = {
  // Run profit distribution
  runDistribution: async (targetMonth, method = 'TWCap') => {
    const response = await apiClient.post('/profit-distribution/run', {
      target_month: targetMonth,
      method
    });
    return response.data;
  },

  // Get distribution details for a specific month
  getDistribution: async (month) => {
    const response = await apiClient.get(`/profit-distribution/distribution/${month}`);
    return response.data;
  },

  // Simulate profit distribution
  simulate: async (targetMonth, netProfit, method = 'TWCap') => {
    const response = await apiClient.post('/profit-distribution/simulate', {
      target_month: targetMonth,
      net_profit: netProfit,
      method
    });
    return response.data;
  },

  // Get profit configuration
  getConfig: async () => {
    const response = await apiClient.get('/profit-distribution/config');
    return response.data;
  },

  // Update profit configuration
  updateConfig: async (config) => {
    const response = await apiClient.put('/profit-distribution/config', config);
    return response.data;
  },

  // Update an existing profit distribution (requires reason)
  updateDistribution: async (runId, payload) => {
    const response = await apiClient.put(`/profit-distribution/distribution/${runId}`, payload);
    return response.data;
  },

  // Delete a profit distribution with strict confirmation
  deleteDistribution: async (runId, payload) => {
    const response = await apiClient.delete(`/profit-distribution/distribution/${runId}`, { data: payload });
    return response.data;
  },

  // Get profit summary for a period
  getSummary: async (startMonth, endMonth) => {
    const response = await apiClient.get('/profit-distribution/summary', {
      params: { start_month: startMonth, end_month: endMonth }
    });
    return response.data;
  },

  // Get profit history
  getHistory: async (limit = 12) => {
    const response = await apiClient.get('/profit-distribution/history', {
      params: { limit }
    });
    return response.data;
  }
};

export const getDashboardOverview = async () => {
  const response = await apiClient.get('/reports/dashboard-overview');
  return response.data;
};

export const logout = async () => {
  try {
    await apiClient.post('/auth/logout');
  } catch (error) {
    // Even if logout fails on server, we still clear local token
    console.error('Logout error:', error);
  } finally {
    // Clear token from localStorage
    localStorage.removeItem('access_token');
    // Redirect to login page
    window.location.href = '/login';
  }
};

// Simple health check utility for diagnostics
export const ping = async () => {
  try {
    const base = await detectBaseURL();
    // No credentials to simplify CORS in dev
    const res = await fetch(`${base}/health`, { method: 'GET', credentials: 'omit' });
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      const err = new Error(`Health check failed with ${res.status}`);
      err.response = { status: res.status, data: text };
      err.config = { baseURL: base, url: '/health' };
      throw err;
    }
    const data = await res.json().catch(() => ({ ok: true }));
    return { ok: true, data };
  } catch (e) {
    return { ok: false, error: e };
  }
};

export const getCurrentUser = async () => {
  const response = await apiClient.get('/auth/me');
  return response.data;
};

// Partner API functions
export const getPartners = async () => {
  const response = await apiClient.get('/partners');
  return response.data;
};

export const getPartner = async (id) => {
  const response = await apiClient.get(`/partners/${id}`);
  return response.data;
};

export const getCapitalSummary = async () => {
  const response = await apiClient.get('/partners/capital-summary');
  return response.data;
};

export const createPartner = async (partnerData) => {
  const response = await apiClient.post('/partners', partnerData);
  return response.data;
};

export const updatePartner = async (id, partnerData) => {
  const response = await apiClient.put(`/partners/${id}`, partnerData);
  return response.data;
};

export const deletePartner = async (id) => {
  const response = await apiClient.delete(`/partners/${id}`);
  return response.data;
};

// Partner Capital Movement API functions
export const getPartnerCapitalMovements = async (partnerId, skip = 0, limit = 100) => {
  const response = await apiClient.get(`/partners/${partnerId}/capital-movements?skip=${skip}&limit=${limit}`);
  return response.data;
};

export const createPartnerCapitalMovement = async (partnerId, movementData) => {
  const response = await apiClient.post(`/partners/${partnerId}/capital-movements`, movementData);
  return response.data;
};

// Get all capital movements for all partners
export const getAllCapitalMovements = async (skip = 0, limit = 100) => {
  // This will aggregate movements from all partners
  const partners = await getPartners();
  const allMovements = [];

  for (const partner of partners) {
    try {
      const movements = await getPartnerCapitalMovements(partner.id, 0, 1000);
      const movementsWithPartner = movements.map(movement => ({
        ...movement,
        partner_name: partner.name,
        partner
      }));
      allMovements.push(...movementsWithPartner);
    } catch (error) {
      console.error(`Error fetching movements for partner ${partner.id}:`, error);
    }
  }

  // Sort by date descending
  allMovements.sort((a, b) => new Date(b.happened_at) - new Date(a.happened_at));

  // Apply pagination
  return allMovements.slice(skip, skip + limit);
};

// Ownership Snapshot API functions
export const getPartnerOwnershipSnapshots = async (partnerId, skip = 0, limit = 100) => {
  const response = await apiClient.get(`/partners/${partnerId}/ownership-snapshots?skip=${skip}&limit=${limit}`);
  return response.data;
};

export const createPartnerOwnershipSnapshot = async (partnerId, snapshotData) => {
  const response = await apiClient.post(`/partners/${partnerId}/ownership-snapshots`, snapshotData);
  return response.data;
};

// ============================================
// Partner Financial Summary APIs (NEW)
// ============================================

/**
 * الحصول على الملخص المالي الشامل للشريك
 */
export const getPartnerFinancialSummary = async (partnerId) => {
  try {
    const response = await apiClient.get(`/partners/${partnerId}/financial-summary`);
    return response.data;
  } catch (error) {
    console.error('Error fetching partner financial summary:', error);
    throw error;
  }
};

/**
 * الحصول على جميع مدفوعات الأرباح للشريك
 */
export const getPartnerProfitPayouts = async (partnerId) => {
  try {
    const response = await apiClient.get(`/partners/${partnerId}/profit-payouts`);
    return response.data;
  } catch (error) {
    console.error('Error fetching partner profit payouts:', error);
    throw error;
  }
};

/**
 * إضافة مدفوعة أرباح جديدة للشريك
 */
export const createPartnerProfitPayout = async (partnerId, payoutData) => {
  try {
    const response = await apiClient.post(`/partners/${partnerId}/profit-payouts`, payoutData);
    return response.data;
  } catch (error) {
    console.error('Error creating partner profit payout:', error);
    throw error;
  }
};

/**
 * الحصول على دفتر الأستاذ (كل المعاملات) للشريك
 */
export const getPartnerAccountLedger = async (partnerId) => {
  try {
    const response = await apiClient.get(`/partners/${partnerId}/account-ledger`);
    return response.data;
  } catch (error) {
    console.error('Error fetching partner account ledger:', error);
    throw error;
  }
};

/**
 * الحصول على كشف حساب الشريك التفصيلي مع الفلترة
 */
export const getPartnerAccountStatement = async (partnerId, filters = {}) => {
  try {
    const params = new URLSearchParams();
    if (filters.from_date) params.append('from_date', filters.from_date);
    if (filters.to_date) params.append('to_date', filters.to_date);
    if (filters.transaction_type) params.append('transaction_type', filters.transaction_type);
    
    const queryString = params.toString();
    const url = `/partners/${partnerId}/account-statement${queryString ? `?${queryString}` : ''}`;
    
    const response = await apiClient.get(url);
    return response.data;
  } catch (error) {
    console.error('Error fetching partner account statement:', error);
    throw error;
  }
};

// Helper function to calculate and create ownership snapshots for all partners
export const calculateAndCreateOwnershipSnapshots = async () => {
  try {
    // Get all partners
    const partners = await getPartners();

    // Calculate total capital across all partners
    let totalCapital = 0;
    const partnerCapitals = [];

    for (const partner of partners) {
      try {
        const movements = await getPartnerCapitalMovements(partner.id);
        const deposits = movements.filter(m => m.movement_type === 'DEPOSIT').reduce((sum, m) => sum + parseFloat(m.amount_usd || 0), 0);
        const withdrawals = movements.filter(m => m.movement_type === 'WITHDRAW').reduce((sum, m) => sum + parseFloat(m.amount_usd || 0), 0);
        const netCapital = deposits - withdrawals;

        partnerCapitals.push({
          partner,
          netCapital
        });

        totalCapital += netCapital;
      } catch (error) {
        console.error(`Error calculating capital for partner ${partner.id}:`, error);
      }
    }

    // Create ownership snapshots with calculated percentages
    const today = new Date().toISOString().split('T')[0];

    for (const { partner, netCapital } of partnerCapitals) {
      if (totalCapital > 0) {
        const ownershipPercentage = (netCapital / totalCapital) * 100;

        try {
          await createPartnerOwnershipSnapshot(partner.id, {
            equity_pct: ownershipPercentage,
            equity_usd: netCapital,
            snapshot_on: today,
            ownership_percentage: ownershipPercentage,
            ownership_value: netCapital,
            snapshot_date: today
          });
        } catch (error) {
          console.error(`Error creating ownership snapshot for partner ${partner.id}:`, error);
        }
      }
    }

    return true;
  } catch (error) {
    console.error('Error calculating ownership snapshots:', error);
    throw error;
  }
};

// Get all ownership snapshots for all partners
export const getAllOwnershipSnapshots = async (skip = 0, limit = 100) => {
  const partners = await getPartners();
  const allSnapshots = [];

  for (const partner of partners) {
    try {
      const snapshots = await getPartnerOwnershipSnapshots(partner.id, 0, 1000);
      const snapshotsWithPartner = snapshots.map(snapshot => ({
        ...snapshot,
        partner_name: partner.name,
        partner
      }));
      allSnapshots.push(...snapshotsWithPartner);
    } catch (error) {
      console.error(`Error fetching snapshots for partner ${partner.id}:`, error);
    }
  }

  // Sort by date descending
  allSnapshots.sort((a, b) => {
    const dateA = a.snapshot_on || a.snapshot_date;
    const dateB = b.snapshot_on || b.snapshot_date;
    return new Date(dateB) - new Date(dateA);
  });

  // Apply pagination
  return allSnapshots.slice(skip, skip + limit);
};

// Customer API functions
export const getCustomers = async (skip = 0, limit = 50) => {
  const response = await apiClient.get('/customers', {
    params: { skip, limit }
  });

  return {
    data: response.data,
    total: parseInt(response.headers['x-total-count'] || '0'),
    pageSize: parseInt(response.headers['x-page-size'] || limit),
    offset: parseInt(response.headers['x-page-offset'] || skip)
  };
};

export const getCustomer = async (id) => {
  const response = await apiClient.get(`/customers/${id}`);
  return response.data;
};

export const createCustomer = async (customerData) => {
  const response = await apiClient.post('/customers', customerData);
  return response.data;
};

export const updateCustomer = async (id, customerData) => {
  const response = await apiClient.put(`/customers/${id}`, customerData);
  return response.data;
};

export const deleteCustomer = async (id) => {
  const response = await apiClient.delete(`/customers/${id}`);
  return response.data;
};


// Product API functions
export const getProducts = async () => {
  const response = await apiClient.get('/products');
  return response.data;
};

export const getProduct = async (id) => {
  const response = await apiClient.get(`/products/${id}`);
  return response.data;
};

export const createProduct = async (productData) => {
  const response = await apiClient.post('/products', productData);
  return response.data;
};

export const updateProduct = async (id, productData) => {
  const response = await apiClient.put(`/products/${id}`, productData);
  return response.data;
};

export const deleteProduct = async (id) => {
  const response = await apiClient.delete(`/products/${id}`);
  return response.data;
};

// Sales Order API functions
export const getSalesOrders = async () => {
  const response = await apiClient.get('/sales-orders');
  return response.data;
};

// Get only uninvoiced sales orders (to prevent duplicate invoicing)
export const getUninvoicedSalesOrders = async () => {
  const response = await apiClient.get('/sales-orders/uninvoiced');
  return response.data;
};

export const getSalesOrder = async (id) => {
  const response = await apiClient.get(`/sales-orders/${id}`);
  return response.data;
};

export const createSalesOrder = async (salesOrderData) => {
  const response = await apiClient.post('/sales-orders', salesOrderData);
  return response.data;
};

export const createSalesOrderWithItems = async (salesOrderData) => {
  const response = await apiClient.post('/sales-orders/with-items', salesOrderData);
  return response.data;
};

export const updateSalesOrder = async (id, salesOrderData) => {
  const response = await apiClient.put(`/sales-orders/${id}`, salesOrderData);
  return response.data;
};

export const deleteSalesOrder = async (id) => {
  const response = await apiClient.delete(`/sales-orders/${id}`);
  return response.data;
};

// Invoice API functions
export const getInvoices = async () => {
  const response = await apiClient.get('/invoices');
  return response.data;
};

export const getNextInvoiceNumber = async () => {
  const response = await apiClient.get('/invoices/next-number');
  return response.data;
};

export const getInvoice = async (id) => {
  const response = await apiClient.get(`/invoices/${id}`);
  return response.data;
};

export const createInvoice = async (invoiceData) => {
  const response = await apiClient.post('/invoices', invoiceData);
  return response.data;
};

export const updateInvoice = async (id, invoiceData) => {
  const response = await apiClient.put(`/invoices/${id}`, invoiceData);
  return response.data;
};

export const deleteInvoice = async (id) => {
  const response = await apiClient.delete(`/invoices/${id}`);
  return response.data;
};

// Payment API functions
export const addPayment = async (invoiceId, paymentData) => {
  const response = await apiClient.post(`/invoices/${invoiceId}/payments`, paymentData);
  return response.data;
};

// Supplier API functions
export const getSuppliers = async () => {
  try {
    const response = await apiClient.get('/suppliers');
    return response.data;
  } catch (error) {
    console.error('Error fetching suppliers:', error);
    throw error;
  }
};

export const getSupplier = async (id) => {
  try {
    const response = await apiClient.get(`/suppliers/${id}`);
    return response.data;
  } catch (error) {
    console.error(`Error fetching supplier ${id}:`, error);
    throw error;
  }
};

export const createSupplier = async (supplierData) => {
  try {
    const response = await apiClient.post('/suppliers', supplierData);
    return response.data;
  } catch (error) {
    console.error('Error creating supplier:', error);
    throw error;
  }
};

export const updateSupplier = async (id, supplierData) => {
  try {
    const response = await apiClient.put(`/suppliers/${id}`, supplierData);
    return response.data;
  } catch (error) {
    console.error(`Error updating supplier ${id}:`, error);
    throw error;
  }
};

export const deleteSupplier = async (id) => {
  try {
    const response = await apiClient.delete(`/suppliers/${id}`);
    return response.data;
  } catch (error) {
    console.error(`Error deleting supplier ${id}:`, error);
    throw error;
  }
};

// Purchase Order API functions
const buildPurchaseOrderPayload = (poData = {}) => {
  const payload = {
    supplier_id: poData.supplierId ?? poData.supplier_id ?? null,
    warehouse_id: poData.warehouseId ?? poData.warehouse_id ?? null,
    po_no: poData.poNo ?? poData.po_no ?? null,
    po_date: poData.orderDate ?? poData.po_date ?? null,
    expected_delivery_date: poData.expectedDeliveryDate ?? poData.expected_delivery_date ?? null,
    // Default to DRAFT so creation isn't blocked by capital check unless user explicitly confirms
    status: (poData.status ?? 'DRAFT').toString().toUpperCase(),
    notes: typeof poData.notes === 'string' && poData.notes.trim() !== '' ? poData.notes.trim() : null,
    total_amount_usd: poData.totalAmount ?? poData.total_amount_usd ?? null,
    items: [], // Items array
    elevators: [] // Elevators array
  };

  // 🎯 إضافة Items مع دعم المنتجات الجديدة
  if (poData.items && Array.isArray(poData.items)) {
    payload.items = poData.items.map(item => {
      const itemPayload = {
        qty: parseFloat(item.qty || item.quantity) || 0,
        unit_cost_usd: parseFloat(item.unit_cost_usd || item.unitCost || item.unitPrice) || 0
      };

      // إذا كان منتج جديد
      if (item.isNewProduct || item.product_name) {
        itemPayload.product_name = item.product_name || item.product;
        itemPayload.product_sku = item.product_sku || item.productCode || null;
        itemPayload.product_category = item.product_category || item.category || null;
        itemPayload.product_uom = item.product_uom || 'unit';
      } else if (item.product_id || item.productId) {
        // منتج موجود
        itemPayload.product_id = item.product_id || item.productId;
      } else {
        // محاولة استخراج ID من product إذا كان رقم
        const productId = parseInt(item.product);
        if (!isNaN(productId)) {
          itemPayload.product_id = productId;
        } else {
          // افترض أنه اسم منتج جديد
          itemPayload.product_name = item.product;
        }
      }

      return itemPayload;
    }).filter(item => item.product_id || item.product_name); // فقط المنتجات الصحيحة
  }

  // إضافة Elevators
  if (poData.elevators && Array.isArray(poData.elevators)) {
    payload.elevators = poData.elevators.map(elevator => ({
      elevator_code: elevator.elevator_code,
      height_meters: parseFloat(elevator.height_meters) || 0,
      model_type: elevator.model_type || 'standard',
      manufacture_year: elevator.manufacture_year || null,
      cabin_count: parseInt(elevator.cabin_count) || 1,
      unit_price_usd: parseFloat(elevator.unit_price_usd) || null,
      section_count: elevator.section_count !== '' && elevator.section_count !== undefined ? parseInt(elevator.section_count) || 0 : null,
      rope_count: elevator.rope_count !== '' && elevator.rope_count !== undefined ? parseInt(elevator.rope_count) || 0 : null,
      cable_count: elevator.cable_length_meters !== '' && elevator.cable_length_meters !== undefined ? parseFloat(elevator.cable_length_meters) || 0 : null,
      notes: elevator.notes || null
    }));
  }

  // 🆕 إضافة Installments (الدفعات)
  if (poData.installments && Array.isArray(poData.installments)) {
    payload.installments = poData.installments.map(installment => ({
      name: installment.name,
      type: installment.type || 'regular',
      percentage: parseFloat(installment.percentage) || 0,
      amount_usd: parseFloat(installment.amount) || 0,
      paid_amount_usd: parseFloat(installment.paidAmount) || 0,
      dueDate: installment.dueDate,
      status: installment.status || 'pending',
      notes: installment.notes || null
    }));
  }

  // 🆕 إضافة Containers (الحاويات)
  if (poData.containers && Array.isArray(poData.containers)) {
    payload.containers = poData.containers
      .filter(c => c && (c.type || c.containerNo || c.total_cost || c.shippingCost || c.shipping_cost))
      .map(container => ({
        container_no: container.containerNo || null,
        // Frontend uses `type` for size (20ft/40ft)
        size: container.size || container.type || null,
        weight: container.weight ? parseFloat(container.weight) : null,
        // Frontend `total_cost` is the shipping cost per added container entry
        shipping_cost: container.shipping_cost != null
          ? parseFloat(container.shipping_cost)
          : (container.total_cost != null ? parseFloat(container.total_cost) : (container.shippingCost ? parseFloat(container.shippingCost) : null)),
        total_cost: container.total_cost != null
          ? parseFloat(container.total_cost)
          : (container.totalCost != null ? parseFloat(container.totalCost) : (container.shippingCost ? parseFloat(container.shippingCost) : null)),
        notes: container.notes || null
      }));
  }

  if (!payload.expected_delivery_date) {
    delete payload.expected_delivery_date;
  }
  if (payload.notes === null) {
    delete payload.notes;
  }
  if (payload.total_amount_usd === null) {
    delete payload.total_amount_usd;
  }

  return payload;
};

export const getPurchaseOrders = async () => {
  try {
    const response = await apiClient.get('/purchase-orders');
    return response.data;
  } catch (error) {
    console.error('Error fetching purchase orders:', error);
    throw error;
  }
};

export const getPurchaseOrder = async (id) => {
  try {
    const response = await apiClient.get(`/purchase-orders/${id}`);
    return response.data;
  } catch (error) {
    console.error(`Error fetching purchase order ${id}:`, error);
    throw error;
  }
};

export const createPurchaseOrder = async (poData) => {
  try {
    const payload = buildPurchaseOrderPayload(poData);
    // Use relative path; interceptor will add API prefix and resolved baseURL
    const response = await apiClient.post('/purchase-orders', payload);
    return response.data;
  } catch (error) {
    console.error('Error creating purchase order:', error);
    // Fallback: try direct fetch against /api to bypass any interceptor/path issues
    if (!error?.response) {
      try {
        const base = await detectBaseURL();
        const token = localStorage.getItem('access_token') || sessionStorage.getItem('access_token');
        const res = await fetch(`${base}/api/purchase-orders`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
          },
          body: JSON.stringify(buildPurchaseOrderPayload(poData)),
        });
        if (!res.ok) {
          const text = await res.text().catch(() => '');
          const err = new Error(`HTTP ${res.status}`);
          err.response = { status: res.status, data: text };
          err.config = { baseURL: base, url: '/api/purchase-orders' };
          throw err;
        }
        return await res.json();
      } catch (fallbackErr) {
        console.error('Fallback createPurchaseOrder failed:', fallbackErr);
        throw fallbackErr;
      }
    }
    throw error;
  }
};

export const updatePurchaseOrder = async (id, poData) => {
  try {
    const payload = buildPurchaseOrderPayload(poData);
    const response = await apiClient.put(`/purchase-orders/${id}`, payload);
    return response.data;
  } catch (error) {
    console.error('Error updating purchase order ' + id + ':', error);
    if (!error?.response) {
      try {
        const base = await detectBaseURL();
        const token = localStorage.getItem('access_token') || sessionStorage.getItem('access_token');
        const res = await fetch(`${base}/api/purchase-orders/${id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
          },
          body: JSON.stringify(buildPurchaseOrderPayload(poData)),
        });
        if (!res.ok) {
          const text = await res.text().catch(() => '');
          const err = new Error(`HTTP ${res.status}`);
          err.response = { status: res.status, data: text };
          err.config = { baseURL: base, url: `/api/purchase-orders/${id}` };
          throw err;
        }
        return await res.json();
      } catch (fallbackErr) {
        console.error('Fallback updatePurchaseOrder failed:', fallbackErr);
        throw fallbackErr;
      }
    }
    throw error;
  }
};

export const deletePurchaseOrder = async (id) => {
  try {
    const response = await apiClient.delete(`/purchase-orders/${id}`);
    return response.data;
  } catch (error) {
    console.error(`Error deleting purchase order ${id}:`, error);
    throw error;
  }
};

// 🎯 تأكيد استلام بضاعة أمر الشراء
export const receivePurchaseOrder = async (id, warehouseId = null) => {
  try {
    const response = await apiClient.post(`/purchase-orders/${id}/receive`, {
      warehouse_id: warehouseId
    });
    return response.data;
  } catch (error) {
    console.error(`Error receiving purchase order ${id}:`, error);
    throw error;
  }
};

// 🔙 إلغاء استلام أمر الشراء
export const unreceivePurchaseOrder = async (id) => {
  try {
    const response = await apiClient.post(`/purchase-orders/${id}/unreceive`);
    return response.data;
  } catch (error) {
    console.error(`Error unreceiving purchase order ${id}:`, error);
    throw error;
  }
};

// AP Invoice API functions
export const getAPInvoices = async () => {
  try {
    const response = await apiClient.get('/ap-invoices');
    return response.data;
  } catch (error) {
    console.error('Error fetching AP invoices:', error);
    throw error;
  }
};

export const getAPInvoice = async (id) => {
  try {
    const response = await apiClient.get(`/ap-invoices/${id}`);
    return response.data;
  } catch (error) {
    console.error(`Error fetching AP invoice ${id}:`, error);
    throw error;
  }
};

export const createAPInvoice = async (invoiceData) => {
  try {
    const response = await apiClient.post('/ap-invoices', invoiceData);
    return response.data;
  } catch (error) {
    console.error('Error creating AP invoice:', error);
    throw error;
  }
};

export const updateAPInvoice = async (id, invoiceData) => {
  try {
    const response = await apiClient.put(`/ap-invoices/${id}`, invoiceData);
    return response.data;
  } catch (error) {
    console.error(`Error updating AP invoice ${id}:`, error);
    throw error;
  }
};

export const deleteAPInvoice = async (id) => {
  try {
    const response = await apiClient.delete(`/ap-invoices/${id}`);
    return response.data;
  } catch (error) {
    console.error(`Error deleting AP invoice ${id}:`, error);
    throw error;
  }
};

// Warehouse API functions
export const getWarehouses = async () => {
  try {
    const response = await apiClient.get('/warehouses');
    return response.data;
  } catch (error) {
    console.error('Error fetching warehouses:', error);
    throw error;
  }
};

export const getWarehouse = async (id) => {
  try {
    const response = await apiClient.get(`/warehouses/${id}`);
    return response.data;
  } catch (error) {
    console.error(`Error fetching warehouse ${id}:`, error);
    throw error;
  }
};

export const createWarehouse = async (warehouseData) => {
  try {
    const response = await apiClient.post('/warehouses', warehouseData);
    return response.data;
  } catch (error) {
    console.error('Error creating warehouse:', error);
    throw error;
  }
};

export const updateWarehouse = async (id, warehouseData) => {
  try {
    const response = await apiClient.put(`/warehouses/${id}`, warehouseData);
    return response.data;
  } catch (error) {
    console.error(`Error updating warehouse ${id}:`, error);
    throw error;
  }
};

export const deleteWarehouse = async (id) => {
  try {
    const response = await apiClient.delete(`/warehouses/${id}`);
    return response.data;
  } catch (error) {
    console.error(`Error deleting warehouse ${id}:`, error);
    throw error;
  }
};

// Stock Movement API functions
export const getStockMovements = async () => {
  try {
    const response = await apiClient.get('/stock-movements');
    return response.data;
  } catch (error) {
    console.error('Error fetching stock movements:', error);
    throw error;
  }
};

export const getStockMovement = async (id) => {
  try {
    const response = await apiClient.get(`/stock-movements/${id}`);
    return response.data;
  } catch (error) {
    console.error(`Error fetching stock movement ${id}:`, error);
    throw error;
  }
};

export const createStockMovement = async (movementData) => {
  try {
    const response = await apiClient.post('/stock-movements', movementData);
    return response.data;
  } catch (error) {
    console.error('Error creating stock movement:', error);
    throw error;
  }
};

export const updateStockMovement = async (id, movementData) => {
  try {
    const response = await apiClient.put(`/stock-movements/${id}`, movementData);
    return response.data;
  } catch (error) {
    console.error(`Error updating stock movement ${id}:`, error);
    throw error;
  }
};

export const deleteStockMovement = async (id) => {
  try {
    const response = await apiClient.delete(`/stock-movements/${id}`);
    return response.data;
  } catch (error) {
    console.error(`Error deleting stock movement ${id}:`, error);
    throw error;
  }
};

// Service Ticket API functions
export const getServiceTickets = async () => {
  const response = await apiClient.get('/service-tickets');
  return response.data;
};

export const getServiceTicket = async (id) => {
  const response = await apiClient.get(`/service-tickets/${id}`);
  return response.data;
};

export const createServiceTicket = async (serviceTicketData) => {
  const response = await apiClient.post('/service-tickets', serviceTicketData);
  return response.data;
};

export const updateServiceTicket = async (id, serviceTicketData) => {
  const response = await apiClient.put(`/service-tickets/${id}`, serviceTicketData);
  return response.data;
};

export const deleteServiceTicket = async (id) => {
  const response = await apiClient.delete(`/service-tickets/${id}`);
  return response.data;
};

// Service Log API functions
export const getServiceLogs = async () => {
  const response = await apiClient.get('/service-logs');
  return response.data;
};

export const getServiceLog = async (id) => {
  const response = await apiClient.get(`/service-logs/${id}`);
  return response.data;
};

export const createServiceLog = async (serviceLogData) => {
  const response = await apiClient.post('/service-logs', serviceLogData);
  return response.data;
};

export const updateServiceLog = async (id, serviceLogData) => {
  const response = await apiClient.put(`/service-logs/${id}`, serviceLogData);
  return response.data;
};

export const deleteServiceLog = async (id) => {
  const response = await apiClient.delete(`/service-logs/${id}`);
  return response.data;
};

// Expense API functions
export const getExpenses = async () => {
  const response = await apiClient.get('/expenses/');
  return response.data;
};

export const getExpense = async (id) => {
  const response = await apiClient.get(`/expenses/${id}`);
  return response.data;
};

export const createExpense = async (expenseData) => {
  const response = await apiClient.post('/expenses/', expenseData);
  return response.data;
};

export const updateExpense = async (id, expenseData) => {
  const response = await apiClient.put(`/expenses/${id}`, expenseData);
  return response.data;
};

export const deleteExpense = async (id) => {
  const response = await apiClient.delete(`/expenses/${id}`);
  return response.data;
};

// Report API functions
export const getProfitLossReport = async (month, year) => {
  const response = await apiClient.get(`/reports/profit-loss?month=${month}&year=${year}`);
  return response.data;
};

export const getPartnerDistributionReport = async (month, year, reservePercentage = 30) => {
  const response = await apiClient.get(`/reports/partner-distributions?month=${month}&year=${year}&reserve_percentage=${reservePercentage}`);
  return response.data;
};

export const getInventoryReport = async () => {
  const response = await apiClient.get('/reports/inventory');
  return response.data;
};

export const getBalanceSheetReport = async () => {
  const response = await apiClient.get('/reports/balance-sheet');
  return response.data;
};

export const getMonthlyRetirementReport = async (month, year, retirementRate = 5.0) => {
  const response = await apiClient.get(`/reports/monthly-retirement?month=${month}&year=${year}&retirement_rate=${retirementRate}`);
  return response.data;
};

export const getSystemsIntegrationReport = async (systemFilter = "all", dateRange = "7days") => {
  const response = await apiClient.get(`/reports/systems-integration?system_filter=${systemFilter}&date_range=${dateRange}`);
  return response.data;
};

// Elevator Components API functions
export const getProductComponentsSummary = async (productId) => {
  const response = await apiClient.get(`/products/${productId}/components-summary`);
  return response.data;
};

export const getElevatorComponentsReport = async () => {
  const response = await apiClient.get('/elevator-components-report');
  return response.data;
};

export const getSalesOrderItemsWithComponents = async (skip = 0, limit = 100, productId = null) => {
  let url = `/sales-order-items-with-components?skip=${skip}&limit=${limit}`;
  if (productId) {
    url += `&product_id=${productId}`;
  }
  const response = await apiClient.get(url);
  return response.data;
};

// ============================================
// AP Invoice & Payment Management APIs
// ============================================

/**
 * إنشاء فاتورة دفع لأمر شراء
 */
export const createAPInvoiceForPurchaseOrder = async (purchaseOrderId, invoiceData) => {
  try {
    const response = await apiClient.post(`/purchase-orders/${purchaseOrderId}/invoice`, invoiceData);
    return response.data;
  } catch (error) {
    console.error('Error creating AP invoice:', error);
    throw error;
  }
};

/**
 * الحصول على جميع الفواتير المرتبطة بأمر شراء
 */
export const getInvoicesForPurchaseOrder = async (purchaseOrderId) => {
  try {
    const response = await apiClient.get(`/purchase-orders/${purchaseOrderId}/invoices`);
    return response.data;
  } catch (error) {
    console.error('Error fetching invoices for purchase order:', error);
    throw error;
  }
};

/**
 * إضافة دفعة جديدة لفاتورة
 */
export const addPaymentToInvoice = async (invoiceId, paymentData) => {
  try {
    const response = await apiClient.post(`/invoices/${invoiceId}/payments`, paymentData);
    return response.data;
  } catch (error) {
    console.error('Error adding payment to invoice:', error);
    throw error;
  }
};

/**
 * الحصول على جميع الدفعات المرتبطة بفاتورة
 */
export const getPaymentsForInvoice = async (invoiceId) => {
  try {
    const response = await apiClient.get(`/invoices/${invoiceId}/payments`);
    return response.data;
  } catch (error) {
    console.error('Error fetching payments for invoice:', error);
    throw error;
  }
};

/**
 * حذف دفعة
 */
export const deletePayment = async (paymentId) => {
  try {
    // Delete AP invoice payment (avoid conflict with sales payments endpoint)
    const response = await apiClient.delete(`/ap-payments/${paymentId}`);
    return response.data;
  } catch (error) {
    console.error('Error deleting payment:', error);
    throw error;
  }
};

// ============================================
// 🆕 نظام المدفوعات المباشر لأوامر الشراء (بدون فواتير)
// ============================================

/**
 * الحصول على جميع المدفوعات المرتبطة بأمر شراء
 * @param {number} purchaseOrderId - معرّف أمر الشراء
 * @returns {Promise<Array>} قائمة المدفوعات
 */
export const getPurchaseOrderPayments = async (purchaseOrderId) => {
  try {
    const response = await apiClient.get(`/purchase-orders/${purchaseOrderId}/payments`);
    return response.data;
  } catch (error) {
    console.error('Error fetching purchase order payments:', error);
    throw error;
  }
};

/**
 * إضافة دفعة جديدة لأمر شراء
 * @param {number} purchaseOrderId - معرّف أمر الشراء
 * @param {object} paymentData - بيانات الدفعة
 * @returns {Promise<object>} الدفعة المضافة
 */
export const addPurchaseOrderPayment = async (purchaseOrderId, paymentData) => {
  try {
    const response = await apiClient.post(
      `/purchase-orders/${purchaseOrderId}/payments`,
      paymentData
    );
    return response.data;
  } catch (error) {
    console.error('Error adding purchase order payment:', error);
    throw error;
  }
};

/**
 * حذف دفعة من أمر شراء
 * @param {number} paymentId - معرّف الدفعة
 * @returns {Promise<object>} نتيجة الحذف
 */
export const deletePurchaseOrderPayment = async (paymentId) => {
  try {
    const response = await apiClient.delete(`/purchase-order-payments/${paymentId}`);
    return response.data;
  } catch (error) {
    console.error('Error deleting purchase order payment:', error);
    throw error;
  }
};

// Export the apiClient for custom requests
export const api = apiClient;
export default apiClient;

// Sales invoice payments (avoid conflict with AP invoices)
export const getSalesInvoicePayments = async (invoiceId) => {
  const response = await apiClient.get(`/sales-invoices/${invoiceId}/payments`);
  return response.data;
};

export const addSalesInvoicePayment = async (invoiceId, paymentData) => {
  const response = await apiClient.post(`/sales-invoices/${invoiceId}/payments`, paymentData);
  return response.data;
};

export const deleteSalesInvoicePayment = async (paymentId) => {
  const response = await apiClient.delete(`/sales-invoice-payments/${paymentId}`);
  return response.data;
};

// ==================== Quotations API ====================

/**
 * Get all quotations with optional filtering
 * @param {object} params - Filter parameters (status, customer_id, order_type, skip, limit)
 * @returns {Promise<Array>} List of quotations
 */
export const getQuotations = async (params = {}) => {
  const queryParams = new URLSearchParams();
  if (params.status) queryParams.append('status', params.status);
  if (params.customer_id) queryParams.append('customer_id', params.customer_id);
  if (params.order_type) queryParams.append('order_type', params.order_type);
  if (params.skip !== undefined) queryParams.append('skip', params.skip);
  if (params.limit !== undefined) queryParams.append('limit', params.limit);

  const response = await apiClient.get(`/quotations?${queryParams.toString()}`);
  return response.data;
};

/**
 * Get quotation statistics
 * @returns {Promise<object>} Quotation statistics
 */
export const getQuotationStats = async () => {
  const response = await apiClient.get('/quotations/stats/summary');
  return response.data;
};

/**
 * Get quotation by ID
 * @param {number} quotationId - Quotation ID
 * @returns {Promise<object>} Quotation details
 */
export const getQuotation = async (quotationId) => {
  const response = await apiClient.get(`/quotations/${quotationId}`);
  return response.data;
};

/**
 * Create new quotation
 * @param {object} quotationData - Quotation data
 * @returns {Promise<object>} Created quotation
 */
export const createQuotation = async (quotationData) => {
  const response = await apiClient.post('/quotations', quotationData);
  return response.data;
};

/**
 * Update quotation
 * @param {number} quotationId - Quotation ID
 * @param {object} quotationData - Updated quotation data
 * @returns {Promise<object>} Updated quotation
 */
export const updateQuotation = async (quotationId, quotationData) => {
  const response = await apiClient.put(`/quotations/${quotationId}`, quotationData);
  return response.data;
};

/**
 * Delete quotation
 * @param {number} quotationId - Quotation ID
 * @returns {Promise<void>}
 */
export const deleteQuotation = async (quotationId) => {
  const response = await apiClient.delete(`/quotations/${quotationId}`);
  return response.data;
};

/**
 * Send quotation (change status to SENT)
 * @param {number} quotationId - Quotation ID
 * @returns {Promise<object>} Updated quotation
 */
export const sendQuotation = async (quotationId) => {
  const response = await apiClient.post(`/quotations/${quotationId}/send`);
  return response.data;
};

/**
 * Accept quotation (change status to ACCEPTED)
 * @param {number} quotationId - Quotation ID
 * @returns {Promise<object>} Updated quotation
 */
export const acceptQuotation = async (quotationId) => {
  const response = await apiClient.post(`/quotations/${quotationId}/accept`);
  return response.data;
};

/**
 * Reject quotation (change status to REJECTED)
 * @param {number} quotationId - Quotation ID
 * @returns {Promise<object>} Updated quotation
 */
export const rejectQuotation = async (quotationId) => {
  const response = await apiClient.post(`/quotations/${quotationId}/reject`);
  return response.data;
};

/**
 * Convert quotation to contract
 * @param {number} quotationId - Quotation ID
 * @returns {Promise<object>} Created contract
 */
export const convertQuotationToContract = async (quotationId) => {
  const response = await apiClient.post(`/quotations/${quotationId}/convert-to-contract`);
  return response.data;
};

// ==================== Contracts API ====================

/**
 * Get all contracts with optional filtering
 * @param {object} params - Filter parameters (status, customer_id, contract_type, skip, limit)
 * @returns {Promise<Array>} List of contracts
 */
export const getContracts = async (params = {}) => {
  const queryParams = new URLSearchParams();
  if (params.status) queryParams.append('status', params.status);
  if (params.customer_id) queryParams.append('customer_id', params.customer_id);
  if (params.contract_type) queryParams.append('contract_type', params.contract_type);
  if (params.skip !== undefined) queryParams.append('skip', params.skip);
  if (params.limit !== undefined) queryParams.append('limit', params.limit);

  const response = await apiClient.get(`/contracts?${queryParams.toString()}`);
  return response.data;
};

/**
 * Get contract statistics
 * @returns {Promise<object>} Contract statistics
 */
export const getContractStats = async () => {
  const response = await apiClient.get('/contracts/stats/summary');
  return response.data;
};

/**
 * Get contract by ID
 * @param {number} contractId - Contract ID
 * @returns {Promise<object>} Contract details
 */
export const getContract = async (contractId) => {
  const response = await apiClient.get(`/contracts/${contractId}`);
  return response.data;
};

/**
 * Create new contract
 * @param {object} contractData - Contract data
 * @returns {Promise<object>} Created contract
 */
export const createContract = async (contractData) => {
  const response = await apiClient.post('/contracts', contractData);
  return response.data;
};

/**
 * Update contract
 * @param {number} contractId - Contract ID
 * @param {object} contractData - Updated contract data
 * @returns {Promise<object>} Updated contract
 */
export const updateContract = async (contractId, contractData) => {
  const response = await apiClient.put(`/contracts/${contractId}`, contractData);
  return response.data;
};

/**
 * Delete contract
 * @param {number} contractId - Contract ID
 * @returns {Promise<void>}
 */
export const deleteContract = async (contractId) => {
  const response = await apiClient.delete(`/contracts/${contractId}`);
  return response.data;
};

/**
 * Activate contract (change status to ACTIVE)
 * @param {number} contractId - Contract ID
 * @returns {Promise<object>} Updated contract
 */
export const activateContract = async (contractId) => {
  const response = await apiClient.post(`/contracts/${contractId}/activate`);
  return response.data;
};

/**
 * Complete contract (change status to COMPLETED)
 * @param {number} contractId - Contract ID
 * @returns {Promise<object>} Updated contract
 */
export const completeContract = async (contractId) => {
  const response = await apiClient.post(`/contracts/${contractId}/complete`);
  return response.data;
};

/**
 * Convert contract to sales order
 * @param {number} contractId - Contract ID
 * @returns {Promise<object>} Conversion result with sales order details
 */
export const convertContractToSalesOrder = async (contractId) => {
  const response = await apiClient.post(`/contracts/${contractId}/convert-to-sales-order`);
  return response.data;
};

/**
 * Add milestone to contract
 * @param {number} contractId - Contract ID
 * @param {object} milestoneData - Milestone data
 * @returns {Promise<object>} Created milestone
 */
export const addContractMilestone = async (contractId, milestoneData) => {
  const response = await apiClient.post(`/contracts/${contractId}/milestones`, milestoneData);
  return response.data;
};

/**
 * Update contract milestone
 * @param {number} contractId - Contract ID
 * @param {number} milestoneId - Milestone ID
 * @param {object} milestoneData - Updated milestone data
 * @returns {Promise<object>} Updated milestone
 */
export const updateContractMilestone = async (contractId, milestoneId, milestoneData) => {
  const response = await apiClient.put(`/contracts/${contractId}/milestones/${milestoneId}`, milestoneData);
  return response.data;
};

/**
 * Delete contract milestone
 * @param {number} contractId - Contract ID
 * @param {number} milestoneId - Milestone ID
 * @returns {Promise<void>}
 */
export const deleteContractMilestone = async (contractId, milestoneId) => {
  const response = await apiClient.delete(`/contracts/${contractId}/milestones/${milestoneId}`);
  return response.data;
};

// ============================================
// Beneficiary API Functions
// ============================================

/**
 * Get all beneficiaries
 * @param {object} params - Query parameters
 * @returns {Promise<array>} List of beneficiaries
 */
export const getBeneficiaries = async (params = {}) => {
  const response = await apiClient.get('/profit-distribution/beneficiaries', { params });
  return response.data;
};

/**
 * Get single beneficiary
 * @param {number} beneficiaryId - Beneficiary ID
 * @returns {Promise<object>} Beneficiary data
 */
export const getBeneficiary = async (beneficiaryId) => {
  const response = await apiClient.get(`/profit-distribution/beneficiaries/${beneficiaryId}`);
  return response.data;
};

/**
 * Create new beneficiary
 * @param {object} beneficiaryData - Beneficiary data
 * @returns {Promise<object>} Created beneficiary
 */
export const createBeneficiary = async (beneficiaryData) => {
  const response = await apiClient.post('/profit-distribution/beneficiaries', beneficiaryData);
  return response.data;
};

/**
 * Update beneficiary
 * @param {number} beneficiaryId - Beneficiary ID
 * @param {object} beneficiaryData - Updated beneficiary data
 * @returns {Promise<object>} Updated beneficiary
 */
export const updateBeneficiary = async (beneficiaryId, beneficiaryData) => {
  const response = await apiClient.put(`/profit-distribution/beneficiaries/${beneficiaryId}`, beneficiaryData);
  return response.data;
};

/**
 * Delete beneficiary
 * @param {number} beneficiaryId - Beneficiary ID
 * @returns {Promise<object>} Deletion result
 */
export const deleteBeneficiary = async (beneficiaryId) => {
  const response = await apiClient.delete(`/profit-distribution/beneficiaries/${beneficiaryId}`);
  return response.data;
};

/**
 * Get beneficiary distribution decisions
 * @param {object} params - Query parameters (beneficiary_id, profit_run_id, etc.)
 * @returns {Promise<array>} List of decisions
 */
export const getBeneficiaryDecisions = async (params = {}) => {
  const response = await apiClient.get('/profit-distribution/decisions', { params });
  return response.data;
};

/**
 * Get single beneficiary decision
 * @param {number} decisionId - Decision ID
 * @returns {Promise<object>} Decision data
 */
export const getBeneficiaryDecision = async (decisionId) => {
  const response = await apiClient.get(`/profit-distribution/decisions/${decisionId}`);
  return response.data;
};

/**
 * Create beneficiary distribution decision
 * @param {object} decisionData - Decision data (profit_run_id, beneficiary_id, amount_usd, decision_type, etc.)
 * @returns {Promise<object>} Created decision
 */
export const createBeneficiaryDecision = async (decisionData) => {
  const response = await apiClient.post('/profit-distribution/decisions', decisionData);
  return response.data;
};

/**
 * Update beneficiary decision
 * @param {number} decisionId - Decision ID
 * @param {object} decisionData - Updated decision data
 * @returns {Promise<object>} Updated decision
 */
export const updateBeneficiaryDecision = async (decisionId, decisionData) => {
  const response = await apiClient.put(`/profit-distribution/decisions/${decisionId}`, decisionData);
  return response.data;
};

/**
 * Delete beneficiary decision
 * @param {number} decisionId - Decision ID
 * @returns {Promise<object>} Deletion result
 */
export const deleteBeneficiaryDecision = async (decisionId) => {
  const response = await apiClient.delete(`/profit-distribution/decisions/${decisionId}`);
  return response.data;
};

/**
 * Get profit runs (for selecting which run to create decisions for)
 * @param {object} params - Query parameters
 * @returns {Promise<array>} List of profit runs
 */
export const getProfitRuns = async (params = {}) => {
  const response = await apiClient.get('/profit-distribution/history', { params });
  return response.data;
};

