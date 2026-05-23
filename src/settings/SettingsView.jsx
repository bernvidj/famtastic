// ============================================
// FamTastic — SettingsView (main settings page)
// ============================================

import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { C, F, S } from '../data';
import { MemberRow } from './MemberRow';
import { AllowanceRow } from './AllowanceRow';
import { Save, UserPlus, LogOut } from 'lucide-react';

const AVATARS = ['😀','😎','🦊','🐻','🦄','🌟','🎨','⚽','🎵','🌈','🍕','🐱','🐶','🦋','🚀','💪'];
const MEMBER_COLORS = C.memberColors;


// ── App-ikon (inline SVG, identisk med Login/FamilySetup) ──
function AppIcon({ size = 44 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
      <rect width="512" height="512" rx="115" fill="#FFE8C2"/>
      <path d="M 200 40 Q 360 0, 410 140 Q 450 260, 320 305 Q 185 345, 130 225 Q 80 115, 200 40 Z" fill="#3CB4A6"/>
      <path d="M 310 80 Q 460 60, 500 200 Q 520 310, 420 360 Q 330 395, 290 300 Q 255 210, 310 80 Z" fill="#A8E6DF"/>
      <path d="M 40 195 Q 115 80, 255 135 Q 355 175, 325 305 Q 295 420, 155 440 Q 25 450, 10 320 Q -5 215, 40 195 Z" fill="#FFA071"/>
      <path d="M 215 250 Q 375 195, 468 318 Q 535 420, 420 478 Q 300 535, 190 468 Q 90 405, 120 318 Q 148 250, 215 250 Z" fill="#FF7A59"/>
      <circle cx="308" cy="375" r="28" fill="rgba(255,255,255,0.9)"/>
    </svg>
  );
}

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

  useEffect(() => { loadSettings(); }, [familyId]);

  async function loadSettings() {
    setLoading(true);
    const [famRes, ruleRes] = await Promise.all([
      supabase.from('families').select('name, settings').eq('id', familyId).maybeSingle(),
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

  async function saveFamilyName() {
    setSaving(true);
    await supabase.from('families').update({ name: familyName.trim() }).eq('id', familyId);
    showToast('Familjenamn sparat!');
    setSaving(false);
  }

  async function toggleSetting(key) {
    const updated = { ...familySettings, [key]: !familySettings[key] };
    setFamilySettings(updated);
    await supabase.from('families').update({ settings: updated }).eq('id', familyId);
    showToast('Inställning sparad!');
  }

  async function toggleFeature(key) {
    const features = familySettings.features || {};
    const updated = {
      ...familySettings,
      features: { ...features, [key]: !features[key] },
    };
    setFamilySettings(updated);
    await supabase.from('families').update({ settings: updated }).eq('id', familyId);
    showToast('Inställning sparad!');
    if (onUpdate) onUpdate();
  }

  function getFeature(key) {
    return !!(familySettings.features || {})[key];
  }

  async function saveMember(m) {
    setSaving(true);
    await supabase.from('family_members')
      .update({ name: m.name, avatar: m.avatar, color: m.color })
      .eq('id', m.id);
    showToast(`${m.name} uppdaterad!`);
    setSaving(false);
    if (onUpdate) onUpdate();
  }

  async function deleteMember(id, name) {
    if (!window.confirm(`Vill du verkligen ta bort ${name}?`)) return;
    await supabase.from('family_members').delete().eq('id', id);
    setEditMembers(prev => prev.filter(m => m.id !== id));
    showToast(`${name} borttagen`);
    if (onUpdate) onUpdate();
  }

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

  async function saveAllowance(childId, baseAmount, payday) {
    setSaving(true);
    const existing = allowanceRules.find(r => r.member_id === childId);
    const amountOre = Math.round(Number(baseAmount) * 100);
    if (existing) {
      await supabase.from('allowance_rules').update({ base_amount: amountOre, payday }).eq('id', existing.id);
    } else {
      await supabase.from('allowance_rules').insert({ family_id: familyId, member_id: childId, base_amount: amountOre, payday });
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

  if (loading) return (
    <div style={styles.page}>
      <p style={styles.loadingText}>Laddar...</p>
    </div>
  );

  return (
    <div style={styles.page}>
      {toast && <div style={styles.toast}>{toast}</div>}

      {/* Header med organiska former */}
      <div style={styles.header}>
        <div style={styles.headerContent}>
          <AppIcon size={40} />
          <div>
            <h1 style={styles.pageTitle}>Inställningar</h1>
            <p style={styles.pageSubtitle}>{familyName || 'Din familj'}</p>
          </div>
        </div>
      </div>

      <div style={styles.content}>
        {/* Family name */}
        <div style={styles.card}>
          <h2 style={styles.cardTitle}>
            <span style={styles.cardIcon}>🏠</span> Familj
          </h2>
          <label style={styles.label}>Familjenamn</label>
          <div style={styles.row}>
            <input type="text" value={familyName} onChange={e => setFamilyName(e.target.value)} style={{ ...S.input, flex: 1 }} />
            <button onClick={saveFamilyName} disabled={saving} style={{ ...S.button, ...S.buttonPrimary, padding: '10px 16px' }}>
              <Save size={16} />
            </button>
          </div>
        </div>

        {/* Regler + Familjeinställningar */}
        {isParent && (
          <div style={styles.card}>
            <h2 style={styles.cardTitle}>
              <span style={styles.cardIcon}>🛡️</span> Regler
            </h2>
            <div style={styles.settingRow}>
              <div style={{ flex: 1 }}>
                <span style={styles.settingLabel}>Godkännande av sysslor</span>
                <span style={styles.settingDesc}>
                  {familySettings.require_approval ? 'Förälder måste godkänna' : 'Godkänns automatiskt'}
                </span>
              </div>
              <button
                onClick={() => toggleSetting('require_approval')}
                style={{ ...styles.toggleSwitch, background: familySettings.require_approval ? C.primary : C.border }}
              >
                <div style={{ ...styles.toggleKnob, transform: familySettings.require_approval ? 'translateX(22px)' : 'translateX(2px)' }} />
              </button>
            </div>
          </div>
        )}

        {isParent && (
          <div style={styles.card}>
            <h2 style={styles.cardTitle}>
              <span style={styles.cardIcon}>👨‍👩‍👧</span> Familjeinställningar
            </h2>

            <div style={styles.settingRow}>
              <div style={{ flex: 1 }}>
                <span style={styles.settingLabel}>Veckoöverlämning</span>
                <span style={styles.settingDesc}>
                  {familySettings.weekly_handover
                    ? 'Aktiverad — veckosummering vid byte'
                    : 'Inaktiverad'}
                </span>
              </div>
              <button
                onClick={() => toggleSetting('weekly_handover')}
                style={{ ...styles.toggleSwitch, background: familySettings.weekly_handover ? C.primary : C.border }}
              >
                <div style={{ ...styles.toggleKnob, transform: familySettings.weekly_handover ? 'translateX(22px)' : 'translateX(2px)' }} />
              </button>
            </div>

            <div style={{ height: 1, background: C.borderLight, margin: '10px 0' }} />

            <div style={styles.settingRow}>
              <div style={{ flex: 1 }}>
                <span style={styles.settingLabel}>Delad ekonomi</span>
                <span style={styles.settingDesc}>
                  {familySettings.shared_economy
                    ? 'Aktiverad — båda föräldrar godkänner utbetalningar'
                    : 'Inaktiverad — en förälder hanterar ekonomin'}
                </span>
              </div>
              <button
                onClick={() => toggleSetting('shared_economy')}
                style={{ ...styles.toggleSwitch, background: familySettings.shared_economy ? C.primary : C.border }}
              >
                <div style={{ ...styles.toggleKnob, transform: familySettings.shared_economy ? 'translateX(22px)' : 'translateX(2px)' }} />
              </button>
            </div>
          </div>
        )}

        {/* Members */}
        <div style={styles.card}>
          <div style={styles.cardHeaderRow}>
            <h2 style={styles.cardTitle}>
              <span style={styles.cardIcon}>👨‍👩‍👧‍👦</span> Medlemmar
            </h2>
            {isParent && (
              <button onClick={() => setShowAddMember(!showAddMember)} style={styles.addBtn}>
                <UserPlus size={14} /> Lägg till
              </button>
            )}
          </div>

          {showAddMember && (
            <div style={styles.addForm}>
              <input type="text" placeholder="Namn" value={newMember.name} onChange={e => setNewMember(p => ({ ...p, name: e.target.value }))} style={S.input} autoFocus />
              <div style={styles.row}>
                <select value={newMember.role} onChange={e => setNewMember(p => ({ ...p, role: e.target.value }))} style={styles.select}>
                  <option value="child">Barn</option>
                  <option value="parent">Förälder</option>
                </select>
                <select value={newMember.avatar} onChange={e => setNewMember(p => ({ ...p, avatar: e.target.value }))} style={{ ...styles.select, fontSize: 20, width: 60 }}>
                  {AVATARS.map(a => <option key={a} value={a}>{a}</option>)}
                </select>
              </div>
              {newMember.role === 'child' && (
                <input type="text" inputMode="numeric" maxLength={4} placeholder="4-siffrig PIN" value={newMember.pin}
                  onChange={e => setNewMember(p => ({ ...p, pin: e.target.value.replace(/\D/g, '').slice(0, 4) }))}
                  style={{ ...S.input, width: 140, letterSpacing: 8, textAlign: 'center', fontFamily: 'monospace' }} />
              )}
              <div style={styles.colorRow}>
                {MEMBER_COLORS.map(c => (
                  <button key={c} onClick={() => setNewMember(p => ({ ...p, color: c }))}
                    style={{ ...styles.colorDot, background: c, border: newMember.color === c ? `3px solid ${C.text}` : '3px solid transparent' }} />
                ))}
              </div>
              <button onClick={addMember} disabled={saving || !newMember.name.trim()}
                style={{ ...S.button, ...S.buttonPrimary, width: '100%', opacity: saving || !newMember.name.trim() ? 0.5 : 1 }}>
                Lägg till medlem
              </button>
            </div>
          )}

          {parents.length > 0 && (
            <>
              <h3 style={styles.sectionLabel}>Föräldrar</h3>
              {parents.map(m => (
                <MemberRow key={m.id} m={m} isExpanded={expandedMember === m.id}
                  onToggle={() => setExpandedMember(expandedMember === m.id ? null : m.id)}
                  onUpdate={updateEditMember} onSave={saveMember}
                  onDelete={isAdmin && m.id !== member.id ? deleteMember : null} saving={saving} />
              ))}
            </>
          )}
          {children.length > 0 && (
            <>
              <h3 style={styles.sectionLabel}>Barn</h3>
              {children.map(m => (
                <MemberRow key={m.id} m={m} isExpanded={expandedMember === m.id}
                  onToggle={() => setExpandedMember(expandedMember === m.id ? null : m.id)}
                  onUpdate={updateEditMember} onSave={saveMember}
                  onDelete={isParent ? deleteMember : null} saving={saving} />
              ))}
            </>
          )}
        </div>

        {/* Allowance */}
        {isParent && children.length > 0 && (
          <div style={styles.card}>
            <h2 style={styles.cardTitle}>
              <span style={styles.cardIcon}>🪙</span> Veckopeng
            </h2>
            {children.map(child => (
              <AllowanceRow key={child.id} child={child}
                rule={allowanceRules.find(r => r.member_id === child.id)}
                onSave={saveAllowance} saving={saving} />
            ))}
          </div>
        )}

        {/* Funktioner */}
        {isParent && (
          <div style={styles.card}>
            <h2 style={styles.cardTitle}>
              <span style={styles.cardIcon}>🧩</span> Funktioner
            </h2>

            <div style={styles.settingRow}>
              <div style={{ flex: 1 }}>
                <span style={styles.settingLabel}>📍 Familje-GPS</span>
                <span style={styles.settingDesc}>
                  {getFeature('location_sharing')
                    ? 'Aktiverad — "Var är vi?"-fliken visas'
                    : 'Inaktiverad'}
                </span>
              </div>
              <button
                onClick={() => toggleFeature('location_sharing')}
                style={{ ...styles.toggleSwitch, background: getFeature('location_sharing') ? C.secondary : C.border }}
              >
                <div style={{ ...styles.toggleKnob, transform: getFeature('location_sharing') ? 'translateX(22px)' : 'translateX(2px)' }} />
              </button>
            </div>
          </div>
        )}

        <button onClick={onLogout} style={styles.logoutBtn}>
          <LogOut size={16} /> Logga ut
        </button>
      </div>

      <div style={{ height: 80 }} />
    </div>
  );
}

const styles = {
  page: { minHeight: '100vh', background: C.bg, fontFamily: F.body },

  // Header med organiska former
  header: {
    position: 'relative',
    padding: '20px 20px 16px',
    overflow: 'hidden',
    background: '#FFFBF5',
    borderBottom: '1px solid rgba(60,180,166,0.12)',
    marginBottom: 4,
  },
  headerContent: {
    position: 'relative',
    zIndex: 1,
    display: 'flex',
    alignItems: 'center',
    gap: 14,
  },
  pageTitle: {
    fontFamily: F.heading,
    fontSize: F.sizes.xl,
    fontWeight: F.weights.extra,
    color: C.text,
    margin: 0,
    lineHeight: 1.1,
  },
  pageSubtitle: {
    fontFamily: F.body,
    fontSize: F.sizes.sm,
    color: C.secondary,
    margin: '2px 0 0',
    fontWeight: F.weights.semi,
  },

  content: { padding: '12px 16px 0' },
  loadingText: { textAlign: 'center', color: C.textMuted, padding: 32 },
  toast: {
    position: 'fixed', top: 16, left: '50%', transform: 'translateX(-50%)',
    background: C.text, color: '#fff', padding: '10px 20px', borderRadius: 12,
    fontSize: F.sizes.sm, fontWeight: F.weights.bold, fontFamily: F.heading,
    zIndex: 300, boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
  },
  card: {
    background: C.bgCard, borderRadius: 16, padding: 18, marginBottom: 14,
    border: `1px solid ${C.borderLight}`,
    boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
  },
  cardTitle: {
    fontFamily: F.heading, fontSize: F.sizes.md, fontWeight: F.weights.bold,
    color: C.text, margin: '0 0 12px', display: 'flex', alignItems: 'center', gap: 8,
  },
  cardIcon: { fontSize: 18 },
  cardHeaderRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  label: { display: 'block', fontSize: F.sizes.sm, fontWeight: F.weights.semi, color: C.text, marginBottom: 6 },
  row: { display: 'flex', gap: 8, alignItems: 'flex-end' },
  select: {
    width: '100%', padding: '10px 12px', borderRadius: 12,
    border: `2px solid ${C.border}`, fontSize: F.sizes.sm,
    fontFamily: F.body, background: C.bgCard, boxSizing: 'border-box',
  },
  addBtn: {
    display: 'flex', alignItems: 'center', gap: 4, padding: '6px 12px',
    borderRadius: 8, border: `1px dashed ${C.primary}`, background: C.primaryLight,
    color: C.primary, fontSize: F.sizes.xs, fontWeight: F.weights.bold,
    fontFamily: F.heading, cursor: 'pointer',
  },
  addForm: {
    padding: 14, background: C.bg, borderRadius: 12, marginBottom: 12,
    display: 'flex', flexDirection: 'column', gap: 8,
    border: `1px solid ${C.borderLight}`,
  },
  colorRow: { display: 'flex', gap: 6 },
  colorDot: { width: 28, height: 28, borderRadius: 14, cursor: 'pointer', padding: 0 },
  sectionLabel: {
    fontFamily: F.heading, fontSize: F.sizes.xs, fontWeight: F.weights.bold,
    color: C.textMuted, margin: '8px 0 6px', textTransform: 'uppercase', letterSpacing: 0.5,
  },
  settingRow: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  settingLabel: { display: 'block', fontSize: F.sizes.sm, fontWeight: F.weights.semi, color: C.text },
  settingDesc: { display: 'block', fontSize: F.sizes.xs, color: C.textMuted, marginTop: 2 },
  toggleSwitch: {
    width: 48, height: 26, borderRadius: 13, border: 'none', cursor: 'pointer',
    position: 'relative', flexShrink: 0, transition: 'background 0.2s',
  },
  toggleKnob: {
    width: 22, height: 22, borderRadius: 11, background: '#fff',
    position: 'absolute', top: 2, transition: 'transform 0.2s',
    boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
  },
  logoutBtn: {
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
    width: '100%', padding: '14px 20px', borderRadius: 12, border: 'none',
    background: C.errorLight, color: C.error, fontSize: F.sizes.md,
    fontWeight: F.weights.bold, fontFamily: F.heading, cursor: 'pointer', marginTop: 8,
  },
};
