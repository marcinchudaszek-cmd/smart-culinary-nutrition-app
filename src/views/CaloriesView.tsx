import { useState, useCallback, useRef, useMemo } from 'react';
import { Plus, Trash2, Flame, Target, Search, X, TrendingUp, Calendar, Loader, Camera, BarChart3, ChefHat, Barcode, Clock } from 'lucide-react';
import { useAppStore, FoodEntry } from '../store/useAppStore';
import PhotoCalorieScanner from '../components/PhotoCalorieScanner';
import BarcodeScanner from '../components/BarcodeScanner';
import BarcodeScanSheet from '../components/BarcodeScanSheet';
import CalorieStatsTab from '../components/CalorieStatsTab';
import { POLISH_DISHES } from '../data/polishDishes';
import { COMMON_FOODS, normalizeText, matchesQuery, type FoodItem } from '../data/commonFoods';
import toast from 'react-hot-toast';
import { todayISO, toLocalISO } from '../lib/date';

const MEAL_TYPES = [
  { id: 'breakfast', label: 'Śniadanie', short: 'Śniad.', emoji: '🌅' },
  { id: 'lunch',     label: 'Obiad',     short: 'Obiad',  emoji: '☀️' },
  { id: 'dinner',    label: 'Kolacja',   short: 'Kolacja', emoji: '🌙' },
  { id: 'snack',     label: 'Przekąska', short: 'Przek.', emoji: '🍎' },
] as const;


const DAY_NAMES = ['Nd', 'Pn', 'Wt', 'Śr', 'Cz', 'Pt', 'So'];
const DAY_NAMES_FULL = ['Niedziela', 'Poniedziałek', 'Wtorek', 'Środa', 'Czwartek', 'Piątek', 'Sobota'];

const CLEANUP_OPTIONS = [
  { days: 7,  label: '7 dni' },
  { days: 14, label: '14 dni' },
  { days: 30, label: '30 dni' },
  { days: 90, label: '90 dni' },
] as const;

function HistoryTab() {
  const { foodDiary, dailyGoal, removeOldFoodEntries } = useAppStore();
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [showCleanup, setShowCleanup] = useState(false);
  const [cleanupDays, setCleanupDays] = useState<number>(7);

  const handleCleanup = () => {
    const removed = removeOldFoodEntries(cleanupDays);
    setShowCleanup(false);
    if (removed > 0) {
      toast.success(`Usunięto ${removed} ${removed === 1 ? 'wpis' : removed < 5 ? 'wpisy' : 'wpisów'} starszych niż ${cleanupDays} dni`);
    } else {
      toast('Brak wpisów starszych niż ' + cleanupDays + ' dni', { icon: 'ℹ️' });
    }
  };

  const today = new Date();

  const last30 = Array.from({ length: 30 }, (_, i) => {
    const d = new Date(today);
    d.setDate(today.getDate() - (29 - i));
    return toLocalISO(d);
  });

  const last7 = last30.slice(-7);

  const caloriesByDate: Record<string, number> = {};
  foodDiary.forEach((e) => {
    caloriesByDate[e.date] = (caloriesByDate[e.date] || 0) + e.calories;
  });

  const maxCal = Math.max(...last7.map((d) => caloriesByDate[d] || 0), dailyGoal);

  const selectedEntries = selectedDate
    ? foodDiary.filter((e) => e.date === selectedDate)
    : [];

  const totalDaysLogged = Object.keys(caloriesByDate).length;
  const avgCalories =
    totalDaysLogged > 0
      ? Math.round(
          Object.values(caloriesByDate).reduce((a, b) => a + b, 0) / totalDaysLogged
        )
      : 0;
  const daysOnTarget = Object.values(caloriesByDate).filter(
    (c) => c >= dailyGoal * 0.8 && c <= dailyGoal * 1.2
  ).length;

  return (
    <div className="space-y-4">
      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-2">
        <div className="bg-white rounded-2xl p-3 text-center shadow-sm">
          <p className="text-lg font-bold text-orange-500">{totalDaysLogged}</p>
          <p className="text-xs text-gray-400">Dni z wpisami</p>
        </div>
        <div className="bg-white rounded-2xl p-3 text-center shadow-sm">
          <p className="text-lg font-bold text-blue-500">{avgCalories}</p>
          <p className="text-xs text-gray-400">Śr. kcal/dzień</p>
        </div>
        <div className="bg-white rounded-2xl p-3 text-center shadow-sm">
          <p className="text-lg font-bold text-green-500">{daysOnTarget}</p>
          <p className="text-xs text-gray-400">W celu (±20%)</p>
        </div>
      </div>

      {/* Cleanup old entries */}
      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        <button
          onClick={() => setShowCleanup((v) => !v)}
          className="w-full flex items-center justify-between px-4 py-3 active:scale-[0.99] transition-all"
        >
          <span className="flex items-center gap-2 text-sm font-semibold text-gray-700">
            <Trash2 size={16} className="text-red-400" />
            Usuń stare wpisy z dziennika
          </span>
          <span className="text-xs text-gray-400">{showCleanup ? 'zwiń' : 'pokaż'}</span>
        </button>
        {showCleanup && (
          <div className="px-4 pb-4 border-t border-gray-50 pt-3">
            <p className="text-xs text-gray-400 mb-2.5">Usuń wpisy starsze niż:</p>
            <div className="grid grid-cols-4 gap-2 mb-3">
              {CLEANUP_OPTIONS.map(({ days, label }) => (
                <button
                  key={days}
                  onClick={() => setCleanupDays(days)}
                  className={`py-2 rounded-xl text-xs font-semibold transition-all ${
                    cleanupDays === days ? 'bg-red-500 text-white' : 'bg-gray-100 text-gray-600'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
            <button
              onClick={handleCleanup}
              className="w-full bg-red-50 text-red-600 py-2.5 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 active:scale-95 transition-all hover:bg-red-100"
            >
              <Trash2 size={15} /> Usuń wpisy starsze niż {cleanupDays} dni
            </button>
            <p className="text-[11px] text-gray-400 mt-2 text-center">Tej operacji nie można cofnąć</p>
          </div>
        )}
      </div>

      {/* 7-day bar chart */}
      <div className="bg-white rounded-3xl p-4 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-gray-800 text-sm flex items-center gap-1.5">
            <TrendingUp size={16} className="text-orange-500" />
            Ostatnie 7 dni
          </h3>
          <span className="text-xs text-gray-400">Cel: {dailyGoal} kcal</span>
        </div>

        <div className="flex items-end gap-1.5 h-36 mb-2">
          {last7.map((date) => {
            const cal = caloriesByDate[date] || 0;
            const barHeight = cal > 0 ? Math.max((cal / maxCal) * 100, 6) : 0;
            const isToday = date === toLocalISO(today);
            const isSelected = date === selectedDate;
            const overGoal = cal > dailyGoal;
            const onTarget = cal >= dailyGoal * 0.8 && cal <= dailyGoal * 1.2;

            let barColor = 'bg-gray-100';
            if (cal > 0) {
              barColor = overGoal ? 'bg-red-400' : onTarget ? 'bg-green-400' : 'bg-orange-400';
            }
            if (isSelected) barColor = 'bg-purple-500';

            const dayDate = new Date(date + 'T12:00:00');

            return (
              <button
                key={date}
                onClick={() => setSelectedDate(isSelected ? null : date)}
                className="flex-1 flex flex-col items-center gap-1 group"
              >
                <span className={`text-xs font-bold ${cal > 0 ? 'text-gray-600' : 'text-transparent'}`}>
                  {cal > 0 ? (cal >= 1000 ? `${(cal / 1000).toFixed(1)}k` : cal) : ''}
                </span>
                <div className="w-full flex items-end justify-center h-24">
                  <div
                    className={`w-full rounded-t-lg transition-all duration-300 ${barColor} ${isSelected ? 'ring-2 ring-purple-400' : ''}`}
                    style={{ height: `${barHeight}%` }}
                  />
                </div>
                <span className={`text-xs font-medium ${isToday ? 'text-orange-500 font-bold' : 'text-gray-400'}`}>
                  {DAY_NAMES[dayDate.getDay()]}
                </span>
                {isToday && <span className="w-1 h-1 bg-orange-500 rounded-full" />}
              </button>
            );
          })}
        </div>

        {/* Goal line legend */}
        <div className="flex gap-3 flex-wrap">
          {[
            { color: 'bg-green-400', label: 'W celu (±20%)' },
            { color: 'bg-orange-400', label: 'Poniżej celu' },
            { color: 'bg-red-400', label: 'Ponad cel' },
          ].map(({ color, label }) => (
            <div key={label} className="flex items-center gap-1">
              <span className={`w-2.5 h-2.5 rounded-sm ${color}`} />
              <span className="text-xs text-gray-400">{label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Selected day detail */}
      {selectedDate && (
        <div className="bg-white rounded-3xl p-4 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-bold text-gray-800 text-sm flex items-center gap-1.5">
              <Calendar size={15} className="text-purple-500" />
              {(() => {
                const d = new Date(selectedDate + 'T12:00:00');
                return `${DAY_NAMES_FULL[d.getDay()]}, ${d.toLocaleDateString('pl-PL', { day: 'numeric', month: 'long' })}`;
              })()}
            </h3>
            <span className="text-sm font-bold text-orange-500">
              {caloriesByDate[selectedDate] || 0} kcal
            </span>
          </div>

          {selectedEntries.length === 0 ? (
            <p className="text-gray-400 text-sm text-center py-4">Brak wpisów w tym dniu</p>
          ) : (
            <div className="space-y-2">
              {selectedEntries.map((entry) => (
                <div key={entry.id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                  <div>
                    <p className="text-sm font-medium text-gray-700">{entry.name}</p>
                    <p className="text-xs text-gray-400">{entry.amount}{entry.unit}</p>
                  </div>
                  <span className="text-orange-500 font-semibold text-sm">{entry.calories} kcal</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 30-day mini calendar */}
      <div className="bg-white rounded-3xl p-4 shadow-sm">
        <h3 className="font-bold text-gray-800 text-sm mb-3">Ostatnie 30 dni</h3>
        <div className="grid grid-cols-10 gap-1">
          {last30.map((date) => {
            const cal = caloriesByDate[date] || 0;
            const isToday = date === toLocalISO(today);
            const overGoal = cal > dailyGoal;
            const onTarget = cal >= dailyGoal * 0.8 && cal <= dailyGoal * 1.2;

            let bg = 'bg-gray-100';
            if (cal > 0) bg = overGoal ? 'bg-red-300' : onTarget ? 'bg-green-300' : 'bg-orange-300';
            if (isToday) bg += ' ring-2 ring-orange-500 ring-offset-1';

            return (
              <div
                key={date}
                title={`${date}: ${cal} kcal`}
                className={`h-5 w-full rounded-sm ${bg}`}
              />
            );
          })}
        </div>
        <p className="text-xs text-gray-400 mt-2 text-center">
          Każdy kwadrat = 1 dzień (30 dni wstecz)
        </p>
      </div>
    </div>
  );
}

export default function CaloriesView() {
  const { foodDiary, recentProducts, myProducts, addMyProduct, addFoodEntry, removeFoodEntry, dailyGoal, setDailyGoal,
          proteinGoal, carbsGoal, fatGoal, activityLog } = useAppStore();
  const [mainTab, setMainTab] = useState<'today' | 'history' | 'stats'>('today');
  const [showAdd, setShowAdd] = useState(false);
  const [showPhotoScanner, setShowPhotoScanner] = useState(false);
  const [showBarcodeScanner, setShowBarcodeScanner] = useState(false);
  const [showGoalEdit, setShowGoalEdit] = useState(false);
  const [tempGoal, setTempGoal] = useState(dailyGoal);
  const [foodSearch, setFoodSearch] = useState('');
  const [selectedMealType, setSelectedMealType] = useState<FoodEntry['mealType']>('breakfast');
  const [amount, setAmount] = useState(100);
  const [selectedFood, setSelectedFood] = useState<FoodItem | null>(null);
  // Dla produktów „na szt." pozwala przełączyć wpisywanie na gramy.
  const [entryUnit, setEntryUnit] = useState<'szt' | 'g'>('szt');
  const [customFood, setCustomFood] = useState({ name: '', calories: 0, protein: 0, carbs: 0, fat: 0 });
  const [isCustom, setIsCustom] = useState(false);
  const [saveCustom, setSaveCustom] = useState(true);
  const [customBarcode, setCustomBarcode] = useState<string | null>(null);
  const [showCustomScanner, setShowCustomScanner] = useState(false);
  const [offResults, setOffResults] = useState<FoodItem[]>([]);
  const [offLoading, setOffLoading] = useState(false);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const today = todayISO();
  const todayEntries = foodDiary.filter((e) => e.date === today);
  const todayCalories = todayEntries.reduce((s, e) => s + e.calories, 0);
  const todayProtein = todayEntries.reduce((s, e) => s + e.protein, 0);
  const todayCarbs = todayEntries.reduce((s, e) => s + e.carbs, 0);
  const todayFat = todayEntries.reduce((s, e) => s + e.fat, 0);

  const todayBurned = activityLog
    .filter((e) => e.date === today)
    .reduce((s, e) => s + e.caloriesBurned, 0);
  const netCalories = Math.max(0, todayCalories - todayBurned);

  const progress = Math.min((todayCalories / dailyGoal) * 100, 100);

  const isSzt = selectedFood?.unit === 'szt';
  const gramsPerPiece = selectedFood?.gramsPerPiece;
  const canSwitchUnit = isSzt && !!gramsPerPiece; // można przełączać szt ⇄ g
  const inGrams = isSzt && entryUnit === 'g' && !!gramsPerPiece;

  // Mnożnik makroskładników względem wartości bazowej produktu.
  const macroFactor = !selectedFood
    ? 0
    : isSzt
      ? (inGrams ? amount / (gramsPerPiece || 1) : amount) // g: ułamek sztuki • szt: liczba sztuk
      : amount / 100;
  const calcCalories = selectedFood ? Math.round(selectedFood.calories * macroFactor) : 0;

  const foodQ = normalizeText(foodSearch);
  // Własne produkty użytkownika — pokazywane jako pierwsze.
  const filteredMine: FoodItem[] = myProducts
    .filter((p) => matchesQuery(p, foodSearch))
    .map((p) => ({
      name: p.name, calories: p.calories, protein: p.protein, carbs: p.carbs, fat: p.fat,
      unit: p.unit, gramsPerPiece: p.gramsPerPiece,
    }));
  const filteredFoods = COMMON_FOODS.filter((f) => matchesQuery(f, foodSearch));

  const filteredDishes: FoodItem[] = foodSearch.length >= 2
    ? POLISH_DISHES
        .filter((d) => matchesQuery(d, foodSearch))
        .map((d) => ({ ...d }))
    : [];

  const searchOFF = useCallback(async (q: string) => {
    if (q.length < 3) { setOffResults([]); return; }
    setOffLoading(true);
    try {
      // Sortujemy po popularności (najczęściej skanowane) i bierzemy więcej wyników,
      // żeby znane produkty pojawiały się na górze.
      const res = await fetch(
        `https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(q)}&search_simple=1&action=process&json=1&sort_by=unique_scans_n&page_size=40&fields=product_name,product_name_pl,brands,nutriments`
      );
      const data = await res.json();
      const items: FoodItem[] = (data.products || [])
        .map((p: Record<string, unknown>) => {
          const n = (p.nutriments as Record<string, number>) || {};
          const brand = ((p.brands as string) || '').split(',')[0].trim();
          const base = ((p.product_name_pl as string) || (p.product_name as string) || '').trim();
          const name = base && brand && !base.toLowerCase().includes(brand.toLowerCase())
            ? `${base} (${brand})` : base;
          return {
            name,
            calories: Math.round(n['energy-kcal_100g'] ?? (n.energy_100g ?? 0) / 4.184),
            protein: Math.round((n.proteins_100g ?? 0) * 10) / 10,
            carbs: Math.round((n.carbohydrates_100g ?? 0) * 10) / 10,
            fat: Math.round((n.fat_100g ?? 0) * 10) / 10,
            unit: '100g',
          };
        })
        .filter((f: FoodItem) => f.name && f.calories > 0);
      // Usuń duplikaty nazw
      const seen = new Set<string>();
      const unique = items.filter((f) => {
        const k = f.name.toLowerCase();
        if (seen.has(k)) return false;
        seen.add(k);
        return true;
      });
      setOffResults(unique.slice(0, 25));
    } catch {
      setOffResults([]);
    } finally {
      setOffLoading(false);
    }
  }, []);

  const handleSearchChange = (val: string) => {
    setFoodSearch(val);
    setSelectedFood(null);
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => searchOFF(val), 600);
  };

  const allFoods: FoodItem[] = foodSearch.length >= 2
    ? [
        ...filteredMine,
        ...filteredDishes,
        ...filteredFoods.filter(f => !filteredDishes.find(d => d.name === f.name) && !filteredMine.find(m => m.name === f.name)),
        ...(foodSearch.length >= 3 ? offResults.filter(o => !filteredFoods.find(f => f.name === o.name) && !filteredDishes.find(d => d.name === o.name)) : []),
      ]
    : [...filteredMine, ...filteredFoods];

  // „Ostatnio dodane" — trwała pamięć produktów ze store (nie znika po czyszczeniu
  // dziennika ani po wielu tygodniach). Filtrowana wg wpisywanego tekstu.
  const recentFoods = useMemo(() => {
    if (!foodQ) return recentProducts;
    return recentProducts.filter((p) => matchesQuery(p, foodSearch));
  }, [recentProducts, foodQ]);

  // Kliknięcie pozycji z historii → wybiera produkt z normalnym edytorem ilości.
  // Jeśli produkt jest w bazie, bierzemy jego dane (pełne makro); w innym wypadku
  // odtwarzamy wartości „na jednostkę" z zapisanego wpisu.
  const selectRecent = (e: { name: string; amount: number; unit: string; calories: number; protein: number; carbs: number; fat: number }) => {
    setIsCustom(false);
    setFoodSearch('');
    setEntryUnit('szt');
    const known =
      COMMON_FOODS.find((f) => f.name === e.name) ||
      POLISH_DISHES.find((d) => d.name === e.name);
    if (known) {
      setSelectedFood({ ...known });
      // Jeśli ostatnio dodano ten produkt w gramach — od razu wróć do trybu gramów.
      const knownGpp = (known as FoodItem).gramsPerPiece;
      if (known.unit === 'szt' && e.unit === 'g' && knownGpp) {
        setEntryUnit('g');
        setAmount(e.amount > 0 ? e.amount : knownGpp);
      } else {
        setAmount(e.amount > 0 ? e.amount : known.portionG ?? (known.unit === 'szt' ? 1 : 100));
      }
      return;
    }
    const isPieces = e.unit === 'szt';
    const isVolume = e.unit === 'ml' || e.unit === '100ml';
    const unit = isPieces ? 'szt' : isVolume ? '100ml' : '100g';
    const factor = isPieces ? (e.amount || 1) : (e.amount || 100) / 100;
    const per = (v: number) => (factor > 0 ? Math.round((v / factor) * 10) / 10 : v);
    setSelectedFood({
      name: e.name,
      calories: factor > 0 ? Math.round(e.calories / factor) : e.calories,
      protein: per(e.protein),
      carbs: per(e.carbs),
      fat: per(e.fat),
      unit,
    });
    setAmount(isPieces ? (e.amount || 1) : (e.amount || 100));
  };

  const handleAddEntry = () => {
    if (isCustom) {
      if (!customFood.name.trim() || customFood.calories <= 0) {
        toast.error('Podaj nazwę i kalorie');
        return;
      }
      // Zapamiętaj produkt na stałe (opcjonalnie z zeskanowanym kodem).
      if (saveCustom) {
        addMyProduct({
          name: customFood.name.trim(),
          calories: customFood.calories,
          protein: customFood.protein,
          carbs: customFood.carbs,
          fat: customFood.fat,
          unit: '100g',
          barcode: customBarcode || undefined,
        });
      }
      addFoodEntry({
        id: `entry-${Date.now()}`,
        name: customFood.name,
        calories: customFood.calories,
        protein: customFood.protein,
        carbs: customFood.carbs,
        fat: customFood.fat,
        amount: 100,
        unit: 'g',
        date: today,
        mealType: selectedMealType,
      });
      setCustomBarcode(null);
    } else {
      if (!selectedFood) { toast.error('Wybierz produkt'); return; }
      const multiplier = macroFactor;
      addFoodEntry({
        id: `entry-${Date.now()}`,
        name: selectedFood.name,
        calories: Math.round(selectedFood.calories * multiplier),
        protein: Math.round(selectedFood.protein * multiplier * 10) / 10,
        carbs: Math.round(selectedFood.carbs * multiplier * 10) / 10,
        fat: Math.round(selectedFood.fat * multiplier * 10) / 10,
        amount,
        unit: inGrams ? 'g' : selectedFood.unit,
        date: today,
        mealType: selectedMealType,
      });
    }
    toast.success('Dodano do dziennika! 🍽️');
    setShowAdd(false);
    setSelectedFood(null);
    setAmount(100);
    setEntryUnit('szt');
    setFoodSearch('');
    setOffResults([]);
    setCustomFood({ name: '', calories: 0, protein: 0, carbs: 0, fat: 0 });
  };

  const groupedEntries = MEAL_TYPES.map((mt) => ({
    ...mt,
    entries: todayEntries.filter((e) => e.mealType === mt.id),
  }));

  return (
    <div className="pb-20 min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-gradient-to-br from-red-500 to-orange-500 text-white px-4 pt-12 pb-6">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-xl font-bold flex items-center gap-2">
            <Flame size={22} /> Licznik Kalorii
          </h1>
          <button
            onClick={() => { setShowGoalEdit(true); setTempGoal(dailyGoal); }}
            className="flex items-center gap-1 bg-white/20 rounded-xl px-3 py-1.5 text-sm"
          >
            <Target size={14} />
            Cel: {dailyGoal}
          </button>
        </div>

        <div className="flex items-center gap-6">
          <div className="relative w-28 h-28 flex-shrink-0">
            <svg className="w-28 h-28 -rotate-90" viewBox="0 0 112 112">
              <circle cx="56" cy="56" r="48" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="10" />
              <circle
                cx="56" cy="56" r="48"
                fill="none"
                stroke="white"
                strokeWidth="10"
                strokeLinecap="round"
                strokeDasharray={`${2 * Math.PI * 48}`}
                strokeDashoffset={`${2 * Math.PI * 48 * (1 - progress / 100)}`}
                className="transition-all duration-700"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <p className="text-2xl font-bold leading-none">{todayCalories}</p>
              <p className="text-xs text-white/80">kcal</p>
            </div>
          </div>
          <div className="flex-1 space-y-2">
            {[
              { label: 'Białko', val: todayProtein, goal: proteinGoal, color: 'bg-blue-300' },
              { label: 'Węglowodany', val: todayCarbs, goal: carbsGoal, color: 'bg-yellow-300' },
              { label: 'Tłuszcze', val: todayFat, goal: fatGoal, color: 'bg-red-300' },
            ].map(({ label, val, goal, color }) => (
              <div key={label}>
                <div className="flex justify-between text-sm">
                  <span className="text-white/80">{label}</span>
                  <span className="font-semibold">{val.toFixed(1)}g</span>
                </div>
                <div className="h-1.5 bg-white/20 rounded-full">
                  <div className={`h-full ${color} rounded-full`} style={{ width: `${Math.min((val / goal) * 100, 100)}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-4 bg-white/20 rounded-xl p-2 flex justify-between text-sm">
          <span>Pozostało: <b>{Math.max(dailyGoal - todayCalories, 0)} kcal</b></span>
          <span>{Math.round(progress)}% celu</span>
        </div>
        {todayBurned > 0 && (
          <div className="mt-2 bg-white/10 rounded-xl p-2 flex justify-between text-xs text-white/90">
            <span>🏃 Spalone: <b>{todayBurned} kcal</b></span>
            <span>Netto: <b>{netCalories} kcal</b></span>
          </div>
        )}
      </div>

      {/* Main tab switcher */}
      <div className="px-4 mt-4">
        <div className="flex gap-1.5 bg-gray-200 rounded-2xl p-1 mb-4">
          <button
            onClick={() => setMainTab('today')}
            className={`flex-1 flex items-center justify-center gap-1 py-2.5 rounded-xl text-xs font-semibold transition-all ${
              mainTab === 'today' ? 'bg-white shadow text-gray-800' : 'text-gray-500'
            }`}
          >
            <Flame size={13} /> Dzisiaj
          </button>
          <button
            onClick={() => setMainTab('history')}
            className={`flex-1 flex items-center justify-center gap-1 py-2.5 rounded-xl text-xs font-semibold transition-all ${
              mainTab === 'history' ? 'bg-white shadow text-gray-800' : 'text-gray-500'
            }`}
          >
            <TrendingUp size={13} /> Historia
          </button>
          <button
            onClick={() => setMainTab('stats')}
            className={`flex-1 flex items-center justify-center gap-1 py-2.5 rounded-xl text-xs font-semibold transition-all ${
              mainTab === 'stats' ? 'bg-white shadow text-gray-800' : 'text-gray-500'
            }`}
          >
            <BarChart3 size={13} /> Wykresy
          </button>
        </div>

        {mainTab === 'stats' ? (
          <CalorieStatsTab />
        ) : mainTab === 'history' ? (
          <HistoryTab />
        ) : (
          <>
            <div className="flex gap-2 mb-4">
              <button
                onClick={() => setShowAdd(true)}
                className="flex-1 bg-orange-500 text-white py-3.5 rounded-2xl font-semibold flex items-center justify-center gap-2 shadow-lg shadow-orange-200 active:scale-95 transition-all hover:bg-orange-600"
              >
                <Plus size={20} /> Dodaj posiłek
              </button>
              <button
                onClick={() => setShowPhotoScanner(true)}
                className="bg-orange-100 text-orange-600 px-4 rounded-2xl flex items-center justify-center gap-1.5 font-semibold active:scale-95 transition-all hover:bg-orange-200"
                title="Dodaj przez zdjęcie"
              >
                <Camera size={20} />
              </button>
              <button
                onClick={() => setShowBarcodeScanner(true)}
                className="bg-purple-100 text-purple-600 px-4 rounded-2xl flex items-center justify-center gap-1.5 font-semibold active:scale-95 transition-all hover:bg-purple-200"
                title="Skanuj kod kreskowy"
              >
                <Barcode size={20} />
              </button>
            </div>

            {groupedEntries.map((group) => (
              <div key={group.id} className="mb-4">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-semibold text-gray-700 text-sm flex items-center gap-1.5">
                    {group.emoji} {group.label}
                  </h3>
                  <span className="text-xs text-gray-400">
                    {group.entries.reduce((s, e) => s + e.calories, 0)} kcal
                  </span>
                </div>
                {group.entries.length === 0 ? (
                  <div className="bg-gray-100 rounded-xl px-4 py-3 text-center text-gray-400 text-xs">
                    Brak wpisów
                  </div>
                ) : (
                  <div className="space-y-2">
                    {group.entries.map((entry) => (
                      <div key={entry.id} className="bg-white rounded-xl px-4 py-3 shadow-sm flex items-center justify-between">
                        <div>
                          <p className="font-medium text-gray-800 text-sm">{entry.name}</p>
                          <p className="text-xs text-gray-400 mt-0.5">
                            {entry.amount}{entry.unit} · B: {entry.protein}g · W: {entry.carbs}g · T: {entry.fat}g
                          </p>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-orange-500 font-bold text-sm">{entry.calories} kcal</span>
                          <button onClick={() => { removeFoodEntry(entry.id); toast.success('Usunięto'); }} className="text-red-300 hover:text-red-500">
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </>
        )}
      </div>

      {/* Goal edit modal */}
      {showGoalEdit && (
        <div className="fixed inset-0 bg-black/50 z-[60] flex items-end justify-center">
          <div className="bg-white rounded-t-3xl w-full max-w-lg p-6">
            <h3 className="font-bold text-gray-800 text-lg mb-4">Ustaw dzienny cel kalorii</h3>
            <input
              type="number"
              value={tempGoal}
              onChange={(e) => setTempGoal(Number(e.target.value))}
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-center text-2xl font-bold outline-none focus:ring-2 focus:ring-orange-400 mb-4"
            />
            <div className="grid grid-cols-3 gap-2 mb-4">
              {[1500, 1800, 2000, 2200, 2500, 3000].map((v) => (
                <button
                  key={v}
                  onClick={() => setTempGoal(v)}
                  className={`py-2 rounded-xl text-sm font-medium transition-all ${tempGoal === v ? 'bg-orange-500 text-white' : 'bg-gray-100 text-gray-600'}`}
                >
                  {v}
                </button>
              ))}
            </div>
            <div className="flex gap-3">
              <button onClick={() => setShowGoalEdit(false)} className="flex-1 py-3 bg-gray-100 rounded-xl text-gray-600 font-medium">Anuluj</button>
              <button
                onClick={() => { setDailyGoal(tempGoal); setShowGoalEdit(false); toast.success('Cel zaktualizowany!'); }}
                className="flex-1 py-3 bg-orange-500 text-white rounded-xl font-semibold"
              >
                Zapisz
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add food modal */}
      {showAdd && (
        <div className="fixed inset-0 bg-black/50 z-[60] flex items-end justify-center pb-16">
          <div className="bg-white rounded-t-3xl w-full max-w-lg max-h-[82vh] flex flex-col">
            <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-gray-100">
              <h3 className="font-bold text-gray-800 text-lg">Dodaj posiłek</h3>
              <button onClick={() => setShowAdd(false)}><X size={22} className="text-gray-400" /></button>
            </div>
            <div className="overflow-y-auto flex-1 px-5 pb-2 pt-3">
              <div className="grid grid-cols-4 gap-1.5 mb-4">
                {MEAL_TYPES.map((mt) => (
                  <button
                    key={mt.id}
                    onClick={() => setSelectedMealType(mt.id)}
                    className={`flex flex-col items-center py-2 px-1 rounded-xl text-[11px] font-semibold transition-all active:scale-95 ${
                      selectedMealType === mt.id
                        ? 'bg-orange-500 text-white shadow-sm shadow-orange-200'
                        : 'bg-gray-100 text-gray-600'
                    }`}
                  >
                    <span className="text-lg leading-tight">{mt.emoji}</span>
                    <span className="mt-0.5 leading-tight">{mt.short}</span>
                  </button>
                ))}
              </div>
              <div className="flex gap-2 mb-4">
                <button onClick={() => setIsCustom(false)} className={`flex-1 py-2 rounded-xl text-sm font-medium ${!isCustom ? 'bg-orange-500 text-white' : 'bg-gray-100 text-gray-600'}`}>Z listy</button>
                <button onClick={() => setIsCustom(true)} className={`flex-1 py-2 rounded-xl text-sm font-medium ${isCustom ? 'bg-orange-500 text-white' : 'bg-gray-100 text-gray-600'}`}>Własny</button>
              </div>

              {!isCustom ? (
                <>
                  <div className="relative mb-2">
                    <Search size={16} className="absolute left-3 top-3 text-gray-400" />
                    <input
                      type="text"
                      value={foodSearch}
                      onChange={(e) => handleSearchChange(e.target.value)}
                      placeholder="np. jajecznica, kotlet, pierogi..."
                      className="w-full bg-gray-100 rounded-xl pl-9 pr-9 py-2.5 text-sm outline-none focus:ring-2 focus:ring-orange-400"
                    />
                    {offLoading && <Loader size={14} className="absolute right-3 top-3 text-orange-400 animate-spin" />}
                  </div>

                  {/* Ostatnio dodane — szybki wybór bez wyszukiwania (chowamy po wybraniu produktu) */}
                  {!selectedFood && foodSearch.length < 2 && recentFoods.length > 0 && (
                    <div className="mb-3">
                      <p className="text-xs text-gray-400 mb-1.5 flex items-center gap-1">
                        <Clock size={11} /> Ostatnio dodane
                      </p>
                      <div className="space-y-1.5 max-h-60 overflow-y-auto">
                        {recentFoods.map((e) => (
                          <button
                            key={e.name}
                            onClick={() => selectRecent(e)}
                            className="w-full flex items-center justify-between p-2.5 rounded-xl text-left transition-all bg-gray-50 hover:bg-gray-100"
                          >
                            <div className="flex-1 min-w-0 pr-2">
                              <p className="font-medium text-sm text-gray-800 leading-tight truncate">{e.name}</p>
                              <p className="text-[11px] text-gray-400 mt-0.5">
                                ostatnio: {e.amount}
                                {e.unit === 'szt' ? ' szt'
                                  : e.unit === '100ml' || e.unit === 'ml' ? ' ml'
                                  : e.unit === '100g' || e.unit === 'g' ? ' g'
                                  : ` ${e.unit}`}
                                {' · '}{e.calories} kcal
                              </p>
                            </div>
                            <span className="text-orange-400 text-lg font-bold flex-shrink-0 leading-none">+</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Lista wyników — tylko podczas wyszukiwania i gdy nic nie wybrano */}
                  {!selectedFood && foodSearch.length >= 2 && (
                    <>
                      <p className="text-xs text-gray-400 mb-2 flex items-center gap-1">
                        <ChefHat size={11} /> {allFoods.length} wyników (polskie dania + składniki{foodSearch.length >= 3 ? ' + OpenFoodFacts' : ''})
                      </p>
                      <div className="space-y-2 mb-3 max-h-60 overflow-y-auto">
                        {allFoods.map((food, idx) => {
                          const isDish = !!food.description;
                          return (
                            <button
                              key={`${food.name}-${idx}`}
                              onClick={() => {
                                setSelectedFood(food);
                                setEntryUnit('szt');
                                setAmount(food.portionG ?? (food.unit === 'szt' ? 1 : 100));
                              }}
                              className="w-full flex items-start justify-between p-3 rounded-xl text-left transition-all bg-gray-50 hover:bg-gray-100"
                            >
                              <div className="flex-1 min-w-0 pr-2">
                                <div className="flex items-center gap-1.5">
                                  {isDish && <ChefHat size={12} className="text-orange-400 flex-shrink-0" />}
                                  <p className="font-medium text-sm text-gray-800 leading-tight">{food.name}</p>
                                </div>
                                <p className="text-xs text-gray-400 mt-0.5">B:{food.protein}g · W:{food.carbs}g · T:{food.fat}g</p>
                                {isDish && food.portionG && (
                                  <p className="text-[11px] text-orange-500 mt-0.5">🍽 porcja ~{food.portionG}g</p>
                                )}
                              </div>
                              <span className="text-orange-500 font-bold text-sm flex-shrink-0">{food.calories} kcal/{food.unit === 'szt' ? 'szt' : food.unit === '100ml' ? '100ml' : '100g'}</span>
                            </button>
                          );
                        })}
                      </div>
                    </>
                  )}
                  {selectedFood && (
                    <div className="mb-3">
                      {/* Wybrany produkt + powrót do listy */}
                      <div className="flex items-center justify-between mb-2">
                        <p className="font-semibold text-gray-800 text-sm truncate pr-2">{selectedFood.name}</p>
                        <button
                          type="button"
                          onClick={() => { setSelectedFood(null); }}
                          className="text-xs text-orange-500 font-semibold flex-shrink-0 flex items-center gap-1"
                        >
                          <X size={13} /> Zmień produkt
                        </button>
                      </div>
                      {selectedFood.description && (
                        <div className="bg-orange-50 border border-orange-100 rounded-xl p-3 mb-3 text-xs text-gray-600 leading-relaxed">
                          <p className="font-semibold text-orange-600 mb-1 flex items-center gap-1"><ChefHat size={12} /> Składniki / opis</p>
                          {selectedFood.description}
                        </div>
                      )}
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-xs text-gray-500 font-medium">
                          {inGrams ? 'Ilość (g)' : isSzt ? 'Ilość (szt)' : `Ilość (${selectedFood.unit === '100g' ? 'g' : 'ml'})`}
                          {selectedFood.portionG && !isSzt && (
                            <button
                              type="button"
                              onClick={() => setAmount(selectedFood.portionG!)}
                              className="ml-2 text-orange-500 underline text-[11px]"
                            >
                              ustaw porcję ({selectedFood.portionG}g)
                            </button>
                          )}
                        </label>
                        {canSwitchUnit && (
                          <div className="flex rounded-lg overflow-hidden border border-gray-200">
                            <button
                              type="button"
                              onClick={() => { setEntryUnit('szt'); setAmount(1); }}
                              className={`px-3 py-1 text-xs font-semibold transition-colors ${!inGrams ? 'bg-orange-500 text-white' : 'bg-white text-gray-500'}`}
                            >
                              szt
                            </button>
                            <button
                              type="button"
                              onClick={() => { setEntryUnit('g'); setAmount(gramsPerPiece!); }}
                              className={`px-3 py-1 text-xs font-semibold transition-colors ${inGrams ? 'bg-orange-500 text-white' : 'bg-white text-gray-500'}`}
                            >
                              gramy
                            </button>
                          </div>
                        )}
                      </div>
                      {canSwitchUnit && (
                        <p className="text-[11px] text-gray-400 mb-1">1 szt ≈ {gramsPerPiece} g</p>
                      )}
                      <input
                        type="number"
                        value={amount}
                        onChange={(e) => setAmount(Number(e.target.value))}
                        className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-center text-lg font-bold outline-none focus:ring-2 focus:ring-orange-400"
                      />
                      <p className="text-center text-orange-500 font-bold mt-1">
                        = {calcCalories} kcal
                      </p>
                    </div>
                  )}
                </>
              ) : (
                <div className="space-y-3 mb-4">
                  <input
                    type="text"
                    value={customFood.name}
                    onChange={(e) => setCustomFood((p) => ({ ...p, name: e.target.value }))}
                    placeholder="Nazwa produktu"
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-orange-400"
                  />
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { label: 'Kalorie (kcal)', key: 'calories' },
                      { label: 'Białko (g)', key: 'protein' },
                      { label: 'Węglowodany (g)', key: 'carbs' },
                      { label: 'Tłuszcze (g)', key: 'fat' },
                    ].map((field) => (
                      <div key={field.key}>
                        <label className="text-xs text-gray-500 mb-1 block">{field.label}</label>
                        <input
                          type="number"
                          value={customFood[field.key as keyof typeof customFood] || ''}
                          onChange={(e) => setCustomFood((p) => ({ ...p, [field.key]: Number(e.target.value) }))}
                          className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-orange-400"
                        />
                      </div>
                    ))}
                  </div>

                  {/* Zapamiętanie produktu + kod kreskowy */}
                  <div className="bg-gray-50 rounded-xl p-3 space-y-2">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={saveCustom}
                        onChange={(e) => setSaveCustom(e.target.checked)}
                        className="w-4 h-4 accent-orange-500"
                      />
                      <span className="text-sm text-gray-700 font-medium">Zapamiętaj ten produkt</span>
                    </label>
                    <p className="text-[11px] text-gray-400">
                      Trafi do Twojej bazy — znajdziesz go potem przez wyszukiwarkę.
                    </p>
                    {saveCustom && (
                      customBarcode ? (
                        <div className="flex items-center justify-between bg-white rounded-lg px-3 py-2">
                          <span className="text-xs text-gray-600">Kod: <strong>{customBarcode}</strong></span>
                          <button onClick={() => setCustomBarcode(null)} className="text-xs text-red-400 font-semibold">usuń</button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setShowCustomScanner(true)}
                          className="w-full flex items-center justify-center gap-2 bg-purple-100 text-purple-700 py-2 rounded-lg text-xs font-semibold active:scale-95 transition-all"
                        >
                          <Barcode size={14} /> Przypisz kod kreskowy (opcjonalnie)
                        </button>
                      )
                    )}
                  </div>
                </div>
              )}

            </div>
            {/* Przycisk zawsze widoczny na dole — poza scrollem */}
            <div className="px-5 pb-5 pt-3 border-t border-gray-100">
              <button
                onClick={handleAddEntry}
                className="w-full bg-orange-500 text-white py-3.5 rounded-2xl font-semibold active:scale-95 transition-all shadow-lg shadow-orange-200"
              >
                + Dodaj do dziennika
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Photo calorie scanner */}
      {showPhotoScanner && <PhotoCalorieScanner onClose={() => setShowPhotoScanner(false)} />}
      {showBarcodeScanner && <BarcodeScanner onClose={() => setShowBarcodeScanner(false)} />}
      {showCustomScanner && (
        <BarcodeScanSheet
          onPick={(p) => {
            setCustomBarcode(p.barcode);
            setCustomFood((c) => ({
              name: c.name || p.name,
              calories: c.calories || p.calories,
              protein: c.protein || p.protein,
              carbs: c.carbs || p.carbs,
              fat: c.fat || p.fat,
            }));
            setShowCustomScanner(false);
          }}
          onClose={() => setShowCustomScanner(false)}
        />
      )}
    </div>
  );
}
