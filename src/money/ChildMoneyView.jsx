// ============================================
// FamTastic — ChildMoneyView (burk-system)
// Plånbok / Spargris / Mål-låda
// Uses RPCs for all writes (child has no JWT)
// ============================================

import React, { useState } from 'react';
import { supabase } from '../supabaseClient';
import { C, F, S, formatKr } from '../data';
import { Celebration } from '../Celebrations';
import { Wallet, PiggyBank, Target, ArrowRight, Check, ArrowLeft, ArrowUpCircle, Plus } from 'lucide-react';

export function ChildMoneyView({ familyId, memberId, transactions, goals, familyGoals, members, onReload }) {
  const [mode, setMode] = useState('jars');     // jars | move | confirm | done
  const [moveFrom, setMoveFrom] = useState(null); // 'wallet'
  const [moveTo, setMoveTo] = useState(null);     // 'saving' | 'family_goal'
  const [selectedGoal, setSelectedGoal] = useState(null);
  const [amount, setAmount] = useState(0);
  const [saving, setSaving] = useState(false);
  const [showCelebration, setShowCelebration] = useState(false);

  // Calculate balances
  const totalBalance = transactions.reduce((sum, tx) => sum + tx.amount, 0);
  const savedInGoals = transactions
    .filter(tx => tx.type === 'saving' && tx.savings_goal_id)
    .reduce((sum, tx) => sum + Math.abs(tx.amount), 0);
  const savedInFamily = transactions
    .filter(tx => tx.type === 'family_goal')
    .reduce((sum, tx) => sum + Math.abs(tx.amount), 0);
  const walletBalance = totalBalance; // wallet = total balance (savings are already subtracted)

  const walletKr = Math.max(0, walletBalance / 100);

  // Goal progress
  function goalSaved(goalId) {
    return transactions
      .filter(tx => tx.savings_goal_id === goalId)
      .reduce((sum, tx) => sum + Math.abs(tx.amount), 0);
  }

  // Recent transactions (last 10)
  const recentTx = transactions.slice(0, 10);

  // --- Move money flow ---
  function startMove(to) {
    setMoveFrom('wallet');
    setMoveTo(to);
    setAmount(0);
    setSelectedGoal(null);
    if (to === 'withdrawal') {
      setMode('move');
    } else if (to === 'family_goal' && familyGoals.length === 1) {
      setSelectedGoal(familyGoals[0]);
      setMode('move');
    } else if (to === 'saving' && goals.length === 1) {
      setSelectedGoal(goals[0]);
      setMode('move');
    } else if (to === 'saving' || to === 'family_goal') {
      setMode('pick_goal');
    } else {
      setMode('move');
    }
  }

  function pickGoal(goal) {
    setSelectedGoal(goal);
    setMode('move');
  }

  // --- Create new savings goal (via RPC) ---
  const [showNewGoal, setShowNewGoal] = useState(false);
  const [newGoalTitle, setNewGoalTitle] = useState('');
  const [newGoalTarget, setNewGoalTarget] = useState('');
  const [newGoalIcon, setNewGoalIcon] = useState('🎯');
  const GOAL_ICONS = ['🎯','🎮','⚽','🎸','👟','📱','🚲','🎨','✈️','🎁','💻','🏀'];

  async function handleCreateGoal() {
    if (!newGoalTitle.trim() || !newGoalTarget) return;
    setSaving(true);

    const { data, error } = await supabase.rpc('child_create_savings_goal', {
      p_family_id: familyId,
      p_member_id: memberId,
      p_title: newGoalTitle.trim(),
      p_target_amount: Math.round(Number(newGoalTarget) * 100),
      p_icon: newGoalIcon,
    });

    setSaving(false);

    if (!error && data?.success && data?.goal) {
      setSelectedGoal(data.goal);
      setShowNewGoal(false);
      setNewGoalTitle('');
      setNewGoalTarget('');
      setMode('move');
    }
  }

  // --- Confirm move (via RPC) ---
  async function handleConfirm() {
    if (amount <= 0 || amount > walletKr) return;
    setSaving(true);
    const amountOre = Math.round(amount * 100);

    const description = moveTo === 'withdrawal'
      ? `Uttag ${formatKr(amountOre)}`
      : moveTo === 'family_goal'
        ? `Bidrag till ${selectedGoal?.title || 'familjemålet'}`
        : `Sparande till ${selectedGoal?.title || 'sparmål'}`;

    const { data, error } = await supabase.rpc('child_move_money', {
      p_family_id: familyId,
      p_member_id: memberId,
      p_amount_ore: amountOre,
      p_type: moveTo,
      p_savings_goal_id: selectedGoal?.id || null,
      p_description: description,
    });

    setSaving(false);

    if (!error && data?.success) {
      setShowCelebration(true);
      setMode('done');
    }
  }

  function reset() {
    setMode('jars');
    setMoveFrom(null);
    setMoveTo(null);
    setSelectedGoal(null);
    setAmount(0);
    setShowCelebration(false);
    onReload();
  }

  // --- Pick goal view ---
  if (mode === 'pick_goal') {
    const list = moveTo === 'family_goal' ? familyGoals : goals;
    return (
      <div style={styles.page}>
        <div style={styles.header}>
          <button onClick={() => setMode('jars')} style={styles.backBtn}>
            <ArrowLeft size={20} color={C.text} />
          </button>
          <h1 style={styles.title}>Välj mål</h1>
        </div>
        <div style={styles.goalList}>
          {list.map(g => {
            const saved = goalSaved(g.id);
            const pct = Math.min(100, (saved / g.target_amount) * 100);
            return (
              <button key={g.id} onClick={() => pickGoal(g)} style={styles.goalPickCard}>
                <span style={{ fontSize: 28 }}>{g.icon || '🎯'}</span>
                <div style={styles.goalPickInfo}>
                  <span style={styles.goalPickTitle}>{g.title}</span>
                  <div style={styles.goalBarBg}>
                    <div style={{ ...styles.goalBarFill, width: `${pct}%` }} />
                  </div>
                  <span style={styles.goalPickPct}>{formatKr(saved)} av {formatKr(g.target_amount)}</span>
                </div>
              </button>
            );
          })}

          {/* Create new goal (only for personal savings) */}
          {moveTo === 'saving' && !showNewGoal && (
            <button onClick={() => setShowNewGoal(true)} style={styles.newGoalBtn}>
              <Plus size={16} color={C.primary} /> Skapa nytt sparmål
            </button>
          )}

          {showNewGoal && (
            <div style={styles.newGoalForm}>
              <div style={styles.iconPickerRow}>
                {GOAL_ICONS.map(ic => (
                  <button key={ic} onClick={() => setNewGoalIcon(ic)} style={{
                    ...styles.iconPickerBtn,
                    background: newGoalIcon === ic ? C.primaryLight : 'transparent',
                    border: newGoalIcon === ic ? `2px solid ${C.primary}` : '2px solid transparent',
                  }}>{ic}</button>
                ))}
              </div>
              <input type="text" placeholder="Vad sparar du till?" value={newGoalTitle}
                onChange={e => setNewGoalTitle(e.target.value)}
                style={{ ...styles.formInput, marginBottom: 8 }} autoFocus />
              <input type="number" placeholder="Målbelopp (kr)" value={newGoalTarget}
                onChange={e => setNewGoalTarget(e.target.value)}
                style={styles.formInput} min="1" />
              <button onClick={handleCreateGoal}
                disabled={saving || !newGoalTitle.trim() || !newGoalTarget}
                style={{ ...styles.confirmBtn, marginTop: 10, opacity: saving || !newGoalTitle.trim() || !newGoalTarget ? 0.5 : 1 }}>
                {saving ? 'Skapar...' : 'Skapa sparmål'}
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  // --- Move amount view ---
  if (mode === 'move') {
    const label = moveTo === 'withdrawal'
      ? 'Begär uttag'
      : moveTo === 'family_goal'
        ? `Till ${selectedGoal?.icon || '🎯'} ${selectedGoal?.title || 'Familjemål'}`
        : `Till ${selectedGoal?.icon || '🐷'} ${selectedGoal?.title || 'Sparmål'}`;

    return (
      <div style={styles.page}>
        <div style={styles.header}>
          <button onClick={() => setMode('jars')} style={styles.backBtn}>
            <ArrowLeft size={20} color={C.text} />
          </button>
          <h1 style={styles.title}>{moveTo === 'withdrawal' ? 'Begär uttag' : 'Flytta pengar'}</h1>
        </div>

        <div style={styles.moveCard}>
          <div style={styles.moveFrom}>
            <div style={{ ...styles.jarIconSmall, background: C.primaryLight }}>
              <Wallet size={20} color={C.primary} />
            </div>
            <span style={styles.moveLabel}>Plånbok</span>
          </div>
          <ArrowRight size={20} color={C.textMuted} />
          <div style={styles.moveTo}>
            <div style={{ ...styles.jarIconSmall, background: moveTo === 'withdrawal' ? C.errorLight : moveTo === 'family_goal' ? C.accentLight : C.secondaryLight }}>
              {moveTo === 'withdrawal'
                ? <ArrowUpCircle size={20} color={C.error} />
                : moveTo === 'family_goal'
                  ? <Target size={20} color={C.accent} />
                  : <PiggyBank size={20} color={C.secondary} />}
            </div>
            <span style={styles.moveLabel}>
              {moveTo === 'withdrawal' ? 'Uttag' : selectedGoal?.title || 'Mål'}
            </span>
          </div>
        </div>

        <div style={styles.amountWrap}>
          <span style={styles.amountDisplay}>
            {amount > 0 ? `${amount} kr` : '0 kr'}
          </span>
          <span style={styles.amountSub}>av {Math.floor(walletKr)} kr i plånboken</span>

          <input
            type="range"
            min="0"
            max={Math.floor(walletKr)}
            step="1"
            value={amount}
            onChange={e => setAmount(Number(e.target.value))}
            style={styles.slider}
          />

          <div style={styles.quickRow}>
            {[5, 10, 25, 50].filter(v => v <= walletKr).map(v => (
              <button key={v} onClick={() => setAmount(v)} style={{
                ...styles.quickBtn,
                background: amount === v ? C.primary : C.bgCard,
                color: amount === v ? '#fff' : C.text,
              }}>{v} kr</button>
            ))}
          </div>
        </div>

        <button
          onClick={handleConfirm}
          disabled={saving || amount <= 0}
          style={{
            ...styles.confirmBtn,
            opacity: saving || amount <= 0 ? 0.5 : 1,
          }}
        >
          {saving ? 'Sparar...' : moveTo === 'withdrawal' ? `Begär uttag ${amount} kr` : `Flytta ${amount} kr`}
        </button>
      </div>
    );
  }

  // --- Done view ---
  if (mode === 'done') {
    const emoji = moveTo === 'withdrawal' ? '💸' : moveTo === 'family_goal' ? '🎯' : '🐷';
    const doneMsg = moveTo === 'withdrawal'
      ? `Du har begärt ${amount} kr i uttag. Be en förälder att betala ut!`
      : `${amount} kr flyttat till ${selectedGoal?.title || 'målet'}!`;
    return (
      <div style={styles.page}>
        <Celebration type={moveTo === 'withdrawal' ? 'confetti' : 'sparkle'} active={showCelebration} onDone={() => setShowCelebration(false)} />
        <div style={styles.doneWrap}>
          <span style={{ fontSize: 56 }}>{emoji}</span>
          <h2 style={styles.doneTitle}>Klart!</h2>
          <p style={styles.doneText}>{doneMsg}</p>
          <button onClick={reset} style={styles.confirmBtn}>
            <Check size={18} /> Tillbaka
          </button>
        </div>
      </div>
    );
  }

  // --- Main jars view ---
  return (
    <div style={styles.page}>
      <h1 style={styles.title}>Mina pengar</h1>

      {/* Balance card */}
      <div style={styles.balanceCard}>
        <div style={styles.balanceLeft}>
          <div style={styles.balanceIconWrap}>
            <Wallet size={24} color="#fff" />
          </div>
          <div>
            <span style={styles.balanceLabel}>Min plånbok</span>
            <span style={styles.balanceSub}>Fria pengar att fördela ↓</span>
          </div>
        </div>
        <span style={styles.balanceAmount}>{formatKr(walletBalance)}</span>
      </div>

      {/* Action jars */}
      <p style={styles.jarsHeading}>Vad vill du göra?</p>
      <div style={styles.jarsGrid}>
        {/* Withdrawal jar */}
        {walletBalance > 0 && (
          <button onClick={() => startMove('withdrawal')} style={{ ...styles.jar, borderColor: C.error, cursor: 'pointer' }}>
            <div style={{ ...styles.jarIcon, background: C.errorLight }}>
              <ArrowUpCircle size={28} color={C.error} />
            </div>
            <span style={styles.jarLabel}>Ta ut</span>
            <span style={{ ...styles.jarAmount, color: C.error }}>
              Få pengar
            </span>
            <span style={styles.jarAction}>Begär uttag →</span>
          </button>
        )}

        {/* Piggy bank jar */}
        <button onClick={() => startMove('saving')} style={{ ...styles.jar, borderColor: C.secondary, cursor: 'pointer' }}>
          <div style={{ ...styles.jarIcon, background: C.secondaryLight }}>
            <PiggyBank size={28} color={C.secondary} />
          </div>
          <span style={styles.jarLabel}>Spargris</span>
          <span style={{ ...styles.jarAmount, color: C.secondaryDark }}>
            {goals.length > 0 ? `${goals.length} mål` : 'Skapa mål'}
          </span>
          <span style={styles.jarAction}>Spara →</span>
        </button>

        {/* Family goal jar */}
        {familyGoals.length > 0 && (
          <button onClick={() => startMove('family_goal')} style={{ ...styles.jar, borderColor: C.accent, cursor: 'pointer' }}>
            <div style={{ ...styles.jarIcon, background: C.accentLight }}>
              <Target size={28} color={C.accent} />
            </div>
            <span style={styles.jarLabel}>Familjemål</span>
            <span style={{ ...styles.jarAmount, color: '#92400E' }}>
              {familyGoals[0]?.icon} {familyGoals[0]?.title}
            </span>
            <span style={styles.jarAction}>Bidra →</span>
          </button>
        )}
      </div>

      {/* Personal goals progress */}
      {goals.length > 0 && (
        <div style={styles.section}>
          <p style={S.sectionLabel}>Mina sparmål</p>
          {goals.map(g => {
            const saved = goalSaved(g.id);
            const pct = Math.min(100, (saved / g.target_amount) * 100);
            return (
              <div key={g.id} style={styles.goalCard}>
                <div style={styles.goalTop}>
                  <span style={{ fontSize: 24 }}>{g.icon || '🎯'}</span>
                  <div style={styles.goalInfo}>
                    <span style={styles.goalTitle}>{g.title}</span>
                    <span style={styles.goalAmountText}>
                      {formatKr(saved)} av {formatKr(g.target_amount)}
                    </span>
                  </div>
                  <span style={styles.goalPct}>{Math.round(pct)}%</span>
                </div>
                <div style={styles.goalBarBg}>
                  <div style={{
                    ...styles.goalBarFill,
                    width: `${pct}%`,
                    background: pct >= 100 ? C.success : `linear-gradient(90deg, ${C.secondary}, ${C.accent})`,
                  }} />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Recent transactions — simplified */}
      <div style={styles.section}>
        <p style={S.sectionLabel}>Senaste</p>
        {recentTx.length === 0 ? (
          <p style={styles.emptyText}>Inga transaktioner ännu</p>
        ) : (
          recentTx.map(tx => (
            <div key={tx.id} style={styles.txRow}>
              <span style={styles.txEmoji}>{tx.amount > 0 ? '💰' : '💸'}</span>
              <div style={styles.txContent}>
                <span style={styles.txLabel}>{tx.description || tx.type}</span>
                <span style={styles.txDate}>
                  {new Date(tx.created_at).toLocaleDateString('sv-SE')}
                </span>
              </div>
              <span style={{
                ...styles.txAmount,
                color: tx.amount > 0 ? C.success : C.error,
              }}>
                {tx.amount > 0 ? '+' : ''}{formatKr(tx.amount)}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

const styles = {
  page: { padding: '12px 16px' },
  header: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 },
  backBtn: { background: 'none', border: 'none', cursor: 'pointer', padding: 8, minHeight: 44, minWidth: 44, display: 'flex', alignItems: 'center', justifyContent: 'center' },
  title: { fontFamily: F.heading, fontSize: F.sizes.xl, fontWeight: F.weights.extra, color: C.text, margin: 0 },

  // --- Balance card ---
  balanceCard: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '18px 20px', borderRadius: 20,
    background: `linear-gradient(135deg, ${C.primary}, #E85D04)`,
    marginBottom: 16, boxShadow: '0 4px 16px rgba(249,115,22,0.3)',
    boxSizing: 'border-box', width: '100%',
  },
  balanceLeft: { display: 'flex', alignItems: 'center', gap: 12 },
  balanceIconWrap: {
    width: 48, height: 48, borderRadius: 14,
    background: 'rgba(255,255,255,0.25)',
    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  balanceLabel: { display: 'block', fontSize: F.sizes.md, fontWeight: F.weights.bold, fontFamily: F.heading, color: '#fff' },
  balanceSub: { display: 'block', fontSize: F.sizes.xs, color: 'rgba(255,255,255,0.8)', fontFamily: F.heading, marginTop: 2 },
  balanceAmount: { fontSize: F.sizes.xxl, fontWeight: F.weights.extra, fontFamily: F.heading, color: '#fff', flexShrink: 0 },
  jarsHeading: { fontSize: F.sizes.sm, fontWeight: F.weights.bold, fontFamily: F.heading, color: C.textMuted, margin: '0 0 8px', textTransform: 'uppercase', letterSpacing: 0.5 },

  // --- Jars ---
  jarsGrid: { display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 20 },
  jar: {
    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
    padding: '20px 16px', borderRadius: 20, border: '2.5px solid',
    background: C.bgCard, boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
    width: '100%', textAlign: 'center', boxSizing: 'border-box',
  },
  jarIcon: { width: 56, height: 56, borderRadius: 16, display: 'flex', alignItems: 'center', justifyContent: 'center' },
  jarLabel: { fontSize: F.sizes.sm, fontWeight: F.weights.bold, fontFamily: F.heading, color: C.text },
  jarAmount: { fontSize: F.sizes.xl, fontWeight: F.weights.extra, fontFamily: F.heading },
  jarSub: { fontSize: F.sizes.xs, color: C.textMuted, fontFamily: F.heading },
  jarAction: { fontSize: F.sizes.sm, fontWeight: F.weights.bold, fontFamily: F.heading, color: C.primary, marginTop: 2 },
  jarIconSmall: { width: 36, height: 36, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center' },

  // --- Move flow ---
  moveCard: {
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12,
    padding: 16, background: C.bgCard, borderRadius: 16,
    border: `1.5px solid ${C.borderLight}`, marginBottom: 20,
  },
  moveFrom: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 },
  moveTo: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 },
  moveLabel: { fontSize: F.sizes.xs, fontWeight: F.weights.bold, fontFamily: F.heading, color: C.text },

  amountWrap: { textAlign: 'center', marginBottom: 16 },
  amountDisplay: { display: 'block', fontFamily: F.heading, fontSize: F.sizes.hero, fontWeight: F.weights.extra, color: C.primary, marginBottom: 4 },
  amountSub: { display: 'block', fontSize: F.sizes.sm, color: C.textMuted, marginBottom: 20, fontFamily: F.heading },
  slider: { width: '100%', height: 8, borderRadius: 4, appearance: 'none', background: C.borderLight, outline: 'none', marginBottom: 16, accentColor: C.primary },
  quickRow: { display: 'flex', justifyContent: 'center', gap: 8 },
  quickBtn: { padding: '10px 16px', borderRadius: 12, border: `1.5px solid ${C.border}`, fontSize: F.sizes.sm, fontWeight: F.weights.bold, fontFamily: F.heading, cursor: 'pointer', minHeight: 44 },

  confirmBtn: {
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
    width: '100%', padding: '14px', borderRadius: 14, border: 'none',
    background: C.primary, color: '#fff', fontSize: F.sizes.md,
    fontWeight: F.weights.bold, fontFamily: F.heading, cursor: 'pointer', minHeight: 52,
  },

  // --- Done ---
  doneWrap: { textAlign: 'center', padding: '40px 0' },
  doneTitle: { fontFamily: F.heading, fontSize: F.sizes.xxl, fontWeight: F.weights.extra, color: C.text, margin: '12px 0 8px' },
  doneText: { fontSize: F.sizes.md, color: C.textMuted, fontFamily: F.heading, margin: '0 0 24px' },

  // --- Goals ---
  section: { marginBottom: 20 },
  goalCard: { padding: 14, background: C.bgCard, borderRadius: 16, border: `1.5px solid ${C.borderLight}`, marginBottom: 8, boxShadow: '0 1px 4px rgba(0,0,0,0.03)' },
  goalTop: { display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 },
  goalInfo: { flex: 1, minWidth: 0 },
  goalTitle: { display: 'block', fontSize: F.sizes.md, fontWeight: F.weights.bold, fontFamily: F.heading, color: C.text },
  goalAmountText: { display: 'block', fontSize: F.sizes.xs, color: C.textMuted, fontFamily: F.heading, marginTop: 2 },
  goalPct: { fontSize: F.sizes.lg, fontWeight: F.weights.extra, fontFamily: F.heading, color: C.secondaryDark },
  goalBarBg: { height: 8, background: C.borderLight, borderRadius: 99, overflow: 'hidden' },
  goalBarFill: { height: '100%', borderRadius: 99, transition: 'width 0.4s ease' },

  // --- Goal picker ---
  goalList: { padding: '0' },
  goalPickCard: { display: 'flex', alignItems: 'center', gap: 12, width: '100%', padding: '14px 16px', background: C.bgCard, borderRadius: 14, border: `1.5px solid ${C.borderLight}`, marginBottom: 8, cursor: 'pointer', textAlign: 'left' },
  goalPickInfo: { flex: 1, minWidth: 0 },
  goalPickTitle: { display: 'block', fontSize: F.sizes.md, fontWeight: F.weights.bold, fontFamily: F.heading, color: C.text, marginBottom: 6 },
  goalPickPct: { fontSize: F.sizes.xs, color: C.textMuted, fontFamily: F.heading },
  newGoalBtn: { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, width: '100%', padding: '12px', borderRadius: 14, border: `2px dashed ${C.primary}`, background: C.primaryLight, cursor: 'pointer', fontSize: F.sizes.sm, fontWeight: F.weights.bold, fontFamily: F.heading, color: C.primaryDark, marginTop: 4 },
  newGoalForm: { padding: 14, background: C.bgCard, borderRadius: 14, border: `1.5px solid ${C.borderLight}`, marginTop: 8 },
  iconPickerRow: { display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 10 },
  iconPickerBtn: { width: 38, height: 38, borderRadius: 10, fontSize: 18, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  formInput: { width: '100%', padding: '12px 14px', borderRadius: 12, border: `2px solid ${C.border}`, fontSize: F.sizes.md, fontFamily: F.body, outline: 'none', boxSizing: 'border-box', minHeight: 48 },

  // --- Transactions ---
  txRow: { display: 'flex', alignItems: 'center', gap: 10, padding: '10px 0', borderBottom: `1px solid ${C.borderLight}` },
  txEmoji: { fontSize: 18, flexShrink: 0 },
  txContent: { flex: 1, minWidth: 0 },
  txLabel: { display: 'block', fontSize: F.sizes.sm, fontWeight: F.weights.semi, fontFamily: F.heading, color: C.text },
  txDate: { display: 'block', fontSize: F.sizes.xs, color: C.textMuted },
  txAmount: { fontSize: F.sizes.md, fontWeight: F.weights.bold, fontFamily: F.heading, flexShrink: 0 },
  emptyText: { fontSize: F.sizes.sm, color: C.textMuted, fontFamily: F.heading },
};
