// ============================================
// FamTastic — ChoreCard (single chore item)
// ============================================

import React, { useState } from 'react';
import { CheckCircle, Circle, Clock, Star } from 'lucide-react';
import { C, F } from '../data';

const DIFFICULTY_LABELS = {
  easy: { label: 'Lätt', color: C.success, bg: C.successLight },
  medium: { label: 'Medel', color: C.accent, bg: C.accentLight },
  hard: { label: 'Svårt', color: C.error, bg: C.errorLight },
};

export function ChoreCard({
  chore,
  completed,
  pending,
  onToggle,
  memberAvatar,
  memberName,
  canToggle,
  weekProgress,   // { done: 1, total: 3 }
  weekEarned,     // total kr earned this week for this chore
}) {
  const [animating, setAnimating] = useState(false);
  const diff = DIFFICULTY_LABELS[chore.difficulty] || DIFFICULTY_LABELS.medium;
  const isBase = chore.chore_type === 'base';
  const hasWeekProgress = weekProgress && weekProgress.total > 1;

  function handleClick() {
    if (!canToggle) return;
    if (completed) {
      onToggle();
      return;
    }
    setAnimating(true);
    setTimeout(() => setAnimating(false), 600);
    onToggle();
  }

  return (
    <button
      onClick={handleClick}
      style={{
        ...styles.card,
        opacity: completed ? 0.65 : 1,
        transform: animating ? 'scale(1.03)' : 'scale(1)',
        borderLeft: `4px solid ${completed ? C.success : isBase ? C.secondary : C.primary}`,
      }}
    >
      <div style={styles.row}>
        {/* Checkbox */}
        <div style={styles.checkWrap}>
          {completed ? (
            <CheckCircle size={26} color={C.success} />
          ) : pending ? (
            <Clock size={26} color={C.accent} />
          ) : (
            <Circle size={26} color={C.border} />
          )}
        </div>

        {/* Content */}
        <div style={styles.content}>
          <span style={{
            ...styles.title,
            textDecoration: completed ? 'line-through' : 'none',
          }}>
            {chore.icon || '📋'} {chore.title}
          </span>

          <div style={styles.badges}>
            {/* Type badge */}
            <span style={{
              ...styles.badge,
              background: isBase ? C.secondaryLight : C.primaryLight,
              color: isBase ? C.secondary : C.primary,
            }}>
              {isBase ? 'Grundsyssla' : 'Bonus'}
            </span>

            {/* Points per time */}
            {!isBase && chore.points > 0 && (
              <span style={{
                ...styles.badge,
                background: C.accentLight,
                color: C.warning,
              }}>
                <Star size={11} /> {chore.points} kr/gång
              </span>
            )}

            {/* Difficulty */}
            <span style={{
              ...styles.badge,
              background: diff.bg,
              color: diff.color,
            }}>
              {diff.label}
            </span>

            {/* Pending approval */}
            {pending && (
              <span style={{
                ...styles.badge,
                background: C.accentLight,
                color: C.accent,
              }}>
                Väntar på godkännande
              </span>
            )}
          </div>

          {/* Week progress bar */}
          {hasWeekProgress && (
            <div style={styles.progressRow}>
              <div style={styles.progressBarBg}>
                <div style={{
                  ...styles.progressBarFill,
                  width: `${(weekProgress.done / weekProgress.total) * 100}%`,
                  background: weekProgress.done >= weekProgress.total ? C.success : C.primary,
                }} />
              </div>
              <span style={styles.progressText}>
                {weekProgress.done}/{weekProgress.total} denna vecka
                {!isBase && chore.points > 0 && weekEarned > 0 && (
                  <> · {weekEarned} kr intjänat</>
                )}
              </span>
            </div>
          )}
        </div>

        {/* Assignee */}
        {memberAvatar && (
          <div style={styles.assignee}>
            <span style={styles.assigneeAvatar}>{memberAvatar}</span>
            {memberName && <span style={styles.assigneeName}>{memberName}</span>}
          </div>
        )}
      </div>
    </button>
  );
}

const styles = {
  card: {
    display: 'block',
    width: '100%',
    padding: '12px 14px',
    background: C.bgCard,
    borderRadius: 12,
    border: `1px solid ${C.borderLight}`,
    marginBottom: 8,
    cursor: 'pointer',
    textAlign: 'left',
    transition: 'transform 0.15s, opacity 0.2s',
  },
  row: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: 10,
  },
  checkWrap: {
    paddingTop: 2,
    flexShrink: 0,
  },
  content: {
    flex: 1,
    minWidth: 0,
  },
  title: {
    display: 'block',
    fontSize: F.sizes.md,
    fontWeight: F.weights.semi,
    color: C.text,
    marginBottom: 6,
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
    borderRadius: 6,
    fontSize: F.sizes.xs,
    fontWeight: F.weights.bold,
  },
  progressRow: {
    marginTop: 8,
  },
  progressBarBg: {
    height: 6,
    background: C.borderLight,
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 4,
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 3,
    transition: 'width 0.3s',
  },
  progressText: {
    fontSize: F.sizes.xs,
    color: C.textMuted,
  },
  assignee: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    flexShrink: 0,
  },
  assigneeAvatar: {
    fontSize: 22,
  },
  assigneeName: {
    fontSize: F.sizes.xs,
    color: C.textMuted,
    marginTop: 2,
  },
};
