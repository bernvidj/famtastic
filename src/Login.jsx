// ============================================
// FamTastic — Login (parent magic link + child PIN)
// ============================================

import React, { useState, useEffect } from 'react';
import { Home, Mail, ArrowRight, CheckCircle, AlertCircle, ArrowLeft, KeyRound } from 'lucide-react';
import { supabase } from './supabaseClient';
import { C, F, S } from './data';

export function Login({ onChildLogin }) {
  const [mode, setMode] = useState('choose'); // choose | parent | child-family | child-pick | child-pin
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState('idle');
  const [errorMsg, setErrorMsg] = useState('');

  // Child login state
  const [families, setFamilies] = useState([]);
  const [selectedFamily, setSelectedFamily] = useState(null);
  const [children, setChildren] = useState([]);
  const [selectedChild, setSelectedChild] = useState(null);
  const [pin, setPin] = useState('');
  const [pinError, setPinError] = useState('');
  const [verifying, setVerifying] = useState(false);

  // Load families for child login
  async function loadFamilies() {
    const { data } = await supabase.rpc('get_families_public');
    setFamilies(data || []);
  }

  async function loadChildren(familyId) {
    const { data } = await supabase.rpc('get_family_children', { p_family_id: familyId });
    setChildren(data || []);
  }

  function selectFamily(family) {
    setSelectedFamily(family);
    loadChildren(family.id);
    setMode('child-pick');
  }

  function selectChild(child) {
    setSelectedChild(child);
    setPin('');
    setPinError('');
    setMode('child-pin');
  }

  async function verifyPin() {
    if (pin.length !== 4) return;
    setVerifying(true);
    setPinError('');

    try {
      const { data, error } = await supabase.rpc('verify_child_pin', {
        p_family_id: selectedFamily.id,
        p_member_id: selectedChild.id,
        p_pin: pin,
      });

      if (error) throw error;
      onChildLogin(data);
    } catch (err) {
      setPinError(err.message === 'Wrong PIN' ? 'Fel PIN — försök igen' : 'Något gick fel');
      setPin('');
    }
    setVerifying(false);
  }

  // Parent magic link
  async function handleParentSubmit(e) {
    e.preventDefault();
    if (!email.trim()) return;
    setStatus('loading');
    setErrorMsg('');

    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: { emailRedirectTo: window.location.origin },
    });

    if (error) {
      setStatus('error');
      setErrorMsg(error.message);
    } else {
      setStatus('sent');
    }
  }

  // --- CHOOSE MODE ---
  if (mode === 'choose') {
    return (
      <div style={styles.page}>
        <div style={styles.container}>
          <div style={styles.logoWrap}>
            <div style={styles.logoIcon}><Home size={36} color="#fff" /></div>
            <h1 style={styles.logoText}>FamTastic</h1>
            <p style={styles.tagline}>Familjens samlingsplats</p>
          </div>

          <div style={styles.card}>
            <h2 style={styles.cardTitle}>Vem loggar in?</h2>

            <button onClick={() => setMode('parent')} style={styles.choiceBtn}>
              <div style={{ ...styles.choiceIcon, background: C.primaryLight }}>
                <Mail size={24} color={C.primary} />
              </div>
              <div style={styles.choiceContent}>
                <span style={styles.choiceTitle}>Förälder</span>
                <span style={styles.choiceDesc}>Logga in med e-post</span>
              </div>
              <ArrowRight size={18} color={C.textMuted} />
            </button>

            <button onClick={() => { setMode('child-family'); loadFamilies(); }} style={styles.choiceBtn}>
              <div style={{ ...styles.choiceIcon, background: C.accentLight }}>
                <KeyRound size={24} color={C.warning} />
              </div>
              <div style={styles.choiceContent}>
                <span style={styles.choiceTitle}>Barn</span>
                <span style={styles.choiceDesc}>Logga in med PIN-kod</span>
              </div>
              <ArrowRight size={18} color={C.textMuted} />
            </button>
          </div>
        </div>
      </div>
    );
  }

  // --- PARENT LOGIN ---
  if (mode === 'parent') {
    return (
      <div style={styles.page}>
        <div style={styles.container}>
          <div style={styles.logoWrap}>
            <div style={styles.logoIcon}><Home size={36} color="#fff" /></div>
            <h1 style={styles.logoText}>FamTastic</h1>
          </div>

          <div style={styles.card}>
            {status === 'sent' ? (
              <div style={styles.sentWrap}>
                <CheckCircle size={48} color={C.success} />
                <h2 style={styles.sentTitle}>Kolla din mejl!</h2>
                <p style={styles.sentText}>
                  Vi har skickat en inloggningslänk till <strong>{email}</strong>.
                </p>
                <button style={{ ...S.button, ...S.buttonSecondary, marginTop: 16 }}
                  onClick={() => { setStatus('idle'); setEmail(''); }}>
                  Tillbaka
                </button>
              </div>
            ) : (
              <>
                <button onClick={() => setMode('choose')} style={styles.backLink}>
                  <ArrowLeft size={16} /> Tillbaka
                </button>
                <h2 style={styles.cardTitle}>Förälder-login</h2>
                <p style={styles.cardDesc}>Ange din e-postadress så skickar vi en magisk länk.</p>

                <form onSubmit={handleParentSubmit}>
                  <div style={styles.inputWrap}>
                    <Mail size={20} color={C.textMuted} style={styles.inputIcon} />
                    <input type="email" placeholder="din@mejl.se" value={email}
                      onChange={e => setEmail(e.target.value)} style={styles.input}
                      autoComplete="email" autoFocus />
                  </div>

                  {status === 'error' && (
                    <div style={styles.errorBox}>
                      <AlertCircle size={16} color={C.error} />
                      <span>{errorMsg || 'Något gick fel.'}</span>
                    </div>
                  )}

                  <button type="submit" disabled={status === 'loading' || !email.trim()}
                    style={{ ...S.button, ...S.buttonPrimary, width: '100%', marginTop: 16,
                      opacity: (status === 'loading' || !email.trim()) ? 0.6 : 1 }}>
                    {status === 'loading' ? 'Skickar...' : (<>Skicka inloggningslänk <ArrowRight size={18} /></>)}
                  </button>
                </form>
              </>
            )}
          </div>
        </div>
      </div>
    );
  }

  // --- CHILD: Pick family ---
  if (mode === 'child-family') {
    return (
      <div style={styles.page}>
        <div style={styles.container}>
          <div style={styles.logoWrap}>
            <div style={styles.logoIcon}><Home size={36} color="#fff" /></div>
            <h1 style={styles.logoText}>FamTastic</h1>
          </div>

          <div style={styles.card}>
            <button onClick={() => setMode('choose')} style={styles.backLink}>
              <ArrowLeft size={16} /> Tillbaka
            </button>
            <h2 style={styles.cardTitle}>Välj din familj</h2>

            {families.length === 0 ? (
              <p style={styles.emptyText}>Inga familjer hittades.</p>
            ) : (
              families.map(fam => (
                <button key={fam.id} onClick={() => selectFamily(fam)} style={styles.familyBtn}>
                  <span style={styles.familyIcon}>🏠</span>
                  <span style={styles.familyName}>{fam.name}</span>
                  <ArrowRight size={16} color={C.textMuted} />
                </button>
              ))
            )}
          </div>
        </div>
      </div>
    );
  }

  // --- CHILD: Pick avatar ---
  if (mode === 'child-pick') {
    return (
      <div style={styles.page}>
        <div style={styles.container}>
          <div style={styles.logoWrap}>
            <div style={styles.logoIcon}><Home size={36} color="#fff" /></div>
            <h1 style={styles.logoText}>FamTastic</h1>
          </div>

          <div style={styles.card}>
            <button onClick={() => setMode('child-family')} style={styles.backLink}>
              <ArrowLeft size={16} /> Tillbaka
            </button>
            <h2 style={styles.cardTitle}>Vem är du?</h2>
            <p style={styles.cardDesc}>{selectedFamily?.name}</p>

            {children.length === 0 ? (
              <p style={styles.emptyText}>Inga barn i denna familj ännu.</p>
            ) : (
              <div style={styles.childGrid}>
                {children.map(child => (
                  <button key={child.id} onClick={() => selectChild(child)} style={styles.childCard}>
                    <span style={styles.childAvatar}>{child.avatar}</span>
                    <span style={styles.childName}>{child.name}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // --- CHILD: Enter PIN ---
  if (mode === 'child-pin') {
    return (
      <div style={styles.page}>
        <div style={styles.container}>
          <div style={styles.logoWrap}>
            <span style={styles.pinAvatar}>{selectedChild?.avatar}</span>
            <h1 style={styles.pinName}>{selectedChild?.name}</h1>
          </div>

          <div style={styles.card}>
            <button onClick={() => { setMode('child-pick'); setPin(''); setPinError(''); }} style={styles.backLink}>
              <ArrowLeft size={16} /> Tillbaka
            </button>
            <h2 style={styles.cardTitle}>Ange din PIN</h2>

            <div style={styles.pinDots}>
              {[0, 1, 2, 3].map(i => (
                <div key={i} style={{
                  ...styles.pinDot,
                  background: pin.length > i ? C.primary : C.borderLight,
                }} />
              ))}
            </div>

            {pinError && (
              <div style={styles.errorBox}>
                <AlertCircle size={16} color={C.error} />
                <span>{pinError}</span>
              </div>
            )}

            {/* Number pad */}
            <div style={styles.numpad}>
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, null, 0, 'del'].map((num, i) => {
                if (num === null) return <div key={i} style={styles.numpadEmpty} />;
                return (
                  <button
                    key={i}
                    onClick={() => {
                      if (num === 'del') {
                        setPin(p => p.slice(0, -1));
                        setPinError('');
                      } else if (pin.length < 4) {
                        const newPin = pin + num;
                        setPin(newPin);
                        setPinError('');
                        if (newPin.length === 4) {
                          setTimeout(() => {
                            setPin(newPin);
                            // Trigger verify
                          }, 100);
                        }
                      }
                    }}
                    style={styles.numpadBtn}
                  >
                    {num === 'del' ? '⌫' : num}
                  </button>
                );
              })}
            </div>

            <button
              onClick={verifyPin}
              disabled={pin.length !== 4 || verifying}
              style={{
                ...S.button, ...S.buttonPrimary, width: '100%', marginTop: 12,
                opacity: pin.length !== 4 || verifying ? 0.5 : 1,
              }}
            >
              {verifying ? 'Verifierar...' : 'Logga in'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return null;
}

// --- Styles ---
const styles = {
  page: {
    minHeight: '100vh',
    background: `linear-gradient(135deg, ${C.primaryLight} 0%, ${C.bg} 50%, ${C.secondaryLight} 100%)`,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    padding: 16, fontFamily: F.body,
  },
  container: { width: '100%', maxWidth: 400 },
  logoWrap: { textAlign: 'center', marginBottom: 24 },
  logoIcon: {
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
    background: C.primary, borderRadius: 20, padding: 14, marginBottom: 12,
  },
  logoText: { fontFamily: F.heading, fontSize: F.sizes.hero, fontWeight: F.weights.extra, color: C.primary, margin: '0 0 4px' },
  tagline: { fontSize: F.sizes.md, color: C.textMuted, margin: 0 },
  card: { ...S.card, padding: 24 },
  cardTitle: { fontFamily: F.heading, fontSize: F.sizes.xl, fontWeight: F.weights.bold, color: C.text, margin: '0 0 8px' },
  cardDesc: { fontSize: F.sizes.sm, color: C.textMuted, margin: '0 0 16px', lineHeight: 1.5 },
  backLink: {
    display: 'flex', alignItems: 'center', gap: 4, background: 'none', border: 'none',
    color: C.textMuted, fontSize: F.sizes.sm, cursor: 'pointer', padding: 0, marginBottom: 12,
  },
  choiceBtn: {
    display: 'flex', alignItems: 'center', gap: 14, width: '100%', padding: 14,
    background: C.bg, borderRadius: 14, border: `1px solid ${C.borderLight}`,
    cursor: 'pointer', textAlign: 'left', marginBottom: 8,
  },
  choiceIcon: { width: 48, height: 48, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  choiceContent: { flex: 1 },
  choiceTitle: { display: 'block', fontFamily: F.heading, fontSize: F.sizes.md, fontWeight: F.weights.bold, color: C.text },
  choiceDesc: { display: 'block', fontSize: F.sizes.sm, color: C.textMuted, marginTop: 2 },
  inputWrap: { position: 'relative' },
  inputIcon: { position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' },
  input: { ...S.input, paddingLeft: 44 },
  errorBox: { display: 'flex', alignItems: 'center', gap: 8, marginTop: 12, padding: '10px 14px', background: C.errorLight, borderRadius: 10, fontSize: F.sizes.sm, color: C.error },
  sentWrap: { textAlign: 'center', padding: '12px 0' },
  sentTitle: { fontFamily: F.heading, fontSize: F.sizes.xl, fontWeight: F.weights.bold, color: C.text, margin: '16px 0 8px' },
  sentText: { fontSize: F.sizes.md, color: C.textMuted, lineHeight: 1.5, margin: 0 },
  emptyText: { fontSize: F.sizes.sm, color: C.textMuted, textAlign: 'center', padding: 16 },
  familyBtn: {
    display: 'flex', alignItems: 'center', gap: 12, width: '100%', padding: 14,
    background: C.bg, borderRadius: 12, border: `1px solid ${C.borderLight}`,
    cursor: 'pointer', textAlign: 'left', marginBottom: 6,
  },
  familyIcon: { fontSize: 24 },
  familyName: { flex: 1, fontSize: F.sizes.md, fontWeight: F.weights.semi, color: C.text },
  childGrid: { display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10 },
  childCard: {
    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
    padding: 20, background: C.bg, borderRadius: 16, border: `2px solid ${C.borderLight}`,
    cursor: 'pointer',
  },
  childAvatar: { fontSize: 44 },
  childName: { fontSize: F.sizes.md, fontWeight: F.weights.bold, fontFamily: F.heading, color: C.text },
  pinAvatar: { fontSize: 64, display: 'block' },
  pinName: { fontFamily: F.heading, fontSize: F.sizes.xxl, fontWeight: F.weights.extra, color: C.primary, margin: '8px 0 0' },
  pinDots: { display: 'flex', justifyContent: 'center', gap: 14, margin: '20px 0' },
  pinDot: { width: 20, height: 20, borderRadius: 10, transition: 'background 0.15s' },
  numpad: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, maxWidth: 260, margin: '0 auto' },
  numpadBtn: {
    padding: 16, fontSize: F.sizes.xl, fontWeight: F.weights.bold, fontFamily: F.heading,
    background: C.bg, border: `1px solid ${C.borderLight}`, borderRadius: 12,
    cursor: 'pointer', color: C.text, textAlign: 'center',
  },
  numpadEmpty: { padding: 16 },
};
