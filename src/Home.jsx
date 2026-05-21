// ============================================
// FamTastic — Home (Duolingo-style veckovyn)
// ============================================

import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import { C, F, S, getWeekNumber, todayStr, safeArray, formatKr, getGreeting, streakEmoji } from './data';
import { ChevronLeft, ChevronRight, CheckCircle, Circle, UtensilsCrossed, Target, Flame, Star } from 'lucide-react';

const WEEKDAYS = ['Mån', 'Tis', 'Ons', 'Tor', 'Fre', 'Lör', 'Sön'];

function getWeekDates(offset) {
  const now = new Date();
  const day = now.getDay() || 7;
  const monday = new Date(now);
  monday.setDate(now.getDate() - day + 1 + offset * 7);
  const dates = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    dates.push(d);
  }
  return dates;
}

function fmtDate(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function Home({ familyId, member, members }) {
  const [weekOffset, setWeekOffset] = useState(0);
  const [events, setEvents] = useState([]);
  const [chores, setChores] = useState([]);
  const [completions, setCompletions] = useState([]);
  const [mealPlan, setMealPlan] = useState([]);
  const [savingsGoals, setSavingsGoals] = useState([]);
  const [goalProgress, setGoalProgress] = useState({});
  const [loading, setLoading] = useState(true);

  const weekDates = getWeekDates(weekOffset);
  const today = todayStr();
  const weekNum = getWeekNumber(weekDates[0]);

  useEffect(() => {
    loadData();
  }, [weekOffset, familyId]);

  async function loadData() {
    setLoading(true);
    const startDate = fmtDate(weekDates[0]);
    const endDate = fmtDate(weekDates[6]);

    const [evRes, chRes, compRes, mealRes, goalRes] = await Promise.all([
      supabase.from('calendar_events').select('*')
        .eq('family_id', familyId)
        .gte('event_date', startDate)
        .lte('event_date', endDate)
        .order('event_date'),
      supabase.from('chores').select('*')
        .eq('family_id', familyId),
      supabase.from('chore_completions').select('*')
        .eq('family_id', familyId)
        .gte('completed_date', startDate)
        .lte('completed_date', endDate),
      supabase.from('meal_plan').select('*, meals(*)')
        .eq('family_id', familyId)
        .gte('plan_date', startDate)
        .lte('plan_date', endDate),
      supabase.from('savings_goals').select('*')
        .eq('family_id', familyId)
        .eq('is_family_goal', true)
        .is('achieved_at', null),
    ]);

    setEvents(evRes.data || []);
    setChores(chRes.data || []);
    setCompletions(compRes.data || []);
    setMealPlan(mealRes.data || []);

    const goals = goalRes.data || [];
    setSavingsGoals(goals);

    // BUG #3 FIX: fetch family goal progress via RPC (all members' contributions)
    const progressMap = {};
    for (const goal of goals) {
      const { data } = await supabase.rpc('get_family_goal_progress', {
        p_goal_id: goal.id,
      });
      progressMap[goal.id] = data || 0;
    }
    setGoalProgress(progressMap);
    setLoading(false);
  }

  // --- Helpers ---
  function getMemberById(id) {
    return members.find(m => m.id === id);
  }

  function todayChores() {
    const dayOfWeek = new Date().getDay() || 7;
    return chores.filter(c => {
      if (c.is_recurring && c.recurrence_rule) {
        const days = safeArray(c.recurrence_rule.days);
        if (days.length > 0 && !days.includes(dayOfWeek)) return false;
      }
      if (!c.is_recurring && !c.assigned_to) return true;
      return true;
    });
  }

  function isChoreCompleted(choreId, memberId) {
    return completions.some(
      c => c.chore_id === choreId && c.member_id === memberId && c.completed_date === today
    );
  }

  function myTodayChores() {
    return todayChores().filter(c =>
      !c.assigned_to || c.assigned_to === member.id
    );
  }

  function myTodayDone() {
    const mine = myTodayChores();
    return mine.filter(c => isChoreCompleted(c.id, member.id)).length;
  }

  async function toggleChore(choreId) {
    const done = isChoreCompleted(choreId, member.id);
    if (done) {
      await supabase.rpc('uncomplete_chore', {
        p_chore_id: choreId,
        p_member_id: member.id,
        p_completed_date: today,
      });
    } else {
      await supabase.rpc('complete_chore', {
        p_chore_id: choreId,
        p_family_id: familyId,
        p_member_id: member.id,
        p_completed_date: today,
      });
    }
    loadData();
  }

  function todayMeal() {
    return mealPlan.find(m => m.plan_date === today);
  }

  // Streak: count consecutive days with at least 1 completion
  function calcStreak() {
    const dates = [...new Set(
      completions
        .filter(c => c.member_id === member.id)
        .map(c => c.completed_date)
    )].sort().reverse();
    let streak = 0;
    const d = new Date();
    for (let i = 0; i < 30; i++) {
      const ds = fmtDate(d);
      if (dates.includes(ds)) {
        streak++;
      } else if (i > 0) {
        break;
      }
      d.setDate(d.getDate() - 1);
    }
    return streak;
  }

  const streak = calcStreak();
  const myChores = myTodayChores();
  const myDone = myTodayDone();
  const allDone = myChores.length > 0 && myDone >= myChores.length;

  // --- RENDER ---
  return (
    <div style={styles.page}>
      {/* Greeting */}
      <div style={styles.greetingWrap}>
        <h1 style={styles.greeting}>{getGreeting(member.name)}</h1>
        {streak > 0 && (
          <div style={styles.streakCard}>
            <Flame size={20} color={C.primary} />
            <span style={styles.streakNum}>{streak}</span>
            <span style={styles.streakLabel}>
              {streak === 1 ? 'dag' : 'dagar'} i rad {streakEmoji(streak)}
            </span>
          </div>
        )}
      </div>

      {/* Week nav */}
      <div style={styles.weekHeader}>
        <button onClick={() => setWeekOffset(w => w - 1)} style={styles.weekBtn}>
          <ChevronLeft size={20} color={C.text} />
        </button>
        <div style={styles.weekTitle}>
          <span style={styles.weekLabel}>Vecka {weekNum}</span>
          {weekOffset !== 0 && (
            <button onClick={() => setWeekOffset(0)} style={styles.todayBtn}>Idag</button>
          )}
        </div>
        <button onClick={() => setWeekOffset(w => w + 1)} style={styles.weekBtn}>
          <ChevronRight size={20} color={C.text} />
        </button>
      </div>

      {/* Day strip */}
      <div style={styles.dayStrip}>
        {weekDates.map((d, i) => {
          const dateStr = fmtDate(d);
          const isToday = dateStr === today;
          const dayEvents = events.filter(e => e.event_date === dateStr);
          return (
            <div key={i} style={{
              ...styles.dayCol,
              background: isToday ? C.primaryLight : 'transparent',
              border: isToday ? `2px solid ${C.primary}` : '2px solid transparent',
            }}>
              <span style={{
                ...styles.dayName,
                color: isToday ? C.primary : C.textMuted,
                fontWeight: isToday ? F.weights.bold : F.weights.normal,
              }}>
                {WEEKDAYS[i]}
              </span>
              <span style={{
                ...styles.dayNum,
                color: isToday ? C.primary : C.text,
                fontWeight: isToday ? F.weights.extra : F.weights.semi,
              }}>
                {d.getDate()}
              </span>
              {dayEvents.slice(0, 2).map(ev => {
                const evMember = safeArray(ev.member_ids).length === 1
                  ? getMemberById(ev.member_ids[0])
                  : null;
                return (
                  <div key={ev.id} style={{
                    ...styles.dayEvent,
                    background: evMember?.color || ev.color || C.secondary,
                  }}>
                    <span style={styles.dayEventText}>
                      {ev.title.length > 5 ? ev.title.slice(0, 5) + '..' : ev.title}
                    </span>
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>

      {loading ? (
        <p style={styles.loadingText}>Laddar...</p>
      ) : (
        <>
          {/* Today's chores — progress card */}
          <div style={styles.section}>
            <p style={S.sectionLabel}>Dagens sysslor</p>
            {myChores.length === 0 ? (
              <div style={styles.emptyCard}>
                <span style={{ fontSize: 32 }}>🎉</span>
                <span style={styles.emptyCardText}>Inga sysslor idag!</span>
              </div>
            ) : (
              <>
                {/* Progress summary */}
                <div style={{
                  ...styles.progressCard,
                  background: allDone
                    ? `linear-gradient(135deg, ${C.successLight}, #ECFDF5)`
                    : `linear-gradient(135deg, ${C.primaryLight}, ${C.accentLight})`,
                  borderColor: allDone ? C.success : C.primary,
                }}>
                  <div style={styles.progressTop}>
                    <span style={{
                      ...styles.progressEmoji,
                      fontSize: allDone ? 32 : 28,
                    }}>
                      {allDone ? '🏆' : '💪'}
                    </span>
                    <div style={styles.progressInfo}>
                      <span style={{
                        ...styles.progressTitle,
                        color: allDone ? C.successDark : C.primaryDark,
                      }}>
                        {allDone ? 'Alla klara!' : `${myDone} av ${myChores.length} klara`}
                      </span>
                      <div style={styles.progressBarBg}>
                        <div style={{
                          ...styles.progressBarFill,
                          width: `${(myDone / myChores.length) * 100}%`,
                          background: allDone
                            ? C.success
                            : `linear-gradient(90deg, ${C.primary}, ${C.accent})`,
                        }} />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Chore list */}
                {myChores.map(chore => {
                  const done = isChoreCompleted(chore.id, member.id);
                  return (
                    <button
                      key={chore.id}
                      onClick={() => toggleChore(chore.id)}
                      style={{
                        ...styles.choreRow,
                        background: done ? C.successLight : C.bgCard,
                        borderColor: done ? C.success : C.borderLight,
                        opacity: done ? 0.75 : 1,
                      }}
                    >
                      <div style={{
                        ...styles.choreEmoji,
                        background: done ? C.successLight : C.primaryLight,
                      }}>
                        <span style={{ fontSize: 20 }}>{chore.icon || '📋'}</span>
                      </div>
                      <div style={styles.choreContent}>
                        <span style={{
                          ...styles.choreTitle,
                          textDecoration: done ? 'line-through' : 'none',
                          color: done ? C.textMuted : C.text,
                        }}>
                          {chore.title}
                        </span>
                        {!done && chore.chore_type !== 'base' && chore.points > 0 && (
                          <span style={styles.choreBonus}>
                            <Star size={10} color="#92400E" /> +{chore.points} kr
                          </span>
                        )}
                      </div>
                      {done ? (
                        <CheckCircle size={26} color={C.success} />
                      ) : (
                        <div style={styles.choreCheck} />
                      )}
                    </button>
                  );
                })}
              </>
            )}
          </div>

          {/* Today's meal */}
          <div style={styles.section}>
            <p style={S.sectionLabel}>Middag idag</p>
            {todayMeal() ? (
              <div style={styles.mealCard}>
                <span style={{ fontSize: 28 }}>🍽️</span>
                <div style={styles.mealInfo}>
                  <span style={styles.mealTitle}>
                    {todayMeal().meals?.title || todayMeal().free_text || 'Ingen plan'}
                  </span>
                </div>
              </div>
            ) : (
              <div style={styles.emptyCard}>
                <span style={{ fontSize: 28 }}>🍽️</span>
                <span style={styles.emptyCardText}>Ingen middag planerad</span>
              </div>
            )}
          </div>

          {/* Family goal — BUG #3 FIX: uses RPC progress */}
          {savingsGoals.length > 0 && (
            <div style={styles.section}>
              <p style={S.sectionLabel}>Familjemål</p>
              {savingsGoals.map(goal => {
                const saved = goalProgress[goal.id] || 0;
                const pct = Math.min(100, (saved / goal.target_amount) * 100);
                return (
                  <div key={goal.id} style={styles.goalCard}>
                    <div style={styles.goalTop}>
                      <span style={{ fontSize: 28 }}>{goal.icon || '🎯'}</span>
                      <div style={styles.goalInfo}>
                        <span style={styles.goalTitle}>{goal.title}</span>
                        <span style={styles.goalAmount}>
                          {formatKr(saved)} av {formatKr(goal.target_amount)}
                        </span>
                      </div>
                      <span style={styles.goalPct}>{Math.round(pct)}%</span>
                    </div>
                    <div style={styles.goalBarBg}>
                      <div style={{
                        ...styles.goalBarFill,
                        width: `${pct}%`,
                        background: pct >= 100
                          ? C.success
                          : `linear-gradient(90deg, ${C.primary}, ${C.accent})`,
                      }} />
                    </div>
                    {/* Per-member contributions */}
                    <div style={styles.goalMembers}>
                      {members.filter(m => m.role === 'child').map(m => (
                        <span key={m.id} style={styles.goalMemberChip}>
                          {m.avatar}
                        </span>
                      ))}
                      <span style={styles.goalMemberLabel}>Alla bidrar!</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      <div style={{ height: 80 }} />
    </div>
  );
}

// --- Styles ---
const styles = {
  page: {
    minHeight: '100vh',
    background: C.bg,
    fontFamily: F.body,
    paddingBottom: 20,
  },
  greetingWrap: {
    padding: '20px 16px 4px',
  },
  greeting: {
    fontFamily: F.heading,
    fontSize: F.sizes.xl,
    fontWeight: F.weights.extra,
    color: C.text,
    margin: '0 0 8px',
  },
  streakCard: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    padding: '6px 14px',
    borderRadius: 99,
    background: C.primaryLight,
    border: `1.5px solid ${C.primary}`,
  },
  streakNum: {
    fontSize: F.sizes.lg,
    fontWeight: F.weights.extra,
    fontFamily: F.heading,
    color: C.primaryDark,
  },
  streakLabel: {
    fontSize: F.sizes.sm,
    fontWeight: F.weights.semi,
    fontFamily: F.heading,
    color: C.primaryDark,
  },
  weekHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '12px 16px 8px',
  },
  weekBtn: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    padding: 8,
    minHeight: 44,
    minWidth: 44,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  weekTitle: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  },
  weekLabel: {
    fontFamily: F.heading,
    fontSize: F.sizes.lg,
    fontWeight: F.weights.extra,
    color: C.text,
  },
  todayBtn: {
    padding: '4px 12px',
    borderRadius: 99,
    border: 'none',
    background: C.primaryLight,
    color: C.primary,
    fontSize: F.sizes.xs,
    fontWeight: F.weights.bold,
    fontFamily: F.heading,
    cursor: 'pointer',
  },
  dayStrip: {
    display: 'flex',
    gap: 4,
    padding: '0 12px 16px',
    overflowX: 'auto',
  },
  dayCol: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: '8px 2px',
    minWidth: 44,
    borderRadius: 12,
  },
  dayName: {
    fontSize: F.sizes.xs,
    fontFamily: F.heading,
    marginBottom: 2,
  },
  dayNum: {
    fontSize: F.sizes.lg,
    fontFamily: F.heading,
    marginBottom: 4,
  },
  dayEvent: {
    width: '90%',
    borderRadius: 6,
    padding: '2px 4px',
    marginTop: 2,
  },
  dayEventText: {
    fontSize: 9,
    color: '#fff',
    fontWeight: F.weights.bold,
    fontFamily: F.heading,
  },
  loadingText: {
    textAlign: 'center',
    color: C.textMuted,
    padding: 32,
    fontFamily: F.heading,
  },
  section: {
    padding: '0 16px',
    marginBottom: 20,
  },
  // --- Chores ---
  progressCard: {
    borderRadius: 16,
    padding: 16,
    border: '1.5px solid',
    marginBottom: 10,
  },
  progressTop: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
  },
  progressEmoji: {
    flexShrink: 0,
  },
  progressInfo: {
    flex: 1,
  },
  progressTitle: {
    display: 'block',
    fontSize: F.sizes.md,
    fontWeight: F.weights.bold,
    fontFamily: F.heading,
    marginBottom: 8,
  },
  progressBarBg: {
    height: 8,
    background: 'rgba(255,255,255,0.6)',
    borderRadius: 99,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 99,
    transition: 'width 0.4s ease',
  },
  choreRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    width: '100%',
    padding: '12px 14px',
    background: C.bgCard,
    borderRadius: 14,
    border: '1.5px solid',
    marginBottom: 8,
    cursor: 'pointer',
    textAlign: 'left',
    transition: 'background 0.15s',
  },
  choreEmoji: {
    width: 40,
    height: 40,
    borderRadius: 12,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  choreContent: {
    flex: 1,
    minWidth: 0,
  },
  choreTitle: {
    display: 'block',
    fontSize: F.sizes.md,
    fontWeight: F.weights.semi,
    fontFamily: F.heading,
    color: C.text,
  },
  choreBonus: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 3,
    fontSize: F.sizes.xs,
    fontWeight: F.weights.bold,
    fontFamily: F.heading,
    color: '#92400E',
    background: C.accentLight,
    padding: '1px 8px',
    borderRadius: 99,
    marginTop: 4,
  },
  choreCheck: {
    width: 26,
    height: 26,
    borderRadius: 13,
    border: `2.5px solid ${C.border}`,
    flexShrink: 0,
  },
  // --- Meal ---
  mealCard: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    padding: '14px 16px',
    background: C.bgCard,
    borderRadius: 16,
    border: `1.5px solid ${C.borderLight}`,
    boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
  },
  mealInfo: {
    flex: 1,
  },
  mealTitle: {
    fontSize: F.sizes.md,
    color: C.text,
    fontWeight: F.weights.bold,
    fontFamily: F.heading,
  },
  // --- Empty ---
  emptyCard: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    padding: '16px',
    background: C.bgCard,
    borderRadius: 16,
    border: `1.5px dashed ${C.border}`,
  },
  emptyCardText: {
    fontSize: F.sizes.sm,
    color: C.textMuted,
    fontFamily: F.heading,
  },
  // --- Goal ---
  goalCard: {
    padding: 16,
    background: `linear-gradient(135deg, ${C.primaryLight}, ${C.accentLight})`,
    borderRadius: 16,
    border: `1.5px solid ${C.primary}`,
    marginBottom: 8,
  },
  goalTop: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    marginBottom: 10,
  },
  goalInfo: {
    flex: 1,
    minWidth: 0,
  },
  goalTitle: {
    display: 'block',
    fontSize: F.sizes.md,
    fontWeight: F.weights.bold,
    fontFamily: F.heading,
    color: C.primaryDark,
  },
  goalAmount: {
    display: 'block',
    fontSize: F.sizes.xs,
    color: C.textMuted,
    fontFamily: F.heading,
    marginTop: 2,
  },
  goalPct: {
    fontSize: F.sizes.lg,
    fontWeight: F.weights.extra,
    fontFamily: F.heading,
    color: C.primaryDark,
    flexShrink: 0,
  },
  goalBarBg: {
    height: 10,
    background: 'rgba(255,255,255,0.6)',
    borderRadius: 99,
    overflow: 'hidden',
    marginBottom: 8,
  },
  goalBarFill: {
    height: '100%',
    borderRadius: 99,
    transition: 'width 0.4s ease',
  },
  goalMembers: {
    display: 'flex',
    alignItems: 'center',
    gap: 4,
  },
  goalMemberChip: {
    fontSize: 16,
  },
  goalMemberLabel: {
    fontSize: F.sizes.xs,
    color: C.textMuted,
    fontFamily: F.heading,
    marginLeft: 4,
  },
};
