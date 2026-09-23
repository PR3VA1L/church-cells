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
      {/* Vertical line - longer at bottom */}
      <path d="M12 2v20" />
      {/* Horizontal line - shorter, higher up */}
      <path d="M7 8h10" />
    </svg>
  );
};

export default LatinCross;
