// ============================================
// FamTastic — ChoreEditor (Duolingo-style)
// with library picker + save as template
// + scheduling: one-off date, recurring, recurring with end date
// ============================================

import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { X, Save, Trash2, BookOpen, Bookmark } from 'lucide-react';
import { C, F, S } from '../data';
import { ChoreLibrary } from './ChoreLibrary';

const ICONS = ['🧹','🍽️','🗑️','🐕','🛏️','📚','🧺','🚿','🌱','🚗','❄️','🔧','💻','🎒','👕','🧽','🐾','🍳','🛒','🌿'];
const WEEKDAYS = [
  { value: 1, label: 'Mån' },
  { value: 2, label: 'Tis' },
  { value: 3, label: 'Ons' },
  { value: 4, label: 'Tor' },
  { value: 5, label: 'Fre' },
  { value: 6, label: 'Lör' },
  { value: 7, label: 'Sön' },
];

const EMPTY = {
  title: '',
  description: '',
  icon: '🧹',
  chore_type: 'bonus',
  points: 0,
  difficulty: 'medium',
  is_recurring: false,
  recurrence_rule: { frequency: 'weekly', days: [] },
  assigned_to: null,
  pool: false,
  scheduled_date: '',
  schedule_mode: 'weekly',
  until_date: '',
};

export function ChoreEditor({ chore, members, familyId, memberId, onSave, onDelete, onClose }) {
  const [form, setForm] = useState(EMPTY);
  const [showLibrary, setShowLibrary] = useState(false);
  const [saveToast, setSaveToast] = useState(null);

  useEffect(() => {
    if (chore) {
      const rule = chore.recurrence_rule || { frequency: 'weekly', days: [] };
      let schedMode = 'weekly';
      if (!chore.is_recurring && chore.scheduled_date) {
        schedMode = 'once';
      } else if (chore.is_recurring && rule.until) {
        schedMode = 'weekly_until';
      } else if (chore.is_recurring) {
        schedMode = 'weekly';
      }
      setForm({
        title: chore.title || '',
        description: chore.description || '',
        icon: chore.icon || '🧹',
        chore_type: chore.chore_type || 'bonus',
        points: chore.points || 0,
        difficulty: chore.difficulty || 'medium',
        is_recurring: chore.is_recurring || false,
        recurrence_rule: rule,
        assigned_to: chore.assigned_to || null,
        pool: chore.pool || false,
        scheduled_date: chore.scheduled_date || '',
        schedule_mode: schedMode,
        until_date: rule.until || '',
      });
    } else {
      setForm(EMPTY);
    }
  }, [chore]);

  function set(field, value) {
    setForm(prev => ({ ...prev, [field]: value }));
  }

  function setScheduleMode(mode) {
    setForm(prev => ({
      ...prev,
      schedule_mode: mode,
      is_recurring: mode !== 'once',
      scheduled_date: mode === 'once' ? prev.scheduled_date : '',
      until_date: mode === 'weekly_until' ? prev.until_date : '',
    }));
  }

  function toggleDay(day) {
    const rule = { ...form.recurrence_rule };
    const days = Array.isArray(rule.days) ? [...rule.days] : [];
    if (days.includes(day)) {
      rule.days = days.filter(d => d !== day);
    } else {
      rule.days = [...days, day].sort((a, b) => a - b);
    }
    set('recurrence_rule', rule);
  }

  function handleLibrarySelect(template) {
    setForm(prev => ({
      ...prev,
      title: template.title,
      description: template.description || prev.description,
      icon: template.icon || prev.icon,
      chore_type: template.chore_type || prev.chore_type,
      points: template.points || 0,
      difficulty: template.difficulty || prev.difficulty,
    }));
    setShowLibrary(false);
  }

  async function handleSaveAsTemplate() {
    if (!form.title.trim()) return;
    const { error } = await supabase.from('chore_templates').insert({
      family_id: familyId,
      title: form.title.trim(),
      description: form.description.trim() || null,
      icon: form.icon,
      chore_type: form.chore_type,
      points: form.chore_type === 'base' ? 0 : Number(form.points) || 0,
      difficulty: form.difficulty,
      category: 'övrigt',
      is_global: false,
    });
    if (error) {
      setSaveToast('Kunde inte spara mall');
    } else {
      setSaveToast('Sparad i biblioteket! 📚');
    }
    setTimeout(() => setSaveToast(null), 2500);
  }

  function handleSubmit() {
    if (!form.title.trim()) return;

    let recRule = null;
    if (form.schedule_mode === 'weekly' || form.schedule_mode === 'weekly_until') {
      recRule = { ...form.recurrence_rule, frequency: 'weekly' };
      if (form.schedule_mode === 'weekly_until' && form.until_date) {
        recRule.until = form.until_date;
      } else {
        delete recRule.until;
      }
    }

    const data = {
      family_id: familyId,
      title: form.title.trim(),
      description: form.description.trim() || null,
      icon: form.icon,
      chore_type: form.chore_type,
      points: form.chore_type === 'base' ? 0 : Number(form.points) || 0,
      difficulty: form.difficulty,
      is_recurring: form.schedule_mode !== 'once',
      recurrence_rule: recRule,
      scheduled_date: form.schedule_mode === 'once' ? (form.scheduled_date || null) : null,
      assigned_to: form.pool ? null : (form.assigned_to || null),
      pool: form.pool || false,
      created_by: memberId,
    };
    onSave(data);
  }

  const children = members.filter(m => m.role === 'child');
  const minDate = new Date().toISOString().split('T')[0];

  return (
    <>
      <div style={styles.overlay}>
        <div style={styles.modal}>
          {saveToast && (
            <div style={styles.toast}>{saveToast}</div>
          )}

          {/* Header */}
          <div style={styles.header}>
            <h2 style={styles.headerTitle}>
              {chore ? 'Redigera syssla' : 'Ny syssla'}
            </h2>
            <button onClick={onClose} style={styles.closeBtn}>
              <X size={20} color={C.textMuted} />
            </button>
          </div>

          <div style={styles.body}>
            {/* Library button */}
            {!chore && (
              <button onClick={() => setShowLibrary(true)} style={styles.libraryBtn}>
                <BookOpen size={20} color={C.primary} />
                <div style={styles.libraryBtnText}>
                  <span style={styles.libraryBtnTitle}>Välj från biblioteket</span>
                  <span style={styles.libraryBtnSub}>Färdiga sysslor att använda direkt</span>
                </div>
              </button>
            )}

            {!chore && (
              <div style={styles.divider}>
                <span style={styles.dividerLine} />
                <span style={styles.dividerText}>eller skapa egen</span>
                <span style={styles.dividerLine} />
              </div>
            )}

            {/* Icon picker */}
            <label style={styles.label}>Ikon</label>
            <div style={styles.iconRow}>
              {ICONS.map(ic => (
                <button
                  key={ic}
                  onClick={() => set('icon', ic)}
                  style={{
                    ...styles.iconBtn,
                    background: form.icon === ic ? C.primaryLight : 'transparent',
                    border: form.icon === ic ? `2px solid ${C.primary}` : '2px solid transparent',
                  }}
                >
                  {ic}
                </button>
              ))}
            </div>

            {/* Title */}
            <label style={styles.label}>Namn</label>
            <input
              type="text"
              placeholder="T.ex. Tömma diskmaskinen"
              value={form.title}
              onChange={e => set('title', e.target.value)}
              style={S.input}
              autoFocus
            />

            {/* Description */}
            <label style={styles.label14}>Beskrivning (valfritt)</label>
            <input
              type="text"
              placeholder="Extra info..."
              value={form.description}
              onChange={e => set('description', e.target.value)}
              style={S.input}
            />

            {/* Type */}
            <label style={styles.label14}>Typ</label>
            <div style={styles.toggleRow}>
              <button
                onClick={() => set('chore_type', 'base')}
                style={{
                  ...styles.toggleBtn,
                  background: form.chore_type === 'base' ? C.secondary : C.bgCard,
                  color: form.chore_type === 'base' ? '#fff' : C.text,
                  borderColor: form.chore_type === 'base' ? C.secondary : C.border,
                }}
              >
                Grundsyssla
              </button>
              <button
                onClick={() => set('chore_type', 'bonus')}
                style={{
                  ...styles.toggleBtn,
                  background: form.chore_type === 'bonus' ? C.primary : C.bgCard,
                  color: form.chore_type === 'bonus' ? '#fff' : C.text,
                  borderColor: form.chore_type === 'bonus' ? C.primary : C.border,
                }}
              >
                Bonus
              </button>
            </div>

            {form.chore_type === 'bonus' && (
              <>
                <label style={styles.label14}>Poäng (kr)</label>
                <input
                  type="number"
                  min="0"
                  value={form.points}
                  onChange={e => set('points', e.target.value)}
                  style={{ ...S.input, width: 120 }}
                />
              </>
            )}

            {/* Difficulty */}
            <label style={styles.label14}>Svårighetsgrad</label>
            <div style={styles.toggleRow}>
              {[
                { key: 'easy', label: '🟢 Lätt' },
                { key: 'medium', label: '🟡 Medel' },
                { key: 'hard', label: '🔴 Svårt' },
              ].map(d => (
                <button
                  key={d.key}
                  onClick={() => set('difficulty', d.key)}
                  style={{
                    ...styles.toggleBtn,
                    background: form.difficulty === d.key ? C.text : C.bgCard,
                    color: form.difficulty === d.key ? '#fff' : C.text,
                    borderColor: form.difficulty === d.key ? C.text : C.border,
                  }}
                >
                  {d.label}
                </button>
              ))}
            </div>

            {/* Pool toggle */}
            <label style={styles.label14}>Öppen pool</label>
            <button
              onClick={() => set('pool', !form.pool)}
              style={{
                ...styles.poolToggle,
                background: form.pool ? C.accentLight : C.bgCard,
                borderColor: form.pool ? C.accent : C.border,
              }}
            >
              <span style={{ fontSize: 20 }}>{form.pool ? '🤲' : '👤'}</span>
              <div style={styles.poolToggleText}>
                <span style={{
                  ...styles.poolToggleTitle,
                  color: form.pool ? '#92400E' : C.text,
                }}>
                  {form.pool ? 'Öppen — barnen kan plocka' : 'Tilldelad direkt'}
                </span>
                <span style={styles.poolToggleSub}>
                  {form.pool
                    ? 'Sysslan visas i "Plocka"-fliken för alla barn'
                    : 'Sysslan tilldelas direkt till valt barn'}
                </span>
              </div>
            </button>

            {/* Assigned to */}
            {!form.pool && (
              <>
                <label style={styles.label14}>Tilldelad</label>
                <div style={styles.assignRow}>
                  <button
                    onClick={() => set('assigned_to', null)}
                    style={{
                      ...styles.assignBtn,
                      background: !form.assigned_to ? C.primaryLight : C.bgCard,
                      borderColor: !form.assigned_to ? C.primary : C.border,
                    }}
                  >
                    Alla
                  </button>
                  {children.map(m => (
                    <button
                      key={m.id}
                      onClick={() => set('assigned_to', m.id)}
                      style={{
                        ...styles.assignBtn,
                        background: form.assigned_to === m.id ? C.primaryLight : C.bgCard,
                        borderColor: form.assigned_to === m.id ? C.primary : C.border,
                      }}
                    >
                      {m.avatar} {m.name}
                    </button>
                  ))}
                </div>
              </>
            )}

            {/* ===== SCHEDULING ===== */}
            <label style={styles.label14}>Schema</label>
            <div style={styles.scheduleRow}>
              <button
                onClick={() => setScheduleMode('once')}
                style={{
                  ...styles.scheduleBtn,
                  background: form.schedule_mode === 'once' ? C.secondary : C.bgCard,
                  color: form.schedule_mode === 'once' ? '#fff' : C.text,
                  borderColor: form.schedule_mode === 'once' ? C.secondary : C.border,
                }}
              >
                📅 Datum
              </button>
              <button
                onClick={() => setScheduleMode('weekly')}
                style={{
                  ...styles.scheduleBtn,
                  background: form.schedule_mode === 'weekly' ? C.secondary : C.bgCard,
                  color: form.schedule_mode === 'weekly' ? '#fff' : C.text,
                  borderColor: form.schedule_mode === 'weekly' ? C.secondary : C.border,
                }}
              >
                🔄 Varje vecka
              </button>
              <button
                onClick={() => setScheduleMode('weekly_until')}
                style={{
                  ...styles.scheduleBtn,
                  background: form.schedule_mode === 'weekly_until' ? C.secondary : C.bgCard,
                  color: form.schedule_mode === 'weekly_until' ? '#fff' : C.text,
                  borderColor: form.schedule_mode === 'weekly_until' ? C.secondary : C.border,
                }}
              >
                🔄📅 Till datum
              </button>
            </div>

            {/* ONE-OFF: date picker */}
            {form.schedule_mode === 'once' && (
              <div style={styles.datePickerWrap}>
                <label style={styles.dateLabel}>Vilket datum?</label>
                <input
                  type="date"
                  value={form.scheduled_date}
                  onChange={e => set('scheduled_date', e.target.value)}
                  style={styles.dateInput}
                />
              </div>
            )}

            {/* RECURRING: day picker + optional until */}
            {(form.schedule_mode === 'weekly' || form.schedule_mode === 'weekly_until') && (
              <>
                <div style={styles.dayRow}>
                  {WEEKDAYS.map(d => {
                    const days = Array.isArray(form.recurrence_rule?.days) ? form.recurrence_rule.days : [];
                    const active = days.includes(d.value);
                    return (
                      <button
                        key={d.value}
                        onClick={() => toggleDay(d.value)}
                        style={{
                          ...styles.dayBtn,
                          background: active ? C.primary : C.bgCard,
                          color: active ? '#fff' : C.text,
                          borderColor: active ? C.primary : C.border,
                        }}
                      >
                        {d.label}
                      </button>
                    );
                  })}
                </div>

                {form.schedule_mode === 'weekly_until' && (
                  <div style={styles.datePickerWrap}>
                    <label style={styles.dateLabel}>Fram till och med</label>
                    <input
                      type="date"
                      value={form.until_date}
                      min={minDate}
                      onChange={e => set('until_date', e.target.value)}
                      style={styles.dateInput}
                    />
                  </div>
                )}
              </>
            )}

            {/* Save as template */}
            {form.title.trim() && (
              <button onClick={handleSaveAsTemplate} style={styles.saveTemplateBtn}>
                <Bookmark size={14} color={C.purple} />
                <span style={styles.saveTemplateText}>Spara som mall i biblioteket</span>
              </button>
            )}
          </div>

          {/* Footer */}
          <div style={styles.footer}>
            {chore && onDelete && (
              <button onClick={() => onDelete(chore.id)} style={styles.deleteBtn}>
                <Trash2 size={16} /> Ta bort
              </button>
            )}
            <div style={{ flex: 1 }} />
            <button
              onClick={handleSubmit}
              disabled={!form.title.trim()}
              style={{
                ...styles.submitBtn,
                opacity: form.title.trim() ? 1 : 0.5,
              }}
            >
              <Save size={16} /> {chore ? 'Spara' : 'Skapa'}
            </button>
          </div>
        </div>
      </div>

      {showLibrary && (
        <ChoreLibrary
          familyId={familyId}
          onSelect={handleLibrarySelect}
          onClose={() => setShowLibrary(false)}
        />
      )}
    </>
  );
}

const styles = {
  overlay: {
    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)',
    display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
    zIndex: 200, padding: 0,
  },
  modal: {
    width: '100%', maxWidth: 500, maxHeight: '90vh', background: C.bgCard,
    borderRadius: '20px 20px 0 0', display: 'flex', flexDirection: 'column',
    position: 'relative',
  },
  toast: {
    position: 'absolute', top: -50, left: '50%', transform: 'translateX(-50%)',
    background: C.text, color: '#fff', padding: '10px 20px', borderRadius: 99,
    fontSize: F.sizes.sm, fontWeight: F.weights.bold, fontFamily: F.heading,
    zIndex: 310, whiteSpace: 'nowrap', boxShadow: '0 4px 16px rgba(0,0,0,0.2)',
  },
  header: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    padding: '16px 20px', borderBottom: `1px solid ${C.borderLight}`,
  },
  headerTitle: {
    fontFamily: F.heading, fontSize: F.sizes.lg, fontWeight: F.weights.bold,
    color: C.text, margin: 0,
  },
  closeBtn: {
    background: 'none', border: 'none', cursor: 'pointer', padding: 4,
    minHeight: 44, minWidth: 44, display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  body: { padding: '16px 20px', overflowY: 'auto', flex: 1 },
  libraryBtn: {
    display: 'flex', alignItems: 'center', gap: 12, width: '100%',
    padding: '14px 16px', borderRadius: 14, border: `2px dashed ${C.primary}`,
    background: C.primaryLight, cursor: 'pointer', textAlign: 'left', marginBottom: 12,
  },
  libraryBtnText: { flex: 1 },
  libraryBtnTitle: {
    display: 'block', fontSize: F.sizes.md, fontWeight: F.weights.bold,
    fontFamily: F.heading, color: C.primaryDark,
  },
  libraryBtnSub: {
    display: 'block', fontSize: F.sizes.xs, color: C.textMuted,
    fontFamily: F.heading, marginTop: 2,
  },
  divider: { display: 'flex', alignItems: 'center', gap: 10, margin: '4px 0 16px' },
  dividerLine: { flex: 1, height: 1, background: C.border },
  dividerText: {
    fontSize: F.sizes.xs, color: C.textMuted, fontFamily: F.heading, whiteSpace: 'nowrap',
  },
  label: {
    display: 'block', fontSize: F.sizes.sm, fontWeight: F.weights.bold,
    fontFamily: F.heading, color: C.text, marginBottom: 6,
  },
  label14: {
    display: 'block', fontSize: F.sizes.sm, fontWeight: F.weights.bold,
    fontFamily: F.heading, color: C.text, marginBottom: 6, marginTop: 14,
  },
  iconRow: { display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 14 },
  iconBtn: {
    width: 42, height: 42, borderRadius: 12, fontSize: 20, cursor: 'pointer',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  toggleRow: { display: 'flex', gap: 6, marginBottom: 4 },
  toggleBtn: {
    padding: '10px 16px', borderRadius: 12, border: '1.5px solid',
    fontSize: F.sizes.sm, fontWeight: F.weights.bold, fontFamily: F.heading,
    cursor: 'pointer', minHeight: 44,
  },
  assignRow: { display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 4 },
  assignBtn: {
    padding: '10px 14px', borderRadius: 12, border: '2px solid',
    fontSize: F.sizes.sm, fontWeight: F.weights.bold, fontFamily: F.heading,
    cursor: 'pointer', minHeight: 44,
  },
  scheduleRow: { display: 'flex', gap: 6, marginBottom: 8, flexWrap: 'wrap' },
  scheduleBtn: {
    padding: '10px 14px', borderRadius: 12, border: '1.5px solid',
    fontSize: F.sizes.sm, fontWeight: F.weights.bold, fontFamily: F.heading,
    cursor: 'pointer', minHeight: 44, whiteSpace: 'nowrap',
  },
  datePickerWrap: { marginTop: 8, marginBottom: 4 },
  dateLabel: {
    display: 'block', fontSize: F.sizes.xs, fontWeight: F.weights.semi,
    fontFamily: F.heading, color: C.textMuted, marginBottom: 4,
  },
  dateInput: {
    width: '100%', padding: '12px 14px', borderRadius: 12,
    border: `1.5px solid ${C.border}`, fontSize: F.sizes.md, fontFamily: F.heading,
    color: C.text, background: C.bgCard, boxSizing: 'border-box',
  },
  dayRow: { display: 'flex', gap: 4, marginTop: 4, marginBottom: 4 },
  dayBtn: {
    flex: 1, padding: '10px 2px', borderRadius: 10, border: '1.5px solid',
    fontSize: F.sizes.xs, fontWeight: F.weights.bold, fontFamily: F.heading,
    cursor: 'pointer', textAlign: 'center', minHeight: 40,
  },
  saveTemplateBtn: {
    display: 'flex', alignItems: 'center', gap: 6, margin: '16px 0 4px',
    padding: '10px 14px', borderRadius: 12, border: `1.5px solid ${C.purpleLight}`,
    background: C.purpleLight, cursor: 'pointer', width: '100%',
  },
  saveTemplateText: {
    fontSize: F.sizes.sm, fontWeight: F.weights.semi, fontFamily: F.heading, color: C.purple,
  },
  footer: {
    display: 'flex', alignItems: 'center', gap: 8, padding: '12px 20px',
    paddingBottom: 'max(12px, env(safe-area-inset-bottom))',
    borderTop: `1px solid ${C.borderLight}`,
  },
  deleteBtn: {
    display: 'inline-flex', alignItems: 'center', gap: 4, padding: '10px 14px',
    borderRadius: 12, border: 'none', background: C.errorLight, color: C.error,
    fontSize: F.sizes.sm, fontWeight: F.weights.bold, fontFamily: F.heading,
    cursor: 'pointer', minHeight: 44,
  },
  submitBtn: {
    display: 'inline-flex', alignItems: 'center', gap: 6, padding: '12px 24px',
    borderRadius: 12, border: 'none', background: C.primary, color: '#fff',
    fontSize: F.sizes.md, fontWeight: F.weights.bold, fontFamily: F.heading,
    cursor: 'pointer', minHeight: 48,
  },
  poolToggle: {
    display: 'flex', alignItems: 'center', gap: 12, width: '100%',
    padding: '12px 14px', borderRadius: 14, border: '2px solid',
    cursor: 'pointer', textAlign: 'left', marginBottom: 4,
  },
  poolToggleText: { flex: 1 },
  poolToggleTitle: {
    display: 'block', fontSize: F.sizes.sm, fontWeight: F.weights.bold, fontFamily: F.heading,
  },
  poolToggleSub: {
    display: 'block', fontSize: F.sizes.xs, color: C.textMuted,
    fontFamily: F.heading, marginTop: 2,
  },
};
