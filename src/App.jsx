// ============================================
// FamTastic — App (router + auth + child mode)
// ============================================

import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import { Login } from './Login';
import { FamilySetup } from './FamilySetup';
import { Nav } from './Nav';
import { Home } from './Home';
import { ChoresView } from './chores/ChoresView';
import { MoneyView } from './money/MoneyView';
import { MealPlan } from './meals/MealPlan';
import { ShoppingView } from './shopping/ShoppingView';
import { ScheduleView } from './ScheduleView';
import { SettingsView } from './settings/SettingsView';
import { ChildApp } from './ChildApp';
import { C } from './data';
import { Home as HomeIcon } from 'lucide-react';

export function App() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [familyId, setFamilyId] = useState(null);
  const [memberData, setMemberData] = useState(null);
  const [allMembers, setAllMembers] = useState([]);
  const [page, setPage] = useState('home');
  const [childSession, setChildSession] = useState(null);

  useEffect(() => {
    const saved = sessionStorage.getItem('famtastic_child');
    if (saved) {
      try {
        const data = JSON.parse(saved);
        setChildSession(data);
        setFamilyId(data.family_id);
        setMemberData(data);
        setLoading(false);
        return;
      } catch (e) {
        sessionStorage.removeItem('famtastic_child');
      }
    }

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
        if (s && !childSession) {
          loadFamily(s.user.id);
        } else if (!s && !childSession) {
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

    // Try to auto-link if this is a new parent login
    const { data: { user } } = await supabase.auth.getUser();
    if (user?.email) {
      await supabase.rpc('link_auth_to_member', { p_email: user.email });
    }

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

  function handleChildLogin(childData) {
    sessionStorage.setItem('famtastic_child', JSON.stringify(childData));
    setChildSession(childData);
    setFamilyId(childData.family_id);
    setMemberData(childData);
    setLoading(false);
  }

  function handleLogout() {
    if (childSession) {
      sessionStorage.removeItem('famtastic_child');
      setChildSession(null);
      setFamilyId(null);
      setMemberData(null);
      setAllMembers([]);
      setPage('home');
    } else {
      supabase.auth.signOut();
    }
  }

  if (loading) {
    return (
      <div style={styles.loading}>
        <HomeIcon size={32} color={C.primary} />
      </div>
    );
  }

  if (!session && !childSession) {
    return <Login onChildLogin={handleChildLogin} />;
  }

  if (session && !childSession && !familyId) {
    return (
      <FamilySetup
        userId={session.user.id}
        onComplete={() => loadFamily(session.user.id)}
      />
    );
  }

  if (!familyId) {
    return (
      <div style={styles.loading}>
        <HomeIcon size={32} color={C.primary} />
      </div>
    );
  }

  // --- Child mode ---
  if (childSession) {
    return <ChildApp familyId={familyId} member={memberData} onLogout={handleLogout} />;
  }

  // --- Parent mode ---
  function renderPage() {
    switch (page) {
      case 'home':
        return <Home familyId={familyId} member={memberData} members={allMembers} />;
      case 'schedule':
        return <ScheduleView familyId={familyId} member={memberData} members={allMembers} />;
      case 'chores':
        return <ChoresView familyId={familyId} member={memberData} members={allMembers} />;
      case 'money':
        return <MoneyView familyId={familyId} member={memberData} members={allMembers} />;
      case 'meals':
        return <MealPlan familyId={familyId} member={memberData} members={allMembers} onGenerateShopping={() => setPage('shopping')} />;
      case 'shopping':
        return <ShoppingView familyId={familyId} member={memberData} members={allMembers} />;
      case 'settings':
        return (
          <SettingsView
            familyId={familyId} member={memberData} members={allMembers}
            onUpdate={() => loadFamily(session.user.id)}
            onLogout={handleLogout}
          />
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

const styles = {
  loading: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: C.bg,
  },
};
