// ============================================
// FamTastic — ChildCalendar (week view + exam registration)
// ============================================

import React, { useState } from 'react';
import { supabase } from './supabaseClient';
import { C, F, safeArray } from './data';
import { Plus, BookOpen } from 'lucide-react';

const WEEKDAYS = ['Mån', 'Tis', 'Ons', 'Tor', 'Fre', 'Lör', 'Sön'];

function fmtTime(t) { return t ? t.slice(0, 5) : ''; }

function fmtDate(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function todayPlus(n) {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return fmtDate(d);
}

export function ChildCalendar({
  today, familyId, memberId,
  getMyEvents, getChoresForDate, isCompletedOnDate,
  schoolSchedule, schoolSubjects, schoolSpecialEvents, exams,
  onReload,
}) {
  const [showExamForm, setShowExamForm] = useState(false);
  const [examForm, setExamForm]         = useState({ subject_id: '', title: '', exam_date: todayPlus(7), study_days: 2 });
  const [saving, setSaving]             = useState(false);
  const [toast, setToast]               = useState(null);

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

  const schedule  = safeArray(schoolSchedule);
  const subjects  = safeArray(schoolSubjects);
  const specials  = safeArray(schoolSpecialEvents);
  const allExams  = safeArray(exams);

  const subjectMap = {};
  subjects.forEach(s => { subjectMap[s.id] = s; });

  // Subjects this child actually has in their schedule
  const mySubjectIds = [...new Set(schedule.filter(sl => sl.member_id === memberId).map(sl => sl.subject_id))];
  const mySubjects   = mySubjectIds.map(id => subjectMap[id]).filter(Boolean);

  function showToast(msg) {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  }

  function openExamForm() {
    setExamForm({ subject_id: '', title: '', exam_date: todayPlus(7), study_days: 2 });
    setShowExamForm(true);
  }

  function pickSubject(subj) {
    setExamForm(prev => ({
      ...prev,
      subject_id: prev.subject_id === subj.id ? '' : subj.id,
      title: prev.subject_id === subj.id ? prev.title : `${subj.short_name || subj.title}-prov`,
    }));
  }

  async function saveExam() {
    if (!examForm.title.trim() || !examForm.exam_date) return;
    setSaving(true);
    const subj = examForm.subject_id ? subjectMap[examForm.subject_id] : null;
    const { data, error } = await supabase.rpc('child_create_exam', {
      p_family_id:  familyId,
      p_member_id:  memberId,
      p_title:      examForm.title.trim(),
      p_subject_id: examForm.subject_id || null,
      p_exam_date:  examForm.exam_date,
      p_study_days: examForm.study_days,
      p_icon:       subj?.icon || '📝',
    });
    setSaving(false);
    if (error || !data?.success) {
      showToast('Kunde inte spara provet, försök igen');
    } else {
      setShowExamForm(false);
      showToast(`📝 Prov sparat! ${examForm.study_days} pluggdag${examForm.study_days > 1 ? 'ar' : ''} skapade.`);
      if (onReload) onReload();
    }
  }

  // ── Schedule helpers ──────────────────────────────────────────────────────────

  function getLessons(dateStr, dow) {
    if (dow > 5) return [];
    const daySpecials = specials.filter(se => se.event_date === dateStr);
    const fullDay = daySpecials.find(se => se.period === 'full_day');
    if (fullDay) return [{ special: true, title: fullDay.title, icon: fullDay.icon || '🎉', period: 'full_day' }];

    const morningSpecial   = daySpecials.find(se => se.period === 'morning');
    const afternoonSpecial = daySpecials.find(se => se.period === 'afternoon');

    const dayLessons = schedule
      .filter(sl => sl.day_of_week === dow)
      .sort((a, b) => (a.start_time || '').localeCompare(b.start_time || ''));

    return dayLessons.map(sl => {
      const startHour = parseInt((sl.start_time || '08:00').split(':')[0], 10);
      if (morningSpecial && startHour < 12) return { special: true, title: morningSpecial.title, icon: morningSpecial.icon || '🎉', period: 'morning' };
      if (afternoonSpecial && startHour >= 12) return { special: true, title: afternoonSpecial.title, icon: afternoonSpecial.icon || '🎉', period: 'afternoon' };
      const subj = subjectMap[sl.subject_id];
      return { special: false, title: subj?.title || 'Lektion', icon: subj?.icon || '📚', color: subj?.color || C.secondary, startTime: sl.start_time, endTime: sl.end_time };
    }).filter((lesson, i, arr) => {
      if (!lesson.special) return true;
      return i === arr.findIndex(l => l.special && l.period === lesson.period);
    });
  }

  function getExamsForDate(dateStr) {
    return allExams.filter(e => e.exam_date === dateStr);
  }

  // ── Render ────────────────────────────────────────────────────────────────────

  return (
    <div style={styles.content}>
      {toast && <div style={styles.toast}>{toast}</div>}

      <div style={styles.pageHeader}>
        <h1 style={styles.pageTitle}>Min vecka</h1>
        <button onClick={openExamForm} style={styles.addExamBtn}>
          <BookOpen size={15} />
          <span>Lägg till prov</span>
          <Plus size={15} />
        </button>
      </div>

      {weekDates.map((d, i) => {
        const dateStr   = fmtDate(d);
        const isToday   = dateStr === today;
        const dow       = i + 1;
        const dayEvents = getMyEvents(dateStr);
        const dayChores = getChoresForDate(dateStr);
        const dayLessons = getLessons(dateStr, dow);
        const dayExams  = getExamsForDate(dateStr);

        if (dayEvents.length === 0 && dayChores.length === 0 && dayLessons.length === 0 && dayExams.length === 0) return null;

        return (
          <div key={i} style={{ ...styles.calDay, background: isToday ? C.primaryLight : C.bgCard, borderColor: isToday ? C.primary : C.borderLight }}>
            <span style={{ ...styles.calDayName, color: isToday ? C.primary : C.text }}>
              {WEEKDAYS[i]} {d.getDate()}/{d.getMonth() + 1}
            </span>

            {dayExams.map(exam => (
              <div key={exam.id} style={styles.examRow}>
                <span style={{ fontSize: 14 }}>{exam.icon || '📝'}</span>
                <span style={styles.examTitle}>{exam.title}</span>
                <span style={styles.examBadge}>PROV</span>
              </div>
            ))}

            {dayLessons.length > 0 && (
              <div style={styles.lessonBlock}>
                {dayLessons.map((lesson, li) => (
                  <div key={li} style={{ ...styles.lessonRow, borderLeftColor: lesson.special ? C.accent : lesson.color }}>
                    <span style={{ fontSize: 14 }}>{lesson.icon}</span>
                    {lesson.special ? (
                      <span style={styles.lessonTitle}>{lesson.title}</span>
                    ) : (
                      <>
                        <span style={styles.lessonTime}>{fmtTime(lesson.startTime)}–{fmtTime(lesson.endTime)}</span>
                        <span style={styles.lessonTitle}>{lesson.title}</span>
                      </>
                    )}
                  </div>
                ))}
              </div>
            )}

            {dayEvents.map(ev => (
              <div key={ev.id} style={styles.calEvent}>
                📅 {ev.start_time ? ev.start_time.slice(0, 5) + ' ' : ''}{ev.title}
              </div>
            ))}

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

      <div style={{ height: 80 }} />

      {/* ── Exam form modal ───────────────────────────────────────────────────── */}
      {showExamForm && (
        <div style={styles.overlay}>
          <div style={styles.modal}>
            <h3 style={styles.modalTitle}>📝 Lägg till prov</h3>

            {mySubjects.length > 0 && (
              <>
                <label style={styles.fieldLabel}>Ämne</label>
                <div style={styles.subjectPicker}>
                  {mySubjects.map(subj => (
                    <button key={subj.id} onClick={() => pickSubject(subj)} style={{
                      ...styles.subjectBtn,
                      background:  examForm.subject_id === subj.id ? (subj.color || C.primary) : C.bgCard,
                      color:       examForm.subject_id === subj.id ? '#fff' : C.text,
                      borderColor: examForm.subject_id === subj.id ? (subj.color || C.primary) : C.borderLight,
                    }}>
                      {subj.icon} {subj.short_name || subj.title}
                    </button>
                  ))}
                </div>
              </>
            )}

            <label style={styles.fieldLabel}>Titel</label>
            <input
              type="text" placeholder="T.ex. Matteprov kap 5"
              value={examForm.title}
              onChange={e => setExamForm(p => ({ ...p, title: e.target.value }))}
              style={styles.input} autoFocus
            />

            <label style={styles.fieldLabel}>Datum</label>
            <input
              type="date" value={examForm.exam_date}
              onChange={e => setExamForm(p => ({ ...p, exam_date: e.target.value }))}
              style={styles.input}
            />

            <label style={styles.fieldLabel}>Antal pluggdagar</label>
            <div style={styles.studyRow}>
              {[1, 2, 3, 4, 5].map(n => (
                <button key={n} onClick={() => setExamForm(p => ({ ...p, study_days: n }))} style={{
                  ...styles.studyBtn,
                  background:  examForm.study_days === n ? C.primary : C.bgCard,
                  color:       examForm.study_days === n ? '#fff' : C.text,
                  borderColor: examForm.study_days === n ? C.primary : C.borderLight,
                }}>
                  {n}
                </button>
              ))}
            </div>
            <p style={styles.studyHint}>
              {examForm.study_days} pluggsyssla{examForm.study_days > 1 ? 'or' : ''} skapas automatiskt
            </p>

            <div style={styles.modalFooter}>
              <button onClick={() => setShowExamForm(false)} style={styles.cancelBtn}>Avbryt</button>
              <button
                onClick={saveExam}
                disabled={saving || !examForm.title.trim() || !examForm.exam_date}
                style={{ ...styles.saveBtn, opacity: saving || !examForm.title.trim() || !examForm.exam_date ? 0.5 : 1 }}
              >
                {saving ? 'Sparar...' : 'Spara prov'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const styles = {
  content: { padding: '12px 16px', position: 'relative' },
  toast: {
    position: 'fixed', top: 16, left: '50%', transform: 'translateX(-50%)',
    background: C.text, color: '#fff', padding: '10px 20px', borderRadius: 99,
    fontSize: F.sizes.sm, fontWeight: F.weights.bold, fontFamily: F.heading,
    zIndex: 400, boxShadow: '0 4px 16px rgba(0,0,0,0.2)', whiteSpace: 'nowrap',
  },
  pageHeader: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  pageTitle: { fontFamily: F.heading, fontSize: F.sizes.xl, fontWeight: F.weights.extra, color: C.text, margin: 0 },
  addExamBtn: {
    display: 'inline-flex', alignItems: 'center', gap: 5,
    padding: '8px 14px', borderRadius: 12, border: `1.5px solid ${C.primary}`,
    background: C.primaryLight, color: C.primaryDark,
    fontSize: F.sizes.xs, fontWeight: F.weights.bold, fontFamily: F.heading, cursor: 'pointer',
  },
  calDay: { padding: '12px 14px', borderRadius: 14, border: '1.5px solid', marginBottom: 8 },
  calDayName: { display: 'block', fontFamily: F.heading, fontSize: F.sizes.sm, fontWeight: F.weights.bold, marginBottom: 4 },
  examRow: { display: 'flex', alignItems: 'center', gap: 6, padding: '6px 10px', background: C.primaryLight, borderRadius: 10, border: `1.5px solid ${C.primary}`, marginBottom: 4 },
  examTitle: { flex: 1, fontSize: F.sizes.sm, fontWeight: F.weights.bold, fontFamily: F.heading, color: C.primaryDark },
  examBadge: { fontSize: 10, fontWeight: F.weights.extra, fontFamily: F.heading, color: '#fff', background: C.primary, padding: '2px 8px', borderRadius: 99 },
  lessonBlock: { marginBottom: 4 },
  lessonRow: { display: 'flex', alignItems: 'center', gap: 6, padding: '4px 8px', borderLeft: '3px solid', borderRadius: '0 8px 8px 0', marginBottom: 2, background: 'rgba(0,0,0,0.02)' },
  lessonTime: { fontSize: F.sizes.xs, color: C.textMuted, fontFamily: F.heading, fontWeight: F.weights.semi, minWidth: 72, flexShrink: 0 },
  lessonTitle: { fontSize: F.sizes.sm, color: C.text, fontFamily: F.heading, fontWeight: F.weights.semi },
  calEvent: { fontSize: F.sizes.sm, color: C.text, fontFamily: F.heading, padding: '2px 0' },
  calChore: { display: 'flex', alignItems: 'center', gap: 6, fontSize: F.sizes.sm, color: C.text, fontFamily: F.heading, padding: '2px 0' },
  calChorePoints: { fontSize: F.sizes.xs, color: C.primary, fontWeight: F.weights.bold, fontFamily: F.heading, marginLeft: 'auto' },
  // Modal
  overlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', zIndex: 300, padding: '0 0 env(safe-area-inset-bottom, 0)' },
  modal: { width: '100%', maxWidth: 480, background: C.bgCard, borderRadius: '20px 20px 0 0', padding: '24px 20px 32px' },
  modalTitle: { fontFamily: F.heading, fontSize: F.sizes.lg, fontWeight: F.weights.bold, color: C.text, margin: '0 0 16px' },
  fieldLabel: { display: 'block', fontSize: F.sizes.xs, fontWeight: F.weights.bold, fontFamily: F.heading, color: C.textMuted, margin: '12px 0 6px', textTransform: 'uppercase', letterSpacing: 0.4 },
  subjectPicker: { display: 'flex', flexWrap: 'wrap', gap: 6 },
  subjectBtn: { padding: '8px 12px', borderRadius: 10, border: '1.5px solid', fontSize: F.sizes.sm, fontWeight: F.weights.bold, fontFamily: F.heading, cursor: 'pointer', minHeight: 40 },
  input: { width: '100%', padding: '11px 14px', borderRadius: 12, border: `1.5px solid ${C.border}`, fontSize: F.sizes.md, fontFamily: F.heading, color: C.text, background: C.bgCard, boxSizing: 'border-box' },
  studyRow: { display: 'flex', gap: 8 },
  studyBtn: { width: 48, height: 48, borderRadius: 12, border: '1.5px solid', fontSize: F.sizes.md, fontWeight: F.weights.bold, fontFamily: F.heading, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  studyHint: { fontSize: F.sizes.xs, color: C.textMuted, fontFamily: F.heading, margin: '6px 0 0', fontStyle: 'italic' },
  modalFooter: { display: 'flex', gap: 8, marginTop: 20 },
  cancelBtn: { flex: 1, padding: '12px', borderRadius: 12, border: `1.5px solid ${C.border}`, background: C.bgCard, color: C.text, fontSize: F.sizes.sm, fontWeight: F.weights.bold, fontFamily: F.heading, cursor: 'pointer' },
  saveBtn: { flex: 1, padding: '12px', borderRadius: 12, border: 'none', background: C.primary, color: '#fff', fontSize: F.sizes.sm, fontWeight: F.weights.bold, fontFamily: F.heading, cursor: 'pointer' },
};
