import React from 'react';
import { cn } from '../../lib/utils';
import { Loader2 } from 'lucide-react';

/**
 * مكون التحميل الموحد لنظام SANAD ELEVATORS
 * Unified Loading Component for SANAD ELEVATORS System
 *
 * @component Loading
 * @example
 * <Loading message="جاري التحميل..." />
 */

const Loading = React.forwardRef(({
  message = 'جاري التحميل...',
  size = 'md', // xs, sm, md, lg, xl
  variant = 'spinner', // spinner, dots, pulse
  fullscreen = false,
  className = '',
  ...props
}, ref) => {

  const sizeClasses = {
    xs: 'h-4 w-4 border-2',
    sm: 'h-6 w-6 border-2',
    md: 'h-12 w-12 border-b-2',
    lg: 'h-16 w-16 border-b-3',
    xl: 'h-20 w-20 border-b-4'
  };

  const textSizeClasses = {
    xs: 'text-xs',
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-lg',
    xl: 'text-xl'
  };

  const containerClasses = cn(
    'flex',
    'flex-col',
    'items-center',
    'justify-center',
    'gap-4',
    fullscreen && 'fixed',
    fullscreen && 'inset-0',
    fullscreen && 'bg-white',
    fullscreen && 'bg-opacity-90',
    fullscreen && 'z-50',
    !fullscreen && 'p-12',
    className
  );

  const renderSpinner = () => (
    <div
      className={cn(
        'animate-spin',
        'rounded-full',
        'border-blue-600',
        'border-t-transparent',
        sizeClasses[size]
      )}
    />
  );

  const renderDots = () => (
    <div className="flex gap-2">
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className={cn(
            'rounded-full',
            'bg-blue-600',
            'animate-pulse',
            size === 'xs' && 'h-2 w-2',
            size === 'sm' && 'h-3 w-3',
            size === 'md' && 'h-4 w-4',
            size === 'lg' && 'h-5 w-5',
            size === 'xl' && 'h-6 w-6'
          )}
          style={{
            animationDelay: `${i * 0.2}s`,
            animationDuration: '1s'
          }}
        />
      ))}
    </div>
  );

  const renderPulse = () => (
    <div className={cn(
      'rounded-full',
      'bg-blue-600',
      'animate-ping',
      sizeClasses[size]
    )} />
  );

  return (
    <div
      ref={ref}
      className={containerClasses}
      {...props}
    >
      {variant === 'spinner' && renderSpinner()}
      {variant === 'dots' && renderDots()}
      {variant === 'pulse' && renderPulse()}

      {message && (
        <p className={cn(
          'text-gray-600',
          'font-medium',
          textSizeClasses[size]
        )}>
          {message}
        </p>
      )}
    </div>
  );
});

Loading.displayName = 'Loading';

/**
 * مكون التحميل البسيط (للأزرار والحقول)
 * Simple Loading Spinner (for buttons and inputs)
 */
const LoadingSpinner = React.forwardRef(({
  size = 'sm',
  className = '',
  ...props
}, ref) => {

  const sizeClasses = {
    xs: 'h-3 w-3',
    sm: 'h-4 w-4',
    md: 'h-5 w-5',
    lg: 'h-6 w-6',
    xl: 'h-8 w-8'
  };

  return (
    <Loader2
      ref={ref}
      className={cn(
        'animate-spin',
        sizeClasses[size],
        className
      )}
      {...props}
    />
  );
});

LoadingSpinner.displayName = 'LoadingSpinner';

/**
 * مكون غطاء التحميل (Skeleton)
 * Loading Skeleton Component
 */
const Skeleton = React.forwardRef(({
  className = '',
  variant = 'default', // default, text, circular, button
  ...props
}, ref) => {

  const variantClasses = {
    default: 'h-4 w-full rounded',
    text: 'h-4 w-3/4 rounded',
    circular: 'h-12 w-12 rounded-full',
    button: 'h-10 w-24 rounded-lg'
  };

  return (
    <div
      ref={ref}
      className={cn(
        'animate-pulse',
        'bg-gray-200',
        variantClasses[variant],
        className
      )}
      {...props}
    />
  );
});

Skeleton.displayName = 'Skeleton';

/**
 * مكون غطاء الجدول (Table Skeleton)
 */
const TableSkeleton = React.forwardRef(({
  rows = 5,
  columns = 5,
  className = '',
  ...props
}, ref) => {

  return (
    <div
      ref={ref}
      className={cn('space-y-3', className)}
      {...props}
    >
      {/* Header */}
      <div className="flex gap-4">
        {Array.from({ length: columns }).map((_, i) => (
          <Skeleton key={`header-${i}`} className="h-10 flex-1" />
        ))}
      </div>

      {/* Rows */}
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div key={`row-${rowIndex}`} className="flex gap-4">
          {Array.from({ length: columns }).map((_, colIndex) => (
            <Skeleton key={`cell-${rowIndex}-${colIndex}`} className="h-12 flex-1" />
          ))}
        </div>
      ))}
    </div>
  );
});

TableSkeleton.displayName = 'TableSkeleton';

export { Loading, LoadingSpinner, Skeleton, TableSkeleton };
