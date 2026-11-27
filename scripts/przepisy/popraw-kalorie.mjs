// Jednorazowe poprawki kalorii składników (wersja 3.18.0) — podmienia kalorie składnika i przelicza totalCalories.
// Uruchom z katalogu projektu: node scripts/przepisy/popraw-kalorie.mjs
import fs from 'fs';

// [id przepisu, nazwa składnika, nowe kcal, powód]
const FIX = [
  ['z1', 'Makaron nitki', 700, 'suchy makaron 350 kcal/100 g (było liczone jak ugotowany)'],
  ['z2', 'Makaron', 700, 'suchy makaron 350 kcal/100 g'],
  ['gr2', 'Ketchup', 220, 'ketchup ok. 110 kcal/100 g'],
];

const path = 'src/data/polishRecipes.ts';
let src = fs.readFileSync(path, 'utf8');
for (const [id, ing, kcal, why] of FIX) {
  const start = src.indexOf(`id: '${id}',`);
  if (start < 0) throw new Error('brak przepisu ' + id);
  let end = src.indexOf("id: '", start + 5);
  if (end < 0) end = src.indexOf('\n];', start);
  let block = src.slice(start, end);
  const re = new RegExp(`(\\{ name: '${ing}', amount: '[^']*', calories: )(\\d+)( \\})`);
  const m = block.match(re);
  if (!m) throw new Error(`brak składnika ${ing} w ${id}`);
  const diff = kcal - Number(m[2]);
  block = block.replace(re, `$1${kcal}$3`);
  block = block.replace(/totalCalories: (\d+)/, (_, t) => `totalCalories: ${Number(t) + diff}`);
  src = src.slice(0, start) + block + src.slice(end);
  console.log(`${id} ${ing}: ${m[2]} → ${kcal} kcal (${why})`);
}
fs.writeFileSync(path, src);
