// ============================================
// FamTastic — Family Setup (onboarding)
// ============================================

import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import { C, F, S } from './data';
import { Users, Plus, Trash2, ArrowRight, ArrowLeft } from 'lucide-react';

const AVATARS = ['😀','😎','🦊','🐻','🦄','🌟','🎨','⚽','🎵','🌈','🍕','🐱','🐶','🦋','🚀','💪'];
const MEMBER_COLORS = C.memberColors;

// ─── Bakgrundsformer ──────────────────────────────────────────────────────────
function BgShapes() {
  return (
    <svg style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', opacity: 0.15, pointerEvents: 'none', zIndex: 0 }}
      viewBox="0 0 400 800" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid slice">
      <path d="M -40 -30 Q 100 -60, 180 80 Q 230 180, 120 240 Q 20 290, -30 180 Q -80 80, -40 -30 Z" fill="#3CB4A6" />
      <path d="M 200 -40 Q 360 -20, 420 130 Q 460 240, 340 290 Q 230 330, 185 220 Q 140 120, 200 -40 Z" fill="#A8E6DF" />
      <path d="M 240 580 Q 420 530, 450 670 Q 465 760, 320 780 Q 180 795, 155 690 Q 135 600, 240 580 Z" fill="#FF7A59" />
      <path d="M -60 640 Q 40 580, 130 650 Q 195 710, 145 790 Q 80 840, -20 800 Q -100 765, -60 640 Z" fill="#FFA071" />
    </svg>
  )
}

// ─── App-ikon ─────────────────────────────────────────────────────────────────
function AppIcon({ size = 64 }) {
  return (
    <svg viewBox="0 0 512 512" width={size} height={size} xmlns="http://www.w3.org/2000/svg"
      style={{ borderRadius: size * 0.225, flexShrink: 0 }}>
      <rect width="512" height="512" rx="115" fill="#FFE8C2" />
      <path d="M 200 40 Q 360 0, 410 140 Q 450 260, 320 305 Q 185 345, 130 225 Q 80 115, 200 40 Z" fill="#3CB4A6" />
      <path d="M 310 80 Q 460 60, 500 200 Q 520 310, 420 360 Q 330 395, 290 300 Q 255 210, 310 80 Z" fill="#A8E6DF" />
      <path d="M 40 195 Q 115 80, 255 135 Q 355 175, 325 305 Q 295 420, 155 440 Q 25 450, 10 320 Q -5 215, 40 195 Z" fill="#FFA071" />
      <path d="M 215 250 Q 375 195, 468 318 Q 535 420, 420 478 Q 300 535, 190 468 Q 90 405, 120 318 Q 148 250, 215 250 Z" fill="#FF7A59" />
      <circle cx="308" cy="375" r="28" fill="rgba(255,255,255,0.9)" />
    </svg>
  )
}

// ─── Stegindikator ────────────────────────────────────────────────────────────
function StepDots({ current, total }) {
  return (
    <div style={{ display: 'flex', gap: 6, justifyContent: 'center', marginBottom: 28 }}>
      {Array.from({ length: total }).map((_, i) => (
        <div key={i} style={{
          width: i === current ? 24 : 8,
          height: 8,
          borderRadius: 4,
          background: i === current ? '#FF7A59' : i < current ? '#3CB4A6' : '#E5E7EB',
          transition: 'all 0.3s',
        }} />
      ))}
    </div>
  )
}

// ─── Gemensamma styles ────────────────────────────────────────────────────────
const page = {
  minHeight: '100dvh',
  background: '#FFFBF5',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'flex-start',
  padding: '40px 20px 40px',
  position: 'relative',
  overflowY: 'auto',
}

const card = {
  background: '#fff',
  borderRadius: 24,
  padding: 24,
  width: '100%',
  maxWidth: 400,
  boxShadow: '0 4px 24px rgba(0,0,0,0.08)',
  boxSizing: 'border-box',
  position: 'relative',
  zIndex: 1,
}

const inp = {
  width: '100%',
  padding: '13px 16px',
  borderRadius: 12,
  border: '2px solid #E5E7EB',
  fontSize: 16,
  boxSizing: 'border-box',
  outline: 'none',
  fontFamily: 'Nunito, sans-serif',
  background: '#F9FAFB',
  color: '#1C1917',
}

const lbl = {
  display: 'block',
  fontSize: 13,
  fontWeight: 700,
  color: '#374151',
  marginBottom: 6,
}

const hint = { fontSize: 12, color: '#78716C', margin: '4px 0 0' }

function PrimaryBtn({ onClick, disabled, children }) {
  return (
    <button onClick={onClick} disabled={disabled} style={{
      width: '100%', padding: 15, marginTop: 16, borderRadius: 14,
      background: disabled ? '#D1D5DB' : '#FF7A59',
      color: '#fff', border: 'none', fontSize: 16, fontWeight: 800,
      cursor: disabled ? 'not-allowed' : 'pointer', fontFamily: 'inherit',
      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
    }}>
      {children}
    </button>
  )
}

function SecondaryBtn({ onClick, children }) {
  return (
    <button onClick={onClick} style={{
      width: '100%', padding: 13, marginTop: 10, borderRadius: 14,
      background: '#FFE8C2', color: '#FF7A59',
      border: 'none', fontSize: 15, fontWeight: 700,
      cursor: 'pointer', fontFamily: 'inherit',
      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
    }}>
      {children}
    </button>
  )
}

function ErrorBox({ msg }) {
  if (!msg) return null
  return (
    <div style={{ padding: '10px 14px', background: '#FEF2F2', borderRadius: 10, fontSize: 14, color: '#EF4444', marginTop: 12 }}>
      {msg}
    </div>
  )
}

// ─── Konfetti ─────────────────────────────────────────────────────────────────
function Confetti() {
  const pieces = Array.from({ length: 32 }).map((_, i) => ({
    id: i,
    left: `${Math.random() * 100}%`,
    delay: `${Math.random() * 1.2}s`,
    color: ['#FF7A59','#3CB4A6','#A8E6DF','#FFA071','#FBBF24','#8B5CF6'][i % 6],
    size: 8 + Math.random() * 8,
  }))
  return (
    <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 10, overflow: 'hidden' }}>
      <style>{`
        @keyframes confettiFall {
          0%   { transform: translateY(-20px) rotate(0deg); opacity: 1; }
          100% { transform: translateY(100vh) rotate(720deg); opacity: 0; }
        }
      `}</style>
      {pieces.map(p => (
        <div key={p.id} style={{
          position: 'absolute',
          left: p.left,
          top: 0,
          width: p.size,
          height: p.size,
          borderRadius: p.id % 3 === 0 ? '50%' : 2,
          background: p.color,
          animation: `confettiFall 2.5s ease-in ${p.delay} forwards`,
        }} />
      ))}
    </div>
  )
}

// ═════════════════════════════════════════════════════════════════════════════
export function FamilySetup({ onComplete }) {
  const [step, setStep] = useState(1)

  // Steg 1a
  const [familyName,  setFamilyName]  = useState('')
  const [username,    setUsername]    = useState('')
  const [usernameErr, setUsernameErr] = useState('')

  // Steg 1b
  const [email,     setEmail]     = useState('')
  const [password,  setPassword]  = useState('')
  const [password2, setPassword2] = useState('')
  const [showPass,  setShowPass]  = useState(false)

  // Steg 2 — admin
  const [adminName,   setAdminName]   = useState('')
  const [adminPin,    setAdminPin]    = useState('')
  const [adminAvatar, setAdminAvatar] = useState('👑')
  const [adminColor,  setAdminColor]  = useState(MEMBER_COLORS[0])

  // Steg 3 — övriga
  const [members, setMembers] = useState([])

  const [saving, setSaving] = useState(false)
  const [error,  setError]  = useState('')
  const [done,   setDone]   = useState(false)

  // Totalt 4 steg (0-indexerat för dots)
  const TOTAL = 4

  // ── Steg 3 helpers ───────────────────────────────────────────────────────────
  function addMember(role) {
    setMembers(prev => [...prev, {
      tempId: Date.now(),
      name: '', role,
      avatar: role === 'child' ? '😀' : '😎',
      color: MEMBER_COLORS[(prev.length + 2) % MEMBER_COLORS.length],
      pin: '',
    }])
  }

  function updateMember(tempId, field, value) {
    setMembers(prev => prev.map(m => m.tempId === tempId ? { ...m, [field]: value } : m))
  }

  function removeMember(tempId) {
    setMembers(prev => prev.filter(m => m.tempId !== tempId))
  }

  // ── Validering steg 1a ───────────────────────────────────────────────────────
  function handleStep1aNext() {
    setUsernameErr('')
    const u = username.trim().toLowerCase()
    if (!u || !familyName.trim()) return
    if (!/^[a-z0-9_-]+$/.test(u)) { setUsernameErr('Bara bokstäver, siffror, - och _'); return }
    setError('')
    setStep(2)
  }

  // ── Validering steg 1b ───────────────────────────────────────────────────────
  function handleStep1bNext() {
    if (!email.trim() || !password) return
    if (password !== password2) { setError('Lösenorden matchar inte'); return }
    if (password.length < 6)    { setError('Lösenordet måste vara minst 6 tecken'); return }
    setError('')
    setStep(3)
  }

  // ── Spara ────────────────────────────────────────────────────────────────────
  async function handleSave() {
    setSaving(true); setError('')
    try {
      const { error: signUpErr } = await supabase.auth.signUp({ email: email.trim(), password })
      if (signUpErr) throw signUpErr

      const { data: result, error: rpcErr } = await supabase
        .rpc('create_family_with_admin', {
          p_family_name:     familyName.trim(),
          p_family_username: username.trim().toLowerCase(),
          p_family_email:    email.trim(),
          p_admin_name:      adminName.trim() || 'Admin',
          p_admin_avatar:    adminAvatar,
          p_admin_color:     adminColor,
          p_admin_pin:       adminPin || null,
        })

      if (rpcErr) {
        if (rpcErr.message?.includes('username_taken')) {
          setError('Familjenamnet är redan taget, välj ett annat')
          setStep(1)
        } else {
          throw rpcErr
        }
        setSaving(false); return
      }

      const familyId = result.family_id

      if (members.length > 0) {
        const rows = members.map(m => ({
          family_id: familyId,
          name:      m.name.trim() || (m.role === 'child' ? 'Barn' : 'Förälder'),
          role:      m.role,
          avatar:    m.avatar,
          color:     m.color,
          pin_hash:  m.pin || null,
        }))
        const { error: memErr } = await supabase.from('family_members').insert(rows)
        if (memErr) throw memErr
      }

      setDone(true)
      setTimeout(() => onComplete(), 3000)
    } catch (err) {
      setError(err.message || 'Något gick fel')
      setSaving(false)
    }
  }

  // ── Klar-skärm ───────────────────────────────────────────────────────────────
  if (done) return (
    <div style={{ ...page, justifyContent: 'center', textAlign: 'center' }}>
      <BgShapes />
      <Confetti />
      <div style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
        <AppIcon size={96} />
        <div style={{ fontSize: 56 }}>🎉</div>
        <h1 style={{ fontSize: 28, fontWeight: 900, color: '#FF7A59', margin: 0, fontFamily: 'Nunito, sans-serif' }}>
          Välkommen, {familyName}!
        </h1>
        <p style={{ color: '#78716C', fontSize: 16, maxWidth: 300 }}>
          Er familj är skapad. Ni är redo att köra igång!
        </p>
        <p style={{ color: '#A8A29E', fontSize: 13 }}>Loggar in automatiskt...</p>
      </div>
    </div>
  )

  // ════════════════════════════════════════════════════════════════════════════
  // STEG 1a — Familjenamn + användarnamn
  // ════════════════════════════════════════════════════════════════════════════
  if (step === 1) return (
    <div style={page}>
      <BgShapes />
      <div style={{ position: 'relative', zIndex: 1, width: '100%', maxWidth: 400, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <AppIcon size={64} />
        <h1 style={{ fontSize: 26, fontWeight: 900, color: '#FF7A59', margin: '12px 0 4px', fontFamily: 'Nunito, sans-serif' }}>
          Skapa din familj
        </h1>
        <p style={{ color: '#78716C', fontSize: 13, margin: '0 0 24px', textAlign: 'center' }}>
          Steg 1 av 4 — Familjens namn
        </p>

        <div style={card}>
          <StepDots current={0} total={TOTAL} />

          <label style={lbl}>Familjens visningsnamn</label>
          <input
            style={inp}
            placeholder="T.ex. Familjen Johansson"
            value={familyName}
            onChange={e => setFamilyName(e.target.value)}
            autoFocus
          />

          <label style={{ ...lbl, marginTop: 16 }}>Inloggningsnamn</label>
          <input
            style={inp}
            placeholder="t.ex. familjjohansson"
            value={username}
            onChange={e => { setUsername(e.target.value.toLowerCase().replace(/\s/g, '')); setUsernameErr('') }}
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            onKeyDown={e => e.key === 'Enter' && handleStep1aNext()}
          />
          {usernameErr
            ? <p style={{ fontSize: 12, color: '#EF4444', margin: '4px 0 0' }}>{usernameErr}</p>
            : <p style={hint}>Används vid inloggning. Bara a-z, 0-9, - och _</p>
          }

          <ErrorBox msg={error} />

          <PrimaryBtn onClick={handleStep1aNext} disabled={!familyName.trim() || !username.trim()}>
            Nästa <ArrowRight size={18} />
          </PrimaryBtn>
        </div>
      </div>
    </div>
  )

  // ════════════════════════════════════════════════════════════════════════════
  // STEG 1b — E-post + lösenord
  // ════════════════════════════════════════════════════════════════════════════
  if (step === 2) return (
    <div style={page}>
      <BgShapes />
      <div style={{ position: 'relative', zIndex: 1, width: '100%', maxWidth: 400, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <AppIcon size={64} />
        <h1 style={{ fontSize: 26, fontWeight: 900, color: '#FF7A59', margin: '12px 0 4px', fontFamily: 'Nunito, sans-serif' }}>
          Kontoinformation
        </h1>
        <p style={{ color: '#78716C', fontSize: 13, margin: '0 0 24px', textAlign: 'center' }}>
          Steg 2 av 4 — E-post & lösenord
        </p>

        <div style={card}>
          <StepDots current={1} total={TOTAL} />

          <label style={lbl}>Din e-postadress</label>
          <input
            style={inp}
            type="email"
            placeholder="din@email.se"
            value={email}
            onChange={e => setEmail(e.target.value)}
            autoCapitalize="none"
            autoFocus
          />
          <p style={hint}>Används för lösenordsåterställning, syns inte i appen</p>

          <label style={{ ...lbl, marginTop: 16 }}>Lösenord</label>
          <div style={{ position: 'relative' }}>
            <input
              style={{ ...inp, paddingRight: 48 }}
              type={showPass ? 'text' : 'password'}
              placeholder="Minst 6 tecken"
              value={password}
              onChange={e => setPassword(e.target.value)}
            />
            <button onClick={() => setShowPass(s => !s)} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', fontSize: 18 }}>
              {showPass ? '🙈' : '👁️'}
            </button>
          </div>

          <label style={{ ...lbl, marginTop: 16 }}>Bekräfta lösenord</label>
          <input
            style={inp}
            type="password"
            placeholder="Upprepa lösenordet"
            value={password2}
            onChange={e => setPassword2(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleStep1bNext()}
          />

          <ErrorBox msg={error} />

          <PrimaryBtn onClick={handleStep1bNext} disabled={!email.trim() || !password || !password2}>
            Nästa <ArrowRight size={18} />
          </PrimaryBtn>
          <SecondaryBtn onClick={() => { setError(''); setStep(1) }}>
            <ArrowLeft size={16} /> Tillbaka
          </SecondaryBtn>
        </div>
      </div>
    </div>
  )

  // ════════════════════════════════════════════════════════════════════════════
  // STEG 2 — Om dig (admin)
  // ════════════════════════════════════════════════════════════════════════════
  if (step === 3) return (
    <div style={page}>
      <BgShapes />
      <div style={{ position: 'relative', zIndex: 1, width: '100%', maxWidth: 400, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <AppIcon size={64} />
        <h1 style={{ fontSize: 26, fontWeight: 900, color: '#FF7A59', margin: '12px 0 4px', fontFamily: 'Nunito, sans-serif' }}>
          Om dig
        </h1>
        <p style={{ color: '#78716C', fontSize: 13, margin: '0 0 24px', textAlign: 'center' }}>
          Steg 3 av 4 — Din profil
        </p>

        <div style={card}>
          <StepDots current={2} total={TOTAL} />

          <label style={lbl}>Ditt namn</label>
          <input
            style={inp}
            placeholder="T.ex. Joacim"
            value={adminName}
            onChange={e => setAdminName(e.target.value)}
            autoFocus
          />

          <label style={{ ...lbl, marginTop: 16 }}>Din PIN (4 siffror)</label>
          <input
            style={{ ...inp, letterSpacing: 12, textAlign: 'center', fontFamily: 'monospace', fontSize: 22 }}
            type="text"
            inputMode="numeric"
            maxLength={4}
            placeholder="- - - -"
            value={adminPin}
            onChange={e => setAdminPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
          />
          <p style={hint}>Du kan ändra PIN-koden i inställningar senare</p>

          <label style={{ ...lbl, marginTop: 16 }}>Din avatar</label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {AVATARS.map(a => (
              <button
                key={a}
                onClick={() => setAdminAvatar(a)}
                style={{
                  fontSize: 28,
                  background: adminAvatar === a ? '#FFE8C2' : 'transparent',
                  border: adminAvatar === a ? '2px solid #FF7A59' : '2px solid transparent',
                  borderRadius: 10, padding: 6, cursor: 'pointer',
                }}
              >{a}</button>
            ))}
          </div>

          <label style={{ ...lbl, marginTop: 16 }}>Din färg</label>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {MEMBER_COLORS.map(c => (
              <button
                key={c}
                onClick={() => setAdminColor(c)}
                style={{
                  width: 32, height: 32, borderRadius: 16, background: c, cursor: 'pointer', padding: 0,
                  border: adminColor === c ? '3px solid #1C1917' : '3px solid transparent',
                }}
              />
            ))}
          </div>

          <PrimaryBtn onClick={() => setStep(4)} disabled={!adminName.trim()}>
            Nästa <ArrowRight size={18} />
          </PrimaryBtn>
          <SecondaryBtn onClick={() => setStep(2)}>
            <ArrowLeft size={16} /> Tillbaka
          </SecondaryBtn>
        </div>
      </div>
    </div>
  )

  // ════════════════════════════════════════════════════════════════════════════
  // STEG 3 — Resten av familjen
  // ════════════════════════════════════════════════════════════════════════════
  return (
    <div style={page}>
      <BgShapes />
      <div style={{ position: 'relative', zIndex: 1, width: '100%', maxWidth: 400, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <AppIcon size={64} />
        <h1 style={{ fontSize: 26, fontWeight: 900, color: '#FF7A59', margin: '12px 0 4px', fontFamily: 'Nunito, sans-serif' }}>
          Resten av familjen
        </h1>
        <p style={{ color: '#78716C', fontSize: 13, margin: '0 0 24px', textAlign: 'center' }}>
          Steg 4 av 4 — Lägg till fler medlemmar
        </p>

        <div style={card}>
          <StepDots current={3} total={TOTAL} />

          <p style={{ fontSize: 14, color: '#78716C', margin: '0 0 16px' }}>
            <strong style={{ color: '#1C1917' }}>{adminName}</strong> är redan med som förälder. Lägg till resten — du kan också göra det senare i appen.
          </p>

          {members.map(m => (
            <div key={m.tempId} style={{ background: '#F9FAFB', borderRadius: 16, padding: 16, marginBottom: 12, border: '1.5px solid #E5E7EB' }}>
              {/* Namn + ta bort */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                <div style={{ fontSize: 32 }}>{m.avatar}</div>
                <input
                  type="text"
                  placeholder={m.role === 'child' ? 'Barnets namn' : 'Förälders namn'}
                  value={m.name}
                  onChange={e => updateMember(m.tempId, 'name', e.target.value)}
                  style={{ flex: 1, padding: '10px 12px', borderRadius: 10, border: '2px solid #E5E7EB', fontSize: 15, fontFamily: 'Nunito, sans-serif', outline: 'none', background: '#fff' }}
                />
                <button onClick={() => removeMember(m.tempId)} style={{ background: '#FEF2F2', border: 'none', borderRadius: 10, padding: 10, cursor: 'pointer' }}>
                  <Trash2 size={16} color="#EF4444" />
                </button>
              </div>

              {/* Roll-badge */}
              <span style={{
                display: 'inline-block', padding: '4px 12px', borderRadius: 8, fontSize: 12, fontWeight: 700,
                background: m.role === 'child' ? '#FFFBEB' : '#E1F5F3',
                color:      m.role === 'child' ? '#F59E0B'  : '#3CB4A6',
              }}>
                {m.role === 'child' ? '🧒 Barn' : '👤 Förälder'}
              </span>

              {/* PIN */}
              <input
                type="text"
                inputMode="numeric"
                maxLength={4}
                placeholder="4-siffrig PIN"
                value={m.pin}
                onChange={e => updateMember(m.tempId, 'pin', e.target.value.replace(/\D/g, '').slice(0, 4))}
                style={{ display: 'block', marginTop: 10, padding: '10px 14px', borderRadius: 10, border: '2px solid #E5E7EB', fontSize: 20, fontFamily: 'monospace', letterSpacing: 8, textAlign: 'center', width: 150, outline: 'none', boxSizing: 'border-box', background: '#fff' }}
              />

              {/* Avatar-väljare */}
              <label style={{ ...lbl, marginTop: 12 }}>Avatar</label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {AVATARS.map(a => (
                  <button
                    key={a}
                    onClick={() => updateMember(m.tempId, 'avatar', a)}
                    style={{
                      fontSize: 22,
                      background: m.avatar === a ? '#FFE8C2' : 'transparent',
                      border: m.avatar === a ? '2px solid #FF7A59' : '2px solid transparent',
                      borderRadius: 8, padding: 4, cursor: 'pointer',
                    }}
                  >{a}</button>
                ))}
              </div>

              {/* Färg */}
              <label style={{ ...lbl, marginTop: 12 }}>Färg</label>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {MEMBER_COLORS.map(c => (
                  <button
                    key={c}
                    onClick={() => updateMember(m.tempId, 'color', c)}
                    style={{ width: 28, height: 28, borderRadius: 14, background: c, cursor: 'pointer', padding: 0, border: m.color === c ? '3px solid #1C1917' : '3px solid transparent' }}
                  />
                ))}
              </div>
            </div>
          ))}

          {/* Lägg till-knappar */}
          <div style={{ display: 'flex', gap: 10, marginTop: 4, marginBottom: 4 }}>
            <button onClick={() => addMember('child')} style={{ flex: 1, padding: '12px 8px', borderRadius: 12, background: '#FFE8C2', color: '#FF7A59', border: 'none', fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
              <Plus size={16} /> Lägg till barn
            </button>
            <button onClick={() => addMember('parent')} style={{ flex: 1, padding: '12px 8px', borderRadius: 12, background: '#E1F5F3', color: '#3CB4A6', border: 'none', fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
              <Plus size={16} /> Lägg till förälder
            </button>
          </div>

          <ErrorBox msg={error} />

          <PrimaryBtn onClick={handleSave} disabled={saving}>
            {saving ? 'Sparar...' : <><span>Skapa familjen! 🎉</span></>}
          </PrimaryBtn>
          <SecondaryBtn onClick={() => setStep(3)}>
            <ArrowLeft size={16} /> Tillbaka
          </SecondaryBtn>
        </div>
      </div>
    </div>
  )
}
