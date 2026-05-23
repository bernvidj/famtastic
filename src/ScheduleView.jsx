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
    <svg style={{ position: 'absolute', bottom: 0, left: 0, width: '100%', height: 260, pointerEvents: 'none', zIndex: 0 }}
      viewBox="0 0 400 260" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid slice">
      <path d="M 180 40 Q 390 0, 440 120 Q 468 205, 310 225 Q 155 242, 125 130 Q 100 45, 180 40 Z" fill="#FF7A59" opacity="0.2" />
      <path d="M -65 115 Q 55 65, 150 125 Q 215 170, 162 248 Q 82 288, -25 256 Q -105 225, -65 115 Z" fill="#FFA071" opacity="0.2" />
    </svg>
  );
}

function HeaderBgShapes() {
  return (
    <svg viewBox="0 0 390 120" xmlns="http://www.w3.org/2000/svg"
      style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: -1 }}
      preserveAspectRatio="xMidYMid slice">
      <path d="M 298 -22 Q 418 -8, 412 72 Q 406 132, 308 116 Q 208 98, 224 34 Q 244 -18, 298 -22 Z" fill="#3CB4A6" opacity="0.18" />
      <path d="M 328 -10 Q 424 12, 418 82 Q 410 136, 344 120 Q 280 104, 296 52 Q 314 6, 328 -10 Z" fill="#A8E6DF" opacity="0.22" />
    </svg>
  );
}

export function ScheduleView({ familyId, member, members }) {
  const [tab, setTab] = useState('school');

  return (
    <div style={styles.page}>
      <BgShapes />

      <div style={styles.headerZone}>
        <HeaderBgShapes />
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
    background: C.bg,
    overflow: 'hidden',
    borderRadius: '0 0 24px 24px',
    borderBottom: '1px solid rgba(60,180,166,0.12)',
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
