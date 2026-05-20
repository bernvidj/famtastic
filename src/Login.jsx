// ============================================
// FamTastic — Login (magic link for parents)
// ============================================

import React, { useState } from 'react';
import { Home, Mail, ArrowRight, CheckCircle, AlertCircle } from 'lucide-react';
import { supabase } from './supabaseClient';
import { C, F, S } from './data';

export function Login() {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState('idle'); // idle | loading | sent | error
  const [errorMsg, setErrorMsg] = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    if (!email.trim()) return;

    setStatus('loading');
    setErrorMsg('');

    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: {
        emailRedirectTo: window.location.origin,
      },
    });

    if (error) {
      setStatus('error');
      setErrorMsg(error.message);
    } else {
      setStatus('sent');
    }
  }

  return (
    <div style={styles.page}>
      <div style={styles.container}>
        {/* Logo */}
        <div style={styles.logoWrap}>
          <div style={styles.logoIcon}>
            <Home size={36} color="#fff" />
          </div>
          <h1 style={styles.logoText}>FamTastic</h1>
          <p style={styles.tagline}>Familjens samlingsplats</p>
        </div>

        {/* Card */}
        <div style={styles.card}>
          {status === 'sent' ? (
            <div style={styles.sentWrap}>
              <CheckCircle size={48} color={C.success} />
              <h2 style={styles.sentTitle}>Kolla din mejl!</h2>
              <p style={styles.sentText}>
                Vi har skickat en inloggningslänk till <strong>{email}</strong>.
                Klicka på länken för att logga in.
              </p>
              <button
                style={{ ...S.button, ...S.buttonSecondary, marginTop: 16 }}
                onClick={() => { setStatus('idle'); setEmail(''); }}
              >
                Tillbaka
              </button>
            </div>
          ) : (
            <>
              <h2 style={styles.cardTitle}>Logga in</h2>
              <p style={styles.cardDesc}>
                Ange din e-postadress så skickar vi en magisk länk — inget lösenord behövs.
              </p>

              <form onSubmit={handleSubmit}>
                <div style={styles.inputWrap}>
                  <Mail
                    size={20}
                    color={C.textMuted}
                    style={styles.inputIcon}
                  />
                  <input
                    type="email"
                    placeholder="din@mejl.se"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    style={styles.input}
                    autoComplete="email"
                    autoFocus
                  />
                </div>

                {status === 'error' && (
                  <div style={styles.errorBox}>
                    <AlertCircle size={16} color={C.error} />
                    <span>{errorMsg || 'Något gick fel. Försök igen.'}</span>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={status === 'loading' || !email.trim()}
                  style={{
                    ...S.button,
                    ...S.buttonPrimary,
                    width: '100%',
                    marginTop: 16,
                    opacity: (status === 'loading' || !email.trim()) ? 0.6 : 1,
                  }}
                >
                  {status === 'loading' ? (
                    'Skickar...'
                  ) : (
                    <>
                      Skicka inloggningslänk
                      <ArrowRight size={18} />
                    </>
                  )}
                </button>
              </form>
            </>
          )}
        </div>

        {/* Footer */}
        <p style={styles.footer}>
          Barn loggar in med PIN-kod — be en förälder om hjälp.
        </p>
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
    maxWidth: 400,
  },
  logoWrap: {
    textAlign: 'center',
    marginBottom: 32,
  },
  logoIcon: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: C.primary,
    borderRadius: 20,
    padding: 14,
    marginBottom: 12,
  },
  logoText: {
    fontFamily: F.heading,
    fontSize: F.sizes.hero,
    fontWeight: F.weights.extra,
    color: C.primary,
    margin: '0 0 4px',
  },
  tagline: {
    fontSize: F.sizes.md,
    color: C.textMuted,
    margin: 0,
  },
  card: {
    ...S.card,
    padding: 28,
  },
  cardTitle: {
    fontFamily: F.heading,
    fontSize: F.sizes.xl,
    fontWeight: F.weights.bold,
    color: C.text,
    margin: '0 0 8px',
  },
  cardDesc: {
    fontSize: F.sizes.sm,
    color: C.textMuted,
    margin: '0 0 20px',
    lineHeight: 1.5,
  },
  inputWrap: {
    position: 'relative',
  },
  inputIcon: {
    position: 'absolute',
    left: 14,
    top: '50%',
    transform: 'translateY(-50%)',
    pointerEvents: 'none',
  },
  input: {
    ...S.input,
    paddingLeft: 44,
  },
  errorBox: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    marginTop: 12,
    padding: '10px 14px',
    background: C.errorLight,
    borderRadius: 10,
    fontSize: F.sizes.sm,
    color: C.error,
  },
  sentWrap: {
    textAlign: 'center',
    padding: '12px 0',
  },
  sentTitle: {
    fontFamily: F.heading,
    fontSize: F.sizes.xl,
    fontWeight: F.weights.bold,
    color: C.text,
    margin: '16px 0 8px',
  },
  sentText: {
    fontSize: F.sizes.md,
    color: C.textMuted,
    lineHeight: 1.5,
    margin: 0,
  },
  footer: {
    textAlign: 'center',
    fontSize: F.sizes.sm,
    color: C.textLight,
    marginTop: 24,
  },
};
