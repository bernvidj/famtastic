// ============================================
// FamTastic — App (router + auth gate)
// ============================================

import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import { Login } from './Login';
import { FamilySetup } from './FamilySetup';
import { Nav } from './Nav';
import { Home } from './Home';
import { ChoresView } from './chores/ChoresView';
import { C, F } from './data';
import { Home as HomeIcon } from 'lucide-react';

export function App() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [familyId, setFamilyId] = useState(null);
  const [memberData, setMemberData] = useState(null);
  const [allMembers, setAllMembers] = useState([]);
  const [page, setPage] = useState('home');

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
          setAllMembers([]);
          setLoading(false);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  async function loadFamily(userId) {
    setLoading(true);

    const { data: me } = await supabase
      .from('family_members')
      .select('id, family_id, name, role, avatar, color')
      .eq('auth_user_id', userId)
      .limit(1)
      .maybeSingle();

    if (me) {
      setFamilyId(me.family_id);
      setMemberData(me);

      const { data: members } = await supabase
        .from('family_members')
        .select('id, name, role, avatar, color')
        .eq('family_id', me.family_id)
        .order('created_at');

      setAllMembers(members || []);
    } else {
      setFamilyId(null);
      setMemberData(null);
      setAllMembers([]);
    }

    setLoading(false);
  }

  // --- Loading ---
  if (loading) {
    return (
      <div style={styles.loading}>
        <HomeIcon size={32} color={C.primary} />
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
        onComplete={() => loadFamily(session.user.id)}
      />
    );
  }

  // --- Main app ---
  function renderPage() {
    switch (page) {
      case 'home':
        return (
          <Home
            familyId={familyId}
            member={memberData}
            members={allMembers}
          />
        );
      case 'chores':
        return (
          <ChoresView
            familyId={familyId}
            member={memberData}
            members={allMembers}
          />
        );
      case 'calendar':
        return <Placeholder title="Kalender" emoji="📅" />;
      case 'money':
        return <Placeholder title="Pengar" emoji="💰" />;
      case 'meals':
        return <Placeholder title="Mat" emoji="🍕" />;
      case 'shopping':
        return <Placeholder title="Handla" emoji="🛒" />;
      case 'settings':
        return (
          <div style={styles.settingsPage}>
            <h1 style={styles.settingsTitle}>Inställningar</h1>
            <p style={styles.settingsInfo}>
              {memberData?.avatar} {memberData?.name} — {memberData?.role}
            </p>
            <button
              style={styles.logoutBtn}
              onClick={() => supabase.auth.signOut()}
            >
              Logga ut
            </button>
            <div style={{ height: 80 }} />
          </div>
        );
      default:
        return null;
    }
  }

  return (
    <div>
      {renderPage()}
      <Nav active={page} onNavigate={setPage} />
    </div>
  );
}

function Placeholder({ title, emoji }) {
  return (
    <div style={styles.placeholder}>
      <span style={{ fontSize: 48 }}>{emoji}</span>
      <h2 style={styles.placeholderTitle}>{title}</h2>
      <p style={styles.placeholderText}>Kommer snart!</p>
      <div style={{ height: 80 }} />
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
  placeholder: {
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    background: C.bg,
    fontFamily: F.heading,
    textAlign: 'center',
    padding: 24,
  },
  placeholderTitle: {
    fontSize: F.sizes.xxl,
    fontWeight: F.weights.extra,
    color: C.text,
    margin: '12px 0 4px',
  },
  placeholderText: {
    fontSize: F.sizes.md,
    color: C.textMuted,
  },
  settingsPage: {
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
  settingsTitle: {
    fontSize: F.sizes.xxl,
    fontWeight: F.weights.extra,
    color: C.text,
    margin: '0 0 8px',
  },
  settingsInfo: {
    fontSize: F.sizes.lg,
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
