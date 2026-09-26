import { useState, useCallback } from 'react';
import { Camera, Upload, X, Loader, Plus, Search, Clock, ChefHat, Trash2, BookOpen } from 'lucide-react';
import { Camera as CapCamera, CameraResultType, CameraSource } from '@capacitor/camera';
import { useAppStore, activeAI } from '../store/useAppStore';
import { callAI, parseAiJson, type AiProvider } from '../lib/aiProvider';
import { POLISH_RECIPES } from '../data/polishRecipes';
import toast from 'react-hot-toast';

interface MealSuggestion {
  name: string;
  emoji: string;
  difficulty: 'łatwe' | 'średnie' | 'trudne';
  time: string;
  description: string;
  usedIngredients: string[];
  missingIngredients: string[];
}

interface ChefResult {
  detectedIngredients?: string[];
  suggestions: MealSuggestion[];
}

const DIFFICULTY_COLOR: Record<string, string> = {
  łatwe: 'bg-green-100 text-green-700',
  średnie: 'bg-yellow-100 text-yellow-700',
  trudne: 'bg-red-100 text-red-700',
};

async function askChefAI(
  provider: AiProvider,
  apiKey: string,
  model: string,
  mode: 'fridge' | 'text',
  ingredients?: string[],
  imageDataUrl?: string,
): Promise<ChefResult> {
  const fridgePrompt = `Jesteś kulinarnym asystentem. Przeanalizuj zawartość lodówki/spiżarni na tym zdjęciu.
Odpowiedz WYŁĄCZNIE obiektem JSON (bez dodatkowego tekstu):
{
  "detectedIngredients": ["składnik1", "składnik2"],
  "suggestions": [
    {
      "name": "polska nazwa potrawy",
      "emoji": "emoji",
      "difficulty": "łatwe",
      "time": "20 min",
      "description": "krótki opis po polsku (1 zdanie)",
      "usedIngredients": ["składniki ze zdjęcia których użyjemy"],
      "missingIngredients": ["czego brakuje lub pusta lista"]
    }
  ]
}
Zaproponuj 4 potrawy. Możesz zakładać że są dostępne: olej, sól, pieprz, cukier, mąka.`;

  const textPrompt = `Mam następujące składniki: ${ingredients?.join(', ')}.
Zaproponuj 4 potrawy które mogę ugotować.
Odpowiedz WYŁĄCZNIE obiektem JSON (bez dodatkowego tekstu):
{
  "suggestions": [
    {
      "name": "polska nazwa potrawy",
      "emoji": "emoji",
      "difficulty": "łatwe",
      "time": "20 min",
      "description": "krótki opis po polsku (1 zdanie)",
      "usedIngredients": ["składniki z mojej listy których użyjemy"],
      "missingIngredients": ["czego brakuje lub pusta lista"]
    }
  ]
}
Możesz zakładać że są dostępne: olej, sól, pieprz, cukier, mąka.`;

  const text = await callAI(provider, apiKey, model, {
    text: mode === 'fridge' ? fridgePrompt : textPrompt,
    imageDataUrl: mode === 'fridge' ? imageDataUrl : undefined,
  });

  return parseAiJson<ChefResult>(text);
}

const GROQ_TEXT_ONLY_MODELS = new Set([
  'llama-3.3-70b-versatile',
  'llama-3.1-8b-instant',
]);

// ---------- Fridge Scanner ----------
function FridgeScanner() {
  const store = useAppStore();
  const { aiProvider, groqModel, setActiveView } = store;
  const { apiKey: activeKey, model: activeModel } = activeAI(store);
  const visionBlocked = aiProvider === 'groq' && GROQ_TEXT_ONLY_MODELS.has(groqModel);
  const [image, setImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ChefResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const applyImage = useCallback((dataUrl: string) => {
    setImage(dataUrl);
    setResult(null);
  }, []);

  const openCamera = useCallback(async () => {
    try {
      const photo = await CapCamera.getPhoto({ source: CameraSource.Camera, resultType: CameraResultType.DataUrl, quality: 85 });
      if (photo.dataUrl) applyImage(photo.dataUrl);
    } catch { /* cancelled */ }
  }, [applyImage]);

  const openGallery = useCallback(async () => {
    try {
      const photo = await CapCamera.getPhoto({ source: CameraSource.Photos, resultType: CameraResultType.DataUrl, quality: 85 });
      if (photo.dataUrl) applyImage(photo.dataUrl);
    } catch { /* cancelled */ }
  }, [applyImage]);

  const analyze = async () => {
    if (!image || !activeKey) return;
    setLoading(true);
    setError(null);
    try {
      const data = await askChefAI(aiProvider, activeKey, activeModel, 'fridge', [], image);
      setResult(data);
      toast.success(`Zaproponowano ${data.suggestions.length} potraw!`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Błąd AI');
    } finally {
      setLoading(false);
    }
  };

  if (!activeKey) {
    return (
      <div className="bg-blue-50 rounded-2xl p-5 text-center">
        <p className="text-4xl mb-3">🧠</p>
        <p className="font-semibold text-blue-700 mb-1">Wymagany klucz API</p>
        <p className="text-blue-500 text-sm mb-4">Ta funkcja potrzebuje AI. Zalecamy Groq — darmowy, bez karty.</p>
        <button
          onClick={() => setActiveView('settings')}
          className="bg-blue-500 text-white text-sm font-semibold px-5 py-2.5 rounded-xl active:scale-95 transition-all"
        >
          Dodaj klucz API →
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {visionBlocked && (
        <div className="bg-yellow-50 border border-yellow-300 rounded-2xl px-4 py-3 flex gap-3 items-start">
          <span className="text-lg flex-shrink-0">⚠️</span>
          <div>
            <p className="text-sm font-semibold text-yellow-800">Model bez obsługi zdjęć</p>
            <p className="text-xs text-yellow-700 mt-0.5">
              Wybrany model <strong>{groqModel}</strong> nie obsługuje zdjęć. Zmień na <strong>Llama 4 Scout</strong> w Ustawieniach.
            </p>
            <button
              onClick={() => setActiveView('settings')}
              className="mt-2 text-xs font-semibold text-yellow-800 underline"
            >
              Zmień model →
            </button>
          </div>
        </div>
      )}
      {!image ? (
        <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-3xl p-8 text-center border-2 border-dashed border-green-200">
          <div className="text-5xl mb-3">🫙</div>
          <h2 className="font-bold text-gray-700 text-base mb-1">Zrób zdjęcie lodówki</h2>
          <p className="text-gray-400 text-sm mb-5">AI rozpozna składniki i zaproponuje co ugotować</p>
          <div className="flex gap-3 justify-center">
            <button
              onClick={openCamera}
              className="flex items-center gap-2 bg-green-500 text-white px-5 py-3 rounded-2xl font-semibold shadow-lg active:scale-95 transition-all"
            >
              <Camera size={18} /> Aparat
            </button>
            <button
              onClick={openGallery}
              className="flex items-center gap-2 bg-white text-gray-700 border border-gray-200 px-5 py-3 rounded-2xl font-semibold shadow-sm active:scale-95 transition-all"
            >
              <Upload size={18} /> Galeria
            </button>
          </div>
        </div>
      ) : (
        <>
          <div className="relative rounded-3xl overflow-hidden shadow-lg">
            <img src={image} alt="Lodówka" className="w-full h-56 object-cover" />
            <button
              onClick={() => { setImage(null); setResult(null); }}
              className="absolute top-3 right-3 bg-black/50 text-white rounded-full p-2"
            >
              <X size={18} />
            </button>
            {loading && (
              <div className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center gap-3">
                <Loader size={36} className="text-white animate-spin" />
                <p className="text-white font-semibold text-sm animate-pulse">Analizuję zawartość lodówki...</p>
              </div>
            )}
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-2xl p-4">
              <p className="text-red-600 text-sm font-semibold mb-1">❌ Błąd AI</p>
              <p className="text-red-500 text-xs">{error}</p>
            </div>
          )}
          {!loading && !result && (
            <button
              onClick={analyze}
              className="w-full bg-green-500 text-white py-4 rounded-2xl font-bold shadow-lg active:scale-95 transition-all flex items-center justify-center gap-2"
            >
              🧠 Zaproponuj potrawy
            </button>
          )}
        </>
      )}

      {result && (
        <div className="space-y-3">
          {result.detectedIngredients && result.detectedIngredients.length > 0 && (
            <div className="bg-white rounded-2xl p-4 shadow-sm">
              <p className="font-semibold text-gray-700 text-sm mb-2">🛒 Wykryte składniki</p>
              <div className="flex flex-wrap gap-1.5">
                {result.detectedIngredients.map((ing) => (
                  <span key={ing} className="bg-green-50 text-green-700 text-xs px-2.5 py-1 rounded-full border border-green-100">
                    {ing}
                  </span>
                ))}
              </div>
            </div>
          )}
          <SuggestionsList suggestions={result.suggestions} />
          <button
            onClick={() => { setImage(null); setResult(null); }}
            className="w-full flex items-center justify-center gap-2 bg-gray-100 text-gray-600 py-3 rounded-2xl font-medium text-sm active:scale-95 transition-all"
          >
            <X size={16} /> Skanuj inną lodówkę
          </button>
        </div>
      )}

    </div>
  );
}

// ---------- Text Ingredients ----------
function TextIngredients() {
  const store = useAppStore();
  const { aiProvider, setActiveView } = store;
  const { apiKey: activeKey, model: activeModel } = activeAI(store);
  const [input, setInput] = useState('');
  const [chips, setChips] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ChefResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const addChip = () => {
    const trimmed = input.trim();
    if (trimmed && !chips.includes(trimmed)) {
      setChips((prev) => [...prev, trimmed]);
    }
    setInput('');
  };

  const removeChip = (chip: string) => setChips((prev) => prev.filter((c) => c !== chip));

  const analyze = async () => {
    if (chips.length === 0) { toast.error('Dodaj przynajmniej jeden składnik'); return; }
    if (!activeKey) { toast.error('Brak klucza API — przejdź do Ustawień'); return; }
    setLoading(true);
    setResult(null);
    setError(null);
    try {
      const data = await askChefAI(aiProvider, activeKey, activeModel, 'text', chips);
      setResult(data);
      toast.success(`Zaproponowano ${data.suggestions.length} potraw!`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Błąd AI');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-2xl p-4 shadow-sm">
        <p className="font-semibold text-gray-700 text-sm mb-3">🥕 Wpisz składniki które masz</p>

        <div className="flex gap-2 mb-3">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addChip(); } }}
            placeholder="np. jajka, ziemniaki, cebula..."
            className="flex-1 bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-orange-400"
          />
          <button
            onClick={addChip}
            disabled={!input.trim()}
            className="bg-orange-500 text-white rounded-xl px-3 py-2.5 disabled:opacity-40 active:scale-95 transition-all"
          >
            <Plus size={18} />
          </button>
        </div>

        {chips.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-1">
            {chips.map((chip) => (
              <span key={chip} className="flex items-center gap-1.5 bg-orange-50 text-orange-700 text-sm px-3 py-1 rounded-full border border-orange-100">
                {chip}
                <button onClick={() => removeChip(chip)} className="hover:text-red-500">
                  <Trash2 size={12} />
                </button>
              </span>
            ))}
          </div>
        )}
      </div>

      {!activeKey ? (
        <div className="bg-blue-50 rounded-2xl p-4 text-center">
          <p className="text-blue-600 text-sm font-medium mb-2">Wymagany klucz API (Groq lub Gemini)</p>
          <button
            onClick={() => setActiveView('settings')}
            className="bg-blue-500 text-white text-xs font-semibold px-4 py-2 rounded-xl"
          >
            Dodaj klucz API →
          </button>
        </div>
      ) : (
        <button
          onClick={analyze}
          disabled={loading || chips.length === 0 || !activeKey}
          className="w-full bg-orange-500 text-white py-4 rounded-2xl font-bold shadow-lg active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {loading ? <><Loader size={18} className="animate-spin" /> Analizuję...</> : <><Search size={18} /> Co mogę ugotować?</>}
        </button>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-4">
          <p className="text-red-600 text-sm font-semibold mb-1">❌ Błąd AI</p>
          <p className="text-red-500 text-xs">{error}</p>
        </div>
      )}
      {result && (
        <div className="space-y-3">
          <SuggestionsList suggestions={result.suggestions} />
          <button
            onClick={() => { setResult(null); setChips([]); setError(null); }}
            className="w-full flex items-center justify-center gap-2 bg-gray-100 text-gray-600 py-3 rounded-2xl font-medium text-sm active:scale-95 transition-all"
          >
            <X size={16} /> Wyczyść i zacznij od nowa
          </button>
        </div>
      )}
    </div>
  );
}

function findLocalRecipe(name: string) {
  const q = name.toLowerCase();
  return POLISH_RECIPES.find((r) => {
    const rn = r.name.toLowerCase();
    return rn.includes(q) || q.includes(rn) ||
      q.split(' ').some((w) => w.length > 3 && rn.includes(w));
  }) ?? null;
}

// ---------- Shared Suggestions List ----------
function SuggestionsList({ suggestions }: { suggestions: MealSuggestion[] }) {
  const { setActiveView, setSelectedRecipe, setPendingSearchQuery } = useAppStore();
  const [expanded, setExpanded] = useState<number | null>(null);

  const openRecipe = (suggestion: MealSuggestion) => {
    const found = findLocalRecipe(suggestion.name);
    if (found) {
      setSelectedRecipe({
        id: found.id,
        name: found.name,
        category: found.category,
        area: 'Polska',
        instructions: found.instructions,
        thumbnail: found.thumbnail,
        ingredients: found.ingredients,
        totalCalories: found.totalCalories,
        servings: found.servings,
        tags: found.time,
      });
      setActiveView('recipe-detail');
    } else {
      setPendingSearchQuery(suggestion.name, 'online');
      setActiveView('search');
      toast(`Szukam "${suggestion.name}" w przepisach...`);
    }
  };

  return (
    <div className="space-y-3">
      <p className="font-semibold text-gray-700 text-sm flex items-center gap-2">
        <ChefHat size={16} className="text-orange-500" />
        Propozycje potraw
      </p>
      {suggestions.map((meal, i) => (
        <button
          key={i}
          onClick={() => setExpanded(expanded === i ? null : i)}
          className="w-full bg-white rounded-2xl shadow-sm text-left overflow-hidden active:scale-[0.98] transition-all"
        >
          <div className="flex items-center gap-3 p-4">
            <span className="text-3xl flex-shrink-0">{meal.emoji}</span>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-gray-800 text-sm leading-tight">{meal.name}</p>
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${DIFFICULTY_COLOR[meal.difficulty] ?? 'bg-gray-100 text-gray-600'}`}>
                  {meal.difficulty}
                </span>
                <span className="flex items-center gap-1 text-xs text-gray-400">
                  <Clock size={11} /> {meal.time}
                </span>
              </div>
            </div>
            <span className="text-gray-300 text-lg flex-shrink-0">{expanded === i ? '▲' : '▼'}</span>
          </div>

          {expanded === i && (
            <div className="px-4 pb-4 border-t border-gray-50 pt-3 space-y-2">
              <p className="text-gray-500 text-sm">{meal.description}</p>
              {meal.usedIngredients?.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-gray-400 mb-1">✅ Masz:</p>
                  <div className="flex flex-wrap gap-1">
                    {meal.usedIngredients.map((ing) => (
                      <span key={ing} className="bg-green-50 text-green-700 text-xs px-2 py-0.5 rounded-full">{ing}</span>
                    ))}
                  </div>
                </div>
              )}
              {meal.missingIngredients?.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-gray-400 mb-1">🛒 Brakuje:</p>
                  <div className="flex flex-wrap gap-1">
                    {meal.missingIngredients.map((ing) => (
                      <span key={ing} className="bg-red-50 text-red-500 text-xs px-2 py-0.5 rounded-full">{ing}</span>
                    ))}
                  </div>
                </div>
              )}
              <button
                onClick={(e) => { e.stopPropagation(); openRecipe(meal); }}
                className="w-full mt-2 flex items-center justify-center gap-2 bg-orange-500 text-white text-sm font-semibold py-2.5 rounded-xl active:scale-95 transition-all"
              >
                <BookOpen size={15} />
                {findLocalRecipe(meal.name) ? 'Otwórz przepis' : 'Szukaj przepisu'}
              </button>
            </div>
          )}
        </button>
      ))}
    </div>
  );
}

// ---------- Main Export ----------
type ChefMode = 'fridge' | 'text';

export default function ChefAI({ onClose }: { onClose?: () => void } = {}) {
  const [mode, setMode] = useState<ChefMode>('fridge');

  const content = (
    <div className="space-y-4">
      {/* Sub-tabs */}
      <div className="flex gap-2 bg-gray-100 rounded-2xl p-1">
        <button
          onClick={() => setMode('fridge')}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-all ${
            mode === 'fridge' ? 'bg-white shadow text-gray-800' : 'text-gray-500'
          }`}
        >
          🫙 Lodówka
        </button>
        <button
          onClick={() => setMode('text')}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-all ${
            mode === 'text' ? 'bg-white shadow text-gray-800' : 'text-gray-500'
          }`}
        >
          ✍️ Składniki
        </button>
      </div>

      {mode === 'fridge' ? <FridgeScanner /> : <TextIngredients />}
    </div>
  );

  if (onClose) {
    return (
      <div className="fixed inset-0 z-[60] bg-black/50 flex items-end pb-[var(--sa-bottom)]">
        <div className="bg-white w-full max-h-[92vh] rounded-t-3xl flex flex-col overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 flex-shrink-0">
            <h2 className="font-bold text-gray-800 flex items-center gap-2">
              <ChefHat size={18} className="text-orange-500" />
              Co ugotować?
            </h2>
            <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100">
              <X size={20} />
            </button>
          </div>
          <div className="overflow-y-auto flex-1 px-5 py-4">
            {content}
          </div>
        </div>
      </div>
    );
  }

  return content;
}
