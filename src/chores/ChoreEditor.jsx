// ============================================
// FamTastic — ChoreEditor (create/edit chore)
// ============================================

import React, { useState, useEffect } from 'react';
import { X, Save, Trash2 } from 'lucide-react';
import { C, F, S } from '../data';

const ICONS = ['🧹','🍽️','🗑️','🐕','🛏️','📚','🧺','🚿','🌱','🚗','❄️','🔧','💻','🎒','👕','🧽'];
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
};

export function ChoreEditor({ chore, members, familyId, memberId, onSave, onDelete, onClose }) {
  const [form, setForm] = useState(EMPTY);

  useEffect(() => {
    if (chore) {
      setForm({
        title: chore.title || '',
        description: chore.description || '',
        icon: chore.icon || '🧹',
        chore_type: chore.chore_type || 'bonus',
        points: chore.points || 0,
        difficulty: chore.difficulty || 'medium',
        is_recurring: chore.is_recurring || false,
        recurrence_rule: chore.recurrence_rule || { frequency: 'weekly', days: [] },
        assigned_to: chore.assigned_to || null,
      });
    } else {
      setForm(EMPTY);
    }
  }, [chore]);

  function set(field, value) {
    setForm(prev => ({ ...prev, [field]: value }));
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

  function handleSubmit() {
    if (!form.title.trim()) return;
    const data = {
      family_id: familyId,
      title: form.title.trim(),
      description: form.description.trim() || null,
      icon: form.icon,
      chore_type: form.chore_type,
      points: form.chore_type === 'base' ? 0 : Number(form.points) || 0,
      difficulty: form.difficulty,
      is_recurring: form.is_recurring,
      recurrence_rule: form.is_recurring ? form.recurrence_rule : null,
      assigned_to: form.assigned_to || null,
      created_by: memberId,
    };
    onSave(data);
  }

  const children = members.filter(m => m.role === 'child');

  return (
    <div style={styles.overlay}>
      <div style={styles.modal}>
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
          <label style={{ ...styles.label, marginTop: 14 }}>Beskrivning (valfritt)</label>
          <input
            type="text"
            placeholder="Extra info..."
            value={form.description}
            onChange={e => set('description', e.target.value)}
            style={S.input}
          />

          {/* Type: base or bonus */}
          <label style={{ ...styles.label, marginTop: 14 }}>Typ</label>
          <div style={styles.toggleRow}>
            <button
              onClick={() => set('chore_type', 'base')}
              style={{
                ...styles.toggleBtn,
                background: form.chore_type === 'base' ? C.secondary : C.bgCard,
                color: form.chore_type === 'base' ? '#fff' : C.text,
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
              }}
            >
              Bonus
            </button>
          </div>

          {/* Points (only for bonus) */}
          {form.chore_type === 'bonus' && (
            <>
              <label style={{ ...styles.label, marginTop: 14 }}>Poäng (kr)</label>
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
          <label style={{ ...styles.label, marginTop: 14 }}>Svårighetsgrad</label>
          <div style={styles.toggleRow}>
            {['easy', 'medium', 'hard'].map(d => (
              <button
                key={d}
                onClick={() => set('difficulty', d)}
                style={{
                  ...styles.toggleBtn,
                  background: form.difficulty === d ? C.text : C.bgCard,
                  color: form.difficulty === d ? '#fff' : C.text,
                }}
              >
                {d === 'easy' ? 'Lätt' : d === 'medium' ? 'Medel' : 'Svårt'}
              </button>
            ))}
          </div>

          {/* Assigned to */}
          <label style={{ ...styles.label, marginTop: 14 }}>Tilldelad</label>
          <div style={styles.assignRow}>
            <button
              onClick={() => set('assigned_to', null)}
              style={{
                ...styles.assignBtn,
                background: !form.assigned_to ? C.primaryLight : C.bgCard,
                border: !form.assigned_to ? `2px solid ${C.primary}` : `2px solid ${C.border}`,
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
                  border: form.assigned_to === m.id ? `2px solid ${C.primary}` : `2px solid ${C.border}`,
                }}
              >
                {m.avatar} {m.name}
              </button>
            ))}
          </div>

          {/* Recurring */}
          <label style={{ ...styles.label, marginTop: 14 }}>Återkommande</label>
          <div style={styles.toggleRow}>
            <button
              onClick={() => set('is_recurring', false)}
              style={{
                ...styles.toggleBtn,
                background: !form.is_recurring ? C.text : C.bgCard,
                color: !form.is_recurring ? '#fff' : C.text,
              }}
            >
              Engång
            </button>
            <button
              onClick={() => set('is_recurring', true)}
              style={{
                ...styles.toggleBtn,
                background: form.is_recurring ? C.text : C.bgCard,
                color: form.is_recurring ? '#fff' : C.text,
              }}
            >
              Varje vecka
            </button>
          </div>

          {/* Day picker */}
          {form.is_recurring && (
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
                      border: active ? `2px solid ${C.primary}` : `2px solid ${C.border}`,
                    }}
                  >
                    {d.label}
                  </button>
                );
              })}
            </div>
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
              ...S.button,
              ...S.buttonPrimary,
              opacity: form.title.trim() ? 1 : 0.5,
            }}
          >
            <Save size={16} /> {chore ? 'Spara' : 'Skapa'}
          </button>
        </div>
      </div>
    </div>
  );
}

const styles = {
  overlay: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(0,0,0,0.4)',
    display: 'flex',
    alignItems: 'flex-end',
    justifyContent: 'center',
    zIndex: 200,
    padding: 0,
  },
  modal: {
    width: '100%',
    maxWidth: 500,
    maxHeight: '90vh',
    background: C.bgCard,
    borderRadius: '20px 20px 0 0',
    display: 'flex',
    flexDirection: 'column',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '16px 20px',
    borderBottom: `1px solid ${C.borderLight}`,
  },
  headerTitle: {
    fontFamily: F.heading,
    fontSize: F.sizes.lg,
    fontWeight: F.weights.bold,
    color: C.text,
    margin: 0,
  },
  closeBtn: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    padding: 4,
  },
  body: {
    padding: '16px 20px',
    overflowY: 'auto',
    flex: 1,
  },
  label: {
    display: 'block',
    fontSize: F.sizes.sm,
    fontWeight: F.weights.semi,
    color: C.text,
    marginBottom: 6,
  },
  iconRow: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 14,
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 10,
    fontSize: 20,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  toggleRow: {
    display: 'flex',
    gap: 6,
    marginBottom: 4,
  },
  toggleBtn: {
    padding: '8px 16px',
    borderRadius: 10,
    border: `1px solid ${C.border}`,
    fontSize: F.sizes.sm,
    fontWeight: F.weights.semi,
    fontFamily: F.heading,
    cursor: 'pointer',
  },
  assignRow: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 4,
  },
  assignBtn: {
    padding: '8px 14px',
    borderRadius: 10,
    fontSize: F.sizes.sm,
    fontWeight: F.weights.semi,
    fontFamily: F.heading,
    cursor: 'pointer',
  },
  dayRow: {
    display: 'flex',
    gap: 4,
    marginTop: 10,
    marginBottom: 4,
  },
  dayBtn: {
    flex: 1,
    padding: '8px 2px',
    borderRadius: 8,
    fontSize: F.sizes.xs,
    fontWeight: F.weights.bold,
    fontFamily: F.heading,
    cursor: 'pointer',
    textAlign: 'center',
  },
  footer: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '12px 20px env(safe-area-inset-bottom, 12px)',
    borderTop: `1px solid ${C.borderLight}`,
  },
  deleteBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 4,
    padding: '8px 14px',
    borderRadius: 10,
    border: 'none',
    background: C.errorLight,
    color: C.error,
    fontSize: F.sizes.sm,
    fontWeight: F.weights.semi,
    cursor: 'pointer',
  },
};
