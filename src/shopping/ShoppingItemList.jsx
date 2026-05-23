// ============================================
// FamTastic — ShoppingItemList
// Varuraderna, kategorigruppering, totalkort, avbockade
// Placeras i: src/shopping/ShoppingItemList.jsx
// ============================================

import React, { useState } from 'react';
import { C, F } from '../data';
import { estimateListCost, formatPrice } from '../priceDb';
import { Trash2, Check, X, ChevronDown, ChevronUp } from 'lucide-react';

function PriceChip({ min, max }) {
  return (
    <span style={{
      fontSize: 11,
      fontWeight: 700,
      color: C.secondary,
      background: '#E1F5F3',
      borderRadius: 8,
      padding: '2px 6px',
      whiteSpace: 'nowrap',
      flexShrink: 0,
    }}>
      {formatPrice(min, max)}
    </span>
  );
}

export function ShoppingItemList({ items, members, onToggle, onRemove, onClearChecked }) {
  const [showChecked, setShowChecked] = useState(false);

  const uncheckedItems = items.filter(i => !i.checked);
  const checkedItems   = items.filter(i => i.checked);
  const costEstimate   = estimateListCost(items);
  const hasUnchecked   = uncheckedItems.length > 0;

  // Gruppera avbockade per kategori
  const groups = {};
  uncheckedItems.forEach(item => {
    const cat = item.category || 'Övrigt';
    if (!groups[cat]) groups[cat] = [];
    groups[cat].push(item);
  });

  if (!hasUnchecked && checkedItems.length === 0) {
    return (
      <div style={styles.emptyList}>
        <span style={{ fontSize: 36 }}>✨</span>
        <p style={styles.emptyListText}>Listan är tom — lägg till varor!</p>
      </div>
    );
  }

  return (
    <>
      {/* ── Varor per kategori ── */}
      {Object.entries(groups).map(([cat, catItems]) => (
        <div key={cat}>
          <h3 style={styles.catTitle}>{cat}</h3>
          {catItems.map(item => {
            const itemPrice = costEstimate.perItem[item.id];
            const addedBy   = members && item.added_by ? members.find(m => m.id === item.added_by) : null;
            const byChild   = addedBy && addedBy.role === 'child';
            return (
              <div key={item.id} style={styles.itemRow}>
                <button onClick={() => onToggle(item)} style={styles.itemCheck}>
                  <div style={styles.checkCircle} />
                </button>
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
                <button onClick={() => onRemove(item.id)} style={styles.removeBtn}>
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
            onClick={() => setShowChecked(s => !s)}
            style={styles.checkedToggle}
          >
            {showChecked ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            Avbockade ({checkedItems.length})
          </button>

          {showChecked && (
            <>
              {checkedItems.map(item => (
                <div key={item.id} style={{ ...styles.itemRow, opacity: 0.5 }}>
                  <button onClick={() => onToggle(item)} style={styles.itemCheck}>
                    <Check size={16} color={C.success} />
                  </button>
                  <div style={styles.itemContent}>
                    <span style={{ ...styles.itemName, textDecoration: 'line-through', color: C.textMuted }}>
                      {item.name}
                    </span>
                  </div>
                </div>
              ))}
              <button onClick={onClearChecked} style={styles.clearBtn}>
                <Trash2 size={14} /> Rensa avbockade
              </button>
            </>
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
  removeBtn: {
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
};
