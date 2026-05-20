// ============================================
// FamTastic — MemberRow (editable member card)
// ============================================

import React, { useState } from 'react';
import { Save, Trash2, ChevronDown, ChevronUp, Mail, Check } from 'lucide-react';
import { supabase } from '../supabaseClient';
import { C, F, S } from '../data';

const AVATARS = ['😀','😎','🦊','🐻','🦄','🌟','🎨','⚽','🎵','🌈','🍕','🐱','🐶','🦋','🚀','💪','👑','🧑‍💻'];
const MEMBER_COLORS = C.memberColors;

export function MemberRow({ m, isExpanded, onToggle, onUpdate, onSave, onDelete, saving }) {
  const [email, setEmail] = useState('');
  const [emailSaving, setEmailSaving] = useState(false);
  const [emailSent, setEmailSent] = useState(false);

  const isParentRole = m.role === 'admin' || m.role === 'parent';
  const hasAuth = !!m.auth_user_id;
  const hasPendingEmail = isParentRole && !hasAuth && m.pin_hash && m.pin_hash.includes('@');

  async function linkEmail() {
    if (!email.trim() || !email.includes('@')) return;
    setEmailSaving(true);

    const { error } = await supabase.rpc('link_parent_email', {
      p_member_id: m.id,
      p_email: email.trim().toLowerCase(),
    });

    if (!error) {
      setEmailSent(true);
      setTimeout(() => setEmailSent(false), 3000);
    }
    setEmailSaving(false);
  }

  return (
    <div style={styles.card}>
      <button onClick={onToggle} style={styles.header}>
        <span style={styles.avatar}>{m.avatar}</span>
        <div style={{ flex: 1 }}>
          <span style={styles.name}>{m.name}</span>
          {isParentRole && !hasAuth && (
            <span style={styles.noAuth}>Ej kopplad</span>
          )}
          {hasPendingEmail && (
            <span style={styles.pending}>Väntar: {m.pin_hash}</span>
          )}
        </div>
        <span style={styles.role}>
          {m.role === 'admin' ? '👑 Admin' : m.role === 'parent' ? 'Förälder' : 'Barn'}
        </span>
        {isExpanded ? <ChevronUp size={16} color={C.textMuted} /> : <ChevronDown size={16} color={C.textMuted} />}
      </button>

      {isExpanded && (
        <div style={styles.expanded}>
          <label style={styles.label}>Namn</label>
          <input
            type="text"
            value={m.name}
            onChange={e => onUpdate(m.id, 'name', e.target.value)}
            style={S.input}
          />

          <label style={{ ...styles.label, marginTop: 10 }}>Avatar</label>
          <div style={styles.avatarRow}>
            {AVATARS.map(a => (
              <button
                key={a}
                onClick={() => onUpdate(m.id, 'avatar', a)}
                style={{
                  ...styles.avatarBtn,
                  background: m.avatar === a ? C.primaryLight : 'transparent',
                  border: m.avatar === a ? `2px solid ${C.primary}` : '2px solid transparent',
                }}
              >
                {a}
              </button>
            ))}
          </div>

          <label style={{ ...styles.label, marginTop: 10 }}>Färg</label>
          <div style={styles.colorRow}>
            {MEMBER_COLORS.map(c => (
              <button
                key={c}
                onClick={() => onUpdate(m.id, 'color', c)}
                style={{
                  ...styles.colorDot,
                  background: c,
                  border: m.color === c ? `3px solid ${C.text}` : '3px solid transparent',
                }}
              />
            ))}
          </div>

          {/* Email link for parents without auth */}
          {isParentRole && !hasAuth && (
            <div style={styles.emailSection}>
              <label style={styles.label}>E-post för inloggning</label>
              {hasPendingEmail ? (
                <div style={styles.pendingBox}>
                  <Mail size={14} color={C.textMuted} />
                  <span style={styles.pendingText}>
                    Väntar på att {m.name} loggar in med {m.pin_hash}
                  </span>
                </div>
              ) : emailSent ? (
                <div style={styles.sentBox}>
                  <Check size={14} color={C.success} />
                  <span>E-post kopplad! {m.name} kan nu logga in.</span>
                </div>
              ) : (
                <div style={styles.emailRow}>
                  <input
                    type="email"
                    placeholder="stina@mejl.se"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    style={{ ...S.input, flex: 1 }}
                  />
                  <button
                    onClick={linkEmail}
                    disabled={emailSaving || !email.includes('@')}
                    style={{
                      ...S.button, ...S.buttonPrimary, padding: '10px 14px',
                      opacity: emailSaving || !email.includes('@') ? 0.5 : 1,
                    }}
                  >
                    {emailSaving ? '...' : <Mail size={16} />}
                  </button>
                </div>
              )}
            </div>
          )}

          <div style={styles.actions}>
            <button
              onClick={() => onSave(m)}
              disabled={saving}
              style={{ ...S.button, ...S.buttonPrimary, flex: 1 }}
            >
              <Save size={14} /> Spara
            </button>
            {onDelete && (
              <button
                onClick={() => onDelete(m.id, m.name)}
                style={styles.deleteBtn}
              >
                <Trash2 size={14} />
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

const styles = {
  card: {
    background: C.bg,
    borderRadius: 10,
    border: `1px solid ${C.borderLight}`,
    marginBottom: 6,
    overflow: 'hidden',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    width: '100%',
    padding: '10px 12px',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    textAlign: 'left',
  },
  avatar: { fontSize: 22 },
  name: { display: 'block', fontSize: F.sizes.md, fontWeight: F.weights.semi, color: C.text },
  noAuth: { display: 'block', fontSize: F.sizes.xs, color: C.accent, marginTop: 1 },
  pending: { display: 'block', fontSize: F.sizes.xs, color: C.textMuted, marginTop: 1 },
  role: { fontSize: F.sizes.xs, color: C.textMuted },
  expanded: { padding: '0 12px 12px' },
  label: { display: 'block', fontSize: F.sizes.sm, fontWeight: F.weights.semi, color: C.text, marginBottom: 6 },
  avatarRow: { display: 'flex', flexWrap: 'wrap', gap: 4 },
  avatarBtn: {
    width: 36, height: 36, borderRadius: 8, fontSize: 18,
    cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  colorRow: { display: 'flex', gap: 6 },
  colorDot: { width: 28, height: 28, borderRadius: 14, cursor: 'pointer', padding: 0 },
  emailSection: { marginTop: 14, padding: 12, background: C.bgCard, borderRadius: 10, border: `1px solid ${C.borderLight}` },
  emailRow: { display: 'flex', gap: 8 },
  pendingBox: { display: 'flex', alignItems: 'center', gap: 6, fontSize: F.sizes.xs, color: C.textMuted },
  pendingText: { fontSize: F.sizes.xs },
  sentBox: { display: 'flex', alignItems: 'center', gap: 6, fontSize: F.sizes.sm, color: C.success, fontWeight: F.weights.semi },
  actions: { display: 'flex', gap: 8, marginTop: 12 },
  deleteBtn: {
    padding: '10px 14px', borderRadius: 12, border: 'none',
    background: C.errorLight, color: C.error, cursor: 'pointer',
    display: 'flex', alignItems: 'center',
  },
};
