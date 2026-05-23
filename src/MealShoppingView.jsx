// ============================================
// FamTastic — MealShoppingView
// Mat överst → Handla nedan i ett scroll-flöde
// "Generera inköpslista" scrollar ned till Handla
// ============================================

import React, { useRef } from 'react';
import { C, F } from './data';
import { MealPlan } from './meals/MealPlan';
import { ShoppingView } from './shopping/ShoppingView';

export function MealShoppingView({ familyId, member, members }) {
  const shopRef = useRef(null);

  function scrollToShopping() {
    shopRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  return (
    <div style={{ paddingBottom: 'calc(90px + env(safe-area-inset-bottom, 0px))' }}>
      <MealPlan
        familyId={familyId}
        member={member}
        members={members}
        onGenerateShopping={scrollToShopping}
        stacked
      />
      <div style={styles.divider} ref={shopRef}>
        <div style={styles.dividerLine} />
        <span style={styles.dividerLabel}>🛒 Handlingslista</span>
        <div style={styles.dividerLine} />
      </div>
      <ShoppingView familyId={familyId} member={member} members={members} stacked />
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
