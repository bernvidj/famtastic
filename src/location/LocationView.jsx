// ============================================
// FamTastic — LocationView
// "Var är vi?" — karta + memberlista + toggle
// ============================================

import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabaseClient';
import { C, F } from '../data';
import { FamilyMap } from './FamilyMap';
import { MemberLocationCard } from './MemberLocationCard';
import { PlacesEditor } from './PlacesEditor';

export function LocationView({ familyId, member, members }) {
  const [locations, setLocations]       = useState([]);
  const [places, setPlaces]             = useState([]);
  const [mySharing, setMySharing]       = useState(false);
  const [showPlaces, setShowPlaces]     = useState(false);
  const [loading, setLoading]           = useState(true);
  const [toggling, setToggling]         = useState(false);

  const isParent = member.role === 'admin' || member.role === 'parent';

  const load = useCallback(async () => {
    const [locRes, placeRes] = await Promise.all([
      supabase.from('member_locations').select('*').eq('family_id', familyId),
      supabase.from('family_places').select('*').eq('family_id', familyId),
    ]);
    const locs = locRes.data || [];
    setLocations(locs);
    setPlaces(placeRes.data || []);

    const mine = locs.find((l) => l.member_id === member.id);
    setMySharing(mine?.sharing_enabled ?? false);
    setLoading(false);
  }, [familyId, member.id]);

  useEffect(() => { load(); }, [load]);

  // Realtime: lyssna på ändringar i member_locations för familjen
  useEffect(() => {
    const channel = supabase
      .channel(`locations:${familyId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'member_locations',
          filter: `family_id=eq.${familyId}`,
        },
        (payload) => {
          setLocations((prev) => {
            const idx = prev.findIndex(
              (l) => l.member_id === payload.new?.member_id
            );
            if (payload.eventType === 'DELETE') {
              return prev.filter((l) => l.member_id !== payload.old?.member_id);
            }
            if (idx >= 0) {
              const next = [...prev];
              next[idx] = payload.new;
              return next;
            }
            return [...prev, payload.new];
          });

          // Uppdatera mySharing om det är min rad
          if (payload.new?.member_id === member.id) {
            setMySharing(payload.new.sharing_enabled);
          }
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [familyId, member.id]);

  async function toggleMySharing() {
    setToggling(true);
    if (mySharing) {
      await supabase.rpc('disable_location_sharing', { p_member_id: member.id });
      setMySharing(false);
    } else {
      // Kräver att webbläsaren ger oss position en gång direkt
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
          setMySharing(true);
          setToggling(false);
        },
        (err) => {
          console.warn('Geolocation error:', err);
          alert('Kunde inte hämta din position. Kontrollera att du har tillåtit platsbehörighet.');
          setToggling(false);
        },
        { enableHighAccuracy: true, timeout: 15_000 }
      );
      return;
    }
    setToggling(false);
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
          <div>
            <h1 style={styles.title}>📍 Var är vi?</h1>
          </div>
          {/* Min platsdelning-toggle */}
          <div style={styles.toggleRow}>
            <span style={styles.toggleLabel}>
              {mySharing ? 'Delar plats' : 'Dela min plats'}
            </span>
            <button
              onClick={toggleMySharing}
              disabled={toggling}
              style={{
                ...styles.toggle,
                background: mySharing ? C.secondary : C.border,
                opacity: toggling ? 0.6 : 1,
              }}
            >
              <div style={{
                ...styles.toggleKnob,
                transform: mySharing ? 'translateX(22px)' : 'translateX(2px)',
              }} />
            </button>
          </div>
        </div>
      </div>

      <div style={styles.content}>
        {/* Karta */}
        <FamilyMap locations={locations} members={members} />

        {/* Empty state */}
        {!anySharing && (
          <div style={styles.emptyState}>
            <div style={styles.emptyEmoji}>🗺️</div>
            <p style={styles.emptyText}>Ingen delar sin plats just nu</p>
            <p style={styles.emptySubtext}>
              Slå på "Dela min plats" ovan för att synas på kartan.
            </p>
          </div>
        )}

        {/* Memberlista */}
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

        {/* Förälder: hantera platser */}
        {isParent && (
          <button
            onClick={() => setShowPlaces(true)}
            style={styles.placesBtn}
          >
            🏠 Hantera platser
          </button>
        )}
      </div>

      <div style={{ height: 90 }} />

      {showPlaces && (
        <PlacesEditor
          familyId={familyId}
          member={member}
          places={places}
          onClose={() => { setShowPlaces(false); load(); }}
        />
      )}
    </div>
  );
}

const styles = {
  page: {
    minHeight: '100vh',
    background: C.bg,
    fontFamily: F.body,
  },
  header: {
    padding: '20px 16px 12px',
    background: C.bg,
    borderBottom: `1px solid ${C.borderLight}`,
    position: 'sticky',
    top: 0,
    zIndex: 10,
    backdropFilter: 'blur(16px)',
    WebkitBackdropFilter: 'blur(16px)',
    background: 'rgba(255,251,245,0.92)',
  },
  headerTop: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: {
    fontFamily: F.heading,
    fontSize: F.sizes.xl,
    fontWeight: F.weights.extra,
    color: C.text,
    margin: 0,
  },
  toggleRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  },
  toggleLabel: {
    fontSize: F.sizes.sm,
    fontWeight: F.weights.semi,
    color: C.textMuted,
    fontFamily: F.body,
  },
  toggle: {
    width: 48,
    height: 26,
    borderRadius: 13,
    border: 'none',
    cursor: 'pointer',
    position: 'relative',
    flexShrink: 0,
    transition: 'background 0.2s',
  },
  toggleKnob: {
    width: 22,
    height: 22,
    borderRadius: 11,
    background: '#fff',
    position: 'absolute',
    top: 2,
    transition: 'transform 0.2s',
    boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
  },
  content: {
    padding: '14px 16px 0',
    display: 'flex',
    flexDirection: 'column',
    gap: 14,
  },
  emptyState: {
    textAlign: 'center',
    padding: '24px 16px',
    background: '#fff',
    borderRadius: 16,
    border: `1.5px solid ${C.borderLight}`,
  },
  emptyEmoji: { fontSize: 40, marginBottom: 8 },
  emptyText: {
    fontFamily: F.heading,
    fontWeight: F.weights.bold,
    fontSize: F.sizes.md,
    color: C.text,
    margin: '0 0 4px',
  },
  emptySubtext: {
    fontSize: F.sizes.sm,
    color: C.textMuted,
    margin: 0,
  },
  section: { display: 'flex', flexDirection: 'column' },
  sectionTitle: {
    fontFamily: F.heading,
    fontSize: F.sizes.sm,
    fontWeight: F.weights.bold,
    color: C.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    margin: '0 0 8px',
  },
  placesBtn: {
    width: '100%',
    padding: '14px 20px',
    borderRadius: 12,
    border: `1.5px dashed ${C.secondary}`,
    background: C.secondaryLight,
    color: C.secondaryDark,
    fontSize: F.sizes.md,
    fontWeight: F.weights.bold,
    fontFamily: F.heading,
    cursor: 'pointer',
    textAlign: 'center',
  },
  loadingText: {
    textAlign: 'center',
    color: C.textMuted,
    padding: 40,
  },
};
