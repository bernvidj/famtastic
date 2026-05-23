// ============================================
// FamTastic — ParentNotes (föräldrarnas loggbok)
// ============================================

import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import { C, F, S } from './data';
import { Send } from 'lucide-react';

const NOTE_TYPES = [
  { key: 'note',      label: 'Notering',   icon: '📝' },
  { key: 'health',    label: 'Hälsa',      icon: '🏥' },
  { key: 'equipment', label: 'Utrustning', icon: '🎒' },
];

function timeAgo(ts) {
  const diff = (Date.now() - new Date(ts)) / 1000;
  if (diff < 60)    return 'Nu';
  if (diff < 3600)  return `${Math.floor(diff / 60)} min`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} h`;
  const d = new Date(ts);
  return `${d.getDate()}/${d.getMonth() + 1}`;
}

export function ParentNotes({ familyId, member, members }) {
  const [notes, setNotes]   = useState([]);
  const [input, setInput]   = useState('');
  const [type, setType]     = useState('note');
  const [sending, setSending] = useState(false);

  useEffect(() => { loadNotes(); }, [familyId]);

  async function loadNotes() {
    const { data } = await supabase
      .from('parent_notes')
      .select('*')
      .eq('family_id', familyId)
      .order('created_at', { ascending: false })
      .limit(10);
    setNotes(data || []);
  }

  async function addNote() {
    if (!input.trim() || sending) return;
    setSending(true);
    await supabase.from('parent_notes').insert({
      family_id: familyId,
      author_id: member.id,
      content:   input.trim(),
      note_type: type,
    });
    setInput('');
    await loadNotes();
    setSending(false);
  }

  const typeInfo = (key) => NOTE_TYPES.find(t => t.key === key) || NOTE_TYPES[0];

  return (
    <div style={styles.section}>
      <p style={S.sectionLabel}>Föräldranotes</p>
      <div style={styles.card}>

        {/* Type selector */}
        <div style={styles.typeRow}>
          {NOTE_TYPES.map(t => (
            <button key={t.key} onClick={() => setType(t.key)} style={{
              ...styles.typeBtn,
              background:  type === t.key ? C.primaryLight : 'transparent',
              color:       type === t.key ? C.primary : C.textMuted,
              border:      `1.5px solid ${type === t.key ? C.primary : C.borderLight}`,
            }}>
              {t.icon} {t.label}
            </button>
          ))}
        </div>

        {/* Input */}
        <div style={styles.inputRow}>
          <span style={styles.avatar}>{member.avatar}</span>
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && addNote()}
            placeholder="Skriv en notering..."
            style={styles.input}
          />
          <button
            onClick={addNote}
            disabled={!input.trim() || sending}
            style={{ ...styles.sendBtn, opacity: !input.trim() || sending ? 0.4 : 1 }}
          >
            <Send size={16} />
          </button>
        </div>

        {/* Notes list */}
        {notes.length > 0 ? (
          <div style={styles.list}>
            {notes.map(note => {
              const author = members.find(m => m.id === note.author_id);
              const t = typeInfo(note.note_type);
              return (
                <div key={note.id} style={styles.noteItem}>
                  <span style={styles.typeIcon}>{t.icon}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <span style={styles.noteContent}>{note.content}</span>
                    <span style={styles.noteMeta}>
                      {author?.name || 'Förälder'} · {timeAgo(note.created_at)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <p style={styles.empty}>Inga anteckningar ännu.</p>
        )}

      </div>
    </div>
  );
}

const styles = {
  section: { padding: '0 16px', marginBottom: 16 },
  card: {
    background: C.bgCard, borderRadius: 16, padding: 14,
    border: `1.5px solid ${C.borderLight}`, boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
  },
  typeRow: { display: 'flex', gap: 6, marginBottom: 10, flexWrap: 'wrap' },
  typeBtn: {
    display: 'inline-flex', alignItems: 'center', gap: 4,
    padding: '5px 10px', borderRadius: 99,
    fontSize: F.sizes.xs, fontWeight: F.weights.bold, fontFamily: F.heading, cursor: 'pointer',
  },
  inputRow: { display: 'flex', alignItems: 'center', gap: 8 },
  avatar: { fontSize: 20, flexShrink: 0 },
  input: {
    flex: 1, padding: '10px 12px', borderRadius: 12,
    border: `1.5px solid ${C.border}`, fontSize: F.sizes.sm,
    fontFamily: F.body, outline: 'none', minHeight: 40, boxSizing: 'border-box',
  },
  sendBtn: {
    width: 40, height: 40, borderRadius: 12, border: 'none',
    background: C.primary, color: '#fff',
    display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0,
  },
  list: { marginTop: 10, display: 'flex', flexDirection: 'column', gap: 6 },
  noteItem: {
    display: 'flex', alignItems: 'flex-start', gap: 8,
    padding: '8px 10px', background: C.bg, borderRadius: 12, border: `1px solid ${C.borderLight}`,
  },
  typeIcon: { fontSize: 16, flexShrink: 0, marginTop: 1 },
  noteContent: { display: 'block', fontSize: F.sizes.sm, fontFamily: F.body, color: C.text, lineHeight: 1.4 },
  noteMeta: { display: 'block', fontSize: F.sizes.xs, color: C.textMuted, fontFamily: F.heading, marginTop: 2 },
  empty: { textAlign: 'center', color: C.textMuted, fontSize: F.sizes.sm, fontFamily: F.heading, padding: '12px 0 4px', margin: 0 },
};
