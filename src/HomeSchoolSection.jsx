// ============================================
// FamTastic — HomeSchoolSection
// Extracted from Home.jsx — "Skola idag" section
// ============================================

import React from 'react';
import { C, F, S, safeArray } from './data';
import { GraduationCap } from 'lucide-react';

export function HomeSchoolSection({ children, schoolSchedule, schoolSubjects, schoolSpecialEvents, schoolExams, today, todayDow }) {
  // Build subject lookup
  const subjectMap = {};
  schoolSubjects.forEach(s => { subjectMap[s.id] = s; });

  function childTodayLessons(childId) {
    if (todayDow > 5) return { lessons: [], special: null };
    const daySpecials = schoolSpecialEvents.filter(
      se => se.member_id === childId && se.event_date === today
    );
    const fullDay = daySpecials.find(se => se.period === 'full_day');
    if (fullDay) return { lessons: [], special: fullDay };

    const lessons = schoolSchedule
      .filter(sl => sl.member_id === childId && sl.day_of_week === todayDow)
      .sort((a, b) => (a.start_time || '').localeCompare(b.start_time || ''))
      .map(sl => {
        const startHour = parseInt((sl.start_time || '08:00').split(':')[0], 10);
        const morningSpec = daySpecials.find(se => se.period === 'morning');
        const afternoonSpec = daySpecials.find(se => se.period === 'afternoon');
        if (morningSpec && startHour < 12) return null;
        if (afternoonSpec && startHour >= 12) return null;
        const subj = subjectMap[sl.subject_id];
        return {
          title: subj?.title || 'Lektion',
          icon: subj?.icon || '📚',
          color: subj?.color || C.secondary,
          time: sl.start_time ? sl.start_time.slice(0, 5) : '',
          endTime: sl.end_time ? sl.end_time.slice(0, 5) : '',
        };
      })
      .filter(Boolean);
    const morningSpec = daySpecials.find(se => se.period === 'morning');
    const afternoonSpec = daySpecials.find(se => se.period === 'afternoon');
    return { lessons, morningSpecial: morningSpec, afternoonSpecial: afternoonSpec };
  }

  function childUpcomingExams(childId) {
    return schoolExams.filter(e => e.member_id === childId).slice(0, 3);
  }

  function daysUntilExam(dateStr) {
    const t = new Date(); t.setHours(0, 0, 0, 0);
    const target = new Date(dateStr + 'T12:00:00'); target.setHours(0, 0, 0, 0);
    return Math.round((target - t) / 86400000);
  }

  // Filter to children who have school content today
  const childrenWithSchool = children.filter(child => {
    const { lessons, special, morningSpecial, afternoonSpecial } = childTodayLessons(child.id);
    return lessons.length > 0 || special || morningSpecial || afternoonSpecial || childUpcomingExams(child.id).length > 0;
  });

  if (childrenWithSchool.length === 0) return null;

  return (
    <div style={styles.section}>
      <p style={S.sectionLabel}><GraduationCap size={12} color={C.textMuted} /> Skola idag</p>
      {childrenWithSchool.map(child => {
        const { lessons, special, morningSpecial, afternoonSpecial } = childTodayLessons(child.id);
        return (
          <div key={child.id} style={styles.schoolCard}>
            <div style={styles.schoolHeader}>
              <div style={{ ...styles.schoolAvatar, background: child.color || C.primary }}>
                <span style={{ fontSize: 16 }}>{child.avatar}</span>
              </div>
              <span style={styles.schoolName}>{child.name}</span>
            </div>
            {special && (
              <div style={styles.schoolSpecialBanner}>
                <span style={{ fontSize: 14 }}>{special.icon || '🎉'}</span>
                <span style={styles.schoolSpecialText}>{special.title}</span>
              </div>
            )}
            {morningSpecial && (
              <div style={styles.schoolSpecialBanner}>
                <span style={{ fontSize: 14 }}>{morningSpecial.icon || '🎉'}</span>
                <span style={styles.schoolSpecialText}>{morningSpecial.title} (fm)</span>
              </div>
            )}
            {afternoonSpecial && (
              <div style={styles.schoolSpecialBanner}>
                <span style={{ fontSize: 14 }}>{afternoonSpecial.icon || '🎉'}</span>
                <span style={styles.schoolSpecialText}>{afternoonSpecial.title} (em)</span>
              </div>
            )}
            {lessons.length > 0 && (
              <div style={styles.schoolLessons}>
                {lessons.map((l, li) => (
                  <div key={li} style={{ ...styles.schoolLesson, borderLeftColor: l.color }}>
                    <span style={{ fontSize: 13 }}>{l.icon}</span>
                    <span style={styles.schoolLessonTime}>{l.time}{l.endTime ? `–${l.endTime}` : ''}</span>
                    <span style={styles.schoolLessonTitle}>{l.title}</span>
                  </div>
                ))}
              </div>
            )}
            {childUpcomingExams(child.id).length > 0 && (
              <div style={{ marginTop: lessons.length > 0 ? 6 : 0 }}>
                {childUpcomingExams(child.id).map(exam => {
                  const days = daysUntilExam(exam.exam_date);
                  const urgent = days <= 2;
                  return (
                    <div key={exam.id} style={{
                      ...styles.schoolExamRow,
                      background: urgent ? C.primaryLight : 'rgba(0,0,0,0.02)',
                      borderColor: urgent ? C.primary : C.borderLight,
                    }}>
                      <span style={{ fontSize: 13 }}>{exam.icon || '📝'}</span>
                      <span style={styles.schoolExamTitle}>{exam.title}</span>
                      <span style={{ ...styles.schoolExamDays, color: urgent ? C.primary : C.textMuted }}>
                        {days === 0 ? 'Idag!' : days === 1 ? 'Imorgon' : `${days}d`}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

const styles = {
  section: { padding: '0 16px', marginBottom: 16 },
  schoolCard: { padding: 12, background: C.bgCard, borderRadius: 14, border: `1.5px solid ${C.borderLight}`, marginBottom: 8, boxShadow: '0 2px 8px rgba(0,0,0,0.04)' },
  schoolHeader: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 },
  schoolAvatar: { width: 28, height: 28, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  schoolName: { fontSize: F.sizes.sm, fontWeight: F.weights.bold, fontFamily: F.heading, color: C.text },
  schoolSpecialBanner: { display: 'flex', alignItems: 'center', gap: 6, padding: '6px 10px', background: C.accentLight, borderRadius: 10, border: `1px solid ${C.accent}`, marginBottom: 4 },
  schoolSpecialText: { fontSize: F.sizes.sm, fontWeight: F.weights.semi, fontFamily: F.heading, color: '#92400E' },
  schoolLessons: { display: 'flex', flexDirection: 'column', gap: 2 },
  schoolLesson: { display: 'flex', alignItems: 'center', gap: 6, padding: '3px 8px', borderLeft: '3px solid', borderRadius: '0 8px 8px 0', background: 'rgba(0,0,0,0.02)' },
  schoolLessonTime: { fontSize: F.sizes.xs, color: C.textMuted, fontFamily: F.heading, fontWeight: F.weights.semi, minWidth: 68, flexShrink: 0 },
  schoolLessonTitle: { fontSize: F.sizes.sm, color: C.text, fontFamily: F.heading, fontWeight: F.weights.semi },
  schoolExamRow: { display: 'flex', alignItems: 'center', gap: 6, padding: '5px 10px', borderRadius: 10, border: '1px solid', marginBottom: 3 },
  schoolExamTitle: { flex: 1, fontSize: F.sizes.xs, fontWeight: F.weights.bold, fontFamily: F.heading, color: C.text },
  schoolExamDays: { fontSize: F.sizes.xs, fontWeight: F.weights.extra, fontFamily: F.heading, flexShrink: 0 },
};
