import React from 'react';

export const Select = ({ children, value, onChange, name, className = '', multiple = false, ...rest }) => {
  const heightClass = multiple ? 'min-h-[130px] py-3' : 'h-10 py-2';
  const classes = `flex ${heightClass} w-full items-center justify-between rounded-md border border-gray-300 bg-white px-3 text-sm ring-offset-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${className}`;

  return (
    <select
      className={classes}
      value={value}
      onChange={onChange}
      name={name}
      multiple={multiple}
      {...rest}
    >
      {children}
    </select>
  );
};

export const SelectContent = ({ children }) => children;
export const SelectItem = ({ children, value }) => (
  <option value={value}>{children}</option>
);
export const SelectTrigger = ({ children, className = '' }) => children;
export const SelectValue = ({ placeholder }) => null;
