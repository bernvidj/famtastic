// ============================================
// FamTastic — ChildApp (Duolingo-style child experience)
// ============================================

import React, { useState } from 'react';
import { supabase } from './supabaseClient';
import { useChildData } from './useChildData';
import { C, F, S, todayStr, safeArray, formatKr, getGreeting, streakEmoji } from './data';
import { ChildMoneyView } from './money/ChildMoneyView';
import { Celebration } from './Celebrations';
import { Home, Calendar, CheckSquare, PiggyBank, LogOut, CheckCircle, Circle, Star, Flame, Target, Zap } from 'lucide-react';

const WEEKDAYS = ['Mån', 'Tis', 'Ons', 'Tor', 'Fre', 'Lör', 'Sön'];

export function ChildApp({ familyId, member, onLogout }) {
  const [page, setPage] = useState('home');
  const [celebrationType, setCelebrationType] = useState(null);
  const [celebrationActive, setCelebrationActive] = useState(false);
  const { data, loading, reload } = useChildData(familyId, member.id, true);

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
      // One-off dated chore: only show on that exact date
      if (c.scheduled_date) return c.scheduled_date === today;
      // Recurring: check day-of-week + optional until
      if (c.is_recurring && c.recurrence_rule) {
        if (c.recurrence_rule.until && today > c.recurrence_rule.until) return false;
        const days = safeArray(c.recurrence_rule.days);
        if (days.length > 0 && !days.includes(todayDow)) return false;
      }
      return true;
    });
  }

  function getPoolChores() {
    return chores.filter(c => c.pool && !c.assigned_to);
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
      // Check if all today's chores are now done
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

  // Streak calculation
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

  // Chores for any given date (used by calendar)
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
      // Non-recurring without scheduled_date: only show on today
      return dateStr === today;
    });
  }

  function isCompletedOnDate(choreId, dateStr) {
    return completions.some(
      c => c.chore_id === choreId && c.member_id === member.id && c.completed_date === dateStr
    );
  }

  // --- Event helpers ---
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

  const NAV = [
    { id: 'home', label: 'Hem', icon: Home },
    { id: 'chores', label: 'Sysslor', icon: CheckSquare },
    { id: 'money', label: 'Pengar', icon: PiggyBank },
    { id: 'calendar', label: 'Kalender', icon: Calendar },
  ];

  // ==================== HOME ====================
  function renderHome() {
    const todayChores = getTodayChores();
    const doneCount = todayChores.filter(c => isCompleted(c.id)).length;
    const allDone = todayChores.length > 0 && doneCount >= todayChores.length;
    const streak = calcStreak();
    const todayEvents = getMyEvents(today);
    const meal = todayMeal();
    const poolCount = getPoolChores().length;

    return (
      <div style={styles.content}>
        {/* Greeting + streak */}
        <h1 style={styles.greeting}>{getGreeting(member.name)}</h1>
        {streak > 0 && (
          <div style={styles.streakPill}>
            <Flame size={18} color={C.primary} />
            <span style={styles.streakNum}>{streak}</span>
            <span style={styles.streakLabel}>{streak === 1 ? 'dag' : 'dagar'} i rad {streakEmoji(streak)}</span>
          </div>
        )}

        {/* Progress card */}
        {todayChores.length > 0 && (
          <div style={{
            ...styles.progressCard,
            background: allDone ? `linear-gradient(135deg, ${C.successLight}, #ECFDF5)` : `linear-gradient(135deg, ${C.primaryLight}, ${C.accentLight})`,
            borderColor: allDone ? C.success : C.primary,
          }}>
            <span style={{ fontSize: allDone ? 32 : 28 }}>{allDone ? '🏆' : '💪'}</span>
            <div style={styles.progressInfo}>
              <span style={{ ...styles.progressTitle, color: allDone ? C.successDark : C.primaryDark }}>
                {allDone ? 'Alla klara idag!' : `${doneCount} av ${todayChores.length} klara`}
              </span>
              <div style={styles.progressBarBg}>
                <div style={{
                  ...styles.progressBarFill,
                  width: `${(doneCount / todayChores.length) * 100}%`,
                  background: allDone ? C.success : `linear-gradient(90deg, ${C.primary}, ${C.accent})`,
                }} />
              </div>
            </div>
          </div>
        )}

        {/* Balance pill */}
        <div style={styles.balancePill}>
          <span style={{ fontSize: 20 }}>💰</span>
          <span style={styles.balancePillLabel}>Mitt saldo</span>
          <span style={styles.balancePillAmount}>{formatKr(balance)}</span>
        </div>

        {/* Today's chores */}
        {todayChores.length > 0 && (
          <div style={styles.section}>
            <p style={S.sectionLabel}>Dagens sysslor</p>
            {todayChores.map(chore => {
              const done = isCompleted(chore.id);
              return (
                <button key={chore.id} onClick={() => toggleChore(chore.id)} style={{
                  ...styles.choreRow,
                  background: done ? C.successLight : C.bgCard,
                  borderColor: done ? C.success : C.borderLight,
                }}>
                  <div style={{ ...styles.choreEmoji, background: done ? C.successLight : C.primaryLight }}>
                    <span style={{ fontSize: 20 }}>{chore.icon || '📋'}</span>
                  </div>
                  <div style={styles.choreContent}>
                    <span style={{ ...styles.choreTitle, textDecoration: done ? 'line-through' : 'none', color: done ? C.textMuted : C.text }}>
                      {chore.title}
                    </span>
                    {!done && chore.chore_type === 'bonus' && chore.points > 0 && (
                      <span style={styles.choreBonus}><Star size={10} color="#92400E" /> +{chore.points} kr</span>
                    )}
                  </div>
                  {done ? <CheckCircle size={26} color={C.success} /> : <div style={styles.choreCheck} />}
                </button>
              );
            })}
          </div>
        )}

        {/* Pool chores teaser */}
        {poolCount > 0 && (
          <button onClick={() => setPage('chores')} style={styles.poolTeaser}>
            <span style={{ fontSize: 20 }}>🤲</span>
            <span style={styles.poolTeaserText}>{poolCount} öppna sysslor att plocka!</span>
            <Zap size={16} color={C.accent} />
          </button>
        )}

        {/* Today's events */}
        {todayEvents.length > 0 && (
          <div style={styles.section}>
            <p style={S.sectionLabel}>Idag</p>
            {todayEvents.map(ev => (
              <div key={ev.id} style={styles.eventRow}>
                <span>📅</span>
                <span style={styles.eventTitle}>{ev.title}</span>
                {ev.start_time && <span style={styles.eventTime}>{ev.start_time.slice(0, 5)}</span>}
              </div>
            ))}
          </div>
        )}

        {/* Meal */}
        {meal && (
          <div style={styles.section}>
            <p style={S.sectionLabel}>Middag</p>
            <div style={styles.mealCard}>
              <span style={{ fontSize: 24 }}>🍽️</span>
              <span style={styles.mealText}>{meal}</span>
            </div>
          </div>
        )}

        {/* Family goal */}
        {familyGoals.map(fg => (
          <div key={fg.id} style={styles.section}>
            <p style={S.sectionLabel}>Familjemål</p>
            <div style={styles.familyGoalCard}>
              <span style={{ fontSize: 24 }}>{fg.icon || '🎯'}</span>
              <div style={{ flex: 1 }}>
                <span style={styles.fgTitle}>{fg.title}</span>
                <span style={styles.fgTarget}>{formatKr(fg.target_amount)}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  // ==================== CHORES ====================
  function renderChores() {
    const todayChores = getTodayChores();
    const poolChores = getPoolChores();
    const weekBonus = completions
      .filter(c => c.member_id === member.id)
      .reduce((sum, c) => sum + (c.points_earned || 0), 0);

    return (
      <div style={styles.content}>
        <h1 style={styles.pageTitle}>Mina sysslor</h1>
        <p style={styles.subtitle}>
          {completions.filter(c => c.member_id === member.id).length} gjorda denna vecka
          {weekBonus > 0 && ` · ${weekBonus} kr bonus`}
        </p>

        {todayChores.length === 0 && poolChores.length === 0 ? (
          <div style={S.emptyState}>
            <span style={{ fontSize: 48 }}>🎉</span>
            <p style={styles.emptyTitle}>Inga sysslor idag!</p>
          </div>
        ) : (
          <>
            {todayChores.map(chore => {
              const done = isCompleted(chore.id);
              const wDone = weekDone(chore.id);
              const wTotal = weekTotal(chore);
              return (
                <button key={chore.id} onClick={() => toggleChore(chore.id)} style={{
                  ...styles.choreCard,
                  background: done ? C.successLight : C.bgCard,
                  borderColor: done ? C.success : C.borderLight,
                }}>
                  <div style={styles.choreCardTop}>
                    <div style={{ ...styles.choreEmoji, background: done ? C.successLight : C.primaryLight }}>
                      <span style={{ fontSize: 22 }}>{chore.icon || '📋'}</span>
                    </div>
                    <div style={{ flex: 1 }}>
                      <span style={{ ...styles.choreCardTitle, textDecoration: done ? 'line-through' : 'none', color: done ? C.textMuted : C.text }}>
                        {chore.title}
                      </span>
                      <div style={styles.choreBadges}>
                        <span style={{ ...S.badge, background: chore.chore_type === 'base' ? C.secondaryLight : C.primaryLight, color: chore.chore_type === 'base' ? C.secondaryDark : C.primaryDark }}>
                          {chore.chore_type === 'base' ? 'Grund' : 'Bonus'}
                        </span>
                        {chore.chore_type === 'bonus' && chore.points > 0 && (
                          <span style={{ ...S.badge, background: C.accentLight, color: '#92400E' }}>
                            <Star size={10} /> {chore.points} kr
                          </span>
                        )}
                      </div>
                    </div>
                    {done ? <CheckCircle size={28} color={C.success} /> : <div style={styles.choreCheck} />}
                  </div>
                  {wTotal > 1 && (
                    <div style={styles.progressRow}>
                      <div style={styles.progressBarBg}>
                        <div style={{ ...styles.progressBarFill, width: `${(wDone / wTotal) * 100}%` }} />
                      </div>
                      <span style={styles.progressText}>{wDone}/{wTotal} denna vecka</span>
                    </div>
                  )}
                </button>
              );
            })}

            {/* Pool chores */}
            {poolChores.length > 0 && (
              <>
                <p style={{ ...S.sectionLabel, marginTop: 16 }}>Öppna sysslor — plocka en!</p>
                {poolChores.map(chore => (
                  <div key={chore.id} style={styles.poolCard}>
                    <div style={styles.choreCardTop}>
                      <div style={{ ...styles.choreEmoji, background: C.accentLight }}>
                        <span style={{ fontSize: 22 }}>{chore.icon || '📋'}</span>
                      </div>
                      <div style={{ flex: 1 }}>
                        <span style={styles.choreCardTitle}>{chore.title}</span>
                        {chore.points > 0 && (
                          <span style={{ ...S.badge, background: C.accentLight, color: '#92400E' }}>
                            <Star size={10} /> {chore.points} kr
                          </span>
                        )}
                      </div>
                    </div>
                    <button onClick={() => claimPoolChore(chore.id)} style={styles.claimBtn}>
                      🤲 Jag tar den!
                    </button>
                  </div>
                ))}
              </>
            )}
          </>
        )}
      </div>
    );
  }

  // ==================== CALENDAR ====================
  function renderCalendar() {
    const now = new Date();
    const day = now.getDay() || 7;
    const monday = new Date(now);
    monday.setDate(now.getDate() - day + 1);
    const weekDates = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      weekDates.push(d);
    }
    function fmtD(d) {
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    }

    return (
      <div style={styles.content}>
        <h1 style={styles.pageTitle}>Min vecka</h1>
        {weekDates.map((d, i) => {
          const dateStr = fmtD(d);
          const isToday = dateStr === today;
          const dayEvents = getMyEvents(dateStr);
          const dayChores = getChoresForDate(dateStr);
          if (dayEvents.length === 0 && dayChores.length === 0) return null;
          return (
            <div key={i} style={{
              ...styles.calDay,
              background: isToday ? C.primaryLight : C.bgCard,
              borderColor: isToday ? C.primary : C.borderLight,
            }}>
              <span style={{ ...styles.calDayName, color: isToday ? C.primary : C.text }}>
                {WEEKDAYS[i]} {d.getDate()}/{d.getMonth() + 1}
              </span>
              {dayEvents.map(ev => (
                <div key={ev.id} style={styles.calEvent}>
                  📅 {ev.start_time ? ev.start_time.slice(0, 5) + ' ' : ''}{ev.title}
                </div>
              ))}
              {dayChores.map(ch => {
                const done = isCompletedOnDate(ch.id, dateStr);
                return (
                  <div key={ch.id} style={{
                    ...styles.calChore,
                    opacity: done ? 0.6 : 1,
                  }}>
                    <span>{done ? '✅' : '⬜'}</span>
                    <span>{ch.icon} {ch.title}</span>
                    {ch.chore_type === 'bonus' && ch.points > 0 && (
                      <span style={styles.calChorePoints}>+{ch.points} kr</span>
                    )}
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
    );
  }

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

      {page === 'home' && renderHome()}
      {page === 'chores' && renderChores()}
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
      {page === 'calendar' && renderCalendar()}

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
  content: { padding: '12px 16px' },

  // --- Home ---
  greeting: { fontFamily: F.heading, fontSize: F.sizes.xl, fontWeight: F.weights.extra, color: C.text, margin: '0 0 8px' },
  streakPill: { display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 14px', borderRadius: 99, background: C.primaryLight, border: `1.5px solid ${C.primary}`, marginBottom: 12 },
  streakNum: { fontSize: F.sizes.lg, fontWeight: F.weights.extra, fontFamily: F.heading, color: C.primaryDark },
  streakLabel: { fontSize: F.sizes.sm, fontWeight: F.weights.semi, fontFamily: F.heading, color: C.primaryDark },
  progressCard: { display: 'flex', alignItems: 'center', gap: 12, padding: 16, borderRadius: 16, border: '1.5px solid', marginBottom: 12 },
  progressInfo: { flex: 1 },
  progressTitle: { display: 'block', fontSize: F.sizes.md, fontWeight: F.weights.bold, fontFamily: F.heading, marginBottom: 8 },
  balancePill: { display: 'flex', alignItems: 'center', gap: 8, padding: '12px 16px', background: C.bgCard, borderRadius: 14, border: `1.5px solid ${C.borderLight}`, marginBottom: 16, boxShadow: '0 2px 8px rgba(0,0,0,0.04)' },
  balancePillLabel: { flex: 1, fontSize: F.sizes.sm, color: C.textMuted, fontFamily: F.heading },
  balancePillAmount: { fontSize: F.sizes.xl, fontWeight: F.weights.extra, fontFamily: F.heading, color: C.text },
  section: { marginBottom: 16 },
  poolTeaser: { display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '12px 16px', borderRadius: 14, border: `2px dashed ${C.accent}`, background: C.accentLight, cursor: 'pointer', marginBottom: 16, textAlign: 'left' },
  poolTeaserText: { flex: 1, fontSize: F.sizes.sm, fontWeight: F.weights.bold, fontFamily: F.heading, color: '#92400E' },

  // --- Chore rows (shared) ---
  choreRow: { display: 'flex', alignItems: 'center', gap: 12, width: '100%', padding: '12px 14px', borderRadius: 14, border: '1.5px solid', marginBottom: 8, cursor: 'pointer', textAlign: 'left', transition: 'background 0.15s' },
  choreEmoji: { width: 40, height: 40, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  choreContent: { flex: 1, minWidth: 0 },
  choreTitle: { display: 'block', fontSize: F.sizes.md, fontWeight: F.weights.bold, fontFamily: F.heading },
  choreBonus: { display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: F.sizes.xs, fontWeight: F.weights.bold, fontFamily: F.heading, color: '#92400E', background: C.accentLight, padding: '1px 8px', borderRadius: 99, marginTop: 4 },
  choreCheck: { width: 26, height: 26, borderRadius: 13, border: `2.5px solid ${C.border}`, flexShrink: 0 },

  // --- Chore cards (chores page) ---
  choreCard: { display: 'block', width: '100%', padding: '14px 16px', borderRadius: 16, border: '1.5px solid', marginBottom: 10, cursor: 'pointer', textAlign: 'left', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' },
  choreCardTop: { display: 'flex', alignItems: 'flex-start', gap: 12 },
  choreCardTitle: { display: 'block', fontSize: F.sizes.md, fontWeight: F.weights.bold, fontFamily: F.heading, color: C.text, marginBottom: 4 },
  choreBadges: { display: 'flex', gap: 4 },
  progressRow: { marginTop: 8 },
  progressBarBg: { height: 6, background: 'rgba(255,255,255,0.6)', borderRadius: 99, overflow: 'hidden', marginBottom: 4 },
  progressBarFill: { height: '100%', borderRadius: 99, background: C.primary, transition: 'width 0.4s ease' },
  progressText: { fontSize: F.sizes.xs, color: C.textMuted, fontFamily: F.heading },

  // --- Pool card ---
  poolCard: { padding: '14px 16px', borderRadius: 16, border: `2px dashed ${C.accent}`, background: C.bgCard, marginBottom: 10 },
  claimBtn: { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, width: '100%', padding: '12px', borderRadius: 12, border: 'none', background: C.accent, color: '#fff', fontSize: F.sizes.md, fontWeight: F.weights.bold, fontFamily: F.heading, cursor: 'pointer', marginTop: 10, minHeight: 48 },

  // --- Events ---
  eventRow: { display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', background: C.bgCard, borderRadius: 12, border: `1.5px solid ${C.borderLight}`, marginBottom: 6 },
  eventTitle: { flex: 1, fontSize: F.sizes.sm, fontWeight: F.weights.semi, fontFamily: F.heading, color: C.text },
  eventTime: { fontSize: F.sizes.xs, color: C.textMuted, fontFamily: F.heading },

  // --- Meal ---
  mealCard: { display: 'flex', alignItems: 'center', gap: 10, padding: '14px 16px', background: C.bgCard, borderRadius: 14, border: `1.5px solid ${C.borderLight}` },
  mealText: { fontSize: F.sizes.md, fontWeight: F.weights.bold, fontFamily: F.heading, color: C.text },

  // --- Family goal ---
  familyGoalCard: { display: 'flex', alignItems: 'center', gap: 10, padding: '14px 16px', background: `linear-gradient(135deg, ${C.primaryLight}, ${C.accentLight})`, borderRadius: 16, border: `1.5px solid ${C.primary}` },
  fgTitle: { display: 'block', fontSize: F.sizes.md, fontWeight: F.weights.bold, fontFamily: F.heading, color: C.primaryDark },
  fgTarget: { display: 'block', fontSize: F.sizes.xs, color: C.textMuted, fontFamily: F.heading },

  // --- Calendar ---
  calDay: { padding: '12px 14px', borderRadius: 14, border: '1.5px solid', marginBottom: 8 },
  calDayName: { display: 'block', fontFamily: F.heading, fontSize: F.sizes.sm, fontWeight: F.weights.bold, marginBottom: 4 },
  calEvent: { fontSize: F.sizes.sm, color: C.text, fontFamily: F.heading, padding: '2px 0' },
  calChore: {
    display: 'flex', alignItems: 'center', gap: 6, fontSize: F.sizes.sm,
    color: C.text, fontFamily: F.heading, padding: '2px 0',
  },
  calChorePoints: {
    fontSize: F.sizes.xs, color: C.primary, fontWeight: F.weights.bold,
    fontFamily: F.heading, marginLeft: 'auto',
  },

  // --- Empty ---
  emptyTitle: { fontFamily: F.heading, fontSize: F.sizes.lg, fontWeight: F.weights.bold, color: C.text, margin: '12px 0 4px' },
  subtitle: { fontSize: F.sizes.sm, color: C.textMuted, fontFamily: F.heading, margin: '0 0 12px' },
  pageTitle: { fontFamily: F.heading, fontSize: F.sizes.xl, fontWeight: F.weights.extra, color: C.text, margin: '0 0 4px' },

  // --- Nav ---
  nav: { position: 'fixed', bottom: 0, left: 0, right: 0, display: 'flex', justifyContent: 'space-around', alignItems: 'center', background: C.bgCard, borderTop: `1px solid ${C.border}`, padding: '6px 0 env(safe-area-inset-bottom, 8px)', zIndex: 100 },
  navBtn: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, background: 'none', border: 'none', cursor: 'pointer', padding: '4px 6px', minWidth: 44, minHeight: 44 },
  navLabel: { fontSize: F.sizes.xs, fontFamily: F.heading },
};
