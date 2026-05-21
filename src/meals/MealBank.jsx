// ============================================
// FamTastic — MealBank (recipe list + search)
// Updated: "Lägg till från bibliotek" button
// ============================================

import React, { useState } from 'react';
import { C, F, S, safeArray } from '../data';
import { Search, Star, ExternalLink, BookOpen, Plus } from 'lucide-react';
import { MealLibrary } from './MealLibrary';

export function MealBank({ meals, familyId, memberId, onSelect, onEdit, onAddFromTemplate }) {
  const [search, setSearch] = useState('');
  const [filterTag, setFilterTag] = useState(null);
  const [showLibrary, setShowLibrary] = useState(false);

  // Collect all unique tags
  const allTags = [...new Set(meals.flatMap(m => safeArray(m.tags)))].sort();

  const filtered = meals.filter(m => {
    const matchSearch = !search
      || m.title.toLowerCase().includes(search.toLowerCase())
      || (m.description || '').toLowerCase().includes(search.toLowerCase());
    const matchTag = !filterTag || safeArray(m.tags).includes(filterTag);
    return matchSearch && matchTag;
  });

  function handleTemplateSelect(template) {
    setShowLibrary(false);
    // Pass template data up — parent component saves to meals table
    if (onAddFromTemplate) {
      onAddFromTemplate(template);
    }
  }

  return (
    <div>
      {/* Action buttons row */}
      <div style={styles.actionRow}>
        <button
          onClick={() => setShowLibrary(true)}
          style={styles.libraryBtn}
        >
          <BookOpen size={16} />
          <span>Från bibliotek</span>
        </button>
        {onEdit && (
          <button
            onClick={() => onEdit(null)}
            style={styles.newBtn}
          >
            <Plus size={16} />
            <span>Nytt recept</span>
          </button>
        )}
      </div>

      {/* Search */}
      <div style={styles.searchWrap}>
        <Search size={18} color={C.textMuted} style={styles.searchIcon} />
        <input
          type="text"
          placeholder="Sök recept..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={styles.searchInput}
        />
      </div>

      {/* Tag filter */}
      {allTags.length > 0 && (
        <div style={styles.tagRow}>
          <button
            onClick={() => setFilterTag(null)}
            style={{
              ...styles.tagBtn,
              background: !filterTag ? C.primary : C.bgCard,
              color: !filterTag ? '#fff' : C.text,
            }}
          >
            Alla
          </button>
          {allTags.map(tag => (
            <button
              key={tag}
              onClick={() => setFilterTag(filterTag === tag ? null : tag)}
              style={{
                ...styles.tagBtn,
                background: filterTag === tag ? C.primary : C.bgCard,
                color: filterTag === tag ? '#fff' : C.text,
              }}
            >
              {tag}
            </button>
          ))}
        </div>
      )}

      {/* Meal list */}
      {filtered.length === 0 ? (
        <div style={styles.empty}>
          <span style={{ fontSize: 36 }}>🍽️</span>
          <p style={styles.emptyTitle}>
            {search || filterTag ? 'Inga träffar' : 'Inga recept ännu'}
          </p>
          <p style={styles.emptyText}>
            {search || filterTag
              ? 'Prova ändra din sökning.'
              : 'Lägg till recept från biblioteket eller skapa egna!'
            }
          </p>
          {!search && !filterTag && (
            <button
              onClick={() => setShowLibrary(true)}
              style={styles.emptyLibraryBtn}
            >
              <BookOpen size={16} />
              <span>Öppna receptbiblioteket</span>
            </button>
          )}
        </div>
      ) : (
        filtered.map(meal => (
          <button
            key={meal.id}
            onClick={() => onSelect ? onSelect(meal) : onEdit(meal)}
            style={styles.mealCard}
          >
            <div style={styles.mealRow}>
              <div style={styles.mealContent}>
                <span style={styles.mealTitle}>{meal.title}</span>
                {meal.description && (
                  <span style={styles.mealDesc}>{meal.description}</span>
                )}
                <div style={styles.mealMeta}>
                  {/* Rating */}
                  {meal.rating > 0 && (
                    <span style={styles.mealRating}>
                      {'⭐'.repeat(meal.rating)}
                    </span>
                  )}
                  {/* Tags */}
                  {safeArray(meal.tags).map(tag => (
                    <span key={tag} style={styles.mealTag}>{tag}</span>
                  ))}
                  {/* Ingredients count */}
                  {safeArray(meal.ingredients).length > 0 && (
                    <span style={styles.mealIngCount}>
                      {safeArray(meal.ingredients).length} ingredienser
                    </span>
                  )}
                  {/* External link indicator */}
                  {meal.recipe_url && (
                    <ExternalLink size={12} color={C.textMuted} />
                  )}
                </div>
              </div>
            </div>
          </button>
        ))
      )}

      {/* Library modal */}
      {showLibrary && (
        <MealLibrary
          familyId={familyId}
          onSelect={handleTemplateSelect}
          onClose={() => setShowLibrary(false)}
        />
      )}
    </div>
  );
}

const styles = {
  actionRow: {
    display: 'flex',
    gap: 8,
    marginBottom: 12,
  },
  libraryBtn: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    padding: '10px 14px',
    borderRadius: 12,
    border: `2px dashed ${C.primary}`,
    background: C.primaryLight || '#FFF0E0',
    color: C.primary,
    fontSize: F.sizes.sm,
    fontWeight: F.weights.bold,
    fontFamily: F.heading,
    cursor: 'pointer',
  },
  newBtn: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    padding: '10px 14px',
    borderRadius: 12,
    border: `1.5px solid ${C.border}`,
    background: C.bgCard,
    color: C.text,
    fontSize: F.sizes.sm,
    fontWeight: F.weights.semi,
    fontFamily: F.heading,
    cursor: 'pointer',
  },
  searchWrap: {
    position: 'relative',
    marginBottom: 10,
  },
  searchIcon: {
    position: 'absolute',
    left: 14,
    top: '50%',
    transform: 'translateY(-50%)',
    pointerEvents: 'none',
  },
  searchInput: {
    ...S.input,
    paddingLeft: 42,
  },
  tagRow: {
    display: 'flex',
    gap: 6,
    marginBottom: 12,
    overflowX: 'auto',
    paddingBottom: 4,
  },
  tagBtn: {
    padding: '5px 10px',
    borderRadius: 99,
    border: `1.5px solid ${C.border}`,
    fontSize: F.sizes.xs,
    fontWeight: F.weights.bold,
    fontFamily: F.heading,
    cursor: 'pointer',
    whiteSpace: 'nowrap',
  },
  mealCard: {
    display: 'block',
    width: '100%',
    padding: '14px 16px',
    background: C.bgCard,
    borderRadius: 16,
    border: `1.5px solid ${C.border}`,
    marginBottom: 8,
    cursor: 'pointer',
    textAlign: 'left',
  },
  mealRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
  },
  mealContent: {
    flex: 1,
    minWidth: 0,
  },
  mealTitle: {
    display: 'block',
    fontSize: F.sizes.md,
    fontWeight: F.weights.bold,
    fontFamily: F.heading,
    color: C.text,
    marginBottom: 4,
  },
  mealDesc: {
    display: 'block',
    fontSize: F.sizes.sm,
    color: C.textMuted,
    marginBottom: 6,
  },
  mealMeta: {
    display: 'flex',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 6,
  },
  mealRating: {
    fontSize: 12,
  },
  mealTag: {
    padding: '2px 8px',
    borderRadius: 99,
    background: C.primaryLight || '#FFF0E0',
    color: C.primary,
    fontSize: F.sizes.xs,
    fontWeight: F.weights.bold,
  },
  mealIngCount: {
    fontSize: F.sizes.xs,
    color: C.textMuted,
  },
  empty: {
    textAlign: 'center',
    padding: '32px 20px',
  },
  emptyTitle: {
    fontFamily: F.heading,
    fontSize: F.sizes.lg,
    fontWeight: F.weights.bold,
    color: C.text,
    margin: '10px 0 4px',
  },
  emptyText: {
    fontSize: F.sizes.sm,
    color: C.textMuted,
    margin: '0 0 16px',
  },
  emptyLibraryBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    padding: '10px 20px',
    borderRadius: 12,
    border: 'none',
    background: C.primary,
    color: '#fff',
    fontSize: F.sizes.sm,
    fontWeight: F.weights.bold,
    fontFamily: F.heading,
    cursor: 'pointer',
  },
};
