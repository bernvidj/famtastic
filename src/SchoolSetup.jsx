// ============================================
// FamTastic — SchoolSetup (wizard: schedule+subjects → rules)
// Step 1: subjects + schedule combined
// Step 2: linked reminders (homework with due_day picker)
// ============================================

import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import { C, F, S, safeArray } from './data';
import { SchoolSlotModal } from './SchoolSlotModal';
import { X, ChevronRight, ChevronLeft, Check, Plus, Trash2 } from 'lucide-react';

const DAYS = [
  { value: 1, label: 'Mån' },
  { value: 2, label: 'Tis' },
  { value: 3, label: 'Ons' },
  { value: 4, label: 'Tor' },
  { value: 5, label: 'Fre' },
];

const RULE_SUGGESTIONS = {
  'Idrott':     { title: 'Packa idrottskläder', icon: '👟', days_before: 1, time_of_day: 'evening' },
  'Hemkunskap': { title: 'Ta med förkläde/matsäck', icon: '🍳', days_before: 1, time_of_day: 'evening' },
  'Slöjd':      { title: 'Ta med slöjdkläder', icon: '🪵', days_before: 1, time_of_day: 'evening' },
  'Musik':      { title: 'Ta med instrument', icon: '🎵', days_before: 1, time_of_day: 'evening' },
};

const HOMEWORK_SUBJECTS = ['Matematik', 'Svenska', 'Engelska', 'NO', 'SO', 'Moderna språk', 'Teknik'];

export function SchoolSetup({ familyId, memberId, childName, onClose, onDone }) {
  const [step, setStep] = useState(1);
  const [allSubjects, setAllSubjects] = useState([]);
  const [selectedSubjects, setSelectedSubjects] = useState([]);
  const [schedule, setSchedule] = useState([]);
  const [rules, setRules] = useState([]);
  const [editingSlot, setEditingSlot] = useState(null);
  const [slotForm, setSlotForm] = useState({ subject_id: '', start_time: '', end_time: '' });
  const [saving, setSaving] = useState(false);
  const [customSubject, setCustomSubject] = useState('');
  const [showSubjects, setShowSubjects] = useState(false);

  useEffect(() => { loadAll(); }, []);

  async function loadAll() {
    const { data: subjectData } = await supabase.from('school_subjects')
      .select('*')
      .or(`is_global.eq.true,family_id.eq.${familyId}`)
      .order('category, title');
    setAllSubjects(subjectData || []);

    const { data: schedData } = await supabase.from('school_schedule')
      .select('*').eq('member_id', memberId);
    if (schedData && schedData.length > 0) {
      setSchedule(schedData.map(s => ({
        subject_id: s.subject_id, day_of_week: s.day_of_week,
        start_time: s.start_time, end_time: s.end_time,
      })));
      const usedSubjects = [...new Set(schedData.map(s => s.subject_id))];
      setSelectedSubjects(usedSubjects);
    } else {
      setShowSubjects(true);
    }

    const { data: rulesData } = await supabase.from('school_rules')
      .select('*').eq('member_id', memberId);
    if (rulesData && rulesData.length > 0) {
      setRules(rulesData.map(r => ({
        subject_id: r.subject_id,
        subject_name: (subjectData || []).find(s => s.id === r.subject_id)?.short_name || '?',
        subject_icon: (subjectData || []).find(s => s.id === r.subject_id)?.icon || '📚',
        title: r.title, icon: r.icon, days_before: r.days_before,
        time_of_day: r.time_of_day, is_active: r.is_active, rule_type: r.rule_type,
        due_day: r.due_day || null,
      })));
    }
  }

  function toggleSubject(id) {
    setSelectedSubjects(prev => prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]);
  }

  async function addCustomSubject() {
    if (!customSubject.trim()) return;
    const { data } = await supabase.from('school_subjects').insert({
      title: customSubject.trim(), short_name: customSubject.trim(),
      icon: '📚', color: '#6B7280', is_global: false, family_id: familyId, category: 'other',
    }).select().single();
    if (data) {
      setAllSubjects(prev => [...prev, data]);
      setSelectedSubjects(prev => [...prev, data.id]);
      setCustomSubject('');
    }
  }

  // --- Schedule editing ---
  function openSlotEditor(day, time) {
    const existing = schedule.find(s => s.day_of_week === day && s.start_time === time);
    if (existing) {
      setSlotForm({ subject_id: existing.subject_id, start_time: existing.start_time, end_time: existing.end_time });
    } else {
      const [sh, sm] = time.split(':').map(Number);
      const endH = sh + 1;
      const endTime = endH <= 16 ? `${String(endH).padStart(2,'0')}:${String(sm).padStart(2,'0')}` : '16:55';
      setSlotForm({ subject_id: selectedSubjects[0] || '', start_time: time, end_time: endTime });
    }
    setEditingSlot({ day, time });
  }

  function saveSlot() {
    if (!slotForm.subject_id || !slotForm.start_time || !slotForm.end_time) return;
    if (slotForm.end_time <= slotForm.start_time) return;
    if (!selectedSubjects.includes(slotForm.subject_id)) {
      setSelectedSubjects(prev => [...prev, slotForm.subject_id]);
    }
    const filtered = schedule.filter(s => !(s.day_of_week === editingSlot.day && s.start_time === editingSlot.time));
    filtered.push({ subject_id: slotForm.subject_id, day_of_week: editingSlot.day, start_time: slotForm.start_time, end_time: slotForm.end_time });
    setSchedule(filtered);
    setEditingSlot(null);
  }

  function removeSlot(day, startTime) {
    setSchedule(prev => prev.filter(s => !(s.day_of_week === day && s.start_time === startTime)));
    setEditingSlot(null);
  }

  function toggleRule(idx) {
    setRules(prev => prev.map((r, i) => i === idx ? { ...r, is_active: !r.is_active } : r));
  }

  function setRuleDueDay(idx, day) {
    setRules(prev => prev.map((r, i) => {
      if (i !== idx) return r;
      const newDay = r.due_day === day ? null : day;
      const subj = allSubjects.find(s => s.id === r.subject_id);
      const name = subj?.short_name || '?';
      return {
        ...r,
        due_day: newDay,
        title: newDay ? `Läxinlämning ${name}` : `${name}-läxa`,
      };
    }));
  }

  function goToRules() {
    const existingSubjectIds = rules.map(r => r.subject_id);
    const suggestions = [...rules];
    selectedSubjects.forEach(sid => {
      if (existingSubjectIds.includes(sid)) return;
      const subj = allSubjects.find(s => s.id === sid);
      if (!subj) return;
      const suggestion = RULE_SUGGESTIONS[subj.title];
      if (suggestion) {
        suggestions.push({ subject_id: sid, subject_name: subj.short_name, subject_icon: subj.icon, ...suggestion, is_active: true, rule_type: 'bring_item' });
      }
      if (HOMEWORK_SUBJECTS.includes(subj.title)) {
        // Auto-suggest due_day = last lesson day for this subject
        const subjectDays = schedule.filter(s => s.subject_id === sid).map(s => s.day_of_week).sort((a, b) => a - b);
        const suggestedDueDay = subjectDays.length > 0 ? subjectDays[subjectDays.length - 1] : null;
        const title = suggestedDueDay ? `Läxinlämning ${subj.short_name}` : `${subj.short_name}-läxa`;
        suggestions.push({
          subject_id: sid, subject_name: subj.short_name, subject_icon: subj.icon,
          title, icon: '📝', days_before: 1, time_of_day: 'evening',
          is_active: false, rule_type: 'homework', due_day: suggestedDueDay,
        });
      }
    });
    setRules(suggestions.filter(r => selectedSubjects.includes(r.subject_id)));
    setStep(2);
  }

  async function handleSave() {
    setSaving(true);
    const scheduleRows = schedule.map(s => ({ family_id: familyId, member_id: memberId, subject_id: s.subject_id, day_of_week: s.day_of_week, start_time: s.start_time, end_time: s.end_time }));
    await supabase.from('school_schedule').delete().eq('member_id', memberId);
    if (scheduleRows.length > 0) await supabase.from('school_schedule').insert(scheduleRows);

    const ruleRows = rules.map(r => ({
      family_id: familyId, member_id: memberId, subject_id: r.subject_id,
      rule_type: r.rule_type, title: r.title, icon: r.icon,
      days_before: r.days_before, time_of_day: r.time_of_day, is_active: r.is_active,
      due_day: r.due_day || null,
    }));
    await supabase.from('school_rules').delete().eq('member_id', memberId);
    let savedRules = [];
    if (ruleRows.length > 0) { const { data } = await supabase.from('school_rules').insert(ruleRows).select(); savedRules = data || []; }

    await supabase.from('chores').delete().eq('family_id', familyId).eq('assigned_to', memberId).not('reference_id', 'is', null);

    const newChores = [];
    for (const rule of savedRules.filter(r => r.is_active)) {
      if (rule.rule_type === 'homework' && rule.due_day) {
        // Homework with due_day: ONE reminder the day before submission
        let reminderDay = rule.due_day - 1;
        if (reminderDay < 1) reminderDay = 5; // Friday if due Monday
        newChores.push({
          family_id: familyId, title: rule.title,
          description: `Auto: ${allSubjects.find(s => s.id === rule.subject_id)?.short_name || ''}`,
          icon: rule.icon, chore_type: 'base', points: 0, difficulty: 'easy',
          is_recurring: true, recurrence_rule: { frequency: 'weekly', days: [reminderDay] },
          assigned_to: memberId, pool: false, scheduled_date: null, reference_id: rule.id, created_by: memberId,
        });
      } else {
        // bring_item or homework without due_day: reminder before each lesson (original logic)
        const subjectSlots = schedule.filter(s => s.subject_id === rule.subject_id);
        const reminderDays = new Set();
        for (const slot of subjectSlots) {
          let rd = slot.day_of_week - rule.days_before;
          if (rd < 1) rd += 7;
          reminderDays.add(rd);
        }
        if (reminderDays.size > 0) {
          newChores.push({
            family_id: familyId, title: rule.title,
            description: `Auto: ${allSubjects.find(s => s.id === rule.subject_id)?.short_name || ''}`,
            icon: rule.icon, chore_type: 'base', points: 0, difficulty: 'easy',
            is_recurring: true, recurrence_rule: { frequency: 'weekly', days: [...reminderDays].sort((a, b) => a - b) },
            assigned_to: memberId, pool: false, scheduled_date: null, reference_id: rule.id, created_by: memberId,
          });
        }
      }
    }
    if (newChores.length > 0) await supabase.from('chores').insert(newChores);

    setSaving(false);
    if (onDone) onDone();
  }

  function getSubject(id) { return allSubjects.find(s => s.id === id); }

  // ==================== STEP 1: Schedule + subjects combined ====================
  if (step === 1) {
    const globalCore = allSubjects.filter(s => s.is_global && s.category === 'core');
    const globalPractical = allSubjects.filter(s => s.is_global && s.category === 'practical');
    const globalOther = allSubjects.filter(s => s.is_global && s.category === 'other');
    const familySubs = allSubjects.filter(s => !s.is_global);

    const renderSubjectChips = (list) => (
      <div style={styles.subjectGrid}>
        {list.map(subj => {
          const active = selectedSubjects.includes(subj.id);
          return (
            <button key={subj.id} onClick={() => toggleSubject(subj.id)} style={{
              ...styles.subjectCard, background: active ? subj.color + '20' : C.bgCard, borderColor: active ? subj.color : C.borderLight,
            }}>
              <span style={styles.subjectIcon}>{subj.icon}</span>
              <span style={{ ...styles.subjectName, color: active ? subj.color : C.text }}>{subj.short_name}</span>
              {active && <Check size={12} color={subj.color} />}
            </button>
          );
        })}
      </div>
    );

    return (
      <div style={styles.page}>
        <div style={styles.header}>
          <button onClick={onClose} style={styles.closeBtn}><X size={20} color={C.textMuted} /></button>
          <h1 style={styles.title}>🎒 {childName}s schema</h1>
          <span style={styles.stepLabel}>Steg 1/2</span>
        </div>

        <div style={styles.body}>
          <button onClick={() => setShowSubjects(!showSubjects)} style={styles.subjectToggle}>
            <span style={styles.subjectToggleText}>
              {selectedSubjects.length === 0 ? '📚 Välj ämnen...' : `📚 ${selectedSubjects.length} ämnen valda`}
            </span>
            <ChevronRight size={16} color={C.textMuted} style={{ transform: showSubjects ? 'rotate(90deg)' : 'none', transition: 'transform 0.2s' }} />
          </button>

          {showSubjects && (
            <div style={styles.subjectSection}>
              {globalCore.length > 0 && (<><p style={styles.subjectCatLabel}>Kärnämnen</p>{renderSubjectChips(globalCore)}</>)}
              {globalPractical.length > 0 && (<><p style={styles.subjectCatLabel}>Praktiska</p>{renderSubjectChips(globalPractical)}</>)}
              {(globalOther.length > 0 || familySubs.length > 0) && (<><p style={styles.subjectCatLabel}>Övrigt</p>{renderSubjectChips([...globalOther, ...familySubs])}</>)}
              <div style={styles.addCustomRow}>
                <input type="text" placeholder="Eget ämne..." value={customSubject}
                  onChange={e => setCustomSubject(e.target.value)} style={styles.addCustomInput}
                  onKeyDown={e => e.key === 'Enter' && addCustomSubject()} />
                <button onClick={addCustomSubject} style={styles.addCustomBtn} disabled={!customSubject.trim()}>
                  <Plus size={18} /> Lägg till
                </button>
              </div>
            </div>
          )}

          <p style={{ ...S.sectionLabel, marginTop: 12 }}>Veckoschema</p>
          <p style={styles.hint}>Tryck "+ Lägg till" för att lägga till en lektion.</p>

          {DAYS.map(day => {
            const daySlots = schedule.filter(s => s.day_of_week === day.value).sort((a, b) => a.start_time.localeCompare(b.start_time));
            return (
              <div key={day.value} style={styles.daySection}>
                <div style={styles.dayHeader}>
                  <span style={styles.dayLabel}>{day.label}</span>
                  <button onClick={() => openSlotEditor(day.value, '08:00')} style={styles.addSlotBtn}><Plus size={16} /> Lägg till</button>
                </div>
                {daySlots.length === 0 ? (
                  <p style={styles.emptyDay}>Inga lektioner</p>
                ) : daySlots.map((slot, i) => {
                  const subj = getSubject(slot.subject_id);
                  return (
                    <button key={i} onClick={() => openSlotEditor(slot.day_of_week, slot.start_time)}
                      style={{ ...styles.slotCard, borderLeftColor: subj?.color || C.border }}>
                      <span style={styles.slotIcon}>{subj?.icon || '📚'}</span>
                      <div style={styles.slotInfo}>
                        <span style={styles.slotName}>{subj?.short_name || '?'}</span>
                        <span style={styles.slotTime}>{slot.start_time.slice(0,5)} – {slot.end_time.slice(0,5)}</span>
                      </div>
                      <Trash2 size={16} color={C.textMuted} onClick={(e) => { e.stopPropagation(); removeSlot(slot.day_of_week, slot.start_time); }} />
                    </button>
                  );
                })}
              </div>
            );
          })}
        </div>

        <SchoolSlotModal
          editingSlot={editingSlot}
          slotForm={slotForm}
          setSlotForm={setSlotForm}
          allSubjects={allSubjects}
          onSave={saveSlot}
          onCancel={() => setEditingSlot(null)}
        />

        <div style={styles.footer}>
          <div style={{ flex: 1 }} />
          <button onClick={goToRules} disabled={schedule.length === 0}
            style={{ ...styles.nextBtn, opacity: schedule.length === 0 ? 0.5 : 1 }}>
            Nästa <ChevronRight size={18} />
          </button>
        </div>
      </div>
    );
  }

  // ==================== STEP 2: Rules ====================
  if (step === 2) {
    const bringRules = rules.filter(r => r.rule_type !== 'homework');
    const hwRules = rules.filter(r => r.rule_type === 'homework');

    return (
      <div style={styles.page}>
        <div style={styles.header}>
          <button onClick={() => setStep(1)} style={styles.closeBtn}><ChevronLeft size={20} color={C.textMuted} /></button>
          <h1 style={styles.title}>Påminnelser</h1>
          <span style={styles.stepLabel}>Steg 2/2</span>
        </div>

        <div style={styles.body}>
          <p style={styles.subtitle}>Sysslor som skapas automatiskt inför lektioner.</p>

          {bringRules.length > 0 && (
            <>
              <p style={S.sectionLabel}>🎒 Att ta med</p>
              <p style={styles.hint}>Skapas dagen innan lektionen</p>
              {bringRules.map((rule, idx) => {
                const globalIdx = rules.indexOf(rule);
                return (
                  <button key={idx} onClick={() => toggleRule(globalIdx)} style={{
                    ...styles.ruleCard, background: rule.is_active ? C.successLight : C.bgCard, borderColor: rule.is_active ? C.success : C.borderLight,
                  }}>
                    <span style={styles.ruleIcon}>{rule.icon}</span>
                    <div style={styles.ruleInfo}>
                      <span style={styles.ruleTitle}>{rule.title}</span>
                      <span style={styles.ruleSub}>{rule.subject_icon} {rule.subject_name} · {rule.days_before} dag{rule.days_before > 1 ? 'ar' : ''} innan</span>
                    </div>
                    <div style={{ ...styles.ruleToggle, background: rule.is_active ? C.success : C.border }}>
                      <div style={{ ...styles.ruleToggleKnob, transform: rule.is_active ? 'translateX(20px)' : 'translateX(0)' }} />
                    </div>
                  </button>
                );
              })}
            </>
          )}

          {hwRules.length > 0 && (
            <>
              <p style={{ ...S.sectionLabel, marginTop: 20 }}>📝 Läxor</p>
              <p style={styles.hint}>Välj inlämningsdag — påminnelse skapas dagen innan</p>
              {hwRules.map((rule, idx) => {
                const globalIdx = rules.indexOf(rule);
                return (
                  <div key={idx} style={{ marginBottom: 12 }}>
                    <button onClick={() => toggleRule(globalIdx)} style={{
                      ...styles.ruleCard, marginBottom: 0,
                      background: rule.is_active ? C.successLight : C.bgCard,
                      borderColor: rule.is_active ? C.success : C.borderLight,
                      borderRadius: rule.is_active ? '14px 14px 0 0' : 14,
                    }}>
                      <span style={styles.ruleIcon}>{rule.icon}</span>
                      <div style={styles.ruleInfo}>
                        <span style={styles.ruleTitle}>{rule.title}</span>
                        <span style={styles.ruleSub}>
                          {rule.subject_icon} {rule.subject_name}
                          {rule.due_day ? ` · Inlämning ${DAYS.find(d => d.value === rule.due_day)?.label}` : ' · Välj inlämningsdag'}
                        </span>
                      </div>
                      <div style={{ ...styles.ruleToggle, background: rule.is_active ? C.success : C.border }}>
                        <div style={{ ...styles.ruleToggleKnob, transform: rule.is_active ? 'translateX(20px)' : 'translateX(0)' }} />
                      </div>
                    </button>
                    {rule.is_active && (
                      <div style={styles.dueDayRow}>
                        <span style={styles.dueDayLabel}>Inlämning:</span>
                        {DAYS.map(d => (
                          <button key={d.value} onClick={() => setRuleDueDay(globalIdx, d.value)} style={{
                            ...styles.dueDayBtn,
                            background: rule.due_day === d.value ? C.primary : C.bgCard,
                            color: rule.due_day === d.value ? '#fff' : C.text,
                            borderColor: rule.due_day === d.value ? C.primary : C.borderLight,
                          }}>
                            {d.label}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </>
          )}

          {rules.length === 0 && (
            <div style={S.emptyState}>
              <span style={{ fontSize: 48 }}>✨</span>
              <p style={styles.emptyTitle}>Inga förslag just nu</p>
              <p style={styles.emptyText}>Du kan alltid lägga till påminnelser senare.</p>
            </div>
          )}
        </div>

        <div style={styles.footer}>
          <button onClick={() => setStep(1)} style={styles.backBtn}><ChevronLeft size={18} /> Tillbaka</button>
          <div style={{ flex: 1 }} />
          <button onClick={handleSave} disabled={saving} style={styles.doneBtn}>{saving ? 'Sparar...' : '✅ Klar!'}</button>
        </div>
      </div>
    );
  }

  return null;
}

const styles = {
  page: { minHeight: '100vh', background: C.bg, fontFamily: F.body, display: 'flex', flexDirection: 'column', paddingBottom: 70 },
  header: { display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px', background: C.bgCard, borderBottom: `1px solid ${C.borderLight}` },
  title: { flex: 1, fontFamily: F.heading, fontSize: F.sizes.lg, fontWeight: F.weights.bold, color: C.text, margin: 0 },
  stepLabel: { fontSize: F.sizes.xs, color: C.textMuted, fontFamily: F.heading, fontWeight: F.weights.semi },
  closeBtn: { background: 'none', border: 'none', cursor: 'pointer', padding: 4, minHeight: 44, minWidth: 44, display: 'flex', alignItems: 'center', justifyContent: 'center' },
  body: { flex: 1, padding: '16px', overflowY: 'auto' },
  subtitle: { fontSize: F.sizes.sm, color: C.textMuted, fontFamily: F.heading, margin: '0 0 16px' },
  hint: { fontSize: F.sizes.xs, color: C.textMuted, fontFamily: F.heading, margin: '-4px 0 8px' },
  footer: { position: 'fixed', bottom: 60, left: 0, right: 0, display: 'flex', alignItems: 'center', gap: 8, padding: '12px 16px', borderTop: `1px solid ${C.borderLight}`, background: C.bgCard, zIndex: 50 },
  subjectToggle: { display: 'flex', alignItems: 'center', width: '100%', padding: '12px 16px', borderRadius: 14, border: `1.5px solid ${C.borderLight}`, background: C.bgCard, cursor: 'pointer', textAlign: 'left', marginBottom: 8 },
  subjectToggleText: { flex: 1, fontSize: F.sizes.sm, fontWeight: F.weights.bold, fontFamily: F.heading, color: C.text },
  subjectSection: { padding: '8px 0 12px', borderBottom: `1px solid ${C.borderLight}`, marginBottom: 8 },
  subjectCatLabel: { fontSize: F.sizes.xs, fontWeight: F.weights.bold, fontFamily: F.heading, color: C.textMuted, margin: '8px 0 4px' },
  subjectGrid: { display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 4 },
  subjectCard: { display: 'flex', alignItems: 'center', gap: 4, padding: '8px 10px', borderRadius: 10, border: '1.5px solid', cursor: 'pointer', minHeight: 38 },
  subjectIcon: { fontSize: 16 },
  subjectName: { fontSize: F.sizes.xs, fontWeight: F.weights.bold, fontFamily: F.heading },
  addCustomRow: { display: 'flex', gap: 8, marginTop: 8 },
  addCustomInput: { flex: 1, padding: '10px 14px', borderRadius: 12, border: `1.5px solid ${C.border}`, fontSize: F.sizes.sm, fontFamily: F.heading, color: C.text, background: C.bgCard },
  addCustomBtn: { display: 'inline-flex', alignItems: 'center', gap: 4, padding: '10px 14px', borderRadius: 12, border: 'none', background: C.secondary, color: '#fff', fontSize: F.sizes.sm, fontWeight: F.weights.bold, fontFamily: F.heading, cursor: 'pointer', minHeight: 44 },
  daySection: { marginBottom: 14 },
  dayHeader: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 },
  dayLabel: { fontSize: F.sizes.md, fontWeight: F.weights.extra, fontFamily: F.heading, color: C.text },
  addSlotBtn: { display: 'inline-flex', alignItems: 'center', gap: 4, padding: '6px 12px', borderRadius: 10, border: `1.5px dashed ${C.primary}`, background: 'transparent', color: C.primary, fontSize: F.sizes.xs, fontWeight: F.weights.bold, fontFamily: F.heading, cursor: 'pointer', minHeight: 36 },
  emptyDay: { fontSize: F.sizes.xs, color: C.textMuted, fontFamily: F.heading, fontStyle: 'italic', padding: '4px 0' },
  slotCard: { display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '10px 14px', borderRadius: 12, border: '1.5px solid ' + C.borderLight, borderLeft: '4px solid', background: C.bgCard, cursor: 'pointer', marginBottom: 6, textAlign: 'left' },
  slotIcon: { fontSize: 20 },
  slotInfo: { flex: 1 },
  slotName: { display: 'block', fontSize: F.sizes.sm, fontWeight: F.weights.bold, fontFamily: F.heading, color: C.text },
  slotTime: { display: 'block', fontSize: F.sizes.xs, color: C.textMuted, fontFamily: F.heading },
  ruleCard: { display: 'flex', alignItems: 'center', gap: 12, width: '100%', padding: '12px 14px', borderRadius: 14, border: '1.5px solid', cursor: 'pointer', marginBottom: 8, textAlign: 'left' },
  ruleIcon: { fontSize: 24 },
  ruleInfo: { flex: 1 },
  ruleTitle: { display: 'block', fontSize: F.sizes.sm, fontWeight: F.weights.bold, fontFamily: F.heading, color: C.text },
  ruleSub: { display: 'block', fontSize: F.sizes.xs, color: C.textMuted, fontFamily: F.heading, marginTop: 2 },
  ruleToggle: { width: 44, height: 24, borderRadius: 12, padding: 2, transition: 'background 0.2s', flexShrink: 0 },
  ruleToggleKnob: { width: 20, height: 20, borderRadius: 10, background: '#fff', boxShadow: '0 1px 4px rgba(0,0,0,0.2)', transition: 'transform 0.2s' },
  // Due day picker
  dueDayRow: { display: 'flex', alignItems: 'center', gap: 6, padding: '10px 14px', background: C.successLight, borderRadius: '0 0 14px 14px', border: `1.5px solid ${C.success}`, borderTop: 'none' },
  dueDayLabel: { fontSize: F.sizes.xs, fontWeight: F.weights.bold, fontFamily: F.heading, color: C.text, marginRight: 4 },
  dueDayBtn: { padding: '6px 10px', borderRadius: 8, border: '1.5px solid', fontSize: F.sizes.xs, fontWeight: F.weights.bold, fontFamily: F.heading, cursor: 'pointer', minHeight: 32 },
  emptyTitle: { fontFamily: F.heading, fontSize: F.sizes.lg, fontWeight: F.weights.bold, color: C.text, margin: '12px 0 4px' },
  emptyText: { fontSize: F.sizes.sm, color: C.textMuted, margin: 0, fontFamily: F.heading },
  nextBtn: { display: 'inline-flex', alignItems: 'center', gap: 4, padding: '12px 24px', borderRadius: 12, border: 'none', background: C.primary, color: '#fff', fontSize: F.sizes.md, fontWeight: F.weights.bold, fontFamily: F.heading, cursor: 'pointer', minHeight: 48 },
  backBtn: { display: 'inline-flex', alignItems: 'center', gap: 4, padding: '10px 16px', borderRadius: 12, border: `1.5px solid ${C.border}`, background: C.bgCard, color: C.text, fontSize: F.sizes.sm, fontWeight: F.weights.bold, fontFamily: F.heading, cursor: 'pointer', minHeight: 44 },
  doneBtn: { display: 'inline-flex', alignItems: 'center', gap: 6, padding: '12px 24px', borderRadius: 12, border: 'none', background: C.success, color: '#fff', fontSize: F.sizes.md, fontWeight: F.weights.bold, fontFamily: F.heading, cursor: 'pointer', minHeight: 48 },
};
