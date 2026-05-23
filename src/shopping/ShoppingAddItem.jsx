// ============================================
// FamTastic — ShoppingAddItem
// Formulär för att lägga till vara på lista
// Placeras i: src/shopping/ShoppingAddItem.jsx
// ============================================

import React from 'react';
import { C, F, S } from '../data';
import { lookupPrice, formatPrice } from '../priceDb';
import { Plus } from 'lucide-react';

const CATEGORIES = [
  'Mejeri', 'Frukt & grönt', 'Kött & fisk', 'Frys',
  'Bröd', 'Skafferi', 'Dryck', 'Hygien', 'Övrigt',
];

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

export function ShoppingAddItem({ onAdd, onCancel }) {
  const [name, setName]   = React.useState('');
  const [qty,  setQty]    = React.useState('');
  const [cat,  setCat]    = React.useState('Övrigt');

  const previewPrice = name.trim() ? lookupPrice(name.trim(), cat) : null;

  function handleAdd() {
    if (!name.trim()) return;
    onAdd({ name: name.trim(), quantity: qty.trim() || null, category: cat });
    setName('');
    setQty('');
    setCat('Övrigt');
  }

  return (
    <div style={styles.form}>
      <input
        type="text"
        placeholder="Vara, t.ex. Mjölk"
        value={name}
        onChange={e => setName(e.target.value)}
        style={{ ...S.input }}
        autoFocus
        onKeyDown={e => e.key === 'Enter' && handleAdd()}
      />

      {previewPrice && (
        <div style={styles.pricePreview}>
          <span style={{ fontSize: 12, color: C.textMuted }}>Ungefärligt pris:</span>
          <PriceChip min={previewPrice[0]} max={previewPrice[1]} />
        </div>
      )}

      <div style={styles.row2}>
        <input
          type="text"
          placeholder="Mängd (valfritt)"
          value={qty}
          onChange={e => setQty(e.target.value)}
          style={styles.qtyInput}
        />
        <select
          value={cat}
          onChange={e => setCat(e.target.value)}
          style={styles.catSelect}
        >
          {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>

      <div style={styles.actions}>
        <button
          onClick={onCancel}
          style={{ ...S.button, ...S.buttonSecondary, flex: 1 }}
        >
          Avbryt
        </button>
        <button
          onClick={handleAdd}
          disabled={!name.trim()}
          style={{ ...S.button, ...S.buttonPrimary, flex: 1, opacity: name.trim() ? 1 : 0.5 }}
        >
          <Plus size={15} /> Lägg till
        </button>
      </div>
    </div>
  );
}

const styles = {
  form: {
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
  row2: {
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
  actions: {
    display: 'flex',
    gap: 8,
    marginTop: 10,
  },
};
