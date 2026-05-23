// ============================================
// FamTastic — ShoppingView
// Huvud-vy: state, Supabase, header, listflikar
// Placeras i: src/shopping/ShoppingView.jsx
// ============================================

import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { C, F, S, safeArray } from '../data';
import { formatPrice, estimateListCost } from '../priceDb';
import { ShoppingAddItem } from './ShoppingAddItem';
import { ShoppingItemList } from './ShoppingItemList';
import { Plus, Trash2 } from 'lucide-react';

// ─── Bakgrundsformer ──────────────────────────────────────────────────────────
function BgShapes() {
  return (
    <svg
      style={{
        position: 'absolute', top: 0, left: 0,
        width: '100%', height: '100%',
        opacity: 0.18, pointerEvents: 'none',
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

// ─── Huvud-vy ─────────────────────────────────────────────────────────────────
export function ShoppingView({ familyId, member }) {
  const [lists,        setLists]        = useState([]);
  const [selectedList, setSelectedList] = useState(null);
  const [items,        setItems]        = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [showAddItem,  setShowAddItem]  = useState(false);
  const [newListName,  setNewListName]  = useState('');
  const [showNewList,  setShowNewList]  = useState(false);

  const isParent   = member.role === 'admin' || member.role === 'parent';
  const hasUnchecked = items.some(i => !i.checked);
  const costEstimate = hasUnchecked ? estimateListCost(items) : null;
  const currentList  = lists.find(l => l.id === selectedList);

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

  async function handleAddItem({ name, quantity, category }) {
    await supabase.from('shopping_items').insert({
      list_id: selectedList,
      family_id: familyId,
      name, quantity, category,
      added_by: member.id,
    });
    setShowAddItem(false);
    loadItems();
  }

  async function handleToggle(item) {
    await supabase.from('shopping_items')
      .update({ checked: !item.checked, checked_by: !item.checked ? member.id : null })
      .eq('id', item.id);
    loadItems();
  }

  async function handleRemove(itemId) {
    await supabase.from('shopping_items').delete().eq('id', itemId);
    loadItems();
  }

  async function handleClearChecked() {
    await supabase.from('shopping_items')
      .delete().eq('list_id', selectedList).eq('checked', true);
    loadItems();
  }

  function getListBadge(list) {
    const listItems = safeArray(list.shopping_items);
    const unchecked = listItems.filter(i => !i.checked).length;
    return unchecked > 0 ? unchecked : null;
  }

  return (
    <div style={styles.page}>
      <BgShapes />

      <div style={styles.headerZone}>
        {/* ── Header ── */}
        <div style={styles.header}>
          <div>
            <h1 style={styles.pageTitle}>🛒 Handla</h1>
            {hasUnchecked && costEstimate && (
              <p style={styles.costSummary}>
                Uppskattad kostnad:{' '}
                <strong style={{ color: C.secondary }}>
                  {formatPrice(costEstimate.min, costEstimate.max)}
                </strong>
              </p>
            )}
          </div>
          <button
            onClick={() => setShowNewList(s => !s)}
            style={{ ...S.button, ...S.buttonSecondary, padding: '8px 14px' }}
          >
            <Plus size={16} /> Ny lista
          </button>
        </div>

        {/* ── Ny lista-formulär ── */}
        {showNewList && (
          <div style={styles.newListForm}>
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
      </div>

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
            <ShoppingAddItem
              onAdd={handleAddItem}
              onCancel={() => setShowAddItem(false)}
            />
          )}

          {/* ── Varulista ── */}
          <ShoppingItemList
            items={items}
            onToggle={handleToggle}
            onRemove={handleRemove}
            onClearChecked={handleClearChecked}
          />

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

const styles = {
  page: {
    minHeight: '100vh',
    background: C.bg,
    fontFamily: F.body,
    position: 'relative',
    overflow: 'hidden',
  },
  headerZone: {
    position: 'relative',
    zIndex: 1,
    background: `linear-gradient(135deg, ${C.primaryLight}, ${C.secondaryLight})`,
    borderRadius: '0 0 24px 24px',
    paddingBottom: 8,
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
