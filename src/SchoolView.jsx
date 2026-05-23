// ============================================
// FamTastic — SchoolView (parent view: schedules + exams)
// ============================================

import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import { C, F, S, todayStr, safeArray } from './data';
import { SchoolSetup } from './SchoolSetup';
import { Plus, Edit3, Calendar, Trash2, BookOpen } from 'lucide-react';

const DAYS = [
  { value: 1, label: 'Måndag' },
  { value: 2, label: 'Tisdag' },
  { value: 3, label: 'Onsdag' },
  { value: 4, label: 'Torsdag' },
  { value: 5, label: 'Fredag' },
];
const SHORT_DAYS = ['Mån', 'Tis', 'Ons', 'Tor', 'Fre'];

// ─── Bakgrundsformer ──────────────────────────────────────────────────────────
function BgShapes() {
  return (
    <svg style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', opacity: 0.18, pointerEvents: 'none' }}
      viewBox="0 0 400 800" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid slice">
      <path d="M -40 -30 Q 100 -60, 180 80 Q 230 180, 120 240 Q 20 290, -30 180 Q -80 80, -40 -30 Z" fill="#3CB4A6" />
      <path d="M 300 -20 Q 430 10, 440 140 Q 448 230, 350 260 Q 260 285, 230 190 Q 205 105, 300 -20 Z" fill="#A8E6DF" />
      <path d="M 220 640 Q 400 600, 440 720 Q 462 800, 320 810 Q 180 818, 160 720 Q 145 640, 220 640 Z" fill="#FF7A59" />
      <path d="M -50 700 Q 50 650, 130 710 Q 185 755, 140 820 Q 75 855, -15 820 Q -90 790, -50 700 Z" fill="#FFA071" />
    </svg>
  );
}

export function SchoolView({ familyId, member, members }) {
  const [schedules, setSchedules] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [specialEvents, setSpecialEvents] = useState([]);
  const [rules, setRules] = useState([]);
  const [exams, setExams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [setupChild, setSetupChild] = useState(null);
  const [selectedDay, setSelectedDay] = useState(null);
  const [addingEvent, setAddingEvent] = useState(null);
  const [eventForm, setEventForm] = useState({ title: '', event_date: '', period: 'full_day' });
  const [addingExam, setAddingExam] = useState(null);
  const [examForm, setExamForm] = useState({ subject_id: '', title: '', exam_date: '', study_days: 2, notes: '' });

  const today = todayStr();
  const todayDow = (() => { const d = new Date().getDay(); return d === 0 || d === 6 ? 1 : d; })();
  const weekStartStr = (() => {
    const d = new Date();
    const dow = d.getDay() || 7;
    d.setDate(d.getDate() - dow + 1);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  })();
  const viewDay = selectedDay || todayDow;
  const children = members.filter(m => m.role === 'child');

  useEffect(() => { loadData(); }, [familyId]);

  async function loadData() {
    setLoading(true);
    const [schRes, subRes, evRes, ruRes, exRes] = await Promise.all([
      supabase.from('school_schedule').select('*').eq('family_id', familyId),
      supabase.from('school_subjects').select('*').or(`is_global.eq.true,family_id.eq.${familyId}`),
      supabase.from('school_special_events').select('*').eq('family_id', familyId).gte('event_date', weekStartStr),
      supabase.from('school_rules').select('*').eq('family_id', familyId).eq('is_active', true),
      supabase.from('school_exams').select('*').eq('family_id', familyId).gte('exam_date', today).order('exam_date'),
    ]);
    setSchedules(schRes.data || []);
    setSubjects(subRes.data || []);
    setSpecialEvents(evRes.data || []);
    setRules(ruRes.data || []);
    setExams(exRes.data || []);
    setLoading(false);
  }

  function getSubject(id) { return subjects.find(s => s.id === id); }

  function childSchedule(childId, day) {
    return schedules.filter(s => s.member_id === childId && s.day_of_week === day)
      .sort((a, b) => a.start_time.localeCompare(b.start_time));
  }

  function childHasSchedule(childId) { return schedules.some(s => s.member_id === childId); }

  function getSpecialEvent(childId, dateStr) {
    return specialEvents.find(e => e.member_id === childId && e.event_date === dateStr);
  }

  function childExams(childId) { return exams.filter(e => e.member_id === childId); }

  function dateForDay(dayOfWeek) {
    const now = new Date();
    const currentDow = now.getDay() || 7;
    const diff = dayOfWeek - currentDow;
    const target = new Date(now);
    target.setDate(now.getDate() + diff);
    return `${target.getFullYear()}-${String(target.getMonth() + 1).padStart(2, '0')}-${String(target.getDate()).padStart(2, '0')}`;
  }

  function fmtDateShort(dateStr) {
    const d = new Date(dateStr + 'T12:00:00');
    return `${d.getDate()}/${d.getMonth() + 1}`;
  }

  function daysUntil(dateStr) {
    const t = new Date(); t.setHours(0, 0, 0, 0);
    const target = new Date(dateStr + 'T12:00:00'); target.setHours(0, 0, 0, 0);
    return Math.round((target - t) / 86400000);
  }

  async function saveSpecialEvent() {
    if (!addingEvent || !eventForm.title.trim() || !eventForm.event_date) return;
    await supabase.from('school_special_events').insert({
      family_id: familyId, member_id: addingEvent.id,
      event_date: eventForm.event_date, period: eventForm.period,
      title: eventForm.title.trim(), icon: '🎒', replaces_schedule: true,
    });
    setAddingEvent(null);
    setEventForm({ title: '', event_date: '', period: 'full_day' });
    loadData();
  }

  async function saveExam() {
    if (!addingExam || !examForm.title.trim() || !examForm.exam_date) return;
    const subj = examForm.subject_id ? getSubject(examForm.subject_id) : null;
    const icon = subj?.icon || '📝';

    const { data: examData, error } = await supabase.from('school_exams').insert({
      family_id: familyId, member_id: addingExam.id,
      subject_id: examForm.subject_id || null, exam_date: examForm.exam_date,
      title: examForm.title.trim(), icon, study_days: examForm.study_days,
      notes: examForm.notes || null,
    }).select().single();

    if (error || !examData) return;

    const studyDays = Math.max(1, Math.min(7, examForm.study_days));
    const examDate = new Date(examForm.exam_date + 'T12:00:00');
    const choresToInsert = [];

    for (let i = studyDays; i >= 1; i--) {
      const studyDate = new Date(examDate);
      studyDate.setDate(examDate.getDate() - i);
      const dateStr = `${studyDate.getFullYear()}-${String(studyDate.getMonth() + 1).padStart(2, '0')}-${String(studyDate.getDate()).padStart(2, '0')}`;
      const dow = studyDate.getDay();
      if (dow === 0 || dow === 6) continue;
      choresToInsert.push({
        family_id: familyId,
        title: `Plugga ${subj?.short_name || examForm.title.trim()}`,
        icon: '📖', points: 0, chore_type: 'base', is_recurring: false,
        assigned_to: addingExam.id, scheduled_date: dateStr,
        reference_id: examData.id, difficulty: 'medium', created_by: member.id,
      });
    }

    if (choresToInsert.length > 0) {
      await supabase.from('chores').insert(choresToInsert);
    }

    setAddingExam(null);
    setExamForm({ subject_id: '', title: '', exam_date: '', study_days: 2, notes: '' });
    loadData();
  }

  async function deleteExam(examId) {
    if (!window.confirm('Ta bort provet och kopplade pluggsysslor?')) return;
    await supabase.from('chores').delete().eq('family_id', familyId).eq('reference_id', examId);
    await supabase.from('school_exams').delete().eq('id', examId);
    loadData();
  }

  async function handleDeleteSchedule(child) {
    if (!window.confirm(`Ta bort ${child.name}s hela schema? Kopplade påminnelser och auto-sysslor tas också bort.`)) return;
    await supabase.from('chores').delete().eq('family_id', familyId).eq('assigned_to', child.id).not('reference_id', 'is', null);
    await supabase.from('school_rules').delete().eq('member_id', child.id);
    await supabase.from('school_schedule').delete().eq('member_id', child.id);
    await supabase.from('school_special_events').delete().eq('member_id', child.id);
    loadData();
  }

  if (setupChild) {
    return (
      <SchoolSetup familyId={familyId} memberId={setupChild.id} childName={setupChild.name}
        onClose={() => setSetupChild(null)} onDone={() => { setSetupChild(null); loadData(); }} />
    );
  }

  const childSubjects = addingExam
    ? [...new Set(schedules.filter(s => s.member_id === addingExam.id).map(s => s.subject_id))]
        .map(id => getSubject(id)).filter(Boolean)
    : [];

  return (
    <div style={styles.page}>
      <BgShapes />

      <div style={{ position: 'relative', zIndex: 1 }}>
        <div style={styles.headerRow}>
          <h1 style={styles.pageTitle}>🎒 Skola</h1>
        </div>

        {/* Day picker */}
        <div style={styles.dayPicker}>
          {DAYS.map(d => {
            const isToday = d.value === todayDow;
            const active = viewDay === d.value;
            return (
              <button key={d.value} onClick={() => setSelectedDay(d.value)} style={{
                ...styles.dayBtn,
                background: active ? C.primary : C.bgCard,
                color: active ? '#fff' : C.text,
                borderColor: active ? C.primary : isToday ? C.accent : C.borderLight,
              }}>
                {SHORT_DAYS[d.value - 1]}
              </button>
            );
          })}
        </div>

        {loading ? (
          <p style={styles.loadingText}>Laddar scheman...</p>
        ) : (
          <div style={styles.content}>
            {children.map(child => {
              const hasSchedule = childHasSchedule(child.id);
              const dayDate = dateForDay(viewDay);
              const special = getSpecialEvent(child.id, dayDate);
              const slots = childSchedule(child.id, viewDay);
              const myExams = childExams(child.id);

              return (
                <div key={child.id} style={styles.childSection}>
                  <div style={styles.childHeader}>
                    <div style={{ ...styles.childAvatar, background: child.color || C.primary }}>
                      <span style={{ fontSize: 20 }}>{child.avatar}</span>
                    </div>
                    <span style={styles.childName}>{child.name}</span>
                    <button onClick={() => setSetupChild(child)} style={styles.editBtn}>
                      {hasSchedule ? <Edit3 size={16} color={C.textMuted} /> : <Plus size={16} color={C.primary} />}
                      <span style={{ color: hasSchedule ? C.textMuted : C.primary }}>
                        {hasSchedule ? 'Ändra' : 'Lägg in schema'}
                      </span>
                    </button>
                  </div>

                  {special && (
                    <div style={styles.specialBanner}>
                      <span>{special.icon || '🎒'}</span>
                      <div style={{ flex: 1 }}>
                        <span style={styles.specialTitle}>{special.title}</span>
                        <span style={styles.specialPeriod}>
                          {special.period === 'full_day' ? 'Heldag' : special.period === 'morning' ? 'Förmiddag' : 'Eftermiddag'}
                        </span>
                      </div>
                    </div>
                  )}

                  {!hasSchedule ? (
                    <div style={styles.emptySchedule}>
                      <span style={{ fontSize: 32 }}>📋</span>
                      <p style={styles.emptyText}>Inget schema inlagt ännu</p>
                      <button onClick={() => setSetupChild(child)} style={styles.setupBtn}>
                        Lägg in {child.name}s schema
                      </button>
                    </div>
                  ) : slots.length === 0 && !special ? (
                    <p style={styles.noLessons}>Inga lektioner {DAYS.find(d => d.value === viewDay)?.label.toLowerCase()}</p>
                  ) : (
                    !special || special.period !== 'full_day' ? (
                      slots
                        .filter(slot => {
                          if (!special) return true;
                          if (special.period === 'morning' && slot.start_time < '12:00') return false;
                          if (special.period === 'afternoon' && slot.start_time >= '12:00') return false;
                          return true;
                        })
                        .map((slot, i) => {
                          const subj = getSubject(slot.subject_id);
                          return (
                            <div key={i} style={{ ...styles.lessonCard, borderLeftColor: subj?.color || C.border }}>
                              <span style={styles.lessonTime}>{slot.start_time.slice(0, 5)}</span>
                              <span style={styles.lessonIcon}>{subj?.icon || '📚'}</span>
                              <span style={styles.lessonName}>{subj?.short_name || '?'}</span>
                              <span style={styles.lessonEnd}>– {slot.end_time.slice(0, 5)}</span>
                            </div>
                          );
                        })
                    ) : null
                  )}

                  {myExams.length > 0 && (
                    <div style={{ marginTop: 10 }}>
                      <p style={S.sectionLabel}>📝 Kommande prov</p>
                      {myExams.map(exam => {
                        const subj = exam.subject_id ? getSubject(exam.subject_id) : null;
                        const days = daysUntil(exam.exam_date);
                        const urgent = days <= 2;
                        return (
                          <div key={exam.id} style={{ ...styles.examCard, borderColor: urgent ? C.primary : C.borderLight }}>
                            <span style={{ fontSize: 18 }}>{exam.icon || '📝'}</span>
                            <div style={{ flex: 1 }}>
                              <span style={styles.examTitle}>{exam.title}</span>
                              <span style={styles.examSub}>
                                {subj ? `${subj.icon} ${subj.short_name} · ` : ''}{fmtDateShort(exam.exam_date)}
                                {' · '}{days === 0 ? 'Idag!' : days === 1 ? 'Imorgon' : `Om ${days} dagar`}
                                {exam.study_days > 0 && ` · ${exam.study_days} pluggdagar`}
                              </span>
                            </div>
                            <button onClick={() => deleteExam(exam.id)} style={styles.examDeleteBtn}>
                              <Trash2 size={14} color={C.error} />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  <div style={styles.actionRow}>
                    <button onClick={() => { setAddingExam(child); setExamForm({ subject_id: '', title: '', exam_date: '', study_days: 2, notes: '' }); }} style={styles.addExamBtn}>
                      <BookOpen size={14} /> Lägg till prov
                    </button>
                    <button onClick={() => { setAddingEvent(child); setEventForm({ title: '', event_date: dateForDay(viewDay), period: 'full_day' }); }} style={styles.addEventBtn}>
                      <Calendar size={14} /> Specialdag
                    </button>
                    {hasSchedule && (
                      <button onClick={() => handleDeleteSchedule(child)} style={styles.deleteScheduleBtn}>
                        <Trash2 size={14} /> Ta bort schema
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Exam modal */}
      {addingExam && (
        <div style={styles.overlay}>
          <div style={styles.modal}>
            <h3 style={styles.modalTitle}>📝 Nytt prov — {addingExam.name}</h3>
            {childSubjects.length > 0 && (
              <>
                <label style={styles.fieldLabel}>Ämne</label>
                <div style={styles.subjectPicker}>
                  {childSubjects.map(subj => (
                    <button key={subj.id} onClick={() => {
                      setExamForm(prev => ({
                        ...prev,
                        subject_id: prev.subject_id === subj.id ? '' : subj.id,
                        title: prev.subject_id === subj.id ? prev.title : `${subj.short_name}-prov`,
                      }));
                    }} style={{
                      ...styles.subjectOption,
                      background: examForm.subject_id === subj.id ? (subj.color || C.primary) : C.bgCard,
                      color: examForm.subject_id === subj.id ? '#fff' : C.text,
                      borderColor: examForm.subject_id === subj.id ? (subj.color || C.primary) : C.borderLight,
                    }}>
                      {subj.icon} {subj.short_name}
                    </button>
                  ))}
                </div>
              </>
            )}
            <label style={styles.fieldLabel}>Titel</label>
            <input type="text" placeholder="T.ex. Matteprov kapitel 5"
              value={examForm.title} onChange={e => setExamForm(prev => ({ ...prev, title: e.target.value }))}
              style={styles.input} autoFocus />
            <label style={styles.fieldLabel}>Provdatum</label>
            <input type="date" value={examForm.exam_date}
              onChange={e => setExamForm(prev => ({ ...prev, exam_date: e.target.value }))}
              style={styles.input} />
            <label style={styles.fieldLabel}>Antal pluggdagar innan</label>
            <div style={styles.studyDayPicker}>
              {[1, 2, 3, 4, 5].map(n => (
                <button key={n} onClick={() => setExamForm(prev => ({ ...prev, study_days: n }))} style={{
                  ...styles.studyDayBtn,
                  background: examForm.study_days === n ? C.primary : C.bgCard,
                  color: examForm.study_days === n ? '#fff' : C.text,
                  borderColor: examForm.study_days === n ? C.primary : C.borderLight,
                }}>
                  {n}
                </button>
              ))}
            </div>
            <p style={styles.studyHint}>
              {examForm.study_days} dag{examForm.study_days > 1 ? 'ar' : ''} av pluggsysslor skapas automatiskt
            </p>
            <div style={styles.modalFooter}>
              <button onClick={() => setAddingExam(null)} style={styles.cancelBtn}>Avbryt</button>
              <button onClick={saveExam} disabled={!examForm.title.trim() || !examForm.exam_date}
                style={{ ...styles.saveBtn, opacity: examForm.title.trim() && examForm.exam_date ? 1 : 0.5 }}>
                Spara prov
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Special event modal */}
      {addingEvent && (
        <div style={styles.overlay}>
          <div style={styles.modal}>
            <h3 style={styles.modalTitle}>Specialdag för {addingEvent.name}</h3>
            <label style={styles.fieldLabel}>Vad?</label>
            <input type="text" placeholder="T.ex. Utflykt Skansen"
              value={eventForm.title} onChange={e => setEventForm(prev => ({ ...prev, title: e.target.value }))}
              style={styles.input} autoFocus />
            <label style={styles.fieldLabel}>Datum</label>
            <input type="date" value={eventForm.event_date}
              onChange={e => setEventForm(prev => ({ ...prev, event_date: e.target.value }))}
              style={styles.input} />
            <label style={styles.fieldLabel}>Period</label>
            <div style={styles.periodRow}>
              {[{ key: 'full_day', label: 'Heldag' }, { key: 'morning', label: 'Förmiddag' }, { key: 'afternoon', label: 'Eftermiddag' }].map(p => (
                <button key={p.key} onClick={() => setEventForm(prev => ({ ...prev, period: p.key }))} style={{
                  ...styles.periodBtn,
                  background: eventForm.period === p.key ? C.primary : C.bgCard,
                  color: eventForm.period === p.key ? '#fff' : C.text,
                  borderColor: eventForm.period === p.key ? C.primary : C.border,
                }}>
                  {p.label}
                </button>
              ))}
            </div>
            <div style={styles.modalFooter}>
              <button onClick={() => setAddingEvent(null)} style={styles.cancelBtn}>Avbryt</button>
              <button onClick={saveSpecialEvent} disabled={!eventForm.title.trim()}
                style={{ ...styles.saveBtn, opacity: eventForm.title.trim() ? 1 : 0.5 }}>
                Spara
              </button>
            </div>
          </div>
        </div>
      )}

      <div style={{ height: 80 }} />
    </div>
  );
}

const styles = {
  page: { background: C.bg, fontFamily: F.body, position: 'relative', overflow: 'hidden', minHeight: '100vh' },
  headerRow: { padding: '16px 16px 8px' },
  pageTitle: { fontFamily: F.heading, fontSize: F.sizes.xl, fontWeight: F.weights.extra, color: C.text, margin: 0 },
  dayPicker: { display: 'flex', gap: 6, padding: '4px 16px 12px' },
  dayBtn: { flex: 1, padding: '10px 4px', borderRadius: 12, border: '1.5px solid', fontSize: F.sizes.sm, fontWeight: F.weights.bold, fontFamily: F.heading, cursor: 'pointer', textAlign: 'center', minHeight: 42 },
  loadingText: { textAlign: 'center', color: C.textMuted, padding: 32, fontFamily: F.heading },
  content: { padding: '0 16px' },
  childSection: { marginBottom: 24 },
  childHeader: { display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 },
  childAvatar: { width: 36, height: 36, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  childName: { flex: 1, fontFamily: F.heading, fontSize: F.sizes.md, fontWeight: F.weights.bold, color: C.text },
  editBtn: { display: 'inline-flex', alignItems: 'center', gap: 4, padding: '6px 12px', borderRadius: 10, border: `1.5px solid ${C.borderLight}`, background: C.bgCard, fontSize: F.sizes.xs, fontWeight: F.weights.bold, fontFamily: F.heading, cursor: 'pointer', minHeight: 36 },
  specialBanner: { display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px', borderRadius: 14, background: `linear-gradient(135deg, ${C.accentLight}, ${C.primaryLight})`, border: `1.5px solid ${C.accent}`, marginBottom: 8 },
  specialTitle: { display: 'block', fontSize: F.sizes.sm, fontWeight: F.weights.bold, fontFamily: F.heading, color: '#92400E' },
  specialPeriod: { display: 'block', fontSize: F.sizes.xs, color: C.textMuted, fontFamily: F.heading },
  lessonCard: { display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderRadius: 12, border: `1.5px solid ${C.borderLight}`, borderLeft: '4px solid', background: C.bgCard, marginBottom: 6 },
  lessonTime: { fontSize: F.sizes.xs, fontWeight: F.weights.bold, fontFamily: F.heading, color: C.textMuted, width: 40 },
  lessonIcon: { fontSize: 20 },
  lessonName: { flex: 1, fontSize: F.sizes.sm, fontWeight: F.weights.bold, fontFamily: F.heading, color: C.text },
  lessonEnd: { fontSize: F.sizes.xs, color: C.textMuted, fontFamily: F.heading },
  emptySchedule: { textAlign: 'center', padding: '20px 0' },
  emptyText: { fontSize: F.sizes.sm, color: C.textMuted, fontFamily: F.heading, margin: '8px 0' },
  noLessons: { fontSize: F.sizes.sm, color: C.textMuted, fontFamily: F.heading, fontStyle: 'italic', padding: '8px 0' },
  setupBtn: { padding: '10px 20px', borderRadius: 12, border: `2px dashed ${C.primary}`, background: C.primaryLight, color: C.primaryDark, fontSize: F.sizes.sm, fontWeight: F.weights.bold, fontFamily: F.heading, cursor: 'pointer', minHeight: 44 },
  examCard: { display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderRadius: 14, border: '1.5px solid', background: C.bgCard, marginBottom: 6, boxShadow: '0 2px 8px rgba(0,0,0,0.04)' },
  examTitle: { display: 'block', fontSize: F.sizes.sm, fontWeight: F.weights.bold, fontFamily: F.heading, color: C.text },
  examSub: { display: 'block', fontSize: F.sizes.xs, color: C.textMuted, fontFamily: F.heading, marginTop: 1 },
  examDeleteBtn: { background: 'none', border: 'none', cursor: 'pointer', padding: 6, minHeight: 36, minWidth: 36, display: 'flex', alignItems: 'center', justifyContent: 'center' },
  actionRow: { display: 'flex', gap: 8, marginTop: 8, flexWrap: 'wrap' },
  addExamBtn: { display: 'inline-flex', alignItems: 'center', gap: 4, padding: '6px 12px', borderRadius: 10, border: `1.5px solid ${C.primary}`, background: C.primaryLight, color: C.primaryDark, fontSize: F.sizes.xs, fontWeight: F.weights.bold, fontFamily: F.heading, cursor: 'pointer' },
  addEventBtn: { display: 'inline-flex', alignItems: 'center', gap: 4, padding: '6px 12px', borderRadius: 10, border: `1px solid ${C.borderLight}`, background: 'transparent', color: C.textMuted, fontSize: F.sizes.xs, fontFamily: F.heading, cursor: 'pointer' },
  deleteScheduleBtn: { display: 'inline-flex', alignItems: 'center', gap: 4, padding: '6px 12px', borderRadius: 10, border: `1px solid ${C.errorLight}`, background: 'transparent', color: C.error, fontSize: F.sizes.xs, fontFamily: F.heading, cursor: 'pointer' },
  overlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 300, padding: 16 },
  modal: { width: '100%', maxWidth: 400, background: C.bgCard, borderRadius: 20, padding: 20 },
  modalTitle: { fontFamily: F.heading, fontSize: F.sizes.lg, fontWeight: F.weights.bold, color: C.text, margin: '0 0 16px' },
  fieldLabel: { display: 'block', fontSize: F.sizes.xs, fontWeight: F.weights.bold, fontFamily: F.heading, color: C.textMuted, marginBottom: 6, marginTop: 12 },
  input: { width: '100%', padding: '10px 14px', borderRadius: 12, border: `1.5px solid ${C.border}`, fontSize: F.sizes.sm, fontFamily: F.heading, color: C.text, background: C.bgCard, boxSizing: 'border-box' },
  subjectPicker: { display: 'flex', flexWrap: 'wrap', gap: 6 },
  subjectOption: { padding: '8px 12px', borderRadius: 10, border: '1.5px solid', fontSize: F.sizes.sm, fontWeight: F.weights.bold, fontFamily: F.heading, cursor: 'pointer', minHeight: 40 },
  studyDayPicker: { display: 'flex', gap: 8 },
  studyDayBtn: { width: 44, height: 44, borderRadius: 12, border: '1.5px solid', fontSize: F.sizes.md, fontWeight: F.weights.bold, fontFamily: F.heading, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  studyHint: { fontSize: F.sizes.xs, color: C.textMuted, fontFamily: F.heading, margin: '6px 0 0', fontStyle: 'italic' },
  periodRow: { display: 'flex', gap: 6 },
  periodBtn: { flex: 1, padding: '10px 8px', borderRadius: 12, border: '1.5px solid', fontSize: F.sizes.sm, fontWeight: F.weights.bold, fontFamily: F.heading, cursor: 'pointer', textAlign: 'center', minHeight: 44 },
  modalFooter: { display: 'flex', gap: 8, marginTop: 20, justifyContent: 'flex-end' },
  cancelBtn: { padding: '10px 18px', borderRadius: 12, border: `1.5px solid ${C.border}`, background: C.bgCard, color: C.text, fontSize: F.sizes.sm, fontWeight: F.weights.bold, fontFamily: F.heading, cursor: 'pointer', minHeight: 44 },
  saveBtn: { padding: '10px 18px', borderRadius: 12, border: 'none', background: C.primary, color: '#fff', fontSize: F.sizes.sm, fontWeight: F.weights.bold, fontFamily: F.heading, cursor: 'pointer', minHeight: 44 },
};
