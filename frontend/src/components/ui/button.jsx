import React from 'react';
import { cn } from '../../lib/utils';
import { Loader2 } from 'lucide-react';

/**
 * مكون الزر الموحد والمحسّن لنظام SANAD ELEVATORS
 * Enhanced Unified Button Component for SANAD ELEVATORS System
 *
 * @component Button
 * @example
 * <Button variant="primary" onClick={handleClick}>
 *   حفظ
 * </Button>
 *
 * @example
 * <Button variant="success" loading={true}>
 *   جاري الحفظ...
 * </Button>
 */

const buttonVariants = {
  // الأزرار الرئيسية
  default: "bg-blue-600 text-white hover:bg-blue-700 focus:ring-4 focus:ring-blue-300 shadow-sm",
  primary: "bg-blue-600 text-white hover:bg-blue-700 focus:ring-4 focus:ring-blue-300 shadow-sm",
  secondary: "bg-slate-100 text-slate-700 border border-slate-300 hover:bg-slate-200 focus:ring-4 focus:ring-slate-300",

  // أزرار الإجراءات
  success: "bg-emerald-600 text-white hover:bg-emerald-700 focus:ring-4 focus:ring-emerald-300 shadow-sm",
  danger: "bg-red-600 text-white hover:bg-red-700 focus:ring-4 focus:ring-red-300 shadow-sm",
  warning: "bg-amber-500 text-white hover:bg-amber-600 focus:ring-4 focus:ring-amber-300 shadow-sm",
  info: "bg-cyan-500 text-white hover:bg-cyan-600 focus:ring-4 focus:ring-cyan-300 shadow-sm",

  // أزرار محايدة
  ghost: "bg-transparent text-slate-700 hover:bg-slate-100 focus:ring-4 focus:ring-slate-200",
  link: "text-blue-600 underline-offset-4 hover:underline focus:ring-4 focus:ring-blue-300 bg-transparent p-0",

  // أزرار بحدود خارجية
  'outline-primary': "bg-white text-blue-600 border-2 border-blue-600 hover:bg-blue-50 focus:ring-4 focus:ring-blue-300",
  'outline-success': "bg-white text-emerald-600 border-2 border-emerald-600 hover:bg-emerald-50 focus:ring-4 focus:ring-emerald-300",
  'outline-danger': "bg-white text-red-600 border-2 border-red-600 hover:bg-red-50 focus:ring-4 focus:ring-red-300",
  'outline-warning': "bg-white text-amber-600 border-2 border-amber-600 hover:bg-amber-50 focus:ring-4 focus:ring-amber-300",

  // للتوافق مع老的 كود
  destructive: "bg-red-600 text-white hover:bg-red-700 focus:ring-4 focus:ring-red-300 shadow-sm",
  outline: "border border-gray-300 bg-white hover:bg-gray-50 focus:ring-4 focus:ring-gray-200"
};

const buttonSizes = {
  xs: "h-7 px-2 py-1 text-xs rounded-md",
  sm: "h-8 px-3 py-1.5 text-sm rounded-md",
  default: "h-10 px-4 py-2 text-sm rounded-lg",
  md: "h-10 px-4 py-2 text-sm rounded-lg",
  lg: "h-11 px-5 py-2.5 text-base rounded-lg",
  xl: "h-12 px-6 py-3 text-lg rounded-lg",
  icon: "h-10 w-10 p-0"
};

const Button = React.forwardRef(
  ({
    className,
    variant = "default",
    size = "default",
    asChild = false,
    loading = false,
    disabled = false,
    fullWidth = false,
    icon: Icon = null,
    iconPosition = 'start',
    children,
    ...props
  }, ref) => {
    const Comp = asChild ? "span" : "button";

    // تعطيل الزر أثناء التحميل
    const isDisabled = disabled || loading;

    return (
      <Comp
        className={cn(
          "inline-flex items-center justify-center gap-2 whitespace-nowrap font-semibold ring-offset-white transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 disabled:cursor-not-allowed",
          buttonVariants[variant] || buttonVariants.default,
          buttonSizes[size] || buttonSizes.default,
          fullWidth && "w-full",
          className
        )}
        ref={ref}
        disabled={isDisabled}
        {...props}
      >
        {loading ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            {children}
          </>
        ) : (
          <>
            {Icon && iconPosition === 'start' && <Icon className="w-4 h-4" />}
            {children}
            {Icon && iconPosition === 'end' && <Icon className="w-4 h-4" />}
          </>
        )}
      </Comp>
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants, buttonSizes };
