// ============================================
// FamTastic — MoneyView (parent: payout overview + per-child view)
// ============================================

import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { C, F, S, formatKr } from '../data';
import { SavingsGoal } from './SavingsGoal';
import { AllocateMoney } from './AllocateMoney';
import { FamilyGoalCard } from './FamilyGoalCard';
import { CreateFamilyGoal } from './CreateFamilyGoal';
import { PiggyBank, Plus, ChevronDown, ChevronUp, Wallet, Target, CreditCard, CheckCircle, Circle } from 'lucide-react';
import { BgShapes } from '../BgShapes';

const TX_LABELS = {
  base_allowance: { icon: '💰', label: 'Veckopeng' },
  chore_bonus: { icon: '⭐', label: 'Syssla-bonus' },
  saving: { icon: '🐷', label: 'Sparande' },
  withdrawal: { icon: '💸', label: 'Uttag' },
  gift: { icon: '🎁', label: 'Gåva' },
  spent: { icon: '🛍️', label: 'Köp' },
  family_goal: { icon: '🎯', label: 'Familjemål' },
};


export function MoneyView({ familyId, member, members, stacked }) {
  const [selectedChild, setSelectedChild] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [allChildrenTx, setAllChildrenTx] = useState([]);
  const [goals, setGoals] = useState([]);
  const [familyGoals, setFamilyGoals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddTx, setShowAddTx] = useState(false);
  const [txForm, setTxForm] = useState({ amount: '', type: 'gift', description: '' });
  const [saving, setSaving] = useState(false);
  const [showAllTx, setShowAllTx] = useState(false);
  const [showAllocate, setShowAllocate] = useState(false);
  const [showCreateGoal, setShowCreateGoal] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [paidOut, setPaidOut] = useState({});

  const isParent = member.role === 'admin' || member.role === 'parent';
  const children = members.filter(m => m.role === 'child');

  const now = new Date();
  const dayNum = now.getDay() || 7;
  const monday = new Date(now);
  monday.setDate(now.getDate() - dayNum + 1);
  monday.setHours(0, 0, 0, 0);

  useEffect(() => {
    if (children.length > 0 && !selectedChild) setSelectedChild(children[0].id);
    loadFamilyGoals();
    if (isParent) loadAllChildrenTx();
  }, [members]);

  useEffect(() => {
    if (selectedChild) loadChildData();
  }, [selectedChild, familyId]);

  async function loadFamilyGoals() {
    const { data } = await supabase.from('savings_goals').select('*')
      .eq('family_id', familyId).eq('is_family_goal', true).is('achieved_at', null);
    setFamilyGoals(data || []);
  }

  async function loadAllChildrenTx() {
    const { data } = await supabase.from('money_transactions').select('*')
      .eq('family_id', familyId)
      .gte('created_at', monday.toISOString())
      .order('created_at', { ascending: false });
    setAllChildrenTx(data || []);
  }

  async function loadChildData() {
    setLoading(true);
    const [txRes, goalRes] = await Promise.all([
      supabase.from('money_transactions').select('*').eq('family_id', familyId)
        .eq('member_id', selectedChild).order('created_at', { ascending: false }).limit(50),
      supabase.from('savings_goals').select('*').eq('family_id', familyId)
        .eq('member_id', selectedChild).eq('is_family_goal', false).is('achieved_at', null),
    ]);
    const txData = txRes.data || [];
    const goalData = (goalRes.data || []).map(g => ({
      ...g,
      _saved: txData.filter(tx => tx.savings_goal_id === g.id).reduce((s, tx) => s + Math.abs(tx.amount), 0),
    }));
    setTransactions(txData);
    setGoals(goalData);
    setLoading(false);
  }

  async function handleDeleteChildGoal(goal) {
    // Lossa alla transaktioner kopplade till målet → fri sparande
    await supabase.from('money_transactions')
      .update({ savings_goal_id: null })
      .eq('savings_goal_id', goal.id)
      .eq('family_id', familyId);
    // Ta bort målet
    await supabase.from('savings_goals').delete().eq('id', goal.id);
    loadAll();
  }

  function loadAll() { loadChildData(); loadFamilyGoals(); loadAllChildrenTx(); setRefreshKey(k => k + 1); }
  function getBalance() { return transactions.reduce((s, tx) => s + tx.amount, 0); }

  function getWeekSummary() {
    const weekTx = transactions.filter(tx => new Date(tx.created_at) >= monday);
    return {
      base: weekTx.filter(tx => tx.type === 'base_allowance').reduce((s, tx) => s + tx.amount, 0),
      bonus: weekTx.filter(tx => tx.type === 'chore_bonus').reduce((s, tx) => s + tx.amount, 0),
      spent: weekTx.filter(tx => tx.amount < 0).reduce((s, tx) => s + tx.amount, 0),
    };
  }

  function getPayoutSummary() {
    return children.map(child => {
      const childTx = allChildrenTx.filter(tx => tx.member_id === child.id);
      const base = childTx.filter(tx => tx.type === 'base_allowance').reduce((s, tx) => s + tx.amount, 0);
      const bonus = childTx.filter(tx => tx.type === 'chore_bonus').reduce((s, tx) => s + tx.amount, 0);
      const withdrawals = childTx.filter(tx => tx.type === 'withdrawal').reduce((s, tx) => s + Math.abs(tx.amount), 0);
      return { child, base, bonus, withdrawals, total: base + bonus };
    });
  }

  async function handleAddTx() {
    if (!txForm.amount || Number(txForm.amount) === 0) return;
    setSaving(true);
    const isNeg = ['withdrawal', 'spent', 'saving', 'family_goal'].includes(txForm.type);
    const ore = Math.round(Math.abs(Number(txForm.amount)) * 100);
    await supabase.from('money_transactions').insert({
      family_id: familyId, member_id: selectedChild,
      amount: isNeg ? -ore : ore, type: txForm.type,
      description: txForm.description.trim() || null,
    });
    setTxForm({ amount: '', type: 'gift', description: '' });
    setShowAddTx(false);
    setSaving(false);
    loadAll();
  }

  const balance = getBalance();
  const week = getWeekSummary();
  const child = members.find(m => m.id === selectedChild);
  const visibleTx = showAllTx ? transactions : transactions.slice(0, 8);
  const payoutData = isParent ? getPayoutSummary() : [];

  if (children.length === 0) {
    return (
      <div style={{ ...styles.page, ...(stacked && { minHeight: 'auto', paddingBottom: 0 }) }}>
        <div style={{ position: 'relative', zIndex: 1 }}>
          <div style={S.emptyState}>
            <span style={{ fontSize: 48 }}>💰</span>
            <p style={styles.emptyTitle}>Inga barn tillagda</p>
          </div>
          <div style={{ height: 80 }} />
        </div>
      </div>
    );
  }

  return (
    <div style={{ ...styles.page, ...(stacked && { minHeight: 'auto', paddingBottom: 0 }) }}>
      <BgShapes variant="money" />
      <div style={styles.headerZone}>
        <div style={styles.header}>
          <h1 style={styles.pageTitle}>Pengar</h1>
        </div>
      </div>

      <div style={{ position: 'relative', zIndex: 1 }}>

        {/* === PAYOUT OVERVIEW (parent only) === */}
        {isParent && payoutData.some(p => p.total > 0 || p.withdrawals > 0) && (
          <div style={styles.payoutCard}>
            <div style={styles.payoutHeader}>
              <CreditCard size={18} color={C.primary} />
              <span style={styles.payoutTitle}>Denna vecka</span>
            </div>
            {payoutData.map(p => {
              if (p.total === 0 && p.withdrawals === 0) return null;
              const key = p.child.id;
              return (
                <div key={key} style={styles.payoutRow}>
                  <button onClick={() => setPaidOut(prev => ({ ...prev, [key]: !prev[key] }))} style={styles.payoutCheck}>
                    {paidOut[key] ? <CheckCircle size={22} color={C.success} /> : <Circle size={22} color={C.border} />}
                  </button>
                  <span style={styles.payoutAvatar}>{p.child.avatar}</span>
                  <div style={styles.payoutInfo}>
                    <span style={{ ...styles.payoutName, textDecoration: paidOut[key] ? 'line-through' : 'none', color: paidOut[key] ? C.textMuted : C.text }}>{p.child.name}</span>
                    <span style={styles.payoutDetail}>
                      {p.base > 0 && `Veckopeng ${formatKr(p.base)}`}
                      {p.base > 0 && p.bonus > 0 && ' + '}
                      {p.bonus > 0 && `Bonus ${formatKr(p.bonus)}`}
                      {p.withdrawals > 0 && ` · Uttag ${formatKr(p.withdrawals)}`}
                    </span>
                  </div>
                  <span style={{ ...styles.payoutAmount, color: paidOut[key] ? C.textMuted : C.primaryDark }}>
                    {formatKr(p.total)}
                  </span>
                </div>
              );
            })}
          </div>
        )}

        {/* Family goal */}
        {familyGoals.length > 0 && (
          <div style={styles.section}>
            {familyGoals.map(fg => (
              <FamilyGoalCard key={fg.id + '-' + refreshKey} goal={fg} familyId={familyId} members={members} />
            ))}
          </div>
        )}

        {isParent && familyGoals.length === 0 && (
          <div style={styles.section}>
            <button onClick={() => setShowCreateGoal(true)} style={styles.createGoalBtn}>
              <Target size={20} color={C.primary} />
              <div>
                <span style={styles.createGoalTitle}>Skapa familjemål</span>
                <span style={styles.createGoalDesc}>Hela familjen sparar tillsammans!</span>
              </div>
            </button>
          </div>
        )}

        {/* Child selector */}
        {children.length > 1 && (
          <div style={styles.childRow}>
            {children.map(c => (
              <button key={c.id}
                onClick={() => { setSelectedChild(c.id); setShowAllTx(false); }}
                style={{
                  ...styles.childBtn,
                  background: selectedChild === c.id ? (c.color || C.primary) : C.bgCard,
                  color: selectedChild === c.id ? '#fff' : C.text,
                  borderColor: selectedChild === c.id ? (c.color || C.primary) : C.border,
                }}>
                <span style={{ fontSize: 18 }}>{c.avatar}</span>
                <span>{c.name}</span>
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
                <span style={{ fontSize: 36 }}>{child?.avatar}</span>
                <div>
                  <p style={styles.balanceLabel}>{child?.name}s saldo</p>
                  <p style={{ ...styles.balanceAmount, color: balance >= 0 ? C.text : C.error }}>
                    {formatKr(balance)}
                  </p>
                </div>
              </div>
              <div style={styles.weekRow}>
                {week.base > 0 && (
                  <div style={styles.weekItem}>
                    <span style={styles.weekItemLabel}>Veckopeng</span>
                    <span style={{ ...styles.weekItemVal, color: C.success }}>+{formatKr(week.base)}</span>
                  </div>
                )}
                {week.bonus > 0 && (
                  <div style={styles.weekItem}>
                    <span style={styles.weekItemLabel}>Bonus</span>
                    <span style={{ ...styles.weekItemVal, color: C.primary }}>+{formatKr(week.bonus)}</span>
                  </div>
                )}
                {week.spent < 0 && (
                  <div style={styles.weekItem}>
                    <span style={styles.weekItemLabel}>Uttag</span>
                    <span style={{ ...styles.weekItemVal, color: C.error }}>{formatKr(week.spent)}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Actions */}
            <div style={styles.actionRow}>
              {balance > 0 && (
                <button onClick={() => setShowAllocate(true)} style={{ ...styles.actionBtn, background: C.primary, color: '#fff' }}>
                  <Wallet size={16} /> Fördela
                </button>
              )}
              {isParent && (
                <button onClick={() => { setShowAddTx(!showAddTx); setTxForm({ amount: '', type: 'gift', description: '' }); }}
                  style={{ ...styles.actionBtn, background: C.primaryLight, color: C.primaryDark }}>
                  <Plus size={16} /> Lägg till
                </button>
              )}
            </div>

            {/* Add tx form */}
            {showAddTx && isParent && (
              <div style={styles.txForm}>
                <div style={styles.txTypeRow}>
                  {[
                    { v: 'gift', l: '🎁 Gåva' }, { v: 'base_allowance', l: '💰 Veckopeng' },
                    { v: 'chore_bonus', l: '⭐ Bonus' }, { v: 'withdrawal', l: '💸 Uttag' },
                    { v: 'spent', l: '🛍️ Köp' }, { v: 'saving', l: '🐷 Spar' },
                  ].map(t => (
                    <button key={t.v} onClick={() => setTxForm(p => ({ ...p, type: t.v }))} style={{
                      ...styles.txTypeBtn,
                      background: txForm.type === t.v ? C.primaryLight : C.bgCard,
                      borderColor: txForm.type === t.v ? C.primary : C.border,
                    }}>{t.l}</button>
                  ))}
                </div>
                <input type="number" placeholder="Belopp (kr)" value={txForm.amount}
                  onChange={e => setTxForm(p => ({ ...p, amount: e.target.value }))} style={S.input} min="0" />
                <input type="text" placeholder="Beskrivning (valfritt)" value={txForm.description}
                  onChange={e => setTxForm(p => ({ ...p, description: e.target.value }))} style={{ ...S.input, marginTop: 8 }} />
                <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                  <button onClick={() => setShowAddTx(false)} style={{ ...styles.actionBtn, flex: 1, background: C.bgCard, color: C.text, border: `1.5px solid ${C.border}` }}>Avbryt</button>
                  <button onClick={handleAddTx} disabled={saving || !txForm.amount}
                    style={{ ...styles.actionBtn, flex: 1, background: C.primary, color: '#fff', opacity: saving || !txForm.amount ? 0.5 : 1 }}>
                    {saving ? 'Sparar...' : 'Spara'}
                  </button>
                </div>
              </div>
            )}

            {/* Personal goals */}
            {goals.length > 0 && (
              <div style={styles.section}>
                <p style={S.sectionLabel}>Sparmål</p>
                {goals.map(g => (
                  <SavingsGoal
                    key={g.id}
                    goal={g}
                    saved={g._saved || 0}
                    members={members}
                    onDelete={isParent ? handleDeleteChildGoal : null}
                  />
                ))}
              </div>
            )}

            {/* Transactions */}
            <div style={styles.section}>
              <p style={S.sectionLabel}>Historik</p>
              {transactions.length === 0 ? (
                <p style={styles.emptySmall}>Inga transaktioner ännu</p>
              ) : (
                <>
                  {visibleTx.map(tx => {
                    const info = TX_LABELS[tx.type] || TX_LABELS.gift;
                    return (
                      <div key={tx.id} style={styles.txRow}>
                        <span style={styles.txIcon}>{info.icon}</span>
                        <div style={styles.txContent}>
                          <span style={styles.txLabel}>{tx.description || info.label}</span>
                          <span style={styles.txDate}>{new Date(tx.created_at).toLocaleDateString('sv-SE')}</span>
                        </div>
                        <span style={{ ...styles.txAmount, color: tx.amount > 0 ? C.success : C.error }}>
                          {tx.amount > 0 ? '+' : ''}{formatKr(tx.amount)}
                        </span>
                      </div>
                    );
                  })}
                  {transactions.length > 8 && (
                    <button onClick={() => setShowAllTx(!showAllTx)} style={styles.showMoreBtn}>
                      {showAllTx ? <><ChevronUp size={14} /> Visa färre</> : <><ChevronDown size={14} /> Visa alla ({transactions.length})</>}
                    </button>
                  )}
                </>
              )}
            </div>
          </>
        )}

        <div style={{ height: 80 }} />
      </div>

      {showAllocate && (
        <AllocateMoney familyId={familyId} memberId={selectedChild} balance={balance}
          goals={[...goals, ...familyGoals]} onComplete={loadAll} onClose={() => setShowAllocate(false)} />
      )}
      {showCreateGoal && (
        <CreateFamilyGoal familyId={familyId} onCreated={loadAll} onClose={() => setShowCreateGoal(false)} />
      )}
    </div>
  );
}

const styles = {
  page: { minHeight: '100vh', background: C.bg, fontFamily: F.body, position: 'relative', paddingBottom: 'calc(90px + env(safe-area-inset-bottom, 0px))' },
  headerZone: {
    position: 'sticky',
    top: 52,
    zIndex: 10,
    background: 'rgba(255,251,245,0.88)',
    backdropFilter: 'blur(16px)',
    WebkitBackdropFilter: 'blur(16px)',
    borderBottom: '1px solid rgba(255,255,255,0.5)',
    paddingBottom: 8,
  },
  header: { padding: '16px 16px 8px' },
  pageTitle: { fontFamily: F.heading, fontSize: F.sizes.xl, fontWeight: F.weights.extra, color: C.text, margin: 0 },
  section: { padding: '4px 16px 8px' },
  payoutCard: { margin: '4px 16px 12px', padding: 16, background: C.bgCard, borderRadius: 16, border: `1.5px solid ${C.borderLight}`, boxShadow: '0 2px 8px rgba(0,0,0,0.04)' },
  payoutHeader: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 },
  payoutTitle: { fontFamily: F.heading, fontSize: F.sizes.md, fontWeight: F.weights.bold, color: C.text },
  payoutRow: { display: 'flex', alignItems: 'center', gap: 10, padding: '10px 0', borderTop: `1px solid ${C.borderLight}` },
  payoutCheck: { background: 'none', border: 'none', cursor: 'pointer', padding: 0, flexShrink: 0, minWidth: 28, minHeight: 44, display: 'flex', alignItems: 'center' },
  payoutAvatar: { fontSize: 22, flexShrink: 0 },
  payoutInfo: { flex: 1, minWidth: 0 },
  payoutName: { display: 'block', fontSize: F.sizes.sm, fontWeight: F.weights.bold, fontFamily: F.heading, color: C.text },
  payoutDetail: { display: 'block', fontSize: F.sizes.xs, color: C.textMuted, fontFamily: F.heading, marginTop: 2 },
  payoutAmount: { fontSize: F.sizes.lg, fontWeight: F.weights.extra, fontFamily: F.heading, flexShrink: 0 },
  childRow: { display: 'flex', gap: 8, padding: '4px 16px 8px', overflowX: 'auto' },
  childBtn: { display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 99, border: '1.5px solid', cursor: 'pointer', whiteSpace: 'nowrap', fontFamily: F.heading, fontSize: F.sizes.sm, fontWeight: F.weights.bold, minHeight: 40 },
  balanceCard: { margin: '4px 16px 8px', padding: 16, background: C.bgCard, borderRadius: 16, border: `1.5px solid ${C.borderLight}`, boxShadow: '0 2px 8px rgba(0,0,0,0.04)' },
  balanceTop: { display: 'flex', alignItems: 'center', gap: 14, marginBottom: 12 },
  balanceLabel: { fontSize: F.sizes.sm, color: C.textMuted, fontFamily: F.heading, margin: '0 0 2px' },
  balanceAmount: { fontFamily: F.heading, fontSize: F.sizes.hero, fontWeight: F.weights.extra, margin: 0 },
  weekRow: { display: 'flex', gap: 12, paddingTop: 12, borderTop: `1px solid ${C.borderLight}` },
  weekItem: { flex: 1, display: 'flex', flexDirection: 'column', gap: 2 },
  weekItemLabel: { fontSize: F.sizes.xs, color: C.textMuted, fontFamily: F.heading },
  weekItemVal: { fontSize: F.sizes.md, fontWeight: F.weights.bold, fontFamily: F.heading },
  actionRow: { display: 'flex', gap: 8, padding: '4px 16px 8px' },
  actionBtn: { display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '10px 16px', borderRadius: 12, border: 'none', fontSize: F.sizes.sm, fontWeight: F.weights.bold, fontFamily: F.heading, cursor: 'pointer', minHeight: 44, flex: 1 },
  txForm: { margin: '0 16px 12px', padding: 16, background: C.bgCard, borderRadius: 14, border: `1.5px solid ${C.border}` },
  txTypeRow: { display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 12 },
  txTypeBtn: { padding: '8px 12px', borderRadius: 10, border: '1.5px solid', fontSize: F.sizes.xs, fontWeight: F.weights.bold, fontFamily: F.heading, cursor: 'pointer', minHeight: 36 },
  createGoalBtn: { display: 'flex', alignItems: 'center', gap: 14, width: '100%', padding: 16, background: C.bgCard, borderRadius: 16, border: `2px dashed ${C.primary}`, cursor: 'pointer', textAlign: 'left' },
  createGoalTitle: { display: 'block', fontFamily: F.heading, fontSize: F.sizes.md, fontWeight: F.weights.bold, color: C.primaryDark },
  createGoalDesc: { display: 'block', fontSize: F.sizes.xs, color: C.textMuted, fontFamily: F.heading, marginTop: 2 },
  txRow: { display: 'flex', alignItems: 'center', gap: 10, padding: '10px 0', borderBottom: `1px solid ${C.borderLight}` },
  txIcon: { fontSize: 18, flexShrink: 0 },
  txContent: { flex: 1, minWidth: 0 },
  txLabel: { display: 'block', fontSize: F.sizes.sm, fontWeight: F.weights.semi, fontFamily: F.heading, color: C.text },
  txDate: { display: 'block', fontSize: F.sizes.xs, color: C.textMuted },
  txAmount: { fontSize: F.sizes.md, fontWeight: F.weights.bold, fontFamily: F.heading, flexShrink: 0 },
  showMoreBtn: { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, width: '100%', padding: '10px 0', background: 'none', border: 'none', color: C.primary, fontSize: F.sizes.sm, fontWeight: F.weights.bold, fontFamily: F.heading, cursor: 'pointer' },
  emptyTitle: { fontFamily: F.heading, fontSize: F.sizes.lg, fontWeight: F.weights.bold, color: C.text, margin: '12px 0 4px' },
  emptySmall: { fontSize: F.sizes.sm, color: C.textMuted, fontFamily: F.heading },
  loadingText: { textAlign: 'center', color: C.textMuted, padding: 32, fontFamily: F.heading },
};
