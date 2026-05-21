// ============================================
// FamTastic — ChoresView (Duolingo-style)
// ============================================

import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { C, F, S, todayStr, safeArray, streakEmoji } from '../data';
import { ChoreCard } from './ChoreCard';
import { ChoreEditor } from './ChoreEditor';
import { Plus, List, CalendarDays, Filter, Trophy } from 'lucide-react';

export function ChoresView({ familyId, member, members }) {
  const [tab, setTab] = useState('today');
  const [chores, setChores] = useState([]);
  const [completions, setCompletions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);
  const [filterMember, setFilterMember] = useState(null);
  const [toastMsg, setToastMsg] = useState(null);
  const [familySettings, setFamilySettings] = useState({});

  const today = todayStr();
  const todayDow = new Date().getDay() || 7;
  const isParent = member.role === 'admin' || member.role === 'parent';
  const requireApproval = !!familySettings.require_approval;

  const now = new Date();
  const dayNum = now.getDay() || 7;
  const monday = new Date(now);
  monday.setDate(now.getDate() - dayNum + 1);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  const weekStart = fmtDate(monday);
  const weekEnd = fmtDate(sunday);

  useEffect(() => {
    loadData();
  }, [familyId]);

  async function loadData() {
    setLoading(true);
    const [chRes, compRes, famRes] = await Promise.all([
      supabase.from('chores').select('*')
        .eq('family_id', familyId)
        .order('created_at'),
      supabase.from('chore_completions').select('*')
        .eq('family_id', familyId)
        .gte('completed_date', weekStart)
        .lte('completed_date', weekEnd),
      supabase.from('families').select('settings')
        .eq('id', familyId)
        .single(),
    ]);
    setChores(chRes.data || []);
    setCompletions(compRes.data || []);
    setFamilySettings(famRes.data?.settings || {});
    setLoading(false);
  }

  function fmtDate(d) {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }

  function weekTotal(chore) {
    if (!chore.is_recurring || !chore.recurrence_rule) return 1;
    const days = safeArray(chore.recurrence_rule.days);
    return days.length > 0 ? days.length : 1;
  }

  function weekDone(choreId, memberId) {
    return completions.filter(
      c => c.chore_id === choreId && c.member_id === memberId
    ).length;
  }

  function weekEarned(chore, memberId) {
    if (chore.chore_type === 'base') return 0;
    return completions
      .filter(c => c.chore_id === chore.id && c.member_id === memberId)
      .reduce((sum, c) => sum + (c.points_earned || 0), 0);
  }

  function isCompletedToday(choreId, memberId) {
    return completions.some(
      c => c.chore_id === choreId && c.member_id === memberId && c.completed_date === today
    );
  }

  function isPending(choreId, memberId) {
    return completions.some(
      c => c.chore_id === choreId && c.member_id === memberId
        && c.completed_date === today && !c.approved_by && c.approved_at === null
    );
  }

  // BUG #1 FIX: filter works correctly for assigned + unassigned chores
  function getTodayChores() {
    return chores.filter(c => {
      // Check recurring schedule
      if (c.is_recurring && c.recurrence_rule) {
        const days = safeArray(c.recurrence_rule.days);
        if (days.length > 0 && !days.includes(todayDow)) return false;
      }
      // Member filter: show chore if assigned to selected member OR unassigned
      if (filterMember) {
        if (c.assigned_to && c.assigned_to !== filterMember) return false;
        // unassigned (assigned_to=null) always passes — shown for everyone
      }
      return true;
    });
  }

  // BUG #1 FIX: groupByMember now respects filterMember
  function groupByMember(choreList) {
    const children = members.filter(m => m.role === 'child');
    const filtered = filterMember
      ? children.filter(c => c.id === filterMember)
      : children;

    return filtered.map(child => ({
      member: child,
      chores: choreList.filter(c =>
        !c.assigned_to || c.assigned_to === child.id
      ),
    })).filter(g => g.chores.length > 0);
  }

  // --- Toggle via RPC ---
  async function toggleChore(choreId, memberId) {
    const mid = memberId || member.id;
    const done = isCompletedToday(choreId, mid);

    if (done) {
      const { error } = await supabase.rpc('uncomplete_chore', {
        p_chore_id: choreId,
        p_member_id: mid,
        p_completed_date: today,
      });
      if (error) showToast('Kunde inte ångra: ' + error.message);
    } else {
      const chore = chores.find(c => c.id === choreId);
      const { data, error } = await supabase.rpc('complete_chore', {
        p_chore_id: choreId,
        p_family_id: familyId,
        p_member_id: mid,
        p_completed_date: today,
      });
      if (error) {
        showToast('Kunde inte bocka av: ' + error.message);
      } else if (data?.points_earned > 0) {
        showToast(`🎉 +${data.points_earned} kr för ${chore?.title}!`);
      } else {
        showToast(`✅ ${chore?.title} klart!`);
      }
    }
    loadData();
  }

  function showToast(msg) {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3000);
  }

  async function handleSave(data) {
    if (editing && editing !== 'new' && editing.id) {
      await supabase.from('chores').update(data).eq('id', editing.id);
    } else {
      await supabase.from('chores').insert(data);
    }
    setEditing(null);
    loadData();
  }

  async function handleDelete(choreId) {
    await supabase.from('chores').delete().eq('id', choreId);
    setEditing(null);
    loadData();
  }

  function weekSummary(childId) {
    const childCompletions = completions.filter(c => c.member_id === childId);
    const bonusEarned = childCompletions.reduce((sum, c) => sum + (c.points_earned || 0), 0);
    const totalDone = childCompletions.length;
    return { totalDone, bonusEarned };
  }

  // --- RENDER ---
  return (
    <div style={styles.page}>
      {/* Toast */}
      {toastMsg && (
        <div style={styles.toast}>{toastMsg}</div>
      )}

      {/* Header */}
      <div style={styles.header}>
        <h1 style={styles.pageTitle}>Sysslor</h1>
        {isParent && (
          <button
            onClick={() => setEditing('new')}
            style={styles.addBtn}
          >
            <Plus size={20} /> Ny
          </button>
        )}
      </div>

      {/* Tabs — Duolingo pill style */}
      <div style={styles.tabRow}>
        <button
          onClick={() => setTab('today')}
          style={{
            ...styles.tabBtn,
            background: tab === 'today' ? C.primary : C.bgCard,
            color: tab === 'today' ? '#fff' : C.textMuted,
            borderColor: tab === 'today' ? C.primary : C.border,
          }}
        >
          <CalendarDays size={16} /> Idag
        </button>
        <button
          onClick={() => setTab('all')}
          style={{
            ...styles.tabBtn,
            background: tab === 'all' ? C.primary : C.bgCard,
            color: tab === 'all' ? '#fff' : C.textMuted,
            borderColor: tab === 'all' ? C.primary : C.border,
          }}
        >
          <List size={16} /> Alla
        </button>
      </div>

      {/* Member filter pills */}
      {tab === 'today' && members.filter(m => m.role === 'child').length > 1 && (
        <div style={styles.filterRow}>
          <button
            onClick={() => setFilterMember(null)}
            style={{
              ...styles.filterPill,
              background: !filterMember ? C.text : C.bgCard,
              color: !filterMember ? '#fff' : C.text,
              borderColor: !filterMember ? C.text : C.border,
            }}
          >
            Alla
          </button>
          {members.filter(m => m.role === 'child').map(m => (
            <button
              key={m.id}
              onClick={() => setFilterMember(m.id)}
              style={{
                ...styles.filterPill,
                background: filterMember === m.id ? (m.color || C.primary) : C.bgCard,
                color: filterMember === m.id ? '#fff' : C.text,
                borderColor: filterMember === m.id ? (m.color || C.primary) : C.border,
              }}
            >
              {m.avatar} {m.name}
            </button>
          ))}
        </div>
      )}

      {loading ? (
        <p style={styles.loadingText}>Laddar sysslor...</p>
      ) : tab === 'today' ? (
        <div style={styles.content}>
          {getTodayChores().length === 0 ? (
            <div style={S.emptyState}>
              <span style={{ fontSize: 48 }}>🎉</span>
              <p style={styles.emptyTitle}>Inga sysslor idag!</p>
              <p style={styles.emptyText}>Njut av den lediga dagen.</p>
            </div>
          ) : (
            groupByMember(getTodayChores()).map(group => {
              const summary = weekSummary(group.member.id);
              return (
                <div key={group.member.id} style={styles.memberGroup}>
                  {/* Member header with stats */}
                  <div style={styles.memberHeader}>
                    <div style={{
                      ...styles.memberAvatarWrap,
                      background: group.member.color || C.primary,
                    }}>
                      <span style={styles.memberAvatar}>{group.member.avatar}</span>
                    </div>
                    <div style={styles.memberInfo}>
                      <span style={styles.memberName}>{group.member.name}</span>
                      <span style={styles.memberStats}>
                        {summary.totalDone} gjorda denna vecka
                        {summary.bonusEarned > 0 && ` · ${summary.bonusEarned} kr`}
                      </span>
                    </div>
                    {summary.totalDone >= 5 && (
                      <div style={styles.streakBadge}>
                        <Trophy size={14} color={C.accent} />
                        <span style={styles.streakText}>{summary.totalDone}</span>
                      </div>
                    )}
                  </div>

                  {/* Chore cards */}
                  {group.chores.map(chore => {
                    const total = weekTotal(chore);
                    const done = weekDone(chore.id, group.member.id);
                    const earned = weekEarned(chore, group.member.id);
                    return (
                      <ChoreCard
                        key={chore.id}
                        chore={chore}
                        completed={isCompletedToday(chore.id, group.member.id)}
                        pending={isPending(chore.id, group.member.id)}
                        requireApproval={requireApproval}
                        onToggle={() => toggleChore(chore.id, group.member.id)}
                        canToggle={member.id === group.member.id || isParent}
                        memberAvatar={null}
                        memberName={null}
                        weekProgress={{ done, total }}
                        weekEarned={earned}
                      />
                    );
                  })}
                </div>
              );
            })
          )}
        </div>
      ) : (
        /* ALL CHORES tab */
        <div style={styles.content}>
          {chores.length === 0 ? (
            <div style={S.emptyState}>
              <span style={{ fontSize: 48 }}>📋</span>
              <p style={styles.emptyTitle}>Inga sysslor ännu</p>
              <p style={styles.emptyText}>Skapa den första sysslan med knappen ovan.</p>
            </div>
          ) : (
            <>
              {chores.filter(c => c.chore_type === 'base').length > 0 && (
                <div style={styles.choreGroup}>
                  <p style={S.sectionLabel}>Grundsysslor (ingår i veckopeng)</p>
                  {chores.filter(c => c.chore_type === 'base').map(chore => {
                    const assignee = chore.assigned_to
                      ? members.find(m => m.id === chore.assigned_to)
                      : null;
                    return (
                      <ChoreCard
                        key={chore.id}
                        chore={chore}
                        completed={false}
                        pending={false}
                        requireApproval={requireApproval}
                        onToggle={() => isParent && setEditing(chore)}
                        canToggle={isParent}
                        memberAvatar={assignee?.avatar}
                        memberName={assignee?.name}
                        weekProgress={null}
                        weekEarned={0}
                      />
                    );
                  })}
                </div>
              )}

              {chores.filter(c => c.chore_type !== 'base').length > 0 && (
                <div style={styles.choreGroup}>
                  <p style={S.sectionLabel}>Bonussysslor (extra pengar)</p>
                  {chores.filter(c => c.chore_type !== 'base').map(chore => {
                    const assignee = chore.assigned_to
                      ? members.find(m => m.id === chore.assigned_to)
                      : null;
                    return (
                      <ChoreCard
                        key={chore.id}
                        chore={chore}
                        completed={false}
                        pending={false}
                        requireApproval={requireApproval}
                        onToggle={() => isParent && setEditing(chore)}
                        canToggle={isParent}
                        memberAvatar={assignee?.avatar}
                        memberName={assignee?.name}
                        weekProgress={null}
                        weekEarned={0}
                      />
                    );
                  })}
                </div>
              )}
            </>
          )}
        </div>
      )}

      <div style={{ height: 80 }} />

      {editing && (
        <ChoreEditor
          chore={editing === 'new' ? null : editing}
          members={members}
          familyId={familyId}
          memberId={member.id}
          onSave={handleSave}
          onDelete={isParent ? handleDelete : null}
          onClose={() => setEditing(null)}
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
  toast: {
    position: 'fixed',
    top: 16,
    left: '50%',
    transform: 'translateX(-50%)',
    background: C.text,
    color: '#fff',
    padding: '12px 24px',
    borderRadius: 99,
    fontSize: F.sizes.sm,
    fontWeight: F.weights.bold,
    fontFamily: F.heading,
    zIndex: 300,
    boxShadow: '0 4px 16px rgba(0,0,0,0.2)',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '16px 16px 8px',
  },
  pageTitle: {
    fontFamily: F.heading,
    fontSize: F.sizes.xl,
    fontWeight: F.weights.extra,
    color: C.text,
    margin: 0,
  },
  addBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    padding: '10px 18px',
    borderRadius: 12,
    border: 'none',
    background: C.primary,
    color: '#fff',
    fontSize: F.sizes.sm,
    fontWeight: F.weights.bold,
    fontFamily: F.heading,
    cursor: 'pointer',
    minHeight: 44,
  },
  tabRow: {
    display: 'flex',
    gap: 8,
    padding: '8px 16px 4px',
  },
  tabBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    padding: '10px 20px',
    borderRadius: 99,
    border: '1.5px solid',
    fontSize: F.sizes.sm,
    fontWeight: F.weights.bold,
    fontFamily: F.heading,
    cursor: 'pointer',
    minHeight: 44,
    transition: 'background 0.15s, color 0.15s',
  },
  filterRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    padding: '8px 16px',
    overflowX: 'auto',
  },
  filterPill: {
    padding: '8px 16px',
    borderRadius: 99,
    border: '1.5px solid',
    fontSize: F.sizes.sm,
    fontWeight: F.weights.bold,
    fontFamily: F.heading,
    cursor: 'pointer',
    whiteSpace: 'nowrap',
    minHeight: 40,
    transition: 'background 0.15s, color 0.15s',
  },
  content: {
    padding: '8px 16px',
  },
  loadingText: {
    textAlign: 'center',
    color: C.textMuted,
    padding: 32,
    fontFamily: F.heading,
  },
  emptyTitle: {
    fontFamily: F.heading,
    fontSize: F.sizes.lg,
    fontWeight: F.weights.bold,
    color: C.text,
    margin: '12px 0 4px',
  },
  emptyText: {
    fontSize: F.sizes.sm,
    color: C.textMuted,
    margin: 0,
    fontFamily: F.heading,
  },
  memberGroup: {
    marginBottom: 24,
  },
  memberHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
    padding: '4px 0',
  },
  memberAvatarWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  memberAvatar: {
    fontSize: 22,
  },
  memberInfo: {
    flex: 1,
    minWidth: 0,
  },
  memberName: {
    display: 'block',
    fontFamily: F.heading,
    fontSize: F.sizes.md,
    fontWeight: F.weights.bold,
    color: C.text,
  },
  memberStats: {
    display: 'block',
    fontSize: F.sizes.xs,
    color: C.textMuted,
    fontFamily: F.heading,
  },
  streakBadge: {
    display: 'flex',
    alignItems: 'center',
    gap: 4,
    padding: '4px 10px',
    borderRadius: 99,
    background: C.accentLight,
    flexShrink: 0,
  },
  streakText: {
    fontSize: F.sizes.sm,
    fontWeight: F.weights.extra,
    fontFamily: F.heading,
    color: '#92400E',
  },
  choreGroup: {
    marginBottom: 24,
  },
};
