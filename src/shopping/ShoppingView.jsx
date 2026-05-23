// ============================================
// FamTastic — ShoppingView (lists + items + priser)
// Placeras i: src/shopping/ShoppingView.jsx
// ============================================

import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../supabaseClient';
import { C, F, S, safeArray } from '../data';
import { estimateListCost, formatPrice, lookupPrice } from '../priceDb';
import { Plus, Trash2, Check, X, ChevronDown, ChevronUp } from 'lucide-react';

const CATEGORIES = [
  'Mejeri', 'Frukt & grönt', 'Kött & fisk', 'Frys',
  'Bröd', 'Skafferi', 'Dryck', 'Hygien', 'Övrigt',
];

// ─── Bakgrundsformer (lätt variant) ──────────────────────────────────────────
function BgShapes() {
  return (
    <svg
      style={{
        position: 'fixed', top: 0, left: 0,
        width: '100%', height: '100%',
        opacity: 0.10, pointerEvents: 'none', zIndex: 0,
      }}
      viewBox="0 0 400 800" xmlns="http://www.w3.org/2000/svg"
      preserveAspectRatio="xMidYMid slice"
    >
      <path d="M -40 -30 Q 100 -60, 180 80 Q 230 180, 120 240 Q 20 290, -30 180 Q -80 80, -40 -30 Z" fill="#3CB4A6" />
      <path d="M 300 -20 Q 430 10, 440 140 Q 448 230, 350 260 Q 260 285, 230 190 Q 205 105, 300 -20 Z" fill="#A8E6DF" />
      <path d="M 220 640 Q 400 600, 440 720 Q 462 800, 320 810 Q 180 818, 160 720 Q 145 640, 220 640 Z" fill="#FF7A59" />
      <path d="M -50 700 Q 50 650, 130 710 Q 185 755, 140 820 Q 75 855, -15 820 Q -90 790, -50 700 Z" fill="#FFA071" />
    </svg>
  );
}

// ─── Pris-chip ────────────────────────────────────────────────────────────────
function PriceChip({ min, max, small = false }) {
  return (
    <span style={{
      fontSize: small ? 11 : 12,
      fontWeight: 700,
      color: C.secondary,
      background: '#E1F5F3',
      borderRadius: 8,
      padding: small ? '2px 6px' : '3px 8px',
      whiteSpace: 'nowrap',
      flexShrink: 0,
    }}>
      {formatPrice(min, max)}
    </span>
  );
}

// ─── Huvud-vy ─────────────────────────────────────────────────────────────────
export function ShoppingView({ familyId, member, members }) {
  const [lists,        setLists]        = useState([]);
  const [selectedList, setSelectedList] = useState(null);
  const [items,        setItems]        = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [newItemName,  setNewItemName]  = useState('');
  const [newItemQty,   setNewItemQty]   = useState('');
  const [newItemCat,   setNewItemCat]   = useState('Övrigt');
  const [showAddItem,  setShowAddItem]  = useState(false);
  const [showChecked,  setShowChecked]  = useState(false);
  const [newListName,  setNewListName]  = useState('');
  const [showNewList,  setShowNewList]  = useState(false);

  const isParent = member.role === 'admin' || member.role === 'parent';

  useEffect(() => { loadLists(); }, [familyId]);
  useEffect(() => { if (selectedList) loadItems(); }, [selectedList]);

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
    if (listsData.length > 0 && !selectedList) setSelectedList(listsData[0].id);
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
      .insert({ family_id: familyId, name: newListName.trim(), is_default: lists.length === 0 })
      .select().single();
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
      .update({ checked: !item.checked, checked_by: !item.checked ? member.id : null })
      .eq('id', item.id);
    loadItems();
  }

  async function removeItem(itemId) {
    await supabase.from('shopping_items').delete().eq('id', itemId);
    loadItems();
  }

  async function clearChecked() {
    await supabase.from('shopping_items')
      .delete().eq('list_id', selectedList).eq('checked', true);
    loadItems();
  }

  function groupedUnchecked() {
    const filtered = items.filter(i => !i.checked);
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

  // Prisberäkning för aktiv lista
  const costEstimate = useMemo(() => estimateListCost(items), [items]);
  const hasUnchecked = items.some(i => !i.checked);

  const uncheckedGroups = groupedUnchecked();
  const checkedItems    = items.filter(i => i.checked);
  const currentList     = lists.find(l => l.id === selectedList);

  // Pris-preview vid ny vara
  const previewPrice = newItemName.trim()
    ? lookupPrice(newItemName.trim(), newItemCat)
    : null;

  return (
    <div style={styles.page}>
      <BgShapes />

      {/* ── Header ── */}
      <div style={styles.header}>
        <div>
          <h1 style={styles.pageTitle}>🛒 Handla</h1>
          {hasUnchecked && (
            <p style={styles.costSummary}>
              Uppskattad kostnad:{' '}
              <strong style={{ color: C.secondary }}>
                {formatPrice(costEstimate.min, costEstimate.max)}
              </strong>
            </p>
          )}
        </div>
        <button
          onClick={() => setShowNewList(!showNewList)}
          style={{ ...S.button, ...S.buttonSecondary, padding: '8px 14px', position: 'relative', zIndex: 1 }}
        >
          <Plus size={16} /> Ny lista
        </button>
      </div>

      {/* ── Ny lista-formulär ── */}
      {showNewList && (
        <div style={{ ...styles.newListForm, position: 'relative', zIndex: 1 }}>
          <input
            type="text"
            placeholder="Listnamn, t.ex. IKEA"
            value={newListName}
            onChange={e => setNewListName(e.target.value)}
            style={{ ...S.input, flex: 1 }}
            autoFocus
            onKeyDown={e => e.key === 'Enter' && createList()}
          />
          <button
            onClick={createList}
            disabled={!newListName.trim()}
            style={{ ...S.button, ...S.buttonPrimary, padding: '10px 14px', opacity: newListName.trim() ? 1 : 0.5 }}
          >
            Skapa
          </button>
        </div>
      )}

      {/* ── Listflikar ── */}
      {lists.length > 0 && (
        <div style={styles.listTabs}>
          {lists.map(list => {
            const badge    = getListBadge(list);
            const isActive = selectedList === list.id;
            return (
              <button
                key={list.id}
                onClick={() => setSelectedList(list.id)}
                style={{
                  ...styles.listTab,
                  background: isActive ? C.primary : C.bgCard,
                  color:      isActive ? '#fff'    : C.text,
                  border:     isActive ? `2px solid ${C.primary}` : `2px solid ${C.border}`,
                }}
              >
                {list.name}
                {badge && (
                  <span style={{
                    ...styles.badge,
                    background: isActive ? 'rgba(255,255,255,0.3)' : C.primaryLight,
                    color:      isActive ? '#fff' : C.primary,
                  }}>
                    {badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}

      {/* ── Innehåll ── */}
      {loading ? (
        <p style={styles.loadingText}>Laddar...</p>
      ) : lists.length === 0 ? (
        <div style={styles.emptyState}>
          <span style={{ fontSize: 52 }}>🛒</span>
          <p style={styles.emptyTitle}>Inga listor ännu</p>
          <p style={styles.emptyText}>Skapa din första handlingslista!</p>
        </div>
      ) : (
        <div style={styles.content}>

          {/* ── Lägg till vara ── */}
          {!showAddItem ? (
            <button onClick={() => setShowAddItem(true)} style={styles.addItemBtn}>
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
              {/* Pris-preview */}
              {previewPrice && (
                <div style={styles.pricePreview}>
                  <span style={{ fontSize: 12, color: C.textMuted }}>Ungefärligt pris:</span>
                  <PriceChip min={previewPrice[0]} max={previewPrice[1]} small />
                </div>
              )}
              <div style={styles.addItemRow2}>
                <input
                  type="text"
                  placeholder="Mängd (valfritt)"
                  value={newItemQty}
                  onChange={e => setNewItemQty(e.target.value)}
                  style={styles.qtyInput}
                />
                <select
                  value={newItemCat}
                  onChange={e => setNewItemCat(e.target.value)}
                  style={styles.catSelect}
                >
                  {CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
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
                  style={{ ...S.button, ...S.buttonPrimary, flex: 1, opacity: newItemName.trim() ? 1 : 0.5 }}
                >
                  Lägg till
                </button>
              </div>
            </div>
          )}

          {/* ── Varor per kategori ── */}
          {Object.keys(uncheckedGroups).length === 0 && checkedItems.length === 0 ? (
            <div style={styles.emptyList}>
              <span style={{ fontSize: 36 }}>✨</span>
              <p style={styles.emptyListText}>Listan är tom — lägg till varor!</p>
            </div>
          ) : (
            <>
              {Object.entries(uncheckedGroups).map(([cat, catItems]) => (
                <div key={cat}>
                  <h3 style={styles.catTitle}>{cat}</h3>
                  {catItems.map(item => {
                    const itemPrice = costEstimate.perItem[item.id];
                    return (
                      <div key={item.id} style={styles.itemRow}>
                        <button onClick={() => toggleItem(item)} style={styles.itemCheck}>
                          <div style={styles.checkCircle} />
                        </button>
                        <div style={styles.itemContent}>
                          <span style={styles.itemName}>{item.name}</span>
                          {item.quantity && (
                            <span style={styles.itemQty}>{item.quantity}</span>
                          )}
                          {item.from_meal_plan && <span style={{ fontSize: 12 }}>🍽️</span>}
                        </div>
                        {itemPrice && (
                          <PriceChip min={itemPrice[0]} max={itemPrice[1]} small />
                        )}
                        <button onClick={() => removeItem(item.id)} style={styles.removeItemBtn}>
                          <X size={14} color={C.textMuted} />
                        </button>
                      </div>
                    );
                  })}
                </div>
              ))}

              {/* ── Totalsumma-kort ── */}
              {hasUnchecked && (
                <div style={styles.totalCard}>
                  <span style={styles.totalLabel}>Uppskattad totalkostnad</span>
                  <span style={styles.totalAmount}>
                    {formatPrice(costEstimate.min, costEstimate.max)}
                  </span>
                </div>
              )}

              {/* ── Avbockade ── */}
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
                          <button onClick={() => toggleItem(item)} style={styles.itemCheck}>
                            <Check size={16} color={C.success} />
                          </button>
                          <div style={styles.itemContent}>
                            <span style={{ ...styles.itemName, textDecoration: 'line-through', color: C.textMuted }}>
                              {item.name}
                            </span>
                          </div>
                        </div>
                      ))}
                      <button onClick={clearChecked} style={styles.clearBtn}>
                        <Trash2 size={14} /> Rensa avbockade
                      </button>
                    </>
                  )}
                </div>
              )}
            </>
          )}

          {/* ── Ta bort lista ── */}
          {currentList && !currentList.is_default && isParent && (
            <button onClick={() => deleteList(selectedList)} style={styles.deleteListBtn}>
              <Trash2 size={14} /> Ta bort lista "{currentList.name}"
            </button>
          )}
        </div>
      )}

      <div style={{ height: 80 }} />
    </div>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = {
  page: {
    minHeight: '100vh',
    background: C.bg,
    fontFamily: F.body,
    position: 'relative',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: '16px 16px 4px',
    position: 'relative',
    zIndex: 1,
  },
  pageTitle: {
    fontFamily: F.heading,
    fontSize: F.sizes.xl,
    fontWeight: F.weights.extra,
    color: C.text,
    margin: '0 0 2px',
  },
  costSummary: {
    fontSize: 13,
    color: C.textMuted,
    margin: 0,
    fontFamily: F.body,
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
    position: 'relative',
    zIndex: 1,
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
    position: 'relative',
    zIndex: 1,
  },
  loadingText: {
    textAlign: 'center',
    color: C.textMuted,
    padding: 32,
    position: 'relative',
    zIndex: 1,
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
    boxSizing: 'border-box',
  },
  addItemForm: {
    padding: 14,
    background: C.bgCard,
    borderRadius: 14,
    border: `1.5px solid ${C.border}`,
    marginBottom: 12,
    boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
  },
  pricePreview: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    marginTop: 6,
    padding: '4px 0',
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
    background: C.bg,
  },
  catSelect: {
    flex: 1,
    padding: '8px 10px',
    borderRadius: 8,
    border: `1px solid ${C.border}`,
    fontSize: F.sizes.sm,
    fontFamily: F.body,
    background: C.bgCard,
    outline: 'none',
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
    gap: 8,
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
    overflow: 'hidden',
  },
  itemName: {
    fontSize: F.sizes.md,
    color: C.text,
    fontWeight: F.weights.semi,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  itemQty: {
    fontSize: F.sizes.xs,
    color: C.textMuted,
    background: C.bg,
    padding: '2px 6px',
    borderRadius: 4,
    flexShrink: 0,
  },
  removeItemBtn: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    padding: 4,
    flexShrink: 0,
  },
  totalCard: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 16,
    marginBottom: 4,
    padding: '14px 16px',
    background: 'linear-gradient(135deg, #E1F5F3 0%, #F0FBF9 100%)',
    borderRadius: 14,
    border: `1.5px solid ${C.secondary}33`,
  },
  totalLabel: {
    fontSize: F.sizes.sm,
    fontWeight: F.weights.bold,
    color: C.text,
    fontFamily: F.heading,
  },
  totalAmount: {
    fontSize: F.sizes.lg,
    fontWeight: F.weights.extra,
    color: C.secondary,
    fontFamily: F.heading,
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
    fontFamily: F.body,
  },
  emptyState: {
    textAlign: 'center',
    padding: '48px 20px',
    position: 'relative',
    zIndex: 1,
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
    fontFamily: F.body,
  },
};
