import fs from 'fs';
import path from 'path';
import { pathToFileURL } from 'url';
import { DB } from './skladniki.mjs';
// Uruchamiaj z katalogu projektu — patrz README.md obok.

const [catalogPath, storePath, ...dataFiles] = process.argv.slice(2);
const THUMB = {
  soup_clear: '1547592180-85f173990554', soup_tomato: '1565299585323-38d6b0865b47', soup_cream: '1476718406336-bb5a9690ee2a',
  beet: '1511690656952-34342bb7c2f2', soup_cabbage: '1547592166-23ac45744acd', stew: '1606491956689-2ea866880c84',
  pierogi: '1604152135912-04a022e23696', meatballs: '1585937421612-70a008356fbe', roast: '1544025162-d76694265947',
  fish: '1467003909585-2f8a72700288', chicken: '1473093295043-cdd812d0e601', eggs: '1525351484163-7529414344d8',
  oats: '1517673400267-0251440c45dc', twarog: '1509482560494-4126f8225994', salad: '1512621776951-a57141f2eefd',
  pasta: '1621996346565-e3dbc646d9a9', pasta_cream: '1563379926898-05f4575a45d8', bake: '1574894709920-11b28e7367e3',
  bowl: '1546069901-ba9599a7e63c', apple_cake: '1568571780765-9276ac8b75a2', cheesecake: '1488477181946-6428a0291777',
  choco: '1607920591413-4ec007e70023', turkey: '1530554764233-e79e16c91d08', fruit_pancakes: '1506084868230-bb9d95c24759',
  bbq: '1555939594-58d7cb561ad1', grill_fish: '1519708227418-c8fd9a32b7a2', burger: '1568901346375-23c9450c58cd',
  mushrooms: '1504674900247-0877df9cc836', herring: '1502741338009-cac2772e18bc', gingerbread: '1481391319762-47dff72954d9',
  mediterranean: '1540189549336-e6e99c3679fe', hummus: '1577805947697-89e18249d767', pasta_spinach: '1555949258-eb67b1ef0ceb',
  omelet: '1482049016688-2d3e1b311543', oats_fit: '1517673132405-a56a62b18caf', smoothie: '1511690743698-d9d85f2fbf38',
  kutia: '1484723091739-30a097e8f929', makowiec: '1509440159596-0249088772ff',
};
// Istniejące przepisy przenoszone do nowych kategorii (po nazwie — id zostają bez zmian).
const MOVE = {
  'Wigilia': ['Barszcz wigilijny z uszkami', 'Karp po żydowsku w galarecie', 'Śledź w śmietanie z cebulą', 'Kutia wigilijna',
    'Kapusta z grochem wigilijna', 'Śledź pod pierzynką', 'Uszka z grzybami', 'Pierogi z kapustą i grzybami', 'Ryba po grecku',
    'Śledzie po kaszubsku', 'Krokiety z kapustą i grzybami'],
  'Boże Narodzenie': ['Piernik staropolski', 'Makowiec tradycyjny', 'Pierniczki świąteczne z lukrem', 'Schab pieczony ze śliwką'],
};
const NEW_CATEGORIES = ['Wigilia', 'Boże Narodzenie', 'Wielkanoc'];

const evalArray = (src, marker) => {
  const a = src.indexOf('[', src.indexOf('=', src.indexOf(marker)));
  return { end: src.indexOf('\n];', a), arr: eval(src.slice(a, src.indexOf('\n];', a) + 2)) };
};
let catalog = fs.readFileSync(catalogPath, 'utf8');
const cat = evalArray(catalog, 'export const POLISH_RECIPES');
const samples = evalArray(fs.readFileSync(storePath, 'utf8'), 'const SAMPLE_RECIPES').arr;
const norm = (s) => s.toLowerCase().replace(/\s+/g, ' ').trim();
const taken = new Set([...cat.arr, ...samples].map((r) => norm(r.name)));
const maxId = {};
for (const r of cat.arr) { const m = r.id.match(/^([a-z]+)(\d+)$/); maxId[m[1]] = Math.max(maxId[m[1]] || 0, +m[2]); }
const knownCats = new Set([...cat.arr.map((r) => r.category), ...NEW_CATEGORIES]);

const all = [];
for (const f of dataFiles) all.push(...(await import(pathToFileURL(path.resolve(f)).href)).default);

const errors = [];
const esc = (s) => s.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
const r1 = (x) => Math.round(x * 10) / 10;
const blocks = [];
const summary = [];
for (const r of all) {
  if (taken.has(norm(r.name))) errors.push(`nazwa zajęta: ${r.name}`);
  taken.add(norm(r.name));
  if (!THUMB[r.thumb]) errors.push(`brak zdjęcia „${r.thumb}”: ${r.name}`);
  if (!knownCats.has(r.category)) errors.push(`nieznana kategoria ${r.category}`);
  if (r.steps.length < 5) errors.push(`za mało kroków: ${r.name}`);
  let P = 0, C = 0, F = 0;
  const ings = r.ing.map(([name, amount, g, key]) => {
    if (key && !DB[key]) errors.push(`brak składnika w bazie „${key}”: ${r.name}`);
    const [kcal, p, c, f] = key ? DB[key] || [0, 0, 0, 0] : [0, 0, 0, 0];
    P += (g * p) / 100; C += (g * c) / 100; F += (g * f) / 100;
    return { name, amount, calories: Math.round((g * kcal) / 100) };
  });
  const total = ings.reduce((s, i) => s + i.calories, 0);
  maxId[r.p] = (maxId[r.p] || 0) + 1;
  const id = `${r.p}${maxId[r.p]}`;
  const instr = r.steps.map((s, i) => `${i + 1}. ${s}`).join('\n');
  blocks.push(`  {
    id: '${id}', name: '${esc(r.name)}', category: '${r.category}', time: '${r.time}',
    thumbnail: 'https://images.unsplash.com/photo-${THUMB[r.thumb]}?w=400',
    instructions: '${esc(instr).replace(/\n/g, '\\n')}',
    ingredients: [${ings.map((i) => `{ name: '${esc(i.name)}', amount: '${esc(i.amount)}', calories: ${i.calories} }`).join(', ')}],
    totalCalories: ${total}, servings: ${r.servings},
    macros: { protein: ${r1(P)}, carbs: ${r1(C)}, fat: ${r1(F)} },
  },`);
  const s = r.servings;
  summary.push(`${id.padEnd(5)} ${String(Math.round(total / s)).padStart(4)} kcal  B${String(Math.round(P / s)).padStart(3)} W${String(Math.round(C / s)).padStart(3)} T${String(Math.round(F / s)).padStart(3)}  ${r.category.padEnd(16)} ${r.name}`);
}

// przeniesienia kategorii
const byName = new Map(cat.arr.map((r) => [norm(r.name), r]));
const moves = [];
for (const [newCat, names] of Object.entries(MOVE)) {
  for (const n of names) {
    const r = byName.get(norm(n));
    if (!r) { errors.push(`do przeniesienia — nie ma w katalogu: ${n}`); continue; }
    moves.push([r.id, newCat]);
  }
}
for (const r of cat.arr) if (r.category === 'Świąteczne' && !moves.some(([id]) => id === r.id)) moves.push([r.id, 'Wielkanoc']);
if (errors.length) { console.error(errors.join('\n')); process.exit(1); }

let body = catalog.slice(0, cat.end);
for (const [id, newCat] of moves) {
  const re = new RegExp(`(id: '${id}', name: '[^\\n]*?', category: )'[^']*'`);
  if (!re.test(body)) { console.error('nie znaleziono bloku', id); process.exit(1); }
  body = body.replace(re, `$1'${newCat}'`);
}
const insert = `\n\n  // ── NOWE PRZEPISY (wersja 3.15.0): fit i dieta, Wigilia, Boże Narodzenie — z makro liczonym ze składników ──\n${blocks.join('\n')}`;
catalog = body + insert + catalog.slice(cat.end);
catalog = catalog.replace("'Kuchnia regionalna', 'Świąteczne', 'Śródziemnomorska'", "'Kuchnia regionalna', 'Śródziemnomorska'")
  .replace("'Wszystkie', 'Zupy',", "'Wszystkie', 'Wigilia', 'Boże Narodzenie', 'Zupy',")
  .replace("'Niskokaloryczne',\n];", "'Niskokaloryczne', 'Wielkanoc',\n];");
fs.writeFileSync(catalogPath, catalog);
console.log(summary.join('\n'));
console.log('\nPrzeniesione:', moves.map(([id, c]) => `${id}→${c}`).join(', '));
console.log(`Dodano ${all.length}; katalog: ${cat.arr.length} → ${cat.arr.length + all.length}`);
