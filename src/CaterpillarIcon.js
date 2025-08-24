// src/CaterpillarIcon.js

import React from 'react';

const CaterpillarIcon = ({ size = 24, color = 'currentColor', ...props }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke={color}
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    {...props}
  >
    <path d="M10 20c-1.7 0-3-1.3-3-3s1.3-3 3-3h8c1.7 0 3 1.3 3 3s-1.3 3-3 3" />
    <path d="M4 14c-1.7 0-3-1.3-3-3s1.3-3 3-3h10c1.7 0 3 1.3 3 3s-1.3 3-3 3" />
    <path d="M6 8c-1.7 0-3-1.3-3-3s1.3-3 3-3h4c1.7 0 3 1.3 3 3s-1.3 3-3 3" />
    <path d="M18 4a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z" />
  </svg>
);

export default CaterpillarIcon;