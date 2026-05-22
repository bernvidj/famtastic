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

// ── Lösenordsåterställning (visas när användaren klickar reset-länk i mail) ──
function PasswordReset({ onDone }) {
  const [pw,      setPw]      = useState('');
  const [pw2,     setPw2]     = useState('');
  const [saving,  setSaving]  = useState(false);
  const [err,     setErr]     = useState('');
  const [success, setSuccess] = useState(false);

  async function handleSave() {
    if (pw.length < 6)    { setErr('Minst 6 tecken'); return; }
    if (pw !== pw2)       { setErr('Lösenorden matchar inte'); return; }
    setSaving(true); setErr('');
    const { error } = await supabase.auth.updateUser({ password: pw });
    if (error) { setErr(error.message); setSaving(false); return; }
    setSuccess(true);
    setTimeout(onDone, 1800);
  }

  return (
    <div style={{ minHeight: '100vh', background: C.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div style={{ background: '#fff', borderRadius: 24, padding: 32, width: '100%', maxWidth: 380, boxShadow: '0 4px 24px rgba(0,0,0,0.09)' }}>
        <div style={{ fontSize: 48, textAlign: 'center', marginBottom: 12 }}>🔑</div>
        <h2 style={{ fontFamily: 'Nunito, sans-serif', fontWeight: 800, fontSize: 22, color: '#1F2937', margin: '0 0 20px', textAlign: 'center' }}>
          Sätt nytt lösenord
        </h2>
        {success ? (
          <p style={{ textAlign: 'center', color: '#10B981', fontWeight: 700, fontSize: 16 }}>✅ Lösenord sparat! Loggar in...</p>
        ) : (
          <>
            <input
              type="password" placeholder="Nytt lösenord (minst 6 tecken)"
              value={pw} onChange={e => setPw(e.target.value)}
              style={{ width: '100%', padding: '14px 16px', borderRadius: 12, border: '2px solid #E5E7EB', fontSize: 16, boxSizing: 'border-box', marginBottom: 12, fontFamily: 'inherit' }}
            />
            <input
              type="password" placeholder="Bekräfta lösenord"
              value={pw2} onChange={e => setPw2(e.target.value)}
              style={{ width: '100%', padding: '14px 16px', borderRadius: 12, border: '2px solid #E5E7EB', fontSize: 16, boxSizing: 'border-box', fontFamily: 'inherit' }}
            />
            {err && <p style={{ color: '#EF4444', fontSize: 14, marginTop: 8 }}>{err}</p>}
            <button
              onClick={handleSave} disabled={saving || !pw || !pw2}
              style={{ width: '100%', padding: 16, marginTop: 20, borderRadius: 14, background: saving || !pw || !pw2 ? '#D1D5DB' : C.primary, color: '#fff', border: 'none', fontSize: 17, fontWeight: 700, cursor: saving ? 'wait' : 'pointer', fontFamily: 'inherit' }}
            >
              {saving ? 'Sparar...' : 'Spara lösenord'}
            </button>
          </>
        )}
      </div>
    </div>
  );
}

export function App() {
  const [session,       setSession]       = useState(null);
  const [loading,       setLoading]       = useState(true);
  // Kolla direkt om vi kom hit via en recovery-länk i mailet
  const [passwordReset, setPasswordReset] = useState(
    () => window.location.hash.includes('type=recovery')
  );
  const [activeMember,  setActiveMember]  = useState(() => {
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
      // Fånga upp password recovery-länk från mail
      if (_event === 'PASSWORD_RECOVERY') {
        setPasswordReset(true);
        setLoading(false);
        return;
      }
      setSession(s);
      if (!s) {
        sessionStorage.removeItem('famtastic_active');
        setActiveMember(null);
        setFamilyId(null);
        setAllMembers([]);
        setLoading(false);
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

  // --- Password recovery via mail-länk (visas alltid först om vi kom via reset-länk) ---
  if (passwordReset) {
    return (
      <PasswordReset onDone={() => {
        setPasswordReset(false);
        window.location.hash = '';
        supabase.auth.signOut();
      }} />
    );
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
