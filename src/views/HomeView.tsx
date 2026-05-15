import { useEffect, useState } from 'react';
import { ChefHat, TrendingUp, BookOpen, Search, Flame, Star, Settings } from 'lucide-react';
import { useAppStore } from '../store/useAppStore';

interface MealCard {
  idMeal: string;
  strMeal: string;
  strMealThumb: string;
  strCategory?: string;
  strArea?: string;
}

export default function HomeView() {
  const { setActiveView, setSelectedRecipe, myRecipes, foodDiary, dailyGoal } = useAppStore();
  const [randomMeals, setRandomMeals] = useState<MealCard[]>([]);
  const [loading, setLoading] = useState(true);

  const today = new Date().toISOString().split('T')[0];
  const todayCalories = foodDiary
    .filter((e) => e.date === today)
    .reduce((sum, e) => sum + e.calories, 0);
  const progress = Math.min((todayCalories / dailyGoal) * 100, 100);

  useEffect(() => {
    const fetchRandom = async () => {
      try {
        const promises = Array.from({ length: 6 }, () =>
          fetch('https://www.themealdb.com/api/json/v1/1/random.php').then((r) => r.json())
        );
        const results = await Promise.all(promises);
        const meals = results.map((r) => r.meals[0]).filter(Boolean);
        setRandomMeals(meals);
      } catch {
        setRandomMeals([]);
      } finally {
        setLoading(false);
      }
    };
    fetchRandom();
  }, []);

  const handleMealClick = async (idMeal: string) => {
    try {
      const res = await fetch(
        `https://www.themealdb.com/api/json/v1/1/lookup.php?i=${idMeal}`
      );
      const data = await res.json();
      const meal = data.meals[0];
      if (!meal) return;

      const ingredients = Array.from({ length: 20 }, (_, i) => {
        const name = meal[`strIngredient${i + 1}`];
        const measure = meal[`strMeasure${i + 1}`];
        if (name && name.trim()) {
          return { name: name.trim(), amount: measure?.trim() || '', calories: Math.floor(Math.random() * 150 + 20) };
        }
        return null;
      }).filter(Boolean) as { name: string; amount: string; calories: number }[];

      const totalCalories = ingredients.reduce((s, i) => s + i.calories, 0);

      setSelectedRecipe({
        id: meal.idMeal,
        name: meal.strMeal,
        category: meal.strCategory || '',
        area: meal.strArea || '',
        instructions: meal.strInstructions,
        thumbnail: meal.strMealThumb,
        ingredients,
        totalCalories,
        servings: 4,
        tags: meal.strTags || '',
        youtubeUrl: meal.strYoutube || '',
      });
      setActiveView('recipe-detail');
    } catch {
      console.error('Failed to load meal');
    }
  };

  const greetingHour = new Date().getHours();
  const greeting =
    greetingHour < 12 ? 'Dzień dobry!' : greetingHour < 18 ? 'Cześć!' : 'Dobry wieczór!';

  return (
    <div className="pb-20 bg-gray-50 min-h-screen">
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
              : `Pozostało ${dailyGoal - todayCalories} kcal`}
          </p>
        </div>
      </div>

      <div className="px-4 mt-5">
        {/* Quick actions */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          <button
            onClick={() => setActiveView('search')}
            className="bg-white rounded-2xl p-4 shadow-sm flex items-center gap-3 hover:shadow-md transition-all active:scale-95"
          >
            <div className="bg-blue-100 rounded-xl p-2.5">
              <Search size={20} className="text-blue-600" />
            </div>
            <div className="text-left">
              <p className="font-semibold text-gray-800 text-sm">Szukaj</p>
              <p className="text-gray-400 text-xs">Przepisy online</p>
            </div>
          </button>
          <button
            onClick={() => setActiveView('my-recipes')}
            className="bg-white rounded-2xl p-4 shadow-sm flex items-center gap-3 hover:shadow-md transition-all active:scale-95"
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
        <div className="grid grid-cols-3 gap-3 mb-6">
          <div className="bg-orange-50 rounded-2xl p-3 text-center">
            <p className="text-2xl font-bold text-orange-500">{myRecipes.length}</p>
            <p className="text-xs text-gray-500">Przepisy</p>
          </div>
          <div className="bg-red-50 rounded-2xl p-3 text-center">
            <p className="text-2xl font-bold text-red-500">{todayCalories}</p>
            <p className="text-xs text-gray-500">Kcal dziś</p>
          </div>
          <div className="bg-purple-50 rounded-2xl p-3 text-center">
            <p className="text-2xl font-bold text-purple-500">{foodDiary.filter(e => e.date === today).length}</p>
            <p className="text-xs text-gray-500">Posiłki</p>
          </div>
        </div>

        {/* Trending recipes */}
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
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

        {loading ? (
          <div className="grid grid-cols-2 gap-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="bg-white rounded-2xl overflow-hidden shadow-sm animate-pulse">
                <div className="h-32 bg-gray-200" />
                <div className="p-3">
                  <div className="h-4 bg-gray-200 rounded mb-1" />
                  <div className="h-3 bg-gray-100 rounded w-2/3" />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {randomMeals.map((meal) => (
              <button
                key={meal.idMeal}
                onClick={() => handleMealClick(meal.idMeal)}
                className="bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-all active:scale-95 text-left"
              >
                <div className="relative">
                  <img
                    src={meal.strMealThumb}
                    alt={meal.strMeal}
                    className="w-full h-32 object-cover"
                    loading="lazy"
                  />
                  <div className="absolute top-2 right-2 bg-white/90 rounded-full p-1">
                    <Star size={12} className="text-orange-400 fill-orange-400" />
                  </div>
                </div>
                <div className="p-3">
                  <p className="font-semibold text-gray-800 text-sm line-clamp-2 leading-tight">{meal.strMeal}</p>
                  {meal.strCategory && (
                    <span className="text-xs text-orange-500 mt-1 inline-block">{meal.strCategory}</span>
                  )}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
