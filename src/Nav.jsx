// ============================================
// FamTastic — Bottom Navigation
// ============================================

import React from 'react';
import { Home, GraduationCap, CheckSquare, PiggyBank, UtensilsCrossed, ShoppingCart, Settings } from 'lucide-react';
import { C, F } from './data';

const NAV_ITEMS = [
  { id: 'home',     label: 'Hem',     icon: Home },
  { id: 'schedule', label: 'Schema',  icon: GraduationCap },
  { id: 'chores',   label: 'Sysslor', icon: CheckSquare },
  { id: 'money',    label: 'Pengar',  icon: PiggyBank },
  { id: 'meals',    label: 'Mat',     icon: UtensilsCrossed },
  { id: 'shopping', label: 'Handla',  icon: ShoppingCart },
  { id: 'settings', label: 'Mer',     icon: Settings },
];

export function Nav({ active, onNavigate }) {
  return (
    <nav style={styles.nav}>
      {NAV_ITEMS.map(item => {
        const Icon     = item.icon;
        const isActive = active === item.id;
        return (
          <button
            key={item.id}
            onClick={() => onNavigate(item.id)}
            style={styles.navBtn}
          >
            <div style={{
              ...styles.iconWrap,
              background:    isActive ? C.primary : 'transparent',
              borderRadius:  isActive ? 12 : 0,
              padding:       isActive ? '5px 14px' : '5px 6px',
              transition:    'all 0.18s ease',
            }}>
              <Icon
                size={22}
                strokeWidth={isActive ? 2.5 : 2}
                color={isActive ? '#fff' : C.textMuted}
              />
            </div>
            <span style={{
              ...styles.navLabel,
              color:      isActive ? C.primary : C.textMuted,
              fontWeight: isActive ? F.weights.bold : F.weights.normal,
            }}>
              {item.label}
            </span>
          </button>
        );
      })}
    </nav>
  );
}

const styles = {
  nav: {
    position: 'fixed',
    bottom: 0,
    left: 0,
    right: 0,
    display: 'flex',
    justifyContent: 'space-around',
    alignItems: 'center',
    background: C.bgCard,
    borderTop: `1.5px solid ${C.borderLight}`,
    padding: '4px 0 env(safe-area-inset-bottom, 8px)',
    zIndex: 100,
    boxShadow: '0 -2px 12px rgba(0,0,0,0.06)',
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
