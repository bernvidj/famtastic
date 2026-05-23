// ============================================
// FamTastic — MoodCard (Familjestämning)
// Daily mood per member shown above chat messages
// ============================================

import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabaseClient';
import { C, F } from '../data';

const MOODS = [
  { value: 1, emoji: '😢', label: 'Ledsen' },
  { value: 2, emoji: '😐', label: 'Okej' },
  { value: 3, emoji: '😊', label: 'Glad' },
  { value: 4, emoji: '🤩', label: 'Toppen!' },
];

export function MoodCard({ familyId, member, members }) {
  const [moods,   setMoods]   = useState({});
  const [picking, setPicking] = useState(false);
  const [saving,  setSaving]  = useState(false);

  const todayStr = new Date().toISOString().split('T')[0];

  const load = useCallback(async () => {
    const { data } = await supabase.rpc('get_family_moods', {
      p_family_id: familyId,
      p_date:      todayStr,
    });
    const map = {};
    (data || []).forEach(row => { map[row.member_id] = row.mood; });
    setMoods(map);
  }, [familyId, todayStr]);

  useEffect(() => { load(); }, [load]);

  async function handlePickMood(value) {
    setSaving(true);
    await supabase.rpc('upsert_family_mood', {
      p_family_id: familyId,
      p_member_id: member.id,
      p_mood:      value,
    });
    setPicking(false);
    setSaving(false);
    load();
  }

  const myMood    = moods[member.id];
  const myMoodObj = MOODS.find(m => m.value === myMood);

  return (
    <div style={styles.card}>
      <div style={styles.top}>
        <span style={styles.label}>Familjestämning idag</span>
        <button onClick={() => setPicking(p => !p)} style={styles.editBtn}>
          {myMoodObj ? myMoodObj.emoji : '?'} {myMoodObj ? 'Ändra' : 'Sätt stämning'}
        </button>
      </div>

      <div style={styles.memberRow}>
        {(members || []).map(m => {
          const moodVal = moods[m.id];
          const moodObj = MOODS.find(x => x.value === moodVal);
          const isMe    = m.id === member.id;
          return (
            <button
              key={m.id}
              onClick={isMe ? () => setPicking(p => !p) : undefined}
              style={{ ...styles.memberBtn, cursor: isMe ? 'pointer' : 'default' }}
            >
              <div style={{
                ...styles.avatarWrap,
                background: m.color ? `${m.color}22` : C.primaryLight,
                border: isMe ? `2px solid ${C.primary}` : '2px solid transparent',
              }}>
                <span style={{ fontSize: 20 }}>{m.avatar}</span>
                {moodObj && <span style={styles.moodBadge}>{moodObj.emoji}</span>}
              </div>
              <span style={styles.memberName}>{m.name.split(' ')[0]}</span>
            </button>
          );
        })}
      </div>

      {picking && (
        <div style={styles.picker}>
          {MOODS.map(m => (
            <button
              key={m.value}
              onClick={() => handlePickMood(m.value)}
              disabled={saving}
              style={{
                ...styles.pickBtn,
                background: myMood === m.value ? C.primaryLight : '#fff',
                border: `2px solid ${myMood === m.value ? C.primary : C.borderLight}`,
              }}
            >
              <span style={{ fontSize: 28 }}>{m.emoji}</span>
              <span style={styles.pickLabel}>{m.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

const styles = {
  card: {
    margin: '8px 16px 0',
    background: '#fff',
    borderRadius: 16,
    padding: '12px 14px',
    border: `1.5px solid ${C.borderLight}`,
    boxShadow: '0 1px 6px rgba(0,0,0,0.05)',
  },
  top: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    marginBottom: 10,
  },
  label: {
    fontFamily: F.heading, fontSize: F.sizes.xs, fontWeight: 700,
    color: C.textMuted, textTransform: 'uppercase', letterSpacing: 0.5,
  },
  editBtn: {
    background: C.primaryLight, border: 'none', cursor: 'pointer',
    borderRadius: 8, padding: '4px 10px',
    fontFamily: F.heading, fontSize: F.sizes.xs, fontWeight: 700, color: C.primary,
  },
  memberRow: { display: 'flex', gap: 12, flexWrap: 'wrap' },
  memberBtn: {
    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
    background: 'none', border: 'none', padding: 0,
  },
  avatarWrap: {
    width: 44, height: 44, borderRadius: '50%',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    position: 'relative',
  },
  moodBadge: {
    position: 'absolute', bottom: -4, right: -4,
    fontSize: 16, lineHeight: 1,
  },
  memberName: {
    fontFamily: F.heading, fontSize: 10, color: C.textMuted, fontWeight: 600,
  },
  picker: { display: 'flex', gap: 8, marginTop: 10 },
  pickBtn: {
    flex: 1,
    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
    padding: '10px 6px', borderRadius: 12, cursor: 'pointer',
    transition: 'all 0.15s',
  },
  pickLabel: {
    fontFamily: F.heading, fontSize: 11, fontWeight: 700, color: C.text,
  },
};
