// ============================================
// FamTastic — SettingsView
// ============================================

import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { C, F, S, formatKr } from '../data';
import { Save, UserPlus, Trash2, ChevronDown, ChevronUp, LogOut, Shield, Coins, Users, Home } from 'lucide-react';

const AVATARS = ['😀','😎','🦊','🐻','🦄','🌟','🎨','⚽','🎵','🌈','🍕','🐱','🐶','🦋','🚀','💪','👑','🧑‍💻'];
const MEMBER_COLORS = C.memberColors;
const WEEKDAY_LABELS = ['Måndag','Tisdag','Onsdag','Torsdag','Fredag','Lördag','Söndag'];

export function SettingsView({ familyId, member, members, onUpdate, onLogout }) {
  const [familyName, setFamilyName] = useState('');
  const [editMembers, setEditMembers] = useState([]);
  const [allowanceRules, setAllowanceRules] = useState([]);
  const [familySettings, setFamilySettings] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);
  const [expandedMember, setExpandedMember] = useState(null);
  const [showAddMember, setShowAddMember] = useState(false);
  const [newMember, setNewMember] = useState({ name: '', role: 'child', avatar: '😀', color: '#3B82F6', pin: '' });

  const isAdmin = member.role === 'admin';
  const isParent = member.role === 'admin' || member.role === 'parent';

  useEffect(() => {
    loadSettings();
  }, [familyId]);

  async function loadSettings() {
    setLoading(true);
    const [famRes, ruleRes] = await Promise.all([
      supabase.from('families').select('name, settings').eq('id', familyId).single(),
      supabase.from('allowance_rules').select('*').eq('family_id', familyId),
    ]);

    if (famRes.data) {
      setFamilyName(famRes.data.name);
      setFamilySettings(famRes.data.settings || {});
    }
    setEditMembers(members.map(m => ({ ...m })));
    setAllowanceRules(ruleRes.data || []);
    setLoading(false);
  }

  function showToast(msg) {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  }

  // --- Save family name ---
  async function saveFamilyName() {
    setSaving(true);
    await supabase.from('families').update({ name: familyName.trim() }).eq('id', familyId);
    showToast('Familjenamn sparat!');
    setSaving(false);
  }

  // --- Save family settings ---
  async function toggleSetting(key) {
    const updated = { ...familySettings, [key]: !familySettings[key] };
    setFamilySettings(updated);
    await supabase.from('families').update({ settings: updated }).eq('id', familyId);
    showToast('Inställning sparad!');
  }

  // --- Save member ---
  async function saveMember(m) {
    setSaving(true);
    const { id, ...data } = m;
    await supabase.from('family_members')
      .update({ name: data.name, avatar: data.avatar, color: data.color })
      .eq('id', id);
    showToast(`${data.name} uppdaterad!`);
    setSaving(false);
    if (onUpdate) onUpdate();
  }

  // --- Delete member ---
  async function deleteMember(id, name) {
    if (!window.confirm(`Vill du verkligen ta bort ${name}? Allt data försvinner.`)) return;
    await supabase.from('family_members').delete().eq('id', id);
    setEditMembers(prev => prev.filter(m => m.id !== id));
    showToast(`${name} borttagen`);
    if (onUpdate) onUpdate();
  }

  // --- Add member ---
  async function addMember() {
    if (!newMember.name.trim()) return;
    setSaving(true);

    const { error } = await supabase.from('family_members').insert({
      family_id: familyId,
      name: newMember.name.trim(),
      role: newMember.role,
      avatar: newMember.avatar,
      color: newMember.color,
      pin_hash: newMember.role === 'child' && newMember.pin ? newMember.pin : null,
    });

    if (!error) {
      showToast(`${newMember.name} tillagd!`);
      setNewMember({ name: '', role: 'child', avatar: '😀', color: '#3B82F6', pin: '' });
      setShowAddMember(false);
      if (onUpdate) onUpdate();
      loadSettings();
    }
    setSaving(false);
  }

  // --- Allowance rules ---
  function getRuleForChild(childId) {
    return allowanceRules.find(r => r.member_id === childId);
  }

  async function saveAllowance(childId, baseAmount, payday) {
    setSaving(true);
    const existing = getRuleForChild(childId);
    const amountOre = Math.round(Number(baseAmount) * 100);

    if (existing) {
      await supabase.from('allowance_rules')
        .update({ base_amount: amountOre, payday })
        .eq('id', existing.id);
    } else {
      await supabase.from('allowance_rules').insert({
        family_id: familyId,
        member_id: childId,
        base_amount: amountOre,
        payday,
      });
    }

    showToast('Veckopeng sparad!');
    setSaving(false);
    loadSettings();
  }

  function updateEditMember(id, field, value) {
    setEditMembers(prev => prev.map(m => m.id === id ? { ...m, [field]: value } : m));
  }

  const children = editMembers.filter(m => m.role === 'child');
  const parents = editMembers.filter(m => m.role === 'admin' || m.role === 'parent');

  if (loading) {
    return (
      <div style={styles.page}>
        <p style={styles.loadingText}>Laddar...</p>
      </div>
    );
  }

  return (
    <div style={styles.page}>
      {/* Toast */}
      {toast && <div style={styles.toast}>{toast}</div>}

      <div style={styles.header}>
        <h1 style={styles.pageTitle}>Inställningar</h1>
      </div>

      <div style={styles.content}>
        {/* Family name */}
        <div style={styles.card}>
          <h2 style={styles.cardTitle}><Home size={18} /> Familj</h2>
          <label style={styles.label}>Familjenamn</label>
          <div style={styles.row}>
            <input
              type="text"
              value={familyName}
              onChange={e => setFamilyName(e.target.value)}
              style={{ ...S.input, flex: 1 }}
            />
            <button
              onClick={saveFamilyName}
              disabled={saving}
              style={{ ...S.button, ...S.buttonPrimary, padding: '10px 16px' }}
            >
              <Save size={16} />
            </button>
          </div>
        </div>

        {/* Approval setting */}
        {isParent && (
          <div style={styles.card}>
            <h2 style={styles.cardTitle}><Shield size={18} /> Regler</h2>
            <div style={styles.settingRow}>
              <div style={styles.settingInfo}>
                <span style={styles.settingLabel}>Godkännande av sysslor</span>
                <span style={styles.settingDesc}>
                  {familySettings.require_approval
                    ? 'Förälder måste godkänna avbockningar'
                    : 'Sysslor godkänns automatiskt'
                  }
                </span>
              </div>
              <button
                onClick={() => toggleSetting('require_approval')}
                style={{
                  ...styles.toggleSwitch,
                  background: familySettings.require_approval ? C.primary : C.border,
                }}
              >
                <div style={{
                  ...styles.toggleKnob,
                  transform: familySettings.require_approval ? 'translateX(22px)' : 'translateX(2px)',
                }} />
              </button>
            </div>
          </div>
        )}

        {/* Members */}
        <div style={styles.card}>
          <div style={styles.cardHeaderRow}>
            <h2 style={styles.cardTitle}><Users size={18} /> Familjemedlemmar</h2>
            {isParent && (
              <button
                onClick={() => setShowAddMember(!showAddMember)}
                style={styles.addBtn}
              >
                <UserPlus size={14} /> Lägg till
              </button>
            )}
          </div>

          {/* Add member form */}
          {showAddMember && (
            <div style={styles.addMemberForm}>
              <input
                type="text"
                placeholder="Namn"
                value={newMember.name}
                onChange={e => setNewMember(prev => ({ ...prev, name: e.target.value }))}
                style={S.input}
                autoFocus
              />
              <div style={styles.row}>
                <select
                  value={newMember.role}
                  onChange={e => setNewMember(prev => ({ ...prev, role: e.target.value }))}
                  style={styles.select}
                >
                  <option value="child">Barn</option>
                  <option value="parent">Förälder</option>
                </select>
                <select
                  value={newMember.avatar}
                  onChange={e => setNewMember(prev => ({ ...prev, avatar: e.target.value }))}
                  style={{ ...styles.select, fontSize: 20, width: 60 }}
                >
                  {AVATARS.map(a => <option key={a} value={a}>{a}</option>)}
                </select>
              </div>
              {newMember.role === 'child' && (
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={4}
                  placeholder="4-siffrig PIN"
                  value={newMember.pin}
                  onChange={e => setNewMember(prev => ({ ...prev, pin: e.target.value.replace(/\D/g, '').slice(0, 4) }))}
                  style={{ ...S.input, width: 140, letterSpacing: 8, textAlign: 'center', fontFamily: 'monospace' }}
                />
              )}
              <div style={styles.colorRow}>
                {MEMBER_COLORS.map(c => (
                  <button
                    key={c}
                    onClick={() => setNewMember(prev => ({ ...prev, color: c }))}
                    style={{
                      ...styles.colorDot,
                      background: c,
                      border: newMember.color === c ? `3px solid ${C.text}` : '3px solid transparent',
                    }}
                  />
                ))}
              </div>
              <button
                onClick={addMember}
                disabled={saving || !newMember.name.trim()}
                style={{
                  ...S.button, ...S.buttonPrimary, width: '100%',
                  opacity: saving || !newMember.name.trim() ? 0.5 : 1,
                }}
              >
                Lägg till medlem
              </button>
            </div>
          )}

          {/* Parents */}
          {parents.length > 0 && (
            <div style={styles.memberSection}>
              <h3 style={styles.memberSectionTitle}>Föräldrar</h3>
              {parents.map(m => (
                <MemberRow
                  key={m.id}
                  m={m}
                  isExpanded={expandedMember === m.id}
                  onToggle={() => setExpandedMember(expandedMember === m.id ? null : m.id)}
                  onUpdate={updateEditMember}
                  onSave={saveMember}
                  onDelete={isAdmin && m.id !== member.id ? deleteMember : null}
                  saving={saving}
                />
              ))}
            </div>
          )}

          {/* Children */}
          {children.length > 0 && (
            <div style={styles.memberSection}>
              <h3 style={styles.memberSectionTitle}>Barn</h3>
              {children.map(m => (
                <MemberRow
                  key={m.id}
                  m={m}
                  isExpanded={expandedMember === m.id}
                  onToggle={() => setExpandedMember(expandedMember === m.id ? null : m.id)}
                  onUpdate={updateEditMember}
                  onSave={saveMember}
                  onDelete={isParent ? deleteMember : null}
                  saving={saving}
                />
              ))}
            </div>
          )}
        </div>

        {/* Allowance rules */}
        {isParent && children.length > 0 && (
          <div style={styles.card}>
            <h2 style={styles.cardTitle}><Coins size={18} /> Veckopeng</h2>
            {children.map(child => (
              <AllowanceRow
                key={child.id}
                child={child}
                rule={getRuleForChild(child.id)}
                onSave={saveAllowance}
                saving={saving}
              />
            ))}
          </div>
        )}

        {/* Logout */}
        <button onClick={onLogout} style={styles.logoutBtn}>
          <LogOut size={16} /> Logga ut
        </button>
      </div>

      <div style={{ height: 80 }} />
    </div>
  );
}

// --- MemberRow component ---
function MemberRow({ m, isExpanded, onToggle, onUpdate, onSave, onDelete, saving }) {
  return (
    <div style={styles.memberCard}>
      <button onClick={onToggle} style={styles.memberHeader}>
        <span style={styles.memberAvatar}>{m.avatar}</span>
        <span style={styles.memberName}>{m.name}</span>
        <span style={styles.memberRole}>
          {m.role === 'admin' ? '👑 Admin' : m.role === 'parent' ? 'Förälder' : 'Barn'}
        </span>
        {isExpanded ? <ChevronUp size={16} color={C.textMuted} /> : <ChevronDown size={16} color={C.textMuted} />}
      </button>

      {isExpanded && (
        <div style={styles.memberExpanded}>
          <label style={styles.label}>Namn</label>
          <input
            type="text"
            value={m.name}
            onChange={e => onUpdate(m.id, 'name', e.target.value)}
            style={S.input}
          />

          <label style={{ ...styles.label, marginTop: 10 }}>Avatar</label>
          <div style={styles.avatarRow}>
            {AVATARS.map(a => (
              <button
                key={a}
                onClick={() => onUpdate(m.id, 'avatar', a)}
                style={{
                  ...styles.avatarBtn,
                  background: m.avatar === a ? C.primaryLight : 'transparent',
                  border: m.avatar === a ? `2px solid ${C.primary}` : '2px solid transparent',
                }}
              >
                {a}
              </button>
            ))}
          </div>

          <label style={{ ...styles.label, marginTop: 10 }}>Färg</label>
          <div style={styles.colorRow}>
            {MEMBER_COLORS.map(c => (
              <button
                key={c}
                onClick={() => onUpdate(m.id, 'color', c)}
                style={{
                  ...styles.colorDot,
                  background: c,
                  border: m.color === c ? `3px solid ${C.text}` : '3px solid transparent',
                }}
              />
            ))}
          </div>

          <div style={styles.memberActions}>
            <button
              onClick={() => onSave(m)}
              disabled={saving}
              style={{ ...S.button, ...S.buttonPrimary, flex: 1 }}
            >
              <Save size={14} /> Spara
            </button>
            {onDelete && (
              <button
                onClick={() => onDelete(m.id, m.name)}
                style={styles.deleteMemberBtn}
              >
                <Trash2 size={14} />
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// --- AllowanceRow component ---
function AllowanceRow({ child, rule, onSave, saving }) {
  const [amount, setAmount] = useState(rule ? (rule.base_amount / 100).toString() : '');
  const [payday, setPayday] = useState(rule ? rule.payday : 6); // Default Sunday

  useEffect(() => {
    if (rule) {
      setAmount((rule.base_amount / 100).toString());
      setPayday(rule.payday);
    }
  }, [rule]);

  return (
    <div style={styles.allowanceCard}>
      <div style={styles.allowanceHeader}>
        <span>{child.avatar} {child.name}</span>
        {rule && <span style={styles.allowanceCurrent}>{formatKr(rule.base_amount)}/vecka</span>}
      </div>
      <div style={styles.row}>
        <div style={{ flex: 1 }}>
          <label style={styles.smallLabel}>Belopp (kr/vecka)</label>
          <input
            type="number"
            value={amount}
            onChange={e => setAmount(e.target.value)}
            placeholder="50"
            min="0"
            style={S.input}
          />
        </div>
        <div style={{ flex: 1 }}>
          <label style={styles.smallLabel}>Utbetalningsdag</label>
          <select
            value={payday}
            onChange={e => setPayday(Number(e.target.value))}
            style={styles.select}
          >
            {WEEKDAY_LABELS.map((d, i) => (
              <option key={i} value={i}>{d}</option>
            ))}
          </select>
        </div>
      </div>
      <button
        onClick={() => onSave(child.id, amount, payday)}
        disabled={saving || !amount}
        style={{
          ...S.button, ...S.buttonPrimary, width: '100%', marginTop: 8,
          opacity: saving || !amount ? 0.5 : 1,
        }}
      >
        <Save size={14} /> Spara veckopeng
      </button>
    </div>
  );
}

const styles = {
  page: { minHeight: '100vh', background: C.bg, fontFamily: F.body },
  header: { padding: '16px 16px 8px' },
  pageTitle: { fontFamily: F.heading, fontSize: F.sizes.xl, fontWeight: F.weights.extra, color: C.text, margin: 0 },
  content: { padding: '0 16px' },
  loadingText: { textAlign: 'center', color: C.textMuted, padding: 32 },
  toast: { position: 'fixed', top: 16, left: '50%', transform: 'translateX(-50%)', background: C.text, color: '#fff', padding: '10px 20px', borderRadius: 12, fontSize: F.sizes.sm, fontWeight: F.weights.bold, fontFamily: F.heading, zIndex: 300, boxShadow: '0 4px 12px rgba(0,0,0,0.2)' },
  card: { background: C.bgCard, borderRadius: 16, padding: 18, marginBottom: 14, border: `1px solid ${C.borderLight}` },
  cardTitle: { fontFamily: F.heading, fontSize: F.sizes.md, fontWeight: F.weights.bold, color: C.text, margin: '0 0 12px', display: 'flex', alignItems: 'center', gap: 8 },
  cardHeaderRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  label: { display: 'block', fontSize: F.sizes.sm, fontWeight: F.weights.semi, color: C.text, marginBottom: 6 },
  smallLabel: { display: 'block', fontSize: F.sizes.xs, fontWeight: F.weights.semi, color: C.textMuted, marginBottom: 4 },
  row: { display: 'flex', gap: 8, alignItems: 'flex-end' },
  select: { width: '100%', padding: '10px 12px', borderRadius: 12, border: `2px solid ${C.border}`, fontSize: F.sizes.sm, fontFamily: F.body, background: C.bgCard, boxSizing: 'border-box' },
  addBtn: { display: 'flex', alignItems: 'center', gap: 4, padding: '6px 12px', borderRadius: 8, border: `1px dashed ${C.primary}`, background: C.primaryLight, color: C.primary, fontSize: F.sizes.xs, fontWeight: F.weights.bold, fontFamily: F.heading, cursor: 'pointer' },
  addMemberForm: { padding: 14, background: C.bg, borderRadius: 12, marginBottom: 12, display: 'flex', flexDirection: 'column', gap: 8 },
  memberSection: { marginTop: 8 },
  memberSectionTitle: { fontFamily: F.heading, fontSize: F.sizes.xs, fontWeight: F.weights.bold, color: C.textMuted, margin: '0 0 6px', textTransform: 'uppercase', letterSpacing: 0.5 },
  memberCard: { background: C.bg, borderRadius: 10, border: `1px solid ${C.borderLight}`, marginBottom: 6, overflow: 'hidden' },
  memberHeader: { display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '10px 12px', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left' },
  memberAvatar: { fontSize: 22 },
  memberName: { flex: 1, fontSize: F.sizes.md, fontWeight: F.weights.semi, color: C.text },
  memberRole: { fontSize: F.sizes.xs, color: C.textMuted },
  memberExpanded: { padding: '0 12px 12px' },
  avatarRow: { display: 'flex', flexWrap: 'wrap', gap: 4 },
  avatarBtn: { width: 36, height: 36, borderRadius: 8, fontSize: 18, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  colorRow: { display: 'flex', gap: 6 },
  colorDot: { width: 28, height: 28, borderRadius: 14, cursor: 'pointer', padding: 0 },
  memberActions: { display: 'flex', gap: 8, marginTop: 12 },
  deleteMemberBtn: { padding: '10px 14px', borderRadius: 12, border: 'none', background: C.errorLight, color: C.error, cursor: 'pointer', display: 'flex', alignItems: 'center' },
  settingRow: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  settingInfo: { flex: 1 },
  settingLabel: { display: 'block', fontSize: F.sizes.sm, fontWeight: F.weights.semi, color: C.text },
  settingDesc: { display: 'block', fontSize: F.sizes.xs, color: C.textMuted, marginTop: 2 },
  toggleSwitch: { width: 48, height: 26, borderRadius: 13, border: 'none', cursor: 'pointer', position: 'relative', flexShrink: 0, transition: 'background 0.2s' },
  toggleKnob: { width: 22, height: 22, borderRadius: 11, background: '#fff', position: 'absolute', top: 2, transition: 'transform 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)' },
  allowanceCard: { padding: 12, background: C.bg, borderRadius: 10, marginBottom: 8, border: `1px solid ${C.borderLight}` },
  allowanceHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, fontSize: F.sizes.sm, fontWeight: F.weights.bold, fontFamily: F.heading, color: C.text },
  allowanceCurrent: { fontSize: F.sizes.xs, color: C.textMuted },
  logoutBtn: { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, width: '100%', padding: '14px 20px', borderRadius: 12, border: 'none', background: C.errorLight, color: C.error, fontSize: F.sizes.md, fontWeight: F.weights.bold, fontFamily: F.heading, cursor: 'pointer', marginTop: 8 },
};
