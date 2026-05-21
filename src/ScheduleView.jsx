// ============================================
// FamTastic — ScheduleView (combined: Calendar + School)
// ============================================

import React, { useState } from 'react';
import { C, F } from './data';
import { CalendarView } from './calendar/CalendarView';
import { SchoolView } from './SchoolView';
import { Calendar, GraduationCap } from 'lucide-react';

export function ScheduleView({ familyId, member, members }) {
  const [tab, setTab] = useState('school');

  return (
    <div style={styles.page}>
      {/* Sub-tab picker */}
      <div style={styles.tabRow}>
        <button
          onClick={() => setTab('school')}
          style={{
            ...styles.tabBtn,
            background: tab === 'school' ? C.primary : C.bgCard,
            color: tab === 'school' ? '#fff' : C.textMuted,
            borderColor: tab === 'school' ? C.primary : C.border,
          }}
        >
          <GraduationCap size={16} /> Skola
        </button>
        <button
          onClick={() => setTab('calendar')}
          style={{
            ...styles.tabBtn,
            background: tab === 'calendar' ? C.primary : C.bgCard,
            color: tab === 'calendar' ? '#fff' : C.textMuted,
            borderColor: tab === 'calendar' ? C.primary : C.border,
          }}
        >
          <Calendar size={16} /> Kalender
        </button>
      </div>

      {tab === 'school' && (
        <SchoolView familyId={familyId} member={member} members={members} />
      )}
      {tab === 'calendar' && (
        <CalendarView familyId={familyId} member={member} members={members} />
      )}
    </div>
  );
}

const styles = {
  page: { minHeight: '100vh', background: C.bg, fontFamily: F.body },
  tabRow: { display: 'flex', gap: 8, padding: '12px 16px 0' },
  tabBtn: {
    display: 'inline-flex', alignItems: 'center', gap: 6, padding: '10px 20px',
    borderRadius: 99, border: '1.5px solid', fontSize: F.sizes.sm, fontWeight: F.weights.bold,
    fontFamily: F.heading, cursor: 'pointer', minHeight: 44,
  },
};
