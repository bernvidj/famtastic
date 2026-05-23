// FamTastic — Shared BgShapes (position:fixed blobs, one per view variant)
import React from 'react';

const COLORS = {
  home:     ['#3CB4A6', '#A8E6DF', '#FF7A59', '#FFA071'],
  chores:   ['#8B5CF6', '#C4B5FD', '#FBBF24', '#FF7A59'],
  money:    ['#3CB4A6', '#A8E6DF', '#FF7A59', '#FBBF24'],
  meals:    ['#22C55E', '#BBF7D0', '#F59E0B', '#FED7AA'],
  shopping: ['#3B82F6', '#BFDBFE', '#EC4899', '#FBCFE8'],
  schedule: ['#3CB4A6', '#8B5CF6', '#C4B5FD', '#FF7A59'],
};

export function BgShapes({ variant = 'home' }) {
  const [c1, c2, c3, c4] = COLORS[variant] || COLORS.home;
  return (
    <svg
      style={{
        position: 'fixed', top: 0, left: 0,
        width: '100vw', height: '100vh',
        opacity: 0.18, pointerEvents: 'none', zIndex: 0,
      }}
      viewBox="0 0 400 850"
      xmlns="http://www.w3.org/2000/svg"
      preserveAspectRatio="xMidYMid slice"
    >
      <path d="M -40 -30 Q 100 -60, 180 80 Q 230 180, 120 240 Q 20 290, -30 180 Q -80 80, -40 -30 Z" fill={c1} />
      <path d="M 300 -20 Q 430 10, 440 140 Q 448 230, 350 260 Q 260 285, 230 190 Q 205 105, 300 -20 Z" fill={c2} />
      <path d="M 220 640 Q 400 600, 440 720 Q 462 800, 320 810 Q 180 818, 160 720 Q 145 640, 220 640 Z" fill={c3} />
      <path d="M -50 700 Q 50 650, 130 710 Q 185 755, 140 820 Q 75 855, -15 820 Q -90 790, -50 700 Z" fill={c4} />
    </svg>
  );
}
