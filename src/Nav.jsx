// ============================================
// FamTastic — Bottom Navigation
// Features-only nav + overflow Mer-sheet
// ============================================

import React, { useState } from 'react';
import { CheckSquare, UtensilsCrossed, CalendarDays, MoreHorizontal } from 'lucide-react';
import { C, F } from './data';

const BASE_ITEMS = [
  { id: 'chores',   label: 'Sysslor', icon: CheckSquare },
  { id: 'schedule', label: 'Schema',  icon: CalendarDays },
  { id: 'meals',    label: 'Mat',     icon: UtensilsCrossed },
];

const MAX_VISIBLE = 5;

function MerSheet({ items, active, onNavigate, onClose }) {
  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.3)', zIndex: 90 }} />
      <div style={sheetStyles.sheet}>
        <div style={sheetStyles.handle} />
        <h3 style={sheetStyles.heading}>Fler funktioner</h3>
        <div style={sheetStyles.grid}>
          {items.map(item => {
            const Icon     = item.icon;
            const isActive = active === item.id;
            return (
              <button key={item.id} onClick={() => onNavigate(item.id)} style={{
                ...sheetStyles.gridBtn,
                background:   isActive ? C.primaryLight : C.bg,
                border:       `1.5px solid ${isActive ? C.primary : C.borderLight}`,
              }}>
                <div style={{
                  ...sheetStyles.gridIcon,
                  background: isActive ? C.primary : C.bgCard,
                  border:     `1px solid ${isActive ? C.primary : C.border}`,
                }}>
                  {Icon
                    ? <Icon size={22} color={isActive ? '#fff' : C.textMuted} strokeWidth={2} />
                    : <span style={{ fontSize: 22 }}>{item.emoji}</span>
                  }
                </div>
                <span style={{ ...sheetStyles.gridLabel, color: isActive ? C.primary : C.textMuted }}>
                  {item.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </>
  );
}

export function Nav({ active, onNavigate, locationEnabled, chatEnabled }) {
  const [showMer, setShowMer] = useState(false);

  const allItems = [
    ...BASE_ITEMS,
    ...(chatEnabled     ? [{ id: 'chat',     label: 'Chatt', emoji: '💬' }] : []),
    ...(locationEnabled ? [{ id: 'location', label: 'Plats', emoji: '📍' }] : []),
  ];

  const hasOverflow    = allItems.length >= MAX_VISIBLE;
  const visibleItems   = hasOverflow ? allItems.slice(0, MAX_VISIBLE - 1) : allItems;
  const overflowItems  = hasOverflow ? allItems.slice(MAX_VISIBLE - 1)   : [];
  const overflowActive = overflowItems.some(i => i.id === active);

  function renderBtn(item) {
    const Icon     = item.icon;
    const isActive = active === item.id;
    return (
      <button key={item.id} onClick={() => { onNavigate(item.id); setShowMer(false); }} style={styles.navBtn}>
        <div style={{
          ...styles.iconWrap,
          background:   isActive ? C.primary : 'transparent',
          borderRadius: isActive ? 12 : 0,
          padding:      isActive ? '5px 14px' : '5px 6px',
          transition:   'all 0.18s ease',
        }}>
          {Icon
            ? <Icon size={22} strokeWidth={isActive ? 2.5 : 2} color={isActive ? '#fff' : C.textMuted} />
            : <span style={{ fontSize: 20, lineHeight: 1 }}>{item.emoji}</span>
          }
        </div>
        <span style={{ ...styles.navLabel, color: isActive ? C.primary : C.textMuted, fontWeight: isActive ? F.weights.bold : F.weights.normal }}>
          {item.label}
        </span>
      </button>
    );
  }

  return (
    <>
      {showMer && (
        <MerSheet
          items={overflowItems}
          active={active}
          onNavigate={(id) => { onNavigate(id); setShowMer(false); }}
          onClose={() => setShowMer(false)}
        />
      )}
      <nav style={styles.nav}>
        {visibleItems.map(item => renderBtn(item))}

        {hasOverflow && (
          <button onClick={() => setShowMer(s => !s)} style={styles.navBtn}>
            <div style={{
              ...styles.iconWrap,
              background:   overflowActive || showMer ? C.primary : 'transparent',
              borderRadius: overflowActive || showMer ? 12 : 0,
              padding:      overflowActive || showMer ? '5px 14px' : '5px 6px',
              transition:   'all 0.18s ease',
            }}>
              <MoreHorizontal size={22} strokeWidth={2} color={overflowActive || showMer ? '#fff' : C.textMuted} />
            </div>
            <span style={{ ...styles.navLabel, color: overflowActive || showMer ? C.primary : C.textMuted, fontWeight: overflowActive || showMer ? F.weights.bold : F.weights.normal }}>
              Mer
            </span>
          </button>
        )}
      </nav>
    </>
  );
}

const styles = {
  nav: {
    position: 'fixed',
    bottom: 12,
    left: 16,
    right: 16,
    display: 'flex',
    justifyContent: 'space-around',
    alignItems: 'center',
    background: 'rgba(255,251,245,0.88)',
    borderRadius: 24,
    backdropFilter: 'blur(20px)',
    WebkitBackdropFilter: 'blur(20px)',
    paddingTop: 6,
    paddingLeft: 4,
    paddingRight: 4,
    paddingBottom: 'max(6px, env(safe-area-inset-bottom, 6px))',
    zIndex: 100,
    boxShadow: '0 4px 24px rgba(0,0,0,0.12), 0 1px 0 rgba(255,255,255,0.6) inset, 0 0 0 1px rgba(0,0,0,0.04)',
  },
  navBtn: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 2,
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    padding: '2px 2px',
    minWidth: 44,
    fontFamily: F.heading,
  },
  iconWrap: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  navLabel: {
    fontSize: F.sizes.xs,
    fontFamily: F.heading,
  },
};

const sheetStyles = {
  sheet: {
    position: 'fixed',
    bottom: 0, left: 0, right: 0,
    background: '#fff',
    borderRadius: '20px 20px 0 0',
    padding: '16px 20px',
    paddingBottom: 'calc(110px + env(safe-area-inset-bottom, 0px))',
    zIndex: 95,
    boxShadow: '0 -4px 24px rgba(0,0,0,0.14)',
  },
  handle: {
    width: 36, height: 4, background: C.border,
    borderRadius: 2, margin: '0 auto 20px',
  },
  heading: {
    fontFamily: F.heading, fontWeight: F.weights.extra,
    fontSize: F.sizes.md, color: C.text,
    margin: '0 0 16px', textAlign: 'center',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, 1fr)',
    gap: 10,
  },
  gridBtn: {
    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
    borderRadius: 14, padding: '12px 6px',
    cursor: 'pointer', fontFamily: F.heading,
  },
  gridIcon: {
    width: 44, height: 44, borderRadius: 14,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  gridLabel: {
    fontSize: F.sizes.xs, fontWeight: F.weights.bold,
  },
};
