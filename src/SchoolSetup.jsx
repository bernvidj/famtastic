// ============================================
// FamTastic — SchoolSetup (wizard: subjects → schedule → rules)
// ============================================

import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import { C, F, S, safeArray } from './data';
import { X, ChevronRight, ChevronLeft, Check, Plus, Trash2 } from 'lucide-react';

const DAYS = [
  { value: 1, label: 'Mån' },
  { value: 2, label: 'Tis' },
  { value: 3, label: 'Ons' },
  { value: 4, label: 'Tor' },
  { value: 5, label: 'Fre' },
];

const TIMES = [];
for (let h = 7; h <= 16; h++) {
  TIMES.push(`${String(h).padStart(2,'0')}:00`);
  TIMES.push(`${String(h).padStart(2,'0')}:30`);
}

// Default rule suggestions per subject category
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
  const [schedule, setSchedule] = useState([]); // { subject_id, day_of_week, start_time, end_time }
  const [rules, setRules] = useState([]); // { subject_id, title, icon, days_before, time_of_day, is_active }
  const [editingSlot, setEditingSlot] = useState(null); // { day, time } or null
  const [slotForm, setSlotForm] = useState({ subject_id: '', start_time: '', end_time: '' });
  const [saving, setSaving] = useState(false);
  const [customSubject, setCustomSubject] = useState('');

  useEffect(() => { loadAll(); }, []);

  async function loadAll() {
    // Load all available subjects
    const { data: subjectData } = await supabase.from('school_subjects')
      .select('*')
      .or(`is_global.eq.true,family_id.eq.${familyId}`)
      .order('category, title');
    setAllSubjects(subjectData || []);

    // Load existing schedule for this child
    const { data: schedData } = await supabase.from('school_schedule')
      .select('*')
      .eq('member_id', memberId);
    if (schedData && schedData.length > 0) {
      setSchedule(schedData.map(s => ({
        subject_id: s.subject_id,
        day_of_week: s.day_of_week,
        start_time: s.start_time,
        end_time: s.end_time,
      })));
      // Pre-select subjects that are in the schedule
      const usedSubjects = [...new Set(schedData.map(s => s.subject_id))];
      setSelectedSubjects(usedSubjects);
    }

    // Load existing rules for this child
    const { data: rulesData } = await supabase.from('school_rules')
      .select('*')
      .eq('member_id', memberId);
    if (rulesData && rulesData.length > 0) {
      setRules(rulesData.map(r => ({
        subject_id: r.subject_id,
        subject_name: (subjectData || []).find(s => s.id === r.subject_id)?.short_name || '?',
        subject_icon: (subjectData || []).find(s => s.id === r.subject_id)?.icon || '📚',
        title: r.title,
        icon: r.icon,
        days_before: r.days_before,
        time_of_day: r.time_of_day,
        is_active: r.is_active,
        rule_type: r.rule_type,
      })));
    }
  }

  function toggleSubject(id) {
    setSelectedSubjects(prev =>
      prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]
    );
  }

  async function addCustomSubject() {
    if (!customSubject.trim()) return;
    const { data, error } = await supabase.from('school_subjects').insert({
      title: customSubject.trim(),
      short_name: customSubject.trim(),
      icon: '📚',
      color: '#6B7280',
      is_global: false,
      family_id: familyId,
      category: 'other',
    }).select().single();
    if (data) {
      setAllSubjects(prev => [...prev, data]);
      setSelectedSubjects(prev => [...prev, data.id]);
      setCustomSubject('');
    }
  }

  // Move to step 2 — schedule grid
  function goToSchedule() {
    if (selectedSubjects.length === 0) return;
    setStep(2);
  }

  // Move to step 3 — generate rule suggestions
  function goToRules() {
    // If rules already loaded from DB, keep them and only add suggestions for new subjects
    const existingSubjectIds = rules.map(r => r.subject_id);
    const suggestions = [...rules];

    selectedSubjects.forEach(sid => {
      if (existingSubjectIds.includes(sid)) return; // already has rules
      const subj = allSubjects.find(s => s.id === sid);
      if (!subj) return;

      const suggestion = RULE_SUGGESTIONS[subj.title];
      if (suggestion) {
        suggestions.push({
          subject_id: sid,
          subject_name: subj.short_name,
          subject_icon: subj.icon,
          ...suggestion,
          is_active: true,
          rule_type: 'bring_item',
        });
      }

      if (HOMEWORK_SUBJECTS.includes(subj.title)) {
        suggestions.push({
          subject_id: sid,
          subject_name: subj.short_name,
          subject_icon: subj.icon,
          title: `${subj.short_name}-läxa`,
          icon: '📝',
          days_before: 2,
          time_of_day: 'evening',
          is_active: false,
          rule_type: 'homework',
        });
      }
    });

    // Remove rules for deselected subjects
    const filtered = suggestions.filter(r => selectedSubjects.includes(r.subject_id));
    setRules(filtered);
    setStep(3);
  }

  // --- Schedule editing ---
  function openSlotEditor(day, time) {
    // Check if there's already a slot here
    const existing = schedule.find(s => s.day_of_week === day && s.start_time === time);
    if (existing) {
      setSlotForm({
        subject_id: existing.subject_id,
        start_time: existing.start_time,
        end_time: existing.end_time,
      });
    } else {
      // Default: 1 hour slot
      const startIdx = TIMES.indexOf(time);
      const endTime = startIdx + 2 < TIMES.length ? TIMES[startIdx + 2] : TIMES[TIMES.length - 1];
      setSlotForm({
        subject_id: selectedSubjects[0] || '',
        start_time: time,
        end_time: endTime,
      });
    }
    setEditingSlot({ day, time });
  }

  function saveSlot() {
    if (!slotForm.subject_id || !slotForm.start_time || !slotForm.end_time) return;
    // Remove any existing slot at this day+start_time
    const filtered = schedule.filter(s =>
      !(s.day_of_week === editingSlot.day && s.start_time === editingSlot.time)
    );
    filtered.push({
      subject_id: slotForm.subject_id,
      day_of_week: editingSlot.day,
      start_time: slotForm.start_time,
      end_time: slotForm.end_time,
    });
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

  // --- Save everything ---
  async function handleSave() {
    setSaving(true);

    // 1. Save schedule
    const scheduleRows = schedule.map(s => ({
      family_id: familyId,
      member_id: memberId,
      subject_id: s.subject_id,
      day_of_week: s.day_of_week,
      start_time: s.start_time,
      end_time: s.end_time,
    }));

    await supabase.from('school_schedule').delete().eq('member_id', memberId);
    if (scheduleRows.length > 0) {
      await supabase.from('school_schedule').insert(scheduleRows);
    }

    // 2. Save rules (all, including inactive for future toggling)
    const ruleRows = rules.map(r => ({
      family_id: familyId,
      member_id: memberId,
      subject_id: r.subject_id,
      rule_type: r.rule_type,
      title: r.title,
      icon: r.icon,
      days_before: r.days_before,
      time_of_day: r.time_of_day,
      is_active: r.is_active,
    }));

    await supabase.from('school_rules').delete().eq('member_id', memberId);
    let savedRules = [];
    if (ruleRows.length > 0) {
      const { data } = await supabase.from('school_rules').insert(ruleRows).select();
      savedRules = data || [];
    }

    // 3. Delete old auto-generated chores for this child (by reference_id linking to old rules)
    // We find all chores with a reference_id that belong to this child
    await supabase.from('chores')
      .delete()
      .eq('family_id', familyId)
      .eq('assigned_to', memberId)
      .not('reference_id', 'is', null);

    // 4. Generate new chores from active rules
    const activeRules = savedRules.filter(r => r.is_active);
    const newChores = [];

    for (const rule of activeRules) {
      // Find which days this subject has lessons
      const subjectSlots = schedule.filter(s => s.subject_id === rule.subject_id);
      // For each lesson day, calculate the reminder day
      const reminderDays = new Set();
      for (const slot of subjectSlots) {
        let reminderDay = slot.day_of_week - rule.days_before;
        // Wrap around: if reminder day < 1, wrap to previous week (5=Fri, 4=Thu, etc.)
        if (reminderDay < 1) reminderDay += 7;
        // Only include weekdays 1-7
        reminderDays.add(reminderDay);
      }

      if (reminderDays.size > 0) {
        newChores.push({
          family_id: familyId,
          title: rule.title,
          description: `Auto: ${allSubjects.find(s => s.id === rule.subject_id)?.short_name || ''}`,
          icon: rule.icon,
          chore_type: 'base',
          points: 0,
          difficulty: 'easy',
          is_recurring: true,
          recurrence_rule: { frequency: 'weekly', days: [...reminderDays].sort((a, b) => a - b) },
          assigned_to: memberId,
          pool: false,
          scheduled_date: null,
          reference_id: rule.id,
          created_by: memberId,
        });
      }
    }

    if (newChores.length > 0) {
      await supabase.from('chores').insert(newChores);
    }

    setSaving(false);
    if (onDone) onDone();
  }

  // --- Subject helpers ---
  function getSubject(id) {
    return allSubjects.find(s => s.id === id);
  }

  function selectedSubjectObjects() {
    return selectedSubjects.map(id => getSubject(id)).filter(Boolean);
  }

  // --- RENDER ---

  // ==================== STEP 1: Pick subjects ====================
  if (step === 1) {
    const globalSubjects = allSubjects.filter(s => s.is_global && s.category !== 'other');
    const otherSubjects = allSubjects.filter(s => s.is_global && s.category === 'other');
    const familySubjects = allSubjects.filter(s => !s.is_global);

    return (
      <div style={styles.page}>
        <div style={styles.header}>
          <button onClick={onClose} style={styles.closeBtn}><X size={20} color={C.textMuted} /></button>
          <h1 style={styles.title}>🎒 {childName}s schema</h1>
          <span style={styles.stepLabel}>Steg 1/3</span>
        </div>

        <div style={styles.body}>
          <p style={styles.subtitle}>Välj ämnen som {childName} har:</p>

          <p style={S.sectionLabel}>Kärnämnen</p>
          <div style={styles.subjectGrid}>
            {globalSubjects.filter(s => s.category === 'core').map(subj => {
              const active = selectedSubjects.includes(subj.id);
              return (
                <button key={subj.id} onClick={() => toggleSubject(subj.id)} style={{
                  ...styles.subjectCard,
                  background: active ? subj.color + '20' : C.bgCard,
                  borderColor: active ? subj.color : C.borderLight,
                }}>
                  <span style={styles.subjectIcon}>{subj.icon}</span>
                  <span style={{ ...styles.subjectName, color: active ? subj.color : C.text }}>
                    {subj.short_name}
                  </span>
                  {active && <Check size={14} color={subj.color} />}
                </button>
              );
            })}
          </div>

          <p style={S.sectionLabel}>Praktiska ämnen</p>
          <div style={styles.subjectGrid}>
            {globalSubjects.filter(s => s.category === 'practical').map(subj => {
              const active = selectedSubjects.includes(subj.id);
              return (
                <button key={subj.id} onClick={() => toggleSubject(subj.id)} style={{
                  ...styles.subjectCard,
                  background: active ? subj.color + '20' : C.bgCard,
                  borderColor: active ? subj.color : C.borderLight,
                }}>
                  <span style={styles.subjectIcon}>{subj.icon}</span>
                  <span style={{ ...styles.subjectName, color: active ? subj.color : C.text }}>
                    {subj.short_name}
                  </span>
                  {active && <Check size={14} color={subj.color} />}
                </button>
              );
            })}
          </div>

          <p style={S.sectionLabel}>Övrigt</p>
          <div style={styles.subjectGrid}>
            {otherSubjects.map(subj => {
              const active = selectedSubjects.includes(subj.id);
              return (
                <button key={subj.id} onClick={() => toggleSubject(subj.id)} style={{
                  ...styles.subjectCard,
                  background: active ? subj.color + '20' : C.bgCard,
                  borderColor: active ? subj.color : C.borderLight,
                }}>
                  <span style={styles.subjectIcon}>{subj.icon}</span>
                  <span style={{ ...styles.subjectName, color: active ? subj.color : C.text }}>
                    {subj.short_name}
                  </span>
                  {active && <Check size={14} color={subj.color} />}
                </button>
              );
            })}
            {familySubjects.map(subj => {
              const active = selectedSubjects.includes(subj.id);
              return (
                <button key={subj.id} onClick={() => toggleSubject(subj.id)} style={{
                  ...styles.subjectCard,
                  background: active ? subj.color + '20' : C.bgCard,
                  borderColor: active ? subj.color : C.borderLight,
                }}>
                  <span style={styles.subjectIcon}>{subj.icon}</span>
                  <span style={{ ...styles.subjectName, color: active ? subj.color : C.text }}>
                    {subj.short_name}
                  </span>
                  {active && <Check size={14} color={subj.color} />}
                </button>
              );
            })}
          </div>

          {/* Add custom subject */}
          <div style={styles.addCustomRow}>
            <input
              type="text"
              placeholder="Eget ämne..."
              value={customSubject}
              onChange={e => setCustomSubject(e.target.value)}
              style={styles.addCustomInput}
              onKeyDown={e => e.key === 'Enter' && addCustomSubject()}
            />
            <button onClick={addCustomSubject} style={styles.addCustomBtn} disabled={!customSubject.trim()}>
              <Plus size={18} /> Lägg till
            </button>
          </div>
        </div>

        <div style={styles.footer}>
          <div style={{ flex: 1 }} />
          <button
            onClick={goToSchedule}
            disabled={selectedSubjects.length === 0}
            style={{ ...styles.nextBtn, opacity: selectedSubjects.length === 0 ? 0.5 : 1 }}
          >
            Nästa <ChevronRight size={18} />
          </button>
        </div>
      </div>
    );
  }

  // ==================== STEP 2: Weekly schedule grid ====================
  if (step === 2) {
    const subjects = selectedSubjectObjects();

    return (
      <div style={styles.page}>
        <div style={styles.header}>
          <button onClick={() => setStep(1)} style={styles.closeBtn}><ChevronLeft size={20} color={C.textMuted} /></button>
          <h1 style={styles.title}>Veckoschema</h1>
          <span style={styles.stepLabel}>Steg 2/3</span>
        </div>

        <div style={styles.body}>
          <p style={styles.subtitle}>Tryck på en dag för att lägga till en lektion.</p>

          {DAYS.map(day => {
            const daySlots = schedule
              .filter(s => s.day_of_week === day.value)
              .sort((a, b) => a.start_time.localeCompare(b.start_time));

            return (
              <div key={day.value} style={styles.daySection}>
                <div style={styles.dayHeader}>
                  <span style={styles.dayLabel}>{day.label}</span>
                  <button
                    onClick={() => openSlotEditor(day.value, '08:00')}
                    style={styles.addSlotBtn}
                  >
                    <Plus size={16} /> Lägg till
                  </button>
                </div>

                {daySlots.length === 0 ? (
                  <p style={styles.emptyDay}>Inga lektioner</p>
                ) : (
                  daySlots.map((slot, i) => {
                    const subj = getSubject(slot.subject_id);
                    return (
                      <button
                        key={i}
                        onClick={() => openSlotEditor(slot.day_of_week, slot.start_time)}
                        style={{
                          ...styles.slotCard,
                          borderLeftColor: subj?.color || C.border,
                        }}
                      >
                        <span style={styles.slotIcon}>{subj?.icon || '📚'}</span>
                        <div style={styles.slotInfo}>
                          <span style={styles.slotName}>{subj?.short_name || '?'}</span>
                          <span style={styles.slotTime}>{slot.start_time.slice(0,5)} – {slot.end_time.slice(0,5)}</span>
                        </div>
                        <Trash2
                          size={16} color={C.textMuted}
                          onClick={(e) => { e.stopPropagation(); removeSlot(slot.day_of_week, slot.start_time); }}
                        />
                      </button>
                    );
                  })
                )}
              </div>
            );
          })}
        </div>

        {/* Slot editor modal */}
        {editingSlot && (
          <div style={styles.overlay}>
            <div style={styles.modal}>
              <h3 style={styles.modalTitle}>
                {DAYS.find(d => d.value === editingSlot.day)?.label} — Lektion
              </h3>

              <label style={styles.fieldLabel}>Ämne</label>
              <div style={styles.subjectPicker}>
                {subjects.map(s => (
                  <button key={s.id} onClick={() => setSlotForm(prev => ({ ...prev, subject_id: s.id }))} style={{
                    ...styles.subjectOption,
                    background: slotForm.subject_id === s.id ? s.color + '20' : C.bgCard,
                    borderColor: slotForm.subject_id === s.id ? s.color : C.borderLight,
                  }}>
                    {s.icon} {s.short_name}
                  </button>
                ))}
              </div>

              <div style={styles.timeRow}>
                <div style={{ flex: 1 }}>
                  <label style={styles.fieldLabel}>Start</label>
                  <select
                    value={slotForm.start_time}
                    onChange={e => setSlotForm(prev => ({ ...prev, start_time: e.target.value }))}
                    style={styles.timeSelect}
                  >
                    {TIMES.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div style={{ flex: 1 }}>
                  <label style={styles.fieldLabel}>Slut</label>
                  <select
                    value={slotForm.end_time}
                    onChange={e => setSlotForm(prev => ({ ...prev, end_time: e.target.value }))}
                    style={styles.timeSelect}
                  >
                    {TIMES.filter(t => t > slotForm.start_time).map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
              </div>

              <div style={styles.modalFooter}>
                <button onClick={() => setEditingSlot(null)} style={styles.cancelBtn}>Avbryt</button>
                <button onClick={saveSlot} style={styles.saveBtn}>
                  <Check size={16} /> Spara
                </button>
              </div>
            </div>
          </div>
        )}

        <div style={styles.footer}>
          <button onClick={() => setStep(1)} style={styles.backBtn}>
            <ChevronLeft size={18} /> Tillbaka
          </button>
          <div style={{ flex: 1 }} />
          <button onClick={goToRules} style={styles.nextBtn}>
            Nästa <ChevronRight size={18} />
          </button>
        </div>
      </div>
    );
  }

  // ==================== STEP 3: Link to-dos ====================
  if (step === 3) {
    const bringRules = rules.filter(r => r.rule_type === 'bring_item');
    const hwRules = rules.filter(r => r.rule_type === 'homework');

    return (
      <div style={styles.page}>
        <div style={styles.header}>
          <button onClick={() => setStep(2)} style={styles.closeBtn}><ChevronLeft size={20} color={C.textMuted} /></button>
          <h1 style={styles.title}>Koppla påminnelser</h1>
          <span style={styles.stepLabel}>Steg 3/3</span>
        </div>

        <div style={styles.body}>
          <p style={styles.subtitle}>
            Appen föreslår påminnelser baserat på schemat. Aktivera de du vill ha!
          </p>

          {bringRules.length > 0 && (
            <>
              <p style={S.sectionLabel}>📦 Ta med-påminnelser</p>
              <p style={styles.hint}>Skapas kvällen innan lektionen</p>
              {bringRules.map((rule, idx) => {
                const globalIdx = rules.indexOf(rule);
                return (
                  <button
                    key={idx}
                    onClick={() => toggleRule(globalIdx)}
                    style={{
                      ...styles.ruleCard,
                      background: rule.is_active ? C.successLight : C.bgCard,
                      borderColor: rule.is_active ? C.success : C.borderLight,
                    }}
                  >
                    <span style={styles.ruleIcon}>{rule.icon}</span>
                    <div style={styles.ruleInfo}>
                      <span style={styles.ruleTitle}>{rule.title}</span>
                      <span style={styles.ruleSub}>
                        {rule.subject_icon} {rule.subject_name} · {rule.days_before} dag{rule.days_before > 1 ? 'ar' : ''} innan
                      </span>
                    </div>
                    <div style={{
                      ...styles.ruleToggle,
                      background: rule.is_active ? C.success : C.border,
                    }}>
                      <div style={{
                        ...styles.ruleToggleKnob,
                        transform: rule.is_active ? 'translateX(20px)' : 'translateX(0)',
                      }} />
                    </div>
                  </button>
                );
              })}
            </>
          )}

          {hwRules.length > 0 && (
            <>
              <p style={{ ...S.sectionLabel, marginTop: 20 }}>📝 Läxpåminnelser</p>
              <p style={styles.hint}>Skapas automatiskt inför varje lektion</p>
              {hwRules.map((rule, idx) => {
                const globalIdx = rules.indexOf(rule);
                return (
                  <button
                    key={idx}
                    onClick={() => toggleRule(globalIdx)}
                    style={{
                      ...styles.ruleCard,
                      background: rule.is_active ? C.successLight : C.bgCard,
                      borderColor: rule.is_active ? C.success : C.borderLight,
                    }}
                  >
                    <span style={styles.ruleIcon}>{rule.icon}</span>
                    <div style={styles.ruleInfo}>
                      <span style={styles.ruleTitle}>{rule.title}</span>
                      <span style={styles.ruleSub}>
                        {rule.subject_icon} {rule.subject_name} · {rule.days_before} dagar innan
                      </span>
                    </div>
                    <div style={{
                      ...styles.ruleToggle,
                      background: rule.is_active ? C.success : C.border,
                    }}>
                      <div style={{
                        ...styles.ruleToggleKnob,
                        transform: rule.is_active ? 'translateX(20px)' : 'translateX(0)',
                      }} />
                    </div>
                  </button>
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
          <button onClick={() => setStep(2)} style={styles.backBtn}>
            <ChevronLeft size={18} /> Tillbaka
          </button>
          <div style={{ flex: 1 }} />
          <button onClick={handleSave} disabled={saving} style={styles.doneBtn}>
            {saving ? 'Sparar...' : '✅ Klar!'}
          </button>
        </div>
      </div>
    );
  }

  return null;
}

// ============================================
// Styles
// ============================================
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

  // Subject grid
  subjectGrid: { display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  subjectCard: {
    display: 'flex', alignItems: 'center', gap: 6, padding: '10px 14px',
    borderRadius: 12, border: '1.5px solid', cursor: 'pointer', minHeight: 44,
  },
  subjectIcon: { fontSize: 18 },
  subjectName: { fontSize: F.sizes.sm, fontWeight: F.weights.bold, fontFamily: F.heading },

  // Add custom
  addCustomRow: { display: 'flex', gap: 8, marginTop: 8 },
  addCustomInput: { flex: 1, padding: '10px 14px', borderRadius: 12, border: `1.5px solid ${C.border}`, fontSize: F.sizes.sm, fontFamily: F.heading, color: C.text, background: C.bgCard },
  addCustomBtn: { display: 'inline-flex', alignItems: 'center', gap: 4, padding: '10px 14px', borderRadius: 12, border: 'none', background: C.secondary, color: '#fff', fontSize: F.sizes.sm, fontWeight: F.weights.bold, fontFamily: F.heading, cursor: 'pointer', minHeight: 44 },

  // Day sections (step 2)
  daySection: { marginBottom: 16 },
  dayHeader: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 },
  dayLabel: { fontSize: F.sizes.md, fontWeight: F.weights.extra, fontFamily: F.heading, color: C.text },
  addSlotBtn: { display: 'inline-flex', alignItems: 'center', gap: 4, padding: '6px 12px', borderRadius: 10, border: `1.5px dashed ${C.primary}`, background: 'transparent', color: C.primary, fontSize: F.sizes.xs, fontWeight: F.weights.bold, fontFamily: F.heading, cursor: 'pointer', minHeight: 36 },
  emptyDay: { fontSize: F.sizes.xs, color: C.textMuted, fontFamily: F.heading, fontStyle: 'italic', padding: '4px 0' },
  slotCard: {
    display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '10px 14px',
    borderRadius: 12, border: '1.5px solid ' + C.borderLight, borderLeft: '4px solid',
    background: C.bgCard, cursor: 'pointer', marginBottom: 6, textAlign: 'left',
  },
  slotIcon: { fontSize: 20 },
  slotInfo: { flex: 1 },
  slotName: { display: 'block', fontSize: F.sizes.sm, fontWeight: F.weights.bold, fontFamily: F.heading, color: C.text },
  slotTime: { display: 'block', fontSize: F.sizes.xs, color: C.textMuted, fontFamily: F.heading },

  // Slot editor modal
  overlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 300, padding: 16 },
  modal: { width: '100%', maxWidth: 400, background: C.bgCard, borderRadius: 20, padding: 20 },
  modalTitle: { fontFamily: F.heading, fontSize: F.sizes.lg, fontWeight: F.weights.bold, color: C.text, margin: '0 0 16px' },
  fieldLabel: { display: 'block', fontSize: F.sizes.xs, fontWeight: F.weights.bold, fontFamily: F.heading, color: C.textMuted, marginBottom: 6, marginTop: 12 },
  subjectPicker: { display: 'flex', flexWrap: 'wrap', gap: 6 },
  subjectOption: { padding: '8px 12px', borderRadius: 10, border: '1.5px solid', fontSize: F.sizes.sm, fontWeight: F.weights.bold, fontFamily: F.heading, cursor: 'pointer', minHeight: 40 },
  timeRow: { display: 'flex', gap: 12, marginTop: 4 },
  timeSelect: { width: '100%', padding: '10px 12px', borderRadius: 12, border: `1.5px solid ${C.border}`, fontSize: F.sizes.sm, fontFamily: F.heading, color: C.text, background: C.bgCard },
  modalFooter: { display: 'flex', gap: 8, marginTop: 20, justifyContent: 'flex-end' },
  cancelBtn: { padding: '10px 18px', borderRadius: 12, border: `1.5px solid ${C.border}`, background: C.bgCard, color: C.text, fontSize: F.sizes.sm, fontWeight: F.weights.bold, fontFamily: F.heading, cursor: 'pointer', minHeight: 44 },
  saveBtn: { display: 'inline-flex', alignItems: 'center', gap: 4, padding: '10px 18px', borderRadius: 12, border: 'none', background: C.primary, color: '#fff', fontSize: F.sizes.sm, fontWeight: F.weights.bold, fontFamily: F.heading, cursor: 'pointer', minHeight: 44 },

  // Rules (step 3)
  ruleCard: {
    display: 'flex', alignItems: 'center', gap: 12, width: '100%', padding: '12px 14px',
    borderRadius: 14, border: '1.5px solid', cursor: 'pointer', marginBottom: 8, textAlign: 'left',
  },
  ruleIcon: { fontSize: 24 },
  ruleInfo: { flex: 1 },
  ruleTitle: { display: 'block', fontSize: F.sizes.sm, fontWeight: F.weights.bold, fontFamily: F.heading, color: C.text },
  ruleSub: { display: 'block', fontSize: F.sizes.xs, color: C.textMuted, fontFamily: F.heading, marginTop: 2 },
  ruleToggle: { width: 44, height: 24, borderRadius: 12, padding: 2, transition: 'background 0.2s', flexShrink: 0 },
  ruleToggleKnob: { width: 20, height: 20, borderRadius: 10, background: '#fff', boxShadow: '0 1px 4px rgba(0,0,0,0.2)', transition: 'transform 0.2s' },

  // Empty
  emptyTitle: { fontFamily: F.heading, fontSize: F.sizes.lg, fontWeight: F.weights.bold, color: C.text, margin: '12px 0 4px' },
  emptyText: { fontSize: F.sizes.sm, color: C.textMuted, margin: 0, fontFamily: F.heading },

  // Buttons
  nextBtn: { display: 'inline-flex', alignItems: 'center', gap: 4, padding: '12px 24px', borderRadius: 12, border: 'none', background: C.primary, color: '#fff', fontSize: F.sizes.md, fontWeight: F.weights.bold, fontFamily: F.heading, cursor: 'pointer', minHeight: 48 },
  backBtn: { display: 'inline-flex', alignItems: 'center', gap: 4, padding: '10px 16px', borderRadius: 12, border: `1.5px solid ${C.border}`, background: C.bgCard, color: C.text, fontSize: F.sizes.sm, fontWeight: F.weights.bold, fontFamily: F.heading, cursor: 'pointer', minHeight: 44 },
  doneBtn: { display: 'inline-flex', alignItems: 'center', gap: 6, padding: '12px 24px', borderRadius: 12, border: 'none', background: C.success, color: '#fff', fontSize: F.sizes.md, fontWeight: F.weights.bold, fontFamily: F.heading, cursor: 'pointer', minHeight: 48 },
};
