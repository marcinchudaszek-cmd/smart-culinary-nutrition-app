import { useState } from 'react';
import { Plus, Trash2, BookOpen, Flame, Search } from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import toast from 'react-hot-toast';

export default function MyRecipesView() {
  const { myRecipes, removeMyRecipe, setActiveView, setSelectedRecipe } = useAppStore();
  const [search, setSearch] = useState('');

  const filtered = myRecipes.filter((r) =>
    r.name.toLowerCase().includes(search.toLowerCase())
  );

  const handleOpen = (id: string) => {
    const recipe = myRecipes.find((r) => r.id === id);
    if (recipe) {
      setSelectedRecipe(recipe);
      setActiveView('recipe-detail');
    }
  };

  const handleRemove = (id: string, name: string) => {
    removeMyRecipe(id);
    toast.success(`Usunięto "${name}"`);
  };

  return (
    <div className="pb-20 min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white px-4 pt-12 pb-4 shadow-sm sticky top-0 z-40">
        <div className="flex items-center justify-between mb-3">
          <h1 className="text-xl font-bold text-gray-800 flex items-center gap-2">
            <BookOpen size={20} className="text-orange-500" />
            Moje Przepisy
          </h1>
          <button
            onClick={() => setActiveView('add-recipe')}
            className="bg-orange-500 text-white rounded-full p-2 shadow-lg shadow-orange-200 hover:bg-orange-600 active:scale-95 transition-all"
          >
            <Plus size={20} />
          </button>
        </div>
        <div className="relative">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Szukaj w moich przepisach..."
            className="w-full bg-gray-100 rounded-2xl pl-10 pr-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-orange-400 transition-all"
          />
          <Search size={16} className="absolute left-3 top-3 text-gray-400" />
        </div>
      </div>

      <div className="px-4 mt-4">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <p className="text-6xl mb-4">📖</p>
            <p className="text-gray-500 font-medium text-lg">Brak przepisów</p>
            <p className="text-gray-400 text-sm mt-1 mb-6">
              Dodaj własne lub zapisz z wyszukiwarki
            </p>
            <button
              onClick={() => setActiveView('add-recipe')}
              className="bg-orange-500 text-white px-6 py-3 rounded-2xl font-semibold flex items-center gap-2 active:scale-95 transition-all"
            >
              <Plus size={18} /> Dodaj pierwszy przepis
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-gray-500 mb-2">{filtered.length} przepis{filtered.length !== 1 ? 'ów' : ''}</p>
            {filtered.map((recipe) => (
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
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = 'https://via.placeholder.com/80?text=🍳';
                    }}
                  />
                  <div className="min-w-0">
                    <p className="font-semibold text-gray-800 text-sm leading-tight line-clamp-2">
                      {recipe.name}
                    </p>
                    <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                      {recipe.isCustom && (
                        <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">
                          Własny
                        </span>
                      )}
                      {recipe.category && (
                        <span className="text-xs bg-orange-50 text-orange-600 px-2 py-0.5 rounded-full">
                          {recipe.category}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1 mt-1.5 text-orange-500">
                      <Flame size={12} />
                      <span className="text-xs font-semibold">
                        {recipe.totalCalories} kcal
                      </span>
                      <span className="text-xs text-gray-400">
                        · {recipe.servings} porcji
                      </span>
                    </div>
                  </div>
                </button>
                <button
                  onClick={() => handleRemove(recipe.id, recipe.name)}
                  className="px-4 text-red-400 hover:bg-red-50 transition-colors flex items-center border-l border-gray-100"
                >
                  <Trash2 size={18} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
