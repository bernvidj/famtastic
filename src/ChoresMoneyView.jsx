// ============================================
// FamTastic — ChoresMoneyView
// Sysslor överst → Pengar nedan i ett scroll-flöde
// ============================================

import React from 'react';
import { C, F } from './data';
import { ChoresView } from './chores/ChoresView';
import { MoneyView } from './money/MoneyView';

export function ChoresMoneyView({ familyId, member, members }) {
  return (
    <div style={{ paddingBottom: 'calc(90px + env(safe-area-inset-bottom, 0px))' }}>
      <ChoresView familyId={familyId} member={member} members={members} stacked />
      <div style={styles.divider}>
        <div style={styles.dividerLine} />
        <span style={styles.dividerLabel}>💰 Pengar</span>
        <div style={styles.dividerLine} />
      </div>
      <MoneyView familyId={familyId} member={member} members={members} stacked />
    </div>
  );
}

const styles = {
  divider: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    padding: '8px 20px 0',
    background: C.bg,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    background: C.border,
  },
  dividerLabel: {
    fontFamily: F.heading,
    fontSize: F.sizes.xs,
    fontWeight: F.weights.bold,
    color: C.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    whiteSpace: 'nowrap',
  },
};
