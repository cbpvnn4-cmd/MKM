import React from 'react';
import { cn } from '../../lib/utils';

export const Tabs = ({ value, onValueChange, children, className = '' }) => {
  return (
    <div className={cn('w-full', className)} data-tabs-value={value}>
      {React.Children.map(children, (child) => {
        if (!React.isValidElement(child)) return child;
        // Inject value/onValueChange into children that accept them
        return React.cloneElement(child, { tabsValue: value, onValueChange });
      })}
    </div>
  );
};

export const TabsList = ({ children, className = '', tabsValue }) => (
  <div className={cn('inline-flex items-center gap-2 rounded-xl bg-slate-100 p-1 border border-slate-200', className)}>
    {React.Children.map(children, (child) => {
      if (!React.isValidElement(child)) return child;
      return React.cloneElement(child, { tabsValue });
    })}
  </div>
);

export const TabsTrigger = ({ children, value, tabsValue, onValueChange, className = '' }) => {
  const isActive = tabsValue === value;
  return (
    <button
      type="button"
      onClick={() => onValueChange && onValueChange(value)}
      className={cn(
        'px-4 py-2 text-sm font-medium rounded-lg transition-all',
        isActive
          ? 'bg-white text-slate-900 shadow border border-slate-200'
          : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
      , className)}
    >
      {children}
    </button>
  );
};

export const TabsContent = ({ children, value, tabsValue, className = '' }) => {
  if (tabsValue !== value) return null;
  return <div className={cn('mt-4', className)}>{children}</div>;
};

