// ============================================
// FamTastic — PlacesEditor
// Förälder lägger till/tar bort geofence-platser
// ============================================

import React, { useState } from 'react';
import { supabase } from '../supabaseClient';
import { C, F, S } from '../data';
import { X, Trash2 } from 'lucide-react';

const PLACE_EMOJIS = ['🏠','🏫','🏢','🏃','🛒','⛪','🌳','🏖','🎭','🍕','🏋','🎓','🛕','🏥'];
const DEFAULT_RADIUS = 100;

function emptyForm() {
  return { name: '', emoji: '📍', lat: '', lng: '', radius: DEFAULT_RADIUS };
}

export function PlacesEditor({ familyId, member, places, onClose }) {
  const [form, setForm]       = useState(emptyForm());
  const [saving, setSaving]   = useState(false);
  const [deleting, setDeleting] = useState(null);
  const [locating, setLocating] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [errMsg, setErrMsg]     = useState('');

  async function savePlace() {
    const lat = parseFloat(form.lat);
    const lng = parseFloat(form.lng);
    if (!form.name.trim() || isNaN(lat) || isNaN(lng)) return;

    setSaving(true); setErrMsg('');
    const { error } = await supabase.from('family_places').insert({
      family_id:     familyId,
      name:          form.name.trim(),
      emoji:         form.emoji,
      latitude:      lat,
      longitude:     lng,
      radius_meters: Number(form.radius) || DEFAULT_RADIUS,
      created_by:    member.id,
    });
    setSaving(false);
    if (error) { setErrMsg('Kunde inte spara platsen: ' + error.message); return; }
    setForm(emptyForm());
    setShowForm(false);
    onClose();
  }

  async function deletePlace(id) {
    setDeleting(id);
    const { error } = await supabase.from('family_places').delete().eq('id', id);
    setDeleting(null);
    if (error) { setErrMsg('Kunde inte ta bort platsen: ' + error.message); return; }
    onClose();
  }

  function useCurrentPosition() {
    if (!navigator.geolocation) return;
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setForm((f) => ({
          ...f,
          lat: pos.coords.latitude.toFixed(6),
          lng: pos.coords.longitude.toFixed(6),
        }));
        setLocating(false);
      },
      () => setLocating(false),
      { enableHighAccuracy: true, timeout: 15_000 }
    );
  }

  return (
    <div style={styles.overlay}>
      <div style={styles.sheet}>
        {/* Header */}
        <div style={styles.header}>
          <h2 style={styles.title}>🏠 Hantera platser</h2>
          <button onClick={onClose} style={styles.closeBtn}>
            <X size={20} />
          </button>
        </div>

        {errMsg && <div style={styles.errBanner}>{errMsg}</div>}

        {/* Befintliga platser */}
        <div style={styles.list}>
          {places.length === 0 && (
            <p style={styles.emptyText}>Inga platser skapade ännu.</p>
          )}
          {places.map((p) => (
            <div key={p.id} style={styles.placeRow}>
              <span style={styles.placeEmoji}>{p.emoji}</span>
              <div style={styles.placeInfo}>
                <span style={styles.placeName}>{p.name}</span>
                <span style={styles.placeDetail}>
                  {p.latitude.toFixed(4)}, {p.longitude.toFixed(4)} · {p.radius_meters} m
                </span>
              </div>
              <button
                onClick={() => deletePlace(p.id)}
                disabled={deleting === p.id}
                style={styles.deleteBtn}
              >
                <Trash2 size={16} />
              </button>
            </div>
          ))}
        </div>

        {/* Lägg till plats */}
        {!showForm ? (
          <button onClick={() => setShowForm(true)} style={styles.addBtn}>
            + Lägg till plats
          </button>
        ) : (
          <div style={styles.form}>
            <h3 style={styles.formTitle}>Ny plats</h3>

            {/* Emoji-väljare */}
            <div style={styles.emojiRow}>
              {PLACE_EMOJIS.map((e) => (
                <button
                  key={e}
                  onClick={() => setForm((f) => ({ ...f, emoji: e }))}
                  style={{
                    ...styles.emojiBtn,
                    background: form.emoji === e ? C.primaryLight : 'transparent',
                    border: form.emoji === e ? `2px solid ${C.primary}` : '2px solid transparent',
                  }}
                >
                  {e}
                </button>
              ))}
            </div>

            <input
              placeholder="Platsnamn (t.ex. Hem)"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              style={{ ...S.input, marginBottom: 8 }}
              autoFocus
            />

            <div style={styles.coordRow}>
              <input
                placeholder="Latitud"
                value={form.lat}
                onChange={(e) => setForm((f) => ({ ...f, lat: e.target.value }))}
                style={{ ...S.input, flex: 1 }}
                inputMode="decimal"
              />
              <input
                placeholder="Longitud"
                value={form.lng}
                onChange={(e) => setForm((f) => ({ ...f, lng: e.target.value }))}
                style={{ ...S.input, flex: 1 }}
                inputMode="decimal"
              />
            </div>

            <button onClick={useCurrentPosition} disabled={locating} style={styles.posBtn}>
              {locating ? 'Hämtar...' : '📍 Använd nuvarande position'}
            </button>

            <div style={styles.radiusRow}>
              <label style={styles.radiusLabel}>Radie: {form.radius} m</label>
              <input
                type="range"
                min={25}
                max={500}
                step={25}
                value={form.radius}
                onChange={(e) => setForm((f) => ({ ...f, radius: e.target.value }))}
                style={{ flex: 1 }}
              />
            </div>

            <div style={styles.formActions}>
              <button onClick={() => setShowForm(false)} style={{ ...S.button, background: C.borderLight, color: C.text, flex: 1 }}>
                Avbryt
              </button>
              <button
                onClick={savePlace}
                disabled={saving || !form.name.trim() || !form.lat || !form.lng}
                style={{ ...S.button, ...S.buttonPrimary, flex: 1, opacity: saving || !form.name.trim() || !form.lat || !form.lng ? 0.5 : 1 }}
              >
                {saving ? 'Sparar...' : 'Spara plats'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

const styles = {
  overlay: {
    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)',
    zIndex: 200, display: 'flex', alignItems: 'flex-end',
  },
  sheet: {
    width: '100%', maxHeight: '80vh', overflowY: 'auto',
    background: C.bg, borderRadius: '20px 20px 0 0',
    padding: '20px 16px 40px',
    boxShadow: '0 -4px 24px rgba(0,0,0,0.15)',
  },
  header: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontFamily: F.heading, fontSize: F.sizes.lg, fontWeight: F.weights.extra,
    color: C.text, margin: 0,
  },
  errBanner: {
    padding: '10px 14px', marginBottom: 12, background: C.errorLight,
    border: `1.5px solid ${C.error}`, borderRadius: 10, color: C.error,
    fontSize: F.sizes.sm, fontFamily: F.heading, fontWeight: F.weights.bold,
  },
  closeBtn: {
    background: C.borderLight, border: 'none', borderRadius: 10,
    padding: 8, cursor: 'pointer', display: 'flex',
  },
  list: { display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 12 },
  emptyText: { color: C.textMuted, fontSize: F.sizes.sm, fontFamily: F.body, margin: 0 },
  placeRow: {
    display: 'flex', alignItems: 'center', gap: 10,
    padding: '10px 12px', background: '#fff', borderRadius: 12,
    border: `1.5px solid ${C.borderLight}`,
  },
  placeEmoji: { fontSize: 22, flexShrink: 0 },
  placeInfo: { flex: 1, display: 'flex', flexDirection: 'column', gap: 2 },
  placeName: { fontFamily: F.heading, fontWeight: F.weights.bold, fontSize: F.sizes.sm, color: C.text },
  placeDetail: { fontSize: F.sizes.xs, color: C.textMuted, fontFamily: F.body },
  deleteBtn: {
    background: C.errorLight, border: 'none', borderRadius: 8,
    padding: 8, cursor: 'pointer', color: C.error, display: 'flex',
  },
  addBtn: {
    width: '100%', padding: '13px 20px', borderRadius: 12,
    border: `1.5px dashed ${C.primary}`, background: C.primaryLight,
    color: C.primary, fontSize: F.sizes.md, fontWeight: F.weights.bold,
    fontFamily: F.heading, cursor: 'pointer',
  },
  form: {
    background: '#fff', borderRadius: 14, padding: 14,
    border: `1.5px solid ${C.borderLight}`,
    display: 'flex', flexDirection: 'column', gap: 10,
  },
  formTitle: {
    fontFamily: F.heading, fontSize: F.sizes.md, fontWeight: F.weights.bold,
    color: C.text, margin: 0,
  },
  emojiRow: { display: 'flex', flexWrap: 'wrap', gap: 6 },
  emojiBtn: {
    width: 38, height: 38, borderRadius: 8, fontSize: 20,
    cursor: 'pointer', padding: 0, lineHeight: 1,
  },
  coordRow: { display: 'flex', gap: 8 },
  posBtn: {
    padding: '10px 14px', borderRadius: 10, border: `1px solid ${C.secondary}`,
    background: C.secondaryLight, color: C.secondaryDark,
    fontSize: F.sizes.sm, fontWeight: F.weights.semi, fontFamily: F.heading,
    cursor: 'pointer',
  },
  radiusRow: { display: 'flex', alignItems: 'center', gap: 10 },
  radiusLabel: { fontSize: F.sizes.xs, color: C.textMuted, fontFamily: F.body, whiteSpace: 'nowrap' },
  formActions: { display: 'flex', gap: 8 },
};
