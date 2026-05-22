// ============================================
// FamTastic — Family Setup (onboarding)
// ============================================

import React, { useState } from 'react';
import { supabase } from './supabaseClient';
import { C, F, S } from './data';
import { Users, Plus, Trash2, ArrowRight, Home, Lock } from 'lucide-react';

const AVATARS = ['😀','😎','🦊','🐻','🦄','🌟','🎨','⚽','🎵','🌈','🍕','🐱','🐶','🦋','🚀','💪'];
const MEMBER_COLORS = C.memberColors;

export function FamilySetup({ onComplete }) {
  const [step,        setStep]        = useState(1);

  // Steg 1 — Kontoinformation
  const [username,    setUsername]    = useState('');
  const [email,       setEmail]       = useState('');
  const [password,    setPassword]    = useState('');
  const [password2,   setPassword2]   = useState('');
  const [familyName,  setFamilyName]  = useState('');
  const [usernameErr, setUsernameErr] = useState('');

  // Steg 2 — Admin-profil
  const [adminName,   setAdminName]   = useState('');
  const [adminPin,    setAdminPin]    = useState('');
  const [adminAvatar, setAdminAvatar] = useState('👑');
  const [adminColor,  setAdminColor]  = useState(MEMBER_COLORS[0]);

  // Steg 3 — Övriga familjemedlemmar
  const [members,     setMembers]     = useState([]);
  const [saving,      setSaving]      = useState(false);
  const [error,       setError]       = useState('');

  // ── Steg 2: member helpers ──────────────────────────────────────────────────
  function addMember(role) {
    setMembers(prev => [...prev, {
      tempId: Date.now(),
      name: '',
      role,
      avatar: role === 'child' ? '😀' : '😎',
      color: MEMBER_COLORS[(prev.length + 2) % MEMBER_COLORS.length],
      pin: '',
    }]);
  }

  function updateMember(tempId, field, value) {
    setMembers(prev => prev.map(m => m.tempId === tempId ? { ...m, [field]: value } : m));
  }

  function removeMember(tempId) {
    setMembers(prev => prev.filter(m => m.tempId !== tempId));
  }

  // ── Steg 1 → 2: validering ─────────────────────────────────────────────────
  async function handleStep1Next() {
    setUsernameErr('');
    const u = username.trim().toLowerCase();
    if (!u || !email.trim() || !password || !familyName.trim()) return;
    if (password !== password2) { setError('Lösenorden matchar inte'); return; }
    if (password.length < 6)   { setError('Lösenordet måste vara minst 6 tecken'); return; }
    if (!/^[a-z0-9_-]+$/.test(u)) { setUsernameErr('Endast bokstäver, siffror, - och _'); return; }
    setError('');
    setStep(2);
  }

  // ── Spara allt ──────────────────────────────────────────────────────────────
  async function handleSave() {
    setSaving(true);
    setError('');

    try {
      // 1. Skapa Supabase-konto
      const { error: signUpErr } = await supabase.auth.signUp({
        email: email.trim(),
        password,
      });
      if (signUpErr) throw signUpErr;

      // 2. Skapa familj + admin via RPC
      const { data: result, error: rpcErr } = await supabase
        .rpc('create_family_with_admin', {
          p_family_name:     familyName.trim(),
          p_family_username: username.trim().toLowerCase(),
          p_family_email:    email.trim(),
          p_admin_name:      adminName.trim() || 'Admin',
          p_admin_avatar:    adminAvatar,
          p_admin_color:     adminColor,
          p_admin_pin:       adminPin || null,
        });

      if (rpcErr) {
        if (rpcErr.message?.includes('username_taken')) {
          setError('Familjenamnet är redan taget, välj ett annat');
        } else {
          throw rpcErr;
        }
        setSaving(false);
        return;
      }

      const familyId = result.family_id;

      // 3. Skapa övriga familjemedlemmar
      if (members.length > 0) {
        const rows = members.map(m => ({
          family_id: familyId,
          name:      m.name.trim() || (m.role === 'child' ? 'Barn' : 'Förälder'),
          role:      m.role,
          avatar:    m.avatar,
          color:     m.color,
          pin_hash:  m.pin || null,
        }));
        const { error: memErr } = await supabase.from('family_members').insert(rows);
        if (memErr) throw memErr;
      }

      onComplete();
    } catch (err) {
      setError(err.message || 'Något gick fel');
      setSaving(false);
    }
  }

  // ════════════════════════════════════════════════════════════════════════════
  // STEG 1 — Kontoinformation
  // ════════════════════════════════════════════════════════════════════════════
  if (step === 1) {
    const canNext = username.trim() && email.trim() && password && password === password2 && familyName.trim();
    return (
      <div style={styles.page}>
        <div style={styles.container}>
          <div style={styles.iconWrap}><Home size={32} color="#fff" /></div>
          <h1 style={styles.title}>Skapa din familj</h1>
          <p style={styles.desc}>Välj ett inloggningsnamn för familjen och skapa ert konto.</p>

          <label style={styles.label}>Familjens inloggningsnamn</label>
          <input
            type="text"
            placeholder="t.ex. familjjohansson"
            value={username}
            onChange={e => { setUsername(e.target.value.toLowerCase().replace(/\s/g, '')); setUsernameErr(''); }}
            style={S.input}
            autoCapitalize="none"
            autoCorrect="off"
          />
          {usernameErr && <p style={styles.fieldErr}>{usernameErr}</p>}
          <p style={styles.hint}>Används vid inloggning. Bara bokstäver, siffror och -_</p>

          <label style={{ ...styles.label, marginTop: 14 }}>Familjens visningsnamn</label>
          <input
            type="text"
            placeholder="T.ex. Familjen Johansson"
            value={familyName}
            onChange={e => setFamilyName(e.target.value)}
            style={S.input}
          />

          <label style={{ ...styles.label, marginTop: 14 }}>Din e-postadress</label>
          <input
            type="email"
            placeholder="din@email.se"
            value={email}
            onChange={e => setEmail(e.target.value)}
            style={S.input}
            autoCapitalize="none"
          />
          <p style={styles.hint}>Används för lösenordsåterställning, visas inte i appen</p>

          <label style={{ ...styles.label, marginTop: 14 }}>Lösenord</label>
          <input
            type="password"
            placeholder="Minst 6 tecken"
            value={password}
            onChange={e => setPassword(e.target.value)}
            style={S.input}
          />

          <label style={{ ...styles.label, marginTop: 14 }}>Bekräfta lösenord</label>
          <input
            type="password"
            placeholder="Upprepa lösenordet"
            value={password2}
            onChange={e => setPassword2(e.target.value)}
            style={S.input}
          />

          {error && <div style={styles.errorBox}>{error}</div>}

          <button
            disabled={!canNext}
            onClick={handleStep1Next}
            style={{ ...S.button, ...S.buttonPrimary, width: '100%', marginTop: 20, opacity: canNext ? 1 : 0.5 }}
          >
            Nästa <ArrowRight size={18} />
          </button>
        </div>
      </div>
    );
  }

  // ════════════════════════════════════════════════════════════════════════════
  // STEG 2 — Om dig (admin)
  // ════════════════════════════════════════════════════════════════════════════
  if (step === 2) {
    return (
      <div style={styles.page}>
        <div style={styles.container}>
          <div style={styles.iconWrap}><Lock size={32} color="#fff" /></div>
          <h1 style={styles.title}>Om dig</h1>
          <p style={styles.desc}>Du är familjeadmin. Välj namn, avatar och din PIN-kod.</p>

          <label style={styles.label}>Ditt namn</label>
          <input
            type="text"
            placeholder="T.ex. Joacim"
            value={adminName}
            onChange={e => setAdminName(e.target.value)}
            style={S.input}
            autoFocus
          />

          <label style={{ ...styles.label, marginTop: 14 }}>Din PIN (4 siffror)</label>
          <input
            type="text"
            inputMode="numeric"
            maxLength={4}
            placeholder="- - - -"
            value={adminPin}
            onChange={e => setAdminPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
            style={{ ...S.input, letterSpacing: 12, textAlign: 'center', fontFamily: 'monospace', fontSize: 22 }}
          />

          <label style={{ ...styles.label, marginTop: 14 }}>Din avatar</label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {AVATARS.map(a => (
              <button
                key={a}
                onClick={() => setAdminAvatar(a)}
                style={{
                  fontSize: 28, background: adminAvatar === a ? C.primaryLight : 'transparent',
                  border: adminAvatar === a ? `2px solid ${C.primary}` : '2px solid transparent',
                  borderRadius: 10, padding: 6, cursor: 'pointer',
                }}
              >{a}</button>
            ))}
          </div>

          <label style={{ ...styles.label, marginTop: 14 }}>Din färg</label>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {MEMBER_COLORS.map(c => (
              <button
                key={c}
                onClick={() => setAdminColor(c)}
                style={{
                  width: 32, height: 32, borderRadius: 16, background: c, cursor: 'pointer',
                  border: adminColor === c ? `3px solid ${C.text}` : '3px solid transparent', padding: 0,
                }}
              />
            ))}
          </div>

          <div style={{ display: 'flex', gap: 8, marginTop: 24 }}>
            <button
              onClick={() => setStep(1)}
              style={{ ...S.button, ...S.buttonSecondary, flex: 1 }}
            >
              Tillbaka
            </button>
            <button
              disabled={!adminName.trim()}
              onClick={() => setStep(3)}
              style={{ ...S.button, ...S.buttonPrimary, flex: 2, opacity: adminName.trim() ? 1 : 0.5 }}
            >
              Nästa <ArrowRight size={18} />
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ════════════════════════════════════════════════════════════════════════════
  // STEG 3 — Lägg till övriga familjemedlemmar
  // ════════════════════════════════════════════════════════════════════════════
  return (
    <div style={styles.page}>
      <div style={styles.container}>
        <div style={styles.iconWrap}><Users size={32} color="#fff" /></div>
        <h1 style={styles.title}>Resten av familjen</h1>
        <p style={styles.desc}>
          Du ({adminName}) är redan med. Lägg till resten — alla behöver en PIN.
        </p>

        {members.map(m => (
          <div key={m.tempId} style={styles.memberCard}>
            <div style={styles.memberHeader}>
              <select
                value={m.avatar}
                onChange={e => updateMember(m.tempId, 'avatar', e.target.value)}
                style={styles.avatarSelect}
              >
                {AVATARS.map(a => <option key={a} value={a}>{a}</option>)}
              </select>
              <input
                type="text"
                placeholder={m.role === 'child' ? 'Barnets namn' : 'Förälders namn'}
                value={m.name}
                onChange={e => updateMember(m.tempId, 'name', e.target.value)}
                style={styles.nameInput}
              />
              <button onClick={() => removeMember(m.tempId)} style={styles.removeBtn}>
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

            <input
              type="text"
              inputMode="numeric"
              maxLength={4}
              placeholder="4-siffrig PIN"
              value={m.pin}
              onChange={e => updateMember(m.tempId, 'pin', e.target.value.replace(/\D/g, '').slice(0, 4))}
              style={styles.pinInput}
            />

            <div style={styles.colorRow}>
              <span style={styles.colorLabel}>Färg:</span>
              {MEMBER_COLORS.map(c => (
                <button
                  key={c}
                  onClick={() => updateMember(m.tempId, 'color', c)}
                  style={{
                    ...styles.colorDot, background: c,
                    border: m.color === c ? `3px solid ${C.text}` : '3px solid transparent',
                  }}
                />
              ))}
            </div>
          </div>
        ))}

        <div style={styles.addRow}>
          <button onClick={() => addMember('child')}  style={{ ...S.button, ...S.buttonSecondary, flex: 1 }}>
            <Plus size={16} /> Lägg till barn
          </button>
          <button onClick={() => addMember('parent')} style={{ ...S.button, ...S.buttonSecondary, flex: 1 }}>
            <Plus size={16} /> Lägg till förälder
          </button>
        </div>

        {error && <div style={styles.errorBox}>{error}</div>}

        <button
          onClick={handleSave}
          disabled={saving}
          style={{ ...S.button, ...S.buttonPrimary, width: '100%', marginTop: 16, opacity: saving ? 0.6 : 1 }}
        >
          {saving ? 'Sparar...' : <><span>Skapa familjen</span><ArrowRight size={18} /></>}
        </button>
        <button
          onClick={() => setStep(2)}
          style={{ ...S.button, ...S.buttonSecondary, width: '100%', marginTop: 8 }}
        >
          Tillbaka
        </button>
      </div>
    </div>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const styles = {
  page: {
    minHeight: '100vh',
    background: `linear-gradient(135deg, ${C.primaryLight} 0%, ${C.bg} 50%, ${C.secondaryLight} 100%)`,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    padding: 16, fontFamily: F.body,
  },
  container: { width: '100%', maxWidth: 480, ...S.card, padding: 28 },
  iconWrap: {
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
    background: C.primary, borderRadius: 16, padding: 12, marginBottom: 16,
  },
  title: { fontFamily: F.heading, fontSize: F.sizes.xl, fontWeight: F.weights.extra, color: C.text, margin: '0 0 8px' },
  desc:  { fontSize: F.sizes.sm, color: C.textMuted, margin: '0 0 20px', lineHeight: 1.5 },
  label: { display: 'block', fontSize: F.sizes.sm, fontWeight: F.weights.semi, color: C.text, marginBottom: 6 },
  hint:  { fontSize: 12, color: C.textMuted, margin: '4px 0 0' },
  fieldErr: { fontSize: 12, color: C.error, margin: '4px 0 0' },
  memberCard:   { background: C.bg, borderRadius: 12, padding: 14, marginBottom: 12, border: `1px solid ${C.border}` },
  memberHeader: { display: 'flex', alignItems: 'center', gap: 8 },
  avatarSelect: { fontSize: 24, border: 'none', background: 'transparent', cursor: 'pointer', padding: 0, width: 40 },
  nameInput:    { flex: 1, padding: '8px 12px', borderRadius: 8, border: `1px solid ${C.border}`, fontSize: F.sizes.md, fontFamily: F.body, outline: 'none' },
  removeBtn:    { background: C.errorLight, border: 'none', borderRadius: 8, padding: 8, cursor: 'pointer' },
  roleBadge:    { display: 'inline-block', padding: '4px 10px', borderRadius: 8, fontSize: F.sizes.xs, fontWeight: F.weights.bold, marginTop: 8 },
  pinInput: {
    display: 'block', marginTop: 10, padding: '8px 12px', borderRadius: 8,
    border: `1px solid ${C.border}`, fontSize: F.sizes.lg, fontFamily: 'monospace',
    letterSpacing: 8, textAlign: 'center', width: 140, outline: 'none',
  },
  colorRow:  { display: 'flex', alignItems: 'center', gap: 6, marginTop: 10 },
  colorLabel: { fontSize: F.sizes.xs, color: C.textMuted, marginRight: 4 },
  colorDot:  { width: 24, height: 24, borderRadius: 12, cursor: 'pointer', padding: 0 },
  addRow:    { display: 'flex', gap: 8, marginTop: 4, marginBottom: 8 },
  errorBox:  { padding: '10px 14px', background: C.errorLight, borderRadius: 10, fontSize: F.sizes.sm, color: C.error, marginTop: 12 },
};
