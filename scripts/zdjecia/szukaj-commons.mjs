// Szuka zdjęć potraw w Wikimedia Commons (tylko wolne licencje) i zapisuje kandydatów do przeglądu.
// Uruchom z katalogu projektu: node scripts/zdjecia/szukaj-commons.mjs <wyjście.json>
import fs from 'fs';

const OUT = process.argv.find((a, i) => i >= 2 && !a.startsWith('--')) || 'scripts/zdjecia/kandydaci.json';
const POPRAW = process.argv.includes('--popraw');
const UA = 'KulinApp/3.16 (https://beagleapps.pl; beagleappsstudio@gmail.com) recipe-photo-finder';
const API = 'https://commons.wikimedia.org/w/api.php';
const FREE = /^(cc0|public domain|pd|cc by(-sa)? [1-4]\.0|cc by(-sa)? 2\.5|cc by(-sa)?)/i;

const evalArray = (src, marker) => {
  const a = src.indexOf('[', src.indexOf('=', src.indexOf(marker)));
  return eval(src.slice(a, src.indexOf('\n];', a) + 2));
};
const catalog = evalArray(fs.readFileSync('src/data/polishRecipes.ts', 'utf8'), 'export const POLISH_RECIPES');

const norm = (s) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/ł/g, 'l').replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();
const STOP = new Set(['z', 'w', 'na', 'i', 'po', 'do', 'ze', 'od', 'bez', 'a', 'the', 'with', 'jpg', 'jpeg', 'png', 'file']);
const words = (s) => norm(s).split(' ').filter((w) => w.length > 2 && !STOP.has(w));
// Dopasowanie rdzeni: „pierogi” ~ „pierogami”, „karp” ~ „karpia”.
const stemHit = (a, b) => a.slice(0, Math.max(4, Math.min(a.length, b.length) - 2)) === b.slice(0, Math.max(4, Math.min(a.length, b.length) - 2));

async function api(params) {
  const url = API + '?' + new URLSearchParams({ format: 'json', formatversion: '2', origin: '*', ...params });
  for (let i = 0; i < 3; i++) {
    const res = await fetch(url, { headers: { 'User-Agent': UA } });
    if (res.ok) return res.json();
    await new Promise((r) => setTimeout(r, 2000 * (i + 1)));
  }
  throw new Error('API ' + res.status);
}

async function search(query) {
  const j = await api({
    action: 'query', generator: 'search', gsrsearch: `${query} filetype:bitmap`, gsrnamespace: '6', gsrlimit: '12',
    prop: 'imageinfo', iiprop: 'url|extmetadata|size', iiurlwidth: '480',
  });
  return (j.query?.pages ?? []).map((p) => {
    const ii = p.imageinfo?.[0] ?? {};
    const md = ii.extmetadata ?? {};
    const strip = (h) => String(h ?? '').replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
    return {
      title: p.title, thumb: ii.thumburl, page: ii.descriptionurl, width: ii.width, height: ii.height,
      license: strip(md.LicenseShortName?.value), licenseUrl: strip(md.LicenseUrl?.value),
      artist: strip(md.Artist?.value).slice(0, 80) || 'nieznany autor',
    };
  });
}

function score(recipeName, cand) {
  const rw = words(recipeName);
  const tw = words(cand.title.replace(/^File:/, ''));
  const hits = rw.filter((w) => tw.some((t) => stemHit(w, t))).length;
  let s = rw.length ? hits / rw.length : 0;
  if (cand.width < 600 || cand.height < 400) s -= 0.3;          // za małe
  if (cand.width / cand.height > 2.2 || cand.height / cand.width > 1.6) s -= 0.2; // dziwne proporcje
  if (/menu|logo|map|label|etykiet|sign|stamp|poster|packag|opakow|book|stall|market|restaur/i.test(cand.title)) s -= 0.4;
  return s;
}

const results = {};
const done = fs.existsSync(OUT) ? JSON.parse(fs.readFileSync(OUT, 'utf8')) : {};
let n = 0;
for (const r of catalog) {
  n++;
  // Drugi przebieg (--popraw): ponawiamy tylko przepisy bez mocnego kandydata.
  const prev = done[r.id];
  if (prev && (!POPRAW || (prev.candidates[0]?.score ?? 0) >= 0.6)) { results[r.id] = prev; continue; }
  // Frazy z polskimi znakami: pełna nazwa, dwa pierwsze słowa, samo pierwsze słowo (rdzeń potrawy).
  const orig = r.name.replace(/\(.*?\)/g, '').split(/\s+/).filter((w) => w.length > 2 && !STOP.has(w.toLowerCase()));
  const queries = [r.name, orig.slice(0, 2).join(' '), orig[0]?.length >= 5 ? orig[0] : '']
    .filter((q, i, a) => q && a.indexOf(q) === i);
  const seen = new Map();
  for (const q of queries) {
    try {
      for (const c of await search(q)) if (c.thumb && FREE.test(c.license) && !seen.has(c.title)) seen.set(c.title, { ...c, score: score(r.name, c) });
    } catch (e) { console.error('błąd', r.id, e.message); }
    await new Promise((res) => setTimeout(res, 300));
  }
  const top = [...seen.values()].sort((a, b) => b.score - a.score).slice(0, 3);
  results[r.id] = { name: r.name, category: r.category, candidates: top };
  if (n % 20 === 0) { fs.writeFileSync(OUT, JSON.stringify(results, null, 1)); console.log(n, '/', catalog.length); }
}
fs.writeFileSync(OUT, JSON.stringify(results, null, 1));
const good = Object.values(results).filter((x) => x.candidates[0]?.score >= 0.6).length;
console.log(`Gotowe: ${catalog.length} przepisów, z mocnym kandydatem (≥0.6): ${good}`);
