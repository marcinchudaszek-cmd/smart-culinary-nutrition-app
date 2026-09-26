import { useMemo, useState } from 'react';
import { ChefHat, TrendingUp, BookOpen, Search, Flame, Star, Settings, Droplets, Scale, Bot, Utensils } from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import { POLISH_RECIPES } from '../data/polishRecipes';
import WeeklyRecommendations from '../components/WeeklyRecommendations';
import ChefAI from '../components/ChefAI';
import MealComposer from '../components/MealComposer';
import { calcStreak } from '../lib/streak';
import { onImgError } from '../lib/images';
import toast from 'react-hot-toast';
import { todayISO } from '../lib/date';

export default function HomeView() {
  const { setActiveView, setSelectedRecipe, myRecipes, foodDiary, dailyGoal,
          waterLog, waterGoal, addWaterEntry, clearWaterToday, weightLog,
          activityLog } = useAppStore();
  const [showChefAI, setShowChefAI] = useState(false);
  const [showComposer, setShowComposer] = useState(false);

  const today = todayISO();
  const todayEntries = foodDiary.filter((e) => e.date === today);
  const todayCalories = todayEntries.reduce((sum, e) => sum + e.calories, 0);
  const todayProtein = Math.round(todayEntries.reduce((sum, e) => sum + e.protein, 0));
  const todayCarbs   = Math.round(todayEntries.reduce((sum, e) => sum + e.carbs, 0));
  const todayFat     = Math.round(todayEntries.reduce((sum, e) => sum + e.fat, 0));
  const todayBurned = activityLog
    .filter((e) => e.date === today)
    .reduce((s, e) => s + e.caloriesBurned, 0);
  const netCalories = Math.max(0, todayCalories - todayBurned);
  const progress = Math.min((todayCalories / dailyGoal) * 100, 100);

  // Water tracking
  const todayWater = waterLog.filter(e => e.date === today).reduce((s, e) => s + e.amount, 0);
  const waterProgress = Math.min((todayWater / waterGoal) * 100, 100);

  function addWater(ml: number) {
    addWaterEntry({ date: today, amount: ml });
    toast.success(`+${ml} ml wody 💧`);
  }

  // Streak
  const streak = useMemo(() => calcStreak(foodDiary), [foodDiary]);

  // Latest weight
  const latestWeight = weightLog.length > 0
    ? [...weightLog].sort((a, b) => a.date.localeCompare(b.date)).at(-1)
    : null;

  const randomMeals = useMemo(() => {
    const shuffled = [...POLISH_RECIPES].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, 6);
  }, []);

  const greetingHour = new Date().getHours();
  const greeting =
    greetingHour < 12 ? 'Dzień dobry!' : greetingHour < 18 ? 'Cześć!' : 'Dobry wieczór!';

  const openRecipe = (id: string) => {
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

  return (
    <div className="pb-20 bg-gray-50 dark:bg-gray-900 min-h-dvh">
      {/* Header */}
      <div className="bg-gradient-to-br from-orange-500 to-red-500 text-white px-5 pt-12 pb-8 rounded-b-3xl shadow-lg">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="bg-white/20 rounded-2xl p-2.5">
              <ChefHat size={28} />
            </div>
            <div>
              <p className="text-orange-100 text-sm">{greeting}</p>
              <h1 className="text-2xl font-bold">KulinApp 🍳</h1>
            </div>
          </div>
          <button
            onClick={() => setActiveView('settings')}
            className="bg-white/20 rounded-2xl p-2.5 hover:bg-white/30 transition-colors"
          >
            <Settings size={22} />
          </button>
        </div>

        {/* Streak chip */}
        {streak > 0 && (
          <div className="flex items-center gap-1.5 mb-3">
            <span className="bg-white/20 text-white text-xs font-semibold px-3 py-1 rounded-full flex items-center gap-1.5">
              🔥 Seria: {streak} {streak === 1 ? 'dzień' : streak < 5 ? 'dni' : 'dni'} z rzędu
            </span>
            {streak >= 7 && (
              <span className="bg-yellow-400/80 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">🏆 Niesamowite!</span>
            )}
          </div>
        )}

        {/* Calorie bar */}
        <div className="bg-white/20 rounded-2xl p-4">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-medium flex items-center gap-1">
              <Flame size={14} /> Kalorie dziś
            </span>
            <span className="text-sm font-bold">{todayCalories} / {dailyGoal} kcal</span>
          </div>
          <div className="h-2.5 bg-white/30 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                progress > 90 ? 'bg-red-300' : 'bg-white'
              }`}
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="text-xs text-orange-100 mt-1">
            {progress >= 100
              ? '🎯 Osiągnięto cel!'
              : `Pozostało ${Math.max(0, dailyGoal - todayCalories)} kcal`}
          </p>
          {todayBurned > 0 && (
            <div className="flex items-center justify-between mt-1.5 bg-white/10 rounded-xl px-3 py-1.5">
              <span className="text-xs text-orange-100 flex items-center gap-1">🏃 Spalone: <strong>{todayBurned} kcal</strong></span>
              <span className="text-xs text-orange-100">Netto: <strong>{netCalories} kcal</strong></span>
            </div>
          )}

          {/* Macro bars */}
          <div className="grid grid-cols-3 gap-2 mt-3">
            {[
              { label: 'Białko', val: todayProtein, goal: 60,  color: 'bg-blue-300' },
              { label: 'Węgle',  val: todayCarbs,   goal: 250, color: 'bg-yellow-300' },
              { label: 'Tłuszcz', val: todayFat,    goal: 65,  color: 'bg-red-300' },
            ].map(({ label, val, goal, color }) => (
              <div key={label}>
                <div className="flex justify-between text-xs text-orange-100 mb-1">
                  <span>{label}</span>
                  <span className="font-semibold">{val}g</span>
                </div>
                <div className="h-1.5 bg-white/20 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full ${color}`}
                    style={{ width: `${Math.min((val / goal) * 100, 100)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Water tracker */}
      <div className="mx-4 mt-4 bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-sm">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Droplets size={18} className="text-blue-500" />
            <span className="font-semibold text-gray-800 dark:text-gray-100 text-sm">Nawodnienie</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-sm font-bold text-blue-600">{todayWater}</span>
            <span className="text-xs text-gray-400">/ {waterGoal} ml</span>
            {todayWater > 0 && (
              <button onClick={() => clearWaterToday(today)} className="ml-2 text-gray-200 hover:text-red-400 transition-colors">
                <span className="text-[10px]">✕</span>
              </button>
            )}
          </div>
        </div>
        <div className="h-2 bg-blue-50 rounded-full overflow-hidden mb-3">
          <div
            className={`h-full rounded-full transition-all duration-500 ${waterProgress >= 100 ? 'bg-blue-500' : 'bg-blue-400'}`}
            style={{ width: `${waterProgress}%` }}
          />
        </div>
        <div className="flex gap-2">
          {[200, 300, 500, 750].map(ml => (
            <button
              key={ml}
              onClick={() => addWater(ml)}
              className="flex-1 bg-blue-50 text-blue-600 rounded-xl py-2 text-xs font-semibold hover:bg-blue-100 active:scale-95 transition-all"
            >
              +{ml >= 1000 ? `${ml / 1000}L` : `${ml}`}
            </button>
          ))}
        </div>
        {waterProgress >= 100 && (
          <p className="text-center text-xs text-blue-500 font-medium mt-2">🎉 Cel nawodnienia osiągnięty!</p>
        )}
      </div>

      <div className="px-4 mt-5">
        {/* Quick actions */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          <button
            onClick={() => setActiveView('search')}
            className="bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-sm flex items-center gap-3 hover:shadow-md transition-all active:scale-95"
          >
            <div className="bg-blue-100 rounded-xl p-2.5">
              <Search size={20} className="text-blue-600" />
            </div>
            <div className="text-left">
              <p className="font-semibold text-gray-800 text-sm">Szukaj</p>
              <p className="text-gray-400 text-xs">{POLISH_RECIPES.length} przepisów</p>
            </div>
          </button>
          <button
            onClick={() => setActiveView('my-recipes')}
            className="bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-sm flex items-center gap-3 hover:shadow-md transition-all active:scale-95"
          >
            <div className="bg-green-100 rounded-xl p-2.5">
              <BookOpen size={20} className="text-green-600" />
            </div>
            <div className="text-left">
              <p className="font-semibold text-gray-800 text-sm">Moje</p>
              <p className="text-gray-400 text-xs">{myRecipes.length} przepisów</p>
            </div>
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-2 mb-6">
          <div className="bg-orange-50 rounded-2xl p-3 text-center">
            <p className="text-xl font-bold text-orange-500">{myRecipes.length}</p>
            <p className="text-[10px] text-gray-500">Przepisy</p>
          </div>
          <div className="bg-red-50 rounded-2xl p-3 text-center">
            <p className="text-xl font-bold text-red-500">{todayCalories}</p>
            <p className="text-[10px] text-gray-500">Kcal dziś</p>
          </div>
          <div className="bg-blue-50 rounded-2xl p-3 text-center">
            <p className="text-xl font-bold text-blue-500">{Math.round(todayWater / 100) / 10}</p>
            <p className="text-[10px] text-gray-500">Woda (L)</p>
          </div>
          <button
            onClick={() => setActiveView('progress')}
            className="bg-purple-50 rounded-2xl p-3 text-center hover:bg-purple-100 active:scale-95 transition-all"
          >
            <p className="text-xl font-bold text-purple-500 flex items-center justify-center gap-0.5">
              {latestWeight ? `${latestWeight.weight}` : <Scale size={18} />}
            </p>
            <p className="text-[10px] text-gray-500">Waga (kg)</p>
          </button>
        </div>

        {/* NutriBot + Recommendations */}
        <div className="mb-5 space-y-3">
          <button
            onClick={() => setActiveView('diet-chat')}
            className="w-full bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-2xl p-4 flex items-center gap-3 shadow-sm active:scale-95 transition-all"
          >
            <div className="bg-white/20 rounded-xl p-2">
              <Bot size={20} />
            </div>
            <div className="text-left">
              <p className="font-bold text-sm">NutriBot — Asystent diety</p>
              <p className="text-xs text-green-100">Zapytaj o kalorie, dietę, przepisy…</p>
            </div>
          </button>
          <button
            onClick={() => setShowChefAI(true)}
            className="w-full bg-gradient-to-r from-orange-400 to-amber-500 text-white rounded-2xl p-4 flex items-center gap-3 shadow-sm active:scale-95 transition-all"
          >
            <div className="bg-white/20 rounded-xl p-2">
              <ChefHat size={20} />
            </div>
            <div className="text-left">
              <p className="font-bold text-sm">Co ugotować?</p>
              <p className="text-xs text-orange-100">Zrób zdjęcie lodówki lub wpisz składniki — AI zaproponuje dania</p>
            </div>
          </button>
          <button
            onClick={() => setShowComposer(true)}
            className="w-full bg-gradient-to-r from-rose-400 to-pink-500 text-white rounded-2xl p-4 flex items-center gap-3 shadow-sm active:scale-95 transition-all"
          >
            <div className="bg-white/20 rounded-xl p-2">
              <Utensils size={20} />
            </div>
            <div className="text-left">
              <p className="font-bold text-sm">Skomponuj posiłek</p>
              <p className="text-xs text-rose-100">Wpisz składniki dania — policzymy kalorie i dodasz do dziennika</p>
            </div>
          </button>
          <WeeklyRecommendations />
        </div>

        {/* Trending recipes */}
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-bold text-gray-800 dark:text-gray-100 flex items-center gap-2">
            <TrendingUp size={18} className="text-orange-500" />
            Odkryj przepisy
          </h2>
          <button
            onClick={() => setActiveView('search')}
            className="text-orange-500 text-sm font-medium"
          >
            Zobacz więcej
          </button>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {randomMeals.map((meal) => (
            <button
              key={meal.id}
              onClick={() => openRecipe(meal.id)}
              className="bg-white dark:bg-gray-800 rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-all active:scale-95 text-left"
            >
              <div className="relative">
                <img
                  src={meal.thumbnail}
                  alt={meal.name}
                  className="w-full h-32 object-cover"
                  loading="lazy"
                  onError={onImgError}
                />
                <div className="absolute top-2 right-2 bg-white/90 rounded-full p-1">
                  <Star size={12} className="text-orange-400 fill-orange-400" />
                </div>
              </div>
              <div className="p-3">
                <p className="font-semibold text-gray-800 dark:text-gray-100 text-sm line-clamp-2 leading-tight">{meal.name}</p>
                <span className="text-xs text-orange-500 mt-1 inline-block">{meal.category}</span>
              </div>
            </button>
          ))}
        </div>
      </div>

      {showChefAI && <ChefAI onClose={() => setShowChefAI(false)} />}
      {showComposer && <MealComposer onClose={() => setShowComposer(false)} />}
    </div>
  );
}
