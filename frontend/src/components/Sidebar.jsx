import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useLogoSettings } from '../contexts/LogoContext';
import { canAccessRoute } from '../utils/permissions';
import Logo from './Logo';
import {
  LayoutDashboard,
  Users2,
  Contact,
  TrendingUp,
  FileText,
  FileCheck,
  FileSignature,
  PackageCheck,
  Warehouse,
  Truck,
  ShoppingCart,
  ArrowLeftRight,
  Wrench,
  Wallet,
  Coins,
  PieChart,
  BarChart3,
  FileBarChart,
  ShieldCheck,
  CircleDashed,
  ChevronRight,
} from 'lucide-react';

const iconMap = {
  dashboard: LayoutDashboard,
  partners: Users2,
  customers: Contact,
  quotations: FileSignature,
  contracts: FileCheck,
  sales: TrendingUp,
  invoices: FileText,
  products: PackageCheck,
  warehouses: Warehouse,
  suppliers: Truck,
  purchases: ShoppingCart,
  stock: ArrowLeftRight,
  maintenance: Wrench,
  expenses: Wallet,
  capital: Coins,
  ownership: PieChart,
  profit: BarChart3,
  reports: FileBarChart,
  users: ShieldCheck,
  default: CircleDashed,
};

const SidebarIcon = ({ name, className }) => {
  const Icon = iconMap[name] || iconMap.default;
  return <Icon className={className} aria-hidden="true" />;
};

const Sidebar = ({ onClose }) => {
  const location = useLocation();
  const { user } = useAuth();
  const { logoSettings } = useLogoSettings();
  const [expandedGroups, setExpandedGroups] = useState(['main']);

  const toggleGroup = (groupName) => {
    setExpandedGroups(prev =>
      prev.includes(groupName)
        ? prev.filter(g => g !== groupName)
        : [...prev, groupName]
    );
  };

  const navigationGroups = [
    {
      name: 'main',
      title: 'الرئيسية',
      items: [
        {
          name: 'لوحة التحكم',
          href: '/',
          icon: 'dashboard',
          badge: null,
          color: 'text-blue-600'
        },
      ]
    },
    {
      name: 'business',
      title: 'إدارة الأعمال',
      items: [
        {
          name: 'الشركاء',
          href: '/partners',
          icon: 'partners',
          badge: null,
          color: 'text-green-600'
        },
        {
          name: 'العملاء',
          href: '/customers',
          icon: 'customers',
          badge: null,
          color: 'text-purple-600'
        },
      ]
    },
    {
      name: 'operations',
      title: 'العمليات التجارية',
      items: [
        {
          name: 'عروض الأسعار',
          href: '/quotations',
          icon: 'quotations',
          badge: null,
          color: 'text-purple-600'
        },
        {
          name: 'العقود',
          href: '/contracts',
          icon: 'contracts',
          badge: null,
          color: 'text-blue-600'
        },
        {
          name: 'المبيعات',
          href: '/sales',
          icon: 'sales',
          badge: null,
          color: 'text-indigo-600'
        },
        {
          name: 'الفواتير',
          href: '/invoices',
          icon: 'invoices',
          badge: null,
          color: 'text-cyan-600'
        },
        {
          name: 'المنتجات',
          href: '/products',
          icon: 'products',
          badge: null,
          color: 'text-pink-600'
        },
        {
          name: 'المخازن',
          href: '/warehouses',
          icon: 'warehouses',
          badge: null,
          color: 'text-emerald-600'
        },
        {
          name: 'الموردين',
          href: '/suppliers',
          icon: 'suppliers',
          badge: null,
          color: 'text-orange-600'
        },
        {
          name: 'المشتريات',
          href: '/purchase-orders',
          icon: 'purchases',
          badge: null,
          color: 'text-indigo-600'
        },
        {
          name: 'حركات المخزون',
          href: '/stock-movements',
          icon: 'stock',
          badge: null,
          color: 'text-teal-600'
        },
        {
          name: 'الصيانة',
          href: '/maintenance',
          icon: 'maintenance',
          badge: null,
          color: 'text-red-600'
        },
      ]
    },
    {
      name: 'financial',
      title: 'الإدارة المالية',
      items: [
        {
          name: 'المصروفات',
          href: '/expenses',
          icon: 'expenses',
          badge: null,
          color: 'text-rose-600'
        },
        {
          name: 'حركات رأس المال',
          href: '/capital-movements',
          icon: 'capital',
          badge: null,
          color: 'text-blue-600'
        },
        {
          name: 'لقطات الملكية',
          href: '/ownership-snapshots',
          icon: 'ownership',
          badge: null,
          color: 'text-purple-600'
        },
        {
          name: 'توزيع الأرباح',
          href: '/profit-distribution',
          icon: 'profit',
          badge: 'جديد',
          color: 'text-amber-600'
        },
        {
          name: 'عمليات المستفيدين',
          href: '/beneficiary-operations',
          icon: 'partners',
          badge: 'جديد',
          color: 'text-purple-600'
        },
      ]
    },
    {
      name: 'reports',
      title: 'التقارير والتحليلات',
      items: [
        {
          name: 'التقارير',
          href: '/reports',
          icon: 'reports',
          badge: null,
          color: 'text-teal-600'
        },
      ]
    },
    {
      name: 'admin',
      title: 'الإدارة',
      items: [
        {
          name: 'إدارة المستخدمين',
          href: '/user-management',
          icon: 'users',
          badge: null,
          color: 'text-gray-600'
        },
      ]
    }
  ];

  return (
    <div className="flex h-full flex-col border-l border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950">
      {/* Sidebar header */}
      <div className="flex h-32 min-h-[120px] shrink-0 items-center justify-center border-b border-slate-200 px-5 dark:border-slate-800">
        <div className="flex flex-col items-center gap-3 w-full">
          <Logo size={logoSettings.sidebarSize} showText={false} className="flex-shrink-0" />
          <h2 className="text-sm md:text-base font-bold text-slate-900 dark:text-slate-100 break-words text-center px-2">نظام إدارة المصاعد</h2>
        </div>

        {/* Close button for mobile */}
        <button
          type="button"
          className="lg:hidden absolute top-4 left-4 inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition-colors hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
          onClick={onClose}
        >
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex flex-1 flex-col overflow-y-auto px-4 py-6">
        <div className="space-y-5">
          {navigationGroups.map((group) => (
            <div key={group.name}>
              <button
                onClick={() => toggleGroup(group.name)}
                className="flex w-full items-center justify-between rounded-md px-2 py-2 text-xs font-medium text-slate-500 transition-colors hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100"
              >
                <span className="flex items-center gap-2 text-[0.75rem]">
                  <span className={`h-1.5 w-1.5 rounded-full transition-colors ${expandedGroups.includes(group.name) ? 'bg-slate-900 dark:bg-slate-200' : 'bg-slate-300 dark:bg-slate-600'}`} />
                  {group.title}
                </span>
                <ChevronRight
                  className={`h-4 w-4 transition-transform duration-200 ${expandedGroups.includes(group.name) ? 'rotate-90 text-slate-700 dark:text-slate-200' : 'text-slate-300 dark:text-slate-600'}`}
                  strokeWidth={2}
                />
              </button>

              {expandedGroups.includes(group.name) && (
                <ul className="mt-2 space-y-1.5">
                  {group.items.filter(item => canAccessRoute(user, item.href)).map((item) => {
                    const isActive = location.pathname === item.href;
                    return (
                      <li key={item.name}>
                        <Link
                          to={item.href}
                          onClick={onClose}
                          className={`group flex items-center justify-between gap-2 md:gap-3 rounded-xl px-2 md:px-3 py-2 text-xs md:text-sm transition-colors ${
                            isActive
                              ? 'bg-slate-100 text-slate-900 dark:bg-slate-800 dark:text-slate-50'
                              : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-slate-100'
                          }`}
                        >
                          <div className="flex items-center gap-2 md:gap-3 min-w-0 flex-1">
                            <span
                              className={`flex h-7 w-7 md:h-8 md:w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 transition-colors group-hover:border-slate-300 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400 flex-shrink-0 ${
                                isActive ? 'border-slate-300 text-slate-900 dark:border-slate-600 dark:text-slate-100' : ''
                              }`}
                            >
                              <SidebarIcon name={item.icon} className="h-4 w-4 md:h-[18px] md:w-[18px]" />
                            </span>
                            <span className="truncate text-xs md:text-sm font-medium break-words">{item.name}</span>
                          </div>

                          {item.badge && (
                            <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600 dark:bg-slate-800/70 dark:text-slate-200">
                              {item.badge}
                            </span>
                          )}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          ))}
        </div>
      </nav>

      {/* Bottom section */}
      <div className="border-t border-slate-200 px-2 md:px-3 py-3 dark:border-slate-800 flex-shrink-0">
        <div className="space-y-2">
          <div className="rounded-lg border border-slate-200 bg-slate-50 px-2 md:px-3 py-2 text-right dark:border-slate-700 dark:bg-slate-900/70">
            <p className="text-[10px] md:text-xs font-semibold text-slate-700 dark:text-slate-200 break-words">3 عملاء نشطون</p>
            <p className="text-[9px] md:text-[10px] text-slate-500 dark:text-slate-400 break-words">آخر تحديث خلال 5 دقائق</p>
          </div>
          <div className="flex items-center justify-between rounded-lg border border-slate-200 px-2 md:px-3 py-2 text-[9px] md:text-[10px] text-slate-500 dark:border-slate-700 dark:text-slate-400 gap-2">
            <div className="flex items-center gap-1 md:gap-1.5 min-w-0">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 flex-shrink-0" />
              <span className="truncate">النظام يعمل</span>
            </div>
            <span className="rounded-full bg-slate-100 px-1.5 py-0.5 text-[8px] md:text-[9px] font-medium text-slate-500 dark:bg-slate-800 dark:text-slate-300 whitespace-nowrap flex-shrink-0">
              v2.4
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;
