// ============================================
// FamTastic — AllowanceRow (weekly allowance per child)
// ============================================

import React, { useState, useEffect } from 'react';
import { Save } from 'lucide-react';
import { C, F, S, formatKr } from '../data';

const WEEKDAY_LABELS = ['Måndag','Tisdag','Onsdag','Torsdag','Fredag','Lördag','Söndag'];

export function AllowanceRow({ child, rule, onSave, saving }) {
  const [amount, setAmount] = useState(rule ? (rule.base_amount / 100).toString() : '');
  const [payday, setPayday] = useState(rule ? rule.payday : 6);

  useEffect(() => {
    if (rule) {
      setAmount((rule.base_amount / 100).toString());
      setPayday(rule.payday);
    }
  }, [rule]);

  return (
    <div style={styles.card}>
      <div style={styles.header}>
        <span style={styles.name}>{child.avatar} {child.name}</span>
        {rule && <span style={styles.current}>{formatKr(rule.base_amount)}/vecka</span>}
      </div>
      <div style={styles.row}>
        <div style={{ flex: 1 }}>
          <label style={styles.label}>Belopp (kr/vecka)</label>
          <input
            type="number"
            value={amount}
            onChange={e => setAmount(e.target.value)}
            placeholder="50"
            min="0"
            style={S.input}
          />
        </div>
        <div style={{ flex: 1 }}>
          <label style={styles.label}>Utbetalningsdag</label>
          <select
            value={payday}
            onChange={e => setPayday(Number(e.target.value))}
            style={styles.select}
          >
            {WEEKDAY_LABELS.map((d, i) => (
              <option key={i} value={i}>{d}</option>
            ))}
          </select>
        </div>
      </div>
      <button
        onClick={() => onSave(child.id, amount, payday)}
        disabled={saving || !amount}
        style={{
          ...S.button, ...S.buttonPrimary, width: '100%', marginTop: 8,
          opacity: saving || !amount ? 0.5 : 1,
        }}
      >
        <Save size={14} /> Spara veckopeng
      </button>
    </div>
  );
}

const styles = {
  card: {
    padding: 12,
    background: C.bg,
    borderRadius: 10,
    marginBottom: 8,
    border: `1px solid ${C.borderLight}`,
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
    fontSize: F.sizes.sm,
    fontWeight: F.weights.bold,
    fontFamily: F.heading,
    color: C.text,
  },
  name: {},
  current: { fontSize: F.sizes.xs, color: C.textMuted },
  row: { display: 'flex', gap: 8, alignItems: 'flex-end' },
  label: {
    display: 'block',
    fontSize: F.sizes.xs,
    fontWeight: F.weights.semi,
    color: C.textMuted,
    marginBottom: 4,
  },
  select: {
    width: '100%',
    padding: '10px 12px',
    borderRadius: 12,
    border: `2px solid ${C.border}`,
    fontSize: F.sizes.sm,
    fontFamily: F.body,
    background: C.bgCard,
    boxSizing: 'border-box',
  },
};
