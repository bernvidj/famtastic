// ============================================
// FamTastic — ParentActionItems
// Pending actions: withdrawals, savings, family goal transfers
// ============================================

import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import { C, F, S, formatKr } from './data';
import { AlertTriangle, CheckCircle, Wallet, PiggyBank, Target } from 'lucide-react';

const ACTION_CONFIG = {
  withdrawal: {
    icon: Wallet,
    color: C.primary,
    bg: C.primaryLight,
    verb: 'betalat ut',
    pastVerb: 'Utbetald',
    instruction: 'Swisha eller ge kontant, bekräfta sedan här.',
  },
  saving: {
    icon: PiggyBank,
    color: C.secondary,
    bg: C.secondaryLight,
    verb: 'fört över till sparkonto',
    pastVerb: 'Överförd',
    instruction: 'För över till barnets sparkonto, bekräfta sedan här.',
  },
  family_goal: {
    icon: Target,
    color: C.accent,
    bg: C.accentLight,
    verb: 'fört över till familjemålet',
    pastVerb: 'Överförd',
    instruction: 'För över till familjens sparkonto, bekräfta sedan här.',
  },
};

export function ParentActionItems({ familyId, members, onUpdate }) {
  const [pendingItems, setPendingItems] = useState([]);
  const [confirming, setConfirming] = useState(null);
  const [loading, setLoading] = useState(true);

  const children = members.filter(m => m.role === 'child');

  useEffect(() => {
    loadPending();
  }, [familyId]);

  async function loadPending() {
    setLoading(true);

    // Get recent withdrawals, savings and family_goal transactions
    // that haven't been confirmed (no "[BEKRÄFTAD]" in description)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const { data } = await supabase
      .from('money_transactions')
      .select('*')
      .eq('family_id', familyId)
      .in('type', ['withdrawal', 'saving', 'family_goal'])
      .gte('created_at', sevenDaysAgo.toISOString())
      .order('created_at', { ascending: false });

    // Filter out already confirmed ones
    const pending = (data || []).filter(tx =>
      !tx.description?.includes('[BEKRÄFTAD]')
    );

    // Group by type + member for savings/withdrawals, by type for family_goal
    const grouped = [];

    // Group family_goal: sum all unconfirmed
    const fgItems = pending.filter(tx => tx.type === 'family_goal');
    if (fgItems.length > 0) {
      const totalAmount = fgItems.reduce((s, tx) => s + Math.abs(tx.amount), 0);
      const contributors = [...new Set(fgItems.map(tx => tx.member_id))];
      grouped.push({
        type: 'family_goal',
        txIds: fgItems.map(tx => tx.id),
        amount: totalAmount,
        memberIds: contributors,
        description: fgItems[0]?.description || 'Familjemål',
        goalName: fgItems[0]?.description?.replace('Bidrag till ', '') || 'Familjemål',
      });
    }

    // Group per child for withdrawals and savings
    for (const child of children) {
      const childWithdrawals = pending.filter(tx =>
        tx.type === 'withdrawal' && tx.member_id === child.id
      );
      if (childWithdrawals.length > 0) {
        grouped.push({
          type: 'withdrawal',
          txIds: childWithdrawals.map(tx => tx.id),
          amount: childWithdrawals.reduce((s, tx) => s + Math.abs(tx.amount), 0),
          memberIds: [child.id],
          description: `${child.name} vill ha pengar utbetalda`,
        });
      }

      const childSavings = pending.filter(tx =>
        tx.type === 'saving' && tx.member_id === child.id
      );
      if (childSavings.length > 0) {
        // Group by savings_goal_id
        const byGoal = {};
        for (const tx of childSavings) {
          const key = tx.savings_goal_id || 'general';
          if (!byGoal[key]) byGoal[key] = { txs: [], amount: 0 };
          byGoal[key].txs.push(tx);
          byGoal[key].amount += Math.abs(tx.amount);
        }
        for (const [goalId, group] of Object.entries(byGoal)) {
          const goalName = group.txs[0]?.description?.replace('Sparande till ', '') || 'Sparmål';
          grouped.push({
            type: 'saving',
            txIds: group.txs.map(tx => tx.id),
            amount: group.amount,
            memberIds: [child.id],
            description: `${child.name}: ${goalName}`,
            goalName,
          });
        }
      }
    }

    setPendingItems(grouped);
    setLoading(false);
  }

  async function confirmItem(item) {
    setConfirming(item.txIds[0]);

    // Mark all transactions as confirmed by appending [BEKRÄFTAD] to description
    for (const txId of item.txIds) {
      const { data: tx } = await supabase
        .from('money_transactions')
        .select('description')
        .eq('id', txId)
        .single();

      const newDesc = (tx?.description || '') + ' [BEKRÄFTAD]';
      await supabase
        .from('money_transactions')
        .update({ description: newDesc })
        .eq('id', txId);
    }

    setConfirming(null);
    loadPending();
    if (onUpdate) onUpdate();
  }

  function getMember(id) {
    return members.find(m => m.id === id);
  }

  if (loading || pendingItems.length === 0) return null;

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <AlertTriangle size={16} color={C.error} />
        <span style={styles.headerText}>Att göra ({pendingItems.length})</span>
      </div>

      {pendingItems.map((item, i) => {
        const config = ACTION_CONFIG[item.type];
        const Icon = config.icon;
        const memberAvatars = item.memberIds
          .map(id => getMember(id))
          .filter(Boolean)
          .map(m => m.avatar)
          .join(' ');
        const isConfirming = confirming === item.txIds[0];

        return (
          <div key={i} style={{ ...styles.card, borderColor: config.color }}>
            <div style={styles.cardTop}>
              <div style={{ ...styles.iconWrap, background: config.bg }}>
                <Icon size={20} color={config.color} />
              </div>
              <div style={styles.cardInfo}>
                <span style={styles.cardTitle}>
                  {memberAvatars} {item.type === 'family_goal'
                    ? `Familjemål: ${item.goalName}`
                    : item.description}
                </span>
                <span style={styles.cardAmount}>{formatKr(item.amount)}</span>
              </div>
            </div>

            <p style={styles.instruction}>{config.instruction}</p>

            <button
              onClick={() => confirmItem(item)}
              disabled={isConfirming}
              style={{
                ...styles.confirmBtn,
                background: isConfirming ? C.textMuted : config.color,
                opacity: isConfirming ? 0.6 : 1,
              }}
            >
              <CheckCircle size={16} color="#fff" />
              <span style={styles.confirmText}>
                {isConfirming ? 'Bekräftar...' : `Bekräfta — jag har ${config.verb}`}
              </span>
            </button>
          </div>
        );
      })}
    </div>
  );
}

const styles = {
  container: {
    padding: '0 16px',
    marginBottom: 12,
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  headerText: {
    fontSize: F.sizes.sm,
    fontWeight: F.weights.bold,
    fontFamily: F.heading,
    color: C.error,
  },
  card: {
    padding: 14,
    background: C.bgCard,
    borderRadius: 16,
    borderLeft: '4px solid',
    marginBottom: 8,
    boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
  },
  cardTop: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    marginBottom: 6,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  cardInfo: {
    flex: 1,
    minWidth: 0,
  },
  cardTitle: {
    display: 'block',
    fontSize: F.sizes.sm,
    fontWeight: F.weights.bold,
    fontFamily: F.heading,
    color: C.text,
  },
  cardAmount: {
    display: 'block',
    fontSize: F.sizes.lg,
    fontWeight: F.weights.extra,
    fontFamily: F.heading,
    color: C.primaryDark,
    marginTop: 2,
  },
  instruction: {
    fontSize: F.sizes.xs,
    color: C.textMuted,
    fontFamily: F.heading,
    margin: '4px 0 10px',
    lineHeight: 1.4,
  },
  confirmBtn: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    width: '100%',
    padding: '10px 14px',
    borderRadius: 12,
    border: 'none',
    cursor: 'pointer',
    minHeight: 44,
  },
  confirmText: {
    fontSize: F.sizes.sm,
    fontWeight: F.weights.bold,
    fontFamily: F.heading,
    color: '#fff',
  },
};
