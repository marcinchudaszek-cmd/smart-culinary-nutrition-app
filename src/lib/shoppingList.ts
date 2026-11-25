// Lista zakupów z wielu przepisów: przelicza ilości na liczbę osób i sumuje te same produkty.
// Ilości w przepisach to tekst („1,5 kg”, „200 ml”, „3 szt”, „1/4 szt”, „2 łyżki”, „do smaku”).

export interface ShoppingSource { name: string; amount: string }
export interface ShoppingItem {
  key: string;          // stały identyfikator pozycji (do odhaczania)
  name: string;
  qty: number | null;   // null — ilość nieliczbowa („do smaku”, „pęczek”)
  unit: string;         // 'g' | 'ml' | 'szt' | 'łyżki' | … | ''
  label: string;        // ilość gotowa do wyświetlenia
  recipes: string[];    // z których potraw pochodzi
}

const UNIT_ALIASES: Record<string, string> = {
  g: 'g', gram: 'g', gramów: 'g', dag: 'dag', kg: 'kg', ml: 'ml', l: 'l', litr: 'l', litry: 'l',
  szt: 'szt', sztuki: 'szt', sztuka: 'szt', 'szt.': 'szt',
  łyżka: 'łyżki', łyżki: 'łyżki', łyżek: 'łyżki', łyżeczka: 'łyżeczki', łyżeczki: 'łyżeczki', łyżeczek: 'łyżeczki',
  ząbek: 'ząbki', ząbki: 'ząbki', ząbków: 'ząbki', szklanka: 'szklanki', szklanki: 'szklanki',
  pęczek: 'pęczek', główka: 'główka', kromka: 'kromki', kromki: 'kromki', puszka: 'puszki', opakowania: 'opak.',
  opakowanie: 'opak.', liści: 'liście', garść: 'garść',
};

function parseNumber(t: string): number | null {
  const s = t.replace(',', '.').trim();
  if (s === '½') return 0.5;
  if (s === '¼') return 0.25;
  const frac = s.match(/^(\d+)\/(\d+)$/);
  if (frac) return Number(frac[1]) / Number(frac[2]);
  const range = s.match(/^(\d+(?:\.\d+)?)\s*[-–]\s*(\d+(?:\.\d+)?)$/);
  if (range) return Number(range[2]);              // „2–3 szt” → kupujemy górną ilość
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

/** „1,5 kg” → { qty: 1500, unit: 'g' }; zwraca null, gdy ilość nie jest liczbą. */
export function parseAmount(amount: string): { qty: number; unit: string } | null {
  const m = amount.trim().toLowerCase().match(/^([\d.,/½¼]+(?:\s*[-–]\s*[\d.,]+)?)\s*([^\d\s(]*)/);
  if (!m) return null;
  const qty = parseNumber(m[1]);
  if (qty === null) return null;
  const raw = m[2].replace(/\.$/, '');
  const unit = UNIT_ALIASES[raw] ?? (raw === '' ? 'szt' : raw);
  if (unit === 'kg') return { qty: qty * 1000, unit: 'g' };
  if (unit === 'dag') return { qty: qty * 10, unit: 'g' };
  if (unit === 'l') return { qty: qty * 1000, unit: 'ml' };
  return { qty, unit };
}

const SPICES = /^przyprawy|^sól|^pieprz|^woda|do smaku|^szczypta/i;

// Ta sama rzecz pod różnymi nazwami (np. „Jajka” i „Jajko”, „Buraki czerwone” i „Buraki”).
function normName(name: string): string {
  return name.toLowerCase()
    .replace(/\(.*?\)/g, '')
    .replace(/\b(świeże|świeży|świeża|czerwone|surowe|ugotowane|gotowane|do smażenia|na uszka|do podania|niebieski|mielony)\b/g, '')
    .replace(/jajko\b/, 'jajka').replace(/jabłko\b/, 'jabłka').replace(/cytryny?\b/, 'cytryna')
    .replace(/\s+/g, ' ').trim();
}

function fmtQty(qty: number, unit: string): string {
  if (unit === 'g') return qty >= 1000 ? `${(Math.ceil(qty / 100) / 10).toString().replace('.', ',')} kg` : `${Math.ceil(qty / 10) * 10} g`;
  if (unit === 'ml') return qty >= 1000 ? `${(Math.ceil(qty / 100) / 10).toString().replace('.', ',')} l` : `${Math.ceil(qty / 10) * 10} ml`;
  const rounded = unit === 'szt' ? Math.ceil(qty) : Math.round(qty * 2) / 2;
  return `${rounded.toString().replace('.', ',')} ${unit}`;
}

/**
 * Buduje listę zakupów. `recipes` — przepisy z mnożnikiem porcji (liczba osób / porcje przepisu).
 * Przyprawy zbiera w jednej pozycji na końcu.
 */
export function buildShoppingList(
  recipes: { name: string; factor: number; ingredients: ShoppingSource[] }[],
): ShoppingItem[] {
  const map = new Map<string, ShoppingItem>();
  let hasSpices = false;
  for (const r of recipes) {
    for (const ing of r.ingredients) {
      if (SPICES.test(ing.name) || SPICES.test(ing.amount)) { hasSpices = true; continue; }
      const parsed = parseAmount(ing.amount);
      const base = normName(ing.name);
      const key = parsed ? `${base}|${parsed.unit}` : `${base}|${ing.amount.toLowerCase()}`;
      const cur = map.get(key);
      if (cur) {
        if (cur.qty !== null && parsed) cur.qty += parsed.qty * r.factor;
        if (!cur.recipes.includes(r.name)) cur.recipes.push(r.name);
      } else {
        map.set(key, {
          key, name: ing.name.replace(/\s*\(.*?\)\s*/g, ' ').trim(),
          qty: parsed ? parsed.qty * r.factor : null, unit: parsed?.unit ?? '',
          label: '', recipes: [r.name],
        });
      }
    }
  }
  const items = [...map.values()].map((it) => ({
    ...it,
    label: it.qty !== null ? fmtQty(it.qty, it.unit) : (it.key.split('|')[1] || ''),
  }));
  items.sort((a, b) => a.name.localeCompare(b.name, 'pl'));
  if (hasSpices) {
    items.push({
      key: 'przyprawy', name: 'Przyprawy', qty: null, unit: '',
      label: 'sól, pieprz, liść laurowy, ziele angielskie, majeranek', recipes: [],
    });
  }
  return items;
}
