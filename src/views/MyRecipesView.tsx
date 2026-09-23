import { useState } from 'react';
import { Plus, Trash2, BookOpen, Flame, Search, Heart } from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import { POLISH_RECIPES } from '../data/polishRecipes';
import { onImgError } from '../lib/images';
import toast from 'react-hot-toast';

export default function MyRecipesView() {
  const {
    myRecipes, removeMyRecipe, setActiveView, setSelectedRecipe,
    favoriteIds, toggleFavorite,
  } = useAppStore();

  const [search, setSearch] = useState('');
  const [tab, setTab] = useState<'saved' | 'favorites'>('saved');

  // Saved recipes (My Recipes)
  const filteredSaved = myRecipes.filter((r) =>
    r.name.toLowerCase().includes(search.toLowerCase())
  );

  // Favorites — from both POLISH_RECIPES and myRecipes
  const allRecipes = [
    ...POLISH_RECIPES.map(r => ({
      id: r.id, name: r.name, category: r.category,
      thumbnail: r.thumbnail, totalCalories: r.totalCalories,
      servings: r.servings, isCustom: false as const,
      instructions: r.instructions, ingredients: r.ingredients,
      area: 'Polska', photo: undefined, tags: r.time,
    })),
    ...myRecipes,
  ];
  const favorites = allRecipes.filter(r =>
    favoriteIds.includes(r.id) &&
    r.name.toLowerCase().includes(search.toLowerCase())
  );

  const handleOpen = (id: string) => {
    // Check myRecipes first, then POLISH_RECIPES
    const myR = myRecipes.find(r => r.id === id);
    if (myR) { setSelectedRecipe(myR); setActiveView('recipe-detail'); return; }
    const pr = POLISH_RECIPES.find(r => r.id === id);
    if (pr) {
      setSelectedRecipe({
        id: pr.id, name: pr.name, category: pr.category,
        area: 'Polska', instructions: pr.instructions,
        thumbnail: pr.thumbnail, ingredients: pr.ingredients,
        totalCalories: pr.totalCalories, servings: pr.servings,
        tags: pr.time,
      });
      setActiveView('recipe-detail');
    }
  };

  const handleRemove = (id: string, name: string) => {
    removeMyRecipe(id);
    toast.success(`Usunięto "${name}"`);
  };

  const list = tab === 'saved' ? filteredSaved : favorites;

  return (
    <div className="pb-20 min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white px-4 pt-12 pb-4 shadow-sm sticky top-0 z-40">
        <div className="flex items-center justify-between mb-3">
          <h1 className="text-xl font-bold text-gray-800 flex items-center gap-2">
            <BookOpen size={20} className="text-orange-500" />
            Przepisy
          </h1>
          <button
            onClick={() => { setSelectedRecipe(null); setActiveView('add-recipe'); }}
            className="bg-orange-500 text-white rounded-full p-2 shadow-lg shadow-orange-200 hover:bg-orange-600 active:scale-95 transition-all"
          >
            <Plus size={20} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-3">
          <button
            onClick={() => setTab('saved')}
            className={`flex-1 py-2 rounded-xl text-sm font-semibold transition-all ${tab === 'saved' ? 'bg-orange-500 text-white' : 'bg-gray-100 text-gray-500'}`}
          >
            📖 Moje ({myRecipes.length})
          </button>
          <button
            onClick={() => setTab('favorites')}
            className={`flex-1 py-2 rounded-xl text-sm font-semibold transition-all flex items-center justify-center gap-1.5 ${tab === 'favorites' ? 'bg-red-500 text-white' : 'bg-gray-100 text-gray-500'}`}
          >
            <Heart size={14} className={tab === 'favorites' ? 'fill-white' : ''} />
            Ulubione ({favoriteIds.length})
          </button>
        </div>

        <div className="relative">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={tab === 'saved' ? 'Szukaj w moich przepisach...' : 'Szukaj w ulubionych...'}
            className="w-full bg-gray-100 rounded-2xl pl-10 pr-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-orange-400 transition-all"
          />
          <Search size={16} className="absolute left-3 top-3 text-gray-400" />
        </div>
      </div>

      <div className="px-4 mt-4">
        {list.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <p className="text-6xl mb-4">{tab === 'saved' ? '📖' : '❤️'}</p>
            <p className="text-gray-500 font-medium text-lg">
              {tab === 'saved' ? 'Brak przepisów' : 'Brak ulubionych'}
            </p>
            <p className="text-gray-400 text-sm mt-1 mb-6">
              {tab === 'saved'
                ? 'Dodaj własne lub zapisz z wyszukiwarki'
                : 'Kliknij ❤️ na przepisie żeby dodać do ulubionych'}
            </p>
            {tab === 'saved' && (
              <button
                onClick={() => { setSelectedRecipe(null); setActiveView('add-recipe'); }}
                className="bg-orange-500 text-white px-6 py-3 rounded-2xl font-semibold flex items-center gap-2 active:scale-95 transition-all"
              >
                <Plus size={18} /> Dodaj pierwszy przepis
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-gray-500 mb-2">{list.length} przepis{list.length !== 1 ? 'ów' : ''}</p>
            {list.map((recipe) => (
              <div
                key={recipe.id}
                className="bg-white rounded-2xl shadow-sm overflow-hidden flex hover:shadow-md transition-all"
              >
                <button
                  onClick={() => handleOpen(recipe.id)}
                  className="flex-1 flex items-center gap-3 p-3 text-left"
                >
                  <img
                    src={recipe.photo || recipe.thumbnail}
                    alt={recipe.name}
                    className="w-20 h-20 rounded-xl object-cover flex-shrink-0"
                    onError={onImgError}
                  />
                  <div className="min-w-0">
                    <p className="font-semibold text-gray-800 text-sm leading-tight line-clamp-2">
                      {recipe.name}
                    </p>
                    <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                      {recipe.isCustom && (
                        <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">Własny</span>
                      )}
                      {recipe.category && (
                        <span className="text-xs bg-orange-50 text-orange-600 px-2 py-0.5 rounded-full">{recipe.category}</span>
                      )}
                      {favoriteIds.includes(recipe.id) && (
                        <span className="text-xs text-red-400">❤️</span>
                      )}
                    </div>
                    <div className="flex items-center gap-1 mt-1.5 text-orange-500">
                      <Flame size={12} />
                      <span className="text-xs font-semibold">{recipe.totalCalories} kcal</span>
                      <span className="text-xs text-gray-400">· {recipe.servings} porcji</span>
                    </div>
                  </div>
                </button>

                {/* Right side actions */}
                <div className="flex flex-col border-l border-gray-100">
                  <button
                    onClick={() => toggleFavorite(recipe.id)}
                    className="flex-1 px-3 flex items-center justify-center hover:bg-red-50 transition-colors"
                  >
                    <Heart
                      size={16}
                      className={favoriteIds.includes(recipe.id) ? 'text-red-500 fill-red-500' : 'text-gray-300'}
                    />
                  </button>
                  {tab === 'saved' && (
                    <button
                      onClick={() => handleRemove(recipe.id, recipe.name)}
                      className="flex-1 px-3 flex items-center justify-center text-red-300 hover:bg-red-50 hover:text-red-500 transition-colors border-t border-gray-100"
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
