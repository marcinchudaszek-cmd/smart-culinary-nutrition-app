// Kontrola jakości katalogu przepisów: zdublowane nazwy, niezgodne sumy kalorii, podejrzane ilości.
// Uruchom z katalogu projektu: node scripts/przepisy/sprawdz-katalog.mjs
import fs from 'fs';

const src = fs.readFileSync('src/data/polishRecipes.ts', 'utf8');
const a = src.indexOf('[', src.indexOf('=', src.indexOf('export const POLISH_RECIPES')));
const catalog = eval(src.slice(a, src.indexOf('\n];', a) + 2));

const norm = (s) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/ł/g, 'l').replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();
const grams = (amount) => {
  const m = String(amount).replace(',', '.').match(/([\d.]+)\s*(kg|g|ml|l)\b/i);
  if (!m) return null;
  const v = parseFloat(m[1]);
  return { kg: v * 1000, g: v, ml: v, l: v * 1000 }[m[2].toLowerCase()];
};

const issues = [];
const add = (r, msg) => issues.push(`${r.id.padEnd(5)} ${r.name.slice(0, 42).padEnd(42)} ${msg}`);

// 1. Zdublowane nazwy
const byName = new Map();
for (const r of catalog) {
  const k = norm(r.name);
  byName.set(k, [...(byName.get(k) ?? []), r]);
}
for (const list of byName.values()) if (list.length > 1) add(list[0], `DUPLIKAT nazwy: ${list.map((x) => x.id).join(', ')}`);

for (const r of catalog) {
  const sum = r.ingredients.reduce((s, i) => s + (i.calories || 0), 0);
  // 2. Suma kalorii składników ≠ totalCalories
  if (Math.abs(sum - r.totalCalories) > Math.max(30, r.totalCalories * 0.05)) add(r, `SUMA składników ${sum} ≠ total ${r.totalCalories}`);
  // 3. Kalorie na porcję poza rozsądnym zakresem
  const per = r.totalCalories / r.servings;
  if (per < 60 || per > 1300) add(r, `PORCJA ${Math.round(per)} kcal (${r.servings} porcji)`);
  // 4. Makro niezgodne z kaloriami
  if (r.macros) {
    const k = r.macros.protein * 4 + r.macros.carbs * 4 + r.macros.fat * 9;
    if (Math.abs(k - r.totalCalories) > r.totalCalories * 0.25 + 40) add(r, `MAKRO ${Math.round(k)} kcal ≠ total ${r.totalCalories}`);
  }
  for (const i of r.ingredients) {
    const g = grams(i.amount);
    if (g && i.calories) {
      const d = (i.calories / g) * 100;
      // 5. Gęstość kaloryczna nie z tej ziemi (> 900 kcal/100 g albo tłuszcz/olej podany w kg)
      if (d > 905) add(r, `GĘSTOŚĆ ${i.name} ${i.amount} = ${i.calories} kcal (${Math.round(d)}/100 g)`);
    }
    // 6. Mąka w dużej ilości tam, gdzie nie pasuje (zupy, desery bez mąki z nazwy)
    if (/^mąka/i.test(i.name) && g && g >= 150 && /Zupy|zupa|krem|bez mąki|fasol|bez pieczenia|mus|budyń|pudding|lody|sorbet|jagl/i.test(r.category + ' ' + r.name)) {
      add(r, `MĄKA ${i.amount} w „${r.name}”`);
    }
  }
}
console.log(issues.join('\n'));
console.log(`\n${issues.length} uwag, ${catalog.length} przepisów`);
