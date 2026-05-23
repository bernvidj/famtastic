// ============================================
// FamTastic — priceDb.js
// Lokal prisdatabas för uppskattade matpriser (SEK)
// Källa: ungefärliga svenska butikspriser 2024-2025
// Format: [min, max] i kronor per typisk enhet
// ============================================

const PRICE_DB = {
  // ── Mejeri ────────────────────────────────
  'mjölk':            [14, 18],
  'mellanmjölk':      [14, 18],
  'lättmjölk':        [13, 17],
  'standardmjölk':    [15, 19],
  'filmjölk':         [16, 20],
  'yoghurt':          [14, 22],
  'grädde':           [16, 24],
  'vispgrädde':       [18, 26],
  'matlagningsgrädde':[16, 22],
  'crème fraiche':    [16, 22],
  'smör':             [28, 38],
  'margarin':         [18, 28],
  'ost':              [28, 55],
  'prästost':         [28, 40],
  'cheddar':          [32, 48],
  'mozzarella':       [22, 36],
  'kvarg':            [16, 28],
  'ägg':              [22, 36],
  'äggkartongen':     [22, 36],
  'parmesan':         [40, 65],
  'fetaost':          [32, 55],
  'cottage cheese':   [18, 28],

  // ── Frukt & grönt ─────────────────────────
  'äpple':            [12, 22],
  'äpplen':           [12, 22],
  'banan':            [8, 15],
  'bananer':          [8, 15],
  'apelsin':          [10, 18],
  'apelsiner':        [10, 18],
  'citron':           [8, 14],
  'citroner':         [8, 14],
  'lime':             [6, 12],
  'tomat':            [14, 28],
  'tomater':          [14, 28],
  'gurka':            [10, 18],
  'sallad':           [12, 22],
  'isbergssallad':    [12, 20],
  'paprika':          [14, 28],
  'lök':              [8, 16],
  'gul lök':          [8, 14],
  'rödlök':           [10, 18],
  'vitlök':           [8, 14],
  'potatis':          [14, 24],
  'morötter':         [8, 16],
  'morot':            [8, 16],
  'broccoli':         [16, 28],
  'blomkål':          [18, 32],
  'vitkål':           [12, 22],
  'spenat':           [18, 28],
  'majs':             [6, 14],
  'avokado':          [10, 20],
  'lime':             [6, 12],
  'jordgubbar':       [20, 45],
  'blåbär':           [22, 40],
  'hallon':           [22, 45],
  'vindruvor':        [22, 38],
  'mango':            [18, 32],
  'ananas':           [22, 38],
  'päron':            [12, 22],

  // ── Kött & fisk ───────────────────────────
  'kycklingfilé':     [55, 95],
  'kyckling':         [40, 80],
  'kycklinglår':      [35, 65],
  'köttfärs':         [45, 75],
  'nötfärs':          [55, 85],
  'fläskfärs':        [38, 58],
  'fläskkotlett':     [45, 75],
  'fläskfilé':        [55, 90],
  'bacon':            [28, 48],
  'korv':             [22, 45],
  'prinskorv':        [24, 38],
  'falukorv':         [22, 35],
  'lax':              [65, 110],
  'laxfilé':          [65, 110],
  'torsk':            [55, 95],
  'räkor':            [45, 85],
  'tonfisk':          [18, 32],
  'sardiner':         [14, 24],
  'makrill':          [18, 30],
  'biff':             [80, 140],
  'oxfilé':           [120, 180],
  'lamm':             [85, 140],
  'skinka':           [32, 55],

  // ── Frys ──────────────────────────────────
  'fryst pizza':      [38, 65],
  'pizza':            [38, 65],
  'frysta grönsaker': [16, 28],
  'fryst lax':        [55, 90],
  'fryst kyckling':   [45, 75],
  'glass':            [28, 55],
  'frysta räkor':     [45, 80],
  'pommes frites':    [18, 32],
  'pommes':           [18, 32],

  // ── Bröd & bageri ─────────────────────────
  'bröd':             [18, 38],
  'formbröd':         [18, 32],
  'knäckebröd':       [18, 32],
  'vitt bröd':        [18, 32],
  'grovt bröd':       [22, 38],
  'fralla':           [4, 10],
  'frallor':          [16, 28],
  'croissant':        [8, 18],
  'bagel':            [6, 14],
  'pita':             [14, 24],
  'wraps':            [16, 28],
  'tortilla':         [18, 32],
  'tortillas':        [18, 32],

  // ── Skafferi ──────────────────────────────
  'pasta':            [12, 22],
  'spagetti':         [12, 22],
  'ris':              [14, 28],
  'basmatiris':       [18, 32],
  'mjöl':             [14, 22],
  'vetemjöl':         [14, 22],
  'socker':           [18, 28],
  'salt':             [8, 16],
  'peppar':           [12, 24],
  'olja':             [28, 55],
  'olivolja':         [45, 85],
  'rapsolja':         [28, 45],
  'vinäger':          [14, 28],
  'ketchup':          [18, 32],
  'senap':            [14, 26],
  'majonnäs':         [22, 38],
  'soja':             [16, 28],
  'buljong':          [16, 28],
  'tomatkross':       [8, 16],
  'konserverade tomater': [8, 16],
  'kikärtor':         [10, 18],
  'linser':           [10, 18],
  'bönor':            [10, 18],
  'havregryn':        [18, 30],
  'müsli':            [28, 48],
  'cornflakes':       [22, 38],
  'honung':           [38, 65],
  'sylt':             [22, 38],
  'nutella':          [38, 55],
  'jordnötssmör':     [28, 48],
  'choklad':          [18, 38],
  'kaffe':            [55, 95],
  'te':               [25, 45],

  // ── Dryck ─────────────────────────────────
  'juice':            [18, 35],
  'apelsinjuice':     [18, 35],
  'läsk':             [14, 28],
  'coca-cola':        [14, 28],
  'cola':             [14, 28],
  'vatten':           [8, 18],
  'mineralvatten':    [8, 18],
  'öl':               [14, 28],
  'vin':              [75, 130],
  'lemonad':          [14, 26],
  'smoothie':         [22, 40],

  // ── Hygien ────────────────────────────────
  'tandkräm':         [18, 38],
  'tandborste':       [18, 38],
  'schampo':          [28, 65],
  'balsam':           [28, 65],
  'tvål':             [14, 32],
  'duschgel':         [22, 45],
  'deodorant':        [28, 55],
  'toalettpapper':    [28, 55],
  'toapapper':        [28, 55],
  'hushållspapper':   [22, 45],
  'diskmedel':        [18, 35],
  'tvättmedel':       [55, 95],
  'rengöringsmedel':  [18, 42],
  'blöjor':           [85, 140],
  'mensartiklar':     [28, 55],
};

// Fallback per kategori (om varan inte finns i databasen)
const CATEGORY_FALLBACK = {
  'Mejeri':          [18, 32],
  'Frukt & grönt':   [12, 24],
  'Kött & fisk':     [55, 95],
  'Frys':            [28, 55],
  'Bröd':            [18, 35],
  'Skafferi':        [18, 38],
  'Dryck':           [16, 32],
  'Hygien':          [22, 45],
  'Övrigt':          [15, 35],
};

/**
 * Slår upp ungefärligt pris för en vara.
 * Returnerar [min, max] i SEK.
 * Matchar på exakt namn, delvis namn (lowercase), annars kategori-fallback.
 */
export function lookupPrice(name, category = 'Övrigt') {
  const key = name.toLowerCase().trim();

  // Exakt match
  if (PRICE_DB[key]) return PRICE_DB[key];

  // Partiell match — letar om något DB-nyckelord finns i varunamnet
  for (const [dbKey, price] of Object.entries(PRICE_DB)) {
    if (key.includes(dbKey) || dbKey.includes(key)) return price;
  }

  // Kategori-fallback
  return CATEGORY_FALLBACK[category] || CATEGORY_FALLBACK['Övrigt'];
}

/**
 * Beräknar uppskattad totalkostnad för en lista av varor.
 * items: [{ name, quantity, category, checked }]
 * Returnerar { min, max, perItem: [{ id, min, max }] }
 */
export function estimateListCost(items) {
  let totalMin = 0;
  let totalMax = 0;
  const perItem = {};

  for (const item of items) {
    if (item.checked) continue; // räkna bara avbockade
    const [min, max] = lookupPrice(item.name, item.category);

    // Tolka mängd: "2 st", "3", "500g" → multiplicera om heltal
    let multiplier = 1;
    if (item.quantity) {
      const parsed = parseInt(item.quantity, 10);
      if (!isNaN(parsed) && parsed > 0 && parsed <= 20) {
        multiplier = parsed;
      }
    }

    const itemMin = min * multiplier;
    const itemMax = max * multiplier;
    totalMin += itemMin;
    totalMax += itemMax;
    perItem[item.id] = [itemMin, itemMax];
  }

  return { min: Math.round(totalMin), max: Math.round(totalMax), perItem };
}

/**
 * Formatterar ett prisintervall som "ca 20–35 kr"
 */
export function formatPrice(min, max) {
  if (min === max) return `ca ${min} kr`;
  return `ca ${min}–${max} kr`;
}
