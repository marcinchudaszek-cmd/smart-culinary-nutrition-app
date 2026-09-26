import { useState, useEffect, useRef } from 'react';
import {
  ArrowLeft, Heart, BookmarkPlus, ExternalLink, Clock,
  Users, Flame, ChevronDown, ChevronUp, Check, Share2,
  PlusCircle, Timer, Play, Pause, RotateCcw, Minus, Plus, Pencil,
} from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import toast from 'react-hot-toast';
import { todayISO } from '../lib/date';
import { onImgError, RECIPE_FALLBACK } from '../lib/images';

// ─── Meal diary ──────────────────────────────────────────────────────────────
type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack';
const MEAL_LABELS: Record<MealType, string> = {
  breakfast: '🌅 Śniadanie',
  lunch:     '☀️ Obiad',
  dinner:    '🌙 Kolacja',
  snack:     '🍎 Przekąska',
};

function estimateMacros(calories: number, category: string) {
  const ratios: Record<string, [number, number, number]> = {
    'Zupy':               [16, 54, 30],
    'Dania główne':       [28, 30, 42],
    'Desery':             [ 7, 66, 27],
    'Przekąski':          [14, 52, 34],
    'Sałatki':            [18, 38, 44],
    'Śniadania':          [18, 55, 27],
    'Wegetariańskie':     [16, 52, 32],
    'Makarony i ryż':     [15, 65, 20],
    'Ryby i owoce morza': [45, 10, 45],
    'Mięsne':             [35, 10, 55],
    'Grillowane':         [38,  8, 54],
    'Kuchnia regionalna': [22, 40, 38],
    'Świąteczne':         [14, 52, 34],
    'Napoje':             [ 5, 80, 15],
  };
  const [pp, cp, fp] = ratios[category] ?? [22, 44, 34];
  return {
    protein: Math.round(calories * pp / 100 / 4 * 10) / 10,
    carbs:   Math.round(calories * cp / 100 / 4 * 10) / 10,
    fat:     Math.round(calories * fp / 100 / 9 * 10) / 10,
  };
}

// ─── Portion scaler ──────────────────────────────────────────────────────────
function scaleAmount(amount: string, multiplier: number): string {
  if (multiplier === 1) return amount;
  return amount.replace(/(\d+(?:[.,]\d+)?)/g, (match) => {
    const num = parseFloat(match.replace(',', '.'));
    const scaled = num * multiplier;
    if (scaled % 1 === 0) return String(scaled);
    return parseFloat(scaled.toFixed(1)).toString().replace('.', ',');
  });
}

// ─── Timer helpers ───────────────────────────────────────────────────────────
function fmt(secs: number) {
  const m = Math.floor(secs / 60).toString().padStart(2, '0');
  const s = (secs % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}
const TIMER_PRESETS = [5, 10, 15, 20, 30];

// ─── Main component ───────────────────────────────────────────────────────────
export default function RecipeDetailView() {
  const {
    selectedRecipe, setActiveView, previousView,
    myRecipes, addMyRecipe, removeMyRecipe,
    addFoodEntry,
    favoriteIds, toggleFavorite,
  } = useAppStore();

  // Powrót do ekranu, z którego otwarto przepis (Główna, Szukaj, Moje, Plan…).
  // Pomijamy widoki, które nie są sensownym „źródłem" przepisu.
  const goBack = () => {
    const skip = ['recipe-detail', 'add-recipe'];
    setActiveView(skip.includes(previousView) ? 'home' : previousView);
  };

  const [showFull, setShowFull]           = useState(false);
  const [mealPickerOpen, setMealPickerOpen] = useState(false);
  const [multiplier, setMultiplier]       = useState(1);

  // Timer state
  const [timerTotal, setTimerTotal]   = useState(10 * 60); // seconds
  const [timerLeft, setTimerLeft]     = useState(10 * 60);
  const [timerRunning, setTimerRunning] = useState(false);
  const [timerDone, setTimerDone]     = useState(false);
  const [customMin, setCustomMin]     = useState('');
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (timerRunning && timerLeft > 0) {
      intervalRef.current = setInterval(() => {
        setTimerLeft((t) => {
          if (t <= 1) {
            clearInterval(intervalRef.current!);
            setTimerRunning(false);
            setTimerDone(true);
            toast('⏰ Czas minął!', { duration: 4000 });
            return 0;
          }
          return t - 1;
        });
      }, 1000);
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [timerRunning]);

  function setPreset(min: number) {
    const secs = min * 60;
    setTimerTotal(secs);
    setTimerLeft(secs);
    setTimerRunning(false);
    setTimerDone(false);
    if (intervalRef.current) clearInterval(intervalRef.current);
  }

  function resetTimer() {
    setTimerLeft(timerTotal);
    setTimerRunning(false);
    setTimerDone(false);
    if (intervalRef.current) clearInterval(intervalRef.current);
  }

  if (!selectedRecipe) { setActiveView('home'); return null; }

  const isSaved    = myRecipes.some((r) => r.id === selectedRecipe.id);
  const isFavorite = favoriteIds.includes(selectedRecipe.id);
  const basePerServing = Math.round(selectedRecipe.totalCalories / selectedRecipe.servings);
  const perServing = Math.round(basePerServing * multiplier);
  const timerPct   = timerTotal > 0 ? ((timerTotal - timerLeft) / timerTotal) * 100 : 0;

  const addToDiary = (mealType: MealType) => {
    const macros = estimateMacros(perServing, selectedRecipe.category);
    addFoodEntry({
      id: `entry-${Date.now()}`,
      name: selectedRecipe.name + (multiplier > 1 ? ` (×${multiplier})` : ''),
      calories: perServing,
      protein: macros.protein * multiplier,
      carbs:   macros.carbs   * multiplier,
      fat:     macros.fat     * multiplier,
      amount:  multiplier,
      unit:    'porcja',
      date:    todayISO(),
      mealType,
    });
    setMealPickerOpen(false);
    toast.success(`Dodano do dziennika: ${MEAL_LABELS[mealType]}`);
  };

  const toggleSave = () => {
    if (isSaved) {
      removeMyRecipe(selectedRecipe.id);
      toast.success('Usunięto z przepisów');
    } else {
      addMyRecipe({ ...selectedRecipe, dateAdded: new Date().toISOString() });
      toast.success('Zapisano przepis! 🎉');
    }
  };

  const shareRecipe = () => {
    const ingredientLines = selectedRecipe.ingredients
      .map((i) => `• ${i.name} — ${i.amount}`)
      .join('\n');
    const text = `🍳 ${selectedRecipe.name}\n\n🥦 Składniki:\n${ingredientLines}\n\n📋 Przygotowanie:\n${selectedRecipe.instructions}\n\n— KulinApp`;

    if (navigator.share) {
      navigator.share({ title: selectedRecipe.name, text });
    } else {
      navigator.clipboard.writeText(text);
      toast.success('Przepis skopiowany do schowka!');
    }
  };

  const instructions = selectedRecipe.instructions || '';
  const shortInstructions = instructions.slice(0, 300);

  return (
    <div className="pb-28 min-h-dvh bg-gray-50">
      {/* Hero Image */}
      <div className="relative">
        <img
          src={selectedRecipe.photo || selectedRecipe.thumbnail || RECIPE_FALLBACK}
          alt={selectedRecipe.name}
          className="w-full h-64 object-cover"
          onError={onImgError}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/20" />

        {/* Top controls */}
        <div className="absolute top-0 left-0 right-0 flex justify-between items-center px-4 pt-12">
          <button
            onClick={goBack}
            className="bg-white/90 backdrop-blur rounded-full p-2.5 shadow"
          >
            <ArrowLeft size={20} className="text-gray-700" />
          </button>
          <div className="flex gap-2">
            <button
              onClick={() => {
                toggleFavorite(selectedRecipe.id);
                toast(isFavorite ? '💔 Usunięto z ulubionych' : '❤️ Dodano do ulubionych!');
              }}
              className="bg-white/90 backdrop-blur rounded-full p-2.5 shadow"
            >
              <Heart size={20} className={isFavorite ? 'text-red-500 fill-red-500' : 'text-gray-700'} />
            </button>
            <button onClick={shareRecipe} className="bg-white/90 backdrop-blur rounded-full p-2.5 shadow">
              <Share2 size={20} className="text-gray-700" />
            </button>
            <button
              onClick={() => setActiveView('add-recipe')}
              className="bg-white/90 backdrop-blur rounded-full p-2.5 shadow"
              title="Edytuj przepis"
            >
              <Pencil size={20} className="text-gray-700" />
            </button>
          </div>
        </div>

        {/* Title overlay */}
        <div className="absolute bottom-4 left-4 right-4">
          <div className="flex gap-2 mb-2 flex-wrap">
            {selectedRecipe.category && (
              <span className="bg-orange-500 text-white text-xs px-3 py-1 rounded-full font-medium">
                {selectedRecipe.category}
              </span>
            )}
            {selectedRecipe.area && (
              <span className="bg-white/20 backdrop-blur text-white text-xs px-3 py-1 rounded-full">
                🌍 {selectedRecipe.area}
              </span>
            )}
            {selectedRecipe.isCustom && (
              <span className="bg-green-500 text-white text-xs px-3 py-1 rounded-full font-medium">
                ✨ Własny
              </span>
            )}
            {isFavorite && (
              <span className="bg-red-500 text-white text-xs px-3 py-1 rounded-full font-medium">
                ❤️ Ulubiony
              </span>
            )}
          </div>
          <h1 className="text-white text-xl font-bold leading-tight drop-shadow">
            {selectedRecipe.name}
          </h1>
        </div>
      </div>

      <div className="px-4 mt-4">
        {/* Stats bar */}
        <div className="bg-white rounded-2xl p-4 shadow-sm flex justify-around mb-4">
          <div className="text-center">
            <Flame size={16} className="text-orange-500 mx-auto mb-1" />
            <p className="text-lg font-bold text-gray-800">{selectedRecipe.totalCalories}</p>
            <p className="text-xs text-gray-400">kcal total</p>
          </div>
          <div className="w-px bg-gray-100" />
          <div className="text-center">
            <Users size={16} className="text-blue-500 mx-auto mb-1" />
            <p className="text-lg font-bold text-gray-800">{selectedRecipe.servings}</p>
            <p className="text-xs text-gray-400">porcje</p>
          </div>
          <div className="w-px bg-gray-100" />
          <div className="text-center">
            <Clock size={16} className="text-green-500 mx-auto mb-1" />
            <p className="text-lg font-bold text-gray-800">{perServing}</p>
            <p className="text-xs text-gray-400">kcal/porcja</p>
          </div>
        </div>

        {/* ── Portion multiplier ── */}
        <div className="bg-white rounded-2xl p-4 shadow-sm mb-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-gray-700 flex items-center gap-2">
              <Users size={16} className="text-orange-400" /> Porcje
            </span>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setMultiplier((m) => Math.max(1, m - 1))}
                disabled={multiplier === 1}
                className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center disabled:opacity-30 active:scale-90 transition-all"
              >
                <Minus size={16} className="text-gray-700" />
              </button>
              <div className="text-center min-w-[52px]">
                <p className="text-xl font-bold text-orange-500">×{multiplier}</p>
                <p className="text-[10px] text-gray-400">{perServing} kcal</p>
              </div>
              <button
                onClick={() => setMultiplier((m) => Math.min(10, m + 1))}
                disabled={multiplier === 10}
                className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center disabled:opacity-30 active:scale-90 transition-all"
              >
                <Plus size={16} className="text-gray-700" />
              </button>
            </div>
            <div className="flex gap-1.5">
              {[1, 2, 4].map((m) => (
                <button
                  key={m}
                  onClick={() => setMultiplier(m)}
                  className={`w-8 h-8 rounded-full text-xs font-bold transition-all active:scale-90 ${
                    multiplier === m ? 'bg-orange-500 text-white' : 'bg-gray-100 text-gray-600'
                  }`}
                >
                  {m}×
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Save + Diary buttons */}
        <button
          onClick={toggleSave}
          className={`w-full py-3.5 rounded-2xl font-semibold flex items-center justify-center gap-2 transition-all active:scale-95 mb-3 ${
            isSaved
              ? 'bg-green-100 text-green-700 border border-green-300'
              : 'bg-orange-500 text-white shadow-lg shadow-orange-200'
          }`}
        >
          {isSaved ? <><Check size={18} /> Zapisano w Moich Przepisach</> : <><BookmarkPlus size={18} /> Zapisz Przepis</>}
        </button>

        {!mealPickerOpen ? (
          <button
            onClick={() => setMealPickerOpen(true)}
            className="w-full py-3.5 rounded-2xl font-semibold flex items-center justify-center gap-2 transition-all active:scale-95 mb-4 bg-green-500 text-white shadow-lg shadow-green-200"
          >
            <PlusCircle size={18} /> Dodaj do dziennika ({perServing} kcal{multiplier > 1 ? ` · ×${multiplier}` : ''})
          </button>
        ) : (
          <div className="bg-green-50 border border-green-200 rounded-2xl p-4 mb-4">
            <p className="text-sm font-semibold text-green-700 mb-3 text-center">Wybierz posiłek</p>
            <div className="grid grid-cols-2 gap-2">
              {(Object.entries(MEAL_LABELS) as [MealType, string][]).map(([type, label]) => (
                <button
                  key={type}
                  onClick={() => addToDiary(type)}
                  className="bg-white border border-green-200 rounded-xl py-2.5 text-sm font-medium text-gray-700 active:scale-95 transition-all hover:bg-green-100"
                >
                  {label}
                </button>
              ))}
            </div>
            <button onClick={() => setMealPickerOpen(false)} className="w-full mt-2 text-xs text-gray-400 py-1">
              Anuluj
            </button>
          </div>
        )}

        {/* ── Ingredients ── */}
        <div className="bg-white rounded-2xl p-4 shadow-sm mb-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-bold text-gray-800 text-base flex items-center gap-2">🥦 Składniki</h2>
            {multiplier > 1 && (
              <span className="text-xs bg-orange-100 text-orange-600 px-2 py-0.5 rounded-full font-semibold">
                ×{multiplier} porcji
              </span>
            )}
          </div>
          <div className="space-y-2">
            {selectedRecipe.ingredients.length === 0 ? (
              <div className="flex flex-col items-center py-4 gap-2 text-center">
                <span className="text-3xl">🛒</span>
                <p className="text-gray-400 text-sm">Brak składników w tym przepisie</p>
                {isSaved && (
                  <button
                    onClick={() => setActiveView('add-recipe')}
                    className="mt-1 text-xs text-orange-500 font-semibold border border-orange-200 rounded-full px-3 py-1 hover:bg-orange-50 transition-colors"
                  >
                    ✏️ Edytuj przepis i dodaj składniki
                  </button>
                )}
              </div>
            ) : (
              selectedRecipe.ingredients.map((ing, i) => (
                <div key={i} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-orange-400 flex-shrink-0" />
                    <span className="text-gray-700 text-sm font-medium">{ing.name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-gray-500 text-sm">{scaleAmount(ing.amount, multiplier)}</span>
                    <span className="text-orange-500 text-xs font-semibold bg-orange-50 px-2 py-0.5 rounded-full">
                      ~{Math.round(ing.calories * multiplier)} kcal
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* ── Instructions ── */}
        <div className="bg-white rounded-2xl p-4 shadow-sm mb-4">
          <h2 className="font-bold text-gray-800 text-base mb-3 flex items-center gap-2">📋 Instrukcja</h2>
          {!instructions ? (
            <div className="flex flex-col items-center py-3 gap-1 text-center">
              <span className="text-2xl">📝</span>
              <p className="text-gray-400 text-sm">Brak instrukcji przygotowania</p>
            </div>
          ) : (
            <>
              <p className="text-gray-600 text-sm leading-relaxed whitespace-pre-line">
                {showFull ? instructions : shortInstructions}
                {instructions.length > 300 && !showFull && '...'}
              </p>
              {instructions.length > 300 && (
                <button
                  onClick={() => setShowFull(!showFull)}
                  className="mt-3 flex items-center gap-1 text-orange-500 text-sm font-medium"
                >
                  {showFull ? <><ChevronUp size={16} /> Zwiń</> : <><ChevronDown size={16} /> Czytaj więcej</>}
                </button>
              )}
            </>
          )}
        </div>

        {/* ── Cooking timer ── */}
        <div className="bg-white rounded-2xl p-4 shadow-sm mb-4">
          <h2 className="font-bold text-gray-800 text-base mb-3 flex items-center gap-2">
            <Timer size={18} className="text-orange-500" /> Timer gotowania
          </h2>

          {/* Presets */}
          <div className="flex gap-2 mb-3 flex-wrap">
            {TIMER_PRESETS.map((min) => (
              <button
                key={min}
                onClick={() => setPreset(min)}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all active:scale-90 ${
                  timerTotal === min * 60 && !timerDone
                    ? 'bg-orange-500 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {min} min
              </button>
            ))}
            {/* Custom */}
            <div className="flex items-center gap-1">
              <input
                type="number"
                placeholder="min"
                value={customMin}
                onChange={(e) => setCustomMin(e.target.value)}
                className="w-14 border border-gray-200 rounded-lg px-2 py-1 text-xs text-center focus:outline-none focus:border-orange-400"
              />
              <button
                onClick={() => {
                  const m = parseInt(customMin);
                  if (m > 0 && m <= 180) setPreset(m);
                }}
                className="bg-gray-100 text-gray-600 px-2 py-1 rounded-lg text-xs font-semibold hover:bg-gray-200 active:scale-90 transition-all"
              >
                Ustaw
              </button>
            </div>
          </div>

          {/* Timer display */}
          <div className="flex items-center gap-4">
            {/* Arc progress */}
            <div className="relative w-20 h-20 flex-shrink-0">
              <svg className="w-full h-full -rotate-90" viewBox="0 0 80 80">
                <circle cx="40" cy="40" r="34" fill="none" stroke="#f3f4f6" strokeWidth="6" />
                <circle
                  cx="40" cy="40" r="34" fill="none"
                  stroke={timerDone ? '#22c55e' : '#f97316'}
                  strokeWidth="6"
                  strokeLinecap="round"
                  strokeDasharray={`${2 * Math.PI * 34}`}
                  strokeDashoffset={`${2 * Math.PI * 34 * (1 - timerPct / 100)}`}
                  className="transition-all duration-1000"
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className={`text-lg font-bold ${timerDone ? 'text-green-500' : 'text-gray-800'}`}>
                  {timerDone ? '✓' : fmt(timerLeft)}
                </span>
              </div>
            </div>

            <div className="flex-1 space-y-2">
              {timerDone && (
                <p className="text-green-600 font-semibold text-sm">✅ Gotowe!</p>
              )}
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    if (timerDone) { resetTimer(); return; }
                    setTimerRunning((r) => !r);
                  }}
                  className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl font-semibold text-sm transition-all active:scale-95 ${
                    timerDone
                      ? 'bg-green-100 text-green-700'
                      : timerRunning
                        ? 'bg-orange-100 text-orange-600'
                        : 'bg-orange-500 text-white shadow-sm'
                  }`}
                >
                  {timerDone
                    ? <><RotateCcw size={16} /> Reset</>
                    : timerRunning
                      ? <><Pause size={16} /> Pauza</>
                      : <><Play size={16} /> Start</>}
                </button>
                {!timerDone && (
                  <button
                    onClick={resetTimer}
                    className="px-3 py-2.5 rounded-xl bg-gray-100 text-gray-500 hover:bg-gray-200 active:scale-95 transition-all"
                  >
                    <RotateCcw size={16} />
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* YouTube */}
        {selectedRecipe.youtubeUrl && (
          <a
            href={selectedRecipe.youtubeUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 bg-red-500 text-white py-3.5 rounded-2xl font-semibold w-full mb-4 hover:bg-red-600 active:scale-95 transition-all"
          >
            <ExternalLink size={18} />
            Obejrzyj na YouTube
          </a>
        )}
      </div>
    </div>
  );
}
