// ============================================
// FamTastic — FamilyGoalCard (epic shared goal)
// ============================================

import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { C, F, formatKr } from '../data';
import { Target, Users, Trophy } from 'lucide-react';

export function FamilyGoalCard({ goal, familyId, members }) {
  const [totalSaved, setTotalSaved] = useState(0);
  const [contributions, setContributions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadProgress();
  }, [goal.id]);

  async function loadProgress() {
    setLoading(true);

    // Get total via RPC
    const { data: total } = await supabase.rpc('get_family_goal_progress', {
      p_goal_id: goal.id,
    });
    setTotalSaved(total || 0);

    // Get per-member contributions
    const { data: txs } = await supabase
      .from('money_transactions')
      .select('member_id, amount')
      .eq('savings_goal_id', goal.id);

    // Group by member
    const grouped = {};
    (txs || []).forEach(tx => {
      if (!grouped[tx.member_id]) grouped[tx.member_id] = 0;
      grouped[tx.member_id] += Math.abs(tx.amount);
    });

    const contribs = Object.entries(grouped)
      .map(([memberId, amount]) => {
        const m = members.find(mem => mem.id === memberId);
        return { member: m, amount };
      })
      .filter(c => c.member)
      .sort((a, b) => b.amount - a.amount);

    setContributions(contribs);
    setLoading(false);
  }

  const progress = Math.min(100, (totalSaved / goal.target_amount) * 100);
  const achieved = progress >= 100;

  return (
    <div style={{
      ...styles.card,
      background: achieved
        ? 'linear-gradient(135deg, #FEF3C7 0%, #FDE68A 100%)'
        : `linear-gradient(135deg, ${C.primaryLight} 0%, ${C.bgCard} 100%)`,
      border: achieved ? `2px solid ${C.accent}` : `1px solid ${C.borderLight}`,
    }}>
      {/* Header */}
      <div style={styles.header}>
        <span style={styles.icon}>{goal.icon || '🎯'}</span>
        <div style={styles.headerContent}>
          <span style={styles.label}>Familjens episka mål</span>
          <span style={styles.title}>{goal.title}</span>
        </div>
        {achieved && <Trophy size={28} color={C.accent} />}
      </div>

      {/* Amount */}
      <div style={styles.amountRow}>
        <span style={styles.saved}>{formatKr(totalSaved)}</span>
        <span style={styles.target}>av {formatKr(goal.target_amount)}</span>
      </div>

      {/* Progress bar */}
      <div style={styles.barBg}>
        <div style={{
          ...styles.barFill,
          width: `${progress}%`,
          background: achieved
            ? 'linear-gradient(90deg, #F59E0B, #FBBF24)'
            : `linear-gradient(90deg, ${C.primary}, ${C.accent})`,
        }} />
      </div>

      <div style={styles.progressInfo}>
        <span style={styles.percent}>{Math.round(progress)}%</span>
        <span style={styles.remaining}>
          {achieved ? '🎉 Mål uppnått!' : `${formatKr(goal.target_amount - totalSaved)} kvar`}
        </span>
      </div>

      {/* Contributions */}
      {!loading && contributions.length > 0 && (
        <div style={styles.contribSection}>
          <div style={styles.contribHeader}>
            <Users size={14} color={C.textMuted} />
            <span style={styles.contribTitle}>Bidrag</span>
          </div>
          <div style={styles.contribList}>
            {contributions.map(c => {
              const memberPercent = (c.amount / goal.target_amount) * 100;
              return (
                <div key={c.member.id} style={styles.contribRow}>
                  <span style={styles.contribAvatar}>{c.member.avatar}</span>
                  <span style={styles.contribName}>{c.member.name}</span>
                  <div style={styles.contribBarBg}>
                    <div style={{
                      ...styles.contribBarFill,
                      width: `${Math.min(100, memberPercent)}%`,
                      background: c.member.color || C.primary,
                    }} />
                  </div>
                  <span style={styles.contribAmount}>{formatKr(c.amount)}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

const styles = {
  card: {
    borderRadius: 18,
    padding: 20,
    marginBottom: 14,
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    marginBottom: 14,
  },
  icon: {
    fontSize: 36,
    flexShrink: 0,
  },
  headerContent: {
    flex: 1,
  },
  label: {
    display: 'block',
    fontSize: F.sizes.xs,
    fontWeight: F.weights.bold,
    color: C.primary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  title: {
    display: 'block',
    fontFamily: F.heading,
    fontSize: F.sizes.xl,
    fontWeight: F.weights.extra,
    color: C.text,
  },
  amountRow: {
    display: 'flex',
    alignItems: 'baseline',
    gap: 8,
    marginBottom: 10,
  },
  saved: {
    fontFamily: F.heading,
    fontSize: F.sizes.xxl,
    fontWeight: F.weights.extra,
    color: C.text,
  },
  target: {
    fontSize: F.sizes.sm,
    color: C.textMuted,
  },
  barBg: {
    height: 12,
    background: 'rgba(0,0,0,0.08)',
    borderRadius: 6,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: 6,
    transition: 'width 0.5s ease',
  },
  progressInfo: {
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
  contribSection: {
    marginTop: 14,
    paddingTop: 14,
    borderTop: '1px solid rgba(0,0,0,0.08)',
  },
  contribHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: 4,
    marginBottom: 8,
  },
  contribTitle: {
    fontSize: F.sizes.xs,
    fontWeight: F.weights.bold,
    color: C.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  contribList: {
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
  },
  contribRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  },
  contribAvatar: {
    fontSize: 18,
    flexShrink: 0,
  },
  contribName: {
    fontSize: F.sizes.xs,
    fontWeight: F.weights.semi,
    color: C.text,
    width: 60,
    flexShrink: 0,
  },
  contribBarBg: {
    flex: 1,
    height: 6,
    background: 'rgba(0,0,0,0.06)',
    borderRadius: 3,
    overflow: 'hidden',
  },
  contribBarFill: {
    height: '100%',
    borderRadius: 3,
    transition: 'width 0.3s',
  },
  contribAmount: {
    fontSize: F.sizes.xs,
    fontWeight: F.weights.bold,
    color: C.textMuted,
    width: 60,
    textAlign: 'right',
    flexShrink: 0,
  },
};
