import { useState } from 'react';
import { Sparkles, Loader, ChevronDown, ChevronUp, RefreshCw } from 'lucide-react';
import { useAppStore, activeAI } from '../store/useAppStore';
import { callAI, parseAiJson } from '../lib/aiProvider';
import { POLISH_RECIPES } from '../data/polishRecipes';
import { onImgError } from '../lib/images';
import toast from 'react-hot-toast';
import { toLocalISO } from '../lib/date';

interface Recommendation {
  recipeId: string;
  recipeName: string;
  reason: string;
}

const CACHE_KEY = 'weeklyRecommendations';
const CACHE_TTL = 12 * 60 * 60 * 1000; // 12h

function loadCache(): { recs: Recommendation[]; ts: number } | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { recs: Recommendation[]; ts: number };
    if (Date.now() - parsed.ts > CACHE_TTL) return null;
    return parsed;
  } catch { return null; }
}

export default function WeeklyRecommendations() {
  const store = useAppStore();
  const { aiProvider, foodDiary, dailyGoal, proteinGoal, carbsGoal, fatGoal,
    setSelectedRecipe, setActiveView } = store;

  const [recs, setRecs]       = useState<Recommendation[]>(() => loadCache()?.recs ?? []);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(true);

  const { apiKey, model } = activeAI(store);

  async function generate() {
    if (!apiKey) { toast.error('Brak klucza API w Ustawieniach'); return; }
    setLoading(true);

    // Build last-7-days summary
    const days = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(); d.setDate(d.getDate() - i);
      return toLocalISO(d);
    });
    const weekEntries = foodDiary.filter(e => days.includes(e.date));
    const avgCal  = Math.round(weekEntries.reduce((s, e) => s + e.calories, 0) / 7);
    const avgProt = Math.round(weekEntries.reduce((s, e) => s + e.protein, 0) / 7);
    const avgCarb = Math.round(weekEntries.reduce((s, e) => s + e.carbs, 0) / 7);
    const avgFat  = Math.round(weekEntries.reduce((s, e) => s + e.fat, 0) / 7);

    // Top-50 recipes for AI to pick from (name + category + kcal/porcja)
    const recipeList = POLISH_RECIPES.slice(0, 80)
      .map(r => `${r.id}|${r.name}|${r.category}|${Math.round(r.totalCalories / r.servings)} kcal/porcja`)
      .join('\n');

    const prompt = `Jesteś dietetykiem. Użytkownik ma następujące statystyki z ostatnich 7 dni:
- Średnia dzienna: ${avgCal} kcal (cel: ${dailyGoal}), białko ${avgProt}g (cel: ${proteinGoal}g), węgle ${avgCarb}g (cel: ${carbsGoal}g), tłuszcz ${avgFat}g (cel: ${fatGoal}g)

Na podstawie tych danych wybierz 4 przepisy z poniższej listy, które najlepiej uzupełnią dietę użytkownika.

LISTA PRZEPISÓW (format: id|nazwa|kategoria|kalorie):
${recipeList}

Odpowiedz WYŁĄCZNIE jako JSON (bez markdown):
[
  { "recipeId": "id", "recipeName": "nazwa", "reason": "krótkie uzasadnienie po polsku (1 zdanie)" },
  ...
]`;

    try {
      const raw = await callAI(aiProvider, apiKey, model, { text: prompt });
      const parsed = parseAiJson<Recommendation[]>(raw);
      setRecs(parsed);
      localStorage.setItem(CACHE_KEY, JSON.stringify({ recs: parsed, ts: Date.now() }));
      setExpanded(true);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Błąd generowania', { duration: 5000 });
    } finally {
      setLoading(false);
    }
  }

  function openRecipe(rec: Recommendation) {
    const r = POLISH_RECIPES.find(p => p.id === rec.recipeId);
    if (!r) { toast.error('Przepis nie znaleziony'); return; }
    setSelectedRecipe({
      id: r.id, name: r.name, category: r.category,
      area: 'Polska', instructions: r.instructions,
      thumbnail: r.thumbnail, ingredients: r.ingredients,
      totalCalories: r.totalCalories, servings: r.servings, tags: r.time,
    });
    setActiveView('recipe-detail');
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
      {/* Header — div z roli przycisku, bo w środku jest osobny przycisk "Generuj"
          (zagnieżdżanie <button> w <button> jest niedozwolone w HTML) */}
      <div
        role="button"
        tabIndex={0}
        onClick={() => setExpanded(e => !e)}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setExpanded(x => !x); } }}
        className="w-full flex items-center justify-between px-4 py-3.5 cursor-pointer select-none"
      >
        <div className="flex items-center gap-2">
          <Sparkles size={18} className="text-purple-500" />
          <span className="font-bold text-gray-800 text-sm">Rekomendacje dla Ciebie</span>
          {recs.length > 0 && (
            <span className="text-xs bg-purple-100 text-purple-600 px-2 py-0.5 rounded-full font-medium">
              {recs.length}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={(e) => { e.stopPropagation(); generate(); }}
            disabled={loading}
            className="flex items-center gap-1 text-xs text-purple-600 font-semibold bg-purple-50 px-2.5 py-1.5 rounded-full hover:bg-purple-100 active:scale-95 transition-all disabled:opacity-50"
          >
            {loading ? <Loader size={12} className="animate-spin" /> : <RefreshCw size={12} />}
            {recs.length > 0 ? 'Odśwież' : 'Generuj'}
          </button>
          {expanded ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
        </div>
      </div>

      {expanded && (
        <div className="px-4 pb-4">
          {loading && (
            <div className="flex items-center gap-3 py-6 justify-center">
              <Loader size={20} className="text-purple-500 animate-spin" />
              <p className="text-sm text-gray-500">AI analizuje Twoją dietę…</p>
            </div>
          )}

          {!loading && recs.length === 0 && (
            <div className="text-center py-6">
              <p className="text-4xl mb-2">🥗</p>
              <p className="text-gray-500 text-sm">Kliknij „Generuj" żeby AI przeanalizowało Twój</p>
              <p className="text-gray-500 text-sm">jadłospis z ostatnich 7 dni</p>
            </div>
          )}

          {!loading && recs.length > 0 && (
            <div className="space-y-2">
              {recs.map((rec, i) => {
                const recipe = POLISH_RECIPES.find(r => r.id === rec.recipeId);
                return (
                  <button
                    key={i}
                    onClick={() => openRecipe(rec)}
                    className="w-full flex items-center gap-3 bg-gray-50 rounded-xl p-3 text-left hover:bg-purple-50 active:scale-98 transition-all"
                  >
                    {recipe && (
                      <img src={recipe.thumbnail} alt={rec.recipeName}
                        onError={onImgError}
                        className="w-14 h-14 rounded-xl object-cover flex-shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-gray-800 text-sm truncate">{rec.recipeName}</p>
                      <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{rec.reason}</p>
                    </div>
                    <span className="text-purple-400 text-xs font-bold flex-shrink-0">→</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
