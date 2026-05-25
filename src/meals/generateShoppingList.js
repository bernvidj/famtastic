// ============================================
// FamTastic — generateShoppingList
// Extracted from MealPlan.jsx
// Merges ingredients from week's meal plan into shopping list
// ============================================

import { supabase } from '../supabaseClient';
import { safeArray } from '../data';

/**
 * Generate shopping list from the current week's meal plan.
 * Merges duplicate ingredients (same name + unit → sums amounts).
 * Removes old auto-generated items, then inserts fresh ones.
 *
 * @param {Object} params
 * @param {Array} params.mealPlan - meal_plan rows with joined meals(*)
 * @param {string} params.familyId
 * @param {string} params.memberId - who's generating
 */
export async function generateShoppingList({ mealPlan, familyId, memberId }) {
  const weekMeals = mealPlan
    .filter(p => p.meal_id && p.meals)
    .map(p => p.meals);

  if (weekMeals.length === 0) return;

  // Collect all raw ingredients
  const raw = [];
  weekMeals.forEach(meal => {
    safeArray(meal.ingredients).forEach(ing => {
      if (ing.name && ing.name.trim()) {
        raw.push({
          name: ing.name.trim(),
          amount: ing.amount ? parseFloat(ing.amount) : null,
          unit: (ing.unit || '').trim().toLowerCase(),
          mealTitle: meal.title,
          source_meal_id: meal.id,
        });
      }
    });
  });

  if (raw.length === 0) return;

  // Merge duplicates: same name (case-insensitive) + same unit → sum amounts
  // Different units or unparseable amounts → keep separate
  const mergeMap = new Map();
  const unmerged = [];

  raw.forEach(item => {
    const key = `${item.name.toLowerCase()}::${item.unit}`;
    const canMerge = item.amount !== null && !isNaN(item.amount);

    if (canMerge) {
      if (mergeMap.has(key)) {
        const existing = mergeMap.get(key);
        existing.amount += item.amount;
        existing.meals.push(item.mealTitle);
      } else {
        mergeMap.set(key, {
          name: item.name,
          amount: item.amount,
          unit: item.unit,
          meals: [item.mealTitle],
          source_meal_id: item.source_meal_id,
        });
      }
    } else {
      unmerged.push(item);
    }
  });

  // Build final items list
  const items = [];

  mergeMap.forEach(m => {
    const amountStr = m.amount % 1 === 0 ? String(m.amount) : m.amount.toFixed(1);
    const qty = [amountStr, m.unit].filter(Boolean).join(' ');
    const suffix = m.meals.length > 1 ? ` (${m.meals.join(' + ')})` : '';
    items.push({
      name: m.name + suffix,
      quantity: qty || null,
      source_meal_id: m.source_meal_id,
    });
  });

  unmerged.forEach(u => {
    items.push({
      name: u.name,
      quantity: null,
      source_meal_id: u.source_meal_id,
    });
  });

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

  // Remove old auto-generated items that haven't been handled yet
  // (keep 'handlat', 'finns_hemma', 'ej_aktuellt' — those are confirmed results)
  await supabase.from('shopping_items')
    .delete()
    .eq('list_id', listId)
    .eq('from_meal_plan', true)
    .eq('item_status', 'active');

  // Insert merged items
  const rows = items.map(item => ({
    list_id: listId,
    family_id: familyId,
    name: item.name,
    quantity: item.quantity,
    from_meal_plan: true,
    source_meal_id: item.source_meal_id,
    added_by: memberId,
  }));

  await supabase.from('shopping_items').insert(rows);
}
