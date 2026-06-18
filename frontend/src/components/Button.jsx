import React from 'react';

export const Button = ({ children, onClick, variant = 'primary', size = 'medium', disabled = false }) => {
  const baseClasses = 'px-4 py-2 rounded font-medium focus:outline-none focus:ring-2 transition-colors';
  
  const variantClasses = {
    primary: 'bg-blue-500 text-white hover:bg-blue-600 focus:ring-blue-300 disabled:bg-blue-300 disabled:cursor-not-allowed',
    secondary: 'bg-gray-500 text-white hover:bg-gray-600 focus:ring-gray-300 disabled:bg-gray-300 disabled:cursor-not-allowed',
  };
  
  const sizeClasses = {
    small: 'px-3 py-1 text-sm',
    medium: 'px-4 py-2',
    large: 'px-6 py-3 text-lg',
  };
  
  const disabledClass = disabled ? 'opacity-50 cursor-not-allowed' : '';
  
  return (
    <button 
      className={`${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} ${disabledClass}`}
      onClick={onClick}
      disabled={disabled}
    >
      {children}
    </button>
  );
};