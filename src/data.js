// ============================================
// FamTastic — Constants, colors, helpers
// Duolingo-vibe design tokens
// ============================================

// Topbar height — used by all view sticky headers (top: TOPBAR_H)
export const TOPBAR_H = 52;

// Color tokens
export const C = {
  // Primary palette
  primary: '#FF7A59',       // FamTastic korall
  primaryLight: '#FFE8C2',  // Beige/aprikost bg
  primaryDark: '#E8623A',   // Hover/active
  secondary: '#3CB4A6',     // FamTastic teal
  secondaryLight: '#E1F5F3',
  secondaryDark: '#2A9089',
  accent: '#FBBF24',        // Sunny yellow
  accentLight: '#FFFBEB',
  purple: '#8B5CF6',        // Fun purple
  purpleLight: '#F5F3FF',

  // Backgrounds
  bg: '#FFFBF5',            // Varm vit
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
  successDark: '#16A34A',
  error: '#EF4444',
  errorLight: '#FEF2F2',
  warning: '#F59E0B',

  // Member colors (assigned to family members)
  memberColors: [
    '#FF7A59', '#3CB4A6', '#8B5CF6', '#EC4899',
    '#3B82F6', '#22C55E', '#F59E0B', '#EF4444',
  ],
};

// Font tokens — Duolingo-vibe: bigger, bolder
export const F = {
  heading: "'Nunito', system-ui, sans-serif",
  body: "'Nunito', system-ui, -apple-system, sans-serif",
  sizes: {
    xs: 12,
    sm: 14,
    md: 16,
    lg: 18,      // was 20, tightened
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

// Common styles (reusable) — Duolingo-inspired
export const S = {
  card: {
    background: C.bgCard,
    borderRadius: 16,
    padding: 16,
    border: `1.5px solid ${C.borderLight}`,
    boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
  },
  cardHover: {
    boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
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
    minHeight: 48,
  },
  buttonPrimary: {
    background: C.primary,
    color: '#fff',
  },
  buttonSecondary: {
    background: C.primaryLight,
    color: C.primary,
  },
  buttonSuccess: {
    background: C.success,
    color: '#fff',
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
    minHeight: 48,
  },
  container: {
    maxWidth: 480,
    margin: '0 auto',
    padding: '24px 16px',
  },
  sectionLabel: {
    fontSize: F.sizes.xs,
    fontWeight: F.weights.bold,
    fontFamily: F.heading,
    color: C.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    margin: '0 0 8px',
  },
  badge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 4,
    padding: '3px 10px',
    borderRadius: 99,
    fontSize: F.sizes.xs,
    fontWeight: F.weights.bold,
    fontFamily: F.heading,
  },
  emptyState: {
    textAlign: 'center',
    padding: '32px 20px',
  },
};

// Difficulty labels (Swedish)
export const DIFFICULTY = {
  easy: { label: 'Lätt', color: C.success, bg: C.successLight, emoji: '🟢' },
  medium: { label: 'Medel', color: C.accent, bg: C.accentLight, emoji: '🟡' },
  hard: { label: 'Svårt', color: C.error, bg: C.errorLight, emoji: '🔴' },
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
  'Mejeri', 'Frukt & grönt', 'Kött & fisk', 'Frys',
  'Bröd', 'Skafferi', 'Dryck', 'Hygien', 'Övrigt',
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

// Helper: greeting based on time of day
export function getGreeting(name) {
  const h = new Date().getHours();
  if (h < 10) return `God morgon, ${name}! ☀️`;
  if (h < 17) return `Hej ${name}! 👋`;
  return `God kväll, ${name}! 🌙`;
}

// Helper: streak emoji based on count
export function streakEmoji(count) {
  if (count >= 14) return '💎';
  if (count >= 7) return '🔥';
  if (count >= 3) return '⚡';
  return '✨';
}
