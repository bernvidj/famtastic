// ============================================
// FamTastic — Celebrations (confetti, sparkle, fireworks)
// Pure CSS animations, no external libs
// ============================================

import React, { useState, useEffect } from 'react';
import { C } from './data';

const CONFETTI_COLORS = [C.primary, C.secondary, C.accent, C.purple, '#EC4899', C.success];
const CONFETTI_SHAPES = ['square', 'circle', 'strip'];

// --- Confetti (chore completed) ---
function ConfettiPiece({ delay, color, shape, left }) {
  const size = shape === 'strip' ? { width: 4, height: 14 } : { width: 8, height: 8 };
  const radius = shape === 'circle' ? '50%' : shape === 'strip' ? 2 : 0;
  const rot = Math.random() * 360;
  const dur = 1.2 + Math.random() * 0.8;
  const drift = -30 + Math.random() * 60;

  return (
    <div style={{
      position: 'absolute',
      left: `${left}%`,
      top: -10,
      width: size.width,
      height: size.height,
      background: color,
      borderRadius: radius,
      opacity: 0,
      transform: `rotate(${rot}deg)`,
      animation: `confettiFall ${dur}s ease-out ${delay}s forwards`,
      '--drift': `${drift}px`,
    }} />
  );
}

export function Confetti({ active, onDone }) {
  const [pieces, setPieces] = useState([]);

  useEffect(() => {
    if (!active) { setPieces([]); return; }
    const p = [];
    for (let i = 0; i < 40; i++) {
      p.push({
        id: i,
        delay: Math.random() * 0.3,
        color: CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)],
        shape: CONFETTI_SHAPES[Math.floor(Math.random() * CONFETTI_SHAPES.length)],
        left: 10 + Math.random() * 80,
      });
    }
    setPieces(p);
    const timer = setTimeout(() => { setPieces([]); if (onDone) onDone(); }, 2500);
    return () => clearTimeout(timer);
  }, [active]);

  if (pieces.length === 0) return null;

  return (
    <div style={styles.overlay}>
      <style>{keyframes}</style>
      {pieces.map(p => (
        <ConfettiPiece key={p.id} {...p} />
      ))}
    </div>
  );
}

// --- Sparkle (money/savings) ---
function SparkleStar({ delay, left, top, size }) {
  return (
    <div style={{
      position: 'absolute',
      left: `${left}%`,
      top: `${top}%`,
      width: size,
      height: size,
      opacity: 0,
      animation: `sparkleGrow 0.8s ease-out ${delay}s forwards`,
    }}>
      <svg viewBox="0 0 24 24" width={size} height={size}>
        <path d="M12 0l3 9h9l-7.5 5.5L19.5 24 12 18l-7.5 6 3-9.5L0 9h9z"
          fill={C.accent} />
      </svg>
    </div>
  );
}

export function Sparkle({ active, onDone }) {
  const [stars, setStars] = useState([]);

  useEffect(() => {
    if (!active) { setStars([]); return; }
    const s = [];
    for (let i = 0; i < 12; i++) {
      s.push({
        id: i,
        delay: Math.random() * 0.5,
        left: 15 + Math.random() * 70,
        top: 20 + Math.random() * 60,
        size: 12 + Math.random() * 16,
      });
    }
    setStars(s);
    const timer = setTimeout(() => { setStars([]); if (onDone) onDone(); }, 2000);
    return () => clearTimeout(timer);
  }, [active]);

  if (stars.length === 0) return null;

  return (
    <div style={styles.overlay}>
      <style>{keyframes}</style>
      {stars.map(s => (
        <SparkleStar key={s.id} {...s} />
      ))}
    </div>
  );
}

// --- Fireworks (goal achieved, streak milestone) ---
function FireworkBurst({ delay, cx, cy, color }) {
  const particles = [];
  for (let i = 0; i < 8; i++) {
    const angle = (i / 8) * 360;
    const rad = (angle * Math.PI) / 180;
    const dx = Math.cos(rad) * 50;
    const dy = Math.sin(rad) * 50;
    particles.push(
      <div key={i} style={{
        position: 'absolute',
        left: cx,
        top: cy,
        width: 6,
        height: 6,
        borderRadius: '50%',
        background: color,
        opacity: 0,
        animation: `fireworkBurst 0.8s ease-out ${delay}s forwards`,
        '--dx': `${dx}px`,
        '--dy': `${dy}px`,
      }} />
    );
  }
  return <>{particles}</>;
}

export function Fireworks({ active, onDone }) {
  const [bursts, setBursts] = useState([]);

  useEffect(() => {
    if (!active) { setBursts([]); return; }
    const b = [
      { id: 0, delay: 0, cx: '30%', cy: '30%', color: C.primary },
      { id: 1, delay: 0.3, cx: '65%', cy: '25%', color: C.accent },
      { id: 2, delay: 0.5, cx: '50%', cy: '45%', color: C.purple },
      { id: 3, delay: 0.7, cx: '35%', cy: '55%', color: C.success },
      { id: 4, delay: 0.9, cx: '70%', cy: '50%', color: C.secondary },
    ];
    setBursts(b);
    const timer = setTimeout(() => { setBursts([]); if (onDone) onDone(); }, 2500);
    return () => clearTimeout(timer);
  }, [active]);

  if (bursts.length === 0) return null;

  return (
    <div style={styles.overlay}>
      <style>{keyframes}</style>
      {bursts.map(b => (
        <FireworkBurst key={b.id} {...b} />
      ))}
    </div>
  );
}

// --- Combined: pick the right celebration ---
export function Celebration({ type, active, onDone }) {
  if (!active) return null;
  if (type === 'confetti') return <Confetti active={active} onDone={onDone} />;
  if (type === 'sparkle') return <Sparkle active={active} onDone={onDone} />;
  if (type === 'fireworks') return <Fireworks active={active} onDone={onDone} />;
  return null;
}

// --- Styles ---
const styles = {
  overlay: {
    position: 'fixed',
    inset: 0,
    pointerEvents: 'none',
    zIndex: 500,
    overflow: 'hidden',
  },
};

// --- CSS Keyframes ---
const keyframes = `
@keyframes confettiFall {
  0% {
    opacity: 1;
    transform: translateY(0) translateX(0) rotate(0deg) scale(1);
  }
  100% {
    opacity: 0;
    transform: translateY(85vh) translateX(var(--drift)) rotate(720deg) scale(0.5);
  }
}

@keyframes sparkleGrow {
  0% {
    opacity: 0;
    transform: scale(0) rotate(0deg);
  }
  50% {
    opacity: 1;
    transform: scale(1.3) rotate(180deg);
  }
  100% {
    opacity: 0;
    transform: scale(0.5) rotate(360deg);
  }
}

@keyframes fireworkBurst {
  0% {
    opacity: 1;
    transform: translate(0, 0) scale(1);
  }
  100% {
    opacity: 0;
    transform: translate(var(--dx), var(--dy)) scale(0.3);
  }
}
`;
