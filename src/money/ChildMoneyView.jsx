// ============================================
// FamTastic — ChildMoneyView
// Spara → Mål-hierarki med ta bort / arkivera
// ============================================

import React, { useState } from 'react';
import { supabase } from '../supabaseClient';
import { C, F, S, formatKr } from '../data';
import { Celebration } from '../Celebrations';
import { Wallet, PiggyBank, Target, ArrowRight, Check, ArrowLeft,
         ArrowUpCircle, Plus, Trash2, ChevronRight } from 'lucide-react';

const GOAL_ICONS = ['🎯','🎮','⚽','🎸','👟','📱','🚲','🎨','✈️','🎁','💻','🏀'];

export function ChildMoneyView({ familyId, memberId, transactions, goals, familyGoals, members, onReload }) {
  const [mode,          setMode]          = useState('jars'); // jars|move|pick_goal|new_goal|done
  const [moveTo,        setMoveTo]        = useState(null);
  const [selectedGoal,  setSelectedGoal]  = useState(null);
  const [amount,        setAmount]        = useState(0);
  const [saving,        setSaving]        = useState(false);
  const [showCelebration, setShowCelebration] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(null); // goal | null
  const [archiveConfirm,setArchiveConfirm]= useState(null); // goal | null
  const [newGoalTitle,  setNewGoalTitle]  = useState('');
  const [newGoalTarget, setNewGoalTarget] = useState('');
  const [newGoalIcon,   setNewGoalIcon]   = useState('🎯');

  // ─── Beräkningar ────────────────────────────────────────────────────────────
  const totalBalance = transactions.reduce((sum, tx) => sum + tx.amount, 0);
  const walletKr     = Math.max(0, totalBalance / 100);

  const totalSaved = transactions
    .filter(tx => tx.type === 'saving')
    .reduce((sum, tx) => sum + Math.abs(tx.amount), 0);

  const freeSpara = transactions
    .filter(tx => tx.type === 'saving' && !tx.savings_goal_id)
    .reduce((sum, tx) => sum + Math.abs(tx.amount), 0);

  function goalSaved(goalId) {
    return transactions
      .filter(tx => tx.savings_goal_id === goalId)
      .reduce((sum, tx) => sum + Math.abs(tx.amount), 0);
  }

  const recentTx = transactions.slice(0, 8);

  // ─── Flytta pengar ──────────────────────────────────────────────────────────
  function startMove(to, goal = null) {
    setMoveTo(to);
    setAmount(0);
    if (goal) {
      setSelectedGoal(goal);
      setMode('move');
    } else if (to === 'withdrawal') {
      setSelectedGoal(null);
      setMode('move');
    } else if (to === 'family_goal' && familyGoals.length === 1) {
      setSelectedGoal(familyGoals[0]);
      setMode('move');
    } else if (to === 'saving' || to === 'family_goal') {
      setMode('pick_goal');
    } else {
      setMode('move');
    }
  }

  async function handleConfirm() {
    if (amount <= 0 || amount > walletKr) return;
    setSaving(true);
    const amountOre  = Math.round(amount * 100);
    const description = moveTo === 'withdrawal'
      ? `Uttag ${formatKr(amountOre)}`
      : moveTo === 'family_goal'
        ? `Bidrag till ${selectedGoal?.title || 'familjemålet'}`
        : selectedGoal
          ? `Sparande till ${selectedGoal.title}`
          : 'Fri sparande';

    const { data, error } = await supabase.rpc('child_move_money', {
      p_family_id:       familyId,
      p_member_id:       memberId,
      p_amount_ore:      amountOre,
      p_type:            moveTo,
      p_savings_goal_id: selectedGoal?.id || null,
      p_description:     description,
    });
    setSaving(false);
    if (!error && data?.success) {
      setShowCelebration(true);
      setMode('done');
    }
  }

  // ─── Skapa sparmål ──────────────────────────────────────────────────────────
  async function handleCreateGoal() {
    if (!newGoalTitle.trim() || !newGoalTarget) return;
    setSaving(true);
    const { data, error } = await supabase.rpc('child_create_savings_goal', {
      p_family_id:    familyId,
      p_member_id:    memberId,
      p_title:        newGoalTitle.trim(),
      p_target_amount: Math.round(Number(newGoalTarget) * 100),
      p_icon:         newGoalIcon,
    });
    setSaving(false);
    if (!error && data?.success) {
      setNewGoalTitle('');
      setNewGoalTarget('');
      setNewGoalIcon('🎯');
      onReload();
      setMode('jars');
    }
  }

  // ─── Ta bort mål ────────────────────────────────────────────────────────────
  async function handleDeleteGoal(goal) {
    setSaving(true);
    // RPC hanterar: lossa transaktioner → fri sparande, sedan ta bort målet
    await supabase.rpc('child_delete_savings_goal', {
      p_family_id: familyId,
      p_member_id: memberId,
      p_goal_id:   goal.id,
    });
    setSaving(false);
    setDeleteConfirm(null);
    onReload();
  }

  // ─── Arkivera uppnått mål ──────────────────────────────────────────────────
  async function handleArchiveGoal(goal) {
    setSaving(true);
    await supabase.from('savings_goals')
      .update({ achieved_at: new Date().toISOString() })
      .eq('id', goal.id);
    setSaving(false);
    setArchiveConfirm(null);
    onReload();
  }

  function reset() {
    setMode('jars');
    setMoveTo(null);
    setSelectedGoal(null);
    setAmount(0);
    setShowCelebration(false);
    onReload();
  }

  // ─── Välj mål ───────────────────────────────────────────────────────────────
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

        {list.map(g => {
          const saved = goalSaved(g.id);
          const pct   = Math.min(100, (saved / g.target_amount) * 100);
          return (
            <button key={g.id} onClick={() => { setSelectedGoal(g); setMode('move'); }}
              style={styles.goalPickCard}>
              <span style={{ fontSize: 26 }}>{g.icon || '🎯'}</span>
              <div style={styles.goalPickInfo}>
                <span style={styles.goalPickTitle}>{g.title}</span>
                <div style={styles.goalBarBg}>
                  <div style={{ ...styles.goalBarFill, width: `${pct}%` }} />
                </div>
                <span style={styles.goalPickSub}>{formatKr(saved)} av {formatKr(g.target_amount)}</span>
              </div>
              <ChevronRight size={18} color={C.textMuted} />
            </button>
          );
        })}

        {moveTo === 'saving' && (
          <button onClick={() => { setSelectedGoal(null); setMode('move'); }}
            style={styles.freeSparaPickBtn}>
            💡 Spara fritt (inget specifikt mål)
          </button>
        )}

        {moveTo === 'saving' && (
          <button onClick={() => setMode('new_goal')} style={styles.newGoalPickBtn}>
            <Plus size={16} /> Skapa nytt sparmål
          </button>
        )}
      </div>
    );
  }

  // ─── Nytt sparmål ───────────────────────────────────────────────────────────
  if (mode === 'new_goal') {
    return (
      <div style={styles.page}>
        <div style={styles.header}>
          <button onClick={() => setMode('jars')} style={styles.backBtn}>
            <ArrowLeft size={20} color={C.text} />
          </button>
          <h1 style={styles.title}>Nytt sparmål</h1>
        </div>

        <div style={styles.newGoalCard}>
          <div style={styles.iconPickerRow}>
            {GOAL_ICONS.map(ic => (
              <button key={ic} onClick={() => setNewGoalIcon(ic)} style={{
                ...styles.iconPickerBtn,
                background: newGoalIcon === ic ? C.primaryLight : 'transparent',
                border: `2px solid ${newGoalIcon === ic ? C.primary : 'transparent'}`,
              }}>{ic}</button>
            ))}
          </div>
          <input type="text" placeholder="Vad sparar du till?"
            value={newGoalTitle} onChange={e => setNewGoalTitle(e.target.value)}
            style={{ ...styles.formInput, marginBottom: 10 }} autoFocus />
          <input type="number" placeholder="Målbelopp (kr)"
            value={newGoalTarget} onChange={e => setNewGoalTarget(e.target.value)}
            style={styles.formInput} min="1" />
          <button onClick={handleCreateGoal}
            disabled={saving || !newGoalTitle.trim() || !newGoalTarget}
            style={{ ...styles.confirmBtn, marginTop: 16,
              opacity: saving || !newGoalTitle.trim() || !newGoalTarget ? 0.5 : 1 }}>
            {saving ? 'Skapar...' : 'Skapa sparmål'}
          </button>
        </div>
      </div>
    );
  }

  // ─── Flytta belopp ──────────────────────────────────────────────────────────
  if (mode === 'move') {
    return (
      <div style={styles.page}>
        <div style={styles.header}>
          <button onClick={() => setMode(moveTo === 'withdrawal' ? 'jars' : 'pick_goal')}
            style={styles.backBtn}>
            <ArrowLeft size={20} color={C.text} />
          </button>
          <h1 style={styles.title}>
            {moveTo === 'withdrawal' ? 'Begär uttag' : 'Spara pengar'}
          </h1>
        </div>

        <div style={styles.moveCard}>
          <div style={styles.moveItem}>
            <div style={{ ...styles.moveIcon, background: C.primaryLight }}>
              <Wallet size={20} color={C.primary} />
            </div>
            <span style={styles.moveLabel}>Plånbok</span>
          </div>
          <ArrowRight size={20} color={C.textMuted} />
          <div style={styles.moveItem}>
            <div style={{ ...styles.moveIcon,
              background: moveTo === 'withdrawal' ? C.errorLight
                : moveTo === 'family_goal' ? C.accentLight : C.secondaryLight }}>
              {moveTo === 'withdrawal'
                ? <ArrowUpCircle size={20} color={C.error} />
                : moveTo === 'family_goal'
                  ? <Target size={20} color={C.accent} />
                  : <PiggyBank size={20} color={C.secondary} />}
            </div>
            <span style={styles.moveLabel}>
              {moveTo === 'withdrawal' ? 'Uttag'
                : selectedGoal?.title || 'Fri sparande'}
            </span>
          </div>
        </div>

        <div style={styles.amountWrap}>
          <span style={styles.amountDisplay}>{amount > 0 ? `${amount} kr` : '0 kr'}</span>
          <span style={styles.amountSub}>av {Math.floor(walletKr)} kr i plånboken</span>
          <input type="range" min="0" max={Math.floor(walletKr)} step="1" value={amount}
            onChange={e => setAmount(Number(e.target.value))} style={styles.slider} />
          <div style={styles.quickRow}>
            {[5, 10, 25, 50].filter(v => v <= walletKr).map(v => (
              <button key={v} onClick={() => setAmount(v)} style={{
                ...styles.quickBtn,
                background: amount === v ? C.primary : C.bgCard,
                color:      amount === v ? '#fff' : C.text,
              }}>{v} kr</button>
            ))}
          </div>
        </div>

        <button onClick={handleConfirm} disabled={saving || amount <= 0}
          style={{ ...styles.confirmBtn, opacity: saving || amount <= 0 ? 0.5 : 1 }}>
          {saving ? 'Sparar...' : moveTo === 'withdrawal'
            ? `Begär uttag ${amount} kr` : `Spara ${amount} kr`}
        </button>
      </div>
    );
  }

  // ─── Klart ──────────────────────────────────────────────────────────────────
  if (mode === 'done') {
    const emoji  = moveTo === 'withdrawal' ? '💸' : moveTo === 'family_goal' ? '🎯' : '🐷';
    const msg    = moveTo === 'withdrawal'
      ? `${amount} kr begärt. Be en förälder betala ut!`
      : `${amount} kr sparat${selectedGoal ? ` till ${selectedGoal.title}` : ''}! 🐷`;
    return (
      <div style={styles.page}>
        <Celebration type={moveTo === 'withdrawal' ? 'confetti' : 'sparkle'}
          active={showCelebration} onDone={() => setShowCelebration(false)} />
        <div style={styles.doneWrap}>
          <span style={{ fontSize: 56 }}>{emoji}</span>
          <h2 style={styles.doneTitle}>Klart!</h2>
          <p style={styles.doneText}>{msg}</p>
          <button onClick={reset} style={styles.confirmBtn}>
            <Check size={18} /> Tillbaka
          </button>
        </div>
      </div>
    );
  }

  // ─── Huvudvy ────────────────────────────────────────────────────────────────
  return (
    <div style={styles.page}>
      <Celebration type="sparkle" active={showCelebration}
        onDone={() => setShowCelebration(false)} />

      <h1 style={styles.title}>Mina pengar</h1>

      {/* ═══ SPARA — högst i hierarkin ═════════════════════════════════════ */}
      <div style={styles.sparaContainer}>
        {/* Header */}
        <div style={styles.sparaHeader}>
          <div style={styles.sparaLeft}>
            <div style={styles.sparaIconWrap}>
              <PiggyBank size={20} color={C.secondary} />
            </div>
            <span style={styles.sparaLabel}>Spara</span>
          </div>
          <span style={styles.sparaTotal}>{formatKr(totalSaved)}</span>
        </div>

        {/* Tom state */}
        {goals.length === 0 && freeSpara === 0 && (
          <p style={styles.sparaEmpty}>
            Tryck på "Spara mer" för att börja spara, eller skapa ett mål! 🎯
          </p>
        )}

        {/* Sparmål */}
        {goals.map(g => {
          const saved      = goalSaved(g.id);
          const pct        = Math.min(100, (saved / g.target_amount) * 100);
          const isAchieved = pct >= 100;
          return (
            <div key={g.id} style={{
              ...styles.goalInSpara,
              borderColor: isAchieved ? C.success : C.borderLight,
              background:  isAchieved ? C.successLight : C.bgCard,
            }}>
              <div style={styles.goalInSparaTop}>
                <span style={{ fontSize: 20, flexShrink: 0 }}>{g.icon || '🎯'}</span>
                <div style={styles.goalInSparaInfo}>
                  <span style={styles.goalInSparaTitle}>{g.title}</span>
                  <span style={styles.goalInSparaSub}>
                    {formatKr(saved)} av {formatKr(g.target_amount)}
                  </span>
                </div>
                <span style={{ ...styles.goalPct,
                  color: isAchieved ? C.success : C.secondaryDark }}>
                  {Math.round(pct)}%
                </span>
                <button
                  onClick={() => isAchieved ? setArchiveConfirm(g) : setDeleteConfirm(g)}
                  style={styles.goalDeleteBtn}
                  title={isAchieved ? 'Stäng mål' : 'Ta bort mål'}
                >
                  <Trash2 size={14} color={isAchieved ? C.success : C.error} />
                </button>
              </div>
              <div style={styles.goalBarBg}>
                <div style={{
                  ...styles.goalBarFill,
                  width: `${pct}%`,
                  background: isAchieved ? C.success
                    : `linear-gradient(90deg, ${C.secondary}, ${C.accent})`,
                }} />
              </div>
              {isAchieved && (
                <div style={styles.achievedBadge}>🎉 Mål uppnått!</div>
              )}
            </div>
          );
        })}

        {/* Fri sparande (ej knutet till mål) */}
        {freeSpara > 0 && (
          <div style={styles.freeSparaRow}>
            <span style={styles.freeSparaLabel}>💡 Fri sparande</span>
            <span style={styles.freeSparaAmount}>{formatKr(freeSpara)}</span>
          </div>
        )}

        {/* Knappar */}
        <div style={styles.sparaActions}>
          <button onClick={() => startMove('saving')}
            style={{ ...styles.sparaBtn, background: C.secondaryLight, color: C.secondaryDark }}>
            <PiggyBank size={15} /> Spara mer
          </button>
          <button onClick={() => setMode('new_goal')}
            style={{ ...styles.sparaBtn, background: C.primaryLight, color: C.primaryDark }}>
            <Plus size={15} /> Nytt mål
          </button>
        </div>
      </div>

      {/* ═══ PLÅNBOK ════════════════════════════════════════════════════════ */}
      <div style={styles.walletCard}>
        <div style={styles.walletLeft}>
          <div style={styles.walletIconWrap}><Wallet size={22} color="#fff" /></div>
          <div>
            <span style={styles.walletLabel}>Plånbok</span>
            <span style={styles.walletSub}>Fria pengar</span>
          </div>
        </div>
        <div style={styles.walletRight}>
          <span style={styles.walletAmount}>{formatKr(totalBalance)}</span>
          {totalBalance > 0 && (
            <button onClick={() => startMove('withdrawal')} style={styles.withdrawBtn}>
              Ta ut →
            </button>
          )}
        </div>
      </div>

      {/* ═══ FAMILJEMÅL ═════════════════════════════════════════════════════ */}
      {familyGoals.length > 0 && (
        <div style={styles.section}>
          <p style={S.sectionLabel}>Familjemål</p>
          {familyGoals.map(fg => (
            <button key={fg.id} onClick={() => startMove('family_goal', fg)}
              style={styles.familyGoalBtn}>
              <span style={{ fontSize: 24 }}>{fg.icon || '🎯'}</span>
              <span style={styles.familyGoalTitle}>{fg.title}</span>
              <span style={styles.familyGoalAction}>Bidra →</span>
            </button>
          ))}
        </div>
      )}

      {/* ═══ SENASTE ════════════════════════════════════════════════════════ */}
      <div style={styles.section}>
        <p style={S.sectionLabel}>Senaste</p>
        {recentTx.length === 0 ? (
          <p style={styles.emptyText}>Inga transaktioner ännu</p>
        ) : recentTx.map(tx => (
          <div key={tx.id} style={styles.txRow}>
            <span style={styles.txEmoji}>
              {tx.amount > 0 ? '💰' : tx.type === 'saving' ? '🐷' : '💸'}
            </span>
            <div style={styles.txContent}>
              <span style={styles.txLabel}>{tx.description || tx.type}</span>
              <span style={styles.txDate}>
                {new Date(tx.created_at).toLocaleDateString('sv-SE')}
              </span>
            </div>
            <span style={{ ...styles.txAmount,
              color: tx.amount > 0 ? C.success : C.error }}>
              {tx.amount > 0 ? '+' : ''}{formatKr(tx.amount)}
            </span>
          </div>
        ))}
      </div>

      {/* ═══ TA BORT MÅL — modal ════════════════════════════════════════════ */}
      {deleteConfirm && (
        <div style={styles.overlay}>
          <div style={styles.confirmModal}>
            <span style={{ fontSize: 44, display: 'block', marginBottom: 8 }}>
              {deleteConfirm.icon || '🎯'}
            </span>
            <h3 style={styles.confirmTitle}>Ta bort "{deleteConfirm.title}"?</h3>
            <p style={styles.confirmText}>
              {goalSaved(deleteConfirm.id) > 0
                ? `${formatKr(goalSaved(deleteConfirm.id))} läggs tillbaka som fri sparande.`
                : 'Målet är tomt och tas bara bort.'}
            </p>
            <div style={styles.confirmBtns}>
              <button onClick={() => setDeleteConfirm(null)} style={styles.cancelBtn}>
                Avbryt
              </button>
              <button onClick={() => handleDeleteGoal(deleteConfirm)}
                disabled={saving}
                style={{ ...styles.deleteConfirmBtn, opacity: saving ? 0.5 : 1 }}>
                {saving ? '...' : 'Ta bort'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══ ARKIVERA MÅL — modal ═══════════════════════════════════════════ */}
      {archiveConfirm && (
        <div style={styles.overlay}>
          <div style={styles.confirmModal}>
            <span style={{ fontSize: 44, display: 'block', marginBottom: 8 }}>🎉</span>
            <h3 style={styles.confirmTitle}>Du nådde ditt mål!</h3>
            <p style={styles.confirmText}>
              Grattis! Du sparade till "{archiveConfirm.title}"!
              Vill du stänga det och frigöra sparandet?
            </p>
            <div style={styles.confirmBtns}>
              <button onClick={() => setArchiveConfirm(null)} style={styles.cancelBtn}>
                Behåll
              </button>
              <button onClick={() => handleArchiveGoal(archiveConfirm)}
                disabled={saving}
                style={{ ...styles.archiveConfirmBtn, opacity: saving ? 0.5 : 1 }}>
                {saving ? '...' : 'Stäng mål 🎊'}
              </button>
            </div>
          </div>
        </div>
      )}

      <div style={{ height: 80 }} />
    </div>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────
const styles = {
  page:    { padding: '12px 16px', position: 'relative', zIndex: 1 },
  header:  { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 },
  backBtn: { background: 'none', border: 'none', cursor: 'pointer', padding: 8,
             minHeight: 44, minWidth: 44, display: 'flex', alignItems: 'center', justifyContent: 'center' },
  title:   { fontFamily: F.heading, fontSize: F.sizes.xl, fontWeight: F.weights.extra, color: C.text, margin: 0 },

  // ── Spara-behållare ──────────────────────────────────────────────────────
  sparaContainer: {
    background: C.bgCard,
    borderRadius: 20,
    border: `1.5px solid ${C.borderLight}`,
    padding: 16,
    marginBottom: 12,
    boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
  },
  sparaHeader: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  sparaLeft:   { display: 'flex', alignItems: 'center', gap: 10 },
  sparaIconWrap: { width: 36, height: 36, borderRadius: 10, background: C.secondaryLight,
                   display: 'flex', alignItems: 'center', justifyContent: 'center' },
  sparaLabel:  { fontFamily: F.heading, fontSize: F.sizes.lg, fontWeight: F.weights.extra, color: C.text },
  sparaTotal:  { fontFamily: F.heading, fontSize: F.sizes.xl, fontWeight: F.weights.extra, color: C.secondaryDark },
  sparaEmpty:  { fontSize: F.sizes.sm, color: C.textMuted, fontFamily: F.heading,
                 textAlign: 'center', padding: '12px 0', lineHeight: 1.5 },

  // ── Sparmål i Spara ──────────────────────────────────────────────────────
  goalInSpara: {
    borderRadius: 14,
    border: '1.5px solid',
    padding: '12px 12px 10px',
    marginBottom: 8,
  },
  goalInSparaTop: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 },
  goalInSparaInfo: { flex: 1, minWidth: 0 },
  goalInSparaTitle: { display: 'block', fontSize: F.sizes.md, fontWeight: F.weights.bold,
                      fontFamily: F.heading, color: C.text },
  goalInSparaSub:   { display: 'block', fontSize: F.sizes.xs, color: C.textMuted, fontFamily: F.heading, marginTop: 1 },
  goalPct:     { fontSize: F.sizes.md, fontWeight: F.weights.extra, fontFamily: F.heading, flexShrink: 0 },
  goalDeleteBtn: { background: 'none', border: 'none', cursor: 'pointer', padding: 6,
                   display: 'flex', alignItems: 'center', justifyContent: 'center',
                   borderRadius: 8, flexShrink: 0, minHeight: 36, minWidth: 36 },
  goalBarBg:   { height: 8, background: C.borderLight, borderRadius: 99, overflow: 'hidden' },
  goalBarFill: { height: '100%', borderRadius: 99, transition: 'width 0.4s ease' },
  achievedBadge: { marginTop: 8, fontSize: F.sizes.xs, fontWeight: F.weights.bold,
                   fontFamily: F.heading, color: C.success, textAlign: 'center' },

  // ── Fri sparande ─────────────────────────────────────────────────────────
  freeSparaRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: '10px 12px', background: C.bg, borderRadius: 12,
                  border: `1px dashed ${C.borderLight}`, marginBottom: 8 },
  freeSparaLabel:  { fontSize: F.sizes.sm, fontWeight: F.weights.semi, fontFamily: F.heading, color: C.textMuted },
  freeSparaAmount: { fontSize: F.sizes.md, fontWeight: F.weights.bold, fontFamily: F.heading, color: C.text },

  // ── Spara-knappar ────────────────────────────────────────────────────────
  sparaActions: { display: 'flex', gap: 8, marginTop: 4 },
  sparaBtn: { display: 'flex', alignItems: 'center', gap: 6, flex: 1, justifyContent: 'center',
              padding: '10px 12px', borderRadius: 12, border: 'none', cursor: 'pointer',
              fontSize: F.sizes.sm, fontWeight: F.weights.bold, fontFamily: F.heading, minHeight: 44 },

  // ── Plånbok ──────────────────────────────────────────────────────────────
  walletCard: { display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '16px 18px', borderRadius: 20,
                background: `linear-gradient(135deg, ${C.primary}, #E85D04)`,
                marginBottom: 16, boxShadow: '0 4px 16px rgba(249,115,22,0.25)',
                boxSizing: 'border-box' },
  walletLeft:    { display: 'flex', alignItems: 'center', gap: 12 },
  walletIconWrap:{ width: 44, height: 44, borderRadius: 12, background: 'rgba(255,255,255,0.25)',
                   display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  walletLabel:   { display: 'block', fontSize: F.sizes.md, fontWeight: F.weights.bold, fontFamily: F.heading, color: '#fff' },
  walletSub:     { display: 'block', fontSize: F.sizes.xs, color: 'rgba(255,255,255,0.75)', fontFamily: F.heading, marginTop: 2 },
  walletRight:   { display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6 },
  walletAmount:  { fontSize: F.sizes.xxl, fontWeight: F.weights.extra, fontFamily: F.heading, color: '#fff' },
  withdrawBtn:   { padding: '6px 14px', borderRadius: 99, background: 'rgba(255,255,255,0.25)',
                   border: '1.5px solid rgba(255,255,255,0.5)', color: '#fff',
                   fontSize: F.sizes.xs, fontWeight: F.weights.bold, fontFamily: F.heading, cursor: 'pointer' },

  // ── Familjemål ───────────────────────────────────────────────────────────
  familyGoalBtn: { display: 'flex', alignItems: 'center', gap: 12, width: '100%',
                   padding: '14px 16px', background: C.accentLight, borderRadius: 16,
                   border: `1.5px solid ${C.accent}`, cursor: 'pointer', textAlign: 'left',
                   marginBottom: 8, boxSizing: 'border-box' },
  familyGoalTitle:  { flex: 1, fontSize: F.sizes.md, fontWeight: F.weights.bold,
                      fontFamily: F.heading, color: '#92400E' },
  familyGoalAction: { fontSize: F.sizes.sm, fontWeight: F.weights.bold, fontFamily: F.heading, color: C.accent },

  // ── Senaste ──────────────────────────────────────────────────────────────
  section:   { marginBottom: 16 },
  txRow:     { display: 'flex', alignItems: 'center', gap: 10, padding: '10px 0',
               borderBottom: `1px solid ${C.borderLight}` },
  txEmoji:   { fontSize: 18, flexShrink: 0 },
  txContent: { flex: 1, minWidth: 0 },
  txLabel:   { display: 'block', fontSize: F.sizes.sm, fontWeight: F.weights.semi, fontFamily: F.heading, color: C.text },
  txDate:    { display: 'block', fontSize: F.sizes.xs, color: C.textMuted },
  txAmount:  { fontSize: F.sizes.md, fontWeight: F.weights.bold, fontFamily: F.heading, flexShrink: 0 },
  emptyText: { fontSize: F.sizes.sm, color: C.textMuted, fontFamily: F.heading },

  // ── Pick goal ────────────────────────────────────────────────────────────
  goalPickCard:  { display: 'flex', alignItems: 'center', gap: 12, width: '100%',
                   padding: '14px 16px', background: C.bgCard, borderRadius: 14,
                   border: `1.5px solid ${C.borderLight}`, marginBottom: 8,
                   cursor: 'pointer', textAlign: 'left', boxSizing: 'border-box' },
  goalPickInfo:  { flex: 1, minWidth: 0 },
  goalPickTitle: { display: 'block', fontSize: F.sizes.md, fontWeight: F.weights.bold,
                   fontFamily: F.heading, color: C.text, marginBottom: 6 },
  goalPickSub:   { fontSize: F.sizes.xs, color: C.textMuted, fontFamily: F.heading },
  freeSparaPickBtn: { display: 'flex', alignItems: 'center', justifyContent: 'center',
                      gap: 6, width: '100%', padding: 14, background: C.bg, borderRadius: 14,
                      border: `1.5px dashed ${C.borderLight}`, cursor: 'pointer', fontSize: F.sizes.sm,
                      fontWeight: F.weights.bold, fontFamily: F.heading, color: C.textMuted,
                      marginBottom: 8, boxSizing: 'border-box' },
  newGoalPickBtn: { display: 'flex', alignItems: 'center', justifyContent: 'center',
                    gap: 6, width: '100%', padding: 14, background: C.primaryLight,
                    borderRadius: 14, border: `2px dashed ${C.primary}`, cursor: 'pointer',
                    fontSize: F.sizes.sm, fontWeight: F.weights.bold,
                    fontFamily: F.heading, color: C.primaryDark, boxSizing: 'border-box' },

  // ── Nytt mål ─────────────────────────────────────────────────────────────
  newGoalCard:    { background: C.bgCard, borderRadius: 16, border: `1.5px solid ${C.borderLight}`, padding: 16 },
  iconPickerRow:  { display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 12 },
  iconPickerBtn:  { width: 38, height: 38, borderRadius: 10, fontSize: 18, cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center' },
  formInput:      { width: '100%', padding: '12px 14px', borderRadius: 12,
                    border: `2px solid ${C.border}`, fontSize: F.sizes.md, fontFamily: F.body,
                    outline: 'none', boxSizing: 'border-box', minHeight: 48 },

  // ── Flytta pengar ────────────────────────────────────────────────────────
  moveCard:  { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12,
               padding: 16, background: C.bgCard, borderRadius: 16,
               border: `1.5px solid ${C.borderLight}`, marginBottom: 20 },
  moveItem:  { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 },
  moveIcon:  { width: 40, height: 40, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center' },
  moveLabel: { fontSize: F.sizes.xs, fontWeight: F.weights.bold, fontFamily: F.heading, color: C.text },
  amountWrap:    { textAlign: 'center', marginBottom: 16 },
  amountDisplay: { display: 'block', fontFamily: F.heading, fontSize: F.sizes.hero,
                   fontWeight: F.weights.extra, color: C.primary, marginBottom: 4 },
  amountSub:     { display: 'block', fontSize: F.sizes.sm, color: C.textMuted,
                   marginBottom: 20, fontFamily: F.heading },
  slider:   { width: '100%', height: 8, borderRadius: 4, appearance: 'none',
              background: C.borderLight, outline: 'none', marginBottom: 16, accentColor: C.primary },
  quickRow: { display: 'flex', justifyContent: 'center', gap: 8 },
  quickBtn: { padding: '10px 16px', borderRadius: 12, border: `1.5px solid ${C.border}`,
              fontSize: F.sizes.sm, fontWeight: F.weights.bold, fontFamily: F.heading,
              cursor: 'pointer', minHeight: 44 },
  confirmBtn: { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                width: '100%', padding: 14, borderRadius: 14, border: 'none',
                background: C.primary, color: '#fff', fontSize: F.sizes.md,
                fontWeight: F.weights.bold, fontFamily: F.heading, cursor: 'pointer', minHeight: 52 },

  // ── Klart ────────────────────────────────────────────────────────────────
  doneWrap:  { textAlign: 'center', padding: '40px 0' },
  doneTitle: { fontFamily: F.heading, fontSize: F.sizes.xxl, fontWeight: F.weights.extra,
               color: C.text, margin: '12px 0 8px' },
  doneText:  { fontSize: F.sizes.md, color: C.textMuted, fontFamily: F.heading, margin: '0 0 24px' },

  // ── Bekräftelsemodal ─────────────────────────────────────────────────────
  overlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)',
             display: 'flex', alignItems: 'flex-end', justifyContent: 'center', zIndex: 200 },
  confirmModal: { width: '100%', maxWidth: 480, background: C.bgCard,
                  borderRadius: '20px 20px 0 0', padding: '24px 20px 32px',
                  textAlign: 'center' },
  confirmTitle: { fontFamily: F.heading, fontSize: F.sizes.lg, fontWeight: F.weights.extra,
                  color: C.text, margin: '0 0 8px' },
  confirmText:  { fontSize: F.sizes.sm, color: C.textMuted, fontFamily: F.heading,
                  lineHeight: 1.5, margin: '0 0 20px' },
  confirmBtns:  { display: 'flex', gap: 10 },
  cancelBtn:    { flex: 1, padding: 14, borderRadius: 14, border: `1.5px solid ${C.border}`,
                  background: C.bgCard, color: C.text, fontSize: F.sizes.md,
                  fontWeight: F.weights.bold, fontFamily: F.heading, cursor: 'pointer' },
  deleteConfirmBtn: { flex: 1, padding: 14, borderRadius: 14, border: 'none',
                      background: C.error, color: '#fff', fontSize: F.sizes.md,
                      fontWeight: F.weights.bold, fontFamily: F.heading, cursor: 'pointer' },
  archiveConfirmBtn: { flex: 1, padding: 14, borderRadius: 14, border: 'none',
                       background: C.success, color: '#fff', fontSize: F.sizes.md,
                       fontWeight: F.weights.bold, fontFamily: F.heading, cursor: 'pointer' },
};
