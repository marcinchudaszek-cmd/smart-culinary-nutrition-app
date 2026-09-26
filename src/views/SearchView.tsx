import { useState, useMemo, useEffect, useRef } from 'react';
import { Search, X, ChefHat, Globe, Loader2, Wifi, SlidersHorizontal, WifiOff, Heart } from 'lucide-react';

// ── Offline cache ─────────────────────────────────────────────────────────
const CACHE_PREFIX = 'onlineRecipeCache_';
const CACHE_TTL = 24 * 60 * 60 * 1000;

function saveCache(key: string, data: OnlineRecipe[]) {
  try { localStorage.setItem(CACHE_PREFIX + key, JSON.stringify({ ts: Date.now(), data })); } catch {}
}
function loadCache(key: string): OnlineRecipe[] | null {
  try {
    const raw = localStorage.getItem(CACHE_PREFIX + key);
    if (!raw) return null;
    const { ts, data } = JSON.parse(raw) as { ts: number; data: OnlineRecipe[] };
    return Date.now() - ts < CACHE_TTL ? data : null;
  } catch { return null; }
}
import { useAppStore, activeAI } from '../store/useAppStore';
import { POLISH_RECIPES, CATEGORIES_PL } from '../data/polishRecipes';
import { callAI, type AiProvider } from '../lib/aiProvider';
import toast from 'react-hot-toast';
import { todayISO } from '../lib/date';
import { onImgError } from '../lib/images';

interface OnlineRecipe {
  id: string;
  name: string;
  category: string;
  area: string;
  instructions: string;
  thumbnail: string;
  readyInMinutes?: number;
  source?: 'spoonacular' | 'themealdb';
  totalCalories?: number;
  servings?: number;
  ingredients?: { name: string; amount: string; calories: number }[];
}

// ── Słownik PL→EN ─────────────────────────────────────────────────────────

const PL_EN: Record<string, string> = {
  // zupy
  'zupa': 'soup', 'zupka': 'soup', 'rosół': 'chicken broth', 'barszcz': 'borscht',
  'żurek': 'sour rye soup', 'kapuśniak': 'sauerkraut soup', 'grochówka': 'pea soup',
  'krupnik': 'barley soup', 'flaki': 'tripe soup', 'flaczki': 'tripe',
  'chłodnik': 'cold beet soup', 'botwinka': 'beet soup', 'ogórkowa': 'pickle soup',
  'pomidorowa': 'tomato soup', 'grzybowa': 'mushroom soup', 'fasolowa': 'bean soup',
  'cebulowa': 'onion soup', 'kalafiorowa': 'cauliflower soup', 'szczawiowa': 'sorrel soup',
  'zupa rybna': 'fish soup', 'minestrone': 'minestrone',
  // mięso
  'kurczak': 'chicken', 'kurczaka': 'chicken', 'pierś': 'chicken breast',
  'wołowina': 'beef', 'wieprzowina': 'pork', 'schab': 'pork loin',
  'karkówka': 'pork neck', 'żeberka': 'ribs', 'boczek': 'bacon',
  'kiełbasa': 'sausage', 'indyk': 'turkey', 'kaczka': 'duck',
  'jagnięcina': 'lamb', 'cielęcina': 'veal', 'królik': 'rabbit',
  'wątroba': 'liver', 'szynka': 'ham', 'mielone': 'ground meat',
  'steak': 'steak', 'stek': 'steak',
  // ryby
  'ryba': 'fish', 'łosoś': 'salmon', 'dorsz': 'cod', 'pstrąg': 'trout',
  'tuńczyk': 'tuna', 'śledź': 'herring', 'krewetki': 'shrimp', 'karp': 'carp',
  // dania
  'bigos': 'bigos hunter stew', 'pierogi': 'pierogi dumplings',
  'kotlet': 'cutlet', 'kotlet schabowy': 'pork schnitzel',
  'gołąbki': 'stuffed cabbage rolls', 'zrazy': 'beef rolls',
  'gulasz': 'goulash', 'pulpety': 'meatballs', 'naleśniki': 'crepes',
  'placki ziemniaczane': 'potato pancakes', 'kopytka': 'potato dumplings',
  'kluski śląskie': 'silesian dumplings', 'lasagne': 'lasagne',
  'risotto': 'risotto', 'curry': 'curry', 'wrap': 'wrap',
  // makarony i ryż
  'makaron': 'pasta', 'spaghetti': 'spaghetti', 'ryż': 'rice',
  'kasza': 'groats', 'kasza gryczana': 'buckwheat', 'kasza jaglana': 'millet',
  // warzywa
  'ziemniaki': 'potatoes', 'marchew': 'carrot', 'buraki': 'beets',
  'kapusta': 'cabbage', 'szpinak': 'spinach', 'brokuły': 'broccoli',
  'papryka': 'bell pepper', 'pomidory': 'tomatoes', 'ogórek': 'cucumber',
  'cukinia': 'zucchini', 'dynia': 'pumpkin', 'grzyby': 'mushrooms',
  'cebula': 'onion', 'czosnek': 'garlic', 'fasola': 'beans',
  'groch': 'peas', 'soczewica': 'lentils', 'ciecierzyca': 'chickpeas',
  // nabiał i jajka
  'jajka': 'eggs', 'jajecznica': 'scrambled eggs', 'omlet': 'omelette',
  'ser': 'cheese', 'twaróg': 'cottage cheese', 'śmietana': 'cream',
  'jogurt': 'yogurt', 'masło': 'butter',
  // sałatki
  'sałatka': 'salad', 'surówka': 'coleslaw', 'sałata': 'lettuce',
  // desery
  'szarlotka': 'apple pie', 'sernik': 'cheesecake', 'makowiec': 'poppy seed roll',
  'babka': 'bundt cake', 'piernik': 'gingerbread', 'ciasto': 'cake',
  'ciasteczka': 'cookies', 'muffiny': 'muffins', 'budyń': 'pudding',
  'kisiel': 'fruit jelly', 'lody': 'ice cream', 'panna cotta': 'panna cotta',
  'tort': 'layer cake', 'beza': 'meringue', 'rogaliki': 'croissants',
  // śniadania
  'owsianka': 'oatmeal', 'jaglanka': 'millet porridge', 'granola': 'granola',
  'tosty': 'toast', 'kanapki': 'sandwich', 'smoothie': 'smoothie',
  'shake': 'shake', 'racuchy': 'apple fritters',
  // fit
  'fit': 'healthy light', 'dieta': 'diet healthy', 'wegetariańskie': 'vegetarian',
  'wegańskie': 'vegan', 'bezglutenowe': 'gluten free',
  // grill
  'grill': 'grilled', 'grillowane': 'grilled', 'grillowany': 'grilled',
  'bbq': 'bbq', 'szaszłyki': 'skewers kebab', 'szaszłyk': 'skewer kebab',
  'burger': 'burger', 'hamburgery': 'burgers', 'karkówka z grilla': 'grilled pork neck',
  'żeberka bbq': 'bbq ribs', 'skrzydełka': 'chicken wings',
  // kuchnia regionalna
  'śląskie': 'silesian',
  'golonka': 'pork knuckle',
  'oscypek': 'smoked sheep cheese', 'czernina': 'duck blood soup',
  'regionalny': 'regional polish', 'regionalna': 'regional polish',
  'góralskie': 'highland polish', 'kresowe': 'eastern polish',
  // świąteczne
  'wigilia': 'christmas polish', 'wigilijne': 'christmas polish',
  'wielkanoc': 'easter polish', 'wielkanocne': 'easter polish',
  'kutia': 'wheat honey nuts', 'mazurek': 'easter tart cake',
};

function translateQuery(query: string): string {
  const q = query.trim().toLowerCase();
  if (PL_EN[q]) return PL_EN[q];
  // próbuj słowo po słowie
  const words = q.split(/\s+/);
  const translated = words.map((w) => PL_EN[w] ?? w);
  const result = translated.join(' ');
  // jeśli przetłumaczono choć jedno słowo, zwróć przetłumaczone
  return result !== q ? result : query;
}

// ── TheMealDB ──────────────────────────────────────────────────────────────

interface MealDbMeal {
  idMeal: string;
  strMeal: string;
  strCategory: string;
  strArea: string;
  strInstructions: string;
  strMealThumb: string;
  [key: string]: string | null;
}

function parseMealDb(meal: MealDbMeal): OnlineRecipe {
  // TheMealDB trzyma składniki w polach strIngredient1..20 i strMeasure1..20
  const ingredients: { name: string; amount: string; calories: number }[] = [];
  for (let i = 1; i <= 20; i++) {
    const name = (meal[`strIngredient${i}`] ?? '').trim();
    const measure = (meal[`strMeasure${i}`] ?? '').trim();
    if (name) {
      ingredients.push({ name, amount: measure, calories: 0 });
    }
  }
  return {
    id: meal.idMeal,
    name: meal.strMeal,
    category: meal.strCategory,
    area: meal.strArea,
    instructions: meal.strInstructions || '',
    thumbnail: meal.strMealThumb,
    source: 'themealdb',
    servings: 4,
    totalCalories: 0,
    ingredients: ingredients.length > 0 ? ingredients : [],
  };
}

async function searchMealDb(query: string): Promise<OnlineRecipe[]> {
  const res = await fetch(
    `https://www.themealdb.com/api/json/v1/1/search.php?s=${encodeURIComponent(query)}`
  );
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();
  return (data.meals ?? []).map(parseMealDb);
}

// ── Spoonacular ────────────────────────────────────────────────────────────

interface SpoonResult {
  id: number;
  title: string;
  image: string;
  readyInMinutes: number;
  servings: number;
  cuisines: string[];
  dishTypes: string[];
  instructions?: string;
  analyzedInstructions: Array<{ steps: Array<{ number: number; step: string }> }>;
  extendedIngredients: Array<{ name: string; amount: number; unit: string; original: string }>;
  nutrition?: { nutrients: Array<{ name: string; amount: number; unit: string }> };
}

function parseSpoonacular(r: SpoonResult): OnlineRecipe {
  const steps = r.analyzedInstructions?.[0]?.steps ?? [];
  let instructions: string;
  if (steps.length > 0) {
    instructions = steps.map((s) => `${s.number}. ${s.step}`).join('\n');
  } else if (r.instructions) {
    instructions = r.instructions.replace(/<[^>]+>/g, '').trim();
  } else {
    instructions = 'Brak szczegółowych instrukcji.';
  }
  const cuisine = r.cuisines?.[0] ?? r.dishTypes?.[0] ?? 'Świat';
  const kcal = r.nutrition?.nutrients?.find((n) => n.name === 'Calories')?.amount ?? 0;
  const ingredients = (r.extendedIngredients ?? []).map((i) => ({
    name: i.name,
    amount: `${i.amount} ${i.unit}`.trim(),
    calories: 0,
  }));
  return {
    id: String(r.id),
    name: r.title,
    category: r.dishTypes?.[0] ?? 'Przepis',
    area: cuisine,
    instructions,
    thumbnail: r.image,
    readyInMinutes: r.readyInMinutes,
    source: 'spoonacular',
    totalCalories: Math.round(kcal * (r.servings ?? 1)),
    servings: r.servings ?? 4,
    ingredients,
  };
}

async function searchSpoonacular(query: string, apiKey: string): Promise<OnlineRecipe[]> {
  // fillIngredients=true → bez tego complexSearch NIE zwraca składników (extendedIngredients).
  const res = await fetch(
    `https://api.spoonacular.com/recipes/complexSearch?query=${encodeURIComponent(query)}&number=20&addRecipeInformation=true&addRecipeNutrition=true&fillIngredients=true&apiKey=${apiKey}`
  );
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();
  return (data.results ?? []).map(parseSpoonacular);
}

// Pobiera pełne dane pojedynczego przepisu ze Spoonacular (składniki + instrukcje),
// gdy wyniki wyszukiwania były niekompletne. Wywoływane przy otwarciu przepisu.
async function fetchSpoonacularDetails(id: string, apiKey: string): Promise<OnlineRecipe | null> {
  try {
    const res = await fetch(
      `https://api.spoonacular.com/recipes/${id}/information?includeNutrition=true&apiKey=${apiKey}`
    );
    if (!res.ok) return null;
    const data = await res.json();
    return parseSpoonacular(data as SpoonResult);
  } catch {
    return null;
  }
}

// ── Map to SelectedRecipe ──────────────────────────────────────────────────

function toSelectedRecipe(r: OnlineRecipe) {
  return {
    id: r.id,
    name: r.name,
    category: r.category,
    area: r.area,
    instructions: r.instructions,
    thumbnail: r.thumbnail,
    ingredients: r.ingredients ?? [],
    totalCalories: r.totalCalories ?? 0,
    servings: r.servings ?? 4,
    tags: r.area,
  };
}

// Szybkie tłumaczenie krótkich pól (nazwa/kategoria/kuchnia) dla LISTY wyników.
// NIE tłumaczymy tu instrukcji — pełną instrukcję tłumaczymy dopiero przy otwarciu
// przepisu (translateRecipeFull), dzięki czemu nigdy nie jest obcinana ani gubiona.
async function translateRecipesBatch(recipes: OnlineRecipe[], provider: AiProvider, apiKey: string, model: string): Promise<OnlineRecipe[]> {
  if (!apiKey || recipes.length === 0) return recipes;
  const items = recipes.map((r, i) => ({ i, name: r.name, category: r.category, area: r.area }));
  const prompt = `Przetłumacz na język polski nazwy poniższych przepisów. Odpowiedz TYLKO tablicą JSON. Każdy element musi mieć pola: "i" (numer indeksu bez zmian), "name", "category", "area". Nie dodawaj nic poza tablicą JSON.

${JSON.stringify(items)}`;
  try {
    const raw = await callAI(provider, apiKey, model, { text: prompt });
    const match = raw.match(/\[[\s\S]*\]/);
    if (!match) return recipes;
    const parsed = JSON.parse(match[0]) as Array<{ i: number; name?: string; category?: string; area?: string }>;
    return recipes.map((r, idx) => {
      const t = parsed.find((p) => p.i === idx);
      if (!t) return r;
      return {
        ...r,
        name: t.name ?? r.name,
        category: t.category ?? r.category,
        area: t.area ?? r.area,
      };
    });
  } catch {
    return recipes;
  }
}

// Tłumaczy JEDEN przepis w całości (pełna instrukcja + składniki) — wywoływane przy
// otwarciu. Oryginalna (angielska) treść jest zawsze zachowywana jako fallback,
// więc instrukcja nigdy nie znika.
async function translateRecipeFull(r: OnlineRecipe, provider: AiProvider, apiKey: string, model: string): Promise<OnlineRecipe> {
  if (!apiKey || !r.instructions || r.instructions === 'Brak szczegółowych instrukcji.') return r;
  const payload = {
    name: r.name,
    category: r.category,
    area: r.area,
    instructions: r.instructions,
    ingredients: (r.ingredients ?? []).map((i) => ({ name: i.name, amount: i.amount })),
  };
  const prompt = `Przetłumacz na język polski poniższy przepis kulinarny. Zachowaj wszystkie kroki i sens. Odpowiedz TYLKO poprawnym obiektem JSON z polami: "name", "category", "area", "instructions" (pełny przepis krok po kroku), "ingredients" (tablica obiektów {"name","amount"} w tej samej kolejności). Nie dodawaj nic poza obiektem JSON.

${JSON.stringify(payload)}`;
  try {
    const raw = await callAI(provider, apiKey, model, { text: prompt });
    const match = raw.match(/\{[\s\S]*\}/);
    if (!match) return r;
    const t = JSON.parse(match[0]) as {
      name?: string; category?: string; area?: string; instructions?: string;
      ingredients?: Array<{ name?: string; amount?: string }>;
    };
    const baseIngs = r.ingredients ?? [];
    const ingredients =
      Array.isArray(t.ingredients) && t.ingredients.length === baseIngs.length
        ? baseIngs.map((ing, idx) => ({
            name: t.ingredients![idx]?.name || ing.name,
            amount: t.ingredients![idx]?.amount || ing.amount,
            calories: ing.calories,
          }))
        : baseIngs;
    return {
      ...r,
      name: t.name || r.name,
      category: t.category || r.category,
      area: t.area || r.area,
      instructions: t.instructions || r.instructions,
      ingredients,
    };
  } catch {
    return r;
  }
}

// ── Search helpers ─────────────────────────────────────────────────────────

function normalize(s: string): string {
  return s.toLowerCase()
    .replace(/ą/g,'a').replace(/ę/g,'e').replace(/ó/g,'o').replace(/ś/g,'s')
    .replace(/ź/g,'z').replace(/ż/g,'z').replace(/ć/g,'c').replace(/ń/g,'n')
    .replace(/ł/g,'l');
}

function scoreRecipe(recipe: { name: string; category: string; ingredients: { name: string }[] }, words: string[]): number {
  if (words.length === 0) return 1;
  const name = normalize(recipe.name);
  const cat  = normalize(recipe.category);
  const ings = recipe.ingredients.map(i => normalize(i.name)).join(' ');

  let score = 0;
  const nameMatchCount = words.filter(w => name.includes(w)).length;
  const ingMatchCount  = words.filter(w => ings.includes(w)).length;

  if (name === words.join(' '))        score += 300; // exact match
  if (name.startsWith(words[0]))       score +=  80;
  if (nameMatchCount === words.length) score += 100; // all words in name
  else                                 score +=  nameMatchCount * 30;
  if (ingMatchCount  === words.length) score +=  60;
  else                                 score +=  ingMatchCount  * 15;
  if (cat.includes(words[0]))          score +=  20;

  return score;
}

const MEDITERRANEAN_KEYWORDS = ['oliwa','oliwki','losos','dorsc','tunczyk','pstrag',
  'krewetki','ryba','fasola','soczewica','ciecierzyca','szpinak','baklazan',
  'cukinia','feta','mozzarella','quinoa','kuskus','orzechy'];

function isMediterranean(recipe: { ingredients: { name: string }[]; category: string }): boolean {
  const ings = recipe.ingredients.map(i => normalize(i.name));
  const hits = MEDITERRANEAN_KEYWORDS.filter(k => ings.some(i => i.includes(k))).length;
  return hits >= 2 || ['Ryby i owoce morza', 'Sałatki', 'Wegetariańskie'].includes(recipe.category);
}

// ── ─────────────────────────────────────────────────────────────────────────

export default function SearchView() {
  const {
    setActiveView, setSelectedRecipe, spoonacularApiKey,
    aiProvider,
    pendingSearchQuery, pendingSearchTab, setPendingSearchQuery,
    dailyGoal, foodDiary,
    favoriteIds, toggleFavorite,
  } = useAppStore();
  const [tab, setTab] = useState<'local' | 'online'>('local');
  const [query, setQuery] = useState('');
  const [maxCalFilter, setMaxCalFilter] = useState(0);
  const [showCalFilter, setShowCalFilter] = useState(false);
  const [fromCache, setFromCache] = useState(false);
  const [activeDiet, setActiveDiet] = useState<'' | 'low-cal' | 'mediterranean' | 'daily-goals'>('');

  const today = todayISO();
  const todayCalories = foodDiary.filter(e => e.date === today).reduce((s, e) => s + e.calories, 0);
  const remainingCal = Math.max(dailyGoal - todayCalories, 0);

  useEffect(() => {
    if (pendingSearchQuery) {
      setQuery(pendingSearchQuery);
      if (pendingSearchTab === 'online') setTab('online');
      setPendingSearchQuery('');
    }
  }, [pendingSearchQuery, pendingSearchTab, setPendingSearchQuery]);
  const [activeCategory, setActiveCategory] = useState('Wszystkie');

  // Online search state
  const [onlineResults, setOnlineResults] = useState<OnlineRecipe[]>([]);
  const [onlineLoading, setOnlineLoading] = useState(false);
  const [onlineError, setOnlineError] = useState('');
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const localResults = useMemo(() => {
    const words = normalize(query.trim()).split(/\s+/).filter(Boolean);
    return POLISH_RECIPES
      .filter((r) => {
        const perServing = Math.round(r.totalCalories / r.servings);
        if (activeCategory !== 'Wszystkie' && r.category !== activeCategory) return false;
        if (maxCalFilter > 0 && perServing > maxCalFilter) return false;
        if (activeDiet === 'low-cal'       && perServing > 400)            return false;
        if (activeDiet === 'mediterranean' && !isMediterranean(r))         return false;
        if (activeDiet === 'daily-goals'   && perServing > remainingCal)   return false;
        if (words.length === 0) return true;
        return scoreRecipe(r, words) > 0;
      })
      .map((r) => ({ r, score: scoreRecipe(r, words) }))
      .sort((a, b) => b.score - a.score)
      .map(({ r }) => r);
  }, [query, activeCategory, maxCalFilter, activeDiet, remainingCal]);

  useEffect(() => {
    if (tab !== 'online') return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    const q = query.trim();
    if (!q) {
      setOnlineResults([]);
      setOnlineError('');
      return;
    }
    debounceRef.current = setTimeout(async () => {
      setOnlineLoading(true);
      setOnlineError('');
      setFromCache(false);
      try {
        const translatedQ = translateQuery(q);
        const results = spoonacularApiKey
          ? await searchSpoonacular(translatedQ, spoonacularApiKey)
          : await searchMealDb(translatedQ);

        const { apiKey: aiKey, model: aiModel } = activeAI(useAppStore.getState());
        const translated = aiKey
          ? await translateRecipesBatch(results, aiProvider, aiKey, aiModel)
          : results;
        saveCache(translatedQ, translated);
        setOnlineResults(translated);
      } catch (e: unknown) {
        const translatedQ = translateQuery(q);
        const cached = loadCache(translatedQ);
        if (cached) {
          setOnlineResults(cached);
          setFromCache(true);
        } else {
          const msg = e instanceof Error ? e.message : String(e);
          setOnlineError(msg);
          setOnlineResults([]);
        }
      } finally {
        setOnlineLoading(false);
      }
    }, 500);
  }, [query, tab, spoonacularApiKey]);

  const openLocalRecipe = (id: string) => {
    const recipe = POLISH_RECIPES.find((r) => r.id === id);
    if (!recipe) return;
    setSelectedRecipe({
      id: recipe.id,
      name: recipe.name,
      category: recipe.category,
      area: 'Polska',
      instructions: recipe.instructions,
      thumbnail: recipe.thumbnail,
      ingredients: recipe.ingredients,
      totalCalories: recipe.totalCalories,
      servings: recipe.servings,
      tags: recipe.time,
    });
    setActiveView('recipe-detail');
  };

  const openOnlineRecipe = async (r: OnlineRecipe) => {
    const { apiKey: aiKey, model: aiModel } = activeAI(useAppStore.getState());

    const needsDetails =
      r.source === 'spoonacular' &&
      (!r.ingredients || r.ingredients.length === 0 ||
       !r.instructions || r.instructions === 'Brak szczegółowych instrukcji.');

    // Nic do roboty po stronie AI ani Spoonacular → pokaż od razu (oryginał).
    if (!needsDetails && (!aiKey || !r.instructions || r.instructions === 'Brak szczegółowych instrukcji.')) {
      setSelectedRecipe(toSelectedRecipe(r));
      setActiveView('recipe-detail');
      return;
    }

    const tid = toast.loading(needsDetails ? 'Pobieram przepis…' : 'Tłumaczę przepis…');
    try {
      // 1) Uzupełnij brakujące składniki/instrukcje ze Spoonacular (pełny endpoint).
      let recipe = r;
      if (needsDetails && spoonacularApiKey) {
        const details = await fetchSpoonacularDetails(r.id, spoonacularApiKey);
        if (details) recipe = details;
      }
      // 2) Przetłumacz całość, jeśli mamy klucz AI i są instrukcje.
      if (aiKey && recipe.instructions && recipe.instructions !== 'Brak szczegółowych instrukcji.') {
        recipe = await translateRecipeFull(recipe, aiProvider, aiKey, aiModel);
      }
      setSelectedRecipe(toSelectedRecipe(recipe));
    } finally {
      toast.dismiss(tid);
      setActiveView('recipe-detail');
    }
  };

  return (
    <div className="pb-20 min-h-dvh bg-gray-50">
      {/* Header */}
      <div className="bg-white px-4 pt-12 pb-4 shadow-sm sticky top-0 z-40">
        <h1 className="text-xl font-bold text-gray-800 mb-3 flex items-center gap-2">
          <Globe size={20} className="text-orange-500" />
          Wyszukaj przepis
        </h1>

        {/* Tab switcher */}
        <div className="flex bg-gray-100 rounded-xl p-1 mb-3 gap-1">
          <button
            onClick={() => setTab('local')}
            className={`flex-1 py-2 rounded-lg text-xs font-semibold transition-all ${
              tab === 'local'
                ? 'bg-white text-orange-500 shadow'
                : 'text-gray-500'
            }`}
          >
            🇵🇱 Przepisy polskie
          </button>
          <button
            onClick={() => setTab('online')}
            className={`flex-1 py-2 rounded-lg text-xs font-semibold transition-all flex items-center justify-center gap-1 ${
              tab === 'online'
                ? 'bg-white text-orange-500 shadow'
                : 'text-gray-500'
            }`}
          >
            <Wifi size={12} />
            Szukaj online
          </button>
        </div>

        <div className="relative mb-2">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={tab === 'local' ? 'Szukaj przepisu...' : 'Wpisz nazwę potrawy...'}
            className="w-full bg-gray-100 rounded-2xl pl-10 pr-10 py-3 text-sm outline-none focus:ring-2 focus:ring-orange-400 transition-all"
          />
          <Search size={18} className="absolute left-3 top-3.5 text-gray-400" />
          {query && (
            <button onClick={() => setQuery('')} className="absolute right-3 top-3.5 text-gray-400">
              <X size={18} />
            </button>
          )}
        </div>

        {tab === 'local' && (
          <>
            <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
              {CATEGORIES_PL.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                    activeCategory === cat
                      ? 'bg-orange-500 text-white shadow'
                      : 'bg-white text-gray-600 border border-gray-200'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
            {/* Dietary filters */}
            <div className="flex gap-2 overflow-x-auto pb-1 mt-2 scrollbar-hide">
              {([
                { id: 'low-cal',       label: '🥗 Niskokaloryczne', desc: '<400 kcal/porcja' },
                { id: 'mediterranean', label: '🫒 Śródziemnomorska', desc: 'ryby, oliwki, warzywa' },
                { id: 'daily-goals',   label: '🎯 Pasuje do celów',  desc: `zostało ${remainingCal} kcal` },
              ] as const).map(({ id, label }) => (
                <button
                  key={id}
                  onClick={() => setActiveDiet(activeDiet === id ? '' : id)}
                  className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                    activeDiet === id
                      ? 'bg-green-500 text-white shadow'
                      : 'bg-white text-gray-600 border border-gray-200'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            <div className="mt-2">
              <button
                onClick={() => { setShowCalFilter(!showCalFilter); if (showCalFilter) setMaxCalFilter(0); }}
                className={`flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full transition-all ${
                  maxCalFilter > 0 ? 'bg-orange-500 text-white' : 'bg-white text-gray-500 border border-gray-200'
                }`}
              >
                <SlidersHorizontal size={12} />
                {maxCalFilter > 0 ? `Max ${maxCalFilter} kcal/porcja` : 'Filtr kalorii'}
              </button>
              {showCalFilter && (
                <div className="mt-2 bg-white rounded-2xl p-4 shadow-sm">
                  <div className="flex justify-between text-xs text-gray-500 mb-2">
                    <span>Maks. kcal na porcję</span>
                    <span className="font-bold text-orange-500">{maxCalFilter === 0 ? 'Bez limitu' : `${maxCalFilter} kcal`}</span>
                  </div>
                  <input
                    type="range" min={100} max={1500} step={50}
                    value={maxCalFilter === 0 ? 1500 : maxCalFilter}
                    onChange={(e) => setMaxCalFilter(Number(e.target.value) === 1500 ? 0 : Number(e.target.value))}
                    className="w-full accent-orange-500"
                  />
                  <div className="flex justify-between text-xs text-gray-300 mt-1">
                    <span>100</span><span>500</span><span>1000</span><span>1500+</span>
                  </div>
                </div>
              )}
            </div>
          </>
        )}

        {tab === 'online' && (
          <p className="text-xs text-gray-400">
            {spoonacularApiKey
              ? '🟢 Spoonacular — miliony przepisów, obsługuje polskie zapytania'
              : '⚪ TheMealDB (brak klucza Spoonacular) — szukaj po angielsku'}
          </p>
        )}
      </div>

      <div className="px-4 mt-4">
        {/* LOCAL TAB */}
        {tab === 'local' && (
          localResults.length === 0 ? (
            <div className="text-center py-16">
              <ChefHat size={56} className="text-orange-200 mx-auto mb-4" />
              <p className="text-gray-500 font-medium">Brak wyników</p>
              <p className="text-gray-400 text-sm">Spróbuj innej nazwy lub kategorii</p>
            </div>
          ) : (
            <>
              <p className="text-xs text-gray-400 mb-3">Znaleziono: {localResults.length} przepisów</p>
              <div className="grid grid-cols-2 gap-3">
                {localResults.map((recipe) => (
                  <div
                    key={recipe.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => openLocalRecipe(recipe.id)}
                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openLocalRecipe(recipe.id); } }}
                    className="bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-all active:scale-95 text-left cursor-pointer"
                  >
                    <div className="relative">
                      <img
                        src={recipe.thumbnail}
                        alt={recipe.name}
                        className="w-full h-32 object-cover"
                        loading="lazy"
                        onError={onImgError}
                      />
                      <button
                        onClick={(e) => { e.stopPropagation(); toggleFavorite(recipe.id); }}
                        className="absolute top-2 right-2 bg-white/90 rounded-full p-1.5 shadow-sm active:scale-90 transition-all"
                      >
                        <Heart
                          size={14}
                          className={favoriteIds.includes(recipe.id) ? 'text-red-500 fill-red-500' : 'text-gray-400'}
                        />
                      </button>
                    </div>
                    <div className="p-3">
                      <p className="font-semibold text-gray-800 text-sm line-clamp-2 leading-tight mb-1">
                        {recipe.name}
                      </p>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-orange-500 bg-orange-50 px-2 py-0.5 rounded-full">
                          {recipe.category}
                        </span>
                        <span className="text-xs text-gray-400">⏱ {recipe.time}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )
        )}

        {/* ONLINE TAB */}
        {tab === 'online' && (
          <>
            {!query.trim() && (
              <div className="text-center py-16">
                <Wifi size={56} className="text-orange-200 mx-auto mb-4" />
                <p className="text-gray-500 font-medium">Wpisz nazwę potrawy</p>
                {spoonacularApiKey
                  ? <p className="text-gray-400 text-sm mt-1">Najlepiej po angielsku: "pierogi", "bigos", "chicken soup"</p>
                  : <p className="text-gray-400 text-sm mt-1">Po angielsku: "chicken", "pasta", "soup"</p>
                }
              </div>
            )}

            {onlineLoading && (
              <div className="flex justify-center items-center py-16 gap-3">
                <Loader2 size={28} className="animate-spin text-orange-400" />
                <p className="text-gray-500">Szukam online...</p>
              </div>
            )}

            {onlineError && !onlineLoading && (
              <div className="text-center py-16">
                <WifiOff size={40} className="text-gray-300 mx-auto mb-3" />
                <p className="text-red-500 font-medium mb-1">Brak połączenia</p>
                <p className="text-gray-400 text-sm">{onlineError}</p>
                <p className="text-gray-400 text-xs mt-2">Sprawdź internet — wyniki z poprzednich wyszukiwań są zapisane</p>
              </div>
            )}

            {!onlineLoading && !onlineError && query.trim() && onlineResults.length === 0 && (
              <div className="text-center py-16">
                <ChefHat size={56} className="text-orange-200 mx-auto mb-4" />
                <p className="text-gray-500 font-medium">Brak wyników</p>
                <p className="text-gray-400 text-sm">Spróbuj innej nazwy (najlepiej po angielsku)</p>
              </div>
            )}

            {!onlineLoading && onlineResults.length > 0 && (
              <>
                <div className="flex items-center gap-2 mb-3 flex-wrap">
                  <p className="text-xs text-gray-400">
                    Znaleziono: {onlineResults.length} przepisów
                    {onlineResults[0]?.source === 'spoonacular' && ' • Spoonacular'}
                    {onlineResults[0]?.source === 'themealdb' && ' • TheMealDB'}
                  </p>
                  {fromCache && (
                    <span className="flex items-center gap-1 bg-yellow-50 text-yellow-600 text-xs px-2 py-0.5 rounded-full border border-yellow-200">
                      <WifiOff size={10} /> z pamięci
                    </span>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {onlineResults.map((r) => (
                    <button
                      key={r.id}
                      onClick={() => openOnlineRecipe(r)}
                      className="bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-all active:scale-95 text-left"
                    >
                      <img
                        src={r.thumbnail}
                        alt={r.name}
                        className="w-full h-32 object-cover"
                        loading="lazy"
                        onError={onImgError}
                      />
                      <div className="p-3">
                        <p className="font-semibold text-gray-800 text-sm line-clamp-2 leading-tight mb-1">
                          {r.name}
                        </p>
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-orange-500 bg-orange-50 px-2 py-0.5 rounded-full">
                            {r.category}
                          </span>
                          <span className="text-xs text-gray-400">
                            {r.readyInMinutes ? `⏱ ${r.readyInMinutes} min` : `🌍 ${r.area}`}
                          </span>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}
