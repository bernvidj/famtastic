// ============================================
// FamTastic — Home (Veckovyn)
// ============================================

import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import { C, F, S, getWeekNumber, todayStr, safeArray, formatKr } from './data';
import { ChevronLeft, ChevronRight, CheckCircle, Circle, CalendarDays, UtensilsCrossed, ShoppingCart, Target } from 'lucide-react';

const WEEKDAYS = ['Mån', 'Tis', 'Ons', 'Tor', 'Fre', 'Lör', 'Sön'];

function getWeekDates(offset) {
  const now = new Date();
  const day = now.getDay() || 7; // Sunday = 7
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
    setSavingsGoals(goalRes.data || []);
    setLoading(false);
  }

  // --- Helpers ---
  function getMemberById(id) {
    return members.find(m => m.id === id);
  }

  function todayChores() {
    const dayOfWeek = new Date().getDay() || 7; // 1=Mon, 7=Sun
    return chores.filter(c => {
      if (c.assigned_to) return true; // always show assigned
      const rule = c.recurrence_rule;
      if (rule && safeArray(rule.days).includes(dayOfWeek)) return true;
      if (!c.is_recurring) return true;
      return false;
    });
  }

  function isChoreCompleted(choreId, memberId) {
    return completions.some(
      c => c.chore_id === choreId && c.member_id === memberId && c.completed_date === today
    );
  }

  async function toggleChore(choreId) {
    const done = isChoreCompleted(choreId, member.id);
    if (done) {
      await supabase.from('chore_completions')
        .delete()
        .eq('chore_id', choreId)
        .eq('member_id', member.id)
        .eq('completed_date', today);
    } else {
      const chore = chores.find(c => c.id === choreId);
      await supabase.from('chore_completions')
        .insert({
          chore_id: choreId,
          family_id: familyId,
          member_id: member.id,
          completed_date: today,
          points_earned: chore?.points || 0,
        });
    }
    loadData();
  }

  function todayMeal() {
    return mealPlan.find(m => m.plan_date === today);
  }

  // --- RENDER ---
  return (
    <div style={styles.page}>
      {/* Week header */}
      <div style={styles.weekHeader}>
        <button onClick={() => setWeekOffset(w => w - 1)} style={styles.weekBtn}>
          <ChevronLeft size={20} color={C.text} />
        </button>
        <div style={styles.weekTitle}>
          <span style={styles.weekLabel}>Vecka {weekNum}</span>
          {weekOffset !== 0 && (
            <button onClick={() => setWeekOffset(0)} style={styles.todayBtn}>
              Idag
            </button>
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
              borderRadius: 12,
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
              {dayEvents.slice(0, 2).map(ev => (
                <div key={ev.id} style={{
                  ...styles.dayEvent,
                  background: ev.color || C.secondary,
                }}>
                  <span style={styles.dayEventText}>
                    {ev.title.length > 6 ? ev.title.slice(0, 6) + '..' : ev.title}
                  </span>
                </div>
              ))}
            </div>
          );
        })}
      </div>

      {loading ? (
        <p style={styles.loadingText}>Laddar...</p>
      ) : (
        <>
          {/* Today's chores */}
          <div style={styles.section}>
            <h2 style={styles.sectionTitle}>
              <CheckCircle size={18} color={C.primary} /> Dagens sysslor
            </h2>
            {todayChores().length === 0 ? (
              <p style={styles.emptyText}>Inga sysslor idag — njut! 🎉</p>
            ) : (
              todayChores().map(chore => {
                const assignee = chore.assigned_to ? getMemberById(chore.assigned_to) : null;
                const done = isChoreCompleted(chore.id, member.id);
                return (
                  <button
                    key={chore.id}
                    onClick={() => toggleChore(chore.id)}
                    style={{
                      ...styles.choreRow,
                      opacity: done ? 0.6 : 1,
                    }}
                  >
                    {done ? (
                      <CheckCircle size={22} color={C.success} />
                    ) : (
                      <Circle size={22} color={C.border} />
                    )}
                    <span style={{
                      ...styles.choreTitle,
                      textDecoration: done ? 'line-through' : 'none',
                    }}>
                      {chore.icon} {chore.title}
                    </span>
                    {chore.points > 0 && (
                      <span style={styles.chorePoints}>{chore.points} p</span>
                    )}
                    {assignee && (
                      <span style={styles.choreAssignee}>{assignee.avatar}</span>
                    )}
                  </button>
                );
              })
            )}
          </div>

          {/* Today's meal */}
          <div style={styles.section}>
            <h2 style={styles.sectionTitle}>
              <UtensilsCrossed size={18} color={C.primary} /> Middag idag
            </h2>
            {todayMeal() ? (
              <div style={styles.mealCard}>
                <span style={styles.mealTitle}>
                  {todayMeal().meals?.title || todayMeal().free_text || 'Ingen plan'}
                </span>
              </div>
            ) : (
              <p style={styles.emptyText}>Ingen middag planerad ännu</p>
            )}
          </div>

          {/* Family goal */}
          {savingsGoals.length > 0 && (
            <div style={styles.section}>
              <h2 style={styles.sectionTitle}>
                <Target size={18} color={C.primary} /> Familjemål
              </h2>
              {savingsGoals.map(goal => (
                <div key={goal.id} style={styles.goalCard}>
                  <div style={styles.goalHeader}>
                    <span>{goal.icon || '🎯'} {goal.title}</span>
                    <span style={styles.goalAmount}>
                      {formatKr(goal.current_amount || 0)} / {formatKr(goal.target_amount)}
                    </span>
                  </div>
                  <div style={styles.goalBarBg}>
                    <div style={{
                      ...styles.goalBarFill,
                      width: `${Math.min(100, ((goal.current_amount || 0) / goal.target_amount) * 100)}%`,
                    }} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* Bottom padding for nav */}
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
  weekHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '16px 16px 8px',
  },
  weekBtn: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    padding: 8,
  },
  weekTitle: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  },
  weekLabel: {
    fontFamily: F.heading,
    fontSize: F.sizes.xl,
    fontWeight: F.weights.extra,
    color: C.text,
  },
  todayBtn: {
    padding: '4px 12px',
    borderRadius: 8,
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
  },
  dayName: {
    fontSize: F.sizes.xs,
    marginBottom: 4,
  },
  dayNum: {
    fontSize: F.sizes.lg,
    marginBottom: 4,
  },
  dayEvent: {
    width: '90%',
    borderRadius: 4,
    padding: '2px 4px',
    marginTop: 2,
  },
  dayEventText: {
    fontSize: 9,
    color: '#fff',
    fontWeight: F.weights.bold,
  },
  loadingText: {
    textAlign: 'center',
    color: C.textMuted,
    padding: 32,
  },
  section: {
    padding: '0 16px',
    marginBottom: 20,
  },
  sectionTitle: {
    fontFamily: F.heading,
    fontSize: F.sizes.md,
    fontWeight: F.weights.bold,
    color: C.text,
    margin: '0 0 10px',
    display: 'flex',
    alignItems: 'center',
    gap: 6,
  },
  emptyText: {
    color: C.textMuted,
    fontSize: F.sizes.sm,
    margin: 0,
    padding: '12px 0',
  },
  choreRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    width: '100%',
    padding: '10px 14px',
    background: C.bgCard,
    borderRadius: 12,
    border: `1px solid ${C.borderLight}`,
    marginBottom: 6,
    cursor: 'pointer',
    textAlign: 'left',
  },
  choreTitle: {
    flex: 1,
    fontSize: F.sizes.md,
    color: C.text,
  },
  chorePoints: {
    fontSize: F.sizes.xs,
    fontWeight: F.weights.bold,
    color: C.accent,
    background: C.accentLight,
    padding: '2px 8px',
    borderRadius: 6,
  },
  choreAssignee: {
    fontSize: 18,
  },
  mealCard: {
    padding: '14px 16px',
    background: C.bgCard,
    borderRadius: 12,
    border: `1px solid ${C.borderLight}`,
  },
  mealTitle: {
    fontSize: F.sizes.md,
    color: C.text,
    fontWeight: F.weights.semi,
  },
  goalCard: {
    padding: '14px 16px',
    background: C.bgCard,
    borderRadius: 12,
    border: `1px solid ${C.borderLight}`,
    marginBottom: 8,
  },
  goalHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
    fontSize: F.sizes.sm,
    color: C.text,
    fontWeight: F.weights.semi,
  },
  goalAmount: {
    fontSize: F.sizes.xs,
    color: C.textMuted,
  },
  goalBarBg: {
    height: 8,
    background: C.borderLight,
    borderRadius: 4,
    overflow: 'hidden',
  },
  goalBarFill: {
    height: '100%',
    background: C.primary,
    borderRadius: 4,
    transition: 'width 0.3s',
  },
};
