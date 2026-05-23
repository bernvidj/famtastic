// ============================================
// FamTastic — AppTopBar
// Persistent topbar: sidtitel + 🏠 📅 ⚙️
// ============================================

import React from 'react';
import { Home, CalendarDays, Settings } from 'lucide-react';
import { C, F, TOPBAR_H } from './data';

const PAGE_TITLES = {
  home:     'Hem',
  schedule: 'Schema',
  chores:   'Sysslor & Pengar',
  meals:    'Mat & Handla',
  location: 'Plats',
  chat:     'Chatt',
  settings: 'Inställningar',
};

const TOP_NAV = [
  { id: 'home',     Icon: Home },
  { id: 'schedule', Icon: CalendarDays },
  { id: 'settings', Icon: Settings },
];

export function AppTopBar({ page, onNavigate }) {
  return (
    <div style={{ ...styles.bar, height: TOPBAR_H }}>
      <span style={styles.title}>{PAGE_TITLES[page] || ''}</span>
      <div style={styles.icons}>
        {TOP_NAV.map(({ id, Icon }) => {
          const active = page === id;
          return (
            <button
              key={id}
              onClick={() => onNavigate(id)}
              style={{ ...styles.iconBtn, background: active ? C.primaryLight : 'transparent' }}
            >
              <Icon size={20} color={active ? C.primary : C.textMuted} strokeWidth={active ? 2.5 : 2} />
            </button>
          );
        })}
      </div>
    </div>
  );
}

const styles = {
  bar: {
    position: 'fixed',
    top: 0, left: 0, right: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '0 10px 0 16px',
    background: 'rgba(255,251,245,0.94)',
    backdropFilter: 'blur(16px)',
    WebkitBackdropFilter: 'blur(16px)',
    borderBottom: `1px solid ${C.borderLight}`,
    zIndex: 150,
  },
  title: {
    fontFamily: F.heading,
    fontSize: F.sizes.md,
    fontWeight: F.weights.bold,
    color: C.text,
  },
  icons: {
    display: 'flex',
    gap: 2,
    alignItems: 'center',
  },
  iconBtn: {
    width: 36, height: 36, borderRadius: 10,
    border: 'none', cursor: 'pointer',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    transition: 'background 0.15s',
  },
};
