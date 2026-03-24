import React from 'react';

export function FaceGuideOverlay() {
  return (
    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
      <svg width="100%" height="100%" viewBox="0 0 300 400" className="max-w-[240px] max-h-[320px] opacity-40">
        <defs>
          <mask id="face-cutout">
            <rect width="300" height="400" fill="white" />
            <ellipse cx="150" cy="185" rx="95" ry="130" fill="black" />
          </mask>
        </defs>
        <rect width="300" height="400" fill="hsl(var(--foreground))" mask="url(#face-cutout)" opacity="0.35" rx="16" />
        <ellipse
          cx="150"
          cy="185"
          rx="95"
          ry="130"
          fill="none"
          stroke="hsl(35, 72%, 56%)"
          strokeWidth="2.5"
          strokeDasharray="8 4"
        />
      </svg>
    </div>
  );
}
