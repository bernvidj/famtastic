// ============================================
// FamTastic — useLocationSharing hook
// Watches browser geolocation and upserts to
// Supabase every 30 s while enabled.
// ============================================

import { useEffect, useRef } from 'react';
import { supabase } from '../supabaseClient';

const THROTTLE_MS = 30_000;

export function useLocationSharing(memberId, enabled) {
  const watchId  = useRef(null);
  const lastSent = useRef(0);

  useEffect(() => {
    if (!enabled || !memberId || !navigator.geolocation) return;

    watchId.current = navigator.geolocation.watchPosition(
      async (pos) => {
        const now = Date.now();
        if (now - lastSent.current < THROTTLE_MS) return;
        lastSent.current = now;

        await supabase.rpc('upsert_member_location', {
          p_member_id: memberId,
          p_latitude:  pos.coords.latitude,
          p_longitude: pos.coords.longitude,
          p_accuracy:  Math.round(pos.coords.accuracy),
          p_battery:   null,
        });
      },
      (err) => console.warn('Geolocation error:', err),
      { enableHighAccuracy: true, maximumAge: 10_000, timeout: 20_000 }
    );

    return () => {
      if (watchId.current !== null) {
        navigator.geolocation.clearWatch(watchId.current);
        watchId.current = null;
      }
    };
  }, [memberId, enabled]);

  // När enabled slås av: meddela Supabase att delning är av
  useEffect(() => {
    if (!memberId) return;
    if (!enabled) {
      supabase.rpc('disable_location_sharing', { p_member_id: memberId });
    }
  }, [memberId, enabled]);
}
