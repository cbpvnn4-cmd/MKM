import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { useLogoSettings } from '../contexts/LogoContext';
import Logo from './Logo';
import { API_BASE_URL, API_ENDPOINTS } from '../config/apiConfig';

const Header = ({ onMenuClick }) => {
  const { user, logout, isRemembered, getRemainingRememberTime } = useAuth();
  const { isDarkMode, toggleTheme } = useTheme();
  const { logoSettings } = useLogoSettings();
  const navigate = useNavigate();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const searchRef = useRef(null);

  // Close search results when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (searchRef.current && !searchRef.current.contains(event.target)) {
        setShowSearchResults(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleMenuNavigate = (path) => {
    setShowUserMenu(false);
    navigate(path);
  };

  const handleProfileClick = () => handleMenuNavigate('/profile');
  const handleSettingsClick = () => handleMenuNavigate('/settings');

  // Search functionality
  const handleSearch = async (value) => {
    setSearchQuery(value);

    if (value.trim().length < 2) {
      setSearchResults([]);
      setShowSearchResults(false);
      return;
    }

    const query = value.toLowerCase();
    let allResults = [];

    // Define searchable pages
    const pages = [
      { name: 'لوحة التحكم', path: '/', keywords: ['لوحة', 'تحكم', 'dashboard', 'home'], type: 'page', icon: 'home' },
      { name: 'الشركاء', path: '/partners', keywords: ['شركاء', 'partners', 'شريك'], type: 'page', icon: 'users' },
      { name: 'العملاء', path: '/customers', keywords: ['عملاء', 'customers', 'عميل', 'زبون'], type: 'page', icon: 'users' },
      { name: 'المبيعات', path: '/sales', keywords: ['مبيعات', 'sales', 'بيع'], type: 'page', icon: 'document' },
      { name: 'الفواتير', path: '/invoices', keywords: ['فواتير', 'invoices', 'فاتورة'], type: 'page', icon: 'document' },
      { name: 'المنتجات', path: '/products', keywords: ['منتجات', 'products', 'منتج', 'سلع'], type: 'page', icon: 'box' },
      { name: 'المخازن', path: '/warehouses', keywords: ['مخازن', 'warehouses', 'مخزن', 'مستودع'], type: 'page', icon: 'warehouse' },
      { name: 'الموردين', path: '/suppliers', keywords: ['موردين', 'suppliers', 'مورد'], type: 'page', icon: 'truck' },
      { name: 'المشتريات', path: '/purchase-orders', keywords: ['مشتريات', 'purchases', 'شراء'], type: 'page', icon: 'cart' },
      { name: 'حركات المخزون', path: '/stock-movements', keywords: ['حركات', 'مخزون', 'stock', 'movements'], type: 'page', icon: 'transfer' },
      { name: 'الصيانة', path: '/maintenance', keywords: ['صيانة', 'maintenance', 'تصليح'], type: 'page', icon: 'wrench' },
      { name: 'المصروفات', path: '/expenses', keywords: ['مصروفات', 'expenses', 'مصاريف'], type: 'page', icon: 'money' },
      { name: 'حركات رأس المال', path: '/capital-movements', keywords: ['رأس', 'مال', 'capital', 'movements'], type: 'page', icon: 'money' },
      { name: 'لقطات الملكية', path: '/ownership-snapshots', keywords: ['ملكية', 'ownership', 'snapshots'], type: 'page', icon: 'snapshot' },
      { name: 'توزيع الأرباح', path: '/profit-distribution', keywords: ['أرباح', 'profit', 'توزيع', 'distribution'], type: 'page', icon: 'chart' },
      { name: 'التقارير', path: '/reports', keywords: ['تقارير', 'reports', 'تقرير'], type: 'page', icon: 'chart' },
      { name: 'إدارة المستخدمين', path: '/user-management', keywords: ['مستخدمين', 'users', 'إدارة'], type: 'page', icon: 'users' },
    ];

    // Filter pages based on search query
    const pageResults = pages.filter(page =>
      page.name.toLowerCase().includes(query) ||
      page.keywords.some(keyword => keyword.toLowerCase().includes(query))
    );
    allResults = [...pageResults];

    // Search in data from API
    try {
      const token = localStorage.getItem('access_token') || sessionStorage.getItem('access_token');
      const headers = token ? { Authorization: `Bearer ${token}` } : {};

      // Search Products
      try {
        const productsRes = await fetch(`${API_BASE_URL}${API_ENDPOINTS.PRODUCTS}`, { headers });
        if (productsRes.ok) {
          const products = await productsRes.json();
          const matchedProducts = products.filter(p =>
            p.name?.toLowerCase().includes(query) ||
            p.sku?.toLowerCase().includes(query) ||
            p.description?.toLowerCase().includes(query)
          ).slice(0, 5);
          matchedProducts.forEach(p => {
            allResults.push({
              name: p.name,
              subtitle: `منتج - ${p.sku || ''}`,
              path: `/products`,
              type: 'product',
              icon: 'box'
            });
          });
        }
      } catch (e) {
        console.debug('Products search failed:', e?.message || e);
      }

      // Search Customers
      try {
        const customersRes = await fetch(`${API_BASE_URL}${API_ENDPOINTS.CUSTOMERS}`, { headers });
        if (customersRes.ok) {
          const customers = await customersRes.json();
          const matchedCustomers = customers.filter(c =>
            c.name?.toLowerCase().includes(query) ||
            c.email?.toLowerCase().includes(query) ||
            c.phone?.toLowerCase().includes(query)
          ).slice(0, 5);
          matchedCustomers.forEach(c => {
            allResults.push({
              name: c.name,
              subtitle: `عميل - ${c.phone || c.email || ''}`,
              path: `/customers`,
              type: 'customer',
              icon: 'user'
            });
          });
        }
      } catch (e) {
        console.debug('Customers search failed:', e?.message || e);
      }

      // Search Partners
      try {
        const partnersRes = await fetch(`${API_BASE_URL}${API_ENDPOINTS.PARTNERS}`, { headers });
        if (partnersRes.ok) {
          const partners = await partnersRes.json();
          const matchedPartners = partners.filter(p =>
            p.name?.toLowerCase().includes(query) ||
            p.email?.toLowerCase().includes(query)
          ).slice(0, 5);
          matchedPartners.forEach(p => {
            allResults.push({
              name: p.name,
              subtitle: `شريك - حصة: ${p.ownership_percentage || 0}%`,
              path: `/partners`,
              type: 'partner',
              icon: 'users'
            });
          });
        }
      } catch (e) {
        console.debug('Partners search failed:', e?.message || e);
      }

      // Search Suppliers
      try {
        const suppliersRes = await fetch(`${API_BASE_URL}${API_ENDPOINTS.SUPPLIERS}`, { headers });
        if (suppliersRes.ok) {
          const suppliers = await suppliersRes.json();
          const matchedSuppliers = suppliers.filter(s =>
            s.name?.toLowerCase().includes(query) ||
            s.contact_person?.toLowerCase().includes(query)
          ).slice(0, 5);
          matchedSuppliers.forEach(s => {
            allResults.push({
              name: s.name,
              subtitle: `مورد - ${s.contact_person || ''}`,
              path: `/suppliers`,
              type: 'supplier',
              icon: 'truck'
            });
          });
        }
      } catch (e) {
        console.debug('Suppliers search failed:', e?.message || e);
      }

      // Search Warehouses
      try {
        const warehousesRes = await fetch(`${API_BASE_URL}${API_ENDPOINTS.WAREHOUSES}`, { headers });
        if (warehousesRes.ok) {
          const warehouses = await warehousesRes.json();
          const matchedWarehouses = warehouses.filter(w =>
            w.name?.toLowerCase().includes(query) ||
            w.location?.toLowerCase().includes(query)
          ).slice(0, 5);
          matchedWarehouses.forEach(w => {
            allResults.push({
              name: w.name,
              subtitle: `مخزن - ${w.location || ''}`,
              path: `/warehouses`,
              type: 'warehouse',
              icon: 'warehouse'
            });
          });
        }
      } catch (e) {
        console.debug('Warehouses search failed:', e?.message || e);
      }

    } catch (error) {
      console.error('Search error:', error);
    }

    setSearchResults(allResults);
    setShowSearchResults(true);
  };

  const handleSearchResultClick = (path) => {
    navigate(path);
    setSearchQuery('');
    setSearchResults([]);
    setShowSearchResults(false);
  };

  const notifications = [
    {
      id: 1,
      type: 'info',
      title: 'توزيع أرباح جديد',
      message: 'تم توزيع أرباح شهر مارس بنجاح',
      time: '5 دقائق',
      read: false
    },
    {
      id: 2,
      type: 'warning',
      title: 'مشروع يحتاج مراجعة',
      message: 'مشروع البناء الأول يحتاج موافقة',
      time: '1 ساعة',
      read: false
    },
    {
      id: 3,
      type: 'success',
      title: 'تم إضافة شريك جديد',
      message: 'تم إضافة أحمد محمد كشريك جديد',
      time: '3 ساعات',
      read: true
    }
  ];

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200 bg-white backdrop-blur-sm dark:border-slate-800 dark:bg-slate-950/95">
      <div className="px-4 sm:px-6 lg:px-8">
        <div className={`mx-auto flex ${logoSettings.headerHeight} w-full max-w-7xl items-center justify-between gap-6`}>
          {/* Left side - Menu button for mobile */}
          <div className="flex items-center gap-5">
            <button
              type="button"
              className="lg:hidden flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 transition-colors hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
              onClick={onMenuClick}
            >
              <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>

            {/* Company Logo */}
            <div className="flex items-center gap-5">
              <Logo size={logoSettings.headerSize} showText={logoSettings.showText} className="flex-shrink-0" />
              <div className="hidden sm:flex flex-col items-end gap-1 text-right">
                <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.35em] text-slate-400 dark:text-slate-500">
                  <span className="inline-block h-px w-6 bg-gradient-to-l from-emerald-400 via-blue-500 to-indigo-500" />
                  SANAD ELEVATORS
                </div>
                <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">
                  <span className="bg-gradient-to-l from-emerald-500 via-blue-600 to-indigo-600 bg-clip-text text-transparent">
                    نظام إدارة المصاعد
                  </span>
                </h1>
                <p className="rounded-lg border border-transparent bg-slate-50 px-3 py-1 text-sm font-semibold text-slate-600 shadow-sm backdrop-blur dark:border-slate-700 dark:bg-slate-900/70 dark:text-slate-100">
                  السند للمصاعد
                </p>
                <p className="text-[10px] font-medium uppercase tracking-[0.38em] text-slate-400 dark:text-slate-500">
                  SANAD - ELEVATORS
                </p>
              </div>
            </div>
          </div>

          {/* Center - Search Bar */}
          <div className="hidden md:flex flex-1 max-w-xl mx-auto">
            <div ref={searchRef} className="group relative w-full">
              <div className="pointer-events-none absolute inset-y-0 right-4 flex items-center">
                <svg className="h-5 w-5 text-slate-400 transition-colors duration-200 group-focus-within:text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => handleSearch(e.target.value)}
                onFocus={() => searchQuery.length >= 2 && setShowSearchResults(true)}
                placeholder="البحث في النظام..."
                className="w-full rounded-lg border border-slate-200 bg-slate-50 py-3 pl-4 pr-12 text-sm text-slate-900 placeholder:text-slate-400 transition-colors duration-200 focus:border-slate-400 focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:border-slate-500"
              />

              {/* Search Results Dropdown */}
              {showSearchResults && searchResults.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-3 rounded-lg border border-slate-200 bg-white p-3 shadow-lg dark:border-slate-700 dark:bg-slate-900 z-50 max-h-96 overflow-y-auto">
                  <div className="space-y-1">
                    <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 px-2">نتائج البحث ({searchResults.length})</p>
                    {searchResults.map((result, index) => (
                      <button
                        key={index}
                        onClick={() => handleSearchResultClick(result.path)}
                        className="flex w-full items-center justify-between gap-3 rounded-lg border border-transparent bg-white px-3.5 py-2.5 text-right text-slate-700 transition-colors duration-150 hover:border-slate-200 hover:bg-slate-100 hover:text-slate-900 dark:bg-slate-900 dark:text-slate-200 dark:hover:border-slate-700 dark:hover:bg-slate-800"
                      >
                        <div className="flex items-center gap-3 flex-1">
                          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-300">
                            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                          </span>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-slate-700 dark:text-slate-200 truncate">{result.name}</p>
                            {result.subtitle && (
                              <p className="text-xs text-slate-400 dark:text-slate-500 truncate">{result.subtitle}</p>
                            )}
                          </div>
                        </div>
                        {result.type !== 'page' && (
                          <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                            {result.type === 'product' && 'منتج'}
                            {result.type === 'customer' && 'عميل'}
                            {result.type === 'partner' && 'شريك'}
                            {result.type === 'supplier' && 'مورد'}
                            {result.type === 'warehouse' && 'مخزن'}
                          </span>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* No Results */}
              {showSearchResults && searchQuery.length >= 2 && searchResults.length === 0 && (
                <div className="absolute top-full left-0 right-0 mt-3 rounded-lg border border-slate-200 bg-white p-4 text-center shadow-lg dark:border-slate-800/70 dark:bg-slate-900/90 z-50">
                  <p className="text-sm font-semibold text-slate-400 dark:text-slate-500">لا توجد نتائج</p>
                </div>
              )}
            </div>
          </div>

          {/* Right side - Actions */}
          <div className="flex items-center gap-3">
            {/* Search button for mobile */}
            <button className="md:hidden flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 transition-colors hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800">
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </button>

            <div className="flex items-center gap-2">
              {/* Notifications */}
              <div className="relative">
                <button
                  onClick={() => setShowNotifications(!showNotifications)}
                  className="relative flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 transition-colors hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
                >
                  <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                  </svg>
                  {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-rose-500 text-xs font-semibold text-white">
                      {unreadCount}
                    </span>
                  )}
                </button>

                {/* Notifications dropdown */}
                {showNotifications && (
                  <div className="absolute left-0 mt-3 w-80 origin-top-left rounded-lg border border-slate-200 bg-white p-4 shadow-lg focus:outline-none z-50 dark:border-slate-800/70 dark:bg-slate-900/95">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">الإشعارات</h3>
                      <button className="text-xs font-semibold text-blue-600 transition-colors hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300">
                        قراءة الكل
                      </button>
                    </div>
                    <div className="space-y-3">
                      {notifications.map((notification) => (
                        <div
                          key={notification.id}
                          className={`rounded-lg border px-3.5 py-3 transition-colors ${
                            notification.read
                              ? 'border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900/70'
                              : 'border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-800/70'
                          }`}
                        >
                          <div className="flex items-start gap-3">
                            <div
                              className="mt-1 flex h-8 w-8 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
                            >
                              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4" />
                              </svg>
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{notification.title}</p>
                              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{notification.message}</p>
                              <p className="mt-2 text-xs font-medium text-slate-400 dark:text-slate-500">{notification.time}</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="mt-4 flex items-center justify-between border-t border-slate-200/70 pt-3 dark:border-slate-800/70">
                      <div className="flex items-center gap-2 text-xs font-semibold text-slate-400 dark:text-slate-500">
                        <span className="h-2 w-2 rounded-full bg-blue-500"></span>
                        <span>آخر تحديث منذ دقيقة</span>
                      </div>
                      <button
                        onClick={() => {
                          setShowNotifications(false);
                          navigate('/recent-activity');
                        }}
                        className="rounded-full bg-blue-500/10 px-3 py-1 text-xs font-semibold text-blue-600 transition-colors hover:bg-blue-500/20 dark:bg-blue-500/10 dark:text-blue-300 dark:hover:bg-blue-500/20"
                      >
                        عرض جميع الإشعارات
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Dark Mode Toggle */}
              <button
                onClick={toggleTheme}
                className="flex h-11 w-11 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-400 transition-all duration-200 hover:-translate-y-0.5 hover:border-blue-200/60 hover:text-slate-600 hover:shadow-lg dark:bg-slate-900/60"
                title={isDarkMode ? 'تفعيل الوضع النهاري' : 'تفعيل الوضع الليلي'}
              >
                {isDarkMode ? (
                  <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                  </svg>
                ) : (
                  <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                  </svg>
                )}
              </button>

              {/* Settings */}
              <button
                onClick={handleSettingsClick}
                className="flex h-11 w-11 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-400 transition-all duration-200 hover:-translate-y-0.5 hover:border-blue-200/60 hover:text-slate-600 hover:shadow-lg dark:bg-slate-900/60"
              >
                <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                </svg>
              </button>
            </div>

            {/* User menu */}
            <div className="relative">
              <button
                onClick={() => setShowUserMenu(!showUserMenu)}
                className="flex items-center gap-3 rounded-lg border border-slate-200 bg-white/70 px-2 py-1.5 text-sm font-semibold text-slate-600 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-blue-200/60 hover:bg-white hover:text-slate-900 hover:shadow-lg dark:border-slate-800/70 dark:bg-slate-900/70 dark:text-slate-200 dark:hover:border-indigo-500/40 dark:hover:text-slate-50"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white">
                  {user ? user.username.charAt(0).toUpperCase() : 'U'}
                </div>
                <div className="hidden sm:block text-right">
                  <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{user ? user.full_name || user.username : 'مستخدم'}</p>
                  <p className="text-xs font-medium text-slate-600/80 dark:text-blue-300/80">مدير النظام</p>
                </div>
                <svg className="h-4 w-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {/* User dropdown */}
              {showUserMenu && (
                <div className="absolute left-0 mt-3 w-56 origin-top-left rounded-lg border border-slate-200 bg-white shadow-lg focus:outline-none z-50 dark:border-slate-800/70 dark:bg-slate-900/95">
                  <div className="py-1">
                    <div className="px-5 py-4 border-b border-slate-200/70 dark:border-slate-800/70">
                      <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{user ? user.full_name || user.username : 'مستخدم'}</p>
                      <p className="mt-1 text-xs font-medium text-slate-400 dark:text-slate-500">{user ? user.email : 'user@example.com'}</p>
                      {isRemembered() && (
                        <div className="mt-3 flex items-center gap-2 rounded-lg bg-blue-500/10 px-3 py-1.5 text-[11px] font-semibold text-blue-600 dark:bg-blue-500/15 dark:text-blue-300">
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                          </svg>
                          <span>محفوظ لمدة {getRemainingRememberTime()} يوم</span>
                        </div>
                      )}
                    </div>
                    <button
                      onClick={handleProfileClick}
                      className="flex w-full items-center justify-between gap-3 px-5 py-2.5 text-right text-sm font-semibold text-slate-600 transition-colors hover:bg-blue-50/70 hover:text-blue-700 dark:text-slate-300 dark:hover:bg-slate-800/60 dark:hover:text-indigo-300"
                    >
                      <svg className="h-4 w-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                      الملف الشخصي
                    </button>
                    <button
                      onClick={handleSettingsClick}
                      className="flex w-full items-center justify-between gap-3 px-5 py-2.5 text-right text-sm font-semibold text-slate-600 transition-colors hover:bg-blue-50/70 hover:text-blue-700 dark:text-slate-300 dark:hover:bg-slate-800/60 dark:hover:text-indigo-300"
                    >
                      <svg className="h-4 w-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                      </svg>
                      الإعدادات
                    </button>
                    <button className="flex w-full items-center justify-between gap-3 px-5 py-2.5 text-right text-sm font-semibold text-slate-500 transition-colors hover:bg-slate-100/70 hover:text-slate-800 dark:text-slate-400 dark:hover:bg-slate-800/60 dark:hover:text-slate-200">
                      <svg className="h-4 w-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      المساعدة
                    </button>
                    <div className="my-1 border-t border-slate-200/70 dark:border-slate-800/70"></div>
                    <button
                      onClick={() => {
                        setShowUserMenu(false);
                        logout();
                      }}
                      className="flex w-full items-center justify-between gap-3 px-5 py-2.5 text-right text-sm font-semibold text-rose-600 transition-colors hover:bg-rose-50/80 dark:text-rose-400 dark:hover:bg-rose-500/10"
                    >
                      <svg className="h-4 w-4 text-rose-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                      </svg>
                      تسجيل الخروج
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Mobile search bar */}
      <div className="md:hidden px-4 pb-4">
        <div className="relative rounded-lg border border-slate-200 bg-white/70 shadow-sm backdrop-blur dark:border-slate-800/60 dark:bg-slate-900/70">
          <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-4">
            <svg className="h-5 w-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => handleSearch(e.target.value)}
            onFocus={() => searchQuery.length >= 2 && setShowSearchResults(true)}
            placeholder="البحث..."
            className="w-full rounded-lg border-none bg-transparent py-3 pl-4 pr-12 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-0 dark:text-slate-100 dark:placeholder:text-slate-500"
          />

          {/* Mobile Search Results */}
          {showSearchResults && searchResults.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-3 rounded-lg border border-slate-200 bg-white p-3 shadow-lg dark:border-slate-800/70 dark:bg-slate-900/95 z-50 max-h-96 overflow-y-auto">
              <div className="space-y-1">
                <p className="text-xs font-semibold text-slate-400 dark:text-slate-500 px-2">نتائج البحث ({searchResults.length})</p>
                {searchResults.map((result, index) => (
                  <button
                    key={index}
                    onClick={() => handleSearchResultClick(result.path)}
                    className="flex w-full items-center justify-between gap-3 text-right px-3.5 py-2.5 rounded-lg border border-slate-200 bg-white text-slate-700 transition-all duration-200 hover:-translate-y-0.5 hover:border-blue-200/60 hover:bg-blue-50/40 hover:text-slate-900 dark:bg-slate-900/60 dark:text-slate-200 dark:hover:border-indigo-500/40 dark:hover:bg-slate-800/80"
                  >
                    <div className="flex items-center gap-3 flex-1">
                      <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50/70 text-slate-600 dark:bg-blue-500/10 dark:text-blue-300">
                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-slate-700 dark:text-slate-200 truncate">{result.name}</p>
                        {result.subtitle && (
                          <p className="text-xs text-slate-400 dark:text-slate-500 truncate">{result.subtitle}</p>
                        )}
                      </div>
                    </div>
                    {result.type !== 'page' && (
                      <span className="text-xs rounded-full bg-blue-100 px-2.5 py-1 font-semibold text-blue-600 dark:bg-blue-900 dark:text-blue-300">
                        {result.type === 'product' && 'منتج'}
                        {result.type === 'customer' && 'عميل'}
                        {result.type === 'partner' && 'شريك'}
                        {result.type === 'supplier' && 'مورد'}
                        {result.type === 'warehouse' && 'مخزن'}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Mobile No Results */}
          {showSearchResults && searchQuery.length >= 2 && searchResults.length === 0 && (
            <div className="absolute top-full left-0 right-0 mt-3 rounded-lg border border-slate-200 bg-white p-4 text-center shadow-lg dark:border-slate-800/70 dark:bg-slate-900/90 z-50">
              <p className="text-sm font-semibold text-slate-400 dark:text-slate-500">لا توجد نتائج</p>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;
