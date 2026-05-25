// ============================================
// FamTastic — ShoppingItemList
// Varuraderna med tre-status: active / handlat / finns_hemma / ej_aktuellt
// Placeras i: src/shopping/ShoppingItemList.jsx
// ============================================

import React, { useState } from 'react';
import { C, F } from '../data';
import { estimateListCost, formatPrice } from '../priceDb';
import { Trash2, ChevronDown, ChevronUp } from 'lucide-react';

// ─── Status helpers ────────────────────────────────────────────────────────────
const STATUS_CONFIG = {
  active:      { icon: null,  label: 'Inte handlat', color: C.border,    bg: 'transparent' },
  handlat:     { icon: '✅',  label: 'Handlat',      color: '#16A34A',   bg: '#F0FDF4' },
  finns_hemma: { icon: '🏠',  label: 'Finns hemma',  color: '#2563EB',   bg: '#EFF6FF' },
  ej_aktuellt: { icon: '✕',   label: 'Ej aktuellt',  color: C.textMuted, bg: C.bg },
};

function StatusDot({ status }) {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.active;
  if (status === 'active' || !status) {
    return (
      <div style={{
        width: 22, height: 22, borderRadius: 11,
        border: `2px solid ${C.border}`,
        flexShrink: 0,
      }} />
    );
  }
  return (
    <div style={{
      width: 22, height: 22, borderRadius: 11,
      background: cfg.bg,
      border: `2px solid ${cfg.color}33`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: 12, flexShrink: 0,
      color: cfg.color, fontWeight: 700,
    }}>
      {cfg.icon === '✕' ? '✕' : cfg.icon}
    </div>
  );
}

function PriceChip({ min, max }) {
  return (
    <span style={{
      fontSize: 11, fontWeight: 700,
      color: C.secondary, background: '#E1F5F3',
      borderRadius: 8, padding: '2px 6px',
      whiteSpace: 'nowrap', flexShrink: 0,
    }}>
      {formatPrice(min, max)}
    </span>
  );
}

// ─── Huvud-komponent ──────────────────────────────────────────────────────────
export function ShoppingItemList({ items, members, onPick, onRemove }) {
  const [showHandled, setShowHandled] = useState(false);

  const activeItems  = items.filter(i => !i.item_status || i.item_status === 'active');
  const handledItems = items.filter(i => i.item_status && i.item_status !== 'active');

  const costEstimate = estimateListCost(activeItems);

  // Gruppera aktiva per kategori
  const groups = {};
  activeItems.forEach(item => {
    const cat = item.category || 'Övrigt';
    if (!groups[cat]) groups[cat] = [];
    groups[cat].push(item);
  });

  if (activeItems.length === 0 && handledItems.length === 0) {
    return (
      <div style={styles.emptyList}>
        <span style={{ fontSize: 36 }}>✨</span>
        <p style={styles.emptyListText}>Listan är tom — lägg till varor!</p>
      </div>
    );
  }

  return (
    <>
      {/* ── Aktiva varor per kategori ── */}
      {Object.entries(groups).map(([cat, catItems]) => (
        <div key={cat}>
          {Object.keys(groups).length > 1 && (
            <h3 style={styles.catTitle}>{cat}</h3>
          )}
          {catItems.map(item => {
            const itemPrice = costEstimate.perItem[item.id];
            const addedBy   = members && item.added_by
              ? members.find(m => m.id === item.added_by) : null;
            const byChild   = addedBy && addedBy.role === 'child';
            return (
              <button
                key={item.id}
                onClick={() => onPick(item)}
                style={styles.itemRow}
              >
                <StatusDot status={item.item_status} />
                <div style={styles.itemContent}>
                  <span style={styles.itemName}>{item.name}</span>
                  {item.quantity && (
                    <span style={styles.itemQty}>{item.quantity}</span>
                  )}
                  {item.from_meal_plan && <span style={{ fontSize: 12 }}>🍽️</span>}
                </div>
                {byChild && (
                  <span
                    title={`Föreslagen av ${addedBy.name}`}
                    style={{
                      width: 24, height: 24, borderRadius: 12,
                      background: addedBy.color || C.primaryLight,
                      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 13, flexShrink: 0,
                    }}
                  >
                    {addedBy.avatar}
                  </span>
                )}
                {itemPrice && <PriceChip min={itemPrice[0]} max={itemPrice[1]} />}
                <div
                  onClick={e => { e.stopPropagation(); onRemove(item.id); }}
                  style={styles.removeBtn}
                >
                  <Trash2 size={14} color={C.textMuted} />
                </div>
              </button>
            );
          })}
        </div>
      ))}

      {/* ── Totalsumma-kort ── */}
      {activeItems.length > 0 && costEstimate.min > 0 && (
        <div style={styles.totalCard}>
          <span style={styles.totalLabel}>Uppskattad totalkostnad</span>
          <span style={styles.totalAmount}>
            {formatPrice(costEstimate.min, costEstimate.max)}
          </span>
        </div>
      )}

      {/* ── Hanterade varor (collapsible) ── */}
      {handledItems.length > 0 && (
        <div style={styles.handledSection}>
          <button
            onClick={() => setShowHandled(s => !s)}
            style={styles.handledToggle}
          >
            {showHandled ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            Hanterade ({handledItems.length})
          </button>

          {showHandled && (
            <div>
              {handledItems.map(item => {
                const cfg = STATUS_CONFIG[item.item_status] || STATUS_CONFIG.handlat;
                return (
                  <button
                    key={item.id}
                    onClick={() => onPick(item)}
                    style={{ ...styles.itemRow, opacity: 0.65, background: cfg.bg }}
                  >
                    <StatusDot status={item.item_status} />
                    <div style={styles.itemContent}>
                      <span style={{
                        ...styles.itemName,
                        textDecoration: item.item_status === 'ej_aktuellt' ? 'line-through' : 'none',
                        color: item.item_status === 'ej_aktuellt' ? C.textMuted : C.text,
                      }}>
                        {item.name}
                      </span>
                      <span style={{ fontSize: 11, color: cfg.color, fontWeight: 600, flexShrink: 0 }}>
                        {cfg.label}
                      </span>
                    </div>
                    <div
                      onClick={e => { e.stopPropagation(); onRemove(item.id); }}
                      style={styles.removeBtn}
                    >
                      <Trash2 size={14} color={C.textMuted} />
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}
    </>
  );
}

const styles = {
  emptyList: {
    textAlign: 'center',
    padding: '28px 20px',
  },
  emptyListText: {
    fontSize: F.sizes.sm,
    color: C.textMuted,
    marginTop: 8,
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
    width: '100%',
    boxSizing: 'border-box',
    cursor: 'pointer',
    textAlign: 'left',
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
  removeBtn: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    padding: 4,
    flexShrink: 0,
    display: 'flex',
    alignItems: 'center',
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
  handledSection: {
    marginTop: 16,
  },
  handledToggle: {
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
};
