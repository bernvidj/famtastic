// ============================================
// FamTastic — ChildCalendar (week view with events + chores)
// Extracted from ChildApp
// ============================================

import React from 'react';
import { C, F } from './data';

const WEEKDAYS = ['Mån', 'Tis', 'Ons', 'Tor', 'Fre', 'Lör', 'Sön'];

export function ChildCalendar({ today, getMyEvents, getChoresForDate, isCompletedOnDate }) {
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

const styles = {
  content: { padding: '12px 16px' },
  pageTitle: { fontFamily: F.heading, fontSize: F.sizes.xl, fontWeight: F.weights.extra, color: C.text, margin: '0 0 4px' },
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
};
