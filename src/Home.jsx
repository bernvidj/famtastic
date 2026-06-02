// ============================================
// FamTastic — Home (Parent Command Center)
// ============================================

import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import { C, F, S, getWeekNumber, todayStr, safeArray, formatKr } from './data';
import { ParentActionItems } from './ParentActionItems';
import { HomeSchoolSection } from './HomeSchoolSection';
import { HomeWeekChart } from './HomeWeekChart';
import { HomeMoneyOverview } from './HomeMoneyOverview';
import { ChevronLeft, ChevronRight, Flame } from 'lucide-react';
import { ParentNotes } from './ParentNotes';
import { AppIcon } from './AppIcon';
import { BgShapes } from './BgShapes';
import { TOTAL_ACHIEVEMENTS } from './achievements/achievementDefs';

function getWeekDates(offset) {
  const now = new Date();
  const day = now.getDay() || 7;
  const monday = new Date(now);
  monday.setDate(now.getDate() - day + 1 + offset * 7);
  monday.setHours(0, 0, 0, 0); // veckostart = lokal midnatt (annars läcker timmar in i veckofiltret)
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return d;
  });
}

function fmtDate(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}


export function Home({ familyId, member, members, onNavigate, onViewChild }) {
  const [weekOffset, setWeekOffset] = useState(0);
  const [chores, setChores] = useState([]);
  const [completions, setCompletions] = useState([]);
  const [allWeekTx, setAllWeekTx] = useState([]);
  const [monthTx, setMonthTx] = useState([]);
  const [mealPlan, setMealPlan] = useState([]);
  const [events, setEvents] = useState([]);
  const [savingsGoals, setSavingsGoals] = useState([]);
  const [goalProgress, setGoalProgress] = useState({});
  const [schoolSchedule, setSchoolSchedule] = useState([]);
  const [schoolSubjects, setSchoolSubjects] = useState([]);
  const [schoolSpecialEvents, setSchoolSpecialEvents] = useState([]);
  const [schoolExams, setSchoolExams] = useState([]);
  const [achievementsSummary, setAchievementsSummary] = useState([]);
  const [loading, setLoading] = useState(true);

  const weekDates = getWeekDates(weekOffset);
  const today = todayStr();
  const weekNum = getWeekNumber(weekDates[0]);
  const todayDow = new Date().getDay() || 7;
  const children = members.filter(m => m.role === 'child');
  const startDate = fmtDate(weekDates[0]);
  const endDate = fmtDate(weekDates[6]);

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  useEffect(() => { loadData(); }, [weekOffset, familyId]);

  async function loadData() {
    setLoading(true);
    const childIds = children.map(c => c.id);
    const [chRes, compRes, txRes, monthTxRes, mealRes, evRes, goalRes, schedRes, subjRes, specRes, examRes] = await Promise.all([
      supabase.from('chores').select('*').eq('family_id', familyId),
      supabase.from('chore_completions').select('*').eq('family_id', familyId)
        .gte('completed_date', startDate).lte('completed_date', endDate),
      supabase.from('money_transactions').select('*').eq('family_id', familyId)
        .gte('created_at', weekDates[0].toISOString()).order('created_at', { ascending: false }),
      supabase.from('money_transactions').select('*').eq('family_id', familyId)
        .gte('created_at', thirtyDaysAgo.toISOString()).order('created_at', { ascending: false }),
      supabase.from('meal_plan').select('*, meals(*)').eq('family_id', familyId)
        .gte('plan_date', startDate).lte('plan_date', endDate),
      supabase.from('calendar_events').select('*').eq('family_id', familyId)
        .gte('event_date', startDate).lte('event_date', endDate).order('event_date'),
      supabase.from('savings_goals').select('*').eq('family_id', familyId)
        .eq('is_family_goal', true).is('achieved_at', null),
      childIds.length > 0
        ? supabase.from('school_schedule').select('*').in('member_id', childIds)
        : Promise.resolve({ data: [] }),
      supabase.from('school_subjects').select('*')
        .or(`is_global.eq.true,family_id.eq.${familyId}`),
      childIds.length > 0
        ? supabase.from('school_special_events').select('*').in('member_id', childIds)
        : Promise.resolve({ data: [] }),
      childIds.length > 0
        ? supabase.from('school_exams').select('*').eq('family_id', familyId).gte('exam_date', today).order('exam_date')
        : Promise.resolve({ data: [] }),
    ]);
    setChores(chRes.data || []);
    setCompletions(compRes.data || []);
    setAllWeekTx(txRes.data || []);
    setMonthTx(monthTxRes.data || []);
    setMealPlan(mealRes.data || []);
    setEvents(evRes.data || []);
    setSchoolSchedule(schedRes.data || []);
    setSchoolSubjects(subjRes.data || []);
    setSchoolSpecialEvents(specRes.data || []);
    setSchoolExams(examRes.data || []);
    const goals = goalRes.data || [];
    setSavingsGoals(goals);

    // Hämta måls-progress parallellt + achievements-summering samtidigt
    // (tidigare N+1 sekventiella anrop som gjorde varje veckobyte segt).
    const [progressList, { data: achData }] = await Promise.all([
      Promise.all(goals.map(g =>
        supabase.rpc('get_family_goal_progress', { p_goal_id: g.id })
          .then(({ data }) => [g.id, data || 0])
      )),
      supabase.rpc('get_family_achievements_summary', { p_family_id: familyId }),
    ]);
    setGoalProgress(Object.fromEntries(progressList));
    setAchievementsSummary(achData || []);

    setLoading(false);
  }

  // --- Helpers ---
  function todayChoresForChild(childId) {
    return chores.filter(c => {
      if (c.pool && !c.assigned_to) return false;
      if (c.assigned_to && c.assigned_to !== childId) return false;
      if (c.scheduled_date) return c.scheduled_date === today;
      if (c.is_recurring && c.recurrence_rule) {
        if (c.recurrence_rule.until && today > c.recurrence_rule.until) return false;
        const days = safeArray(c.recurrence_rule.days);
        if (days.length > 0 && !days.includes(todayDow)) return false;
      }
      return true;
    });
  }

  function isCompletedToday(choreId, memberId) {
    return completions.some(c => c.chore_id === choreId && c.member_id === memberId && c.completed_date === today);
  }

  function childStreak(childId) {
    const dates = [...new Set(completions.filter(c => c.member_id === childId).map(c => c.completed_date))].sort().reverse();
    let streak = 0;
    const d = new Date();
    for (let i = 0; i < 30; i++) {
      if (dates.includes(fmtDate(d))) { streak++; } else if (i > 0) { break; }
      d.setDate(d.getDate() - 1);
    }
    return streak;
  }

  function poolClaims() {
    return chores.filter(c => c.pool && c.assigned_to).map(c => ({
      chore: c, claimer: members.find(m => m.id === c.assigned_to),
    })).filter(p => p.claimer);
  }

  function weekBonusTotal() {
    return allWeekTx.filter(tx => tx.type === 'chore_bonus').reduce((s, tx) => s + tx.amount, 0);
  }

  function childWeekBonus(childId) {
    return allWeekTx.filter(tx => tx.member_id === childId && tx.type === 'chore_bonus').reduce((s, tx) => s + tx.amount, 0);
  }

  function todayMeal() {
    const mp = mealPlan.find(m => m.plan_date === today);
    return mp ? (mp.meals?.title || mp.free_text || null) : null;
  }

  function todayEvents() { return events.filter(e => e.event_date === today); }

  const totalTodayChores = children.reduce((s, c) => s + todayChoresForChild(c.id).length, 0);
  const totalTodayDone = children.reduce((s, c) => s + todayChoresForChild(c.id).filter(ch => isCompletedToday(ch.id, c.id)).length, 0);
  const claims = poolClaims();

  return (
    <div style={styles.page}>
      <BgShapes variant="home" />
      <div style={{ position: 'relative', zIndex: 1 }}>
      <div style={styles.appHeader}>
        <AppIcon size={32} />
        <span style={styles.appTitle}>FamTastic</span>
      </div>
      <div style={styles.weekHeader}>
        <button onClick={() => setWeekOffset(w => w - 1)} style={styles.weekBtn}>
          <ChevronLeft size={20} color={C.text} />
        </button>
        <div style={styles.weekTitle}>
          <span style={styles.weekLabel}>Vecka {weekNum}</span>
          {weekOffset !== 0 && <button onClick={() => setWeekOffset(0)} style={styles.todayPill}>Idag</button>}
        </div>
        <button onClick={() => setWeekOffset(w => w + 1)} style={styles.weekBtn}>
          <ChevronRight size={20} color={C.text} />
        </button>
      </div>

      {loading ? <p style={styles.loadingText}>Laddar...</p> : (
        <div style={{ position: 'relative', zIndex: 1 }}>
          {/* 1. Metrics */}
          <div style={styles.metricRow}>
            <div style={styles.metricCard}>
              <span style={{ ...styles.metricVal, color: totalTodayDone >= totalTodayChores && totalTodayChores > 0 ? C.success : C.primary }}>
                {totalTodayDone}/{totalTodayChores}
              </span>
              <span style={styles.metricLabel}>Sysslor klara idag</span>
            </div>
            <div style={styles.metricCard}>
              <span style={{ ...styles.metricVal, color: C.primaryDark }}>{formatKr(weekBonusTotal())}</span>
              <span style={styles.metricLabel}>Bonus denna vecka</span>
            </div>
          </div>

          {/* 2. Weekly summary (current week only) */}
          {weekOffset === 0 && children.length > 0 && (
            <div style={styles.section}>
              <p style={S.sectionLabel}>Veckans sammanfattning</p>
              <div style={styles.weekSummaryRow}>
                {children.map(child => {
                  const weekDone   = completions.filter(c => c.member_id === child.id).length;
                  const bonus      = childWeekBonus(child.id);
                  const streak     = childStreak(child.id);
                  return (
                    <div key={child.id} style={styles.weekSummaryCard}>
                      <div style={{ ...styles.wsSummaryAvatar, background: child.color ? `${child.color}22` : C.primaryLight }}>
                        <span style={{ fontSize: 20 }}>{child.avatar}</span>
                      </div>
                      <span style={styles.wsName}>{child.name}</span>
                      <div style={styles.wsStats}>
                        <span style={styles.wsStat}>✅ {weekDone}</span>
                        {bonus > 0 && <span style={styles.wsStat}>💰 {formatKr(bonus)}</span>}
                        {streak > 0 && <span style={styles.wsStat}>🔥 {streak}</span>}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* 3. Per child */}
          <div style={styles.section}>
            <p style={S.sectionLabel}>Barnens dag</p>
            {children.map(child => {
              const myChores = todayChoresForChild(child.id);
              const myDone = myChores.filter(ch => isCompletedToday(ch.id, child.id)).length;
              const allDone = myChores.length > 0 && myDone >= myChores.length;
              const streak = childStreak(child.id);
              const bonus = childWeekBonus(child.id);
              return (
                <div
                  key={child.id}
                  style={{ ...styles.childCard, borderColor: allDone ? C.success : C.borderLight, cursor: 'pointer' }}
                  onClick={() => onNavigate?.('chores')}
                >
                  <div style={styles.childTop}>
                    <div style={{ ...styles.childAvatar, background: child.color ? `${child.color}22` : C.primaryLight }}>
                      <span style={{ fontSize: 22 }}>{child.avatar}</span>
                    </div>
                    <div style={styles.childInfo}>
                      <span style={styles.childName}>{child.name}</span>
                      <span style={styles.childStats}>
                        {myChores.length === 0 ? 'Inga sysslor idag' : allDone ? 'Alla klara! ✅' : `${myDone}/${myChores.length} klara`}
                        {bonus > 0 && ` · +${formatKr(bonus)}`}
                      </span>
                      {streak > 0 && (
                        <span style={styles.streakInline}><Flame size={12} color={C.primary} /> {streak} dagar</span>
                      )}
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6, flexShrink: 0 }}>
                      <ChevronRight size={16} color={C.textMuted} />
                      {onViewChild && (
                        <button
                          onClick={e => { e.stopPropagation(); onViewChild(child); }}
                          style={styles.viewChildBtn}
                        >
                          Visa vy
                        </button>
                      )}
                    </div>
                  </div>
                  {myChores.length > 0 && (
                    <div style={styles.childBarBg}>
                      <div style={{ ...styles.childBarFill, width: `${(myDone / myChores.length) * 100}%`, background: allDone ? C.success : `linear-gradient(90deg, ${C.primary}, ${C.accent})` }} />
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* 3b. Achievements per barn */}
          {achievementsSummary.length > 0 && (
            <div style={styles.section}>
              <p style={S.sectionLabel}>🏆 Achievements per barn</p>
              <div style={styles.achSummaryRow}>
                {achievementsSummary.map(child => {
                  const pct = Math.min(100, Math.round((child.count / TOTAL_ACHIEVEMENTS) * 100));
                  return (
                    <div key={child.member_id} style={{ ...styles.achSummaryCard, cursor: 'pointer' }} onClick={() => onNavigate?.('achievements')}>
                      <div style={{ ...styles.achChildAvatar, background: child.member_color ? `${child.member_color}22` : C.primaryLight }}>
                        <span style={{ fontSize: 18 }}>{child.member_avatar}</span>
                      </div>
                      <span style={styles.achChildName}>{child.member_name}</span>
                      <div style={styles.achBarBg}>
                        <div style={{ ...styles.achBarFill, width: `${pct}%` }} />
                      </div>
                      <span style={styles.achCount}>{child.count}<span style={styles.achTotal}>/{TOTAL_ACHIEVEMENTS}</span></span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* 4. School today */}
          <HomeSchoolSection
            children={children}
            schoolSchedule={schoolSchedule}
            schoolSubjects={schoolSubjects}
            schoolSpecialEvents={schoolSpecialEvents}
            schoolExams={schoolExams}
            today={today}
            todayDow={todayDow}
          />

          {/* 5. Pool claims (pool-uppdateringar) */}
          {claims.length > 0 && (
            <div style={styles.section}>
              <p style={S.sectionLabel}>Pool-uppdateringar</p>
              <div style={styles.poolAlert}>
                {claims.map((p, i) => (
                  <span key={i}>{p.claimer.avatar} {p.claimer.name} plockade "{p.chore.title}"{i < claims.length - 1 ? ' · ' : ''}</span>
                ))}
              </div>
            </div>
          )}

          {/* 6. Action items (compact) */}
          <ParentActionItems familyId={familyId} members={members} onUpdate={loadData} />

          {/* 7. Weekly chart */}
          <HomeWeekChart
            weekDates={weekDates}
            chores={chores}
            completions={completions}
            children={children}
            today={today}
            fmtDate={fmtDate}
          />

          {/* 8. Family goal */}
          {savingsGoals.length > 0 && (
            <div style={styles.section}>
              <p style={S.sectionLabel}>Familjemål</p>
              {savingsGoals.map(goal => {
                const saved = goalProgress[goal.id] || 0;
                const pct = Math.min(100, (saved / goal.target_amount) * 100);
                return (
                  <div key={goal.id} style={{ ...styles.goalCard, cursor: 'pointer' }} onClick={() => onNavigate?.('money')}>
                    <div style={styles.goalTop}>
                      <span style={{ fontSize: 24 }}>{goal.icon || '🎯'}</span>
                      <div style={{ flex: 1 }}>
                        <span style={styles.goalTitle}>{goal.title}</span>
                        <span style={styles.goalAmount}>{formatKr(saved)} av {formatKr(goal.target_amount)}</span>
                      </div>
                      <span style={styles.goalPct}>{Math.round(pct)}%</span>
                    </div>
                    <div style={styles.goalBarBg}>
                      <div style={{ ...styles.goalBarFill, width: `${pct}%`, background: pct >= 100 ? C.success : `linear-gradient(90deg, ${C.primary}, ${C.accent})` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* 9. Money overview (30 days) */}
          <HomeMoneyOverview children={children} monthTx={monthTx} />

          {/* 10. Meal + events */}
          <div style={styles.section}>
            <p style={S.sectionLabel}>Idag</p>
            {todayMeal() && (
              <div style={styles.infoRow}><span style={{ fontSize: 18 }}>🍽️</span><span style={styles.infoText}>{todayMeal()}</span></div>
            )}
            {todayEvents().map(ev => {
              const evMids = safeArray(ev.member_ids);
              const evM = evMids.length === 1 ? members.find(m => m.id === evMids[0]) : null;
              return (
                <div key={ev.id} style={styles.infoRow}>
                  <span style={{ fontSize: 18 }}>📅</span>
                  <span style={styles.infoText}>{evM ? `${evM.avatar} ` : ''}{ev.title}{ev.start_time ? ` · ${ev.start_time.slice(0, 5)}` : ''}</span>
                </div>
              );
            })}
            {!todayMeal() && todayEvents().length === 0 && (
              <div style={styles.infoRow}><span style={{ fontSize: 18 }}>☀️</span><span style={styles.infoText}>Inget planerat idag</span></div>
            )}
          </div>
          {/* 9. Parent notes */}
          <ParentNotes familyId={familyId} member={member} members={members} />

        </div>
      )}
    </div>
    </div>
  );
}

const styles = {
  page: { minHeight: '100vh', background: C.bg, fontFamily: F.body, paddingBottom: 'calc(90px + env(safe-area-inset-bottom, 0px))' },
  appHeader: { display: 'flex', alignItems: 'center', gap: 10, padding: '16px 16px 4px' },
  appTitle: { fontFamily: F.heading, fontSize: F.sizes.xl, fontWeight: F.weights.extra, color: C.text },
  weekHeader: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '4px 16px 12px' },
  weekBtn: { background: 'none', border: 'none', cursor: 'pointer', padding: 8, minHeight: 44, minWidth: 44, display: 'flex', alignItems: 'center', justifyContent: 'center' },
  weekTitle: { display: 'flex', alignItems: 'center', gap: 8 },
  weekLabel: { fontFamily: F.heading, fontSize: F.sizes.xl, fontWeight: F.weights.extra, color: C.text },
  todayPill: { padding: '4px 12px', borderRadius: 99, border: 'none', background: C.primaryLight, color: C.primary, fontSize: F.sizes.xs, fontWeight: F.weights.bold, fontFamily: F.heading, cursor: 'pointer' },
  loadingText: { textAlign: 'center', color: C.textMuted, padding: 32, fontFamily: F.heading, position: 'relative', zIndex: 1 },
  section: { padding: '0 16px', marginBottom: 16 },
  metricRow: { display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 8, padding: '0 16px 8px' },
  metricCard: { background: C.bgCard, borderRadius: 16, padding: '14px 12px', border: `1.5px solid ${C.borderLight}`, textAlign: 'center', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' },
  metricVal: { display: 'block', fontSize: F.sizes.xl, fontWeight: F.weights.extra, fontFamily: F.heading },
  metricLabel: { display: 'block', fontSize: F.sizes.xs, color: C.textMuted, fontFamily: F.heading, marginTop: 4 },
  childCard: { padding: 14, background: C.bgCard, borderRadius: 16, border: '1.5px solid', marginBottom: 8, boxShadow: '0 2px 8px rgba(0,0,0,0.04)' },
  childTop: { display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 },
  childAvatar: { width: 40, height: 40, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  childInfo: { flex: 1, minWidth: 0 },
  childName: { display: 'block', fontSize: F.sizes.md, fontWeight: F.weights.bold, fontFamily: F.heading, color: C.text },
  childStats: { fontSize: F.sizes.xs, color: C.textMuted, fontFamily: F.heading },
  streakInline: { display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: F.sizes.xs, fontWeight: F.weights.bold, fontFamily: F.heading, color: C.primaryDark },
  childBarBg: { height: 6, background: C.borderLight, borderRadius: 99, overflow: 'hidden' },
  childBarFill: { height: '100%', borderRadius: 99, transition: 'width 0.4s ease' },
  poolAlert: { padding: '10px 14px', background: C.accentLight, borderRadius: 14, border: `1.5px solid ${C.accent}`, fontSize: F.sizes.sm, fontFamily: F.heading, color: '#92400E', lineHeight: 1.5 },
  goalCard: { padding: 14, background: `linear-gradient(135deg, ${C.primaryLight}, ${C.accentLight})`, borderRadius: 16, border: `1.5px solid ${C.primary}`, marginBottom: 8 },
  goalTop: { display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 },
  goalTitle: { display: 'block', fontSize: F.sizes.md, fontWeight: F.weights.bold, fontFamily: F.heading, color: C.primaryDark },
  goalAmount: { display: 'block', fontSize: F.sizes.xs, color: C.textMuted, fontFamily: F.heading, marginTop: 2 },
  goalPct: { fontSize: F.sizes.lg, fontWeight: F.weights.extra, fontFamily: F.heading, color: C.primaryDark, flexShrink: 0 },
  goalBarBg: { height: 8, background: 'rgba(255,255,255,0.6)', borderRadius: 99, overflow: 'hidden' },
  goalBarFill: { height: '100%', borderRadius: 99, transition: 'width 0.4s ease' },
  infoRow: { display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', background: C.bgCard, borderRadius: 14, border: `1.5px solid ${C.borderLight}`, marginBottom: 6 },
  infoText: { flex: 1, fontSize: F.sizes.sm, fontWeight: F.weights.semi, fontFamily: F.heading, color: C.text },
  weekSummaryRow: { display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 4 },
  weekSummaryCard: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, padding: '12px 14px', background: C.bgCard, borderRadius: 16, border: `1.5px solid ${C.borderLight}`, boxShadow: '0 2px 8px rgba(0,0,0,0.04)', minWidth: 90, flexShrink: 0 },
  wsSummaryAvatar: { width: 38, height: 38, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  wsName: { fontSize: F.sizes.xs, fontWeight: F.weights.bold, fontFamily: F.heading, color: C.text, textAlign: 'center' },
  wsStats: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 },
  wsStat: { fontSize: F.sizes.xs, fontFamily: F.heading, color: C.textMuted, whiteSpace: 'nowrap' },

  // Achievements per barn
  achSummaryRow: { display: 'flex', gap: 10, overflowX: 'auto', paddingBottom: 4 },
  achSummaryCard: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
    padding: '14px 12px', background: C.bgCard, borderRadius: 16, boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
    border: `1.5px solid ${C.borderLight}`, minWidth: 100, flexShrink: 0 },
  achChildAvatar: { width: 40, height: 40, borderRadius: '50%', display: 'flex',
    alignItems: 'center', justifyContent: 'center' },
  achChildName: { fontSize: F.sizes.xs, fontWeight: F.weights.bold, fontFamily: F.heading,
    color: C.text, textAlign: 'center' },
  achBarBg: { width: '100%', height: 6, background: C.borderLight, borderRadius: 99, overflow: 'hidden' },
  achBarFill: { height: '100%', background: `linear-gradient(90deg, #8B5CF6, #A78BFA)`,
    borderRadius: 99, transition: 'width 0.4s ease' },
  achCount: { fontSize: F.sizes.md, fontWeight: F.weights.extra, fontFamily: F.heading, color: '#7C3AED' },
  achTotal: { fontSize: F.sizes.xs, color: C.textMuted },
  viewChildBtn: {
    padding: '3px 10px',
    borderRadius: 99,
    border: 'none',
    background: C.secondaryLight,
    color: C.secondary,
    fontSize: F.sizes.xs,
    fontWeight: F.weights.bold,
    fontFamily: F.heading,
    cursor: 'pointer',
    WebkitTapHighlightColor: 'transparent',
  },
};
