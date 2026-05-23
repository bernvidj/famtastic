// ============================================
// FamTastic — PollCard (Familjeomröstning)
// Active poll shown above messages in ChatView
// Only parents can create / close polls
// ============================================

import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabaseClient';
import { C, F } from '../data';

export function PollCard({ familyId, member, members }) {
  const [poll,     setPoll]     = useState(null);
  const [votes,    setVotes]    = useState([]);
  const [creating, setCreating] = useState(false);
  const [question, setQuestion] = useState('');
  const [options,  setOptions]  = useState(['', '']);
  const [saving,   setSaving]   = useState(false);
  const [loaded,   setLoaded]   = useState(false);

  const isParent = member.role === 'admin' || member.role === 'parent';

  const load = useCallback(async () => {
    const { data: rows } = await supabase.rpc('get_active_poll', { p_family_id: familyId });
    if (rows && rows.length > 0) {
      const p = rows[0];
      setPoll(p);
      const { data: vRows } = await supabase.rpc('get_poll_votes', { p_poll_id: p.id });
      setVotes(vRows || []);
    } else {
      setPoll(null);
      setVotes([]);
    }
    setLoaded(true);
  }, [familyId]);

  useEffect(() => { load(); }, [load]);

  async function handleVote(optionIndex) {
    if (saving || !poll) return;
    setSaving(true);
    await supabase.rpc('vote_on_poll', {
      p_family_id:    familyId,
      p_member_id:    member.id,
      p_poll_id:      poll.id,
      p_option_index: optionIndex,
    });
    setSaving(false);
    load();
  }

  async function handleCreate() {
    const valid = options.filter(o => o.trim());
    if (!question.trim() || valid.length < 2) return;
    setSaving(true);
    await supabase.rpc('create_family_poll', {
      p_family_id: familyId,
      p_member_id: member.id,
      p_question:  question.trim(),
      p_options:   valid,
    });
    setQuestion('');
    setOptions(['', '']);
    setCreating(false);
    setSaving(false);
    load();
  }

  async function handleClose() {
    if (!poll) return;
    await supabase.rpc('close_family_poll', { p_poll_id: poll.id });
    setPoll(null);
    setVotes([]);
  }

  if (!loaded) return null;

  // ── Ingen aktiv omröstning ──────────────────────────────────────────────────
  if (!poll) {
    if (!isParent) return null;
    if (!creating) {
      return (
        <div style={styles.card}>
          <button onClick={() => setCreating(true)} style={styles.createBtn}>
            📊 Skapa omröstning
          </button>
        </div>
      );
    }
    const validCount = options.filter(o => o.trim()).length;
    return (
      <div style={styles.card}>
        <div style={styles.top}>
          <span style={styles.label}>Ny omröstning</span>
          <button onClick={() => { setCreating(false); setQuestion(''); setOptions(['', '']); }} style={styles.closeBtn}>✕</button>
        </div>
        <input
          type="text"
          placeholder="Frågan du vill ställa..."
          value={question}
          onChange={e => setQuestion(e.target.value.slice(0, 120))}
          style={styles.qInput}
          autoFocus
        />
        {options.map((opt, i) => (
          <div key={i} style={styles.optRow}>
            <input
              type="text"
              placeholder={`Alternativ ${i + 1}`}
              value={opt}
              onChange={e => { const n = [...options]; n[i] = e.target.value.slice(0, 60); setOptions(n); }}
              style={styles.optInput}
            />
            {options.length > 2 && (
              <button onClick={() => setOptions(options.filter((_, j) => j !== i))} style={styles.removeBtn}>✕</button>
            )}
          </div>
        ))}
        {options.length < 4 && (
          <button onClick={() => setOptions([...options, ''])} style={styles.addOptBtn}>
            + Lägg till alternativ
          </button>
        )}
        <button
          onClick={handleCreate}
          disabled={saving || !question.trim() || validCount < 2}
          style={{ ...styles.submitBtn, opacity: saving || !question.trim() || validCount < 2 ? 0.5 : 1 }}
        >
          Starta omröstning
        </button>
      </div>
    );
  }

  // ── Aktiv omröstning ────────────────────────────────────────────────────────
  const totalVotes = votes.length;
  const myVote     = votes.find(v => v.member_id === member.id);
  const pollOpts   = Array.isArray(poll.options) ? poll.options : JSON.parse(poll.options);

  return (
    <div style={styles.card}>
      <div style={styles.top}>
        <span style={styles.label}>📊 Omröstning</span>
        {isParent && (
          <button onClick={handleClose} style={styles.closeBtn}>Avsluta</button>
        )}
      </div>
      <p style={styles.question}>{poll.question}</p>
      <div style={styles.optionList}>
        {pollOpts.map((opt, i) => {
          const count = votes.filter(v => v.option_index === i).length;
          const pct   = totalVotes > 0 ? Math.round((count / totalVotes) * 100) : 0;
          const voted = myVote?.option_index === i;
          return (
            <button
              key={i}
              onClick={() => handleVote(i)}
              disabled={saving}
              style={{
                ...styles.optionBtn,
                border:     `2px solid ${voted ? C.primary : C.borderLight}`,
                background: voted ? C.primaryLight : '#fff',
              }}
            >
              <div style={styles.optionMeta}>
                <span style={{ ...styles.optionLabel, color: voted ? C.primary : C.text }}>{opt}</span>
                <span style={styles.optionCount}>{pct}%</span>
              </div>
              <div style={styles.barBg}>
                <div style={{
                  ...styles.barFill,
                  width:      `${pct}%`,
                  background: voted ? C.primary : C.secondary,
                }} />
              </div>
            </button>
          );
        })}
      </div>
      <p style={styles.totalText}>{totalVotes} {totalVotes === 1 ? 'röst' : 'röster'} totalt</p>
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
    marginBottom: 8,
  },
  label: {
    fontFamily: F.heading, fontSize: F.sizes.xs, fontWeight: 700,
    color: C.textMuted, textTransform: 'uppercase', letterSpacing: 0.5,
  },
  closeBtn: {
    background: 'none', border: 'none', cursor: 'pointer',
    fontFamily: F.heading, fontSize: F.sizes.xs, fontWeight: 700,
    color: C.error, padding: '2px 6px', borderRadius: 6,
  },
  createBtn: {
    width: '100%', padding: '10px 14px', borderRadius: 12,
    border: `1.5px dashed ${C.primary}`, background: C.primaryLight,
    fontFamily: F.heading, fontSize: F.sizes.sm, fontWeight: 700,
    color: C.primary, cursor: 'pointer', textAlign: 'center',
  },
  qInput: {
    width: '100%', padding: '10px 12px', borderRadius: 10,
    border: `1.5px solid ${C.border}`, fontFamily: F.body,
    fontSize: F.sizes.sm, color: C.text, boxSizing: 'border-box',
    marginBottom: 4, outline: 'none',
  },
  optRow: { display: 'flex', gap: 6, marginTop: 6 },
  optInput: {
    flex: 1, padding: '8px 10px', borderRadius: 8,
    border: `1.5px solid ${C.border}`, fontFamily: F.body,
    fontSize: F.sizes.sm, color: C.text, outline: 'none',
  },
  removeBtn: {
    background: C.errorLight, border: 'none', cursor: 'pointer',
    borderRadius: 8, width: 32, color: C.error, fontSize: 12, fontWeight: 700,
    flexShrink: 0,
  },
  addOptBtn: {
    marginTop: 8, width: '100%', padding: '7px 0', borderRadius: 8,
    border: `1px dashed ${C.border}`, background: 'none',
    fontFamily: F.heading, fontSize: F.sizes.xs, fontWeight: 700,
    color: C.textMuted, cursor: 'pointer',
  },
  submitBtn: {
    marginTop: 10, width: '100%', padding: '12px 0', borderRadius: 12,
    border: 'none', background: C.primary, color: '#fff',
    fontFamily: F.heading, fontSize: F.sizes.sm, fontWeight: 700,
    cursor: 'pointer', transition: 'opacity 0.15s',
  },
  question: {
    fontFamily: F.heading, fontSize: F.sizes.md, fontWeight: 700,
    color: C.text, margin: '0 0 10px', lineHeight: 1.35,
  },
  optionList: { display: 'flex', flexDirection: 'column', gap: 6 },
  optionBtn: {
    width: '100%', padding: '10px 12px', borderRadius: 12,
    cursor: 'pointer', textAlign: 'left', transition: 'all 0.15s',
  },
  optionMeta: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    marginBottom: 5,
  },
  optionLabel: {
    fontFamily: F.heading, fontSize: F.sizes.sm, fontWeight: 700,
  },
  optionCount: {
    fontFamily: F.heading, fontSize: F.sizes.xs, fontWeight: 700,
    color: C.textMuted,
  },
  barBg: {
    height: 6, borderRadius: 3, background: C.borderLight, overflow: 'hidden',
  },
  barFill: {
    height: '100%', borderRadius: 3, transition: 'width 0.4s ease',
  },
  totalText: {
    fontFamily: F.heading, fontSize: 11, color: C.textMuted,
    margin: '8px 0 0', textAlign: 'right',
  },
};
