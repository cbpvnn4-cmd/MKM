import React from 'react';

export const Input = ({
  type = 'text',
  className = '',
  placeholder,
  value,
  onChange,
  name,
  id,
  required = false,
  disabled = false,
  ...rest
}) => {
  const classes = `flex h-10 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm ring-offset-white file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-gray-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:border-primary-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 transition-all duration-200 hover:border-gray-400 ${className}`;

  return (
    <input
      type={type}
      className={classes}
      placeholder={placeholder}
      value={value}
      onChange={onChange}
      name={name}
      id={id}
      required={required}
      disabled={disabled}
      {...rest}
    />
  );
};
