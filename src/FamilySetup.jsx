// ============================================
// FamTastic — Family Setup (onboarding)
// ============================================

import React, { useState } from 'react';
import { supabase } from './supabaseClient';
import { C, F, S } from './data';
import { Users, Plus, Trash2, ArrowRight, Home, Loader } from 'lucide-react';

const AVATARS = ['😀','😎','🦊','🐻','🦄','🌟','🎨','⚽','🎵','🌈','🍕','🐱','🐶','🦋','🚀','💪'];
const MEMBER_COLORS = C.memberColors;

export function FamilySetup({ userId, onComplete }) {
  const [step, setStep] = useState(1);
  const [familyName, setFamilyName] = useState('');
  const [adminName, setAdminName] = useState('');
  const [members, setMembers] = useState([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // --- Step 2: member helpers ---
  function addMember(role) {
    setMembers(prev => [
      ...prev,
      {
        tempId: Date.now(),
        name: '',
        role,
        avatar: role === 'child' ? '😀' : '😎',
        color: MEMBER_COLORS[(prev.length + 1) % MEMBER_COLORS.length],
        pin: '',
      },
    ]);
  }

  function updateMember(tempId, field, value) {
    setMembers(prev =>
      prev.map(m => (m.tempId === tempId ? { ...m, [field]: value } : m))
    );
  }

  function removeMember(tempId) {
    setMembers(prev => prev.filter(m => m.tempId !== tempId));
  }

  // --- Save everything ---
  async function handleSave() {
    setSaving(true);
    setError('');

    try {
      // 1. Create family + admin via RPC
      const { data: result, error: rpcErr } = await supabase
        .rpc('create_family_with_admin', {
          family_name: familyName.trim(),
          admin_name: adminName.trim() || 'Admin',
          admin_avatar: '👑',
          admin_color: MEMBER_COLORS[0],
        });

      if (rpcErr) throw rpcErr;

      const familyId = result.family_id;

      // 2. Create other members
      if (members.length > 0) {
        const rows = members.map(m => ({
          family_id: familyId,
          name: m.name.trim() || (m.role === 'child' ? 'Barn' : 'Förälder'),
          role: m.role,
          avatar: m.avatar,
          color: m.color,
          pin_hash: m.role === 'child' && m.pin ? m.pin : null,
        }));

        const { error: memErr } = await supabase
          .from('family_members')
          .insert(rows);

        if (memErr) throw memErr;
      }

      onComplete(familyId);
    } catch (err) {
      setError(err.message || 'Något gick fel');
      setSaving(false);
    }
  }

  // --- RENDER ---

  // Step 1: Family name + your name
  if (step === 1) {
    return (
      <div style={styles.page}>
        <div style={styles.container}>
          <div style={styles.iconWrap}>
            <Home size={32} color="#fff" />
          </div>
          <h1 style={styles.title}>Skapa din familj</h1>
          <p style={styles.desc}>Vi behöver bara ett par saker för att komma igång.</p>

          <label style={styles.label}>Familjens namn</label>
          <input
            type="text"
            placeholder="T.ex. Familjen Andersson"
            value={familyName}
            onChange={e => setFamilyName(e.target.value)}
            style={S.input}
            autoFocus
          />

          <label style={{ ...styles.label, marginTop: 16 }}>Ditt namn</label>
          <input
            type="text"
            placeholder="T.ex. Joacim"
            value={adminName}
            onChange={e => setAdminName(e.target.value)}
            style={S.input}
          />

          <button
            disabled={!familyName.trim()}
            onClick={() => setStep(2)}
            style={{
              ...S.button,
              ...S.buttonPrimary,
              width: '100%',
              marginTop: 20,
              opacity: familyName.trim() ? 1 : 0.5,
            }}
          >
            Nästa
            <ArrowRight size={18} />
          </button>
        </div>
      </div>
    );
  }

  // Step 2: Add members
  return (
    <div style={styles.page}>
      <div style={styles.container}>
        <div style={styles.iconWrap}>
          <Users size={32} color="#fff" />
        </div>
        <h1 style={styles.title}>Lägg till familjemedlemmar</h1>
        <p style={styles.desc}>
          Du ({adminName || 'Admin'}) är redan med. Lägg till resten av familjen.
        </p>

        {/* Member list */}
        {members.map(m => (
          <div key={m.tempId} style={styles.memberCard}>
            <div style={styles.memberHeader}>
              <select
                value={m.avatar}
                onChange={e => updateMember(m.tempId, 'avatar', e.target.value)}
                style={styles.avatarSelect}
              >
                {AVATARS.map(a => (
                  <option key={a} value={a}>{a}</option>
                ))}
              </select>

              <input
                type="text"
                placeholder={m.role === 'child' ? 'Barnets namn' : 'Förälders namn'}
                value={m.name}
                onChange={e => updateMember(m.tempId, 'name', e.target.value)}
                style={styles.nameInput}
              />

              <button
                onClick={() => removeMember(m.tempId)}
                style={styles.removeBtn}
              >
                <Trash2 size={16} color={C.error} />
              </button>
            </div>

            <span style={{
              ...styles.roleBadge,
              background: m.role === 'child' ? C.accentLight : C.secondaryLight,
              color: m.role === 'child' ? C.warning : C.secondary,
            }}>
              {m.role === 'child' ? '🧒 Barn' : '👤 Förälder'}
            </span>

            {m.role === 'child' && (
              <input
                type="text"
                inputMode="numeric"
                maxLength={4}
                placeholder="4-siffrig PIN"
                value={m.pin}
                onChange={e => {
                  const v = e.target.value.replace(/\D/g, '').slice(0, 4);
                  updateMember(m.tempId, 'pin', v);
                }}
                style={styles.pinInput}
              />
            )}

            <div style={styles.colorRow}>
              <span style={styles.colorLabel}>Färg:</span>
              {MEMBER_COLORS.map(c => (
                <button
                  key={c}
                  onClick={() => updateMember(m.tempId, 'color', c)}
                  style={{
                    ...styles.colorDot,
                    background: c,
                    border: m.color === c ? '3px solid ' + C.text : '3px solid transparent',
                  }}
                />
              ))}
            </div>
          </div>
        ))}

        {/* Add buttons */}
        <div style={styles.addRow}>
          <button
            onClick={() => addMember('child')}
            style={{ ...S.button, ...S.buttonSecondary, flex: 1 }}
          >
            <Plus size={16} /> Lägg till barn
          </button>
          <button
            onClick={() => addMember('parent')}
            style={{ ...S.button, ...S.buttonSecondary, flex: 1 }}
          >
            <Plus size={16} /> Lägg till förälder
          </button>
        </div>

        {error && (
          <div style={styles.errorBox}>{error}</div>
        )}

        <button
          onClick={handleSave}
          disabled={saving}
          style={{
            ...S.button,
            ...S.buttonPrimary,
            width: '100%',
            marginTop: 16,
            opacity: saving ? 0.6 : 1,
          }}
        >
          {saving ? 'Sparar...' : (
            <>
              Skapa familjen
              <ArrowRight size={18} />
            </>
          )}
        </button>

        <button
          onClick={() => setStep(1)}
          style={{ ...S.button, ...S.buttonSecondary, width: '100%', marginTop: 8 }}
        >
          Tillbaka
        </button>
      </div>
    </div>
  );
}

// --- Styles ---

const styles = {
  page: {
    minHeight: '100vh',
    background: `linear-gradient(135deg, ${C.primaryLight} 0%, ${C.bg} 50%, ${C.secondaryLight} 100%)`,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    fontFamily: F.body,
  },
  container: {
    width: '100%',
    maxWidth: 480,
    ...S.card,
    padding: 28,
  },
  iconWrap: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: C.primary,
    borderRadius: 16,
    padding: 12,
    marginBottom: 16,
  },
  title: {
    fontFamily: F.heading,
    fontSize: F.sizes.xl,
    fontWeight: F.weights.extra,
    color: C.text,
    margin: '0 0 8px',
  },
  desc: {
    fontSize: F.sizes.sm,
    color: C.textMuted,
    margin: '0 0 20px',
    lineHeight: 1.5,
  },
  label: {
    display: 'block',
    fontSize: F.sizes.sm,
    fontWeight: F.weights.semi,
    color: C.text,
    marginBottom: 6,
  },
  memberCard: {
    background: C.bg,
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    border: `1px solid ${C.border}`,
  },
  memberHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  },
  avatarSelect: {
    fontSize: 24,
    border: 'none',
    background: 'transparent',
    cursor: 'pointer',
    padding: 0,
    width: 40,
  },
  nameInput: {
    flex: 1,
    padding: '8px 12px',
    borderRadius: 8,
    border: `1px solid ${C.border}`,
    fontSize: F.sizes.md,
    fontFamily: F.body,
    outline: 'none',
  },
  removeBtn: {
    background: C.errorLight,
    border: 'none',
    borderRadius: 8,
    padding: 8,
    cursor: 'pointer',
  },
  roleBadge: {
    display: 'inline-block',
    padding: '4px 10px',
    borderRadius: 8,
    fontSize: F.sizes.xs,
    fontWeight: F.weights.bold,
    marginTop: 8,
  },
  pinInput: {
    display: 'block',
    marginTop: 8,
    padding: '8px 12px',
    borderRadius: 8,
    border: `1px solid ${C.border}`,
    fontSize: F.sizes.lg,
    fontFamily: 'monospace',
    letterSpacing: 8,
    textAlign: 'center',
    width: 140,
    outline: 'none',
  },
  colorRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    marginTop: 10,
  },
  colorLabel: {
    fontSize: F.sizes.xs,
    color: C.textMuted,
    marginRight: 4,
  },
  colorDot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    cursor: 'pointer',
    padding: 0,
  },
  addRow: {
    display: 'flex',
    gap: 8,
    marginTop: 4,
    marginBottom: 8,
  },
  errorBox: {
    padding: '10px 14px',
    background: C.errorLight,
    borderRadius: 10,
    fontSize: F.sizes.sm,
    color: C.error,
    marginTop: 12,
  },
};
