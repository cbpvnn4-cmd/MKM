import React from 'react';
import { cn } from '../../lib/utils';

const Collapsible = ({ open, onOpenChange, children, ...props }) => {
  return (
    <div data-state={open ? "open" : "closed"} {...props}>
      {children}
    </div>
  );
};

const CollapsibleTrigger = React.forwardRef(({ className, children, ...props }, ref) => (
  <button
    ref={ref}
    className={cn(className)}
    data-state={props.open ? "open" : "closed"}
    {...props}
  >
    {children}
  </button>
));
CollapsibleTrigger.displayName = "CollapsibleTrigger";

const CollapsibleContent = React.forwardRef(({ className, children, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "overflow-hidden transition-all duration-200 ease-in-out data-[state=closed]:animate-collapsible-up data-[state=open]:animate-collapsible-down",
      className
    )}
    data-state={props.open ? "open" : "closed"}
    {...props}
  >
    {children}
  </div>
));
CollapsibleContent.displayName = "CollapsibleContent";

export { Collapsible, CollapsibleTrigger, CollapsibleContent };