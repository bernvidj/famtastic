// ============================================
// FamTastic — MealLibrary (recipe template picker)
// Same pattern as ChoreLibrary but for meals
// ============================================

import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { X, Search, BookOpen, ChefHat } from 'lucide-react';
import { C, F, S, safeArray } from '../data';

const CATEGORIES = [
  { key: 'alla', label: 'Alla', icon: '📋' },
  { key: 'snabbt', label: 'Snabbt', icon: '🍳' },
  { key: 'husmanskost', label: 'Husmanskost', icon: '🥘' },
  { key: 'helg', label: 'Helg & mys', icon: '🍕' },
  { key: 'vegetariskt', label: 'Vegetariskt', icon: '🥗' },
  { key: 'barnfavorit', label: 'Barnfavoriter', icon: '🧒' },
];

export function MealLibrary({ familyId, onSelect, onClose }) {
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('alla');

  useEffect(() => {
    loadTemplates();
  }, [familyId]);

  async function loadTemplates() {
    setLoading(true);
    // Load global + family-specific templates
    let query = supabase
      .from('meal_templates')
      .select('*')
      .order('category')
      .order('title');

    if (familyId) {
      query = query.or(`is_global.eq.true,family_id.eq.${familyId}`);
    } else {
      query = query.eq('is_global', true);
    }

    const { data } = await query;
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
        (t.description || '').toLowerCase().includes(q) ||
        safeArray(t.tags).some(tag => tag.toLowerCase().includes(q)) ||
        safeArray(t.ingredients).some(ing =>
          (ing.name || '').toLowerCase().includes(q)
        )
      );
    }
    return list;
  }

  function handleSelect(template) {
    // Convert template to meal format for saving
    onSelect({
      title: template.title,
      description: template.description || '',
      tags: safeArray(template.tags),
      ingredients: safeArray(template.ingredients),
      rating: 0,
      recipe_url: template.recipe_url || '',
      recipe_notes: '',
    });
  }

  const results = filtered();
  const familyTemplates = results.filter(t => !t.is_global);
  const globalTemplates = results.filter(t => t.is_global);

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.modal} onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div style={styles.header}>
          <div style={styles.headerLeft}>
            <BookOpen size={20} color={C.primary} />
            <span style={styles.headerTitle}>Receptbibliotek</span>
          </div>
          <button onClick={onClose} style={styles.closeBtn}>
            <X size={20} />
          </button>
        </div>

        {/* Search */}
        <div style={styles.searchWrap}>
          <Search size={16} color={C.textMuted} style={styles.searchIcon} />
          <input
            type="text"
            placeholder="Sök recept eller ingrediens..."
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
                border: `1.5px solid ${category === cat.key ? C.primary : C.border}`,
              }}
            >
              <span>{cat.icon}</span>
              <span>{cat.label}</span>
            </button>
          ))}
        </div>

        {/* Results */}
        <div style={styles.list}>
          {loading ? (
            <div style={styles.empty}>
              <span style={{ fontSize: 28 }}>⏳</span>
              <p style={styles.emptyText}>Laddar recept...</p>
            </div>
          ) : results.length === 0 ? (
            <div style={styles.empty}>
              <span style={{ fontSize: 36 }}>🔍</span>
              <p style={styles.emptyTitle}>Inga träffar</p>
              <p style={styles.emptyText}>Prova ändra sökning eller kategori.</p>
            </div>
          ) : (
            <>
              {/* Family-saved templates first */}
              {familyTemplates.length > 0 && (
                <>
                  <div style={styles.sectionLabel}>⭐ Era sparade recept</div>
                  {familyTemplates.map(t => (
                    <TemplateCard key={t.id} template={t} onSelect={handleSelect} />
                  ))}
                </>
              )}

              {/* Global templates */}
              {globalTemplates.length > 0 && (
                <>
                  {familyTemplates.length > 0 && (
                    <div style={styles.sectionLabel}>📚 Alla recept</div>
                  )}
                  {globalTemplates.map(t => (
                    <TemplateCard key={t.id} template={t} onSelect={handleSelect} />
                  ))}
                </>
              )}
            </>
          )}
        </div>

        {/* Count */}
        <div style={styles.footer}>
          <span style={styles.footerText}>
            {results.length} recept {category !== 'alla' ? `i "${CATEGORIES.find(c => c.key === category)?.label}"` : ''}
          </span>
        </div>
      </div>
    </div>
  );
}

// -- Template card sub-component --
function TemplateCard({ template, onSelect }) {
  const [expanded, setExpanded] = useState(false);
  const ingredients = safeArray(template.ingredients);
  const tags = safeArray(template.tags);
  const catObj = CATEGORIES.find(c => c.key === template.category);

  return (
    <div style={styles.card}>
      <button
        style={styles.cardMain}
        onClick={() => setExpanded(!expanded)}
      >
        <div style={styles.cardIcon}>
          <span style={{ fontSize: 28 }}>{template.icon || '🍽️'}</span>
        </div>
        <div style={styles.cardContent}>
          <span style={styles.cardTitle}>{template.title}</span>
          {template.description && (
            <span style={styles.cardDesc}>{template.description}</span>
          )}
          <div style={styles.cardMeta}>
            {catObj && (
              <span style={styles.metaPill}>
                {catObj.icon} {catObj.label}
              </span>
            )}
            {ingredients.length > 0 && (
              <span style={styles.metaPill}>
                🛒 {ingredients.length} ingredienser
              </span>
            )}
            {template.servings && (
              <span style={styles.metaPill}>
                👤 {template.servings} pers
              </span>
            )}
          </div>
          {tags.length > 0 && (
            <div style={styles.tagRow2}>
              {tags.map(tag => (
                <span key={tag} style={styles.tag}>{tag}</span>
              ))}
            </div>
          )}
        </div>
      </button>

      {/* Expanded: show ingredients + add button */}
      {expanded && (
        <div style={styles.expandedArea}>
          {ingredients.length > 0 && (
            <div style={styles.ingList}>
              <span style={styles.ingTitle}>Ingredienser ({template.servings || 4} pers):</span>
              {ingredients.map((ing, i) => (
                <span key={i} style={styles.ingItem}>
                  {ing.amount && `${ing.amount} ${ing.unit || ''} `.trim()}{ing.name}
                </span>
              ))}
            </div>
          )}
          <button
            style={styles.addBtn}
            onClick={(e) => { e.stopPropagation(); onSelect(template); }}
          >
            ✨ Lägg till i receptbanken
          </button>
        </div>
      )}
    </div>
  );
}

// -- Styles --
const styles = {
  overlay: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(0,0,0,0.5)',
    zIndex: 1000,
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'flex-end',
  },
  modal: {
    width: '100%',
    maxWidth: 480,
    maxHeight: '90vh',
    background: C.bg,
    borderRadius: '20px 20px 0 0',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '16px 20px 12px',
    borderBottom: `1px solid ${C.borderLight}`,
  },
  headerLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  },
  headerTitle: {
    fontSize: F.sizes.lg,
    fontWeight: F.weights.bold,
    fontFamily: F.heading,
    color: C.text,
  },
  closeBtn: {
    background: 'none',
    border: 'none',
    padding: 6,
    cursor: 'pointer',
    color: C.textMuted,
    borderRadius: 8,
  },
  searchWrap: {
    position: 'relative',
    margin: '12px 20px 8px',
  },
  searchIcon: {
    position: 'absolute',
    left: 12,
    top: '50%',
    transform: 'translateY(-50%)',
  },
  searchInput: {
    width: '100%',
    padding: '10px 12px 10px 36px',
    borderRadius: 12,
    border: `2px solid ${C.border}`,
    fontSize: F.sizes.sm,
    fontFamily: F.body,
    outline: 'none',
    boxSizing: 'border-box',
    background: C.bgCard,
  },
  catRow: {
    display: 'flex',
    gap: 6,
    padding: '8px 20px 12px',
    overflowX: 'auto',
    WebkitOverflowScrolling: 'touch',
  },
  catPill: {
    display: 'flex',
    alignItems: 'center',
    gap: 4,
    padding: '6px 12px',
    borderRadius: 99,
    fontSize: F.sizes.xs,
    fontWeight: F.weights.semi,
    fontFamily: F.body,
    cursor: 'pointer',
    whiteSpace: 'nowrap',
    flexShrink: 0,
  },
  list: {
    flex: 1,
    overflowY: 'auto',
    padding: '0 20px 16px',
  },
  sectionLabel: {
    fontSize: F.sizes.xs,
    fontWeight: F.weights.bold,
    fontFamily: F.heading,
    color: C.textMuted,
    padding: '12px 0 6px',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  card: {
    background: C.bgCard,
    borderRadius: 16,
    border: `1.5px solid ${C.border}`,
    marginBottom: 8,
    overflow: 'hidden',
  },
  cardMain: {
    display: 'flex',
    gap: 12,
    padding: '12px 14px',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    width: '100%',
    textAlign: 'left',
  },
  cardIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    background: C.bg,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  cardContent: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    gap: 2,
    minWidth: 0,
  },
  cardTitle: {
    fontSize: F.sizes.md,
    fontWeight: F.weights.bold,
    fontFamily: F.heading,
    color: C.text,
  },
  cardDesc: {
    fontSize: F.sizes.xs,
    color: C.textMuted,
    lineHeight: 1.3,
  },
  cardMeta: {
    display: 'flex',
    gap: 6,
    flexWrap: 'wrap',
    marginTop: 4,
  },
  metaPill: {
    fontSize: 11,
    padding: '2px 8px',
    borderRadius: 99,
    background: C.bg,
    color: C.textMuted,
    whiteSpace: 'nowrap',
  },
  tagRow2: {
    display: 'flex',
    gap: 4,
    flexWrap: 'wrap',
    marginTop: 4,
  },
  tag: {
    fontSize: 10,
    padding: '2px 6px',
    borderRadius: 99,
    background: C.primaryLight || '#FFF0E0',
    color: C.primary,
    fontWeight: F.weights.semi,
  },
  expandedArea: {
    padding: '0 14px 14px',
    borderTop: `1px solid ${C.borderLight}`,
  },
  ingList: {
    display: 'flex',
    flexDirection: 'column',
    gap: 2,
    padding: '10px 0 12px',
  },
  ingTitle: {
    fontSize: F.sizes.xs,
    fontWeight: F.weights.bold,
    color: C.text,
    marginBottom: 4,
  },
  ingItem: {
    fontSize: F.sizes.xs,
    color: C.textMuted,
    lineHeight: 1.4,
    paddingLeft: 8,
  },
  addBtn: {
    width: '100%',
    padding: '10px 16px',
    borderRadius: 12,
    border: 'none',
    background: C.primary,
    color: '#fff',
    fontSize: F.sizes.sm,
    fontWeight: F.weights.bold,
    fontFamily: F.heading,
    cursor: 'pointer',
  },
  empty: {
    textAlign: 'center',
    padding: '40px 20px',
  },
  emptyTitle: {
    fontSize: F.sizes.md,
    fontWeight: F.weights.bold,
    color: C.text,
    margin: '8px 0 4px',
  },
  emptyText: {
    fontSize: F.sizes.sm,
    color: C.textMuted,
  },
  footer: {
    padding: '10px 20px',
    borderTop: `1px solid ${C.borderLight}`,
    textAlign: 'center',
  },
  footerText: {
    fontSize: F.sizes.xs,
    color: C.textMuted,
  },
};
