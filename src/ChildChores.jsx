// ============================================
// FamTastic — ChildChores (Duolingo-style chore list)
// Extracted from ChildApp
// ============================================

import React from 'react';
import { C, F, S } from './data';
import { CheckCircle, Star } from 'lucide-react';

export function ChildChores({
  member, todayChores, poolChores, completions,
  isCompleted, weekDone, weekTotal, toggleChore, claimPoolChore,
}) {
  const weekBonus = completions
    .filter(c => c.member_id === member.id)
    .reduce((sum, c) => sum + (c.points_earned || 0), 0);

  return (
    <div style={styles.content}>
      <h1 style={styles.pageTitle}>Mina sysslor</h1>
      <p style={styles.subtitle}>
        {completions.filter(c => c.member_id === member.id).length} gjorda denna vecka
        {weekBonus > 0 && ` · ${weekBonus} kr bonus`}
      </p>

      {todayChores.length === 0 && poolChores.length === 0 ? (
        <div style={S.emptyState}>
          <span style={{ fontSize: 48 }}>🎉</span>
          <p style={styles.emptyTitle}>Inga sysslor idag!</p>
        </div>
      ) : (
        <>
          {todayChores.map(chore => {
            const done = isCompleted(chore.id);
            const wDone = weekDone(chore.id);
            const wTotal = weekTotal(chore);
            return (
              <button key={chore.id} onClick={() => toggleChore(chore.id)} style={{
                ...styles.choreCard,
                background: done ? C.successLight : C.bgCard,
                borderColor: done ? C.success : C.borderLight,
              }}>
                <div style={styles.choreCardTop}>
                  <div style={{ ...styles.choreEmoji, background: done ? C.successLight : C.primaryLight }}>
                    <span style={{ fontSize: 22 }}>{chore.icon || '📋'}</span>
                  </div>
                  <div style={{ flex: 1 }}>
                    <span style={{ ...styles.choreCardTitle, textDecoration: done ? 'line-through' : 'none', color: done ? C.textMuted : C.text }}>
                      {chore.title}
                    </span>
                    <div style={styles.choreBadges}>
                      <span style={{ ...S.badge, background: chore.chore_type === 'base' ? C.secondaryLight : C.primaryLight, color: chore.chore_type === 'base' ? C.secondaryDark : C.primaryDark }}>
                        {chore.chore_type === 'base' ? 'Grund' : 'Bonus'}
                      </span>
                      {chore.chore_type === 'bonus' && chore.points > 0 && (
                        <span style={{ ...S.badge, background: C.accentLight, color: '#92400E' }}>
                          <Star size={10} /> {chore.points} kr
                        </span>
                      )}
                    </div>
                  </div>
                  {done ? <CheckCircle size={28} color={C.success} /> : <div style={styles.choreCheck} />}
                </div>
                {wTotal > 1 && (
                  <div style={styles.progressRow}>
                    <div style={styles.progressBarBg}>
                      <div style={{ ...styles.progressBarFill, width: `${(wDone / wTotal) * 100}%` }} />
                    </div>
                    <span style={styles.progressText}>{wDone}/{wTotal} denna vecka</span>
                  </div>
                )}
              </button>
            );
          })}

          {/* Pool chores */}
          {poolChores.length > 0 && (
            <>
              <p style={{ ...S.sectionLabel, marginTop: 16 }}>Öppna sysslor — plocka en!</p>
              {poolChores.map(chore => (
                <div key={chore.id} style={styles.poolCard}>
                  <div style={styles.choreCardTop}>
                    <div style={{ ...styles.choreEmoji, background: C.accentLight }}>
                      <span style={{ fontSize: 22 }}>{chore.icon || '📋'}</span>
                    </div>
                    <div style={{ flex: 1 }}>
                      <span style={styles.choreCardTitle}>{chore.title}</span>
                      {chore.points > 0 && (
                        <span style={{ ...S.badge, background: C.accentLight, color: '#92400E' }}>
                          <Star size={10} /> {chore.points} kr
                        </span>
                      )}
                    </div>
                  </div>
                  <button onClick={() => claimPoolChore(chore.id)} style={styles.claimBtn}>
                    🤲 Jag tar den!
                  </button>
                </div>
              ))}
            </>
          )}
        </>
      )}
    </div>
  );
}

const styles = {
  content: { padding: '12px 16px' },
  pageTitle: { fontFamily: F.heading, fontSize: F.sizes.xl, fontWeight: F.weights.extra, color: C.text, margin: '0 0 4px' },
  subtitle: { fontSize: F.sizes.sm, color: C.textMuted, fontFamily: F.heading, margin: '0 0 12px' },
  emptyTitle: { fontFamily: F.heading, fontSize: F.sizes.lg, fontWeight: F.weights.bold, color: C.text, margin: '12px 0 4px' },
  choreCard: { display: 'block', width: '100%', padding: '14px 16px', borderRadius: 16, border: '1.5px solid', marginBottom: 10, cursor: 'pointer', textAlign: 'left', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' },
  choreCardTop: { display: 'flex', alignItems: 'flex-start', gap: 12 },
  choreCardTitle: { display: 'block', fontSize: F.sizes.md, fontWeight: F.weights.bold, fontFamily: F.heading, color: C.text, marginBottom: 4 },
  choreEmoji: { width: 40, height: 40, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  choreBadges: { display: 'flex', gap: 4 },
  choreCheck: { width: 26, height: 26, borderRadius: 13, border: `2.5px solid ${C.border}`, flexShrink: 0 },
  progressRow: { marginTop: 8 },
  progressBarBg: { height: 6, background: 'rgba(255,255,255,0.6)', borderRadius: 99, overflow: 'hidden', marginBottom: 4 },
  progressBarFill: { height: '100%', borderRadius: 99, background: C.primary, transition: 'width 0.4s ease' },
  progressText: { fontSize: F.sizes.xs, color: C.textMuted, fontFamily: F.heading },
  poolCard: { padding: '14px 16px', borderRadius: 16, border: `2px dashed ${C.accent}`, background: C.bgCard, marginBottom: 10 },
  claimBtn: { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, width: '100%', padding: '12px', borderRadius: 12, border: 'none', background: C.accent, color: '#fff', fontSize: F.sizes.md, fontWeight: F.weights.bold, fontFamily: F.heading, cursor: 'pointer', marginTop: 10, minHeight: 48 },
};
