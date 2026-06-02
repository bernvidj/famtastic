// ============================================
// FamTastic — ParentActionItems (compact)
// Pending: withdrawals, savings, family goal transfers
// ============================================

import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import { C, F, formatKr } from './data';
import { CheckCircle, Wallet, PiggyBank, Target } from 'lucide-react';

const ACTION_CONFIG = {
  withdrawal: { icon: Wallet,    color: C.primary,   bg: C.primaryLight,   label: 'Utbetalning',  verb: 'betalat ut' },
  saving:     { icon: PiggyBank, color: C.secondary, bg: C.secondaryLight, label: 'Sparkonto',    verb: 'fört över till sparkonto' },
  family_goal:{ icon: Target,    color: C.accent,    bg: C.accentLight,    label: 'Familjemål',   verb: 'fört över till familjemålet' },
};

export function ParentActionItems({ familyId, members, onUpdate }) {
  const [pendingItems, setPendingItems] = useState([]);
  const [confirming,   setConfirming]   = useState(null);
  const [loading,      setLoading]      = useState(true);

  const children = members.filter(m => m.role === 'child');

  useEffect(() => { loadPending(); }, [familyId]);

  async function loadPending() {
    setLoading(true);
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const { data } = await supabase
      .from('money_transactions')
      .select('*')
      .eq('family_id', familyId)
      .in('type', ['withdrawal', 'saving', 'family_goal'])
      .gte('created_at', sevenDaysAgo.toISOString())
      .order('created_at', { ascending: false });

    const pending = (data || []).filter(tx => !tx.description?.includes('[BEKRÄFTAD]'));
    const grouped = [];

    // Gruppera per familjemål (savings_goal_id) — annars slås flera olika mål
    // ihop till en rad med fel namn och en kombinerad summa.
    const fgItems = pending.filter(tx => tx.type === 'family_goal');
    const fgByGoal = {};
    for (const tx of fgItems) {
      const key = tx.savings_goal_id || 'general';
      if (!fgByGoal[key]) fgByGoal[key] = { txs: [], amount: 0, desc: tx.description };
      fgByGoal[key].txs.push(tx);
      fgByGoal[key].amount += Math.abs(tx.amount);
    }
    for (const group of Object.values(fgByGoal)) {
      grouped.push({
        type: 'family_goal',
        txIds: group.txs.map(tx => tx.id),
        amount: group.amount,
        memberIds: [...new Set(group.txs.map(tx => tx.member_id))],
        label: group.desc?.replace('Bidrag till ', '') || 'Familjemål',
      });
    }

    for (const child of children) {
      const withdrawals = pending.filter(tx => tx.type === 'withdrawal' && tx.member_id === child.id);
      if (withdrawals.length > 0) {
        grouped.push({
          type: 'withdrawal',
          txIds: withdrawals.map(tx => tx.id),
          amount: withdrawals.reduce((s, tx) => s + Math.abs(tx.amount), 0),
          memberIds: [child.id],
          label: `${child.avatar} ${child.name}`,
        });
      }

      const savings = pending.filter(tx => tx.type === 'saving' && tx.member_id === child.id);
      const byGoal = {};
      for (const tx of savings) {
        const key = tx.savings_goal_id || 'general';
        if (!byGoal[key]) byGoal[key] = { txs: [], amount: 0, desc: tx.description };
        byGoal[key].txs.push(tx);
        byGoal[key].amount += Math.abs(tx.amount);
      }
      for (const group of Object.values(byGoal)) {
        const goalName = group.desc?.replace('Sparande till ', '') || 'Sparmål';
        grouped.push({
          type: 'saving',
          txIds: group.txs.map(tx => tx.id),
          amount: group.amount,
          memberIds: [child.id],
          label: `${child.avatar} ${child.name} – ${goalName}`,
        });
      }
    }

    setPendingItems(grouped);
    setLoading(false);
  }

  async function confirmItem(item) {
    setConfirming(item.txIds[0]);
    for (const txId of item.txIds) {
      const { data: tx } = await supabase.from('money_transactions').select('description').eq('id', txId).single();
      await supabase.from('money_transactions')
        .update({ description: (tx?.description || '') + ' [BEKRÄFTAD]' })
        .eq('id', txId);
    }
    setConfirming(null);
    loadPending();
    if (onUpdate) onUpdate();
  }

  if (loading || pendingItems.length === 0) return null;

  return (
    <div style={styles.container}>
      <p style={styles.sectionLabel}>Att göra ({pendingItems.length})</p>
      {pendingItems.map((item, i) => {
        const cfg = ACTION_CONFIG[item.type];
        const Icon = cfg.icon;
        const isConfirming = confirming === item.txIds[0];
        return (
          <div key={i} style={styles.row}>
            <div style={{ ...styles.iconWrap, background: cfg.bg }}>
              <Icon size={16} color={cfg.color} />
            </div>
            <div style={styles.rowInfo}>
              <span style={styles.rowLabel}>{item.label}</span>
              <span style={{ ...styles.rowType, color: cfg.color }}>{cfg.label}</span>
            </div>
            <span style={styles.rowAmount}>{formatKr(item.amount)}</span>
            <button
              onClick={() => confirmItem(item)}
              disabled={isConfirming}
              style={{ ...styles.checkBtn, background: isConfirming ? C.borderLight : cfg.bg, borderColor: cfg.color }}
              title={`Bekräfta — jag har ${cfg.verb}`}
            >
              <CheckCircle size={20} color={isConfirming ? C.textMuted : cfg.color} />
            </button>
          </div>
        );
      })}
    </div>
  );
}

const styles = {
  container: { padding: '0 16px', marginBottom: 16 },
  sectionLabel: {
    fontSize: 11, fontWeight: 700, fontFamily: "'Nunito', sans-serif",
    color: C.textMuted, textTransform: 'uppercase', letterSpacing: 0.5, margin: '0 0 6px',
  },
  row: {
    display: 'flex', alignItems: 'center', gap: 10,
    padding: '10px 12px', background: C.bgCard, borderRadius: 12,
    border: `1.5px solid ${C.borderLight}`, marginBottom: 6,
    boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
  },
  iconWrap: { width: 32, height: 32, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  rowInfo: { flex: 1, minWidth: 0 },
  rowLabel: { display: 'block', fontSize: 13, fontWeight: 700, fontFamily: "'Nunito', sans-serif", color: C.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  rowType: { display: 'block', fontSize: 11, fontWeight: 600, fontFamily: "'Nunito', sans-serif", marginTop: 1 },
  rowAmount: { fontSize: 14, fontWeight: 800, fontFamily: "'Nunito', sans-serif", color: C.text, flexShrink: 0 },
  checkBtn: {
    width: 36, height: 36, borderRadius: 10, border: '1.5px solid',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    cursor: 'pointer', flexShrink: 0, transition: 'background 0.15s',
  },
};
