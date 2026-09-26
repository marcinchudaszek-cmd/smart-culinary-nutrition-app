import { useState, useRef } from 'react';
import { ArrowLeft, Plus, Trash2, Camera, Image } from 'lucide-react';
import { useAppStore, Ingredient } from '../store/useAppStore';
import toast from 'react-hot-toast';

export default function AddRecipeView() {
  const { setActiveView, addMyRecipe, updateMyRecipe, selectedRecipe } = useAppStore();
  const fileRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);

  const isEditing = !!selectedRecipe;

  const [form, setForm] = useState({
    name: selectedRecipe?.name ?? '',
    category: selectedRecipe?.category ?? '',
    area: selectedRecipe?.area ?? '',
    servings: selectedRecipe?.servings ?? 4,
    instructions: selectedRecipe?.instructions ?? '',
    photo: selectedRecipe?.photo ?? selectedRecipe?.thumbnail ?? '',
  });

  const [ingredients, setIngredients] = useState<Ingredient[]>(
    selectedRecipe && selectedRecipe.ingredients.length > 0
      ? selectedRecipe.ingredients.map((i) => ({ ...i }))
      : [{ name: '', amount: '', calories: 0 }]
  );

  const handleIngredientChange = (i: number, field: keyof Ingredient, value: string | number) => {
    setIngredients((prev) => {
      const copy = [...prev];
      copy[i] = { ...copy[i], [field]: value };
      return copy;
    });
  };

  const addIngredient = () =>
    setIngredients((prev) => [...prev, { name: '', amount: '', calories: 0 }]);

  const removeIngredient = (i: number) =>
    setIngredients((prev) => prev.filter((_, idx) => idx !== i));

  const totalCalories = ingredients.reduce((s, i) => s + Number(i.calories || 0), 0);

  const handlePhoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setForm((prev) => ({ ...prev, photo: reader.result as string }));
    reader.readAsDataURL(file);
  };

  const handleSubmit = () => {
    if (!form.name.trim()) {
      toast.error('Podaj nazwę przepisu');
      return;
    }
    if (ingredients.every((i) => !i.name.trim())) {
      toast.error('Dodaj przynajmniej jeden składnik');
      return;
    }

    const filtered = ingredients.filter((i) => i.name.trim());

    if (isEditing && selectedRecipe) {
      updateMyRecipe({
        ...selectedRecipe,
        id: selectedRecipe.isCustom ? selectedRecipe.id : `custom-${Date.now()}`,
        name: form.name.trim(),
        category: form.category.trim() || 'Własny',
        area: form.area.trim() || 'Polska',
        instructions: form.instructions.trim(),
        thumbnail: form.photo || selectedRecipe.thumbnail,
        photo: form.photo || undefined,
        ingredients: filtered,
        totalCalories,
        servings: Number(form.servings) || 4,
        isCustom: true,
        dateAdded: selectedRecipe.dateAdded ?? new Date().toISOString(),
      });
      toast.success('Przepis zaktualizowany! 🎉');
      setActiveView('recipe-detail');
      return;
    }

    addMyRecipe({
      id: `custom-${Date.now()}`,
      name: form.name.trim(),
      category: form.category.trim() || 'Własny',
      area: form.area.trim() || 'Polska',
      instructions: form.instructions.trim(),
      thumbnail: form.photo || 'https://www.themealdb.com/images/media/meals/llcbn01574260722.jpg',
      photo: form.photo || undefined,
      ingredients: filtered,
      totalCalories,
      servings: Number(form.servings) || 4,
      isCustom: true,
      dateAdded: new Date().toISOString(),
    });

    toast.success('Przepis dodany! 🎉');
    setActiveView('my-recipes');
  };

  return (
    <div className="pb-24 min-h-dvh bg-gray-50">
      {/* Header */}
      <div className="bg-white px-4 pt-12 pb-4 shadow-sm sticky top-0 z-40">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setActiveView(isEditing ? 'recipe-detail' : 'my-recipes')}
            className="bg-gray-100 rounded-full p-2"
          >
            <ArrowLeft size={20} className="text-gray-700" />
          </button>
          <h1 className="text-xl font-bold text-gray-800">{isEditing ? 'Edytuj Przepis' : 'Dodaj Przepis'}</h1>
        </div>
      </div>

      <div className="px-4 mt-4 space-y-4">
        {/* Photo upload */}
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <h2 className="font-semibold text-gray-700 mb-3">📷 Zdjęcie</h2>
          {form.photo ? (
            <div className="relative">
              <img
                src={form.photo}
                alt="Podgląd"
                className="w-full h-48 object-cover rounded-xl"
              />
              <button
                onClick={() => setForm((prev) => ({ ...prev, photo: '' }))}
                className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1.5"
              >
                <Trash2 size={14} />
              </button>
            </div>
          ) : (
            <div className="flex gap-3">
              <button
                onClick={() => cameraRef.current?.click()}
                className="flex-1 border-2 border-dashed border-gray-200 rounded-xl py-6 flex flex-col items-center gap-2 text-gray-400 hover:border-orange-300 hover:text-orange-400 transition-all"
              >
                <Camera size={24} />
                <span className="text-xs font-medium">Aparat</span>
              </button>
              <button
                onClick={() => fileRef.current?.click()}
                className="flex-1 border-2 border-dashed border-gray-200 rounded-xl py-6 flex flex-col items-center gap-2 text-gray-400 hover:border-orange-300 hover:text-orange-400 transition-all"
              >
                <Image size={24} />
                <span className="text-xs font-medium">Galeria</span>
              </button>
            </div>
          )}
          <input
            ref={cameraRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={handlePhoto}
          />
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handlePhoto}
          />
        </div>

        {/* Basic info */}
        <div className="bg-white rounded-2xl p-4 shadow-sm space-y-3">
          <h2 className="font-semibold text-gray-700">📝 Informacje</h2>
          <div>
            <label className="text-xs text-gray-500 font-medium mb-1 block">
              Nazwa przepisu *
            </label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
              placeholder="np. Rosół babci"
              className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-orange-400"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-gray-500 font-medium mb-1 block">
                Kategoria
              </label>
              <input
                type="text"
                value={form.category}
                onChange={(e) => setForm((p) => ({ ...p, category: e.target.value }))}
                placeholder="np. Zupy"
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-orange-400"
              />
            </div>
            <div>
              <label className="text-xs text-gray-500 font-medium mb-1 block">
                Kuchnia
              </label>
              <input
                type="text"
                value={form.area}
                onChange={(e) => setForm((p) => ({ ...p, area: e.target.value }))}
                placeholder="np. Polska"
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-orange-400"
              />
            </div>
          </div>
          <div>
            <label className="text-xs text-gray-500 font-medium mb-1 block">
              Liczba porcji
            </label>
            <input
              type="number"
              min="1"
              max="20"
              value={form.servings}
              onChange={(e) => setForm((p) => ({ ...p, servings: Number(e.target.value) }))}
              className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-orange-400"
            />
          </div>
        </div>

        {/* Ingredients */}
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-gray-700">🥕 Składniki</h2>
            <span className="text-sm text-orange-500 font-bold">
              ~{totalCalories} kcal
            </span>
          </div>

          <div className="space-y-2">
            {ingredients.map((ing, i) => (
              <div key={i} className="flex gap-2 items-start">
                <div className="flex-1 grid grid-cols-3 gap-1.5">
                  <input
                    type="text"
                    value={ing.name}
                    onChange={(e) => handleIngredientChange(i, 'name', e.target.value)}
                    placeholder="Składnik"
                    className="col-span-1 bg-gray-50 border border-gray-200 rounded-xl px-2 py-2 text-xs outline-none focus:ring-2 focus:ring-orange-400"
                  />
                  <input
                    type="text"
                    value={ing.amount}
                    onChange={(e) => handleIngredientChange(i, 'amount', e.target.value)}
                    placeholder="Ilość"
                    className="bg-gray-50 border border-gray-200 rounded-xl px-2 py-2 text-xs outline-none focus:ring-2 focus:ring-orange-400"
                  />
                  <div className="relative">
                    <input
                      type="number"
                      value={ing.calories || ''}
                      onChange={(e) => handleIngredientChange(i, 'calories', Number(e.target.value))}
                      placeholder="kcal"
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl px-2 py-2 text-xs outline-none focus:ring-2 focus:ring-orange-400"
                    />
                  </div>
                </div>
                {ingredients.length > 1 && (
                  <button
                    onClick={() => removeIngredient(i)}
                    className="text-red-400 p-2 hover:bg-red-50 rounded-xl mt-0.5"
                  >
                    <Trash2 size={16} />
                  </button>
                )}
              </div>
            ))}
          </div>

          <p className="text-xs text-gray-400 mb-2 mt-1">Nazwa | Ilość | Kalorie (kcal)</p>

          <button
            onClick={addIngredient}
            className="mt-2 w-full border-2 border-dashed border-gray-200 rounded-xl py-2.5 flex items-center justify-center gap-2 text-gray-400 hover:border-orange-300 hover:text-orange-400 text-sm transition-all"
          >
            <Plus size={16} /> Dodaj składnik
          </button>
        </div>

        {/* Instructions */}
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <h2 className="font-semibold text-gray-700 mb-3">📋 Instrukcja</h2>
          <textarea
            value={form.instructions}
            onChange={(e) => setForm((p) => ({ ...p, instructions: e.target.value }))}
            placeholder="Opisz krok po kroku jak przygotować danie..."
            rows={6}
            className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-orange-400 resize-none"
          />
        </div>

        {/* Submit */}
        <button
          onClick={handleSubmit}
          className="w-full bg-orange-500 text-white py-4 rounded-2xl font-bold text-base shadow-lg shadow-orange-200 active:scale-95 transition-all hover:bg-orange-600"
        >
          {isEditing ? '💾 Zapisz zmiany' : '💾 Zapisz Przepis'}
        </button>
      </div>
    </div>
  );
}
