// ============================================
// FamTastic — MealPlan (weekly meal grid)
// Updated: passes library props to MealBank
// ============================================

import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { C, F, S, safeArray, getWeekNumber } from '../data';
import { MealBank } from './MealBank';
import { MealEditor } from './MealEditor';
import { ChevronLeft, ChevronRight, Plus, X, Shuffle, BookOpen, CalendarDays, ShoppingCart } from 'lucide-react';

const WEEKDAYS = ['Måndag', 'Tisdag', 'Onsdag', 'Torsdag', 'Fredag', 'Lördag', 'Söndag'];

function getWeekDates(offset) {
  const now = new Date();
  const day = now.getDay() || 7;
  const monday = new Date(now);
  monday.setDate(now.getDate() - day + 1 + offset * 7);
  const dates = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    dates.push(d);
  }
  return dates;
}

function fmtDate(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function MealPlan({ familyId, member, members, onGenerateShopping }) {
  const [tab, setTab] = useState('plan'); // plan | bank
  const [weekOffset, setWeekOffset] = useState(0);
  const [mealPlan, setMealPlan] = useState([]);
  const [meals, setMeals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pickingDay, setPickingDay] = useState(null); // date string
  const [editingMeal, setEditingMeal] = useState(null); // null | 'new' | meal object
  const [quickText, setQuickText] = useState('');

  const weekDates = getWeekDates(weekOffset);
  const weekNum = getWeekNumber(weekDates[0]);
  const today = fmtDate(new Date());
  const isParent = member.role === 'admin' || member.role === 'parent';

  useEffect(() => {
    loadData();
  }, [weekOffset, familyId]);

  async function loadData() {
    setLoading(true);
    const startDate = fmtDate(weekDates[0]);
    const endDate = fmtDate(weekDates[6]);

    const [planRes, mealRes] = await Promise.all([
      supabase.from('meal_plan').select('*, meals(*)')
        .eq('family_id', familyId)
        .gte('plan_date', startDate)
        .lte('plan_date', endDate)
        .order('plan_date'),
      supabase.from('meals').select('*')
        .eq('family_id', familyId)
        .order('title'),
    ]);

    setMealPlan(planRes.data || []);
    setMeals(mealRes.data || []);
    setLoading(false);
  }

  function getPlanForDate(dateStr) {
    return mealPlan.find(p => p.plan_date === dateStr && p.slot === 'dinner');
  }

  async function assignMeal(dateStr, meal) {
    const existing = getPlanForDate(dateStr);

    if (existing) {
      await supabase.from('meal_plan')
        .update({ meal_id: meal.id, free_text: null })
        .eq('id', existing.id);
    } else {
      await supabase.from('meal_plan').insert({
        family_id: familyId,
        plan_date: dateStr,
        slot: 'dinner',
        meal_id: meal.id,
        free_text: null,
      });
    }
    setPickingDay(null);
    loadData();
  }

  async function assignFreeText(dateStr) {
    if (!quickText.trim()) return;
    const existing = getPlanForDate(dateStr);

    if (existing) {
      await supabase.from('meal_plan')
        .update({ meal_id: null, free_text: quickText.trim() })
        .eq('id', existing.id);
    } else {
      await supabase.from('meal_plan').insert({
        family_id: familyId,
        plan_date: dateStr,
        slot: 'dinner',
        meal_id: null,
        free_text: quickText.trim(),
      });
    }
    setQuickText('');
    setPickingDay(null);
    loadData();
  }

  async function removePlan(dateStr) {
    const existing = getPlanForDate(dateStr);
    if (existing) {
      await supabase.from('meal_plan').delete().eq('id', existing.id);
      loadData();
    }
  }

  async function randomMeal(dateStr) {
    if (meals.length === 0) return;
    const favorites = meals.filter(m => safeArray(m.tags).includes('Favorit'));
    const pool = favorites.length > 0 ? favorites : meals;
    const random = pool[Math.floor(Math.random() * pool.length)];
    await assignMeal(dateStr, random);
  }

  // --- Meal CRUD ---
  async function handleSaveMeal(data) {
    if (editingMeal && editingMeal !== 'new' && editingMeal.id) {
      await supabase.from('meals').update(data).eq('id', editingMeal.id);
    } else {
      await supabase.from('meals').insert(data);
    }
    setEditingMeal(null);
    loadData();
  }

  async function handleDeleteMeal(mealId) {
    await supabase.from('meals').delete().eq('id', mealId);
    setEditingMeal(null);
    loadData();
  }

  // --- Add meal from template library ---
  async function handleAddFromTemplate(template) {
    await supabase.from('meals').insert({
      family_id: familyId,
      title: template.title,
      description: template.description || '',
      tags: Array.isArray(template.tags) ? template.tags : [],
      ingredients: Array.isArray(template.ingredients) ? template.ingredients : [],
      recipe_url: template.recipe_url || '',
      recipe_notes: '',
      rating: 0,
      created_by: member.id,
    });
    loadData();
  }

  // --- Generate shopping list ---
  async function handleGenerateShopping() {
    const weekMeals = mealPlan
      .filter(p => p.meal_id && p.meals)
      .map(p => p.meals);

    if (weekMeals.length === 0) return;

    // Collect all ingredients
    const items = [];
    weekMeals.forEach(meal => {
      safeArray(meal.ingredients).forEach(ing => {
        if (ing.name && ing.name.trim()) {
          items.push({
            name: ing.name.trim(),
            quantity: [ing.amount, ing.unit].filter(Boolean).join(' ') || null,
            from_meal_plan: true,
            source_meal_id: meal.id,
          });
        }
      });
    });

    if (items.length === 0) return;

    // Find or create default shopping list
    let { data: lists } = await supabase
      .from('shopping_lists')
      .select('id')
      .eq('family_id', familyId)
      .eq('is_default', true)
      .limit(1);

    let listId;
    if (lists && lists.length > 0) {
      listId = lists[0].id;
    } else {
      const { data: newList } = await supabase
        .from('shopping_lists')
        .insert({ family_id: familyId, name: 'Mathandling', is_default: true })
        .select()
        .single();
      listId = newList.id;
    }

    // Remove old auto-generated items
    await supabase.from('shopping_items')
      .delete()
      .eq('list_id', listId)
      .eq('from_meal_plan', true);

    // Insert new items
    const rows = items.map(item => ({
      list_id: listId,
      family_id: familyId,
      name: item.name,
      quantity: item.quantity,
      from_meal_plan: true,
      source_meal_id: item.source_meal_id,
      added_by: member.id,
    }));

    await supabase.from('shopping_items').insert(rows);

    if (onGenerateShopping) onGenerateShopping();
  }

  // --- RENDER ---
  return (
    <div style={styles.page}>
      {/* Header */}
      <div style={styles.header}>
        <h1 style={styles.pageTitle}>Mat</h1>
        <button
          onClick={() => setEditingMeal('new')}
          style={{ ...S.button, ...S.buttonPrimary, padding: '8px 16px' }}
        >
          <Plus size={18} /> Nytt recept
        </button>
      </div>

      {/* Tabs */}
      <div style={styles.tabs}>
        <button
          onClick={() => setTab('plan')}
          style={{
            ...styles.tab,
            borderBottom: tab === 'plan' ? `3px solid ${C.primary}` : '3px solid transparent',
            color: tab === 'plan' ? C.primary : C.textMuted,
          }}
        >
          <CalendarDays size={16} /> Veckomeny
        </button>
        <button
          onClick={() => setTab('bank')}
          style={{
            ...styles.tab,
            borderBottom: tab === 'bank' ? `3px solid ${C.primary}` : '3px solid transparent',
            color: tab === 'bank' ? C.primary : C.textMuted,
          }}
        >
          <BookOpen size={16} /> Receptbank
        </button>
      </div>

      {loading ? (
        <p style={styles.loadingText}>Laddar...</p>
      ) : tab === 'plan' ? (
        <div style={styles.content}>
          {/* Week nav */}
          <div style={styles.weekNav}>
            <button onClick={() => setWeekOffset(w => w - 1)} style={styles.weekBtn}>
              <ChevronLeft size={20} color={C.text} />
            </button>
            <div style={styles.weekTitle}>
              <span style={styles.weekLabel}>Vecka {weekNum}</span>
              {weekOffset !== 0 && (
                <button onClick={() => setWeekOffset(0)} style={styles.todayBtn}>Idag</button>
              )}
            </div>
            <button onClick={() => setWeekOffset(w => w + 1)} style={styles.weekBtn}>
              <ChevronRight size={20} color={C.text} />
            </button>
          </div>

          {/* Day grid */}
          {weekDates.map((d, i) => {
            const dateStr = fmtDate(d);
            const plan = getPlanForDate(dateStr);
            const isToday = dateStr === today;
            const mealTitle = plan?.meals?.title || plan?.free_text || null;

            return (
              <div key={i} style={{
                ...styles.dayRow,
                background: isToday ? C.primaryLight : C.bgCard,
                borderLeft: isToday ? `4px solid ${C.primary}` : `4px solid transparent`,
              }}>
                <div style={styles.dayHeader}>
                  <span style={{
                    ...styles.dayName,
                    color: isToday ? C.primary : C.text,
                    fontWeight: isToday ? F.weights.extra : F.weights.semi,
                  }}>
                    {WEEKDAYS[i]}
                  </span>
                  <span style={styles.dayDate}>{d.getDate()}/{d.getMonth() + 1}</span>
                </div>

                {mealTitle ? (
                  <div style={styles.mealAssigned}>
                    <span style={styles.mealName}>{mealTitle}</span>
                    <div style={styles.mealActions}>
                      <button onClick={() => setPickingDay(dateStr)} style={styles.mealActionBtn}>
                        Byt
                      </button>
                      <button onClick={() => removePlan(dateStr)} style={styles.mealActionBtn}>
                        <X size={14} />
                      </button>
                    </div>
                  </div>
                ) : (
                  <div style={styles.mealEmpty}>
                    <button onClick={() => setPickingDay(dateStr)} style={styles.addMealBtn}>
                      <Plus size={14} /> Välj måltid
                    </button>
                    <button onClick={() => randomMeal(dateStr)} style={styles.randomBtn}>
                      <Shuffle size={14} />
                    </button>
                  </div>
                )}
              </div>
            );
          })}

          {/* Generate shopping button */}
          {mealPlan.some(p => p.meal_id) && (
            <button
              onClick={handleGenerateShopping}
              style={{ ...S.button, ...S.buttonSecondary, width: '100%', marginTop: 12 }}
            >
              <ShoppingCart size={16} /> Generera handlingslista
            </button>
          )}
        </div>
      ) : (
        /* --- RECIPE BANK --- */
        <div style={styles.content}>
          <MealBank
            meals={meals}
            familyId={familyId}
            memberId={member.id}
            onSelect={null}
            onEdit={meal => setEditingMeal(meal)}
            onAddFromTemplate={handleAddFromTemplate}
          />
        </div>
      )}

      <div style={{ height: 80 }} />

      {/* Meal picker modal */}
      {pickingDay && (
        <div style={styles.overlay}>
          <div style={styles.pickerModal}>
            <div style={styles.pickerHeader}>
              <h2 style={styles.pickerTitle}>Välj måltid</h2>
              <button onClick={() => { setPickingDay(null); setQuickText(''); }} style={styles.closeBtn}>
                <X size={20} color={C.textMuted} />
              </button>
            </div>

            {/* Quick free text */}
            <div style={styles.quickRow}>
              <input
                type="text"
                placeholder="Eller skriv fritt, t.ex. Restomat"
                value={quickText}
                onChange={e => setQuickText(e.target.value)}
                style={{ ...S.input, flex: 1 }}
              />
              <button
                onClick={() => assignFreeText(pickingDay)}
                disabled={!quickText.trim()}
                style={{
                  ...S.button, ...S.buttonPrimary, padding: '10px 14px',
                  opacity: quickText.trim() ? 1 : 0.5,
                }}
              >
                OK
              </button>
            </div>

            <MealBank
              meals={meals}
              familyId={familyId}
              memberId={member.id}
              onSelect={meal => assignMeal(pickingDay, meal)}
              onEdit={null}
              onAddFromTemplate={handleAddFromTemplate}
            />
          </div>
        </div>
      )}

      {/* Meal editor modal */}
      {editingMeal && (
        <MealEditor
          meal={editingMeal === 'new' ? null : editingMeal}
          familyId={familyId}
          memberId={member.id}
          onSave={handleSaveMeal}
          onDelete={isParent ? handleDeleteMeal : null}
          onClose={() => setEditingMeal(null)}
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
  pageTitle: {
    fontFamily: F.heading,
    fontSize: F.sizes.xl,
    fontWeight: F.weights.extra,
    color: C.text,
    margin: 0,
  },
  tabs: {
    display: 'flex',
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
  content: {
    padding: '12px 16px',
  },
  loadingText: {
    textAlign: 'center',
    color: C.textMuted,
    padding: 32,
  },
  weekNav: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  weekBtn: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    padding: 8,
  },
  weekTitle: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  },
  weekLabel: {
    fontFamily: F.heading,
    fontSize: F.sizes.lg,
    fontWeight: F.weights.extra,
    color: C.text,
  },
  todayBtn: {
    padding: '4px 12px',
    borderRadius: 8,
    border: 'none',
    background: C.primaryLight,
    color: C.primary,
    fontSize: F.sizes.xs,
    fontWeight: F.weights.bold,
    fontFamily: F.heading,
    cursor: 'pointer',
  },
  dayRow: {
    padding: '12px 14px',
    borderRadius: 12,
    border: `1px solid ${C.borderLight}`,
    marginBottom: 6,
  },
  dayHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  dayName: {
    fontFamily: F.heading,
    fontSize: F.sizes.md,
  },
  dayDate: {
    fontSize: F.sizes.xs,
    color: C.textMuted,
  },
  mealAssigned: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  mealName: {
    fontSize: F.sizes.md,
    fontWeight: F.weights.semi,
    color: C.text,
  },
  mealActions: {
    display: 'flex',
    gap: 6,
  },
  mealActionBtn: {
    padding: '4px 10px',
    borderRadius: 6,
    border: `1px solid ${C.border}`,
    background: C.bgCard,
    fontSize: F.sizes.xs,
    color: C.textMuted,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: 2,
  },
  mealEmpty: {
    display: 'flex',
    gap: 6,
  },
  addMealBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: 4,
    padding: '6px 12px',
    borderRadius: 8,
    border: `1px dashed ${C.primary}`,
    background: C.primaryLight,
    color: C.primary,
    fontSize: F.sizes.sm,
    fontWeight: F.weights.semi,
    fontFamily: F.heading,
    cursor: 'pointer',
  },
  randomBtn: {
    padding: '6px 10px',
    borderRadius: 8,
    border: `1px solid ${C.border}`,
    background: C.bgCard,
    color: C.textMuted,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
  },
  overlay: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(0,0,0,0.4)',
    display: 'flex',
    alignItems: 'flex-end',
    justifyContent: 'center',
    zIndex: 200,
  },
  pickerModal: {
    width: '100%',
    maxWidth: 500,
    maxHeight: '85vh',
    overflowY: 'auto',
    background: C.bgCard,
    borderRadius: '20px 20px 0 0',
    padding: 20,
  },
  pickerHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  pickerTitle: {
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
  quickRow: {
    display: 'flex',
    gap: 8,
    marginBottom: 14,
  },
};
