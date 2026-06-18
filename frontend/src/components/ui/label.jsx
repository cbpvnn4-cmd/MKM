import React from 'react';

export const Label = ({ children, htmlFor, className = '' }) => {
  const classes = `text-sm font-medium leading-none text-gray-700 peer-disabled:cursor-not-allowed peer-disabled:opacity-70 ${className}`;

  return (
    <label htmlFor={htmlFor} className={classes}>
      {children}
    </label>
  );
};