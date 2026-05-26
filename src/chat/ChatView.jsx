// ============================================
// FamTastic — ChatView (familjechatt)
// Bubbelchatt: föräldrar + barn kan läsa/skriva
// Barn läser/skriver via SECURITY DEFINER RPCs
// ============================================

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { supabase } from '../supabaseClient';
import { C, F, TOPBAR_H } from '../data';
import { MoodCard } from './MoodCard';
import { PollCard } from './PollCard';
import { unlockAchievement } from '../achievements/unlock';
import { sendPushToFamily } from '../notifications/sendPush';

function formatMsgTime(ts) {
  if (!ts) return '';
  const d   = new Date(ts);
  const now = new Date();
  const diffMin = Math.floor((now - d) / 60000);
  if (diffMin < 1) return 'Just nu';
  if (diffMin < 60) return `${diffMin} min`;
  const timeStr = d.toLocaleTimeString('sv-SE', { hour: '2-digit', minute: '2-digit' });
  if (d.toDateString() === now.toDateString()) return timeStr;
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  if (d.toDateString() === yesterday.toDateString()) return `Igår ${timeStr}`;
  return d.toLocaleDateString('sv-SE', { month: 'short', day: 'numeric' }) + ' ' + timeStr;
}

function MessageBubble({ msg, sender, isMe }) {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: isMe ? 'flex-end' : 'flex-start',
      marginBottom: 10,
    }}>
      {!isMe && sender && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 3 }}>
          <div style={{
            width: 22, height: 22, borderRadius: 11,
            background: sender.color || C.primaryLight,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 13, flexShrink: 0,
          }}>
            {sender.avatar}
          </div>
          <span style={{ fontSize: F.sizes.xs, fontWeight: 700, color: C.textMuted, fontFamily: F.heading }}>
            {sender.name}
          </span>
        </div>
      )}
      <div style={{
        maxWidth: '75%',
        padding: '10px 14px',
        borderRadius: isMe ? '18px 18px 4px 18px' : '4px 18px 18px 18px',
        background: isMe ? C.primary : '#fff',
        color: isMe ? '#fff' : C.text,
        fontSize: F.sizes.md,
        fontFamily: F.body,
        border: isMe ? 'none' : `1.5px solid ${C.borderLight}`,
        boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
        wordBreak: 'break-word',
        lineHeight: 1.5,
      }}>
        {msg.text}
      </div>
      <span style={{
        fontSize: 11, color: C.textMuted, fontFamily: F.heading, marginTop: 3,
        marginLeft: isMe ? 0 : 4, marginRight: isMe ? 4 : 0,
      }}>
        {formatMsgTime(msg.created_at)}
      </span>
    </div>
  );
}

export function ChatView({ familyId, member, members, moodEnabled, pollEnabled, onAchievement }) {
  const [messages, setMessages] = useState([]);
  const [text,     setText]     = useState('');
  const [sending,  setSending]  = useState(false);
  const [loading,  setLoading]  = useState(true);
  const bottomRef = useRef(null);
  const pollRef   = useRef(null);

  const memberMap = useMemo(() => {
    const map = {};
    (members || []).forEach(m => { map[m.id] = m; });
    return map;
  }, [members]);

  const load = useCallback(async () => {
    const { data } = await supabase.rpc('get_family_messages', { p_family_id: familyId, p_limit: 50 });
    // RPC returns newest first — reverse so oldest is at top
    setMessages((data || []).slice().reverse());
    setLoading(false);
  }, [familyId]);

  useEffect(() => { load(); }, [load]);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (messages.length > 0) bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Poll var 10:e sekund — fallback för barn utan auth-session
  useEffect(() => {
    pollRef.current = setInterval(load, 10_000);
    return () => clearInterval(pollRef.current);
  }, [load]);

  // Realtime — funkar för föräldrar med auth-session
  useEffect(() => {
    const channel = supabase
      .channel(`chat:${familyId}`)
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'family_messages',
        filter: `family_id=eq.${familyId}`,
      }, (payload) => {
        setMessages(prev => [...prev, payload.new]);
      })
      .subscribe();
    return () => supabase.removeChannel(channel);
  }, [familyId]);

  async function handleSend() {
    if (!text.trim() || sending) return;
    setSending(true);
    await supabase.rpc('send_family_message', {
      p_family_id: familyId,
      p_member_id: member.id,
      p_text:      text.trim(),
    });
    setText('');
    setSending(false);
    // Push notification to other family members
    sendPushToFamily({
      familyId,
      excludeMemberId: member.id,
      title: `${member.name} i FamTastic`,
      body:  text.trim().slice(0, 100),
    });
    // Achievement triggers
    const isNew1 = await unlockAchievement(familyId, member.id, 'first_message');
    const isNew2 = await unlockAchievement(familyId, member.id, 'explore_chat');
    if ((isNew1 || isNew2) && onAchievement) onAchievement();
    // messages_10 / messages_50 require a count — checked via useAchievements meta pass
    load();
  }

  return (
    <div style={styles.outer}>
      {/* Alltid synlig topp-zon: rubrik + kort */}
      <div style={styles.topZone}>
        <div style={styles.header}>
          <h1 style={styles.title}>💬 Familjechatten</h1>
        </div>
        {moodEnabled && (
          <MoodCard familyId={familyId} member={member} members={members} onAchievement={onAchievement} />
        )}
        {pollEnabled && (
          <PollCard familyId={familyId} member={member} members={members} onAchievement={onAchievement} />
        )}
      </div>

      {/* Scrollbart meddelandeområde */}
      <div style={styles.messagesArea}>
        {loading ? (
          <p style={styles.loadingText}>Laddar...</p>
        ) : messages.length === 0 ? (
          <div style={styles.emptyState}>
            <div style={{ fontSize: 52, marginBottom: 12 }}>💬</div>
            <p style={styles.emptyTitle}>Inga meddelanden ännu</p>
            <p style={styles.emptyText}>Säg hej till familjen!</p>
          </div>
        ) : (
          <>
            {messages.map(msg => (
              <MessageBubble
                key={msg.id}
                msg={msg}
                sender={memberMap[msg.member_id]}
                isMe={msg.member_id === member.id}
              />
            ))}
            <div ref={bottomRef} />
          </>
        )}
      </div>

      {/* Input-fält */}
      <div style={styles.inputBar}>
        <input
          type="text"
          placeholder="Skriv ett meddelande..."
          value={text}
          onChange={e => setText(e.target.value.slice(0, 500))}
          onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleSend()}
          style={styles.input}
        />
        <button
          onClick={handleSend}
          disabled={!text.trim() || sending}
          style={{ ...styles.sendBtn, opacity: text.trim() && !sending ? 1 : 0.5 }}
        >
          ➤
        </button>
      </div>
    </div>
  );
}

const styles = {
  // Fast flex-kolumn: topp-zon syns alltid, meddelanden scrollar i mitten
  outer: {
    position: 'fixed',
    top: TOPBAR_H,
    left: 0, right: 0,
    bottom: 'calc(76px + env(safe-area-inset-bottom, 0px))',
    display: 'flex',
    flexDirection: 'column',
    background: C.bg,
    fontFamily: F.body,
  },
  topZone: {
    flexShrink: 0,
  },
  header: {
    padding: '16px 16px 12px',
    backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)',
    background: 'rgba(255,251,245,0.92)',
    borderBottom: `1px solid ${C.borderLight}`,
  },
  title: {
    fontFamily: F.heading, fontSize: F.sizes.xl, fontWeight: 800,
    color: C.text, margin: 0,
  },
  messagesArea: {
    flex: 1,
    overflowY: 'auto',
    padding: '14px 16px 8px',
  },
  loadingText: { textAlign: 'center', color: C.textMuted, padding: 40 },
  emptyState: { textAlign: 'center', padding: '60px 20px' },
  emptyTitle: {
    fontFamily: F.heading, fontWeight: 800, fontSize: F.sizes.lg,
    color: C.text, margin: '0 0 6px',
  },
  emptyText: { fontSize: F.sizes.sm, color: C.textMuted, margin: 0 },
  inputBar: {
    flexShrink: 0,
    display: 'flex', gap: 8, alignItems: 'center',
    background: 'rgba(255,251,245,0.96)',
    padding: '8px',
    backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)',
    borderTop: `1px solid ${C.borderLight}`,
  },
  input: {
    flex: 1,
    border: 'none',
    background: 'transparent',
    fontSize: F.sizes.md,
    fontFamily: F.body,
    color: C.text,
    outline: 'none',
    padding: '6px 8px',
  },
  sendBtn: {
    width: 44, height: 44, borderRadius: 14,
    border: 'none', background: C.primary, color: '#fff',
    fontSize: 18, cursor: 'pointer', flexShrink: 0,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    transition: 'opacity 0.15s',
  },
};
