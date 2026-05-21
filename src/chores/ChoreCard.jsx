// ============================================
// FamTastic — ChoreCard (Duolingo-style)
// ============================================

import React, { useState } from 'react';
import { CheckCircle, Circle, Clock, Star, Zap } from 'lucide-react';
import { C, F, DIFFICULTY } from '../data';

export function ChoreCard({
  chore,
  completed,
  pending,
  requireApproval,   // NEW: family setting — only show pending badge if true
  onToggle,
  memberAvatar,
  memberName,
  canToggle,
  weekProgress,      // { done: 1, total: 3 }
  weekEarned,        // total kr earned this week for this chore
}) {
  const [animating, setAnimating] = useState(false);
  const diff = DIFFICULTY[chore.difficulty] || DIFFICULTY.medium;
  const isBase = chore.chore_type === 'base';
  const hasWeekProgress = weekProgress && weekProgress.total > 1;
  const showPending = pending && requireApproval;
  const weekComplete = hasWeekProgress && weekProgress.done >= weekProgress.total;

  function handleClick() {
    if (!canToggle) return;
    if (completed) {
      onToggle();
      return;
    }
    setAnimating(true);
    setTimeout(() => setAnimating(false), 700);
    onToggle();
  }

  return (
    <button
      onClick={handleClick}
      style={{
        ...styles.card,
        opacity: completed ? 0.7 : 1,
        transform: animating ? 'scale(1.04)' : 'scale(1)',
        background: completed ? C.successLight : C.bgCard,
        borderColor: completed ? C.success : C.borderLight,
      }}
    >
      <div style={styles.row}>
        {/* Emoji icon — big and friendly */}
        <div style={{
          ...styles.emojiWrap,
          background: completed ? C.successLight : isBase ? C.secondaryLight : C.primaryLight,
        }}>
          <span style={styles.emoji}>{chore.icon || '📋'}</span>
        </div>

        {/* Content */}
        <div style={styles.content}>
          <span style={{
            ...styles.title,
            textDecoration: completed ? 'line-through' : 'none',
            color: completed ? C.textMuted : C.text,
          }}>
            {chore.title}
          </span>

          <div style={styles.badges}>
            {/* Type badge */}
            {isBase ? (
              <span style={{
                ...styles.badge,
                background: C.secondaryLight,
                color: C.secondaryDark,
              }}>
                Grund
              </span>
            ) : (
              <span style={{
                ...styles.badge,
                background: C.primaryLight,
                color: C.primaryDark,
              }}>
                <Zap size={10} /> Bonus
              </span>
            )}

            {/* Points per completion */}
            {!isBase && chore.points > 0 && (
              <span style={{
                ...styles.badge,
                background: C.accentLight,
                color: '#92400E',
              }}>
                <Star size={10} /> {chore.points} kr
              </span>
            )}

            {/* Difficulty pill */}
            <span style={{
              ...styles.badge,
              background: diff.bg,
              color: diff.color === C.accent ? '#92400E' : diff.color,
            }}>
              {diff.emoji}
            </span>

            {/* Pending approval — ONLY if family has require_approval ON */}
            {showPending && (
              <span style={{
                ...styles.badge,
                background: C.accentLight,
                color: '#92400E',
              }}>
                <Clock size={10} /> Väntar
              </span>
            )}
          </div>

          {/* Week progress bar */}
          {hasWeekProgress && (
            <div style={styles.progressRow}>
              <div style={styles.progressBarBg}>
                <div style={{
                  ...styles.progressBarFill,
                  width: `${Math.min(100, (weekProgress.done / weekProgress.total) * 100)}%`,
                  background: weekComplete
                    ? C.success
                    : `linear-gradient(90deg, ${C.primary}, ${C.accent})`,
                }} />
              </div>
              <span style={styles.progressText}>
                {weekProgress.done}/{weekProgress.total} denna vecka
                {weekComplete && ' ✅'}
                {!isBase && chore.points > 0 && weekEarned > 0 && (
                  <> · {weekEarned} kr</>
                )}
              </span>
            </div>
          )}
        </div>

        {/* Checkbox — big tap target */}
        <div style={styles.checkWrap}>
          {completed ? (
            <div style={styles.checkDone}>
              <CheckCircle size={28} color={C.success} />
            </div>
          ) : showPending ? (
            <Clock size={28} color={C.accent} />
          ) : (
            <div style={styles.checkEmpty} />
          )}
        </div>
      </div>

      {/* Assignee tag (bottom right) */}
      {memberAvatar && (
        <div style={styles.assigneeRow}>
          <span style={styles.assigneeAvatar}>{memberAvatar}</span>
          {memberName && <span style={styles.assigneeName}>{memberName}</span>}
        </div>
      )}
    </button>
  );
}

const styles = {
  card: {
    display: 'block',
    width: '100%',
    padding: '14px 16px',
    background: C.bgCard,
    borderRadius: 16,
    border: `1.5px solid ${C.borderLight}`,
    marginBottom: 10,
    cursor: 'pointer',
    textAlign: 'left',
    transition: 'transform 0.2s, opacity 0.2s, background 0.2s',
    boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
  },
  row: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: 12,
  },
  emojiWrap: {
    width: 48,
    height: 48,
    borderRadius: 14,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  emoji: {
    fontSize: 24,
  },
  content: {
    flex: 1,
    minWidth: 0,
  },
  title: {
    display: 'block',
    fontSize: F.sizes.md,
    fontWeight: F.weights.bold,
    fontFamily: F.heading,
    color: C.text,
    marginBottom: 6,
    lineHeight: 1.3,
  },
  badges: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: 4,
  },
  badge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 3,
    padding: '2px 8px',
    borderRadius: 99,
    fontSize: F.sizes.xs,
    fontWeight: F.weights.bold,
    fontFamily: F.heading,
  },
  progressRow: {
    marginTop: 8,
  },
  progressBarBg: {
    height: 6,
    background: C.borderLight,
    borderRadius: 99,
    overflow: 'hidden',
    marginBottom: 4,
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 99,
    transition: 'width 0.4s ease',
  },
  progressText: {
    fontSize: F.sizes.xs,
    color: C.textMuted,
    fontFamily: F.heading,
  },
  checkWrap: {
    flexShrink: 0,
    paddingTop: 4,
  },
  checkDone: {
    animation: 'none', // placeholder for future celebration
  },
  checkEmpty: {
    width: 28,
    height: 28,
    borderRadius: 14,
    border: `2.5px solid ${C.border}`,
    background: C.bgCard,
  },
  assigneeRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 4,
    marginTop: 6,
    paddingLeft: 60,
  },
  assigneeAvatar: {
    fontSize: 16,
  },
  assigneeName: {
    fontSize: F.sizes.xs,
    color: C.textMuted,
    fontFamily: F.heading,
  },
};
