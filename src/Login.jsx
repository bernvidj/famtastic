import { useState, useEffect } from 'react'
import { supabase } from './supabaseClient'

const C = {
  primary:   '#F97316',
  secondary: '#14B8A6',
  bg:        '#FFFBF5',
  card:      '#FFFFFF',
  text:      '#1F2937',
  muted:     '#6B7280',
  border:    '#E5E7EB',
  danger:    '#EF4444',
}

const label  = { display: 'block', fontSize: 14, fontWeight: 600, color: '#374151', marginBottom: 6 }
const input  = { width: '100%', padding: '14px 16px', borderRadius: 12, border: `2px solid ${C.border}`, fontSize: 16, boxSizing: 'border-box', outline: 'none', fontFamily: 'Nunito, sans-serif', background: '#fff' }
const screen = { minHeight: '100dvh', background: C.bg, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 24 }

function PrimaryBtn({ onClick, disabled, children }) {
  return (
    <button onClick={onClick} disabled={disabled} style={{
      width: '100%', padding: 16, marginTop: 24, borderRadius: 14,
      background: disabled ? '#D1D5DB' : C.primary,
      color: '#fff', border: 'none', fontSize: 17, fontWeight: 700,
      cursor: disabled ? 'not-allowed' : 'pointer', fontFamily: 'inherit',
    }}>
      {children}
    </button>
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

    // Ladda familjemedlemmar + familjenamn parallellt
    const [membersRes, famRes] = await Promise.all([
      supabase.from('family_members')
        .select('id, name, avatar, role, color, pin_hash')
        .eq('family_id', family_id)
        .order('created_at'),
      supabase.from('families').select('name').eq('id', family_id).single(),
    ])

    setLoading(false)
    onSuccess({
      members:    membersRes.data || [],
      familyId:   family_id,
      familyName: famRes.data?.name || '',
    })
  }

  return (
    <div style={screen}>
      {/* Logo */}
      <div style={{ textAlign: 'center', marginBottom: 36 }}>
        <div style={{ fontSize: 64, marginBottom: 8 }}>🏠</div>
        <h1 style={{ fontSize: 34, fontWeight: 900, color: C.primary, margin: 0, fontFamily: 'Nunito, sans-serif' }}>FamTastic</h1>
        <p style={{ color: C.muted, margin: '6px 0 0', fontSize: 16 }}>Din familjeapp</p>
      </div>

      {/* Kort */}
      <div style={{ background: C.card, borderRadius: 24, padding: 28, width: '100%', maxWidth: 380, boxShadow: '0 4px 24px rgba(0,0,0,0.09)' }}>
        <h2 style={{ margin: '0 0 22px', fontSize: 22, fontWeight: 800, color: C.text, fontFamily: 'inherit' }}>Logga in</h2>

        <label style={label}>Familjenamn</label>
        <input
          style={input}
          placeholder="t.ex. familjjohansson"
          value={username}
          onChange={e => setUsername(e.target.value)}
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          onKeyDown={e => e.key === 'Enter' && handleLogin()}
        />

        <label style={{ ...label, marginTop: 18 }}>Lösenord</label>
        <div style={{ position: 'relative' }}>
          <input
            style={{ ...input, paddingRight: 48 }}
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

        {err && <p style={{ color: C.danger, margin: '12px 0 0', fontSize: 14, fontWeight: 600 }}>{err}</p>}

        <PrimaryBtn onClick={handleLogin} disabled={loading || !username.trim() || !password}>
          {loading ? 'Loggar in...' : 'Logga in →'}
        </PrimaryBtn>
      </div>

      <button
        onClick={onRegister}
        style={{ marginTop: 22, background: 'none', border: 'none', color: C.primary, fontSize: 16, cursor: 'pointer', fontWeight: 700 }}
      >
        Ny familj? Skapa konto
      </button>
    </div>
  )
}

// ─── Steg 2: Välj vem du är ───────────────────────────────────────────────────
function StepMember({ members, familyName, onSelect }) {
  return (
    <div style={screen}>
      <div style={{ textAlign: 'center', marginBottom: 32 }}>
        <div style={{ fontSize: 52, marginBottom: 10 }}>👋</div>
        <h2 style={{ fontSize: 28, fontWeight: 900, color: C.text, margin: 0, fontFamily: 'Nunito, sans-serif' }}>Vem är du?</h2>
        {familyName && <p style={{ color: C.muted, margin: '6px 0 0', fontSize: 16 }}>{familyName}</p>}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16, width: '100%', maxWidth: 360 }}>
        {members.map(m => (
          <button
            key={m.id}
            onClick={() => onSelect(m)}
            style={{
              background: C.card,
              border: `2.5px solid ${C.border}`,
              borderRadius: 22,
              padding: '22px 16px',
              cursor: 'pointer',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 10,
            }}
          >
            <span style={{ fontSize: 54, lineHeight: 1 }}>{m.avatar || '👤'}</span>
            <span style={{ fontWeight: 800, fontSize: 17, color: C.text, fontFamily: 'Nunito, sans-serif' }}>{m.name}</span>
            {(m.role === 'admin' || m.role === 'parent') && (
              <span style={{ fontSize: 11, color: C.muted, background: '#F3F4F6', borderRadius: 8, padding: '3px 9px', fontWeight: 600 }}>Förälder</span>
            )}
          </button>
        ))}
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
    <div style={screen}>
      <button
        onClick={onBack}
        style={{ alignSelf: 'flex-start', background: 'none', border: 'none', color: C.primary, fontSize: 16, cursor: 'pointer', fontWeight: 700, marginBottom: 12 }}
      >
        ← Tillbaka
      </button>

      <div style={{ textAlign: 'center', marginBottom: 28 }}>
        <div style={{ fontSize: 68, marginBottom: 10, lineHeight: 1 }}>{member.avatar || '👤'}</div>
        <h2 style={{ fontSize: 26, fontWeight: 900, color: C.text, margin: 0, fontFamily: 'Nunito, sans-serif' }}>Hej {member.name}!</h2>
        <p style={{ color: C.muted, margin: '6px 0 0', fontSize: 16 }}>Ange din PIN</p>
      </div>

      {/* 4 prickar */}
      <div style={{ display: 'flex', gap: 18, marginBottom: 28 }}>
        {[0,1,2,3].map(i => (
          <div key={i} style={{
            width: 22, height: 22, borderRadius: '50%',
            background:  pin.length > i ? C.primary : 'transparent',
            border:      `2.5px solid ${pin.length > i ? C.primary : C.border}`,
            transition:  'all 0.15s',
          }} />
        ))}
      </div>

      {err && <p style={{ color: C.danger, marginBottom: 16, fontSize: 15, fontWeight: 600 }}>{err}</p>}

      {/* Numpad */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, width: '100%', maxWidth: 290 }}>
        {numpad.map((k, i) => (
          <button
            key={i}
            disabled={k === '' || loading}
            onClick={() => k === '⌫' ? handleDelete() : handleDigit(k)}
            style={{
              height: 74, borderRadius: 18,
              background:  k === '' ? 'transparent' : C.card,
              border:      k === '' ? 'none' : `2px solid ${C.border}`,
              fontSize:    k === '⌫' ? 26 : 30,
              fontWeight:  700,
              color:       C.text,
              cursor:      k === '' ? 'default' : 'pointer',
              visibility:  k === '' ? 'hidden' : 'visible',
              fontFamily:  'Nunito, sans-serif',
            }}
          >
            {k}
          </button>
        ))}
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

  // Redan inloggad (session finns) → hoppa direkt till memberväljare
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
    <div style={{ ...screen, gap: 16 }}>
      <div style={{ fontSize: 48 }}>🏠</div>
      <p style={{ color: C.muted, fontSize: 16 }}>Laddar...</p>
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
