import React, { useState, useEffect } from 'react';
import { C, F, TOPBAR_H } from './data';

export function InAppToast() {
  const [toast,   setToast]   = useState(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;

    let hideTimer = null;
    let clearTimer = null;

    function handler(event) {
      if (event.data?.type !== 'PUSH_RECEIVED') return;
      clearTimeout(hideTimer);
      clearTimeout(clearTimer);
      setToast({ title: event.data.title, body: event.data.body });
      setVisible(true);
      hideTimer  = setTimeout(() => setVisible(false), 4000);
      clearTimer = setTimeout(() => setToast(null), 4400);
    }

    navigator.serviceWorker.addEventListener('message', handler);
    return () => {
      navigator.serviceWorker.removeEventListener('message', handler);
      clearTimeout(hideTimer);
      clearTimeout(clearTimer);
    };
  }, []);

  if (!toast) return null;

  return (
    <div style={{
      position: 'fixed',
      top: TOPBAR_H + 8,
      left: 16, right: 16,
      zIndex: 9999,
      background: '#1C1C1E',
      borderRadius: 16,
      padding: '12px 14px',
      display: 'flex', alignItems: 'center', gap: 12,
      boxShadow: '0 8px 32px rgba(0,0,0,0.28)',
      transform: visible ? 'translateY(0)' : 'translateY(-120px)',
      opacity: visible ? 1 : 0,
      transition: 'transform 0.3s cubic-bezier(0.34,1.56,0.64,1), opacity 0.25s ease',
      pointerEvents: visible ? 'auto' : 'none',
    }}>
      <div style={{
        width: 36, height: 36, borderRadius: 10,
        background: C.primary,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 18, flexShrink: 0,
      }}>
        💬
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: F.sizes.sm, fontWeight: F.weights.bold, fontFamily: F.heading, color: '#fff', marginBottom: 2 }}>
          {toast.title}
        </div>
        <div style={{ fontSize: F.sizes.xs, fontFamily: F.body, color: 'rgba(255,255,255,0.65)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {toast.body}
        </div>
      </div>
      <button
        onClick={() => { setVisible(false); setTimeout(() => setToast(null), 300); }}
        style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', cursor: 'pointer', fontSize: 16, padding: '4px 6px', flexShrink: 0, lineHeight: 1 }}
      >
        ✕
      </button>
    </div>
  );
}
