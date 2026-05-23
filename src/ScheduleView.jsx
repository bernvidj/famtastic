// ============================================
// FamTastic — ScheduleView (combined: Calendar + School)
// ============================================

import React, { useState } from 'react';
import { C, F } from './data';
import { CalendarView } from './calendar/CalendarView';
import { SchoolView } from './SchoolView';
import { Calendar, GraduationCap } from 'lucide-react';

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

export function ScheduleView({ familyId, member, members }) {
  const [tab, setTab] = useState('school');

  return (
    <div style={styles.page}>
      <BgShapes />

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
  page: { minHeight: '100vh', background: C.bg, fontFamily: F.body, position: 'relative', overflow: 'hidden' },
  headerZone: {
    position: 'relative',
    zIndex: 1,
    background: `linear-gradient(135deg, ${C.primaryLight}, ${C.secondaryLight})`,
    borderRadius: '0 0 24px 24px',
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
