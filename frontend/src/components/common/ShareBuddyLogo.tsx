/**
 * ShareBuddyLogo - SVG logo component for reuse
 */
import React from 'react';

const ShareBuddyLogo: React.FC<{ width?: number; height?: number; className?: string; style?: React.CSSProperties }> = ({ width = 28, height = 28, className, style }) => (
  <svg
    width={width}
    height={height}
    viewBox="0 0 32 32"
    fill="none"
    aria-hidden="true"
    className={className}
    style={style}
  >
    <defs>
      <linearGradient id="bookPurple" x1="2" y1="5" x2="14" y2="27" gradientUnits="userSpaceOnUse">
        <stop stopColor="#A084FF" />
        <stop offset="1" stopColor="#7B61FF" />
      </linearGradient>
      <linearGradient id="bookCyan" x1="18" y1="5" x2="30" y2="27" gradientUnits="userSpaceOnUse">
        <stop stopColor="#00E6E6" />
        <stop offset="1" stopColor="#00B2B2" />
      </linearGradient>
      <radialGradient id="bookYellow" cx="50%" cy="50%" r="50%">
        <stop offset="0%" stopColor="#FFDCA8" />
        <stop offset="100%" stopColor="#FFB86B" />
      </radialGradient>
      <filter id="shadow" x="-10%" y="-10%" width="120%" height="120%">
        <feDropShadow dx="0" dy="2" stdDeviation="2" floodColor="#000" floodOpacity="0.18" />
      </filter>
    </defs>
    <rect x="2" y="5" width="12" height="22" rx="3" fill="url(#bookPurple)" filter="url(#shadow)" />
    <rect x="18" y="5" width="12" height="22" rx="3" fill="url(#bookCyan)" filter="url(#shadow)" />
    <rect x="8" y="8" width="16" height="16" rx="2" fill="url(#bookYellow)" filter="url(#shadow)" />
    <rect x="12" y="12" width="8" height="8" rx="1" fill="#fff" opacity="0.95" filter="url(#shadow)" />
    <rect x="12" y="12" width="8" height="8" rx="1" fill="#fff" opacity="0.3" />
  </svg>
);

export default ShareBuddyLogo;
