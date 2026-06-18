// Role-based permissions system

// Define role hierarchies and permissions
export const ROLES = {
  SUPER_ADMIN: 'super_admin',
  ADMIN: 'admin',
  FINANCE_MANAGER: 'finance_manager',
  SALES_MANAGER: 'sales_manager',
  WAREHOUSE_MANAGER: 'warehouse_manager',
  EMPLOYEE: 'employee',
  VIEWER: 'viewer'
};

export const PERMISSIONS = {
  // User management
  MANAGE_USERS: 'manage_users',
  VIEW_USERS: 'view_users',

  // Partner management
  MANAGE_PARTNERS: 'manage_partners',
  VIEW_PARTNERS: 'view_partners',

  // Customer management
  MANAGE_CUSTOMERS: 'manage_customers',
  VIEW_CUSTOMERS: 'view_customers',

  // Project management
  MANAGE_PROJECTS: 'manage_projects',
  VIEW_PROJECTS: 'view_projects',

  // Sales management
  MANAGE_SALES: 'manage_sales',
  VIEW_SALES: 'view_sales',

  // Financial management
  MANAGE_FINANCES: 'manage_finances',
  VIEW_FINANCES: 'view_finances',
  MANAGE_PROFIT_DISTRIBUTION: 'manage_profit_distribution',
  VIEW_PROFIT_DISTRIBUTION: 'view_profit_distribution',

  // Inventory management
  MANAGE_INVENTORY: 'manage_inventory',
  VIEW_INVENTORY: 'view_inventory',

  // Maintenance management
  MANAGE_MAINTENANCE: 'manage_maintenance',
  VIEW_MAINTENANCE: 'view_maintenance',

  // Reports
  VIEW_REPORTS: 'view_reports',
  EXPORT_REPORTS: 'export_reports',

  // System settings
  MANAGE_SETTINGS: 'manage_settings'
};

// Role-permission mapping
export const ROLE_PERMISSIONS = {
  [ROLES.SUPER_ADMIN]: Object.values(PERMISSIONS),

  [ROLES.ADMIN]: [
    PERMISSIONS.MANAGE_USERS,
    PERMISSIONS.VIEW_USERS,
    PERMISSIONS.MANAGE_PARTNERS,
    PERMISSIONS.VIEW_PARTNERS,
    PERMISSIONS.MANAGE_CUSTOMERS,
    PERMISSIONS.VIEW_CUSTOMERS,
    PERMISSIONS.MANAGE_PROJECTS,
    PERMISSIONS.VIEW_PROJECTS,
    PERMISSIONS.MANAGE_SALES,
    PERMISSIONS.VIEW_SALES,
    PERMISSIONS.MANAGE_FINANCES,
    PERMISSIONS.VIEW_FINANCES,
    PERMISSIONS.MANAGE_PROFIT_DISTRIBUTION,
    PERMISSIONS.VIEW_PROFIT_DISTRIBUTION,
    PERMISSIONS.MANAGE_INVENTORY,
    PERMISSIONS.VIEW_INVENTORY,
    PERMISSIONS.MANAGE_MAINTENANCE,
    PERMISSIONS.VIEW_MAINTENANCE,
    PERMISSIONS.VIEW_REPORTS,
    PERMISSIONS.EXPORT_REPORTS
  ],

  [ROLES.FINANCE_MANAGER]: [
    PERMISSIONS.VIEW_PARTNERS,
    PERMISSIONS.VIEW_CUSTOMERS,
    PERMISSIONS.VIEW_PROJECTS,
    PERMISSIONS.MANAGE_SALES,
    PERMISSIONS.VIEW_SALES,
    PERMISSIONS.MANAGE_FINANCES,
    PERMISSIONS.VIEW_FINANCES,
    PERMISSIONS.MANAGE_PROFIT_DISTRIBUTION,
    PERMISSIONS.VIEW_PROFIT_DISTRIBUTION,
    PERMISSIONS.VIEW_REPORTS,
    PERMISSIONS.EXPORT_REPORTS
  ],

  [ROLES.SALES_MANAGER]: [
    PERMISSIONS.MANAGE_CUSTOMERS,
    PERMISSIONS.VIEW_CUSTOMERS,
    PERMISSIONS.MANAGE_PROJECTS,
    PERMISSIONS.VIEW_PROJECTS,
    PERMISSIONS.MANAGE_SALES,
    PERMISSIONS.VIEW_SALES,
    PERMISSIONS.VIEW_FINANCES,
    PERMISSIONS.VIEW_PROFIT_DISTRIBUTION,
    PERMISSIONS.VIEW_REPORTS
  ],

  [ROLES.WAREHOUSE_MANAGER]: [
    PERMISSIONS.VIEW_CUSTOMERS,
    PERMISSIONS.VIEW_PROJECTS,
    PERMISSIONS.VIEW_SALES,
    PERMISSIONS.MANAGE_INVENTORY,
    PERMISSIONS.VIEW_INVENTORY,
    PERMISSIONS.MANAGE_MAINTENANCE,
    PERMISSIONS.VIEW_MAINTENANCE,
    PERMISSIONS.VIEW_REPORTS
  ],

  [ROLES.EMPLOYEE]: [
    PERMISSIONS.VIEW_CUSTOMERS,
    PERMISSIONS.VIEW_PROJECTS,
    PERMISSIONS.VIEW_SALES,
    PERMISSIONS.VIEW_INVENTORY,
    PERMISSIONS.VIEW_MAINTENANCE
  ],

  [ROLES.VIEWER]: [
    PERMISSIONS.VIEW_CUSTOMERS,
    PERMISSIONS.VIEW_PROJECTS,
    PERMISSIONS.VIEW_SALES,
    PERMISSIONS.VIEW_INVENTORY,
    PERMISSIONS.VIEW_MAINTENANCE,
    PERMISSIONS.VIEW_REPORTS
  ]
};

// Utility functions for permission checking
export const hasPermission = (user, permission) => {
  if (!user || !user.roles) return false;

  // Super admin has all permissions
  if (user.is_superuser) return true;

  // Check if any of the user's roles has the required permission
  return user.roles.some(role => {
    const rolePermissions = ROLE_PERMISSIONS[role.name.toLowerCase()];
    return rolePermissions && rolePermissions.includes(permission);
  });
};

export const hasAnyPermission = (user, permissions) => {
  return permissions.some(permission => hasPermission(user, permission));
};

export const hasAllPermissions = (user, permissions) => {
  return permissions.every(permission => hasPermission(user, permission));
};

export const hasRole = (user, roleName) => {
  if (!user || !user.roles) return false;
  return user.roles.some(role => role.name.toLowerCase() === roleName.toLowerCase());
};

export const hasAnyRole = (user, roleNames) => {
  return roleNames.some(roleName => hasRole(user, roleName));
};

// Navigation permission mapping
export const NAVIGATION_PERMISSIONS = {
  '/': [PERMISSIONS.VIEW_REPORTS], // Dashboard
  '/partners': [PERMISSIONS.VIEW_PARTNERS],
  '/customers': [PERMISSIONS.VIEW_CUSTOMERS],
  '/projects': [PERMISSIONS.VIEW_PROJECTS],
  '/sales': [PERMISSIONS.VIEW_SALES],
  '/sales-orders': [PERMISSIONS.VIEW_SALES],
  '/invoices': [PERMISSIONS.VIEW_FINANCES],
  '/products': [PERMISSIONS.VIEW_INVENTORY],
  '/suppliers': [PERMISSIONS.VIEW_INVENTORY],
  '/purchase-orders': [PERMISSIONS.VIEW_INVENTORY],
  '/ap-invoices': [PERMISSIONS.VIEW_FINANCES],
  '/expenses': [PERMISSIONS.VIEW_FINANCES],
  '/warehouses': [PERMISSIONS.VIEW_INVENTORY],
  '/stock-movements': [PERMISSIONS.VIEW_INVENTORY],
  '/service-tickets': [PERMISSIONS.VIEW_MAINTENANCE],
  '/service-logs': [PERMISSIONS.VIEW_MAINTENANCE],
  '/reports': [PERMISSIONS.VIEW_REPORTS],
  '/profit-distribution': [PERMISSIONS.VIEW_PROFIT_DISTRIBUTION],
  '/capital-movements': [PERMISSIONS.VIEW_FINANCES],
  '/ownership-snapshots': [PERMISSIONS.VIEW_PARTNERS],
  '/user-management': [PERMISSIONS.MANAGE_USERS],
  '/maintenance': [PERMISSIONS.VIEW_MAINTENANCE]
};

export const canAccessRoute = (user, route) => {
  const requiredPermissions = NAVIGATION_PERMISSIONS[route];
  if (!requiredPermissions) return true; // Allow access to routes without specific permissions

  return hasAnyPermission(user, requiredPermissions);
};

// Button/action permission mapping
export const ACTION_PERMISSIONS = {
  create: {
    partners: PERMISSIONS.MANAGE_PARTNERS,
    customers: PERMISSIONS.MANAGE_CUSTOMERS,
    projects: PERMISSIONS.MANAGE_PROJECTS,
    sales: PERMISSIONS.MANAGE_SALES,
    invoices: PERMISSIONS.MANAGE_FINANCES,
    products: PERMISSIONS.MANAGE_INVENTORY,
    suppliers: PERMISSIONS.MANAGE_INVENTORY,
    warehouses: PERMISSIONS.MANAGE_INVENTORY,
    maintenance: PERMISSIONS.MANAGE_MAINTENANCE,
    profit_distribution: PERMISSIONS.MANAGE_PROFIT_DISTRIBUTION
  },
  edit: {
    partners: PERMISSIONS.MANAGE_PARTNERS,
    customers: PERMISSIONS.MANAGE_CUSTOMERS,
    projects: PERMISSIONS.MANAGE_PROJECTS,
    sales: PERMISSIONS.MANAGE_SALES,
    invoices: PERMISSIONS.MANAGE_FINANCES,
    products: PERMISSIONS.MANAGE_INVENTORY,
    suppliers: PERMISSIONS.MANAGE_INVENTORY,
    warehouses: PERMISSIONS.MANAGE_INVENTORY,
    maintenance: PERMISSIONS.MANAGE_MAINTENANCE,
    profit_distribution: PERMISSIONS.MANAGE_PROFIT_DISTRIBUTION
  },
  delete: {
    partners: PERMISSIONS.MANAGE_PARTNERS,
    customers: PERMISSIONS.MANAGE_CUSTOMERS,
    projects: PERMISSIONS.MANAGE_PROJECTS,
    sales: PERMISSIONS.MANAGE_SALES,
    invoices: PERMISSIONS.MANAGE_FINANCES,
    products: PERMISSIONS.MANAGE_INVENTORY,
    suppliers: PERMISSIONS.MANAGE_INVENTORY,
    warehouses: PERMISSIONS.MANAGE_INVENTORY,
    maintenance: PERMISSIONS.MANAGE_MAINTENANCE
  },
  export: {
    reports: PERMISSIONS.EXPORT_REPORTS
  }
};

export const canPerformAction = (user, action, resource) => {
  const permission = ACTION_PERMISSIONS[action]?.[resource];
  if (!permission) return true; // Allow actions without specific permissions

  return hasPermission(user, permission);
};