import React from 'react';
import { Tooltip } from 'recharts';

export const ChartContainer = ({ children, config, className = '' }) => {
  return (
    <div
      className={`aspect-auto w-full ${className}`}
      style={{
        '--chart-1': 'hsl(12, 76%, 61%)',
        '--chart-2': 'hsl(173, 58%, 39%)',
        '--chart-3': 'hsl(197, 37%, 24%)',
        '--chart-4': 'hsl(43, 74%, 66%)',
        '--chart-5': 'hsl(27, 87%, 67%)',
        '--background': '#ffffff',
        '--foreground': '#0f172a',
        '--muted-foreground': '#64748b',
        '--color-desktop': 'hsl(173, 58%, 39%)',
        '--color-label': 'hsl(0, 0%, 100%)'
      }}
    >
      {children}
    </div>
  );
};

export const ChartTooltip = Tooltip;

export const ChartTooltipContent = React.forwardRef(({ active, payload, label, indicator = 'dot', hideLabel = false, hideIndicator = false, className = '', ...props }, ref) => {
  if (!active || !payload?.length) {
    return null;
  }

  return (
    <div
      ref={ref}
      className={`grid min-w-32 items-start gap-1.5 rounded-lg border bg-white px-2.5 py-1.5 text-xs shadow-xl ${className}`}
      {...props}
    >
      {!hideLabel && (
        <p className="font-medium">{label}</p>
      )}
      <div className="grid gap-1.5">
        {payload.map((item, index) => {
          const indicatorColor = item.color || item.fill || '#8884d8';

          return (
            <div key={index} className="flex w-full items-stretch gap-2 [&>svg]:h-2.5 [&>svg]:w-2.5 [&>svg]:text-muted-foreground">
              {!hideIndicator && (
                <div
                  className="shrink-0 rounded-[2px] border-[--color-border] bg-[--color-bg]"
                  style={{
                    '--color-bg': indicatorColor,
                    '--color-border': indicatorColor,
                    width: '8px',
                    height: '8px'
                  }}
                />
              )}
              <div className="flex flex-1 justify-between leading-none">
                <div className="grid gap-1.5">
                  <span className="text-gray-600">
                    {item.dataKey || item.name}
                  </span>
                </div>
                <span className="font-mono font-medium tabular-nums text-gray-900">
                  {item.value}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
});

ChartTooltipContent.displayName = 'ChartTooltipContent';

export const ChartConfig = {};