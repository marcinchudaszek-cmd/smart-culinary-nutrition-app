import { useMemo, useState } from 'react';
import { X, Search, Plus, Trash2, Flame, PlusCircle, Utensils, Barcode, Save } from 'lucide-react';
import { useAppStore, type FoodEntry } from '../store/useAppStore';
import { COMMON_FOODS, normalizeText, matchesQuery, type FoodItem } from '../data/commonFoods';
import { POLISH_DISHES } from '../data/polishDishes';
import { todayISO } from '../lib/date';
import { RECIPE_FALLBACK } from '../lib/images';
import BarcodeScanSheet from './BarcodeScanSheet';
import type { ProductInfo } from '../lib/openFoodFacts';
import toast from 'react-hot-toast';
import { useBackHandler } from '../lib/backButton';

type MealType = FoodEntry['mealType'];
const MEALS: { id: MealType; label: string }[] = [
  { id: 'breakfast', label: '🌅 Śniadanie' },
  { id: 'lunch', label: '☀️ Obiad' },
  { id: 'dinner', label: '🌙 Kolacja' },
  { id: 'snack', label: '🍎 Przekąska' },
];

interface Ing { food: FoodItem; amount: number }

// Mnożnik makroskładników: dla „szt" to liczba sztuk, inaczej porcja/100.
function factorFor(f: FoodItem, amount: number): number {
  return f.unit === 'szt' ? amount : amount / 100;
}
function unitLabel(f: FoodItem): string {
  return f.unit === 'szt' ? 'szt' : f.unit === '100ml' ? 'ml' : 'g';
}
// Waga składnika w gramach (dla „szt" liczona z wagi jednej sztuki).
// null = nie znamy wagi, więc nie da się policzyć masy całego dania.
function weightOf(f: FoodItem, amount: number): number | null {
  if (f.unit === 'szt') return f.gramsPerPiece ? f.gramsPerPiece * amount : null;
  return amount; // '100g' i '100ml' — pole ilości jest w gramach/ml
}

export default function MealComposer({ onClose }: { onClose: () => void }) {
  const { addFoodEntry, myProducts, addMyRecipe } = useAppStore();
  useBackHandler(true, onClose);
  const [q, setQ] = useState('');
  const [ings, setIngs] = useState<Ing[]>([]);
  const [dishName, setDishName] = useState('');
  const [mealType, setMealType] = useState<MealType>('lunch');
  const [showScanner, setShowScanner] = useState(false);
  const [savedAsRecipe, setSavedAsRecipe] = useState(false);
  // Ile porcji wychodzi z całego dania i ile z tego faktycznie zjadam.
  const [yieldPortions, setYieldPortions] = useState(1);
  const [eatenMode, setEatenMode] = useState<'porcja' | 'g'>('porcja');
  const [eatenPortions, setEatenPortions] = useState(1);
  const [eatenGrams, setEatenGrams] = useState(0);

  const results = useMemo(() => {
    const n = normalizeText(q);
    if (n.length < 2) return [];
    const mine: FoodItem[] = myProducts.filter((p) => matchesQuery(p, q)).map((p) => ({
      name: p.name, calories: p.calories, protein: p.protein, carbs: p.carbs, fat: p.fat,
      unit: p.unit, gramsPerPiece: p.gramsPerPiece,
    }));
    const dishes = POLISH_DISHES.filter((d) => matchesQuery(d, q)).map((d) => ({ ...d } as FoodItem));
    const foods = COMMON_FOODS.filter((f) => matchesQuery(f, q));
    const seen = new Set(mine.map((m) => m.name));
    return [...mine, ...dishes.filter((d) => !seen.has(d.name)),
            ...foods.filter((f) => !seen.has(f.name) && !dishes.find((d) => d.name === f.name))].slice(0, 20);
  }, [q, myProducts]);

  const addIng = (f: FoodItem) => {
    const defaultAmount = f.portionG ?? (f.unit === 'szt' ? 1 : 100);
    setIngs((prev) => [...prev, { food: f, amount: defaultAmount }]);
    setQ('');
  };
  // Produkt z kodu kreskowego ma wartości na 100 g — wchodzi jako zwykły składnik.
  const addScanned = (p: ProductInfo) => {
    const food: FoodItem = {
      name: p.brand && !p.name.toLowerCase().includes(p.brand.toLowerCase()) ? `${p.name} (${p.brand})` : p.name,
      calories: p.calories,
      protein: p.protein,
      carbs: p.carbs,
      fat: p.fat,
      unit: '100g',
    };
    setIngs((prev) => [...prev, { food, amount: 100 }]);
    setShowScanner(false);
    toast.success(`Dodano składnik: ${food.name}`);
  };

  const setAmount = (i: number, a: number) => setIngs((prev) => prev.map((x, idx) => (idx === i ? { ...x, amount: a } : x)));
  const removeIng = (i: number) => setIngs((prev) => prev.filter((_, idx) => idx !== i));

  const totals = useMemo(
    () =>
      ings.reduce(
        (t, ing) => {
          const fct = factorFor(ing.food, ing.amount);
          return {
            kcal: t.kcal + ing.food.calories * fct,
            p: t.p + ing.food.protein * fct,
            c: t.c + ing.food.carbs * fct,
            f: t.f + ing.food.fat * fct,
          };
        },
        { kcal: 0, p: 0, c: 0, f: 0 },
      ),
    [ings],
  );

  // Masa całego dania — znana tylko, gdy każdy składnik ma określoną wagę.
  const totalWeight = useMemo(() => {
    let sum = 0;
    for (const ing of ings) {
      const w = weightOf(ing.food, ing.amount);
      if (w === null) return null;
      sum += w;
    }
    return Math.round(sum);
  }, [ings]);

  // Jaką część całego dania faktycznie zjadam.
  const eatenFactor = useMemo(() => {
    if (ings.length === 0) return 0;
    if (eatenMode === 'g') {
      if (!totalWeight || totalWeight <= 0) return 0;
      return eatenGrams / totalWeight;
    }
    const y = yieldPortions > 0 ? yieldPortions : 1;
    return eatenPortions / y;
  }, [ings.length, eatenMode, eatenGrams, totalWeight, eatenPortions, yieldPortions]);

  const eaten = {
    kcal: totals.kcal * eatenFactor,
    p: totals.p * eatenFactor,
    c: totals.c * eatenFactor,
    f: totals.f * eatenFactor,
  };
  const perPortionKcal = yieldPortions > 0 ? totals.kcal / yieldPortions : totals.kcal;

  // Domyślna gramatura porcji przy przełączeniu na gramy.
  const switchToGrams = () => {
    setEatenMode('g');
    if (!eatenGrams && totalWeight) {
      setEatenGrams(Math.round(totalWeight / (yieldPortions > 0 ? yieldPortions : 1)));
    }
  };

  // Zapisuje skomponowane danie na stałe w „Moich przepisach" — razem ze
  // składnikami i liczbą porcji, żeby móc do niego wrócić za kilka miesięcy.
  const saveDish = () => {
    if (ings.length === 0) { toast.error('Najpierw dodaj składniki'); return; }
    if (!dishName.trim()) { toast.error('Podaj nazwę dania, żeby je zapisać'); return; }

    addMyRecipe({
      id: `custom-${Date.now()}`,
      name: dishName.trim(),
      category: 'Własne',
      area: 'Polska',
      instructions: `Danie skomponowane w aplikacji z ${ings.length} składników.`
        + (yieldPortions > 1 ? ` Wychodzi ${yieldPortions} porcji (~${Math.round(perPortionKcal)} kcal/porcja).` : ''),
      thumbnail: RECIPE_FALLBACK,
      ingredients: ings.map((ing) => ({
        name: ing.food.name,
        amount: `${ing.amount} ${unitLabel(ing.food)}`,
        calories: Math.round(ing.food.calories * factorFor(ing.food, ing.amount)),
      })),
      totalCalories: Math.round(totals.kcal),
      servings: yieldPortions > 0 ? yieldPortions : 1,
      isCustom: true,
      dateAdded: new Date().toISOString(),
    });
    setSavedAsRecipe(true);
    toast.success('Danie zapisane w „Moich przepisach" 💾');
  };

  const addToDiary = () => {
    if (ings.length === 0) { toast.error('Najpierw dodaj składniki'); return; }
    if (eaten.kcal <= 0) { toast.error('Podaj, ile zjadasz'); return; }

    const baseName = dishName.trim() || `Danie (${ings.length} skł.)`;
    const isPart = eatenFactor < 0.999;
    const name = isPart && eatenMode === 'porcja' && yieldPortions > 1
      ? `${baseName} (${eatenPortions}/${yieldPortions} porcji)`
      : baseName;

    addFoodEntry({
      id: `entry-${Date.now()}`,
      name,
      calories: Math.round(eaten.kcal),
      protein: Math.round(eaten.p * 10) / 10,
      carbs: Math.round(eaten.c * 10) / 10,
      fat: Math.round(eaten.f * 10) / 10,
      amount: eatenMode === 'g' ? eatenGrams : eatenPortions,
      unit: eatenMode === 'g' ? 'g' : 'porcja',
      date: todayISO(),
      mealType,
    });
    toast.success('Dodano danie do dziennika 🍽️');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[60] bg-black/40 flex items-end pb-[var(--sa-bottom)]">
      <div className="bg-white w-full max-h-[92vh] rounded-t-3xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 flex-shrink-0">
          <h2 className="font-bold text-gray-800 flex items-center gap-2">
            <Utensils size={18} className="text-orange-500" />
            Skomponuj posiłek
          </h2>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100">
            <X size={20} />
          </button>
        </div>

        <div className="overflow-y-auto flex-1 px-5 py-4 pb-10 space-y-4">
          <p className="text-xs text-gray-400">
            Dodaj składniki, z których robisz danie — policzymy łączne kalorie i makro, a potem dodasz to jako jeden posiłek.
          </p>

          {/* Search + skaner kodów */}
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search size={16} className="absolute left-3 top-3 text-gray-400" />
              <input
                type="text"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Szukaj składnika (np. jajko, ryż, ser)…"
                className="w-full bg-gray-100 rounded-xl pl-9 pr-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-orange-400"
              />
            </div>
            <button
              onClick={() => setShowScanner(true)}
              title="Skanuj kod kreskowy"
              className="bg-purple-100 text-purple-600 px-3 rounded-xl flex items-center justify-center active:scale-95 transition-all hover:bg-purple-200 flex-shrink-0"
            >
              <Barcode size={20} />
            </button>
          </div>
          {results.length > 0 && (
            <div className="space-y-1.5 max-h-52 overflow-y-auto -mt-1">
              {results.map((f, i) => (
                <button
                  key={`${f.name}-${i}`}
                  onClick={() => addIng(f)}
                  className="w-full flex items-center justify-between p-2.5 rounded-xl text-left bg-gray-50 hover:bg-orange-50 transition-all"
                >
                  <span className="text-sm text-gray-800 truncate pr-2">{f.name}</span>
                  <span className="flex items-center gap-2 flex-shrink-0">
                    <span className="text-xs text-orange-500 font-semibold">{f.calories} kcal/{unitLabel(f) === 'szt' ? 'szt' : f.unit === '100ml' ? '100ml' : '100g'}</span>
                    <Plus size={16} className="text-orange-400" />
                  </span>
                </button>
              ))}
            </div>
          )}

          {/* Ingredients list */}
          {ings.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-semibold text-gray-600">Składniki dania</p>
              {ings.map((ing, i) => {
                const fct = factorFor(ing.food, ing.amount);
                const kcal = Math.round(ing.food.calories * fct);
                return (
                  <div key={i} className="flex items-center gap-2 bg-gray-50 rounded-xl p-2.5">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-800 truncate">{ing.food.name}</p>
                      <p className="text-[11px] text-orange-500 font-semibold">{kcal} kcal</p>
                    </div>
                    <input
                      type="number"
                      value={ing.amount}
                      onChange={(e) => setAmount(i, Number(e.target.value))}
                      className="w-16 border border-gray-200 rounded-lg px-2 py-1.5 text-center text-sm outline-none focus:ring-2 focus:ring-orange-400"
                    />
                    <span className="text-xs text-gray-400 w-6">{unitLabel(ing.food)}</span>
                    <button onClick={() => removeIng(i)} className="text-red-300 hover:text-red-500 p-1">
                      <Trash2 size={16} />
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          {/* Całe danie */}
          {ings.length > 0 && (
            <div className="bg-gray-50 rounded-2xl p-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-gray-500 flex items-center gap-1.5">
                  <Flame size={14} className="text-gray-400" /> Całe danie
                </span>
                <span className="text-sm font-bold text-gray-600">
                  {Math.round(totals.kcal)} kcal{totalWeight ? ` · ${totalWeight} g` : ''}
                </span>
              </div>
            </div>
          )}

          {/* Porcje — ile wychodzi i ile zjadam */}
          {ings.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs text-gray-500 font-medium">Ile porcji wychodzi z dania?</label>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setYieldPortions((p) => Math.max(1, p - 1))}
                    className="w-7 h-7 rounded-lg bg-gray-100 text-gray-600 font-bold active:scale-90 transition-all"
                  >−</button>
                  <input
                    type="number"
                    value={yieldPortions}
                    onChange={(e) => setYieldPortions(Math.max(1, Number(e.target.value)))}
                    className="w-14 border border-gray-200 rounded-lg px-2 py-1.5 text-center text-sm font-bold outline-none focus:ring-2 focus:ring-orange-400"
                  />
                  <button
                    onClick={() => setYieldPortions((p) => p + 1)}
                    className="w-7 h-7 rounded-lg bg-gray-100 text-gray-600 font-bold active:scale-90 transition-all"
                  >+</button>
                </div>
              </div>
              {yieldPortions > 1 && (
                <p className="text-[11px] text-gray-400">
                  1 porcja ≈ {Math.round(perPortionKcal)} kcal{totalWeight ? ` · ${Math.round(totalWeight / yieldPortions)} g` : ''}
                </p>
              )}

              <div className="flex items-center justify-between pt-1">
                <label className="text-xs text-gray-500 font-medium">Ile zjadasz?</label>
                <div className="flex rounded-lg overflow-hidden border border-gray-200">
                  <button
                    onClick={() => setEatenMode('porcja')}
                    className={`px-3 py-1 text-xs font-semibold transition-colors ${eatenMode === 'porcja' ? 'bg-orange-500 text-white' : 'bg-white text-gray-500'}`}
                  >porcje</button>
                  <button
                    onClick={switchToGrams}
                    disabled={!totalWeight}
                    className={`px-3 py-1 text-xs font-semibold transition-colors disabled:opacity-40 ${eatenMode === 'g' ? 'bg-orange-500 text-white' : 'bg-white text-gray-500'}`}
                  >gramy</button>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  step={eatenMode === 'porcja' ? '0.5' : '10'}
                  value={eatenMode === 'porcja' ? eatenPortions : eatenGrams}
                  onChange={(e) => eatenMode === 'porcja'
                    ? setEatenPortions(Number(e.target.value))
                    : setEatenGrams(Number(e.target.value))}
                  className="flex-1 border border-gray-200 rounded-xl px-3 py-2.5 text-center text-lg font-bold outline-none focus:ring-2 focus:ring-orange-400"
                />
                <span className="text-sm text-gray-400 w-16">
                  {eatenMode === 'porcja' ? (yieldPortions > 1 ? `z ${yieldPortions}` : 'porcji') : 'g'}
                </span>
              </div>
              {!totalWeight && (
                <p className="text-[11px] text-gray-400">
                  Gramy niedostępne — któryś składnik nie ma podanej wagi sztuki.
                </p>
              )}
            </div>
          )}

          {/* To, co faktycznie zjadam */}
          {ings.length > 0 && (
            <div className="bg-orange-50 rounded-2xl p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-semibold text-orange-700 flex items-center gap-1.5">
                  <Flame size={16} /> Zjadam
                </span>
                <span className="text-xl font-bold text-orange-600">{Math.round(eaten.kcal)} kcal</span>
              </div>
              <div className="grid grid-cols-3 gap-2 text-center">
                {[
                  { label: 'Białko', val: eaten.p, color: 'text-blue-500' },
                  { label: 'Węgle', val: eaten.c, color: 'text-yellow-600' },
                  { label: 'Tłuszcz', val: eaten.f, color: 'text-red-500' },
                ].map(({ label, val, color }) => (
                  <div key={label} className="bg-white rounded-xl py-1.5">
                    <p className={`text-sm font-bold ${color}`}>{Math.round(val * 10) / 10} g</p>
                    <p className="text-[10px] text-gray-400">{label}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Name + meal type */}
          {ings.length > 0 && (
            <>
              <div>
                <label className="text-xs text-gray-500 font-medium mb-1 block">Nazwa dania (opcjonalnie)</label>
                <input
                  type="text"
                  value={dishName}
                  onChange={(e) => setDishName(e.target.value)}
                  placeholder="np. Ciasto marchewkowe (potrzebna do zapisania)"
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-orange-400"
                />
              </div>
              <div>
                <label className="text-xs text-gray-500 font-medium mb-1 block">Dodaj jako</label>
                <div className="grid grid-cols-2 gap-2">
                  {MEALS.map((m) => (
                    <button
                      key={m.id}
                      onClick={() => setMealType(m.id)}
                      className={`py-2.5 rounded-xl text-sm font-medium transition-all border-2 ${
                        mealType === m.id ? 'border-orange-400 bg-orange-50 text-orange-700' : 'border-gray-100 text-gray-600'
                      }`}
                    >
                      {m.label}
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Sticky footer */}
        <div className="px-5 py-3 border-t border-gray-100 flex-shrink-0 space-y-2">
          {/* Zapis dania na stałe — niezależny od dodania do dziennika */}
          <button
            onClick={saveDish}
            disabled={ings.length === 0}
            className={`w-full py-2.5 rounded-2xl font-semibold text-sm flex items-center justify-center gap-2 active:scale-95 transition-all disabled:opacity-40 ${
              savedAsRecipe ? 'bg-green-50 text-green-700 border border-green-300' : 'bg-gray-100 text-gray-700'
            }`}
          >
            <Save size={16} />
            {savedAsRecipe ? 'Zapisano w „Moich przepisach"' : 'Zapisz danie na stałe'}
          </button>
          <button
            onClick={addToDiary}
            disabled={ings.length === 0}
            className="w-full bg-orange-500 text-white py-3 rounded-2xl font-bold flex items-center justify-center gap-2 active:scale-95 transition-all disabled:opacity-40"
          >
            <PlusCircle size={18} />
            Dodaj do dziennika{ings.length > 0 ? ` (${Math.round(eaten.kcal)} kcal)` : ''}
          </button>
        </div>
      </div>

      {showScanner && (
        <BarcodeScanSheet onPick={addScanned} onClose={() => setShowScanner(false)} />
      )}
    </div>
  );
}
