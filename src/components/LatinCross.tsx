import React from 'react';

const LatinCross = ({ size = 24, color = 'currentColor' }: { size?: number | string, color?: string }) => {
  return (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      width={size} 
      height={size} 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke={color} 
      strokeWidth="2.5" 
      strokeLinecap="round" 
      strokeLinejoin="round"
    >
      {/* Circle around the cross */}
      <circle cx="12" cy="12" r="10.5" />
      {/* Vertical line - longer at bottom */}
      <path d="M12 4v16" />
      {/* Horizontal line - shorter, higher up */}
      <path d="M8 9h8" />
    </svg>
  );
};

export default LatinCross;
