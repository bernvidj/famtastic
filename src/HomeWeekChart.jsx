// ============================================
// FamTastic — HomeMoneyOverview
// Extracted from Home.jsx — "Pengaöversikt 30 dagar"
// ============================================

import React from 'react';
import { C, F, S, formatKr } from './data';
import { TrendingUp } from 'lucide-react';

function childMonthSummary(monthTx, childId) {
  const txs = monthTx.filter(tx => tx.member_id === childId);
  return {
    allowance: txs.filter(tx => tx.type === 'base_allowance').reduce((s, tx) => s + tx.amount, 0),
    bonus: txs.filter(tx => tx.type === 'chore_bonus').reduce((s, tx) => s + tx.amount, 0),
    savings: txs.filter(tx => tx.type === 'saving').reduce((s, tx) => s + Math.abs(tx.amount), 0),
    withdrawals: txs.filter(tx => tx.type === 'withdrawal').reduce((s, tx) => s + Math.abs(tx.amount), 0),
    familyGoal: txs.filter(tx => tx.type === 'family_goal').reduce((s, tx) => s + Math.abs(tx.amount), 0),
  };
}

function hasSummary(s) {
  return s.allowance > 0 || s.bonus > 0 || s.savings > 0 || s.withdrawals > 0 || s.familyGoal > 0;
}

export function HomeMoneyOverview({ children, monthTx }) {
  const anyData = children.some(c => hasSummary(childMonthSummary(monthTx, c.id)));
  if (!anyData) return null;

  return (
    <div style={styles.section}>
      <p style={S.sectionLabel}><TrendingUp size={12} color={C.textMuted} /> Pengaöversikt — 30 dagar</p>
      {children.map(child => {
        const s = childMonthSummary(monthTx, child.id);
        if (!hasSummary(s)) return null;
        return (
          <div key={child.id} style={styles.overviewCard}>
            <div style={styles.overviewHeader}>
              <div style={{ ...styles.overviewAvatar, background: child.color || C.primary }}>
                <span style={{ fontSize: 18 }}>{child.avatar}</span>
              </div>
              <span style={styles.overviewName}>{child.name}</span>
            </div>
            <div style={styles.overviewGrid}>
              {s.allowance > 0 && (
                <div style={styles.overviewItem}>
                  <span style={styles.overviewEmoji}>💰</span>
                  <span style={styles.overviewItemLabel}>Veckopeng</span>
                  <span style={{ ...styles.overviewItemVal, color: C.success }}>+{formatKr(s.allowance)}</span>
                </div>
              )}
              {s.bonus > 0 && (
                <div style={styles.overviewItem}>
                  <span style={styles.overviewEmoji}>⭐</span>
                  <span style={styles.overviewItemLabel}>Bonus</span>
                  <span style={{ ...styles.overviewItemVal, color: C.success }}>+{formatKr(s.bonus)}</span>
                </div>
              )}
              {s.savings > 0 && (
                <div style={styles.overviewItem}>
                  <span style={styles.overviewEmoji}>🐷</span>
                  <span style={styles.overviewItemLabel}>Sparat</span>
                  <span style={{ ...styles.overviewItemVal, color: C.secondary }}>{formatKr(s.savings)}</span>
                </div>
              )}
              {s.withdrawals > 0 && (
                <div style={styles.overviewItem}>
                  <span style={styles.overviewEmoji}>💸</span>
                  <span style={styles.overviewItemLabel}>Utbetalt</span>
                  <span style={{ ...styles.overviewItemVal, color: C.primary }}>{formatKr(s.withdrawals)}</span>
                </div>
              )}
              {s.familyGoal > 0 && (
                <div style={styles.overviewItem}>
                  <span style={styles.overviewEmoji}>🎯</span>
                  <span style={styles.overviewItemLabel}>Familjemål</span>
                  <span style={{ ...styles.overviewItemVal, color: C.accent }}>{formatKr(s.familyGoal)}</span>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

const styles = {
  section: { padding: '0 16px', marginBottom: 16 },
  overviewCard: { padding: 14, background: C.bgCard, borderRadius: 16, border: `1.5px solid ${C.borderLight}`, marginBottom: 8, boxShadow: '0 2px 8px rgba(0,0,0,0.04)' },
  overviewHeader: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 },
  overviewAvatar: { width: 32, height: 32, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  overviewName: { fontSize: F.sizes.md, fontWeight: F.weights.bold, fontFamily: F.heading, color: C.text },
  overviewGrid: { display: 'flex', flexWrap: 'wrap', gap: 6 },
  overviewItem: { display: 'flex', alignItems: 'center', gap: 4, padding: '4px 10px', background: C.bg, borderRadius: 10 },
  overviewEmoji: { fontSize: 14, flexShrink: 0 },
  overviewItemLabel: { fontSize: F.sizes.xs, color: C.textMuted, fontFamily: F.heading },
  overviewItemVal: { fontSize: F.sizes.sm, fontWeight: F.weights.extra, fontFamily: F.heading, marginLeft: 2 },
};
