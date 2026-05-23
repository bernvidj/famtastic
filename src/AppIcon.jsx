// FamTastic — Shared AppIcon (same art as Login)
import React from 'react';

export function AppIcon({ size = 88 }) {
  return (
    <svg viewBox="0 0 512 512" width={size} height={size} xmlns="http://www.w3.org/2000/svg"
      style={{ borderRadius: size * 0.225, flexShrink: 0 }}>
      <rect width="512" height="512" rx="115" fill="#FFE8C2" />
      <path d="M 200 40 Q 360 0, 410 140 Q 450 260, 320 305 Q 185 345, 130 225 Q 80 115, 200 40 Z" fill="#3CB4A6" />
      <path d="M 310 80 Q 460 60, 500 200 Q 520 310, 420 360 Q 330 395, 290 300 Q 255 210, 310 80 Z" fill="#A8E6DF" />
      <path d="M 40 195 Q 115 80, 255 135 Q 355 175, 325 305 Q 295 420, 155 440 Q 25 450, 10 320 Q -5 215, 40 195 Z" fill="#FFA071" />
      <path d="M 215 250 Q 375 195, 468 318 Q 535 420, 420 478 Q 300 535, 190 468 Q 90 405, 120 318 Q 148 250, 215 250 Z" fill="#FF7A59" />
      <circle cx="308" cy="375" r="28" fill="rgba(255,255,255,0.9)" />
    </svg>
  );
}
