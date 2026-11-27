// Porównuje kalorie każdego składnika (podane w gramach/ml) z bazą skladniki.mjs.
// Wypisuje składniki zawyżone/zaniżone ponad 2× — kandydatów do poprawki. Uruchom z katalogu projektu.
import fs from 'fs';
import { DB } from './skladniki.mjs';
const mk = fs.readFileSync('scripts/przepisy/makro-starych.mjs', 'utf8');
const ra = mk.indexOf('[', mk.indexOf('const RULES'));
const RULES = eval(mk.slice(ra, mk.indexOf('\n];', ra) + 2));
const src = fs.readFileSync('src/data/polishRecipes.ts', 'utf8');
const a = src.indexOf('[', src.indexOf('=', src.indexOf('export const POLISH_RECIPES')));
const catalog = eval(src.slice(a, src.indexOf('\n];', a) + 2));
const grams = (amount) => {
  const m = String(amount).replace(',', '.').match(/^\s*([\d.]+)\s*(kg|g|ml|l)(?![a-ząćęłńóśźż])/i);
  if (!m) return null;
  return parseFloat(m[1]) * ({ kg: 1000, g: 1, ml: 1, l: 1000 }[m[2].toLowerCase()]);
};
const out = [];
for (const r of catalog) for (const i of r.ingredients) {
  const g = grams(i.amount);
  if (!g) continue;
  const rule = RULES.find(([re]) => re.test(i.name.toLowerCase()));
  if (!rule || !DB[rule[1]]) continue;
  const exp = DB[rule[1]][0] * g / 100;
  if (exp < 25 && i.calories < 60) continue;
  const ratio = i.calories / exp;
  if (ratio > 2 || ratio < 0.5) out.push(`${r.id.padEnd(5)} ${r.name.slice(0, 36).padEnd(36)} ${i.name} ${i.amount}: ${i.calories} kcal, baza ${Math.round(exp)} (${rule[1]})`);
}
console.log(out.join('\n'), `\n${out.length} podejrzanych składników`);
