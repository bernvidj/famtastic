// ============================================
// FamTastic — App (router + auth + member mode)
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
  const [session,      setSession]      = useState(null);
  const [loading,      setLoading]      = useState(true);
  const [activeMember, setActiveMember] = useState(() => {
    try { return JSON.parse(sessionStorage.getItem('famtastic_active') || 'null'); }
    catch { return null; }
  });
  const [familyId,   setFamilyId]   = useState(() => {
    try { return JSON.parse(sessionStorage.getItem('famtastic_active') || '{}').family_id || null; }
    catch { return null; }
  });
  const [allMembers, setAllMembers] = useState([]);
  const [page,       setPage]       = useState('home');
  const [showSetup,  setShowSetup]  = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session: s } }) => {
      setSession(s);
      if (s && activeMember?.family_id) {
        loadAllMembers(activeMember.family_id);
      }
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
      if (!s) {
        sessionStorage.removeItem('famtastic_active');
        setActiveMember(null);
        setFamilyId(null);
        setAllMembers([]);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  async function loadAllMembers(fid) {
    const { data } = await supabase
      .from('family_members')
      .select('id, name, role, avatar, color')
      .eq('family_id', fid)
      .order('created_at');
    setAllMembers(data || []);
  }

  function handleLogin(member) {
    sessionStorage.setItem('famtastic_active', JSON.stringify(member));
    setActiveMember(member);
    setFamilyId(member.family_id);
    loadAllMembers(member.family_id);
  }

  function handleLogout() {
    sessionStorage.removeItem('famtastic_active');
    setActiveMember(null);
    setFamilyId(null);
    setAllMembers([]);
    setPage('home');
    supabase.auth.signOut();
  }

  function handleSwitchMember() {
    sessionStorage.removeItem('famtastic_active');
    setActiveMember(null);
    setPage('home');
    // session lever kvar → Login visar direkt memberväljaren
  }

  // --- Loading ---
  if (loading) {
    return (
      <div style={styles.loading}>
        <HomeIcon size={32} color={C.primary} />
      </div>
    );
  }

  // --- Registrering ---
  if (showSetup) {
    return (
      <FamilySetup
        onComplete={() => setShowSetup(false)}
      />
    );
  }

  // --- Ingen session → visa login (steg 1: familjenamn + lösenord) ---
  if (!session) {
    return (
      <Login
        onLogin={handleLogin}
        onRegister={() => setShowSetup(true)}
      />
    );
  }

  // --- Session finns men ingen aktiv medlem → visa memberväljare (steg 2+3) ---
  if (!activeMember) {
    return (
      <Login
        onLogin={handleLogin}
        onRegister={() => setShowSetup(true)}
        existingSession={session}
      />
    );
  }

  // --- Barnvy ---
  const isParent = activeMember.role === 'admin' || activeMember.role === 'parent';
  if (!isParent) {
    return (
      <ChildApp
        familyId={familyId}
        member={activeMember}
        onLogout={handleLogout}
      />
    );
  }

  // --- Föräldravy ---
  function renderPage() {
    switch (page) {
      case 'home':
        return <Home familyId={familyId} member={activeMember} members={allMembers} />;
      case 'schedule':
        return <ScheduleView familyId={familyId} member={activeMember} members={allMembers} />;
      case 'chores':
        return <ChoresView familyId={familyId} member={activeMember} members={allMembers} />;
      case 'money':
        return <MoneyView familyId={familyId} member={activeMember} members={allMembers} />;
      case 'meals':
        return <MealPlan familyId={familyId} member={activeMember} members={allMembers} onGenerateShopping={() => setPage('shopping')} />;
      case 'shopping':
        return <ShoppingView familyId={familyId} member={activeMember} members={allMembers} />;
      case 'settings':
        return (
          <SettingsView
            familyId={familyId}
            member={activeMember}
            members={allMembers}
            onUpdate={() => loadAllMembers(familyId)}
            onLogout={handleLogout}
            onSwitchMember={handleSwitchMember}
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
