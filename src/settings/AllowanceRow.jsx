// ============================================
// FamTastic — AllowanceRow (weekly allowance per child)
// ============================================

import React, { useState, useEffect } from 'react';
import { Save } from 'lucide-react';
import { C, F, S, formatKr } from '../data';

const WEEKDAY_LABELS = ['Måndag','Tisdag','Onsdag','Torsdag','Fredag','Lördag','Söndag'];

export function AllowanceRow({ child, rule, onSave, saving }) {
  const [amount,        setAmount]        = useState(rule ? (rule.base_amount / 100).toString() : '');
  const [payday,        setPayday]        = useState(rule ? rule.payday : 4); // 4 = Fredag
  const [autoAllowance, setAutoAllowance] = useState(rule ? !!rule.auto_allowance : false);

  useEffect(() => {
    if (rule) {
      setAmount((rule.base_amount / 100).toString());
      setPayday(rule.payday);
      setAutoAllowance(!!rule.auto_allowance);
    }
  }, [rule]);

  return (
    <div style={styles.card}>
      <style>{`
        @media (max-width: 400px) {
          .allowance-row { flex-direction: column !important; }
          .allowance-input { width: 100% !important; }
        }
      `}</style>
      <div style={styles.header}>
        <span style={styles.name}>{child.avatar} {child.name}</span>
        {rule && <span style={styles.current}>{formatKr(rule.base_amount)}/vecka</span>}
      </div>
      <div className="allowance-row" style={styles.row}>
        <div style={{ flex: 1 }}>
          <label style={styles.label}>Belopp (kr/vecka)</label>
          <input
            type="number"
            value={amount}
            onChange={e => setAmount(e.target.value)}
            placeholder="50"
            min="0"
            className="allowance-input"
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

      {/* Automatisk utbetalning */}
      <div style={styles.autoRow}>
        <div style={{ flex: 1 }}>
          <span style={styles.autoLabel}>
            {autoAllowance ? '⚡ Automatisk utbetalning' : '🖐️ Manuell utbetalning'}
          </span>
          <span style={styles.autoDesc}>
            {autoAllowance
              ? `Betalas ut automatiskt varje ${WEEKDAY_LABELS[payday].toLowerCase()}`
              : 'Du betalar ut manuellt från startsidan'}
          </span>
        </div>
        <button
          onClick={() => setAutoAllowance(v => !v)}
          style={{
            width: 48, height: 26, borderRadius: 13, border: 'none',
            background: autoAllowance ? C.secondary : C.border,
            cursor: 'pointer', position: 'relative', flexShrink: 0,
            transition: 'background 0.2s', WebkitTapHighlightColor: 'transparent',
          }}
        >
          <div style={{
            width: 22, height: 22, borderRadius: 11, background: '#fff',
            position: 'absolute', top: 2,
            transform: autoAllowance ? 'translateX(22px)' : 'translateX(2px)',
            transition: 'transform 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
          }} />
        </button>
      </div>

      <button
        onClick={() => onSave(child.id, amount, payday, autoAllowance)}
        disabled={saving || !amount}
        style={{
          ...S.button, ...S.buttonPrimary, width: '100%', marginTop: 8,
          opacity: saving || !amount ? 0.5 : 1, minHeight: 44,
          WebkitTapHighlightColor: 'transparent',
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
