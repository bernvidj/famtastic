// ============================================
// FamTastic — ShoppingView (lists + items)
// ============================================

import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { C, F, S, safeArray } from '../data';
import { Plus, Trash2, Check, ShoppingCart, ChevronDown, ChevronUp, X, List } from 'lucide-react';

const CATEGORIES = ['Mejeri', 'Frukt & grönt', 'Kött & fisk', 'Frys', 'Bröd', 'Skafferi', 'Dryck', 'Hygien', 'Övrigt'];

export function ShoppingView({ familyId, member, members }) {
  const [lists, setLists] = useState([]);
  const [selectedList, setSelectedList] = useState(null);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newItemName, setNewItemName] = useState('');
  const [newItemQty, setNewItemQty] = useState('');
  const [newItemCat, setNewItemCat] = useState('Övrigt');
  const [showAddItem, setShowAddItem] = useState(false);
  const [showChecked, setShowChecked] = useState(false);
  const [newListName, setNewListName] = useState('');
  const [showNewList, setShowNewList] = useState(false);

  const isParent = member.role === 'admin' || member.role === 'parent';

  useEffect(() => {
    loadLists();
  }, [familyId]);

  useEffect(() => {
    if (selectedList) loadItems();
  }, [selectedList]);

  async function loadLists() {
    setLoading(true);
    const { data } = await supabase
      .from('shopping_lists')
      .select('*, shopping_items(id, checked)')
      .eq('family_id', familyId)
      .order('is_default', { ascending: false })
      .order('created_at');

    const listsData = data || [];
    setLists(listsData);

    if (listsData.length > 0 && !selectedList) {
      setSelectedList(listsData[0].id);
    }
    setLoading(false);
  }

  async function loadItems() {
    const { data } = await supabase
      .from('shopping_items')
      .select('*')
      .eq('list_id', selectedList)
      .order('checked')
      .order('category')
      .order('created_at');

    setItems(data || []);
  }

  async function createList() {
    if (!newListName.trim()) return;
    const { data } = await supabase
      .from('shopping_lists')
      .insert({
        family_id: familyId,
        name: newListName.trim(),
        is_default: lists.length === 0,
      })
      .select()
      .single();

    if (data) {
      setSelectedList(data.id);
      setNewListName('');
      setShowNewList(false);
      loadLists();
    }
  }

  async function deleteList(listId) {
    await supabase.from('shopping_lists').delete().eq('id', listId);
    setSelectedList(null);
    loadLists();
  }

  async function addItem() {
    if (!newItemName.trim() || !selectedList) return;

    await supabase.from('shopping_items').insert({
      list_id: selectedList,
      family_id: familyId,
      name: newItemName.trim(),
      quantity: newItemQty.trim() || null,
      category: newItemCat,
      added_by: member.id,
    });

    setNewItemName('');
    setNewItemQty('');
    setShowAddItem(false);
    loadItems();
  }

  async function toggleItem(item) {
    await supabase.from('shopping_items')
      .update({
        checked: !item.checked,
        checked_by: !item.checked ? member.id : null,
      })
      .eq('id', item.id);

    loadItems();
  }

  async function removeItem(itemId) {
    await supabase.from('shopping_items').delete().eq('id', itemId);
    loadItems();
  }

  async function clearChecked() {
    await supabase.from('shopping_items')
      .delete()
      .eq('list_id', selectedList)
      .eq('checked', true);

    loadItems();
  }

  // Group items by category
  function groupedItems(checked) {
    const filtered = items.filter(i => i.checked === checked);
    const groups = {};
    filtered.forEach(item => {
      const cat = item.category || 'Övrigt';
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push(item);
    });
    return groups;
  }

  function getListBadge(list) {
    const listItems = safeArray(list.shopping_items);
    const unchecked = listItems.filter(i => !i.checked).length;
    return unchecked > 0 ? unchecked : null;
  }

  const uncheckedGroups = groupedItems(false);
  const checkedItems = items.filter(i => i.checked);
  const currentList = lists.find(l => l.id === selectedList);

  return (
    <div style={styles.page}>
      {/* Header */}
      <div style={styles.header}>
        <h1 style={styles.pageTitle}>Handla</h1>
        <button
          onClick={() => setShowNewList(!showNewList)}
          style={{ ...S.button, ...S.buttonSecondary, padding: '8px 14px' }}
        >
          <Plus size={16} /> Ny lista
        </button>
      </div>

      {/* New list form */}
      {showNewList && (
        <div style={styles.newListForm}>
          <input
            type="text"
            placeholder="Listnamn, t.ex. IKEA"
            value={newListName}
            onChange={e => setNewListName(e.target.value)}
            style={{ ...S.input, flex: 1 }}
            autoFocus
          />
          <button
            onClick={createList}
            disabled={!newListName.trim()}
            style={{
              ...S.button, ...S.buttonPrimary, padding: '10px 14px',
              opacity: newListName.trim() ? 1 : 0.5,
            }}
          >
            Skapa
          </button>
        </div>
      )}

      {/* List tabs */}
      {lists.length > 0 && (
        <div style={styles.listTabs}>
          {lists.map(list => {
            const badge = getListBadge(list);
            return (
              <button
                key={list.id}
                onClick={() => setSelectedList(list.id)}
                style={{
                  ...styles.listTab,
                  background: selectedList === list.id ? C.primary : C.bgCard,
                  color: selectedList === list.id ? '#fff' : C.text,
                  border: selectedList === list.id ? `2px solid ${C.primary}` : `2px solid ${C.border}`,
                }}
              >
                {list.name}
                {badge && (
                  <span style={{
                    ...styles.badge,
                    background: selectedList === list.id ? 'rgba(255,255,255,0.3)' : C.primaryLight,
                    color: selectedList === list.id ? '#fff' : C.primary,
                  }}>
                    {badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}

      {loading ? (
        <p style={styles.loadingText}>Laddar...</p>
      ) : lists.length === 0 ? (
        <div style={styles.emptyState}>
          <span style={{ fontSize: 48 }}>🛒</span>
          <p style={styles.emptyTitle}>Inga listor ännu</p>
          <p style={styles.emptyText}>Skapa din första handlingslista!</p>
        </div>
      ) : (
        <div style={styles.content}>
          {/* Add item */}
          {!showAddItem ? (
            <button
              onClick={() => setShowAddItem(true)}
              style={styles.addItemBtn}
            >
              <Plus size={16} color={C.primary} /> Lägg till vara...
            </button>
          ) : (
            <div style={styles.addItemForm}>
              <input
                type="text"
                placeholder="Vara, t.ex. Mjölk"
                value={newItemName}
                onChange={e => setNewItemName(e.target.value)}
                style={{ ...S.input }}
                autoFocus
                onKeyDown={e => e.key === 'Enter' && addItem()}
              />
              <div style={styles.addItemRow2}>
                <input
                  type="text"
                  placeholder="Mängd (valfritt)"
                  value={newItemQty}
                  onChange={e => setNewItemQty(e.target.value)}
                  style={{ ...styles.qtyInput }}
                />
                <select
                  value={newItemCat}
                  onChange={e => setNewItemCat(e.target.value)}
                  style={styles.catSelect}
                >
                  {CATEGORIES.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>
              <div style={styles.addItemActions}>
                <button
                  onClick={() => { setShowAddItem(false); setNewItemName(''); setNewItemQty(''); }}
                  style={{ ...S.button, ...S.buttonSecondary, flex: 1 }}
                >
                  Avbryt
                </button>
                <button
                  onClick={addItem}
                  disabled={!newItemName.trim()}
                  style={{
                    ...S.button, ...S.buttonPrimary, flex: 1,
                    opacity: newItemName.trim() ? 1 : 0.5,
                  }}
                >
                  Lägg till
                </button>
              </div>
            </div>
          )}

          {/* Unchecked items grouped by category */}
          {Object.keys(uncheckedGroups).length === 0 && checkedItems.length === 0 ? (
            <div style={styles.emptyList}>
              <span style={{ fontSize: 32 }}>✨</span>
              <p style={styles.emptyListText}>Listan är tom — lägg till varor!</p>
            </div>
          ) : (
            <>
              {Object.entries(uncheckedGroups).map(([cat, catItems]) => (
                <div key={cat}>
                  <h3 style={styles.catTitle}>{cat}</h3>
                  {catItems.map(item => (
                    <div key={item.id} style={styles.itemRow}>
                      <button
                        onClick={() => toggleItem(item)}
                        style={styles.itemCheck}
                      >
                        <div style={styles.checkCircle} />
                      </button>
                      <div style={styles.itemContent}>
                        <span style={styles.itemName}>{item.name}</span>
                        {item.quantity && (
                          <span style={styles.itemQty}>{item.quantity}</span>
                        )}
                        {item.from_meal_plan && (
                          <span style={styles.mealBadge}>🍽️</span>
                        )}
                      </div>
                      <button onClick={() => removeItem(item.id)} style={styles.removeItemBtn}>
                        <X size={14} color={C.textMuted} />
                      </button>
                    </div>
                  ))}
                </div>
              ))}

              {/* Checked items */}
              {checkedItems.length > 0 && (
                <div style={styles.checkedSection}>
                  <button
                    onClick={() => setShowChecked(!showChecked)}
                    style={styles.checkedToggle}
                  >
                    {showChecked ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    Avbockade ({checkedItems.length})
                  </button>

                  {showChecked && (
                    <>
                      {checkedItems.map(item => (
                        <div key={item.id} style={{ ...styles.itemRow, opacity: 0.5 }}>
                          <button
                            onClick={() => toggleItem(item)}
                            style={styles.itemCheck}
                          >
                            <Check size={16} color={C.success} />
                          </button>
                          <div style={styles.itemContent}>
                            <span style={{
                              ...styles.itemName,
                              textDecoration: 'line-through',
                              color: C.textMuted,
                            }}>
                              {item.name}
                            </span>
                          </div>
                        </div>
                      ))}
                      <button
                        onClick={clearChecked}
                        style={styles.clearBtn}
                      >
                        <Trash2 size={14} /> Rensa avbockade
                      </button>
                    </>
                  )}
                </div>
              )}
            </>
          )}

          {/* Delete list (not default) */}
          {currentList && !currentList.is_default && isParent && (
            <button
              onClick={() => deleteList(selectedList)}
              style={styles.deleteListBtn}
            >
              <Trash2 size={14} /> Ta bort lista "{currentList.name}"
            </button>
          )}
        </div>
      )}

      <div style={{ height: 80 }} />
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
  newListForm: {
    display: 'flex',
    gap: 8,
    padding: '4px 16px 12px',
  },
  listTabs: {
    display: 'flex',
    gap: 6,
    padding: '8px 16px',
    overflowX: 'auto',
  },
  listTab: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    padding: '8px 14px',
    borderRadius: 10,
    fontSize: F.sizes.sm,
    fontWeight: F.weights.bold,
    fontFamily: F.heading,
    cursor: 'pointer',
    whiteSpace: 'nowrap',
  },
  badge: {
    padding: '1px 7px',
    borderRadius: 8,
    fontSize: F.sizes.xs,
    fontWeight: F.weights.extra,
  },
  content: {
    padding: '8px 16px',
  },
  loadingText: {
    textAlign: 'center',
    color: C.textMuted,
    padding: 32,
  },
  addItemBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    width: '100%',
    padding: '12px 14px',
    background: C.bgCard,
    borderRadius: 12,
    border: `2px dashed ${C.border}`,
    color: C.primary,
    fontSize: F.sizes.md,
    fontFamily: F.heading,
    fontWeight: F.weights.semi,
    cursor: 'pointer',
    marginBottom: 12,
  },
  addItemForm: {
    padding: 14,
    background: C.bgCard,
    borderRadius: 12,
    border: `1px solid ${C.border}`,
    marginBottom: 12,
  },
  addItemRow2: {
    display: 'flex',
    gap: 8,
    marginTop: 8,
  },
  qtyInput: {
    flex: 1,
    padding: '8px 12px',
    borderRadius: 8,
    border: `1px solid ${C.border}`,
    fontSize: F.sizes.sm,
    fontFamily: F.body,
    outline: 'none',
  },
  catSelect: {
    flex: 1,
    padding: '8px 10px',
    borderRadius: 8,
    border: `1px solid ${C.border}`,
    fontSize: F.sizes.sm,
    fontFamily: F.body,
    background: C.bgCard,
  },
  addItemActions: {
    display: 'flex',
    gap: 8,
    marginTop: 10,
  },
  catTitle: {
    fontFamily: F.heading,
    fontSize: F.sizes.sm,
    fontWeight: F.weights.bold,
    color: C.textMuted,
    margin: '14px 0 6px',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  itemRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    padding: '10px 12px',
    background: C.bgCard,
    borderRadius: 10,
    border: `1px solid ${C.borderLight}`,
    marginBottom: 4,
  },
  itemCheck: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    padding: 2,
    flexShrink: 0,
  },
  checkCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    border: `2px solid ${C.border}`,
  },
  itemContent: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    minWidth: 0,
  },
  itemName: {
    fontSize: F.sizes.md,
    color: C.text,
    fontWeight: F.weights.semi,
  },
  itemQty: {
    fontSize: F.sizes.xs,
    color: C.textMuted,
    background: C.bg,
    padding: '2px 6px',
    borderRadius: 4,
  },
  mealBadge: {
    fontSize: 12,
  },
  removeItemBtn: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    padding: 4,
    flexShrink: 0,
  },
  checkedSection: {
    marginTop: 16,
  },
  checkedToggle: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    background: 'none',
    border: 'none',
    color: C.textMuted,
    fontSize: F.sizes.sm,
    fontWeight: F.weights.bold,
    fontFamily: F.heading,
    cursor: 'pointer',
    padding: '8px 0',
  },
  clearBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: 4,
    margin: '8px 0',
    padding: '8px 14px',
    borderRadius: 8,
    border: 'none',
    background: C.errorLight,
    color: C.error,
    fontSize: F.sizes.sm,
    fontWeight: F.weights.semi,
    cursor: 'pointer',
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
  emptyList: {
    textAlign: 'center',
    padding: '28px 20px',
  },
  emptyListText: {
    fontSize: F.sizes.sm,
    color: C.textMuted,
    marginTop: 8,
  },
  deleteListBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: 4,
    margin: '20px 0',
    padding: '8px 14px',
    borderRadius: 8,
    border: 'none',
    background: C.errorLight,
    color: C.error,
    fontSize: F.sizes.sm,
    fontWeight: F.weights.semi,
    cursor: 'pointer',
  },
};
