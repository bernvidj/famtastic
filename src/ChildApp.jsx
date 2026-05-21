// ============================================
// FamTastic — ChildApp (wrapper: data, nav, celebrations)
// Views extracted to ChildHome, ChildChores, ChildCalendar
// ============================================

import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import { useChildData } from './useChildData';
import { C, F, todayStr, safeArray, formatKr } from './data';
import { ChildHome } from './ChildHome';
import { ChildChores } from './ChildChores';
import { ChildCalendar } from './ChildCalendar';
import { ChildMoneyView } from './money/ChildMoneyView';
import { Celebration } from './Celebrations';
import { Home, Calendar, CheckSquare, PiggyBank, LogOut } from 'lucide-react';

const NAV = [
  { id: 'home', label: 'Hem', icon: Home },
  { id: 'chores', label: 'Sysslor', icon: CheckSquare },
  { id: 'money', label: 'Pengar', icon: PiggyBank },
  { id: 'calendar', label: 'Kalender', icon: Calendar },
];

export function ChildApp({ familyId, member, onLogout }) {
  const [page, setPage] = useState('home');
  const [celebrationType, setCelebrationType] = useState(null);
  const [celebrationActive, setCelebrationActive] = useState(false);
  const { data, loading, reload } = useChildData(familyId, member.id, true);

  // School data (loaded separately — not in RPC)
  const [schoolSchedule, setSchoolSchedule] = useState([]);
  const [schoolSubjects, setSchoolSubjects] = useState([]);
  const [schoolSpecialEvents, setSchoolSpecialEvents] = useState([]);

  useEffect(() => {
    if (!familyId || !member.id) return;
    loadSchoolData();
  }, [familyId, member.id]);

  async function loadSchoolData() {
    const [schedRes, subjRes, specRes] = await Promise.all([
      supabase.from('school_schedule').select('*').eq('member_id', member.id),
      supabase.from('school_subjects').select('*')
        .or(`is_global.eq.true,family_id.eq.${familyId}`),
      supabase.from('school_special_events').select('*').eq('member_id', member.id),
    ]);
    setSchoolSchedule(schedRes.data || []);
    setSchoolSubjects(subjRes.data || []);
    setSchoolSpecialEvents(specRes.data || []);
  }

  const today = todayStr();
  const todayDow = new Date().getDay() || 7;

  if (loading || !data) {
    return (
      <div style={styles.loading}>
        <span style={{ fontSize: 48 }}>{member.avatar}</span>
        <p style={styles.loadingText}>Laddar...</p>
      </div>
    );
  }

  const { chores, completions, events, transactions, goals, members, meal_plan } = data;
  const balance = transactions.reduce((sum, tx) => sum + tx.amount, 0);
  const personalGoals = goals.filter(g => !g.is_family_goal);
  const familyGoals = goals.filter(g => g.is_family_goal);

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
    return completions.some(
      c => c.chore_id === choreId && c.member_id === member.id && c.completed_date === today
    );
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
    return completions.some(
      c => c.chore_id === choreId && c.member_id === member.id && c.completed_date === dateStr
    );
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
    if (!mp) return null;
    return mp.free_text || mp.title || null;
  }

  function calcStreak() {
    const dates = [...new Set(
      completions.filter(c => c.member_id === member.id).map(c => c.completed_date)
    )].sort().reverse();
    let streak = 0;
    const d = new Date();
    for (let i = 0; i < 30; i++) {
      const ds = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      if (dates.includes(ds)) { streak++; }
      else if (i > 0) { break; }
      d.setDate(d.getDate() - 1);
    }
    return streak;
  }

  // --- Actions ---
  function triggerCelebration(type) {
    setCelebrationType(type);
    setCelebrationActive(true);
  }

  async function toggleChore(choreId) {
    const done = isCompleted(choreId);
    if (done) {
      await supabase.rpc('uncomplete_chore', {
        p_chore_id: choreId, p_member_id: member.id, p_completed_date: today,
      });
    } else {
      const chore = chores.find(c => c.id === choreId);
      const { data: result } = await supabase.rpc('complete_chore', {
        p_chore_id: choreId, p_family_id: familyId, p_member_id: member.id, p_completed_date: today,
      });
      const todayList = getTodayChores();
      const nowDone = todayList.filter(c => c.id === choreId || isCompleted(c.id)).length;
      if (nowDone >= todayList.length) {
        triggerCelebration('fireworks');
      } else if (result?.points_earned > 0) {
        triggerCelebration('sparkle');
      } else {
        triggerCelebration('confetti');
      }
    }
    reload();
  }

  async function claimPoolChore(choreId) {
    await supabase.rpc('child_claim_pool_chore', {
      p_family_id: familyId,
      p_member_id: member.id,
      p_chore_id: choreId,
    });
    triggerCelebration('sparkle');
    reload();
  }

  // --- Render ---
  return (
    <div style={styles.appPage}>
      {/* Top bar */}
      <div style={styles.topBar}>
        <span style={{ fontSize: 28 }}>{member.avatar}</span>
        <span style={styles.topName}>{member.name}</span>
        <button onClick={onLogout} style={styles.topLogout}>
          <LogOut size={16} color={C.textMuted} />
        </button>
      </div>

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
          familyId={familyId}
          memberId={member.id}
          transactions={transactions}
          goals={personalGoals}
          familyGoals={familyGoals}
          members={members}
          onReload={reload}
        />
      )}

      {page === 'calendar' && (
        <ChildCalendar
          today={today}
          getMyEvents={getMyEvents}
          getChoresForDate={getChoresForDate}
          isCompletedOnDate={isCompletedOnDate}
          schoolSchedule={schoolSchedule}
          schoolSubjects={schoolSubjects}
          schoolSpecialEvents={schoolSpecialEvents}
        />
      )}

      {/* Celebrations overlay */}
      <Celebration
        type={celebrationType}
        active={celebrationActive}
        onDone={() => setCelebrationActive(false)}
      />

      {/* Bottom nav */}
      <nav style={styles.nav}>
        {NAV.map(item => {
          const Icon = item.icon;
          const active = page === item.id;
          return (
            <button key={item.id} onClick={() => setPage(item.id)} style={{
              ...styles.navBtn,
              color: active ? C.primary : C.textMuted,
            }}>
              <Icon size={22} strokeWidth={active ? 2.5 : 2} />
              <span style={{ ...styles.navLabel, fontWeight: active ? F.weights.bold : F.weights.normal }}>
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
  appPage: { minHeight: '100vh', background: C.bg, fontFamily: F.body, paddingBottom: 80 },
  loading: { minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: C.bg, gap: 12 },
  loadingText: { fontSize: F.sizes.md, color: C.textMuted, fontFamily: F.heading },
  topBar: { display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px', background: C.bgCard, borderBottom: `1px solid ${C.borderLight}` },
  topName: { flex: 1, fontFamily: F.heading, fontSize: F.sizes.md, fontWeight: F.weights.bold, color: C.text },
  topLogout: { background: 'none', border: 'none', cursor: 'pointer', padding: 8, minHeight: 44, minWidth: 44, display: 'flex', alignItems: 'center', justifyContent: 'center' },
  nav: { position: 'fixed', bottom: 0, left: 0, right: 0, display: 'flex', justifyContent: 'space-around', alignItems: 'center', background: C.bgCard, borderTop: `1px solid ${C.border}`, padding: '6px 0 env(safe-area-inset-bottom, 8px)', zIndex: 100 },
  navBtn: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, background: 'none', border: 'none', cursor: 'pointer', padding: '4px 6px', minWidth: 44, minHeight: 44 },
  navLabel: { fontSize: F.sizes.xs, fontFamily: F.heading },
};
