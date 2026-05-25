// ============================================
// FamTastic — ChildApp (wrapper: data, nav, celebrations)
// Views extracted to ChildHome, ChildChores, ChildCalendar
// ============================================

import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import { useChildData } from './useChildData';
import { C, F, todayStr, safeArray } from './data';
import { ChildHome } from './ChildHome';
import { ChildChores } from './ChildChores';
import { ChildCalendar } from './ChildCalendar';
import { ChildMoneyView } from './money/ChildMoneyView';
import { Celebration } from './Celebrations';
import { useLocationSharing } from './location/useLocationSharing';
import { LocationView } from './location/LocationView';
import { ChatView } from './chat/ChatView';
import { Home, Calendar, CheckSquare, PiggyBank, LogOut, Trophy, Bell, BellOff } from 'lucide-react';
import { TOPBAR_H } from './data';
import { useAchievements } from './achievements/useAchievements';
import { unlockAchievement } from './achievements/unlock';
import { AchievementsView } from './achievements/AchievementsView';
import { usePushNotifications } from './notifications/usePushNotifications';
import { sendPushToFamily } from './notifications/sendPush';
import { InAppToast } from './InAppToast';

const BASE_NAV = [
  { id: 'chores',   label: 'Sysslor',  icon: CheckSquare },
  { id: 'money',    label: 'Pengar',   icon: PiggyBank },
  { id: 'calendar', label: 'Kalender', icon: Calendar },
];

// ─── Bakgrundsformer (loading-skärm) ─────────────────────────────────────────
function BgShapes() {
  return (
    <svg
      style={{
        position: 'absolute', top: 0, left: 0,
        width: '100%', height: '100%',
        opacity: 0.18, pointerEvents: 'none',
      }}
      viewBox="0 0 400 800" xmlns="http://www.w3.org/2000/svg"
      preserveAspectRatio="xMidYMid slice"
    >
      <path d="M -40 -30 Q 100 -60, 180 80 Q 230 180, 120 240 Q 20 290, -30 180 Q -80 80, -40 -30 Z" fill="#3CB4A6" />
      <path d="M 300 -20 Q 430 10, 440 140 Q 448 230, 350 260 Q 260 285, 230 190 Q 205 105, 300 -20 Z" fill="#A8E6DF" />
      <path d="M 220 640 Q 400 600, 440 720 Q 462 800, 320 810 Q 180 818, 160 720 Q 145 640, 220 640 Z" fill="#FF7A59" />
      <path d="M -50 700 Q 50 650, 130 710 Q 185 755, 140 820 Q 75 855, -15 820 Q -90 790, -50 700 Z" fill="#FFA071" />
    </svg>
  );
}

export function ChildApp({ familyId, member, onLogout }) {
  const [page, setPage] = useState('home');
  const [celebrationType, setCelebrationType] = useState(null);
  const [celebrationActive, setCelebrationActive] = useState(false);
  const [locationFeatureOn, setLocationFeatureOn] = useState(false);
  const locationKey = `famtastic_location_${member.id}`;
  const [childSharingEnabled, setChildSharingEnabled] = useState(() => {
    try { return localStorage.getItem(`famtastic_location_${member.id}`) === 'true'; } catch { return false; }
  });
  const [kidsShoppingEnabled, setKidsShoppingEnabled] = useState(false);
  const [defaultListId, setDefaultListId] = useState(null);
  const [chatEnabled, setChatEnabled] = useState(false);
  const [moodEnabled, setMoodEnabled] = useState(false);
  const [pollEnabled, setPollEnabled] = useState(false);

  const { supported: pushSupported, subscribed: pushSubscribed,
          loading: pushLoading, subscribe: pushSubscribe, unsubscribe: pushUnsubscribe } =
    usePushNotifications(familyId, member.id);

  const { unlocked: achievementsUnlocked, newCount: achievementsNew,
          markVisited: markAchievementsVisited, reload: reloadAchievements } =
    useAchievements(familyId, member.id);
  const { data, loading, reload } = useChildData(familyId, member.id, true);

  // GPS: hook alltid på toppnivå — watchPosition startar när båda flaggor är true
  useLocationSharing(member.id, locationFeatureOn && childSharingEnabled);

  // Dynamisk nav — lägg till funktionsflikar beroende på aktiva features
  const NAV = (() => {
    let items = [...BASE_NAV];
    if (chatEnabled)     items.push({ id: 'chat',     label: 'Chatt', emoji: '💬' });
    if (locationFeatureOn) items.push({ id: 'location', label: 'Plats', emoji: '📍' });
    return items;
  })();

  const [schoolSchedule,     setSchoolSchedule]     = useState([]);
  const [schoolSubjects,     setSchoolSubjects]      = useState([]);
  const [schoolSpecialEvents,setSchoolSpecialEvents] = useState([]);
  const [exams,              setExams]               = useState([]);

  useEffect(() => {
    if (!familyId || !member.id) return;
    loadSchoolData();
  }, [familyId, member.id]);

  // Läs family features via SECURITY DEFINER RPC (barn saknar auth-session)
  useEffect(() => {
    if (!familyId) return;
    supabase.rpc('get_family_features', { p_family_id: familyId })
      .then(({ data: features }) => {
        if (features) {
          setLocationFeatureOn(!!features.location_sharing);
          setKidsShoppingEnabled(!!features.kids_shopping);
          setChatEnabled(!!features.chat);
          setMoodEnabled(!!features.mood);
          setPollEnabled(!!features.poll);
        }
      });
  }, [familyId]);

  // Ladda default-lista när kids_shopping är aktiverat
  useEffect(() => {
    if (!kidsShoppingEnabled || !familyId) return;
    supabase.rpc('get_default_shopping_list', { p_family_id: familyId })
      .then(({ data }) => {
        if (Array.isArray(data) && data.length > 0) setDefaultListId(data[0].id);
      });
  }, [kidsShoppingEnabled, familyId]);

  async function loadSchoolData() {
    const [schedRes, subjRes, specRes, examRes] = await Promise.all([
      supabase.from('school_schedule').select('*').eq('member_id', member.id),
      supabase.from('school_subjects').select('*')
        .or(`is_global.eq.true,family_id.eq.${familyId}`),
      supabase.from('school_special_events').select('*').eq('member_id', member.id),
      supabase.rpc('get_child_exams', { p_family_id: familyId, p_member_id: member.id }),
    ]);
    setSchoolSchedule(schedRes.data || []);
    setSchoolSubjects(subjRes.data || []);
    setSchoolSpecialEvents(specRes.data || []);
    setExams(safeArray(examRes.data));
  }

  const today    = todayStr();
  const todayDow = new Date().getDay() || 7;

  if (loading || !data) {
    return (
      <div style={styles.loading}>
        <BgShapes />
        <div style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
          <div style={styles.loadingAvatar}>
            <span style={{ fontSize: 40 }}>{member.avatar}</span>
          </div>
          <p style={styles.loadingText}>Laddar...</p>
        </div>
      </div>
    );
  }

  const { chores, completions, events, transactions, goals, members, meal_plan } = data;
  const balance      = transactions.reduce((sum, tx) => sum + tx.amount, 0);

  // Weekly stats for summary card
  const weekChoresDone = completions.length; // completions is already week-scoped
  const weekMonday = (() => {
    const d = new Date(); d.setDate(d.getDate() - (d.getDay() || 7) + 1); d.setHours(0,0,0,0); return d;
  })();
  const weekEarned = transactions
    .filter(tx => tx.type === 'chore_bonus' && new Date(tx.created_at) >= weekMonday)
    .reduce((s, tx) => s + tx.amount, 0);
  const personalGoals = goals.filter(g => !g.is_family_goal);
  const familyGoals   = goals.filter(g => g.is_family_goal);

  // --- School helpers ---
  const subjectMap = {};
  safeArray(schoolSubjects).forEach(s => { subjectMap[s.id] = s; });

  function getTodaySchool() {
    if (todayDow > 5) return { lessons: [], special: null, morningSpecial: null, afternoonSpecial: null };
    const specials     = safeArray(schoolSpecialEvents).filter(se => se.event_date === today);
    const fullDay      = specials.find(se => se.period === 'full_day');
    if (fullDay) return { lessons: [], special: fullDay, morningSpecial: null, afternoonSpecial: null };

    const morningSpec   = specials.find(se => se.period === 'morning');
    const afternoonSpec = specials.find(se => se.period === 'afternoon');

    const lessons = safeArray(schoolSchedule)
      .filter(sl => sl.day_of_week === todayDow)
      .sort((a, b) => (a.start_time || '').localeCompare(b.start_time || ''))
      .map(sl => {
        const startHour = parseInt((sl.start_time || '08:00').split(':')[0], 10);
        if (morningSpec   && startHour < 12) return null;
        if (afternoonSpec && startHour >= 12) return null;
        const subj = subjectMap[sl.subject_id];
        return { title: subj?.title || 'Lektion', icon: subj?.icon || '📚', color: subj?.color || C.secondary, startTime: sl.start_time, endTime: sl.end_time };
      })
      .filter(Boolean);

    return { lessons, special: null, morningSpecial: morningSpec, afternoonSpecial: afternoonSpec };
  }

  const todaySchool = getTodaySchool();

  // --- Chore helpers ---
  function getTodayChores() {
    return chores.filter(c => {
      if (c.pool && c.assigned_to !== member.id) return false;
      if (c.assigned_to && c.assigned_to !== member.id) return false;
      if (c.scheduled_date) return c.scheduled_date === today;
      if (c.is_recurring && c.recurrence_rule) {
        if (c.recurrence_rule.until && today > c.recurrence_rule.until) return false;
        const days = safeArray(c.recurrence_rule.days);
        if (days.length > 0 && !days.includes(todayDow)) return false;
      }
      return true;
    });
  }

  function getPoolChores() {
    return chores.filter(c => {
      if (!c.pool || c.assigned_to) return false;
      if (c.scheduled_date) return c.scheduled_date === today;
      if (c.is_recurring && c.recurrence_rule) {
        if (c.recurrence_rule.until && today > c.recurrence_rule.until) return false;
        const days = safeArray(c.recurrence_rule.days);
        if (days.length > 0 && !days.includes(todayDow)) return false;
      }
      return true;
    });
  }

  function isCompleted(choreId) {
    return completions.some(c => c.chore_id === choreId && c.member_id === member.id && c.completed_date === today);
  }

  function weekDone(choreId) {
    return completions.filter(c => c.chore_id === choreId && c.member_id === member.id).length;
  }

  function weekTotal(chore) {
    if (chore.scheduled_date) return 1;
    if (!chore.is_recurring || !chore.recurrence_rule) return 1;
    const days = safeArray(chore.recurrence_rule.days);
    return days.length > 0 ? days.length : 1;
  }

  function getChoresForDate(dateStr) {
    const dow = (() => { const d = new Date(dateStr + 'T12:00:00'); return d.getDay() || 7; })();
    return chores.filter(c => {
      if (c.pool && c.assigned_to !== member.id) return false;
      if (c.assigned_to && c.assigned_to !== member.id) return false;
      if (c.scheduled_date) return c.scheduled_date === dateStr;
      if (c.is_recurring && c.recurrence_rule) {
        if (c.recurrence_rule.until && dateStr > c.recurrence_rule.until) return false;
        const days = safeArray(c.recurrence_rule.days);
        if (days.length > 0 && !days.includes(dow)) return false;
        return true;
      }
      return dateStr === today;
    });
  }

  function isCompletedOnDate(choreId, dateStr) {
    return completions.some(c => c.chore_id === choreId && c.member_id === member.id && c.completed_date === dateStr);
  }

  function getMyEvents(dateStr) {
    const dow = (() => { const d = new Date(dateStr + 'T12:00:00'); return d.getDay() || 7; })();
    return events.filter(ev => {
      const match = !ev.is_recurring ? ev.event_date === dateStr
        : (() => { const days = safeArray(ev.recurrence_rule?.days); return days.length > 0 ? days.includes(dow) : false; })();
      if (!match) return false;
      const mids = safeArray(ev.member_ids);
      return mids.length === 0 || mids.includes(member.id);
    });
  }

  function todayMeal() {
    const mp = meal_plan.find(m => m.plan_date === today);
    return mp ? (mp.free_text || mp.title || null) : null;
  }

  function calcStreak() {
    const dates = [...new Set(
      completions.filter(c => c.member_id === member.id).map(c => c.completed_date)
    )].sort().reverse();
    let streak = 0;
    const d = new Date();
    for (let i = 0; i < 30; i++) {
      const ds = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      if (dates.includes(ds)) { streak++; } else if (i > 0) { break; }
      d.setDate(d.getDate() - 1);
    }
    return streak;
  }

  // --- Shopping ---
  async function handleAddShoppingItem(name) {
    if (!defaultListId) return;
    await supabase.rpc('child_add_shopping_item', {
      p_family_id: familyId,
      p_member_id: member.id,
      p_list_id:   defaultListId,
      p_name:      name,
    });
    await unlockAchievement(familyId, member.id, 'shopping_added');
    reloadAchievements();
  }

  // --- GPS toggle ---
  async function handleLocationToggle() {
    if (childSharingEnabled) {
      setChildSharingEnabled(false);
      try { localStorage.setItem(locationKey, 'false'); } catch {}
    } else {
      if (!navigator.geolocation) {
        alert('Din webbläsare stöder inte platsinformation.');
        return;
      }
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          await supabase.rpc('upsert_member_location', {
            p_member_id: member.id,
            p_latitude:  pos.coords.latitude,
            p_longitude: pos.coords.longitude,
            p_accuracy:  Math.round(pos.coords.accuracy),
            p_battery:   null,
          });
          setChildSharingEnabled(true);
          try { localStorage.setItem(locationKey, 'true'); } catch {}
          await unlockAchievement(familyId, member.id, 'location_shared');
          reloadAchievements();
        },
        () => alert('Kunde inte hämta din position. Kontrollera att du tillåtit platsbehörighet.'),
        { enableHighAccuracy: true, timeout: 15_000 }
      );
    }
  }

  // --- Actions ---
  function triggerCelebration(type) {
    setCelebrationType(type);
    setCelebrationActive(true);
  }

  async function toggleChore(choreId) {
    const done = isCompleted(choreId);
    if (done) {
      await supabase.rpc('uncomplete_chore', { p_chore_id: choreId, p_member_id: member.id, p_completed_date: today });
    } else {
      const { data: result } = await supabase.rpc('complete_chore', {
        p_chore_id: choreId, p_family_id: familyId, p_member_id: member.id, p_completed_date: today,
      });
      const todayList = getTodayChores();
      const nowDone   = todayList.filter(c => c.id === choreId || isCompleted(c.id)).length;
      if (nowDone >= todayList.length) { triggerCelebration('fireworks'); }
      else if (result?.points_earned > 0) { triggerCelebration('sparkle'); }
      else { triggerCelebration('confetti'); }

      const doneChore = todayList.find(c => c.id === choreId);
      if (nowDone >= todayList.length && todayList.length > 0) {
        sendPushToFamily({
          familyId,
          excludeMemberId: member.id,
          title: `✅ ${member.name} klart för idag!`,
          body:  `Alla sysslor är gjorda 🎉`,
        });
      } else if (doneChore) {
        sendPushToFamily({
          familyId,
          excludeMemberId: member.id,
          title: `✅ ${member.name} gjorde en syssla`,
          body:  doneChore.title,
        });
      }

      // Achievement triggers
      await unlockAchievement(familyId, member.id, 'first_chore');
      await unlockAchievement(familyId, member.id, 'explore_chores');
      const totalDone = completions.length + 1;
      if (totalDone >= 10)  await unlockAchievement(familyId, member.id, 'chores_10');
      if (totalDone >= 50)  await unlockAchievement(familyId, member.id, 'chores_50');
      if (totalDone >= 100) await unlockAchievement(familyId, member.id, 'chores_100');
      const hour = new Date().getHours();
      if (hour < 7) await unlockAchievement(familyId, member.id, 'early_bird');
      const dow = new Date().getDay();
      if (dow === 0 || dow === 6) await unlockAchievement(familyId, member.id, 'weekend_warrior');
      if (nowDone >= todayList.length && todayList.length > 0)
        await unlockAchievement(familyId, member.id, 'all_today_chores');
      reloadAchievements();
    }
    reload();
  }

  async function claimPoolChore(choreId) {
    await supabase.rpc('child_claim_pool_chore', { p_family_id: familyId, p_member_id: member.id, p_chore_id: choreId });
    triggerCelebration('sparkle');
    const poolList = getPoolChores();
    const claimedChore = poolList.find(c => c.id === choreId);
    sendPushToFamily({
      familyId,
      excludeMemberId: member.id,
      title: `🤝 ${member.name} tog en syssla`,
      body:  claimedChore?.title || 'Poulsyssla plockat',
    });
    await unlockAchievement(familyId, member.id, 'pool_chore');
    reloadAchievements();
    reload();
  }

  // --- Render ---
  return (
    <div style={styles.appPage}>
      {/* Top bar (fixed, samma höjd som AppTopBar) */}
      <div style={styles.topBar}>
        <div style={{ ...styles.topAvatar, background: member.color ? `${member.color}22` : C.primaryLight }}>
          <span style={{ fontSize: 22 }}>{member.avatar}</span>
        </div>
        <span style={styles.topName}>{member.name}</span>
        <button
          onClick={() => setPage('home')}
          style={{ ...styles.topIconBtn, background: page === 'home' ? C.primaryLight : 'transparent' }}
        >
          <Home size={18} color={page === 'home' ? C.primary : C.textMuted} strokeWidth={page === 'home' ? 2.5 : 2} />
        </button>
        {/* Trophy */}
        <button onClick={() => setPage('achievements')} style={{ ...styles.topIconBtn, position: 'relative' }}>
          <Trophy
            size={18}
            color={achievementsNew > 0 ? '#F59E0B' : page === 'achievements' ? C.primary : C.textMuted}
            strokeWidth={achievementsNew > 0 ? 2.5 : 2}
            style={{ transform: achievementsNew > 0 ? 'scale(1.15)' : 'scale(1)', transition: 'transform 0.2s' }}
          />
          {achievementsNew > 0 && (
            <span style={styles.achieveBadge}>{achievementsNew > 9 ? '9+' : achievementsNew}</span>
          )}
        </button>
        {/* Notiser-klocka */}
        {pushSupported && (
          <button
            onClick={pushSubscribed ? pushUnsubscribe : pushSubscribe}
            disabled={pushLoading}
            style={styles.topIconBtn}
            title={pushSubscribed ? 'Stäng av notiser' : 'Aktivera notiser'}
          >
            {pushSubscribed
              ? <Bell size={18} color={C.primary} strokeWidth={2.5} />
              : <BellOff size={18} color={C.textMuted} strokeWidth={2} />
            }
          </button>
        )}
        <button onClick={onLogout} style={styles.topLogout}>
          <LogOut size={16} color={C.textMuted} />
        </button>
      </div>

      {/* Page content — paddingTop för fixed topbar */}
      <div style={{ paddingTop: TOPBAR_H }}>
      {page === 'home' && (
        <ChildHome
          member={member}
          todayChores={getTodayChores()}
          isCompleted={isCompleted}
          toggleChore={toggleChore}
          streak={calcStreak()}
          balance={balance}
          todayEvents={getMyEvents(today)}
          meal={todayMeal()}
          poolCount={getPoolChores().length}
          familyGoals={familyGoals}
          onGoToChores={() => setPage('chores')}
          todayLessons={todaySchool.lessons}
          schoolSpecial={todaySchool.special}
          morningSpecial={todaySchool.morningSpecial}
          afternoonSpecial={todaySchool.afternoonSpecial}
          exams={exams}
          locationFeatureEnabled={locationFeatureOn}
          locationSharing={childSharingEnabled}
          onToggleLocationSharing={handleLocationToggle}
          kidsShoppingEnabled={kidsShoppingEnabled}
          shoppingListReady={!!defaultListId}
          onAddShoppingItem={handleAddShoppingItem}
          weekChoresDone={weekChoresDone}
          weekEarned={weekEarned}
        />
      )}

      {page === 'chores' && (
        <ChildChores
          member={member}
          todayChores={getTodayChores()}
          poolChores={getPoolChores()}
          completions={completions}
          isCompleted={isCompleted}
          weekDone={weekDone}
          weekTotal={weekTotal}
          toggleChore={toggleChore}
          claimPoolChore={claimPoolChore}
        />
      )}

      {page === 'money' && (
        <ChildMoneyView
          familyId={familyId} memberId={member.id}
          transactions={transactions} goals={personalGoals}
          familyGoals={familyGoals} members={members} onReload={reload}
        />
      )}

      {page === 'calendar' && (
        <ChildCalendar
          today={today} familyId={familyId} memberId={member.id} memberName={member.name}
          getMyEvents={getMyEvents}
          getChoresForDate={getChoresForDate} isCompletedOnDate={isCompletedOnDate}
          schoolSchedule={schoolSchedule} schoolSubjects={schoolSubjects}
          schoolSpecialEvents={schoolSpecialEvents} exams={exams}
          onReload={() => { loadSchoolData(); reload(); }}
        />
      )}

      {page === 'chat' && (
        <ChatView
          familyId={familyId}
          member={member}
          members={members}
          moodEnabled={moodEnabled}
          pollEnabled={pollEnabled}
          onAchievement={reloadAchievements}
        />
      )}

      {page === 'achievements' && (
        <AchievementsView
          unlocked={achievementsUnlocked}
          onMount={markAchievementsVisited}
        />
      )}

      {page === 'location' && (
        <LocationView
          familyId={familyId}
          member={member}
          members={members}
        />
      )}

      </div>{/* /paddingTop wrapper */}

      <InAppToast />
      <Celebration type={celebrationType} active={celebrationActive} onDone={() => setCelebrationActive(false)} />

      {/* Bottom nav — pill-stil som Nav.jsx */}
      <nav style={styles.nav}>
        {NAV.map(item => {
          const Icon     = item.icon;
          const isActive = page === item.id;
          return (
            <button key={item.id} onClick={() => setPage(item.id)} style={styles.navBtn}>
              <div style={{
                ...styles.iconWrap,
                background:   isActive ? C.primary : 'transparent',
                borderRadius: isActive ? 12 : 0,
                padding:      isActive ? '5px 14px' : '5px 6px',
                transition:   'all 0.18s ease',
              }}>
                {Icon
                  ? <Icon size={22} strokeWidth={isActive ? 2.5 : 2} color={isActive ? '#fff' : C.textMuted} />
                  : <span style={{ fontSize: 20, lineHeight: 1 }}>{item.emoji}</span>
                }
              </div>
              <span style={{
                ...styles.navLabel,
                color:      isActive ? C.primary : C.textMuted,
                fontWeight: isActive ? F.weights.bold : F.weights.normal,
              }}>
                {item.label}
              </span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}

const styles = {
  appPage: { minHeight: '100vh', background: C.bg, fontFamily: F.body, paddingBottom: 'calc(90px + env(safe-area-inset-bottom, 0px))' },
  loading: { minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: C.bg, position: 'relative', overflow: 'hidden' },
  loadingAvatar: { width: 80, height: 80, borderRadius: '50%', background: C.primaryLight, display: 'flex', alignItems: 'center', justifyContent: 'center' },
  loadingText: { fontSize: F.sizes.md, color: C.textMuted, fontFamily: F.heading, margin: 0 },
  topBar: { position: 'fixed', top: 0, left: 0, right: 0, height: TOPBAR_H, display: 'flex', alignItems: 'center', gap: 10, padding: '0 12px 0 16px', background: 'rgba(255,251,245,0.94)', backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)', borderBottom: `1px solid ${C.borderLight}`, zIndex: 150 },
  topIconBtn: { background: 'none', border: 'none', cursor: 'pointer', padding: 8, minHeight: 36, minWidth: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 10 },
  achieveBadge: { position: 'absolute', top: 2, right: 2, background: '#F59E0B', color: '#fff', fontSize: 9, fontWeight: 800, fontFamily: F.heading, width: 14, height: 14, borderRadius: 7, display: 'flex', alignItems: 'center', justifyContent: 'center', lineHeight: 1 },
  topAvatar: { width: 36, height: 36, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  topName: { flex: 1, fontFamily: F.heading, fontSize: F.sizes.md, fontWeight: F.weights.bold, color: C.text },
  topLogout: { background: 'none', border: 'none', cursor: 'pointer', padding: 8, minHeight: 44, minWidth: 44, display: 'flex', alignItems: 'center', justifyContent: 'center' },
  nav: { position: 'fixed', bottom: 12, left: 16, right: 16, display: 'flex', justifyContent: 'space-around', alignItems: 'center', background: 'rgba(255,251,245,0.88)', borderRadius: 24, backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)', paddingTop: 6, paddingLeft: 4, paddingRight: 4, paddingBottom: 'max(6px, env(safe-area-inset-bottom, 6px))', zIndex: 100, boxShadow: '0 4px 24px rgba(0,0,0,0.12), 0 1px 0 rgba(255,255,255,0.6) inset, 0 0 0 1px rgba(0,0,0,0.04)' },
  navBtn: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, background: 'none', border: 'none', cursor: 'pointer', padding: '2px 2px', minWidth: 44, fontFamily: F.heading },
  iconWrap: { display: 'flex', alignItems: 'center', justifyContent: 'center' },
  navLabel: { fontSize: F.sizes.xs, fontFamily: F.heading },
};
