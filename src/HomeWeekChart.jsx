// ============================================
// FamTastic — HomeWeekChart
// Extracted from Home.jsx — "Veckans sysslor" bar chart
// BUG FIX: pct capped at 100, overflow: hidden on bar bg
// ============================================

import React from 'react';
import { C, F, S, safeArray } from './data';

const WEEKDAYS_SHORT = ['Mån', 'Tis', 'Ons', 'Tor', 'Fre', 'Lör', 'Sön'];

export function HomeWeekChart({ weekDates, chores, completions, children, today, fmtDate }) {

  function dayCompletions(dateStr) {
    return completions.filter(c => c.completed_date === dateStr).length;
  }

  function dayExpected(dateStr) {
    const dow = new Date(dateStr + 'T12:00:00').getDay() || 7;
    let count = 0;
    for (const c of chores) {
      if (c.pool) continue;
      if (c.scheduled_date) {
        if (c.scheduled_date !== dateStr) continue;
        count += c.assigned_to ? 1 : children.length;
        continue;
      }
      if (c.is_recurring && c.recurrence_rule) {
        if (c.recurrence_rule.until && dateStr > c.recurrence_rule.until) continue;
        const days = safeArray(c.recurrence_rule.days);
        if (days.length > 0 && !days.includes(dow)) continue;
      }
      count += c.assigned_to ? 1 : children.length;
    }
    return count;
  }

  return (
    <div style={styles.section}>
      <p style={S.sectionLabel}>Veckans sysslor</p>
      <div style={styles.chartWrap}>
        {weekDates.map((d, i) => {
          const ds = fmtDate(d);
          const done = dayCompletions(ds);
          const expected = dayExpected(ds);
          const pct = expected > 0 ? Math.min(100, (done / expected) * 100) : 0;
          const isToday2 = ds === today;
          const isFuture = ds > today;
          const barColor = isFuture ? C.borderLight : pct >= 100 ? C.success : pct > 0 ? C.primary : C.borderLight;
          return (
            <div key={i} style={styles.chartCol}>
              <div style={styles.chartBarBg}>
                <div style={{ ...styles.chartBar, height: `${Math.max(4, pct)}%`, background: barColor }} />
              </div>
              <span style={{ ...styles.chartLabel, color: isToday2 ? C.primary : C.textMuted, fontWeight: isToday2 ? F.weights.bold : F.weights.normal }}>
                {WEEKDAYS_SHORT[i]}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

const styles = {
  section: { padding: '0 16px', marginBottom: 16 },
  chartWrap: { display: 'flex', gap: 4, padding: '8px 4px', background: C.bgCard, borderRadius: 16, border: `1.5px solid ${C.borderLight}`, height: 110, alignItems: 'flex-end' },
  chartCol: { flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, height: '100%', justifyContent: 'flex-end' },
  chartBarBg: { width: '100%', flex: 1, display: 'flex', alignItems: 'flex-end', justifyContent: 'center', overflow: 'hidden' },
  chartBar: { width: '70%', borderRadius: '6px 6px 0 0', minHeight: 4, transition: 'height 0.3s ease' },
  chartLabel: { fontSize: 10, fontFamily: F.heading, flexShrink: 0 },
};
