// ============================================
// FamTastic — Onboarding
// 3-stegsflöde för ny familj utan barn:
// 1. Lägg till ditt första barn
// 2. Sätt första sysslan
// 3. Sätt veckopeng
// ============================================

import React, { useState } from 'react';
import { supabase } from './supabaseClient';
import { C, F, S } from './data';
import { Confetti } from './Celebrations';

const AVATARS = ['😀','😎','🦊','🐻','🦄','🌟','🎨','⚽','🎵','🌈','🍕','🐱','🐶','🦋','🚀','💪'];
const MEMBER_COLORS = C.memberColors;

const WEEKDAY_LABELS = ['Måndag','Tisdag','Onsdag','Torsdag','Fredag','Lördag','Söndag'];

const SUGGESTED_CHORES = [
  { title: 'Diska',           icon: '🍽️', desc: 'Diska och torka disken' },
  { title: 'Städa rummet',    icon: '🧹', desc: 'Städa och plocka undan' },
  { title: 'Ta hand om djur', icon: '🐾', desc: 'Mata och ta hand om husdjur' },
  { title: 'Ta ut soporna',   icon: '🗑️', desc: 'Ta ut och byt soporna' },
  { title: 'Dammsuga',        icon: '🌀', desc: 'Dammsug hemmet' },
  { title: 'Lägga i tvätt',   icon: '👕', desc: 'Lägg i och ta ur tvätten' },
];

export function Onboarding({ familyId, member, onComplete }) {
  const [step,         setStep]         = useState(1); // 1 | 2 | 3 | 'done'
  const [saving,       setSaving]       = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);

  // Steg 1 — barn
  const [childName,    setChildName]    = useState('');
  const [childPin,     setChildPin]     = useState('');
  const [childAvatar,  setChildAvatar]  = useState('😀');
  const [childColor,   setChildColor]   = useState(C.memberColors[1]);
  const [createdChild, setCreatedChild] = useState(null); // { id }

  // Steg 2 — sysslor
  const [selectedChores, setSelectedChores] = useState([]);

  // Steg 3 — veckopeng
  const [allowance,    setAllowance]    = useState(50);
  const [payday,       setPayday]       = useState(4); // Fredag
  const [autoAllowance,setAutoAllowance]= useState(true);

  // ─── Steg 1: Skapa barn ────────────────────────────────────────────────────
  async function handleAddChild() {
    if (!childName.trim()) return;
    setSaving(true);
    const { data, error } = await supabase
      .from('family_members')
      .insert({
        family_id: familyId,
        name:      childName.trim(),
        role:      'child',
        avatar:    childAvatar,
        color:     childColor,
        pin_hash:  childPin.length === 4 ? childPin : null,
        created_by: member.id,
      })
      .select('id')
      .single();
    setSaving(false);
    if (error || !data) {
      alert('Något gick fel. Försök igen.');
      return;
    }
    setCreatedChild(data);
    setStep(2);
  }

  // ─── Steg 2: Skapa sysslor ─────────────────────────────────────────────────
  async function handleCreateChores() {
    if (selectedChores.length === 0) { setStep(3); return; }
    setSaving(true);
    const rows = selectedChores.map(title => {
      const def = SUGGESTED_CHORES.find(c => c.title === title);
      return {
        family_id:   familyId,
        title:       def.title,
        icon:        def.icon,
        chore_type:  'base',
        is_recurring: true,
        recurrence_rule: { days: [1, 2, 3, 4, 5] }, // mån–fre
        assigned_to: createdChild?.id || null,
        created_by:  member.id,
      };
    });
    const { error } = await supabase.from('chores').insert(rows);
    setSaving(false);
    if (error) { alert('Kunde inte skapa sysslorna: ' + error.message); return; }
    setStep(3);
  }

  // ─── Steg 3: Veckopeng ────────────────────────────────────────────────────
  async function handleSetAllowance() {
    setSaving(true);
    if (allowance > 0 && createdChild) {
      const { error } = await supabase.from('allowance_rules').insert({
        family_id:     familyId,
        member_id:     createdChild.id,
        base_amount:   allowance * 100,
        payday,
        auto_allowance: autoAllowance,
      });
      if (error) { setSaving(false); alert('Kunde inte spara veckopengen: ' + error.message); return; }
    }
    setSaving(false);
    setShowConfetti(true);
    setStep('done');
    setTimeout(() => {
      setShowConfetti(false);
      onComplete();
    }, 3000);
  }

  function toggleChore(title) {
    setSelectedChores(prev =>
      prev.includes(title) ? prev.filter(t => t !== title) : [...prev, title]
    );
  }

  // ─── Steg-indikator ────────────────────────────────────────────────────────
  function StepDots({ current }) {
    return (
      <div style={dotStyles.row}>
        {[1, 2, 3].map(n => (
          <div key={n} style={{
            ...dotStyles.dot,
            background: n <= current ? C.primary : C.borderLight,
            transform:  n === current ? 'scale(1.25)' : 'scale(1)',
          }} />
        ))}
      </div>
    );
  }

  // ─── KLART ────────────────────────────────────────────────────────────────
  if (step === 'done') {
    return (
      <div style={styles.page}>
        <Confetti active={showConfetti} onDone={() => setShowConfetti(false)} />
        <div style={styles.doneWrap}>
          <span style={styles.doneEmoji}>🎉</span>
          <h1 style={styles.doneTitle}>Ni är redo!</h1>
          <p style={styles.doneText}>FamTastic är konfigurerat för er familj. Välkommen!</p>
          <div style={styles.doneLoader} />
        </div>
      </div>
    );
  }

  return (
    <div style={styles.page}>
      <style>{`
        @media (max-width: 400px) {
          .ob-card { padding: 20px 16px !important; }
          .ob-avatar-btn { width: 40px !important; height: 40px !important; font-size: 20px !important; }
          .ob-chore-grid { grid-template-columns: 1fr 1fr !important; }
        }
      `}</style>

      {/* Header */}
      <div style={styles.header}>
        <span style={styles.headerEmoji}>🏠</span>
        <h1 style={styles.headerTitle}>Välkommen till FamTastic!</h1>
        <p style={styles.headerSub}>Tre enkla steg för att komma igång</p>
      </div>

      <div className="ob-card" style={styles.card}>
        <StepDots current={step} />

        {/* ═════ STEG 1 ════════════════════════════════════════════════════ */}
        {step === 1 && (
          <>
            <h2 style={styles.stepTitle}>👶 Steg 1 av 3</h2>
            <h3 style={styles.stepHeading}>Lägg till ditt första barn</h3>

            <label style={styles.label}>Barnets namn</label>
            <input
              type="text"
              placeholder="Skriv namn..."
              value={childName}
              onChange={e => setChildName(e.target.value)}
              style={styles.input}
              autoFocus
            />

            <label style={styles.label}>4-siffrig PIN (valfri)</label>
            <input
              type="text"
              inputMode="numeric"
              maxLength={4}
              placeholder="1234"
              value={childPin}
              onChange={e => setChildPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
              style={{ ...styles.input, letterSpacing: 8, textAlign: 'center', fontFamily: 'monospace' }}
            />

            <label style={styles.label}>Välj profilbild</label>
            <div style={styles.avatarGrid}>
              {AVATARS.map(a => (
                <button
                  key={a}
                  className="ob-avatar-btn"
                  onClick={() => setChildAvatar(a)}
                  style={{
                    ...styles.avatarBtn,
                    background: childAvatar === a ? C.primaryLight : 'transparent',
                    border: `2px solid ${childAvatar === a ? C.primary : 'transparent'}`,
                  }}
                >
                  {a}
                </button>
              ))}
            </div>

            <label style={styles.label}>Välj färg</label>
            <div style={styles.colorRow}>
              {MEMBER_COLORS.map(c => (
                <button
                  key={c}
                  onClick={() => setChildColor(c)}
                  style={{
                    ...styles.colorDot,
                    background: c,
                    border: childColor === c ? `3px solid ${C.text}` : '3px solid transparent',
                  }}
                />
              ))}
            </div>

            <button
              onClick={handleAddChild}
              disabled={saving || !childName.trim()}
              style={{ ...styles.btn, opacity: saving || !childName.trim() ? 0.5 : 1 }}
            >
              {saving ? 'Skapar...' : `Lägg till ${childName || 'barnet'} →`}
            </button>
          </>
        )}

        {/* ═════ STEG 2 ════════════════════════════════════════════════════ */}
        {step === 2 && (
          <>
            <h2 style={styles.stepTitle}>🧹 Steg 2 av 3</h2>
            <h3 style={styles.stepHeading}>Sätt första sysslan</h3>
            <p style={styles.stepDesc}>
              Välj sysslor för {childName}. Du kan alltid ändra och lägga till fler senare.
            </p>

            <div className="ob-chore-grid" style={styles.choreGrid}>
              {SUGGESTED_CHORES.map(ch => {
                const selected = selectedChores.includes(ch.title);
                return (
                  <button
                    key={ch.title}
                    onClick={() => toggleChore(ch.title)}
                    style={{
                      ...styles.choreCard,
                      background:  selected ? C.primaryLight : C.bgCard,
                      border:      `2px solid ${selected ? C.primary : C.borderLight}`,
                      boxShadow:   selected ? `0 0 0 1px ${C.primary}` : 'none',
                    }}
                  >
                    <span style={{ fontSize: 32, marginBottom: 6 }}>{ch.icon}</span>
                    <span style={{ ...styles.choreTitle, color: selected ? C.primaryDark : C.text }}>
                      {ch.title}
                    </span>
                  </button>
                );
              })}
            </div>

            <button
              onClick={handleCreateChores}
              disabled={saving}
              style={{ ...styles.btn, opacity: saving ? 0.5 : 1 }}
            >
              {saving ? 'Skapar...' : selectedChores.length === 0 ? 'Hoppa över →' : `Lägg till ${selectedChores.length} syssla${selectedChores.length > 1 ? 'r' : ''} →`}
            </button>
            {selectedChores.length === 0 && (
              <p style={styles.skipNote}>Du kan lägga till sysslor senare i appen</p>
            )}
          </>
        )}

        {/* ═════ STEG 3 ════════════════════════════════════════════════════ */}
        {step === 3 && (
          <>
            <h2 style={styles.stepTitle}>🪙 Steg 3 av 3</h2>
            <h3 style={styles.stepHeading}>Sätt veckopeng</h3>
            <p style={styles.stepDesc}>
              Hur mycket veckopeng ska {childName} få?
            </p>

            <div style={styles.amountDisplay}>
              <span style={styles.amountNumber}>{allowance} kr</span>
              <span style={styles.amountLabel}>per vecka</span>
            </div>

            <input
              type="range"
              min="0"
              max="200"
              step="5"
              value={allowance}
              onChange={e => setAllowance(Number(e.target.value))}
              style={styles.slider}
            />
            <div style={styles.sliderLabels}>
              <span>0 kr</span>
              <span>100 kr</span>
              <span>200 kr</span>
            </div>

            <label style={styles.label}>Utbetalningsdag</label>
            <select
              value={payday}
              onChange={e => setPayday(Number(e.target.value))}
              style={styles.select}
            >
              {WEEKDAY_LABELS.map((d, i) => (
                <option key={i} value={i}>{d}</option>
              ))}
            </select>

            {allowance > 0 && (
              <div style={styles.autoRow}>
                <div style={{ flex: 1 }}>
                  <span style={styles.autoLabel}>⚡ Automatisk utbetalning</span>
                  <span style={styles.autoDesc}>
                    {autoAllowance ? `Betalas automatiskt varje ${WEEKDAY_LABELS[payday].toLowerCase()}` : 'Kräver manuell utbetalning'}
                  </span>
                </div>
                <button
                  onClick={() => setAutoAllowance(v => !v)}
                  style={{
                    width: 48, height: 26, borderRadius: 13, border: 'none',
                    background: autoAllowance ? C.secondary : C.border,
                    cursor: 'pointer', position: 'relative', flexShrink: 0,
                    transition: 'background 0.2s', WebkitTapHighlightColor: 'transparent',
                  }}
                >
                  <div style={{
                    width: 22, height: 22, borderRadius: 11, background: '#fff',
                    position: 'absolute', top: 2,
                    transform: autoAllowance ? 'translateX(22px)' : 'translateX(2px)',
                    transition: 'transform 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                  }} />
                </button>
              </div>
            )}

            <button
              onClick={handleSetAllowance}
              disabled={saving}
              style={{ ...styles.btn, opacity: saving ? 0.5 : 1, marginTop: 20 }}
            >
              {saving ? 'Sparar...' : allowance === 0 ? 'Hoppa över →' : `Sätt ${allowance} kr/vecka 🎉`}
            </button>
          </>
        )}
      </div>
    </div>
  );
}

const styles = {
  page: {
    minHeight: '100vh', background: C.bg, fontFamily: F.heading,
    display: 'flex', flexDirection: 'column', alignItems: 'center',
    padding: '24px 16px', boxSizing: 'border-box',
  },
  header: { textAlign: 'center', marginBottom: 24, maxWidth: 400 },
  headerEmoji: { fontSize: 48, display: 'block', marginBottom: 8 },
  headerTitle: { fontFamily: F.heading, fontSize: F.sizes.xl, fontWeight: F.weights.extra,
    color: C.text, margin: '0 0 6px' },
  headerSub: { fontSize: F.sizes.sm, color: C.textMuted, fontFamily: F.heading, margin: 0 },

  card: {
    width: '100%', maxWidth: 420, background: C.bgCard, borderRadius: 24,
    padding: '28px 24px', boxShadow: '0 4px 24px rgba(0,0,0,0.09)',
    border: `1.5px solid ${C.borderLight}`,
  },
  stepTitle: { fontSize: F.sizes.sm, fontWeight: F.weights.bold, color: C.textMuted,
    margin: '0 0 4px', textTransform: 'uppercase', letterSpacing: 0.5 },
  stepHeading: { fontSize: F.sizes.xl, fontWeight: F.weights.extra, color: C.text,
    margin: '0 0 6px', fontFamily: F.heading },
  stepDesc: { fontSize: F.sizes.sm, color: C.textMuted, margin: '0 0 16px', lineHeight: 1.5 },

  label: { display: 'block', fontSize: F.sizes.xs, fontWeight: F.weights.bold,
    color: C.textMuted, marginBottom: 6, marginTop: 14, textTransform: 'uppercase', letterSpacing: 0.3 },
  input: { width: '100%', padding: '12px 14px', borderRadius: 12,
    border: `2px solid ${C.border}`, fontSize: F.sizes.md, fontFamily: F.body,
    outline: 'none', boxSizing: 'border-box', minHeight: 48, background: C.bg },
  select: { width: '100%', padding: '12px 14px', borderRadius: 12,
    border: `2px solid ${C.border}`, fontSize: F.sizes.md, fontFamily: F.body,
    background: C.bg, boxSizing: 'border-box', minHeight: 48, outline: 'none' },

  avatarGrid: { display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 4 },
  avatarBtn: { width: 44, height: 44, borderRadius: 12, fontSize: 22, cursor: 'pointer',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    WebkitTapHighlightColor: 'transparent' },

  colorRow: { display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 4 },
  colorDot: { width: 32, height: 32, borderRadius: 16, cursor: 'pointer', padding: 0,
    WebkitTapHighlightColor: 'transparent' },

  choreGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 16 },
  choreCard: { padding: '14px 8px', borderRadius: 16, cursor: 'pointer', textAlign: 'center',
    display: 'flex', flexDirection: 'column', alignItems: 'center', minHeight: 90,
    transition: 'transform 0.1s', WebkitTapHighlightColor: 'transparent' },
  choreTitle: { fontSize: F.sizes.xs, fontWeight: F.weights.bold, fontFamily: F.heading },

  amountDisplay: { textAlign: 'center', padding: '16px 0 8px' },
  amountNumber: { display: 'block', fontSize: 48, fontWeight: F.weights.extra,
    fontFamily: F.heading, color: C.primary, lineHeight: 1 },
  amountLabel: { display: 'block', fontSize: F.sizes.sm, color: C.textMuted, marginTop: 4 },
  slider: { width: '100%', accentColor: C.primary, height: 6, margin: '8px 0 4px',
    appearance: 'none', background: C.borderLight, borderRadius: 4, outline: 'none' },
  sliderLabels: { display: 'flex', justifyContent: 'space-between', fontSize: F.sizes.xs,
    color: C.textMuted, marginBottom: 16 },

  autoRow: { display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px',
    background: C.bg, borderRadius: 12, border: `1px solid ${C.borderLight}`, marginTop: 12 },
  autoLabel: { display: 'block', fontSize: F.sizes.sm, fontWeight: F.weights.semi, color: C.text },
  autoDesc: { display: 'block', fontSize: F.sizes.xs, color: C.textMuted, marginTop: 2 },

  btn: { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
    width: '100%', padding: '14px 20px', borderRadius: 14, border: 'none',
    background: C.primary, color: '#fff', fontSize: F.sizes.md, fontWeight: F.weights.extra,
    fontFamily: F.heading, cursor: 'pointer', minHeight: 52,
    boxShadow: '0 4px 12px rgba(255,122,89,0.35)', WebkitTapHighlightColor: 'transparent',
    marginTop: 12 },
  skipNote: { textAlign: 'center', fontSize: F.sizes.xs, color: C.textMuted, marginTop: 8 },

  // Klart
  doneWrap: { textAlign: 'center', padding: '80px 20px' },
  doneEmoji: { fontSize: 72, display: 'block', marginBottom: 16 },
  doneTitle: { fontSize: F.sizes.xxl, fontWeight: F.weights.extra, fontFamily: F.heading,
    color: C.text, margin: '0 0 12px' },
  doneText: { fontSize: F.sizes.md, color: C.textMuted, lineHeight: 1.5, margin: '0 0 24px' },
  doneLoader: { width: 40, height: 4, background: C.borderLight, borderRadius: 2, margin: '0 auto',
    overflow: 'hidden', position: 'relative' },
};

const dotStyles = {
  row: { display: 'flex', justifyContent: 'center', gap: 8, marginBottom: 20 },
  dot: { width: 10, height: 10, borderRadius: 5, transition: 'transform 0.2s, background 0.2s' },
};
