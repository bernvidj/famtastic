// ============================================
// FamTastic — LocationView
// "Var är vi?" — karta + memberlista + toggle
// Använder SECURITY DEFINER RPCs → funkar för barn och föräldrar
// ============================================

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../supabaseClient';
import { C, F, TOPBAR_H } from '../data';
import { FamilyMap } from './FamilyMap';
import { MemberLocationCard } from './MemberLocationCard';
import { PlacesEditor } from './PlacesEditor';
import { Portal } from '../Portal';
import { sendPushToFamily } from '../notifications/sendPush';

export function LocationView({ familyId, member, members }) {
  const [locations, setLocations]   = useState([]);
  const [places, setPlaces]         = useState([]);
  const [mySharing, setMySharing]   = useState(false);
  const [showPlaces, setShowPlaces] = useState(false);
  const [loading, setLoading]       = useState(true);
  const [toggling, setToggling]     = useState(false);
  const pollRef                     = useRef(null);

  const isParent = member.role === 'admin' || member.role === 'parent';

  // Läs via SECURITY DEFINER RPCs — fungerar oavsett auth-status
  const load = useCallback(async () => {
    const [locRes, placeRes] = await Promise.all([
      supabase.rpc('get_family_locations', { p_family_id: familyId }),
      supabase.rpc('get_family_places',    { p_family_id: familyId }),
    ]);
    const locs = Array.isArray(locRes.data) ? locRes.data : [];
    setLocations(locs);
    setPlaces(Array.isArray(placeRes.data) ? placeRes.data : []);
    const mine = locs.find((l) => l.member_id === member.id);
    setMySharing(mine?.sharing_enabled ?? false);
    setLoading(false);
  }, [familyId, member.id]);

  useEffect(() => { load(); }, [load]);

  // Poll var 30:e sekund (Realtime fungerar inte för barn utan auth-session)
  useEffect(() => {
    pollRef.current = setInterval(load, 30_000);
    return () => clearInterval(pollRef.current);
  }, [load]);

  // Realtime: funkar för föräldrar med auth-session, tyst miss för barn
  useEffect(() => {
    const channel = supabase
      .channel(`locations:${familyId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'member_locations', filter: `family_id=eq.${familyId}` },
        (payload) => {
          setLocations((prev) => {
            if (payload.eventType === 'DELETE') {
              return prev.filter((l) => l.member_id !== payload.old?.member_id);
            }
            const idx = prev.findIndex((l) => l.member_id === payload.new?.member_id);
            if (idx >= 0) {
              const next = [...prev];
              next[idx] = payload.new;
              return next;
            }
            return [...prev, payload.new];
          });
          if (payload.new?.member_id === member.id) {
            setMySharing(payload.new.sharing_enabled);
          }
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [familyId, member.id]);

  // Auto-uppdatera min position när delning är på:
  // - watchPosition: triggar direkt vid GPS-rörelse
  // - setInterval 30 s: backup när appen är i bakgrunden (iOS throttlar watchPosition)
  // - visibilitychange: uppdaterar direkt när användaren byter tillbaka till appen
  useEffect(() => {
    if (!mySharing || !navigator.geolocation) return;

    function savePos(pos) {
      supabase.rpc('upsert_member_location', {
        p_member_id: member.id,
        p_latitude:  pos.coords.latitude,
        p_longitude: pos.coords.longitude,
        p_accuracy:  Math.round(pos.coords.accuracy),
        p_battery:   null,
      }).catch(() => {});
    }

    function fetchPos(highAccuracy) {
      navigator.geolocation.getCurrentPosition(savePos, () => {},
        { enableHighAccuracy: highAccuracy, maximumAge: 30_000, timeout: 12_000 });
    }

    const watchId   = navigator.geolocation.watchPosition(savePos,
      (err) => console.warn('[GPS] watch error:', err.message),
      { enableHighAccuracy: true, maximumAge: 10_000, timeout: 15_000 });

    const intervalId = setInterval(() => fetchPos(false), 30_000);

    function handleVisible() {
      if (document.visibilityState === 'visible') fetchPos(true);
    }
    document.addEventListener('visibilitychange', handleVisible);

    return () => {
      navigator.geolocation.clearWatch(watchId);
      clearInterval(intervalId);
      document.removeEventListener('visibilitychange', handleVisible);
    };
  }, [mySharing, member.id]);

  async function toggleMySharing() {
    setToggling(true);
    if (mySharing) {
      await supabase.rpc('disable_location_sharing', { p_member_id: member.id });
      setMySharing(false);
      setToggling(false);
    } else {
      if (!navigator.geolocation) {
        alert('Din webbläsare stöder inte platsinformation.');
        setToggling(false);
        return;
      }
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          await supabase.rpc('upsert_member_location', {
            p_member_id: member.id,
            p_latitude:  pos.coords.latitude,
            p_longitude: pos.coords.longitude,
            p_accuracy:  Math.round(pos.coords.accuracy),
            p_battery:   null,
          });
          sendPushToFamily({
            familyId,
            excludeMemberId: member.id,
            title: `📍 ${member.name} delar sin plats`,
            body:  'Öppna appen för att se var de är',
          });
          setMySharing(true); // triggar useEffect ovan → startar watchPosition + interval
          setToggling(false);
        },
        () => {
          alert('Kunde inte hämta din position. Kontrollera att du har tillåtit platsbehörighet.');
          setToggling(false);
        },
        { enableHighAccuracy: true, timeout: 15_000 }
      );
    }
  }

  const anySharing = locations.some((l) => l.sharing_enabled);

  if (loading) {
    return (
      <div style={styles.page}>
        <p style={styles.loadingText}>Laddar...</p>
      </div>
    );
  }

  return (
    <div style={styles.page}>
      {/* Header */}
      <div style={styles.header}>
        <div style={styles.headerTop}>
          <h1 style={styles.title}>📍 Var är vi?</h1>
          <div style={styles.toggleRow}>
            <span style={styles.toggleLabel}>
              {mySharing ? 'Delar plats' : 'Dela min plats'}
            </span>
            <button
              onClick={toggleMySharing}
              disabled={toggling}
              style={{ ...styles.toggle, background: mySharing ? C.secondary : C.border, opacity: toggling ? 0.6 : 1 }}
            >
              <div style={{ ...styles.toggleKnob, transform: mySharing ? 'translateX(22px)' : 'translateX(2px)' }} />
            </button>
          </div>
        </div>
      </div>

      <div style={styles.content}>
        <FamilyMap locations={locations} members={members} />

        {!anySharing && (
          <div style={styles.emptyState}>
            <div style={styles.emptyEmoji}>🗺️</div>
            <p style={styles.emptyText}>Ingen delar sin plats just nu</p>
            <p style={styles.emptySubtext}>Slå på "Dela min plats" ovan för att synas på kartan.</p>
          </div>
        )}

        {members.length > 0 && (
          <div style={styles.section}>
            <h2 style={styles.sectionTitle}>Familjen</h2>
            {members.map((m) => (
              <MemberLocationCard
                key={m.id}
                member={m}
                location={locations.find((l) => l.member_id === m.id) || null}
                places={places}
              />
            ))}
          </div>
        )}

        {isParent && (
          <button onClick={() => setShowPlaces(true)} style={styles.placesBtn}>
            🏠 Hantera platser
          </button>
        )}
      </div>

      <div style={{ height: 90 }} />

      {showPlaces && (
        <Portal>
        <PlacesEditor
          familyId={familyId}
          member={member}
          places={places}
          onClose={() => { setShowPlaces(false); load(); }}
        />
        </Portal>
      )}
    </div>
  );
}

const styles = {
  page: { minHeight: '100vh', background: C.bg, fontFamily: F.body },
  header: {
    padding: '20px 16px 12px',
    position: 'sticky', top: TOPBAR_H, zIndex: 10,
    backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)',
    background: 'rgba(255,251,245,0.92)',
    borderBottom: `1px solid ${C.borderLight}`,
  },
  headerTop: { display: 'flex', alignItems: 'center', justifyContent: 'space-between' },
  title: { fontFamily: F.heading, fontSize: F.sizes.xl, fontWeight: F.weights.extra, color: C.text, margin: 0 },
  toggleRow: { display: 'flex', alignItems: 'center', gap: 8 },
  toggleLabel: { fontSize: F.sizes.sm, fontWeight: F.weights.semi, color: C.textMuted, fontFamily: F.body },
  toggle: { width: 48, height: 26, borderRadius: 13, border: 'none', cursor: 'pointer', position: 'relative', flexShrink: 0, transition: 'background 0.2s' },
  toggleKnob: { width: 22, height: 22, borderRadius: 11, background: '#fff', position: 'absolute', top: 2, transition: 'transform 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)' },
  content: { padding: '14px 16px 0', display: 'flex', flexDirection: 'column', gap: 14 },
  emptyState: { textAlign: 'center', padding: '24px 16px', background: '#fff', borderRadius: 16, border: `1.5px solid ${C.borderLight}` },
  emptyEmoji: { fontSize: 40, marginBottom: 8 },
  emptyText: { fontFamily: F.heading, fontWeight: F.weights.bold, fontSize: F.sizes.md, color: C.text, margin: '0 0 4px' },
  emptySubtext: { fontSize: F.sizes.sm, color: C.textMuted, margin: 0 },
  section: { display: 'flex', flexDirection: 'column' },
  sectionTitle: { fontFamily: F.heading, fontSize: F.sizes.sm, fontWeight: F.weights.bold, color: C.textMuted, textTransform: 'uppercase', letterSpacing: 0.5, margin: '0 0 8px' },
  placesBtn: { width: '100%', padding: '14px 20px', borderRadius: 12, border: `1.5px dashed ${C.secondary}`, background: C.secondaryLight, color: C.secondaryDark, fontSize: F.sizes.md, fontWeight: F.weights.bold, fontFamily: F.heading, cursor: 'pointer', textAlign: 'center' },
  loadingText: { textAlign: 'center', color: C.textMuted, padding: 40 },
};
