// ============================================
// FamTastic — MoneyView (balance + transactions)
// ============================================

import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { C, F, S, formatKr, safeArray } from '../data';
import { SavingsGoal } from './SavingsGoal';
import { PiggyBank, Plus, Minus, ArrowDownCircle, ArrowUpCircle, Gift, TrendingUp, ChevronDown, ChevronUp } from 'lucide-react';

const TX_ICONS = {
  base_allowance: { icon: '💰', label: 'Veckopeng' },
  chore_bonus: { icon: '⭐', label: 'Bonus' },
  saving: { icon: '🐷', label: 'Sparande' },
  withdrawal: { icon: '💸', label: 'Utbetalning' },
  gift: { icon: '🎁', label: 'Gåva' },
  spent: { icon: '🛍️', label: 'Köp' },
  family_goal: { icon: '🎯', label: 'Familjemål' },
};

export function MoneyView({ familyId, member, members }) {
  const [selectedChild, setSelectedChild] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [goals, setGoals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddTx, setShowAddTx] = useState(false);
  const [txForm, setTxForm] = useState({ amount: '', type: 'gift', description: '' });
  const [saving, setSaving] = useState(false);
  const [showAllTx, setShowAllTx] = useState(false);

  const isParent = member.role === 'admin' || member.role === 'parent';
  const children = members.filter(m => m.role === 'child');

  useEffect(() => {
    if (children.length > 0 && !selectedChild) {
      setSelectedChild(children[0].id);
    }
  }, [members]);

  useEffect(() => {
    if (selectedChild) loadData();
  }, [selectedChild, familyId]);

  async function loadData() {
    setLoading(true);

    const [txRes, goalRes] = await Promise.all([
      supabase.from('money_transactions').select('*')
        .eq('family_id', familyId)
        .eq('member_id', selectedChild)
        .order('created_at', { ascending: false })
        .limit(50),
      supabase.from('savings_goals').select('*')
        .eq('family_id', familyId)
        .or(`member_id.eq.${selectedChild},is_family_goal.eq.true`)
        .is('achieved_at', null),
    ]);

    setTransactions(txRes.data || []);
    setGoals(goalRes.data || []);
    setLoading(false);
  }

  // --- Balance ---
  function getBalance() {
    return transactions.reduce((sum, tx) => sum + tx.amount, 0);
  }

  // --- This week summary ---
  function getWeekSummary() {
    const now = new Date();
    const dayNum = now.getDay() || 7;
    const monday = new Date(now);
    monday.setDate(now.getDate() - dayNum + 1);
    monday.setHours(0, 0, 0, 0);

    const weekTx = transactions.filter(tx =>
      new Date(tx.created_at) >= monday
    );

    const base = weekTx
      .filter(tx => tx.type === 'base_allowance')
      .reduce((s, tx) => s + tx.amount, 0);
    const bonus = weekTx
      .filter(tx => tx.type === 'chore_bonus')
      .reduce((s, tx) => s + tx.amount, 0);
    const spent = weekTx
      .filter(tx => tx.amount < 0)
      .reduce((s, tx) => s + tx.amount, 0);

    return { base, bonus, spent };
  }

  // --- Add transaction ---
  async function handleAddTx() {
    if (!txForm.amount || Number(txForm.amount) === 0) return;
    setSaving(true);

    const isNegative = ['withdrawal', 'spent', 'saving', 'family_goal'].includes(txForm.type);
    const amountOre = Math.round(Math.abs(Number(txForm.amount)) * 100);

    await supabase.from('money_transactions').insert({
      family_id: familyId,
      member_id: selectedChild,
      amount: isNegative ? -amountOre : amountOre,
      type: txForm.type,
      description: txForm.description.trim() || null,
    });

    setTxForm({ amount: '', type: 'gift', description: '' });
    setShowAddTx(false);
    setSaving(false);
    loadData();
  }

  // --- Savings goal progress ---
  function goalProgress(goal) {
    const saved = transactions
      .filter(tx => tx.type === 'saving' || tx.type === 'family_goal')
      .reduce((s, tx) => s + Math.abs(tx.amount), 0);
    return saved;
  }

  const balance = getBalance();
  const week = getWeekSummary();
  const child = members.find(m => m.id === selectedChild);
  const visibleTx = showAllTx ? transactions : transactions.slice(0, 8);

  if (children.length === 0) {
    return (
      <div style={styles.page}>
        <div style={styles.emptyState}>
          <span style={{ fontSize: 48 }}>💰</span>
          <p style={styles.emptyTitle}>Inga barn tillagda</p>
          <p style={styles.emptyText}>Lägg till barn i familjen för att hantera pengar.</p>
        </div>
        <div style={{ height: 80 }} />
      </div>
    );
  }

  return (
    <div style={styles.page}>
      {/* Header */}
      <div style={styles.header}>
        <h1 style={styles.pageTitle}>Pengar</h1>
      </div>

      {/* Child selector */}
      {children.length > 1 && (
        <div style={styles.childRow}>
          {children.map(c => (
            <button
              key={c.id}
              onClick={() => { setSelectedChild(c.id); setShowAllTx(false); }}
              style={{
                ...styles.childBtn,
                background: selectedChild === c.id ? C.primary : C.bgCard,
                color: selectedChild === c.id ? '#fff' : C.text,
                border: selectedChild === c.id ? `2px solid ${C.primary}` : `2px solid ${C.border}`,
              }}
            >
              <span style={{ fontSize: 20 }}>{c.avatar}</span>
              <span style={styles.childName}>{c.name}</span>
            </button>
          ))}
        </div>
      )}

      {loading ? (
        <p style={styles.loadingText}>Laddar...</p>
      ) : (
        <>
          {/* Balance card */}
          <div style={styles.balanceCard}>
            <div style={styles.balanceTop}>
              <span style={styles.balanceAvatar}>{child?.avatar}</span>
              <div>
                <p style={styles.balanceLabel}>{child?.name}s saldo</p>
                <p style={{
                  ...styles.balanceAmount,
                  color: balance >= 0 ? C.text : C.error,
                }}>
                  {formatKr(balance)}
                </p>
              </div>
            </div>

            {/* Week summary */}
            <div style={styles.weekRow}>
              {week.base > 0 && (
                <div style={styles.weekItem}>
                  <span style={styles.weekItemLabel}>Veckopeng</span>
                  <span style={{ ...styles.weekItemValue, color: C.success }}>
                    +{formatKr(week.base)}
                  </span>
                </div>
              )}
              {week.bonus > 0 && (
                <div style={styles.weekItem}>
                  <span style={styles.weekItemLabel}>Bonus</span>
                  <span style={{ ...styles.weekItemValue, color: C.primary }}>
                    +{formatKr(week.bonus)}
                  </span>
                </div>
              )}
              {week.spent < 0 && (
                <div style={styles.weekItem}>
                  <span style={styles.weekItemLabel}>Uttag/köp</span>
                  <span style={{ ...styles.weekItemValue, color: C.error }}>
                    {formatKr(week.spent)}
                  </span>
                </div>
              )}
              {week.base === 0 && week.bonus === 0 && week.spent === 0 && (
                <p style={styles.weekEmpty}>Inga transaktioner denna vecka ännu</p>
              )}
            </div>
          </div>

          {/* Parent actions */}
          {isParent && (
            <div style={styles.actionRow}>
              <button
                onClick={() => { setShowAddTx(!showAddTx); setTxForm({ amount: '', type: 'gift', description: '' }); }}
                style={{ ...S.button, ...S.buttonPrimary, flex: 1, padding: '10px 12px' }}
              >
                <Plus size={16} /> Lägg till
              </button>
              <button
                onClick={() => { setShowAddTx(true); setTxForm({ amount: '', type: 'withdrawal', description: 'Utbetalning' }); }}
                style={{ ...S.button, ...S.buttonSecondary, flex: 1, padding: '10px 12px' }}
              >
                <ArrowUpCircle size={16} /> Betala ut
              </button>
            </div>
          )}

          {/* Add transaction form */}
          {showAddTx && isParent && (
            <div style={styles.txForm}>
              <div style={styles.txTypeRow}>
                {[
                  { value: 'gift', label: '🎁 Gåva' },
                  { value: 'base_allowance', label: '💰 Veckopeng' },
                  { value: 'chore_bonus', label: '⭐ Bonus' },
                  { value: 'withdrawal', label: '💸 Utbetalning' },
                  { value: 'spent', label: '🛍️ Köp' },
                  { value: 'saving', label: '🐷 Sparande' },
                ].map(t => (
                  <button
                    key={t.value}
                    onClick={() => setTxForm(prev => ({ ...prev, type: t.value }))}
                    style={{
                      ...styles.txTypeBtn,
                      background: txForm.type === t.value ? C.primaryLight : C.bgCard,
                      border: txForm.type === t.value ? `2px solid ${C.primary}` : `2px solid ${C.border}`,
                    }}
                  >
                    {t.label}
                  </button>
                ))}
              </div>

              <div style={styles.txInputRow}>
                <input
                  type="number"
                  placeholder="Belopp (kr)"
                  value={txForm.amount}
                  onChange={e => setTxForm(prev => ({ ...prev, amount: e.target.value }))}
                  style={{ ...S.input, flex: 1 }}
                  min="0"
                  step="1"
                />
              </div>

              <input
                type="text"
                placeholder="Beskrivning (valfritt)"
                value={txForm.description}
                onChange={e => setTxForm(prev => ({ ...prev, description: e.target.value }))}
                style={{ ...S.input, marginTop: 8 }}
              />

              <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                <button
                  onClick={() => setShowAddTx(false)}
                  style={{ ...S.button, ...S.buttonSecondary, flex: 1 }}
                >
                  Avbryt
                </button>
                <button
                  onClick={handleAddTx}
                  disabled={saving || !txForm.amount}
                  style={{
                    ...S.button, ...S.buttonPrimary, flex: 1,
                    opacity: saving || !txForm.amount ? 0.5 : 1,
                  }}
                >
                  {saving ? 'Sparar...' : 'Spara'}
                </button>
              </div>
            </div>
          )}

          {/* Savings goals */}
          {goals.length > 0 && (
            <div style={styles.section}>
              <h2 style={styles.sectionTitle}>
                <PiggyBank size={18} color={C.primary} /> Sparmål
              </h2>
              {goals.map(goal => (
                <SavingsGoal
                  key={goal.id}
                  goal={goal}
                  saved={goalProgress(goal)}
                  members={members}
                />
              ))}
            </div>
          )}

          {/* Transactions */}
          <div style={styles.section}>
            <h2 style={styles.sectionTitle}>
              <TrendingUp size={18} color={C.primary} /> Historik
            </h2>
            {transactions.length === 0 ? (
              <p style={styles.emptyText}>Inga transaktioner ännu</p>
            ) : (
              <>
                {visibleTx.map(tx => {
                  const info = TX_ICONS[tx.type] || TX_ICONS.gift;
                  const isPositive = tx.amount > 0;
                  return (
                    <div key={tx.id} style={styles.txRow}>
                      <span style={styles.txIcon}>{info.icon}</span>
                      <div style={styles.txContent}>
                        <span style={styles.txLabel}>
                          {tx.description || info.label}
                        </span>
                        <span style={styles.txDate}>
                          {new Date(tx.created_at).toLocaleDateString('sv-SE')}
                        </span>
                      </div>
                      <span style={{
                        ...styles.txAmount,
                        color: isPositive ? C.success : C.error,
                      }}>
                        {isPositive ? '+' : ''}{formatKr(tx.amount)}
                      </span>
                    </div>
                  );
                })}
                {transactions.length > 8 && (
                  <button
                    onClick={() => setShowAllTx(!showAllTx)}
                    style={styles.showMoreBtn}
                  >
                    {showAllTx ? (
                      <><ChevronUp size={14} /> Visa färre</>
                    ) : (
                      <><ChevronDown size={14} /> Visa alla ({transactions.length})</>
                    )}
                  </button>
                )}
              </>
            )}
          </div>
        </>
      )}

      <div style={{ height: 80 }} />
    </div>
  );
}

const styles = {
  page: {
    minHeight: '100vh',
    background: C.bg,
    fontFamily: F.body,
  },
  header: {
    padding: '16px 16px 8px',
  },
  pageTitle: {
    fontFamily: F.heading,
    fontSize: F.sizes.xl,
    fontWeight: F.weights.extra,
    color: C.text,
    margin: 0,
  },
  childRow: {
    display: 'flex',
    gap: 8,
    padding: '8px 16px',
    overflowX: 'auto',
  },
  childBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    padding: '8px 14px',
    borderRadius: 12,
    cursor: 'pointer',
    whiteSpace: 'nowrap',
    fontFamily: F.heading,
    fontSize: F.sizes.sm,
    fontWeight: F.weights.bold,
  },
  childName: {
    fontSize: F.sizes.sm,
  },
  loadingText: {
    textAlign: 'center',
    color: C.textMuted,
    padding: 32,
  },
  balanceCard: {
    margin: '8px 16px',
    padding: 20,
    background: C.bgCard,
    borderRadius: 16,
    border: `1px solid ${C.borderLight}`,
    boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
  },
  balanceTop: {
    display: 'flex',
    alignItems: 'center',
    gap: 14,
    marginBottom: 16,
  },
  balanceAvatar: {
    fontSize: 40,
  },
  balanceLabel: {
    fontSize: F.sizes.sm,
    color: C.textMuted,
    margin: '0 0 2px',
  },
  balanceAmount: {
    fontFamily: F.heading,
    fontSize: F.sizes.hero,
    fontWeight: F.weights.extra,
    margin: 0,
  },
  weekRow: {
    display: 'flex',
    gap: 12,
    paddingTop: 14,
    borderTop: `1px solid ${C.borderLight}`,
  },
  weekItem: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    gap: 2,
  },
  weekItemLabel: {
    fontSize: F.sizes.xs,
    color: C.textMuted,
  },
  weekItemValue: {
    fontSize: F.sizes.md,
    fontWeight: F.weights.bold,
    fontFamily: F.heading,
  },
  weekEmpty: {
    fontSize: F.sizes.xs,
    color: C.textMuted,
    margin: 0,
  },
  actionRow: {
    display: 'flex',
    gap: 8,
    padding: '8px 16px',
  },
  txForm: {
    margin: '4px 16px 12px',
    padding: 16,
    background: C.bgCard,
    borderRadius: 14,
    border: `1px solid ${C.border}`,
  },
  txTypeRow: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 12,
  },
  txTypeBtn: {
    padding: '6px 10px',
    borderRadius: 8,
    fontSize: F.sizes.xs,
    fontWeight: F.weights.bold,
    fontFamily: F.heading,
    cursor: 'pointer',
  },
  txInputRow: {
    display: 'flex',
    gap: 8,
  },
  section: {
    padding: '12px 16px 0',
  },
  sectionTitle: {
    fontFamily: F.heading,
    fontSize: F.sizes.md,
    fontWeight: F.weights.bold,
    color: C.text,
    margin: '0 0 10px',
    display: 'flex',
    alignItems: 'center',
    gap: 6,
  },
  txRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    padding: '10px 0',
    borderBottom: `1px solid ${C.borderLight}`,
  },
  txIcon: {
    fontSize: 20,
    flexShrink: 0,
  },
  txContent: {
    flex: 1,
    minWidth: 0,
  },
  txLabel: {
    display: 'block',
    fontSize: F.sizes.sm,
    color: C.text,
    fontWeight: F.weights.semi,
  },
  txDate: {
    fontSize: F.sizes.xs,
    color: C.textMuted,
  },
  txAmount: {
    fontSize: F.sizes.md,
    fontWeight: F.weights.bold,
    fontFamily: F.heading,
    flexShrink: 0,
  },
  showMoreBtn: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    width: '100%',
    padding: '10px 0',
    background: 'none',
    border: 'none',
    color: C.primary,
    fontSize: F.sizes.sm,
    fontWeight: F.weights.bold,
    fontFamily: F.heading,
    cursor: 'pointer',
  },
  emptyState: {
    textAlign: 'center',
    padding: '40px 20px',
  },
  emptyTitle: {
    fontFamily: F.heading,
    fontSize: F.sizes.lg,
    fontWeight: F.weights.bold,
    color: C.text,
    margin: '12px 0 4px',
  },
  emptyText: {
    fontSize: F.sizes.sm,
    color: C.textMuted,
    margin: '4px 0',
  },
};
