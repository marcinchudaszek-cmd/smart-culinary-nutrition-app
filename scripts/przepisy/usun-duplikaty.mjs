// Jednorazowo (3.18.0): usuwa zdublowane przepisy z katalogu. Ich id zostają w RECIPE_ALIASES
// w polishRecipes.ts, więc ulubione i plany posiłków z usuniętym id pokazują zachowany przepis.
import fs from 'fs';

const REMOVE = { kr2: 'd16', sm2: 'z21', gr4: 'd24' }; // usuwany -> zachowany

const path = 'src/data/polishRecipes.ts';
let src = fs.readFileSync(path, 'utf8');
for (const id of Object.keys(REMOVE)) {
  const at = src.indexOf(`id: '${id}',`);
  if (at < 0) throw new Error('brak ' + id);
  const start = src.lastIndexOf('\n  {', at);
  const end = src.indexOf('\n  },', at) + '\n  },'.length;
  console.log('usuwam:', src.slice(at, src.indexOf('\n', at)).slice(0, 80));
  src = src.slice(0, start) + src.slice(end);
}
fs.writeFileSync(path, src);

const w = JSON.parse(fs.readFileSync('scripts/zdjecia/wybor.json', 'utf8'));
for (const id of Object.keys(REMOVE)) delete w[id];
fs.writeFileSync('scripts/zdjecia/wybor.json', JSON.stringify(w, null, 1));
