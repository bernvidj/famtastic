# FamTastic — kontext för Claude (Cowork)

Notiser till mig själv så jag har rätt bild nästa gång jag jobbar i appen.
Senast uppdaterad: 2026-06-07.

## Var koden FAKTISKT bor (viktigast)

- **Det levande git-repot är `Projects/famtastic-push/`.** Källkoden ligger i
  `famtastic-push/src/`. Deploy går via Vercel (`vercel.json` i repo-roten).
- **`Projects/FamTastic/` är en DÖD kopia.** Skriv ALDRIG dit. Cowork-mappen
  pekade tidigare felaktigt på den, vilket gav stale-fil-strul och en överlämning
  som behövde portas in för hand. Jobba i `famtastic-push/`.
- Om Cowork-mappen pekar på `Projects/` eller `FamTastic/`: be om åtkomst till
  `famtastic-push/` specifikt, eller jobba via `famtastic-push/src/`-sökvägar.

## Arbetsfördelning Claude (Cowork) ↔ Code

- **Jag (Cowork):** läsa/förstå appen brett, designa features, skriva kod i
  filerna. Jag kan INTE köra `npm run build` eller deploya tillförlitligt.
- **Code:** kör hela vägen — build (`CI=true`), fånga fel, rebasa mot remote,
  commit/push, Vercel-deploy. Han integrerar mot nuvarande kod snarare än kopierar.
- Mönster: jag designar + implementerar → Code bygger, verifierar, deployar.
  Vi delar samma lokala repo, så Code ser mina ändringar direkt.
- När jag lämnar över: peka Code på en handover-fil i repot. Flagga vilka filer
  jag rört och vad som ska verifieras. Anta INTE att min vy av en komponent är
  färdig — repot kan ha gått vidare (se nedan).

## Appens struktur (src/)

- Shopping-komponenter: `src/shopping/` — `ShoppingView.jsx` (huvudvy, pickern),
  `ShoppingItemList.jsx` (raderna), `ShoppingAddItem.jsx` (lägg till).
- Prislogik: `src/priceDb.js` (lokal pris-DB, ~162 varor, `[min,max]` SEK).
- Konsolidering: `src/consolidate.js` (normalisering + synonymlexikon + fuzzy).
- Måltidsdriven inköpslista: `src/meals/generateShoppingList.js`, `MealShoppingView.jsx`.
- Delade: `src/data.js` (C/F/S-teman), `src/Portal.jsx` (modaler), `src/InAppToast.jsx` (toasts).

## Shopping-datamodell (AKTUELL — ändrades efter min första handover)

- Varorna använder en **4-statusmodell**: `item_status` (inte längre bara
  `checked`-boolean). Interaktion sker via `onPick` (inte `onToggle`), och rader
  har `members` med avatarer.
- **Konsekvens:** en hopslagen ("konsoliderad") rad måste applicera status-
  ändring/borttagning på ALLA underliggande varor. Den logiken lever i pickern i
  `ShoppingView.jsx` + `handleSetStatus`/`handleRemove`.
- Konsolidering sker i VY-lagret. Supabase-rader (`shopping_items`) raderas inte
  vid hopslagning — original-raderna finns kvar.

## Konsolideringsfunktionen (levererad, i produktion sedan commit b021ba2)

- `consolidate.js` exporterar `consolidateItems`, `resolveItem`, `normalize`,
  `canonicalize`, `fuzzyMatch`, `formatTotalQuantity`.
- `SYNONYMS`-lexikonet är avsiktligt litet (majs, grädde, mjölk, tomat, lök) och
  tänkt att växa. Nycklarna matchar `PRICE_DB`-nycklar så prisuppslag blir exakt.
- Gammal `includes`-matchning i `lookupPrice` togs bort (blandade grädde/gräddfil).
- **Produktval:** `AlertCircle`-varningsikonen visas BARA vid osäker fuzzy-matchning
  ("Osäker matchning…"), inte vid varje okänd vara — annars varningstriangel på
  halva listan. Bredare beteende = ta bort `showReview`-filtret i `ShoppingItemList.jsx`.
- Medvetna val: "mellanmjölk" ≠ "mjölk" (olika pris). "1 st majs" hålls separat
  från gram-summa (vet ej säkert att 1 st = 1 burk).

## Nästa steg (ej påbörjat)

Prisjämförelse + optimering mellan kedjor (ICA/Coop/Hemköp). Konsolideringen är
fundamentet. Datakälla diskuterad: Matpriskollen B2B (riktiga butikspriser,
lagligt) är rekommendationen; inofficiella app-API:er bara för prototyp.

## Utvärderade datakällor (för pris/lexikon)

Tänkt kedja i pris-steget: handlarlistans vara → kanoniskt namn (consolidate.js)
→ EAN → pris. Olika källor löser olika led:

- **Matpriskollen B2B** (b2b.matpriskollen.se) — riktiga butiksspecifika priser,
  dagligen, lagligt. Kostar licens. REKOMMENDERAD för prisledet. Inget testat API.
- **Inofficiella app-API:er** (t.ex. handla.api.ica.se) — gratis men skört,
  bryter villkor, kan blockeras. Endast för intern prototyp för att VALIDERA att
  split-shopping sparar nog för att motivera betald data. Ej för användare.
- **Livsmedelsverkets Livsmedelsdatabas** — KOLLAT 2026-06-07.
  API: `https://dataportal.livsmedelsverket.se/livsmedel/api/v1/livsmedel`
  (öppet, ingen nyckel, ren JSON, 2575 poster, CC BY 4.0 = bara källhänvisning).
  INNEHÅLLER: näringsvärden + FoodEx2-klassificering + råvaror. INGA priser, ingen butik.
  Namnen är laboratorienamn ("Hushållsmargarin fett 80% berikad typ Melba"), INTE
  vardagsord — DÅLIG för synonymlexikon. BRA för en ev. framtida näringsfunktion
  i meals/ (kalorier/protein per måltid). Löser INTE pris- eller namnfrågan.
- **Open Food Facts** (world.openfoodfacts.org/api/v2) — KOLLAT 2026-06-07.
  Riktiga produkter: EAN, varumärke, vardagsnamn, kategori, förpackningsstorlek.
  Gratis, ingen nyckel (men kräver troligen User-Agent-header — mina fetch-anrop
  gav tomt; testa från egen miljö/Code).
  KANDIDAT för EAN-BRYGGAN i pris-steget (kanoniskt namn → EAN). Inte prioriterad
  för lexikonet (handskrivna vardagsord är enklare/träffsäkrare där).
  TVÅ HAKAR: (1) crowdsourcad → ojämn kvalitet/svensk täckning, använd som hjälp
  ej sanning. (2) LICENS: databasinnehåll under ODbL (share-alike/copyleft för
  databaser) — kan tvinga dig dela härledd databas om den distribueras. UTRED
  ODbL innan kommersiell inbyggnad. (Ej juridisk rådgivning — fråga licenskunnig.)

Sammanfattning: ingen gratis källa löser PRISET. Livsmedelsverket = näring (laglig,
enkel licens). Open Food Facts = EAN-brygga (laglig men ODbL att reda ut). Priset
kräver fortfarande Matpriskollen (betald) eller gråzon (prototyp endast).
