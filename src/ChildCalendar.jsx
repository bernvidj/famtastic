// ============================================
// FamTastic — ChildCalendar (week view with lessons + events + chores + exams)
// ============================================

import React from 'react';
import { C, F, safeArray } from './data';

const WEEKDAYS = ['Mån', 'Tis', 'Ons', 'Tor', 'Fre', 'Lör', 'Sön'];

function fmtTime(t) { return t ? t.slice(0, 5) : ''; }

export function ChildCalendar({
  today, getMyEvents, getChoresForDate, isCompletedOnDate,
  schoolSchedule, schoolSubjects, schoolSpecialEvents, exams,
}) {
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

  const schedule = safeArray(schoolSchedule);
  const subjects = safeArray(schoolSubjects);
  const specials = safeArray(schoolSpecialEvents);
  const allExams = safeArray(exams);

  const subjectMap = {};
  subjects.forEach(s => { subjectMap[s.id] = s; });

  function fmtD(d) {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }

  function getLessons(dateStr, dow) {
    if (dow > 5) return [];
    const daySpecials = specials.filter(se => se.event_date === dateStr);
    const fullDay = daySpecials.find(se => se.period === 'full_day');
    if (fullDay) return [{ special: true, title: fullDay.title, icon: fullDay.icon || '🎉', period: 'full_day' }];

    const morningSpecial = daySpecials.find(se => se.period === 'morning');
    const afternoonSpecial = daySpecials.find(se => se.period === 'afternoon');

    const dayLessons = schedule
      .filter(sl => sl.day_of_week === dow)
      .sort((a, b) => (a.start_time || '').localeCompare(b.start_time || ''));

    return dayLessons.map(sl => {
      const startHour = parseInt((sl.start_time || '08:00').split(':')[0], 10);
      if (morningSpecial && startHour < 12) {
        return { special: true, title: morningSpecial.title, icon: morningSpecial.icon || '🎉', period: 'morning', time: sl.start_time };
      }
      if (afternoonSpecial && startHour >= 12) {
        return { special: true, title: afternoonSpecial.title, icon: afternoonSpecial.icon || '🎉', period: 'afternoon', time: sl.start_time };
      }
      const subj = subjectMap[sl.subject_id];
      return {
        special: false,
        title: subj?.title || 'Lektion',
        icon: subj?.icon || '📚',
        color: subj?.color || C.secondary,
        startTime: sl.start_time,
        endTime: sl.end_time,
      };
    }).filter((lesson, i, arr) => {
      if (!lesson.special) return true;
      return i === arr.findIndex(l => l.special && l.period === lesson.period);
    });
  }

  function getExamsForDate(dateStr) {
    return allExams.filter(e => e.exam_date === dateStr);
  }

  return (
    <div style={styles.content}>
      <h1 style={styles.pageTitle}>Min vecka</h1>
      {weekDates.map((d, i) => {
        const dateStr = fmtD(d);
        const isToday = dateStr === today;
        const dow = i + 1;
        const dayEvents = getMyEvents(dateStr);
        const dayChores = getChoresForDate(dateStr);
        const dayLessons = getLessons(dateStr, dow);
        const dayExams = getExamsForDate(dateStr);

        if (dayEvents.length === 0 && dayChores.length === 0 && dayLessons.length === 0 && dayExams.length === 0) return null;

        return (
          <div key={i} style={{
            ...styles.calDay,
            background: isToday ? C.primaryLight : C.bgCard,
            borderColor: isToday ? C.primary : C.borderLight,
          }}>
            <span style={{ ...styles.calDayName, color: isToday ? C.primary : C.text }}>
              {WEEKDAYS[i]} {d.getDate()}/{d.getMonth() + 1}
            </span>

            {/* Exams */}
            {dayExams.map(exam => (
              <div key={exam.id} style={styles.examRow}>
                <span style={{ fontSize: 14 }}>{exam.icon || '📝'}</span>
                <span style={styles.examTitle}>{exam.title}</span>
                <span style={styles.examBadge}>PROV</span>
              </div>
            ))}

            {/* Lessons */}
            {dayLessons.length > 0 && (
              <div style={styles.lessonBlock}>
                {dayLessons.map((lesson, li) => (
                  <div key={li} style={{
                    ...styles.lessonRow,
                    borderLeftColor: lesson.special ? C.accent : lesson.color,
                  }}>
                    <span style={{ fontSize: 14 }}>{lesson.icon}</span>
                    {lesson.special ? (
                      <span style={styles.lessonTitle}>{lesson.title}</span>
                    ) : (
                      <>
                        <span style={styles.lessonTime}>
                          {fmtTime(lesson.startTime)}–{fmtTime(lesson.endTime)}
                        </span>
                        <span style={styles.lessonTitle}>{lesson.title}</span>
                      </>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Events */}
            {dayEvents.map(ev => (
              <div key={ev.id} style={styles.calEvent}>
                📅 {ev.start_time ? ev.start_time.slice(0, 5) + ' ' : ''}{ev.title}
              </div>
            ))}

            {/* Chores */}
            {dayChores.map(ch => {
              const done = isCompletedOnDate(ch.id, dateStr);
              return (
                <div key={ch.id} style={{ ...styles.calChore, opacity: done ? 0.6 : 1 }}>
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
  // Exams
  examRow: {
    display: 'flex', alignItems: 'center', gap: 6, padding: '6px 10px',
    background: C.primaryLight, borderRadius: 10, border: `1.5px solid ${C.primary}`, marginBottom: 4,
  },
  examTitle: { flex: 1, fontSize: F.sizes.sm, fontWeight: F.weights.bold, fontFamily: F.heading, color: C.primaryDark },
  examBadge: {
    fontSize: 10, fontWeight: F.weights.extra, fontFamily: F.heading,
    color: '#fff', background: C.primary, padding: '2px 8px', borderRadius: 99,
  },
  // Lessons
  lessonBlock: { marginBottom: 4 },
  lessonRow: {
    display: 'flex', alignItems: 'center', gap: 6, padding: '4px 8px',
    borderLeft: '3px solid', borderRadius: '0 8px 8px 0', marginBottom: 2,
    background: 'rgba(0,0,0,0.02)',
  },
  lessonTime: {
    fontSize: F.sizes.xs, color: C.textMuted, fontFamily: F.heading,
    fontWeight: F.weights.semi, minWidth: 72, flexShrink: 0,
  },
  lessonTitle: { fontSize: F.sizes.sm, color: C.text, fontFamily: F.heading, fontWeight: F.weights.semi },
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
