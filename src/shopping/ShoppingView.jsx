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
import { Plus, Trash2, RefreshCw } from 'lucide-react';
import { BgShapes } from '../BgShapes';

// ─── Status-picker sheet ───────────────────────────────────────────────────────
const STATUS_OPTIONS = [
  { status: 'active',      label: '○ Inte handlat',  color: C.text,      bg: C.bg },
  { status: 'handlat',     label: '✅ Handlat',       color: '#16A34A',   bg: '#F0FDF4' },
  { status: 'finns_hemma', label: '🏠 Finns hemma',   color: '#2563EB',   bg: '#EFF6FF' },
  { status: 'ej_aktuellt', label: '✕ Ej aktuellt',   color: C.textMuted, bg: C.bg },
];

// ─── Huvud-vy ─────────────────────────────────────────────────────────────────
export function ShoppingView({ familyId, member, members, stacked }) {
  const [lists,        setLists]        = useState([]);
  const [selectedList, setSelectedList] = useState(null);
  const [items,        setItems]        = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [showAddItem,  setShowAddItem]  = useState(false);
  const [newListName,  setNewListName]  = useState('');
  const [showNewList,  setShowNewList]  = useState(false);
  const [pickingItem,  setPickingItem]  = useState(null);   // item currently being status-picked
  const [confirming,   setConfirming]   = useState(false);

  const isParent     = member.role === 'admin' || member.role === 'parent';
  const activeItems  = items.filter(i => !i.item_status || i.item_status === 'active');
  const handledItems = items.filter(i => i.item_status && i.item_status !== 'active');
  const costEstimate = activeItems.length > 0 ? estimateListCost(activeItems) : null;
  const currentList  = lists.find(l => l.id === selectedList);

  // Auto-refresh every 15 s — picks up items added by children
  useEffect(() => {
    const iv = setInterval(() => { if (selectedList) loadItems(); }, 15000);
    return () => clearInterval(iv);
  }, [selectedList]);

  useEffect(() => { loadLists(); }, [familyId]);
  useEffect(() => { if (selectedList) loadItems(); }, [selectedList]);

  async function loadLists() {
    setLoading(true);
    const { data } = await supabase
      .from('shopping_lists')
      .select('*, shopping_items(id, item_status)')
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
      item_status: 'active',
    });
    setShowAddItem(false);
    loadItems();
  }

  // Set status on a single item
  async function handleSetStatus(item, status) {
    await supabase.from('shopping_items')
      .update({ item_status: status })
      .eq('id', item.id);
    setPickingItem(null);
    loadItems();
  }

  async function handleRemove(itemId) {
    await supabase.from('shopping_items').delete().eq('id', itemId);
    setPickingItem(null);
    loadItems();
  }

  // Confirm shopping trip done — delete all non-active items
  async function handleConfirmDone() {
    setConfirming(true);
    await supabase.from('shopping_items')
      .delete()
      .eq('list_id', selectedList)
      .neq('item_status', 'active');
    setConfirming(false);
    loadItems();
    loadLists();
  }

  function getListBadge(list) {
    const listItems = safeArray(list.shopping_items);
    const active = listItems.filter(i => !i.item_status || i.item_status === 'active').length;
    return active > 0 ? active : null;
  }

  return (
    <div style={{ ...styles.page, ...(stacked && { minHeight: 'auto', paddingBottom: 0 }) }}>
      <BgShapes variant="shopping" />

      {/* ── Status-picker bottom sheet ── */}
      {pickingItem && (
        <div style={styles.overlay} onClick={() => setPickingItem(null)}>
          <div style={styles.pickerSheet} onClick={e => e.stopPropagation()}>
            <p style={styles.pickerTitle}>{pickingItem.name}</p>
            <div style={styles.pickerOptions}>
              {STATUS_OPTIONS.map(opt => {
                const isActive = (pickingItem.item_status || 'active') === opt.status;
                return (
                  <button
                    key={opt.status}
                    onClick={() => handleSetStatus(pickingItem, opt.status)}
                    style={{
                      ...styles.pickerBtn,
                      background: isActive ? opt.bg : 'transparent',
                      color: opt.color,
                      fontWeight: isActive ? 700 : 500,
                      border: isActive
                        ? `2px solid ${opt.color}44`
                        : `2px solid transparent`,
                    }}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>
            <button
              onClick={() => { if (pickingItem) handleRemove(pickingItem.id); }}
              style={styles.pickerRemove}
            >
              🗑️ Ta bort vara
            </button>
            <button onClick={() => setPickingItem(null)} style={styles.pickerCancel}>
              Avbryt
            </button>
          </div>
        </div>
      )}

      <div style={styles.headerZone}>
        {/* ── Header ── */}
        <div style={styles.header}>
          <div>
            <h1 style={styles.pageTitle}>🛒 Handla</h1>
            {costEstimate && activeItems.length > 0 && (
              <p style={styles.costSummary}>
                Uppskattad kostnad:{' '}
                <strong style={{ color: C.secondary }}>
                  {formatPrice(costEstimate.min, costEstimate.max)}
                </strong>
              </p>
            )}
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            <button
              onClick={() => { loadLists(); if (selectedList) loadItems(); }}
              style={{ ...S.button, ...S.buttonSecondary, padding: '8px 12px' }}
              title="Uppdatera lista"
            >
              <RefreshCw size={16} />
            </button>
            <button
              onClick={() => setShowNewList(s => !s)}
              style={{ ...S.button, ...S.buttonSecondary, padding: '8px 14px' }}
            >
              <Plus size={16} /> Ny lista
            </button>
          </div>
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
              style={{
                ...S.button, ...S.buttonPrimary,
                padding: '10px 14px',
                opacity: newListName.trim() ? 1 : 0.5,
              }}
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
                    border:     isActive
                      ? `2px solid ${C.primary}`
                      : `2px solid ${C.border}`,
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

          {/* ── Bekräfta klar — visas när handlade varor finns ── */}
          {handledItems.length > 0 && (
            <button
              onClick={handleConfirmDone}
              disabled={confirming}
              style={styles.confirmDoneBtn}
            >
              ✅ Bekräfta handlingen klar
              <span style={styles.confirmDoneSub}>
                Rensar {handledItems.length} hanterade {handledItems.length === 1 ? 'vara' : 'varor'}
              </span>
            </button>
          )}

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
            members={members}
            onPick={setPickingItem}
            onRemove={handleRemove}
          />

          {/* ── Ta bort lista ── */}
          {currentList && !currentList.is_default && isParent && (
            <button onClick={() => deleteList(selectedList)} style={styles.deleteListBtn}>
              <Trash2 size={14} /> Ta bort lista "{currentList.name}"
            </button>
          )}
        </div>
      )}

      <div style={{ height: 'calc(90px + env(safe-area-inset-bottom, 0px))' }} />
    </div>
  );
}

const styles = {
  page: {
    minHeight: '100vh',
    background: C.bg,
    fontFamily: F.body,
    position: 'relative',
    paddingBottom: 'calc(90px + env(safe-area-inset-bottom, 0px))',
  },
  // ── Overlay + picker sheet ──
  overlay: {
    position: 'fixed',
    inset: 0,
    zIndex: 200,
    background: 'rgba(0,0,0,0.35)',
    display: 'flex',
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  pickerSheet: {
    width: '100%',
    maxWidth: 480,
    background: '#fff',
    borderRadius: '20px 20px 0 0',
    padding: '20px 16px calc(24px + env(safe-area-inset-bottom, 0px))',
    boxShadow: '0 -4px 32px rgba(0,0,0,0.15)',
  },
  pickerTitle: {
    fontFamily: F.heading,
    fontSize: F.sizes.lg,
    fontWeight: F.weights.extra,
    color: C.text,
    margin: '0 0 16px',
    textAlign: 'center',
  },
  pickerOptions: {
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
    marginBottom: 12,
  },
  pickerBtn: {
    width: '100%',
    padding: '13px 16px',
    borderRadius: 12,
    fontSize: F.sizes.md,
    fontFamily: F.heading,
    cursor: 'pointer',
    textAlign: 'left',
  },
  pickerRemove: {
    width: '100%',
    padding: '12px 16px',
    borderRadius: 12,
    fontSize: F.sizes.sm,
    fontFamily: F.body,
    fontWeight: F.weights.semi,
    cursor: 'pointer',
    background: 'none',
    border: 'none',
    color: C.error,
    textAlign: 'left',
    marginBottom: 4,
  },
  pickerCancel: {
    width: '100%',
    padding: '12px 16px',
    borderRadius: 12,
    fontSize: F.sizes.md,
    fontFamily: F.heading,
    fontWeight: F.weights.bold,
    cursor: 'pointer',
    background: C.bg,
    border: 'none',
    color: C.textMuted,
    textAlign: 'center',
    marginTop: 4,
  },
  // ── Sticky header ──
  headerZone: {
    position: 'sticky',
    top: 52,
    zIndex: 10,
    background: 'rgba(255,251,245,0.88)',
    backdropFilter: 'blur(16px)',
    WebkitBackdropFilter: 'blur(16px)',
    borderBottom: '1px solid rgba(255,255,255,0.5)',
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
  // ── Content ──
  content: {
    padding: '8px 16px',
    position: 'relative',
    zIndex: 1,
  },
  confirmDoneBtn: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-start',
    gap: 2,
    width: '100%',
    padding: '14px 16px',
    background: 'linear-gradient(135deg, #F0FDF4 0%, #DCFCE7 100%)',
    borderRadius: 14,
    border: '2px solid #16A34A44',
    cursor: 'pointer',
    marginBottom: 10,
    boxSizing: 'border-box',
    fontFamily: F.heading,
    fontWeight: F.weights.bold,
    fontSize: F.sizes.md,
    color: '#16A34A',
    textAlign: 'left',
  },
  confirmDoneSub: {
    fontSize: F.sizes.xs,
    fontWeight: F.weights.regular,
    color: '#4ADE80',
    fontFamily: F.body,
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
  loadingText: {
    textAlign: 'center',
    color: C.textMuted,
    padding: 32,
    position: 'relative',
    zIndex: 1,
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
