import { useState, useMemo } from 'react';
import { ChevronLeft, ChevronRight, X, ShoppingCart, Plus, Check, FileText } from 'lucide-react';
import PdfDietImporter from '../components/PdfDietImporter';
import { useAppStore, MealSlot } from '../store/useAppStore';
import { POLISH_RECIPES } from '../data/polishRecipes';
import toast from 'react-hot-toast';
import { todayISO, toLocalISO } from '../lib/date';
import { onImgError } from '../lib/images';
import { useBackHandler } from '../lib/backButton';

const DAYS_PL = ['Pon', 'Wt', 'Śr', 'Czw', 'Pt', 'Sob', 'Nd'];
const SLOTS: { key: keyof MealSlot; label: string; emoji: string }[] = [
  { key: 'breakfast', label: 'Śniadanie', emoji: '🌅' },
  { key: 'lunch',     label: 'Obiad',     emoji: '🍽️' },
  { key: 'dinner',    label: 'Kolacja',   emoji: '🌙' },
  { key: 'snack',     label: 'Przekąska', emoji: '🍎' },
];

function getWeekStart(offset: number): Date {
  const d = new Date();
  const day = d.getDay() === 0 ? 6 : d.getDay() - 1; // Mon = 0
  d.setDate(d.getDate() - day + offset * 7);
  d.setHours(0, 0, 0, 0);
  return d;
}

function dateStr(d: Date): string {
  return toLocalISO(d);
}

export default function MealPlanView() {
  const { mealPlan, mealPlanText, setMealSlot, setMealTextSlot, myRecipes, addFoodEntry } = useAppStore();
  const [weekOffset, setWeekOffset] = useState(0);
  // Otwieramy na dzisiejszym dniu (0=Pon … 6=Nd), a nie zawsze na poniedziałku.
  const [selectedDay, setSelectedDay] = useState(() => (new Date().getDay() + 6) % 7);
  const [pickerSlot, setPickerSlot] = useState<keyof MealSlot | null>(null);
  const [pickerSearch, setPickerSearch] = useState('');
  const [showShopping, setShowShopping] = useState(false);
  const [showPdfImporter, setShowPdfImporter] = useState(false);
  useBackHandler(!!pickerSlot, () => { setPickerSlot(null); setPickerSearch(''); });
  useBackHandler(showShopping, () => setShowShopping(false));

  const weekStart = useMemo(() => getWeekStart(weekOffset), [weekOffset]);

  const weekDates = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + i);
    return dateStr(d);
  });

  const today = todayISO();
  const selectedDate = weekDates[selectedDay];
  const dayPlan = mealPlan[selectedDate] ?? {};
  const dayText = mealPlanText[selectedDate] ?? {};

  const recipes = useMemo(() => {
    // Przepis z katalogu zapisany w „Moich" ma to samo id — pokazujemy go raz.
    const myIds = new Set(myRecipes.map(r => r.id));
    const all = [
      ...POLISH_RECIPES.filter(r => !myIds.has(r.id)).map(r => ({ id: r.id, name: r.name, category: r.category, thumbnail: r.thumbnail, totalCalories: r.totalCalories, servings: r.servings, ingredients: r.ingredients })),
      ...myRecipes.map(r => ({ id: r.id, name: r.name, category: r.category, thumbnail: r.photo || r.thumbnail, totalCalories: r.totalCalories, servings: r.servings, ingredients: r.ingredients })),
    ];
    if (!pickerSearch) return all;
    const q = pickerSearch.toLowerCase();
    return all.filter(r => r.name.toLowerCase().includes(q) || r.category.toLowerCase().includes(q));
  }, [myRecipes, pickerSearch]);

  function getRecipe(id: string) {
    return [...POLISH_RECIPES, ...myRecipes].find(r => r.id === id);
  }

  // ---- Shopping list ----
  const shoppingList = useMemo(() => {
    const ingredients: Record<string, { amount: string; recipe: string }[]> = {};
    weekDates.forEach(date => {
      const plan = mealPlan[date] ?? {};
      Object.values(plan).forEach(rId => {
        if (!rId) return;
        const rec = getRecipe(rId);
        if (!rec) return;
        rec.ingredients.forEach(ing => {
          if (!ingredients[ing.name]) ingredients[ing.name] = [];
          ingredients[ing.name].push({ amount: ing.amount, recipe: rec.name });
        });
      });
    });
    return Object.entries(ingredients).map(([name, items]) => ({ name, items }));
  }, [mealPlan, weekDates, myRecipes]);

  // Log meal to diary
  function logToDiary(slot: keyof MealSlot) {
    const rId = dayPlan[slot];
    if (!rId) return;
    const rec = getRecipe(rId);
    if (!rec) return;
    const kcalPer = Math.round(rec.totalCalories / rec.servings);
    const mealType = slot === 'breakfast' ? 'breakfast' : slot === 'lunch' ? 'lunch' : slot === 'dinner' ? 'dinner' : 'snack';
    addFoodEntry({
      id: `mp-${Date.now()}`,
      name: rec.name,
      calories: kcalPer,
      protein: Math.round(kcalPer * 0.22 / 4),
      carbs: Math.round(kcalPer * 0.44 / 4),
      fat: Math.round(kcalPer * 0.34 / 9),
      amount: 1,
      unit: 'porcja',
      date: selectedDate,
      mealType,
    });
    toast.success(`Dodano do dziennika (${selectedDate})`);
  }

  const weekLabel = (() => {
    const end = new Date(weekStart);
    end.setDate(end.getDate() + 6);
    const opts: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short' };
    return `${weekStart.toLocaleDateString('pl-PL', opts)} – ${end.toLocaleDateString('pl-PL', opts)}`;
  })();

  return (
    <div className="pb-24 bg-gray-50 min-h-dvh">
      {/* Header */}
      <div className="bg-gradient-to-br from-teal-500 to-emerald-500 text-white px-5 pt-12 pb-5 rounded-b-3xl shadow-lg">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-xl font-bold">📅 Plan posiłków</h1>
          <div className="flex gap-2">
            <button
              onClick={() => setShowPdfImporter(true)}
              className="bg-white/20 rounded-xl p-2 flex items-center gap-1.5 text-sm font-medium"
            >
              <FileText size={18} />
            </button>
            <button
              onClick={() => setShowShopping(!showShopping)}
              className="bg-white/20 rounded-xl p-2 flex items-center gap-1.5 text-sm font-medium"
            >
              <ShoppingCart size={18} />
            </button>
          </div>
        </div>
        {/* Week navigation */}
        <div className="flex items-center justify-between bg-white/20 rounded-xl px-3 py-2">
          <button onClick={() => setWeekOffset(w => w - 1)} className="p-1 hover:bg-white/20 rounded-lg transition-colors">
            <ChevronLeft size={20} />
          </button>
          <span className="text-sm font-semibold">{weekLabel}</span>
          <button onClick={() => setWeekOffset(w => w + 1)} className="p-1 hover:bg-white/20 rounded-lg transition-colors">
            <ChevronRight size={20} />
          </button>
        </div>
        {/* Day tabs */}
        <div className="flex gap-1 mt-3">
          {weekDates.map((date, i) => {
            const hasAny = Object.keys(mealPlan[date] ?? {}).length > 0 || Object.keys(mealPlanText[date] ?? {}).length > 0;
            const isToday = date === today;
            const isSelected = i === selectedDay;
            return (
              <button
                key={date}
                onClick={() => setSelectedDay(i)}
                className={`flex-1 flex flex-col items-center py-1.5 rounded-xl transition-all text-xs font-medium ${
                  isSelected ? 'bg-white text-teal-600 shadow' : 'text-white/80 hover:bg-white/20'
                }`}
              >
                <span>{DAYS_PL[i]}</span>
                <span className={`text-[10px] ${isSelected ? 'text-teal-600' : 'text-white/70'}`}>
                  {new Date(date + 'T12:00:00').getDate()}
                </span>
                {hasAny && <div className={`w-1 h-1 rounded-full mt-0.5 ${isSelected ? 'bg-teal-400' : 'bg-white/60'}`} />}
                {isToday && !hasAny && <div className="w-1 h-1 rounded-full mt-0.5 bg-yellow-300" />}
              </button>
            );
          })}
        </div>
      </div>

      {/* PDF diet importer */}
      {showPdfImporter && <PdfDietImporter onClose={() => setShowPdfImporter(false)} />}

      {/* Shopping list overlay */}
      {showShopping && (
        <div className="fixed inset-0 z-[60] bg-black/40 flex items-end pb-[var(--sa-bottom)]">
          <div className="bg-white w-full max-h-[80vh] rounded-t-3xl overflow-hidden flex flex-col">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <h2 className="font-bold text-gray-800 flex items-center gap-2">
                <ShoppingCart size={18} className="text-teal-500" /> Lista zakupów (ten tydzień)
              </h2>
              <button onClick={() => setShowShopping(false)} className="p-2 text-gray-400 hover:text-gray-600">
                <X size={20} />
              </button>
            </div>
            <div className="overflow-y-auto flex-1 px-5 py-3">
              {shoppingList.length === 0 ? (
                <div className="text-center py-10 text-gray-400">
                  <ShoppingCart size={36} className="mx-auto mb-2 opacity-30" />
                  <p>Brak zaplanowanych posiłków w tym tygodniu</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {shoppingList.map(({ name, items }) => (
                    <div key={name} className="flex items-start justify-between py-2 border-b border-gray-50">
                      <div>
                        <p className="font-medium text-gray-800 text-sm">{name}</p>
                        <p className="text-xs text-gray-400">
                          {items.map(i => `${i.amount} (${i.recipe})`).join(', ')}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Recipe picker modal */}
      {pickerSlot && (
        <div className="fixed inset-0 z-[60] bg-black/40 flex items-end pb-[var(--sa-bottom)]">
          <div className="bg-white w-full max-h-[75vh] rounded-t-3xl overflow-hidden flex flex-col">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <h2 className="font-bold text-gray-800">
                {SLOTS.find(s => s.key === pickerSlot)?.emoji} Wybierz przepis
              </h2>
              <button onClick={() => { setPickerSlot(null); setPickerSearch(''); }} className="p-2 text-gray-400 hover:text-gray-600">
                <X size={20} />
              </button>
            </div>
            <div className="px-4 py-2">
              <input
                type="text"
                placeholder="Szukaj przepisu..."
                value={pickerSearch}
                onChange={e => setPickerSearch(e.target.value)}
                autoFocus
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-300"
              />
            </div>
            <div className="overflow-y-auto flex-1 px-4 pb-4 space-y-1">
              {recipes.slice(0, 40).map(r => {
                const isSelected = dayPlan[pickerSlot] === r.id;
                return (
                  <button
                    key={r.id}
                    onClick={() => {
                      setMealSlot(selectedDate, pickerSlot, r.id);
                      setPickerSlot(null);
                      setPickerSearch('');
                      toast.success(`Dodano: ${r.name}`);
                    }}
                    className={`w-full flex items-center gap-3 p-3 rounded-xl text-left transition-all ${
                      isSelected ? 'bg-teal-50 border border-teal-200' : 'hover:bg-gray-50'
                    }`}
                  >
                    <img src={r.thumbnail} alt="" onError={onImgError} className="w-12 h-12 rounded-xl object-cover flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-800 text-sm truncate">{r.name}</p>
                      <p className="text-xs text-gray-400">{r.category}</p>
                    </div>
                    {isSelected && <Check size={16} className="text-teal-500 flex-shrink-0" />}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Day meal slots */}
      <div className="px-4 mt-4 space-y-3">
        <p className="text-sm text-gray-500 font-medium">
          {new Date(selectedDate + 'T12:00:00').toLocaleDateString('pl-PL', { weekday: 'long', day: 'numeric', month: 'long' })}
        </p>

        {SLOTS.map(({ key, label, emoji }) => {
          const rId = dayPlan[key];
          const rec = rId ? getRecipe(rId) : null;
          const kcal = rec ? Math.round(rec.totalCalories / rec.servings) : null;
          const textMeal = !rec ? dayText[key] : undefined;

          return (
            <div key={key} className="bg-white rounded-2xl shadow-sm overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3">
                <span className="text-sm font-semibold text-gray-600">{emoji} {label}</span>
                {rId || textMeal ? (
                  <button
                    onClick={() => { rId ? setMealSlot(selectedDate, key, undefined) : setMealTextSlot(selectedDate, key, undefined); }}
                    className="p-1 text-gray-300 hover:text-red-400 transition-colors"
                  >
                    <X size={16} />
                  </button>
                ) : (
                  <button
                    onClick={() => setPickerSlot(key)}
                    className="flex items-center gap-1 text-teal-500 text-xs font-semibold hover:text-teal-700 transition-colors"
                  >
                    <Plus size={16} /> Dodaj
                  </button>
                )}
              </div>

              {textMeal ? (
                <div className="px-4 pb-3">
                  <div className="bg-teal-50 rounded-xl p-3">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm text-gray-700 leading-snug">{textMeal.name}</p>
                      {textMeal.kcal ? <span className="text-xs font-semibold text-orange-500 flex-shrink-0">{textMeal.kcal} kcal</span> : null}
                    </div>
                    <div className="flex gap-2 mt-2">
                      <button onClick={() => setPickerSlot(key)} className="text-xs text-teal-500 font-medium">Zmień na przepis</button>
                      <span className="text-gray-200">|</span>
                      <button
                        onClick={() => {
                          addFoodEntry({
                            id: `mp-${Date.now()}`,
                            name: textMeal.name.length > 90 ? textMeal.name.slice(0, 90) + '…' : textMeal.name,
                            calories: textMeal.kcal ?? 0,
                            protein: 0, carbs: 0, fat: 0,
                            amount: 1, unit: 'porcja', date: selectedDate, mealType: key,
                          });
                          toast.success(`Dodano do dziennika (${selectedDate})`);
                        }}
                        className="text-xs text-orange-500 font-medium"
                      >
                        + Dziennik
                      </button>
                    </div>
                  </div>
                </div>
              ) : rec ? (
                <div className="flex items-center gap-3 px-4 pb-3">
                  <img src={rec.thumbnail} alt={rec.name} onError={onImgError} className="w-16 h-16 rounded-xl object-cover" />
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-800 text-sm truncate">{rec.name}</p>
                    <p className="text-xs text-gray-400">{kcal} kcal / porcja</p>
                    <div className="flex gap-2 mt-1.5">
                      <button
                        onClick={() => setPickerSlot(key)}
                        className="text-xs text-teal-500 font-medium"
                      >
                        Zmień
                      </button>
                      <span className="text-gray-200">|</span>
                      <button
                        onClick={() => logToDiary(key)}
                        className="text-xs text-orange-500 font-medium"
                      >
                        + Dziennik
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => setPickerSlot(key)}
                  className="w-full px-4 pb-3 flex items-center gap-2 text-gray-300 hover:text-teal-400 transition-colors"
                >
                  <div className="w-16 h-12 rounded-xl bg-gray-50 flex items-center justify-center">
                    <Plus size={20} />
                  </div>
                  <span className="text-sm">Wybierz przepis</span>
                </button>
              )}
            </div>
          );
        })}

        {/* Daily calorie summary */}
        {(Object.keys(dayPlan).length > 0 || Object.keys(dayText).length > 0) && (
          <div className="bg-teal-50 rounded-2xl p-4 flex items-center justify-between">
            <span className="text-sm text-teal-700 font-medium">Łącznie w planie</span>
            <span className="text-lg font-bold text-teal-700">
              {(() => {
                let sum = 0;
                SLOTS.forEach(({ key }) => {
                  const rId = dayPlan[key];
                  const r = rId ? getRecipe(rId) : null;
                  if (r) { sum += Math.round(r.totalCalories / r.servings); return; }
                  const t = dayText[key];
                  if (t?.kcal) sum += t.kcal;
                });
                return sum;
              })()} kcal
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
