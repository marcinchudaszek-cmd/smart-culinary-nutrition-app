import { useState } from 'react';
import { Plus, Trash2, Flame, Target, Search, X, TrendingUp, Calendar } from 'lucide-react';
import { useAppStore, FoodEntry } from '../store/useAppStore';
import toast from 'react-hot-toast';

const MEAL_TYPES = [
  { id: 'breakfast', label: 'Śniadanie', emoji: '🌅' },
  { id: 'lunch', label: 'Obiad', emoji: '☀️' },
  { id: 'dinner', label: 'Kolacja', emoji: '🌙' },
  { id: 'snack', label: 'Przekąska', emoji: '🍎' },
] as const;

const COMMON_FOODS = [
  { name: 'Jajko', calories: 78, protein: 6, carbs: 0.6, fat: 5, unit: 'szt' },
  { name: 'Chleb pszenny', calories: 265, protein: 9, carbs: 49, fat: 3.2, unit: '100g' },
  { name: 'Mleko 2%', calories: 50, protein: 3.4, carbs: 4.8, fat: 2, unit: '100ml' },
  { name: 'Pierś z kurczaka', calories: 165, protein: 31, carbs: 0, fat: 3.6, unit: '100g' },
  { name: 'Ryż biały', calories: 130, protein: 2.7, carbs: 28, fat: 0.3, unit: '100g' },
  { name: 'Makaron', calories: 131, protein: 5, carbs: 25, fat: 1.1, unit: '100g' },
  { name: 'Ziemniaki', calories: 77, protein: 2, carbs: 17, fat: 0.1, unit: '100g' },
  { name: 'Banan', calories: 89, protein: 1.1, carbs: 23, fat: 0.3, unit: 'szt' },
  { name: 'Jabłko', calories: 52, protein: 0.3, carbs: 14, fat: 0.2, unit: 'szt' },
  { name: 'Ser żółty', calories: 400, protein: 25, carbs: 1.3, fat: 33, unit: '100g' },
  { name: 'Jogurt naturalny', calories: 61, protein: 3.5, carbs: 4.7, fat: 3.3, unit: '100g' },
  { name: 'Masło', calories: 717, protein: 0.9, carbs: 0.1, fat: 81, unit: '100g' },
  { name: 'Oliwa z oliwek', calories: 884, protein: 0, carbs: 0, fat: 100, unit: '100ml' },
  { name: 'Łosoś', calories: 208, protein: 20, carbs: 0, fat: 13, unit: '100g' },
  { name: 'Twaróg', calories: 98, protein: 11, carbs: 3.4, fat: 4.3, unit: '100g' },
];

const DAY_NAMES = ['Nd', 'Pn', 'Wt', 'Śr', 'Cz', 'Pt', 'So'];
const DAY_NAMES_FULL = ['Niedziela', 'Poniedziałek', 'Wtorek', 'Środa', 'Czwartek', 'Piątek', 'Sobota'];

function HistoryTab() {
  const { foodDiary, dailyGoal } = useAppStore();
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const today = new Date();

  const last30 = Array.from({ length: 30 }, (_, i) => {
    const d = new Date(today);
    d.setDate(today.getDate() - (29 - i));
    return d.toISOString().split('T')[0];
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
            const isToday = date === today.toISOString().split('T')[0];
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
            const isToday = date === today.toISOString().split('T')[0];
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
  const { foodDiary, addFoodEntry, removeFoodEntry, dailyGoal, setDailyGoal, proteinGoal, carbsGoal, fatGoal } = useAppStore();
  const [mainTab, setMainTab] = useState<'today' | 'history'>('today');
  const [showAdd, setShowAdd] = useState(false);
  const [showGoalEdit, setShowGoalEdit] = useState(false);
  const [tempGoal, setTempGoal] = useState(dailyGoal);
  const [foodSearch, setFoodSearch] = useState('');
  const [selectedMealType, setSelectedMealType] = useState<FoodEntry['mealType']>('breakfast');
  const [amount, setAmount] = useState(100);
  const [selectedFood, setSelectedFood] = useState<typeof COMMON_FOODS[0] | null>(null);
  const [customFood, setCustomFood] = useState({ name: '', calories: 0, protein: 0, carbs: 0, fat: 0 });
  const [isCustom, setIsCustom] = useState(false);

  const today = new Date().toISOString().split('T')[0];
  const todayEntries = foodDiary.filter((e) => e.date === today);
  const todayCalories = todayEntries.reduce((s, e) => s + e.calories, 0);
  const todayProtein = todayEntries.reduce((s, e) => s + e.protein, 0);
  const todayCarbs = todayEntries.reduce((s, e) => s + e.carbs, 0);
  const todayFat = todayEntries.reduce((s, e) => s + e.fat, 0);

  const progress = Math.min((todayCalories / dailyGoal) * 100, 100);

  const filteredFoods = COMMON_FOODS.filter((f) =>
    f.name.toLowerCase().includes(foodSearch.toLowerCase())
  );

  const handleAddEntry = () => {
    if (isCustom) {
      if (!customFood.name.trim() || customFood.calories <= 0) {
        toast.error('Podaj nazwę i kalorie');
        return;
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
    } else {
      if (!selectedFood) { toast.error('Wybierz produkt'); return; }
      const multiplier = amount / 100;
      addFoodEntry({
        id: `entry-${Date.now()}`,
        name: selectedFood.name,
        calories: Math.round(selectedFood.calories * multiplier),
        protein: Math.round(selectedFood.protein * multiplier * 10) / 10,
        carbs: Math.round(selectedFood.carbs * multiplier * 10) / 10,
        fat: Math.round(selectedFood.fat * multiplier * 10) / 10,
        amount,
        unit: selectedFood.unit,
        date: today,
        mealType: selectedMealType,
      });
    }
    toast.success('Dodano do dziennika! 🍽️');
    setShowAdd(false);
    setSelectedFood(null);
    setAmount(100);
    setFoodSearch('');
    setCustomFood({ name: '', calories: 0, protein: 0, carbs: 0, fat: 0 });
  };

  const groupedEntries = MEAL_TYPES.map((mt) => ({
    ...mt,
    entries: todayEntries.filter((e) => e.mealType === mt.id),
  }));

  return (
    <div className="pb-20 min-h-screen bg-gray-50">
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
      </div>

      {/* Main tab switcher */}
      <div className="px-4 mt-4">
        <div className="flex gap-2 bg-gray-200 rounded-2xl p-1 mb-4">
          <button
            onClick={() => setMainTab('today')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-sm font-semibold transition-all ${
              mainTab === 'today' ? 'bg-white shadow text-gray-800' : 'text-gray-500'
            }`}
          >
            <Flame size={15} /> Dzisiaj
          </button>
          <button
            onClick={() => setMainTab('history')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-sm font-semibold transition-all ${
              mainTab === 'history' ? 'bg-white shadow text-gray-800' : 'text-gray-500'
            }`}
          >
            <TrendingUp size={15} /> Historia
          </button>
        </div>

        {mainTab === 'history' ? (
          <HistoryTab />
        ) : (
          <>
            <button
              onClick={() => setShowAdd(true)}
              className="w-full bg-orange-500 text-white py-3.5 rounded-2xl font-semibold flex items-center justify-center gap-2 shadow-lg shadow-orange-200 active:scale-95 transition-all mb-4 hover:bg-orange-600"
            >
              <Plus size={20} /> Dodaj posiłek
            </button>

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
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end justify-center">
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
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end justify-center">
          <div className="bg-white rounded-t-3xl w-full max-w-lg max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-gray-100">
              <h3 className="font-bold text-gray-800 text-lg">Dodaj posiłek</h3>
              <button onClick={() => setShowAdd(false)}><X size={22} className="text-gray-400" /></button>
            </div>
            <div className="overflow-y-auto flex-1 px-5 pb-5 pt-3">
              <div className="flex gap-2 mb-4 overflow-x-auto pb-1">
                {MEAL_TYPES.map((mt) => (
                  <button
                    key={mt.id}
                    onClick={() => setSelectedMealType(mt.id)}
                    className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                      selectedMealType === mt.id ? 'bg-orange-500 text-white' : 'bg-gray-100 text-gray-600'
                    }`}
                  >
                    {mt.emoji} {mt.label}
                  </button>
                ))}
              </div>
              <div className="flex gap-2 mb-4">
                <button onClick={() => setIsCustom(false)} className={`flex-1 py-2 rounded-xl text-sm font-medium ${!isCustom ? 'bg-orange-500 text-white' : 'bg-gray-100 text-gray-600'}`}>Z listy</button>
                <button onClick={() => setIsCustom(true)} className={`flex-1 py-2 rounded-xl text-sm font-medium ${isCustom ? 'bg-orange-500 text-white' : 'bg-gray-100 text-gray-600'}`}>Własny</button>
              </div>

              {!isCustom ? (
                <>
                  <div className="relative mb-3">
                    <Search size={16} className="absolute left-3 top-3 text-gray-400" />
                    <input
                      type="text"
                      value={foodSearch}
                      onChange={(e) => setFoodSearch(e.target.value)}
                      placeholder="Szukaj produktu..."
                      className="w-full bg-gray-100 rounded-xl pl-9 pr-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-orange-400"
                    />
                  </div>
                  <div className="space-y-2 mb-4 max-h-52 overflow-y-auto">
                    {filteredFoods.map((food) => (
                      <button
                        key={food.name}
                        onClick={() => setSelectedFood(food)}
                        className={`w-full flex items-center justify-between p-3 rounded-xl text-left transition-all ${
                          selectedFood?.name === food.name ? 'bg-orange-50 border border-orange-300' : 'bg-gray-50 hover:bg-gray-100'
                        }`}
                      >
                        <div>
                          <p className="font-medium text-sm text-gray-800">{food.name}</p>
                          <p className="text-xs text-gray-400">B:{food.protein}g · W:{food.carbs}g · T:{food.fat}g</p>
                        </div>
                        <span className="text-orange-500 font-bold text-sm">{food.calories} kcal/{food.unit}</span>
                      </button>
                    ))}
                  </div>
                  {selectedFood && (
                    <div className="mb-4">
                      <label className="text-xs text-gray-500 font-medium mb-1 block">Ilość ({selectedFood.unit})</label>
                      <input
                        type="number"
                        value={amount}
                        onChange={(e) => setAmount(Number(e.target.value))}
                        className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-center text-lg font-bold outline-none focus:ring-2 focus:ring-orange-400"
                      />
                      <p className="text-center text-orange-500 font-bold mt-1">
                        = {Math.round(selectedFood.calories * amount / 100)} kcal
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
                </div>
              )}

              <button
                onClick={handleAddEntry}
                className="w-full bg-orange-500 text-white py-3.5 rounded-2xl font-semibold active:scale-95 transition-all"
              >
                + Dodaj do dziennika
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
