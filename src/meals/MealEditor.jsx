// ============================================
// FamTastic — MealEditor (create/edit recipe)
// ============================================

import React, { useState, useEffect } from 'react';
import { X, Save, Trash2, Plus, Minus } from 'lucide-react';
import { C, F, S } from '../data';

const TAGS = ['Snabb', 'Vegetarisk', 'Favorit', 'Barnvänlig', 'Helg', 'Lunch', 'Hälsosam', 'Grillat'];
const ICONS = ['🍝','🌮','🍕','🥗','🍲','🍛','🐟','🥩','🍜','🍱','🥘','🫕','🍔','🌯','🥪','🍳'];

const EMPTY = {
  title: '',
  description: '',
  recipe_url: '',
  recipe_notes: '',
  tags: [],
  ingredients: [],
  rating: 0,
};

const EMPTY_INGREDIENT = { name: '', amount: '', unit: '' };

export function MealEditor({ meal, familyId, memberId, onSave, onDelete, onClose }) {
  const [form, setForm] = useState(EMPTY);

  useEffect(() => {
    if (meal) {
      setForm({
        title: meal.title || '',
        description: meal.description || '',
        recipe_url: meal.recipe_url || '',
        recipe_notes: meal.recipe_notes || '',
        tags: Array.isArray(meal.tags) ? meal.tags : [],
        ingredients: Array.isArray(meal.ingredients) && meal.ingredients.length > 0
          ? meal.ingredients
          : [{ ...EMPTY_INGREDIENT }],
        rating: meal.rating || 0,
      });
    } else {
      setForm({ ...EMPTY, ingredients: [{ ...EMPTY_INGREDIENT }] });
    }
  }, [meal]);

  function set(field, value) {
    setForm(prev => ({ ...prev, [field]: value }));
  }

  function toggleTag(tag) {
    setForm(prev => ({
      ...prev,
      tags: prev.tags.includes(tag)
        ? prev.tags.filter(t => t !== tag)
        : [...prev.tags, tag],
    }));
  }

  function updateIngredient(index, field, value) {
    setForm(prev => ({
      ...prev,
      ingredients: prev.ingredients.map((ing, i) =>
        i === index ? { ...ing, [field]: value } : ing
      ),
    }));
  }

  function addIngredient() {
    setForm(prev => ({
      ...prev,
      ingredients: [...prev.ingredients, { ...EMPTY_INGREDIENT }],
    }));
  }

  function removeIngredient(index) {
    setForm(prev => ({
      ...prev,
      ingredients: prev.ingredients.filter((_, i) => i !== index),
    }));
  }

  function handleSubmit() {
    if (!form.title.trim()) return;
    const data = {
      family_id: familyId,
      title: form.title.trim(),
      description: form.description.trim() || null,
      recipe_url: form.recipe_url.trim() || null,
      recipe_notes: form.recipe_notes.trim() || null,
      tags: form.tags,
      ingredients: form.ingredients.filter(i => i.name.trim()),
      rating: form.rating || null,
      created_by: memberId,
    };
    onSave(data);
  }

  return (
    <div style={styles.overlay}>
      <div style={styles.modal}>
        {/* Header */}
        <div style={styles.header}>
          <h2 style={styles.headerTitle}>
            {meal ? 'Redigera måltid' : 'Ny måltid'}
          </h2>
          <button onClick={onClose} style={styles.closeBtn}>
            <X size={20} color={C.textMuted} />
          </button>
        </div>

        <div style={styles.body}>
          {/* Title */}
          <label style={styles.label}>Namn</label>
          <input
            type="text"
            placeholder="T.ex. Tacos, Pasta carbonara"
            value={form.title}
            onChange={e => set('title', e.target.value)}
            style={S.input}
            autoFocus
          />

          {/* Description */}
          <label style={{ ...styles.label, marginTop: 14 }}>Beskrivning (valfritt)</label>
          <input
            type="text"
            placeholder="Kort beskrivning..."
            value={form.description}
            onChange={e => set('description', e.target.value)}
            style={S.input}
          />

          {/* Tags */}
          <label style={{ ...styles.label, marginTop: 14 }}>Taggar</label>
          <div style={styles.tagRow}>
            {TAGS.map(tag => (
              <button
                key={tag}
                onClick={() => toggleTag(tag)}
                style={{
                  ...styles.tagBtn,
                  background: form.tags.includes(tag) ? C.primary : C.bgCard,
                  color: form.tags.includes(tag) ? '#fff' : C.text,
                  border: form.tags.includes(tag) ? `2px solid ${C.primary}` : `2px solid ${C.border}`,
                }}
              >
                {tag}
              </button>
            ))}
          </div>

          {/* Rating */}
          <label style={{ ...styles.label, marginTop: 14 }}>Betyg</label>
          <div style={styles.ratingRow}>
            {[1, 2, 3, 4, 5].map(star => (
              <button
                key={star}
                onClick={() => set('rating', form.rating === star ? 0 : star)}
                style={styles.starBtn}
              >
                <span style={{ fontSize: 24 }}>
                  {star <= form.rating ? '⭐' : '☆'}
                </span>
              </button>
            ))}
          </div>

          {/* Ingredients */}
          <label style={{ ...styles.label, marginTop: 14 }}>Ingredienser</label>
          {form.ingredients.map((ing, i) => (
            <div key={i} style={styles.ingredientRow}>
              <input
                type="text"
                placeholder="Ingrediens"
                value={ing.name}
                onChange={e => updateIngredient(i, 'name', e.target.value)}
                style={{ ...styles.ingredientInput, flex: 2 }}
              />
              <input
                type="text"
                placeholder="Mängd"
                value={ing.amount}
                onChange={e => updateIngredient(i, 'amount', e.target.value)}
                style={{ ...styles.ingredientInput, flex: 1 }}
              />
              <input
                type="text"
                placeholder="Enhet"
                value={ing.unit}
                onChange={e => updateIngredient(i, 'unit', e.target.value)}
                style={{ ...styles.ingredientInput, flex: 1 }}
              />
              {form.ingredients.length > 1 && (
                <button onClick={() => removeIngredient(i)} style={styles.removeIngBtn}>
                  <Minus size={14} color={C.error} />
                </button>
              )}
            </div>
          ))}
          <button onClick={addIngredient} style={styles.addIngBtn}>
            <Plus size={14} /> Lägg till ingrediens
          </button>

          {/* Recipe URL */}
          <label style={{ ...styles.label, marginTop: 14 }}>Receptlänk (valfritt)</label>
          <input
            type="url"
            placeholder="https://..."
            value={form.recipe_url}
            onChange={e => set('recipe_url', e.target.value)}
            style={S.input}
          />

          {/* Notes */}
          <label style={{ ...styles.label, marginTop: 14 }}>Egna anteckningar (valfritt)</label>
          <textarea
            placeholder="Tips, variationer..."
            value={form.recipe_notes}
            onChange={e => set('recipe_notes', e.target.value)}
            style={styles.textarea}
            rows={3}
          />
        </div>

        {/* Footer */}
        <div style={styles.footer}>
          {meal && onDelete && (
            <button onClick={() => onDelete(meal.id)} style={styles.deleteBtn}>
              <Trash2 size={16} /> Ta bort
            </button>
          )}
          <div style={{ flex: 1 }} />
          <button
            onClick={handleSubmit}
            disabled={!form.title.trim()}
            style={{
              ...S.button,
              ...S.buttonPrimary,
              opacity: form.title.trim() ? 1 : 0.5,
            }}
          >
            <Save size={16} /> {meal ? 'Spara' : 'Skapa'}
          </button>
        </div>
      </div>
    </div>
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
    zIndex: 200,
  },
  modal: {
    width: '100%',
    maxWidth: 500,
    maxHeight: '92vh',
    background: C.bgCard,
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
  },
  body: {
    padding: '16px 20px',
    overflowY: 'auto',
    flex: 1,
  },
  label: {
    display: 'block',
    fontSize: F.sizes.sm,
    fontWeight: F.weights.semi,
    color: C.text,
    marginBottom: 6,
  },
  tagRow: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: 6,
  },
  tagBtn: {
    padding: '6px 12px',
    borderRadius: 8,
    fontSize: F.sizes.xs,
    fontWeight: F.weights.bold,
    fontFamily: F.heading,
    cursor: 'pointer',
  },
  ratingRow: {
    display: 'flex',
    gap: 4,
  },
  starBtn: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    padding: 2,
  },
  ingredientRow: {
    display: 'flex',
    gap: 6,
    marginBottom: 6,
    alignItems: 'center',
  },
  ingredientInput: {
    padding: '8px 10px',
    borderRadius: 8,
    border: `1px solid ${C.border}`,
    fontSize: F.sizes.sm,
    fontFamily: F.body,
    outline: 'none',
  },
  removeIngBtn: {
    background: C.errorLight,
    border: 'none',
    borderRadius: 6,
    padding: 6,
    cursor: 'pointer',
    flexShrink: 0,
  },
  addIngBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: 4,
    padding: '8px 12px',
    background: C.primaryLight,
    border: `1px dashed ${C.primary}`,
    borderRadius: 8,
    color: C.primary,
    fontSize: F.sizes.xs,
    fontWeight: F.weights.bold,
    fontFamily: F.heading,
    cursor: 'pointer',
    marginTop: 4,
  },
  textarea: {
    width: '100%',
    padding: '10px 14px',
    borderRadius: 10,
    border: `2px solid ${C.border}`,
    fontSize: F.sizes.sm,
    fontFamily: F.body,
    outline: 'none',
    resize: 'vertical',
    boxSizing: 'border-box',
  },
  footer: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '12px 20px env(safe-area-inset-bottom, 12px)',
    borderTop: `1px solid ${C.borderLight}`,
  },
  deleteBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 4,
    padding: '8px 14px',
    borderRadius: 10,
    border: 'none',
    background: C.errorLight,
    color: C.error,
    fontSize: F.sizes.sm,
    fontWeight: F.weights.semi,
    cursor: 'pointer',
  },
};
