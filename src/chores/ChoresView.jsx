// ============================================
// FamTastic — ChoresView (today + manage)
// ============================================

import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { C, F, S, todayStr, safeArray } from '../data';
import { ChoreCard } from './ChoreCard';
import { ChoreEditor } from './ChoreEditor';
import { Plus, List, CalendarDays, Filter } from 'lucide-react';

export function ChoresView({ familyId, member, members }) {
  const [tab, setTab] = useState('today'); // 'today' | 'all'
  const [chores, setChores] = useState([]);
  const [completions, setCompletions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null); // null | 'new' | chore object
  const [filterMember, setFilterMember] = useState(null); // null = all

  const today = todayStr();
  const todayDow = new Date().getDay() || 7; // 1=Mon, 7=Sun
  const isParent = member.role === 'admin' || member.role === 'parent';

  useEffect(() => {
    loadData();
  }, [familyId]);

  async function loadData() {
    setLoading(true);

    // Get week start/end for completions
    const now = new Date();
    const day = now.getDay() || 7;
    const monday = new Date(now);
    monday.setDate(now.getDate() - day + 1);
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    const startDate = fmtDate(monday);
    const endDate = fmtDate(sunday);

    const [chRes, compRes] = await Promise.all([
      supabase.from('chores').select('*')
        .eq('family_id', familyId)
        .order('created_at'),
      supabase.from('chore_completions').select('*')
        .eq('family_id', familyId)
        .gte('completed_date', startDate)
        .lte('completed_date', endDate),
    ]);

    setChores(chRes.data || []);
    setCompletions(compRes.data || []);
    setLoading(false);
  }

  function fmtDate(d) {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }

  // --- Filter today's chores ---
  function getTodayChores() {
    return chores.filter(c => {
      // Recurring: check if today's day is in the schedule
      if (c.is_recurring && c.recurrence_rule) {
        const days = safeArray(c.recurrence_rule.days);
        if (days.length > 0 && !days.includes(todayDow)) return false;
      }
      // Filter by member
      if (filterMember) {
        if (c.assigned_to && c.assigned_to !== filterMember) return false;
      }
      return true;
    });
  }

  function isCompleted(choreId, memberId) {
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

  async function toggleChore(choreId, memberId) {
    const mid = memberId || member.id;
    const done = isCompleted(choreId, mid);

    if (done) {
      await supabase.from('chore_completions')
        .delete()
        .eq('chore_id', choreId)
        .eq('member_id', mid)
        .eq('completed_date', today);
    } else {
      const chore = chores.find(c => c.id === choreId);
      await supabase.from('chore_completions')
        .insert({
          chore_id: choreId,
          family_id: familyId,
          member_id: mid,
          completed_date: today,
          points_earned: chore?.chore_type === 'bonus' ? (chore?.points || 0) : 0,
        });
    }
    loadData();
  }

  // --- Save/delete chore ---
  async function handleSave(data) {
    if (editing && editing !== 'new' && editing.id) {
      const { id, ...rest } = data;
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

  // --- Group chores by assigned member ---
  function groupByMember(choreList) {
    const groups = {};
    const children = members.filter(m => m.role === 'child');

    children.forEach(child => {
      groups[child.id] = {
        member: child,
        chores: choreList.filter(c =>
          !c.assigned_to || c.assigned_to === child.id
        ),
      };
    });

    return Object.values(groups).filter(g => g.chores.length > 0);
  }

  // --- Week summary per child ---
  function weekSummary(childId) {
    const childCompletions = completions.filter(c => c.member_id === childId);
    const bonusEarned = childCompletions.reduce((sum, c) => sum + (c.points_earned || 0), 0);
    const totalDone = childCompletions.length;
    return { totalDone, bonusEarned };
  }

  // --- RENDER ---
  return (
    <div style={styles.page}>
      {/* Header */}
      <div style={styles.header}>
        <h1 style={styles.title}>Sysslor</h1>
        {isParent && (
          <button
            onClick={() => setEditing('new')}
            style={{ ...S.button, ...S.buttonPrimary, padding: '8px 16px' }}
          >
            <Plus size={18} /> Ny syssla
          </button>
        )}
      </div>

      {/* Tabs */}
      <div style={styles.tabs}>
        <button
          onClick={() => setTab('today')}
          style={{
            ...styles.tab,
            borderBottom: tab === 'today' ? `3px solid ${C.primary}` : '3px solid transparent',
            color: tab === 'today' ? C.primary : C.textMuted,
          }}
        >
          <CalendarDays size={16} /> Idag
        </button>
        <button
          onClick={() => setTab('all')}
          style={{
            ...styles.tab,
            borderBottom: tab === 'all' ? `3px solid ${C.primary}` : '3px solid transparent',
            color: tab === 'all' ? C.primary : C.textMuted,
          }}
        >
          <List size={16} /> Alla sysslor
        </button>
      </div>

      {/* Member filter */}
      {tab === 'today' && members.filter(m => m.role === 'child').length > 1 && (
        <div style={styles.filterRow}>
          <Filter size={14} color={C.textMuted} />
          <button
            onClick={() => setFilterMember(null)}
            style={{
              ...styles.filterBtn,
              background: !filterMember ? C.primary : C.bgCard,
              color: !filterMember ? '#fff' : C.text,
            }}
          >
            Alla
          </button>
          {members.filter(m => m.role === 'child').map(m => (
            <button
              key={m.id}
              onClick={() => setFilterMember(m.id)}
              style={{
                ...styles.filterBtn,
                background: filterMember === m.id ? C.primary : C.bgCard,
                color: filterMember === m.id ? '#fff' : C.text,
              }}
            >
              {m.avatar} {m.name}
            </button>
          ))}
        </div>
      )}

      {loading ? (
        <p style={styles.loadingText}>Laddar...</p>
      ) : tab === 'today' ? (
        /* --- TODAY VIEW --- */
        <div style={styles.content}>
          {getTodayChores().length === 0 ? (
            <div style={styles.emptyState}>
              <span style={{ fontSize: 40 }}>🎉</span>
              <p style={styles.emptyTitle}>Inga sysslor idag!</p>
              <p style={styles.emptyText}>Njut av den lediga dagen.</p>
            </div>
          ) : (
            groupByMember(getTodayChores()).map(group => (
              <div key={group.member.id} style={styles.memberGroup}>
                <div style={styles.memberHeader}>
                  <span style={styles.memberAvatar}>{group.member.avatar}</span>
                  <span style={styles.memberName}>{group.member.name}</span>
                  <span style={styles.memberStats}>
                    {weekSummary(group.member.id).totalDone} gjorda denna vecka
                    {weekSummary(group.member.id).bonusEarned > 0 &&
                      ` · ${weekSummary(group.member.id).bonusEarned} kr bonus`
                    }
                  </span>
                </div>
                {group.chores.map(chore => (
                  <ChoreCard
                    key={chore.id}
                    chore={chore}
                    completed={isCompleted(chore.id, group.member.id)}
                    pending={isPending(chore.id, group.member.id)}
                    onToggle={() => toggleChore(chore.id, group.member.id)}
                    canToggle={member.id === group.member.id || isParent}
                    memberAvatar={null}
                    memberName={null}
                  />
                ))}
              </div>
            ))
          )}
        </div>
      ) : (
        /* --- ALL CHORES VIEW --- */
        <div style={styles.content}>
          {chores.length === 0 ? (
            <div style={styles.emptyState}>
              <span style={{ fontSize: 40 }}>📋</span>
              <p style={styles.emptyTitle}>Inga sysslor ännu</p>
              <p style={styles.emptyText}>Skapa den första sysslan med knappen ovan.</p>
            </div>
          ) : (
            <>
              {/* Base chores */}
              {chores.filter(c => c.chore_type === 'base').length > 0 && (
                <div style={styles.choreGroup}>
                  <h3 style={styles.groupTitle}>Grundsysslor (ingår i veckopeng)</h3>
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
                        onToggle={() => isParent && setEditing(chore)}
                        canToggle={isParent}
                        memberAvatar={assignee?.avatar}
                        memberName={assignee?.name}
                      />
                    );
                  })}
                </div>
              )}

              {/* Bonus chores */}
              {chores.filter(c => c.chore_type !== 'base').length > 0 && (
                <div style={styles.choreGroup}>
                  <h3 style={styles.groupTitle}>Bonussysslor (extra pengar)</h3>
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
                        onToggle={() => isParent && setEditing(chore)}
                        canToggle={isParent}
                        memberAvatar={assignee?.avatar}
                        memberName={assignee?.name}
                      />
                    );
                  })}
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* Bottom padding for nav */}
      <div style={{ height: 80 }} />

      {/* Editor modal */}
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
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '16px 16px 8px',
  },
  title: {
    fontFamily: F.heading,
    fontSize: F.sizes.xl,
    fontWeight: F.weights.extra,
    color: C.text,
    margin: 0,
  },
  tabs: {
    display: 'flex',
    gap: 0,
    padding: '0 16px',
    borderBottom: `1px solid ${C.borderLight}`,
  },
  tab: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    padding: '10px 16px',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    fontSize: F.sizes.sm,
    fontWeight: F.weights.bold,
    fontFamily: F.heading,
  },
  filterRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    padding: '10px 16px',
    overflowX: 'auto',
  },
  filterBtn: {
    padding: '6px 12px',
    borderRadius: 8,
    border: `1px solid ${C.border}`,
    fontSize: F.sizes.xs,
    fontWeight: F.weights.bold,
    fontFamily: F.heading,
    cursor: 'pointer',
    whiteSpace: 'nowrap',
  },
  content: {
    padding: '12px 16px',
  },
  loadingText: {
    textAlign: 'center',
    color: C.textMuted,
    padding: 32,
  },
  emptyState: {
    textAlign: 'center',
    padding: '40px 20px',
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
  },
  memberGroup: {
    marginBottom: 20,
  },
  memberHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
    padding: '4px 0',
  },
  memberAvatar: {
    fontSize: 24,
  },
  memberName: {
    fontFamily: F.heading,
    fontSize: F.sizes.md,
    fontWeight: F.weights.bold,
    color: C.text,
  },
  memberStats: {
    fontSize: F.sizes.xs,
    color: C.textMuted,
    marginLeft: 'auto',
  },
  choreGroup: {
    marginBottom: 20,
  },
  groupTitle: {
    fontFamily: F.heading,
    fontSize: F.sizes.sm,
    fontWeight: F.weights.bold,
    color: C.textMuted,
    margin: '0 0 10px',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
};
