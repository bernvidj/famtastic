// ============================================
// FamTastic — ScheduleView (combined: Calendar + School)
// ============================================

import React, { useState } from 'react';
import { C, F } from './data';
import { CalendarView } from './calendar/CalendarView';
import { SchoolView } from './SchoolView';
import { Calendar, GraduationCap } from 'lucide-react';
import { BgShapes } from './BgShapes';


export function ScheduleView({ familyId, member, members }) {
  const [tab, setTab] = useState('school');

  return (
    <div style={styles.page}>
      <BgShapes variant="schedule" />
      <div style={styles.headerZone}>
        <div style={styles.header}>
          <h1 style={styles.pageTitle}>Schema</h1>
        </div>
        <div style={styles.tabRow}>
          <button
            onClick={() => setTab('school')}
            style={{
              ...styles.tabBtn,
              background:  tab === 'school' ? C.primary : C.bgCard,
              color:       tab === 'school' ? '#fff'    : C.textMuted,
              borderColor: tab === 'school' ? C.primary : C.border,
            }}
          >
            <GraduationCap size={16} /> Skola
          </button>
          <button
            onClick={() => setTab('calendar')}
            style={{
              ...styles.tabBtn,
              background:  tab === 'calendar' ? C.primary : C.bgCard,
              color:       tab === 'calendar' ? '#fff'    : C.textMuted,
              borderColor: tab === 'calendar' ? C.primary : C.border,
            }}
          >
            <Calendar size={16} /> Kalender
          </button>
        </div>
      </div>

      <div style={{ position: 'relative', zIndex: 1 }}>
        {tab === 'school'    && <SchoolView   familyId={familyId} member={member} members={members} />}
        {tab === 'calendar'  && <CalendarView familyId={familyId} member={member} members={members} />}
      </div>
    </div>
  );
}

const styles = {
  page: { minHeight: '100vh', background: C.bg, fontFamily: F.body, position: 'relative', paddingBottom: 'calc(90px + env(safe-area-inset-bottom, 0px))' },
  headerZone: {
    position: 'sticky',
    top: 52,
    zIndex: 10,
    background: 'rgba(255,251,245,0.88)',
    backdropFilter: 'blur(16px)',
    WebkitBackdropFilter: 'blur(16px)',
    borderBottom: '1px solid rgba(255,255,255,0.5)',
    paddingBottom: 12,
  },
  header: { padding: '16px 16px 4px' },
  pageTitle: { fontFamily: F.heading, fontSize: F.sizes.xl, fontWeight: F.weights.extra, color: C.text, margin: 0 },
  tabRow: { display: 'flex', gap: 8, padding: '8px 16px 0' },
  tabBtn: {
    display: 'inline-flex', alignItems: 'center', gap: 6, padding: '10px 20px',
    borderRadius: 99, border: '1.5px solid', fontSize: F.sizes.sm, fontWeight: F.weights.bold,
    fontFamily: F.heading, cursor: 'pointer', minHeight: 44,
  },
};
