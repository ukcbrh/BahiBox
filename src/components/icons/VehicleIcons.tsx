import React from 'react';

interface IconProps {
  size?: number;
  className?: string;
}

export function MotorcycleIcon({ size = 24, className = '' }: IconProps) {
  return (
    <svg 
      width={size} height={size} viewBox="0 0 24 24" 
      fill="none" stroke="currentColor" strokeWidth="2" 
      strokeLinecap="round" strokeLinejoin="round" 
      className={className}
    >
      <circle cx="5" cy="17" r="3" />
      <circle cx="19" cy="17" r="3" />
      <path d="M5 17h3.5l1.5-5h4l2.5 5H19" />
      <path d="M10 12l1.5-3.5H15" />
      <path d="M13.5 8.5h2.5" />
    </svg>
  );
}

export function AutoRickshawIcon({ size = 24, className = '' }: IconProps) {
  return (
    <svg 
      width={size} height={size} viewBox="0 0 24 24" 
      fill="none" stroke="currentColor" strokeWidth="2" 
      strokeLinecap="round" strokeLinejoin="round" 
      className={className}
    >
      <path d="M4 17.5h1" />
      <path d="M9 17.5h6" />
      <path d="M19 17.5h1" />
      <circle cx="7" cy="17.5" r="2" />
      <circle cx="17" cy="17.5" r="2" />
      <path d="M5.5 15.5V8a1 1 0 0 1 1-1h7l4.5 5.5v3" />
      <path d="M6.5 7V5h4v2" />
    </svg>
  );
}
