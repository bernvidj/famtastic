// ============================================
// FamTastic — AchievementsView
// Minecraft-style: all achievements visible,
// locked ones show hint so you know what to do
// ============================================

import React from 'react';
import { C, F, TOPBAR_H } from '../data';
import {
  ACHIEVEMENTS, CATEGORIES, ACHIEVEMENT_MAP,
  RARITY_COLORS, RARITY_LABELS, TOTAL_ACHIEVEMENTS,
} from './achievementDefs';

function AchievementCard({ def, unlockedAt }) {
  const isUnlocked = !!unlockedAt;
  const rarityColor = RARITY_COLORS[def.rarity];

  return (
    <div style={{
      ...styles.card,
      opacity:    isUnlocked ? 1 : 0.55,
      borderColor: isUnlocked ? rarityColor : C.borderLight,
      background: isUnlocked ? '#fff' : C.bg,
    }}>
      <div style={{
        ...styles.iconWrap,
        background: isUnlocked ? `${rarityColor}18` : C.borderLight,
        filter: isUnlocked ? 'none' : 'grayscale(1)',
      }}>
        <span style={{ fontSize: 26 }}>{def.icon}</span>
      </div>

      <div style={styles.cardBody}>
        <div style={styles.cardTop}>
          <span style={{ ...styles.cardTitle, color: isUnlocked ? C.text : C.textMuted }}>
            {def.title}
          </span>
          <span style={{ ...styles.rarityBadge, color: rarityColor, borderColor: `${rarityColor}40`, background: `${rarityColor}12` }}>
            {RARITY_LABELS[def.rarity]}
          </span>
        </div>
        <p style={styles.cardDesc}>{isUnlocked ? def.desc : def.hint}</p>
        {isUnlocked && (
          <span style={styles.unlockedAt}>
            ✓ Uppnådd {new Date(unlockedAt).toLocaleDateString('sv-SE', { month: 'short', day: 'numeric' })}
          </span>
        )}
      </div>
    </div>
  );
}

export function AchievementsView({ unlocked, onMount }) {
  // Tell parent to clear the "new" badge
  React.useEffect(() => { onMount?.(); }, []);

  const totalUnlocked = Object.keys(unlocked).length;

  return (
    <div style={styles.page}>
      <div style={styles.header}>
        <h1 style={styles.title}>🏆 Achievements</h1>
        <div style={styles.progress}>
          <div style={styles.progressBar}>
            <div style={{
              ...styles.progressFill,
              width: `${Math.round((totalUnlocked / TOTAL_ACHIEVEMENTS) * 100)}%`,
            }} />
          </div>
          <span style={styles.progressText}>
            {totalUnlocked} / {TOTAL_ACHIEVEMENTS}
          </span>
        </div>
      </div>

      <div style={styles.content}>
        {CATEGORIES.map(cat => {
          const catAchievements = ACHIEVEMENTS.filter(a => a.category === cat.id);
          const catUnlocked = catAchievements.filter(a => unlocked[a.id]).length;
          return (
            <div key={cat.id} style={styles.section}>
              <div style={styles.sectionHeader}>
                <span style={styles.sectionLabel}>{cat.label}</span>
                <span style={styles.sectionCount}>{catUnlocked}/{catAchievements.length}</span>
              </div>
              {catAchievements.map(def => (
                <AchievementCard
                  key={def.id}
                  def={def}
                  unlockedAt={unlocked[def.id]}
                />
              ))}
            </div>
          );
        })}
      </div>

      <div style={{ height: 80 }} />
    </div>
  );
}

const styles = {
  page: { minHeight: '100vh', background: C.bg, fontFamily: F.body },
  header: {
    position: 'sticky', top: TOPBAR_H, zIndex: 10,
    background: 'rgba(255,251,245,0.94)',
    backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)',
    borderBottom: `1px solid ${C.borderLight}`,
    padding: '16px 20px 14px',
  },
  title: {
    fontFamily: F.heading, fontSize: F.sizes.xl, fontWeight: 800,
    color: C.text, margin: '0 0 10px',
  },
  progress: {
    display: 'flex', alignItems: 'center', gap: 10,
  },
  progressBar: {
    flex: 1, height: 8, borderRadius: 4,
    background: C.borderLight, overflow: 'hidden',
  },
  progressFill: {
    height: '100%', borderRadius: 4,
    background: 'linear-gradient(90deg, #F59E0B, #FBBF24)',
    transition: 'width 0.4s ease',
  },
  progressText: {
    fontFamily: F.heading, fontSize: F.sizes.xs,
    fontWeight: 700, color: C.textMuted, flexShrink: 0,
  },
  content: { padding: '12px 16px 0' },
  section: { marginBottom: 20 },
  sectionHeader: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    marginBottom: 8,
  },
  sectionLabel: {
    fontFamily: F.heading, fontSize: F.sizes.sm, fontWeight: 800,
    color: C.text,
  },
  sectionCount: {
    fontFamily: F.heading, fontSize: F.sizes.xs, fontWeight: 700,
    color: C.textMuted,
  },
  card: {
    display: 'flex', alignItems: 'flex-start', gap: 12,
    padding: '12px 14px', borderRadius: 14, marginBottom: 8,
    border: '1.5px solid',
    transition: 'opacity 0.2s',
  },
  iconWrap: {
    width: 52, height: 52, borderRadius: 14, flexShrink: 0,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  cardBody: { flex: 1, minWidth: 0 },
  cardTop: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    gap: 6, marginBottom: 3,
  },
  cardTitle: {
    fontFamily: F.heading, fontSize: F.sizes.sm, fontWeight: 700,
    flex: 1,
  },
  rarityBadge: {
    fontFamily: F.heading, fontSize: 10, fontWeight: 700,
    padding: '2px 7px', borderRadius: 6, border: '1px solid',
    flexShrink: 0,
  },
  cardDesc: {
    fontSize: F.sizes.xs, color: C.textMuted,
    margin: 0, lineHeight: 1.4,
    fontFamily: F.body,
  },
  unlockedAt: {
    display: 'inline-block', marginTop: 4,
    fontSize: 11, color: '#10B981',
    fontFamily: F.heading, fontWeight: 700,
  },
};
