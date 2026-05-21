// ============================================
// FamTastic — ChoreLibrary (template picker)
// ============================================

import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { X, Search, BookOpen, Star, Zap } from 'lucide-react';
import { C, F, S, DIFFICULTY } from '../data';

const CATEGORIES = [
  { key: 'alla', label: 'Alla', icon: '📋' },
  { key: 'kök', label: 'Kök', icon: '🍽️' },
  { key: 'städ', label: 'Städ', icon: '🧹' },
  { key: 'tvätt', label: 'Tvätt', icon: '👕' },
  { key: 'djur', label: 'Djur', icon: '🐾' },
  { key: 'trädgård', label: 'Trädgård', icon: '🌱' },
  { key: 'läxor', label: 'Läxor', icon: '📚' },
  { key: 'övrigt', label: 'Övrigt', icon: '🔧' },
];

export function ChoreLibrary({ familyId, onSelect, onClose }) {
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('alla');

  useEffect(() => {
    loadTemplates();
  }, [familyId]);

  async function loadTemplates() {
    setLoading(true);
    const { data } = await supabase
      .from('chore_templates')
      .select('*')
      .or(`is_global.eq.true,family_id.eq.${familyId}`)
      .order('category')
      .order('title');
    setTemplates(data || []);
    setLoading(false);
  }

  function filtered() {
    let list = templates;
    if (category !== 'alla') {
      list = list.filter(t => t.category === category);
    }
    if (search.trim()) {
      const q = search.toLowerCase().trim();
      list = list.filter(t =>
        t.title.toLowerCase().includes(q) ||
        (t.category || '').toLowerCase().includes(q)
      );
    }
    return list;
  }

  function handleSelect(template) {
    onSelect({
      title: template.title,
      description: template.description || '',
      icon: template.icon || '📋',
      chore_type: template.chore_type || 'bonus',
      points: template.points || 0,
      difficulty: template.difficulty || 'medium',
    });
  }

  const results = filtered();
  const familyTemplates = results.filter(t => t.family_id === familyId);
  const globalTemplates = results.filter(t => t.is_global);

  return (
    <div style={styles.overlay}>
      <div style={styles.modal}>
        {/* Header */}
        <div style={styles.header}>
          <div style={styles.headerLeft}>
            <BookOpen size={20} color={C.primary} />
            <h2 style={styles.headerTitle}>Sysslo-bibliotek</h2>
          </div>
          <button onClick={onClose} style={styles.closeBtn}>
            <X size={20} color={C.textMuted} />
          </button>
        </div>

        {/* Search */}
        <div style={styles.searchWrap}>
          <Search size={16} color={C.textMuted} style={{ flexShrink: 0 }} />
          <input
            type="text"
            placeholder="Sök sysslor..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={styles.searchInput}
          />
        </div>

        {/* Category pills */}
        <div style={styles.catRow}>
          {CATEGORIES.map(cat => (
            <button
              key={cat.key}
              onClick={() => setCategory(cat.key)}
              style={{
                ...styles.catPill,
                background: category === cat.key ? C.primary : C.bgCard,
                color: category === cat.key ? '#fff' : C.text,
                borderColor: category === cat.key ? C.primary : C.border,
              }}
            >
              {cat.icon} {cat.label}
            </button>
          ))}
        </div>

        {/* Template list */}
        <div style={styles.body}>
          {loading ? (
            <p style={styles.loadingText}>Laddar bibliotek...</p>
          ) : results.length === 0 ? (
            <div style={S.emptyState}>
              <span style={{ fontSize: 40 }}>🔍</span>
              <p style={styles.emptyTitle}>Inga sysslor hittades</p>
              <p style={styles.emptyText}>Prova ett annat sökord eller kategori.</p>
            </div>
          ) : (
            <>
              {/* Family's own templates first */}
              {familyTemplates.length > 0 && (
                <>
                  <p style={S.sectionLabel}>Familjens egna</p>
                  {familyTemplates.map(t => (
                    <TemplateCard key={t.id} template={t} onSelect={() => handleSelect(t)} />
                  ))}
                </>
              )}

              {/* Global templates */}
              {globalTemplates.length > 0 && (
                <>
                  <p style={{ ...S.sectionLabel, marginTop: familyTemplates.length > 0 ? 16 : 0 }}>
                    Förslag
                  </p>
                  {globalTemplates.map(t => (
                    <TemplateCard key={t.id} template={t} onSelect={() => handleSelect(t)} />
                  ))}
                </>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// --- Template card component ---
function TemplateCard({ template, onSelect }) {
  const diff = DIFFICULTY[template.difficulty] || DIFFICULTY.medium;
  const isBase = template.chore_type === 'base';

  return (
    <button onClick={onSelect} style={styles.card}>
      <div style={{
        ...styles.cardEmoji,
        background: isBase ? C.secondaryLight : C.primaryLight,
      }}>
        <span style={{ fontSize: 22 }}>{template.icon || '📋'}</span>
      </div>
      <div style={styles.cardContent}>
        <span style={styles.cardTitle}>{template.title}</span>
        <div style={styles.cardBadges}>
          {isBase ? (
            <span style={{ ...styles.cardBadge, background: C.secondaryLight, color: C.secondaryDark }}>
              Grund
            </span>
          ) : (
            <span style={{ ...styles.cardBadge, background: C.primaryLight, color: C.primaryDark }}>
              <Zap size={10} /> Bonus
            </span>
          )}
          {!isBase && template.points > 0 && (
            <span style={{ ...styles.cardBadge, background: C.accentLight, color: '#92400E' }}>
              <Star size={10} /> {template.points} kr
            </span>
          )}
          <span style={{ ...styles.cardBadge, background: diff.bg, color: diff.color === C.accent ? '#92400E' : diff.color }}>
            {diff.emoji}
          </span>
        </div>
      </div>
      <span style={styles.cardArrow}>+</span>
    </button>
  );
}

const styles = {
  overlay: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(0,0,0,0.4)',
    display: 'flex',
    alignItems: 'flex-end',
    justifyContent: 'center',
    zIndex: 250,
    padding: 0,
  },
  modal: {
    width: '100%',
    maxWidth: 500,
    maxHeight: '85vh',
    background: C.bg,
    borderRadius: '20px 20px 0 0',
    display: 'flex',
    flexDirection: 'column',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '16px 20px',
    borderBottom: `1px solid ${C.borderLight}`,
    background: C.bgCard,
    borderRadius: '20px 20px 0 0',
  },
  headerLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  },
  headerTitle: {
    fontFamily: F.heading,
    fontSize: F.sizes.lg,
    fontWeight: F.weights.bold,
    color: C.text,
    margin: 0,
  },
  closeBtn: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    padding: 4,
    minHeight: 44,
    minWidth: 44,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchWrap: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    margin: '12px 16px 0',
    padding: '10px 14px',
    borderRadius: 12,
    border: `1.5px solid ${C.border}`,
    background: C.bgCard,
  },
  searchInput: {
    flex: 1,
    border: 'none',
    outline: 'none',
    fontSize: F.sizes.md,
    fontFamily: F.body,
    background: 'transparent',
    color: C.text,
  },
  catRow: {
    display: 'flex',
    gap: 6,
    padding: '12px 16px',
    overflowX: 'auto',
  },
  catPill: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 4,
    padding: '6px 12px',
    borderRadius: 99,
    border: '1.5px solid',
    fontSize: F.sizes.xs,
    fontWeight: F.weights.bold,
    fontFamily: F.heading,
    cursor: 'pointer',
    whiteSpace: 'nowrap',
    minHeight: 36,
  },
  body: {
    padding: '0 16px 16px',
    overflowY: 'auto',
    flex: 1,
  },
  loadingText: {
    textAlign: 'center',
    color: C.textMuted,
    padding: 24,
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
  // --- Template card ---
  card: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    width: '100%',
    padding: '12px 14px',
    background: C.bgCard,
    borderRadius: 14,
    border: `1.5px solid ${C.borderLight}`,
    marginBottom: 8,
    cursor: 'pointer',
    textAlign: 'left',
    transition: 'background 0.15s',
    boxShadow: '0 1px 4px rgba(0,0,0,0.03)',
  },
  cardEmoji: {
    width: 44,
    height: 44,
    borderRadius: 12,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  cardContent: {
    flex: 1,
    minWidth: 0,
  },
  cardTitle: {
    display: 'block',
    fontSize: F.sizes.md,
    fontWeight: F.weights.bold,
    fontFamily: F.heading,
    color: C.text,
    marginBottom: 4,
  },
  cardBadges: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: 4,
  },
  cardBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 3,
    padding: '2px 8px',
    borderRadius: 99,
    fontSize: F.sizes.xs,
    fontWeight: F.weights.bold,
    fontFamily: F.heading,
  },
  cardArrow: {
    fontSize: F.sizes.xl,
    fontWeight: F.weights.bold,
    color: C.primary,
    flexShrink: 0,
    width: 32,
    height: 32,
    borderRadius: 16,
    background: C.primaryLight,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
};
