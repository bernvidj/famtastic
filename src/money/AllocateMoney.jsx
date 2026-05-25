// ============================================
// FamTastic — AllocateMoney (interactive allocation)
// ============================================

import React, { useState } from 'react';
import { supabase } from '../supabaseClient';
import { C, F, S, formatKr } from '../data';
import { PiggyBank, ArrowUpCircle, Target, ArrowLeft, Check, Plus } from 'lucide-react';
import { sendPushToFamily } from '../notifications/sendPush';

export function AllocateMoney({ familyId, memberId, balance, goals, onComplete, onClose }) {
  const [step, setStep] = useState('choose'); // choose | amount | confirm | done
  const [action, setAction] = useState(null); // 'saving' | 'withdrawal' | 'family_goal'
  const [selectedGoal, setSelectedGoal] = useState(null);
  const [amount, setAmount] = useState(0);
  const [saving, setSaving] = useState(false);
  const [showNewGoal, setShowNewGoal] = useState(false);
  const [newGoalTitle, setNewGoalTitle] = useState('');
  const [newGoalTarget, setNewGoalTarget] = useState('');
  const [newGoalIcon, setNewGoalIcon] = useState('🎯');

  const balanceKr = balance / 100;
  const maxAmount = Math.max(0, balanceKr);
  const personalGoals = goals.filter(g => !g.is_family_goal);
  const familyGoals = goals.filter(g => g.is_family_goal);

  const GOAL_ICONS = ['🎯','🎮','⚽','🎸','👟','📱','🚲','🎨','✈️','🎁','💻','🏀'];

  function selectAction(act) {
    setAction(act);
    setAmount(0);
    if (act === 'withdrawal') {
      setSelectedGoal(null);
      setStep('amount');
    } else if (act === 'family_goal' && familyGoals.length === 1) {
      setSelectedGoal(familyGoals[0]);
      setStep('amount');
    } else {
      setStep('goal');
    }
  }

  function selectGoal(goal) {
    setSelectedGoal(goal);
    setStep('amount');
  }

  async function handleCreateGoal() {
    if (!newGoalTitle.trim() || !newGoalTarget) return;
    setSaving(true);

    const { data, error } = await supabase
      .from('savings_goals')
      .insert({
        family_id: familyId,
        member_id: memberId,
        title: newGoalTitle.trim(),
        target_amount: Math.round(Number(newGoalTarget) * 100),
        icon: newGoalIcon,
        is_family_goal: false,
      })
      .select()
      .single();

    setSaving(false);
    if (!error && data) {
      setSelectedGoal(data);
      setShowNewGoal(false);
      setStep('amount');
    }
  }

  async function handleConfirm() {
    if (amount <= 0 || amount > maxAmount) return;
    setSaving(true);

    const amountOre = Math.round(amount * 100);
    const txData = {
      family_id: familyId,
      member_id: memberId,
      amount: -amountOre,
      type: action,
      savings_goal_id: selectedGoal?.id || null,
      description: action === 'withdrawal'
        ? 'Utbetalning'
        : action === 'family_goal'
          ? `Bidrag till ${selectedGoal?.title}`
          : `Sparande till ${selectedGoal?.title}`,
    };

    const { error } = await supabase.from('money_transactions').insert(txData);

    setSaving(false);
    if (!error) {
      if (selectedGoal && getProgressAfter() >= 100) {
        sendPushToFamily({
          familyId,
          title: `🎉 Sparmål uppnått!`,
          body:  `${selectedGoal.icon || '🎯'} ${selectedGoal.title} är fullt!`,
        });
      }
      setStep('done');
    }
  }

  function getProgressAfter() {
    if (!selectedGoal) return 0;
    const currentSaved = goals.find(g => g.id === selectedGoal.id)?._saved || 0;
    const afterSaved = currentSaved + Math.round(amount * 100);
    return Math.min(100, (afterSaved / selectedGoal.target_amount) * 100);
  }

  // --- STEP: Choose action ---
  if (step === 'choose') {
    return (
      <div style={styles.overlay}>
        <div style={styles.modal}>
          <div style={styles.modalHeader}>
            <h2 style={styles.modalTitle}>Fördela pengar</h2>
            <button onClick={onClose} style={styles.closeBtn}>✕</button>
          </div>

          <div style={styles.balanceDisplay}>
            <span style={styles.balanceLabel}>Tillgängligt</span>
            <span style={styles.balanceValue}>{formatKr(balance)}</span>
          </div>

          <div style={styles.actionGrid}>
            <button onClick={() => selectAction('saving')} style={styles.actionCard}>
              <div style={{ ...styles.actionIcon, background: C.secondaryLight }}>
                <PiggyBank size={32} color={C.secondary} />
              </div>
              <span style={styles.actionTitle}>Spara</span>
              <span style={styles.actionDesc}>Lägg undan till ett sparmål</span>
            </button>

            <button onClick={() => selectAction('withdrawal')} style={styles.actionCard}>
              <div style={{ ...styles.actionIcon, background: C.primaryLight }}>
                <ArrowUpCircle size={32} color={C.primary} />
              </div>
              <span style={styles.actionTitle}>Ta ut</span>
              <span style={styles.actionDesc}>Få pengarna utbetalda</span>
            </button>

            {familyGoals.length > 0 && (
              <button onClick={() => selectAction('family_goal')} style={styles.actionCard}>
                <div style={{ ...styles.actionIcon, background: C.accentLight }}>
                  <Target size={32} color={C.warning} />
                </div>
                <span style={styles.actionTitle}>Familjemål</span>
                <span style={styles.actionDesc}>Bidra till {familyGoals[0]?.title}</span>
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // --- STEP: Choose goal ---
  if (step === 'goal') {
    const goalList = action === 'family_goal' ? familyGoals : personalGoals;
    return (
      <div style={styles.overlay}>
        <div style={styles.modal}>
          <div style={styles.modalHeader}>
            <button onClick={() => setStep('choose')} style={styles.backBtn}>
              <ArrowLeft size={18} />
            </button>
            <h2 style={styles.modalTitle}>
              {action === 'family_goal' ? 'Välj familjemål' : 'Välj sparmål'}
            </h2>
            <div style={{ width: 28 }} />
          </div>

          {goalList.map(goal => (
            <button
              key={goal.id}
              onClick={() => selectGoal(goal)}
              style={styles.goalRow}
            >
              <span style={styles.goalIcon}>{goal.icon || '🎯'}</span>
              <div style={styles.goalContent}>
                <span style={styles.goalTitle}>{goal.title}</span>
                <div style={styles.goalBarBg}>
                  <div style={{
                    ...styles.goalBarFill,
                    width: `${Math.min(100, ((goal._saved || 0) / goal.target_amount) * 100)}%`,
                  }} />
                </div>
                <span style={styles.goalProgress}>
                  {formatKr(goal._saved || 0)} av {formatKr(goal.target_amount)}
                </span>
              </div>
            </button>
          ))}

          {action === 'saving' && !showNewGoal && (
            <button onClick={() => setShowNewGoal(true)} style={styles.newGoalBtn}>
              <Plus size={16} /> Skapa nytt sparmål
            </button>
          )}

          {showNewGoal && (
            <div style={styles.newGoalForm}>
              <div style={styles.iconPickerRow}>
                {GOAL_ICONS.map(ic => (
                  <button
                    key={ic}
                    onClick={() => setNewGoalIcon(ic)}
                    style={{
                      ...styles.iconPickerBtn,
                      background: newGoalIcon === ic ? C.primaryLight : 'transparent',
                      border: newGoalIcon === ic ? `2px solid ${C.primary}` : '2px solid transparent',
                    }}
                  >
                    {ic}
                  </button>
                ))}
              </div>
              <input
                type="text"
                placeholder="Vad sparar du till?"
                value={newGoalTitle}
                onChange={e => setNewGoalTitle(e.target.value)}
                style={S.input}
                autoFocus
              />
              <input
                type="number"
                placeholder="Målbelopp (kr)"
                value={newGoalTarget}
                onChange={e => setNewGoalTarget(e.target.value)}
                style={{ ...S.input, marginTop: 8 }}
                min="1"
              />
              <button
                onClick={handleCreateGoal}
                disabled={saving || !newGoalTitle.trim() || !newGoalTarget}
                style={{
                  ...S.button, ...S.buttonPrimary, width: '100%', marginTop: 10,
                  opacity: saving || !newGoalTitle.trim() || !newGoalTarget ? 0.5 : 1,
                }}
              >
                {saving ? 'Skapar...' : 'Skapa sparmål'}
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  // --- STEP: Choose amount ---
  if (step === 'amount') {
    const label = action === 'withdrawal' ? 'Ta ut'
      : action === 'family_goal' ? `Bidra till ${selectedGoal?.title}`
      : `Spara till ${selectedGoal?.title}`;

    return (
      <div style={styles.overlay}>
        <div style={styles.modal}>
          <div style={styles.modalHeader}>
            <button onClick={() => setStep(action === 'withdrawal' ? 'choose' : 'goal')} style={styles.backBtn}>
              <ArrowLeft size={18} />
            </button>
            <h2 style={styles.modalTitle}>{label}</h2>
            <div style={{ width: 28 }} />
          </div>

          <div style={styles.amountSection}>
            <span style={styles.amountDisplay}>
              {amount > 0 ? formatKr(amount * 100) : '0 kr'}
            </span>
            <span style={styles.amountAvailable}>
              av {formatKr(balance)} tillgängligt
            </span>

            {/* Slider */}
            <input
              type="range"
              min="0"
              max={maxAmount}
              step="1"
              value={amount}
              onChange={e => setAmount(Number(e.target.value))}
              style={styles.slider}
            />

            {/* Quick buttons */}
            <div style={styles.quickRow}>
              {[10, 25, 50, 100].filter(v => v <= maxAmount).map(v => (
                <button
                  key={v}
                  onClick={() => setAmount(v)}
                  style={{
                    ...styles.quickBtn,
                    background: amount === v ? C.primary : C.bgCard,
                    color: amount === v ? '#fff' : C.text,
                  }}
                >
                  {v} kr
                </button>
              ))}
              <button
                onClick={() => setAmount(maxAmount)}
                style={{
                  ...styles.quickBtn,
                  background: amount === maxAmount ? C.primary : C.bgCard,
                  color: amount === maxAmount ? '#fff' : C.text,
                }}
              >
                Allt
              </button>
            </div>

            {/* Goal progress preview */}
            {selectedGoal && amount > 0 && (
              <div style={styles.previewCard}>
                <span style={styles.previewTitle}>
                  {selectedGoal.icon} {selectedGoal.title}
                </span>
                <div style={styles.previewBarBg}>
                  <div style={{
                    ...styles.previewBarFill,
                    width: `${getProgressAfter()}%`,
                    background: getProgressAfter() >= 100 ? C.success : C.primary,
                  }} />
                </div>
                <span style={styles.previewText}>
                  {Math.round(getProgressAfter())}% efter denna insättning
                  {getProgressAfter() >= 100 && ' 🎉'}
                </span>
              </div>
            )}
          </div>

          <button
            onClick={handleConfirm}
            disabled={saving || amount <= 0}
            style={{
              ...S.button, ...S.buttonPrimary, width: '100%',
              margin: '12px 0',
              opacity: saving || amount <= 0 ? 0.5 : 1,
            }}
          >
            {saving ? 'Sparar...' : 'Bekräfta'}
          </button>
        </div>
      </div>
    );
  }

  // --- STEP: Done ---
  if (step === 'done') {
    const doneMsg = action === 'withdrawal'
      ? 'Utbetalning registrerad! Be en förälder om pengarna.'
      : action === 'family_goal'
        ? `Tack för ditt bidrag till ${selectedGoal?.title}! 🎯`
        : `${formatKr(amount * 100)} sparat till ${selectedGoal?.title}! 🐷`;

    return (
      <div style={styles.overlay}>
        <div style={styles.modal}>
          <div style={styles.doneWrap}>
            <span style={styles.doneEmoji}>
              {action === 'withdrawal' ? '💸' : action === 'family_goal' ? '🎯' : '🐷'}
            </span>
            <h2 style={styles.doneTitle}>Klart!</h2>
            <p style={styles.doneText}>{doneMsg}</p>

            {selectedGoal && getProgressAfter() >= 100 && (
              <div style={styles.celebration}>
                🎉🎊 Grattis! Målet är uppnått! 🎊🎉
              </div>
            )}

            <button
              onClick={() => { onComplete(); onClose(); }}
              style={{ ...S.button, ...S.buttonPrimary, width: '100%', marginTop: 16 }}
            >
              <Check size={18} /> Stäng
            </button>
          </div>
        </div>
      </div>
    );
  }

  return null;
}

// --- Styles ---

const styles = {
  overlay: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(0,0,0,0.4)',
    display: 'flex',
    alignItems: 'flex-end',
    justifyContent: 'center',
    zIndex: 200,
  },
  modal: {
    width: '100%',
    maxWidth: 500,
    maxHeight: '90vh',
    overflowY: 'auto',
    background: C.bgCard,
    borderRadius: '20px 20px 0 0',
    padding: 20,
  },
  modalHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  modalTitle: {
    fontFamily: F.heading,
    fontSize: F.sizes.lg,
    fontWeight: F.weights.bold,
    color: C.text,
    margin: 0,
    textAlign: 'center',
    flex: 1,
  },
  closeBtn: {
    background: 'none',
    border: 'none',
    fontSize: 20,
    color: C.textMuted,
    cursor: 'pointer',
    padding: 4,
  },
  backBtn: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    padding: 4,
    color: C.textMuted,
  },
  balanceDisplay: {
    textAlign: 'center',
    padding: '16px 0',
    marginBottom: 16,
    background: C.bg,
    borderRadius: 14,
  },
  balanceLabel: {
    display: 'block',
    fontSize: F.sizes.sm,
    color: C.textMuted,
    marginBottom: 4,
  },
  balanceValue: {
    fontFamily: F.heading,
    fontSize: F.sizes.hero,
    fontWeight: F.weights.extra,
    color: C.text,
  },
  actionGrid: {
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
  },
  actionCard: {
    display: 'flex',
    alignItems: 'center',
    gap: 14,
    padding: 16,
    background: C.bg,
    borderRadius: 14,
    border: `1px solid ${C.borderLight}`,
    cursor: 'pointer',
    textAlign: 'left',
    width: '100%',
  },
  actionIcon: {
    width: 56,
    height: 56,
    borderRadius: 14,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  actionTitle: {
    display: 'block',
    fontFamily: F.heading,
    fontSize: F.sizes.md,
    fontWeight: F.weights.bold,
    color: C.text,
  },
  actionDesc: {
    display: 'block',
    fontSize: F.sizes.sm,
    color: C.textMuted,
    marginTop: 2,
  },
  goalRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    background: C.bg,
    borderRadius: 12,
    border: `1px solid ${C.borderLight}`,
    cursor: 'pointer',
    width: '100%',
    textAlign: 'left',
    marginBottom: 8,
  },
  goalIcon: {
    fontSize: 28,
    flexShrink: 0,
  },
  goalContent: {
    flex: 1,
    minWidth: 0,
  },
  goalTitle: {
    display: 'block',
    fontSize: F.sizes.md,
    fontWeight: F.weights.bold,
    fontFamily: F.heading,
    color: C.text,
    marginBottom: 6,
  },
  goalBarBg: {
    height: 6,
    background: C.borderLight,
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 4,
  },
  goalBarFill: {
    height: '100%',
    background: C.primary,
    borderRadius: 3,
  },
  goalProgress: {
    fontSize: F.sizes.xs,
    color: C.textMuted,
  },
  newGoalBtn: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    width: '100%',
    padding: 12,
    background: C.primaryLight,
    borderRadius: 12,
    border: `2px dashed ${C.primary}`,
    color: C.primary,
    fontSize: F.sizes.sm,
    fontWeight: F.weights.bold,
    fontFamily: F.heading,
    cursor: 'pointer',
    marginTop: 4,
  },
  newGoalForm: {
    padding: 14,
    background: C.bg,
    borderRadius: 12,
    marginTop: 8,
  },
  iconPickerRow: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: 4,
    marginBottom: 10,
  },
  iconPickerBtn: {
    width: 36,
    height: 36,
    borderRadius: 8,
    fontSize: 18,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  amountSection: {
    textAlign: 'center',
    padding: '8px 0',
  },
  amountDisplay: {
    display: 'block',
    fontFamily: F.heading,
    fontSize: F.sizes.hero,
    fontWeight: F.weights.extra,
    color: C.primary,
    marginBottom: 4,
  },
  amountAvailable: {
    display: 'block',
    fontSize: F.sizes.sm,
    color: C.textMuted,
    marginBottom: 20,
  },
  slider: {
    width: '100%',
    height: 8,
    borderRadius: 4,
    appearance: 'none',
    background: C.borderLight,
    outline: 'none',
    marginBottom: 16,
    accentColor: C.primary,
  },
  quickRow: {
    display: 'flex',
    justifyContent: 'center',
    gap: 6,
    marginBottom: 16,
  },
  quickBtn: {
    padding: '8px 14px',
    borderRadius: 10,
    border: `1px solid ${C.border}`,
    fontSize: F.sizes.sm,
    fontWeight: F.weights.bold,
    fontFamily: F.heading,
    cursor: 'pointer',
  },
  previewCard: {
    padding: 14,
    background: C.bg,
    borderRadius: 12,
    textAlign: 'left',
    marginTop: 8,
  },
  previewTitle: {
    display: 'block',
    fontSize: F.sizes.sm,
    fontWeight: F.weights.bold,
    fontFamily: F.heading,
    color: C.text,
    marginBottom: 8,
  },
  previewBarBg: {
    height: 8,
    background: C.borderLight,
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 6,
  },
  previewBarFill: {
    height: '100%',
    borderRadius: 4,
    transition: 'width 0.3s',
  },
  previewText: {
    fontSize: F.sizes.xs,
    color: C.textMuted,
  },
  doneWrap: {
    textAlign: 'center',
    padding: '20px 0',
  },
  doneEmoji: {
    fontSize: 56,
    display: 'block',
    marginBottom: 12,
  },
  doneTitle: {
    fontFamily: F.heading,
    fontSize: F.sizes.xxl,
    fontWeight: F.weights.extra,
    color: C.text,
    margin: '0 0 8px',
  },
  doneText: {
    fontSize: F.sizes.md,
    color: C.textMuted,
    lineHeight: 1.5,
    margin: 0,
  },
  celebration: {
    marginTop: 16,
    padding: 14,
    background: C.accentLight,
    borderRadius: 12,
    fontSize: F.sizes.md,
    fontWeight: F.weights.bold,
    fontFamily: F.heading,
    color: C.warning,
  },
};
