import { useState } from 'react';
import {
  ArrowLeft, Heart, BookmarkPlus, ExternalLink, Clock,
  Users, Flame, ChevronDown, ChevronUp, Check, Share2
} from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import toast from 'react-hot-toast';

export default function RecipeDetailView() {
  const { selectedRecipe, setActiveView, myRecipes, addMyRecipe, removeMyRecipe } = useAppStore();
  const [showFull, setShowFull] = useState(false);
  const [liked, setLiked] = useState(false);

  if (!selectedRecipe) {
    setActiveView('home');
    return null;
  }

  const isSaved = myRecipes.some((r) => r.id === selectedRecipe.id);
  const perServing = Math.round(selectedRecipe.totalCalories / selectedRecipe.servings);

  const toggleSave = () => {
    if (isSaved) {
      removeMyRecipe(selectedRecipe.id);
      toast.success('Usunięto z przepisów');
    } else {
      addMyRecipe({ ...selectedRecipe, dateAdded: new Date().toISOString() });
      toast.success('Zapisano przepis! 🎉');
    }
  };

  const instructions = selectedRecipe.instructions || '';
  const shortInstructions = instructions.slice(0, 300);

  return (
    <div className="pb-24 min-h-screen bg-gray-50">
      {/* Hero Image */}
      <div className="relative">
        <img
          src={selectedRecipe.photo || selectedRecipe.thumbnail}
          alt={selectedRecipe.name}
          className="w-full h-64 object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/20" />

        {/* Top controls */}
        <div className="absolute top-0 left-0 right-0 flex justify-between items-center px-4 pt-12">
          <button
            onClick={() => setActiveView('search')}
            className="bg-white/90 backdrop-blur rounded-full p-2.5 shadow"
          >
            <ArrowLeft size={20} className="text-gray-700" />
          </button>
          <div className="flex gap-2">
            <button
              onClick={() => { setLiked(!liked); if (!liked) toast('❤️ Lubisz to!'); }}
              className="bg-white/90 backdrop-blur rounded-full p-2.5 shadow"
            >
              <Heart
                size={20}
                className={liked ? 'text-red-500 fill-red-500' : 'text-gray-700'}
              />
            </button>
            <button
              onClick={() => {
                if (navigator.share) {
                  navigator.share({ title: selectedRecipe.name, text: `Sprawdź przepis: ${selectedRecipe.name}` });
                } else {
                  navigator.clipboard.writeText(window.location.href);
                  toast.success('Link skopiowany!');
                }
              }}
              className="bg-white/90 backdrop-blur rounded-full p-2.5 shadow"
            >
              <Share2 size={20} className="text-gray-700" />
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
            <div className="flex items-center justify-center gap-1 text-orange-500 mb-1">
              <Flame size={16} />
            </div>
            <p className="text-lg font-bold text-gray-800">{selectedRecipe.totalCalories}</p>
            <p className="text-xs text-gray-400">kcal total</p>
          </div>
          <div className="w-px bg-gray-100" />
          <div className="text-center">
            <div className="flex items-center justify-center gap-1 text-blue-500 mb-1">
              <Users size={16} />
            </div>
            <p className="text-lg font-bold text-gray-800">{selectedRecipe.servings}</p>
            <p className="text-xs text-gray-400">porcje</p>
          </div>
          <div className="w-px bg-gray-100" />
          <div className="text-center">
            <div className="flex items-center justify-center gap-1 text-green-500 mb-1">
              <Clock size={16} />
            </div>
            <p className="text-lg font-bold text-gray-800">{perServing}</p>
            <p className="text-xs text-gray-400">kcal/porcja</p>
          </div>
        </div>

        {/* Save button */}
        <button
          onClick={toggleSave}
          className={`w-full py-3.5 rounded-2xl font-semibold flex items-center justify-center gap-2 transition-all active:scale-95 mb-4 ${
            isSaved
              ? 'bg-green-100 text-green-700 border border-green-300'
              : 'bg-orange-500 text-white shadow-lg shadow-orange-200'
          }`}
        >
          {isSaved ? (
            <>
              <Check size={18} /> Zapisano w Moich Przepisach
            </>
          ) : (
            <>
              <BookmarkPlus size={18} /> Zapisz Przepis
            </>
          )}
        </button>

        {/* Ingredients */}
        <div className="bg-white rounded-2xl p-4 shadow-sm mb-4">
          <h2 className="font-bold text-gray-800 text-base mb-3 flex items-center gap-2">
            🥦 Składniki
          </h2>
          <div className="space-y-2">
            {selectedRecipe.ingredients.map((ing, i) => (
              <div key={i} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-orange-400" />
                  <span className="text-gray-700 text-sm font-medium">{ing.name}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-gray-400 text-sm">{ing.amount}</span>
                  <span className="text-orange-500 text-xs font-semibold bg-orange-50 px-2 py-0.5 rounded-full">
                    ~{ing.calories} kcal
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Instructions */}
        <div className="bg-white rounded-2xl p-4 shadow-sm mb-4">
          <h2 className="font-bold text-gray-800 text-base mb-3 flex items-center gap-2">
            📋 Instrukcja
          </h2>
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
