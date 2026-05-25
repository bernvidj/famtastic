// ============================================
// FamTastic — App (router + auth + member mode)
// ============================================

import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import { Login } from './Login';
import { FamilySetup } from './FamilySetup';
import { Nav } from './Nav';
import { Home } from './Home';
import { ChoresMoneyView } from './ChoresMoneyView';
import { MealShoppingView } from './MealShoppingView';
import { ScheduleView } from './ScheduleView';
import { SettingsView } from './settings/SettingsView';
import { ChildApp } from './ChildApp';
import { LocationView } from './location/LocationView';
import { useLocationSharing } from './location/useLocationSharing';
import { ChatView } from './chat/ChatView';
import { AppTopBar } from './AppTopBar';
import { AchievementsView } from './achievements/AchievementsView';
import { useAchievements } from './achievements/useAchievements';
import { unlockAchievement } from './achievements/unlock';
import { C, TOPBAR_H } from './data';
import { InAppToast } from './InAppToast';
import { Onboarding } from './Onboarding';
import { Home as HomeIcon } from 'lucide-react';

// ── Lösenordsåterställning (visas när användaren klickar reset-länk i mail) ──
function PasswordReset({ onDone }) {
  const [ready,   setReady]   = useState(false);
  const [pw,      setPw]      = useState('');
  const [pw2,     setPw2]     = useState('');
  const [saving,  setSaving]  = useState(false);
  const [err,     setErr]     = useState('');
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') setReady(true);
    });
    return () => subscription.unsubscribe();
  }, []);

  async function handleSave() {
    if (pw.length < 6) { setErr('Minst 6 tecken'); return; }
    if (pw !== pw2)    { setErr('Lösenorden matchar inte'); return; }
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
        ) : !ready ? (
          <p style={{ textAlign: 'center', color: '#6B7280', fontSize: 15 }}>Verifierar länk...</p>
        ) : (
          <>
            <input
              type="password" placeholder="Nytt lösenord (minst 6 tecken)"
              value={pw} onChange={e => setPw(e.target.value)}
              style={{ width: '100%', padding: '14px 16px', borderRadius: 12, border: '2px solid #E5E7EB', fontSize: 16, boxSizing: 'border-box', marginBottom: 12, fontFamily: 'inherit' }}
              autoFocus
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
  // ── All state deklareras överst — inga hooks efter conditional returns ──
  const [session,        setSession]        = useState(null);
  const [loading,        setLoading]        = useState(true);
  const [passwordReset,  setPasswordReset]  = useState(
    () => window.location.hash.includes('type=recovery')
  );
  const [activeMember,   setActiveMember]   = useState(() => {
    try { return JSON.parse(sessionStorage.getItem('famtastic_active') || 'null'); }
    catch { return null; }
  });
  const [familyId,       setFamilyId]       = useState(() => {
    try { return JSON.parse(sessionStorage.getItem('famtastic_active') || '{}').family_id || null; }
    catch { return null; }
  });
  const [allMembers,     setAllMembers]     = useState([]);
  const [familySettings, setFamilySettings] = useState(() => {
    try { return JSON.parse(sessionStorage.getItem('famtastic_settings') || '{}'); }
    catch { return {}; }
  });
  const [page,           setPage]           = useState('home');
  const [onboardingDone, setOnboardingDone] = useState(false);

  function navigateTo(newPage) {
    setPage(newPage);
    // Exploration achievements
    if (newPage === 'schedule') unlockAchievement(familyId, activeMember?.id, 'explore_schedule');
    if (newPage === 'meals')    unlockAchievement(familyId, activeMember?.id, 'explore_meals');
    if (newPage === 'chores')   unlockAchievement(familyId, activeMember?.id, 'explore_chores');
  }
  const [showSetup,      setShowSetup]      = useState(false);

  // locationFeatureEnabled baseras på familySettings — alltid beräknat, inte konditionellt
  const locationFeatureEnabled = !!((familySettings.features || {}).location_sharing);
  const chatEnabled            = !!((familySettings.features || {}).chat);
  const moodEnabled            = !!((familySettings.features || {}).mood);
  const pollEnabled            = !!((familySettings.features || {}).poll);

  const { unlocked: achievementsUnlocked, newCount: achievementsNew, markVisited: markAchievementsVisited, reload: reloadAchievements } =
    useAchievements(familyId, activeMember?.id);
  const isParent = !!(activeMember && (activeMember.role === 'admin' || activeMember.role === 'parent'));

  // useLocationSharing anropas alltid på toppnivå — enabled=false om villkor ej uppfyllt
  useLocationSharing(
    activeMember?.id ?? null,
    isParent && locationFeatureEnabled
  );

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session: s } }) => {
      setSession(s);
      if (s && activeMember?.family_id) {
        loadAllMembers(activeMember.family_id);
      }
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, s) => {
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
        setFamilySettings({});
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  async function loadAllMembers(fid) {
    const [membRes, featRes] = await Promise.all([
      supabase
        .from('family_members')
        .select('id, name, role, avatar, color, auth_user_id, pin_hash')
        .eq('family_id', fid)
        .order('created_at'),
      // SECURITY DEFINER RPC — fungerar för alla, även föräldrar vars auth_user_id ej är länkat
      supabase.rpc('get_family_features', { p_family_id: fid }),
    ]);
    setAllMembers(membRes.data || []);
    if (featRes.data) {
      const settings = { features: featRes.data };
      setFamilySettings(settings);
      sessionStorage.setItem('famtastic_settings', JSON.stringify(settings));
    }
  }

  function handleLogin(member) {
    sessionStorage.setItem('famtastic_active', JSON.stringify(member));
    setActiveMember(member);
    setFamilyId(member.family_id);
    loadAllMembers(member.family_id);
    // Fire first_login — idempotent, safe to call every login
    unlockAchievement(member.family_id, member.id, 'first_login');
  }

  function handleLogout() {
    sessionStorage.removeItem('famtastic_active');
    setActiveMember(null);
    setFamilyId(null);
    setAllMembers([]);
    setFamilySettings({});
    sessionStorage.removeItem('famtastic_settings');
    setPage('home');
    supabase.auth.signOut();
  }

  function handleSwitchMember() {
    sessionStorage.removeItem('famtastic_active');
    setActiveMember(null);
    setPage('home');
  }

  // ── Conditional renders ────────────────────────────────────────────────────
  if (passwordReset) {
    return (
      <PasswordReset onDone={() => {
        setPasswordReset(false);
        window.location.hash = '';
        supabase.auth.signOut();
      }} />
    );
  }

  if (loading) {
    return (
      <div style={styles.loading}>
        <HomeIcon size={32} color={C.primary} />
      </div>
    );
  }

  if (showSetup) {
    return <FamilySetup onComplete={() => setShowSetup(false)} />;
  }

  if (!session) {
    return <Login onLogin={handleLogin} onRegister={() => setShowSetup(true)} />;
  }

  if (!activeMember) {
    return (
      <Login
        onLogin={handleLogin}
        onRegister={() => setShowSetup(true)}
        existingSession={session}
      />
    );
  }

  if (!isParent) {
    return (
      <ChildApp
        familyId={familyId}
        member={activeMember}
        onLogout={handleLogout}
      />
    );
  }

  // ── Onboarding för ny familj (inga barn ännu) ──────────────────────────────
  const hasChildren = allMembers.some(m => m.role === 'child');
  if (isParent && !hasChildren && !onboardingDone && allMembers.length > 0) {
    return (
      <Onboarding
        familyId={familyId}
        member={activeMember}
        onComplete={async () => {
          await loadAllMembers(familyId);
          setOnboardingDone(true);
        }}
      />
    );
  }

  // ── Föräldravy ─────────────────────────────────────────────────────────────
  function renderPage() {
    switch (page) {
      case 'home':
        return <Home familyId={familyId} member={activeMember} members={allMembers} />;
      case 'schedule':
        return <ScheduleView familyId={familyId} member={activeMember} members={allMembers} />;
      case 'chores':
        return <ChoresMoneyView familyId={familyId} member={activeMember} members={allMembers} />;
      case 'meals':
        return <MealShoppingView familyId={familyId} member={activeMember} members={allMembers} />;
      case 'chat':
        return <ChatView familyId={familyId} member={activeMember} members={allMembers} moodEnabled={moodEnabled} pollEnabled={pollEnabled} onAchievement={reloadAchievements} />;
      case 'location':
        return <LocationView familyId={familyId} member={activeMember} members={allMembers} />;
      case 'achievements':
        return (
          <AchievementsView
            unlocked={achievementsUnlocked}
            onMount={markAchievementsVisited}
          />
        );
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
      <AppTopBar page={page} onNavigate={navigateTo} newAchievementsCount={achievementsNew} />
      <InAppToast />
      <div style={{ paddingTop: TOPBAR_H }}>
        {renderPage()}
      </div>
      <Nav active={page} onNavigate={navigateTo} locationEnabled={locationFeatureEnabled} chatEnabled={chatEnabled} />
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
