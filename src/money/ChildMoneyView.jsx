// ============================================
// FamTastic — ChildMoneyView (v2, ny logik)
// Plånbok → Begär spara/swish (pending) →
// Förälder bekräftar → Sparkonto uppdateras
// ============================================

import React, { useState } from 'react';
import { supabase } from '../supabaseClient';
import { C, F, S, formatKr } from '../data';
import { Celebration } from '../Celebrations';
import {
  Wallet, PiggyBank, Smartphone, Clock,
  RotateCcw, ArrowLeft, Check, TrendingUp,
  Plus, Trash2,
} from 'lucide-react';

const GOAL_ICONS = ['🎯','🎮','⚽','🎸','👟','📱','🚲','🎨','✈️','🎁','💻','🏀'];

function weekMonday() {
  const d = new Date();
  d.setDate(d.getDate() - (d.getDay() || 7) + 1);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function ChildMoneyView({ familyId, memberId, transactions, goals, familyGoals, members, onReload }) {
  // OBS: ChildApp laddar om pengar-data när tabben öppnas (page === 'money'),
  // så ingen egen mount-reload här — annars dubbla RPC-anrop.

  const [mode,          setMode]          = useState(null); // null|'request'|'done'|'new_goal'
  const [reqType,       setReqType]       = useState(null); // 'saving'|'swish'
  const [amount,        setAmount]        = useState(0);
  const [saving,        setSaving]        = useState(false);
  const [error,         setError]         = useState('');
  const [showCelebration, setShowCelebration] = useState(false);
  const [cancellingId,  setCancellingId]  = useState(null);
  const [deleteGoalId,  setDeleteGoalId]  = useState(null);
  const [newGoalTitle,  setNewGoalTitle]  = useState('');
  const [newGoalTarget, setNewGoalTarget] = useState('');
  const [newGoalIcon,   setNewGoalIcon]   = useState('🎯');

  // ─── Beräkningar ──────────────────────────────────────────────────────────
  const pendingTx   = (transactions || []).filter(tx => tx.status === 'pending');
  const historyTx   = (transactions || []).filter(tx => tx.status !== 'pending').slice(0, 10);

  // Plånbok = summan av ALLA transaktioner (pending reserverar direkt)
  const walletOre   = (transactions || []).reduce((sum, tx) => sum + tx.amount, 0);
  const walletKr    = Math.max(0, walletOre / 100);

  // Sparkonto = bekräftad sparande
  const sparkontoOre = (transactions || [])
    .filter(tx => tx.type === 'saving' && tx.status === 'confirmed')
    .reduce((sum, tx) => sum + Math.abs(tx.amount), 0);

  // Intjänat denna vecka
  const wkMonday   = weekMonday();
  const weekEarned = (transactions || [])
    .filter(tx =>
      (tx.type === 'base_allowance' || tx.type === 'chore_bonus') &&
      tx.amount > 0 &&
      new Date(tx.created_at) >= wkMonday
    )
    .reduce((sum, tx) => sum + tx.amount, 0);

  // ─── Begär allokering ────────────────────────────────────────────────────
  async function handleRequest() {
    if (amount <= 0 || amount > walletKr) return;
    setSaving(true); setError('');
    const ore  = Math.round(amount * 100);
    const desc = reqType === 'saving'
      ? `Spara ${formatKr(ore)}`
      : `Swish ${formatKr(ore)}`;
    const { data, error: rpcErr } = await supabase.rpc('child_request_allocation', {
      p_family_id:   familyId,
      p_member_id:   memberId,
      p_amount_ore:  ore,
      p_type:        reqType,
      p_description: desc,
    });
    setSaving(false);
    if (rpcErr || !data?.success) {
      setError(rpcErr?.message || data?.error || 'Något gick fel – försök igen');
      return;
    }
    setShowCelebration(true);
    setMode('done');
    onReload();
  }

  // ─── Ångra pending ────────────────────────────────────────────────────────
  async function handleCancelPending(txId) {
    setCancellingId(txId);
    const { data, error: rpcErr } = await supabase.rpc('child_cancel_allocation', {
      p_family_id: familyId,
      p_member_id: memberId,
      p_tx_id:     txId,
    });
    setCancellingId(null);
    if (!rpcErr && data?.success) onReload();
  }

  // ─── Sparmål ─────────────────────────────────────────────────────────────
  async function handleCreateGoal() {
    if (!newGoalTitle.trim() || !newGoalTarget) return;
    setSaving(true);
    const { data } = await supabase.rpc('child_create_savings_goal', {
      p_family_id:     familyId,
      p_member_id:     memberId,
      p_title:         newGoalTitle.trim(),
      p_target_amount: Math.round(Number(newGoalTarget) * 100),
      p_icon:          newGoalIcon,
    });
    setSaving(false);
    if (data?.success) {
      setNewGoalTitle(''); setNewGoalTarget(''); setNewGoalIcon('🎯');
      onReload(); setMode(null);
    }
  }

  async function handleDeleteGoal(goalId) {
    await supabase.rpc('child_delete_savings_goal', {
      p_family_id: familyId,
      p_member_id: memberId,
      p_goal_id:   goalId,
    });
    setDeleteGoalId(null);
    onReload();
  }

  function reset() {
    setMode(null); setReqType(null); setAmount(0); setError(''); setShowCelebration(false);
  }

  function startRequest(type) {
    setReqType(type);
    setAmount(0);
    setError('');
    setMode('request');
  }

  // ─── Skapa sparmål ────────────────────────────────────────────────────────
  if (mode === 'new_goal') {
    return (
      <div style={styles.page}>
        <div style={styles.subHeader}>
          <button onClick={() => setMode(null)} style={styles.backBtn}>
            <ArrowLeft size={20} color={C.text} />
          </button>
          <h1 style={styles.subTitle}>Nytt sparmål</h1>
        </div>
        <div style={{ margin: '0 16px' }}>
          <div style={styles.iconRow}>
            {GOAL_ICONS.map(ic => (
              <button key={ic} onClick={() => setNewGoalIcon(ic)} style={{
                ...styles.iconBtn,
                background: newGoalIcon === ic ? C.primaryLight : 'transparent',
                border: `2px solid ${newGoalIcon === ic ? C.primary : 'transparent'}`,
              }}>{ic}</button>
            ))}
          </div>
          <input
            type="text"
            placeholder="Vad sparar du till?"
            value={newGoalTitle}
            onChange={e => setNewGoalTitle(e.target.value)}
            style={{ ...styles.formInput, marginBottom: 10 }}
            autoFocus
          />
          <input
            type="number"
            placeholder="Målbelopp (kr)"
            value={newGoalTarget}
            onChange={e => setNewGoalTarget(e.target.value)}
            style={styles.formInput}
            min="1"
            inputMode="numeric"
          />
          <button
            onClick={handleCreateGoal}
            disabled={saving || !newGoalTitle.trim() || !newGoalTarget}
            style={{
              ...styles.bigBtn,
              background: C.primary,
              color: '#fff',
              marginTop: 16,
              opacity: saving || !newGoalTitle.trim() || !newGoalTarget ? 0.5 : 1,
            }}>
            {saving ? 'Skapar...' : 'Skapa sparmål'}
          </button>
        </div>
      </div>
    );
  }

  // ─── Begär allokering ────────────────────────────────────────────────────
  if (mode === 'request') {
    const isSave  = reqType === 'saving';
    const emoji   = isSave ? '🐷' : '📲';
    const label   = isSave ? 'Begär sparande' : 'Begär swish';
    const color   = isSave ? C.secondary : C.primary;
    const maxKr   = Math.floor(walletKr);

    // Snabb-knappar: 25 / 50 / 75 / 100 % av plånboken
    const quickAmounts = [
      Math.floor(maxKr * 0.25),
      Math.floor(maxKr * 0.5),
      Math.floor(maxKr * 0.75),
      maxKr,
    ].filter((v, i, arr) => v > 0 && arr.indexOf(v) === i);

    return (
      <div style={styles.page}>
        <div style={styles.subHeader}>
          <button onClick={reset} style={styles.backBtn}>
            <ArrowLeft size={20} color={C.text} />
          </button>
          <h1 style={styles.subTitle}>{emoji} {label}</h1>
        </div>
        <div style={{ padding: '0 16px' }}>
          <div style={styles.amountHero}>
            <span style={{ ...styles.amountNum, color }}>
              {amount > 0 ? `${amount} kr` : '0 kr'}
            </span>
            <span style={styles.amountSub}>av {maxKr} kr i plånboken</span>
          </div>

          <input
            type="range"
            min="0"
            max={maxKr}
            step="1"
            value={amount}
            onChange={e => setAmount(Number(e.target.value))}
            style={{ ...styles.slider, accentColor: color }}
          />

          {quickAmounts.length > 0 && (
            <div style={styles.quickRow}>
              {quickAmounts.map(v => (
                <button key={v}
                  onClick={() => setAmount(v)}
                  style={{
                    ...styles.quickBtn,
                    background:  amount === v ? color : C.bgCard,
                    color:       amount === v ? '#fff' : C.text,
                    borderColor: amount === v ? color : C.border,
                  }}>
                  {v} kr
                </button>
              ))}
            </div>
          )}

          {error && (
            <div style={styles.inlineError}>{error}</div>
          )}

          <button
            onClick={handleRequest}
            disabled={saving || amount <= 0}
            style={{
              ...styles.bigBtn,
              background: color,
              color: '#fff',
              marginTop: 20,
              opacity: saving || amount <= 0 ? 0.5 : 1,
            }}>
            {saving ? 'Skickar...' : `${emoji} Skicka ${amount} kr`}
          </button>

          <p style={styles.requestHint}>
            {isSave
              ? 'En förälder för över pengarna till ditt sparkonto'
              : 'En förälder swishar pengarna till dig'}
          </p>
        </div>
      </div>
    );
  }

  // ─── Klart ────────────────────────────────────────────────────────────────
  if (mode === 'done') {
    const isSave = reqType === 'saving';
    return (
      <div style={styles.page}>
        <Celebration type="confetti" active={showCelebration} onDone={() => setShowCelebration(false)} />
        <div style={styles.doneWrap}>
          <span style={{ fontSize: 64 }}>{isSave ? '🐷' : '📲'}</span>
          <h2 style={styles.doneTitle}>Skickat!</h2>
          <p style={styles.doneText}>
            {isSave
              ? 'Din begäran är skickad – en förälder bekräftar snart!'
              : 'En förälder kommer att swisha dig!'}
          </p>
          <p style={styles.doneHint}>
            Du kan ångra i "Väntar"-sektionen så länge föräldern inte bekräftat.
          </p>
          <button onClick={reset} style={{ ...styles.bigBtn, background: C.primary, color: '#fff' }}>
            <Check size={17} style={{ marginRight: 6 }} /> Tillbaka
          </button>
        </div>
      </div>
    );
  }

  // ─── HUVUDVY ─────────────────────────────────────────────────────────────
  const myGoals = (goals || []).filter(g => !g.is_family_goal);

  return (
    <div style={styles.page}>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        .cm-actions { display: flex; gap: 10px; }
        @media (max-width: 360px) { .cm-actions { flex-direction: column; } }
      `}</style>
      <Celebration type="sparkle" active={showCelebration} onDone={() => setShowCelebration(false)} />

      {/* ══ PLÅNBOK HERO ════════════════════════════════════════════════════ */}
      <div style={styles.walletHero}>
        <div style={styles.heroTop}>
          <div style={styles.heroIconWrap}><Wallet size={20} color="#fff" /></div>
          <span style={styles.heroLabel}>Min plånbok</span>
          <button onClick={onReload} style={styles.reloadBtn} title="Uppdatera">
            <RotateCcw size={14} color="rgba(255,255,255,0.8)" />
          </button>
        </div>
        <span style={styles.heroAmount}>{formatKr(Math.max(0, walletOre))}</span>

        {walletOre === 0 && !transactions?.length && (
          <p style={styles.emptyMsg}>
            💤 Inga pengar ännu — be en förälder betala din veckopeng!
          </p>
        )}
        {weekEarned > 0 && (
          <div style={styles.weekBadge}>
            <TrendingUp size={13} color="#fff" />
            <span>+{formatKr(weekEarned)} den här veckan 🎉</span>
          </div>
        )}
      </div>

      {/* ══ VÄNTAR PÅ BEKRÄFTELSE ═══════════════════════════════════════════ */}
      {pendingTx.length > 0 && (
        <div style={styles.pendingCard}>
          <div style={styles.pendingHeader}>
            <Clock size={15} color="#92400E" />
            <span style={styles.pendingTitle}>Väntar på förälder</span>
          </div>
          {pendingTx.map(tx => (
            <div key={tx.id} style={styles.pendingRow}>
              <span style={{ fontSize: 22, flexShrink: 0 }}>
                {tx.type === 'saving' ? '🐷' : '📲'}
              </span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <span style={styles.pendingRowLabel}>
                  {tx.type === 'saving' ? 'Sparande' : 'Swish'}
                </span>
                <span style={styles.pendingRowSub}>Väntar på bekräftelse</span>
              </div>
              <span style={styles.pendingRowAmt}>{formatKr(Math.abs(tx.amount))}</span>
              <button
                onClick={() => handleCancelPending(tx.id)}
                disabled={cancellingId === tx.id}
                style={styles.angraBtn}>
                {cancellingId === tx.id ? '...' : 'Ångra'}
              </button>
            </div>
          ))}
        </div>
      )}

      {/* ══ ACTION-KNAPPAR ══════════════════════════════════════════════════ */}
      {walletKr > 0 && (
        <div className="cm-actions" style={styles.actionRow}>
          <button
            onClick={() => startRequest('saving')}
            style={{ ...styles.actionBtn, background: C.secondaryLight, borderColor: C.secondary }}>
            <PiggyBank size={24} color={C.secondaryDark} />
            <span style={{ ...styles.actionLabel, color: C.secondaryDark }}>🐷 Spara</span>
            <span style={{ ...styles.actionSub, color: C.secondary }}>Lägg på sparkontot</span>
          </button>
          <button
            onClick={() => startRequest('swish')}
            style={{ ...styles.actionBtn, background: C.primaryLight, borderColor: C.primary }}>
            <Smartphone size={24} color={C.primaryDark} />
            <span style={{ ...styles.actionLabel, color: C.primaryDark }}>📲 Swish</span>
            <span style={{ ...styles.actionSub, color: C.primary }}>Få pengar swishade</span>
          </button>
        </div>
      )}

      {/* ══ SPARKONTO ═══════════════════════════════════════════════════════ */}
      <div style={styles.sparkontoCard}>
        <div style={styles.sparkontoRow}>
          <div style={styles.sparkontoIconWrap}><PiggyBank size={18} color={C.secondary} /></div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <span style={styles.sparkontoLabel}>Sparkonto</span>
            <span style={styles.sparkontoSub}>Bekräftad av förälder</span>
          </div>
          <span style={styles.sparkontoAmt}>{formatKr(sparkontoOre)}</span>
        </div>

        {/* Sparmål — aspirationella */}
        {myGoals.length > 0 && (
          <div style={{ marginTop: 12 }}>
            {myGoals.map(g => {
              const canAfford = sparkontoOre >= g.target_amount;
              const pct       = Math.min(100, (sparkontoOre / g.target_amount) * 100);
              const remaining = g.target_amount - sparkontoOre;
              return (
                <div key={g.id} style={{
                  ...styles.goalRow,
                  borderColor: canAfford ? C.success : C.borderLight,
                  background:  canAfford ? '#F0FDF4' : '#fff',
                }}>
                  <span style={{ fontSize: 22, flexShrink: 0 }}>{g.icon || '🎯'}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                      <span style={styles.goalTitle}>{g.title}</span>
                      <span style={{
                        fontSize: F.sizes.xs, fontWeight: F.weights.bold,
                        fontFamily: F.heading,
                        color: canAfford ? C.success : C.secondaryDark,
                      }}>
                        {formatKr(g.target_amount)}
                      </span>
                    </div>
                    <div style={styles.goalBarBg}>
                      <div style={{
                        ...styles.goalBarFill,
                        width: `${pct}%`,
                        background: canAfford
                          ? C.success
                          : `linear-gradient(90deg, ${C.secondary}, ${C.accent})`,
                      }} />
                    </div>
                    <span style={{ ...styles.goalSub, color: canAfford ? C.success : C.textMuted }}>
                      {canAfford
                        ? '✅ Du har råd!'
                        : `${formatKr(remaining)} kvar – fortsätt spara! 💪`}
                    </span>
                  </div>
                  <button
                    onClick={() => setDeleteGoalId(g.id)}
                    style={styles.goalDeleteBtn}
                    title="Ta bort mål">
                    <Trash2 size={13} color={C.error} />
                  </button>
                </div>
              );
            })}
          </div>
        )}

        <button onClick={() => setMode('new_goal')} style={styles.newGoalBtn}>
          <Plus size={13} style={{ marginRight: 4 }} /> Nytt sparmål
        </button>
      </div>

      {/* ══ SENASTE ══════════════════════════════════════════════════════════ */}
      {historyTx.length > 0 && (
        <div style={styles.section}>
          <p style={S.sectionLabel}>Senaste</p>
          {historyTx.map(tx => {
            const emoji = tx.amount > 0
              ? (tx.type === 'base_allowance' ? '💰' : tx.type === 'gift' ? '🎁' : '⭐')
              : (tx.type === 'saving' ? '🐷' : tx.type === 'swish' ? '📲' : '💸');
            return (
              <div key={tx.id} style={styles.txRow}>
                <span style={styles.txEmoji}>{emoji}</span>
                <div style={styles.txContent}>
                  <span style={styles.txLabel}>{tx.description || tx.type}</span>
                  <span style={styles.txDate}>
                    {new Date(tx.created_at).toLocaleDateString('sv-SE')}
                  </span>
                </div>
                <span style={{ ...styles.txAmt, color: tx.amount > 0 ? C.success : C.text }}>
                  {tx.amount > 0 ? '+' : ''}{formatKr(tx.amount)}
                </span>
              </div>
            );
          })}
        </div>
      )}

      <div style={{ height: 'calc(90px + env(safe-area-inset-bottom, 0px))' }} />

      {/* ══ MODAL: TA BORT MÅL ══════════════════════════════════════════════ */}
      {deleteGoalId && (
        <div style={styles.overlay} onClick={() => setDeleteGoalId(null)}>
          <div style={styles.modal} onClick={e => e.stopPropagation()}>
            <span style={{ fontSize: 40, display: 'block', textAlign: 'center', marginBottom: 8 }}>🗑️</span>
            <h3 style={styles.modalTitle}>Ta bort sparmål?</h3>
            <p style={styles.modalText}>Målet tas bort men sparkontots saldo påverkas inte.</p>
            <div style={styles.modalBtns}>
              <button onClick={() => setDeleteGoalId(null)} style={styles.modalCancel}>Avbryt</button>
              <button
                onClick={() => handleDeleteGoal(deleteGoalId)}
                style={styles.modalDelete}>
                Ta bort
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────
const styles = {
  page:      { padding: '0 0 0', position: 'relative', zIndex: 1 },
  subHeader: { display: 'flex', alignItems: 'center', gap: 8, padding: '12px 16px 8px' },
  backBtn:   {
    background: 'none', border: 'none', cursor: 'pointer',
    padding: 8, minHeight: 44, minWidth: 44,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    WebkitTapHighlightColor: 'transparent',
  },
  subTitle:  {
    fontFamily: F.heading, fontSize: F.sizes.xl,
    fontWeight: F.weights.extra, color: C.text, margin: 0,
  },

  // Wallet hero
  walletHero: {
    background: `linear-gradient(135deg, ${C.primary}, #E85D04)`,
    padding: '20px 20px 24px',
    margin: '0 0 12px',
  },
  heroTop:     { display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 },
  heroIconWrap: {
    width: 36, height: 36, borderRadius: 10,
    background: 'rgba(255,255,255,0.25)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  heroLabel: {
    fontSize: F.sizes.sm, fontWeight: F.weights.bold, fontFamily: F.heading,
    color: 'rgba(255,255,255,0.9)', textTransform: 'uppercase', letterSpacing: 0.5,
  },
  reloadBtn: {
    marginLeft: 'auto', background: 'rgba(255,255,255,0.18)',
    border: 'none', borderRadius: 8, padding: 6, cursor: 'pointer',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    minWidth: 32, minHeight: 32, WebkitTapHighlightColor: 'transparent',
  },
  heroAmount: {
    display: 'block', fontFamily: F.heading, fontSize: 50,
    fontWeight: F.weights.extra, color: '#fff', lineHeight: 1.1, marginBottom: 10,
  },
  emptyMsg: {
    fontSize: F.sizes.sm, color: 'rgba(255,255,255,0.85)',
    fontFamily: F.heading, fontWeight: 600, margin: '6px 0 0', lineHeight: 1.4,
  },
  weekBadge: {
    display: 'inline-flex', alignItems: 'center', gap: 6,
    background: 'rgba(255,255,255,0.22)', borderRadius: 99, padding: '5px 12px',
    fontSize: F.sizes.xs, fontWeight: F.weights.bold, fontFamily: F.heading, color: '#fff',
  },

  // Pending
  pendingCard: {
    margin: '0 16px 12px', padding: '12px 14px',
    background: '#FFFBEB', borderRadius: 16,
    border: '1.5px solid #F59E0B',
  },
  pendingHeader: { display: 'flex', alignItems: 'center', gap: 7, marginBottom: 8 },
  pendingTitle:  {
    fontFamily: F.heading, fontSize: F.sizes.sm,
    fontWeight: F.weights.bold, color: '#92400E',
  },
  pendingRow: {
    display: 'flex', alignItems: 'center', gap: 10,
    padding: '8px 0', borderTop: '1px solid #FDE68A',
  },
  pendingRowLabel: {
    display: 'block', fontSize: F.sizes.sm,
    fontWeight: F.weights.bold, fontFamily: F.heading, color: '#78350F',
  },
  pendingRowSub: {
    display: 'block', fontSize: F.sizes.xs,
    fontFamily: F.heading, color: '#B45309',
  },
  pendingRowAmt: {
    fontSize: F.sizes.md, fontWeight: F.weights.bold,
    fontFamily: F.heading, color: '#92400E', flexShrink: 0,
  },
  angraBtn: {
    flexShrink: 0, padding: '7px 12px', borderRadius: 10,
    border: '1.5px solid #F59E0B', background: '#FEF3C7',
    color: '#92400E', fontSize: F.sizes.xs, fontWeight: F.weights.bold,
    fontFamily: F.heading, cursor: 'pointer', minHeight: 34,
    WebkitTapHighlightColor: 'transparent',
  },

  // Action buttons
  actionRow: {
    margin: '0 16px 12px', gap: 10,
  },
  actionBtn: {
    flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center',
    justifyContent: 'center', gap: 6, padding: '16px 12px',
    borderRadius: 16, border: '1.5px solid', cursor: 'pointer',
    minHeight: 100, WebkitTapHighlightColor: 'transparent',
  },
  actionLabel: {
    fontFamily: F.heading, fontSize: F.sizes.md, fontWeight: F.weights.extra,
  },
  actionSub: {
    fontFamily: F.heading, fontSize: F.sizes.xs, fontWeight: F.weights.semi,
  },

  // Sparkonto
  sparkontoCard: {
    margin: '0 16px 12px', padding: '14px 14px 10px',
    background: C.bgCard, borderRadius: 16,
    border: `1.5px solid ${C.borderLight}`,
    boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
  },
  sparkontoRow: { display: 'flex', alignItems: 'center', gap: 10, marginBottom: 0 },
  sparkontoIconWrap: {
    width: 36, height: 36, borderRadius: 10, background: C.secondaryLight,
    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  sparkontoLabel: {
    display: 'block', fontFamily: F.heading, fontSize: F.sizes.md,
    fontWeight: F.weights.extra, color: C.text,
  },
  sparkontoSub: {
    display: 'block', fontSize: F.sizes.xs, color: C.textMuted, fontFamily: F.heading,
  },
  sparkontoAmt: {
    fontFamily: F.heading, fontSize: F.sizes.xl, fontWeight: F.weights.extra,
    color: C.secondaryDark, flexShrink: 0,
  },

  // Goals
  goalRow: {
    display: 'flex', alignItems: 'flex-start', gap: 10,
    padding: '10px 10px', borderRadius: 12,
    border: '1.5px solid', marginBottom: 8,
  },
  goalTitle: {
    fontSize: F.sizes.sm, fontWeight: F.weights.bold,
    fontFamily: F.heading, color: C.text,
  },
  goalBarBg: { height: 8, background: C.borderLight, borderRadius: 99, overflow: 'hidden', margin: '5px 0 4px' },
  goalBarFill: { height: '100%', borderRadius: 99, transition: 'width 0.4s ease' },
  goalSub: { display: 'block', fontSize: F.sizes.xs, fontFamily: F.heading, fontWeight: F.weights.semi },
  goalDeleteBtn: {
    flexShrink: 0, background: 'none', border: 'none', cursor: 'pointer',
    padding: 4, minHeight: 32, minWidth: 32,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    WebkitTapHighlightColor: 'transparent',
  },
  newGoalBtn: {
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    width: '100%', padding: '9px 0', marginTop: 10,
    borderRadius: 10, border: `1.5px dashed ${C.primary}`,
    background: C.primaryLight, color: C.primaryDark,
    fontSize: F.sizes.sm, fontWeight: F.weights.bold, fontFamily: F.heading,
    cursor: 'pointer', WebkitTapHighlightColor: 'transparent',
  },

  // History
  section: { margin: '0 16px 16px' },
  txRow: {
    display: 'flex', alignItems: 'center', gap: 10,
    padding: '10px 0', borderBottom: `1px solid ${C.borderLight}`,
  },
  txEmoji:   { fontSize: 18, flexShrink: 0 },
  txContent: { flex: 1, minWidth: 0 },
  txLabel: {
    display: 'block', fontSize: F.sizes.sm,
    fontWeight: F.weights.semi, fontFamily: F.heading, color: C.text,
  },
  txDate: { display: 'block', fontSize: F.sizes.xs, color: C.textMuted },
  txAmt: {
    fontSize: F.sizes.md, fontWeight: F.weights.bold,
    fontFamily: F.heading, flexShrink: 0,
  },

  // Request view
  amountHero: { textAlign: 'center', padding: '20px 0 12px' },
  amountNum: {
    display: 'block', fontFamily: F.heading, fontSize: 48,
    fontWeight: F.weights.extra, lineHeight: 1.1, marginBottom: 4,
  },
  amountSub: {
    display: 'block', fontSize: F.sizes.sm,
    color: C.textMuted, fontFamily: F.heading,
  },
  slider: {
    width: '100%', height: 8, borderRadius: 4,
    appearance: 'none', background: C.borderLight,
    outline: 'none', marginBottom: 16,
  },
  quickRow: { display: 'flex', gap: 8, marginBottom: 8 },
  quickBtn: {
    flex: 1, padding: '11px 4px', borderRadius: 12, border: '1.5px solid',
    fontFamily: F.heading, fontSize: F.sizes.sm, fontWeight: F.weights.bold,
    cursor: 'pointer', minHeight: 44, WebkitTapHighlightColor: 'transparent',
    textAlign: 'center',
  },
  inlineError: {
    fontSize: F.sizes.sm, color: C.error, fontFamily: F.heading,
    padding: '10px 14px', background: C.errorLight,
    borderRadius: 10, marginBottom: 8,
  },
  requestHint: {
    textAlign: 'center', fontSize: F.sizes.xs,
    color: C.textMuted, fontFamily: F.heading, marginTop: 10,
  },

  // Done
  doneWrap: { textAlign: 'center', padding: '48px 16px 24px' },
  doneTitle: {
    fontFamily: F.heading, fontSize: F.sizes.xxl,
    fontWeight: F.weights.extra, color: C.text, margin: '12px 0 8px',
  },
  doneText: {
    fontSize: F.sizes.md, color: C.text,
    fontFamily: F.heading, margin: '0 0 8px', lineHeight: 1.5,
  },
  doneHint: {
    fontSize: F.sizes.xs, color: C.textMuted,
    fontFamily: F.heading, margin: '0 0 28px',
  },

  // New goal
  iconRow:  { display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 14 },
  iconBtn:  {
    width: 38, height: 38, borderRadius: 10, fontSize: 18,
    cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
    WebkitTapHighlightColor: 'transparent',
  },
  formInput: {
    width: '100%', padding: '12px 14px', borderRadius: 12,
    border: `2px solid ${C.border}`, fontSize: F.sizes.md,
    fontFamily: F.body, outline: 'none', boxSizing: 'border-box', minHeight: 48,
  },

  // Big button
  bigBtn: {
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    width: '100%', padding: 15, borderRadius: 14, border: 'none',
    fontSize: F.sizes.md, fontWeight: F.weights.bold, fontFamily: F.heading,
    cursor: 'pointer', minHeight: 52, WebkitTapHighlightColor: 'transparent',
  },

  // Modal
  overlay: {
    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)',
    display: 'flex', alignItems: 'flex-end', justifyContent: 'center', zIndex: 200,
  },
  modal: {
    width: '100%', maxWidth: 480, background: C.bgCard,
    borderRadius: '20px 20px 0 0', padding: '24px 20px 36px',
  },
  modalTitle: {
    fontFamily: F.heading, fontSize: F.sizes.lg, fontWeight: F.weights.extra,
    color: C.text, margin: '0 0 8px', textAlign: 'center',
  },
  modalText: {
    fontSize: F.sizes.sm, color: C.textMuted,
    fontFamily: F.heading, textAlign: 'center', margin: '0 0 20px',
  },
  modalBtns: { display: 'flex', gap: 10 },
  modalCancel: {
    flex: 1, padding: 14, borderRadius: 14, border: `1.5px solid ${C.border}`,
    background: C.bgCard, color: C.text, fontSize: F.sizes.md,
    fontWeight: F.weights.bold, fontFamily: F.heading, cursor: 'pointer', minHeight: 52,
    WebkitTapHighlightColor: 'transparent',
  },
  modalDelete: {
    flex: 1, padding: 14, borderRadius: 14, border: 'none',
    background: C.error, color: '#fff', fontSize: F.sizes.md,
    fontWeight: F.weights.bold, fontFamily: F.heading, cursor: 'pointer', minHeight: 52,
    WebkitTapHighlightColor: 'transparent',
  },
};
