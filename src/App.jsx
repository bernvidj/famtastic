// ============================================
// FamTastic — App (router + auth gate + child login)
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
import { CalendarView } from './calendar/CalendarView';
import { SettingsView } from './settings/SettingsView';
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
    // Check for saved child session
    const saved = sessionStorage.getItem('famtastic_child');
    if (saved) {
      try {
        const data = JSON.parse(saved);
        setChildSession(data);
        loadFamilyForChild(data);
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
    const { data: me } = await supabase
      .from('family_members')
      .select('id, family_id, name, role, avatar, color')
      .eq('auth_user_id', userId)
      .limit(1)
      .maybeSingle();

    if (me) {
      setFamilyId(me.family_id);
      setMemberData(me);
      await loadMembers(me.family_id);
    } else {
      setFamilyId(null);
      setMemberData(null);
      setAllMembers([]);
    }
    setLoading(false);
  }

  async function loadFamilyForChild(childData) {
    setLoading(true);
    setFamilyId(childData.family_id);
    setMemberData(childData);
    await loadMembers(childData.family_id);
    setLoading(false);
  }

  async function loadMembers(fId) {
    const { data: members } = await supabase
      .from('family_members')
      .select('id, name, role, avatar, color')
      .eq('family_id', fId)
      .order('created_at');
    setAllMembers(members || []);
  }

  function handleChildLogin(childData) {
    sessionStorage.setItem('famtastic_child', JSON.stringify(childData));
    setChildSession(childData);
    loadFamilyForChild(childData);
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

  // Not logged in (neither parent nor child)
  if (!session && !childSession) {
    return <Login onChildLogin={handleChildLogin} />;
  }

  // Parent logged in but no family
  if (session && !childSession && !familyId) {
    return (
      <FamilySetup
        userId={session.user.id}
        onComplete={() => loadFamily(session.user.id)}
      />
    );
  }

  // No family data loaded yet
  if (!familyId) {
    return (
      <div style={styles.loading}>
        <HomeIcon size={32} color={C.primary} />
      </div>
    );
  }

  const isChild = memberData?.role === 'child';

  function renderPage() {
    switch (page) {
      case 'home':
        return <Home familyId={familyId} member={memberData} members={allMembers} />;
      case 'calendar':
        return <CalendarView familyId={familyId} member={memberData} members={allMembers} />;
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
            familyId={familyId}
            member={memberData}
            members={allMembers}
            onUpdate={() => {
              if (childSession) loadFamilyForChild(childSession);
              else if (session) loadFamily(session.user.id);
            }}
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
