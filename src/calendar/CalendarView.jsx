// ============================================
// FamTastic — CalendarView (week + day + recurring)
// Placeras i: src/calendar/CalendarView.jsx
// ============================================

import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { C, F, S, getWeekNumber, todayStr, safeArray } from '../data';
import { ChevronLeft, ChevronRight, Plus, X, Save, Clock, Users, CheckSquare, Trash2, Repeat } from 'lucide-react';

const WEEKDAYS_SHORT = ['Mån', 'Tis', 'Ons', 'Tor', 'Fre', 'Lör', 'Sön'];
const WEEKDAYS_PICK = [
  { value: 1, label: 'Mån' }, { value: 2, label: 'Tis' }, { value: 3, label: 'Ons' },
  { value: 4, label: 'Tor' }, { value: 5, label: 'Fre' }, { value: 6, label: 'Lör' },
  { value: 7, label: 'Sön' },
];
const CATEGORIES = [
  { value: 'activity', label: 'Aktivitet', icon: '⚽' },
  { value: 'school',   label: 'Skola',     icon: '📚' },
  { value: 'birthday', label: 'Födelsedag',icon: '🎂' },
  { value: 'other',    label: 'Övrigt',    icon: '📌' },
];

function getWeekDates(offset) {
  const now = new Date();
  const day = now.getDay() || 7;
  const monday = new Date(now);
  monday.setDate(now.getDate() - day + 1 + offset * 7);
  const dates = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    dates.push(d);
  }
  return dates;
}

function fmtDate(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function fmtTime(t) { return t ? t.slice(0, 5) : ''; }

function dateToDow(dateStr) {
  const d = new Date(dateStr + 'T12:00:00');
  return d.getDay() || 7;
}

const EMPTY_EVENT = {
  title: '', description: '', event_date: '', start_time: '', end_time: '',
  category: 'other', member_ids: [], color: '', is_recurring: false,
  recurrence_rule: { frequency: 'weekly', days: [] },
};

// ─── Bakgrundsformer ──────────────────────────────────────────────────────────
function BgShapes() {
  return (
    <svg
      style={{
        position: 'absolute', top: 0, left: 0,
        width: '100%', height: '100%',
        opacity: 0.18, pointerEvents: 'none',
      }}
      viewBox="0 0 400 800" xmlns="http://www.w3.org/2000/svg"
      preserveAspectRatio="xMidYMid slice"
    >
      <path d="M -40 -30 Q 100 -60, 180 80 Q 230 180, 120 240 Q 20 290, -30 180 Q -80 80, -40 -30 Z" fill="#3CB4A6" />
      <path d="M 300 -20 Q 430 10, 440 140 Q 448 230, 350 260 Q 260 285, 230 190 Q 205 105, 300 -20 Z" fill="#A8E6DF" />
      <path d="M 220 640 Q 400 600, 440 720 Q 462 800, 320 810 Q 180 818, 160 720 Q 145 640, 220 640 Z" fill="#FF7A59" />
      <path d="M -50 700 Q 50 650, 130 710 Q 185 755, 140 820 Q 75 855, -15 820 Q -90 790, -50 700 Z" fill="#FFA071" />
    </svg>
  );
}

export function CalendarView({ familyId, member, members }) {
  const [weekOffset,   setWeekOffset]   = useState(0);
  const [events,       setEvents]       = useState([]);
  const [chores,       setChores]       = useState([]);
  const [completions,  setCompletions]  = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [selectedDate, setSelectedDate] = useState(null);
  const [editing,      setEditing]      = useState(null);
  const [form,         setForm]         = useState(EMPTY_EVENT);

  const weekDates = getWeekDates(weekOffset);
  const weekNum   = getWeekNumber(weekDates[0]);
  const today     = todayStr();
  const isParent  = member.role === 'admin' || member.role === 'parent';
  const children  = members.filter(m => m.role === 'child');

  useEffect(() => { loadData(); }, [weekOffset, familyId]);

  async function loadData() {
    setLoading(true);
    const startDate = fmtDate(weekDates[0]);
    const endDate   = fmtDate(weekDates[6]);
    const [evRes, chRes, compRes] = await Promise.all([
      supabase.from('calendar_events').select('*').eq('family_id', familyId)
        .or(`and(event_date.gte.${startDate},event_date.lte.${endDate}),is_recurring.eq.true`)
        .order('start_time'),
      supabase.from('chores').select('*').eq('family_id', familyId),
      supabase.from('chore_completions').select('*').eq('family_id', familyId)
        .gte('completed_date', startDate).lte('completed_date', endDate),
    ]);
    setEvents(evRes.data || []);
    setChores(chRes.data || []);
    setCompletions(compRes.data || []);
    setLoading(false);
  }

  function getEventsForDate(dateStr) {
    const dow = dateToDow(dateStr);
    return events.filter(ev => {
      if (!ev.is_recurring) return ev.event_date === dateStr;
      const days = safeArray(ev.recurrence_rule?.days);
      if (days.length > 0) return days.includes(dow);
      return dateToDow(ev.event_date) === dow;
    });
  }

  function getChoresForDate(dateStr) {
    const dow = dateToDow(dateStr);
    return chores.filter(c => {
      if (c.is_recurring && c.recurrence_rule) {
        const days = safeArray(c.recurrence_rule.days);
        if (days.length > 0) return days.includes(dow);
      }
      return !c.is_recurring;
    });
  }

  function isChoreCompleted(choreId, memberId, dateStr) {
    return completions.some(c => c.chore_id === choreId && c.member_id === memberId && c.completed_date === dateStr);
  }

  function getMember(id) { return members.find(m => m.id === id); }

  function getMemberColor(memberIds) {
    if (!Array.isArray(memberIds) || memberIds.length === 0) return C.secondary;
    const m = getMember(memberIds[0]);
    return m?.color || C.secondary;
  }

  function openNewEvent(dateStr) { setForm({ ...EMPTY_EVENT, event_date: dateStr }); setEditing('new'); }

  function openEditEvent(event) {
    setForm({
      title: event.title || '', description: event.description || '',
      event_date: event.event_date || '',
      start_time: event.start_time ? fmtTime(event.start_time) : '',
      end_time:   event.end_time   ? fmtTime(event.end_time)   : '',
      category: event.category || 'other', member_ids: safeArray(event.member_ids),
      color: event.color || '', is_recurring: event.is_recurring || false,
      recurrence_rule: event.recurrence_rule || { frequency: 'weekly', days: [] },
    });
    setEditing(event);
  }

  function toggleFormDay(day) {
    setForm(prev => {
      const rule = { ...prev.recurrence_rule };
      const days = Array.isArray(rule.days) ? [...rule.days] : [];
      rule.days = days.includes(day) ? days.filter(d => d !== day) : [...days, day].sort((a, b) => a - b);
      return { ...prev, recurrence_rule: rule };
    });
  }

  async function handleSave() {
    if (!form.title.trim()) return;
    const data = {
      family_id: familyId, title: form.title.trim(),
      description: form.description.trim() || null,
      event_date: form.event_date,
      start_time: form.start_time || null, end_time: form.end_time || null,
      category: form.category, member_ids: form.member_ids,
      color: form.color || null, is_recurring: form.is_recurring,
      recurrence_rule: form.is_recurring ? form.recurrence_rule : null,
      created_by: member.id,
    };
    if (editing && editing !== 'new' && editing.id) {
      await supabase.from('calendar_events').update(data).eq('id', editing.id);
    } else {
      await supabase.from('calendar_events').insert(data);
    }
    setEditing(null);
    loadData();
  }

  async function handleDelete(eventId) {
    await supabase.from('calendar_events').delete().eq('id', eventId);
    setEditing(null);
    loadData();
  }

  function toggleMember(memberId) {
    setForm(prev => ({
      ...prev,
      member_ids: prev.member_ids.includes(memberId)
        ? prev.member_ids.filter(id => id !== memberId)
        : [...prev.member_ids, memberId],
    }));
  }

  return (
    <div style={styles.page}>
      <BgShapes />

      {/* Header */}
      <div style={styles.header}>
        <h1 style={styles.pageTitle}>📅 Kalender</h1>
        {isParent && selectedDate && (
          <button onClick={() => openNewEvent(selectedDate)} style={{ ...S.button, ...S.buttonPrimary, padding: '8px 16px' }}>
            <Plus size={18} /> Ny händelse
          </button>
        )}
      </div>

      {/* Week nav */}
      <div style={styles.weekNav}>
        <button onClick={() => setWeekOffset(w => w - 1)} style={styles.weekBtn}>
          <ChevronLeft size={20} color={C.text} />
        </button>
        <div style={styles.weekTitle}>
          <span style={styles.weekLabel}>Vecka {weekNum}</span>
          {weekOffset !== 0 && (
            <button onClick={() => { setWeekOffset(0); setSelectedDate(today); }} style={styles.todayBtn}>Idag</button>
          )}
        </div>
        <button onClick={() => setWeekOffset(w => w + 1)} style={styles.weekBtn}>
          <ChevronRight size={20} color={C.text} />
        </button>
      </div>

      {/* Week strip */}
      <div style={styles.weekStrip}>
        {weekDates.map((d, i) => {
          const dateStr     = fmtDate(d);
          const isToday     = dateStr === today;
          const isSelected  = dateStr === selectedDate;
          const eventsForDay = getEventsForDate(dateStr);
          return (
            <button
              key={i}
              onClick={() => setSelectedDate(dateStr === selectedDate ? null : dateStr)}
              style={{ ...styles.dayCol, background: isSelected ? C.primary : isToday ? C.primaryLight : 'transparent', borderRadius: 14 }}
            >
              <span style={{ ...styles.dayName, color: isSelected ? '#fff' : isToday ? C.primary : C.textMuted }}>
                {WEEKDAYS_SHORT[i]}
              </span>
              <span style={{ ...styles.dayNum, color: isSelected ? '#fff' : isToday ? C.primary : C.text, fontWeight: isToday || isSelected ? F.weights.extra : F.weights.semi }}>
                {d.getDate()}
              </span>
              <div style={styles.dotRow}>
                {eventsForDay.slice(0, 3).map((ev, ei) => (
                  <div key={ev.id + '-' + ei} style={{ ...styles.dot, background: isSelected ? 'rgba(255,255,255,0.7)' : (ev.color || getMemberColor(safeArray(ev.member_ids))) }} />
                ))}
              </div>
            </button>
          );
        })}
      </div>

      {/* Content */}
      {loading ? (
        <p style={styles.loadingText}>Laddar...</p>
      ) : !selectedDate ? (
        <div style={styles.content}>
          {weekDates.map((d, i) => {
            const dateStr = fmtDate(d);
            const evs     = getEventsForDate(dateStr);
            const chs     = getChoresForDate(dateStr);
            const isToday = dateStr === today;
            if (evs.length === 0 && chs.length === 0) return null;
            return (
              <button key={i} onClick={() => setSelectedDate(dateStr)} style={{ ...styles.weekDayRow, borderLeft: isToday ? `4px solid ${C.primary}` : `4px solid transparent`, background: isToday ? C.primaryLight : C.bgCard }}>
                <div style={styles.weekDayHeader}>
                  <span style={{ ...styles.weekDayName, color: isToday ? C.primary : C.text }}>
                    {WEEKDAYS_SHORT[i]} {d.getDate()}/{d.getMonth() + 1}
                  </span>
                </div>
                {evs.map((ev, ei) => (
                  <div key={ev.id + '-' + ei} style={styles.weekEventRow}>
                    <div style={{ ...styles.weekEventDot, background: ev.color || getMemberColor(safeArray(ev.member_ids)) }} />
                    <span style={styles.weekEventTitle}>{ev.start_time ? fmtTime(ev.start_time) + ' ' : ''}{ev.title}</span>
                    {ev.is_recurring && <Repeat size={10} color={C.textMuted} />}
                  </div>
                ))}
                {chs.length > 0 && (
                  <div style={styles.weekChoreRow}>
                    <CheckSquare size={12} color={C.textMuted} />
                    <span style={styles.weekChoreText}>{chs.length} syssla{chs.length > 1 ? 'or' : ''}</span>
                  </div>
                )}
              </button>
            );
          })}
          {weekDates.every(d => getEventsForDate(fmtDate(d)).length === 0 && getChoresForDate(fmtDate(d)).length === 0) && (
            <div style={styles.emptyState}>
              <span style={{ fontSize: 40 }}>📅</span>
              <p style={styles.emptyTitle}>Lugn vecka!</p>
              <p style={styles.emptyText}>Klicka på en dag för att lägga till händelser.</p>
            </div>
          )}
        </div>
      ) : (
        <div style={styles.content}>
          <div style={styles.dayDetailHeader}>
            <h2 style={styles.dayDetailTitle}>
              {WEEKDAYS_SHORT[dateToDow(selectedDate) - 1]} {new Date(selectedDate + 'T12:00:00').getDate()}/{new Date(selectedDate + 'T12:00:00').getMonth() + 1}
            </h2>
            {isParent && (
              <button onClick={() => openNewEvent(selectedDate)} style={styles.addEventBtn}>
                <Plus size={14} /> Lägg till
              </button>
            )}
          </div>

          {getEventsForDate(selectedDate).length > 0 && (
            <div style={styles.section}>
              <h3 style={styles.sectionLabel}>Händelser</h3>
              {getEventsForDate(selectedDate).map((ev, ei) => {
                const catInfo = CATEGORIES.find(c => c.value === ev.category) || CATEGORIES[3];
                return (
                  <button key={ev.id + '-' + ei} onClick={() => isParent && openEditEvent(ev)} style={{ ...styles.eventCard, borderLeft: `4px solid ${ev.color || getMemberColor(safeArray(ev.member_ids))}` }}>
                    <div style={styles.eventTop}>
                      <span style={styles.eventIcon}>{catInfo.icon}</span>
                      <div style={styles.eventContent}>
                        <span style={styles.eventTitle}>
                          {ev.title}
                          {ev.is_recurring && <Repeat size={12} color={C.textMuted} style={{ marginLeft: 6 }} />}
                        </span>
                        {(ev.start_time || ev.end_time) && (
                          <span style={styles.eventTime}>
                            <Clock size={12} color={C.textMuted} />
                            {fmtTime(ev.start_time)}{ev.end_time ? ` – ${fmtTime(ev.end_time)}` : ''}
                          </span>
                        )}
                        {ev.description && <span style={styles.eventDesc}>{ev.description}</span>}
                      </div>
                    </div>
                    {safeArray(ev.member_ids).length > 0 && (
                      <div style={styles.eventMembers}>
                        {safeArray(ev.member_ids).map(mid => {
                          const m = getMember(mid);
                          return m ? <span key={mid} style={styles.eventMemberBadge}>{m.avatar} {m.name}</span> : null;
                        })}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          )}

          {getChoresForDate(selectedDate).length > 0 && (
            <div style={styles.section}>
              <h3 style={styles.sectionLabel}>Sysslor</h3>
              {children.map(child => {
                const childChores = getChoresForDate(selectedDate).filter(c => !c.assigned_to || c.assigned_to === child.id);
                if (childChores.length === 0) return null;
                return (
                  <div key={child.id} style={styles.choreGroup}>
                    <span style={styles.choreGroupLabel}>{child.avatar} {child.name}</span>
                    {childChores.map(chore => {
                      const done = isChoreCompleted(chore.id, child.id, selectedDate);
                      return (
                        <div key={chore.id} style={{ ...styles.choreItem, opacity: done ? 0.5 : 1 }}>
                          <span style={{ ...styles.choreCheck, color: done ? C.success : C.border }}>{done ? '✅' : '○'}</span>
                          <span style={{ ...styles.choreName, textDecoration: done ? 'line-through' : 'none' }}>{chore.icon} {chore.title}</span>
                          {chore.chore_type === 'bonus' && chore.points > 0 && <span style={styles.chorePoints}>{chore.points} kr</span>}
                          {chore.chore_type === 'base' && <span style={styles.choreBase}>Grund</span>}
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          )}

          {getEventsForDate(selectedDate).length === 0 && getChoresForDate(selectedDate).length === 0 && (
            <div style={styles.emptyDay}><p style={styles.emptyDayText}>Inget planerat denna dag</p></div>
          )}
        </div>
      )}

      <div style={{ height: 80 }} />

      {/* Event editor modal */}
      {editing && (
        <div style={styles.overlay}>
          <div style={styles.modal}>
            <div style={styles.modalHeader}>
              <h2 style={styles.modalTitle}>{editing === 'new' ? 'Ny händelse' : 'Redigera händelse'}</h2>
              <button onClick={() => setEditing(null)} style={styles.closeBtn}><X size={20} color={C.textMuted} /></button>
            </div>
            <div style={styles.modalBody}>
              <label style={styles.label}>Titel</label>
              <input type="text" placeholder="T.ex. Fotbollsträning" value={form.title} onChange={e => setForm(prev => ({ ...prev, title: e.target.value }))} style={S.input} autoFocus />

              <label style={{ ...styles.label, marginTop: 14 }}>Datum</label>
              <input type="date" value={form.event_date} onChange={e => setForm(prev => ({ ...prev, event_date: e.target.value }))} style={S.input} />

              <div style={styles.timeRow}>
                <div style={{ flex: 1 }}>
                  <label style={styles.label}>Starttid</label>
                  <input type="time" value={form.start_time} onChange={e => setForm(prev => ({ ...prev, start_time: e.target.value }))} style={S.input} />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={styles.label}>Sluttid</label>
                  <input type="time" value={form.end_time} onChange={e => setForm(prev => ({ ...prev, end_time: e.target.value }))} style={S.input} />
                </div>
              </div>

              <label style={{ ...styles.label, marginTop: 14 }}>Kategori</label>
              <div style={styles.catRow}>
                {CATEGORIES.map(cat => (
                  <button key={cat.value} onClick={() => setForm(prev => ({ ...prev, category: cat.value }))} style={{ ...styles.catBtn, background: form.category === cat.value ? C.primary : C.bgCard, color: form.category === cat.value ? '#fff' : C.text, border: form.category === cat.value ? `2px solid ${C.primary}` : `2px solid ${C.border}` }}>
                    {cat.icon} {cat.label}
                  </button>
                ))}
              </div>

              <label style={{ ...styles.label, marginTop: 14 }}>Vilka gäller det?</label>
              <div style={styles.memberRow}>
                {members.map(m => (
                  <button key={m.id} onClick={() => toggleMember(m.id)} style={{ ...styles.memberBtn, background: form.member_ids.includes(m.id) ? C.primaryLight : C.bgCard, border: form.member_ids.includes(m.id) ? `2px solid ${C.primary}` : `2px solid ${C.border}` }}>
                    {m.avatar} {m.name}
                  </button>
                ))}
              </div>

              <label style={{ ...styles.label, marginTop: 14 }}>Återkommande</label>
              <div style={styles.toggleRow}>
                <button onClick={() => setForm(prev => ({ ...prev, is_recurring: false }))} style={{ ...styles.toggleBtn, background: !form.is_recurring ? C.text : C.bgCard, color: !form.is_recurring ? '#fff' : C.text }}>Engång</button>
                <button onClick={() => setForm(prev => ({ ...prev, is_recurring: true }))} style={{ ...styles.toggleBtn, background: form.is_recurring ? C.text : C.bgCard, color: form.is_recurring ? '#fff' : C.text }}>Varje vecka</button>
              </div>

              {form.is_recurring && (
                <div style={styles.dayPickRow}>
                  {WEEKDAYS_PICK.map(d => {
                    const days   = Array.isArray(form.recurrence_rule?.days) ? form.recurrence_rule.days : [];
                    const active = days.includes(d.value);
                    return (
                      <button key={d.value} onClick={() => toggleFormDay(d.value)} style={{ ...styles.dayPickBtn, background: active ? C.primary : C.bgCard, color: active ? '#fff' : C.text, border: active ? `2px solid ${C.primary}` : `2px solid ${C.border}` }}>
                        {d.label}
                      </button>
                    );
                  })}
                </div>
              )}

              <label style={{ ...styles.label, marginTop: 14 }}>Beskrivning (valfritt)</label>
              <input type="text" placeholder="Extra info..." value={form.description} onChange={e => setForm(prev => ({ ...prev, description: e.target.value }))} style={S.input} />
            </div>

            <div style={styles.modalFooter}>
              {editing !== 'new' && editing.id && (
                <button onClick={() => handleDelete(editing.id)} style={styles.deleteBtn}><Trash2 size={16} /> Ta bort</button>
              )}
              <div style={{ flex: 1 }} />
              <button onClick={handleSave} disabled={!form.title.trim() || !form.event_date} style={{ ...S.button, ...S.buttonPrimary, opacity: form.title.trim() && form.event_date ? 1 : 0.5 }}>
                <Save size={16} /> {editing === 'new' ? 'Skapa' : 'Spara'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const styles = {
  page: { minHeight: '100vh', background: C.bg, fontFamily: F.body, position: 'relative', overflow: 'hidden' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 16px 8px', position: 'relative', zIndex: 1 },
  pageTitle: { fontFamily: F.heading, fontSize: F.sizes.xl, fontWeight: F.weights.extra, color: C.text, margin: 0 },
  weekNav: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '4px 16px', position: 'relative', zIndex: 1 },
  weekBtn: { background: 'none', border: 'none', cursor: 'pointer', padding: 8 },
  weekTitle: { display: 'flex', alignItems: 'center', gap: 8 },
  weekLabel: { fontFamily: F.heading, fontSize: F.sizes.lg, fontWeight: F.weights.extra, color: C.text },
  todayBtn: { padding: '4px 12px', borderRadius: 8, border: 'none', background: C.primaryLight, color: C.primary, fontSize: F.sizes.xs, fontWeight: F.weights.bold, fontFamily: F.heading, cursor: 'pointer' },
  weekStrip: { display: 'flex', gap: 4, padding: '8px 12px 12px', overflowX: 'auto', position: 'relative', zIndex: 1 },
  dayCol: { flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '10px 4px', minWidth: 44, cursor: 'pointer', border: 'none', background: 'none' },
  dayName: { fontSize: F.sizes.xs, marginBottom: 4, fontFamily: F.heading, fontWeight: F.weights.semi },
  dayNum: { fontSize: F.sizes.lg, marginBottom: 4, fontFamily: F.heading },
  dotRow: { display: 'flex', gap: 3, marginTop: 2 },
  dot: { width: 6, height: 6, borderRadius: 3 },
  content: { padding: '0 16px', position: 'relative', zIndex: 1 },
  loadingText: { textAlign: 'center', color: C.textMuted, padding: 32, position: 'relative', zIndex: 1 },
  weekDayRow: { display: 'block', width: '100%', padding: '10px 14px', borderRadius: 12, border: `1px solid ${C.borderLight}`, marginBottom: 6, cursor: 'pointer', textAlign: 'left' },
  weekDayHeader: { marginBottom: 4 },
  weekDayName: { fontFamily: F.heading, fontSize: F.sizes.sm, fontWeight: F.weights.bold },
  weekEventRow: { display: 'flex', alignItems: 'center', gap: 6, padding: '3px 0' },
  weekEventDot: { width: 8, height: 8, borderRadius: 4, flexShrink: 0 },
  weekEventTitle: { fontSize: F.sizes.sm, color: C.text },
  weekChoreRow: { display: 'flex', alignItems: 'center', gap: 4, padding: '3px 0' },
  weekChoreText: { fontSize: F.sizes.xs, color: C.textMuted },
  dayDetailHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  dayDetailTitle: { fontFamily: F.heading, fontSize: F.sizes.lg, fontWeight: F.weights.extra, color: C.text, margin: 0 },
  addEventBtn: { display: 'flex', alignItems: 'center', gap: 4, padding: '6px 12px', borderRadius: 8, border: `1px dashed ${C.primary}`, background: C.primaryLight, color: C.primary, fontSize: F.sizes.xs, fontWeight: F.weights.bold, fontFamily: F.heading, cursor: 'pointer' },
  section: { marginBottom: 16 },
  sectionLabel: { fontFamily: F.heading, fontSize: F.sizes.sm, fontWeight: F.weights.bold, color: C.textMuted, margin: '0 0 8px', textTransform: 'uppercase', letterSpacing: 0.5 },
  eventCard: { display: 'block', width: '100%', padding: '12px 14px', background: C.bgCard, borderRadius: 12, border: `1px solid ${C.borderLight}`, marginBottom: 6, cursor: 'pointer', textAlign: 'left' },
  eventTop: { display: 'flex', gap: 10 },
  eventIcon: { fontSize: 20, flexShrink: 0, paddingTop: 2 },
  eventContent: { flex: 1 },
  eventTitle: { display: 'flex', alignItems: 'center', fontSize: F.sizes.md, fontWeight: F.weights.bold, fontFamily: F.heading, color: C.text, marginBottom: 2 },
  eventTime: { display: 'flex', alignItems: 'center', gap: 4, fontSize: F.sizes.xs, color: C.textMuted, marginBottom: 2 },
  eventDesc: { display: 'block', fontSize: F.sizes.sm, color: C.textMuted },
  eventMembers: { display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 8 },
  eventMemberBadge: { padding: '2px 8px', borderRadius: 6, background: C.bg, fontSize: F.sizes.xs, color: C.text },
  choreGroup: { marginBottom: 10 },
  choreGroupLabel: { display: 'block', fontSize: F.sizes.sm, fontWeight: F.weights.bold, fontFamily: F.heading, color: C.text, marginBottom: 6 },
  choreItem: { display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', background: C.bgCard, borderRadius: 10, border: `1px solid ${C.borderLight}`, marginBottom: 4 },
  choreCheck: { fontSize: 16, flexShrink: 0 },
  choreName: { flex: 1, fontSize: F.sizes.sm, color: C.text },
  chorePoints: { fontSize: F.sizes.xs, fontWeight: F.weights.bold, color: C.accent, background: C.accentLight, padding: '2px 6px', borderRadius: 4 },
  choreBase: { fontSize: F.sizes.xs, fontWeight: F.weights.bold, color: C.secondary, background: C.secondaryLight, padding: '2px 6px', borderRadius: 4 },
  emptyState: { textAlign: 'center', padding: '32px 20px' },
  emptyTitle: { fontFamily: F.heading, fontSize: F.sizes.lg, fontWeight: F.weights.bold, color: C.text, margin: '10px 0 4px' },
  emptyText: { fontSize: F.sizes.sm, color: C.textMuted, margin: 0 },
  emptyDay: { textAlign: 'center', padding: 24 },
  emptyDayText: { fontSize: F.sizes.sm, color: C.textMuted },
  overlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', zIndex: 200 },
  modal: { width: '100%', maxWidth: 500, maxHeight: '90vh', background: C.bgCard, borderRadius: '20px 20px 0 0', display: 'flex', flexDirection: 'column' },
  modalHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', borderBottom: `1px solid ${C.borderLight}` },
  modalTitle: { fontFamily: F.heading, fontSize: F.sizes.lg, fontWeight: F.weights.bold, color: C.text, margin: 0 },
  closeBtn: { background: 'none', border: 'none', cursor: 'pointer', padding: 4 },
  modalBody: { padding: '16px 20px', overflowY: 'auto', flex: 1 },
  label: { display: 'block', fontSize: F.sizes.sm, fontWeight: F.weights.semi, color: C.text, marginBottom: 6 },
  timeRow: { display: 'flex', gap: 10, marginTop: 14 },
  catRow: { display: 'flex', flexWrap: 'wrap', gap: 6 },
  catBtn: { padding: '6px 12px', borderRadius: 8, fontSize: F.sizes.xs, fontWeight: F.weights.bold, fontFamily: F.heading, cursor: 'pointer' },
  memberRow: { display: 'flex', flexWrap: 'wrap', gap: 6 },
  memberBtn: { padding: '6px 12px', borderRadius: 8, fontSize: F.sizes.sm, fontWeight: F.weights.semi, fontFamily: F.heading, cursor: 'pointer' },
  toggleRow: { display: 'flex', gap: 6, marginBottom: 4 },
  toggleBtn: { padding: '8px 16px', borderRadius: 10, border: `1px solid ${C.border}`, fontSize: F.sizes.sm, fontWeight: F.weights.semi, fontFamily: F.heading, cursor: 'pointer' },
  dayPickRow: { display: 'flex', gap: 4, marginTop: 10 },
  dayPickBtn: { flex: 1, padding: '8px 2px', borderRadius: 8, fontSize: F.sizes.xs, fontWeight: F.weights.bold, fontFamily: F.heading, cursor: 'pointer', textAlign: 'center' },
  modalFooter: { display: 'flex', alignItems: 'center', gap: 8, padding: '12px 20px env(safe-area-inset-bottom, 12px)', borderTop: `1px solid ${C.borderLight}` },
  deleteBtn: { display: 'inline-flex', alignItems: 'center', gap: 4, padding: '8px 14px', borderRadius: 10, border: 'none', background: C.errorLight, color: C.error, fontSize: F.sizes.sm, fontWeight: F.weights.semi, cursor: 'pointer' },
};
