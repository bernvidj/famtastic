// ============================================
// FamTastic — App (auth gate)
// ============================================

import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import { Login } from './Login';
import { C, F } from './data';
import { Home } from 'lucide-react';

export function App() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session: s } }) => {
      setSession(s);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, s) => setSession(s)
    );

    return () => subscription.unsubscribe();
  }, []);

  if (loading) {
    return (
      <div style={styles.loading}>
        <Home size={32} color={C.primary} />
      </div>
    );
  }

  if (!session) {
    return <Login />;
  }

  // Logged in — placeholder for now
  return (
    <div style={styles.loggedIn}>
      <h1 style={styles.title}>Välkommen till FamTastic! 🎉</h1>
      <p style={styles.email}>Inloggad som: {session.user.email}</p>
      <button
        style={styles.logoutBtn}
        onClick={() => supabase.auth.signOut()}
      >
        Logga ut
      </button>
    </div>
  );
}

const styles = {
  loading: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: C.bg,
  },
  loggedIn: {
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    background: C.bg,
    fontFamily: F.heading,
    padding: 24,
    textAlign: 'center',
  },
  title: {
    fontSize: F.sizes.xxl,
    fontWeight: F.weights.extra,
    color: C.primary,
    margin: '0 0 8px',
  },
  email: {
    fontSize: F.sizes.md,
    color: C.textMuted,
    margin: '0 0 24px',
  },
  logoutBtn: {
    padding: '12px 24px',
    borderRadius: 12,
    border: 'none',
    background: C.primaryLight,
    color: C.primary,
    fontSize: F.sizes.md,
    fontWeight: F.weights.bold,
    fontFamily: F.heading,
    cursor: 'pointer',
  },
};
