import React from 'react';
import { cn } from '../../lib/utils';

const TooltipProvider = ({ children }) => {
  return <div className="relative inline-block text-left">{children}</div>;
};

const Tooltip = ({ children, open, defaultOpen }) => {
  const [isOpen, setIsOpen] = React.useState(open || defaultOpen || false);
  
  React.useEffect(() => {
    if (open !== undefined) {
      setIsOpen(open);
    }
  }, [open]);

  return (
    <div 
      className="relative inline-block"
      onMouseEnter={() => setIsOpen(true)}
      onMouseLeave={() => setIsOpen(false)}
    >
      {children}
    </div>
  );
};

const TooltipTrigger = React.forwardRef(({ className, children, ...props }, ref) => {
  return (
    <button
      ref={ref}
      className={cn(className)}
      {...props}
    >
      {children}
    </button>
  );
});
TooltipTrigger.displayName = "TooltipTrigger";

const TooltipContent = React.forwardRef(({ className, sideOffset = 4, children, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "absolute z-50 overflow-hidden rounded-md bg-gray-900 px-3 py-1.5 text-xs text-white animate-in fade-in-0 zoom-in-95",
      className
    )}
    sideOffset={sideOffset}
    {...props}
  >
    {children}
  </div>
));
TooltipContent.displayName = "TooltipContent";

export { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger };