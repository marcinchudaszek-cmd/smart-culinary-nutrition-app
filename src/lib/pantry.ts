// Logika spiżarni: kategorie produktów, szacowanie terminu przydatności,
// dopasowanie produktów do składników przepisów. Bez Reacta i bez AI —
// wszystko liczy się lokalnie, więc działa też bez klucza API.
import { toLocalISO } from './date';

export type PantryCategory =
  | 'nabial' | 'mieso' | 'ryby' | 'wedliny' | 'warzywa' | 'owoce' | 'pieczywo'
  | 'jaja' | 'mrozonki' | 'suche' | 'konserwy' | 'napoje' | 'slodycze'
  | 'przyprawy' | 'gotowe' | 'inne';

export type PantryStatus = 'active' | 'eaten' | 'wasted';

export interface PantryItem {
  id: string;
  name: string;
  category: PantryCategory;
  quantity: string;
  /** Cena w zł z paragonu (albo wpisana ręcznie) — do licznika oszczędności. */
  price?: number;
  addedAt: string;      // YYYY-MM-DD
  expiresAt: string;    // YYYY-MM-DD
  /** true = termin wyliczony z kategorii, a nie przepisany z opakowania. */
  estimated: boolean;
  status: PantryStatus;
  closedAt?: string;    // YYYY-MM-DD — kiedy zjedzone / wyrzucone
  /** Ile dni zostało w chwili zjedzenia — „uratowane” to zjedzone na ≤ 2 dni przed końcem. */
  daysLeftWhenClosed?: number;
}

export const CATEGORIES: { id: PantryCategory; label: string; emoji: string; days: number }[] = [
  { id: 'nabial',    label: 'Nabiał',          emoji: '🥛', days: 7 },
  { id: 'mieso',     label: 'Mięso',           emoji: '🥩', days: 2 },
  { id: 'ryby',      label: 'Ryby',            emoji: '🐟', days: 2 },
  { id: 'wedliny',   label: 'Wędliny',         emoji: '🥓', days: 5 },
  { id: 'warzywa',   label: 'Warzywa',         emoji: '🥕', days: 7 },
  { id: 'owoce',     label: 'Owoce',           emoji: '🍎', days: 6 },
  { id: 'pieczywo',  label: 'Pieczywo',        emoji: '🍞', days: 3 },
  { id: 'jaja',      label: 'Jajka',           emoji: '🥚', days: 21 },
  { id: 'gotowe',    label: 'Dania gotowe',    emoji: '🍱', days: 3 },
  { id: 'mrozonki',  label: 'Mrożonki',        emoji: '🧊', days: 90 },
  { id: 'napoje',    label: 'Napoje',          emoji: '🧃', days: 60 },
  { id: 'slodycze',  label: 'Słodycze',        emoji: '🍫', days: 90 },
  { id: 'suche',     label: 'Sypkie i makarony', emoji: '🌾', days: 180 },
  { id: 'konserwy',  label: 'Konserwy i słoiki', emoji: '🥫', days: 365 },
  { id: 'przyprawy', label: 'Przyprawy',       emoji: '🧂', days: 365 },
  { id: 'inne',      label: 'Inne',            emoji: '📦', days: 7 },
];

const CATEGORY_IDS = new Set(CATEGORIES.map((c) => c.id));

export function categoryInfo(id: PantryCategory) {
  return CATEGORIES.find((c) => c.id === id) ?? CATEGORIES[CATEGORIES.length - 1];
}

export function asCategory(v: unknown): PantryCategory {
  return typeof v === 'string' && CATEGORY_IDS.has(v as PantryCategory) ? (v as PantryCategory) : 'inne';
}

/** Małe litery, bez polskich znaków i interpunkcji — do porównywania nazw. */
export function normalize(s: string): string {
  return s
    .toLowerCase()
    .replace(/ł/g, 'l')
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9 ]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// Produkty, których trwałość mocno odbiega od reszty kategorii. Pierwsze
// trafienie wygrywa, więc dłuższe/bardziej szczegółowe wzorce są wyżej.
// Wartości to ostrożne szacunki dla produktu zamkniętego, w lodówce.
const SHELF_OVERRIDES: { re: RegExp; days: number; category?: PantryCategory }[] = [
  { re: /\buht\b|mleko w proszku|mleko skondensowane/, days: 90, category: 'nabial' },
  { re: /mrozon|lody\b/, days: 90, category: 'mrozonki' },
  { re: /mielon/, days: 1, category: 'mieso' },
  { re: /jogurt|kefir|maslank|skyr|serek homo|danio/, days: 10, category: 'nabial' },
  { re: /twarog|serek wiejski|ricotta|mozzarell|burrata/, days: 5, category: 'nabial' },
  { re: /\bser\b.*(zolty|gouda|edam|cheddar|salami|morski|tylzyck|parmez|grana)|parmezan/, days: 21, category: 'nabial' },
  { re: /\bmaslo\b|margaryn/, days: 30, category: 'nabial' },
  { re: /smietan|smietank/, days: 10, category: 'nabial' },
  { re: /\bmleko\b/, days: 5, category: 'nabial' },
  { re: /salat|szpinak|rukol|roszponk|kielki|natka|koperek|szczypior|bazyli|kolendr/, days: 3, category: 'warzywa' },
  { re: /pieczark|grzyb/, days: 4, category: 'warzywa' },
  { re: /ziemniak|cebul|czosnek|marchew|marchw|burak|pietruszk|seler|kapust|dyni/, days: 21, category: 'warzywa' },
  { re: /truskaw|malin|borowk|jagod|porzeczk|czeresn|wisni/, days: 2, category: 'owoce' },
  { re: /banan|awokado|brzoskw|nektaryn/, days: 4, category: 'owoce' },
  { re: /jablk|cytryn|limonk|pomarancz|mandaryn|grejpfrut/, days: 21, category: 'owoce' },
  { re: /\bjaj/, days: 21, category: 'jaja' },
  { re: /mieso|kurczak|indyk|wieprz|wolow|schab|karkow|filet|piers|udk|skrzydel|zeberk|boczek surowy/, days: 2, category: 'mieso' },
  { re: /losos|dorsz|mintaj|pstrag|tunczyk swiez|krewet|sledz/, days: 2, category: 'ryby' },
  { re: /szynk|kielbas|parowk|salami|boczek|polędwic|poledwic|kabanos|pasztet|mortadel/, days: 5, category: 'wedliny' },
  { re: /chleb|bulk|bagiet|rogal|drozdzowk|tortill|kajzerk|grahamk|chalk|croissant/, days: 3, category: 'pieczywo' },
  { re: /makaron|ryz\b|kasz|maka|platki|cukier|mus(l|li)|fasola sucha|soczewic|ciecierzyc/, days: 180, category: 'suche' },
  { re: /konserw|pomidory krojone|passata|koncentrat|groszek konserw|kukurydz.*puszk|ogorki kiszone|w zalewie|dzem/, days: 365, category: 'konserwy' },
  { re: /\bsok\b|woda|napoj|cola|piwo|wino|herbat|kaw/, days: 60, category: 'napoje' },
  { re: /czekolad|baton|ciastk|wafel|cukierk|chips|paluszk|zelk/, days: 90, category: 'slodycze' },
  { re: /\bsol\b|pieprz|przypraw|oregano|majeranek|papryka slodka|curry|ketchup|musztard|majonez|ocet|oliwa|olej/, days: 365, category: 'przyprawy' },
  { re: /pierogi|salatka|sushi|kanapk|pizza|hummus|gotow/, days: 3, category: 'gotowe' },
];

/** Zgaduje kategorię z nazwy (przy ręcznym dodawaniu). */
export function guessCategory(name: string): PantryCategory {
  const n = normalize(name);
  for (const o of SHELF_OVERRIDES) if (o.category && o.re.test(n)) return o.category;
  return 'inne';
}

/** Szacowana liczba dni przydatności produktu od zakupu. */
export function estimateShelfDays(name: string, category: PantryCategory): number {
  const n = normalize(name);
  // Mrożonki i konserwy z nazwą świeżego produktu („truskawki mrożone”) — wygrywa kategoria.
  if (category === 'mrozonki' || category === 'konserwy') return categoryInfo(category).days;
  for (const o of SHELF_OVERRIDES) if (o.re.test(n)) return o.days;
  return categoryInfo(category).days;
}

export function addDays(iso: string, days: number): string {
  const [y, m, d] = iso.split('-').map(Number);
  return toLocalISO(new Date(y, m - 1, d + days));
}

/** Ile pełnych dni zostało do końca terminu (0 = dziś ostatni dzień, < 0 = po terminie). */
export function daysLeft(expiresAt: string, today: string = toLocalISO()): number {
  const [y1, m1, d1] = expiresAt.split('-').map(Number);
  const [y2, m2, d2] = today.split('-').map(Number);
  return Math.round((Date.UTC(y1, m1 - 1, d1) - Date.UTC(y2, m2 - 1, d2)) / 86400000);
}

export type Urgency = 'expired' | 'today' | 'soon' | 'week' | 'ok';

export function urgencyOf(left: number): Urgency {
  if (left < 0) return 'expired';
  if (left === 0) return 'today';
  if (left <= 2) return 'soon';
  if (left <= 6) return 'week';
  return 'ok';
}

export function daysLeftLabel(left: number): string {
  if (left < -1) return `${-left} dni po terminie`;
  if (left === -1) return 'dzień po terminie';
  if (left === 0) return 'ostatni dzień';
  if (left === 1) return 'jeszcze 1 dzień';
  return `jeszcze ${left} dni`;
}

// ── Dopasowanie do składników przepisu ──────────────────────────────────────

// Odmiany i synonimy, które psułyby proste porównanie rdzeni.
const SYNONYMS: Record<string, string> = {
  jaja: 'jajko', jajka: 'jajko', jaj: 'jajko', kwaszona: 'kiszona', kwaszonej: 'kiszona',
  ziemniaczki: 'ziemniak', kartofle: 'ziemniak',
};

const STOP = new Set(['z', 'w', 'na', 'do', 'i', 'lub', 'oraz', 'bez', 'swiezy', 'swieza', 'swieze',
  'naturalny', 'naturalna', 'naturalne', 'bio', 'eko', 'duzy', 'duza', 'male', 'maly', 'szt', 'g', 'kg', 'ml', 'l']);

/** Składniki, które zakładamy, że są w każdej kuchni — nie liczą się jako „brakuje”. */
const STAPLES = /^(sol|pieprz|woda|olej|oliwa|cukier|maka|przyprawy|ocet|ziola)\b/;

// Rdzenie słów ogólnych, które wymagają zgodnego dopowiedzenia (patrz niżej).
const GENERIC_HEADS = new Set(['piers', 'filet', 'udko', 'kasz', 'ser', 'serek', 'maka', 'sok', 'mies', 'kielbas', 'platk']);

function stem(token: string): string {
  const t = SYNONYMS[token] ?? token;
  return t.length > 4 ? t.replace(/(ami|ach|ow|om|em|ki|ka|ko|a|y|i|e|u|o)$/, '') : t;
}

function stems(name: string): string[] {
  return normalize(name).split(' ').filter((t) => t.length >= 3 && !STOP.has(t) && !/^\d/.test(t)).map(stem);
}

function sameStem(a: string, b: string): boolean {
  if (a === b) return true;
  if (Math.min(a.length, b.length) < 4) return false;
  const [s, l] = a.length <= b.length ? [a, b] : [b, a];
  return l.startsWith(s) && l.length - s.length <= 1;
}

/**
 * Czy produkt ze spiżarni pasuje do składnika przepisu. Porównujemy główne
 * słowo (pierwsze) jednej nazwy z dowolnym słowem drugiej — dzięki temu
 * „Ser żółty gouda” pasuje do „Ser żółty”, a „Pierś z kurczaka” do „Kurczak”,
 * ale „Masło” nie pasuje do „Maślanka”.
 */
export function matchesIngredient(productName: string, ingredientName: string): boolean {
  const p = stems(productName);
  const i = stems(ingredientName);
  if (!p.length || !i.length) return false;
  if (sameStem(p[0], i[0])) {
    // „Pierś”, „kasza”, „ser” same w sobie nic nie mówią — gdy obie nazwy
    // mają dopowiedzenie, musi się ono zgadzać (kurczak ≠ indyk, gryczana ≠ jaglana).
    if (GENERIC_HEADS.has(p[0]) && p.length > 1 && i.length > 1) {
      return p.slice(1).some((a) => i.slice(1).some((b) => sameStem(a, b)));
    }
    return true;
  }
  return (!GENERIC_HEADS.has(p[0]) && i.slice(1).some((t) => sameStem(t, p[0])))
    || (!GENERIC_HEADS.has(i[0]) && p.slice(1).some((t) => sameStem(t, i[0])));
}

export function isStaple(ingredientName: string): boolean {
  return STAPLES.test(normalize(ingredientName));
}

/** „30 min”, „1,5 godz”, „2 godz 15 min” → minuty (Infinity, gdy nie da się odczytać). */
export function parseMinutes(time: string | undefined): number {
  if (!time) return Infinity;
  const t = time.toLowerCase().replace(',', '.');
  const h = t.match(/(\d+(?:\.\d+)?)\s*(?:godz|h\b)/);
  const m = t.match(/(\d+)\s*min/);
  if (!h && !m) return Infinity;
  return Math.round((h ? parseFloat(h[1]) * 60 : 0) + (m ? parseInt(m[1], 10) : 0));
}

export interface RecipeLike {
  id: string;
  name: string;
  time?: string;
  ingredients: { name: string }[];
}

export interface RescueMatch<R extends RecipeLike> {
  recipe: R;
  used: PantryItem[];
  missing: string[];
  score: number;
  minutes: number;
}

function urgencyWeight(left: number): number {
  if (left < 0) return 2;    // po terminie — może jeszcze dobre, ale nie promujemy
  if (left <= 1) return 5;
  if (left <= 2) return 4;
  if (left <= 4) return 2;
  return 1;
}

/**
 * Układa przepisy tak, żeby na górze były te, które zużywają najwięcej
 * produktów bliskich końca terminu i wymagają najmniej dokupowania.
 */
export function rankRescueRecipes<R extends RecipeLike>(
  recipes: R[],
  items: PantryItem[],
  today: string = toLocalISO(),
): RescueMatch<R>[] {
  const active = items.filter((i) => i.status === 'active');
  if (!active.length) return [];
  const out: RescueMatch<R>[] = [];
  for (const recipe of recipes) {
    const used: PantryItem[] = [];
    const missing: string[] = [];
    for (const ing of recipe.ingredients) {
      const hit = active.find((p) => !used.includes(p) && matchesIngredient(p.name, ing.name));
      if (hit) used.push(hit);
      else if (!isStaple(ing.name)) missing.push(ing.name);
    }
    if (!used.length) continue;
    const urgent = used.reduce((s, p) => s + urgencyWeight(daysLeft(p.expiresAt, today)), 0);
    out.push({
      recipe, used, missing,
      minutes: parseMinutes(recipe.time),
      // Każdy brakujący składnik obniża wynik — lepiej ugotować z tego, co jest.
      score: urgent * 3 - missing.length * 2,
    });
  }
  return out.sort((a, b) => b.score - a.score || a.missing.length - b.missing.length || a.minutes - b.minutes);
}
