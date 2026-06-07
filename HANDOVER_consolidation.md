# Överlämning till Code — Konsolidering av handlarlista

**Datum:** 2026-06-07
**Av:** Claude (Cowork) → Code
**Mapp:** `Projects/FamTastic`
**Status:** Kod skriven och logik-verifierad. **Bygge ej kört.** Behöver build + deploy.

---

## TL;DR för Code

Jag har byggt in **konsolidering av varor** i handlarlistan — varor som menar
samma sak ("en burk majs", "1 st majs", "200g majs") slås nu ihop till en post,
mängder summeras, och osäkra matchningar flaggas istället för att gissas.

Tre filer berörda. **Verifiera att bygget går igenom och deploya till Vercel.**
Jag kunde inte köra `npm run build` själv (annan miljö), så det är det enda
osäkra steget.

---

## Varför detta gjordes

Användaren (Joacim) vill långsiktigt ha prisjämförelse mellan kedjor (ICA/Coop/
Hemköp) + optimering ("köp dessa på ICA, dessa på Coop"). Första steget mot det
är att appen måste kunna **slå ihop varor som är samma sak** — annars går varken
prisuppslag eller optimering att lita på. Det här är det steget.

Det avslöjade också en befintlig bugg: gamla `lookupPrice()` i `priceDb.js`
använde oriktad `includes`-matchning, som felaktigt parade ihop t.ex. "grädde"
och "gräddfil" (eftersom "grädde" är en delsträng av "gräddfil"). Det är fixat.

---

## Filer som ändrats

### 1. `consolidate.js` — NY FIL (`src/consolidate.js`)

Konsolideringsmotorn. Tre lager:
1. **Normalisering** — `normalize(text)` → `{ quantity, unit, ingredient }`.
   Parsar mängd/enhet ("200g", "1 burk", "2 st"), tar bort fyllnadsord.
2. **Kanonisering** — `canonicalize(ingredient)` mappar varianter via `SYNONYMS`
   till en kanonisk nyckel. Nycklarna är avsiktligt valda att matcha
   `PRICE_DB`-nycklarna i `priceDb.js` så prisuppslag blir exakt.
3. **Fuzzy skyddsnät** — `fuzzyMatch()` med Levenshtein. Auto-merge vid hög
   likhet ELLER 1 teckens skillnad (stavfel). Annars flaggas `needsReview`.

Exporterar: `normalize`, `canonicalize`, `fuzzyMatch`, `resolveItem`,
`consolidateItems`, `formatTotalQuantity`.

Designprincip: **konservativ**. Hellre lämna två rader oslagna än slå ihop fel.

### 2. `priceDb.js` — ÄNDRAD

- La till `import { resolveItem, consolidateItems } from './consolidate';` högst upp.
- `lookupPrice()`: tog bort den farliga `includes`-loopen, ersatt med
  `resolveItem()` (säker). `needsReview`-fall faller igenom till kategori-fallback
  istället för att gissa fel pris.
- `estimateListCost()`: konsoliderar nu listan FÖRST via `consolidateItems()`,
  så dubbletter (3× majs) prissätts som EN post, inte tre. **Returformatet är
  oförändrat** (`{ min, max, perItem }`) + ett nytt `groups`-fält. Inget annat
  i appen behöver ändras för detta.

### 3. `ShoppingItemList.jsx` — ÄNDRAD

- La till import från `../consolidate` och `AlertCircle` från `lucide-react`
  (lucide används redan i projektet).
- Renderar nu konsoliderade rader per kategori. Hopslagen rad visar `×N`-badge,
  summerad mängd, och en liten varningsikon vid `needsReview`.
- Bocka av / ta bort på en hopslagen rad agerar på ALLA underliggande items.
- **Ingen Supabase-data raderas** — hopslagning sker bara i vy-lagret. Original-
  raderna finns kvar i `shopping_items`.
- La till en `mergeBadge`-stil i styles-objektet.

---

## Vad Code ska göra

1. **Kör bygget** (`npm run build` eller motsv.). Jag är rimligt säker på att det
   är rent, men kunde inte köra det. Fånga ev. fel — troligast import-sökväg
   (`./consolidate` vs `../consolidate` beroende på var filen hamnar; jag antog
   `src/consolidate.js` enligt projektkonventionen i fil-headers).
2. **Snabb funktionskoll** om möjligt: lägg till "majs", "en burk majs", "200g majs"
   på en lista → ska visas som EN rad "Majs ×3". Lägg till "grädde" och "gräddfil"
   → ska vara TVÅ separata rader.
3. **Commit + push + Vercel-deploy.**

## Verifiering jag redan kört (logik, ej bygge)

Mot appens riktiga 162 PRICE_DB-nycklar:
- grädde vs gräddfil → hålls åtskilda (kritiskt). PASS
- 4 majs-varianter → en grupp. PASS
- Stavfel "majjs"/"mjölkk"/"banann" → auto-merge. PASS
- "quinoa"/"xyzzy" → flaggas needsReview, gissas ej. PASS

## Känt / medvetna val (ändra ej utan att fråga Joacim)

- `SYNONYMS`-lexikonet är litet med flit (majs, grädde, mjölk, tomat, lök). Tänkt
  att växa över tid. Det är här kvaliteten sitter.
- "mellanmjölk" och "mjölk" är SEPARATA grupper (olika priser i PRICE_DB). Om de
  ska visas ihop är det en lexikon-justering.
- "1 st majs" hålls separat i mängd-summeringen ("400 g + 1 st") eftersom systemet
  inte säkert vet att 1 st = 1 burk. Domänval, inte bugg.
