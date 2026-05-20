// ============================================
// FamTastic — CreateFamilyGoal (parent creates epic goal)
// ============================================

import React, { useState } from 'react';
import { supabase } from '../supabaseClient';
import { C, F, S } from '../data';
import { X, Target, Save } from 'lucide-react';

const GOAL_ICONS = ['✈️','🏖️','🎢','🏕️','🎮','🚗','🏠','🎄','🎁','⚽','🎸','🐕','💻','🎯','🌍','🚀'];

export function CreateFamilyGoal({ familyId, onCreated, onClose }) {
  const [title, setTitle] = useState('');
  const [target, setTarget] = useState('');
  const [icon, setIcon] = useState('✈️');
  const [saving, setSaving] = useState(false);

  async function handleCreate() {
    if (!title.trim() || !target) return;
    setSaving(true);

    const { error } = await supabase.from('savings_goals').insert({
      family_id: familyId,
      member_id: null,
      title: title.trim(),
      target_amount: Math.round(Number(target) * 100),
      icon,
      is_family_goal: true,
    });

    setSaving(false);
    if (!error) {
      onCreated();
      onClose();
    }
  }

  return (
    <div style={styles.overlay}>
      <div style={styles.modal}>
        <div style={styles.header}>
          <h2 style={styles.headerTitle}>Nytt familjemål</h2>
          <button onClick={onClose} style={styles.closeBtn}>
            <X size={20} color={C.textMuted} />
          </button>
        </div>

        <div style={styles.body}>
          <div style={styles.heroIcon}>
            <span style={{ fontSize: 48 }}>{icon}</span>
          </div>
          <p style={styles.desc}>
            Skapa ett episkt mål som hela familjen sparar till tillsammans!
          </p>

          <label style={styles.label}>Ikon</label>
          <div style={styles.iconRow}>
            {GOAL_ICONS.map(ic => (
              <button
                key={ic}
                onClick={() => setIcon(ic)}
                style={{
                  ...styles.iconBtn,
                  background: icon === ic ? C.primaryLight : 'transparent',
                  border: icon === ic ? `2px solid ${C.primary}` : '2px solid transparent',
                }}
              >
                {ic}
              </button>
            ))}
          </div>

          <label style={{ ...styles.label, marginTop: 14 }}>Vad sparar familjen till?</label>
          <input
            type="text"
            placeholder="T.ex. Resa till Spanien"
            value={title}
            onChange={e => setTitle(e.target.value)}
            style={S.input}
            autoFocus
          />

          <label style={{ ...styles.label, marginTop: 14 }}>Målbelopp (kr)</label>
          <input
            type="number"
            placeholder="T.ex. 15000"
            value={target}
            onChange={e => setTarget(e.target.value)}
            style={S.input}
            min="1"
          />
        </div>

        <div style={styles.footer}>
          <button
            onClick={handleCreate}
            disabled={saving || !title.trim() || !target}
            style={{
              ...S.button, ...S.buttonPrimary, width: '100%',
              opacity: saving || !title.trim() || !target ? 0.5 : 1,
            }}
          >
            {saving ? 'Skapar...' : (
              <>
                <Target size={16} /> Skapa familjemål
              </>
            )}
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
  heroIcon: {
    textAlign: 'center',
    padding: '8px 0 12px',
  },
  desc: {
    fontSize: F.sizes.sm,
    color: C.textMuted,
    textAlign: 'center',
    lineHeight: 1.5,
    margin: '0 0 18px',
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
    marginBottom: 4,
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
  footer: {
    padding: '12px 20px env(safe-area-inset-bottom, 12px)',
    borderTop: `1px solid ${C.borderLight}`,
  },
};
