// ============================================
// FamTastic — consolidate.js
// Normaliserar och slår ihop varor som menar samma sak.
// "en burk majs" + "1 st majs" + "200g majs" -> en post.
// Placeras i: src/consolidate.js
//
// Pipeline (3 lager):
//   1. Normalisering  — text -> { quantity, unit, ingredient }
//   2. Kanonisering    — synonymlexikon mappar varianter -> kanonisk vara
//   3. Fuzzy skyddsnät — Levenshtein för stavfel, konservativ tröskel
//
// Designprincip: konservativ. Hellre lämna två rader oslagna än slå ihop
// fel (t.ex. grädde/gräddfil). Osäkra fall flaggas med needsReview.
// ============================================

// ─── LAGER 1 — Normalisering ────────────────────────────────────────────────

const FILLER = new Set([
  'en', 'ett', 'st', 'stycken', 'styck', 'ca', 'cirka', 'några',
  'lite', 'paket', 'förp', 'förpackning',
]);

// Behållarord -> ungefärlig basmängd. Grovt; exakthet kommer ev. via prisdata.
const CONTAINER_TO_BASE = {
  burk:    { qty: 200,  unit: 'g'  },
  burkar:  { qty: 200,  unit: 'g'  },
  konserv: { qty: 200,  unit: 'g'  },
  flaska:  { qty: 500,  unit: 'ml' },
  flaskor: { qty: 500,  unit: 'ml' },
  tetra:   { qty: 1000, unit: 'ml' },
  påse:    { qty: 1,    unit: 'st' },
  påsar:   { qty: 1,    unit: 'st' },
};

const UNIT_ALIASES = {
  g: 'g', gram: 'g', kg: 'g', hg: 'g',
  ml: 'ml', milliliter: 'ml', dl: 'ml', cl: 'ml', l: 'ml', liter: 'ml',
  st: 'st', stycken: 'st', styck: 'st',
};

const UNIT_SCALE = {
  kg: 1000, hg: 100, g: 1,
  l: 1000, dl: 100, cl: 10, ml: 1, liter: 1000, st: 1,
};

/**
 * Delar upp en rå varutext i { raw, quantity, unit, ingredient }.
 * quantity är i basenhet (g / ml / st) eller null om ospecificerad.
 */
export function normalize(raw) {
  let s = (raw || '').trim().toLowerCase();
  let quantity = null;
  let unit = null;

  // Tal + ev. enhet: "200g", "1 kg", "2 st", "1,5 l"
  const m = s.match(/(\d+(?:[.,]\d+)?)\s*([a-zåäö]+)?/);
  let matchedNumericUnit = false;
  if (m) {
    const num = parseFloat(m[1].replace(',', '.'));
    const rawUnit = m[2] || '';
    if (rawUnit && UNIT_ALIASES[rawUnit]) {
      quantity = num * (UNIT_SCALE[rawUnit] || 1);
      unit = UNIT_ALIASES[rawUnit];
      matchedNumericUnit = true;
    } else if (CONTAINER_TO_BASE[rawUnit]) {
      const c = CONTAINER_TO_BASE[rawUnit];
      quantity = num * c.qty;
      unit = c.unit;
      matchedNumericUnit = true;
    } else {
      quantity = num;       // bara ett tal -> antal stycken
      unit = 'st';
    }
    s = matchedNumericUnit ? s.replace(m[0], ' ') : s.replace(m[1], ' ');
  }

  // Behållarord ("en burk majs", "2 burkar majs")
  for (const word in CONTAINER_TO_BASE) {
    const conv = CONTAINER_TO_BASE[word];
    const re = new RegExp('\\b' + word + '\\b');
    if (re.test(s)) {
      const count = (unit === 'st' && quantity != null) ? quantity : (quantity != null ? quantity : 1);
      quantity = count * conv.qty;
      unit = conv.unit;
      s = s.replace(re, ' ');
    }
  }

  // Ta bort fyllnadsord och skräptecken
  const tokens = s
    .split(/\s+/)
    .map(t => t.replace(/[^0-9a-zåäö]/gi, ''))
    .filter(t => t.length > 0 && !FILLER.has(t));

  return { raw, quantity, unit, ingredient: tokens.join(' ').trim() };
}

// ─── LAGER 2 — Synonymlexikon / kanonisering ─────────────────────────────────
//
// Mappar varianter -> kanonisk nyckel. Den kanoniska nyckeln matchar avsiktligt
// nycklarna i priceDb.js så prisuppslagning blir exakt.
// Listan börjar litet; väx den över tid med era vanligaste varor.

const SYNONYMS = {
  // majs
  majs: 'majs', majskorn: 'majs', sockermajs: 'majs', bonduelle: 'majs',
  // grädde (gräddfil hålls AVSIKTLIGT separat)
  grädde: 'grädde', vispgrädde: 'vispgrädde', matlagningsgrädde: 'matlagningsgrädde',
  gräddfil: 'crème fraiche', crèmefraiche: 'crème fraiche', cremefraiche: 'crème fraiche',
  // mjölk
  mjölk: 'mjölk', standardmjölk: 'standardmjölk', mellanmjölk: 'mellanmjölk', lättmjölk: 'lättmjölk',
  // tomat
  tomat: 'tomat', tomater: 'tomat',
  krossadetomater: 'tomatkross', tomatkross: 'tomatkross', konserveradetomater: 'konserverade tomater',
  // lök
  lök: 'lök', gullök: 'gul lök', rödlök: 'rödlök', vitlök: 'vitlök',
};

/** Returnerar kanonisk nyckel eller null om inte i lexikonet. */
export function canonicalize(ingredient) {
  if (!ingredient) return null;
  if (SYNONYMS[ingredient]) return SYNONYMS[ingredient];
  const joined = ingredient.replace(/\s+/g, '');
  if (SYNONYMS[joined]) return SYNONYMS[joined];
  for (const word of ingredient.split(/\s+/)) {
    if (SYNONYMS[word]) return SYNONYMS[word];
  }
  return null;
}

// ─── LAGER 3 — Fuzzy skyddsnät (Levenshtein) ──────────────────────────────────

function levenshtein(a, b) {
  const dp = Array.from({ length: a.length + 1 }, () => new Array(b.length + 1).fill(0));
  for (let i = 0; i <= a.length; i++) dp[i][0] = i;
  for (let j = 0; j <= b.length; j++) dp[0][j] = j;
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + cost);
    }
  }
  return dp[a.length][b.length];
}

function similarity(a, b) {
  if (!a.length && !b.length) return 1;
  return 1 - levenshtein(a, b) / Math.max(a.length, b.length);
}

const AUTO_MERGE = 0.86;   // hög likhet = säker ihopslagning
const REVIEW_FLOOR = 0.70; // mellanzon = flagga för granskning

/**
 * Matchar en okänd ingrediens mot kända kanoniska nycklar via stränglikhet.
 * Returnerar { canonical, needsReview, reason }.
 */
export function fuzzyMatch(ingredient, knownCanonicals) {
  let best = '';
  let bestScore = 0;
  let bestDist = Infinity;
  for (const c of knownCanonicals) {
    const score = similarity(ingredient, c);
    if (score > bestScore) {
      bestScore = score;
      best = c;
      bestDist = levenshtein(ingredient, c);
    }
  }

  // Auto-merge vid hög likhet, ELLER vid bara 1 teckens skillnad på ord >=5 tecken.
  // Det fångar typiska stavfel ("majjs"->"majs", "banann"->"banan") som annars
  // hamnar strax under procenttröskeln, utan att öppna för helt olika varor.
  const isLikelyTypo = bestDist <= 1 && ingredient.length >= 4;
  if (bestScore >= AUTO_MERGE || isLikelyTypo) {
    return { canonical: best, needsReview: false };
  }
  if (bestScore >= REVIEW_FLOOR) {
    return {
      canonical: best,
      needsReview: true,
      reason: 'Osäker matchning mot "' + best + '" (' + Math.round(bestScore * 100) + '%)',
    };
  }
  return { canonical: ingredient, needsReview: true, reason: 'Okänd vara' };
}

// ─── Publik resolver: ett varunamn -> kanonisk nyckel ─────────────────────────

/**
 * Löser ett varunamn till en kanonisk nyckel via alla tre lager.
 * knownKeys: lista av kända nycklar att fuzzy-matcha mot (t.ex. priceDb-nycklar).
 * Returnerar { canonical, needsReview, reason, quantity, unit }.
 */
export function resolveItem(name, knownKeys = []) {
  const norm = normalize(name);
  let canonical = canonicalize(norm.ingredient);
  let needsReview = false;
  let reason;

  if (!canonical) {
    if (knownKeys.length > 0) {
      const fz = fuzzyMatch(norm.ingredient, knownKeys);
      canonical = fz.canonical;
      needsReview = fz.needsReview;
      reason = fz.reason;
    } else {
      canonical = norm.ingredient; // inget att matcha mot
      needsReview = true;
      reason = 'Okänd vara';
    }
  }

  return { canonical, needsReview, reason, quantity: norm.quantity, unit: norm.unit };
}

// ─── Konsolidering av en hel lista ────────────────────────────────────────────

/**
 * Slår ihop varor som löser till samma kanoniska nyckel.
 * items: appens shopping_items [{ id, name, quantity, category, checked, ... }]
 * knownKeys: kända nycklar för fuzzy-matchning (priceDb-nycklar).
 *
 * Returnerar en lista av grupper:
 *   { canonical, display, category, totalByUnit, members: [item...], needsReview, reason }
 * "members" behåller ALLA original-items så inget data tappas och inget raderas.
 */
export function consolidateItems(items, knownKeys = []) {
  const groups = new Map();

  for (const item of (items || [])) {
    const r = resolveItem(item.name, knownKeys);
    const key = r.canonical;

    if (!groups.has(key)) {
      groups.set(key, {
        canonical: key,
        display: capitalize(key),
        category: item.category || 'Övrigt',
        totalByUnit: {},
        members: [],
        needsReview: false,
        reason: undefined,
      });
    }
    const g = groups.get(key);
    g.members.push(item);
    if (r.needsReview) { g.needsReview = true; g.reason = r.reason; }
    if (r.quantity != null && r.unit) {
      g.totalByUnit[r.unit] = (g.totalByUnit[r.unit] || 0) + r.quantity;
    }
  }

  return Array.from(groups.values());
}

function capitalize(s) {
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
}

/** Formaterar en summerad mängd snyggt: 1200 g -> "1,2 kg", 500 ml -> "5 dl". */
export function formatTotalQuantity(totalByUnit) {
  const parts = [];
  for (const unit in totalByUnit) {
    const v = totalByUnit[unit];
    if (unit === 'g') {
      parts.push(v >= 1000 ? String(v / 1000).replace('.', ',') + ' kg' : v + ' g');
    } else if (unit === 'ml') {
      if (v >= 1000) parts.push(String(v / 1000).replace('.', ',') + ' l');
      else if (v >= 100 && v % 100 === 0) parts.push((v / 100) + ' dl');
      else parts.push(v + ' ml');
    } else {
      parts.push(v + ' st');
    }
  }
  return parts.join(' + ');
}
