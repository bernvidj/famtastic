// ============================================
// FamTastic — SavingsGoal (progress card)
// ============================================

import React, { useState } from 'react';
import { C, F, formatKr } from '../data';
import { Trash2, X, Check } from 'lucide-react';

export function SavingsGoal({ goal, saved, members, onDelete }) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const progress = Math.min(100, (saved / goal.target_amount) * 100);
  const isFamily = goal.is_family_goal;
  const owner = !isFamily && goal.member_id
    ? members.find(m => m.id === goal.member_id)
    : null;

  return (
    <div style={styles.card}>
      <div style={styles.header}>
        <span style={styles.icon}>{goal.icon || '🎯'}</span>
        <div style={styles.headerContent}>
          <span style={styles.title}>{goal.title}</span>
          {isFamily && (
            <span style={styles.familyBadge}>👨‍👩‍👧‍👦 Familjemål</span>
          )}
          {owner && (
            <span style={styles.ownerBadge}>{owner.avatar} {owner.name}</span>
          )}
        </div>
        <div style={styles.amounts}>
          <span style={styles.savedAmount}>{formatKr(saved)}</span>
          <span style={styles.targetAmount}>av {formatKr(goal.target_amount)}</span>
        </div>
        {onDelete && !confirmDelete && (
          <button onClick={() => setConfirmDelete(true)} style={styles.deleteBtn} title="Ta bort mål">
            <Trash2 size={14} color={C.textMuted} />
          </button>
        )}
      </div>

      {/* Bekräftelse för ta bort */}
      {confirmDelete && (
        <div style={styles.confirmRow}>
          <span style={styles.confirmText}>Ta bort "{goal.title}"? Sparade pengar behålls.</span>
          <button onClick={() => setConfirmDelete(false)} style={styles.confirmNo}><X size={14} /></button>
          <button onClick={() => { setConfirmDelete(false); onDelete(goal); }} style={styles.confirmYes}>
            <Check size={14} /> Ta bort
          </button>
        </div>
      )}

      {/* Progress bar */}
      <div style={styles.barBg}>
        <div style={{
          ...styles.barFill,
          width: `${progress}%`,
          background: progress >= 100
            ? C.success
            : `linear-gradient(90deg, ${C.primary}, ${C.accent})`,
        }} />
      </div>

      <div style={styles.footer}>
        <span style={styles.percent}>{Math.round(progress)}%</span>
        <span style={styles.remaining}>
          {progress >= 100
            ? '🎉 Mål uppnått!'
            : `${formatKr(goal.target_amount - saved)} kvar`
          }
        </span>
      </div>
    </div>
  );
}

const styles = {
  card: {
    padding: 16,
    background: C.bgCard,
    borderRadius: 14,
    border: `1px solid ${C.borderLight}`,
    marginBottom: 10,
  },
  header: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: 10,
    marginBottom: 12,
  },
  icon: {
    fontSize: 28,
    flexShrink: 0,
  },
  headerContent: {
    flex: 1,
    minWidth: 0,
  },
  title: {
    display: 'block',
    fontSize: F.sizes.md,
    fontWeight: F.weights.bold,
    fontFamily: F.heading,
    color: C.text,
  },
  familyBadge: {
    display: 'inline-block',
    marginTop: 4,
    padding: '2px 8px',
    borderRadius: 6,
    fontSize: F.sizes.xs,
    fontWeight: F.weights.bold,
    background: C.primaryLight,
    color: C.primary,
  },
  ownerBadge: {
    display: 'inline-block',
    marginTop: 4,
    fontSize: F.sizes.xs,
    color: C.textMuted,
  },
  amounts: {
    textAlign: 'right',
    flexShrink: 0,
  },
  savedAmount: {
    display: 'block',
    fontSize: F.sizes.lg,
    fontWeight: F.weights.extra,
    fontFamily: F.heading,
    color: C.text,
  },
  targetAmount: {
    fontSize: F.sizes.xs,
    color: C.textMuted,
  },
  barBg: {
    height: 10,
    background: C.borderLight,
    borderRadius: 5,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: 5,
    transition: 'width 0.4s ease',
  },
  footer: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  percent: {
    fontSize: F.sizes.sm,
    fontWeight: F.weights.bold,
    fontFamily: F.heading,
    color: C.primary,
  },
  remaining: {
    fontSize: F.sizes.xs,
    color: C.textMuted,
  },
  deleteBtn: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    padding: 6,
    borderRadius: 8,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    marginLeft: 4,
    minWidth: 32,
    minHeight: 32,
  },
  confirmRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    padding: '8px 10px',
    background: C.errorLight,
    borderRadius: 10,
    marginBottom: 10,
  },
  confirmText: {
    flex: 1,
    fontSize: F.sizes.xs,
    color: C.error,
    fontFamily: F.heading,
    fontWeight: F.weights.semi,
  },
  confirmNo: {
    background: 'none',
    border: `1px solid ${C.error}`,
    borderRadius: 6,
    padding: '4px 8px',
    cursor: 'pointer',
    color: C.error,
    display: 'flex',
    alignItems: 'center',
  },
  confirmYes: {
    display: 'flex',
    alignItems: 'center',
    gap: 4,
    background: C.error,
    border: 'none',
    borderRadius: 6,
    padding: '4px 10px',
    cursor: 'pointer',
    color: '#fff',
    fontSize: F.sizes.xs,
    fontWeight: F.weights.bold,
    fontFamily: F.heading,
  },
};
