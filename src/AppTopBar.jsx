// ============================================
// FamTastic — AppTopBar
// Persistent topbar: sidtitel + 🏠 📅 ⚙️
// ============================================

import React from 'react';
import { Home, CalendarDays, Settings, Trophy } from 'lucide-react';
import { C, F, TOPBAR_H } from './data';

const PAGE_TITLES = {
  home:         'Hem',
  schedule:     'Schema',
  chores:       'Sysslor & Pengar',
  meals:        'Mat & Handla',
  location:     'Plats',
  chat:         'Chatt',
  settings:     'Inställningar',
  achievements: 'Achievements',
};

const TOP_NAV = [
  { id: 'home',     Icon: Home },
  { id: 'schedule', Icon: CalendarDays },
  { id: 'settings', Icon: Settings },
];

export function AppTopBar({ page, onNavigate, newAchievementsCount = 0 }) {
  const hasNew = newAchievementsCount > 0;
  return (
    <div style={{ ...styles.bar, height: TOPBAR_H }}>
      <span style={styles.title}>{PAGE_TITLES[page] || ''}</span>
      <div style={styles.icons}>
        {/* Trophy — always first, turns gold on new achievements */}
        <button
          onClick={() => onNavigate('achievements')}
          style={{
            ...styles.iconBtn,
            background: page === 'achievements' ? C.primaryLight : 'transparent',
            position: 'relative',
          }}
        >
          <Trophy
            size={20}
            color={hasNew ? '#F59E0B' : page === 'achievements' ? C.primary : C.textMuted}
            strokeWidth={hasNew || page === 'achievements' ? 2.5 : 2}
            style={{ transform: hasNew ? 'scale(1.15)' : 'scale(1)', transition: 'transform 0.2s' }}
          />
          {hasNew && (
            <span style={styles.badge}>{newAchievementsCount > 9 ? '9+' : newAchievementsCount}</span>
          )}
        </button>

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
  badge: {
    position: 'absolute', top: 2, right: 2,
    background: '#F59E0B', color: '#fff',
    fontSize: 9, fontWeight: 800, fontFamily: F.heading,
    width: 14, height: 14, borderRadius: 7,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    lineHeight: 1,
  },
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
