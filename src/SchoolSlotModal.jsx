// ============================================
// FamTastic — SchoolSlotModal
// Extracted from SchoolSetup.jsx — lesson slot editor
// ============================================

import React from 'react';
import { C, F } from './data';
import { Check } from 'lucide-react';

const DAYS_LABEL = { 1: 'Mån', 2: 'Tis', 3: 'Ons', 4: 'Tor', 5: 'Fre' };

// 5-minute intervals 07:00–16:55
const TIMES = [];
for (let h = 7; h <= 16; h++) {
  for (let m = 0; m < 60; m += 5) {
    TIMES.push(`${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}`);
  }
}

export function SchoolSlotModal({ editingSlot, slotForm, setSlotForm, allSubjects, onSave, onCancel }) {
  if (!editingSlot) return null;

  const dayLabel = DAYS_LABEL[editingSlot.day] || '';
  const valid = slotForm.subject_id && slotForm.end_time > slotForm.start_time;

  return (
    <div style={styles.overlay}>
      <div style={styles.modal}>
        <h3 style={styles.modalTitle}>{dayLabel} — Lektion</h3>

        <label style={styles.fieldLabel}>Ämne</label>
        <div style={styles.subjectPicker}>
          {allSubjects.map(s => (
            <button key={s.id} onClick={() => setSlotForm(prev => ({ ...prev, subject_id: s.id }))} style={{
              ...styles.subjectOption,
              background: slotForm.subject_id === s.id ? (s.color || C.primary) + '20' : C.bgCard,
              borderColor: slotForm.subject_id === s.id ? (s.color || C.primary) : C.borderLight,
            }}>
              {s.icon} {s.short_name}
            </button>
          ))}
        </div>

        <div style={styles.timeRow}>
          <div style={{ flex: 1 }}>
            <label style={styles.fieldLabel}>Start</label>
            <select value={slotForm.start_time} onChange={e => {
              const newStart = e.target.value;
              setSlotForm(prev => {
                const [sh, sm] = newStart.split(':').map(Number);
                const endH = sh + 1;
                const autoEnd = endH <= 16 ? `${String(endH).padStart(2,'0')}:${String(sm).padStart(2,'0')}` : '16:55';
                const newEnd = prev.end_time > newStart ? prev.end_time : autoEnd;
                return { ...prev, start_time: newStart, end_time: newEnd };
              });
            }} style={styles.timeSelect}>
              {TIMES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div style={{ flex: 1 }}>
            <label style={styles.fieldLabel}>Slut</label>
            <select value={slotForm.end_time} onChange={e => setSlotForm(prev => ({ ...prev, end_time: e.target.value }))} style={styles.timeSelect}>
              {TIMES.filter(t => t > slotForm.start_time).map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
        </div>

        <div style={styles.modalFooter}>
          <button onClick={onCancel} style={styles.cancelBtn}>Avbryt</button>
          <button onClick={onSave} disabled={!valid}
            style={{ ...styles.saveBtn, opacity: valid ? 1 : 0.5 }}>
            <Check size={16} /> Spara
          </button>
        </div>
      </div>
    </div>
  );
}

export { TIMES };

const styles = {
  overlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 300, padding: 16 },
  modal: { width: '100%', maxWidth: 400, background: C.bgCard, borderRadius: 20, padding: 20, maxHeight: '80vh', overflowY: 'auto' },
  modalTitle: { fontFamily: F.heading, fontSize: F.sizes.lg, fontWeight: F.weights.bold, color: C.text, margin: '0 0 16px' },
  fieldLabel: { display: 'block', fontSize: F.sizes.xs, fontWeight: F.weights.bold, fontFamily: F.heading, color: C.textMuted, marginBottom: 6, marginTop: 12 },
  subjectPicker: { display: 'flex', flexWrap: 'wrap', gap: 6 },
  subjectOption: { padding: '8px 12px', borderRadius: 10, border: '1.5px solid', fontSize: F.sizes.sm, fontWeight: F.weights.bold, fontFamily: F.heading, cursor: 'pointer', minHeight: 40 },
  timeRow: { display: 'flex', gap: 12, marginTop: 4 },
  timeSelect: { width: '100%', padding: '10px 12px', borderRadius: 12, border: `1.5px solid ${C.border}`, fontSize: F.sizes.sm, fontFamily: F.heading, color: C.text, background: C.bgCard },
  modalFooter: { display: 'flex', gap: 8, marginTop: 20, justifyContent: 'flex-end' },
  cancelBtn: { padding: '10px 18px', borderRadius: 12, border: `1.5px solid ${C.border}`, background: C.bgCard, color: C.text, fontSize: F.sizes.sm, fontWeight: F.weights.bold, fontFamily: F.heading, cursor: 'pointer', minHeight: 44 },
  saveBtn: { display: 'inline-flex', alignItems: 'center', gap: 4, padding: '10px 18px', borderRadius: 12, border: 'none', background: C.primary, color: '#fff', fontSize: F.sizes.sm, fontWeight: F.weights.bold, fontFamily: F.heading, cursor: 'pointer', minHeight: 44 },
};
