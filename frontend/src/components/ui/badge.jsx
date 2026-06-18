import React from 'react';
import { cn } from '../../lib/utils';

/**
 * مكون الشارة الموحد والمحسّن لنظام SANAD ELEVATORS
 * Enhanced Unified Badge Component for SANAD ELEVATORS System
 *
 * @component Badge
 * @example
 * <Badge variant="success">مكتمل</Badge>
 */

const badgeVariants = {
  default: "border-transparent bg-blue-600 text-white hover:bg-blue-700",
  primary: "border-transparent bg-blue-600 text-white hover:bg-blue-700",
  secondary: "border-transparent bg-gray-100 text-gray-900 hover:bg-gray-200",
  destructive: "border-transparent bg-red-600 text-white hover:bg-red-700",
  outline: "text-gray-950 border-gray-200 bg-white hover:bg-gray-50",
  success: "border-transparent bg-emerald-600 text-white hover:bg-emerald-700",
  warning: "border-transparent bg-amber-600 text-white hover:bg-amber-700",
  info: "border-transparent bg-cyan-500 text-white hover:bg-cyan-600",
  purple: "border-transparent bg-purple-600 text-white hover:bg-purple-700",
  ghost: "border-transparent bg-slate-100 text-slate-700 hover:bg-slate-200"
};

const Badge = React.forwardRef(({ className, variant = "default", ...props }, ref) => {
  return (
    <div
      ref={ref}
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-gray-950 focus:ring-offset-2",
        badgeVariants[variant],
        className
      )}
      {...props}
    />
  );
});
Badge.displayName = "Badge";

/**
 * مكون شارة الحالة الموحد
 * Unified Status Badge Component
 *
 * يستخدم لعرض الحالات المختلفة (فواتير، أوامر، عقود، إلخ)
 *
 * @component StatusBadge
 * @example
 * <StatusBadge type="invoice" status="PAID" />
 * <StatusBadge type="contract" status="ACTIVE" />
 */
const StatusBadge = React.forwardRef(({
  type = 'invoice', // invoice, contract, purchaseOrder, salesOrder
  status,
  className,
  ...props
}, ref) => {

  // تكوينات الحالات المختلفة
  const statusConfigs = {
    // حالات الفواتير
    invoice: {
      DRAFT: { variant: 'secondary', text: 'مسودة', icon: null },
      ISSUED: { variant: 'primary', text: 'صادرة', icon: null },
      PARTIALLY_PAID: { variant: 'warning', text: 'مدفوعة جزئياً', icon: null },
      PAID: { variant: 'success', text: 'مدفوعة', icon: null },
      OVERDUE: { variant: 'destructive', text: 'متأخرة', icon: null },
      VOID: { variant: 'secondary', text: 'ملغاة', icon: null }
    },
    // حالات العقود
    contract: {
      DRAFT: { variant: 'secondary', text: 'مسودة', icon: null },
      ACTIVE: { variant: 'primary', text: 'نشط', icon: null },
      COMPLETED: { variant: 'success', text: 'مكتمل', icon: null },
      TERMINATED: { variant: 'destructive', text: 'ملغي', icon: null }
    },
    // حالات أوامر الشراء
    purchaseOrder: {
      DRAFT: { variant: 'secondary', text: 'مسودة', icon: null },
      CONFIRMED: { variant: 'primary', text: 'مؤكد', icon: null },
      RECEIVED: { variant: 'success', text: 'مستلم', icon: null },
      CANCELLED: { variant: 'destructive', text: 'ملغي', icon: null }
    },
    // حالات أوامر البيع
    salesOrder: {
      DRAFT: { variant: 'secondary', text: 'مسودة', icon: null },
      CONFIRMED: { variant: 'primary', text: 'مؤكد', icon: null },
      FULFILLED: { variant: 'success', text: 'مكتمل', icon: null },
      INVOICED: { variant: 'purple', text: 'مفوترة', icon: null },
      CANCELLED: { variant: 'destructive', text: 'ملغى', icon: null },
      VOID: { variant: 'secondary', text: 'لاغٍ', icon: null }
    }
  };

  const config = statusConfigs[type]?.[status] || { variant: 'secondary', text: status || 'غير محدد', icon: null };

  return (
    <Badge
      ref={ref}
      variant={config.variant}
      className={cn(
        "px-3 py-1",
        className
      )}
      {...props}
    >
      {config.icon}
      {config.text}
    </Badge>
  );
});
StatusBadge.displayName = "StatusBadge";

export { Badge, badgeVariants, StatusBadge };