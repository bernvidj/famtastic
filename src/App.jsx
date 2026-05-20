// ============================================
// FamTastic — App (auth gate + family check)
// ============================================

import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import { Login } from './Login';
import { FamilySetup } from './FamilySetup';
import { C, F } from './data';
import { Home } from 'lucide-react';

export function App() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [familyId, setFamilyId] = useState(null);
  const [memberData, setMemberData] = useState(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session: s } }) => {
      setSession(s);
      if (s) {
        loadFamily(s.user.id);
      } else {
        setLoading(false);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, s) => {
        setSession(s);
        if (s) {
          loadFamily(s.user.id);
        } else {
          setFamilyId(null);
          setMemberData(null);
          setLoading(false);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  async function loadFamily(userId) {
    setLoading(true);
    const { data, error } = await supabase
      .from('family_members')
      .select('id, family_id, name, role, avatar, color')
      .eq('auth_user_id', userId)
      .limit(1)
      .maybeSingle();

    if (data) {
      setFamilyId(data.family_id);
      setMemberData(data);
    } else {
      setFamilyId(null);
      setMemberData(null);
    }
    setLoading(false);
  }

  // --- Loading ---
  if (loading) {
    return (
      <div style={styles.loading}>
        <Home size={32} color={C.primary} />
      </div>
    );
  }

  // --- Not logged in ---
  if (!session) {
    return <Login />;
  }

  // --- No family yet ---
  if (!familyId) {
    return (
      <FamilySetup
        userId={session.user.id}
        onComplete={(fId) => loadFamily(session.user.id)}
      />
    );
  }

  // --- Logged in with family — placeholder ---
  return (
    <div style={styles.loggedIn}>
      <h1 style={styles.title}>Välkommen till FamTastic! 🎉</h1>
      <p style={styles.info}>
        {memberData?.avatar} {memberData?.name} — {memberData?.role}
      </p>
      <p style={styles.sub}>Familj-ID: {familyId}</p>
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
  info: {
    fontSize: F.sizes.lg,
    color: C.text,
    margin: '0 0 4px',
  },
  sub: {
    fontSize: F.sizes.sm,
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
