// Dopisuje pole `macros` starszym przepisom (katalog + przepisy przykładowe), które go nie mają.
// Każdy składnik ma już kalorie, więc gramatury nie trzeba parsować: makro = kcal × (B|W|T / kcal) produktu
// rozpoznanego po nazwie. Przepis dostaje makro tylko, gdy rozpoznano ≥ 90% jego kalorii; resztę
// uzupełniamy typowymi proporcjami (20/45/35% energii). Uruchom z katalogu projektu:
//   node scripts/przepisy/makro-starych.mjs            (podgląd: pokrycie i nierozpoznane składniki)
//   node scripts/przepisy/makro-starych.mjs --zapisz   (wpisuje makro do plików)
import fs from 'fs';
import { DB } from './skladniki.mjs';

const ZAPISZ = process.argv.includes('--zapisz');
const PROG = 0.9;

// [wzorzec nazwy (małe litery), klucz w DB] — kolejność ma znaczenie: szczegółowe przed ogólnymi.
const RULES = [
  [/wino|piwo|amaretto|spirytus/, 'alkohol'],
  [/mąka ziemniaczana|skrobia/, 'maka_ziemniaczana'], [/mąka owsiana/, 'maka_owsiana'], [/mąka/, 'maka_pszenna'], [/ziemniak/, 'ziemniaki'], [/majonez/, 'majonez'],
  [/masło orzechowe/, 'maslo_orzechowe'], [/masło/, 'maslo'], [/bułka tarta/, 'bulka_tarta'],
  [/ciasto francuskie/, 'ciasto_francuskie'], [/smalec/, 'smalec'], [/oliwa|olej/, 'olej'],
  [/żółtk/, 'zoltko'], [/białk/, 'bialko_jaja'], [/jaj/, 'jajko'],
  [/syrop klonowy/, 'syrop'], [/miód i cukier/, 'cukier'], [/miód/, 'miod'], [/cukier|wanili/, 'cukier'],
  [/udk.*bez skóry/, 'kurczak_udko_bez_skory'],
  [/pierś z kurczaka|pierś kurczaka|filet z kurczaka|filety z piersi/, 'kurczak_piers'],
  [/mięso mielone z kurczaka|mięso z indyka mielone|indyk mielony/, 'indyk_mielony'],
  [/udk|skrzydeł/, 'kurczak_udko'], [/kurczak/, 'kurczak_caly'],
  [/żeberk/, 'zeberka'], [/karkówk|karczek/, 'karkowka'], [/schab|polędwiczka wieprzowa/, 'schab'],
  [/golonk/, 'golonka'], [/koś(ć|ci) wieprzow/, 'golonka'],
  [/mięso mielone wołowe|mielona wołowina/, 'mielone_wolowe'], [/mięso mielone wieprzowe$/, 'mielone_wieprzowe'],
  [/mięso mielone/, 'mielone_mieszane'], [/indyk|indycz/, 'indyk_piers'],
  [/polędwica wołowa|stek wołowy|rostbef/, 'poledwica_wolowa'], [/wołowina gulaszowa/, 'wolowina_gulaszowa'],
  [/flaki/, 'flaki'], [/wołowin/, 'wolowina_chuda'], [/łopatka wieprzowa|wieprzowina|resztki mięs/, 'lopatka'],
  [/krew/, 'krew'], [/kaczk/, 'kaczka'], [/gęś/, 'ges'], [/boczek|wędzonka/, 'boczek'], [/kaszank/, 'kaszanka'],
  [/biała kiełbasa/, 'kielbasa_biala'], [/salami/, 'salami'], [/kiełbas/, 'kielbasa'], [/szynk/, 'szynka_gotowana'],
  [/wątrob|wątróbk/, 'watrobka_drobiowa'],
  [/łoso.*wędzon/, 'losos_wedzony'], [/łoso/, 'losos'], [/dorsz/, 'dorsz'], [/mintaj/, 'mintaj'],
  [/sandacz/, 'sandacz'], [/pstrąg/, 'pstrag'], [/karp/, 'karp'], [/makrel/, 'makrela_wedzona'],
  [/matjas/, 'sledz_matjas'], [/śledz|śledź/, 'sledz_solony'], [/tuńczyk w oliwie/, 'tunczyk_oliwa'],
  [/tuńczyk/, 'tunczyk_w_wodzie'], [/krewetk/, 'krewetki'],
  [/brązowy ryż|ryż brązowy/, 'ryz_brazowy'], [/ryż/, 'ryz_basmati'], [/kasza manna/, 'kasza_manna'],
  [/kasza jaglana/, 'kasza_jaglana'], [/pęczak/, 'kasza_peczak'], [/bulgur/, 'bulgur'], [/kuskus/, 'kuskus'],
  [/kasza/, 'kasza_gryczana'], [/komosa/, 'komosa'], [/pszenica/, 'pszenica'],
  [/makaron.*(razowy|pełnoziarnisty)/, 'makaron_razowy'], [/makaron|łazanki|lasagne/, 'makaron'],
  [/granola/, 'granola'], [/płatki owsiane/, 'platki_owsiane'],
  [/chleb tostowy|na grzanki|grzanki/, 'chleb_tostowy'], [/chleb (razowy|żytni)/, 'chleb_zytni'],
  [/tortill|pita/, 'tortilla_pszenna'], [/bagietk/, 'bagietka'], [/chleb|bułk|pieczywo/, 'bulki'],
  [/biszkopt|ciastka/, 'ciastka'], [/nachos/, 'nachos'],
  [/parmezan/, 'parmezan'], [/feta/, 'feta'], [/mozzarella/, 'mozzarella'], [/mascarpone/, 'mascarpone'],
  [/ricotta/, 'ricotta'], [/oscypek/, 'oscypek'], [/serek homogenizowany/, 'serek_homog'],
  [/serek śmietankowy|kremowy serek/, 'serek_smietankowy'], [/serek topiony/, 'serek_topiony'],
  [/twaróg chudy/, 'twarog_chudy'], [/twaróg (tłusty|trójmielony)/, 'twarog_tlusty'], [/twaróg/, 'twarog_poltlusty'],
  [/ser|gorgonzola/, 'ser_zolty'],
  [/skyr/, 'skyr'], [/jogurt grecki 0%/, 'jogurt_grecki_0'], [/jogurt grecki/, 'jogurt_grecki'],
  [/jogurt/, 'jogurt_naturalny'], [/kefir/, 'kefir'],
  [/śmietan.*36/, 'smietanka_36'], [/śmietan.*30|kremówk/, 'smietanka_30'],
  [/mleko kokosowe light/, 'mleko_kokosowe_light'], [/kokosow/, 'mleko_kokosowe'], [/śmietan/, 'smietana_18'],
  [/mleko migdałowe/, 'mleko_migdalowe'], [/kajmak/, 'kajmak'], [/mleko/, 'mleko'],
  [/odżywka białkowa/, 'odzywka_bialkowa'],
  [/czekolad/, 'czekolada_gorzka'], [/kakao/, 'kakao'], [/wiórki kokosowe/, 'wiorki_kokosowe'],
  [/rodzynki i (orzechy|bakalie)|bakalie|orzechy, migdały/, 'bakalie_mix'],
  [/orzechy włoskie/, 'orzechy_wloskie'], [/migdał/, 'migdaly'], [/laskowe/, 'orzechy_laskowe'],
  [/orzech|orzeszk|pinii/, 'orzechy_wloskie'],
  [/rodzynk/, 'rodzynki'], [/śliwki suszone/, 'sliwki_suszone'], [/daktyl/, 'daktyle'], [/morel/, 'morele_suszone'],
  [/^mak|mak (niebieski|mielony)/, 'mak'],
  [/słonecznik/, 'slonecznik'], [/pestki dyni/, 'pestki_dyni'], [/sezam/, 'sezam'], [/chia/, 'chia'],
  [/siemię/, 'siemie'], [/tahini/, 'tahini'], [/hummus/, 'hummus'],
  [/groch(?!ek)/, 'groch'], [/soczewic/, 'soczewica_czerwona'], [/ciecierzyc/, 'ciecierzyca_puszka'],
  [/fasolka/, 'fasolka_szparagowa'], [/fasol/, 'fasola_czerwona_puszka'], [/tofu/, 'tofu'],
  [/awokado/, 'awokado'], [/banan/, 'banan'], [/jabłk/, 'jablko'],
  [/ketchup/, 'ketchup'], [/pomidor|passata|przecier|sos pomidorowy|salsa|koncentrat/, 'passata'],
  [/kapust/, 'kapusta_biala'], [/burak|botwin/, 'burak'], [/cebul/, 'cebula'], [/czosnek/, 'czosnek'],
  [/marchew|włoszczyzna|warzywa/, 'marchew'], [/papryk/, 'papryka'],
  [/grzyby suszone/, 'grzyby_suszone'], [/pieczark|grzyby|kurki/, 'pieczarki'],
  [/cukini/, 'cukinia'], [/bakłażan/, 'baklazan'], [/brokuł|szparag/, 'brokul'], [/kalafior/, 'kalafior'],
  [/szpinak|jarmuż|rukola|sałat|szczaw|kiełki/, 'szpinak'], [/dyni/, 'dynia'], [/batat/, 'batat'],
  [/kukurydz/, 'kukurydza'], [/groszek/, 'groszek'], [/seler/, 'seler'], [/^por$/, 'por'], [/pietruszk/, 'pietruszka'],
  [/ogór/, 'ogorek'], [/rzodkiew/, 'rzodkiewka'], [/cytryn|limonk/, 'cytryna'], [/pomarańcz/, 'pomarancza'],
  [/truskawk|malin|borówk|jagod|owoce|kiwi|mango|papaja|ananas|śliwk|porzeczk|rabarbar/, 'owoce_mrozone'],
  [/dżem|konfitur|powidł/, 'dzem'], [/żelatyna/, 'zelatyna'], [/drożdż/, 'drozdze'], [/budyń/, 'budyn_proszek'],
  [/bulion|wywar/, 'bulion'], [/zakwas/, 'zakwas_zytni'], [/sos sojowy|miso/, 'sos_sojowy'], [/pasta curry/, 'pasta_curry'],
  [/musztard/, 'musztarda'], [/chrzan/, 'chrzan'], [/oliwki/, 'oliwki'], [/kapary/, 'kapary'],
  [/ocet|krem balsamiczny/, 'ocet'], [/imbir/, 'imbir'],
  [/przypraw|zioła|cynamon|kurkuma|majeranek|lubczyk|bazylia|rozmaryn|ziele|koperek|szczypiorek|natka|kawa|proszek|skórka|piernik/, 'przyprawy_suche'],
];
const keyFor = (name) => { const n = name.toLowerCase(); for (const [re, k] of RULES) if (re.test(n)) return k; return null; };
for (const [, k] of RULES) if (!DB[k]) throw new Error('reguła wskazuje brakujący klucz: ' + k);

const r1 = (x) => Math.round(x * 10) / 10;
function macrosFor(recipe) {
  let P = 0, C = 0, F = 0, known = 0;
  const unknown = [];
  for (const i of recipe.ingredients) {
    if (!i.calories) continue;
    const k = keyFor(i.name);
    if (!k) { unknown.push(i.name); continue; }
    const [kcal, p, c, f] = DB[k];
    known += i.calories;
    if (kcal > 0) { P += i.calories * p / kcal; C += i.calories * c / kcal; F += i.calories * f / kcal; }
  }
  const total = recipe.totalCalories || 0;
  const cover = total ? known / total : 1;
  const rest = total - known;
  if (rest > 0) { P += rest * 0.20 / 4; C += rest * 0.45 / 4; F += rest * 0.35 / 9; }
  return { cover, unknown, macros: { protein: r1(P), carbs: r1(C), fat: r1(F) } };
}

const evalArray = (src, marker) => {
  const a = src.indexOf('[', src.indexOf('=', src.indexOf(marker)));
  return eval(src.slice(a, src.indexOf('\n];', a) + 2));
};
const files = [
  { path: 'src/data/polishRecipes.ts', marker: 'export const POLISH_RECIPES' },
  { path: 'src/store/useAppStore.ts', marker: 'const SAMPLE_RECIPES' },
];
const allUnknown = {};
let done = 0, skipped = 0;
for (const f of files) {
  let src = fs.readFileSync(f.path, 'utf8');
  const list = evalArray(src, f.marker).filter((r) => !r.macros);
  for (const r of list) {
    const { cover, unknown, macros } = macrosFor(r);
    unknown.forEach((u) => (allUnknown[u] = (allUnknown[u] || 0) + 1));
    if (cover < PROG) { skipped++; console.log(`pominięty (${Math.round(cover * 100)}%): ${r.id} ${r.name}`); continue; }
    done++;
    if (!ZAPISZ) continue;
    // Blok przepisu: od jego id do następnego id (albo końca tablicy); makro wstawiamy za linią z servings.
    const start = src.indexOf(`id: '${r.id}',`);
    let end = src.indexOf("id: '", start + 5);
    if (end < 0) end = src.indexOf('\n];', start);
    const block = src.slice(start, end);
    const line = `macros: { protein: ${macros.protein}, carbs: ${macros.carbs}, fat: ${macros.fat} },`;
    const m = block.match(/\n(\s*)(totalCalories: \d+, )?servings: \d+,[^\n]*\n/);
    if (!m) throw new Error('nie znaleziono servings w ' + r.id);
    const at = start + m.index + m[0].length;
    src = src.slice(0, at) + `${m[1]}${line}\n` + src.slice(at);
  }
  if (ZAPISZ) fs.writeFileSync(f.path, src);
}
console.log(`\nZ makro: ${done}, pominięte: ${skipped}`);
const top = Object.entries(allUnknown).sort((a, b) => b[1] - a[1]);
console.log('Nierozpoznane składniki:', top.map(([n, c]) => `${n} (${c})`).join('; ') || 'brak');
