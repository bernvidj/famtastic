// ============================================
// FamTastic — MemberLocationCard
// Listrad per familjemedlem i LocationView
// ============================================

import React from 'react';
import { C, F } from '../data';
import { findPlace, formatLastSeen } from './geofence';

export function MemberLocationCard({ member, location, places }) {
  const hasLocation  = !!location;
  const isSharing    = hasLocation && location.sharing_enabled;
  const isRecent     = hasLocation &&
    (Date.now() - new Date(location.recorded_at).getTime()) < 60 * 60 * 1000; // < 1h
  const isActive     = isSharing && isRecent;

  const place = isActive ? findPlace(location, places) : null;

  const placeLine = place
    ? `${place.emoji} ${place.name}`
    : isActive
    ? '📍 Känd position'
    : null;

  const timeLine = hasLocation
    ? formatLastSeen(location.recorded_at)
    : 'Delar inte position';

  const battery = isActive && location.battery_level != null
    ? location.battery_level
    : null;

  return (
    <div style={{
      ...styles.card,
      opacity: isActive ? 1 : 0.5,
    }}>
      {/* Avatar */}
      <div style={{
        ...styles.avatar,
        background: member.color || C.secondary,
      }}>
        {member.avatar || '👤'}
      </div>

      {/* Info */}
      <div style={styles.info}>
        <span style={styles.name}>{member.name}</span>
        {placeLine && (
          <span style={styles.place}>{placeLine}</span>
        )}
        <span style={styles.time}>{timeLine}</span>
      </div>

      {/* Batteri */}
      {battery !== null && (
        <div style={styles.battery}>
          <span style={styles.batteryIcon}>🔋</span>
          <span style={styles.batteryText}>{battery}%</span>
        </div>
      )}
    </div>
  );
}

const styles = {
  card: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    padding: '12px 14px',
    background: '#fff',
    borderRadius: 14,
    border: `1.5px solid ${C.borderLight}`,
    marginBottom: 8,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 22,
    flexShrink: 0,
  },
  info: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    gap: 2,
    minWidth: 0,
  },
  name: {
    fontFamily: F.heading,
    fontWeight: F.weights.bold,
    fontSize: F.sizes.md,
    color: C.text,
  },
  place: {
    fontFamily: F.body,
    fontSize: F.sizes.sm,
    fontWeight: F.weights.semi,
    color: C.secondary,
  },
  time: {
    fontFamily: F.body,
    fontSize: F.sizes.xs,
    color: C.textMuted,
  },
  battery: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 1,
    flexShrink: 0,
  },
  batteryIcon: { fontSize: 14 },
  batteryText: {
    fontSize: F.sizes.xs,
    color: C.textMuted,
    fontFamily: F.body,
  },
};
