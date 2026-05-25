// ============================================
// FamTastic — MoneyView (föräldravy, redesign)
// • Veckopeng-status direkt synlig + en-trycks-betala
// • "Betala alla" knapp
// • Felhantering med tydliga felmeddelanden
// • parent_add_transaction RPC (SECURITY DEFINER)
// • Snabb-knappar: Gåva, Bonus, Uttag, Fördela
// ============================================

import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { C, F, S, formatKr } from '../data';
import { SavingsGoal } from './SavingsGoal';
import { AllocateMoney } from './AllocateMoney';
import { FamilyGoalCard } from './FamilyGoalCard';
import { CreateFamilyGoal } from './CreateFamilyGoal';
import {
  ChevronDown, ChevronUp, Wallet, Target,
  CheckCircle, AlertCircle, X, RotateCcw,
} from 'lucide-react';
import { BgShapes } from '../BgShapes';
import { sendPushToMember } from '../notifications/sendPush';

const TX_LABELS = {
  base_allowance: { icon: '💰', label: 'Veckopeng' },
  chore_bonus:    { icon: '⭐', label: 'Syssla-bonus' },
  saving:         { icon: '🐷', label: 'Sparande' },
  withdrawal:     { icon: '💸', label: 'Uttag' },
  gift:           { icon: '🎁', label: 'Gåva' },
  spent:          { icon: '🛍️', label: 'Köp' },
  family_goal:    { icon: '🎯', label: 'Familjemål' },
};

function weekStart() {
  const d = new Date();
  d.setDate(d.getDate() - (d.getDay() || 7) + 1);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function MoneyView({ familyId, member, members, stacked }) {
  const [selectedChild,  setSelectedChild]  = useState(null);
  const [transactions,   setTransactions]   = useState([]);
  const [goals,          setGoals]          = useState([]);
  const [familyGoals,    setFamilyGoals]    = useState([]);
  const [allowanceRules, setAllowanceRules] = useState([]);
  const [allWeekTx,      setAllWeekTx]      = useState([]);
  const [loading,        setLoading]        = useState(true);
  const [modal,          setModal]          = useState(null); // { txType }
  const [amount,         setAmount]         = useState('');
  const [desc,           setDesc]           = useState('');
  const [saving,         setSaving]         = useState(false);
  const [payingAll,      setPayingAll]      = useState(false);
  const [txError,        setTxError]        = useState('');
  const [showAllTx,      setShowAllTx]      = useState(false);
  const [showAllocate,   setShowAllocate]   = useState(false);
  const [showCreateGoal, setShowCreateGoal] = useState(false);
  const [refreshKey,     setRefreshKey]     = useState(0);

  const isParent = member.role === 'admin' || member.role === 'parent';
  const children = members.filter(m => m.role === 'child');
  const monday   = weekStart();

  // ── Inladdning ──────────────────────────────────────────────────────────────
  useEffect(() => {
    if (children.length > 0 && !selectedChild) setSelectedChild(children[0].id);
    loadFamily();
  }, [members]);  // eslint-disable-line

  useEffect(() => {
    if (selectedChild) loadChildData();
  }, [selectedChild, familyId]);  // eslint-disable-line

  async function loadFamily() {
    const [rulesRes, goalsRes, weekRes] = await Promise.all([
      supabase.from('allowance_rules').select('*').eq('family_id', familyId),
      supabase.from('savings_goals').select('*')
        .eq('family_id', familyId).eq('is_family_goal', true).is('achieved_at', null),
      supabase.from('money_transactions').select('*')
        .eq('family_id', familyId)
        .gte('created_at', monday.toISOString())
        .order('created_at', { ascending: false }),
    ]);
    setAllowanceRules(rulesRes.data || []);
    setFamilyGoals(goalsRes.data   || []);
    setAllWeekTx(weekRes.data      || []);
  }

  async function loadChildData() {
    setLoading(true);
    const [txRes, goalRes] = await Promise.all([
      supabase.from('money_transactions').select('*')
        .eq('family_id', familyId).eq('member_id', selectedChild)
        .order('created_at', { ascending: false }).limit(50),
      supabase.from('savings_goals').select('*')
        .eq('family_id', familyId).eq('member_id', selectedChild)
        .eq('is_family_goal', false).is('achieved_at', null),
    ]);
    const txData   = txRes.data  || [];
    const goalData = (goalRes.data || []).map(g => ({
      ...g,
      _saved: txData
        .filter(tx => tx.savings_goal_id === g.id)
        .reduce((s, tx) => s + Math.abs(tx.amount), 0),
    }));
    setTransactions(txData);
    setGoals(goalData);
    setLoading(false);
  }

  async function handleDeleteChildGoal(goal) {
    await supabase.from('money_transactions')
      .update({ savings_goal_id: null }).eq('savings_goal_id', goal.id).eq('family_id', familyId);
    await supabase.from('savings_goals').delete().eq('id', goal.id);
    loadAll();
  }

  function loadAll() {
    loadFamily();
    loadChildData();
    setRefreshKey(k => k + 1);
  }

  // ── Beräkningar ─────────────────────────────────────────────────────────────
  const balance   = transactions.reduce((s, tx) => s + tx.amount, 0);
  const child     = members.find(m => m.id === selectedChild);
  const childRule = allowanceRules.find(r => r.member_id === selectedChild);
  const visibleTx = showAllTx ? transactions : transactions.slice(0, 8);

  const weekTx    = transactions.filter(tx => new Date(tx.created_at) >= monday);
  const weekBase  = weekTx.filter(tx => tx.type === 'base_allowance').reduce((s, tx) => s + tx.amount, 0);
  const weekBonus = weekTx.filter(tx => tx.type === 'chore_bonus').reduce((s, tx) => s + tx.amount, 0);
  const weekSpent = weekTx.filter(tx => tx.amount < 0).reduce((s, tx) => s + tx.amount, 0);

  function allowancePaid(childId) {
    return allWeekTx.some(tx => tx.member_id === childId && tx.type === 'base_allowance');
  }
  function getRule(childId) {
    return allowanceRules.find(r => r.member_id === childId) || null;
  }
  const unpaidChildren = children.filter(
    c => !allowancePaid(c.id) && (getRule(c.id)?.base_amount || 0) > 0
  );

  // ── Betala veckopeng ─────────────────────────────────────────────────────────
  async function payAllowanceFor(childId) {
    const rule = getRule(childId);
    if (!rule || rule.base_amount <= 0) return;
    const { data, error } = await supabase.rpc('parent_add_transaction', {
      p_family_id:   familyId,
      p_member_id:   childId,
      p_amount_ore:  rule.base_amount,
      p_type:        'base_allowance',
      p_description: 'Veckopeng',
    });
    if (error || !data?.success) throw new Error(error?.message || data?.error || 'Okänt fel');
    sendPushToMember({
      memberId: childId,
      title: '💰 Veckopeng!',
      body:  `Du fick ${rule.base_amount / 100} kr`,
    });
  }

  async function handlePayOne(childId) {
    setSaving(true); setTxError('');
    try {
      await payAllowanceFor(childId);
      loadAll();
    } catch (e) { setTxError(e.message); }
    setSaving(false);
  }

  async function handlePayAll() {
    setPayingAll(true); setTxError('');
    try {
      await Promise.all(unpaidChildren.map(c => payAllowanceFor(c.id)));
      loadAll();
    } catch (e) { setTxError(e.message); }
    setPayingAll(false);
  }

  // ── Lägg till transaktion ────────────────────────────────────────────────────
  async function handleAddTx() {
    if (!amount || Number(amount) === 0) return;
    setSaving(true); setTxError('');
    const isNeg = ['withdrawal', 'spent'].includes(modal.txType);
    const ore   = Math.round(Math.abs(Number(amount)) * 100);
    const { data, error } = await supabase.rpc('parent_add_transaction', {
      p_family_id:   familyId,
      p_member_id:   selectedChild,
      p_amount_ore:  isNeg ? -ore : ore,
      p_type:        modal.txType,
      p_description: desc.trim() || null,
    });
    setSaving(false);
    if (error || !data?.success) {
      setTxError(error?.message || data?.error || 'Något gick fel – försök igen');
      return;
    }
    const kr = ore / 100;
    if (modal.txType === 'gift')
      sendPushToMember({ memberId: selectedChild, title: '🎁 Du fick en gåva', body: `${kr} kr har lagts till` });
    if (modal.txType === 'chore_bonus')
      sendPushToMember({ memberId: selectedChild, title: '⭐ Syssla-bonus!', body: `+${kr} kr` });
    closeModal();
    loadAll();
  }

  function openModal(txType) {
    setModal({ txType }); setAmount(''); setDesc(''); setTxError('');
  }
  function closeModal() {
    setModal(null); setAmount(''); setDesc(''); setTxError('');
  }

  // ── Tom vy ────────────────────────────────────────────────────────────────
  if (children.length === 0) {
    return (
      <div style={{ ...styles.page, ...(stacked && { minHeight: 'auto', paddingBottom: 0 }) }}>
        <div style={{ position: 'relative', zIndex: 1, ...S.emptyState }}>
          <span style={{ fontSize: 48 }}>💰</span>
          <p style={styles.emptyTitle}>Inga barn tillagda</p>
        </div>
      </div>
    );
  }

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div style={{ ...styles.page, ...(stacked && { minHeight: 'auto', paddingBottom: 0 }) }}>
      <style>{`
        @media (max-width: 400px) {
          .mv-qa-row { gap: 6px !important; }
          .mv-qa-btn { padding: 10px 4px !important; }
          .mv-pay-all { font-size: 11px !important; padding: 7px 10px !important; }
        }
      `}</style>
      <BgShapes variant="money" />

      {/* ── HEADER ──────────────────────────────────────────────────────── */}
      <div style={styles.headerZone}>
        <h1 style={styles.pageTitle}>💰 Pengar</h1>
      </div>

      <div style={{ position: 'relative', zIndex: 1 }}>

        {/* ── FELMEDDELANDE ────────────────────────────────────────────── */}
        {txError && (
          <div style={styles.errorBanner}>
            <AlertCircle size={16} color={C.error} />
            <span style={{ flex: 1, fontSize: F.sizes.sm }}>{txError}</span>
            <button onClick={() => setTxError('')} style={styles.errorClose}>
              <X size={14} color={C.error} />
            </button>
          </div>
        )}

        {/* ══ VECKOPENG-SEKTION ═══════════════════════════════════════════ */}
        <div style={styles.allowanceCard}>
          <div style={styles.allowanceTop}>
            <span style={styles.allowanceTitle}>📅 Veckopeng denna vecka</span>
            {unpaidChildren.length > 1 && (
              <button className="mv-pay-all" onClick={handlePayAll}
                disabled={payingAll}
                style={styles.payAllBtn}>
                {payingAll ? '...' : `Betala alla (${unpaidChildren.length})`}
              </button>
            )}
          </div>

          {children.map((c, idx) => {
            const rule = getRule(c.id);
            const paid = allowancePaid(c.id);
            return (
              <div key={c.id} style={{
                ...styles.allowanceRow,
                borderTop: idx === 0 ? `1px solid ${C.borderLight}` : `1px solid ${C.borderLight}`,
              }}>
                <span style={{ fontSize: 24, flexShrink: 0 }}>{c.avatar}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <span style={styles.allowanceChildName}>{c.name}</span>
                  <span style={{
                    ...styles.allowanceChildSub,
                    color: paid ? C.success : rule ? C.textMuted : C.textLight,
                  }}>
                    {paid
                      ? '✅ Betald denna vecka'
                      : rule
                        ? `${rule.base_amount / 100} kr att betala`
                        : 'Ingen veckopeng inställd'}
                  </span>
                </div>
                {!paid && rule?.base_amount > 0 ? (
                  <button
                    onClick={() => handlePayOne(c.id)}
                    disabled={saving || payingAll}
                    style={styles.payOneBtn}>
                    💰 {rule.base_amount / 100} kr
                  </button>
                ) : paid ? (
                  <CheckCircle size={22} color={C.success} style={{ flexShrink: 0 }} />
                ) : null}
              </div>
            );
          })}
        </div>

        {/* ── FAMILJEMÅL ───────────────────────────────────────────────── */}
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
              <Target size={18} color={C.primary} />
              <div>
                <span style={styles.createGoalTitle}>Skapa familjemål</span>
                <span style={styles.createGoalDesc}>Hela familjen sparar tillsammans!</span>
              </div>
            </button>
          </div>
        )}

        {/* ── BARNFLIKAR ───────────────────────────────────────────────── */}
        {children.length > 1 && (
          <div style={styles.childTabs}>
            {children.map(c => (
              <button key={c.id}
                onClick={() => { setSelectedChild(c.id); setShowAllTx(false); }}
                style={{
                  ...styles.childTab,
                  background:  selectedChild === c.id ? (c.color || C.primary) : C.bgCard,
                  color:       selectedChild === c.id ? '#fff' : C.text,
                  borderColor: selectedChild === c.id ? (c.color || C.primary) : C.border,
                }}>
                <span style={{ fontSize: 16 }}>{c.avatar}</span>
                <span>{c.name}</span>
              </button>
            ))}
          </div>
        )}

        {loading ? (
          <div style={styles.loadingWrap}>
            <RotateCcw size={20} color={C.textMuted} style={{ animation: 'spin 1s linear infinite' }} />
            <p style={styles.loadingText}>Laddar...</p>
          </div>
        ) : (
          <>
            {/* ── SALDO ─────────────────────────────────────────────────── */}
            <div style={styles.balanceCard}>
              <div style={styles.balanceTop}>
                <span style={{ fontSize: 34 }}>{child?.avatar}</span>
                <div>
                  <p style={styles.balanceLabel}>{child?.name}s saldo</p>
                  <p style={{ ...styles.balanceAmount, color: balance >= 0 ? C.text : C.error }}>
                    {formatKr(balance)}
                  </p>
                </div>
              </div>
              {(weekBase > 0 || weekBonus > 0 || weekSpent < 0) && (
                <div style={styles.weekRow}>
                  {weekBase > 0 && (
                    <div style={styles.weekItem}>
                      <span style={styles.weekLbl}>Veckopeng</span>
                      <span style={{ ...styles.weekVal, color: C.success }}>+{formatKr(weekBase)}</span>
                    </div>
                  )}
                  {weekBonus > 0 && (
                    <div style={styles.weekItem}>
                      <span style={styles.weekLbl}>Bonus</span>
                      <span style={{ ...styles.weekVal, color: C.primary }}>+{formatKr(weekBonus)}</span>
                    </div>
                  )}
                  {weekSpent < 0 && (
                    <div style={styles.weekItem}>
                      <span style={styles.weekLbl}>Uttag/Köp</span>
                      <span style={{ ...styles.weekVal, color: C.error }}>{formatKr(weekSpent)}</span>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* ── SNABB-KNAPPAR ──────────────────────────────────────────── */}
            {isParent && (
              <div className="mv-qa-row" style={styles.qaRow}>
                <button className="mv-qa-btn" onClick={() => openModal('gift')}
                  style={{ ...styles.qaBtn, background: '#FFFBEB', borderColor: C.accent }}>
                  <span style={styles.qaEmoji}>🎁</span>
                  <span style={styles.qaTxt}>Gåva</span>
                </button>
                <button className="mv-qa-btn" onClick={() => openModal('chore_bonus')}
                  style={{ ...styles.qaBtn, background: C.secondaryLight, borderColor: C.secondary }}>
                  <span style={styles.qaEmoji}>⭐</span>
                  <span style={styles.qaTxt}>Bonus</span>
                </button>
                <button className="mv-qa-btn" onClick={() => openModal('withdrawal')}
                  style={{ ...styles.qaBtn, background: C.errorLight, borderColor: C.error }}>
                  <span style={styles.qaEmoji}>💸</span>
                  <span style={styles.qaTxt}>Uttag</span>
                </button>
                {balance > 0 && (
                  <button className="mv-qa-btn" onClick={() => setShowAllocate(true)}
                    style={{ ...styles.qaBtn, background: C.secondaryLight, borderColor: C.secondary }}>
                    <Wallet size={20} color={C.secondary} style={{ marginBottom: 2 }} />
                    <span style={styles.qaTxt}>Fördela</span>
                  </button>
                )}
              </div>
            )}

            {/* ── SPARMÅL ────────────────────────────────────────────────── */}
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

            {/* ── HISTORIK ───────────────────────────────────────────────── */}
            <div style={styles.section}>
              <p style={S.sectionLabel}>Historik</p>
              {transactions.length === 0 ? (
                <div style={styles.emptyHistorik}>
                  <span style={{ fontSize: 32 }}>📭</span>
                  <p style={styles.emptySmall}>Inga transaktioner ännu</p>
                  <p style={{ ...styles.emptySmall, color: C.textLight, marginTop: 4 }}>
                    Betala veckopeng ovan för att komma igång!
                  </p>
                </div>
              ) : (
                <>
                  {visibleTx.map(tx => {
                    const info = TX_LABELS[tx.type] || TX_LABELS.gift;
                    return (
                      <div key={tx.id} style={styles.txRow}>
                        <span style={styles.txIcon}>{info.icon}</span>
                        <div style={styles.txContent}>
                          <span style={styles.txLabel}>{tx.description || info.label}</span>
                          <span style={styles.txDate}>
                            {new Date(tx.created_at).toLocaleDateString('sv-SE')}
                          </span>
                        </div>
                        <span style={{ ...styles.txAmt, color: tx.amount > 0 ? C.success : C.error }}>
                          {tx.amount > 0 ? '+' : ''}{formatKr(tx.amount)}
                        </span>
                      </div>
                    );
                  })}
                  {transactions.length > 8 && (
                    <button onClick={() => setShowAllTx(v => !v)} style={styles.showMoreBtn}>
                      {showAllTx
                        ? <><ChevronUp size={14} /> Visa färre</>
                        : <><ChevronDown size={14} /> Visa alla ({transactions.length})</>}
                    </button>
                  )}
                </>
              )}
            </div>
          </>
        )}

        <div style={{ height: 80 }} />
      </div>

      {/* ══ MODAL: LÄGG TILL TRANSAKTION ════════════════════════════════════ */}
      {modal && (
        <div style={styles.overlay} onClick={closeModal}>
          <div style={styles.sheet} onClick={e => e.stopPropagation()}>
            <div style={styles.sheetHandle} />
            <div style={styles.sheetHeader}>
              <h2 style={styles.sheetTitle}>
                {modal.txType === 'gift'        ? '🎁 Ge gåva'            :
                 modal.txType === 'chore_bonus'  ? '⭐ Syssla-bonus'       :
                 modal.txType === 'withdrawal'   ? '💸 Registrera uttag'   : '💰 Lägg till'}
              </h2>
              <button onClick={closeModal} style={styles.sheetClose}>
                <X size={20} color={C.textMuted} />
              </button>
            </div>
            <p style={styles.sheetSub}>till {child?.avatar} {child?.name}</p>

            {/* Snabbbelopp */}
            <div style={styles.quickAmtRow}>
              {[50, 100, 150, 200].map(v => (
                <button key={v} onClick={() => setAmount(String(v))}
                  style={{
                    ...styles.quickAmtBtn,
                    background:  amount === String(v) ? C.primary : C.bgCard,
                    color:       amount === String(v) ? '#fff'     : C.text,
                    borderColor: amount === String(v) ? C.primary  : C.border,
                  }}>
                  {v} kr
                </button>
              ))}
            </div>

            <input
              type="number"
              placeholder="Eller ange belopp (kr)"
              value={amount}
              onChange={e => setAmount(e.target.value)}
              style={{ ...S.input, marginBottom: 10 }}
              min="0"
              inputMode="numeric"
            />

            {modal.txType !== 'withdrawal' && (
              <input
                type="text"
                placeholder="Beskrivning (valfritt)"
                value={desc}
                onChange={e => setDesc(e.target.value)}
                style={{ ...S.input, marginBottom: 12 }}
              />
            )}

            {txError && (
              <div style={styles.sheetError}>
                <AlertCircle size={14} color={C.error} />
                <span>{txError}</span>
              </div>
            )}

            <button
              onClick={handleAddTx}
              disabled={saving || !amount || Number(amount) === 0}
              style={{
                ...S.button, ...S.buttonPrimary, width: '100%',
                opacity: saving || !amount || Number(amount) === 0 ? 0.5 : 1,
              }}>
              {saving ? 'Sparar...' : 'Bekräfta'}
            </button>
          </div>
        </div>
      )}

      {showAllocate && (
        <AllocateMoney
          familyId={familyId} memberId={selectedChild} balance={balance}
          goals={[...goals, ...familyGoals]} onComplete={loadAll}
          onClose={() => setShowAllocate(false)} />
      )}
      {showCreateGoal && (
        <CreateFamilyGoal familyId={familyId} onCreated={loadAll} onClose={() => setShowCreateGoal(false)} />
      )}
    </div>
  );
}

// ── Styles ───────────────────────────────────────────────────────────────────
const styles = {
  page: {
    minHeight: '100vh', background: C.bg, fontFamily: F.body,
    position: 'relative', paddingBottom: 'calc(90px + env(safe-area-inset-bottom, 0px))',
  },
  headerZone: {
    position: 'sticky', top: 52, zIndex: 10,
    background: 'rgba(255,251,245,0.92)', backdropFilter: 'blur(16px)',
    WebkitBackdropFilter: 'blur(16px)', borderBottom: '1px solid rgba(255,255,255,0.5)',
    padding: '12px 16px 10px',
  },
  pageTitle: {
    fontFamily: F.heading, fontSize: F.sizes.xl, fontWeight: F.weights.extra,
    color: C.text, margin: 0,
  },

  // ── Veckopeng ──
  allowanceCard: {
    margin: '12px 16px', padding: '14px 16px', background: C.bgCard,
    borderRadius: 18, border: `1.5px solid ${C.borderLight}`,
    boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
  },
  allowanceTop: {
    display: 'flex', alignItems: 'center',
    justifyContent: 'space-between', marginBottom: 8,
  },
  allowanceTitle: {
    fontFamily: F.heading, fontSize: F.sizes.md, fontWeight: F.weights.bold, color: C.text,
  },
  payAllBtn: {
    padding: '8px 14px', borderRadius: 10, border: 'none',
    background: C.primary, color: '#fff', fontSize: F.sizes.xs,
    fontWeight: F.weights.bold, fontFamily: F.heading, cursor: 'pointer',
    minHeight: 36, WebkitTapHighlightColor: 'transparent',
  },
  allowanceRow: {
    display: 'flex', alignItems: 'center', gap: 10,
    padding: '10px 0', borderTop: `1px solid ${C.borderLight}`,
  },
  allowanceChildName: {
    display: 'block', fontSize: F.sizes.sm, fontWeight: F.weights.bold,
    fontFamily: F.heading, color: C.text,
  },
  allowanceChildSub: {
    display: 'block', fontSize: F.sizes.xs, fontFamily: F.heading, marginTop: 2,
  },
  payOneBtn: {
    flexShrink: 0, padding: '9px 14px', borderRadius: 10, border: 'none',
    background: C.primary, color: '#fff', fontSize: F.sizes.sm,
    fontWeight: F.weights.bold, fontFamily: F.heading, cursor: 'pointer',
    minHeight: 40, WebkitTapHighlightColor: 'transparent',
  },

  // ── Fel ──
  errorBanner: {
    display: 'flex', alignItems: 'center', gap: 8,
    margin: '4px 16px 0', padding: '10px 14px',
    background: C.errorLight, borderRadius: 12, border: `1.5px solid ${C.error}`,
    color: C.error, fontFamily: F.heading,
  },
  errorClose: {
    background: 'none', border: 'none', cursor: 'pointer', padding: 2,
    display: 'flex', alignItems: 'center',
  },

  // ── Section ──
  section: { padding: '4px 16px 8px' },
  createGoalBtn: {
    display: 'flex', alignItems: 'center', gap: 14, width: '100%',
    padding: 16, background: C.bgCard, borderRadius: 16,
    border: `2px dashed ${C.primary}`, cursor: 'pointer', textAlign: 'left',
    WebkitTapHighlightColor: 'transparent',
  },
  createGoalTitle: {
    display: 'block', fontFamily: F.heading, fontSize: F.sizes.md,
    fontWeight: F.weights.bold, color: C.primaryDark,
  },
  createGoalDesc: {
    display: 'block', fontSize: F.sizes.xs, color: C.textMuted, fontFamily: F.heading, marginTop: 2,
  },

  // ── Barnflikar ──
  childTabs: {
    display: 'flex', gap: 8, padding: '4px 16px 8px', overflowX: 'auto',
  },
  childTab: {
    display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px',
    borderRadius: 99, border: '1.5px solid', cursor: 'pointer', whiteSpace: 'nowrap',
    fontFamily: F.heading, fontSize: F.sizes.sm, fontWeight: F.weights.bold,
    minHeight: 40, WebkitTapHighlightColor: 'transparent',
  },

  // ── Saldo ──
  balanceCard: {
    margin: '4px 16px 8px', padding: 16, background: C.bgCard, borderRadius: 16,
    border: `1.5px solid ${C.borderLight}`, boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
  },
  balanceTop:   { display: 'flex', alignItems: 'center', gap: 14, marginBottom: 10 },
  balanceLabel: { fontSize: F.sizes.sm, color: C.textMuted, fontFamily: F.heading, margin: '0 0 2px' },
  balanceAmount: { fontFamily: F.heading, fontSize: F.sizes.hero, fontWeight: F.weights.extra, margin: 0 },
  weekRow:  { display: 'flex', gap: 12, paddingTop: 10, borderTop: `1px solid ${C.borderLight}` },
  weekItem: { flex: 1, display: 'flex', flexDirection: 'column', gap: 2 },
  weekLbl:  { fontSize: F.sizes.xs, color: C.textMuted, fontFamily: F.heading },
  weekVal:  { fontSize: F.sizes.md, fontWeight: F.weights.bold, fontFamily: F.heading },

  // ── Snabb-knappar ──
  qaRow: { display: 'flex', gap: 8, padding: '4px 16px 8px' },
  qaBtn: {
    flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center',
    justifyContent: 'center', gap: 4, padding: '12px 8px', borderRadius: 14,
    border: '1.5px solid', cursor: 'pointer', minHeight: 68,
    WebkitTapHighlightColor: 'transparent',
  },
  qaEmoji: { fontSize: 22, lineHeight: 1 },
  qaTxt: {
    fontSize: F.sizes.xs, fontWeight: F.weights.bold,
    fontFamily: F.heading, color: C.text,
  },

  // ── Historik ──
  emptyHistorik: { textAlign: 'center', padding: '16px 0' },
  emptyTitle: {
    fontFamily: F.heading, fontSize: F.sizes.lg, fontWeight: F.weights.bold,
    color: C.text, margin: '12px 0 4px',
  },
  emptySmall: { fontSize: F.sizes.sm, color: C.textMuted, fontFamily: F.heading, margin: 0 },
  txRow: {
    display: 'flex', alignItems: 'center', gap: 10,
    padding: '10px 0', borderBottom: `1px solid ${C.borderLight}`,
  },
  txIcon:    { fontSize: 18, flexShrink: 0 },
  txContent: { flex: 1, minWidth: 0 },
  txLabel: {
    display: 'block', fontSize: F.sizes.sm, fontWeight: F.weights.semi,
    fontFamily: F.heading, color: C.text,
  },
  txDate:    { display: 'block', fontSize: F.sizes.xs, color: C.textMuted },
  txAmt: {
    fontSize: F.sizes.md, fontWeight: F.weights.bold,
    fontFamily: F.heading, flexShrink: 0,
  },
  showMoreBtn: {
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4,
    width: '100%', padding: '10px 0', background: 'none', border: 'none',
    color: C.primary, fontSize: F.sizes.sm, fontWeight: F.weights.bold,
    fontFamily: F.heading, cursor: 'pointer',
  },

  // ── Loading ──
  loadingWrap: {
    display: 'flex', flexDirection: 'column', alignItems: 'center',
    justifyContent: 'center', padding: 40, gap: 12,
  },
  loadingText: { color: C.textMuted, fontFamily: F.heading, fontSize: F.sizes.sm, margin: 0 },

  // ── Modal/Sheet ──
  overlay: {
    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)',
    display: 'flex', alignItems: 'flex-end', justifyContent: 'center', zIndex: 200,
  },
  sheet: {
    width: '100%', maxWidth: 500, maxHeight: '92vh', overflowY: 'auto',
    background: C.bgCard, borderRadius: '20px 20px 0 0',
    padding: '8px 20px calc(32px + env(safe-area-inset-bottom, 0px))',
  },
  sheetHandle: {
    width: 40, height: 4, borderRadius: 2, background: C.border, margin: '8px auto 0',
  },
  sheetHeader: {
    display: 'flex', alignItems: 'center',
    justifyContent: 'space-between', marginTop: 14, marginBottom: 4,
  },
  sheetTitle: {
    fontFamily: F.heading, fontSize: F.sizes.lg,
    fontWeight: F.weights.bold, color: C.text, margin: 0,
  },
  sheetClose: {
    background: 'none', border: 'none', cursor: 'pointer', padding: 4, minWidth: 36, minHeight: 36,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  sheetSub: { fontSize: F.sizes.sm, color: C.textMuted, fontFamily: F.heading, margin: '0 0 16px' },
  quickAmtRow: { display: 'flex', gap: 8, marginBottom: 14 },
  quickAmtBtn: {
    flex: 1, padding: '11px 4px', borderRadius: 12, border: '1.5px solid',
    fontFamily: F.heading, fontSize: F.sizes.sm, fontWeight: F.weights.bold,
    cursor: 'pointer', minHeight: 44, textAlign: 'center',
    WebkitTapHighlightColor: 'transparent',
  },
  sheetError: {
    display: 'flex', alignItems: 'center', gap: 6, padding: '8px 12px',
    background: C.errorLight, borderRadius: 10, color: C.error,
    fontSize: F.sizes.sm, fontFamily: F.heading, marginBottom: 12,
  },
};
