import React from 'react';

export const Progress = ({ value = 0, className = '' }) => {
  const percentage = Math.min(Math.max(value, 0), 100);

  return (
    <div className={`relative h-4 w-full overflow-hidden rounded-full bg-gray-200 ${className}`}>
      <div
        className="h-full bg-blue-600 transition-all"
        style={{ width: `${percentage}%` }}
      />
    </div>
  );
};