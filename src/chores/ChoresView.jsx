// ============================================
// FamTastic — ChoresView (Duolingo-style)
// with pool chores + parent feedback
// + scheduled_date & recurrence until support
// ============================================

import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { C, F, S, todayStr, safeArray } from '../data';
import { ChoreCard } from './ChoreCard';
import { ChorePoolCard } from './ChorePoolCard';
import { ChoreEditor } from './ChoreEditor';
import { Plus, List, CalendarDays, Trophy, HandMetal } from 'lucide-react';


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

  useEffect(() => { loadData(); }, [familyId]);

  async function loadData() {
    setLoading(true);
    const [chRes, compRes, famRes] = await Promise.all([
      supabase.from('chores').select('*').eq('family_id', familyId).order('created_at'),
      supabase.from('chore_completions').select('*').eq('family_id', familyId)
        .gte('completed_date', weekStart).lte('completed_date', weekEnd),
      supabase.from('families').select('settings').eq('id', familyId).single(),
    ]);
    setChores(chRes.data || []);
    setCompletions(compRes.data || []);
    setFamilySettings(famRes.data?.settings || {});
    setLoading(false);
  }

  function fmtDate(d) {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }

  function isScheduledForToday(c) {
    if (c.scheduled_date) return c.scheduled_date === today;
    if (c.is_recurring && c.recurrence_rule) {
      const rule = c.recurrence_rule;
      if (rule.until && today > rule.until) return false;
      const days = safeArray(rule.days);
      if (days.length > 0 && !days.includes(todayDow)) return false;
    }
    return true;
  }

  function weekTotal(chore) {
    if (chore.scheduled_date) return 1;
    if (!chore.is_recurring || !chore.recurrence_rule) return 1;
    const days = safeArray(chore.recurrence_rule.days);
    return days.length > 0 ? days.length : 1;
  }

  function weekDone(choreId, memberId) {
    return completions.filter(c => c.chore_id === choreId && c.member_id === memberId).length;
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

  function getTodayChores() {
    return chores.filter(c => {
      if (c.pool && !c.assigned_to) return false;
      if (!isScheduledForToday(c)) return false;
      if (filterMember) {
        if (c.assigned_to && c.assigned_to !== filterMember) return false;
      }
      return true;
    });
  }

  function getPoolChores() {
    return chores.filter(c => {
      if (!c.pool || c.assigned_to) return false;
      if (c.scheduled_date) return c.scheduled_date !== today ? false : true;
      if (c.is_recurring && c.recurrence_rule) {
        if (c.recurrence_rule.until && today > c.recurrence_rule.until) return false;
        const days = safeArray(c.recurrence_rule.days);
        if (days.length > 0 && !days.includes(todayDow)) return false;
      }
      return true;
    });
  }

  function getClaimedPoolChores() {
    return chores.filter(c => c.pool && c.assigned_to);
  }

  function groupByMember(choreList) {
    const children = members.filter(m => m.role === 'child');
    const filtered = filterMember ? children.filter(c => c.id === filterMember) : children;
    return filtered.map(child => ({
      member: child,
      chores: choreList.filter(c => !c.assigned_to || c.assigned_to === child.id),
    })).filter(g => g.chores.length > 0);
  }

  async function toggleChore(choreId, memberId) {
    const mid = memberId || member.id;
    const done = isCompletedToday(choreId, mid);
    if (done) {
      const { error } = await supabase.rpc('uncomplete_chore', {
        p_chore_id: choreId, p_member_id: mid, p_completed_date: today,
      });
      if (error) showToast('Kunde inte ångra: ' + error.message);
    } else {
      const chore = chores.find(c => c.id === choreId);
      const { data, error } = await supabase.rpc('complete_chore', {
        p_chore_id: choreId, p_family_id: familyId, p_member_id: mid, p_completed_date: today,
      });
      if (error) showToast('Kunde inte bocka av: ' + error.message);
      else if (data?.points_earned > 0) showToast(`🎉 +${data.points_earned} kr för ${chore?.title}!`);
      else showToast(`✅ ${chore?.title} klart!`);
    }
    loadData();
  }

  async function claimChore(choreId) {
    const { data, error } = await supabase.rpc('child_claim_pool_chore', {
      p_family_id: familyId,
      p_member_id: member.id,
      p_chore_id: choreId,
    });
    if (error || !data?.success) showToast('Kunde inte plocka sysslan');
    else showToast('🙌 Du tog sysslan!');
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
    const cc = completions.filter(c => c.member_id === childId);
    return { totalDone: cc.length, bonusEarned: cc.reduce((s, c) => s + (c.points_earned || 0), 0) };
  }

  const poolChores = getPoolChores();
  const claimedPoolChores = getClaimedPoolChores();
  const hasPool = poolChores.length > 0 || claimedPoolChores.length > 0;

  return (
    <div style={styles.page}>
      <BgShapes />

      {toastMsg && <div style={styles.toast}>{toastMsg}</div>}

      <div style={styles.headerZone}>
        <div style={styles.header}>
          <h1 style={styles.pageTitle}>Sysslor</h1>
          {isParent && (
            <button onClick={() => setEditing('new')} style={styles.addBtn}>
              <Plus size={20} /> Ny
            </button>
          )}
        </div>

        <div style={styles.tabRow}>
          {[
            { key: 'today', label: 'Idag', icon: CalendarDays },
            ...(hasPool ? [{ key: 'pool', label: 'Plocka', icon: HandMetal }] : []),
            { key: 'all', label: 'Alla', icon: List },
          ].map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              style={{
                ...styles.tabBtn,
                background: tab === t.key ? C.primary : C.bgCard,
                color: tab === t.key ? '#fff' : C.textMuted,
                borderColor: tab === t.key ? C.primary : C.border,
              }}
            >
              <t.icon size={16} /> {t.label}
              {t.key === 'pool' && poolChores.length > 0 && (
                <span style={styles.poolCount}>{poolChores.length}</span>
              )}
            </button>
          ))}
        </div>

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
            >Alla</button>
            {members.filter(m => m.role === 'child').map(m => (
              <button key={m.id} onClick={() => setFilterMember(m.id)} style={{
                ...styles.filterPill,
                background: filterMember === m.id ? (m.color || C.primary) : C.bgCard,
                color: filterMember === m.id ? '#fff' : C.text,
                borderColor: filterMember === m.id ? (m.color || C.primary) : C.border,
              }}>{m.avatar} {m.name}</button>
            ))}
          </div>
        )}
      </div>

      {loading ? (
        <p style={{ ...styles.loadingText, position: 'relative', zIndex: 1 }}>Laddar sysslor...</p>
      ) : tab === 'today' ? (
        <div style={{ ...styles.content, position: 'relative', zIndex: 1 }}>
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
                  <div style={styles.memberHeader}>
                    <div style={{ ...styles.memberAvatarWrap, background: group.member.color || C.primary }}>
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
                  {group.chores.map(chore => (
                    <ChoreCard
                      key={chore.id}
                      chore={chore}
                      completed={isCompletedToday(chore.id, group.member.id)}
                      pending={isPending(chore.id, group.member.id)}
                      requireApproval={requireApproval}
                      onToggle={() => toggleChore(chore.id, group.member.id)}
                      canToggle={member.id === group.member.id || isParent}
                      weekProgress={{ done: weekDone(chore.id, group.member.id), total: weekTotal(chore) }}
                      weekEarned={weekEarned(chore, group.member.id)}
                    />
                  ))}
                </div>
              );
            })
          )}
        </div>
      ) : tab === 'pool' ? (
        <div style={{ ...styles.content, position: 'relative', zIndex: 1 }}>
          {poolChores.length > 0 && (
            <div style={styles.choreGroup}>
              <p style={S.sectionLabel}>Öppna sysslor — plocka en!</p>
              {poolChores.map(chore => (
                <ChorePoolCard
                  key={chore.id}
                  chore={chore}
                  onClaim={() => claimChore(chore.id)}
                  claimedBy={null}
                  members={members}
                />
              ))}
            </div>
          )}
          {claimedPoolChores.length > 0 && (
            <div style={styles.choreGroup}>
              <p style={S.sectionLabel}>
                {isParent ? 'Plockade sysslor' : 'Redan tagna'}
              </p>
              {claimedPoolChores.map(chore => (
                <ChorePoolCard
                  key={chore.id}
                  chore={chore}
                  onClaim={() => {}}
                  claimedBy={chore.assigned_to}
                  members={members}
                />
              ))}
            </div>
          )}
          {poolChores.length === 0 && claimedPoolChores.length === 0 && (
            <div style={S.emptyState}>
              <span style={{ fontSize: 48 }}>🤲</span>
              <p style={styles.emptyTitle}>Inga öppna sysslor</p>
              <p style={styles.emptyText}>
                {isParent
                  ? 'Skapa en syssla och markera den som "Öppen pool".'
                  : 'Fråga en förälder om det finns något att göra!'}
              </p>
            </div>
          )}
        </div>
      ) : (
        <div style={{ ...styles.content, position: 'relative', zIndex: 1 }}>
          {chores.length === 0 ? (
            <div style={S.emptyState}>
              <span style={{ fontSize: 48 }}>📋</span>
              <p style={styles.emptyTitle}>Inga sysslor ännu</p>
              <p style={styles.emptyText}>Skapa den första sysslan med knappen ovan.</p>
            </div>
          ) : (
            <>
              {chores.filter(c => c.chore_type === 'base' && !c.pool).length > 0 && (
                <div style={styles.choreGroup}>
                  <p style={S.sectionLabel}>Grundsysslor</p>
                  {chores.filter(c => c.chore_type === 'base' && !c.pool).map(chore => {
                    const a = chore.assigned_to ? members.find(m => m.id === chore.assigned_to) : null;
                    return (
                      <ChoreCard key={chore.id} chore={chore} completed={false} pending={false}
                        requireApproval={requireApproval} onToggle={() => isParent && setEditing(chore)}
                        canToggle={isParent} memberAvatar={a?.avatar} memberName={a?.name}
                        weekProgress={null} weekEarned={0} />
                    );
                  })}
                </div>
              )}
              {chores.filter(c => c.chore_type !== 'base' && !c.pool).length > 0 && (
                <div style={styles.choreGroup}>
                  <p style={S.sectionLabel}>Bonussysslor</p>
                  {chores.filter(c => c.chore_type !== 'base' && !c.pool).map(chore => {
                    const a = chore.assigned_to ? members.find(m => m.id === chore.assigned_to) : null;
                    return (
                      <ChoreCard key={chore.id} chore={chore} completed={false} pending={false}
                        requireApproval={requireApproval} onToggle={() => isParent && setEditing(chore)}
                        canToggle={isParent} memberAvatar={a?.avatar} memberName={a?.name}
                        weekProgress={null} weekEarned={0} />
                    );
                  })}
                </div>
              )}
              {chores.filter(c => c.pool).length > 0 && (
                <div style={styles.choreGroup}>
                  <p style={S.sectionLabel}>Öppna pool-sysslor</p>
                  {chores.filter(c => c.pool).map(chore => {
                    const a = chore.assigned_to ? members.find(m => m.id === chore.assigned_to) : null;
                    return (
                      <ChoreCard key={chore.id} chore={chore} completed={false} pending={false}
                        requireApproval={requireApproval} onToggle={() => isParent && setEditing(chore)}
                        canToggle={isParent} memberAvatar={a?.avatar} memberName={a?.name || 'Öppen'}
                        weekProgress={null} weekEarned={0} />
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
  page: { minHeight: '100vh', background: C.bg, fontFamily: F.body, position: 'relative', overflow: 'hidden' },
  headerZone: {
    position: 'relative',
    zIndex: 1,
    background: C.bg,
    borderRadius: '0 0 24px 24px',
    borderBottom: '1px solid rgba(60,180,166,0.12)',
    paddingBottom: 8,
  },
  toast: {
    position: 'fixed', top: 16, left: '50%', transform: 'translateX(-50%)',
    background: C.text, color: '#fff', padding: '12px 24px', borderRadius: 99,
    fontSize: F.sizes.sm, fontWeight: F.weights.bold, fontFamily: F.heading,
    zIndex: 300, boxShadow: '0 4px 16px rgba(0,0,0,0.2)',
  },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 16px 8px' },
  pageTitle: { fontFamily: F.heading, fontSize: F.sizes.xl, fontWeight: F.weights.extra, color: C.text, margin: 0 },
  addBtn: {
    display: 'inline-flex', alignItems: 'center', gap: 6, padding: '10px 18px',
    borderRadius: 12, border: 'none', background: C.primary, color: '#fff',
    fontSize: F.sizes.sm, fontWeight: F.weights.bold, fontFamily: F.heading, cursor: 'pointer', minHeight: 44,
  },
  tabRow: { display: 'flex', gap: 8, padding: '8px 16px 4px' },
  tabBtn: {
    display: 'inline-flex', alignItems: 'center', gap: 6, padding: '10px 20px',
    borderRadius: 99, border: '1.5px solid', fontSize: F.sizes.sm, fontWeight: F.weights.bold,
    fontFamily: F.heading, cursor: 'pointer', minHeight: 44, transition: 'background 0.15s, color 0.15s',
  },
  poolCount: {
    background: 'rgba(255,255,255,0.3)', padding: '1px 7px', borderRadius: 99,
    fontSize: F.sizes.xs, fontWeight: F.weights.extra, marginLeft: 2,
  },
  filterRow: { display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', overflowX: 'auto' },
  filterPill: {
    padding: '8px 16px', borderRadius: 99, border: '1.5px solid', fontSize: F.sizes.sm,
    fontWeight: F.weights.bold, fontFamily: F.heading, cursor: 'pointer', whiteSpace: 'nowrap', minHeight: 40,
  },
  content: { padding: '8px 16px' },
  loadingText: { textAlign: 'center', color: C.textMuted, padding: 32, fontFamily: F.heading },
  emptyTitle: { fontFamily: F.heading, fontSize: F.sizes.lg, fontWeight: F.weights.bold, color: C.text, margin: '12px 0 4px' },
  emptyText: { fontSize: F.sizes.sm, color: C.textMuted, margin: 0, fontFamily: F.heading },
  memberGroup: { marginBottom: 24 },
  memberHeader: { display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12, padding: '4px 0' },
  memberAvatarWrap: { width: 40, height: 40, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  memberAvatar: { fontSize: 22 },
  memberInfo: { flex: 1, minWidth: 0 },
  memberName: { display: 'block', fontFamily: F.heading, fontSize: F.sizes.md, fontWeight: F.weights.bold, color: C.text },
  memberStats: { display: 'block', fontSize: F.sizes.xs, color: C.textMuted, fontFamily: F.heading },
  streakBadge: { display: 'flex', alignItems: 'center', gap: 4, padding: '4px 10px', borderRadius: 99, background: C.accentLight, flexShrink: 0 },
  streakText: { fontSize: F.sizes.sm, fontWeight: F.weights.extra, fontFamily: F.heading, color: '#92400E' },
  choreGroup: { marginBottom: 24 },
};
