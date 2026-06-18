import React from 'react';

/**
 * Reusable statistics card used across all dashboard and report pages.
 *
 * @param {string}      title     - Card label (e.g. "إجمالي الفواتير")
 * @param {string|number} value   - Primary metric value
 * @param {string}      [sub]     - Optional sub-label shown below the value
 * @param {string}      [color]   - Tailwind color key: "blue"|"green"|"red"|"purple"|"orange"|"yellow" (default "blue")
 * @param {React.ReactNode} [icon] - SVG path string OR full <svg> element, shown in the colored circle
 */
const COLOR_MAP = {
  blue:   { bg: 'bg-gradient-to-br from-blue-50 to-blue-100',     border: 'border-blue-200',   text: 'text-blue-800',   value: 'text-blue-900',   sub: 'text-blue-600',   icon: 'bg-blue-200 text-blue-800'   },
  green:  { bg: 'bg-gradient-to-br from-green-50 to-green-100',   border: 'border-green-200',  text: 'text-green-800',  value: 'text-green-900',  sub: 'text-green-600',  icon: 'bg-green-200 text-green-800'  },
  red:    { bg: 'bg-gradient-to-br from-red-50 to-red-100',       border: 'border-red-200',    text: 'text-red-800',    value: 'text-red-900',    sub: 'text-red-600',    icon: 'bg-red-200 text-red-800'    },
  purple: { bg: 'bg-gradient-to-br from-purple-50 to-purple-100', border: 'border-purple-200', text: 'text-purple-800', value: 'text-purple-900', sub: 'text-purple-600', icon: 'bg-purple-200 text-purple-800' },
  orange: { bg: 'bg-gradient-to-br from-orange-50 to-orange-100', border: 'border-orange-200', text: 'text-orange-800', value: 'text-orange-900', sub: 'text-orange-600', icon: 'bg-orange-200 text-orange-800' },
  yellow: { bg: 'bg-gradient-to-br from-yellow-50 to-yellow-100', border: 'border-yellow-200', text: 'text-yellow-800', value: 'text-yellow-900', sub: 'text-yellow-600', icon: 'bg-yellow-200 text-yellow-800' },
  teal:   { bg: 'bg-gradient-to-br from-teal-50 to-teal-100',     border: 'border-teal-200',   text: 'text-teal-800',   value: 'text-teal-900',   sub: 'text-teal-600',   icon: 'bg-teal-200 text-teal-800'   },
};

const DEFAULT_ICON_PATH = 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z';

const StatCard = ({ title, value, sub, color = 'blue', iconPath, icon }) => {
  const c = COLOR_MAP[color] || COLOR_MAP.blue;

  return (
    <div className={`${c.bg} rounded-xl p-6 border ${c.border}`}>
      <div className="flex items-center justify-between">
        <div>
          <h3 className={`text-sm font-medium ${c.text} mb-1`}>{title}</h3>
          <p className={`text-2xl font-bold ${c.value}`}>{value}</p>
          {sub && <p className={`text-xs ${c.sub} mt-1`}>{sub}</p>}
        </div>
        <div className={`p-3 ${c.icon} rounded-full`}>
          {icon ?? (
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={iconPath || DEFAULT_ICON_PATH} />
            </svg>
          )}
        </div>
      </div>
    </div>
  );
};

export default StatCard;
