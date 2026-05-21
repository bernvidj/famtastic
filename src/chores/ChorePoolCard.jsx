// ============================================
// FamTastic — ChorePoolCard (open chore to claim)
// ============================================

import React, { useState } from 'react';
import { HandMetal, Star, Zap, UserCheck } from 'lucide-react';
import { C, F, DIFFICULTY } from '../data';

export function ChorePoolCard({ chore, onClaim, claimedBy, members }) {
  const [confirming, setConfirming] = useState(false);
  const diff = DIFFICULTY[chore.difficulty] || DIFFICULTY.medium;
  const isBase = chore.chore_type === 'base';
  const claimer = claimedBy ? members.find(m => m.id === claimedBy) : null;

  function handleClaim() {
    if (confirming) {
      onClaim();
      setConfirming(false);
    } else {
      setConfirming(true);
      setTimeout(() => setConfirming(false), 4000);
    }
  }

  return (
    <div style={{
      ...styles.card,
      borderColor: claimer ? C.success : C.accent,
      background: claimer ? C.successLight : C.bgCard,
    }}>
      <div style={styles.row}>
        {/* Emoji */}
        <div style={{
          ...styles.emojiWrap,
          background: claimer ? C.successLight : C.accentLight,
        }}>
          <span style={{ fontSize: 24 }}>{chore.icon || '📋'}</span>
        </div>

        {/* Content */}
        <div style={styles.content}>
          <span style={styles.title}>{chore.title}</span>
          <div style={styles.badges}>
            {isBase ? (
              <span style={{ ...styles.badge, background: C.secondaryLight, color: C.secondaryDark }}>
                Grund
              </span>
            ) : (
              <span style={{ ...styles.badge, background: C.primaryLight, color: C.primaryDark }}>
                <Zap size={10} /> Bonus
              </span>
            )}
            {!isBase && chore.points > 0 && (
              <span style={{ ...styles.badge, background: C.accentLight, color: '#92400E' }}>
                <Star size={10} /> {chore.points} kr
              </span>
            )}
            <span style={{ ...styles.badge, background: diff.bg, color: diff.color === C.accent ? '#92400E' : diff.color }}>
              {diff.emoji}
            </span>
          </div>

          {/* Claimed status */}
          {claimer && (
            <div style={styles.claimedRow}>
              <UserCheck size={14} color={C.successDark} />
              <span style={styles.claimedText}>
                {claimer.avatar} {claimer.name} tog denna!
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Claim button (only if not claimed) */}
      {!claimer && (
        <button
          onClick={handleClaim}
          style={{
            ...styles.claimBtn,
            background: confirming ? C.success : C.accent,
          }}
        >
          <HandMetal size={18} color="#fff" />
          <span style={styles.claimText}>
            {confirming ? 'Tryck igen för att bekräfta!' : 'Jag tar den!'}
          </span>
        </button>
      )}
    </div>
  );
}

const styles = {
  card: {
    padding: '14px 16px',
    borderRadius: 16,
    border: '2px dashed',
    marginBottom: 10,
    boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
  },
  row: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: 12,
  },
  emojiWrap: {
    width: 48,
    height: 48,
    borderRadius: 14,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  content: {
    flex: 1,
    minWidth: 0,
  },
  title: {
    display: 'block',
    fontSize: F.sizes.md,
    fontWeight: F.weights.bold,
    fontFamily: F.heading,
    color: C.text,
    marginBottom: 6,
  },
  badges: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: 4,
  },
  badge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 3,
    padding: '2px 8px',
    borderRadius: 99,
    fontSize: F.sizes.xs,
    fontWeight: F.weights.bold,
    fontFamily: F.heading,
  },
  claimedRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
  },
  claimedText: {
    fontSize: F.sizes.sm,
    fontWeight: F.weights.semi,
    fontFamily: F.heading,
    color: C.successDark,
  },
  claimBtn: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    width: '100%',
    padding: '12px',
    borderRadius: 12,
    border: 'none',
    cursor: 'pointer',
    marginTop: 10,
    minHeight: 48,
    transition: 'background 0.2s',
  },
  claimText: {
    fontSize: F.sizes.md,
    fontWeight: F.weights.bold,
    fontFamily: F.heading,
    color: '#fff',
  },
};
