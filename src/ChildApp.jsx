// ============================================
// FamTastic — ChildApp (simplified child experience)
// ============================================

import React, { useState } from 'react';
import { supabase } from './supabaseClient';
import { useChildData } from './useChildData';
import { C, F, S, todayStr, safeArray, formatKr, getWeekNumber } from './data';
import { Home, Calendar, CheckSquare, PiggyBank, LogOut, CheckCircle, Circle, ChevronLeft, ChevronRight, Clock, Star, Target } from 'lucide-react';

const WEEKDAYS = ['Mån', 'Tis', 'Ons', 'Tor', 'Fre', 'Lör', 'Sön'];

function dateToDow(dateStr) {
  const d = new Date(dateStr + 'T12:00:00');
  return d.getDay() || 7;
}

export function ChildApp({ familyId, member, onLogout }) {
  const [page, setPage] = useState('home');
  const { data, loading, reload } = useChildData(familyId, member.id, true);

  const today = todayStr();
  const todayDow = new Date().getDay() || 7;

  if (loading || !data) {
    return (
      <div style={styles.loading}>
        <span style={{ fontSize: 40 }}>{member.avatar}</span>
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
      if (c.assigned_to && c.assigned_to !== member.id) return false;
      if (c.is_recurring && c.recurrence_rule) {
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
    if (!chore.is_recurring || !chore.recurrence_rule) return 1;
    const days = safeArray(chore.recurrence_rule.days);
    return days.length > 0 ? days.length : 1;
  }

  async function toggleChore(choreId) {
    const done = isCompleted(choreId);
    if (done) {
      await supabase.rpc('uncomplete_chore', {
        p_chore_id: choreId, p_member_id: member.id, p_completed_date: today,
      });
    } else {
      await supabase.rpc('complete_chore', {
        p_chore_id: choreId, p_family_id: familyId, p_member_id: member.id, p_completed_date: today,
      });
    }
    reload();
  }

  // --- Event helpers ---
  function getEventsForDate(dateStr) {
    const dow = dateToDow(dateStr);
    return events.filter(ev => {
      if (!ev.is_recurring) return ev.event_date === dateStr;
      const days = safeArray(ev.recurrence_rule?.days);
      if (days.length > 0) return days.includes(dow);
      return dateToDow(ev.event_date) === dow;
    });
  }

  function getMyEvents(dateStr) {
    return getEventsForDate(dateStr).filter(ev => {
      const mids = safeArray(ev.member_ids);
      return mids.length === 0 || mids.includes(member.id);
    });
  }

  // --- Today's meal ---
  function todayMeal() {
    const mp = meal_plan.find(m => m.plan_date === today);
    if (!mp) return null;
    return mp.free_text || mp.title || null;
  }

  // --- NAV ---
  const NAV = [
    { id: 'home', label: 'Hem', icon: Home },
    { id: 'chores', label: 'Sysslor', icon: CheckSquare },
    { id: 'money', label: 'Pengar', icon: PiggyBank },
    { id: 'calendar', label: 'Kalender', icon: Calendar },
  ];

  // --- HOME PAGE ---
  function renderHome() {
    const todayChores = getTodayChores();
    const doneCount = todayChores.filter(c => isCompleted(c.id)).length;
    const todayEvents = getMyEvents(today);
    const meal = todayMeal();

    return (
      <div style={styles.content}>
        {/* Greeting */}
        <div style={styles.greeting}>
          <span style={styles.greetAvatar}>{member.avatar}</span>
          <div>
            <h1 style={styles.greetName}>Hej {member.name}!</h1>
            <p style={styles.greetSub}>
              {doneCount === todayChores.length && todayChores.length > 0
                ? 'Alla sysslor klara idag! 🎉'
                : `${todayChores.length - doneCount} sysslor kvar idag`}
            </p>
          </div>
        </div>

        {/* Balance */}
        <div style={styles.balanceCard}>
          <span style={styles.balanceLabel}>Mitt saldo</span>
          <span style={styles.balanceAmount}>{formatKr(balance)}</span>
        </div>

        {/* Today's chores */}
        {todayChores.length > 0 && (
          <div style={styles.section}>
            <h2 style={styles.sectionTitle}>Dagens sysslor</h2>
            {todayChores.map(chore => {
              const done = isCompleted(chore.id);
              return (
                <button key={chore.id} onClick={() => toggleChore(chore.id)}
                  style={{ ...styles.choreRow, opacity: done ? 0.6 : 1, borderLeft: `4px solid ${done ? C.success : chore.chore_type === 'base' ? C.secondary : C.primary}` }}>
                  {done ? <CheckCircle size={24} color={C.success} /> : <Circle size={24} color={C.border} />}
                  <div style={{ flex: 1 }}>
                    <span style={{ ...styles.choreTitle, textDecoration: done ? 'line-through' : 'none' }}>
                      {chore.icon} {chore.title}
                    </span>
                    {chore.chore_type === 'bonus' && chore.points > 0 && (
                      <span style={styles.chorePoints}><Star size={10} /> {chore.points} kr</span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        )}

        {/* Today's events */}
        {todayEvents.length > 0 && (
          <div style={styles.section}>
            <h2 style={styles.sectionTitle}>Idag</h2>
            {todayEvents.map(ev => (
              <div key={ev.id} style={styles.eventRow}>
                <span style={styles.eventDot}>📅</span>
                <span style={styles.eventTitle}>{ev.title}</span>
                {ev.start_time && <span style={styles.eventTime}>{ev.start_time.slice(0, 5)}</span>}
              </div>
            ))}
          </div>
        )}

        {/* Meal */}
        {meal && (
          <div style={styles.section}>
            <h2 style={styles.sectionTitle}>Middag idag</h2>
            <div style={styles.mealCard}>🍽️ {meal}</div>
          </div>
        )}

        {/* Family goal */}
        {familyGoals.map(fg => (
          <div key={fg.id} style={styles.section}>
            <h2 style={styles.sectionTitle}>Familjemål</h2>
            <div style={styles.goalCard}>
              <span style={styles.goalIcon}>{fg.icon || '🎯'}</span>
              <span style={styles.goalTitle}>{fg.title}</span>
              <span style={styles.goalTarget}>{formatKr(fg.target_amount)}</span>
            </div>
          </div>
        ))}
      </div>
    );
  }

  // --- CHORES PAGE ---
  function renderChores() {
    const todayChores = getTodayChores();
    const weekBonus = completions
      .filter(c => c.member_id === member.id)
      .reduce((sum, c) => sum + (c.points_earned || 0), 0);

    return (
      <div style={styles.content}>
        <h1 style={styles.pageTitle}>Mina sysslor</h1>
        <p style={styles.weekStats}>
          Denna vecka: {completions.filter(c => c.member_id === member.id).length} gjorda
          {weekBonus > 0 && ` · ${weekBonus} kr bonus`}
        </p>

        {todayChores.length === 0 ? (
          <div style={styles.empty}>
            <span style={{ fontSize: 40 }}>🎉</span>
            <p style={styles.emptyText}>Inga sysslor idag!</p>
          </div>
        ) : (
          todayChores.map(chore => {
            const done = isCompleted(chore.id);
            const wDone = weekDone(chore.id);
            const wTotal = weekTotal(chore);
            return (
              <button key={chore.id} onClick={() => toggleChore(chore.id)}
                style={{ ...styles.choreCard, opacity: done ? 0.6 : 1, borderLeft: `4px solid ${done ? C.success : chore.chore_type === 'base' ? C.secondary : C.primary}` }}>
                <div style={styles.choreCardTop}>
                  {done ? <CheckCircle size={26} color={C.success} /> : <Circle size={26} color={C.border} />}
                  <div style={{ flex: 1 }}>
                    <span style={{ ...styles.choreCardTitle, textDecoration: done ? 'line-through' : 'none' }}>
                      {chore.icon} {chore.title}
                    </span>
                    <div style={styles.choreBadges}>
                      <span style={{ ...styles.badge, background: chore.chore_type === 'base' ? C.secondaryLight : C.primaryLight, color: chore.chore_type === 'base' ? C.secondary : C.primary }}>
                        {chore.chore_type === 'base' ? 'Grund' : 'Bonus'}
                      </span>
                      {chore.chore_type === 'bonus' && chore.points > 0 && (
                        <span style={{ ...styles.badge, background: C.accentLight, color: C.warning }}>
                          {chore.points} kr/gång
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                {wTotal > 1 && (
                  <div style={styles.progressRow}>
                    <div style={styles.progressBg}>
                      <div style={{ ...styles.progressFill, width: `${(wDone / wTotal) * 100}%` }} />
                    </div>
                    <span style={styles.progressText}>{wDone}/{wTotal} denna vecka</span>
                  </div>
                )}
              </button>
            );
          })
        )}
      </div>
    );
  }

  // --- MONEY PAGE ---
  function renderMoney() {
    return (
      <div style={styles.content}>
        <h1 style={styles.pageTitle}>Mina pengar</h1>

        <div style={{ ...styles.balanceCard, marginBottom: 16 }}>
          <span style={styles.balanceLabel}>Saldo</span>
          <span style={styles.balanceAmount}>{formatKr(balance)}</span>
        </div>

        {/* Personal goals */}
        {personalGoals.length > 0 && (
          <div style={styles.section}>
            <h2 style={styles.sectionTitle}>Mina sparmål</h2>
            {personalGoals.map(g => {
              const saved = transactions.filter(tx => tx.savings_goal_id === g.id).reduce((s, tx) => s + Math.abs(tx.amount), 0);
              const pct = Math.min(100, (saved / g.target_amount) * 100);
              return (
                <div key={g.id} style={styles.goalDetailCard}>
                  <div style={styles.goalDetailHeader}>
                    <span>{g.icon || '🎯'} {g.title}</span>
                    <span style={styles.goalDetailAmount}>{formatKr(saved)} / {formatKr(g.target_amount)}</span>
                  </div>
                  <div style={styles.goalBarBg}>
                    <div style={{ ...styles.goalBarFill, width: `${pct}%`, background: pct >= 100 ? C.success : C.primary }} />
                  </div>
                  <span style={styles.goalPct}>{Math.round(pct)}%{pct >= 100 && ' 🎉'}</span>
                </div>
              );
            })}
          </div>
        )}

        {/* Family goals */}
        {familyGoals.length > 0 && (
          <div style={styles.section}>
            <h2 style={styles.sectionTitle}>Familjemål</h2>
            {familyGoals.map(g => (
              <div key={g.id} style={styles.goalDetailCard}>
                <div style={styles.goalDetailHeader}>
                  <span>{g.icon || '🎯'} {g.title}</span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Transaction history */}
        <div style={styles.section}>
          <h2 style={styles.sectionTitle}>Historik</h2>
          {transactions.length === 0 ? (
            <p style={styles.emptySmall}>Inga transaktioner ännu</p>
          ) : (
            transactions.slice(0, 15).map(tx => (
              <div key={tx.id} style={styles.txRow}>
                <span style={styles.txIcon}>{tx.amount > 0 ? '💰' : '💸'}</span>
                <div style={{ flex: 1 }}>
                  <span style={styles.txLabel}>{tx.description || tx.type}</span>
                  <span style={styles.txDate}>{new Date(tx.created_at).toLocaleDateString('sv-SE')}</span>
                </div>
                <span style={{ ...styles.txAmount, color: tx.amount > 0 ? C.success : C.error }}>
                  {tx.amount > 0 ? '+' : ''}{formatKr(tx.amount)}
                </span>
              </div>
            ))
          )}
        </div>
      </div>
    );
  }

  // --- CALENDAR PAGE ---
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
          const dayChores = chores.filter(c => {
            if (c.assigned_to && c.assigned_to !== member.id) return false;
            if (c.is_recurring && c.recurrence_rule) {
              const days = safeArray(c.recurrence_rule.days);
              if (days.length > 0) return days.includes(i + 1);
            }
            return !c.is_recurring;
          });

          if (dayEvents.length === 0 && dayChores.length === 0) return null;

          return (
            <div key={i} style={{
              ...styles.calDay,
              borderLeft: isToday ? `4px solid ${C.primary}` : '4px solid transparent',
              background: isToday ? C.primaryLight : C.bgCard,
            }}>
              <span style={{ ...styles.calDayName, color: isToday ? C.primary : C.text }}>
                {WEEKDAYS[i]} {d.getDate()}/{d.getMonth() + 1}
              </span>
              {dayEvents.map(ev => (
                <div key={ev.id} style={styles.calEvent}>
                  📅 {ev.start_time ? ev.start_time.slice(0, 5) + ' ' : ''}{ev.title}
                </div>
              ))}
              {dayChores.map(ch => (
                <div key={ch.id} style={styles.calChore}>
                  {ch.icon} {ch.title}
                  {ch.chore_type === 'bonus' && ch.points > 0 && ` (${ch.points} kr)`}
                </div>
              ))}
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <div style={styles.page}>
      {/* Header bar */}
      <div style={styles.topBar}>
        <span style={styles.topAvatar}>{member.avatar}</span>
        <span style={styles.topName}>{member.name}</span>
        <button onClick={onLogout} style={styles.topLogout}>
          <LogOut size={16} />
        </button>
      </div>

      {page === 'home' && renderHome()}
      {page === 'chores' && renderChores()}
      {page === 'money' && renderMoney()}
      {page === 'calendar' && renderCalendar()}

      {/* Bottom nav */}
      <nav style={styles.nav}>
        {NAV.map(item => {
          const Icon = item.icon;
          const active = page === item.id;
          return (
            <button key={item.id} onClick={() => setPage(item.id)}
              style={{ ...styles.navBtn, color: active ? C.primary : C.textMuted }}>
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

// --- Styles ---
const styles = {
  page: { minHeight: '100vh', background: C.bg, fontFamily: F.body, paddingBottom: 80 },
  loading: { minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: C.bg, gap: 12 },
  loadingText: { fontSize: F.sizes.md, color: C.textMuted },
  topBar: { display: 'flex', alignItems: 'center', gap: 8, padding: '12px 16px', background: C.bgCard, borderBottom: `1px solid ${C.borderLight}` },
  topAvatar: { fontSize: 28 },
  topName: { flex: 1, fontFamily: F.heading, fontSize: F.sizes.md, fontWeight: F.weights.bold, color: C.text },
  topLogout: { background: 'none', border: 'none', cursor: 'pointer', padding: 8, color: C.textMuted },
  content: { padding: '12px 16px' },
  greeting: { display: 'flex', alignItems: 'center', gap: 14, marginBottom: 16 },
  greetAvatar: { fontSize: 48 },
  greetName: { fontFamily: F.heading, fontSize: F.sizes.xl, fontWeight: F.weights.extra, color: C.text, margin: 0 },
  greetSub: { fontSize: F.sizes.sm, color: C.textMuted, margin: '4px 0 0' },
  balanceCard: { background: C.bgCard, borderRadius: 16, padding: '16px 20px', border: `1px solid ${C.borderLight}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  balanceLabel: { fontSize: F.sizes.sm, color: C.textMuted },
  balanceAmount: { fontFamily: F.heading, fontSize: F.sizes.xxl, fontWeight: F.weights.extra, color: C.text },
  section: { marginTop: 16 },
  sectionTitle: { fontFamily: F.heading, fontSize: F.sizes.md, fontWeight: F.weights.bold, color: C.text, margin: '0 0 8px', display: 'flex', alignItems: 'center', gap: 6 },
  pageTitle: { fontFamily: F.heading, fontSize: F.sizes.xl, fontWeight: F.weights.extra, color: C.text, margin: '0 0 8px' },
  weekStats: { fontSize: F.sizes.sm, color: C.textMuted, margin: '0 0 12px' },
  choreRow: { display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '10px 14px', background: C.bgCard, borderRadius: 12, border: `1px solid ${C.borderLight}`, marginBottom: 6, cursor: 'pointer', textAlign: 'left' },
  choreTitle: { display: 'block', fontSize: F.sizes.md, fontWeight: F.weights.semi, color: C.text },
  chorePoints: { display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: F.sizes.xs, fontWeight: F.weights.bold, color: C.accent, marginTop: 2 },
  choreCard: { display: 'block', width: '100%', padding: '12px 14px', background: C.bgCard, borderRadius: 12, border: `1px solid ${C.borderLight}`, marginBottom: 8, cursor: 'pointer', textAlign: 'left' },
  choreCardTop: { display: 'flex', alignItems: 'flex-start', gap: 10 },
  choreCardTitle: { display: 'block', fontSize: F.sizes.md, fontWeight: F.weights.semi, color: C.text, marginBottom: 4 },
  choreBadges: { display: 'flex', gap: 4 },
  badge: { padding: '2px 8px', borderRadius: 6, fontSize: F.sizes.xs, fontWeight: F.weights.bold },
  progressRow: { marginTop: 8 },
  progressBg: { height: 6, background: C.borderLight, borderRadius: 3, overflow: 'hidden', marginBottom: 4 },
  progressFill: { height: '100%', background: C.primary, borderRadius: 3 },
  progressText: { fontSize: F.sizes.xs, color: C.textMuted },
  eventRow: { display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', background: C.bgCard, borderRadius: 10, border: `1px solid ${C.borderLight}`, marginBottom: 4 },
  eventDot: { fontSize: 16 },
  eventTitle: { flex: 1, fontSize: F.sizes.sm, color: C.text },
  eventTime: { fontSize: F.sizes.xs, color: C.textMuted },
  mealCard: { padding: '12px 14px', background: C.bgCard, borderRadius: 12, border: `1px solid ${C.borderLight}`, fontSize: F.sizes.md, color: C.text },
  goalCard: { display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px', background: C.bgCard, borderRadius: 12, border: `1px solid ${C.borderLight}` },
  goalIcon: { fontSize: 24 },
  goalTitle: { flex: 1, fontSize: F.sizes.md, fontWeight: F.weights.semi, color: C.text },
  goalTarget: { fontSize: F.sizes.sm, color: C.textMuted },
  goalDetailCard: { padding: 14, background: C.bgCard, borderRadius: 12, border: `1px solid ${C.borderLight}`, marginBottom: 8 },
  goalDetailHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, fontSize: F.sizes.sm, fontWeight: F.weights.semi, color: C.text },
  goalDetailAmount: { fontSize: F.sizes.xs, color: C.textMuted },
  goalBarBg: { height: 8, background: C.borderLight, borderRadius: 4, overflow: 'hidden', marginBottom: 4 },
  goalBarFill: { height: '100%', borderRadius: 4, transition: 'width 0.3s' },
  goalPct: { fontSize: F.sizes.xs, color: C.primary, fontWeight: F.weights.bold },
  txRow: { display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: `1px solid ${C.borderLight}` },
  txIcon: { fontSize: 18 },
  txLabel: { display: 'block', fontSize: F.sizes.sm, color: C.text, fontWeight: F.weights.semi },
  txDate: { fontSize: F.sizes.xs, color: C.textMuted },
  txAmount: { fontSize: F.sizes.md, fontWeight: F.weights.bold, fontFamily: F.heading },
  calDay: { padding: '10px 14px', borderRadius: 12, border: `1px solid ${C.borderLight}`, marginBottom: 6 },
  calDayName: { display: 'block', fontFamily: F.heading, fontSize: F.sizes.sm, fontWeight: F.weights.bold, marginBottom: 4 },
  calEvent: { fontSize: F.sizes.sm, color: C.text, padding: '2px 0' },
  calChore: { fontSize: F.sizes.sm, color: C.textMuted, padding: '2px 0' },
  empty: { textAlign: 'center', padding: '32px 20px' },
  emptyText: { fontSize: F.sizes.md, color: C.textMuted, marginTop: 8 },
  emptySmall: { fontSize: F.sizes.sm, color: C.textMuted },
  nav: { position: 'fixed', bottom: 0, left: 0, right: 0, display: 'flex', justifyContent: 'space-around', alignItems: 'center', background: C.bgCard, borderTop: `1px solid ${C.border}`, padding: '6px 0 env(safe-area-inset-bottom, 8px)', zIndex: 100 },
  navBtn: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, background: 'none', border: 'none', cursor: 'pointer', padding: '4px 6px', minWidth: 44 },
  navLabel: { fontSize: F.sizes.xs, fontFamily: F.heading },
};
