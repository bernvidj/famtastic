// ============================================
// FamTastic — Constants, colors, helpers
// ============================================

// Color tokens
export const C = {
  // Primary palette
  primary: '#F97316',       // Warm coral/orange
  primaryLight: '#FFF7ED',  // Light orange bg
  primaryDark: '#EA580C',   // Hover/active
  secondary: '#14B8A6',     // Teal/mint
  secondaryLight: '#F0FDFA',
  accent: '#FBBF24',        // Sunny yellow
  accentLight: '#FFFBEB',

  // Backgrounds
  bg: '#FFFBF5',            // Warm off-white
  bgCard: '#FFFFFF',
  bgDark: '#1C1917',

  // Text
  text: '#1C1917',
  textMuted: '#78716C',
  textLight: '#A8A29E',

  // Utility
  border: '#E7E5E4',
  borderLight: '#F5F5F4',
  success: '#22C55E',
  successLight: '#F0FDF4',
  error: '#EF4444',
  errorLight: '#FEF2F2',
  warning: '#F59E0B',

  // Member colors (assigned to family members)
  memberColors: [
    '#F97316', // orange
    '#14B8A6', // teal
    '#8B5CF6', // purple
    '#EC4899', // pink
    '#3B82F6', // blue
    '#22C55E', // green
    '#F59E0B', // amber
    '#EF4444', // red
  ],
};

// Font tokens
export const F = {
  heading: "'Nunito', system-ui, sans-serif",
  body: "system-ui, -apple-system, sans-serif",
  sizes: {
    xs: 12,
    sm: 14,
    md: 16,
    lg: 20,
    xl: 24,
    xxl: 32,
    hero: 40,
  },
  weights: {
    normal: 400,
    semi: 600,
    bold: 700,
    extra: 800,
  },
};

// Common styles (reusable)
export const S = {
  card: {
    background: C.bgCard,
    borderRadius: 16,
    padding: 20,
    boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
    border: `1px solid ${C.borderLight}`,
  },
  button: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: '12px 24px',
    borderRadius: 12,
    border: 'none',
    fontSize: F.sizes.md,
    fontWeight: F.weights.bold,
    fontFamily: F.heading,
    cursor: 'pointer',
    transition: 'background 0.15s, transform 0.1s',
  },
  buttonPrimary: {
    background: C.primary,
    color: '#fff',
  },
  buttonSecondary: {
    background: C.primaryLight,
    color: C.primary,
  },
  input: {
    width: '100%',
    padding: '12px 16px',
    borderRadius: 12,
    border: `2px solid ${C.border}`,
    fontSize: F.sizes.md,
    fontFamily: F.body,
    outline: 'none',
    boxSizing: 'border-box',
    transition: 'border-color 0.15s',
  },
  container: {
    maxWidth: 480,
    margin: '0 auto',
    padding: '24px 16px',
  },
};

// Difficulty labels (Swedish)
export const DIFFICULTY = {
  easy: { label: 'Lätt', color: C.success, bg: C.successLight },
  medium: { label: 'Medel', color: C.accent, bg: C.accentLight },
  hard: { label: 'Svårt', color: C.error, bg: C.errorLight },
};

// Chore category icons
export const CATEGORY_ICONS = {
  activity: '⚽',
  school: '📚',
  birthday: '🎂',
  other: '📌',
};

// Shopping categories (Swedish)
export const SHOPPING_CATEGORIES = [
  'Mejeri',
  'Frukt & grönt',
  'Kött & fisk',
  'Frys',
  'Bröd',
  'Skafferi',
  'Dryck',
  'Hygien',
  'Övrigt',
];

// Helper: format öre to kr string
export function formatKr(ore) {
  const kr = Math.abs(ore) / 100;
  const sign = ore < 0 ? '-' : '';
  return `${sign}${kr.toLocaleString('sv-SE', { minimumFractionDigits: 0, maximumFractionDigits: 2 })} kr`;
}

// Helper: today's date as YYYY-MM-DD (local time, not UTC)
export function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// Helper: week number (ISO)
export function getWeekNumber(date) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
}

// Helper: safe array from JSONB (handles {} instead of [])
export function safeArray(val) {
  return Array.isArray(val) ? val : [];
}
