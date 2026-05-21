// ============================================
// FamTastic — SchoolView (parent view: all children's schedules)
// ============================================

import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import { C, F, S, todayStr, safeArray } from './data';
import { SchoolSetup } from './SchoolSetup';
import { Plus, Edit3, Calendar, AlertTriangle, Trash2 } from 'lucide-react';

const DAYS = [
  { value: 1, label: 'Måndag' },
  { value: 2, label: 'Tisdag' },
  { value: 3, label: 'Onsdag' },
  { value: 4, label: 'Torsdag' },
  { value: 5, label: 'Fredag' },
];

const SHORT_DAYS = ['Mån', 'Tis', 'Ons', 'Tor', 'Fre'];

export function SchoolView({ familyId, member, members }) {
  const [schedules, setSchedules] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [specialEvents, setSpecialEvents] = useState([]);
  const [rules, setRules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [setupChild, setSetupChild] = useState(null); // member object or null
  const [selectedDay, setSelectedDay] = useState(null); // 1-5 or null = today
  const [addingEvent, setAddingEvent] = useState(null); // child member or null
  const [eventForm, setEventForm] = useState({ title: '', event_date: '', period: 'full_day' });

  const today = todayStr();
  const todayDow = (() => { const d = new Date().getDay(); return d === 0 || d === 6 ? 1 : d; })();
  const viewDay = selectedDay || todayDow;

  const children = members.filter(m => m.role === 'child');

  useEffect(() => { loadData(); }, [familyId]);

  async function loadData() {
    setLoading(true);
    const [schRes, subRes, evRes, ruRes] = await Promise.all([
      supabase.from('school_schedule').select('*').eq('family_id', familyId),
      supabase.from('school_subjects').select('*').or(`is_global.eq.true,family_id.eq.${familyId}`),
      supabase.from('school_special_events').select('*').eq('family_id', familyId).gte('event_date', today),
      supabase.from('school_rules').select('*').eq('family_id', familyId).eq('is_active', true),
    ]);
    setSchedules(schRes.data || []);
    setSubjects(subRes.data || []);
    setSpecialEvents(evRes.data || []);
    setRules(ruRes.data || []);
    setLoading(false);
  }

  function getSubject(id) {
    return subjects.find(s => s.id === id);
  }

  function childSchedule(childId, day) {
    return schedules
      .filter(s => s.member_id === childId && s.day_of_week === day)
      .sort((a, b) => a.start_time.localeCompare(b.start_time));
  }

  function childHasSchedule(childId) {
    return schedules.some(s => s.member_id === childId);
  }

  function getSpecialEvent(childId, dateStr) {
    return specialEvents.find(e => e.member_id === childId && e.event_date === dateStr);
  }

  function childRules(childId) {
    return rules.filter(r => r.member_id === childId);
  }

  // Get today's date string for a given day_of_week offset
  function dateForDay(dayOfWeek) {
    const now = new Date();
    const currentDow = now.getDay() || 7;
    const diff = dayOfWeek - currentDow;
    const target = new Date(now);
    target.setDate(now.getDate() + diff);
    return `${target.getFullYear()}-${String(target.getMonth() + 1).padStart(2, '0')}-${String(target.getDate()).padStart(2, '0')}`;
  }

  async function saveSpecialEvent() {
    if (!addingEvent || !eventForm.title.trim() || !eventForm.event_date) return;
    await supabase.from('school_special_events').insert({
      family_id: familyId,
      member_id: addingEvent.id,
      event_date: eventForm.event_date,
      period: eventForm.period,
      title: eventForm.title.trim(),
      icon: '🎒',
      replaces_schedule: true,
    });
    setAddingEvent(null);
    setEventForm({ title: '', event_date: '', period: 'full_day' });
    loadData();
  }

  async function handleDeleteSchedule(child) {
    if (!window.confirm(`Ta bort ${child.name}s hela schema? Kopplade påminnelser och auto-sysslor tas också bort.`)) return;

    // Delete auto-generated chores (those with reference_id, assigned to this child)
    await supabase.from('chores')
      .delete()
      .eq('family_id', familyId)
      .eq('assigned_to', child.id)
      .not('reference_id', 'is', null);

    // Delete rules, schedule, special events
    await supabase.from('school_rules').delete().eq('member_id', child.id);
    await supabase.from('school_schedule').delete().eq('member_id', child.id);
    await supabase.from('school_special_events').delete().eq('member_id', child.id);

    loadData();
  }

  // Setup wizard open
  if (setupChild) {
    return (
      <SchoolSetup
        familyId={familyId}
        memberId={setupChild.id}
        childName={setupChild.name}
        onClose={() => setSetupChild(null)}
        onDone={() => { setSetupChild(null); loadData(); }}
      />
    );
  }

  return (
    <div style={styles.page}>
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

            return (
              <div key={child.id} style={styles.childSection}>
                {/* Child header */}
                <div style={styles.childHeader}>
                  <div style={{ ...styles.childAvatar, background: child.color || C.primary }}>
                    <span style={{ fontSize: 20 }}>{child.avatar}</span>
                  </div>
                  <span style={styles.childName}>{child.name}</span>
                  <button
                    onClick={() => setSetupChild(child)}
                    style={styles.editBtn}
                  >
                    {hasSchedule ? <Edit3 size={16} color={C.textMuted} /> : <Plus size={16} color={C.primary} />}
                    <span style={{ color: hasSchedule ? C.textMuted : C.primary }}>
                      {hasSchedule ? 'Ändra' : 'Lägg in schema'}
                    </span>
                  </button>
                </div>

                {/* Special event banner */}
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

                {/* Schedule */}
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
                        // Filter out slots replaced by special event
                        if (special.period === 'morning' && slot.start_time < '12:00') return false;
                        if (special.period === 'afternoon' && slot.start_time >= '12:00') return false;
                        return true;
                      })
                      .map((slot, i) => {
                        const subj = getSubject(slot.subject_id);
                        return (
                          <div key={i} style={{ ...styles.lessonCard, borderLeftColor: subj?.color || C.border }}>
                            <span style={styles.lessonTime}>{slot.start_time.slice(0,5)}</span>
                            <span style={styles.lessonIcon}>{subj?.icon || '📚'}</span>
                            <span style={styles.lessonName}>{subj?.short_name || '?'}</span>
                            <span style={styles.lessonEnd}>– {slot.end_time.slice(0,5)}</span>
                          </div>
                        );
                      })
                  ) : null
                )}

                {/* Add special event + delete schedule */}
                <div style={styles.actionRow}>
                  <button
                    onClick={() => { setAddingEvent(child); setEventForm({ title: '', event_date: dateForDay(viewDay), period: 'full_day' }); }}
                    style={styles.addEventBtn}
                  >
                    <Calendar size={14} /> Lägg till specialdag
                  </button>
                  {hasSchedule && (
                    <button
                      onClick={() => handleDeleteSchedule(child)}
                      style={styles.deleteScheduleBtn}
                    >
                      <Trash2 size={14} /> Ta bort schema
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Special event modal */}
      {addingEvent && (
        <div style={styles.overlay}>
          <div style={styles.modal}>
            <h3 style={styles.modalTitle}>Specialdag för {addingEvent.name}</h3>

            <label style={styles.fieldLabel}>Vad?</label>
            <input
              type="text"
              placeholder="T.ex. Utflykt Skansen"
              value={eventForm.title}
              onChange={e => setEventForm(prev => ({ ...prev, title: e.target.value }))}
              style={styles.input}
              autoFocus
            />

            <label style={styles.fieldLabel}>Datum</label>
            <input
              type="date"
              value={eventForm.event_date}
              onChange={e => setEventForm(prev => ({ ...prev, event_date: e.target.value }))}
              style={styles.input}
            />

            <label style={styles.fieldLabel}>Period</label>
            <div style={styles.periodRow}>
              {[
                { key: 'full_day', label: 'Heldag' },
                { key: 'morning', label: 'Förmiddag' },
                { key: 'afternoon', label: 'Eftermiddag' },
              ].map(p => (
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
              <button
                onClick={saveSpecialEvent}
                disabled={!eventForm.title.trim()}
                style={{ ...styles.saveBtn, opacity: eventForm.title.trim() ? 1 : 0.5 }}
              >
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
  page: { background: C.bg, fontFamily: F.body },
  headerRow: { padding: '16px 16px 8px' },
  pageTitle: { fontFamily: F.heading, fontSize: F.sizes.xl, fontWeight: F.weights.extra, color: C.text, margin: 0 },
  dayPicker: { display: 'flex', gap: 6, padding: '4px 16px 12px' },
  dayBtn: {
    flex: 1, padding: '10px 4px', borderRadius: 12, border: '1.5px solid',
    fontSize: F.sizes.sm, fontWeight: F.weights.bold, fontFamily: F.heading,
    cursor: 'pointer', textAlign: 'center', minHeight: 42,
  },
  loadingText: { textAlign: 'center', color: C.textMuted, padding: 32, fontFamily: F.heading },
  content: { padding: '0 16px' },

  // Child section
  childSection: { marginBottom: 24 },
  childHeader: { display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 },
  childAvatar: { width: 36, height: 36, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  childName: { flex: 1, fontFamily: F.heading, fontSize: F.sizes.md, fontWeight: F.weights.bold, color: C.text },
  editBtn: { display: 'inline-flex', alignItems: 'center', gap: 4, padding: '6px 12px', borderRadius: 10, border: `1.5px solid ${C.borderLight}`, background: C.bgCard, fontSize: F.sizes.xs, fontWeight: F.weights.bold, fontFamily: F.heading, cursor: 'pointer', minHeight: 36 },

  // Special event
  specialBanner: { display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px', borderRadius: 14, background: `linear-gradient(135deg, ${C.accentLight}, ${C.primaryLight})`, border: `1.5px solid ${C.accent}`, marginBottom: 8 },
  specialTitle: { display: 'block', fontSize: F.sizes.sm, fontWeight: F.weights.bold, fontFamily: F.heading, color: '#92400E' },
  specialPeriod: { display: 'block', fontSize: F.sizes.xs, color: C.textMuted, fontFamily: F.heading },

  // Lessons
  lessonCard: {
    display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px',
    borderRadius: 12, border: `1.5px solid ${C.borderLight}`, borderLeft: '4px solid',
    background: C.bgCard, marginBottom: 6,
  },
  lessonTime: { fontSize: F.sizes.xs, fontWeight: F.weights.bold, fontFamily: F.heading, color: C.textMuted, width: 40 },
  lessonIcon: { fontSize: 20 },
  lessonName: { flex: 1, fontSize: F.sizes.sm, fontWeight: F.weights.bold, fontFamily: F.heading, color: C.text },
  lessonEnd: { fontSize: F.sizes.xs, color: C.textMuted, fontFamily: F.heading },

  // Empty
  emptySchedule: { textAlign: 'center', padding: '20px 0' },
  emptyText: { fontSize: F.sizes.sm, color: C.textMuted, fontFamily: F.heading, margin: '8px 0' },
  noLessons: { fontSize: F.sizes.sm, color: C.textMuted, fontFamily: F.heading, fontStyle: 'italic', padding: '8px 0' },
  setupBtn: { padding: '10px 20px', borderRadius: 12, border: `2px dashed ${C.primary}`, background: C.primaryLight, color: C.primaryDark, fontSize: F.sizes.sm, fontWeight: F.weights.bold, fontFamily: F.heading, cursor: 'pointer', minHeight: 44 },
  addEventBtn: { display: 'inline-flex', alignItems: 'center', gap: 4, padding: '6px 12px', borderRadius: 10, border: `1px solid ${C.borderLight}`, background: 'transparent', color: C.textMuted, fontSize: F.sizes.xs, fontFamily: F.heading, cursor: 'pointer', marginTop: 4 },
  actionRow: { display: 'flex', gap: 8, marginTop: 4, flexWrap: 'wrap' },
  deleteScheduleBtn: { display: 'inline-flex', alignItems: 'center', gap: 4, padding: '6px 12px', borderRadius: 10, border: `1px solid ${C.errorLight}`, background: 'transparent', color: C.error, fontSize: F.sizes.xs, fontFamily: F.heading, cursor: 'pointer' },

  // Modal
  overlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 300, padding: 16 },
  modal: { width: '100%', maxWidth: 400, background: C.bgCard, borderRadius: 20, padding: 20 },
  modalTitle: { fontFamily: F.heading, fontSize: F.sizes.lg, fontWeight: F.weights.bold, color: C.text, margin: '0 0 16px' },
  fieldLabel: { display: 'block', fontSize: F.sizes.xs, fontWeight: F.weights.bold, fontFamily: F.heading, color: C.textMuted, marginBottom: 6, marginTop: 12 },
  input: { width: '100%', padding: '10px 14px', borderRadius: 12, border: `1.5px solid ${C.border}`, fontSize: F.sizes.sm, fontFamily: F.heading, color: C.text, background: C.bgCard, boxSizing: 'border-box' },
  periodRow: { display: 'flex', gap: 6 },
  periodBtn: { flex: 1, padding: '10px 8px', borderRadius: 12, border: '1.5px solid', fontSize: F.sizes.sm, fontWeight: F.weights.bold, fontFamily: F.heading, cursor: 'pointer', textAlign: 'center', minHeight: 44 },
  modalFooter: { display: 'flex', gap: 8, marginTop: 20, justifyContent: 'flex-end' },
  cancelBtn: { padding: '10px 18px', borderRadius: 12, border: `1.5px solid ${C.border}`, background: C.bgCard, color: C.text, fontSize: F.sizes.sm, fontWeight: F.weights.bold, fontFamily: F.heading, cursor: 'pointer', minHeight: 44 },
  saveBtn: { padding: '10px 18px', borderRadius: 12, border: 'none', background: C.primary, color: '#fff', fontSize: F.sizes.sm, fontWeight: F.weights.bold, fontFamily: F.heading, cursor: 'pointer', minHeight: 44 },
};
