import { useState, useCallback } from 'react';
import { Search, X, ChefHat, Globe, Loader } from 'lucide-react';
import { useAppStore } from '../store/useAppStore';

interface MealResult {
  idMeal: string;
  strMeal: string;
  strMealThumb: string;
  strCategory: string;
  strArea: string;
}

const CATEGORIES = [
  'Beef', 'Chicken', 'Dessert', 'Lamb', 'Miscellaneous',
  'Pasta', 'Pork', 'Seafood', 'Side', 'Starter', 'Vegan', 'Vegetarian',
];

export default function SearchView() {
  const { setActiveView, setSelectedRecipe } = useAppStore();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<MealResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeCategory, setActiveCategory] = useState('');
  const [searched, setSearched] = useState(false);

  const searchMeals = useCallback(async (q: string) => {
    if (!q.trim()) return;
    setLoading(true);
    setSearched(true);
    try {
      const res = await fetch(
        `https://www.themealdb.com/api/json/v1/1/search.php?s=${encodeURIComponent(q)}`
      );
      const data = await res.json();
      setResults(data.meals || []);
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const filterByCategory = useCallback(async (cat: string) => {
    setActiveCategory(cat);
    setQuery('');
    setLoading(true);
    setSearched(true);
    try {
      const res = await fetch(
        `https://www.themealdb.com/api/json/v1/1/filter.php?c=${cat}`
      );
      const data = await res.json();
      setResults(data.meals || []);
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const openRecipe = async (idMeal: string) => {
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

  return (
    <div className="pb-20 min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white px-4 pt-12 pb-4 shadow-sm sticky top-0 z-40">
        <h1 className="text-xl font-bold text-gray-800 mb-3 flex items-center gap-2">
          <Globe size={20} className="text-orange-500" />
          Przepisy z Internetu
        </h1>
        <div className="relative">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && searchMeals(query)}
            placeholder="Szukaj przepisu (np. pasta, chicken...)"
            className="w-full bg-gray-100 rounded-2xl pl-10 pr-10 py-3 text-sm outline-none focus:ring-2 focus:ring-orange-400 transition-all"
          />
          <Search size={18} className="absolute left-3 top-3.5 text-gray-400" />
          {query && (
            <button
              onClick={() => { setQuery(''); setResults([]); setSearched(false); }}
              className="absolute right-3 top-3.5 text-gray-400"
            >
              <X size={18} />
            </button>
          )}
        </div>
        <button
          onClick={() => searchMeals(query)}
          disabled={!query.trim() || loading}
          className="mt-2 w-full bg-orange-500 text-white rounded-2xl py-2.5 font-semibold text-sm disabled:opacity-50 hover:bg-orange-600 active:scale-95 transition-all"
        >
          {loading ? 'Szukam...' : 'Szukaj'}
        </button>
      </div>

      <div className="px-4 mt-4">
        {/* Categories */}
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
          Kategorie
        </p>
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide mb-4">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => filterByCategory(cat)}
              className={`flex-shrink-0 px-4 py-1.5 rounded-full text-xs font-medium transition-all ${
                activeCategory === cat
                  ? 'bg-orange-500 text-white shadow'
                  : 'bg-white text-gray-600 border border-gray-200 hover:border-orange-300'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Loading */}
        {loading && (
          <div className="flex flex-col items-center justify-center py-16">
            <Loader size={32} className="text-orange-500 animate-spin mb-3" />
            <p className="text-gray-500 text-sm">Ładowanie przepisów...</p>
          </div>
        )}

        {/* Empty state */}
        {!loading && !searched && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <ChefHat size={56} className="text-orange-200 mb-4" />
            <p className="text-gray-500 font-medium">Wpisz nazwę potrawy lub wybierz kategorię</p>
            <p className="text-gray-400 text-sm mt-1">Znajdziemy przepisy z całego świata!</p>
          </div>
        )}

        {!loading && searched && results.length === 0 && (
          <div className="text-center py-16">
            <p className="text-gray-400 text-4xl mb-3">🔍</p>
            <p className="text-gray-500 font-medium">Brak wyników</p>
            <p className="text-gray-400 text-sm">Spróbuj innej nazwy</p>
          </div>
        )}

        {/* Results */}
        {!loading && results.length > 0 && (
          <div className="grid grid-cols-2 gap-3">
            {results.map((meal) => (
              <button
                key={meal.idMeal}
                onClick={() => openRecipe(meal.idMeal)}
                className="bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-all active:scale-95 text-left"
              >
                <img
                  src={meal.strMealThumb}
                  alt={meal.strMeal}
                  className="w-full h-32 object-cover"
                  loading="lazy"
                />
                <div className="p-3">
                  <p className="font-semibold text-gray-800 text-sm line-clamp-2 leading-tight">
                    {meal.strMeal}
                  </p>
                  {meal.strCategory && (
                    <span className="text-xs text-orange-500 mt-1 inline-block bg-orange-50 px-2 py-0.5 rounded-full">
                      {meal.strCategory}
                    </span>
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
