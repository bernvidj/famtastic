// ============================================
// FamTastic — MemberRow (editable member card)
// ============================================

import React, { useState } from 'react';
import { Save, Trash2, ChevronDown, ChevronUp, Mail, Check, Lock } from 'lucide-react';
import { supabase } from '../supabaseClient';
import { C, F, S } from '../data';

const AVATARS = ['😀','😎','🦊','🐻','🦄','🌟','🎨','⚽','🎵','🌈','🍕','🐱','🐶','🦋','🚀','💪','👑','🧑‍💻'];
const MEMBER_COLORS = C.memberColors;

export function MemberRow({ m, isExpanded, onToggle, onUpdate, onSave, onDelete, saving }) {
  const [email,        setEmail]        = useState('');
  const [emailSaving,  setEmailSaving]  = useState(false);
  const [emailSent,    setEmailSent]    = useState(false);

  const [newPin,       setNewPin]       = useState('');
  const [pinSaving,    setPinSaving]    = useState(false);
  const [pinSaved,     setPinSaved]     = useState(false);
  const [pinErr,       setPinErr]       = useState('');

  const isParentRole = m.role === 'admin' || m.role === 'parent';
  const hasAuth      = !!m.auth_user_id;
  const hasPending   = isParentRole && !hasAuth && m.pin_hash && m.pin_hash.includes('@');
  const hasPin       = !!m.pin_hash && !m.pin_hash.includes('@');

  // ── Koppla e-post (förälder utan auth) ───────────────────────────────────────
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

  // ── Ändra PIN ─────────────────────────────────────────────────────────────────
  async function savePin() {
    if (newPin.length !== 4) { setPinErr('PIN måste vara 4 siffror'); return; }
    setPinSaving(true); setPinErr('');
    const { error } = await supabase
      .from('family_members')
      .update({ pin_hash: newPin })
      .eq('id', m.id);
    if (error) {
      setPinErr('Kunde inte spara PIN');
    } else {
      setPinSaved(true);
      setNewPin('');
      setTimeout(() => setPinSaved(false), 3000);
    }
    setPinSaving(false);
  }

  return (
    <div style={styles.card}>
      {/* ── Rubrikrad ── */}
      <button onClick={onToggle} style={styles.header}>
        <div style={{
          width: 40, height: 40, borderRadius: '50%',
          background: m.color ? `${m.color}22` : '#FFE8C2',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 22, flexShrink: 0,
        }}>
          {m.avatar}
        </div>
        <div style={{ flex: 1 }}>
          <span style={styles.name}>{m.name}</span>
          {isParentRole && !hasAuth && !hasPending && (
            <span style={styles.noAuth}>Ej kopplad</span>
          )}
          {hasPending && (
            <span style={styles.pending}>Väntar på inloggning</span>
          )}
          {!hasPin && !hasPending && (
            <span style={styles.noPin}>Ingen PIN satt</span>
          )}
        </div>
        <span style={styles.role}>
          {m.role === 'admin' ? '👑 Admin' : m.role === 'parent' ? 'Förälder' : 'Barn'}
        </span>
        {isExpanded
          ? <ChevronUp size={16} color={C.textMuted} />
          : <ChevronDown size={16} color={C.textMuted} />}
      </button>

      {/* ── Expanderad ── */}
      {isExpanded && (
        <div style={styles.expanded}>

          {/* Namn */}
          <label style={styles.label}>Namn</label>
          <input
            type="text"
            value={m.name}
            onChange={e => onUpdate(m.id, 'name', e.target.value)}
            style={S.input}
          />

          {/* Avatar */}
          <label style={{ ...styles.label, marginTop: 12 }}>Avatar</label>
          <div style={styles.avatarRow}>
            {AVATARS.map(a => (
              <button key={a} onClick={() => onUpdate(m.id, 'avatar', a)} style={{
                width: 36, height: 36, borderRadius: 8, fontSize: 18,
                cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: m.avatar === a ? '#FFE8C2' : 'transparent',
                border: m.avatar === a ? '2px solid #FF7A59' : '2px solid transparent',
              }}>
                {a}
              </button>
            ))}
          </div>

          {/* Färg */}
          <label style={{ ...styles.label, marginTop: 12 }}>Färg</label>
          <div style={styles.colorRow}>
            {MEMBER_COLORS.map(c => (
              <button key={c} onClick={() => onUpdate(m.id, 'color', c)} style={{
                width: 28, height: 28, borderRadius: 14, background: c, cursor: 'pointer', padding: 0,
                border: m.color === c ? '3px solid #1C1917' : '3px solid transparent',
              }} />
            ))}
          </div>

          {/* Spara namn/avatar/färg */}
          <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
            <button onClick={() => onSave(m)} disabled={saving} style={{
              flex: 1, padding: '11px 16px', borderRadius: 12,
              background: saving ? '#D1D5DB' : '#FF7A59',
              color: '#fff', border: 'none', fontSize: 14, fontWeight: 700,
              cursor: saving ? 'not-allowed' : 'pointer', fontFamily: 'inherit',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
            }}>
              <Save size={14} /> Spara
            </button>
            {onDelete && (
              <button onClick={() => onDelete(m.id, m.name)} style={{
                padding: '11px 14px', borderRadius: 12, border: 'none',
                background: '#FEF2F2', color: '#EF4444', cursor: 'pointer',
                display: 'flex', alignItems: 'center',
              }}>
                <Trash2 size={14} />
              </button>
            )}
          </div>

          {/* ── PIN-sektion ── */}
          <div style={styles.pinSection}>
            {/* Liten dekorativ form */}
            <div style={{ position: 'relative', overflow: 'hidden', borderRadius: 14 }}>
              <div style={{
                position: 'absolute', top: -20, right: -20,
                width: 80, height: 80, borderRadius: '50%',
                background: '#3CB4A6', opacity: 0.12,
              }} />
              <div style={{
                position: 'absolute', bottom: -15, left: -15,
                width: 60, height: 60, borderRadius: '50%',
                background: '#FF7A59', opacity: 0.1,
              }} />

              <div style={{ position: 'relative', padding: '14px 16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                  <div style={{ width: 28, height: 28, borderRadius: 8, background: '#E1F5F3', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Lock size={14} color="#3CB4A6" />
                  </div>
                  <span style={{ fontSize: 13, fontWeight: 700, color: '#1C1917' }}>
                    {hasPin ? 'Ändra PIN' : 'Sätt PIN-kod'}
                  </span>
                  {hasPin && (
                    <span style={{ fontSize: 11, color: '#3CB4A6', background: '#E1F5F3', borderRadius: 6, padding: '2px 8px', fontWeight: 600 }}>
                      ••••
                    </span>
                  )}
                </div>

                {pinSaved ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#22C55E', fontSize: 13, fontWeight: 600 }}>
                    <Check size={14} /> PIN sparad!
                  </div>
                ) : (
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <input
                      type="text"
                      inputMode="numeric"
                      maxLength={4}
                      placeholder="- - - -"
                      value={newPin}
                      onChange={e => { setNewPin(e.target.value.replace(/\D/g, '').slice(0, 4)); setPinErr(''); }}
                      style={{
                        width: 100, padding: '10px 12px', borderRadius: 10,
                        border: `2px solid ${pinErr ? '#EF4444' : '#E5E7EB'}`,
                        fontSize: 20, fontFamily: 'monospace', letterSpacing: 8,
                        textAlign: 'center', outline: 'none', background: '#F9FAFB',
                      }}
                    />
                    <button
                      onClick={savePin}
                      disabled={pinSaving || newPin.length !== 4}
                      style={{
                        padding: '10px 16px', borderRadius: 10,
                        background: newPin.length === 4 ? '#3CB4A6' : '#D1D5DB',
                        color: '#fff', border: 'none', fontSize: 13, fontWeight: 700,
                        cursor: newPin.length === 4 ? 'pointer' : 'not-allowed',
                        fontFamily: 'inherit',
                      }}
                    >
                      {pinSaving ? '...' : 'Spara'}
                    </button>
                  </div>
                )}
                {pinErr && <p style={{ fontSize: 12, color: '#EF4444', margin: '6px 0 0' }}>{pinErr}</p>}
              </div>
            </div>
          </div>

          {/* ── E-postkoppling (förälder utan auth) ── */}
          {isParentRole && !hasAuth && (
            <div style={styles.emailSection}>
              <label style={styles.label}>E-post för inloggning</label>
              {hasPending ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#78716C' }}>
                  <Mail size={14} color="#78716C" />
                  Väntar på att {m.name} loggar in
                </div>
              ) : emailSent ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#22C55E', fontWeight: 600 }}>
                  <Check size={14} /> E-post kopplad! {m.name} kan nu logga in.
                </div>
              ) : (
                <div style={{ display: 'flex', gap: 8 }}>
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
                      padding: '10px 14px', borderRadius: 12, border: 'none',
                      background: email.includes('@') ? '#FF7A59' : '#D1D5DB',
                      color: '#fff', cursor: email.includes('@') ? 'pointer' : 'not-allowed',
                      display: 'flex', alignItems: 'center',
                    }}
                  >
                    {emailSaving ? '...' : <Mail size={16} />}
                  </button>
                </div>
              )}
            </div>
          )}

        </div>
      )}
    </div>
  );
}

const styles = {
  card: {
    background: '#F9FAFB',
    borderRadius: 14,
    border: '1.5px solid #E5E7EB',
    marginBottom: 8,
    overflow: 'hidden',
  },
  header: {
    display: 'flex', alignItems: 'center', gap: 10,
    width: '100%', padding: '12px 14px',
    background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left',
  },
  name:    { display: 'block', fontSize: 15, fontWeight: 700, color: '#1C1917' },
  noAuth:  { display: 'block', fontSize: 11, color: '#FBBF24', marginTop: 1, fontWeight: 600 },
  noPin:   { display: 'block', fontSize: 11, color: '#FFA071', marginTop: 1, fontWeight: 600 },
  pending: { display: 'block', fontSize: 11, color: '#78716C', marginTop: 1 },
  role:    { fontSize: 12, color: '#78716C', flexShrink: 0 },
  expanded: { padding: '0 14px 14px' },
  label:   { display: 'block', fontSize: 13, fontWeight: 700, color: '#374151', marginBottom: 6 },
  avatarRow: { display: 'flex', flexWrap: 'wrap', gap: 4 },
  colorRow:  { display: 'flex', gap: 6, flexWrap: 'wrap' },
  pinSection: {
    marginTop: 14,
    background: '#fff',
    borderRadius: 14,
    border: '1.5px solid #E5E7EB',
    overflow: 'hidden',
  },
  emailSection: {
    marginTop: 12, padding: '12px 14px',
    background: '#fff', borderRadius: 12,
    border: '1.5px solid #E5E7EB',
  },
};
