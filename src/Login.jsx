import { useState, useEffect } from 'react'
import { supabase } from './supabaseClient'

const C = {
  primary:        '#FF7A59',
  primaryLight:   '#FFE8C2',
  secondary:      '#3CB4A6',
  secondaryLight: '#E1F5F3',
  mint:           '#A8E6DF',
  peach:          '#FFA071',
  bg:             '#FFFBF5',
  card:           '#FFFFFF',
  text:           '#1C1917',
  muted:          '#78716C',
  border:         '#E5E7EB',
  danger:         '#EF4444',
}

// ─── Bakgrundsformer ──────────────────────────────────────────────────────────
function BgShapes() {
  return (
    <svg style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', opacity: 0.18, pointerEvents: 'none' }}
      viewBox="0 0 400 800" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid slice">
      <path d="M -40 -30 Q 100 -60, 180 80 Q 230 180, 120 240 Q 20 290, -30 180 Q -80 80, -40 -30 Z" fill="#3CB4A6" />
      <path d="M 200 -40 Q 360 -20, 420 130 Q 460 240, 340 290 Q 230 330, 185 220 Q 140 120, 200 -40 Z" fill="#A8E6DF" />
      <path d="M 240 580 Q 420 530, 450 670 Q 465 760, 320 780 Q 180 795, 155 690 Q 135 600, 240 580 Z" fill="#FF7A59" />
      <path d="M -60 640 Q 40 580, 130 650 Q 195 710, 145 790 Q 80 840, -20 800 Q -100 765, -60 640 Z" fill="#FFA071" />
    </svg>
  )
}

// ─── App-ikon (inline SVG) ────────────────────────────────────────────────────
function AppIcon({ size = 88 }) {
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

// ─── Gemensamma styles ────────────────────────────────────────────────────────
const screen = {
  minHeight: '100dvh',
  background: C.bg,
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'flex-start',
  overflowY: 'auto',
  padding: '48px 24px 40px',
  position: 'relative',
}

const inputStyle = {
  width: '100%',
  padding: '13px 16px',
  borderRadius: 12,
  border: `2px solid ${C.border}`,
  fontSize: 16,
  boxSizing: 'border-box',
  outline: 'none',
  fontFamily: 'Nunito, sans-serif',
  background: '#F9FAFB',
  color: C.text,
}

const labelStyle = {
  display: 'block',
  fontSize: 13,
  fontWeight: 700,
  color: '#374151',
  marginBottom: 6,
}

function PrimaryBtn({ onClick, disabled, children }) {
  return (
    <button onClick={onClick} disabled={disabled} style={{
      width: '100%', padding: 15, marginTop: 16, borderRadius: 14,
      background: disabled ? '#D1D5DB' : C.primary,
      color: '#fff', border: 'none', fontSize: 16, fontWeight: 800,
      cursor: disabled ? 'not-allowed' : 'pointer', fontFamily: 'inherit',
    }}>
      {children}
    </button>
  )
}

// ─── Feature-kort ─────────────────────────────────────────────────────────────
const FEATURES = [
  { emoji: '✅', bg: '#E1F5F3', title: 'Sysslor & belöningar',  desc: 'Gamifierade uppgifter med streaks och firande' },
  { emoji: '💰', bg: '#FFE8C2', title: 'Veckopeng & sparande',  desc: 'Spara, spendera och sätta sparmål' },
  { emoji: '🗓️', bg: '#F5F3FF', title: 'Schema & kalender',     desc: 'Lektioner, läxor och familjeaktiviteter' },
]

function FeatureCards() {
  return (
    <div style={{ width: '100%', marginTop: 24 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
        <div style={{ flex: 1, height: 1, background: 'rgba(0,0,0,0.08)' }} />
        <span style={{ fontSize: 10, color: C.muted, fontWeight: 700, letterSpacing: '0.1em' }}>ALLT DIN FAMILJ BEHÖVER</span>
        <div style={{ flex: 1, height: 1, background: 'rgba(0,0,0,0.08)' }} />
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {FEATURES.map(f => (
          <div key={f.title} style={{ background: C.card, borderRadius: 16, padding: '13px 16px', display: 'flex', alignItems: 'center', gap: 14, boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
            <div style={{ width: 42, height: 42, borderRadius: 12, background: f.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, flexShrink: 0 }}>
              {f.emoji}
            </div>
            <div>
              <div style={{ fontSize: 14, fontWeight: 800, color: C.text, marginBottom: 2 }}>{f.title}</div>
              <div style={{ fontSize: 12, color: C.muted }}>{f.desc}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Steg 1: Familjenamn + lösenord ──────────────────────────────────────────
function StepLogin({ onSuccess, onRegister }) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [err,      setErr]      = useState('')
  const [loading,  setLoading]  = useState(false)

  async function handleLogin() {
    if (!username.trim() || !password) return
    setLoading(true); setErr('')

    const { data: rows, error: lookupErr } = await supabase
      .rpc('get_family_by_username', { p_username: username.trim().toLowerCase() })

    if (lookupErr || !rows?.length) {
      setErr('Familjenamnet hittades inte')
      setLoading(false); return
    }

    const { auth_email, family_id } = rows[0]
    const { error: authErr } = await supabase.auth.signInWithPassword({ email: auth_email, password })

    if (authErr) {
      setErr('Fel lösenord, försök igen')
      setLoading(false); return
    }

    const [membersRes, famRes] = await Promise.all([
      supabase.from('family_members')
        .select('id, name, avatar, role, color, pin_hash')
        .eq('family_id', family_id)
        .order('created_at'),
      supabase.from('families').select('name').eq('id', family_id).single(),
    ])

    setLoading(false)
    onSuccess({ members: membersRes.data || [], familyId: family_id, familyName: famRes.data?.name || '' })
  }

  return (
    <div style={screen}>
      <BgShapes />
      <div style={{ position: 'relative', width: '100%', maxWidth: 380, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>

        <AppIcon size={88} />
        <h1 style={{ fontSize: 30, fontWeight: 900, margin: '10px 0 2px', fontFamily: 'Nunito, sans-serif', color: C.primary }}>
          Fam<span style={{ color: C.secondary }}>Tastic</span>
        </h1>
        <p style={{ color: C.muted, margin: '0 0 24px', fontSize: 12, letterSpacing: '0.15em', fontWeight: 600 }}>VARDAG · TILLSAMMANS</p>

        <div style={{ background: C.card, borderRadius: 24, padding: 24, width: '100%', boxShadow: '0 4px 24px rgba(0,0,0,0.09)', boxSizing: 'border-box' }}>
          <h2 style={{ margin: '0 0 20px', fontSize: 20, fontWeight: 800, color: C.text, fontFamily: 'inherit' }}>Logga in</h2>

          <label style={labelStyle}>Familjenamn</label>
          <input
            style={inputStyle}
            placeholder="t.ex. familjjohansson"
            value={username}
            onChange={e => setUsername(e.target.value)}
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            onKeyDown={e => e.key === 'Enter' && handleLogin()}
          />

          <label style={{ ...labelStyle, marginTop: 16 }}>Lösenord</label>
          <div style={{ position: 'relative' }}>
            <input
              style={{ ...inputStyle, paddingRight: 48 }}
              type={showPass ? 'text' : 'password'}
              placeholder="Ditt lösenord"
              value={password}
              onChange={e => setPassword(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleLogin()}
            />
            <button
              onClick={() => setShowPass(s => !s)}
              style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', fontSize: 20, lineHeight: 1 }}
            >
              {showPass ? '🙈' : '👁️'}
            </button>
          </div>

          {err && <p style={{ color: C.danger, margin: '10px 0 0', fontSize: 14, fontWeight: 600 }}>{err}</p>}

          <PrimaryBtn onClick={handleLogin} disabled={loading || !username.trim() || !password}>
            {loading ? 'Loggar in...' : 'Logga in →'}
          </PrimaryBtn>
        </div>

        <button
          onClick={onRegister}
          style={{ marginTop: 18, background: 'none', border: 'none', color: C.primary, fontSize: 15, cursor: 'pointer', fontWeight: 700 }}
        >
          Ny familj? Skapa konto
        </button>

        <FeatureCards />
      </div>
    </div>
  )
}

// ─── Steg 2: Välj vem du är ───────────────────────────────────────────────────
function StepMember({ members, familyName, onSelect }) {
  return (
    <div style={screen}>
      <BgShapes />
      <div style={{ position: 'relative', width: '100%', maxWidth: 380, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>

        <AppIcon size={56} />
        <h2 style={{ fontSize: 26, fontWeight: 900, color: C.text, margin: '14px 0 4px', fontFamily: 'Nunito, sans-serif' }}>Vem är du?</h2>
        {familyName && <p style={{ color: C.muted, margin: '0 0 28px', fontSize: 15 }}>{familyName}</p>}

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 14, width: '100%' }}>
          {members.map(m => (
            <button
              key={m.id}
              onClick={() => onSelect(m)}
              style={{
                background: C.card,
                border: `2px solid ${C.border}`,
                borderRadius: 22,
                padding: '20px 12px',
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 8,
                boxShadow: '0 2px 10px rgba(0,0,0,0.06)',
              }}
            >
              <div style={{ width: 62, height: 62, borderRadius: '50%', background: m.color ? `${m.color}22` : C.primaryLight, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 34 }}>
                {m.avatar || '👤'}
              </div>
              <span style={{ fontWeight: 800, fontSize: 16, color: C.text, fontFamily: 'Nunito, sans-serif' }}>{m.name}</span>
              {(m.role === 'admin' || m.role === 'parent') && (
                <span style={{ fontSize: 11, color: C.secondary, background: C.secondaryLight, borderRadius: 8, padding: '3px 10px', fontWeight: 700 }}>Förälder</span>
              )}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

// ─── Steg 3: PIN ──────────────────────────────────────────────────────────────
function StepPin({ member, onBack, onSuccess }) {
  const [pin,     setPin]     = useState('')
  const [err,     setErr]     = useState('')
  const [loading, setLoading] = useState(false)
  const numpad = ['1','2','3','4','5','6','7','8','9','','0','⌫']

  async function handleDigit(digit) {
    if (pin.length >= 4 || loading) return
    const next = pin + digit
    setPin(next)
    if (next.length === 4) await verify(next)
  }

  function handleDelete() {
    setPin(p => p.slice(0, -1))
    setErr('')
  }

  async function verify(entered) {
    setLoading(true); setErr('')
    const { data, error } = await supabase
      .rpc('verify_member_pin', { p_member_id: member.id, p_pin: entered })

    if (error || !data) {
      setErr('Fel PIN, försök igen')
      setPin('')
      setLoading(false); return
    }
    onSuccess(member)
  }

  return (
    <div style={{ ...screen, justifyContent: 'center' }}>
      <BgShapes />
      <div style={{ position: 'relative', width: '100%', maxWidth: 320, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>

        <button
          onClick={onBack}
          style={{ alignSelf: 'flex-start', background: 'none', border: 'none', color: C.primary, fontSize: 15, cursor: 'pointer', fontWeight: 700, marginBottom: 20 }}
        >
          ← Tillbaka
        </button>

        <div style={{ width: 80, height: 80, borderRadius: '50%', background: member.color ? `${member.color}22` : C.primaryLight, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 44, marginBottom: 12 }}>
          {member.avatar || '👤'}
        </div>
        <h2 style={{ fontSize: 24, fontWeight: 900, color: C.text, margin: '0 0 4px', fontFamily: 'Nunito, sans-serif' }}>Hej {member.name}!</h2>
        <p style={{ color: C.muted, margin: '0 0 24px', fontSize: 15 }}>Ange din PIN</p>

        <div style={{ display: 'flex', gap: 18, marginBottom: 24 }}>
          {[0,1,2,3].map(i => (
            <div key={i} style={{
              width: 20, height: 20, borderRadius: '50%',
              background: pin.length > i ? C.primary : 'transparent',
              border: `2.5px solid ${pin.length > i ? C.primary : C.border}`,
              transition: 'all 0.15s',
            }} />
          ))}
        </div>

        {err && <p style={{ color: C.danger, marginBottom: 14, fontSize: 14, fontWeight: 600 }}>{err}</p>}

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, width: '100%', maxWidth: 280 }}>
          {numpad.map((k, i) => (
            <button
              key={i}
              disabled={k === '' || loading}
              onClick={() => k === '⌫' ? handleDelete() : handleDigit(k)}
              style={{
                height: 72, borderRadius: 18,
                background: k === '' ? 'transparent' : C.card,
                border: k === '' ? 'none' : `2px solid ${C.border}`,
                fontSize: k === '⌫' ? 24 : 28,
                fontWeight: 700,
                color: C.text,
                cursor: k === '' ? 'default' : 'pointer',
                visibility: k === '' ? 'hidden' : 'visible',
                fontFamily: 'Nunito, sans-serif',
                boxShadow: k === '' ? 'none' : '0 2px 6px rgba(0,0,0,0.06)',
              }}
            >
              {k}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

// ─── Huvud-export ─────────────────────────────────────────────────────────────
export function Login({ onLogin, onRegister, existingSession }) {
  const [step,       setStep]       = useState('login')
  const [members,    setMembers]    = useState([])
  const [familyId,   setFamilyId]   = useState(null)
  const [familyName, setFamilyName] = useState('')
  const [selected,   setSelected]   = useState(null)
  const [loading,    setLoading]    = useState(false)

  useEffect(() => {
    if (!existingSession) return
    setLoading(true)
    async function load() {
      const { data: myMember } = await supabase
        .from('family_members')
        .select('family_id')
        .eq('auth_user_id', existingSession.user.id)
        .single()

      if (!myMember) { setLoading(false); return }

      const [membersRes, famRes] = await Promise.all([
        supabase.from('family_members')
          .select('id, name, avatar, role, color, pin_hash')
          .eq('family_id', myMember.family_id)
          .order('created_at'),
        supabase.from('families').select('name').eq('id', myMember.family_id).single(),
      ])

      setMembers(membersRes.data || [])
      setFamilyId(myMember.family_id)
      setFamilyName(famRes.data?.name || '')
      setStep('member')
      setLoading(false)
    }
    load()
  }, [existingSession])

  if (loading) return (
    <div style={{ ...screen, justifyContent: 'center', gap: 16 }}>
      <BgShapes />
      <AppIcon size={72} />
      <p style={{ color: C.muted, fontSize: 16, position: 'relative' }}>Laddar...</p>
    </div>
  )

  if (step === 'login') return (
    <StepLogin
      onSuccess={({ members, familyId, familyName }) => {
        setMembers(members); setFamilyId(familyId); setFamilyName(familyName)
        setStep('member')
      }}
      onRegister={onRegister}
    />
  )

  if (step === 'member') return (
    <StepMember
      members={members}
      familyName={familyName}
      onSelect={m => { setSelected(m); setStep('pin') }}
    />
  )

  return (
    <StepPin
      member={selected}
      onBack={() => { setSelected(null); setStep('member') }}
      onSuccess={member => onLogin({ ...member, family_id: familyId })}
    />
  )
}
