// Wypisuje przepisy katalogu, które nie mają jeszcze zdjęcia w wybor.json -> scripts/zdjecia/brak.json
import fs from 'fs';
const src = fs.readFileSync('src/data/polishRecipes.ts', 'utf8');
const w = JSON.parse(fs.readFileSync('scripts/zdjecia/wybor.json', 'utf8'));
const ids = [...src.matchAll(/id: '([a-z0-9]+)', name: '((?:[^'\\]|\\.)*)'/g)];
const rest = ids.filter((m) => !w[m[1]]).map((m) => [m[1], m[2].replace(/\\'/g, "'")]);
console.log('katalog', ids.length, 'ze zdjęciem', ids.length - rest.length, 'brak', rest.length);
fs.writeFileSync('scripts/zdjecia/brak.json', JSON.stringify(rest, null, 0));
